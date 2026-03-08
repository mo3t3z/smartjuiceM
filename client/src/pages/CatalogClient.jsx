import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CatalogClient.css";

export default function CatalogClient() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchCatalog();
    checkUser();
  }, []);

  const checkUser = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Vérifier que c'est un client (pas un employé)
      if (parsedUser.role === "client") {
        setUser(parsedUser);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const fetchCatalog = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/products/catalog");
      setProducts(res.data);
      setLoading(false);
    } catch (err) {
      setError("Impossible de charger le catalogue");
      setLoading(false);
    }
  };

  const handleOrder = (productId) => {
    if (!user) {
      // Si pas connecté, rediriger vers la page de connexion
      navigate("/login-client");
    } else {
      // Si connecté, traiter la commande
      alert("Fonctionnalité de commande à venir !");
    }
  };

  return (
    <div className="catalog-container">
      {/* Header */}
      <div className="catalog-header">
        <div className="catalog-title">
          <h1>SmartJuice</h1>
          <p>Jus naturels frais et délicieux</p>
        </div>
        
        {user ? (
          <div className="user-actions">
            <span className="user-email">👤 {user.email}</span>
            <button className="logout-button" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        ) : (
          <button className="login-button" onClick={() => navigate("/login-client")}>
            Connexion
          </button>
        )}
      </div>

      {/* Message d'erreur */}
      {error && <div className="error-message">{error}</div>}

      {/* Chargement */}
      {loading ? (
        <div className="loading">Chargement du catalogue...</div>
      ) : products.length === 0 ? (
        <div className="no-products">
          <p>Aucun produit disponible pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Grille des produits */}
          <div className="catalog-grid">
            {products.map((product) => (
              <div key={product._id} className="catalog-card">
                {product.image && (
                  <div className="catalog-image-container">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="catalog-image"
                    />
                    <div className="catalog-volume-badge">{product.volume}</div>
                  </div>
                )}
                
                <div className="catalog-content">
                  <h3 className="catalog-product-name">{product.name}</h3>
                  
                  {product.description && (
                    <p className="catalog-description">{product.description}</p>
                  )}
                  
                  <div className="catalog-footer">
                    <div className="catalog-price">{product.price} DT</div>
                    <button 
                      className="catalog-order-button"
                      onClick={() => handleOrder(product._id)}
                    >
                      Commander
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="catalog-footer-info">
        <p>© 2026 SmartJuice - Jus naturels de qualité</p>
      </div>
    </div>
  );
}
