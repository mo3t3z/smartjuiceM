import express from "express";
import { authenticate, isWorkshop } from "../middleware/authMiddleware.js";
import {
  enregistrerMP, getDisponibleMP,
  getRecettes, createRecette, updateRecette, deleteRecette,
  enregistrerProduction, getStockPFResume, previewProduction,
  enregistrerTransfert, getDisponiblePF,
  getTypesMP, createTypeMP, updateTypeMP, deleteTypeMP,
  getNotifications, marquerNotificationLue, marquerToutesLues,
} from "../controllers/workshopController.js";

const router = express.Router();

// Types MP
router.get("/types-mp",          authenticate, isWorkshop, getTypesMP);
router.post("/types-mp",         authenticate, isWorkshop, createTypeMP);
router.put("/types-mp/:id",      authenticate, isWorkshop, updateTypeMP);
router.delete("/types-mp/:id",   authenticate, isWorkshop, deleteTypeMP);

// Notifications
router.get("/notifications",              authenticate, isWorkshop, getNotifications);
router.put("/notifications/lues",         authenticate, isWorkshop, marquerToutesLues);
router.put("/notifications/:id/lire",     authenticate, isWorkshop, marquerNotificationLue);

// Matières premières
router.post("/matieres-premieres",           authenticate, isWorkshop, enregistrerMP);
router.get("/matieres-premieres/disponible", authenticate, isWorkshop, getDisponibleMP);

// Recettes
router.get("/recettes/preview", authenticate, isWorkshop, previewProduction);
router.get("/recettes",         authenticate, isWorkshop, getRecettes);
router.post("/recettes",        authenticate, isWorkshop, createRecette);
router.put("/recettes/:id",     authenticate, isWorkshop, updateRecette);
router.delete("/recettes/:id",  authenticate, isWorkshop, deleteRecette);

// Productions / Stock PF atelier
router.post("/productions",     authenticate, isWorkshop, enregistrerProduction);
router.get("/stock/pf/resume",  authenticate, isWorkshop, getStockPFResume);

// Transferts vers boutique
router.post("/transferts",              authenticate, isWorkshop, enregistrerTransfert);
router.get("/transferts/disponible",    authenticate, isWorkshop, getDisponiblePF);

export default router;
