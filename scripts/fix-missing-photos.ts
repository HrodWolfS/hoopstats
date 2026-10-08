/**
 * Sprint 5 — Fetch photos pour les joueurs actifs encore sans photo
 *
 * Lit directement la DB pour trouver les joueurs actifs sans photoUrl,
 * interroge l'API Wikipedia REST, et met à jour la DB en direct.
 *
 * Run: pnpm tsx scripts/fix-missing-photos.ts
 */

import { prisma } from "@/lib/prisma";
import { titleNamesPlayer } from "@/lib/player-names";

const HEADERS = {
  "User-Agent":
    "hoopstats/1.0 (https://github.com/HrodWolfS/hoopstats; educational NBA stats site)",
};
const SLEEP_MS = 1200;
const NBA_KEYWORDS = ["basketball", "nba", "national basketball association"];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isBasketballPage(data: Record<string, unknown>): boolean {
  const text = (
    ((data.extract as string) ?? "") +
    " " +
    ((data.description as string) ?? "")
  ).toLowerCase();
  return NBA_KEYWORDS.some((kw) => text.includes(kw));
}

async function fetchSummary(
  url: string,
): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (r.ok) return (await r.json()) as Record<string, unknown>;
  } catch {
    // ignore
  }
  return null;
}

async function getWikiPhoto(
  firstName: string,
  lastName: string,
): Promise<{ url: string; attribution: string } | null> {
  const fullName = `${firstName} ${lastName}`;
  const nameEncoded = encodeURIComponent(fullName.replace(/ /g, "_"));

  // ── Stratégie 1 : titre désambiguïsé _(basketball) ──────────────────────
  const data1 = await fetchSummary(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${nameEncoded}_(basketball)`,
  );
  if (data1 && titleNamesPlayer((data1.title as string) ?? "", firstName, lastName)) {
    const img =
      (data1.originalimage as { source?: string }) ??
      (data1.thumbnail as { source?: string });
    if (img?.source) {
      return {
        url: img.source,
        attribution: `Wikipedia (en), ${(data1.title as string) ?? fullName}`,
      };
    }
  }
  await sleep(400);

  // ── Stratégie 2 : titre direct, avec vérification NBA ───────────────────
  for (const lang of ["en", "fr"] as const) {
    const data = await fetchSummary(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${nameEncoded}`,
    );
    // L'API suit les redirections : le titre final doit rester celui du joueur.
    if (
      data &&
      isBasketballPage(data) &&
      titleNamesPlayer((data.title as string) ?? "", firstName, lastName)
    ) {
      const img =
        (data.originalimage as { source?: string }) ??
        (data.thumbnail as { source?: string });
      if (img?.source) {
        return {
          url: img.source,
          attribution: `Wikipedia (${lang}), ${(data.title as string) ?? fullName}`,
        };
      }
    }
    await sleep(300);
  }

  // ── Stratégie 3 : recherche Wikipedia avec contexte NBA ─────────────────
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(firstName + " " + lastName + " NBA basketball")}&format=json&srlimit=3&srprop=snippet`;
    const sr = await fetch(searchUrl, { headers: HEADERS });
    if (sr.ok) {
      const json = (await sr.json()) as {
        query?: { search?: Array<{ title: string }> };
      };
      const results = json.query?.search ?? [];
      for (const result of results) {
        const title = encodeURIComponent(result.title.replace(/ /g, "_"));
        const data = await fetchSummary(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
        );
        if (
          data &&
          isBasketballPage(data) &&
          titleNamesPlayer((data.title as string) ?? "", firstName, lastName)
        ) {
          const img =
            (data.originalimage as { source?: string }) ??
            (data.thumbnail as { source?: string });
          if (img?.source) {
            return {
              url: img.source,
              attribution: `Wikipedia (en), ${(data.title as string) ?? fullName}`,
            };
          }
        }
        await sleep(300);
      }
    }
  } catch {
    // ignore
  }

  return null;
}

async function main() {
  // Charger tous les joueurs actifs sans photo
  const players = await prisma.player.findMany({
    where: {
      photoUrl: null,
      seasons: { some: { season: "2025-26" } },
    },
    select: { id: true, slug: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  console.log(`🏀 ${players.length} joueurs actifs sans photo\n`);

  // Une photo déjà portée par une autre fiche est celle d'un homonyme.
  const usedPhotos = new Set(
    (
      await prisma.player.findMany({
        where: { photoUrl: { not: null } },
        select: { photoUrl: true },
      })
    ).map((p) => p.photoUrl),
  );

  let found = 0;
  let notFound = 0;

  for (const [i, player] of players.entries()) {
    process.stdout.write(
      `  [${i + 1}/${players.length}] ${player.firstName} ${player.lastName}… `,
    );

    const result = await getWikiPhoto(player.firstName, player.lastName);

    if (result && usedPhotos.has(result.url)) {
      console.log(`—  déjà utilisée par une autre fiche (${result.attribution})`);
      notFound++;
    } else if (result) {
      usedPhotos.add(result.url);
      await prisma.player.update({
        where: { id: player.id },
        data: { photoUrl: result.url, photoAttribution: result.attribution },
      });
      console.log(`✓  ${result.attribution}`);
      found++;
    } else {
      console.log(`—`);
      notFound++;
    }

    await sleep(SLEEP_MS);
  }

  console.log(`\n✅ ${found} photos trouvées et importées`);
  console.log(`❌ ${notFound} sans photo disponible`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
