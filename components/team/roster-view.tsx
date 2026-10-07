import { RosterCard } from "@/components/team/roster-card";

export type RosterPlayer = {
  slug: string;
  /** Fiche du joueur, sur la saison de l'effectif. */
  href: string;
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
  /** Joueurs alignés par l'équipe dans la saison, triés par points par match. */
  players: RosterPlayer[];
  season: string;
};

export function RosterView({ players, season }: RosterViewProps) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-mono text-white/40">
        {players.length} joueurs alignés en {season} · triés par points par match
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {players.map((p) => (
          <RosterCard
            key={p.slug}
            href={p.href}
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
