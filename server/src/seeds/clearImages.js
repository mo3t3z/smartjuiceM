import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product from "../models/Product.js";

const { MONGO_URI } = process.env;

await mongoose.connect(MONGO_URI);

const result = await Product.updateMany(
  { image: { $regex: "localhost" } },
  { $set: { image: "" } }
);

console.log(`${result.modifiedCount} produits mis à jour (images localhost supprimées)`);
await mongoose.disconnect();
