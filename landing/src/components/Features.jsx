import { CalendarDays, ClipboardList, BarChart3, FileText, CreditCard, ShieldCheck } from 'lucide-react';

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
    <section id="fonctionnalites" className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Tout ce qu'il faut pour faire tourner votre salle
          </h2>
          <p className="mt-4 text-brand-cream/50">
            Chaque fonctionnalité a été construite pour un usage réel en salle, pas pour remplir une liste marketing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-5 bg-white/10">
                <Icon className="h-5 w-5" style={{ color: '#8395FE' }} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-brand-cream/50 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
