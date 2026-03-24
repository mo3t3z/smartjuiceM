export const API_WORKSHOP = "http://localhost:5000/api/workshop";
export const API_MANAGER  = "http://localhost:5000/api/manager";
export const API_SELLER   = "http://localhost:5000/api/seller";
export const API_AUTH     = "http://localhost:5000/api/auth";
export const API_PRODUCTS = "http://localhost:5000/api/products";

export const getToken  = () => localStorage.getItem("token");
export const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });
