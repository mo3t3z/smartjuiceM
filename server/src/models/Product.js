import mongoose from "mongoose";

// Modèle pour les produits (jus naturels)
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      default: ""
    },
    volume: {
      type: String,
      enum: ["1L"],//acepter que 1L pour le moment
      required: true,
      default: "1L"
    },
    available: {
      type: Boolean,
      default: true
    },
    recette: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recette",
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
