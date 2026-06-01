import Product from "../models/Product.js";
import Recette from "../models/Recette.js";
//f1: récupérer tous les produits (pour manager),f2: récupérer les recettes disponibles,
// f3: récupérer le catalogue public (pour clients),
// f4: créer un nouveau produit, f5: modifier un produit, f6: supprimer un produit

//f1: récupérer tous les produits (pour manager)(gestion du catalogue)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("recette", "nomJus")//remplir le champ recette avec le nom du jus
      .sort({ createdAt: -1 });
    res.json(products);//retourner les produits au format JSON
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f2: récupérer les recettes disponibles pour le dropdown du manager lhors de creation ou modif recette 
export const getRecettesDisponibles = async (req, res) => {
  try {
    const recettes = await Recette.find({}, "_id nomJus").sort({ nomJus: 1 });
    res.json(recettes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f3: récupérer le catalogue public (pour clients)
export const getCatalog = async (req, res) => {
  try {
    // Retourner seulement les produits disponibles, triés par nom
    const products = await Product.find({ available: true }).sort({ name: 1 });//trie par ordre alphabétique
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f4: créer un nouveau produit
export const createProduct = async (req, res) => {
  try {//récupérer les données du formulaire
    const { name, description, price, volume, available, recette } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Nom et prix sont obligatoires" });
    }

    const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
    const imageUrl = req.file//ajouter par upload midleware
      ? `${baseUrl}/uploads/products/${req.file.filename}`
      : "";

    const product = await Product.create({
      name,
      description,
      price,
      image: imageUrl,
      volume: volume || "1L",
      available: available !== undefined ? available : true,
      recette: recette || null,
    });

    const populated = await product.populate("recette", "nomJus");
    res.status(201).json({ message: "Produit créé avec succès", product: populated });//retourner le produit créé au format JSON
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f5: modifier un produit
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;//récupérer les données du formulaire
    const { name, description, price, volume, available, recette } = req.body;//créer un objet de mise à jour 

    const updateData = { name, description, price, volume, available, recette: recette || null };

    if (req.file) {
      const baseUrl = process.env.SERVER_URL || "http://localhost:5000";//ajouter par upload midleware
      updateData.image = `${baseUrl}/uploads/products/${req.file.filename}`;//req.file contient les infos de image
    }
//mettre à jour le produit et retourner le produit mis à jour au format JSON
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate("recette", "nomJus");

    if (!product) {//si le produit n'existe pas, retourner une erreur 
      return res.status(404).json({ message: "Produit introuvable" });
    }
    //si la mise à jour est réussie, retourner un message de succès 
    res.json({ message: "Produit modifié avec succès", product });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// f6: supprimer un produit
export const deleteProduct = async (req, res) => {//récupérer l'id du produit à supprimer 
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
