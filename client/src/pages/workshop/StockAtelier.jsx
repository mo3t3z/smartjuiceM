import { useNavigate } from "react-router-dom";
import "./StockAtelier.css";

export default function StockAtelier() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const cards = [
    {
      icon: "MP",
      title: "Consulter Stock MP",
      description: "Visualiser le stock actuel des matières premières disponibles en atelier.",
      path: "/workshop/stock/mp",
      color: "purple",
    },
    {
      icon: "PF",
      title: "Consulter Stock PF Atelier",
      description: "Visualiser le stock actuel des produits finis fabriqués en atelier.",
      path: "/workshop/stock/pf",
      color: "green",
    },
  ];

  return (
    <div className="sa-page">
      {/* Header */}
      <header className="sa-header">
        <div className="sa-brand">
          <span className="sa-logo-icon">SJ</span>
          <div>
            <h1 className="sa-brand-name">SmartJuice</h1>
            <p className="sa-brand-sub">Interface Atelier</p>
          </div>
        </div>
        <div className="sa-header-right">
          <div className="sa-user-info">
            <span className="sa-user-avatar">{user?.email?.[0]?.toUpperCase() || "A"}</span>
            <span className="sa-user-email">{user?.email}</span>
          </div>
          <button className="sa-back-btn" onClick={() => navigate("/workshop")}>
            ← Retour
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="sa-welcome">
        <div className="sa-welcome-icon">Stock</div>
        <h2 className="sa-welcome-title">Consulter Stock Atelier</h2>
        <p className="sa-welcome-sub">Choisissez le type de stock à consulter</p>
      </div>

      {/* Cards */}
      <div className="sa-cards">
        {cards.map((card) => (
          <button
            key={card.path}
            className={`sa-card sa-card--${card.color}`}
            onClick={() => navigate(card.path)}
          >
            <span className="sa-card-icon">{card.icon}</span>
            <h3 className="sa-card-title">{card.title}</h3>
            <p className="sa-card-desc">{card.description}</p>
            <span className="sa-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
