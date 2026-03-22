import mongoose from "mongoose";

const productionPFSchema = new mongoose.Schema(
  {
    nomJus: { type: String, required: true, trim: true },
    quantiteProduite: { type: Number, required: true, min: 0 },
    recette: { type: mongoose.Schema.Types.ObjectId, ref: "Recette", required: true },
    deductionsMP: [
      {
        matiere: { type: String, required: true },
        quantite: { type: Number, required: true },
        unite: { type: String, required: true },
      },
    ],
    enregistrePar: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateProduction: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("ProductionPF", productionPFSchema);
