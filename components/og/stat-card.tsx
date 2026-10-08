import { ImageResponse } from "next/og";

/**
 * Carte sociale commune (1200 × 630) : contexte, trois valeurs au plus,
 * date des données et marque. Lisible en vignette : peu de texte, gros
 * chiffres, contraste fort.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export type OgLine = {
  /** Rang affiché ; égalités comprises (« 2, 2, 4 »). Par défaut, la position. */
  rank?: number;
  label: string;
  sub?: string;
  value: string;
  tone?: "plain" | "up" | "down";
};

type Props = {
  eyebrow: string;
  title: string;
  lines: OgLine[];
  /** Phrase de datation : « Données au 8 octobre 2026 ». */
  dateLine: string;
  /** Texte affiché quand il n'y a aucune ligne. */
  empty?: string;
  /** Numérote les lignes (classements) ; non pour une affiche de match. */
  ranked?: boolean;
};

const TONE = { plain: "#ffffff", up: "#34d399", down: "#fb7185" } as const;

export function statCard({ eyebrow, title, lines, dateLine, empty, ranked = true }: Props) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0f",
        padding: "56px 64px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: "linear-gradient(180deg, #f97316, #fb923c55)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ color: "#fb923c", fontSize: 24, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {eyebrow}
        </span>
        <span style={{ color: "white", fontSize: 60, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          {title}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {lines.length === 0 ? (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 30 }}>{empty ?? ""}</span>
        ) : (
          lines.slice(0, 3).map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                {ranked && (
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 28, width: 30 }}>{line.rank ?? index + 1}</span>
                )}
                <span style={{ color: "white", fontSize: 38, fontWeight: 700 }}>{line.label}</span>
                {line.sub && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 26 }}>{line.sub}</span>}
              </div>
              <span style={{ color: TONE[line.tone ?? "plain"], fontSize: 52, fontWeight: 800 }}>{line.value}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 24 }}>{dateLine}</span>
        <span style={{ color: "white", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>
          hoop<span style={{ color: "#f97316" }}>stats</span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 24, fontWeight: 500, marginLeft: 6 }}>.fr</span>
        </span>
      </div>
    </div>,
    OG_SIZE,
  );
}

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export function ogDate(iso: string | null, prefix = "Données au"): string {
  return iso ? `${prefix} ${DAY.format(new Date(iso))}` : "Date de mise à jour inconnue";
}
