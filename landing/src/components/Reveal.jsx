import { useEffect, useRef } from 'react';

// Fait apparaître son contenu en fondu + léger glissement quand il entre dans
// la fenêtre. `delay` (ms) décale un bloc ; `stagger` fait apparaître les
// enfants en décalé (voir .reveal-stagger dans index.css).
export default function Reveal({ as: Tag = 'div', delay = 0, stagger = false, className = '', children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        io.disconnect();
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`}
      style={stagger ? undefined : { transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
