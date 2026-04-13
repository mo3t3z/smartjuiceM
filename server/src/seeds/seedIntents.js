/**
 * Script de seed — Peuple la collection "intents" dans MongoDB Atlas.
 * Exécuter avec : node src/seeds/seedIntents.js
 *
 * Architecture :
 *  - keywords  : mots-clés détectés dans le message (tokens exacts)
 *  - synonyms  : expressions multi-mots ou termes EN / Darija
 *  - priority  : poids du score (1-5, 5 = très important)
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Intent from "../models/Intent.js";

const INTENTS = [
  // ── 1. Conversion litre → verres ──────────────────────────────────────────
  {
    name: "conversion",
    keywords: [
      "litre", "litres", "liter", "liters",
      "verre", "verres", "glass", "glasses",
      "conversion", "equivalent", "equivalence",
      "combien", "contient", "mesure",
      "qaddech", "addech", "qd",
    ],
    synonyms: [
      "combien de verres", "1 litre", "un litre",
      "how many glasses", "litres en verres",
    ],
    response: "🥤 1 litre de jus = 5 verres. C'est pratique pour calculer vos besoins avant de commander !",
    priority: 2,
  },

  // ── 2. Réduction / promo ───────────────────────────────────────────────────
  {
    name: "reduction",
    keywords: [
      "reduction", "remise", "promo", "promotion",
      "discount", "offre", "avantage",
      "takhfidh", "rkhis", "moins", "solde",
      "200", "fidélité", "fidelite",
    ],
    synonyms: [
      "moins cher", "bon plan", "prix reduit", "prix réduit",
      "200 dt", "200 dinar", "commande superieure",
    ],
    response: "💰 Bonne nouvelle ! -10% de réduction sur toute commande supérieure à 200 DT. Profitez-en ! 🎉",
    priority: 3,
  },

  // ── 3. Livraison ───────────────────────────────────────────────────────────
  {
    name: "livraison",
    keywords: [
      "livraison", "livrer", "livreur", "livré",
      "delivery", "domicile", "expedition", "envoi",
      "recuperer", "récupérer", "ramasser", "retrait",
      "frais", "gratuit",
      "lwasla", "yjiblna", "twassalni", "jibli",
    ],
    synonyms: [
      "3 dt", "3dt", "frais de livraison",
      "en boutique", "récupération en boutique",
      "home delivery", "livraison a domicile",
    ],
    response: "🚚 Livraison à domicile disponible pour seulement 3 DT. Vous pouvez aussi récupérer votre commande en boutique (gratuit) 😊",
    priority: 2,
  },

  // ── 4. Localisation / adresse ─────────────────────────────────────────────
  {
    name: "localisation",
    keywords: [
      "adresse", "ou", "localisation", "location",
      "situe", "trouver", "emplacement",
      "ksar", "hellal", "tijari", "bank",
      "soua", "rue", "haj",
      "win", "fein", "wين",
    ],
    synonyms: [
      "ksar hellal", "haj ali soua", "tijari bank",
      "ou vous trouver", "ou etes vous",
      "where are you", "your address",
    ],
    response: "📍 Vous nous trouvez au : Rue Haj Ali Soua, Ksar Hellal, en face de la Tijari Bank. On vous attend ! 😊",
    priority: 2,
  },

  // ── 5. Produits ───────────────────────────────────────────────────────────
  {
    name: "produits",
    keywords: [
      "produit", "produits", "jus", "juice",
      "naturel", "naturels", "conservateur", "additif",
      "sucre", "bio", "sain", "frais", "ingredients",
      "fruits", "fruit", "legume", "legumes",
      "khudra", "fruits", "tabiyi",
    ],
    synonyms: [
      "sans conservateur", "sans sucre", "100% naturel",
      "jus frais", "jus naturel", "que vendez vous",
      "vos produits", "your products",
    ],
    response: "🍃 Nos jus sont 100% naturels, sans conservateurs ni additifs. Des options sans sucre disponibles pour prendre soin de votre santé ! 💚",
    priority: 2,
  },

  // ── 6. Conservation ───────────────────────────────────────────────────────
  {
    name: "conservation",
    keywords: [
      "conservation", "conserver", "duree", "durée",
      "refrigerateur", "frigo", "perime", "périmé",
      "expiration", "garder", "stocker",
      "combien", "temps", "jours",
      "bkhir", "yfsd", "yetla",
    ],
    synonyms: [
      "combien de temps", "se conserve", "durée de conservation",
      "shelf life", "how long", "3 jours",
    ],
    response: "⏳ Nos jus se conservent au maximum 3 jours au réfrigérateur pour garantir toute leur fraîcheur 🌡️",
    priority: 2,
  },

  // ── 7. Production / fraîcheur ─────────────────────────────────────────────
  {
    name: "production",
    keywords: [
      "prepare", "preparé", "préparé", "fabrication",
      "fait", "production", "frais", "fraiches",
      "masnoo3", "tayyar", "waqtash",
    ],
    synonyms: [
      "jour meme", "jour même", "prepared today",
      "freshly made", "quand est prepare", "fait le jour meme",
    ],
    response: "🧃 Tous nos jus sont préparés le jour même pour une fraîcheur optimale à chaque commande ! ✨",
    priority: 2,
  },

  // ── 8. Horaires ───────────────────────────────────────────────────────────
  {
    name: "horaires",
    keywords: [
      "horaire", "horaires", "heure", "heures",
      "ouvert", "ferme", "fermé", "ouverture", "fermeture",
      "disponible", "schedule", "open", "closed",
      "waqt", "mta", "sa3a",
    ],
    synonyms: [
      "7/7", "7 jours", "9h", "17h", "09h",
      "quand ouvrez vous", "vous etes ouverts",
      "opening hours", "what time",
    ],
    response: "🕒 Nous sommes ouverts 7j/7 de 09h00 à 17h00. On vous accueille tous les jours ! 😊",
    priority: 2,
  },

  // ── 9. Commande / contraintes ─────────────────────────────────────────────
  {
    name: "commande",
    keywords: [
      "commande", "commander", "order", "passer",
      "impossible", "expirer", "expire", "annuler",
      "annule", "delai", "délai", "deadline",
      "tléb", "tlabna", "nkhdem",
    ],
    synonyms: [
      "3 mois", "trois mois", "apres 3 mois",
      "passer commande", "passer une commande",
      "place order", "comment commander",
    ],
    response: "⚠️ Attention : il est impossible de passer une commande après 3 mois d'inactivité sur le compte. Pensez à commander régulièrement 😉",
    priority: 3,
  },

  // ── 10. Salutations ───────────────────────────────────────────────────────
  {
    name: "salutation",
    keywords: [
      "bonjour", "bonsoir", "salut", "hello", "hi",
      "hey", "coucou", "allo", "salam", "ahlen",
      "marhba", "hola", "yo",
    ],
    synonyms: [
      "bon matin", "good morning", "good evening",
    ],
    response: "👋 Bonjour ! Bienvenue chez SmartJuice ! Comment puis-je vous aider ? Vous pouvez me demander les horaires, les produits, la livraison ou l'adresse 😊",
    priority: 1,
  },

  // ── 11. Remerciement ──────────────────────────────────────────────────────
  {
    name: "remerciement",
    keywords: [
      "merci", "thanks", "thank", "shukran", "chokran",
      "parfait", "super", "genial", "génial", "nickel",
      "cool", "top", "excellent",
    ],
    synonyms: [
      "c'est bien", "c'est parfait", "merci beaucoup", "thank you",
    ],
    response: "😊 Avec plaisir ! Si vous avez d'autres questions, n'hésitez pas. Bonne journée ! ☀️",
    priority: 1,
  },

  // ── 12. Prix / tarifs ─────────────────────────────────────────────────────
  {
    name: "prix",
    keywords: [
      "prix", "tarif", "tarifs", "cout", "coût",
      "combien", "cher", "payer", "paiement",
      "taman", "bchhal", "price", "cost",
    ],
    synonyms: [
      "combien ca coute", "combien ça coûte",
      "prix du jus", "tarif livraison",
      "how much", "what's the price",
    ],
    response: "💵 Consultez notre catalogue pour voir les prix de chaque produit. N'oubliez pas : -10% de réduction pour toute commande > 200 DT ! 🎉",
    priority: 2,
  },
];

async function seedIntents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecte a MongoDB !");

    // Suppression des anciennes intentions pour repartir propre
    await Intent.deleteMany({});
    console.log("Anciennes intentions supprimees.");

    const inserted = await Intent.insertMany(INTENTS);
    console.log(`${inserted.length} intentions inserees avec succes !`);

    // Affichage recap
    inserted.forEach((i) =>
      console.log(`  ✓ [${i.name}] — ${i.keywords.length} keywords, priority ${i.priority}`)
    );
  } catch (err) {
    console.error("Erreur seed :", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Deconnecte de MongoDB.");
  }
}

seedIntents();
