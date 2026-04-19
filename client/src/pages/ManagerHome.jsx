import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Filler, Tooltip, Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { API_MANAGER, authHeader } from "../utils/api";
import "./ManagerHome.css";

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Filler, Tooltip, Legend
);

const SAISON_LABEL = { jour: "Aujourd'hui", mois: "Ce mois", saison: "Cette saison" };

function TrendBadge({ trend }) {
  if (trend === null || trend === undefined) return null;
  const pos = trend >= 0;
  return (
    <span className={`mh-trend ${pos ? "mh-trend--up" : "mh-trend--down"}`}>
      {pos ? "↑" : "↓"} {Math.abs(trend)}%
    </span>
  );
}

export default function ManagerHome() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filtre, setFiltre]     = useState("mois");
  const chartRef1 = useRef(null);

  const fetchData = (f) => {
    setLoading(true);
    fetch(`${API_MANAGER}/dashboard?filtre=${f}`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Impossible de charger le tableau de bord."); setLoading(false); });
  };

  useEffect(() => { fetchData(filtre); }, [filtre]);

  if (loading) return <div className="mh-welcome-page"><div className="mh-spinner" /></div>;
  if (error)   return <div className="mh-welcome-page"><p className="mh-error">{error}</p></div>;

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  const kpiCards = [
    {
      label: "CA du jour", value: `${data.caJour.toFixed(2)} DT`,
      trend: data.trendJour, sub: "Ventes directes aujourd'hui", color: "blue",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
    {
      label: "CA du mois", value: `${data.caMois.toFixed(2)} DT`,
      sub: "Ventes + commandes livrées", color: "teal",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    },
    {
      label: "Commandes en attente", value: data.commandesEnAttente,
      sub: "À valider ou refuser",
      color: data.commandesEnAttente > 0 ? "orange" : "green",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    },
    {
      label: "Productions ce mois", value: `${data.productionsMois} L`,
      sub: "Litres produits en atelier", color: "purple",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/></svg>,
    },
    {
      label: "Transferts ce mois", value: `${data.transfertsMois} L`,
      sub: "Atelier → Boutique", color: "indigo",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    },
    {
      label: "Panier moyen", value: `${data.panierMoyen.toFixed(2)} DT`,
      sub: "Ventes + commandes ce mois", color: "pink",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    },
  ];

  // ── Chart 1 — CA Line ──────────────────────────────────────────────────────
  const lineLabels = (data.evolutionCA || []).map((d) =>
    new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
  );
  const lineValues = (data.evolutionCA || []).map((d) => d.total);
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: "CA (DT)",
      data: lineValues,
      borderColor: "#1e3a5f",
      borderWidth: 2.5,
      pointBackgroundColor: "#1e3a5f",
      pointRadius: 4,
      tension: 0.4,
      fill: true,
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return "transparent";
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, "rgba(30,58,95,0.18)");
        gradient.addColorStop(1, "rgba(30,58,95,0)");
        return gradient;
      },
    }],
  };
  const lineOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y.toFixed(2)} DT` } } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => `${v} DT` }, grid: { color: "#f5f5f5" } },
      x: { grid: { display: false } },
    },
  };

  // ── Chart 2 — Top produits bar horizontal ─────────────────────────────────
  const topBarData = {
    labels: (data.topProduits || []).map((p) => p._id),
    datasets: [{
      label: "Quantité (L)",
      data: (data.topProduits || []).map((p) => p.totalQte),
      backgroundColor: ["#1e3a5f","#0d9488","#7c3aed","#db2777","#ea580c"],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const topBarOpts = {
    indexAxis: "y",
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.x} L` } } },
    scales: { x: { beginAtZero: true, ticks: { callback: (v) => `${v} L` }, grid: { color: "#f5f5f5" } }, y: { grid: { display: false } } },
  };

  // ── Chart 3 — Stock MP ────────────────────────────────────────────────────
  const stockMPData = {
    labels: (data.stockMPChart || []).map((s) => s.nom),
    datasets: [
      {
        label: "Disponible",
        data: (data.stockMPChart || []).map((s) => s.disponible),
        backgroundColor: (data.stockMPChart || []).map((s) =>
          s.disponible < s.seuil ? "rgba(220,38,38,0.75)" : "rgba(13,148,136,0.75)"
        ),
        borderRadius: 6, borderSkipped: false,
      },
      {
        label: "Seuil min",
        data: (data.stockMPChart || []).map((s) => s.seuil),
        backgroundColor: "rgba(148,163,184,0.35)",
        borderRadius: 6, borderSkipped: false,
      },
    ],
  };
  const stockOpts = {
    responsive: true,
    plugins: { legend: { position: "top", labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y} L` } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v} L` }, grid: { color: "#f5f5f5" } }, x: { grid: { display: false } } },
  };

  // ── Chart 4 — Stock Boutique ──────────────────────────────────────────────
  const stockBoutiqueData = {
    labels: (data.stockBoutiqueChart || []).map((s) => s.nom),
    datasets: [
      {
        label: "Disponible",
        data: (data.stockBoutiqueChart || []).map((s) => s.disponible),
        backgroundColor: (data.stockBoutiqueChart || []).map((s) =>
          s.disponible < s.seuil ? "rgba(220,38,38,0.75)" : "rgba(30,58,95,0.75)"
        ),
        borderRadius: 6, borderSkipped: false,
      },
      {
        label: "Seuil min",
        data: (data.stockBoutiqueChart || []).map((s) => s.seuil),
        backgroundColor: "rgba(148,163,184,0.35)",
        borderRadius: 6, borderSkipped: false,
      },
    ],
  };

  const hasAlertes = (data.alertesMP?.length > 0) || (data.alertesBoutique?.length > 0);

  return (
    <div className="mh-dashboard">

      {/* Header */}
      <div className="mh-header">
        <div>
          <h2 className="mh-title">Tableau de bord</h2>
          <p className="mh-sub">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Alertes */}
      {hasAlertes && (
        <div className="mh-alertes">
          <span className="mh-alertes-title">⚠ Alertes</span>
          <div className="mh-alertes-list">
            {(data.alertesMP || []).map((a) => (
              <span key={a.nom} className="mh-alerte-item mh-alerte--red">
                🔴 Stock MP critique — {a.nom} ({a.disponible} / {a.seuil} {a.unite})
              </span>
            ))}
            {data.commandesEnAttente > 0 && (
              <span className="mh-alerte-item mh-alerte--orange">
                🟠 {data.commandesEnAttente} commande{data.commandesEnAttente > 1 ? "s" : ""} en attente
              </span>
            )}
            {(data.alertesBoutique || []).map((a) => (
              <span key={a.nom} className="mh-alerte-item mh-alerte--red">
                🔴 Stock Boutique critique — {a.nom} ({a.disponible} / {a.seuil} L)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="mh-kpi-grid">
        {kpiCards.map((card) => (
          <div key={card.label} className={`mh-kpi-card mh-kpi--${card.color}`}>
            <div className="mh-kpi-icon">{card.icon}</div>
            <div className="mh-kpi-body">
              <span className="mh-kpi-label">{card.label}</span>
              <span className="mh-kpi-value">{card.value}</span>
              <div className="mh-kpi-footer">
                <span className="mh-kpi-sub">{card.sub}</span>
                {card.trend !== undefined && <TrendBadge trend={card.trend} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI 7 — Produit le plus vendu avec filtre */}
      <div className="mh-top-produit-card">
        <div className="mh-top-produit-left">
          <span className="mh-kpi-label">Produit le plus vendu</span>
          {data.topProduit
            ? <>
                <span className="mh-top-produit-nom">{data.topProduit.nom}</span>
                <span className="mh-top-produit-qte">{data.topProduit.qte} L vendus — {SAISON_LABEL[filtre]}</span>
              </>
            : <span className="mh-top-produit-qte">Aucune vente</span>
          }
        </div>
        <div className="mh-top-produit-filters">
          {["jour", "mois", "saison"].map((f) => (
            <button
              key={f}
              className={`mh-filter-btn ${filtre === f ? "mh-filter-btn--active" : ""}`}
              onClick={() => setFiltre(f)}
            >
              {SAISON_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1 — CA Line + Top produits */}
      <div className="mh-charts mh-charts--row1">
        <div className="mh-chart-card">
          <h3 className="mh-chart-title">Chiffre d'affaires — 7 derniers jours</h3>
          <Line ref={chartRef1} data={lineData} options={lineOpts} />
        </div>
        <div className="mh-chart-card">
          <h3 className="mh-chart-title">Top 5 produits vendus</h3>
          {data.topProduits?.length > 0
            ? <Bar data={topBarData} options={topBarOpts} />
            : <p className="mh-chart-empty">Aucune vente enregistrée.</p>}
        </div>
      </div>

      {/* Row 2 — Stock MP + Stock Boutique */}
      <div className="mh-charts mh-charts--row2">
        <div className="mh-chart-card">
          <h3 className="mh-chart-title">Stock matières premières vs seuil</h3>
          {data.stockMPChart?.length > 0
            ? <Bar data={stockMPData} options={stockOpts} />
            : <p className="mh-chart-empty">Aucune matière première.</p>}
        </div>
        <div className="mh-chart-card">
          <h3 className="mh-chart-title">Stock boutique vs seuil minimum</h3>
          {data.stockBoutiqueChart?.length > 0
            ? <Bar data={stockBoutiqueData} options={{ ...stockOpts }} />
            : <p className="mh-chart-empty">Aucun stock boutique.</p>}
        </div>
      </div>

    </div>
  );
}
