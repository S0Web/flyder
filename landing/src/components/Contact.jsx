import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import Reveal from './Reveal';
import TitreRevele from './TitreRevele';

const LEADS_URL = 'https://admin.flyder.fr/api/leads';

const OBJET_DEFAUT = 'Demande de démonstration Flyder';
const MESSAGE_DEFAUT = `Bonjour,

Je gère une salle de sport et j'aimerais voir Flyder en conditions réelles.

Pouvez-vous me proposer un créneau pour une démonstration ?

Merci,`;

const CHAMP = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm text-white placeholder-white/35 transition-colors focus:border-white/40 focus:outline-none';

export default function Contact() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [objet, setObjet] = useState(OBJET_DEFAUT);
  const [message, setMessage] = useState(MESSAGE_DEFAUT);
  // Honeypot : champ jamais rempli par un humain (masqué visuellement), sert
  // à filtrer une partie des bots sans reCAPTCHA ni dépendance externe.
  const [site, setSite] = useState('');
  const [statut, setStatut] = useState('idle'); // idle | envoi | ok | erreur

  async function envoyer(e) {
    e.preventDefault();
    setStatut('envoi');
    // Sans délai limite, une requête qui ne reçoit jamais de réponse (backend
    // qui bloque, proxy muet) laisse le bouton bloqué sur "Envoi en cours"
    // indéfiniment — on abandonne et on affiche une erreur après 15s.
    const controller = new AbortController();
    const delai = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, objet, message, site }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Échec envoi');
      setStatut('ok');
      // "generate_lead" est le nom d'événement recommandé par GA4 pour ce
      // type de conversion — permet à GTM/GA4 de le traiter comme un
      // événement standard sans configuration supplémentaire côté mapping.
      window.dataLayer?.push({ event: 'generate_lead' });
    } catch {
      setStatut('erreur');
    } finally {
      clearTimeout(delai);
    }
  }

  return (
    <section id="contact" className="scroll-mt-20 px-3 py-16 sm:px-5 sm:py-36">
      <Reveal className="mx-auto max-w-[84rem] rounded-[2rem] bg-brand-ink px-6 py-12 sm:rounded-[2.5rem] sm:px-14 sm:py-24">
        {statut === 'ok' ? (
          <div className="mx-auto max-w-xl py-10 text-center" role="status">
            <CheckCircle2 className="mx-auto mb-6 h-12 w-12 text-brand-blue" />
            <h2 className="display-lg text-4xl text-white sm:text-5xl">Demande envoyée</h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-brand-cream/60">
              Merci ! On revient vers vous très vite pour organiser votre démonstration.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <TitreRevele texte="Prêt à simplifier la gestion de votre salle ?"
                className="display-lg text-4xl text-white sm:text-6xl" />
              <p className="mt-6 max-w-md text-lg text-brand-cream/60">
                Parlons de votre salle et de votre fonctionnement — on vous montre Flyder en conditions réelles, sans engagement.
              </p>
            </div>

            <form onSubmit={envoyer} className="relative space-y-3">
              <input type="text" value={site} onChange={e => setSite(e.target.value)}
                tabIndex={-1} autoComplete="off"
                className="absolute -left-[9999px] h-px w-px opacity-0" aria-hidden="true" />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="text" required placeholder="Votre nom" aria-label="Votre nom" autoComplete="name"
                  value={nom} onChange={e => setNom(e.target.value)} className={CHAMP} />
                <input type="email" required placeholder="Votre email" aria-label="Votre email" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)} className={CHAMP} />
              </div>
              <input type="text" required aria-label="Objet" value={objet} onChange={e => setObjet(e.target.value)} className={CHAMP} />
              <textarea required rows={8} aria-label="Message" value={message} onChange={e => setMessage(e.target.value)}
                className={`${CHAMP} resize-none`} />

              {statut === 'erreur' && (
                <p className="text-sm text-red-300" role="alert">Une erreur est survenue, réessayez ou écrivez à selimouadi31@gmail.com.</p>
              )}

              <button type="submit" disabled={statut === 'envoi'} className="btn-primary w-full disabled:opacity-60">
                {statut === 'envoi' ? (
                  <>Envoi en cours…</>
                ) : (
                  <>Demander une démonstration <Send className="h-4 w-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-brand-cream/45">
                En envoyant ce formulaire, vous acceptez que SoWeb traite vos données pour répondre à
                votre demande. Voir la{' '}
                <a href="/politique-confidentialite.html" className="underline hover:text-brand-cream/70">
                  politique de confidentialité
                </a>.
              </p>
            </form>
          </div>
        )}
      </Reveal>
    </section>
  );
}
