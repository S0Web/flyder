import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TYPES_INCIDENT, STATUTS_INCIDENT, nomComplet } from '../../lib/equipe';
import { BoutonEncre, BoutonTrait, Lien, champCls, selectCls } from './kit';
import Panneau from './Panneau';

const choixCls = (actif) => `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
  actif ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
}`;
const label = 'block text-[11px] text-gray-500';
const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

// Création ou suivi d'un incident (bassin, matériel…). Un manager peut tout modifier ; le
// responsable désigné fait avancer le statut et note la mesure prise ; les autres consultent.
// `initial` préremplit la création (reprise d'un problème signalé dans un bilan).
export default function IncidentPanneau({ incident, initial, membres = [], onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const existant = !!incident?.id;
  const estResponsable = existant && incident.responsable_id === user?.id;
  const peutTout = isManager || !existant;           // type, titre, description
  const peutStatut = isManager || estResponsable;     // statut, mesure prise

  const [form, setForm] = useState({
    type: incident?.type || initial?.type || 'materiel',
    titre: incident?.titre || initial?.titre || '',
    description: incident?.description ?? initial?.description ?? '',
    responsable_id: incident?.responsable_id ?? '',
    statut: incident?.statut || 'ouvert',
    resolution: incident?.resolution || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const lectureSeule = existant && !peutTout && !peutStatut;

  async function enregistrer(e, fermer) {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setBusy(true);
    try {
      let res;
      if (!existant) {
        res = await api.createIncident({
          type: form.type, titre: form.titre, description: form.description,
          ...(isManager && form.responsable_id ? { responsable_id: Number(form.responsable_id) } : {}),
          ...(initial?.compte_rendu_id ? { compte_rendu_id: initial.compte_rendu_id } : {}),
        });
        toast.success('Incident enregistré');
      } else {
        const corps = {};
        if (isManager) {
          Object.assign(corps, { type: form.type, titre: form.titre, description: form.description,
            responsable_id: form.responsable_id === '' ? null : Number(form.responsable_id) });
        }
        if (peutStatut) Object.assign(corps, { statut: form.statut, resolution: form.resolution });
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

  return (
    <Panneau
      surtitre={existant ? `incident n°${String(incident.id).padStart(3, '0')}` : (initial?.compte_rendu_id ? 'suivre un problème signalé' : 'nouvel incident')}
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
        <form id="form-incident" onSubmit={(e) => enregistrer(e, fermer)} className="space-y-6">
          <div>
            <span className={label}>type</span>
            <div className="flex gap-1.5 mt-2">
              {Object.entries(TYPES_INCIDENT).map(([k, t]) => (
                <button type="button" key={k} disabled={!isManager && existant} onClick={() => set('type', k)}
                  aria-pressed={form.type === k} className={`${choixCls(form.type === k)} disabled:opacity-60`}>{t.label.toLowerCase()}</button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className={label}>de quoi s'agit-il ? *</span>
            <input required autoFocus={!existant} disabled={!peutTout} value={form.titre} onChange={e => set('titre', e.target.value)}
              placeholder={form.type === 'bassin' ? 'Ex. pH trop élevé, eau trouble…' : 'Ex. Tapis de course n°3 en panne'} className={champCls} />
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
                  placeholder={form.type === 'bassin' ? 'Ex. correcteur pH- ajouté, nouvelle mesure à 10h : 7,3' : 'Ex. pièce commandée, technicien passé le…'} />
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
      )}
    </Panneau>
  );
}
