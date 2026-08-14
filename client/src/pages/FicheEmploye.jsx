import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colorForUser } from '../lib/utils';
import UserModal from '../components/UserModal';

const TYPE_LABELS = {
  fiche_paie: 'Fiche de paie',
  contrat: 'Contrat de travail',
  arret_maladie: 'Arrêt maladie',
  autre: 'Autre',
};
const TYPES_ORDONNES = ['fiche_paie', 'contrat', 'arret_maladie', 'autre'];

function CpDiscret({ userId, peutModifier }) {
  const [detail, setDetail] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api.getCpDetail(userId).then(setDetail).catch(() => {});
  useEffect(() => { load(); }, [userId]);

  async function adjust(delta) {
    setBusy(true);
    try {
      const updated = await api.adjustCp(userId, delta);
      setDetail(updated);
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return null;

  const Row = ({ label, value }) => (
    <div className="flex justify-between text-xs text-gray-500 py-0.5">
      <span>{label}</span>
      <span className="font-medium text-gray-700 tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Congés payés</span>
        <span className="text-2xl font-bold text-gray-800 tabular-nums">{detail.restant}<span className="text-xs font-normal text-gray-400 ml-1">restants</span></span>
      </div>
      {peutModifier && (
        <button type="button" onClick={() => setOuvert(o => !o)}
          className="mt-1.5 flex items-center gap-1 text-xs text-sky-600 hover:underline">
          {ouvert ? 'Fermer' : 'Modifier les CP'}
          {ouvert ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
      {ouvert && peutModifier && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Ajustement manuel</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjust(-1)} disabled={busy}
                className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50">−</button>
              <span className="w-8 text-center font-bold text-gray-800 tabular-nums">{detail.acquis}</span>
              <button type="button" onClick={() => adjust(1)} disabled={busy}
                className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50">+</button>
            </div>
          </div>
          <Row label="Congés calculé à date" value={detail.calculeADate} />
          <Row label="Congés ajouté par rapport à la date" value={detail.ajuste} />
          <Row label="Congés pris" value={detail.pris} />
          <Row label="Congés restant" value={detail.restant} />
          <p className="text-[11px] text-gray-400 mt-1.5">2,5 jours de CP acquis par mois depuis le début du contrat. 1 semaine complète = 6 jours déduits.</p>
        </div>
      )}
    </div>
  );
}

function UploadDocumentForm({ userId, onUploaded }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [type, setType] = useState('fiche_paie');
  const [periode, setPeriode] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadEmployeDocument(userId, file, type, type === 'fiche_paie' ? periode : null);
      toast.success('Document ajouté');
      fileRef.current.value = '';
      setPeriode('');
      onUploaded();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
          {TYPES_ORDONNES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      {type === 'fiche_paie' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Période (ex. 2026-08)</label>
          <input value={periode} onChange={e => setPeriode(e.target.value)} placeholder="AAAA-MM"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Fichier</label>
        <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg" required
          className="text-xs" />
      </div>
      <button type="submit" disabled={uploading}
        className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: '#3D5AFE' }}>
        <Upload className="h-3.5 w-3.5" /> {uploading ? 'Envoi…' : 'Ajouter'}
      </button>
    </form>
  );
}

export default function FicheEmploye() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me } = useAuth();
  const isManager = me?.role === 'manager';
  const [user, setUser] = useState(undefined);
  const [documents, setDocuments] = useState([]);
  const [editModal, setEditModal] = useState(false);

  const loadUser = () => api.getAppUser(id).then(setUser).catch(() => setUser(false));
  const loadDocuments = () => api.getEmployeDocuments(id).then(setDocuments).catch(() => {});

  useEffect(() => { loadUser(); loadDocuments(); }, [id]);

  async function handleSaveInfos(form) {
    try {
      await api.updateAppUser(user.id, form);
      loadUser();
      toast.success('Informations mises à jour');
    } catch (e) {
      toast.error('Échec : ' + e.message);
      throw e;
    }
  }

  async function handleDelete(docId) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await api.deleteEmployeDocument(docId);
      loadDocuments();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  if (user === false) {
    return (
      <div className="max-w-3xl mx-auto text-center py-10 text-gray-400 text-sm">
        Fiche introuvable ou accès refusé. <Link to="/parametres" className="text-sky-600 hover:underline">Retour</Link>
      </div>
    );
  }
  if (user === undefined) return null;

  const docsParType = TYPES_ORDONNES.map(type => ({
    type,
    items: documents.filter(d => d.type === type),
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: colorForUser(user.id) }}>
            {user.prenom?.[0]}{user.nom?.[0]}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-800 text-lg truncate">{user.prenom} {user.nom}</div>
            {user.email && <div className="text-sm text-gray-500 truncate">{user.email}</div>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: user.role === 'manager' ? '#eef9fd' : '#f3f4f6', color: user.role === 'manager' ? '#12162B' : '#6b7280' }}>
                {user.role === 'manager' ? 'Manager' : 'Utilisateur'}
              </span>
              {!user.actif && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Inactif</span>}
              {user.date_debut_contrat && (
                <span className="text-xs text-gray-400">Contrat depuis le {new Date(user.date_debut_contrat).toLocaleDateString('fr-FR')}</span>
              )}
            </div>
          </div>
        </div>
        {(isManager || me?.id === user.id) && (
          <button onClick={() => setEditModal(true)}
            className="mt-4 text-sm px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
            {me?.id === user.id ? 'Modifier mes informations' : 'Modifier les informations'}
          </button>
        )}
      </div>

      <CpDiscret userId={user.id} peutModifier={isManager} />

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Documents</h2>

        {isManager && <UploadDocumentForm userId={user.id} onUploaded={loadDocuments} />}

        {docsParType.every(g => g.items.length === 0) ? (
          <p className="text-sm text-gray-400 italic text-center py-4">Aucun document pour l'instant.</p>
        ) : (
          <div className="space-y-4">
            {docsParType.filter(g => g.items.length > 0).map(g => (
              <div key={g.type}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{TYPE_LABELS[g.type]}</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                  {g.items.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-700 truncate">{doc.nom_fichier}</div>
                        <div className="text-xs text-gray-400">
                          {doc.periode ? `${doc.periode} — ` : ''}
                          {new Date(doc.date_upload.replace(' ', 'T')).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => api.downloadEmployeDocument(doc.id, doc.nom_fichier)}
                          title="Télécharger" className="h-7 w-7 flex items-center justify-center rounded text-sky-600 hover:bg-sky-50">
                          <Download className="h-4 w-4" />
                        </button>
                        {isManager && (
                          <button onClick={() => handleDelete(doc.id)}
                            title="Supprimer" className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editModal && (
        <UserModal
          user={user}
          onSave={handleSaveInfos}
          onClose={() => setEditModal(false)}
        />
      )}
    </div>
  );
}
