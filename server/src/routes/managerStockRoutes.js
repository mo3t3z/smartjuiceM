import express from "express";
import { authenticate, isManager } from "../middleware/authMiddleware.js";
import {
  getDisponibleMP, getHistoriqueMP,
  getStockPFResume, getHistoriquePF,
} from "../controllers/workshopController.js";
import {
  getDashboardKPIs,
  getNotificationsManager, marquerNotificationLueManager, marquerToutesLuesManager,
} from "../controllers/managerController.js";
import { getStockPFBoutique, getHistoriquePFBoutique } from "../controllers/sellerController.js";

const router = express.Router();

// Dashboard KPIs
router.get("/dashboard", authenticate, isManager, getDashboardKPIs);

// Notifications
router.get("/notifications",          authenticate, isManager, getNotificationsManager);
router.put("/notifications/lues",     authenticate, isManager, marquerToutesLuesManager);
router.put("/notifications/:id/lire", authenticate, isManager, marquerNotificationLueManager);

// Stocks
router.get("/stock/mp",                    authenticate, isManager, getDisponibleMP);
router.get("/historique/mp/:type",         authenticate, isManager, getHistoriqueMP);
router.get("/stock/pf",                    authenticate, isManager, getStockPFResume);
router.get("/historique/pf/:nomJus",       authenticate, isManager, getHistoriquePF);
router.get("/stock/boutique",              authenticate, isManager, getStockPFBoutique);
router.get("/historique/boutique/:nomJus", authenticate, isManager, getHistoriquePFBoutique);

export default router;
