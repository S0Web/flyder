import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import ProfilLayout, { Section, Field } from '../components/ProfilLayout';
import VilleAutocomplete from '../components/VilleAutocomplete';
import DisciplinePicker from '../components/DisciplinePicker';
import { disciplinesConnues } from '../lib/constants';

export default function CoachProfil() {
  const { actor, updateActor } = useAuth();
  const [form, setForm] = useState({
    prenom: actor.prenom || '',
    nom: actor.nom || '',
    adresse: actor.adresse || '',
    code_postal: actor.code_postal || '',
    ville: actor.ville || '',
    disciplines: disciplinesConnues(actor.disciplines),
    disciplines_autre_fitness: actor.disciplines_autre_fitness || '',
    disciplines_autre_aqua: actor.disciplines_autre_aqua || '',
    tarif_horaire: actor.tarif_horaire ?? '',
    bio: actor.bio || '',
    telephone: actor.telephone || '',
    email_public: !!actor.email_public,
    disponible_remplacements: !!actor.disponible_remplacements,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const toggle = (v) => set('disciplines', form.disciplines.includes(v) ? form.disciplines.filter((d) => d !== v) : [...form.disciplines, v]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setSaving(true);
    try { updateActor(await api.updateCoachMe(form)); setSaved(true); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const checklist = [
    { label: 'Ville et adresse', ok: actor.lat != null },
    { label: 'Au moins une discipline', ok: !!actor.disciplines },
    { label: 'Une bio', ok: !!actor.bio },
    { label: 'Un téléphone', ok: !!actor.telephone },
    { label: 'Une photo', ok: !!actor.photo_url },
  ];

  return (
    <ProfilLayout base="/coach" titre={{ ink: 'Ce que les salles', blue: 'verront' }}
      checklist={checklist} onSubmit={handleSubmit} saving={saving} saved={saved} error={error} setError={setError}
      form={<>
        <Section titre="Identité">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Prénom"><input className="field" required value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Field>
            <Field label="Nom"><input className="field" required value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          </div>
        </Section>

        <Section titre="Où tu interviens" aide="Ton adresse sert uniquement à calculer les distances — elle n'est jamais affichée telle quelle, seulement ta ville.">
          <Field label="Adresse (rue et numéro)">
            <input className="field" value={form.adresse} onChange={(e) => set('adresse', e.target.value)}
              placeholder="12 rue de la République" />
          </Field>
          <div className="grid sm:grid-cols-[140px_1fr] gap-4">
            <Field label="Code postal">
              <input className="field" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={form.code_postal}
                onChange={(e) => set('code_postal', e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="91100" />
            </Field>
            <Field label="Ville" aide="Choisis-la dans la liste — pas de saisie libre, pour que ta position soit toujours fiable.">
              <VilleAutocomplete ville={form.ville} placeholder="Corbeil-Essonnes"
                onSelect={(ville, codePostal) => setForm((f) => ({ ...f, ville, code_postal: codePostal }))} />
            </Field>
          </div>
        </Section>

        <Section titre="Ton activité">
          <Field label="Disciplines">
            <DisciplinePicker selected={form.disciplines} onToggle={toggle} editable
              autreFitness={form.disciplines_autre_fitness} onAutreFitnessChange={(v) => set('disciplines_autre_fitness', v)}
              autreAqua={form.disciplines_autre_aqua} onAutreAquaChange={(v) => set('disciplines_autre_aqua', v)} />
          </Field>
          <label className="row cursor-pointer bg-white">
            <input type="checkbox" checked={form.disponible_remplacements} onChange={(e) => set('disponible_remplacements', e.target.checked)}
              className="h-5 w-5 flex-none rounded-md" />
            <span className="text-sm font-semibold text-brand-ink">Disponible pour des remplacements de dernière minute</span>
          </label>
          <div className="grid sm:grid-cols-[160px_1fr] gap-4">
            <Field label="Tarif horaire" aide="Affiché sur ta carte.">
              <div className="relative">
                <input className="field pr-8" type="number" min="0" value={form.tarif_horaire} onChange={(e) => set('tarif_horaire', e.target.value)} placeholder="35" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-brand-slate">€</span>
              </div>
            </Field>
            <Field label="Bio" aide="Deux ou trois phrases : parcours, spécialités, ce qui te différencie.">
              <textarea className="field min-h-[7rem]" rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)}
                placeholder="Coach diplômé BPJEPS, 6 ans en salle. Spécialisé renforcement et boxe, à l'aise avec les débutants comme les confirmés." />
            </Field>
          </div>
        </Section>

        <Section titre="Coordonnées" aide="Révélées uniquement aux salles qui cliquent sur « Contacter ».">
          <Field label="Téléphone">
            <input className="field" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="06 12 34 56 78" />
          </Field>
          <label className="row cursor-pointer bg-white">
            <input type="checkbox" checked={form.email_public} onChange={(e) => set('email_public', e.target.checked)}
              className="h-5 w-5 flex-none rounded-md" />
            <span className="text-sm text-brand-ink/80">Partager aussi mon email <span className="text-brand-slate">({actor.email})</span></span>
          </label>
        </Section>
      </>}
    />
  );
}
