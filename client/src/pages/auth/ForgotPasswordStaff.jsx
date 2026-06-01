import ForgotPassword from './ForgotPassword';
/*
 Utilise la même fonction que ForgotPassword mais avec une source différente
 pour différencier les deux types de demande de réinitialisation
 */
export default function ForgotPasswordStaff() {
  return <ForgotPassword source="staff" backLink="/login" />;
}
//backlink c le lien de retour
