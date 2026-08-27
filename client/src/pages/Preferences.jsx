import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Download, Upload, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import AccesTab from '../components/AccesTab';

const BACKUP_RECENTE_MS = 15 * 60 * 1000;

// Import de base : opération destructive (remplace toutes les données), donc on
// impose d'avoir téléchargé une sauvegarde depuis moins de 15 minutes avant de
// laisser choisir un fichier — lastBackupAt vit en mémoire (pas en localStorage),
// pour forcer une sauvegarde vraiment fraîche à chaque tentative, même après un
// rechargement de page.
function ImportModal({ lastBackupAt, onBackupNow, onClose, onImported }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const recent = lastBackupAt && Date.now() - lastBackupAt < BACKUP_RECENTE_MS;

  async function handleImport() {
    if (!file) return;
    if (!confirm(
      'Remplacer toutes les données actuelles par ce fichier ? Cette action est irréversible ' +
      '(une sauvegarde de sécurité est prise automatiquement côté serveur, mais autant être sûr).'
    )) return;
    setImporting(true);
    setError(null);
    try {
      await api.importDatabase(file);
      toast.success('Import réussi — le service redémarre, patiente quelques secondes puis recharge la page.');
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Importer une base</h2>

        {!recent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Attention : aucune sauvegarde n'a été effectuée récemment. Veuillez sauvegarder la base actuelle avant de continuer.
              </p>
            </div>
            <button onClick={onBackupNow}
              className="w-full inline-flex items-center justify-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: '#3D5AFE' }}>
              <Download className="h-4 w-4" /> Sauvegarder la base actuelle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Choisis le fichier .db à importer — il remplacera intégralement les données actuelles.
            </p>
            <input type="file" accept=".db" onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
            <button onClick={handleImport} disabled={!file || importing}
              className="w-full inline-flex items-center justify-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#dc2626' }}>
              <Upload className="h-4 w-4" /> {importing ? 'Import en cours…' : 'Importer et remplacer'}
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
      </div>
    </div>
  );
}

const DECONNEXION_OPTIONS = [
  { value: '0', label: 'Jamais' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 heure' },
  { value: 'jour', label: 'Fin de journée' },
];

const INPUT_CLASS = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400';

function SectionTitle({ children }) {
  return <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{children}</h2>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Preferences() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [importModal, setImportModal] = useState(false);

  useEffect(() => { api.getPreferences().then(setForm).catch(() => {}); }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleBackup() {
    setBacking(true);
    try {
      await api.downloadBackup();
      setLastBackupAt(Date.now());
      toast.success('Sauvegarde téléchargée');
    } catch (err) {
      toast.error('Échec de la sauvegarde : ' + err.message);
    } finally {
      setBacking(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.updatePreferences(form);
      setForm(updated);
      toast.success('Préférences enregistrées');
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Infos de la salle</SectionTitle>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <Field label="Nom affiché" hint="Utilisé dans la barre latérale et l'écran d'accueil.">
            <input className={INPUT_CLASS} value={form.salle_nom} onChange={e => set('salle_nom', e.target.value)} />
          </Field>
          <Field label="Adresse de facturation" hint="Reprise sur les exports PDF du récapitulatif d'heures.">
            <textarea rows={2} className={INPUT_CLASS} value={form.salle_adresse} onChange={e => set('salle_adresse', e.target.value)} />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Sécurité &amp; Confidentialité</SectionTitle>
        <div className="space-y-3">
          <AccesTab />
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <Field label="Déconnexion automatique"
              hint="Déconnecte le profil actif après une période sans action, pour éviter d'agir par erreur sur le profil de quelqu'un d'autre.">
              <select className={INPUT_CLASS} value={form.deconnexion_delai_min} onChange={e => set('deconnexion_delai_min', e.target.value)}>
                {DECONNEXION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Planning</SectionTitle>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Field label="Acquisition des congés payés" hint="Nombre de jours acquis par mois complet de contrat (2,5 = légal standard).">
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" min="0" className={`${INPUT_CLASS} max-w-[100px]`}
                value={form.conges_taux_mensuel} onChange={e => set('conges_taux_mensuel', e.target.value)} />
              <span className="text-sm text-gray-500">jour(s) / mois</span>
            </div>
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Alertes</SectionTitle>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Field label="Séance sans coach" hint="Signale une séance sans coach uniquement si elle a lieu dans les prochains jours indiqués.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Alerter à</span>
              <input type="number" min="0" className={`${INPUT_CLASS} max-w-[80px]`}
                value={form.alerte_sans_coach_jours} onChange={e => set('alerte_sans_coach_jours', e.target.value)} />
              <span className="text-sm text-gray-500">jour(s) avant la séance</span>
            </div>
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Sauvegarde &amp; Restauration</SectionTitle>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500 max-w-sm">
            Télécharge une copie brute de la base pour l'explorer ou la modifier hors ligne,
            ou importe un fichier modifié pour remplacer les données actuelles.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleBackup} disabled={backing}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> {backing ? 'Préparation…' : 'Télécharger une sauvegarde'}
            </button>
            <button onClick={() => setImportModal(true)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
              <Upload className="h-3.5 w-3.5" /> Importer une base
            </button>
          </div>
        </div>
      </div>

      {importModal && (
        <ImportModal
          lastBackupAt={lastBackupAt}
          onBackupNow={handleBackup}
          onClose={() => setImportModal(false)}
          onImported={() => setImportModal(false)}
        />
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3D5AFE' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-bold text-gray-800">Une suggestion ? On vous écoute !</p>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Une fonctionnalité qui manque, une habitude propre à votre salle ? Dites-le-nous.
        </p>
        <Link to="/support"
          className="inline-flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: '#3D5AFE' }}>
          <LifeBuoy className="h-4 w-4" /> Contacter le support
        </Link>
      </div>
    </div>
  );
}
