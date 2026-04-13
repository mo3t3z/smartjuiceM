import mongoose from "mongoose";

// Modèle pour les ventes directes en boutique (sans commande préalable)
const venteSchema = new mongoose.Schema(
  {
    // Liste des produits vendus
    produits: [
      {
        produit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        nom: { type: String, required: true },       // Nom dénormalisé pour l'historique
        volume: { type: String, default: "1L" },   // Volume du produit
        quantite: { type: Number, required: true, min: 1 },
        prixUnitaire: { type: Number, required: true, min: 0 },
      },
    ],

    // Montant total de la vente (après escompte)
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Escompte appliqué (10% si total brut > 200 DT)
    escompte: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Vendeur qui a enregistré la vente
    vendeur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Date de la vente
    dateVente: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vente", venteSchema);
