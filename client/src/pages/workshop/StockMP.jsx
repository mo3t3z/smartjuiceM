import { useEffect, useState } from "react";
import "./StockMP.css";
import { API_WORKSHOP, authHeader } from "../../utils/api";
const API = API_WORKSHOP;

export default function StockMP() {
  const [types, setTypes]         = useState([]);
  const [stockMap, setStockMap]   = useState({});   // { "Oranges||kg": { disponible, unite } }
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

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


                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
