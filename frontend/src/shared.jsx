import { useState } from "react";
import axios from "axios";

export const API = 'http://localhost:3000/api/v1';

export const C = {
  bg: "#0f0f1a", surface: "#16213e", surfaceHover: "#1a2a4a",
  border: "#2a3a5a", text: "#e2e8f0", textMuted: "#94a3b8",
  accent: "#e94560", success: "#10b981", warning: "#f59e0b",
  danger: "#ef4444", info: "#3b82f6",
};

export const ADMIN_ACCENT = "#e94560";
export const MEMBER_ACCENT = "#3b82f6";

export const STATUS = {
  TODO: { label: "To Do", color: C.textMuted, bg: "rgba(148,163,184,0.15)" },
  IN_PROGRESS: { label: "In Progress", color: C.info, bg: "rgba(59,130,246,0.15)" },
  DONE: { label: "Done", color: C.success, bg: "rgba(16,185,129,0.15)" },
  overdue: { label: "Overdue", color: C.danger, bg: "rgba(239,68,68,0.15)" },
};

export function isOverdue(t) { return t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date(); }
export function getStatus(t) { return isOverdue(t) ? "overdue" : t.status; }
export function initials(name) { return name ? name.substring(0,2).toUpperCase() : "U"; }
export function fmtDate(d) { return d ? new Date(d).toISOString().slice(0,10) : ""; }

export function Avatar({ text, size = 32, color = C.accent }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "33", border: `1.5px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 600, color, flexShrink: 0,
    }}>{text}</div>
  );
}

export function Badge({ status }) {
  const s = STATUS[status] || STATUS.TODO;
  return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{s.label}</span>;
}

export function PriorityDot({ priority }) {
  const colors = { low: C.success, medium: C.warning, high: C.danger };
  const col = colors[priority] || C.warning;
  return <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: col }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: col, display: "inline-block" }} />{priority}</span>;
}

export function Btn({ children, variant = "primary", small, accent = C.accent, ...props }) {
  const styles = {
    primary: { background: accent, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
    danger: { background: C.danger + "22", color: C.danger, border: `1px solid ${C.danger}44` },
    ghost: { background: "transparent", color: accent, border: "none" },
  };
  return (
    <button style={{ ...styles[variant], borderRadius: 8, padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 12 : 14, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }}
      onMouseEnter={e => e.target.style.opacity = 0.85} onMouseLeave={e => e.target.style.opacity = 1} {...props}>{children}</button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <input style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} {...props} />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <select style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} {...props}>{children}</select>
    </div>
  );
}

export function Textarea({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <textarea style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "inherit" }} {...props} />
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "90%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, color = C.accent, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function TaskCard({ task, users, onEdit, onDelete, canDelete, accent = C.accent }) {
  const assignee = users.find(u => u.id === task.assigneeId);
  const status = getStatus(task);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10, transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accent + "66"} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}><Badge status={status} /><PriorityDot priority={task.priority} /></div>
          <div style={{ fontWeight: 600, color: C.text, fontSize: 15, marginBottom: 4 }}>{task.title}</div>
          {task.description && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>{task.description}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {assignee && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar text={initials(assignee.name)} size={22} color={C.info} /><span style={{ fontSize: 12, color: C.textMuted }}>{assignee.name}</span></div>}
            <span style={{ fontSize: 12, color: isOverdue(task) ? C.danger : C.textMuted }}>📅 {fmtDate(task.dueDate)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {onEdit && <Btn variant="secondary" small accent={accent} onClick={() => onEdit(task)}>Edit</Btn>}
          {canDelete && onDelete && <Btn variant="danger" small onClick={() => onDelete(task.id)}>Del</Btn>}
        </div>
      </div>
    </div>
  );
}

export function TaskModal({ task, projects, users, currentUser, selectedProject, onSave, onClose, accent = C.accent }) {
  const [form, setForm] = useState({
    title: task?.title || "", description: task?.description || "",
    projectId: task?.projectId || selectedProject?.id || (projects.length ? projects[0].id : ""),
    assigneeId: task?.assigneeId || currentUser.id, status: task?.status || "TODO",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate ? fmtDate(task.dueDate) : new Date().toISOString().slice(0, 10),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={task ? "Edit Task" : "New Task"} onClose={onClose}>
      <Input label="Title" value={form.title} onChange={e => set("title", e.target.value)} />
      <Textarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} />
      <Select label="Project" value={form.projectId} onChange={e => set("projectId", e.target.value)}>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
      {users.length > 0 && <Select label="Assignee" value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}>
        <option value="">Unassigned</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </Select>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
        </Select>
        <Select label="Priority" value={form.priority} onChange={e => set("priority", e.target.value)}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </Select>
      </div>
      <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn accent={accent} onClick={() => { if (form.title.trim()) onSave(form); }}>{task ? "Save Changes" : "Create Task"}</Btn>
      </div>
    </Modal>
  );
}
