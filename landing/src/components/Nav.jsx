import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo-flyder.png';

const LINKS = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#contact', label: 'Contact' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-brand-cream/90 backdrop-blur-sm border-b border-black/5">
      <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center flex-shrink-0">
          <img src={logo} alt="Flyder" className="h-6 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-brand-ink/70 hover:text-brand-ink transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <a href="#contact"
            className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3D5AFE' }}>
            Demander une démo
          </a>
        </div>

        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 text-brand-ink" aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-black/5 bg-brand-cream px-5 py-4 space-y-3">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm font-medium text-brand-ink/80 py-1.5">
              {l.label}
            </a>
          ))}
          <a href="#contact" onClick={() => setOpen(false)}
            className="block text-center text-white text-sm font-semibold px-5 py-2.5 rounded-full"
            style={{ backgroundColor: '#3D5AFE' }}>
            Demander une démo
          </a>
        </div>
      )}
    </header>
  );
}
