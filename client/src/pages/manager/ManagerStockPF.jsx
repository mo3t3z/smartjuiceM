import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../workshop/StockPF.css";
import { API_MANAGER, authHeader } from "../../utils/api";
import { fmtDate } from "../../utils/date";
import { useHistoriquePF, buildTimelinePF } from "../../hooks/useHistoriquePF";

const API = API_MANAGER;

export default function ManagerStockPF() {
  const navigate = useNavigate();
  const [jusList, setJusList]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const { histModal, histData, histLoading, openHistorique, closeHistorique } = useHistoriquePF(API);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/stock/pf`, {
          headers: authHeader(),
        });
        if (!res.ok) throw new Error("Erreur chargement stock PF.");
        setJusList(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  return (
    <div className="spf-page">

      {/* ── Modal Historique ── */}
      {histModal && (
        <div className="spf-overlay">
          <div className="spf-hist-modal">
            <div className="spf-hist-head">
              <h3>Historique — <span className="spf-hist-name">{histModal}</span></h3>
              <button className="spf-hist-close" onClick={closeHistorique}>✕</button>
            </div>

            {histLoading && <div className="spf-hist-loading">Chargement...</div>}
            {histData?.error && <div className="spf-hist-error">{histData.error}</div>}

            {histData && !histData.error && (() => {
              const timeline = buildTimelinePF(histData);
              return timeline.length === 0 ? (
                <div className="spf-hist-empty">Aucune production enregistrée pour ce jus.</div>
              ) : (
                <div className="spf-timeline">
                  {timeline.map((ev, i) => (
                    <div key={`${ev.id}-${i}`} className={`spf-event spf-event--${ev.kind}`}>
                      <div className="spf-event-dot" />
                      <div className="spf-event-body">
                        <div className="spf-event-header">
                          <span className={`spf-event-badge spf-badge--${ev.kind}`}>
                            {ev.kind === "production" ? "Production enregistrée" : "Transfert boutique"}
                          </span>
                          <span className="spf-event-date">{fmtDate(ev.date)}</span>
                        </div>
                        <div className="spf-event-qty">+{ev.quantite} L</div>
                        <div className="spf-event-details">
                          <span>Enregistré par : <strong>{ev.par}</strong></span>
                          {ev.kind === "production" && ev.deductions?.length > 0 && (
                            <span>
                              MP utilisées :{" "}
                              {ev.deductions.map((d, j) => (
                                <span key={j} className="spf-ded-chip">
                                  {d.quantite} {d.unite} {d.matiere}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="spf-header">
        <div className="spf-brand">
          <span className="spf-logo-icon">SJ</span>
          <div>
            <h1 className="spf-brand-name">SmartJuice</h1>
            <p className="spf-brand-sub">Interface Gérant</p>
          </div>
        </div>
        <button className="spf-back-btn" onClick={() => navigate("/manager/stocks")}>← Retour</button>
      </header>

      {/* ── Content ── */}
      <div className="spf-content">
        <div className="spf-top">
          <div className="spf-title-block">
            <div>
              <h2 className="spf-title">Stock Produits Finis</h2>
              <p className="spf-subtitle">Stock disponible par type de jus produit</p>
            </div>
          </div>
        </div>

        {error && <div className="spf-error">{error}</div>}
        {loading && <div className="spf-loader">Chargement du stock...</div>}

        {!loading && jusList.length === 0 && (
          <div className="spf-empty">
            <p>Aucune production enregistrée.</p>
          </div>
        )}

        {!loading && jusList.length > 0 && (
          <div className="spf-grid">
            {jusList.map((jus) => {
              const isLow = jus.disponible <= 0;
              return (
                <div key={jus.nomJus} className={`spf-card ${isLow ? "spf-card--low" : "spf-card--ok"}`}>
                  <div className="spf-card-top">
                    <div className="spf-card-icon-wrap">
                      <span>{jus.nomJus[0]?.toUpperCase()}</span>
                    </div>
                    <div className={`spf-card-status ${isLow ? "spf-status--low" : "spf-status--ok"}`}>
                      {isLow ? "Vide" : "En stock"}
                    </div>
                  </div>

                  <h3 className="spf-card-name">{jus.nomJus}</h3>

                  <div className="spf-card-qty">
                    <span className="spf-qty-num">{jus.disponible % 1 === 0 ? jus.disponible : jus.disponible.toFixed(2)}</span>
                    <span className="spf-qty-unit">L</span>
                  </div>

                  <div className="spf-card-meta">
                    <span>Total produit : <strong>{jus.totalProduit} L</strong></span>
                    <span>{jus.nbProductions ?? "—"} production{(jus.nbProductions ?? 0) > 1 ? "s" : ""}</span>
                  </div>

                  <button className="spf-hist-btn" onClick={() => openHistorique(jus.nomJus)}>
                    Voir l'historique
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
