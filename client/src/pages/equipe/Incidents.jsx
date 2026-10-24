import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import IncidentPanneau from '../../components/equipe/IncidentPanneau';
import { Feuille, Compteurs, Marque, Plaque, BoutonEncre, Onglets, Rien } from '../../components/equipe/kit';
import { STATUTS_INCIDENT, PRIORITES, isoPlusJours, aujourdhuiISO } from '../../lib/equipe';

const jjmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

function Ligne({ incident: i, onOpen }) {
  const statut = STATUTS_INCIDENT[i.statut];
  const priorite = PRIORITES[i.priorite] || PRIORITES.normale;
  const resolu = i.statut === 'resolu';
  return (
    <li onClick={() => onOpen(i)} data-testid="incident"
      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
      <span className="h-2 w-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: priorite.dot }} title={`priorité ${priorite.label.toLowerCase()}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${resolu ? 'text-gray-400' : 'text-brand-ink'}`}>
          <span className="text-gray-400 font-mono text-xs mr-1.5">#{String(i.id).padStart(3, '0')}</span>{i.titre}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500">
          <Marque ton="encre">{i.type_nom}</Marque>
          <Marque ton={statut.ton}>{statut.label}</Marque>
          {i.priorite !== 'normale' && <span className="font-medium" style={{ color: priorite.dot }}>{priorite.label.toLowerCase()}</span>}
          <span>signalé par {i.signale_prenom} · {jjmm(i.date_signalement)}</span>
          {resolu && i.resolu_le && <span>résolu le {jjmm(i.resolu_le.slice(0, 10))}</span>}
          {i.nb_commentaires > 0 && <span>{i.nb_commentaires} note{i.nb_commentaires > 1 ? 's' : ''}</span>}
        </div>
        {resolu && i.resolution && <p className="mt-1.5 text-xs text-gray-500 leading-snug">↳ {i.resolution}</p>}
      </div>
      <span className="flex items-center gap-2 flex-shrink-0 pt-0.5">
        {i.responsable_id ? (
          <>
            <span className="hidden sm:inline text-xs text-gray-500">{i.responsable_prenom}</span>
            <Plaque user={{ id: i.responsable_id, prenom: i.responsable_prenom, nom: i.responsable_nom }} size={22} />
          </>
        ) : !resolu && <span className="text-[11px] font-medium text-red-600">non attribué</span>}
      </span>
    </li>
  );
}

export default function Incidents() {
  const toast = useToast();
  const { membres, rafraichirCompteurs } = useOutletContext();
  const [incidents, setIncidents] = useState(null);
  const [types, setTypes] = useState([]);
  const [vue, setVue] = useState('ouverts'); // ouverts | resolus | tous
  const [typeId, setTypeId] = useState('');
  const [ouvert, setOuvert] = useState(null); // incident | {} (nouveau)

  const charger = useCallback(() => {
    api.getIncidents().then(setIncidents).catch(e => toast.error(e.message));
    api.getIncidentTypes().then(setTypes).catch(() => {});
    rafraichirCompteurs?.();
  }, [toast, rafraichirCompteurs]);
  useEffect(() => { charger(); }, [charger]);

  const filtres = useMemo(() => (incidents || []).filter(i =>
    (!typeId || i.type_id === Number(typeId)) && (vue === 'tous' || (vue === 'ouverts') === (i.statut !== 'resolu'))
  ), [incidents, vue, typeId]);

  const compte = useMemo(() => {
    const tous = incidents || [];
    const il = isoPlusJours(aujourdhuiISO(), -30);
    return {
      ouverts: tous.filter(i => i.statut !== 'resolu').length,
      urgents: tous.filter(i => i.statut !== 'resolu' && (i.priorite === 'urgente' || i.priorite === 'haute')).length,
      sans: tous.filter(i => i.statut !== 'resolu' && !i.responsable_id).length,
      resolus: tous.filter(i => i.statut === 'resolu' && i.resolu_le && i.resolu_le.slice(0, 10) >= il).length,
    };
  }, [incidents]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
        <Onglets actif={vue} onChange={setVue} trait={false}
          onglets={[{ id: 'ouverts', label: 'Ouverts' }, { id: 'resolus', label: 'Résolus' }, { id: 'tous', label: 'Tous' }]} />
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[['', 'tous types'], ...types.map(t => [String(t.id), t.nom.toLowerCase()])].map(([k, l]) => (
              <button key={k || 'tous'} type="button" onClick={() => setTypeId(k)} aria-pressed={typeId === k}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                  typeId === k ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>{l}</button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <BoutonEncre onClick={() => setOuvert({})}>Signaler un incident</BoutonEncre>
      </div>

      <Feuille className="mb-8">
        <Compteurs items={[
          { label: 'ouverts', valeur: compte.ouverts },
          { label: 'priorité haute/urgente', valeur: compte.urgents, ton: compte.urgents ? 'corail' : undefined },
          { label: 'sans responsable', valeur: compte.sans, ton: compte.sans ? 'corail' : undefined },
          { label: 'résolus · 30 jours', valeur: compte.resolus, ton: 'vert' },
        ]} />
      </Feuille>

      {incidents === null ? (
        <p className="py-16 text-center text-xs text-gray-400">chargement…</p>
      ) : filtres.length === 0 ? (
        <Rien>{vue === 'ouverts' ? 'aucun incident ouvert' : 'aucun incident'}</Rien>
      ) : (
        <ul className="max-w-4xl bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {filtres.map(i => <Ligne key={i.id} incident={i} onOpen={setOuvert} />)}
        </ul>
      )}

      {ouvert && (
        <IncidentPanneau incident={ouvert.id ? ouvert : null} membres={membres.filter(m => m.id)} types={types.filter(t => t.actif)}
          onClose={() => setOuvert(null)} onSaved={charger} onDeleted={charger} />
      )}
    </div>
  );
}
