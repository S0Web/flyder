import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { api, VerrouilleError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseServerDate } from '../../lib/utils';
import {
  abonnerDeverrouillage, getExpirationDeverrouillage, enregistrerDeverrouillage, oublierDeverrouillage,
} from '../../lib/deverrouillage';
import { Lock } from 'lucide-react';
import { Feuille, Rien, Compte, BoutonEncre, Marque, Lien, champCls, selectCls } from './kit';

const TYPE_LABELS = {
  fiche_paie: 'Fiches de paie',
  contrat: 'Contrat de travail',
  arret_maladie: 'Arrêts maladie',
  autre: 'Autres documents',
};
const TYPES_ORDONNES = ['fiche_paie', 'contrat', 'arret_maladie', 'autre'];
const TYPE_SINGULIER = { fiche_paie: 'Fiche de paie', contrat: 'Contrat de travail', arret_maladie: 'Arrêt maladie', autre: 'Autre' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function libellePeriode(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(p || '');
  if (!m) return p;
  return `${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

const jourMois = (s) => {
  const d = parseServerDate(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function useExpiration() {
  return useSyncExternalStore(abonnerDeverrouillage, getExpirationDeverrouillage);
}

// ── Écran de verrouillage ─────────────────────────────────────────────────────
function Verrou({ onDeverrouille }) {
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [sansCode, setSansCode] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, [sansCode]);

  async function submit(e) {
    e.preventDefault();
    setErreur(null);
    if (sansCode) {
      if (code.trim().length < 4) return setErreur('au moins 4 caractères');
      if (code !== confirmation) return setErreur('les deux codes ne correspondent pas');
    }
    setBusy(true);
    try {
      if (sansCode) {
        await api.setCode(user.id, code.trim());
        toast.success('Code enregistré — il te sera aussi demandé à la connexion.');
      }
      enregistrerDeverrouillage(await api.deverrouiller(code.trim()));
      onDeverrouille();
    } catch (err) {
      if (err.message === 'sans_code') { setSansCode(true); setCode(''); }
      else { setErreur(err.message.toLowerCase()); setCode(''); }
    } finally {
      setBusy(false);
    }
  }

  const champ = `${champCls} text-lg tracking-[0.5em] placeholder:tracking-normal placeholder:text-sm`;

  return (
    <Feuille className="overflow-hidden">
      <div className="grid md:grid-cols-[1fr_340px]">
        <div className="p-6 sm:p-8">
          <span className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Lock className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-600 mt-4">Accès protégé</div>
          <h3 className="font-display text-xl font-bold text-brand-ink leading-tight mt-1">Coffre à documents</h3>
          <p className="text-sm text-gray-600 mt-2 max-w-md leading-relaxed">
            {sansCode
              ? "Tu n'as pas encore de code confidentiel. Choisis-en un : il protège tes documents et ta connexion."
              : 'Fiches de paie, contrat, arrêts de travail.'}
          </p>
          <p className="text-xs text-gray-400 mt-5">Reverrouillage automatique au bout de 10 min.</p>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8 md:border-l border-t md:border-t-0 border-gray-200 bg-gray-50 flex flex-col justify-center gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">{sansCode ? 'Nouveau code' : 'Code confidentiel'}</span>
            <input ref={inputRef} type="password" inputMode="numeric" autoComplete="off" value={code}
              onChange={e => { setCode(e.target.value); setErreur(null); }} placeholder="····" className={champ} />
          </label>
          {sansCode && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Confirmer</span>
              <input type="password" inputMode="numeric" autoComplete="off" value={confirmation}
                onChange={e => setConfirmation(e.target.value)} placeholder="····" className={champ} />
            </label>
          )}
          <div className="min-h-[16px] text-xs text-red-600">{erreur}</div>
          <BoutonEncre type="submit" disabled={busy || !code} className="w-full">
            {busy ? 'Vérification…' : sansCode ? 'Créer le code et ouvrir' : 'Ouvrir le coffre'}
          </BoutonEncre>
        </form>
      </div>
    </Feuille>
  );
}

// ── Formulaire d'ajout (manager) ──────────────────────────────────────────────
function AjoutDocument({ userId, onAjoute }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [type, setType] = useState('fiche_paie');
  const [periode, setPeriode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await api.uploadEmployeDocument(userId, file, type, type === 'fiche_paie' ? periode : null);
      toast.success('Document déposé');
      fileRef.current.value = '';
      setPeriode('');
      onAjoute();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">Type</span>
        <select value={type} onChange={e => setType(e.target.value)} className={selectCls}>
          {TYPES_ORDONNES.map(t => <option key={t} value={t}>{TYPE_SINGULIER[t]}</option>)}
        </select>
      </label>
      {type === 'fiche_paie' && (
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Mois</span>
          <input type="month" value={periode} onChange={e => setPeriode(e.target.value)} className={selectCls} />
        </label>
      )}
      <label className="block flex-1 min-w-[180px]">
        <span className="block text-xs font-medium text-gray-500 mb-1">Fichier (pdf ou image)</span>
        <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg" required className="block text-xs w-full" />
      </label>
      <BoutonEncre type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Déposer'}</BoutonEncre>
    </form>
  );
}

// ── Coffre ────────────────────────────────────────────────────────────────────
export default function CoffreDocuments({ userId, prenom, onConsulte }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const estMoi = user?.id === Number(userId);
  const expiration = useExpiration();
  const [docs, setDocs] = useState(null);
  const [restant, setRestant] = useState(null);

  async function charger() {
    try {
      setDocs(await api.getEmployeDocuments(userId));
    } catch (e) {
      if (!(e instanceof VerrouilleError)) toast.error(e.message);
      setDocs(null);
    }
  }

  useEffect(() => { if (expiration) charger(); else setDocs(null); }, [expiration, userId]);

  // Compte à rebours affiché + reverrouillage à l'échéance.
  useEffect(() => {
    if (!expiration) return;
    const tick = () => {
      const ms = expiration - Date.now();
      if (ms <= 0) { oublierDeverrouillage(); return; }
      setRestant(Math.ceil(ms / 60000));
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [expiration]);

  async function telecharger(doc) {
    try {
      await api.downloadEmployeDocument(doc.id, doc.nom_fichier);
      if (estMoi && !doc.vu_le) {
        setDocs(ds => ds.map(d => d.id === doc.id ? { ...d, vu_le: new Date().toISOString().slice(0, 19).replace('T', ' ') } : d));
        onConsulte?.();
      }
    } catch (e) {
      if (!(e instanceof VerrouilleError)) toast.error(e.message);
    }
  }

  async function supprimer(doc) {
    if (!confirm(`Supprimer « ${doc.nom_fichier} » ?`)) return;
    try {
      await api.deleteEmployeDocument(doc.id);
      charger();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!expiration) return <Verrou onDeverrouille={charger} />;

  const groupes = TYPES_ORDONNES.map(type => ({ type, items: (docs || []).filter(d => d.type === type) })).filter(g => g.items.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
        <span className="text-xs"><span className="font-semibold text-green-700">● Coffre ouvert</span><span className="text-green-700/70"> · se referme dans {restant} min</span></span>
        <button onClick={oublierDeverrouillage} className="text-xs font-medium text-green-800 hover:underline underline-offset-2">
          Refermer maintenant
        </button>
      </div>

      {isManager && <AjoutDocument userId={userId} onAjoute={charger} />}

      {docs === null ? (
        <p className="py-8 text-center text-xs text-gray-400">chargement…</p>
      ) : groupes.length === 0 ? (
        <Feuille><Rien>aucun document pour {estMoi ? 'toi' : prenom}</Rien></Feuille>
      ) : groupes.map(g => (
        <section key={g.type}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-sm font-bold text-brand-ink">{TYPE_LABELS[g.type]}</span>
            <Compte n={g.items.length} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {g.items.map(doc => {
              const nouveau = !doc.vu_le;
              return (
                <div key={doc.id} className="group grid grid-cols-[1fr_auto] sm:grid-cols-[150px_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className={`text-[15px] first-letter:uppercase ${nouveau && estMoi ? 'font-semibold text-brand-ink' : 'text-brand-ink'}`}>
                    {doc.periode ? libellePeriode(doc.periode) : doc.nom_fichier}
                  </span>
                  <span className="text-[11px] text-gray-500 order-3 sm:order-none col-span-2 sm:col-span-1">
                    {/* Accusé de lecture : visible par le manager (et par le salarié pour lui-même). */}
                    {doc.vu_le
                      ? <>consulté le {jourMois(doc.vu_le)}</>
                      : estMoi ? <Marque ton="corail">nouveau</Marque>
                      : <span className="text-amber-600">pas encore consulté</span>}
                    <span className="text-gray-300"> · déposé le {jourMois(doc.date_upload)}</span>
                  </span>
                  <span className="flex items-center gap-4 justify-end">
                    <Lien onClick={() => telecharger(doc)}>Ouvrir ↓</Lien>
                    {isManager && (
                      <button onClick={() => supprimer(doc)} className="text-xs text-gray-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        Supprimer
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
