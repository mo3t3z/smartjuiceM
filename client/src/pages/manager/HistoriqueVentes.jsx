import { useState } from "react";
import axios from "axios";
import { authHeader, API_VENTES } from "../../utils/api";
import "./HistoriqueVentes.css";

export default function HistoriqueVentes() {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [modeFiltre, setModeFiltre] = useState("jour"); // "jour" | "mois"
  const [date, setDate] = useState("");
  const [mois, setMois] = useState("");

  const [message, setMessage] = useState({ texte: "", type: "" });

  const afficherMessage = (texte, type) => {//affiche le msg d'alerte qui disparru aprés 4sc
    setMessage({ texte, type });
    setTimeout(() => setMessage({ texte: "", type: "" }), 4000);
  };

  const handleRecherche = async () => {//ken tkteb jour f filtre w tkmlch lbe9y wle hja hekka 
    if (modeFiltre === "jour" && !date) { afficherMessage("Veuillez choisir un jour.", "erreur"); return; }
    if (modeFiltre === "mois" && !mois) { afficherMessage("Veuillez choisir un mois.", "erreur"); return; }

    const params = new URLSearchParams();//construit parametre l'url
    if (modeFiltre === "jour") { params.append("debut", date); params.append("fin", date); }//thot w9teh ybde w youfa jour
    else params.append("mois", mois);//thot format de moiss

    setLoading(true);
    try {
      const res = await axios.get(`${API_VENTES}?${params}`, { headers: authHeader() });
      setVentes(res.data);//stock les ventes recu
      setSearched(true);// declanche l'affichage de resultat
    } catch {
      afficherMessage("Erreur de chargement.", "erreur");
    } finally {
      setLoading(false);
    }
  };

  const telechargerRecu = async (id) => {
    try {
      const res = await axios.get(`${API_VENTES}/${id}/recu`, {//envoie requet pdf
        headers: authHeader(), responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `recu-vente-${id}.pdf`;
      link.click();//link pour telechargement
      window.URL.revokeObjectURL(url);
    } catch {
      afficherMessage("Erreur lors du téléchargement.", "erreur");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {//format de date tunisienne lisible
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const totalCA = ventes.reduce((acc, v) => acc + v.total, 0);//somme totale de tous les ventes

  const labelPeriode = modeFiltre === "jour"//text lisible de la periode selectionnée 
    ? new Date(date).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date(mois + "-01").toLocaleDateString("fr-TN", { month: "long", year: "numeric" });

  return (
    <div className="hv-page">

      {message.texte && (
        <div className={`hv-message hv-message--${message.type}`}>
          {message.texte}
          <button className="hv-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Filtres */}
      <div className="hv-filtres">
        <div className="hv-toggle">
          <button
            className={`hv-toggle-btn ${modeFiltre === "jour" ? "hv-toggle-btn--active" : ""}`}
            onClick={() => { setModeFiltre("jour"); setVentes([]); setSearched(false); }}
          >
            Par jour
          </button>
          <button
            className={`hv-toggle-btn ${modeFiltre === "mois" ? "hv-toggle-btn--active" : ""}`}
            onClick={() => { setModeFiltre("mois"); setVentes([]); setSearched(false); }}
          >
            Par mois
          </button>
        </div>

        <div className="hv-filtres-row">
          {modeFiltre === "jour" ? (
            <input className="hv-input-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <input className="hv-input-date" type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
          )}
          <button className="hv-search-btn" onClick={handleRecherche}>Rechercher</button>
        </div>
      </div>

      {/* Résultats */}
      <div className="hv-content">
        {loading ? (
          <div className="hv-loading">Chargement...</div>
        ) : !searched ? (
          <div className="hv-vide">Sélectionnez un jour ou un mois pour afficher les ventes.</div>
        ) : ventes.length === 0 ? (
          <div className="hv-vide">Aucune vente pour {labelPeriode}.</div>
        ) : (
          <>
            {/* Résumé */}
            <div className="hv-resume">
              <div className="hv-resume-item">
                <span className="hv-resume-label">Ventes — {labelPeriode}</span>
                <span className="hv-resume-val">{ventes.length}</span>
              </div>
              <div className="hv-resume-item">
                <span className="hv-resume-label">Chiffre d'affaires</span>
                <span className="hv-resume-val hv-resume-val--ca">{totalCA.toFixed(2)} DT</span>
              </div>
            </div>

            {/* Liste */}
            <div className="hv-liste">
              {ventes.map((v) => {
                const sousTotal = v.produits.reduce((acc, p) => acc + p.prixUnitaire * p.quantite, 0);
                return (
                  <div key={v._id} className="hv-card">
                    <div className="hv-card-header">
                      <div className="hv-card-meta">
                        <span className="hv-vente-id">#{v._id.slice(-8).toUpperCase()}</span>
                        <span className="hv-vente-date">{formatDate(v.dateVente)}</span>
                        <span className="hv-vente-vendeur">
                          {v.vendeur?.nom || ""} {v.vendeur?.prenom || ""} — {v.vendeur?.email}
                        </span>
                      </div>
                      <button className="hv-btn-pdf" onClick={() => telechargerRecu(v._id)}>
                        Reçu PDF
                      </button>
                    </div>

                    <div className="hv-produits">
                      {v.produits.map((p, idx) => (
                        <div key={idx} className="hv-prod-ligne">
                          <span className="hv-prod-nom">{p.nom}</span>
                          <span className="hv-prod-vol">{p.volume}</span>
                          <span className="hv-prod-qte">× {p.quantite}</span>
                          <span className="hv-prod-prix">{(p.prixUnitaire * p.quantite).toFixed(2)} DT</span>
                        </div>
                      ))}
                    </div>

                    <div className="hv-card-footer">
                      {v.escompte > 0 && (
                        <div className="hv-totaux-detail">
                          <span className="hv-sous-total">Sous-total : {sousTotal.toFixed(2)} DT</span>
                          <span className="hv-escompte">Escompte (10%) : −{v.escompte.toFixed(2)} DT</span>
                        </div>
                      )}
                      <span className="hv-total">Total : {v.total.toFixed(2)} DT</span>
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
