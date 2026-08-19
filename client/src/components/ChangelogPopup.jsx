import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '../lib/api';
import { useDismiss } from '../lib/useDismiss';

// Pop-up de connexion, une seule fois par salarié : uniquement les annonces
// "importante" jamais vues. La fermeture marque TOUTES les annonces (pas
// seulement les importantes) comme vues, pour rester cohérent avec l'onglet
// Nouveautés et le badge — pas de "vu ici mais toujours non lu dans l'onglet".
export default function ChangelogPopup({ enabled }) {
  const [entries, setEntries] = useState(null);
  const [maxId, setMaxId] = useState(null);
  const { closing, dismiss } = useDismiss(() => {
    if (maxId != null) api.markChangelogVu(maxId).catch(() => {});
    setEntries(null);
  });

  useEffect(() => {
    if (!enabled) return;
    api.getChangelog().then(rows => {
      const importantesNonVues = rows.filter(e => e.importante && !e.vue);
      if (importantesNonVues.length > 0) {
        setEntries(importantesNonVues);
        setMaxId(Math.max(...rows.map(e => e.id)));
      }
    }).catch(() => {});
  }, [enabled]);

  if (!entries) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`}
      onClick={dismiss}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto ${closing ? 'animate-modalOut' : 'animate-modalIn'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef1ff', color: '#3D5AFE' }}>
            <Megaphone className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-lg font-bold text-gray-800">Quoi de neuf</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {entries.map(entry => (
            <div key={entry.id}>
              <h3 className="text-sm font-bold text-gray-800">{entry.titre}</h3>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{entry.corps}</p>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5">
          <button onClick={dismiss}
            className="w-full text-white rounded-lg py-2 text-sm font-medium"
            style={{ backgroundColor: '#3D5AFE' }}>
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
