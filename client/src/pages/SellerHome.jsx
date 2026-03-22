import { useNavigate } from "react-router-dom";
import "./SellerHome.css";

export default function SellerHome() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const actions = [
    {
      icon: "PF",
      title: "Stock de PF du Boutique",
      description: "Consulter le stock de produits finis disponibles en boutique.",
      path: "/seller/stock-pf",
      color: "green",
    },
  ];

  return (
    <div className="sh-page">
      <header className="sh-header">
        <div className="sh-brand">
          <span className="sh-logo-icon">SJ</span>
          <div>
            <h1 className="sh-brand-name">SmartJuice</h1>
            <p className="sh-brand-sub">Interface Vendeur</p>
          </div>
        </div>
        <div className="sh-header-right">
          <div className="sh-user-info">
            <span className="sh-user-avatar">{user?.email?.[0]?.toUpperCase() || "V"}</span>
            <span className="sh-user-email">{user?.email}</span>
          </div>
          <button className="sh-logout-btn" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <div className="sh-welcome">
        <h2 className="sh-welcome-title">Bonjour, Vendeur</h2>
        <p className="sh-welcome-sub">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>

      <div className="sh-cards">
        {actions.map((action) => (
          <button
            key={action.path}
            className={`sh-card sh-card--${action.color}`}
            onClick={() => navigate(action.path)}
          >
            <span className="sh-card-icon">{action.icon}</span>
            <h3 className="sh-card-title">{action.title}</h3>
            <p className="sh-card-desc">{action.description}</p>
            <span className="sh-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
