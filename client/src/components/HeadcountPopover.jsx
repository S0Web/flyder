import { useState, useRef, useEffect } from 'react';
import { useFlashOnChange } from '../lib/useFlashOnChange';

const NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

function UsersIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

export default function HeadcountPopover({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [autre, setAutre] = useState('');
  const ref = useRef(null);
  const valueFlash = useFlashOnChange(value);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handlePick(n) {
    onSelect(n);
    setAutre('');
    setOpen(false);
  }

  function handleAutre(e) {
    e.preventDefault();
    const n = parseInt(autre, 10);
    if (Number.isFinite(n) && n >= 0) handlePick(n);
  }

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Renseigner l'effectif"
        aria-label="Renseigner l'effectif"
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 leading-none transition-colors active:scale-90
          ${value != null
            ? 'text-sky-700 bg-sky-50 hover:bg-sky-100'
            : 'text-gray-400 hover:text-sky-600 hover:bg-gray-100'}`}
      >
        <UsersIcon className="h-3.5 w-3.5 flex-shrink-0" />
        {value != null && (
          <span className={`text-[11px] font-bold tabular-nums inline-block ${valueFlash ? 'animate-pop' : ''}`}>{value}</span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 animate-popoverIn"
        >
          <div className="grid grid-cols-6 gap-1 w-[168px]">
            {NUMBERS.map(n => (
              <button
                key={n}
                onClick={() => handlePick(n)}
                className={`h-6 w-6 text-[11px] rounded font-medium active:scale-90
                  ${value === n ? 'bg-sky-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-sky-100'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <form onSubmit={handleAutre} className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
            <input
              type="number" min="0" inputMode="numeric"
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              placeholder="Autre…"
              aria-label="Autre effectif"
              className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-300"
            />
            <button type="submit" disabled={autre === ''}
              className="px-2 py-1 text-[11px] rounded bg-sky-600 text-white font-medium disabled:opacity-30">OK</button>
          </form>
        </div>
      )}
    </span>
  );
}
