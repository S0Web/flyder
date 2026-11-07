import { useEffect, useState } from 'react';

// Barre fixe en bas, mobile uniquement : visible dès qu'on a quitté l'accroche,
// masquée devant le formulaire de contact pour ne pas le recouvrir.
export default function MobileCTA() {
  const [pastHero, setPastHero] = useState(false);
  const [inContact, setInContact] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('top');
    const contact = document.getElementById('contact');
    if (!hero || !contact) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    const contactObserver = new IntersectionObserver(
      ([entry]) => setInContact(entry.isIntersecting),
      { threshold: 0 }
    );
    heroObserver.observe(hero);
    contactObserver.observe(contact);
    return () => {
      heroObserver.disconnect();
      contactObserver.disconnect();
    };
  }, []);

  const visible = pastHero && !inContact;

  return (
    <div className={`sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 transition-transform duration-300 ${
      visible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <a href="#contact"
        className="block text-center text-white text-sm font-semibold px-6 py-3.5 rounded-full shadow-lg"
        style={{ backgroundColor: '#3D5AFE' }}>
        Voir ça sur mon planning
      </a>
    </div>
  );
}
