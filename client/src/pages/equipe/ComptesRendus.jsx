import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CompteRenduCarte, CompteRenduPanneau } from '../../components/equipe/ComptesRendus';
import { Onglets, Rien, BoutonCorail, selectCls } from '../../components/equipe/kit';
import { aujourdhuiISO, isoPlusJours } from '../../lib/equipe';

export default function ComptesRendus() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const { membres, rafraichirCompteurs } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [liste, setListe] = useState(null);
  const [aValider, setAValider] = useState([]);
  const [jour, setJour] = useState(''); // '' = tous les comptes rendus
  const [panneau, setPanneau] = useState(null); // date à saisir
  const onglet = isManager ? (params.get('vue') || 'a_valider') : 'miens';
  const membre = params.get('membre') || '';

  const charger = useCallback(() => {
    const filtre = { debut: jour, fin: jour, ...(isManager ? { user_id: membre } : {}) };
    api.getComptesRendus(filtre).then(setListe).catch(e => toast.error(e.message));
    if (isManager) api.getComptesRendus({ statut: 'soumis' }).then(setAValider).catch(() => {});
    rafraichirCompteurs?.();
  }, [jour, membre, isManager]);
  useEffect(() => { charger(); }, [charger]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  const affiches = useMemo(() => {
    if (!liste) return null;
    if (onglet === 'a_valider') return aValider.filter(cr => !membre || String(cr.user_id) === membre);
    return isManager ? liste : liste.filter(cr => cr.user_id === user.id);
  }, [liste, aValider, onglet, membre, isManager, user.id]);

  const auj = aujourdhuiISO();
  const monCrDuJour = liste?.find(cr => cr.user_id === user.id && cr.date === auj);
  const peutModifier = (cr) => cr.user_id === user.id && cr.date >= isoPlusJours(auj, -7);
  const nbAValider = aValider.length;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
        {isManager && (
          <Onglets trait={false} actif={onglet} onChange={v => setParam('vue', v === 'a_valider' ? '' : v)} onglets={[
            { id: 'a_valider', label: 'À valider', count: nbAValider, alerte: true },
            { id: 'historique', label: 'Historique' },
          ]} />
        )}
        {isManager && (
          <select value={membre} onChange={e => setParam('membre', e.target.value)} className={selectCls}>
            <option value="">Toute l'équipe</option>
            {membres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
        )}
        {onglet !== 'a_valider' && (
          <div className="flex items-end gap-3">
            <label className="block">
              <span className="block text-[11px] text-gray-500 mb-1">jour</span>
              <input type="date" value={jour} max={aujourdhuiISO()} onChange={e => setJour(e.target.value)} className={selectCls} />
            </label>
            {jour && (
              <button onClick={() => setJour('')} className="text-[11px] text-gray-500 hover:text-brand-ink underline underline-offset-4 pb-2">
                tous les jours
              </button>
            )}
          </div>
        )}
        <div className="flex-1" />
        <BoutonCorail onClick={() => setPanneau(auj)}>{monCrDuJour ? 'Mon bilan du jour' : 'Faire mon bilan du jour'} →</BoutonCorail>
      </div>

      {affiches === null ? (
        <p className="py-16 text-center text-xs text-gray-400">chargement…</p>
      ) : affiches.length === 0 ? (
        <Rien>{onglet === 'a_valider' ? 'aucun bilan en attente' : (jour ? 'aucun compte rendu ce jour-là' : 'aucun compte rendu pour l’instant')}</Rien>
      ) : (
        <div className="space-y-3">
          {affiches.map(cr => (
            <CompteRenduCarte key={cr.id} cr={cr} montrerAuteur={isManager}
              onDecision={charger}
              onModifier={peutModifier(cr) ? () => setPanneau(cr.date) : undefined} />
          ))}
        </div>
      )}

      {panneau && <CompteRenduPanneau date={panneau} onClose={() => setPanneau(null)} onSaved={charger} />}
    </div>
  );
}
