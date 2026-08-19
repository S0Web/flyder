import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import AdminLayout from '../components/AdminLayout';

const EMPTY_FORM = { titre: '', corps: '', importante: false };

function EntryModal({ entry, onSave, onClose }) {
  const isNew = !entry?.id;
  const [form, setForm] = useState(() => entry ? { ...EMPTY_FORM, ...entry, importante: !!entry.importante } : EMPTY_FORM);
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
          <h2 className="text-lg font-bold text-gray-800">{isNew ? 'Nouvelle annonce' : 'Modifier l’annonce'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
            <input required value={form.titre} onChange={e => set('titre', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contenu *</label>
            <textarea required rows={5} value={form.corps} onChange={e => set('corps', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.importante} onChange={e => set('importante', e.target.checked)} />
            Importante — affichée en pop-up une fois pour chaque salarié, sur toutes les salles
          </label>
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

function fmtDate(iso) {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Nouveautes() {
  const [entries, setEntries] = useState(null);
  const [modal, setModal] = useState(null);

  function load() {
    api.getChangelog().then(setEntries).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    if (modal?.id) await api.updateChangelogEntry(modal.id, form);
    else           await api.createChangelogEntry(form);
    load();
  }

  async function handleDelete(entry) {
    if (!confirm(`Supprimer l’annonce « ${entry.titre} » ?`)) return;
    await api.deleteChangelogEntry(entry.id);
    load();
  }

  return (
    <AdminLayout>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Nouveautés</h1>
          <p className="text-xs text-gray-400 mt-0.5">Annonces diffusées à toutes les salles.</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: '#3D5AFE' }}>
          <Plus className="h-4 w-4" /> Nouvelle annonce
        </button>
      </div>

      {entries === null ? (
        <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm italic">Aucune annonce pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-800">{entry.titre}</h2>
                    {!!entry.importante && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Importante</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(entry.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setModal(entry)} title="Modifier"
                    className="h-7 w-7 inline-flex items-center justify-center rounded text-sky-600 hover:bg-sky-50">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(entry)} title="Supprimer"
                    className="h-7 w-7 inline-flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{entry.corps}</p>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <EntryModal entry={modal?.id ? modal : null} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
    </AdminLayout>
  );
}
