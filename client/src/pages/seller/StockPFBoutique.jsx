import { useEffect, useState } from "react";
import "./StockPFBoutique.css";
import { API_SELLER, authHeader } from "../../utils/api";
const API = API_SELLER;

export default function StockPFBoutique() {
  const [jusList, setJusList]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    fetch(`${API}/stock/pf`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setJusList(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);


  return (
    <div className="spfb-page">

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


                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
