import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./WorkshopHome.css";
import { API_WORKSHOP as API, authHeader } from "../utils/api";

export default function WorkshopHome() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fermer le panneau si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marquerToutesLues = async () => {
    try {
      await fetch(`${API}/notifications/lues`, {
        method: "PUT",
        headers: authHeader(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, luAtelier: true })));
    } catch {
      // silencieux
    }
  };

  const marquerLue = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/lire`, {
        method: "PUT",
        headers: authHeader(),
      });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, luAtelier: true } : n));
    } catch {
      // silencieux
    }
  };

  const nonLues = notifications.filter((n) => !n.luAtelier).length;

  const actions = [
    {
      icon: "MP",
      title: "Enregistrer Matière Première",
      description: "Saisir et enregistrer les matières premières reçues pour la production.",
      path: "/workshop/matieres-premieres",
      color: "purple",
    },
    {
      icon: "Rec",
      title: "Gérer la Recette",
      description: "Créer, modifier et supprimer les recettes de jus (ingrédients pour 1 litre).",
      path: "/workshop/recettes",
      color: "red",
    },
    {
      icon: "Prod",
      title: "Enregistrer Quantité à Produire",
      description: "Indiquer la quantité de jus à produire. Le stock MP est déduit automatiquement.",
      path: "/workshop/quantite-produire",
      color: "orange",
    },
    {
      icon: "Trans",
      title: "Enregistrer Quantité à Transférer",
      description: "Enregistrer les quantités de produits finis à envoyer vers la boutique.",
      path: "/workshop/transfert-boutique",
      color: "blue",
    },
    {
      icon: "Stock",
      title: "Consulter Stock Atelier",
      description: "Visualiser l'état actuel du stock de l'atelier (matières et produits finis).",
      path: "/workshop/stock",
      color: "green",
    },
    {
      icon: "CMD",
      title: "Commandes à Préparer",
      description: "Consulter les commandes confirmées et les mettre en préparation.",
      path: "/workshop/commandes-confirmees",
      color: "teal",
    },
  ];

  return (
    <div className="wh-page">
      {/* Header */}
      <header className="wh-header">
        <div className="wh-brand">
          <span className="wh-logo-icon">SJ</span>
          <div>
            <h1 className="wh-brand-name">SmartJuice</h1>
            <p className="wh-brand-sub">Interface Atelier</p>
          </div>
        </div>
        <div className="wh-header-right">
          {/* Cloche de notifications */}
          <div className="wh-notif-wrapper" ref={notifRef}>
            <button
              className="wh-notif-btn"
              onClick={() => setShowNotifs((v) => !v)}
              title="Notifications"
            >
              <span className="wh-notif-icon">🔔</span>
              {nonLues > 0 && (
                <span className="wh-notif-badge">{nonLues}</span>
              )}
            </button>

            {showNotifs && (
              <div className="wh-notif-panel">
                <div className="wh-notif-panel-header">
                  <span className="wh-notif-panel-title">Notifications</span>
                  {nonLues > 0 && (
                    <button className="wh-notif-lire-tout" onClick={marquerToutesLues}>
                      Tout marquer lu
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="wh-notif-empty">Aucune notification.</p>
                ) : (
                  <ul className="wh-notif-list">
                    {notifications.map((n) => (
                      <li
                        key={n._id}
                        className={`wh-notif-item${n.luAtelier ? " wh-notif-item--lu" : ""}`}
                        onClick={() => !n.luAtelier && marquerLue(n._id)}
                      >
                        <span className="wh-notif-item-icon">!</span>
                        <div className="wh-notif-item-body">
                          <p className="wh-notif-item-msg">{n.message}</p>
                          <span className="wh-notif-item-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {!n.luAtelier && <span className="wh-notif-dot" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="wh-user-info">
            <span className="wh-user-avatar">{user?.email?.[0]?.toUpperCase() || "A"}</span>
            <span className="wh-user-email">{user?.email}</span>
          </div>
          <button className="wh-logout-btn" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="wh-welcome">
        <h2 className="wh-welcome-title">Bonjour, Atelier</h2>
        <p className="wh-welcome-sub">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>

      {/* Action cards */}
      <div className="wh-cards">
        {actions.map((action) => (
          <button
            key={action.path}
            className={`wh-card wh-card--${action.color}`}
            onClick={() => navigate(action.path)}
          >
            <span className="wh-card-icon">{action.icon}</span>
            <h3 className="wh-card-title">{action.title}</h3>
            <p className="wh-card-desc">{action.description}</p>
            <span className="wh-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
