import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";

export const runtime = "nodejs";
export const revalidate = 21600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;

  const player = await prisma.player.findUnique({
    where: { slug },
    select: {
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      seasons: {
        where: { season: CURRENT_SEASON },
        include: {
          team: {
            select: {
              city: true,
              name: true,
              primaryColor: true,
              secondaryColor: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!player) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "white",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        hoopstats
      </div>,
      { width: 1200, height: 630 },
    );
  }

  const season = player.seasons[0] ?? null;
  const team = season?.team ?? null;
  const primary = team?.primaryColor ?? "#7C3AED";
  const secondary = team?.secondaryColor ?? "#06B6D4";

  const ppg = season ? season.pointsPerGame.toFixed(1) : "—";
  const rpg = season ? season.reboundsPerGame.toFixed(1) : "—";
  const apg = season ? season.assistsPerGame.toFixed(1) : "—";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0a0a0f",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient de fond */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 80% at 100% 50%, ${primary}33 0%, transparent 70%)`,
        }}
      />

      {/* Bande couleur gauche */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: `linear-gradient(180deg, ${primary}, ${secondary})`,
        }}
      />

      {/* Photo joueur */}
      {player.photoUrl && (
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: 0,
            width: 340,
            height: 500,
            display: "flex",
          }}
        >
          { }
          <img
            src={player.photoUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              borderRadius: "16px 16px 0 0",
              opacity: 0.85,
            }}
          />
        </div>
      )}

      {/* Contenu principal */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 60px 60px 72px",
          height: "100%",
          maxWidth: 720,
        }}
      >
        {/* Logo + saison */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            hoopstats
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 18 }}>
            ·
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>
            {CURRENT_SEASON}
          </span>
        </div>

        {/* Nom joueur */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {team && (
            <span
              style={{
                color: primary,
                fontSize: 18,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              {team.city} {team.name}
            </span>
          )}
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 0.9,
              color: "white",
              letterSpacing: "-0.04em",
            }}
          >
            {player.firstName}
            <br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>
              {player.lastName}
            </span>
          </div>
          {player.position && (
            <span
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
                marginTop: 8,
              }}
            >
              {player.position}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 40 }}>
          {[
            { label: "PPG", value: ppg },
            { label: "RPG", value: rpg },
            { label: "APG", value: apg },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: "white",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {value}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
