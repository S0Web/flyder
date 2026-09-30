import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { parseServerDate } from '../../lib/utils';
import { Rien, BoutonEncre, Lien, champCls } from './kit';

const horodatage = (s) => {
  const d = parseServerDate(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
};

// Notes de suivi d'un membre : entretiens, points d'attention, rappels. Écrites et lues par
// les managers uniquement — le salarié concerné n'y a jamais accès.
export default function NotesSuivi({ membre }) {
  const toast = useToast();
  const [notes, setNotes] = useState(null);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getNotesSuivi(membre.id).then(setNotes).catch(e => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membre.id]);

  async function ajouter(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setBusy(true);
    try {
      const n = await api.addNoteSuivi(membre.id, texte);
      setNotes(ns => [n, ...(ns || [])]);
      setTexte('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(note) {
    if (!confirm('Supprimer cette note de suivi ?')) return;
    try {
      await api.deleteNoteSuivi(note.id);
      setNotes(ns => ns.filter(n => n.id !== note.id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-gray-600 mb-5">
        Notes de suivi sur {membre.prenom}. <span className="text-brand-ink font-medium">Visibles des managers uniquement</span>, jamais de {membre.prenom}.
      </p>
      <form onSubmit={ajouter} className="mb-6 space-y-3">
        <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} maxLength={4000}
          placeholder="Point d'entretien, remarque, rappel…"
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-brand-ink leading-relaxed focus:outline-none focus:border-transparent focus:ring-2 focus:ring-sky-400 resize-y" />
        <div className="flex justify-end">
          <BoutonEncre type="submit" disabled={busy || !texte.trim()}>Ajouter la note</BoutonEncre>
        </div>
      </form>
      {notes === null ? (
        <p className="text-xs text-gray-400">chargement…</p>
      ) : notes.length === 0 ? (
        <Rien>aucune note</Rien>
      ) : (
        <ol className="border-l-2 border-gray-200 ml-1 space-y-5">
          {notes.map(n => (
            <li key={n.id} className="relative pl-4">
              <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-500" />
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span><span className="text-brand-ink font-semibold">{n.auteur_prenom}</span> · {horodatage(n.created_at)}</span>
                <Lien onClick={() => supprimer(n)}>supprimer</Lien>
              </div>
              <p className="text-sm text-brand-ink whitespace-pre-wrap mt-0.5 leading-relaxed">{n.contenu}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
