import express from "express";
import { handleChatMessage } from "../controllers/chatbotController.js";

const router = express.Router();

// POST /api/chatbot/message — Analyse le message et retourne les réponses
router.post("/message", handleChatMessage);

export default router;
