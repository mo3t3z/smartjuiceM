import TransfertBoutique from "../models/TransfertBoutique.js";
import Vente from "../models/Vente.js";
import Commande from "../models/Commande.js";
import StockBoutique from "../models/StockBoutique.js";
import Recette from "../models/Recette.js";
import Notification from "../models/Notification.js";

//recalculerstockdepuisdb hia 
const recalculerStockDepuisDB = async (nomJus) => {
  const transAgg = await TransfertBoutique.aggregate([
    { $match: { nomJus } },
    { $group: { _id: null, total: { $sum: "$quantite" } } },
  ]);
  const totalRecu = transAgg[0]?.total || 0;//totale de transfert

  const ventesAgg = await Vente.aggregate([
    { $unwind: "$produits" },
    { $match: { "produits.nom": nomJus } },
    {
      $group: {
        _id: null,
        total: { $sum: "$produits.quantite" },
      },
    },
  ]);
  const totalVendu = ventesAgg[0]?.total || 0;//totale de vente 

  return parseFloat((totalRecu - totalVendu).toFixed(2));//results
};


//Lire le stock boutique depuis la collection dédiée,  
export const calcStockBoutique = async (nomJus) => {
  const doc = await StockBoutique.findOne({ nomJus });
  if (doc) return doc.stockActuel;//li

  const stock = await recalculerStockDepuisDB(nomJus);
  await StockBoutique.findOneAndUpdate(
    { nomJus },
    { $setOnInsert: { stockActuel: stock } },
    { upsert: true }
  );
  return stock;
};

/* ═══════════════════════════════════════════════════════════════
   Incrémenter/décrémenter le stock boutique.
   delta > 0 → entrée (transfert), delta < 0 → sortie (vente/livraison)
═══════════════════════════════════════════════════════════════ */
export const ajouterStockBoutique = async (nomJus, delta) => {
  await calcStockBoutique(nomJus); // garantit que le doc existe
  return StockBoutique.findOneAndUpdate(
    { nomJus },
    { $inc: { stockActuel: parseFloat(delta.toFixed(4)) } },//inc tzyd w tn9s f stock
    { new: true }
  );
};

/* ═══════════════════════════════════════════════════════════════
   Vérifier les alertes stock boutique après une opération (PB26).
   Crée une notification si le stock passe sous le seuil minimum.
═══════════════════════════════════════════════════════════════ */
export const verifierAlerteBoutique = async (nomJus) => {
  const stockActuel = await calcStockBoutique(nomJus);
  const recette = await Recette.findOne({ nomJus });

  const seuil = recette?.seuilMinBoutique > 0 ? recette.seuilMinBoutique : 0;
  if (!seuil || stockActuel > seuil) return;

  const existingNotif = await Notification.findOne({
    typeMP: nomJus,
    categorie: "BOUTIQUE",
    $or: [{ luAtelier: false }, { luManager: false }],
  });

  if (!existingNotif) {
    await Notification.create({
      categorie: "BOUTIQUE",
      typeMP: nomJus,
      message: `Stock boutique de "${nomJus}" en dessous du seuil minimum. Stock actuel : ${stockActuel.toFixed(2)} L, Seuil : ${seuil} L. Un transfert est nécessaire.`,
      niveauActuel: parseFloat(stockActuel.toFixed(2)),
      seuilMin: seuil,
      unite: "L",
      luAtelier: false,
      luManager: false,
    });
  }
};
