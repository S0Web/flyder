import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { parseServerDate } from '../../lib/utils';
import { jourLong, aujourdhuiISO } from '../../lib/equipe';
import { Plaque, Tampon, Cases, Ephemeride, BoutonEncre, BoutonTrait, BoutonCorail, champCls } from './kit';
import Panneau from './Panneau';

const heure = (s) => parseServerDate(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Ligne de formulaire papier : libellé court à gauche, réponse à droite.
function LigneFiche({ signe, label, children, ton = 'text-brand-ink' }) {
  return (
    <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[104px_1fr] gap-3 items-baseline py-1.5">
      <span className="text-[11px] text-gray-500 whitespace-nowrap truncate"><span className="text-sky-600">{signe}</span> {label}</span>
      <span className={`text-sm leading-relaxed ${ton}`}>{children}</span>
    </div>
  );
}

function TitreSection({ n, children, droite }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="text-[11px] text-sky-600">{n}</span>
      <span className="font-display text-[15px] font-bold text-brand-ink">{children}</span>
      <span className="flex-1 border-b border-gray-200" />
      {droite}
    </div>
  );
}

// ── Saisie de mon compte rendu ────────────────────────────────────────────────
export function CompteRenduPanneau({ date = aujourdhuiISO(), onClose, onSaved }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMonCompteRendu(date).then(d => {
      setData(d);
      const cr = d.compte_rendu;
      // Missions/indicateurs : ceux du compte rendu existant (tels qu'ils étaient ce
      // jour-là), sinon ceux de la fiche de poste actuelle.
      const missions = cr ? cr.missions : d.fiche.missions.map(texte => ({ texte, fait: false }));
      const indicateurs = cr?.indicateurs?.length ? cr.indicateurs : d.fiche.indicateurs.map(ind => ({ libelle: ind.libelle, type: ind.type, valeur: '' }));
      setForm({
        missions, indicateurs,
        resume: cr?.resume || '', priorite_demain: cr?.priorite_demain || '', probleme: cr?.probleme || '',
      });
    }).catch(e => toast.error(e.message));
  }, [date]);

  const cr = data?.compte_rendu;
  const verrouille = cr?.statut === 'valide';
  const faites = form?.missions.filter(m => m.fait).length || 0;
  const total = form?.missions.length || 0;

  async function enregistrer(soumettre, fermer) {
    setSaving(true);
    try {
      const maj = await api.saveMonCompteRendu(date, { ...form, soumettre });
      toast.success(soumettre ? 'Compte rendu envoyé' : 'Brouillon enregistré');
      onSaved?.(maj);
      fermer();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panneau
      surtitre="avant de partir"
      titre="Mon bilan de la journée"
      sousTitre={jourLong(date).toLowerCase()}
      onClose={onClose}
      largeur="max-w-2xl"
      pied={verrouille ? null : (fermer) => (
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-[11px] text-gray-400 flex-1">
            {cr?.statut === 'soumis' ? 'déjà envoyé · modifiable tant qu’il n’est pas validé' : 'le brouillon reste visible par toi seul'}
          </span>
          <BoutonTrait onClick={() => enregistrer(false, fermer)} disabled={saving || !form}>Brouillon</BoutonTrait>
          <BoutonCorail onClick={() => enregistrer(true, fermer)} disabled={saving || !form}>
            {cr?.statut === 'soumis' ? 'Renvoyer' : 'Envoyer au manager'} →
          </BoutonCorail>
        </div>
      )}
    >
      {!form ? (
        <p className="py-16 text-center text-xs text-gray-400">chargement…</p>
      ) : (
        <div className="space-y-8">
          {cr && cr.statut !== 'brouillon' && (
            <div className="flex items-start gap-5">
              <Tampon statut={cr.statut} className="mt-1" />
              {cr.retour_manager && (
                <p className="text-sm text-brand-ink leading-relaxed">
                  <span className="text-[11px] text-gray-500">{cr.valide_par_prenom} : </span>{cr.retour_manager}
                </p>
              )}
            </div>
          )}

          <section>
            <TitreSection n="01" droite={
              <span className="flex items-center gap-2"><Cases faits={faites} total={total} couleur="#0B7A3E" /><span className="text-[11px] text-gray-500">{faites}/{total}</span></span>
            }>
              Ce que j'ai fait
            </TitreSection>
            {total === 0 ? (
              <p className="text-sm text-gray-500">Ta fiche de poste n'a pas encore de missions ; ton manager peut les ajouter depuis ta fiche.</p>
            ) : (
              <ol>
                {form.missions.map((m, i) => (
                  <li key={i}>
                    <label className="flex items-start gap-3 py-2 border-b border-gray-100 cursor-pointer group">
                      <span className="text-[11px] text-gray-400 w-5 pt-0.5 text-right">{String(i + 1).padStart(2, '0')}</span>
                      <input type="checkbox" checked={m.fait} disabled={verrouille} className="sr-only"
                        onChange={() => setForm(f => ({ ...f, missions: f.missions.map((x, j) => j === i ? { ...x, fait: !x.fait } : x) }))} />
                      <span className={`mt-[2px] h-4 w-4 flex-shrink-0 rounded-lg flex items-center justify-center ${m.fait ? 'bg-[#0B7A3E]' : 'border-2 border-gray-300 group-hover:border-gray-400'}`}>
                        {m.fait && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                      </span>
                      <span className={`text-sm leading-snug ${m.fait ? 'text-brand-ink' : 'text-gray-600'}`}>{m.texte}</span>
                    </label>
                  </li>
                ))}
              </ol>
            )}
            {data.fiche.rappel && (
              <p className="mt-4 pl-3 border-l-2 border-sky-500 text-[13px] text-gray-600 italic leading-relaxed">{data.fiche.rappel}</p>
            )}
          </section>

          {form.indicateurs.length > 0 && (
            <section>
              <TitreSection n="02">Mes chiffres</TitreSection>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
                {form.indicateurs.map((ind, i) => {
                  const maj = (valeur) => setForm(f => ({ ...f, indicateurs: f.indicateurs.map((x, j) => j === i ? { ...x, valeur } : x) }));
                  const Tag = ind.type === 'oui_non' ? 'div' : 'label';
                  return (
                    <Tag key={i} className="block">
                      <span className="block text-xs font-medium text-gray-500 leading-tight min-h-[28px]">{ind.libelle}</span>
                      {ind.type === 'oui_non' ? (
                        <div className="flex gap-2 pt-1.5">
                          {['oui', 'non'].map(v => (
                            <button key={v} type="button" disabled={verrouille} onClick={() => maj(ind.valeur === v ? '' : v)}
                              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                                ind.valeur === v ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                              }`}>{v === 'oui' ? 'Oui' : 'Non'}</button>
                          ))}
                        </div>
                      ) : (
                        <input value={ind.valeur} disabled={verrouille} placeholder="—"
                          inputMode={ind.type === 'nombre' ? 'decimal' : undefined}
                          onChange={e => maj(e.target.value)}
                          className={`${champCls} text-base font-semibold`} />
                      )}
                    </Tag>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <TitreSection n="03">Pour finir</TitreSection>
            <p className="text-xs text-gray-500 -mt-1">
              La priorité de demain et le problème signalé sont transmis à tes collègues et au manager.
              Ta journée en deux mots reste réservée au manager.
            </p>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Ma journée en deux mots</span>
              <textarea rows={2} value={form.resume} disabled={verrouille} onChange={e => setForm(f => ({ ...f, resume: e.target.value }))}
                placeholder="Ce qui a marché, ce qui a coincé" className={`${champCls} resize-none`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500"><span className="text-sky-600">→</span> priorité de demain</span>
              <input value={form.priorite_demain} disabled={verrouille} onChange={e => setForm(f => ({ ...f, priorite_demain: e.target.value }))}
                placeholder="La première chose à faire en arrivant" className={champCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500"><span className="text-red-600">⚑</span> problème ou besoin à signaler</span>
              <textarea rows={2} value={form.probleme} disabled={verrouille} onChange={e => setForm(f => ({ ...f, probleme: e.target.value }))}
                placeholder="Facultatif" className={`${champCls} resize-none`} />
            </label>
          </section>
        </div>
      )}
    </Panneau>
  );
}

// ── Ticket de lecture (et validation côté manager) ────────────────────────────
export function CompteRenduCarte({ cr, onDecision, onModifier, montrerAuteur = true, compact = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';
  const [ouvert, setOuvert] = useState(false);
  const [modeRevoir, setModeRevoir] = useState(false);
  const [retour, setRetour] = useState('');
  const [busy, setBusy] = useState(false);
  const faites = cr.missions.filter(m => m.fait).length;
  const total = cr.missions.length;

  async function decider(decision) {
    setBusy(true);
    try {
      const maj = await api.deciderCompteRendu(cr.id, decision, retour);
      toast.success(decision === 'valide' ? `Bilan de ${cr.prenom} validé` : 'Renvoyé pour correction');
      setModeRevoir(false);
      onDecision?.(maj);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const aValider = isManager && cr.statut === 'soumis';

  return (
    <article className="relative flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {!compact && <Ephemeride iso={cr.date} />}
      <div className="flex-1 min-w-0 px-4 sm:px-5 py-4">
        <Tampon statut={cr.statut} className="absolute top-3.5 right-4" />

        <header className="flex items-center gap-3 pr-28">
          {montrerAuteur && <Plaque user={{ id: cr.user_id, prenom: cr.prenom, nom: cr.nom }} size={30} />}
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-brand-ink leading-tight truncate">
              {montrerAuteur ? `${cr.prenom} ${cr.nom}` : jourLong(cr.date)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {compact && <span>{jourLong(cr.date).toLowerCase()}</span>}
              <span>{cr.soumis_le ? `envoyé à ${heure(cr.soumis_le)}` : 'non envoyé'}</span>
              {total > 0 && (
                <span className="inline-flex items-center gap-1.5">missions <Cases faits={faites} total={total} couleur="#0B7A3E" taille={7} /> {faites}/{total}</span>
              )}
            </div>
          </div>
        </header>

        {cr.indicateurs.length > 0 && (
          <div className={`mt-4 grid ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'} border-y border-gray-200`}>
            {cr.indicateurs.map((ind, i) => (
              <div key={i} className="px-2.5 py-2.5 border-r border-gray-200 last:border-r-0 min-w-0">
                <div className="text-xl font-semibold text-brand-ink leading-none truncate" title={ind.valeur}>
                  {ind.type === 'oui_non' && ind.valeur ? ind.valeur.charAt(0).toUpperCase() + ind.valeur.slice(1) : (ind.valeur || '—')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1.5 leading-tight line-clamp-2" title={ind.libelle}>{ind.libelle}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          {cr.resume && <p className="text-[15px] text-brand-ink leading-relaxed mb-2">{cr.resume}</p>}
          {cr.priorite_demain && <LigneFiche signe="→" label="demain">{cr.priorite_demain}</LigneFiche>}
          {cr.probleme && <LigneFiche signe="⚑" label="signalé" ton="text-red-700 font-medium">{cr.probleme}</LigneFiche>}
          {cr.retour_manager && <LigneFiche signe="✎" label={cr.valide_par_prenom || 'manager'}>{cr.retour_manager}</LigneFiche>}
        </div>

        <div className="mt-2 flex items-center gap-4">
          {total > 0 && (
            <button onClick={() => setOuvert(o => !o)} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2">
              {ouvert ? 'masquer les missions' : 'détail des missions'}
            </button>
          )}
          {onModifier && cr.statut !== 'valide' && (
            <button onClick={() => onModifier(cr)} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2">
              {cr.statut === 'a_revoir' ? 'corriger' : 'modifier'}
            </button>
          )}
        </div>
        {ouvert && (
          <ol className="mt-3 columns-1 sm:columns-2 gap-6 animate-fadeIn">
            {cr.missions.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] py-0.5 break-inside-avoid">
                <span className={`text-[11px] w-4 ${m.fait ? 'text-[#0B7A3E]' : 'text-gray-300'}`}>{m.fait ? '✓' : '·'}</span>
                <span className={m.fait ? 'text-brand-ink' : 'text-gray-400'}>{m.texte}</span>
              </li>
            ))}
          </ol>
        )}

        {aValider && (
          <footer className="mt-4 pt-3 border-t border-gray-200">
            {modeRevoir ? (
              <div className="space-y-3">
                <textarea rows={2} autoFocus value={retour} onChange={e => setRetour(e.target.value)}
                  placeholder={`Ce que ${cr.prenom} doit compléter ou corriger`} className={`${champCls} resize-none`} />
                <div className="flex justify-end gap-2">
                  <BoutonTrait onClick={() => setModeRevoir(false)} className="!py-1.5">Annuler</BoutonTrait>
                  <BoutonCorail onClick={() => decider('a_revoir')} disabled={busy || !retour.trim()} className="!py-1.5">Renvoyer</BoutonCorail>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <input value={retour} onChange={e => setRetour(e.target.value)} placeholder="Un mot en retour (facultatif)"
                  className={`${champCls} flex-1 min-w-[180px]`} />
                <BoutonTrait onClick={() => setModeRevoir(true)} className="!py-1.5">À revoir</BoutonTrait>
                <BoutonEncre onClick={() => decider('valide')} disabled={busy} className="!py-1.5">Valider</BoutonEncre>
              </div>
            )}
          </footer>
        )}
      </div>
    </article>
  );
}
