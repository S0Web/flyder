import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Panneau from './equipe/Panneau';
import { BoutonEncre, BoutonTrait, champCls, selectCls } from './equipe/kit';
import { useAuth } from '../context/AuthContext';

const choixCls = (actif) => `text-xs px-2 py-1.5 rounded-lg border transition-colors ${
  actif ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
}`;

export default function UserModal({ user, onSave, onClose }) {
  const isNew = !user?.id;
  const { user: me } = useAuth();
  const isManager = me?.role === 'manager'; // rôle, contrat : réservés aux managers (le serveur les ignore sinon)
  const [form, setForm] = useState({
    prenom:   user?.prenom   || '',
    nom:      user?.nom      || '',
    email:    user?.email    || '',
    role:     user?.role     || 'user',
    actif:    user?.actif    !== undefined ? user.actif : 1,
    date_debut_contrat: user?.date_debut_contrat || '',
    heures_contrat_semaine: user?.heures_contrat_semaine ?? '',
    coach_id: user?.coach_id ?? '',
  });
  const [coachs, setCoachs] = useState([]);
  useEffect(() => {
    if (isManager) api.getCoaches(true).then(setCoachs).catch(() => {});
  }, [isManager]);
  const [error, setError]   = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e, fermer) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        heures_contrat_semaine: form.heures_contrat_semaine === '' ? null : form.heures_contrat_semaine,
        coach_id: form.coach_id === '' ? null : Number(form.coach_id),
      });
      fermer();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const label = 'block text-[11px] text-gray-500';
  return (
    <Panneau
      surtitre={isNew ? 'nouveau membre' : 'informations'}
      titre={isNew ? 'Nouvel utilisateur' : `${user.prenom} ${user.nom || ''}`.trim()}
      onClose={onClose}
      largeur="max-w-md"
      pied={(fermer) => (
        <div className="flex justify-end gap-2">
          <BoutonTrait onClick={fermer}>Annuler</BoutonTrait>
          <BoutonEncre type="submit" form="form-utilisateur" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</BoutonEncre>
        </div>
      )}
    >
      {(fermer) => (
        <form id="form-utilisateur" onSubmit={(e) => handleSubmit(e, fermer)} className="space-y-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-5">
            <label className="block">
              <span className={label}>prénom *</span>
              <input required autoFocus={isNew} value={form.prenom} onChange={e => set('prenom', e.target.value)} className={champCls} />
            </label>
            <label className="block">
              <span className={label}>nom</span>
              <input value={form.nom} onChange={e => set('nom', e.target.value)} className={champCls} />
            </label>
          </div>
          <label className="block">
            <span className={label}>e-mail</span>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={champCls} />
          </label>

          {isManager && (
            <>
              <div>
                <span className={label}>rôle</span>
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onClick={() => set('role', 'user')} className={choixCls(form.role === 'user')}>utilisateur</button>
                  <button type="button" onClick={() => set('role', 'manager')} className={choixCls(form.role === 'manager')}>manager</button>
                </div>
              </div>
              {!isNew && (
                <label className="flex items-center gap-2 text-sm text-brand-ink cursor-pointer">
                  <input type="checkbox" checked={!!form.actif} onChange={e => set('actif', e.target.checked ? 1 : 0)} className="rounded-lg" />
                  Profil actif
                </label>
              )}
              <label className="block">
                <span className={label}>début de contrat</span>
                <input type="date" value={form.date_debut_contrat} onChange={e => set('date_debut_contrat', e.target.value)} className={`${champCls}`} />
                <span className="block text-xs text-gray-400 mt-1">Sert à calculer le cumul de congés payés (2,5 jours acquis par mois).</span>
              </label>
              <label className="block">
                <span className={label}>heures de contrat par semaine</span>
                <input type="number" min="0" max="80" step="0.5" inputMode="decimal" placeholder="Ex. 35" value={form.heures_contrat_semaine}
                  onChange={e => set('heures_contrat_semaine', e.target.value)} className={`${champCls}`} />
                <span className="block text-xs text-gray-400 mt-1">Facultatif. Sert à comparer les heures planifiées au contrat (Effectif, Planning). Vide : pas de suivi.</span>
              </label>
              <label className="block">
                <span className={label}>fiche coach</span>
                <select value={form.coach_id} onChange={e => set('coach_id', e.target.value)} className={`${selectCls} w-full mt-1`}>
                  <option value="">Aucune — ne donne pas de cours</option>
                  {coachs.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom}{c.nom ? ` ${c.nom}` : ''}{c.actif ? '' : ' (inactif)'}</option>
                  ))}
                </select>
                <span className="block text-xs text-gray-400 mt-1">Pour un salarié qui donne aussi des cours : ses cours apparaissent dans « Ma journée » et ses heures de cours dans le récap mensuel. Une fiche coach ne peut être reliée qu'à un profil.</span>
              </label>
            </>
          )}
        </form>
      )}
    </Panneau>
  );
}
