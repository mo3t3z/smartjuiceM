import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES } from "../../utils/api";
import "./MesCommandes.css";

// PB21 — Suivre l'état de ses commandes (Client)
export default function MesCommandes() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client");
      return;
    }
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const res = await axios.get(`${API_COMMANDES}/mes-commandes`, {
        headers: authHeader(),
      });
      setCommandes(res.data);
    } catch (err) {
      setErreur("Impossible de charger vos commandes.");
    } finally {
      setLoading(false);
    }
  };

  // Libellés et couleurs des statuts
  const statutConfig = {
    en_attente:     { label: "En attente",      couleur: "orange" },
    validee:        { label: "Acceptée",         couleur: "blue"   },
    refusee:        { label: "Refusée",          couleur: "red"    },
    en_preparation: { label: "En préparation",   couleur: "purple" },
    prete:          { label: "Prête",            couleur: "teal"   },
    livree:         { label: "Livrée",           couleur: "green"  },
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="mc-page">
      <header className="mc-header">
        <button className="mc-back-btn" onClick={() => navigate("/")}>
          ← Retour au catalogue
        </button>
        <h1 className="mc-title">Mes Commandes</h1>
        <div />
      </header>

      <div className="mc-content">
        {loading ? (
          <div className="mc-loading">Chargement...</div>
        ) : erreur ? (
          <div className="mc-erreur">{erreur}</div>
        ) : commandes.length === 0 ? (
          <div className="mc-vide">
            <p>Vous n'avez pas encore passé de commande.</p>
            <button className="mc-btn-catalogue" onClick={() => navigate("/")}>
              Parcourir le catalogue
            </button>
          </div>
        ) : (
          <div className="mc-liste">
            {commandes.map((cmd) => {
              const cfg = statutConfig[cmd.statut] || { label: cmd.statut, couleur: "gray" };
              return (
                <div key={cmd._id} className="mc-card">
                  {/* En-tête de la commande */}
                  <div className="mc-card-header">
                    <div>
                      <span className="mc-cmd-id">#{cmd._id.slice(-8).toUpperCase()}</span>
                      <span className="mc-cmd-date">{formatDate(cmd.createdAt)}</span>
                    </div>
                    <span className={`mc-statut mc-statut--${cfg.couleur}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Produits */}
                  <div className="mc-produits">
                    {cmd.produits.map((p, idx) => (
                      <div key={idx} className="mc-produit-ligne">
                        <span className="mc-prod-nom">{p.nom}</span>
                        <span className="mc-prod-vol">{p.volume}</span>
                        <span className="mc-prod-qte">× {p.quantite}</span>
                        <span className="mc-prod-prix">
                          {(p.prixUnitaire * p.quantite).toFixed(2)} DT
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mode de remise */}
                  <div className="mc-remise">
                    {cmd.modeRemise === "livraison" ? (
                      <div className="mc-livraison-info">
                        <span className="mc-remise-badge mc-remise-badge--livraison">🚚 Livraison</span>
                        <span className="mc-livraison-adresse">{cmd.adresseLivraison}</span>
                        {cmd.telephoneLivraison && (
                          <span className="mc-livraison-tel"> — {cmd.telephoneLivraison}</span>
                        )}
                      </div>
                    ) : (
                      <span className="mc-remise-badge mc-remise-badge--retrait">🏪 Retrait en boutique</span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="mc-card-footer">
                    <div className="mc-totaux">
                      {cmd.modeRemise === "livraison" && cmd.fraisLivraison > 0 && (
                        <span className="mc-frais">
                          Frais de livraison : {cmd.fraisLivraison.toFixed(2)} DT
                        </span>
                      )}
                      <span className="mc-total">Total : {cmd.total.toFixed(2)} DT</span>
                    </div>
                    {cmd.statut === "refusee" && cmd.commentaireRefus && (
                      <span className="mc-refus-raison">
                        Motif : {cmd.commentaireRefus}
                      </span>
                    )}
                  </div>

                  {/* Barre de progression du statut */}
                  <div className="mc-progression">
                    {["en_attente", "validee", "en_preparation", "prete", "livree"].map((s, i) => (
                      <div key={s} className="mc-etape-wrapper">
                        <div
                          className={`mc-etape ${
                            cmd.statut === "refusee" ? "mc-etape--refuse" :
                            ["en_attente","validee","en_preparation","prete","livree"].indexOf(cmd.statut) >= i
                              ? "mc-etape--active" : ""
                          }`}
                        />
                        <span className="mc-etape-label">
                          {statutConfig[s]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
