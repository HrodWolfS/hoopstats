/**
 * Contrôle mobile : aucune page clé ne doit déborder horizontalement à 320
 * ni à 390 px, répondre en erreur ou lever une exception JavaScript.
 *
 * Tourne contre un site déjà servi (production par défaut) : la CI n'a pas
 * accès à la base, elle vérifie donc ce que voient réellement les visiteurs.
 *
 *   pnpm check:mobile                         # production
 *   pnpm check:mobile http://localhost:3000   # serveur local
 *
 * Prérequis : `pnpm exec playwright install chromium`.
 */

import { appendFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { currentSeason } from "../lib/nba";

const BASE_URL = (process.argv[2] ?? "https://hoopstats-kappa.vercel.app").replace(/\/$/, "");
const WIDTHS = [320, 390];

const STATIC_PATHS = [
  "/fr",
  "/fr/joueurs",
  "/fr/equipes",
  "/fr/matchs",
  "/fr/classements",
  `/fr/classements/${currentSeason()}/points`,
  `/fr/classements/${currentSeason()}/true-shooting`,
  "/fr/saisons",
  "/fr/playoffs",
  "/fr/comparer",
  "/fr/trophees",
  "/fr/draft",
  "/fr/rookies",
  "/fr/sources",
];

/**
 * Pages de détail prises sur le site lui-même : une fiche joueur, une fiche
 * équipe et un match, pour suivre les données du jour sans liste figée.
 */
const DETAIL_SOURCES = [
  { from: "/fr", prefix: "/fr/joueurs/" },
  { from: "/fr/equipes", prefix: "/fr/equipes/" },
  { from: "/fr/matchs", prefix: "/fr/matchs/" },
];

type Failure = { width: number; path: string; reason: string };

async function firstLink(page: Page, from: string, prefix: string): Promise<string | null> {
  await page.goto(BASE_URL + from, { waitUntil: "domcontentloaded" });
  // Un jour sans match (veille de reprise, All-Star) : on remonte les
  // journées précédentes, une semaine au plus.
  for (let step = 0; step < 8; step++) {
    const link = await page.evaluate(
      (start) =>
        [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
          .map((a) => a.getAttribute("href") ?? "")
          .find((href) => href.startsWith(start) && href.length > start.length) ?? null,
      prefix,
    );
    if (link) return link;
    const previous = await page.locator('a[aria-label^="Journée précédente"]').first().getAttribute("href").catch(() => null);
    if (!previous) return null;
    await page.goto(BASE_URL + previous, { waitUntil: "domcontentloaded" });
  }
  return null;
}

/** Éléments les plus larges qui dépassent l'écran, pour savoir quoi corriger. */
async function overflowCulprits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= width + 1)
      .slice(0, 3)
      .map((el) => {
        const classes = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
        return `<${el.tagName.toLowerCase()}${classes}> ${Math.round(el.getBoundingClientRect().right)}px`;
      });
  });
}

async function main() {
  const browser = await chromium.launch();
  // Les contrôles ne doivent pas compter dans l'audience : refus de mesure
  // (GPC) et, par sécurité, aucun envoi ne quitte le navigateur.
  // En chaîne : tsx ajoute des aides (`__name`) aux fonctions, absentes de la page.
  const context = await browser.newContext();
  await context.addInitScript(
    'Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true });',
  );
  await context.route("**/api/analytics**", (route) => route.fulfill({ status: 204 }));
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  const details = await Promise.all(
    DETAIL_SOURCES.map(async ({ from, prefix }) => {
      const detailPage = await context.newPage();
      const link = await firstLink(detailPage, from, prefix);
      await detailPage.close();
      if (!link) throw new Error(`Aucun lien ${prefix}… trouvé sur ${from}`);
      return link;
    }),
  );
  const paths = [...STATIC_PATHS, ...details];

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const failures: Failure[] = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of paths) {
      errors.length = 0;
      const response = await page.goto(BASE_URL + path, { waitUntil: "load", timeout: 60_000 });
      const status = response?.status() ?? 0;
      if (status >= 400 || status === 0) {
        failures.push({ width, path, reason: `HTTP ${status}` });
        continue;
      }
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (overflow > 0) {
        const culprits = await overflowCulprits(page);
        failures.push({ width, path, reason: `débordement de ${overflow}px : ${culprits.join(", ")}` });
      }
      for (const message of errors) {
        failures.push({ width, path, reason: `erreur JavaScript : ${message.slice(0, 200)}` });
      }
      console.log(`${overflow > 0 || errors.length ? "✗" : "✓"} ${width}px ${path}`);
    }
  }
  await browser.close();

  const checked = paths.length * WIDTHS.length;
  const summary = failures.length
    ? [
        `### Contrôle mobile : ${failures.length} problème(s) sur ${checked} pages vérifiées`,
        "",
        "| Largeur | Page | Problème |",
        "|---|---|---|",
        ...failures.map((f) => `| ${f.width}px | \`${f.path}\` | ${f.reason.replace(/\|/g, "\\|")} |`),
      ].join("\n")
    : `### Contrôle mobile : ${checked} pages vérifiées, aucun débordement (${WIDTHS.join(" et ")} px)`;

  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
