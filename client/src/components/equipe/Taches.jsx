import { useState, useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseServerDate } from '../../lib/utils';
import {
  PRIORITES, STATUTS_TACHE, RECURRENCES, aujourdhuiISO, isoPlusJours, nomComplet, ecartJours,
} from '../../lib/equipe';
import { Plaque, Rien, Marque, BoutonEncre, BoutonTrait, champCls } from './kit';
import Panneau from './Panneau';

// Priorité notée comme sur un tableau blanc : « !! », « !!! ».
export const MARQUE_PRIORITE = { urgente: '!!!', haute: '!!', normale: '', basse: '↓' };
const RECURRENCE_COURTE = { quotidienne: '↻ chaque jour', hebdomadaire: '↻ chaque semaine', mensuelle: '↻ chaque mois' };

// Échéance courte : « 30.09 », « aujourd'hui », « retard 3 j ».
export function echeanceCourte(echeance, fait) {
  if (!echeance) return null;
  const n = ecartJours(aujourdhuiISO(), echeance);
  if (!fait && n < 0) return { texte: `retard ${-n} j`, retard: true };
  if (n === 0) return { texte: "aujourd'hui" };
  if (n === 1) return { texte: 'demain' };
  const [, m, d] = echeance.split('-');
  return { texte: `${d}.${m}` };
}

// Case carrée : vide (à faire), trait corail (en cours), pleine (terminée).
function Case({ statut, onClick }) {
  const fait = statut === 'fait';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label={fait ? 'Marquer comme à faire' : statut === 'en_cours' ? 'En cours : marquer comme terminée' : 'Marquer comme terminée'}
      className={`relative h-[18px] w-[18px] flex-shrink-0 rounded-[3px] flex items-center justify-center transition-colors ${
        fait ? 'bg-brand-ink' : statut === 'en_cours' ? 'border-2 border-fitness bg-white' : 'border-2 border-brand-ink/30 hover:border-brand-ink bg-white'
      }`}
    >
      {fait && <Check className="h-3 w-3 text-white animate-pop" strokeWidth={3.5} />}
      {statut === 'en_cours' && <span className="h-2 w-2 rounded-[1px] bg-fitness" />}
    </button>
  );
}

export function TacheLigne({ tache, onOpen, onToggle, montrerAssigne = false }) {
  const fait = tache.statut === 'fait';
  const ech = echeanceCourte(tache.echeance, fait);
  const retard = ech?.retard;

  return (
    <div
      onClick={() => onOpen?.(tache)}
      className={`group relative flex items-start gap-3 pl-4 pr-3 py-3 cursor-pointer hover:bg-brand-cream/60 transition-colors ${retard ? 'before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-fitness' : ''}`}
    >
      <div className="pt-[3px]"><Case statut={tache.statut} onClick={() => onToggle?.(tache)} /></div>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${fait ? 'text-gray-400 line-through decoration-1' : 'text-brand-ink'}`}>
          {!fait && MARQUE_PRIORITE[tache.priorite] && (
            <span className={`font-mono font-semibold mr-1.5 ${tache.priorite === 'basse' ? 'text-gray-400' : 'text-fitness'}`}>{MARQUE_PRIORITE[tache.priorite]}</span>
          )}
          {tache.titre}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 font-mono text-[11px] text-gray-500">
          {ech && <span className={retard ? 'text-fitness font-semibold' : ''}>{ech.texte}</span>}
          {tache.moment && <Marque ton="bleu">checklist · {tache.moment}</Marque>}
          {tache.statut === 'en_cours' && <span className="text-brand-ink">en cours</span>}
          {tache.recurrence !== 'aucune' && <span>{RECURRENCE_COURTE[tache.recurrence]}</span>}
          {tache.nb_commentaires > 0 && <span>{tache.nb_commentaires} note{tache.nb_commentaires > 1 ? 's' : ''}</span>}
          {!tache.moment && <span className="text-gray-400">créée par {tache.cree_par_prenom}</span>}
        </div>
      </div>
      {montrerAssigne && (
        <span className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span className="hidden sm:inline text-xs text-gray-500">{tache.assigne_prenom}</span>
          <Plaque user={{ id: tache.assigne_a, prenom: tache.assigne_prenom, nom: tache.assigne_nom }} size={22} />
        </span>
      )}
    </div>
  );
}

// ── Regroupement par échéance ─────────────────────────────────────────────────
const GROUPES = [
  { id: 'retard',    label: 'En retard' },
  { id: 'jour',      label: "Aujourd'hui" },
  { id: 'semaine',   label: 'Cette semaine' },
  { id: 'plus_tard', label: 'Plus tard' },
  { id: 'sans',      label: 'Sans échéance' },
  { id: 'faites',    label: 'Terminées' },
];

function groupeDe(t, auj) {
  if (t.statut === 'fait') return 'faites';
  if (!t.echeance) return 'sans';
  if (t.echeance < auj) return 'retard';
  if (t.echeance === auj) return 'jour';
  if (t.echeance <= isoPlusJours(auj, 7)) return 'semaine';
  return 'plus_tard';
}

export function ListeTaches({ taches, onOpen, onToggle, montrerAssigne, vide, faitesOuvertes = false }) {
  const [faitesVisibles, setFaitesVisibles] = useState(faitesOuvertes);
  const auj = aujourdhuiISO();
  const groupes = useMemo(() => {
    const m = new Map(GROUPES.map(g => [g.id, []]));
    taches.forEach(t => m.get(groupeDe(t, auj)).push(t));
    m.get('faites').sort((a, b) => (b.fait_le || '').localeCompare(a.fait_le || ''));
    return GROUPES.map(g => ({ ...g, items: m.get(g.id) })).filter(g => g.items.length);
  }, [taches, auj]);

  if (!groupes.length) return vide || <Rien>aucune tâche</Rien>;

  return (
    <div className="space-y-6">
      {groupes.map(g => {
        const replie = g.id === 'faites' && !faitesVisibles;
        return (
          <section key={g.id}>
            <button type="button" onClick={() => g.id === 'faites' && setFaitesVisibles(v => !v)}
              className={`w-full flex items-center gap-3 mb-1 ${g.id === 'faites' ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`font-display text-[15px] font-bold ${g.id === 'retard' ? 'text-fitness' : 'text-brand-ink'}`}>{g.label}</span>
              <span className="font-mono text-[11px] text-gray-400">{String(g.items.length).padStart(2, '0')}</span>
              <span className="flex-1 border-b border-dashed border-brand-ink/15" />
              {g.id === 'faites' && <span className="font-mono text-[11px] text-gray-500">{replie ? 'afficher' : 'masquer'}</span>}
            </button>
            {!replie && (
              <div className="bg-white border-y border-brand-ink/10 divide-y divide-brand-ink/[0.07]">
                {g.items.map(t => (
                  <TacheLigne key={t.id} tache={t} onOpen={onOpen} onToggle={onToggle} montrerAssigne={montrerAssigne} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Ajout rapide ──────────────────────────────────────────────────────────────
export function AjoutRapide({ membres, assigneParDefaut, onCree, placeholder = 'Nouvelle tâche…' }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const [titre, setTitre] = useState('');
  const [assigne, setAssigne] = useState(assigneParDefaut || user?.id);
  const [echeance, setEcheance] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (assigneParDefaut) setAssigne(assigneParDefaut); }, [assigneParDefaut]);

  async function submit(e) {
    e.preventDefault();
    if (!titre.trim()) return;
    setBusy(true);
    try {
      const t = await api.createTache({ titre, assigne_a: assigne, echeance: echeance || null });
      setTitre('');
      onCree?.(t);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const mini = 'font-mono text-[11px] text-brand-ink bg-transparent border-0 border-b border-brand-ink/20 px-0 py-1 focus:outline-none focus:ring-0 focus:border-fitness';
  return (
    <form onSubmit={submit} className="flex flex-wrap sm:flex-nowrap items-end gap-x-4 gap-y-2 border-b-2 border-brand-ink pb-2">
      <span className="font-mono text-lg leading-none text-fitness pb-1">+</span>
      <input value={titre} onChange={e => setTitre(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-[180px] text-[15px] text-brand-ink bg-transparent border-0 px-0 py-1 focus:outline-none focus:ring-0 placeholder:text-gray-400" />
      <input type="date" value={echeance} onChange={e => setEcheance(e.target.value)} aria-label="Échéance" className={mini} />
      {isManager && membres?.length > 0 && !assigneParDefaut && (
        <select value={assigne} onChange={e => setAssigne(Number(e.target.value))} aria-label="Assigner à" className={`${mini} pr-6`}>
          {membres.map(m => <option key={m.id} value={m.id}>{m.id === user.id ? 'pour moi' : `pour ${m.prenom}`}</option>)}
        </select>
      )}
      <button type="submit" disabled={busy || !titre.trim()}
        className="font-mono text-[11px] font-semibold text-white bg-brand-ink rounded-[3px] px-3 py-1.5 disabled:opacity-30">
        ajouter ↵
      </button>
    </form>
  );
}

// ── Panneau de détail / création ──────────────────────────────────────────────
function Ligne({ label, children }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-baseline gap-4 py-2.5 border-b border-brand-ink/10">
      <span className="font-mono text-[11px] text-gray-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const choixCls = (actif) => `font-mono text-xs px-2 py-1 rounded-[3px] border transition-colors ${
  actif ? 'bg-brand-ink text-white border-brand-ink' : 'border-brand-ink/20 text-gray-600 hover:border-brand-ink'
}`;

function horodatage(s) {
  const d = parseServerDate(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function TachePanneau({ tache, membres, assigneParDefaut, initial, onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const nouvelle = !tache?.id;
  const peutEditer = nouvelle || isManager || tache.cree_par === user.id;

  const [form, setForm] = useState(() => ({
    titre: tache?.titre || initial?.titre || '',
    description: tache?.description || initial?.description || '',
    assigne_a: tache?.assigne_a || assigneParDefaut || user.id,
    echeance: tache?.echeance ?? '',
    priorite: tache?.priorite || 'normale',
    recurrence: tache?.recurrence || 'aucune',
    statut: tache?.statut || 'a_faire',
  }));
  const [saving, setSaving] = useState(false);
  const [commentaires, setCommentaires] = useState([]);
  const [nouveauCom, setNouveauCom] = useState('');
  const finRef = useRef(null);

  useEffect(() => {
    if (!nouvelle) api.getTacheCommentaires(tache.id).then(setCommentaires).catch(() => {});
  }, [nouvelle, tache?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function enregistrer(fermer) {
    if (!form.titre.trim()) return toast.error('Donne un titre à la tâche.');
    setSaving(true);
    try {
      let t;
      if (nouvelle) {
        t = await api.createTache(form);
        toast.success('Tâche créée');
      } else {
        t = await api.patchTache(tache.id, peutEditer ? form : { statut: form.statut });
        toast.success('Tâche enregistrée');
      }
      onSaved?.(t);
      fermer();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(fermer) {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await api.deleteTache(tache.id);
      onDeleted?.(tache);
      fermer();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function commenter(e) {
    e.preventDefault();
    if (!nouveauCom.trim()) return;
    try {
      const c = await api.addTacheCommentaire(tache.id, nouveauCom);
      setCommentaires(cs => [...cs, c]);
      setNouveauCom('');
      onSaved?.({ ...tache, nb_commentaires: (tache.nb_commentaires || 0) + 1 }, { silencieux: true });
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Panneau
      surtitre={nouvelle ? 'nouvelle tâche' : `tâche n° ${tache.id}`}
      titre={nouvelle ? 'Que faut-il faire ?' : (tache.titre || 'Sans titre')}
      sousTitre={!nouvelle && `créée par ${nomComplet({ prenom: tache.cree_par_prenom, nom: tache.cree_par_nom })} · ${horodatage(tache.created_at)}`}
      onClose={onClose}
      pied={(fermer) => (
        <div className="flex items-center gap-2">
          {!nouvelle && peutEditer && (
            <button onClick={() => supprimer(fermer)} className="font-mono text-[11px] text-gray-500 hover:text-fitness underline underline-offset-4">
              supprimer
            </button>
          )}
          <div className="flex-1" />
          <BoutonTrait onClick={fermer}>Annuler</BoutonTrait>
          <BoutonEncre onClick={() => enregistrer(fermer)} disabled={saving}>
            {saving ? 'Enregistrement…' : nouvelle ? 'Créer la tâche' : 'Enregistrer'}
          </BoutonEncre>
        </div>
      )}
    >
      <div className="space-y-6">
        {(nouvelle || peutEditer) && (
          <textarea
            value={form.titre}
            onChange={e => set('titre', e.target.value)}
            rows={2}
            autoFocus={nouvelle}
            placeholder="Intitulé de la tâche"
            className="w-full resize-none font-display text-lg font-bold leading-snug text-brand-ink placeholder:text-gray-300 bg-transparent border-0 border-b-2 border-brand-ink px-0 focus:outline-none focus:ring-0 focus:border-fitness"
          />
        )}

        <div>
          <Ligne label="statut">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUTS_TACHE).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set('statut', k)} className={choixCls(form.statut === k)}>{v.label.toLowerCase()}</button>
              ))}
            </div>
          </Ligne>
          <Ligne label="pour">
            {isManager ? (
              <select value={form.assigne_a} onChange={e => set('assigne_a', Number(e.target.value))} className={champCls}>
                {(membres || []).map(m => <option key={m.id} value={m.id}>{nomComplet(m)}{m.id === user.id ? ' (moi)' : ''}</option>)}
              </select>
            ) : (
              <span className="text-sm text-brand-ink">{tache?.assigne_prenom || user.prenom}</span>
            )}
          </Ligne>
          <Ligne label="échéance">
            <input type="date" value={form.echeance || ''} onChange={e => set('echeance', e.target.value)} disabled={!peutEditer} className={`${champCls} font-mono`} />
          </Ligne>
          <Ligne label="priorité">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PRIORITES).sort((a, b) => b[1].rang - a[1].rang).map(([k, v]) => (
                <button key={k} type="button" disabled={!peutEditer} onClick={() => set('priorite', k)} className={choixCls(form.priorite === k)}>
                  {MARQUE_PRIORITE[k] && <span className={form.priorite === k ? 'text-fitness' : ''}>{MARQUE_PRIORITE[k]} </span>}{v.label.toLowerCase()}
                </button>
              ))}
            </div>
          </Ligne>
          <Ligne label="répétition">
            <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} disabled={!peutEditer} className={champCls}>
              {Object.entries(RECURRENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {form.recurrence !== 'aucune' && (
              <p className="text-xs text-gray-500 mt-1.5">Une fois terminée, la suivante se crée toute seule.</p>
            )}
          </Ligne>
        </div>

        <div>
          <div className="font-mono text-[11px] text-gray-500 mb-2">détails</div>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} disabled={!peutEditer}
            rows={4} placeholder={peutEditer ? 'Contexte, liste, lien utile…' : 'Pas de détail.'}
            className="w-full bg-white border border-brand-ink/15 rounded-[3px] px-3 py-2.5 text-sm text-brand-ink leading-relaxed focus:outline-none focus:border-brand-ink resize-y disabled:bg-transparent" />
          {!peutEditer && (
            <p className="text-xs text-gray-500 mt-2">
              Tu peux changer le statut et ajouter une note ; seul {tache.cree_par_prenom} ou un manager modifie le reste.
            </p>
          )}
        </div>

        {!nouvelle && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-display text-[15px] font-bold text-brand-ink">Suivi</span>
              <span className="font-mono text-[11px] text-gray-400">{String(commentaires.length).padStart(2, '0')}</span>
              <span className="flex-1 border-b border-dashed border-brand-ink/15" />
            </div>
            <ol className="border-l-2 border-brand-ink/15 ml-1 space-y-4">
              {commentaires.map(c => (
                <li key={c.id} className="relative pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-[1px] bg-brand-ink" />
                  <div className="font-mono text-[11px] text-gray-500">
                    <span className="text-brand-ink font-semibold">{c.prenom}</span> · {horodatage(c.created_at)}
                  </div>
                  <p className="text-sm text-brand-ink whitespace-pre-wrap mt-0.5 leading-relaxed">{c.contenu}</p>
                </li>
              ))}
              <li ref={finRef} className="relative pl-4">
                <span className="absolute -left-[5px] top-2.5 h-2 w-2 rounded-[1px] border-2 border-fitness bg-brand-cream" />
                <form onSubmit={commenter} className="flex items-end gap-2">
                  <textarea value={nouveauCom} onChange={e => setNouveauCom(e.target.value)} rows={1}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commenter(e); } }}
                    placeholder="Ajouter une note au suivi…" className={`${champCls} resize-none`} />
                  <button type="submit" disabled={!nouveauCom.trim()}
                    className="font-mono text-[11px] font-semibold text-fitness disabled:text-gray-300 pb-2 whitespace-nowrap">envoyer ↵</button>
                </form>
              </li>
            </ol>
          </div>
        )}
      </div>
    </Panneau>
  );
}

// Bascule rapide « terminée / à faire » depuis une ligne.
export function useBasculeTache(onChange) {
  const toast = useToast();
  return async function basculer(t) {
    const statut = t.statut === 'fait' ? 'a_faire' : 'fait';
    try {
      const maj = await api.patchTache(t.id, { statut });
      onChange?.(maj);
      if (statut === 'fait' && t.recurrence !== 'aucune') toast.info('Terminée — la prochaine est planifiée.');
    } catch (e) {
      toast.error(e.message);
    }
  };
}
