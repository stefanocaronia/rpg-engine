<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: la guía completa

**RPG Engine** te permite jugar un juego de rol de mesa con una **IA como máster**. Juegas en el **Panel**, una ventana de tu equipo con tu ficha, los dados, los mapas, tu diario y el **chat** con el máster.

Esta guía te explica cómo jugar. La página explica sus propios botones: deja el puntero sobre uno para ver qué hace.

## Inicio rápido <!-- icon: send -->

1. Instala **Node.js** desde [nodejs.org](https://nodejs.org) (la versión LTS).
2. Abre una terminal nueva y escribe `npm install -g rpg-engine`. Si Windows dice que la ejecución de scripts está deshabilitada, escribe `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responde que sí e inténtalo de nuevo.
3. Escribe `rpg open`: pone el icono de RPG Engine en tu escritorio ([2.2](#22-installing)). A partir de entonces inicias RPG Engine desde el icono.
4. Pulsa **Nueva campaña**, ponle un nombre y pulsa **Crear** ([2.3](#23-a-new-campaign)).
5. En el chat, elige tu app de IA y su modelo ([2.4](#24-connect-your-ai)): Claude Code necesita un plan de pago de Claude; Codex, una cuenta de ChatGPT, gratuita o de pago. Pulsa **Abrir el chat** y luego **Empezar**.

La primera respuesta puede tardar un par de minutos. Después el máster te pregunta cómo quieres jugar, y creáis juntos tu personaje.

## 1. Qué es RPG Engine <!-- icon: about -->

| Quién | Qué hace |
|---|---|
| **Tú** | Juegas a tu personaje: lo que hace, dice e intenta. |
| **El máster** (la IA) | Cuenta la historia, interpreta a todos los demás, decide qué ocurre y pide tiradas. |
| **RPG Engine** | Guarda el mundo en archivos, tira los dados, cuenta los puntos de golpe, el dinero, el tiempo y las distancias, y mantiene los secretos hasta que los descubres. |

Así el mundo se mantiene igual de una tarde a otra, incluso en un chat nuevo, incluso con otra IA:

- **Lo que se ha dicho sigue siendo cierto.** Un villano muerto sigue muerto.
- **Los dados son reales.** El máster no puede cambiarlos, salvo en la dificultad más fácil.
- **Los secretos siguen siendo secretos.** El máster nunca te cuenta lo que tu personaje no sabe.
- **El mundo se mueve.** Las amenazas avanzan mientras descansas o viajas.
- **Una campaña es una carpeta** en tu equipo: para cuando quieras y sigue más tarde.

Un juego llega como un sistema de juego: hoy el nuestro es la **quinta edición**, del System Reference Document 5.1, que es gratuito. Sin sistema, juegas en libre, una historia sin números.

---

## 2. Primeros pasos <!-- icon: path -->

### 2.1 Qué necesitas

- Un equipo con Windows, macOS o Linux.
- **Node.js 24** o superior, desde [nodejs.org](https://nodejs.org).
- Una **terminal**, solo para instalar: en Windows, Terminal o PowerShell; en macOS, Terminal.
- Una **app de IA** para el máster, con tu propia cuenta ([2.4](#24-connect-your-ai)).

### 2.2 Instalar

```text
npm install -g rpg-engine
rpg open
```

La primera línea instala RPG Engine. Si npm se ofrece a actualizarse, puedes ignorarlo.

`rpg open` abre la ventana de RPG Engine. La primera vez, también pone un icono en tu escritorio y en tu menú: a partir de entonces inicias desde el icono. Para quitarlo, escribe `rpg icon --remove`.

Si la instalación falla, comprueba que `node --version` diga 24 o más. Si Windows dice que la ejecución de scripts está deshabilitada, escribe `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde que sí. En Windows, mantén RPG Engine y tus campañas fuera de rutas que contengan `&`.

### 2.3 Una campaña nueva

Pulsa **Nueva campaña** y ponle un **Nombre**, un **Idioma** y un **Sistema de juego**. El máster hace el resto contigo. Pulsa **Crear**: la campaña se abre en una ventana propia.

El máster y el Panel hablan el idioma de la campaña. El texto de las reglas de la quinta edición sigue en inglés, y el máster te lo cuenta en tu idioma.

La campaña es una carpeta con su nombre, dentro de la carpeta `RPG Engine` de tu carpeta de usuario. La próxima vez, haz clic en su tarjeta.

### 2.4 Conectar tu IA

El máster funciona en una **app de IA** de tu equipo, con tu cuenta. Un chat web como claude.ai o ChatGPT no basta: el máster necesita acceder a los archivos de la campaña.

- **Claude Code**: un plan de pago de Claude (Pro o superior).
- **Codex**: una cuenta de ChatGPT, gratuita o de pago.
- **OpenCode**: sin cuenta; algunos modelos gratuitos durante un tiempo limitado, o los de tu propio proveedor, incluidos los locales.
- **Antigravity**: una cuenta de Google; su uso gratuito tiene límites semanales.

En el chat, elige la app, su **Modelo** y el **Razonamiento del máster**. Si falta la app o no has iniciado sesión, un botón la instala, inicia tu sesión o abre su sitio. RPG Engine nunca ve tu contraseña.

Una tarde de juego es un chat largo: con los planes más pequeños puedes llegar al límite antes de que acabe la tarde. Juega con el modelo más grande que tengas: a un modelo pequeño es más fácil convencerlo de que revele secretos.

Jugamos y probamos RPG Engine sobre todo con **Claude Code**. Antigravity está **en prueba**: puede salirse del juego y guarda tus chats en una memoria que no se puede desactivar. Lo que escribes ahí va a Google, que puede hacer que personas lo lean. RPG Engine no es un producto de Google.

### 2.5 El primer chat

Pulsa **Abrir el chat** y luego **Empezar**. La primera respuesta puede tardar un par de minutos. Después, una campaña nueva pasa por tres etapas:

1. **Ajustes**: el máster te pregunta cómo quieres jugar, unas pocas preguntas cada vez: lo difícil que es el mundo, si puedes morir, cuándo puedes volver a una partida guardada. Escribe *decide tú* para que elija el máster. Todo se puede cambiar después.
2. **Sesión cero**: creas tu personaje con el máster, como en una mesa. RPG Engine hace las cuentas de la ficha. Si ya tienes un personaje, pega su ficha en el chat.
3. **Jugar**: el máster presenta la primera escena.

### 2.6 Jugar en tu app de IA

También puedes jugar en el chat propio de tu app de IA, en una terminal o en su app de escritorio, con el Panel al lado.

1. Abre una terminal en la carpeta donde guardas tus juegos: haz clic derecho en la carpeta y elige **Abrir en Terminal** (Windows) o **Servicios > Nueva Terminal en la carpeta** (macOS).
2. Escribe `rpg init "The Salt Isles"`: crea la carpeta `The Salt Isles` con una campaña nueva dentro.
3. Inicia tu app en esa carpeta: `claude`, `codex`, `agy` para Antigravity, u `opencode`. Responde que sí cuando pregunte si confías en la carpeta: en Claude Code la respuesta que aparece marcada es *No, exit*.
4. Escribe *¡Hola! Vamos a empezar.* El máster te da el enlace a tu Panel: ábrelo junto al chat.

Conviene saber:

- No abras los detalles de las herramientas que usa tu app (en Claude Code, ctrl+o): pueden mostrar secretos.
- En la app de escritorio de Codex, desactiva las memorias para los chats del juego.
- Si el máster no conoce el juego, escribe `rpg init` en la carpeta de la campaña y abre un chat nuevo.
- Si Windows no encuentra `claude`, añade al PATH la carpeta que nombró su instalador y luego abre una terminal nueva.
- Una campaña la juega un solo chat a la vez: mientras el tuyo está abierto, el chat del Panel espera.

---

## 3. Cómo se juega <!-- icon: chat -->

### 3.1 Hablar con el máster

Escribe lo que hace o dice tu personaje:

> Le pregunto al posadero quién más ha pasado por aquí esta noche.

Tú dices lo que intentas; el máster dice lo que pasa. Nunca decide por tu personaje.

Fuera de la historia, escribe `[OOC: …]` (fuera de personaje): *[OOC: ¿Cómo funciona el agarre?]* Puedes preguntarle al máster las reglas o cómo funciona el Panel.

Cuando el máster te pregunte algo, responde con sus botones o con tus propias palabras. También puedes actuar desde tu ficha: haz clic en un arma, un conjuro o un objeto, y elige qué hacer.

**Órdenes permanentes**: di a tus compañeros algo que deba durar, como *A partir de ahora, deja siempre a uno con vida*. El máster lo mantiene hasta que tú lo retires.

### 3.2 Tiradas

El máster pide una tirada solo cuando el resultado es incierto e importa. Un aviso muestra la tirada: haz clic en él y los dados caen.

Los dados son de RPG Engine, no del máster. Siempre puedes preguntar *[¿Esa tirada fue real?]*: incluso si la tirada era secreta, el máster puede probar que se hizo antes de que preguntaras.

Con el ajuste **Dados** en físicos, tira tus propios dados y escribe el resultado: *[He sacado un 14.]* Las tiradas que haces por diversión, desde tu ficha o con **Tirada libre**, nunca cuentan.

### 3.3 Escenas, combates y viajes

La historia avanza en **escenas**: un combate, una conversación, un viaje, un descanso. Al final de cada escena la partida se guarda sola, y la escena pasa a tu diario.

En un combate, el máster juega todos los turnos que no son tuyos y se detiene cuando tienes que decidir.

Di adónde vas, *Tomamos el camino del norte hacia Rocca*: RPG Engine calcula la distancia y los días, y se detiene si ocurre algo por el camino. Mientras tanto, los planes de los villanos siguen su curso, y ves sus señales.

### 3.4 Partidas guardadas

RPG Engine guarda la campaña al final de cada escena. El ajuste **Partidas guardadas** decide cuándo puedes volver atrás:

- **Muerte permanente**: nunca.
- **Punto de control**: a la última partida guardada, solo cuando tu personaje muere.
- **Libre**: a cualquier partida guardada, y puedes guardar cuando quieras.

En todos los modos puedes empezar de nuevo, en el chat o en **Partidas guardadas**.

Después de volver atrás, abre un chat nuevo, porque el anterior recuerda lo que se deshizo:

1. Pulsa **Cerrar el chat** y luego **Nuevo chat**. En el chat propio de tu app de IA, abre una conversación nueva (`/clear` en Claude Code).
2. Escribe *Continuar*.
3. Pulsa **He abierto un chat nuevo** en Partidas guardadas. Hasta entonces el máster espera.

### 3.5 Parar y volver

Para cuando quieras: todo está ya guardado. Cierra la ventana del Panel y, poco después, el juego se detiene. No se pierde nada.

Para volver, abre RPG Engine desde su icono y haz clic en tu campaña. Pulsa **Reanudar el chat** y luego **Retomar la historia**: el máster te cuenta dónde estabas y sigue. La próxima vez también puedes elegir otra app de IA.

### 3.6 Límites y stop

Las **líneas** nunca aparecen en el juego; los **velos** ocurren solo fuera de escena. Los defines en **Ajustes**.

En cualquier momento escribe *[stop]*: el máster abandona ese contenido y lo añade a tus líneas.

### 3.7 Imágenes

El máster puede hacer que se creen imágenes de lugares, misiones y personajes, según indique el ajuste **Imágenes**, y un retrato de tu personaje cuando lo pides. Tu app de IA las crea, con tu plan. Si no aparece ninguna, **Ajustes** indica si este equipo puede crearlas.

También puedes poner a tu personaje, o a una página del mundo, una imagen tuya, desde la propia página.

---

## 4. El panel <!-- icon: party -->

La ventana donde ves tu juego. Muestra solo lo que sabe tu personaje.

- **Rol**: el chat con el máster, cuando no está junto a la página.
- **Grupo**: tu ficha, las de tus compañeros y las tiradas.
- **Escena**: dónde estás, quién está allí y el mapa; en un combate, los turnos.
- **Diario**: misiones, la historia como libro, los diarios de tus compañeros y tus notas.
- **Mundo**: el mapa del mundo, lo que sabe tu personaje, los documentos encontrados y el calendario.
- **Partidas guardadas**: volver atrás y empezar de nuevo.
- **Ajustes**: cómo juegas y cómo se ve la página.
- **Paquetes**: el sistema de juego, las extensiones, tus manuales y las actualizaciones: cuando sale un RPG Engine nuevo, lo dice aquí.

Si la página dice que no está conectada, pulsa **Reabrir la campaña**.

Para jugar desde el móvil, en casa: en **Ajustes**, **Panel**, activa **Acceso desde el móvil** y enfoca el código con el móvil, en la misma wifi que el equipo. Windows puede preguntar si Node.js puede usar la red: permítelo en redes privadas y configura la wifi como red privada. El juego viaja sin cifrar: úsalo solo en una red de confianza, como la de tu casa; nunca en una wifi pública, de hotel o de oficina. Desactívalo cuando termines: el juego se acaba con la última ventana del equipo.

Si un tema hace que la página sea difícil de leer, añade `#/settings/page` al final de su dirección y desactiva **Estilo propio del tema**.

---

## 5. Reglas, manuales y extensiones <!-- icon: dice -->

Un **Sistema de juego** son los datos de un juego: la ficha, las criaturas, los objetos, los conjuros y las reglas. RPG Engine calcula la ficha. Cómo se aplica una regla lo lee y lo decide el máster, como en una mesa.

**Quinta edición** incluye las reglas gratuitas del System Reference Document 5.1. También puedes jugar con contenido de un libro que tengas: el máster lo escribe en tu campaña.

**Tus manuales**: dile al máster dónde están, o añade su carpeta en **Paquetes**. El máster consulta las reglas en ellos y cita el libro y la página. RPG Engine nunca los cambia ni los copia en una campaña.

**Reglas de la casa**: pídele al máster, *[Regla de la casa: un 1 natural en un ataque significa que se te cae el arma.]* El máster guarda la regla. Una decisión que toma una vez vale también la próxima vez.

Las **Extensiones** añaden algo al juego, como el clima. Añádelas en **Paquetes** o pídeselo al máster.

---

## 6. Tu propia aventura <!-- icon: world -->

Si no hay un mundo escrito, el máster construye uno a partir de tu premisa y lo conserva.

Para jugar una aventura o un libro que tengas, dale el archivo al máster: *[Importa esta aventura como nuestra campaña: D:\Books\adventure.pdf. No me cuentes nada de lo que contiene.]* Un archivo que está fuera de la campaña solo se lee después de tu sí. Se lee mejor como texto, EPUB, Word o un PDF cuyo texto se pueda seleccionar.

El documento completo va a la empresa de la IA que lo lee. Una campaña se juega una sola vez: para volver a jugar la misma aventura, crea una campaña nueva.

---

## 7. Tus datos <!-- icon: lock -->

- Una campaña es una carpeta. Guarda los secretos de la campaña y también tus chats con el máster: nunca necesitas abrirla.
- RPG Engine lee y escribe solo en esa carpeta. Tus manuales solo los lee. Cualquier otra cosa fuera de la campaña, solo después de tu sí, en una ventana de tu equipo.
- En el chat del dashboard, el máster no abre ninguno de tus archivos por su cuenta.
- Lo que escribes va a la empresa cuyo modelo hace de máster, bajo las condiciones de tu cuenta. Con un modelo local, se queda en tu equipo.
- Un sistema de juego o una extensión que no sea nuestra es código que se ejecuta en tu equipo: solo se instala con tu sí. Di que sí solo a autores de confianza.
- Si la carpeta de la campaña es un repositorio git, **Ajustes** puede hacer el commit por ti. Permite que entren tus chats solo si el repositorio es privado.
- Con **Acceso desde el móvil** activado, el juego va sin cifrar del equipo al móvil por tu red doméstica, sin pasar por ningún servicio externo: quien esté en esa red podría leerlo.
