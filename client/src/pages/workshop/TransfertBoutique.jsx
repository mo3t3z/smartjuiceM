import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TransfertBoutique.css";

const API = "http://localhost:5000/api/workshop";
const token = () => localStorage.getItem("token");

export default function TransfertBoutique() {
  const navigate = useNavigate();
  const [jusList, setJusList]       = useState([]);
  const [nomJus, setNomJus]         = useState("");
  const [quantite, setQuantite]     = useState("");
  const [disponible, setDisponible] = useState(null);
  const [dispoLoading, setDispoLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

  /* ── charger les jus disponibles en stock PF atelier ── */
  useEffect(() => {
    fetch(`${API}/stock/pf/resume`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((data) => setJusList(Array.isArray(data) ? data.filter((j) => j.disponible > 0) : []))
      .catch(() => {});
  }, []);

  /* ── charger la dispo quand on change le jus ── */
  useEffect(() => {
    setDisponible(null);
    setError("");
    setQuantite("");
    if (!nomJus) return;
    setDispoLoading(true);
    fetch(`${API}/transferts/disponible?nomJus=${encodeURIComponent(nomJus)}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => setDisponible(d.disponible))
      .catch(() => setDisponible(null))
      .finally(() => setDispoLoading(false));
  }, [nomJus]);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!nomJus) return setError("Sélectionnez un jus.");
    if (!quantite || Number(quantite) <= 0) return setError("La quantité doit être supérieure à 0.");
    if (disponible !== null && Number(quantite) > disponible)
      return setError(`Quantité demandée (${quantite}L) supérieure au stock disponible (${disponible}L).`);

    setSubmitLoading(true);
    try {
      const res = await fetch(`${API}/transferts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ nomJus, quantite: Number(quantite) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess(data.message);
      setNomJus(""); setQuantite(""); setDisponible(null);
      // rafraîchir la liste
      fetch(`${API}/stock/pf/resume`, { headers: { Authorization: `Bearer ${token()}` } })
        .then((r) => r.json())
        .then((d) => setJusList(Array.isArray(d) ? d.filter((j) => j.disponible > 0) : []));
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="tb-page">
      <header className="tb-header">
        <div className="tb-brand">
          <span className="tb-logo-icon">SJ</span>
          <div>
            <h1 className="tb-brand-name">SmartJuice</h1>
            <p className="tb-brand-sub">Interface Atelier</p>
          </div>
        </div>
        <button className="tb-back-btn" onClick={() => navigate("/workshop")}>← Retour</button>
      </header>

      <div className="tb-content">
        <div className="tb-card">
          <div className="tb-card-head">
            <span className="tb-head-icon">Trans</span>
            <div>
              <h2 className="tb-title">Enregistrer Quantité à Transférer vers Boutique</h2>
              <p className="tb-sub">Le stock PF de l'atelier sera réduit en conséquence</p>
            </div>
          </div>

          {success && <div className="tb-alert tb-alert--success">{success}</div>}
          {error   && <div className="tb-alert tb-alert--error">{error}</div>}

          <form className="tb-form" onSubmit={handleSubmit}>

            {/* Sélection du jus */}
            <div className="tb-field">
              <label className="tb-label">Jus à transférer <span className="tb-req">*</span></label>
              <select
                className="tb-select"
                value={nomJus}
                onChange={(e) => { setNomJus(e.target.value); setError(""); }}
                required
              >
                <option value="">-- Sélectionner un jus --</option>
                {jusList.map((j) => (
                  <option key={j.nomJus} value={j.nomJus}>
                    {j.nomJus} — {j.disponible} L disponibles
                  </option>
                ))}
              </select>
              {jusList.length === 0 && (
                <p className="tb-hint">Aucun stock PF disponible en atelier.</p>
              )}
            </div>

            {/* Stock dispo */}
            {nomJus && (
              <div className="tb-dispo-box">
                {dispoLoading ? (
                  <span className="tb-dispo-loading">Calcul en cours...</span>
                ) : (
                  <>
                    <span className="tb-dispo-label">Stock disponible en atelier :</span>
                    <span className={`tb-dispo-val ${disponible <= 0 ? "tb-dispo--low" : ""}`}>
                      {disponible ?? "—"} L
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Quantité */}
            <div className="tb-field">
              <label className="tb-label">Quantité à transférer (litres) <span className="tb-req">*</span></label>
              <input
                className="tb-input"
                type="number"
                min="0.1"
                max={disponible ?? undefined}
                step="0.1"
                value={quantite}
                onChange={(e) => { setQuantite(e.target.value); setError(""); }}
                placeholder="Ex: 20"
                required
              />
              {disponible !== null && quantite && Number(quantite) > disponible && (
                <p className="tb-field-err">Dépasse le stock disponible ({disponible} L)</p>
              )}
            </div>

            <button
              type="submit"
              className="tb-submit-btn"
              disabled={submitLoading || !nomJus || !quantite || Number(quantite) <= 0 || (disponible !== null && Number(quantite) > disponible)}
            >
              {submitLoading ? "Enregistrement..." : "Confirmer le transfert"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
