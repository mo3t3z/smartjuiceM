import dotenv from "dotenv";//importe la bibliothèque dotenv pour charger les variables d'environnement à partir d'un fichier .env
dotenv.config();

import express from "express";
import cors from "cors";//autorise les requêtes cross-origin (front localhost:5173 → back localhost:5000)
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import workshopRoutes from "./src/routes/workshopRoutes.js";
import sellerRoutes from "./src/routes/sellerRoutes.js";
import managerStockRoutes from "./src/routes/managerStockRoutes.js";
import commandeRoutes from "./src/routes/commandeRoutes.js";
import venteRoutes from "./src/routes/venteRoutes.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));//active CORS pour toutes les routes
app.use(express.json());//active la lecture de req.body en JSON
app.use("/uploads", express.static(join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API Smart Juice fonctionne ");
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/workshop", workshopRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/manager", managerStockRoutes);
app.use("/api/commandes", commandeRoutes);
app.use("/api/ventes", venteRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
});
