import RecherchePage from '../components/RecherchePage';

export default function GymRecherche() {
  return (
    <RecherchePage type="coach" base="/salle"
      titre={{ ink: 'Trouve ton prochain', blue: 'coach' }}
      singulier="coach" pluriel="coachs" />
  );
}
