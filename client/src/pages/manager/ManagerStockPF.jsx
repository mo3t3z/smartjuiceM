import { useEffect, useState } from "react";
import "../workshop/StockPF.css";
import { API_MANAGER, authHeader } from "../../utils/api";
const API = API_MANAGER;

export default function ManagerStockPF() {
  const [jusList, setJusList]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

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


                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
