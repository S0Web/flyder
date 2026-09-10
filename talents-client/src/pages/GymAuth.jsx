import AuthForm from '../components/AuthForm';

export default function GymAuth() {
  return (
    <AuthForm
      role="gym"
      eyebrow="Espace salle"
      titre={{ ink: 'Trouve ton prochain', blue: 'coach' }}
      accroche="Des coachs indépendants près de ta salle, filtrés par discipline, distance et tarif. Un clic, et vous vous parlez en direct."
      promesses={[
        'Des profils autour de ta salle, pas des annonces nationales',
        'Filtre par discipline, rayon et tarif horaire',
        'Gratuit pendant la bêta — des offres arriveront ensuite pour les salles',
      ]}
    />
  );
}
