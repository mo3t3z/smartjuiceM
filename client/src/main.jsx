import React from "react";
import ReactDOM from "react-dom/client";
//BrowserRouter active le routing (navigation /login, /manager).
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
