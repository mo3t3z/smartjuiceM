import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getPanier, savePanier, getNbArticlesPanier, API_COMMANDES, API_PRODUCTS, authHeader } from "../utils/api";
import "./CatalogClient.css";

export default function CatalogClient() {
  const navigate = useNavigate();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [user, setUser]           = useState(null);
  // Panier synchronisé en local pour afficher les contrôles de quantité sur la carte
  const [panier, setPanier]       = useState([]);
  const [nbPanier, setNbPanier]   = useState(0);
  const [searchQuery, setSearch]  = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    fetchCatalog();
    checkUser();
    const p = getPanier();
    setPanier(p);
    setNbPanier(p.reduce((a, i) => a + i.quantite, 0));
  }, []);

  useEffect(() => {
    if (user && user.role === "client") {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_COMMANDES}/mes-notifications`, {
        headers: authHeader(),
      });
      setNotifications(res.data);
    } catch { /* silencieux */ }
  };

  const marquerLue = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/mes-notifications/${id}/lue`, {}, {
        headers: authHeader(),
      });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, lue: true } : n));
    } catch { /* silencieux */ }
  };

  const marquerToutesLues = async () => {
    try {
      await axios.put(`${API_COMMANDES}/mes-notifications/lues`, {}, {
        headers: authHeader(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch { /* silencieux */ }
  };

  const nonLues = notifications.filter((n) => !n.lue).length;

  const checkUser = () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role === "client") setUser(parsed);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const fetchCatalog = async () => {
    try {
      const res = await axios.get(`${API_PRODUCTS}/catalog`);
      setProducts(res.data);
    } catch {
      setError("Impossible de charger le catalogue");
    } finally {
      setLoading(false);
    }
  };

  // Récupère la quantité d'un produit dans le panier
  const getQte = (produitId) => {
    const item = panier.find((p) => p.produitId === produitId);
    return item ? item.quantite : 0;
  };

  // Synchronise l'état local et localStorage
  const syncPanier = (newPanier) => {
    savePanier(newPanier);
    setPanier(newPanier);
    setNbPanier(newPanier.reduce((a, i) => a + i.quantite, 0));
  };

  // PB18 — Ajouter au panier (première fois)
  const handleAjouter = (produit) => {
    const newPanier = [...panier, {
      produitId: produit._id,
      nom: produit.name,
      prix: produit.price,
      volume: produit.volume,
      image: produit.image || "",
      quantite: 1,
    }];
    syncPanier(newPanier);
  };

  // PB18 — Incrémenter la quantité sur la carte
  const handleIncrement = (produitId) => {
    const newPanier = panier.map((p) =>
      p.produitId === produitId ? { ...p, quantite: p.quantite + 1 } : p
    );
    syncPanier(newPanier);
  };

  // PB18 — Décrémenter (supprime si quantité = 0)
  const handleDecrement = (produitId) => {
    const newPanier = panier
      .map((p) => p.produitId === produitId ? { ...p, quantite: p.quantite - 1 } : p)
      .filter((p) => p.quantite > 0);
    syncPanier(newPanier);
  };

  // Filtrage par recherche
  const produitsFiltres = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sj-page">

      {/* ══════════════ HEADER ══════════════ */}
      <header className="sj-header">
        {/* Logo */}
        <div className="sj-logo" onClick={() => navigate("/")}>
          <div className="sj-logo-text">
            <span className="sj-logo-name">SmartJuice</span>
            <span className="sj-logo-sub">Jus naturels frais</span>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="sj-search-bar">
          <svg className="sj-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sj-search-input"
            placeholder="Rechercher un jus..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Actions à droite */}
        <div className="sj-header-right">
          {/* Icône Compte */}
          {user ? (
            <div className="sj-user-menu">
              <button className="sj-icon-btn" title={user.email}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="sj-icon-label">Mon compte</span>
              </button>
              <div className="sj-dropdown">
                <button onClick={() => navigate("/client/account")}>Mes informations</button>
                <button onClick={() => navigate("/client/mes-commandes")}>Mes commandes</button>
                <button className="sj-dropdown-logout" onClick={handleLogout}>Déconnexion</button>
              </div>
            </div>
          ) : (
            <button className="sj-icon-btn" onClick={() => navigate("/login-client")} title="Connexion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="sj-icon-label">Connexion</span>
            </button>
          )}


          {/* Cloche notifications */}
          {user && (
            <div className="sj-notif-wrapper">
              <button
                className="sj-icon-btn sj-notif-btn"
                onClick={() => setShowNotifs((v) => !v)}
                title="Notifications"
              >
                <div className="sj-notif-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {nonLues > 0 && <span className="sj-notif-badge">{nonLues}</span>}
                </div>
              </button>

              {showNotifs && (
                <div className="sj-notif-dropdown">
                  <div className="sj-notif-dropdown-header">
                    <span>Notifications</span>
                    {nonLues > 0 && (
                      <button className="sj-notif-lire-tout" onClick={marquerToutesLues}>
                        Tout lire
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="sj-notif-vide">Aucune notification.</p>
                  ) : (
                    <ul className="sj-notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n._id}
                          className={`sj-notif-item ${n.lue ? "sj-notif-item--lue" : ""}`}
                          onClick={() => !n.lue && marquerLue(n._id)}
                        >
                          <p className="sj-notif-msg">{n.message}</p>
                          <span className="sj-notif-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {!n.lue && <span className="sj-notif-dot" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Panier avec badge */}
          <button
            className="sj-cart-btn"
            onClick={() => navigate("/client/panier")}
            title="Mon panier"
          >
            <div className="sj-cart-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {nbPanier > 0 && (
                <span className="sj-cart-badge">{nbPanier}</span>
              )}
            </div>
            <span className="sj-icon-label">Panier</span>
          </button>
        </div>
      </header>

      {/* ══════════════ BANNIÈRE ══════════════ */}
      <div className="sj-banner">
        <div className="sj-banner-content">
          <h2 className="sj-banner-title">Nos Jus Naturels Frais</h2>
          <p className="sj-banner-sub">Préparés chaque jour avec des fruits sélectionnés</p>
        </div>
      </div>

      {/* ══════════════ CATALOGUE ══════════════ */}
      <main className="sj-main">
        {error && <div className="sj-error">{error}</div>}

        {loading ? (
          <div className="sj-loading">
            <div className="sj-spinner" />
            <p>Chargement du catalogue...</p>
          </div>
        ) : produitsFiltres.length === 0 ? (
          <div className="sj-empty">
            <p>Aucun produit trouvé.</p>
          </div>
        ) : (
          <div className="sj-grid">
            {produitsFiltres.map((product) => {
              const qte = getQte(product._id);
              return (
                <div key={product._id} className="sj-card">
                  {/* Zone image */}
                  <div className="sj-card-img-zone">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="sj-card-img"
                      />
                    ) : (
                      <div className="sj-card-img-placeholder">🍹</div>
                    )}
                    {/* Badge volume */}
                    <span className="sj-volume-badge">{product.volume}</span>
                  </div>

                  {/* Infos produit */}
                  <div className="sj-card-body">
                    <h3 className="sj-card-name">{product.name}</h3>
                    {product.description && (
                      <p className="sj-card-desc">{product.description}</p>
                    )}

                    {/* Prix + bouton */}
                    <div className="sj-card-footer">
                      <span className="sj-card-price">
                        {product.price.toFixed(3)} <span className="sj-currency">DT</span>
                      </span>

                      {/* Si le produit est déjà dans le panier → contrôle quantité inline */}
                      {qte > 0 ? (
                        <div className="sj-qty-control">
                          <button
                            className="sj-qty-btn sj-qty-minus"
                            onClick={() => handleDecrement(product._id)}
                          >−</button>
                          <input
                            className="sj-qty-val"
                            type="number"
                            min="1"
                            value={qte}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!val || val < 1) return;
                              const newPanier = panier.map((p) =>
                                p.produitId === product._id ? { ...p, quantite: val } : p
                              );
                              syncPanier(newPanier);
                            }}
                          />
                          <button
                            className="sj-qty-btn sj-qty-plus"
                            onClick={() => handleIncrement(product._id)}
                          >+</button>
                        </div>
                      ) : (
                        /* Bouton panier */
                        <button
                          className="sj-add-btn"
                          onClick={() => handleAjouter(product)}
                          title="Ajouter au panier"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="sj-footer">
        <p>© 2026 SmartJuice — Jus naturels de qualité</p>
      </footer>
    </div>
  );
}
