import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./QuantiteProduire.css";

import { API_WORKSHOP as API, authHeader } from "../../utils/api";

export default function QuantiteProduire() {
  const navigate = useNavigate();
  const [recettes, setRecettes] = useState([]);
  const [nomJus, setNomJus] = useState("");
  const [quantite, setQuantite] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  /* ── charger les recettes disponibles ── */
  useEffect(() => {
    fetch(`${API}/recettes`, { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setRecettes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  /* ── preview automatique quand jus + quantité saisies ── */
  useEffect(() => {
    setPreview(null);
    setError("");
    if (!nomJus || !quantite || Number(quantite) <= 0) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(
          `${API}/recettes/preview?nomJus=${encodeURIComponent(nomJus)}&quantite=${quantite}`,
          { headers: authHeader() }
        );
        const data = await res.json();
        if (!res.ok) {
          if (data.code === "NO_RECIPE")
            setError(`Aucune recette pour "${nomJus}". Veuillez d'abord créer la recette dans "Gérer la Recette".`);
          else setError(data.message);
        } else {
          setPreview(data);
        }
      } catch {
        setError("Erreur de connexion au serveur.");
      } finally {
        setPreviewLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nomJus, quantite]);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preview || error) return;
    const hasInsuffisant = preview.deductions.some((d) => !d.suffisant);
    if (hasInsuffisant) return;

    setSubmitLoading(true);
    try {
      const res = await fetch(`${API}/productions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ nomJus, quantiteLitres: Number(quantite) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(data.message);
      setNomJus("");
      setQuantite("");
      setPreview(null);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const allSuffisant = preview && preview.deductions.every((d) => d.suffisant);

  return (
    <div className="qp-page">
      <header className="qp-header">
        <div className="qp-brand">
          <span className="qp-logo-icon">SJ</span>
          <div>
            <h1 className="qp-brand-name">SmartJuice</h1>
            <p className="qp-brand-sub">Interface Atelier</p>
          </div>
        </div>
        <button className="qp-back-btn" onClick={() => navigate("/workshop")}>← Retour</button>
      </header>

      <div className="qp-content">
        <div className="qp-card">
          <div className="qp-card-head">
            <span className="qp-head-icon">Prod</span>
            <div>
              <h2 className="qp-title">Enregistrer Quantité à Produire</h2>
              <p className="qp-sub">Le système calcule automatiquement les matières à déduire du stock MP</p>
            </div>
          </div>

          {success && <div className="qp-alert qp-alert--success">{success}</div>}

          <form onSubmit={handleSubmit} className="qp-form">
            {/* Sélection du jus */}
            <div className="qp-field">
              <label className="qp-label">Jus à produire <span className="qp-req">*</span></label>
              <select
                className="qp-select"
                value={nomJus}
                onChange={(e) => { setNomJus(e.target.value); setError(""); setPreview(null); }}
                required
              >
                <option value="">-- Sélectionner un jus --</option>
                {recettes.map((r) => (
                  <option key={r._id} value={r.nomJus}>{r.nomJus}</option>
                ))}
              </select>
              {recettes.length === 0 && (
                <p className="qp-hint">
                  Aucune recette disponible.{" "}
                  <button type="button" className="qp-link" onClick={() => navigate("/workshop/recettes")}>
                    Créer une recette →
                  </button>
                </p>
              )}
            </div>

            {/* Quantité */}
            <div className="qp-field">
              <label className="qp-label">Quantité à produire (litres) <span className="qp-req">*</span></label>
              <input
                className="qp-input"
                type="number"
                min="0.1"
                step="0.1"
                value={quantite}
                onChange={(e) => { setQuantite(e.target.value); setError(""); setPreview(null); }}
                placeholder="Ex: 100"
                required
              />
            </div>

            {/* Erreur recette manquante */}
            {error && (
              <div className="qp-alert qp-alert--error">
                {error}
                {error.includes("recette") && (
                  <button type="button" className="qp-link-btn" onClick={() => navigate("/workshop/recettes")}>
                    Aller à Gérer la Recette →
                  </button>
                )}
              </div>
            )}

            {/* Preview chargement */}
            {previewLoading && (
              <div className="qp-preview-loading">Calcul des matières nécessaires...</div>
            )}

            {/* Preview des déductions */}
            {preview && !error && (
              <div className={`qp-preview ${allSuffisant ? "qp-preview--ok" : "qp-preview--warn"}`}>
                <p className="qp-preview-title">
                  Matières à déduire du stock MP pour <strong>{quantite}L de {nomJus}</strong> :
                </p>
                <div className="qp-deductions">
                  {preview.deductions.map((d, i) => (
                    <div key={i} className={`qp-ded-row ${d.suffisant ? "qp-ded--ok" : "qp-ded--err"}`}>
                      <span className={`qp-ded-status ${d.suffisant ? "qp-ded-status--ok" : "qp-ded-status--err"}`}>{d.suffisant ? "✓" : "✗"}</span>
                      <span className="qp-ded-mat">{d.matiere}</span>
                      <span className="qp-ded-qty">
                        Requis : <strong>{d.quantite} {d.unite}</strong>
                      </span>
                      <span className="qp-ded-dispo">
                        Disponible : <strong className={d.suffisant ? "qp-ok" : "qp-err"}>{d.disponible} {d.unite}</strong>
                      </span>
                    </div>
                  ))}
                </div>
                {!allSuffisant && (
                  <p className="qp-insuf-msg">Stock insuffisant pour certaines matières. Veuillez enregistrer d'abord les matières manquantes.</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="qp-submit-btn"
              disabled={!preview || !allSuffisant || !!error || submitLoading}
            >
              {submitLoading ? "Enregistrement..." : "Confirmer la production"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
