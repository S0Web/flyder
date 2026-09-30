import { useState } from 'react';
import { Plus } from 'lucide-react';
import Panneau from './equipe/Panneau';
import { BoutonEncre, BoutonTrait, champCls } from './equipe/kit';
import { jourLong } from '../lib/equipe';

const TYPES = [
  { id: 'travail', label: 'Travail' },
  { id: 'cp',      label: 'CP' },
  { id: 'ecole',   label: 'École' },
  { id: 'ferie',   label: 'Férié' },
  { id: 'arret',   label: 'Arrêt' },
  { id: 'absent',  label: 'Absent' },
  { id: 'repos',   label: 'Repos' },
];

const choixCls = (actif) => `font-mono text-xs px-2 py-1.5 rounded-[3px] border transition-colors ${
  actif ? 'bg-brand-ink text-white border-brand-ink' : 'border-brand-ink/20 text-gray-600 hover:border-brand-ink'
}`;

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

  const setSegment = (i, field, value) => setSegments(segs => segs.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  async function enregistrer(fermer) {
    setError(null);
    setSaving(true);
    try {
      const payload = type === 'travail'
        ? { type: 'travail', segments: segments.filter(s => s.debut && s.fin), notes: notes || null }
        : { type, notes: notes || null };
      if (type === 'travail' && payload.segments.length === 0) {
        throw new Error('Renseigne au moins un créneau (début et fin).');
      }
      await onSave(payload);
      fermer();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function effacer(fermer) {
    setSaving(true);
    try {
      await onSave({ type: 'travail', segments: [], notes: null });
      fermer();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const label = 'block font-mono text-[11px] text-gray-500';
  return (
    <Panneau
      surtitre="planning du personnel"
      titre={`${employe.prenom} ${employe.nom || ''}`.trim()}
      sousTitre={jourLong(date).toLowerCase()}
      onClose={onClose}
      largeur="max-w-md"
      pied={(fermer) => (
        <div className="flex items-center gap-2">
          {existing.length > 0 && (
            <button type="button" onClick={() => effacer(fermer)} disabled={saving}
              className="font-mono text-[11px] text-gray-500 hover:text-fitness underline underline-offset-4 disabled:opacity-50">
              effacer ce jour
            </button>
          )}
          <div className="flex-1" />
          <BoutonTrait onClick={fermer}>Annuler</BoutonTrait>
          <BoutonEncre onClick={() => enregistrer(fermer)} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</BoutonEncre>
        </div>
      )}
    >
      <div className="space-y-7">
        {error && <p className="font-mono text-xs text-fitness">{error}</p>}

        <div>
          <span className={label}>type de journée</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setType(t.id)} className={choixCls(type === t.id)}>{t.label.toLowerCase()}</button>
            ))}
          </div>
        </div>

        {type === 'travail' && (
          <div className="space-y-3">
            <span className={label}>horaires</span>
            {segments.map((seg, i) => (
              <div key={i} className="flex items-end gap-3">
                <input type="time" value={seg.debut} onChange={e => setSegment(i, 'debut', e.target.value)} aria-label="Début" className={`${champCls} font-mono`} />
                <span className="font-mono text-fitness pb-1.5">→</span>
                <input type="time" value={seg.fin} onChange={e => setSegment(i, 'fin', e.target.value)} aria-label="Fin" className={`${champCls} font-mono`} />
                {segments.length > 1 && (
                  <button type="button" onClick={() => setSegments(segs => segs.filter((_, idx) => idx !== i))} aria-label="Retirer ce créneau"
                    className="font-mono text-[11px] text-gray-400 hover:text-fitness pb-2 px-1">✕</button>
                )}
              </div>
            ))}
            {segments.length < 2 && (
              <button type="button" onClick={() => setSegments(segs => [...segs, { debut: '', fin: '' }])}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-fitness hover:underline">
                <Plus className="h-3 w-3" /> 2e créneau (coupure)
              </button>
            )}
          </div>
        )}

        <label className="block">
          <span className={label}>note (facultatif)</span>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${champCls} resize-none`} />
        </label>
      </div>
    </Panneau>
  );
}
