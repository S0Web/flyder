import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

const LEADS_URL = 'https://admin.flyder.fr/api/leads';
const OBJET_DEFAUT = 'Demande de calcul — planning Flyder';

export default function Contact() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [salle, setSalle] = useState('');
  // Honeypot : champ jamais rempli par un humain (masqué visuellement), sert
  // à filtrer une partie des bots sans reCAPTCHA ni dépendance externe.
  const [site, setSite] = useState('');
  const [statut, setStatut] = useState('idle'); // idle | envoi | ok | erreur

  async function envoyer(e) {
    e.preventDefault();
    setStatut('envoi');
    const message = salle.trim()
      ? `Bonjour,\n\nJe gère ${salle.trim()} et j'aimerais que vous me calculiez le temps que Flyder me ferait gagner sur mon planning.\n\nMerci,`
      : `Bonjour,\n\nJ'aimerais que vous me calculiez le temps que Flyder me ferait gagner sur mon planning.\n\nMerci,`;
    // Sans délai limite, une requête qui ne reçoit jamais de réponse (backend
    // qui bloque, proxy muet) laisse le bouton bloqué sur "Envoi en cours"
    // indéfiniment — on abandonne et on affiche une erreur après 15s.
    const controller = new AbortController();
    const delai = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, objet: OBJET_DEFAUT, message, site }),
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

  if (statut === 'ok') {
    return (
      <section id="contact" className="py-24 sm:py-32 bg-brand-cream">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-3xl overflow-hidden px-8 py-20 text-center" style={{ backgroundColor: '#12162B' }}>
            <CheckCircle2 className="h-12 w-12 mx-auto mb-5" style={{ color: '#3D5AFE' }} />
            <h2 className="text-3xl font-bold text-white tracking-tight">Merci.</h2>
            <p className="mt-4 text-brand-cream/60 max-w-md mx-auto">
              Nous vous répondons rapidement avec la marche à suivre pour nous envoyer votre planning.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="relative rounded-3xl overflow-hidden px-8 py-16 sm:px-16 sm:py-20 border border-white/10">
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FF5A36 0%, transparent 70%)' }} />

          <div className="relative text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Chez vous, combien de cours reposent sur trois coachs ?
            </h2>
            <p className="mt-4 text-brand-cream/60 max-w-lg mx-auto">
              Envoyez-nous votre planning : nous vous le calculons, sans engagement.
            </p>
          </div>

          <form onSubmit={envoyer} className="relative mt-10 max-w-lg mx-auto space-y-4">
            <input type="text" value={site} onChange={e => setSite(e.target.value)}
              tabIndex={-1} autoComplete="off"
              className="absolute -left-[9999px] w-px h-px opacity-0" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" required placeholder="Votre nom" value={nom} onChange={e => setNom(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors" />
              <input type="email" required placeholder="Votre email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors" />
            </div>
            <input type="text" placeholder="Nom de la salle (facultatif)" value={salle} onChange={e => setSalle(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors" />

            {statut === 'erreur' && (
              <p className="text-sm text-red-300">Une erreur est survenue, réessayez ou écrivez à selimouadi31@gmail.com.</p>
            )}

            <button type="submit" disabled={statut === 'envoi'}
              className="w-full inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3D5AFE' }}>
              {statut === 'envoi' ? (
                <>Envoi en cours…</>
              ) : (
                <>Recevoir mon calcul <Send className="h-4 w-4" /></>
              )}
            </button>

            <p className="text-xs text-brand-cream/40 text-center">
              En envoyant ce formulaire, vous acceptez que SoWeb traite vos données pour répondre à
              votre demande. Voir la{' '}
              <a href="/politique-confidentialite.html" className="underline hover:text-brand-cream/60">
                politique de confidentialité
              </a>.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
