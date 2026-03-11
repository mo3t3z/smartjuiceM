import { Routes, Route } from "react-router-dom";
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
import ProtectedRoute, { RedirectIfLoggedIn } from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogClient />} />

      <Route path="/login-client" element={<RedirectIfLoggedIn redirectRoles={["client"]}><LoginClient /></RedirectIfLoggedIn>} />
      <Route path="/register-client" element={<RedirectIfLoggedIn redirectRoles={["client"]}><RegisterClient /></RedirectIfLoggedIn>} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgot-password-staff" element={<ForgotPasswordStaff />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route path="/login" element={<RedirectIfLoggedIn redirectRoles={["manager", "seller", "workshop"]}><Login /></RedirectIfLoggedIn>} />

      <Route path="/manager" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerHome /></ProtectedRoute>} />
      <Route path="/manager/accounts" element={<ProtectedRoute allowedRoles={["manager"]}><ManageAccounts /></ProtectedRoute>} />
      <Route path="/manager/products" element={<ProtectedRoute allowedRoles={["manager"]}><ManageProducts /></ProtectedRoute>} />
      <Route path="/manager/account" element={<ProtectedRoute allowedRoles={["manager"]}><MonCompte /></ProtectedRoute>} />

      <Route path="/seller" element={<ProtectedRoute allowedRoles={["seller"]}><SellerHome /></ProtectedRoute>} />
      <Route path="/workshop" element={<ProtectedRoute allowedRoles={["workshop"]}><WorkshopHome /></ProtectedRoute>} />
    </Routes>
  );
}
