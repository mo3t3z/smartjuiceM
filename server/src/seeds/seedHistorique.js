/**
 * seedHistorique.js — Données cohérentes pour 2024 / 2025 / 2026
 *
 * Logique métier :
 *   2024 : démarrage  → 3-5 ventes/j  → CA mensuel ~1 500 DT
 *   2025 : croissance → 5-8 ventes/j  → CA mensuel ~2 500 DT
 *   2026 : établi     → 8-12 ventes/j → CA mensuel ~4 000 DT
 *
 * Saisonnalité : pic été (juil/août ×1.4), fêtes déc ×1.2, creux jan-fév ×0.7
 * Fermé le dimanche.
 *
 * Usage :
 *   node src/seeds/seedHistorique.js           ← ajoute
 *   node src/seeds/seedHistorique.js --reset   ← vide ventes+commandes d'abord
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product          from "../models/Product.js";
import User             from "../models/User.js";
import Vente            from "../models/Vente.js";
import Commande         from "../models/Commande.js";
import Recette            from "../models/Recette.js";
import ProductionPF       from "../models/ProductionPF.js";
import TransfertBoutique  from "../models/TransfertBoutique.js";
import Notification       from "../models/Notification.js";
import NotificationClient from "../models/NotificationClient.js";
import StockBoutique      from "../models/StockBoutique.js";

/* ── helpers ──────────────────────────────────────────────── */
const pick    = (arr)       => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max)  => Math.floor(Math.random() * (max - min + 1)) + min;

const SAISON = [0.70, 0.75, 0.85, 0.90, 1.00, 1.20, 1.40, 1.35, 1.05, 0.90, 0.80, 1.20];

const VOLUME_PAR_ANNEE = {
  2024: { min: 3, max: 5  },   // démarrage
  2025: { min: 5, max: 8  },   // croissance
  2026: { min: 8, max: 12 },   // établi
};

function makeDate(year, month, day, hour, minute) {
  return new Date(year, month, day, hour, minute, 0, 0);
}

function estDimanche(year, month, day) {
  return new Date(year, month, day).getDay() === 0;
}

/* ── run ──────────────────────────────────────────────────── */
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connecté à MongoDB\n");

    const isReset     = process.argv.includes("--reset") || process.argv.includes("--reset-only");
    const isResetOnly = process.argv.includes("--reset-only");

    if (isReset) {
      await Promise.all([
        Vente.deleteMany({}),
        Commande.deleteMany({}),
        ProductionPF.deleteMany({}),
        TransfertBoutique.deleteMany({}),
        Notification.deleteMany({}),
        NotificationClient.deleteMany({}),
        StockBoutique.deleteMany({}),
      ]);
      console.log("🗑  Reset effectué (User / Product / MatierePremiere / TypeMP conservés)\n");
    }

    if (isResetOnly) {
      process.exit(0);
    }

    /* ── Récupérer produits, utilisateurs et recettes ── */
    const produits = await Product.find({ available: true });
    const vendeurs = await User.find({ role: "seller" });
    const clients  = await User.find({ role: "client" });
    const recettes = await Recette.find({});

    if (produits.length === 0 || vendeurs.length === 0) {
      console.error("❌ Produits ou vendeurs manquants. Lance d'abord : npm run seed:dashboard");
      process.exit(1);
    }
    if (recettes.length === 0) {
      console.warn("⚠️  Aucune recette trouvée — productions et transferts ignorés");
    }

    // Pondérer les produits : les 2 premiers ×3, les 2 suivants ×2, reste ×1
    const produitsP = [
      ...Array(3).fill(produits[0] ?? produits[0]),
      ...Array(3).fill(produits[1] ?? produits[0]),
      ...Array(2).fill(produits[2] ?? produits[0]),
      ...Array(2).fill(produits[3] ?? produits[0]),
      ...produits,
    ].filter(Boolean);

    const today      = new Date();
    const todayYear  = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay   = today.getDate();

    const ANNEES = [2024, 2025, 2026];
    const ventesData      = [];
    const commandesData   = [];
    const productionsData = [];
    const transfertsData  = [];

    for (const annee of ANNEES) {
      const { min, max } = VOLUME_PAR_ANNEE[annee] ?? { min: 4, max: 7 };
      const nbMoisAnnee  = annee < todayYear ? 12
                         : annee === todayYear ? todayMonth + 1
                         : 0;
      if (nbMoisAnnee === 0) continue;

      let totalVentesAnnee = 0;

      for (let mois = 0; mois < nbMoisAnnee; mois++) {
        const coef     = SAISON[mois];
        const nbJours  = (annee < todayYear || mois < todayMonth)
          ? new Date(annee, mois + 1, 0).getDate()
          : todayDay;

        for (let jour = 1; jour <= nbJours; jour++) {
          if (estDimanche(annee, mois, jour)) continue; // fermé le dimanche

          const nbVentes = Math.round(randInt(min, max) * coef);

          for (let v = 0; v < nbVentes; v++) {
            const heure  = randInt(8, 17);
            const minute = pick([0, 10, 20, 30, 40, 50]);
            const p1     = pick(produitsP);
            const q1     = randInt(1, 4);

            const lignes = [
              { produit: p1._id, nom: p1.name, volume: "1L",
                quantite: q1, prixUnitaire: p1.price },
            ];

            // 25% de chance d'un 2ème produit
            if (Math.random() < 0.25) {
              const p2 = pick(produitsP);
              const q2 = randInt(1, 2);
              lignes.push({ produit: p2._id, nom: p2.name, volume: "1L",
                            quantite: q2, prixUnitaire: p2.price });
            }

            const sousTotal = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
            const escompte  = sousTotal > 200 ? Math.round(sousTotal * 0.1) : 0;

            ventesData.push({
              produits: lignes,
              total:    Math.round(sousTotal - escompte),
              escompte,
              vendeur:  pick(vendeurs)._id,
              dateVente: makeDate(annee, mois, jour, heure, minute),
            });
            totalVentesAnnee++;
          }

          // 1 commande en ligne / 3 jours en moyenne
          if (clients.length > 0 && Math.random() < 0.33) {
            const client    = pick(clients);
            const p1        = pick(produitsP);
            const q1        = randInt(1, 3);
            const isLiv     = Math.random() < 0.3;
            const frais     = isLiv ? 3 : 0;
            const total     = Math.round(p1.price * q1 + frais);

            const statutsCycle = annee < todayYear
              ? ["livree","livree","livree","refusee"]
              : ["livree","livree","validee","en_attente","en_attente","refusee","prete"];

            const dateCmd = makeDate(annee, mois, jour, randInt(9, 16), pick([0, 15, 30]));

            commandesData.push({
              client:             client._id,
              nomClient:          `${client.prenom} ${client.nom}`,
              telephone:          client.telephone ?? "",
              telephoneLivraison: isLiv ? (client.telephone ?? "") : "",
              adresseLivraison:   isLiv ? `${randInt(1,99)} Rue de la République, Tunis` : "",
              produits: [{ produit: p1._id, nom: p1.name, volume: "1L",
                           quantite: q1, prixUnitaire: p1.price }],
              remise:           0,
              fraisLivraison:   frais,
              total,
              statut:           pick(statutsCycle),
              type:             "en_ligne",
              modeRemise:       isLiv ? "livraison" : "retrait",
              dateRetrait:      isLiv ? null : dateCmd,
              heureRetrait:     isLiv ? "" : `${String(randInt(9,17)).padStart(2,"0")}:00`,
              livreePar:        null,
              enregistrePar:    null,
              commentaireRefus: "",
              createdAt:        dateCmd,
            });
          }
        }
      }

      // Estimation CA mensuel moyen
      const caEstime = ventesData
        .filter(v => v.dateVente.getFullYear() === annee)
        .reduce((s, v) => s + v.total, 0);
      const caMensuel = Math.round(caEstime / nbMoisAnnee);
      console.log(`   ${annee} → ${totalVentesAnnee} ventes | CA mensuel moyen estimé : ~${caMensuel} DT`);
    }

    /* ── Production & Transferts basés sur les ventes réelles ── */
    if (recettes.length > 0) {
      // Agréger quantités vendues par produit + année + mois
      const ventesProdMois = {};
      for (const vente of ventesData) {
        const annee = vente.dateVente.getFullYear();
        const mois  = vente.dateVente.getMonth();
        for (const ligne of vente.produits) {
          const key = `${ligne.nom}||${annee}||${mois}`;
          ventesProdMois[key] = (ventesProdMois[key] ?? 0) + ligne.quantite;
        }
      }

      for (const [key, qteVendue] of Object.entries(ventesProdMois)) {
        const [nomJus, anneeStr, moisStr] = key.split("||");
        const annee = parseInt(anneeStr);
        const mois  = parseInt(moisStr);

        const recette = recettes.find(r => r.nomJus === nomJus);
        if (!recette) continue;

        // Production couvre ventes + 20% buffer, répartie en 3-5 batches
        const qteACover    = Math.ceil(qteVendue * 1.2);
        const nbBatches    = randInt(3, 5);
        const qtePaBatch   = Math.ceil(qteACover / nbBatches);
        const nbJoursMois  = new Date(annee, mois + 1, 0).getDate();
        let   qteCumulee   = 0;

        for (let b = 0; b < nbBatches && qteCumulee < qteACover; b++) {
          const qte  = Math.max(1, Math.min(qtePaBatch + randInt(-2, 2), qteACover - qteCumulee));
          const jour = randInt(1, nbJoursMois);
          qteCumulee += qte;

          const deductions = recette.ingredients.map(ing => ({
            matiere:  ing.matiere,
            quantite: parseFloat((ing.quantite * qte).toFixed(3)),
            unite:    ing.unite,
          }));

          productionsData.push({
            nomJus,
            quantiteProduite: qte,
            recette:          recette._id,
            deductionsMP:     deductions,
            enregistrePar:    pick(vendeurs)._id,
            dateProduction:   makeDate(annee, mois, jour, randInt(7, 11), pick([0, 15, 30])),
          });

          // Transfert = 85-95% du batch, même jour ou lendemain
          const jourTransfert = Math.min(jour + (Math.random() < 0.5 ? 0 : 1), nbJoursMois);
          transfertsData.push({
            nomJus,
            quantite:      Math.round(qte * (0.85 + Math.random() * 0.10)),
            enregistrePar: pick(vendeurs)._id,
            dateTransfert: makeDate(annee, mois, jourTransfert, randInt(12, 17), pick([0, 15, 30])),
          });
        }
      }
      console.log(`\n   Production générée : ${productionsData.length} batches / ${transfertsData.length} transferts`);
    }

    /* ── Insertion par batch ──────────────────────────────── */
    const BATCH = 500;
    let insertedV = 0;
    for (let i = 0; i < ventesData.length; i += BATCH) {
      await Vente.insertMany(ventesData.slice(i, i + BATCH));
      insertedV += Math.min(BATCH, ventesData.length - i);
    }

    let insertedC = 0;
    for (let i = 0; i < commandesData.length; i += BATCH) {
      await Commande.insertMany(commandesData.slice(i, i + BATCH));
      insertedC += Math.min(BATCH, commandesData.length - i);
    }

    let insertedP = 0;
    for (let i = 0; i < productionsData.length; i += BATCH) {
      await ProductionPF.insertMany(productionsData.slice(i, i + BATCH));
      insertedP += Math.min(BATCH, productionsData.length - i);
    }

    let insertedT = 0;
    for (let i = 0; i < transfertsData.length; i += BATCH) {
      await TransfertBoutique.insertMany(transfertsData.slice(i, i + BATCH));
      insertedT += Math.min(BATCH, transfertsData.length - i);
    }

    /* ── Résumé ───────────────────────────────────────────── */
    const totalV = await Vente.countDocuments();
    const totalC = await Commande.countDocuments();
    const totalP = await ProductionPF.countDocuments();
    const totalT = await TransfertBoutique.countDocuments();

    console.log(`\n══════════════════════════════════════`);
    console.log(`  ✅ ${insertedV} ventes insérées`);
    console.log(`  ✅ ${insertedC} commandes insérées`);
    console.log(`  ✅ ${insertedP} productions insérées`);
    console.log(`  ✅ ${insertedT} transferts insérés`);
    console.log(`  Total ventes       en DB : ${totalV}`);
    console.log(`  Total commandes    en DB : ${totalC}`);
    console.log(`  Total productions  en DB : ${totalP}`);
    console.log(`  Total transferts   en DB : ${totalT}`);
    console.log(`══════════════════════════════════════\n`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
};

run();
