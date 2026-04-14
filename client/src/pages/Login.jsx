import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { API_AUTH } from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Veuillez remplir email et mot de passe");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${API_AUTH}/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const { role } = res.data.user;

      if (role === "manager") navigate("/manager");
      else if (role === "seller") navigate("/seller");
      else if (role === "workshop") navigate("/workshop");
      else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Accès refusé. Ce portail est réservé au staff.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sj-login-page">
      <header className="sj-topbar">
        <div className="sj-topbar-left">
          <div className="sj-brand">SmartJuice</div>
          <div className="sj-subtitle">SYSTÈME DE GESTION - CONNEXION</div>
        </div>
        <div className="sj-topbar-right">
          <span className="sj-pill">Accès sécurisé</span>
        </div>
      </header>

      <main className="sj-login-content">
        <section className="sj-login-card">
          <div className="sj-card-title">
            <h2>Connexion</h2>
            <p>Accès Manager / Vendeur / Atelier</p>
          </div>

          {error && <div className="sj-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="sj-form">
            <div className="sj-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="ex: manager@smartjuice.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="sj-field">
              <label>Mot de passe</label>
              <div className="sj-password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="sj-eye-btn"
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

            <button className="sj-btn-primary" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <div className="sj-forgot-password">
              <a href="/forgot-password-staff">Mot de passe oublié ?</a>
            </div>


          </form>
        </section>
      </main>
    </div>
  );
}
