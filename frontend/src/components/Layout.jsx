import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">▦</span>StockFlow</div>
        <nav>
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="user">
          <span className="user-avatar">{user.email?.charAt(0).toUpperCase()}</span>
          <span className="user-details">
            <strong>{user.organization_name}</strong>
            <span className="muted">{user.email}</span>
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
