import re
import os

proto_path = r'c:\Users\gayat\Downloads\team-task-manager.jsx'
out_path = r'C:\Users\gayat\.gemini\antigravity\scratch\team-task-manager\frontend\src\App.jsx'

with open(proto_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace React imports to include axios
code = code.replace('import { useState, useEffect, useCallback } from "react";', 'import { useState, useEffect, useCallback } from "react";\nimport axios from "axios";')

# Change status configs to match DB enums
code = code.replace('"todo"', '"TODO"').replace('"in_progress"', '"IN_PROGRESS"').replace('"done"', '"DONE"')
code = code.replace('"todo":', '"TODO":').replace('"in_progress":', '"IN_PROGRESS":').replace('"done":', '"DONE":')

# Overdue function to handle DB date string
code = code.replace('task.status !== "DONE"', 'task.status !== "DONE"')

# We will completely replace the App component and LoginPage
# Let's extract the components before LoginPage
app_idx = code.find('function LoginPage')
prefix_code = code[:app_idx]

# We will remove initData from prefix_code
prefix_code = re.sub(r'const initData = \{[\s\S]*?\};\n', '', prefix_code)

# Add our custom App, LoginPage and Modals
custom_code = """
const API = 'http://localhost:3000/api/v1';

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: 'alice@teamhub.io', password: 'admin123', name: '', role: 'MEMBER' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const res = await axios.post(`${API}${endpoint}`, formData);
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, background: COLORS.accent, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16 }}>⚡</div>
          <h1 style={{ color: COLORS.text, margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>TeamHub</h1>
          <p style={{ color: COLORS.textMuted, margin: "8px 0 0", fontSize: 14 }}>Task management for modern teams</p>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <Input label="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" required />
            )}
            <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="your@email.com" required />
            <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" required />
            {!isLogin && (
              <Select label="Role" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </Select>
            )}
            {error && <p style={{ color: COLORS.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <Btn type="submit" style={{ width: "100%" }}>{isLogin ? 'Sign In' : 'Sign Up'}</Btn>
          </form>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: COLORS.accent, cursor: 'pointer', fontSize: 13 }}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (stored && token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return JSON.parse(stored);
      }
    } catch(e) {}
    return null;
  });
  
  const [data, setData] = useState({ users: [], projects: [], tasks: [] });
  const [view, setView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null);
  const [modal, setModal] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [taskFilter, setTaskFilter] = useState("all");

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/tasks`),
        currentUser.role === 'ADMIN' ? axios.get(`${API}/users`) : Promise.resolve({data: []})
      ]);
      setData({ projects: projRes.data, tasks: tasksRes.data, users: usersRes.data });
    } catch(err) { console.error(err); }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogin = (user) => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const myTasks = data.tasks.filter(t => t.assigneeId === currentUser?.id);
  const allTasks = data.tasks;
  const overdueTasks = allTasks.filter(t => isOverdue(t));
  const doneTasks = allTasks.filter(t => t.status === "DONE");

  const projectTasks = selectedProject
    ? allTasks.filter(t => t.projectId === selectedProject.id)
    : [];

  const filteredProjectTasks = taskFilter === "all"
    ? projectTasks
    : projectTasks.filter(t => getTaskStatus(t) === taskFilter);

  async function saveTask(formData) {
    try {
      if (editingTask) {
        await axios.put(`${API}/tasks/${editingTask.id}`, formData);
      } else {
        await axios.post(`${API}/tasks`, formData);
      }
      fetchData();
      setModal(null); setEditingTask(null);
    } catch (err) { alert(err.response?.data?.error || "Error saving task"); }
  }

  async function deleteTask(id) {
    if (confirm("Delete this task?")) {
      await axios.delete(`${API}/tasks/${id}`);
      fetchData();
    }
  }

  async function saveProject(formData) {
    try {
      if (editingProject) {
        await axios.put(`${API}/projects/${editingProject.id}`, formData);
      } else {
        await axios.post(`${API}/projects`, formData);
      }
      fetchData();
      setModal(null); setEditingProject(null);
    } catch (err) { alert(err.response?.data?.error || "Error saving project"); }
  }

  async function deleteProject(id) {
    if (confirm("Delete project and all its tasks?")) {
      await axios.delete(`${API}/projects/${id}`);
      fetchData();
      if (selectedProject?.id === id) { setSelectedProject(null); setView("projects"); }
    }
  }

  if (!currentUser) return <LoginPage onLogin={handleLogin} />;

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "projects", icon: "◉", label: "Projects" },
    { id: "my-tasks", icon: "◎", label: "My Tasks" },
    ...(currentUser.role === "ADMIN" ? [{ id: "team", icon: "◌", label: "Team" }] : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text }}>
      <div style={{
        width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 34, height: 34, background: COLORS.accent, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>TeamHub</span>
          </div>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setSelectedProject(null); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: view === item.id ? COLORS.accent + "22" : "transparent",
              color: view === item.id ? COLORS.accent : COLORS.textMuted,
              fontSize: 14, fontWeight: view === item.id ? 600 : 400,
              marginBottom: 2, textAlign: "left",
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "0 20px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 8 }}>Projects</div>
          {data.projects.map(p => (
            <button key={p.id} onClick={() => { setSelectedProject(p); setView("project-detail"); }} style={{
              display: "block", width: "100%", padding: "8px 12px",
              borderRadius: 8, border: "none", cursor: "pointer",
              background: selectedProject?.id === p.id ? COLORS.accent + "22" : "transparent",
              color: selectedProject?.id === p.id ? COLORS.accent : COLORS.textMuted,
              fontSize: 13, fontWeight: selectedProject?.id === p.id ? 600 : 400,
              marginBottom: 2, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>◦ {p.name}</button>
          ))}
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar initials={currentUser.name ? currentUser.name.substring(0,2).toUpperCase() : 'U'} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{currentUser.name?.split(" ")[0]}</div>
              <div style={{ fontSize: 11, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{currentUser.role}</div>
            </div>
          </div>
          <Btn variant="secondary" small style={{ width: "100%" }} onClick={logout}>Sign out</Btn>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {view === "dashboard" && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Good day, {currentUser.name?.split(" ")[0]} 👋</h2>
            <p style={{ margin: "0 0 28px", color: COLORS.textMuted }}>Here's what's happening across your team.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Tasks" value={allTasks.length} color={COLORS.accent} icon="📋" />
              <StatCard label="Completed" value={doneTasks.length} color={COLORS.success} icon="✅" />
              <StatCard label="In Progress" value={allTasks.filter(t => t.status === "IN_PROGRESS").length} color={COLORS.info} icon="🔄" />
              <StatCard label="Overdue" value={overdueTasks.length} color={COLORS.danger} icon="⚠️" />
            </div>

            {overdueTasks.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: COLORS.danger }}>Overdue Tasks</h3>
                {overdueTasks.map(t => (
                  <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditingTask(t); setModal("task"); }} onDelete={deleteTask} currentUser={currentUser} />
                ))}
              </div>
            )}

            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>My Tasks</h3>
            {myTasks.length === 0 ? <p style={{ color: COLORS.textMuted }}>No tasks assigned to you.</p> :
              myTasks.map(t => <TaskCard key={t.id} task={t} users={data.users} onEdit={t => { setEditingTask(t); setModal("task"); }} onDelete={deleteTask} currentUser={currentUser} />)}
          </div>
        )}

        {view === "projects" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Projects</h2>
              {currentUser.role === "ADMIN" && (
                <Btn onClick={() => { setEditingProject(null); setModal("project"); }}>+ New Project</Btn>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {data.projects.map(p => {
                const pTasks = allTasks.filter(t => t.projectId === p.id);
                const done = pTasks.filter(t => t.status === "DONE").length;
                const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
                return (
                  <div key={p.id} style={{
                    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
                    onClick={() => { setSelectedProject(p); setView("project-detail"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                      {currentUser.role === "ADMIN" && (
                        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                          <Btn variant="ghost" small onClick={() => { setEditingProject(p); setModal("project"); }}>✎</Btn>
                          <Btn variant="danger" small onClick={() => deleteProject(p.id)}>×</Btn>
                        </div>
                      )}
                    </div>
                    <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>{p.description}</p>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>
                        <span>Progress</span><span>{pct}%</span>
                      </div>
                      <div style={{ background: COLORS.border, borderRadius: 4, height: 5 }}>
                        <div style={{ background: COLORS.accent, height: 5, borderRadius: 4, width: pct + "%" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.textMuted }}>
                      <span>{pTasks.length} tasks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "project-detail" && selectedProject && (
          <div>
            <button onClick={() => { setView("projects"); setSelectedProject(null); }} style={{
              background: "none", border: "none", color: COLORS.textMuted,
              cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0,
            }}>← Back to Projects</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>{selectedProject.name}</h2>
                <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 14 }}>{selectedProject.description}</p>
              </div>
              <Btn onClick={() => { setEditingTask(null); setModal("task"); }}>+ Add Task</Btn>
            </div>

            <div style={{ display: "flex", gap: 8, margin: "20px 0", flexWrap: "wrap" }}>
              {["all", "TODO", "IN_PROGRESS", "DONE", "overdue"].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)} style={{
                  padding: "5px 14px", borderRadius: 20, border: `1px solid ${taskFilter === f ? COLORS.accent : COLORS.border}`,
                  background: taskFilter === f ? COLORS.accent + "22" : "transparent",
                  color: taskFilter === f ? COLORS.accent : COLORS.textMuted,
                  cursor: "pointer", fontSize: 13, fontWeight: taskFilter === f ? 600 : 400,
                }}>
                  {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    {f === "all" ? projectTasks.length : projectTasks.filter(t => getTaskStatus(t) === f).length}
                  </span>
                </button>
              ))}
            </div>

            {filteredProjectTasks.length === 0
              ? <p style={{ color: COLORS.textMuted }}>No tasks here.</p>
              : filteredProjectTasks.map(t => (
                <TaskCard key={t.id} task={t} users={data.users}
                  onEdit={t => { setEditingTask(t); setModal("task"); }}
                  onDelete={deleteTask} currentUser={currentUser} />
              ))}
          </div>
        )}

        {view === "my-tasks" && (
          <div>
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>My Tasks</h2>
            {myTasks.length === 0 ? <p style={{ color: COLORS.textMuted }}>No tasks assigned to you.</p> :
              myTasks.map(t => <TaskCard key={t.id} task={t} users={data.users}
                onEdit={t => { setEditingTask(t); setModal("task"); }}
                onDelete={deleteTask} currentUser={currentUser} />)}
          </div>
        )}

        {view === "team" && currentUser.role === "ADMIN" && (
          <div>
            <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Team Members</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {data.users.map(u => {
                const tasks = allTasks.filter(t => t.assigneeId === u.id);
                const done = tasks.filter(t => t.status === "DONE").length;
                return (
                  <div key={u.id} style={{
                    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 14, padding: 20,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <Avatar initials={u.name ? u.name.substring(0,2).toUpperCase() : 'U'} size={44} color={u.role === "ADMIN" ? COLORS.accent : COLORS.info} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: u.role === "ADMIN" ? COLORS.accent : COLORS.info, textTransform: "uppercase", letterSpacing: 0.5 }}>{u.role}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>{u.email}</div>
                    <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{tasks.length}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>Assigned</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.success }}>{done}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>Done</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modal === "task" && (
        <TaskModal
          task={editingTask}
          projects={data.projects}
          users={data.users}
          currentUser={currentUser}
          selectedProject={selectedProject}
          onSave={saveTask}
          onClose={() => { setModal(null); setEditingTask(null); }}
        />
      )}

      {modal === "project" && (
        <ProjectModal
          project={editingProject}
          users={data.users}
          onSave={saveProject}
          onClose={() => { setModal(null); setEditingProject(null); }}
        />
      )}
    </div>
  );
}

function TaskModal({ task, projects, users, currentUser, selectedProject, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    projectId: task?.projectId || selectedProject?.id || (projects.length ? projects[0].id : ""),
    assigneeId: task?.assigneeId || currentUser.id,
    status: task?.status || "TODO",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <Modal title={task ? "Edit Task" : "New Task"} onClose={onClose}>
      <Input label="Title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title..." />
      <Textarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description..." />
      <Select label="Project" value={form.projectId} onChange={e => set("projectId", e.target.value)}>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
      <Select label="Assignee" value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}>
        <option value="">Unassigned</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </Select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </Select>
        <Select label="Priority" value={form.priority} onChange={e => set("priority", e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </div>
      <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (form.title.trim()) onSave(form); }}>
          {task ? "Save Changes" : "Create Task"}
        </Btn>
      </div>
    </Modal>
  );
}

function ProjectModal({ project, users, onSave, onClose }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <Modal title={project ? "Edit Project" : "New Project"} onClose={onClose}>
      <Input label="Project Name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Project name..." />
      <Textarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} placeholder="What's this project about?" />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (form.name.trim()) onSave(form); }}>{project ? "Save Changes" : "Create Project"}</Btn>
      </div>
    </Modal>
  );
}
"""

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(prefix_code + custom_code)

print("Done generating App.jsx!")
