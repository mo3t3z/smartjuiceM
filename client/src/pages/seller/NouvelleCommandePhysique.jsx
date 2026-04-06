import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES, API_PRODUCTS } from "../../utils/api";
import "./NouvelleCommandePhysique.css";

// PB22 — Enregistrer une commande physique en boutique + reçu PDF (Vendeur)
export default function NouvelleCommandePhysique() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState([]);
  const [panier, setPanier] = useState([]);
  const [nomClient, setNomClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState({ texte: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [commandeCreee, setCommandeCreee] = useState(null);

  useEffect(() => {
    fetchCatalogue();
  }, []);

  const fetchCatalogue = async () => {
    try {
      const res = await axios.get(`${API_PRODUCTS}/catalog`);
      setCatalogue(res.data);
    } catch {
      setMessage({ texte: "Impossible de charger le catalogue.", type: "erreur" });
    }
  };

  const ajouterProduit = (produit) => {
    const existant = panier.find((p) => p.produitId === produit._id);
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
  };

  const modifierQuantite = (produitId, delta) => {
    setPanier(
      panier
        .map((p) => p.produitId === produitId ? { ...p, quantite: p.quantite + delta } : p)
        .filter((p) => p.quantite > 0)
    );
  };

  const total = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);

  const enregistrerCommande = async () => {
    if (panier.length === 0) {
      setMessage({ texte: "Ajoutez au moins un produit.", type: "erreur" });
      return;
    }
    if (!nomClient.trim()) {
      setMessage({ texte: "Le nom du client est obligatoire.", type: "erreur" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_COMMANDES}/physique`,
        {
          nomClient: nomClient.trim(),
          telephone: telephone.trim(),
          produits: panier.map((p) => ({ produitId: p.produitId, quantite: p.quantite })),
        },
        { headers: authHeader() }
      );

      setCommandeCreee(res.data.commande);
      setPanier([]);
      setNomClient("");
      setTelephone("");
      setMessage({ texte: "Commande physique enregistrée !", type: "succes" });
    } catch (err) {
      setMessage({
        texte: err.response?.data?.message || "Erreur lors de l'enregistrement.",
        type: "erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  const telechargerRecu = async (commandeId) => {
    try {
      const res = await axios.get(`${API_COMMANDES}/${commandeId}/recu`, {
        headers: authHeader(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `recu-commande-${commandeId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ texte: "Erreur lors du téléchargement du reçu.", type: "erreur" });
    }
  };

  return (
    <div className="ncp-page">
      <header className="ncp-header">
        <button className="ncp-back-btn" onClick={() => navigate("/seller")}>← Accueil</button>
        <h1 className="ncp-title">Nouvelle Commande Physique</h1>
        <div />
      </header>

      {message.texte && (
        <div className={`ncp-message ncp-message--${message.type}`}>
          {message.texte}
          <button className="ncp-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Bannière succès */}
      {commandeCreee && (
        <div className="ncp-success-banner">
          <span>✓ Commande #{commandeCreee._id.slice(-6).toUpperCase()} enregistrée (en attente de validation)</span>
          <button className="ncp-recu-btn" onClick={() => telechargerRecu(commandeCreee._id)}>
            📄 Télécharger le reçu PDF
          </button>
          <button className="ncp-nouvelle-btn" onClick={() => setCommandeCreee(null)}>
            + Nouvelle commande
          </button>
        </div>
      )}

      {!commandeCreee && (
        <div className="ncp-content">
          {/* Catalogue */}
          <div className="ncp-catalogue">
            <h2 className="ncp-section-title">Sélectionner les produits</h2>
            <div className="ncp-produits-grid">
              {catalogue.map((produit) => (
                <div key={produit._id} className="ncp-produit-card">
                  {produit.image && (
                    <img src={produit.image} alt={produit.name} className="ncp-produit-img" />
                  )}
                  <div className="ncp-produit-info">
                    <h3 className="ncp-produit-nom">{produit.name}</h3>
                    <span className="ncp-produit-vol">{produit.volume}</span>
                    <span className="ncp-produit-prix">{produit.price} DT</span>
                  </div>
                  <button className="ncp-ajouter-btn" onClick={() => ajouterProduit(produit)}>
                    + Ajouter
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Formulaire */}
          <div className="ncp-formulaire">
            <h2 className="ncp-section-title">Informations client</h2>

            <div className="ncp-field">
              <label className="ncp-label">Nom du client *</label>
              <input
                className="ncp-input"
                type="text"
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                placeholder="Ex: Ahmed Ben Ali"
              />
            </div>

            <div className="ncp-field">
              <label className="ncp-label">Téléphone</label>
              <input
                className="ncp-input"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex: 55 123 456"
              />
            </div>

            <h2 className="ncp-section-title">Articles commandés</h2>

            {panier.length === 0 ? (
              <p className="ncp-panier-vide">Aucun article sélectionné.</p>
            ) : (
              <>
                {panier.map((p) => (
                  <div key={p.produitId} className="ncp-recap-item">
                    <div className="ncp-recap-info">
                      <span className="ncp-recap-nom">{p.nom}</span>
                      <span className="ncp-recap-vol">{p.volume}</span>
                    </div>
                    <div className="ncp-recap-qte">
                      <button className="ncp-qty-btn" onClick={() => modifierQuantite(p.produitId, -1)}>−</button>
                      <span>{p.quantite}</span>
                      <button className="ncp-qty-btn" onClick={() => modifierQuantite(p.produitId, +1)}>+</button>
                    </div>
                    <span className="ncp-recap-st">{(p.prix * p.quantite).toFixed(2)} DT</span>
                  </div>
                ))}

                <div className="ncp-total">
                  <span>Total</span>
                  <span>{total.toFixed(2)} DT</span>
                </div>

                <button
                  className="ncp-enregistrer-btn"
                  onClick={enregistrerCommande}
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer la commande"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
