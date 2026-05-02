/**
 * seedDashboard.js  —  ~250 documents insérés dans MongoDB
 * Collections : Product, User, Vente, Commande, StockBoutique
 *
 * Usage (depuis le dossier server/) :
 *   npm run seed:dashboard          ← ajoute sans supprimer
 *   npm run seed:dashboard:reset    ← repart de zéro
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Vente from "../models/Vente.js";
import Commande from "../models/Commande.js";
import StockBoutique from "../models/StockBoutique.js";

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function dateIl(joursAvant, heure = "10:00") {
  const d = new Date();
  d.setDate(d.getDate() - joursAvant);
  const [h, m] = heure.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function hRand() {
  return `${String(randInt(8, 17)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`;
}
function round3(n) { return parseFloat(n.toFixed(3)); }

/* ═══════════════════════════════════════════════════════════
   DONNÉES STATIQUES
═══════════════════════════════════════════════════════════ */

const PRODUITS_DATA = [
  { name: "Jus d'Orange",    description: "Pressé à froid, riche en vitamine C",           price: 3.500, volume: "1L", available: true  },
  { name: "Jus de Carotte",  description: "Riche en bêta-carotène et vitamines",           price: 3.000, volume: "1L", available: true  },
  { name: "Jus de Pomme",    description: "100% naturel, fraîcheur garantie",              price: 3.200, volume: "1L", available: true  },
  { name: "Jus de Grenade",  description: "Antioxydants puissants, saveur intense",        price: 4.500, volume: "1L", available: true  },
  { name: "Jus de Pastèque", description: "Hydratant et rafraîchissant",                   price: 2.800, volume: "1L", available: true  },
  { name: "Cocktail Fruits", description: "Mélange maison de fruits de saison",            price: 4.000, volume: "1L", available: true  },
  { name: "Jus de Fraise",   description: "Doux et parfumé, sans sucre ajouté",            price: 4.000, volume: "1L", available: true  },
  { name: "Jus de Citron",   description: "Rafraîchissant et énergisant, pressé frais",    price: 2.500, volume: "1L", available: true  },
  { name: "Jus de Mangue",   description: "Exotique et onctueux, 100% fruit",              price: 5.000, volume: "1L", available: false },
  { name: "Jus de Datte",    description: "Naturellement sucré, riche en minéraux",        price: 3.800, volume: "1L", available: false },
];

const VENDEURS_DATA = [
  { email: "vendeur1@smartjuice.tn", nom: "Souissi", prenom: "Ahmed",  telephone: "55 010 101" },
  { email: "vendeur2@smartjuice.tn", nom: "Mejri",   prenom: "Sonia",  telephone: "55 020 202" },
  { email: "vendeur3@smartjuice.tn", nom: "Trabelsi",prenom: "Walid",  telephone: "55 030 303" },
];

const CLIENTS_DATA = [
  { email: "yassine.gharbi@gmail.com",  nom: "Gharbi",    prenom: "Yassine", telephone: "55 123 456" },
  { email: "sonia.mrad@gmail.com",      nom: "Mrad",      prenom: "Sonia",   telephone: "22 987 654" },
  { email: "ahmed.salem@gmail.com",     nom: "Salem",     prenom: "Ahmed",   telephone: "99 111 222" },
  { email: "nadia.benali@gmail.com",    nom: "Ben Ali",   prenom: "Nadia",   telephone: "55 333 444" },
  { email: "karim.triki@gmail.com",     nom: "Triki",     prenom: "Karim",   telephone: "44 777 888" },
  { email: "rim.chaouachi@gmail.com",   nom: "Chaouachi", prenom: "Rim",     telephone: "20 444 555" },
  { email: "farouk.laabidi@gmail.com",  nom: "Laabidi",   prenom: "Farouk",  telephone: "55 666 777" },
  { email: "ines.bouzid@gmail.com",     nom: "Bouzid",    prenom: "Ines",    telephone: "22 888 999" },
  { email: "tarek.ammar@gmail.com",     nom: "Ammar",     prenom: "Tarek",   telephone: "44 222 333" },
  { email: "lina.karray@gmail.com",     nom: "Karray",    prenom: "Lina",    telephone: "55 999 000" },
];

/* ═══════════════════════════════════════════════════════════
   SCRIPT PRINCIPAL
═══════════════════════════════════════════════════════════ */
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connecté à MongoDB\n");

    const isReset = process.argv.includes("--reset");
    if (isReset) {
      await Vente.deleteMany({});
      await Commande.deleteMany({});
      await StockBoutique.deleteMany({});
      await User.deleteMany({ email: { $in: [
        ...CLIENTS_DATA.map(c => c.email),
        ...VENDEURS_DATA.map(v => v.email),
      ]}});
      await Product.deleteMany({});
      console.log("🗑  Collections nettoyées\n");
    }

    /* ── 1. Produits (10) ─────────────────────────────────── */
    let products = await Product.find({});
    if (products.length === 0) {
      products = await Product.insertMany(PRODUITS_DATA);
      console.log(`✅ ${products.length} produits insérés`);
    } else {
      console.log(`ℹ️  ${products.length} produits existants conservés`);
    }
    const prodDispos  = products.filter(p => p.available);
    const prodMap     = {};
    for (const p of products) prodMap[p.name] = p;

    /* ── 2. Utilisateurs (13) ─────────────────────────────── */
    const pwHash = await bcrypt.hash("Password1!", 10);

    const vendeurs = [];
    for (const v of VENDEURS_DATA) {
      let u = await User.findOne({ email: v.email });
      if (!u) u = await User.create({ ...v, passwordHash: pwHash, role: "seller" });
      vendeurs.push(u);
    }

    const clients = [];
    for (const c of CLIENTS_DATA) {
      let u = await User.findOne({ email: c.email });
      if (!u) u = await User.create({ ...c, passwordHash: pwHash, role: "client" });
      clients.push(u);
    }
    console.log(`✅ ${vendeurs.length} vendeurs + ${clients.length} clients prêts`);

    /* ── 3. Ventes  (≈ 160 documents) ────────────────────── */
    // Aujourd'hui (01/05/2026) : 12 ventes
    const ventesData = [];

    const heuresAujourdhui = [
      "08:10","08:45","09:20","10:00","10:35","11:15",
      "12:00","13:30","14:10","15:00","15:45","16:30",
    ];
    for (const h of heuresAujourdhui) {
      const p1 = pick(prodDispos);
      const p2 = pick(prodDispos);
      const q1 = randInt(1, 4);
      const q2 = randInt(1, 3);
      ventesData.push({
        produits: [
          { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
          { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
        ],
        total: round3(p1.price * q1 + p2.price * q2),
        escompte: 0,
        vendeur: pick(vendeurs)._id,
        dateVente: dateIl(0, h),
      });
    }

    // Hier (30/04) : 10 ventes
    const heuresHier = [
      "08:30","09:00","10:20","11:00","12:30",
      "13:00","14:45","15:15","16:00","16:50",
    ];
    for (const h of heuresHier) {
      const p1 = pick(prodDispos);
      const q1 = randInt(1, 5);
      ventesData.push({
        produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
        total: round3(p1.price * q1),
        escompte: 0,
        vendeur: pick(vendeurs)._id,
        dateVente: dateIl(1, h),
      });
    }

    // Avant-hier (29/04) : 9 ventes
    for (let i = 0; i < 9; i++) {
      const p1 = pick(prodDispos);
      const p2 = pick(prodDispos);
      const q1 = randInt(1, 3), q2 = randInt(1, 2);
      ventesData.push({
        produits: [
          { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
          { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
        ],
        total: round3(p1.price * q1 + p2.price * q2),
        escompte: 0,
        vendeur: pick(vendeurs)._id,
        dateVente: dateIl(2, hRand()),
      });
    }

    // Semaine 1 (jours 3-7) : 7 ventes/jour = 35 ventes
    for (let jour = 3; jour <= 7; jour++) {
      for (let i = 0; i < 7; i++) {
        const p1 = pick(prodDispos);
        const q1 = randInt(1, 5);
        ventesData.push({
          produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
          total: round3(p1.price * q1),
          escompte: 0,
          vendeur: pick(vendeurs)._id,
          dateVente: dateIl(jour, hRand()),
        });
      }
    }

    // Semaine 2 (jours 8-14) : 6 ventes/jour = 42 ventes
    for (let jour = 8; jour <= 14; jour++) {
      for (let i = 0; i < 6; i++) {
        const p1 = pick(prodDispos);
        const p2 = pick(prodDispos);
        const q1 = randInt(1, 4), q2 = randInt(1, 2);
        ventesData.push({
          produits: [
            { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
            { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
          ],
          total: round3(p1.price * q1 + p2.price * q2),
          escompte: 0,
          vendeur: pick(vendeurs)._id,
          dateVente: dateIl(jour, hRand()),
        });
      }
    }

    // Semaine 3 (jours 15-21) : 5 ventes/jour = 35 ventes
    for (let jour = 15; jour <= 21; jour++) {
      for (let i = 0; i < 5; i++) {
        const p1 = pick(prodDispos);
        const q1 = randInt(2, 6);
        ventesData.push({
          produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
          total: round3(p1.price * q1),
          escompte: 0,
          vendeur: pick(vendeurs)._id,
          dateVente: dateIl(jour, hRand()),
        });
      }
    }

    // Semaine 4+ (jours 22-30) : 4 ventes/jour = 36 ventes
    for (let jour = 22; jour <= 30; jour++) {
      for (let i = 0; i < 4; i++) {
        const p1 = pick(prodDispos);
        const q1 = randInt(1, 4);
        ventesData.push({
          produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
          total: round3(p1.price * q1),
          escompte: 0,
          vendeur: pick(vendeurs)._id,
          dateVente: dateIl(jour, hRand()),
        });
      }
    }

    const ventesCreees = await Vente.insertMany(ventesData);
    console.log(`✅ ${ventesCreees.length} ventes insérées`);

    /* ── 4. Commandes en ligne (60 documents) ─────────────── */
    const commandesData = [];

    // 8 commandes "en_attente" (récentes, à traiter)
    for (let i = 0; i < 8; i++) {
      const client = pick(clients);
      const p1 = pick(prodDispos), p2 = pick(prodDispos);
      const q1 = randInt(1, 3), q2 = randInt(1, 2);
      const frais = pick([0, 0, 3]);
      const total = p1.price * q1 + p2.price * q2 + frais;
      commandesData.push({
        client: client._id,
        nomClient: `${client.prenom} ${client.nom}`,
        telephone: client.telephone,
        produits: [
          { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
          { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
        ],
        remise: 0, fraisLivraison: frais,
        total: round3(total), statut: "en_attente", type: "en_ligne",
        modeRemise: frais > 0 ? "livraison" : "retrait",
        dateRetrait: dateIl(-1), heureRetrait: pick(["10:00","11:00","14:00","15:30"]),
        createdAt: dateIl(randInt(0, 1), hRand()),
      });
    }

    // 12 commandes "validee"
    for (let i = 0; i < 12; i++) {
      const client = pick(clients);
      const p1 = pick(prodDispos);
      const q1 = randInt(1, 4);
      const frais = pick([0, 3]);
      const total = p1.price * q1 + frais;
      commandesData.push({
        client: client._id,
        nomClient: `${client.prenom} ${client.nom}`,
        telephone: client.telephone,
        produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
        remise: 0, fraisLivraison: frais,
        total: round3(total), statut: "validee", type: "en_ligne",
        modeRemise: frais > 0 ? "livraison" : "retrait",
        dateRetrait: dateIl(randInt(1, 3)), heureRetrait: pick(["10:00","11:00","14:00"]),
        createdAt: dateIl(randInt(2, 5), hRand()),
      });
    }

    // 5 commandes "prete"
    for (let i = 0; i < 5; i++) {
      const client = pick(clients);
      const p1 = pick(prodDispos), p2 = pick(prodDispos);
      const q1 = randInt(1, 3), q2 = 1;
      const total = p1.price * q1 + p2.price * q2;
      commandesData.push({
        client: client._id,
        nomClient: `${client.prenom} ${client.nom}`,
        telephone: client.telephone,
        produits: [
          { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
          { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
        ],
        remise: 0, fraisLivraison: 0,
        total: round3(total), statut: "prete", type: "en_ligne",
        modeRemise: "retrait",
        dateRetrait: dateIl(0), heureRetrait: pick(["15:00","16:00"]),
        createdAt: dateIl(randInt(1, 3), hRand()),
      });
    }

    // 4 commandes "refusee"
    const raisonsRefus = [
      "Stock insuffisant pour cette commande.",
      "Produit temporairement indisponible.",
      "Créneau horaire non disponible ce jour-là.",
      "Informations de livraison incomplètes.",
    ];
    for (let i = 0; i < 4; i++) {
      const client = pick(clients);
      const p1 = pick(prodDispos);
      const q1 = randInt(2, 6);
      const total = p1.price * q1;
      commandesData.push({
        client: client._id,
        nomClient: `${client.prenom} ${client.nom}`,
        telephone: client.telephone,
        produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
        remise: 0, fraisLivraison: 0,
        total: round3(total), statut: "refusee", type: "en_ligne",
        modeRemise: "retrait",
        dateRetrait: dateIl(randInt(3, 8)), heureRetrait: "10:00",
        commentaireRefus: raisonsRefus[i],
        createdAt: dateIl(randInt(3, 10), hRand()),
      });
    }

    // 16 commandes "livree" (en ligne)
    for (let i = 0; i < 16; i++) {
      const client = pick(clients);
      const p1 = pick(prodDispos), p2 = pick(prodDispos);
      const q1 = randInt(1, 4), q2 = randInt(1, 2);
      const frais = pick([0, 0, 3]);
      const total = p1.price * q1 + p2.price * q2 + frais;
      commandesData.push({
        client: client._id,
        nomClient: `${client.prenom} ${client.nom}`,
        telephone: client.telephone,
        produits: [
          { produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price },
          { produit: p2._id, nom: p2.name, volume: "1L", quantite: q2, prixUnitaire: p2.price },
        ],
        remise: 0, fraisLivraison: frais,
        total: round3(total), statut: "livree", type: "en_ligne",
        modeRemise: frais > 0 ? "livraison" : "retrait",
        dateRetrait: dateIl(randInt(5, 20)), heureRetrait: hRand(),
        createdAt: dateIl(randInt(5, 25), hRand()),
      });
    }

    // 15 commandes physiques (vendeur)
    const nomsPhysiques = [
      "Walid M.","Ines B.","Farouk L.","Rim S.","Tarek A.",
      "Leila C.","Omar B.","Hajer T.","Slim R.","Malek D.",
      "Rym H.","Zied F.","Amira G.","Nour K.","Bassem S.",
    ];
    for (let i = 0; i < 15; i++) {
      const p1 = pick(prodDispos);
      const q1 = randInt(1, 5);
      const total = p1.price * q1;
      commandesData.push({
        nomClient: nomsPhysiques[i],
        telephone: `${randInt(20, 99)} ${randInt(100, 999)} ${randInt(100, 999)}`,
        produits: [{ produit: p1._id, nom: p1.name, volume: "1L", quantite: q1, prixUnitaire: p1.price }],
        remise: 0, fraisLivraison: 0,
        total: round3(total), statut: pick(["livree","livree","livree","validee"]),
        type: "physique", modeRemise: "retrait",
        enregistrePar: pick(vendeurs)._id,
        createdAt: dateIl(randInt(0, 15), hRand()),
      });
    }

    const commandesCreees = await Commande.insertMany(commandesData);
    console.log(`✅ ${commandesCreees.length} commandes insérées`);

    /* ── 5. StockBoutique (8 entrées) ─────────────────────── */
    const stockEntries = [
      { nomJus: "Jus d'Orange",    stockActuel: 24 },
      { nomJus: "Jus de Carotte",  stockActuel: 18 },
      { nomJus: "Jus de Pomme",    stockActuel: 12 },
      { nomJus: "Jus de Grenade",  stockActuel: 9  },
      { nomJus: "Jus de Pastèque", stockActuel: 15 },
      { nomJus: "Cocktail Fruits", stockActuel: 7  },
      { nomJus: "Jus de Fraise",   stockActuel: 3  },
      { nomJus: "Jus de Citron",   stockActuel: 20 },
    ];
    for (const entry of stockEntries) {
      await StockBoutique.findOneAndUpdate(
        { nomJus: entry.nomJus },
        { $set: { stockActuel: entry.stockActuel } },
        { upsert: true }
      );
    }
    console.log(`✅ ${stockEntries.length} entrées stock boutique insérées`);

    /* ── Résumé ───────────────────────────────────────────── */
    const refDate = new Date("2026-05-01");
    const ventesAujourdhui = ventesData.filter(v =>
      new Date(v.dateVente).toDateString() === refDate.toDateString()
    );
    const caJour  = ventesAujourdhui.reduce((s, v) => s + v.total, 0);
    const caMois  = ventesData.reduce((s, v) => s + v.total, 0);
    const enAtt   = commandesData.filter(c => c.statut === "en_attente").length;
    const total   = products.length + vendeurs.length + clients.length
                  + ventesCreees.length + commandesCreees.length + stockEntries.length;

    console.log("\n══════════════════════════════════════");
    console.log("  📊 Résumé des données insérées");
    console.log("══════════════════════════════════════");
    console.log(`  Produits              : ${products.length}`);
    console.log(`  Vendeurs              : ${vendeurs.length}`);
    console.log(`  Clients               : ${clients.length}`);
    console.log(`  Ventes                : ${ventesCreees.length}`);
    console.log(`  Commandes             : ${commandesCreees.length}`);
    console.log(`  Stock boutique        : ${stockEntries.length}`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  TOTAL documents       : ${total}`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  CA aujourd'hui        : ${caJour.toFixed(3)} DT`);
    console.log(`  CA ce mois            : ${caMois.toFixed(3)} DT`);
    console.log(`  Commandes en attente  : ${enAtt}`);
    console.log("══════════════════════════════════════\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur seed:", err.message);
    process.exit(1);
  }
};

run();
