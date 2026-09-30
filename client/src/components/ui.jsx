// Briques d'interface de la page Analyse.

export function SectionTitle({ id, Icon, children, sub, actions }) {
  return (
    <div id={id} className="scroll-mt-24 flex items-start gap-2.5 mt-8 mb-3 first:mt-0">
      <span className="mt-0.5 h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-sky-600" strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-brand-ink leading-tight">{children}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Segmented({ value, onChange, options, size = 'sm' }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors active:scale-[0.97] ${
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-sm'
          } ${value === o.value ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {o.Icon && <o.Icon size={14} />}
          {o.label}
          {o.count != null && (
            <span className={`tabular-nums text-[10px] px-1.5 rounded-full ${value === o.value ? 'bg-sky-50 text-sky-700' : 'bg-gray-200/70 text-gray-500'}`}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
