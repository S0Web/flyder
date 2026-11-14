import { CalendarDays, ClipboardList, BarChart3, FileText, CreditCard, ShieldCheck } from 'lucide-react';
import Reveal from './Reveal';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Planning des cours',
    text: "Grille visuelle ou vue liste, glisser-déposer, duplication d'une semaine type — organisez vos créneaux en quelques clics.",
  },
  {
    icon: ClipboardList,
    title: 'Gestion des coachs',
    text: "Heures effectuées, présences, disponibilités : un récapitulatif toujours à jour pour chaque coach de l'équipe.",
  },
  {
    icon: BarChart3,
    title: 'Analyse & statistiques',
    text: "Fréquentation, taux d'annulation, évolution mois après mois — des tableaux de bord clairs pour piloter votre activité.",
  },
  {
    icon: FileText,
    title: 'RH & documents',
    text: "Fiches de paie, contrats, diplômes centralisés et accessibles à chacun selon son rôle, en toute confidentialité.",
  },
  {
    icon: CreditCard,
    title: 'Facturation & paiement',
    text: "Abonnement géré automatiquement via Stripe — plus de relances manuelles, plus d'oublis de renouvellement.",
  },
  {
    icon: ShieldCheck,
    title: 'Sécurité & conformité',
    text: "Accès par rôle, sauvegardes chiffrées automatiques, conformité RGPD — vos données et celles de vos adhérents sont protégées.",
  },
];

export default function Features() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20 px-3 sm:px-5">
      <div className="mx-auto max-w-[84rem] rounded-[2rem] bg-brand-sand py-20 sm:rounded-[2.5rem] sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="mb-14 max-w-3xl sm:mb-20">
            <h2 className="display-lg text-4xl text-brand-ink sm:text-6xl">
              Tout ce qu'il faut pour faire tourner votre salle
            </h2>
            <p className="mt-6 max-w-xl text-lg text-brand-ink/60">
              Chaque fonctionnalité a été construite pour un usage réel en salle, pas pour remplir une liste marketing.
            </p>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 100} className="rounded-3xl bg-brand-cream p-7 sm:p-8">
                <div className="mb-10 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ink">
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-brand-ink">{title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-brand-ink/60">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
