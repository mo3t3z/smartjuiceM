import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ManageProducts.css";

export default function ManageProducts() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    volume: "0.5L",
    available: true
  });

  // Charger les produits
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
      setLoading(false);
    } catch (err) {
      setMessage("Erreur lors du chargement des produits");
      setLoading(false);
    }
  };

  // Créer ou modifier un produit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Modification
        await axios.put(
          `http://localhost:5000/api/products/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage("Produit modifié avec succès !");
      } else {
        // Création
        await axios.post("http://localhost:5000/api/products", formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage("Produit créé avec succès !");
      }

      // Réinitialiser le formulaire
      setFormData({
        name: "",
        description: "",
        price: "",
        image: "",
        volume: "0.5L",
        available: true
      });
      setEditingId(null);
      setShowForm(false);
      fetchProducts();

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur");
    }
  };

  // Supprimer un produit
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("Produit supprimé avec succès !");
      fetchProducts();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur");
    }
  };

  // Modifier un produit (remplir le formulaire)
  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      image: product.image || "",
      volume: product.volume || "0.5L",
      available: product.available
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  // Annuler l'édition
  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image: "",
      volume: "0.5L",
      available: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="manage-products-container">
      {/* Header */}
      <div className="products-header">
        <button className="back-button" onClick={() => navigate("/manager")}>
          ← Retour
        </button>
        <h2>Gestion des Produits</h2>
        {!showForm && (
          <button className="add-button" onClick={() => setShowForm(true)}>
            + Ajouter un produit
          </button>
        )}
      </div>

      {/* Message de succès/erreur */}
      {message && <div className="message">{message}</div>}

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <div className="product-form-card">
          <h3>{editingId ? "Modifier le produit" : "Nouveau produit"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nom du produit *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Jus d'orange"
                />
              </div>

              <div className="form-group">
                <label>Prix (DT) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="Ex: 5.50"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description du produit (optionnel)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>URL de l'image</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
                placeholder="https://exemple.com/image.jpg"
              />
            </div>

            <div className="form-group">
              <label>Volume</label>
              <select
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              >
                <option value="0.5L">0.5L</option>
                <option value="1L">1L</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) =>
                    setFormData({ ...formData, available: e.target.checked })
                  }
                />
                Produit disponible à la vente
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingId ? "Modifier" : "Créer"}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancel}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des produits */}
      <div className="products-list">
        {loading ? (
          <p>Chargement...</p>
        ) : products.length === 0 ? (
          <p className="no-products">
            Aucun produit disponible. Cliquez sur "Ajouter un produit" pour
            commencer.
          </p>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />
                )}
                
                <div className="product-header">
                  <h3>{product.name}</h3>
                  <span className={`status ${product.available ? "available" : "unavailable"}`}>
                    {product.available ? "Disponible" : "Indisponible"}
                  </span>
                </div>

                {product.description && (
                  <p className="product-description">{product.description}</p>
                )}

                <div className="product-info">
                  <div className="product-price">{product.price} DT</div>
                  <div className="product-volume">{product.volume}</div>
                </div>
                

                <div className="product-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(product)}
                  >
                    Modifier
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(product._id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
