import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // générer des tokens aléatoires sécurisés
import User from "../models/User.js";
import { sendResetPasswordEmail } from "../config/emailConfig.js";
//f1: login (tous les rôles),f2: création de comptes staff (manager),f3: lister tous les comptes staff (manager),
// f4: modifier un compte staff (manager),f5: supprimer un compte staff (manager),
// f6: changer le mot de passe (mon compte),f7: inscription client, 
// f8: demander une réinitialisation de mot de passe, f9: réinitialiser le mot de passe avec le token

//f1:login (tous les rôles)
export const login = async (req, res) => {//enovyé du frontend avec email et pasword
  try {
    
    const { email, password } = req.body;//extrait de email et password converti object

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
        role: user.role,
        nom: user.nom || "",
        prenom: user.prenom || "",
        telephone: user.telephone || "",
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
// f2 Création de comptes staff (seller / workshop)
export const createStaffAccount = async (req, res) => {//requet envoyé par le frontend
  try {
    let { email, password, role, nom, prenom } = req.body;//extrait variable 

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

    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (nom && !nameRegex.test(nom.trim())) {
      return res.status(400).json({ message: "Le nom ne doit contenir que des lettres" });
    }
    if (prenom && !nameRegex.test(prenom.trim())) {
      return res.status(400).json({ message: "Le prénom ne doit contenir que des lettres" });
    }

    const exists = await User.findOne({ email });//verifier si email existe deja 
    if (exists) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);//hasher le mot de passe avant de le stocker 

    const newUser = await User.create({//creation
      email,
      passwordHash,
      role,
      nom: nom?.trim() || "",
      prenom: prenom?.trim() || ""
    });

    return res.status(201).json({//renvoyé au frontend
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
/*
**
*/
// f3 Lister tous les comptes staff
export const getStaffAccounts = async (req, res) => {//requet envoyé par le frontend pour afficher les comptes staff 
  try {
    const accounts = await User.find({ role: { $in: ["seller", "workshop"] } })
      .select("-passwordHash")//.select() pour exclure le champ passwordHash
      .sort({ createdAt: -1 });//trie de plus recent a plus ancien 
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
/*
**
*/
// f4 Modifier un compte staff
export const updateStaffAccount = async (req, res) => {
  try {
    const { id } = req.params;//recupérer id a modifier 
    const { nom, prenom, email, password } = req.body;//recupérer les champs a modifier 

    const user = await User.findOne({ _id: id, role: { $in: ["seller", "workshop"] } });//ylwej fel seller w workshop
    if (!user) {
      return res.status(404).json({ message: "Compte introuvable" });
    }

    if (email && email.toLowerCase().trim() !== user.email) {//si il a modifie on verifie que le nuveau n'est pas deja utilisé 
      const exists = await User.findOne({ email: email.toLowerCase().trim() });//laweeej
      if (exists) return res.status(409).json({ message: "Email déjà utilisé" });
      user.email = email.toLowerCase().trim();
    }

    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (nom !== undefined) {
      if (nom.trim() && !nameRegex.test(nom.trim())) {
        return res.status(400).json({ message: "Le nom ne doit contenir que des lettres" });
      }
      user.nom = nom.trim();
    }
    if (prenom !== undefined) {
      if (prenom.trim() && !nameRegex.test(prenom.trim())) {
        return res.status(400).json({ message: "Le prénom ne doit contenir que des lettres" });
      }
      user.prenom = prenom.trim();
    }

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
/*
**
*/
// f5 Supprimer un compte staff
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
/*
**
*/
// f6 Changer le mot de passe (utilisateur connecté)
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;//lezm les deux champs m3mrin(9dim w jdyd)

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Ancien et nouveau mot de passe sont obligatoires" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    const user = await User.findById(req.user._id);//cad on va changer de ce user connecté

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
/*
**
*/
// f7  Inscription client
export const registerClient = async (req, res) => {
  try {
    let { email, password, nom, prenom, telephone } = req.body;

    // Validation des champs obligatoires
    if (!email || !password || !nom?.trim() || !prenom?.trim()) {
      return res.status(400).json({ message: "Email, mot de passe, nom et prénom sont obligatoires" });
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
/*
**
*/
//f8 Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email, source } = req.body;//source chkun ely demande el reset 

    if (!email) {
      return res.status(400).json({ message: "Email requis" });//lezm email mwjoud
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
                               /*nthbtou kenhom f bon endroit*/

    // ken whd m staff y7eb yamel reser mel interface client
    if (source === 'client' && user.role !== 'client') {
      return res.status(403).json({
        message: "Cet email n'appartient pas à un compte client."
      });
    }
    //ken whd m client y7eb yamel reser mel interface staff
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
/*
**
*/
//f9 Réinitialiser le mot de passe avec le token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;//extraction du corps de la requette
    //lezm fme token w new password
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
      resetPasswordToken: hashedToken,//token hashe de user
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
    user.resetPasswordToken = undefined;//bech yetst3ml mra brka
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
