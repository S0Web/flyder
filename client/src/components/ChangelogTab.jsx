import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { parseServerDate } from '../lib/utils';

function fmt(iso) {
  return parseServerDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChangelogTab({ onRead }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api.getChangelog()
      .then(rows => {
        setEntries(rows);
        const nonVues = rows.filter(e => !e.vue);
        if (nonVues.length > 0) {
          const maxId = Math.max(...rows.map(e => e.id));
          api.markChangelogVu(maxId).then(() => onRead?.()).catch(() => {});
        }
      })
      .catch(err => setError(err.message));
  }, [onRead]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
        <p className="text-sm text-amber-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries === null && <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>}
      {entries?.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-8">Aucune annonce pour l'instant.</p>
      )}
      {entries?.map(entry => (
        <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-800">{entry.titre}</h2>
            {!!entry.importante && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Importante</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(entry.created_at)}</p>
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{entry.corps}</p>
        </div>
      ))}
    </div>
  );
}
