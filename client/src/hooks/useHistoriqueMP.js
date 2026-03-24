import { useState } from "react";
import { authHeader } from "../utils/api";

export function buildTimelineMP(data) {
  if (!data) return [];
  const events = [
    ...data.additions.map((a) => ({
      id: a._id,
      date: new Date(a.dateEntree),
      kind: "addition",
      quantite: a.quantite,
      unite: a.unite,
      par: a.enregistrePar?.email || "—",
      fournisseur: a.fournisseur || null,
      prix: a.prixUnitaire,
    })),
    ...data.reductions.map((r) => ({
      id: r._id,
      date: new Date(r.date),
      kind: "reduction",
      quantite: r.quantite,
      unite: r.unite,
      par: r.enregistrePar?.email || "—",
      nomJus: r.nomJus,
      qtyProduite: r.quantiteProduite,
    })),
  ];
  return events.sort((a, b) => b.date - a.date);
}

export function useHistoriqueMP(apiBase) {
  const [histModal, setHistModal]     = useState(null);
  const [histData, setHistData]       = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  const openHistorique = async (type) => {
    setHistModal(type);
    setHistData(null);
    setHistLoading(true);
    try {
      const res = await fetch(`${apiBase}/historique/mp/${encodeURIComponent(type)}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Erreur chargement historique.");
      setHistData(await res.json());
    } catch (e) {
      setHistData({ error: e.message });
    } finally {
      setHistLoading(false);
    }
  };

  const closeHistorique = () => setHistModal(null);

  return { histModal, histData, histLoading, openHistorique, closeHistorique };
}
