import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

// Définir le schéma directement ici pour éviter le cache
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    volume: { type: String, enum: ["0.5L", "1L"], default: "0.5L" },
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Supprimer le modèle existant s'il existe
if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

const Product = mongoose.model("Product", productSchema);

// Liste des jus naturels à créer
const juices = [
  {
    name: "Jus d'Orange",
    description: "Jus d'orange frais pressé, riche en vitamine C",
    price: 5.50,
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600",
    volume: "1L",
    available: true
  },
  {
    name: "Jus de Citron",
    description: "Jus de citron frais, rafraîchissant et énergisant",
    price: 4.50,
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600",
    volume: "0.5L",
    available: true
  },
  {
    name: "Jus de Fraise",
    description: "Jus de fraise naturel, doux et parfumé",
    price: 6.00,
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=600",
    volume: "1L",
    available: true
  },
  {
    name: "Jus de Banane",
    description: "Smoothie à la banane fraîche, onctueux et nutritif",
    price: 5.00,
    image: "https://images.unsplash.com/photo-1610992015732-2449b068da6c?w=600",
    volume: "0.5L",
    available: true
  },
  {
    name: "Jus de Kiwi",
    description: "Jus de kiwi frais, acidulé et vitaminé",
    price: 6.50,
    image: "https://images.unsplash.com/photo-1589736173479-0520d20dffdf?w=600",
    volume: "1L",
    available: true
  },
  {
    name: "Jus Citron-Menthe",
    description: "Mélange rafraîchissant de citron et menthe fraîche",
    price: 5.50,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600",
    volume: "0.5L",
    available: true
  },
  {
    name: "Jus de Pistache",
    description: "Boisson crémeuse à la pistache, unique et délicieux",
    price: 7.00,
    image: "https://images.unsplash.com/photo-1638202206716-e5c94d0eac19?w=600",
    volume: "1L",
    available: true
  }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB");

    // Supprimer TOUTE la collection (pas juste les documents)
    await mongoose.connection.db.dropCollection("products").catch(() => {
      console.log("Collection n'existait pas, création d'une nouvelle");
    });

    // Créer les nouveaux produits avec le nouveau schéma
    const createdProducts = await Product.insertMany(juices);
    console.log("✅ Produits créés avec succès !");
    console.log(`${createdProducts.length} jus naturels ajoutés au catalogue.`);
    
    // Vérifier qu'ils ont bien le champ volume
    createdProducts.forEach(p => {
      console.log(`${p.name}: ${p.volume}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Erreur:", err.message);
    process.exit(1);
  }
};

run();
