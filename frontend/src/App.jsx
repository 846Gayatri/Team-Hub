import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
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
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
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

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseRole = (role) => {
    setMode("signup");
    set("role", role);
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 374,
        shape: "rectangular",
        text: "continue_with",
      });
    }
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
      onAuth({ token: response.data.token, user: response.data.user });
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
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

        <div className="role-cards-label"><span>Sign up as</span></div>
        <div className="role-cards" aria-label="Choose a role to sign up">
          <button type="button" className={mode === "signup" && form.role === "ADMIN" ? "active" : ""} onClick={() => chooseRole("ADMIN")}>
            <ShieldCheck size={20} />
            <strong>Admin</strong>
            <span>Manage projects, team &amp; tasks</span>
          </button>
          <button type="button" className={mode === "signup" && form.role === "MEMBER" ? "active" : ""} onClick={() => chooseRole("MEMBER")}>
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
              : `Creating account as ${form.role === "ADMIN" ? "Admin" : "Member"}`}
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
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            <LogIn size={15} />
            Login
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
            <UserRound size={15} />
            Sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Full name" placeholder="Enter your full name" value={form.name} onChange={(event) => set("name", event.target.value)} required />
          )}
          <Field label="Email address" type="email" placeholder="you@company.com" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} required />
          <Field label="Password" type="password" placeholder="Min. 6 characters" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => set("password", event.target.value)} required />

          {error && <div className="form-alert"><AlertTriangle size={14} />{error}</div>}

          <Button type="submit" className="auth-submit-btn" icon={mode === "login" ? ArrowRight : Save} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <p className="auth-switch">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
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
            <label key={user.id} className="member-option">
              <input
                type="checkbox"
                checked={form.memberIds.includes(user.id)}
                onChange={() => toggleMember(user.id)}
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
          <span><CalendarClock size={14} />{formatDate(task.dueDate)}</span>
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
              <span><CalendarClock size={13} />{formatDate(task.dueDate)}</span>
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
              <span><CalendarClock size={14} />{formatDate(task.dueDate)}</span>
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

function Sidebar({ user, view, projects, onNavigate, onOpenProject, onLogout }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "projects", label: "Projects", Icon: FolderKanban },
    { id: "tasks", label: user.role === "ADMIN" ? "Tasks" : "My tasks", Icon: CheckSquare },
    ...(user.role === "ADMIN" ? [{ id: "team", label: "Team", Icon: Users }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span><FolderKanban size={22} /></span>
        <div>
          <strong>TeamHub</strong>
          <small>{user.role === "ADMIN" ? "Admin panel" : "Member panel"}</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ id, label, Icon }) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => onNavigate(id)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-projects">
        <span className="section-kicker">Projects</span>
        {projects.slice(0, 8).map((project) => (
          <button key={project.id} onClick={() => onOpenProject(project)}>
            <CircleDot size={13} />
            <span>{project.name}</span>
          </button>
        ))}
        {!projects.length && <p>No projects yet</p>}
      </div>

      <footer className="sidebar-footer">
        <Avatar user={user} />
        <div>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>
        <IconButton label="Logout" icon={LogOut} onClick={onLogout} />
      </footer>
    </aside>
  );
}

function Topbar({ title, subtitle, action }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function DashboardView({ user, dashboard, tasks, projects, onOpenTask, onOpenProject }) {
  const stats = dashboard?.stats || {};
  const myTasks = tasks.filter((task) => task.assigneeId === user.id);
  const focusTasks = user.role === "ADMIN"
    ? dashboard?.overdueTasks || tasks.filter(isOverdue).slice(0, 6)
    : myTasks.filter((task) => task.status !== "DONE").slice(0, 6);
  const progressItems = dashboard?.projectProgress || projects.map((project) => projectMetrics(project, tasks));

  return (
    <section className="view">
      <Topbar
        title={user.role === "ADMIN" ? "Admin dashboard" : `Welcome, ${user.name}`}
        subtitle={user.role === "ADMIN" ? "Control tower for project delivery and team workload." : "Your assigned work, deadlines, and project progress."}
      />

      <div className="stats-grid">
        <StatCard title="Projects" value={stats.projects || projects.length} icon={FolderKanban} />
        <StatCard title={user.role === "ADMIN" ? "Total tasks" : "My tasks"} value={user.role === "ADMIN" ? stats.totalTasks || tasks.length : stats.myTasks || myTasks.length} icon={ClipboardList} tone="info" />
        <StatCard title="In progress" value={stats.inProgressTasks || 0} icon={LoaderCircle} tone="warning" />
        <StatCard title="Overdue" value={stats.overdueTasks || 0} icon={AlertTriangle} tone="danger" />
      </div>

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
                    <small>{task.project?.name} · {formatDate(task.dueDate)}</small>
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
                    <small>{project.completedTasks || project.done || 0}/{project.totalTasks || project.total || 0} tasks complete</small>
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
    </section>
  );
}

function ProjectsView({ user, projects, tasks, onCreate, onEdit, onDelete, onOpen }) {
  return (
    <section className="view">
      <Topbar
        title="Projects"
        subtitle={user.role === "ADMIN" ? "Create projects, assign team members, and track delivery health." : "Projects you are part of or have assigned work in."}
        action={user.role === "ADMIN" && <Button icon={Plus} onClick={onCreate}>New project</Button>}
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

function ProjectDetailView({ user, project, tasks, onBack, onCreateTask, onEditProject, onDeleteProject, onEditTask, onDeleteTask, onStatus, onViewDetail, onMarkDone }) {
  const [filter, setFilter] = useState("ALL");
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
          <div className="filter-pills">
            {["ALL", "TODO", "IN_PROGRESS", "DONE", "OVERDUE"].map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                {item === "ALL" ? "All" : item.replace("_", " ").toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length ? (
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
        )}
      </section>
    </section>
  );
}

function TasksView({ user, tasks, projects, onCreate, onEdit, onDelete, onStatus, onViewDetail, onMarkDone }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");

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

  return (
    <section className="view">
      <Topbar
        title={user.role === "ADMIN" ? "Tasks" : "My tasks"}
        subtitle={user.role === "ADMIN" ? "Assign work, update status, and keep deadlines visible." : "Update your status and track assigned deliverables."}
        action={<Button icon={Plus} onClick={() => onCreate()}>New task</Button>}
      />

      <div className="toolbar">
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="ALL">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>

      {visibleTasks.length ? (
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
      )}
    </section>
  );
}

function TeamView({ users, tasks, projects, currentUser, onRoleChange, onDeleteUser }) {
  return (
    <section className="view">
      <Topbar
        title="Team"
        subtitle="Manage roles and understand how work is distributed."
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
                  <SelectField label="Role" value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value)}>
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
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState({ dashboard: null, projects: [], tasks: [], users: [] });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [completionModal, setCompletionModal] = useState(null);
  const [taskDetailModal, setTaskDetailModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const user = session?.user;
  const selectedProject = selectedProjectId
    ? data.projects.find((project) => project.id === selectedProjectId)
    : null;

  useEffect(() => {
    if (session?.token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
      window.history.replaceState(null, "", session.user.role === "ADMIN" ? "/admin" : "/member");
    } else {
      delete api.defaults.headers.common.Authorization;
      window.history.replaceState(null, "", "/");
    }
  }, [session]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
    setData({ dashboard: null, projects: [], tasks: [], users: [] });
    setView("dashboard");
    setSelectedProjectId(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setNotice("");

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
      setNotice(err.response?.data?.error || "Could not load workspace data");
    } finally {
      setLoading(false);
    }
  }, [logout, session]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  function handleAuth(nextSession) {
    setSession(nextSession);
  }

  function navigate(nextView) {
    setView(nextView);
    if (nextView !== "project-detail") setSelectedProjectId(null);
  }

  function openProject(project) {
    if (!project) return;
    setSelectedProjectId(project.id);
    setView("project-detail");
  }

  function startTask(project) {
    if (!project && data.projects.length === 0) {
      if (user.role === "ADMIN") {
        setNotice("Create a project first, then add tasks inside it.");
        setProjectModal({});
      } else {
        setNotice("No project is assigned to you yet. Ask an admin to add you to a project before creating tasks.");
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
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not save project");
    }
  }

  async function deleteProject(id) {
    if (!window.confirm("Delete this project and all of its tasks?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setSelectedProjectId(null);
      setView("projects");
      await loadData();
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not delete project");
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
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not save task");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      await loadData();
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not delete task");
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      await loadData();
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not update task status");
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
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not mark task as done");
    }
  }

  async function addComment(id, content, type) {
    try {
      await api.post(`/tasks/${id}/comments`, { content, type });
      await loadData();
      
      // Update the open detail modal with the new comments without waiting for the full re-render
      if (taskDetailModal && taskDetailModal.id === id) {
         api.get('/tasks').then(res => {
            const updatedTask = res.data.find(t => t.id === id);
            if(updatedTask) setTaskDetailModal(updatedTask);
         });
      }
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not add comment");
    }
  }

  function openTaskDetail(task) {
    // If we only have basic info, fetch fresh to get full comments
    api.get('/tasks').then(res => {
        const fullTask = res.data.find(t => t.id === task.id);
        if(fullTask) setTaskDetailModal(fullTask);
    }).catch(() => setTaskDetailModal(task));
  }

  async function updateRole(id, role) {
    try {
      await api.patch(`/users/${id}/role`, { role });
      await loadData();
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not update role");
    }
  }

  async function deleteUser(id, name) {
    if (!window.confirm(`Remove "${name}" from the team? Their tasks will be unassigned and they will lose access.`)) return;
    try {
      await api.delete(`/users/${id}`);
      await loadData();
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not remove team member");
    }
  }

  if (!session || !user) return <AuthScreen onAuth={handleAuth} />;

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
      />
    );
  })();

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        view={view}
        projects={data.projects}
        onNavigate={navigate}
        onOpenProject={openProject}
        onLogout={logout}
      />

      <main className="workspace">
        {notice && (
          <div className="notice">
            <AlertTriangle size={17} />
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button>
          </div>
        )}
        {loading && <div className="loading-line" />}
        {content}
      </main>

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
    </div>
  );
}
