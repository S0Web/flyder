import { useState } from 'react';
import { useDismiss } from '../lib/useDismiss';

export default function UserModal({ user, onSave, onClose }) {
  const isNew = !user?.id;
  const [form, setForm] = useState({
    prenom:   user?.prenom   || '',
    nom:      user?.nom      || '',
    email:    user?.email    || '',
    role:     user?.role     || 'user',
    actif:    user?.actif    !== undefined ? user.actif : 1,
    date_debut_contrat: user?.date_debut_contrat || '',
  });
  const [error, setError]   = useState(null);
  const [saving, setSaving] = useState(false);
  const { closing, dismiss } = useDismiss(onClose);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      dismiss();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`}
      onClick={dismiss}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm ${closing ? 'animate-modalOut' : 'animate-modalIn'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">{isNew ? 'Nouvel utilisateur' : `${user.prenom} ${user.nom}`}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input required value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rôle</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                <option value="user">Utilisateur</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {!isNew && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={!!form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked ? 1 : 0 }))} />
                  Actif
                </label>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date de début de contrat</label>
            <input type="date" value={form.date_debut_contrat}
              onChange={e => setForm(f => ({ ...f, date_debut_contrat: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            <p className="text-[11px] text-gray-400 mt-1">Sert à calculer le cumul de CP (2,5 jours acquis par mois).</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={dismiss}
              className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50 active:scale-[0.98] transition-transform">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
              style={{ backgroundColor: '#3D5AFE' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
