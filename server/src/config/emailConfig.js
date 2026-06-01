import nodemailer from 'nodemailer';

// Création lazy du transporteur (après que dotenv ait chargé les variables)
let transporter;

//creation du transport avec lazy connection pour que les variable de email vont charger dans env 
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
}

// Fonction pour envoyer l'email de réinitialisation de mot de passe
export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  //contneu de mail 
  const mailOptions = {
    from: `SmartJuice <${process.env.EMAIL_USER}>`,//le email qui va envoyée
    to: email,//a qui
    subject: 'Réinitialisation de votre mot de passe - SmartJuice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🍊 SmartJuice</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Réinitialisation de mot de passe</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Bonjour,
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe pour votre compte SmartJuice.
            Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #4CAF50; color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Ou copiez ce lien dans votre navigateur :
          </p>
          
          <p style="background-color: #f5f5f5; padding: 10px; border-left: 3px solid #4CAF50; 
                    word-break: break-all; color: #333; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <div style="background-color: #fff3cd; border-left: 3px solid #ffc107; 
                      padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404; font-weight: bold;">
              Important
            </p>
            <p style="margin: 10px 0 0 0; color: #856404;">
              Ce lien expirera dans <strong>1 heure</strong> pour des raisons de sécurité.
            </p>
          </div>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
            Votre mot de passe actuel reste inchangé.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            © 2026 SmartJuice - Votre boutique de jus frais<br>
            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('Email envoyé avec succès:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

export default getTransporter;
