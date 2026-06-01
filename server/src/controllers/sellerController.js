import TransfertBoutique from "../models/TransfertBoutique.js";
import StockBoutique from "../models/StockBoutique.js";


//fonction ely t'affichi chandek stock f boutique


export const getStockPFBoutique = async (req, res) => {
  try {
    const transferts = await TransfertBoutique.aggregate([
      { $group: { _id: "$nomJus", totalRecu: { $sum: "$quantite" }, nbTransferts: { $sum: 1 } } },
    ]);

    const stockDocs = await StockBoutique.find();
    const stockMap  = {};
    stockDocs.forEach((s) => { stockMap[s.nomJus] = s.stockActuel; });

    const result = transferts.map((t) => ({
      nomJus:       t._id,
      totalRecu:    t.totalRecu,
      nbTransferts: t.nbTransferts,
      disponible:   Math.max(0, stockMap[t._id] ?? 0),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

