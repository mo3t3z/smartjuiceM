import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./ManagerLayout.css";

export default function SellerLayout() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navItems = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      label: "Nouvelle Vente",
      path: "/seller/nouvelle-vente",
      color: "green",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
      ),
      label: "Nouvelle Commande",
      path: "/seller/nouvelle-commande",
      color: "blue",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      label: "Stock Boutique",
      path: "/seller/stock-pf",
      color: "orange",
    },
  ];

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <div className="ml-layout">
      {/* ── Sidebar ── */}
      <aside className="ml-sidebar">
        {/* Brand */}
        <div className="ml-brand" onClick={() => navigate("/seller")}>
          <div>
            <span className="ml-brand-name">SmartJuice</span>
            <span className="ml-brand-sub">Interface Vendeur</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="ml-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`ml-nav-item ml-nav--${item.color}${isActive(item.path) ? " ml-nav--active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="ml-nav-icon">{item.icon}</span>
              <span className="ml-nav-label">{item.label}</span>
              <span className="ml-nav-arrow">›</span>
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="ml-sidebar-bottom">
          {/* User */}
          <div className="ml-user">
            <span className="ml-user-avatar">{user?.email?.[0]?.toUpperCase() || "V"}</span>
            <span className="ml-user-email">{user?.email}</span>
          </div>

          {/* Logout */}
          <button className="ml-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="ml-content">
        <Outlet />
      </main>
    </div>
  );
}
