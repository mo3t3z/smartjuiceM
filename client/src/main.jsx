import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App.jsx";

// Intercepteur global axios : redirige vers login si token expiré ou invalide
// Exclure les routes d'authentification pour ne pas interférer avec les messages d'erreur du login
const AUTH_ROUTES = ["/api/auth/login", "/api/auth/register-client", "/api/auth/request-password-reset", "/api/auth/reset-password"];

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRoute = AUTH_ROUTES.some((route) => requestUrl.includes(route));

    if (error.response?.status === 401 && !isAuthRoute) {
      const user = JSON.parse(localStorage.getItem("user") || "null");
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
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
