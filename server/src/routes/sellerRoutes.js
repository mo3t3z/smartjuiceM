import express from "express";
import { authenticate, isSeller } from "../middleware/authMiddleware.js";
import { getStockPFBoutique, getHistoriquePFBoutique } from "../controllers/workshopController.js";

const router = express.Router();

router.get("/stock/pf",                  authenticate, isSeller, getStockPFBoutique);
router.get("/historique/pf/:nomJus",     authenticate, isSeller, getHistoriquePFBoutique);

export default router;
