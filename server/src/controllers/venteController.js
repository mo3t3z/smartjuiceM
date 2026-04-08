import PDFDocument from "pdfkit";
import Vente from "../models/Vente.js";
import Product from "../models/Product.js";
import { calcStockBoutique, ajouterStockBoutique } from "./commandeController.js";
import Recette from "../models/Recette.js";
import Notification from "../models/Notification.js";
import StockBoutique from "../models/StockBoutique.js";

/* ═══════════════════════════════════════════════════════════════
   HELPER : vérifier et créer une alerte de stock boutique (PB26)
═══════════════════════════════════════════════════════════════ */
const verifierAlerteBoutique = async (nomJus) => {
  const stockActuel = await calcStockBoutique(nomJus);
  const recette = await Recette.findOne({ nomJus });

  if (recette && recette.seuilMinPF > 0 && stockActuel <= recette.seuilMinPF) {
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
   PB24 — ENREGISTRER UNE VENTE EN BOUTIQUE (Vendeur)
   → Vérifie le stock boutique disponible avant d'enregistrer
   → Déclenche les alertes PB26 si le stock passe sous le seuil
═══════════════════════════════════════════════════════════════ */
export const creerVente = async (req, res) => {
  try {
    const { nomClient, produits } = req.body;

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "La vente doit contenir au moins un produit." });
    }

    const produitsDetails = [];
    let total = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      }

      // Vérifier le stock boutique disponible pour ce produit
      const litresParUnite = produit.volume === "1L" ? 1 : 0.5;
      const litresDemandes = item.quantite * litresParUnite;
      const stockDispo = await calcStockBoutique(produit.name);

      if (litresDemandes > stockDispo) {
        return res.status(400).json({
          message: `Stock boutique insuffisant pour "${produit.name}". Disponible : ${stockDispo.toFixed(2)} L, Demandé : ${litresDemandes} L.`,
          produit: produit.name,
          stockDisponible: parseFloat(stockDispo.toFixed(2)),
        });
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

    // Enregistrer la vente
    const vente = await Vente.create({
      produits: produitsDetails,
      total: parseFloat(total.toFixed(2)),
      vendeur: req.user._id,
      nomClient: nomClient || "",
      dateVente: new Date(),
    });

    // Décrémenter le stock boutique pour chaque produit vendu
    for (const p of produitsDetails) {
      const litres = (p.volume === "1L" ? 1 : 0.5) * p.quantite;
      await ajouterStockBoutique(p.nom, -litres);
    }

    // Vérifier les alertes boutique pour chaque produit vendu (PB26)
    const nomsJus = [...new Set(produitsDetails.map((p) => p.nom))];
    for (const nomJus of nomsJus) {
      await verifierAlerteBoutique(nomJus);
    }

    const populated = await vente.populate("vendeur", "email nom prenom");
    res.status(201).json({ message: "Vente enregistrée avec succès.", vente: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   TOUTES LES VENTES (Gérant)
═══════════════════════════════════════════════════════════════ */
export const getVentes = async (req, res) => {
  try {
    const ventes = await Vente.find()
      .populate("vendeur", "email nom prenom")
      .sort({ dateVente: -1 });

    res.json(ventes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MES VENTES (Vendeur)
═══════════════════════════════════════════════════════════════ */
export const getMesVentes = async (req, res) => {
  try {
    const ventes = await Vente.find({ vendeur: req.user._id })
      .populate("vendeur", "email nom prenom")
      .sort({ dateVente: -1 });

    res.json(ventes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   STOCK BOUTIQUE DISPONIBLE PAR PRODUIT (Vendeur + Gérant)
   Calcul : transferts - ventes - commandes livrées
═══════════════════════════════════════════════════════════════ */
export const getStockBoutiqueDisponible = async (req, res) => {
  try {
    const stocks = await StockBoutique.find().sort({ nomJus: 1 });
    res.json(
      stocks.map((s) => ({
        nomJus: s.nomJus,
        disponible: Math.max(0, parseFloat(s.stockActuel.toFixed(2))),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PB24 — GÉNÉRER LE REÇU PDF D'UNE VENTE
═══════════════════════════════════════════════════════════════ */
export const genererRecuVente = async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id).populate("vendeur", "email nom prenom");

    if (!vente) return res.status(404).json({ message: "Vente introuvable." });

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=recu-vente-${vente._id}.pdf`
    );
    doc.pipe(res);

    // ── En-tête ──────────────────────────────────────────────────
    doc.fontSize(24).font("Helvetica-Bold").text("SmartJuice", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Jus naturels frais et délicieux", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Informations de la vente ──────────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text("REÇU DE VENTE");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`N° Vente   : ${vente._id}`);
    doc.text(`Date       : ${new Date(vente.dateVente).toLocaleString("fr-TN")}`);
    doc.text(`Vendeur    : ${vente.vendeur?.nom || ""} ${vente.vendeur?.prenom || ""} (${vente.vendeur?.email || ""})`);
    if (vente.nomClient) doc.text(`Client     : ${vente.nomClient}`);

    // ── Tableau des produits ──────────────────────────────────────
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica-Bold").text("Détail des produits :");
    doc.moveDown(0.3);

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Produit", 50, doc.y, { width: 200 });
    doc.text("Volume", 255, doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text("Qté", 320, doc.y - doc.currentLineHeight(), { width: 50 });
    doc.text("Prix unit.", 375, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.text("Sous-total", 460, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(10);
    for (const p of vente.produits) {
      const sousTotal = (p.quantite * p.prixUnitaire).toFixed(2);
      const y = doc.y;
      doc.text(p.nom, 50, y, { width: 200 });
      doc.text(p.volume, 255, y, { width: 60 });
      doc.text(`${p.quantite}`, 320, y, { width: 50 });
      doc.text(`${p.prixUnitaire.toFixed(2)} DT`, 375, y, { width: 80 });
      doc.text(`${sousTotal} DT`, 460, y, { width: 80 });
      doc.moveDown(0.5);
    }

    // ── Total ──────────────────────────────────────────────────────
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL : ${vente.total.toFixed(2)} DT`, { align: "right" });

    // ── Pied de page ───────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(9).font("Helvetica").fillColor("gray")
      .text("Merci de votre achat ! — SmartJuice © 2026", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la génération du reçu", error: error.message });
  }
};
