import { NavLink, Link } from 'react-router-dom';
import { Search, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

// Coquille des espaces connectés. En haut : bloc bleu à coins arrondis
// (marque, avatar, titre de page). En bas sur mobile : navigation flottante
// en pilule avec un bouton d'action principal optionnel (`fab`). Sur
// desktop, la navigation est dans l'en-tête et la pilule disparaît.
// `base` = '/coach' ou '/salle'.
export function AppHeader({ base, eyebrow, titre, sousTitre, children }) {
  const { actor, logout } = useAuth();
  const nom = actor?.prenom ? `${actor.prenom} ${actor.nom}` : actor?.nom;
  const initiale = (actor?.prenom || actor?.nom || '?').charAt(0).toUpperCase();

  const pill = ({ isActive }) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? 'bg-white text-brand-ink shadow-sm' : 'text-white/75 hover:text-white hover:bg-white/10'
    }`;

  // Même dégradé, ancré à l'écran (background-attachment: fixed) plutôt qu'à
  // chaque bloc : la barre et le bloc titre deviennent deux fenêtres sur un
  // même "papier peint" fixé au viewport, donc toujours raccordées à leur
  // jointure — y compris une fois la barre décrochée du bloc titre au
  // défilement, puisque à cet instant précis la barre s'arrête à la même
  // ligne d'écran où le bloc titre redevient visible en dessous.
  const glow = {
    backgroundColor: '#3D5AFE',
    backgroundImage: 'radial-gradient(1400px 320px at 100% 0%, rgba(255,255,255,0.18) 0%, transparent 60%)',
    backgroundAttachment: 'fixed',
  };

  return (
    <>
      {/* Rangée épinglée en haut au défilement — sur toute la hauteur de la
          page, pas seulement celle du bloc bleu ci-dessous : un élément
          "sticky" ne peut jamais dépasser le bas de SON PARENT direct. En la
          sortant du <header>, son parent devient le conteneur de page entier
          (voir RecherchePage.jsx/ProfilLayout.jsx, qui l'appellent en frère
          direct de <main>) — elle reste donc accrochée jusqu'en bas de page,
          pas seulement tant que le bloc bleu est à l'écran. Couleur pleine,
          jamais de transparence/flou ici : combinés à "sticky", ils créent un
          filet blanc visible à la jointure avec le bloc bleu du dessous
          (artefact de compositing du navigateur). text-white explicite : en
          sortant cette rangée du <header className="hero"> ci-dessous, elle a
          perdu le text-white que .hero appliquait en cascade à tout son
          contenu — nom et icône retombaient sur l'encre (texte par défaut du
          site), quasi invisible sur fond bleu. */}
      <div className="sticky top-0 z-30 text-white" style={glow}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          <Link to={`${base}/recherche`}><Wordmark tone="light" /></Link>
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-black/10 p-1">
            <NavLink to={`${base}/recherche`} className={pill}><Search className="h-4 w-4" /> Rechercher</NavLink>
            <NavLink to={`${base}/profil`} className={pill}><UserRound className="h-4 w-4" /> Mon profil</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to={`${base}/profil`} className="flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 transition p-1 pr-3">
              <span className="h-8 w-8 rounded-full overflow-hidden bg-white text-brand-blue text-sm font-bold flex items-center justify-center">
                {actor?.photo_url ? <img src={actor.photo_url} alt="" className="h-full w-full object-cover" /> : initiale}
              </span>
              <span className="text-sm font-semibold max-w-[8rem] truncate hidden sm:inline-block">{nom}</span>
            </Link>
            <button onClick={logout} title="Se déconnecter"
              className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <header className="hero" style={glow}>
        {/* style={glow} inline plutôt que le dégradé par défaut de .hero (qui
            est relatif à CE bloc, donc différent de la barre du dessus) —
            voir le commentaire sur `glow` plus haut. */}
        {/* pt- ici, pas mt- sur l'enfant : une marge (contrairement à un
            padding) aurait fusionné à travers ce conteneur jusqu'au-dessus du
            <header> (aucun des deux n'a de padding-top/bordure pour arrêter
            la fusion), ouvrant un vide blanc entre la barre du haut et le
            bloc bleu — le même bug que la barre elle-même, cause différente. */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 sm:pt-6 pb-7 sm:pb-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 animate-fadeInUp">
              {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-2">{eyebrow}</p>}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.05]">{titre}</h1>
              {sousTitre && <p className="mt-2 text-sm sm:text-base text-white/75">{sousTitre}</p>}
            </div>
            {children && <div className="flex items-center gap-2 animate-fadeInUp">{children}</div>}
          </div>
        </div>
      </header>
    </>
  );
}

export function BottomNav({ base, fab }) {
  const item = ({ isActive }) => (isActive ? 'active' : '');
  return (
    <>
      <div className="h-24 md:hidden" />
      <nav className="bottom-nav md:hidden">
        <NavLink to={`${base}/recherche`} className={item}><Search className="h-5 w-5" /> Rechercher</NavLink>
        <NavLink to={`${base}/profil`} className={item}><UserRound className="h-5 w-5" /> Profil</NavLink>
        {fab && <button type="button" onClick={fab.onClick} className="fab !min-w-0 !p-0 !text-white" title={fab.label} aria-label={fab.label}><fab.icon className="h-6 w-6" /></button>}
      </nav>
    </>
  );
}
