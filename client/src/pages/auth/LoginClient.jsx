import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./LoginClient.css";
import { API_AUTH } from "../../utils/api";

export default function LoginClient() { 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate  = useNavigate();
  const location  = useLocation();//récupérer l'url d'où vient l'utilisateur
  const from      = location.state?.from || "/";
//preventdefault: empeche rechargement de la  page lorsque l'utilisateur soumet le formulaire de connexion
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");//effacer message d'erreur précédent

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
//envoyer request 
    try {
      const res = await axios.post(`${API_AUTH}/login`, {
        email,
        password,
      });

      const { token, user } = res.data;

      // Vérifier que c'est bien un client
      if (user.role !== "client") {
        setError("Accès réservé aux clients. Utilisez le portail employé.");
        return;
      }

      // Sauvegarder le token et les infos utilisateur
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      //essayer de trouver prenom sn nom sn email pour msg de bienvenue
      const prenom = user.prenom || user.nom || user.email;
      navigate(from, { state: { welcome: `Bonjour ${prenom} !` } });
    } catch (err) {
      setError(err.response?.data?.message || "Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="login-client-container">
      <div className="login-client-left">
        <div className="left-content">
          <h1>SmartJuice</h1>
          <p className="tagline">Des jus naturels pour une vie saine</p>
        </div>
      </div>

      <div className="login-client-right">
        <div className="login-form-wrapper">
          <h2>Connexion</h2>
          <p className="subtitle">Accédez à votre espace client</p>

          <form onSubmit={handleSubmit} className="login-client-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button">
              Se connecter
            </button>
          </form>

          <div className="forgot-password-wrapper">
            <Link to="/forgot-password" className="forgot-password-link">
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="login-client-footer">
            <p>Pas encore de compte ?</p>
            <Link to="/register-client" state={{ from }} className="register-link">
              Créer un compte client
            </Link>
            <Link to="/" className="back-link">
              ← Retour au catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
