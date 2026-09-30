import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { api, VerrouilleError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseServerDate } from '../../lib/utils';
import {
  abonnerDeverrouillage, getExpirationDeverrouillage, enregistrerDeverrouillage, oublierDeverrouillage,
} from '../../lib/deverrouillage';
import { Feuille, Rien, BoutonEncre, Marque, selectCls } from './kit';

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

  const champ = 'w-full bg-transparent border-0 border-b-2 border-white/30 px-0 py-2 font-mono text-2xl tracking-[0.6em] text-white placeholder:text-white/25 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-0 focus:border-fitness';

  return (
    <div className="bg-brand-ink text-white rounded-[3px] overflow-hidden">
      <div className="grid md:grid-cols-[1fr_320px]">
        <div className="p-6 sm:p-8">
          <div className="font-mono text-[11px] text-fitness">accès protégé</div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight mt-2">Coffre à documents</h3>
          <p className="text-sm text-brand-cream/65 mt-3 max-w-md leading-relaxed">
            {sansCode
              ? "Tu n'as pas encore de code confidentiel. Choisis-en un : il protège tes documents et ta connexion."
              : 'Fiches de paie, contrat, arrêts de travail.'}
          </p>
          <p className="font-mono text-[11px] text-brand-cream/40 mt-6">reverrouillage automatique au bout de 10 min</p>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8 md:border-l border-t md:border-t-0 border-white/10 flex flex-col justify-center gap-4">
          <label className="block">
            <span className="font-mono text-[11px] text-brand-cream/50">{sansCode ? 'nouveau code' : 'code confidentiel'}</span>
            <input ref={inputRef} type="password" inputMode="numeric" autoComplete="off" value={code}
              onChange={e => { setCode(e.target.value); setErreur(null); }} placeholder="····" className={champ} />
          </label>
          {sansCode && (
            <label className="block">
              <span className="font-mono text-[11px] text-brand-cream/50">confirmer</span>
              <input type="password" inputMode="numeric" autoComplete="off" value={confirmation}
                onChange={e => setConfirmation(e.target.value)} placeholder="····" className={champ} />
            </label>
          )}
          <div className="h-4 font-mono text-[11px] text-fitness">{erreur}</div>
          <button type="submit" disabled={busy || !code}
            className="w-full bg-fitness hover:bg-[#E8461F] disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-[3px] transition-colors">
            {busy ? 'Vérification…' : sansCode ? 'Créer le code et ouvrir' : 'Ouvrir le coffre'}
          </button>
        </form>
      </div>
    </div>
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
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border border-dashed border-brand-ink/25 rounded-[3px] p-3">
      <label className="block">
        <span className="block font-mono text-[11px] text-gray-500 mb-1">type</span>
        <select value={type} onChange={e => setType(e.target.value)} className={selectCls}>
          {TYPES_ORDONNES.map(t => <option key={t} value={t}>{TYPE_SINGULIER[t]}</option>)}
        </select>
      </label>
      {type === 'fiche_paie' && (
        <label className="block">
          <span className="block font-mono text-[11px] text-gray-500 mb-1">mois</span>
          <input type="month" value={periode} onChange={e => setPeriode(e.target.value)} className={selectCls} />
        </label>
      )}
      <label className="block flex-1 min-w-[180px]">
        <span className="block font-mono text-[11px] text-gray-500 mb-1">fichier (pdf ou image)</span>
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
      <div className="flex items-center justify-between gap-3 flex-wrap bg-brand-ink text-white rounded-[3px] px-4 py-2.5">
        <span className="font-mono text-[11px]"><span className="text-emerald-300">● ouvert</span><span className="text-brand-cream/50"> · se referme dans {restant} min</span></span>
        <button onClick={oublierDeverrouillage} className="font-mono text-[11px] text-white underline underline-offset-4 decoration-fitness hover:text-fitness">
          refermer maintenant
        </button>
      </div>

      {isManager && <AjoutDocument userId={userId} onAjoute={charger} />}

      {docs === null ? (
        <p className="py-8 text-center font-mono text-xs text-gray-400">chargement…</p>
      ) : groupes.length === 0 ? (
        <Feuille><Rien>aucun document pour {estMoi ? 'toi' : prenom}</Rien></Feuille>
      ) : groupes.map(g => (
        <section key={g.type}>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-display text-[15px] font-bold text-brand-ink">{TYPE_LABELS[g.type]}</span>
            <span className="font-mono text-[11px] text-gray-400">{String(g.items.length).padStart(2, '0')}</span>
            <span className="flex-1 border-b border-dashed border-brand-ink/15" />
          </div>
          <div className="bg-white border-y border-brand-ink/10 divide-y divide-brand-ink/[0.07]">
            {g.items.map(doc => {
              const nouveau = !doc.vu_le;
              return (
                <div key={doc.id} className="group grid grid-cols-[1fr_auto] sm:grid-cols-[150px_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className={`text-[15px] first-letter:uppercase ${nouveau && estMoi ? 'font-semibold text-brand-ink' : 'text-brand-ink'}`}>
                    {doc.periode ? libellePeriode(doc.periode) : doc.nom_fichier}
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 order-3 sm:order-none col-span-2 sm:col-span-1">
                    {/* Accusé de lecture : visible par le manager (et par le salarié pour lui-même). */}
                    {doc.vu_le
                      ? <>consulté le {jourMois(doc.vu_le)}</>
                      : estMoi ? <Marque ton="corail">nouveau</Marque>
                      : <span className="text-fitness">pas encore consulté</span>}
                    <span className="text-gray-300"> · déposé le {jourMois(doc.date_upload)}</span>
                  </span>
                  <span className="flex items-center gap-4 justify-end">
                    <button onClick={() => telecharger(doc)} className="font-mono text-[11px] text-brand-ink underline underline-offset-4 decoration-fitness decoration-2 hover:text-fitness">
                      ouvrir ↓
                    </button>
                    {isManager && (
                      <button onClick={() => supprimer(doc)} className="font-mono text-[11px] text-gray-400 hover:text-fitness sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        suppr.
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
