import express from "express";
import {
  getAllProducts,
  getCatalog,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { authenticate, isManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route publique pour le catalogue client (DOIT être avant les autres routes)
router.get("/catalog", getCatalog);

// Routes protégées pour le manager
router.get("/", authenticate, getAllProducts);
router.post("/", authenticate, isManager, createProduct);
router.put("/:id", authenticate, isManager, updateProduct);
router.delete("/:id", authenticate, isManager, deleteProduct);

export default router;
