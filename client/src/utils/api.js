// ── Business constants ────────────────────────────────────────────────────────
export const SEUIL_REMISE   = 200;
export const TAUX_REMISE    = 0.10;
export const FRAIS_LIVRAISON = 3;

// Returns true if the date+time combo is already in the past
export const isPastDateTime = (dateStr, heureStr) => {
  const [h, min] = heureStr.split(":").map(Number);
  const dt = new Date(dateStr);
  dt.setHours(h, min, 0, 0);
  return dt <= new Date();
};
//vite lit de fichier .env et remplace les variables d'environnement dans le code par leur valeur correspondante. 
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_WORKSHOP  = `${BASE_URL}/api/workshop`;
export const API_MANAGER   = `${BASE_URL}/api/manager`;
export const API_SELLER    = `${BASE_URL}/api/seller`;
export const API_AUTH      = `${BASE_URL}/api/auth`;
export const API_PRODUCTS  = `${BASE_URL}/api/products`;
export const API_COMMANDES = `${BASE_URL}/api/commandes`;
export const API_VENTES    = `${BASE_URL}/api/ventes`;
//lit le token sauvgarder dans le navigateur mis lhors de login
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
  //convertir le tableau js en string pour pouvoir le stock en local storage
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
export const getNbArticlesPanier = () => {//utiiser pour badge te3 cheryoul
  return getPanier().reduce((acc, item) => acc + item.quantite, 0);
};
