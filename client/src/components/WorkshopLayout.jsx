import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { API_WORKSHOP as API, authHeader } from "../utils/api";
import "./ManagerLayout.css";

export default function WorkshopLayout() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, { headers: authHeader() });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silencieux */ }
  };

  const marquerToutesLues = async () => {
    try {
      await fetch(`${API}/notifications/lues`, { method: "PUT", headers: authHeader() });
      setNotifications((prev) => prev.map((n) => ({ ...n, luAtelier: true })));
    } catch { /* silencieux */ }
  };

  const marquerLue = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/lire`, { method: "PUT", headers: authHeader() });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, luAtelier: true } : n));
    } catch { /* silencieux */ }
  };

  const nonLues = notifications.filter((n) => !n.luAtelier).length;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navItems = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      ),
      label: "Matières Premières",
      path: "/workshop/matieres-premieres",
      color: "purple",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
      ),
      label: "Gérer la Recette",
      path: "/workshop/recettes",
      color: "red",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: "Quantité à Produire",
      path: "/workshop/quantite-produire",
      color: "orange",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      ),
      label: "Transfert Boutique",
      path: "/workshop/transfert-boutique",
      color: "blue",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      label: "Stock Atelier",
      path: "/workshop/stock",
      color: "green",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
      label: "Commandes à Préparer",
      path: "/workshop/commandes-confirmees",
      color: "teal",
    },
  ];

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <div className="ml-layout">
      {/* ── Sidebar ── */}
      <aside className="ml-sidebar">
        {/* Brand */}
        <div className="ml-brand" onClick={() => navigate("/workshop")}>
          <span className="ml-logo-icon">SJ</span>
          <div>
            <span className="ml-brand-name">SmartJuice</span>
            <span className="ml-brand-sub">Interface Atelier</span>
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
          {/* Notifications */}
          <div className="ml-notif-wrapper" ref={notifRef}>
            <button
              className="ml-notif-btn"
              onClick={() => setShowNotifs((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>Notifications</span>
              {nonLues > 0 && <span className="ml-notif-badge">{nonLues}</span>}
            </button>

            {showNotifs && (
              <div className="ml-notif-panel">
                <div className="ml-notif-panel-header">
                  <span>Notifications</span>
                  {nonLues > 0 && (
                    <button className="ml-notif-lire-tout" onClick={marquerToutesLues}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="ml-notif-empty">Aucune notification.</p>
                ) : (
                  <ul className="ml-notif-list">
                    {notifications.map((n) => (
                      <li
                        key={n._id}
                        className={`ml-notif-item${n.luAtelier ? " ml-notif-item--lu" : ""}`}
                        onClick={() => !n.luAtelier && marquerLue(n._id)}
                      >
                        <span className="ml-notif-icon-cat">!</span>
                        <div className="ml-notif-body">
                          <p className="ml-notif-msg">{n.message}</p>
                          <span className="ml-notif-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {!n.luAtelier && <span className="ml-notif-dot" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* User */}
          <div className="ml-user">
            <span className="ml-user-avatar">{user?.email?.[0]?.toUpperCase() || "A"}</span>
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
