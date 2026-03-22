import mongoose from "mongoose";

const typeMPSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seuilMin: {
      type: Number,
      required: true,
      min: 0,
    },
    unite: {
      type: String,
      enum: ["kg", "g", "L", "mL", "unité"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TypeMP", typeMPSchema);
