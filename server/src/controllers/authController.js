import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // générer des tokens aléatoires sécurisés
import User from "../models/User.js";
import { sendResetPasswordEmail } from "../config/emailConfig.js";
//f1: login (tous les rôles),f2: création de comptes staff (manager),f3: lister tous les comptes staff (manager),
// f4: modifier un compte staff (manager),f5: supprimer un compte staff (manager),
// f6: changer le mot de passe (tous les rôles),f7: inscription client, 
// f8: demander une réinitialisation de mot de passe, f9: réinitialiser le mot de passe avec le token

//f1:login (tous les rôles)
export const login = async (req, res) => {
  try {
    //req.body vient du frontend grâce à app.use(express.json())
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Email incorrect" });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Renvoyer la réponse
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
// Création de comptes staff (seller / workshop)
export const createStaffAccount = async (req, res) => {
  try {
    let { email, password, role, nom, prenom } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password, role sont obligatoires" });
    }
//.trim() pour enlever les espaces avant/après,
    email = email.toLowerCase().trim();
    role = role.trim();
    if (role === "atelier") role = "workshop";

    if (!["seller", "workshop"].includes(role)) {
      return res.status(400).json({ message: "role doit être seller ou workshop" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      passwordHash,
      role,
      nom: nom?.trim() || "",
      prenom: prenom?.trim() || ""
    });

    return res.status(201).json({
      message: "Compte créé avec succès",
      user: {
        id: newUser._id,
        email: newUser.email,
        nom: newUser.nom,
        prenom: newUser.prenom,
        role: newUser.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Lister tous les comptes staff
export const getStaffAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ role: { $in: ["seller", "workshop"] } })
      .select("-passwordHash")//.select() pour exclure le champ passwordHash
      .sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Modifier un compte staff
export const updateStaffAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, password } = req.body;

    const user = await User.findOne({ _id: id, role: { $in: ["seller", "workshop"] } });
    if (!user) {
      return res.status(404).json({ message: "Compte introuvable" });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) return res.status(409).json({ message: "Email déjà utilisé" });
      user.email = email.toLowerCase().trim();
    }

    if (nom !== undefined) user.nom = nom.trim();
    if (prenom !== undefined) user.prenom = prenom.trim();

    if (password && password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    res.json({
      message: "Compte modifié avec succès",
      user: { id: user._id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer un compte staff
export const deleteStaffAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndDelete({ _id: id, role: { $in: ["seller", "workshop"] } });
    if (!user) return res.status(404).json({ message: "Compte introuvable" });
    res.json({ message: "Compte supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Changer le mot de passe (utilisateur connecté)
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Ancien et nouveau mot de passe sont obligatoires" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Inscription client
export const registerClient = async (req, res) => {
  try {
    let { email, password, nom, prenom, telephone } = req.body;

    // Validation des champs obligatoires
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe sont obligatoires" });
    }

    // Validation de la longueur du mot de passe
    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    // Normaliser l'email
    email = email.toLowerCase().trim();

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer le nouveau client
    const newClient = await User.create({
      email,
      passwordHash,
      role: "client",
      nom: nom?.trim() || "",
      prenom: prenom?.trim() || "",
      telephone: telephone?.trim() || ""
    });

    // Générer le token JWT
    const token = jwt.sign(
      { userId: newClient._id, role: newClient.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Retourner la réponse
    res.status(201).json({
      message: "Compte créé avec succès",
      token,
      user: {
        id: newClient._id,
        email: newClient.email,
        nom: newClient.nom,
        prenom: newClient.prenom,
        role: newClient.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email, source } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        message: "Cet email n'existe pas dans notre système"
      });
    }

    // Seuls le manager et le client peuvent réinitialiser leur mot de passe
    if (["seller", "workshop"].includes(user.role)) {
      return res.status(403).json({
        message: "Vous devez contacter le manager pour réinitialiser votre mot de passe."
      });
    }

    // Vérifier que l'email correspond au bon portail
    if (source === 'client' && user.role !== 'client') {
      return res.status(403).json({
        message: "Cet email n'appartient pas à un compte client."
      });
    }
    if (source === 'staff' && user.role === 'client') {
      return res.status(403).json({
        message: "Cet email n'appartient pas à un compte staff. Utilisez le portail client."
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker en base de données
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Stocker le token hashé et la date d'expiration (1 heure)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // Envoyer l'email avec le token NON hashé
    const emailSent = await sendResetPasswordEmail(user.email, resetToken);

    if (!emailSent) {
      return res.status(500).json({ 
        message: "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard." 
      });
    }

    res.json({ 
      message: "Un email de réinitialisation a été envoyé à votre adresse" 
    });

  } catch (error) {
    console.error('Erreur requestPasswordReset:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

// Réinitialiser le mot de passe avec le token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: "Token et nouveau mot de passe requis" 
      });
    }

    // Valider la longueur du mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 6 caractères" 
      });
    }

    // Hasher le token reçu pour le comparer avec celui stocké en DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Trouver l'utilisateur avec ce token et qui n'a pas expiré
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() } // Plus grand que maintenant
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Token invalide ou expiré. Veuillez demander un nouveau lien." 
      });
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
      role: user.role
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
