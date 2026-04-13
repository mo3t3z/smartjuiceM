import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App.jsx";

// Intercepteur global axios : redirige vers login si token expiré ou invalide
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
