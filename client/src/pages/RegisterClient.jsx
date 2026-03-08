import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./LoginClient.css";

export default function RegisterClient() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nom: "",
    prenom: "",
    telephone: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Veuillez remplir tous les champs obligatoires");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Veuillez entrer une adresse email valide");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/register-client", {
        email: formData.email,
        password: formData.password,
        nom: formData.nom,
        prenom: formData.prenom,
        telephone: formData.telephone
      });

      setSuccess("Compte créé avec succès ! Redirection vers la connexion...");
      
      // Redirection vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigate("/login-client");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création du compte");
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
          <h2>Inscription</h2>
          <p className="subtitle">Créez votre compte client</p>

          <form onSubmit={handleSubmit} className="login-client-form">
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                name="nom"
                type="text"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Nom"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prenom">Prénom</label>
              <input
                id="prenom"
                name="prenom"
                type="text"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Prénom"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="telephone">Téléphone</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="+216 12 345 678"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe *</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 caractères"
                autoComplete="new-password"
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Répétez votre mot de passe"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

            <button type="submit" className="login-button">
              Créer mon compte
            </button>
          </form>

          <div className="login-client-footer">
            <p>Vous avez déjà un compte ?</p>
            <Link to="/login-client" className="register-link">
              Se connecter
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
