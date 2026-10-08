import { prisma } from "@/lib/prisma";
import { capitalizeFirst, checkScore, dayKeyOf, dayTitle, hasBlockingIssue, linescoreValues, overtimeLabel } from "@/lib/schedule";
import { gameStatusLabel } from "@/lib/game-status";
import { GAME_PHASE_LABELS, type GamePhase } from "@/lib/season-phase";
import { nightLabel } from "@/lib/stats/night";
import { OG_SIZE, statCard, type OgLine } from "@/components/og/stat-card";

export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Match NBA sur hoopstats : affiche, score contrôlé, meilleur marqueur et date";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { city: true, name: true, abbr: true } },
      awayTeam: { select: { city: true, name: true, abbr: true } },
      boxScore: { select: { homeLinescores: true, awayLinescores: true } },
      playerBoxScores: {
        where: { pts: { not: null } },
        orderBy: { pts: "desc" },
        take: 1,
        select: { pts: true, teamAbbr: true, player: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!game) return statCard({ eyebrow: "Matchs NBA", title: "hoopstats", lines: [], dateLine: "" });

  const dayKey = dayKeyOf(game.gameDate);
  const homeLines = linescoreValues(game.boxScore?.homeLinescores);
  const awayLines = linescoreValues(game.boxScore?.awayLinescores);
  // Même contrôle que la fiche : un score incohérent ne part pas sur les réseaux.
  const unverified = hasBlockingIssue(
    checkScore({
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeLinescores: homeLines,
      awayLinescores: awayLines,
    }),
  );
  const final = game.status === "final" && !unverified;
  const teamLine = (team: { city: string; name: string; abbr: string }, score: number | null, other: number | null): OgLine => ({
    label: `${team.city} ${team.name}`,
    sub: team.abbr,
    value: final && score != null ? String(score) : "",
    tone: final && score != null && other != null && score > other ? "up" : "plain",
  });
  const top = game.playerBoxScores[0];
  const lines: OgLine[] = [
    teamLine(game.awayTeam, game.awayScore, game.homeScore),
    teamLine(game.homeTeam, game.homeScore, game.awayScore),
  ];
  if (final && top?.player && top.pts != null) {
    lines.push({ label: `${top.player.firstName} ${top.player.lastName}`, sub: `${top.teamAbbr} · meilleur marqueur`, value: `${top.pts} pts` });
  }
  const phase = game.phase ? GAME_PHASE_LABELS[game.phase as GamePhase] : null;
  const overtime = final ? overtimeLabel(homeLines?.length ?? null) : null;
  const status =
    game.status === "final"
      ? unverified
        ? "Score à vérifier"
        : ["Final", overtime].filter(Boolean).join(" · ")
      : (gameStatusLabel(game.status) ??
        `Coup d'envoi ${game.gameDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}, heure de Paris`);

  return statCard({
    eyebrow: ["Match NBA", phase, status].filter(Boolean).join(" · "),
    title: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    lines,
    ranked: false,
    dateLine: `${capitalizeFirst(dayTitle(dayKey))} · ${nightLabel(dayKey)} en France`,
  });
}
