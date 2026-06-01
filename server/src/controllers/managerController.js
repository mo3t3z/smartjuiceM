import Notification from "../models/Notification.js";
import Vente from "../models/Vente.js";
import Commande from "../models/Commande.js";
import ProductionPF from "../models/ProductionPF.js";
import TransfertBoutique from "../models/TransfertBoutique.js";

//f1 :NOTIFICATIONS
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
    const debutJour    = new Date(now.getFullYear(), now.getMonth(), now.getDate());//lyoum hte el nos lyl
    const debutMois    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);//ekhr 30 youm
    const debutSemaine = new Date(debutJour); debutSemaine.setDate(debutSemaine.getDate() - 6);//ajourd'hui -6jr

    const filtre      = req.query.filtre || "mois";//filtre par defaut
    const debutFiltre = filtre === "jour"     ? debutJour
                      : filtre === "semaine"  ? debutSemaine
                      : filtre === "annuelle" ? new Date(now.getFullYear() - 2, 0, 1)
                      : debutMois;

    
    const rangeVente   = { $gte: debutFiltre };//ale hsb date te3 vente
    const rangeCreated = { $gte: debutFiltre };//ale hsb commande w9tech tsn3et

    const MOIS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

    // ── KPI 1 — CA de la période ─────────────────────────────────────────────
    const [caPeriodeRes] = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $group: { _id: null, total: { $sum: "$total" } } },//tehsb total
    ]);
    const caPeriode = +(caPeriodeRes?.total ?? 0).toFixed(2);

    // ── KPI 2 — Panier moyen ────────────────────────────────────────────────
    const [ventesPeriodeRes] = await Vente.aggregate([//totale te3 vente w9deh men vente
      { $match: { dateVente: rangeVente } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const [commandesPeriodeRes] = await Commande.aggregate([//totale commande w 9deh men commande
      { $match: { createdAt: rangeCreated, statut: "livree" } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const totalVenteCA    = (ventesPeriodeRes?.total ?? 0) + (commandesPeriodeRes?.total ?? 0);
    const totalVenteCount = (ventesPeriodeRes?.count ?? 0) + (commandesPeriodeRes?.count ?? 0);
    const panierMoyen     = totalVenteCount > 0 ? +(totalVenteCA / totalVenteCount).toFixed(2) : 0;

    // ── KPI 3 — Volume produit ───────────────────────────────────────────────
    const [productionsRes] = await ProductionPF.aggregate([//9dech amel production 
      { $match: { dateProduction: rangeVente } },
      { $group: { _id: null, litres: { $sum: "$quantiteProduite" } } },
    ]);
    const productionsPeriode = +(productionsRes?.litres ?? 0).toFixed(2);

    // ── KPI 4 — Volume transféré ────────────────────────────────────────────
    const [transfertsRes] = await TransfertBoutique.aggregate([//9dech amel transfert
      { $match: { dateTransfert: rangeVente } },
      { $group: { _id: null, litres: { $sum: "$quantite" } } },
    ]);
    const transfertsPeriode = +(transfertsRes?.litres ?? 0).toFixed(2);

    // ── CHART 1 — Taux de confirmation ──────────────────────────────────────
    const commandesStatuts = await Commande.aggregate([//rje3 commande validé refuse prete livre mel en ligne
      { $match: { type: "en_ligne", statut: { $in: ["validee","refusee","prete","livree"] }, createdAt: rangeCreated } },
      { $group: { _id: "$statut", count: { $sum: 1 } } },//ehsb el kol statut totale
    ]);//9dech fme confirmee
    const confirmees    = commandesStatuts.filter((s) => ["validee","prete","livree"].includes(s._id)).reduce((a,b) => a + b.count, 0);
    //9dech fme refusee
    const refusees      = commandesStatuts.find((s) => s._id === "refusee")?.count ?? 0;
    //ehsb zouz mabdhhom baed a9sem confirmee al zouz mabdhhom w adhreb f 100
    const totalDecidees = confirmees + refusees;
    const tauxConfirmation = totalDecidees > 0 ? +(confirmees / totalDecidees * 100).toFixed(1) : 0;

    // ── CHART 2 — Top 5 produits ────────────────────────────────────────────
    const topProduits = await Vente.aggregate([
      { $match: { dateVente: rangeVente } },
      { $unwind: "$produits" },//transforme en object
      { $group: { _id: "$produits.nom", totalQte: { $sum: "$produits.quantite" } } },
      { $sort: { totalQte: -1 } },
      { $limit: 5  },
    ]);

    // ── CHART 5 — CA par date/mois ──────────────────────────────────────────
    let caParDate = [];
//filtre annuelle 
    if (filtre === "annuelle") {
      // Une courbe continue mois par mois depuis Jan (année-2) jusqu'au mois actuel
      const anneeDebut = now.getFullYear() - 2;//lamm hdha w amin ltely 
      const debut = new Date(anneeDebut, 0, 1);//ebde men janv
      const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const rawA  = await Vente.aggregate([
        { $match: { dateVente: { $gte: debut, $lt: fin } } },//filtre les ventes entre janv 2024 et aujourd'hui
        //rje3 date de vente fchhar el fleni mel amm el fleni w amel totale
        { $group: { _id: { annee: { $year: "$dateVente" }, mois: { $month: "$dateVente" } }, ca: { $sum: "$total" } } },
        { $sort: { "_id.annee": 1, "_id.mois": 1 } },
      ]);
      const caMap = Object.fromEntries(rawA.map((r) => [`${r._id.annee}-${r._id.mois}`, r.ca]));//transforme le tableau en dictionnaire
      const points = [];
      let y = anneeDebut, m = 1;
      const yFin = now.getFullYear(), mFin = now.getMonth() + 1;
      while (y < yFin || (y === yFin && m <= mFin)) {
        points.push({ label: `${MOIS_FR[m - 1]} ${y}`, ca: +((caMap[`${y}-${m}`] ?? 0).toFixed(2)) });
        m++; if (m > 12) { m = 1; y++; }//ekhdm boucle ale kol chhar men 2024 hte ltwa w ken chhar fet 12 hot 1
      }
      caParDate = points;
//jour   
    } else if (filtre === "jour") {
      const rawH = await Vente.aggregate([
        { $match: { dateVente: rangeVente } },
        //$hour extrait heure de 0 a 23
        { $group: { _id: { $hour: { date: "$dateVente", timezone: "Africa/Tunis" } }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      //dectionnaire yethat fyh lw9t w vente f w9t haka
      const caMap = Object.fromEntries(rawH.map((r) => [r._id, r.ca]));
      caParDate = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, "0")}h`,
        ca: +((caMap[h] ?? 0).toFixed(2)),
      }));
 //semaine     
    } else if (filtre === "semaine") {
      const rawD = await Vente.aggregate([
        { $match: { dateVente: rangeVente } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente", timezone: "Africa/Tunis" } }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      caParDate = rawD.map((r) => {
        const [, , day] = r._id.split("-");
        return { label: `${parseInt(day)}`, ca: +(r.ca.toFixed(2)) };
      });
 //mois     
    } else {
      const rawM = await Vente.aggregate([
        { $match: { dateVente: { $gte: debutMois } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente", timezone: "Africa/Tunis" } }, ca: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]);
      caParDate = rawM.map((r) => {
        const [, month, day] = r._id.split("-");
        return { label: `${parseInt(day)}/${parseInt(month)}`, ca: +(r.ca.toFixed(2)) };
      });
    }

    //  chart 6 - Évolution nb commandes livrées par date (physique + en ligne) ────────
    let commandesParDate = [];
    if (filtre === "annuelle") {
      const anneeDebut = now.getFullYear() - 2;
      const debut = new Date(anneeDebut, 0, 1);
      const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const raw = await Commande.aggregate([//filtre les commande livrée sur la periode
        { $match: { createdAt: { $gte: debut, $lt: fin }, statut: "livree" } },
        { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, type: "$type" }, count: { $sum: 1 } } },
      ]);
      const mapP = {}, mapE = {};
      raw.forEach(({ _id, count }) => {
        const k = `${_id.y}-${_id.m}`;//crée un cé simple "2024-1" par expl
        //séparation selon type
        if (_id.type === "en_ligne") mapE[k] = (mapE[k] ?? 0) + count;
        else                         mapP[k] = (mapP[k] ?? 0) + count;
      });
      let y = anneeDebut, m = 1;
      const yFin = now.getFullYear(), mFin = now.getMonth() + 1;//variable de parcour 
      while (y < yFin || (y === yFin && m <= mFin)) {
        const k = `${y}-${m}`;
        commandesParDate.push({ label: `${MOIS_FR[m - 1]} ${y}`, physiqueCount: mapP[k] ?? 0, enLigneCount: mapE[k] ?? 0 });
        m++; if (m > 12) { m = 1; y++; }
      }
    } else if (filtre === "jour") {
      const raw = await Commande.aggregate([
        { $match: { updatedAt: rangeCreated, statut: "livree" } },
        { $group: { _id: { h: { $hour: { date: "$updatedAt", timezone: "Africa/Tunis" } }, type: "$type" }, count: { $sum: 1 } } },
      ]);
      const mapP = {}, mapE = {};
      raw.forEach(({ _id, count }) => {
        if (_id.type === "en_ligne") mapE[_id.h] = (mapE[_id.h] ?? 0) + count;
        else                         mapP[_id.h] = (mapP[_id.h] ?? 0) + count;
      });
      commandesParDate = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, "0")}h`,
        physiqueCount: mapP[h] ?? 0,
        enLigneCount:  mapE[h] ?? 0,
      }));
    } else {
      const debutRange = filtre === "semaine" ? rangeCreated : { $gte: debutMois };
      const raw = await Commande.aggregate([
        { $match: { createdAt: debutRange, statut: "livree" } },
        { $group: { _id: { d: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Africa/Tunis" } }, type: "$type" }, count: { $sum: 1 } } },
        { $sort: { "_id.d": 1 } },
      ]);
      const allDays = [...new Set(raw.map((r) => r._id.d))].sort();
      const mapP = {}, mapE = {};
      raw.forEach(({ _id, count }) => {
        if (_id.type === "en_ligne") mapE[_id.d] = (mapE[_id.d] ?? 0) + count;
        else                         mapP[_id.d] = (mapP[_id.d] ?? 0) + count;
      });
      commandesParDate = allDays.map((d) => {
        const parts = d.split("-");
        const label = filtre === "semaine" ? `${parseInt(parts[2])}` : `${parseInt(parts[2])}/${parseInt(parts[1])}`;
        return { label, physiqueCount: mapP[d] ?? 0, enLigneCount: mapE[d] ?? 0 };
      });
    }

    // ── Top clients fidèles — mois + année (filtres indépendants) ───────────
    const debutAnnee = new Date(now.getFullYear(), 0, 1);
    const buildTopClients = async (dateDebut) => {
      const range = { $gte: dateDebut };
      const [onlineRaw, physicalRaw] = await Promise.all([
        Commande.aggregate([
          { $match: { createdAt: range, type: "en_ligne", statut: "livree" } },
          { $group: { _id: "$client", count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 15 },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          { $project: { nom: { $trim: { input: { $concat: [{ $ifNull: ["$user.prenom", ""] }, " ", { $ifNull: ["$user.nom", ""] }] } } }, count: 1 } },
        ]),
        Commande.aggregate([
          { $match: { createdAt: range, type: "physique", statut: "livree" } },
          { $group: { _id: "$nomClient", count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 15 },
        ]),
      ]);
      const map = {};
      onlineRaw.forEach(({ nom, count }) => {
        const key = (nom || "").toLowerCase().trim();
        if (key) map[key] = { nom, count };
      });
      physicalRaw.forEach(({ _id, count }) => {
        const key = (_id || "").toLowerCase().trim();
        if (!key) return;
        if (map[key]) map[key].count += count;
        else map[key] = { nom: _id, count };
      });
      return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
    };
    const [topClientsMois, topClientsAnnuelle] = await Promise.all([
      buildTopClients(debutMois),
      buildTopClients(debutAnnee),
    ]);

    // ── CA breakdown : ventes / commandes physiques / commandes en ligne ────
    const caCommandesBreakdown = await Commande.aggregate([
      { $match: { createdAt: rangeCreated, statut: "livree" } },
      { $group: { _id: "$type", total: { $sum: "$total" } } },
    ]);
    const caCommandesEnLigne  = +(caCommandesBreakdown.find((c) => c._id === "en_ligne")?.total  ?? 0).toFixed(2);
    const caCommandesPhysique = +(caCommandesBreakdown.filter((c) => c._id !== "en_ligne").reduce((s, c) => s + c.total, 0)).toFixed(2);

    res.json({
      caPeriode, panierMoyen, productionsPeriode, transfertsPeriode,
      tauxConfirmation, confirmees, refusees,
      topProduits,
      caParDate,
      caCommandesEnLigne, caCommandesPhysique,
      commandesParDate,
      topClientsMois, topClientsAnnuelle,
      filtre,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
