// Squelettes de chargement — même silhouette que ProfileCard pour éviter le
// saut de mise en page quand les vrais résultats arrivent.
export function CardSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="skeleton w-[4.5rem] h-24 flex-none" />
      <div className="card flex-1 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /></div>
          <div className="skeleton h-14 w-14 rounded-2xl" />
        </div>
        <div className="flex gap-1.5"><div className="skeleton h-6 w-16 rounded-full" /><div className="skeleton h-6 w-12 rounded-full" /></div>
        <div className="skeleton h-11 w-full rounded-full" />
      </div>
    </div>
  );
}
