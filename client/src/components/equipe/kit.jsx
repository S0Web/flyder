import { colorForUser } from '../../lib/utils';
import { dateDepuisISO } from '../../lib/equipe';

// Kit graphique de l'onglet Équipe — même langage que le reste de Flyder : cartes blanches
// arrondies à filet gris, bleu Flyder pour les actions et la sélection, rouge réservé aux
// alertes, Inter pour le texte et Space Grotesk pour les titres. Clin d'œil à Flyder Talents :
// tuiles d'icônes pastel devant les titres de rubrique et étiquettes en pilules douces.

// ── Titre de rubrique : tuile d'icône pastel + titre + sous-titre ────────────
const TUILES = {
  bleu:  'bg-sky-50 text-sky-600',
  vert:  'bg-[#E6F7EF] text-[#0F8A5F]',
  ambre: 'bg-[#FFF4DB] text-[#C77700]',
  corail: 'bg-[#FFEDE8] text-brand-coral',
  violet: 'bg-[#F0ECFF] text-[#6B4EFF]',
};

export function Rubrique({ Icon, ton = 'bleu', titre, sous, actions, className = '' }) {
  return (
    <header className={`mt-8 first:mt-0 mb-3 flex items-start gap-2.5 ${className}`}>
      {Icon && (
        <span className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${TUILES[ton]}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-base font-bold text-brand-ink leading-tight">{titre}</h2>
        {sous && <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">{sous}</p>}
      </div>
      {actions}
    </header>
  );
}

// Feuille : carte blanche arrondie, filet gris.
export function Feuille({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag {...props} className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {children}
    </Tag>
  );
}

// Petit libellé discret.
export function Etiquette({ children, className = '' }) {
  return <span className={`text-xs leading-none text-gray-500 ${className}`}>{children}</span>;
}

// Intitulé de bloc à l'intérieur d'une page ou d'une carte : titre + actions à droite.
export function Intertitre({ children, actions, className = '' }) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <h3 className="font-display text-sm font-bold text-brand-ink whitespace-nowrap">{children}</h3>
      <span className="flex-1" />
      {actions}
    </div>
  );
}

// ── Pastille de statut d'un bilan ─────────────────────────────────────────────
const TAMPONS = {
  soumis:    { texte: 'À valider', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  valide:    { texte: 'Validé',    cls: 'bg-green-50 text-green-700 ring-green-200' },
  a_revoir:  { texte: 'À revoir',  cls: 'bg-red-50 text-red-700 ring-red-200' },
  brouillon: { texte: 'Brouillon', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
};

export function Tampon({ statut, className = '' }) {
  const t = TAMPONS[statut];
  if (!t) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset whitespace-nowrap ${t.cls} ${className}`}>
      {t.texte}
    </span>
  );
}

// Marque : étiquette en pilule douce.
export function Marque({ children, ton = 'encre', className = '' }) {
  const couleurs = {
    encre: 'bg-gray-100 text-gray-700',
    corail: 'bg-red-50 text-red-700',
    gris: 'bg-gray-100 text-gray-500',
    bleu: 'bg-sky-50 text-sky-700',
    vert: 'bg-green-50 text-green-700',
    ambre: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium leading-none rounded-full px-2 py-1 whitespace-nowrap ${couleurs[ton]} ${className}`}>
      {children}
    </span>
  );
}

// ── Avatar rond, aux couleurs du profil (comme dans la barre latérale) ───────
export function Plaque({ user, size = 28, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-full font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)), backgroundColor: colorForUser(user?.id ?? 0) }}
      title={user ? `${user.prenom} ${user.nom || ''}`.trim() : undefined}
    >
      {(user?.prenom?.[0] || '').toUpperCase()}{(user?.nom?.[0] || '').toUpperCase()}
    </span>
  );
}

// ── Chiffres clés : libellé en petites capitales, valeur en grand ────────────
export function Compteurs({ items, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:flex sm:flex-wrap ${className}`}>
      {items.map((it, i) => (
        <div key={i}
          className={`px-4 py-3.5 sm:flex-1 sm:min-w-[120px] border-b sm:border-b-0 ${i % 2 === 0 ? 'border-r' : ''} sm:border-r last:border-r-0 border-gray-100`}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 leading-tight">{it.label}</div>
          <div className={`font-display text-[28px] font-bold leading-none mt-2 tabular-nums ${
            it.ton === 'corail' ? 'text-red-600' : it.ton === 'vert' ? 'text-green-600' : 'text-brand-ink'
          }`}>{it.valeur}</div>
          {it.note && <div className="text-[11px] mt-1.5 text-gray-400">{it.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Pastille de comptage à côté d'un titre ───────────────────────────────────
export function Compte({ n, ton = 'gris', className = '' }) {
  const tons = { gris: 'bg-gray-100 text-gray-600', bleu: 'bg-sky-50 text-sky-700', rouge: 'bg-red-50 text-red-700' };
  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums align-middle ${tons[ton]} ${className}`}>{n}</span>
  );
}

// ── Jauge en cases : 7 cases pleines sur 10 ───────────────────────────────────
export function Cases({ faits, total, couleur = '#12162B', taille = 8 }) {
  if (!total) return null;
  return (
    <span className="inline-flex gap-[3px] align-middle" aria-label={`${faits} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="rounded-sm"
          style={{ width: taille, height: taille, backgroundColor: i < faits ? couleur : 'transparent', boxShadow: i < faits ? 'none' : `inset 0 0 0 1px ${couleur}40` }} />
      ))}
    </span>
  );
}

// ── Date en vignette ──────────────────────────────────────────────────────────
export function Ephemeride({ iso, compacte = false }) {
  const d = dateDepuisISO(iso);
  return (
    <div className={`flex flex-col items-center justify-center text-center flex-shrink-0 bg-gray-50 border-r border-gray-200 ${compacte ? 'w-14 py-2' : 'w-16 sm:w-20 py-3'}`}>
      <span className="text-[10px] font-semibold uppercase text-gray-500 leading-none">{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
      <span className={`font-display font-bold text-brand-ink leading-none mt-1 ${compacte ? 'text-2xl' : 'text-3xl'}`}>{d.getDate()}</span>
      <span className="text-[10px] font-semibold uppercase text-sky-600 leading-none mt-1">{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
    </div>
  );
}

// ── Boutons (mêmes que dans Paramètres, Coachs, Analyse…) ─────────────────────
const btnBase = 'inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-[background-color,transform] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';

// Action principale : bleu Flyder.
export function BoutonEncre({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} bg-sky-500 text-white hover:bg-sky-600 ${className}`}>{children}</button>;
}

// Même action principale (l'ancien bouton corail a disparu avec la charte d'origine).
export function BoutonCorail({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} bg-sky-500 text-white hover:bg-sky-600 ${className}`}>{children}</button>;
}

export function BoutonTrait({ children, className = '', ...props }) {
  return <button {...props} className={`${btnBase} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 ${className}`}>{children}</button>;
}

// Lien d'action discret.
export function Lien({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag {...props} className={`text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2 ${className}`}>
      {children}
    </Tag>
  );
}

// État vide : une simple ligne.
export function Rien({ children, action }) {
  return (
    <div className="py-8 px-4 text-center">
      <p className="text-sm text-gray-400">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Onglets : soulignés en bleu (navigation), ou en segments (`trait={false}`, bascule de vue / filtre).
export function Onglets({ onglets, actif, onChange, trait = true, className = '' }) {
  if (!trait) {
    return (
      <div className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5 ${className}`}>
        {onglets.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.97] ${
              actif === o.id ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {o.label}
            {o.count > 0 && <span className={`tabular-nums text-[10px] px-1.5 rounded-full ${actif === o.id ? 'bg-sky-50 text-sky-700' : 'bg-gray-200/70 text-gray-500'}`}>{o.count}</span>}
          </button>
        ))}
      </div>
    );
  }
  return (
    <nav className={`flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 ${className}`}>
      {onglets.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`relative flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            actif === o.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          {o.label}
          {o.count > 0 && <sup className={`ml-0.5 text-[10px] ${o.alerte ? 'text-red-600' : 'text-gray-400'}`}>{o.count}</sup>}
        </button>
      ))}
    </nav>
  );
}

export const champCls = 'w-full border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
export const selectCls = 'border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
