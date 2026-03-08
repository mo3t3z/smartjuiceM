import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./LoginClient.css";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
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

      // Rediriger vers le catalogue
      navigate("/");
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
                {showPassword ? "�" : "🔒"}
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
            <Link to="/register-client" className="register-link">
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
