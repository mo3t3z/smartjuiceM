import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MonCompte.css";
import { API_AUTH, API_COMMANDES, authHeader, getNbArticlesPanier } from "../utils/api";

export default function MonCompteClient() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [nbPanier, setNbPanier] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    setNbPanier(getNbArticlesPanier());
    if (user?.role === "client") fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_COMMANDES}/mes-notifications`, { headers: authHeader() });
      setNotifications(res.data);
    } catch { /* silencieux */ }
  };

  const marquerLue = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/mes-notifications/${id}/lue`, {}, { headers: authHeader() });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, lue: true } : n));
    } catch { /* silencieux */ }
  };

  const marquerToutesLues = async () => {
    try {
      await axios.put(`${API_COMMANDES}/mes-notifications/lues`, {}, { headers: authHeader() });
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch { /* silencieux */ }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login-client");
  };

  const nonLues = notifications.filter((n) => !n.lue).length;

  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    try {
      const res = await axios.put(
        `${API_AUTH}/change-password`,
        { oldPassword, newPassword },
        { headers: authHeader() }
      );
      setMessage(res.data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du changement de mot de passe");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="mcc-page">

      {/* ══════════════ HEADER ══════════════ */}
      <header className="mcc-header">
        <div className="mcc-logo" onClick={() => navigate("/")}>
          <span className="mcc-logo-name">SmartJuice</span>
          <span className="mcc-logo-sub">Jus naturels frais</span>
        </div>

        <button className="mcc-back-btn" onClick={() => navigate("/")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
          Retour au catalogue
        </button>

        <div className="mcc-header-right">
          {user ? (
            <div className="mcc-user-menu">
              <button className="mcc-icon-btn" title={user.email}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="mcc-icon-label">Mon compte</span>
              </button>
              <div className="mcc-dropdown">
                <button onClick={() => navigate("/client/account")}>Mes informations</button>
                <button onClick={() => navigate("/client/mes-commandes")}>Mes commandes</button>
                <button className="mcc-dropdown-logout" onClick={handleLogout}>Déconnexion</button>
              </div>
            </div>
          ) : (
            <button className="mcc-icon-btn" onClick={() => navigate("/login-client")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="mcc-icon-label">Connexion</span>
            </button>
          )}

          {user?.role === "client" && (
            <div className="mcc-notif-wrapper">
              <button className="mcc-icon-btn" onClick={() => setShowNotifs((v) => !v)} title="Notifications">
                <div className="mcc-notif-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {nonLues > 0 && <span className="mcc-notif-badge">{nonLues}</span>}
                </div>
                <span className="mcc-icon-label">Alertes</span>
              </button>

              {showNotifs && (
                <div className="mcc-notif-dropdown">
                  <div className="mcc-notif-dropdown-header">
                    <span>Notifications</span>
                    {nonLues > 0 && (
                      <button className="mcc-notif-lire-tout" onClick={marquerToutesLues}>Tout lire</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="mcc-notif-vide">Aucune notification.</p>
                  ) : (
                    <ul className="mcc-notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n._id}
                          className={`mcc-notif-item ${n.lue ? "mcc-notif-item--lue" : ""}`}
                          onClick={() => !n.lue && marquerLue(n._id)}
                        >
                          <p className="mcc-notif-msg">{n.message}</p>
                          <span className="mcc-notif-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {!n.lue && <span className="mcc-notif-dot" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <button className="mcc-cart-btn" onClick={() => navigate("/client/panier")} title="Mon panier">
            <div className="mcc-cart-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {nbPanier > 0 && <span className="mcc-cart-badge">{nbPanier}</span>}
            </div>
            <span className="mcc-icon-label">Panier</span>
          </button>
        </div>
      </header>

      {/* ══════════════ CONTENU ══════════════ */}
      <div className="mcc-content">
        <h1 className="mcc-title">Mon Compte</h1>

      {message && <div className="message mc-message-success">{message}</div>}
      {error && <div className="message mc-message-error">{error}</div>}

      {/* Informations du compte */}
      <div className="product-form-card mc-card">
        <h3>Informations personnelles</h3>

        {(user?.prenom || user?.nom) && (
          <div className="mc-profile-item">
            <p className="mc-profile-label">Nom complet</p>
            <p className="mc-profile-value">
              {[user?.prenom, user?.nom].filter(Boolean).join(" ")}
            </p>
          </div>
        )}

        <div className="mc-profile-item">
          <p className="mc-profile-label">Adresse électronique</p>
          <p className="mc-profile-value">{user?.email}</p>
        </div>

        <div className="mc-profile-item mc-profile-item-last">
          <p className="mc-profile-label">Mot de passe</p>
          <p className="mc-profile-value">••••••••</p>
        </div>

        {!showForm && (
          <button
            className="mc-change-btn"
            onClick={() => { setShowForm(true); setError(""); setMessage(""); }}
          >
            Changer votre mot de passe
          </button>
        )}
      </div>

      {/* Formulaire changement de mot de passe */}
      {showForm && (
        <div className="product-form-card mc-form-card">
          <h3>Changer votre mot de passe</h3>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Ancien mot de passe *</label>
              <div className="mc-password-wrapper">
                <input
                  type={showOld ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                />
                <button
                  type="button"
                  className="mc-eye-button"
                  onClick={() => setShowOld(!showOld)}
                  title={showOld ? "Masquer" : "Afficher"}
                >
                  {showOld ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe *</label>
              <div className="mc-password-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
                <button
                  type="button"
                  className="mc-eye-button"
                  onClick={() => setShowNew(!showNew)}
                  title={showNew ? "Masquer" : "Afficher"}
                >
                  {showNew ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirmer le nouveau mot de passe *</label>
              <div className="mc-password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répéter le nouveau mot de passe"
                />
                <button
                  type="button"
                  className="mc-eye-button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  title={showConfirm ? "Masquer" : "Afficher"}
                >
                  {showConfirm ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">Confirmer</button>
              <button type="button" className="cancel-button" onClick={handleCancel}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
      </div>{/* fin mcc-content */}
    </div>
  );
}
