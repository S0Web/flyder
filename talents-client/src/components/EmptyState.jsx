export default function EmptyState({ icon: Icon, titre, texte, action }) {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-black/10 px-6 py-14 flex flex-col items-center text-center animate-fadeIn">
      <span className="h-14 w-14 rounded-2xl bg-sky-50 text-brand-blue flex items-center justify-center mb-4">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-display text-lg font-bold text-brand-ink">{titre}</h3>
      <p className="mt-1.5 text-sm text-brand-ink/60 max-w-sm">{texte}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
