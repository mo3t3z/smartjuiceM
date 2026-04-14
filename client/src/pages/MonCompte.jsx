import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MonCompte.css";
import { API_AUTH, authHeader } from "../utils/api";

export default function MonCompte() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

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
    <div className="manage-products-container">
      <div className="products-header">
        <button className="back-button" onClick={() => navigate("/manager")}>
          ← Retour
        </button>
        <h2>Mon Compte</h2>
        <div />
      </div>

      {message && <div className="message mc-message-success">{message}</div>}
      {error && <div className="message mc-message-error">{error}</div>}

      {/* Informations du compte */}
      <div className="product-form-card mc-card">
        <h3>Informations personnelles</h3>

        <div className="mc-profile-item">
          <p className="mc-profile-label">Adresse électronique</p>
          <p className="mc-profile-value">{user?.email}</p>
        </div>

        <div className="mc-profile-item">
          <p className="mc-profile-label">Rôle</p>
          <span className="role-badge">{user?.role}</span>
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
    </div>
  );
}
