import "./ManagerHome.css";

export default function ManagerHome() {
  return (
    <div className="mh-welcome-page">
      <div className="mh-welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <h2 className="mh-welcome-title">Bonjour, Gérant</h2>
      <p className="mh-welcome-sub">Sélectionnez une section dans le menu à gauche pour commencer.</p>
    </div>
  );
}
