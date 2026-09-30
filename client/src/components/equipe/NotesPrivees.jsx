import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { parseServerDate } from '../../lib/utils';
import { Rien, BoutonEncre } from './kit';

// Carnet personnel : chaque note s'enregistre toute seule (après une courte
// pause de frappe). Visible uniquement par son auteur.
function Note({ note, onChange, onDelete }) {
  const toast = useToast();
  const [titre, setTitre] = useState(note.titre);
  const [contenu, setContenu] = useState(note.contenu);
  const [enCours, setEnCours] = useState(false);
  const timer = useRef(null);

  function planifier(patch) {
    setEnCours(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        onChange(await api.updateNote(note.id, patch));
      } catch (e) {
        toast.error(e.message);
      } finally {
        setEnCours(false);
      }
    }, 700);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  const d = parseServerDate(note.updated_at);
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;

  return (
    // Page de carnet : lignes réglées en fond, marge rouge à gauche.
    <article className="relative flex flex-col bg-white border border-brand-ink/10 rounded-[3px] min-h-[220px]"
      style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 27px, rgba(61,90,254,0.10) 27px 28px)', backgroundPosition: '0 50px' }}>
      <span className="absolute top-0 bottom-0 left-9 w-px bg-fitness/40" />
      <div className="flex items-start gap-2 pl-12 pr-3 pt-3">
        <input value={titre} placeholder="Sans titre"
          onChange={e => { setTitre(e.target.value); planifier({ titre: e.target.value, contenu }); }}
          className="flex-1 min-w-0 font-display text-base font-bold text-brand-ink bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-gray-300" />
        <button onClick={async () => onChange(await api.updateNote(note.id, { epingle: !note.epingle }))}
          className={`font-mono text-[11px] ${note.epingle ? 'text-fitness' : 'text-gray-400 hover:text-brand-ink'}`}>
          {note.epingle ? '★ épinglée' : '☆'}
        </button>
      </div>
      <textarea value={contenu} rows={6} placeholder="…"
        onChange={e => { setContenu(e.target.value); planifier({ titre, contenu: e.target.value }); }}
        className="flex-1 pl-12 pr-3 pt-2 text-sm text-brand-ink bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-gray-300"
        style={{ lineHeight: '28px' }} />
      <div className="flex items-center justify-between pl-12 pr-3 pb-2 font-mono text-[10px] text-gray-400">
        <span>{enCours ? 'enregistrement…' : date}</span>
        <button onClick={() => onDelete(note)} className="hover:text-fitness">déchirer la page ✕</button>
      </div>
    </article>
  );
}

export default function NotesPrivees() {
  const toast = useToast();
  const [notes, setNotes] = useState(null);

  useEffect(() => { api.getNotes().then(setNotes).catch(e => toast.error(e.message)); }, []);

  // Épinglées d'abord, puis par date de création : trier sur la date de modification
  // ferait sauter la note en cours d'écriture en tête de liste à chaque sauvegarde.
  const trier = (ns) => [...ns].sort((a, b) => (b.epingle - a.epingle) || b.id - a.id);

  async function ajouter() {
    try {
      const n = await api.createNote({ titre: '', contenu: '' });
      setNotes(ns => [n, ...ns]);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function supprimer(note) {
    if ((note.titre || note.contenu) && !confirm('Supprimer cette note ?')) return;
    await api.deleteNote(note.id);
    setNotes(ns => ns.filter(n => n.id !== note.id));
  }

  if (!notes) return <p className="py-10 text-center font-mono text-xs text-gray-400">chargement…</p>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <p className="text-sm text-gray-600 max-w-lg">
          Ton carnet. <span className="text-brand-ink font-medium">Personne d'autre ne peut le lire</span>, managers compris.
        </p>
        <BoutonEncre onClick={ajouter}>Nouvelle page</BoutonEncre>
      </div>
      {notes.length === 0 ? (
        <Rien>carnet vide</Rien>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {trier(notes).map(n => (
            <Note key={n.id} note={n}
              onChange={maj => setNotes(ns => ns.map(x => x.id === maj.id ? maj : x))}
              onDelete={supprimer} />
          ))}
        </div>
      )}
    </div>
  );
}
