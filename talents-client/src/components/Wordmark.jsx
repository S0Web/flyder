import logo from '../assets/logo-flyder.png';

// Logo Flyder officiel + "Talents." dans le bleu primaire de la charte — signe
// le produit sans créer une marque à part (cf. plan : pas de logo dédié tant
// que Talents n'est pas vendu séparément).
export default function Wordmark({ size = 'md', className = '' }) {
  const logoH = size === 'lg' ? 'h-7' : 'h-5';
  const textCls = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt="Flyder" className={`${logoH} w-auto`} />
      <span className={`font-display font-bold text-brand-blue tracking-tight leading-none ${textCls}`}>
        Talents.
      </span>
    </span>
  );
}
