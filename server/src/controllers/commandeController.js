import PDFDocument from "pdfkit";
import Commande from "../models/Commande.js";
import NotificationClient from "../models/NotificationClient.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import { calcStockPFAtelier, verifierAlertePF } from "../services/stockPFService.js";
/**f1:fonction construit une date complet et verifie si elle a été passer,f2:fonction de creation de commande en ligne
f3: recupérer l'etat de commande passer par le client,f4:recupérer les commandes ely andhom el etat en attentes
f5:recupérer toutes les commandes selon leur statut,f6 validations de commandes par gerant,f7:refuserCommande
f8:recuper les commandes confirmé pour atelier,f9:marquer une commande prete pour reserver le stock,f10:commande marqué comme livrée par l'atelier
f11: creation d'une commande physique ,f12:generation d'un recu de commande,f13 recupération de tous les notif par le client
f14 marquage d'une notif lue par le client,f15 marquage de tous les notif lue par le client**/
const SEUIL_REMISE    = 200;
const TAUX_REMISE     = 0.10;
const FRAIS_LIVRAISON = 3;
//f1:fonction construit une date complet et verifie si elle a été passer
const isPastDateTime = (dateStr, heureStr) => {
  const [h, min] = heureStr.split(":").map(Number);
  const dt = new Date(dateStr);
  dt.setHours(h, min, 0, 0);
  return dt <= new Date();
};
//f2:fonction de creation de commande en ligne 
export const creerCommandeEnLigne = async (req, res) => {
  try {
    const { produits, modeRemise, adresseLivraison, telephoneLivraison, fraisLivraison, dateRetrait, heureRetrait } = req.body;

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "Le panier est vide." });
    }

    // Validation date et heure
    if (!dateRetrait) {
      return res.status(400).json({ message: "La date de retrait est obligatoire." });
    }
    if (!heureRetrait) {
      return res.status(400).json({ message: "L'heure de retrait est obligatoire." });
    }
    if (isPastDateTime(dateRetrait, heureRetrait)) {//etthebet ken date tadet wle 
      return res.status(400).json({ message: "La date et l'heure choisies sont déjà passées." });
    }
    const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);//1000 signifie millie sc
    if (new Date(dateRetrait) > maxDate) {
      return res.status(400).json({ message: "La date doit être comprise entre aujourd'hui et 3 mois à venir." });
    }

    // ken ekhter livraison lezm yhot addresse
    const mode = modeRemise === "livraison" ? "livraison" : "retrait";
    if (mode === "livraison" && !adresseLivraison?.trim()) {
      return res.status(400).json({ message: "L'adresse de livraison est obligatoire." });
    }

    // Récupérer les produits depuis la base de données pour vérification
    const produitsDetails = [];
    let total = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);//lewej al pdt bel id f db
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });
      }
      if (!produit.available) {
        return res.status(400).json({ message: `Produit non disponible: ${produit.name}` });
      }

      const ligneTotal = produit.price * item.quantite;
      total += ligneTotal;

      produitsDetails.push({//envoie de commande a la fin de tableau
        produit: produit._id,
        nom: produit.name,
        volume: produit.volume,
        quantite: item.quantite,
        prixUnitaire: produit.price,
      });
    }

    const frais = mode === "livraison" ? parseFloat(fraisLivraison) || FRAIS_LIVRAISON : 0;
    //ken totale akber mel seuil de remise ely houwa 200d on applique 0.10%
    const remiseEnLigne = total > SEUIL_REMISE ? parseFloat((total * TAUX_REMISE).toFixed(3)) : 0;
    //creation de commande
    const commande = await Commande.create({
      client: req.user._id,
      nomClient: `${req.user.prenom || ""} ${req.user.nom || ""}`.trim() || req.user.email,
      telephone: req.user.telephone || "",
      produits: produitsDetails,
      remise: remiseEnLigne,
      total: parseFloat((total - remiseEnLigne + frais).toFixed(3)),
      statut: "en_attente",
      type: "en_ligne",
      modeRemise: mode,
      adresseLivraison: mode === "livraison" ? adresseLivraison.trim() : "",
      telephoneLivraison: mode === "livraison" ? telephoneLivraison?.trim() || "" : "",
      fraisLivraison: frais,
      dateRetrait: new Date(dateRetrait),
      heureRetrait: heureRetrait || "",
    });

    const populated = await commande.populate("client", "email nom prenom telephone");

    // Notification pour le gérant
    //créer  un nom complet pour le client a fin de le notifier
    const nomClient = `${req.user.prenom || ""} ${req.user.nom || ""}`.trim() || req.user.email;
    const modeMsg = mode === "livraison" ? "livraison" : "retrait en atelier";
    await Notification.create({//creation de msg de notif pour le manager
      categorie: "COMMANDE",
      commandeRef: commande._id,
      message: `Nouvelle commande en ligne de ${nomClient} — ${commande.produits.length} article(s) — Total : ${commande.total.toFixed(2)} DT (${modeMsg}).`,
      luManager: false,
    });

    res.status(201).json({ message: "Commande passée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f3: recupérer l'etat de commande passer par le client 
export const getMesCommandes = async (req, res) => {
  try {
    const commandes = await Commande.find({ client: req.user._id })
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f4:recupérer les commandes ely andhom el etat en attentes
export const getCommandesEnAttente = async (req, res) => {
  try {
    const commandes = await Commande.find({ statut: "en_attente" })
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .sort({ createdAt: -1 });//récent en premier

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f5:recupérer toutes les commandes selon leur statut
export const getToutesCommandes = async (req, res) => {
  try {
    const { statut, type } = req.query;

    const filtre = {};
    if (statut) filtre.statut = statut;//filtre selon le statut 
    if (type) filtre.type = type;//filtre selon le type 

    const commandes = await Commande.find(filtre)
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .populate("livreePar", "email nom prenom role")
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f6 validations de commandes par gerant
export const validerCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);//chercher la commande par son id passer en url
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "en_attente") {
      return res.status(400).json({ message: "La commande n'est plus en attente." });
    }
    //lenna ken c bon l9yneha w l9yneha en attents nrodouha validé
    commande.statut = "validee";
    await commande.save();

    if (commande.client) {//commande.client verfie que ce une commande en ligne /puis envoie de notif
      await NotificationClient.create({
        client: commande.client,
        commande: commande._id,
        statut: "validee",
        message: `Votre commande #${commande._id.toString().slice(-6).toUpperCase()} a été acceptée.`,
      });
    }
    //retourner la commande en front avec le nouveau etat 
    const populated = await commande.populate("client", "email nom prenom");
    res.json({ message: "Commande validée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f7:refuserCommande
export const refuserCommande = async (req, res) => {//commande doit exister et en attente
  try {
    const { commentaireRefus } = req.body;
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "en_attente") {
      return res.status(400).json({ message: "La commande n'est plus en attente." });
    }
    //chanegr el statut w alech 
    commande.statut = "refusee";
    commande.commentaireRefus = commentaireRefus || "";
    await commande.save();

    if (commande.client) {//créer notification client
      await NotificationClient.create({
        client: commande.client,
        commande: commande._id,
        statut: "refusee",
        message: `Votre commande #${commande._id.toString().slice(-6).toUpperCase()} a été refusée.${commentaireRefus ? ` Motif : ${commentaireRefus}` : ""}`,
      });
    }
    //retourner la commmande mise a jour coté front
    const populated = await commande.populate("client", "email nom prenom");
    res.json({ message: "Commande refusée.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f8:recuper les commandes confirmé pour atelier
export const getCommandesConfirmees = async (req, res) => {
  try {
    const { date, mois } = req.query; // date="YYYY-MM-DD" | mois="YYYY-MM"
    const filtre = { statut: { $in: ["validee", "prete", "livree"] } };//le atelier voit les commande de ces 3 statut

    if (date) {
      const debut = new Date(date);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(date);
      fin.setHours(23, 59, 59, 999);
      filtre.dateRetrait = { $gte: debut, $lte: fin };
    } else if (mois) {
      const [annee, moisNum] = mois.split("-").map(Number);
      const debut = new Date(annee, moisNum - 1, 1, 0, 0, 0, 0);
      const fin   = new Date(annee, moisNum, 0, 23, 59, 59, 999); // dernier jour du mois
      filtre.dateRetrait = { $gte: debut, $lte: fin };
    }

    const commandes = await Commande.find(filtre)
      .populate("client", "email nom prenom telephone")
      .populate("enregistrePar", "email nom prenom")
      .sort({ dateRetrait: 1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f9:marquer une commande prete pour reserver le stock 
export const marquerPrete = async (req, res) => {
  try {//lewej al commande bel id 
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (commande.statut !== "validee") {//ken commmande mwjouda w etat mte3ha msh validé
      return res.status(400).json({ message: "La commande doit être validée pour être marquée prête." });
    }

    // Vérifier que le stock PF atelier est suffisant pour chaque produit
    const stockInsuffisant = [];
    for (const p of commande.produits) {
      const litresRequis = p.quantite;
      //Ehseb chfme stock andek f atelier
      const stockActuel = await calcStockPFAtelier(p.nom);
      if (stockActuel < litresRequis) {
        stockInsuffisant.push({
          nom: p.nom,
          volume: p.volume,
          requis: litresRequis,
          disponible: parseFloat(stockActuel.toFixed(2)),
        });
      }
    }
    //produit lmewjoud f stock dhhor chwye
    if (stockInsuffisant.length > 0) {
      return res.status(400).json({
        message: "Stock PF atelier insuffisant pour marquer cette commande prête.",
        stockInsuffisant,
      });
    }
    //lena ken mregll yekhou statut prete
    commande.statut = "prete";
    await commande.save();
    //lenna kenhy commande en ligne chnw chyousel msg lel client
    if (commande.client) {
      const modeMsg = commande.modeRemise === "livraison"
        ? "Votre commande est prête et sera livrée bientôt."
        : "Votre commande est prête. Vous pouvez venir la récupérer.";
      await NotificationClient.create({//creation de notification client
        client: commande.client,
        commande: commande._id,
        statut: "prete",
        message: `Votre commande #${commande._id.toString().slice(-6).toUpperCase()} est prête — ${modeMsg}`,
      });
    }

    // Notification pour le gérant
    const typeCommande = commande.type === "en_ligne" ? "En ligne" : "Physique";
    await Notification.create({
      categorie: "COMMANDE",
      commandeRef: commande._id,
      message: `Commande #${commande._id.toString().slice(-6).toUpperCase()} (${typeCommande}) est prête — signalée par l'atelier.`,
      luManager: false,
    });

    res.json({ message: "Commande marquée comme prête.", commande });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
//f10:commande marqué comme livrée par l'atelier
export const marquerLivree = async (req, res) => {
  try {//cherchi al commande b id
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande introuvable." });
    if (!["prete"].includes(commande.statut)) {
      return res.status(400).json({ message: "La commande doit être prête pour être marquée livrée." });
    }
    //ken statut mte3ha prete
    commande.statut = "livree";
    commande.livreePar = req.user._id;
    await commande.save();

    if (commande.client) {
      await NotificationClient.create({//crée une notification client
        client: commande.client,
        commande: commande._id,
        statut: "livree",
        message: `Votre commande #${commande._id.toString().slice(-6).toUpperCase()} a été livrée. Merci pour votre confiance !`,
      });
    }

    // Notification pour le gérant
    const typeCommande = commande.type === "en_ligne" ? "En ligne" : "Physique";
    const livrePar = `${req.user.prenom || ""} ${req.user.nom || ""}`.trim() || req.user.email;
    await Notification.create({
      categorie: "COMMANDE",
      commandeRef: commande._id,
      message: `Commande #${commande._id.toString().slice(-6).toUpperCase()} (${typeCommande}) a été livrée par ${livrePar}.`,
      luManager: false,
    });

    // Vérifier les alertes PF atelier après la livraison 
    const nomsJus = [...new Set(commande.produits.map((p) => p.nom))];
    for (const nomJus of nomsJus) {
      await verifierAlertePF(nomJus);
    }

    res.json({ message: "Commande marquée comme livrée.", commande });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f11: creation d'une commande physique 
export const creerCommandePhysique = async (req, res) => {
  try {
    const { nomClient, telephone, modeRemise, adresseLivraison, fraisLivraison, dateRetrait, heureRetrait, produits } = req.body;

    if (!produits || produits.length === 0) {
      return res.status(400).json({ message: "La commande doit contenir au moins un produit." });
    }
    if (!nomClient?.trim()) {
      return res.status(400).json({ message: "Le nom et prénom du client est obligatoire." });
    }
    if (!telephone?.trim()) {
      return res.status(400).json({ message: "Le numéro de téléphone est obligatoire." });
    }
    if (!dateRetrait) {
      return res.status(400).json({ message: "La date est obligatoire." });
    }
    //chenchoufou ken tfout 3 mois wle
    const today = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);//1000 ml sc
    const dateDemande = new Date(dateRetrait);
    if (dateDemande < today || dateDemande > maxDate) {
      return res.status(400).json({ message: "La date doit être comprise entre aujourd'hui et 3 mois à venir." });
    }
    if (!heureRetrait) {
      return res.status(400).json({ message: "L'heure est obligatoire." });
    }
    if (isPastDateTime(dateRetrait, heureRetrait)) {
      return res.status(400).json({ message: "La date et l'heure choisies sont déjà passées." });
    }
    //ken ekkhter livraison lezm nhotou adresse
    const mode = modeRemise === "livraison" ? "livraison" : "retrait";
    if (mode === "livraison" && !adresseLivraison?.trim()) {
      return res.status(400).json({ message: "L'adresse de livraison est obligatoire." });
    }

    const produitsDetails = [];//chnrfou fyh nom volume qte prix te3 commande
    let sousTotal = 0;

    for (const item of produits) {
      const produit = await Product.findById(item.produitId);//lena lewj al pdt b id
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable: ${item.produitId}` });//lena ken 9ynechi
      }

      const ligneTotal = produit.price * item.quantite;
      sousTotal += ligneTotal;

      produitsDetails.push({//zyd commande f tableau
        produit: produit._id,
        nom: produit.name,
        volume: produit.volume,
        quantite: item.quantite,
        prixUnitaire: produit.price,
      });
    }
    //lena nchoufou est ce que chnaplikiw remise w chnzidou frais livraison wle,
    const remise = sousTotal > SEUIL_REMISE ? parseFloat((sousTotal * TAUX_REMISE).toFixed(3)) : 0;
    const frais  = mode === "livraison" ? (fraisLivraison || FRAIS_LIVRAISON) : 0;
    const total  = parseFloat((sousTotal - remise + frais).toFixed(3));

    const commande = await Commande.create({//creation du commande 
      nomClient: nomClient.trim(),
      telephone: telephone.trim(),
      modeRemise: mode,
      adresseLivraison: mode === "livraison" ? adresseLivraison.trim() : "",
      fraisLivraison: frais,
      dateRetrait: new Date(dateRetrait),
      heureRetrait: heureRetrait || "",
      produits: produitsDetails,
      remise,
      total,
      statut: "validee",   // commande physique = validée automatiquement
      type: "physique",
      enregistrePar: req.user._id,
    });
    //sucess msg of creation
    const populated = await commande.populate("enregistrePar", "email nom prenom");
    res.status(201).json({ message: "Commande physique enregistrée avec succès.", commande: populated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

//f12:generation d'un recu de commande
export const genererRecuCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)//lewej al commande bel id
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
    doc.text(`N° Commande      : ${commande._id}`);
    doc.text(`Date de passation : ${new Date(commande.createdAt).toLocaleString("fr-TN")}`);
    if (commande.dateRetrait) {
      const dateRecup = new Date(commande.dateRetrait).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" });
      const heureRecup = commande.heureRetrait ? ` à ${commande.heureRetrait}` : "";
      const labelRecup = commande.modeRemise === "livraison" ? "Date de livraison " : "Date de récupération";
      doc.text(`${labelRecup} : ${dateRecup}${heureRecup}`);
    }
    doc.text(`Type              : ${commande.type === "en_ligne" ? "Commande en ligne" : "Commande boutique"}`);
    doc.text(`Statut            : ${commande.statut.replace("_", " ").toUpperCase()}`);

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

    // ── Mode de remise ───────────────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica-Bold").text("Mode de remise :");
    doc.fontSize(10).font("Helvetica");
    if (commande.modeRemise === "livraison") {
      doc.text("Livraison à domicile");
      doc.text(`Adresse : ${commande.adresseLivraison}`);
      if (commande.telephoneLivraison) doc.text(`Tél livraison : ${commande.telephoneLivraison}`);
    } else {
      doc.text("Récupération");
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

    // Recalculer le sous-total brut (avant remise et frais)
    const sousTotalBrut = commande.produits.reduce((s, p) => s + p.quantite * p.prixUnitaire, 0);
    const remiseMontant = commande.remise || 0;
    const fraisMontant  = commande.fraisLivraison || 0;

    const afficherDetails = remiseMontant > 0 || fraisMontant > 0;
    if (afficherDetails) {
      doc.fontSize(11).font("Helvetica").text(`Sous-total : ${sousTotalBrut.toFixed(2)} DT`, { align: "right" });
      if (remiseMontant > 0) {
        doc.fontSize(11).font("Helvetica").fillColor("green")
          .text(`Remise (10%) : − ${remiseMontant.toFixed(2)} DT`, { align: "right" });
        doc.fillColor("black");
      }
      if (fraisMontant > 0) {
        doc.fontSize(11).font("Helvetica").text(`Frais de livraison : + ${fraisMontant.toFixed(2)} DT`, { align: "right" });
      }
      doc.moveDown(0.2);
    }
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

//f13 recupération de tous les notif par le client
export const getMesNotifications = async (req, res) => {//requpére les notif
  try {
    const notifs = await NotificationClient.find({ client: req.user._id })
      .sort({ createdAt: -1 })//m jdyd lel 9dim
      .limit(30);
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
//f14 marquage d'une notif lue par le client
export const marquerNotifLue = async (req, res) => {
  try {
    const notif = await NotificationClient.findOneAndUpdate(
      { _id: req.params.id, client: req.user._id },
      { lue: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification introuvable." });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
//f15 marquage de tous les notif lue par le client
export const marquerToutesNotifsLues = async (req, res) => {
  try {
    await NotificationClient.updateMany({ client: req.user._id, lue: false }, { lue: true });
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
