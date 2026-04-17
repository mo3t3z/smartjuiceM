import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authHeader, API_COMMANDES, API_PRODUCTS } from "../../utils/api";
import "./NouvelleCommandePhysique.css";

const FRAIS_LIVRAISON = 3;
const SEUIL_REMISE = 200;
const TAUX_REMISE = 0.10;

export default function NouvelleCommandePhysique() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState([]);
  const [panier, setPanier] = useState([]);

  const [nomClient, setNomClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [jour, setJour] = useState("");
  const [mois, setMois] = useState("");
  const [annee, setAnnee] = useState("");
  const [heure, setHeure] = useState("");
  const [mode, setMode] = useState("retrait");
  const [adresse, setAdresse] = useState("");

  const [message, setMessage] = useState({ texte: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [commandeCreee, setCommandeCreee] = useState(null);

  const todayObj = new Date(); todayObj.setHours(0,0,0,0);
  const maxObj = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Convertir jj/mm/aaaa → "YYYY-MM-DD"
  const date = (jour.length === 2 && mois.length === 2 && annee.length === 4)
    ? `${annee}-${mois}-${jour}`
    : "";

  const dateObjValide = date ? new Date(date) : null;
  const dateErreur = (() => {
    if (!jour && !mois && !annee) return "";
    const m = parseInt(mois), j = parseInt(jour);
    if (annee.length === 4) {
      if (m < 1 || m > 12) return "Mois invalide (01–12).";
      if (j < 1 || j > 31) return "Jour invalide (01–31).";
      if (dateObjValide && isNaN(dateObjValide.getTime())) return "Date invalide.";
      if (dateObjValide && dateObjValide < todayObj) return "La date ne peut pas être dans le passé.";
      if (dateObjValide && dateObjValide > maxObj) return "La date ne peut pas dépasser 3 mois.";
    }
    return "";
  })();

  // Vérifie si date + heure est dans le futur (si c'est aujourd'hui)
  const heureErreurPassee = (() => {
    if (!date || !heure || dateErreur) return false;
    const maintenant = new Date();
    const [h, min] = heure.split(":").map(Number);
    const dateHeure = new Date(date);
    dateHeure.setHours(h, min, 0, 0);
    return dateHeure <= maintenant;
  })();

  useEffect(() => { fetchCatalogue(); }, []);

  const fetchCatalogue = async () => {
    try {
      const res = await axios.get(`${API_PRODUCTS}/catalog`);
      setCatalogue(res.data);
    } catch {
      setMessage({ texte: "Impossible de charger le catalogue.", type: "erreur" });
    }
  };

  const ajouterProduit = (produit) => {
    const existant = panier.find((p) => p.produitId === produit._id);
    if (existant) {
      setPanier(panier.map((p) =>
        p.produitId === produit._id ? { ...p, quantite: p.quantite + 1 } : p
      ));
    } else {
      setPanier([...panier, {
        produitId: produit._id,
        nom: produit.name,
        volume: produit.volume,
        prix: produit.price,
        quantite: 1,
      }]);
    }
  };

  const modifierQuantite = (produitId, delta) => {
    setPanier(
      panier
        .map((p) => p.produitId === produitId ? { ...p, quantite: p.quantite + delta } : p)
        .filter((p) => p.quantite > 0)
    );
  };

  const prixTotal = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);
  const remise = prixTotal > SEUIL_REMISE ? prixTotal * TAUX_REMISE : 0;
  const frais = mode === "livraison" ? FRAIS_LIVRAISON : 0;
  const netAPayer = (prixTotal - remise + frais).toFixed(2);

  // Le formulaire est valide quand tous les champs requis sont remplis
  const dateValide = date !== "" && dateErreur === "";
  const heureValide = heure !== "" && heure >= "09:00" && heure <= "17:00" && !heureErreurPassee;
  const formValide =
    panier.length > 0 &&
    nomClient.trim() !== "" &&
    telephone.trim() !== "" &&
    dateValide &&
    heureValide &&
    (mode === "retrait" || adresse.trim() !== "");

  const enregistrerCommande = async () => {
    if (!formValide) {
      if (panier.length === 0) return setMessage({ texte: "Ajoutez au moins un produit.", type: "erreur" });
      if (!nomClient.trim()) return setMessage({ texte: "Le nom et prénom est obligatoire.", type: "erreur" });
      if (!telephone.trim()) return setMessage({ texte: "Le numéro de téléphone est obligatoire.", type: "erreur" });
      if (!date) return setMessage({ texte: "Veuillez choisir une date.", type: "erreur" });
      if (!dateValide) return setMessage({ texte: "La date doit être entre aujourd'hui et 3 mois à venir.", type: "erreur" });
      if (!heure) return setMessage({ texte: "Veuillez choisir une heure.", type: "erreur" });
      if (mode === "livraison" && !adresse.trim()) return setMessage({ texte: "L'adresse de livraison est obligatoire.", type: "erreur" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_COMMANDES}/physique`,
        {
          nomClient: nomClient.trim(),
          telephone: telephone.trim(),
          modeRemise: mode,
          adresseLivraison: adresse.trim(),
          fraisLivraison: frais,
          dateRetrait: date,
          heureRetrait: heure,
          produits: panier.map((p) => ({ produitId: p.produitId, quantite: p.quantite })),
        },
        { headers: authHeader() }
      );

      setCommandeCreee(res.data.commande);
      setPanier([]);
      setNomClient(""); setTelephone(""); setJour(""); setMois(""); setAnnee(""); setHeure(""); setAdresse(""); setMode("retrait");
      setMessage({ texte: "Commande physique enregistrée !", type: "succes" });
      setTimeout(() => setMessage({ texte: "", type: "" }), 5000);
    } catch (err) {
      setMessage({ texte: err.response?.data?.message || "Erreur lors de l'enregistrement.", type: "erreur" });
    } finally {
      setLoading(false);
    }
  };

  const telechargerRecu = async (commandeId) => {
    try {
      const res = await axios.get(`${API_COMMANDES}/${commandeId}/recu`, {
        headers: authHeader(), responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `recu-commande-${commandeId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ texte: "Erreur lors du téléchargement du reçu.", type: "erreur" });
    }
  };

  return (
    <div className="ncp-page">
      {message.texte && (
        <div className={`ncp-message ncp-message--${message.type}`}>
          {message.texte}
          <button className="ncp-msg-close" onClick={() => setMessage({ texte: "", type: "" })}>✕</button>
        </div>
      )}

      {commandeCreee && (
        <div className="ncp-success-banner">
          <span>✓ Commande #{commandeCreee._id.slice(-6).toUpperCase()} enregistrée (en attente de validation)</span>
          <button className="ncp-recu-btn" onClick={() => telechargerRecu(commandeCreee._id)}>Télécharger le reçu PDF</button>
          <button className="ncp-nouvelle-btn" onClick={() => setCommandeCreee(null)}>+ Nouvelle commande</button>
        </div>
      )}

      {!commandeCreee && (
        <div className="ncp-content">

          {/* ── Colonne gauche : catalogue ── */}
          <div className="ncp-catalogue">
            <h2 className="ncp-section-title">Sélectionner les produits</h2>
            <div className="ncp-produits-grid">
              {catalogue.map((produit) => (
                <div key={produit._id} className="ncp-produit-card">
                  {produit.image && <img src={produit.image} alt={produit.name} className="ncp-produit-img" />}
                  <div className="ncp-produit-info">
                    <h3 className="ncp-produit-nom">{produit.name}</h3>
                    <span className="ncp-produit-vol">{produit.volume}</span>
                    <span className="ncp-produit-prix">{produit.price} DT</span>
                  </div>
                  <button className="ncp-ajouter-btn" onClick={() => ajouterProduit(produit)}>+ Ajouter</button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Colonne droite : récap + formulaire + bouton ── */}
          <div className="ncp-sidebar">

            {/* Récapitulatif */}
            <div className="ncp-card">
              <h2 className="ncp-section-title">Récapitulatif</h2>

              {panier.length === 0 ? (
                <p className="ncp-panier-vide">Aucun article sélectionné.</p>
              ) : (
                <>
                  {panier.map((p) => (
                    <div key={p.produitId} className="ncp-recap-item">
                      <div className="ncp-recap-info">
                        <span className="ncp-recap-nom">{p.nom}</span>
                        <span className="ncp-recap-vol">{p.volume}</span>
                      </div>
                      <div className="ncp-recap-qte">
                        <button className="ncp-qty-btn" onClick={() => modifierQuantite(p.produitId, -1)}>−</button>
                        <input
                          className="ncp-qty-input"
                          type="text"
                          inputMode="numeric"
                          value={p.quantite}
                          onChange={(e) => {
                            const v = parseInt(e.target.value.replace(/\D/g, ""));
                            if (!isNaN(v) && v > 0) {
                              setPanier(panier.map((item) =>
                                item.produitId === p.produitId ? { ...item, quantite: v } : item
                              ));
                            } else if (e.target.value === "") {
                              setPanier(panier.map((item) =>
                                item.produitId === p.produitId ? { ...item, quantite: "" } : item
                              ));
                            }
                          }}
                          onBlur={(e) => {
                            if (!e.target.value || parseInt(e.target.value) < 1) {
                              setPanier(panier.filter((item) => item.produitId !== p.produitId));
                            }
                          }}
                        />
                        <button className="ncp-qty-btn" onClick={() => modifierQuantite(p.produitId, +1)}>+</button>
                      </div>
                      <span className="ncp-recap-st">{(p.prix * p.quantite).toFixed(2)} DT</span>
                    </div>
                  ))}

                  <div className="ncp-recap-table">
                    <div className="ncp-recap-row">
                      <span>Prix total</span>
                      <span>{prixTotal.toFixed(2)} DT</span>
                    </div>
                    {remise > 0 && (
                      <div className="ncp-recap-row ncp-recap-row--remise">
                        <span>Remise (10%)</span>
                        <span>− {remise.toFixed(2)} DT</span>
                      </div>
                    )}
                    {mode === "livraison" && (
                      <div className="ncp-recap-row">
                        <span>Frais de livraison</span>
                        <span>+ {FRAIS_LIVRAISON.toFixed(2)} DT</span>
                      </div>
                    )}
                    <div className="ncp-recap-row ncp-recap-row--net">
                      <span>Net à payer</span>
                      <span>{netAPayer} DT</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Informations client */}
            <div className="ncp-card">
              <h2 className="ncp-section-title">Informations client</h2>

              <div className="ncp-field">
                <label className="ncp-label">Nom et Prénom *</label>
                <input className="ncp-input" type="text" value={nomClient}
                  onChange={(e) => setNomClient(e.target.value)} placeholder="Ex: Ahmed Ben Ali" />
              </div>

              <div className="ncp-field">
                <label className="ncp-label">Numéro de téléphone *</label>
                <input className="ncp-input" type="tel" value={telephone}
                  onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: 55 123 456" />
              </div>

              <div className="ncp-row2">
                <div className="ncp-field">
                  <label className="ncp-label">Date * <span className="ncp-hint">(jj / mm / aaaa)</span></label>
                  <div className={`ncp-date-inputs ${dateErreur ? "ncp-date-inputs--error" : ""}`}>
                    <input
                      className="ncp-date-part"
                      type="text" inputMode="numeric" maxLength={2}
                      value={jour} placeholder="jj"
                      onChange={(e) => { const v = e.target.value.replace(/\D/g,""); setJour(v); if (v.length === 2) e.target.nextSibling?.nextSibling?.focus(); }}
                    />
                    <span className="ncp-date-sep">/</span>
                    <input
                      className="ncp-date-part"
                      type="text" inputMode="numeric" maxLength={2}
                      value={mois} placeholder="mm"
                      onChange={(e) => { const v = e.target.value.replace(/\D/g,""); setMois(v); if (v.length === 2) e.target.nextSibling?.nextSibling?.focus(); }}
                    />
                    <span className="ncp-date-sep">/</span>
                    <input
                      className="ncp-date-part ncp-date-part--year"
                      type="text" inputMode="numeric" maxLength={4}
                      value={annee} placeholder="aaaa"
                      onChange={(e) => { const v = e.target.value.replace(/\D/g,""); setAnnee(v); }}
                    />
                  </div>
                  {dateErreur && <span className="ncp-field-error">{dateErreur}</span>}
                </div>
                <div className="ncp-field">
                  <label className="ncp-label">Heure * <span className="ncp-hint">(09:00–17:00)</span></label>
                  <input
                    className={`ncp-input ${heure && (heure < "09:00" || heure > "17:00" || heureErreurPassee) ? "ncp-input--error" : ""}`}
                    type="time" value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                  />
                  {heure && (heure < "09:00" || heure > "17:00") && (
                    <span className="ncp-field-error">L'heure doit être entre 09:00 et 17:00.</span>
                  )}
                  {heure && heureErreurPassee && heure >= "09:00" && heure <= "17:00" && (
                    <span className="ncp-field-error">Cette heure est déjà passée aujourd'hui.</span>
                  )}
                </div>
              </div>

              <div className="ncp-field">
                <label className="ncp-label">Mode de réception</label>
                <div className="ncp-mode-options">
                  <label className={`ncp-mode-option ${mode === "retrait" ? "ncp-mode-option--active" : ""}`}>
                    <input type="radio" name="mode" value="retrait" checked={mode === "retrait"} onChange={() => setMode("retrait")} />
                    <div className="ncp-mode-content">
                      <span className="ncp-mode-label">Retrait en boutique</span>
                      <span className="ncp-mode-sub">Le client récupère sa commande lui-même</span>
                    </div>
                  </label>
                  <label className={`ncp-mode-option ${mode === "livraison" ? "ncp-mode-option--active" : ""}`}>
                    <input type="radio" name="mode" value="livraison" checked={mode === "livraison"} onChange={() => setMode("livraison")} />
                    <div className="ncp-mode-content">
                      <span className="ncp-mode-label">Livraison à domicile <span className="ncp-frais">(+{FRAIS_LIVRAISON} DT)</span></span>
                      <span className="ncp-mode-sub">Le client reçoit sa commande chez lui</span>
                    </div>
                  </label>
                </div>
              </div>

              {mode === "livraison" && (
                <div className="ncp-field">
                  <label className="ncp-label">Adresse exacte *</label>
                  <textarea className="ncp-input ncp-textarea" rows={3} value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex: 12 Rue de la République, Tunis" />
                </div>
              )}
            </div>

            {/* Bouton commander */}
            <button
              className={`ncp-enregistrer-btn ${formValide ? "ncp-enregistrer-btn--valid" : ""}`}
              onClick={enregistrerCommande}
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer la commande"}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
