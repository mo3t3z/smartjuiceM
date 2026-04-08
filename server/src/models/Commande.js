import mongoose from "mongoose";

// Modèle pour les commandes (en ligne et physiques)
const commandeSchema = new mongoose.Schema(
  {
    // Référence client (pour les commandes en ligne)
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Nom du client pour les commandes physiques (walk-in)
    nomClient: {
      type: String,
      default: "",
    },

    // Numéro de téléphone du client
    telephone: {
      type: String,
      default: "",
    },

    // Liste des produits commandés
    produits: [
      {
        produit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        nom: { type: String, required: true },       // Nom dénormalisé pour l'historique
        volume: { type: String, default: "0.5L" },   // Volume du produit
        quantite: { type: Number, required: true, min: 1 },
        prixUnitaire: { type: Number, required: true, min: 0 },
      },
    ],

    // Montant total de la commande
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Statut de la commande
    statut: {
      type: String,
      enum: ["en_attente", "validee", "refusee", "en_preparation", "prete", "livree"],
      default: "en_attente",
    },

    // Type de commande : en ligne (client) ou physique (vendeur en boutique)
    type: {
      type: String,
      enum: ["en_ligne", "physique"],
      required: true,
    },

    // Date de retrait souhaitée (pour les commandes physiques à la demande)
    dateRetrait: {
      type: Date,
      default: null,
    },

    // Mode de remise : livraison à domicile ou retrait en boutique
    modeRemise: {
      type: String,
      enum: ["livraison", "retrait"],
      default: "retrait",
    },

    // Adresse de livraison (si modeRemise = livraison)
    adresseLivraison: {
      type: String,
      default: "",
    },

    // Téléphone pour la livraison
    telephoneLivraison: {
      type: String,
      default: "",
    },

    // Frais de livraison (en DT)
    fraisLivraison: {
      type: Number,
      default: 0,
    },

    // Vendeur qui a enregistré la commande physique
    enregistrePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Commentaire du gérant en cas de refus
    commentaireRefus: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Commande", commandeSchema);
