import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

const empty = {
  name: "", sku: "", description: "", quantity_on_hand: "0",
  cost_price: "", selling_price: "", low_stock_threshold: "",
};

const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

export default function ProductForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!editing) return;
    api.getProduct(id)
      .then((p) =>
        setForm({
          name: p.name, sku: p.sku, description: p.description ?? "",
          quantity_on_hand: String(p.quantity_on_hand),
          cost_price: p.cost_price ?? "", selling_price: p.selling_price ?? "",
          low_stock_threshold: p.low_stock_threshold == null ? "" : String(Math.max(p.low_stock_threshold, 5)),
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description.trim() || null,
      quantity_on_hand: Number(form.quantity_on_hand || 0),
      cost_price: numOrNull(form.cost_price),
      selling_price: numOrNull(form.selling_price),
      low_stock_threshold: numOrNull(form.low_stock_threshold),
    };
    try {
      if (editing) await api.updateProduct(id, payload);
      else await api.createProduct(payload);
      navigate("/products");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2>{editing ? "Edit product" : "New product"}</h2>
      <form className="card form" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <div className="grid2">
          <label>Name *<input required value={form.name} onChange={set("name")} /></label>
          <label>SKU * <input required value={form.sku} onChange={set("sku")} /></label>
        </div>
        <label>Description<textarea rows={3} value={form.description} onChange={set("description")} /></label>
        <div className="grid2">
          <label>Quantity on hand *<input type="number" min="0" step="1" required value={form.quantity_on_hand} onChange={set("quantity_on_hand")} /></label>
          <label>Low stock threshold
            <input type="number" min="5" step="1" placeholder="Uses default from Settings" value={form.low_stock_threshold} onChange={set("low_stock_threshold")} />
          </label>
          <label>Cost price<input type="number" min="0" step="0.01" value={form.cost_price} onChange={set("cost_price")} /></label>
          <label>Selling price<input type="number" min="0" step="0.01" value={form.selling_price} onChange={set("selling_price")} /></label>
        </div>
        <div className="row">
          <Link className="btn" to="/products">Cancel</Link>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
        </div>
      </form>
    </>
  );
}
