import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'ℹ' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  // `leaving` déclenche le fondu de sortie ; le retrait réel du DOM est différé
  // le temps que l'animation joue, sinon le toast disparaîtrait d'un coup.
  const remove = useCallback((id) => {
    setToasts(ts => ts.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 150);
  }, []);

  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts(ts => [...ts, { id, type, message, leaving: false }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const toast = {
    success: (m) => push('success', m),
    error:   (m) => push('error', m),
    info:    (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
        {toasts.map(t => {
          const s = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => remove(t.id)}
              className={`flex items-start gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm cursor-pointer
                ${t.leaving ? 'animate-fadeOut' : 'animate-fadeIn'}`}
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
            >
              <span className="font-bold leading-5">{s.icon}</span>
              <span className="leading-5">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Sécurité : si le provider n'englobe pas (ne devrait pas arriver), no-op.
  return ctx || { success: () => {}, error: () => {}, info: () => {} };
}
