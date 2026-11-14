import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo-flyder.png';

const LINKS = [
  { href: '#solutions', label: 'Solutions' },
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#contact', label: 'Contact' },
];

// Barre flottante : posée à plat en haut de page, elle se détache en "pilule"
// translucide dès qu'on commence à défiler.
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const detachee = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className={`mx-auto max-w-6xl rounded-2xl border transition-all duration-300 ${
        detachee
          ? 'border-black/[0.06] bg-brand-cream/80 shadow-lg shadow-brand-ink/[0.06] backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}>
        <nav className="flex h-14 items-center justify-between pl-5 pr-2">
          <div className="flex items-center gap-9">
            <a href="#top" className="flex flex-shrink-0 items-center">
              <img src={logo} alt="Flyder" className="h-6 w-auto" />
            </a>
            <div className="hidden items-center gap-7 md:flex">
              {LINKS.map(l => (
                <a key={l.href} href={l.href} className="text-sm font-medium text-brand-ink/65 transition-colors hover:text-brand-ink">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <a href="#contact" className="btn-primary hidden !px-5 !py-2.5 md:inline-flex">
            Demander une démo
          </a>

          <button onClick={() => setOpen(o => !o)} className="p-2.5 text-brand-ink md:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {open && (
          <div className="space-y-1 border-t border-black/[0.06] px-3 pb-3 pt-2 md:hidden">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-base font-medium text-brand-ink/80">
                {l.label}
              </a>
            ))}
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary !mt-2 w-full">
              Demander une démo
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
