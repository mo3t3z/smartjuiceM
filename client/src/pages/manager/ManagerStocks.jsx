import { useNavigate } from "react-router-dom";
import "./ManagerStocks.css";

export default function ManagerStocks() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const cards = [
    {
      icon: "MP",
      title: "Consulter Stock MP",
      description: "Visualiser le stock actuel des matières premières disponibles en atelier.",
      path: "/manager/stocks/mp",
      color: "purple",
    },
    {
      icon: "PF",
      title: "Consulter Stock PF",
      description: "Visualiser le stock actuel des produits finis fabriqués en atelier.",
      path: "/manager/stocks/pf",
      color: "green",
    },
    {
      icon: "Bout",
      title: "Consulter Stock PF Boutique",
      description: "Visualiser le stock des produits finis disponibles en boutique.",
      path: "/manager/stocks/boutique",
      color: "teal",
    },
  ];

  return (
    <div className="ms-page">
      {/* Header */}
      <header className="ms-header">
        <div className="ms-brand">
          <span className="ms-logo-icon">SJ</span>
          <div>
            <h1 className="ms-brand-name">SmartJuice</h1>
            <p className="ms-brand-sub">Interface Gérant</p>
          </div>
        </div>
        <div className="ms-header-right">
          <div className="ms-user-info">
            <span className="ms-user-avatar">{user?.email?.[0]?.toUpperCase() || "G"}</span>
            <span className="ms-user-email">{user?.email}</span>
          </div>
          <button className="ms-back-btn" onClick={() => navigate("/manager")}>
            ← Retour
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="ms-welcome">
        <div className="ms-welcome-icon">Stock</div>
        <h2 className="ms-welcome-title">Consulter Stocks</h2>
        <p className="ms-welcome-sub">Choisissez le type de stock à consulter</p>
      </div>

      {/* Cards */}
      <div className="ms-cards">
        {cards.map((card) => (
          <button
            key={card.path}
            className={`ms-card ms-card--${card.color}`}
            onClick={() => navigate(card.path)}
          >
            <span className="ms-card-icon">{card.icon}</span>
            <h3 className="ms-card-title">{card.title}</h3>
            <p className="ms-card-desc">{card.description}</p>
            <span className="ms-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
