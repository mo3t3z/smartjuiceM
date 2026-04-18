import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User             from "../models/User.js";
import Product          from "../models/Product.js";
import Commande         from "../models/Commande.js";
import Vente            from "../models/Vente.js";
import Recette          from "../models/Recette.js";
import MatierePremiere  from "../models/MatierePremiere.js";
import ProductionPF     from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import TypeMP           from "../models/TypeMP.js";
import Notification     from "../models/Notification.js";
import NotificationClient from "../models/NotificationClient.js";
import StockBoutique    from "../models/StockBoutique.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB...");

    // 1. Vider toutes les collections
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Commande.deleteMany({}),
      Vente.deleteMany({}),
      Recette.deleteMany({}),
      MatierePremiere.deleteMany({}),
      ProductionPF.deleteMany({}),
      TransfertBoutique.deleteMany({}),
      TypeMP.deleteMany({}),
      Notification.deleteMany({}),
      NotificationClient.deleteMany({}),
      StockBoutique.deleteMany({}),
    ]);
    console.log("Toutes les collections vidées.");

    // 2. Recréer le compte manager depuis le .env
    const email         = process.env.MANAGER_EMAIL.toLowerCase();
    const password      = process.env.MANAGER_PASSWORD;
    const passwordHash  = await bcrypt.hash(password, 10);

    await User.create({
      email,
      passwordHash,
      role: "manager",
      nom: "Manager",
      prenom: "",
    });

    console.log("──────────────────────────────────");
    console.log("Reset terminé avec succès !");
    console.log("Seul compte actif :");
    console.log("  Email    :", email);
    console.log("  Password :", password);
    console.log("  Rôle     : manager");
    console.log("──────────────────────────────────");
    process.exit(0);
  } catch (err) {
    console.error("Erreur reset :", err.message);
    process.exit(1);
  }
};

run();
