import mongoose from "mongoose";

/**
 * Modèle Intent — stocke les intentions du chatbot dans MongoDB.
 * Chaque document représente une intention détectable avec ses mots-clés,
 * ses synonymes (FR / EN / Darija) et la réponse associée.
 */
const intentSchema = new mongoose.Schema(
  {
    // Identifiant unique de l'intention (ex: "livraison", "horaires")
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Mots-clés principaux utilisés pour détecter l'intention dans le message
    keywords: {
      type: [String],
      default: [],
    },

    // Synonymes additionnels : mots français alternatifs, termes anglais, darija
    synonyms: {
      type: [String],
      default: [],
    },

    // Réponse renvoyée au client lorsque l'intention est détectée
    response: {
      type: String,
      required: true,
    },

    // Poids de l'intention pour le scoring — plus c'est élevé, plus elle remonte
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Intent", intentSchema);
