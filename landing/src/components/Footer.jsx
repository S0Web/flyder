import logo from '../assets/logo-flyder.png';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <img src={logo} alt="Flyder" className="h-6 w-auto" />
        <div className="flex items-center gap-7 text-sm font-medium text-brand-ink/60">
          <a href="#solutions" className="transition-colors hover:text-brand-ink">Solutions</a>
          <a href="#fonctionnalites" className="transition-colors hover:text-brand-ink">Fonctionnalités</a>
          <a href="#contact" className="transition-colors hover:text-brand-ink">Contact</a>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-black/[0.08] pt-8 text-center text-xs text-brand-ink/45 sm:flex-row sm:text-left">
        <span>© {new Date().getFullYear()} Flyder. Tous droits réservés.</span>
        <div className="flex items-center gap-5">
          <a href="/mentions-legales.html" className="transition-colors hover:text-brand-ink">Mentions légales</a>
          <a href="/politique-confidentialite.html" className="transition-colors hover:text-brand-ink">Confidentialité</a>
          <a href="/cgv.html" className="transition-colors hover:text-brand-ink">CGV</a>
        </div>
      </div>
    </footer>
  );
}
