import Notification from "../models/Notification.js";
import TypeMP from "../models/TypeMP.js";
import Recette from "../models/Recette.js";
import StockBoutique from "../models/StockBoutique.js";
import Vente from "../models/Vente.js";
import Commande from "../models/Commande.js";
import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";
import { calcDisponible } from "./workshopController.js";

/* ═══════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════ */

export const getNotificationsManager = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const marquerNotificationLueManager = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { luManager: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée." });
    res.json({ message: "Notification marquée comme lue.", notif });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const marquerToutesLuesManager = async (req, res) => {
  try {
    await Notification.updateMany({ luManager: false }, { luManager: true });
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════
   DASHBOARD KPIs
═══════════════════════════════════════ */

export const getDashboardKPIs = async (req, res) => {
  try {
    const now          = new Date();
    const debutJour    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutMois    = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutSemaine = new Date(debutJour); debutSemaine.setDate(debutSemaine.getDate() - 6);

    const filtre      = req.query.filtre || "mois";
    const debutFiltre = filtre === "jour"     ? debutJour
                      : filtre === "semaine"  ? debutSemaine
                      : filtre === "annuelle" ? new Date(now.getFullYear() - 2, 0, 1)
                      : debutMois;

    // helper : plage de dates (pas de borne haute sauf pour annuelle globale)
    const rangeVente   = { $gte: debutFiltre };
    const rangeCreated = { $gte: debutFiltre };

    const MOIS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

    // ── KPI 1 — CA de la période ─────────────────────────────────────────────
    const [caPeriodeRes] = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const caPeriode = +(caPeriodeRes?.total ?? 0).toFixed(2);

    // ── KPI 2 — Panier moyen ────────────────────────────────────────────────
    const [ventesPeriodeRes] = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const [commandesPeriodeRes] = await Commande.aggregate([
      { $match: { createdAt: rangeCreated, statut: "livree" } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const totalVenteCA    = (ventesPeriodeRes?.total ?? 0) + (commandesPeriodeRes?.total ?? 0);
    const totalVenteCount = (ventesPeriodeRes?.count ?? 0) + (commandesPeriodeRes?.count ?? 0);
    const panierMoyen     = totalVenteCount > 0 ? +(totalVenteCA / totalVenteCount).toFixed(2) : 0;

    // ── KPI 3 — Volume produit ───────────────────────────────────────────────
    const [productionsRes] = await ProductionPF.aggregate([
      { $match: { dateProduction: rangeVente } },
      { $group: { _id: null, litres: { $sum: "$quantiteProduite" } } },
    ]);
    const productionsPeriode = +(productionsRes?.litres ?? 0).toFixed(2);

    // ── KPI 4 — Volume transféré ────────────────────────────────────────────
    const [transfertsRes] = await TransfertBoutique.aggregate([
      { $match: { dateTransfert: rangeVente } },
      { $group: { _id: null, litres: { $sum: "$quantite" } } },
    ]);
    const transfertsPeriode = +(transfertsRes?.litres ?? 0).toFixed(2);

    // ── Produit le plus vendu ────────────────────────────────────────────────
    const [topProduitRes] = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $unwind: "$produits" },
      { $group: { _id: "$produits.nom", totalQte: { $sum: "$produits.quantite" } } },
      { $sort: { totalQte: -1 } },
      { $limit: 1 },
    ]);
    const topProduit = topProduitRes ? { nom: topProduitRes._id, qte: topProduitRes.totalQte } : null;

    // ── CHART 1 — Taux de confirmation ──────────────────────────────────────
    const commandesStatuts = await Commande.aggregate([
      { $match: { type: "en_ligne", statut: { $in: ["validee","refusee","prete","livree"] }, createdAt: rangeCreated } },
      { $group: { _id: "$statut", count: { $sum: 1 } } },
    ]);
    const confirmees    = commandesStatuts.filter((s) => ["validee","prete","livree"].includes(s._id)).reduce((a,b) => a + b.count, 0);
    const refusees      = commandesStatuts.find((s) => s._id === "refusee")?.count ?? 0;
    const totalDecidees = confirmees + refusees;
    const tauxConfirmation = totalDecidees > 0 ? +(confirmees / totalDecidees * 100).toFixed(1) : 0;

    // ── CHART 2 — Top 5 produits ────────────────────────────────────────────
    const topProduits = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $unwind: "$produits" },
      { $group: { _id: "$produits.nom", totalQte: { $sum: "$produits.quantite" } } },
      { $sort: { totalQte: -1 } },
      { $limit: 5 },
    ]);

    // ── CHART 5 — CA par date/mois ──────────────────────────────────────────
    let caParDate = [];
    if (filtre === "annuelle") {
      // Une courbe continue mois par mois depuis Jan (année-2) jusqu'au mois actuel
      const anneeDebut = now.getFullYear() - 2;
      const debut = new Date(anneeDebut, 0, 1);
      const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const rawA  = await Vente.aggregate([
        { $match: { dateVente: { $gte: debut, $lt: fin } } },
        { $group: { _id: { annee: { $year: "$dateVente" }, mois: { $month: "$dateVente" } }, ca: { $sum: "$total" } } },
        { $sort: { "_id.annee": 1, "_id.mois": 1 } },
      ]);
      const caMap = Object.fromEntries(rawA.map((r) => [`${r._id.annee}-${r._id.mois}`, r.ca]));
      const points = [];
      let y = anneeDebut, m = 1;
      const yFin = now.getFullYear(), mFin = now.getMonth() + 1;
      while (y < yFin || (y === yFin && m <= mFin)) {
        points.push({ label: `${MOIS_FR[m - 1]} ${y}`, ca: +((caMap[`${y}-${m}`] ?? 0).toFixed(2)) });
        m++; if (m > 12) { m = 1; y++; }
      }
      caParDate = points;
    } else if (filtre === "jour") {
      const rawH = await Vente.aggregate([
        { $match: { dateVente: rangeVente } },
        { $group: { _id: { $hour: "$dateVente" }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      const caMap = Object.fromEntries(rawH.map((r) => [r._id, r.ca]));
      caParDate = Array.from({ length: 11 }, (_, i) => ({
        label: `${String(i + 8).padStart(2, "0")}h`,
        ca: +((caMap[i + 8] ?? 0).toFixed(2)),
      }));
    } else if (filtre === "semaine") {
      const rawD = await Vente.aggregate([
        { $match: { dateVente: rangeVente } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente" } }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      caParDate = rawD.map((r) => {
        const [, , day] = r._id.split("-");
        return { label: `${parseInt(day)}`, ca: +(r.ca.toFixed(2)) };
      });
    } else {
      const rawM = await Vente.aggregate([
        { $match: { dateVente: { $gte: debutMois } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente" } }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      caParDate = rawM.map((r) => {
        const [, month, day] = r._id.split("-");
        return { label: `${parseInt(day)}/${parseInt(month)}`, ca: +(r.ca.toFixed(2)) };
      });
    }

    // ── CHART 3 & 4 — Stocks (temps réel) ───────────────────────────────────
    const types    = await TypeMP.find({});
    const dispoMap = await calcDisponible();
    const stockMPChart = types.map((t) => {
      const keys  = Object.keys(dispoMap).filter((k) => k.startsWith(t.nom + "||"));
      const dispo = keys.reduce((s, k) => s + (dispoMap[k]?.disponible ?? 0), 0);
      return { nom: t.nom, disponible: +dispo.toFixed(2), seuil: t.seuilMin, unite: t.unite };
    });
    const recettes         = await Recette.find({}, "nomJus seuilMinBoutique");
    const stocksBoutique   = await StockBoutique.find({});
    const stockBoutiqueMap = Object.fromEntries(stocksBoutique.map((s) => [s.nomJus, s.stockActuel]));
    const stockBoutiqueChart = recettes.map((r) => ({
      nom: r.nomJus,
      disponible: +(stockBoutiqueMap[r.nomJus] ?? 0).toFixed(2),
      seuil: r.seuilMinBoutique ?? 0,
    }));

    // ── Alertes ──────────────────────────────────────────────────────────────
    const alertesMP          = stockMPChart.filter((s) => s.disponible <= s.seuil);
    const alertesBoutique    = stockBoutiqueChart.filter((s) => s.disponible <= s.seuil);
    const commandesEnAttente = await Commande.countDocuments({ statut: "en_attente" });

    res.json({
      caPeriode, panierMoyen, productionsPeriode, transfertsPeriode,
      topProduit,
      tauxConfirmation, confirmees, refusees,
      topProduits,
      stockMPChart, stockBoutiqueChart,
      alertesMP, alertesBoutique, commandesEnAttente,
      caParDate,
      filtre,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
