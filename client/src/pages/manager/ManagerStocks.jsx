import { useNavigate } from "react-router-dom";
import "./ManagerStocks.css";

export default function ManagerStocks() {
  const navigate = useNavigate();

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

      {/* Welcome banner */}
      <div className="ms-welcome">
        <h2 className="ms-welcome-title">Consulter Stocks</h2>
        <p className="ms-welcome-sub">Choisissez le type de stock à consulter</p>
      </div>

      <div className="ms-cards">
        {cards.map((card) => (
          <button
            key={card.path}
            className={`ms-card ms-card--${card.color}`}
            onClick={() => navigate(card.path)}
          >
            <h3 className="ms-card-title">{card.title}</h3>
            <p className="ms-card-desc">{card.description}</p>
            <span className="ms-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
