import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const API_URL = "http://localhost:5000/api/chatbot/message";

const WELCOME_MESSAGE = {
  id: 0,
  from: "bot",
  text: "👋 Bonjour ! Je suis l'assistant SmartJuice. Comment puis-je vous aider ? Posez-moi vos questions sur nos produits, horaires, livraison ou notre adresse 😊",
};

const QUICK_SUGGESTIONS = [
  "Quels sont vos horaires ?",
  "Comment livrez-vous ?",
  "Vos produits sont naturels ?",
  "Où êtes-vous situés ?",
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMsg = { id: Date.now(), from: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur serveur");
      }

      // Chaque réponse détectée = bulle séparée (multi-intent)
      const botMessages = data.responses.map((r, i) => ({
        id: Date.now() + i + 1,
        from: "bot",
        text: r,
      }));

      setMessages((prev) => [...prev, ...botMessages]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 99,
          from: "bot",
          text: "😔 Désolé, une erreur s'est produite. Veuillez réessayer.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatbot-wrapper">
      {/* ── Fenêtre de chat ── */}
      {open && (
        <div className="chatbot-window">
          {/* En-tête */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🧃</div>
              <div>
                <p className="chatbot-title">Assistant SmartJuice</p>
                <p className="chatbot-status">En ligne · Répond instantanément</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Fermer">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-msg chatbot-msg--${msg.from}`}>
                {msg.from === "bot" && <span className="chatbot-msg-avatar">🧃</span>}
                <span className="chatbot-msg-bubble">{msg.text}</span>
              </div>
            ))}

            {/* Indicateur de frappe */}
            {loading && (
              <div className="chatbot-msg chatbot-msg--bot">
                <span className="chatbot-msg-avatar">🧃</span>
                <span className="chatbot-msg-bubble chatbot-typing">
                  <span /><span /><span />
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions rapides */}
          <div className="chatbot-suggestions">
            {QUICK_SUGGESTIONS.map((s) => (
              <button key={s} className="chatbot-suggestion-btn" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>

          {/* Zone de saisie */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              placeholder="Écrivez votre message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={300}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Envoyer"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ── */}
      <button
        className={`chatbot-fab ${open ? "chatbot-fab--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Ouvrir le chatbot"
      >
        {open ? "✕" : "🧃"}
        {!open && <span className="chatbot-fab-badge">?</span>}
      </button>
    </div>
  );
}
