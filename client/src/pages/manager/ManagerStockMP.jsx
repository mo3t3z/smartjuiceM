import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../workshop/StockMP.css";
import { API_MANAGER, authHeader } from "../../utils/api";
const API = API_MANAGER;

export default function ManagerStockMP() {
  const navigate = useNavigate();
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/stock/mp`, { headers: authHeader() });
        if (!res.ok) throw new Error("Erreur chargement stock.");
        setStockList(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const types = [...new Set(stockList.map((s) => s.type))];
  const getStocksForType = (type) => stockList.filter((s) => s.type === type);

  return (
    <div className="smp-page">
      <div className="smp-content">
        <div className="smp-top">
          <div className="smp-title-block">
            <div>
              <h2 className="smp-title">Stock Matières Premières</h2>
              <p className="smp-subtitle">Stock disponible par type de matière première</p>
            </div>
          </div>
          <button className="smp-back-btn" onClick={() => navigate("/manager/stocks")}>← Retour</button>
        </div>

        {error && <div className="smp-error">{error}</div>}
        {loading && <div className="smp-loader">Chargement du stock...</div>}

        {!loading && types.length === 0 && (
          <div className="smp-empty">
            <p>Aucune matière première en stock.</p>
          </div>
        )}

        {!loading && types.length > 0 && (
          <div className="smp-grid">
            {types.map((type) => {
              const stocks = getStocksForType(type);
              const isNegOrZero = stocks.every((s) => s.disponible <= 0);
              return (
                <div key={type} className={`smp-card ${isNegOrZero ? "smp-card--low" : "smp-card--ok"}`}>
                  <div className="smp-card-top">
                    <div className={`smp-card-status ${isNegOrZero ? "smp-status--low" : "smp-status--ok"}`}>
                      {isNegOrZero ? "Stock bas" : "En stock"}
                    </div>
                  </div>
                  <h3 className="smp-card-name">{type}</h3>
                  <div className="smp-card-stocks">
                    {stocks.map((s, i) => (
                      <div key={i} className={`smp-card-qty ${s.disponible <= 0 ? "smp-card-qty--zero" : ""}`}>
                        <span className="smp-qty-num">{s.disponible % 1 === 0 ? s.disponible : s.disponible.toFixed(2)}</span>
                        <span className="smp-qty-unit">{s.unite}</span>
                      </div>
                    ))}
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
