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

  const team = await prisma.team.findUnique({
    where: { slug },
    select: {
      city: true,
      name: true,
      abbr: true,
      conference: true,
      primaryColor: true,
      secondaryColor: true,
      logoUrl: true,
      seasons: {
        where: { season: CURRENT_SEASON },
        take: 1,
      },
    },
  });

  if (!team) {
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

  const season = team.seasons[0] ?? null;
  const primary = team.primaryColor;
  const secondary = team.secondaryColor;
  const confFr = team.conference === "East" ? "Est" : "Ouest";

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
      {/* Gradient radial */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 90% 90% at 50% 110%, ${primary}55 0%, transparent 65%)`,
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

      {/* Logo équipe (grand, à droite, semi-transparent) */}
      {team.logoUrl && (
        <div
          style={{
            position: "absolute",
            right: 60,
            top: "50%",
            transform: "translateY(-50%)",
            width: 320,
            height: 320,
            display: "flex",
            opacity: 0.12,
          }}
        >
          { }
          <img
            src={team.logoUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
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
          width: "100%",
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

        {/* Nom équipe */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              color: primary,
              fontSize: 18,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Conférence {confFr}
          </span>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.9,
              color: "white",
              letterSpacing: "-0.04em",
            }}
          >
            {team.city}
            <br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>{team.name}</span>
          </div>
        </div>

        {/* Stats saison */}
        <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
          {season ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 700,
                    color: "white",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {season.wins}–{season.losses}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                  }}
                >
                  Bilan
                </span>
              </div>
              {season.conferenceRank && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span
                    style={{
                      fontSize: 64,
                      fontWeight: 700,
                      color: "white",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {season.conferenceRank}
                    <span
                      style={{
                        fontSize: 32,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      e
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    Conférence {confFr}
                  </span>
                </div>
              )}
            </>
          ) : (
            <span
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              {team.abbr}
            </span>
          )}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
