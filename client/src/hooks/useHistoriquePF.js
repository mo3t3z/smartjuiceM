import { useState } from "react";
import { authHeader } from "../utils/api";

export function buildTimelinePF(data) {
  if (!data) return [];
  const events = [
    ...data.productions.map((p) => ({
      id: p._id,
      date: new Date(p.dateProduction),
      kind: "production",
      quantite: p.quantiteProduite,
      par: p.enregistrePar?.email || "—",
      deductions: p.deductionsMP,
    })),
    ...data.transferts.map((t) => ({
      id: t._id,
      date: new Date(t.date),
      kind: "transfert",
      quantite: t.quantite,
      par: t.enregistrePar?.email || "—",
    })),
  ];
  return events.sort((a, b) => b.date - a.date);
}

export function useHistoriquePF(apiBase) {
  const [histModal, setHistModal]     = useState(null);
  const [histData, setHistData]       = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  const openHistorique = async (nomJus) => {
    setHistModal(nomJus);
    setHistData(null);
    setHistLoading(true);
    try {
      const res = await fetch(`${apiBase}/historique/pf/${encodeURIComponent(nomJus)}`, {
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
