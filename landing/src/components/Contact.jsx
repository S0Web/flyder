import { Mail, ArrowRight } from 'lucide-react';

// Pas de backend de formulaire pour l'instant : un mailto: suffit pour démarrer
// une conversation, sans avoir à construire un système de leads dès le v1.
const CONTACT_EMAIL = 'selimouadi31@gmail.com';
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Demande de démonstration Flyder')}`;

export default function Contact() {
  return (
    <section id="contact" className="py-24 sm:py-32 bg-brand-cream">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="relative rounded-3xl overflow-hidden px-8 py-16 sm:px-16 sm:py-20 text-center" style={{ backgroundColor: '#12162B' }}>
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FF5A36 0%, transparent 70%)' }} />

          <h2 className="relative text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Prêt à simplifier la gestion de votre salle ?
          </h2>
          <p className="relative mt-4 text-brand-cream/60 max-w-lg mx-auto">
            Parlons de votre salle et de votre fonctionnement — on vous montre Flyder en conditions réelles, sans engagement.
          </p>
          <a href={MAILTO}
            className="relative mt-8 inline-flex items-center gap-2 text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3D5AFE' }}>
            <Mail className="h-4 w-4" /> Demander une démonstration <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
