import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const money = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" }));

export default function Products() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [adjust, setAdjust] = useState(null); // { product, delta, note }

  const load = (query = q) =>
    api.listProducts(query).then(setProducts).catch((e) => setError(e.message));

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}" (${p.sku})? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(p.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.adjustStock(adjust.product.id, { delta: Number(adjust.delta), note: adjust.note || null });
      setAdjust(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="row">
        <h2>Products</h2>
        <Link className="btn btn-primary" to="/products/new">+ Add product</Link>
      </div>
      <input className="search" placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="alert">{error}</div>}

      <div className="card">
        {!products ? <p className="muted">Loading…</p> : products.length === 0 ? (
          <p className="muted">{q ? "No products match your search." : "No products yet."}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>SKU</th><th className="num">Quantity</th><th>Status</th><th className="num">Selling price</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                    <td>{p.sku}</td>
                    <td className="num">{p.quantity_on_hand}</td>
                    <td>{p.is_low_stock ? <span className="badge badge-low">Low stock</span> : <span className="badge badge-ok">In stock</span>}</td>
                    <td className="num">{money(p.selling_price)}</td>
                    <td className="actions">
                      <button className="btn btn-small" onClick={() => setAdjust({ product: p, delta: "", note: "" })}>± Stock</button>
                      <Link className="btn btn-small" to={`/products/${p.id}`}>Edit</Link>
                      <button className="btn btn-small btn-danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjust && (
        <div className="modal-backdrop" onClick={() => setAdjust(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submitAdjust}>
            <h3>Adjust stock</h3>
            <p className="muted">{adjust.product.name} · currently {adjust.product.quantity_on_hand} units</p>
            <label>Change (+/- units)
              <input type="number" required autoFocus step="1" placeholder="e.g. 10 or -3" value={adjust.delta}
                onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} />
            </label>
            <label>Note (optional)
              <input value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
            </label>
            <div className="row">
              <button type="button" className="btn" onClick={() => setAdjust(null)}>Cancel</button>
              <button className="btn btn-primary">Apply</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
