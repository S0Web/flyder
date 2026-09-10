// Squelettes de chargement — même silhouette que ProfileCard pour éviter le
// saut de mise en page quand les vrais résultats arrivent.
export function CardSkeleton() {
  return (
    <div className="card-hard overflow-hidden">
      <div className="skeleton aspect-[4/3] rounded-none border-b-2 border-brand-ink" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
        <div className="flex gap-1.5 pt-2">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-5 w-12" />
        </div>
        <div className="skeleton h-11 w-full mt-3" />
      </div>
    </div>
  );
}
