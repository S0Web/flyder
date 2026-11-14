import { Check } from 'lucide-react';
import Reveal from './Reveal';
import TitreRevele from './TitreRevele';
import Carrousel from './Carrousel';

// Section consacrée à l'onglet Équipe de l'appli (planning du personnel,
// tâches et checklists, bilans de fin de journée, incidents). Même principe
// que Solutions — cartes avec mini-aperçu dessiné en CSS — mais sur panneaux
// sombres, pour que les deux sections ne se confondent pas.

// Frise "Qui est là" : les horaires du jour de chacun, trait corail = heure actuelle.
function ApercuPlanning() {
  const equipe = [
    { prenom: 'Léa', debut: '4%', largeur: '52%' },
    { prenom: 'Karim', debut: '30%', largeur: '48%' },
    { prenom: 'Inès', debut: '58%', largeur: '38%' },
  ];
  return (
    <div className="relative w-full space-y-3">
      {equipe.map(m => (
        <div key={m.prenom} className="flex items-center gap-3">
          <span className="w-10 text-[11px] font-semibold text-white/70">{m.prenom}</span>
          <div className="relative h-5 flex-1 rounded-md bg-white/[0.07]">
            <div className="absolute inset-y-0 rounded-md bg-brand-blue" style={{ left: m.debut, width: m.largeur }} />
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute -bottom-1.5 -top-1.5 w-0.5 rounded-full bg-brand-coral" style={{ left: '62%' }} />
    </div>
  );
}

function ApercuTaches() {
  const taches = [
    { nom: 'Contrôle du bassin', marque: 'Ouverture', faite: true },
    { nom: 'Relancer les essais', marque: 'Aujourd’hui', faite: false },
    { nom: 'Ranger la salle', marque: 'Fermeture', faite: false },
  ];
  return (
    <div className="w-full space-y-2">
      {taches.map(t => (
        <div key={t.nom} className="flex items-center gap-2.5 rounded-lg bg-white/[0.07] px-3 py-2.5">
          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${t.faite ? 'bg-brand-blue' : 'border border-white/30'}`}>
            {t.faite && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
          <span className={`flex-1 truncate text-xs font-medium ${t.faite ? 'text-white/40 line-through' : 'text-white/90'}`}>{t.nom}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/40">{t.marque}</span>
        </div>
      ))}
    </div>
  );
}

// Suivi des bilans : une case par personne et par jour.
// v = validé, a = à valider, m = jour travaillé sans bilan, r = repos.
function ApercuBilans() {
  const lignes = [
    { prenom: 'Léa', jours: 'vvvvrva' },
    { prenom: 'Karim', jours: 'vvrvvvm' },
    { prenom: 'Inès', jours: 'rvvvvra' },
  ];
  const style = {
    v: 'bg-white/80',
    a: 'bg-brand-coral',
    m: 'border border-dashed border-white/40',
    r: 'bg-white/[0.07]',
  };
  return (
    <div className="w-full space-y-2.5">
      {lignes.map(l => (
        <div key={l.prenom} className="flex items-center gap-3">
          <span className="w-10 text-[11px] font-semibold text-white/70">{l.prenom}</span>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {[...l.jours].map((j, i) => <span key={i} className={`h-5 rounded ${style[j]}`} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApercuIncidents() {
  const incidents = [
    { type: 'Bassin', nom: 'pH trop élevé', statut: 'En cours', vif: true },
    { type: 'Matériel', nom: 'Vélo n°4 bloqué', statut: 'Ouvert', vif: true },
    { type: 'Autre', nom: 'Fuite vestiaire', statut: 'Résolu', vif: false },
  ];
  return (
    <div className="w-full space-y-2">
      {incidents.map(i => (
        <div key={i.nom} className="rounded-lg bg-white/[0.07] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-white/40">{i.type}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${i.vif ? 'text-brand-coral' : 'text-white/40'}`}>{i.statut}</span>
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-white/90">{i.nom}</div>
        </div>
      ))}
    </div>
  );
}

const CARDS = [
  {
    Apercu: ApercuPlanning,
    title: 'Planning du personnel',
    text: "Horaires, congés et absences de toute l'équipe, semaine par semaine. Chacun voit avec qui il travaille et qui prend le relais.",
  },
  {
    Apercu: ApercuTaches,
    title: 'Tâches et checklists',
    text: "Des tâches avec échéance et priorité. Les routines d'ouverture, de fermeture et de bassin vont toutes seules à la personne planifiée.",
  },
  {
    Apercu: ApercuBilans,
    title: 'Bilans de fin de journée',
    text: "Avant de partir, chacun envoie son bilan : missions faites, chiffres du jour, problème à signaler. Le manager valide ou renvoie à revoir.",
  },
  {
    Apercu: ApercuIncidents,
    title: 'Incidents',
    text: "Bassin, matériel ou autre : chaque panne a un responsable, un statut et la trace de la mesure prise.",
  },
];

export default function Equipe() {
  return (
    <section id="equipe" className="scroll-mt-24 pt-20 sm:pt-40">
      <div className="mx-auto mb-10 max-w-3xl px-5 text-center sm:mb-20 sm:px-8">
        <TitreRevele texte="Votre équipe aussi a son tableau de bord"
          className="display-lg text-4xl text-brand-ink sm:text-6xl" />
        <Reveal as="p" className="mx-auto mt-6 max-w-xl text-lg text-brand-ink/60">
          Chaque salarié y trouve sa journée, ses tâches et son bilan. Le manager, lui, voit d'un coup d'œil qui est là et ce qui attend.
        </Reveal>
      </div>

      <Carrousel
        grille="md:grid-cols-2 lg:grid-cols-4"
        classeCarte="rounded-[1.75rem] bg-brand-sand p-2"
        cartes={CARDS.map(({ Apercu, title, text }) => ({
          titre: title,
          contenu: (
            <>
              <div aria-hidden="true" className="flex h-52 items-center rounded-[1.375rem] bg-brand-ink px-5">
                <Apercu />
              </div>
              <div className="px-5 pb-6 pt-5">
                <h3 className="text-xl font-semibold tracking-tight text-brand-ink">{title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-brand-ink/60">{text}</p>
              </div>
            </>
          ),
        }))}
      />
    </section>
  );
}
