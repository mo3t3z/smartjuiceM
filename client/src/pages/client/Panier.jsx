import { useState, useEffect } from "react";
import axios from "axios";//appel requette http
import { useNavigate, useLocation } from "react-router-dom";
import { getPanier, savePanier, authHeader, API_COMMANDES, SEUIL_REMISE, TAUX_REMISE } from "../../utils/api";
import "./Panier.css";

// PB18 — Gestion du panier (Client)
// PB19 — Passer une commande en ligne (Client)
export default function Panier() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [welcome, setWelcome] = useState(location.state?.welcome || "");
  const [user, setUser] = useState(null);
  const [nbPanier, setNbPanier] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {//bonjour ..... s'affiche aprés me tamel login
    if (location.state?.welcome) {
      const timer = setTimeout(() => setWelcome(""), 5000);
      return () => clearTimeout(timer);
    }
  }, []);
  const [panier,  setPanier]  = useState([]);
  const [message, setMessage] = useState({ texte: "", type: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {//lit user de local storage si le user est client pour charger notif
      const parsed = JSON.parse(stored);
      if (parsed.role === "client") {
        setUser(parsed);
        fetchNotifications();
      }
    }
    const p = getPanier();//charge panier depuis localstorage
    setPanier(p);
    setNbPanier(p.reduce((a, i) => a + i.quantite, 0));//badge
  }, []);

  useEffect(() => {//recalculation de badge ajout,suppression,qté
    setNbPanier(panier.reduce((a, i) => a + i.quantite, 0));
  }, [panier]);

  const fetchNotifications = async () => {//appeler les notif
    try {
      const res = await axios.get(`${API_COMMANDES}/mes-notifications`, {
        headers: authHeader(),
      });
      setNotifications(res.data);
    } catch { /* silencieux */ }
  };

  const marquerLue = async (id) => {
    try {
      await axios.put(`${API_COMMANDES}/mes-notifications/${id}/lue`, {}, {//lewej al notif bel id w bdl el lue
        headers: authHeader(),
      });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, lue: true } : n));
    } catch { /* silencieux */ }
  };

  const marquerToutesLues = async () => {
    try {//lwj alehom kol w hothom lue
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
//tableau keml te3 notif khali menhom ken el non lue w ehsb 9deh mezl
  const nonLues = notifications.filter((n) => !n.lue).length;

  // somme tous les prix*qte
  const prixTotal = () =>
    panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

  // La remise s'applique uniquement si le total dépasse 200 DT
  const remise = () => prixTotal() > SEUIL_REMISE ? prixTotal() * TAUX_REMISE : 0;

  // Net à payer
  const netAPayer = () => (prixTotal() - remise()).toFixed(2);

  // Modifier la quantité d'un article
  const modifierQuantite = (produitId, delta) => {//delta (+) ely ytnzl aleha
    const nouveauPanier = panier
      .map((item) =>
        item.produitId === produitId
          ? { ...item, quantite: item.quantite + delta }
          : item
      )
      .filter((item) => item.quantite > 0);
    setPanier(nouveauPanier);
    savePanier(nouveauPanier);
  };

  // Supprimer un article du panier
  const supprimerArticle = (produitId) => {
    const nouveauPanier = panier.filter((item) => item.produitId !== produitId);
    setPanier(nouveauPanier);
    savePanier(nouveauPanier);
  };

  // Vider le panier
  const viderPanier = () => {
    setPanier([]);
    savePanier([]);
  };

  // PB19 — Rediriger vers le checkout (ou login si non connecté)
  const passerCommande = () => {
    if (panier.length === 0) {//panier fergh 
      setMessage({ texte: "Votre panier est vide.", type: "erreur" });
      return;
    }//rej3ou lel login kenou msh connecté 
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "client") {
      navigate("/login-client", { state: { from: "/client/panier" } });
      return;
    }//hezou lel checkout kenou connecté
    navigate("/client/checkout");
  };

  const aRemise = prixTotal() > SEUIL_REMISE;

  return (
    <div className="panier-page">
      <header className="panier-header">
        <div className="panier-logo" onClick={() => navigate("/")}>
          <span className="panier-logo-name">SmartJuice</span>
          <span className="panier-logo-sub">Jus naturels frais</span>
        </div>

        <button className="panier-back-btn" onClick={() => navigate("/")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
          Retour au catalogue
        </button>

        <div className="panier-header-right">
          {user ? (
            <div className="panier-user-menu">
              <button className="panier-icon-btn" title={user.email}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="panier-icon-label">Mon compte</span>
              </button>
              <div className="panier-dropdown">
                <button onClick={() => navigate("/client/account")}>Mes informations</button>
                <button onClick={() => navigate("/client/mes-commandes")}>Mes commandes</button>
                <button className="panier-dropdown-logout" onClick={handleLogout}>Déconnexion</button>
              </div>
            </div>
          ) : (
            <button className="panier-icon-btn" onClick={() => navigate("/login-client")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="panier-icon-label">Connexion</span>
            </button>
          )}

          {/* Cloche notifications */}
          {user && (
            <div className="panier-notif-wrapper">
              <button
                className="panier-icon-btn"
                onClick={() => setShowNotifs((v) => !v)}
                title="Notifications"
              >
                <div className="panier-notif-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {nonLues > 0 && <span className="panier-notif-badge">{nonLues}</span>}
                </div>
                <span className="panier-icon-label">Alertes</span>
              </button>

              {showNotifs && (
                <div className="panier-notif-dropdown">
                  <div className="panier-notif-dropdown-header">
                    <span>Notifications</span>
                    {nonLues > 0 && (
                      <button className="panier-notif-lire-tout" onClick={marquerToutesLues}>
                        Tout lire
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="panier-notif-vide">Aucune notification.</p>
                  ) : (
                    <ul className="panier-notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n._id}
                          className={`panier-notif-item ${n.lue ? "panier-notif-item--lue" : ""}`}
                          onClick={() => !n.lue && marquerLue(n._id)}
                        >
                          <p className="panier-notif-msg">{n.message}</p>
                          <span className="panier-notif-date">
                            {new Date(n.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {!n.lue && <span className="panier-notif-dot" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <button className="panier-cart-btn" onClick={() => navigate("/client/panier")} title="Mon panier">
            <div className="panier-cart-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {nbPanier > 0 && <span className="panier-cart-badge">{nbPanier}</span>}
            </div>
            <span className="panier-icon-label">Panier</span>
          </button>
        </div>
      </header>

      {/* Message de bienvenue après connexion */}
      {welcome && (
        <div className="panier-welcome">
          {welcome}
        </div>
      )}

      {/* Bannière remise */}
      <div className="panier-banniere-remise">
        Toute commande dépassant <strong>200 DT</strong> bénéficie d'une remise de <strong>10%</strong>.
      </div>

      {message.texte && (
        <div className={`panier-message panier-message--${message.type}`}>
          {message.texte}
        </div>
      )}

      {panier.length === 0 ? (
        <div className="panier-vide">
          <p>Votre panier est vide.</p>
          <button className="panier-btn-catalogue" onClick={() => navigate("/")}>
            Parcourir le catalogue
          </button>
        </div>
      ) : (
        <div className="panier-content">
          {/* Liste des articles */}
          <div className="panier-liste">
            {panier.map((item) => (
              <div key={item.produitId} className="panier-item">
                {item.image && (
                  <img src={item.image} alt={item.nom} className="panier-item-img" />
                )}
                <div className="panier-item-info">
                  <h3 className="panier-item-nom">{item.nom}</h3>
                  <span className="panier-item-volume">{item.volume}</span>
                  <span className="panier-item-prix">{item.prix} DT / unité</span>
                </div>

                {/* Contrôle de quantité */}
                <div className="panier-item-quantite">
                  <button
                    className="panier-qty-btn"
                    onClick={() => modifierQuantite(item.produitId, -1)}
                  >−</button>
                  <input
                    className="panier-qty-val"
                    type="number"
                    min="1"
                    value={item.quantite}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!val || val < 1) return;
                      const nouveauPanier = panier.map((p) =>
                        p.produitId === item.produitId ? { ...p, quantite: val } : p
                      );
                      setPanier(nouveauPanier);
                      savePanier(nouveauPanier);
                    }}
                  />
                  <button
                    className="panier-qty-btn"
                    onClick={() => modifierQuantite(item.produitId, +1)}
                  >+</button>
                </div>

                <div className="panier-item-sous-total">
                  {(item.prix * item.quantite).toFixed(2)} DT
                </div>

                <button
                  className="panier-suppr-btn"
                  onClick={() => supprimerArticle(item.produitId)}
                  title="Supprimer"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Récapitulatif */}
          <div className="panier-recap">
            <h2 className="panier-recap-title">Récapitulatif</h2>

            <div className="panier-recap-table">
              <div className="panier-recap-row">
                <span>Prix Total</span>
                <span>{prixTotal().toFixed(2)} DT</span>
              </div>

              {aRemise && (
                <div className="panier-recap-row panier-recap-row--remise">
                  <span>Remise (10%)</span>
                  <span>− {remise().toFixed(2)} DT</span>
                </div>
              )}

              <div className="panier-recap-row panier-recap-row--net">
                <span>Net à payer</span>
                <span>{netAPayer()} DT</span>
              </div>
            </div>

            {!JSON.parse(localStorage.getItem("user") || "null") ? (
              <>
                <p className="panier-login-info">
                  Vous devez être <strong>connecté</strong> pour passer une commande.{" "}
                  <button
                    className="panier-login-link"
                    onClick={() => navigate("/login-client", { state: { from: "/client/panier" } })}
                  >
                    Se connecter
                  </button>
                </p>
                <button className="panier-commander-btn panier-commander-btn--disabled" disabled>
                  COMMANDER
                </button>
              </>
            ) : (
              <button className="panier-commander-btn" onClick={passerCommande}>
                COMMANDER
              </button>
            )}

            <button className="panier-vider-btn" onClick={viderPanier}>
              Vider le panier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
