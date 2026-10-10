# HoopStats — Feuille de route vers la référence française des statistiques NBA

> Document d'exécution produit, data et technique  
> Version : 1.0  
> Date : 4 août 2026  
> Statut : proposé — à exécuter par phases  
> Document d'origine : audit produit, audit de la base, recherche utilisateurs et benchmark concurrentiel réalisés en août 2026

---

## État d'avancement au 10 octobre 2026

À mettre à jour à chaque étape terminée : cases, reste à faire, journal.

Cases revues une à une dans le code le 10 octobre. Conventions :

- `[x]` : fait et vérifié (la preuve est entre parenthèses quand elle n'est pas évidente) ;
- `[x] ~~barré~~ Reporté` : hors du MVP gratuit de cette saison, repris au bilan
  de fin de saison ;
- `[ ]` : reste à faire pour le MVP.

| Phase | État |
|---|---|
| 0 — Fondations | Fait. |
| 1 — Fiabilité de l'usage | Fait. |
| 2 — Usages quotidiens | Fait. |
| 3 — Profondeur statistique | Reportée après la saison (décision 011) ; les 5, 10 et 20 derniers matchs existent déjà (Tendances). |
| 4 — Valider et faire connaître | 4.1 fait ; 4.2 à 4.4 abandonnés ; formulaire 4.5 en ligne ; le reste après la saison. |

### Reste à faire pour le MVP

Rien : **le MVP est terminé** (10 octobre). La suite est de l'exploitation
pendant la saison, pas du développement.

Reste un rendez-vous : **la reprise réelle du 20 octobre**. Relire la synchro du
matin (`SyncLog`, `pnpm check:rollover`), puis l'accueil, les matchs du 20 et
les classements une fois les premiers matchs importés. La répétition locale du
10 octobre est passée (voir le journal).

### Points ouverts

- Droits des sources : risque accepté jusqu'au bilan de fin de saison (décision 010). Pas de monétisation avant une source contractuelle et un avis juridique.
- Audience : aucune visite réelle encore observée en production depuis la garde
  du 10 octobre ; à relire en base.
- Synchro du 9 octobre partielle (un match sauté) et 46 joueurs non vérifiés,
  relevés par `check:rollover` : sans effet sur la reprise.
- Le tri par défaut du tableau des joueurs est compté comme `filter_apply` dès
  l'ouverture de la page : compteur gonflé, correction laissée de côté.
- Synchro du matin (décision 014) : active depuis le 10 octobre, jeton
  `GITHUB_DISPATCH_TOKEN` expirant le 31 juillet 2027 (à renouveler s'il faut
  aller au-delà). Premiers vrais passages du matin à confirmer par la routine
  du 20 octobre.
- Colonne NET de la page Saisons toujours vide : `netRating` absent en base
  pour les 30 équipes de 2023-24 à 2025-26 (constaté le 10 oct., antérieur à
  la règle d'arrondi).

### Journal

| Date | Fait |
|---|---|
| 10 oct. | Parcours mobiles de bout en bout (`check:journeys`) après chaque mise en production et chaque matin ; décision 012. |
| 10 oct. | Garde d'audience : seul le déploiement de production enregistre ; `check:mobile` et `check:journeys` n'envoient plus rien. |
| 10 oct. | Audience nettoyée : 476 pages vues et 16 visites retirées (contrôles automatiques des 8 au 10 oct. et une visite de développement), sauvegarde dans `backups/`. Il reste 27 pages vues et 3 visites probablement humaines. |
| 10 oct. | Répétition de la bascule (date simulée 20 oct. 05:00 UTC, build local) : pages en 2026-27, saison vide annoncée, fiches joueurs sur 2025-26. Corrigé : l'« affiche à venir » se choisit sur les bilans 2025-26 tant que personne n'a joué ; `check:mobile` remonte au dernier jour de matchs ; `check:journeys` accepte un classement vide annoncé. |
| 10 oct. | Feuille de route revue case par case : 154 cases cochées après vérification dans le code, 48 reportées après la saison ou écartées, 9 restantes pour le MVP. |
| 10 oct. | Droits des sources (0.1) : conditions ESPN, NBA.com, BALLDONTLIE et Wikimedia relues ; registre complété (fiche par source, procédure de remplacement) ; décision 010 : ESPN principale, risque accepté jusqu'au bilan ; sources des statistiques citées en pied de page. Liste du § 11, déjà faite, cochée. Reste 2 cases. |
| 10 oct. | Règle d'arrondi commune (0.2, décision 013) : moyennes et notes à 1 décimale, pourcentages sur 100, écarts signés avec vrai signe moins, totaux entiers ; graphiques, analyses d'équipe, tendances, carrière et images de partage passent par `lib/format.ts` ; le CSV garde un nombre lisible par le tableur ; 7 tests. Reste 1 case. |
| 10 oct. | Relecture CNIL (4.1) : la mesure d'audience remplit les conditions d'exemption de consentement ; deux écarts corrigés — compteurs effacés au bout de 25 mois au lieu de « sans limite », plus aucune écriture dans le stockage de session après un refus de mesure ; durées revues à chaque bilan de fin de saison. **MVP terminé.** |
| 10 oct. | Résultats au réveil (décision 014) : le cron GitHub partait 5 à 7 h en retard (12 h – 14 h à Paris) ; un cron Vercel lance désormais la synchro à la demande vers 6 h et 8 h, l'horaire GitHub reste en secours ; contrôle mobile après chaque synchro. |
| 10 oct. | Synchro du matin activée : jeton `GITHUB_DISPATCH_TOKEN` posé dans Vercel (production) ; essai depuis Vercel → synchro lancée sur GitHub sans attente (réussie en 5 min), puis contrôle mobile enchaîné (réussi). |

---

## 1. Vision

HoopStats doit devenir le réflexe des fans francophones lorsqu'ils veulent **trouver, comprendre et partager une statistique NBA**.

Le produit ne cherche pas à concurrencer :

- TrashTalk sur l'actualité ;
- First Team sur la vidéo ;
- les réseaux sociaux sur la réaction à chaud ;
- les applications de paris ou de fantasy sur leurs usages spécialisés.

### Proposition de valeur

> HoopStats est la manière la plus rapide de trouver, comprendre et partager une statistique NBA en français.

### Promesse utilisateur

Un utilisateur doit pouvoir, en moins d'une minute :

1. trouver le joueur, l'équipe, le match ou la saison recherchée ;
2. obtenir une réponse exacte et à jour ;
3. comprendre le contexte du chiffre affiché ;
4. approfondir avec des filtres ou une comparaison ;
5. partager ou citer le résultat.

### Positionnement à défendre

HoopStats ne gagnera pas par le nombre de tableaux. Le produit doit gagner sur cinq qualités :

1. **fiabilité** — données cohérentes, contrôlées et traçables ;
2. **fraîcheur** — mise à jour automatique et horodatée ;
3. **rapidité** — réponse accessible en quelques interactions ;
4. **compréhension** — définitions, contexte, percentiles et limites ;
5. **partage** — URLs persistantes, exports et visuels réutilisables.

---

## 2. Public prioritaire

Le produit ne doit pas tenter de satisfaire tous les amateurs de NBA dès le départ.

### Cible principale

Le fan NBA francophone régulier qui :

- consulte les résultats le matin ;
- suit une équipe ou plusieurs joueurs ;
- veut comprendre une performance au-delà du score brut ;
- compare des joueurs pendant un débat ;
- utilise surtout son téléphone pour consulter et son ordinateur pour approfondir.

### Cible secondaire stratégique

Les créateurs, journalistes, podcasteurs et comptes spécialisés qui ont besoin de :

- vérifier rapidement une statistique ;
- retrouver un fait historique ;
- créer un visuel ;
- citer une source ;
- partager un lien conservant les filtres utilisés.

Ils sont moins nombreux, mais peuvent devenir les principaux prescripteurs de HoopStats.

### Segments non prioritaires

- parieurs recherchant des cotes ou conseils de mise ;
- utilisateurs recherchant uniquement de l'actualité ;
- communauté sociale généraliste ;
- fantasy avancée nécessitant blessures et données temps réel garanties ;
- WNBA, NCAA et championnats européens avant maîtrise complète du périmètre NBA.

---

## 3. Besoins utilisateurs à couvrir

| Besoin | Question utilisateur typique | Réponse attendue |
|---|---|---|
| Rattraper la nuit | « Qu'est-ce qui s'est passé cette nuit ? » | Résultats, performances, tendances et accès aux box scores |
| Vérifier un chiffre | « Combien Brunson marque-t-il en playoffs ? » | Valeur, période, source, dernière mise à jour |
| Mettre en contexte | « Est-ce un bon TS% ? » | Moyenne de ligue, percentile, définition et volume |
| Comparer | « Qui est meilleur sur cette saison ? » | Même période, mêmes unités et tailles d'échantillon visibles |
| Mesurer une progression | « Wembanyama progresse-t-il ? » | Courbe, variation, rôle, minutes et contexte |
| Explorer l'histoire | « Qui a déjà réussi cette performance ? » | Recherche multicritère et résultats partageables |
| Comprendre une équipe | « Pourquoi cette équipe gagne-t-elle ? » | ORtg, DRtg, rythme, facteurs clés et tendances |
| Suivre les Français | « Comment ont joué les Français cette nuit ? » | Hub dédié et statistiques récentes |
| Publier ou argumenter | « Puis-je réutiliser ce résultat ? » | Permalien, image, export et attribution |

Chaque écran statistique important doit suivre quatre niveaux de lecture :

1. **réponse immédiate** ;
2. **contexte** : rang, percentile, moyenne et évolution ;
3. **détail** : tableau, filtres et historique ;
4. **méthode** : définition, formule, source et limites.

---

## 4. État initial du produit

### Forces à conserver

- pages joueurs, équipes, matchs et saisons déjà structurées ;
- explorateur avec filtres, qualifications, percentiles et URLs partageables ;
- comparateur existant ;
- historique, playoffs, trophées et Draft ;
- pages de box score ;
- guides et définitions en français ;
- sources, méthodologie et contrôle de santé des données ;
- architecture SEO avec métadonnées, sitemap et données structurées ;
- base contenant plusieurs décennies de saisons et plusieurs milliers de joueurs.

### Faiblesses bloquantes connues

- agrégats `PlayerSeason` non synchronisés par le traitement quotidien ;
- absence de lignes consolidées `TOT` fiables pour certains joueurs transférés ;
- moyenne de carrière calculée à partir de moyennes de lignes, sans pondération par les matchs ;
- comparaison pouvant utiliser deux saisons différentes sans intention explicite ;
- recherche limitée aux joueurs ayant une saison actuelle ;
- incohérences entre les sélecteurs et paramètres de saison ;
- substitutions silencieuses lorsqu'une saison demandée n'est pas disponible ;
- quelques écarts entre scores finaux et sommes des box scores ;
- quelques matchs conservant un statut obsolète ;
- passage de saison encore dépendant de constantes et de mises à jour manuelles ;
- instrumentation produit insuffisante pour mesurer activation et rétention.

### Diagnostic

HoopStats est aujourd'hui davantage une **bonne encyclopédie statistique** qu'une **référence quotidienne**. Les phases ci-dessous doivent être réalisées dans l'ordre : une fonctionnalité avancée ne doit jamais être prioritaire sur l'exactitude de la donnée qu'elle exploite.

---

## 5. Principes d'exécution

### Règles de priorité

1. Une erreur statistique passe avant une amélioration visuelle.
2. Une mise à jour automatique passe avant un enrichissement manuel annuel.
3. Un parcours mobile validé passe avant une nouvelle rubrique.
4. Une fonctionnalité répondant à une question observée passe avant une idée supposée utile.
5. Une métrique non expliquée n'est pas considérée comme terminée.
6. Une donnée dont les droits ne sont pas clarifiés ne doit pas devenir une dépendance stratégique.

### Définition globale de « terminé »

Une fonctionnalité est terminée lorsque :

- le comportement nominal est implémenté ;
- les états vide, chargement, indisponible et erreur sont traités ;
- l'affichage mobile a été vérifié ;
- les calculs sensibles sont testés ;
- les sources et dates sont affichées si nécessaire ;
- les URLs sont persistantes et partageables ;
- l'événement analytique utile est instrumenté ;
- `pnpm lint`, `pnpm build` et `pnpm health:data` passent ;
- la documentation concernée est mise à jour.

### Portes de passage entre phases

- La phase 1 ne commence pas tant que les calculs critiques de la phase 0 ne sont pas fiables.
- La phase 2 ne doit pas être communiquée largement sans fraîcheur automatisée et visible.
- La phase 3 nécessite une source de données autorisée et une demande utilisateur observée.
- La phase 4 ne déclenche une acquisition significative que lorsque les critères de lancement sont atteints.

---

## 6. Vue d'ensemble des phases

| Phase | Objectif | Résultat principal | Durée indicative |
|---|---|---|---:|
| Phase 0 | Sécuriser la confiance | Données fiables, fraîches, testées et juridiquement soutenables | 2 à 4 semaines |
| Phase 1 | Tenir la promesse centrale | Recherche, saisons et comparaisons cohérentes | 2 à 4 semaines |
| Phase 2 | Créer l'usage quotidien | Accueil de la nuit, tendances, Français et partage | 3 à 5 semaines |
| Phase 3 | Construire la profondeur | Recherche historique, splits et analyses avancées | Selon données et validation |
| Phase 4 | Valider et faire connaître | Mesure d'audience, boucle d'apprentissage et acquisition maîtrisée | Transverse puis continue |

Les estimations supposent un développement individuel à temps partiel. Elles servent à ordonner le travail, pas à imposer une date de sortie.

---

# Phase 0 — Sécuriser la confiance

## 0.1 Audit des droits et des fournisseurs

### Objectif

Éviter de bâtir l'acquisition et la monétisation sur une source pouvant être coupée ou dont l'utilisation est incompatible avec HoopStats.

### Actions

- [x] Inventorier chaque famille de données et sa source actuelle : joueurs, saisons, matchs, box scores, standings, playoffs, Draft, trophées, photos et logos (`REGISTRE-SOURCES.md`).
- [x] Pour chaque source, documenter : endpoint, licence, droit de stockage, droit d'affichage, attribution, limites de débit, coût, stabilité et solution de secours. (`REGISTRE-SOURCES.md` § 1, fiche par source)
- [x] Relire les conditions NBA, BALLDONTLIE, ESPN et Wikimedia applicables. (registre § 8, 10 oct.)
- [x] ~~Obtenir une confirmation écrite du fournisseur principal concernant le stockage, l'affichage public, les données dérivées et la monétisation~~ Reporté : avant toute monétisation, au bilan de fin de saison.
- [x] ~~Faire vérifier les points sensibles par un professionnel du droit avant une exploitation commerciale significative~~ Reporté : avant toute monétisation, au bilan de fin de saison.
- [x] Définir un fournisseur principal et un fournisseur de secours pour les données indispensables. (décision 010 : ESPN, BALLDONTLIE payant en cas d'arrêt durable)
- [x] Documenter une procédure de remplacement du fournisseur sans refonte du produit. (registre § 5)

### Livrable

Un registre des sources et licences, avec une décision explicite : **autorisé**, **à confirmer**, **à remplacer** ou **à ne pas utiliser**.

### Critère de sortie

Aucune donnée critique du lancement ne dépend d'une source classée « à confirmer » sans stratégie de repli acceptée.

---

## 0.2 Contrat de données et provenance

### Objectif

Rendre la provenance, la période et la fraîcheur explicites dans le modèle et dans l'interface.

### Actions

- [x] Créer un catalogue des métriques avec identifiant, libellé, unité, formule, source et limites (`lib/stats/metrics.ts`).
- [x] Définir les notions de saison régulière, play-in, playoffs, NBA Cup et présaison.
- [x] Définir une politique unique pour les joueurs transférés et les lignes `TOT`.
- [x] Définir une politique d'arrondi commune aux cartes, tableaux, graphiques et exports. (décision 013, `lib/format.ts`, `tests/format.test.ts`)
- [x] Ajouter ou normaliser les champs de provenance et `updatedAt` nécessaires (`DATA_ORIGINS` et `SyncLog`).
- [x] Distinguer visuellement les données officielles, importées, calculées et estimées (Officielle, importée, calculée).
- [x] Ajouter un composant réutilisable « Source et mise à jour » (`SourceNote`, 7 pages).

### Critères d'acceptation

- chaque métrique exposée possède une définition ;
- chaque page critique affiche une date de mise à jour ;
- aucune métrique calculée n'est présentée comme une donnée officielle ;
- les mêmes filtres produisent les mêmes résultats sur toutes les pages.

---

## 0.3 Correction de l'intégrité statistique

### Objectif

Supprimer les erreurs susceptibles de faire perdre immédiatement la confiance.

### Actions

- [x] Produire une seule ligne consolidée `TOT` par joueur et par saison, sans double comptage des passages en équipe.
- [x] Recalculer les moyennes de carrière à partir des totaux et des matchs joués.
- [x] Ne jamais additionner naïvement des pourcentages ou des moyennes par match.
- [x] Corriger la détermination des vainqueurs de séries de playoffs.
- [x] Empêcher le fallback silencieux vers une saison différente.
- [x] Forcer les comparaisons à utiliser la même saison par défaut.
- [x] Résoudre ou documenter chaque écart entre score final et somme des lignes individuelles.
- [x] Corriger les matchs restés dans un statut obsolète.
- [x] Vérifier les saisons manquantes ou incomplètes des playoffs.
- [x] Auditer les champs BPM, VORP et Win Shares ; les masquer tant qu'ils ne sont pas alimentés correctement.

### Tests minimaux

- [x] joueur resté dans une seule équipe ;
- [x] joueur transféré une fois ;
- [x] joueur ayant trois équipes ou plus ;
- [x] saison partielle ;
- [x] joueur sans match ;
- [x] égalité dans un classement ;
- [x] seuil minimum de matchs ou minutes ;
- [x] saison régulière et playoffs ;
- [x] série gagnée par l'équipe la moins bien classée ;
- [x] match avec prolongation.

### Critères de sortie

- zéro erreur connue dans les calculs critiques ;
- zéro doublon visible dans les classements ;
- les valeurs de contrôle concordent avec une seconde source sur un échantillon défini ;
- `pnpm health:data` ne retourne aucun échec bloquant.

---

## 0.4 Automatisation de la fraîcheur

### Objectif

Supprimer la synchronisation manuelle des statistiques joueurs et détecter les mises à jour incomplètes.

### Actions

- [x] Intégrer `PlayerSeason` au pipeline quotidien ou choisir une source exécutable depuis l'infrastructure de production.
- [x] Séparer les étapes : matchs, box scores, agrégats joueurs, standings, équipes et dérivés.
- [x] Rendre chaque étape idempotente et relançable indépendamment (scripts lançables seuls, écritures en upsert).
- [x] ~~Écrire un `SyncLog` précis pour chaque famille de données~~ Reporté : Un journal par synchro avec le compte de chaque famille suffit jusqu'à la fin de saison.
- [x] Ajouter une alerte lorsqu'une étape échoue, importe zéro ligne ou produit un volume anormal (santé `--strict` après chaque synchro : échec ou zéro ligne font échouer le workflow ; volume anormal non couvert).
- [x] Ajouter des contrôles de complétude après chaque synchronisation (`check-data-health` après chaque synchro).
- [x] ~~Invalider uniquement les caches affectés après succès.~~ Écarté : la date de fraîcheur est figée dans chaque page en cache (décision 012).
- [x] Afficher l'heure de dernière mise à jour sur l'accueil et les pages statistiques (bandeau de fraîcheur et bloc source).

### Passage automatique de saison

- [x] Centraliser la saison NBA active dans une seule source de vérité (`lib/nba.ts`).
- [x] Détecter et préparer la prochaine saison sans éditer plusieurs fichiers (une date d'ouverture par saison dans `lib/nba.ts`).
- [x] Gérer les périodes où la nouvelle saison existe mais ne contient pas encore de matchs (répétition du 10 octobre).
- [x] Ajouter un script de contrôle de bascule de saison.
- [x] Écrire un guide opératoire de début et de fin de saison.

### Critères de sortie

- aucune commande locale quotidienne requise ;
- une synchronisation échouée est visible et signalée ;
- la fraîcheur de chaque famille de données est mesurable ;
- une relance ne crée aucun doublon ;
- le passage de saison est simulé avec succès.

---

## 0.5 Tests, observabilité et sécurité opérationnelle

### Actions

- [x] Installer un socle de tests unitaires pour les calculs statistiques (vitest, 16 fichiers).
- [x] Ajouter des tests d'intégration pour recherche, classement, comparaison et changement de saison (`check:journeys` et tests unitaires).
- [x] Ajouter un parcours end-to-end mobile sur les tâches principales (`pnpm check:journeys`, workflow Mobile).
- [x] Exécuter lint, tests, build et santé des données dans la CI.
- [x] ~~Centraliser les erreurs serveur et client utiles au diagnostic~~ Reporté : Journaux Vercel et erreurs client comptées dans le pilotage suffisent pour le MVP.
- [x] Ajouter un tableau interne de fraîcheur, volumes, erreurs et anomalies (`/pilotage`).
- [x] Protéger les pages de pilotage et les endpoints de réindexation/synchronisation (mot de passe et `CRON_SECRET`).
- [x] Documenter la restauration et la correction d'une mauvaise importation.

### Livrable de phase 0

Une plateforme dont les chiffres peuvent être défendus : source connue, dernière mise à jour visible, calculs testés, erreurs détectées et passage de saison reproductible.

### Go/No-Go phase 0

- [x] droits des sources clarifiés ; (décision 010, risque accepté jusqu'au bilan)
- [x] pipeline joueurs automatisé ;
- [x] anomalies critiques corrigées ;
- [x] tests critiques présents ;
- [x] aucune donnée morte affichée ;
- [x] fraîcheur visible publiquement ;
- [x] alertes opérationnelles fonctionnelles (échec de synchro ou santé en rouge).

---

# Phase 1 — Tenir la promesse centrale

## 1.1 Unifier la notion de saison

### Actions

- [x] Créer un contexte ou contrat unique de saison utilisable par toutes les pages.
- [x] Utiliser un nom de paramètre unique dans les URLs.
- [x] Définir clairement la relation entre année de Draft et saison NBA.
- [x] Aligner accueil, joueurs, équipes, classements, trophées, playoffs, Draft et comparateur.
- [x] Ajouter des URLs canoniques par saison lorsque le contenu change réellement.
- [x] Conserver le choix de saison pendant la navigation lorsque cela a du sens.
- [x] Afficher un état vide explicite lorsqu'une saison ne possède pas de données.
- [x] Retirer du sitemap les pages futures sans contenu utile.

### Critères d'acceptation

- changer la saison ne produit aucune incohérence de contexte ;
- copier l'URL restitue exactement la même vue ;
- aucune page ne remplace silencieusement la saison demandée ;
- les moteurs de recherche n'indexent pas des pages vides dupliquées.

---

## 1.2 Refaire la recherche globale

### Objectif

Trouver n'importe quel joueur ou équipe de l'historique en quelques secondes.

### Actions

- [x] Retirer la contrainte imposant une saison actuelle aux joueurs.
- [x] Rechercher prénom, nom, nom complet, équipe et abréviation.
- [x] Normaliser accents, apostrophes, traits d'union et caractères spéciaux.
- [x] Prévoir une table d'alias pour surnoms et changements de noms.
- [x] Afficher l'équipe actuelle, la dernière équipe connue ou les années de carrière selon le cas.
- [x] Ajouter des résultats « aucune correspondance » utiles.
- [x] Instrumenter recherches réussies et sans résultat sans conserver inutilement de données personnelles.
- [x] Réutiliser exactement le même moteur dans la palette globale et le comparateur.

### Critères d'acceptation

- les stars actuelles et légendes historiques sont trouvables ;
- les noms accentués sont trouvables sans accent ;
- la recherche mobile est utilisable au clavier ;
- moins de 10 % de recherches sans résultat, hors requêtes hors périmètre.

---

## 1.3 Fiabiliser le comparateur

### Actions

- [x] Ajouter un sélecteur de saison pour chaque joueur.
- [x] Activer « même saison » par défaut.
- [x] Ajouter un mode joueur contre lui-même entre deux saisons.
- [x] ~~Distinguer saison régulière et playoffs lorsque les données le permettent~~ Reporté : Pas de statistiques joueur de playoffs par match en base.
- [x] Afficher matchs, minutes et volume à côté des moyennes.
- [x] Comparer aux moyennes de ligue et aux percentiles pertinents.
- [x] Signaler les tailles d'échantillon faibles.
- [x] Conserver joueurs, saisons et métriques dans l'URL.
- [x] Produire une carte ou image partageable.

### Critères d'acceptation

- aucune comparaison involontaire de saisons différentes ;
- les unités et périodes sont identiques des deux côtés ;
- le résultat est compréhensible sur mobile ;
- le lien partagé restitue la comparaison complète.

---

## 1.4 Renforcer pages joueurs et équipes

### Pages joueurs

- [x] Afficher totaux et moyennes exactes.
- [x] Ajouter matchs joués, titularisations et minutes.
- [x] Afficher les volumes de tirs avec les pourcentages.
- [x] Proposer carrière, saison sélectionnée et matchs récents sans ambiguïté.
- [x] Étendre le journal des matchs au-delà des 25 derniers avec pagination.
- [x] Ajouter trophées, votes et faits de carrière structurés.
- [x] Rendre les définitions de métriques accessibles depuis les colonnes.

### Pages équipes

- [x] Afficher ORtg, DRtg, Net Rating et Pace déjà disponibles.
- [x] Aligner l'historique et les matchs sur la saison sélectionnée.
- [x] Ajouter les tendances récentes et adversaires rencontrés.
- [x] Afficher clairement le résultat de playoffs et sa source.

### Livrable de phase 1

Un utilisateur peut rechercher n'importe quel acteur NBA, naviguer dans une saison cohérente et produire une comparaison statistiquement correcte et partageable.

### Go/No-Go phase 1

- [x] recherche historique fonctionnelle ;
- [x] sélecteur unifié ;
- [x] comparateur cohérent ;
- [x] totaux et volumes disponibles ;
- [x] pages joueurs et équipes sans fallback trompeur ;
- [x] cinq tâches utilisateurs principales réussies sur mobile.

---

# Phase 2 — Créer l'usage quotidien

## 2.1 Repenser l'accueil : « La nuit NBA en chiffres »

### Objectif

Donner une raison de consulter HoopStats chaque matin sans transformer le site en média d'actualité.

### Contenu automatique recommandé

- [x] résultats des derniers matchs terminés ;
- [x] trois performances majeures selon une règle documentée ;
- [x] performances des joueurs français ;
- [x] joueur ou équipe en plus forte progression récente ;
- [x] série active ou changement de classement notable ;
- [x] match important à venir ;
- [x] accès immédiat aux box scores et profils.

### Règles produit

- le contenu doit être généré à partir des données, pas saisi manuellement chaque saison ;
- chaque carte doit expliquer pourquoi elle est mise en avant ;
- l'accueil ne doit pas devenir un fil d'articles ;
- en l'absence de matchs récents, afficher tendances, historique ou prochain rendez-vous utile ;
- l'heure de dernière mise à jour doit être visible.

### Critères d'acceptation

- aucun nom, champion ou saison n'est codé en dur dans le héros ;
- l'accueil reste pertinent un jour sans match ;
- toutes les cartes pointent vers un approfondissement statistique ;
- les données correspondent au dernier pipeline réussi.

---

## 2.2 Ajouter les tendances récentes

### Actions

- [x] Calculer les fenêtres 5, 10 et 20 derniers matchs.
- [x] Afficher l'évolution contre la moyenne de saison.
- [x] Distinguer volume, efficacité et temps de jeu.
- [x] Ajouter une taille minimale d'échantillon.
- [x] Permettre le tri et le partage des tendances.
- [x] Documenter le traitement des matchs non joués et transferts.

### Questions couvertes

- Qui est en forme ?
- Qui progresse ou régresse ?
- Une série récente est-elle durable ou liée à un faible volume ?
- Quel joueur a changé de rôle ?

---

## 2.3 Créer le hub « Français en NBA »

### Contenu

- [x] liste vérifiée des joueurs français actifs et historiques ;
- [x] performances de la nuit ;
- [x] statistiques saison et tendances récentes ;
- [x] calendrier des prochains matchs ;
- [x] classement comparatif entre Français ;
- [x] pages individuelles et historique de carrière ;
- [x] URL stable et indexable.

### Vigilance

Définir explicitement le critère d'inclusion : nationalité sportive, naissance, sélection nationale ou double nationalité. La règle doit être documentée et appliquée uniformément.

---

## 2.4 Améliorer matchs et calendrier

### Actions

- [x] remplacer la fenêtre courte par une navigation par date ;
- [x] ajouter calendrier complet de la saison ;
- [x] proposer précédent/suivant et filtres par équipe ;
- [x] distinguer matchs à venir, en cours, terminés et reportés ;
- [x] afficher quart-temps, prolongations et leaders ;
- [x] ajouter les liens entre match, joueurs et équipes ;
- [x] ~~contrôler les incohérences de score avant publication~~ Reporté : Le contrôle d'écart tourne après publication, chaque matin.

---

## 2.5 Partage et export

### Actions

- [x] préserver les filtres et tris dans les URLs ;
- [x] ajouter un bouton de copie de lien ;
- [x] générer une carte sociale lisible avec valeur, contexte, date et marque HoopStats ;
- [x] exporter les tableaux autorisés en CSV ;
- [x] ajouter l'attribution et la date de mise à jour aux exports ;
- [x] instrumenter copie, partage et export.

### Livrable de phase 2

HoopStats devient utile au réveil, suit naturellement les joueurs français et transforme chaque exploration en contenu partageable.

### Go/No-Go phase 2

- [x] accueil entièrement automatique ;
- [x] données récentes visibles et fiables ;
- [x] tendances testées ;
- [x] hub français complet ;
- [x] calendrier navigable ;
- [x] partage et export conformes aux droits des données ; (export limité à nos calculs, décisions 009 et 010)
- [x] ~~amélioration mesurable du retour à J7 dans le pilotage~~ Reporté : Mesurable seulement avec du trafic : bilan de fin de saison.

---

# Phase 3 — Construire la profondeur statistique

Cette phase est conditionnelle. Chaque chantier doit passer deux portes :

1. la donnée nécessaire est disponible avec des droits compatibles ;
2. le besoin a été observé dans les recherches, les demandes ou les usages.

## 3.1 Splits déterministes

- [x] ~~saison régulière contre playoffs~~ Reporté : Après la saison (décision 011).
- [x] ~~domicile contre extérieur~~ Reporté : Après la saison (décision 011).
- [x] ~~victoires contre défaites~~ Reporté : Après la saison (décision 011).
- [x] ~~titulaire contre remplaçant~~ Reporté : Après la saison (décision 011).
- [x] ~~avant et après une date ou un transfert~~ Reporté : Après la saison (décision 011).
- [x] ~~face à une équipe ou un adversaire~~ Reporté : Après la saison (décision 011).
- [x] cinq, dix et vingt derniers matchs (page Tendances).

## 3.2 Recherche historique de performances

### Première version

- [x] ~~choisir une ou plusieurs métriques~~ Reporté : Après la saison (décision 011).
- [x] ~~définir minimum et maximum~~ Reporté : Après la saison (décision 011).
- [x] ~~filtrer saison, playoffs, équipe, joueur et adversaire~~ Reporté : Après la saison (décision 011).
- [x] ~~ordonner les résultats~~ Reporté : Après la saison (décision 011).
- [x] ~~partager la requête~~ Reporté : Après la saison (décision 011).
- [x] ~~exporter le résultat~~ Reporté : Après la saison (décision 011).

### Exemples à supporter

- matchs à au moins 40 points et 10 passes ;
- meilleures performances d'un rookie français ;
- séries de matchs à plus de 30 points ;
- joueurs ayant atteint des seuils de carrière ;
- face-à-face entre deux joueurs ou équipes.

## 3.3 Statistiques équipes avancées

- [x] ~~quatre facteurs : eFG%, pertes de balle, rebond offensif et lancers francs~~ Reporté : Après la saison (décision 011).
- [x] ~~rang et percentile de ligue~~ Reporté : Après la saison (décision 011).
- [x] ~~évolution dans le temps~~ Reporté : Après la saison (décision 011).
- [x] ~~profils attaque/défense~~ Reporté : Après la saison (décision 011).
- [x] ~~explication française courte pour chaque indicateur~~ Reporté : Après la saison (décision 011).

## 3.4 Données de possession et tracking

À développer seulement avec une source soutenable :

- [x] ~~lineups~~ Reporté : Après la saison (décision 011).
- [x] ~~on/off~~ Reporté : Après la saison (décision 011).
- [x] ~~clutch~~ Reporté : Après la saison (décision 011).
- [x] ~~shot charts~~ Reporté : Après la saison (décision 011).
- [x] ~~zones de tir~~ Reporté : Après la saison (décision 011).
- [x] ~~rythme et possessions nettoyées~~ Reporté : Après la saison (décision 011).
- [x] ~~touches, drives, passes ou matchup data~~ Reporté : Après la saison (décision 011).

### Exigences supplémentaires

- afficher le nombre de possessions ou tentatives ;
- expliquer les exclusions éventuelles ;
- distinguer calcul exact et estimation ;
- prévenir lorsque l'échantillon est trop faible ;
- éviter un score propriétaire opaque sans validation méthodologique.

## 3.5 Recherche en langage naturel

Cette fonctionnalité arrive en dernier, au-dessus d'un moteur déterministe déjà fiable.

- [x] ~~traduire la question en filtres structurés~~ Reporté : Après la saison (décision 011).
- [x] ~~afficher la requête interprétée avant ou avec le résultat~~ Reporté : Après la saison (décision 011).
- [x] ~~refuser proprement les questions non couvertes~~ Reporté : Après la saison (décision 011).
- [x] ~~ne jamais inventer une réponse~~ Reporté : Après la saison (décision 011).
- [x] ~~conserver un lien vers la vue filtrée reproductible~~ Reporté : Après la saison (décision 011).
- [x] ~~mesurer les catégories de questions sans stocker inutilement du texte sensible~~ Reporté : Après la saison (décision 011).

### Livrable de phase 3

Un moteur d'exploration capable de répondre aux questions complexes que les tableaux généralistes ne couvrent pas facilement.

---

# Phase 4 — Valider, apprendre et faire connaître

La validation commence pendant la phase 0 et accompagne toutes les phases suivantes.

## 4.1 Instrumentation produit

### Événements minimaux

- [x] `page_view` avec type de page ;
- [x] `search_submitted` avec catégorie et succès, sans requête brute si inutile ;
- [x] `season_changed` ;
- [x] `filter_applied` avec famille de filtre ;
- [x] `comparison_started` et `comparison_completed` ;
- [x] `share_clicked` ;
- [x] `export_completed` ;
- [x] `metric_definition_opened` ;
- [x] `data_freshness_warning_seen` ;
- [x] erreur fonctionnelle ou technique anonymisée.

### Indicateurs

- visiteurs et visites par semaine ;
- activation : recherche ou exploration réussie ;
- temps nécessaire pour obtenir une réponse ;
- recherches sans résultat ;
- complétion des comparaisons ;
- partages et exports ;
- retour à J7 et J28 ;
- pages d'entrée et parcours suivants ;
- répartition mobile/ordinateur ;
- disponibilité et fraîcheur des données.

### Vie privée

- [x] limiter la collecte à ce qui sert une décision produit ;
- [x] éviter les identifiants directs et requêtes brutes lorsqu'ils ne sont pas nécessaires ;
- [x] documenter la configuration de mesure d'audience ;
- [x] vérifier la conformité avec les recommandations de la CNIL (décision 008, relecture du 10 octobre : compteurs effacés après 25 mois, durées revues à chaque bilan) ;
- [x] définir une durée de conservation raisonnable.

---

## 4.2 à 4.4 Entretiens, tests de tâches et bêta — abandonnés

Décision du 8 octobre 2026 : hoopstats est un projet gratuit, tenu par un fan, pensé comme un MVP jusqu'à la fin de la saison. Pas de recrutement, d'entretiens, de tests encadrés ni de bêta à cohorte.

L'utilité se juge sur les signaux passifs déjà en place (pilotage) :

- activation et temps jusqu'à la réponse (objectif : 70 % en moins d'une minute) ;
- recherches sans résultat (objectif : moins de 10 %, hors requêtes hors périmètre) ;
- retour à J7 et J28 ;
- usage de la comparaison, du partage et de l'export ;
- demandes reçues sur « Quelle statistique cherchez-vous ? » ;
- anomalies détectées par `health:data`.

Bilan à la fin de la saison : selon la fréquentation, décider de la suite (dont d'éventuels revenus).

---

## 4.5 Test concierge des demandes avancées

Avant de développer un moteur complexe :

- [x] ajouter « Quelle statistique cherchez-vous ? »  (page `/demande`);
- [x] ~~traiter manuellement les 50 premières demandes~~ Reporté : Après la saison, selon les demandes reçues.
- [x] ~~classer les questions : tendances, splits, records, face-à-face, Français, lineups, tirs, clutch, fantasy~~ Reporté : Après la saison, selon les demandes reçues.
- [x] ~~mesurer fréquence, difficulté et récurrence~~ Reporté : Après la saison, selon les demandes reçues.
- [x] ~~ne construire que les deux catégories les plus fréquentes et compatibles avec les données~~ Reporté : Après la saison, selon les demandes reçues.

---

## 4.6 Acquisition après validation

### Axes éditoriaux compatibles avec le positionnement

- « La nuit NBA en chiffres » ;
- suivi des Français en NBA ;
- comparaisons liées aux débats du moment ;
- records et performances rares ;
- explications pédagogiques de métriques.

### Mécanique

- chaque publication mène à une page ou requête HoopStats ;
- chaque lien utilise un marquage de campagne ;
- mesurer impression, clic, activation, partage et retour ;
- privilégier les outils interactifs difficiles à remplacer par une réponse instantanée d'un moteur de recherche ;
- travailler les créateurs comme partenaires de distribution, pas uniquement comme audience.

### Condition de lancement public soutenu

- [x] ~~droits des données clarifiés~~ Reporté : Après la saison (4.6).
- [x] ~~aucune anomalie critique ouverte~~ Reporté : Après la saison (4.6).
- [x] ~~fraîcheur automatique visible~~ Reporté : Après la saison (4.6).
- [x] ~~réussite des tâches principales~~ Reporté : Après la saison (4.6).
- [x] ~~premiers signaux de retour récurrent~~ Reporté : Après la saison (4.6).
- [x] ~~capacité opérationnelle à corriger une mauvaise donnée rapidement~~ Reporté : Après la saison (4.6).

---

## 7. Backlog dépriorisé

Les éléments suivants restent hors du chemin critique :

- application native ;
- fil d'actualité généraliste ;
- production vidéo ;
- commentaires et réseau social ;
- paris, cotes et recommandations de mise ;
- expansion vers d'autres ligues ;
- alertes personnalisées avant validation d'une fréquence suffisante ;
- comptes utilisateurs complets avant nécessité réelle ;
- métrique propriétaire opaque ;
- textes éditoriaux automatiques longs et génériques ;
- équipes légendaires ou « meilleurs cinq » comme éléments principaux de navigation.

Les contenus déjà présents peuvent rester accessibles par le footer, les moteurs de recherche ou une rubrique secondaire, mais ne doivent pas détourner l'utilisateur de la promesse statistique.

---

## 8. Registre des risques

| Risque | Probabilité | Impact | Réponse |
|---|---:|---:|---|
| Source de données incompatible juridiquement | Moyenne | Critique | Validation écrite, fournisseur autorisé et solution de secours |
| Statistiques joueurs décalées | Élevée | Critique | Pipeline automatique, horodatage et alertes |
| Erreur visible dans un classement | Moyenne | Élevé | Tests, contrôles croisés et politique `TOT` |
| Trop de fonctionnalités pour une maintenance individuelle | Élevée | Élevé | Portes de validation et backlog strict |
| Faible retour après une visite SEO | Élevée | Élevé | Accueil quotidien, tendances et favoris après validation |
| Le français seul ne différencie pas | Élevée | Élevé | Vitesse, contexte, comparaison et partage |
| Complexité excessive des statistiques avancées | Moyenne | Élevé | Lecture progressive et définitions courtes |
| Acquisition SEO captée par les réponses IA | Moyenne | Moyen à élevé | Privilégier explorations, outils et URLs interactives |
| Mauvaise expérience mobile des tableaux | Moyenne | Élevé | Tests de tâches réels et vues adaptées |
| Coût ou indisponibilité d'un fournisseur | Moyenne | Élevé | Abstraction de source, cache autorisé et budget prévisionnel |

---

## 9. Indicateurs directeurs

### North Star Metric

**Nombre hebdomadaire d'utilisateurs qui obtiennent une réponse statistique utile**, défini par au moins une action d'activation :

- recherche réussie suivie d'une consultation ;
- comparaison terminée ;
- filtre appliqué avec résultat ;
- partage ou export ;
- consultation approfondie d'un joueur, d'une équipe ou d'un match après l'accueil.

### Qualité des données

- fraîcheur médiane par famille ;
- pourcentage de synchronisations réussies ;
- nombre d'anomalies critiques ;
- délai moyen de correction ;
- taux de concordance avec l'échantillon de contrôle.

### Valeur utilisateur

- taux de réussite des tâches ;
- temps médian avant réponse ;
- recherches sans résultat ;
- comparaisons terminées ;
- partages et exports ;
- retour J7 et J28 ;
- confiance déclarée.

### Acquisition

- activation par canal ;
- retour par canal ;
- pages avec impressions mais faible taux de clic ;
- partages générant une nouvelle session ;
- créateurs réutilisant HoopStats plusieurs fois.

Les visites brutes ne doivent jamais être l'unique mesure de réussite.

---

## 10. Rituels de maintenance

### Quotidien automatisé

- synchroniser les données ;
- contrôler volumes, scores et statuts ;
- recalculer les agrégats ;
- invalider les caches ;
- alerter en cas d'anomalie.

### Hebdomadaire

- examiner les synchronisations échouées ;
- analyser recherches sans résultat et erreurs ;
- vérifier les principales pages d'entrée ;
- contrôler manuellement un échantillon de chiffres ;
- traiter les demandes de correction.

### Mensuel

- revue des métriques produit ;
- revue des coûts fournisseurs et infrastructure ;
- mise à jour du registre des risques ;
- lecture des demandes reçues et des recherches sans résultat ;
- décision explicite sur le prochain chantier ;
- suppression ou report des fonctionnalités sans usage.

### À chaque intersaison

- exécuter le guide de bascule ;
- vérifier nouvelles équipes, joueurs et règles ;
- préparer Draft, rookies, trophées et calendrier ;
- auditer toutes les constantes de saison restantes ;
- vérifier sitemap et pages futures ;
- simuler la première synchronisation de la nouvelle saison.

---

## 11. Ordre d'exécution immédiat

Liste d'origine, entièrement traitée : le détail et les preuves sont dans les phases 0 à 2.

### Semaine de démarrage

1. [x] Créer le registre des sources, licences et dépendances.
2. [x] Écrire les cas de contrôle pour joueurs transférés et moyennes de carrière.
3. [x] Corriger les lignes `TOT` et les agrégations de carrière.
4. [x] Corriger les saisons incohérentes du comparateur.
5. [x] Étendre `health:data` aux statuts de matchs, scores et fraîcheur `PlayerSeason`.
6. [x] Concevoir l'automatisation du pipeline joueurs en production.
7. [x] Définir le schéma minimal d'analytics respectueux de la vie privée.

### Deuxième bloc

1. [x] Automatiser les statistiques joueurs.
2. [x] Afficher les dates et statuts de fraîcheur.
3. [x] Installer les tests statistiques et la CI.
4. [x] Unifier la saison dans les routes et composants.
5. [x] Ouvrir la recherche à tout l'historique.

### Troisième bloc

1. [x] Finaliser le comparateur partageable.
2. [x] Repenser l'accueil quotidien.
3. [x] Ajouter les tendances 5/10/20 matchs.
4. [x] Construire le hub des Français.
5. [x] ~~Lancer les tests comparatifs puis la bêta.~~ Abandonné (voir 4.2 à 4.4).

---

## 12. Décisions à documenter

Chaque décision structurante doit être enregistrée brièvement avec : contexte, options, décision, conséquences et date.

Décisions initiales nécessaires (consignées dans `DECISIONS.md`, 002 à 013) :

- [x] source de données principale et source de secours ; (DECISIONS.md, 010)
- [x] définition et stockage des lignes `TOT` ;
- [x] règle de calcul des carrières ;
- [x] modèle saison régulière/playoffs ;
- [x] convention des paramètres de saison ;
- [x] définition d'un joueur français ;
- [x] seuils de qualification par métrique ;
- [x] stratégie d'analytics et durée de conservation ;
- [x] politique d'export et d'attribution ;
- [x] critères autorisant le démarrage de la phase 3.

---

## 13. Références de recherche

- [NBA Stats — Quicklinks](https://www.nba.com/stats/quicklinks) : profondeur fonctionnelle et catégories de statistiques.
- [NBA Stats — FAQ](https://www.nba.com/stats/help/faq) : disponibilité et conventions des données.
- [NBA Stats — Glossaire](https://www.nba.com/stats/help/glossary) : définitions des métriques.
- [Stathead Basketball](https://info.sports-reference.com/stathead-basketball-getting-started) : recherche historique, séries, splits et requêtes avancées.
- [Basketball Reference — Glossaire](https://www.basketball-reference.com/about/glossary.html) : méthodologie et métriques historiques.
- [Cleaning the Glass — Guide](https://cleaningtheglass.com/stats/guide/league_summary) : possessions nettoyées, percentiles et mise en contexte.
- [Dunks & Threes — EPM](https://dunksandthrees.com/about/epm) : exemple de métrique différenciante documentée.
- [TrashTalk — Présentation de l'offre data](https://trashtalk.co/2023/05/20/presentation-du-nouveau-site-de-trashtalk-un-petit-bijou-de-data-et-de-navigation/) : concurrence française déjà présente sur les statistiques traditionnelles.
- [Odoxa — Les Français et la NBA](https://www.odoxa.fr/wp-content/uploads/2025/01/Barometre-Sport-Odoxa_Winamax_RTL-Les-Francais-et-la-NBA.pdf) : intérêt du public français pour la NBA.
- [Conditions d'utilisation NBA](https://www.nba.com/termsofuse) : cadre à vérifier pour l'usage des données et propriétés NBA.
- [Conditions BALLDONTLIE](https://www.balldontlie.io/terms.html) : restrictions contractuelles du fournisseur.
- [CNIL — mesure d'audience](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) : principes de mesure respectueuse de la vie privée.

---

## 14. Résultat attendu

À l'issue de cette feuille de route, HoopStats ne sera pas seulement un site contenant beaucoup de statistiques. Il devra être capable de démontrer que :

- ses données sont fiables, fraîches et explicables ;
- un fan trouve plus vite une réponse que sur les alternatives ;
- les écrans rendent les statistiques compréhensibles en français ;
- les utilisateurs reviennent pour suivre la nuit NBA, une équipe ou un joueur ;
- les créateurs peuvent citer et partager les résultats ;
- les fonctionnalités avancées répondent à des demandes observées ;
- la source de données et l'exploitation du produit sont soutenables.

La réussite n'est pas « avoir tout NBA Stats en français ». La réussite est que, lorsqu'un fan francophone se pose une question statistique sur la NBA, **HoopStats soit le premier réflexe et la réponse la plus fiable**.
