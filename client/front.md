# Documentation Frontend - React

## 📚 Qu'est-ce que React ? (Introduction depuis zéro)

**React** est une bibliothèque JavaScript créée par Facebook pour construire des interfaces utilisateur (UI). Elle permet de créer des applications web modernes et interactives.

### Concepts de base de React

#### 1. **Composants (Components)**
Un composant est un morceau réutilisable de l'interface utilisateur. C'est comme une pièce de LEGO que vous pouvez utiliser plusieurs fois.

**Exemple simple :**
```jsx
function Bouton() {
  return <button>Cliquez-moi</button>;
}
```

#### 2. **JSX (JavaScript XML)**
JSX permet d'écrire du code qui ressemble à du HTML directement dans JavaScript.

```jsx
const element = <h1>Bonjour le monde!</h1>;
```

#### 3. **Props (Propriétés)**
Les props permettent de passer des données d'un composant parent à un composant enfant.

```jsx
function User(props) {
  return <h1>Bonjour {props.name}!</h1>;
}

// Utilisation
<User name="Ahmed" />
```

#### 4. **State (État)**
Le state est une donnée qui peut changer dans le temps. Quand le state change, React met à jour l'interface automatiquement.

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Compteur: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

#### 5. **Hooks**
Les hooks sont des fonctions spéciales qui permettent d'utiliser les fonctionnalités React :
- `useState` : pour gérer l'état local
- `useEffect` : pour effectuer des actions après le rendu
- `useNavigate` : pour la navigation entre pages

---

## 🏗️ Structure du projet Frontend

```
client/
├── public/               # Fichiers statiques (images, icônes)
├── src/
│   ├── assets/          # Images et ressources
│   ├── components/      # Composants réutilisables
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # Pages de l'application
│   │   ├── Login.jsx
│   │   ├── LoginClient.jsx
│   │   ├── RegisterClient.jsx
│   │   ├── ManagerHome.jsx
│   │   ├── SellerHome.jsx
│   │   ├── WorkshopHome.jsx
│   │   ├── ManageAccounts.jsx
│   │   ├── ManageProducts.jsx
│   │   ├── MonCompte.jsx
│   │   └── CatalogClient.jsx
│   ├── App.jsx          # Composant principal avec routes
│   ├── main.jsx         # Point d'entrée de l'application
│   ├── App.css          # Styles globaux
│   └── index.css        # Styles de base
├── index.html           # Fichier HTML principal
├── package.json         # Dépendances et scripts
└── vite.config.js       # Configuration Vite
```

---

## 📦 Dépendances du projet (package.json)

### Dépendances principales
```json
{
  "react": "^19.2.0",           // Bibliothèque React
  "react-dom": "^19.2.0",       // Pour afficher React dans le navigateur
  "react-router-dom": "^7.13.0", // Pour la navigation entre pages
  "axios": "^1.13.5"            // Pour les requêtes HTTP vers le backend
}
```

### Outils de développement
```json
{
  "vite": "^7.3.1",             // Bundler rapide pour développement
  "eslint": "^9.39.1"           // Vérificateur de code
}
```

---

## 🚀 Point d'entrée : index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>client</title>
  </head>
  <body>
    <div id="root"></div>              <!-- Point d'ancrage pour React -->
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Explication :**
- `<div id="root"></div>` : C'est ici que React va injecter toute l'application
- Le script charge `main.jsx` qui démarre React

---

## 🎯 main.jsx - Démarrage de l'application

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Explication ligne par ligne :**
1. **Import de React** : Importe la bibliothèque React
2. **ReactDOM** : Permet de rendre React dans le DOM (page web)
3. **BrowserRouter** : Active le système de navigation (URLs)
4. **createRoot** : Crée le point de montage de React dans la div#root
5. **StrictMode** : Mode strict pour détecter les problèmes
6. **BrowserRouter** : Enveloppe l'application pour activer le routing
7. **App** : Le composant principal de l'application

---

## 🗺️ App.jsx - Routing et navigation

Le fichier `App.jsx` définit toutes les routes (URLs) de l'application :

```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
// ... autres imports

export default function App() {
  return (
    <Routes>
      {/* Route publique */}
      <Route path="/" element={<CatalogClient />} />
      
      {/* Authentification */}
      <Route path="/login" element={<Login />} />
      <Route path="/login-client" element={<LoginClient />} />
      <Route path="/register-client" element={<RegisterClient />} />
      
      {/* Routes protégées */}
      <Route 
        path="/manager" 
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerHome />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
```

**Concepts clés :**
- **Routes** : Conteneur pour toutes les routes
- **Route** : Définit une URL et le composant à afficher
  - `path="/"` : URL de la route
  - `element={<Component />}` : Composant à afficher
- **Navigate** : Redirige automatiquement vers une autre page

---

## 🛡️ ProtectedRoute.jsx - Protection des routes

Ce composant protège les pages réservées aux utilisateurs connectés :

```jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Si pas connecté → retour login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Vérification des rôles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirection selon le rôle
    if (user.role === "manager") return <Navigate to="/manager" replace />;
    if (user.role === "seller") return <Navigate to="/seller" replace />;
    if (user.role === "workshop") return <Navigate to="/workshop" replace />;
  }

  return children;
}
```

**Fonctionnement :**
1. Récupère le token et les infos utilisateur du `localStorage`
2. Si pas de token → redirige vers `/login`
3. Vérifie si le rôle de l'utilisateur est autorisé
4. Si autorisé → affiche la page (`children`)
5. Sinon → redirige vers la page appropriée

---

## 📄 Structure des Pages

### Pages d'authentification

#### 1. **Login.jsx** - Connexion des employés
- Formulaire avec email et mot de passe
- Envoie une requête POST vers `/api/auth/login`
- Stocke le token dans `localStorage`
- Redirige selon le rôle (manager, seller, workshop)

#### 2. **LoginClient.jsx** - Connexion des clients
- Similaire à Login.jsx mais pour les clients
- Route séparée pour séparer les logiques

#### 3. **RegisterClient.jsx** - Inscription des clients
- Formulaire d'inscription
- Crée un compte client

### Pages protégées

#### 1. **ManagerHome.jsx** - Tableau de bord manager
- Page d'accueil pour le manager
- Accès à la gestion des comptes et produits

#### 2. **SellerHome.jsx** - Tableau de bord vendeur
- Interface pour les vendeurs

#### 3. **WorkshopHome.jsx** - Tableau de bord atelier
- Interface pour l'atelier

#### 4. **ManageAccounts.jsx** - Gestion des comptes
- CRUD des utilisateurs (Create, Read, Update, Delete)
- Réservé au manager

#### 5. **ManageProducts.jsx** - Gestion des produits
- CRUD des produits
- Réservé au manager

#### 6. **MonCompte.jsx** - Mon compte
- Page de profil utilisateur

### Pages publiques

#### **CatalogClient.jsx** - Catalogue des produits
- Page d'accueil publique
- Affiche tous les produits disponibles

---

## 🎨 Fichiers CSS

Chaque page a son propre fichier CSS pour les styles :
- `Login.css` → styles pour Login.jsx
- `CatalogClient.css` → styles pour CatalogClient.jsx
- etc.

**Structure typique d'un CSS :**
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}
```

---

## 🌐 Communication avec le Backend (Axios)

**Axios** est utilisé pour communiquer avec le serveur :

### Exemple de requête GET (récupérer des données)
```jsx
import axios from 'axios';

const fetchProducts = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/products');
    console.log(response.data); // Les produits
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

### Exemple de requête POST (envoyer des données)
```jsx
const login = async (email, password) => {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: email,
      password: password
    });
    
    // Stocker le token
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  } catch (error) {
    console.error('Erreur de connexion:', error);
  }
};
```

### Ajouter le token aux requêtes
```jsx
const config = {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
};

axios.get('http://localhost:5000/api/protected-route', config);
```

---

## 💾 LocalStorage - Stockage local

Le `localStorage` permet de stocker des données dans le navigateur :

```jsx
// Stocker
localStorage.setItem('token', 'abc123');
localStorage.setItem('user', JSON.stringify({ name: 'Ahmed' }));

// Récupérer
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

// Supprimer
localStorage.removeItem('token');

// Tout supprimer
localStorage.clear();
```

---

## 🔄 Cycle de vie d'une page React typique

1. **Montage** : Le composant est créé et affiché
2. **Mise à jour** : Le composant se met à jour quand les données changent
3. **Démontage** : Le composant est retiré de la page

**Exemple avec useEffect :**
```jsx
import { useState, useEffect } from 'react';

function ProductList() {
  const [products, setProducts] = useState([]);

  // S'exécute au montage du composant
  useEffect(() => {
    fetchProducts();
  }, []); // [] = s'exécute une seule fois

  const fetchProducts = async () => {
    const response = await axios.get('/api/products');
    setProducts(response.data);
  };

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

---

## 🛠️ Commandes utiles

### Installer les dépendances
```bash
cd client
npm install
```

### Démarrer le serveur de développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`

### Compiler pour la production
```bash
npm run build
```

### Vérifier le code (linting)
```bash
npm run lint
```

---

## 🔑 Concepts avancés utilisés dans le projet

### 1. **Authentification avec JWT**
- Le serveur envoie un token JWT après connexion
- Le token est stocké dans localStorage
- Chaque requête protégée inclut le token dans les headers

### 2. **Routing avec React Router**
- Permet de naviguer entre pages sans recharger
- `useNavigate()` pour naviguer programmatiquement
- `<Link>` pour les liens cliquables

### 3. **Gestion des formulaires**
```jsx
const [email, setEmail] = useState('');

<input 
  value={email} 
  onChange={(e) => setEmail(e.target.value)} 
/>
```

### 4. **Gestion des erreurs**
```jsx
try {
  await axios.post('/api/login', data);
} catch (error) {
  if (error.response) {
    // Erreur du serveur (404, 500, etc.)
    console.log(error.response.data);
  } else {
    // Erreur réseau
    console.log('Erreur réseau');
  }
}
```

---

## 📚 Ressources pour apprendre

- **React Documentation** : https://react.dev
- **React Router** : https://reactrouter.com
- **Axios** : https://axios-http.com
- **Vite** : https://vitejs.dev

---

## 🎯 Résumé du flux de l'application

1. **Démarrage** : `index.html` → `main.jsx` → `App.jsx`
2. **Routing** : React Router détermine quelle page afficher selon l'URL
3. **Protection** : `ProtectedRoute` vérifie l'authentification
4. **Affichage** : La page correspondante est affichée
5. **Interaction** : L'utilisateur interagit (clics, formulaires)
6. **Communication** : Axios envoie des requêtes au backend
7. **Mise à jour** : React met à jour l'interface automatiquement

---

## 🔐 Flux d'authentification complet

1. Utilisateur accède à `/login`
2. Remplit le formulaire (email, password)
3. Click sur "Se connecter"
4. Axios envoie POST vers `/api/auth/login`
5. Backend vérifie les credentials
6. Backend renvoie `{ token, user }`
7. Frontend stocke dans localStorage
8. Redirection vers la page appropriée selon le rôle
9. Pour les pages protégées, `ProtectedRoute` vérifie le token
10. Si valide → affiche la page, sinon → retour à login

---

## 🎨 Bonnes pratiques React

1. **Nommage des composants** : Toujours en PascalCase (`UserProfile`, `ProductCard`)
2. **Nommage des fichiers** : Même nom que le composant (`Login.jsx`)
3. **Un composant par fichier** : Plus facile à maintenir
4. **Props destructuring** : `function Button({ text, onClick })` au lieu de `props.text`
5. **Keys dans les listes** : Toujours ajouter une `key` unique dans les `.map()`
6. **Éviter la mutation directe** : Utiliser `setState` et non `state.push()`

---

## 🐛 Débuggage React

### Dans le navigateur (DevTools)
1. Ouvrir les outils de développement (F12)
2. Onglet "Console" pour voir les erreurs
3. Onglet "Network" pour voir les requêtes HTTP
4. Onglet "Application" → "Local Storage" pour voir le token

### Installer React DevTools
Extension pour Chrome/Firefox qui permet d'inspecter les composants React.

### Console.log stratégique
```jsx
console.log('State actuel:', products);
console.log('Réponse API:', response.data);
```

---

## 📝 Notes importantes

- **Vite** est plus rapide que Create React App (ancien outil)
- **React 19** est la version la plus récente utilisée ici
- Les fichiers `.jsx` au lieu de `.js` indiquent clairement que c'est du React
- Le `localStorage` n'est pas sécurisé pour des données très sensibles (préférer les cookies httpOnly pour le token en production)

---

## 🚀 Prochaines étapes possibles

1. Ajouter des tests unitaires (Jest, React Testing Library)
2. Implémenter un state management global (Redux, Zustand)
3. Ajouter des animations (Framer Motion)
4. Optimiser les performances (React.memo, useMemo)
5. Migrer vers TypeScript pour plus de sécurité de type
6. Utiliser CSS Modules ou Tailwind CSS