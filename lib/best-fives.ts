export type BestFivePlayer = {
  position: "PG" | "SG" | "SF" | "PF" | "C";
  firstName: string;
  lastName: string;
  slug: string;
  team: string; // équipe emblématique de l'ère
  primaryColor: string;
  secondaryColor: string;
  rationale: string;
};

export type BestFiveEra = {
  id: string;
  label: string;
  years: string;
  description: string;
  accentColor: string;
  players: BestFivePlayer[];
};

export const BEST_FIVES: BestFiveEra[] = [
  {
    id: "pioneers",
    label: "Les Pionniers",
    years: "1946–1969",
    description:
      "Les bâtisseurs de la NBA, dans une époque sans télévision ni millions. Ils ont posé les fondations du jeu moderne sans le savoir.",
    accentColor: "#F59E0B",
    players: [
      {
        position: "PG",
        firstName: "Bob",
        lastName: "Cousy",
        slug: "bob-cousy",
        team: "Boston Celtics",
        primaryColor: "#007A33",
        secondaryColor: "#BA9653",
        rationale:
          "Surnommé « l'Houdini du parquet », Cousy a inventé la passe derrière le dos et orchestré six titres consécutifs des Celtics. Le premier meneur de grande classe de l'histoire NBA.",
      },
      {
        position: "SG",
        firstName: "Jerry",
        lastName: "West",
        slug: "jerry-west",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Silhouette choisie pour le logo NBA, Jerry West incarnait la perfection du tir en suspension. 14 sélections au All-Star Game et une compétitivité légendaire jusqu'aux dernières secondes.",
      },
      {
        position: "SF",
        firstName: "Elgin",
        lastName: "Baylor",
        slug: "elgin-baylor",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Elgin Baylor a inventé le jeu moderne avant que quiconque ne le comprenne — flottements, acrobaties, 71 points en un soir. Le précurseur de tout ce qu'on admire aujourd'hui.",
      },
      {
        position: "PF",
        firstName: "Bob",
        lastName: "Pettit",
        slug: "bob-pettit",
        team: "St. Louis Hawks",
        primaryColor: "#E03A3E",
        secondaryColor: "#C1D32F",
        rationale:
          "Premier grand ailier-fort de l'histoire, Bob Pettit a remporté deux MVPs et mené les Hawks à leur seul titre en 1958. Tout construit à la sueur de son front, saison après saison.",
      },
      {
        position: "C",
        firstName: "Bill",
        lastName: "Russell",
        slug: "bill-russell",
        team: "Boston Celtics",
        primaryColor: "#007A33",
        secondaryColor: "#BA9653",
        rationale:
          "11 titres en 13 saisons. Aucun joueur dans l'histoire du sport professionnel n'a dominé à ce point une compétition. Russell n'a pas seulement gagné — il a rendu ses coéquipiers meilleurs à chaque match.",
      },
    ],
  },
  {
    id: "showtime",
    label: "L'Ère Showtime",
    years: "1970–1989",
    description:
      "La NBA explose en couleurs avec Magic, Kareem et Dr. J. Le basketball devient spectacle, les parquets deviennent scènes.",
    accentColor: "#EC4899",
    players: [
      {
        position: "PG",
        firstName: "Magic",
        lastName: "Johnson",
        slug: "magic-johnson",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Magic Johnson a redéfini le poste de meneur : 2m06, capable de jouer toutes les positions, sourire permanent. Cinq titres avec les Lakers, trois MVPs, et le visage du basketball moderne.",
      },
      {
        position: "SG",
        firstName: "George",
        lastName: "Gervin",
        slug: "george-gervin",
        team: "San Antonio Spurs",
        primaryColor: "#061922",
        secondaryColor: "#C4CED4",
        rationale:
          "The Iceman a remporté quatre titres de meilleur marqueur avec un toucher de balle inimitable. George Gervin marquait 30 points avec une économie de geste qui semblait irréelle.",
      },
      {
        position: "SF",
        firstName: "Julius",
        lastName: "Erving",
        slug: "julius-erving",
        team: "Philadelphia 76ers",
        primaryColor: "#006BB6",
        secondaryColor: "#ED174C",
        rationale:
          "Dr. J a transcendé deux ligues (ABA puis NBA) avec une élégance aérienne jamais vue. Julius Erving n'était pas seulement un basketteur — c'était une œuvre d'art en mouvement.",
      },
      {
        position: "PF",
        firstName: "Moses",
        lastName: "Malone",
        slug: "moses-malone",
        team: "Philadelphia 76ers",
        primaryColor: "#006BB6",
        secondaryColor: "#ED174C",
        rationale:
          "Triple MVP (1979, 1982, 1983), Moses Malone dominait la raquette avec une férocité et une endurance hors normes. Sa promesse légendaire avant 1983 — « Fo', Fo', Fo' » — s'est presque réalisée.",
      },
      {
        position: "C",
        firstName: "Kareem",
        lastName: "Abdul-Jabbar",
        slug: "kareem-abdul-jabbar",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Le skyhook est le tir le plus imparable de l'histoire du basketball. Kareem a accumulé des records sur 20 saisons pour rester le meilleur marqueur de l'histoire NBA — jusqu'à LeBron.",
      },
    ],
  },
  {
    id: "jordan-era",
    label: "L'Ère Jordan",
    years: "1990–1999",
    description:
      "Une décennie dominée par un seul homme et son équipe. Mais autour de lui, des joueurs d'une qualité exceptionnelle ont écrit l'histoire.",
    accentColor: "#CE1141",
    players: [
      {
        position: "PG",
        firstName: "John",
        lastName: "Stockton",
        slug: "john-stockton",
        team: "Utah Jazz",
        primaryColor: "#002B5C",
        secondaryColor: "#F9A01B",
        rationale:
          "Recordman all-time des passes et des interceptions, John Stockton a orchestré le Jazz pendant 19 saisons avec une constance et une intelligence de jeu irréprochables.",
      },
      {
        position: "SG",
        firstName: "Michael",
        lastName: "Jordan",
        slug: "michael-jordan",
        team: "Chicago Bulls",
        primaryColor: "#CE1141",
        secondaryColor: "#000000",
        rationale:
          "Six titres, six Finals MVP, cinq MVP de saison régulière. Michael Jordan n'est pas seulement le meilleur joueur des années 90 — pour beaucoup, c'est le GOAT.",
      },
      {
        position: "SF",
        firstName: "Scottie",
        lastName: "Pippen",
        slug: "scottie-pippen",
        team: "Chicago Bulls",
        primaryColor: "#CE1141",
        secondaryColor: "#000000",
        rationale:
          "Souvent dans l'ombre de Jordan, Pippen était l'architecte défensif des Bulls dynastiques. Phil Jackson le considérait comme le joueur le plus complet qu'il ait jamais coaché.",
      },
      {
        position: "PF",
        firstName: "Karl",
        lastName: "Malone",
        slug: "karl-malone",
        team: "Utah Jazz",
        primaryColor: "#002B5C",
        secondaryColor: "#F9A01B",
        rationale:
          "Two-time MVP, Karl Malone était une machine à scorer d'une régularité terrifiante sur 19 saisons. The Mailman livrait toujours — sauf lors des deux Finals face à Jordan.",
      },
      {
        position: "C",
        firstName: "Hakeem",
        lastName: "Olajuwon",
        slug: "hakeem-olajuwon",
        team: "Houston Rockets",
        primaryColor: "#CE1141",
        secondaryColor: "#C4CED4",
        rationale:
          "Hakeem Olajuwon a démontré qu'un pivot peut avoir les pieds d'un danseur. Deux titres consécutifs, le Dream Shake imparable, DPOY — l'archétype du grand pivot technique.",
      },
    ],
  },
  {
    id: "kobe-shaq",
    label: "L'Ère Kobe & Shaq",
    years: "2000–2009",
    description:
      "La décennie de la domination physique absolue. Les Spurs, les Lakers et une génération de talents hors normes.",
    accentColor: "#7C3AED",
    players: [
      {
        position: "PG",
        firstName: "Steve",
        lastName: "Nash",
        slug: "steve-nash",
        team: "Phoenix Suns",
        primaryColor: "#1D1160",
        secondaryColor: "#E56020",
        rationale:
          "Steve Nash a décroché deux MVPs consécutifs (2005, 2006) en révolutionnant le pick-and-roll et le jeu à 7 secondes. Le meneur canadien le plus influent de l'histoire de la ligue.",
      },
      {
        position: "SG",
        firstName: "Kobe",
        lastName: "Bryant",
        slug: "kobe-bryant",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "La Mamba Mentality n'est pas un slogan — c'est une philosophie de travail incarnée. Cinq titres, 81 points en un match, deux Finals MVP : Kobe Bryant a tout fait à sa façon.",
      },
      {
        position: "SF",
        firstName: "Tracy",
        lastName: "McGrady",
        slug: "tracy-mcgrady",
        team: "Orlando Magic",
        primaryColor: "#007DC5",
        secondaryColor: "#C4072F",
        rationale:
          "Tracy McGrady possédait peut-être le talent brut le plus insondable de sa génération. Deux titres de meilleur marqueur, des highlights impossibles, une carrière que les blessures ont volée.",
      },
      {
        position: "PF",
        firstName: "Tim",
        lastName: "Duncan",
        slug: "tim-duncan",
        team: "San Antonio Spurs",
        primaryColor: "#061922",
        secondaryColor: "#C4CED4",
        rationale:
          "Big Fundamental : Tim Duncan a prouvé que la solidité technique bat le spectacle sur la durée. Cinq titres avec les Spurs, trois Finals MVP, le plus grand ailier-fort de tous les temps.",
      },
      {
        position: "C",
        firstName: "Shaquille",
        lastName: "O'Neal",
        slug: "shaquille-o-neal",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Shaquille O'Neal était une force de la nature impossible à contenir. Quatre titres, trois Finals MVP consécutifs, et un joueur autour duquel toute la défense adverse devait être repensée.",
      },
    ],
  },
  {
    id: "modern",
    label: "L'Ère Moderne",
    years: "2010–aujourd'hui",
    description:
      "La révolution du 3 points, les super-équipes et la globalisation du jeu. Une génération de talents qui redéfinit ce qu'est un grand joueur.",
    accentColor: "#06B6D4",
    players: [
      {
        position: "PG",
        firstName: "Stephen",
        lastName: "Curry",
        slug: "stephen-curry",
        team: "Golden State Warriors",
        primaryColor: "#1D428A",
        secondaryColor: "#FFC72C",
        rationale:
          "Stephen Curry a littéralement changé les règles du basketball : la ligne à 3 points n'est plus une limite, c'est son terrain de jeu. Quatre titres, deux MVPs dont un à l'unanimité.",
      },
      {
        position: "SG",
        firstName: "James",
        lastName: "Harden",
        slug: "james-harden",
        team: "Houston Rockets",
        primaryColor: "#CE1141",
        secondaryColor: "#C4CED4",
        rationale:
          "James Harden a perfectionné l'art du step-back et de l'isolation jusqu'à en faire une science. MVP 2018, multiple scoring champion, l'un des scoreurs les plus prolifiques de l'histoire.",
      },
      {
        position: "SF",
        firstName: "LeBron",
        lastName: "James",
        slug: "lebron-james",
        team: "Los Angeles Lakers",
        primaryColor: "#552583",
        secondaryColor: "#FDB927",
        rationale:
          "Le débat est ouvert, mais les chiffres sont là : quatre titres avec trois franchises différentes, quatre Finals MVP. LeBron James a transcendé chaque époque qu'il a traversée.",
      },
      {
        position: "PF",
        firstName: "Giannis",
        lastName: "Antetokounmpo",
        slug: "giannis-antetokounmpo",
        team: "Milwaukee Bucks",
        primaryColor: "#00471B",
        secondaryColor: "#EEE1C6",
        rationale:
          "De vendeur de rue à Athènes à deux fois MVP NBA, Giannis est la plus belle histoire du basketball moderne. Champion 2021, DPOY, et un athlétisme qui redéfinit le poste d'ailier-fort.",
      },
      {
        position: "C",
        firstName: "Nikola",
        lastName: "Jokić",
        slug: "nikola-jokic",
        team: "Denver Nuggets",
        primaryColor: "#0E2240",
        secondaryColor: "#FEC524",
        rationale:
          "Nikola Jokić a prouvé qu'un pivot peut mener une équipe comme un meneur, passer comme un playmaker et rebounder comme un déménageur. Trois MVPs, un titre, la révolution intellectuelle du poste.",
      },
    ],
  },
];
