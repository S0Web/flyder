import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, BarChart3, Users, Flag } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { TachePanneau } from '../../components/equipe/Taches';
import { DemandesEnAttente } from '../../components/equipe/DemandesConges';
import IncidentPanneau from '../../components/equipe/IncidentPanneau';
import TimelineJour from '../../components/equipe/TimelineJour';
import { CompteRenduCarte } from '../../components/equipe/ComptesRendus';
import { Rubrique, Feuille, Intertitre, Compteurs, Compte, Rien, Lien } from '../../components/equipe/kit';
import { TYPES_ABSENCE, STATUTS_TACHE, jourCourt, dateDepuisISO, aujourdhuiISO } from '../../lib/equipe';

// Grille « qui a rendu son bilan » : une ligne par membre, une case par jour.
// Vert = validé · ambre = à valider · barré rouge = à revoir ·
// pointillés rouges = oublié un jour travaillé · hachures = ne travaillait pas.
function CaseBilan({ statut, travaille, passe }) {
  if (statut === 'valide') return <span className="block h-5 w-5 bg-green-500 rounded" />;
  if (statut === 'soumis') return <span className="block h-5 w-5 bg-amber-400 rounded" />;
  if (statut === 'a_revoir') return <span className="flex h-5 w-5 items-center justify-center border-2 border-red-500 rounded text-[10px] font-bold text-red-600">✕</span>;
  if (travaille && passe) return <span className="block h-5 w-5 border border-red-400 rounded" />;
  if (travaille) return <span className="block h-5 w-5 border border-gray-300 rounded" />;
  return <span className="block h-5 w-5 hachures rounded" />;
}

function SuiviComptesRendus({ suivi }) {
  const auj = aujourdhuiISO();
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[3px] min-w-[560px]">
        <thead>
          <tr>
            <th />
            {suivi.jours.map(d => {
              const dt = dateDepuisISO(d);
              return (
                <th key={d} className={`font-normal text-center pb-1 ${d === auj ? 'text-sky-600' : 'text-gray-400'}`}>
                  <div className="text-[9px] uppercase">{dt.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</div>
                  <div className="text-[10px]">{String(dt.getDate()).padStart(2, '0')}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {suivi.membres.map(m => (
            <tr key={m.id}>
              <td className="pr-4">
                <Link to={`/equipe/membres/${m.id}`} className="text-sm text-brand-ink hover:underline underline-offset-4 whitespace-nowrap">{m.prenom}</Link>
              </td>
              {suivi.jours.map(d => {
                const { statut, travaille } = m.jours[d];
                return (
                  <td key={d} title={`${jourCourt(d)}${statut && statut !== 'brouillon' ? '' : travaille ? (d < auj ? ' · oublié' : '') : ' · ne travaillait pas'}`}>
                    <CaseBilan statut={statut !== 'brouillon' ? statut : null} travaille={travaille} passe={d < auj} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="valide" /> validé</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="soumis" /> à valider</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="a_revoir" /> à revoir</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan travaille passe /> oublié</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan /> ne travaillait pas</span>
      </div>
    </div>
  );
}

// Chiffres saisis dans les bilans (indicateurs de type « nombre »), additionnés par
// membre : cette semaine, la semaine précédente et les 30 derniers jours.
const fmtNombre = (n) => String(n).replace('.', ',');

function ChiffresTerrain({ chiffres }) {
  if (chiffres.length === 0) {
    return <Rien>aucun chiffre saisi — dans une fiche de poste, choisis le type « nombre » pour les indicateurs à additionner</Rien>;
  }
  const entete = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500 pb-2';
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className={`${entete} text-left`}>membre · chiffre</th>
            <th className={`${entete} text-right w-28`}>cette semaine</th>
            <th className={`${entete} text-right w-28`}>sem. dernière</th>
            <th className={`${entete} text-right w-24`}>30 jours</th>
          </tr>
        </thead>
        <tbody>
          {chiffres.map(c => {
            const tendance = c.semaine_prec > 0 ? c.semaine - c.semaine_prec : null;
            return (
              <tr key={`${c.user_id}|${c.libelle}`} className="border-b border-gray-100">
                <td className="py-2.5 pr-3">
                  <Link to={`/equipe/membres/${c.user_id}`} className="text-sm text-brand-ink hover:underline underline-offset-4">{c.prenom}</Link>
                  <span className="text-sm text-gray-500"> · {c.libelle}</span>
                </td>
                <td className="py-2.5 text-right text-sm font-semibold tabular-nums text-brand-ink">
                  {fmtNombre(c.semaine)}
                  {tendance != null && tendance !== 0 && (
                    <span className={`ml-1.5 text-[10px] font-normal ${tendance > 0 ? 'text-[#0B7A3E]' : 'text-sky-600'}`}>{tendance > 0 ? '▲' : '▼'}</span>
                  )}
                </td>
                <td className="py-2.5 text-right text-sm tabular-nums text-gray-500">{fmtNombre(c.semaine_prec)}</td>
                <td className="py-2.5 text-right text-sm tabular-nums text-gray-500">{fmtNombre(c.trente_jours)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Charge de chacun : une case par tâche ouverte (rouge = en retard).
function ChargeMembres({ charge }) {
  const tri = [...charge].sort((a, b) => b.en_retard - a.en_retard || b.ouvertes - a.ouvertes);
  return (
    <div>
      <div className="grid grid-cols-[88px_1fr_56px] gap-3 text-[10px] text-gray-400 pb-2 border-b border-gray-200">
        <span />
        <span>tâches ouvertes</span>
        <span className="text-right">faites 7 j</span>
      </div>
      {tri.map(c => (
        <Link key={c.id} to={`/equipe/membres/${c.id}`}
          className="grid grid-cols-[88px_1fr_56px] gap-3 items-center py-2 border-b border-gray-100 group">
          <span className="text-sm text-brand-ink truncate group-hover:underline underline-offset-4">{c.prenom}</span>
          <span className="flex flex-wrap gap-[3px]">
            {Array.from({ length: c.ouvertes }, (_, i) => (
              <span key={i} className={`h-3.5 w-3.5 rounded ${i < c.en_retard ? 'bg-red-500' : 'bg-sky-500'}`} />
            ))}
            {c.ouvertes === 0 && <span className="text-[11px] text-gray-300">—</span>}
          </span>
          <span className="text-sm text-right tabular-nums text-brand-ink">{c.faites_7j}</span>
        </Link>
      ))}
      <p className="text-[11px] text-gray-500 mt-3">
        <span className="inline-block h-2.5 w-2.5 bg-red-500 rounded-sm mr-1.5 align-middle" />en retard
        <span className="inline-block h-2.5 w-2.5 bg-sky-500 rounded-sm ml-4 mr-1.5 align-middle" />dans les temps
      </p>
    </div>
  );
}

// Fusionne les jours consécutifs d'une même absence (ex. CP jeudi + vendredi).
// Les jours d'école récurrents sont déjà écartés par le serveur.
function regrouperAbsences(lignes) {
  const out = [];
  for (const l of [...lignes].sort((a, b) => a.id - b.id || a.date.localeCompare(b.date))) {
    const prec = out[out.length - 1];
    const lendemain = prec && new Date(dateDepuisISO(prec.fin).getTime() + 86400000);
    if (prec && prec.id === l.id && prec.type === l.type && lendemain && dateDepuisISO(l.date).getTime() === lendemain.getTime()) {
      prec.fin = l.date;
    } else {
      out.push({ ...l, debut: l.date, fin: l.date });
    }
  }
  return out.sort((a, b) => a.debut.localeCompare(b.debut));
}

const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export default function VueEnsemble() {
  const { rafraichirCompteurs, membres } = useOutletContext();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [problemeATraiter, setProblemeATraiter] = useState(null); // problème dont on crée la tâche
  const [problemeIncident, setProblemeIncident] = useState(null); // problème repris comme incident

  const charger = useCallback(() => {
    api.getVueEnsemble().then(setData).catch(e => setErreur(e.message));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <p className="text-sm text-red-600">Erreur : {erreur}</p>;
  if (!data) return <p className="py-20 text-center text-xs text-gray-400">chargement…</p>;

  const k = data.kpi;
  const onDecision = () => { charger(); rafraichirCompteurs(); };
  const resoudre = (p) => api.marquerProbleme(p.id, { resolu: true }).then(charger).catch(e => toast.error(e.message));

  return (
    <div>
      <Rubrique Icon={CalendarDays} titre="Aujourd'hui" />
      <Feuille>
        <Compteurs items={[
          { label: 'présents', valeur: `${k.presents}/${k.membres}` },
          { label: 'tâches ouvertes', valeur: k.taches_ouvertes },
          { label: 'en retard', valeur: k.taches_en_retard, ton: k.taches_en_retard ? 'corail' : undefined },
          { label: 'tâches tenues · 7 j', valeur: k.taux_7j == null ? '—' : `${k.taux_7j}%`, note: k.taches_echues_7j ? `${k.taches_tenues_7j}/${k.taches_echues_7j} échues terminées` : 'aucune échue' },
          { label: 'docs non ouverts', valeur: k.docs_non_consultes },
        ]} />
      </Feuille>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 mt-6 items-start">
        <Feuille className="p-4 sm:p-5">
          <Intertitre>Qui est là</Intertitre>
          <TimelineJour presents={data.presents} lienFiche />
        </Feuille>

        <div>
          <Intertitre actions={<Lien as={Link} to="/equipe/comptes-rendus">tout voir</Lien>}>
            À valider <Compte n={data.cr_a_valider.length} ton="bleu" className="ml-1.5" />
          </Intertitre>
          {data.cr_a_valider.length === 0 ? (
            <Rien>rien en attente</Rien>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {data.cr_a_valider.slice(0, 4).map(cr => <CompteRenduCarte key={cr.id} cr={cr} onDecision={onDecision} compact />)}
            </div>
          )}
        </div>
      </div>

      <DemandesEnAttente onChange={rafraichirCompteurs} />

      <Rubrique Icon={ClipboardCheck} ton="vert" titre="Bilans de fin de journée" sous="Sur les 14 derniers jours, croisés avec le planning : une case en pointillés est un jour travaillé sans bilan." />
      <Feuille className="p-4 sm:p-5">
        <SuiviComptesRendus suivi={data.suivi_cr} />
      </Feuille>

      <Rubrique Icon={BarChart3} ton="violet" titre="Chiffres du terrain" sous="Les chiffres saisis chaque soir dans les bilans envoyés, additionnés par membre." />
      <Feuille className="p-4 sm:p-5">
        <ChiffresTerrain chiffres={data.chiffres} />
      </Feuille>

      <Rubrique Icon={Users} ton="ambre" titre="Charge de l'équipe" />
      <Feuille className="p-4 sm:p-5 max-w-3xl">
        <Intertitre>Tâches ouvertes par personne</Intertitre>
        <ChargeMembres charge={data.charge} />
      </Feuille>

      <Rubrique Icon={Flag} ton="corail" titre="Terrain" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Feuille as="section" className="p-5">
          <Intertitre actions={<Lien as={Link} to="/equipe/incidents">incidents · {data.incidents.ouverts} ouvert{data.incidents.ouverts > 1 ? 's' : ''}{data.incidents.sans_responsable ? ` (${data.incidents.sans_responsable} sans responsable)` : ''}</Lien>}>
            Problèmes à traiter <Compte n={data.problemes.length} ton={data.problemes.length ? 'rouge' : 'gris'} className="ml-1.5" />
          </Intertitre>
          {data.problemes.length === 0 ? <Rien>aucun problème en attente</Rien> : (
            <ol>
              {data.problemes.map(p => (
                <li key={p.id} className="grid grid-cols-[20px_1fr] gap-2 py-2.5 border-b border-gray-100">
                  <span className="text-red-600 text-sm">⚑</span>
                  <div>
                    <p className="text-sm text-brand-ink leading-snug">{p.probleme}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{p.prenom} · {jjmm(p.date)}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      {p.tache_id ? (
                        <span className="text-[11px] text-brand-ink">
                          → tâche pour {p.tache_prenom} · {STATUTS_TACHE[p.tache_statut]?.label.toLowerCase()}
                        </span>
                      ) : (
                        <Lien onClick={() => setProblemeATraiter(p)}>créer une tâche</Lien>
                      )}
                      <Lien onClick={() => setProblemeIncident(p)}>suivre comme incident</Lien>
                      <Lien onClick={() => resoudre(p)}>marquer résolu</Lien>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Feuille>
        <Feuille as="section" className="p-5">
          <Intertitre>Absences · 3 semaines</Intertitre>
          {data.absences_a_venir.length === 0 ? <Rien>aucune absence prévue</Rien> : (
            <ol>
              {regrouperAbsences(data.absences_a_venir).map((a, i) => (
                <li key={i} className="grid grid-cols-[110px_1fr_auto] gap-3 items-baseline py-2.5 border-b border-gray-100">
                  <span className="text-xs text-brand-ink">{a.debut === a.fin ? jjmm(a.debut) : `${jjmm(a.debut)} → ${jjmm(a.fin)}`}</span>
                  <span className="text-sm text-brand-ink">{a.prenom}</span>
                  <span className="text-[11px] text-gray-500">{TYPES_ABSENCE[a.type]?.label.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          )}
        </Feuille>
      </div>

      {problemeIncident && (
        <IncidentPanneau incident={null} membres={membres}
          initial={{
            titre: problemeIncident.probleme.split('\n')[0].slice(0, 120),
            description: problemeIncident.probleme,
            compte_rendu_id: problemeIncident.id,
            sousTitre: `signalé par ${problemeIncident.prenom} le ${jjmm(problemeIncident.date)}`,
          }}
          onClose={() => setProblemeIncident(null)}
          onSaved={() => { charger(); rafraichirCompteurs?.(); }} />
      )}

      {problemeATraiter && (
        <TachePanneau tache={null} membres={membres}
          initial={{
            titre: `Problème : ${problemeATraiter.probleme.split('\n')[0].slice(0, 100)}`,
            description: `Signalé par ${problemeATraiter.prenom} le ${jjmm(problemeATraiter.date)} :\n${problemeATraiter.probleme}`,
          }}
          onClose={() => setProblemeATraiter(null)}
          onSaved={async (t) => {
            try { await api.marquerProbleme(problemeATraiter.id, { tache_id: t.id }); } catch (e) { toast.error(e.message); }
            charger();
          }} />
      )}
    </div>
  );
}
