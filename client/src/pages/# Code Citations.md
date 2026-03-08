# Code Citations

## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```


## License: unknown
https://github.com/jlangweil/MorristownMovies/blob/36bc2d14e3da4e7c0360536eec18e43a215f73cf/src/components/Login/ForgotPassword.js

```
Parfait ! Voici comment implémenter la **réinitialisation de mot de passe par email** pour votre projet :

## 🔐 Flux de réinitialisation de mot de passe

### Étape 1 : L'utilisateur demande une réinitialisation
1. Client remplit un formulaire avec son email
2. Backend génère un **token unique** temporaire
3. Backend envoie un email avec un lien contenant le token
4. Le lien expire après 1 heure

### Étape 2 : L'utilisateur clique sur le lien
1. Le lien redirige vers une page avec le token
2. Client entre son nouveau mot de passe
3. Backend vérifie le token et met à jour le mot de passe

---

## 📦 1. Installer Nodemailer (envoi d'emails)

```bash
cd server
npm install nodemailer
```

---

## 🗄️ 2. Modifier le modèle User

Ajoutez ces champs au modèle User pour stocker le token :

```javascript
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["manager", "seller", "workshop", "client"], required: true },
    nom: { type: String, trim: true, default: "" },
    prenom: { type: String, trim: true, default: "" },
    telephone: { type: String, trim: true, default: "" },
    
    // NOUVEAUX CHAMPS pour reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);
```

---

## 📧 3. Configurer Nodemailer

Créez un fichier pour configurer l'envoi d'emails :

```javascript
// server/src/config/emailConfig.js
import nodemailer from 'nodemailer';

// Configuration pour Gmail (exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe d'application Gmail
  }
});

// Fonction pour envoyer l'email de réinitialisation
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #4CAF50; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p><strong>Ce lien expirera dans 1 heure.</strong></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">SmartJuice - Votre boutique de jus</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};

export default transporter;
```

---

## 🎛️ 4. Ajouter les variables d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server` :

```env
# server/.env
JWT_SECRET=votre_secret_jwt
MONGODB_URI=mongodb://localhost:27017/smartjuice

# Configuration Email
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

**Note importante pour Gmail :**
- Activez la **validation en deux étapes**
- Générez un **mot de passe d'application** depuis votre compte Google
- Utilisez ce mot de passe (pas votre mot de passe Gmail normal)

---

## 🎮 5. Créer les controllers

Ajoutez ces fonctions dans [authController.js](server/src/controllers/authController.js) :

```javascript
// server/src/controllers/authController.js
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../config/emailConfig.js';

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Même si l'utilisateur n'existe pas, on dit que l'email est envoyé
    // (pour ne pas révéler quels emails sont dans la DB)
    if (!user) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
      });
    }

    // Générer un token unique cryptographiquement sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
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
        message: "Erreur lors de l'envoi de l'email" 
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

    // Hasher le token reçu pour le comparer
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
        message: "Token invalide ou expiré" 
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
      message: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
```

---

## 🛣️ 6. Ajouter les routes

Modifiez [authRoutes.js](server/src/routes/authRoutes.js) :

```javascript
// server/src/routes/authRoutes.js
import { 
  login, 
  createStaffAccount, 
  registerClient, 
  changePassword, 
  getStaffAccounts, 
  updateStaffAccount, 
  deleteStaffAccount,
  requestPasswordReset,  // NOUVEAU
  resetPassword          // NOUVEAU
} from "../controllers/authController.js";

// ... routes existantes ...

// Routes publiques pour reset password
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
```

---

## 🖥️ 7. Frontend - Page de demande de réinitialisation

Créez une nouvelle page :

```jsx
// client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/request-password-reset',
        { email }
      );
      
      setMessage(response.data.message);
      setEmail(''); // Vider le champ
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Erreur lors de la demande de réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Mot de passe oublié ?</h1>
        <p className="subtitle">
          Entrez votre email et nous vous enverrons un lien pour 
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <a href="/login-client" className="back-link">
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
```

---

## 🖥️ 8. Frontend - Page de réinitialisation

```jsx
// client/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams(); // Récupère le token de l'URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
```

