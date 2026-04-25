# Cours Backend — SmartJuice
> Apprendre toutes les technologies utilisées côté serveur à travers le vrai code

---

## Table des matières

1. [Node.js + Express 5 — Serveur REST API](#1-nodejs--express-5--serveur-rest-api)
2. [MongoDB + Mongoose — Base de données](#2-mongodb--mongoose--base-de-données)
3. [JWT — Authentification](#3-jwt--authentification)
4. [bcryptjs — Hashage des mots de passe](#4-bcryptjs--hashage-des-mots-de-passe)
5. [Nodemailer — Envoi d'emails](#5-nodemailer--envoi-demails)
6. [Multer — Upload de fichiers](#6-multer--upload-de-fichiers)
7. [PDFKit — Génération de PDFs](#7-pdfkit--génération-de-pdfs)
8. [dotenv — Variables d'environnement](#8-dotenv--variables-denvironnement)
9. [Nodemon — Hot reload](#9-nodemon--hot-reload)
10. [Architecture MVC — Vue d'ensemble](#10-architecture-mvc--vue-densemble)

---

## 1. Node.js + Express 5 — Serveur REST API

### Qu'est-ce que Node.js ?

Node.js est un **environnement d'exécution JavaScript** côté serveur.
Il permet d'écrire du code serveur en JavaScript (le même langage que le frontend).

```
Navigateur (client)  ──HTTP──►  Node.js + Express (serveur)  ──►  MongoDB
     React                           REST API                      Base de données
```

### Qu'est-ce qu'Express ?

Express est un **framework web minimaliste** pour Node.js.
Il simplifie la création de routes, middlewares et réponses HTTP.

---

### 1.1 Création du serveur — `server.js`

```js
// server/server.js — Point d'entrée du serveur
import dotenv from "dotenv";
dotenv.config(); // Charger les variables .env EN PREMIER

import express from "express";
import cors from "cors";
import { connectDB } from "./src/config/db.js";

const app = express();

// ── Middlewares globaux ──────────────────────────────────────────────────────
app.use(cors());                // Autorise les requêtes cross-origin (front → back)
app.use(express.json());        // Parse le body JSON des requêtes (req.body)
app.use("/uploads", express.static(join(__dirname, "uploads"))); // Fichiers statiques

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/workshop",  workshopRoutes);
app.use("/api/seller",    sellerRoutes);
app.use("/api/manager",   managerStockRoutes);
app.use("/api/commandes", commandeRoutes);
app.use("/api/ventes",    venteRoutes);

// ── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
});
```

> **Ordre important :** `dotenv.config()` doit être appelé **avant** tout import qui utilise `process.env`.

---

### 1.2 Middleware — Le concept clé d'Express

Un **middleware** est une fonction qui s'exécute entre la requête et la réponse.
Il a accès à `req`, `res`, et `next()`.

```
Requête HTTP  →  middleware1  →  middleware2  →  Route handler  →  Réponse
                  (cors)         (express.json)   (controller)
```

```js
// Structure d'un middleware
const monMiddleware = (req, res, next) => {
  // Faire quelque chose avec la requête
  console.log(`${req.method} ${req.url}`);

  next(); // Passer au middleware suivant
  // OU : res.status(401).json({ message: "Non autorisé" }); // Arrêter ici
};

app.use(monMiddleware); // Middleware global (toutes les routes)
```

---

### 1.3 Routes — Déclarer les endpoints

```js
// server/src/routes/authRoutes.js
import express from "express";
import { login, createStaffAccount, getStaffAccounts } from "../controllers/authController.js";
import { authenticate, isManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/login  (public — pas de middleware d'auth)
router.post("/login", login);

// POST /api/auth/register-client (public)
router.post("/register-client", registerClient);

// POST /api/auth/staff  (protégé — authenticate + isManager)
//  Ordre : authenticate vérifie le JWT → isManager vérifie le rôle → createStaffAccount s'exécute
router.post("/staff", authenticate, isManager, createStaffAccount);

// GET  /api/auth/staff  (protégé)
router.get("/staff", authenticate, isManager, getStaffAccounts);

// PUT  /api/auth/staff/:id  (protégé, avec paramètre d'URL)
router.put("/staff/:id", authenticate, isManager, updateStaffAccount);

// DELETE /api/auth/staff/:id  (protégé)
router.delete("/staff/:id", authenticate, isManager, deleteStaffAccount);

export default router;
```

---

### 1.4 Méthodes HTTP et codes de statut

| Méthode | Usage | Code succès |
|---|---|---|
| `GET` | Récupérer des données | 200 |
| `POST` | Créer une ressource | 201 |
| `PUT` | Modifier une ressource | 200 |
| `DELETE` | Supprimer une ressource | 200 |

| Code | Signification |
|---|---|
| 200 | OK — Succès |
| 201 | Created — Ressource créée |
| 400 | Bad Request — Données invalides |
| 401 | Unauthorized — Non authentifié |
| 403 | Forbidden — Pas les droits |
| 404 | Not Found — Ressource introuvable |
| 409 | Conflict — Email déjà utilisé |
| 500 | Internal Server Error — Erreur serveur |

```js
// Exemples de réponses dans le projet
res.json(accounts);                                         // 200 implicite
res.status(201).json({ message: "Compte créé", user });    // 201 Créé
res.status(400).json({ message: "Champs manquants" });     // 400 Mauvaise requête
res.status(401).json({ message: "Token manquant" });       // 401 Non authentifié
res.status(403).json({ message: "Accès interdit" });       // 403 Interdit
res.status(404).json({ message: "Compte introuvable" });   // 404 Non trouvé
res.status(409).json({ message: "Email déjà utilisé" });   // 409 Conflit
res.status(500).json({ message: "Erreur serveur" });       // 500 Erreur serveur
```

---

### 1.5 Paramètres dans une route

```js
// Paramètre d'URL (:id)
router.put("/staff/:id", authenticate, isManager, updateStaffAccount);

// Dans le controller — accéder au paramètre
export const updateStaffAccount = async (req, res) => {
  const { id } = req.params; // Récupère l'id de l'URL

  const user = await User.findById(id);
};

// Query params (?debut=2024-01-01&fin=2024-01-31)
export const getVentes = async (req, res) => {
  const { debut, fin, mois } = req.query; // Récupère les query params
};

// Body de la requête (JSON envoyé par le frontend)
export const login = async (req, res) => {
  const { email, password } = req.body; // Grâce à app.use(express.json())
};
```

---

### 1.6 Fichiers statiques — Servir les images

```js
// Dans server.js — rendre le dossier uploads accessible publiquement
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// http://localhost:5000/uploads/products/nomfichier.jpg
app.use("/uploads", express.static(join(__dirname, "uploads")));
```

---

### 1.7 CORS — Communication Frontend ↔ Backend

```js
import cors from "cors";

// Accepter toutes les origines (développement)
app.use(cors());

// En production — limiter à l'origine du frontend
app.use(cors({
  origin: "http://localhost:5173", // URL du frontend React/Vite
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
```

---

## 2. MongoDB + Mongoose — Base de données

### Qu'est-ce que MongoDB ?

MongoDB est une **base de données NoSQL orientée documents**.
Les données sont stockées en **JSON** (appelés "documents") dans des "collections".

```
SQL (relationnel)          MongoDB (NoSQL)
─────────────────         ─────────────────
Base de données     →     Base de données
Table               →     Collection
Ligne (row)         →     Document (JSON)
Colonne             →     Champ (field)
JOIN                →     populate() / embed
```

### Qu'est-ce que Mongoose ?

Mongoose est un **ODM (Object Data Modeling)** pour MongoDB.
Il définit des **schémas** (structure des documents) et fournit des méthodes pour interagir avec MongoDB.

---

### 2.1 Connexion à MongoDB — `config/db.js`

```js
// server/src/config/db.js
import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB !");
    return mongoose.connection;
  } catch (error) {
    console.error("Erreur de connexion à MongoDB:", error.message);
    throw error;
  }
}
```

```env
# .env
MONGO_URI=mongodb://localhost:27017/smartjuice
# ou MongoDB Atlas (cloud) :
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/smartjuice
```

---

### 2.2 Définir un schéma et un modèle

```js
// server/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,   // Champ obligatoire
      unique: true,     // Index unique (pas de doublons)
      lowercase: true,  // Force en minuscule automatiquement
      trim: true        // Enlève les espaces avant/après
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["manager", "seller", "workshop", "client"], // Valeurs autorisées
      required: true
    },
    nom:       { type: String, trim: true, default: "" },
    prenom:    { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    // Champs optionnels pour la réinitialisation de mot de passe
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true } // Ajoute createdAt et updatedAt automatiquement
);

// Créer et exporter le modèle
export default mongoose.model("User", userSchema);
// → Collection MongoDB : "users" (Mongoose met en minuscule + pluriel)
```

```js
// server/src/models/Product.js — Avec référence vers un autre modèle
const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price:       { type: Number, required: true, min: 0 },
    image:       { type: String, default: "" },
    volume:      { type: String, enum: ["1L"], default: "1L" },
    available:   { type: Boolean, default: true },
    recette: {
      type: mongoose.Schema.Types.ObjectId, // Référence vers un autre document
      ref: "Recette",                       // Nom du modèle référencé
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
```

---

### 2.3 Types de champs Mongoose

| Type | Exemple | Description |
|---|---|---|
| `String` | `"manager"` | Texte |
| `Number` | `5.50` | Nombre |
| `Boolean` | `true` | Vrai/Faux |
| `Date` | `new Date()` | Date et heure |
| `ObjectId` | `ref: "Recette"` | Référence vers un autre document |
| `Array` | `[{ nom, quantite }]` | Tableau de valeurs ou sous-documents |

---

### 2.4 Opérations CRUD avec Mongoose

```js
// ── CREATE ────────────────────────────────────────────────────────────────────

// Créer un document
const newUser = await User.create({
  email: "vendeur@smartjuice.tn",
  passwordHash: hashedPassword,
  role: "seller"
});

// ── READ ──────────────────────────────────────────────────────────────────────

// Trouver tous les documents
const users = await User.find();

// Trouver avec filtre
const staffUsers = await User.find({ role: { $in: ["seller", "workshop"] } });

// Trouver un seul document
const user = await User.findOne({ email: "vendeur@smartjuice.tn" });

// Trouver par ID
const user = await User.findById(id);

// Sélectionner/exclure des champs
const users = await User.find().select("-passwordHash"); // Exclure passwordHash

// Trier
const users = await User.find().sort({ createdAt: -1 }); // Décroissant

// Filtres combinés
const ventes = await Vente.find({
  dateVente: {
    $gte: new Date("2024-01-01"), // >= début
    $lte: new Date("2024-01-31")  // <= fin
  }
}).sort({ dateVente: -1 });

// ── UPDATE ────────────────────────────────────────────────────────────────────

// Modifier et retourner le document mis à jour
const product = await Product.findByIdAndUpdate(
  id,
  { name: "Nouveau nom", price: 6.50 },
  { returnDocument: "after", runValidators: true }
);

// Modifier via l'instance (save)
user.nom = "Nouveau nom";
user.passwordHash = nouveauHash;
await user.save();

// ── DELETE ────────────────────────────────────────────────────────────────────

// Supprimer par ID et retourner le document supprimé
const deleted = await Product.findByIdAndDelete(id);

// Supprimer avec filtre (critères multiples)
const deleted = await User.findOneAndDelete({
  _id: id,
  role: { $in: ["seller", "workshop"] }
});
```

---

### 2.5 Opérateurs de requête MongoDB

| Opérateur | Signification | Exemple |
|---|---|---|
| `$in` | Dans une liste | `{ role: { $in: ["seller", "workshop"] } }` |
| `$gte` | Supérieur ou égal | `{ price: { $gte: 5 } }` |
| `$lte` | Inférieur ou égal | `{ price: { $lte: 10 } }` |
| `$gt` | Strictement supérieur | `{ expires: { $gt: Date.now() } }` |
| `$ne` | Différent de | `{ role: { $ne: "client" } }` |

---

### 2.6 populate() — Joindre des documents liés

```js
// Dans Product.js : recette référence un document Recette
recette: { type: mongoose.Schema.Types.ObjectId, ref: "Recette" }

// populate() remplace l'ObjectId par le vrai document
const products = await Product.find()
  .populate("recette", "nomJus"); // Récupérer seulement le champ "nomJus"

// Résultat sans populate :
// { name: "Jus d'Orange", recette: "64abc123..." }

// Résultat avec populate :
// { name: "Jus d'Orange", recette: { _id: "64abc123...", nomJus: "Orange" } }

// populate() sur une vente (vendeur → User)
const vente = await Vente.findById(id)
  .populate("vendeur", "email nom prenom");
// → vente.vendeur = { email: "...", nom: "...", prenom: "..." }
```

---

### 2.7 Modèle Commande — Schéma complexe

```js
// server/src/models/Commande.js
const commandeSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    nomClient: { type: String, default: "" }, // Pour commandes physiques

    // Sous-documents (tableau d'objets)
    produits: [
      {
        produit:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        nom:          { type: String, required: true },    // Dénormalisé pour l'historique
        volume:       { type: String, default: "1L" },
        quantite:     { type: Number, required: true, min: 1 },
        prixUnitaire: { type: Number, required: true, min: 0 },
      },
    ],

    statut: {
      type: String,
      enum: ["en_attente", "validee", "refusee", "prete", "livree"],
      default: "en_attente",
    },
    type: {
      type: String,
      enum: ["en_ligne", "physique"],
      required: true,
    },
    modeRemise: {
      type: String,
      enum: ["livraison", "retrait"],
      default: "retrait",
    },
    total:            { type: Number, required: true, min: 0 },
    remise:           { type: Number, default: 0 },
    fraisLivraison:   { type: Number, default: 0 },
    adresseLivraison: { type: String, default: "" },
    dateRetrait:      { type: Date, default: null },
    heureRetrait:     { type: String, default: "" },
    enregistrePar:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    commentaireRefus: { type: String, default: "" },
  },
  { timestamps: true }
);
```

---

## 3. JWT — Authentification

### Qu'est-ce que JWT ?

JWT (JSON Web Token) est un **token signé** qui prouve qu'un utilisateur est authentifié.

```
Structure d'un JWT :
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (algorithme)
.eyJ1c2VySWQiOiI2NGFiYzEyMyIsInJvbGUiOiJtYW5hZ2VyIn0  ← Payload (données)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c           ← Signature
```

### Flux d'authentification

```
1. Client envoie email + password
         ↓
2. Serveur vérifie → crée un JWT signé avec JWT_SECRET
         ↓
3. Client stocke le JWT dans localStorage
         ↓
4. Client envoie le JWT dans chaque requête : Authorization: Bearer <token>
         ↓
5. Serveur vérifie la signature du JWT → identifie l'utilisateur
```

---

### 3.1 Créer un JWT — Lors du login

```js
// server/src/controllers/authController.js
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  // ... vérification email/password ...

  // Créer le token JWT
  const token = jwt.sign(
    { userId: user._id, role: user.role }, // Payload — données dans le token
    process.env.JWT_SECRET,                // Clé secrète (dans .env)
    { expiresIn: "7d" }                    // Expiration — 7 jours
  );

  // Envoyer le token au client
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
};
```

---

### 3.2 Vérifier un JWT — Middleware d'authentification

```js
// server/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    // 1. Récupérer le token du header
    const authHeader = req.headers.authorization;
    // authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5..."

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou invalide" });
    }

    // 2. Extraire le token (après "Bearer ")
    const token = authHeader.split(" ")[1];

    // 3. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId: "64abc123", role: "manager", iat: ..., exp: ... }

    // 4. Charger l'utilisateur depuis la base de données
    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    // 5. Attacher l'utilisateur à la requête (disponible dans les controllers)
    req.user = user;
    next(); // Passer au middleware suivant

  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré" });
    }
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
```

---

### 3.3 Middlewares de rôles

```js
// Vérifier le rôle après authenticate
export const isManager = (req, res, next) => {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ message: "Accès interdit: réservé au gérant" });
  }
  next();
};

export const isSeller = (req, res, next) => {
  if (!req.user || req.user.role !== "seller") {
    return res.status(403).json({ message: "Accès interdit: réservé au vendeur" });
  }
  next();
};

export const isWorkshop = (req, res, next) => {
  if (!req.user || req.user.role !== "workshop") {
    return res.status(403).json({ message: "Accès interdit: réservé à l'atelier" });
  }
  next();
};

// Combinaisons de rôles
export const isSellerOrManager = (req, res, next) => {
  if (!req.user || !["seller", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit" });
  }
  next();
};

export const isWorkshopOrSellerOrManager = (req, res, next) => {
  if (!req.user || !["workshop", "seller", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit" });
  }
  next();
};
```

---

### 3.4 Chaîner les middlewares sur une route

```js
// Lecture de gauche à droite :
// authenticate → isManager → createStaffAccount

router.post("/staff", authenticate, isManager, createStaffAccount);
//                     ↑               ↑            ↑
//              Vérifie JWT      Vérifie rôle   Logique métier

// Dans le controller, req.user est disponible
export const createStaffAccount = async (req, res) => {
  // req.user = l'utilisateur manager connecté (injecté par authenticate)
  const { email, password, role } = req.body;
};
```

---

## 4. bcryptjs — Hashage des mots de passe

### Pourquoi hasher les mots de passe ?

Ne jamais stocker les mots de passe en clair dans la base de données.
Si la base est compromise, les mots de passe restent protégés.

```
Mot de passe clair : "monMotDePasse123"
         ↓  bcrypt.hash()
Hash en base :  "$2b$10$Kd3kD8nM9q..."  (irréversible)

Pour vérifier : bcrypt.compare("monMotDePasse123", hash) → true/false
```

### 4.1 Hasher un mot de passe

```js
// server/src/controllers/authController.js
import bcrypt from "bcryptjs";

// Lors de la création d'un compte
const passwordHash = await bcrypt.hash(password, 10);
//                                              ↑
//                                         saltRounds = 10
//                          (plus c'est élevé, plus c'est sécurisé mais lent)

const newUser = await User.create({
  email,
  passwordHash, // Stocké hashé en base
  role,
});
```

---

### 4.2 Vérifier un mot de passe — Login

```js
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Trouver l'utilisateur
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Email incorrect" });
  }

  // Comparer le mot de passe saisi avec le hash stocké
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  //              ↑ retourne true ou false

  if (!isMatch) {
    return res.status(401).json({ message: "Mot de passe incorrect" });
  }

  // Si ok → créer le JWT
};
```

---

### 4.3 Changer le mot de passe

```js
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  // 1. Vérifier l'ancien mot de passe
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: "Ancien mot de passe incorrect" });
  }

  // 2. Hasher le nouveau mot de passe
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Mot de passe modifié avec succès" });
};
```

---

### 4.4 Réinitialisation de mot de passe (token sécurisé)

```js
import crypto from "crypto"; // Module natif Node.js

// Générer un token aléatoire cryptographiquement sécurisé
const resetToken = crypto.randomBytes(32).toString("hex");
// → "a3f8c2d1e9b4..." (64 caractères hex)

// Hasher le token avant de le stocker en base
// (si la base est compromise, le token en clair reste secret)
const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

// Stocker le hash en base avec une expiration (1 heure)
user.resetPasswordToken   = hashedToken;
user.resetPasswordExpires = Date.now() + 3600000; // 1h en ms
await user.save();

// Envoyer le token NON hashé dans l'email (lien de reset)
await sendResetPasswordEmail(user.email, resetToken);

// ── Lors de la réinitialisation ──────────────────────────────────────────────
// Retrouver l'utilisateur via le token reçu (rehashé pour comparer)
const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

const user = await User.findOne({
  resetPasswordToken:   hashedToken,
  resetPasswordExpires: { $gt: Date.now() } // Token pas encore expiré
});

if (!user) {
  return res.status(400).json({ message: "Token invalide ou expiré" });
}

// Mettre à jour le mot de passe et effacer le token
user.passwordHash         = await bcrypt.hash(newPassword, 10);
user.resetPasswordToken   = undefined;
user.resetPasswordExpires = undefined;
await user.save();
```

---

## 5. Nodemailer — Envoi d'emails

### Qu'est-ce que Nodemailer ?

Nodemailer permet d'**envoyer des emails** depuis Node.js.
Dans le projet, il est utilisé pour envoyer les liens de réinitialisation de mot de passe.

---

### 5.1 Configuration du transporteur

```js
// server/src/config/emailConfig.js
import nodemailer from "nodemailer";

// Pattern "lazy" — créer le transporteur une seule fois
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",            // Service email (Gmail, Outlook, SMTP...)
      auth: {
        user: process.env.EMAIL_USER,     // Adresse email (dans .env)
        pass: process.env.EMAIL_PASSWORD  // Mot de passe app Gmail (dans .env)
      }
    });
  }
  return transporter;
}
```

> **Mot de passe d'application Gmail :** Il faut activer la validation en 2 étapes sur Gmail
> puis créer un "Mot de passe d'application" dans les paramètres de sécurité.
> Ce n'est **pas** le mot de passe du compte Gmail.

---

### 5.2 Envoyer un email HTML

```js
export const sendResetPasswordEmail = async (email, resetToken) => {
  // Construire l'URL de réinitialisation
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  // → http://localhost:5173/reset-password/a3f8c2d1e9b4...

  const mailOptions = {
    from: `SmartJuice <${process.env.EMAIL_USER}>`, // Expéditeur affiché
    to: email,                                       // Destinataire
    subject: "Réinitialisation de votre mot de passe - SmartJuice",
    html: `
      <div style="font-family: Arial; max-width: 600px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Cliquez sur le bouton ci-dessous :</p>
        <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 15px 30px;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ce lien expire dans <strong>1 heure</strong>.</p>
      </div>
    `
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("Email envoyé:", info.messageId);
    return true;
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return false;
  }
};
```

---

### 5.3 Variables d'environnement nécessaires

```env
# .env
EMAIL_USER=smartjuice.app@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application Gmail (16 caractères)
CLIENT_URL=http://localhost:5173
```

---

## 6. Multer — Upload de fichiers

### Qu'est-ce que Multer ?

Multer est un middleware pour **gérer l'upload de fichiers** (images, PDFs...) envoyés via `multipart/form-data`.

Dans le projet : upload des **images de produits** via le formulaire du manager.

---

### 6.1 Configuration — `uploadMiddleware.js`

```js
// server/src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";

// ── Où stocker les fichiers ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products/"); // Dossier de destination
  },
  filename: (req, file, cb) => {
    // Nom unique : timestamp + nombre aléatoire + extension originale
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
    // → "1704067200000-123456789.jpg"
  }
});

// ── Filtrer les types de fichiers acceptés ──────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extOk  = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);  // Accepter le fichier
  } else {
    cb(new Error("Seules les images (jpeg, jpg, png, webp) sont acceptées"));
  }
};

// ── Assembler la configuration ──────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB maximum
});

export default upload;
```

---

### 6.2 Utiliser Multer dans une route

```js
// server/src/routes/productRoutes.js
import upload from "../middleware/uploadMiddleware.js";

// upload.single("image") = accepter UN fichier avec le champ nommé "image"
router.post("/",    authenticate, isManager, upload.single("image"), createProduct);
router.put("/:id",  authenticate, isManager, upload.single("image"), updateProduct);
```

---

### 6.3 Accéder au fichier uploadé dans le controller

```js
// server/src/controllers/productController.js
export const createProduct = async (req, res) => {
  const { name, description, price, volume } = req.body;

  // req.file contient les infos du fichier uploadé
  // Si aucun fichier → req.file est undefined
  const imageUrl = req.file
    ? `http://localhost:5000/uploads/products/${req.file.filename}`
    : "";
  //   ↑ URL publique accessible depuis le frontend

  const product = await Product.create({
    name,
    description,
    price,
    image: imageUrl,
    volume: volume || "1L",
  });

  res.status(201).json({ message: "Produit créé", product });
};
```

---

### 6.4 Schéma du flux d'upload

```
Frontend (FormData)     →     Multer middleware     →     Disque serveur
  { image: fichier }         Valide + renomme         uploads/products/
  { name: "Orange" }         Stocke dans req.file     1704067200000-123.jpg
  { price: 5.50 }                 ↓
                          Controller (req.file.filename)
                          Construit l'URL publique
                          Sauvegarde l'URL en base MongoDB
```

---

## 7. PDFKit — Génération de PDFs

### Qu'est-ce que PDFKit ?

PDFKit est une bibliothèque pour **générer des PDFs** programmatiquement.
Dans le projet : génération des **reçus de vente** téléchargeables.

---

### 7.1 Créer et streamer un PDF vers le client

```js
// server/src/controllers/venteController.js
import PDFDocument from "pdfkit";

export const genererRecuVente = async (req, res) => {
  const vente = await Vente.findById(req.params.id)
    .populate("vendeur", "email nom prenom");

  if (!vente) return res.status(404).json({ message: "Vente introuvable." });

  // Créer le document PDF
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // Headers HTTP pour indiquer au navigateur que c'est un PDF à télécharger
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=recu-vente-${vente._id}.pdf`
  );

  // Streamer le PDF directement dans la réponse HTTP (pas de fichier temporaire)
  doc.pipe(res);

  // ── Contenu du PDF ──────────────────────────────────────────────────────
  // Le PDF est construit ligne par ligne
  doc.end(); // Finaliser le PDF (obligatoire)
};
```

---

### 7.2 Contenu du PDF — Texte, lignes, formatage

```js
// ── En-tête ──────────────────────────────────────────────────────────────────
doc.fontSize(24).font("Helvetica-Bold").text("SmartJuice", { align: "center" });
doc.fontSize(12).font("Helvetica").text("Jus naturels frais", { align: "center" });
doc.moveDown(0.5); // Espace vertical

// Ligne horizontale
doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

// ── Informations ─────────────────────────────────────────────────────────────
doc.fontSize(14).font("Helvetica-Bold").text("REÇU DE VENTE");
doc.fontSize(10).font("Helvetica");
doc.text(`N° Vente   : ${vente._id}`);
doc.text(`Date       : ${new Date(vente.dateVente).toLocaleString("fr-TN")}`);
doc.text(`Vendeur    : ${vente.vendeur?.nom} ${vente.vendeur?.prenom}`);

// ── Tableau des produits ──────────────────────────────────────────────────────
// Positions X manuelles pour simuler un tableau
doc.font("Helvetica-Bold");
doc.text("Produit",    50,  doc.y, { width: 200 });
doc.text("Qté",        320, doc.y - doc.currentLineHeight(), { width: 50 });
doc.text("Prix unit.", 375, doc.y - doc.currentLineHeight(), { width: 80 });
doc.text("Sous-total", 460, doc.y - doc.currentLineHeight(), { width: 80 });

doc.font("Helvetica");
for (const p of vente.produits) {
  const y = doc.y;
  doc.text(p.nom,                          50,  y, { width: 200 });
  doc.text(`${p.quantite}`,               320,  y, { width: 50 });
  doc.text(`${p.prixUnitaire.toFixed(2)} DT`, 375, y, { width: 80 });
  doc.text(`${(p.quantite * p.prixUnitaire).toFixed(2)} DT`, 460, y);
  doc.moveDown(0.5);
}

// ── Total ────────────────────────────────────────────────────────────────────
if (vente.escompte > 0) {
  doc.fillColor("red").text(`Escompte 10% : −${vente.escompte.toFixed(2)} DT`, { align: "right" });
  doc.fillColor("black");
}
doc.fontSize(14).font("Helvetica-Bold")
   .text(`TOTAL : ${vente.total.toFixed(2)} DT`, { align: "right" });

// ── Pied de page ──────────────────────────────────────────────────────────────
doc.fontSize(9).fillColor("gray")
   .text("Merci de votre achat ! — SmartJuice © 2026", { align: "center" });

doc.end(); // NE PAS OUBLIER
```

---

### 7.3 Récupérer le PDF côté frontend (Axios)

```js
// client — HistoriqueVentes.jsx
const telechargerRecu = async (id) => {
  const res = await axios.get(`${API_VENTES}/${id}/recu`, {
    headers: authHeader(),
    responseType: "blob",  // Réponse binaire (PDF)
  });

  // Créer un lien de téléchargement temporaire
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href     = url;
  link.download = `recu-vente-${id}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};
```

---

## 8. dotenv — Variables d'environnement

### Pourquoi les variables d'environnement ?

Pour ne pas mettre de **données sensibles** (mots de passe, clés secrètes) dans le code source.

```
Code source (partagé, GitHub)    ←→    .env (JAMAIS partagé, dans .gitignore)
server.js                              MONGO_URI=mongodb://...
authController.js                      JWT_SECRET=monSecretSuperLong
emailConfig.js                         EMAIL_PASSWORD=xxxx xxxx xxxx
```

---

### 8.1 Fichier `.env` du projet

```env
# server/.env

# Base de données MongoDB
MONGO_URI=mongodb://localhost:27017/smartjuice

# Clé secrète pour signer les JWT (longue et aléatoire)
JWT_SECRET=smartjuice_secret_key_2024_very_long_and_secure

# Email pour Nodemailer
EMAIL_USER=smartjuice.app@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# URL du frontend (pour les liens dans les emails)
CLIENT_URL=http://localhost:5173

# Port du serveur
PORT=5000
```

---

### 8.2 Charger les variables dans Node.js

```js
// server.js — TOUJOURS en premier, avant tout import
import dotenv from "dotenv";
dotenv.config(); // Charge le fichier .env

// Maintenant process.env est disponible partout
import { connectDB } from "./src/config/db.js";

// Utilisation dans le code
const PORT = process.env.PORT || 5000;         // Valeur par défaut si absent
await mongoose.connect(process.env.MONGO_URI);
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
```

---

### 8.3 Fichier `.gitignore` — Protéger le `.env`

```gitignore
# server/.gitignore
node_modules/
.env           ← Ne jamais commiter le .env
uploads/       ← Les fichiers uploadés ne sont pas dans git
```

---

### 8.4 Fichier `.env.example` — Documenter les variables attendues

```env
# .env.example (ce fichier EST dans git — sans vraies valeurs)
MONGO_URI=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASSWORD=
CLIENT_URL=
PORT=5000
```

---

## 9. Nodemon — Hot reload en développement

### Qu'est-ce que Nodemon ?

Nodemon **relance automatiquement** le serveur Node.js à chaque modification d'un fichier.
Sans Nodemon : il faudrait arrêter et relancer manuellement le serveur après chaque changement.

---

### 9.1 Configuration dans `package.json`

```json
{
  "name": "server",
  "type": "module",
  "scripts": {
    "dev":            "nodemon server.js",
    "seed:manager":   "node src/seeds/seedManager.js",
    "reset":          "node src/seeds/resetAll.js",
    "update:manager": "node src/seeds/updateManager.js"
  },
  "dependencies": {
    "bcryptjs":    "^3.0.3",
    "cors":        "^2.8.6",
    "dotenv":      "^17.3.1",
    "express":     "^5.2.1",
    "jsonwebtoken":"^9.0.3",
    "mongoose":    "^9.2.1",
    "multer":      "^2.1.1",
    "nodemailer":  "^8.0.1",
    "pdfkit":      "^0.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
```

---

### 9.2 Commandes de développement

```bash
# Lancer le serveur avec hot reload
npm run dev
# → Nodemon surveille les fichiers .js
# → Redémarre automatiquement à chaque modification

# Scripts utilitaires
npm run seed:manager   # Créer le compte manager initial
npm run reset          # Remettre la base à zéro
npm run update:manager # Mettre à jour le manager
```

---

## 10. Architecture MVC — Vue d'ensemble

### Pattern MVC dans le projet

```
MVC = Model  +  View  +  Controller

Model      → Mongoose (schémas + accès MongoDB)
View       → React frontend (pas dans ce dossier)
Controller → Logique métier (authController, venteController...)
```

### Structure complète du dossier serveur

```
server/
├── server.js                    ← Point d'entrée, config Express + routes
├── package.json
├── .env                         ← Variables d'environnement (non partagé)
├── uploads/
│   └── products/                ← Images uploadées par Multer
└── src/
    ├── config/
    │   ├── db.js                ← Connexion MongoDB (Mongoose)
    │   └── emailConfig.js       ← Config Nodemailer + sendResetPasswordEmail
    │
    ├── models/                  ← Schémas Mongoose (M du MVC)
    │   ├── User.js              ← Manager, Seller, Workshop, Client
    │   ├── Product.js           ← Produits (jus)
    │   ├── Commande.js          ← Commandes en ligne + physiques
    │   ├── Vente.js             ← Ventes directes en boutique
    │   ├── Recette.js           ← Recettes de production
    │   ├── MatierePremiere.js   ← Stock matières premières
    │   ├── TypeMP.js            ← Types de matières premières
    │   ├── StockBoutique.js     ← Stock en boutique
    │   ├── ProductionPF.js      ← Productions de produits finis
    │   ├── TransfertBoutique.js ← Transferts atelier → boutique
    │   ├── Notification.js      ← Alertes stock (pour le manager)
    │   └── NotificationClient.js← Alertes commandes (pour les clients)
    │
    ├── controllers/             ← Logique métier (C du MVC)
    │   ├── authController.js    ← Login, register, change password, reset
    │   ├── productController.js ← CRUD produits + upload image
    │   ├── commandeController.js← Gestion commandes (en ligne + physique)
    │   ├── venteController.js   ← Ventes boutique + génération PDF
    │   └── workshopController.js← Gestion atelier (stock MP, PF, recettes)
    │
    ├── routes/                  ← Mapping URL → Controller
    │   ├── authRoutes.js        ← /api/auth/*
    │   ├── productRoutes.js     ← /api/products/*
    │   ├── commandeRoutes.js    ← /api/commandes/*
    │   ├── venteRoutes.js       ← /api/ventes/*
    │   ├── sellerRoutes.js      ← /api/seller/*
    │   ├── workshopRoutes.js    ← /api/workshop/*
    │   └── managerStockRoutes.js← /api/manager/*
    │
    ├── middleware/              ← Middlewares réutilisables
    │   ├── authMiddleware.js    ← authenticate, isManager, isSeller...
    │   └── uploadMiddleware.js  ← Multer (upload images)
    │
    ├── services/                ← Logique métier réutilisable
    │   ├── stockBoutiqueService.js ← calcStockBoutique, ajouterStock...
    │   └── stockPFService.js    ← Gestion stock produits finis
    │
    └── seeds/                   ← Scripts d'initialisation de la base
        ├── seedManager.js       ← Créer le compte manager initial
        ├── seedProducts.js      ← Créer les produits de base
        ├── updateManager.js     ← Mettre à jour le manager
        └── resetAll.js          ← Remettre la base à zéro
```

---

### Flux d'une requête — De bout en bout

```
[Frontend React]
  axios.post("http://localhost:5000/api/auth/login", { email, password })
         ↓
[server.js]
  app.use("/api/auth", authRoutes)
         ↓
[authRoutes.js]
  router.post("/login", login)    ← route publique (pas de middleware)
         ↓
[authController.js — login()]
  1. const { email, password } = req.body
  2. user = await User.findOne({ email })    ← Mongoose → MongoDB
  3. bcrypt.compare(password, user.passwordHash)
  4. jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" })
  5. res.json({ token, user })
         ↓
[Frontend React]
  localStorage.setItem("token", res.data.token)
  → Navigate vers /manager | /seller | /workshop
```

---

### Flux d'une route protégée

```
[Frontend]
  axios.get("http://localhost:5000/api/auth/staff", {
    headers: { Authorization: "Bearer eyJhbGci..." }
  })
         ↓
[authRoutes.js]
  router.get("/staff", authenticate, isManager, getStaffAccounts)
         ↓
[authenticate middleware]
  1. Extraire le token du header Authorization
  2. jwt.verify(token, JWT_SECRET) → decoded = { userId, role }
  3. User.findById(decoded.userId) → req.user = utilisateur
  4. next() → passer à isManager
         ↓
[isManager middleware]
  5. req.user.role === "manager" ? next() : 403
         ↓
[getStaffAccounts controller]
  6. User.find({ role: { $in: ["seller", "workshop"] } }).select("-passwordHash")
  7. res.json(accounts)
         ↓
[Frontend]
  setAccounts(res.data)
```

---

## Résumé — Tableau des technologies

| Technologie | Package | Rôle dans le projet |
|---|---|---|
| **Node.js** | (runtime) | Exécuter du JavaScript côté serveur |
| **Express 5** | `express` | Créer l'API REST (routes, middlewares) |
| **MongoDB** | (base de données) | Stocker les données en JSON |
| **Mongoose** | `mongoose` | Schémas, modèles, requêtes MongoDB |
| **JWT** | `jsonwebtoken` | Authentification stateless par token |
| **bcryptjs** | `bcryptjs` | Hasher les mots de passe |
| **crypto** | (natif Node.js) | Générer les tokens de reset sécurisés |
| **Nodemailer** | `nodemailer` | Envoyer les emails de reset |
| **Multer** | `multer` | Gérer l'upload d'images produits |
| **PDFKit** | `pdfkit` | Générer les reçus PDF des ventes |
| **dotenv** | `dotenv` | Charger les variables d'environnement |
| **cors** | `cors` | Autoriser les requêtes cross-origin |
| **Nodemon** | `nodemon` | Redémarrer le serveur automatiquement |

---

*Cours généré depuis le code source du projet SmartJuice — 2026*
