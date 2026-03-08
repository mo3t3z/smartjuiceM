import { useState } from "react";

export default function WorkshopHome() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h2>Interface Atelier</h2>
      <p><b>Email:</b> {user?.email}</p>
      <p><b>Rôle:</b> {user?.role}</p>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
