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
import MatierePremiere from "./pages/workshop/MatierePremiere.jsx";
import GererRecette from "./pages/workshop/GererRecette.jsx";
import QuantiteProduire from "./pages/workshop/QuantiteProduire.jsx";
import TransfertBoutique from "./pages/workshop/TransfertBoutique.jsx";
import StockAtelier from "./pages/workshop/StockAtelier.jsx";
import StockMP from "./pages/workshop/StockMP.jsx";
import StockPF from "./pages/workshop/StockPF.jsx";
import StockPFBoutique from "./pages/seller/StockPFBoutique.jsx";
import ManagerStocks from "./pages/manager/ManagerStocks.jsx";
import ManagerStockMP from "./pages/manager/ManagerStockMP.jsx";
import ManagerStockPF from "./pages/manager/ManagerStockPF.jsx";
import ManagerStockBoutique from "./pages/manager/ManagerStockBoutique.jsx";

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
      <Route path="/manager/stocks" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerStocks /></ProtectedRoute>} />
      <Route path="/manager/stocks/mp" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerStockMP /></ProtectedRoute>} />
      <Route path="/manager/stocks/pf" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerStockPF /></ProtectedRoute>} />
      <Route path="/manager/stocks/boutique" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerStockBoutique /></ProtectedRoute>} />

      <Route path="/seller" element={<ProtectedRoute allowedRoles={["seller"]}><SellerHome /></ProtectedRoute>} />
      <Route path="/seller/stock-pf" element={<ProtectedRoute allowedRoles={["seller"]}><StockPFBoutique /></ProtectedRoute>} />
      <Route path="/workshop" element={<ProtectedRoute allowedRoles={["workshop"]}><WorkshopHome /></ProtectedRoute>} />
      <Route path="/workshop/matieres-premieres" element={<ProtectedRoute allowedRoles={["workshop"]}><MatierePremiere /></ProtectedRoute>} />
      <Route path="/workshop/recettes" element={<ProtectedRoute allowedRoles={["workshop"]}><GererRecette /></ProtectedRoute>} />
      <Route path="/workshop/quantite-produire" element={<ProtectedRoute allowedRoles={["workshop"]}><QuantiteProduire /></ProtectedRoute>} />
      <Route path="/workshop/transfert-boutique" element={<ProtectedRoute allowedRoles={["workshop"]}><TransfertBoutique /></ProtectedRoute>} />
      <Route path="/workshop/stock" element={<ProtectedRoute allowedRoles={["workshop"]}><StockAtelier /></ProtectedRoute>} />
      <Route path="/workshop/stock/mp" element={<ProtectedRoute allowedRoles={["workshop"]}><StockMP /></ProtectedRoute>} />
      <Route path="/workshop/stock/pf" element={<ProtectedRoute allowedRoles={["workshop"]}><StockPF /></ProtectedRoute>} />
    </Routes>
  );
}
