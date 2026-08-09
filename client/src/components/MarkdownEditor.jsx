import { useRef, useState } from 'react';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link as LinkIcon, Minus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { renderMarkdown, IMAGE_SIZES } from '../lib/markdown';
import { useToast } from '../context/ToastContext';

const BTN = 'p-1.5 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-40';
const TAILLE_LABEL = { petite: 'Petite', moyenne: 'Moyenne (recommandée)', grande: 'Grande' };
const TAILLE_INITIALE = { petite: 'P', moyenne: 'M', grande: 'G' };

export default function MarkdownEditor({ value, onChange, onUploadImage }) {
  const toast = useToast();
  const textareaRef = useRef(null);
  const [mode, setMode] = useState('edit'); // 'edit' | 'apercu'
  const [uploading, setUploading] = useState(false);
  // Taille appliquée à la prochaine image insérée via le bouton image.
  const [taille, setTaille] = useState('moyenne');

  function withTextarea(fn) {
    const ta = textareaRef.current;
    if (!ta) return;
    fn(ta);
  }

  function wrapSelection(marker) {
    withTextarea(ta => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const selected = value.slice(s, e) || 'texte';
      const newValue = value.slice(0, s) + marker + selected + marker + value.slice(e);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(s + marker.length, s + marker.length + selected.length);
      });
    });
  }

  function insertHeading(prefix) {
    withTextarea(ta => {
      const s = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(newValue);
      const pos = s + prefix.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
    });
  }

  // Préfixe chaque ligne de la sélection (ou la ligne courante s'il n'y a pas
  // de sélection) avec le marqueur de liste — permet de sélectionner plusieurs
  // lignes d'un coup pour les transformer en liste.
  function insertList(ordered) {
    withTextarea(ta => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const blockStart = value.lastIndexOf('\n', s - 1) + 1;
      const blockEnd = e === s ? (value.indexOf('\n', e) === -1 ? value.length : value.indexOf('\n', e)) : e;
      const bloc = value.slice(blockStart, blockEnd);
      const lignes = bloc.split('\n');
      const nouveauBloc = lignes.map((l, i) => `${ordered ? `${i + 1}. ` : '- '}${l}`).join('\n');
      const newValue = value.slice(0, blockStart) + nouveauBloc + value.slice(blockEnd);
      onChange(newValue);
      const pos = blockStart + nouveauBloc.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
    });
  }

  function insertLink() {
    withTextarea(ta => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const texte = value.slice(s, e) || 'texte du lien';
      const insertion = `[${texte}](https://)`;
      const newValue = value.slice(0, s) + insertion + value.slice(e);
      onChange(newValue);
      // Sélectionne "https://" pour que l'utilisateur puisse taper l'URL directement.
      const urlStart = s + texte.length + 3;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(urlStart, urlStart + 8); });
    });
  }

  function insertSeparator() {
    withTextarea(ta => {
      const s = ta.selectionStart;
      const prefix = s > 0 && value[s - 1] !== '\n' ? '\n' : '';
      const insertion = `${prefix}\n---\n\n`;
      const newValue = value.slice(0, s) + insertion + value.slice(s);
      onChange(newValue);
      const pos = s + insertion.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
    });
  }

  async function handleImagePick(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await onUploadImage(file);
      withTextarea(ta => {
        const s = ta.selectionStart;
        const insertion = `\n![taille:${taille}](${url})\n`;
        const newValue = value.slice(0, s) + insertion + value.slice(s);
        onChange(newValue);
        const pos = s + insertion.length;
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
      });
      toast.success('Image uploadée');
    } catch (err) {
      toast.error("Échec de l'envoi de l'image : " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <button type="button" onClick={() => wrapSelection('**')} title="Gras" className={BTN}><Bold className="h-4 w-4" /></button>
        <button type="button" onClick={() => wrapSelection('*')} title="Italique" className={BTN}><Italic className="h-4 w-4" /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <button type="button" onClick={() => insertHeading('# ')} title="Titre principal" className={BTN}><Heading1 className="h-4 w-4" /></button>
        <button type="button" onClick={() => insertHeading('## ')} title="Sous-titre" className={BTN}><Heading2 className="h-4 w-4" /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <button type="button" onClick={() => insertList(false)} title="Liste à puces" className={BTN}><List className="h-4 w-4" /></button>
        <button type="button" onClick={() => insertList(true)} title="Liste numérotée" className={BTN}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" onClick={insertLink} title="Lien" className={BTN}><LinkIcon className="h-4 w-4" /></button>
        <button type="button" onClick={insertSeparator} title="Séparateur" className={BTN}><Minus className="h-4 w-4" /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded p-0.5" title="Taille de la prochaine image insérée">
          {IMAGE_SIZES.map(t => (
            <button key={t} type="button" onClick={() => setTaille(t)} title={TAILLE_LABEL[t]}
              className={`w-5 h-5 text-[10px] font-bold rounded ${taille === t ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
              {TAILLE_INITIALE[t]}
            </button>
          ))}
        </div>
        <label title={uploading ? 'Envoi en cours…' : "Insérer une capture d'écran"} className={`${BTN} cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={uploading} />
        </label>
        <div className="ml-auto flex gap-1 text-xs font-medium">
          <button type="button" onClick={() => setMode('edit')}
            className={`px-2.5 py-1 rounded ${mode === 'edit' ? 'bg-white shadow-sm text-sky-700' : 'text-gray-500'}`}>
            Éditer
          </button>
          <button type="button" onClick={() => setMode('apercu')}
            className={`px-2.5 py-1 rounded ${mode === 'apercu' ? 'bg-white shadow-sm text-sky-700' : 'text-gray-500'}`}>
            Aperçu
          </button>
        </div>
      </div>
      {mode === 'edit' ? (
        <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} rows={16}
          placeholder="Écris ton article ici… sélectionne du texte puis utilise les boutons ci-dessus pour le mettre en forme (pas besoin de connaître le markdown)."
          className="w-full p-3 text-sm focus:outline-none resize-y" />
      ) : (
        <div className="p-3 min-h-[16rem] formation-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
      )}
    </div>
  );
}
