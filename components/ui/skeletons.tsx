/** Skeleton loaders pour les états Suspense. */

function Bone({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />
  );
}

/** Skeleton pour le header joueur */
export function PlayerHeaderSkeleton() {
  return (
    <section className="grid grid-cols-12 gap-y-8 md:gap-x-8 items-start">
      <div className="col-span-12 md:col-span-3 flex justify-center md:justify-start">
        <div className="h-56 w-56 rounded-full animate-pulse bg-white/[0.06]" />
      </div>
      <div className="col-span-12 md:col-span-9 space-y-5">
        <div className="space-y-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-14 w-64" />
          <Bone className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Skeleton pour le tableau joueurs */
export function PlayerTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {Array.from({ length: 8 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Bone className="h-3 w-8 mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-white/[0.04]">
                <td className="px-5 py-3">
                  <Bone className="h-3 w-4" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Bone className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5">
                      <Bone className="h-3 w-28" />
                      <Bone className="h-2.5 w-10" />
                    </div>
                  </div>
                </td>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-3 py-3">
                    <Bone className="h-3 w-8 ml-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Skeleton pour la grille d'équipes */
export function TeamsGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4 flex flex-col items-center gap-3"
        >
          <Bone className="h-24 w-24 rounded-2xl" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-14" />
          </div>
          <Bone className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton pour les panneaux leaders (home) */
export function LeadersPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <Bone className="h-4 w-24" />
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3">
            <Bone className="h-3 w-3" />
            <Bone className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3 w-28" />
              <Bone className="h-2.5 w-16" />
            </div>
            <Bone className="h-4 w-8" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Skeleton pour l'en-tête d'une page : surtitre, titre, sous-titre */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Bone className="h-2.5 w-20" />
      <Bone className="h-9 w-64 max-w-full" />
      <Bone className="h-3.5 w-48 max-w-full" />
    </div>
  );
}

/** Skeleton générique d'une page, affiché dès le clic pendant le chargement */
export function PageSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Chargement">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <LeadersPanelSkeleton />
        <LeadersPanelSkeleton />
      </div>
    </div>
  );
}

/** Skeleton pour l'explorateur joueurs : filtres puis tableau */
export function PlayerExplorerSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Chargement">
      <PageHeaderSkeleton />
      <div className="rounded-2xl border border-white/[0.07] bg-[#111114] p-4 md:p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <Bone className="col-span-2 h-10 rounded-lg sm:col-span-1" />
          <Bone className="h-10 rounded-lg" />
          <Bone className="h-10 rounded-lg" />
        </div>
        <Bone className="h-3 w-28" />
      </div>
      <PlayerTableSkeleton />
    </div>
  );
}

/** Skeleton pour une fiche joueur */
export function PlayerPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement">
      <PlayerHeaderSkeleton />
      <PlayerTableSkeleton rows={5} />
    </div>
  );
}

/** Skeleton pour la liste des matchs */
export function GameListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Chargement">
      <PageHeaderSkeleton />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4 space-y-3"
          >
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-lg flex-shrink-0" />
                <Bone className="h-3.5 flex-1" />
                <Bone className="h-5 w-10" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton pour une fiche match ou équipe : bandeau puis panneaux */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Chargement">
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <Bone className="h-16 w-16 rounded-2xl flex-shrink-0" />
          <div className="flex flex-col items-center gap-2">
            <Bone className="h-9 w-28" />
            <Bone className="h-3 w-16" />
          </div>
          <Bone className="h-16 w-16 rounded-2xl flex-shrink-0" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <LeadersPanelSkeleton />
        <LeadersPanelSkeleton />
      </div>
    </div>
  );
}
