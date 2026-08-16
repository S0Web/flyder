import { useState, useEffect } from 'react';
import { Plus, LogOut, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-flyder-dark.png';

const STATUT_CONFIG = {
  essai:    { label: 'Essai',    bg: 'bg-amber-100',  text: 'text-amber-700' },
  actif:    { label: 'Actif',    bg: 'bg-green-100',  text: 'text-green-700' },
  suspendu: { label: 'Suspendu', bg: 'bg-orange-100', text: 'text-orange-700' },
  resilie:  { label: 'Résilié',  bg: 'bg-gray-200',   text: 'text-gray-500' },
};

const EMPTY_FORM = {
  nom: '', sous_domaine: '', salle_nom_env: '', statut: 'essai', plan: '',
  contact_nom: '', contact_email: '', contact_telephone: '', date_debut: '', notes: '',
};

// Défini hors de ClientModal : un composant redéfini à chaque rendu du parent
// (comme c'était le cas ici) change d'identité à chaque frappe, ce qui force React
// à démonter/remonter le champ et fait perdre le focus après une seule lettre tapée.
function Field({ label, k, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(k, e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
    </div>
  );
}

function ClientModal({ client, onSave, onClose }) {
  const isNew = !client?.id;
  const [form, setForm] = useState(() => client ? { ...EMPTY_FORM, ...client } : EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-800">{isNew ? 'Nouveau client' : form.nom}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la salle *</label>
            <input required value={form.nom} onChange={e => set('nom', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sous-domaine" k="sous_domaine" value={form.sous_domaine} onChange={set} />
            <Field label="SALLE_NOM (env Railway)" k="salle_nom_env" value={form.salle_nom_env} onChange={set} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                {Object.entries(STATUT_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
            <Field label="Plan" k="plan" value={form.plan} onChange={set} />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
            <div className="space-y-3">
              <Field label="Nom du contact" k="contact_nom" value={form.contact_nom} onChange={set} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" k="contact_email" type="email" value={form.contact_email} onChange={set} />
                <Field label="Téléphone" k="contact_telephone" value={form.contact_telephone} onChange={set} />
              </div>
            </div>
          </div>
          <Field label="Date de début" k="date_debut" type="date" value={form.date_debut} onChange={set} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3D5AFE' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clients() {
  const { admin, logout } = useAuth();
  const [clients, setClients] = useState(null);
  const [modal, setModal] = useState(null);

  function load() {
    api.getClients().then(setClients).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    if (modal?.id) await api.updateClient(modal.id, form);
    else           await api.createClient(form);
    load();
  }

  async function handleDelete(client) {
    if (!confirm(`Supprimer définitivement ${client.nom} du registre ?\n\nÇa ne touche pas au service Railway ni aux données de la salle, juste à cette fiche.`)) return;
    await api.deleteClient(client.id);
    load();
  }

  const counts = clients ? clients.reduce((acc, c) => { acc[c.statut] = (acc[c.statut] || 0) + 1; return acc; }, {}) : {};

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-ink px-4 sm:px-6 py-3 flex items-center justify-between">
        <img src={logo} alt="Flyder" className="h-6" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-brand-slate hidden sm:inline">{admin?.nom || admin?.email}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-brand-slate hover:text-white">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Clients</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {clients ? `${clients.length} client(s)` : '…'}
              {clients && clients.length > 0 && (
                <> — {Object.entries(counts).map(([k, n]) => `${n} ${STATUT_CONFIG[k]?.label.toLowerCase()}`).join(', ')}</>
              )}
            </p>
          </div>
          <button onClick={() => setModal({})}
            className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: '#3D5AFE' }}>
            <Plus className="h-4 w-4" /> Nouveau client
          </button>
        </div>

        {clients === null ? (
          <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm italic">Aucun client pour l'instant.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[640px]">
              <thead>
                <tr style={{ backgroundColor: '#3D5AFE', color: '#fff' }}>
                  {['Nom', 'Sous-domaine', 'Statut', 'Plan', 'Contact', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => {
                  const statutCfg = STATUT_CONFIG[c.statut] || STATUT_CONFIG.essai;
                  return (
                    <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td className="px-3 py-2 font-medium">{c.nom}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {c.sous_domaine ? (
                          <a href={`https://${c.sous_domaine}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 hover:underline">
                            {c.sous_domaine} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statutCfg.bg} ${statutCfg.text}`}>
                          {statutCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{c.plan || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {c.contact_email || c.contact_nom || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button onClick={() => setModal(c)} title="Modifier"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-sky-600 hover:bg-sky-50">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} title="Supprimer"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal !== null && (
        <ClientModal client={modal?.id ? modal : null} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
