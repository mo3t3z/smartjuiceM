//navigate permet la navigarion sans charger la page
import { Navigate } from "react-router-dom";
//children:c la page a afficher      | allowedrole:role autorisé a acceder

//(el msh connecté me tkhlichi yodkhel hadou had login)
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Si pas connecté → retour login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  //ken l9a user w role 
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirection vers son interface selon son rôle
    if (user.role === "manager")  return <Navigate to="/manager" replace />;
    if (user.role === "seller")   return <Navigate to="/seller" replace />;
    if (user.role === "workshop") return <Navigate to="/workshop" replace />;
    if (user.role === "client")   return <Navigate to="/" replace />;
    // Rôle inconnu → déconnexion
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ((deja connecté w yheb yerjea lel login tkhlichi)
// redirectRoles : liste des rôles à rediriger (si absent, redirige tous les rôles)
export function RedirectIfLoggedIn({ children, redirectRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (token && user) {
    //redirect role hyia liste d'interface ely yhbou yerj3ou lel login
    const shouldRedirect = !redirectRoles || redirectRoles.includes(user.role);
    if (shouldRedirect) {
      if (user.role === "manager") return <Navigate to="/manager" replace />;
      if (user.role === "seller") return <Navigate to="/seller" replace />;
      if (user.role === "workshop") return <Navigate to="/workshop" replace />;
      if (user.role === "client") return <Navigate to="/" replace />;
    }
  }

  return children;
}
