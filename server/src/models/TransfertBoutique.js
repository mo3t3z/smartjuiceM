import mongoose from "mongoose";

const transfertBoutiqueSchema = new mongoose.Schema(
  {
    nomJus: { type: String, required: true, trim: true },
    quantite: { type: Number, required: true, min: 0 },
    enregistrePar: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateTransfert: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("TransfertBoutique", transfertBoutiqueSchema);
