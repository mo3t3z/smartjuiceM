import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getPanier, savePanier } from "../../utils/api";
import "./Panier.css";

const SEUIL_REMISE = 200;
const TAUX_REMISE  = 0.10;

// PB18 — Gestion du panier (Client)
// PB19 — Passer une commande en ligne (Client)
export default function Panier() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [welcome, setWelcome] = useState(location.state?.welcome || "");

  useEffect(() => {
    if (location.state?.welcome) {
      const timer = setTimeout(() => setWelcome(""), 5000);
      return () => clearTimeout(timer);
    }
  }, []);
  const [panier,  setPanier]  = useState([]);
  const [message, setMessage] = useState({ texte: "", type: "" });

  useEffect(() => {
    setPanier(getPanier());
  }, []);

  // Prix total brut
  const prixTotal = () =>
    panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

  // La remise s'applique uniquement si le total dépasse 200 DT
  const remise = () => prixTotal() > SEUIL_REMISE ? prixTotal() * TAUX_REMISE : 0;

  // Net à payer
  const netAPayer = () => (prixTotal() - remise()).toFixed(2);

  // Modifier la quantité d'un article
  const modifierQuantite = (produitId, delta) => {
    const nouveauPanier = panier
      .map((item) =>
        item.produitId === produitId
          ? { ...item, quantite: item.quantite + delta }
          : item
      )
      .filter((item) => item.quantite > 0);
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

  // PB19 — Rediriger vers le checkout (ou login si non connecté)
  const passerCommande = () => {
    if (panier.length === 0) {
      setMessage({ texte: "Votre panier est vide.", type: "erreur" });
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client", { state: { from: "/client/panier" } });
      return;
    }
    navigate("/client/checkout");
  };

  const aRemise = prixTotal() > SEUIL_REMISE;

  return (
    <div className="panier-page">
      <header className="panier-header">
        <button className="panier-back-btn" onClick={() => navigate("/")}>
          ← Retour au catalogue
        </button>
        <h1 className="panier-title">Mon Panier</h1>
        <div />
      </header>

      {/* Message de bienvenue après connexion */}
      {welcome && (
        <div className="panier-welcome">
          {welcome}
        </div>
      )}

      {/* Bannière remise */}
      <div className="panier-banniere-remise">
        Toute commande dépassant <strong>200 DT</strong> bénéficie d'une remise de <strong>10%</strong>.
      </div>

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
                  >−</button>
                  <input
                    className="panier-qty-val"
                    type="number"
                    min="1"
                    value={item.quantite}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!val || val < 1) return;
                      const nouveauPanier = panier.map((p) =>
                        p.produitId === item.produitId ? { ...p, quantite: val } : p
                      );
                      setPanier(nouveauPanier);
                      savePanier(nouveauPanier);
                    }}
                  />
                  <button
                    className="panier-qty-btn"
                    onClick={() => modifierQuantite(item.produitId, +1)}
                  >+</button>
                </div>

                <div className="panier-item-sous-total">
                  {(item.prix * item.quantite).toFixed(2)} DT
                </div>

                <button
                  className="panier-suppr-btn"
                  onClick={() => supprimerArticle(item.produitId)}
                  title="Supprimer"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Récapitulatif */}
          <div className="panier-recap">
            <h2 className="panier-recap-title">Récapitulatif</h2>

            <div className="panier-recap-table">
              <div className="panier-recap-row">
                <span>Prix Total</span>
                <span>{prixTotal().toFixed(2)} DT</span>
              </div>

              {aRemise && (
                <div className="panier-recap-row panier-recap-row--remise">
                  <span>Remise (10%)</span>
                  <span>− {remise().toFixed(2)} DT</span>
                </div>
              )}

              <div className="panier-recap-row panier-recap-row--net">
                <span>Net à payer</span>
                <span>{netAPayer()} DT</span>
              </div>
            </div>

            {!JSON.parse(localStorage.getItem("user") || "null") ? (
              <>
                <p className="panier-login-info">
                  Vous devez être <strong>connecté</strong> pour passer une commande.{" "}
                  <button
                    className="panier-login-link"
                    onClick={() => navigate("/login-client", { state: { from: "/client/panier" } })}
                  >
                    Se connecter
                  </button>
                </p>
                <button className="panier-commander-btn panier-commander-btn--disabled" disabled>
                  COMMANDER
                </button>
              </>
            ) : (
              <button className="panier-commander-btn" onClick={passerCommande}>
                COMMANDER
              </button>
            )}

            <button className="panier-vider-btn" onClick={viderPanier}>
              Vider le panier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
