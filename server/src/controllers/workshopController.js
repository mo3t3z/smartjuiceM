import MatierePremiere from "../models/MatierePremiere.js";
import Recette from "../models/Recette.js";
import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import TypeMP from "../models/TypeMP.js";
import Notification from "../models/Notification.js";
import Commande from "../models/Commande.js";
import { ajouterStockBoutique } from "../services/stockBoutiqueService.js";
import { calcStockPFAtelier } from "../services/stockPFService.js";
//f1 caclul stock mp dispo/f2 enregistrer de mp /f3:affiche la mp dispo dans stock mp/f4:affiche la liste de tous les recette dans gerer la recette
//f5 créer une recette dans gerer recette /f6 update une recette / f7 supprimer une recette
//f8: enregistrer une production / f9 : function qui affiche la quantité de pf dans l'atelier
// f10:transférer les jus du atelier ver boutique / f11: function ely kif tjy tamel transfert tdhhrlk chandek pf
//f12 :drop des type fi enrgistrer mp, nouvelle recette ajout des ingrediants,affiche list des types
//f13 :creer type mp / f14 : update type mp / f15 : delete type mp/ f16 :fonctions trje3 les notifications lkol te3 atelier / 
// f17 : el atelier ychouf el  notification w ya3mel lue / f18 : marquer toutes les notifications comme lues
//19: responsable all verification ely tsir louta baed me tkteb 9deh theb tsne3 bdhbt

//f1 calcul stock mp dispo 
export const calcDisponible = async () => {
  const regs = await MatierePremiere.aggregate([//pipline lel qté ely dkhlt mel livraisonet kol
    {
/*join*/$lookup: {
        from: "typemps",
        localField: "typeMP",
        foreignField: "_id",
        as: "typeMPDoc",
      },
    },//lookup retourne tableau et unwind le transforme en objet
    { $unwind: "$typeMPDoc" },
    {
      $group: {
        _id: { type: "$typeMPDoc.nom", unite: "$unite" },
        total: { $sum: "$quantite" },
      },
    },
  ]);

  const deds = await ProductionPF.aggregate([//pipline lel qté ely khrjet mel productionet lkol
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
  });//object remplis avec tous livraisons 
  deds.forEach((d) => {
    const key = `${d._id.type}||${d._id.unite}`;
    if (map[key]) map[key].disponible -= d.total;//si type existe dans livraison nehiw menou cons
    else map[key] = { type: d._id.type, unite: d._id.unite, disponible: -d.total };//type n'existe pas dans livraison
  });

  return map;
};

/* ═══════════════════════════════════════
   MATIÈRES PREMIÈRES
═══════════════════════════════════════ */

// f2 enregistrer de mp
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

//f3:affiche la mp dispo dans stock mp 
export const getDisponibleMP = async (req, res) => {
  try {
    const map = await calcDisponible();
    res.json(Object.values(map));///convertit l'objet en tableau pour front
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   RECETTES
═══════════════════════════════════════ */

//f4 affiche la liste de tous les recette dans gerer la recette
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

// f5 : ajouter une recette  dans gerer la recette
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

// f6 update une recette  dans gerer la recette
export const updateRecette = async (req, res) => {
  try {
    const { nomJus, ingredients, seuilMinPF, seuilMinBoutique } = req.body;
    if (!nomJus || !ingredients || ingredients.length === 0)
      return res.status(400).json({ message: "Le nom du jus et au moins un ingrédient sont requis." });
//ces trois next ligne sert si on veux modifier jus citron par expl et on selectionne un nom de jus existe comme jus orange
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

// f7 : supprimer une recette  dans gerer la recette
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

// f8: enregistrer une production 
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

    // 2. Calculer les déductions (9dech bch tekel (requis)
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
      const dispo = disponibleMap[key]?.disponible ?? 0;//cas hedhi ykoun type mewjoud ema stock 0
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
        //ken stock melolou e9al m seuil w deja bathin notif non lue nawdouch okhra
        const existingNotif = await Notification.findOne({ typeMP: ded.matiere, categorie: "MP", luAtelier: false });
        if (!existingNotif) {//ken msh mewjouda nen3ouha
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
    //ekhr etape ely chtjiblek ye msg erreur ye succée 
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


// f9 : function qui affiche la quantité de pf dans l'atelier
export const getStockPFResume = async (req, res) => {
  try {
    // 7esba te3 total production et total pdt ely todhher f stock pf atelier f carte louta
    const prods = await ProductionPF.aggregate([
      { $group: { _id: "$nomJus", totalProduit: { $sum: "$quantiteProduite" }, nbProductions: { $sum: 1 } } },
    ]);

    // Toutes les recettes (pour avoir les jus même sans production)
    const recettes = await Recette.find({}, "nomJus");

    const map = {};
    const [transferts, commandesReservees] = await Promise.all([
      TransfertBoutique.aggregate([//total pf transféré 
        { $group: { _id: "$nomJus", totalTransfere: { $sum: "$quantite" } } },
      ]),
      Commande.aggregate([//regroupment tous comnde livré w préte
        { $match: { statut: { $in: ["livree", "prete"] } } },
        { $unwind: "$produits" },
        {
          $group: {
            _id: "$produits.nom",
            totalReserve: { $sum: "$produits.quantite" },
          },
        },
      ]),
    ]);

    const reserveMap = {};
    commandesReservees.forEach((c) => { reserveMap[c._id] = c.totalReserve; });//transorme le resultat de aggragate en objet

    recettes.forEach((r) => {//initialise tous les jus qui une recette a 0
      map[r.nomJus] = { nomJus: r.nomJus, totalProduit: 0, nbProductions: 0, totalTransfere: 0, totalLivreeCommandes: 0, disponible: 0 };
    });
    prods.forEach((p) => {
      if (!map[p._id]) map[p._id] = { nomJus: p._id, totalProduit: 0, nbProductions: 0, totalTransfere: 0, totalLivreeCommandes: 0, disponible: 0 };
      map[p._id].totalProduit  = p.totalProduit;
      map[p._id].nbProductions = p.nbProductions;
      map[p._id].disponible    = p.totalProduit;
    });//kif jus ybde anne pdt sn3in menou w fskhne recetou yo9ed comme meme afficher f stock
    transferts.forEach((t) => {
      if (map[t._id]) {
        map[t._id].totalTransfere = t.totalTransfere;
      }
    });
    Object.keys(map).forEach((nomJus) => {//c bon ehsb chfmeee
      const reserve = reserveMap[nomJus] || 0;
      map[nomJus].totalLivreeCommandes = reserve;
      map[nomJus].disponible           = map[nomJus].totalProduit - map[nomJus].totalTransfere - reserve;
    });

    res.json(Object.values(map));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};


// f10:transférer les jus du atelier ver boutique 
export const enregistrerTransfert = async (req, res) => {
  try {
    const { nomJus, quantite } = req.body;
    if (!nomJus || !quantite || quantite <= 0)
      return res.status(400).json({ message: "Nom du jus et quantité (> 0) requis." });

    // Calculer le stock PF disponible mewjouda f stockPFservice.js
    const disponible = await calcStockPFAtelier(nomJus);

    if (quantite > disponible)
      return res.status(400).json({
        message: `Stock PF insuffisant. Disponible en atelier : ${disponible} L, Demandé : ${quantite} L.`,
        disponible,
      });

    // Initialiser le doc StockBoutique AVANT de créer le transfert
    // (évite le double comptage : recalculerStockDepuisDB + $inc)
    await ajouterStockBoutique(nomJus, 0);

    const transfert = await TransfertBoutique.create({//faire le transfert
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

//f11: function ely kif tjy tamel transfert tdhaharlk chandek pf
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



/* ═══════════════════════════════════════
   TYPES MP
═══════════════════════════════════════ */

//f12 :drop des type enrgistrer mp, nouvelle recette ajout des ingrediants,affiche list des types  
export const getTypesMP = async (req, res) => {
  try {
    const types = await TypeMP.find().sort({ nom: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f13 :creer type mp
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

// f14 : update type mp
export const updateTypeMP = async (req, res) => {
  try {
    const { nom, seuilMin, unite } = req.body;
    if (!nom || seuilMin === undefined || !unite)
      return res.status(400).json({ message: "Nom, seuil minimum et unité sont obligatoires." });

    const exists = await TypeMP.findOne({ nom: nom.trim(), _id: { $ne: req.params.id } });
    if (exists)
      return res.status(409).json({ message: `Le type "${nom}" existe déjà.` });

    const type = await TypeMP.findByIdAndUpdate(
      req.params.id,//id mta3 type ely bech nmodifiwh
      { nom: nom.trim(), seuilMin: Number(seuilMin), unite },
      { new: true }
    );
    if (!type) return res.status(404).json({ message: "Type non trouvé." });
    res.json({ message: "Type modifié avec succès.", type });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// f15 : delete type mp
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

// f16 :fonctions trje3 les notifications lkol te3 atelier 
export const getNotifications = async (req, res) => {
  try {//recupérer tous les notifications sauf celles de catégorie "COMMANDE" 
    const notifications = await Notification.find({ categorie: { $ne: "COMMANDE" } }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// f17 : el atelier ychouf el  notification w ya3mel lue
export const marquerNotificationLue = async (req, res) => {
  try {//yel9a notif bel id mte3ha w yamel aleha update ety hyia el lue te3 atelier
    const notif = await Notification.findByIdAndUpdate(req.params.id, { luAtelier: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée." });
    res.json({ message: "Notification marquée comme lue.", notif });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// f18 : marquer toutes les notifications comme lues
export const marquerToutesLues = async (req, res) => {
  try {
    await Notification.updateMany({ luAtelier: false }, { luAtelier: true });
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};


// f19: responsable all verification ely tsir louta baed me tkteb 9deh theb tsne3 bdhbt
export const previewProduction = async (req, res) => {
  try {
    const { nomJus, quantite } = req.query;
    if (!nomJus || !quantite) return res.status(400).json({ message: "nomJus et quantite requis." });

    const recette = await Recette.findOne({ nomJus: nomJus.trim() });
    if (!recette)
      return res.status(404).json({ message: `Aucune recette pour "${nomJus}".`, code: "NO_RECIPE" });
//calculer les déductions pour la quantité demandée
    const qty = parseFloat(quantite);
    const deductions = recette.ingredients.map((ing) => ({
      matiere: ing.matiere,
      quantite: parseFloat((ing.quantite * qty).toFixed(4)),
      unite: ing.unite,
    }));
//calculer le stock disponible pour chaque ingrédient et vérifier si c'est suffisant
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

