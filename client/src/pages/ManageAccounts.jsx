import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ManageAccounts.css";
import "./ManageProducts.css";

const API = "http://localhost:5000/api/auth";

export default function ManageAccounts() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // mode: "list" | "create" | "view" | "edit"
  const [mode, setMode] = useState("list");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  // Formulaire création / modification
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", confirmPassword: "", role: "seller" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/staff`, { headers });
      setAccounts(res.data);
    } catch {
      setError("Erreur lors du chargement des comptes");
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text) => { setMessage(text); setError(""); setTimeout(() => setMessage(""), 4000); };
  const showErr = (text) => { setError(text); setMessage(""); };

  const resetForm = () => setForm({ nom: "", prenom: "", email: "", password: "", confirmPassword: "", role: "seller" });

  // --- CRÉATION ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { showErr("Les mots de passe ne correspondent pas"); return; }
    if (form.password.length < 6) { showErr("Le mot de passe doit contenir au moins 6 caractères"); return; }
    try {
      await axios.post(`${API}/staff`, {
        nom: form.nom, prenom: form.prenom, email: form.email, password: form.password, role: form.role
      }, { headers });
      showMsg("Compte créé avec succès !");
      resetForm();
      setMode("list");
      fetchAccounts();
    } catch (err) {
      showErr(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  // --- MODIFICATION ---
  const handleEdit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) { showErr("Les mots de passe ne correspondent pas"); return; }
    if (form.password && form.password.length < 6) { showErr("Le nouveau mot de passe doit contenir au moins 6 caractères"); return; }
    try {
      await axios.put(`${API}/staff/${selected._id}`, {
        nom: form.nom, prenom: form.prenom, email: form.email,
        ...(form.password ? { password: form.password } : {})
      }, { headers });
      showMsg("Compte modifié avec succès !");
      setMode("list");
      fetchAccounts();
    } catch (err) {
      showErr(err.response?.data?.message || "Erreur lors de la modification");
    }
  };

  // --- SUPPRESSION ---
  const handleDelete = async (account) => {
    if (!window.confirm(`Supprimer le compte de ${account.prenom} ${account.nom} (${account.email}) ?`)) return;
    try {
      await axios.delete(`${API}/staff/${account._id}`, { headers });
      showMsg("Compte supprimé avec succès !");
      fetchAccounts();
    } catch (err) {
      showErr(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const openCreate = () => { resetForm(); setError(""); setMessage(""); setMode("create"); };
  const openView = (acc) => { setSelected(acc); setMode("view"); };
  const openEdit = (acc) => {
    setSelected(acc);
    setForm({ nom: acc.nom || "", prenom: acc.prenom || "", email: acc.email, password: "", confirmPassword: "", role: acc.role });
    setMode("edit");
  };

  const backToList = () => { setMode("list"); setError(""); setMessage(""); };

  const roleLabel = (role) => role === "seller" ? "Vendeur" : "Atelier";
  const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="accounts-container">
      {/* Header */}
      <div className="accounts-header">
        {mode === "list" ? (
          <button className="back-button" onClick={() => navigate("/manager")}>← Retour</button>
        ) : (
          <button className="back-button" onClick={backToList}>← Retour</button>
        )}
        <h2>
          {mode === "list" && "Gestion des Comptes"}
          {mode === "create" && "Créer un compte"}
          {mode === "view" && "Consulter un compte"}
          {mode === "edit" && "Modifier un compte"}
        </h2>
        {mode === "list" && (
          <button className="add-button" onClick={openCreate}>+ Créer un compte</button>
        )}
        {mode !== "list" && <div />}
      </div>

      {message && <div className="message ac-message-success">{message}</div>}
      {error && <div className="message ac-message-error">{error}</div>}

      {/* ===== LISTE ===== */}
      {mode === "list" && (
        loading ? <p style={{ textAlign: "center", color: "#999" }}>Chargement...</p> :
        accounts.length === 0 ? (
          <p className="no-accounts">Aucun compte trouvé. Cliquez sur "+ Créer un compte" pour commencer.</p>
        ) : (
          <div className="accounts-grid">
            {accounts.map((acc) => (
              <div key={acc._id} className="account-card">
                <div className="account-card-header">
                  <div>
                    <p className="account-name">{acc.prenom} {acc.nom}</p>
                    <p className="account-email">{acc.email}</p>
                  </div>
                  <span className={`account-role-badge ${acc.role}`}>{roleLabel(acc.role)}</span>
                </div>
                <p className="account-date">Créé le {formatDate(acc.createdAt)}</p>
                <div className="account-actions">
                  <button className="btn-view" onClick={() => openView(acc)}>Consulter</button>
                  <button className="btn-edit" onClick={() => openEdit(acc)}>Modifier</button>
                  <button className="btn-delete" onClick={() => handleDelete(acc)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ===== CRÉATION ===== */}
      {mode === "create" && (
        <div className="product-form-card ac-form-card">
          <h3>Nouveau compte</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input type="text" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Ex: Mohamed" />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Ben Ali" />
              </div>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ex: vendeur@smartjuice.tn" />
            </div>
            <div className="form-group">
              <label>Mot de passe *</label>
              <div className="ac-password-wrapper">
                <input type={showPwd ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 caractères" />
                <button type="button" className="ac-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirmer le mot de passe *</label>
              <div className="ac-password-wrapper">
                <input type={showConfirm ? "text" : "password"} required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Répéter le mot de passe" />
                <button type="button" className="ac-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
              </div>
            </div>
            <div className="form-group">
              <label>Type de compte *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="seller">Vendeur</option>
                <option value="workshop">Atelier</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button">Créer le compte</button>
              <button type="button" className="cancel-button" onClick={backToList}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== CONSULTATION ===== */}
      {mode === "view" && selected && (
        <div className="product-form-card ac-detail-card">
          <h3>Détails du compte</h3>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Prénom</span>
            <span className="ac-detail-value">{selected.prenom || "—"}</span>
          </div>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Nom</span>
            <span className="ac-detail-value">{selected.nom || "—"}</span>
          </div>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Email</span>
            <span className="ac-detail-value">{selected.email}</span>
          </div>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Rôle</span>
            <span className={`account-role-badge ${selected.role}`}>{roleLabel(selected.role)}</span>
          </div>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Créé le</span>
            <span className="ac-detail-value">{formatDate(selected.createdAt)}</span>
          </div>
          <div className="ac-detail-row">
            <span className="ac-detail-label">Dernière modification</span>
            <span className="ac-detail-value">{formatDate(selected.updatedAt)}</span>
          </div>
          <div className="form-actions" style={{ marginTop: "1.5rem" }}>
            <button className="submit-button" onClick={() => openEdit(selected)}>Modifier ce compte</button>
            <button className="cancel-button" onClick={backToList}>Retour</button>
          </div>
        </div>
      )}

      {/* ===== MODIFICATION ===== */}
      {mode === "edit" && selected && (
        <div className="product-form-card ac-form-card">
          <h3>Modifier le compte</h3>
          <form onSubmit={handleEdit}>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input type="text" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="ac-password-wrapper">
                <input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Laisser vide pour ne pas changer" />
                <button type="button" className="ac-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
              </div>
              <p className="ac-hint">Laisser vide pour conserver le mot de passe actuel</p>
            </div>
            {form.password && (
              <div className="form-group">
                <label>Confirmer le nouveau mot de passe</label>
                <div className="ac-password-wrapper">
                  <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Répéter le nouveau mot de passe" />
                  <button type="button" className="ac-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="submit-button">Enregistrer</button>
              <button type="button" className="cancel-button" onClick={backToList}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
