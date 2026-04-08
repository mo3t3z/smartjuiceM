import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [message, setMessage]             = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/reset-password',
        { token, newPassword }
      );
      setMessage(response.data.message);
      const userRole = response.data.role;
      setTimeout(() => {
        navigate(userRole === 'manager' ? '/login' : '/login-client');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">

      {/* Header identique au catalogue */}
      <header className="rp-header">
        <span className="rp-logo-name">SmartJuice</span>
      </header>

      <div className="rp-body">
        <div className="reset-password-box">

          {/* Icône clé */}
          <div className="rp-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>

          <h1>Nouveau mot de passe</h1>
          <p className="subtitle">Entrez votre nouveau mot de passe ci-dessous</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="rp-password-wrapper">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                />
                <button type="button" className="rp-eye-btn" onClick={() => setShowNew(v => !v)}>
                  {showNew ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <div className="rp-password-wrapper">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  required
                />
                <button type="button" className="rp-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {message && (
              <div className="success-message">
                {message}
                <small>Redirection vers la page de connexion...</small>
              </div>
            )}
            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="rp-submit-btn" disabled={loading || !!message}>
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>

          <a href="/login-client" className="back-link">← Retour à la connexion</a>
        </div>
      </div>

    </div>
  );
}
