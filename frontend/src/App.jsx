import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import AdminPanel from "./AdminPanel";
import MemberPanel from "./MemberPanel";
import { API, C, ADMIN_ACCENT, MEMBER_ACCENT, Input, Select, Btn } from "./shared";

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "MEMBER" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const res = await axios.post(`${API}${endpoint}`, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      // Redirect based on role
      window.location.href = res.data.user.role === "ADMIN" ? "/admin" : "/member";
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.bg} 0%, #1a1a3e 50%, ${C.bg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${ADMIN_ACCENT}, ${MEMBER_ACCENT})`, borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16, boxShadow: `0 8px 32px ${ADMIN_ACCENT}44` }}>⚡</div>
          <h1 style={{ color: C.text, margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>TeamHub</h1>
          <p style={{ color: C.textMuted, margin: "8px 0 0", fontSize: 15 }}>Task management for modern teams</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h2 style={{ color: C.text, margin: "0 0 24px", fontSize: 20, fontWeight: 700, textAlign: "center" }}>{isLogin ? "Sign In" : "Create Account"}</h2>
          <form onSubmit={handleSubmit}>
            {!isLogin && <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />}
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            {!isLogin && (
              <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="MEMBER">👤 Member</option>
                <option value="ADMIN">👑 Admin</option>
              </Select>
            )}
            {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}
            <Btn type="submit" style={{ width: "100%", padding: "12px 20px", fontSize: 15, borderRadius: 10, background: `linear-gradient(135deg, ${ADMIN_ACCENT}, ${MEMBER_ACCENT})` }}>{isLogin ? "Sign In" : "Create Account"}</Btn>
          </form>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }} style={{ background: "none", border: "none", color: MEMBER_ACCENT, cursor: "pointer", fontSize: 13 }}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: C.surface, border: `1px solid ${ADMIN_ACCENT}33`, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>👑</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ADMIN_ACCENT, marginBottom: 2 }}>ADMIN</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Full control over projects, tasks & team</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${MEMBER_ACCENT}33`, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>👤</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: MEMBER_ACCENT, marginBottom: 2 }}>MEMBER</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>View tasks, update status & track progress</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
  if (!token || !user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/member"} replace />;
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin/*" element={<ProtectedRoute requiredRole="ADMIN"><AdminPanel /></ProtectedRoute>} />
        <Route path="/member/*" element={<ProtectedRoute requiredRole="MEMBER"><MemberPanel /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
