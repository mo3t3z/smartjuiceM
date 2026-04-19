# Rapport Sprint 4 — SmartJuice
**Tableau de bord Manager (Dashboard)**

---

## 1. Informations générales

| Champ | Détail |
|-------|--------|
| Projet | SmartJuice — Système de gestion de production et vente de jus |
| Sprint | Sprint 4 |
| Objectif principal | Implémentation du tableau de bord manager avec KPIs et graphiques |
| Méthodologie d'analyse | GIMSI (Globalisation, Identification, Modélisation, Sélection, Intégration) |
| Stack technique | React 19 + Vite / Node.js + Express / MongoDB + Mongoose |
| Date | Avril 2026 |

---

## 2. Objectif du Sprint

Implémenter un **tableau de bord décisionnel** pour le manager permettant de :
- Visualiser les **7 KPIs** clés de l'activité en temps réel
- Analyser l'**évolution du chiffre d'affaires** sur 7 jours
- Identifier les **produits les plus vendus** avec filtre dynamique
- Surveiller les **niveaux de stock** (matières premières + boutique) via des graphiques
- Recevoir des **alertes automatiques** en cas de stock critique

---

## 3. Analyse GIMSI

### G — Globalisation *(Comprendre l'environnement)*

SmartJuice est une entreprise de production et vente de jus frais opérant sur deux niveaux :
- **Atelier** : production de jus à partir de matières premières
- **Boutique** : vente directe et gestion des commandes clients

Le manager supervise l'ensemble de la chaîne : approvisionnement → production → transfert → vente.

### I — Identification *(Acteurs et besoins décisionnels)*

| Acteur | Besoin | Décision à prendre |
|--------|--------|-------------------|
| Manager | Suivre les revenus quotidiens et mensuels | Ajuster les prix / promotions |
| Manager | Surveiller le stock MP | Déclencher le réapprovisionnement |
| Manager | Surveiller le stock boutique | Planifier les transferts |
| Manager | Valider les commandes en attente | Accepter / refuser |
| Manager | Suivre la production | Planifier les sessions de production |
| Manager | Identifier les produits phares | Orienter la production |

### M — Modélisation *(Processus métier)*

```
Fournisseur
    ↓
[matierepremieres]
    ↓
[productionpfs] ←── [recettes]
    ↓
[transfertboutiques]
    ↓
[stockboutiques] ──→ [ventes]
                          ↑
                    [commandes]
```

### S — Sélection *(7 KPIs retenus)*

| # | KPI | Axe | Collection source | Décision |
|---|-----|-----|------------------|---------|
| 1 | CA du jour + trend % vs hier | Financier | `ventes` | Performance quotidienne |
| 2 | CA du mois | Financier | `ventes` + `commandes` livrées | Objectif mensuel |
| 3 | Commandes en attente | Opérationnel | `commandes` | Valider / refuser |
| 4 | Productions ce mois (L) | Production | `productionpfs` | Relancer la production ? |
| 5 | Transferts ce mois (L) | Logistique | `transfertboutiques` | Réapprovisionner boutique ? |
| 6 | Panier moyen | Commercial | `ventes` + `commandes` | Ajuster les prix |
| 7 | Produit le plus vendu | Commercial | `ventes.produits` + filtre jour/mois/saison | Orienter la production |

### I — Intégration *(Implémentation dans le SI)*

| Composant | Technologie |
|-----------|-------------|
| API backend | `GET /api/manager/dashboard?filtre=jour\|mois\|saison` |
| Agrégation MongoDB | Pipeline `$match`, `$group`, `$sort`, `$limit`, `$unwind` |
| Charts | Chart.js 4 + react-chartjs-2 (Line, Bar groupé, Bar horizontal) |
| Alertes | Calculées côté backend, affichées si stock < seuil |
| Filtre KPI 7 | Query param `filtre` → re-fetch dynamique |

---

## 4. Diagramme de Cas d'Utilisation (CU)

```mermaid
graph LR
    Manager(["👤 Manager"])

    subgraph SP4["Sprint 4 — Tableau de Bord Manager"]

        subgraph KPIs["📊 Consulter KPIs"]
            UC1(["Voir CA du jour + trend"])
            UC2(["Voir CA du mois"])
            UC3(["Voir commandes en attente"])
            UC4(["Voir productions ce mois"])
            UC5(["Voir transferts ce mois"])
            UC6(["Voir panier moyen"])
        end

        subgraph KPI7["🏆 Produit le plus vendu"]
            UC7(["Filtrer par jour"])
            UC8(["Filtrer par mois"])
            UC9(["Filtrer par saison"])
        end

        subgraph Charts["📈 Consulter Graphiques"]
            UC10(["Voir évolution CA — 7 jours"])
            UC11(["Voir top 5 produits vendus"])
            UC12(["Voir stock MP vs seuil"])
            UC13(["Voir stock boutique vs seuil"])
        end

        subgraph Alertes["🚨 Alertes automatiques"]
            UC14(["Voir alertes stock MP critique"])
            UC15(["Voir alertes stock boutique critique"])
            UC16(["Voir commandes urgentes"])
        end

    end

    Manager --> UC1
    Manager --> UC2
    Manager --> UC3
    Manager --> UC4
    Manager --> UC5
    Manager --> UC6
    Manager --> UC7
    Manager --> UC8
    Manager --> UC9
    Manager --> UC10
    Manager --> UC11
    Manager --> UC12
    Manager --> UC13

    UC12 --> UC14
    UC13 --> UC15
    UC3  --> UC16
```

---

## 5. Diagramme de Classes

```mermaid
classDiagram
    class users {
        +ObjectId _id
        +String email
        +String nom
        +String prenom
        +String passwordHash
        +String role
        +String telephone
        +Date createdAt
    }

    class products {
        +ObjectId _id
        +String name
        +Number price
        +String volume
        +String description
        +String image
        +Boolean available
        +ObjectId recette
        +Date createdAt
    }

    class recettes {
        +ObjectId _id
        +String nomJus
        +ObjectId creerPar
        +Array ingredients
        +Number seuilMinPF
        +Number seuilMinBoutique
        +Date createdAt
    }

    class typemps {
        +ObjectId _id
        +String nom
        +Number seuilMin
        +String unite
        +Date createdAt
    }

    class matierepremieres {
        +ObjectId _id
        +ObjectId typeMP
        +ObjectId enregistrePar
        +Number quantite
        +Number prixUnitaire
        +String unite
        +String fournisseur
        +Date dateEntree
    }

    class productionpfs {
        +ObjectId _id
        +ObjectId recette
        +ObjectId enregistrePar
        +String nomJus
        +Number quantiteProduite
        +Array deductionsMP
        +Date dateProduction
    }

    class transfertboutiques {
        +ObjectId _id
        +ObjectId enregistrePar
        +String nomJus
        +Number quantite
        +Date dateTransfert
    }

    class stockboutiques {
        +ObjectId _id
        +String nomJus
        +Number stockActuel
        +Date updatedAt
    }

    class ventes {
        +ObjectId _id
        +ObjectId vendeur
        +Array produits
        +Number total
        +Number escompte
        +Date dateVente
    }

    class commandes {
        +ObjectId _id
        +String nomClient
        +String telephone
        +Array produits
        +Number total
        +String statut
        +String type
        +String modeRemise
        +Number fraisLivraison
        +Date createdAt
    }

    class notifications {
        +ObjectId _id
        +String categorie
        +String nomJus
        +String typeMP
        +Number niveauActuel
        +Number seuilMin
        +Boolean luAtelier
        +Boolean luManager
        +String message
        +Date createdAt
    }

    class notificationclients {
        +ObjectId _id
        +ObjectId client
        +ObjectId commande
        +String message
        +String statut
        +Boolean lue
        +Date createdAt
    }

    products         --> recettes          : recette
    recettes         --> users             : creerPar
    matierepremieres --> typemps           : typeMP
    matierepremieres --> users             : enregistrePar
    productionpfs    --> recettes          : recette
    productionpfs    --> users             : enregistrePar
    transfertboutiques --> users           : enregistrePar
    transfertboutiques --> stockboutiques  : alimente (nomJus)
    ventes           --> users             : vendeur
    notificationclients --> users          : client
    notificationclients --> commandes      : commande
```

---

## 6. Diagramme de Séquence

### Scénario principal : Chargement du tableau de bord

```mermaid
sequenceDiagram
    actor Manager
    participant Frontend as React (ManagerHome)
    participant API as Express API
    participant Auth as Middleware Auth
    participant DB as MongoDB

    Manager->>Frontend: Navigue vers /manager (Dashboard)
    Frontend->>API: GET /api/manager/dashboard?filtre=mois
    Note right of Frontend: Header: Authorization Bearer token

    API->>Auth: authenticate() + isManager()
    Auth-->>API: req.user validé

    API->>DB: Vente.aggregate (CA jour)
    DB-->>API: caJour

    API->>DB: Vente.aggregate (CA hier)
    DB-->>API: caHier → trendJour %

    API->>DB: Vente.aggregate (CA mois)
    DB-->>API: caMois

    API->>DB: Commande.countDocuments (en_attente)
    DB-->>API: commandesEnAttente

    API->>DB: ProductionPF.aggregate (mois)
    DB-->>API: productionsMois

    API->>DB: TransfertBoutique.aggregate (mois)
    DB-->>API: transfertsMois

    API->>DB: Vente.aggregate + Commande.aggregate (panier moyen)
    DB-->>API: panierMoyen

    API->>DB: Vente.aggregate (top produit filtré)
    DB-->>API: topProduit

    API->>DB: Vente.aggregate (CA 7 jours)
    DB-->>API: evolutionCA[]

    API->>DB: Vente.aggregate (top 5 produits)
    DB-->>API: topProduits[]

    API->>DB: TypeMP.find + calcDisponible()
    DB-->>API: stockMPChart[]

    API->>DB: Recette.find + StockBoutique.find
    DB-->>API: stockBoutiqueChart[]

    API-->>Frontend: JSON { caJour, trendJour, caMois, commandesEnAttente, productionsMois, transfertsMois, panierMoyen, topProduit, evolutionCA, topProduits, stockMPChart, stockBoutiqueChart, alertesMP, alertesBoutique }

    Frontend->>Frontend: Render 6 KPI cards + KPI 7 card
    Frontend->>Frontend: Render Line chart (CA)
    Frontend->>Frontend: Render Bar horizontal (Top produits)
    Frontend->>Frontend: Render Bar groupé (Stock MP)
    Frontend->>Frontend: Render Bar groupé (Stock Boutique)
    Frontend->>Frontend: Render bloc alertes (si stock critique)

    Frontend-->>Manager: Dashboard affiché
```

### Scénario secondaire : Changement de filtre KPI 7

```mermaid
sequenceDiagram
    actor Manager
    participant Frontend as React (ManagerHome)
    participant API as Express API
    participant DB as MongoDB

    Manager->>Frontend: Clique sur "Aujourd'hui"
    Frontend->>Frontend: setFiltre("jour")
    Frontend->>API: GET /api/manager/dashboard?filtre=jour
    API->>DB: Vente.aggregate (dateVente >= debutJour)
    DB-->>API: topProduit (filtré par jour)
    API-->>Frontend: { topProduit: { nom, qte }, filtre: "jour", ... }
    Frontend->>Frontend: Mise à jour carte KPI 7
    Frontend-->>Manager: Produit le plus vendu — Aujourd'hui
```

---

## 7. Architecture technique

### Backend

```
server/
└── src/
    ├── controllers/
    │   └── workshopController.js   ← getDashboardKPIs()
    ├── routes/
    │   └── managerStockRoutes.js   ← GET /dashboard
    └── models/
        ├── Vente.js
        ├── Commande.js
        ├── ProductionPF.js
        ├── TransfertBoutique.js
        ├── StockBoutique.js
        ├── Recette.js
        ├── MatierePremiere.js
        └── TypeMP.js
```

**Endpoint :**
```
GET /api/manager/dashboard?filtre=jour|mois|saison
Headers: Authorization: Bearer <token>
Rôle requis: manager
```

**Réponse JSON :**
```json
{
  "caJour": 450.00,
  "caHier": 380.00,
  "trendJour": 18.4,
  "caMois": 12500.00,
  "commandesEnAttente": 3,
  "productionsMois": 240.5,
  "transfertsMois": 180.0,
  "panierMoyen": 35.20,
  "topProduit": { "nom": "Jus Orange", "qte": 85 },
  "filtre": "mois",
  "evolutionCA": [{ "date": "2026-04-13", "total": 320 }, "..."],
  "topProduits": [{ "_id": "Jus Orange", "totalQte": 320 }, "..."],
  "stockMPChart": [{ "nom": "Orange", "disponible": 45, "seuil": 20, "unite": "kg" }, "..."],
  "stockBoutiqueChart": [{ "nom": "Jus Orange", "disponible": 8, "seuil": 10 }, "..."],
  "alertesMP": [],
  "alertesBoutique": [{ "nom": "Jus Orange", "disponible": 8, "seuil": 10 }]
}
```

### Frontend

```
client/src/pages/
├── ManagerHome.jsx    ← Dashboard principal
└── ManagerHome.css    ← Design premium
```

**Composants Chart.js utilisés :**

| Chart | Type | Données |
|-------|------|---------|
| CA 7 jours | `Line` (courbe + gradient fill) | `evolutionCA` |
| Top 5 produits | `Bar` (horizontal) | `topProduits` |
| Stock MP | `Bar` (groupé, rouge/vert) | `stockMPChart` |
| Stock Boutique | `Bar` (groupé, rouge/bleu) | `stockBoutiqueChart` |

---

## 8. Fonctionnalités implémentées

| # | Fonctionnalité | Statut |
|---|---------------|--------|
| 1 | KPI CA du jour avec trend % vs hier | ✅ |
| 2 | KPI CA du mois (ventes + commandes livrées) | ✅ |
| 3 | KPI Commandes en attente | ✅ |
| 4 | KPI Productions ce mois (litres) | ✅ |
| 5 | KPI Transferts ce mois (litres) | ✅ |
| 6 | KPI Panier moyen du mois | ✅ |
| 7 | KPI Produit le plus vendu + filtre jour/mois/saison | ✅ |
| 8 | Line chart CA évolution 7 jours (gradient fill) | ✅ |
| 9 | Bar horizontal Top 5 produits vendus | ✅ |
| 10 | Bar groupé Stock MP vs seuil (rouge si critique) | ✅ |
| 11 | Bar groupé Stock Boutique vs seuil (rouge si critique) | ✅ |
| 12 | Bloc alertes automatiques (MP + boutique + commandes) | ✅ |
| 13 | Hover animation sur les KPI cards | ✅ |
| 14 | Badge trend ↑↓ coloré sur CA du jour | ✅ |
| 15 | Dashboard ajouté dans la navigation manager | ✅ |

---

## 9. Design System

| Élément | Valeur |
|---------|--------|
| Border radius | 16px |
| Shadow | `0 1px 6px rgba(0,0,0,0.04)` |
| Shadow hover | `0 8px 24px rgba(0,0,0,0.09)` |
| Hover animation | `translateY(-3px)` |
| Couleur positive | `#16a34a` (vert) |
| Couleur négative | `#dc2626` (rouge) |
| Couleur warning | `#ea580c` (orange) |
| Police | Segoe UI, Arial, sans-serif |
| Background | `#f8fafc` |

---

## 10. Retrospective Sprint 4

### Ce qui a bien fonctionné
- Agrégation MongoDB efficace via pipelines
- Design cohérent avec le reste de l'application
- GIMSI a permis de sélectionner des KPIs réellement actionnables
- Filtre dynamique jour/mois/saison sur le produit le plus vendu

### Points d'amélioration
- Ajouter une mise à jour automatique (polling ou WebSocket)
- Ajouter l'export PDF/Excel du rapport
- Ajouter la comparaison mois N vs mois N-1 sur le CA mensuel

---

*Rapport généré pour le Sprint 4 — SmartJuice*
