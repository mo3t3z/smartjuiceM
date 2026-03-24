import mongoose from "mongoose";

const recetteSchema = new mongoose.Schema(
  {
    nomJus: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ingredients: [
      {
        matiere: { type: String, required: true, trim: true },
        quantite: { type: Number, required: true, min: 0 },
        unite: { type: String, enum: ["kg", "g", "L", "mL", "unité"], required: true },
      },
    ],
    seuilMinPF: { type: Number, default: 0, min: 0 },
    creerPar: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    modifierPar: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dateModification: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Recette", recetteSchema);
