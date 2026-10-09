# Guide de reprise de saison

Ce guide décrit le passage d'une saison à la suivante, sur l'exemple de 2026-27. ESPN date le début de la saison régulière au `2026-10-20T07:00Z`, soit le mardi 20 octobre à 09:00 heure de Paris. C'est une date de référence : les premiers matchs se jouent le mardi soir aux États-Unis, donc dans la nuit du 20 au 21 octobre à Paris.

## Ce qui se passe tout seul

| Quand (heure de Paris) | Quoi |
| --- | --- |
| Mar. 20 oct., 06:00 | `currentSeason()` passe à 2026-27 (`SEASON_OPENERS` moins 3 h). Les pages déjà en cache affichent encore 2025-26. |
| Mar. 20 oct., ~12:00–14:00 | La synchro quotidienne (GitHub Actions, programmée à 05:00 UTC mais lancée en pratique vers 10–12 UTC) crée les 30 classements 2026-27 à 0-0, puis revalide tout le site, qui bascule. |
| Mer. 21 oct., ~12:00–14:00 | La synchro charge les premiers résultats et box scores, crée les fiches des rookies et des nouveaux venus, puis calcule les premières moyennes 2026-27. |

Tant qu'un joueur n'a pas joué en 2026-27, sa fiche affiche ses moyennes 2025-26, avec la mention « aucun match en 2026-27 ». Les pages Rookies et Playoffs restent sur 2025-26 jusqu'à ce que la nouvelle saison ait des données.

## Avant le jour J

```bash
pnpm check:rollover --strict
```

Le script est en lecture seule. Il doit finir à 0 échec. Il vérifie :

- l'horloge de bascule ;
- la date de reprise publiée par ESPN, comparée à `SEASON_OPENERS` ;
- les classements ESPN de la nouvelle saison ;
- l'état de la base ;
- les joueurs de présaison encore sans fiche ;
- la dernière synchro.

Si ESPN annonce une autre date, corriger `SEASON_OPENERS` dans `lib/nba.ts`, puis déployer.

Pour voir le site comme le jour J, en local :

```bash
pnpm build && HOOPSTATS_NOW=2026-10-20T05:00:00Z CRON_SECRET=local pnpm start -p 3101
```

Ensuite, déclencher `POST /api/revalidate` avec l'en-tête `Authorization: Bearer local`.

## Mardi 20 octobre, en début d'après-midi

1. Dans l'onglet Actions de GitHub, vérifier que « Daily NBA Sync » est vert. S'il n'est pas parti, le lancer à la main (« Run workflow »).
2. Dans le journal, chercher `Sync standings 2026-27` suivi de `30 upserted`, puis `Cache invalidé`.
3. Contrôler le site en production :
   - l'accueil annonce la reprise ;
   - Classements montre 2026-27 à 0-0 ;
   - une fiche joueur indique « Moyennes 2025-26 · aucun match en 2026-27 ».
4. Lancer `pnpm health:data` : 0 échec attendu.

## Mercredi 21 octobre, en début d'après-midi

1. Vérifier que la synchro est verte et que `SyncLog` est en `success`. S'il est en `partial`, lire le détail dans le journal : `boxScoresErrors`, `playoffsSkipped`, etc.
2. Chercher `🆕 Fiche créée` dans le journal : les rookies doivent avoir leur année de draft (2026).
3. Lancer `pnpm check:rollover` : la ligne « Joueurs sans fiche » doit se vider pour les équipes qui ont joué.
4. Lancer `pnpm health:data` : 0 échec, en particulier sur les box scores manquants et les totaux de points.
5. Vérifier sur le site :
   - les scores de la veille ;
   - la fiche d'un rookie (moyennes, graphique carrière à un point) ;
   - la fiche d'un joueur transféré cet été (nouvelle équipe).

## En cas de problème

- **Box score manquant :** la synchro le retente seule pendant 7 jours. Pour forcer : `npx tsx --env-file=.env scripts/sync-box-scores.ts`.
- **Site resté sur 2025-26 après la synchro :** la revalidation a échoué. Relancer la synchro à la main, ou appeler `/api/revalidate` avec `CRON_SECRET`.
- **Rookie sans fiche alors qu'il a joué un match officiel :** vérifier son nom dans `lib/stats/player-aliases.ts`, puis lancer `pnpm resolve:players`. Cette commande écrit en base, donc sauvegarder avant.
- **Import qui a abîmé des données :** suivre `GUIDE-RESTAURATION.md`.
