# Cours — Liaison Frontend ↔ Backend
## SmartJuice : Comment React parle à Express/MongoDB

> Comprendre comment chaque action dans l'interface déclenche une requête HTTP,
> traverse le serveur et retourne une réponse affichée à l'utilisateur.

---

## Table des matières

1. [Architecture globale — Vue d'ensemble](#1-architecture-globale--vue-densemble)
2. [Le contrat HTTP — Requête et Réponse](#2-le-contrat-http--requête-et-réponse)
3. [Cas 1 — Login (authentification complète)](#3-cas-1--login-authentification-complète)
4. [Cas 2 — CRUD Produits (avec upload image)](#4-cas-2--crud-produits-avec-upload-image)
5. [Cas 3 — Commande en ligne (panier → backend)](#5-cas-3--commande-en-ligne-panier--backend)
6. [Cas 4 — Téléchargement PDF (blob)](#6-cas-4--téléchargement-pdf-blob)
7. [Cas 5 — Notifications en temps réel (polling)](#7-cas-5--notifications-en-temps-réel-polling)
8. [Gestion des erreurs end-to-end](#8-gestion-des-erreurs-end-to-end)
9. [Tableau complet des endpoints](#9-tableau-complet-des-endpoints)
10. [Schéma de sécurité — Routes protégées](#10-schéma-de-sécurité--routes-protégées)

---

## 1. Architecture globale — Vue d'ensemble

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│         FRONTEND (React)        │        │        BACKEND (Express)          │
│         localhost:5173          │        │        localhost:5000              │
│                                 │        │                                   │
│  ┌──────────────────────────┐   │        │  ┌────────────────────────────┐  │
│  │  Composant JSX           │   │        │  │  Route                      │  │
│  │  useState / useEffect    │   │        │  │  router.post("/login", ...) │  │
│  │  axios.post(url, body)   │──────────▶│  └────────────┬───────────────┘  │
│  └──────────────────────────┘   │  HTTP  │               ▼                   │
│                                 │        │  ┌────────────────────────────┐  │
│  ┌──────────────────────────┐   │        │  │  Middleware                 │  │
│  │  localStorage            │◀──────────│  │  authenticate / isManager   │  │
│  │  token, user, panier     │   │  JSON  │  └────────────┬───────────────┘  │
│  └──────────────────────────┘   │        │               ▼                   │
│                                 │        │  ┌────────────────────────────┐  │
│  ┌──────────────────────────┐   │        │  │  Controller                 │  │
│  │  utils/api.js            │   │        │  │  authController.js          │  │
│  │  API_AUTH, authHeader()  │   │        │  │  productController.js       │  │
│  └──────────────────────────┘   │        │  └────────────┬───────────────┘  │
│                                 │        │               ▼                   │
└─────────────────────────────────┘        │  ┌────────────────────────────┐  │
                                           │  │  Mongoose (MongoDB)          │  │
                                           │  │  User.find() / .create()    │  │
                                           │  └────────────────────────────┘  │
                                           └──────────────────────────────────┘
```

### Les 3 couches de la liaison

| Couche | Frontend | Backend |
|---|---|---|
| **Communication** | `axios` / `fetch()` | Express routes |
| **Sécurité** | `authHeader()` → `Bearer token` | `authenticate` middleware |
| **Données** | `useState`, `localStorage` | Mongoose, MongoDB |

---

## 2. Le contrat HTTP — Requête et Réponse

### Anatomie d'une requête HTTP depuis le frontend

```js
// Exemple complet — ce que React envoie au serveur
const res = await axios.post(
  "http://localhost:5000/api/auth/login",  // URL = méthode + endpoint
  { email: "manager@sj.tn", password: "123456" }, // Body (JSON)
  {
    headers: {
      "Content-Type": "application/json",         // Type du body
      "Authorization": "Bearer eyJhbGci..."        // Token JWT
    }
  }
);
```

### Anatomie d'une réponse HTTP depuis le backend

```js
// Ce que Express renvoie au frontend
res.status(200).json({
  token: "eyJhbGciOiJIUzI1NiIsInR5...",
  user: {
    id: "64abc123",
    email: "manager@sj.tn",
    role: "manager",
    nom: "Dupont",
    prenom: "Jean"
  }
});
```

### Le fichier de configuration central — `utils/api.js`

```js
// client/src/utils/api.js — Point de vérité pour toutes les URLs

// URLs de base — une seule ligne à changer si le port change
export const API_AUTH      = "http://localhost:5000/api/auth";
export const API_PRODUCTS  = "http://localhost:5000/api/products";
export const API_COMMANDES = "http://localhost:5000/api/commandes";
export const API_VENTES    = "http://localhost:5000/api/ventes";
export const API_WORKSHOP  = "http://localhost:5000/api/workshop";
export const API_MANAGER   = "http://localhost:5000/api/manager";
export const API_SELLER    = "http://localhost:5000/api/seller";

// Helper — ajouter le token JWT à chaque requête
export const authHeader = () => {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

---

## 3. Cas 1 — Login (authentification complète)

C'est le cas le plus important : il établit la **session** de l'utilisateur.

### Schéma du flux complet

```
[Login.jsx]
  Utilisateur remplit email + password → clique "Se connecter"
          ↓
  axios.post("http://localhost:5000/api/auth/login", { email, password })
          ↓ Requête HTTP POST
[authRoutes.js]
  router.post("/login", login)   ← Route publique (pas de middleware)
          ↓
[authController.js — login()]
  1. const { email, password } = req.body
  2. User.findOne({ email })              → cherche en MongoDB
  3. bcrypt.compare(password, hash)       → vérifie le mot de passe
  4. jwt.sign({ userId, role }, SECRET)   → crée le token JWT
  5. res.json({ token, user })            → répond au frontend
          ↓ Réponse JSON
[Login.jsx]
  localStorage.setItem("token", res.data.token)
  localStorage.setItem("user", JSON.stringify(res.data.user))
  navigate("/manager")   ← redirection selon le rôle
```

### Code frontend — `Login.jsx`

```jsx
// client/src/pages/Login.jsx
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_AUTH } from "../utils/api";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Empêcher le rechargement de la page

    try {
      setLoading(true);
      setError("");

      // 1. Envoyer les credentials au backend
      const res = await axios.post(`${API_AUTH}/login`, {
        email,
        password,
      });

      // 2. Stocker le token et les infos utilisateur
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // 3. Rediriger selon le rôle reçu du backend
      const { role } = res.data.user;
      if (role === "manager")  navigate("/manager");
      else if (role === "seller")   navigate("/seller");
      else if (role === "workshop") navigate("/workshop");
      else {
        // Rôle non autorisé → effacer et bloquer
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Accès refusé. Ce portail est réservé au staff.");
      }

    } catch (err) {
      // 4. Afficher le message d'erreur du backend
      setError(err.response?.data?.message || "Erreur de connexion");
      //              ↑ Accès sécurisé : si pas de réponse → message générique
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div className="sj-alert">{error}</div>}
      <button disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
    </form>
  );
}
```

### Code backend — `authController.js`

```js
// server/src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body; // Vient du frontend via axios

    // 1. L'utilisateur existe-t-il ?
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Email incorrect" });
      //          ↑ Ce message arrive dans err.response.data.message côté React
    }

    // 2. Le mot de passe est-il correct ?
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // 3. Créer le token JWT (expire dans 7 jours)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4. Retourner token + données utilisateur (SANS le passwordHash)
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
```

### Ce qui est stocké dans localStorage après le login

```js
// localStorage après un login manager réussi
localStorage = {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2...",
  "user":  '{"id":"64abc123","email":"manager@sj.tn","role":"manager","nom":"Dupont","prenom":"Jean"}'
}

// Lecture dans n'importe quel composant
const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "null");
// user.role → "manager"
```

---

## 4. Cas 2 — CRUD Produits (avec upload image)

Ce cas illustre les 4 opérations : **Lire, Créer, Modifier, Supprimer**.
Et la particularité de l'upload de fichier avec `FormData`.

### Schéma des 4 routes

```
Frontend                 Backend
─────────────────────────────────────────────────────────────────
GET  /api/products       ← getAllProducts()  [manager]
GET  /api/products/catalog ← getCatalog()   [public]
POST /api/products       ← createProduct()  [manager + Multer]
PUT  /api/products/:id   ← updateProduct()  [manager + Multer]
DELETE /api/products/:id ← deleteProduct()  [manager]
```

### Backend — Route avec Multer

```js
// server/src/routes/productRoutes.js
import upload from "../middleware/uploadMiddleware.js";

// GET public — Pas de middleware (accès libre)
router.get("/catalog", getCatalog);

// GET protégé — Seulement si authentifié
router.get("/", authenticate, getAllProducts);

// POST + upload image — authenticate → isManager → Multer → controller
router.post("/", authenticate, isManager, upload.single("image"), createProduct);
//                                         ↑ Multer traite l'image avant le controller

// PUT + upload image — Même ordre
router.put("/:id", authenticate, isManager, upload.single("image"), updateProduct);

// DELETE — Pas d'image
router.delete("/:id", authenticate, isManager, deleteProduct);
```

### Frontend — GET : Charger les produits au montage

```jsx
// client/src/pages/ManageProducts.jsx
import axios from "axios";
import { API_PRODUCTS, authHeader } from "../utils/api";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Charger au montage du composant
  useEffect(() => {
    fetchProducts();
  }, []); // [] = une seule fois

  const fetchProducts = async () => {
    try {
      // JWT dans le header car route protégée
      const res = await axios.get(API_PRODUCTS, { headers: authHeader() });
      setProducts(res.data); // res.data = tableau de produits JSON
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  // Affichage
  return (
    <div>
      {loading ? <p>Chargement...</p> : (
        products.map((product) => (
          <div key={product._id}>
            <img src={product.image} alt={product.name} />
            {/* product.image = "http://localhost:5000/uploads/products/1704067200-123.jpg" */}
            <h3>{product.name}</h3>
            <span>{product.price} DT</span>
          </div>
        ))
      )}
    </div>
  );
}
```

### Frontend — POST/PUT : Créer/Modifier avec FormData

```jsx
// Pourquoi FormData ? Parce qu'on envoie à la fois du texte ET un fichier image.
// JSON ne peut pas transporter des fichiers binaires.

const handleSubmit = async (e) => {
  e.preventDefault();

  // FormData = conteneur qui mélange texte + fichier
  const data = new FormData();
  data.append("name",        formData.name);
  data.append("description", formData.description);
  data.append("price",       formData.price);
  data.append("volume",      formData.volume);
  data.append("available",   formData.available);
  if (formData.recette) data.append("recette", formData.recette);
  if (imageFile)        data.append("image",   imageFile); // Fichier binaire

  try {
    if (editingId) {
      // Modification — PUT avec l'id dans l'URL
      await axios.put(`${API_PRODUCTS}/${editingId}`, data, {
        headers: authHeader()
        // NE PAS mettre "Content-Type": "multipart/form-data" manuellement
        // Axios le détecte automatiquement via FormData
      });
    } else {
      // Création — POST
      await axios.post(API_PRODUCTS, data, { headers: authHeader() });
    }

    fetchProducts(); // Recharger la liste après modification

  } catch (err) {
    setMessage(err.response?.data?.message || "Erreur");
  }
};
```

### Frontend — DELETE : Supprimer un produit

```jsx
const handleDelete = async (id) => {
  if (!window.confirm("Êtes-vous sûr ?")) return;

  try {
    await axios.delete(`${API_PRODUCTS}/${id}`, { headers: authHeader() });
    //                  ↑ L'id du produit est dans l'URL
    fetchProducts(); // Recharger sans le produit supprimé
  } catch (err) {
    setMessage(err.response?.data?.message || "Erreur");
  }
};
```

### Backend — Controller `createProduct`

```js
// server/src/controllers/productController.js
export const createProduct = async (req, res) => {
  try {
    // req.body  = les champs texte (name, price, etc.)
    // req.file  = le fichier image (injecté par Multer)
    const { name, description, price, volume, available, recette } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Nom et prix sont obligatoires" });
    }

    // Construire l'URL publique de l'image
    const imageUrl = req.file
      ? `http://localhost:5000/uploads/products/${req.file.filename}`
      : "";
    // → "http://localhost:5000/uploads/products/1704067200000-123456789.jpg"
    // Cette URL est stockée en MongoDB ET affichée dans React via <img src={product.image} />

    const product = await Product.create({
      name, description, price,
      image: imageUrl,
      volume: volume || "1L",
      available: available !== undefined ? available : true,
      recette: recette || null,
    });

    res.status(201).json({ message: "Produit créé avec succès", product });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
```

### Schéma du voyage de l'image

```
[ManageProducts.jsx]
  <input type="file" /> → utilisateur choisit "orange.jpg"
  imageFile = File { name: "orange.jpg", size: 45000, type: "image/jpeg" }
          ↓
  FormData.append("image", imageFile)
  axios.post(API_PRODUCTS, formData, { headers: authHeader() })
          ↓ HTTP multipart/form-data
[uploadMiddleware.js — Multer]
  Vérifie : extension jpeg/jpg/png/webp ✓
  Vérifie : taille < 5 MB ✓
  Renomme : "1704067200000-987654321.jpg"
  Sauvegarde sur disque : server/uploads/products/1704067200000-987654321.jpg
  Injecte : req.file = { filename: "1704067200000-987654321.jpg", ... }
          ↓
[productController.js]
  imageUrl = "http://localhost:5000/uploads/products/1704067200000-987654321.jpg"
  Product.create({ ..., image: imageUrl })  ← Sauvegarde l'URL en MongoDB
          ↓ Réponse JSON
[ManageProducts.jsx]
  products = [{ name: "Orange", image: "http://localhost:5000/uploads/products/..." }]
  <img src={product.image} />  ← Navigateur charge l'image depuis le serveur
```

---

## 5. Cas 3 — Commande en ligne (panier → backend)

Ce cas montre comment des **données stockées en localStorage** (le panier)
sont envoyées au backend pour créer une commande en base de données.

### Schéma du flux

```
[CatalogClient.jsx]
  Client clique "Ajouter au panier"
  ajouterAuPanier(produit, 2)         ← Sauvegarde en localStorage
          ↓ (pas de requête HTTP)
[Panier.jsx]
  panier = getPanier()                ← Lit localStorage
  Client clique "COMMANDER"
  navigate("/client/checkout")
          ↓ Navigation React Router (pas de requête HTTP)
[CommandeCheckout.jsx]
  Client choisit : retrait/livraison, date, heure
  axios.post("/api/commandes", { produits, modeRemise, dateRetrait, ... })
          ↓ Requête HTTP POST avec JWT
[commandeController.js — creerCommandeEnLigne()]
  1. Validation des champs
  2. Vérifier chaque produit en base (Product.findById)
  3. Calculer total, remise (10% si > 200 DT), frais livraison
  4. Commande.create({ client: req.user._id, produits, total, statut: "en_attente" })
  5. res.status(201).json({ commande })
          ↓ Réponse JSON
[CommandeCheckout.jsx]
  savePanier([])            ← Vider le panier localStorage
  navigate("/client/mes-commandes")
```

### Frontend — Préparer les données du panier pour le backend

```jsx
// client/src/pages/client/CommandeCheckout.jsx
import { getPanier, savePanier, API_COMMANDES, authHeader } from "../../utils/api";

export default function CommandeCheckout() {
  const panier = getPanier(); // Lire depuis localStorage

  const handleConfirmerCommande = async () => {
    // Transformer le panier localStorage en format attendu par le backend
    const produitsBackend = panier.map((item) => ({
      produitId: item.produitId, // L'ObjectId MongoDB du produit
      quantite:  item.quantite,
    }));
    // → [{ produitId: "64abc...", quantite: 2 }, ...]

    try {
      const res = await axios.post(
        API_COMMANDES,
        {
          produits:           produitsBackend,
          modeRemise:         modeRemise,        // "retrait" ou "livraison"
          dateRetrait:        dateRetrait,        // "2024-01-15"
          heureRetrait:       heureRetrait,       // "14:30"
          adresseLivraison:   adresse,
          telephoneLivraison: telephone,
          fraisLivraison:     modeRemise === "livraison" ? FRAIS_LIVRAISON : 0,
        },
        { headers: authHeader() } // JWT obligatoire (client connecté)
      );

      // Succès → vider le panier et naviguer
      savePanier([]);
      navigate("/client/mes-commandes");

    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la commande");
    }
  };
}
```

### Backend — Valider et créer la commande

```js
// server/src/controllers/commandeController.js
export const creerCommandeEnLigne = async (req, res) => {
  try {
    const { produits, modeRemise, dateRetrait, heureRetrait,
            adresseLivraison, telephoneLivraison, fraisLivraison } = req.body;

    // Validation
    if (!produits || produits.length === 0)
      return res.status(400).json({ message: "Le panier est vide." });
    if (!dateRetrait)
      return res.status(400).json({ message: "La date de retrait est obligatoire." });

    // Récupérer les vraies données de prix depuis MongoDB
    // (Ne jamais faire confiance aux prix envoyés par le frontend)
    const produitsDetails = [];
    let total = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);
      if (!produit)
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      if (!produit.available)
        return res.status(400).json({ message: `Produit non disponible: ${produit.name}` });

      total += produit.price * item.quantite; // Prix vient de MongoDB, pas du frontend

      produitsDetails.push({
        produit:      produit._id,
        nom:          produit.name,
        volume:       produit.volume,
        quantite:     item.quantite,
        prixUnitaire: produit.price, // Prix certifié par la base de données
      });
    }

    // Calcul des totaux côté serveur (jamais côté client)
    const frais = modeRemise === "livraison" ? parseFloat(fraisLivraison) || 0 : 0;
    const remise = total > SEUIL_REMISE ? total * TAUX_REMISE : 0;

    // Créer la commande — req.user._id vient du middleware authenticate
    const commande = await Commande.create({
      client:             req.user._id,  // ID du client connecté (issu du JWT)
      nomClient:          `${req.user.prenom} ${req.user.nom}`.trim(),
      produits:           produitsDetails,
      modeRemise,
      dateRetrait,
      heureRetrait,
      adresseLivraison:   adresseLivraison || "",
      telephoneLivraison: telephoneLivraison || "",
      fraisLivraison:     frais,
      remise,
      total:              parseFloat((total - remise + frais).toFixed(2)),
      type:               "en_ligne",
      statut:             "en_attente",
    });

    res.status(201).json({ message: "Commande passée avec succès.", commande });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
```

> **Règle de sécurité critique :** Les prix sont **toujours recalculés côté serveur**.
> Le frontend envoie uniquement les `produitId` et `quantite`.
> Les prix sont récupérés depuis MongoDB pour éviter la fraude.

---

## 6. Cas 4 — Téléchargement PDF (blob)

Ce cas illustre comment un PDF généré côté serveur est **streamé** vers le navigateur.

### Schéma du flux

```
[HistoriqueVentes.jsx]
  Utilisateur clique "Reçu PDF" sur une vente
          ↓
  axios.get("/api/ventes/:id/recu", { responseType: "blob" })
          ↓ HTTP GET avec Accept: application/pdf
[venteRoutes.js]
  router.get("/:id/recu", authenticate, isSellerOrManager, genererRecuVente)
          ↓
[venteController.js — genererRecuVente()]
  Vente.findById(id)
  new PDFDocument()
  res.setHeader("Content-Type", "application/pdf")
  doc.pipe(res)         ← Stream le PDF directement dans la réponse
  ... contenu du PDF ...
  doc.end()
          ↓ Stream binaire
[HistoriqueVentes.jsx]
  res.data = Blob { type: "application/pdf", ... }
  URL.createObjectURL(blob) → lien temporaire
  link.click() → téléchargement déclenché dans le navigateur
```

### Frontend — Recevoir et déclencher le téléchargement

```jsx
// client/src/pages/manager/HistoriqueVentes.jsx
const telechargerRecu = async (id) => {
  try {
    const res = await axios.get(`${API_VENTES}/${id}/recu`, {
      headers: authHeader(),
      responseType: "blob", // ← Clé ! Indique qu'on attend du binaire, pas du JSON
    });

    // Créer une URL temporaire en mémoire pour le blob
    const url = window.URL.createObjectURL(new Blob([res.data]));

    // Créer un lien invisible et le cliquer programmatiquement
    const link      = document.createElement("a");
    link.href       = url;
    link.download   = `recu-vente-${id}.pdf`; // Nom du fichier téléchargé
    link.click();

    // Libérer la mémoire
    window.URL.revokeObjectURL(url);

  } catch {
    afficherMessage("Erreur lors du téléchargement.", "erreur");
  }
};
```

### Backend — Générer et streamer le PDF

```js
// server/src/controllers/venteController.js
import PDFDocument from "pdfkit";

export const genererRecuVente = async (req, res) => {
  const vente = await Vente.findById(req.params.id)
    .populate("vendeur", "email nom prenom");

  // Créer le document PDF en mémoire
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // Indiquer au navigateur comment traiter la réponse
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=recu-vente-${vente._id}.pdf`);
  //             ↑ "attachment" = déclenche le téléchargement (pas l'affichage)

  // Connecter le stream PDF à la réponse HTTP
  doc.pipe(res); // Le PDF est envoyé au fur et à mesure qu'il est généré

  // Contenu du PDF
  doc.fontSize(24).font("Helvetica-Bold").text("SmartJuice", { align: "center" });
  doc.text(`N° Vente : ${vente._id}`);
  doc.text(`Total    : ${vente.total.toFixed(2)} DT`);
  // ...

  doc.end(); // Finaliser et fermer le stream
};
```

---

## 7. Cas 5 — Notifications en temps réel (polling)

Le projet utilise le **polling** : interroger le backend toutes les X secondes.

### Schéma du polling

```
[ManagerLayout.jsx — montage]
  fetchNotifications()                     ← Requête immédiate
  setInterval(fetchNotifications, 30000)   ← Toutes les 30 secondes
          ↓ (répété toutes les 30s)
  axios.get("/api/manager/notifications")
          ↓
[managerStockRoutes.js]
  Notification.find({ luManager: false }).sort({ createdAt: -1 })
          ↓ JSON
[ManagerLayout.jsx]
  setNotifications(res.data)               ← Badge mis à jour
  nonLues = notifications.filter(n => !n.luManager).length
```

### Frontend — Polling avec cleanup

```jsx
// client/src/components/ManagerLayout.jsx
import { useEffect, useRef, useState } from "react";
import { API_MANAGER, authHeader } from "../utils/api";

export default function ManagerLayout() {
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null); // Pour détecter le clic extérieur

  // Polling toutes les 30 secondes
  useEffect(() => {
    fetchNotifications(); // Appel immédiat au montage

    const interval = setInterval(fetchNotifications, 30000);

    // Cleanup — arrêter le polling au démontage du composant
    return () => clearInterval(interval);
  }, []); // [] = une seule fois au montage

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_MANAGER}/notifications`, {
        headers: authHeader()
      });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silencieux — pas d'alerte si réseau indisponible */ }
  };

  // Marquer une notification comme lue
  const marquerLue = async (id) => {
    try {
      await fetch(`${API_MANAGER}/notifications/${id}/lire`, {
        method: "PUT",
        headers: authHeader()
      });
      // Mise à jour optimiste — mettre à jour l'UI sans recharger
      setNotifications((prev) =>
        prev.map((n) => n._id === id ? { ...n, luManager: true } : n)
      );
    } catch { /* silencieux */ }
  };

  const nonLues = notifications.filter((n) => !n.luManager).length;

  return (
    <div>
      <button onClick={() => setShowNotifs((v) => !v)}>
        Notifications
        {nonLues > 0 && <span className="badge">{nonLues}</span>}
      </button>
    </div>
  );
}
```

### Mise à jour optimiste vs rechargement

```js
// Pattern 1 : Rechargement complet (simple mais lent)
await axios.put(`/api/notifications/${id}/lire`);
fetchNotifications(); // Re-télécharge toutes les notifs

// Pattern 2 : Mise à jour optimiste (dans le projet)
await fetch(`/api/notifications/${id}/lire`, { method: "PUT" });
// Mettre à jour localement SANS re-télécharger
setNotifications((prev) =>
  prev.map((n) => n._id === id ? { ...n, luManager: true } : n)
);
// Plus rapide — l'UI répond immédiatement
```

---

## 8. Gestion des erreurs end-to-end

### Côté backend — Codes HTTP expressifs

```js
// Les codes HTTP informent le frontend sur la nature de l'erreur
res.status(400).json({ message: "Email et mot de passe obligatoires" }); // Données manquantes
res.status(401).json({ message: "Token invalide" });                      // Non authentifié
res.status(403).json({ message: "Accès interdit: réservé au gérant" });   // Pas les droits
res.status(404).json({ message: "Produit introuvable" });                  // Ressource absente
res.status(409).json({ message: "Email déjà utilisé" });                   // Conflit
res.status(500).json({ message: "Erreur serveur", error: error.message }); // Bug serveur
```

### Côté frontend — Lire l'erreur du backend

```jsx
try {
  const res = await axios.post(`${API_AUTH}/login`, { email, password });

} catch (err) {
  // err.response existe si le serveur a répondu avec un code d'erreur (4xx, 5xx)
  // err.response est undefined si le réseau est coupé (timeout, CORS...)

  const message = err.response?.data?.message || "Erreur de connexion";
  //                    ↑ Optional chaining — évite le crash si pas de réponse
  setError(message);

  // Cas spéciaux selon le code HTTP
  if (err.response?.status === 401) {
    // Token expiré → forcer la déconnexion
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (err.response?.status === 409) {
    setError("Cet email est déjà utilisé");
  }
}
```

### Schéma de propagation d'erreur

```
Backend
  return res.status(409).json({ message: "Email déjà utilisé" })
          ↓
Réseau HTTP
  Status: 409 Conflict
  Body: { "message": "Email déjà utilisé" }
          ↓
Axios (frontend)
  Lance une exception : Error { response: { status: 409, data: { message: "..." } } }
          ↓
catch (err)
  err.response.status  → 409
  err.response.data    → { message: "Email déjà utilisé" }
  err.response.data.message → "Email déjà utilisé"
          ↓
setError("Email déjà utilisé")
  → Affiché dans le JSX : <div className="alert">{error}</div>
```

---

## 9. Tableau complet des endpoints

### Routes Auth — `/api/auth`

| Méthode | URL | Middleware | Controller | Frontend |
|---|---|---|---|---|
| POST | `/login` | — | `login` | `Login.jsx` |
| POST | `/register-client` | — | `registerClient` | `RegisterClient.jsx` |
| POST | `/request-password-reset` | — | `requestPasswordReset` | `ForgotPassword.jsx` |
| POST | `/reset-password` | — | `resetPassword` | `ResetPassword.jsx` |
| POST | `/staff` | auth + isManager | `createStaffAccount` | `ManageAccounts.jsx` |
| GET | `/staff` | auth + isManager | `getStaffAccounts` | `ManageAccounts.jsx` |
| PUT | `/staff/:id` | auth + isManager | `updateStaffAccount` | `ManageAccounts.jsx` |
| DELETE | `/staff/:id` | auth + isManager | `deleteStaffAccount` | `ManageAccounts.jsx` |
| PUT | `/change-password` | auth + isClientOrManager | `changePassword` | `MonCompte.jsx` |

### Routes Produits — `/api/products`

| Méthode | URL | Middleware | Controller | Frontend |
|---|---|---|---|---|
| GET | `/catalog` | — | `getCatalog` | `CatalogClient.jsx` |
| GET | `/` | auth | `getAllProducts` | `ManageProducts.jsx` |
| GET | `/recettes-disponibles` | auth + isManager | `getRecettesDisponibles` | `ManageProducts.jsx` |
| POST | `/` | auth + isManager + Multer | `createProduct` | `ManageProducts.jsx` |
| PUT | `/:id` | auth + isManager + Multer | `updateProduct` | `ManageProducts.jsx` |
| DELETE | `/:id` | auth + isManager | `deleteProduct` | `ManageProducts.jsx` |

### Routes Ventes — `/api/ventes`

| Méthode | URL | Middleware | Controller | Frontend |
|---|---|---|---|---|
| POST | `/` | auth + isSeller | `creerVente` | `NouvelleVente.jsx` |
| GET | `/` | auth + isManager | `getVentes` | `HistoriqueVentes.jsx` |
| GET | `/mes-ventes` | auth + isSeller | `getMesVentes` | `SellerHome.jsx` |
| GET | `/stock-boutique` | auth + isSellerOrManager | `getStockBoutiqueDisponible` | `StockPFBoutique.jsx` |
| GET | `/:id/recu` | auth + isSellerOrManager | `genererRecuVente` | `HistoriqueVentes.jsx` |

### Routes Commandes — `/api/commandes`

| Méthode | URL | Middleware | Controller | Frontend |
|---|---|---|---|---|
| POST | `/` | auth + isClient | `creerCommandeEnLigne` | `CommandeCheckout.jsx` |
| POST | `/physique` | auth + isSeller | `creerCommandePhysique` | `NouvelleCommandePhysique.jsx` |
| GET | `/mes-commandes` | auth + isClient | `getMesCommandes` | `MesCommandes.jsx` |
| GET | `/` | auth + isManager | `getAllCommandes` | `GererCommandes.jsx` |
| PUT | `/:id/statut` | auth + isManager | `updateStatutCommande` | `GererCommandes.jsx` |

---

## 10. Schéma de sécurité — Routes protégées

### Comment une route est protégée de bout en bout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROUTES PAR RÔLE                                      │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ PUBLIC          │ /catalog, /login, /register-client, /request-password-reset│
│ (pas de JWT)    │                                                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ CLIENT          │ /commandes (POST), /mes-commandes, /mes-notifications       │
│ (JWT + isClient)│                                                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ SELLER          │ /ventes (POST), /mes-ventes, /nouvelle-commande (physique)  │
│ (JWT + isSeller)│                                                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ WORKSHOP        │ /matieres-premieres, /recettes, /production, /transferts    │
│ (JWT + isWork.) │                                                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ MANAGER         │ /staff, /products, /commandes (GET/PUT), /ventes (GET),    │
│ (JWT + isMgr.)  │ /dashboard, /stocks, /notifications                         │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

### Le token JWT — Cycle de vie complet

```
1. CRÉATION (Login)
   jwt.sign({ userId, role }, SECRET, { expiresIn: "7d" })
   → Stocké dans localStorage["token"]

2. ENVOI (chaque requête protégée)
   headers: { Authorization: "Bearer eyJhbG..." }
   → Via authHeader() dans utils/api.js

3. VÉRIFICATION (middleware authenticate)
   jwt.verify(token, SECRET)
   → decoded = { userId: "64abc", role: "manager", exp: ... }
   → User.findById(decoded.userId) → req.user

4. AUTORISATION (middleware de rôle)
   req.user.role === "manager" → next()
   req.user.role !== "manager" → 403 Forbidden

5. EXPIRATION (après 7 jours)
   jwt.verify() lance TokenExpiredError
   → 401 { message: "Token expiré" }
   → Frontend : localStorage.removeItem("token") → navigate("/login")

6. DÉCONNEXION (logout)
   localStorage.removeItem("token")
   localStorage.removeItem("user")
   window.location.href = "/login"
```

### Résumé visuel — Flux complet d'une requête protégée

```
FRONTEND                     RÉSEAU HTTP                  BACKEND

axios.get(URL, {          ──────────────────────►  authRoutes.js
  headers: {                GET /api/auth/staff        router.get("/staff",
    Authorization:          Authorization: Bearer xyz      authenticate,
    "Bearer eyJ..."       ◄──────────────────────         isManager,
  }                         200 OK                         getStaffAccounts)
})                          [{ email, role, ... }]              │
                                                               │
res.data                                               authenticate()
  = [{ email, role }]                                    jwt.verify(token)
                                                          findById(userId)
setAccounts(res.data)                                      req.user = user
                                                               │
                                                          isManager()
                                                            role === "manager"
                                                               │
                                                          getStaffAccounts()
                                                            User.find(...)
                                                            res.json(accounts)
```

---

## Résumé — Checklist liaison Front ↔ Back

### Côté Frontend (React)

- [ ] Définir les URLs dans `utils/api.js` (une seule source de vérité)
- [ ] Utiliser `authHeader()` pour toutes les routes protégées
- [ ] `useState` pour stocker les données reçues du backend
- [ ] `useEffect` pour charger les données au montage
- [ ] `FormData` pour les envois avec fichier (image)
- [ ] `responseType: "blob"` pour télécharger des fichiers (PDF)
- [ ] `err.response?.data?.message` pour afficher les erreurs backend
- [ ] `localStorage` pour persister token + user entre les rechargements

### Côté Backend (Express)

- [ ] `app.use(express.json())` pour lire `req.body`
- [ ] `app.use(cors())` pour autoriser le frontend
- [ ] `router.METHOD(path, ...middlewares, controller)` pour chaque endpoint
- [ ] `authenticate` sur toutes les routes protégées
- [ ] Middleware de rôle (`isManager`, `isSeller`...) après `authenticate`
- [ ] `Multer` avant le controller pour les routes avec upload
- [ ] Recalculer les prix côté serveur (ne jamais faire confiance au frontend)
- [ ] `res.status(code).json({ message, data })` avec des codes HTTP précis

---

*Cours généré depuis le code source du projet SmartJuice — 2026*
