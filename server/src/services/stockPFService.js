import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import Commande from "../models/Commande.js";
import Recette from "../models/Recette.js";
import Notification from "../models/Notification.js";

//f1: t7sebleeekk 9deh andek stock pf f atelier 
export const calcStockPFAtelier = async (nomJus) => {
  const [prodAgg, transAgg, commandesAgg] = await Promise.all([//promise lance 3 requette en meme temps
    ProductionPF.aggregate([
      { $match: { nomJus } },
      { $group: { _id: null, total: { $sum: "$quantiteProduite" } } },
    ]),
    TransfertBoutique.aggregate([
      { $match: { nomJus } },
      { $group: { _id: null, total: { $sum: "$quantite" } } },
    ]),
    Commande.aggregate([
      { $match: { statut: { $in: ["livree", "prete"] } } },
      { $unwind: "$produits" },
      { $match: { "produits.nom": nomJus } },
      {
        $group: {
          _id: null,
          total: { $sum: "$produits.quantite" },
        },
      },
    ]),
  ]);

  const totalProduit   = prodAgg[0]?.total     || 0;
  const totalTransfere = transAgg[0]?.total    || 0;
  const totalReserve   = commandesAgg[0]?.total || 0;

  return parseFloat((totalProduit - totalTransfere - totalReserve).toFixed(2));
};

/* ═══════════════════════════════════════════════════════════════
   Vérifier l'alerte seuil PF après une opération.
   Crée une notification si le stock passe sous seuilMinPF.
═══════════════════════════════════════════════════════════════ */
export const verifierAlertePF = async (nomJus) => {
  const stockActuel = await calcStockPFAtelier(nomJus);
  const recette = await Recette.findOne({ nomJus });

  const seuil = recette?.seuilMinPF > 0 ? recette.seuilMinPF : 0;
  if (!seuil || stockActuel > seuil) return;//ken fmch seuil wle sotck actuel akber m seuil

  const existingNotif = await Notification.findOne({
    typeMP: nomJus,
    categorie: "PF",
    luAtelier: false,
  });

  if (!existingNotif) {
    await Notification.create({
      categorie: "PF",
      typeMP: nomJus,
      message: `Stock PF "${nomJus}" en dessous du seuil minimum. Stock actuel : ${stockActuel} L, Seuil : ${seuil} L.`,
      niveauActuel: stockActuel,
      seuilMin: seuil,
      unite: "L",
    });
  }
};
