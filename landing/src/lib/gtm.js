const GTM_ID = 'GTM-PCJSD96V';
const CONSENT_KEY = 'flyder_cookie_consent'; // 'accepted' | 'refused'

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Stockage indisponible (navigation privée, cookies bloqués) — on
    // continue sans mémoriser le choix, il sera redemandé à la prochaine visite.
  }
}

let loaded = false;

export function loadGTM() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}
