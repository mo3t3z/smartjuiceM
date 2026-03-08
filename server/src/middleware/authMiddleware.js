import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware générique d'authentification JWT
// Vérifie que l'utilisateur est connecté et attache l'utilisateur à req.user
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou invalide" });
    }

    const token = authHeader.split(" ")[1];

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
