<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 8b2b048d 7705224a 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: la guía completa

**RPG Engine** te permite jugar a un juego de rol de mesa con una **IA como máster**.

Hablas con el máster en un **chat**: el máster cuenta la historia, interpreta a todos los demás y decide qué ocurre.

RPG Engine trabaja entre bastidores: **recuerda el mundo**, **tira los dados** y **lleva las cuentas**.

Junto al chat mantienes abierta una página en el navegador, el **dashboard**, con la ficha de tu personaje, los dados, los mapas y tu diario.

Esta guía es para jugadores: no necesitas saber programar.

## Inicio rápido <!-- icon: send -->

1. Instala **Node.js** desde [nodejs.org](https://nodejs.org) (la versión LTS).
2. Instala **Claude Code** o **Codex**, la aplicación de IA en la que funciona el máster, e inicia sesión ([2.4](#24-connect-your-ai)).
3. Abre una terminal e instala RPG Engine: `npm install -g rpg-engine`.
4. En la terminal, crea una campaña: `rpg init "The Salt Isles"`.
5. Abre Claude Code o Codex en la carpeta nueva y escribe *¡Hola! Empecemos.* El máster responde con el enlace a tu panel: ábrelo junto al chat.

El resto de la guía explica cada paso y, después, cómo jugar.

## 1. Qué es RPG Engine <!-- icon: about -->

### Quién hace qué

| Quién | Qué hace |
|---|---|
| **Tú** | Juegas tu personaje. Dices qué hace, qué dice y qué intenta. |
| **El máster** (la IA) | Cuenta la historia, interpreta a los demás personajes, decide lo que ocurre y pide tiradas. |
| **RPG Engine** | Lo recuerda todo en archivos, tira los dados, cuenta puntos de golpe, dinero, tiempo y distancias, y guarda los secretos hasta que los descubras. |

Una IA es buena contando historias y mala recordando. Si la dejas sola, olvida quién te debe dinero, cuántas flechas te quedan o que el puente se quemó hace dos sesiones. RPG Engine guarda todo eso. Así el mundo sigue igual de una tarde a otra, incluso en un chat nuevo y con otra IA.

### Cómo se siente

Escribes en el chat, como si hablaras en una mesa:

> Empujo la puerta despacio y miro dentro.

El máster responde con lo que ves y se detiene cuando te toca elegir. Cuando algo es incierto e importa, el máster dice qué hay en juego y pide una tirada. Los botones de la tirada aparecen en tu panel. Haces clic, los dados caen en la página y el máster te cuenta lo que pasa.

### Qué lo hace distinto

- **El mundo es persistente.** Lo que se ha dicho sigue siendo cierto. Un villano muerto sigue muerto.
- **Los dados son de verdad.** El máster no puede torcerlos (salvo en la dificultad más fácil, si la eliges).
- **Los secretos siguen siendo secretos.** El máster nunca te dice lo que tu personaje no sabe, por mucho que insistas.
- **El mundo avanza sin ti.** Las amenazas progresan mientras descansas o viajas, y ves sus señales.
- **Muchas tardes, una sola historia.** Una campaña es una carpeta en tu equipo. Puedes parar cuando quieras y retomarla más tarde.

### El juego que ofrece hoy

RPG Engine está pensado para cualquier juego de rol de mesa. Hoy incluye un solo sistema de juego: la **quinta edición** (del Documento de Referencia del Sistema 5.1, libre). Llegarán otros juegos; consulta [Sistemas de juego](#5-game-systems-and-house-rules) y [Próximamente](#9-coming-later).

---

## 2. Primeros pasos <!-- icon: path -->

### 2.1 Qué necesitas

- Un equipo con Windows, macOS o Linux.
- **Node.js 22** o superior. Descárgalo en [nodejs.org](https://nodejs.org): la versión "LTS" es suficiente. Incluye `npm`, que instala RPG Engine.
- Una **terminal**, la ventana donde se escriben comandos: en Windows, la app Terminal o PowerShell; en macOS, Terminal. La usas para instalar RPG Engine, para crear cada campaña y para iniciar Claude Code o Codex.
- Una **aplicación de IA**, donde se ejecuta el máster: **Claude Code** o **Codex**, con su plan y su inicio de sesión. Consulta [2.4](#24-connect-your-ai).
- El **modelo más grande** que ofrezca tu aplicación. Un modelo pequeño se deja engañar: en nuestras pruebas contó secretos a una persona que decía ser el verdadero máster.
- Un navegador web, para el panel.

El inicio de sesión que usas en tu aplicación sirve para más cosas: RPG Engine lo usa, en tu equipo, para dibujar imágenes de lugares, misiones y de tu personaje, y para traducir el panel a idiomas que no incluye. Consulta [Imágenes](#311-pictures) e [Idiomas](#72-languages).

**Abrir una terminal en una carpeta.** Muchos pasos dicen "en la carpeta de la campaña". En Windows, haz clic derecho en la carpeta dentro del Explorador de archivos y elige **Abrir en Terminal**. En macOS, haz clic derecho en la carpeta dentro del Finder y elige **Servicios > Nueva terminal en la carpeta**. O, en una terminal que ya tengas abierta, escribe `cd` y la ruta de la carpeta, por ejemplo `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Instalación

Abre una terminal y escribe:

```text
npm install -g rpg-engine
```

Esto te da el comando `rpg`. Para comprobar que ha funcionado:

```text
rpg --version
```

Usarás `rpg` una vez por campaña, para crearla. Después, solo hablas con el máster: tu aplicación de IA inicia RPG Engine por su cuenta, con el mismo comando `rpg`.

### 2.3 Crear una campaña

Una campaña es una carpeta. Abre una terminal en la carpeta donde guardas tus juegos y escribe:

```text
rpg init "The Salt Isles"
```

Esto crea la carpeta `The Salt Isles` con una campaña nueva dentro y te dice qué hacer a continuación:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Las líneas después de *For the master* son para el máster, que las lee en el chat: tú no tienes que hacer nada con ellas. Recuerda dónde está la carpeta: volverás a ella cada vez que juegues. Si no indicas un nombre de carpeta, `rpg init` convierte en campaña la carpeta en la que estás.

`init` crea todo lo que la campaña necesita: sus ajustes, sus carpetas del mundo y los archivos pequeños que le dicen a tu aplicación de IA que use RPG Engine y que no guarde memoria propia fuera de la campaña.

No necesitas elegir nada ahora. El máster te pregunta el resto en el chat, o lo eliges en el panel. Si ya tienes claras algunas opciones, puedes indicarlas aquí:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Esto crea la carpeta `salt-isles`, con la campaña *The Salt Isles* dentro: un nombre de carpeta sin espacios y el nombre de la campaña como prefieras.

| Opción | Qué define | Valores |
|---|---|---|
| `--name` | El nombre de la campaña | cualquiera; el nombre de la carpeta si lo omites |
| `--language` | El idioma del juego | un código, como `en`, `it`, `fr` |
| `--system` | El sistema de juego | `5e`, hoy el único |
| `--difficulty` | Lo duro que es el mundo | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Qué significa caer en un combate | `narrative`, `epic`, `dice` |

`rpg init --help` también las enumera. Una campaña no puede estar dentro de la carpeta de otra campaña.

No puedes pedirle al máster que cree una campaña: antes de `init`, la carpeta no tiene nada que le diga a tu aplicación de IA dónde está RPG Engine.

### 2.4 Conectar tu IA

RPG Engine funciona con **Claude Code** y **Codex**. Otras aplicaciones de IA que usen herramientas MCP podrían funcionar, pero no lo garantizamos.

**Instalar tu aplicación.** Claude Code y Codex se ejecutan en la terminal: no son la app de Claude ni la de ChatGPT del móvil. Cada una necesita su propio plan y su propio inicio de sesión: Claude Code, un plan de pago de Claude; Codex, un inicio de sesión de ChatGPT. Sigue sus páginas para instalarlas e iniciar sesión: [Claude Code](https://code.claude.com/docs/en/setup) y [Codex](https://learn.chatgpt.com/docs/codex/cli). Lo haces una sola vez, para todas tus campañas.

**Claude Code.** Abre una terminal en la carpeta de la campaña y escribe `claude`. La primera vez, pregunta si confías en la carpeta y avisa de que la carpeta permite las herramientas del juego (`mcp__rpg`): elige **Yes, I trust this folder**. Cuidado: la respuesta que aparece seleccionada es *No, exit*, así que pulsar Intro sin más cierra Claude Code. Eso es todo: la campaña ya le ha dicho a Claude Code que use RPG Engine y sus herramientas, y que mantenga su memoria desactivada.

**Codex.** Abre una terminal en la carpeta de la campaña y escribe `codex`. Cuando pregunte si confías en la carpeta, di que sí: los ajustes de la propia campaña le dicen a Codex dónde está RPG Engine, permiten sus herramientas y mantienen su memoria desactivada, y Codex solo los lee en una carpeta de confianza. En la app de escritorio, comprueba que las memorias estén desactivadas para los chats del juego.

**Por qué importa la memoria.** La campaña vive en sus archivos. Si la aplicación además recuerda cosas por su cuenta, volver a una partida guardada no sería volver de verdad: el máster seguiría recordando lo que se deshizo.

### 2.5 El primer chat

Escribe lo que quieras, por ejemplo:

> ¡Hola! Vamos a empezar.

El máster lee cómo está la partida y responde. En su primera respuesta de cada chat te da el **enlace a tu panel** (algo como `http://127.0.0.1:4750`). Ábrelo en el navegador y tenlo junto al chat durante todo el juego. Cada campaña conserva el mismo enlace de un chat a otro, salvo que otro programa lo haya ocupado: entonces el máster te da el nuevo.

Entre los mensajes del máster, tu aplicación muestra las herramientas que el máster usa, en líneas breves. No abras sus detalles (en Claude Code, ctrl+o): pueden mostrar lo que el máster escribe, secretos incluidos.

Una campaña nueva pasa por tres etapas, como un juego con un máster humano. El panel las muestra arriba como *1 Ajustes · 2 Sesión cero · 3 Jugar*:

1. **Ajustes**: eliges cómo quieres jugar. Fuera de la historia.
2. **Sesión cero**: creas tu personaje, jugando.
3. **Jugar**: la historia.

### 2.6 Ajustes: elegir cómo juegas

El máster pregunta solo lo que aún falta, unas pocas preguntas cada vez. Si escribes "decide tú", el máster elige y te dice qué ha elegido. Con el panel abierto, su primer paso, **Ajustes**, muestra las mismas preguntas como tarjetas: una pregunta cada vez, cada valor con su significado y el habitual marcado como **Sugerida**. Elige ahí y el máster no volverá a preguntarlo en el chat; **Omitir** deja una pregunta para más tarde. El chat resuelve lo que solo las palabras pueden: la premisa de un mundo nuevo, el idioma y las imágenes, sobre las que el máster pregunta solo si tu equipo puede crearlas. Por eso la página hace menos preguntas que las que enumera la tabla de abajo.

No necesitas estudiar la tabla: está para consultarla. Puedes cambiar cualquiera de estos ajustes más tarde, en el chat o en **Ajustes** del panel. Un cambio vale desde la siguiente respuesta del máster.

| Ajuste | Qué decide | Valores | Sugerida |
|---|---|---|---|
| **Mentor** (se pregunta como "¿Cuánto conoces este juego?") | Cuánto te enseña el máster las reglas, fuera de la historia | **desactivado** (solo la historia; pregunta entre corchetes cuando quieras), **consejos** (un aviso breve antes de las decisiones importantes y cuando se pasa por alto una regla), **tutorial** (cada regla explicada la primera vez, la suma completa de cada tirada y un breve repaso tras los combates) | según tu respuesta: nunca he jugado → tutorial, un poco → consejos, lo conozco → desactivado |
| **Dificultad** | Lo duro que es el mundo: combates, tácticas enemigas, pistas, tesoro, rapidez con que avanzan las amenazas | historia, fácil, normal, difícil, brutal | |
| **Letalidad** | Qué significa caer en un combate | **narrativa** (tu personaje nunca muere), **épica** (muere solo cuando importa para la historia), **dados** (deciden los dados) | sigue la dificultad: historia → narrativa, fácil → épica, normal y superiores → dados |
| **Partidas guardadas** | Cuándo puedes volver atrás | **muerte permanente** (nunca; solo reiniciar la campaña), **punto de control** (vuelta al último final de escena, solo si tu personaje muere), **libre** (vuelta a cualquier partida guardada, y guardar siempre que lo pidas) | punto de control |
| **Rigor** | Con cuánta fidelidad siguen las reglas la comida, la luz, la fatiga, el peso transportado, los componentes de conjuro y los viajes | **fluido** (el máster los pasa por alto), **reglas** (tal como están escritas: las antorchas se consumen, las raciones se acaban), **simulación** (más allá de las reglas: desgaste, deterioro, clima) | fluido |
| **Dados** | Quién tira los dados de tu personaje | **digitales** (RPG Engine los tira, en la página), **físicos** (tú tiras los tuyos y dices las caras) | |
| **Unidades** | Distancias y pesos en la historia | métricas, imperiales | |
| **Compañeros** | Quién viaja contigo | ninguno, creados contigo en la sesión cero, creados por el máster, encontrados durante el juego | |
| **Imágenes** | Imágenes de lugares y misiones, y el retrato de tu personaje cuando lo pides | ninguna, a petición, lugares y misiones nuevos | se pregunta una vez, solo si tu equipo puede crearlas |
| **Líneas** | Lo que nunca aparece en el juego | una lista, o ninguna | |
| **Velos** | Lo que puede ocurrir, pero solo fuera de escena | una lista, o ninguno | |
| **Idioma** | El idioma del juego y del panel | cualquiera | se toma de cómo escribes y se confirma |

El sistema de juego puede añadir sus propios ajustes. La quinta edición añade el **avance**: cómo sube de nivel tu personaje, con **puntos de experiencia** o por **hitos** de la historia.

**Qué significa la dificultad al jugar.** Historia: enemigos débiles e ingenuos, pistas evidentes, abundancia de todo; el máster puede suavizar sus propias tiradas. Fácil: enemigos sencillos, recursos generosos. Normal: enemigos sensatos, tres pistas por cada conclusión, precios y tesoros estándar. Difícil: enemigos astutos, pistas sutiles, recursos escasos, amenazas que avanzan rápido. Brutal: enemigos que tienden emboscadas, se retiran y rematan a quienes caen, recursos muy escasos, los descansos más duros. Los combates siempre se ajustan a tu grupo tal como está ahora.

**Sin un mundo escrito**, la preparación pregunta dos cosas más:

- **Premisa**: el género, el tono y algunos elementos del mundo, con tus palabras. Por ejemplo: *"Fantasía baja, sombría pero con esperanza. Un pueblo de río, un vado encantado, un culto en las colinas."*
- **Preparación**: **sobre la marcha** (el máster construye cada parte del mundo justo antes de que la necesites; sugerida) o **todo al principio**.

Después, el máster propone un nombre para la campaña. Cuando no falta nada y dices que estás listo, el juego pasa a la sesión cero.

### 2.7 Sesión cero: tu personaje

La sesión cero ya es juego: creas tu personaje con el máster, como lo harías en una mesa.

- **Cada decisión es tuya**, salvo que le pidas al máster que la tome. Puedes llegar con una idea completa ("un personaje semielfo, clérigo, que dejó su templo"), una vaga ("alguien que cura, pero sin ser amable") o con nada ("sorpréndeme, y luego déjame cambiar cosas").
- **Puntuaciones de característica.** El máster te explica el método y la red de seguridad antes de tirar ningún dado. En la quinta edición: la serie estándar, la compra de puntos o 4d6 descartando el más bajo. El método que acordéis queda en los acuerdos de la mesa.
- **Tu historia** nunca es obligatoria. Si das una, el máster la escribe con tus palabras, te la lee una vez y enlaza a sus personajes y lugares con el mundo. También puedes escribirla en el panel (consulta [Grupo](#party)).
- **Personalidad** (quinta edición): un rasgo, un ideal, un vínculo y un defecto, de las tablas de tu trasfondo o propios.
- **Una imagen.** Cuando tu personaje está creado, el máster te pide una imagen: un archivo de tu equipo, o un retrato creado en tu equipo a partir de cómo lo describas (consulta [la imagen de tu personaje](#37-your-characters-story-and-picture)).

RPG Engine calcula los números de la ficha a partir de tus decisiones: tú nunca haces las cuentas. Cuando los personajes están creados y lo confirmas, empieza la historia.

---

## 3. Jugar <!-- icon: chat -->

### 3.1 Hablar con el máster

Escribe lo que hace o dice tu personaje, con tus palabras. Basta con ser breve.

> Le pregunto a la posadera quién más ha pasado esta noche.
>
> "No venimos a buscar problemas", digo, con la mano lejos de la espada.
>
> Me subo al tejado y espero.

**Fuera de la historia**, escribe entre corchetes:

> [¿Cómo funciona el agarre?]
>
> [¿Puedo usar todavía mi reacción en esta ronda?]
>
> [Paremos aquí por esta noche.]

El máster también responde entre corchetes y luego vuelve a la historia.

**Tú dices lo que intentas; el máster dice lo que ocurre.** Algo que rompa la lógica del mundo o los hechos ya establecidos no ocurre: el máster te lo dice, dentro de la historia, y ofrece lo que sí es posible.

**El máster nunca decide por tu personaje.** No te hará hablar, sentir ni elegir. Ante la duda, pregunta.

**El máster nunca habla del motor.** Pregúntale si lleva la cuenta de las cosas y responde como un máster: "Lo llevo todo: seguimos desde aquí la próxima vez."

**Puedes preguntarle al máster cómo usar el panel.** Conoce la página: "¿Dónde veo mis conjuros?", "¿Cómo tiro a mano?"

### 3.2 Tiradas

**Cuándo hay una tirada.** El máster pide una tirada solo cuando el resultado es incierto y importa. Si no, dice que sí, o "sí, pero". Antes de tu tirada, el máster dice qué está en juego y qué pruebas encajan, y se detiene. Tú tiras, o cambias de idea:

> **Máster:** La cornisa es estrecha y está mojada. Si resbalas, la caída hasta el río es larga. Una prueba de Destreza (Acrobacias), o puedes volver atrás y buscar las escaleras.
>
> **Tú:** Lo intento.

**Tirar en el panel.** Cuando el máster lo pide, aparece un aviso en la parte superior de la página con un botón para cada prueba, por ejemplo *Acrobacias +4 · con ventaja*. Haz clic: los dados caen en la página y el máster oye el resultado. También puedes:

- hacer clic en la línea correspondiente de tu ficha, que se ilumina en dorado;
- tirar los dados adecuados desde la bandeja de dados;
- escribir tus propias palabras en el aviso, si quieres hacer otra cosa.

**Tirar a mano.** Si prefieres elegir tú los dados, activa **Manual** en la esquina del aviso (o en **Ajustes**). El botón de la prueba desaparece y el aviso dice qué tirar como lo diría un máster: *Tira Acrobacias tú mismo, en tu ficha o con los dados.* Haz clic en la línea de tu ficha que se ilumina o tira los dados adecuados desde la bandeja de dados: RPG Engine los tira, suma tu bonificador y el máster oye el resultado. Una prueba que ni tu ficha ni la bandeja pueden resolver, como un daño que repite los 1, conserva su botón. Manual sigue activado en este navegador hasta que lo desactives.

**Dados físicos para toda la partida.** Con el ajuste **Dados** en físicos, el máster pide tus tiradas con palabras y tú escribes las caras que han salido:

> [He sacado un 14.]

RPG Engine suma tus modificadores y rechaza una cara que tus dados no pueden mostrar.

**Tiradas libres.** Haz clic en cualquier número de tu ficha, o abre la bandeja de dados, para tirar solo por diversión. Las tiradas libres nunca cuentan, nunca se registran y el máster nunca las ve. Un 20 libre nunca se convierte después en uno real.

**Las tiradas del máster.** El máster también tira con RPG Engine por los enemigos y otros personajes. La mayoría de las tiradas se muestran en tu columna de tiradas. Cuando no debes ver un resultado, el máster tira en secreto. Siempre puedes preguntar:

> [¿Esa tirada era real?]

Si la tirada se mostró, el máster da sus números y el motivo. Si fue secreta, da una huella que demuestra que la tirada se hizo antes de que preguntaras.

**Las tiradas en el chat** aparecen entre corchetes, justo después del momento que deciden: *[Persuasión 14 + 3 = 17]*. Luego la historia cuenta el desenlace.

### 3.3 Escenas y combates

El máster dirige la historia en **escenas**: un combate, una conversación, una exploración, un viaje, un descanso, un desafío (una persecución, una carrera, un acertijo). No tienes que gestionarlas: son la forma en que RPG Engine guarda los capítulos de la historia. Al final de cada escena el juego se guarda solo, y la escena pasa a la historia de tu diario.

**En un combate**, el máster cuenta todos los turnos que no son tuyos, uno tras otro, con cada tirada, y **se detiene donde puedes decidir**: tu turno, una reacción, una elección. En tu turno, di qué haces:

> Lanzo Llama sagrada contra el que está junto a la puerta.

La sección **Combate** del panel muestra el orden de los turnos, a quién le toca, los puntos de golpe de tu grupo y lo heridos que parecen los enemigos (ilesos, heridos, malheridos, caídos: con palabras, nunca con números). Si tu personaje cae, las tiradas de salvación contra la muerte aparecen en grande en la página.

**Cuando el combate ya está decidido**, el máster puede ofrecerte contar el resto en un solo mensaje.

### 3.4 Tiempo, viajes y el mundo que se mueve

**Tiempo.** Cada acción lleva tiempo en la historia, y RPG Engine lleva la cuenta de la fecha: día 3, de madrugada. El máster cuenta el tiempo como lo mide el mundo: el alba, la tercera campanada, el anochecer. Entre sesiones no pasa el tiempo: sigues donde lo dejaste.

**Descansos.** Di que descansas y el máster aplica lo que recupera un descanso, como puntos de golpe y espacios de conjuro:

> Montamos el campamento y hacemos un descanso largo.

**Viajes.** Di adónde quieres ir:

> Tomamos el camino del norte hacia Rocca.

RPG Engine calcula el trayecto, la distancia y los días a vuestro ritmo, y os lleva hasta allí. Un viaje se detiene cuando ocurre algo previsto en el camino, al final de cada jornada y al llegar. Puedes preguntar a qué distancia está un lugar antes de salir:

> [¿A qué distancia está Rocca y cuánto se tardaría a pie?]

**El mundo se mueve sin ti.** Los villanos tienen planes con plazos y relojes. Cada día nuevo, el máster mueve las amenazas que el tiempo ha adelantado, y tú ves sus señales: un rumor, un rastro, un cambio en el pueblo. Nunca ves el reloj en sí, solo lo que deja tras de sí.

**El dinero** se cuenta en las monedas del juego. Paga, vende, cobra: RPG Engine da el cambio.

### 3.5 Mapas

**El mapa del mundo** (panel: **Mundo**) muestra solo los lugares que tu personaje conoce, con los caminos entre ellos, el rastro que habéis recorrido y la niebla sobre todo lo demás. Haz clic en un lugar para ver lo que sabes de él y a qué distancia está.

**El mapa de un lugar** (panel: **Escena**, y **Combate** en un combate) aparece cuando el máster dibuja uno del sitio donde estáis: paredes, puertas, el suelo y quién está dónde, como fichas. En un combate, en tu turno, las casillas a las que no puedes llegar se cubren con un velo, así ves de un vistazo adónde puedes ir. Cuando el máster pregunta adónde se mueve tu personaje, la página abre el mapa y tocas una casilla, o la escribes, como *E4*.

### 3.6 Misiones, diario y notas

**Misiones.** Cuando tu personaje asume una tarea, esta se convierte en una misión en tu **Diario**: quién la dio, dónde, para cuándo, sus objetivos en una lista y lo que mide (un plazo con el tiempo restante, un reloj, un recuento). Márcala con su estrella para seguirla: se queda pequeña en la parte superior de Escena, con su siguiente objetivo. La misión termina cuando la historia la termina, nunca por sí sola.

**La historia.** La pestaña Historia del Diario es tu campaña como una línea de tiempo: cada escena es un capítulo, con su lugar, su fecha y un breve resumen, la última primero.

**Tus notas.** En la pestaña Notas del Diario escribes tus propias notas: teorías, nombres, planes. Se quedan en tu equipo y el máster no las lee, salvo que **Compartir** una. Una nota compartida llega al máster en su siguiente respuesta como lo que piensas, nunca como un hecho. Tu teoría no se vuelve verdad por haberla escrito. Una nota que pide detener o evitar algún contenido cuenta como si lo hubieras dicho en la mesa.

### 3.7 La historia y la imagen de tu personaje

En la ficha de tu personaje, la tarjeta **Descripción** tiene un cuadro donde escribir la historia de tu personaje. Envíala y el máster la escribe en el personaje con sus propias palabras, después de que le des el visto bueno.

Para la imagen de tu personaje, entrega al máster un archivo de imagen en el chat, indicando dónde está en tu equipo (PNG, JPEG, WebP o SVG, hasta 5 MB):

> [Este es el retrato de mi personaje: C:\Users\me\Pictures\mira.png]

El máster lo copia en la campaña y aparece en la ficha de tu personaje en el panel. Puedes cambiarlo del mismo modo cuando quieras.

O pide que se cree el retrato, si tu equipo puede crear imágenes (consulta [Imágenes](#311-pictures)): describe tu personaje al máster, o deja que el máster lo describa.

> [Hazme un retrato: pelo gris trenzado, una cicatriz en la barbilla, ojos cansados.]

El retrato muestra exactamente lo que tu personaje es en el juego, con su pueblo tal como lo tiene este mundo (un enano de las colinas como enano de las colinas) y con el aspecto que describiste. Llega en un minuto aproximadamente, en la ficha de tu personaje. Tus compañeros pueden tener la suya de la misma manera.

### 3.8 Partidas guardadas y volver atrás

RPG Engine guarda toda la campaña **al final de cada escena**, por sí solo. Lo que puedes hacer con esas partidas guardadas depende del ajuste **Partidas guardadas**:

| Partidas guardadas | Guardar cuando quieras | Volver atrás |
|---|---|---|
| **muerte permanente** | no | nunca; solo puedes reiniciar la campaña |
| **punto de control** | no | a la última partida guardada, solo cuando tu personaje muere |
| **libre** | sí | a cualquier partida guardada, cuando quieras |

En todos los modos puedes **reiniciar**: desde el comienzo del juego con el mismo personaje, o desde la sesión cero con uno nuevo.

Puedes hacer todo esto en el chat ("[Volvamos a antes del duelo.]") o en la sección **Partidas guardadas** del panel.

**Tras volver atrás, abre un chat nuevo.** El chat en el que jugabas recuerda lo que se deshizo. Abre un chat nuevo con el máster (`/clear` en Claude Code, `/new` en Codex), escribe *continuar* y pulsa **He abierto un chat nuevo** en Partidas guardadas, o díselo al máster en el chat nuevo. Nunca retomes el chat anterior. Hasta que lo confirmes, el máster no seguirá.

### 3.9 Sesiones: parar y volver

**Terminas la sesión** cuando quieras:

> [Paremos aquí por esta noche.]

No hay "guardar y salir": todo está ya en los archivos.

**Para cerrar** el chat, escribe `/exit` en Claude Code o `/quit` en Codex. El panel se queda en silencio hasta el siguiente chat.

**Para volver**, abre una terminal en la carpeta de la campaña (la que mostró `init`), inicia tu aplicación ahí y escribe *continuar*. El máster lee cómo está la partida, te da un breve resumen y empieza con algo que ocurre. Un chat nuevo no pierde nada: la campaña vive en sus archivos, no en el chat.

El máster no hace preguntas de rutina al final. Solo si ha notado que algo no funcionó, pregunta brevemente.

### 3.10 El ánimo del máster

En la parte superior del panel está el avatar del máster, un pequeño robot. Su cara sigue el tono de la historia: preocupada cuando crece el peligro, encantada ante una idea audaz, sorprendida ante un giro. Reacciona un momento ante un 20 natural o un 1 natural. Nunca muestra lo que aún no sabes: ninguna sonrisa antes de que salte la trampa. Las fichas de tu grupo también muestran su estado de ánimo. Cuando el chat está cerrado, el robot duerme.

### 3.11 Imágenes

RPG Engine puede encargar una imagen de cada lugar al que llegas y de cada misión que aceptas, según diga el ajuste **Imágenes**, y el retrato de tu personaje cuando lo pides. Usa lo que ya hay en tu equipo:

- **Codex**, con tu inicio de sesión de ChatGPT: una imagen pintada.
- Si no, **Claude Code**, con tu inicio de sesión de Claude: un dibujo.

La imagen usa tu propio plan, no el nuestro. La sección **Ajustes** te dice si se pueden crear imágenes en tu equipo y, si no, los pasos para configurarlo. Sin imágenes, la página muestra en su lugar la marca de cada tipo de lugar. También puedes darle al máster una imagen tuya para cualquier lugar o personaje.

### 3.12 Seguridad: líneas, velos y parar

- **Líneas**: lo que nunca aparece en el juego.
- **Velos**: lo que puede ocurrir, pero solo fuera de escena.
- **Parar**: en cualquier momento puedes detener un contenido, sin dar explicaciones. Escríbelo fuera de la historia:

> [parar]

El máster lo deja de inmediato y lo añade a tus líneas, para todas las sesiones futuras. Puedes ver y cambiar tus líneas y velos en **Ajustes**.

### 3.13 Cambiar de idea

Cualquier ajuste puede cambiar durante la campaña: en el chat ("[Hagámoslo más difícil.]") o en **Ajustes**. El máster se entera del cambio en su siguiente respuesta. Una decisión que el máster tomó sin el libro se convierte en un **precedente** y se conserva, para que la misma pregunta tenga la misma respuesta la próxima vez.

---

## 4. El panel, sección por sección <!-- icon: party -->

El panel es una página en tu propio equipo. El máster te da su enlace al principio de cada chat. Sigue el juego en directo: cuando el máster cambia algo, la página también cambia.

Solo puede abrirlo el navegador del equipo donde juegas: no un móvil ni una tableta, aunque estén en la misma wifi. La página también cabe en una ventana estrecha: entonces las secciones pasan a una barra inferior y los iconos a un menú.

La página vive mientras dura el chat. Si cierras el chat, una página que se quede abierta muestra *Sin conexión* con la ficha tal como estaba, y el robot del máster se duerme; si abres un chat en la campaña de nuevo, cuando el máster haya respondido, la página vuelve sola.

### Arriba

- El **avatar del máster**, con su humor.
- El nombre de la campaña, el sistema de juego, el **tiempo de juego** y si la partida está **conectado** (el chat conectado).
- Las secciones: **Grupo**, **Escena**, **Combate** (solo durante un combate), **Diario**, **Mundo**; al final de la fila, como iconos: **Partidas guardadas**, **Ayuda**, **Ajustes**, **Acerca de**.
- El tema claro y oscuro, en la esquina superior derecha.

Cuando el máster te pregunta algo, su aviso se queda arriba de la página, estés en la sección que estés.

### Grupo

La ficha de tu personaje y las de tus compañeros. Cada parte de la ficha es una tarjeta que puedes abrir y cerrar.

- **Haz clic en un número** para tirarlo por diversión. Apunta a un número para ver cómo se forma («+5: Sabiduría +3, competencia +2»).
- Los **puntos de golpe, los espacios y los usos** se muestran como barras y puntos.
- Las **condiciones y los efectos** se muestran con su duración.
- **Descripción** contiene el texto de tu personaje y el cuadro para enviarle al máster su historia.
- A 0 puntos de golpe, las **salvaciones de muerte** aparecen en grande bajo el nombre.
- Junto a la ficha (debajo en una pantalla estrecha): **las tiradas**, las más recientes primero, las tuyas y las del máster que puedes ver. **Quitar** vacía la lista; **Restaurar** la devuelve. Las tiradas libres se muestran con línea discontinua y atenuadas.

Un compañero con bloque de estadísticas, como un lobo, muestra su bloque de estadísticas en lugar de una ficha completa.

### Escena

Donde está tu grupo: la imagen y el nombre del lugar, los lugares de alrededor, el mapa del lugar cuando lo hay, quién está allí y la escena abierta con lo que ocurre ahora. La misión que sigues está arriba.

### Combate

Solo durante un combate. Arriba: la ronda, quién actúa y quién va después. Debajo: el orden de los turnos, cada combatiente con su estado, tu grupo en números y los enemigos en palabras; lo que tu personaje tiene a mano (clase de armadura, puntos de golpe, ataques); el mapa del lugar, con quien actúa rodeado por un círculo. En tu turno, el enlace de Combate late en dorado, estés donde estés.

### Diario

Tres pestañas:

- **Misiones**: activas, completadas y fallidas, cada una como una tarjeta con sus objetivos, su plazo como temporizador y sus relojes. La estrella sigue una misión.
- **Historia**: los capítulos de la campaña, escena por escena, la última primero.
- **Notas**: tus propias notas, privadas hasta que compartas una.

### Mundo

El mapa del mundo tal como lo conoce tu personaje, con la niebla sobre el resto. Arrastra para moverte, usa la rueda o el gesto de pellizco para acercar. Haz clic en un lugar para ver su tarjeta. Junto al mapa hay una lista de lugares, los más cercanos primero. Si hay más de un mapa (una ciudad, un continente, otro plano), unas pestañas permiten cambiar entre ellos.

### La bandeja de dados

El botón de dados abre la bandeja de dados: elige dados y un modificador, y tira. Con dos o más dados de un tipo, elige cuáles cuentan: **Todos**, **Alto** (solo el más alto) o **Bajo** (solo el más bajo). Los dados que elegiste se quedan hasta que pulses **Quitar**, así que la misma tirada de daño es un clic cada ronda. Mientras el máster pide una tirada, la bandeja de dados te indica qué dados la resuelven.

### Partidas guardadas

Tus partidas guardadas, las más recientes primero, cada una con su lugar, la fecha del juego y cuándo se hizo. **Guardar ahora** (con partidas guardadas libres), **Volver aquí** y **Empezar de nuevo**, en rojo, en dos pasos. Consulta [Partidas guardadas y volver atrás](#38-saves-and-going-back).

### Ajustes

Tus ajustes, en grupos: el juego, aprender el juego (el mentor y las reglas que ya te han explicado), dados y medidas, límites (líneas y velos), imágenes, idioma. Haz clic en un valor para elegirlo; debajo, lo que significa. Después, las preferencias propias de la página, que solo se guardan en este navegador: el tema, el sonido de los dados, el **juego de dados** (resina, metal, madera, piedra), bordes redondeados o afilados, tirar a mano.

Los ajustes propios del máster, como las reglas de la casa y los precedentes, no están aquí: se quedan en el chat.

### Ayuda y Acerca de

**Ayuda**: esta guía. **Acerca de**: qué es RPG Engine, sus enlaces, sus licencias y los créditos del sistema de juego.

### Antes de jugar: Ajustes y sesión cero

Mientras una campaña nueva está en su primer paso, **Ajustes**, toda la página hace sus preguntas: una cada vez, cada una con el significado de sus valores y el sugerido. **Decides tú** deja una pregunta en manos del máster, salvo las líneas y los velos, que siempre son tuyos; **Omitir** la deja para más tarde. Al final, **Vamos allá**.

### Mensajes de la página

A veces la página muestra un aviso sobre sí misma: un problema en los archivos de la campaña (el máster lo arregla), el juego ausente (el chat está cerrado), la página en proceso de traducción.

---

## 5. Sistemas de juego y reglas de la casa <!-- icon: dice -->

### 5.1 Qué es un sistema de juego

Un sistema de juego son los datos de un juego: su ficha, sus números, sus criaturas, objetos, conjuros y texto de reglas. Cada campaña juega un sistema.

RPG Engine calcula la ficha de tu personaje y lo que se gasta y se recupera, como puntos de golpe y espacios de conjuro, igual que una ficha digital. Cómo funciona un rasgo o un conjuro lo lee el máster en las reglas y lo decide, como en una mesa.

### 5.2 Quinta edición, incluida

RPG Engine incluye **5e**, del Documento de Referencia del Sistema 5.1 (las reglas de 2014, libres bajo Creative Commons). Incluye:

- las razas, clases, subclases, un trasfondo y una dote del SRD;
- los 319 conjuros, las armas, armaduras y equipo, los objetos mágicos y los monstruos del SRD;
- los capítulos de reglas, que el máster consulta por su texto exacto;
- la ficha de personaje completa, calculada: modificadores de característica, salvaciones, habilidades, clase de armadura, ataques, CD de salvación de conjuros, espacios, dados de golpe, rasgos por nivel, experiencia y subida de nivel;
- descansos que recuperan lo que deben; condiciones con su texto de reglas; recordatorios de concentración.

**Contenido más allá del SRD.** Puedes jugar a la quinta edición con contenido que el SRD no tiene, como una clase o un monstruo de un libro que poseas. El máster conoce el juego, puede leer tus manuales y puede buscar en la web. Escribe lo que necesita como páginas de tu campaña, y RPG Engine funciona igual con ellas. Lo que incluimos está limitado por su licencia; lo que sabe tu máster, no.

RPG Engine es compatible con la quinta edición.

### 5.3 Reglas de la casa y tus propias adiciones

No necesitas tocar ningún archivo. Pídeselo al máster:

> [Regla de la casa: un 1 natural en un ataque hace que sueltes el arma.]
>
> [Quiero jugar con la clase Blood Hunter. Tengo el libro: aquí están los rasgos de la clase.]
>
> [En esta campaña, un descanso corto dura 10 minutos.]

El máster las registra en tu campaña, de una de estas formas:

- **Un acuerdo de la mesa**, en palabras, como el arma que se suelta o el descanso corto de arriba. El máster lo guarda con los ajustes de la campaña y juega según él a partir de entonces. Una decisión que el máster toma sin apoyarse en el libro se guarda del mismo modo, como un **precedente**.
- **Una página nueva**, como una clase, una raza o un objeto. Una clase nueva funciona como las del sistema: tu nivel, los dados de golpe y los rasgos la cuentan. Una raza nueva puede partir de una existente («como el elfo, más…»); una espada con nombre puede partir de la espada larga.
- **Números nuevos para la ficha**: un campo, una tabla, una fórmula, un contador que recupera un descanso. Por ejemplo, los dados de superioridad de un Maestro de batalla, que vuelven con un descanso corto. Una regla de la casa también puede sustituir una de las fórmulas del sistema.

Si ya tienes reglas de la casa escritas, también puedes ponerlas como archivos de texto en la carpeta `rules` de la campaña (consulta [la carpeta de la campaña](#8-for-the-curious-the-campaign-folder)): el máster las lee antes que la regla del libro con el mismo nombre.

### 5.4 Añadir o importar tu propio sistema de juego

Hoy RPG Engine solo juega a la quinta edición. Llegarán otros sistemas de juego, y también una forma de añadir el tuyo o de convertir un juego que poseas en uno a partir de sus manuales. Consulta [Próximamente](#9-coming-later).

---

## 6. Extensiones <!-- icon: plus -->

**Las extensiones aún no están disponibles.** Una extensión añadirá algo a una campaña además de su sistema de juego: un mundo, una aventura, una función como el clima o una baraja de tarot, reglas de la casa para compartir. Elegirás cuáles usa cada campaña. Las primeras previstas para la quinta edición son el clima y la apertura de cerraduras.

---

## 7. De dónde viene una campaña, y su idioma <!-- icon: world -->

### 7.1 Tres formas de tener un mundo

**Creado sobre la marcha.** Das una premisa en la preparación y el máster construye el mundo según avanzas: cada lugar, persona y trama justo antes de que la necesites, y se conserva desde entonces. Es la forma más rápida de jugar: instalas, creas y en pocos minutos estás haciendo tu personaje. Nada de lo inventado se pierde: una vez dicho, queda escrito y sigue siendo cierto.

**Preparado al inicio.** La misma premisa, pero con **preparación: todo al inicio**, el máster construye los lugares, las facciones, las amenazas y sus planes antes de que empiece el juego. La primera sesión empieza más tarde, con más cosas listas entre bastidores.

**A partir de una campaña o aventura existente.** Hoy no hay un botón de importar. Dale al máster tu aventura (un texto o un PDF que tu anfitrión pueda leer) y pídele que la prepare:

> [Tengo esta aventura en PDF. Prepárala como nuestra campaña: léela y escribe sus lugares, personajes y secretos. No me cuentes nada de lo que contiene.]

El máster la lee con las herramientas de tu anfitrión de IA y la escribe como páginas de la campaña, secretos incluidos, que descubrirás jugando. Claude Code lee PDF; con Codex, un archivo de texto o markdown es la opción más segura. Hazlo durante la preparación, antes de la sesión cero.

Mientras el máster trabaja, no abras los detalles de lo que lee o escribe (en Claude Code, ctrl+o): muestran el texto de la aventura, con sus secretos. El propio máster guarda los secretos, como siempre.

En cuanto la campaña tiene páginas propias, la preparación deja de pedir una premisa y una preparación. Incluso en una campaña escrita, cuando vas a un lugar que el texto no cubre, el máster crea lo necesario y lo registra.

**Una campaña se juega una vez.** Para jugar de nuevo la misma aventura, crea una campaña nueva. Dentro de una campaña, aún puedes volver a una partida guardada o empezar de nuevo, según lo permita el ajuste de partidas guardadas.

### 7.2 Idiomas

**Un idioma por campaña**: el del máster. El máster escribe en él y el panel lo sigue. El máster lo toma de cómo escribes y lo confirma.

**El panel** incluye inglés e italiano (revisados con esmero) y 24 idiomas más: francés, alemán, español, portugués (brasileño), neerlandés, sueco, noruego, danés, finés, islandés, ruso, ucraniano, polaco, checo, rumano, húngaro, griego, turco, árabe, hebreo, hindi, chino, japonés, coreano. El árabe y el hebreo se leen de derecha a izquierda: la página se refleja, mientras que los mapas y los dados se quedan como están dibujados.

**Cualquier otro idioma** que elijas en Ajustes se traduce en tu equipo, en segundo plano, con Codex o Claude Code y tu propio inicio de sesión, empezando por la sección que tienes abierta. Se hace una vez por idioma, para todas tus campañas. Hasta que esté listo, la página está en inglés. Ajustes te dice si la traducción está en marcha, lista o no es posible en tu equipo.

**Las palabras del juego.** La quinta edición trae sus propios términos en italiano del SRD oficial italiano, así que quienes juegan en italiano leen *Classe Armatura*, *tiro salvezza*, *vantaggio*. Los demás idiomas reciben los términos del sistema traducidos.

**El texto propio del sistema de juego** (los conjuros, los monstruos, los capítulos de reglas) se queda en inglés. El máster lo lee y te lo cuenta en tu idioma.

**Cambiar de idioma a mitad de campaña** deja las páginas ya escritas como están; el máster escribe las nuevas en el idioma nuevo.

---

## 8. Para curiosos: la carpeta de la campaña <!-- icon: list -->

Nunca necesitas abrirla. Si lo haces, ten en cuenta que **contiene los secretos** de tu campaña: leerla destripa el juego.

Una carpeta de campaña contiene:

- `campaign.yaml`: tus ajustes;
- `state.yaml`: en qué punto está el juego ahora: su etapa, la fecha, la escena abierta;
- `world/`: una página por personaje, lugar, facción, misión, objeto, suceso, tema o criatura, como archivos markdown;
- `rules/`: tus reglas de la casa como archivos de texto, si añades alguna (`init` no la crea);
- `images/`: las imágenes, cuando las hay;
- `log.jsonl`: cada cambio, en orden;
- `.saves/`: las partidas guardadas, desde la primera;
- `.player/`: tus propias notas del Diario, que el máster no lee;
- `sessions/`: lo mantiene RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: los archivos pequeños que le dicen a los anfitriones de IA dónde está RPG Engine y mantienen su memoria desactivada. RPG Engine los mantiene al día; déjalos como están.

Las páginas son markdown sencillo con enlaces como `[[Rocca]]`, el formato de Obsidian: el cuaderno del máster se puede abrir allí. **Si cambias una página a mano**, el máster se entera de lo que cambió en su siguiente respuesta.

**La línea de comandos.** Todo lo que hace el máster pasa por comandos que tú también puedes ejecutar, en la carpeta de la campaña. Nunca los necesitas para jugar, y muchos muestran los secretos de la campaña, como `rpg status` y `rpg show`. `rpg --help` los lista todos y `rpg roll --help` explica uno. Un comando que cambia algo mientras hay un chat abierto no es problema: el máster se entera en su siguiente respuesta, como con una página cambiada a mano.

---

## 9. Próximamente <!-- icon: hourglass -->

Lo que está previsto, pero aún no está disponible:

- **Tú como máster**: diriges el juego y la IA interpreta al grupo.
- **Varias personas en la mesa**, cada una con su papel.
- **Extensiones**: ajustes, aventuras, funciones y reglas de la casa, elegidos por campaña.
- **Importar** tus manuales y aventuras.
- **Otros juegos**: más sistemas de juego, y el tuyo.
- **Modo autor**: crear una campaña o una aventura con la IA y compartirla para que otras personas la jueguen.

---

## 10. Preguntas y problemas <!-- icon: info -->

### Preguntas

**¿Necesito saber las reglas?** No. Elige el mentor en modo tutorial y el máster te enseña sobre la marcha, una regla cada vez. Siempre puedes preguntar entre corchetes.

**¿Puede hacer trampas el máster?** No puede cambiar una tirada hecha por RPG Engine, salvo en la dificultad historia, y nunca cambia hechos ya establecidos. Puedes preguntar si una tirada fue real.

**¿Puedo hacer trampas yo?** Puedes intentarlo. El máster no se fía de tu palabra en cuanto a los hechos: una línea en tu mensaje que parece un mensaje del juego sigue siendo solo tus palabras, y el máster nunca confirma tus suposiciones sobre secretos.

**¿Cuesta algo?** RPG Engine es gratuito. El máster funciona con tu propio plan de Claude o de ChatGPT, y una tarde de juego es un chat largo: en los planes más pequeños puedes alcanzar el límite del plan antes de que acabe la tarde. Las imágenes y las traducciones usan el mismo plan.

**¿Puedo jugar en el móvil?** No. El máster funciona en tu equipo y el panel solo se abre en el navegador de ese equipo.

**¿Puedo jugar con amistades?** Todavía no: hoy hay una persona jugando, un personaje y sus compañeros. Varias personas en la mesa llegarán con los papeles.

**¿Puedo usar otra IA la próxima vez?** Sí. La campaña vive en sus archivos: ábrela en otro anfitrión y escribe *continuar*.

**¿Y si cierro el navegador?** No se pierde nada. Vuelve a abrir el enlace mientras el chat siga abierto; la página regresa al punto donde está el juego.

**¿Puedo jugar con contenido de D&D que ya tengo?** Sí. El máster puede usar tus libros, su propio conocimiento y la web. Lo que incluye RPG Engine se limita a contenido libre; lo que use tu juego depende de ti.

### Problemas

**El panel no se abre.** Pídele el enlace al máster: `[¿Cuál es el enlace del panel?]`. La página solo funciona mientras hay un chat con el máster abierto en esa campaña, y solo después de la primera respuesta del máster en ese chat. Con el chat cerrado, el navegador no puede llegar a la página; una página que se quede abierta dice *Sin conexión*.

**El máster parece no conocer el juego, o se inventa herramientas.** Tu anfitrión de IA no cargó RPG Engine.

- Primero, comprueba que iniciaste el anfitrión **en la carpeta de la campaña** y que dijiste que confías en ella.
- **Claude Code**: escribe `/mcp`. Si `rpg` aparece pero falló, elígelo y pulsa **Reconnect**. Si no aparece, cierra Claude Code, escribe `claude mcp reset-project-choices` en la carpeta de la campaña e inícialo de nuevo.
- **Codex**: escribe `codex mcp list` en una terminal, en la carpeta de la campaña. Si falta `rpg`, Codex no confía en la carpeta: inícialo de nuevo allí y di que sí cuando pregunte.
- En ambos: si `rpg --version` en una terminal dice que no se encuentra el comando, instala RPG Engine de nuevo ([2.2](#22-install)) y abre una terminal nueva.

**Tras una actualización, nada cambió.** Un máster en marcha conserva la versión con la que arrancó. Abre un chat nuevo o, en Claude Code, reconecta el servidor (`/mcp`, luego `rpg`, luego **Reconnect**).

**El máster recuerda algo que deshice.** Volviste a una partida guardada pero seguiste jugando en el mismo chat. Abre un chat nuevo y pulsa **He abierto un chat nuevo** en Partidas guardadas.

**El máster hace preguntas de preparación que ya respondí en la página.** Díselo: `[Eso ya lo elegí en el panel.]`

**No aparece ninguna imagen.** Abre Ajustes > Imágenes: indica si este equipo puede crearlas y, si no, los pasos, con cada comando y un botón para copiarlo.

**La página está en inglés pero elegí otro idioma.** Se está traduciendo en segundo plano; Ajustes indica cómo va. Sin Codex ni Claude Code en este equipo, se queda en inglés.

**El máster dice que la campaña tiene problemas.** Los arregla por sí solo. Si editaste archivos a mano, puede que te pregunte qué querías hacer.

**Windows: `npm` falla en mi carpeta.** No guardes la campaña, ni RPG Engine, en una ruta que contenga `&`.

**La instalación falla, o `rpg` no arranca.** Comprueba tu versión de Node.js con `node --version`: debe ser la 22 o superior. Si es anterior, instala la versión LTS desde [nodejs.org](https://nodejs.org) y vuelve a instalar RPG Engine.

**El enlace del panel cambió.** Otro programa estaba usando la dirección habitual de la campaña, o Windows la había reservado. RPG Engine tomó otra; el máster te da el nuevo enlace. Nada más cambia.
