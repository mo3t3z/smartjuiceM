import MatierePremiere from "../models/MatierePremiere.js";
import Recette from "../models/Recette.js";
import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import TypeMP from "../models/TypeMP.js";
import Notification from "../models/Notification.js";
import StockBoutique from "../models/StockBoutique.js";
import Commande from "../models/Commande.js";
import { ajouterStockBoutique } from "../services/stockBoutiqueService.js";
import { calcStockPFAtelier } from "../services/stockPFService.js";

//f1:HELPER --> calcDisponible() 
const calcDisponible = async () => {
  const regs = await MatierePremiere.aggregate([
    {
      $lookup: {
        from: "typemps",
        localField: "typeMP",
        foreignField: "_id",
        as: "typeMPDoc",
      },
    },
    { $unwind: "$typeMPDoc" },
    {
      $group: {
        _id: { type: "$typeMPDoc.nom", unite: "$unite" },
        total: { $sum: "$quantite" },
      },
    },
  ]);

  const deds = await ProductionPF.aggregate([
    { $unwind: "$deductionsMP" },
    {
      $group: {
        _id: { type: "$deductionsMP.matiere", unite: "$deductionsMP.unite" },
        total: { $sum: "$deductionsMP.quantite" },
      },
    },
  ]);

  const map = {};
  regs.forEach((r) => {
    map[`${r._id.type}||${r._id.unite}`] = { type: r._id.type, unite: r._id.unite, disponible: r.total };
  });
  deds.forEach((d) => {
    const key = `${d._id.type}||${d._id.unite}`;
    if (map[key]) map[key].disponible -= d.total;
    else map[key] = { type: d._id.type, unite: d._id.unite, disponible: -d.total };
  });

  return map;
};

/* ═══════════════════════════════════════
   MATIÈRES PREMIÈRES
═══════════════════════════════════════ */

// POST /api/workshop/matieres-premieres
export const enregistrerMP = async (req, res) => {
  try {
    const { typeMP, quantite, prixUnitaire, fournisseur, dateEntree } = req.body;
    if (!typeMP || quantite === undefined || prixUnitaire === undefined)
      return res.status(400).json({ message: "Les champs type, quantité et prix unitaire sont obligatoires." });

    const typeDoc = await TypeMP.findById(typeMP);
    if (!typeDoc)
      return res.status(400).json({ message: "Type de matière première introuvable." });

    const mp = await MatierePremiere.create({
      typeMP,
      quantite,
      unite: typeDoc.unite,
      prixUnitaire,
      fournisseur: fournisseur || "",
      dateEntree: dateEntree ? new Date(dateEntree) : new Date(),
      enregistrePar: req.user._id,
    });
    const populated = await mp.populate("typeMP", "nom seuilMin unite");
    res.status(201).json({ message: "Matière première enregistrée avec succès.", mp: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/matieres-premieres
export const getStockMP = async (req, res) => {
  try {
    const stock = await MatierePremiere.find()
      .populate("typeMP", "nom seuilMin unite")
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateEntree: -1 });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/matieres-premieres/disponible
export const getDisponibleMP = async (req, res) => {
  try {
    const map = await calcDisponible();
    res.json(Object.values(map));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   RECETTES
═══════════════════════════════════════ */

// GET /api/workshop/recettes
export const getRecettes = async (req, res) => {
  try {
    const recettes = await Recette.find()
      .populate("creerPar", "email nom prenom")
      .populate("modifierPar", "email nom prenom")
      .sort({ createdAt: -1 });
    res.json(recettes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/workshop/recettes
export const createRecette = async (req, res) => {
  try {
    const { nomJus, ingredients, seuilMinPF, seuilMinBoutique } = req.body;
    if (!nomJus || !ingredients || ingredients.length === 0)
      return res.status(400).json({ message: "Le nom du jus et au moins un ingrédient sont requis." });

    const exists = await Recette.findOne({ nomJus: nomJus.trim() });
    if (exists)
      return res.status(409).json({ message: `Une recette pour "${nomJus}" existe déjà.` });

    const recette = await Recette.create({
      nomJus: nomJus.trim(),
      ingredients,
      seuilMinPF:       seuilMinPF       !== undefined ? Number(seuilMinPF)       : 0,
      seuilMinBoutique: seuilMinBoutique !== undefined ? Number(seuilMinBoutique) : 0,
      creerPar: req.user._id,
    });

    const populated = await recette.populate("creerPar", "email nom prenom");
    res.status(201).json({ message: "Recette créée avec succès.", recette: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/recettes/:id
export const updateRecette = async (req, res) => {
  try {
    const { nomJus, ingredients, seuilMinPF, seuilMinBoutique } = req.body;
    if (!nomJus || !ingredients || ingredients.length === 0)
      return res.status(400).json({ message: "Le nom du jus et au moins un ingrédient sont requis." });

    const duplicate = await Recette.findOne({ nomJus: nomJus.trim(), _id: { $ne: req.params.id } });
    if (duplicate)
      return res.status(409).json({ message: `Une autre recette avec le nom "${nomJus}" existe déjà.` });

    const recette = await Recette.findByIdAndUpdate(
      req.params.id,
      {
        nomJus: nomJus.trim(),
        ingredients,
        seuilMinPF:       seuilMinPF       !== undefined ? Number(seuilMinPF)       : 0,
        seuilMinBoutique: seuilMinBoutique !== undefined ? Number(seuilMinBoutique) : 0,
        modifierPar: req.user._id,
        dateModification: new Date(),
      },
      { new: true }
    )
      .populate("creerPar", "email nom prenom")
      .populate("modifierPar", "email nom prenom");

    if (!recette) return res.status(404).json({ message: "Recette non trouvée." });
    res.json({ message: "Recette mise à jour avec succès.", recette });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/workshop/recettes/:id
export const deleteRecette = async (req, res) => {
  try {
    const recette = await Recette.findByIdAndDelete(req.params.id);
    if (!recette) return res.status(404).json({ message: "Recette non trouvée." });
    res.json({ message: "Recette supprimée avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   PRODUCTION / STOCK PF
═══════════════════════════════════════ */

// POST /api/workshop/productions
export const enregistrerProduction = async (req, res) => {
  try {
    const { nomJus, quantiteLitres } = req.body;
    if (!nomJus || !quantiteLitres || quantiteLitres <= 0)
      return res.status(400).json({ message: "Nom du jus et quantité (> 0) requis." });

    // 1. Trouver la recette
    const recette = await Recette.findOne({ nomJus: nomJus.trim() });
    if (!recette)
      return res.status(404).json({
        message: `Aucune recette trouvée pour "${nomJus}". Veuillez d'abord créer la recette dans "Gérer la Recette".`,
        code: "NO_RECIPE",
      });

    // 2. Calculer les déductions (recette est pour 1L, multiplier par quantiteLitres)
    const deductions = recette.ingredients.map((ing) => ({
      matiere: ing.matiere,
      quantite: parseFloat((ing.quantite * quantiteLitres).toFixed(4)),
      unite: ing.unite,
    }));

    // 3. Vérifier le stock disponible pour chaque ingrédient
    const disponibleMap = await calcDisponible();
    const insuffisants = [];
    for (const ded of deductions) {
      const key = `${ded.matiere}||${ded.unite}`;
      const dispo = disponibleMap[key]?.disponible ?? 0;
      if (dispo < ded.quantite) {
        insuffisants.push({
          matiere: ded.matiere,
          requis: ded.quantite,
          disponible: dispo,
          unite: ded.unite,
        });
      }
    }
    if (insuffisants.length > 0)
      return res.status(400).json({
        message: "Stock MP insuffisant pour cette production.",
        code: "INSUFFICIENT_STOCK",
        insuffisants,
      });

    // 4. Créer l'enregistrement de production
    const production = await ProductionPF.create({
      nomJus: nomJus.trim(),
      quantiteProduite: quantiteLitres,
      recette: recette._id,
      deductionsMP: deductions,
      enregistrePar: req.user._id,
      dateProduction: new Date(),
    });

    // 5. Vérifier les seuils après production et créer des notifications
    const stockApres = await calcDisponible();
    for (const ded of deductions) {
      const typeDoc = await TypeMP.findOne({ nom: ded.matiere });
      if (!typeDoc) continue;
      const key = `${ded.matiere}||${typeDoc.unite}`;
      const stockActuel = stockApres[key]?.disponible ?? 0;
      if (stockActuel <= typeDoc.seuilMin) {
        const existingNotif = await Notification.findOne({ typeMP: ded.matiere, categorie: "MP", luAtelier: false });
        if (!existingNotif) {
          await Notification.create({
            typeMP: ded.matiere,
            message: `Stock de "${ded.matiere}" en dessous du seuil minimum. Stock actuel : ${stockActuel} ${typeDoc.unite}, Seuil : ${typeDoc.seuilMin} ${typeDoc.unite}.`,
            niveauActuel: stockActuel,
            seuilMin: typeDoc.seuilMin,
            unite: typeDoc.unite,
          });
        }
      }
    }

    const populated = await production.populate("enregistrePar", "email nom prenom");
    res.status(201).json({
      message: `Production de ${quantiteLitres}L de "${nomJus}" enregistrée avec succès.`,
      production: populated,
      deductionsMP: deductions,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/productions
export const getStockPF = async (req, res) => {
  try {
    const productions = await ProductionPF.find()
      .populate("enregistrePar", "email nom prenom")
      .populate("recette", "nomJus")
      .sort({ dateProduction: -1 });

    // Résumé agrégé par jus
    const summaryMap = {};
    productions.forEach((p) => {
      if (!summaryMap[p.nomJus])
        summaryMap[p.nomJus] = { nomJus: p.nomJus, totalProduit: 0, nbProductions: 0 };
      summaryMap[p.nomJus].totalProduit += p.quantiteProduite;
      summaryMap[p.nomJus].nbProductions += 1;
    });

    res.json({ productions, summary: Object.values(summaryMap) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/stock/pf/resume
export const getStockPFResume = async (req, res) => {
  try {
    // Toutes les productions agrégées par jus
    const prods = await ProductionPF.aggregate([
      { $group: { _id: "$nomJus", totalProduit: { $sum: "$quantiteProduite" }, nbProductions: { $sum: 1 } } },
    ]);

    // Toutes les recettes (pour avoir les jus même sans production)
    const recettes = await Recette.find({}, "nomJus");

    const map = {};
    const [transferts, commandesReservees] = await Promise.all([
      TransfertBoutique.aggregate([
        { $group: { _id: "$nomJus", totalTransfere: { $sum: "$quantite" } } },
      ]),
      Commande.aggregate([
        { $match: { statut: { $in: ["livree", "prete"] } } },
        { $unwind: "$produits" },
        {
          $group: {
            _id: "$produits.nom",
            totalReserve: {
              $sum: {
                $multiply: [
                  "$produits.quantite",
                  { $cond: [{ $eq: ["$produits.volume", "1L"] }, 1, 0.5] },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const reserveMap = {};
    commandesReservees.forEach((c) => { reserveMap[c._id] = c.totalReserve; });

    recettes.forEach((r) => {
      map[r.nomJus] = { nomJus: r.nomJus, totalProduit: 0, nbProductions: 0, totalTransfere: 0, totalLivreeCommandes: 0, disponible: 0 };
    });
    prods.forEach((p) => {
      if (!map[p._id]) map[p._id] = { nomJus: p._id, totalProduit: 0, nbProductions: 0, totalTransfere: 0, totalLivreeCommandes: 0, disponible: 0 };
      map[p._id].totalProduit  = p.totalProduit;
      map[p._id].nbProductions = p.nbProductions;
      map[p._id].disponible    = p.totalProduit;
    });
    transferts.forEach((t) => {
      if (map[t._id]) {
        map[t._id].totalTransfere = t.totalTransfere;
        map[t._id].disponible     = map[t._id].totalProduit - t.totalTransfere;
      }
    });
    Object.keys(map).forEach((nomJus) => {
      const reserve = reserveMap[nomJus] || 0;
      map[nomJus].totalLivreeCommandes = reserve;
      map[nomJus].disponible           = map[nomJus].totalProduit - map[nomJus].totalTransfere - reserve;
    });

    res.json(Object.values(map));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/historique/pf/:nomJus
export const getHistoriquePF = async (req, res) => {
  try {
    const { nomJus } = req.params;

    const productions = await ProductionPF.find({ nomJus })
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateProduction: -1 });

    const transferts = await TransfertBoutique.find({ nomJus })
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateTransfert: -1 });

    res.json({ nomJus, productions, transferts });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/workshop/transferts
export const enregistrerTransfert = async (req, res) => {
  try {
    const { nomJus, quantite } = req.body;
    if (!nomJus || !quantite || quantite <= 0)
      return res.status(400).json({ message: "Nom du jus et quantité (> 0) requis." });

    // Calculer le stock PF disponible en atelier (production - transferts - commandes livrées)
    const disponible = await calcStockPFAtelier(nomJus);

    if (quantite > disponible)
      return res.status(400).json({
        message: `Stock PF insuffisant. Disponible en atelier : ${disponible} L, Demandé : ${quantite} L.`,
        disponible,
      });

    // Initialiser le doc StockBoutique AVANT de créer le transfert
    // (évite le double comptage : recalculerStockDepuisDB + $inc)
    await ajouterStockBoutique(nomJus, 0);

    const transfert = await TransfertBoutique.create({
      nomJus, quantite,
      enregistrePar: req.user._id,
      dateTransfert: new Date(),
    });

    // Vérifier le seuil PF après le transfert (disponible déjà calculé avec les commandes livrées)
    const stockApres = parseFloat((disponible - quantite).toFixed(2));
    const recette = await Recette.findOne({ nomJus });
    if (recette && recette.seuilMinPF > 0 && stockApres <= recette.seuilMinPF) {
      const existingNotif = await Notification.findOne({ typeMP: nomJus, categorie: "PF", luAtelier: false });
      if (!existingNotif) {
        await Notification.create({
          categorie: "PF",
          typeMP: nomJus,
          message: `Stock de PF "${nomJus}" en dessous du seuil minimum. Stock actuel : ${stockApres} L, Seuil : ${recette.seuilMinPF} L.`,
          niveauActuel: stockApres,
          seuilMin: recette.seuilMinPF,
          unite: "L",
        });
      }
    }

    // Incrémenter le stock boutique (doc déjà initialisé → pas de double comptage)
    await ajouterStockBoutique(nomJus, quantite);

    const populated = await transfert.populate("enregistrePar", "email nom prenom");
    res.status(201).json({ message: `Transfert de ${quantite}L de "${nomJus}" enregistré avec succès.`, transfert: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/transferts/disponible?nomJus=...
export const getDisponiblePF = async (req, res) => {
  try {
    const { nomJus } = req.query;
    if (!nomJus) return res.status(400).json({ message: "nomJus requis." });

    const disponible = await calcStockPFAtelier(nomJus);
    res.json({ nomJus, disponible });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/seller/stock/pf  (stock PF boutique)
// disponible lu depuis StockBoutique (source de vérité)
export const getStockPFBoutique = async (req, res) => {
  try {
    // Transferts : pour le détail historique (totalRecu, nbTransferts)
    const transferts = await TransfertBoutique.aggregate([
      { $group: { _id: "$nomJus", totalRecu: { $sum: "$quantite" }, nbTransferts: { $sum: 1 } } },
    ]);

    // Stock actuel depuis la collection dédiée
    const stockDocs = await StockBoutique.find();
    const stockMap = {};
    stockDocs.forEach((s) => { stockMap[s.nomJus] = s.stockActuel; });

    const result = transferts.map((t) => ({
      nomJus: t._id,
      totalRecu: t.totalRecu,
      nbTransferts: t.nbTransferts,
      disponible: Math.max(0, stockMap[t._id] ?? 0),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/seller/historique/pf/:nomJus
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

// GET /api/workshop/historique/mp/:type
export const getHistoriqueMP = async (req, res) => {
  try {
    const { type } = req.params;

    // Résoudre le nom en ObjectId
    const typeDoc = await TypeMP.findOne({ nom: type });
    if (!typeDoc)
      return res.status(404).json({ message: `Type "${type}" introuvable.` });

    // Toutes les entrées en stock pour ce type
    const additions = await MatierePremiere.find({ typeMP: typeDoc._id })
      .populate("typeMP", "nom seuilMin unite")
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateEntree: -1 });

    // Toutes les productions qui ont déduit ce type
    const productions = await ProductionPF.find({ "deductionsMP.matiere": type })
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateProduction: -1 });

    const reductions = productions.map((p) => {
      const ded = p.deductionsMP.find((d) => d.matiere === type);
      return {
        _id: p._id,
        date: p.dateProduction,
        quantite: ded.quantite,
        unite: ded.unite,
        nomJus: p.nomJus,
        quantiteProduite: p.quantiteProduite,
        enregistrePar: p.enregistrePar,
      };
    });

    res.json({ type, additions, reductions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   TYPES MP
═══════════════════════════════════════ */

// GET /api/workshop/types-mp
export const getTypesMP = async (req, res) => {
  try {
    const types = await TypeMP.find().sort({ nom: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/workshop/types-mp
export const createTypeMP = async (req, res) => {
  try {
    const { nom, seuilMin, unite } = req.body;
    if (!nom || seuilMin === undefined || !unite)
      return res.status(400).json({ message: "Nom, seuil minimum et unité sont obligatoires." });

    const exists = await TypeMP.findOne({ nom: nom.trim() });
    if (exists)
      return res.status(409).json({ message: `Le type "${nom}" existe déjà.` });

    const type = await TypeMP.create({ nom: nom.trim(), seuilMin: Number(seuilMin), unite });
    res.status(201).json({ message: "Type créé avec succès.", type });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/types-mp/:id
export const updateTypeMP = async (req, res) => {
  try {
    const { nom, seuilMin, unite } = req.body;
    if (!nom || seuilMin === undefined || !unite)
      return res.status(400).json({ message: "Nom, seuil minimum et unité sont obligatoires." });

    const exists = await TypeMP.findOne({ nom: nom.trim(), _id: { $ne: req.params.id } });
    if (exists)
      return res.status(409).json({ message: `Le type "${nom}" existe déjà.` });

    const type = await TypeMP.findByIdAndUpdate(
      req.params.id,
      { nom: nom.trim(), seuilMin: Number(seuilMin), unite },
      { new: true }
    );
    if (!type) return res.status(404).json({ message: "Type non trouvé." });
    res.json({ message: "Type modifié avec succès.", type });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/workshop/types-mp/:id
export const deleteTypeMP = async (req, res) => {
  try {
    const utilise = await MatierePremiere.exists({ typeMP: req.params.id });
    if (utilise)
      return res.status(400).json({ message: "Ce type est utilisé par des matières premières existantes. Impossible de le supprimer." });

    const type = await TypeMP.findByIdAndDelete(req.params.id);
    if (!type) return res.status(404).json({ message: "Type non trouvé." });
    res.json({ message: "Type supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════ */

// GET /api/workshop/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ categorie: { $ne: "COMMANDE" } }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/notifications/:id/lire
export const marquerNotificationLue = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { luAtelier: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée." });
    res.json({ message: "Notification marquée comme lue.", notif });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/notifications/lues
export const marquerToutesLues = async (req, res) => {
  try {
    await Notification.updateMany({ luAtelier: false }, { luAtelier: true });
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/manager/notifications
export const getNotificationsManager = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/manager/notifications/:id/lire
export const marquerNotificationLueManager = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { luManager: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée." });
    res.json({ message: "Notification marquée comme lue.", notif });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/manager/notifications/lues
export const marquerToutesLuesManager = async (req, res) => {
  try {
    await Notification.updateMany({ luManager: false }, { luManager: true });
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/recettes/preview-production?nomJus=...&quantite=...
export const previewProduction = async (req, res) => {
  try {
    const { nomJus, quantite } = req.query;
    if (!nomJus || !quantite) return res.status(400).json({ message: "nomJus et quantite requis." });

    const recette = await Recette.findOne({ nomJus: nomJus.trim() });
    if (!recette)
      return res.status(404).json({ message: `Aucune recette pour "${nomJus}".`, code: "NO_RECIPE" });

    const qty = parseFloat(quantite);
    const deductions = recette.ingredients.map((ing) => ({
      matiere: ing.matiere,
      quantite: parseFloat((ing.quantite * qty).toFixed(4)),
      unite: ing.unite,
    }));

    const disponibleMap = await calcDisponible();
    const result = deductions.map((d) => {
      const key = `${d.matiere}||${d.unite}`;
      const dispo = disponibleMap[key]?.disponible ?? 0;
      return { ...d, disponible: dispo, suffisant: dispo >= d.quantite };
    });

    res.json({ recette, deductions: result });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ── DASHBOARD KPIs (Manager) ──────────────────────────────────────────────────
import Vente from "../models/Vente.js";

export const getDashboardKPIs = async (req, res) => {
  try {
    const now       = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutHier = new Date(debutJour); debutHier.setDate(debutHier.getDate() - 1);
    const finHier   = new Date(debutJour);

    // Saison courante
    const mois = now.getMonth() + 1;
    let debutSaison;
    if ([3,4,5].includes(mois))        debutSaison = new Date(now.getFullYear(), 2, 1);
    else if ([6,7,8].includes(mois))   debutSaison = new Date(now.getFullYear(), 5, 1);
    else if ([9,10,11].includes(mois)) debutSaison = new Date(now.getFullYear(), 8, 1);
    else debutSaison = mois === 12
      ? new Date(now.getFullYear(), 11, 1)
      : new Date(now.getFullYear() - 1, 11, 1);

    const filtre = req.query.filtre || "mois";

    // KPI 1 — CA du jour + trend vs hier
    const [caJourRes] = await Vente.aggregate([
      { $match: { dateVente: { $gte: debutJour } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const [caHierRes] = await Vente.aggregate([
      { $match: { dateVente: { $gte: debutHier, $lt: finHier } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const caJour  = +(caJourRes?.total ?? 0).toFixed(2);
    const caHier  = +(caHierRes?.total ?? 0).toFixed(2);
    const trendJour = caHier > 0 ? +(((caJour - caHier) / caHier) * 100).toFixed(1) : null;

    // KPI 2 — CA du mois (ventes + commandes livrées)
    const [ventesMoisRes] = await Vente.aggregate([
      { $match: { dateVente: { $gte: debutMois } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const [commandesMoisRes] = await Commande.aggregate([
      { $match: { createdAt: { $gte: debutMois }, statut: "livree" } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const caMois = +((ventesMoisRes?.total ?? 0) + (commandesMoisRes?.total ?? 0)).toFixed(2);

    // KPI 3 — Commandes en attente
    const commandesEnAttente = await Commande.countDocuments({ statut: "en_attente" });

    // KPI 4 — Productions ce mois (litres)
    const [productionsMoisRes] = await ProductionPF.aggregate([
      { $match: { dateProduction: { $gte: debutMois } } },
      { $group: { _id: null, litres: { $sum: "$quantiteProduite" } } },
    ]);
    const productionsMois = +(productionsMoisRes?.litres ?? 0).toFixed(2);

    // KPI 5 — Transferts ce mois (litres)
    const [transfertsMoisRes] = await TransfertBoutique.aggregate([
      { $match: { dateTransfert: { $gte: debutMois } } },
      { $group: { _id: null, litres: { $sum: "$quantite" } } },
    ]);
    const transfertsMois = +(transfertsMoisRes?.litres ?? 0).toFixed(2);

    // KPI 6 — Panier moyen du mois
    const totalCA    = (ventesMoisRes?.total ?? 0) + (commandesMoisRes?.total ?? 0);
    const totalCount = (ventesMoisRes?.count ?? 0) + (commandesMoisRes?.count ?? 0);
    const panierMoyen = totalCount > 0 ? +(totalCA / totalCount).toFixed(2) : 0;

    // KPI 7 — Produit le plus vendu (filtre: jour/mois/saison)
    const debutFiltre = filtre === "jour" ? debutJour : filtre === "saison" ? debutSaison : debutMois;
    const [topProduitRes] = await Vente.aggregate([
      { $match: { dateVente: { $gte: debutFiltre } } },
      { $unwind: "$produits" },
      { $group: { _id: "$produits.nom", totalQte: { $sum: "$produits.quantite" } } },
      { $sort: { totalQte: -1 } },
      { $limit: 1 },
    ]);
    const topProduit = topProduitRes ? { nom: topProduitRes._id, qte: topProduitRes.totalQte } : null;

    // CHART 1 — CA 7 derniers jours (line chart)
    const debut7j = new Date(debutJour);
    debut7j.setDate(debut7j.getDate() - 6);
    const caParJour = await Vente.aggregate([
      { $match: { dateVente: { $gte: debut7j } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente" } }, total: { $sum: "$total" } } },
      { $sort: { _id: 1 } },
    ]);
    const caParJourMap = Object.fromEntries(caParJour.map((d) => [d._id, d.total]));
    const evolutionCA = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(debutJour);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      evolutionCA.push({ date: key, total: +(caParJourMap[key] ?? 0).toFixed(2) });
    }

    // CHART 2 — Top 5 produits vendus (bar horizontal)
    const topProduits = await Vente.aggregate([
      { $unwind: "$produits" },
      { $group: { _id: "$produits.nom", totalQte: { $sum: "$produits.quantite" } } },
      { $sort: { totalQte: -1 } },
      { $limit: 5 },
    ]);

    // CHART 3 — Stock MP (disponible vs seuilMin)
    const types    = await TypeMP.find({});
    const dispoMap = await calcDisponible();
    const stockMPChart = types.map((t) => {
      const keys  = Object.keys(dispoMap).filter((k) => k.startsWith(t.nom + "||"));
      const dispo = keys.reduce((s, k) => s + (dispoMap[k]?.disponible ?? 0), 0);
      return { nom: t.nom, disponible: +dispo.toFixed(2), seuil: t.seuilMin, unite: t.unite };
    });

    // CHART 4 — Stock boutique (stockActuel vs seuilMinBoutique)
    const recettes         = await Recette.find({}, "nomJus seuilMinBoutique");
    const stocksBoutique   = await StockBoutique.find({});
    const stockBoutiqueMap = Object.fromEntries(stocksBoutique.map((s) => [s.nomJus, s.stockActuel]));
    const stockBoutiqueChart = recettes.map((r) => ({
      nom: r.nomJus,
      disponible: +(stockBoutiqueMap[r.nomJus] ?? 0).toFixed(2),
      seuil: r.seuilMinBoutique ?? 0,
    }));

    // Alertes
    const alertesMP       = stockMPChart.filter((s) => s.disponible < s.seuil);
    const alertesBoutique = stockBoutiqueChart.filter((s) => s.disponible < s.seuil);

    res.json({
      caJour, caHier, trendJour,
      caMois,
      commandesEnAttente,
      productionsMois,
      transfertsMois,
      panierMoyen,
      topProduit, filtre,
      evolutionCA,
      topProduits,
      stockMPChart,
      stockBoutiqueChart,
      alertesMP,
      alertesBoutique,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
