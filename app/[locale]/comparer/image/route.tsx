import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { pct, stat } from "@/lib/format";
import { SMALL_SAMPLE_GAMES } from "@/lib/stats/compare";
import { loadComparison, type ComparedPlayer, type ComparedSeason } from "@/lib/stats/compare-data";
import { MULTI_TEAM_ABBR } from "@/lib/stats/career";
import { photoDataUrl } from "@/lib/og-photo";

/**
 * Carte de partage du comparateur (1200 × 630) : image Open Graph de la page
 * et fichier téléchargeable. Mêmes paramètres et mêmes données que la page,
 * saisons affichées en toutes lettres.
 */

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

type CardRow = {
  label: string;
  value: (row: ComparedSeason) => number | null;
  format: (value: number | null) => string;
  /** Faux pour un volume : aucun côté n'est « meilleur ». */
  compare: boolean;
};

const ROWS: CardRow[] = [
  { label: "Points", value: (r) => r.pointsPerGame, format: (v) => stat(v), compare: true },
  { label: "Rebonds", value: (r) => r.reboundsPerGame, format: (v) => stat(v), compare: true },
  { label: "Passes", value: (r) => r.assistsPerGame, format: (v) => stat(v), compare: true },
  { label: "TS%", value: (r) => r.trueShooting, format: (v) => pct(v), compare: true },
  { label: "Matchs", value: (r) => r.gamesPlayed, format: (v) => (v == null ? "—" : String(v)), compare: false },
];

function fallbackCard(message: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#0a0a0f",
        color: "white",
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700 }}>hoopstats</div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.45)" }}>{message}</div>
    </div>,
    { width: WIDTH, height: HEIGHT },
  );
}

function PlayerSide({
  player,
  row,
  photo,
  align,
}: {
  player: ComparedPlayer;
  row: ComparedSeason;
  photo: string | null;
  align: "left" | "right";
}) {
  const color = row.team.primaryColor;
  const team = row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: 24,
        width: 520,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 132,
          height: 132,
          borderRadius: 66,
          overflow: "hidden",
          border: `4px solid ${color}`,
          background: `linear-gradient(135deg, ${color}, ${row.team.secondaryColor})`,
          color: "white",
          fontSize: 48,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={124}
            height={124}
            style={{ borderRadius: 62, objectFit: "cover", objectPosition: "top" }}
          />
        ) : (
          `${player.firstName[0] ?? ""}${player.lastName[0] ?? ""}`
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align === "left" ? "flex-start" : "flex-end",
          gap: 6,
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)" }}>{player.firstName}</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: "white", lineHeight: 1 }}>{player.lastName}</div>
        <div style={{ display: "flex", gap: 10, fontSize: 24, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
          {/* Couleur d'équipe en pastille : un bleu nuit en texte serait illisible sur fond sombre. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: color, border: "1px solid rgba(255,255,255,0.3)" }} />
            <span>{team}</span>
          </div>
          <span>·</span>
          <span>{row.season}</span>
        </div>
        {row.gamesPlayed < SMALL_SAMPLE_GAMES && (
          <div style={{ fontSize: 18, color: "#fcd34d" }}>Échantillon faible</div>
        )}
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const j1 = params.get("j1");
  const j2 = params.get("j2");
  if (!j1 || !j2) return fallbackCard("Comparer deux joueurs NBA");

  const comparison = await loadComparison(
    j1,
    j2,
    params.get("s1") ?? undefined,
    params.get("s2") ?? undefined,
    params.get("saison") ?? undefined,
  );
  if (!comparison?.s1 || !comparison.s2) return fallbackCard("Comparaison introuvable");
  const { p1, p2, s1, s2, choice } = comparison;
  const [photo1, photo2] = await Promise.all([photoDataUrl(p1.photoUrl), photoDataUrl(p2.photoUrl)]);
  const sameSeason = s1.season === s2.season;
  // Saison demandée absente : la carte le dit, comme la page, plutôt que de
  // montrer une autre saison sans prévenir.
  const missing = choice.unavailable[0];
  const missingName = missing ? (missing.slot === "j1" ? p1 : p2).lastName : null;
  const warning = missing
    ? `Saison ${missing.season} absente pour ${missingName}`
    : sameSeason
      ? null
      : "Attention : saisons différentes";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 56px",
        background: "#0a0a0f",
        color: "white",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: `linear-gradient(90deg, ${s1.team.primaryColor}26 0%, transparent 40%, transparent 60%, ${s2.team.primaryColor}26 100%)`,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "rgba(255,255,255,0.4)" }}>
        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>hoopstats</span>
        <span>
          {sameSeason ? `Saison régulière ${s1.season}` : `Saisons ${s1.season} et ${s2.season}`}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PlayerSide player={p1} row={s1} photo={photo1} align="left" />
        <PlayerSide player={p2} row={s2} photo={photo2} align="right" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ROWS.map((row) => {
          const v1 = row.value(s1);
          const v2 = row.value(s2);
          const f1 = row.format(v1);
          const f2 = row.format(v2);
          const decided = row.compare && v1 != null && v2 != null && f1 !== f2;
          const style = (wins: boolean) => ({
            width: 200,
            fontSize: 34,
            fontWeight: decided && wins ? 700 : 400,
            color: decided && wins ? "white" : "rgba(255,255,255,0.5)",
          });
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: "6px 0",
              }}
            >
              <span style={{ ...style(decided && v1! > v2!), display: "flex" }}>{f1}</span>
              <span style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2 }}>
                {row.label}
              </span>
              <span style={{ ...style(decided && v2! > v1!), display: "flex", justifyContent: "flex-end" }}>{f2}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: "rgba(255,255,255,0.35)" }}>
        <span>Moyennes par match · saison régulière</span>
        <span style={{ color: warning ? "#fcd34d" : undefined }}>{warning ?? "Même saison des deux côtés"}</span>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
