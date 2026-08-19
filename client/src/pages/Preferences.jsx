import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import AccesTab from '../components/AccesTab';

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

  useEffect(() => { api.getPreferences().then(setForm).catch(() => {}); }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

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
