import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

function Carte({ index, visible, reduced, children, legende }) {
  return (
    <div className={reduced ? '' : 'transition-all duration-[400ms]'}
      style={reduced ? undefined : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${index * 120}ms`,
      }}>
      <div aria-hidden="true"
        className="rounded-2xl border border-white/10 p-6 sm:p-7 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', minHeight: 260 }}>
        {children}
      </div>
      <p className="mt-4 text-sm sm:text-base font-medium text-brand-cream/70 text-center">
        {legende}
      </p>
    </div>
  );
}

const MESSAGES = [
  { heure: '05.11 · 13:08', texte: 'Je serai absent dans 10 jours', envoye: false },
  { heure: '05.11 · 13:10', texte: 'Rappelle-le-moi la semaine prochaine.', envoye: true },
  { heure: '15.11 · 18:03', texte: "Tu ne me l'as pas rappelé, c'est la cata !!!", envoye: false },
];

const CONTACTS = [
  { nom: 'Jessica', msg: 'Non je peux pas désolé', heure: '22:12' },
  { nom: 'Romain', msg: 'Je suis déjà pris', heure: '22:04' },
  { nom: 'Alan', msg: 'Je suis pas encore rétabli…', heure: '21:02' },
  { nom: 'Séverine', msg: 'Je peux pas demain bon courage !', heure: '20:27' },
];

export default function Probleme() {
  const [ref, inView] = useRevealOnce(0.25);
  const [finalRef, finalInView] = useRevealOnce(0.8);
  const reduced = usePrefersReducedMotion();

  const visible = reduced || inView;
  const finalVisible = reduced || finalInView;

  return (
    <section id="probleme" ref={ref} className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="text-xs font-bold uppercase tracking-wide mb-10 text-center" style={{ color: '#8395FE' }}>
          Vous connaissez la scène
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* 1. Conversation */}
          <Carte index={0} visible={visible} reduced={reduced}
            legende="« Rappelle-le-moi la semaine prochaine. »">
            <div className="w-full max-w-[220px] flex flex-col gap-2">
              {MESSAGES.map((m) => (
                <div key={m.heure} className={`flex flex-col ${m.envoye ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-mono text-brand-cream/30 mb-1">{m.heure}</span>
                  <span className="max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-snug"
                    style={m.envoye
                      ? { backgroundColor: '#3D5AFE', color: '#fff', borderBottomRightRadius: 4 }
                      : { backgroundColor: '#E4E2DC', color: '#12162B', borderBottomLeftRadius: 4 }}>
                    {m.texte}
                  </span>
                </div>
              ))}
            </div>
          </Carte>

          {/* 2. Post-it */}
          <Carte index={1} visible={visible} reduced={reduced}
            legende="Le post-it qui se perd.">
            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 rounded-sm opacity-60"
                style={{ backgroundColor: '#8B93A7' }} />
              <div className="flex items-center justify-center w-40 h-40 p-5 text-center text-base font-display font-semibold text-brand-ink shadow-md"
                style={{ backgroundColor: '#F6F5F1' }}>
                Remplaçant mardi 7 h ?
              </div>
            </div>
          </Carte>

          {/* 3. Messages des coachs */}
          <Carte index={2} visible={visible} reduced={reduced}
            legende="Trois coachs contactés avant 8 h, et personne ne sait qui a dit oui.">
            <div className="w-full max-w-[260px] rounded-xl bg-white shadow-sm overflow-hidden text-left">
              <div className="px-4 py-3 font-display font-bold text-sm text-brand-ink border-b border-black/5">
                Messages
              </div>
              <div className="divide-y divide-black/5">
                {CONTACTS.map((c) => (
                  <div key={c.nom} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(18,22,43,0.08)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-brand-ink truncate">{c.nom}</span>
                        <span className="text-[10px] text-brand-ink/40 flex-shrink-0">{c.heure}</span>
                      </div>
                      <div className="text-[11px] text-brand-ink/50 truncate">{c.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Carte>
        </div>

        <div ref={finalRef}>
          <p className={`mt-16 text-lg text-brand-cream/50 text-center ${reduced ? '' : 'transition-all duration-500'}`}
            style={reduced ? undefined : {
              opacity: finalVisible ? 1 : 0,
              transform: finalVisible ? 'translateY(0)' : 'translateY(12px)',
            }}>
            Un planning ne devrait pas dépendre de la mémoire de quelqu'un.
          </p>
        </div>
      </div>
    </section>
  );
}
