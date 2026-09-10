import logo from '../assets/logo-flyder.png';

// Logo Flyder officiel + cartouche "TALENTS" en bleu de la charte — signe le
// produit sans créer une marque à part (cf. plan : pas de logo dédié tant que
// Talents n'est pas vendu séparément). Le cartouche reprend le bloc encre du
// système "tableau d'affichage".
export default function Wordmark({ size = 'md', className = '' }) {
  const logoH = size === 'lg' ? 'h-7' : 'h-5';
  const tagCls = size === 'lg' ? 'text-sm px-2.5 py-1.5' : 'text-[11px] px-2 py-1';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt="Flyder" className={`${logoH} w-auto`} />
      <span className={`font-display font-bold uppercase tracking-[0.18em] leading-none bg-brand-blue text-white rounded-[2px] ${tagCls}`}>
        Talents
      </span>
    </span>
  );
}
