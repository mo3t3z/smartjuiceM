import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import { API_MANAGER as API, authHeader } from "../../utils/api";
import "../../pages/ManagerHome.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

const FILTRES = [
  { key: "jour",     label: "Aujourd'hui" },
  { key: "semaine",  label: "Cette semaine" },
  { key: "mois",     label: "Ce mois" },
  { key: "annuelle", label: "Annuelle" },
];

const FILTRE_LABEL = {
  jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois", annuelle: "Annuelle",
};

export default function ManagerDashboard() {
  const [filtre, setFiltre]         = useState("mois");
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [typeCommande, setTypeCommande]     = useState("physique");
  const [filtreClients, setFiltreClients]   = useState("mois");
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
    caPeriode,
    panierMoyen,
    productionsPeriode,
    transfertsPeriode,
    tauxConfirmation, confirmees, refusees,
    topProduits,
    alertesMP, alertesBoutique, commandesEnAttente,
    caParDate = [],
    caCommandesEnLigne = 0,
    caCommandesPhysique = 0,
    commandesParDate = [],
    topClientsMois = [],
    topClientsAnnuelle = [],
  } = data;
  const topClients = filtreClients === "mois" ? topClientsMois : topClientsAnnuelle;

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

  const caDonutTotal = caPeriode + caCommandesPhysique + caCommandesEnLigne;
  const caDonutData = {
    labels: ["Ventes directes", "Commandes physiques", "Commandes en ligne"],
    datasets: [{
      data: [caPeriode, caCommandesPhysique, caCommandesEnLigne],
      backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"],
      borderWidth: 0,
    }],
  };
  const caDonutOptions = {
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${Number(c.raw).toFixed(2)} DT (${caDonutTotal > 0 ? (c.raw / caDonutTotal * 100).toFixed(1) : 0}%)` } },
    },
    maintainAspectRatio: true,
  };

  const cmdArr = Array.isArray(commandesParDate) ? commandesParDate : [];
  const cmdColor = typeCommande === "physique" ? "#3b82f6" : "#f59e0b";
  const cmdLineData = {
    labels: cmdArr.map((d) => d.label),
    datasets: [{
      label: typeCommande === "physique" ? "Commandes physiques" : "Commandes en ligne",
      data: cmdArr.map((d) => typeCommande === "physique" ? d.physiqueCount : d.enLigneCount),
      borderColor: cmdColor,
      backgroundColor: typeCommande === "physique" ? "rgba(59,130,246,0.08)" : "rgba(245,158,11,0.08)",
      borderWidth: 2,
      pointRadius: filtre === "annuelle" ? 2 : 4,
      pointBackgroundColor: cmdColor,
      fill: true,
      tension: 0,
    }],
  };
  const cmdLineOpts = {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.raw} commande${c.raw > 1 ? "s" : ""}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: { font: { size: 11 }, callback: (v) => `${v}`, stepSize: 1 },
        beginAtZero: true,
      },
    },
    maintainAspectRatio: false,
  };

  const topClientsData = {
    labels: topClients.map((c) => c.nom),
    datasets: [{
      data: topClients.map((c) => c.count),
      backgroundColor: "#7c3aed",
      borderRadius: 6,
    }],
  };
  const topClientsOpts = {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.raw} commande${c.raw > 1 ? "s" : ""}` } },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 }, stepSize: 1 }, title: { display: true, text: "Commandes", font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
    maintainAspectRatio: false,
  };

  const isAnnuelle = filtre === "annuelle";
  const caArr = Array.isArray(caParDate) ? caParDate : [];

  const caLineData = {
    labels: caArr.map((d) => d.label),
    datasets: [{
      label: "CA (DT)",
      data: caArr.map((d) => d.ca),
      borderColor: "#1e3a5f",
      backgroundColor: "rgba(30,58,95,0.08)",
      borderWidth: 2,
      pointRadius: isAnnuelle ? 2 : 4,
      pointBackgroundColor: "#1e3a5f",
      fill: true,
      tension: 0,
    }],
  };
  const caLineOpts = {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${Number(c.raw).toFixed(2)} DT` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: { font: { size: 11 }, callback: (v) => `${v} DT` },
        beginAtZero: true,
      },
    },
    maintainAspectRatio: false,
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
            <span className="mh-kpi-label">{{ jour: "CA du jour", semaine: "CA de la semaine", mois: "CA du mois", annuelle: "CA de l'année" }[filtre]}</span>
            <span className="mh-kpi-value">{caPeriode.toFixed(2)} DT</span>
            <div className="mh-kpi-footer">
              <span className="mh-kpi-sub">Ventes directes</span>
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

      {/* ── Section : Évolution ── */}
      <p className="mh-section-label">Évolution temporelle</p>
      <div className="mh-charts mh-charts--half">

        {/* CA par date */}
        <div className="mh-chart-card">
          <p className="mh-chart-title">
            Chiffre d'affaires —{" "}
            {filtre === "jour" ? "par heure" : filtre === "annuelle" ? "par mois" : "par jour"}
          </p>
          {caArr.length === 0 ? (
            <p className="mh-chart-empty">Aucune vente sur la période</p>
          ) : (
            <div style={{ height: 210 }}>
              <Line data={caLineData} options={caLineOpts} />
            </div>
          )}
        </div>

        {/* Commandes livrées */}
        <div className="mh-chart-card">
          <div className="mh-chart-header">
            <p className="mh-chart-title" style={{ margin: 0 }}>Commandes livrées —{" "}
              {filtre === "jour" ? "par heure" : filtre === "annuelle" ? "par mois" : "par jour"}
            </p>
            <div style={{ display: "flex", gap: 5 }}>
              {[
                { key: "physique", label: "Physique" },
                { key: "en_ligne", label: "En ligne" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeCommande(key)}
                  className={`mh-filter-btn${typeCommande === key ? " mh-filter-btn--active" : ""}`}
                  style={{ fontSize: 10, padding: "3px 9px" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {cmdArr.length === 0 ? (
            <p className="mh-chart-empty">Aucune commande livrée sur la période</p>
          ) : (
            <div style={{ height: 210 }}>
              <Line data={cmdLineData} options={cmdLineOpts} />
            </div>
          )}
        </div>
      </div>

      {/* ── Section : Analyse ── */}
      <p className="mh-section-label">Analyse commerciale</p>
      <div className="mh-charts mh-charts--half">

        {/* Taux de confirmation */}
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

        {/* Top 5 produits */}
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

      {/* ── Section : Répartition CA + Top clients ── */}
      <p className="mh-section-label">Répartition & fidélisation</p>
      <div className="mh-charts mh-charts--half">

        {/* Donut CA par canal */}
        <div className="mh-chart-card">
          <p className="mh-chart-title">CA par canal de vente — {FILTRE_LABEL[filtre]}</p>
          {caDonutTotal === 0 ? (
            <p className="mh-chart-empty">Aucun chiffre d'affaires sur la période</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 180, height: 180 }}>
                <Doughnut data={caDonutData} options={caDonutOptions} />
              </div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Ventes directes",    value: caPeriode,           color: "#3b82f6" },
                  { label: "Commandes physiques", value: caCommandesPhysique, color: "#10b981" },
                  { label: "Commandes en ligne",  value: caCommandesEnLigne,  color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{value.toFixed(2)} DT</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 38, textAlign: "right" }}>
                      {caDonutTotal > 0 ? (value / caDonutTotal * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{caDonutTotal.toFixed(2)} DT</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top clients fidèles */}
        <div className="mh-chart-card">
          <div className="mh-chart-header">
            <p className="mh-chart-title" style={{ margin: 0 }}>Top clients fidèles</p>
            <div style={{ display: "flex", gap: 5 }}>
              {[
                { key: "mois",     label: "Ce mois"     },
                { key: "annuelle", label: "Cette année"  },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltreClients(key)}
                  className={`mh-filter-btn${filtreClients === key ? " mh-filter-btn--active" : ""}`}
                  style={{ fontSize: 10, padding: "3px 9px" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {topClients.length === 0 ? (
            <p className="mh-chart-empty">Aucune commande livrée sur la période</p>
          ) : (
            <div style={{ height: 260 }}>
              <Bar data={topClientsData} options={topClientsOpts} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
