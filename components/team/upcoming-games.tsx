import Image from "next/image";
import type { GameRow } from "@/components/team/recent-games";

type UpcomingGamesProps = {
  games: GameRow[];
};

function formatUpcomingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function UpcomingGames({ games }: UpcomingGamesProps) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="px-4 pt-5 pb-3">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            Prochains matchs
          </div>
        </div>
        <p className="text-white/30 text-sm font-mono px-4 pb-4">
          Aucun match programmé.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-4 pt-5 pb-3">
        <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
          Prochains matchs
        </div>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {games.map((game) => (
          <li
            key={game.id}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            {/* Date */}
            <span className="text-[11px] text-white/30 font-mono w-24 shrink-0 capitalize">
              {formatUpcomingDate(game.gameDate)}
            </span>

            {/* Domicile/Déplacement */}
            <span className="text-[11px] text-white/30 font-mono w-5 shrink-0 text-center">
              {game.isHome ? "vs" : "@"}
            </span>

            {/* Logo adversaire */}
            {game.opponent.logoUrl ? (
              <Image
                src={game.opponent.logoUrl}
                alt={game.opponent.abbr}
                width={20}
                height={20}
                className="object-contain shrink-0"
              />
            ) : (
              <div className="w-5 h-5 shrink-0" />
            )}

            {/* Nom adversaire */}
            <span className="text-white/60 flex-1 truncate text-xs">
              {game.opponent.city}{" "}
              <span className="text-white/30">{game.opponent.name}</span>
            </span>

            {/* Label à venir */}
            <span className="text-[10px] text-white/20 font-mono shrink-0">
              À venir
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
