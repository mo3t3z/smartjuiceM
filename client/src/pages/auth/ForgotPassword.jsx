import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';
import { API_AUTH } from '../../utils/api';

export default function ForgotPassword({ source = 'client', backLink = '/login-client' }) {
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
//preventdefault: empeche rechargement de la  page lorsque l'utilisateur soumet le formulaire de connexion
  const handleSubmit = async (e) => {
    e.preventDefault();
    //si l'utilisateur a eu une erreur et réessaie, on efface l'ancien message
    setMessage('');
    setError('');
    setLoading(true);
    //envoyer request
    try {
      const response = await axios.post(
        `${API_AUTH}/request-password-reset`,
        { email, source }
      );
      setMessage(response.data.message);//afficher message de succée 
      setEmail('');//vider champ mail aprés sucées
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

      {/* Header identique au catalogue */}
      <header className="fp-header">
        <span className="fp-logo-name">SmartJuice</span>
      </header>

      <div className="fp-body">
        <div className="forgot-password-box">

          {/* Icône cadenas */}
          <div className="fp-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h1>Mot de passe oublié ?</h1>
          <p className="subtitle">
            Entrez votre email et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            {message && <div className="success-message">{message}</div>}
            {error   && <div className="error-message">{error}</div>}

            <button type="submit" className="fp-submit-btn" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
          </form>

          <a href={backLink} className="back-link">← Retour à la connexion</a>
        </div>
      </div>

    </div>
  );
}
