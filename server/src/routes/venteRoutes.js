import express from "express";
import {
  creerVente,
  getVentes,
  getStockBoutiqueDisponible,
  genererRecuVente,
} from "../controllers/venteController.js";
import {
  authenticate,
  isSeller,
  isManager,
  isSellerOrManager,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Routes Vendeur ────────────────────────────────────────────────────────────
// PB24 : Enregistrer une vente directe
router.post("/", authenticate, isSeller, creerVente);
// Stock boutique disponible (pour le formulaire de vente)
router.get("/stock-boutique", authenticate, isSeller, getStockBoutiqueDisponible);

// ── Routes Gérant ─────────────────────────────────────────────────────────────
// PB25 : Toutes les ventes
router.get("/", authenticate, isManager, getVentes);

// ── Reçu PDF (vendeur ou gérant) ─────────────────────────────────────────────
// PB24 : Télécharger le reçu PDF d'une vente
router.get("/:id/recu", authenticate, isSellerOrManager, genererRecuVente);

export default router;
