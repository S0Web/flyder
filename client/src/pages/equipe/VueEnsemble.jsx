import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import TimelineJour from '../../components/equipe/TimelineJour';
import { CompteRenduCarte } from '../../components/equipe/ComptesRendus';
import { Rubrique, Feuille, Intertitre, Compteurs, Rien, Lien } from '../../components/equipe/kit';
import { TYPES_ABSENCE, jourCourt, dateDepuisISO, aujourdhuiISO } from '../../lib/equipe';

// Grille « qui a rendu son bilan » : une ligne par membre, une case par jour.
// Plein encre = validé · plein corail = à valider · barré = à revoir ·
// pointillés = oublié un jour travaillé · hachures = ne travaillait pas.
function CaseBilan({ statut, travaille, passe }) {
  if (statut === 'valide') return <span className="block h-5 w-5 bg-brand-ink rounded-[2px]" />;
  if (statut === 'soumis') return <span className="block h-5 w-5 bg-fitness rounded-[2px]" />;
  if (statut === 'a_revoir') return <span className="flex h-5 w-5 items-center justify-center border-2 border-fitness rounded-[2px] font-mono text-[10px] font-bold text-fitness">✕</span>;
  if (travaille && passe) return <span className="block h-5 w-5 border border-dashed border-fitness rounded-[2px]" />;
  if (travaille) return <span className="block h-5 w-5 border border-brand-ink/20 rounded-[2px]" />;
  return <span className="block h-5 w-5 hachures rounded-[2px]" />;
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
                <th key={d} className={`font-mono font-normal text-center pb-1 ${d === auj ? 'text-fitness' : 'text-gray-400'}`}>
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
                <Link to={`/equipe/membres/${m.id}`} className="text-sm text-brand-ink hover:underline decoration-fitness underline-offset-4 whitespace-nowrap">{m.prenom}</Link>
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 font-mono text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="valide" /> validé</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="soumis" /> à valider</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan statut="a_revoir" /> à revoir</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan travaille passe /> oublié</span>
        <span className="inline-flex items-center gap-1.5"><CaseBilan /> ne travaillait pas</span>
      </div>
    </div>
  );
}

// Charge de chacun : une case par tâche ouverte (corail = en retard).
function ChargeMembres({ charge }) {
  const tri = [...charge].sort((a, b) => b.en_retard - a.en_retard || b.ouvertes - a.ouvertes);
  return (
    <div>
      <div className="grid grid-cols-[88px_1fr_56px] gap-3 font-mono text-[10px] text-gray-400 pb-2 border-b border-brand-ink/15">
        <span />
        <span>tâches ouvertes</span>
        <span className="text-right">faites 7 j</span>
      </div>
      {tri.map(c => (
        <Link key={c.id} to={`/equipe/membres/${c.id}`}
          className="grid grid-cols-[88px_1fr_56px] gap-3 items-center py-2 border-b border-brand-ink/[0.07] group">
          <span className="text-sm text-brand-ink truncate group-hover:underline decoration-fitness underline-offset-4">{c.prenom}</span>
          <span className="flex flex-wrap gap-[3px]">
            {Array.from({ length: c.ouvertes }, (_, i) => (
              <span key={i} className={`h-3.5 w-3.5 rounded-[2px] ${i < c.en_retard ? 'bg-fitness' : 'bg-brand-ink'}`} />
            ))}
            {c.ouvertes === 0 && <span className="font-mono text-[11px] text-gray-300">—</span>}
          </span>
          <span className="font-mono text-sm text-right tabular-nums text-brand-ink">{c.faites_7j}</span>
        </Link>
      ))}
      <p className="font-mono text-[11px] text-gray-500 mt-3">
        <span className="inline-block h-2.5 w-2.5 bg-fitness rounded-[1px] mr-1.5 align-middle" />en retard
        <span className="inline-block h-2.5 w-2.5 bg-brand-ink rounded-[1px] ml-4 mr-1.5 align-middle" />dans les temps
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
  const { rafraichirCompteurs } = useOutletContext();
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(() => {
    api.getVueEnsemble().then(setData).catch(e => setErreur(e.message));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <p className="font-mono text-sm text-fitness">erreur : {erreur}</p>;
  if (!data) return <p className="py-20 text-center font-mono text-xs text-gray-400">chargement…</p>;

  const k = data.kpi;
  const onDecision = () => { charger(); rafraichirCompteurs(); };

  return (
    <div>
      <Rubrique numero="01" titre="Aujourd'hui" />
      <Feuille>
        <Compteurs items={[
          { label: 'présents', valeur: `${k.presents}/${k.membres}` },
          { label: 'tâches ouvertes', valeur: k.taches_ouvertes },
          { label: 'en retard', valeur: k.taches_en_retard, ton: k.taches_en_retard ? 'corail' : undefined },
          { label: 'tâches tenues · 7 j', valeur: k.taux_7j == null ? '—' : `${k.taux_7j}%`, note: k.taches_echues_7j ? `${k.taches_tenues_7j}/${k.taches_echues_7j} échues terminées` : 'aucune échue' },
          { label: 'bilans à valider', valeur: k.cr_a_valider, ton: k.cr_a_valider ? 'corail' : undefined, note: `${k.cr_du_jour} reçu${k.cr_du_jour > 1 ? 's' : ''} aujourd'hui` },
          { label: 'docs non ouverts', valeur: k.docs_non_consultes },
        ]} />
      </Feuille>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 mt-6">
        <Feuille className="p-4 sm:p-5">
          <Intertitre>Qui est là</Intertitre>
          <TimelineJour presents={data.presents} lienFiche />
        </Feuille>

        <div>
          <Intertitre actions={<Lien as={Link} to="/equipe/comptes-rendus">tout voir</Lien>}>
            À valider <span className="font-mono text-xs font-normal text-fitness ml-1">{String(data.cr_a_valider.length).padStart(2, '0')}</span>
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

      <Rubrique numero="02" titre="Bilans de fin de journée" sous="Sur les 14 derniers jours, croisés avec le planning : une case en pointillés est un jour travaillé sans bilan." />
      <Feuille className="p-4 sm:p-5">
        <SuiviComptesRendus suivi={data.suivi_cr} />
      </Feuille>

      <Rubrique numero="03" titre="Charge de l'équipe" />
      <Feuille className="p-4 sm:p-5 max-w-3xl">
        <Intertitre>Tâches ouvertes par personne</Intertitre>
        <ChargeMembres charge={data.charge} />
      </Feuille>

      <Rubrique numero="04" titre="Terrain" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <Intertitre>Problèmes signalés · 7 jours</Intertitre>
          {data.problemes.length === 0 ? <Rien>aucun problème remonté</Rien> : (
            <ol>
              {data.problemes.map(p => (
                <li key={p.id} className="grid grid-cols-[20px_1fr] gap-2 py-2.5 border-b border-brand-ink/[0.08]">
                  <span className="font-mono text-fitness text-sm">⚑</span>
                  <div>
                    <p className="text-sm text-brand-ink leading-snug">{p.probleme}</p>
                    <p className="font-mono text-[11px] text-gray-500 mt-1">{p.prenom} · {jjmm(p.date)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <Intertitre>Absences · 3 semaines</Intertitre>
          {data.absences_a_venir.length === 0 ? <Rien>aucune absence prévue</Rien> : (
            <ol>
              {regrouperAbsences(data.absences_a_venir).map((a, i) => (
                <li key={i} className="grid grid-cols-[110px_1fr_auto] gap-3 items-baseline py-2.5 border-b border-brand-ink/[0.08]">
                  <span className="font-mono text-xs text-brand-ink">{a.debut === a.fin ? jjmm(a.debut) : `${jjmm(a.debut)} → ${jjmm(a.fin)}`}</span>
                  <span className="text-sm text-brand-ink">{a.prenom}</span>
                  <span className="font-mono text-[11px] text-gray-500">{TYPES_ABSENCE[a.type]?.label.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
