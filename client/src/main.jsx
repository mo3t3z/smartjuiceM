import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App.jsx";


// Exclure les routes d'authentification puisque il n'y a pas de token à vérifier pour ces routes
const AUTH_ROUTES = ["/api/auth/login", "/api/auth/register-client", "/api/auth/request-password-reset", "/api/auth/reset-password", "/api/auth/change-password"];
//a chaque reponse verifie si erreur 404 et pas route auth redirige vers auth 
axios.interceptors.response.use(
  (response) => response,//safe passe 
  (error) => {
    const requestUrl = error.config?.url || "";//recupérer url qui a causer erreur 
    const isAuthRoute = AUTH_ROUTES.some((route) => requestUrl.includes(route));//verifier si route auth

    if (error.response?.status === 401 && !isAuthRoute) {//si erreur et non authroute
      const user = JSON.parse(localStorage.getItem("user") || "null");//recupérer user
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Rediriger vers le bon portail selon le rôle
      if (user?.role === "client") {
        window.location.href = "/login-client";
      } else if (["manager", "seller", "workshop"].includes(user?.role)) {
        window.location.href = "/login";
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);//continuer a recevoir erreur
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(//redemarrer app
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
