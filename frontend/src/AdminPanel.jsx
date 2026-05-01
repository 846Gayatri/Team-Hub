import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API, C, ADMIN_ACCENT, initials, isOverdue, Avatar, Btn, Input, Select, Textarea, Modal, StatCard, TaskCard, TaskModal } from "./shared";

export default function AdminPanel() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [data, setData] = useState({ users: [], projects: [], tasks: [] });
  const [view, setView] = useState("dashboard");
  const [selProject, setSelProject] = useState(null);
  const [modal, setModal] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editProj, setEditProj] = useState(null);
  const [filter, setFilter] = useState("all");
  const accent = ADMIN_ACCENT;

  const fetch = useCallback(async () => {
    try {
      const [p, t, u] = await Promise.all([
        axios.get(`${API}/projects`), axios.get(`${API}/tasks`), axios.get(`${API}/users`)
      ]);
      setData({ projects: p.data, tasks: t.data, users: u.data });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const logout = () => { localStorage.clear(); window.location.href = "/"; };

  const saveTask = async (fd) => {
    try {
      if (editTask) await axios.put(`${API}/tasks/${editTask.id}`, fd);
      else await axios.post(`${API}/tasks`, fd);
      fetch(); setModal(null); setEditTask(null);
    } catch (e) { alert(e.response?.data?.error || "Error"); }
  };
  const deleteTask = async (id) => { if (confirm("Delete task?")) { await axios.delete(`${API}/tasks/${id}`); fetch(); } };
  const saveProject = async (fd) => {
    try {
      if (editProj) await axios.put(`${API}/projects/${editProj.id}`, fd);
      else await axios.post(`${API}/projects`, fd);
      fetch(); setModal(null); setEditProj(null);
    } catch (e) { alert(e.response?.data?.error || "Error"); }
  };
  const deleteProject = async (id) => {
    if (confirm("Delete project and all tasks?")) {
      await axios.delete(`${API}/projects/${id}`); fetch();
      if (selProject?.id === id) { setSelProject(null); setView("projects"); }
    }
  };

  const all = data.tasks, my = all.filter(t => t.assigneeId === user?.id);
  const overdue = all.filter(isOverdue), done = all.filter(t => t.status === "DONE");
  const projTasks = selProject ? all.filter(t => t.projectId === selProject.id) : [];
  const filtered = filter === "all" ? projTasks : projTasks.filter(t => (isOverdue(t) ? "overdue" : t.status) === filter);

  const nav = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "projects", icon: "◉", label: "Projects" },
    { id: "my-tasks", icon: "◎", label: "My Tasks" },
    { id: "team", icon: "◌", label: "Team" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      {/* Sidebar */}
      <div style={{ width: 230, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, background: accent, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>TeamHub</span>
          </div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20, marginLeft: 44 }}>Admin Panel</div>
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
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div><div style={{ fontSize: 11, color: accent, textTransform: "uppercase" }}>ADMIN</div></div>
          </div>
          <Btn variant="secondary" small accent={accent} style={{ width: "100%" }} onClick={logout}>Sign out</Btn>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {view === "dashboard" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Admin Dashboard 👋</h2>
            <p style={{ margin: "0 0 28px", color: C.textMuted }}>Full overview of all projects and team activity.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Tasks" value={all.length} color={accent} icon="📋" />
              <StatCard label="Completed" value={done.length} color={C.success} icon="✅" />
              <StatCard label="In Progress" value={all.filter(t => t.status === "IN_PROGRESS").length} color={C.info} icon="🔄" />
              <StatCard label="Overdue" value={overdue.length} color={C.danger} icon="⚠️" />
            </div>
            {overdue.length > 0 && <><h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.danger }}>Overdue Tasks</h3>
              {overdue.map(t => <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditTask(t); setModal("task"); }} onDelete={deleteTask} canDelete accent={accent} />)}</>}
            <h3 style={{ margin: "24px 0 16px", fontSize: 16, fontWeight: 700 }}>My Tasks</h3>
            {my.length === 0 ? <p style={{ color: C.textMuted }}>No tasks assigned to you.</p> :
              my.map(t => <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditTask(t); setModal("task"); }} onDelete={deleteTask} canDelete accent={accent} />)}
          </div>
        )}

        {view === "projects" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Projects</h2>
              <Btn accent={accent} onClick={() => { setEditProj(null); setModal("project"); }}>+ New Project</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {data.projects.map(p => {
                const pt = all.filter(t => t.projectId === p.id), d = pt.filter(t => t.status === "DONE").length;
                const pct = pt.length ? Math.round((d / pt.length) * 100) : 0;
                return (
                  <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                    onClick={() => { setSelProject(p); setView("project-detail"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                      <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                        <Btn variant="ghost" small accent={accent} onClick={() => { setEditProj(p); setModal("project"); }}>✎</Btn>
                        <Btn variant="danger" small onClick={() => deleteProject(p.id)}>×</Btn>
                      </div>
                    </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div><h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>{selProject.name}</h2><p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{selProject.description}</p></div>
              <Btn accent={accent} onClick={() => { setEditTask(null); setModal("task"); }}>+ Add Task</Btn>
            </div>
            <div style={{ display: "flex", gap: 8, margin: "20px 0", flexWrap: "wrap" }}>
              {["all", "TODO", "IN_PROGRESS", "DONE", "overdue"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filter === f ? accent : C.border}`, background: filter === f ? accent + "22" : "transparent", color: filter === f ? accent : C.textMuted, cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 600 : 400 }}>
                  {f === "all" ? "All" : f.replace("_", " ")} <span style={{ marginLeft: 4, opacity: 0.7 }}>{f === "all" ? projTasks.length : projTasks.filter(t => (isOverdue(t) ? "overdue" : t.status) === f).length}</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 ? <p style={{ color: C.textMuted }}>No tasks.</p> :
              filtered.map(t => <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditTask(t); setModal("task"); }} onDelete={deleteTask} canDelete accent={accent} />)}
          </div>
        )}

        {view === "my-tasks" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>My Tasks</h2>
            {my.length === 0 ? <p style={{ color: C.textMuted }}>No tasks assigned.</p> :
              my.map(t => <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditTask(t); setModal("task"); }} onDelete={deleteTask} canDelete accent={accent} />)}
          </div>
        )}

        {view === "team" && (
          <div className="fade-in">
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Team Members</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {data.users.map(u => {
                const ut = all.filter(t => t.assigneeId === u.id), ud = ut.filter(t => t.status === "DONE").length;
                return (
                  <div key={u.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <Avatar text={initials(u.name)} size={44} color={u.role === "ADMIN" ? accent : C.info} />
                      <div><div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div><div style={{ fontSize: 12, color: u.role === "ADMIN" ? accent : C.info, textTransform: "uppercase" }}>{u.role}</div></div>
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>{u.email}</div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800 }}>{ut.length}</div><div style={{ fontSize: 11, color: C.textMuted }}>Assigned</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: C.success }}>{ud}</div><div style={{ fontSize: 11, color: C.textMuted }}>Done</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modal === "task" && <TaskModal task={editTask} projects={data.projects} users={data.users} currentUser={user} selectedProject={selProject} onSave={saveTask} onClose={() => { setModal(null); setEditTask(null); }} accent={accent} />}
      {modal === "project" && (
        <Modal title={editProj ? "Edit Project" : "New Project"} onClose={() => { setModal(null); setEditProj(null); }}>
          <ProjectForm project={editProj} onSave={saveProject} onClose={() => { setModal(null); setEditProj(null); }} accent={accent} />
        </Modal>
      )}
    </div>
  );
}

function ProjectForm({ project, onSave, onClose, accent }) {
  const [form, setForm] = useState({ name: project?.name || "", description: project?.description || "" });
  return (<>
    <Input label="Project Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
    <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      <Btn accent={accent} onClick={() => { if (form.name.trim()) onSave(form); }}>{ project ? "Save" : "Create" }</Btn>
    </div>
  </>);
}
