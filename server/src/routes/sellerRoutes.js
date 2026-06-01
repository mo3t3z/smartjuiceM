import express from "express";
import { authenticate, isSeller } from "../middleware/authMiddleware.js";
import { getStockPFBoutique } from "../controllers/sellerController.js";

const router = express.Router();

router.get("/stock/pf", authenticate, isSeller, getStockPFBoutique);

export default router;
