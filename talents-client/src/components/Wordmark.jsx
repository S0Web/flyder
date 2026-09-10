import logo from '../assets/logo-flyder.png';

// Logo Flyder officiel + "Talents." — signe le produit sans créer une marque
// à part (cf. plan : pas de logo dédié tant que Talents n'est pas vendu
// séparément). `tone="light"` pour les fonds bleus : logo passé en blanc.
export default function Wordmark({ size = 'md', tone = 'dark', className = '' }) {
  const logoH = size === 'lg' ? 'h-7' : 'h-5';
  const textCls = size === 'lg' ? 'text-2xl' : 'text-lg';
  const light = tone === 'light';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt="Flyder" className={`${logoH} w-auto ${light ? 'brightness-0 invert' : ''}`} />
      <span className={`font-display font-bold tracking-tight leading-none ${textCls} ${light ? 'text-white' : 'text-brand-blue'}`}>
        Talents.
      </span>
    </span>
  );
}
