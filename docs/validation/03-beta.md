# 4.4 Bêta instrumentée

Objectif : vérifier sur 4 semaines que des fans recrutés reviennent, trouvent
leurs réponses et font confiance aux données, avant tout lancement public
soutenu (4.6).

## Format

- 40 à 60 participants, segments connus (REG, FR, FAN, STAT, PRO), dont au
  moins 15 fans réguliers (REG) : le critère J7 porte sur eux.
- 4 semaines, le site public tel quel (pas de version spéciale).
- Questionnaire de début (semaine 0) et de fin (semaine 4), 3 minutes chacun.
- Point qualitatif hebdomadaire de 15 minutes avec un sous-groupe tournant de
  5 à 8 personnes.
- Un canal unique pour les remontées (Discord ou e-mail), et la page
  `/fr/demande` pour les statistiques manquantes.

## Mesurer sans identifier

La mesure d'audience est anonyme et agrégée : elle ne distingue pas un
bêta-testeur d'un autre visiteur. On combine donc :

| Critère | Source |
|---|---|
| Recherches sans résultat < 10 % | Pilotage, panneau « Recherche globale » (tout le trafic) |
| Retour à J7 ≥ 25 % chez les REG | Questionnaire de fin (« combien de jours avez-vous utilisé hoopstats la 2e semaine ? ») + pilotage J7 global en contrôle |
| ≥ 20 % utilisent comparaison, partage ou export | Questionnaire de fin + compteurs du pilotage |
| Confiance moyenne ≥ 4/5 | Questionnaires de début et de fin |
| Aucune anomalie critique non détectée automatiquement | Journal des anomalies ci-dessous comparé à `pnpm health:data` |

Pendant la bêta, noter chaque semaine les chiffres du pilotage (visites,
activation, réponse en moins d'1 min, J7, sans-résultat, erreurs) pour voir
l'effet de la cohorte.

## Message d'invitation

> Merci d'avoir accepté de tester hoopstats pendant 4 semaines. Utilisez-le
> comme vous le voulez, quand vous en avez besoin : rien n'est imposé. Trois
> choses seulement : un questionnaire de 3 minutes aujourd'hui, un autre dans
> 4 semaines, et si vous voyez un chiffre faux ou bizarre, envoyez-le-nous
> (capture ou lien). La mesure d'audience du site est anonyme : nous ne
> savons pas ce que vous consultez.

## Questionnaire de début (semaine 0)

1. Code participant (fourni) : `P__`
2. Segment (coché par l'organisateur)
3. Combien de fois par semaine cherchez-vous une statistique NBA ? (0 / 1–2 / 3–5 / plus)
4. Quel site ou appli utilisez-vous le plus pour ça aujourd'hui ?
5. Sur 5, quelle confiance avez-vous dans les chiffres de ce site ?
6. Plutôt mobile ou ordinateur ?
7. Qu'est-ce qui vous agace le plus quand vous cherchez une stat NBA ? (texte court)

## Questionnaire de fin (semaine 4)

1. Code participant : `P__`
2. Sur les 4 semaines, combien de jours avez-vous utilisé hoopstats ?
   (0 / 1–3 / 4–10 / plus de 10)
3. Avez-vous utilisé hoopstats pendant la 2e semaine ? (oui / non)
4. Qu'avez-vous utilisé ? (plusieurs réponses) recherche · fiches joueurs ·
   classements · matchs · tendances · Français · comparateur · partage ·
   export CSV · définitions des colonnes
5. Sur 5, quelle confiance avez-vous dans les chiffres de hoopstats ?
6. Avez-vous vu un chiffre qui vous semblait faux ? Lequel ? (texte court)
7. Pour une question de stats NBA, quel site ouvrirez-vous en premier
   maintenant ? (hoopstats / l'ancien / autre)
8. Une chose à changer en priorité ? (texte court)

## Point hebdomadaire (15 min)

- « Montrez-moi la dernière fois que vous avez utilisé hoopstats. »
- « Une fois où vous ne l'avez pas utilisé alors que vous cherchiez une stat ? Pourquoi ? »
- « Un chiffre qui vous a surpris ou fait douter ? »

## Journal des anomalies

Chaque chiffre signalé est vérifié, puis noté ici (ou dans une issue GitHub) :

| Date | Signalé par | Page | Chiffre signalé | Vérification (source) | Faux ? | Détecté par health:data ? | Corrigé le |
|---|---|---|---|---|---|---|---|

Une anomalie critique = un chiffre faux affiché sur une fiche, un classement ou
un score. Si `health:data` ne l'a pas détectée, ajouter un contrôle avant la
fin de la bêta.

## Décision à la fin

| Critère | Seuil | Résultat | Atteint ? |
|---|---|---|---|
| Recherches sans résultat | < 10 % | | |
| Retour J7 des REG | ≥ 25 % | | |
| Comparaison, partage ou export | ≥ 20 % des testeurs | | |
| Confiance dans les données | ≥ 4/5 | | |
| Anomalie critique non détectée | 0 | | |

Ces seuils sont des objectifs internes à ajuster après la première cohorte.
Tous atteints : passer aux conditions de lancement public (4.6). Sinon :
corriger les causes, puis une deuxième cohorte plus courte (2 semaines).
