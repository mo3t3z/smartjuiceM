# Cours Frontend — SmartJuice
> Apprendre toutes les technologies utilisées dans le projet à travers le vrai code

---

## Table des matières

1. [React 19 — Framework UI](#1-react-19--framework-ui)
2. [Vite — Bundler & Dev Server](#2-vite--bundler--dev-server)
3. [React Router DOM v7 — Routing](#3-react-router-dom-v7--routing)
4. [Axios — Appels HTTP](#4-axios--appels-http)
5. [Chart.js + react-chartjs-2 — Graphiques](#5-chartjs--react-chartjs-2--graphiques)
6. [CSS par composant — Styles](#6-css-par-composant--styles)
7. [Hooks personnalisés](#7-hooks-personnalisés)
8. [localStorage — Persistance côté client](#8-localstorage--persistance-côté-client)

---

## 1. React 19 — Framework UI

### Qu'est-ce que React ?

React est une bibliothèque JavaScript pour construire des interfaces utilisateur.
Le principe central : l'interface est **une fonction de l'état**.

```
UI = f(state)
```

Quand l'état change → React recalcule et met à jour le DOM automatiquement.

---

### 1.1 Composant fonctionnel

Un composant est une **fonction JavaScript** qui retourne du **JSX** (HTML dans le JS).

```jsx
// Structure de base d'un composant
export default function MonComposant() {
  return (
    <div className="ma-classe">
      <h1>Bonjour SmartJuice</h1>
    </div>
  );
}
```

**Dans le projet** — Exemple tiré de `ManagerHome.jsx` :

```jsx
// Un sous-composant simple, défini dans le même fichier
function TrendBadge({ trend }) {
  if (trend === null || trend === undefined) return null;

  const pos = trend >= 0;

  return (
    <span className={`mh-trend ${pos ? "mh-trend--up" : "mh-trend--down"}`}>
      {pos ? "↑" : "↓"} {Math.abs(trend)}%
    </span>
  );
}
```

> **Règles JSX :**
> - `class` devient `className`
> - Les expressions JS s'écrivent entre `{ }`
> - Un composant doit retourner **un seul élément racine** (ou `<>...</>`)

---

### 1.2 Props — Passer des données entre composants

Les props sont les **paramètres** d'un composant. Elles descendent du parent vers l'enfant.

```jsx
// Définition du composant enfant
function TrendBadge({ trend }) {   // "trend" est une prop
  return <span>{trend}%</span>;
}

// Utilisation dans le parent
<TrendBadge trend={data.trendJour} />
```

**Dans le projet** — `ProtectedRoute.jsx` reçoit deux props :

```jsx
export default function ProtectedRoute({ children, allowedRoles }) {
  // children = le composant enfant à protéger
  // allowedRoles = tableau des rôles autorisés
  return children;
}

// Utilisation dans App.jsx
<ProtectedRoute allowedRoles={["manager"]}>
  <ManagerLayout />
</ProtectedRoute>
```

---

### 1.3 useState — Gérer l'état local

`useState` permet de stocker une valeur qui, si elle change, **déclenche un re-rendu**.

```jsx
const [valeur, setValeur] = useState(valeurInitiale);
//     ↑ lire   ↑ modifier   ↑ Hook
```

**Dans le projet** — `HistoriqueVentes.jsx` :

```jsx
import { useState } from "react";

export default function HistoriqueVentes() {
  const [ventes, setVentes]       = useState([]);        // tableau vide au départ
  const [loading, setLoading]     = useState(false);     // booléen
  const [modeFiltre, setModeFiltre] = useState("jour");  // string
  const [message, setMessage]     = useState({ texte: "", type: "" }); // objet

  // Modifier l'état → déclenche un re-rendu
  setLoading(true);
  setVentes(res.data);
  setModeFiltre("mois");
}
```

> **Règle importante :** Ne jamais modifier directement l'état.
> ```jsx
> // ❌ INCORRECT
> ventes.push(nouvelleVente);
>
> // ✅ CORRECT
> setVentes([...ventes, nouvelleVente]);
> ```

---

### 1.4 useEffect — Effets de bord

`useEffect` permet d'exécuter du code **après** le rendu (appels API, timers, event listeners...).

```jsx
useEffect(() => {
  // Code exécuté après le rendu

  return () => {
    // Nettoyage (optionnel) — exécuté avant le prochain effet ou au démontage
  };
}, [dépendances]); // [] = une seule fois, [x] = quand x change
```

**Dans le projet** — `ManagerLayout.jsx` :

```jsx
import { useState, useEffect, useRef } from "react";

// Effet 1 : charger les notifications au montage + polling toutes les 30s
useEffect(() => {
  fetchNotifications();
  const interval = setInterval(fetchNotifications, 30000);
  return () => clearInterval(interval); // nettoyage du timer
}, []); // [] = exécuté une seule fois

// Effet 2 : fermer le panel si clic extérieur
useEffect(() => {
  const handleClickOutside = (e) => {
    if (notifRef.current && !notifRef.current.contains(e.target))
      setShowNotifs(false);
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

**Dans le projet** — `ManagerHome.jsx` :

```jsx
// Se relance à chaque changement de "filtre"
useEffect(() => {
  fetchData(filtre);
}, [filtre]);
```

---

### 1.5 useRef — Référence sans re-rendu

`useRef` stocke une valeur qui **ne déclenche pas de re-rendu** quand elle change.
Principalement utilisé pour accéder directement à un élément DOM.

```jsx
const notifRef = useRef(null);

// Attacher la ref à un élément HTML
<div className="ml-notif-wrapper" ref={notifRef}>

// Utiliser la ref pour vérifier si le clic est à l'intérieur
if (notifRef.current && !notifRef.current.contains(e.target)) {
  setShowNotifs(false);
}
```

---

### 1.6 Rendu conditionnel

```jsx
// Avec ternaire
{loading ? <div>Chargement...</div> : <div>Contenu</div>}

// Avec &&  (si condition vraie → affiche l'élément)
{message.texte && <div>{message.texte}</div>}

// Retour anticipé (early return)
if (loading) return <div className="spinner" />;
if (error)   return <div className="error">{error}</div>;
```

**Dans le projet** — `HistoriqueVentes.jsx` :

```jsx
{loading ? (
  <div className="hv-loading">Chargement...</div>
) : !searched ? (
  <div className="hv-vide">Sélectionnez un jour ou un mois...</div>
) : ventes.length === 0 ? (
  <div className="hv-vide">Aucune vente pour {labelPeriode}.</div>
) : (
  <div className="hv-liste">...</div>
)}
```

---

### 1.7 Rendu de listes avec .map()

```jsx
// Transformer un tableau en liste d'éléments JSX
// La prop "key" est OBLIGATOIRE et doit être unique
{ventes.map((v) => (
  <div key={v._id} className="hv-card">
    {v.produits.map((p, idx) => (
      <div key={idx} className="hv-prod-ligne">
        <span>{p.nom}</span>
        <span>{p.quantite}</span>
      </div>
    ))}
  </div>
))}
```

---

### 1.8 Gestion des événements

```jsx
// Événement simple
<button onClick={handleRecherche}>Rechercher</button>

// Événement inline avec paramètre
<button onClick={() => setModeFiltre("mois")}>Par mois</button>

// Événement sur un input (récupérer la valeur)
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
/>
```

---

### 1.9 Classes CSS dynamiques

```jsx
// Ajouter une classe selon une condition
<button
  className={`hv-toggle-btn ${modeFiltre === "jour" ? "hv-toggle-btn--active" : ""}`}
>
  Par jour
</button>

// Dans ManagerLayout.jsx — navigation active
<button
  className={`ml-nav-item ml-nav--${item.color}${isActive(item.path) ? " ml-nav--active" : ""}`}
>
```

---

## 2. Vite — Bundler & Dev Server

### Qu'est-ce que Vite ?

Vite est l'outil qui :
- Lance le **serveur de développement** (`npm run dev`)
- **Compile** le projet pour la production (`npm run build`)
- Gère les **imports** de modules, CSS, images...

### Configuration du projet

```js
// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],   // Active le support JSX + React Fast Refresh
})
```

### Commandes essentielles

```bash
# Lancer le serveur de développement (hot reload)
npm run dev
# → http://localhost:5173

# Compiler pour la production
npm run build
# → génère le dossier dist/

# Prévisualiser le build
npm run preview
```

### Pourquoi Vite et pas Create React App ?

| Feature | Vite | CRA |
|---|---|---|
| Démarrage | Très rapide (ESM natif) | Lent (webpack) |
| Hot Reload | Instantané | Plusieurs secondes |
| Build prod | Rapide (Rollup) | Lent |
| Config | Légère | Lourde |

### Structure générée par Vite

```
client/
├── index.html          ← Point d'entrée HTML
├── vite.config.js      ← Configuration Vite
├── public/             ← Fichiers statiques (copiés tel quel)
└── src/
    ├── main.jsx        ← Point d'entrée JS
    └── App.jsx         ← Composant racine
```

```html
<!-- index.html — Vite injecte le JS ici -->
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## 3. React Router DOM v7 — Routing

### Qu'est-ce que React Router ?

React Router gère la **navigation entre pages** dans une SPA (Single Page Application).
Il change le contenu affiché **sans recharger la page**.

### 3.1 Configuration de base

```jsx
// main.jsx — Envelopper l'app dans BrowserRouter
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

```jsx
// App.jsx — Déclarer les routes
import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<CatalogClient />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/manager"   element={<ManagerLayout />} />
    </Routes>
  );
}
```

---

### 3.2 Routes imbriquées (Nested Routes)

Les routes imbriquées permettent un **layout persistant** (sidebar qui reste).

```jsx
// App.jsx — Route parente avec enfants
<Route path="/manager" element={<ManagerLayout />}>
  <Route index element={<ManagerHome />} />           {/* /manager */}
  <Route path="accounts" element={<ManageAccounts />} /> {/* /manager/accounts */}
  <Route path="products" element={<ManageProducts />} /> {/* /manager/products */}
  <Route path="stocks"   element={<ManagerStocks />} />  {/* /manager/stocks */}
  <Route path="ventes"   element={<HistoriqueVentes />} />{/* /manager/ventes */}
</Route>
```

```jsx
// ManagerLayout.jsx — Le composant parent utilise <Outlet />
import { Outlet } from "react-router-dom";

export default function ManagerLayout() {
  return (
    <div className="ml-layout">
      <aside className="ml-sidebar">
        {/* Sidebar toujours visible */}
      </aside>
      <main className="ml-content">
        <Outlet />  {/* ← Les enfants s'affichent ici */}
      </main>
    </div>
  );
}
```

> **`<Outlet />`** = "placeholder" où les routes enfants vont s'afficher.

---

### 3.3 Paramètres dans l'URL

```jsx
// Déclarer une route avec paramètre dynamique
<Route path="/reset-password/:token" element={<ResetPassword />} />

// Récupérer le paramètre dans le composant
import { useParams } from "react-router-dom";

function ResetPassword() {
  const { token } = useParams();
  // token = la valeur dans l'URL (ex: /reset-password/abc123 → token = "abc123")
}
```

---

### 3.4 Navigation programmatique

```jsx
import { useNavigate } from "react-router-dom";

function MonComposant() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/manager/accounts")}>
      Aller aux comptes
    </button>
  );
}
```

**Dans le projet** — `ManagerLayout.jsx` :

```jsx
const navigate = useNavigate();

// Navigation vers une page
<button onClick={() => navigate(item.path)}>
  {item.label}
</button>

// Déconnexion — redirection vers login
const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login"; // rechargement complet
};
```

---

### 3.5 Redirection avec Navigate

```jsx
import { Navigate } from "react-router-dom";

// Rediriger immédiatement vers une autre page
return <Navigate to="/login" replace />;
// "replace" = remplace l'entrée dans l'historique (pas de retour arrière)
```

**Dans le projet** — `ProtectedRoute.jsx` (protection des routes par rôle) :

```jsx
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Pas connecté → login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Mauvais rôle → redirection vers son espace
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "manager")  return <Navigate to="/manager" replace />;
    if (user.role === "seller")   return <Navigate to="/seller" replace />;
    if (user.role === "workshop") return <Navigate to="/workshop" replace />;
    if (user.role === "client")   return <Navigate to="/" replace />;
  }

  return children; // Autorisé → afficher le contenu
}
```

---

### 3.6 useLocation — Connaître la page courante

```jsx
import { useLocation } from "react-router-dom";

function App() {
  const { pathname } = useLocation();
  // pathname = "/manager/accounts", "/seller", etc.

  // Cacher le widget FAQ sur les pages staff
  const STAFF_PREFIXES = ["/manager", "/seller", "/workshop", "/login"];
  const showFaq = !STAFF_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      {showFaq && <FaqWidget />}
      <Routes>...</Routes>
    </>
  );
}
```

**Dans ManagerLayout.jsx** — Détecter la route active :

```jsx
const { pathname } = useLocation();

const isActive = (path) =>
  path === "/manager"
    ? pathname === "/manager"
    : pathname === path || pathname.startsWith(path + "/");

// Appliquer la classe CSS active
<button className={`ml-nav-item${isActive(item.path) ? " ml-nav--active" : ""}`}>
```

---

### 3.7 Routes protégées — Schéma complet du projet

```
/                         → CatalogClient (public)
/login                    → Login staff (redirige si déjà connecté)
/login-client             → Login client (redirige si déjà connecté)
/register-client          → Inscription client
/forgot-password          → Mot de passe oublié
/reset-password/:token    → Réinitialisation (lien email)

/manager/*                → ProtectedRoute (rôle: manager)
  /manager                → ManagerHome (dashboard)
  /manager/accounts       → ManageAccounts
  /manager/products       → ManageProducts
  /manager/stocks         → ManagerStocks
  /manager/commandes      → GererCommandes
  /manager/ventes         → HistoriqueVentes

/seller/*                 → ProtectedRoute (rôle: seller)
  /seller                 → SellerHome
  /seller/stock-pf        → StockPFBoutique
  /seller/nouvelle-vente  → NouvelleVente

/workshop/*               → ProtectedRoute (rôle: workshop)
  /workshop               → WorkshopHome
  /workshop/recettes      → GererRecette
  /workshop/stock         → StockAtelier

/client/mes-commandes     → ProtectedRoute (rôle: client)
```

---

## 4. Axios — Appels HTTP

### Qu'est-ce qu'Axios ?

Axios est une bibliothèque pour faire des **requêtes HTTP** vers l'API backend.
Alternative à `fetch()` mais avec plus de fonctionnalités (intercepteurs, annulation...).

### 4.1 Configuration des URLs — `utils/api.js`

```js
// client/src/utils/api.js

// URLs de base de l'API backend
export const API_WORKSHOP  = "http://localhost:5000/api/workshop";
export const API_MANAGER   = "http://localhost:5000/api/manager";
export const API_SELLER    = "http://localhost:5000/api/seller";
export const API_AUTH      = "http://localhost:5000/api/auth";
export const API_PRODUCTS  = "http://localhost:5000/api/products";
export const API_COMMANDES = "http://localhost:5000/api/commandes";
export const API_VENTES    = "http://localhost:5000/api/ventes";

// Récupérer le token JWT depuis localStorage
export const getToken = () => localStorage.getItem("token") || "";

// Générer le header d'autorisation
export const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

---

### 4.2 Requête GET — Récupérer des données

```jsx
import axios from "axios";
import { API_VENTES, authHeader } from "../../utils/api";

// GET simple
const res = await axios.get(`${API_VENTES}`);
const ventes = res.data;

// GET avec header d'authentification JWT
const res = await axios.get(`${API_VENTES}`, {
  headers: authHeader()
});

// GET avec paramètres de query (?debut=...&fin=...)
const params = new URLSearchParams();
params.append("debut", "2024-01-01");
params.append("fin",   "2024-01-31");

const res = await axios.get(`${API_VENTES}?${params}`, {
  headers: authHeader()
});
```

**Dans le projet** — `HistoriqueVentes.jsx` :

```jsx
const handleRecherche = async () => {
  const params = new URLSearchParams();

  if (modeFiltre === "jour") {
    params.append("debut", date);
    params.append("fin", date);
  } else {
    params.append("mois", mois);
  }

  setLoading(true);
  try {
    const res = await axios.get(`${API_VENTES}?${params}`, {
      headers: authHeader()
    });
    setVentes(res.data);
  } catch {
    afficherMessage("Erreur de chargement.", "erreur");
  } finally {
    setLoading(false); // s'exécute toujours (succès ou erreur)
  }
};
```

---

### 4.3 Télécharger un fichier binaire (PDF)

```jsx
// responseType: "blob" → réponse binaire (PDF, image...)
const res = await axios.get(`${API_VENTES}/${id}/recu`, {
  headers: authHeader(),
  responseType: "blob",
});

// Créer un lien de téléchargement temporaire
const url = window.URL.createObjectURL(new Blob([res.data]));
const link = document.createElement("a");
link.href = url;
link.download = `recu-vente-${id}.pdf`;
link.click();
window.URL.revokeObjectURL(url); // libérer la mémoire
```

---

### 4.4 Requêtes POST, PUT, DELETE

```jsx
// POST — Créer une ressource
const res = await axios.post(`${API_AUTH}/login`, {
  email: "user@example.com",
  password: "motdepasse"
});

// POST avec fichier (FormData pour upload image)
const formData = new FormData();
formData.append("name", "Orange");
formData.append("price", 5.50);
formData.append("image", fichierImage);

const res = await axios.post(`${API_PRODUCTS}`, formData, {
  headers: {
    ...authHeader(),
    "Content-Type": "multipart/form-data"
  }
});

// PUT — Modifier une ressource
const res = await axios.put(`${API_PRODUCTS}/${id}`, donnees, {
  headers: authHeader()
});

// DELETE — Supprimer une ressource
await axios.delete(`${API_PRODUCTS}/${id}`, {
  headers: authHeader()
});
```

---

### 4.5 Gestion des erreurs

```jsx
try {
  const res = await axios.get(`${API_VENTES}`, { headers: authHeader() });
  setVentes(res.data);
} catch (err) {
  // err.response → réponse serveur (code 400, 401, 500...)
  // err.message  → message d'erreur réseau
  if (err.response?.status === 401) {
    // Token expiré → rediriger vers login
    navigate("/login");
  } else {
    afficherMessage("Erreur serveur.", "erreur");
  }
} finally {
  setLoading(false);
}
```

---

### 4.6 fetch() vs axios — Dans le projet les deux sont utilisés

```js
// Avec fetch() (natif) — utilisé dans ManagerLayout.jsx
const res = await fetch(`${API}/notifications`, { headers: authHeader() });
if (res.ok) {
  const data = await res.json();
  setNotifications(data);
}

// Avec axios — utilisé dans HistoriqueVentes.jsx
const res = await axios.get(`${API_VENTES}?${params}`, { headers: authHeader() });
setVentes(res.data); // axios parse JSON automatiquement
```

| Feature | fetch() | axios |
|---|---|---|
| Natif navigateur | ✅ | ❌ (bibliothèque) |
| Parse JSON auto | ❌ (`.json()` manuel) | ✅ |
| Intercepteurs | ❌ | ✅ |
| Annulation | Complexe | Simple |
| responseType: blob | Manuel | Intégré |

---

## 5. Chart.js + react-chartjs-2 — Graphiques

### Qu'est-ce que Chart.js ?

Chart.js est une bibliothèque de graphiques. `react-chartjs-2` l'adapte pour React.

### 5.1 Enregistrement des modules (obligatoire)

Chart.js est modulaire : il faut **enregistrer** les parties utilisées.

```jsx
// ManagerHome.jsx
import {
  Chart as ChartJS,
  CategoryScale,  // Axe X avec catégories (texte)
  LinearScale,    // Axe Y avec nombres
  BarElement,     // Graphique en barres
  LineElement,    // Graphique en lignes
  PointElement,   // Points sur la ligne
  ArcElement,     // Camembert (pie/doughnut)
  Filler,         // Remplissage sous la courbe
  Tooltip,        // Info-bulle au survol
  Legend,         // Légende
} from "chart.js";

// Enregistrement global — à faire UNE SEULE FOIS
ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Filler, Tooltip, Legend
);
```

---

### 5.2 Graphique en ligne (Line)

```jsx
import { Line } from "react-chartjs-2";

// Structure des données
const lineData = {
  labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], // Axe X
  datasets: [{
    label: "CA (DT)",
    data: [120, 85, 200, 95, 310, 180, 250],  // Valeurs Y
    borderColor: "#1e3a5f",
    borderWidth: 2.5,
    pointBackgroundColor: "#1e3a5f",
    pointRadius: 4,
    tension: 0.4,  // Courbe lissée (0 = droite, 1 = très courbée)
    fill: true,    // Remplissage sous la courbe
    backgroundColor: "rgba(30,58,95,0.1)",
  }],
};

// Options de configuration
const lineOpts = {
  responsive: true,
  plugins: {
    legend: { display: false },  // Cacher la légende
    tooltip: {
      callbacks: {
        // Personnaliser le texte de l'info-bulle
        label: (c) => ` ${c.parsed.y.toFixed(2)} DT`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { callback: (v) => `${v} DT` },  // Format des labels Y
      grid: { color: "#f5f5f5" }
    },
    x: { grid: { display: false } }
  },
};

// Rendu dans le JSX
<Line data={lineData} options={lineOpts} />
```

**Gradient dynamique** — utilisé dans `ManagerHome.jsx` :

```jsx
backgroundColor: (ctx) => {
  const chart = ctx.chart;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return "transparent";
  const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, "rgba(30,58,95,0.18)");  // Haut — plus opaque
  gradient.addColorStop(1, "rgba(30,58,95,0)");     // Bas — transparent
  return gradient;
},
```

---

### 5.3 Graphique en barres (Bar)

```jsx
import { Bar } from "react-chartjs-2";

// Barres verticales — Top 5 produits vendus
const topBarData = {
  labels: ["Orange", "Citron", "Mangue", "Fraise", "Pomme"],
  datasets: [{
    label: "Quantité (L)",
    data: [450, 380, 290, 210, 150],
    backgroundColor: ["#1e3a5f", "#0d9488", "#7c3aed", "#db2777", "#ea580c"],
    borderRadius: 6,
    borderSkipped: false,
  }],
};

const topBarOpts = {
  indexAxis: "y",  // ← "y" = barres HORIZONTALES, "x" = barres verticales
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { beginAtZero: true, ticks: { callback: (v) => `${v} L` } },
    y: { grid: { display: false } }
  },
};

<Bar data={topBarData} options={topBarOpts} />
```

---

### 5.4 Barres groupées — Stock vs Seuil

```jsx
// Deux datasets → barres côte à côte
const stockMPData = {
  labels: ["Orange", "Citron", "Mangue"],
  datasets: [
    {
      label: "Disponible",
      data: [120, 45, 200],
      // Couleur rouge si sous le seuil, vert sinon
      backgroundColor: data.stockMPChart.map((s) =>
        s.disponible < s.seuil
          ? "rgba(220,38,38,0.75)"   // Rouge — critique
          : "rgba(13,148,136,0.75)"  // Vert — OK
      ),
      borderRadius: 6,
    },
    {
      label: "Seuil min",
      data: [100, 100, 100],
      backgroundColor: "rgba(148,163,184,0.35)",  // Gris clair
      borderRadius: 6,
    },
  ],
};

<Bar data={stockMPData} options={stockOpts} />
```

---

### 5.5 Données depuis l'API

```jsx
useEffect(() => {
  fetch(`${API_MANAGER}/dashboard?filtre=${filtre}`, { headers: authHeader() })
    .then((r) => r.json())
    .then((d) => {
      setData(d);

      // Les labels viennent des données API
      const lineLabels = d.evolutionCA.map((item) =>
        new Date(item.date).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric"
        })
      );
      // → ["lun. 1", "mar. 2", "mer. 3", ...]

      const lineValues = d.evolutionCA.map((item) => item.total);
      // → [120.5, 85.0, 200.0, ...]
    });
}, [filtre]);
```

---

## 6. CSS par composant — Styles

### Principe

Chaque composant a **son propre fichier CSS** dans le même dossier.
Cela garde les styles **organisés et localisés**.

```
pages/manager/
├── HistoriqueVentes.jsx
├── HistoriqueVentes.css   ← CSS dédié
├── GererCommandes.jsx
└── GererCommandes.css
```

---

### 6.1 Import du CSS

```jsx
// En haut du fichier composant
import "./HistoriqueVentes.css";
```

---

### 6.2 Convention de nommage BEM (utilisée dans le projet)

BEM = **Block__Element--Modifier**

```
hv           = block (historique-ventes)
hv-card      = élément du block
hv-card-header = sous-élément
hv-message--erreur = modifier (variante)
```

```css
/* Block */
.hv-page { padding: 1.5rem; }

/* Elements */
.hv-card { background: white; border-radius: 12px; }
.hv-card-header { display: flex; justify-content: space-between; }
.hv-card-footer { border-top: 1px solid #f0f0f0; }

/* Modifiers — variantes */
.hv-message--erreur  { background: #fee2e2; color: #dc2626; }
.hv-message--succes  { background: #dcfce7; color: #16a34a; }
.hv-toggle-btn--active { background: #1e3a5f; color: white; }
```

---

### 6.3 Classes conditionnelles dans le JSX

```jsx
// Classe fixe + classe dynamique
<div className={`hv-message hv-message--${message.type}`}>
  {/* Si message.type = "erreur" → className = "hv-message hv-message--erreur" */}
  {/* Si message.type = "succes" → className = "hv-message hv-message--succes" */}
</div>

// Classe active uniquement si condition vraie
<button
  className={`ml-nav-item ${isActive(item.path) ? "ml-nav--active" : ""}`}
>
```

---

### 6.4 Layout avec Flexbox — Sidebar + Contenu

```css
/* Layout principal — sidebar + contenu */
.ml-layout {
  display: flex;
  height: 100vh;        /* Hauteur totale de l'écran */
  overflow: hidden;
}

/* Sidebar fixe à gauche */
.ml-sidebar {
  width: 260px;
  flex-shrink: 0;       /* Ne rétrécit pas */
  display: flex;
  flex-direction: column;
  background: #1e3a5f;
  height: 100vh;
  overflow-y: auto;
}

/* Contenu principal — prend tout l'espace restant */
.ml-content {
  flex: 1;              /* Prend tout l'espace disponible */
  overflow-y: auto;
  padding: 2rem;
}
```

---

### 6.5 Grid pour les cartes KPI

```css
/* Grille responsive de cartes */
.mh-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 3 colonnes égales */
  gap: 1.25rem;
}

/* Sur mobile → 1 colonne */
@media (max-width: 768px) {
  .mh-kpi-grid {
    grid-template-columns: 1fr;
  }
}
```

---

### 6.6 Variables CSS (custom properties)

```css
/* Définir des couleurs réutilisables */
:root {
  --color-primary: #1e3a5f;
  --color-teal:    #0d9488;
  --color-danger:  #dc2626;
  --radius-md:     8px;
  --shadow-card:   0 2px 8px rgba(0,0,0,0.08);
}

/* Utilisation */
.hv-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
```

---

## 7. Hooks personnalisés

### Qu'est-ce qu'un hook personnalisé ?

Un hook personnalisé est une **fonction réutilisable** qui encapsule de la logique avec des hooks React.
Convention : commence toujours par `use`.

### Exemple du projet — `useHistoriqueMP.js`

```js
// client/src/hooks/useHistoriqueMP.js
import { useState } from "react";
import { authHeader } from "../utils/api";

// Hook qui gère l'état et la logique du modal historique
export function useHistoriqueMP(apiBase) {
  const [histModal, setHistModal]     = useState(null);
  const [histData, setHistData]       = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  const openHistorique = async (type) => {
    setHistModal(type);
    setHistLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/historique/mp/${encodeURIComponent(type)}`,
        { headers: authHeader() }
      );
      if (!res.ok) throw new Error("Erreur chargement historique.");
      setHistData(await res.json());
    } catch (e) {
      setHistData({ error: e.message });
    } finally {
      setHistLoading(false);
    }
  };

  const closeHistorique = () => setHistModal(null);

  // Retourner l'état et les fonctions
  return { histModal, histData, histLoading, openHistorique, closeHistorique };
}
```

**Utilisation dans un composant** :

```jsx
import { useHistoriqueMP } from "../../hooks/useHistoriqueMP";

export default function MatierePremiere() {
  // Tout l'état du modal est géré par le hook
  const {
    histModal,
    histData,
    histLoading,
    openHistorique,
    closeHistorique
  } = useHistoriqueMP(API_WORKSHOP);

  return (
    <div>
      <button onClick={() => openHistorique("Orange")}>
        Voir historique Orange
      </button>

      {histModal && (
        <div className="modal">
          {histLoading ? "Chargement..." : <pre>{JSON.stringify(histData)}</pre>}
          <button onClick={closeHistorique}>Fermer</button>
        </div>
      )}
    </div>
  );
}
```

**Avantage :** Si 3 composants ont besoin du modal historique, ils partagent tous la même logique sans duplication de code.

---

### Fonction utilitaire — `buildTimelineMP`

```js
// Construire une timeline triée à partir de données mixtes
export function buildTimelineMP(data) {
  if (!data) return [];

  const events = [
    // Transformer les additions
    ...data.additions.map((a) => ({
      id: a._id,
      date: new Date(a.dateEntree),
      kind: "addition",          // Type d'événement
      quantite: a.quantite,
      par: a.enregistrePar?.email || "—",
    })),
    // Transformer les réductions
    ...data.reductions.map((r) => ({
      id: r._id,
      date: new Date(r.date),
      kind: "reduction",
      quantite: r.quantite,
      nomJus: r.nomJus,
    })),
  ];

  // Trier par date décroissante (plus récent en premier)
  return events.sort((a, b) => b.date - a.date);
}
```

---

## 8. localStorage — Persistance côté client

### Qu'est-ce que localStorage ?

`localStorage` permet de **stocker des données dans le navigateur**,
qui persistent même après fermeture de l'onglet.

### 8.1 Token JWT et utilisateur connecté

```js
// Stocker après login (dans authController côté client)
localStorage.setItem("token", res.data.token);
localStorage.setItem("user", JSON.stringify(res.data.user));

// Lire
const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "null");

// Supprimer (déconnexion)
localStorage.removeItem("token");
localStorage.removeItem("user");
```

**Dans le projet** — `utils/api.js` :

```js
export const getToken    = () => localStorage.getItem("token") || "";
export const authHeader  = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
  // → { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5..." }
};
```

---

### 8.2 Panier client dans localStorage

```js
// Récupérer le panier
export const getPanier = () => {
  try {
    return JSON.parse(localStorage.getItem("panier") || "[]");
  } catch {
    return []; // Si données corrompues → panier vide
  }
};

// Sauvegarder le panier
export const savePanier = (panier) => {
  localStorage.setItem("panier", JSON.stringify(panier));
};

// Ajouter un produit
export const ajouterAuPanier = (produit, quantite = 1) => {
  const panier = getPanier();
  const existant = panier.find((item) => item.produitId === produit._id);

  if (existant) {
    existant.quantite += quantite;  // Incrémenter si déjà dans le panier
  } else {
    panier.push({                   // Ajouter un nouveau produit
      produitId: produit._id,
      nom:       produit.name,
      prix:      produit.price,
      volume:    produit.volume,
      image:     produit.image || "",
      quantite,
    });
  }

  savePanier(panier);
  return panier;
};

// Nombre total d'articles
export const getNbArticlesPanier = () => {
  return getPanier().reduce((acc, item) => acc + item.quantite, 0);
};
```

---

### 8.3 Constantes métier

```js
// Règles de gestion centralisées
export const SEUIL_REMISE    = 200;   // À partir de 200 DT → remise
export const TAUX_REMISE     = 0.10;  // 10% de remise
export const FRAIS_LIVRAISON = 3;     // 3 DT de livraison

// Utilisation dans CommandeCheckout.jsx
const sousTotal = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
const remise    = sousTotal >= SEUIL_REMISE ? sousTotal * TAUX_REMISE : 0;
const total     = sousTotal - remise + FRAIS_LIVRAISON;
```

---

## Résumé — Carte mentale des technologies

```
SmartJuice Frontend
│
├── VITE
│   ├── Lance le serveur dev (port 5173)
│   ├── Compile pour production
│   └── Gère les imports ES Modules
│
├── REACT 19
│   ├── Composants fonctionnels (JSX)
│   ├── useState  → état local
│   ├── useEffect → effets (API, timers)
│   ├── useRef    → références DOM
│   └── props     → passage de données
│
├── REACT ROUTER DOM v7
│   ├── Routes / Route → déclarer les pages
│   ├── Outlet         → layout imbriqué (sidebar)
│   ├── useNavigate    → navigation programmatique
│   ├── useLocation    → page courante
│   ├── useParams      → paramètres URL (:token)
│   └── Navigate       → redirection
│
├── AXIOS
│   ├── GET  → récupérer des données
│   ├── POST → créer (login, commande...)
│   ├── PUT  → modifier
│   ├── DELETE → supprimer
│   └── blob → télécharger PDF
│
├── CHART.JS + react-chartjs-2
│   ├── Line → évolution CA dans le temps
│   ├── Bar vertical → stock vs seuil
│   ├── Bar horizontal → top produits
│   └── ChartJS.register() → modules nécessaires
│
├── CSS par composant
│   ├── Un fichier .css par .jsx
│   ├── Convention BEM (block__element--modifier)
│   ├── Flexbox → layouts sidebar/contenu
│   ├── Grid   → grilles de cartes KPI
│   └── Classes conditionnelles dans JSX
│
├── HOOKS PERSONNALISÉS
│   ├── useHistoriqueMP → logique modal MP
│   └── useHistoriquePF → logique modal PF
│
└── LOCALSTORAGE
    ├── token  → JWT d'authentification
    ├── user   → données utilisateur connecté
    └── panier → articles du panier client
```

---

*Cours généré depuis le code source du projet SmartJuice — 2026*
