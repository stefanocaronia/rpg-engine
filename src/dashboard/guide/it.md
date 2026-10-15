<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 16d08ee1 75985e6d b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: la guida completa

**RPG Engine** ti permette di giocare a un gioco di ruolo da tavolo con una **IA come master**. Parli con il master in una **chat**; RPG Engine lavora dietro le quinte: **ricorda il mondo**, **tira i dadi** e **tiene i conti**. Accanto alla chat tieni aperta nel browser una pagina, la **dashboard**, con la tua scheda, i dadi, le mappe e il tuo diario.

Questa guida è per chi gioca: non serve saper programmare.

## Avvio rapido <!-- icon: send -->

1. Installa **Node.js** da [nodejs.org](https://nodejs.org) (la versione LTS).
2. Installa un **agente IA**, il programma in cui gira il master, ed entra col tuo account: per esempio Claude Code o Codex ([2.4](#24-connect-your-ai)).
3. In un terminale, installa RPG Engine: `npm install -g rpg-engine`.
4. Crea una campagna: `rpg init "The Salt Isles"`.
5. Entra nella cartella nuova, `cd "The Salt Isles"`, e avvia lì il tuo agente: `claude` per Claude Code, `codex` per Codex. Rispondi di sì quando chiede se ti fidi della cartella ([2.4](#24-connect-your-ai)), poi scrivi *Ciao! Cominciamo.* Il master risponde con il link alla tua dashboard.

## 1. Cos'è RPG Engine <!-- icon: about -->

| Chi | Cosa fa |
|---|---|
| **Tu** | Giochi il tuo personaggio: cosa fa, dice e tenta. |
| **Il master** (l'IA) | Racconta la storia, interpreta tutti gli altri, decide cosa succede, chiede i tiri. |
| **RPG Engine** | Tiene il mondo nei file, tira i dadi, conta punti ferita, denaro, tempo e distanze, custodisce i segreti finché non li scopri. |

Il mondo resta lo stesso da una sera all'altra, anche in una chat nuova, anche con un'altra IA:

- **Ciò che è stato detto resta vero.** Un cattivo morto resta morto.
- **I dadi sono veri.** Il master non può piegarli, tranne alla difficoltà più facile, se la scegli.
- **I segreti restano segreti.** Il master non ti dice mai ciò che il tuo personaggio non sa.
- **Il mondo si muove.** Le minacce avanzano mentre riposi o viaggi, e tu ne vedi i segni.
- **Una campagna è una cartella** sul tuo computer: ti fermi quando vuoi, riprendi dopo.

Oggi RPG Engine gioca un solo sistema di gioco, la **quinta edizione**, dal System Reference Document 5.1 gratuito. Altri arriveranno ([In arrivo](#9-coming-later)).

---

## 2. Per cominciare <!-- icon: path -->

### 2.1 Cosa ti serve

- Un computer con Windows, macOS o Linux, e un browser.
- **Node.js 22** o più recente, da [nodejs.org](https://nodejs.org). Porta con sé `npm`, che installa RPG Engine.
- Un **terminale**: su Windows, Terminale o PowerShell; su macOS, Terminale. Per aprirne uno in una cartella, clic destro sulla cartella e **Apri nel terminale** (Windows) o **Servizi > Nuovo terminale nella cartella** (macOS).
- Un **agente IA** per il master ([2.4](#24-connect-your-ai)), con il **modello più grande** che offre: un modello piccolo si lascia convincere più facilmente a svelare segreti o a piegare le regole.

### 2.2 Installare

```text
npm install -g rpg-engine
```

`rpg --version` controlla che abbia funzionato. Usi `rpg` una volta per campagna, per crearla; dopo, il tuo agente avvia RPG Engine da solo.

### 2.3 Creare una campagna

Apri un terminale nella cartella dove tieni i tuoi giochi (come, lo dice la [2.1](#21-what-you-need)):

```text
rpg init "The Salt Isles"
```

Crea la cartella `The Salt Isles` con dentro una campagna nuova; entraci con `cd "The Salt Isles"`. Ricorda dov'è: ci torni ogni volta che giochi. Tutto il resto lo scegli dopo, in chat o sulla dashboard; `rpg init --help` elenca le opzioni per sceglierne qualcosa subito, come `--language it` o `--difficulty hard`.

Il master non può creare una campagna per te: prima di `init`, niente dice al tuo agente dov'è RPG Engine.

### 2.4 Collegare la tua IA

Il master gira in un **agente IA**: un'app di IA, nel terminale o sul desktop, che sa lavorare con i file del tuo computer, come Claude Code o Codex. Una chat semplice come claude.ai o ChatGPT, o un'app del telefono, non basta: il master deve arrivare ai file della campagna sul tuo computer. Ogni agente vuole il suo piano e il suo accesso: Claude Code un piano Claude a pagamento, Codex un accesso ChatGPT. Si installa una volta sola, dalla sua pagina: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: nella cartella della campagna scrivi `claude`. Quando chiede se ti fidi della cartella, scegli **Yes, I trust this folder**; attento, la risposta già selezionata è *No, exit*.
- **Codex**: nella cartella della campagna scrivi `codex`, e rispondi di sì quando chiede se ti fidi della cartella. Nella sua app desktop, controlla nelle impostazioni che le memorie siano spente per le chat del gioco.
- **Un altro agente**: avvialo nella cartella della campagna e dagli il server MCP `rpg mcp`. RPG Engine è un server MCP standard: qualsiasi agente che supporta MCP può fare il master, anche locale.

Noi lo giochiamo e lo proviamo con **Claude Code**; **Codex** è collegato e verificato, ma non ci abbiamo ancora giocato una campagna intera; `init` prepara anche **Gemini CLI**. La campagna spegne la memoria propria dell'agente: il gioco vive nei suoi file, così tornare a un salvataggio torna davvero indietro.

### 2.5 La prima chat

Scrivi qualsiasi cosa, come *Ciao! Cominciamo.* Nella prima risposta di ogni chat il master ti dà il **link alla tua dashboard**, qualcosa come `http://127.0.0.1:4750`: aprilo e tienilo accanto alla chat.

Tra i messaggi del master il tuo agente mostra i tool che usa: non aprirne i dettagli (in Claude Code, ctrl+o), possono mostrare dei segreti.

Una campagna nuova passa per tre fasi, che la dashboard mostra in alto: **1 Impostazioni** (come vuoi giocare), **2 Sessione zero** (crei il tuo personaggio, giocando), **3 Gioco**.

### 2.6 Impostazioni: scegliere come giocare

Il master chiede solo ciò che manca, poche domande alla volta; il passo **Impostazioni** della dashboard mostra le stesse domande come carte. Scrivi "decidi tu" e il master sceglie. Tutto si può cambiare dopo, in chat o nelle **Impostazioni**.

| Impostazione | Cosa decide | Valori |
|---|---|---|
| **Mentore** | Quanto il master ti insegna le regole | spento, suggerimenti, tutorial |
| **Difficoltà** | Quanto è duro il mondo | storia, facile, normale, difficile, brutale |
| **Letalità** | Cosa vuol dire cadere in uno scontro | narrativa (non si muore), epica (solo quando conta), dadi |
| **Salvataggi** | Quando puoi tornare indietro | morte permanente, checkpoint, libero ([3.8](#38-saves-and-going-back)) |
| **Rigore** | Quanto cibo, luce e viaggi seguono le regole | scorrevole, regole, simulazione |
| **Dadi** | Chi tira i tuoi dadi | digitali, fisici |
| **Unità di misura** | Distanze e pesi | metrico, imperiale |
| **Compagni** | Chi viaggia con te | nessuno, creati con te, fatti dal master, incontrati in gioco |
| **Immagini** | Immagini di luoghi, missioni e di chi incontri | niente, su richiesta, luoghi, missioni e chi incontri ([3.11](#311-pictures)) |
| **Linee** e **Veli** | Cosa non compare mai, e cosa succede solo fuori scena | elenchi |
| **Lingua** | La lingua del gioco e della dashboard | qualsiasi |

La quinta edizione aggiunge l'**avanzamento**: punti esperienza o traguardi.

Senza un mondo scritto, il master chiede anche una **premessa** (genere, tono, qualche elemento, con parole tue) e la **preparazione**: costruire il mondo al momento, man mano, o tutto all'inizio.

**Lo stile del master** non viene chiesto, ma puoi cambiarlo in chat o nelle **Impostazioni**: la **narrazione** (asciutta, letteraria, pulp, ironica), le **storie** che inventa (situazioni, archi, episodi, mistero), **scrivi come** un autore, o altro **a parole tue**.

### 2.7 Sessione zero: il tuo personaggio

Crei il tuo personaggio con il master, come al tavolo. Ogni scelta è tua, a meno che tu non chieda al master di farla: vieni con un'idea completa, una vaga, o nessuna. Il master ti dice come si fanno le caratteristiche prima di tirare qualsiasi dado. La tua storia non è mai obbligatoria; se ne dai una, il master la scrive con le tue parole. Poi il master ti chiede un'immagine del tuo personaggio ([3.7](#37-your-characters-story-and-picture)). La scheda la calcola RPG Engine: tu non fai mai i conti.

---

## 3. Giocare <!-- icon: chat -->

### 3.1 Parlare con il master

Scrivi cosa fa o dice il tuo personaggio, con parole tue:

> Chiedo all'oste chi altro è passato stanotte.

Fuori dalla storia, scrivi tra parentesi quadre: *[Come funziona la lotta?]* Il master risponde anche lui tra parentesi.

Tu dici cosa tenti; il master dice cosa succede. Il master non decide mai per il tuo personaggio, e non parla mai del motore. Puoi chiedergli come si usa la dashboard.

### 3.2 I tiri

Il master chiede un tiro solo quando l'esito è incerto e conta, e prima dice cosa c'è in gioco. Poi:

- **Sulla dashboard**, un banner mostra un pulsante per ogni prova, come *Acrobazia +4 · con vantaggio*. Cliccalo: i dadi cadono sulla pagina e il master sente il risultato. Puoi anche cliccare la riga della tua scheda che si illumina, lanciare i dadi dal vassoio, o scrivere altro nel banner.
- **A mano**, nell'angolo del banner o nelle **Impostazioni**: il banner ti dice cosa tirare, e lo tiri dalla scheda o dal vassoio.
- **Dadi fisici**, con l'impostazione dei dadi su fisici: scrivi le facce che hai tirato, *[Ho fatto 14.]*, e RPG Engine aggiunge i tuoi modificatori.

**Tiri liberi**: clicca un numero qualsiasi della tua scheda, o apri il vassoio, per tirare per gioco. Non contano mai e il master non li vede.

**I tiri del master** compaiono nella tua colonna dei tiri, tranne quelli segreti. Puoi sempre chiedere *[Quel tiro era vero?]*: per un tiro segreto il master dà un'impronta che prova che era stato fatto prima della tua domanda.

### 3.3 Scene e scontri

La storia procede per **scene**: uno scontro, una conversazione, un'esplorazione, un viaggio, un riposo. Alla fine di ogni scena il gioco salva da solo, e la scena entra nel tuo diario.

In uno scontro il master racconta ogni turno che non è tuo, e si ferma dove puoi decidere. La **Scena** mostra in cima a chi tocca e chi viene dopo, e la scheda del tuo personaggio accanto alla mappa; l'ordine dei turni, i punti ferita del tuo gruppo e quanto sono feriti i nemici, a parole, restano accanto alla pagina. Se il tuo personaggio cade, i tiri salvezza contro la morte compaiono in grande sulla pagina.

### 3.4 Il tempo, i viaggi e il mondo che si muove

RPG Engine tiene la data; tra una sessione e l'altra il tempo non passa. Di' che riposate, *Facciamo un riposo lungo*, e il riposo restituisce ciò che deve. Di' dove andate, *Prendiamo la strada a nord verso Rocca*, e RPG Engine calcola la via, la distanza e i giorni, fermandosi quando succede qualcosa lungo la strada. Il denaro si conta nelle monete del gioco, resto compreso.

I cattivi hanno piani con scadenze. A ogni giorno nuovo il master fa avanzare le minacce che il tempo ha spinto avanti, e tu ne vedi i segni, mai l'orologio.

### 3.5 Le mappe

**Mondo** mostra i luoghi che il tuo personaggio conosce, le strade tra loro e il percorso che hai fatto, con la nebbia sul resto. **Scena** mostra la mappa del luogo dove sei, quando ne ha una, con chi sta dove; in uno scontro, nel tuo turno, le caselle che non raggiungi sono velate. Quando il master chiede dove ti muovi, tocca una casella, o scrivila, come *E4*.

### 3.6 Missioni, diario e note

Un incarico che il tuo personaggio accetta diventa una missione nel **Diario**, con i suoi obiettivi, la scadenza e ciò che misura; con la stella la tieni in vista in cima a Scena. Il Diario racconta anche la tua **storia**, scena per scena, e tiene le tue **note**: private, a meno che tu non ne **condivida** una, che il master sente come ciò che pensi, mai come un fatto.

### 3.7 La storia e l'immagine del tuo personaggio

Sulla tua scheda, la carta **Descrizione** ha una casella per la storia del tuo personaggio: il master la scrive, dopo il tuo sì. Per un'immagine, dai al master un file (PNG, JPEG, WebP o SVG, fino a 5 MB) con il punto in cui si trova sul tuo computer, oppure fai fare un ritratto ([3.11](#311-pictures)): *[Fammi un ritratto: capelli grigi in una treccia, una cicatrice sul mento.]*

### 3.8 Salvataggi e tornare indietro

RPG Engine salva l'intera campagna alla fine di ogni scena. L'impostazione **salvataggi** decide il resto:

| Salvataggi | Salvare quando vuoi | Tornare indietro |
|---|---|---|
| **morte permanente** | no | mai |
| **checkpoint** | no | all'ultimo salvataggio, solo se il tuo personaggio muore |
| **libero** | sì | a qualsiasi salvataggio |

In ogni modalità puoi **ricominciare**, dall'inizio del gioco o dalla sessione zero. Fallo in chat o in **Salvataggi**.

Dopo essere tornato indietro, **apri una chat nuova**: quella vecchia ricorda ciò che è stato annullato. Scrivi *continua* nella chat nuova, poi premi **Ho aperto una chat nuova** in Salvataggi.

### 3.9 Sessioni: fermarsi e tornare

Fermati quando vuoi: *[Fermiamoci qui per stasera.]* È già tutto salvato nei file. Per tornare, avvia il tuo agente nella cartella della campagna e scrivi *continua*: il master ti fa un breve riassunto e va avanti.

### 3.10 L'umore del master

Il robot in cima alla dashboard è il master: il suo volto segue il tono della storia, e non tradisce mai ciò che ancora non sai. Quando la chat è chiusa, dorme.

### 3.11 Le immagini

RPG Engine può far fare immagini dei luoghi che raggiungi, delle missioni che prendi e di chi incontri, come dice l'impostazione **immagini**, e il ritratto del tuo personaggio quando lo chiedi. Usa ciò che c'è sul tuo computer, con il tuo account: **Codex** le dipinge, altrimenti **Claude Code** le disegna. Le **Impostazioni** dicono se questo computer può farle, e se no come prepararlo. Puoi sempre dare al master un'immagine tua.

### 3.12 Sicurezza: linee, veli e stop

Le **linee** non compaiono mai nel gioco; i **veli** succedono solo fuori scena. In qualsiasi momento scrivi *[stop]*: il master lascia subito quel contenuto e lo aggiunge alle tue linee.

### 3.13 Cambiare idea

Ogni impostazione può cambiare, in chat o nelle **Impostazioni**. Una decisione che il master prende senza il manuale diventa un **precedente**, così la stessa domanda avrà la stessa risposta la volta dopo.

---

## 4. La dashboard <!-- icon: party -->

Una pagina sul tuo computer, che si apre solo nel browser di quel computer, viva finché la chat è aperta. Quando la chat si chiude mostra *Non collegato*; torna da sola con la chat successiva.

- **Gruppo**: la tua scheda e quelle dei compagni. Clicca un numero per tirarlo; passaci sopra col mouse per vedere da dove viene. Accanto, i tiri.
- **Scena**: dove sei, la sua immagine e la sua mappa, chi c'è, cosa sta succedendo; in uno scontro, i turni e la scheda del tuo personaggio.
- **Diario**: le missioni, la storia, le tue note.
- **Mondo**: la mappa del mondo come la conosce il tuo personaggio.
- **Il vassoio dei dadi**: scegli dadi e modificatore, e lancia.
- **Salvataggi**, **Guida**, **Impostazioni** e **Info**, come icone in fondo alla riga. Le Impostazioni tengono anche le preferenze della pagina: tema, suono dei dadi, set di dadi.

Quando il master ti chiede qualcosa, il suo banner resta in alto, in qualsiasi sezione tu sia.

---

## 5. Sistemi di gioco e regole della casa <!-- icon: dice -->

### 5.1 Cos'è un sistema di gioco

I dati di un gioco: la sua scheda, i suoi numeri, le sue creature, gli oggetti, gli incantesimi e il testo delle regole. Ogni campagna gioca un sistema. RPG Engine calcola la scheda e ciò che si spende e ritorna; come funziona un privilegio, il master lo legge nelle regole e decide, come al tavolo.

### 5.2 La quinta edizione, inclusa

Le razze, le classi, le sottoclassi, un background e un talento della SRD 5.1; i 319 incantesimi, le armi, le armature, gli oggetti magici e i mostri; i capitoli delle regole, che il master legge nel testo esatto; la scheda completa, calcolata.

Puoi giocare anche contenuti che la SRD non ha, da un manuale che possiedi: il master li scrive come pagine della tua campagna, e RPG Engine li tratta come suoi. RPG Engine distribuisce solo contenuti aperti; ciò che il tuo master conosce non ha limiti.

### 5.3 Regole della casa e aggiunte tue

Chiedi al master: *[Regola della casa: un 1 naturale in attacco ti fa cadere l'arma.]* La tiene come accordo del tavolo, o scrive una pagina o un numero della scheda quando serve. Le regole della casa già scritte possono stare come file di testo nella cartella `rules` della campagna.

### 5.4 Aggiungere o importare un sistema tuo

Non ancora: oggi RPG Engine gioca solo la quinta edizione ([In arrivo](#9-coming-later)).

---

## 6. Estensioni <!-- icon: plus -->

Non ancora. Un'estensione aggiungerà qualcosa a una campagna oltre al suo sistema di gioco: un mondo, un'avventura, una funzione come il meteo, regole della casa da condividere.

---

## 7. Da dove viene una campagna, e la sua lingua <!-- icon: world -->

### 7.1 Tre modi per avere un mondo

- **Creato al momento**: dalla tua premessa, il master costruisce ogni luogo, persona e trama appena prima che ti serva, e lo conserva.
- **Preparato all'inizio**: lo stesso, con il mondo costruito prima di giocare.
- **Dalla tua avventura**: dai al master un testo o un PDF e chiedigli di prepararla, *[Prepara questa avventura come nostra campagna. Non dirmi niente di ciò che contiene.]* Scrive i luoghi, i personaggi e i segreti. Un pulsante per importare non c'è ancora.

Una campagna si gioca una volta: per rigiocare la stessa avventura, crea una campagna nuova.

### 7.2 Le lingue

Una lingua per campagna, quella del master, che la dashboard segue. La dashboard ha 26 lingue. Qualsiasi altra viene tradotta sul tuo computer da Codex o Claude Code, oppure, senza di loro, dal master in chat. I termini della quinta edizione in italiano vengono dalla SRD italiana ufficiale; il testo delle regole resta in inglese, e il master te lo racconta nella tua lingua.

---

## 8. Per curiosi: la cartella della campagna <!-- icon: list -->

Non devi mai aprirla, e contiene i segreti della tua campagna. Ha `campaign.yaml` (le tue impostazioni), `state.yaml` (a che punto è il gioco), `world/` (una pagina markdown per ogni personaggio, luogo, missione e il resto), `rules/` (le tue regole della casa), `images/`, `log.jsonl` (ogni cambiamento), `.saves/`, `.player/` (le tue note) e i piccoli file che dicono agli agenti IA dov'è RPG Engine. Le pagine usano il formato di Obsidian. Se cambi una pagina a mano, il master lo sente alla sua risposta successiva.

RPG Engine resta in questa cartella: legge e scrive il gioco solo qui, e non tocca mai gli altri tuoi file. Fuori, tiene solo una cartella di dati sua (le traduzioni della dashboard, e Codex o Claude Code se gli permetti di installarli) e cartelle temporanee mentre disegna un'immagine. Qualsiasi altra cosa il tuo agente voglia fare sul tuo computer, te la chiede prima.

Ogni comando che usa il master si può lanciare anche nella cartella della campagna: `rpg --help` li elenca. Molti stampano i segreti della campagna.

---

## 9. In arrivo <!-- icon: hourglass -->

- **Tu come master**, con l'IA che gioca il gruppo.
- **Modalità autore**: scrivi un'avventura con l'IA, poi la esporti e la condividi.
- **Più giocatori sullo stesso computer**, ognuno con il suo personaggio, a turno nella stessa chat.
- **Estensioni**: ambientazioni, avventure, funzioni e regole della casa.
- **Importare** i tuoi manuali e le tue avventure.
- **Altri giochi**: altri sistemi di gioco, e il tuo.

---

## 10. Domande e problemi <!-- icon: info -->

### Domande

**Devo conoscere le regole?** No. Scegli il mentore tutorial, e chiedi tra parentesi quando vuoi.

**Il master può barare?** Non può cambiare un tiro fatto da RPG Engine, tranne alla difficoltà storia, né i fatti già stabiliti.

**Costa qualcosa?** RPG Engine è gratuito. Il master gira sul piano del tuo agente, o sul tuo computer con un modello locale. Una serata di gioco è una chat lunga: con i piani più piccoli puoi arrivare al limite prima della fine della serata. Immagini e traduzioni usano lo stesso piano.

**Posso giocare dal telefono?** No: il master gira sul tuo computer, e la dashboard si apre solo lì.

**Posso giocare con degli amici?** Non ancora: oggi un giocatore, un personaggio, più i compagni ([In arrivo](#9-coming-later)).

**Posso usare un'altra IA la prossima volta?** Sì: apri la campagna in un altro agente e scrivi *continua*.

### Problemi

**La dashboard non si apre.** Chiedi al master: *[Qual è il link della dashboard?]* Funziona solo mentre una chat è aperta in quella campagna, dopo la prima risposta del master.

**Il master non sembra conoscere il gioco.** Il tuo agente non ha caricato RPG Engine. Controlla di averlo avviato nella cartella della campagna e di esserti fidato. In Claude Code, scrivi `/mcp` e ricollega `rpg`. In Codex, `codex mcp list` nella cartella della campagna deve mostrare `rpg`. Se `rpg --version` non viene trovato, installa di nuovo RPG Engine ([2.2](#22-install)).

**Aggiornare.** Lancia di nuovo `npm install -g rpg-engine`, poi apri una chat nuova: un master già avviato tiene la versione con cui è partito.

**Il master ricorda qualcosa che ho annullato.** Apri una chat nuova e premi **Ho aperto una chat nuova** in Salvataggi.

**Non compaiono immagini.** Impostazioni > Immagini dice se questo computer può farle, e come.

**L'installazione fallisce, o `rpg` non parte.** `node --version` deve dire 22 o più. Su Windows, tieni RPG Engine e le campagne fuori da percorsi che contengono `&`.

**Il link della dashboard è cambiato.** Un altro programma ha preso l'indirizzo solito; il master ti dà il link nuovo.
