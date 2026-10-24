import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CompteRenduCarte, CompteRenduPanneau } from '../../components/equipe/ComptesRendus';
import { Onglets, Rien, BoutonCorail, BoutonEncre, selectCls } from '../../components/equipe/kit';
import { aujourdhuiISO, isoPlusJours, jourLong } from '../../lib/equipe';

// Onglet « Moi » : mes 14 derniers jours, un par un — « Manquant » sur un jour
// travaillé sans bilan envoyé, pour repérer d'un coup d'œil ce qu'il reste à faire.
function MesBilans({ bilans, onOuvrir, peutModifier }) {
  if (bilans === null) return <p className="py-16 text-center text-xs text-gray-400">chargement…</p>;
  const pertinents = bilans.filter(j => j.travaille || j.compte_rendu);
  if (pertinents.length === 0) return <Rien>rien sur les 14 derniers jours</Rien>;
  return (
    <div className="space-y-3">
      {pertinents.map(j => {
        const fait = j.compte_rendu && j.compte_rendu.statut !== 'brouillon';
        const manquant = j.travaille && !fait;
        if (fait) {
          return (
            <CompteRenduCarte key={j.date} cr={j.compte_rendu}
              onModifier={peutModifier(j.compte_rendu) ? () => onOuvrir(j.date) : undefined} />
          );
        }
        return (
          <div key={j.date} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            manquant ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
          }`}>
            <span className="text-sm text-brand-ink capitalize">{jourLong(j.date)}</span>
            {manquant ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Manquant</span>
                <BoutonEncre onClick={() => onOuvrir(j.date)} className="!py-1 !px-3 !text-xs">Faire le bilan</BoutonEncre>
              </div>
            ) : (
              <span className="text-xs text-gray-400">pas travaillé</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ComptesRendus() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const { membres, rafraichirCompteurs } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [liste, setListe] = useState(null);
  const [aValider, setAValider] = useState([]);
  const [mesBilans, setMesBilans] = useState(null);
  const [jour, setJour] = useState(''); // '' = tous les comptes rendus
  const [panneau, setPanneau] = useState(null); // date à saisir
  const onglet = isManager ? (params.get('vue') || 'a_valider') : 'historique';
  const membre = params.get('membre') || '';
  const qui = params.get('qui') === 'moi' ? 'moi' : 'equipe';

  const charger = useCallback(() => {
    const filtre = { debut: jour, fin: jour, user_id: membre };
    api.getComptesRendus(filtre).then(setListe).catch(e => toast.error(e.message));
    if (isManager) api.getComptesRendus({ statut: 'soumis' }).then(setAValider).catch(() => {});
    api.getMesBilans().then(setMesBilans).catch(() => {});
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
    return liste;
  }, [liste, aValider, onglet, membre]);

  const auj = aujourdhuiISO();
  const monCrDuJour = liste?.find(cr => cr.user_id === user.id && cr.date === auj);
  const peutModifier = (cr) => cr.user_id === user.id && cr.date >= isoPlusJours(auj, -7);
  const nbAValider = aValider.length;
  const nbManquants = mesBilans
    ? mesBilans.filter(j => j.travaille && (!j.compte_rendu || j.compte_rendu.statut === 'brouillon')).length
    : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
        {isManager && (
          <Onglets trait={false} actif={onglet} onChange={v => setParam('vue', v === 'a_valider' ? '' : v)} onglets={[
            { id: 'a_valider', label: 'À valider', count: nbAValider, alerte: true },
            { id: 'historique', label: 'Historique' },
          ]} />
        )}
        {onglet !== 'a_valider' && (
          <Onglets trait={false} actif={qui} onChange={v => setParam('qui', v === 'equipe' ? '' : v)} onglets={[
            { id: 'equipe', label: "Toute l'équipe" },
            { id: 'moi', label: 'Moi', count: nbManquants, alerte: true },
          ]} />
        )}
        {qui === 'equipe' && (
          <select value={membre} onChange={e => setParam('membre', e.target.value)} className={selectCls}>
            <option value="">Toute l'équipe</option>
            {membres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
        )}
        {onglet !== 'a_valider' && qui === 'equipe' && (
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

      {onglet !== 'a_valider' && qui === 'moi' ? (
        <MesBilans bilans={mesBilans} onOuvrir={setPanneau} peutModifier={peutModifier} />
      ) : affiches === null ? (
        <p className="py-16 text-center text-xs text-gray-400">chargement…</p>
      ) : affiches.length === 0 ? (
        <Rien>{onglet === 'a_valider' ? 'aucun bilan en attente' : (jour ? 'aucun compte rendu ce jour-là' : 'aucun compte rendu pour l’instant')}</Rien>
      ) : (
        <div className="space-y-3">
          {affiches.map(cr => (
            <CompteRenduCarte key={cr.id} cr={cr} montrerAuteur
              onDecision={charger}
              onModifier={peutModifier(cr) ? () => setPanneau(cr.date) : undefined} />
          ))}
        </div>
      )}

      {panneau && <CompteRenduPanneau date={panneau} onClose={() => setPanneau(null)} onSaved={charger} />}
    </div>
  );
}
