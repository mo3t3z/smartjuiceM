import express from "express";
import {
  creerCommandeEnLigne,
  getMesCommandes,
  getCommandesEnAttente,
  getToutesCommandes,
  validerCommande,
  refuserCommande,
  getCommandesConfirmees,
  mettreEnPreparation,
  marquerLivree,
  creerCommandePhysique,
  genererRecuCommande,
  getDashboardVentes,
} from "../controllers/commandeController.js";
import {
  authenticate,
  isClient,
  isManager,
  isSeller,
  isWorkshop,
  isSellerOrManager,
  isWorkshopOrManager,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Routes Client (PB19, PB21) ────────────────────────────────────────────────
// PB19 : Passer une commande en ligne
router.post("/", authenticate, isClient, creerCommandeEnLigne);
// PB21 : Consulter mes commandes
router.get("/mes-commandes", authenticate, isClient, getMesCommandes);

// ── Routes Gérant (PB20, PB25) ───────────────────────────────────────────────
// PB20 : Commandes en attente
router.get("/en-attente", authenticate, isManager, getCommandesEnAttente);
// Toutes les commandes (avec filtre optionnel ?statut=...&type=...)
router.get("/toutes", authenticate, isManager, getToutesCommandes);
// PB20 : Valider une commande
router.put("/:id/valider", authenticate, isManager, validerCommande);
// PB20 : Refuser une commande
router.put("/:id/refuser", authenticate, isManager, refuserCommande);
// Marquer comme livrée (gérant ou vendeur)
router.put("/:id/livree", authenticate, isSellerOrManager, marquerLivree);
// PB25 : Dashboard ventes
router.get("/dashboard", authenticate, isManager, getDashboardVentes);

// ── Routes Atelier (PB23) ────────────────────────────────────────────────────
// PB23 : Commandes confirmées à préparer
router.get("/confirmees", authenticate, isWorkshopOrManager, getCommandesConfirmees);
// Mettre en préparation
router.put("/:id/en-preparation", authenticate, isWorkshop, mettreEnPreparation);

// ── Routes Vendeur (PB22) ────────────────────────────────────────────────────
// PB22 : Créer une commande physique
router.post("/physique", authenticate, isSeller, creerCommandePhysique);

// ── Reçu PDF (vendeur ou gérant) ─────────────────────────────────────────────
router.get("/:id/recu", authenticate, isSellerOrManager, genererRecuCommande);

export default router;
