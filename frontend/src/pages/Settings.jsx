import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Settings() {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => setValue(String(s.default_low_stock_threshold))).catch((e) => setError(e.message));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api.updateSettings({ default_low_stock_threshold: Number(value) });
      setMsg("Settings saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h2>Settings</h2>
      <form className="card form narrow" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        {msg && <div className="alert alert-ok">{msg}</div>}
        <label>Default low stock threshold
          <input type="number" min="5" step="1" required value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <p className="muted small">Minimum is 5. Stock strictly below a product’s effective threshold is marked low.</p>
        <button className="btn btn-primary">Save</button>
      </form>
    </>
  );
}
