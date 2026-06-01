import PDFDocument from "pdfkit";
import Vente from "../models/Vente.js";
import Product from "../models/Product.js";
import { calcStockBoutique, ajouterStockBoutique, verifierAlerteBoutique } from "../services/stockBoutiqueService.js";
import StockBoutique from "../models/StockBoutique.js";
//f1 creation de vente/f2 recupérer tous les ventes pour historique de vente de gerant
//f3:affiche le stock boutique dispo a la vente /f4:generation de pdf 

/* ═══════════════════════════════════════════════════════════════
   HELPER : résoudre le nomJus d'un produit via sa recette liée
   Fallback sur le nom du produit si pas de recette liée
═══════════════════════════════════════════════════════════════ */
const normalize = (s) =>//pour que le jus soit appelé sans aucune ambiguité 
  s.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüç]/gi, " ").replace(/\s+/g, " ").trim();

const trouverNomJus = async (produit) => {//si le produits et liée avec une recette il sera retourné aucun probléme
  if (produit.recette?.nomJus) return produit.recette.nomJus;
  // Fallback : ken msh rabtin pdt te3 catalogue b recette ymchi y9aren el kelmet ely tchbeh lba3dhha 
  const stocks = await StockBoutique.find({});//chagre le stock boutique
  const nomProdNorm = normalize(produit.name);
  //yfeltri klmet ely atwel mn zoz hrouf w yne7y klmet jus w ykhdm al be9y
  const motsProd = nomProdNorm.split(" ").filter((m) => m.length > 2 && m !== "jus");
  const match = stocks.find((s) => {
    const nomStockNorm = normalize(s.nomJus);
    const motsStock = nomStockNorm.split(" ").filter((m) => m.length > 2 && m !== "jus");
    return motsStock.every((m) => nomProdNorm.includes(m)) ||
           motsProd.every((m) => nomStockNorm.includes(m));
  });
  return match ? match.nomJus : produit.name;
};

//f1:creation de vente
export const creerVente = async (req, res) => {
  try {
    const { produits, escompte } = req.body;//extraire du requet front le pdt et escompte

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "La vente doit contenir au moins un produit." });
    }

    const produitsDetails = [];//yhdher tableau chyhot fyh details w total s'intilise a 0
    let total = 0;

    for (const item of produits) {//ylewej al pdt f mongo
      const produit = await Product.findById(item.produitId).populate("recette", "nomJus");
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      }

      // Trouver le nomJus via la recette liée (exact) ou fuzzy match en fallback
      const nomJus = await trouverNomJus(produit);

      // Vérifier le stock boutique disponible pour ce produit
      const litresDemandes = item.quantite;
      const stockDispo = await calcStockBoutique(nomJus);

      if (litresDemandes > stockDispo) {
        return res.status(400).json({
          message: `Stock boutique insuffisant pour "${produit.name}". Disponible : ${stockDispo.toFixed(2)} L, Demandé : ${litresDemandes} L.`,
          produit: produit.name,
          stockDisponible: parseFloat(stockDispo.toFixed(2)),
        });
      }

      const ligneTotal = produit.price * item.quantite;//ken quantité mregla yehseb
      total += ligneTotal;

      produitsDetails.push({//zyd l'article f tableau
        produit: produit._id,
        nom: produit.name,
        nomJus,                  // nom dans StockBoutique (pour décrémentation)
        volume: produit.volume,
        quantite: item.quantite,
        prixUnitaire: produit.price,
      });
    }

    // Appliquer l'escompte si fourni (validé : 10% si total > 200)
    const escompteApplique = escompte && escompte > 0 ? parseFloat(escompte.toFixed(2)) : 0;
    const totalFinal = parseFloat((total - escompteApplique).toFixed(2));

    // Enregistrer la vente (sans nomJus dans le schéma)
    const venteProduits = produitsDetails.map(({ nomJus: _nj, ...rest }) => rest);
    const vente = await Vente.create({//créer la vente
      produits: venteProduits,
      total: totalFinal,
      escompte: escompteApplique,
      vendeur: req.user._id,
      dateVente: new Date(),
    });

    // Décrémenter le stock boutique pour chaque produit vendu (avec le bon nomJus)
    for (const p of produitsDetails) {
      const litres = p.quantite;
      await ajouterStockBoutique(p.nomJus, -litres);
    }

    // Vérifier les alertes boutique pour chaque produit vendu (PB26)
    const nomsJus = [...new Set(produitsDetails.map((p) => p.nom))];
    for (const nomJus of nomsJus) {
      await verifierAlerteBoutique(nomJus);
    }
//reponse json a envoyé au front 
    const populated = await vente.populate("vendeur", "email nom prenom");
    res.status(201).json({ message: "Vente enregistrée avec succès.", vente: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f2 recupérer tous les ventes pour historique de vente de gerant
export const getVentes = async (req, res) => {
  try {
    const { debut, fin, mois } = req.query;//lit parametre depuis url 
    const filtre = {};

    if (mois) {//filtre par moi
      const [annee, moisNum] = mois.split("-").map(Number);
      filtre.dateVente = {
        $gte: new Date(annee, moisNum - 1, 1),//dyme nehiw 1 mel mois khtr 0 hyia 1 f js
        $lte: new Date(annee, moisNum, 0, 23, 59, 59, 999),
      };
    } else if (debut || fin) {//quand la journée commance et fini
      filtre.dateVente = {};
      if (debut) { const d = new Date(debut); d.setHours(0,0,0,0); filtre.dateVente.$gte = d; }
      if (fin)   { const d = new Date(fin);   d.setHours(23,59,59,999); filtre.dateVente.$lte = d; }
    }

    const ventes = await Vente.find(filtre)//selon le filtre retourne vendeur, et email nom et prenom
      .populate("vendeur", "email nom prenom")
      .sort({ dateVente: -1 });

    res.json(ventes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
//f3:affiche le stock boutique dispo a la vente
export const getStockBoutiqueDisponible = async (req, res) => {
  try {
    //recupérer tous les produit availble avec leur recette liée 
    const products = await Product.find({ available: true }).populate("recette", "nomJus");
    const stocks = await StockBoutique.find({});
    const stockMap = {};
    stocks.forEach((s) => { stockMap[s.nomJus] = s.stockActuel; });//transforme le tableau en dictionnaire

    const result = [];
    for (const produit of products) {//prépare le tableau resultat et parcourt chaque produit
      let nomJus = produit.recette?.nomJus;

      if (!nomJus) {//fallback fuzzy match
        const nomProdNorm = normalize(produit.name);
        const match = stocks.find((s) => {
          const nomStockNorm = normalize(s.nomJus);
          const mots = nomStockNorm.split(" ").filter((m) => m.length > 2 && m !== "jus");
          return mots.length > 0 && mots.every((m) => nomProdNorm.includes(m));
        });
        nomJus = match ? match.nomJus : null;
      }

      if (!nomJus) continue;

      const dispo = Math.max(0, parseFloat((stockMap[nomJus] || 0).toFixed(2)));
      const unitsDispo = Math.floor(dispo);
      if (unitsDispo <= 0) continue;

      result.push({//pusher resultat f tableaux
        _id: produit._id,
        nom: produit.name,
        nomJus,
        volume: produit.volume,
        prix: produit.price,
        image: produit.image || "",
        unitsDispo,
        litresDispo: dispo,
      });
    }

    res.json(result);//retourner resultat
  } catch (error) {//erreur
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f4:generation de pdf 
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

    if (vente.escompte > 0) {
      const totalBrut = vente.total + vente.escompte;
      doc.fontSize(10).font("Helvetica").text(`Sous-total : ${totalBrut.toFixed(2)} DT`, { align: "right" });
      doc.fontSize(10).font("Helvetica").fillColor("red").text(`Escompte 10% : − ${vente.escompte.toFixed(2)} DT`, { align: "right" });
      doc.fillColor("black");
    }
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
