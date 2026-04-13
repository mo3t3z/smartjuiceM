import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Si pas connecté → retour login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // PB23 : Vérification des rôles autorisés
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

// Redirige les utilisateurs déjà connectés vers leur page d'accueil.
// redirectRoles : liste des rôles à rediriger (si absent, redirige tous les rôles)
export function RedirectIfLoggedIn({ children, redirectRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (token && user) {
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
