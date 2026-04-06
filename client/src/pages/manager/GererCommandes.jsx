import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES } from "../../utils/api";
import "./GererCommandes.css";

// PB20 — Valider ou refuser une commande (Gérant)
export default function GererCommandes() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("en_attente");
  const [filtreType, setFiltreType] = useState("");
  const [message, setMessage] = useState({ texte: "", type: "" });
  // Modal de refus
  const [modalRefus, setModalRefus] = useState(null); // ID de la commande à refuser
  const [commentaireRefus, setCommentaireRefus] = useState("");

  useEffect(() => {
    fetchCommandes();
  }, [filtreStatut, filtreType]);

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtreStatut) params.append("statut", filtreStatut);
      if (filtreType) params.append("type", filtreType);

      const res = await axios.get(`${API_COMMANDES}/toutes?${params}`, {
        headers: authHeader(),
      });
      setCommandes(res.data);
    } catch {
      setMessage({ texte: "Erreur de chargement.", type: "erreur" });
    } finally {
      setLoading(false);
    }
  };

  // Valider une commande
  const valider = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/valider`, {}, { headers: authHeader() });
      setMessage({ texte: "Commande validée avec succès.", type: "succes" });
      fetchCommandes();
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur.", type: "erreur" });
    }
  };

  // Ouvrir le modal de refus
  const ouvrirModalRefus = (id) => {
    setModalRefus(id);
    setCommentaireRefus("");
  };

  // Confirmer le refus
  const confirmerRefus = async () => {
    try {
      await axios.put(
        `${API_COMMANDES}/${modalRefus}/refuser`,
        { commentaireRefus },
        { headers: authHeader() }
      );
      setMessage({ texte: "Commande refusée.", type: "succes" });
      setModalRefus(null);
      fetchCommandes();
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur.", type: "erreur" });
    }
  };

  // Marquer comme livrée
  const marquerLivree = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/livree`, {}, { headers: authHeader() });
      setMessage({ texte: "Commande marquée comme livrée.", type: "succes" });
      fetchCommandes();
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur.", type: "erreur" });
    }
  };

  // Télécharger le reçu PDF
  const telechargerRecu = async (id) => {
    try {
      const res = await axios.get(`${API_COMMANDES}/${id}/recu`, {
        headers: authHeader(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `recu-commande-${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ texte: "Erreur lors du téléchargement du reçu.", type: "erreur" });
    }
  };

  const statutConfig = {
    en_attente:     { label: "En attente",     couleur: "orange" },
    validee:        { label: "Validée",         couleur: "blue"   },
    refusee:        { label: "Refusée",         couleur: "red"    },
    en_preparation: { label: "En préparation",  couleur: "purple" },
    livree:         { label: "Livrée",          couleur: "green"  },
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="gc-page">
      <header className="gc-header">
        <button className="gc-back-btn" onClick={() => navigate("/manager")}>← Accueil</button>
        <h1 className="gc-title">Gestion des Commandes</h1>
        <div />
      </header>

      {message.texte && (
        <div className={`gc-message gc-message--${message.type}`}>
          {message.texte}
          <button className="gc-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Filtres */}
      <div className="gc-filtres">
        <select
          className="gc-select"
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="validee">Validée</option>
          <option value="refusee">Refusée</option>
          <option value="en_preparation">En préparation</option>
          <option value="livree">Livrée</option>
        </select>

        <select
          className="gc-select"
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
        >
          <option value="">Tous les types</option>
          <option value="en_ligne">En ligne</option>
          <option value="physique">Boutique</option>
        </select>

        <button className="gc-refresh-btn" onClick={fetchCommandes}>↻ Actualiser</button>
      </div>

      {/* Liste */}
      <div className="gc-content">
        {loading ? (
          <div className="gc-loading">Chargement...</div>
        ) : commandes.length === 0 ? (
          <div className="gc-vide">Aucune commande trouvée.</div>
        ) : (
          <div className="gc-liste">
            {commandes.map((cmd) => {
              const cfg = statutConfig[cmd.statut] || { label: cmd.statut, couleur: "gray" };
              const nomClient =
                cmd.client
                  ? `${cmd.client.prenom || ""} ${cmd.client.nom || ""}`.trim() || cmd.client.email
                  : cmd.nomClient || "Client boutique";

              return (
                <div key={cmd._id} className="gc-card">
                  <div className="gc-card-header">
                    <div className="gc-card-info">
                      <span className="gc-cmd-id">#{cmd._id.slice(-8).toUpperCase()}</span>
                      <span className="gc-cmd-date">{formatDate(cmd.createdAt)}</span>
                      <span className={`gc-type gc-type--${cmd.type}`}>
                        {cmd.type === "en_ligne" ? "En ligne" : "Boutique"}
                      </span>
                    </div>
                    <span className={`gc-statut gc-statut--${cfg.couleur}`}>{cfg.label}</span>
                  </div>

                  <div className="gc-client-info">
                    <strong>Client :</strong> {nomClient}
                    {cmd.client?.email && <span className="gc-email"> — {cmd.client.email}</span>}
                    {(cmd.telephone || cmd.client?.telephone) && (
                      <span className="gc-tel"> — Tél : {cmd.telephone || cmd.client?.telephone}</span>
                    )}
                  </div>

                  {/* Produits */}
                  <div className="gc-produits">
                    {cmd.produits.map((p, idx) => (
                      <div key={idx} className="gc-prod-ligne">
                        <span className="gc-prod-nom">{p.nom}</span>
                        <span className="gc-prod-vol">{p.volume}</span>
                        <span className="gc-prod-qte">× {p.quantite}</span>
                        <span className="gc-prod-prix">{(p.prixUnitaire * p.quantite).toFixed(2)} DT</span>
                      </div>
                    ))}
                  </div>

                  <div className="gc-card-footer">
                    <span className="gc-total">Total : {cmd.total.toFixed(2)} DT</span>

                    {/* Actions selon statut */}
                    <div className="gc-actions">
                      {cmd.statut === "en_attente" && (
                        <>
                          <button className="gc-btn gc-btn--valider" onClick={() => valider(cmd._id)}>
                            ✓ Valider
                          </button>
                          <button className="gc-btn gc-btn--refuser" onClick={() => ouvrirModalRefus(cmd._id)}>
                            ✕ Refuser
                          </button>
                        </>
                      )}
                      {(cmd.statut === "validee" || cmd.statut === "en_preparation") && (
                        <button className="gc-btn gc-btn--livree" onClick={() => marquerLivree(cmd._id)}>
                          ✓ Marquer livrée
                        </button>
                      )}
                      {cmd.statut === "refusee" && cmd.commentaireRefus && (
                        <span className="gc-refus-raison">Motif : {cmd.commentaireRefus}</span>
                      )}
                      <button className="gc-btn gc-btn--pdf" onClick={() => telechargerRecu(cmd._id)}>
                        📄 Reçu PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de refus */}
      {modalRefus && (
        <div className="gc-modal-overlay">
          <div className="gc-modal">
            <h3 className="gc-modal-title">Refuser la commande</h3>
            <p className="gc-modal-desc">Veuillez préciser le motif du refus (optionnel) :</p>
            <textarea
              className="gc-modal-textarea"
              value={commentaireRefus}
              onChange={(e) => setCommentaireRefus(e.target.value)}
              placeholder="Ex: Stock insuffisant, produit indisponible..."
              rows={3}
            />
            <div className="gc-modal-actions">
              <button className="gc-btn gc-btn--refuser" onClick={confirmerRefus}>
                Confirmer le refus
              </button>
              <button className="gc-btn gc-btn--annuler" onClick={() => setModalRefus(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
