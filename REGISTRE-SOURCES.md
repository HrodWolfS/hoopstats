# Registre des sources de données

> Inventaire factuel des données utilisées par hoopstats, de leur origine et de
> ce que nous en faisons. Établi le 12 août 2026 en relevant les appels réels
> du code et les volumes réels en base.
>
> **Ce document ne porte aucune appréciation juridique.** Il décrit les usages
> pour qu'ils puissent être soumis à quelqu'un dont c'est le métier. La colonne
> « statut » reprend la nomenclature de la feuille de route (§ 0.1) :
> *autorisé*, *à confirmer*, *à remplacer*, *à ne pas utiliser*.

---

## 1. Vue d'ensemble

| Source | Ce qu'elle fournit | Contrat | Statut |
|---|---|---|---|
| ESPN — `site.api.espn.com` | Matchs, box scores, classements, playoffs | Aucun | **à confirmer** |
| NBA Stats — `stats.nba.com` | Saisons révolues, métriques avancées | Aucun | **à confirmer** — et injoignable |
| NBA CDN — `cdn.nba.com` | Logos des 30 équipes, 48 photos joueurs | Aucun | **à confirmer** |
| BALLDONTLIE — `api.balldontlie.io` | Profils joueurs (draft, université) | Clé d'API, conditions publiées | **autorisé** sous réserve du palier |
| Wikimedia / Wikipédia | 514 photos, 4 964 biographies | CC BY-SA, domaine public | **autorisé** si attribution respectée |

Trois des cinq sources sont consommées **sans aucun accord** : ni clé, ni
inscription, ni conditions développeur acceptées.

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

### Coût d'un basculement

L'abstraction existe partiellement : `lib/game-status.ts` isole déjà la
correspondance des statuts, et `scripts/sync-*.ts` séparent les familles de
données. Un changement de fournisseur toucherait les scripts de
synchronisation, pas les pages.

---

## 6. Décisions à prendre

Elles ne relèvent pas de l'ingénierie :

- [ ] Lire les conditions d'utilisation NBA et ESPN, et déterminer si le
      stockage durable et la republication y sont couverts.
- [ ] Décider du niveau de risque acceptable tant que le site n'est pas
      monétisé, et de ce qui change s'il le devient.
- [ ] Décider s'il faut souscrire un palier BALLDONTLIE pour disposer d'une
      source contractuelle de secours.
- [ ] Faire vérifier l'ensemble par un professionnel avant toute exploitation
      commerciale significative.

Les trois écarts de la section 4 sont, eux, du ressort de l'ingénierie et
peuvent être corrigés sans attendre ces décisions.

---

## 7. Références

- [Conditions d'utilisation NBA](https://www.nba.com/termsofuse)
- [Conditions BALLDONTLIE](https://www.balldontlie.io/terms.html)
- [Réutilisation du contenu Wikipédia](https://fr.wikipedia.org/wiki/Wikipédia:Citation_et_réutilisation_du_contenu_de_Wikipédia)
- [Licences Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Licensing)
