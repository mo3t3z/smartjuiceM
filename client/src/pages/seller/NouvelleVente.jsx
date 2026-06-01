import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_VENTES, SEUIL_REMISE, TAUX_REMISE } from "../../utils/api";
import "./NouvelleVente.css";

// PB24 — Enregistrer une vente en boutique + reçu PDF (Vendeur)
export default function NouvelleVente() {
  const navigate = useNavigate();
  const [produitsBoutique, setProduitsBoutique] = useState([]);
  const [panier, setPanier] = useState([]); // articles de la vente
  const [message, setMessage] = useState({ texte: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [venteCreee, setVenteCreee] = useState(null); // vente créée (pour reçu)

  useEffect(() => {
    fetchProduitsBoutique();//appellé un seule fois 
  }, []);

  const fetchProduitsBoutique = async () => {
    try {
      const res = await axios.get(`${API_VENTES}/stock-boutique`, { headers: authHeader() });
      setProduitsBoutique(res.data);//retourne juste produit que leur stock supérieur a 0
    } catch {
      setMessage({ texte: "Impossible de charger le stock boutique.", type: "erreur" });
    }
  };

  // Ajouter un produit à la vente
  const ajouterProduit = (produit) => {
    if (!produit._id) {
      setMessage({ texte: `"${produit.nom}" n'est pas lié au catalogue. Ajoutez-le d'abord comme produit.`, type: "erreur" });
      return;
    }

    const existant = panier.find((p) => p.produitId === produit._id);
    const qteActuelle = existant ? existant.quantite : 0;

    if (qteActuelle + 1 > produit.unitsDispo) {
      setMessage({
        texte: `Stock insuffisant pour "${produit.nom}". Disponible : ${produit.unitsDispo} unité(s).`,
        type: "erreur",
      });
      return;
    }

    if (existant) {//deja dans panier incrémante la qté
      setPanier(panier.map((p) =>
        p.produitId === produit._id ? { ...p, quantite: p.quantite + 1 } : p
      ));
    } else {
      setPanier([...panier, {//l'ajoute si il n'existe pas 
        produitId: produit._id,
        nom: produit.nom,
        volume: produit.volume,
        prix: produit.prix,
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
  const totalBrut = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);
  const escompte = totalBrut > SEUIL_REMISE ? totalBrut * TAUX_REMISE : 0;
  const total = totalBrut - escompte;

  // Enregistrer la vente
  const enregistrerVente = async () => {//erreur pas pdt
    if (panier.length === 0) {
      setMessage({ texte: "Ajoutez au moins un produit.", type: "erreur" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(//requete post pour envoyé la  vente
        API_VENTES,
        {
          produits: panier.map((p) => ({ produitId: p.produitId, quantite: p.quantite })),
          escompte: parseFloat(escompte.toFixed(2)),
        },
        { headers: authHeader() }
      );

      setVenteCreee(res.data.vente);
      setPanier([]);//sucess message
      setMessage({ texte: "Vente enregistrée avec succès !", type: "succes" });
      fetchProduitsBoutique();
    } catch (err) {
      setMessage({//erreur msg 
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
      const res = await axios.get(`${API_VENTES}/${venteId}/recu`, {//requete de vente
        headers: authHeader(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");//lien d'enregistrement
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
            Télécharger le reçu PDF
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
              {produitsBoutique.length === 0 ? (
                <p style={{ color: "#888", gridColumn: "1/-1", textAlign: "center", padding: "40px 0" }}>
                  Aucun produit disponible en boutique. Effectuez un transfert depuis l'atelier.
                </p>
              ) : (
                produitsBoutique.map((produit) => (
                  <div key={produit._id} className="nv-produit-card">
                    {produit.image && (
                      <img src={produit.image} alt={produit.nom} className="nv-produit-img" />
                    )}
                    <div className="nv-produit-info">
                      <h3 className="nv-produit-nom">{produit.nom}</h3>
                      <span className="nv-produit-vol">{produit.volume}</span>
                      <span className="nv-produit-prix">{produit.prix} DT</span>
                      <span className="nv-produit-stock nv-stock--vert">
                        Stock : {produit.unitsDispo} unité(s)
                      </span>
                    </div>
                    <button
                      className="nv-ajouter-btn"
                      onClick={() => ajouterProduit(produit)}
                    >
                      + Ajouter
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Récapitulatif de la vente */}
          <div className="nv-recap">
            <h2 className="nv-section-title">Récapitulatif</h2>

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
                      <input
                        className="nv-qty-input"
                        type="number"
                        min="1"
                        value={p.quantite}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            setPanier(panier.map((item) =>
                              item.produitId === p.produitId ? { ...item, quantite: val } : item
                            ));
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 1) {
                            setPanier(panier.filter((item) => item.produitId !== p.produitId));
                          }
                        }}
                      />
                      <button className="nv-qty-btn" onClick={() => modifierQuantite(p.produitId, +1)}>+</button>
                    </div>
                    <span className="nv-recap-st">{(p.prix * p.quantite).toFixed(2)} DT</span>
                  </div>
                ))}

                {escompte > 0 && (
                  <>
                    <div className="nv-total nv-total--brut">
                      <span>Sous-total</span>
                      <span>{totalBrut.toFixed(2)} DT</span>
                    </div>
                    <div className="nv-total nv-total--escompte">
                      <span>Escompte 10%</span>
                      <span>− {escompte.toFixed(2)} DT</span>
                    </div>
                  </>
                )}
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
