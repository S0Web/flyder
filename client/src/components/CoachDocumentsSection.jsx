import { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

const TYPE_LABELS = {
  cni_passeport: 'CNI / Passeport',
  diplome: 'Diplôme',
  carte_pro: "Carte professionnelle d'éducateur sportif",
  autre: 'Autre',
};
const TYPES_ORDONNES = ['cni_passeport', 'diplome', 'carte_pro', 'autre'];

// Documents d'identité et de qualification d'un coach — manager uniquement (lecture
// comme écriture), le composant n'est monté que dans ce contexte par l'appelant.
export default function CoachDocumentsSection({ coachId }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [type, setType] = useState('diplome');
  const [uploading, setUploading] = useState(false);

  const load = () => api.getCoachDocuments(coachId).then(setDocuments).catch(() => {});
  useEffect(() => { load(); }, [coachId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadCoachDocument(coachId, file, type);
      toast.success('Document ajouté');
      fileRef.current.value = '';
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await api.deleteCoachDocument(id);
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  const docsParType = TYPES_ORDONNES.map(t => ({ type: t, items: documents.filter(d => d.type === t) }));

  return (
    <div className="pt-2 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
            {TYPES_ORDONNES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fichier</label>
          <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg" required className="text-xs" />
        </div>
        <button type="submit" disabled={uploading}
          className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3D5AFE' }}>
          <Upload className="h-3.5 w-3.5" /> {uploading ? 'Envoi…' : 'Ajouter'}
        </button>
      </form>

      {docsParType.every(g => g.items.length === 0) ? (
        <p className="text-xs text-gray-400 italic text-center py-2">Aucun document pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {docsParType.filter(g => g.items.length > 0).map(g => (
            <div key={g.type}>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{TYPE_LABELS[g.type]}</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                {g.items.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                    <span className="text-xs text-gray-700 truncate">{doc.nom_fichier}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => api.downloadCoachDocument(doc.id, doc.nom_fichier)}
                        title="Télécharger" className="h-6 w-6 flex items-center justify-center rounded text-sky-600 hover:bg-sky-50">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(doc.id)}
                        title="Supprimer" className="h-6 w-6 flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
