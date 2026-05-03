import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  Circle,
  CircleDot,
  ClipboardList,
  Clock,
  Eye,
  FileCheck,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  LoaderCircle,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? "http://localhost:3000/api/v1" : "/api/v1");
const api = axios.create({ baseURL: API_URL });

const STATUS = {
  TODO: { label: "To do", tone: "neutral", Icon: Circle },
  IN_PROGRESS: { label: "In progress", tone: "info", Icon: LoaderCircle },
  DONE: { label: "Done", tone: "success", Icon: CheckCircle2 },
};

const PRIORITY = {
  LOW: { label: "Low", tone: "success" },
  MEDIUM: { label: "Medium", tone: "warning" },
  HIGH: { label: "High", tone: "danger" },
};

function readSession() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

function formatDate(value, smart = false) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (smart) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(value); d.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < -1) return `${Math.abs(diff)}d overdue`;
    if (diff <= 7) return `In ${diff} days`;
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "DONE") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function projectMetrics(project, tasks) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const done = projectTasks.filter((task) => task.status === "DONE").length;
  return {
    total: projectTasks.length,
    done,
    overdue: projectTasks.filter(isOverdue).length,
    progress: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0,
  };
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function Button({ children, variant = "primary", size = "md", icon: Icon, className, ...props }) {
  return (
    <button className={classNames("button", `button-${variant}`, `button-${size}`, className)} {...props}>
      {Icon && <Icon size={size === "sm" ? 15 : 17} />}
      <span>{children}</span>
    </button>
  );
}

function IconButton({ label, icon: Icon, variant = "ghost", ...props }) {
  return (
    <button className={classNames("icon-button", `icon-button-${variant}`)} title={label} aria-label={label} {...props}>
      <Icon size={17} />
    </button>
  );
}

function Field({ label, error, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea {...props} />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>
        {children}
      </section>
    </div>
  );
}

function Avatar({ user, size = "md" }) {
  return (
    <span className={classNames("avatar", `avatar-${size}`)} title={user?.name || "Unassigned"}>
      {initials(user?.name)}
    </span>
  );
}

function AvatarGroup({ users = [] }) {
  if (!users.length) return <span className="muted">No members yet</span>;
  return (
    <div className="avatar-group">
      {users.slice(0, 4).map((user) => <Avatar key={user.id} user={user} size="sm" />)}
      {users.length > 4 && <span className="avatar avatar-more">+{users.length - 4}</span>}
    </div>
  );
}

function StatusBadge({ status, overdue }) {
  if (overdue) {
    return (
      <span className="badge badge-danger">
        <AlertTriangle size={13} />
        Overdue
      </span>
    );
  }

  const item = STATUS[status] || STATUS.TODO;
  const Icon = item.Icon;
  return (
    <span className={classNames("badge", `badge-${item.tone}`)}>
      <Icon size={13} />
      {item.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const item = PRIORITY[priority] || PRIORITY.MEDIUM;
  return <span className={classNames("priority", `priority-${item.tone}`)}>{item.label}</span>;
}

function ProgressBar({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone = "default" }) {
  return (
    <article className={classNames("stat-card", `stat-${tone}`)}>
      <span className="stat-icon"><Icon size={21} /></span>
      <div>
        <strong>{value}</strong>
        <p>{title}</p>
      </div>
    </article>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <ClipboardList size={34} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "success" ? <CheckCheck size={16} /> : t.type === "info" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

function GlobalSearch({ tasks, projects, onOpenProject, onNavigate, onViewDetail, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!q.trim()) return { tasks: [], projects: [] };
    const lower = q.toLowerCase();
    return {
      tasks: tasks.filter((t) =>
        t.title.toLowerCase().includes(lower) ||
        (t.description || "").toLowerCase().includes(lower) ||
        (t.project?.name || "").toLowerCase().includes(lower)
      ).slice(0, 6),
      projects: projects.filter((p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description || "").toLowerCase().includes(lower)
      ).slice(0, 4),
    };
  }, [q, tasks, projects]);

  const hasResults = results.tasks.length > 0 || results.projects.length > 0;

  return (
    <div className="search-overlay" onMouseDown={onClose}>
      <div className="search-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <Search size={18} className="search-icon" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks and projects…" />
          <kbd className="search-esc">ESC</kbd>
        </div>
        {q.trim() ? (
          <div className="search-results">
            {!hasResults && <div className="search-empty">No results for "{q}"</div>}
            {results.projects.length > 0 && (
              <>
                <div className="search-section-label">Projects</div>
                {results.projects.map((p) => (
                  <button key={p.id} className="search-result" onClick={() => { onOpenProject(p); onClose(); }}>
                    <FolderKanban size={15} />
                    <span className="search-result-title">{p.name}</span>
                    <span className="search-result-sub">{p.description || "No description"}</span>
                  </button>
                ))}
              </>
            )}
            {results.tasks.length > 0 && (
              <>
                <div className="search-section-label">Tasks</div>
                {results.tasks.map((t) => (
                  <button key={t.id} className="search-result" onClick={() => { onViewDetail(t); onClose(); }}>
                    <CheckSquare size={15} />
                    <div className="search-result-body">
                      <span className="search-result-title">{t.title}</span>
                      <span className="search-result-sub">{t.project?.name} · {t.assignee?.name || "Unassigned"}</span>
                    </div>
                    <StatusBadge status={t.status} overdue={isOverdue(t)} />
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="search-hints">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>ESC</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, user, canManage, onEdit, onDelete, onStatus, onViewDetail, onMarkDone }) {
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const cols = [
    { id: "TODO", label: "To Do", tone: "neutral" },
    { id: "IN_PROGRESS", label: "In Progress", tone: "info" },
    { id: "DONE", label: "Done", tone: "success" },
  ];

  function handleDrop(e, status) {
    e.preventDefault();
    if (!dragId) return;
    const task = tasks.find((t) => t.id === dragId);
    if (task && task.status !== status) {
      if (status === "DONE") onMarkDone(task);
      else onStatus(dragId, status);
    }
    setDragId(null);
    setDragOver(null);
  }

  return (
    <div className="kanban-board">
      {cols.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const isOver = dragOver === col.id;
        return (
          <div
            key={col.id}
            className={classNames("kanban-col", isOver && "kanban-col-over")}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={classNames("kanban-col-header", `kanban-header-${col.tone}`)}>
              <span>{col.label}</span>
              <span className="kanban-count">{colTasks.length}</span>
            </div>
            <div className="kanban-cards">
              {colTasks.map((task) => {
                const canAct = canManage || task.assigneeId === user.id;
                return (
                  <div
                    key={task.id}
                    className={classNames("kanban-card", isOverdue(task) && "task-overdue", dragId === task.id && "kanban-dragging")}
                    draggable={canAct}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                  >
                    <div className="kanban-card-badges">
                      <PriorityBadge priority={task.priority} />
                      {isOverdue(task) && <span className="badge badge-danger" style={{ fontSize: 10 }}><AlertTriangle size={10} />Overdue</span>}
                    </div>
                    <p className="kanban-card-title">{task.title}</p>
                    {task.description && <p className="kanban-card-desc">{task.description.slice(0, 90)}{task.description.length > 90 ? "…" : ""}</p>}
                    <div className="kanban-card-footer">
                      <span className="kanban-assignee">
                        <Avatar user={task.assignee} size="sm" />
                        <span>{task.assignee?.name || "Unassigned"}</span>
                      </span>
                      <div className="kanban-card-actions">
                        <button className="kanban-icon-btn" onClick={() => onViewDetail(task)} title="View details"><Eye size={13} /></button>
                        {canManage && <button className="kanban-icon-btn" onClick={() => onEdit(task)} title="Edit"><Pencil size={13} /></button>}
                        {canManage && <button className="kanban-icon-btn kanban-icon-danger" onClick={() => onDelete(task.id)} title="Delete"><Trash2 size={13} /></button>}
                      </div>
                    </div>
                    {task.dueDate && (
                      <div className={classNames("kanban-due", isOverdue(task) && "kanban-due-overdue")}>
                        <CalendarClock size={11} />{formatDate(task.dueDate, true)}
                      </div>
                    )}
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className={classNames("kanban-empty", isOver && "kanban-empty-over")}>
                  {isOver ? "Drop here" : "No tasks"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user.name);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isGoogleUser = !user.hasPassword;

  async function submit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const payload = { name };
      if (newPw) {
        payload.currentPassword = currentPw;
        payload.newPassword = newPw;
      }
      const res = await api.patch("/auth/profile", payload);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setSuccess("Profile updated successfully");
      onUpdate(res.data.user);
      setCurrentPw(""); setNewPw("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Profile Settings</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>
        <form className="modal-form" onSubmit={submit}>
          <div className="profile-header-row">
            <Avatar user={{ ...user, name }} />
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
              <span className={classNames("role-chip", user.role === "ADMIN" ? "admin" : "member")}>{user.role}</span>
            </div>
          </div>
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          {!isGoogleUser && (
            <>
              <div className="field-divider"><span>Change password</span></div>
              <Field label="Current password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
              <Field label="New password" type="password" placeholder="Min. 6 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            </>
          )}
          {isGoogleUser && <div className="form-note">Signed in with Google — password change not available.</div>}
          {error && <div className="form-alert"><AlertTriangle size={14} />{error}</div>}
          {success && <div className="form-success"><CheckCheck size={14} />{success}</div>}
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" icon={Save} disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.58-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AuthScreen({ onAuth, initialResetToken }) {
  const [mode, setMode] = useState(initialResetToken ? "reset" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });
  const [resetToken] = useState(initialResetToken || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const googleInitRef = useRef(false);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setSuccess("");
    setForm((f) => ({ ...f, password: "" }));
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initGIS() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      if (googleInitRef.current) return;
      googleInitRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 374,
        shape: "rectangular",
        text: "continue_with",
      });
    }

    if (window.google?.accounts?.id) {
      initGIS();
    } else {
      window.onGoogleLibraryLoad = initGIS;
    }

    return () => {
      if (window.onGoogleLibraryLoad === initGIS) {
        window.onGoogleLibraryLoad = null;
      }
    };
  }, [GOOGLE_CLIENT_ID]);

  async function handleGoogleCredential(response) {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/google", { credential: response.credential });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onAuth({ token: res.data.token, user: res.data.user });
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const response = await api.post(endpoint, payload);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      onAuth({ token: response.data.token, user: response.data.user, isNew: mode === "signup" });
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: form.email });
      if (res.data.devResetUrl) {
        setSuccess(`No email service configured. Use this link to reset:\n${res.data.devResetUrl}`);
      } else {
        setSuccess("If that email exists, a reset link has been sent. Check your inbox (and spam).");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, password: form.password });
      window.history.replaceState(null, "", "/");
      setSuccess("Password reset successfully! You can now log in with your new password.");
      setTimeout(() => switchMode("login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "forgot") {
    return (
      <main className="auth-page">
        <div className="auth-bg-effects">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
        </div>
        <section className="auth-panel">
          <div className="brand-mark"><FolderKanban size={28} /></div>
          <h1>TeamHub</h1>
          <p className="auth-tagline">Project delivery, task ownership, and team progress — unified in one powerful workspace.</p>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-icon"><CheckSquare size={18} /></span><div><strong>Task Management</strong><small>Create, assign, and track with JIRA-style workflows</small></div></div>
            <div className="auth-feature"><span className="auth-feature-icon"><Users size={18} /></span><div><strong>Team Collaboration</strong><small>Role-based access for admins and members</small></div></div>
            <div className="auth-feature"><span className="auth-feature-icon"><BarChart3 size={18} /></span><div><strong>Progress Tracking</strong><small>Real-time dashboards and project analytics</small></div></div>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-card-header">
            <Mail size={20} />
            <h2>Reset password</h2>
            <p>Enter your email and we'll send you a reset link.</p>
          </div>
          <form onSubmit={submitForgot} className="reset-form">
            <Field label="Email address" type="email" placeholder="you@company.com" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            {error && <div className="form-alert"><AlertTriangle size={14} />{error}</div>}
            {success && <div className="form-success"><CheckCircle2 size={14} /><span style={{ whiteSpace: "pre-wrap" }}>{success}</span></div>}
            <Button type="submit" style={{ width: "100%", marginTop: "6px" }} icon={Send} disabled={loading || !!success}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <p className="auth-switch">
              Remember your password?
              <button type="button" onClick={() => switchMode("login")}>Sign in</button>
            </p>
          </form>
        </section>
      </main>
    );
  }

  if (mode === "reset") {
    return (
      <main className="auth-page">
        <div className="auth-bg-effects">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
        </div>
        <section className="auth-panel">
          <div className="brand-mark"><FolderKanban size={28} /></div>
          <h1>TeamHub</h1>
          <p className="auth-tagline">Project delivery, task ownership, and team progress — unified in one powerful workspace.</p>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-icon"><CheckSquare size={18} /></span><div><strong>Task Management</strong><small>Create, assign, and track with JIRA-style workflows</small></div></div>
            <div className="auth-feature"><span className="auth-feature-icon"><Users size={18} /></span><div><strong>Team Collaboration</strong><small>Role-based access for admins and members</small></div></div>
            <div className="auth-feature"><span className="auth-feature-icon"><BarChart3 size={18} /></span><div><strong>Progress Tracking</strong><small>Real-time dashboards and project analytics</small></div></div>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-card-header">
            <KeyRound size={20} />
            <h2>Choose new password</h2>
            <p>Enter a new password for your account.</p>
          </div>
          <form onSubmit={submitReset} className="reset-form">
            <Field label="New password" type="password" placeholder="Min. 6 characters" minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
            {error && <div className="form-alert"><AlertTriangle size={14} />{error}</div>}
            {success && <div className="form-success"><CheckCircle2 size={14} />{success}</div>}
            <Button type="submit" style={{ width: "100%", marginTop: "6px" }} icon={Save} disabled={loading || !!success}>
              {loading ? "Resetting…" : "Set new password"}
            </Button>
            <p className="auth-switch">
              <button type="button" onClick={() => switchMode("login")}>Back to sign in</button>
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <section className="auth-panel">
        <div className="brand-mark">
          <FolderKanban size={28} />
        </div>
        <h1>TeamHub</h1>
        <p className="auth-tagline">Project delivery, task ownership, and team progress — unified in one powerful workspace.</p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-icon"><CheckSquare size={18} /></span>
            <div>
              <strong>Task Management</strong>
              <small>Create, assign, and track with JIRA-style workflows</small>
            </div>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon"><Users size={18} /></span>
            <div>
              <strong>Team Collaboration</strong>
              <small>Role-based access for admins and members</small>
            </div>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon"><BarChart3 size={18} /></span>
            <div>
              <strong>Progress Tracking</strong>
              <small>Real-time dashboards and project analytics</small>
            </div>
          </div>
        </div>

        <div className="role-cards-label"><span>Continue as</span></div>
        <div className="role-cards" aria-label="Choose a role">
          <button type="button" className={form.role === "ADMIN" ? "active" : ""} onClick={() => { switchMode("login"); set("role", "ADMIN"); }}>
            <ShieldCheck size={20} />
            <strong>Admin</strong>
            <span>Manage projects, team &amp; tasks</span>
          </button>
          <button type="button" className={form.role === "MEMBER" ? "active" : ""} onClick={() => { if (mode === "login") switchMode("login"); set("role", "MEMBER"); }}>
            <UserRound size={20} />
            <strong>Member</strong>
            <span>Track your assigned work</span>
          </button>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <Sparkles size={20} />
          <h2>{mode === "login" ? "Welcome back" : "Get started"}</h2>
          <p>
            {mode === "login"
              ? "Sign in to your workspace"
              : (
                <span className="auth-role-badge">
                  {form.role === "ADMIN" ? <ShieldCheck size={13} /> : <UserRound size={13} />}
                  Signing up as {form.role === "ADMIN" ? "Admin" : "Member"}
                </span>
              )}
          </p>
        </div>

        {GOOGLE_CLIENT_ID ? (
          <div className="google-btn-wrap" ref={googleBtnRef} />
        ) : (
          <button type="button" className="google-btn-mock" disabled title="Configure VITE_GOOGLE_CLIENT_ID to enable">
            <GoogleIcon />
            Continue with Google
          </button>
        )}

        <div className="auth-divider"><span>or</span></div>

        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} type="button">
            <LogIn size={15} />
            Login
          </button>
          {form.role !== "ADMIN" && (
            <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")} type="button">
              <UserRound size={15} />
              Sign up
            </button>
          )}
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Full name" placeholder="Enter your full name" value={form.name} onChange={(event) => set("name", event.target.value)} required />
          )}
          <Field label="Email address" type="email" placeholder="you@company.com" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} required />
          <Field label="Password" type="password" placeholder="Min. 6 characters" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => set("password", event.target.value)} required />

          {error && <div className="form-alert"><AlertTriangle size={14} />{error}</div>}

          <Button type="submit" style={{ width: "100%", marginTop: "6px" }} icon={mode === "login" ? ArrowRight : Save} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          {form.role !== "ADMIN" && (
            <p className="auth-switch">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          )}
          {mode === "login" && (
            <p className="auth-forgot">
              <button type="button" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

function ProjectForm({ project, users, currentUser, onSave, onClose }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    memberIds: project?.members?.map((user) => user.id) || [currentUser.id],
  });

  const toggleMember = (id) => {
    setForm((current) => {
      const exists = current.memberIds.includes(id);
      return {
        ...current,
        memberIds: exists
          ? current.memberIds.filter((memberId) => memberId !== id)
          : [...current.memberIds, id],
      };
    });
  };

  function submit(event) {
    event.preventDefault();
    onSave({
      name: form.name,
      description: form.description,
      memberIds: form.memberIds,
    });
  }

  return (
    <form className="modal-form" onSubmit={submit}>
      <Field label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <TextArea label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />

      <div className="field">
        <span>Team members</span>
        <div className="member-picker">
          {users.map((user) => (
            <label key={user.id} className={classNames("member-option", user.id === currentUser.id && "member-option-self")}>
              <input
                type="checkbox"
                checked={form.memberIds.includes(user.id)}
                onChange={() => toggleMember(user.id)}
                disabled={user.id === currentUser.id}
              />
              <Avatar user={user} size="sm" />
              <span>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" icon={Save}>{project ? "Save project" : "Create project"}</Button>
      </footer>
    </form>
  );
}

function TaskForm({ task, projects, users, currentUser, selectedProject, onSave, onClose }) {
  const firstProject = selectedProject || projects[0];
  const isEditing = Boolean(task?.id);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    projectId: task?.projectId || firstProject?.id || "",
    assigneeId: task?.assigneeId || (currentUser.role === "MEMBER" ? currentUser.id : ""),
    status: task?.status || "TODO",
    priority: task?.priority || "MEDIUM",
    dueDate: dateInputValue(task?.dueDate),
  });

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.projectId) {
      setError(currentUser.role === "ADMIN"
        ? "Create a project before adding tasks."
        : "No project is assigned to you yet. Ask an admin to add you to a project.");
      return;
    }
    onSave({
      ...form,
      assigneeId: currentUser.role === "MEMBER" ? currentUser.id : form.assigneeId,
    });
  }

  return (
    <form className="modal-form" onSubmit={submit}>
      <Field label="Task title" value={form.title} onChange={(event) => set("title", event.target.value)} required />
      <TextArea label="Description" value={form.description} onChange={(event) => set("description", event.target.value)} rows={4} />

      <div className="two-col">
        <SelectField label="Project" value={form.projectId} onChange={(event) => set("projectId", event.target.value)} required disabled={!projects.length}>
          <option value="">{projects.length ? "Select project" : "No projects available"}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </SelectField>

        {currentUser.role === "ADMIN" ? (
          <SelectField label="Assignee" value={form.assigneeId} onChange={(event) => set("assigneeId", event.target.value)}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
          </SelectField>
        ) : (
          <Field label="Assignee" value={currentUser.name} disabled />
        )}
      </div>

      <div className="three-col">
        <SelectField label="Status" value={form.status} onChange={(event) => set("status", event.target.value)}>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </SelectField>
        <SelectField label="Priority" value={form.priority} onChange={(event) => set("priority", event.target.value)}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </SelectField>
        <Field label="Due date" type="date" value={form.dueDate} onChange={(event) => set("dueDate", event.target.value)} />
      </div>

      {error && <div className="form-alert">{error}</div>}
      {!projects.length && (
        <div className="form-note">
          {currentUser.role === "ADMIN"
            ? "Start by creating a project, then add tasks inside it."
            : "Members can create or update tasks only after an admin adds them to a project."}
        </div>
      )}

      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" icon={Save} disabled={!projects.length}>{isEditing ? "Save task" : "Create task"}</Button>
      </footer>
    </form>
  );
}

function TaskCard({ task, currentUser, canManage, onEdit, onDelete, onStatus, onViewDetail, onMarkDone }) {
  const assignedToMe = task.assigneeId === currentUser.id;
  const canAct = canManage || assignedToMe;

  function handleStatusChange(event) {
    const newStatus = event.target.value;
    if (newStatus === "DONE" && task.status !== "DONE") {
      onMarkDone(task);
    } else {
      onStatus(task.id, newStatus);
    }
  }

  return (
    <article className={classNames("task-card", isOverdue(task) && "task-overdue", task.status === "DONE" && "task-completed")}>
      <div className="task-main">
        <div className="task-badges">
          <StatusBadge status={task.status} overdue={isOverdue(task)} />
          <PriorityBadge priority={task.priority} />
          {task.commentCount > 0 && (
            <span className="badge badge-neutral">
              <MessageSquare size={12} />
              {task.commentCount}
            </span>
          )}
        </div>
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        <div className="task-meta">
          <span><FolderKanban size={14} />{task.project?.name || "No project"}</span>
          <span className={classNames(isOverdue(task) && "task-meta-overdue", task.dueDate && !isOverdue(task) && (formatDate(task.dueDate, true) === "Today" ? "task-meta-today" : formatDate(task.dueDate, true) === "Tomorrow" ? "task-meta-soon" : ""))}><CalendarClock size={14} />{formatDate(task.dueDate, true)}</span>
          <span><UserRound size={14} />{task.assignee?.name || "Unassigned"}</span>
        </div>
        {task.status === "DONE" && task.completedAt && (
          <div className="task-completion-info">
            <CheckCircle2 size={13} />
            <span>Completed {formatDate(task.completedAt)}</span>
            {task.completionNote && <span className="completion-note-preview">— {task.completionNote.slice(0, 60)}{task.completionNote.length > 60 ? "…" : ""}</span>}
          </div>
        )}
      </div>

      <div className="task-actions">
        <Button variant="secondary" size="sm" icon={Eye} onClick={() => onViewDetail(task)}>Details</Button>
        {canAct && (
          <select value={task.status} onChange={handleStatusChange} aria-label="Update status">
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
        )}
        {canManage && (
          <>
            <IconButton label="Edit task" icon={Pencil} onClick={() => onEdit(task)} />
            <IconButton label="Delete task" icon={Trash2} variant="danger" onClick={() => onDelete(task.id)} />
          </>
        )}
      </div>
    </article>
  );
}

function CompletionModal({ task, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [proofText, setProofText] = useState("");
  const [step, setStep] = useState(1);

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm(task.id, note, proofText);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal completion-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header completion-header">
          <div className="completion-title-row">
            <span className="completion-icon"><FileCheck size={22} /></span>
            <div>
              <h2>Mark as Done</h2>
              <small>Complete the task with proof of work</small>
            </div>
          </div>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>

        <div className="completion-task-summary">
          <div className="completion-task-info">
            <h3>{task.title}</h3>
            <div className="task-meta">
              <span><FolderKanban size={13} />{task.project?.name}</span>
              <span><UserRound size={13} />{task.assignee?.name || "Unassigned"}</span>
              <span><CalendarClock size={13} />{formatDate(task.dueDate, true)}</span>
            </div>
          </div>
          <div className="completion-status-flow">
            <span className={classNames("badge", `badge-${STATUS[task.status]?.tone || "neutral"}`)}>
              {STATUS[task.status]?.label || task.status}
            </span>
            <ArrowRight size={16} />
            <span className="badge badge-success"><CheckCircle2 size={13} />Done</span>
          </div>
        </div>

        <form className="completion-form" onSubmit={handleSubmit}>
          <div className="completion-steps">
            <div className={classNames("completion-step", step >= 1 && "active")}>
              <button type="button" className="step-marker" onClick={() => setStep(1)}>
                <span>1</span>
              </button>
              <span>Completion Summary</span>
            </div>
            <div className="step-line" />
            <div className={classNames("completion-step", step >= 2 && "active")}>
              <button type="button" className="step-marker" onClick={() => setStep(2)}>
                <span>2</span>
              </button>
              <span>Proof of Work</span>
            </div>
          </div>

          {step === 1 && (
            <div className="completion-step-content">
              <TextArea
                label="Completion notes (required)"
                placeholder="Describe what was accomplished, key decisions made, and any relevant outcomes…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                required
              />
              <div className="completion-hint">
                <Clock size={14} />
                <span>This note will be logged as the official completion record</span>
              </div>
              <footer className="modal-actions">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="button" icon={ArrowRight} onClick={() => { if (note.trim()) setStep(2); }} disabled={!note.trim()}>
                  Next: Add Proof
                </Button>
              </footer>
            </div>
          )}

          {step === 2 && (
            <div className="completion-step-content">
              <TextArea
                label="Proof of work (optional)"
                placeholder="Add links to commits, screenshots, documents, or any evidence of completed work…"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                rows={4}
              />
              <div className="completion-hint">
                <FileCheck size={14} />
                <span>Include links, references, or descriptions to verify completion</span>
              </div>
              <footer className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" icon={CheckCircle2} disabled={!note.trim()}>
                  Confirm Completion
                </Button>
              </footer>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

function TaskDetailModal({ task, currentUser, onClose, onAddComment }) {
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("comment");

  function handleSubmit(event) {
    event.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(task.id, commentText, commentType);
    setCommentText("");
  }

  const canComment = currentUser.role === "ADMIN" || task.assigneeId === currentUser.id;
  const comments = task.comments || [];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal task-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Task Details</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>

        <div className="task-detail-content">
          <div className="task-detail-header">
            <div className="task-badges">
              <StatusBadge status={task.status} overdue={isOverdue(task)} />
              <PriorityBadge priority={task.priority} />
            </div>
            <h3>{task.title}</h3>
            {task.description && <p className="task-detail-desc">{task.description}</p>}
            <div className="task-meta">
              <span><FolderKanban size={14} />{task.project?.name}</span>
              <span><CalendarClock size={14} />{formatDate(task.dueDate, true)}</span>
              <span><UserRound size={14} />{task.assignee?.name || "Unassigned"}</span>
            </div>
          </div>

          {task.completionNote && (
            <div className="task-detail-completion">
              <div className="section-kicker">Completion Summary</div>
              <div className="completion-note-full">
                <CheckCircle2 size={16} />
                <div>
                  <p>{task.completionNote}</p>
                  {task.completedAt && <small>Completed on {formatDate(task.completedAt)}</small>}
                </div>
              </div>
            </div>
          )}

          <div className="task-detail-activity">
            <div className="section-kicker">Activity & Comments ({comments.length})</div>

            {canComment && (
              <form className="comment-form" onSubmit={handleSubmit}>
                <div className="comment-type-pills">
                  <button type="button" className={commentType === "comment" ? "active" : ""} onClick={() => setCommentType("comment")}>
                    <MessageSquare size={13} /> Comment
                  </button>
                  <button type="button" className={commentType === "proof" ? "active" : ""} onClick={() => setCommentType("proof")}>
                    <FileCheck size={13} /> Proof of Work
                  </button>
                </div>
                <div className="comment-input-row">
                  <Avatar user={currentUser} size="sm" />
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={commentType === "proof" ? "Add proof link or description…" : "Write a comment…"}
                  />
                  <IconButton label="Send" icon={Send} onClick={handleSubmit} />
                </div>
              </form>
            )}

            <div className="comment-list">
              {comments.length ? comments.map((comment) => (
                <div key={comment.id} className={classNames("comment-item", `comment-${comment.type}`)}>
                  <Avatar user={comment.user} size="sm" />
                  <div className="comment-body">
                    <div className="comment-meta">
                      <strong>{comment.user?.name}</strong>
                      <span className={classNames("comment-type-tag", `tag-${comment.type}`)}>
                        {comment.type === "status_change" ? "Status Update" : comment.type === "completion" ? "Completion" : comment.type === "proof" ? "Proof" : "Comment"}
                      </span>
                      <small>{formatDate(comment.createdAt)}</small>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                </div>
              )) : (
                <div className="no-comments">
                  <MessageSquare size={20} />
                  <span>No activity yet</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sidebar({ user, view, projects, overdueTasks, selectedProjectId, onNavigate, onOpenProject, onLogout, onOpenProfile, onClose, mobileOpen }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "projects", label: "Projects", Icon: FolderKanban },
    { id: "tasks", label: user.role === "ADMIN" ? "Tasks" : "My tasks", Icon: CheckSquare, badge: overdueTasks || 0 },
    ...(user.role === "ADMIN" ? [{ id: "team", label: "Team", Icon: Users }] : []),
  ];

  function handleNavigate(id) {
    onNavigate(id);
    if (onClose) onClose();
  }

  function handleOpenProject(project) {
    onOpenProject(project);
    if (onClose) onClose();
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onMouseDown={onClose} />}
      <aside className={classNames("sidebar", mobileOpen && "sidebar-mobile-open")}>
        <div className="sidebar-brand">
          <span><FolderKanban size={22} /></span>
          <div>
            <strong>TeamHub</strong>
            <small>{user.role === "ADMIN" ? "Admin panel" : "Member panel"}</small>
          </div>
          {onClose && <IconButton label="Close menu" icon={X} onClick={onClose} />}
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ id, label, Icon, badge }) => (
            <button key={id} className={view === id || (view === "project-detail" && id === "projects") ? "active" : ""} onClick={() => handleNavigate(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-projects">
          <span className="section-kicker">Projects</span>
          {projects.slice(0, 8).map((project) => (
            <button key={project.id} className={view === "project-detail" && selectedProjectId === project.id ? "active" : ""} onClick={() => handleOpenProject(project)}>
              <CircleDot size={13} />
              <span>{project.name}</span>
            </button>
          ))}
          {!projects.length && <p>No projects yet</p>}
        </div>

        <footer className="sidebar-footer">
          <button className="sidebar-profile-btn" onClick={onOpenProfile} title="Profile settings">
            <Avatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <Settings size={15} className="sidebar-settings-icon" />
          </button>
          <IconButton label="Logout" icon={LogOut} onClick={onLogout} />
        </footer>
      </aside>
    </>
  );
}

function Topbar({ title, subtitle, action, onSearch }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">
        {onSearch && (
          <div className="topbar-search-hint" onClick={onSearch}>
            <Search size={15} />
            <span>Search…</span>
            <kbd>⌘K</kbd>
          </div>
        )}
        {action}
      </div>
    </header>
  );
}

function AdminOnboarding({ onCreateProject, onOpenTeam }) {
  return (
    <section className="onboarding-panel">
      <div className="onboarding-header">
        <span className="onboarding-icon"><Sparkles size={22} /></span>
        <div>
          <h2>Welcome to your TeamHub workspace</h2>
          <p>You're the Admin. Here's how to get your team up and running in 3 steps.</p>
        </div>
      </div>
      <div className="onboarding-steps">
        <div className="onboarding-step">
          <span className="step-num">1</span>
          <div>
            <strong>Create your first project</strong>
            <p>Projects group related work together. Each project has members, tasks, and a progress tracker.</p>
            <button className="onboarding-cta" onClick={onCreateProject}><Plus size={15} /> Create a project</button>
          </div>
        </div>
        <div className="onboarding-step">
          <span className="step-num">2</span>
          <div>
            <strong>Invite your team members</strong>
            <p>Team members sign up on this app and appear in the Team tab. You can then add them to projects.</p>
            <button className="onboarding-cta" onClick={onOpenTeam}><Users size={15} /> Go to Team</button>
          </div>
        </div>
        <div className="onboarding-step">
          <span className="step-num">3</span>
          <div>
            <strong>Add tasks &amp; track progress</strong>
            <p>Inside each project, create tasks, assign priorities, set due dates, and move them through the Kanban board.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardView({ user, dashboard, tasks, projects, onOpenTask, onOpenProject, onOpenTeam, onCreateProject, dataLoaded, onSearch }) {
  const stats = dashboard?.stats || {};
  const myTasks = tasks.filter((task) => task.assigneeId === user.id);
  const focusTasks = user.role === "ADMIN"
    ? tasks.filter(isOverdue).slice(0, 6)
    : myTasks.filter((task) => task.status !== "DONE").slice(0, 6);
  const progressItems = (dashboard?.projectProgress || []).map((p) => ({
    ...p,
    done: p.done ?? p.completedTasks ?? 0,
    total: p.total ?? p.totalTasks ?? 0,
  })).concat(
    !dashboard?.projectProgress ? projects.map((project) => ({ ...project, ...projectMetrics(project, tasks) })) : []
  );
  const isNewAdmin = dataLoaded && user.role === "ADMIN" && projects.length === 0;
  const dueTodayCount = tasks.filter((t) => t.status !== "DONE" && t.dueDate && formatDate(t.dueDate, true) === "Today").length;
  const dueSoonCount = tasks.filter((t) => t.status !== "DONE" && t.dueDate && formatDate(t.dueDate, true) === "Tomorrow").length;

  return (
    <section className="view">
      <Topbar
        title={user.role === "ADMIN" ? "Admin dashboard" : `Welcome, ${user.name}`}
        subtitle={user.role === "ADMIN" ? "Control tower for project delivery and team workload." : "Your assigned work, deadlines, and project progress."}
        onSearch={onSearch}
      />

      {isNewAdmin ? (
        <AdminOnboarding onCreateProject={onCreateProject} onOpenTeam={onOpenTeam} />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard title="Projects" value={stats.projects || projects.length} icon={FolderKanban} />
            <StatCard title={user.role === "ADMIN" ? "Total tasks" : "My tasks"} value={user.role === "ADMIN" ? stats.totalTasks || tasks.length : stats.myTasks || myTasks.length} icon={ClipboardList} tone="info" />
            <StatCard title="In progress" value={stats.inProgressTasks || 0} icon={LoaderCircle} tone="warning" />
            <StatCard title="Overdue" value={stats.overdueTasks || 0} icon={AlertTriangle} tone="danger" />
          </div>

          {(dueTodayCount > 0 || dueSoonCount > 0) && (
            <div className="due-banner">
              {dueTodayCount > 0 && <span className="due-banner-chip today"><CalendarClock size={14} />{dueTodayCount} due today</span>}
              {dueSoonCount > 0 && <span className="due-banner-chip soon"><CalendarClock size={14} />{dueSoonCount} due tomorrow</span>}
            </div>
          )}

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>{user.role === "ADMIN" ? "Needs attention" : "My active tasks"}</h2>
                <Button variant="secondary" size="sm" icon={Plus} onClick={onOpenTask}>New task</Button>
              </div>
              {focusTasks.length ? (
                <div className="compact-list">
                  {focusTasks.map((task) => (
                    <button key={task.id} className="compact-row" onClick={() => onOpenProject(projects.find((project) => project.id === task.projectId))}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{task.project?.name} · {formatDate(task.dueDate, true)}</small>
                      </span>
                      <StatusBadge status={task.status} overdue={isOverdue(task)} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nothing urgent" text="No overdue or active tasks are waiting here." />
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Project progress</h2>
                <BarChart3 size={19} />
              </div>
              {progressItems.length ? (
                <div className="progress-list">
                  {progressItems.slice(0, 6).map((project) => (
                    <button key={project.id} className="progress-row" onClick={() => onOpenProject(projects.find((item) => item.id === project.id))}>
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.done || 0}/{project.total || 0} tasks complete</small>
                      </span>
                      <div>
                        <b>{project.progress}%</b>
                        <ProgressBar value={project.progress} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No project data" text="Create a project to start tracking progress." />
              )}
            </section>
          </div>

          {user.role === "ADMIN" && dashboard?.teamLoad?.length > 0 && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Team workload</h2>
                <Users size={19} />
              </div>
              <div className="team-load">
                {dashboard.teamLoad.map((member) => (
                  <article key={member.id}>
                    <Avatar user={member} />
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.assignedTasks} assigned · {member.completedTasks} done · {member.overdueTasks} overdue</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function ProjectsView({ user, projects, tasks, onCreate, onEdit, onDelete, onOpen, onSearch }) {
  return (
    <section className="view">
      <Topbar
        title="Projects"
        subtitle={user.role === "ADMIN" ? "Create projects, assign team members, and track delivery health." : "Projects you are part of or have assigned work in."}
        action={user.role === "ADMIN" && <Button icon={Plus} onClick={onCreate}>New project</Button>}
        onSearch={onSearch}
      />

      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => {
            const metrics = projectMetrics(project, tasks);
            return (
              <article key={project.id} className="project-card" onClick={() => onOpen(project)}>
                <div className="project-card-head">
                  <span className="project-icon"><FolderKanban size={20} /></span>
                  {user.role === "ADMIN" && (
                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                      <IconButton label="Edit project" icon={Pencil} onClick={() => onEdit(project)} />
                      <IconButton label="Delete project" icon={Trash2} variant="danger" onClick={() => onDelete(project.id)} />
                    </div>
                  )}
                </div>
                <h2>{project.name}</h2>
                <p>{project.description || "No description yet."}</p>
                <div className="project-progress">
                  <span><b>{metrics.progress}%</b> complete</span>
                  <ProgressBar value={metrics.progress} />
                </div>
                <footer>
                  <span>{metrics.total} tasks</span>
                  <AvatarGroup users={project.members} />
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          text={user.role === "ADMIN" ? "Create the first project and add team members." : "An admin needs to add you to a project."}
          action={user.role === "ADMIN" && <Button icon={Plus} onClick={onCreate}>Create project</Button>}
        />
      )}
    </section>
  );
}

const ACTIVITY_META = {
  task_created:        { Icon: Plus,         tone: "success", verb: "created task" },
  task_updated:        { Icon: Pencil,        tone: "info",    verb: "updated task" },
  task_status_DONE:    { Icon: CheckCircle2,  tone: "success", verb: "completed" },
  task_status_IN_PROGRESS: { Icon: CircleDot, tone: "info",   verb: "started work on" },
  task_status_TODO:    { Icon: Circle,        tone: "neutral", verb: "moved back to To Do" },
  task_deleted:        { Icon: Trash2,        tone: "danger",  verb: "deleted task" },
};

function ActivityItem({ item }) {
  const meta = ACTIVITY_META[item.action] || { Icon: Activity, tone: "neutral", verb: item.action };
  const { Icon, tone, verb } = meta;
  const when = (() => {
    const diff = Date.now() - new Date(item.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();
  return (
    <div className="activity-item">
      <div className={`activity-dot activity-dot--${tone}`}>
        <Icon size={14} />
      </div>
      <div className="activity-content">
        <p className="activity-text">
          <strong>{item.userName}</strong>{" "}
          <span>{verb}</span>
          {item.taskTitle && <>{" "}<span className="activity-task-name">"{item.taskTitle}"</span></>}
        </p>
        <span className="activity-meta">{when}</span>
      </div>
    </div>
  );
}

function ProjectDetailView({ user, project, tasks, onBack, onCreateTask, onEditProject, onDeleteProject, onEditTask, onDeleteTask, onStatus, onViewDetail, onMarkDone, onSearch }) {
  const [filter, setFilter] = useState("ALL");
  const [viewType, setViewType] = useState("list");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setActivityLoading(true);
    api.get(`/projects/${project.id}/activity`)
      .then((r) => setActivity(r.data))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [project.id]);

  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const metrics = projectMetrics(project, tasks);
  const filteredTasks = projectTasks.filter((task) => {
    if (filter === "ALL") return true;
    if (filter === "OVERDUE") return isOverdue(task);
    return task.status === filter;
  });

  return (
    <section className="view">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={17} />
        Back to projects
      </button>

      <Topbar
        title={project.name}
        subtitle={project.description || "Project workspace"}
        onSearch={onSearch}
        action={(
          <div className="topbar-actions">
            <Button icon={Plus} onClick={() => onCreateTask(project)}>Add task</Button>
            {user.role === "ADMIN" && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => onEditProject(project)}>Edit</Button>
                <Button variant="danger" icon={Trash2} onClick={() => onDeleteProject(project.id)}>Delete</Button>
              </>
            )}
          </div>
        )}
      />

      <div className="project-detail-grid">
        <section className="panel">
          <span className="section-kicker">Progress</span>
          <div className="big-progress">
            <strong>{metrics.progress}%</strong>
            <ProgressBar value={metrics.progress} />
          </div>
          <div className="mini-stats">
            <span>{metrics.total} tasks</span>
            <span>{metrics.done} done</span>
            <span>{metrics.overdue} overdue</span>
          </div>
        </section>

        <section className="panel">
          <span className="section-kicker">Team</span>
          <div className="member-list">
            {project.members?.map((member) => (
              <div key={member.id}>
                <Avatar user={member} />
                <span>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>Tasks</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {viewType === "list" && (
              <div className="filter-pills">
                {["ALL", "TODO", "IN_PROGRESS", "DONE", "OVERDUE"].map((item) => (
                  <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                    {item === "ALL" ? "All" : item.replace("_", " ").toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <div className="view-toggle">
              <button className={viewType === "list" ? "active" : ""} onClick={() => setViewType("list")} title="List view"><LayoutList size={16} /></button>
              <button className={viewType === "kanban" ? "active" : ""} onClick={() => setViewType("kanban")} title="Kanban view"><LayoutGrid size={16} /></button>
            </div>
          </div>
        </div>

        {viewType === "list" ? (
          filteredTasks.length ? (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={user}
                  canManage={user.role === "ADMIN"}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStatus={onStatus}
                  onViewDetail={onViewDetail}
                  onMarkDone={onMarkDone}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No tasks match this view" text="Change the filter or add a task to this project." />
          )
        ) : (
          <KanbanBoard
            tasks={projectTasks}
            user={user}
            canManage={user.role === "ADMIN"}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onStatus={onStatus}
            onViewDetail={onViewDetail}
            onMarkDone={onMarkDone}
          />
        )}
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading">
          <h2><Activity size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Activity</h2>
        </div>
        {activityLoading ? (
          <div className="activity-loading"><LoaderCircle size={18} className="spin" /> Loading activity…</div>
        ) : activity.length === 0 ? (
          <EmptyState title="No activity yet" text="Task changes in this project will appear here." />
        ) : (
          <div className="activity-timeline">
            {activity.map((item) => <ActivityItem key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </section>
  );
}

function TasksView({ user, tasks, projects, onCreate, onEdit, onDelete, onStatus, onViewDetail, onMarkDone, onSearch }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");
  const [viewType, setViewType] = useState("list");

  const visibleTasks = useMemo(() => {
    const base = user.role === "ADMIN" ? tasks : tasks.filter((task) => task.assigneeId === user.id);
    return base.filter((task) => {
      const matchesQuery = !query.trim()
        || task.title.toLowerCase().includes(query.toLowerCase())
        || (task.description || "").toLowerCase().includes(query.toLowerCase())
        || (task.project?.name || "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "ALL" || (status === "OVERDUE" ? isOverdue(task) : task.status === status);
      const matchesProject = projectId === "ALL" || String(task.projectId) === String(projectId);
      return matchesQuery && matchesStatus && matchesProject;
    });
  }, [projectId, query, status, tasks, user]);

  const kanbanTasks = useMemo(() => {
    const base = user.role === "ADMIN" ? tasks : tasks.filter((t) => t.assigneeId === user.id);
    return projectId === "ALL" ? base : base.filter((t) => String(t.projectId) === String(projectId));
  }, [tasks, user, projectId]);

  return (
    <section className="view">
      <Topbar
        title={user.role === "ADMIN" ? "Tasks" : "My tasks"}
        subtitle={user.role === "ADMIN" ? "Assign work, update status, and keep deadlines visible." : "Update your status and track assigned deliverables."}
        action={<Button icon={Plus} onClick={() => onCreate()}>New task</Button>}
        onSearch={onSearch}
      />

      <div className="toolbar">
        {viewType === "list" && (
          <label className="search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
          </label>
        )}
        {viewType === "list" && (
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        )}
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="ALL">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <div className="view-toggle">
          <button className={viewType === "list" ? "active" : ""} onClick={() => setViewType("list")} title="List view"><LayoutList size={16} /></button>
          <button className={viewType === "kanban" ? "active" : ""} onClick={() => setViewType("kanban")} title="Kanban view"><LayoutGrid size={16} /></button>
        </div>
      </div>

      {viewType === "list" ? (
        visibleTasks.length ? (
          <div className="task-list">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={user}
                canManage={user.role === "ADMIN"}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatus={onStatus}
                onViewDetail={onViewDetail}
                onMarkDone={onMarkDone}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No tasks found" text="Try a different filter or create a task." />
        )
      ) : (
        <KanbanBoard
          tasks={kanbanTasks}
          user={user}
          canManage={user.role === "ADMIN"}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatus={onStatus}
          onViewDetail={onViewDetail}
          onMarkDone={onMarkDone}
        />
      )}
    </section>
  );
}

function TeamView({ users, tasks, projects, currentUser, onRoleChange, onDeleteUser, onSearch }) {
  return (
    <section className="view">
      <Topbar
        title="Team"
        subtitle="Manage roles and understand how work is distributed."
        onSearch={onSearch}
      />

      {users.length ? (
        <div className="team-grid">
          {users.map((user) => {
            const assigned = tasks.filter((task) => task.assigneeId === user.id);
            const done = assigned.filter((task) => task.status === "DONE").length;
            const userProjects = projects.filter((project) => project.members?.some((member) => member.id === user.id)).length;
            const isSelf = user.id === currentUser.id;
            return (
              <article key={user.id} className="team-card">
                <header>
                  <Avatar user={user} />
                  <div>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                  </div>
                  <span className={classNames("role-chip", user.role === "ADMIN" ? "admin" : "member")}>{user.role}</span>
                </header>
                <div className="team-card-stats">
                  <span><strong>{assigned.length}</strong> assigned</span>
                  <span><strong>{done}</strong> done</span>
                  <span><strong>{userProjects}</strong> projects</span>
                </div>
                <div className="team-card-actions">
                  <SelectField label="Role" value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value)} disabled={isSelf} title={isSelf ? "You cannot change your own role" : undefined}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </SelectField>
                  {!isSelf && (
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => onDeleteUser(user.id, user.name)}>
                      Remove
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No team members" text="Users appear here after signing up." />
      )}
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const sessionRef = useRef(session);
  const logoutRef = useRef(null);
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState({ dashboard: null, projects: [], tasks: [], users: [] });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [completionModal, setCompletionModal] = useState(null);
  const [taskDetailModal, setTaskDetailModal] = useState(null);
  const [profileModal, setProfileModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user;
  const selectedProject = selectedProjectId
    ? data.projects.find((project) => project.id === selectedProjectId)
    : null;

  const overdueTasks = useMemo(() => {
    if (!user) return 0;
    const base = user.role === "ADMIN" ? data.tasks : data.tasks.filter((t) => t.assigneeId === user.id);
    return base.filter(isOverdue).length;
  }, [data.tasks, user]);

  function addToast(message, type = "error") {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    if (session?.token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
      window.history.replaceState(null, "", session.user.role === "ADMIN" ? "/admin" : "/member");
    } else {
      delete api.defaults.headers.common.Authorization;
      window.history.replaceState(null, "", "/");
    }
  }, [session]);

  useEffect(() => {
    const stored = readSession();
    if (!stored?.token) return;
    api.defaults.headers.common.Authorization = `Bearer ${stored.token}`;
    api.get("/auth/me").then((res) => {
      setSession((prev) => prev ? { ...prev, user: res.data.user } : prev);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }).catch((err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setSession(null);
      }
    });
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 && sessionRef.current) {
          const url = err.config?.url || "";
          if (!/\/(login|signup|google|forgot-password|reset-password)/.test(url)) {
            logoutRef.current?.();
          }
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
    setData({ dashboard: null, projects: [], tasks: [], users: [] });
    setView("dashboard");
    setSelectedProjectId(null);
  }, []);
  logoutRef.current = logout;

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [dashboard, projects, tasks, users] = await Promise.all([
        api.get("/dashboard"),
        api.get("/projects"),
        api.get("/tasks"),
        session.user.role === "ADMIN" ? api.get("/users") : Promise.resolve({ data: [] }),
      ]);
      setData({
        dashboard: dashboard.data,
        projects: projects.data,
        tasks: tasks.data,
        users: users.data,
      });
    } catch (err) {
      if (err.response?.status === 401) logout();
      else addToast(err.response?.data?.error || "Could not load workspace data");
    } finally {
      setLoading(false);
    }
  }, [logout, session]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadData(); });
    return () => { active = false; };
  }, [loadData]);

  function handleAuth({ token, user, isNew }) {
    setSession({ token, user });
    if (isNew) {
      addToast(`Welcome to TeamHub, ${user.name}! Your account is ready.`, "success");
    } else {
      addToast(`Welcome back, ${user.name}!`, "success");
    }
  }

  function navigate(nextView) {
    setView(nextView);
    if (nextView !== "project-detail") setSelectedProjectId(null);
    setSidebarOpen(false);
  }

  function openProject(project) {
    if (!project) return;
    setSelectedProjectId(project.id);
    setView("project-detail");
    setSidebarOpen(false);
  }

  function startTask(project) {
    if (!project && data.projects.length === 0) {
      if (user.role === "ADMIN") {
        addToast("Create a project first, then add tasks inside it.", "info");
        setProjectModal({});
      } else {
        addToast("No project assigned yet — ask an admin to add you first.", "info");
      }
      return;
    }
    setTaskModal(project?.id ? { projectId: project.id } : {});
  }

  async function saveProject(form) {
    try {
      const response = projectModal?.id
        ? await api.put(`/projects/${projectModal.id}`, form)
        : await api.post("/projects", form);
      setProjectModal(null);
      await loadData();
      openProject(response.data);
      addToast(projectModal?.id ? "Project updated" : "Project created", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not save project");
    }
  }

  async function deleteProject(id) {
    if (!window.confirm("Delete this project and all of its tasks?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setSelectedProjectId(null);
      setView("projects");
      await loadData();
      addToast("Project deleted", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not delete project");
    }
  }

  async function saveTask(form) {
    try {
      if (taskModal?.id && user.role === "ADMIN") {
        await api.put(`/tasks/${taskModal.id}`, form);
      } else {
        await api.post("/tasks", form);
      }
      setTaskModal(null);
      await loadData();
      addToast(taskModal?.id ? "Task updated" : "Task created", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not save task");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      await loadData();
      addToast("Task deleted", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not delete task");
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.error || "Could not update task status");
    }
  }

  async function completeTask(id, completionNote, proofOfWork) {
    try {
      await api.patch(`/tasks/${id}/status`, { status: "DONE", completionNote });
      if (proofOfWork) {
        await api.post(`/tasks/${id}/comments`, { content: proofOfWork, type: "proof" });
      }
      setCompletionModal(null);
      await loadData();
      addToast("Task marked as done!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not mark task as done");
    }
  }

  async function addComment(id, content, type) {
    try {
      await api.post(`/tasks/${id}/comments`, { content, type });
      const res = await api.get("/tasks");
      setData((prev) => ({ ...prev, tasks: res.data }));
      if (taskDetailModal?.id === id) {
        const updatedTask = res.data.find((t) => t.id === id);
        if (updatedTask) setTaskDetailModal(updatedTask);
      }
    } catch (err) {
      addToast(err.response?.data?.error || "Could not add comment");
    }
  }

  function openTaskDetail(task) {
    const fullTask = data.tasks.find((t) => t.id === task.id) || task;
    setTaskDetailModal(fullTask);
  }

  async function updateRole(id, role) {
    try {
      await api.patch(`/users/${id}/role`, { role });
      await loadData();
      addToast("Role updated", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not update role");
    }
  }

  async function deleteUser(id, name) {
    if (!window.confirm(`Remove "${name}" from the team? Their tasks will be unassigned and they will lose access.`)) return;
    try {
      await api.delete(`/users/${id}`);
      await loadData();
      addToast("Team member removed", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not remove team member");
    }
  }

  function handleProfileUpdate(updatedUser) {
    setSession((prev) => ({ ...prev, user: updatedUser }));
  }

  if (!session || !user) {
    const urlToken = new URLSearchParams(window.location.search).get("reset_token");
    return <AuthScreen onAuth={handleAuth} initialResetToken={urlToken} />;
  }

  const content = (() => {
    if (view === "projects") {
      return (
        <ProjectsView
          user={user}
          projects={data.projects}
          tasks={data.tasks}
          onCreate={() => setProjectModal({})}
          onEdit={setProjectModal}
          onDelete={deleteProject}
          onOpen={openProject}
          onSearch={() => setSearchOpen(true)}
        />
      );
    }
    if (view === "project-detail" && selectedProject) {
      return (
        <ProjectDetailView
          user={user}
          project={selectedProject}
          tasks={data.tasks}
          onBack={() => navigate("projects")}
          onCreateTask={(project) => startTask(project)}
          onEditProject={setProjectModal}
          onDeleteProject={deleteProject}
          onEditTask={setTaskModal}
          onDeleteTask={deleteTask}
          onStatus={updateStatus}
          onViewDetail={openTaskDetail}
          onMarkDone={(task) => setCompletionModal(task)}
          onSearch={() => setSearchOpen(true)}
        />
      );
    }
    if (view === "tasks") {
      return (
        <TasksView
          user={user}
          tasks={data.tasks}
          projects={data.projects}
          onCreate={() => startTask()}
          onEdit={setTaskModal}
          onDelete={deleteTask}
          onStatus={updateStatus}
          onViewDetail={openTaskDetail}
          onMarkDone={(task) => setCompletionModal(task)}
          onSearch={() => setSearchOpen(true)}
        />
      );
    }
    if (view === "team" && user.role === "ADMIN") {
      return (
        <TeamView
          users={data.users}
          tasks={data.tasks}
          projects={data.projects}
          currentUser={user}
          onRoleChange={updateRole}
          onDeleteUser={deleteUser}
          onSearch={() => setSearchOpen(true)}
        />
      );
    }
    return (
      <DashboardView
        user={user}
        dashboard={data.dashboard}
        tasks={data.tasks}
        projects={data.projects}
        onOpenTask={() => startTask()}
        onOpenProject={openProject}
        onOpenTeam={() => navigate("team")}
        onCreateProject={() => setProjectModal({})}
        dataLoaded={data.dashboard !== null}
        onSearch={() => setSearchOpen(true)}
      />
    );
  })();

  return (
    <div className="app-shell">
      <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <Sidebar
        user={user}
        view={view}
        projects={data.projects}
        overdueTasks={overdueTasks}
        selectedProjectId={selectedProjectId}
        onNavigate={navigate}
        onOpenProject={openProject}
        onLogout={logout}
        onOpenProfile={() => setProfileModal(true)}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="workspace">
        {loading && <div className="loading-line" />}
        {content}
      </main>

      {searchOpen && (
        <GlobalSearch
          tasks={data.tasks}
          projects={data.projects}
          onOpenProject={openProject}
          onNavigate={navigate}
          onViewDetail={openTaskDetail}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {profileModal && (
        <ProfileModal
          user={user}
          onClose={() => setProfileModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}

      {projectModal && (
        <Modal title={projectModal.id ? "Edit project" : "Create project"} onClose={() => setProjectModal(null)}>
          <ProjectForm
            project={projectModal.id ? projectModal : null}
            users={data.users}
            currentUser={user}
            onSave={saveProject}
            onClose={() => setProjectModal(null)}
          />
        </Modal>
      )}

      {taskModal && (
        <Modal title={taskModal.id ? "Edit task" : "Create task"} onClose={() => setTaskModal(null)}>
          <TaskForm
            task={taskModal.id ? taskModal : taskModal.projectId ? { projectId: taskModal.projectId } : null}
            projects={data.projects}
            users={data.users}
            currentUser={user}
            selectedProject={selectedProject}
            onSave={saveTask}
            onClose={() => setTaskModal(null)}
          />
        </Modal>
      )}

      {completionModal && (
        <CompletionModal
          task={completionModal}
          onConfirm={completeTask}
          onClose={() => setCompletionModal(null)}
        />
      )}

      {taskDetailModal && (
        <TaskDetailModal
          task={taskDetailModal}
          currentUser={user}
          onAddComment={addComment}
          onClose={() => setTaskDetailModal(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
