import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI;
const NEW_EMAIL = process.env.MANAGER_EMAIL?.toLowerCase();
const NEW_PASSWORD = process.env.MANAGER_PASSWORD;

const userSchema = new mongoose.Schema({
  email: String,
  passwordHash: String,
  role: String,
  mustChangePassword: Boolean,
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    const manager = await User.findOne({ role: "manager" });

    if (!manager) {
      console.error("Aucun manager trouvé dans la base.");
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
    manager.email = NEW_EMAIL;
    manager.passwordHash = passwordHash;
    manager.mustChangePassword = true;
    await manager.save();

    console.log("Manager mis à jour !");
    console.log("Nouvel email    :", NEW_EMAIL);
    console.log("Nouveau mot de passe :", NEW_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  }
};

run();
