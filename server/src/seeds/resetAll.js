import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI;
const MANAGER_EMAIL = process.env.MANAGER_EMAIL?.toLowerCase();
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD;

const juices = [
  { name: "Jus d'Orange", description: "Jus d'orange frais pressé, riche en vitamine C", price: 5.50, image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400", volume: "1L", available: true },
  { name: "Jus de Citron", description: "Jus de citron frais, rafraîchissant et énergisant", price: 4.50, image: "https://images.unsplash.com/photo-1590004953392-5aba2e72269a?w=400", volume: "0.5L", available: true },
  { name: "Jus de Fraise", description: "Jus de fraise naturel, doux et parfumé", price: 6.00, image: "https://images.unsplash.com/photo-1464454709131-ffd692591ee5?w=400", volume: "1L", available: true },
  { name: "Jus de Banane", description: "Smoothie à la banane fraîche, onctueux et nutritif", price: 5.00, image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400", volume: "0.5L", available: true },
  { name: "Jus de Kiwi", description: "Jus de kiwi frais, acidulé et vitaminé", price: 6.50, image: "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400", volume: "1L", available: true },
  { name: "Jus Citron-Menthe", description: "Mélange rafraîchissant de citron et menthe fraîche", price: 5.50, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400", volume: "0.5L", available: true },
  { name: "Jus de Pistache", description: "Boisson crémeuse à la pistache, unique et délicieux", price: 7.00, image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400", volume: "1L", available: true },
];

const COLLECTIONS = [
  "users",
  "products",
  "matierepremieres",
  "typemps",
  "recettes",
  "productionpfs",
  "transfertboutiques",
  "notifications",
  "passwordresettokens",
];

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connecté à MongoDB");

    const db = mongoose.connection.db;

    // Drop all collections
    for (const col of COLLECTIONS) {
      await db.dropCollection(col).catch(() => {});
      console.log(`Collection supprimée : ${col}`);
    }

    // Recreate manager
    const userSchema = new mongoose.Schema({
      email: String,
      passwordHash: String,
      role: String,
      mustChangePassword: Boolean,
    }, { timestamps: true });
    const User = mongoose.model("User", userSchema);

    const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 10);
    await User.create({ email: MANAGER_EMAIL, passwordHash, role: "manager", mustChangePassword: true });
    console.log(`Manager créé : ${MANAGER_EMAIL} / ${MANAGER_PASSWORD}`);

    // Recreate products
    const productSchema = new mongoose.Schema({
      name: String, description: String, price: Number,
      image: String, volume: String, available: Boolean,
    }, { timestamps: true });
    const Product = mongoose.model("Product", productSchema);

    await Product.insertMany(juices);
    console.log(`${juices.length} produits créés.`);

    console.log("\nRéinitialisation terminée. L'application est prête.");
    process.exit(0);
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  }
};

run();
