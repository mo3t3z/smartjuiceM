import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES, getNbArticlesPanier } from "../../utils/api";
import "./MesCommandes.css";

// PB21 — Suivre l'état de ses commandes (Client)
export default function MesCommandes() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [user, setUser] = useState(null);
  const [nbPanier, setNbPanier] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/login-client"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== "client") { navigate("/login-client"); return; }
    setUser(parsed);
    setNbPanier(getNbArticlesPanier());
    fetchCommandes();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchCommandes = async () => {
    try {
      const res = await axios.get(`${API_COMMANDES}/mes-commandes`, {
        headers: authHeader(),
      });
      setCommandes(res.data);
    } catch {
      setErreur("Impossible de charger vos commandes.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login-client");
  };

  const nonLues = notifications.filter((n) => !n.lue).length;

  const statutConfig = {
    en_attente:     { label: "En attente",     couleur: "gray"   },
    validee:        { label: "En cours",        couleur: "blue"   },
    prete:          { label: "Prête",           couleur: "teal"   },
    livree:         { label: "Livrée",          couleur: "green"  },
    refusee:        { label: "Refusée",         couleur: "red"    },
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("fr-TN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  const totalArticles = (cmd) =>
    cmd.produits.reduce((s, p) => s + p.quantite, 0);

  return (
    <div className="mc-page">

      {/* ══════════════ HEADER ══════════════ */}
      <header className="mc-header">
        <div className="mc-logo" onClick={() => navigate("/")}>
          <span className="mc-logo-name">SmartJuice</span>
          <span className="mc-logo-sub">Jus naturels frais</span>
        </div>

        <button className="mc-back-btn" onClick={() => navigate("/")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
          Retour au catalogue
        </button>

        <div className="mc-header-right">
          {user ? (
            <div className="mc-user-menu">
              <button className="mc-icon-btn" title={user.email}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="mc-icon-label">Mon compte</span>
              </button>
              <div className="mc-dropdown">
                <button onClick={() => navigate("/client/account")}>Mes informations</button>
                <button onClick={() => navigate("/client/mes-commandes")}>Mes commandes</button>
                <button className="mc-dropdown-logout" onClick={handleLogout}>Déconnexion</button>
              </div>
            </div>
          ) : (
            <button className="mc-icon-btn" onClick={() => navigate("/login-client")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="mc-icon-label">Connexion</span>
            </button>
          )}

          {/* Cloche notifications */}
          {user && (
            <div className="mc-notif-wrapper">
              <button
                className="mc-icon-btn mc-notif-btn"
                onClick={() => setShowNotifs((v) => !v)}
                title="Notifications"
              >
                <div className="mc-notif-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {nonLues > 0 && <span className="mc-notif-badge">{nonLues}</span>}
                </div>
                <span className="mc-icon-label">Alertes</span>
              </button>

              {showNotifs && (
                <div className="mc-notif-dropdown">
                  <div className="mc-notif-dropdown-header">
                    <span>Notifications</span>
                    {nonLues > 0 && (
                      <button className="mc-notif-lire-tout" onClick={marquerToutesLues}>
                        Tout lire
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="mc-notif-vide">Aucune notification.</p>
                  ) : (
                    <ul className="mc-notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n._id}
                          className={`mc-notif-item ${n.lue ? "mc-notif-item--lue" : ""}`}
                          onClick={() => !n.lue && marquerLue(n._id)}
                        >
                          <p className="mc-notif-msg">{n.message}</p>
                          <span className="mc-notif-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {!n.lue && <span className="mc-notif-dot" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <button className="mc-cart-btn" onClick={() => navigate("/client/panier")} title="Mon panier">
            <div className="mc-cart-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {nbPanier > 0 && <span className="mc-cart-badge">{nbPanier}</span>}
            </div>
            <span className="mc-icon-label">Panier</span>
          </button>
        </div>
      </header>

      {/* ══════════════ CONTENU ══════════════ */}
      <div className="mc-content">
        <h1 className="mc-title">Mes Commandes</h1>

        {loading ? (
          <div className="mc-loading">Chargement...</div>
        ) : erreur ? (
          <div className="mc-erreur">{erreur}</div>
        ) : commandes.length === 0 ? (
          <div className="mc-vide">
            <p>Vous n'avez pas encore passé de commande.</p>
            <button className="mc-btn-catalogue" onClick={() => navigate("/")}>
              Parcourir le catalogue
            </button>
          </div>
        ) : (
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Produits</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th className="mc-th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((cmd) => {
                  const cfg = statutConfig[cmd.statut] || { label: cmd.statut, couleur: "gray" };
                  const nb = totalArticles(cmd);
                  const isExpanded = expandedId === cmd._id;
                  return (
                    <>
                      <tr key={cmd._id} className="mc-tr">
                        <td className="mc-td-id">CMD-{cmd._id.slice(-3).toUpperCase()}</td>
                        <td className="mc-td-date">{formatDate(cmd.createdAt)}</td>
                        <td className="mc-td-produits">{nb} {nb > 1 ? "articles" : "article"}</td>
                        <td className="mc-td-total">{cmd.total.toFixed(3)} DT</td>
                        <td>
                          <span className={`mc-badge mc-badge--${cfg.couleur}`}>{cfg.label}</span>
                        </td>
                        <td className="mc-td-action">
                          <button
                            className="mc-details-btn"
                            onClick={() => setExpandedId(isExpanded ? null : cmd._id)}
                          >
                            Détails
                          </button>
                          <div className="mc-menu-wrap" ref={menuId === cmd._id ? menuRef : null}>
                            <button
                              className="mc-dots-btn"
                              onClick={() => setMenuId(menuId === cmd._id ? null : cmd._id)}
                            >
                              ⋮
                            </button>
                            {menuId === cmd._id && (
                              <div className="mc-menu-dropdown">
                                <button onClick={() => { setExpandedId(cmd._id); setMenuId(null); }}>
                                  Voir les détails
                                </button>
                                {cmd.statut === "refusee" && cmd.commentaireRefus && (
                                  <button>Motif : {cmd.commentaireRefus}</button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${cmd._id}-detail`} className="mc-tr-detail">
                          <td colSpan={6}>
                            <div className="mc-detail-inner">
                              <div className="mc-detail-produits">
                                {cmd.produits.map((p, i) => (
                                  <div key={i} className="mc-detail-row">
                                    <span className="mc-det-nom">{p.nom}</span>
                                    <span className="mc-det-vol">{p.volume}</span>
                                    <span className="mc-det-qte">× {p.quantite}</span>
                                    <span className="mc-det-prix">{(p.prixUnitaire * p.quantite).toFixed(3)} DT</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mc-detail-footer">
                                <span className="mc-detail-mode">
                                  {cmd.modeRemise === "livraison"
                                    ? `Livraison — ${cmd.adresseLivraison}`
                                    : "Récupération"}
                                </span>
                                {cmd.remise > 0 && (
                                  <span className="mc-detail-remise">
                                    Remise (10%) : − {cmd.remise.toFixed(3)} DT
                                  </span>
                                )}
                                {cmd.modeRemise === "livraison" && cmd.fraisLivraison > 0 && (
                                  <span className="mc-detail-frais">
                                    Frais : {cmd.fraisLivraison.toFixed(3)} DT
                                  </span>
                                )}
                                <span className="mc-detail-total">Total : {cmd.total.toFixed(3)} DT</span>
                              </div>
                              {cmd.statut === "refusee" && cmd.commentaireRefus && (
                                <div className="mc-detail-refus">Motif : {cmd.commentaireRefus}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
