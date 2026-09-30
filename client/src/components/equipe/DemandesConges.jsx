import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Intertitre, Marque, Compte, BoutonCorail, BoutonEncre, BoutonTrait, Lien, Rien, champCls } from './kit';
import Panneau from './Panneau';
import { aujourdhuiISO, isoPlusJours, dateDepuisISO, TYPES_ABSENCE } from '../../lib/equipe';

const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const periode = (d) => (d.date_debut === d.date_fin ? jjmm(d.date_debut) : `${jjmm(d.date_debut)} → ${jjmm(d.date_fin)}`);
const fmtSolde = (n) => String(n).replace('.', ',');

function joursEntre(debut, fin) {
  const out = [];
  for (let d = debut; d <= fin; d = isoPlusJours(d, 1)) out.push(d);
  return out;
}

const STATUT = {
  en_attente: { label: 'en attente', ton: 'corail' },
  acceptee:   { label: 'accepté', ton: 'encre' },
  refusee:    { label: 'refusé', ton: 'gris' },
  annulee:    { label: 'annulé', ton: 'gris' },
};

// ── Côté salarié : demander un congé et suivre ses demandes ─────────────────────
export function DemandeCongePanneau({ onClose, onChange }) {
  const toast = useToast();
  const auj = aujourdhuiISO();
  const [form, setForm] = useState({ date_debut: '', date_fin: '', motif: '' });
  const [mes, setMes] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    api.getDemandesConges().then(setMes).catch(e => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const valide = form.date_debut && form.date_fin && form.date_fin >= form.date_debut;
  const nbJours = valide ? joursEntre(form.date_debut, form.date_fin).length : 0;

  async function envoyer() {
    if (!valide) return toast.error('Choisis une date de début et une date de fin.');
    setEnvoi(true);
    try {
      await api.createDemandeConge(form);
      toast.success('Demande envoyée au manager');
      setForm({ date_debut: '', date_fin: '', motif: '' });
      charger();
      onChange?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function annuler(d) {
    try {
      await api.annulerDemandeConge(d.id);
      charger();
      onChange?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const label = 'block text-[11px] text-gray-500';
  return (
    <Panneau
      surtitre="congés"
      titre="Demander un congé"
      onClose={onClose}
      pied={(fermer) => (
        <div className="flex items-center gap-2 justify-end">
          <BoutonTrait onClick={fermer}>Fermer</BoutonTrait>
          <BoutonCorail onClick={envoyer} disabled={envoi || !valide}>{envoi ? 'Envoi…' : 'Envoyer la demande →'}</BoutonCorail>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <label className="block">
            <span className={label}>du</span>
            <input type="date" value={form.date_debut} min={auj}
              onChange={e => setForm(f => ({ ...f, date_debut: e.target.value, date_fin: f.date_fin && f.date_fin >= e.target.value ? f.date_fin : e.target.value }))}
              className={`${champCls}`} />
          </label>
          <label className="block">
            <span className={label}>au (inclus)</span>
            <input type="date" value={form.date_fin} min={form.date_debut || auj}
              onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} className={`${champCls}`} />
          </label>
        </div>
        <label className="block">
          <span className={label}>motif (facultatif)</span>
          <input value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} maxLength={500}
            placeholder="Vacances, rendez-vous…" className={champCls} />
        </label>
        <p className="text-xs text-gray-500">
          {nbJours > 0
            ? `${nbJours} jour${nbJours > 1 ? 's' : ''} sur la période. Le manager choisit les jours réellement posés (tes jours de repos ne sont pas décomptés).`
            : 'Le manager choisit ensuite les jours réellement posés, tes jours de repos ne sont pas décomptés.'}
        </p>

        <div>
          <Intertitre>Mes demandes</Intertitre>
          {mes === null ? (
            <p className="text-xs text-gray-400">chargement…</p>
          ) : mes.length === 0 ? (
            <Rien>aucune demande</Rien>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
              {mes.map(d => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-brand-ink">{periode(d)}</span>
                    <Marque ton={STATUT[d.statut].ton}>{STATUT[d.statut].label}</Marque>
                    {d.statut === 'acceptee' && <span className="text-[11px] text-gray-500">{d.jours.length} jour{d.jours.length > 1 ? 's' : ''} posé{d.jours.length > 1 ? 's' : ''}</span>}
                    <span className="flex-1" />
                    {d.statut === 'en_attente' && <Lien onClick={() => annuler(d)}>annuler</Lien>}
                  </div>
                  {d.motif && <p className="text-sm text-gray-600 mt-1">{d.motif}</p>}
                  {d.retour_manager && <p className="text-sm text-brand-ink mt-1"><span className="text-[11px] text-gray-500">manager : </span>{d.retour_manager}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panneau>
  );
}

// ── Côté manager : décider ──────────────────────────────────────────────────────
// Jours à poser par défaut : tout ce qui est dans la période, sauf les jours déjà
// marqués repos, férié, école, arrêt ou absent au planning, et les dimanches sans horaire.
const NON_DECOMPTES = ['repos', 'ferie', 'ecole', 'arret', 'absent'];

function CarteDemande({ d, onDecide }) {
  const toast = useToast();
  const jours = joursEntre(d.date_debut, d.date_fin);
  const typeDuJour = Object.fromEntries(d.planning.map(p => [p.date, p.type]));
  const [choisis, setChoisis] = useState(() => new Set(jours.filter(j => {
    const t = typeDuJour[j];
    if (t && NON_DECOMPTES.includes(t)) return false;
    return !(dateDepuisISO(j).getDay() === 0 && t !== 'travail');
  })));
  const [retour, setRetour] = useState('');
  const [busy, setBusy] = useState(false);

  const bascule = (j) => setChoisis(s => { const n = new Set(s); if (n.has(j)) n.delete(j); else n.add(j); return n; });

  async function decider(decision) {
    if (decision === 'refusee' && !retour.trim()) return toast.error('Indique la raison du refus.');
    setBusy(true);
    try {
      await api.deciderDemandeConge(d.id, { decision, retour, jours: [...choisis] });
      toast.success(decision === 'acceptee'
        ? `Congé accepté : ${choisis.size} jour${choisis.size > 1 ? 's' : ''} posé${choisis.size > 1 ? 's' : ''} dans le planning`
        : 'Demande refusée');
      onDecide();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const apres = d.cp_restant != null ? Math.round((d.cp_restant - choisis.size) * 100) / 100 : null;
  return (
    <article className="bg-white border border-gray-200 rounded-lg px-4 sm:px-5 py-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-[17px] font-bold text-brand-ink">{d.prenom} {d.nom}</span>
        <span className="text-sm text-brand-ink">{periode(d)}</span>
        <span className="text-[11px] text-gray-500">
          {d.cp_restant != null ? `solde ${fmtSolde(d.cp_restant)} j${apres != null ? ` → ${fmtSolde(apres)} j après` : ''}` : 'solde non suivi'}
        </span>
      </div>
      {d.motif && <p className="text-sm text-gray-600 mt-1">{d.motif}</p>}
      {d.collegues_absents.length > 0 && (
        <p className="text-xs text-amber-700 mt-2">déjà en congé sur ces dates : {d.collegues_absents.join(', ')}</p>
      )}

      <div className="mt-3">
        <div className="text-[11px] text-gray-500 mb-1.5">jours à poser en congé payé ({choisis.size})</div>
        <div className="flex flex-wrap gap-1.5">
          {jours.map(j => {
            const t = typeDuJour[j];
            const on = choisis.has(j);
            return (
              <button key={j} type="button" onClick={() => bascule(j)} aria-pressed={on}
                className={`text-[11px] px-2 py-1 rounded-lg border text-left transition-colors ${
                  on ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}>
                {dateDepuisISO(j).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                {t && t !== 'travail' && <span className={`block text-[9px] uppercase ${on ? 'text-white/70' : 'text-gray-400'}`}>{TYPES_ABSENCE[t]?.court}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Accepter remplace le planning de chaque jour retenu par « CP ».</p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-end gap-3">
        <input value={retour} onChange={e => setRetour(e.target.value)} placeholder="Un mot en retour (obligatoire pour refuser)"
          className={`${champCls} flex-1 min-w-[200px]`} />
        <BoutonTrait onClick={() => decider('refusee')} disabled={busy} className="!py-1.5">Refuser</BoutonTrait>
        <BoutonEncre onClick={() => decider('acceptee')} disabled={busy || choisis.size === 0} className="!py-1.5">Accepter</BoutonEncre>
      </div>
    </article>
  );
}

export function DemandesEnAttente({ onChange }) {
  const toast = useToast();
  const [demandes, setDemandes] = useState(null);
  const charger = useCallback(() => {
    api.getDemandesConges({ statut: 'en_attente' }).then(setDemandes).catch(e => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (!demandes || demandes.length === 0) return null;
  return (
    <section className="mt-6">
      <Intertitre>
        Demandes de congé <Compte n={demandes.length} ton="bleu" className="ml-1.5" />
      </Intertitre>
      <div className="space-y-3">
        {demandes.map(d => <CarteDemande key={d.id} d={d} onDecide={() => { charger(); onChange?.(); }} />)}
      </div>
    </section>
  );
}
