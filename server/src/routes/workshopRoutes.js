import express from "express";
import { authenticate, isWorkshop } from "../middleware/authMiddleware.js";
import {
  enregistrerMP, getStockMP, getDisponibleMP, getHistoriqueMP,
  getRecettes, createRecette, updateRecette, deleteRecette,
  enregistrerProduction, getStockPF, getStockPFResume, getHistoriquePF, previewProduction,
  enregistrerTransfert, getDisponiblePF,
  getTypesMP, createTypeMP, deleteTypeMP,
  getNotifications, marquerNotificationLue, marquerToutesLues,
} from "../controllers/workshopController.js";

const router = express.Router();

// Types MP
router.get("/types-mp",          authenticate, isWorkshop, getTypesMP);
router.post("/types-mp",         authenticate, isWorkshop, createTypeMP);
router.delete("/types-mp/:id",   authenticate, isWorkshop, deleteTypeMP);

// Notifications
router.get("/notifications",              authenticate, isWorkshop, getNotifications);
router.put("/notifications/lues",         authenticate, isWorkshop, marquerToutesLues);
router.put("/notifications/:id/lire",     authenticate, isWorkshop, marquerNotificationLue);

// Matières premières
router.post("/matieres-premieres",           authenticate, isWorkshop, enregistrerMP);
router.get("/matieres-premieres",            authenticate, isWorkshop, getStockMP);
router.get("/matieres-premieres/disponible", authenticate, isWorkshop, getDisponibleMP);

// Recettes
router.get("/recettes/preview", authenticate, isWorkshop, previewProduction);
router.get("/recettes",         authenticate, isWorkshop, getRecettes);
router.post("/recettes",        authenticate, isWorkshop, createRecette);
router.put("/recettes/:id",     authenticate, isWorkshop, updateRecette);
router.delete("/recettes/:id",  authenticate, isWorkshop, deleteRecette);

// Productions / Stock PF atelier
router.post("/productions",     authenticate, isWorkshop, enregistrerProduction);
router.get("/productions",      authenticate, isWorkshop, getStockPF);
router.get("/stock/pf/resume",  authenticate, isWorkshop, getStockPFResume);

// Transferts vers boutique
router.post("/transferts",              authenticate, isWorkshop, enregistrerTransfert);
router.get("/transferts/disponible",    authenticate, isWorkshop, getDisponiblePF);

// Historiques
router.get("/historique/mp/:type",      authenticate, isWorkshop, getHistoriqueMP);
router.get("/historique/pf/:nomJus",    authenticate, isWorkshop, getHistoriquePF);

export default router;
