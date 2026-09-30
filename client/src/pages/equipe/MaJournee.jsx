import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ListeTaches, AjoutRapide, TachePanneau, useBasculeTache } from '../../components/equipe/Taches';
import { CompteRenduPanneau } from '../../components/equipe/ComptesRendus';
import SemaineHoraires from '../../components/equipe/SemaineHoraires';
import TimelineJour from '../../components/equipe/TimelineJour';
import MesCours from '../../components/equipe/MesCours';
import { DemandeCongePanneau } from '../../components/equipe/DemandesConges';
import { Feuille, Intertitre, Compteurs, Tampon, BoutonCorail, Lien, Rien } from '../../components/equipe/kit';
import { salutation, fmtHeure, aujourdhuiISO, jourCourt, TYPES_ABSENCE } from '../../lib/equipe';

const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export default function MaJournee() {
  const { user } = useAuth();
  const { membres, rafraichirCompteurs } = useOutletContext();
  const [data, setData] = useState(null);
  const [panneauCr, setPanneauCr] = useState(null); // date
  const [tacheOuverte, setTacheOuverte] = useState(null);
  const [missionsOuvertes, setMissionsOuvertes] = useState(false);
  const [congeOuvert, setCongeOuvert] = useState(false);

  const charger = useCallback(() => {
    api.getMaJournee().then(setData).catch(() => {});
    rafraichirCompteurs?.();
  }, [rafraichirCompteurs]);
  useEffect(() => { charger(); }, [charger]);

  const basculer = useBasculeTache(() => charger());

  if (!data) return <p className="py-20 text-center text-xs text-gray-400">chargement…</p>;

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
      {/* ── En-tête : le service du jour ─────────────────────────── */}
      <Feuille className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">{salutation()} {user.prenom} — ton service aujourd'hui</div>
            <div className="font-display font-bold text-brand-ink leading-none tracking-tight mt-2 text-4xl sm:text-5xl">
              {absenceAuj ? (TYPES_ABSENCE[absenceAuj.type]?.label || 'Absent')
                : travailAuj.length ? travailAuj.map((c, i) => (
                  <span key={i} className="block sm:inline">
                    {i > 0 && <span className="hidden sm:inline text-gray-300"> / </span>}
                    {fmtHeure(c.debut)}<span className="text-sky-500">→</span>{fmtHeure(c.fin)}
                  </span>
                ))
                : <span className="text-gray-300">Repos</span>}
            </div>
            {f.intitule && <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-3">{f.intitule}</div>}
            {f.objectif && <p className="mt-1 text-sm text-gray-700 max-w-2xl leading-snug">{f.objectif}</p>}
          </div>

          <div>
            {cr?.statut === 'valide' || cr?.statut === 'soumis' ? (
              <button onClick={() => setPanneauCr(auj)} className="inline-flex flex-col items-start sm:items-end gap-2">
                <Tampon statut={cr.statut} />
                <span className="text-xs font-medium text-sky-600 hover:underline underline-offset-2">revoir mon bilan</span>
              </button>
            ) : (
              <BoutonCorail onClick={() => setPanneauCr(auj)}>
                {cr?.statut === 'brouillon' ? 'Reprendre mon bilan' : cr?.statut === 'a_revoir' ? 'Corriger mon bilan' : 'Faire mon bilan de fin de journée'} →
              </BoutonCorail>
            )}
          </div>
        </div>
      </Feuille>

      <Feuille>
        <Compteurs items={[
          { label: "à faire aujourd'hui", valeur: duJour },
          ...(Array.isArray(data.cours) ? [{ label: "cours aujourd'hui", valeur: data.cours.filter(c => c.date === auj).length }] : []),
          { label: 'en retard', valeur: enRetard, ton: enRetard ? 'corail' : undefined },
          { label: 'terminées · 7 jours', valeur: data.faites_7j, ton: 'vert' },
          ...(data.cp_restant != null ? [{ label: 'congés restants', valeur: String(data.cp_restant).replace('.', ',') }] : []),
        ]} />
      </Feuille>

      {/* ── Ce qui attend : une ligne par alerte, pas d'encadré ─────── */}
      {(data.cr_a_revoir.length > 0 || data.docs_non_consultes > 0 || data.demandes_conges.length > 0) && (
        <ul className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {data.cr_a_revoir.map(r => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
              <span className="text-xs font-medium text-red-600 w-24">⚑ à revoir</span>
              <span className="flex-1 min-w-[200px] text-sm text-brand-ink">Bilan du {jjmm(r.date)} — {r.retour_manager}</span>
              <Lien onClick={() => setPanneauCr(r.date)}>corriger</Lien>
            </li>
          ))}
          {data.demandes_conges.map(d => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
              <span className="text-xs font-medium text-sky-600 w-24">✎ congé</span>
              <span className="flex-1 min-w-[200px] text-sm text-brand-ink">
                {d.date_debut === d.date_fin ? jjmm(d.date_debut) : `${jjmm(d.date_debut)} → ${jjmm(d.date_fin)}`}
                {' : '}{d.statut === 'en_attente' ? 'en attente de réponse' : d.statut === 'acceptee' ? 'accepté' : 'refusé'}
                {d.retour_manager ? ` — ${d.retour_manager}` : ''}
              </span>
            </li>
          ))}
          {data.docs_non_consultes > 0 && (
            <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
              <span className="text-xs font-medium text-sky-600 w-24">✉ nouveau</span>
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
          <MesCours cours={data.cours} />
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
                    <li key={i} className="flex items-baseline gap-3 py-2 border-b border-gray-100 text-sm text-brand-ink">
                      <span className="text-xs font-semibold text-sky-600 w-5">{String(i + 1).padStart(2, '0')}</span>{m}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {data.transmission.length > 0 && (
            <div>
              <Intertitre>À savoir en arrivant</Intertitre>
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
                {data.transmission.map(t => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="text-[11px] text-gray-500">{t.prenom} · {jourCourt(t.date)}</div>
                    {t.priorite_demain && (
                      <p className="mt-1 text-sm text-brand-ink leading-snug"><span className="text-sky-600">→</span> {t.priorite_demain}</p>
                    )}
                    {t.probleme && (
                      <p className="mt-1 text-sm text-brand-ink leading-snug"><span className="text-red-600">⚑</span> {t.probleme}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Feuille className="p-5">
            <Intertitre actions={<span className="flex gap-4"><Lien onClick={() => setCongeOuvert(true)}>Demander un congé</Lien><Lien as={Link} to="/equipe/planning">Planning complet</Lien></span>}>Ma semaine</Intertitre>
            <SemaineHoraires creneaux={data.mes_creneaux} />
          </Feuille>
          <Feuille className="p-5">
            <Intertitre>Avec moi aujourd'hui</Intertitre>
            <TimelineJour presents={data.collegues} surligner={user.id} />
          </Feuille>
        </section>
      </div>

      {congeOuvert && <DemandeCongePanneau onClose={() => setCongeOuvert(false)} onChange={charger} />}
      {panneauCr && <CompteRenduPanneau date={panneauCr} onClose={() => setPanneauCr(null)} onSaved={charger} />}
      {tacheOuverte && (
        <TachePanneau tache={tacheOuverte} membres={membres} onClose={() => setTacheOuverte(null)}
          onSaved={(t, o) => { if (!o?.silencieux) charger(); }} onDeleted={charger} />
      )}
    </div>
  );
}
