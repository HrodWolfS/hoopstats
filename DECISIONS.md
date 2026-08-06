# Décisions structurantes

Registre des décisions engageantes, au format demandé par la feuille de route
(§ 12) : contexte, options, décision, conséquences, date.

---

## 001 — Source des agrégats de saison joueurs (`PlayerSeason`)

**Date** : 6 août 2026
**Statut** : décidée
**Feuille de route** : § 0.1 (audit des sources), § 0.4 (automatisation de la fraîcheur)

### Contexte

`PlayerSeason` alimente les moyennes affichées sur les pages joueurs, les
classements, l'explorateur et le comparateur. Ces lignes n'étaient produites que
manuellement : la synchronisation quotidienne met à jour les matchs et les box
scores, jamais les agrégats de saison.

Mesure au 6 août 2026 : **523 joueurs sur 568** affichaient des moyennes
ignorant des matchs déjà présents en base, avec un retard médian de 5 matchs.

Il fallait donc une source exécutable depuis la production, quotidiennement.

### Options évaluées

| Source | Test | Résultat |
|---|---|---|
| **stats.nba.com** (source historique, via `fetch-stats.py`) | 2 requêtes, 25 s et 45 s | TCP et TLS établis, **aucune réponse HTTP**. Comportement anti-bot connu. Inutilisable depuis une IP résidentielle, a fortiori depuis un runner GitHub. |
| **BALLDONTLIE** (clé déjà présente en secret CI) | 3 endpoints | Clé valide (`/players` → 200), mais `/season_averages` et `/stats` → **401**. Ces endpoints exigent un palier payant. |
| **Box scores ESPN** (déjà synchronisés quotidiennement) | 1 387 matchs, 30 613 lignes joueurs | **100 %** des matchs finaux ont un box score · **99,35 %** réconcilient les points joueurs avec le score final · **100 %** des lignes portent les volumes de tirs. |

### Décision

**Dériver les statistiques de comptage et les pourcentages de tir depuis les box
scores ESPN**, déjà synchronisés en production.

**Conserver** les métriques avancées non dérivables (PER, USG%, ORtg, DRtg,
NRtg) telles qu'importées depuis NBA Stats : elles sont écrasées par aucune
dérivation, et rafraîchies manuellement quand la source redevient joignable.

ESPN n'est pas retenue parce qu'elle serait irréprochable — son archive
historique s'est révélée gravement fautive (23 séries de playoffs à rectifier),
et 9 matchs de la saison en cours ne réconcilient pas. Elle est retenue parce
qu'elle est la seule **vérifiable** :

1. chaque moyenne dérivée se décompose en lignes de match que l'on stocke et
   contrôle déjà — les 9 écarts connus sont détectés et signalés, là où un
   agrégat fourni tout fait ne se décompose pas ;
2. les moyennes deviennent **cohérentes avec les pages match**, qui affichent
   déjà ces box scores. Aujourd'hui les deux viennent de sources différentes et
   peuvent se contredire sans que rien ne l'indique ;
3. les volumes de tirs étant présents sur 100 % des lignes, les pourcentages
   deviennent **exacts** (calculés sur les totaux) au lieu d'être des moyennes
   de moyennes — ce qui lève au passage la limite documentée sur les lignes
   `TOT` d'une saison transférée.

### Conséquences

- Les moyennes de comptage et de tir changent de provenance : elles deviennent
  des données **calculées**, à distinguer visuellement des données importées
  (§ 0.2). La page Sources doit le refléter.
- Prérequis bloquant : **15 joueurs ne sont reliés à aucune fiche** (surnoms et
  suffixes — Bones Hyland, Bub Carrington, Nic Claxton, Jimmy Butler III), et
  Jaren Jackson Jr. possède deux fiches. Dériver sans traiter ces cas
  sous-compterait des joueurs connus. Une table d'alias est nécessaire (§ 1.2).
- Garde-fou retenu : ne jamais écrire une ligne dérivée dont le nombre de matchs
  serait **inférieur** à la valeur stockée. Les box scores s'accumulant, un
  recul signale une liaison défaillante plutôt qu'une donnée plus fraîche.
- `stats.nba.com` reste la source de secours documentée pour les métriques
  avancées, sans dépendance quotidienne.

### À revoir si

- BALLDONTLIE devient accessible sur un palier ouvrant `/season_averages` ;
- stats.nba.com redevient joignable depuis une infrastructure de production ;
- le taux de réconciliation des box scores ESPN passe durablement sous 99 %.
