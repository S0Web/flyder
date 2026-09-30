import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

// Solde de congés payés (anciennement sur la fiche employé), avec l'ajustement
// manuel réservé au manager. Présenté comme un relevé : lignes à pointillés.
export default function CongesCarte({ userId, peutModifier }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getCpDetail(userId).then(setDetail).catch(() => {}); }, [userId]);

  async function ajuster(delta) {
    setBusy(true);
    try { setDetail(await api.adjustCp(userId, delta)); } finally { setBusy(false); }
  }

  if (!detail) return null;
  const fmt = (n) => String(n).replace('.', ',');

  const Ligne = ({ label, value, fort }) => (
    <div className="flex items-end gap-2 text-sm py-1">
      <span className={fort ? 'text-brand-ink font-semibold' : 'text-gray-600'}>{label}</span>
      <span className="flex-1 border-b border-dotted border-brand-ink/30 mb-1" />
      <span className={`font-mono tabular-nums ${fort ? 'text-brand-ink font-semibold' : 'text-gray-600'}`}>{value}</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[15px] font-bold text-brand-ink">Congés payés</span>
        <span className={`font-mono text-3xl font-semibold tabular-nums ${detail.restant < 0 ? 'text-fitness' : 'text-brand-ink'}`}>
          {fmt(detail.restant)}<span className="text-sm text-gray-400 ml-1">j</span>
        </span>
      </div>
      {!detail.date_debut_contrat && <p className="font-mono text-[11px] text-gray-400">date de contrat non renseignée</p>}
      <div className="mt-3">
        <Ligne label="Acquis à date" value={fmt(detail.calculeADate)} />
        <Ligne label="Ajustement" value={fmt(detail.ajuste)} />
        <Ligne label="Pris" value={`− ${fmt(detail.pris)}`} />
        <Ligne label="Restant" value={fmt(detail.restant)} fort />
      </div>
      {peutModifier && (
        <div className="flex items-center justify-end gap-2 mt-3 font-mono text-[11px] text-gray-500">
          ajuster
          <button type="button" onClick={() => ajuster(-1)} disabled={busy}
            className="h-6 w-6 border border-brand-ink/25 rounded-[3px] text-brand-ink hover:bg-white disabled:opacity-40">−</button>
          <button type="button" onClick={() => ajuster(1)} disabled={busy}
            className="h-6 w-6 border border-brand-ink/25 rounded-[3px] text-brand-ink hover:bg-white disabled:opacity-40">+</button>
        </div>
      )}
    </div>
  );
}
