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

---

> Les décisions 002 à 010 consignent des règles **déjà appliquées dans le
> code**, écrites le 9 octobre 2026 pour compléter la liste du § 12. Chacune
> renvoie au fichier qui fait foi : en cas d'écart, c'est le code qui dit ce que
> le site affiche, et ce registre qui doit être corrigé.

## 002 — Ligne `TOT` d'un joueur transféré en cours de saison

**Date** : 9 octobre 2026 (règle en place depuis la phase 1)
**Statut** : appliquée — `lib/stats/season-consolidation.ts`
**Feuille de route** : § 1.1 (cohérence des agrégats)

### Contexte

Un joueur transféré a une ligne par équipe. Les classements et la fiche joueur
ont besoin d'une seule ligne par saison, sans quoi il apparaît deux fois ou est
jugé sur une demi-saison.

### Options évaluées

- Afficher chaque ligne d'équipe séparément : doublons dans les classements.
- Garder la ligne de la dernière équipe : fausse la saison.
- **Consolider en une ligne `TOT`**, en ne calculant que ce qui se calcule
  exactement.

### Décision

- Statistiques de comptage : moyenne pondérée par les matchs joués.
- Pourcentages de tir : recalculés sur les tentatives des box scores ; à
  défaut, **vides** plutôt qu'une moyenne de pourcentages.
- Cumuls (WS, VORP) : additionnés.
- Taux avancés (PIE, USG%, ORtg, DRtg, NRtg, BPM) : **vides**. Ils dépendent du
  contexte d'équipe et ne se combinent pas.

### Conséquences

Une case vide sur `TOT` est voulue, pas une donnée manquante. Les matchs joués
sont plafonnés dans les classements (`lib/stats/leaders.ts`) pour qu'un
transfert ne gonfle pas le seuil de qualification.

### À revoir si

Une source fournit des taux avancés déjà consolidés pour les joueurs transférés.

## 003 — Moyennes de carrière

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/stats/career.ts`
**Feuille de route** : § 1.1

### Décision

Les moyennes de carrière sont pondérées par les matchs joués de chaque saison.
Les pourcentages sont calculés sur les tentatives totales ; si une saison n'en a
pas, le pourcentage de carrière reste **vide** au lieu d'être approché.

### Conséquences

Certaines carrières anciennes n'ont pas de pourcentage de carrière : c'est
plus honnête qu'un chiffre plausible et faux.

### À revoir si

Les tentatives des saisons anciennes sont importées.

## 004 — Découpage d'une saison : saison régulière, play-in, playoffs

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/season-phase.ts`
**Feuille de route** : § 1.1, § 2 (pages playoffs)

### Décision

La phase d'un match vient de l'année de saison et du type d'événement fournis
par ESPN, pas de sa date. Présaison, play-in, playoffs et finale de la NBA Cup
sont **exclus des moyennes de saison régulière** et affichés séparément.

### Conséquences

La finale de la NBA Cup ne compte pas dans les moyennes, conformément à la
règle de la NBA. Un match mal typé par ESPN tombe dans la mauvaise phase : le
contrôle `health:data` le signale.

### À revoir si

La NBA change le statut statistique d'une de ces phases.

## 005 — Paramètre de saison et année de draft

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/season-scope.ts`, `lib/nba.ts`
**Feuille de route** : § 2 (navigation par saison)

### Décision

- Un seul paramètre d'adresse, `?saison=AAAA-AA` (ex. `2026-27`), sur toutes
  les pages qui changent de saison. `lib/season-scope.ts` déclare les saisons
  disponibles page par page.
- L'année de draft d'une saison est sa première année :
  `draftYearOf("2026-27") = 2026`.

### Conséquences

Une adresse partagée garde la saison choisie. Une saison absente du périmètre
d'une page renvoie à la saison par défaut au lieu d'afficher une page vide.

### À revoir si

Jamais sans redirection des anciennes adresses.

## 006 — Définition d'un joueur français

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/french.ts`, publiée sur `/sources`
**Feuille de route** : § 2 (page Français)

### Décision

Nationalité **sportive** : un joueur est français si NBA.com (via BALLDONTLIE)
le déclare de France, **ou** s'il a porté le maillot de l'équipe de France A.
Chaque ajout manuel est nommé et sourcé dans `lib/french.ts`.

### Conséquences

Les binationaux qui ont choisi la France sont inclus, ceux qui n'ont que la
nationalité administrative ne le sont pas. La règle est affichée sur `/sources`.

### À revoir si

Un lecteur conteste un cas : on corrige la liste sourcée, pas la règle.

## 007 — Seuils de qualification des classements

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/stats/metrics.ts`, `lib/stats/leaders.ts`
**Feuille de route** : § 1.3 (classements)

### Décision

| Règle | Seuil | Métriques |
|---|---|---|
| `nba` | 70 % des matchs de l'équipe (58 sur 82) | moyennes par match |
| `hoopstats` | 70 % des matchs **et** 20 min par match | pourcentages de tir, métriques sur le terrain |
| `hoopstats` + volume | idem **et** 10 points par match | true shooting |
| `none` | aucun | totaux (matchs joués…) |

En cours de saison, la part s'applique aux matchs déjà joués par l'équipe.

### Conséquences

Un joueur à 5 tirs sur la saison ne mène pas un classement de pourcentage. Le
seuil appliqué est affiché avec chaque classement.

### À revoir si

La NBA modifie ses propres seuils, ou un classement observé reste trompeur.

## 008 — Mesure d'audience et conservation

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/analytics.ts`, `lib/retention.ts`, `lib/stat-requests.ts`
**Feuille de route** : § 4.1 (instrumentation)

### Décision

- **Aucun cookie ni identifiant.** Le navigateur garde trois dates en
  `localStorage` (première visite, dernière visite, retours déjà comptés).
- Le serveur ne reçoit que des **compteurs quotidiens agrégés** : visite
  nouvelle ou revenue, retour à 7 jours (1 à 7 jours après la première visite),
  à 28 jours (8 à 28 jours).
- Le refus de mesure est respecté (signal GPC ou réglage du site).
- Les demandes de statistiques (`StatRequest`) ne stockent pas d'e-mail et sont
  supprimées après **365 jours**.
- Les compteurs quotidiens (`AnalyticsDaily`) ne contiennent aucune donnée
  personnelle et sont **conservés sans limite** : ils servent au bilan de fin de
  saison.

### Conséquences

Pas de bandeau de consentement nécessaire. Les chiffres sont des tendances, pas
des personnes : impossible de suivre un parcours individuel.

### À revoir si

Un outil tiers de mesure est ajouté, ou un compteur devient assez fin pour
isoler une personne.

## 009 — Export CSV et attribution

**Date** : 9 octobre 2026
**Statut** : appliquée — `lib/export.ts`
**Feuille de route** : § 3 (export), § 0.1 (droits)

### Décision

Seuls les tableaux que hoopstats **calcule lui-même** depuis les box scores
ESPN sont exportables : tendances, classements de la saison en cours, Français
et rookies de la saison en cours. Ne le sont pas : saisons passées issues de
NBA Stats, métriques avancées importées, box scores bruts. Chaque fichier
commence par la source et la date de mise à jour.

### Conséquences

On ne redistribue pas en masse des données dont les droits ne sont pas
établis. `isExportable()` refuse tout tableau dont une colonne a une autre
origine.

### À revoir si

Les droits des sources sont clarifiés (décision 010).

## 010 — Source principale et source de secours

**Date** : 10 octobre 2026
**Statut** : décidée — risque accepté par le propriétaire jusqu'au bilan de fin de saison
**Feuille de route** : § 0.1

### Contexte

La décision 001 fait d'ESPN la source principale de fait. Les conditions
d'utilisation, relues le 10 octobre (`REGISTRE-SOURCES.md` § 8), ne couvrent
pas notre usage d'ESPN ni de NBA.com : elles visent un usage personnel ou
informatif, non commercial, sans extraction automatisée ni base stockée.
BALLDONTLIE et Wikimedia, eux, couvrent notre usage.

### Options

1. Accepter le risque pour le site gratuit et le revoir en fin de saison.
2. Souscrire dès maintenant un palier BALLDONTLIE payant comme secours.
3. Retirer les logos du CDN NBA en plus.

### Décision

Option 1.

- **Source principale** : ESPN pour les matchs, box scores, classements et
  playoffs ; les moyennes de la saison sont recalculées par nous (001).
- **Secours** : aucun branché. L'historique est en base, la fraîcheur alerte à
  36 h. Si ESPN s'arrête plus d'une semaine : BALLDONTLIE en palier payant,
  selon la procédure du registre (§ 5).
- **Garde-fous** tant que le risque est accepté : site gratuit, sans publicité,
  abonnement ni lien avec les paris ; export limité à nos calculs (009) ;
  sources des statistiques citées en pied de page et sur la page Sources.

### Conséquences

Un service peut couper l'accès sans préavis, et un ayant droit peut demander le
retrait : on retire alors le contenu visé sans discuter. Aucune monétisation
avant d'avoir une source contractuelle et l'avis d'un professionnel.

### À revoir si

Bilan de fin de saison, projet de monétisation, demande d'un ayant droit, ou
arrêt durable d'ESPN.

## 011 — Critères de démarrage de la phase 3

**Date** : 9 octobre 2026
**Statut** : décidée
**Feuille de route** : § 3, § 4.5

### Décision

La phase 3 ne démarre que si les **deux** portes sont franchies :

1. les droits des données concernées sont compatibles (décision 010) ;
2. le besoin est **observé**, pas supposé : demandes reçues, recherches internes,
   usage mesuré.

Et on ne construit que les **deux catégories de demandes les plus fréquentes**
(§ 4.5), sans études utilisateurs : signaux passifs seulement.

### À revoir si

Fin de saison : le bilan décide de la suite.

## 012 — Revalidation de tout le site après la synchro

**Date** : 9 octobre 2026
**Statut** : décidée
**Feuille de route** : § 0.4

### Décision

Après une synchro réussie, `/api/revalidate` continue de revalider **tout le
site** (`revalidatePath("/", "layout")`). On n'invalide pas page par page.

### Pourquoi

- Le bandeau de fraîcheur du layout fige la date de dernière synchro dans
  chaque page en cache. Une page non revalidée garderait l'ancienne date et
  afficherait à tort « Données en retard » au bout de 36 h.
- Les pages de données se régénèrent déjà seules (5 min à 6 h) : un ciblage
  ne ferait gagner presque rien.
- Une seule synchro par jour : le coût d'une revalidation complète est faible
  (les pages se régénèrent à la visite suivante, pas toutes d'un coup).

### À revoir si

La date de fraîcheur est lue côté client au lieu d'être figée dans la page, ou
la synchro passe à plusieurs fois par jour.

## 013 — Règle d'arrondi commune

**Date** : 10 octobre 2026
**Statut** : appliquée — `lib/format.ts`
**Feuille de route** : § 0.2

### Décision

Cartes, tableaux, graphiques, images de partage et exports passent par les
fonctions de `lib/format.ts` :

| Valeur | Règle | Exemple | Fonction |
|---|---|---|---|
| Moyenne par match, note (ORtg, PIE…) | 1 décimale | 25,4 | `stat` |
| Pourcentage | sur 100, 1 décimale | 58,4 | `pct` |
| Écart, net rating, +/- | 1 décimale, signe explicite, zéro sans signe | +3,2 · −1,0 · 0,0 | `signed` |
| Total, compteur | entier, milliers séparés | 1 234 | `count` |
| Axe de graphique | entier, 1 décimale si l'échelle est serrée | 110 | `stat(v, 0)` |
| Valeur absente | tiret cadratin | — | toutes |

- On calcule sur les valeurs brutes et on n'arrondit qu'à l'affichage : une
  moyenne de moyennes arrondies n'est jamais affichée.
- Arrondi au plus proche (`toFixed`), virgule décimale, vrai signe moins (−).
  Une valeur qui s'arrondit à zéro perd son signe : ni « −0,0 » ni « +0,0 ».
- L'export CSV reprend le texte affiché, sauf le signe moins, qui redevient un
  trait d'union pour que le tableur lise un nombre.
- Hors règle : les coordonnées SVG (sparkline, radar), qui ne s'affichent pas.

### Conséquences

Un même chiffre s'écrit pareil sur la carte, dans le tableau, sur l'image de
partage et dans le CSV. Les tests `tests/format.test.ts` fixent la règle.

### À revoir si

Une métrique demande plus de précision (deux décimales pour un ratio proche
de zéro, par exemple) : on l'ajoute au tableau plutôt qu'un arrondi local.
