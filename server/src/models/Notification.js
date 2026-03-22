import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
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
    lu: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
