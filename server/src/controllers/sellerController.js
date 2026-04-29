import TransfertBoutique from "../models/TransfertBoutique.js";
import StockBoutique from "../models/StockBoutique.js";

/* ═══════════════════════════════════════
   STOCK PF BOUTIQUE (Vendeur)
═══════════════════════════════════════ */

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

export const getHistoriquePFBoutique = async (req, res) => {
  try {
    const { nomJus } = req.params;
    const transferts = await TransfertBoutique.find({ nomJus })
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateTransfert: -1 });
    res.json({ nomJus, transferts });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
