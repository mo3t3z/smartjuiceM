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
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [message, setMessage] = useState({ texte: "", type: "" });

  const afficherMessage = (texte, type) => {
    setMessage({ texte, type });
    setTimeout(() => setMessage({ texte: "", type: "" }), 5000);
  };

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
      afficherMessage("Commande validée avec succès.", "succes");
      fetchCommandes();
    } catch (err) {
      afficherMessage(err.response?.data?.message || "Erreur.", "erreur");
    }
  };

  // Ouvrir le modal de refus
  const ouvrirModalRefus = (id) => {
    setModalRefus(id);
    setCommentaireRefus("");
  };

  // Confirmer le refus
  const confirmerRefus = async () => {
    if (!commentaireRefus.trim()) {
      afficherMessage("La cause du refus est obligatoire.", "erreur");
      return;
    }
    try {
      await axios.put(
        `${API_COMMANDES}/${modalRefus}/refuser`,
        { commentaireRefus },
        { headers: authHeader() }
      );
      afficherMessage("Commande refusée.", "succes");
      setModalRefus(null);
      fetchCommandes();
    } catch (err) {
      afficherMessage(err.response?.data?.message || "Erreur.", "erreur");
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
      afficherMessage("Erreur lors du téléchargement du reçu.", "erreur");
    }
  };

  const statutConfig = {
    en_attente:     { label: "En attente",     couleur: "orange" },
    validee:        { label: "Validée",         couleur: "blue"   },
    refusee:        { label: "Refusée",         couleur: "red"    },
    en_preparation: { label: "En préparation",  couleur: "purple" },
    prete:          { label: "Prête",           couleur: "teal"   },
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
          <option value="prete">Prête</option>
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
                    {cmd.modeRemise === "livraison" ? (
                      <div className="gc-livraison-info">
                        <span className="gc-remise-badge gc-remise-badge--livraison">Livraison</span>
                        <span className="gc-livraison-adresse"> {cmd.adresseLivraison}</span>
                        {cmd.telephoneLivraison && (
                          <span className="gc-livraison-tel"> — {cmd.telephoneLivraison}</span>
                        )}
                      </div>
                    ) : (
                      <span className="gc-remise-badge gc-remise-badge--retrait">Retrait boutique</span>
                    )}
                    {cmd.dateRetrait && (
                      <div className="gc-date-retrait">
                        Date de récupération : <strong>
                          {new Date(cmd.dateRetrait).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" })}
                        </strong>
                        {cmd.heureRetrait && (
                          <> à <strong>{cmd.heureRetrait}</strong></>
                        )}
                      </div>
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
                    <div className="gc-totaux">
                      {cmd.modeRemise === "livraison" && cmd.fraisLivraison > 0 && (
                        <span className="gc-frais">Frais livraison : {cmd.fraisLivraison.toFixed(2)} DT</span>
                      )}
                      <span className="gc-total">Total : {cmd.total.toFixed(2)} DT</span>
                    </div>

                    {/* Actions selon statut */}
                    <div className="gc-actions">
                      {cmd.statut === "en_attente" && cmd.type !== "physique" && (
                        <>
                          <button className="gc-btn gc-btn--valider" onClick={() => valider(cmd._id)}>
                            ✓ Valider
                          </button>
                          <button className="gc-btn gc-btn--refuser" onClick={() => ouvrirModalRefus(cmd._id)}>
                            ✕ Refuser
                          </button>
                        </>
                      )}
                      {cmd.statut === "refusee" && cmd.commentaireRefus && (
                        <span className="gc-refus-raison">Motif : {cmd.commentaireRefus}</span>
                      )}
                      {["validee", "refusee", "prete", "livree"].includes(cmd.statut) && (
                        <button className="gc-btn gc-btn--pdf" onClick={() => telechargerRecu(cmd._id)}>
                          Reçu PDF
                        </button>
                      )}
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
            <p className="gc-modal-desc">Veuillez préciser la cause du refus <strong>(obligatoire)</strong> :</p>
            <textarea
              className="gc-modal-textarea"
              value={commentaireRefus}
              onChange={(e) => setCommentaireRefus(e.target.value)}
              placeholder="Ex: Stock insuffisant, produit indisponible..."
              rows={3}
              required
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
