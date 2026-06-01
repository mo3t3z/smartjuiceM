import mongoose from "mongoose";

const recetteSchema = new mongoose.Schema(
  {
    nomJus: {
      type: String,
      required: true,
      unique: true,
      trim: true,//enléve les espaces avant et après
    },
    ingredients: [
      {
        matiere: { type: String, required: true, trim: true },
        quantite: { type: Number, required: true, min: 0 },
        unite: { type: String, enum: ["kg", "g", "L", "mL", "unité"], required: true },
      },
    ],
    seuilMinPF:       { type: Number, required: true, min: 0 }, // seuil stock atelier PF
    seuilMinBoutique: { type: Number, required: true, min: 0 }, // seuil stock boutique PF
    creerPar: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    modifierPar: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dateModification: { type: Date, default: null },
  },
  { timestamps: true }//ajoute createdAt et updatedAt automatiquement
);

export default mongoose.model("Recette", recetteSchema);
