import { RosterCard } from "@/components/team/roster-card";

export type RosterPlayer = {
  slug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  jerseyNumber?: string | null;
  primaryColor: string;
  secondaryColor: string;
  photoUrl?: string | null;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
};

type RosterViewProps = {
  players: RosterPlayer[];
  updatedAt: string;
  locale: string;
};

export function RosterView({ players, updatedAt, locale }: RosterViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="font-mono">
          {players.length} joueurs · effectif au {updatedAt}
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="px-2 py-1 rounded-md bg-white/[0.04]">
            Tous postes
          </span>
          <span className="px-2 py-1 rounded-md bg-white/[0.04]">↓ PPM</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {players.map((p) => (
          <RosterCard
            key={p.slug}
            slug={p.slug}
            locale={locale}
            firstName={p.firstName}
            lastName={p.lastName}
            position={p.position}
            jerseyNumber={p.jerseyNumber}
            primaryColor={p.primaryColor}
            secondaryColor={p.secondaryColor}
            photoUrl={p.photoUrl}
            pts={p.pointsPerGame}
            reb={p.reboundsPerGame}
            ast={p.assistsPerGame}
          />
        ))}
      </div>
    </div>
  );
}
