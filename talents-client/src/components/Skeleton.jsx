// Squelettes de chargement — même silhouette que ProfileCard pour éviter le
// saut de mise en page quand les vrais résultats arrivent.
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-black/5 shadow-card overflow-hidden">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-3.5 w-11/12" />
        <div className="skeleton h-3.5 w-3/4" />
        <div className="flex gap-1.5 pt-1">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-12 rounded-full" />
        </div>
        <div className="skeleton h-11 w-full rounded-full mt-2" />
      </div>
    </div>
  );
}
