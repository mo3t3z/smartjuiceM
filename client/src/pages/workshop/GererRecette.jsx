import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./GererRecette.css";

import { API_WORKSHOP as API, API_PRODUCTS, authHeader } from "../../utils/api";
const emptyIngredient = () => ({ matiere: "", quantite: "", unite: "" });
const token = () => localStorage.getItem("token");

export default function GererRecette() {
  const navigate = useNavigate();
  const [typesMP, setTypesMP] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal add/edit
  const [modal, setModal] = useState(null); // null | "add" | "edit"
  const [editing, setEditing] = useState(null);
  const [formNom, setFormNom] = useState("");
  const [formSeuilMin, setFormSeuilMin] = useState("");
  const [formSeuilBoutique, setFormSeuilBoutique] = useState("");
  const [formIngs, setFormIngs] = useState([emptyIngredient()]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Modal delete
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  /* ── fetch ── */
  const fetchRecettes = async () => {
    try {
      const res = await fetch(`${API}/recettes`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Erreur de chargement.");
      setRecettes(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypesMP = async () => {
    try {
      const res = await fetch(`${API}/types-mp`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setTypesMP(data.map((t) => ({ nom: t.nom, unite: t.unite })));
      }
    } catch { /* silencieux */ }
  };

  const fetchCatalogProducts = async () => {
    try {
      const res = await fetch(`${API_PRODUCTS}/catalog`);
      if (res.ok) {
        const data = await res.json();
        setCatalogProducts(data);
      }
    } catch { /* silencieux */ }
  };

  useEffect(() => { fetchRecettes(); fetchTypesMP(); fetchCatalogProducts(); }, []);

  /* ── ouvrir modal add ── */
  const openAdd = () => {
    fetchTypesMP();
    setEditing(null);
    setFormNom("");
    setFormSeuilMin("");
    setFormSeuilBoutique("");
    setFormIngs([emptyIngredient()]);
    setFormError("");
    setModal("add");
  };

  /* ── ouvrir modal edit ── */
  const openEdit = (r) => {
    fetchTypesMP();
    setEditing(r);
    setFormNom(r.nomJus);
    setFormSeuilMin(r.seuilMinPF !== undefined ? String(r.seuilMinPF) : "");
    setFormSeuilBoutique(r.seuilMinBoutique !== undefined ? String(r.seuilMinBoutique) : "");
    setFormIngs(r.ingredients.map((i) => ({ matiere: i.matiere, quantite: String(i.quantite), unite: i.unite })));
    setFormError("");
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditing(null); setFormSeuilMin(""); setFormSeuilBoutique(""); setFormError(""); };

  /* ── ingrédients ── */
  const updateIng = (idx, field, val) =>
    setFormIngs((prev) => prev.map((ing, i) => {
      if (i !== idx) return ing;
      if (field === "matiere") {
        const type = typesMP.find((t) => t.nom === val);
        return { ...ing, matiere: val, unite: type ? type.unite : ing.unite };
      }
      return { ...ing, [field]: val };
    }));
  const addIng = () => setFormIngs((prev) => [...prev, emptyIngredient()]);
  const removeIng = (idx) => setFormIngs((prev) => prev.filter((_, i) => i !== idx));

  /* ── submit add/edit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formNom.trim()) return setFormError("Le nom du jus est obligatoire.");
    if (formSeuilMin === "" || Number(formSeuilMin) < 0) return setFormError("Le seuil minimum atelier est obligatoire.");
    if (formSeuilBoutique === "" || Number(formSeuilBoutique) < 0) return setFormError("Le seuil minimum boutique est obligatoire.");
    for (const ing of formIngs) {
      if (!ing.matiere.trim()) return setFormError("Chaque ingrédient doit avoir un nom.");
      if (!ing.quantite || Number(ing.quantite) <= 0) return setFormError("Chaque quantité doit être > 0.");
    }

    const payload = {
      nomJus: formNom.trim(),
      ingredients: formIngs.map((i) => ({ matiere: i.matiere.trim(), quantite: Number(i.quantite), unite: i.unite })),
      seuilMinPF:       Number(formSeuilMin),
      seuilMinBoutique: Number(formSeuilBoutique),
    };

    setFormLoading(true);
    try {
      const url = modal === "edit" ? `${API}/recettes/${editing._id}` : `${API}/recettes`;
      const method = modal === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      closeModal();
      fetchRecettes();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    setDelLoading(true);
    try {
      const res = await fetch(`${API}/recettes/${confirmDel._id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setConfirmDel(null);
      fetchRecettes();
    } catch (e) {
      setError(e.message);
    } finally {
      setDelLoading(false);
    }
  };

  /* ── format date ── */
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="gr-page">

      {/* ── Modal Add / Edit ── */}
      {modal && (
        <div className="gr-overlay">
          <div className="gr-modal">
            <div className="gr-modal-head">
              <h3>{modal === "add" ? "Nouvelle recette" : "Modifier la recette"}</h3>
              <button className="gr-modal-close" onClick={closeModal}>✕</button>
            </div>

            {formError && <div className="gr-alert gr-alert--error">{formError}</div>}

            <form onSubmit={handleSubmit} className="gr-modal-form">
              <div className="gr-field">
                <label className="gr-label">Nom du jus <span className="gr-req">*</span></label>
                {catalogProducts.length > 0 ? (
                  <select
                    className="gr-select"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    required
                  >
                    <option value="">-- Choisir un produit du catalogue --</option>
                    {catalogProducts.map((p) => (
                      <option key={p._id} value={p.name}>{p.name}</option>
                    ))}
                    {/* Garder la valeur existante si elle ne correspond pas au catalogue (ancien enregistrement) */}
                    {formNom && !catalogProducts.find((p) => p.name === formNom) && (
                      <option value={formNom}>{formNom} (existant)</option>
                    )}
                  </select>
                ) : (
                  <input
                    className="gr-input"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Ex: Jus de fraise"
                  />
                )}
                {catalogProducts.length === 0 && (
                  <small style={{ color: "#888", fontSize: "0.78rem" }}>
                    Aucun produit dans le catalogue. Demandez au gérant d'ajouter des produits.
                  </small>
                )}
              </div>

              <div className="gr-field">
                <label className="gr-label">Seuil minimum stock PF — Atelier (L) <span className="gr-req">*</span></label>
                <input
                  className="gr-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formSeuilMin}
                  onChange={(e) => setFormSeuilMin(e.target.value)}
                  placeholder="Ex: 10"
                  required
                />
                <small style={{ color: "#888", fontSize: "0.78rem" }}>
                  Alerte atelier quand le stock PF atelier descend à ce seuil après un transfert.
                </small>
              </div>

              <div className="gr-field">
                <label className="gr-label">Seuil minimum stock PF — Boutique (L) <span className="gr-req">*</span></label>
                <input
                  className="gr-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formSeuilBoutique}
                  onChange={(e) => setFormSeuilBoutique(e.target.value)}
                  placeholder="Ex: 5"
                  required
                />
                <small style={{ color: "#888", fontSize: "0.78rem" }}>
                  Alerte atelier + gérant quand le stock boutique descend à ce seuil (ventes).
                </small>
              </div>

              <div className="gr-field">
                <div className="gr-ings-header">
                  <label className="gr-label">Ingrédients pour 1 litre <span className="gr-req">*</span></label>
                  <button type="button" className="gr-add-ing-btn" onClick={addIng}>+ Ajouter</button>
                </div>

                {typesMP.length === 0 && (
                  <div className="gr-no-mp-warn">
                    Aucun type de matière première disponible.{" "}
                    <button type="button" className="gr-link-btn" onClick={() => navigate("/workshop/matieres-premieres")}>
                      Aller gérer les types →
                    </button>
                  </div>
                )}


                <div className="gr-ings-list">
                  {formIngs.map((ing, idx) => (
                    <div key={idx} className="gr-ing-row">
                      <select
                        className="gr-select gr-ing-name"
                        value={ing.matiere}
                        onChange={(e) => updateIng(idx, "matiere", e.target.value)}
                        required
                      >
                        <option value="">-- Matière --</option>
                        {typesMP.map((t) => (
                          <option key={t.nom} value={t.nom}>{t.nom}</option>
                        ))}
                      </select>
                      <input
                        className="gr-input gr-ing-qty"
                        type="number"
                        min="0"
                        step="0.001"
                        value={ing.quantite}
                        onChange={(e) => updateIng(idx, "quantite", e.target.value)}
                        placeholder="Qté"
                      />
                      <span className="gr-ing-unite-label">{ing.unite}</span>
                      {formIngs.length > 1 && (
                        <button type="button" className="gr-ing-del" onClick={() => removeIng(idx)}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="gr-modal-actions">
                <button type="button" className="gr-btn-cancel" onClick={closeModal}>Annuler</button>
                <button type="submit" className="gr-btn-save" disabled={formLoading}>
                  {formLoading ? "Enregistrement..." : modal === "edit" ? "Mettre à jour" : "Créer la recette"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Delete ── */}
      {confirmDel && (
        <div className="gr-overlay">
          <div className="gr-modal gr-modal--sm">
            <h3 className="gr-del-title">Supprimer cette recette ?</h3>
            <p className="gr-del-text">
              Voulez-vous vraiment supprimer la recette de <strong>"{confirmDel.nomJus}"</strong> ?
              Cette action est irréversible.
            </p>
            <div className="gr-modal-actions">
              <button className="gr-btn-cancel" onClick={() => setConfirmDel(null)}>Annuler</button>
              <button className="gr-btn-delete" onClick={handleDelete} disabled={delLoading}>
                {delLoading ? "Suppression..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="gr-content">
        <div className="gr-top">
          <div className="gr-title-block">
            <div>
              <h2 className="gr-title">Gérer les Recettes</h2>
              <p className="gr-subtitle">Recettes pour 1 litre de jus produit</p>
            </div>
          </div>
          <button className="gr-new-btn" onClick={openAdd}>+ Nouvelle recette</button>
        </div>

        {error && <div className="gr-alert gr-alert--error">{error}</div>}
        {loading && <div className="gr-loader">Chargement des recettes...</div>}

        {!loading && recettes.length === 0 && (
          <div className="gr-empty">
            <p>Aucune recette enregistrée pour le moment.</p>
            <button className="gr-new-btn" onClick={openAdd}>+ Créer la première recette</button>
          </div>
        )}

        {!loading && recettes.length > 0 && (
          <div className="gr-grid">
            {recettes.map((r) => (
              <div key={r._id} className="gr-card">
                <div className="gr-card-head">
                  <div className="gr-card-title-row">
                    <h3 className="gr-card-name">{r.nomJus}</h3>
                  </div>
                  <div className="gr-card-actions">
                    <button className="gr-btn-edit" onClick={() => openEdit(r)}>Modifier</button>
                    <button className="gr-btn-del" onClick={() => setConfirmDel(r)}>Supprimer</button>
                  </div>
                </div>

                {r.seuilMinPF > 0 && (
                  <p className="gr-card-seuil">
                    Seuil atelier : <strong>{r.seuilMinPF} L</strong>
                  </p>
                )}
                {r.seuilMinBoutique > 0 && (
                  <p className="gr-card-seuil">
                    Seuil boutique : <strong>{r.seuilMinBoutique} L</strong>
                  </p>
                )}
                <p className="gr-card-for">Pour 1 litre :</p>
                <ul className="gr-ings-ul">
                  {r.ingredients.map((ing, i) => (
                    <li key={i} className="gr-ing-item">
                      <span className="gr-ing-dot">•</span>
                      <span>{ing.quantite} {ing.unite}</span>
                      <span className="gr-ing-mat">{ing.matiere}</span>
                    </li>
                  ))}
                </ul>

                <div className="gr-card-footer">
                  <span className="gr-trace">
                    Créé par <strong>{r.creerPar?.email}</strong> · {fmtDate(r.createdAt)}
                  </span>
                  {r.modifierPar && (
                    <span className="gr-trace gr-trace--mod">
                      Modifié par <strong>{r.modifierPar?.email}</strong> · {fmtDate(r.dateModification)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
