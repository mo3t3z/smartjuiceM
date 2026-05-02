/**
 * seedRecettes.js — Crée une recette pour chaque produit disponible
 *
 * Utilise les TypeMP existants comme ingrédients.
 * Associe automatiquement les ingrédients selon le nom du produit.
 *
 * Usage :
 *   node src/seeds/seedRecettes.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product  from "../models/Product.js";
import Recette  from "../models/Recette.js";
import TypeMP   from "../models/TypeMP.js";
import User     from "../models/User.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("Connecté à MongoDB\n");

const produits = await Product.find({ available: true });
const types    = await TypeMP.find({});
const manager  = await User.findOne({ role: "manager" });
const workshop = await User.findOne({ role: "workshop" }) ?? manager;

if (!workshop) {
  console.error("Aucun utilisateur manager/workshop trouvé.");
  process.exit(1);
}

// Normalise un nom : minuscules, sans accents, sans espaces
const norm = (s) =>
  s.toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]/g, "");

// Map TypeMP : nomNormalisé → { nom, unite }
const typeMap = {};
for (const t of types) {
  typeMap[norm(t.nom)] = { nom: t.nom, unite: t.unite };
}

// Recherche un TypeMP dont le nom est contenu dans le nom du produit, ou inversement
function trouverMP(nomProduit) {
  const nProd = norm(nomProduit);
  for (const [nType, t] of Object.entries(typeMap)) {
    if (nProd.includes(nType) || nType.includes(nProd)) return t;
  }
  return null;
}

// Unité par défaut selon l'unite du TypeMP
function qteParLitre(unite) {
  if (unite === "L" || unite === "mL") return 0.8;   // liquide : 800 mL/L
  if (unite === "kg" || unite === "g") return 0.7;   // fruit : 700 g/L
  return 1;
}

let created = 0;
let skipped = 0;

for (const prod of produits) {
  const existe = await Recette.findOne({ nomJus: prod.name });
  if (existe) { skipped++; continue; }

  // Ingrédient principal basé sur le nom du produit
  const mpPrincipal = trouverMP(prod.name);
  const ingredients = [];

  if (mpPrincipal) {
    ingredients.push({
      matiere:  mpPrincipal.nom,
      quantite: qteParLitre(mpPrincipal.unite),
      unite:    mpPrincipal.unite === "mL" ? "L"
              : mpPrincipal.unite === "g"  ? "kg"
              : mpPrincipal.unite,
    });
  }

  // Ajouter lait si le produit en contient (noisette, pistache, etc.)
  const nProd = norm(prod.name);
  const lait  = typeMap["lait"];
  if (lait && (nProd.includes("noisette") || nProd.includes("pistache") || nProd.includes("cacao") || nProd.includes("amande"))) {
    ingredients.push({ matiere: lait.nom, quantite: 0.4, unite: lait.unite === "mL" ? "L" : lait.unite });
  }

  // Ajouter sucre si disponible
  const sucre = typeMap["sucre"];
  if (sucre) {
    ingredients.push({ matiere: sucre.nom, quantite: 0.05, unite: sucre.unite === "g" ? "kg" : sucre.unite });
  }

  // Fallback : si aucun ingrédient trouvé, utilise le premier TypeMP disponible
  if (ingredients.length === 0 && types.length > 0) {
    const t = types[0];
    ingredients.push({ matiere: t.nom, quantite: 0.8, unite: t.unite });
  }

  await Recette.create({
    nomJus:           prod.name,
    ingredients,
    seuilMinPF:       10,
    seuilMinBoutique: 5,
    creerPar:         workshop._id,
  });

  console.log(`  [OK] ${prod.name} → ${ingredients.map(i => `${i.quantite} ${i.unite} ${i.matiere}`).join(" + ")}`);
  created++;
}

console.log(`\n  Recettes créées : ${created}  |  déjà existantes : ${skipped}`);
process.exit(0);
