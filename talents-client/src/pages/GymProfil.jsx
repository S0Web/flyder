import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import ProfilLayout, { Section, Field } from '../components/ProfilLayout';
import VilleAutocomplete from '../components/VilleAutocomplete';
import DisciplinePicker from '../components/DisciplinePicker';
import { disciplinesConnues } from '../lib/constants';

export default function GymProfil() {
  const { actor, updateActor } = useAuth();
  const [form, setForm] = useState({
    nom: actor.nom || '',
    adresse: actor.adresse || '',
    code_postal: actor.code_postal || '',
    ville: actor.ville || '',
    disciplines_recherchees: disciplinesConnues(actor.disciplines_recherchees),
    disciplines_autre_fitness: actor.disciplines_autre_fitness || '',
    disciplines_autre_aqua: actor.disciplines_autre_aqua || '',
    description: actor.description || '',
    contact_nom: actor.contact_nom || '',
    contact_email: actor.contact_email || '',
    contact_telephone: actor.contact_telephone || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const toggle = (v) => set('disciplines_recherchees',
    form.disciplines_recherchees.includes(v) ? form.disciplines_recherchees.filter((d) => d !== v) : [...form.disciplines_recherchees, v]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setSaving(true);
    try { updateActor(await api.updateGymMe(form)); setSaved(true); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const checklist = [
    { label: 'Ville et adresse', ok: actor.lat != null },
    { label: 'Disciplines recherchées', ok: !!actor.disciplines_recherchees },
    { label: 'Une description', ok: !!actor.description },
    { label: 'Un contact (téléphone)', ok: !!actor.contact_telephone },
    { label: 'Une photo', ok: !!actor.photo_url },
  ];

  return (
    <ProfilLayout base="/salle" titre={{ ink: 'Ce que les coachs', blue: 'verront' }}
      checklist={checklist} onSubmit={handleSubmit} saving={saving} saved={saved} error={error} setError={setError}
      form={<>
        <Section titre="La salle">
          <Field label="Nom"><input className="field" required value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Field>
          <Field label="Adresse (rue et numéro)" aide="Sert à calculer les distances et affiche ta ville aux coachs — jamais la rue exacte.">
            <input className="field" value={form.adresse} onChange={(e) => set('adresse', e.target.value)}
              placeholder="5 avenue du Général Leclerc" />
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
          <Field label="Description" aide="L'ambiance, le public, ce que tu proposes aux coachs (créneaux, matériel, rémunération…).">
            <textarea className="field min-h-[7rem]" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Salle de 600 m² à Corbeil, 900 adhérents. On cherche des coachs pour des cours collectifs le soir et le samedi matin." />
          </Field>
        </Section>

        <Section titre="Ce que tu recherches">
          <Field label="Disciplines">
            <DisciplinePicker selected={form.disciplines_recherchees} onToggle={toggle} editable
              autreFitness={form.disciplines_autre_fitness} onAutreFitnessChange={(v) => set('disciplines_autre_fitness', v)}
              autreAqua={form.disciplines_autre_aqua} onAutreAquaChange={(v) => set('disciplines_autre_aqua', v)} />
          </Field>
        </Section>

        <Section titre="Contact" aide="Révélé uniquement aux coachs qui cliquent sur « Contacter ».">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Personne à contacter"><input className="field" value={form.contact_nom} onChange={(e) => set('contact_nom', e.target.value)} placeholder="Julie Martin" /></Field>
            <Field label="Téléphone"><input className="field" value={form.contact_telephone} onChange={(e) => set('contact_telephone', e.target.value)} placeholder="01 60 00 00 00" /></Field>
          </div>
          <Field label="Email de contact">
            <input className="field" type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
          </Field>
        </Section>
      </>}
    />
  );
}
