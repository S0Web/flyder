import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FORMATION_ICONS, formationIcon } from '../lib/formationIcons';

const PALETTE = [
  '#2fa8cc', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#475569',
];

// ── Modale catégorie (créer / modifier) ─────────────────────────────────────

function CategorieModal({ categorie, onSave, onDelete, onClose }) {
  const isNew = !categorie?.id;
  const [form, setForm] = useState({
    titre:       categorie?.titre       || '',
    description: categorie?.description || '',
    icone:       categorie?.icone       || 'BookOpen',
    couleur:     categorie?.couleur     || PALETTE[0],
  });
  const [error, setError]   = useState(null);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">{isNew ? 'Nouvelle catégorie' : 'Modifier la catégorie'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)} required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => set('couleur', c)}
                  className="h-7 w-7 rounded-full border-2"
                  style={{ backgroundColor: c, borderColor: form.couleur === c ? '#111' : 'transparent' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Icône</label>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(FORMATION_ICONS).map(([nom, Icon]) => (
                <button key={nom} type="button" onClick={() => set('icone', nom)} title={nom}
                  className={`h-8 w-8 flex items-center justify-center rounded border ${form.icone === nom ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {!isNew && (
              <button type="button" onClick={() => onDelete(categorie)}
                className="px-3 border border-red-200 text-red-500 rounded py-2 text-sm hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#2fa8cc' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Carte catégorie ──────────────────────────────────────────────────────────

function CategorieCard({ cat, isManager, onEdit, onReorder }) {
  const Icon = formationIcon(cat.icone);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
      {isManager && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm">
          <button onClick={() => onReorder(cat, 'haut')} title="Monter" className="p-1.5 text-gray-500 hover:text-gray-700"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button onClick={() => onReorder(cat, 'bas')} title="Descendre" className="p-1.5 text-gray-500 hover:text-gray-700"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={() => onEdit(cat)} title="Modifier" className="p-1.5 text-sky-600 hover:text-sky-800"><Pencil className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <Link to={`/formation/${cat.id}`} className="block">
        <div className="h-28 flex items-end p-4 relative overflow-hidden" style={{ backgroundColor: cat.couleur }}>
          <Icon className="absolute -right-3 -bottom-3 h-24 w-24 text-white/15" strokeWidth={1.2} />
          <span className="text-white font-extrabold text-lg uppercase tracking-wide relative">{cat.titre}</span>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-gray-800 mb-1">{cat.titre}</h3>
          <p className="text-sm text-gray-500 mb-4 min-h-[2.5rem] line-clamp-2">{cat.description || ' '}</p>
          <span className="block w-full text-center text-white rounded-lg py-2 text-sm font-medium" style={{ backgroundColor: '#2fa8cc' }}>
            {cat.nb_articles > 0 ? 'Commencer' : 'Aucun contenu'}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function Formation() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const [categories, setCategories] = useState(null);
  const [modal, setModal] = useState(null);

  function load() {
    api.getFormationCategories().then(setCategories).catch(() => setCategories([]));
  }
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (modal?.id) await api.updateFormationCategorie(modal.id, form);
      else           await api.createFormationCategorie(form);
      load();
      toast.success(modal?.id ? 'Catégorie mise à jour' : 'Catégorie créée');
    } catch (e) {
      toast.error('Échec : ' + e.message);
      throw e;
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Supprimer la catégorie "${cat.titre}" ?`)) return;
    try {
      await api.deleteFormationCategorie(cat.id);
      setModal(null);
      load();
      toast.success('Catégorie supprimée');
    } catch (e) {
      toast.error('Échec : ' + e.message);
    }
  }

  async function handleReorder(cat, direction) {
    try {
      await api.reorderFormationCategorie(cat.id, direction);
      load();
    } catch (e) {
      toast.error('Échec : ' + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Formation</h1>
          <p className="text-xs text-gray-400 mt-0.5">Choisis une catégorie pour commencer.</p>
        </div>
        {isManager && (
          <button onClick={() => setModal({})}
            className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: '#2fa8cc' }}>
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </button>
        )}
      </div>

      {categories === null ? (
        <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          Aucune catégorie pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map(cat => (
            <CategorieCard key={cat.id} cat={cat} isManager={isManager} onEdit={setModal} onReorder={handleReorder} />
          ))}
        </div>
      )}

      {modal !== null && (
        <CategorieModal
          categorie={modal?.id ? modal : null}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
