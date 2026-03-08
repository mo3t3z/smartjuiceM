import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
