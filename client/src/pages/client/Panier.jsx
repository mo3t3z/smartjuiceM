import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  getPanier,
  savePanier,
  authHeader,
  API_COMMANDES,
} from "../../utils/api";
import "./Panier.css";

const FRAIS_LIVRAISON = 3; // DT

// PB18 — Gestion du panier (Client)
// PB19 — Passer une commande en ligne (Client)
export default function Panier() {
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ texte: "", type: "" });
  const [modeRemise, setModeRemise] = useState("retrait");
  const [adresseLivraison, setAdresseLivraison] = useState("");
  const [telephoneLivraison, setTelephoneLivraison] = useState("");

  useEffect(() => {
    // Vérifier que l'utilisateur est connecté et est un client
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client");
      return;
    }
    setPanier(getPanier());
  }, []);

  // Calculer le sous-total des articles
  const calculerSousTotal = () =>
    panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

  // Calculer le total avec frais de livraison éventuels
  const calculerTotal = () =>
    (calculerSousTotal() + (modeRemise === "livraison" ? FRAIS_LIVRAISON : 0)).toFixed(2);

  // Modifier la quantité d'un article
  const modifierQuantite = (produitId, delta) => {
    const nouveauPanier = panier
      .map((item) =>
        item.produitId === produitId
          ? { ...item, quantite: item.quantite + delta }
          : item
      )
      .filter((item) => item.quantite > 0); // Supprimer si quantité = 0

    setPanier(nouveauPanier);
    savePanier(nouveauPanier);
  };

  // Supprimer un article du panier
  const supprimerArticle = (produitId) => {
    const nouveauPanier = panier.filter((item) => item.produitId !== produitId);
    setPanier(nouveauPanier);
    savePanier(nouveauPanier);
  };

  // Vider le panier
  const viderPanier = () => {
    setPanier([]);
    savePanier([]);
  };

  // PB19 — Passer la commande
  const passerCommande = async () => {
    if (panier.length === 0) {
      setMessage({ texte: "Votre panier est vide.", type: "erreur" });
      return;
    }
    if (modeRemise === "livraison" && !adresseLivraison.trim()) {
      setMessage({ texte: "Veuillez saisir votre adresse de livraison.", type: "erreur" });
      return;
    }
    if (modeRemise === "livraison" && !telephoneLivraison.trim()) {
      setMessage({ texte: "Veuillez saisir votre numéro de téléphone.", type: "erreur" });
      return;
    }

    setLoading(true);
    try {
      const produits = panier.map((item) => ({
        produitId: item.produitId,
        quantite: item.quantite,
      }));

      await axios.post(
        API_COMMANDES,
        {
          produits,
          modeRemise,
          adresseLivraison: adresseLivraison.trim(),
          telephoneLivraison: telephoneLivraison.trim(),
          fraisLivraison: modeRemise === "livraison" ? FRAIS_LIVRAISON : 0,
        },
        { headers: authHeader() }
      );

      // Vider le panier après commande réussie
      viderPanier();
      setMessage({ texte: "Commande passée avec succès ! Vous pouvez suivre son statut dans 'Mes commandes'.", type: "succes" });
      setTimeout(() => navigate("/client/mes-commandes"), 2500);
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
    <div className="panier-page">
      <header className="panier-header">
        <button className="panier-back-btn" onClick={() => navigate("/")}>
          ← Retour au catalogue
        </button>
        <h1 className="panier-title">Mon Panier</h1>
        <div />
      </header>

      {message.texte && (
        <div className={`panier-message panier-message--${message.type}`}>
          {message.texte}
        </div>
      )}

      {panier.length === 0 ? (
        <div className="panier-vide">
          <p>Votre panier est vide.</p>
          <button className="panier-btn-catalogue" onClick={() => navigate("/")}>
            Parcourir le catalogue
          </button>
        </div>
      ) : (
        <div className="panier-content">
          {/* Liste des articles */}
          <div className="panier-liste">
            {panier.map((item) => (
              <div key={item.produitId} className="panier-item">
                {item.image && (
                  <img src={item.image} alt={item.nom} className="panier-item-img" />
                )}
                <div className="panier-item-info">
                  <h3 className="panier-item-nom">{item.nom}</h3>
                  <span className="panier-item-volume">{item.volume}</span>
                  <span className="panier-item-prix">{item.prix} DT / unité</span>
                </div>

                {/* Contrôle de quantité */}
                <div className="panier-item-quantite">
                  <button
                    className="panier-qty-btn"
                    onClick={() => modifierQuantite(item.produitId, -1)}
                  >
                    −
                  </button>
                  <span className="panier-qty-val">{item.quantite}</span>
                  <button
                    className="panier-qty-btn"
                    onClick={() => modifierQuantite(item.produitId, +1)}
                  >
                    +
                  </button>
                </div>

                <div className="panier-item-sous-total">
                  {(item.prix * item.quantite).toFixed(2)} DT
                </div>

                <button
                  className="panier-suppr-btn"
                  onClick={() => supprimerArticle(item.produitId)}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Récapitulatif + Mode de remise */}
          <div className="panier-recap">
            <h2 className="panier-recap-title">Récapitulatif</h2>

            <div className="panier-recap-ligne">
              <span>Articles ({panier.reduce((a, i) => a + i.quantite, 0)})</span>
              <span>{calculerSousTotal().toFixed(2)} DT</span>
            </div>

            {/* Choix du mode de remise */}
            <div className="panier-mode-remise">
              <h3 className="panier-mode-title">Mode de remise</h3>
              <div className="panier-mode-options">
                <label className={`panier-mode-option ${modeRemise === "retrait" ? "panier-mode-option--active" : ""}`}>
                  <input
                    type="radio"
                    name="modeRemise"
                    value="retrait"
                    checked={modeRemise === "retrait"}
                    onChange={() => setModeRemise("retrait")}
                  />
                  <span>🏪 Retrait en boutique</span>
                </label>
                <label className={`panier-mode-option ${modeRemise === "livraison" ? "panier-mode-option--active" : ""}`}>
                  <input
                    type="radio"
                    name="modeRemise"
                    value="livraison"
                    checked={modeRemise === "livraison"}
                    onChange={() => setModeRemise("livraison")}
                  />
                  <span>🚚 Livraison à domicile (+{FRAIS_LIVRAISON} DT)</span>
                </label>
              </div>

              {modeRemise === "livraison" && (
                <div className="panier-livraison-form">
                  <div className="panier-livraison-field">
                    <label className="panier-livraison-label">Adresse de livraison *</label>
                    <input
                      className="panier-livraison-input"
                      type="text"
                      value={adresseLivraison}
                      onChange={(e) => setAdresseLivraison(e.target.value)}
                      placeholder="Ex: 12 Rue de la République, Tunis"
                    />
                  </div>
                  <div className="panier-livraison-field">
                    <label className="panier-livraison-label">Téléphone *</label>
                    <input
                      className="panier-livraison-input"
                      type="tel"
                      value={telephoneLivraison}
                      onChange={(e) => setTelephoneLivraison(e.target.value)}
                      placeholder="Ex: 55 123 456"
                    />
                  </div>
                </div>
              )}
            </div>

            {modeRemise === "livraison" && (
              <div className="panier-recap-ligne">
                <span>Frais de livraison</span>
                <span>{FRAIS_LIVRAISON.toFixed(2)} DT</span>
              </div>
            )}

            <div className="panier-recap-total">
              <span>Total</span>
              <span>{calculerTotal()} DT</span>
            </div>

            <button
              className="panier-commander-btn"
              onClick={passerCommande}
              disabled={loading}
            >
              {loading ? "Envoi en cours..." : "Passer la commande"}
            </button>

            <button className="panier-vider-btn" onClick={viderPanier}>
              Vider le panier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
