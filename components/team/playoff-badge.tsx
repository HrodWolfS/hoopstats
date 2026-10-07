import type { PlayoffOutcome, PlayoffOutcomeKind } from "@/lib/playoff-outcome";

const SHORT_LABEL: Partial<Record<PlayoffOutcomeKind, string>> = {
  champion: "Champion",
  finals: "Finale NBA",
  "conference-finals": "Finale conf.",
  "conference-semis": "Demi-finale conf.",
  "first-round": "1er tour",
  "play-in": "Play-in",
  missed: "Non qualifié",
  unknown: "Non disponible",
};

/**
 * Résultat de playoffs d'une saison. La source est dite au survol et aux
 * lecteurs d'écran : séries jouées ou, à défaut, code de qualification ESPN.
 */
export function PlayoffBadge({
  outcome,
  primaryColor,
  compact = false,
}: {
  outcome: PlayoffOutcome;
  primaryColor: string;
  /** Libellé court, pour les tableaux étroits ; le libellé complet reste lu à l'écran. */
  compact?: boolean;
}) {
  const source =
    outcome.basis === "series"
      ? "d'après les séries de playoffs ESPN"
      : outcome.basis === "clinch-code"
        ? "d'après le code de qualification ESPN de fin de saison régulière"
        : "aucune série de playoffs en base pour cette saison";

  const style =
    outcome.kind === "champion"
      ? { background: `${primaryColor}33`, color: "#fde68a", borderColor: "rgba(253,230,138,0.35)" }
      : outcome.kind === "finals" || outcome.kind === "conference-finals"
        ? { background: `${primaryColor}22`, color: "rgba(255,255,255,0.85)", borderColor: `${primaryColor}55` }
        : undefined;

  const muted = outcome.kind === "missed" || outcome.kind === "unknown" || outcome.kind === "pending";

  return (
    <span
      title={`Résultat ${source}`}
      style={style}
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${
        style ? "" : muted ? "border-white/[0.06] text-white/35" : "border-white/10 text-white/70"
      }`}
    >
      {outcome.kind === "champion" && <span aria-hidden="true" className="mr-1">🏆</span>}
      {compact && SHORT_LABEL[outcome.kind] ? (
        <>
          <span aria-hidden="true">{SHORT_LABEL[outcome.kind]}</span>
          <span className="sr-only">{outcome.label}</span>
        </>
      ) : (
        outcome.label
      )}
      <span className="sr-only"> ({source})</span>
    </span>
  );
}
