import "../manager/ManagerHome.css";

export default function WorkshopHome() {
  return (
    <div className="mh-welcome-page">
      <div className="mh-welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      </div>
      <h2 className="mh-welcome-title">Bonjour, Atelier</h2>
      <p className="mh-welcome-sub">Sélectionnez une section dans le menu à gauche pour commencer.</p>
    </div>
  );
}
