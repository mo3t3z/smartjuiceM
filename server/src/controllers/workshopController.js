import MatierePremiere from "../models/MatierePremiere.js";
import Recette from "../models/Recette.js";
import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import TypeMP from "../models/TypeMP.js";
import Notification from "../models/Notification.js";

/* ═══════════════════════════════════════
   HELPER — stock disponible par type+unité
═══════════════════════════════════════ */
const calcDisponible = async () => {
  const regs = await MatierePremiere.aggregate([
    { $group: { _id: { type: "$type", unite: "$unite" }, total: { $sum: "$quantite" } } },
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
    const { type, quantite, unite, prixUnitaire, fournisseur, dateEntree } = req.body;
    if (!type || quantite === undefined || !unite || prixUnitaire === undefined)
      return res.status(400).json({ message: "Les champs type, quantité, unité et prix unitaire sont obligatoires." });

    const mp = await MatierePremiere.create({
      type, quantite, unite, prixUnitaire,
      fournisseur: fournisseur || "",
      dateEntree: dateEntree ? new Date(dateEntree) : new Date(),
      enregistrePar: req.user._id,
    });
    res.status(201).json({ message: "Matière première enregistrée avec succès.", mp });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/workshop/matieres-premieres
export const getStockMP = async (req, res) => {
  try {
    const stock = await MatierePremiere.find()
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
    const { nomJus, ingredients } = req.body;
    if (!nomJus || !ingredients || ingredients.length === 0)
      return res.status(400).json({ message: "Le nom du jus et au moins un ingrédient sont requis." });

    const exists = await Recette.findOne({ nomJus: nomJus.trim() });
    if (exists)
      return res.status(409).json({ message: `Une recette pour "${nomJus}" existe déjà.` });

    const recette = await Recette.create({
      nomJus: nomJus.trim(),
      ingredients,
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
    const { nomJus, ingredients } = req.body;
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
        const existingNotif = await Notification.findOne({ typeMP: ded.matiere, lu: false });
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
    const transferts = await TransfertBoutique.aggregate([
      { $group: { _id: "$nomJus", totalTransfere: { $sum: "$quantite" } } },
    ]);

    recettes.forEach((r) => {
      map[r.nomJus] = { nomJus: r.nomJus, totalProduit: 0, nbProductions: 0, totalTransfere: 0, disponible: 0 };
    });
    prods.forEach((p) => {
      if (!map[p._id]) map[p._id] = { nomJus: p._id, totalProduit: 0, nbProductions: 0, totalTransfere: 0, disponible: 0 };
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

    // Calculer le stock PF disponible en atelier
    const prodAgg = await ProductionPF.aggregate([
      { $match: { nomJus } }, { $group: { _id: null, total: { $sum: "$quantiteProduite" } } },
    ]);
    const transAgg = await TransfertBoutique.aggregate([
      { $match: { nomJus } }, { $group: { _id: null, total: { $sum: "$quantite" } } },
    ]);
    const disponible = (prodAgg[0]?.total || 0) - (transAgg[0]?.total || 0);

    if (quantite > disponible)
      return res.status(400).json({
        message: `Stock PF insuffisant. Disponible en atelier : ${disponible} L, Demandé : ${quantite} L.`,
        disponible,
      });

    const transfert = await TransfertBoutique.create({
      nomJus, quantite,
      enregistrePar: req.user._id,
      dateTransfert: new Date(),
    });
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

    const prodAgg = await ProductionPF.aggregate([
      { $match: { nomJus } }, { $group: { _id: null, total: { $sum: "$quantiteProduite" } } },
    ]);
    const transAgg = await TransfertBoutique.aggregate([
      { $match: { nomJus } }, { $group: { _id: null, total: { $sum: "$quantite" } } },
    ]);
    const disponible = (prodAgg[0]?.total || 0) - (transAgg[0]?.total || 0);
    res.json({ nomJus, disponible });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/seller/stock/pf  (stock PF boutique)
export const getStockPFBoutique = async (req, res) => {
  try {
    const agg = await TransfertBoutique.aggregate([
      { $group: { _id: "$nomJus", totalRecu: { $sum: "$quantite" }, nbTransferts: { $sum: 1 } } },
    ]);
    const result = agg.map((t) => ({
      nomJus: t._id, totalRecu: t.totalRecu,
      nbTransferts: t.nbTransferts, disponible: t.totalRecu,
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

    // Toutes les entrées en stock pour ce type
    const additions = await MatierePremiere.find({ type })
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

// DELETE /api/workshop/types-mp/:id
export const deleteTypeMP = async (req, res) => {
  try {
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
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/notifications/:id/lire
export const marquerNotificationLue = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { lu: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée." });
    res.json({ message: "Notification marquée comme lue.", notif });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/workshop/notifications/lues
export const marquerToutesLues = async (req, res) => {
  try {
    await Notification.updateMany({ lu: false }, { lu: true });
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
