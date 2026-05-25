export type EraPlayer = {
  position: "PG" | "SG" | "SF" | "PF" | "C";
  firstName: string;
  lastName: string;
  slug: string;
  bio: string;
};

export type IconicTeam = {
  id: string;
  name: string;
  teamSlug: string; // slug DB pour récupérer logo + abbr
  nickname: string;
  seasons: string;
  achievement: string;
  primaryColor: string;
  secondaryColor: string;
  description: string;
  players: EraPlayer[];
};

export type GenerationEra = {
  id: string;
  label: string;
  years: string;
  description: string;
  accentColor: string;
  teams: IconicTeam[];
};

export const GENERATIONS: GenerationEra[] = [
  {
    id: "pioneers",
    label: "Les Pionniers",
    years: "1946 – 1969",
    description:
      "Une seule équipe a dominé cette époque de bout en bout. Les Celtics de Bill Russell ont tout simplement réécrit ce qu'était possible d'accomplir dans un sport collectif.",
    accentColor: "#F59E0B",
    teams: [
      {
        id: "celtics-dynasty",
        name: "Boston Celtics",
        teamSlug: "boston-celtics",
        nickname: "La Dynastie Russell",
        seasons: "1957 – 1966",
        achievement: "9 titres en 10 saisons",
        primaryColor: "#007A33",
        secondaryColor: "#BA9653",
        description:
          "Jamais aucune franchise dans l'histoire des sports professionnels n'a autant dominé. Neuf championnats en dix ans, bâtis sur le sacrifice collectif et le génie défensif de Bill Russell.",
        players: [
          {
            position: "PG",
            firstName: "Bob",
            lastName: "Cousy",
            slug: "bob-cousy",
            bio: "Surnommé « l'Houdini du parquet », il a inventé la passe derrière le dos et orchestré six titres consécutifs avant même que la NBA ne soit télévisée. Le premier magicien de l'histoire du jeu.",
          },
          {
            position: "SG",
            firstName: "Sam",
            lastName: "Jones",
            slug: "sam-jones",
            bio: "Tireur d'élite discret mais décisif, Sam Jones a remporté dix titres en treize saisons. Son banquette-step-back bank shot était l'arme secrète des Celtics dans les moments critiques.",
          },
          {
            position: "SF",
            firstName: "Tom",
            lastName: "Heinsohn",
            slug: "tom-heinsohn",
            bio: "Six fois champion en tant que joueur, deux fois en tant qu'entraîneur : Heinsohn est l'incarnation même de la culture Celtics. Agressif, audacieux, capable de scorer en toutes circonstances.",
          },
          {
            position: "PF",
            firstName: "Tom",
            lastName: "Sanders",
            slug: "tom-sanders",
            bio: "« Satch » Sanders n'a jamais eu besoin de scorer pour être indispensable. Défenseur d'élite sur les meilleurs attaquants adverses, il a fait les sales boulots pendant huit titres NBA.",
          },
          {
            position: "C",
            firstName: "Bill",
            lastName: "Russell",
            slug: "bill-russell",
            bio: "Onze titres en treize saisons. Russell n'est pas seulement le plus grand gagnant de l'histoire du sport américain — il a redéfini ce que la défense et le jeu collectif pouvaient accomplir à eux seuls.",
          },
        ],
      },
    ],
  },
  {
    id: "showtime",
    label: "L'Ère Showtime",
    years: "1970 – 1989",
    description:
      "Deux rivaux absolus et des Bad Boys venus tout casser. Cette décennie a inventé la NBA moderne avec ses stars, ses rivalités et ses salles pleines à craquer.",
    accentColor: "#EC4899",
    teams: [
      {
        id: "showtime-lakers",
        name: "Los Angeles Lakers",
        teamSlug: "los-angeles-lakers",
        nickname: "Showtime",
        seasons: "1980 – 1988",
        achievement: "5 titres NBA",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        description:
          "Magic Johnson au poste de meneur, Kareem Abdul-Jabbar sous le cercle et un jeu en transition spectaculaire. Les Lakers ont transformé le basketball en spectacle.",
        players: [
          {
            position: "PG",
            firstName: "Magic",
            lastName: "Johnson",
            slug: "magic-johnson",
            bio: "2m06, cinq titres, trois MVP, et un sourire que personne n'a jamais pu imiter. Magic a redéfini le poste de meneur en incarnant à lui seul la joie de jouer au basketball.",
          },
          {
            position: "SG",
            firstName: "Byron",
            lastName: "Scott",
            slug: "byron-scott",
            bio: "Tireur fiable et défenseur sérieux, Byron Scott était le complément parfait à la magie ambiante. Ses trois titres avec les Lakers prouvent que le sérieux a toute sa place dans le Showtime.",
          },
          {
            position: "SF",
            firstName: "James",
            lastName: "Worthy",
            slug: "james-worthy",
            bio: "« Big Game James » : il portait ce surnom car il élevait son jeu en playoffs. MVP des Finales 1988, élégant et implacable, Worthy était le finisseur que chaque équipe rêvait d'avoir.",
          },
          {
            position: "PF",
            firstName: "A.C.",
            lastName: "Green",
            slug: "a-c-green",
            bio: "Indéracinable, fiable et physique, AC Green a disputé 1 192 matchs consécutifs — record NBA de longévité. Le moteur silencieux qui faisait tourner le Showtime nuit après nuit.",
          },
          {
            position: "C",
            firstName: "Kareem",
            lastName: "Abdul-Jabbar",
            slug: "kareem-abdul-jabbar",
            bio: "Le skyhook est le tir le plus imparable jamais inventé, et Kareem l'a utilisé pendant vingt saisons pour devenir le meilleur marqueur de l'histoire NBA. Un monument.",
          },
        ],
      },
      {
        id: "bird-celtics",
        name: "Boston Celtics",
        teamSlug: "boston-celtics",
        nickname: "Celtic Pride",
        seasons: "1981 – 1986",
        achievement: "3 titres NBA",
        primaryColor: "#007A33",
        secondaryColor: "#BA9653",
        description:
          "La réponse de Boston à Hollywood. Larry Bird, Kevin McHale et Robert Parish formaient la meilleure raquette de leur génération, dans une salle où les adversaires redoutaient de venir jouer.",
        players: [
          {
            position: "PG",
            firstName: "Dennis",
            lastName: "Johnson",
            slug: "dennis-johnson",
            bio: "Élu dans l'équipe défensive All-NBA cinq fois et irremplaçable dans les grands matchs, Dennis Johnson était la boussole qui orientait les Celtics quand ça comptait vraiment.",
          },
          {
            position: "SG",
            firstName: "Danny",
            lastName: "Ainge",
            slug: "danny-ainge",
            bio: "Compétiteur implacable et casseur de rythme redoutable, Ainge était le joueur que les adversaires détestaient rencontrer — et exactement ce dont Bird avait besoin à ses côtés.",
          },
          {
            position: "SF",
            firstName: "Larry",
            lastName: "Bird",
            slug: "larry-bird",
            bio: "Trois MVP consécutifs, trois titres, un QI basket hors du commun et une poubelle mentale absolue. Bird était capable de vous prévenir du tir qu'il allait faire et de le rentrer quand même.",
          },
          {
            position: "PF",
            firstName: "Kevin",
            lastName: "McHale",
            slug: "kevin-mchale",
            bio: "Le joueur avec le meilleur jeu dos au panier de tous les temps selon Michael Jordan lui-même. McHale a fait tourner en bourrique les meilleurs pivots d'une décennie avec ses feintes impossibles.",
          },
          {
            position: "C",
            firstName: "Robert",
            lastName: "Parish",
            slug: "robert-parish",
            bio: "Le Chef — silencieux, régulier, implacable. Parish a joué 21 saisons en professionnel et reste l'un des pivots les plus constants de l'histoire, malgré une discrétion totale.",
          },
        ],
      },
      {
        id: "bad-boys-pistons",
        name: "Detroit Pistons",
        teamSlug: "detroit-pistons",
        nickname: "Bad Boys",
        seasons: "1988 – 1990",
        achievement: "2 titres NBA",
        primaryColor: "#C8102E",
        secondaryColor: "#006BB6",
        description:
          "Ils ont dit non à Jordan, non à Magic, non au jeu propre. Detroit a gagné à sa façon : dure, physique, collective. Isiah Thomas et ses Bad Boys ont prouvé qu'une équipe de guerriers peut battre n'importe quelle star.",
        players: [
          {
            position: "PG",
            firstName: "Isiah",
            lastName: "Thomas",
            slug: "isiah-thomas",
            bio: "1m85 de pur feu. Thomas était le cœur battant et l'âme des Bad Boys — scoreur, meneur, compétiteur absolu capable de mettre 33 points sur une cheville cassée en Finales.",
          },
          {
            position: "SG",
            firstName: "Joe",
            lastName: "Dumars",
            slug: "joe-dumars",
            bio: "Deux fois champion, et l'unique joueur de l'ère Bad Boys à avoir son nom associé au Fair Play. Dumars a prouvé que l'excellence défensive et la classe personnelle peuvent coexister.",
          },
          {
            position: "SF",
            firstName: "Vinnie",
            lastName: "Johnson",
            slug: "vinnie-johnson",
            bio: "« The Microwave » : il montait en température immédiatement en sortant du banc. Johnson a inscrit le tir le plus célèbre des Pistons — le panier à 0,7 seconde qui a donné le titre 1990.",
          },
          {
            position: "PF",
            firstName: "Dennis",
            lastName: "Rodman",
            slug: "dennis-rodman",
            bio: "Le rebondeur le plus féroce de l'histoire — sept titres de meilleur rebondeur consécutifs — avant les tatouages et les cheveux. À Detroit, Rodman était simplement le meilleur défenseur du monde.",
          },
          {
            position: "C",
            firstName: "Bill",
            lastName: "Laimbeer",
            slug: "bill-laimbeer",
            bio: "Le pivot le plus détesté de sa génération, et de loin le plus utile à Detroit. Laimbeer n'avait aucun athlétisme mais imposait une présence physique intimidante que tout le monde redoutait.",
          },
        ],
      },
    ],
  },
  {
    id: "jordan-era",
    label: "L'Ère Jordan",
    years: "1990 – 1999",
    description:
      "Une décennie dominée par un homme, mais aussi par la résistance acharnée du Jazz de Stockton et Malone. Deux dynasties Bulls, deux Finals épiques contre Utah.",
    accentColor: "#CE1141",
    teams: [
      {
        id: "bulls-dynasty",
        name: "Chicago Bulls",
        teamSlug: "chicago-bulls",
        nickname: "The Last Dance",
        seasons: "1996 – 1998",
        achievement: "6 titres NBA (91–93, 96–98)",
        primaryColor: "#CE1141",
        secondaryColor: "#000000",
        description:
          "72 victoires en saison régulière. La meilleure équipe de l'histoire selon beaucoup. Jordan, Pippen et Rodman formaient un trio que personne n'a jamais su comment arrêter.",
        players: [
          {
            position: "PG",
            firstName: "Ron",
            lastName: "Harper",
            slug: "ron-harper",
            bio: "Sacrifié et sous-estimé, Harper a mis son ego de côté pour devenir le défenseur d'élite dont Phil Jackson avait besoin en sortie de dribble. Sans lui, Jordan n'aurait pas pu se reposer autant défensivement.",
          },
          {
            position: "SG",
            firstName: "Michael",
            lastName: "Jordan",
            slug: "michael-jordan",
            bio: "Six titres, six MVP des Finales, cinq MVP de saison, dix titres de meilleur marqueur. Le débat sur le GOAT commence et finit toujours par Michael Jordan.",
          },
          {
            position: "SF",
            firstName: "Scottie",
            lastName: "Pippen",
            slug: "scottie-pippen",
            bio: "Phil Jackson le considérait comme le joueur le plus complet qu'il ait jamais coaché. Pippen défendait le meilleur adversaire, orchestrait l'attaque et portait les Bulls quand Jordan était absent.",
          },
          {
            position: "PF",
            firstName: "Dennis",
            lastName: "Rodman",
            slug: "dennis-rodman",
            bio: "Cinq titres de champion, sept titres de meilleur rebondeur, et une présence qui rendait toute équipe adversaire complètement folle. Rodman était le chaos organisé dont les Bulls avaient besoin.",
          },
          {
            position: "C",
            firstName: "Luc",
            lastName: "Longley",
            slug: "luc-longley",
            bio: "Premier Australien champion NBA, Longley n'était pas une star — mais il était exactement ce qu'il fallait : solide, physique, et capable d'occuper les pivots adverses pour libérer Jordan et Pippen.",
          },
        ],
      },
      {
        id: "utah-jazz",
        name: "Utah Jazz",
        teamSlug: "utah-jazz",
        nickname: "Stockton to Malone",
        seasons: "1996 – 1998",
        achievement: "2 Finales NBA",
        primaryColor: "#002B5C",
        secondaryColor: "#F9A01B",
        description:
          "Ils n'ont jamais gagné le titre, mais ont défini une époque. Stockton et Malone ont perfectionné le pick-and-roll pendant deux décennies et mené le Jazz aux deux seules finales de son histoire — contre une équipe hors du commun.",
        players: [
          {
            position: "PG",
            firstName: "John",
            lastName: "Stockton",
            slug: "john-stockton",
            bio: "Recordman absolu des passes et des interceptions, Stockton était le cerveau le plus précis de sa génération. Sans lui, Malone n'est qu'un bon attaquant. Ensemble, ils formaient la machine offensive la plus fiable de l'histoire.",
          },
          {
            position: "SG",
            firstName: "Jeff",
            lastName: "Hornacek",
            slug: "jeff-hornacek",
            bio: "Tireur soyeux et défenseur discret, Hornacek apportait la stabilité dont le Jazz avait besoin autour de son duo légendaire. Il scorait 15-18 points par soir comme si c'était une formalité.",
          },
          {
            position: "SF",
            firstName: "Bryon",
            lastName: "Russell",
            slug: "bryon-russell",
            bio: "Défenseur athlétique et joueur de caractère, Russell a porté la lourde tâche de défendre Jordan en Finales. Il restera à jamais dans les mémoires pour ce duel que Jordan a tranché d'un step-back légendaire.",
          },
          {
            position: "PF",
            firstName: "Karl",
            lastName: "Malone",
            slug: "karl-malone",
            bio: "The Mailman livrait toujours — sauf en Finales contre Jordan. Deux MVP, 36 000 points, une régularité terrifiante sur 19 saisons. Malone était une force de la nature impossible à contenir.",
          },
          {
            position: "C",
            firstName: "Greg",
            lastName: "Ostertag",
            slug: "greg-ostertag",
            bio: "Pivot rugueux et présence physique intimidante, Ostertag protégeait la peinture pour libérer Malone et Stockton. Il représentait le rôle pur et dur que chaque équipe championship a besoin dans sa raquette.",
          },
        ],
      },
    ],
  },
  {
    id: "kobe-shaq",
    label: "L'Ère Kobe & Shaq",
    years: "2000 – 2009",
    description:
      "Trois franchises se sont partagé la décennie. Les Lakers ont régné trois ans, les Spurs ont bâti une machine à titres et les Pistons ont prouvé en 2004 que le collectif peut battre les stars.",
    accentColor: "#7C3AED",
    teams: [
      {
        id: "lakers-threepeat",
        name: "Los Angeles Lakers",
        teamSlug: "los-angeles-lakers",
        nickname: "Three-Peat",
        seasons: "2000 – 2002",
        achievement: "3 titres consécutifs",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        description:
          "Shaquille O'Neal au sommet de sa puissance physique, Kobe Bryant en train de devenir une légende. Trois titres de suite sous la direction de Phil Jackson et le triangle offensif.",
        players: [
          {
            position: "PG",
            firstName: "Derek",
            lastName: "Fisher",
            slug: "derek-fisher",
            bio: "Cinq bagues, un cœur de champion et le tir à 0,4 seconde le plus célèbre de l'histoire des playoffs. Fisher était la boussole mentale d'une équipe de superstars qui en avait besoin.",
          },
          {
            position: "SG",
            firstName: "Kobe",
            lastName: "Bryant",
            slug: "kobe-bryant",
            bio: "La Mamba Mentality n'est pas un slogan — c'est une philosophie de vie. 81 points en un soir, cinq titres, deux MVP des Finales, et une obsession du travail que personne n'a pu égaler.",
          },
          {
            position: "SF",
            firstName: "Rick",
            lastName: "Fox",
            slug: "rick-fox",
            bio: "Athlète complet, défenseur fiable et joueur d'équipe modèle, Fox a gagné trois titres en restant dans l'ombre. Il représentait tout ce qu'une troisième option doit être dans une équipe championship.",
          },
          {
            position: "PF",
            firstName: "Robert",
            lastName: "Horry",
            slug: "robert-horry",
            bio: "Sept bagues avec trois franchises différentes — record absolu. « Big Shot Rob » avait un don surnaturel pour planter les tirs impossibles quand la pression était maximale. Le joueur le plus clutch de l'histoire.",
          },
          {
            position: "C",
            firstName: "Shaquille",
            lastName: "O'Neal",
            slug: "shaquille-o-neal",
            bio: "Force de la nature impossible à contenir physiquement — les équipes changeaient leurs règles et leurs stratégies entières pour lui. Quatre titres, trois MVP des Finales consécutifs, et un talent brut sans équivalent.",
          },
        ],
      },
      {
        id: "spurs-dynasty",
        name: "San Antonio Spurs",
        teamSlug: "san-antonio-spurs",
        nickname: "La Machine Spurs",
        seasons: "2003 – 2007",
        achievement: "3 titres en 5 ans",
        primaryColor: "#061922",
        secondaryColor: "#C4CED4",
        description:
          "Sans stars mondiales, sans spectacle, sans drama. San Antonio a construit la franchise la plus régulière de l'histoire moderne avec le système de Gregg Popovich, Tim Duncan au centre et une culture de l'excellence.",
        players: [
          {
            position: "PG",
            firstName: "Tony",
            lastName: "Parker",
            slug: "tony-parker",
            bio: "MVP des Finales 2007 — le premier Européen à recevoir ce titre — Parker a transformé sa vitesse en arme létale dans le mid-range. L'emblème du basketball européen qui a tout gagné en Amérique.",
          },
          {
            position: "SG",
            firstName: "Manu",
            lastName: "Ginobili",
            slug: "manu-ginobili",
            bio: "Champion olympique, champion NBA, champion EuroLeague : Manu a tout gagné. Son eurostep, ses drives impossibles et son impact sur les moments décisifs en ont fait le sixième homme le plus influent de l'histoire.",
          },
          {
            position: "SF",
            firstName: "Bruce",
            lastName: "Bowen",
            slug: "bruce-bowen",
            bio: "Trois fois dans la meilleure équipe défensive All-NBA, Bowen était le cauchemar de chaque ailier scoreur de la décennie. Sa mission était simple et il l'accomplissait mieux que quiconque.",
          },
          {
            position: "PF",
            firstName: "Tim",
            lastName: "Duncan",
            slug: "tim-duncan",
            bio: "Big Fundamental : cinq titres, trois MVP des Finales, deux MVP de saison. Duncan a prouvé pendant vingt ans que la technique parfaite, sans ego et sans drama, était le chemin le plus court vers les bagues.",
          },
          {
            position: "C",
            firstName: "David",
            lastName: "Robinson",
            slug: "david-robinson",
            bio: "L'Amiral a tout accompli : MVP, DPOY, champion olympique et champion NBA. Passé le flambeau à Duncan avec une élégance rare, remportant son deuxième titre en 2003 lors de sa dernière saison.",
          },
        ],
      },
      {
        id: "detroit-2004",
        name: "Detroit Pistons",
        teamSlug: "detroit-pistons",
        nickname: "Goin' to Work",
        seasons: "2003 – 2004",
        achievement: "Titre NBA 2004",
        primaryColor: "#C8102E",
        secondaryColor: "#006BB6",
        description:
          "Sans star, sans superstar, sans All-Star évident — juste cinq joueurs qui jouaient ensemble comme personne d'autre. Detroit a humilié les Lakers de Kobe et Shaq 4-1 en finale et a changé la perception du basketball collectif.",
        players: [
          {
            position: "PG",
            firstName: "Chauncey",
            lastName: "Billups",
            slug: "chauncey-billups",
            bio: "MVP des Finales 2004 — personne n'avait prévu que ce meneur passé par six franchises en cinq ans allait un jour soulever le trophée. Billups était le calme et la précision que les Pistons portaient dans leurs gènes.",
          },
          {
            position: "SG",
            firstName: "Richard",
            lastName: "Hamilton",
            slug: "richard-hamilton",
            bio: "Masque sur le nez, en mouvement perpétuel, Rip Hamilton épuisait les défenses en courant des circuits sans fin. Sa capacité à scorer sans jamais être le premier choix défensif adverse était son superpouvoir.",
          },
          {
            position: "SF",
            firstName: "Tayshaun",
            lastName: "Prince",
            slug: "tayshaun-prince",
            bio: "Long, mobile et d'une intelligence défensive rare, Prince avait les bras d'un déménageur et la vision d'un joueur d'échecs. Son contre sur Reggie Miller en 2004 reste l'un des plus grands jeux défensifs de l'histoire des playoffs.",
          },
          {
            position: "PF",
            firstName: "Rasheed",
            lastName: "Wallace",
            slug: "rasheed-wallace",
            bio: "Ball don't lie. Rasheed était un ailier-fort versatile et élite dans les deux sens, capable de prendre 3 points et de protéger la raquette dans la même possession. Son intensité était contagieuse pour toute l'équipe.",
          },
          {
            position: "C",
            firstName: "Ben",
            lastName: "Wallace",
            slug: "ben-wallace",
            bio: "Non drafté, jamais sélectionné All-Star de titulaire — pourtant quadruple DPOY et cœur défensif de l'équipe la plus dominante de la décennie. Big Ben était la preuve que le talent ne suffit pas face à la détermination.",
          },
        ],
      },
    ],
  },
  {
    id: "modern",
    label: "L'Ère Moderne",
    years: "2010 – aujourd'hui",
    description:
      "Super-équipes, révolution du 3 points et globalisation. Quatre équipes ont dominé cette décennie à leur façon, du Big Three de Miami aux Nuggets champions 2023.",
    accentColor: "#06B6D4",
    teams: [
      {
        id: "heat-big-three",
        name: "Miami Heat",
        teamSlug: "miami-heat",
        nickname: "Big Three",
        seasons: "2011 – 2014",
        achievement: "2 titres NBA",
        primaryColor: "#98002E",
        secondaryColor: "#F9A01B",
        description:
          "LeBron James, Dwyane Wade et Chris Bosh ont inventé la super-équipe moderne. Controversés à leur arrivée, vénérés à leur départ — ils ont gagné deux titres et atteint quatre finales consécutives.",
        players: [
          {
            position: "PG",
            firstName: "Mario",
            lastName: "Chalmers",
            slug: "mario-chalmers",
            bio: "Meneur d'équipe dans l'ombre des trois stars, Chalmers apportait énergie défensive et rigueur en sortie de picks. Il a eu l'audace de tenir tête à LeBron dans les vestiaires — et d'avoir raison.",
          },
          {
            position: "SG",
            firstName: "Dwyane",
            lastName: "Wade",
            slug: "dwyane-wade",
            bio: "Triple champion, MVP des Finales en 2006 et l'un des gardes les plus athlétiques de l'histoire. Wade a accepté un rôle secondaire à côté de LeBron avec une classe qui a forcé l'admiration de toute la ligue.",
          },
          {
            position: "SF",
            firstName: "LeBron",
            lastName: "James",
            slug: "lebron-james",
            bio: "Le débat est ouvert, mais les chiffres ne mentent pas : quatre titres avec trois franchises, quatre MVP des Finales, le meilleur marqueur de l'histoire NBA. LeBron a traversé chaque époque en la dominant.",
          },
          {
            position: "PF",
            firstName: "Chris",
            lastName: "Bosh",
            slug: "chris-bosh",
            bio: "Deux fois champion, Bosh a sacrifié ses stats personnelles pour jouer dans l'espace et libérer Wade et LeBron. Un pivot de talent All-Star reconverti en facilitateur — le sacrifice ultime pour les bagues.",
          },
          {
            position: "C",
            firstName: "Udonis",
            lastName: "Haslem",
            slug: "udonis-haslem",
            bio: "Vingt ans en Heat, toujours à Miami, jamais là pour les honneurs. Haslem représentait la culture, le sacrifice et la loyauté — la colonne vertébrale invisible de toutes les équipes Heat.",
          },
        ],
      },
      {
        id: "warriors-dynasty",
        name: "Golden State Warriors",
        teamSlug: "golden-state-warriors",
        nickname: "Strength in Numbers",
        seasons: "2015 – 2019",
        achievement: "3 titres NBA",
        primaryColor: "#1D428A",
        secondaryColor: "#FFC72C",
        description:
          "Stephen Curry a changé les règles du basketball, et les Warriors ont changé la façon dont chaque équipe joue depuis. Cinq finales consécutives, trois titres, et le groupe le plus dominateur de leur époque.",
        players: [
          {
            position: "PG",
            firstName: "Stephen",
            lastName: "Curry",
            slug: "stephen-curry",
            bio: "Il a rendu obsolète la notion de « trop loin ». Quatre titres, deux MVP dont un à l'unanimité, et il a littéralement changé le positionnement défensif de chaque équipe du monde depuis 2015.",
          },
          {
            position: "SG",
            firstName: "Klay",
            lastName: "Thompson",
            slug: "klay-thompson",
            bio: "37 points dans un quart-temps, 11 paniers à 3 points en un match. Thompson était l'artiste silencieux de la dynasty Warriors, et le tireur le plus redoutable sur réception de sa génération.",
          },
          {
            position: "SF",
            firstName: "Kevin",
            lastName: "Durant",
            slug: "kevin-durant",
            bio: "Deux fois MVP des Finales avec les Warriors, Durant était la pièce qui rendait Golden State impossible à défendre — 2m08 de shoots au-dessus de n'importe qui, à n'importe quel endroit du terrain.",
          },
          {
            position: "PF",
            firstName: "Draymond",
            lastName: "Green",
            slug: "draymond-green",
            bio: "DPOY, meilleur passeur parmi les intérieurs de sa génération, et cerveau tactique de la dynasty. Draymond était l'intelligence collective des Warriors — irremplaçable, impossible à classer dans une case.",
          },
          {
            position: "C",
            firstName: "Andre",
            lastName: "Iguodala",
            slug: "andre-iguodala",
            bio: "MVP des Finales 2015 pour avoir éteint LeBron James. Iguodala incarnait tout ce que la dynasty Warriors représentait : l'intelligence collective, la défense de haut niveau et le sacrifice individuel.",
          },
        ],
      },
      {
        id: "bucks-2021",
        name: "Milwaukee Bucks",
        teamSlug: "milwaukee-bucks",
        nickname: "Fear the Deer",
        seasons: "2020 – 2021",
        achievement: "Titre NBA 2021",
        primaryColor: "#00471B",
        secondaryColor: "#EEE1C6",
        description:
          "Giannis Antetokounmpo a refusé de partir, a signé une prolongation et a immédiatement livré un titre à Milwaukee. 50 ans après leur dernier sacre, les Bucks sont revenus au sommet avec le Greek Freak en mode historique.",
        players: [
          {
            position: "PG",
            firstName: "Jrue",
            lastName: "Holiday",
            slug: "jrue-holiday",
            bio: "Acquis deux semaines avant la deadline pour apporter de la défense et de la création, Holiday a livré exactement ça — plus un dribble pénétrant décisif en toute fin de match 6 qui a scellé le titre.",
          },
          {
            position: "SG",
            firstName: "Khris",
            lastName: "Middleton",
            slug: "khris-middleton",
            bio: "40 points dans le match 6 des demi-finales de conférence contre Brooklyn. Middleton a toujours été le joueur que personne ne citait mais que chaque coéquipier voulait à ses côtés dans les moments critiques.",
          },
          {
            position: "SF",
            firstName: "Giannis",
            lastName: "Antetokounmpo",
            slug: "giannis-antetokounmpo",
            bio: "De vendeur de rue à Athènes à MVP des Finales avec 50 points en décisif — la plus belle trajectoire du basketball moderne. Deux MVP, DPOY, et un athlétisme qui redéfinit ce qu'un corps humain peut faire sur un terrain.",
          },
          {
            position: "PF",
            firstName: "Bobby",
            lastName: "Portis",
            slug: "bobby-portis",
            bio: "La surprise de la dynasty. Portis a transformé son énergie explosive et sa connection avec le public de Milwaukee en un rôle décisif pendant les playoffs — l'homme du moment que personne n'avait prévu.",
          },
          {
            position: "C",
            firstName: "Brook",
            lastName: "Lopez",
            slug: "brook-lopez",
            bio: "Pivot stretcher d'élite, Lopez a ouvert la peinture pour Giannis tout en protégeant le cercle dans l'autre sens. Son impact défensif et ses 3 points ont redéfini le rôle du pivot moderne à Milwaukee.",
          },
        ],
      },
      {
        id: "nuggets-2023",
        name: "Denver Nuggets",
        teamSlug: "denver-nuggets",
        nickname: "Joker's Kingdom",
        seasons: "2022 – 2023",
        achievement: "Premier titre NBA",
        primaryColor: "#0E2240",
        secondaryColor: "#FEC524",
        description:
          "Le premier titre de l'histoire des Nuggets, bâti autour du joueur le plus atypique de sa génération. Nikola Jokić a prouvé qu'un pivot-playmaker peut emmener une équipe au bout avec intelligence plutôt qu'athlétisme.",
        players: [
          {
            position: "PG",
            firstName: "Jamal",
            lastName: "Murray",
            slug: "jamal-murray",
            bio: "Revenu d'une rupture du LCA pour remporter le titre — puis offrir une performance de 25 points en moyenne en playoffs. Murray était le complément parfait à Jokic, capable d'allumer les défenses au moment critique.",
          },
          {
            position: "SG",
            firstName: "Kentavious",
            lastName: "Caldwell-Pope",
            slug: "kentavious-caldwell-pope",
            bio: "Champion en 2020 avec les Lakers, champion en 2023 avec Denver. KCP apportait la défense d'élite, le tir en sortie de picks et la mentalité de champion que les Nuggets avaient besoin pour franchir le dernier palier.",
          },
          {
            position: "SF",
            firstName: "Michael",
            lastName: "Porter Jr.",
            slug: "michael-porter-jr",
            bio: "Un des talents offensifs les plus purs de sa génération — 2m08 capable de scorer depuis n'importe où. MPJ a surmonté deux opérations du dos pour devenir l'arme secrète des Nuggets en playoffs.",
          },
          {
            position: "PF",
            firstName: "Aaron",
            lastName: "Gordon",
            slug: "aaron-gordon",
            bio: "Sacrifié et transformé depuis Orlando, Gordon est devenu le défenseur polyvalent et l'énergiseur de Denver. Deux fois champion, il représente tout ce qu'un joueur peut accomplir quand il accepte son rôle.",
          },
          {
            position: "C",
            firstName: "Nikola",
            lastName: "Jokić",
            slug: "nikola-jokic",
            bio: "Trois MVP, un titre, le record historique de triple-doubles en playoffs. Jokic a prouvé qu'un pivot peut mener une équipe comme un meneur, lire le jeu comme un coach et dominer sans jamais courir vite.",
          },
        ],
      },
    ],
  },
];
