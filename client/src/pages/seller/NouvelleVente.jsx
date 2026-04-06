import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_VENTES, API_PRODUCTS } from "../../utils/api";
import "./NouvelleVente.css";

// PB24 — Enregistrer une vente en boutique + reçu PDF (Vendeur)
export default function NouvelleVente() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState([]);
  const [stockBoutique, setStockBoutique] = useState([]);
  const [panier, setPanier] = useState([]); // articles de la vente
  const [nomClient, setNomClient] = useState("");
  const [message, setMessage] = useState({ texte: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [venteCreee, setVenteCreee] = useState(null); // vente créée (pour reçu)

  useEffect(() => {
    fetchCatalogue();
    fetchStockBoutique();
  }, []);

  const fetchCatalogue = async () => {
    try {
      const res = await axios.get(`${API_PRODUCTS}/catalog`);
      setCatalogue(res.data);
    } catch {
      setMessage({ texte: "Impossible de charger le catalogue.", type: "erreur" });
    }
  };

  const fetchStockBoutique = async () => {
    try {
      const res = await axios.get(`${API_VENTES}/stock-boutique`, {
        headers: authHeader(),
      });
      setStockBoutique(res.data);
    } catch {
      // Non bloquant
    }
  };

  // Récupérer le stock disponible en boutique pour un produit
  const getStockDispo = (nomProduit) => {
    const item = stockBoutique.find((s) => s.nomJus === nomProduit);
    return item ? item.disponible : 0;
  };

  // Ajouter un produit à la vente
  const ajouterProduit = (produit) => {
    const stockDispo = getStockDispo(produit.name);
    const litresParUnite = produit.volume === "1L" ? 1 : 0.5;

    const existant = panier.find((p) => p.produitId === produit._id);
    const qteActuelle = existant ? existant.quantite : 0;
    const litresDemandes = (qteActuelle + 1) * litresParUnite;

    if (litresDemandes > stockDispo) {
      setMessage({
        texte: `Stock insuffisant pour "${produit.name}". Disponible : ${stockDispo.toFixed(2)} L.`,
        type: "erreur",
      });
      return;
    }

    if (existant) {
      setPanier(panier.map((p) =>
        p.produitId === produit._id ? { ...p, quantite: p.quantite + 1 } : p
      ));
    } else {
      setPanier([...panier, {
        produitId: produit._id,
        nom: produit.name,
        volume: produit.volume,
        prix: produit.price,
        quantite: 1,
      }]);
    }
    setMessage({ texte: "", type: "" });
  };

  // Modifier la quantité
  const modifierQuantite = (produitId, delta) => {
    setPanier(
      panier
        .map((p) => p.produitId === produitId ? { ...p, quantite: p.quantite + delta } : p)
        .filter((p) => p.quantite > 0)
    );
  };

  // Total de la vente
  const total = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);

  // Enregistrer la vente
  const enregistrerVente = async () => {
    if (panier.length === 0) {
      setMessage({ texte: "Ajoutez au moins un produit.", type: "erreur" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        API_VENTES,
        {
          nomClient,
          produits: panier.map((p) => ({ produitId: p.produitId, quantite: p.quantite })),
        },
        { headers: authHeader() }
      );

      setVenteCreee(res.data.vente);
      setPanier([]);
      setNomClient("");
      setMessage({ texte: "Vente enregistrée avec succès !", type: "succes" });
      // Rafraîchir le stock boutique
      fetchStockBoutique();
    } catch (err) {
      setMessage({
        texte: err.response?.data?.message || "Erreur lors de l'enregistrement.",
        type: "erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  // Télécharger le reçu PDF
  const telechargerRecu = async (venteId) => {
    try {
      const res = await axios.get(`${API_VENTES}/${venteId}/recu`, {
        headers: authHeader(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `recu-vente-${venteId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ texte: "Erreur lors du téléchargement du reçu.", type: "erreur" });
    }
  };

  return (
    <div className="nv-page">
      <header className="nv-header">
        <button className="nv-back-btn" onClick={() => navigate("/seller")}>← Accueil</button>
        <h1 className="nv-title">Nouvelle Vente</h1>
        <div />
      </header>

      {message.texte && (
        <div className={`nv-message nv-message--${message.type}`}>
          {message.texte}
          <button className="nv-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Succès + bouton reçu */}
      {venteCreee && (
        <div className="nv-success-banner">
          <span>✓ Vente #{venteCreee._id.slice(-6).toUpperCase()} enregistrée</span>
          <button className="nv-recu-btn" onClick={() => telechargerRecu(venteCreee._id)}>
            📄 Télécharger le reçu PDF
          </button>
          <button className="nv-nouvelle-btn" onClick={() => setVenteCreee(null)}>
            + Nouvelle vente
          </button>
        </div>
      )}

      {!venteCreee && (
        <div className="nv-content">
          {/* Catalogue + stock boutique */}
          <div className="nv-catalogue">
            <h2 className="nv-section-title">Produits disponibles en boutique</h2>
            <div className="nv-produits-grid">
              {catalogue.map((produit) => {
                const dispo = getStockDispo(produit.name);
                const litresParUnite = produit.volume === "1L" ? 1 : 0.5;
                const unitsDispo = Math.floor(dispo / litresParUnite);

                return (
                  <div key={produit._id} className={`nv-produit-card ${unitsDispo === 0 ? "nv-produit-card--epuise" : ""}`}>
                    {produit.image && (
                      <img src={produit.image} alt={produit.name} className="nv-produit-img" />
                    )}
                    <div className="nv-produit-info">
                      <h3 className="nv-produit-nom">{produit.name}</h3>
                      <span className="nv-produit-vol">{produit.volume}</span>
                      <span className="nv-produit-prix">{produit.price} DT</span>
                      <span className={`nv-produit-stock ${unitsDispo === 0 ? "nv-stock--rouge" : "nv-stock--vert"}`}>
                        Stock : {unitsDispo} unité(s)
                      </span>
                    </div>
                    <button
                      className="nv-ajouter-btn"
                      onClick={() => ajouterProduit(produit)}
                      disabled={unitsDispo === 0}
                    >
                      {unitsDispo === 0 ? "Épuisé" : "+ Ajouter"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Récapitulatif de la vente */}
          <div className="nv-recap">
            <h2 className="nv-section-title">Récapitulatif</h2>

            {/* Nom du client (optionnel) */}
            <div className="nv-field">
              <label className="nv-label">Nom du client (optionnel)</label>
              <input
                className="nv-input"
                type="text"
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                placeholder="Ex: Ahmed Ben Ali"
              />
            </div>

            {/* Articles */}
            {panier.length === 0 ? (
              <p className="nv-panier-vide">Aucun article ajouté.</p>
            ) : (
              <>
                {panier.map((p) => (
                  <div key={p.produitId} className="nv-recap-item">
                    <div className="nv-recap-info">
                      <span className="nv-recap-nom">{p.nom}</span>
                      <span className="nv-recap-vol">{p.volume}</span>
                    </div>
                    <div className="nv-recap-qte">
                      <button className="nv-qty-btn" onClick={() => modifierQuantite(p.produitId, -1)}>−</button>
                      <span>{p.quantite}</span>
                      <button className="nv-qty-btn" onClick={() => modifierQuantite(p.produitId, +1)}>+</button>
                    </div>
                    <span className="nv-recap-st">{(p.prix * p.quantite).toFixed(2)} DT</span>
                  </div>
                ))}

                <div className="nv-total">
                  <span>Total</span>
                  <span>{total.toFixed(2)} DT</span>
                </div>

                <button
                  className="nv-enregistrer-btn"
                  onClick={enregistrerVente}
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer la vente"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
