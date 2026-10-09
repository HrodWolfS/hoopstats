# Restaurer après un import fautif

Procédure quand une écriture en base a abîmé des données affichées : synchro,
import manuel, script de correction. Feuille de route § 0.5.

## 0. Avant toute écriture : sauvegarder

Tout script qui modifie ou supprime des lignes commence par écrire les lignes
concernées, **telles quelles**, dans `backups/<table>-<horodatage>.json` :

```ts
const rows = await prisma.playerSeason.findMany({ where: { season: "2026-27" } });
writeFileSync(`backups/player-season-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify(rows));
```

`backups/` est exclu de Git (`.git/info/exclude`) : les sauvegardes restent
**sur ce poste seulement**. Ne pas les supprimer tant que la correction n'a pas
tenu une semaine.

## 1. Arrêter les écritures automatiques

Sinon la synchro du lendemain réécrit par-dessus pendant la réparation.

```bash
gh workflow disable daily-sync.yml
```

## 2. Mesurer l'étendue

```bash
pnpm health:data
```

Noter la table, la saison et le nombre de lignes touchées. Comparer avec la
sauvegarde la plus récente d'avant l'incident (`ls -lt backups/`).

## 3. Choisir la réparation

| Cas | Réparation |
|---|---|
| Matchs ou box scores de la saison en cours faux | Relancer la synchro : elle relit ESPN et réécrit les mêmes lignes. `npx tsx --env-file=.env scripts/sync-daily.ts` |
| Agrégats `PlayerSeason` faux | Les dériver de nouveau depuis les box scores (même synchro). Les métriques avancées importées ne se recalculent pas : les reprendre de la sauvegarde. |
| Fiches, résumés, historique, corrections manuelles | Restaurer depuis la sauvegarde JSON (ci-dessous). |
| Pas de sauvegarde, ou dégâts étendus | Restauration à un instant donné depuis la console Neon, **vers une branche** : comparer, puis recopier les lignes saines. Ne jamais restaurer la branche principale directement : on perdrait les écritures postérieures (mesures d'audience, demandes). La profondeur d'historique dépend de l'offre Neon. |

### Restaurer depuis la sauvegarde

Script jetable `scripts/_tmp-restore.ts` : relire le fichier, remettre chaque
ligne par son `id`, puis supprimer le script.

```ts
const rows = JSON.parse(readFileSync("backups/player-season-….json", "utf8"));
for (const { id, ...data } of rows) {
  await prisma.playerSeason.upsert({ where: { id }, update: data, create: { id, ...data } });
}
```

- Les dates sont des chaînes dans le JSON : les reconvertir (`new Date(...)`)
  pour les colonnes `DateTime`.
- Une ligne **créée** par l'import fautif n'est pas dans la sauvegarde : la
  supprimer à part, en listant les `id` absents de la sauvegarde.
- La base est partagée : un OK explicite avant de lancer.

## 4. Vérifier

1. Relire en base quelques lignes restaurées et les comparer à la sauvegarde.
2. `pnpm health:data --strict` : aucun échec.
3. Vider le cache du site : appeler `/api/revalidate` avec `CRON_SECRET`, ou
   relancer la synchro, qui le fait en fin de course.
4. Ouvrir une page touchée en production à 390 px.

## 5. Reprendre

```bash
gh workflow enable daily-sync.yml
```

Le lendemain, vérifier le résumé de la synchro dans GitHub Actions.
