import { useState, useEffect } from 'react';
import { STATUT_CONFIG } from '../lib/utils';
import { useDismiss } from '../lib/useDismiss';
import CoursCombobox from './CoursCombobox';

// Convertit "9h30" ou "18:15" → "09:30" pour <input type="time">
function toTimeInput(h) {
  if (!h) return '';
  if (h.includes('h')) {
    const [hh, mm] = h.split('h');
    return `${String(hh).padStart(2, '0')}:${(mm || '00').padStart(2, '0')}`;
  }
  if (h.includes(':')) {
    const [hh, mm] = h.split(':');
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }
  return h;
}

export default function SeanceModal({ seance, coaches, coursTypes, appUsers = [], onSave, onClose, onCoursCreated, aquaActive = true }) {
  const [form, setForm] = useState({
    statut:           seance?.statut           || 'programme',
    nb_presents:      seance?.nb_presents       ?? '',
    pointeur_user_id: seance?.pointeur_user_id  ?? '',
    notes:            seance?.notes             || '',
    coach_id:         seance?.coach_id          || '',
    cours_type_id:    seance?.cours_type_id     || '',
    horaire:          toTimeInput(seance?.horaire || ''),
    duree_minutes:    seance?.duree_minutes     || 60,
    date:             seance?.date              || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const { closing, dismiss } = useDismiss(onClose);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.cours_type_id) { setError('Choisis un cours.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        nb_presents:      form.nb_presents      === '' ? null : Number(form.nb_presents),
        pointeur_user_id: form.pointeur_user_id === '' ? null : Number(form.pointeur_user_id),
        coach_id:         form.coach_id         === '' ? null : Number(form.coach_id),
        cours_type_id:    Number(form.cours_type_id),
        duree_minutes:    Number(form.duree_minutes),
      };
      await onSave(payload);
      onClose(); // le parent démonte déjà la modale ; filet de sécurité seulement
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dismiss]);

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`}
      onClick={dismiss}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto ${closing ? 'animate-modalOut' : 'animate-modalIn'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {seance ? 'Modifier la séance' : 'Nouvelle séance'}
          </h2>
          {seance && (
            <p className="text-sm text-gray-500 mt-0.5">
              {seance.cours_nom} · {seance.date} · {seance.horaire}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}

          {/* Cours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cours *</label>
            <CoursCombobox
              value={form.cours_type_id}
              coursTypes={coursTypes}
              onChange={v => set('cours_type_id', v)}
              onCreated={onCoursCreated}
              aquaActive={aquaActive}
            />
          </div>

          {/* Coach */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coach</label>
            <select
              value={form.coach_id}
              onChange={e => set('coach_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">-- Choisir --</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>{c.prenom}{c.nom ? ` ${c.nom}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date (déplacer la séance, uniquement en édition) */}
          {seance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Horaire + Durée */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horaire *</label>
              <input
                type="time"
                value={form.horaire}
                onChange={e => set('horaire', e.target.value)}
                required
                min="09:00"
                max="21:00"
                step="300"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
              <input
                type="number" min="15" max="180" step="5"
                value={form.duree_minutes}
                onChange={e => set('duree_minutes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUT_CONFIG).map(([val, cfg]) => (
                <button
                  key={val} type="button"
                  onClick={() => set('statut', val)}
                  className={`
                    px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wide transition-all
                    ${form.statut === val
                      ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-sky-400`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                  `}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nb présents + Pointeur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nb présents</label>
              <input
                type="number" min="0"
                value={form.nb_presents}
                onChange={e => set('nb_presents', e.target.value)}
                placeholder="—"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pointeur</label>
              <select
                value={form.pointeur_user_id}
                onChange={e => set('pointeur_user_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">—</option>
                {appUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.prenom}{u.nom ? ` ${u.nom}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Remplacement, incident..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={dismiss}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-transform"
            >
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
