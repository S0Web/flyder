import { useState, useEffect, useCallback } from 'react';
import { STATUT_CONFIG } from '../lib/utils';
import { useDismiss } from '../lib/useDismiss';
import CoursCombobox from './CoursCombobox';
import { api } from '../lib/api';

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

export default function SeanceModal({ seance, coaches, coursTypes, appUsers = [], onSave, onClose, onCoursCreated, onCoursUpdated, onReplaced, aquaActive = true }) {
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
  const coursChoisi = coursTypes.find(ct => ct.id === Number(form.cours_type_id));
  // Capacité du cours (places) : propre au type de cours, donc partagée par toutes ses séances.
  const [capacite, setCapacite] = useState(coursChoisi?.capacite ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const { closing, dismiss } = useDismiss(onClose);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // ── Remplacement de coach (séance déjà enregistrée, pas encore effectuée) ──
  const peutRemplacer = !!seance?.id && ['programme', 'annule'].includes(seance.statut);
  const besoinCoach = peutRemplacer && (!seance.coach_id || seance.statut === 'annule');
  const [remplOuvert, setRemplOuvert] = useState(besoinCoach);
  const [rempl, setRempl] = useState({ candidats: [], historique: [] });
  const [remplCoach, setRemplCoach] = useState('');
  const [remplRaison, setRemplRaison] = useState('');
  const [remplBusy, setRemplBusy] = useState(false);
  const [remplMsg, setRemplMsg] = useState(null);

  const chargerRemplacement = useCallback(() => {
    if (!seance?.id) return;
    api.getRemplacement(seance.id).then(setRempl).catch(() => {});
  }, [seance?.id]);
  useEffect(() => { chargerRemplacement(); }, [chargerRemplacement]);

  async function remplacer() {
    const choisi = rempl.candidats.find(c => c.id === Number(remplCoach));
    if (!choisi) return;
    let forcer = false;
    if (choisi.occupe_a) {
      if (!confirm(`${choisi.prenom} a déjà un cours à ${choisi.occupe_a} ce jour-là. Le remplacer quand même ici ?`)) return;
      forcer = true;
    }
    setRemplBusy(true);
    setError(null);
    try {
      const maj = await api.remplacerCoach(seance.id, { coach_id: choisi.id, raison: remplRaison, forcer });
      // Le formulaire reflète la séance telle qu'elle est désormais enregistrée.
      setForm(f => ({ ...f, coach_id: maj.coach_id || '', statut: maj.statut }));
      setRemplMsg(`${choisi.prenom} remplace sur cette séance.`);
      setRemplCoach('');
      setRemplRaison('');
      setRemplOuvert(false);
      chargerRemplacement();
      onReplaced?.(maj);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemplBusy(false);
    }
  }

  function choisirCours(v) {
    set('cours_type_id', v);
    setCapacite(coursTypes.find(ct => ct.id === Number(v))?.capacite ?? '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.cours_type_id) { setError('Choisis un cours.'); return; }
    const capaciteSaisie = capacite === '' ? null : Number(capacite);
    if (capaciteSaisie !== null && (!Number.isInteger(capaciteSaisie) || capaciteSaisie < 1 || capaciteSaisie > 500)) {
      setError('La capacité doit être un entier entre 1 et 500.');
      return;
    }
    setSaving(true);
    try {
      if (capaciteSaisie !== (coursChoisi?.capacite ?? null)) {
        const maj = await api.patchCoursType(Number(form.cours_type_id), { capacite: capaciteSaisie });
        onCoursUpdated?.(maj);
      }
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
              onChange={choisirCours}
              onCreated={onCoursCreated}
              aquaActive={aquaActive}
            />
          </div>

          {/* Capacité du cours */}
          {coursChoisi && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité du cours <span className="font-normal text-gray-400">(places, facultatif)</span>
              </label>
              <input
                type="number" min="1" max="500" step="1" inputMode="numeric"
                value={capacite}
                onChange={e => setCapacite(e.target.value)}
                placeholder="Ex. 20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valable pour toutes les séances de « {coursChoisi.nom} ». Sert au taux de remplissage.
              </p>
            </div>
          )}

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

          {/* Remplacement de coach : séance sans coach ou annulée (ouvert d'office), ou coach à remplacer */}
          {peutRemplacer && (
            <div className={`rounded-lg border px-3 py-2.5 ${besoinCoach && remplOuvert ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
              {remplMsg && <p className="text-sm text-green-700 font-medium mb-1">✓ {remplMsg}</p>}
              {!remplOuvert ? (
                <button type="button" onClick={() => { setRemplOuvert(true); setRemplMsg(null); }}
                  className="text-sm font-medium text-sky-600 hover:text-sky-700">
                  Remplacer le coach…
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      {!seance.coach_id ? 'Trouver un coach pour cette séance' : 'Remplacer le coach'}
                    </span>
                    {!besoinCoach && (
                      <button type="button" onClick={() => setRemplOuvert(false)} className="text-xs text-gray-500 hover:text-gray-700">annuler</button>
                    )}
                  </div>
                  {seance.statut === 'annule' && (
                    <p className="text-xs text-amber-800">Séance annulée : un remplaçant la remet au programme.</p>
                  )}
                  <select value={remplCoach} onChange={e => setRemplCoach(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
                    <option value="">-- Choisir le remplaçant --</option>
                    {rempl.candidats.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.prenom}{c.nom ? ` ${c.nom}` : ''}
                        {c.occupe_a ? ` — déjà un cours à ${c.occupe_a}` : c.deja_donne ? ` — a déjà donné ce cours ${c.deja_donne}×` : ''}
                      </option>
                    ))}
                  </select>
                  <input type="text" maxLength={300} value={remplRaison} onChange={e => setRemplRaison(e.target.value)}
                    placeholder="Motif (malade, congé…) — facultatif"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
                  <button type="button" onClick={remplacer} disabled={!remplCoach || remplBusy}
                    className="w-full bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-40 active:scale-[0.98] transition-transform">
                    {remplBusy ? 'Enregistrement…' : 'Confirmer le remplacement'}
                  </button>
                  <p className="text-[11px] text-gray-400">Enregistré tout de suite, avec une trace (qui, quand, pourquoi).</p>
                </div>
              )}
            </div>
          )}

          {/* Historique des remplacements de cette séance */}
          {rempl.historique.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Historique du coach</div>
              <ul className="space-y-1" data-testid="historique-remplacements">
                {rempl.historique.map(h => (
                  <li key={h.id} className="text-xs text-gray-600 leading-snug">
                    <span className="text-gray-400 tabular-nums">{h.date_modification.slice(8, 10)}.{h.date_modification.slice(5, 7)}</span>{' · '}
                    {h.ancien_coach || 'sans coach'} → <span className="font-medium text-gray-800">{h.nouveau_coach}</span>
                    {h.raison && <> · « {h.raison} »</>}
                    {h.auteur && <span className="text-gray-400"> · par {h.auteur}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
