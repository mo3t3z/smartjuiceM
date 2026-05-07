import express from "express";
import {
  creerCommandeEnLigne,
  getMesCommandes,
  getCommandesEnAttente,
  getToutesCommandes,
  validerCommande,
  refuserCommande,
  getCommandesConfirmees,
  marquerPrete,
  marquerLivree,
  creerCommandePhysique,
  genererRecuCommande,
  getMesNotifications,
  marquerNotifLue,
  marquerToutesNotifsLues,
} from "../controllers/commandeController.js";
import {
  authenticate,
  isClient,
  isManager,
  isSeller,
  isWorkshop,
  isSellerOrManager,
  isWorkshopOrManager,
  isWorkshopOrSellerOrManager,
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
// Marquer comme livrée (atelier, vendeur ou gérant)
router.put("/:id/livree", authenticate, isWorkshopOrSellerOrManager, marquerLivree);
// ── Routes Atelier (PB23) ────────────────────────────────────────────────────
// PB23 : Commandes confirmées à préparer
router.get("/confirmees", authenticate, isWorkshopOrManager, getCommandesConfirmees);
// Marquer comme prête (atelier)
router.put("/:id/prete", authenticate, isWorkshop, marquerPrete);

// ── Routes Vendeur (PB22) ────────────────────────────────────────────────────
// PB22 : Créer une commande physique
router.post("/physique", authenticate, isSeller, creerCommandePhysique);

// ── Notifications client ──────────────────────────────────────────────────────
router.get("/mes-notifications",         authenticate, isClient, getMesNotifications);
router.put("/mes-notifications/lues",    authenticate, isClient, marquerToutesNotifsLues);
router.put("/mes-notifications/:id/lue", authenticate, isClient, marquerNotifLue);

// ── Reçu PDF (vendeur ou gérant) ─────────────────────────────────────────────
router.get("/:id/recu", authenticate, isSellerOrManager, genererRecuCommande);

export default router;
