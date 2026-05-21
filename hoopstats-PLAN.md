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
| 8 | S8 | 13h | Launch public + n8n cron |
| **Total** | **8 sem** | **~85h** | **Site complet en ligne** |

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
