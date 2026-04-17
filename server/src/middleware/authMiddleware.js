import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware générique d'authentification JWT
// Vérifie que l'utilisateur est connecté et attache l'utilisateur à req.user
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;// Récupère le token du header 

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou invalide" });
    }

    const token = authHeader.split(" ")[1];//extrait le token de la chaîne "Bearer

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré" });
    }
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Vérifier que l'utilisateur authentifié est bien un manager
export const isManager = (req, res, next) => {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ message: "Accès interdit: réservé au gérant" });
  }
  next();
};

// Vérifier que l'utilisateur authentifié est bien un atelier
export const isWorkshop = (req, res, next) => {
  if (!req.user || req.user.role !== "workshop") {
    return res.status(403).json({ message: "Accès interdit: réservé à l'atelier" });
  }
  next();
};

// Vérifier que l'utilisateur authentifié est bien un vendeur
export const isSeller = (req, res, next) => {
  if (!req.user || req.user.role !== "seller") {
    return res.status(403).json({ message: "Accès interdit: réservé au vendeur" });
  }
  next();
};

// Vérifier que l'utilisateur est client ou manager
export const isClientOrManager = (req, res, next) => {
  if (!req.user || !["client", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit" });
  }
  next();
};

// Vérifier que l'utilisateur est un client
export const isClient = (req, res, next) => {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ message: "Accès interdit: réservé aux clients" });
  }
  next();
};

// Vérifier que l'utilisateur est vendeur ou manager
export const isSellerOrManager = (req, res, next) => {
  if (!req.user || !["seller", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit: réservé au vendeur ou au gérant" });
  }
  next();
};

// Vérifier que l'utilisateur est atelier ou manager
export const isWorkshopOrManager = (req, res, next) => {
  if (!req.user || !["workshop", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit: réservé à l'atelier ou au gérant" });
  }
  next();
};

// Vérifier que l'utilisateur est atelier, vendeur ou manager
export const isWorkshopOrSellerOrManager = (req, res, next) => {
  if (!req.user || !["workshop", "seller", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès interdit: réservé à l'atelier, au vendeur ou au gérant" });
  }
  next();
};
