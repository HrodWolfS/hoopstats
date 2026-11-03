import type { NextConfig } from "next";

const SEASON = ":saison(\\d{4}-\\d{2})";

/** Anciens classements individuels (novembre 2026) : la même vue dans l'explorateur joueurs. */
const OLD_LEADERBOARDS: Record<string, string> = {
  points: "pointsPerGame",
  rebonds: "reboundsPerGame",
  passes: "assistsPerGame",
  interceptions: "stealsPerGame",
  "true-shooting": "trueShooting",
  "net-rating": "netRating",
};

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Saisons a fusionné dans Classement, qui montre désormais le classement des
  // conférences ; les classements individuels vivent dans Joueurs.
  async redirects() {
    return [
      { source: "/fr/saisons", destination: "/fr/classements", permanent: true },
      { source: `/fr/saisons/saison/${SEASON}`, destination: "/fr/classements?saison=:saison", permanent: true },
      ...Object.entries(OLD_LEADERBOARDS).map(([slug, stat]) => ({
        source: `/fr/classements/${SEASON}/${slug}`,
        destination: `/fr/joueurs?saison=:saison&stat=${stat}`,
        permanent: true,
      })),
      { source: `/fr/classements/${SEASON}`, destination: "/fr/classements?saison=:saison", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.nba.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
