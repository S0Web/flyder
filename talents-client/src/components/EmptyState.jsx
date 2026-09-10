// Case vide du panneau : hachures + cartouche posé au centre.
export default function EmptyState({ icon: Icon, titre, texte, action }) {
  return (
    <div className="hatch border-2 border-brand-ink rounded-sm px-6 py-14 flex flex-col items-center text-center animate-fadeIn">
      <div className="card-hard px-6 py-6 max-w-sm w-full flex flex-col items-center">
        <span className="h-12 w-12 border-2 border-brand-ink text-brand-coral flex items-center justify-center mb-4 rounded-[2px]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="display-title text-xl">{titre}</h3>
        <p className="mt-2 text-sm text-brand-ink/60">{texte}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
