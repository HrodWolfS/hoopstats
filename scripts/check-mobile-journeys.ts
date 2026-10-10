/**
 * Parcours mobiles : les tâches principales, faites au doigt sur un écran de
 * 390 px, de bout en bout. Complète `check-mobile-layout.ts`, qui ne fait que
 * charger des pages : ici on tape, on choisit, on change de saison.
 *
 * Chaque étape échoue aussi sur un débordement horizontal ou une erreur
 * JavaScript. Lecture seule : aucun formulaire n'est envoyé.
 *
 *   pnpm check:journeys                         # production
 *   pnpm check:journeys http://localhost:3000   # serveur local
 *
 * Prérequis : `pnpm exec playwright install chromium`.
 */

import { appendFileSync } from "node:fs";
import { chromium, devices, type Page } from "playwright";

const BASE_URL = (process.argv[2] ?? "https://hoopstats-kappa.vercel.app").replace(/\/$/, "");
const TIMEOUT = 30_000;

type Journey = { name: string; run: (page: Page) => Promise<void> };

function fail(message: string): never {
  throw new Error(message);
}

async function open(page: Page, path: string) {
  const response = await page.goto(BASE_URL + path, { waitUntil: "load", timeout: 60_000 });
  const status = response?.status() ?? 0;
  if (status === 0 || status >= 400) fail(`${path} : HTTP ${status}`);
}

/** Attend la navigation client vers une adresse qui vérifie `test`. */
async function waitForPath(page: Page, test: (url: URL) => boolean, what: string) {
  await page
    .waitForURL((url) => test(url), { timeout: TIMEOUT })
    .catch(() => fail(`${what} : on est resté sur ${new URL(page.url()).pathname}${new URL(page.url()).search}`));
}

async function assertNoOverflow(page: Page, step: string) {
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 0) fail(`${step} : débordement horizontal de ${overflow}px`);
}

const JOURNEYS: Journey[] = [
  {
    name: "Rechercher un joueur et ouvrir sa fiche",
    async run(page) {
      await open(page, "/fr");
      await page.getByRole("button", { name: "Rechercher un joueur ou une équipe" }).tap();
      const input = page.getByRole("combobox", { name: /Joueur, équipe/ });
      await input.fill("wembanyama");
      const option = page.getByRole("option", { name: /Wembanyama/ }).first();
      await option.waitFor({ timeout: TIMEOUT }).catch(() => fail("aucun résultat pour « wembanyama »"));
      await assertNoOverflow(page, "résultats de recherche");
      await option.tap();
      await waitForPath(page, (url) => url.pathname === "/fr/joueurs/victor-wembanyama", "fiche joueur");
      await page.getByRole("heading", { level: 1, name: /Wembanyama/ }).waitFor({ timeout: TIMEOUT });
      await assertNoOverflow(page, "fiche joueur");
    },
  },
  {
    name: "Changer de saison depuis la barre",
    async run(page) {
      await open(page, "/fr/equipes");
      await page.getByRole("button", { name: "Saison précédente" }).tap();
      await waitForPath(page, (url) => url.searchParams.has("saison"), "saison précédente");
      await assertNoOverflow(page, "saison précédente");
      // Le sélecteur doit avoir reçu la nouvelle saison avant le second appui.
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Saison suivante" }).tap();
      await waitForPath(page, (url) => !url.searchParams.has("saison"), "retour à la saison en cours");
    },
  },
  {
    name: "Comparer deux joueurs",
    async run(page) {
      await open(page, "/fr/comparer");
      const pickers = page.getByPlaceholder("Chercher un joueur…");
      for (const [index, query, slug] of [
        [0, "jokic", "nikola-jokic"],
        [1, "wembanyama", "victor-wembanyama"],
      ] as const) {
        // Le premier choix remplace son champ : le champ libre restant est toujours le premier.
        await pickers.first().fill(query);
        const hit = page.getByRole("button", { name: new RegExp(query, "i") }).first();
        await hit.waitFor({ timeout: TIMEOUT }).catch(() => fail(`comparateur : aucun résultat pour « ${query} »`));
        await hit.tap();
        await waitForPath(page, (url) => url.searchParams.get(`j${index + 1}`) === slug, `joueur ${index + 1} du comparateur`);
      }
      await page.getByRole("table").first().waitFor({ timeout: TIMEOUT }).catch(() => fail("comparateur : aucun tableau"));
      await assertNoOverflow(page, "comparaison");
    },
  },
  {
    name: "Ouvrir un classement",
    async run(page) {
      await open(page, "/fr/classements");
      const link = page.locator('a[href^="/fr/classements/"]').first();
      await link.waitFor({ timeout: TIMEOUT }).catch(() => fail("aucun lien de classement"));
      await link.tap();
      await waitForPath(page, (url) => /^\/fr\/classements\/[^/]+\/[^/]+$/.test(url.pathname), "page de classement");
      const rows = await page.getByRole("row").count();
      if (rows < 2) fail("classement vide");
      await assertNoOverflow(page, "page de classement");
    },
  },
  {
    name: "Ouvrir le box score d'un match",
    async run(page) {
      await open(page, "/fr/matchs");
      // Seul un match terminé (« Final ») a un box score. Les cartes n'ont pas
      // de nom accessible : on cherche l'adresse dans la page, hors pages
      // « jour » et « équipe ». Hors saison, le lien « Mois précédent » mène au
      // dernier jour de matchs.
      let href: string | undefined;
      for (let step = 0; step < 4 && !href; step++) {
        if (step > 0) {
          // Lien du calendrier, replié sur mobile : on suit son adresse.
          const previous = await page.locator('a[aria-label="Mois précédent"]').first().getAttribute("href");
          if (!previous) break;
          await open(page, previous);
        }
        href = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/fr/matchs/"]')]
            // Textes collés (« 100Final ») ; « Finale(s) » est une phase, pas un état.
            .filter((a) => /Final(?!e)/.test(a.textContent ?? ""))
            .map((a) => a.getAttribute("href") ?? "")
            .find((h) => /^\/fr\/matchs\/[^/]+$/.test(h) && !/\/(jour|equipe)\//.test(h)),
        );
      }
      if (!href) fail("aucun match terminé trouvé");
      await page.locator(`a[href="${href}"]`).first().tap();
      await waitForPath(page, (url) => /^\/fr\/matchs\/[^/]+$/.test(url.pathname), "page de match");
      await page.getByRole("table").first().waitFor({ timeout: TIMEOUT }).catch(() => fail("box score absent"));
      await assertNoOverflow(page, "page de match");
    },
  },
];

async function main() {
  const browser = await chromium.launch();
  const failures: { name: string; reason: string }[] = [];

  for (const journey of JOURNEYS) {
    // Contexte neuf à chaque parcours : pas d'historique ni de stockage partagé.
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
    });
    // Les parcours ne doivent pas compter dans l'audience : refus de mesure
    // (GPC) et, par sécurité, aucun envoi ne quitte le navigateur.
    // En chaîne : tsx ajoute des aides (`__name`) aux fonctions, absentes de la page.
    await context.addInitScript(
      'Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true });',
    );
    await context.route("**/api/analytics**", (route) => route.fulfill({ status: 204 }));
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await journey.run(page);
      if (errors.length) fail(`erreur JavaScript : ${errors[0].slice(0, 200)}`);
      console.log(`✓ ${journey.name}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
      failures.push({ name: journey.name, reason });
      console.log(`✗ ${journey.name} — ${reason}`);
    }
    await context.close();
  }
  await browser.close();

  const summary = failures.length
    ? [
        `### Parcours mobiles : ${failures.length} échec(s) sur ${JOURNEYS.length}`,
        "",
        "| Parcours | Problème |",
        "|---|---|",
        ...failures.map((f) => `| ${f.name} | ${f.reason.replace(/\|/g, "\\|")} |`),
      ].join("\n")
    : `### Parcours mobiles : ${JOURNEYS.length} parcours réussis à 390 px`;

  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
