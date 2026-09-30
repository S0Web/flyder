import { colorForUser } from '../../lib/utils';
import { dateDepuisISO } from '../../lib/equipe';

// Kit graphique de l'onglet Équipe — esprit « feuille de match / carnet de bord » :
// la typographie et les filets structurent la page plutôt que des boîtes
// colorées ; les chiffres, heures et dates sont en police machine (Plex Mono)
// comme sur un tableau d'affichage ; le corail est l'unique couleur d'accent
// (action, urgence) ; les statuts sont des tampons, pas des pastilles.

// ── Titres de rubrique : « 01  Aujourd'hui ───────── » ───────────────────────
export function Rubrique({ numero, titre, sous, actions, className = '' }) {
  return (
    <header className={`mt-10 first:mt-0 mb-4 ${className}`}>
      <div className="flex items-end gap-3">
        {numero && <span className="font-mono text-xs text-fitness leading-none pb-1.5">{numero}</span>}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-brand-ink leading-none tracking-tight">{titre}</h2>
        <span className="flex-1 border-b border-brand-ink/15 mb-1.5" />
        {actions}
      </div>
      {sous && <p className="mt-2 text-sm text-gray-500 max-w-2xl">{sous}</p>}
    </header>
  );
}

// Feuille : surface blanche à angles presque droits, filet discret.
export function Feuille({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag {...props} className={`bg-white border border-brand-ink/10 rounded-[3px] ${className}`}>
      {children}
    </Tag>
  );
}

// Petit libellé en police machine.
export function Etiquette({ children, className = '' }) {
  return <span className={`font-mono text-[11px] leading-none text-gray-500 ${className}`}>{children}</span>;
}

// Intitulé de bloc à l'intérieur d'une feuille : texte + filet.
export function Intertitre({ children, actions, className = '' }) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <h3 className="font-display text-[15px] font-bold text-brand-ink whitespace-nowrap">{children}</h3>
      <span className="flex-1 border-b border-dashed border-brand-ink/15" />
      {actions}
    </div>
  );
}

// ── Tampon de statut ──────────────────────────────────────────────────────────
const TAMPONS = {
  soumis:    { texte: 'À valider', couleur: '#E0461F', angle: '-3deg' },
  valide:    { texte: 'Validé',    couleur: '#0B7A3E', angle: '-5deg' },
  a_revoir:  { texte: 'À revoir',  couleur: '#C0262D', angle: '4deg' },
  brouillon: { texte: 'Brouillon', couleur: '#8B93A7', angle: '-2deg' },
};

export function Tampon({ statut, className = '' }) {
  const t = TAMPONS[statut];
  if (!t) return null;
  return (
    <span className={`tampon ${className}`} style={{ color: t.couleur, '--angle': t.angle }}>{t.texte}</span>
  );
}

// Marque : étiquette cernée d'un trait (jamais un aplat pastel).
export function Marque({ children, ton = 'encre', className = '' }) {
  const couleurs = {
    encre: 'text-brand-ink border-brand-ink/40',
    corail: 'text-fitness border-fitness/60',
    gris: 'text-gray-500 border-gray-300',
    bleu: 'text-sky-700 border-sky-400/60',
  };
  return (
    <span className={`inline-flex items-center font-mono text-[10px] uppercase leading-none tracking-wider border rounded-[2px] px-1.5 py-[3px] ${couleurs[ton]} ${className}`}>
      {children}
    </span>
  );
}

// ── Avatar : plaque carrée façon badge de vestiaire ──────────────────────────
export function Plaque({ user, size = 28, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-[4px] font-mono font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.34)), backgroundColor: colorForUser(user?.id ?? 0) }}
      title={user ? `${user.prenom} ${user.nom || ''}`.trim() : undefined}
    >
      {(user?.prenom?.[0] || '').toUpperCase()}{(user?.nom?.[0] || '').toUpperCase()}
    </span>
  );
}

// ── Tableau d'affichage : chiffres séparés par des filets verticaux ──────────
export function Compteurs({ items, sombre = false, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:flex sm:flex-wrap ${className}`}>
      {items.map((it, i) => (
        <div key={i}
          className={`px-4 py-3 sm:flex-1 sm:min-w-[120px] border-b sm:border-b-0 ${i % 2 === 0 ? 'border-r' : ''} sm:border-r last:border-r-0 ${
            sombre ? 'border-white/10' : 'border-brand-ink/10'
          }`}>
          <div className={`font-mono text-[11px] leading-tight ${sombre ? 'text-brand-cream/55' : 'text-gray-500'}`}>{it.label}</div>
          <div className={`font-mono text-[28px] sm:text-[32px] font-semibold leading-none mt-2 tabular-nums ${
            it.ton === 'corail' ? 'text-fitness' : it.ton === 'vert' ? (sombre ? 'text-emerald-300' : 'text-[#0B7A3E]') : sombre ? 'text-white' : 'text-brand-ink'
          }`}>{it.valeur}</div>
          {it.note && <div className={`text-[11px] mt-1.5 ${sombre ? 'text-brand-cream/45' : 'text-gray-400'}`}>{it.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Jauge en cases : 7 cases pleines sur 10, plutôt qu'une barre floue ───────
export function Cases({ faits, total, couleur = '#12162B', taille = 8 }) {
  if (!total) return null;
  return (
    <span className="inline-flex gap-[3px] align-middle" aria-label={`${faits} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="rounded-[1px]"
          style={{ width: taille, height: taille, backgroundColor: i < faits ? couleur : 'transparent', boxShadow: i < faits ? 'none' : `inset 0 0 0 1px ${couleur}40` }} />
      ))}
    </span>
  );
}

// ── Date détachable (éphéméride) ──────────────────────────────────────────────
export function Ephemeride({ iso, compacte = false }) {
  const d = dateDepuisISO(iso);
  return (
    <div className={`flex flex-col items-center justify-center text-center flex-shrink-0 border-r border-dashed border-brand-ink/20 ${compacte ? 'w-14 py-2' : 'w-16 sm:w-20 py-3'}`}>
      <span className="font-mono text-[10px] uppercase text-gray-400 leading-none">{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
      <span className={`font-display font-bold text-brand-ink leading-none mt-1 ${compacte ? 'text-2xl' : 'text-3xl'}`}>{d.getDate()}</span>
      <span className="font-mono text-[10px] uppercase text-fitness leading-none mt-1">{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
    </div>
  );
}

// ── Boutons ───────────────────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-[3px] transition-[background-color,transform] active:translate-y-px disabled:opacity-40 disabled:pointer-events-none';

export function BoutonEncre({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} bg-brand-ink text-white hover:bg-black ${className}`}>{children}</button>;
}

export function BoutonCorail({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} bg-fitness text-white hover:bg-[#E8461F] ${className}`}>{children}</button>;
}

export function BoutonTrait({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} border border-brand-ink/25 text-brand-ink bg-transparent hover:bg-white ${className}`}>{children}</button>;
}

// Lien d'action discret, souligné.
export function Lien({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag {...props} className={`font-mono text-[11px] text-brand-ink underline decoration-fitness decoration-2 underline-offset-4 hover:text-fitness ${className}`}>
      {children}
    </Tag>
  );
}

// État vide : une simple ligne, pas d'icône dans une bulle.
export function Rien({ children, action }) {
  return (
    <div className="py-8 px-4 text-center">
      <p className="font-mono text-xs text-gray-400">— {children} —</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Onglets soulignés (texte + filet corail sous l'onglet actif).
export function Onglets({ onglets, actif, onChange, trait = true, className = '' }) {
  return (
    <nav className={`flex items-end gap-5 overflow-x-auto no-scrollbar ${trait ? 'border-b border-brand-ink/10' : ''} ${className}`}>
      {onglets.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`relative flex-shrink-0 pb-2.5 pt-1 text-sm transition-colors ${
            actif === o.id ? 'text-brand-ink font-semibold' : 'text-gray-500 hover:text-brand-ink'
          }`}>
          {o.label}
          {o.count > 0 && <sup className={`ml-0.5 font-mono text-[10px] ${o.alerte ? 'text-fitness' : 'text-gray-400'}`}>{o.count}</sup>}
          {actif === o.id && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-fitness" />}
        </button>
      ))}
    </nav>
  );
}

export const champCls = 'w-full border-0 border-b border-brand-ink/20 bg-transparent px-0 py-1.5 text-sm text-brand-ink placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-fitness disabled:text-gray-500';
export const selectCls = 'border border-brand-ink/20 rounded-[3px] bg-white px-2.5 py-1.5 text-sm text-brand-ink focus:outline-none focus:border-brand-ink';
