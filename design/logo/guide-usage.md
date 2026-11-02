# hoopstats — guide d'usage du logo

**Idée.** Un signe % dont les deux ronds sont le ballon (plein, orange) et le cercle (anneau vu de biais) : *réussis sur tentés*, le langage même des stats de tir.

## Fichiers (`final/`)

| Usage | Fichier |
|---|---|
| Logo principal | `horizontal-couleur.svg` (fond clair) · `horizontal-couleur-fond-sombre.svg` (fond sombre) |
| Format carré / vertical | `empile-*.svg` |
| Symbole seul | `symbole-*.svg` — dès 48 px |
| Petites tailles (≤ 32 px) | `symbole-petit-*.svg` : formes plus pleines, trou du cercle agrandi |
| Mot seul | `mot-*.svg` — quand le symbole est déjà présent ailleurs sur la page |
| Une couleur | `*-noir.svg`, `*-blanc.svg` |
| Web | `web/` : favicon.ico/svg, apple-touch-icon, icônes 192/512, maskable, `site.webmanifest`, `head-snippet.html` |
| PNG | `png/` (fond transparent) |

Les sources se régénèrent avec `python3 src/build.py`, puis `RENDER=…/render_png.py bash src/export.sh`.

## Couleurs

| | HEX | RGB | CMJN (approx.) | Pantone (proche) |
|---|---|---|---|---|
| Orange ballon | `#F97316` | 249 115 22 | 0 66 95 0 | 1505 C |
| Encre | `#0A0A0B` | 10 10 11 | 0 0 0 100 | Black 6 C |
| Blanc | `#FFFFFF` | 255 255 255 | 0 0 0 0 | — |

- L'orange n'habille **que le ballon**. Barre, cercle et mot sont en encre (fond clair) ou en blanc (fond sombre).
- Ne jamais écrire de texte en orange sur blanc (contraste 2,8:1, insuffisant). L'orange sur encre passe (7:1).
- La version sur fond sombre est amincie d'environ 4 % (le blanc « gonfle ») : utiliser le fichier dédié, ne pas recolorer le fichier clair.

## Typographie

Mot : **Space Grotesk 600**, approche −20, crénage d'origine, vectorisé (aucune police à installer). Licence SIL OFL : usage en logo autorisé. Pour le texte du site, Space Grotesk ou la police d'interface existante.

## Zone de protection et tailles minimales

- Marge libre autour du logo = **diamètre du ballon** sur chaque côté. Rien ne doit y entrer (texte, bord, autre logo).
- Horizontal : **120 px** de large minimum à l'écran (25 mm en impression). En dessous, utiliser le symbole.
- Symbole : 48 px et plus en version normale ; **16 à 32 px en version petite taille**.

## Fonds autorisés

Blanc et gris très clairs → version couleur. Encre et fonds sombres → version fond sombre. Photo ou fond chargé → poser le logo sur une tuile encre (`icone-appli.svg`) ou passer en version blanche ou noire.

## À ne pas faire

- Étirer, incliner, faire pivoter le symbole, ou changer l'angle de la barre.
- Recolorer la barre ou le cercle en orange, ou le ballon dans une autre couleur.
- Ajouter ombre, contour, dégradé ou effet de lumière.
- Réécrire le mot avec une police active, ou modifier l'espace entre le symbole et le mot.
- Remplir le trou du cercle, ou poser la version claire sur un fond sombre.

## À savoir

- La recherche d'antériorité de marque n'est pas faite : à vérifier sur la base INPI (et EUIPO si besoin) avant tout dépôt.
- « NBA » et les logos d'équipes restent la propriété de leurs titulaires : ne pas les associer au logo hoopstats dans un même bloc.
