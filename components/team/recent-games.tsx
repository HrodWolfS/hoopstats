import Image from "next/image";
import Link from "next/link";
import { GAME_PHASE_LABELS, type GamePhase } from "@/lib/season-phase";

export type GameRow = {
  id: string;
  gameDate: string; // ISO
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  phase: string | null;
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

/** Score vu de l'équipe de la page ; `null` tant que le match n'est pas joué. */
export function gameResult(game: GameRow): { teamScore: number; oppScore: number; won: boolean } | null {
  const teamScore = game.isHome ? game.homeScore : game.awayScore;
  const oppScore = game.isHome ? game.awayScore : game.homeScore;
  if (teamScore == null || oppScore == null) return null;
  return { teamScore, oppScore, won: teamScore > oppScore };
}

const PHASE_SHORT: Partial<Record<GamePhase, string>> = {
  cup_final: "Cup",
  play_in: "PI",
  playoffs: "PO",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

/** Ligne de résultat : date, lieu, adversaire (lien), phase hors saison régulière, score. */
export function GameResultItem({
  game,
  primaryColor,
  opponentHref,
}: {
  game: GameRow;
  primaryColor: string;
  /** Fiche de l'adversaire, sur la saison du match. */
  opponentHref: string;
}) {
  const result = gameResult(game);
  const phase = game.phase as GamePhase | null;
  const phaseShort = phase ? PHASE_SHORT[phase] : undefined;

  return (
    <li className="flex items-center gap-2 px-4 py-3 text-sm sm:gap-3">
      <span className="text-[11px] text-white/30 font-mono w-12 shrink-0 sm:w-14">
        {formatDate(game.gameDate)}
      </span>
      <span className="text-[11px] text-white/30 font-mono w-4 shrink-0 text-center">
        {game.isHome ? "vs" : "@"}
      </span>
      {game.opponent.logoUrl ? (
        <Image
          src={game.opponent.logoUrl}
          alt=""
          width={20}
          height={20}
          className="object-contain shrink-0"
        />
      ) : (
        <div className="w-5 h-5 shrink-0" />
      )}
      <Link
        href={opponentHref}
        className="min-w-0 flex-1 truncate text-xs text-white/60 underline-offset-4 hover:underline"
      >
        <span className="sm:hidden">{game.opponent.abbr}</span>
        <span className="hidden sm:inline">
          {game.opponent.city} <span className="text-white/30">{game.opponent.name}</span>
        </span>
      </Link>
      {phaseShort && phase && (
        <abbr
          title={GAME_PHASE_LABELS[phase]}
          className="no-underline shrink-0 rounded border border-white/10 px-1 text-[10px] font-mono text-white/45"
        >
          {phaseShort}
        </abbr>
      )}
      {result && (
        <>
          <span
            className={`font-mono tabular-nums text-sm shrink-0 ${
              result.won ? "font-semibold" : "text-white/40"
            }`}
          >
            {result.teamScore}–{result.oppScore}
          </span>
          <span
            aria-label={result.won ? "Victoire" : "Défaite"}
            className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={
              result.won
                ? { background: `${primaryColor}33`, color: primaryColor }
                : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
            }
          >
            {result.won ? "V" : "D"}
          </span>
        </>
      )}
    </li>
  );
}
