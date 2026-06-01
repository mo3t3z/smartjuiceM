import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
//role:créer 1 manager par défaut dans la base.

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.MANAGER_EMAIL.toLowerCase();//yekhou email mel .env 
    const isReset = process.argv.includes("--reset");//mode reset password si on lance la commande avec --reset

    if (isReset) {
      // Mode reset : mettre à jour le mot de passe du manager existant
      const manager = await User.findOne({ email, role: "manager" });
      if (!manager) {
        console.error("Aucun manager trouvé avec cet email.");
        process.exit(1);
      }

      const passwordHash = await bcrypt.hash(process.env.MANAGER_PASSWORD, 10);
      manager.passwordHash = passwordHash;
      await manager.save();

      console.log("Mot de passe du manager réinitialisé !");
      console.log("Email:", email);
      console.log("Nouveau mot de passe:", process.env.MANAGER_PASSWORD);
      process.exit(0);
    }

    // Mode création
    const exists = await User.findOne({ email });
    if (exists) {
      console.log("Manager déjà disponible avec cet email.");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(process.env.MANAGER_PASSWORD, 10);

    await User.create({
      email,
      passwordHash,
      role: "manager"
    });

    console.log("Manager créé !");
    console.log("Email:", email);
    console.log("Password:", process.env.MANAGER_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
};

run();
