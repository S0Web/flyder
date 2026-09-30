import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { PRIORITES, nomComplet } from '../../lib/equipe';
import { Intertitre, Compte, BoutonEncre, BoutonTrait, Lien, champCls, selectCls } from './kit';
import Panneau from './Panneau';

const MOMENTS = {
  ouverture: { label: 'Ouverture', regle: 'la première personne planifiée (elle commence au plus tard 2 h après l\'ouverture)' },
  fermeture: { label: 'Fermeture', regle: 'la dernière personne planifiée (elle finit au plus tôt 2 h avant la fermeture)' },
  bassin:    { label: 'Bassin',    regle: 'la personne qui ouvre (contrôle avant l\'accueil du public)' },
};

const JOURS = [[1, 'lun'], [2, 'mar'], [3, 'mer'], [4, 'jeu'], [5, 'ven'], [6, 'sam'], [0, 'dim']];
const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6];

const libelleJours = (jours) => {
  if (jours.length === 7) return 'tous les jours';
  return JOURS.filter(([n]) => jours.includes(n)).map(([, l]) => l).join(' ');
};

const vide = (moment) => ({ moment, titre: '', description: '', priorite: 'normale', jours: TOUS_LES_JOURS });

// Gestion des checklists du service (managers) : des modèles de tâches par moment de la journée.
// Chaque jour concerné, une tâche est créée pour la personne planifiée sur ce créneau.
export default function ChecklistsPanneau({ onClose, onChange }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [edition, setEdition] = useState(null); // modèle en cours de saisie (avec ou sans id)
  const [busy, setBusy] = useState(false);

  const charger = useCallback(() => {
    api.getChecklists().then(setData).catch(e => toast.error(e.message));
  }, [toast]);
  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(e) {
    e.preventDefault();
    if (!edition.titre.trim()) return;
    setBusy(true);
    try {
      const corps = { moment: edition.moment, titre: edition.titre, description: edition.description, priorite: edition.priorite, jours: edition.jours };
      if (edition.id) await api.updateChecklist(edition.id, corps);
      else await api.createChecklist(corps);
      setEdition(null);
      charger();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function basculerActif(m) {
    try { await api.updateChecklist(m.id, { actif: !m.actif }); charger(); onChange?.(); } catch (err) { toast.error(err.message); }
  }

  async function supprimer(m) {
    if (!confirm(`Supprimer « ${m.titre} » ? Les tâches du jour pas encore commencées seront retirées ; l'historique reste.`)) return;
    try { await api.deleteChecklist(m.id); charger(); onChange?.(); } catch (err) { toast.error(err.message); }
  }

  const basculeJour = (n) => setEdition(ed => ({
    ...ed, jours: ed.jours.includes(n) ? ed.jours.filter(j => j !== n) : [...ed.jours, n],
  }));

  return (
    <Panneau surtitre="équipe" titre="Checklists du service" onClose={onClose} largeur="max-w-xl">
      {!data ? (
        <p className="py-10 text-center text-xs text-gray-400">chargement…</p>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-brand-ink leading-snug">
            Chaque jour concerné, ces tâches sont créées pour la personne planifiée sur le créneau, d'après le planning du
            personnel. Elles apparaissent dans « Ma journée » et se cochent comme n'importe quelle tâche.
          </p>

          <div>
            <Intertitre>Aujourd'hui</Intertitre>
            <ul className="space-y-1.5">
              {Object.entries(MOMENTS).map(([cle, m]) => {
                const qui = data.responsables[cle];
                return (
                  <li key={cle} className="flex flex-wrap items-baseline gap-x-3 text-xs" data-testid={`resp-${cle}`}>
                    <span className="w-20 text-gray-500">{m.label.toLowerCase()}</span>
                    {qui ? <span className="text-brand-ink">{nomComplet(qui)}</span>
                         : <span className="text-red-600">personne de planifié sur ce créneau</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          {Object.entries(MOMENTS).map(([cle, m]) => {
            const items = data.modeles.filter(x => x.moment === cle);
            return (
              <section key={cle} data-testid={`moment-${cle}`}>
                <Intertitre actions={<Compte n={items.length} />}>
                  {m.label}
                </Intertitre>
                <p className="text-[11px] text-gray-500 -mt-1.5 mb-3">Confié à {m.regle}.</p>

                {items.length > 0 && (
                  <ul className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 mb-3">
                    {items.map(x => (
                      <li key={x.id} className={`flex items-start gap-3 px-4 py-2.5 ${x.actif ? '' : 'opacity-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-brand-ink leading-snug">
                            {x.priorite !== 'normale' && <span className="text-[11px] font-medium text-red-600 mr-1.5">{PRIORITES[x.priorite].label.toLowerCase()}</span>}
                            {x.titre}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {libelleJours(x.jours)}{!x.actif && ' · en pause'}
                          </div>
                        </div>
                        <span className="flex gap-3 flex-shrink-0">
                          <Lien onClick={() => setEdition({ ...x })}>modifier</Lien>
                          <Lien onClick={() => basculerActif(x)}>{x.actif ? 'pause' : 'reprendre'}</Lien>
                          <Lien onClick={() => supprimer(x)}>supprimer</Lien>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {edition && edition.moment === cle ? (
                  <form onSubmit={enregistrer} className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block">
                      <span className="block text-[11px] text-gray-500">{edition.id ? 'modifier la tâche' : 'nouvelle tâche'}</span>
                      <input autoFocus required value={edition.titre} onChange={e => setEdition(ed => ({ ...ed, titre: e.target.value }))}
                        placeholder={cle === 'bassin' ? 'Ex. Mesurer le pH et le chlore' : cle === 'fermeture' ? 'Ex. Éteindre les lumières et fermer les portes' : 'Ex. Allumer les lumières'}
                        className={champCls} />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-500">précisions (facultatif)</span>
                      <input value={edition.description} onChange={e => setEdition(ed => ({ ...ed, description: e.target.value }))} className={champCls} />
                    </label>
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                      <label className="block">
                        <span className="block text-[11px] text-gray-500 mb-1">priorité</span>
                        <select value={edition.priorite} onChange={e => setEdition(ed => ({ ...ed, priorite: e.target.value }))} className={selectCls}>
                          {Object.entries(PRIORITES).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                        </select>
                      </label>
                      <div>
                        <span className="block text-[11px] text-gray-500 mb-1">jours concernés</span>
                        <div className="flex gap-1">
                          {JOURS.map(([n, l]) => (
                            <button type="button" key={n} onClick={() => basculeJour(n)} aria-pressed={edition.jours.includes(n)}
                              className={`text-[11px] px-1.5 py-1 rounded-lg border transition-colors ${
                                edition.jours.includes(n) ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <BoutonTrait onClick={() => setEdition(null)}>Annuler</BoutonTrait>
                      <BoutonEncre type="submit" disabled={busy || !edition.titre.trim() || !edition.jours.length}>
                        {busy ? 'Enregistrement…' : edition.id ? 'Enregistrer' : 'Ajouter'}
                      </BoutonEncre>
                    </div>
                  </form>
                ) : (
                  <Lien onClick={() => setEdition(vide(cle))}>+ ajouter une tâche d'{cle === 'bassin' ? 'entretien du bassin' : cle}</Lien>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Panneau>
  );
}
