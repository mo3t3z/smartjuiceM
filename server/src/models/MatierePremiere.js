import mongoose from "mongoose";

const matierePremiereSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    quantite: {
      type: Number,
      required: true,
      min: 0,
    },
    unite: {
      type: String,
      enum: ["kg", "g", "L", "mL", "unité"],
      required: true,
    },
    prixUnitaire: {
      type: Number,
      required: true,
      min: 0,
    },
    fournisseur: {
      type: String,
      trim: true,
      default: "",
    },
    dateEntree: {
      type: Date,
      required: true,
      default: Date.now,
    },
    enregistrePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MatierePremiere", matierePremiereSchema);
