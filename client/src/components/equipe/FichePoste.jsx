import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Feuille, Rien, BoutonEncre, BoutonTrait, Lien, Intertitre, champCls } from './kit';
import { TYPES_INDICATEUR } from '../../lib/equipe';

function EditeurListe({ valeurs, onChange, ajout }) {
  const maj = (i, v) => onChange(valeurs.map((x, j) => (j === i ? v : x)));
  const deplacer = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= valeurs.length) return;
    const copie = [...valeurs];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    onChange(copie);
  };
  const petit = 'text-[11px] text-gray-400 hover:text-brand-ink px-1';
  return (
    <div>
      {valeurs.map((v, i) => (
        <div key={i} className="flex items-end gap-2">
          <span className="w-6 text-[11px] text-gray-400 pb-2 text-right">{String(i + 1).padStart(2, '0')}</span>
          <input value={v} onChange={e => maj(i, e.target.value)} className={champCls} />
          <button type="button" onClick={() => deplacer(i, -1)} aria-label="Monter" className={petit}>↑</button>
          <button type="button" onClick={() => deplacer(i, 1)} aria-label="Descendre" className={petit}>↓</button>
          <button type="button" onClick={() => onChange(valeurs.filter((_, j) => j !== i))} aria-label="Retirer" className={`${petit} hover:text-red-600`}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...valeurs, ''])} className="ml-8 mt-3 text-[11px] text-sky-600 hover:underline">
        + {ajout}
      </button>
    </div>
  );
}

function EditeurIndicateurs({ valeurs, onChange }) {
  const maj = (i, patch) => onChange(valeurs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const deplacer = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= valeurs.length) return;
    const copie = [...valeurs];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    onChange(copie);
  };
  const petit = 'text-[11px] text-gray-400 hover:text-brand-ink px-1';
  return (
    <div>
      {valeurs.map((v, i) => (
        <div key={i} className="flex items-end gap-2">
          <span className="w-6 text-[11px] text-gray-400 pb-2 text-right">{String(i + 1).padStart(2, '0')}</span>
          <input value={v.libelle} onChange={e => maj(i, { libelle: e.target.value })} placeholder="Prospects contactés" className={champCls} />
          <select value={v.type} onChange={e => maj(i, { type: e.target.value })} aria-label="Type de réponse"
            className="border-0 border-b border-gray-300 bg-transparent py-1.5 pl-0 pr-6 text-[11px] text-brand-ink focus:outline-none focus:ring-0 focus:border-sky-500">
            {Object.entries(TYPES_INDICATEUR).map(([k, t]) => <option key={k} value={k}>{t.label.toLowerCase()}</option>)}
          </select>
          <button type="button" onClick={() => deplacer(i, -1)} aria-label="Monter" className={petit}>↑</button>
          <button type="button" onClick={() => deplacer(i, 1)} aria-label="Descendre" className={petit}>↓</button>
          <button type="button" onClick={() => onChange(valeurs.filter((_, j) => j !== i))} aria-label="Retirer" className={`${petit} hover:text-red-600`}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...valeurs, { libelle: '', type: 'nombre' }])} className="ml-8 mt-3 text-[11px] text-sky-600 hover:underline">
        + indicateur
      </button>
    </div>
  );
}

export default function FichePoste({ fiche, peutModifier, prenom, onSaved }) {
  const toast = useToast();
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  function commencer() {
    setForm({
      intitule: fiche.intitule, objectif: fiche.objectif, rappel: fiche.rappel,
      missions: fiche.missions.length ? [...fiche.missions] : [''],
      indicateurs: fiche.indicateurs.length ? fiche.indicateurs.map(i => ({ ...i })) : [{ libelle: '', type: 'nombre' }],
    });
    setEdition(true);
  }

  async function enregistrer() {
    setSaving(true);
    try {
      const maj = await api.saveFichePoste(fiche.user_id, form);
      toast.success('Fiche de poste enregistrée');
      onSaved?.(maj);
      setEdition(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const vide = !fiche.intitule && !fiche.objectif && !fiche.missions.length;

  if (edition) {
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const label = 'block text-xs font-medium text-gray-500 mb-1';
    return (
      <Feuille className="p-5 sm:p-7 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Édition</div>
        <h3 className="font-display text-xl font-bold text-brand-ink mt-1 mb-6">Fiche de poste de {prenom}</h3>
        <div className="space-y-7">
          <label className="block">
            <span className={label}>intitulé du poste</span>
            <input value={form.intitule} onChange={e => set('intitule', e.target.value)} placeholder="Commercial · Relances · Transformation" className={champCls} />
          </label>
          <label className="block">
            <span className={label}>objectif principal</span>
            <textarea rows={2} value={form.objectif} onChange={e => set('objectif', e.target.value)} className={`${champCls} resize-none`} />
          </label>
          <div>
            <span className={label}>à faire pendant la journée</span>
            <EditeurListe valeurs={form.missions} onChange={v => set('missions', v)} ajout="mission" />
          </div>
          <div>
            <span className={label}>chiffres du bilan de fin de journée</span>
            <p className="text-xs text-gray-400 mt-1">
              Ce que {prenom} renseigne chaque soir (ex. prospects contactés). Les réponses de type « nombre » sont
              additionnées par semaine dans la Vue d'ensemble.
            </p>
            <EditeurIndicateurs valeurs={form.indicateurs} onChange={v => set('indicateurs', v)} />
          </div>
          <label className="block">
            <span className={label}>rappel affiché dans le bilan (facultatif)</span>
            <textarea rows={2} value={form.rappel} onChange={e => set('rappel', e.target.value)}
              placeholder="Si j'ai terminé : je reprends la liste depuis le début…" className={`${champCls} resize-none`} />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-8">
          <BoutonTrait onClick={() => setEdition(false)}>Annuler</BoutonTrait>
          <BoutonEncre onClick={enregistrer} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la fiche'}</BoutonEncre>
        </div>
      </Feuille>
    );
  }

  if (vide) {
    return (
      <Feuille>
        <Rien action={peutModifier && <BoutonEncre onClick={commencer}>Rédiger la fiche de poste</BoutonEncre>}>
          pas encore de fiche de poste pour {prenom}
        </Rien>
      </Feuille>
    );
  }

  return (
    <div className="space-y-6">
      <Feuille className="p-5 flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Objectif principal</div>
          <p className="font-display text-lg font-bold text-brand-ink leading-snug mt-1.5 max-w-3xl">
            {fiche.objectif || '—'}
          </p>
        </div>
        {peutModifier && <Lien onClick={commencer} className="mt-1 whitespace-nowrap">modifier la fiche</Lien>}
      </Feuille>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <Feuille className="p-5">
          <Intertitre>À faire pendant la journée</Intertitre>
          <ol className="grid sm:grid-cols-2 gap-x-8">
            {fiche.missions.map((m, i) => (
              <li key={i} className="flex items-baseline gap-3 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-sky-600 w-5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm text-brand-ink leading-snug">{m}</span>
              </li>
            ))}
          </ol>
          {fiche.rappel && (
            <p className="mt-4 text-sm text-gray-600 italic leading-relaxed max-w-2xl bg-sky-50 rounded-lg px-3 py-2">
              <span className="not-italic text-xs font-semibold text-sky-600 mr-2">Rappel</span>{fiche.rappel}
            </p>
          )}
        </Feuille>
        <Feuille className="p-5">
          <Intertitre>Avant de partir</Intertitre>
          <p className="text-xs text-gray-500 mb-3">Les chiffres renseignés chaque soir dans le bilan :</p>
          <ul>
            {fiche.indicateurs.map((ind, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm text-brand-ink py-2 border-b border-gray-100 last:border-b-0">
                <span>{ind.libelle}</span>
                <span className="text-xs text-gray-400 text-right">{TYPES_INDICATEUR[ind.type]?.label.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </Feuille>
      </div>
    </div>
  );
}
