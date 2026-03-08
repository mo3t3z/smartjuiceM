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
      enum: ["0.5L", "1L"],
      required: true,
      default: "0.5L"
    },
    available: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
