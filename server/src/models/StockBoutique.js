import mongoose from "mongoose";

// Collection dédiée au stock boutique (en litres) par jus
// Mis à jour par $inc atomique à chaque transfert, vente ou livraison
const stockBoutiqueSchema = new mongoose.Schema(
  {
    nomJus: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stockActuel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("StockBoutique", stockBoutiqueSchema);
