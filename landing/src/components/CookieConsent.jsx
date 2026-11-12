import { useEffect, useState } from 'react';
import { getConsent, setConsent, loadGTM } from '../lib/gtm';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === 'accepted') {
      loadGTM();
    } else if (consent !== 'refused') {
      setVisible(true);
    }
  }, []);

  function accepter() {
    setConsent('accepted');
    loadGTM();
    setVisible(false);
  }

  function refuser() {
    setConsent('refused');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Préférences cookies"
      className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-5">
      <div className="max-w-2xl mx-auto card-light rounded-xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-brand-ink/70 flex-1">
          Ce site utilise Google Analytics pour mesurer sa fréquentation. Vous pouvez accepter
          ou refuser ce suivi — voir notre{' '}
          <a href="/politique-confidentialite.html" className="underline text-brand-ink">politique de confidentialité</a>.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={refuser}
            className="text-sm font-semibold px-4 py-2.5 rounded-full border-[1.5px] border-brand-ink/15 text-brand-ink hover:bg-black/5 transition-colors">
            Refuser
          </button>
          <button onClick={accepter}
            className="text-sm font-semibold px-4 py-2.5 rounded-full text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3D5AFE' }}>
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
