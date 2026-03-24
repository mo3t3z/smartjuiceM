import express from "express";
import { authenticate, isManager } from "../middleware/authMiddleware.js";
import {
  getDisponibleMP, getHistoriqueMP,
  getStockPFResume, getHistoriquePF,
  getStockPFBoutique, getHistoriquePFBoutique,
  getNotificationsManager, marquerNotificationLueManager, marquerToutesLuesManager,
} from "../controllers/workshopController.js";

const router = express.Router();

// Notifications
router.get("/notifications",              authenticate, isManager, getNotificationsManager);
router.put("/notifications/lues",         authenticate, isManager, marquerToutesLuesManager);
router.put("/notifications/:id/lire",     authenticate, isManager, marquerNotificationLueManager);

router.get("/stock/mp",                    authenticate, isManager, getDisponibleMP);
router.get("/historique/mp/:type",         authenticate, isManager, getHistoriqueMP);
router.get("/stock/pf",                    authenticate, isManager, getStockPFResume);
router.get("/historique/pf/:nomJus",       authenticate, isManager, getHistoriquePF);
router.get("/stock/boutique",              authenticate, isManager, getStockPFBoutique);
router.get("/historique/boutique/:nomJus", authenticate, isManager, getHistoriquePFBoutique);

export default router;
