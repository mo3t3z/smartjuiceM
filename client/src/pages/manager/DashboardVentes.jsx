import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES, API_VENTES } from "../../utils/api";
import "./DashboardVentes.css";

// PB25 — Dashboard de suivi des ventes et commandes (Gérant)
export default function DashboardVentes() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchDernieresVentes();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_COMMANDES}/dashboard`, {
        headers: authHeader(),
      });
      setStats(res.data);
    } catch {
      // Gérer silencieusement
    } finally {
      setLoading(false);
    }
  };

  const fetchDernieresVentes = async () => {
    try {
      const res = await axios.get(API_VENTES, { headers: authHeader() });
      // Afficher les 10 dernières ventes
      setVentes(res.data.slice(0, 10));
    } catch {
      // Gérer silencieusement
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  // Libellés des statuts de commandes
  const statutLabels = {
    en_attente: "En attente",
    validee: "Validées",
    refusee: "Refusées",
    en_preparation: "En préparation",
    livree: "Livrées",
  };

  return (
    <div className="dv-page">
      <header className="dv-header">
        <button className="dv-back-btn" onClick={() => navigate("/manager")}>← Accueil</button>
        <h1 className="dv-title">Dashboard Ventes & Commandes</h1>
        <div />
      </header>

      {loading ? (
        <div className="dv-loading">Chargement des statistiques...</div>
      ) : (
        <div className="dv-content">

          {/* ── KPI Ventes directes ──────────────────────────── */}
          <section className="dv-section">
            <h2 className="dv-section-title">Ventes Directes en Boutique</h2>
            <div className="dv-kpi-grid">
              <div className="dv-kpi dv-kpi--blue">
                <span className="dv-kpi-label">Aujourd'hui</span>
                <span className="dv-kpi-value">{stats?.ventes?.jour?.count || 0}</span>
                <span className="dv-kpi-sub">{(stats?.ventes?.jour?.chiffre || 0).toFixed(2)} DT</span>
              </div>
              <div className="dv-kpi dv-kpi--purple">
                <span className="dv-kpi-label">Cette semaine</span>
                <span className="dv-kpi-value">{stats?.ventes?.semaine?.count || 0}</span>
                <span className="dv-kpi-sub">{(stats?.ventes?.semaine?.chiffre || 0).toFixed(2)} DT</span>
              </div>
              <div className="dv-kpi dv-kpi--green">
                <span className="dv-kpi-label">Ce mois</span>
                <span className="dv-kpi-value">{stats?.ventes?.mois?.count || 0}</span>
                <span className="dv-kpi-sub">{(stats?.ventes?.mois?.chiffre || 0).toFixed(2)} DT</span>
              </div>
              <div className="dv-kpi dv-kpi--orange">
                <span className="dv-kpi-label">Total global</span>
                <span className="dv-kpi-value">{stats?.ventes?.total?.count || 0}</span>
                <span className="dv-kpi-sub">{(stats?.ventes?.total?.chiffre || 0).toFixed(2)} DT</span>
              </div>
            </div>
          </section>

          {/* ── Statuts des commandes ─────────────────────────── */}
          <section className="dv-section">
            <h2 className="dv-section-title">Commandes par Statut</h2>
            <div className="dv-statuts-grid">
              {(stats?.commandes?.parStatut || []).map((s) => (
                <div key={s._id} className={`dv-statut-card dv-statut--${s._id}`}>
                  <span className="dv-statut-label">{statutLabels[s._id] || s._id}</span>
                  <span className="dv-statut-count">{s.count}</span>
                  <span className="dv-statut-ca">{(s.chiffre || 0).toFixed(2)} DT</span>
                </div>
              ))}
            </div>

            {/* Commandes du mois */}
            <div className="dv-mois-summary">
              <strong>Commandes ce mois :</strong>{" "}
              {stats?.commandes?.mois?.count || 0} commandes —{" "}
              {(stats?.commandes?.mois?.chiffre || 0).toFixed(2)} DT
            </div>
          </section>

          {/* ── Top produits vendus ───────────────────────────── */}
          {stats?.produitsTop?.length > 0 && (
            <section className="dv-section">
              <h2 className="dv-section-title">Top Produits (ventes directes)</h2>
              <div className="dv-top-produits">
                {stats.produitsTop.map((p, i) => (
                  <div key={p._id} className="dv-top-item">
                    <span className="dv-top-rang">{i + 1}</span>
                    <span className="dv-top-nom">{p._id}</span>
                    <span className="dv-top-qte">{p.totalQte} unités</span>
                    <span className="dv-top-ca">{p.totalCA.toFixed(2)} DT</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Évolution journalière ─────────────────────────── */}
          {stats?.evolutionJournaliere?.length > 0 && (
            <section className="dv-section">
              <h2 className="dv-section-title">Évolution journalière (30 derniers jours)</h2>
              <div className="dv-evolution-table">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Nb ventes</th>
                      <th>Chiffre d'affaires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.evolutionJournaliere.slice(-10).reverse().map((j) => (
                      <tr key={j._id}>
                        <td>{j._id}</td>
                        <td>{j.count}</td>
                        <td>{j.chiffre.toFixed(2)} DT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Dernières ventes ──────────────────────────────── */}
          <section className="dv-section">
            <h2 className="dv-section-title">
              Dernières ventes
              <button className="dv-voir-tout" onClick={() => navigate("/manager/ventes")}>
                Voir tout →
              </button>
            </h2>
            {ventes.length === 0 ? (
              <p className="dv-vide">Aucune vente enregistrée.</p>
            ) : (
              <div className="dv-ventes-liste">
                {ventes.map((v) => (
                  <div key={v._id} className="dv-vente-row">
                    <span className="dv-vente-date">{formatDate(v.dateVente)}</span>
                    <span className="dv-vente-vendeur">
                      {v.vendeur?.nom || ""} {v.vendeur?.prenom || ""}
                    </span>
                    <span className="dv-vente-produits">
                      {v.produits.map((p) => `${p.nom} ×${p.quantite}`).join(", ")}
                    </span>
                    <span className="dv-vente-total">{v.total.toFixed(2)} DT</span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
