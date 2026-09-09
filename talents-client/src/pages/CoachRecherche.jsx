import RecherchePage from '../components/RecherchePage';

export default function CoachRecherche() {
  return (
    <RecherchePage type="gym" base="/coach"
      titre={{ ink: 'Les salles qui', blue: 'recrutent' }}
      singulier="salle" pluriel="salles" />
  );
}
