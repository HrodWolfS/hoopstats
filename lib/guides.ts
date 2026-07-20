export const GUIDES = [
  {
    slug: "lire-une-ligne-de-stats",
    title: "Comment lire une ligne de statistiques NBA",
    description: "Comprendre volume, efficacité, temps de jeu et taille d’échantillon sans tirer de conclusion trop vite.",
    sections: [
      { title: "Commencer par l’échantillon", text: "Le nombre de matchs et les minutes jouées déterminent la stabilité d’une moyenne. Dix matchs décrivent une période ; une saison entière décrit mieux le niveau établi." },
      { title: "Séparer volume et efficacité", text: "Les points, rebonds et passes indiquent le volume produit. Les pourcentages et le True Shooting renseignent sur l’efficacité avec laquelle ce volume est obtenu." },
      { title: "Ajouter le contexte", text: "Comparez le joueur à son poste, à la moyenne de la ligue et à sa saison précédente. Un chiffre isolé ne suffit pas à décrire un rôle." },
    ],
  },
  {
    slug: "comprendre-les-stats-avancees",
    title: "Comprendre les statistiques avancées NBA",
    description: "TS%, Usage Rate, PIE et ratings expliqués avec leurs usages et leurs limites.",
    sections: [
      { title: "True Shooting", text: "Le TS% combine tirs à deux points, tirs à trois points et lancers francs. Il mesure mieux l’efficacité globale au tir que le seul FG%." },
      { title: "Usage Rate", text: "L’USG% estime la part des possessions terminées par un joueur lorsqu’il est sur le terrain. Un usage élevé décrit un rôle important, pas automatiquement une bonne performance." },
      { title: "Ratings", text: "ORtg et DRtg décrivent les points marqués ou encaissés sur 100 possessions avec le joueur sur le terrain. Le contexte des coéquipiers et adversaires reste essentiel." },
      { title: "PIE", text: "Le Player Impact Estimate de NBA.com synthétise la part de production statistique attribuable au joueur. Dans hoopstats, le champ PIE ne désigne pas le PER de John Hollinger." },
    ],
  },
  {
    slug: "comparer-deux-joueurs",
    title: "Comparer deux joueurs sans se tromper",
    description: "Une méthode simple pour comparer des profils, des rôles et des saisons de façon honnête.",
    sections: [
      { title: "Comparer la même saison", text: "Le rythme, les règles et le contexte offensif évoluent. Commencez par une même saison ou utilisez les percentiles lorsque vous traversez les époques." },
      { title: "Comparer des rôles proches", text: "Un pivot protecteur de cercle et un meneur créateur n’ont pas les mêmes responsabilités. Les comparaisons par groupe de poste limitent les conclusions absurdes." },
      { title: "Lire plusieurs dimensions", text: "Volume, efficacité, création, défense et disponibilité doivent être lus ensemble. Une seule métrique ne peut pas établir une hiérarchie complète." },
    ],
  },
] as const;

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}
