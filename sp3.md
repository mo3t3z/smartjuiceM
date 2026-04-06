# Sprint 3 — Gestion des Ventes et Commandes

## Vue d'ensemble

Le Sprint 3 ajoute la gestion complète des ventes et commandes à l'application SmartJuice.
Il couvre 10 User Stories (PB15 à PB26) pour 4 rôles : **Client**, **Vendeur**, **Atelier**, **Gérant**.

---

## Dépendances ajoutées

| Côté | Package | Usage |
|------|---------|-------|
| Backend (`server/`) | `pdfkit` | Génération de reçus PDF côté serveur |
| Frontend (`client/`) | `jspdf` | (installé, non utilisé — PDF géré côté serveur) |

---

## Backend — Modifications et ajouts

### Nouveaux modèles Mongoose

#### `server/src/models/Commande.js` *(nouveau)*
Modèle pour les commandes en ligne (client) et physiques (vendeur en boutique).

| Champ | Type | Description |
|-------|------|-------------|
| `client` | ObjectId → User | Référence client (commandes en ligne) |
| `nomClient` | String | Nom du client (commandes physiques) |
| `telephone` | String | Téléphone du client |
| `produits` | Array | Liste des produits : `{produit, nom, volume, quantite, prixUnitaire}` |
| `total` | Number | Montant total |
| `statut` | Enum | `en_attente` → `validee` → `en_preparation` → `livree` (ou `refusee`) |
| `type` | Enum | `en_ligne` ou `physique` |
| `enregistrePar` | ObjectId → User | Vendeur (pour commandes physiques) |
| `commentaireRefus` | String | Motif du refus par le gérant |

---

#### `server/src/models/Vente.js` *(nouveau)*
Modèle pour les ventes directes en boutique (sans commande préalable).

| Champ | Type | Description |
|-------|------|-------------|
| `produits` | Array | Liste des produits vendus : `{produit, nom, volume, quantite, prixUnitaire}` |
| `total` | Number | Montant total |
| `vendeur` | ObjectId → User | Vendeur qui a effectué la vente |
| `nomClient` | String | Nom du client (optionnel) |
| `dateVente` | Date | Date et heure de la vente |

---

### Modèles modifiés

#### `server/src/models/Notification.js` *(modifié)*
- **Ajout** du type `"BOUTIQUE"` dans l'enum `categorie` (était `["MP", "PF"]`, devient `["MP", "PF", "BOUTIQUE"]`)
- Permet de créer des alertes de stock boutique distinctes (PB26)

---

### Nouveau middleware

#### `server/src/middleware/authMiddleware.js` *(modifié)*
Ajout de 3 nouveaux middleware de contrôle de rôle :

```js
// Vérifie que l'utilisateur est un client
export const isClient = (req, res, next) => { ... }

// Vérifie que l'utilisateur est vendeur OU gérant
export const isSellerOrManager = (req, res, next) => { ... }

// Vérifie que l'utilisateur est atelier OU gérant
export const isWorkshopOrManager = (req, res, next) => { ... }
```

---

### Nouveaux controllers

#### `server/src/controllers/commandeController.js` *(nouveau)*
Contient les fonctions suivantes :

| Fonction | Route | Rôle | Description |
|----------|-------|------|-------------|
| `calcStockBoutique(nomJus)` | Helper interne | — | Calcule le stock boutique réel : transferts − ventes − commandes livrées |
| `creerCommandeEnLigne` | `POST /api/commandes` | Client | PB19 : Créer commande depuis le panier |
| `getMesCommandes` | `GET /api/commandes/mes-commandes` | Client | PB21 : Consulter ses commandes |
| `getCommandesEnAttente` | `GET /api/commandes/en-attente` | Gérant | PB20 : Lister les commandes en attente |
| `getToutesCommandes` | `GET /api/commandes/toutes` | Gérant | Toutes les commandes avec filtres |
| `validerCommande` | `PUT /api/commandes/:id/valider` | Gérant | PB20 : Valider une commande |
| `refuserCommande` | `PUT /api/commandes/:id/refuser` | Gérant | PB20 : Refuser avec commentaire |
| `getCommandesConfirmees` | `GET /api/commandes/confirmees` | Atelier | PB23 : Commandes à préparer |
| `mettreEnPreparation` | `PUT /api/commandes/:id/en-preparation` | Atelier | Changer statut → en_preparation |
| `marquerLivree` | `PUT /api/commandes/:id/livree` | Vendeur/Gérant | Livraison + déduction stock + alerte PB26 |
| `creerCommandePhysique` | `POST /api/commandes/physique` | Vendeur | PB22 : Commande boutique physique |
| `genererRecuCommande` | `GET /api/commandes/:id/recu` | Vendeur/Gérant | PB22 : Génère reçu PDF via pdfkit |
| `getDashboardVentes` | `GET /api/commandes/dashboard` | Gérant | PB25 : Stats ventes et commandes |

---

#### `server/src/controllers/venteController.js` *(nouveau)*
Contient les fonctions suivantes :

| Fonction | Route | Rôle | Description |
|----------|-------|------|-------------|
| `creerVente` | `POST /api/ventes` | Vendeur | PB24 : Vente directe + vérif stock + alerte PB26 |
| `getVentes` | `GET /api/ventes` | Gérant | Toutes les ventes |
| `getMesVentes` | `GET /api/ventes/mes-ventes` | Vendeur | Ses propres ventes |
| `getStockBoutiqueDisponible` | `GET /api/ventes/stock-boutique` | Vendeur/Gérant | Stock boutique réel par produit |
| `genererRecuVente` | `GET /api/ventes/:id/recu` | Vendeur/Gérant | PB24 : Génère reçu PDF via pdfkit |

---

### Nouveaux fichiers de routes

#### `server/src/routes/commandeRoutes.js` *(nouveau)*
```
POST   /api/commandes              → créer commande en ligne (client)
GET    /api/commandes/mes-commandes → mes commandes (client)
GET    /api/commandes/en-attente   → commandes en attente (gérant)
GET    /api/commandes/toutes       → toutes commandes avec filtre (gérant)
GET    /api/commandes/confirmees   → commandes à préparer (atelier/gérant)
GET    /api/commandes/dashboard    → statistiques (gérant)
POST   /api/commandes/physique     → commande physique (vendeur)
PUT    /api/commandes/:id/valider  → valider (gérant)
PUT    /api/commandes/:id/refuser  → refuser (gérant)
PUT    /api/commandes/:id/en-preparation → mettre en préparation (atelier)
PUT    /api/commandes/:id/livree   → marquer livrée (vendeur/gérant)
GET    /api/commandes/:id/recu     → reçu PDF (vendeur/gérant)
```

#### `server/src/routes/venteRoutes.js` *(nouveau)*
```
POST   /api/ventes                 → créer vente directe (vendeur)
GET    /api/ventes                 → toutes les ventes (gérant)
GET    /api/ventes/mes-ventes      → mes ventes (vendeur)
GET    /api/ventes/stock-boutique  → stock disponible (vendeur/gérant)
GET    /api/ventes/:id/recu        → reçu PDF (vendeur/gérant)
```

---

### Controllers modifiés

#### `server/src/controllers/workshopController.js` *(modifié)*
- **Ajout des imports** `Vente` et `Commande`
- **Refonte de `getStockPFBoutique`** : le calcul du stock boutique inclut maintenant les déductions :
  - Avant : `disponible = sum(TransfertBoutique)`
  - Après : `disponible = sum(transferts) − sum(ventes_litres) − sum(commandes_livrees_litres)`
- La réponse enrichie ajoute les champs `totalVendu` et `totalLivre`

**Formule de conversion litres :**
- Produit `0.5L` : 1 unité = 0.5 L
- Produit `1L` : 1 unité = 1 L

---

### `server/server.js` *(modifié)*
Enregistrement des 2 nouvelles routes :
```js
app.use("/api/commandes", commandeRoutes);
app.use("/api/ventes",    venteRoutes);
```

---

## Frontend — Modifications et ajouts

### `client/src/utils/api.js` *(modifié)*
Ajouts :
```js
// Nouvelles constantes d'URL
export const API_COMMANDES = "http://localhost:5000/api/commandes";
export const API_VENTES    = "http://localhost:5000/api/ventes";

// Helpers panier (localStorage)
export const getPanier()               // Lit le panier depuis localStorage
export const savePanier(panier)        // Sauvegarde le panier
export const ajouterAuPanier(produit)  // Ajoute/incrémente un produit
export const getNbArticlesPanier()     // Retourne le nombre total d'articles
```

---

### Nouvelles pages — Client

#### `client/src/pages/client/Panier.jsx` + `Panier.css` *(nouveau)*
**PB18 — Gérer le panier**
- Affiche les articles du panier (depuis localStorage)
- Modifier les quantités (+ / −)
- Supprimer un article ou vider tout le panier
- Calcul du total en temps réel
- **PB19 — Passer la commande** : bouton "Passer la commande" appelle `POST /api/commandes`
- Redirige vers "Mes commandes" après succès

#### `client/src/pages/client/MesCommandes.jsx` + `MesCommandes.css` *(nouveau)*
**PB21 — Suivre l'état de sa commande**
- Liste toutes les commandes du client connecté
- Affiche le statut avec couleur (badge coloré)
- Barre de progression visuelle : En attente → Validée → En préparation → Livrée
- Affiche le motif de refus si applicable

---

### Nouvelles pages — Gérant

#### `client/src/pages/manager/GererCommandes.jsx` + `GererCommandes.css` *(nouveau)*
**PB20 — Valider ou refuser une commande**
- Liste filtrée par statut et type (en ligne / boutique)
- Actions disponibles selon statut :
  - **En attente** : boutons Valider ✓ et Refuser ✕
  - **Validée / En préparation** : bouton Marquer livrée
- Modal de refus avec champ commentaire
- Bouton "Reçu PDF" pour télécharger le reçu de n'importe quelle commande

#### `client/src/pages/manager/DashboardVentes.jsx` + `DashboardVentes.css` *(nouveau)*
**PB25 — Suivre les ventes et commandes**
- **KPIs ventes directes** : aujourd'hui / semaine / mois / total (nb ventes + chiffre d'affaires)
- **Commandes par statut** : compteurs et CA par statut
- **Top 5 produits** les plus vendus en ventes directes
- **Évolution journalière** des ventes (30 derniers jours, tableau)
- **10 dernières ventes** avec détails

---

### Nouvelles pages — Vendeur

#### `client/src/pages/seller/NouvelleVente.jsx` + `NouvelleVente.css` *(nouveau)*
**PB24 — Enregistrer une vente en boutique + reçu PDF**
- Affiche le catalogue avec **stock boutique disponible** en litres et unités
- Empêche d'ajouter plus que le stock disponible (vérification côté client ET serveur)
- Formulaire de saisie du nom client (optionnel)
- Récapitulatif avec contrôle des quantités et total
- Après enregistrement : bannière succès + bouton **télécharger le reçu PDF**
- Déclenchement automatique des alertes PB26 côté serveur

#### `client/src/pages/seller/NouvelleCommandePhysique.jsx` + `NouvelleCommandePhysique.css` *(nouveau)*
**PB22 — Enregistrer une commande physique + reçu PDF**
- Sélection des produits depuis le catalogue
- Saisie du nom client (obligatoire) et téléphone
- Récapitulatif et total
- Enregistrement avec statut `en_attente` (doit être validée par le gérant)
- Bouton **télécharger le reçu PDF** après création

---

### Nouvelle page — Atelier

#### `client/src/pages/workshop/CommandesConfirmees.jsx` + `CommandesConfirmees.css` *(nouveau)*
**PB23 — Consulter les commandes confirmées**
- Affiche les commandes avec statut `validee` ou `en_preparation`
- Compteur de commandes à traiter
- Détail de chaque commande : client, produits (avec badge quantité), total
- Bouton **Mettre en préparation** (pour les commandes validées)
- Badge "En cours de préparation" (pour les commandes déjà en cours)
- Bouton d'actualisation

---

### Pages modifiées

#### `client/src/pages/CatalogClient.jsx` *(modifié)*
- Import des helpers panier (`ajouterAuPanier`, `getNbArticlesPanier`)
- Ajout de l'état `nbPanier` (badge sur l'icône panier)
- Ajout de l'état `toast` (notification de confirmation)
- **Bouton panier 🛒** avec badge du nombre d'articles dans le header
- **Bouton "Mes commandes"** dans le header (clients connectés)
- Bouton "Commander" → "Ajouter au panier" si connecté, redirige vers login sinon
- Toast animé de confirmation après ajout au panier

#### `client/src/pages/CatalogClient.css` *(modifié)*
- Styles `.catalog-header-actions` (flex wrapper des boutons header)
- Styles `.panier-button` et `.panier-badge`
- Styles `.mes-commandes-button`
- Styles `.catalog-toast` avec animation `slideIn`

#### `client/src/pages/SellerHome.jsx` *(modifié)*
Ajout de 2 nouvelles cartes d'action :
- **Nouvelle Vente** → `/seller/nouvelle-vente`
- **Nouvelle Commande Physique** → `/seller/nouvelle-commande`

#### `client/src/pages/WorkshopHome.jsx` *(modifié)*
Ajout d'une carte d'action :
- **Commandes à Préparer** → `/workshop/commandes-confirmees`

#### `client/src/pages/WorkshopHome.css` *(modifié)*
Ajout des styles pour la couleur `teal` (carte "Commandes à Préparer") :
- `.wh-card--teal::before`
- `.wh-card--teal .wh-card-icon`
- `.wh-card--teal .wh-card-arrow`

#### `client/src/pages/ManagerHome.jsx` *(modifié)*
Ajout de 2 nouvelles cartes d'action :
- **Gestion des Commandes** → `/manager/commandes`
- **Dashboard Ventes** → `/manager/dashboard-ventes`

#### `client/src/pages/ManagerHome.css` *(modifié)*
Ajout des styles pour les couleurs `purple` et `red` :
- `.mh-card--purple::before` / `.mh-card--red::before`
- `.mh-card--purple .mh-card-icon` / `.mh-card--red .mh-card-icon`
- `.mh-card--purple .mh-card-arrow` / `.mh-card--red .mh-card-arrow`

#### `client/src/App.jsx` *(modifié)*
Ajout de 7 nouvelles routes :

```jsx
// Client
/client/panier          → <Panier />           (ProtectedRoute: client)
/client/mes-commandes   → <MesCommandes />      (ProtectedRoute: client)

// Gérant
/manager/commandes          → <GererCommandes />   (ProtectedRoute: manager)
/manager/dashboard-ventes   → <DashboardVentes />  (ProtectedRoute: manager)

// Vendeur
/seller/nouvelle-vente      → <NouvelleVente />             (ProtectedRoute: seller)
/seller/nouvelle-commande   → <NouvelleCommandePhysique />  (ProtectedRoute: seller)

// Atelier
/workshop/commandes-confirmees → <CommandesConfirmees /> (ProtectedRoute: workshop)
```

---

## Logique métier importante

### Calcul du stock boutique (PB26)

```
stock_boutique(nomJus) =
  Σ TransfertBoutique.quantite (où nomJus = X)
  − Σ (Vente.produits.quantite × litresParUnite)  (où nom = X)
  − Σ (Commande[statut=livree].produits.quantite × litresParUnite)  (où nom = X)
```

Avec : `litresParUnite = 1` si volume `"1L"`, `0.5` si volume `"0.5L"`

### Alertes de stock boutique PB26

Déclenchées automatiquement après :
1. Chaque **vente directe** (`creerVente`)
2. Chaque **commande marquée livrée** (`marquerLivree`)

Condition : `stock_boutique(nomJus) ≤ recette.seuilMinPF`

Si condition vraie ET qu'aucune notification `BOUTIQUE` non-lue n'existe déjà pour ce jus :
→ Création d'une `Notification` avec `categorie: "BOUTIQUE"`, visible par le gérant ET l'atelier.

### Génération PDF (pdfkit)

Les reçus PDF contiennent :
- En-tête SmartJuice
- Numéro de commande/vente
- Date et type
- Informations client
- Tableau des produits (nom, volume, quantité, prix unitaire, sous-total)
- Total en bas
- Pied de page

Retournés en `Content-Type: application/pdf` pour téléchargement direct côté client.

### Panier (localStorage)

Le panier est stocké côté client dans `localStorage["panier"]` sous forme de tableau JSON :
```json
[
  {
    "produitId": "...",
    "nom": "Jus d'Orange",
    "prix": 3.5,
    "volume": "0.5L",
    "image": "...",
    "quantite": 2
  }
]
```
Il est vidé automatiquement après validation d'une commande en ligne.

---

## Résumé des User Stories

| ID | Description | Rôle | Statut |
|----|-------------|------|--------|
| PB15 | Gérer le catalogue (CRUD produits) | Gérant | ✅ Déjà implémenté (Sprint 1/2) |
| PB16 | Consulter le catalogue | Client | ✅ Déjà implémenté (Sprint 1/2) |
| PB18 | Gérer le panier | Client | ✅ Panier.jsx |
| PB19 | Passer une commande en ligne | Client | ✅ Panier.jsx → POST /api/commandes |
| PB20 | Valider ou refuser une commande | Gérant | ✅ GererCommandes.jsx |
| PB21 | Suivre l'état de sa commande | Client | ✅ MesCommandes.jsx |
| PB22 | Commande physique + reçu PDF | Vendeur | ✅ NouvelleCommandePhysique.jsx |
| PB23 | Commandes confirmées à préparer | Atelier | ✅ CommandesConfirmees.jsx |
| PB24 | Vente en boutique + reçu PDF | Vendeur | ✅ NouvelleVente.jsx |
| PB25 | Dashboard ventes et commandes | Gérant | ✅ DashboardVentes.jsx |
| PB26 | Alertes stock boutique automatiques | Gérant + Atelier | ✅ Notifications automatiques |
