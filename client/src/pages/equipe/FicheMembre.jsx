import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import UserModal from '../../components/UserModal';
import FichePoste from '../../components/equipe/FichePoste';
import CoffreDocuments from '../../components/equipe/CoffreDocuments';
import NotesPrivees from '../../components/equipe/NotesPrivees';
import NotesSuivi from '../../components/equipe/NotesSuivi';
import CongesCarte from '../../components/equipe/CongesCarte';
import SemaineHoraires from '../../components/equipe/SemaineHoraires';
import { ListeTaches, AjoutRapide, TachePanneau, useBasculeTache } from '../../components/equipe/Taches';
import { CompteRenduCarte, CompteRenduPanneau } from '../../components/equipe/ComptesRendus';
import {
  Plaque, Marque, Onglets, Intertitre, Rien, Lien, BoutonEncre, BoutonTrait, Feuille, Compteurs,
} from '../../components/equipe/kit';
import { aujourdhuiISO, isoPlusJours } from '../../lib/equipe';

function OngletTaches({ membre, membres }) {
  const [taches, setTaches] = useState(null);
  const [ouverte, setOuverte] = useState(null);
  const charger = useCallback(() => { api.getTaches({ assigne_a: membre.id }).then(setTaches).catch(() => {}); }, [membre.id]);
  useEffect(() => { charger(); }, [charger]);
  const basculer = useBasculeTache(() => charger());
  if (!taches) return <p className="py-10 text-center text-xs text-gray-400">chargement…</p>;
  return (
    <div className="max-w-4xl">
      <div className="mb-6"><AjoutRapide assigneParDefaut={membre.id} onCree={charger} placeholder={`Nouvelle tâche pour ${membre.prenom}…`} /></div>
      <ListeTaches taches={taches} onOpen={setOuverte} onToggle={basculer} vide={<Rien>aucune tâche pour {membre.prenom}</Rien>} />
      {ouverte && (
        <TachePanneau tache={ouverte} membres={membres} onClose={() => setOuverte(null)}
          onSaved={(t, o) => { if (!o?.silencieux) charger(); }} onDeleted={charger} />
      )}
    </div>
  );
}

function OngletComptesRendus({ membre, estMoi }) {
  const [liste, setListe] = useState(null);
  const [panneau, setPanneau] = useState(null);
  const auj = aujourdhuiISO();
  const charger = useCallback(() => {
    api.getComptesRendus({ user_id: membre.id, debut: isoPlusJours(auj, -30) })
      .then(l => setListe(l.filter(cr => cr.user_id === membre.id))).catch(() => {});
  }, [membre.id]);
  useEffect(() => { charger(); }, [charger]);
  if (!liste) return <p className="py-10 text-center text-xs text-gray-400">chargement…</p>;
  return (
    <div className="space-y-3 max-w-4xl">
      {liste.length === 0
        ? <Rien>aucun compte rendu ces 30 derniers jours</Rien>
        : liste.map(cr => (
          <CompteRenduCarte key={cr.id} cr={cr} montrerAuteur={false} onDecision={charger}
            onModifier={estMoi && cr.date >= isoPlusJours(auj, -7) ? () => setPanneau(cr.date) : undefined} />
        ))}
      {panneau && <CompteRenduPanneau date={panneau} onClose={() => setPanneau(null)} onSaved={charger} />}
    </div>
  );
}

function Apercu({ membre, resume, fiche, isManager, allerA }) {
  return (
    <div className="space-y-6">
      <Feuille>
        <Compteurs items={[
          { label: 'jours travaillés · 30 j', valeur: resume.jours_travailles_30j },
          { label: 'bilans envoyés · 30 j', valeur: resume.cr_30j, note: resume.cr_30j ? `${resume.cr_valides_30j} validé${resume.cr_valides_30j > 1 ? 's' : ''}` : undefined },
          { label: 'tâches faites · 30 j', valeur: resume.taches_faites_30j, ton: 'vert' },
          { label: 'tâches en retard', valeur: resume.taches_en_retard, ton: resume.taches_en_retard ? 'corail' : undefined },
        ]} />
      </Feuille>
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <Feuille className="p-5">
          <Intertitre actions={<Lien as={Link} to="/equipe/planning">planning de l'équipe</Lien>}>Semaine en cours</Intertitre>
          <SemaineHoraires creneaux={resume.creneaux_semaine} />
        </Feuille>
        <div className="space-y-6">
          <Feuille className="p-5"><CongesCarte userId={membre.id} peutModifier={isManager} /></Feuille>
          <Feuille className="p-5">
            <Intertitre actions={<Lien onClick={() => allerA('poste')}>fiche complète</Lien>}>Poste</Intertitre>
            {fiche?.objectif ? (
              <>
                <p className="text-sm text-brand-ink leading-snug">{fiche.objectif}</p>
                <p className="text-xs text-gray-500 mt-2">{fiche.missions.length} missions · {fiche.indicateurs.length} chiffres au bilan</p>
              </>
            ) : <p className="text-xs text-gray-400">Fiche de poste à rédiger.</p>}
          </Feuille>
        </div>
      </div>
    </div>
  );
}

export default function FicheMembre() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const toast = useToast();
  const isManager = me?.role === 'manager';
  const estMoi = me?.id === Number(id);
  const { membres, rechargerMembres, rafraichirCompteurs } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [membre, setMembre] = useState(undefined);
  const [fiche, setFiche] = useState(null);
  const [resume, setResume] = useState(null);
  const [edition, setEdition] = useState(false);
  const [nouvelleTache, setNouvelleTache] = useState(false);

  const charger = useCallback(() => {
    api.getAppUser(id).then(setMembre).catch(() => setMembre(false));
    api.getFichePoste(id).then(setFiche).catch(() => {});
    api.getMembreResume(id).then(setResume).catch(() => {});
  }, [id]);
  useEffect(() => { charger(); }, [charger]);

  const onglets = [
    { id: 'apercu', label: 'Aperçu' },
    { id: 'poste', label: 'Fiche de poste' },
    { id: 'taches', label: 'Tâches', count: resume?.taches_ouvertes },
    { id: 'bilans', label: 'Comptes rendus' },
    { id: 'documents', label: 'Documents', count: resume?.docs_non_consultes, alerte: true },
    ...(isManager && !estMoi ? [{ id: 'suivi', label: 'Suivi' }] : []),
    ...(estMoi ? [{ id: 'notes', label: 'Carnet privé' }] : []),
  ];
  const onglet = onglets.some(o => o.id === params.get('onglet')) ? params.get('onglet') : 'apercu';
  const allerA = (o) => setParams(o === 'apercu' ? {} : { onglet: o }, { replace: true });

  if (membre === false) {
    return <Rien action={<BoutonTrait onClick={() => navigate('/equipe')}>Retour à l'équipe</BoutonTrait>}>fiche introuvable ou accès refusé</Rien>;
  }
  if (!membre || !resume) return <p className="py-16 text-center text-xs text-gray-400">chargement…</p>;

  async function enregistrerInfos(form) {
    await api.updateAppUser(membre.id, form);
    toast.success('Informations mises à jour');
    charger();
    rechargerMembres();
  }

  const depuis = membre.date_debut_contrat
    ? new Date(`${membre.date_debut_contrat}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div>
      {isManager && <Lien as={Link} to="/equipe/membres" className="inline-block mb-5">← effectif</Lien>}

      {/* ── En-tête : identité, comme dans Paramètres > Mon profil ─ */}
      <Feuille className="p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Plaque user={membre} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-bold text-brand-ink">{membre.prenom} {membre.nom}</h2>
              {membre.role === 'manager' && <Marque>manager</Marque>}
              {!membre.actif && <Marque ton="gris">inactif</Marque>}
              {estMoi && <Marque ton="bleu">c'est toi</Marque>}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1">{fiche?.intitule || 'poste non renseigné'}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-4">
              {depuis && <span>dans l'équipe depuis {depuis}</span>}
              {membre.email && <span>{membre.email}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {(isManager || estMoi) && <BoutonTrait onClick={() => setEdition(true)}>{estMoi ? 'Mes infos' : 'Modifier'}</BoutonTrait>}
            {isManager && <BoutonEncre onClick={() => setNouvelleTache(true)}>Assigner une tâche</BoutonEncre>}
          </div>
        </div>
      </Feuille>

      <Onglets onglets={onglets} actif={onglet} onChange={allerA} trait={false} className="mb-6 max-w-full overflow-x-auto" />

      <div key={onglet} className="motion-safe:animate-fadeIn">
        {onglet === 'apercu' && <Apercu membre={membre} resume={resume} fiche={fiche} isManager={isManager} allerA={allerA} />}
        {onglet === 'poste' && fiche && <FichePoste fiche={fiche} prenom={membre.prenom} peutModifier={isManager} onSaved={setFiche} />}
        {onglet === 'taches' && <OngletTaches membre={membre} membres={membres} />}
        {onglet === 'bilans' && <OngletComptesRendus membre={membre} estMoi={estMoi} />}
        {onglet === 'documents' && (
          <div className="max-w-4xl">
            <CoffreDocuments userId={membre.id} prenom={membre.prenom}
              onConsulte={() => { api.getMembreResume(id).then(setResume).catch(() => {}); rafraichirCompteurs?.(); }} />
          </div>
        )}
        {onglet === 'suivi' && isManager && !estMoi && <NotesSuivi membre={membre} />}
        {onglet === 'notes' && estMoi && <NotesPrivees />}
      </div>

      {edition && <UserModal user={membre} onSave={enregistrerInfos} onClose={() => setEdition(false)} />}
      {nouvelleTache && (
        <TachePanneau tache={null} membres={membres} assigneParDefaut={membre.id} onClose={() => setNouvelleTache(false)}
          onSaved={() => { charger(); allerA('taches'); }} />
      )}
    </div>
  );
}
