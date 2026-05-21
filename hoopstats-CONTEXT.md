# CONTEXT.md — hoopstats

> Document de contexte pour Claude Code. À lire en premier à chaque session.

---

## Identité du projet

**hoopstats** = site de référence NBA en français, type "Basketball-Reference moderne".

- **Stack** : Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Prisma + Supabase
- **Cible** : ~600 pages joueurs + 30 pages équipes + 1 home, 99% en SSG
- **Langue** : français only en V1, architecture i18n ready pour V2 anglais
- **Hosting** : Vercel (free tier)
- **DB** : PostgreSQL via Supabase
- **Cron** : n8n self-hosted (TrueNAS Rodolphe)

---

## Documents de référence (à lire avant toute tâche significative)

- `PRD.md` — Product Requirements Document complet (vision, périmètre, schéma DB)
- `PLAN.md` — Plan d'action en 8 sprints
- `BACKLOG.md` — Idées différées (à créer au fil de l'eau)

---

## Principes de développement

### 1. Maquette = source de vérité
La maquette HTML/JSX dans `/docs/mockup/` est le design final. **Ne pas redesigner**. Reproduire pixel-perfect. Si un doute sur un détail visuel : ouvrir la maquette, regarder, recopier.

### 2. Ship-first, refacto-later
Code "moche mais qui marche" > code "parfait jamais shippé". Pas de pattern d'architecture avant le launch V1. Pas de tests unitaires en V1 sauf utilitaires critiques (slugs, formatage stats).

### 3. SSG par défaut
Toute page doit être statique au build sauf justification explicite. `generateStaticParams` obligatoire sur les routes dynamiques. Si une donnée change quotidiennement → ISR avec `revalidate: 21600` (6h).

### 4. Pas de feature creep
Toute idée non listée dans le sprint en cours du `PLAN.md` → ajouter à `BACKLOG.md`, ne pas implémenter. Même si "ça prend 2 minutes".

### 5. Composants = copie de la maquette
Les composants UI (`KPI`, `TeamMono`, `PlayerAvatar`, `LineChart`, `MultiLineChart`, `Radar`, `Sparkline`, `Crumbs`, `Tabs`, `SectionHeader`) sont déjà écrits dans la maquette. Les recopier en TypeScript avec props typées, sans changer la logique visuelle.

---

## Stack & versions

```
Node          : 20.x LTS
Package mgr   : pnpm
Next.js       : ^15.0.0
React         : ^19.0.0
TypeScript    : ^5.6 (strict mode)
Tailwind CSS  : ^4.0
Prisma        : ^5.20
next-intl     : ^3.x
Framer Motion : ^11.x
Anthropic SDK : ^0.30
```

Toujours préférer la version stable la plus récente compatible.

---

## Conventions de code

### Imports
```typescript
// 1. External
import { type Metadata } from "next"
import { notFound } from "next/navigation"

// 2. Internal absolute (@/)
import { prisma } from "@/lib/prisma"
import { TeamMono } from "@/components/ui/team-mono"

// 3. Types
import type { Team } from "@prisma/client"
```

### Fichiers et dossiers
- Composants : `kebab-case.tsx` (ex: `team-card.tsx`)
- Hooks : `use-kebab-case.ts`
- Utils : `kebab-case.ts`
- Pages : structure App Router native
- Composants exportés en `named exports` (jamais `default`)

### Naming
- Composants React : `PascalCase`
- Variables/fonctions : `camelCase`
- Constantes globales : `SCREAMING_SNAKE_CASE`
- Types/Interfaces : `PascalCase` sans préfixe `I`

### TypeScript strict
- `strict: true` dans `tsconfig.json`
- Pas de `any`, utiliser `unknown` puis narrow
- Préférer `type` à `interface` sauf pour extension
- Props composants : type inline si <3 props, sinon type exporté

### Tailwind
- Utiliser les couleurs custom du theme (`bg-card`, `text-muted`, etc. — à définir dans `tailwind.config`)
- Pour les couleurs équipes dynamiques (variables) : `style={{ background: ... }}`
- Éviter `@apply` sauf cas particulier (réutilisation massive)
- Mobile-first : pas de breakpoint = mobile, `md:` = tablet, `lg:` = desktop

---

## Schéma DB & accès

**Le schéma Prisma complet est dans `PRD.md` §6.3.** Ne pas modifier sans mettre à jour le PRD.

### Règles d'accès Prisma
- Toujours via le singleton `lib/prisma.ts` (jamais `new PrismaClient()`)
- Préférer `findUnique` à `findFirst` quand possible
- `select` explicite sur les pages SSG pour limiter la data
- Pour les listes : `take` + `orderBy` toujours

### Exemple d'accès type
```typescript
// app/[locale]/joueurs/[slug]/page.tsx
const player = await prisma.player.findUnique({
  where: { slug: params.slug },
  select: {
    id: true, firstName: true, lastName: true,
    photoUrl: true, photoAttribution: true,
    summaryFr: true,
    seasons: {
      orderBy: { season: "desc" },
      include: { team: { select: { abbr: true, primaryColor: true, secondaryColor: true } } },
    },
  },
})

if (!player) notFound()
```

---

## Design tokens (palette finale)

Définis dans `tailwind.config.ts` :

```typescript
colors: {
  // Backgrounds
  "bg-base": "#0A0A0B",
  "bg-card": "#111114",
  "bg-elevated": "#1A1A1F",

  // Accents
  "accent-primary": "#7C3AED",   // violet
  "accent-cyan": "#06B6D4",
  "accent-amber": "#F59E0B",
  "accent-green": "#10B981",
  "accent-pink": "#EC4899",

  // Borders (utilisés en `border-white/[0.06]`, etc.)
  // Pas besoin de tokens custom, white/X suffit
}
```

Fonts (Google Fonts dans `app/layout.tsx`) :
- Inter (sans)
- Space Grotesk (display)
- JetBrains Mono (mono)

---

## Workflow git

### Branches
- `main` = production (auto-deploy Vercel)
- `dev` = intégration (preview deploy)
- `feat/sprint-N-xxx` = features sprint

### Commits
Format Conventional Commits :
```
feat(player): add career multi-line chart
fix(team): correct slug generation for accented names
chore(deps): bump next to 15.0.3
docs(prd): clarify photo licensing strategy
```

### PRs
Pas de PR pour V1 (solo dev). Merge direct `feat/*` → `main` après self-review.

---

## Scripts utiles

```bash
# Dev
pnpm dev                            # serveur dev
pnpm build && pnpm start            # test prod local

# DB
pnpm dlx prisma studio              # explorer DB
pnpm dlx prisma db push             # sync schema (V1)
pnpm dlx prisma generate            # regen client

# Scripts data (one-shot ou maintenance)
pnpm tsx scripts/seed-teams.ts
pnpm tsx scripts/import-balldontlie.ts
pnpm tsx scripts/import-photos.ts
pnpm tsx scripts/generate-summaries.ts

# Quality
pnpm lint
pnpm tsc --noEmit                   # type check sans build
```

---

## Sources de données externes

| Source | Usage | Auth | Rate limit |
|--------|-------|------|------------|
| balldontlie.io | Stats joueurs/équipes | API key (free tier) | 60 req/min |
| nba_api (Python) | Stats avancées | Aucune | Soyons polis : 2 req/sec |
| Wikimedia Commons | Photos joueurs | Aucune | 200 req/sec (on use 1/sec) |
| Anthropic API | Paragraphes français | API key | Pas de souci en V1 |
| Wikipedia API | Bios joueurs (fallback) | Aucune | 200 req/sec |

**Pour toutes les sources** : toujours implémenter retry + backoff exponentiel + log dans `SyncLog`.

---

## Patterns récurrents

### Génération de slug FR
```typescript
// lib/slugs.ts
export function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
// "Nikola Jokić" → "nikola-jokic"
// "Los Angeles Lakers" → "los-angeles-lakers"
```

### Image OG dynamique
```typescript
// app/api/og/player/[slug]/route.tsx
import { ImageResponse } from "next/og"

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const player = await prisma.player.findUnique({ where: { slug: params.slug } })
  if (!player) return new Response(null, { status: 404 })

  return new ImageResponse(
    <div style={{ /* Tailwind-like inline styles */ }}>
      {player.firstName} {player.lastName}
    </div>,
    { width: 1200, height: 630 }
  )
}
```

### Revalidation depuis n8n
```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  const { secret, paths } = await req.json()
  if (secret !== process.env.REVALIDATE_SECRET) return new Response("Forbidden", { status: 403 })

  for (const path of paths) revalidatePath(path)
  return Response.json({ revalidated: paths.length })
}
```

---

## Anti-patterns à éviter

### ❌ NE PAS FAIRE

1. **Pas de `'use client'` par défaut** : composant serveur sauf si interactivité nécessaire (form, état, hook). 90% des composants hoopstats sont serveur.

2. **Pas d'`useEffect` pour fetcher de la data** : on est en SSG, on fetch côté serveur dans le composant async.

3. **Pas de bibliothèque de charts (recharts, victory)** : on a déjà nos composants SVG natifs dans la maquette. Pas de dépendance lourde.

4. **Pas de state management global** (Zustand, Redux) : URL = source de vérité, Context React pour les rares globaux (saison sélectionnée).

5. **Pas de `getServerSideProps`** : c'est App Router, on est en async components.

6. **Pas de CSS Modules ni styled-components** : Tailwind only.

7. **Pas de localStorage/sessionStorage** dans les composants : on n'a pas d'auth V1, et ça casse le SSG.

8. **Pas de scraping HTML sans accord/usage éditorial** : tout ce qui touche aux données NBA passe par les APIs (balldontlie, nba_api) ou Wikipedia.

---

## Sécurité & droits

### Variables d'environnement
- `.env.local` : dev local (gitignored)
- `.env.production` : Vercel dashboard uniquement
- Jamais de secrets en dur dans le code
- `REVALIDATE_SECRET` pour le webhook n8n

### Légal
- **Logos NBA** : usage éditorial assumé, mention en footer (cf. BBRef pattern)
- **Photos** : Wikimedia Commons CC-BY/CC-BY-SA uniquement, attribution visible
- **Stats** : faits non protégeables, RAS

---

## Comportement attendu de Claude Code

Quand Rodolphe lance une tâche, Claude Code doit :

1. **Lire les docs avant d'agir** : `CONTEXT.md` (ce fichier), puis `PRD.md` si pertinent, puis le sprint en cours dans `PLAN.md`.

2. **Confirmer le scope** avant les tâches > 30 min : "Je vais faire X, Y, Z dans cet ordre. OK ?"

3. **Respecter la maquette** : ne pas inventer de design. Si un détail manque, demander à Rodolphe.

4. **Découper les longues tâches** : pas plus de 5-7 modifications de fichiers à la fois sans pause de validation.

5. **Style direct** : Rodolphe préfère les réponses sans flagornerie, structurées, orientées action. Pas d'excuses, pas de disclaimers, pas d'auto-références.

6. **Réponses courtes** : focus sur ce qui est fait + ce qui reste. Pas de récap inutile.

7. **Proposer des choix binaires** quand un arbitrage est nécessaire, pas des questions ouvertes.

8. **Documenter ce qui change le PRD** : si une décision modifie le PRD ou le plan, mettre à jour le doc concerné dans la même session.

---

## Contact & contexte humain

- **Dev** : Rodolphe, basé à Hem (59), certifié RNCP6 janvier 2026
- **Disponibilité** : ~10-15h/semaine sur ce projet
- **Contraintes parallèles** : marathon de Lille (25 octobre), apps mobile arbitrage, recherche CDI septembre 2026
- **Workflow préféré** : Claude Code + CONTEXT.md + git workflow standard
- **Si Rodolphe semble pressé ou frustré** : aller à l'essentiel, livrer du code qui marche, optimiser plus tard
