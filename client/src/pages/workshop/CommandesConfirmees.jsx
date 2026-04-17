import { useState, useEffect } from "react";
import axios from "axios";
import { authHeader, API_COMMANDES } from "../../utils/api";
import "./CommandesConfirmees.css";

const todayStr = new Date().toISOString().split("T")[0];

export default function CommandesConfirmees() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [modeFiltre, setModeFiltre] = useState("date"); // "date" | "mois"
  const [dateRecherche, setDateRecherche] = useState(todayStr);
  const [moisRecherche, setMoisRecherche] = useState("");
  const [message, setMessage] = useState({ texte: "", type: "" });

  const afficherMessage = (texte, type) => {
    setMessage({ texte, type });
    setTimeout(() => setMessage({ texte: "", type: "" }), 4000);
  };

  const fetchCommandes = async (params) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_COMMANDES}/confirmees?${params}`, {
        headers: authHeader(),
      });
      setCommandes(res.data);
      setSearched(true);
    } catch {
      afficherMessage("Erreur de chargement.", "erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandes(`date=${todayStr}`);
  }, []);

  const handleRecherche = () => {
    if (modeFiltre === "date") {
      if (!dateRecherche) { afficherMessage("Veuillez choisir une date.", "erreur"); return; }
      fetchCommandes(`date=${dateRecherche}`);
    } else {
      if (!moisRecherche) { afficherMessage("Veuillez choisir un mois.", "erreur"); return; }
      fetchCommandes(`mois=${moisRecherche}`);
    }
  };

  const marquerPrete = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/prete`, {}, { headers: authHeader() });
      afficherMessage("Commande marquée comme prête.", "succes");
      fetchCommandes(modeFiltre === "date" ? `date=${dateRecherche}` : `mois=${moisRecherche}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.stockInsuffisant?.length > 0) {
        const details = data.stockInsuffisant
          .map((s) => `${s.nom} (${s.volume}) : requis ${s.requis}L, disponible ${s.disponible}L`)
          .join(" | ");
        afficherMessage(`Stock insuffisant — ${details}`, "erreur");
      } else {
        afficherMessage(data?.message || "Erreur.", "erreur");
      }
    }
  };

  const marquerLivree = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/${id}/livree`, {}, { headers: authHeader() });
      afficherMessage("Commande marquée comme livrée. Stock déduit.", "succes");
      fetchCommandes(modeFiltre === "date" ? `date=${dateRecherche}` : `mois=${moisRecherche}`);
    } catch (err) {
      afficherMessage(err.response?.data?.message || "Erreur.", "erreur");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const formatDateRetrait = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "long", year: "numeric",
    });

  return (
    <div className="cc-page">
      {message.texte && (
        <div className={`cc-message cc-message--${message.type}`}>
          {message.texte}
          <button className="cc-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Recherche par date ou mois */}
      <div className="cc-search-bar">
        <div className="cc-filtre-toggle">
          <button
            className={`cc-toggle-btn ${modeFiltre === "date" ? "cc-toggle-btn--active" : ""}`}
            onClick={() => { setModeFiltre("date"); setCommandes([]); setSearched(false); }}
          >
            Par date exacte
          </button>
          <button
            className={`cc-toggle-btn ${modeFiltre === "mois" ? "cc-toggle-btn--active" : ""}`}
            onClick={() => { setModeFiltre("mois"); setCommandes([]); setSearched(false); }}
          >
            Par mois
          </button>
        </div>
        <div className="cc-search-row">
          {modeFiltre === "date" ? (
            <input
              className="cc-search-input"
              type="date"
              value={dateRecherche}
              onChange={(e) => setDateRecherche(e.target.value)}
            />
          ) : (
            <input
              className="cc-search-input"
              type="month"
              value={moisRecherche}
              onChange={(e) => setMoisRecherche(e.target.value)}
            />
          )}
          <button className="cc-search-btn" onClick={handleRecherche}>
            Rechercher
          </button>
        </div>
      </div>

      <div className="cc-content">
        {loading ? (
          <div className="cc-loading">Chargement...</div>
        ) : !searched ? (
          <div className="cc-vide">
            <p>Sélectionnez une date pour afficher les commandes à préparer.</p>
          </div>
        ) : commandes.length === 0 ? (
          <div className="cc-vide">
            <p>Aucune commande trouvée pour cette période.</p>
          </div>
        ) : (
          <>
            <div className="cc-compteur">
              <span className="cc-count">{commandes.length}</span>
              {modeFiltre === "date"
                ? `commande(s) pour le ${new Date(dateRecherche).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" })}`
                : `commande(s) pour ${new Date(moisRecherche + "-01").toLocaleDateString("fr-TN", { month: "long", year: "numeric" })}`
              }
            </div>

            <div className="cc-liste">
              {commandes.map((cmd) => {
                const nomClient =
                  cmd.client
                    ? `${cmd.client.prenom || ""} ${cmd.client.nom || ""}`.trim() || cmd.client.email
                    : cmd.nomClient || "Client boutique";
                const isPrete  = cmd.statut === "prete";
                const isLivree = cmd.statut === "livree";

                return (
                  <div key={cmd._id} className={`cc-card ${isLivree ? "cc-card--grey" : isPrete ? "cc-card--green" : "cc-card--blue"}`}>
                    <div className="cc-card-header">
                      <div className="cc-card-ids">
                        <span className="cc-cmd-id">#{cmd._id.slice(-8).toUpperCase()}</span>
                        <span className={`cc-type cc-type--${cmd.type}`}>
                          {cmd.type === "en_ligne" ? "En ligne" : "Boutique"}
                        </span>
                        <span className={`cc-statut ${isLivree ? "cc-statut--grey" : isPrete ? "cc-statut--green" : "cc-statut--blue"}`}>
                          {isLivree ? "Livrée" : isPrete ? "Prête" : "À préparer"}
                        </span>
                      </div>
                      <span className="cc-cmd-date">{formatDate(cmd.createdAt)}</span>
                    </div>

                    <div className="cc-client">
                      <strong>Client :</strong> {nomClient}
                      {(cmd.telephone || cmd.client?.telephone) && (
                        <span className="cc-tel"> — Tél : {cmd.telephone || cmd.client?.telephone}</span>
                      )}
                    </div>

                    {cmd.dateRetrait && (
                      <div className="cc-date-retrait-row">
                        <span className={`cc-remise-badge cc-remise-badge--${cmd.modeRemise}`}>
                          {cmd.modeRemise === "livraison" ? "Livraison" : "Récupération"}
                        </span>
                        <span className="cc-date-retrait-val">
                          {formatDateRetrait(cmd.dateRetrait)}
                          {cmd.heureRetrait && ` à ${cmd.heureRetrait}`}
                        </span>
                      </div>
                    )}

                    <div className="cc-produits-section">
                      <h3 className="cc-produits-title">Produits :</h3>
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

                    <div className="cc-card-footer">
                      {cmd.remise > 0 && (
                        <span className="cc-remise">Remise (10%) : − {cmd.remise.toFixed(2)} DT</span>
                      )}
                      <span className="cc-total">Total : {cmd.total.toFixed(2)} DT</span>
                      {isLivree ? null : !isPrete ? (
                        <button className="cc-btn-prete" onClick={() => marquerPrete(cmd._id)}>
                          Marquer prête
                        </button>
                      ) : (
                        <button className="cc-btn-livree" onClick={() => marquerLivree(cmd._id)}>
                          Marquer livrée
                        </button>
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
