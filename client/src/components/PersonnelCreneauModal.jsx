import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useDismiss } from '../lib/useDismiss';

const TYPES = [
  { id: 'travail', label: 'Travail' },
  { id: 'cp',      label: 'CP' },
  { id: 'ecole',   label: 'École' },
  { id: 'ferie',   label: 'Férié' },
  { id: 'arret',   label: 'Arrêt' },
  { id: 'absent',  label: 'Absent' },
  { id: 'repos',   label: 'Repos' },
];

export default function PersonnelCreneauModal({ employe, date, creneaux, onSave, onClose }) {
  const existing = creneaux || [];
  const isTravail = existing.length === 0 || existing[0].type === 'travail';

  const [type, setType] = useState(isTravail ? 'travail' : existing[0].type);
  const [segments, setSegments] = useState(
    isTravail && existing.length > 0
      ? existing.map(c => ({ debut: c.debut || '', fin: c.fin || '' }))
      : [{ debut: '', fin: '' }]
  );
  const [notes, setNotes] = useState(existing[0]?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { closing, dismiss } = useDismiss(onClose);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dismiss]);

  function setSegment(i, field, value) {
    setSegments(segs => segs.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }
  function addSegment() {
    setSegments(segs => [...segs, { debut: '', fin: '' }]);
  }
  function removeSegment(i) {
    setSegments(segs => segs.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = type === 'travail'
        ? { type: 'travail', segments: segments.filter(s => s.debut && s.fin), notes: notes || null }
        : { type, notes: notes || null };
      if (type === 'travail' && payload.segments.length === 0) {
        throw new Error('Renseignez au moins un créneau (début/fin)');
      }
      await onSave(payload);
      dismiss();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await onSave({ type: 'travail', segments: [], notes: null });
      dismiss();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

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
          <h2 className="text-lg font-bold text-gray-800">{employe.prenom} {employe.nom}</h2>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{dateLabel}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

          {type === 'travail' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Horaires</label>
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time" value={seg.debut}
                    onChange={e => setSegment(i, 'debut', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time" value={seg.fin}
                    onChange={e => setSegment(i, 'fin', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {segments.length > 1 && (
                    <button type="button" onClick={() => removeSegment(i)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none px-1">×</button>
                  )}
                </div>
              ))}
              {segments.length < 2 && (
                <button type="button" onClick={addSegment}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un 2e créneau
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.id} type="button"
                  onClick={() => setType(t.id)}
                  className={`py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all
                    ${type === t.id ? 'bg-sky-600 text-white ring-2 ring-offset-1 ring-sky-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2} value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {existing.length > 0 && (
              <button type="button" onClick={handleClear} disabled={saving}
                className="text-xs text-red-500 hover:underline disabled:opacity-50">
                Effacer ce jour
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={dismiss}
              className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-transform">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="bg-sky-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 active:scale-[0.98] transition-transform">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
