import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';

const CATEG_LABELS = { aqua: 'Aqua', fitness: 'Fitness' };

// Normalise pour une comparaison insensible aux accents/casse (ex. "aquagym" == "Aquagym")
function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export default function CoursCombobox({ value, coursTypes, onChange, onCreated, aquaActive = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Filtre défensif : si aqua est désactivé mais que des cours_types 'aqua'
  // existent encore en base (créés avant la désactivation), on ne les propose
  // plus du tout — pas juste un choix en moins, une vraie disparition.
  const visibleCoursTypes = useMemo(
    () => aquaActive ? coursTypes : coursTypes.filter(ct => ct.categorie !== 'aqua'),
    [coursTypes, aquaActive]
  );
  const selected = visibleCoursTypes.find(ct => ct.id === Number(value));

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); setError(null); inputRef.current?.focus(); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = norm(search);
    const list = q ? visibleCoursTypes.filter(ct => norm(ct.nom).includes(q)) : visibleCoursTypes;
    return list.reduce((acc, ct) => {
      (acc[ct.categorie] ||= []).push(ct);
      return acc;
    }, {});
  }, [visibleCoursTypes, search]);

  const exactMatch = visibleCoursTypes.some(ct => norm(ct.nom) === norm(search));

  function pick(ct) {
    onChange(String(ct.id));
    setOpen(false);
  }

  async function handleCreate(categorie) {
    const nom = search.trim();
    if (!nom || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createCoursType(nom, categorie);
      onCreated(created);
      onChange(String(created.id));
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.nom : '-- Choisir --'}
        </span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un cours…"
            className="w-full border-b border-gray-200 px-3 py-2 text-sm focus:outline-none"
          />
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(filtered).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {CATEG_LABELS[cat] || cat}
                </div>
                {items.map(ct => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => pick(ct)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-sky-50 transition-colors ${ct.id === Number(value) ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'}`}
                  >
                    {ct.nom}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(filtered).length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400 italic">Aucun cours ne correspond.</p>
            )}
          </div>

          {search.trim() && !exactMatch && (
            <div className="border-t border-gray-200 p-2 space-y-1">
              {error && <p className="text-xs text-red-600 px-1">{error}</p>}
              {aquaActive ? (
                <>
                  <button type="button" disabled={creating} onClick={() => handleCreate('aqua')}
                    className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" /> Ajouter « {search.trim()} » en Aqua
                  </button>
                  <button type="button" disabled={creating} onClick={() => handleCreate('fitness')}
                    className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" /> Ajouter « {search.trim()} » en Fitness
                  </button>
                </>
              ) : (
                // Aqua désactivé : une seule catégorie possible, pas besoin de la demander.
                <button type="button" disabled={creating} onClick={() => handleCreate('fitness')}
                  className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" /> Ajouter « {search.trim()} »
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
