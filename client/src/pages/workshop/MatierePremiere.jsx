import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MatierePremiere.css";
import { API_WORKSHOP as API, authHeader } from "../../utils/api";

const today = new Date().toISOString().split("T")[0];

export default function MatierePremiere() {
  const navigate = useNavigate();
  const [customTypes, setCustomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [showTypeManager, setShowTypeManager] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newType, setNewType] = useState({ nom: "", seuilMin: "", unite: "kg" });
  const [typeError, setTypeError] = useState("");
  const [typeLoading, setTypeLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { _id, nom }
  const [editingType, setEditingType] = useState(null); // { _id, nom, seuilMin, unite }
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const addInputRef = useRef(null);

  const [form, setForm] = useState({
    typeMPId: "",
    quantite: "",
    unite: "kg",
    prixUnitaire: "",
    fournisseur: "",
    dateEntree: today,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  /* ── Charger les types depuis l'API ── */
  const fetchTypes = async () => {
    try {
      setLoadingTypes(true);
      const res = await fetch(`${API}/types-mp`, {
        headers: authHeader(),
      });
      const data = await res.json();
      if (res.ok) setCustomTypes(data);
    } catch {
      // silencieux
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (showAddInput && addInputRef.current) addInputRef.current.focus();
  }, [showAddInput]);

  /* ── Gestion types ── */
  const handleAddType = async () => {
    const nom = newType.nom.trim();
    if (!nom) return setTypeError("Entrez un nom de type.");
    if (!newType.seuilMin || Number(newType.seuilMin) < 0)
      return setTypeError("Entrez un seuil minimum valide (≥ 0).");
    if (customTypes.some((t) => t.nom.toLowerCase() === nom.toLowerCase()))
      return setTypeError("Ce type existe déjà.");

    setTypeLoading(true);
    try {
      const res = await fetch(`${API}/types-mp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ nom, seuilMin: Number(newType.seuilMin), unite: newType.unite }),
      });
      const data = await res.json();
      if (!res.ok) return setTypeError(data.message || "Erreur lors de la création.");
      setCustomTypes((prev) => [...prev, data.type]);
      setNewType({ nom: "", seuilMin: "", unite: "kg" });
      setTypeError("");
      setShowAddInput(false);
    } catch {
      setTypeError("Erreur réseau.");
    } finally {
      setTypeLoading(false);
    }
  };

  const handleEditType = async () => {
    const nom = editingType.nom.trim();
    if (!nom) return setEditError("Entrez un nom de type.");
    if (!editingType.seuilMin || Number(editingType.seuilMin) < 0)
      return setEditError("Entrez un seuil minimum valide (≥ 0).");

    setEditLoading(true);
    try {
      const res = await fetch(`${API}/types-mp/${editingType._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ nom, seuilMin: Number(editingType.seuilMin), unite: editingType.unite }),
      });
      const data = await res.json();
      if (!res.ok) return setEditError(data.message || "Erreur lors de la modification.");
      setCustomTypes((prev) => prev.map((t) => t._id === editingType._id ? data.type : t));
      setEditingType(null);
      setEditError("");
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDeleteType = async () => {
    const { _id, nom } = confirmDelete;
    try {
      await fetch(`${API}/types-mp/${_id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      setCustomTypes((prev) => prev.filter((t) => t._id !== _id));
      if (form.typeMPId === _id) setForm((f) => ({ ...f, typeMPId: "", unite: "kg" }));
    } catch {
      // silencieux
    } finally {
      setConfirmDelete(null);
    }
  };

  /* ── Formulaire MP ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") {
      const selected = customTypes.find((t) => t._id === value);
      setForm({ ...form, typeMPId: value, unite: selected ? selected.unite : form.unite });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.typeMPId) return setError("Veuillez sélectionner un type de matière première.");
    if (!form.quantite || Number(form.quantite) <= 0)
      return setError("La quantité doit être supérieure à 0.");
    if (form.prixUnitaire === "" || Number(form.prixUnitaire) < 0)
      return setError("Le prix unitaire est invalide.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/matieres-premieres`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          typeMP: form.typeMPId,
          quantite: Number(form.quantite),
          prixUnitaire: Number(form.prixUnitaire),
          fournisseur: form.fournisseur,
          dateEntree: form.dateEntree,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'enregistrement.");

      setSuccess(true);
      setForm({ typeMPId: "", quantite: "", unite: "kg", prixUnitaire: "", fournisseur: "", dateEntree: today });
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mp-page">
      {/* ── Modal modification type ── */}
      {editingType && (
        <div className="mp-modal-overlay">
          <div className="mp-modal">
            <h3 className="mp-modal-title">Modifier le type</h3>
            <div className="mp-field" style={{ marginBottom: "12px" }}>
              <label className="mp-label">Nom</label>
              <input
                type="text"
                className="mp-input"
                value={editingType.nom}
                onChange={(e) => { setEditingType((p) => ({ ...p, nom: e.target.value })); setEditError(""); }}
              />
            </div>
            <div className="mp-row" style={{ marginBottom: "12px" }}>
              <div className="mp-field">
                <label className="mp-label">Seuil minimum</label>
                <input
                  type="number"
                  className="mp-input"
                  value={editingType.seuilMin}
                  onChange={(e) => { setEditingType((p) => ({ ...p, seuilMin: e.target.value })); setEditError(""); }}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mp-field">
                <label className="mp-label">Unité</label>
                <select
                  className="mp-select"
                  value={editingType.unite}
                  onChange={(e) => setEditingType((p) => ({ ...p, unite: e.target.value }))}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="unité">unité</option>
                </select>
              </div>
            </div>
            {editError && <p className="mp-type-error">{editError}</p>}
            <div className="mp-modal-actions">
              <button className="mp-modal-cancel" onClick={() => { setEditingType(null); setEditError(""); }}>
                Annuler
              </button>
              <button className="mp-modal-confirm" onClick={handleEditType} disabled={editLoading}>
                {editLoading ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suppression ── */}
      {confirmDelete && (
        <div className="mp-modal-overlay">
          <div className="mp-modal">
            <h3 className="mp-modal-title">Supprimer ce type ?</h3>
            <p className="mp-modal-text">
              Voulez-vous vraiment supprimer le type <strong>"{confirmDelete.nom}"</strong> ?
              Cette action est irréversible.
            </p>
            <div className="mp-modal-actions">
              <button className="mp-modal-cancel" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button className="mp-modal-confirm" onClick={confirmDeleteType}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mp-content">
        <div className="mp-form-card">
          <div className="mp-form-header">
            <div>
              <h2 className="mp-form-title">Enregistrer une Matière Première</h2>
              <p className="mp-form-sub">Remplissez les informations de la matière première reçue</p>
            </div>
          </div>

          {success && (
            <div className="mp-alert mp-alert--success">Matière première enregistrée avec succès !</div>
          )}
          {error && (
            <div className="mp-alert mp-alert--error">{error}</div>
          )}

          <form className="mp-form" onSubmit={handleSubmit}>

            {/* ── Type de MP ── */}
            <div className="mp-field">
              <div className="mp-label-row">
                <label className="mp-label">
                  Type de matière première <span className="mp-required">*</span>
                </label>
                <button
                  type="button"
                  className="mp-manage-btn"
                  onClick={() => {
                    setShowTypeManager((v) => !v);
                    setShowAddInput(false);
                    setTypeError("");
                    setNewType({ nom: "", seuilMin: "", unite: "kg" });
                  }}
                >
                  {showTypeManager ? "✕ Fermer" : "Gérer les types"}
                </button>
              </div>

              <select
                name="type"
                value={form.typeMPId}
                onChange={handleChange}
                className="mp-select"
                required
              >
                <option value="">-- Sélectionner --</option>
                {customTypes.map((t) => (
                  <option key={t._id} value={t._id}>{t.nom}</option>
                ))}
              </select>

              {/* Panneau de gestion des types */}
              {showTypeManager && (
                <div className="mp-type-manager">
                  <p className="mp-type-manager-title">Gérer les types</p>

                  {!showAddInput ? (
                    <button
                      type="button"
                      className="mp-type-add-btn-full"
                      onClick={() => { setShowAddInput(true); setTypeError(""); }}
                    >
                      + Ajouter un type
                    </button>
                  ) : (
                    <div className="mp-type-add-block">
                      <input
                        ref={addInputRef}
                        type="text"
                        value={newType.nom}
                        onChange={(e) => { setNewType((p) => ({ ...p, nom: e.target.value })); setTypeError(""); }}
                        className="mp-type-add-input"
                        placeholder="Nom du type (ex: Grenadine, Papaye...)"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setShowAddInput(false); setNewType({ nom: "", seuilMin: "", unite: "kg" }); }
                        }}
                      />
                      <div className="mp-row">
                        <div className="mp-field">
                          <label className="mp-label">Seuil minimum <span className="mp-required">*</span></label>
                          <input
                            type="number"
                            value={newType.seuilMin}
                            onChange={(e) => { setNewType((p) => ({ ...p, seuilMin: e.target.value })); setTypeError(""); }}
                            className="mp-type-add-input"
                            placeholder="Ex: 10"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="mp-field">
                          <label className="mp-label">Unité <span className="mp-required">*</span></label>
                          <select
                            value={newType.unite}
                            onChange={(e) => setNewType((p) => ({ ...p, unite: e.target.value }))}
                            className="mp-select"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="L">L</option>
                            <option value="mL">mL</option>
                            <option value="unité">unité</option>
                          </select>
                        </div>
                      </div>
                      <p className="mp-type-seuil-hint">
                        Une notification sera envoyée quand le stock descend en dessous de ce seuil.
                      </p>
                      <div className="mp-type-add-actions">
                        <button
                          type="button"
                          className="mp-type-cancel-btn"
                          onClick={() => { setShowAddInput(false); setNewType({ nom: "", seuilMin: "", unite: "kg" }); setTypeError(""); }}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="mp-type-add-btn"
                          onClick={handleAddType}
                          disabled={typeLoading}
                        >
                          {typeLoading ? "..." : "Confirmer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {typeError && <p className="mp-type-error">{typeError}</p>}

                  {loadingTypes ? (
                    <p className="mp-type-empty">Chargement...</p>
                  ) : customTypes.length === 0 ? (
                    <p className="mp-type-empty">Aucun type ajouté pour le moment.</p>
                  ) : (
                    <div className="mp-type-tags">
                      {customTypes.map((t) => (
                        <span key={t._id} className="mp-type-tag" title={`Seuil : ${t.seuilMin} ${t.unite}`}>
                          {t.nom}
                          <span className="mp-type-tag-seuil">{t.seuilMin} {t.unite}</span>
                          <button
                            type="button"
                            className="mp-type-tag-edit"
                            onClick={() => { setEditingType({ _id: t._id, nom: t.nom, seuilMin: t.seuilMin, unite: t.unite }); setEditError(""); }}
                            title="Modifier ce type"
                          >
                            ✏
                          </button>
                          <button
                            type="button"
                            className="mp-type-tag-del"
                            onClick={() => setConfirmDelete({ _id: t._id, nom: t.nom })}
                            title="Supprimer ce type"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Quantité + Unité ── */}
            <div className="mp-row">
              <div className="mp-field">
                <label className="mp-label">Quantité <span className="mp-required">*</span></label>
                <input
                  type="number"
                  name="quantite"
                  value={form.quantite}
                  onChange={handleChange}
                  className="mp-input"
                  placeholder="Ex: 50"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mp-field">
                <label className="mp-label">Unité <span className="mp-required">*</span></label>
                <div className="mp-unite-label">{form.unite || "—"}</div>
              </div>
            </div>

            {/* ── Prix unitaire ── */}
            <div className="mp-field">
              <label className="mp-label">Prix unitaire (DT) <span className="mp-required">*</span></label>
              <input
                type="number"
                name="prixUnitaire"
                value={form.prixUnitaire}
                onChange={handleChange}
                className="mp-input"
                placeholder="Ex: 120"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* ── Fournisseur ── */}
            <div className="mp-field">
              <label className="mp-label">Fournisseur</label>
              <input
                type="text"
                name="fournisseur"
                value={form.fournisseur}
                onChange={handleChange}
                className="mp-input"
                placeholder="Nom du fournisseur"
              />
            </div>

            {/* Date d'entrée automatique = date système */}
            <input type="hidden" name="dateEntree" value={form.dateEntree} />

            <button type="submit" className="mp-submit-btn" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer la matière première"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
