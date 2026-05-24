# Plan d'action — hoopstats

> 8 semaines, 8 sprints. Ship un truc utilisable chaque semaine.

**Cible** : MVP en ligne fin de semaine 8.  
**Engagement temps** : ~10-15h/semaine (compatible marathon + apps mobile arbitrage).  
**Méthode** : ship-fast, perfection plus tard. Chaque sprint = un livrable visible.

---

## Sprint 0 — Préparation (3-4h, avant de coder)

**Objectif** : tout être prêt pour foncer en sprint 1 sans décision bloquante.

### Actions

- [ ] **Nom & domaine** : vérifier `hoopstats.com`, `hoopstats.fr`, `hoopstats.app` sur Namecheap/Gandi → acheter le meilleur dispo (~12€/an)
- [ ] **Vérification INPI** : recherche rapide marque "hoopstats" sur [data.inpi.fr](https://data.inpi.fr) — 5 min
- [ ] **Comptes services** :
  - [ ] Vercel (déjà ?)
  - [ ] Supabase (créer projet "hoopstats")
  - [ ] PostHog (free tier)
  - [ ] Sentry (free tier)
  - [ ] Anthropic API (générer clé dédiée hoopstats)
  - [ ] balldontlie.io (lire docs, tester endpoint)
- [ ] **Repo GitHub** : créer `hoopstats` privé, ajouter README pointant vers PRD
- [ ] **Notion/Obsidian** : créer page projet hoopstats avec liens vers PRD + plan + Linear (optionnel)

### Livrable

Repo vide cloné en local + tous les comptes prêts.

---

## Sprint 1 — Foundation (semaine 1)

**Objectif** : appli Next.js qui tourne en local avec la sidebar + topbar de la maquette, branchée à Supabase vide.

### Tâches

#### 1.1 Setup projet (2h)
```bash
npx create-next-app@latest hoopstats --typescript --tailwind --app --no-src-dir
cd hoopstats
pnpm add @prisma/client next-intl @anthropic-ai/sdk framer-motion
pnpm add -D prisma tsx
```

- [ ] Init Prisma : `pnpm dlx prisma init`
- [ ] Variables d'environnement (`.env.local`) : DATABASE_URL Supabase, ANTHROPIC_API_KEY, BALLDONTLIE_KEY (si compte payant)
- [ ] Push schema complet (copié du PRD §6.3) : `pnpm dlx prisma db push`
- [ ] Setup ESLint + Prettier avec config minimale

#### 1.2 Configuration design (2h)
- [ ] Importer Google Fonts (Inter, Space Grotesk, JetBrains Mono) dans `app/layout.tsx`
- [ ] Configurer Tailwind avec les couleurs custom du PRD §5.1
- [ ] Créer `globals.css` avec les variables CSS de la maquette (sélection, scrollbar, animations)
- [ ] Tester rendu de base : background `#0A0A0B`, texte blanc

#### 1.3 Layout shell (3h)
- [ ] Composant `Sidebar` (220px, fixe) — copie directe de la maquette
- [ ] Composant `TopBar` (sticky, backdrop blur) — copie directe
- [ ] Composant `Footer` minimal avec mentions légales
- [ ] Layout root avec sidebar fixe + main content
- [ ] Setup i18n basique : `app/[locale]/layout.tsx` + middleware redirect `/` → `/fr`

#### 1.4 Stubs des pages (1h)
- [ ] `app/[locale]/page.tsx` : "Home — TODO"
- [ ] `app/[locale]/equipes/[slug]/page.tsx` : "Team — TODO"
- [ ] `app/[locale]/joueurs/[slug]/page.tsx` : "Player — TODO"
- [ ] Tester navigation manuelle entre les URLs

### Livrable sprint 1

App qui tourne en `pnpm dev`, sidebar visible, TopBar visible, navigation manuelle entre pages stub. Aucune data réelle.

### Definition of Done

- `pnpm build` passe sans erreur
- Lighthouse > 90 sur la home stub
- DB Supabase visible dans dashboard avec tables vides

---

## Sprint 2 — Data pipeline (semaine 2)

**Objectif** : la DB est remplie avec les 30 équipes + 10 saisons de stats joueurs.

### Tâches

#### 2.1 Import équipes (one-shot, 2h)
- [ ] Créer `scripts/seed-teams.ts` avec les 30 équipes (copier les data depuis `data.jsx` de la maquette : abbr, city, name, colors, conf, div)
- [ ] Ajouter slug FR généré (`los-angeles-lakers`)
- [ ] Run : `pnpm tsx scripts/seed-teams.ts`
- [ ] Vérifier dans Supabase : 30 lignes en table Team

#### 2.2 Import stats balldontlie (4h)
- [ ] Lire docs balldontlie.io (endpoints `/players`, `/season_averages`, `/teams`)
- [ ] Créer `scripts/import-balldontlie.ts`
- [ ] Boucle sur saisons 2016-2026 : pull players + season averages
- [ ] Upsert Player + PlayerSeason
- [ ] Gestion rate limit (60 req/min sur free) : `await sleep(1100)` entre requêtes
- [ ] Run script, attendre 1-2h, vérifier ~600 players + ~6000 PlayerSeason en DB

#### 2.3 Enrichissement stats avancées (3h)
- [ ] Installer Python 3 + `pip install nba_api` (script séparé)
- [ ] `scripts/enrich-advanced.py` : pull PER, TS%, USG%, BPM, VORP, WS depuis nba_api
- [ ] Output JSON intermédiaire
- [ ] `scripts/import-advanced.ts` : lit JSON, update PlayerSeason
- [ ] Run

#### 2.4 Import bilans équipes par saison (2h)
- [ ] balldontlie : `/standings?season=X`
- [ ] Upsert TeamSeason : wins, losses, conferenceRank, playoffResult

### Livrable sprint 2

DB Supabase remplie : 30 équipes × 10 saisons (300 TeamSeason), ~600 joueurs × moyenne 4 saisons (~2400 PlayerSeason).

### Definition of Done

- Query test : `SELECT COUNT(*) FROM PlayerSeason WHERE season='2024-25'` retourne ~500
- Aucune ligne avec stats à NULL pour la saison en cours
- Log d'import sauvegardé en table SyncLog

---

## Sprint 3 — Page équipes (semaine 3)

**Objectif** : pages équipes 100% fonctionnelles, navigables depuis la home (placeholder).

### Tâches

#### 3.1 Composants de base (3h)
- [ ] `components/ui/TeamMono.tsx` — copie maquette
- [ ] `components/ui/PlayerAvatar.tsx` — copie maquette (avec fallback)
- [ ] `components/ui/KPI.tsx` — copie maquette
- [ ] `components/ui/Sparkline.tsx` — copie maquette
- [ ] `components/ui/LineChart.tsx` — copie maquette
- [ ] Storybook minimal en `/dev/components` pour tester visuellement

#### 3.2 Page équipe (5h)
- [ ] `app/[locale]/equipes/[slug]/page.tsx`
- [ ] `generateStaticParams` : génère les 30 slugs au build
- [ ] Fetch data : team + currentTeamSeason + roster (PlayerSeason actuelle) + last10TeamSeasons
- [ ] Composant `TeamHeader` (TeamMono hero + meta équipe)
- [ ] Composant `Tabs` (3 onglets)
- [ ] `RosterView` : grille de `RosterCard`
- [ ] `SeasonView` : 4 KPI + chart victoires par mois + indicateurs barres
- [ ] `HistoryView` : chart 10 saisons + tableau avec sparklines

#### 3.3 Route page liste équipes (1h)
- [ ] `app/[locale]/equipes/page.tsx` : grid 30 équipes (extrait depuis composant home)

#### 3.4 SEO de base (1h)
- [ ] `generateMetadata` par page équipe : title, description, OG image (static pour l'instant)
- [ ] Schema.org `SportsTeam`

### Livrable sprint 3

30 pages équipes navigables, chacune affichant son roster actuel et son historique 10 saisons avec data réelle.

### Definition of Done

- `/equipes/los-angeles-lakers` charge en < 1s
- Tous les 3 onglets fonctionnent
- Tableau historique avec sparklines visible
- `pnpm build` génère bien 30 routes statiques

---

## Sprint 4 — Page joueurs (semaine 4)

**Objectif** : pages joueurs 100% fonctionnelles avec stats career + chart.

### Tâches

#### 4.1 Composants spécifiques joueur (2h)
- [ ] `MultiLineChart` — copie maquette
- [ ] `Radar` — copie maquette
- [ ] `Crumbs` — copie maquette

#### 4.2 Page joueur (5h)
- [ ] `app/[locale]/joueurs/[slug]/page.tsx`
- [ ] `generateStaticParams` : génère ~600 slugs joueurs
- [ ] Fetch data : player + toutes ses PlayerSeason + équipe actuelle
- [ ] Header joueur (avatar hero, meta, bio si déjà en DB sinon placeholder)
- [ ] KPI grid 6 métriques saison actuelle
- [ ] Chart switcher (Évolution / Radar saison)
- [ ] Tableau career avec sparklines
- [ ] Section "Comparer avec" (4 suggestions hardcoded pour V1 par position similaire)

#### 4.3 Slugs & redirections (2h)
- [ ] Génération propre des slugs FR (gestion accents : Jokić → jokic)
- [ ] Redirection si slug obsolète (table de mapping si besoin)
- [ ] 404 si player inexistant

#### 4.4 SEO + metadata (2h)
- [ ] `generateMetadata` par joueur
- [ ] Schema.org `Person` + `Athlete`
- [ ] Open Graph image dynamique via `app/api/og/player/[slug]/route.tsx` avec satori/next-og

### Livrable sprint 4

~600 pages joueurs navigables, avec stats career complètes et data-viz.

### Definition of Done

- `/joueurs/nikola-jokic` charge avec tous les composants
- Build génère ~600 routes en < 5 minutes
- OG images visibles (test sur https://www.opengraph.xyz)

---

## Sprint 5 — Photos & paragraphes éditoriaux (semaine 5)

**Objectif** : les pages joueurs ont des vraies photos (quand dispo) et des paragraphes français.

### Tâches

#### 5.1 Wikimedia Commons pipeline (4h)
- [ ] Script `scripts/import-photos.ts`
- [ ] Pour chaque joueur sans photoUrl :
  - Query Wikimedia API : `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=...`
  - Filter résultats par licence (CC-BY, CC-BY-SA, CC0)
  - Download premier match valide
  - Resize avec Sharp (400×400 max, WebP)
  - Upload Supabase Storage
  - Sauvegarder URL + attribution
- [ ] Gérer rate limit Wikimedia (200 req/sec mais soyons polis : 1/sec)
- [ ] Run script complet (~1h pour 600 joueurs)
- [ ] Stats attendues : 50-70% des joueurs avec photo

#### 5.2 Composant PlayerPhoto avec fallback (1h)
- [ ] Si photoUrl existe : `<Image>` Next.js optimisé
- [ ] Sinon : fallback PlayerAvatar stylisé
- [ ] Mention "Photo via Wikimedia Commons — [Nom photographe]" en petit sous l'image

#### 5.3 Génération paragraphes Claude (3h)
- [ ] `scripts/generate-summaries.ts`
- [ ] Pour chaque joueur actif :
  - Formater stats career en prompt
  - Call Anthropic Haiku 4.5 avec system prompt journalistique FR
  - Sauvegarder en Player.summaryFr
- [ ] Batch API si possible (-50% coût)
- [ ] Run pour les 600 joueurs (~10 min, ~6€)
- [ ] Identique pour TeamSeason (30 × 10 = 300 paragraphes)

#### 5.4 Affichage paragraphes (1h)
- [ ] Page joueur : afficher summaryFr sous le header
- [ ] Page équipe (onglet Saison) : afficher TeamSeason.summaryFr

### Livrable sprint 5

Pages joueurs/équipes "complètes" : photos quand dispo, paragraphes éditoriaux français partout.

### Definition of Done

- Audit visuel : 60%+ des joueurs top 100 ont une photo
- Tous les joueurs actifs ont un summaryFr
- Coût Anthropic confirmé < 10€

---

## Sprint 6 — Home page + recherche (semaine 6)

**Objectif** : la page d'accueil bluffante + Command Palette ⌘K fonctionnelle.

### Tâches

#### 6.1 Page home complète (3h)
- [ ] `app/[locale]/page.tsx` : Hero + grille 30 équipes + section "Hot players" + rails footer
- [ ] Sélection "Hot players" : top 5 par PPG sur les 5 derniers matchs (ou approximation via saison en cours)
- [ ] Composant `TeamCard` (vue grille) — copie maquette
- [ ] Composant `HotPlayerCard` — copie maquette
- [ ] Composant `RailCard` — copie maquette

#### 6.2 Command Palette ⌘K (4h)
- [ ] Composant `CommandPalette.tsx`
- [ ] Hook global pour ⌘K / Ctrl+K
- [ ] Recherche temps réel sur Team.city, Team.name, Player.firstName + lastName
- [ ] Postgres Full-Text Search ou ILIKE simple pour V1
- [ ] Navigation clavier ↑↓ + Enter
- [ ] Modal avec backdrop blur + animations Framer Motion

#### 6.3 Sélecteur de saison (2h)
- [ ] Dropdown TopBar : 2024-25 → 2016-17
- [ ] Context React pour saison globale
- [ ] Page joueur : refresher les stats affichées selon saison sélectionnée
- [ ] Page équipe : idem

### Livrable sprint 6

Site complètement navigable depuis la home, ⌘K fonctionnelle, sélecteur de saison.

### Definition of Done

- Lighthouse Home > 95
- ⌘K trouve "lakers", "jokic", "lebron" en < 100ms
- Sélecteur de saison fonctionne sur page joueur

---

## Sprint 7 — Polish + SEO + déploiement (semaine 7)

**Objectif** : site déployé en production, indexable, suivi par analytics.

### Tâches

#### 7.1 Animations & micro-interactions (3h)
- [ ] Framer Motion : transitions de page subtiles (fade + translate)
- [ ] Hover states sur cards (élévation, glow couleur équipe)
- [ ] Skeleton loaders pour les rares cas client-side

#### 7.2 SEO complet (3h)
- [ ] `app/sitemap.ts` : génération automatique de toutes les URLs
- [ ] `app/robots.ts`
- [ ] Schema.org sur toutes les pages
- [ ] Open Graph images dynamiques validées sur Twitter Card Validator
- [ ] Soumettre à Google Search Console

#### 7.3 Footer & mentions légales (1h)
- [ ] Page `/mentions-legales`
- [ ] Page `/politique-confidentialite` (RGPD, PostHog opt-in)
- [ ] Cookie banner minimal (PostHog respect DNT)
- [ ] Footer global avec mention propriété logos NBA

#### 7.4 404 + error pages (1h)
- [ ] `app/[locale]/not-found.tsx` stylé
- [ ] `app/[locale]/error.tsx` avec Sentry capture

#### 7.5 Déploiement Vercel (2h)
- [ ] Push sur GitHub
- [ ] Connecter Vercel
- [ ] Variables d'environnement en prod
- [ ] Configurer domaine custom (DNS)
- [ ] Test prod complet
- [ ] Sentry config production
- [ ] PostHog tracking activé

### Livrable sprint 7

Site en ligne sur le domaine final, indexable, analytics actifs.

### Definition of Done

- DNS propagé, certificat SSL OK
- Sitemap soumis à GSC
- Aucune erreur Sentry en 24h
- PostHog reçoit des events

---

## Sprint 8 — Buffer + launch (semaine 8)

**Objectif** : corriger ce qui foire + faire un launch propre.

### Tâches

#### 8.1 Buffer pour les imprévus (4h)
- [ ] Tu vas avoir 4h de "merde y'a un truc qui marche pas" : c'est normal, c'est prévu
- [ ] Fix bugs prioritaires détectés en prod

#### 8.2 Pipeline n8n daily sync (4h)
- [ ] Workflow n8n qui pull balldontlie chaque nuit à 3h
- [ ] Trigger `/api/revalidate` après sync
- [ ] Notification Discord/email si sync échoue
- [ ] Tester sur 3 nuits avant launch

#### 8.3 Launch content (3h)
- [ ] Thread Twitter NBA FR avec screenshots
- [ ] Post Reddit r/nba_FR (vérifier règles avant)
- [ ] Post BasketSession forum si pertinent
- [ ] Article LinkedIn court (ton réseau dev)
- [ ] Demander feedback à 5 amis fans NBA

#### 8.4 Documentation post-launch (2h)
- [ ] README repo à jour
- [ ] CONTEXT.md pour Claude Code (workflow que tu connais)
- [ ] Liste backlog V1.1 documentée

### Livrable sprint 8

**hoopstats est en ligne, indexable, suivi, et lancé publiquement.**

### Definition of Done

- 100+ visiteurs uniques le jour du launch
- Aucune erreur critique en 48h
- 1 retour utilisateur exploité (bug fix ou feature add)

---

## Sprint 9 — Résultats & matchs à venir (post-launch)

**Objectif** : afficher les résultats des matchs récents et le programme sur 2 jours, sur la home et les pages équipes.

> **Contexte** : ESPN public API (`site.api.espn.com/apis/v2/sports/basketball/nba/scoreboard`) fonctionne depuis GitHub Actions (pas de clé, pas de bloc IP). Les stats avancées de match (`stats.nba.com`) sont bloquées depuis CI — on utilise uniquement ESPN pour les scores/résultats.

### Nouveaux éléments de schéma

```prisma
model Game {
  id          String   @id              // ESPN game ID
  homeTeamId  String
  awayTeamId  String
  gameDate    DateTime
  season      String
  homeScore   Int?
  awayScore   Int?
  status      String                    // "scheduled" | "in_progress" | "final"
  espnId      String   @unique

  homeTeam    Team     @relation("HomeGames", fields: [homeTeamId], references: [id])
  awayTeam    Team     @relation("AwayGames", fields: [awayTeamId], references: [id])
}
```

### Tâches

#### 9.1 Schema & migration (1h)
- [ ] Ajouter modèle `Game` à `prisma/schema.prisma`
- [ ] `pnpm prisma migrate dev --name add-game`
- [ ] Ajouter les deux relations inverses sur le modèle `Team` (`homeGames`, `awayGames`)

#### 9.2 Sync matchs dans `sync-daily.ts` (3h)
- [ ] Nouvelle fonction `syncRecentGames()` — fetch ESPN scoreboard J-2 à J+2 :
  ```
  GET https://site.api.espn.com/apis/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD
  ```
- [ ] Parser : `event.id`, `competitions[0].competitors` (home/away, score, status)
- [ ] Upsert `Game` : si `status=final` → écrire scores ; si `scheduled` → créer sans scores
- [ ] Appeler dans `main()` entre `syncStandings()` et `regenerateSummaries()`

#### 9.3 Composant `RecentGames` (3h)
- [ ] `components/team/recent-games.tsx` — liste verticale des 5 derniers matchs de l'équipe
- [ ] Chaque ligne : date · logo adversaire · score (gras si victoire, atténué si défaite)
- [ ] Badge W/L coloré avec la couleur primaire de l'équipe pour W

#### 9.4 Composant `UpcomingGames` (2h)
- [ ] `components/team/upcoming-games.tsx` — 2 prochains matchs max
- [ ] Chaque ligne : date · "vs" ou "@" · logo adversaire · heure indicative (pas de timezone complex)

#### 9.5 Intégration page équipe (2h)
- [ ] Nouvel onglet "Matchs" dans `team-tabs.tsx` (4e onglet, après "Historique")
- [ ] Affiche `RecentGames` + `UpcomingGames` côte à côte
- [ ] Requête dans `app/[locale]/equipes/[slug]/page.tsx` — 5 derniers + 2 prochains

#### 9.6 Section home page (2h)
- [ ] Section "Matchs d'hier" sur la home : résultats du jour précédent, 3 matchs max en horizontal
- [ ] Composant `GameCard` compact : logos des deux équipes + score final
- [ ] Requête dans `app/[locale]/page.tsx`

### Livrable sprint 9

Pages équipes avec onglet "Matchs" (résultats récents + programme J+2). Home avec résultats d'hier.

### Definition of Done

- Sync quotidien peuple la table `Game` sans erreur
- Onglet "Matchs" visible sur les 30 pages équipes
- Les scores passés sont corrects (vérification manuelle sur 3 matchs)

---

## Sprint 10 — Rookies & Retraités

**Objectif** : deux nouvelles pages de découverte — les rookies de la saison en cours, et les joueurs qui ont disputé leur dernière saison.

> **Contexte** : on définit "rookie" par `Player.draftYear` = année de début de `CURRENT_SEASON`. On définit "retraité" (ou absent cette saison) par : présent dans `PlayerSeason 2024-25` mais absent dans `PlayerSeason 2025-26`. Pas de flag en DB, tout est calculé à la volée (ou via un script one-shot pour ajouter un champ `Player.active`).

### Tâches

#### 10.1 Page Rookies (3h)
- [ ] `app/[locale]/rookies/page.tsx`
- [ ] Requête : `PlayerSeason` saison actuelle `JOIN Player WHERE draftYear = currentYear`
- [ ] Tri par défaut : PPG desc
- [ ] Vue grille identique à la page joueurs (composant `PlayerCard` réutilisé)
- [ ] Sélecteur de saison pour voir les rookies des années précédentes
- [ ] `generateMetadata` + Schema.org minimal
- [ ] Ajout dans la sidebar (section "Explorer")

#### 10.2 Page Retraités / Absents (3h)
- [ ] `app/[locale]/retraites/page.tsx`
- [ ] Requête :
  ```typescript
  const lastSeason = prisma.playerSeason.findMany({ where: { season: PREV_SEASON }, select: { playerId: true } });
  const thisSeason = prisma.playerSeason.findMany({ where: { season: CURRENT_SEASON }, select: { playerId: true } });
  // diff = lastSeason.ids − thisSeason.ids
  ```
- [ ] Affichage : liste de joueurs avec leur dernière saison, stats de l'année de départ
- [ ] Titre prudent : "Absents cette saison" (pas "retraités" — peuvent être blessés ou FA)
- [ ] Filtre optionnel par position
- [ ] Ajout dans la sidebar

#### 10.3 `PREV_SEASON` constant (30 min)
- [ ] Ajouter `export const PREV_SEASON = "2024-25"` dans `lib/nba.ts` (à côté de `CURRENT_SEASON`)
- [ ] Utiliser dans les requêtes ci-dessus

#### 10.4 Champ `Player.draftYear` (1h)
- [ ] Vérifier que le champ existe en DB (devrait être là depuis l'import BallDontLie)
- [ ] Si manquant : script one-shot `scripts/backfill-draft-years.ts` depuis l'API BDL `/players`
- [ ] Ajouter index DB sur `Player.draftYear`

### Livrable sprint 10

Deux nouvelles pages : `/rookies` (classe actuelle + années précédentes) et `/retraites` (absents cette saison vs précédente).

### Definition of Done

- Les pages chargent sans erreur avec vraie data
- Les liens apparaissent dans la sidebar
- `pnpm build` génère les routes statiques correctement

---

## Sprint 11 — Historique complet des franchises

**Objectif** : enrichir `TeamSeason` avec l'historique complet depuis la création de chaque franchise (au lieu des 10 dernières saisons).

> **Contexte** : les Lakers existent depuis 1948. Le backfill complet représente ~1500 saisons-équipes. ESPN API supporte les saisons historiques (ex: `season=1980`). L'onglet "Historique" de la page équipe affiche déjà 10 saisons — il suffira d'enlever le filtre ou d'ajouter un toggle.

### Tâches

#### 11.1 Script `scripts/backfill-team-history.ts` (4h)
- [ ] Définir les années de fondation par franchise (table statique dans le script)
  ```typescript
  const FRANCHISE_FOUNDED: Record<string, number> = {
    "lakers": 1948, "celtics": 1946, "warriors": 1946, ...
  };
  ```
- [ ] Pour chaque équipe, boucle de `foundedYear` à `CURRENT_SEASON_YEAR - 1`
- [ ] ESPN standings par saison : `?season=YYYY` (YYYY = année de fin de saison)
- [ ] Upsert `TeamSeason` : wins, losses, conferenceRank, playoffResult si dispo
- [ ] Rate limit : 500ms entre requêtes (API publique, soyons polis)
- [ ] Log progress + SyncLog.create en fin
- [ ] Durée estimée : ~45 min pour l'intégralité

#### 11.2 Données playoff (`playoffResult`) (3h)
- [ ] ESPN ne fournit pas toujours le résultat playoff dans les standings historiques
- [ ] Script complémentaire `scripts/backfill-playoff-results.ts` depuis une source alternative :
  - Option A : Wikipedia table des champions NBA (HTML scraping léger)
  - Option B : fichier JSON statique codé à la main pour les champions + finalistes
- [ ] Codes existants déjà dans `sync-daily.ts` : W, E, A, SE, C, NW, SW, P, X, PI

#### 11.3 Mise à jour `HistoryView` (2h)
- [ ] Toggle "10 saisons / Tout l'historique" dans `components/team/history-view.tsx`
- [ ] Par défaut : 10 dernières saisons (comportement actuel)
- [ ] Mode "complet" : toutes les saisons triées par année desc
- [ ] Chart recharts adapté pour afficher >10 points sans que ça soit illisible (viewport scroll ou responsive)

#### 11.4 Stat "Titres NBA" dans le header équipe (1h)
- [ ] Compter `TeamSeason WHERE playoffResult = 'W'`
- [ ] Afficher dans le header si > 0 : "🏆 17 titres" (ex: Lakers)

### Livrable sprint 11

Historique complet pour les 30 franchises depuis leur création. Toggle 10 saisons / tout l'historique sur la page équipe.

### Definition of Done

- Les Celtics affichent leurs 18 titres dans le header
- L'historique complet des Lakers (~75 saisons) s'affiche sans erreur
- Script documenté pour re-run si besoin

---

## Sprint 12 — Meilleur 5 par génération

**Objectif** : page éditoriale "Meilleur 5 de chaque génération" — contenu distinctif difficile à trouver ailleurs, bon pour le SEO long tail.

> **Contexte** : on définit 5 générations NBA (à ajuster selon les données dispo) :
> - **Pionniers** : 1946–1969
> - **Ère Showtime** : 1970–1989
> - **Ère Jordan** : 1990–1999
> - **Kobe/Shaq/Duncan** : 2000–2009
> - **Ère moderne** : 2010–aujourd'hui
>
> Critères de sélection : automatisables via stats DB (WS cumulés, PPG de carrière, MVPs).

### Tâches

#### 12.1 Modèle `GenerationFive` (1h)
```prisma
model GenerationFive {
  id          String   @id @default(cuid())
  generation  String   // "pioneers" | "showtime" | "jordan" | "kobe-shaq" | "modern"
  position    String   // "PG" | "SG" | "SF" | "PF" | "C"
  playerId    String
  rationale   String?  // pourquoi ce choix (texte FR)
  player      Player   @relation(...)
}
```

#### 12.2 Script de sélection automatique (3h)
- [ ] `scripts/generate-best-fives.ts`
- [ ] Pour chaque génération, filtrer `PlayerSeason` par années concernées
- [ ] Agréger : PPG moyen, total WS, total MVPs (si champ dispo)
- [ ] Sélectionner le meilleur par position (meilleur score composite)
- [ ] Proposer en console — validation manuelle avant écriture en DB
- [ ] Permettre override manuel via fichier JSON `data/best-fives-overrides.json`

#### 12.3 Page `/meilleurs-5` (4h)
- [ ] `app/[locale]/meilleurs-5/page.tsx`
- [ ] 5 sections (une par génération) avec titre + années
- [ ] Chaque section : grille 5 joueurs (composant `PlayerCard` enrichi avec rationale)
- [ ] Responsive : 5 colonnes desktop, 2-3 colonnes mobile
- [ ] Animation d'entrée subtile (Framer Motion staggerChildren)
- [ ] `generateMetadata` SEO-optimisé (titre : "Meilleur 5 NBA par génération")
- [ ] Schema.org `ItemList`

#### 12.4 Rationale éditorial (2h)
- [ ] Pour chaque joueur sélectionné : rédiger 1-2 phrases FR expliquant le choix
- [ ] Stocker dans `GenerationFive.rationale`
- [ ] Afficher sous la card joueur

#### 12.5 Liens depuis pages joueurs (1h)
- [ ] Sur la page d'un joueur présent dans un best-5 : badge discret "Meilleur 5 — Ère moderne"
- [ ] Lien vers la page `/meilleurs-5#era-moderne`

### Livrable sprint 12

Page éditoriale `/meilleurs-5` avec les 25 joueurs sélectionnés (5 générations × 5 postes), rationale textuel, liens depuis les pages joueurs.

### Definition of Done

- La page charge avec les 25 joueurs
- Le rationale est présent pour chaque joueur
- SEO : title + description + OG image correctement remplis
- Les badges apparaissent sur les pages des joueurs concernés

---

## Récap macro

| Sprint | Semaine | Effort | Livrable visible |
|--------|---------|--------|------------------|
| 0 | Avant | 3-4h | Comptes prêts, domaine acheté |
| 1 | S1 | 10h | App qui tourne avec shell visuel |
| 2 | S2 | 11h | DB pleine avec 10 saisons de data |
| 3 | S3 | 10h | 30 pages équipes fonctionnelles |
| 4 | S4 | 11h | 600 pages joueurs fonctionnelles |
| 5 | S5 | 9h | Photos + paragraphes français partout |
| 6 | S6 | 9h | Home + ⌘K + sélecteur saison |
| 7 | S7 | 10h | Site en prod, SEO, analytics |
| 8 | S8 | 13h | Launch public + cron GitHub Actions |
| 9 | Post-S8 | ~13h | Résultats matchs + programme J+2 |
| 10 | Post-S9 | ~8h | Page Rookies + Page Retraités |
| 11 | Post-S10 | ~10h | Historique complet franchises |
| 12 | Post-S11 | ~11h | Page éditoriale Meilleur 5 par génération |
| **Total** | **12 sprints** | **~128h** | **Site complet + contenu éditorial** |

---

## Règles de survie pour les 8 semaines

1. **Ship every Friday** — chaque dimanche soir tu pushes ce qui est fait. Même partiel.
2. **Aucun feature creep** — toute idée nouvelle va dans `BACKLOG.md`, jamais dans le sprint en cours.
3. **Maquette = source de vérité** — pas de redesign en cours de route. Tu copies la maquette.
4. **Pas de refacto avant launch** — code "moche mais qui marche" > code "parfait jamais shippé".
5. **1 sprint en retard = c'est OK** — tu glisses tout d'une semaine, tu changes rien d'autre.
6. **Marathon > hoopstats** — si tu dois choisir entre une sortie longue prévue et hoopstats, tu cours. Le projet attend, le marathon non.
7. **Si tu es coincé > 30 min** — tu demandes à Claude Code, tu skip le détail, tu shippes la version simple.

---

## Décisions à prendre rapidement (avant sprint 1)

- [ ] Nom de domaine final (vérifier hoopstats.com / .fr / .app)
- [ ] Free tier ou compte payant balldontlie ? (free suffit pour V1)
- [ ] pnpm vs npm (pnpm recommandé pour vitesse)
- [ ] Claude Code activé sur le repo dès J1 ? (oui, avec CONTEXT.md)
