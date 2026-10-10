# Registre des sources de données

> Inventaire factuel des données utilisées par hoopstats, de leur origine et de
> ce que nous en faisons. Établi le 12 août 2026 en relevant les appels réels
> du code et les volumes réels en base. Conditions d'utilisation relues le
> 10 octobre 2026 (§ 8).
>
> **Ce document ne porte aucune appréciation juridique.** Il décrit les usages
> pour qu'ils puissent être soumis à quelqu'un dont c'est le métier. La colonne
> « statut » reprend la nomenclature de la feuille de route (§ 0.1) :
> *autorisé*, *à confirmer*, *à remplacer*, *à ne pas utiliser*.

---

## 1. Vue d'ensemble

| Source | Ce qu'elle fournit | Contrat | Statut |
|---|---|---|---|
| ESPN — `site.api.espn.com` | Matchs, box scores, classements, playoffs | Aucun | **toléré, risque accepté** (décision 010) |
| NBA Stats — `stats.nba.com` | Saisons révolues, métriques avancées | Aucun | **toléré, risque accepté** — plus appelée, injoignable |
| NBA CDN — `cdn.nba.com` | Logos des 30 équipes, 48 photos joueurs | Aucun | **toléré, risque accepté** |
| BALLDONTLIE — `api.balldontlie.io` | Profils joueurs (draft, université) | Clé d'API, conditions publiées | **autorisé** |
| Wikimedia / Wikipédia | 514 photos, 4 964 biographies | CC BY-SA, domaine public | **autorisé**, attribution affichée |

### Fiche par source

| Source | Licence et conditions | Stockage | Affichage | Attribution | Débit et coût | Stabilité | Secours |
|---|---|---|---|---|---|---|---|
| ESPN | Aucune API publique : endpoints non documentés. Les conditions Disney visent un usage personnel et non commercial et interdisent l'extraction automatisée (§ 8). | Non couvert | Non couvert | « Données ESPN » sur les pages et les exports | Aucune limite publiée ; un appel par jour et par famille ; gratuit | Peut changer ou fermer sans préavis | Historique en base ; alerte de fraîcheur à 36 h ; BALLDONTLIE payant si arrêt durable (§ 5) |
| NBA Stats | Conditions NBA.com : statistiques réservées à l'information ou à un usage privé non commercial, attribution visible à NBA.com, pas de base régulièrement mise à jour sans accord (§ 8). | Non couvert (base de plusieurs décennies) | Toléré pour l'information | « NBA Stats API » sur la page Sources | Plus appelée ; gratuit | Injoignable depuis l'été 2026 | Aucun besoin : saisons révolues figées en base |
| NBA CDN | Logos et images restent la propriété de la NBA et des équipes ; tout usage demande leur accord (§ 8). | Rien n'est copié, seules les URL | Toléré dans un cadre éditorial | Pied de page et mentions légales | Gratuit | Stable | Logos : sigle texte de l'équipe ; photos : avatar aux initiales (déjà en place quand l'image manque) |
| BALLDONTLIE | Conditions publiées : affichage public, stockage et bases dérivées autorisés ; pas de revente brute ni de produit concurrent (§ 8). | Autorisé | Autorisé | Non exigée | Palier gratuit ; stats en palier payant (401) | Service commercial | Profils déjà en base |
| Wikimedia | CC BY-SA ou domaine public, fichier par fichier. | Seules les URL (photos) ; texte adapté (biographies) | Autorisé | Auteur et licence de chaque photo, lien et licence sous chaque biographie | Gratuit | Stable | Avatar aux initiales |

Trois des cinq sources sont consommées **sans aucun accord** : ni clé, ni
inscription, ni conditions développeur acceptées. Leurs conditions publiques ne
couvrent pas notre usage (§ 8) : le propriétaire accepte ce risque jusqu'au
bilan de fin de saison (décision 010).

---

## 2. Ce que nous stockons

Volumes relevés en base le 12 août 2026.

| Famille | Lignes | Origine |
|---|---:|---|
| Lignes de box score joueurs | 37 194 | ESPN |
| Saisons joueurs (`PlayerSeason`) | 17 002 | NBA Stats (historique) · **calculé** (saison en cours) |
| Joueurs | 5 467 | NBA Stats, BALLDONTLIE |
| Matchs | 1 391 | ESPN |
| Box scores équipes | 1 387 | ESPN |
| Saisons équipes | 1 266 | ESPN |
| Séries de playoffs | 663 | ESPN + corrections manuelles |
| Trophées | 120 | Saisie manuelle |

**Les fichiers image ne sont pas copiés** : seules les URL sont stockées, les
images restent servies par `upload.wikimedia.org` et `cdn.nba.com`.

## 3. Ce que nous republions

Trois usages distincts, qui n'appellent pas forcément la même réponse :

1. **Affichage** de données factuelles (scores, statistiques) ;
2. **Stockage durable** constituant une base de plusieurs décennies ;
3. **Diffusion d'œuvres dérivées** — les moyennes de la saison en cours ne sont
   plus reprises d'un fournisseur mais **recalculées par nous** à partir des box
   scores (voir décision 001).

Le site n'a aujourd'hui ni publicité ni abonnement. La feuille de route prévoit
de faire vérifier ces usages **avant** toute exploitation commerciale.

---

## 4. Écarts constatés entre ce que le site affirme et ce qu'il fait

> **Corrigés.** Vérifié dans le code le 10 octobre 2026 : la page joueur crédite
> Wikipédia (lien et CC BY-SA) sous chaque biographie et affiche l'auteur et la
> licence de chaque photo (`components/player/player-header.tsx`) ; le pied de
> page et les mentions légales distinguent les photos Wikimedia de celles du
> CDN NBA. Le constat d'origine est gardé ci-dessous.

Trois points relevés en lisant le code. Ils ne relèvent pas du droit mais de
l'exactitude de nos propres déclarations — donc de la promesse de fiabilité.

### 4.1 Les biographies Wikipédia ne sont pas attribuées

4 964 biographies proviennent de Wikipédia et sont affichées sur les pages
joueurs (`components/player/player-header.tsx`) **sans mention de source ni
lien**. Les champs `wikipediaUrlFr` et `wikipediaUrlEn` existent en base mais
ne sont jamais rendus.

Or le texte de Wikipédia est publié sous CC BY-SA, licence qui demande
l'attribution et le maintien de la licence.

### 4.2 Le site annonce des attributions de photos qui n'existent pas

Le pied de page affiche : « Attributions disponibles sur chaque page joueur ».
Le champ `photoAttribution` est stocké en base, mais **n'est affiché nulle
part** — aucune occurrence dans `app/` ni `components/`.

C'est une affirmation fausse sur nos propres pages.

### 4.3 Toutes les photos ne sont pas sous Creative Commons

Le pied de page indique « Photos sous licence Creative Commons » et les
mentions légales « libres (Creative Commons CC-BY-SA ou domaine public) ».

Sur 562 photos joueurs : **514 viennent de Wikimedia**, mais **48 sont servies
par `cdn.nba.com`**, le CDN de la NBA, qui n'est pas Creative Commons. Les 30
logos d'équipes viennent également de `cdn.nba.com`.

---

## 5. Plan de repli

Le risque le plus immédiat n'est pas juridique, il est opérationnel : une
source non contractuelle peut cesser de répondre sans préavis. **C'est déjà
arrivé** — `stats.nba.com` accepte la connexion TCP puis ne répond plus
(vérifié à deux reprises le 12 août 2026, 25 s et 45 s sans réponse).

### Si ESPN devient injoignable

ESPN alimente aujourd'hui les matchs, box scores, classements et playoffs —
et, indirectement, les moyennes de la saison en cours.

| Horizon | Effet | Réponse |
|---|---|---|
| Quelques heures | Aucun. Les données restent en base, le site fonctionne. | Le contrôle « Fraîcheur sync quotidienne » alerte au-delà de 36 h. |
| Quelques jours | Les matchs récents manquent. Les moyennes se figent. | Le bandeau de fraîcheur informe ; l'historique reste consultable. |
| Durable | Plus d'actualisation possible. | Bascule vers une source contractuelle. |

**Ce qui est déjà en place :** l'alerte se déclenche seule (workflow au rouge,
notification GitHub), les données historiques sont en base et ne dépendent
plus d'aucun appel, et le site reste entièrement navigable hors saison.

**Ce qui manque :** aucune source de secours n'est branchée. BALLDONTLIE est la
seule candidate contractuelle identifiée, mais ses endpoints statistiques
(`/season_averages`, `/stats`) exigent un palier payant — vérifié le 12 août
2026, la clé actuelle reçoit une réponse 401.

### Procédure de remplacement d'un fournisseur

1. **Constater** : la synchro échoue, `SyncLog` et le contrôle de fraîcheur le
   montrent. Une panne de 3 jours au plus se rattrape seule (la synchro relit
   J-3 à J+2) ; au-delà, si ESPN revient, `pnpm backfill:games` reprend le
   calendrier et `pnpm tsx scripts/sync-box-scores.ts` les box scores manquants. On ne bascule que si la panne dure plus d'une semaine.
2. **Choisir** la source : BALLDONTLIE en palier payant pour les matchs et box
   scores, ou toute source contractuelle équivalente.
3. **Écrire un seul script** `scripts/sync-<source>.ts` qui remplit les mêmes
   tables (`Game`, box scores, `TeamSeason`) avec les mêmes identifiants
   d'équipes ; la correspondance des statuts passe par `lib/game-status.ts`.
4. **Recalculer** les moyennes de la saison : elles viennent de nos box scores
   (décision 001), donc rien ne change côté pages.
5. **Contrôler** avec `pnpm health:data` et `pnpm check:rollover`, puis
   brancher le script dans la synchro quotidienne et mettre à jour la page
   Sources, ce registre et `lib/data-sources.ts`.

Les pages ne lisent que la base : aucune ne change.

### Coût d'un basculement

L'abstraction existe partiellement : `lib/game-status.ts` isole déjà la
correspondance des statuts, et `scripts/sync-*.ts` séparent les familles de
données. Un changement de fournisseur toucherait les scripts de
synchronisation, pas les pages.

---

## 6. Décisions à prendre

Elles ne relèvent pas de l'ingénierie :

- [x] Lire les conditions d'utilisation NBA et ESPN, et déterminer si le
      stockage durable et la republication y sont couverts. — Non couverts
      (§ 8).
- [x] Décider du niveau de risque acceptable tant que le site n'est pas
      monétisé, et de ce qui change s'il le devient. — Risque accepté pour le
      site gratuit jusqu'au bilan de fin de saison (décision 010).
- [x] Décider s'il faut souscrire un palier BALLDONTLIE pour disposer d'une
      source contractuelle de secours. — Non tant qu'ESPN répond ; c'est la
      réponse prévue à un arrêt durable (§ 5).
- [ ] Faire vérifier l'ensemble par un professionnel avant toute exploitation
      commerciale significative. — Reporté : avant toute monétisation.

Les trois écarts de la section 4 sont corrigés.

---

## 7. Références

- [Conditions d'utilisation Disney, applicables à ESPN](https://disneytermsofuse.com/english/)

- [Conditions d'utilisation NBA](https://www.nba.com/termsofuse)
- [Conditions BALLDONTLIE](https://www.balldontlie.io/terms.html)
- [Réutilisation du contenu Wikipédia](https://fr.wikipedia.org/wiki/Wikipédia:Citation_et_réutilisation_du_contenu_de_Wikipédia)
- [Licences Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Licensing)

---

## 8. Lecture des conditions d'utilisation (10 octobre 2026)

Résumé de lecture, sans valeur d'avis juridique.

**ESPN.** Aucune API publique : `site.api.espn.com` est un ensemble d'endpoints
non documentés. Les conditions Disney, qui s'appliquent à ESPN, accordent un
usage personnel et non commercial, interdisent l'extraction par script ou robot
et la redistribution. Notre usage (appel automatisé quotidien, stockage,
republication) n'y est pas couvert.

**NBA.com (NBA Stats et CDN).** Les statistiques peuvent servir à l'information
ou à un usage privé non commercial, avec une attribution visible à NBA.com,
jamais pour des paris ni des produits commerciaux, et pas dans une base
régulièrement mise à jour sans accord écrit. Logos, marques et images restent
la propriété de la NBA et des équipes : aucune licence d'usage n'est accordée.
Notre site est gratuit et informatif, mais la base historique dépasse ce cadre.

**BALLDONTLIE.** Les conditions publiées autorisent l'affichage public, le
stockage, l'archivage et la création de bases dérivées. Interdits : revendre
les données brutes, construire un service concurrent, contourner les limites
de débit. Aucune attribution exigée. Notre usage est couvert.

**Wikimedia.** CC BY-SA ou domaine public, fichier par fichier : attribution et
maintien de la licence. Fait sur chaque page joueur.

**Conséquences retenues** (décision 010) :

- le site reste gratuit, sans publicité ni abonnement, ni lien avec les paris ;
- l'export CSV ne sort que nos propres calculs (`isExportable`, décision 009) et
  la carte sociale ne montre qu'une valeur isolée, sourcée et datée ;
- le pied de page cite les sources des statistiques (ESPN et NBA.com) ;
- au bilan de fin de saison, ou avant toute monétisation : source contractuelle
  et avis d'un professionnel.
