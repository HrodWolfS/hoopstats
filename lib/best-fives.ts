export type EraPlayer = {
  position: "PG" | "SG" | "SF" | "PF" | "C";
  firstName: string;
  lastName: string;
  slug: string;
};

export type IconicTeam = {
  id: string;
  name: string; // nom complet de la franchise
  nickname: string; // surnom de cette équipe légendaire
  seasons: string; // ex: "1980 – 1988"
  achievement: string; // ex: "5 titres NBA"
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
          },
          {
            position: "SG",
            firstName: "Sam",
            lastName: "Jones",
            slug: "sam-jones",
          },
          {
            position: "SF",
            firstName: "Tom",
            lastName: "Heinsohn",
            slug: "tom-heinsohn",
          },
          {
            position: "PF",
            firstName: "Tom",
            lastName: "Sanders",
            slug: "tom-sanders",
          },
          {
            position: "C",
            firstName: "Bill",
            lastName: "Russell",
            slug: "bill-russell",
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
      "Deux rivaux absolus et des Bad Boys venus tout casser. Cette décennie a inventé le NBA moderne avec ses stars, ses rivalités et ses salles pleines à craquer.",
    accentColor: "#EC4899",
    teams: [
      {
        id: "showtime-lakers",
        name: "Los Angeles Lakers",
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
          },
          {
            position: "SG",
            firstName: "Byron",
            lastName: "Scott",
            slug: "byron-scott",
          },
          {
            position: "SF",
            firstName: "James",
            lastName: "Worthy",
            slug: "james-worthy",
          },
          {
            position: "PF",
            firstName: "A.C.",
            lastName: "Green",
            slug: "a-c-green",
          },
          {
            position: "C",
            firstName: "Kareem",
            lastName: "Abdul-Jabbar",
            slug: "kareem-abdul-jabbar",
          },
        ],
      },
      {
        id: "bird-celtics",
        name: "Boston Celtics",
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
          },
          {
            position: "SG",
            firstName: "Danny",
            lastName: "Ainge",
            slug: "danny-ainge",
          },
          {
            position: "SF",
            firstName: "Larry",
            lastName: "Bird",
            slug: "larry-bird",
          },
          {
            position: "PF",
            firstName: "Kevin",
            lastName: "McHale",
            slug: "kevin-mchale",
          },
          {
            position: "C",
            firstName: "Robert",
            lastName: "Parish",
            slug: "robert-parish",
          },
        ],
      },
      {
        id: "bad-boys-pistons",
        name: "Detroit Pistons",
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
          },
          {
            position: "SG",
            firstName: "Joe",
            lastName: "Dumars",
            slug: "joe-dumars",
          },
          {
            position: "SF",
            firstName: "Vinnie",
            lastName: "Johnson",
            slug: "vinnie-johnson",
          },
          {
            position: "PF",
            firstName: "Dennis",
            lastName: "Rodman",
            slug: "dennis-rodman",
          },
          {
            position: "C",
            firstName: "Bill",
            lastName: "Laimbeer",
            slug: "bill-laimbeer",
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
          },
          {
            position: "SG",
            firstName: "Michael",
            lastName: "Jordan",
            slug: "michael-jordan",
          },
          {
            position: "SF",
            firstName: "Scottie",
            lastName: "Pippen",
            slug: "scottie-pippen",
          },
          {
            position: "PF",
            firstName: "Dennis",
            lastName: "Rodman",
            slug: "dennis-rodman",
          },
          {
            position: "C",
            firstName: "Luc",
            lastName: "Longley",
            slug: "luc-longley",
          },
        ],
      },
      {
        id: "utah-jazz",
        name: "Utah Jazz",
        nickname: "Stockton to Malone",
        seasons: "1996 – 1998",
        achievement: "2 finales NBA",
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
          },
          {
            position: "SG",
            firstName: "Jeff",
            lastName: "Hornacek",
            slug: "jeff-hornacek",
          },
          {
            position: "SF",
            firstName: "Bryon",
            lastName: "Russell",
            slug: "bryon-russell",
          },
          {
            position: "PF",
            firstName: "Karl",
            lastName: "Malone",
            slug: "karl-malone",
          },
          {
            position: "C",
            firstName: "Greg",
            lastName: "Ostertag",
            slug: "greg-ostertag",
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
          },
          {
            position: "SG",
            firstName: "Kobe",
            lastName: "Bryant",
            slug: "kobe-bryant",
          },
          {
            position: "SF",
            firstName: "Rick",
            lastName: "Fox",
            slug: "rick-fox",
          },
          {
            position: "PF",
            firstName: "Robert",
            lastName: "Horry",
            slug: "robert-horry",
          },
          {
            position: "C",
            firstName: "Shaquille",
            lastName: "O'Neal",
            slug: "shaquille-o-neal",
          },
        ],
      },
      {
        id: "spurs-dynasty",
        name: "San Antonio Spurs",
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
          },
          {
            position: "SG",
            firstName: "Manu",
            lastName: "Ginobili",
            slug: "manu-ginobili",
          },
          {
            position: "SF",
            firstName: "Bruce",
            lastName: "Bowen",
            slug: "bruce-bowen",
          },
          {
            position: "PF",
            firstName: "Tim",
            lastName: "Duncan",
            slug: "tim-duncan",
          },
          {
            position: "C",
            firstName: "David",
            lastName: "Robinson",
            slug: "david-robinson",
          },
        ],
      },
      {
        id: "detroit-2004",
        name: "Detroit Pistons",
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
          },
          {
            position: "SG",
            firstName: "Richard",
            lastName: "Hamilton",
            slug: "richard-hamilton",
          },
          {
            position: "SF",
            firstName: "Tayshaun",
            lastName: "Prince",
            slug: "tayshaun-prince",
          },
          {
            position: "PF",
            firstName: "Rasheed",
            lastName: "Wallace",
            slug: "rasheed-wallace",
          },
          {
            position: "C",
            firstName: "Ben",
            lastName: "Wallace",
            slug: "ben-wallace",
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
          },
          {
            position: "SG",
            firstName: "Dwyane",
            lastName: "Wade",
            slug: "dwyane-wade",
          },
          {
            position: "SF",
            firstName: "LeBron",
            lastName: "James",
            slug: "lebron-james",
          },
          {
            position: "PF",
            firstName: "Chris",
            lastName: "Bosh",
            slug: "chris-bosh",
          },
          {
            position: "C",
            firstName: "Udonis",
            lastName: "Haslem",
            slug: "udonis-haslem",
          },
        ],
      },
      {
        id: "warriors-dynasty",
        name: "Golden State Warriors",
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
          },
          {
            position: "SG",
            firstName: "Klay",
            lastName: "Thompson",
            slug: "klay-thompson",
          },
          {
            position: "SF",
            firstName: "Kevin",
            lastName: "Durant",
            slug: "kevin-durant",
          },
          {
            position: "PF",
            firstName: "Draymond",
            lastName: "Green",
            slug: "draymond-green",
          },
          {
            position: "C",
            firstName: "Andre",
            lastName: "Iguodala",
            slug: "andre-iguodala",
          },
        ],
      },
      {
        id: "bucks-2021",
        name: "Milwaukee Bucks",
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
          },
          {
            position: "SG",
            firstName: "Khris",
            lastName: "Middleton",
            slug: "khris-middleton",
          },
          {
            position: "SF",
            firstName: "Giannis",
            lastName: "Antetokounmpo",
            slug: "giannis-antetokounmpo",
          },
          {
            position: "PF",
            firstName: "Bobby",
            lastName: "Portis",
            slug: "bobby-portis",
          },
          {
            position: "C",
            firstName: "Brook",
            lastName: "Lopez",
            slug: "brook-lopez",
          },
        ],
      },
      {
        id: "nuggets-2023",
        name: "Denver Nuggets",
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
          },
          {
            position: "SG",
            firstName: "Kentavious",
            lastName: "Caldwell-Pope",
            slug: "kentavious-caldwell-pope",
          },
          {
            position: "SF",
            firstName: "Michael",
            lastName: "Porter Jr.",
            slug: "michael-porter-jr",
          },
          {
            position: "PF",
            firstName: "Aaron",
            lastName: "Gordon",
            slug: "aaron-gordon",
          },
          {
            position: "C",
            firstName: "Nikola",
            lastName: "Jokić",
            slug: "nikola-jokic",
          },
        ],
      },
    ],
  },
];
