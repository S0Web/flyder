import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ListeTaches, AjoutRapide, TachePanneau, useBasculeTache } from '../../components/equipe/Taches';
import { CompteRenduPanneau } from '../../components/equipe/ComptesRendus';
import SemaineHoraires from '../../components/equipe/SemaineHoraires';
import TimelineJour from '../../components/equipe/TimelineJour';
import { Feuille, Intertitre, Compteurs, Tampon, BoutonCorail, Lien, Rien } from '../../components/equipe/kit';
import { salutation, fmtHeure, aujourdhuiISO, TYPES_ABSENCE } from '../../lib/equipe';

const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export default function MaJournee() {
  const { user } = useAuth();
  const { membres, rafraichirCompteurs } = useOutletContext();
  const [data, setData] = useState(null);
  const [panneauCr, setPanneauCr] = useState(null); // date
  const [tacheOuverte, setTacheOuverte] = useState(null);
  const [missionsOuvertes, setMissionsOuvertes] = useState(false);

  const charger = useCallback(() => {
    api.getMaJournee().then(setData).catch(() => {});
    rafraichirCompteurs?.();
  }, [rafraichirCompteurs]);
  useEffect(() => { charger(); }, [charger]);

  const basculer = useBasculeTache(() => charger());

  if (!data) return <p className="py-20 text-center font-mono text-xs text-gray-400">chargement…</p>;

  const auj = aujourdhuiISO();
  const mesCreneauxAuj = data.mes_creneaux.filter(c => c.date === auj);
  const absenceAuj = mesCreneauxAuj.find(c => c.type !== 'travail');
  const travailAuj = mesCreneauxAuj.filter(c => c.type === 'travail');
  const tachesOuvertes = data.taches.filter(t => t.statut !== 'fait');
  const enRetard = tachesOuvertes.filter(t => t.echeance && t.echeance < auj).length;
  const duJour = tachesOuvertes.filter(t => t.echeance === auj).length;
  const f = data.fiche;
  const cr = data.cr_du_jour;

  return (
    <div className="space-y-8">
      {/* ── En-tête : le service du jour, écrit en grand ─────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <div className="font-mono text-[11px] text-gray-500">{salutation().toLowerCase()} {user.prenom.toLowerCase()} — ton service aujourd'hui</div>
          <div className="font-display font-bold text-brand-ink leading-[0.95] tracking-tight mt-2 text-[44px] sm:text-[64px]">
            {absenceAuj ? (TYPES_ABSENCE[absenceAuj.type]?.label || 'Absent')
              : travailAuj.length ? travailAuj.map((c, i) => (
                <span key={i} className="block sm:inline">
                  {i > 0 && <span className="hidden sm:inline text-gray-300"> / </span>}
                  {fmtHeure(c.debut)}<span className="text-fitness">→</span>{fmtHeure(c.fin)}
                </span>
              ))
              : <span className="text-gray-300">Repos</span>}
          </div>
          {f.intitule && <div className="font-mono text-[11px] text-gray-500 mt-3 uppercase tracking-wider">{f.intitule}</div>}
          {f.objectif && <p className="mt-2 text-base text-brand-ink max-w-2xl leading-snug">{f.objectif}</p>}
        </div>

        <div className="lg:text-right">
          {cr?.statut === 'valide' || cr?.statut === 'soumis' ? (
            <button onClick={() => setPanneauCr(auj)} className="inline-flex flex-col items-start lg:items-end gap-2">
              <Tampon statut={cr.statut} />
              <span className="font-mono text-[11px] text-gray-500 underline underline-offset-4">revoir mon bilan</span>
            </button>
          ) : (
            <BoutonCorail onClick={() => setPanneauCr(auj)} className="!px-6 !py-3 !text-base">
              {cr?.statut === 'brouillon' ? 'Reprendre mon bilan' : cr?.statut === 'a_revoir' ? 'Corriger mon bilan' : 'Faire mon bilan de fin de journée'} →
            </BoutonCorail>
          )}
        </div>
      </section>

      <Feuille>
        <Compteurs items={[
          { label: "à faire aujourd'hui", valeur: duJour },
          { label: 'en retard', valeur: enRetard, ton: enRetard ? 'corail' : undefined },
          { label: 'terminées · 7 jours', valeur: data.faites_7j, ton: 'vert' },
          ...(data.cp_restant != null ? [{ label: 'congés restants', valeur: String(data.cp_restant).replace('.', ',') }] : []),
        ]} />
      </Feuille>

      {/* ── Ce qui attend : une ligne par alerte, pas d'encadré ─────── */}
      {(data.cr_a_revoir.length > 0 || data.docs_non_consultes > 0) && (
        <ul className="border-y-2 border-brand-ink divide-y divide-brand-ink/10">
          {data.cr_a_revoir.map(r => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="font-mono text-[11px] text-fitness w-20">⚑ à revoir</span>
              <span className="flex-1 min-w-[200px] text-sm text-brand-ink">Bilan du {jjmm(r.date)} — {r.retour_manager}</span>
              <Lien onClick={() => setPanneauCr(r.date)}>corriger</Lien>
            </li>
          ))}
          {data.docs_non_consultes > 0 && (
            <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="font-mono text-[11px] text-fitness w-20">✉ nouveau</span>
              <span className="flex-1 min-w-[200px] text-sm text-brand-ink">
                {data.docs_non_consultes === 1 ? 'Un document a été déposé pour toi.' : `${data.docs_non_consultes} documents ont été déposés pour toi.`}
              </span>
              <Lien as={Link} to={`/equipe/membres/${user.id}?onglet=documents`}>ouvrir le coffre</Lien>
            </li>
          )}
        </ul>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-8">
        <section>
          <Intertitre actions={<Lien as={Link} to="/equipe/taches">toutes mes tâches</Lien>}>Mes tâches</Intertitre>
          <div className="mb-5"><AjoutRapide assigneParDefaut={user.id} onCree={charger} placeholder="Ajouter une tâche pour moi…" /></div>
          <ListeTaches taches={data.taches} onOpen={setTacheOuverte} onToggle={basculer} faitesOuvertes
            vide={<Rien>liste vide — reprends ta fiche de poste depuis le début</Rien>} />

          {f.missions.length > 0 && (
            <div className="mt-8">
              <Intertitre actions={<Lien onClick={() => setMissionsOuvertes(o => !o)}>{missionsOuvertes ? 'replier' : `voir les ${f.missions.length}`}</Lien>}>
                Mes missions du quotidien
              </Intertitre>
              {missionsOuvertes && (
                <ol className="grid sm:grid-cols-2 gap-x-6 animate-fadeIn">
                  {f.missions.map((m, i) => (
                    <li key={i} className="flex items-baseline gap-3 py-2 border-b border-brand-ink/[0.08] text-sm text-brand-ink">
                      <span className="font-mono text-xs font-semibold text-fitness w-5">{String(i + 1).padStart(2, '0')}</span>{m}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <Intertitre actions={<Lien as={Link} to="/equipe/planning">planning complet</Lien>}>Ma semaine</Intertitre>
            <SemaineHoraires creneaux={data.mes_creneaux} />
          </div>
          <div>
            <Intertitre>Avec moi aujourd'hui</Intertitre>
            <TimelineJour presents={data.collegues} surligner={user.id} />
          </div>
        </section>
      </div>

      {panneauCr && <CompteRenduPanneau date={panneauCr} onClose={() => setPanneauCr(null)} onSaved={charger} />}
      {tacheOuverte && (
        <TachePanneau tache={tacheOuverte} membres={membres} onClose={() => setTacheOuverte(null)}
          onSaved={(t, o) => { if (!o?.silencieux) charger(); }} onDeleted={charger} />
      )}
    </div>
  );
}
