import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import UserModal from '../../components/UserModal';
import ImportFichesDePaieModal from '../../components/ImportFichesDePaieModal';
import { Plaque, Marque, BoutonEncre, BoutonTrait, Lien } from '../../components/equipe/kit';
import { fmtDuree, ecartContrat } from '../../lib/equipe';

const COULEUR_BILAN = { valide: 'bg-brand-ink', soumis: 'bg-fitness', a_revoir: 'border-2 border-fitness' };

// Feuille d'effectif : un membre par ligne, comme une composition d'équipe.
export default function Membres() {
  const toast = useToast();
  const navigate = useNavigate();
  const { rechargerMembres } = useOutletContext();
  const { user: me } = useAuth();
  const { salleNom } = useConfig();
  const [membres, setMembres] = useState(null);
  const [importer, setImporter] = useState(false);
  const [demoEnCours, setDemoEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [nouveau, setNouveau] = useState(false);
  const [voirInactifs, setVoirInactifs] = useState(false);

  const charger = useCallback(() => { api.getMembres().then(setMembres).catch(e => toast.error(e.message)); }, []);
  useEffect(() => { charger(); }, [charger]);

  async function creer(form) {
    await api.createAppUser(form);
    toast.success(`${form.prenom} a rejoint l'équipe`);
    charger();
    rechargerMembres();
  }

  async function basculerActif(m) {
    try {
      await api.updateAppUser(m.id, { actif: m.actif ? 0 : 1 });
      toast.success(m.actif ? `${m.prenom} est désactivé` : `${m.prenom} est réactivé`);
      charger();
      rechargerMembres();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function supprimer(m) {
    if (!confirm(`Supprimer définitivement ${m.prenom} ${m.nom} ?\n\nIl disparaît de la liste mais son nom reste visible sur les plannings passés où il apparaît.`)) return;
    try {
      await api.deleteAppUser(m.id);
      toast.success('Profil supprimé');
      charger();
      rechargerMembres();
    } catch (e) {
      toast.error(e.message);
    }
  }

  // Données de démonstration : uniquement sur l'instance « Demo-Portfolio » dédiée, jamais
  // sur une vraie salle (le serveur refuse ailleurs).
  async function regenererDemo() {
    if (!confirm('Réinitialiser les données de démonstration ? Les coachs et séances fictifs actuels seront effacés puis régénérés.')) return;
    setDemoEnCours(true);
    try {
      const res = await api.seedDemo(true);
      toast.success(`${res.coachsCrees} coach(s) fictif(s) et ${res.seancesCreees} séance(s) régénérés.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDemoEnCours(false);
    }
  }

  if (!membres) return <p className="py-16 text-center font-mono text-xs text-gray-400">chargement…</p>;

  const q = recherche.trim().toLowerCase();
  const inactifs = membres.filter(m => !m.actif).length;
  const visibles = membres.filter(m => (voirInactifs || m.actif) && (!q || `${m.prenom} ${m.nom} ${m.intitule}`.toLowerCase().includes(q)));
  const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
  const entete = 'font-mono text-[10px] text-gray-400 font-normal text-left pb-2';

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="rechercher un nom, un poste…"
          className="font-mono text-xs bg-transparent border-0 border-b border-brand-ink/25 px-0 py-1.5 w-60 focus:outline-none focus:ring-0 focus:border-fitness" />
        {inactifs > 0 && (
          <button onClick={() => setVoirInactifs(v => !v)} className="font-mono text-[11px] text-gray-500 hover:text-brand-ink underline underline-offset-4">
            {voirInactifs ? 'masquer' : 'afficher'} les inactifs ({inactifs})
          </button>
        )}
        <div className="flex-1" />
        <BoutonTrait onClick={() => setImporter(true)}>Importer les fiches de paie</BoutonTrait>
        <BoutonEncre onClick={() => setNouveau(true)}>Ajouter un membre</BoutonEncre>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[840px] border-collapse">
          <thead>
            <tr className="border-b-2 border-brand-ink">
              <th className={`${entete} w-10`}>n°</th>
              <th className={entete}>membre</th>
              <th className={`${entete} w-28 text-right`}>semaine · contrat</th>
              <th className={`${entete} w-24 text-right`}>tâches</th>
              <th className={`${entete} w-28 pl-6`}>dernier bilan</th>
              <th className={`${entete} w-16 text-right`}>congés</th>
              <th className={`${entete} w-20 text-right`}>docs</th>
              <th className={`${entete} w-24`} />
            </tr>
          </thead>
          <tbody>
            {visibles.map((m, i) => (
              <tr key={m.id} onClick={() => navigate(`/equipe/membres/${m.id}`)}
                className={`group border-b border-brand-ink/10 cursor-pointer hover:bg-white transition-colors ${m.actif ? '' : 'opacity-45'}`}>
                <td className="py-4 align-top font-mono text-xs text-gray-400">{String(i + 1).padStart(2, '0')}</td>
                <td className="py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Plaque user={m} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-[17px] font-bold text-brand-ink group-hover:underline decoration-fitness decoration-2 underline-offset-4">
                          {m.prenom} {m.nom}
                        </span>
                        {m.role === 'manager' && <Marque>manager</Marque>}
                        {!m.actif && <Marque ton="gris">inactif</Marque>}
                      </div>
                      <div className="font-mono text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">{m.intitule || <span className="normal-case tracking-normal text-gray-400">fiche de poste à rédiger</span>}</div>
                      {m.objectif && <p className="text-sm text-gray-600 mt-1.5 max-w-xl leading-snug">{m.objectif}</p>}
                    </div>
                  </div>
                </td>
                <td className="py-4 align-top text-right font-mono text-sm text-brand-ink tabular-nums">
                  {fmtDuree(m.minutes_semaine)}
                  {m.heures_contrat_semaine ? (() => {
                    const ecart = ecartContrat(m.minutes_semaine, m.heures_contrat_semaine);
                    return (
                      <div className="text-[11px] text-gray-400">
                        / {fmtDuree(m.heures_contrat_semaine * 60)}
                        {Math.abs(ecart) >= 30 && (
                          <span className={`ml-1.5 ${ecart > 0 ? 'text-fitness' : 'text-gray-500'}`} title={ecart > 0 ? 'Planifié au-delà du contrat' : 'Planifié en dessous du contrat'}>
                            {ecart > 0 ? '+' : '−'}{fmtDuree(Math.abs(ecart))}
                          </span>
                        )}
                      </div>
                    );
                  })() : null}
                </td>
                <td className="py-4 align-top text-right font-mono text-sm tabular-nums">
                  <span className="text-brand-ink">{m.taches_ouvertes}</span>
                  {m.taches_en_retard > 0 && <div className="text-[11px] text-fitness">{m.taches_en_retard} en retard</div>}
                </td>
                <td className="py-4 align-top pl-6 font-mono text-sm text-brand-ink">
                  {m.dernier_cr ? (
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-[1px] ${COULEUR_BILAN[m.dernier_cr.statut] || 'bg-gray-300'}`} />
                      {jjmm(m.dernier_cr.date)}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-4 align-top text-right font-mono text-sm text-brand-ink tabular-nums">
                  {m.cp_restant == null ? <span className="text-gray-300">—</span> : String(m.cp_restant).replace('.', ',')}
                </td>
                <td className="py-4 align-top text-right font-mono text-[11px]">
                  {m.docs_non_consultes > 0 ? <span className="text-fitness">{m.docs_non_consultes} non ouvert{m.docs_non_consultes > 1 ? 's' : ''}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-4 pl-4 align-top text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  {m.id !== me?.id && (
                    <div className="flex flex-col items-end gap-1">
                      <Lien onClick={() => basculerActif(m)}>{m.actif ? 'désactiver' : 'réactiver'}</Lien>
                      {!m.actif && <Lien onClick={() => supprimer(m)}>supprimer</Lien>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {salleNom === 'Demo-Portfolio' && (
        <div className="mt-6 text-right">
          <button onClick={regenererDemo} disabled={demoEnCours}
            className="font-mono text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-4 disabled:opacity-50">
            {demoEnCours ? 'génération…' : 'régénérer les données de démonstration'}
          </button>
        </div>
      )}

      {nouveau && <UserModal user={{}} onSave={creer} onClose={() => setNouveau(false)} />}
      {importer && (
        <ImportFichesDePaieModal users={membres.filter(m => m.actif)} onClose={() => setImporter(false)}
          onImported={() => charger()} />
      )}
    </div>
  );
}
