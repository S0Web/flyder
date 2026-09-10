export default function EmptyState({ icon: Icon, titre, texte, action }) {
  return (
    <div className="card-white px-6 py-14 flex flex-col items-center text-center animate-fadeIn">
      <span className="tile tile-lg tile-grey mb-4"><Icon className="h-6 w-6 text-brand-slate" /></span>
      <h3 className="font-display text-xl font-bold text-brand-ink">{titre}</h3>
      <p className="mt-1.5 text-sm text-brand-ink/60 max-w-sm">{texte}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
