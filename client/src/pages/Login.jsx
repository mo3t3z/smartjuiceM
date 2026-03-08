  import { useState } from "react";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";
  import "./Login.css";

  export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false); // ✅ PB23 : afficher/masquer mot de passe
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false); // ✅ UX : état de chargement

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

        const res = await axios.post("http://localhost:5000/api/auth/login", {
          email,
          password,
        });

        // Sauvegarde token et user
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Redirection selon le rôle
        const { role } = res.data.user;

        if (role === "manager") navigate("/manager");
        else if (role === "seller") navigate("/seller");
        else if (role === "workshop") navigate("/workshop");
      } catch (err) {
        setError(err.response?.data?.message || "Erreur de connexion");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="sj-login-page">
        {/* Header style SmartJuice */}
        <header className="sj-topbar">
          <div className="sj-topbar-left">
            <div className="sj-brand">SmartJuice</div>
            <div className="sj-subtitle">SYSTÈME DE GESTION - CONNEXION</div>
          </div>
          <div className="sj-topbar-right">
            <span className="sj-pill">Accès sécurisé</span>
          </div>
        </header>

        {/* Content */}
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
                    type={showPassword ? "text" : "password"} // PB23 toggle
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="sj-btn-secondary"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

              <button className="sj-btn-primary" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>

              <div className="sj-security-box">
                <div className="sj-security-bar" />
                <div className="sj-security-text">
                  <div>Identifiant personnel sécurisé</div>
                  <div>Session authentifiée et cryptée</div>
                </div>
              </div>
            </form>
          </section>
        </main>
      </div>
    );
  }