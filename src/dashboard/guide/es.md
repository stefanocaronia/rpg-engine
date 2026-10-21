<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
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
| **RPG Engine** | Guarda el mundo en archivos, tira los dados, cuenta los puntos de golpe, el dinero, el tiempo y las distancias, y mantiene los secretos hasta que los descubras. |

El mundo es el mismo de una tarde a otra, incluso en un chat nuevo, incluso con otra IA:

- **Lo que se ha dicho sigue siendo cierto.** Un villano muerto sigue muerto.
- **Los dados son de verdad.** El máster no puede torcerlos, salvo en la dificultad más fácil, si la eliges.
- **Los secretos siguen siendo secretos.** El máster nunca te cuenta lo que tu personaje no sabe.
- **El mundo se mueve.** Las amenazas avanzan mientras descansas o viajas, y ves sus señales.
- **Una campaña es una carpeta** en tu equipo: para cuando quieras y retómala más tarde.

Hoy RPG Engine juega con un solo sistema de juego, la **quinta edición**, a partir del Documento de Referencia del Sistema 5.1, que es gratuito. Vendrán otros ([Próximamente](#9-coming-later)).

---

## 2. Primeros pasos <!-- icon: path -->

### 2.1 Qué necesitas

- Un equipo con Windows, macOS o Linux, y un navegador web.
- **Node.js 22** o superior, desde [nodejs.org](https://nodejs.org). Incluye `npm`, que instala RPG Engine.
- Una **terminal**: en Windows, Terminal o PowerShell; en macOS, Terminal. Para abrir una en una carpeta, haz clic derecho en la carpeta y elige **Abrir en Terminal** (Windows) o **Servicios > Nueva terminal en la carpeta** (macOS).
- Un **agente de IA** para el máster ([2.4](#24-connect-your-ai)), con el **modelo más grande** que ofrezca: a un modelo pequeño es más fácil convencerlo de que revele secretos o se salte las reglas.

### 2.2 Instalar

```text
npm install -g rpg-engine
```

`rpg --version` comprueba que todo ha ido bien. Usas `rpg` una vez por campaña, para crearla; después, tu agente inicia RPG Engine por sí solo.

### 2.3 Crear una campaña

Abre una terminal en la carpeta donde guardas tus juegos ([2.1](#21-what-you-need) explica cómo):

```text
rpg init "The Salt Isles"
```

Esto crea la carpeta `The Salt Isles` con una campaña nueva dentro; entra en ella con `cd "The Salt Isles"`. Recuerda dónde está: volverás a ella cada vez que juegues. Todo lo demás lo eliges después, en el chat o en el panel; `rpg init --help` muestra las opciones para elegir algunas ya, como `--language it` o `--difficulty hard`.

El máster no puede crear una campaña por ti: antes de `init`, nada le dice a tu agente dónde está RPG Engine.

### 2.4 Conectar tu IA

El máster funciona dentro de un **agente de IA**: una aplicación de IA, en la terminal o en el escritorio, que puede trabajar con los archivos de tu equipo, como Claude Code o Codex. Un chat normal como claude.ai o ChatGPT, o una aplicación del móvil, no basta: el máster necesita acceder a los archivos de la campaña en tu equipo. Cada agente necesita su propio plan y su propio inicio de sesión: Claude Code, un plan de pago de Claude; Codex, un inicio de sesión de ChatGPT. Se instala una sola vez, desde su propia página: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: en la carpeta de la campaña escribe `claude`. Cuando pregunte si confías en la carpeta, elige **Yes, I trust this folder**; ojo, la respuesta que aparece seleccionada es *No, exit*.
- **Codex**: en la carpeta de la campaña escribe `codex` y responde que sí cuando pregunte si confías en la carpeta. En su aplicación de escritorio, comprueba en los ajustes que las memorias estén desactivadas para los chats del juego.
- **Otro agente**: inícialo en la carpeta de la campaña y dale el servidor MCP `rpg mcp`. RPG Engine es un servidor MCP estándar: cualquier agente compatible con MCP puede ser el máster, también los locales.

Jugamos y probamos con **Claude Code**; **Codex** está conectado y comprobado, pero aún no se ha jugado ninguna campaña completa con él; `init` también prepara **Gemini CLI**. La campaña desactiva la memoria propia del agente: la partida vive en sus archivos, para que volver a una partida guardada sea volver de verdad.

### 2.5 El primer chat

Escribe lo que quieras, por ejemplo *¡Hola! Empecemos.* En su primera respuesta de cada chat, el máster te da el **enlace a tu panel**, algo como `http://127.0.0.1:4750`: ábrelo y mantenlo junto al chat.

Entre los mensajes del máster, tu agente muestra las herramientas que usa: no abras sus detalles (en Claude Code, ctrl+o), pueden mostrar secretos.

Una campaña nueva pasa por tres etapas, que aparecen en la parte superior del panel: **1 Ajustes** (cómo quieres jugar), **2 Sesión cero** (creas tu personaje, jugando), **3 Juego**.

### 2.6 Ajustes: elegir cómo juegas

El máster solo pregunta lo que aún falta, unas pocas preguntas cada vez; el paso **Ajustes** del panel muestra las mismas preguntas como tarjetas. Escribe "decide tú" y el máster elige. Todo se puede cambiar después, en el chat o en **Ajustes**.

| Ajuste | Qué decide | Valores |
|---|---|---|
| **Mentor** | Cuánto te enseña el máster las reglas | off, hints, tutorial |
| **Dificultad** | Lo duro que es el mundo | story, easy, normal, hard, brutal |
| **Letalidad** | Qué significa caer en un combate | narrative (nunca mueres), epic (solo cuando importa), dice |
| **Partidas guardadas** | Cuándo puedes volver atrás | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Rigor** | Con qué precisión siguen las reglas la comida, la luz y los viajes | smooth, rules, simulation |
| **Dados** | Quién tira tus dados | digital, physical |
| **Unidades** | Distancias y pesos | metric, imperial |
| **Voices** | Quién habla por los personajes que conoces: en los momentos clave, el propio personaje, que solo sabe lo que sabe él, según elija el máster; siempre el máster; o siempre el propio personaje, para los principales o para todos, más lento y más caro, donde tu aplicación de IA lo permita | auto, master, important, always |
| **Compañeros** | Quién viaja contigo | none, made with you, made by the master, met in play |
| **Imágenes** | Imágenes de lugares, misiones y de quienes conoces | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Líneas** y **Velos** | Lo que nunca aparece y lo que ocurre solo fuera de escena | listas |
| **Idioma** | El idioma del juego y del panel | cualquiera |

La quinta edición añade el **avance**: puntos de experiencia o hitos.

Si no hay un mundo escrito, el máster también pregunta una **premisa** (género, tono, algunos elementos, con tus palabras) y la **preparación**: crear el mundo sobre la marcha, mientras juegas, o todo al principio.

**El estilo del máster** no se pregunta nunca, pero puedes cambiarlo en el chat o en **Ajustes**: la **prosa** (sencilla, literaria, pulp, irónica), las **historias** que inventa (situaciones, arcos, episodios, misterio), un autor con quien **escribir al estilo**, o cualquier otra cosa **con tus palabras**.

### 2.7 Sesión cero: tu personaje

Creas tu personaje con el máster, como en una mesa de juego. Cada decisión es tuya, salvo que le pidas al máster que la tome: puedes llegar con una idea completa, una vaga o con nada. El máster te explica cómo se generan las puntuaciones de característica antes de tirar ningún dado. Tu historia nunca es obligatoria; si aportas una, el máster la escribe con tus palabras. Después, el máster te pide una imagen de tu personaje ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcula la ficha: nunca haces las cuentas.

---

## 3. Jugar <!-- icon: chat -->

### 3.1 Hablar con el máster

Escribe lo que hace o dice tu personaje, con tus propias palabras:

> Le pregunto al posadero quién más pasó por aquí esta noche.

Para hablar fuera de la historia, escribe entre corchetes: *[¿Cómo funciona el agarre?]* El máster también responde entre corchetes.

Tú dices lo que intentas; el máster dice lo que ocurre. El máster nunca decide por tu personaje y nunca habla del motor del juego. Puedes preguntarle cómo usar el panel.

### 3.2 Tiradas

El máster pide una tirada solo cuando el resultado es incierto e importa, y antes dice qué está en juego. Después:

- **En el panel**, un aviso muestra un botón para cada prueba, como *Acrobacias +4 · con ventaja*. Haz clic en él: los dados caen en la página y el máster ve el resultado. También puedes hacer clic en la línea de tu ficha que se ilumina, tirar los dados desde la bandeja de dados o escribir otra cosa en el aviso.
- **Manual**, en la esquina del aviso o en **Ajustes**: el aviso te dice qué tirar, y tú lo tiras desde tu ficha o desde la bandeja de dados.
- **Dados físicos**, con el ajuste de dados en físicos: escribes las caras que sacaste, *[He sacado un 14.]*, y RPG Engine suma tus modificadores.

**Tiradas libres**: haz clic en cualquier número de tu ficha, o abre la bandeja de dados, para tirar por diversión. Nunca cuentan y el máster nunca las ve.

**Las tiradas del máster** aparecen en tu columna de tiradas, salvo las secretas. Siempre puedes preguntar *[¿Esa tirada fue real?]*: en una tirada secreta, el máster te da una huella digital que prueba que se hizo antes de que preguntaras.

### 3.3 Escenas y combates

La historia avanza en **escenas**: un combate, una conversación, una exploración, un viaje, un descanso. Al final de cada escena el juego guarda la partida solo, y la escena pasa a tu diario.

En un combate, el máster narra cada turno que no es tuyo y se detiene cuando puedes decidir. **Escena** muestra arriba de quién es el turno y quién sigue, y la tarjeta de tu personaje junto al mapa. El orden de los turnos, los puntos de golpe de tu grupo y lo heridos que parecen los enemigos, dicho con palabras, quedan al lado de la página. Si tu personaje cae, las tiradas de salvación contra la muerte aparecen en grande en la página.

### 3.4 Tiempo, viajes y el mundo que se mueve

RPG Engine lleva la cuenta de la fecha; entre sesiones no pasa el tiempo. Di que descansas, *Hacemos un descanso largo*, y el descanso devuelve lo que debe. Di adónde vas, *Tomamos el camino del norte hacia Rocca*, y RPG Engine calcula la ruta, la distancia y los días, y se detiene si ocurre algo por el camino. El dinero se cuenta en las monedas del juego, cambio incluido.

Los villanos tienen planes con plazos. Cada día nuevo, el máster mueve las amenazas a las que el tiempo ha hecho avanzar, y tú ves sus señales, nunca el reloj.

### 3.5 Mapas

**Mundo** muestra los lugares que conoce tu personaje, los caminos entre ellos y el rastro de tu recorrido, con niebla sobre el resto. **Escena** muestra el mapa del lugar donde estás, si lo tiene, con quién está dónde; en un combate, en tu turno, las casillas a las que no llegas aparecen veladas. Cuando el máster pregunta adónde te mueves, toca una casilla o escríbela, por ejemplo *E4*.

### 3.6 Misiones, diario y notas

Una tarea que asume tu personaje se convierte en una misión en el **Diario**, con sus objetivos, su plazo y lo que mide. Márcala con una estrella para tenerla a la vista arriba en Escena. El Diario también cuenta tu **historia**, escena por escena, y guarda tus **notas**: son privadas, salvo que las **Compartas**; entonces el máster las oye como lo que piensas, nunca como un hecho.

### 3.7 La historia y la imagen de tu personaje

En tu ficha, la tarjeta **Descripción** tiene un cuadro para la historia de tu personaje: el máster la escribe ahí, después de que le des tu permiso. Para una imagen, dale al máster un archivo (PNG, JPEG, WebP o SVG, de hasta 5 MB) junto con su ubicación en tu equipo, o pide que se haga un retrato ([3.11](#311-pictures)): *[Hazme un retrato: pelo gris con trenza y una cicatriz en la barbilla.]*

### 3.8 Partidas guardadas y volver atrás

RPG Engine guarda toda la campaña al final de cada escena. El ajuste de **partidas guardadas** decide el resto:

| Partidas guardadas | Guardar cuando quieras | Volver atrás |
|---|---|---|
| **muerte permanente** | no | nunca |
| **punto de control** | no | a la última partida guardada, solo cuando tu personaje muere |
| **libre** | sí | a cualquier partida guardada |

En todos los modos puedes **empezar de nuevo**, desde el inicio del juego o desde la sesión cero. Hazlo en el chat o en **Partidas guardadas**.

Después de volver atrás, **abre un chat nuevo**: el chat anterior recuerda lo que se deshizo. Escribe *continuar* en el chat nuevo y luego pulsa **He abierto un chat nuevo** en Partidas guardadas.

### 3.9 Sesiones: parar y volver

Para cuando quieras: *[Paremos aquí por esta noche.]* Todo ya está guardado en los archivos. Para volver, inicia tu agente en la carpeta de la campaña y escribe *continuar*: el máster te da un breve resumen y sigue.

### 3.10 El ánimo del máster

El robot que está arriba en el panel es el máster: su cara sigue el tono de la historia y nunca revela lo que aún no sabes. Cuando el chat está cerrado, duerme.

### 3.11 Imágenes

RPG Engine puede crear imágenes de los lugares a los que llegas, de las misiones que asumes y de los personajes que encuentras, según lo que indique el ajuste de **imágenes**, y el retrato de tu personaje cuando lo pidas. Usa lo que hay en tu equipo, con tu propio inicio de sesión: **Codex** las pinta y, si no, **Claude Code** las dibuja. **Ajustes** indica si este equipo puede crearlas y, si no, cómo prepararlo. Siempre puedes darle al máster una imagen tuya.

### 3.12 Seguridad: líneas, velos y stop

Las **líneas** nunca aparecen en el juego; los **velos** ocurren solo fuera de escena. En cualquier momento escribe *[stop]*: el máster abandona ese contenido al instante y lo añade a tus líneas.

### 3.13 Cambiar de idea

Todos los ajustes se pueden cambiar, en el chat o en **Ajustes**. Una decisión que el máster toma sin el libro de reglas se convierte en un **precedente**, y así la misma pregunta recibe la misma respuesta la próxima vez.

---

## 4. El panel <!-- icon: party -->

Una página en tu propio equipo, que solo se abre en el navegador de ese equipo y está activa mientras el chat está abierto. Cuando el chat se cierra, muestra *Sin conexión*; vuelve sola con el siguiente chat.

- **Grupo**: tu ficha y las de tus compañeros. Haz clic en un número para tirarlo; pasa el cursor por encima para ver de dónde sale. Al lado, las tiradas.
- **Escena**: dónde estás, su imagen y su mapa, quién está allí, qué ocurre; en un combate, los turnos y la tarjeta de tu personaje.
- **Diario**: misiones, la historia, tus notas.
- **Mundo**: el mapa del mundo tal como lo conoce tu personaje.
- **La bandeja de dados**: elige los dados y un modificador, y tira.
- **Partidas guardadas**, **Ayuda**, **Ajustes** y **Acerca de**, como iconos al final de la fila. Ajustes también guarda las preferencias propias de la página: tema, sonido de los dados, juego de dados.

Cuando el máster te pregunta algo, su aviso se queda arriba, en la sección en que estés.

---

## 5. Sistemas de juego y reglas de la casa <!-- icon: dice -->

### 5.1 Qué es un sistema de juego

Los datos de un juego: su ficha, sus números, sus criaturas, objetos, conjuros y el texto de sus reglas. Cada campaña juega con un sistema. RPG Engine calcula la ficha y lo que se gasta y lo que se recupera; cómo funciona un rasgo, lo lee el máster en las reglas y lo decide, como en una mesa.

### 5.2 Quinta edición, incluida

Las razas, las clases, las subclases, un trasfondo y una dote del SRD 5.1; los 319 conjuros, las armas, armaduras, objetos mágicos y monstruos; los capítulos de reglas, que el máster lee por su texto exacto; la ficha completa, calculada.

También puedes jugar contenido que el SRD no tiene, de un libro que poseas: el máster lo escribe como páginas de tu campaña, y RPG Engine las trata como propias. RPG Engine incluye solo contenido abierto; lo que sabe tu máster no tiene ese límite.

### 5.3 Reglas de la casa y tus propias añadiduras

Pídeselo al máster: *[Regla de la casa: un 1 natural en un ataque significa que sueltas el arma.]* El máster la guarda como un acuerdo de la mesa, o escribe una página o un número de la ficha cuando hace falta. Las reglas de la casa que ya estén escritas pueden ir como archivos de texto en la carpeta `rules` de la campaña.

### 5.4 Añadir o importar tu propio sistema de juego

Todavía no: hoy RPG Engine juega solo con la quinta edición ([Próximamente](#9-coming-later)).

---

## 6. Extensiones <!-- icon: plus -->

Todavía no. Una extensión añadirá algo a una campaña además de su sistema de juego: un mundo, una aventura, una función como el clima, reglas de la casa para compartir.

---

## 7. De dónde viene una campaña y su idioma <!-- icon: world -->

### 7.1 Tres formas de tener un mundo

- **Creado sobre la marcha**: a partir de tu premisa, el máster construye cada lugar, persona y trama justo antes de que lo necesites, y lo conserva.
- **Preparado al principio**: lo mismo, con el mundo construido antes de jugar.
- **A partir de tu propia aventura**: dale al máster un texto o un PDF y pídele que lo prepare, *[Prepara esta aventura como nuestra campaña. No me cuentes nada de lo que contiene.]* El máster escribe los lugares, los personajes y los secretos. Todavía no hay un botón de importación.

Una campaña se juega una sola vez: para jugar otra vez la misma aventura, crea una campaña nueva.

### 7.2 Idiomas

Un idioma por campaña, el del máster, que el panel sigue. El panel incluye 26 idiomas. Cualquier otro lo traduce en tu equipo Codex o Claude Code o, sin ellos, el máster en el chat. Los términos de la quinta edición en italiano proceden del SRD oficial en italiano; el texto de las reglas sigue en inglés, y el máster lo cuenta en tu idioma.

---

## 8. Para curiosos: la carpeta de la campaña <!-- icon: list -->

No necesitas abrirla nunca, y guarda los secretos de tu campaña. Contiene `campaign.yaml` (tus ajustes), `state.yaml` (cómo va el juego), `world/` (una página markdown por cada personaje, lugar, misión y el resto), `rules/` (tus reglas de la casa), `images/`, `log.jsonl` (cada cambio), `.saves/`, `.player/` (tus notas) y los archivos pequeños que indican a los agentes de IA dónde está RPG Engine. Las páginas usan el formato de Obsidian. Si cambias una página a mano, el máster lo sabrá en su siguiente respuesta.

RPG Engine se queda en esta carpeta: solo lee y escribe la partida aquí, y nunca toca tus otros archivos. Fuera de ella, solo guarda una carpeta de datos propia (las traducciones del panel, y Codex o Claude Code si dejas que los instale) y carpetas temporales mientras se dibuja una imagen. Para cualquier otra cosa que tu agente quiera hacer en tu equipo, antes te lo pregunta.

Todos los comandos que usa el máster se pueden ejecutar también en la carpeta de la campaña: `rpg --help` los enumera. Muchos muestran los secretos de la campaña.

---

## 9. Próximamente <!-- icon: hourglass -->

- **Tú como máster**, con la IA interpretando al grupo.
- **Modo autor**: escribe una aventura con la IA, luego expórtala y compártela.
- **Varias personas en el mismo equipo**, cada una con su propio personaje, por turnos en el mismo chat.
- **Extensiones**: ajustes, aventuras, funciones y reglas de la casa.
- **Importar** tus manuales y aventuras.
- **Otros juegos**: más sistemas de juego, y los tuyos.

---

## 10. Preguntas y problemas <!-- icon: info -->

### Preguntas

**¿Necesito conocer las reglas?** No. Elige el mentor en modo tutorial y pregunta entre corchetes cuando quieras.

**¿Puede el máster hacer trampa?** No puede cambiar una tirada que haya hecho RPG Engine, salvo en la dificultad historia, ni hechos ya establecidos.

**¿Cuesta algo?** RPG Engine es gratuito. El máster se ejecuta con el plan de tu agente, o en tu propio equipo con un modelo local. Una tarde de juego es un chat largo: en los planes más pequeños puedes alcanzar el límite del plan antes de que acabe la tarde. Las imágenes y las traducciones usan el mismo plan.

**¿Puedo jugar en el móvil?** No: el máster se ejecuta en tu equipo, y el panel solo se abre allí.

**¿Puedo jugar con amistades?** Todavía no: hoy hay una persona jugando, un personaje y sus compañeros ([Próximamente](#9-coming-later)).

**¿Puedo usar otra IA la próxima vez?** Sí: abre la campaña en otro agente y escribe *continuar*.

### Problemas

**El panel no se abre.** Pregúntale al máster: `[¿Cuál es el enlace del panel?]`. Solo funciona mientras hay un chat abierto en esa campaña, después de la primera respuesta del máster.

**El máster no parece conocer el juego.** Tu agente no cargó RPG Engine. Comprueba que lo iniciaste en la carpeta de la campaña y que confiaste en ella. En Claude Code, escribe `/mcp` y vuelve a conectar `rpg`. En Codex, `codex mcp list` en la carpeta de la campaña debe mostrar `rpg`. Si no se encuentra `rpg --version`, instala RPG Engine de nuevo ([2.2](#22-install)).

**Actualizar.** Ejecuta `npm install -g rpg-engine` otra vez y luego abre un chat nuevo: un máster que ya está en marcha conserva la versión con la que empezó.

**El máster recuerda algo que deshice.** Abre un chat nuevo y pulsa **He abierto un chat nuevo** en Partidas guardadas.

**No aparece ninguna imagen.** Ajustes > Imágenes indica si este equipo puede crearlas, y cómo.

**La instalación falla, o `rpg` no se inicia.** `node --version` debe indicar 22 o superior. En Windows, mantén RPG Engine y tus campañas fuera de rutas que contengan `&`.

**El enlace del panel ha cambiado.** Otro programa ha ocupado la dirección habitual; el máster te da el enlace nuevo.
