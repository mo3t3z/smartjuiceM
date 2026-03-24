import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StockMP.css";
import { API_WORKSHOP, authHeader } from "../../utils/api";
import { fmtDate } from "../../utils/date";
import { useHistoriqueMP, buildTimelineMP } from "../../hooks/useHistoriqueMP";

const API = API_WORKSHOP;

export default function StockMP() {
  const navigate = useNavigate();
  const [types, setTypes]         = useState([]);
  const [stockMap, setStockMap]   = useState({});   // { "Oranges||kg": { disponible, unite } }
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const { histModal, histData, histLoading, openHistorique, closeHistorique } = useHistoriqueMP(API);

  /* ── charger types et stock disponible ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [resTypes, resStock] = await Promise.all([
          fetch(`${API}/types-mp`, { headers: authHeader() }),
          fetch(`${API}/matieres-premieres/disponible`, { headers: authHeader() }),
        ]);
        if (!resTypes.ok) throw new Error("Erreur chargement types.");
        if (!resStock.ok) throw new Error("Erreur chargement stock.");

        const typesData = await resTypes.json(); // [{ _id, nom, seuilMin, unite }]
        setTypes(typesData);

        const list = await resStock.json(); // [{ type, unite, disponible }]
        const map = {};
        list.forEach((item) => {
          const key = `${item.type}||${item.unite}`;
          map[key] = item;
        });
        setStockMap(map);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── stock pour un type donné (toutes unités) ── */
  const getStockForType = (type) => {
    return Object.values(stockMap).filter((s) => s.type === type);
  };


  return (
    <div className="smp-page">

      {/* ── Modal Historique ── */}
      {histModal && (
        <div className="smp-overlay">
          <div className="smp-hist-modal">
            <div className="smp-hist-head">
              <h3>Historique — <span className="smp-hist-type">{histModal}</span></h3>
              <button className="smp-hist-close" onClick={closeHistorique}>✕</button>
            </div>

            {histLoading && <div className="smp-hist-loading">Chargement...</div>}

            {histData?.error && (
              <div className="smp-hist-error">{histData.error}</div>
            )}

            {histData && !histData.error && (() => {
              const timeline = buildTimelineMP(histData);
              return timeline.length === 0 ? (
                <div className="smp-hist-empty">Aucun mouvement enregistré pour ce type.</div>
              ) : (
                <div className="smp-timeline">
                  {timeline.map((ev, i) => (
                    <div key={`${ev.id}-${i}`} className={`smp-event smp-event--${ev.kind}`}>
                      <div className="smp-event-dot" />
                      <div className="smp-event-body">
                        <div className="smp-event-header">
                          <span className={`smp-event-badge ${ev.kind === "addition" ? "smp-badge--add" : "smp-badge--red"}`}>
                            {ev.kind === "addition" ? "Entrée en stock" : "Déduction production"}
                          </span>
                          <span className="smp-event-date">{fmtDate(ev.date)}</span>
                        </div>
                        <div className="smp-event-qty">
                          {ev.kind === "addition" ? "+" : "−"}{ev.quantite} {ev.unite}
                        </div>
                        <div className="smp-event-details">
                          {ev.kind === "addition" ? (
                            <>
                              <span>Enregistré par : <strong>{ev.par}</strong></span>
                              {ev.fournisseur && <span>Fournisseur : <strong>{ev.fournisseur}</strong></span>}
                              <span>Prix unitaire : <strong>{ev.prix} DT/{ev.unite}</strong></span>
                            </>
                          ) : (
                            <>
                              <span>Production par : <strong>{ev.par}</strong></span>
                              <span>Produit : <strong>{ev.qtyProduite}L de {ev.nomJus}</strong></span>
                            </>
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
      <header className="smp-header">
        <div className="smp-brand">
          <span className="smp-logo-icon">SJ</span>
          <div>
            <h1 className="smp-brand-name">SmartJuice</h1>
            <p className="smp-brand-sub">Interface Atelier</p>
          </div>
        </div>
        <button className="smp-back-btn" onClick={() => navigate("/workshop/stock")}>← Retour</button>
      </header>

      {/* ── Content ── */}
      <div className="smp-content">
        <div className="smp-top">
          <div className="smp-title-block">
            <div>
              <h2 className="smp-title">Stock Matières Premières</h2>
              <p className="smp-subtitle">Stock disponible par type de matière première</p>
            </div>
          </div>
        </div>

        {error && <div className="smp-error">{error}</div>}

        {loading && <div className="smp-loader">Chargement du stock...</div>}

        {!loading && types.length === 0 && (
          <div className="smp-empty">
            <p>Aucun type de matière première défini.</p>
          </div>
        )}

        {!loading && types.length > 0 && (
          <div className="smp-grid">
            {types.map((typeObj) => {
              const nom = typeObj.nom;
              const stocks = getStockForType(nom);
              const isNegOrZero = stocks.length === 0 || stocks.every((s) => s.disponible <= 0);

              return (
                <div key={typeObj._id} className={`smp-card ${isNegOrZero ? "smp-card--low" : "smp-card--ok"}`}>
                  <div className="smp-card-top">
                    <div className="smp-card-icon-wrap">
                      <span className="smp-card-icon">{nom[0]?.toUpperCase()}</span>
                    </div>
                    <div className={`smp-card-status ${isNegOrZero ? "smp-status--low" : "smp-status--ok"}`}>
                      {isNegOrZero ? "Stock bas" : "En stock"}
                    </div>
                  </div>

                  <h3 className="smp-card-name">{nom}</h3>

                  <div className="smp-card-stocks">
                    {stocks.length === 0 ? (
                      <div className="smp-card-qty smp-card-qty--zero">
                        <span className="smp-qty-num">0</span>
                        <span className="smp-qty-unit">—</span>
                      </div>
                    ) : (
                      stocks.map((s, i) => (
                        <div key={i} className={`smp-card-qty ${s.disponible <= 0 ? "smp-card-qty--zero" : ""}`}>
                          <span className="smp-qty-num">{s.disponible % 1 === 0 ? s.disponible : s.disponible.toFixed(2)}</span>
                          <span className="smp-qty-unit">{s.unite}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <button className="smp-hist-btn" onClick={() => openHistorique(nom)}>
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
