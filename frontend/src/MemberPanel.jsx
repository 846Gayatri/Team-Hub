import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API, C, MEMBER_ACCENT, initials, isOverdue, Avatar, Btn, StatCard, TaskCard, TaskModal } from "./shared";

export default function MemberPanel() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [data, setData] = useState({ projects: [], tasks: [] });
  const [view, setView] = useState("dashboard");
  const [selProject, setSelProject] = useState(null);
  const [modal, setModal] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const accent = MEMBER_ACCENT;

  const fetch = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([axios.get(`${API}/projects`), axios.get(`${API}/tasks`)]);
      setData({ projects: p.data, tasks: t.data });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const logout = () => { localStorage.clear(); window.location.href = "/"; };

  const updateTask = async (fd) => {
    try {
      if (editTask) await axios.put(`${API}/tasks/${editTask.id}`, fd);
      fetch(); setModal(null); setEditTask(null);
    } catch (e) { alert(e.response?.data?.error || "Error"); }
  };

  const updateStatus = async (id, status) => {
    try { await axios.patch(`${API}/tasks/${id}/status`, { status }); fetch(); } catch (e) { console.error(e); }
  };

  const all = data.tasks;
  const my = all.filter(t => t.assigneeId === user?.id);
  const myOverdue = my.filter(isOverdue);
  const myDone = my.filter(t => t.status === "DONE");
  const myInProgress = my.filter(t => t.status === "IN_PROGRESS");
  const projTasks = selProject ? all.filter(t => t.projectId === selProject.id) : [];
  const filtered = filter === "all" ? projTasks : projTasks.filter(t => (isOverdue(t) ? "overdue" : t.status) === filter);

  const nav = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "my-tasks", icon: "◎", label: "My Tasks" },
    { id: "projects", icon: "◉", label: "Projects" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      {/* Sidebar */}
      <div style={{ width: 230, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, background: accent, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>TeamHub</span>
          </div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20, marginLeft: 44 }}>Member Panel</div>
          {nav.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setSelProject(null); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: view === n.id ? accent + "22" : "transparent", color: view === n.id ? accent : C.textMuted,
              fontSize: 14, fontWeight: view === n.id ? 600 : 400, marginBottom: 2, textAlign: "left",
            }}><span>{n.icon}</span> {n.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, padding: "0 20px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Projects</div>
          {data.projects.map(p => (
            <button key={p.id} onClick={() => { setSelProject(p); setView("project-detail"); }} style={{
              display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: selProject?.id === p.id ? accent + "22" : "transparent", color: selProject?.id === p.id ? accent : C.textMuted,
              fontSize: 13, fontWeight: selProject?.id === p.id ? 600 : 400, marginBottom: 2, textAlign: "left",
            }}>◦ {p.name}</button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar text={initials(user?.name)} size={32} color={accent} />
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div><div style={{ fontSize: 11, color: accent, textTransform: "uppercase" }}>MEMBER</div></div>
          </div>
          <Btn variant="secondary" small accent={accent} style={{ width: "100%" }} onClick={logout}>Sign out</Btn>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {view === "dashboard" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Welcome, {user?.name?.split(" ")[0]} 👋</h2>
            <p style={{ margin: "0 0 28px", color: C.textMuted }}>Here's a summary of your assigned work.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="My Tasks" value={my.length} color={accent} icon="📋" />
              <StatCard label="Completed" value={myDone.length} color={C.success} icon="✅" />
              <StatCard label="In Progress" value={myInProgress.length} color={C.info} icon="🔄" />
              <StatCard label="Overdue" value={myOverdue.length} color={C.danger} icon="⚠️" />
            </div>
            {myOverdue.length > 0 && <><h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.danger }}>⚠️ Overdue Tasks</h3>
              {myOverdue.map(t => <TaskCard key={t.id} task={t} users={[]} onEdit={t => { setEditTask(t); setModal("task"); }} accent={accent} />)}</>}
            <h3 style={{ margin: "24px 0 16px", fontSize: 16, fontWeight: 700 }}>Tasks To Do</h3>
            {my.filter(t => t.status === "TODO").length === 0 ? <p style={{ color: C.textMuted }}>All caught up! 🎉</p> :
              my.filter(t => t.status === "TODO").map(t => (
                <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.title}</div>{t.description && <div style={{ color: C.textMuted, fontSize: 13 }}>{t.description}</div>}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small accent={C.info} onClick={() => updateStatus(t.id, "IN_PROGRESS")}>▶ Start</Btn>
                    <Btn small accent={C.success} onClick={() => updateStatus(t.id, "DONE")}>✓ Done</Btn>
                  </div>
                </div>
              ))}
          </div>
        )}

        {view === "my-tasks" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>My Tasks</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["all", "TODO", "IN_PROGRESS", "DONE"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filter === f ? accent : C.border}`, background: filter === f ? accent + "22" : "transparent", color: filter === f ? accent : C.textMuted, cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 600 : 400 }}>
                  {f === "all" ? "All" : f.replace("_", " ")} <span style={{ marginLeft: 4, opacity: 0.7 }}>{f === "all" ? my.length : my.filter(t => t.status === f).length}</span>
                </button>
              ))}
            </div>
            {(filter === "all" ? my : my.filter(t => t.status === filter)).length === 0
              ? <p style={{ color: C.textMuted }}>No tasks found.</p>
              : (filter === "all" ? my : my.filter(t => t.status === filter)).map(t => (
                <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                  <TaskCard task={t} users={[]} onEdit={t => { setEditTask(t); setModal("task"); }} accent={accent} />
                </div>
              ))}
          </div>
        )}

        {view === "projects" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Projects</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {data.projects.map(p => {
                const pt = all.filter(t => t.projectId === p.id), d = pt.filter(t => t.status === "DONE").length;
                const pct = pt.length ? Math.round((d / pt.length) * 100) : 0;
                return (
                  <div key={p.id} onClick={() => { setSelProject(p); setView("project-detail"); }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                    <p style={{ color: C.textMuted, fontSize: 13, margin: "0 0 14px" }}>{p.description}</p>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 4 }}><span>Progress</span><span>{pct}%</span></div>
                      <div style={{ background: C.border, borderRadius: 4, height: 5 }}><div style={{ background: accent, height: 5, borderRadius: 4, width: pct + "%" }} /></div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{pt.length} tasks</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "project-detail" && selProject && (
          <div className="fade-in">
            <button onClick={() => { setView("projects"); setSelProject(null); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>← Back</button>
            <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>{selProject.name}</h2>
            <p style={{ margin: "0 0 20px", color: C.textMuted, fontSize: 14 }}>{selProject.description}</p>
            {projTasks.length === 0 ? <p style={{ color: C.textMuted }}>No tasks in this project.</p> :
              projTasks.map(t => <TaskCard key={t.id} task={t} users={[]} onEdit={t.assigneeId === user?.id ? (t => { setEditTask(t); setModal("task"); }) : undefined} accent={accent} />)}
          </div>
        )}
      </div>

      {modal === "task" && <TaskModal task={editTask} projects={data.projects} users={[]} currentUser={user} selectedProject={selProject} onSave={updateTask} onClose={() => { setModal(null); setEditTask(null); }} accent={accent} />}
    </div>
  );
}
