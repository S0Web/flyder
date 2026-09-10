import AuthForm from '../components/AuthForm';

export default function CoachAuth() {
  return (
    <AuthForm
      role="coach"
      eyebrow="Espace coach"
      titre={{ ink: 'Les salles te cherchent', blue: 'déjà' }}
      accroche="Crée ton profil une fois, sois trouvé par toutes les salles autour de toi. Tes coordonnées ne sont révélées qu'à celles qui te contactent."
      promesses={[
        'Visible des salles dans le rayon que tu choisis',
        'Ton tarif, tes disciplines, ta bio — rien d\'autre à remplir',
        'Gratuit, sans commission — et ça le restera, même après la bêta',
      ]}
    />
  );
}
