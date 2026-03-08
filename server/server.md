# Server Documentation

## Structure du dossier `server`

Le dossier `server` contient le code backend de l'application. Voici la structure détaillée :

```
server/
├── package.json
├── server.js
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── productController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Product.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── productRoutes.js
│   └── seeds/
│       ├── seedManager.js
│       └── seedProducts.js
```

## Description des fichiers principaux

### 1. `server.js`
C'est le point d'entrée principal du serveur. Il configure l'application Express, connecte la base de données et démarre le serveur.

### 2. `package.json`
Ce fichier contient les dépendances nécessaires pour le serveur, comme `express`, `mongoose`, etc.

## Répertoire `src`

### 1. `config/db.js`
Ce fichier configure la connexion à la base de données MongoDB à l'aide de Mongoose.

### 2. `controllers`
- **`authController.js`** : Contient les fonctions pour gérer l'authentification des utilisateurs (connexion, inscription, etc.).
- **`productController.js`** : Gère les opérations liées aux produits (ajout, suppression, mise à jour, etc.).

### 3. `middleware`
- **`authMiddleware.js`** : Middleware pour vérifier l'authentification et les autorisations des utilisateurs.

### 4. `models`
- **`Product.js`** : Définit le modèle de données pour les produits.
- **`User.js`** : Définit le modèle de données pour les utilisateurs.

### 5. `routes`
- **`authRoutes.js`** : Définit les routes pour l'authentification (ex. `/login`, `/register`).
- **`productRoutes.js`** : Définit les routes pour les produits (ex. `/products`, `/products/:id`).

### 6. `seeds`
- **`seedManager.js`** : Script pour insérer des données initiales pour les gestionnaires.
- **`seedProducts.js`** : Script pour insérer des données initiales pour les produits.

## Fonctionnalités principales

1. **Authentification**
   - Inscription et connexion des utilisateurs.
   - Vérification des jetons JWT pour sécuriser les routes.

2. **Gestion des produits**
   - CRUD (Create, Read, Update, Delete) pour les produits.

3. **Middleware**
   - Vérification des autorisations pour accéder à certaines routes.

4. **Base de données**
   - Utilisation de MongoDB pour stocker les données des utilisateurs et des produits.

## Commandes utiles

### Installer les dépendances
```bash
npm install
```

### Démarrer le serveur
```bash
npm start
```

### Exécuter les scripts de seed
```bash
node src/seeds/seedManager.js
node src/seeds/seedProducts.js
```

## Notes supplémentaires
- Assurez-vous que MongoDB est en cours d'exécution avant de démarrer le serveur.
- Les variables d'environnement (comme l'URL de la base de données) doivent être configurées dans un fichier `.env`.