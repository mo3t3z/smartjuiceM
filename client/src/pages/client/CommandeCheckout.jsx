import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { getPanier, savePanier, authHeader, API_COMMANDES, SEUIL_REMISE, TAUX_REMISE, FRAIS_LIVRAISON, isPastDateTime } from "../../utils/api";
import "./CommandeCheckout.css";

export default function CommandeCheckout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const welcome   = location.state?.welcome || "";
  const [panier,  setPanier]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ texte: "", type: "" });

  const [date,    setDate]    = useState("");
  const [heure,   setHeure]   = useState("");
  const [mode,    setMode]    = useState("retrait"); // "retrait" | "livraison"
  const [adresse, setAdresse] = useState("");

  // Date minimum = aujourd'hui, maximum = dans 3 mois
  const today   = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client");
      return;
    }
    const p = getPanier();
    if (p.length === 0) {
      navigate("/client/panier");
      return;
    }
    setPanier(p);
  }, []);

  const prixTotal = () => panier.reduce((a, i) => a + i.prix * i.quantite, 0);
  const remise    = () => prixTotal() > SEUIL_REMISE ? prixTotal() * TAUX_REMISE : 0;
  const frais     = () => mode === "livraison" ? FRAIS_LIVRAISON : 0;
  const netAPayer = () => (prixTotal() - remise() + frais()).toFixed(3);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      setMessage({ texte: "Veuillez choisir une date.", type: "erreur" });
      return;
    }
    if (date < today || date > maxDate) {
      setMessage({ texte: "La date doit être comprise entre aujourd'hui et 3 mois à venir.", type: "erreur" });
      return;
    }
    if (!heure) {
      setMessage({ texte: "Veuillez choisir une heure.", type: "erreur" });
      return;
    }
    // Vérifier que la date+heure ne sont pas dans le passé
    if (isPastDateTime(date, heure)) {
      setMessage({ texte: "La date et l'heure choisies sont déjà passées.", type: "erreur" });
      return;
    }
    if (mode === "livraison" && !adresse.trim()) {
      setMessage({ texte: "Veuillez saisir votre adresse de livraison.", type: "erreur" });
      return;
    }

    setLoading(true);
    setMessage({ texte: "", type: "" });

    try {
      const produits = panier.map((item) => ({
        produitId: item.produitId,
        quantite:  item.quantite,
      }));

      await axios.post(
        API_COMMANDES,
        {
          produits,
          modeRemise: mode,
          adresseLivraison: adresse.trim(),
          telephoneLivraison: "",
          fraisLivraison: frais(),
          dateRetrait: date,
          heureRetrait: heure,
        },
        { headers: authHeader() }
      );

      savePanier([]);
      setMessage({ texte: "Commande passée avec succès !", type: "succes" });
      setTimeout(() => navigate("/client/mes-commandes"), 2000);
    } catch (err) {
      setMessage({
        texte: err.response?.data?.message || "Erreur lors de la commande.",
        type: "erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button className="checkout-back" onClick={() => navigate("/client/panier")}>
          ← Retour au panier
        </button>
        <h1 className="checkout-title">Finaliser la commande</h1>
        <div />
      </header>

      {welcome && (
        <div className="checkout-welcome">
          {welcome}
        </div>
      )}

      <div className="checkout-body">
        {/* ── Formulaire ── */}
        <form className="checkout-form" onSubmit={handleSubmit}>

          {message.texte && (
            <div className={`checkout-msg checkout-msg--${message.type}`}>
              {message.texte}
            </div>
          )}

          {/* Date */}
          <div className="checkout-section">
            <h2 className="checkout-section-title">Date souhaitée</h2>
            <input
              className="checkout-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Heure */}
          <div className="checkout-section">
            <h2 className="checkout-section-title">Heure souhaitée <span className="checkout-hint">(entre 09:00 et 17:00)</span></h2>
            <input
              className="checkout-input"
              type="time"
              min="09:00"
              max="17:00"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
              required
            />
          </div>

          {/* Mode de remise */}
          <div className="checkout-section">
            <h2 className="checkout-section-title">Mode de remise</h2>
            <div className="checkout-mode-options">
              <label className={`checkout-mode-option ${mode === "retrait" ? "checkout-mode-option--active" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  value="retrait"
                  checked={mode === "retrait"}
                  onChange={() => setMode("retrait")}
                />
                <div className="checkout-mode-content">
                  <span className="checkout-mode-label">Récupération</span>
                  <span className="checkout-mode-sub">Je récupère ma commande moi-même</span>
                </div>
              </label>

              <label className={`checkout-mode-option ${mode === "livraison" ? "checkout-mode-option--active" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  value="livraison"
                  checked={mode === "livraison"}
                  onChange={() => setMode("livraison")}
                />
                <div className="checkout-mode-content">
                  <span className="checkout-mode-label">Livraison à domicile <span className="checkout-frais">(+{FRAIS_LIVRAISON} DT)</span></span>
                  <span className="checkout-mode-sub">Je reçois ma commande chez moi</span>
                </div>
              </label>
            </div>

            {mode === "livraison" && (
              <div className="checkout-adresse-wrap">
                <label className="checkout-label">Adresse exacte *</label>
                <textarea
                  className="checkout-textarea"
                  rows={3}
                  placeholder="Ex : 12 Rue de la République, Tunis"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <button type="submit" className="checkout-submit-btn" disabled={loading}>
            {loading ? "Envoi en cours..." : "CONFIRMER LA COMMANDE"}
          </button>
        </form>

        {/* ── Récapitulatif ── */}
        <aside className="checkout-recap">
          <h2 className="checkout-recap-title">Récapitulatif</h2>

          <div className="checkout-recap-items">
            {panier.map((item) => (
              <div key={item.produitId} className="checkout-recap-item">
                {item.image && (
                  <img src={item.image} alt={item.nom} className="checkout-recap-img" />
                )}
                <div className="checkout-recap-item-info">
                  <span className="checkout-recap-item-nom">{item.nom}</span>
                  <span className="checkout-recap-item-vol">{item.volume}</span>
                </div>
                <span className="checkout-recap-item-prix">
                  {item.quantite} × {item.prix} DT
                </span>
              </div>
            ))}
          </div>

          <div className="checkout-recap-table">
            <div className="checkout-recap-row">
              <span>Prix Total</span>
              <span>{prixTotal().toFixed(3)} DT</span>
            </div>
            {remise() > 0 && (
              <div className="checkout-recap-row checkout-recap-row--remise">
                <span>Remise (10%)</span>
                <span>− {remise().toFixed(3)} DT</span>
              </div>
            )}
            {mode === "livraison" && (
              <div className="checkout-recap-row">
                <span>Frais de livraison</span>
                <span>+ {FRAIS_LIVRAISON.toFixed(3)} DT</span>
              </div>
            )}
            <div className="checkout-recap-row checkout-recap-row--net">
              <span>Net à payer</span>
              <span>{netAPayer()} DT</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
