import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { API_MANAGER as API, authHeader } from "../../utils/api";
import "../../pages/ManagerHome.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const FILTRES = [
  { key: "jour",    label: "Aujourd'hui" },
  { key: "semaine", label: "Cette semaine" },
  { key: "mois",    label: "Ce mois" },
];

const FILTRE_LABEL = { jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois" };

export default function ManagerDashboard() {
  const [filtre, setFiltre]   = useState("mois");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`${API}/dashboard?filtre=${filtre}`, {
      headers: authHeader(),
      signal: abortRef.current.signal,
    })
      .then((r) => { if (!r.ok) throw new Error("Erreur serveur"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    return () => abortRef.current?.abort();
  }, [filtre]);

  const now  = new Date();
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateFormatted = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  if (loading) return (
    <div className="mh-loading"><div className="mh-spinner" /></div>
  );
  if (error) return (
    <div className="mh-loading"><p className="mh-error">Erreur : {error}</p></div>
  );

  const {
    caPeriode, trendCA,
    panierMoyen,
    productionsPeriode,
    transfertsPeriode,
    topProduit,
    tauxConfirmation, confirmees, refusees,
    topProduits,
    stockMPChart,
    stockBoutiqueChart,
    alertesMP, alertesBoutique, commandesEnAttente,
  } = data;

  const hasAlertes = alertesMP.length > 0 || alertesBoutique.length > 0 || commandesEnAttente > 0;

  // ── Chart configs ────────────────────────────────────────────────────────────
  const doughnutData = {
    labels: ["Confirmées", "Refusées"],
    datasets: [{
      data: [confirmees, refusees],
      backgroundColor: ["#0d9488", "#f43f5e"],
      borderWidth: 0,
    }],
  };
  const doughnutOptions = {
    cutout: "72%",
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    maintainAspectRatio: true,
  };

  const BAR_COLORS = ["#1e3a5f", "#0d9488", "#7c3aed", "#f59e0b", "#f43f5e"];
  const topBarData = {
    labels: topProduits.map((p) => p._id),
    datasets: [{
      data: topProduits.map((p) => p.totalQte),
      backgroundColor: BAR_COLORS.slice(0, topProduits.length),
      borderRadius: 6,
    }],
  };
  const barOpts = (unite = "L") => ({
    indexAxis: "y",
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} ${unite}` } } },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } }, title: { display: true, text: unite, font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { size: 12 } } },
    },
    maintainAspectRatio: false,
  });

  const mpBarData = {
    labels: stockMPChart.map((s) => s.nom),
    datasets: [
      { label: "Disponible", data: stockMPChart.map((s) => s.disponible), backgroundColor: "#0d9488", borderRadius: 4 },
      { label: "Seuil min",  data: stockMPChart.map((s) => s.seuil),      backgroundColor: "#cbd5e1", borderRadius: 4 },
    ],
  };
  const mpBarOpts = {
    plugins: { legend: { display: true, position: "top", labels: { font: { size: 11 }, boxWidth: 12 } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
    },
    maintainAspectRatio: false,
  };

  const boutiqueBarData = {
    labels: stockBoutiqueChart.map((s) => s.nom),
    datasets: [
      { label: "Disponible", data: stockBoutiqueChart.map((s) => s.disponible), backgroundColor: "#f43f5e", borderRadius: 4 },
      { label: "Seuil min",  data: stockBoutiqueChart.map((s) => s.seuil),      backgroundColor: "#cbd5e1", borderRadius: 4 },
    ],
  };

  return (
    <div className="mh-dashboard">
      {/* ── En-tête ── */}
      <div className="mh-header">
        <h1 className="mh-title">Tableau de bord</h1>
        <p className="mh-sub">{dateFormatted}</p>
      </div>

      {/* ── Bandeau alertes ── */}
      {hasAlertes && (
        <div className="mh-bandeau-alertes">
          <div className="mh-bandeau-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="mh-bandeau-list">
            {alertesMP.map((a) => (
              <span key={a.nom} className="mh-bandeau-pill">
                Stock MP critique — <strong>{a.nom}</strong> ({a.disponible}/{a.seuil} {a.unite})
              </span>
            ))}
            {alertesBoutique.map((a) => (
              <span key={a.nom} className="mh-bandeau-pill">
                Stock boutique — <strong>{a.nom}</strong> ({a.disponible}/{a.seuil} L)
              </span>
            ))}
            {commandesEnAttente > 0 && (
              <span className="mh-bandeau-pill mh-bandeau-pill--orange">
                {commandesEnAttente} commande{commandesEnAttente > 1 ? "s" : ""} en attente
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Filtre période ── */}
      <div className="mh-filtre-section">
        <div className="mh-filtre-row">
          {FILTRES.map((f) => (
            <button
              key={f.key}
              className={`mh-filter-btn${filtre === f.key ? " mh-filter-btn--active" : ""}`}
              onClick={() => setFiltre(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mh-filtre-note">Appliqué sur tous les indicateurs sauf les stocks</span>
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="mh-kpi-grid">
        {/* CA */}
        <div className="mh-kpi-card mh-kpi--blue">
          <div className="mh-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="mh-kpi-body">
            <span className="mh-kpi-label">CA {FILTRE_LABEL[filtre] === "Aujourd'hui" ? "du jour" : FILTRE_LABEL[filtre] === "Cette semaine" ? "de la semaine" : "du mois"}</span>
            <span className="mh-kpi-value">{caPeriode.toFixed(2)} DT</span>
            <div className="mh-kpi-footer">
              <span className="mh-kpi-sub">Ventes directes</span>
              {trendCA !== null && (
                <span className={`mh-trend mh-trend--${trendCA >= 0 ? "up" : "down"}`}>
                  {trendCA >= 0 ? "▲" : "▼"} {Math.abs(trendCA)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Panier moyen */}
        <div className="mh-kpi-card mh-kpi--teal">
          <div className="mh-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <div className="mh-kpi-body">
            <span className="mh-kpi-label">Panier moyen</span>
            <span className="mh-kpi-value">{panierMoyen.toFixed(2)} DT</span>
            <div className="mh-kpi-footer">
              <span className="mh-kpi-sub">Ventes + commandes livrées</span>
            </div>
          </div>
        </div>

        {/* Production */}
        <div className="mh-kpi-card mh-kpi--purple">
          <div className="mh-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <div className="mh-kpi-body">
            <span className="mh-kpi-label">Production</span>
            <span className="mh-kpi-value">{productionsPeriode} L</span>
            <div className="mh-kpi-footer">
              <span className="mh-kpi-sub">Litres produits en atelier</span>
            </div>
          </div>
        </div>

        {/* Transferts */}
        <div className="mh-kpi-card mh-kpi--indigo">
          <div className="mh-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
          <div className="mh-kpi-body">
            <span className="mh-kpi-label">Transferts</span>
            <span className="mh-kpi-value">{transfertsPeriode} L</span>
            <div className="mh-kpi-footer">
              <span className="mh-kpi-sub">Atelier → Boutique</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Produit le plus vendu ── */}
      {topProduit && (
        <div className="mh-bestseller">
          <div className="mh-bestseller-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div className="mh-bestseller-body">
            <span className="mh-bestseller-label">Produit le plus vendu — {FILTRE_LABEL[filtre]}</span>
            <span className="mh-bestseller-nom">{topProduit.nom}</span>
            <span className="mh-bestseller-qte">{topProduit.qte} L vendus</span>
          </div>
          <span className="mh-bestseller-badge">{topProduit.qte} L</span>
        </div>
      )}

      {/* ── Charts ligne 1 ── */}
      <div className="mh-charts mh-charts--half">
        {/* Doughnut taux confirmation */}
        <div className="mh-chart-card">
          <p className="mh-chart-title">Taux de confirmation — {FILTRE_LABEL[filtre]}</p>
          {(confirmees + refusees) === 0 ? (
            <p className="mh-chart-empty">Aucune commande décidée</p>
          ) : (
            <>
              <div className="mh-doughnut-wrap">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="mh-doughnut-center">
                  <span className="mh-doughnut-pct">{tauxConfirmation}%</span>
                  <span className="mh-doughnut-sub">Confirmées</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12, fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0d9488", display: "inline-block" }} />
                  Confirmées
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f43f5e", display: "inline-block" }} />
                  Refusées
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bar top 5 */}
        <div className="mh-chart-card">
          <p className="mh-chart-title">Top 5 produits vendus — {FILTRE_LABEL[filtre]}</p>
          {topProduits.length === 0 ? (
            <p className="mh-chart-empty">Aucune vente</p>
          ) : (
            <div style={{ height: 220 }}>
              <Bar data={topBarData} options={barOpts("L")} />
            </div>
          )}
        </div>
      </div>

      {/* ── Charts ligne 2 ── */}
      <div className="mh-charts mh-charts--half">
        {/* Stock MP */}
        <div className="mh-chart-card">
          <div className="mh-chart-header">
            <p className="mh-chart-title" style={{ margin: 0 }}>Stock matières premières vs seuil</p>
            <span className="mh-realtime-badge">Temps réel</span>
          </div>
          {stockMPChart.length === 0 ? (
            <p className="mh-chart-empty">Aucune donnée</p>
          ) : (
            <div style={{ height: 220 }}>
              <Bar data={mpBarData} options={mpBarOpts} />
            </div>
          )}
        </div>

        {/* Stock boutique */}
        <div className="mh-chart-card">
          <div className="mh-chart-header">
            <p className="mh-chart-title" style={{ margin: 0 }}>Stock boutique vs seuil minimum</p>
            <span className="mh-realtime-badge">Temps réel</span>
          </div>
          {stockBoutiqueChart.length === 0 ? (
            <p className="mh-chart-empty">Aucune donnée</p>
          ) : (
            <div style={{ height: 220 }}>
              <Bar
                data={boutiqueBarData}
                options={{
                  ...mpBarOpts,
                  plugins: {
                    ...mpBarOpts.plugins,
                    legend: { display: true, position: "top", labels: { font: { size: 11 }, boxWidth: 12 } },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
