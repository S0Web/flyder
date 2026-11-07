import { useState } from 'react';

const LIGNES = [
  {
    label: 'Alerte',
    tableur: "Le planning se corrige à la main, si quelqu'un y pense.",
    flyder: "Une alerte s'affiche dès qu'un cours n'a plus de coach.",
  },
  {
    label: 'Visibilité',
    tableur: "Le changement reste chez celui qui l'a fait.",
    flyder: "Toute l'équipe le voit tout de suite.",
  },
  {
    label: 'Facture',
    tableur: 'Les cours se recomptent un par un, coach par coach.',
    flyder: 'Le décompte et le coût de chaque coach se calculent seuls.',
  },
  {
    label: 'Analyse',
    tableur: 'Les chiffres du mois se refont à la main.',
    flyder: "Le tableau d'analyse se met à jour tout seul.",
  },
];

function Colonne({ titre, cle, accent }) {
  return (
    <div className={`rounded-2xl p-6 sm:p-7 ${accent ? '' : 'border border-black/10 bg-white'}`}
      style={accent ? { backgroundColor: '#12162B' } : undefined}>
      <div className="text-xs font-bold uppercase tracking-wide mb-5"
        style={{ color: accent ? '#8395FE' : '#8B93A7' }}>
        {titre}
      </div>
      <dl className="space-y-5">
        {LIGNES.map(l => (
          <div key={l.label} className={`pt-4 first:pt-0 first:border-t-0 border-t ${accent ? 'border-white/10' : 'border-[#E2E0D8]'}`}>
            <dt className={`text-xs font-mono font-semibold uppercase mb-1 ${accent ? 'text-brand-cream/50' : 'text-brand-ink/50'}`}>
              {l.label}
            </dt>
            <dd className={`text-sm ${accent ? 'text-brand-cream/80' : 'text-brand-ink/70'}`}>
              {l[cle]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function CeQueChangeFlyder() {
  const [tab, setTab] = useState('flyder'); // 'tableur' | 'flyder' — mobile uniquement

  return (
    <section id="solutions" className="bg-brand-cream py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight text-center">
          Ce que change Flyder
        </h2>

        <div className="sm:hidden mt-8 flex justify-center">
          <div role="group" aria-label="Comparer tableur et Flyder"
            className="inline-flex rounded-full border border-black/10 bg-white p-1">
            <button type="button" aria-pressed={tab === 'tableur'} onClick={() => setTab('tableur')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === 'tableur' ? 'bg-brand-ink text-white' : 'text-brand-ink/60'
              }`}>
              Sur un tableur
            </button>
            <button type="button" aria-pressed={tab === 'flyder'} onClick={() => setTab('flyder')}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={tab === 'flyder' ? { backgroundColor: '#3D5AFE', color: '#fff' } : { color: '#4A5068' }}>
              Avec Flyder
            </button>
          </div>
        </div>

        <div className="mt-10 sm:mt-14 grid sm:grid-cols-2 gap-5">
          <div className={tab === 'tableur' ? '' : 'hidden sm:block'}>
            <Colonne titre="Sur un tableur" cle="tableur" accent={false} />
          </div>
          <div className={tab === 'flyder' ? '' : 'hidden sm:block'}>
            <Colonne titre="Avec Flyder" cle="flyder" accent />
          </div>
        </div>
      </div>
    </section>
  );
}
