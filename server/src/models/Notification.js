import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    categorie: {
      type: String,
      enum: ["MP", "PF", "BOUTIQUE", "COMMANDE"],
      default: "MP",
    },
    typeMP: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    niveauActuel: {
      type: Number,
      default: 0,
    },
    seuilMin: {
      type: Number,
      default: 0,
    },
    unite: {
      type: String,
      default: "",
    },
    // Référence à la commande physique (si categorie = COMMANDE)
    commandeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commande",
      default: null,
    },
    luAtelier: {
      type: Boolean,
      default: false,
    },
    luManager: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
