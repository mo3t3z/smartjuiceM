/**
 * SCRIPT DE RESET COMPLET — SmartJuice
 * Vide toutes les collections et recrée le compte manager par défaut.
 * Usage : node reset.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI;
const MANAGER_EMAIL = process.env.MANAGER_EMAIL || "managerlakhal@gmail.com";
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || "Manager@12345";

async function reset() {
  console.log("\n🔄  Connexion à MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connecté.\n");

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log("ℹ️   Aucune collection trouvée.");
  } else {
    console.log("🗑️   Suppression des collections :");
    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
      console.log(`    • ${col.name} → vidée`);
    }
  }

  // Recréer le compte manager
  console.log("\n👤  Création du compte manager...");
  const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 10);
  await db.collection("users").insertOne({
    email: MANAGER_EMAIL.toLowerCase(),
    passwordHash,
    role: "manager",
    nom: "Lakhal",
    prenom: "Manager",
    telephone: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅  Compte manager créé :`);
  console.log(`    Email    : ${MANAGER_EMAIL}`);
  console.log(`    Password : ${MANAGER_PASSWORD}`);
  console.log("\n🎉  Reset terminé. L'application est prête pour les tests.\n");

  await mongoose.disconnect();
  process.exit(0);
}

reset().catch((err) => {
  console.error("❌  Erreur lors du reset :", err.message);
  process.exit(1);
});
