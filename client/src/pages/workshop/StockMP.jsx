import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StockMP.css";
import { API_WORKSHOP, authHeader } from "../../utils/api";
const API = API_WORKSHOP;

export default function StockMP() {
  const navigate = useNavigate();
  const [types, setTypes]       = useState([]);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [resTypes, resStock] = await Promise.all([
          fetch(`${API}/types-mp`, { headers: authHeader() }),
          fetch(`${API}/matieres-premieres/disponible`, { headers: authHeader() }),
        ]);
        if (!resTypes.ok) throw new Error("Erreur chargement types.");
        if (!resStock.ok) throw new Error("Erreur chargement stock.");
        setTypes(await resTypes.json());
        setStockList(await resStock.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStockForType = (nom) => stockList.filter((s) => s.type === nom);

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
          <button className="smp-back-btn" onClick={() => navigate("/workshop/stock")}>← Retour</button>
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
              const stocks = getStockForType(typeObj.nom);
              const isNegOrZero = stocks.length === 0 || stocks.every((s) => s.disponible <= 0);
              return (
                <div key={typeObj._id} className={`smp-card ${isNegOrZero ? "smp-card--low" : "smp-card--ok"}`}>
                  <div className="smp-card-top">
                    <div className={`smp-card-status ${isNegOrZero ? "smp-status--low" : "smp-status--ok"}`}>
                      {isNegOrZero ? "Stock bas" : "En stock"}
                    </div>
                  </div>
                  <h3 className="smp-card-name">{typeObj.nom}</h3>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
