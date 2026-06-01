import { useState, useEffect, useRef } from "react";//use ref pour gérer input file
import axios from "axios";
import "./ManageProducts.css";
import { API_PRODUCTS, authHeader } from "../../utils/api";


export default function ManageProducts() {
  const [products, setProducts] = useState([]);//list pdt
  const [recettes, setRecettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    volume: "1L",
    available: true,
    recette: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Charger les produits et les recettes
  useEffect(() => {
    fetchProducts();
    fetchRecettes();
  }, []);
  //authHeadder ajoute le token 
  const fetchProducts = async () => {
    try {
      const res = await axios.get(API_PRODUCTS, { headers: authHeader() });
      setProducts(res.data);
      setLoading(false);
    } catch (err) {
      setMessage("Erreur lors du chargement des produits");
      setLoading(false);
    }
  };
  
  const fetchRecettes = async () => {
    try {
      const res = await axios.get(`${API_PRODUCTS}/recettes-disponibles`, { headers: authHeader() });
      setRecettes(res.data);
    } catch {
      // silencieux
    }
  };

  //Créer ou modifier un produit
  //preventdefault: empeche rechargement de la  page lorsque l'utilisateur soumet le formulaire de connexion
  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("volume", formData.volume);
    data.append("available", formData.available);
    if (formData.recette) data.append("recette", formData.recette);///si une recette est sélectionnée, l'ajouter au form data
    if (imageFile) {
      data.append("image", imageFile);
    }

    try {
      if (editingId) {//si editingId est défini, on est en train de modifier un produit existant
        await axios.put(
          `${API_PRODUCTS}/${editingId}`,
          data,
          { headers: authHeader() }
        );
        setMessage("Produit modifié avec succès !");
      } else {
        await axios.post(API_PRODUCTS, data, {
          headers: authHeader()
        });
        setMessage("Produit créé avec succès !");
      }

      // Réinitialiser le formulaire
      setFormData({
        name: "",
        description: "",
        price: "",
        volume: "1L",
        available: true,
        recette: "",
      });
      setImageFile(null);
      setImagePreview("");
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
      await axios.delete(`${API_PRODUCTS}/${id}`, {
        headers: authHeader()
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
      volume: product.volume || "1L",
      available: product.available,
      recette: product.recette?._id || "",
    });
    setImageFile(null);
    setImagePreview(product.image || "");
    setEditingId(product._id);
    setShowForm(true);
  };

  // Annuler l'édition
  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      volume: "1L",
      available: true,
      recette: "",
    });
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="manage-products-container">
      {/* Add button */}
      {!showForm && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px 0" }}>
          <button className="add-button" onClick={() => setShowForm(true)}>
            + Ajouter un produit
          </button>
        </div>
      )}

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
              <label>Image du produit</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    background: "#f5f5f5",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Choisir une photo
                </button>
                <span style={{ fontSize: "13px", color: "#666" }}>
                  {imageFile ? imageFile.name : "Aucune photo sélectionnée"}
                </span>
              </div>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  style={{ marginTop: "8px", maxHeight: "120px", borderRadius: "8px", objectFit: "cover" }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Volume</label>
              <input className="gr-input" value="1L" disabled style={{ background: "#f5f5f5", color: "#888", cursor: "not-allowed" }} />
            </div>

            <div className="form-group">
              <label>Recette liée (stock boutique)</label>
              <select
                value={formData.recette}
                onChange={(e) => setFormData({ ...formData, recette: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
              >
                <option value="">-- Aucune recette liée --</option>
                {recettes.map((r) => (
                  <option key={r._id} value={r._id}>{r.nomJus}</option>
                ))}
              </select>
              <small style={{ color: "#888", fontSize: "0.78rem" }}>
                Lier ce produit à sa recette permet de déduire le stock boutique correctement lors des ventes.
              </small>
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

                <div style={{ fontSize: "12px", color: product.recette ? "#2e7d32" : "#999", marginBottom: "8px" }}>
                  {product.recette
                    ? `Recette : ${product.recette.nomJus}`
                    : "Aucune recette liée"}
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
