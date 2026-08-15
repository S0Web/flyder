import { useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useDismiss } from '../lib/useDismiss';

// Import groupé des fiches de paie : upload du PDF unique (toutes les fiches de tous
// les salariés) -> analyse côté serveur (texte + reconnaissance de noms, pas d'IA) ->
// le manager relit/corrige la répartition proposée -> confirmation qui découpe
// réellement le PDF et range chaque fiche dans le dossier du bon salarié.
export default function ImportFichesDePaieModal({ users, onClose, onImported }) {
  const toast = useToast();
  const [etape, setEtape] = useState('choix'); // choix | analyse | revue
  const [analysing, setAnalysing] = useState(false);
  const [tempId, setTempId] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [groupes, setGroupes] = useState([]);
  const [pagesOrphelines, setPagesOrphelines] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const { closing, dismiss } = useDismiss(onClose);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysing(true);
    setEtape('analyse');
    try {
      const res = await api.analyserFichesDePaie(file);
      setTempId(res.tempId);
      setTotalPages(res.totalPages);
      setGroupes(res.groupes);
      setPagesOrphelines(res.pagesOrphelines);
      setEtape('revue');
    } catch (err) {
      toast.error('Échec de l’analyse : ' + err.message);
      setEtape('choix');
    } finally {
      setAnalysing(false);
    }
  }

  function updateGroupe(i, patch) {
    setGroupes(gs => gs.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  }

  function retirerGroupe(i) {
    setGroupes(gs => gs.filter((_, idx) => idx !== i));
  }

  async function handleAnnuler() {
    if (tempId) api.annulerImportFichesDePaie(tempId).catch(() => {});
    dismiss();
  }

  async function handleConfirmer() {
    if (groupes.length === 0) return;
    setConfirming(true);
    try {
      const res = await api.confirmerImportFichesDePaie(tempId, groupes.map(g => ({
        employeId: Number(g.employeId),
        periode: g.periode || null,
        pageDebut: Number(g.pageDebut),
        pageFin: Number(g.pageFin),
      })));
      toast.success(`${res.count} fiche(s) de paie importée(s)`);
      onImported();
      dismiss();
    } catch (err) {
      toast.error('Échec de l’import : ' + err.message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleAnnuler}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Importer les fiches de paie</h2>
          <button onClick={handleAnnuler} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {etape === 'choix' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Choisis le fichier PDF unique reçu de la compta, contenant les fiches de paie de tous les salariés.
                Un premier tri automatique sera proposé (reconnaissance du nom et de la période sur chaque page),
                à relire et corriger avant l'import définitif.
              </p>
              <input type="file" accept="application/pdf" onChange={handleFile}
                className="block w-full text-sm border border-gray-300 rounded-lg p-3" />
            </div>
          )}

          {etape === 'analyse' && (
            <div className="text-center py-10 text-gray-400 text-sm">Analyse du PDF en cours…</div>
          )}

          {etape === 'revue' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                {totalPages} page(s) au total — {groupes.length} fiche(s) détectée(s)
                {pagesOrphelines.length > 0 && `, ${pagesOrphelines.length} page(s) non reconnue(s)`}.
                Corrige le salarié ou les pages si besoin avant de confirmer.
              </p>

              <div className="space-y-3">
                {groupes.map((g, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Salarié</label>
                          <select value={g.employeId || ''} onChange={e => updateGroupe(i, { employeId: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                            <option value="">— Sélectionner —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Période (AAAA-MM)</label>
                          <input value={g.periode || ''} onChange={e => updateGroupe(i, { periode: e.target.value })}
                            placeholder="AAAA-MM"
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Page début</label>
                          <input type="number" min={1} max={totalPages} value={g.pageDebut}
                            onChange={e => updateGroupe(i, { pageDebut: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Page fin</label>
                          <input type="number" min={1} max={totalPages} value={g.pageFin}
                            onChange={e => updateGroupe(i, { pageFin: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        </div>
                      </div>
                      <button onClick={() => retirerGroupe(i)} title="Retirer cette fiche"
                        className="mt-5 h-7 w-7 flex-shrink-0 flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {g.extrait && <p className="text-[11px] text-gray-400 italic truncate">« {g.extrait} »</p>}
                  </div>
                ))}
                {groupes.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">Aucune fiche détectée automatiquement.</p>
                )}
              </div>

              {pagesOrphelines.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Pages non reconnues (à traiter manuellement)</p>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {pagesOrphelines.map(p => (
                      <li key={p.page}>Page {p.page} — « {p.extrait} »</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-2">
          <button onClick={handleAnnuler}
            className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Annuler</button>
          {etape === 'revue' && (
            <button onClick={handleConfirmer} disabled={confirming || groupes.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3D5AFE' }}>
              <Upload className="h-4 w-4" /> {confirming ? 'Import…' : `Importer ${groupes.length} fiche(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
