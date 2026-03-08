import { useNavigate } from "react-router-dom";
import "./ManagerHome.css";

export default function ManagerHome() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const actions = [
    {
      icon: "🛒",
      title: "Gestion des Produits",
      description: "Ajouter, modifier et supprimer les produits du catalogue SmartJuice.",
      path: "/manager/products",
      color: "orange",
    },
    {
      icon: "👥",
      title: "Gérer les Comptes",
      description: "Créer et administrer les comptes vendeurs et ateliers.",
      path: "/manager/accounts",
      color: "blue",
    },
    {
      icon: "👤",
      title: "Mon Compte",
      description: "Consulter vos informations personnelles et changer votre mot de passe.",
      path: "/manager/account",
      color: "green",
    },
  ];

  return (
    <div className="mh-page">
      {/* Header */}
      <header className="mh-header">
        <div className="mh-brand">
          <span className="mh-logo-icon">🍊</span>
          <div>
            <h1 className="mh-brand-name">SmartJuice</h1>
            <p className="mh-brand-sub">Interface Gérant</p>
          </div>
        </div>
        <div className="mh-header-right">
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
