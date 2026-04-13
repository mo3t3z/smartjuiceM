import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ManagerHome.css";

const API = "http://localhost:5000/api/manager";

export default function ManagerHome() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silencieux */ }
  };

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marquerToutesLues = async () => {
    try {
      await fetch(`${API}/notifications/lues`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, luManager: true })));
    } catch { /* silencieux */ }
  };

  const marquerLue = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/lire`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, luManager: true } : n));
    } catch { /* silencieux */ }
  };

  const nonLues = notifications.filter((n) => !n.luManager).length;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const actions = [
    {
      icon: "Prod",
      title: "Gestion des Produits",
      description: "Ajouter, modifier et supprimer les produits du catalogue SmartJuice.",
      path: "/manager/products",
      color: "orange",
    },
    {
      icon: "Comp",
      title: "Gérer les Comptes",
      description: "Créer et administrer les comptes vendeurs et ateliers.",
      path: "/manager/accounts",
      color: "blue",
    },
    {
      icon: "Moi",
      title: "Mon Compte",
      description: "Consulter vos informations personnelles et changer votre mot de passe.",
      path: "/manager/account",
      color: "green",
    },
    {
      icon: "Stock",
      title: "Consulter Stocks",
      description: "Visualiser le stock des matières premières, produits finis atelier et boutique.",
      path: "/manager/stocks",
      color: "teal",
    },
    {
      icon: "CMD",
      title: "Gestion des Commandes",
      description: "Valider, refuser ou suivre les commandes en ligne et physiques.",
      path: "/manager/commandes",
      color: "purple",
    },
    {
      icon: "Ventes",
      title: "Historique des Ventes",
      description: "Consulter l'historique complet des ventes réalisées en boutique.",
      path: "/manager/ventes",
      color: "red",
    },
  ];

  return (
    <div className="mh-page">
      {/* Header */}
      <header className="mh-header">
        <div className="mh-brand">
          <span className="mh-logo-icon">SJ</span>
          <div>
            <h1 className="mh-brand-name">SmartJuice</h1>
            <p className="mh-brand-sub">Interface Gérant</p>
          </div>
        </div>
        <div className="mh-header-right">
          {/* Cloche de notifications */}
          <div className="mh-notif-wrapper" ref={notifRef}>
            <button
              className="mh-notif-btn"
              onClick={() => setShowNotifs((v) => !v)}
              title="Notifications"
            >
              <span className="mh-notif-icon">🔔</span>
              {nonLues > 0 && <span className="mh-notif-badge">{nonLues}</span>}
            </button>

            {showNotifs && (
              <div className="mh-notif-panel">
                <div className="mh-notif-panel-header">
                  <span className="mh-notif-panel-title">Notifications</span>
                  {nonLues > 0 && (
                    <button className="mh-notif-lire-tout" onClick={marquerToutesLues}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="mh-notif-empty">Aucune notification.</p>
                ) : (
                  <ul className="mh-notif-list">
                    {notifications.map((n) => (
                      <li
                        key={n._id}
                        className={`mh-notif-item${n.luManager ? " mh-notif-item--lu" : ""}`}
                        onClick={() => !n.luManager && marquerLue(n._id)}
                      >
                        <span className="mh-notif-item-icon">
                          {n.categorie === "PF" ? "PF" : n.categorie === "COMMANDE" ? "CMD" : "!"}
                        </span>
                        <div className="mh-notif-item-body">
                          <p className="mh-notif-item-msg">{n.message}</p>
                          <span className="mh-notif-item-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {!n.luManager && <span className="mh-notif-dot" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mh-user-info">
            <span className="mh-user-avatar">{user?.email?.[0]?.toUpperCase() || "G"}</span>
            <span className="mh-user-email">{user?.email}</span>
          </div>
          <button className="mh-logout-btn" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="mh-welcome">
        <h2 className="mh-welcome-title">Bonjour, Gérant</h2>
        <p className="mh-welcome-sub">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>

      {/* Action cards */}
      <div className="mh-cards">
        {actions.map((action) => (
          <button
            key={action.path}
            className={`mh-card mh-card--${action.color}`}
            onClick={() => navigate(action.path)}
          >
            <span className="mh-card-icon">{action.icon}</span>
            <h3 className="mh-card-title">{action.title}</h3>
            <p className="mh-card-desc">{action.description}</p>
            <span className="mh-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
