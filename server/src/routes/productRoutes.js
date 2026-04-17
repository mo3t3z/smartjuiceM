import express from "express";
import multer from "multer";
import {
  getAllProducts,
  getCatalog,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { authenticate, isManager } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Route publique pour le catalogue client (DOIT être avant les autres routes)
router.get("/catalog", getCatalog);

// Routes protégées pour le manager
router.get("/", authenticate, getAllProducts);
router.post("/", authenticate, isManager, upload.single("image"), createProduct);
router.put("/:id", authenticate, isManager, upload.single("image"), updateProduct);
router.delete("/:id", authenticate, isManager, deleteProduct);

// Gestionnaire d'erreurs multer (retourne JSON au lieu de HTML)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Erreur d'upload: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message || "Erreur lors de l'upload du fichier" });
  }
  next();
});

export default router;
