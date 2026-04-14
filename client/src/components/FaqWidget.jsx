import { useState } from "react";
import "./FaqWidget.css";

const FAQ_DATA = [
  {
    question: "Combien de verres dans 1 litre ?",
    answer: "1 litre correspond à 5 verres.",
  },
  {
    question: "Y a-t-il une réduction sur les grandes commandes ?",
    answer: "Oui, une réduction de 10% est appliquée automatiquement sur toute commande supérieure à 200 DT.",
  },
  {
    question: "Comment se fait la livraison ?",
    answer: "La livraison est disponible avec des frais de 3 DT. Vous pouvez aussi choisir de récupérer votre commande directement en boutique sans frais supplémentaires.",
  },
  {
    question: "Où se trouve la boutique ?",
    answer: "Nous sommes situés Rue Haj Ali Soua, Ksar Hellal, en face de Tijari Bank.",
  },
  {
    question: "Les jus contiennent-ils des conservateurs ?",
    answer: "Non. Nos jus sont 100% naturels et sans conservateurs. Les options sans sucre ne sont pas disponibles pour le moment.",
  },
  {
    question: "Combien de temps puis-je conserver mon jus ?",
    answer: "Au réfrigérateur : 3 jours maximum. Au congélateur : jusqu'à 6 mois. Si votre jus est congelé, sortez-le la veille et placez-le au réfrigérateur pour qu'il décongèle progressivement avant consommation.",
  },
  {
    question: "Les jus sont-ils préparés à l'avance ?",
    answer: "Non, tous nos jus sont préparés le jour même de votre commande, pour garantir une fraîcheur optimale.",
  },
  {
    question: "Quels sont vos horaires ?",
    answer: "Nous sommes ouverts 7j/7 de 09h00 à 17h00.",
  },
  {
    question: "Jusqu'à quand puis-je planifier une commande ?",
    answer: "Vous pouvez passer une commande pour une date allant jusqu'à 3 mois à l'avance. Au-delà de cette période, la commande ne peut pas être acceptée.",
  },
];

export default function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="faq-widget">
      <button
        className="faq-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Questions fréquentes"
      >
        <span className="faq-trigger-icon">?</span>
        <span className="faq-trigger-label">FAQ</span>
      </button>

      {open && (
        <div className="faq-panel">
          <div className="faq-panel-header">
            <span>Questions fréquentes</span>
            <button className="faq-close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="faq-list">
            {FAQ_DATA.map((item, i) => (
              <div key={i} className={`faq-item ${openIndex === i ? "faq-item--open" : ""}`}>
                <button className="faq-question" onClick={() => toggle(i)}>
                  <span>{item.question}</span>
                  <span className="faq-chevron">{openIndex === i ? "▲" : "▼"}</span>
                </button>
                {openIndex === i && (
                  <div className="faq-answer">{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
