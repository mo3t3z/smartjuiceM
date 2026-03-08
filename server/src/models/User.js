import mongoose from "mongoose";
//Rôle: définir la structure (shape) d'un utilisateur dans MongoDB

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true/* force en minuscule*/, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    // Champs pour la réinitialisation du mot de passe
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true/*voir date de creation et update*/ }
);

export default mongoose.model("User", userSchema);
