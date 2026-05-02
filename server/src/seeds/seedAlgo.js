/**
 * seedAlgo.js — Smart Juice
 * Simulation jour par jour (Jan 2024 → aujourd'hui) — boutique MAX 30 L/j :
 *   Matin  : production à la demande (si stock boutique < 2j de vente) batch 8-14 L
 *   Après-m: transfert atelier → boutique
 *   Journée: ventes boutique (saisonnalité, check stock, q=1-2 L)
 *   1/3 j  : commande en ligne
 *   Tous les 3 j : réappro MP si stock < seuil × 8
 *
 * Usage :
 *   node src/seeds/seedAlgo.js           ← ajoute
 *   node src/seeds/seedAlgo.js --reset   ← repart de zéro
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product            from "../models/Product.js";
import User               from "../models/User.js";
import TypeMP             from "../models/TypeMP.js";
import MatierePremiere    from "../models/MatierePremiere.js";
import Recette            from "../models/Recette.js";
import ProductionPF       from "../models/ProductionPF.js";
import TransfertBoutique  from "../models/TransfertBoutique.js";
import StockBoutique      from "../models/StockBoutique.js";
import Vente              from "../models/Vente.js";
import Commande           from "../models/Commande.js";
import Notification       from "../models/Notification.js";
import NotificationClient from "../models/NotificationClient.js";

/* ── helpers ─────────────────────────────────────────────────── */
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const pickN   = (arr, n) => { const c=[...arr],o=[]; while(o.length<n&&c.length) o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]); return o; };
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randF   = (a, b, d = 2) => +(Math.random() * (b - a) + a).toFixed(d);
const norm    = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const dayOffset = (date, start) => Math.floor((date - start) / 86400000);

const SAISON = [0.70,0.75,0.85,0.90,1.00,1.20,1.40,1.35,1.05,0.90,0.80,1.20];
// Ventes boutique : boutique max ~30 L/j total, vente unitaire 1-2 L
// → 2024 : 4-7/j, 2025 : 7-11/j, 2026 : 10-16/j  ×saisonnalité
const VOL = { 2024:{min:4,max:7}, 2025:{min:7,max:11}, 2026:{min:10,max:16} };
// Jus frais : production chaque matin = demande estimée du jour + 5% buffer
// 1 kg fruit ≈ 0.7 L de jus  →  pour 5-8 L/jus/j = 7-11 kg MP/j par jus
const AVG_QTY_PER_VENTE = 1.25; // litres moyen par vente (entre 1L et 2L)
const FOURNISSEURS = ["Agrumes Bio","Fruits & Cie","Fresh Supply","FruitPro","NatureFresh"];
const MSG_STATUT   = {
  validee:"Votre commande a ete validee.", refusee:"Votre commande a ete refusee.",
  prete:"Votre commande est prete.", livree:"Votre commande a ete livree.",
  en_attente:"Votre commande est en attente de confirmation.",
};

async function batchInsert(Model, docs, ordered = false) {
  const out = [];
  for (let i = 0; i < docs.length; i += 500) {
    const res = await Model.insertMany(docs.slice(i, i+500), { ordered });
    out.push(...res);
  }
  return out;
}

/* ── run ─────────────────────────────────────────────────────── */
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecte a MongoDB\n");

    /* ── reset ─────────────────────────────────────────── */
    if (process.argv.includes("--reset")) {
      await Promise.all([
        Recette.deleteMany({}), MatierePremiere.deleteMany({}),
        ProductionPF.deleteMany({}), TransfertBoutique.deleteMany({}),
        StockBoutique.deleteMany({}), Vente.deleteMany({}),
        Commande.deleteMany({}), Notification.deleteMany({}),
        NotificationClient.deleteMany({}),
      ]);
      await Product.updateMany({}, { $set: { recette: null } });
      console.log("Reset effectue\n");
    }

    /* ── charger données existantes ─────────────────────── */
    const [produits, typemps, managers, workshops, sellers, clients] = await Promise.all([
      Product.find({ available: true }),
      TypeMP.find({}),
      User.find({ role: "manager" }),
      User.find({ role: "workshop" }),
      User.find({ role: "seller" }),
      User.find({ role: "client" }),
    ]);

    if (!produits.length)  { console.error("Produits manquants — lance seedDashboard d'abord."); process.exit(1); }
    if (!typemps.length)   { console.error("TypeMP manquants."); process.exit(1); }
    if (!sellers.length)   { console.error("Sellers manquants — lance seedDashboard d'abord."); process.exit(1); }

    const fallback   = [...managers, ...workshops, ...sellers][0];
    const pickMgr    = () => managers.length  ? pick(managers)  : fallback;
    const pickWS     = () => workshops.length ? pick(workshops) : (sellers.length ? pick(sellers) : fallback);
    const pickSeller = () => pick(sellers);

    const tmpById   = new Map(typemps.map(t => [String(t._id), t]));
    const typeByNom = new Map(typemps.map(t => [norm(t.nom), t]));

    console.log(`Produits: ${produits.length} | TypeMP: ${typemps.length}`);
    console.log(`Roles: manager=${managers.length} workshop=${workshops.length} seller=${sellers.length} client=${clients.length}\n`);

    /* ── 1. RECETTES ─────────────────────────────────────── */
    const trouverTMP = nom => { const n=norm(nom); for(const[k,t]of typeByNom) if(n.includes(k)||k.includes(n)) return t; return null; };
    const uConvert   = u => u==="mL"?"L" : u==="g"?"kg" : u;
    const qParLitre  = u => (u==="L"||u==="mL") ? 0.80 : 0.70;

    const existR = await Recette.find({});
    const recByNom = new Map(existR.map(r => [r.nomJus, r]));
    const toCreate = [];

    for (const prod of produits) {
      if (recByNom.has(prod.name)) continue;
      const ings = [];
      const t1 = trouverTMP(prod.name);
      if (t1) ings.push({ matiere: t1.nom, quantite: qParLitre(t1.unite), unite: uConvert(t1.unite) });
      const sucre = typeByNom.get("sucre");
      if (sucre) ings.push({ matiere: sucre.nom, quantite: 0.05, unite: uConvert(sucre.unite) });
      if (ings.length === 0) {
        for (const t of pickN(typemps, Math.min(2, typemps.length)))
          ings.push({ matiere: t.nom, quantite: randF(0.05, 0.4, 3), unite: uConvert(t.unite) });
      }
      toCreate.push({ nomJus: prod.name, ingredients: ings, seuilMinPF: randInt(10,20), seuilMinBoutique: randInt(5,15), creerPar: pickMgr()._id });
    }
    if (toCreate.length > 0) {
      const ins = await batchInsert(Recette, toCreate, true);
      for (const r of ins) {
        recByNom.set(r.nomJus, r);
        await Product.updateOne({ name: r.nomJus }, { $set: { recette: r._id } });
      }
    }
    const recettes = [...recByNom.values()];
    console.log(`Recettes: ${recByNom.size} total\n`);

    /* ── 2. SIMULATION JOUR PAR JOUR ─────────────────────── */
    const produitsP = [
      ...Array(3).fill(produits[0]),
      ...Array(3).fill(produits[1] ?? produits[0]),
      ...Array(2).fill(produits[2] ?? produits[0]),
      ...Array(2).fill(produits[3] ?? produits[0]),
      ...produits,
    ].filter(Boolean);

    const START = new Date(2024, 0, 1);
    const TODAY = new Date();
    TODAY.setHours(23, 59, 59, 999);

    // Pré-calculer la consommation MP journalière moyenne par clé
    // Base : ~6 L/jus/jour (moyenne saisons/années)
    const AVG_LITRES_PAR_JUS = 6;
    const dailyMPUse = new Map(); // "nom||unite" → kg/j (tous jus confondus)
    for (const rec of recettes) {
      for (const ing of rec.ingredients) {
        const k = `${ing.matiere}||${ing.unite}`;
        dailyMPUse.set(k, (dailyMPUse.get(k) ?? 0) + ing.quantite * AVG_LITRES_PAR_JUS);
      }
    }

    // État en mémoire
    const boutiqStk  = new Map();  // nomJus → qty courante en boutique
    const mpRunning  = new Map();  // "nom||unite" → qty courante MP
    const lastRestock = new Map(); // "nom||unite" → numéro de jour du dernier réappro

    for (const r of recettes) boutiqStk.set(r.nomJus, 0);

    // Collections à insérer
    const newMP        = [];  // MatierePremiere
    const productions  = [];
    const transferts   = [];
    const ventes       = [];
    const commandes    = [];

    // Accumulateur consommation par clé MP (pour résumé final)
    const totalConsomme = new Map(); // "nom||unite" → total consommé

    let joursSimules = 0;

    for (let d = new Date(START); d <= TODAY; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // fermé le dimanche
      joursSimules++;

      const y  = d.getFullYear();
      const mo = d.getMonth();
      const dd = d.getDate();
      const di = dayOffset(d, START);

      /* ── Réapprovisionnement MP tous les 3 jours ──────── */
      // Petites livraisons fréquentes = stock frais, max ~5 jours de conso
      if (joursSimules % 3 === 0) {
        for (const tmp of typemps) {
          const key      = `${tmp.nom}||${tmp.unite}`;
          const stock    = mpRunning.get(key) ?? 0;
          const daily    = dailyMPUse.get(key) ?? 0;
          const last     = lastRestock.get(key) ?? -999;

          // Commander si stock < 4 jours de conso OU premier approvisionnement
          if (daily > 0 && (stock < daily * 4 || last === -999)) {
            // Livraison ≈ 5 jours de conso  (petite boutique → petites commandes)
            const qty = +(daily * 5 * (0.85 + Math.random() * 0.3)).toFixed(2);
            newMP.push({
              typeMP:        tmp._id,
              quantite:      qty,
              unite:         tmp.unite,
              prixUnitaire:  randF(0.5, 20, 2),
              fournisseur:   pick(FOURNISSEURS),
              dateEntree:    new Date(y, mo, dd, randInt(7, 9), 0),
              enregistrePar: pickWS()._id,
            });
            mpRunning.set(key, stock + qty);
            lastRestock.set(key, joursSimules);
          }
        }
      }

      /* ── Production chaque matin (jus frais) ─────────── */
      // Quantité = demande estimée du jour + 5 % buffer
      // Transfert 100 % le matin même → atelier stock = 0 en fin de journée
      const ventesEstJour = Math.round((VOL[y]?.max ?? 12) * SAISON[mo] * AVG_QTY_PER_VENTE);
      const litresParJus  = Math.max(2, Math.ceil(ventesEstJour / Math.max(recettes.length, 1) * 1.05));

      for (const rec of recettes) {
        const qty = litresParJus + randInt(-1, 1); // légère variance journalière

        // Vérifier MP disponible
        let ok = true;
        for (const ing of rec.ingredients) {
          const k = `${ing.matiere}||${ing.unite}`;
          if ((mpRunning.get(k) ?? 0) < ing.quantite * qty) { ok = false; break; }
        }
        if (!ok) continue;

        // Déduire MP
        const deducts = rec.ingredients.map(ing => {
          const k   = `${ing.matiere}||${ing.unite}`;
          const use = parseFloat((ing.quantite * qty).toFixed(3));
          mpRunning.set(k, (mpRunning.get(k) ?? 0) - use);
          totalConsomme.set(k, (totalConsomme.get(k) ?? 0) + use);
          return { matiere: ing.matiere, quantite: use, unite: ing.unite };
        });

        productions.push({
          nomJus: rec.nomJus, quantiteProduite: qty, recette: rec._id,
          deductionsMP: deducts, enregistrePar: pickWS()._id,
          dateProduction: new Date(y, mo, dd, randInt(7, 9), pick([0, 15, 30])),
        });

        // Transfert 100 % le matin même (jus frais, pas de stock atelier)
        transferts.push({
          nomJus: rec.nomJus, quantite: qty, enregistrePar: pickWS()._id,
          dateTransfert: new Date(y, mo, dd, randInt(9, 11), pick([0, 15, 30])),
        });
        boutiqStk.set(rec.nomJus, (boutiqStk.get(rec.nomJus) ?? 0) + qty);
      }

      /* ── Ventes boutique ─────────────────────────────── */
      const { min, max } = VOL[y] ?? { min: 4, max: 7 };
      const nbV = Math.round(randInt(min, max) * SAISON[mo]);

      for (let v = 0; v < nbV; v++) {
        const p1 = pick(produitsP);
        const q1 = randInt(1, 2);   // max 2 L par vente (petite boutique)
        if ((boutiqStk.get(p1.name) ?? 0) < q1) continue;

        const lignes = [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }];
        boutiqStk.set(p1.name, boutiqStk.get(p1.name) - q1);

        if (Math.random() < 0.15) {  // 15% chance second produit (1L)
          const p2 = pick(produitsP), q2 = 1;
          if ((boutiqStk.get(p2.name) ?? 0) >= q2) {
            lignes.push({ produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price });
            boutiqStk.set(p2.name, boutiqStk.get(p2.name) - q2);
          }
        }

        const sousT   = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
        const escompte = sousT > 200 ? Math.round(sousT * 0.1) : 0;
        ventes.push({
          produits: lignes, total: Math.round(sousT - escompte), escompte,
          vendeur: pickSeller()._id,
          dateVente: new Date(y, mo, dd, randInt(8, 17), pick([0, 10, 20, 30, 40, 50])),
        });
      }

      /* ── Fin de journée : jus frais → stock boutique → 0 (sauf aujourd'hui) ── */
      const estAujourdhui = (y === TODAY.getFullYear() && mo === TODAY.getMonth() && dd === TODAY.getDate());
      if (!estAujourdhui) {
        // Les invendus sont jetés (jus non pasteurisé, ne se garde pas)
        for (const rec of recettes) boutiqStk.set(rec.nomJus, 0);
      }

      /* ── Commande en ligne (~1/3 des jours) ─────────── */
      if (clients.length > 0 && Math.random() < 0.33) {
        const cl    = pick(clients);
        const p1    = pick(produitsP);
        const q1    = randInt(1, 2);
        const isLiv = Math.random() < 0.3;
        const frais = isLiv ? 3 : 0;
        const sousT = p1.price * q1;
        const remise= sousT > 200 ? Math.round(sousT * 0.1) : 0;
        const total = Math.round(sousT - remise + frais);

        const pool  = y < TODAY.getFullYear()
          ? ["livree","livree","livree","refusee"]
          : ["livree","livree","validee","en_attente","en_attente","refusee","prete"];
        const statut = pick(pool);

        commandes.push({
          client:             cl._id,
          nomClient:          `${cl.prenom} ${cl.nom}`.trim(),
          telephone:          cl.telephone ?? "",
          telephoneLivraison: isLiv ? (cl.telephone ?? "") : "",
          adresseLivraison:   isLiv ? `${randInt(1,99)} Rue de la Republique, Tunis` : "",
          produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
          remise, fraisLivraison: frais, total, statut,
          type: "en_ligne",
          modeRemise:       isLiv ? "livraison" : "retrait",
          dateRetrait:      isLiv ? null : new Date(y, mo, dd, randInt(14,17), 0),
          heureRetrait:     isLiv ? "" : `${String(randInt(9,17)).padStart(2,"0")}:00`,
          livreePar:        statut === "livree" ? pickSeller()._id : null,
          enregistrePar:    null,
          commentaireRefus: statut === "refusee" ? "Stock insuffisant." : "",
          createdAt:        new Date(y, mo, dd, randInt(9,16), pick([0,15,30])),
        });
      }
    }

    /* Commandes physiques récentes */
    const nomsP = ["Walid M.","Ines B.","Farouk L.","Rim S.","Tarek A.","Leila C.","Omar B.","Hajer T."];
    for (let i = 0; i < 8; i++) {
      const p1 = pick(produitsP), q1 = randInt(1, 5);
      const ty = TODAY.getFullYear(), tm = TODAY.getMonth();
      commandes.push({
        nomClient:    nomsP[i],
        telephone:    `${randInt(20,99)} ${randInt(100,999)} ${randInt(100,999)}`,
        produits:     [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
        remise: 0, fraisLivraison: 0,
        total:        Math.round(p1.price * q1),
        statut:       pick(["livree","livree","validee","prete"]),
        type:         "physique", modeRemise: "retrait",
        enregistrePar: pickSeller()._id,
        createdAt:    new Date(ty, tm, Math.max(1, TODAY.getDate() - randInt(0,10)), randInt(9,16), pick([0,15,30])),
      });
    }

    console.log(`Jours simules : ${joursSimules}`);
    console.log(`MP nouvelles : ${newMP.length} | Productions : ${productions.length} | Transferts : ${transferts.length}`);
    console.log(`Ventes : ${ventes.length} | Commandes : ${commandes.length}\n`);

    /* ── 3. STOCK BOUTIQUE depuis état final simulation ── */
    const stockBoutiqueData = [...boutiqStk.entries()].map(([nomJus, qty]) => ({
      nomJus, stockActuel: Math.max(0, Math.round(qty)),
    }));

    /* ── 4. NOTIFICATIONS MP bas (état final) ─────────── */
    const notifData = [];
    for (const tmp of typemps) {
      const key   = `${tmp.nom}||${tmp.unite}`;
      const stock = mpRunning.get(key) ?? 0;
      if (stock <= tmp.seuilMin) {
        notifData.push({
          categorie: "MP", typeMP: tmp.nom,
          message:   `Stock bas : ${tmp.nom} (${stock.toFixed(2)} ${tmp.unite} <= seuil ${tmp.seuilMin} ${tmp.unite})`,
          niveauActuel: +stock.toFixed(2), seuilMin: tmp.seuilMin, unite: tmp.unite,
          luAtelier: false, luManager: false,
        });
      }
    }

    /* ── 5. INSERTIONS ───────────────────────────────── */
    if (newMP.length > 0)   await batchInsert(MatierePremiere, newMP);
    await batchInsert(ProductionPF, productions);
    await batchInsert(TransfertBoutique, transferts);

    const insVentes    = await batchInsert(Vente, ventes);
    const insCommandes = await batchInsert(Commande, commandes);

    for (const s of stockBoutiqueData) {
      await StockBoutique.findOneAndUpdate({ nomJus: s.nomJus }, { $set: { stockActuel: s.stockActuel } }, { upsert: true });
    }

    if (notifData.length > 0)
      await Notification.insertMany(notifData, { ordered: false }).catch(() => {});

    // Notifications COMMANDE pour en_attente
    const enAttente = insCommandes.filter(c => c.statut === "en_attente");
    if (enAttente.length > 0) {
      await Notification.insertMany(enAttente.map(c => ({
        categorie: "COMMANDE",
        message:   `Nouvelle commande en attente de ${c.nomClient || "client"}`,
        commandeRef: c._id, luAtelier: false, luManager: false,
      })), { ordered: false }).catch(() => {});
    }

    // NotificationClients (~60 % des commandes en_ligne)
    const notifClients = [];
    for (const cmd of insCommandes) {
      if (!cmd.client || Math.random() > 0.6) continue;
      notifClients.push({
        client:   cmd.client, commande: cmd._id,
        message:  MSG_STATUT[cmd.statut] ?? `Statut: ${cmd.statut}`,
        statut:   cmd.statut,
        lue:      ["livree","refusee"].includes(cmd.statut) ? Math.random() < 0.7 : false,
      });
    }
    if (notifClients.length > 0)
      await NotificationClient.insertMany(notifClients, { ordered: false }).catch(() => {});

    /* ── 6. RÉSUMÉ ──────────────────────────────────── */
    const [tV, tC, tP, tT, tN, tM, tS] = await Promise.all([
      Vente.countDocuments(), Commande.countDocuments(),
      ProductionPF.countDocuments(), TransfertBoutique.countDocuments(),
      Notification.countDocuments(), MatierePremiere.countDocuments(),
      StockBoutique.countDocuments(),
    ]);

    console.log("======================================");
    console.log(`  Ventes             en DB : ${tV}`);
    console.log(`  Commandes          en DB : ${tC}`);
    console.log(`  Productions        en DB : ${tP}`);
    console.log(`  Transferts         en DB : ${tT}`);
    console.log(`  Matieres premieres en DB : ${tM}`);
    console.log(`  Stocks boutique    en DB : ${tS}`);
    console.log(`  Notifications      en DB : ${tN}`);
    console.log("======================================\n");

    // Afficher état final stocks boutique
    console.log("Stock boutique final :");
    for (const [nom, qty] of boutiqStk)
      console.log(`  ${nom.padEnd(20)} : ${Math.max(0,Math.round(qty))} L`);
    console.log();

    // Afficher état final MP
    console.log("Stock MP final :");
    for (const tmp of typemps) {
      const k = `${tmp.nom}||${tmp.unite}`;
      console.log(`  ${tmp.nom.padEnd(15)} : ${(mpRunning.get(k)??0).toFixed(2)} ${tmp.unite}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Erreur :", err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

run();
