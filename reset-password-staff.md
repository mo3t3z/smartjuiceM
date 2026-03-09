# Réinitialisation du mot de passe – Gestion par rôle

## Objectif

Permettre au **manager** de réinitialiser son mot de passe par email, tout en empêchant les **vendeurs** et l'**atelier** de le faire (ils doivent contacter le manager).

---

## Fichiers modifiés

### Backend

| Fichier | Modification |
|---|---|
| `server/src/controllers/authController.js` | Ajout d'un contrôle de rôle dans `requestPasswordReset` : les rôles `seller` et `workshop` reçoivent une erreur 403 avec le message *"Vous devez contacter le manager pour réinitialiser votre mot de passe."* |
| `server/src/controllers/authController.js` | `resetPassword` retourne désormais le `role` de l'utilisateur dans la réponse pour permettre la redirection côté frontend. |

### Frontend

| Fichier | Modification |
|---|---|
| `client/src/pages/ForgotPasswordStaff.jsx` | **Nouveau fichier** – Page de demande de réinitialisation pour le staff (manager/vendeur/atelier), avec lien retour vers `/login`. |
| `client/src/pages/Login.jsx` | Ajout d'un lien **"Mot de passe oublié ?"** qui pointe vers `/forgot-password-staff`. |
| `client/src/pages/Login.css` | Ajout du style CSS pour le lien "Mot de passe oublié". |
| `client/src/pages/ResetPassword.jsx` | Redirection après réinitialisation selon le rôle : manager → `/login`, client → `/login-client`. |
| `client/src/App.jsx` | Ajout de la route `/forgot-password-staff` et import du composant `ForgotPasswordStaff`. |

---

## Comportement par rôle

| Rôle | Peut réinitialiser ? | Comportement |
|---|---|---|
| **Manager** | ✅ Oui | Reçoit un email avec un lien de réinitialisation. Après modification, redirigé vers `/login`. |
| **Client** | ✅ Oui | Reçoit un email avec un lien de réinitialisation. Après modification, redirigé vers `/login-client`. |
| **Vendeur (seller)** | ❌ Non | Message d'erreur : *"Vous devez contacter le manager pour réinitialiser votre mot de passe."* |
| **Atelier (workshop)** | ❌ Non | Message d'erreur : *"Vous devez contacter le manager pour réinitialiser votre mot de passe."* |

---

## Parcours utilisateur (Manager)

1. Le manager clique sur **"Mot de passe oublié ?"** depuis la page `/login`.
2. Il est redirigé vers `/forgot-password-staff`.
3. Il saisit son email et clique sur **"Envoyer le lien"**.
4. Un email contenant un lien de réinitialisation est envoyé.
5. Il clique sur le lien → page `/reset-password/:token`.
6. Il saisit son nouveau mot de passe et confirme.
7. Redirection automatique vers `/login` après 2 secondes.

## Parcours utilisateur (Vendeur / Atelier)

1. Le vendeur ou l'atelier clique sur **"Mot de passe oublié ?"** depuis `/login`.
2. Il saisit son email et clique sur **"Envoyer le lien"**.
3. Le message s'affiche : **"Vous devez contacter le manager pour réinitialiser votre mot de passe."**
