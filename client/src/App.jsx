import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import LoginClient from "./pages/LoginClient.jsx";
import RegisterClient from "./pages/RegisterClient.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ForgotPasswordStaff from "./pages/ForgotPasswordStaff.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ManagerHome from "./pages/ManagerHome.jsx";
import SellerHome from "./pages/SellerHome.jsx";
import WorkshopHome from "./pages/WorkshopHome.jsx";
import ManageAccounts from "./pages/ManageAccounts.jsx";
import ManageProducts from "./pages/ManageProducts.jsx";
import MonCompte from "./pages/MonCompte.jsx";
import CatalogClient from "./pages/CatalogClient.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { RedirectIfLoggedIn } from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      {/* Page d'accueil publique - Catalogue client */}
      <Route path="/" element={<CatalogClient />} />

      {/* Authentification client (séparée des employés) */}
      <Route path="/login-client" element={<RedirectIfLoggedIn><LoginClient /></RedirectIfLoggedIn>} />
      <Route path="/register-client" element={<RedirectIfLoggedIn><RegisterClient /></RedirectIfLoggedIn>} />
      
      {/* Routes de réinitialisation de mot de passe */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgot-password-staff" element={<ForgotPasswordStaff />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Page login commune pour tous (manager / seller / workshop) */}
      <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />

      {/* PB23 : Route protégée pour le manager */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerHome />
          </ProtectedRoute>
        }
      />

      {/* PB23 : Nouvelle route pour gérer les comptes */}
      <Route
        path="/manager/accounts"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManageAccounts />
          </ProtectedRoute>
        }
      />

      {/* Route pour gérer les produits */}
      <Route
        path="/manager/products"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManageProducts />
          </ProtectedRoute>
        }
      />

      {/* Route Mon Compte manager */}
      <Route
        path="/manager/account"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <MonCompte />
          </ProtectedRoute>
        }
      />

      {/* PB23 : Route protégée pour vendeur */}
      <Route
        path="/seller"
        element={
          <ProtectedRoute allowedRoles={["seller"]}>
            <SellerHome />
          </ProtectedRoute>
        }
      />

      {/* PB23 : Route protégée pour atelier */}
      <Route
        path="/workshop"
        element={
          <ProtectedRoute allowedRoles={["workshop"]}>
            <WorkshopHome />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}