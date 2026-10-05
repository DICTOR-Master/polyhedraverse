# Guide de l'utilisateur de Polyhedraverse

Polyhedraverse et son jumeau, [Rhombiverse](https://rhombiverse.vercel.app), sont deux façons de regarder la même géométrie. Rhombiverse est le **paysage** : les réseaux eux-mêmes, qui s'étendent dans toutes les directions. Polyhedraverse est la **galerie de portraits** : les formes qui habitent ces réseaux, une à la fois, vues de près.

Ici, il n'y a pas de réseau. Vous partez d'une forme et vous y reliez d'autres formes, sommet à sommet ou face à face, et la structure naît des formes elles-mêmes. Certaines formes peuvent aussi être prolongées jusqu'à leur vrai polytope 4D, une cellule à la fois.

La première partie de ce guide présente les tâches courantes. La seconde liste toutes les commandes.

Les noms des boutons sont écrits tels qu'ils apparaissent dans l'application (ceux que l'application ne traduit pas encore restent en anglais). Les noms des formes et des familles restent sous leur forme d'origine dans toutes les langues.

## Premiers pas

### Choisir une forme

1. Appuyez sur **ENTER** sur l'écran d'accueil.
2. Touchez le bouton de la **roue des formes** (☰, en bas à gauche) ou ◐ sur la roue du coin pour ouvrir la roue des formes. (**Start over with…**, Tab ou Espace ouvrent plutôt le navigateur de formes.)
3. La roue est un dodécaèdre. Chaque face est une famille de formes. Faites-la glisser pour la tourner (ou utilisez les flèches du clavier), et touchez une face pour ouvrir cette famille. Survolez une face, ou appuyez longuement dessus, pour voir son nom. Dans une famille, la face **Home** (un H dans un hexagone) vous ramène aux familles.
4. Touchez une forme. Elle remplace ce qui est à l'écran : vous repartez de zéro.

**Faire Tourner la Roue** choisit une famille au hasard.

### Déplacer la caméra

- **Tourner :** faites glisser un doigt, ou faites glisser avec le bouton gauche de la souris.
- **Zoomer :** pincez, ou utilisez la molette.

### Attacher une forme à une face

1. Touchez le corps d'une forme pour la sélectionner. La face touchée est sélectionnée aussi.
2. Touchez **Attach via face…**. Le sélecteur ne propose que des formes qui ont une face de la même taille.
3. La nouvelle forme apparaît mais n'est pas encore fixée. Faites-la glisser pour la tourner, puis touchez **Confirm**, ou **Cancel** (ou appuyez sur Échap).

Deux formes reliées face à face partagent exactement cette face, un cube sur un cube par exemple.

Faire glisser passe en revue toutes les façons dont la nouvelle forme peut se poser sur cette face, en les comptant (« registration 3/8 ») : chaque rotation de la face et, quand la nouvelle forme a des faces de cette taille qui ne se ressemblent pas, chacune de ces faces aussi, si bien qu'une pièce aux faces inégales peut toujours être posée comme vous le voulez. Par exemple, pour construire le prisme incliné de DICTO, commencez par le bloc à faces carrées, attachez le bloc tout en losanges à l'un de ses losanges de 72° et faites glisser jusqu'à ce que les faces hexagonales soient à plat, puis attachez un second bloc à faces carrées de la même façon.

Les meilleurs ajustements viennent en premier : un placement qui affleure deux ou trois faces des pièces déjà construites (en se logeant dans un coin) est proposé avant celui qui ne touche que la face choisie, et le compteur l'indique (« registration 1/4 · 3 faces »). Les placements qui traverseraient une pièce déjà construite ne sont pas proposés. Pour les formes qui pavent l'espace, une copie fixée à sa propre forme commence à la position qui prolonge le pavage. Les faces qui se retrouvent contre une voisine comptent comme utilisées et ne sont plus proposées.

### Attacher une forme à un sommet

1. Touchez un **sommet en surbrillance**. Seuls les sommets libres s'allument. Les formes qui ont encore de la place pour construire brillent.
2. Touchez **Attach via vertex…** et choisissez n'importe quelle forme. Une jonction par sommet accepte toutes les formes.
3. Tournez-la et touchez **Confirm**, comme pour une attache par face.

### Annuler et supprimer

- **Undo** (↶, barre du haut) annule votre dernière modification, quelle qu'elle soit : une attache, une suppression, un Transform, une étape de construction 4D, Start over ou une importation. Touchez-le de nouveau pour continuer à remonter, ou maintenez-le pour revenir plusieurs étapes d'un coup.
- Sélectionnez une forme et touchez **Delete** pour la retirer, avec tout ce qui a été construit dessus.

## Parcourir le catalogue

Le **navigateur de formes** (◈ sur la roue du coin) est la galerie. Il a ces onglets :

- **Accueil :** les familles, plus les formes vues récemment et vos favoris.
- **Recherche :** cherchez par nom (essayez « J12 » ou « gyrobicupola »), ou filtrez par famille, forme de face et nombre de faces.
- **Scène :** ce que vous avez construit jusqu'ici.
- **Favoris :** les formes marquées d'une étoile.

Touchez une forme pour voir ses détails : sommets, arêtes, faces et connecteurs. De là, vous pouvez :

- **Ajouter à la Scène :** commencer à construire avec elle.
- **Favori :** la marquer d'une étoile.
- **Ajouter à Comparer :** mettre jusqu'à quatre formes côte à côte.
- **Voir en 4D :** pour les formes compatibles 4D, afficher le polytope 4D dans lequel elle se prolonge.

Les formes de **3D+ Bridges** indiquent aussi, dans leurs détails, vers quel polytope supérieur elles font le pont (par exemple, le dodécaèdre rhombique est l'ombre du tesseract et du 24-cell).

### Les familles

| Famille | Contenu |
|---|---|
| Deltahedra | Les 8 solides convexes faits uniquement de triangles équilatéraux |
| Platonic | Les 5 solides réguliers |
| Archimedean | Les 13 solides semi-réguliers |
| Johnson | Les 92 solides convexes à faces régulières |
| Catalan | Les duaux des solides d'Archimède |
| Stellations | Des pièces pour les solides de Platon et de Catalan, chacune s'adaptant à une face : plate (les pyramides se rejoignent en un nouveau solide convexe, comme le cube à partir d'un tétraèdre), puis chaque stellation que le solide possède vraiment, jusqu'à la troisième. Une pièce sur chaque face construit exactement cette stellation, par ex. les petit dodécaèdre étoilé, grand dodécaèdre et grand dodécaèdre étoilé |
| Prisms, Antiprisms | Deux polygones reliés par une bande de carrés ou de triangles |
| 4D Polytopes | Les six polytopes 4D réguliers (5, 8, 16, 24, 120 et 600 cellules) par symétrie ; ouvrez-en un et Le construire place sa cellule germe et le construit cellule par cellule |
| Parallelohedra | Des formes qui remplissent l'espace par simple translation : les cinq de Fedorov, puis des variantes (le rhomboèdre, et le prisme hexagonal incliné de DICTO avec ses deux blocs, et son dodécaèdre rhombique oblique avec son rhomboèdre aplati, trouvés avec Zometool), puis les vérifiés dans Kaleidohedra (les cellules à arêtes égales de l'étirement de Bain : le dodécaèdre rhombique de Bain, et les dodécaèdres allongés à hexagones réguliers et de Bain, de DICTO), puis le Kaleidohedra Regular 9 (toutes les formes qui pavent l'espace avec des arêtes égales et des faces qui ne sont que des carrés, des hexagones réguliers et des losanges de 60°) |
| Space-Filling Pairs | Deux formes qui remplissent l'espace ensemble |
| Aperiodic Sets | Deux paires apériodiques : les rhomboèdres dorés allongé et aplati (le pavage de Penrose en 3D) et les prismes de losange de Penrose épais et fin (le pavage 5D en couches) |
| 3D+ Bridges | Des formes qui sont l'ombre, la section, la cellule ou le coin d'un polytope de dimension supérieure ; leurs détails disent lequel |
| Miscellaneous | Pyramides graduées, pièces de connexion et rallonges de prisme |

Les polyèdres étoilés sont aussi listés. On ne peut pas les attacher, car leurs faces se traversent, mais on peut en construire trois : un dodécaèdre avec une pièce **Stellations** sur chaque face donne le petit dodécaèdre étoilé (pièce 2), le grand dodécaèdre (3) ou le grand dodécaèdre étoilé (4).

## Regarder votre construction

Touchez **View** pour passer d'un mode à l'autre parmi trois :

- **Solid :** faces ordinaires.
- **Translucent :** faces transparentes.
- **Skeleton :** seulement les arêtes, pour voir l'intérieur des structures imbriquées.

Touchez **🎨** (Colour) pour choisir la coloration des pièces : **Green** (toutes vertes, par défaut), **Family** (chaque pièce à la couleur de sa famille, avec une légende dans le menu) ou **Pick** (choisissez parmi 14 couleurs ; les nouvelles pièces prennent cette couleur et **Paint** recolore la pièce sélectionnée). Les couleurs choisies sont enregistrées avec la construction.

Quand un groupe de pièces se referme en une cage complète, **Closed cage!** apparaît. Certains assemblages connus ont leur propre nom, comme la Stella Octangula. Touchez **i** à côté du nom pour une description.

## Construire en 4D

Certaines formes sont les briques d'un polytope 4D régulier, par exemple le cube (tesseract) ou le dodécaèdre (120-cellules). Quand vous sélectionnez l'une d'elles, un interrupteur **3D / 4D** apparaît.

1. Sélectionnez la forme et touchez **4D**. Si elle peut se refermer en plusieurs polytopes, choisissez lequel.
2. Touchez **Add next cell** pour ajouter une à une les cellules autour de la première. **Remove last cell** en retire une.
3. Quand la première couche est complète, **Build next shell** ajoute une couche entière d'un coup. **Remove last shell** en retire une.
4. Le compteur indique combien de cellules vous avez construites sur le total.

À observer pendant la construction :

- **Open / Closed :** Open montre chaque cellule comme une copie ordinaire, non déformée, avec le vrai écart entre elles bien visible. Closed montre chaque cellule pliée à sa vraie place dans la structure 4D. Cet interrupteur se verrouille dès que vous construisez une deuxième couche, car cette couche suppose que la première est fermée.
- **RCP-Coordinates :** affiche en violet le point à partir duquel chaque cellule est générée.
- **Shell colours :** colore chaque couche différemment pour distinguer les couches voisines.

Touchez **3D** pour retrouver les commandes habituelles. Votre construction 4D est conservée.

Certaines formes peuvent aussi utiliser **Attach via Duoprism…**, qui relie une copie exacte à travers un prisme : la construction 4D Prism.

## Rhomboèdres dorés

Tant que votre construction n'est faite que de rhomboèdres dorés, une barre indique combien de pièces s'accordent avec le vrai pavage de Penrose en 3D. **Next safe piece** ajoute une pièce qui garde la construction dans ce pavage, pour qu'elle ne soit jamais bloquée. **Next step** construit la forme dorée choisie (dodécaèdre de Bilinski, icosaèdre rhombique ou triacontaèdre rhombique) pièce par pièce. **File** charge aussi chaque construction dorée terminée, à démonter ou à prolonger. Undo annule chaque étape.

## Enregistrer votre travail

- **Save :** enregistre votre construction dans ce navigateur. Elle revient quand vous rouvrez le site sur le même appareil et le même navigateur.
- **File → Export JSON :** télécharge votre construction sous forme de fichier, pour une sauvegarde ou pour la transférer sur un autre appareil.
- **File → Import JSON… :** ouvre un fichier exporté auparavant. Il remplace ce qui est à l'écran, et **Undo** l'annule.
- **What's New :** changements récents.
- **Langue :** utilisez le sélecteur 🌐 en haut de l'écran d'accueil ou de ce guide, ou touchez la face 🌐 de la roue du coin pour passer à la langue suivante. Il y a 7 langues, et toutes ces commandes restent synchronisées.

---

# Référence des commandes

## Barre du haut

| Commande | Ce qu'elle fait |
|---|---|
| i | Description de l'assemblage nommé |
| What's New | Changements récents |
| View | Alterne Solid, Translucent et Skeleton |
| 🎨 Colour | Couleurs Green, Family ou Pick ; en Pick, les 14 couleurs |
| ↶ Undo | Annule votre dernière modification, quelle qu'elle soit. Touchez de nouveau pour remonter plus loin ; maintenez pour revenir plusieurs étapes |
| Save | Enregistre la construction dans ce navigateur |
| File ▾ | Export JSON, Import JSON… et les constructions dorées terminées |
| Start over with… | Ouvre le navigateur de formes pour recommencer avec une forme (Tab ou Espace) |

## Barre contextuelle

Ces commandes changent selon ce que vous avez sélectionné.

| Quand | Commandes |
|---|---|
| Une forme est sélectionnée | Transform to… (quand la forme a une forme apparentée), Delete, Attach via face…, Attach via Duoprism… |
| Un sommet est sélectionné | Attach via vertex… |
| Une forme compatible 4D est sélectionnée | 3D / 4D et, en 4D : Add next cell, Remove last cell, Build next shell, Remove last shell, Open / Closed, RCP-Coordinates, Shell colours |
| Une nouvelle forme attend d'être posée | Confirm, Cancel (Esc) |

## Roue du coin

Le petit dodécaèdre dans le coin. Faites-le glisser pour le tourner, et touchez une face.

| Symbole | Commande |
|---|---|
| ◐ | Ouvrir ou fermer la roue des formes |
| ◈ | Ouvrir ou fermer le navigateur de formes |
| ⛶ | Mode d'affichage |
| ▣ | Save |
| ℹ | About (rouvre l'écran d'accueil) |
| 🌐 | Passer à la langue suivante (affiche le nom de la langue actuelle) |

## Clavier et souris

| Entrée | Action |
|---|---|
| Clic sur une forme | La sélectionner, avec la face cliquée |
| Clic sur un sommet | Le sélectionner pour une attache par sommet |
| Glisser avec le bouton gauche | Tourner la caméra, ou tourner une nouvelle forme avant de confirmer |
| Molette | Zoomer |
| Tab ou Espace | Ouvrir le navigateur de formes (Start over with…) |
| Échap | Annuler la pose d'une forme, ou fermer la roue |

## Tactile

| Geste | Action |
|---|---|
| Toucher un sommet ou une forme | Le sélectionner |
| Glisser un doigt | Tourner la caméra, ou tourner une nouvelle forme |
| Pincer | Zoomer |
