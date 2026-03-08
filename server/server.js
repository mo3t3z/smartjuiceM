import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
 // cors(): autorise le navigateur à faire des requêtes entre 5173 (front) et 5000 (back)
 // express.json(): permet de lire req.body en JSON
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Smart Juice fonctionne ");
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
});
