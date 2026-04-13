# Chatbot SmartJuice — Documentation des modifications

## Vue d'ensemble

Ajout d'un chatbot intelligent **rule-based** (sans IA) pour le projet SmartJuice.
Le chatbot détecte les intentions des utilisateurs par mots-clés, scoring et synonymes multilingues (FR / EN / Darija).

---

## Fichiers créés

### Backend

#### `server/src/models/Intent.js`
Modèle Mongoose représentant une intention dans MongoDB.

| Champ | Type | Description |
|---|---|---|
| `name` | String | Identifiant unique de l'intention |
| `keywords` | [String] | Mots-clés détectés dans le message |
| `synonyms` | [String] | Synonymes FR / EN / Darija |
| `response` | String | Réponse envoyée au client |
| `priority` | Number | Poids pour le scoring (1–5) |

---

#### `server/src/controllers/chatbotController.js`
Moteur de traitement des messages.

**Fonctions internes :**
- `normalizeText(text)` — lowercase + suppression des accents + ponctuation
- `tokenize(text)` — découpe le message en tokens
- `scoreIntent(msg, tokens, intent)` — calcule le score d'une intention
- `analyzeMessage(message, intents)` — analyse complète, retourne les réponses triées

**Handler Express :**
- `handleChatMessage` — `POST /api/chatbot/message`
  - Charge les intentions depuis MongoDB
  - Appelle `analyzeMessage`
  - Retourne les réponses (multi-intent) ou le message fallback

**Algorithme de scoring :**
```
Score = nb_termes_matchés × priority
```
- Token unique → comparaison exacte sur les tokens du message
- Expression multi-mots → recherche en sous-chaîne du message normalisé
- Toutes les intentions avec score > 0 sont retournées, triées par score décroissant

---

#### `server/src/routes/chatbotRoutes.js`
Route Express exposant l'endpoint du chatbot.

```
POST /api/chatbot/message
Body  : { message: string }
Retour: { responses: string[], matched: boolean, debug: [...] }
```

---

#### `server/src/seeds/seedIntents.js`
Script de peuplement de la collection `intents` dans MongoDB Atlas.

**12 intentions SmartJuice intégrées :**

| Intention | Sujet | Priority |
|---|---|---|
| `salutation` | Bonjour / Hello / Salam | 1 |
| `remerciement` | Merci / Thanks / Chokran | 1 |
| `conversion` | 1 litre = 5 verres | 2 |
| `livraison` | Frais 3 DT / retrait boutique | 2 |
| `localisation` | Rue Haj Ali Soua, Ksar Hellal | 2 |
| `produits` | Jus 100% naturels, sans conservateurs | 2 |
| `conservation` | 3 jours max au réfrigérateur | 2 |
| `production` | Préparés le jour même | 2 |
| `horaires` | 7j/7 de 09h00 à 17h00 | 2 |
| `prix` | Catalogue + réduction | 2 |
| `reduction` | -10% si commande > 200 DT | 3 |
| `commande` | Impossible après 3 mois d'inactivité | 3 |

**Commande d'exécution :**
```bash
cd server
npm run seed:intents
```

---

### Frontend

#### `client/src/components/Chatbot.jsx`
Widget React flottant affiché sur toutes les pages.

**Fonctionnalités :**
- Bouton flottant 🧃 (bas-droite) pour ouvrir/fermer le chat
- Message de bienvenue automatique à l'ouverture
- Suggestions rapides cliquables (horaires, livraison, produits, adresse)
- Envoi par `Enter` ou bouton
- Indicateur de frappe animé (3 points)
- Affichage multi-bulles si plusieurs intentions détectées
- Scroll automatique vers le dernier message
- Responsive mobile (largeur adaptée < 480px)

---

#### `client/src/components/Chatbot.css`
Styles du widget.

- Palette verte SmartJuice (`#2e7d32` → `#43a047`)
- Animation d'ouverture (`chatbot-pop`)
- Indicateur de frappe (`chatbot-bounce`)
- Bulles utilisateur (vert dégradé) / bot (blanc avec ombre)
- Suggestions en chips arrondies
- Scrollbar personnalisée

---

## Fichiers modifiés

### `server/server.js`
Ajout de l'import et du montage de la route chatbot :
```js
import chatbotRoutes from "./src/routes/chatbotRoutes.js";
// ...
app.use("/api/chatbot", chatbotRoutes);
```

### `server/package.json`
Ajout du script de seed :
```json
"seed:intents": "node src/seeds/seedIntents.js"
```

### `client/src/App.jsx`
Import et rendu global du widget (hors `<Routes>`) :
```jsx
import Chatbot from "./components/Chatbot.jsx";

export default function App() {
  return (
    <>
      <Chatbot />
      <Routes>
        {/* ... */}
      </Routes>
    </>
  );
}
```

---

## Mise en route

```bash
# 1. Peupler MongoDB avec les intentions
cd server
npm run seed:intents

# 2. Lancer le serveur
npm run dev

# 3. Lancer le client
cd ../client
npm run dev
```

Le widget 🧃 apparaît automatiquement sur toutes les pages à `http://localhost:5173`.

---

## Endpoint API

```
POST http://localhost:5000/api/chatbot/message
Content-Type: application/json

{ "message": "Quels sont vos horaires ?" }
```

**Réponse :**
```json
{
  "responses": ["🕒 Nous sommes ouverts 7j/7 de 09h00 à 17h00..."],
  "matched": true,
  "debug": [{ "name": "horaires", "score": 4 }]
}
```

**Fallback (aucune intention détectée) :**
```json
{
  "responses": ["🤔 Je n'ai pas bien compris votre question..."],
  "matched": false,
  "debug": []
}
```
