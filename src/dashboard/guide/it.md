<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 d32a17eb 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: la guida completa

**RPG Engine** ti permette di giocare a un gioco di ruolo da tavolo con una **IA come master**.

Parli con il master in una **chat**: il master racconta la storia, interpreta tutti gli altri e decide l'esito di ciò che accade.

RPG Engine lavora dietro le quinte: **ricorda il mondo**, **tira i dadi** e **tiene i conti**.

Accanto alla chat tieni aperta nel browser una pagina, la **dashboard**, con la scheda del tuo personaggio, i dadi, le mappe e il tuo diario.

Questa guida è per chi gioca: non serve saper programmare.

## Avvio rapido <!-- icon: send -->

1. Installa **Node.js** da [nodejs.org](https://nodejs.org) (la versione LTS).
2. Installa **Claude Code** o **Codex**, l'app di IA in cui gira il master, e accedi ([2.4](#24-connect-your-ai)).
3. Apri un terminale e installa RPG Engine: `npm install -g rpg-engine`.
4. Nel terminale, crea una campagna: `rpg init "The Salt Isles"`.
5. Apri Claude Code o Codex nella nuova cartella e scrivi *Ciao! Cominciamo.* Il master risponde con il link della tua dashboard: aprila accanto alla chat.

Il resto della guida spiega ogni passo e poi come si gioca.

## 1. Cos'è RPG Engine <!-- icon: about -->

### Chi fa cosa

| Chi | Cosa fa |
|---|---|
| **Tu** | Giochi il tuo personaggio. Dici cosa fa, dice e tenta. |
| **Il master** (l'IA) | Racconta la storia, interpreta ogni altro personaggio, decide cosa succede, chiede i tiri. |
| **RPG Engine** | Ricorda tutto nei file, tira i dadi, conta punti ferita, denaro, tempo e distanze, tiene i segreti finché non li scopri. |

Un'IA è brava a raccontare storie e scarsa a ricordare. Lasciata sola, dimentica chi ti deve dei soldi, quante frecce hai o che il ponte è bruciato due sessioni fa. RPG Engine tiene traccia di tutto questo, così il mondo resta lo stesso da una sera all'altra, anche in una chat nuova, anche con un'IA diversa.

### Che effetto fa

Scrivi nella chat, come parleresti a un tavolo:

> Spingo la porta piano e guardo dentro.

Il master risponde con ciò che vedi e si ferma quando tocca a te scegliere. Quando qualcosa è incerto e conta, il master dice cosa è in gioco e chiede un tiro. I pulsanti del tiro compaiono sulla dashboard. Clicchi, i dadi cadono sulla pagina e il master ti dice cosa succede.

### Cosa lo rende diverso

- **Il mondo è persistente.** Ciò che è stato detto resta vero. Un cattivo morto resta morto.
- **I dadi sono veri.** Il master non può piegarli (tranne alla difficoltà più facile, se la scegli).
- **I segreti restano segreti.** Il master non ti dice mai ciò che il tuo personaggio non sa, nemmeno se insisti.
- **Il mondo si muove anche senza di te.** Le minacce avanzano mentre riposi o viaggi, e ne vedi i segni.
- **Tante sere, una sola storia.** Una campagna è una cartella sul tuo computer. Puoi fermarti quando vuoi e riprendere più tardi.

### Il gioco che usa oggi

RPG Engine è pensato per qualsiasi gioco di ruolo da tavolo. Oggi include un solo sistema di gioco: la **quinta edizione** (dal System Reference Document 5.1, gratuito). Ne arriveranno altri; vedi [Sistemi di gioco](#5-game-systems-and-house-rules) e [In arrivo](#9-coming-later).

---

## 2. Per iniziare <!-- icon: path -->

### 2.1 Che cosa ti serve

- Un computer con Windows, macOS o Linux.
- **Node.js 22** o più recente. Scaricalo da [nodejs.org](https://nodejs.org): va bene la versione "LTS". Include `npm`, che installa RPG Engine.
- Un **terminale**, la finestra in cui scrivi i comandi: su Windows, l'app Terminale o PowerShell; su macOS, Terminale. Ti serve per installare RPG Engine, per creare ogni campagna e per avviare Claude Code o Codex.
- Un **host AI**, l'app in cui gira il master: **Claude Code** o **Codex**, con il suo piano e il suo login. Vedi [2.4](#24-connect-your-ai).
- Il **modello più grande** che il tuo host offre. Un modello piccolo si lascia ingannare: nei nostri test ha rivelato dei segreti a un giocatore che diceva di essere il vero master.
- Un browser, per la dashboard.

Il login che usi per l'host serve anche ad altro: RPG Engine lo usa, sul tuo computer, per disegnare immagini di luoghi, missioni, persone che incontri e del tuo personaggio, e per tradurre la dashboard in lingue che non include. Vedi [Immagini](#311-pictures) e [Lingue](#72-languages).

**Aprire un terminale in una cartella.** Molti passaggi dicono "nella cartella della campagna". Su Windows, fai clic destro sulla cartella in Esplora file e scegli **Apri nel terminale**. Su macOS, fai clic destro sulla cartella nel Finder e scegli **Servizi > Nuovo Terminale nella cartella**. Oppure, in un terminale già aperto, scrivi `cd` e il percorso della cartella, per esempio `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installazione

Apri un terminale e scrivi:

```text
npm install -g rpg-engine
```

Così ottieni il comando `rpg`. Per controllare che abbia funzionato:

```text
rpg --version
```

Userai `rpg` una volta per campagna, per crearla. Dopo, parli solo con il master: il tuo host AI avvia RPG Engine da solo, con lo stesso comando `rpg`.

### 2.3 Creare una campagna

Una campagna è una cartella. Apri un terminale nella cartella dove tieni i tuoi giochi e scrivi:

```text
rpg init "The Salt Isles"
```

Questo crea la cartella `The Salt Isles` con dentro una campagna nuova, e ti dice cosa fare dopo:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Le righe dopo *For the master* sono per il master, che le legge nella chat: tu non devi farci nulla. Ricorda dov'è la cartella: ci torni ogni volta che giochi. Senza un nome di cartella, `rpg init` trasforma in campagna la cartella in cui ti trovi.

`init` crea tutto ciò che serve alla campagna: le impostazioni, le cartelle del mondo e i piccoli file che dicono al tuo host AI di usare RPG Engine e di non tenere memoria propria fuori dalla campagna.

Non devi scegliere nulla adesso. Il master ti chiede il resto nella chat, oppure scegli tu nella dashboard. Se hai già in mente qualche scelta, puoi indicarla qui:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Questo crea la cartella `salt-isles`, con dentro la campagna *The Salt Isles*: un nome di cartella senza spazi e il nome della campagna come preferisci.

| Opzione | Che cosa imposta | Valori |
|---|---|---|
| `--name` | Il nome della campagna | qualsiasi; se lo ometti, il nome della cartella |
| `--language` | La lingua del gioco | un codice, come `en`, `it`, `fr` |
| `--system` | Il sistema di gioco | `5e`, oggi l'unico |
| `--difficulty` | Quanto è duro il mondo | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Che cosa significa cadere in uno scontro | `narrative`, `epic`, `dice` |

Anche `rpg init --help` le elenca. Una campagna non può stare dentro la cartella di un'altra campagna.

Non puoi chiedere al master di creare una campagna: prima di `init`, la cartella non contiene nulla che dica al tuo host AI dove si trova RPG Engine.

### 2.4 Collegare la tua AI

RPG Engine funziona con **Claude Code** e **Codex**. Altre app AI che usano gli strumenti MCP potrebbero funzionare, ma non lo garantiamo.

**Installare il tuo host.** Claude Code e Codex girano nel terminale: non sono l'app Claude o ChatGPT del telefono. Ognuno ha bisogno del suo piano e del suo login: Claude Code di un piano Claude a pagamento, Codex di un login ChatGPT. Segui le loro pagine per installarli e accedere: [Claude Code](https://code.claude.com/docs/en/setup) e [Codex](https://learn.chatgpt.com/docs/codex/cli). Lo fai una volta sola, per tutte le tue campagne.

**Claude Code.** Apri un terminale nella cartella della campagna e scrivi `claude`. La prima volta ti chiede se ti fidi della cartella e dice che la cartella consente gli strumenti del gioco (`mcp__rpg`): scegli **Yes, I trust this folder**. Attenzione: la risposta già selezionata è *No, exit*, quindi premere subito Invio chiude Claude Code. Tutto qui: la campagna ha già detto a Claude Code di usare RPG Engine e i suoi strumenti, e di tenere spenta la memoria.

**Codex.** Apri un terminale nella cartella della campagna e scrivi `codex`. Quando ti chiede se ti fidi della cartella, rispondi di sì: le impostazioni della campagna dicono a Codex dove si trova RPG Engine, consentono i suoi strumenti e tengono spenta la memoria, e Codex le legge solo in una cartella di cui ti fidi. Nell'app desktop, controlla che le memorie siano spente per le chat del gioco.

**Perché la memoria conta.** La campagna vive nei suoi file. Se anche l'host ricorda cose per conto suo, tornare a un salvataggio non sarebbe un vero ritorno: il master ricorderebbe comunque ciò che è stato annullato.

### 2.5 La prima chat

Scrivi qualsiasi cosa, per esempio:

> Ciao! Iniziamo.

Il master legge a che punto è il gioco e risponde. Nella prima risposta di ogni chat ti dà il **link della tua dashboard** (qualcosa come `http://127.0.0.1:4750`). Aprilo nel browser e tienilo accanto alla chat per tutta la partita. Ogni campagna mantiene lo stesso link da una chat all'altra, a meno che un altro programma non l'abbia preso: in quel caso il master ti dà quello nuovo.

Tra un messaggio del master e l'altro, il tuo host mostra gli strumenti che il master usa, in righe brevi. Non aprire i dettagli (in Claude Code, ctrl+o): possono mostrare ciò che il master scrive, segreti compresi.

Una campagna nuova passa per tre fasi, come un gioco con un master umano. La dashboard le mostra in alto come *1 Impostazioni · 2 Sessione zero · 3 Gioco*:

1. **Impostazioni**: scegli come vuoi giocare. Fuori dalla storia.
2. **Sessione zero**: crei il tuo personaggio, giocando.
3. **Gioco**: la storia.

### 2.6 Impostazioni: scegliere come giocare

Il master chiede solo ciò che manca ancora, poche domande alla volta. Se scrivi "decidi tu", il master sceglie e ti dice che cosa ha scelto. Con la dashboard aperta, il primo passo, **Impostazioni**, mostra le stesse domande come schede: una domanda alla volta, ogni valore con il suo significato, quello più usuale segnato come **Consigliata**. Scegli lì, e il master non richiederà nella chat; **Salta** lascia una domanda per dopo. La chat risolve ciò che solo le parole possono risolvere: la premessa di un mondo nuovo, la lingua e le immagini, che il master chiede solo se il tuo computer può crearle. Per questo la pagina fa meno domande di quante ne elenchi la tabella qui sotto.

Non serve studiare la tabella: è qui da consultare. Puoi cambiare ognuna di queste voci più tardi, nella chat o nelle **Impostazioni** della dashboard. Un cambiamento vale dalla risposta successiva del master.

| Impostazione | Che cosa decide | Valori | Consigliata |
|---|---|---|---|
| **Mentore** (chiesto come "Quanto conosci questo gioco?") | Quanto il master ti insegna le regole, fuori dalla storia | **spento** (solo la storia; chiedi tra parentesi quando vuoi), **suggerimenti** (un breve consiglio prima delle scelte importanti e quando una regola sfugge), **tutorial** (ogni regola spiegata la prima volta, il calcolo completo di ogni tiro, un breve resoconto dopo gli scontri) | dalla tua risposta: mai giocato → tutorial, un po' → suggerimenti, lo conosco → spento |
| **Difficoltà** | Quanto è duro il mondo: scontri, tattiche dei nemici, indizi, tesori, velocità delle minacce | story, easy, normal, hard, brutal | |
| **Letalità** | Che cosa significa cadere in uno scontro | **narrativa** (il tuo personaggio non muore mai), **epica** (muore solo quando conta per la storia), **dadi** (decidono i dadi) | segue la difficoltà: story → narrativa, easy → epica, normal e oltre → dadi |
| **Salvataggi** | Quando puoi tornare indietro | **morte definitiva** (mai; puoi solo ricominciare la campagna), **checkpoint** (all'ultima fine di una scena, solo se il tuo personaggio muore), **libero** (a qualsiasi salvataggio, e salvi quando vuoi) | checkpoint |
| **Rigore** | Quanto da vicino cibo, luce, fatica, peso trasportato, componenti degli incantesimi e viaggi seguono le regole | **fluido** (il master li sorvola), **regole** (come scritto: le torce si spengono, le razioni finiscono), **simulazione** (oltre le regole: usura, deperimento, meteo) | fluido |
| **Dadi** | Chi tira i dadi del tuo personaggio | **digitali** (li tira RPG Engine, sulla pagina), **fisici** (li tiri tu e dici le facce) | |
| **Unità di misura** | Distanze e pesi nella storia | metriche, imperiali | |
| **Compagni** | Chi viaggia con te | nessuno, creati con te nella sessione zero, creati dal master, incontrati in gioco | |
| **Immagini** | Immagini di luoghi, missioni e persone che incontri, e il ritratto del tuo personaggio quando lo chiedi | nessuna, su richiesta, nuovi luoghi, missioni e persone che incontri | chiesta una volta, solo se il tuo computer può crearle |
| **Linee** | Che cosa non compare mai nel gioco | un elenco, o nessuna | |
| **Veli** | Che cosa può accadere, ma solo fuori scena | un elenco, o nessuno | |
| **Lingua** | La lingua del gioco e della dashboard | qualsiasi | ricavata da come scrivi, e confermata |

Il sistema di gioco può aggiungere impostazioni proprie. La quinta edizione aggiunge l'**avanzamento**: come il tuo personaggio sale di livello, con i **punti esperienza** o a **tappe** della storia.

**Che cosa significa la difficoltà in gioco.** Story: nemici deboli e ingenui, indizi evidenti, abbondanza di tutto; il master può ammorbidire i propri tiri. Easy: nemici semplici, risorse generose. Normal: nemici sensati, tre indizi per ogni conclusione, prezzi e tesori standard. Hard: nemici astuti, indizi sottili, risorse scarse, minacce che avanzano in fretta. Brutal: nemici che tendono imboscate, si ritirano e finiscono i caduti, risorse scarsissime, i riposi più duri. Gli scontri sono sempre proporzionati al tuo gruppo così com'è ora.

**Senza un mondo già scritto**, la preparazione chiede altre due cose:

- **Premessa**: il genere, il tono e qualche elemento del mondo, con le tue parole. Per esempio: *"Low fantasy, cupo ma con speranza. Una città sul fiume, un guado infestato, un culto sulle colline."*
- **Preparazione**: **al volo** (il master costruisce ogni parte del mondo poco prima che ti serva; consigliata) oppure **tutta all'inizio**.

Il master propone poi un nome per la campagna. Quando non manca nulla e dici che sei pronto o pronta, il gioco passa alla sessione zero.

### 2.7 Sessione zero: il tuo personaggio

La sessione zero è gioco: crei il tuo personaggio insieme al master, come a un tavolo.

- **Ogni scelta è tua**, a meno che tu non chieda al master di farla. Puoi arrivare con un'idea completa ("un chierico mezzelfo che ha lasciato il tempio"), una vaga ("qualcuno che cura, ma non è gentile"), o con niente ("sorprendimi, poi lasciami cambiare le cose").
- **Punteggi di caratteristica.** Il master ti dice il metodo e la rete di sicurezza prima di tirare qualsiasi dado. Nella quinta edizione: la serie standard, l'acquisto a punti o 4d6 scartando il più basso. Il metodo concordato resta tra gli accordi del tavolo.
- **La tua storia** non è mai obbligatoria. Se ne dai una, il master la scrive con le tue parole, te la rilegge una volta e lega le sue persone e i suoi luoghi al mondo. Puoi anche scriverla nella dashboard (vedi [Gruppo](#party)).
- **Personalità** (quinta edizione): un tratto, un ideale, un legame e un difetto, dalle tabelle del tuo background o inventati da te.
- **Un'immagine.** Quando il tuo personaggio è pronto, il master ti chiede un'immagine: un file sul tuo computer, oppure un ritratto creato sul tuo computer da come lo descrivi (vedi [l'immagine del tuo personaggio](#37-your-characters-story-and-picture)).

I numeri della scheda li calcola RPG Engine in base alle tue scelte: non fai mai i conti. Quando i personaggi sono creati e confermi, la storia comincia.

---

## 3. Giocare <!-- icon: chat -->

### 3.1 Parlare con il master

Scrivi che cosa fa o dice il tuo personaggio, con le tue parole. Anche in breve.

> Chiedo all'oste chi altro è passato stasera.
>
> "Non siamo qui per guai," dico, con la mano lontana dalla spada.
>
> Salgo sul tetto e aspetto.

**Fuori dalla storia**, scrivi tra parentesi quadre:

> [Come funziona la lotta?]
>
> [Posso ancora usare la mia reazione in questo round?]
>
> [Fermiamoci qui per stasera.]

Il master risponde anch'esso tra parentesi, poi torna alla storia.

**Tu dici che cosa provi a fare; il master dice che cosa succede.** Ciò che rompe la logica del mondo o i fatti già stabiliti non accade: il master te lo dice, dentro la storia, e propone ciò che è possibile.

**Il master non decide mai per il tuo personaggio.** Non ti fa parlare, sentire o scegliere. Nel dubbio, chiede.

**Il master non parla mai del motore.** Chiedigli se tiene traccia delle cose e risponde come un master: "Tengo tutto io: ripartiamo da qui la prossima volta."

**Puoi chiedere al master come usare la dashboard.** Conosce la pagina: "Dove vedo i miei incantesimi?", "Come tiro a mano?"

### 3.2 I tiri

**Quando c'è un tiro.** Il master chiede un tiro solo quando l'esito è incerto e conta. Altrimenti dice sì, o "sì, ma". Prima del tuo tiro, il master dice che cosa è in gioco e quali prove sono adatte, poi si ferma. Tu tiri, o cambi idea:

> **Master:** La sporgenza è stretta e bagnata. Se scivoli, è una lunga caduta nel fiume. Una prova di Destrezza (Acrobazia), oppure puoi tornare indietro a cercare le scale.
>
> **Tu:** Ci provo.

**Tirare sulla dashboard.** Quando il master lo chiede, in alto sulla pagina compare un banner con un pulsante per ogni prova, per esempio *Acrobazia +4 · con vantaggio*. Cliccalo: i dadi cadono sulla pagina e il master sente il risultato. Puoi anche:

- cliccare la riga corrispondente della tua scheda, che si illumina d'oro;
- lanciare i dadi giusti dal vassoio;
- scrivere nel banner le tue parole, se vuoi fare altro.

**Tirare a mano.** Se preferisci scegliere tu i dadi, attiva **A mano** nell'angolo del banner (o nelle **Impostazioni**). Il pulsante della prova sparisce e il banner dice che cosa tirare, come farebbe un master: *Tira Acrobazia da te, sulla scheda o con i dadi.* Clicca la riga della scheda che si illumina, oppure lancia i dadi giusti dal vassoio: RPG Engine li tira, aggiunge il tuo bonus e il master sente il risultato. Una prova che né la scheda né il vassoio possono fare, come un danno che ritira gli 1, mantiene il suo pulsante. A mano resta attivo in questo browser finché non lo spegni.

**Dadi fisici per tutta la partita.** Con l'impostazione **Dadi** su fisici, il master chiede i tuoi tiri a parole e tu scrivi le facce che hai ottenuto:

> [Ho fatto 14.]

RPG Engine aggiunge i tuoi modificatori e rifiuta una faccia che i tuoi dadi non possono mostrare.

**Tiri liberi.** Clicca un numero qualsiasi della tua scheda, o apri il vassoio dei dadi, per tirare solo per divertimento. I tiri liberi non contano mai, non vengono mai registrati e il master non li vede mai. Un 20 libero non diventa mai un 20 vero dopo.

**I tiri del master.** Il master tira per i nemici e per gli altri anche con RPG Engine. La maggior parte dei tiri compare nella tua colonna dei tiri. Quando non devi vedere un risultato, il master tira in segreto. Puoi sempre chiedere:

> [Quel tiro era vero?]

Per un tiro mostrato, il master dà i suoi numeri e il motivo. Per uno segreto, un'impronta che prova che il tiro è stato fatto prima della tua domanda.

**I tiri nella chat** compaiono tra parentesi, subito dopo il momento che decidono: *[Persuasione 14 + 3 = 17]*. Poi la storia racconta l'esito.

### 3.3 Scene e scontri

Il master conduce la storia per **scene**: uno scontro, una conversazione, un'esplorazione, un viaggio, un riposo, una sfida (un inseguimento, una corsa, un enigma). Non devi gestirle tu: sono il modo in cui RPG Engine tiene i capitoli della storia. Alla fine di ogni scena il gioco salva da solo, e la scena entra nella storia del tuo diario.

**In uno scontro**, il master racconta tutti i turni che non sono tuoi, uno dopo l'altro, con ogni tiro, e **si ferma dove puoi decidere**: il tuo turno, una reazione, una scelta. Nel tuo turno, di' che cosa fai:

> Lancio Fiamma sacra su quello vicino alla porta.

La sezione **Scontro** della dashboard mostra l'ordine dei turni, di chi è il turno, i punti ferita del tuo gruppo e quanto sembrano feriti i nemici (illesi, feriti, malconci, a terra: a parole, mai in numeri). Se il tuo personaggio cade, i tiri salvezza contro morte compaiono in grande sulla pagina.

**Quando lo scontro è già deciso**, il master può proporre di raccontare il resto in un unico messaggio.

### 3.4 Tempo, viaggi e il mondo che si muove

**Il tempo.** Ogni azione richiede tempo nella storia, e RPG Engine tiene la data: giorno 3, primo mattino. Il master racconta il tempo come lo misura il mondo: l'alba, la terza campana, il calar della notte. Tra una sessione e l'altra non passa tempo: riparti da dove ti sei fermato o fermata.

**I riposi.** Di' che ti riposi, e il master applica ciò che un riposo restituisce, come punti ferita e slot incantesimo:

> Facciamo campo e un riposo lungo.

**I viaggi.** Di' dove vuoi andare:

> Prendiamo la strada a nord verso Rocca.

RPG Engine calcola il percorso, la distanza e i giorni al tuo passo, e ti sposta lì. Un viaggio si ferma quando sul cammino accade qualcosa di previsto, alla fine di ogni giornata di viaggio e all'arrivo. Puoi chiedere quanto dista un luogo prima di partire:

> [Quanto dista Rocca, e quanto ci vorrebbe a piedi?]

**Il mondo si muove senza di te.** I cattivi hanno piani con scadenze e orologi. Ogni nuovo giorno, il master fa avanzare le minacce che il tempo ha spinto, e tu ne vedi i segni: una voce, una traccia, un cambiamento in città. Non vedi mai l'orologio in sé, solo ciò che si lascia dietro.

**Il denaro** si conta nelle monete del gioco. Paga, vendi, vieni pagato o pagata: RPG Engine dà il resto.

### 3.5 Mappe

**La mappa del mondo** (dashboard: **Mondo**) mostra solo i luoghi che il tuo personaggio conosce, con le strade tra loro, il sentiero che hai percorso e la nebbia su tutto il resto. Clicca un luogo per vedere che cosa ne sai e quanto dista.

**La mappa di un luogo** (dashboard: **Scena**, e **Scontro** durante uno scontro) compare quando il master ne disegna una per dove ti trovi: muri, porte, il terreno e chi sta dove, come segnalini. In uno scontro, nel tuo turno, le caselle che non puoi raggiungere sono velate, così vedi a colpo d'occhio dove puoi andare. Quando il master chiede dove si muove il tuo personaggio, la pagina apre la mappa e tu tocchi una casella, oppure la scrivi, per esempio *E4*.

### 3.6 Missioni, diario e note

**Missioni.** Quando il tuo personaggio accetta un compito, diventa una missione nel tuo **Diario**: chi l'ha data, dove, entro quando, i suoi obiettivi in elenco e ciò che misura (una scadenza con il tempo rimasto, un orologio, un conteggio). Segnane una con la stella per seguirla: resta in piccolo in cima a Scena, con il suo prossimo obiettivo. La missione finisce quando la storia la conclude, mai da sola.

**La storia.** La scheda Storia del Diario è la tua campagna come linea del tempo: ogni scena è un capitolo, con luogo, data e un breve riassunto, l'ultima per prima.

**Le tue note.** Nella scheda Note del Diario scrivi le tue note: teorie, nomi, piani. Restano sul tuo computer e il master non le legge, a meno che tu non le **Condividi**. Una nota condivisa arriva al master alla sua risposta successiva come ciò che pensi, mai come un fatto. La tua teoria non diventa vera perché l'hai scritta. Una nota che chiede di fermare o evitare certi contenuti vale come se l'avessi detto al tavolo.

### 3.7 La storia e l'immagine del tuo personaggio

Sulla scheda del tuo personaggio, la carta **Descrizione** ha una casella per scrivere la storia del personaggio. Inviala, e il master la scrive nel personaggio con le proprie parole, dopo che hai detto di sì.

Per l'immagine del tuo personaggio, dai al master un file immagine nella chat, con il percorso sul tuo computer (PNG, JPEG, WebP o SVG, fino a 5 MB):

> [Ecco il ritratto del mio personaggio: C:\Users\me\Pictures\mira.png]

Il master lo copia nella campagna, e compare sul segnalino del tuo personaggio nella dashboard. Puoi cambiarlo nello stesso modo quando vuoi.

Oppure fai creare il ritratto, dove il tuo computer sa creare immagini (vedi [Immagini](#311-pictures)): descrivi il tuo personaggio al master, o lascia che sia il master a descriverlo.

> [Fammi un ritratto: capelli grigi in una treccia, una cicatrice sul mento, occhi stanchi.]

Il ritratto mostra esattamente ciò che il tuo personaggio è nel gioco, il suo popolo com'è in questo mondo, un nano delle colline come un nano delle colline, con l'aspetto che hai descritto. Arriva in circa un minuto, sul segnalino del tuo personaggio. I tuoi compagni possono avere il loro allo stesso modo.

### 3.8 Salvataggi e tornare indietro

RPG Engine salva l'intera campagna **alla fine di ogni scena**, da solo. Che cosa puoi fare con quei salvataggi dipende dall'impostazione **Salvataggi**:

| Salvataggi | Salvi quando vuoi | Tornare indietro |
|---|---|---|
| **morte definitiva** | no | mai; puoi solo ricominciare la campagna |
| **checkpoint** | no | all'ultimo salvataggio, solo quando il tuo personaggio muore |
| **libero** | sì | a qualsiasi salvataggio, quando vuoi |

In ogni modalità puoi **ricominciare**: dall'inizio del gioco con lo stesso personaggio, o dalla sessione zero con uno nuovo.

Puoi fare tutto questo nella chat ("[Torniamo a prima del duello.]") o nella sezione **Salvataggi** della dashboard.

**Dopo essere tornato indietro, apri una chat nuova.** La chat in cui giocavi ricorda ciò che è stato annullato. Apri una chat nuova con il master (`/clear` in Claude Code, `/new` in Codex), scrivi *continua*, poi premi **Ho aperto una chat nuova** in Salvataggi, oppure dillo al master nella chat nuova. Non riprendere mai la vecchia chat. Finché non confermi, il master non va avanti.

### 3.9 Sessioni: fermarsi e riprendere

**Chiudi la sessione** quando vuoi:

> [Fermiamoci qui per stasera.]

Non c'è un "salva ed esci": è già tutto nei file.

**Per chiudere** la chat, scrivi `/exit` in Claude Code, o `/quit` in Codex. La dashboard tace fino alla chat successiva.

**Per riprendere**, apri un terminale nella cartella della campagna (quella che ha stampato `init`), avvia lì il tuo host e scrivi *continua*. Il master legge a che punto è il gioco, ti dà un breve riassunto e comincia con qualcosa che accade. Una chat nuova non fa perdere nulla: la campagna vive nei suoi file, non nella chat.

Il master non fa domande di routine alla fine. Solo se ha notato che qualcosa non ha funzionato, chiede brevemente.

### 3.10 L'umore del master

In alto nella dashboard c'è l'avatar del master, un piccolo robot. La sua faccia segue il tono della storia: preoccupata quando il pericolo cresce, deliziata da un'idea audace, sorpresa da un colpo di scena. Reagisce per un attimo a un 20 naturale o a un 1 naturale. Non mostra mai ciò che ancora non sai: nessun ghigno prima che la trappola scatti. Anche i segnalini del tuo gruppo mostrano il loro umore. Quando la chat è chiusa, il robot dorme.

### 3.11 Immagini

RPG Engine può far creare un'immagine per ogni luogo che raggiungi, ogni missione che accetti e ogni personaggio o tipo di creatura che incontri, disegnati come li vedi, secondo l'impostazione **Immagini**, e il ritratto del tuo personaggio quando lo chiedi. Usa ciò che è già sul tuo computer:

- **Codex**, con il tuo login ChatGPT: un'immagine dipinta.
- Altrimenti **Claude Code**, con il tuo login Claude: un disegno.

L'immagine usa il tuo piano, non il nostro. La sezione **Impostazioni** ti dice se le immagini possono essere create sul tuo computer e, se no, i passaggi per configurarlo. Senza immagini, la pagina mostra al loro posto il simbolo di ogni tipo di luogo. Puoi anche dare al master un'immagine tua per qualsiasi luogo o personaggio.

### 3.12 Sicurezza: linee, veli e stop

- **Linee**: ciò che non compare mai nel gioco.
- **Veli**: ciò che può accadere, ma solo fuori scena.
- **Stop**: in qualsiasi momento puoi fermare un contenuto, senza spiegare. Scrivilo fuori dalla storia:

> [stop]

Il master lo lascia subito e lo aggiunge alle tue linee, per tutte le sessioni future. Puoi vedere e cambiare le tue linee e i tuoi veli nelle **Impostazioni**.

### 3.13 Cambiare idea

Ogni impostazione può cambiare durante la campagna: nella chat ("[Rendiamolo più difficile.]") o nelle **Impostazioni**. Il master viene a sapere di un cambiamento alla sua risposta successiva. Una decisione che il master ha preso senza il manuale diventa un **precedente** e viene conservata, così la stessa domanda riceve la stessa risposta la volta dopo.

---

## 4. La dashboard, sezione per sezione <!-- icon: party -->

La dashboard è una pagina sul tuo computer. Il master ti dà il suo link all'inizio di ogni chat. Segue il gioco in tempo reale: quando il master cambia qualcosa, cambia anche la pagina.

Può aprirla solo il browser del computer su cui giochi: non un telefono o un tablet, nemmeno sullo stesso Wi-Fi. La pagina si adatta anche a una finestra stretta: allora le sezioni passano in una barra in basso e le icone in un menu.

La pagina vive quanto la chat. Chiudi la chat, e una pagina lasciata aperta mostra *Non collegato* con la scheda com'era, e il robot del master si addormenta; riapri una chat nella campagna e, dopo la risposta del master, la pagina torna da sola.

### In alto

- L'**avatar del master**, con il suo umore.
- Il nome della campagna, il sistema di gioco, il **tempo di gioco** e se il gioco è **collegato** (la chat connessa).
- Le sezioni: **Gruppo**, **Scena**, **Scontro** (solo durante uno scontro), **Diario**, **Mondo**; in fondo alla riga, come icone: **Salvataggi**, **Guida**, **Impostazioni**, **Info**.
- Il tema chiaro e scuro, nell'angolo in alto a destra.

Quando il master ti chiede qualcosa, il suo banner resta in cima alla pagina, in qualunque sezione tu sia.

### Gruppo

La scheda del tuo personaggio e quelle dei tuoi compagni. Ogni parte della scheda è una carta che puoi aprire e chiudere.

- **Clicca un numero** per tirarlo per gioco. Punta un numero per vedere come è composto ("+5: Saggezza +3, competenza +2").
- **Punti ferita, slot e usi** compaiono come barre e pallini.
- **Condizioni ed effetti** compaiono con la loro durata.
- **Descrizione** contiene il testo del tuo personaggio e la casella per inviare al master la sua storia.
- A 0 punti ferita, i **tiri salvezza contro morte** compaiono grandi sotto il nome.
- Accanto alla scheda (sotto, su uno schermo stretto): **i tiri**, dal più recente, i tuoi e quelli del master che puoi vedere. **Togli** svuota l'elenco; **Ripristina** lo riporta. I tiri liberi compaiono tratteggiati e attenuati.

Un compagno con un profilo di creatura, come un lupo, mostra il suo profilo invece di una scheda completa.

### Scena

Dove si trova il tuo gruppo: l'immagine e il nome del luogo, i luoghi intorno, la mappa del luogo se ce n'è una, chi c'è e la scena aperta con ciò che accade ora. La missione che segui sta in cima.

### Scontro

Solo durante uno scontro. In alto: il round, chi agisce, chi viene dopo. Sotto: l'ordine dei turni, ogni combattente con il suo stato, il tuo gruppo in numeri e i nemici a parole; ciò che il tuo personaggio ha a portata di mano (Classe Armatura, punti ferita, attacchi); la mappa del luogo, con chi agisce cerchiato. Nel tuo turno il link Scontro pulsa d'oro, ovunque tu sia.

### Diario

Tre schede:

- **Missioni**: attive, completate e fallite, ognuna come una carta con i suoi obiettivi, la scadenza come timer e i suoi orologi. La stella segue una missione.
- **Storia**: i capitoli della campagna, scena per scena, l'ultima in alto.
- **Note**: le tue note, private finché non ne condividi una.

### Mondo

La mappa del mondo come la conosce il tuo personaggio, con la nebbia sul resto. Trascina per muoverti, rotella o pizzico per ingrandire. Clicca un luogo per la sua carta. Accanto c'è un elenco dei luoghi, dal più vicino. Con più di una mappa (una città, un continente, un altro piano), le schede permettono di passare dall'una all'altra.

### Il vassoio dei dadi

Il pulsante dei dadi apre il vassoio: scegli i dadi e un modificatore, e tira. Con due o più dadi dello stesso tipo, scegli quali contano: **Tutti**, **Alto** (solo il più alto) o **Basso** (solo il più basso). I dadi che hai scelto restano finché non premi **Togli**, così lo stesso tiro di danno è un clic a ogni round. Mentre il master chiede un tiro, il vassoio ti dice quali dadi rispondono.

### Salvataggi

I tuoi salvataggi, dal più recente, ognuno con il suo luogo, la data di gioco e quando è stato fatto. **Salva ora** (con i salvataggi liberi), **Torna qui** e **Ricomincia**, in rosso, in due passaggi. Vedi [Salvataggi e tornare indietro](#38-saves-and-going-back).

### Impostazioni

Le tue impostazioni, in gruppi: il gioco, imparare il gioco (il mentore e le regole che ti sono già state spiegate), dadi e misure, limiti (linee e veli), immagini, lingua. Clicca un valore per sceglierlo; sotto, il suo significato. Poi le preferenze della pagina, tenute solo in questo browser: il tema, il suono dei dadi, il **set di dadi** (resina, metallo, legno, pietra), spigoli arrotondati o vivi, il tiro a mano.

Le impostazioni proprie del master, come le regole della casa e i precedenti, non sono qui: restano nella chat.

### Guida e Info

**Guida**: questa guida. **Info**: cos'è RPG Engine, i suoi link, le sue licenze e i riconoscimenti del sistema di gioco.

### Prima del gioco: Impostazioni e sessione zero

Finché una campagna nuova è al primo passo, **Impostazioni**, l'intera pagina pone le sue domande: una alla volta, ognuna con il significato dei suoi valori e quello consigliato. **Decidi tu** lascia una domanda al master, tranne linee e veli, che sono sempre tuoi; **Salta** la rimanda a dopo. Alla fine, **Ci sono**.

### Messaggi dalla pagina

A volte la pagina mostra un avviso sopra di sé: un problema nei file della campagna (lo risolve il master), il gioco assente (la chat è chiusa), la pagina in traduzione.

---

## 5. Sistemi di gioco e regole della casa <!-- icon: dice -->

### 5.1 Cos'è un sistema di gioco

Un sistema di gioco sono i dati di un gioco: la sua scheda, i suoi numeri, le sue creature, i suoi oggetti, i suoi incantesimi e il testo delle sue regole. Ogni campagna gioca un solo sistema.

RPG Engine calcola la tua scheda del personaggio e ciò che si spende e torna, come punti ferita e slot incantesimo, come fa una scheda digitale. Come funziona un privilegio o un incantesimo lo legge il master nelle regole e lo decide, come a un tavolo.

### 5.2 Quinta edizione, inclusa

RPG Engine include la **5e**, dal System Reference Document 5.1 (le regole del 2014, gratuite con licenza Creative Commons). Comprende:

- le razze, le classi, le sottoclassi, un background e un talento dell'SRD;
- i 319 incantesimi, le armi, le armature e l'equipaggiamento, gli oggetti magici e i mostri dell'SRD;
- i capitoli delle regole, che il master consulta con il loro testo esatto;
- la scheda del personaggio completa, calcolata: modificatori di caratteristica, tiri salvezza, abilità, Classe Armatura, attacchi, CD degli incantesimi, slot, dadi vita, privilegi per livello, esperienza e avanzamento di livello;
- riposi che restituiscono ciò che devono; condizioni con il loro testo di regola; promemoria sulla concentrazione.

**Contenuti oltre l'SRD.** Puoi giocare la quinta edizione con contenuti che l'SRD non ha, come una classe o un mostro di un libro che possiedi. Il master conosce il gioco, può leggere i tuoi manuali e cercare sul web. Scrive ciò che gli serve come pagine della tua campagna, e RPG Engine funziona allo stesso modo con quelle. Ciò che includiamo è limitato dalla sua licenza; ciò che sa il tuo master no.

RPG Engine contiene solo contenuti originali o con licenza aperta: per la quinta edizione, l'SRD 5.1 con licenza CC BY 4.0. Tutto il resto che compare nella tua partita è scritto dalla tua IA o da te, come pagine della tua campagna sul tuo computer: non fa parte di RPG Engine e non lo distribuiamo.

RPG Engine è compatibile con la quinta edizione.

### 5.3 Regole della casa e aggiunte tue

Non devi toccare nessun file. Chiedi al master:

> [Regola della casa: un 1 naturale in un attacco significa che lasci cadere l'arma.]
>
> [Vorrei giocare un Blood Hunter. Ho il manuale: ecco i privilegi di classe.]
>
> [In questa campagna, un riposo breve dura 10 minuti.]

Il master le registra nella tua campagna in uno di questi modi:

- **Un accordo del tavolo**, a parole, come l'arma lasciata cadere o il riposo breve qui sopra. Il master lo tiene con le impostazioni della campagna e da allora gioca secondo quello. Una decisione che il master prende senza il manuale viene conservata allo stesso modo, come **precedente**.
- **Una pagina nuova**, come una classe, una razza o un oggetto. Una classe nuova funziona come quelle del sistema: il tuo livello, i dadi vita e i privilegi la contano. Una razza nuova può basarsi su una esistente ("come l'Elfo, più…"); una spada con un nome può basarsi sulla Spada lunga.
- **Numeri nuovi per la scheda**: un campo, una tabella, una formula, un contatore che un riposo ripristina. Per esempio, i dadi di superiorità di un Maestro di Battaglia che tornano con un riposo breve. Una regola della casa può anche sostituire una delle formule del sistema.

Se hai già regole della casa scritte, puoi anche metterle come file di testo nella cartella `rules` della campagna (vedi [la cartella della campagna](#8-for-the-curious-the-campaign-folder)): il master le legge prima della regola del manuale con lo stesso nome.

### 5.4 Aggiungere o importare un tuo sistema di gioco

Oggi RPG Engine gioca solo la quinta edizione. Arriveranno altri sistemi di gioco, e anche un modo per aggiungere il tuo, o per trasformare in uno di questi un gioco che possiedi a partire dai suoi manuali. Vedi [In arrivo](#9-coming-later).

---

## 6. Estensioni <!-- icon: plus -->

**Le estensioni non sono ancora disponibili.** Un'estensione aggiungerà qualcosa a una campagna oltre al suo sistema di gioco: un mondo, un'avventura, una funzione come il meteo o un mazzo di tarocchi, regole della casa da condividere. Sceglierai quali usa ogni campagna. Le prime previste per la quinta edizione sono il meteo e lo scasso di serrature.

---

## 7. Da dove viene una campagna, e la sua lingua <!-- icon: world -->

### 7.1 Tre modi di avere un mondo

**Creato al volo.** Dai una premessa nella preparazione, e il master costruisce il mondo man mano: ogni luogo, persona e trama poco prima che ti serva, e poi conservato. È il modo più rapido per giocare: installi, crei, e in pochi minuti stai creando il tuo personaggio. Nulla di ciò che viene inventato va perso: una volta detto, è scritto e resta vero.

**Preparato all'inizio.** Stessa premessa, ma con **Preparazione: tutto all'inizio**, il master costruisce i luoghi, le fazioni, le minacce del mondo e i loro piani prima che il gioco cominci. La prima sessione parte più tardi, con più materiale pronto dietro le quinte.

**Da una campagna o un'avventura esistente.** Oggi non c'è un pulsante di importazione. Dai al master la tua avventura (un testo o un PDF che il tuo host sa leggere) e chiedigli di prepararla:

> [Ho questa avventura in PDF. Preparala come nostra campagna: leggila e scrivi i suoi luoghi, personaggi e segreti. Non dirmi nulla di ciò che contiene.]

Il master la legge con gli strumenti del tuo host di IA e la scrive come pagine della campagna, segreti compresi, che scoprirai giocando. Claude Code legge i PDF; con Codex, un file di testo o markdown è la scelta più sicura. Fallo durante la preparazione, prima della sessione zero.

Mentre il master lavora, non aprire i dettagli di ciò che legge o scrive (in Claude Code, ctrl+o): mostrano il testo dell'avventura, segreti compresi. Il master, come sempre, i segreti li tiene per sé.

Appena la campagna ha pagine proprie, la preparazione smette di chiedere una premessa e una preparazione. Anche in una campagna scritta, quando vai dove il testo non arriva, il master crea ciò che serve e lo registra.

**Una campagna si gioca una volta.** Per rigiocare la stessa avventura, crea una nuova campagna. All'interno di una campagna puoi comunque tornare a un salvataggio o ricominciare, come permette l'impostazione Salvataggi.

### 7.2 Lingue

**Una lingua per campagna**: quella del master. Il master scrive in quella, e la dashboard la segue. Il master la ricava da come scrivi e la conferma.

**La dashboard** è inclusa in inglese e italiano (curate) e in altre 24 lingue: francese, tedesco, spagnolo, portoghese (brasiliano), olandese, svedese, norvegese, danese, finlandese, islandese, russo, ucraino, polacco, ceco, rumeno, ungherese, greco, turco, arabo, ebraico, hindi, cinese, giapponese, coreano. Arabo ed ebraico si leggono da destra a sinistra: la pagina si specchia, mentre le mappe e i dadi restano come disegnati.

**Qualsiasi altra lingua** scelta nelle Impostazioni viene tradotta sul tuo computer, in background, da Codex o Claude Code con il tuo accesso, a partire dalla sezione che hai aperta. Si fa una volta per lingua, per tutte le tue campagne. Finché non è pronta, la pagina resta in inglese. Impostazioni ti dice se la traduzione è in corso, pronta o non possibile sul tuo computer.

**Le parole del gioco.** La quinta edizione porta i suoi termini in italiano dall'SRD italiano ufficiale, così chi gioca in italiano legge *Classe Armatura*, *tiro salvezza*, *vantaggio*. Le altre lingue ottengono i termini del sistema tradotti.

**Il testo proprio del sistema di gioco** (gli incantesimi, i mostri, i capitoli delle regole) resta in inglese. Il master lo legge e te lo racconta nella tua lingua.

**Cambiare lingua a campagna avviata** lascia com'erano le pagine già scritte; il master scrive quelle nuove nella nuova lingua.

---

## 8. Per i curiosi: la cartella della campagna <!-- icon: list -->

Non hai mai bisogno di aprirla. Se lo fai, sappi che **contiene i segreti** della tua campagna: leggerla rovina il gioco.

Una cartella di campagna contiene:

- `campaign.yaml`: le tue impostazioni;
- `state.yaml`: a che punto è il gioco adesso: la sua fase, la data, la scena aperta;
- `world/`: una pagina per ogni personaggio, luogo, fazione, missione, oggetto, evento, argomento o creatura, come file markdown;
- `rules/`: le tue regole della casa come file di testo, se ne aggiungi (`init` non la crea);
- `images/`: le immagini, quando ce ne sono;
- `log.jsonl`: ogni cambiamento, in ordine;
- `.saves/`: i salvataggi, dal primo in poi;
- `.player/`: le tue note del Diario, che il master non legge;
- `sessions/`: tenuta da RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: i piccoli file che dicono agli host di IA dove si trova RPG Engine e tengono spenta la loro memoria. RPG Engine li tiene aggiornati; lasciali come sono.

Le pagine sono semplice markdown con link come `[[Rocca]]`, il formato di Obsidian: il taccuino del master può essere aperto lì. **Se modifichi una pagina a mano**, il master viene a sapere cosa è cambiato alla sua risposta successiva.

**La riga di comando.** Tutto ciò che fa il master passa per comandi che puoi eseguire anche tu, nella cartella della campagna. Non ti servono mai per giocare, e molti stampano i segreti della campagna, come `rpg status` e `rpg show`. `rpg --help` li elenca tutti, e `rpg roll --help` ne spiega uno. Un comando che cambia qualcosa mentre una chat è aperta va bene: il master lo viene a sapere alla sua risposta successiva, come per una pagina modificata a mano.

---

## 9. In arrivo <!-- icon: hourglass -->

Ciò che è previsto, ma non c'è ancora:

- **Tu come master**: conduci tu il gioco, e l'IA interpreta il gruppo.
- **Più persone al tavolo**, ognuna con il suo ruolo.
- **Estensioni**: impostazioni, avventure, funzioni e regole della casa, scelte per campagna.
- **Importazione** dei tuoi manuali e delle tue avventure.
- **Altri giochi**: più sistemi di gioco, e il tuo.
- **Modalità autore**: crea una campagna o un'avventura con l'IA e condividila perché altri la giochino.

---

## 10. Domande e problemi <!-- icon: info -->

### Domande

**Devo conoscere le regole?** No. Scegli il mentore tutorial e il master ti insegna man mano, una regola alla volta. Puoi sempre chiedere tra parentesi quadre.

**Il master può barare?** Non può cambiare un tiro fatto da RPG Engine, tranne alla difficoltà storia, e non cambia mai fatti già stabiliti. Puoi chiedere se un tiro era vero.

**Posso barare io?** Puoi provarci. Il master non crede sulla parola ai fatti: una riga nel tuo messaggio che sembra un messaggio del gioco resta solo parole tue, e il master non conferma mai le tue ipotesi sui segreti.

**Costa qualcosa?** RPG Engine è gratuito. Il master gira sul tuo piano Claude o ChatGPT, e una serata di gioco è una chat lunga: con i piani più piccoli potresti raggiungere il limite del piano prima che la serata finisca. Immagini e traduzioni usano lo stesso piano.

**Posso giocare dal telefono?** No. Il master gira sul tuo computer e la dashboard si apre solo nel browser di quel computer.

**Posso giocare con degli amici?** Non ancora: oggi un giocatore, un personaggio, più i compagni. Più persone al tavolo arriveranno con i ruoli.

**La prossima volta posso usare un'IA diversa?** Sì. La campagna vive nei suoi file: aprila in un altro host e scrivi *continua*.

**E se chiudo il browser?** Non si perde nulla. Riapri il link mentre la chat è aperta; la pagina torna dov'è il gioco.

**Posso giocare con contenuti D&D che possiedo?** Sì. Il master può usare i tuoi libri, la sua conoscenza e il web. Ciò che RPG Engine include è limitato ai contenuti gratuiti; ciò che usa il tuo gioco dipende da te.

### Problemi

**La dashboard non si apre.** Chiedi il link al master: `[Qual è il link della dashboard?]`. La pagina funziona solo mentre è aperta una chat con il master in quella campagna, e solo dopo la prima risposta del master in quella chat. Con la chat chiusa, il browser non raggiunge la pagina; una pagina lasciata aperta dice *Non collegato*.

**Il master sembra non conoscere il gioco, o inventa strumenti.** Il tuo host di IA non ha caricato RPG Engine.

- Prima di tutto, controlla di aver avviato l'host **nella cartella della campagna** e di aver detto che ti fidi.
- **Claude Code**: scrivi `/mcp`. Se `rpg` c'è ma ha fallito, sceglilo, poi **Reconnect**. Se manca, chiudi Claude Code, scrivi `claude mcp reset-project-choices` nella cartella della campagna e riavvialo.
- **Codex**: scrivi `codex mcp list` in un terminale, nella cartella della campagna. Se `rpg` manca, Codex non si fida della cartella: riavvialo lì e di' di sì quando lo chiede.
- In entrambi i casi: se `rpg --version` in un terminale dice che il comando non è stato trovato, installa di nuovo RPG Engine ([2.2](#22-install)) e apri un terminale nuovo.

**Dopo un aggiornamento, non è cambiato nulla.** Un master in esecuzione mantiene la versione con cui è partito. Apri una chat nuova, oppure in Claude Code riconnetti il server (`/mcp`, poi `rpg`, poi **Reconnect**).

**Il master ricorda qualcosa che ho annullato.** Sei tornato a un salvataggio ma hai continuato a giocare nella stessa chat. Apri una chat nuova e premi **Ho aperto una chat nuova** in Salvataggi.

**Il master fa domande di preparazione a cui ho già risposto sulla pagina.** Diglielo: `[Le ho scelte sulla dashboard.]`

**Non compaiono immagini.** Apri Impostazioni > Immagini: dice se questo computer può crearle, e i passi da fare se no, ogni comando con un pulsante per copiarlo.

**La pagina è in inglese ma ho scelto un'altra lingua.** Viene tradotta in background; Impostazioni dice a che punto è. Senza Codex o Claude Code su questo computer, resta in inglese.

**Il master dice che la campagna ha dei problemi.** Li risolve da solo. Se hai modificato file a mano, può chiederti cosa intendevi.

**Windows: `npm` fallisce nella mia cartella.** Non tenere la campagna, o RPG Engine, in un percorso che contiene `&`.

**L'installazione fallisce, o `rpg` non parte.** Controlla la versione di Node.js con `node --version`: deve essere 22 o più recente. Se è più vecchia, installa la versione LTS da [nodejs.org](https://nodejs.org), poi installa di nuovo RPG Engine.

**Il link della dashboard è cambiato.** Un altro programma usava l'indirizzo abituale della campagna, oppure Windows l'aveva riservato. RPG Engine ne ha preso un altro; il master ti dà il nuovo link. Nient'altro cambia.
