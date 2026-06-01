import "../manager/ManagerHome.css";

export default function SellerHome() {
  return (
    <div className="mh-welcome-page">
      <div className="mh-welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
      <h2 className="mh-welcome-title">Bonjour, Vendeur</h2>
      <p className="mh-welcome-sub">Sélectionnez une section dans le menu à gauche pour commencer.</p>
    </div>
  );
}
