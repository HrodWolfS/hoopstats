# HoopStats — Feuille de route vers la référence française des statistiques NBA

> Document d'exécution produit, data et technique  
> Version : 1.0  
> Date : 4 août 2026  
> Statut : proposé — à exécuter par phases  
> Document d'origine : audit produit, audit de la base, recherche utilisateurs et benchmark concurrentiel réalisés en août 2026

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
| Phase 4 | Valider et faire connaître | Bêta mesurée, boucle d'apprentissage et acquisition maîtrisée | Transverse puis continue |

Les estimations supposent un développement individuel à temps partiel. Elles servent à ordonner le travail, pas à imposer une date de sortie.

---

# Phase 0 — Sécuriser la confiance

## 0.1 Audit des droits et des fournisseurs

### Objectif

Éviter de bâtir l'acquisition et la monétisation sur une source pouvant être coupée ou dont l'utilisation est incompatible avec HoopStats.

### Actions

- [ ] Inventorier chaque famille de données et sa source actuelle : joueurs, saisons, matchs, box scores, standings, playoffs, Draft, trophées, photos et logos.
- [ ] Pour chaque source, documenter : endpoint, licence, droit de stockage, droit d'affichage, attribution, limites de débit, coût, stabilité et solution de secours.
- [ ] Relire les conditions NBA, BALLDONTLIE, ESPN et Wikimedia applicables.
- [ ] Obtenir une confirmation écrite du fournisseur principal concernant le stockage, l'affichage public, les données dérivées et la monétisation.
- [ ] Faire vérifier les points sensibles par un professionnel du droit avant une exploitation commerciale significative.
- [ ] Définir un fournisseur principal et un fournisseur de secours pour les données indispensables.
- [ ] Documenter une procédure de remplacement du fournisseur sans refonte du produit.

### Livrable

Un registre des sources et licences, avec une décision explicite : **autorisé**, **à confirmer**, **à remplacer** ou **à ne pas utiliser**.

### Critère de sortie

Aucune donnée critique du lancement ne dépend d'une source classée « à confirmer » sans stratégie de repli acceptée.

---

## 0.2 Contrat de données et provenance

### Objectif

Rendre la provenance, la période et la fraîcheur explicites dans le modèle et dans l'interface.

### Actions

- [ ] Créer un catalogue des métriques avec identifiant, libellé, unité, formule, source et limites.
- [ ] Définir les notions de saison régulière, play-in, playoffs, NBA Cup et présaison.
- [ ] Définir une politique unique pour les joueurs transférés et les lignes `TOT`.
- [ ] Définir une politique d'arrondi commune aux cartes, tableaux, graphiques et exports.
- [ ] Ajouter ou normaliser les champs de provenance et `updatedAt` nécessaires.
- [ ] Distinguer visuellement les données officielles, importées, calculées et estimées.
- [ ] Ajouter un composant réutilisable « Source et mise à jour ».

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

- [ ] Produire une seule ligne consolidée `TOT` par joueur et par saison, sans double comptage des passages en équipe.
- [ ] Recalculer les moyennes de carrière à partir des totaux et des matchs joués.
- [ ] Ne jamais additionner naïvement des pourcentages ou des moyennes par match.
- [ ] Corriger la détermination des vainqueurs de séries de playoffs.
- [ ] Empêcher le fallback silencieux vers une saison différente.
- [ ] Forcer les comparaisons à utiliser la même saison par défaut.
- [ ] Résoudre ou documenter chaque écart entre score final et somme des lignes individuelles.
- [ ] Corriger les matchs restés dans un statut obsolète.
- [ ] Vérifier les saisons manquantes ou incomplètes des playoffs.
- [ ] Auditer les champs BPM, VORP et Win Shares ; les masquer tant qu'ils ne sont pas alimentés correctement.

### Tests minimaux

- [ ] joueur resté dans une seule équipe ;
- [ ] joueur transféré une fois ;
- [ ] joueur ayant trois équipes ou plus ;
- [ ] saison partielle ;
- [ ] joueur sans match ;
- [ ] égalité dans un classement ;
- [ ] seuil minimum de matchs ou minutes ;
- [ ] saison régulière et playoffs ;
- [ ] série gagnée par l'équipe la moins bien classée ;
- [ ] match avec prolongation.

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

- [ ] Intégrer `PlayerSeason` au pipeline quotidien ou choisir une source exécutable depuis l'infrastructure de production.
- [ ] Séparer les étapes : matchs, box scores, agrégats joueurs, standings, équipes et dérivés.
- [ ] Rendre chaque étape idempotente et relançable indépendamment.
- [ ] Écrire un `SyncLog` précis pour chaque famille de données.
- [ ] Ajouter une alerte lorsqu'une étape échoue, importe zéro ligne ou produit un volume anormal.
- [ ] Ajouter des contrôles de complétude après chaque synchronisation.
- [ ] Invalider uniquement les caches affectés après succès.
- [ ] Afficher l'heure de dernière mise à jour sur l'accueil et les pages statistiques.

### Passage automatique de saison

- [ ] Centraliser la saison NBA active dans une seule source de vérité.
- [ ] Détecter et préparer la prochaine saison sans éditer plusieurs fichiers.
- [ ] Gérer les périodes où la nouvelle saison existe mais ne contient pas encore de matchs.
- [ ] Ajouter un script de contrôle de bascule de saison.
- [ ] Écrire un guide opératoire de début et de fin de saison.

### Critères de sortie

- aucune commande locale quotidienne requise ;
- une synchronisation échouée est visible et signalée ;
- la fraîcheur de chaque famille de données est mesurable ;
- une relance ne crée aucun doublon ;
- le passage de saison est simulé avec succès.

---

## 0.5 Tests, observabilité et sécurité opérationnelle

### Actions

- [ ] Installer un socle de tests unitaires pour les calculs statistiques.
- [ ] Ajouter des tests d'intégration pour recherche, classement, comparaison et changement de saison.
- [ ] Ajouter un parcours end-to-end mobile sur les tâches principales.
- [ ] Exécuter lint, tests, build et santé des données dans la CI.
- [ ] Centraliser les erreurs serveur et client utiles au diagnostic.
- [ ] Ajouter un tableau interne de fraîcheur, volumes, erreurs et anomalies.
- [ ] Protéger les pages de pilotage et les endpoints de réindexation/synchronisation.
- [ ] Documenter la restauration et la correction d'une mauvaise importation.

### Livrable de phase 0

Une plateforme dont les chiffres peuvent être défendus : source connue, dernière mise à jour visible, calculs testés, erreurs détectées et passage de saison reproductible.

### Go/No-Go phase 0

- [ ] droits des sources clarifiés ;
- [ ] pipeline joueurs automatisé ;
- [ ] anomalies critiques corrigées ;
- [ ] tests critiques présents ;
- [ ] aucune donnée morte affichée ;
- [ ] fraîcheur visible publiquement ;
- [ ] alertes opérationnelles fonctionnelles.

---

# Phase 1 — Tenir la promesse centrale

## 1.1 Unifier la notion de saison

### Actions

- [ ] Créer un contexte ou contrat unique de saison utilisable par toutes les pages.
- [ ] Utiliser un nom de paramètre unique dans les URLs.
- [ ] Définir clairement la relation entre année de Draft et saison NBA.
- [ ] Aligner accueil, joueurs, équipes, classements, trophées, playoffs, Draft et comparateur.
- [ ] Ajouter des URLs canoniques par saison lorsque le contenu change réellement.
- [ ] Conserver le choix de saison pendant la navigation lorsque cela a du sens.
- [ ] Afficher un état vide explicite lorsqu'une saison ne possède pas de données.
- [ ] Retirer du sitemap les pages futures sans contenu utile.

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

- [ ] Retirer la contrainte imposant une saison actuelle aux joueurs.
- [ ] Rechercher prénom, nom, nom complet, équipe et abréviation.
- [ ] Normaliser accents, apostrophes, traits d'union et caractères spéciaux.
- [ ] Prévoir une table d'alias pour surnoms et changements de noms.
- [ ] Afficher l'équipe actuelle, la dernière équipe connue ou les années de carrière selon le cas.
- [ ] Ajouter des résultats « aucune correspondance » utiles.
- [ ] Instrumenter recherches réussies et sans résultat sans conserver inutilement de données personnelles.
- [ ] Réutiliser exactement le même moteur dans la palette globale et le comparateur.

### Critères d'acceptation

- les stars actuelles et légendes historiques sont trouvables ;
- les noms accentués sont trouvables sans accent ;
- la recherche mobile est utilisable au clavier ;
- moins de 10 % de recherches sans résultat pendant la bêta, hors requêtes hors périmètre.

---

## 1.3 Fiabiliser le comparateur

### Actions

- [ ] Ajouter un sélecteur de saison pour chaque joueur.
- [ ] Activer « même saison » par défaut.
- [ ] Ajouter un mode joueur contre lui-même entre deux saisons.
- [ ] Distinguer saison régulière et playoffs lorsque les données le permettent.
- [ ] Afficher matchs, minutes et volume à côté des moyennes.
- [ ] Comparer aux moyennes de ligue et aux percentiles pertinents.
- [ ] Signaler les tailles d'échantillon faibles.
- [ ] Conserver joueurs, saisons et métriques dans l'URL.
- [ ] Produire une carte ou image partageable.

### Critères d'acceptation

- aucune comparaison involontaire de saisons différentes ;
- les unités et périodes sont identiques des deux côtés ;
- le résultat est compréhensible sur mobile ;
- le lien partagé restitue la comparaison complète.

---

## 1.4 Renforcer pages joueurs et équipes

### Pages joueurs

- [ ] Afficher totaux et moyennes exactes.
- [ ] Ajouter matchs joués, titularisations et minutes.
- [ ] Afficher les volumes de tirs avec les pourcentages.
- [ ] Proposer carrière, saison sélectionnée et matchs récents sans ambiguïté.
- [ ] Étendre le journal des matchs au-delà des 25 derniers avec pagination.
- [ ] Ajouter trophées, votes et faits de carrière structurés.
- [ ] Rendre les définitions de métriques accessibles depuis les colonnes.

### Pages équipes

- [ ] Afficher ORtg, DRtg, Net Rating et Pace déjà disponibles.
- [ ] Aligner l'historique et les matchs sur la saison sélectionnée.
- [ ] Ajouter les tendances récentes et adversaires rencontrés.
- [ ] Afficher clairement le résultat de playoffs et sa source.

### Livrable de phase 1

Un utilisateur peut rechercher n'importe quel acteur NBA, naviguer dans une saison cohérente et produire une comparaison statistiquement correcte et partageable.

### Go/No-Go phase 1

- [ ] recherche historique fonctionnelle ;
- [ ] sélecteur unifié ;
- [ ] comparateur cohérent ;
- [ ] totaux et volumes disponibles ;
- [ ] pages joueurs et équipes sans fallback trompeur ;
- [ ] cinq tâches utilisateurs principales réussies sur mobile.

---

# Phase 2 — Créer l'usage quotidien

## 2.1 Repenser l'accueil : « La nuit NBA en chiffres »

### Objectif

Donner une raison de consulter HoopStats chaque matin sans transformer le site en média d'actualité.

### Contenu automatique recommandé

- [ ] résultats des derniers matchs terminés ;
- [ ] trois performances majeures selon une règle documentée ;
- [ ] performances des joueurs français ;
- [ ] joueur ou équipe en plus forte progression récente ;
- [ ] série active ou changement de classement notable ;
- [ ] match important à venir ;
- [ ] accès immédiat aux box scores et profils.

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

- [ ] Calculer les fenêtres 5, 10 et 20 derniers matchs.
- [ ] Afficher l'évolution contre la moyenne de saison.
- [ ] Distinguer volume, efficacité et temps de jeu.
- [ ] Ajouter une taille minimale d'échantillon.
- [ ] Permettre le tri et le partage des tendances.
- [ ] Documenter le traitement des matchs non joués et transferts.

### Questions couvertes

- Qui est en forme ?
- Qui progresse ou régresse ?
- Une série récente est-elle durable ou liée à un faible volume ?
- Quel joueur a changé de rôle ?

---

## 2.3 Créer le hub « Français en NBA »

### Contenu

- [ ] liste vérifiée des joueurs français actifs et historiques ;
- [ ] performances de la nuit ;
- [ ] statistiques saison et tendances récentes ;
- [ ] calendrier des prochains matchs ;
- [ ] classement comparatif entre Français ;
- [ ] pages individuelles et historique de carrière ;
- [ ] URL stable et indexable.

### Vigilance

Définir explicitement le critère d'inclusion : nationalité sportive, naissance, sélection nationale ou double nationalité. La règle doit être documentée et appliquée uniformément.

---

## 2.4 Améliorer matchs et calendrier

### Actions

- [ ] remplacer la fenêtre courte par une navigation par date ;
- [ ] ajouter calendrier complet de la saison ;
- [ ] proposer précédent/suivant et filtres par équipe ;
- [ ] distinguer matchs à venir, en cours, terminés et reportés ;
- [ ] afficher quart-temps, prolongations et leaders ;
- [ ] ajouter les liens entre match, joueurs et équipes ;
- [ ] contrôler les incohérences de score avant publication.

---

## 2.5 Partage et export

### Actions

- [ ] préserver les filtres et tris dans les URLs ;
- [ ] ajouter un bouton de copie de lien ;
- [ ] générer une carte sociale lisible avec valeur, contexte, date et marque HoopStats ;
- [ ] exporter les tableaux autorisés en CSV ;
- [ ] ajouter l'attribution et la date de mise à jour aux exports ;
- [ ] instrumenter copie, partage et export.

### Livrable de phase 2

HoopStats devient utile au réveil, suit naturellement les joueurs français et transforme chaque exploration en contenu partageable.

### Go/No-Go phase 2

- [ ] accueil entièrement automatique ;
- [ ] données récentes visibles et fiables ;
- [ ] tendances testées ;
- [ ] hub français complet ;
- [ ] calendrier navigable ;
- [ ] partage et export conformes aux droits des données ;
- [ ] amélioration mesurable du retour à J7 dans la bêta.

---

# Phase 3 — Construire la profondeur statistique

Cette phase est conditionnelle. Chaque chantier doit passer deux portes :

1. la donnée nécessaire est disponible avec des droits compatibles ;
2. le besoin a été observé dans les entretiens, recherches ou usages.

## 3.1 Splits déterministes

- [ ] saison régulière contre playoffs ;
- [ ] domicile contre extérieur ;
- [ ] victoires contre défaites ;
- [ ] titulaire contre remplaçant ;
- [ ] avant et après une date ou un transfert ;
- [ ] face à une équipe ou un adversaire ;
- [ ] cinq, dix et vingt derniers matchs.

## 3.2 Recherche historique de performances

### Première version

- [ ] choisir une ou plusieurs métriques ;
- [ ] définir minimum et maximum ;
- [ ] filtrer saison, playoffs, équipe, joueur et adversaire ;
- [ ] ordonner les résultats ;
- [ ] partager la requête ;
- [ ] exporter le résultat.

### Exemples à supporter

- matchs à au moins 40 points et 10 passes ;
- meilleures performances d'un rookie français ;
- séries de matchs à plus de 30 points ;
- joueurs ayant atteint des seuils de carrière ;
- face-à-face entre deux joueurs ou équipes.

## 3.3 Statistiques équipes avancées

- [ ] quatre facteurs : eFG%, pertes de balle, rebond offensif et lancers francs ;
- [ ] rang et percentile de ligue ;
- [ ] évolution dans le temps ;
- [ ] profils attaque/défense ;
- [ ] explication française courte pour chaque indicateur.

## 3.4 Données de possession et tracking

À développer seulement avec une source soutenable :

- [ ] lineups ;
- [ ] on/off ;
- [ ] clutch ;
- [ ] shot charts ;
- [ ] zones de tir ;
- [ ] rythme et possessions nettoyées ;
- [ ] touches, drives, passes ou matchup data.

### Exigences supplémentaires

- afficher le nombre de possessions ou tentatives ;
- expliquer les exclusions éventuelles ;
- distinguer calcul exact et estimation ;
- prévenir lorsque l'échantillon est trop faible ;
- éviter un score propriétaire opaque sans validation méthodologique.

## 3.5 Recherche en langage naturel

Cette fonctionnalité arrive en dernier, au-dessus d'un moteur déterministe déjà fiable.

- [ ] traduire la question en filtres structurés ;
- [ ] afficher la requête interprétée avant ou avec le résultat ;
- [ ] refuser proprement les questions non couvertes ;
- [ ] ne jamais inventer une réponse ;
- [ ] conserver un lien vers la vue filtrée reproductible ;
- [ ] mesurer les catégories de questions sans stocker inutilement du texte sensible.

### Livrable de phase 3

Un moteur d'exploration capable de répondre aux questions complexes que les tableaux généralistes ne couvrent pas facilement.

---

# Phase 4 — Valider, apprendre et faire connaître

La validation commence pendant la phase 0 et accompagne toutes les phases suivantes.

## 4.1 Instrumentation produit

### Événements minimaux

- [ ] `page_view` avec type de page ;
- [ ] `search_submitted` avec catégorie et succès, sans requête brute si inutile ;
- [ ] `season_changed` ;
- [ ] `filter_applied` avec famille de filtre ;
- [ ] `comparison_started` et `comparison_completed` ;
- [ ] `share_clicked` ;
- [ ] `export_completed` ;
- [ ] `metric_definition_opened` ;
- [ ] `data_freshness_warning_seen` ;
- [ ] erreur fonctionnelle ou technique anonymisée.

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

- [ ] limiter la collecte à ce qui sert une décision produit ;
- [ ] éviter les identifiants directs et requêtes brutes lorsqu'ils ne sont pas nécessaires ;
- [ ] documenter la configuration de mesure d'audience ;
- [ ] vérifier la conformité avec les recommandations de la CNIL ;
- [ ] définir une durée de conservation raisonnable.

---

## 4.2 Entretiens de problème

### Échantillon recommandé

15 à 20 participants :

- 5 fans réguliers ;
- 3 fans récents ou attirés par les Français en NBA ;
- 3 utilisateurs TTFL/fantasy ;
- 3 passionnés de statistiques ;
- 3 créateurs ou journalistes.

### Questions

1. « Montre-moi la dernière statistique NBA que tu as cherchée. »
2. « Où l'as-tu trouvée et pourquoi cette source ? »
3. « Qu'est-ce qui t'a ralenti ou fait douter ? »
4. « À quel moment recherches-tu des statistiques ? »
5. « Qu'utilises-tu sur mobile et sur ordinateur ? »
6. « Que fais-tu du résultat : lecture, débat, publication ou fantasy ? »

Ne pas demander directement quelle fonctionnalité construire. Observer les comportements passés et les outils réellement utilisés.

### Livrable

Une synthèse par besoin, fréquence, outil actuel, difficulté, niveau de confiance et volonté de revenir.

---

## 4.3 Tests comparatifs de tâches

Faire réaliser les mêmes tâches sur HoopStats, NBA Stats, Basketball Reference et TrashTalk :

1. retrouver la performance d'un joueur la nuit précédente ;
2. comparer deux joueurs sur une saison ;
3. identifier le meilleur joueur selon une métrique ;
4. retrouver une performance historique ;
5. comprendre le TS%.

### Mesures

- taux de réussite ;
- temps jusqu'à la réponse ;
- nombre d'erreurs ou retours arrière ;
- confiance déclarée ;
- compréhension du résultat ;
- préférence finale ;
- différences mobile/ordinateur.

### Seuils internes initiaux

- au moins 70 % des tâches réussies en moins d'une minute ;
- confiance moyenne d'au moins 4/5 ;
- avantage net de HoopStats sur rapidité ou compréhension dans au moins trois tâches.

---

## 4.4 Bêta instrumentée

### Format

- 40 à 60 utilisateurs ;
- quatre semaines ;
- segmentation connue ;
- questionnaire court au début et à la fin ;
- point qualitatif hebdomadaire avec un sous-groupe.

### Critères de décision proposés

- moins de 10 % de recherches sans résultat ;
- retour à J7 d'au moins 25 % chez les fans réguliers recrutés ;
- au moins 20 % des bêta-testeurs utilisent comparaison, partage ou export ;
- confiance moyenne dans les données supérieure ou égale à 4/5 ;
- aucune anomalie statistique critique non détectée automatiquement.

Ces seuils sont des objectifs internes, pas des références universelles. Ils devront être ajustés après la première cohorte.

---

## 4.5 Test concierge des demandes avancées

Avant de développer un moteur complexe :

- [ ] ajouter « Quelle statistique cherchez-vous ? » ;
- [ ] traiter manuellement les 50 premières demandes ;
- [ ] classer les questions : tendances, splits, records, face-à-face, Français, lineups, tirs, clutch, fantasy ;
- [ ] mesurer fréquence, difficulté et récurrence ;
- [ ] ne construire que les deux catégories les plus fréquentes et compatibles avec les données.

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

- [ ] droits des données clarifiés ;
- [ ] aucune anomalie critique ouverte ;
- [ ] fraîcheur automatique visible ;
- [ ] réussite des tâches principales ;
- [ ] premiers signaux de retour récurrent ;
- [ ] capacité opérationnelle à corriger une mauvaise donnée rapidement.

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
- entretien avec deux ou trois utilisateurs ;
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

### Semaine de démarrage

1. [ ] Créer le registre des sources, licences et dépendances.
2. [ ] Écrire les cas de contrôle pour joueurs transférés et moyennes de carrière.
3. [ ] Corriger les lignes `TOT` et les agrégations de carrière.
4. [ ] Corriger les saisons incohérentes du comparateur.
5. [ ] Étendre `health:data` aux statuts de matchs, scores et fraîcheur `PlayerSeason`.
6. [ ] Concevoir l'automatisation du pipeline joueurs en production.
7. [ ] Définir le schéma minimal d'analytics respectueux de la vie privée.

### Deuxième bloc

1. [ ] Automatiser les statistiques joueurs.
2. [ ] Afficher les dates et statuts de fraîcheur.
3. [ ] Installer les tests statistiques et la CI.
4. [ ] Unifier la saison dans les routes et composants.
5. [ ] Ouvrir la recherche à tout l'historique.

### Troisième bloc

1. [ ] Finaliser le comparateur partageable.
2. [ ] Repenser l'accueil quotidien.
3. [ ] Ajouter les tendances 5/10/20 matchs.
4. [ ] Construire le hub des Français.
5. [ ] Lancer les tests comparatifs puis la bêta.

---

## 12. Décisions à documenter

Chaque décision structurante doit être enregistrée brièvement avec : contexte, options, décision, conséquences et date.

Décisions initiales nécessaires :

- [ ] source de données principale et source de secours ;
- [ ] définition et stockage des lignes `TOT` ;
- [ ] règle de calcul des carrières ;
- [ ] modèle saison régulière/playoffs ;
- [ ] convention des paramètres de saison ;
- [ ] définition d'un joueur français ;
- [ ] seuils de qualification par métrique ;
- [ ] stratégie d'analytics et durée de conservation ;
- [ ] politique d'export et d'attribution ;
- [ ] critères autorisant le démarrage de la phase 3.

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
