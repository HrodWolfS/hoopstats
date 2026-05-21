# PRD — hoopstats

> La NBA en français, sans le bordel des tableaux de 2005.

**Version** : 1.0  
**Auteur** : Rodolphe  
**Dernière mise à jour** : 21 mai 2026  
**Statut** : Prêt pour développement

---

## 1. Vision

**hoopstats** est un site de référence NBA en français, qui combine la profondeur statistique de Basketball-Reference avec une expérience utilisateur moderne inspirée de Linear, Vercel et Arc Browser.

Le produit s'adresse aux fans francophones (casual à hardcore) qui veulent explorer équipes, joueurs et saisons sans subir une UX de 2005, et qui regardent les matchs à 3h du matin.

**Phrase-test produit** : *"Le Basketball-Reference que tu peux montrer à ta sœur."*

---

## 2. Objectifs

### 2.1 Objectifs produit

- Devenir le site de référence stats NBA en langue française (12-18 mois)
- Atteindre 50 000 visites/mois en V1 (mois 12)
- Maintenance < 4h/semaine après lancement (objectif personnel critique)
- Générer 200€/mois de revenus passifs AdSense d'ici mois 18

### 2.2 Objectifs techniques

- 99% des pages servies en static (SSG) → coût hosting quasi nul sur Vercel free tier
- Lighthouse score > 95 sur toutes les pages clés
- Pipeline data automatisé via n8n self-hosted (zéro intervention manuelle quotidienne)
- Zéro dette juridique : pas de photos sous copyright, logos en usage éditorial uniquement

### 2.3 Non-objectifs (explicites)

- **PAS** d'accounts utilisateurs en V1 (= zéro modération, zéro support)
- **PAS** de scores live ni de notifications (= zéro infra temps-réel)
- **PAS** de contenu social/communautaire (= pas de moat, mais pas de charge mentale)
- **PAS** de version mobile native (= web responsive only)
- **PAS** d'historique pré-2016 en V1 (10 saisons suffisent pour démarrer)

---

## 3. Public cible

### 3.1 Persona principal — "Le fan nocturne"

- Homme, 25-40 ans, vit en France/Belgique/Suisse francophone
- Regarde 2-5 matchs NBA par semaine, souvent en différé le matin
- Connaît les stars actuelles et l'histoire récente (depuis 2010-2015)
- Frustré par BBRef (anglais, UX vieillissante) et l'app NBA officielle (buggée)
- Utilise principalement desktop pour lire des stats, mobile pour consulter rapidement

### 3.2 Persona secondaire — "Le curieux"

- Néophyte ou fan récent (vague Wembanyama)
- Veut comprendre qui est qui sans plonger dans des tableaux denses
- Cherche des comparaisons et du contexte
- 60% mobile / 40% desktop

---

## 4. Périmètre fonctionnel V1

### 4.1 Pages incluses

| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Hero + grille 30 équipes + 5 joueurs en feu + rails footer |
| Équipe | `/equipes/[slug]` | Header équipe + 3 onglets (Effectif / Saison / Historique 10 ans) |
| Joueur | `/joueurs/[slug]` | Header + 6 KPI + chart carrière + tableau 10 saisons + suggestions de comparaisons |
| 404 | `/404` | Page d'erreur stylée |

### 4.2 Composants transversaux

- **Sidebar fixe** (220px) : Accueil / Équipes / Joueurs / Comparer (disabled V1) / Saisons (disabled V1)
- **TopBar sticky** : recherche, sélecteur de saison, avatar utilisateur (factice V1)
- **Command Palette ⌘K** : recherche transverse équipes + joueurs
- **Breadcrumbs** sur toutes les pages internes
- **Footer minimal** (mentions légales, contact)

### 4.3 Couverture data

- **Saisons** : 2016-17 à 2025-26 (10 saisons)
- **Équipes** : 30 franchises actuelles
- **Joueurs** : ~600 (rosters actifs + turnover sur 10 saisons)
- **Stats joueurs** : PPG, RPG, APG, SPG, BPG, FG%, 3P%, FT%, MPG, GP, PER, TS%, USG%, BPM, VORP, WS
- **Stats équipes** : W-L, conf rank, Off Rating, Def Rating, Net Rating, Pace, playoffs result
- **Photos joueurs** : Wikimedia Commons (fallback avatar stylisé si absent)
- **Logos équipes** : Wikipedia/sportslogos en usage éditorial + mention de propriété
- **Paragraphes éditoriaux français** : générés via Claude Haiku 4.5 (~6€ one-shot, regénérés annuellement)

### 4.4 Hors périmètre V1 (backlog V2+)

- Comparateur 2-4 joueurs (UI existante en sidebar disabled)
- Page saisons (historique global ligue)
- Recherche full-text avancée (Algolia)
- Version anglaise (i18n architecturé mais non activé)
- Données historiques < 2016
- Système de favoris (nécessite auth)
- Articles éditoriaux longs

---

## 5. Spécifications design

### 5.1 Palette & typographie (fixée par la maquette)

```
Backgrounds      : #0A0A0B (page), #111114 (cards), #1A1A1F (élévation)
Accents          : #7C3AED (violet primaire), #06B6D4 (cyan), #F59E0B (ambre)
                   #10B981 (vert positif), #EC4899 (rose)
Borders          : white/[0.06] (defaut), white/[0.12] (hover)
Texte            : white (titres), white/60 (body), white/40 (labels), white/30 (subtle)

Typographie:
- Sans : Inter (400, 500, 600, 700)
- Display : Space Grotesk (500, 600, 700)
- Mono : JetBrains Mono (400, 500)

Sélection : background #7C3AED
```

### 5.2 Système de composants

Tous documentés dans la maquette `components.jsx` :

- `TeamMono` : monogramme équipe (xs/sm/md/lg/xl/hero) avec dégradé couleurs équipe
- `PlayerAvatar` : avatar joueur avec initiales + numéro + ring couleurs équipe
- `KPI` : carte métrique avec label, valeur, unité, delta optionnel, accent color
- `Sparkline` : mini-chart inline (80×22 par défaut)
- `LineChart` : chart simple avec area gradient
- `MultiLineChart` : 3 lignes (PTS/REB/AST) avec légende intégrée
- `Radar` : radar 6 axes pour stats joueur
- `Crumbs` : breadcrumbs cliquables
- `Tabs` : tabs avec underline animé
- `SectionHeader` : eyebrow + titre + sub + slot droit

### 5.3 Règles d'usage

- **Pas de logos NBA officiels en composants UI** (les monogrammes typographiques font office de logos)
- **Pas de photos joueurs sans source CC** (toujours fallback avatar stylisé)
- **Mention légale obligatoire** en footer : "Logos et marques NBA appartiennent à leurs détenteurs respectifs. Utilisation à des fins éditoriales uniquement."

### 5.4 Responsive breakpoints

- Mobile : < 640px
- Tablet : 640px – 1024px
- Desktop : > 1024px
- Max-width contenu : 1400px centré

---

## 6. Architecture technique

### 6.1 Stack

```
Framework      : Next.js 15 (App Router)
Langage        : TypeScript (strict mode)
Styling        : Tailwind CSS v4
ORM            : Prisma 5
Base de données: PostgreSQL via Supabase
Storage        : Supabase Storage (photos Wikimedia cachées)
Auth           : NextAuth (admin uniquement, V1)
i18n           : next-intl (fr only V1, en V2-ready)
Charts         : SVG natif (composants déjà écrits dans la maquette)
Animations     : Framer Motion (transitions de page uniquement)
Génération IA  : Anthropic SDK (Haiku 4.5)
Analytics      : PostHog (free tier)
Hosting        : Vercel (free tier)
Cron / ETL     : n8n self-hosted (TrueNAS existant)
Monitoring     : Vercel Analytics + Sentry (free tier)
```

### 6.2 Structure du repo

```
hoopstats/
├── app/
│   └── [locale]/
│       ├── layout.tsx
│       ├── page.tsx                      # /
│       ├── equipes/
│       │   ├── page.tsx                  # /equipes
│       │   └── [slug]/page.tsx           # /equipes/los-angeles-lakers
│       ├── joueurs/
│       │   └── [slug]/page.tsx           # /joueurs/nikola-jokic
│       └── api/
│           ├── revalidate/route.ts       # webhook revalidation
│           └── og/[...params]/route.ts   # images OG dynamiques
├── components/
│   ├── ui/                               # KPI, Sparkline, Radar, etc.
│   ├── layout/                           # Sidebar, TopBar, Footer
│   ├── team/                             # TeamMono, TeamCard, RosterCard
│   ├── player/                           # PlayerAvatar, PlayerHeader
│   └── search/                           # CommandPalette
├── lib/
│   ├── prisma.ts
│   ├── anthropic.ts
│   ├── wikimedia.ts                      # client Wikimedia Commons
│   ├── slugs.ts                          # génération slugs FR
│   └── i18n/
├── messages/
│   └── fr.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   ├── import-balldontlie.ts             # one-shot import historique
│   ├── import-photos.ts                  # backfill Wikimedia photos
│   ├── generate-summaries.ts             # one-shot Claude API
│   └── daily-sync.ts                     # appelé par n8n
├── public/
│   └── logos/                            # SVG logos équipes (locaux)
├── middleware.ts                         # i18n routing
└── next.config.ts
```

### 6.3 Schéma base de données

```prisma
model Team {
  id              String   @id @default(cuid())
  abbr            String   @unique          // "LAL"
  city            String                    // "Los Angeles"
  name            String                    // "Lakers"
  slug            String   @unique          // "los-angeles-lakers"
  conference      String                    // "Ouest" | "Est"
  division        String                    // "Pacifique"
  primaryColor    String                    // "#552583"
  secondaryColor  String                    // "#FDB927"
  logoUrl         String?
  founded         Int
  arena           String?
  city_country    String?

  seasons         TeamSeason[]
  playerSeasons   PlayerSeason[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Player {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  slug            String   @unique          // "nikola-jokic"
  birthDate       DateTime?
  height          String?                   // "2m11"
  weight          String?                   // "129 kg"
  position        String?                   // "C"
  country         String?
  draftYear       Int?
  draftPick       Int?
  college         String?
  photoUrl        String?
  photoAttribution String?
  wikipediaUrlFr  String?
  wikipediaUrlEn  String?
  summaryFr       String?  @db.Text         // paragraphe Claude
  summaryEn       String?  @db.Text
  summaryGeneratedAt DateTime?

  seasons         PlayerSeason[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PlayerSeason {
  id              String   @id @default(cuid())
  playerId        String
  teamId          String
  season          String                    // "2024-25"

  gamesPlayed     Int
  minutesPerGame  Float
  pointsPerGame   Float
  reboundsPerGame Float
  assistsPerGame  Float
  stealsPerGame   Float
  blocksPerGame   Float
  fgPct           Float?
  threePtPct      Float?
  ftPct           Float?

  per             Float?
  trueShooting    Float?
  usageRate       Float?
  bpm             Float?
  vorp            Float?
  winShares       Float?

  player          Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  team            Team   @relation(fields: [teamId], references: [id])

  @@unique([playerId, season, teamId])
  @@index([season])
  @@index([teamId, season])
}

model TeamSeason {
  id              String   @id @default(cuid())
  teamId          String
  season          String

  wins            Int
  losses          Int
  conferenceRank  Int?
  offRating       Float?
  defRating       Float?
  netRating       Float?
  pace            Float?
  playoffResult   String?                   // "lost_r1" | "lost_finals" | "champion"
  summaryFr       String?  @db.Text

  team            Team @relation(fields: [teamId], references: [id])

  @@unique([teamId, season])
  @@index([season])
}

model SyncLog {
  id              String   @id @default(cuid())
  source          String                    // "balldontlie" | "wikimedia" | "claude"
  status          String                    // "success" | "error" | "partial"
  itemsProcessed  Int
  errors          Json?
  startedAt       DateTime
  completedAt     DateTime
}
```

### 6.4 Sources de données

| Donnée | Source primaire | Source fallback | Coût |
|--------|----------------|-----------------|------|
| Stats joueurs récentes | balldontlie.io | nba_api (Python) | Free / Free |
| Stats avancées | nba_api | Basketball-Reference scrape | Free |
| Bio joueurs (champs) | balldontlie + nba_api | Wikipedia API | Free |
| Photos joueurs | Wikimedia Commons | Avatar généré localement | Free |
| Logos équipes | Wikipedia SVG | SVG fait main | Free |
| Couleurs équipes | teamcolorcodes.com | Manuel | Free |
| Paragraphes éditoriaux FR | Anthropic API (Haiku 4.5) | Templates statiques | ~6€/an |

### 6.5 Stratégie de rendu

```
SSG (Static) : 99% des pages
  - / (home)
  - /equipes/[slug] (30 pages)
  - /joueurs/[slug] (~600 pages)

ISR (revalidation 6h) : pages "tièdes"
  - équipes (W-L change après chaque match)
  - joueurs actifs (stats mises à jour quotidiennement)

API Routes : utilitaires uniquement
  - /api/og/[...params] : génération images Open Graph
  - /api/revalidate : webhook depuis n8n après sync nocturne
```

### 6.6 Pipeline data (n8n workflows)

**Workflow 1 — Daily sync (3h du mat) :**
1. Pull `balldontlie /stats?season=2026` → upsert PlayerSeason
2. Pull `balldontlie /teams` → upsert TeamSeason (W-L)
3. POST `/api/revalidate` avec liste des slugs modifiés
4. Log dans SyncLog

**Workflow 2 — Weekly enrichment (dimanche 4h) :**
1. Pull stats avancées depuis nba_api
2. Enrich PlayerSeason
3. Refresh bios Wikipedia changées
4. POST `/api/revalidate`

**Workflow 3 — Photo backfill (mensuel ou on-demand) :**
1. Query Player WHERE photoUrl IS NULL
2. Pour chaque : Wikimedia Commons API search
3. Filter CC-BY / CC-BY-SA uniquement
4. Download → upload Supabase Storage
5. Sauvegarder URL + attribution

**Workflow 4 — Summaries generation (annuel, fin de saison) :**
1. Query Players actifs cette saison
2. Pour chaque : prompt Claude Haiku 4.5 avec stats career
3. Sauvegarder dans Player.summaryFr
4. Coût attendu : ~6€

### 6.7 Performance

- Static pages : First Contentful Paint < 1s sur 4G
- Bundle JS critique < 100KB gzipped
- Aucune image > 200KB (compression Wikimedia photos via Sharp)
- Lighthouse > 95 sur Home / Équipe / Joueur

### 6.8 SEO

- Sitemap.xml dynamique généré au build
- Schema.org markup : `SportsTeam`, `Person`, `Article` selon page
- Open Graph images générées dynamiquement (Vercel OG)
- URLs en français : `/equipes/los-angeles-lakers`, `/joueurs/nikola-jokic`
- Meta descriptions par page basées sur les summaries Claude

---

## 7. Considérations juridiques

### 7.1 Risques identifiés

| Élément | Risque | Mitigation |
|---------|--------|------------|
| Logos équipes | Marques déposées NBA | Usage éditorial + mention propriété (cf. BBRef) |
| Photos joueurs | Copyright photographes | Wikimedia CC-BY/CC-BY-SA + attribution visible |
| Stats brutes | Aucun (faits non protégeables) | RAS |
| Couleurs équipes | Aucun | RAS |
| Nom "hoopstats" | Vérifier INPI | À faire avant launch |
| Domaines NBA dans URL | Aucun (référence éditoriale OK) | RAS |

### 7.2 Mentions obligatoires (footer)

- "Logos et marques NBA sont la propriété de leurs détenteurs respectifs. hoopstats les utilise dans un contexte éditorial et de référence."
- "Photos sous licence Creative Commons. Attributions disponibles sur chaque page joueur."
- Mentions légales standards (RGPD, cookies, contact)

---

## 8. Métriques de succès

### 8.1 Métriques techniques (mois 3)

- Lighthouse > 95 sur 100% des pages clés
- Taux d'erreur Sentry < 0.1%
- Sync data quotidienne réussie > 99% du temps
- Temps de build Vercel < 5 minutes

### 8.2 Métriques produit (mois 6)

- 5 000 visites uniques/mois
- Taux de rebond < 50%
- Pages/session > 2.5
- Temps moyen sur site > 1m30

### 8.3 Métriques business (mois 12-18)

- 50 000 visites/mois (mois 12)
- 100-200€/mois revenus AdSense (mois 18)
- Maintenance < 4h/semaine (objectif personnel)

---

## 9. Risques produit

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| balldontlie.io ferme ou passe payant | Moyenne | Élevé | Fallback nba_api ready dès J1 |
| Wikimedia photos catalogue trop pauvre | Élevée | Moyen | Avatar fallback élégant = OK pour 30% des joueurs |
| C&D NBA pour les logos | Faible | Élevé | Argument éditorial + retrait rapide si demandé |
| Saisonnalité (offseason juillet-sept) | Certain | Moyen | Contenu evergreen (historique, comparaisons) |
| Concurrence BasketSession/BeBasket | Faible | Faible | Eux = médias, nous = base de données |
| Démotivation Rodolphe | Moyenne | Critique | Scope V1 strict + plan séquencé en sprints |

---

## 10. Roadmap macro post-V1

- **V1.1 (mois 3 post-launch)** : Comparateur 2 joueurs
- **V1.2 (mois 5)** : Page saisons + classement historique
- **V2.0 (mois 8)** : Version anglaise (audience mondiale)
- **V2.1 (mois 10)** : Historique 2010-2016 (+6 saisons)
- **V3.0 (an 2)** : Historique complet 1946-aujourd'hui + comparateur avancé
