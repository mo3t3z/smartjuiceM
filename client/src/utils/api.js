export const API_WORKSHOP  = "http://localhost:5000/api/workshop";
export const API_MANAGER   = "http://localhost:5000/api/manager";
export const API_SELLER    = "http://localhost:5000/api/seller";
export const API_AUTH      = "http://localhost:5000/api/auth";
export const API_PRODUCTS  = "http://localhost:5000/api/products";
export const API_COMMANDES = "http://localhost:5000/api/commandes";
export const API_VENTES    = "http://localhost:5000/api/ventes";

export const getToken = () => localStorage.getItem("token") || "";
export const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Helpers panier (localStorage) ────────────────────────────────────────────

// Récupérer le panier
export const getPanier = () => {
  try {
    return JSON.parse(localStorage.getItem("panier") || "[]");
  } catch {
    return [];
  }
};

// Sauvegarder le panier
export const savePanier = (panier) => {
  localStorage.setItem("panier", JSON.stringify(panier));
};

// Ajouter un produit au panier
export const ajouterAuPanier = (produit, quantite = 1) => {
  const panier = getPanier();
  const existant = panier.find((item) => item.produitId === produit._id);
  if (existant) {
    existant.quantite += quantite;
  } else {
    panier.push({
      produitId: produit._id,
      nom: produit.name,
      prix: produit.price,
      volume: produit.volume,
      image: produit.image || "",
      quantite,
    });
  }
  savePanier(panier);
  return panier;
};

// Nombre d'articles dans le panier
export const getNbArticlesPanier = () => {
  return getPanier().reduce((acc, item) => acc + item.quantite, 0);
};
