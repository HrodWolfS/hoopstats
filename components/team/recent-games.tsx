import Image from "next/image";

export type GameRow = {
  id: string;
  gameDate: string; // ISO
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isHome: boolean;
  opponent: {
    slug: string;
    city: string;
    name: string;
    abbr: string;
    logoUrl: string | null;
    primaryColor: string;
  };
};

type RecentGamesProps = {
  games: GameRow[];
  primaryColor: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function RecentGames({ games, primaryColor }: RecentGamesProps) {
  if (games.length === 0) {
    return (
      <p className="text-white/40 text-sm font-mono py-4">
        Aucun match récent disponible.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-4 pt-5 pb-3">
        <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
          Derniers matchs
        </div>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {games.map((game) => {
          const teamScore = game.isHome ? game.homeScore : game.awayScore;
          const oppScore = game.isHome ? game.awayScore : game.homeScore;
          const isWin =
            teamScore !== null && oppScore !== null && teamScore > oppScore;

          return (
            <li
              key={game.id}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              {/* Date */}
              <span className="text-[11px] text-white/30 font-mono w-14 shrink-0">
                {formatDate(game.gameDate)}
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

              {/* Score */}
              {teamScore !== null && oppScore !== null ? (
                <span
                  className={`font-mono tabular-nums text-sm shrink-0 ${
                    isWin ? "font-semibold" : "text-white/40"
                  }`}
                >
                  {teamScore}–{oppScore}
                </span>
              ) : null}

              {/* Badge W/L */}
              {teamScore !== null && oppScore !== null ? (
                <span
                  className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={
                    isWin
                      ? { background: `${primaryColor}33`, color: primaryColor }
                      : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                  }
                >
                  {isWin ? "W" : "L"}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
