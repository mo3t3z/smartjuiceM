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

// PB18 — Gestion du panier (Client)
// PB19 — Passer une commande en ligne (Client)
export default function Panier() {
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ texte: "", type: "" });

  useEffect(() => {
    // Vérifier que l'utilisateur est connecté et est un client
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client");
      return;
    }
    setPanier(getPanier());
  }, []);

  // Calculer le total du panier
  const calculerTotal = () => {
    return panier.reduce((acc, item) => acc + item.prix * item.quantite, 0).toFixed(2);
  };

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

    setLoading(true);
    try {
      const produits = panier.map((item) => ({
        produitId: item.produitId,
        quantite: item.quantite,
      }));

      await axios.post(
        API_COMMANDES,
        { produits },
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

          {/* Récapitulatif */}
          <div className="panier-recap">
            <h2 className="panier-recap-title">Récapitulatif</h2>
            <div className="panier-recap-ligne">
              <span>Articles ({panier.reduce((a, i) => a + i.quantite, 0)})</span>
              <span>{calculerTotal()} DT</span>
            </div>
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
