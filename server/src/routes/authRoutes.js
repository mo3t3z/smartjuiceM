import express from "express";
import { login, createStaffAccount, registerClient, changePassword, getStaffAccounts, updateStaffAccount, deleteStaffAccount, requestPasswordReset, resetPassword } from "../controllers/authController.js";
import { authenticate, isManager, isClientOrManager } from "../middleware/authMiddleware.js";
//get;lire/put:modifier/post:creer/delete: supprimer
const router = express.Router();

// Route publique: Se connecter (pas besoin d'être authentifié)
// POST /api/auth/login
router.post("/login", login);

// Route publique: Inscription client
// POST /api/auth/register-client
router.post("/register-client", registerClient);

// Routes publiques pour réinitialisation de mot de passe
// POST /api/auth/request-password-reset
router.post("/request-password-reset", requestPasswordReset);
// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// PB23: création de comptes staff (seller / workshop) par le manager
router.post("/staff", authenticate, isManager, createStaffAccount);

// Changer le mot de passe (client ou manager uniquement)
router.put("/change-password", authenticate, isClientOrManager, changePassword);

// CRUD comptes staff
router.get("/staff", authenticate, isManager, getStaffAccounts);
router.put("/staff/:id", authenticate, isManager, updateStaffAccount);
router.delete("/staff/:id", authenticate, isManager, deleteStaffAccount);

export default router;
