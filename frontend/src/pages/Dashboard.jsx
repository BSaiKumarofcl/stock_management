import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const number = (value) => Number(value || 0).toLocaleString();

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <p className="muted">Loading inventory…</p>;

  const healthyCount = Math.max(data.total_products - data.low_stock_count, 0);
  const health = data.total_products ? Math.round((healthyCount / data.total_products) * 100) : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Inventory overview</h2>
          <p>Keep track of your products and stock levels.</p>
        </div>
        <Link className="btn btn-primary" to="/products/new">＋ Add product</Link>
      </div>

      <div className="cards">
        <div className="card stat">
          <span className="stat-label">Total products</span>
          <strong>{number(data.total_products)}</strong>
          <span className="stat-foot">Products in your catalog</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Units on hand</span>
          <strong>{number(data.total_quantity)}</strong>
          <span className="stat-foot">Across all products</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Low stock items</span>
          <strong className={data.low_stock_count ? "danger" : "stat-accent"}>{number(data.low_stock_count)}</strong>
          <span className="stat-foot">{data.low_stock_count ? "Items need replenishing" : "Everything is well stocked"}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="panel-heading">
            <div>
              <h3>Low stock items</h3>
              <p>Products at or below their reorder threshold</p>
            </div>
            <Link className="btn btn-small" to="/products">View products <span aria-hidden="true">→</span></Link>
          </div>
          {data.low_stock_items.length === 0 ? (
            <div className="empty-state">
              <p>{data.total_products === 0
                ? <>Your inventory is ready to set up. <Link to="/products/new">Add your first product</Link>.</>
                : "No products are running low right now."}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>SKU</th><th className="num">In stock</th><th className="num">Threshold</th></tr>
                </thead>
                <tbody>
                  {data.low_stock_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="product-name" to={`/products/${item.id}`}>
                          <span className="product-icon" aria-hidden="true">▦</span>
                          <span>{item.name}</span>
                        </Link>
                      </td>
                      <td className="sku">{item.sku}</td>
                      <td className="num"><span className="badge badge-low">{number(item.quantity_on_hand)} left</span></td>
                      <td className="num">{number(item.low_stock_threshold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card health-panel">
          <div className="panel-heading">
            <div>
              <h3>Stock health</h3>
              <p>Products meeting their stock threshold</p>
            </div>
          </div>
          <div className="health-content">
            <div className="health-ring" style={{ "--health": `${health}%` }} role="img" aria-label={`${health}% of products are in stock`}>
              <div className="health-ring-inner">
                <strong>{health}%</strong>
                <span>in stock</span>
              </div>
            </div>
            <div className="health-legend">
              <div><span className="legend-dot" /><span><strong>{number(healthyCount)}</strong>Healthy</span></div>
              <div><span className="legend-dot low" /><span><strong>{number(data.low_stock_count)}</strong>Low stock</span></div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
