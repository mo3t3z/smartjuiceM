import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    categorie: {
      type: String,
      enum: ["MP", "PF"],
      default: "MP",
    },
    typeMP: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    niveauActuel: {
      type: Number,
      required: true,
    },
    seuilMin: {
      type: Number,
      required: true,
    },
    unite: {
      type: String,
      required: true,
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
