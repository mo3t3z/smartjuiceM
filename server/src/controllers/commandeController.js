import PDFDocument from "pdfkit";
import Commande from "../models/Commande.js";
import Vente from "../models/Vente.js";
import Product from "../models/Product.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import Recette from "../models/Recette.js";
import Notification from "../models/Notification.js";

/* ═══════════════════════════════════════════════════════════════
   HELPER : calcul du stock boutique disponible par nomJus
   Stock = transferts reçus - ventes directes - commandes livrées
═══════════════════════════════════════════════════════════════ */
export const calcStockBoutique = async (nomJus) => {
  // Total reçu par transferts depuis l'atelier
  const transAgg = await TransfertBoutique.aggregate([
    { $match: { nomJus } },
    { $group: { _id: null, total: { $sum: "$quantite" } } },
  ]);
  const totalRecu = transAgg[0]?.total || 0;

  // Total vendu (ventes directes) — quantite * volume en litres
  const ventesAgg = await Vente.aggregate([
    { $unwind: "$produits" },
    { $match: { "produits.nom": nomJus } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $multiply: [
              "$produits.quantite",
              {
                $cond: [
                  { $eq: ["$produits.volume", "1L"] },
                  1,
                  0.5,
                ],
              },
            ],
          },
        },
      },
    },
  ]);
  const totalVendu = ventesAgg[0]?.total || 0;

  // Total livré par commandes (en ligne + physiques livrées)
  const commandesAgg = await Commande.aggregate([
    { $match: { statut: "livree" } },
    { $unwind: "$produits" },
    { $match: { "produits.nom": nomJus } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $multiply: [
              "$produits.quantite",
              {
                $cond: [
                  { $eq: ["$produits.volume", "1L"] },
                  1,
                  0.5,
                ],
              },
            ],
          },
        },
      },
    },
  ]);
  const totalLivre = commandesAgg[0]?.total || 0;

  return totalRecu - totalVendu - totalLivre;
};

/* ═══════════════════════════════════════════════════════════════
   HELPER : vérifier les alertes stock boutique après une opération
═══════════════════════════════════════════════════════════════ */
const verifierAlerteBoutique = async (nomJus) => {
  const stockActuel = await calcStockBoutique(nomJus);
  const recette = await Recette.findOne({ nomJus });

  // On utilise seuilMinPF comme seuil boutique également
  if (recette && recette.seuilMinPF > 0 && stockActuel <= recette.seuilMinPF) {
    // Vérifier si une notification boutique non-lue existe déjà
    const existingNotif = await Notification.findOne({
      typeMP: nomJus,
      categorie: "BOUTIQUE",
      luManager: false,
    });

    if (!existingNotif) {
      await Notification.create({
        categorie: "BOUTIQUE",
        typeMP: nomJus,
        message: `Stock boutique de "${nomJus}" en dessous du seuil minimum. Stock actuel : ${stockActuel.toFixed(2)} L, Seuil : ${recette.seuilMinPF} L.`,
        niveauActuel: parseFloat(stockActuel.toFixed(2)),
        seuilMin: recette.seuilMinPF,
        unite: "L",
        luAtelier: false,
        luManager: false,
      });
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB19 — CRÉER UNE COMMANDE EN LIGNE (Client)
═══════════════════════════════════════════════════════════════ */
export const creerCommandeEnLigne = async (req, res) => {
  try {
    const { produits } = req.body;

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "Le panier est vide." });
    }

    // Récupérer les produits depuis la base de données pour vérification
    const produitsDetails = [];
    let total = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      }
      if (!produit.available) {
        return res.status(400).json({ message: `Produit non disponible: ${produit.name}` });
      }

      const ligneTotal = produit.price * item.quantite;
      total += ligneTotal;

      produitsDetails.push({
        produit: produit._id,
        nom: produit.name,
        volume: produit.volume,
        quantite: item.quantite,
        prixUnitaire: produit.price,
      });
    }

    const commande = await Commande.create({
      client: req.user._id,
      nomClient: `${req.user.prenom || ""} ${req.user.nom || ""}`.trim() || req.user.email,
      telephone: req.user.telephone || "",
      produits: produitsDetails,
      total: parseFloat(total.toFixed(2)),
      statut: "en_attente",
      type: "en_ligne",
    });

    const populated = await commande.populate("client", "email nom prenom telephone");
    res.status(201).json({ message: "Commande passée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB21 — MES COMMANDES (Client)
═══════════════════════════════════════════════════════════════ */
export const getMesCommandes = async (req, res) => {
  try {
    const commandes = await Commande.find({ client: req.user._id })
      .populate("produits.produit", "name image")
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB20 — COMMANDES EN ATTENTE (Gérant)
═══════════════════════════════════════════════════════════════ */
export const getCommandesEnAttente = async (req, res) => {
  try {
    const commandes = await Commande.find({ statut: "en_attente" })
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   TOUTES LES COMMANDES (Gérant — avec filtre optionnel par statut)
═══════════════════════════════════════════════════════════════ */
export const getToutesCommandes = async (req, res) => {
  try {
    const { statut, type } = req.query;
    const filtre = {};
    if (statut) filtre.statut = statut;
    if (type) filtre.type = type;

    const commandes = await Commande.find(filtre)
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB20 — VALIDER UNE COMMANDE (Gérant)
═══════════════════════════════════════════════════════════════ */
export const validerCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "en_attente") {
      return res.status(400).json({ message: "La commande n'est plus en attente." });
    }

    commande.statut = "validee";
    await commande.save();

    const populated = await commande.populate("client", "email nom prenom");
    res.json({ message: "Commande validée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB20 — REFUSER UNE COMMANDE (Gérant)
═══════════════════════════════════════════════════════════════ */
export const refuserCommande = async (req, res) => {
  try {
    const { commentaireRefus } = req.body;
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "en_attente") {
      return res.status(400).json({ message: "La commande n'est plus en attente." });
    }

    commande.statut = "refusee";
    commande.commentaireRefus = commentaireRefus || "";
    await commande.save();

    const populated = await commande.populate("client", "email nom prenom");
    res.json({ message: "Commande refusée.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB23 — COMMANDES CONFIRMÉES (Atelier)
═══════════════════════════════════════════════════════════════ */
export const getCommandesConfirmees = async (req, res) => {
  try {
    const commandes = await Commande.find({ statut: { $in: ["validee", "en_preparation"] } })
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   METTRE EN PRÉPARATION (Atelier)
═══════════════════════════════════════════════════════════════ */
export const mettreEnPreparation = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "validee") {
      return res.status(400).json({ message: "La commande doit être validée pour passer en préparation." });
    }

    commande.statut = "en_preparation";
    await commande.save();

    res.json({ message: "Commande mise en préparation.", commande });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MARQUER COMME LIVRÉE (Gérant ou Vendeur)
   → Déduit du stock boutique + vérifie alerte PB26
═══════════════════════════════════════════════════════════════ */
export const marquerLivree = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (!["validee", "en_preparation"].includes(commande.statut)) {
      return res.status(400).json({ message: "La commande doit être validée ou en préparation pour être livrée." });
    }

    commande.statut = "livree";
    await commande.save();

    // Vérifier les alertes boutique pour chaque produit de la commande (PB26)
    const nomsJus = [...new Set(commande.produits.map((p) => p.nom))];
    for (const nomJus of nomsJus) {
      await verifierAlerteBoutique(nomJus);
    }

    res.json({ message: "Commande marquée comme livrée.", commande });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB22 — CRÉER UNE COMMANDE PHYSIQUE (Vendeur)
═══════════════════════════════════════════════════════════════ */
export const creerCommandePhysique = async (req, res) => {
  try {
    const { nomClient, telephone, produits } = req.body;

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "La commande doit contenir au moins un produit." });
    }

    const produitsDetails = [];
    let total = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      }

      const ligneTotal = produit.price * item.quantite;
      total += ligneTotal;

      produitsDetails.push({
        produit: produit._id,
        nom: produit.name,
        volume: produit.volume,
        quantite: item.quantite,
        prixUnitaire: produit.price,
      });
    }

    const commande = await Commande.create({
      nomClient: nomClient || "Client boutique",
      telephone: telephone || "",
      produits: produitsDetails,
      total: parseFloat(total.toFixed(2)),
      statut: "en_attente",
      type: "physique",
      enregistrePar: req.user._id,
    });

    const populated = await commande.populate("enregistrePar", "email nom prenom");
    res.status(201).json({ message: "Commande physique enregistrée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB22 / PB24 — GÉNÉRER LE REÇU PDF D'UNE COMMANDE
═══════════════════════════════════════════════════════════════ */
export const genererRecuCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom");

    if (!commande) return res.status(404).json({ message: "Commande introuvable." });

    // Créer le document PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // En-têtes HTTP pour le téléchargement
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=recu-commande-${commande._id}.pdf`
    );
    doc.pipe(res);

    // ── En-tête du reçu ──────────────────────────────────────────
    doc.fontSize(24).font("Helvetica-Bold").text("SmartJuice", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Jus naturels frais et délicieux", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Informations de la commande ──────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text("REÇU DE COMMANDE");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`N° Commande  : ${commande._id}`);
    doc.text(`Date         : ${new Date(commande.createdAt).toLocaleString("fr-TN")}`);
    doc.text(`Type         : ${commande.type === "en_ligne" ? "Commande en ligne" : "Commande boutique"}`);
    doc.text(`Statut       : ${commande.statut.replace("_", " ").toUpperCase()}`);

    // ── Informations client ──────────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica-Bold").text("Client :");
    doc.fontSize(10).font("Helvetica");
    if (commande.client) {
      const c = commande.client;
      doc.text(`${c.prenom || ""} ${c.nom || ""}`.trim() || c.email);
      doc.text(`Email : ${c.email}`);
      if (c.telephone) doc.text(`Tél   : ${c.telephone}`);
    } else {
      doc.text(commande.nomClient || "Client boutique");
      if (commande.telephone) doc.text(`Tél : ${commande.telephone}`);
    }

    // ── Tableau des produits ─────────────────────────────────────
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica-Bold").text("Détail des produits :");
    doc.moveDown(0.3);

    // En-tête du tableau
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Produit", 50, doc.y, { width: 200 });
    doc.text("Volume", 255, doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text("Qté", 320, doc.y - doc.currentLineHeight(), { width: 50 });
    doc.text("Prix unit.", 375, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.text("Sous-total", 460, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Lignes produits
    doc.font("Helvetica").fontSize(10);
    for (const p of commande.produits) {
      const sousTotal = (p.quantite * p.prixUnitaire).toFixed(2);
      const y = doc.y;
      doc.text(p.nom, 50, y, { width: 200 });
      doc.text(p.volume, 255, y, { width: 60 });
      doc.text(`${p.quantite}`, 320, y, { width: 50 });
      doc.text(`${p.prixUnitaire.toFixed(2)} DT`, 375, y, { width: 80 });
      doc.text(`${sousTotal} DT`, 460, y, { width: 80 });
      doc.moveDown(0.5);
    }

    // ── Total ───────────────────────────────────────────────────
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL : ${commande.total.toFixed(2)} DT`, { align: "right" });

    // ── Pied de page ─────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(9).font("Helvetica").fillColor("gray")
      .text("Merci de votre confiance ! — SmartJuice © 2026", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la génération du reçu", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB25 — DASHBOARD VENTES ET COMMANDES (Gérant)
═══════════════════════════════════════════════════════════════ */
export const getDashboardVentes = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const debutSemaine = new Date(debutJour);
    debutSemaine.setDate(debutJour.getDate() - debutJour.getDay());
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

    // ── Statistiques des ventes directes ────────────────────────
    const [ventesJour, ventesSemaine, ventesMois, ventesTotal] = await Promise.all([
      Vente.aggregate([
        { $match: { dateVente: { $gte: debutJour } } },
        { $group: { _id: null, count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
      ]),
      Vente.aggregate([
        { $match: { dateVente: { $gte: debutSemaine } } },
        { $group: { _id: null, count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
      ]),
      Vente.aggregate([
        { $match: { dateVente: { $gte: debutMois } } },
        { $group: { _id: null, count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
      ]),
      Vente.aggregate([
        { $group: { _id: null, count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
      ]),
    ]);

    // ── Statistiques des commandes par statut ────────────────────
    const commandesParStatut = await Commande.aggregate([
      { $group: { _id: "$statut", count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
    ]);

    // ── Commandes du mois ────────────────────────────────────────
    const commandesMois = await Commande.aggregate([
      { $match: { createdAt: { $gte: debutMois } } },
      { $group: { _id: null, count: { $sum: 1 }, chiffre: { $sum: "$total" } } },
    ]);

    // ── Produits les plus vendus (ventes directes) ───────────────
    const produitsTop = await Vente.aggregate([
      { $unwind: "$produits" },
      {
        $group: {
          _id: "$produits.nom",
          totalQte: { $sum: "$produits.quantite" },
          totalCA: { $sum: { $multiply: ["$produits.quantite", "$produits.prixUnitaire"] } },
        },
      },
      { $sort: { totalQte: -1 } },
      { $limit: 5 },
    ]);

    // ── Évolution journalière des ventes (30 derniers jours) ─────
    const trente = new Date();
    trente.setDate(trente.getDate() - 30);
    const evolutionJournaliere = await Vente.aggregate([
      { $match: { dateVente: { $gte: trente } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente" } },
          count: { $sum: 1 },
          chiffre: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      ventes: {
        jour: ventesJour[0] || { count: 0, chiffre: 0 },
        semaine: ventesSemaine[0] || { count: 0, chiffre: 0 },
        mois: ventesMois[0] || { count: 0, chiffre: 0 },
        total: ventesTotal[0] || { count: 0, chiffre: 0 },
      },
      commandes: {
        parStatut: commandesParStatut,
        mois: commandesMois[0] || { count: 0, chiffre: 0 },
      },
      produitsTop,
      evolutionJournaliere,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
