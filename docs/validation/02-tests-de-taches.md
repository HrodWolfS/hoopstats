# 4.3 Tests comparatifs de tâches

Objectif : vérifier si hoopstats permet de répondre plus vite et avec plus de
confiance que NBA Stats, Basketball Reference et TrashTalk, sur les mêmes
tâches.

## Préparation

- 8 à 12 participants, au moins 2 par segment principal (REG, FAN, STAT),
  moitié sur mobile, moitié sur ordinateur (leur propre appareil).
- 45 minutes : 5 tâches × 4 sites = 20 essais, environ 1 min 30 chacun.
- **Ordre des sites tourné** d'un participant à l'autre (voir tableau plus
  bas) : sinon le dernier site profite de ce qui a été appris sur les
  précédents.
- La veille, **remplir les réponses attendues** ci-dessous et les vérifier sur
  au moins deux sources. Une tâche sans réponse vérifiée ne compte pas.
- Chronomètre (téléphone) ; feuille [notation-taches.csv](notation-taches.csv).

## Consigne au participant

« Je vais vous poser 5 questions, à chaque fois sur un site que je vous
indique. Cherchez comme vous le feriez d'habitude. Pensez à voix haute : dites
ce que vous cherchez et ce qui vous surprend. Si au bout de 2 minutes vous ne
trouvez pas, on passe à la suite, ce n'est pas grave : c'est le site qu'on
teste, pas vous. »

Ne pas aider. Si le participant demande « c'est ici ? », répondre « qu'est-ce
que vous en pensez ? ».

## Les 5 tâches

Adapter les noms et dates au moment du test, en gardant le même niveau de
difficulté sur les 4 sites.

| N° | Tâche (texte lu au participant) | Réponse attendue | Chemin attendu sur hoopstats |
|---|---|---|---|
| T1 | « Combien de points a marqués [joueur] lors de son dernier match ? » (choisir un joueur qui a joué la nuit précédente) | à remplir la veille | Recherche → fiche joueur, ou `/fr/matchs` → fiche match |
| T2 | « Qui a eu la meilleure moyenne de passes décisives entre [joueur A] et [joueur B] la saison dernière ? » | à remplir | `/fr/comparer` |
| T3 | « Quel joueur a le meilleur [TS% / rebonds par match] cette saison parmi les joueurs qualifiés ? » | à remplir | `/fr/classements/AAAA-AA/…` |
| T4 | « Combien de points [joueur] a-t-il marqués lors de [match marquant d'une saison passée, 2015-16 ou après] ? » | à remplir | Fiche joueur → saison, ou fiche match |
| T5 | « Expliquez-moi avec vos mots ce que mesure le TS%. » | Efficacité au tir qui compte les tirs à 2 pts, à 3 pts et les lancers francs : PTS ÷ (2 × (tirs tentés + 0,44 × lancers francs tentés)) | Clic sur l'en-tête TS% (définition) ou `/fr/guides` |

T5 est réussie si le participant cite l'idée d'efficacité **et** la prise en
compte des tirs à 3 points ou des lancers francs, sans avoir à donner la
formule.

## Rotation des sites

| Participant | Ordre |
|---|---|
| P01, P05, P09 | hoopstats → NBA Stats → Basketball Reference → TrashTalk |
| P02, P06, P10 | NBA Stats → Basketball Reference → TrashTalk → hoopstats |
| P03, P07, P11 | Basketball Reference → TrashTalk → hoopstats → NBA Stats |
| P04, P08, P12 | TrashTalk → hoopstats → NBA Stats → Basketball Reference |

Faire les 5 tâches sur un site, puis passer au site suivant.

## Ce qu'on note pour chaque essai

| Mesure | Comment |
|---|---|
| Réussite | 1 si la réponse donnée est la réponse attendue, sinon 0 (abandon après 2 min = 0) |
| Temps | Du moment où la question est lue jusqu'à la réponse annoncée, en secondes |
| Retours arrière | Nombre de fois où le participant revient en arrière ou recommence une recherche |
| Confiance | « Sur 5, à quel point êtes-vous sûr de votre réponse ? » |
| Compréhension | 1 si le participant sait dire d'où vient le chiffre (saison, période, qualification), sinon 0 |

À la fin, deux questions :

1. « Pour ce genre de question, quel site utiliseriez-vous la prochaine fois, et pourquoi ? »
2. « Qu'est-ce qui vous a le plus gêné sur hoopstats ? »

## Seuils internes (roadmap)

- au moins 70 % des tâches réussies **en moins d'une minute** sur hoopstats ;
- confiance moyenne d'au moins 4/5 sur hoopstats ;
- avantage net de hoopstats (temps ou compréhension) sur au moins 3 tâches
  sur 5 face au meilleur des trois autres sites.

## Analyse

Dans un tableur, à partir de `notation-taches.csv` :

- par site : taux de réussite, part réussie en moins de 60 s, temps médian,
  confiance moyenne ;
- par tâche : quel site est le plus rapide et le plus compris ;
- mobile contre ordinateur sur hoopstats ;
- tous les blocages relevés sur hoopstats, classés par fréquence → issues à
  corriger avant la bêta.

Comparer le temps médian observé avec le panneau « Activation » du pilotage :
les deux mesurent le temps jusqu'à la réponse.
