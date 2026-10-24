import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUTS_INCIDENT, PRIORITES, nomComplet } from '../../lib/equipe';
import { parseServerDate } from '../../lib/utils';
import { BoutonEncre, BoutonTrait, Lien, champCls, selectCls } from './kit';
import Panneau from './Panneau';

const choixCls = (actif) => `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
  actif ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
}`;
const label = 'block text-[11px] text-gray-500';
const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const horodatage = (s) => {
  const d = parseServerDate(s);
  return `${jjmm(s.slice(0, 10))} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

// Ticket d'incident (bassin, matériel…) : type et priorité, statut, responsable, fil de
// suivi. Un manager peut tout modifier ; le responsable désigné fait avancer le statut,
// la priorité et note la mesure prise ; les autres consultent et commentent.
// `initial` préremplit la création (reprise d'un problème signalé dans un bilan).
export default function IncidentPanneau({ incident, initial, membres = [], types = [], onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const existant = !!incident?.id;
  const estResponsable = existant && incident.responsable_id === user?.id;
  const peutTout = isManager || !existant;           // type, titre, description
  const peutStatut = isManager || estResponsable;     // statut, priorité, mesure prise

  // Le type de l'incident existant doit rester proposé même s'il a depuis été désactivé.
  const typesProposes = existant && incident.type_id && !types.some(t => t.id === incident.type_id)
    ? [...types, { id: incident.type_id, nom: incident.type_nom, actif: 0 }]
    : types;

  const [form, setForm] = useState({
    type_id: incident?.type_id || initial?.type_id || types.find(t => t.actif)?.id || '',
    priorite: incident?.priorite || 'normale',
    titre: incident?.titre || initial?.titre || '',
    description: incident?.description ?? initial?.description ?? '',
    responsable_id: incident?.responsable_id ?? '',
    statut: incident?.statut || 'ouvert',
    resolution: incident?.resolution || '',
  });
  const [busy, setBusy] = useState(false);
  const [commentaires, setCommentaires] = useState([]);
  const [nouveauCom, setNouveauCom] = useState('');
  const finRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const lectureSeule = existant && !peutTout && !peutStatut;

  useEffect(() => {
    if (existant) api.getIncidentCommentaires(incident.id).then(setCommentaires).catch(() => {});
  }, [existant, incident?.id]);

  async function enregistrer(e, fermer) {
    e.preventDefault();
    if (!form.titre.trim()) return;
    if (!form.type_id) return toast.error('Choisis un type (réglable dans Préférences).');
    setBusy(true);
    try {
      let res;
      if (!existant) {
        res = await api.createIncident({
          type_id: Number(form.type_id), priorite: form.priorite, titre: form.titre, description: form.description,
          ...(isManager && form.responsable_id ? { responsable_id: Number(form.responsable_id) } : {}),
          ...(initial?.compte_rendu_id ? { compte_rendu_id: initial.compte_rendu_id } : {}),
        });
        toast.success('Incident enregistré');
      } else {
        const corps = {};
        if (isManager) {
          Object.assign(corps, { type_id: Number(form.type_id), titre: form.titre, description: form.description,
            responsable_id: form.responsable_id === '' ? null : Number(form.responsable_id) });
        }
        if (peutStatut) Object.assign(corps, { statut: form.statut, priorite: form.priorite, resolution: form.resolution });
        res = await api.patchIncident(incident.id, corps);
      }
      onSaved?.(res);
      fermer();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(fermer) {
    if (!confirm('Supprimer cet incident ?')) return;
    try { await api.deleteIncident(incident.id); onDeleted?.(); fermer(); } catch (err) { toast.error(err.message); }
  }

  async function commenter(e) {
    e.preventDefault();
    if (!nouveauCom.trim()) return;
    try {
      const c = await api.addIncidentCommentaire(incident.id, nouveauCom);
      setCommentaires(cs => [...cs, c]);
      setNouveauCom('');
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Panneau
      surtitre={existant ? `ticket #${String(incident.id).padStart(3, '0')}` : (initial?.compte_rendu_id ? 'suivre un problème signalé' : 'nouveau ticket')}
      titre={existant ? incident.titre : 'Signaler un incident'}
      sousTitre={existant ? `signalé par ${nomComplet({ prenom: incident.signale_prenom, nom: incident.signale_nom })} · ${jjmm(incident.date_signalement)}` : initial?.sousTitre}
      onClose={onClose}
      largeur="max-w-lg"
      pied={(fermer) => (
        <div className="flex items-center justify-between gap-2">
          {existant && isManager ? <Lien onClick={() => supprimer(fermer)}>supprimer</Lien> : <span />}
          <div className="flex gap-2">
            <BoutonTrait onClick={fermer}>{lectureSeule ? 'Fermer' : 'Annuler'}</BoutonTrait>
            {!lectureSeule && <BoutonEncre type="submit" form="form-incident" disabled={busy || !form.titre.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</BoutonEncre>}
          </div>
        </div>
      )}
    >
      {(fermer) => (
        <div className="space-y-6">
          <form id="form-incident" onSubmit={(e) => enregistrer(e, fermer)} className="space-y-6">
            <div>
              <span className={label}>type</span>
              {typesProposes.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1.5">Aucun type défini — un manager en ajoute depuis Préférences.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {typesProposes.map(t => (
                    <button type="button" key={t.id} disabled={(!isManager && existant) || !t.actif} onClick={() => set('type_id', t.id)}
                      aria-pressed={Number(form.type_id) === t.id} className={`${choixCls(Number(form.type_id) === t.id)} disabled:opacity-60`}>
                      {t.nom.toLowerCase()}{!t.actif ? ' (désactivé)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className={label}>priorité</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(PRIORITES).sort((a, b) => b[1].rang - a[1].rang).map(([k, p]) => (
                  <button type="button" key={k} disabled={!peutStatut && existant} onClick={() => set('priorite', k)}
                    aria-pressed={form.priorite === k} className={`${choixCls(form.priorite === k)} disabled:opacity-60`}>{p.label.toLowerCase()}</button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={label}>de quoi s'agit-il ? *</span>
              <input required autoFocus={!existant} disabled={!peutTout} value={form.titre} onChange={e => set('titre', e.target.value)}
                placeholder="Ex. Tapis de course n°3 en panne" className={champCls} />
            </label>
            <label className="block">
              <span className={label}>précisions</span>
              <textarea rows={3} disabled={!peutTout} value={form.description} onChange={e => set('description', e.target.value)}
                className={`${champCls} resize-none`} placeholder="Mesure relevée, depuis quand, ce qui a déjà été essayé…" />
            </label>

            {existant && (
              <>
                <div>
                  <span className={label}>statut</span>
                  <div className="flex gap-1.5 mt-2">
                    {Object.entries(STATUTS_INCIDENT).map(([k, s]) => (
                      <button type="button" key={k} disabled={!peutStatut} onClick={() => set('statut', k)}
                        aria-pressed={form.statut === k} className={`${choixCls(form.statut === k)} disabled:opacity-60`}>{s.label.toLowerCase()}</button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className={label}>mesure prise</span>
                  <textarea rows={3} disabled={!peutStatut} value={form.resolution} onChange={e => set('resolution', e.target.value)}
                    className={`${champCls} resize-none`}
                    placeholder="Ex. pièce commandée, technicien passé le…" />
                  {incident.resolu_le && <span className="block text-xs text-gray-400 mt-1">Résolu le {jjmm(incident.resolu_le.slice(0, 10))}.</span>}
                </label>
              </>
            )}

            {(isManager || existant) && (
              <label className="block">
                <span className={label}>responsable</span>
                {isManager ? (
                  <select value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)} className={`${selectCls} w-full mt-1`}>
                    <option value="">Non attribué</option>
                    {membres.map(m => <option key={m.id} value={m.id}>{nomComplet(m)}</option>)}
                  </select>
                ) : (
                  <div className="mt-1 text-sm text-brand-ink">
                    {incident.responsable_prenom ? nomComplet({ prenom: incident.responsable_prenom, nom: incident.responsable_nom }) : <span className="text-gray-400">non attribué</span>}
                  </div>
                )}
              </label>
            )}
          </form>

          {existant && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-display text-[15px] font-bold text-brand-ink">Suivi</span>
                <span className="flex-1 border-b border-gray-200" />
              </div>
              <ol className="border-l-2 border-gray-200 ml-1 space-y-4">
                {commentaires.map(c => (
                  <li key={c.id} className="relative pl-4">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-500" />
                    <div className="text-[11px] text-gray-500">
                      <span className="text-brand-ink font-semibold">{c.prenom}</span> · {horodatage(c.created_at)}
                    </div>
                    <p className="text-sm text-brand-ink whitespace-pre-wrap mt-0.5 leading-relaxed">{c.contenu}</p>
                  </li>
                ))}
                <li ref={finRef} className="relative pl-4">
                  <span className="absolute -left-[5px] top-2.5 h-2 w-2 rounded-sm border-2 border-sky-500 bg-white" />
                  <form onSubmit={commenter} className="flex items-end gap-2">
                    <textarea value={nouveauCom} onChange={e => setNouveauCom(e.target.value)} rows={1}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commenter(e); } }}
                      placeholder="Ajouter une note au suivi…" className={`${champCls} resize-none`} />
                    <button type="submit" disabled={!nouveauCom.trim()}
                      className="text-xs font-medium text-sky-600 disabled:text-gray-300 pb-2 whitespace-nowrap">Envoyer ↵</button>
                  </form>
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </Panneau>
  );
}
