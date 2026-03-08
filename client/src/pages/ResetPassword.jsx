import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Validation
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
      
      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        navigate('/login-client');
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h1>Nouveau mot de passe</h1>
        <p className="subtitle">
          Entrez votre nouveau mot de passe ci-dessous
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
              required
            />
          </div>

          {message && (
            <div className="success-message">
              ✅ {message}
              <br />
              <small>Redirection vers la page de connexion...</small>
            </div>
          )}
          {error && <div className="error-message">❌ {error}</div>}

          <button type="submit" disabled={loading || message}>
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
