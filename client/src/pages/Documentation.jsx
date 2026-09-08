import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, X, FileText, BookOpen } from 'lucide-react';
import { renderMarkdown } from '../lib/markdown';
import { DOC_CATEGORIES, DOC_ARTICLES, searchDocArticles } from '../lib/documentationContent';

function fmtSnippet(snippet, titre) {
  return snippet || 'Ouvrir cet article.';
}

// Barre de recherche plein texte — façon centre d'aide Notion : on tape, la
// liste des catégories est remplacée par les articles qui matchent (titre ou
// contenu), avec un extrait pour situer la correspondance sans avoir à ouvrir.
function SearchBox({ query, onChange, resultsCount }) {
  const inputRef = useRef(null);
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Chercher dans la documentation…"
        className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      {query && (
        <button
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Effacer la recherche"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {query && (
        <p className="text-[11px] text-gray-400 mt-1.5 px-0.5">
          {resultsCount} résultat{resultsCount !== 1 ? 's' : ''} pour « {query} »
        </p>
      )}
    </div>
  );
}

function SidebarBrowse({ activeId }) {
  return (
    <nav className="space-y-4">
      {DOC_CATEGORIES.map(cat => (
        <div key={cat.id}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 px-2 mb-1">{cat.titre}</div>
          <div className="space-y-0.5">
            {cat.articles.map(a => (
              <Link
                key={a.id}
                to={`/documentation/${a.id}`}
                className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  a.id === activeId ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {a.titre}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarResults({ results, activeId, query }) {
  if (results.length === 0) {
    return <p className="text-sm text-gray-400 italic px-2 py-4">Aucun article ne correspond à « {query} ».</p>;
  }
  return (
    <div className="space-y-1">
      {results.map(r => (
        <Link
          key={r.id}
          to={`/documentation/${r.id}`}
          className={`block px-3 py-2.5 rounded-lg transition-colors border ${
            r.id === activeId ? 'bg-sky-50 border-sky-200' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">
            <FileText className="h-3 w-3" /> {r.categorieTitre}
          </div>
          <div className="text-sm font-semibold text-gray-800">{r.titre}</div>
          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{fmtSnippet(r.snippet)}</div>
        </Link>
      ))}
    </div>
  );
}

export default function Documentation() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Article demandé par l'URL, ou le premier de la doc par défaut.
  useEffect(() => {
    if (!articleId) {
      navigate(`/documentation/${DOC_ARTICLES[0].id}`, { replace: true });
    }
  }, [articleId, navigate]);

  const article = useMemo(() => DOC_ARTICLES.find(a => a.id === articleId), [articleId]);
  const results = useMemo(() => (query ? searchDocArticles(query) : []), [query]);

  // Les liens internes du contenu (vers /documentation/xxx) sont interceptés
  // pour naviguer en SPA plutôt que recharger toute la page.
  function handleContentClick(e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/documentation/')) {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Documentation</h1>
        <p className="text-xs text-gray-400 mt-0.5">Comment utiliser Flyder — pour toute question sur votre outil de gestion de salle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Sidebar : recherche + navigation */}
        <div className="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:sticky lg:top-6 space-y-3">
          <SearchBox query={query} onChange={setQuery} resultsCount={results.length} />
          {query ? (
            <SidebarResults results={results} activeId={articleId} query={query} />
          ) : (
            <SidebarBrowse activeId={articleId} />
          )}
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[20rem]">
          {!article ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Article introuvable.
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{article.titre}</h2>
              <div
                className="formation-content"
                onClick={handleContentClick}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(article.contenu) }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
