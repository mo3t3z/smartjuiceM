import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../seller/StockPFBoutique.css";

import { API_MANAGER as API, authHeader } from "../../utils/api";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ManagerStockBoutique() {
  const navigate = useNavigate();
  const [jusList, setJusList]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [histModal, setHistModal]     = useState(null);
  const [histData, setHistData]       = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/stock/boutique`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setJusList(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openHistorique = async (nomJus) => {
    setHistModal(nomJus);
    setHistData(null);
    setHistLoading(true);
    try {
      const res = await fetch(`${API}/historique/boutique/${encodeURIComponent(nomJus)}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Erreur chargement historique.");
      setHistData(await res.json());
    } catch (e) {
      setHistData({ error: e.message });
    } finally {
      setHistLoading(false);
    }
  };

  return (
    <div className="spfb-page">

      {/* ── Modal Historique ── */}
      {histModal && (
        <div className="spfb-overlay">
          <div className="spfb-hist-modal">
            <div className="spfb-hist-head">
              <h3>Historique — <span className="spfb-hist-name">{histModal}</span></h3>
              <button className="spfb-hist-close" onClick={() => setHistModal(null)}>✕</button>
            </div>

            {histLoading && <div className="spfb-hist-info">Chargement...</div>}
            {histData?.error && <div className="spfb-hist-info spfb-hist-error">{histData.error}</div>}

            {histData && !histData.error && (() => {
              const list = histData.transferts || [];
              return list.length === 0 ? (
                <div className="spfb-hist-info">Aucun transfert reçu pour ce jus.</div>
              ) : (
                <div className="spfb-timeline">
                  {list.map((t) => (
                    <div key={t._id} className="spfb-event">
                      <div className="spfb-event-dot" />
                      <div className="spfb-event-body">
                        <div className="spfb-event-header">
                          <span className="spfb-event-badge">Transfert reçu de l'atelier</span>
                          <span className="spfb-event-date">{fmtDate(t.dateTransfert)}</span>
                        </div>
                        <div className="spfb-event-qty">+{t.quantite} L</div>
                        <div className="spfb-event-details">
                          <span>Transféré par : <strong>{t.enregistrePar?.email || "—"}</strong></span>
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
      <header className="spfb-header">
        <div className="spfb-brand">
          <span className="spfb-logo-icon">SJ</span>
          <div>
            <h1 className="spfb-brand-name">SmartJuice</h1>
            <p className="spfb-brand-sub">Interface Gérant</p>
          </div>
        </div>
        <button className="spfb-back-btn" onClick={() => navigate("/manager/stocks")}>← Retour</button>
      </header>

      {/* ── Content ── */}
      <div className="spfb-content">
        <div className="spfb-top">
          <div className="spfb-title-block">
            <div>
              <h2 className="spfb-title">Stock PF — Boutique</h2>
              <p className="spfb-subtitle">Produits finis disponibles en boutique</p>
            </div>
          </div>
        </div>

        {error   && <div className="spfb-error">{error}</div>}
        {loading && <div className="spfb-loader">Chargement du stock...</div>}

        {!loading && jusList.length === 0 && (
          <div className="spfb-empty">
            <p>Aucun produit reçu en boutique pour le moment.</p>
          </div>
        )}

        {!loading && jusList.length > 0 && (
          <div className="spfb-grid">
            {jusList.map((jus) => {
              const isLow = jus.disponible <= 0;
              return (
                <div key={jus.nomJus} className={`spfb-card ${isLow ? "spfb-card--low" : "spfb-card--ok"}`}>
                  <div className="spfb-card-top">
                    <div className={`spfb-card-status ${isLow ? "spfb-status--low" : "spfb-status--ok"}`}>
                      {isLow ? "Vide" : "En stock"}
                    </div>
                  </div>

                  <h3 className="spfb-card-name">{jus.nomJus}</h3>

                  <div className="spfb-card-qty">
                    <span className="spfb-qty-num">{jus.disponible % 1 === 0 ? jus.disponible : jus.disponible.toFixed(2)}</span>
                    <span className="spfb-qty-unit">L</span>
                  </div>

                  <div className="spfb-card-meta">
                    <span>Total reçu : <strong>{jus.totalRecu} L</strong></span>
                    <span>{jus.nbTransferts} transfert{jus.nbTransferts > 1 ? "s" : ""} reçu{jus.nbTransferts > 1 ? "s" : ""}</span>
                  </div>

                  <button className="spfb-hist-btn" onClick={() => openHistorique(jus.nomJus)}>
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
