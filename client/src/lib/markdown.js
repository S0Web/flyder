import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

export const IMAGE_SIZES = ['petite', 'moyenne', 'grande'];

// La taille choisie dans l'éditeur (bouton Petite/Moyenne/Grande) est encodée
// dans le texte alternatif de l'image markdown, ex: ![taille:grande](url) —
// évite d'inventer une syntaxe markdown personnalisée. Sans tag reconnu
// (images insérées avant cette fonctionnalité), on retombe sur "moyenne".
const renderer = new marked.Renderer();
renderer.image = ({ href, text }) => {
  const match = /^taille:(petite|moyenne|grande)$/.exec((text || '').trim());
  const size = match ? match[1] : 'moyenne';
  const src = (href || '').replace(/"/g, '%22');
  return `<img src="${src}" alt="" class="fmv-img-${size}" loading="lazy">`;
};
marked.use({ renderer });

// Rendu HTML sûr (assaini) d'un contenu markdown restreint (gras, italique,
// titres, séparateur, images) — utilisé pour l'affichage des articles Formation.
export function renderMarkdown(source) {
  const html = marked.parse(source || '');
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'loading'] });
}
