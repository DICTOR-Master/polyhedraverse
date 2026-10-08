# Guía del usuario de Polyhedraverse

Polyhedraverse y su gemelo, [Rhombiverse](https://rhombiverse.vercel.app), son dos maneras de mirar la misma geometría. Rhombiverse es el **paisaje**: las propias redes, que se extienden en todas direcciones. Polyhedraverse es la **galería de retratos**: las formas que viven en esas redes, de una en una y de cerca. Un tercer hermano, [Kaleidohedra](https://kaleidohedra.vercel.app), **mueve el paisaje**: redes que puedes cizallar y deslizar, con cada pieza moviéndose con ellas.

Aquí no hay red. Empiezas con una forma y le conectas otras, vértice con vértice o cara con cara, y la estructura surge de las propias formas. Algunas formas también se pueden ampliar hasta su politopo 4D real, celda a celda.

La primera parte de esta guía recorre las tareas habituales. La segunda enumera todos los controles.

Los nombres de los botones aparecen tal como se ven en la aplicación (los que la aplicación aún no traduce siguen en inglés). Los nombres de formas y familias se mantienen en su forma original en todos los idiomas.

## Primeros pasos

### Elige una forma

1. Pulsa **ENTER** en la pantalla de bienvenida.
2. Toca el botón de la **rueda de formas** (☰, abajo a la izquierda) o ◐ en la rueda de la esquina para abrir la rueda de formas. (**Start over with…**, Tab o Espacio abren el explorador de formas.)
3. La rueda es un dodecaedro. Cada cara es una familia de formas. Arrástrala para girarla (o usa las flechas del teclado) y toca una cara para abrir esa familia. Pasa el cursor por una cara, o mantenla pulsada, para ver su nombre. Dentro de una familia, la cara **Home** (una H dentro de un hexágono) te lleva de vuelta a las familias.
4. Toca una forma. Sustituye lo que haya en pantalla, así que empiezas desde cero.

**Girar la Rueda** elige una familia al azar.

### Mueve la cámara

- **Girar:** arrastra con un dedo, o con el botón izquierdo del ratón.
- **Zoom:** pellizca, o usa la rueda del ratón.

### Une una forma a una cara

1. Toca el cuerpo de una forma para seleccionarla. La cara que tocaste también queda seleccionada.
2. Toca **Attach via face…**. El selector solo ofrece formas que tienen una cara del mismo tamaño.
3. La nueva forma aparece, pero aún no está fijada. Arrastra para girarla y luego toca **Confirm**, o **Cancel** (o pulsa Esc).

Dos formas unidas cara con cara comparten esa cara exactamente; por ejemplo, un cubo sobre otro cubo.

Al arrastrar recorres todas las formas en que la nueva figura puede apoyarse en esa cara, y se van contando («registration 3/8»): cada giro de la cara y, cuando la nueva figura tiene caras de ese tamaño que no son iguales, también cada una de ellas, así que una pieza con caras desiguales siempre se puede colocar como quieras. Por ejemplo, para construir el prisma inclinado de DICTO, empieza con el bloque de caras cuadradas, une el bloque de rombos a uno de sus rombos de 72° y arrastra hasta que las caras hexagonales queden planas, y luego une un segundo bloque de caras cuadradas del mismo modo.

Los mejores encajes van primero: una colocación que queda a ras de dos o tres caras de las piezas ya construidas (encajando en una esquina) se ofrece antes que una que solo toca la cara elegida, y el contador lo indica («registration 1/4 · 3 faces»). No se ofrecen colocaciones que atravesarían una pieza ya construida. En las formas que llenan el espacio, una copia unida a su misma forma empieza en la posición que continúa el teselado. Las caras que quedan a ras de una vecina cuentan como usadas, así que no se vuelven a ofrecer.

### Une una forma a un vértice

1. Toca un **vértice resaltado**. Solo se iluminan los vértices libres. Las formas que aún tienen sitio para crecer brillan.
2. Toca **Attach via vertex…** y elige cualquier forma. Una unión por vértice acepta cualquier forma.
3. Gírala y toca **Confirm**, igual que al unir por cara.

### Deshacer y eliminar

- **Undo** (↶, barra superior) deshace tu último cambio, sea del tipo que sea: una unión, un borrado, un Transform, un paso de construcción 4D, Start over o una importación. Tócalo otra vez para seguir retrocediendo, o mantenlo pulsado para retroceder varios pasos de golpe.
- Selecciona una forma y toca **Delete** para quitarla, junto con todo lo que se haya construido encima.

## Explora el catálogo

El **explorador de formas** (◈ en la rueda de la esquina) es la galería. Tiene estas pestañas:

- **Inicio:** las familias, más las formas vistas recientemente y tus favoritas.
- **Buscar:** busca por nombre (prueba «J12» o «gyrobicupola»), o filtra por familia, forma de cara y número de caras.
- **Escena:** lo que has construido hasta ahora.
- **Favoritos:** las formas que has marcado con una estrella.

Toca cualquier forma para ver sus detalles: vértices, aristas, caras y conectores. Desde ahí puedes:

- **Añadir a la Escena:** empezar a construir con ella.
- **Favorito:** marcarla con una estrella.
- **Añadir a Comparar:** poner hasta cuatro formas una junto a otra.
- **Ver en 4D:** en las formas con capacidad 4D, mostrar el politopo 4D en el que se extiende.
- **Desarrollo:** ver la forma desplegada en plano, plegarla con el deslizador o con **Plegar**, y **Descargar PDF (A4)** para imprimirla: corta las líneas continuas, pliega las discontinuas y pega cada número con su pareja. **Pestañas para pegar** añade una pestaña a cada par que se pega. Las formas estrelladas no tienen desarrollo.

Las formas de **3D+ Bridges** también dicen, en sus detalles, a qué politopo superior hacen de puente (por ejemplo, el dodecaedro rómbico es la sombra del tesseract y del 24-cell).

### Las familias

| Familia | Qué contiene |
|---|---|
| Deltahedra | Los 8 sólidos convexos hechos solo de triángulos equiláteros |
| Platonic | Los 5 sólidos regulares |
| Archimedean | Los 13 sólidos semirregulares |
| Johnson | Los 92 sólidos convexos de caras regulares |
| Catalan | Los duales de los sólidos arquimedianos |
| Stellations | Piezas para los sólidos platónicos y de Catalan, cada una encaja en una cara: plana (las pirámides se unen en un nuevo sólido convexo, como el cubo a partir de un tetraedro) y luego cada estelación que el sólido tiene de verdad, hasta la tercera. Una pieza en cada cara construye esa estelación exactamente, p. ej. los dodecaedros estrellado pequeño, grande y estrellado grande |
| Prisms, Antiprisms | Dos polígonos unidos por una banda de cuadrados o triángulos |
| 4D Polytopes | Los seis politopos 4D regulares (5, 8, 16, 24, 120 y 600 celdas) por simetría; abre uno y Constrúyelo coloca su celda semilla y empieza a construirlo celda a celda |
| Parallelohedra | Formas que llenan el espacio solo por traslación: los cinco de Fedorov y sus variantes (el romboedro, y el prisma hexagonal inclinado de DICTO con sus dos bloques, y su dodecaedro rómbico sesgado con su romboedro aplanado, hallados con Zometool), y luego los verificados en Kaleidohedra (las celdas de aristas iguales del estiramiento de Bain: el dodecaedro rómbico de Bain, el dodecaedro alargado de hexágonos regulares, ya conocido y al que DICTO llegó de forma independiente, y el dodecaedro alargado de Bain, de DICTO), y luego el Kaleidohedra Regular 9 (todas las formas que llenan el espacio con aristas iguales y caras que son solo cuadrados, hexágonos regulares y rombos de 60°) |
| Space-Filling Pairs | Dos formas que llenan el espacio juntas, entre ellas el Dragon Jewel de DICTO con la stella octangula (de Kaleidohedra), cuyas caras se unen entre sí y cuyos rombos encajan con el rombo grueso de Penrose, y el par del Sunstar Lattice: el Dogstar (el hueco que dejan los dodecaedros en su empaquetado más denso, estrella de 8 puntas con aristas solo áureas, volumen φ/2) y un dodecaedro con costuras donde lo tocan los Dogstars, para que 6 Dogstars se unan a sus caras y formen un Sunstar |
| Aperiodic Sets | Dos pares aperiódicos: los romboedros áureos alargado y achatado (la teselación de Penrose en 3D) y los prismas de rombo de Penrose grueso y fino (la teselación 5D en capas) |
| 3D+ Bridges | Formas que son sombra, sección, celda o esquina de un politopo de más dimensiones; sus detalles dicen cuál |
| Miscellaneous | Pirámides graduadas, piezas conectoras y extensores de prisma |

También aparecen los poliedros estrellados. No se pueden acoplar, porque sus caras se atraviesan entre sí, pero tres sí se pueden construir: un dodecaedro con una pieza de **Stellations** en cada cara da el pequeño dodecaedro estrellado (pieza 2), el gran dodecaedro (3) o el gran dodecaedro estrellado (4).

## Observa tu construcción

Toca **View** para pasar por tres modos:

- **Solid:** caras normales.
- **Translucent:** caras transparentes.
- **Skeleton:** solo las aristas, para ver el interior de estructuras anidadas.

Toca **🎨** (Colour) para elegir cómo se colorean las piezas: **Green** (todas verdes, por defecto), **Family** (cada pieza con el color de su familia, con leyenda en el menú) o **Pick** (elige entre 14 colores; las piezas nuevas toman ese color y **Paint** recolorea la pieza seleccionada). Los colores elegidos se guardan con la construcción.

Cuando un grupo de piezas se cierra en una jaula completa, aparece **Closed cage!**. Algunas disposiciones conocidas tienen su propio nombre, como la Stella Octangula. Toca **i** junto al nombre para ver una descripción.

## Construir en 4D

Algunas formas son los bloques de un politopo 4D regular, por ejemplo el cubo (teseracto) o el dodecaedro (120-celdas). Cuando seleccionas una de ellas, aparece un interruptor **3D / 4D**.

1. Selecciona la forma y toca **4D**. Si puede cerrarse en más de un politopo, elige cuál.
2. Toca **Add next cell** para añadir, una a una, las celdas alrededor de la primera. **Remove last cell** quita una.
3. Cuando la primera capa está completa, **Build next shell** añade una capa entera de golpe. **Remove last shell** quita una.
4. El contador muestra cuántas celdas has construido del total.

Cosas en las que fijarse mientras construyes:

- **Open / Closed:** Open muestra cada celda como una copia normal, sin deformar, con el hueco real entre ellas a la vista. Closed muestra cada celda doblada hasta su posición verdadera en la estructura 4D. Este interruptor se bloquea cuando construyes una segunda capa, porque esa capa depende de que la primera esté cerrada.
- **RCP-Coordinates:** muestra con un punto morado el punto a partir del cual se genera cada celda.
- **Shell colours:** colorea cada capa de forma distinta para que las capas vecinas se distingan.

Toca **3D** para recuperar los controles normales. Tu construcción 4D se conserva.

Algunas formas también pueden usar **Attach via Duoprism…**, que une una copia exacta a través de un prisma: la construcción 4D Prism.

## Romboedros áureos

Mientras tu construcción sea solo de romboedros áureos, una barra muestra cuántas piezas encajan en la verdadera teselación de Penrose en 3D. **Next safe piece** añade una que mantiene la construcción dentro de esa teselación, así que nunca se atasca. **Next step** construye la forma áurea elegida (dodecaedro de Bilinski, icosaedro rómbico o triacontaedro rómbico) pieza a pieza. **File** también carga cada construcción áurea terminada, para desmontarla o ampliarla. Undo deshace cada paso.

## Guarda tu trabajo

- **Save:** guarda tu construcción en este navegador. Vuelve a aparecer cuando abres el sitio en el mismo dispositivo y navegador.
- **File → Export JSON:** descarga tu construcción como archivo, para tener una copia de seguridad o llevarla a otro dispositivo.
- **File → Import JSON…:** abre un archivo que exportaste antes. Sustituye lo que hay en pantalla, y **Undo** lo deshace.
- **What's New:** cambios recientes.
- **Idioma:** usa el selector 🌐 de la parte superior de la pantalla de bienvenida o de esta guía, o toca la cara 🌐 de la rueda de la esquina para pasar al siguiente idioma. Hay 7 idiomas, y todos estos controles van a la par.

---

# Referencia de controles

## Barra superior

| Control | Qué hace |
|---|---|
| i | Descripción de la disposición con nombre |
| What's New | Cambios recientes |
| View | Alterna entre Solid, Translucent e Skeleton |
| 🎨 Colour | Colores Green, Family o Pick; en Pick, los 14 colores |
| ↶ Undo | Deshace tu último cambio de cualquier tipo. Tócalo otra vez para retroceder más; mantenlo pulsado para retroceder varios pasos |
| Save | Guarda la construcción en este navegador |
| File ▾ | Export JSON, Import JSON… y las construcciones áureas terminadas |
| Start over with… | Abre el explorador de formas para empezar de nuevo con una forma (Tab o Espacio) |

## Barra contextual

Estos controles cambian según lo que tengas seleccionado.

| Cuándo | Controles |
|---|---|
| Hay una forma seleccionada | Transform to… (cuando la forma tiene una forma relacionada), Delete, Attach via face…, Attach via Duoprism… |
| Hay un vértice seleccionado | Attach via vertex… |
| Hay una forma con capacidad 4D seleccionada | 3D / 4D y, en 4D: Add next cell, Remove last cell, Build next shell, Remove last shell, Open / Closed, RCP-Coordinates, Shell colours |
| Una forma nueva espera a ser colocada | Confirm, Cancel (Esc) |

## Rueda de la esquina

El pequeño dodecaedro de la esquina. Arrástralo para girarlo y toca una cara.

| Símbolo | Control |
|---|---|
| ◐ | Abrir o cerrar la rueda de formas |
| ◈ | Abrir o cerrar el explorador de formas |
| ⛶ | Modo de vista |
| ▣ | Save |
| ℹ | About (vuelve a abrir la pantalla de bienvenida) |
| 🌐 | Cambiar al siguiente idioma (muestra el nombre del actual) |

## Teclado y ratón

| Entrada | Acción |
|---|---|
| Clic en una forma | Seleccionarla, junto con la cara en la que hiciste clic |
| Clic en un vértice | Seleccionarlo para unir por vértice |
| Arrastrar con el botón izquierdo | Girar la cámara, o girar una forma nueva antes de confirmar |
| Rueda del ratón | Zoom |
| Tab o Espacio | Abrir el explorador de formas (Start over with…) |
| Esc | Cancelar la colocación de una forma, o cerrar la rueda |

## Táctil

| Gesto | Acción |
|---|---|
| Tocar un vértice o una forma | Seleccionarlo |
| Arrastrar con un dedo | Girar la cámara, o girar una forma nueva |
| Pellizcar | Zoom |
