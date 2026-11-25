import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", confirm: "", organization_name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
        organization_name: form.organization_name,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>📦 StockFlow</h1>
        <p className="muted">Create your account</p>
        {error && <div className="alert">{error}</div>}
        <label>Organization name
          <input required placeholder="My Test Store" value={form.organization_name} onChange={set("organization_name")} />
        </label>
        <label>Email
          <input type="email" required value={form.email} onChange={set("email")} />
        </label>
        <label>Password
          <input type="password" required minLength={8} value={form.password} onChange={set("password")} />
        </label>
        <label>Confirm password
          <input type="password" required value={form.confirm} onChange={set("confirm")} />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Sign up"}</button>
        <p className="muted small">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
