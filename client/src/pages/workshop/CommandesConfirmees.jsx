import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES } from "../../utils/api";
import "./CommandesConfirmees.css";

// PB23 — Consulter les commandes confirmées (Atelier)
export default function CommandesConfirmees() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ texte: "", type: "" });

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_COMMANDES}/confirmees`, {
        headers: authHeader(),
      });
      setCommandes(res.data);
    } catch {
      setMessage({ texte: "Erreur de chargement.", type: "erreur" });
    } finally {
      setLoading(false);
    }
  };

  // Mettre une commande en préparation
  const mettreEnPreparation = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/en-preparation`, {}, {
        headers: authHeader(),
      });
      setMessage({ texte: "Commande mise en préparation.", type: "succes" });
      fetchCommandes();
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur.", type: "erreur" });
    }
  };

  // Marquer une commande comme prête
  const marquerPrete = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/prete`, {}, {
        headers: authHeader(),
      });
      setMessage({ texte: "Commande marquée comme prête.", type: "succes" });
      fetchCommandes();
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur.", type: "erreur" });
    }
  };

  const statutConfig = {
    validee:        { label: "Validée — À préparer", couleur: "blue"   },
    en_preparation: { label: "En préparation",        couleur: "purple" },
    prete:          { label: "Prête",                 couleur: "green"  },
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="cc-page">
      <header className="cc-header">
        <button className="cc-back-btn" onClick={() => navigate("/workshop")}>← Accueil</button>
        <h1 className="cc-title">Commandes Confirmées à Préparer</h1>
        <button className="cc-refresh-btn" onClick={fetchCommandes}>↻ Actualiser</button>
      </header>

      {message.texte && (
        <div className={`cc-message cc-message--${message.type}`}>
          {message.texte}
          <button className="cc-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      <div className="cc-content">
        {loading ? (
          <div className="cc-loading">Chargement...</div>
        ) : commandes.length === 0 ? (
          <div className="cc-vide">
            <p>Aucune commande confirmée en attente de préparation.</p>
          </div>
        ) : (
          <>
            {/* Compteur */}
            <div className="cc-compteur">
              <span className="cc-count">{commandes.length}</span>
              commande(s) à traiter
            </div>

            <div className="cc-liste">
              {commandes.map((cmd) => {
                const cfg = statutConfig[cmd.statut] || { label: cmd.statut, couleur: "gray" };
                const nomClient =
                  cmd.client
                    ? `${cmd.client.prenom || ""} ${cmd.client.nom || ""}`.trim() || cmd.client.email
                    : cmd.nomClient || "Client boutique";

                return (
                  <div key={cmd._id} className={`cc-card cc-card--${cfg.couleur}`}>
                    {/* En-tête */}
                    <div className="cc-card-header">
                      <div className="cc-card-ids">
                        <span className="cc-cmd-id">
                          #{cmd._id.slice(-8).toUpperCase()}
                        </span>
                        <span className={`cc-type cc-type--${cmd.type}`}>
                          {cmd.type === "en_ligne" ? "En ligne" : "Boutique"}
                        </span>
                        <span className={`cc-statut cc-statut--${cfg.couleur}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="cc-cmd-date">{formatDate(cmd.createdAt)}</span>
                    </div>

                    {/* Client */}
                    <div className="cc-client">
                      <strong>Client :</strong> {nomClient}
                      {(cmd.telephone || cmd.client?.telephone) && (
                        <span className="cc-tel"> — {cmd.telephone || cmd.client?.telephone}</span>
                      )}
                      {cmd.dateRetrait && (
                        <span className="cc-date-retrait">
                          {" "}— Retrait prévu le{" "}
                          {new Date(cmd.dateRetrait).toLocaleDateString("fr-TN", {
                            day: "2-digit", month: "long", year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Produits à préparer */}
                    <div className="cc-produits-section">
                      <h3 className="cc-produits-title">Produits à préparer :</h3>
                      <div className="cc-produits-liste">
                        {cmd.produits.map((p, idx) => (
                          <div key={idx} className="cc-produit-item">
                            <span className="cc-produit-qte-badge">{p.quantite}</span>
                            <span className="cc-produit-nom">{p.nom}</span>
                            <span className="cc-produit-vol">{p.volume}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total + action */}
                    <div className="cc-card-footer">
                      <span className="cc-total">
                        Total : {cmd.total.toFixed(2)} DT
                      </span>
                      {cmd.statut === "validee" && (
                        <button
                          className="cc-btn-preparation"
                          onClick={() => mettreEnPreparation(cmd._id)}
                        >
                          🔄 Mettre en préparation
                        </button>
                      )}
                      {cmd.statut === "en_preparation" && (
                        <button
                          className="cc-btn-prete"
                          onClick={() => marquerPrete(cmd._id)}
                        >
                          ✅ Marquer prête
                        </button>
                      )}
                      {cmd.statut === "prete" && (
                        <span className="cc-prete">✅ Prête — en attente de remise</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
