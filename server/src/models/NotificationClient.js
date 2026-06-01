import mongoose from "mongoose";

const notificationClientSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    commande: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commande",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    statut: {
      type: String, // le nouveau statut de la commande
      required: true,
    },
    lue: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("NotificationClient", notificationClientSchema);
