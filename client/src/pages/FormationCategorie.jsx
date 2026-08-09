import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { renderMarkdown } from '../lib/markdown';
import { formationIcon } from '../lib/formationIcons';
import MarkdownEditor from '../components/MarkdownEditor';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function FormationCategorie() {
  const { categorieId, articleId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [categorie, setCategorie] = useState(null);
  const [articles, setArticles]   = useState(null);
  const [article, setArticle]     = useState(null); // article sélectionné, complet (avec contenu)
  const [editing, setEditing]     = useState(false);
  const [titre, setTitre]         = useState('');
  const [contenu, setContenu]     = useState('');
  const [saving, setSaving]       = useState(false);

  const loadListe = useCallback(() => {
    api.getFormationCategorie(categorieId).then(setCategorie).catch(() => setCategorie(false));
    api.getFormationArticles(categorieId).then(setArticles).catch(() => setArticles([]));
  }, [categorieId]);

  useEffect(() => { loadListe(); }, [loadListe]);

  // Sélectionne l'article demandé par l'URL, ou le premier de la liste par défaut.
  useEffect(() => {
    if (articles === null) return;
    if (!articleId && articles.length > 0) {
      navigate(`/formation/${categorieId}/${articles[0].id}`, { replace: true });
      return;
    }
    if (!articleId) { setArticle(null); return; }
    api.getFormationArticle(articleId).then(a => {
      setArticle(a);
      setTitre(a.titre);
      setContenu(a.contenu);
      setEditing(false);
    }).catch(() => setArticle(false));
  }, [articleId, articles, categorieId, navigate]);

  async function handleCreate() {
    try {
      const created = await api.createFormationArticle({ titre: 'Nouvelle sous-formation', contenu: '', categorie_id: categorieId });
      loadListe();
      setTitre(created.titre);
      setContenu(created.contenu);
      setArticle(created);
      setEditing(true);
      navigate(`/formation/${categorieId}/${created.id}`);
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  async function handleSave() {
    if (!titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const updated = await api.updateFormationArticle(article.id, { titre, contenu, categorie_id: categorieId });
      setArticle(updated);
      setEditing(false);
      loadListe();
      toast.success('Enregistré');
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement "${article.titre}" ?`)) return;
    try {
      await api.deleteFormationArticle(article.id);
      toast.success('Supprimé');
      navigate(`/formation/${categorieId}`, { replace: true });
      loadListe();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  async function handleReorder(direction) {
    try {
      await api.reorderFormationArticle(article.id, direction);
      loadListe();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  if (categorie === false) {
    return (
      <div className="max-w-3xl mx-auto text-center py-10 text-gray-400 text-sm">
        Catégorie introuvable. <Link to="/formation" className="text-sky-600 hover:underline">Retour</Link>
      </div>
    );
  }

  const Icon = categorie ? formationIcon(categorie.icone) : FileText;

  return (
    <div className="space-y-4">
      <Link to="/formation" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Toutes les catégories
      </Link>

      {categorie && (
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: categorie.couleur }}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">{categorie.titre}</h1>
            {categorie.description && <p className="text-xs text-gray-400 truncate">{categorie.description}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Liste des sous-formations */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          {isManager && (
            <button onClick={handleCreate}
              className="w-full flex items-center gap-1.5 justify-center text-sm font-medium py-2.5 border-b border-gray-100 text-sky-700 hover:bg-sky-50">
              <Plus className="h-4 w-4" /> Nouvelle sous-formation
            </button>
          )}
          {articles === null ? (
            <div className="text-center py-8 text-gray-400 text-sm">Chargement…</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 px-4 text-gray-400 text-sm">Aucune sous-formation pour le moment.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {articles.map(a => (
                <button key={a.id} onClick={() => navigate(`/formation/${categorieId}/${a.id}`)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    String(a.id) === String(articleId) ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {a.titre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[20rem]">
          {article === false ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sous-formation introuvable.</div>
          ) : !article ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Sélectionne une sous-formation dans la liste.
            </div>
          ) : editing ? (
            <div className="space-y-3">
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre"
                className="w-full text-lg font-bold border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400" />
              <MarkdownEditor value={contenu} onChange={setContenu} onUploadImage={api.uploadFormationImage} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditing(false); setTitre(article.titre); setContenu(article.contenu); }}
                  className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#2fa8cc' }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-800">{article.titre}</h2>
                {isManager && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleReorder('haut')} title="Monter" className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleReorder('bas')} title="Descendre" className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditing(true)} title="Modifier" className="p-1.5 rounded text-sky-600 hover:bg-sky-50">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={handleDelete} title="Supprimer" className="p-1.5 rounded text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 mb-4">
                Mis à jour le {fmtDate(article.updated_at)}{article.auteur_prenom ? ` · ${article.auteur_prenom}` : ''}
              </div>
              <div className="formation-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.contenu) }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
