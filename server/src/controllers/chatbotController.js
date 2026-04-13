import Intent from "../models/Intent.js";

// ─── Utilitaires de normalisation ────────────────────────────────────────────

/**
 * Normalise une chaîne :
 *  - minuscules
 *  - suppression des accents (NFD → ASCII)
 *  - suppression de la ponctuation superflue
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")                   // décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, "")    // supprime les diacritiques
    .replace(/[^\w\s]/g, " ")           // remplace la ponctuation par espace
    .replace(/\s+/g, " ")              // réduit les espaces multiples
    .trim();
}

/**
 * Tokenise un texte normalisé en tableau de mots.
 */
function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

// ─── Moteur de scoring ────────────────────────────────────────────────────────

/**
 * Calcule le score d'une intention par rapport au message utilisateur.
 *
 * Algorithme :
 *  1. Construire la liste totale des termes = keywords + synonyms
 *  2. Normaliser chaque terme
 *  3. Vérifier si le terme apparaît dans le message (substring ou token exact)
 *  4. Score = nb_termes_matchés * priority
 *
 * @param {string}   normalizedMsg - Message utilisateur déjà normalisé
 * @param {string[]} msgTokens     - Tokens du message utilisateur
 * @param {Object}   intent        - Document Intent MongoDB
 * @returns {number} score (0 si aucune correspondance)
 */
function scoreIntent(normalizedMsg, msgTokens, intent) {
  const allTerms = [...(intent.keywords || []), ...(intent.synonyms || [])];
  let matchCount = 0;

  for (const term of allTerms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;

    // Correspondance exacte sur un token OU présence du terme en sous-chaîne
    const termTokens = tokenize(normalizedTerm);
    if (termTokens.length === 1) {
      // Mot unique : on cherche dans les tokens pour éviter les faux positifs
      if (msgTokens.includes(normalizedTerm)) {
        matchCount++;
      }
    } else {
      // Expression multi-mots : recherche en sous-chaîne du message complet
      if (normalizedMsg.includes(normalizedTerm)) {
        matchCount++;
      }
    }
  }

  return matchCount > 0 ? matchCount * intent.priority : 0;
}

// ─── Fonction principale d'analyse ───────────────────────────────────────────

/**
 * Analyse un message utilisateur et retourne les réponses classées par score.
 *
 * @param {string}   message  - Message brut de l'utilisateur
 * @param {Object[]} intents  - Liste des intentions chargées depuis MongoDB
 * @returns {{ responses: string[], debug: Object[] }}
 */
function analyzeMessage(message, intents) {
  const normalizedMsg = normalizeText(message);
  const msgTokens = tokenize(message);

  console.log(`[Chatbot] Message normalisé : "${normalizedMsg}"`);
  console.log(`[Chatbot] Tokens : [${msgTokens.join(", ")}]`);

  const scored = intents
    .map((intent) => {
      const score = scoreIntent(normalizedMsg, msgTokens, intent);
      return { name: intent.name, score, response: intent.response };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(
    `[Chatbot] Intentions détectées : ${
      scored.length > 0
        ? scored.map((s) => `${s.name}(${s.score})`).join(", ")
        : "aucune"
    }`
  );

  return {
    responses: scored.map((s) => s.response),
    debug: scored.map((s) => ({ name: s.name, score: s.score })),
  };
}

// ─── Contrôleur Express ───────────────────────────────────────────────────────

/**
 * POST /api/chatbot/message
 * Body : { message: string }
 *
 * Retourne les réponses correspondant aux intentions détectées.
 * Si aucune intention n'est trouvée, renvoie le message de fallback.
 */
export const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Le message ne peut pas être vide." });
    }

    // Chargement des intentions depuis MongoDB (mis en cache par mongoose)
    const intents = await Intent.find({});

    if (intents.length === 0) {
      console.warn("[Chatbot] Aucune intention trouvée dans la base de données.");
      return res.json({
        responses: [
          "😔 Je ne suis pas encore configuré. Revenez bientôt !",
        ],
        matched: false,
      });
    }

    const { responses, debug } = analyzeMessage(message, intents);

    if (responses.length === 0) {
      // Aucune intention détectée → réponse fallback
      return res.json({
        responses: [
          "🤔 Je n'ai pas bien compris votre question. Vous pouvez me demander par exemple : les horaires, la livraison, les produits, les prix ou l'adresse de la boutique 😊",
        ],
        matched: false,
        debug,
      });
    }

    return res.json({
      responses,
      matched: true,
      debug,
    });
  } catch (error) {
    console.error("[Chatbot] Erreur :", error.message);
    res.status(500).json({ error: "Erreur interne du chatbot." });
  }
};
