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
    <article className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm min-h-[200px]">
      <div className="flex items-start gap-2 px-4 pt-3.5">
        <input value={titre} placeholder="Sans titre"
          onChange={e => { setTitre(e.target.value); planifier({ titre: e.target.value, contenu }); }}
          className="flex-1 min-w-0 font-display text-base font-bold text-brand-ink bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-gray-300" />
        <button onClick={async () => onChange(await api.updateNote(note.id, { epingle: !note.epingle }))}
          className={`text-xs font-medium ${note.epingle ? 'text-amber-600' : 'text-gray-400 hover:text-gray-700'}`}>
          {note.epingle ? '★ Épinglée' : '☆'}
        </button>
      </div>
      <textarea value={contenu} rows={6} placeholder="Écris ici…"
        onChange={e => { setContenu(e.target.value); planifier({ titre, contenu: e.target.value }); }}
        className="flex-1 px-4 pt-2 text-sm text-brand-ink leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-gray-300" />
      <div className="flex items-center justify-between px-4 pb-3 text-xs text-gray-400">
        <span>{enCours ? 'Enregistrement…' : date}</span>
        <button onClick={() => onDelete(note)} className="hover:text-red-600">Supprimer</button>
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

  if (!notes) return <p className="py-10 text-center text-xs text-gray-400">chargement…</p>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <p className="text-sm text-gray-600 max-w-lg">
          Ton carnet. <span className="text-brand-ink font-medium">Personne d'autre ne peut le lire</span>, managers compris.
        </p>
        <BoutonEncre onClick={ajouter}>Nouvelle note</BoutonEncre>
      </div>
      {notes.length === 0 ? (
        <Rien>Aucune note pour le moment</Rien>
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
