import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import LoginClient from "./pages/LoginClient.jsx";
import RegisterClient from "./pages/RegisterClient.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ForgotPasswordStaff from "./pages/ForgotPasswordStaff.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ManagerHome from "./pages/ManagerHome.jsx";
import ManagerLayout from "./components/ManagerLayout.jsx";
import WorkshopLayout from "./components/WorkshopLayout.jsx";
import SellerLayout from "./components/SellerLayout.jsx";
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
import MonCompteClient from "./pages/MonCompteClient.jsx";

// ── Sprint 3 : Gestion des Ventes et Commandes ──────────────────────────────
import Panier from "./pages/client/Panier.jsx";
import CommandeCheckout from "./pages/client/CommandeCheckout.jsx";
import MesCommandes from "./pages/client/MesCommandes.jsx";
import GererCommandes from "./pages/manager/GererCommandes.jsx";
import HistoriqueVentes from "./pages/manager/HistoriqueVentes.jsx";
import NouvelleVente from "./pages/seller/NouvelleVente.jsx";
import NouvelleCommandePhysique from "./pages/seller/NouvelleCommandePhysique.jsx";
import CommandesConfirmees from "./pages/workshop/CommandesConfirmees.jsx";
import FaqWidget from "./components/FaqWidget.jsx";
import { useLocation } from "react-router-dom";

const STAFF_PREFIXES = ["/manager", "/seller", "/workshop", "/login", "/forgot-password", "/reset-password", "/register-client"];

export default function App() {
  const { pathname } = useLocation();
  const showFaq = !STAFF_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
    {showFaq && <FaqWidget />}
    <Routes>
      {/* ── Catalogue public (page d'accueil) ── */}
      <Route path="/" element={<CatalogClient />} />

      {/* ── Routes Client ── */}
      <Route path="/client/account" element={<MonCompteClient />} />
      <Route path="/client/panier" element={<Panier />} />
      <Route path="/client/checkout" element={<CommandeCheckout />} />
      <Route path="/client/mes-commandes" element={<ProtectedRoute allowedRoles={["client"]}><MesCommandes /></ProtectedRoute>} />

      {/* ── Authentification ── */}
      <Route path="/login-client" element={<RedirectIfLoggedIn redirectRoles={["client"]}><LoginClient /></RedirectIfLoggedIn>} />
      <Route path="/register-client" element={<RedirectIfLoggedIn redirectRoles={["client"]}><RegisterClient /></RedirectIfLoggedIn>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgot-password-staff" element={<ForgotPasswordStaff />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/login" element={<RedirectIfLoggedIn redirectRoles={["manager", "seller", "workshop"]}><Login /></RedirectIfLoggedIn>} />

      {/* ── Manager (layout avec sidebar persistante) ── */}
      <Route path="/manager" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerLayout /></ProtectedRoute>}>
        <Route index element={<ManagerHome />} />
        <Route path="accounts" element={<ManageAccounts />} />
        <Route path="products" element={<ManageProducts />} />
        <Route path="account" element={<MonCompte />} />
        <Route path="stocks" element={<ManagerStocks />} />
        <Route path="stocks/mp" element={<ManagerStockMP />} />
        <Route path="stocks/pf" element={<ManagerStockPF />} />
        <Route path="stocks/boutique" element={<ManagerStockBoutique />} />
        <Route path="commandes" element={<GererCommandes />} />
        <Route path="ventes" element={<HistoriqueVentes />} />
      </Route>

      {/* ── Vendeur (layout avec sidebar persistante) ── */}
      <Route path="/seller" element={<ProtectedRoute allowedRoles={["seller"]}><SellerLayout /></ProtectedRoute>}>
        <Route index element={<SellerHome />} />
        <Route path="stock-pf" element={<StockPFBoutique />} />
        <Route path="nouvelle-vente" element={<NouvelleVente />} />
        <Route path="nouvelle-commande" element={<NouvelleCommandePhysique />} />
      </Route>

      {/* ── Atelier (layout avec sidebar persistante) ── */}
      <Route path="/workshop" element={<ProtectedRoute allowedRoles={["workshop"]}><WorkshopLayout /></ProtectedRoute>}>
        <Route index element={<WorkshopHome />} />
        <Route path="matieres-premieres" element={<MatierePremiere />} />
        <Route path="recettes" element={<GererRecette />} />
        <Route path="quantite-produire" element={<QuantiteProduire />} />
        <Route path="transfert-boutique" element={<TransfertBoutique />} />
        <Route path="stock" element={<StockAtelier />} />
        <Route path="stock/mp" element={<StockMP />} />
        <Route path="stock/pf" element={<StockPF />} />
        <Route path="commandes-confirmees" element={<CommandesConfirmees />} />
      </Route>
    </Routes>
    </>
  );
}
