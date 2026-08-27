import logo from '../assets/logo-flyder-white.png';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <img src={logo} alt="Flyder" className="h-6 w-auto" />
          <div className="flex items-center gap-6 text-sm text-brand-cream/50">
            <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-xs text-brand-cream/30 text-center sm:text-left">
          © {new Date().getFullYear()} Flyder. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
