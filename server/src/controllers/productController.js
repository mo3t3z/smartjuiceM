import Product from "../models/Product.js";
//f1: récupérer tous les produits (pour manager),f2: récupérer le catalogue public (pour clients),
// f3: créer un nouveau produit, f4: modifier un produit, f5: supprimer un produit

// Récupérer tous les produits (pour manager)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Récupérer le catalogue public (pour clients)
export const getCatalog = async (req, res) => {
  try {
    // Retourner seulement les produits disponibles, triés par nom
    const products = await Product.find({ available: true }).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Créer un nouveau produit
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, volume, available } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Nom et prix sont obligatoires" });
    }

    const imageUrl = req.file
      ? `http://localhost:5000/uploads/products/${req.file.filename}`
      : "";

    const product = await Product.create({
      name,
      description,
      price,
      image: imageUrl,
      volume: volume || "1L",
      available: available !== undefined ? available : true
    });

    res.status(201).json({ message: "Produit créé avec succès", product });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Modifier un produit
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, volume, available } = req.body;

    const updateData = { name, description, price, volume, available };

    if (req.file) {
      updateData.image = `http://localhost:5000/uploads/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    res.json({ message: "Produit modifié avec succès", product });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer un produit
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
