<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
# RPG Engine: la guía completa

**RPG Engine** te permite jugar un juego de rol de mesa con una **IA como máster**. Hablas con el máster en un **chat**; RPG Engine trabaja entre bastidores: **recuerda el mundo**, **tira los dados** y **lleva las cuentas**. Junto al chat mantienes abierta una página en el navegador, el **panel**, con tu ficha, los dados, los mapas y tu diario.

Esta guía es para quienes juegan: no necesitas saber programar.

## Inicio rápido <!-- icon: send -->

1. Instala **Node.js** desde [nodejs.org](https://nodejs.org) (la versión LTS).
2. Instala un **agente de IA**, el programa en el que se ejecuta el máster, e inicia sesión: por ejemplo Claude Code o Codex ([2.4](#24-connect-your-ai)).
3. En una terminal, instala RPG Engine: `npm install -g rpg-engine`.
4. Crea una campaña: `rpg init "The Salt Isles"`.
5. Entra en la carpeta nueva, `cd "The Salt Isles"`, e inicia tu agente allí: `claude` para Claude Code, `codex` para Codex. Responde que sí cuando pregunte si confías en la carpeta ([2.4](#24-connect-your-ai)) y escribe *Hola, ¡vamos a empezar!* El máster responde con el enlace a tu panel.

## 1. Qué es RPG Engine <!-- icon: about -->

| Quién | Qué hace |
|---|---|
| **Tú** | Juegas a tu personaje: lo que hace, dice e intenta. |
| **El máster** (la IA) | Cuenta la historia, interpreta a todos los demás, decide qué ocurre y pide tiradas. |
| **RPG Engine** | Guarda el mundo en archivos, tira los dados, cuenta los puntos de golpe, el dinero, el tiempo y las distancias, y mantiene los secretos hasta que los descubres. |

El mundo se mantiene igual de una tarde a otra, incluso en un chat nuevo, incluso con otra IA:

- **Lo que se ha dicho sigue siendo cierto.** Un villano muerto sigue muerto.
- **Los dados son reales.** El máster no puede doblegarlos, salvo en la dificultad más fácil, si la eliges.
- **Los secretos siguen siendo secretos.** El máster nunca te cuenta lo que tu personaje no sabe.
- **El mundo se mueve.** Las amenazas avanzan mientras descansas o viajas, y ves sus señales.
- **Una campaña es una carpeta** en tu equipo: para cuando quieras y retómala más tarde.

Un juego llega como un sistema de juego, un paquete que el máster instala para tu campaña: hoy el nuestro es la **quinta edición**, del System Reference Document 5.1, que es gratuito. Sin sistema juegas en libre, una historia sin números. Llegarán otros ([Próximamente](#9-coming-later)).

---

## 2. Primeros pasos <!-- icon: path -->

### 2.1 Qué necesitas

- Un equipo con Windows, macOS o Linux, y un navegador web.
- **Node.js 22** o superior, desde [nodejs.org](https://nodejs.org). Incluye `npm`, que instala RPG Engine.
- Una **terminal**: en Windows, Terminal o PowerShell; en macOS, Terminal. Para abrir una en una carpeta, haz clic derecho en la carpeta y elige **Abrir en Terminal** (Windows) o **Servicios > Nueva Terminal en la carpeta** (macOS).
- Un **agente de IA** para el máster ([2.4](#24-connect-your-ai)), con el **modelo más grande** que ofrezca: a un modelo pequeño es más fácil convencerlo de que revele secretos o se salte las reglas.

### 2.2 Instalar

```text
npm install -g rpg-engine
```

`rpg --version` comprueba que todo ha salido bien. Usas `rpg` una vez por campaña, para crearla; después, tu agente inicia RPG Engine por sí solo.

### 2.3 Crear una campaña

Abre una terminal en la carpeta donde guardas tus juegos ([2.1](#21-what-you-need) explica cómo):

```text
rpg init "The Salt Isles"
```

Esto crea la carpeta `The Salt Isles` con una campaña nueva dentro; entra en ella con `cd "The Salt Isles"`. Recuerda dónde está: volverás a ella cada vez que juegues. Todo lo demás lo eliges después, en el chat o en el panel; `rpg init --help` muestra las opciones para elegir algunas ahora, como `--language it` o `--difficulty hard`.

El máster no puede crear una campaña por ti: antes de `init`, nada le dice a tu agente dónde está RPG Engine.

### 2.4 Conectar tu IA

El máster funciona en un **agente de IA**: una aplicación de IA, en la terminal o en el escritorio, que puede trabajar con los archivos de tu equipo, como Claude Code o Codex. Un chat sencillo como claude.ai o ChatGPT, o una aplicación del móvil, no basta: el máster necesita acceder a los archivos de la campaña en tu equipo. Cada agente necesita su propio plan y su propio inicio de sesión: Claude Code, un plan de pago de Claude; Codex, un inicio de sesión de ChatGPT. Lo instalas una sola vez, desde su propia página: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: en la carpeta de la campaña escribe `claude`. Cuando pregunte si confías en la carpeta, elige **Yes, I trust this folder**; ojo, la respuesta que aparece marcada es *No, exit*. La campaña también tiene un pequeño hook, `rpg --listen`, que la pregunta no muestra: avisa al máster al instante cuando actúas desde el panel.
- **Codex**: en la carpeta de la campaña escribe `codex` y responde que sí cuando pregunte si confías en la carpeta. En su aplicación de escritorio, comprueba en los ajustes que las memorias estén desactivadas para los chats del juego.
- **Otro agente**: inícialo en la carpeta de la campaña y dale el servidor MCP `rpg mcp`. RPG Engine es un servidor MCP estándar: cualquier agente compatible con MCP puede ser el máster, incluso los locales.

Jugamos y probamos con **Claude Code**; **Codex** está conectado y comprobado, pero todavía no se ha jugado una campaña completa con él. La campaña desactiva la memoria propia del agente: el juego vive en sus archivos, para que volver a una partida guardada sea volver de verdad.

### 2.5 El primer chat

Escribe lo que quieras, por ejemplo *¡Hola! Vamos a empezar.* En su primera respuesta de cada chat, el máster te da el **enlace a tu panel**, algo como `http://127.0.0.1:4750`: ábrelo y tenlo junto al chat.

Entre los mensajes del máster, tu agente muestra las herramientas que usa: no abras sus detalles (en Claude Code, ctrl+o), porque pueden mostrar secretos.

Una campaña nueva pasa por tres etapas, que se ven en la parte superior del panel: **1 Ajustes** (cómo quieres jugar), **2 Sesión cero** (creas tu personaje, jugando), **3 Juego**.

### 2.6 Ajustes: elegir cómo juegas

El máster pregunta solo lo que aún falta, unas pocas preguntas cada vez; el paso **Ajustes** del panel muestra las mismas preguntas como tarjetas. Escribe "decide tú" y el máster elige. Todo se puede cambiar después, en el chat o en **Ajustes**.

| Ajuste | Qué decide | Valores |
|---|---|---|
| **Mentor** | Cuánto te enseña el máster las reglas | desactivado, pistas, tutorial |
| **Dificultad** | Lo difícil que es el mundo | historia, fácil, normal, difícil, brutal |
| **Letalidad** | Qué significa caer en un combate | narrativa (nunca mueres), épica (solo cuando importa), dados |
| **Partidas guardadas** | Cuándo puedes volver atrás | muerte permanente, punto de control, libre ([3.8](#38-saves-and-going-back)) |
| **Rigor** | Con qué fidelidad siguen las reglas la comida, la luz y los viajes | fluido, reglas, simulación |
| **Dados** | Quién tira tus dados | digitales, físicos |
| **Unidades** | Distancias y pesos | métricas, imperiales |
| **Voces de los personajes** | Quién habla por los personajes que encuentras, del máster a los personajes: siempre el máster; en momentos clave el propio personaje, que sabe solo lo que sabe, según decida el máster; o siempre el personaje, en los principales o en todos, más lento y más costoso, donde tu aplicación de IA lo permita | el máster, a veces, personajes principales, todos |
| **Compañeros** | Quién viaja contigo | ninguno, creados contigo, creados por el máster, encontrados en el juego |
| **Imágenes** | Imágenes de lugares, misiones y de quienes encuentras | ninguna, a petición, lugares nuevos, misiones y quienes encuentras ([3.11](#311-pictures)) |
| **Líneas** y **Velos** | Lo que nunca aparece y lo que ocurre solo fuera de escena | listas |
| **Idioma** | El idioma del juego y del panel | cualquiera |

La quinta edición añade el **avance**: puntos de experiencia o hitos.

Si no hay un mundo escrito, el máster también pregunta una **premisa** (género, tono, algunos elementos y lo que más disfrutas en un juego, como combates, misterios, conversaciones o explorar, con tus palabras) y la **preparación**: construir el mundo sobre la marcha, mientras juegas, o todo al principio.

**El estilo del máster** nunca se pregunta, pero puedes cambiarlo en el chat o en **Ajustes**: la **prosa** (sencilla, literaria, pulp, irónica), las **historias** que inventa (situaciones, arcos, episodios, misterio), un autor con el que **escribir al estilo**, o cualquier otra cosa **con tus palabras**.

### 2.7 Sesión cero: tu personaje

Creas tu personaje con el máster, como en una mesa. Cada elección es tuya, a menos que le pidas al máster que la haga: puedes llegar con una idea completa, una vaga o con nada. El máster te explica cómo se obtienen las puntuaciones de característica antes de tirar ningún dado. Tu historia nunca es obligatoria; si aportas una, el máster la escribe con tus palabras. Después, el máster te pide una imagen de tu personaje ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcula la ficha: tú nunca haces las cuentas.

---

## 3. Cómo se juega <!-- icon: chat -->

### 3.1 Hablar con el máster

Escribe lo que hace o dice tu personaje, con tus palabras:

> Le pregunto al posadero quién más ha pasado por aquí esta noche.

Fuera de la historia, escribe entre corchetes: *[¿Cómo funciona el agarre?]* El máster también responde entre corchetes.

Tú dices lo que intentas; el máster dice lo que pasa. El máster nunca decide por tu personaje y nunca habla del motor del juego. Puedes preguntarle cómo usar el dashboard.

**Actuar desde el dashboard**: haz clic en un nombre de tu ficha, como un arma, un conjuro o algo que llevas, y luego en el objetivo; o haz clic en una persona para hablarle. El dashboard escribe tu frase, *Ataco a Bandido encapuchado 1 con Maza.*, que puedes cambiar antes de pulsar **Decir al máster**. El máster la oye como si la hubieras dicho en el chat y la resuelve como cualquier otra. Si tu aplicación de IA no puede recibirla por sí sola, **Copiar** la deja lista para pegarla en el chat.

### 3.2 Tiradas

El máster pide una tirada solo cuando el resultado es incierto e importa, y antes dice qué está en juego. Después:

- **En el dashboard**, un aviso muestra un botón para cada prueba, como *Acrobacias +4 · con ventaja*. Haz clic: los dados caen en la página y el máster oye el resultado. También puedes hacer clic en la línea de tu ficha que se ilumina, tirar los dados desde la bandeja de dados o escribir otra cosa en el aviso.
- **Manual**, en la esquina del aviso o en **Ajustes**: el aviso te dice qué tirar, y tú lo tiras desde tu ficha o desde la bandeja de dados.
- **Dados físicos**, con el ajuste de dados en físico: escribes los números que has sacado, *[He sacado un 14.]*, y RPG Engine suma tus modificadores.

**Tiradas libres**: haz clic en cualquier número de tu ficha, o abre la bandeja de dados, para tirar por diversión. Nunca cuentan y el máster nunca las ve.

**Las tiradas del máster** aparecen en tu columna de tiradas, salvo las secretas. Siempre puedes preguntar *[¿Esa tirada fue real?]*: si la tirada era secreta, el máster te da una huella que prueba que se hizo antes de que preguntaras.

### 3.3 Escenas y combates

La historia avanza en **escenas**: un combate, una conversación, una exploración, un viaje, un descanso. Al final de cada escena la partida se guarda sola y la escena pasa a tu diario.

En un combate, el máster cuenta todos los turnos que no son tuyos y se detiene donde puedes decidir. **Escena** muestra arriba de quién es el turno y quién va después, y la tarjeta de tu personaje junto al mapa. El orden de los turnos, los puntos de golpe de tu grupo y lo heridos que parecen los enemigos, con palabras, quedan al lado de la página. Si tu personaje cae, las salvaciones de muerte aparecen en grande en la página.

### 3.4 Tiempo, viajes y el mundo que se mueve

RPG Engine lleva la cuenta de la fecha; no pasa el tiempo entre sesiones. Di que descansas, *Hacemos un descanso largo*, y cuando el máster esté de acuerdo, el descanso devuelve lo que corresponde. En un descanso corto, el máster puede preguntarte en el dashboard cuántos dados de golpe gastas: tíralos de uno en uno, mira cuánto cura cada uno y para cuando quieras. Di adónde vas, *Tomamos el camino del norte hacia Rocca*, y RPG Engine calcula la ruta, la distancia y los días, y se detiene si ocurre algo por el camino. El dinero se cuenta en las monedas del juego, con el cambio incluido.

Los villanos tienen planes con plazos. Cada día nuevo, el máster mueve las amenazas que el tiempo ha hecho avanzar, y tú ves sus señales, nunca el reloj en sí.

### 3.5 Mapas

**Mundo** muestra los lugares que conoce tu personaje, los caminos entre ellos y el rastro que has recorrido, con niebla sobre el resto. **Escena** muestra el mapa del lugar donde estás, si lo tiene, con quién está en cada sitio; en un combate, en tu turno, las casillas a las que no llegas aparecen veladas. Cuando el máster pregunte adónde te mueves, toca una casilla o escríbela, por ejemplo *E4*.

**Mundo** también guarda lo que sabe tu personaje. **Conocimientos** enumera las personas, los lugares, las facciones, las criaturas y las historias que conoce, cada una tal como la conoce: búscalas o abre una para leerla completa; un nombre dentro del texto lleva a su página. **Documentos** guarda las cartas, los avisos y las páginas que encontró, para releerlos. **Calendario** muestra hoy, los plazos de tus misiones con el tiempo que queda y los días de la historia: un día con escenas lleva a sus capítulos en el Diario.

### 3.6 Misiones, diario y notas

Una tarea que asume tu personaje se convierte en una misión en el **Diario**, con sus objetivos, su plazo y lo que mide; márcala con una estrella para tenerla a la vista arriba en Escena. El Diario también cuenta tu **historia**, escena por escena, y guarda tus **notas**: son privadas, salvo que pulses **Compartir** en una, y entonces el máster la oye como lo que piensas, nunca como un hecho. En **Compañeros** puedes leer los diarios de tus compañeros: de vez en cuando, al final de un día o de una misión, escriben unas líneas sobre lo que piensan y sienten.

### 3.7 La historia y la imagen de tu personaje

En tu ficha, la tarjeta **Descripción** tiene un cuadro para la historia de tu personaje: el máster la escribe ahí, cuando tú le dices que sí. Para una imagen, dale al máster un archivo (PNG, JPEG, WebP o SVG, de hasta 5 MB) indicando dónde está en tu equipo, o pide que se haga un retrato ([3.11](#311-pictures)): *[Hazme un retrato: pelo gris trenzado, una cicatriz en la barbilla.]*

### 3.8 Partidas guardadas y volver atrás

RPG Engine guarda toda la campaña al final de cada escena. El ajuste de **partidas guardadas** decide el resto:

| Partidas guardadas | Guardar cuando quieras | Volver atrás |
|---|---|---|
| **muerte permanente** | no | nunca |
| **punto de control** | no | a la última partida guardada, solo cuando tu personaje muere |
| **libre** | sí | a cualquier partida guardada |

En todos los modos puedes **empezar de nuevo**, desde el inicio del juego o desde la sesión cero. Hazlo en el chat o en **Partidas guardadas**.

Después de volver atrás, **abre un chat nuevo**: el anterior recuerda lo que se deshizo. Escribe *continuar* en el chat nuevo y luego pulsa **He abierto un chat nuevo** en Partidas guardadas.

### 3.9 Sesiones: parar y volver

Para cuando quieras: *[Lo dejamos aquí por esta noche.]* Todo está ya guardado en los archivos. Para volver, inicia tu agente en la carpeta de la campaña y escribe *continuar*: el máster te da un resumen breve y sigue.

### 3.10 El ánimo del máster

El robot de la parte superior del dashboard es el máster: su cara sigue el tono de la historia y nunca revela lo que aún no sabes. Cuando el chat está cerrado, duerme.

### 3.11 Imágenes

RPG Engine puede generar imágenes de los lugares a los que llegas, las misiones que aceptas y los personajes que conoces, según indique el ajuste de **imágenes**, y el retrato de tu personaje cuando lo pides. Usa tu propio Codex o Claude Code, con tu inicio de sesión, en tu plan y con sus límites: **Codex** las pinta y, si no, **Claude Code** las dibuja. **Ajustes** indica si este equipo puede generarlas y, si no, cómo prepararlo. Siempre puedes darle al máster una imagen tuya.

### 3.12 Seguridad: líneas, velos y stop

Las **líneas** nunca aparecen en el juego; los **velos** ocurren solo fuera de escena. En cualquier momento escribe *[stop]*: el máster abandona ese contenido al instante y lo añade a tus líneas.

### 3.13 Cambiar de opinión

Todos los ajustes se pueden cambiar, en el chat o en **Ajustes**. Una decisión que el máster toma sin el libro se convierte en un **precedente**, de modo que la misma pregunta recibe la misma respuesta la próxima vez.

---

## 4. El panel <!-- icon: party -->

Una página en tu propio equipo, que solo se abre en el navegador de ese equipo y funciona mientras el chat está abierto. Cuando el chat se cierra, muestra *Not connected*; vuelve sola con el siguiente chat.

- **Grupo**: tu ficha y las de tus compañeros. Haz clic en un número para tirarlo; pasa el cursor por encima para ver de dónde sale y, cuando una flecha marca su dado, qué mejora o empeora la tirada. Junto a la ficha, las tiradas.
- **Escena**: dónde estás, su imagen y su mapa, quién está allí y qué está pasando; en un combate, los turnos y la tarjeta de tu personaje.
- **Diario**: misiones, la historia, los diarios de tus compañeros y tus notas.
- **Mundo**: el mapa del mundo, lo que sabe tu personaje, los documentos encontrados y el calendario.
- **La bandeja de dados**: elige los dados y un modificador, y tíralos; ×2 duplica los dados, nunca el modificador, como en un golpe crítico.
- **Partidas guardadas**, **Ayuda**, **Ajustes** y **Acerca de**, como iconos al final de la fila. Ajustes también guarda las preferencias propias de la página: tema, sonido de los dados y juego de dados.

Cuando el máster te pregunta algo, su aviso se queda arriba, estés en la sección que estés.

---

## 5. Sistemas de juego y reglas de la casa <!-- icon: dice -->

### 5.1 Qué es un sistema de juego

Los datos de un juego: su ficha, sus números, sus criaturas, objetos, conjuros y el texto de sus reglas. Cada campaña juega con un solo sistema. RPG Engine calcula la ficha y lo que se gasta y se recupera; cómo funciona una característica, lo lee el máster en las reglas y lo decide, como en una mesa.

### 5.2 Quinta edición

Las razas, clases, subclases, un trasfondo y una dote del SRD 5.1; los 319 conjuros, las armas, armaduras, objetos mágicos y monstruos; los capítulos de reglas, que el máster lee por su texto exacto; la ficha completa, calculada.

Es un paquete propio: el máster lo ofrece cuando preparas una campaña y lo instala. Una campaña que lo usa lo instala sola la primera vez que se abre en un equipo que no lo tiene, y el máster te lo avisa.

También puedes jugar contenido que el SRD no incluye, de un libro que tengas: el máster lo escribe como páginas de tu campaña, y RPG Engine las trata como propias. RPG Engine incluye solo contenido abierto; lo que sabe tu máster no tiene ese límite.

Tus propios manuales pueden ser tu biblioteca: dile al máster dónde están, *[Mis manuales están en D:\Books\5e.]*, o añade su carpeta en Paquetes › Biblioteca, y di que sí en la ventana que muestra tu equipo, una sola vez. RPG Engine los lee en este equipo; cada campaña usa las carpetas que actives ahí, y el máster las consulta cuando decide una regla, después del SRD, citando el libro y la página. Se leen mejor como texto, o como PDF cuyo texto se pueda seleccionar; un PDF escaneado se lee a partir de las imágenes de sus páginas, solo en Windows, en unos minutos y con algunos errores. RPG Engine nunca modifica tus manuales, nunca envía su texto a ningún sitio y nunca lo copia en una campaña.

### 5.3 Reglas de la casa y tus propios añadidos

Pídeselo al máster: *[Regla de la casa: un 1 natural en un ataque significa que sueltas el arma.]* El máster lo guarda como un acuerdo de la mesa, o escribe una página o un número de la ficha cuando hace falta. Las reglas de la casa que ya tengas escritas pueden ir como archivos de texto en la carpeta `rules` de la campaña.

### 5.4 Añadir o importar tu propio sistema de juego

Un sistema de juego es un paquete: el máster instala uno desde npm, una carpeta o un archivo, y uno que no es nuestro solo con tu sí, en una ventana de tu equipo. Crear uno es trabajo de desarrollo, y se describe en los documentos de RPG Engine en GitHub. Convertir un libro tuyo en un sistema de juego todavía no es posible ([Próximamente](#9-coming-later)).

---

## 6. Extensiones <!-- icon: plus -->

Todavía no. Una extensión añadirá algo a una campaña además de su sistema de juego: un mundo, una aventura, una función como el clima, reglas de la casa para compartir.

---

## 7. De dónde viene una campaña, y su idioma <!-- icon: world -->

### 7.1 Tres maneras de tener un mundo

- **Creado sobre la marcha**: a partir de tu premisa, el máster construye cada lugar, persona y trama justo antes de que lo necesites, y lo conserva.
- **Preparado al principio**: lo mismo, con el mundo construido antes de jugar.
- **A partir de tu propia aventura o libro**: dale al máster su archivo, *[Importa esta aventura como nuestra campaña: D:\Books\adventure.pdf. No me cuentes nada de lo que hay en ella.]* Se lee mejor como texto, un EPUB, un documento de Word o un PDF cuyo texto se pueda seleccionar; un PDF escaneado se lee a partir de las imágenes de sus páginas, solo en Windows, despacio y con algunos errores. Tu propio Codex o Claude Code lo lee fuera del chat o, si no, el máster en el chat, con tu plan: el documento entero va a OpenAI o Anthropic, bajo los términos de tu cuenta y su elección sobre el entrenamiento. El panel muestra cuánto falta; a partir de una novela, el máster propone por dónde empezar. Escribe los lugares, los personajes y los secretos.

Una campaña se juega una sola vez: para volver a jugar la misma aventura, crea una campaña nueva.

### 7.2 Idiomas

Un idioma por campaña, el del máster, que el panel sigue. El panel incluye 26 idiomas. Cualquier otro lo traduce en tu equipo Codex o Claude Code o, sin ellos, el máster en el chat. Los términos de la quinta edición en italiano vienen del SRD oficial italiano; el texto de las reglas sigue en inglés, y el máster lo cuenta en tu idioma.

---

## 8. Para curiosos: la carpeta de la campaña <!-- icon: list -->

Nunca necesitas abrirla, y contiene los secretos de tu campaña. Tiene `campaign.yaml` (tus ajustes), `state.yaml` (cómo va la partida), `world/` (una página markdown por cada personaje, lugar, misión y el resto), `rules/` (tus reglas de la casa), `images/`, `log.jsonl` (cada cambio), `.saves/`, `.player/` (tus notas) y los archivos pequeños que indican a los agentes de IA dónde está RPG Engine. Las páginas usan el formato de Obsidian. Si cambias una página a mano, el máster lo sabrá en su siguiente respuesta.

RPG Engine se queda en esta carpeta: solo lee y escribe la partida aquí y nunca toca tus otros archivos. Las carpetas de tus manuales solo las lee. Fuera de ella, solo conserva carpetas de datos propias (las traducciones del dashboard, el texto que leyó de tus manuales, y Codex o Claude Code si dejas que los instale) y carpetas temporales mientras se dibuja una imagen. Cualquier otra cosa que tu agente quiera hacer en tu equipo, te la pregunta antes.

Todos los comandos que usa el máster se pueden ejecutar también en la carpeta de la campaña: `rpg --help` los enumera. Muchos muestran los secretos de la campaña.

---

## 9. Próximamente <!-- icon: hourglass -->

- **Tú como máster**, con la IA jugando el grupo.
- **Modo autor**: escribe una aventura con la IA, luego expórtala y compártela.
- **Varias personas en el mismo equipo**, cada una con su propio personaje, por turnos en el mismo chat.
- **Extensiones**: ajustes, aventuras, funciones y reglas de la casa.
- **Otros juegos**: más sistemas de juego, y los tuyos.

---

## 10. Preguntas y problemas <!-- icon: info -->

### Preguntas

**¿Necesito saber las reglas?** No. Elige el mentor tutorial y pregunta entre corchetes cuando quieras.

**¿Puede hacer trampas el máster?** No puede cambiar una tirada hecha por RPG Engine, salvo en dificultad historia, ni hechos ya establecidos.

**¿Cuesta algo?** RPG Engine es gratis. El máster funciona con el plan de tu agente, o en tu propio equipo con un modelo local. Una tarde de juego es un chat largo: en los planes más pequeños puedes llegar al límite del plan antes de que acabe la tarde. Las imágenes, las traducciones y las importaciones usan el mismo plan. RPG Engine nunca usa una clave de API, que se paga por llamada: inicia sesión en tu agente con tu cuenta, no con una clave.

**¿Puedo jugar en el móvil?** No: el máster funciona en tu equipo, y el panel solo se abre allí.

**¿Puedo jugar con amistades?** Todavía no: hoy hay una persona jugadora, un personaje y sus compañeros ([Próximamente](#9-coming-later)).

**¿Puedo usar otra IA la próxima vez?** Sí: abre la campaña en otro agente y escribe *continúa*.

### Problemas

**El panel no se abre.** Pregúntale al máster: `[¿Cuál es el enlace del panel?]`. Solo funciona mientras haya un chat abierto en esa campaña, después de la primera respuesta del máster.

**El máster no parece conocer el juego.** Tu agente no cargó RPG Engine. Comprueba que lo iniciaste en la carpeta de la campaña y que confiaste en ella. En Claude Code, escribe `/mcp` y vuelve a conectar `rpg`. En Codex, `codex mcp list` en la carpeta de la campaña debe mostrar `rpg`. Si `rpg --version` no se encuentra, instala RPG Engine de nuevo ([2.2](#22-install)).

**Actualizar.** Ejecuta `npm install -g rpg-engine` otra vez y abre un chat nuevo: un máster en marcha conserva la versión con la que empezó.

**El máster recuerda algo que deshice.** Abre un chat nuevo y pulsa **He abierto un chat nuevo** en Partidas guardadas.

**No aparecen imágenes.** Ajustes > Imágenes indica si este equipo puede crearlas y cómo.

**La instalación falla, o `rpg` no se inicia.** `node --version` debe indicar 22 o superior. En Windows, mantén RPG Engine y tus campañas fuera de rutas que contengan `&`.

**El enlace del panel cambió.** Otro programa ocupó la dirección habitual; el máster te da el enlace nuevo.
