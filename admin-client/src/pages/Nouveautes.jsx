import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import AdminLayout from '../components/AdminLayout';

const EMPTY_FORM = { titre: '', corps: '', importante: false, clientIds: [] };

function EntryModal({ entry, clients, onSave, onClose }) {
  const isNew = !entry?.id;
  const [form, setForm] = useState(() => entry ? { ...EMPTY_FORM, ...entry, importante: !!entry.importante, clientIds: entry.clientIds || [] } : EMPTY_FORM);
  const [cible, setCible] = useState(() => (entry?.clientIds?.length ? 'certaines' : 'toutes'));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleClient(id) {
    setForm(f => ({
      ...f,
      clientIds: f.clientIds.includes(id) ? f.clientIds.filter(c => c !== id) : [...f.clientIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (cible === 'certaines' && form.clientIds.length === 0) {
      setError('Sélectionne au moins une salle, ou choisis "Toutes les salles".');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, clientIds: cible === 'certaines' ? form.clientIds : [] });
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
            Importante — affichée en pop-up une fois pour chaque salarié, sur les salles ciblées
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Diffuser à</label>
            <div className="flex gap-4 text-sm text-gray-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="cible" checked={cible === 'toutes'} onChange={() => setCible('toutes')} />
                Toutes les salles
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="cible" checked={cible === 'certaines'} onChange={() => setCible('certaines')} />
                Certaines salles
              </label>
            </div>
            {cible === 'certaines' && (
              <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form.clientIds.includes(c.id)} onChange={() => toggleClient(c.id)} />
                    {c.nom}
                  </label>
                ))}
                {form.clientIds.length === 0 && (
                  <p className="text-xs text-red-500 px-3 py-1.5">Sélectionne au moins une salle.</p>
                )}
              </div>
            )}
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

function fmtDate(iso) {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Nouveautes() {
  const [entries, setEntries] = useState(null);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);

  function load() {
    api.getChangelog().then(setEntries).catch(() => {});
  }
  useEffect(() => {
    load();
    api.getClients().then(setClients).catch(() => {});
  }, []);

  function cibleLabel(entry) {
    if (!entry.clientIds?.length) return 'Toutes les salles';
    const noms = entry.clientIds.map(id => clients.find(c => c.id === id)?.nom).filter(Boolean);
    return noms.length ? noms.join(', ') : `${entry.clientIds.length} salle(s)`;
  }

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
          <p className="text-xs text-gray-400 mt-0.5">Annonces diffusées à toutes les salles, ou ciblées.</p>
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
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(entry.created_at)} · <span className={entry.clientIds?.length ? 'text-sky-600' : ''}>{cibleLabel(entry)}</span>
                  </p>
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
        <EntryModal entry={modal?.id ? modal : null} clients={clients} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
    </AdminLayout>
  );
}
