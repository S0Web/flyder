import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ListeTaches, AjoutRapide, TachePanneau, useBasculeTache, MARQUE_PRIORITE, echeanceCourte } from '../../components/equipe/Taches';
import ChecklistsPanneau from '../../components/equipe/Checklists';
import { Feuille, Compteurs, Compte, Plaque, BoutonEncre, BoutonTrait, Rien, Onglets, selectCls } from '../../components/equipe/kit';
import { STATUTS_TACHE, aujourdhuiISO } from '../../lib/equipe';

const COLONNES = ['a_faire', 'en_cours', 'fait'];

function Fiche({ tache, onOpen, montrerAssigne }) {
  const fait = tache.statut === 'fait';
  const ech = echeanceCourte(tache.echeance, fait);
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', String(tache.id)); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={() => onOpen(tache)}
      className={`relative bg-white border border-gray-200 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors ${
        ech?.retard ? 'border-l-[3px] border-l-red-500' : ''
      }`}
    >
      <p className={`text-sm leading-snug ${fait ? 'text-gray-400 line-through' : 'text-brand-ink'}`}>
        {!fait && MARQUE_PRIORITE[tache.priorite] && <span className="font-semibold text-red-500 mr-1">{MARQUE_PRIORITE[tache.priorite]}</span>}
        {tache.titre}
      </p>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
        {ech && <span className={ech.retard ? 'text-red-600 font-semibold' : ''}>{ech.texte}</span>}
        {tache.moment && <span className="text-sky-700">{tache.moment}</span>}
        {tache.recurrence !== 'aucune' && <span>↻</span>}
        {tache.nb_commentaires > 0 && <span>{tache.nb_commentaires} note{tache.nb_commentaires > 1 ? 's' : ''}</span>}
        <span className="flex-1 truncate text-gray-400">par {tache.cree_par_prenom}</span>
        {montrerAssigne && <Plaque user={{ id: tache.assigne_a, prenom: tache.assigne_prenom, nom: tache.assigne_nom }} size={18} />}
      </div>
    </div>
  );
}

function Tableau({ taches, onOpen, onDeplacer, montrerAssigne }) {
  const [survol, setSurvol] = useState(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
      {COLONNES.map(statut => {
        const items = taches.filter(t => t.statut === statut);
        // Terminées : les plus récemment bouclées d'abord.
        if (statut === 'fait') items.sort((a, b) => (b.fait_le || '').localeCompare(a.fait_le || ''));
        return (
          <div key={statut}
            onDragOver={e => { e.preventDefault(); setSurvol(statut); }}
            onDragLeave={() => setSurvol(null)}
            onDrop={e => { e.preventDefault(); setSurvol(null); onDeplacer(Number(e.dataTransfer.getData('text/plain')), statut); }}
            className={`min-h-[240px] transition-colors ${survol === statut ? 'bg-sky-50 outline outline-2 outline-dashed outline-sky-400 outline-offset-4' : ''}`}
          >
            <div className="flex items-baseline gap-3 border-b border-gray-200 pb-2 mb-3">
              <span className="font-display text-[15px] font-bold text-brand-ink">{STATUTS_TACHE[statut].label}</span>
              <Compte n={items.length} />
            </div>
            <div className="space-y-2">
              {items.map(t => <Fiche key={t.id} tache={t} onOpen={onOpen} montrerAssigne={montrerAssigne} />)}
              {!items.length && <p className="text-[11px] text-gray-300 text-center py-8">glisser une tâche ici</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Taches() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const { membres } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [taches, setTaches] = useState(null);
  const [vue, setVue] = useState(() => { try { return localStorage.getItem('fm_taches_vue') || 'liste'; } catch { return 'liste'; } });
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState(null); // tâche | {} (nouvelle)
  const [checklistsOuvertes, setChecklistsOuvertes] = useState(false);
  const membre = params.get('membre') || '';

  const charger = useCallback(() => {
    api.getTaches({ assigne_a: membre, vue: 'toutes' }).then(setTaches).catch(e => toast.error(e.message));
  }, [membre]);
  useEffect(() => { charger(); }, [charger]);

  useEffect(() => { try { localStorage.setItem('fm_taches_vue', vue); } catch { /* stockage indisponible */ } }, [vue]);

  const basculer = useBasculeTache(() => charger());

  async function deplacer(id, statut) {
    const t = taches.find(x => x.id === id);
    if (!t || t.statut === statut) return;
    setTaches(ts => ts.map(x => x.id === id ? { ...x, statut } : x)); // optimiste
    try {
      await api.patchTache(id, { statut });
      if (statut === 'fait' && t.recurrence !== 'aucune') toast.info('Terminée — la prochaine est planifiée.');
      charger();
    } catch (e) {
      toast.error(e.message);
      charger();
    }
  }

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (taches || []).filter(t => !q || t.titre.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [taches, recherche]);

  const auj = aujourdhuiISO();
  const compte = useMemo(() => ({
    a_faire: filtrees.filter(t => t.statut === 'a_faire').length,
    en_cours: filtrees.filter(t => t.statut === 'en_cours').length,
    retard: filtrees.filter(t => t.statut !== 'fait' && t.echeance && t.echeance < auj).length,
    fait: filtrees.filter(t => t.statut === 'fait').length,
  }), [filtrees, auj]);

  const montrerAssigne = isManager && !membre;
  const membreActif = membres.find(m => String(m.id) === membre);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
        <Onglets actif={vue} onChange={setVue} onglets={[{ id: 'liste', label: 'Liste' }, { id: 'tableau', label: 'Tableau' }]} trait={false} />
        {isManager && (
          <select value={membre} onChange={e => setParams(e.target.value ? { membre: e.target.value } : {})} className={selectCls}>
            <option value="">Toute l'équipe</option>
            {membres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
        )}
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="rechercher…"
          className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 w-44 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
        <div className="flex-1" />
        {isManager && <BoutonTrait onClick={() => setChecklistsOuvertes(true)}>Checklists du service</BoutonTrait>}
        <BoutonEncre onClick={() => setOuverte({})}>Nouvelle tâche</BoutonEncre>
      </div>

      <Feuille className="mb-8">
        <Compteurs items={[
          { label: 'à faire', valeur: compte.a_faire },
          { label: 'en cours', valeur: compte.en_cours },
          { label: 'en retard', valeur: compte.retard, ton: compte.retard ? 'corail' : undefined },
          { label: 'terminées · 60 jours', valeur: compte.fait, ton: 'vert' },
        ]} />
      </Feuille>

      {taches === null ? (
        <p className="py-16 text-center text-xs text-gray-400">chargement…</p>
      ) : vue === 'tableau' ? (
        <>
          <div className="mb-6 max-w-4xl">
            <AjoutRapide membres={membres} assigneParDefaut={membre ? Number(membre) : (isManager ? null : user.id)} onCree={charger}
              placeholder={membreActif ? `Nouvelle tâche pour ${membreActif.prenom}…` : 'Nouvelle tâche…'} />
          </div>
          <Tableau taches={filtrees} onOpen={setOuverte} onDeplacer={deplacer} montrerAssigne={montrerAssigne} />
        </>
      ) : (
        <div className="max-w-4xl">
          <div className="mb-6">
            <AjoutRapide membres={membres} assigneParDefaut={membre ? Number(membre) : (isManager ? null : user.id)} onCree={charger}
              placeholder={membreActif ? `Nouvelle tâche pour ${membreActif.prenom}…` : 'Nouvelle tâche…'} />
          </div>
          <ListeTaches taches={filtrees} onOpen={setOuverte} onToggle={basculer} montrerAssigne={montrerAssigne}
            vide={<Rien>{recherche ? 'aucune tâche ne correspond' : 'aucune tâche'}</Rien>} />
        </div>
      )}

      {checklistsOuvertes && <ChecklistsPanneau onClose={() => setChecklistsOuvertes(false)} onChange={charger} />}

      {ouverte && (
        <TachePanneau tache={ouverte.id ? ouverte : null} membres={membres}
          assigneParDefaut={membre ? Number(membre) : undefined}
          onClose={() => setOuverte(null)}
          onSaved={(t, o) => { if (!o?.silencieux) charger(); }}
          onDeleted={charger} />
      )}
    </div>
  );
}
