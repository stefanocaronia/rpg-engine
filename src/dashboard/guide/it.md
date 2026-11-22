<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,e51b18d7,be38a186 f2f35057,51f49a5b 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,afad321d,99406ef2,f831ecd8,b6a6bfff,b5544596,5c016bb1,3afa0abc,ef6b72c1,bc923cc3,07c079ea,8b6ac2d5,7b9a0a41,086f7b8c,da6d0862,06d7d789,e6f82f9e,6def7d66,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,a2da9de6,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,1c335942,25f9bdf8,6bd01b74,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,44639926,6cb75000,86179abe,323d8fa3,f8d6b2fd,18bc17d2,3bbb14f4,774591fd,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,92e343cc,fa64227b,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,6ea1911c,b8e71497,32482cb4,65c75baa,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,180f77d8,e0f88bdb,1e0ccfed,05fde17f,5070d986,f83c9d82,5b0bb1d2,600db53a,6b115391,5db3836c,252805d8,df64a3bb,e9a3f2a9. Change the English, then run it again. -->
# RPG Engine: la guida completa

**RPG Engine** ti permette di giocare a un gioco di ruolo da tavolo con una **IA come master**. Parli con il master in una **chat**; RPG Engine lavora dietro le quinte: **ricorda il mondo**, **tira i dadi** e **tiene i conti**. Accanto alla chat tieni aperta nel browser una pagina, la **dashboard**, con la tua scheda, i dadi, le mappe e il tuo diario.

Questa guida è per chi gioca: non serve saper programmare.

## Avvio rapido <!-- icon: send -->

1. Installa **Node.js** da [nodejs.org](https://nodejs.org) (la versione LTS).
2. Installa un **agente IA**, il programma in cui gira il master, ed entra col tuo account: per esempio Claude Code o Codex ([2.4](#24-connect-your-ai)).
3. In un terminale nuovo, aperto dopo aver installato Node.js, installa RPG Engine: `npm install -g rpg-engine`. Se Windows risponde che l'esecuzione di script è disabilitata, scrivi una volta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, rispondi di sì e riprova.
4. Apri il terminale nella cartella dove tieni i tuoi giochi (clic destro sulla cartella, **Apri nel terminale**) e crea una campagna, sempre con il suo nome: `rpg init "The Salt Isles"`. RPG Engine risponde con due righe in inglese: va tutto bene.
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

Un gioco arriva come sistema di gioco, un pacchetto che il master installa per la tua campagna: oggi il nostro è la **quinta edizione**, dal System Reference Document 5.1 gratuito. Senza, giochi libero: una storia senza numeri. Altri arriveranno ([In arrivo](#9-coming-later)).

---

## 2. Per iniziare <!-- icon: path -->

### 2.1 Cosa ti serve

- Un computer con Windows, macOS o Linux, e un browser.
- **Node.js 24** o più recente, da [nodejs.org](https://nodejs.org). Include `npm`, che installa RPG Engine.
- Un **terminale**: su Windows, Terminale o PowerShell; su macOS, Terminale. Per aprirne uno in una cartella, fai clic con il tasto destro sulla cartella e scegli **Apri in Terminale** (Windows) o **Servizi > Nuovo Terminale nella cartella** (macOS). Se Windows risponde che l'esecuzione degli script è disattivata, scrivi una volta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e rispondi di sì.
- Un **agente AI** per il master ([2.4](#24-connect-your-ai)), con il **modello più grande** che offre: un modello piccolo si lascia convincere più facilmente a rivelare segreti o a piegare le regole.

### 2.2 Installazione

```text
npm install -g rpg-engine
```

Con `rpg --version` controlli che sia andato tutto bene. Se npm propone di aggiornarsi, puoi ignorarlo. Usi `rpg` una volta per campagna, per crearla; dopo, il tuo agente avvia RPG Engine da solo. `rpg` da solo non apre niente: la dashboard te la dà il master.

### 2.3 Creare una campagna

Apri un terminale nella cartella dove tieni i tuoi giochi ([2.1](#21-what-you-need) spiega come):

```text
rpg init "The Salt Isles"
```

Questo crea la cartella `The Salt Isles` con una nuova campagna dentro; entraci con `cd "The Salt Isles"`. Scrivi sempre il nome: senza, la cartella in cui ti trovi diventa la campagna, accanto a tutto quello che contiene già. Ricorda dove si trova: ci torni ogni volta che giochi. Tutto il resto lo scegli dopo, nella chat o nella dashboard.

Il master non può creare una campagna al posto tuo: prima di `init`, niente dice al tuo agente dove si trova RPG Engine.

### 2.4 Collegare la tua AI

Il master gira in un **agente AI**: un'app AI, nel terminale o sul desktop, che può lavorare con i file del tuo computer, come Claude Code, Codex, Antigravity o OpenCode. Una chat semplice come claude.ai o ChatGPT, o un'app per telefono, non basta: il master deve poter raggiungere i file della campagna sul tuo computer. Ogni agente ha bisogno del suo piano e del suo accesso: Claude Code di un piano Claude a pagamento, Codex di un accesso ChatGPT, Antigravity di un account Google, il cui piano gratuito ha una piccola quota settimanale; OpenCode funziona con i modelli che gli dai, anche quelli locali. Lo installi una volta sola, dalla sua pagina: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://developers.openai.com/codex), [Antigravity](https://antigravity.google), [OpenCode](https://opencode.ai).

- **Claude Code**: nella cartella della campagna scrivi `claude`. Quando chiede se ti fidi della cartella, scegli **Yes, I trust this folder**; attenzione, la risposta già selezionata è *No, exit*. La campagna ha anche un piccolo hook, `rpg --listen`, che la domanda non mostra: avvisa subito il master quando agisci dalla dashboard.
- **Codex**: nella cartella della campagna scrivi `codex` e rispondi di sì quando chiede se ti fidi della cartella. Nella sua app desktop, controlla nelle impostazioni che le memorie siano disattivate per le chat del gioco.
- **Antigravity**: nella cartella della campagna scrivi `agy` e rispondi di sì se chiede se ti fidi della cartella; oppure, nella sua app, apri la cartella della campagna. Per l'app, RPG Engine si aggiunge anche alle impostazioni di Antigravity, `.gemini/config/mcp_config.json` nella tua home, che valgono per ogni cartella che apri, non solo per quella della campagna: fuori da una campagna non fa nulla. La campagna ha due piccoli hook: `rpg --approve` lascia che il master usi gli strumenti di RPG Engine senza chiederti ogni volta il permesso, e `rpg --listen` avvisa subito il master quando agisci dalla dashboard. Il master dipinge le immagini direttamente nella chat; quando il suo strumento per le immagini non funziona, disegna semplici immagini vettoriali, come fa Claude. Antigravity conserva le tue chat passate e la sua memoria non si può disattivare: al master viene detto di non leggerle mai. Quello che scrivi va a Google, che potrebbe farlo leggere a delle persone: tieni i dati personali fuori dal gioco. RPG Engine non è un prodotto Google.
- **OpenCode**: nella cartella della campagna scrivi `opencode`. La campagna ha un piccolo plugin, `.opencode/plugins/rpg.js`, che avvisa subito il master quando agisci dalla dashboard. Nella campagna il master scrive i file solo attraverso RPG Engine: la scrittura e la modifica dei file di OpenCode stesso lì sono spente, e prima di lanciare un comando te lo chiede. Le immagini le disegna il master stesso, come semplici immagini vettoriali, come fa Claude. Il tuo OpenCode, con il modello che hai scelto per ultimo, traduce anche la dashboard e le regole del gioco e legge i documenti che importi, fuori dalla chat; senza un modello che possa usare, lo fanno Codex o Claude Code, se li hai.
- **Un altro agente**: avvialo nella cartella della campagna e dagli il server MCP `rpg mcp`. RPG Engine è un normale server MCP: qualsiasi agente che supporti MCP può fare da master, anche quelli locali.

Se il master dice di non trovare gli strumenti di RPG Engine, scrivi `rpg init` nella cartella della campagna: in una cartella che è già una campagna aggiorna soltanto questi file; poi apri una nuova chat.

Noi giochiamo e proviamo con **Claude Code**; **Codex** e **Antigravity** sono collegati e verificati, ma con loro non è ancora stata giocata una campagna intera. La campagna disattiva la memoria propria dell'agente: il gioco vive nei suoi file, così tornare a un salvataggio significa davvero tornare indietro.

### 2.5 La prima chat

Scrivi quello che vuoi, per esempio *Ciao! Iniziamo.* Nella sua prima risposta di ogni chat il master ti dà il **link alla tua dashboard**, qualcosa come `http://127.0.0.1:4750`: aprilo e tienilo accanto alla chat.

Tra un messaggio e l'altro del master, il tuo agente mostra gli strumenti che usa: non aprirne i dettagli (in Claude Code, ctrl+o), perché possono mostrare segreti.

Una nuova campagna passa per tre fasi, mostrate in cima alla dashboard: **1 Impostazioni** (come vuoi giocare), **2 Sessione zero** (crei il tuo personaggio, giocando), **3 Gioco**.

### 2.6 Impostazioni: scegliere come giocare

Il master chiede solo ciò che manca ancora, poche domande alla volta; il passo **Impostazioni** della dashboard mostra le stesse domande come schede. Scrivi "decidi tu" e il master sceglie. Tutto si può cambiare dopo, nella chat o in **Impostazioni**.

| Impostazione | Cosa decide | Valori |
|---|---|---|
| **Mentore** | Quanto il master ti insegna le regole | spento, suggerimenti, tutorial |
| **Difficoltà** | Quanto è duro il mondo | storia, facile, normale, difficile, brutale |
| **Letalità** | Cosa significa cadere in uno scontro | narrativa (non si muore mai), epica (solo quando conta), dadi |
| **Salvataggi** | Quando puoi tornare indietro | morte permanente, checkpoint, libero ([3.8](#38-saves-and-going-back)) |
| **Rigore** | Quanto cibo, luce e viaggio seguono da vicino le regole | fluido, regole, simulazione |
| **Dadi** | Chi tira i tuoi dadi | digitali, fisici |
| **Unità di misura** | Distanze e pesi | metriche, imperiali |
| **Voci dei personaggi** | Chi parla per i personaggi che incontri, dal master ai personaggi stessi: sempre il master; nei momenti chiave il personaggio in persona, che sa solo ciò che sa lui, a scelta del master; oppure sempre il personaggio, per quelli principali o per tutti, in modo più lento e più costoso, dove la tua app AI lo permette | il master, a volte, personaggi principali, tutti |
| **Il tuo personaggio** | Come viene creato il tuo personaggio nella sessione zero | con il master, dal master, il tuo ([2.7](#27-session-zero-your-character)) |
| **Compagni** | Chi viaggia con te | nessuno, creati con te, creati dal master, incontrati giocando |
| **Immagini** | Immagini di luoghi, missioni e di chi incontri | nessuna, su richiesta, nuovi luoghi, missioni e chi incontri ([3.11](#311-pictures)) |
| **Linee** e **Veli** | Ciò che non appare mai e ciò che accade solo fuori scena | elenchi |
| **Lingua** | La lingua del gioco e della dashboard | qualsiasi |

La quinta edizione aggiunge l'**avanzamento**: punti esperienza o tappe.

Se non c'è un mondo già scritto, il master chiede anche una **Premessa** (genere, tono, qualche elemento e ciò che ti piace di più in un gioco, come scontri, misteri, dialoghi o esplorazione, **A parole tue**), la **Preparazione**: costruire il mondo al volo, man mano, oppure tutto all'inizio; e la **Durata**: una sera, qualche sessione (da tre a cinque sere), oppure aperta, un'avventura dopo l'altra. Alla fine di una storia con una durata puoi sempre continuare.

**Lo stile del master** non viene mai chiesto, ma puoi cambiarlo nella chat o in **Impostazioni**: la **Narrazione** (sobria, letteraria, pulp, ironica), le **Storie** che inventa (situazioni, archi, episodi, mistero), un autore da cui **Scrivi come**, o qualsiasi altra cosa **A parole tue**.

### 2.7 Sessione zero: il tuo personaggio

Crei il tuo personaggio insieme al master, come a un tavolo. Ogni scelta è tua, a meno che tu non chieda al master di farla: puoi arrivare con un'idea completa, con una vaga o con niente; oppure chiedere al master di creare tutto partendo da poche parole. In un gioco con i livelli il master ti chiede da quale livello vuoi partire: il primo, a meno che tu non ne voglia un altro. Il master ti spiega come si determinano i punteggi di caratteristica prima che venga tirato qualsiasi dado. La tua storia non è mai obbligatoria; se ne dai una, il master la scrive con le tue parole. Poi il master ti chiede un'immagine del tuo personaggio ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcola la scheda: i conti non li fai mai tu.

Hai già un personaggio, di un altro gioco o di un'altra campagna? Scegli **Ce l'ho già** nella configurazione e consegnalo al master: incolla la scheda nella chat, oppure di' dove si trova il suo file sul tuo computer (un PDF, un'immagine, un testo). Il master lo scrive così com'è, al suo livello, lo confronta con le regole e con il mondo, e concorda con te tutto ciò che non torna.

---

## 3. Giocare <!-- icon: chat -->

### 3.1 Parlare con il master

Scrivi cosa fa o dice il tuo personaggio, con parole tue:

> Chiedo all'oste chi altro è passato stanotte.

Fuori dalla storia, scrivi `[OOC: …]` (fuori dal personaggio): *[OOC: Come funziona la lotta?]* Il master risponde allo stesso modo.

Tu dici cosa tenti; il master dice cosa succede. Il master non decide mai per il tuo personaggio, e non parla mai del motore. Puoi chiedergli come si usa la dashboard.

**Agire dalla dashboard**: clicca un nome della tua scheda, come un'arma, un incantesimo o una cosa che porti: la sua carta dice cos'è. Scegli cosa ci fai, come **Usa**, poi su chi, nell'elenco o con un clic sulla mappa; oppure clicca una persona per parlarle. La dashboard scrive la tua frase, *Attacco Brigante incappucciato 1 con Mazza.*, che puoi cambiare prima di **Di' al master**. Il master la sente come detta in chat, e la decide come ogni altra. Dove la tua app di IA non la sente da sola, **Copia** te la prepara da incollare in chat.

### 3.2 I tiri

Il master chiede un tiro solo quando l'esito è incerto e conta, e prima dice cosa c'è in gioco. Poi:

- **Sulla dashboard**, un banner mostra un pulsante per ogni prova, come *Acrobazia +4 · con vantaggio*. Cliccalo: i dadi cadono sulla pagina e il master sente il risultato. Puoi anche cliccare la riga della tua scheda che si illumina, lanciare i dadi dal vassoio, o scrivere altro nel banner.
- **A mano**, nell'angolo del banner o nelle **Impostazioni**: il banner ti dice cosa tirare, e lo tiri dalla scheda o dal vassoio.
- **Dadi fisici**, con l'impostazione dei dadi su fisici: scrivi le facce che hai tirato, *[Ho fatto 14.]*, e RPG Engine aggiunge i tuoi modificatori.

**Tiri liberi**: clicca un numero qualsiasi della tua scheda, o apri il vassoio, per tirare per gioco. Non contano mai e il master non li vede.

**I tiri del master** compaiono nella tua colonna dei tiri, tranne quelli segreti. Puoi sempre chiedere *[Quel tiro era vero?]*: per un tiro segreto il master dà un'impronta che prova che era stato fatto prima della tua domanda.

### 3.3 Scene e scontri

La storia procede per **scene**: uno scontro, una conversazione, un'esplorazione, un viaggio, un riposo. Alla fine di ogni scena il gioco salva da solo, la scena entra nel tuo diario e, quando la storia gira, il master scrive le scene dall'ultimo capitolo come un nuovo capitolo del libro della tua storia.

In uno scontro il master racconta ogni turno che non è tuo, e si ferma dove puoi decidere. La **Scena** mostra in cima a chi tocca e chi viene dopo, e la scheda del tuo personaggio accanto alla mappa; l'ordine dei turni, i punti ferita del tuo gruppo e quanto sono feriti i nemici, a parole, restano accanto alla pagina. Se il tuo personaggio cade, i tiri salvezza contro la morte compaiono in grande sulla pagina.

**Ordini permanenti**: di' ai tuoi compagni qualcosa che deve durare, per esempio *D'ora in poi, lasciatene sempre uno vivo*, e il master lo ricorda finché non lo ritiri. I tuoi compagni lo seguono per quanto il loro carattere lo permette, e chi non lo farebbe lo dice. Trovi i tuoi ordini nelle **Impostazioni**, dove puoi aggiungerli e toglierli.

### 3.4 Il tempo, i viaggi e il mondo che si muove

RPG Engine tiene la data. Tra una sessione e l'altra il tempo di gioco si ferma, a meno che tu non scelga in **Impostazioni** di lasciarlo scorrere, per esempio un giorno di gioco per ogni settimana di assenza, o non lo chieda al master. Di' che riposate, *Facciamo un riposo lungo*, e quando il master è d'accordo il riposo restituisce ciò che deve. In un riposo breve il master può chiederti sulla dashboard quanti dadi vita spendi: tirali uno alla volta, guarda quanto cura ciascuno e smetti quando vuoi. Di' dove andate, *Prendiamo la strada a nord verso Rocca*, e RPG Engine calcola la via, la distanza e i giorni, fermandosi quando succede qualcosa lungo la strada. Il denaro si conta nelle monete del gioco, resto compreso.

I cattivi hanno piani con scadenze. A ogni giorno nuovo il master fa avanzare le minacce che il tempo ha spinto avanti, e tu ne vedi i segni, mai l'orologio.

### 3.5 Le mappe

**Mondo** mostra i luoghi che il tuo personaggio conosce, le strade tra loro e il percorso che hai fatto, con la nebbia sul resto. **Scena** mostra la mappa del luogo dove sei, quando ne ha una, con chi sta dove; in uno scontro, nel tuo turno, le caselle che non raggiungi sono velate. Quando il master chiede dove ti muovi, tocca una casella, o scrivila, come *E4*.

**Mondo** tiene anche ciò che sa il tuo personaggio. **Conoscenze** elenca le persone, i luoghi, le fazioni, le creature e le storie che il personaggio conosce, ciascuna come la conosce lui: cercale, o aprine una per leggerla tutta; un nome nel testo porta alla sua pagina. **Documenti** conserva le lettere, gli avvisi e le pagine trovate, da rileggere. **Calendario** mostra la data di oggi, le scadenze delle tue missioni con il tempo che resta e i giorni della storia: un giorno con delle scene porta a quelle scene nella Cronologia del Diario.

### 3.6 Missioni, diario e note

Un incarico che il tuo personaggio accetta diventa una missione nel **Diario**, con i suoi obiettivi, la scadenza e ciò che misura; con la stella la tieni in vista in cima a **Scena**. In **Storia** il **Diario** racconta la tua storia come un libro: il master scrive un capitolo in prosa ogni volta che la storia gira, con le scene dall'ultimo capitolo, nello stile che hai scelto; lo leggi capitolo per capitolo, l'ultimo segnato dal segnalibro, e lo scarichi in Markdown o come pagina web, da stampare o da far leggere. In una partita cominciata prima, chiedi al master di scrivere la storia fin qui. **Cronologia** elenca le scene, numerate, con ciò che è successo in ciascuna. Il **Diario** tiene anche le tue **Note**: sono private, a meno che tu non usi **Condividi** su una di esse; il master la sente come ciò che pensi, mai come un fatto. In **Compagni** leggi i diari dei tuoi compagni: ogni tanto, alla fine di una giornata o di una missione, scrivono qualche riga di ciò che pensano e sentono.

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

Se la cartella della campagna è un repository git, le **Impostazioni** hanno una sezione **Git**, tutta disattivata finché non scegli tu: un commit all'inizio di ogni sessione, a ogni salvataggio e alla fine di ogni scena, e se vuoi anche un push dopo. Un commit è una foto della campagna in quel momento; un push manda le foto al repository online, per esempio su GitHub, così ne hai una copia fuori dal computer. I salvataggi e le tue chat con il master restano fuori dal repository, a meno che tu non li faccia entrare; fai entrare le chat solo se il repository è privato.

### 3.9 Sessioni: fermarsi e tornare

Fermati quando vuoi: *[Fermiamoci qui per stasera.]* È già tutto salvato nei file. Per tornare, avvia il tuo agente nella cartella della campagna e scrivi *continua*: il master ti fa un breve riassunto e va avanti.

### 3.10 L'umore del master

Il robot in cima alla dashboard è il master: il suo volto segue il tono della storia, e non tradisce mai ciò che ancora non sai. Quando la chat è chiusa, dorme.

### 3.11 Le immagini

RPG Engine può far fare immagini dei luoghi che raggiungi, delle missioni che prendi e di chi incontri, come dice l'impostazione **immagini**, e il ritratto del tuo personaggio quando lo chiedi. Usa il tuo Codex o il tuo Claude Code, col tuo account, sul tuo piano e i suoi limiti: **Codex** le dipinge, altrimenti **Claude Code** le disegna. Le **Impostazioni** dicono se questo computer può farle, e se no come prepararlo. Puoi sempre dare un'immagine tua al tuo personaggio o a qualsiasi pagina che vedi: passa col puntatore su una delle sue immagini e nel suo angolo compare un piccolo pulsante con un'immagine (anche con la tastiera, e sempre su un telefono); nel **Mondo** la pagina che apri ha anche **Cambia l'immagine…**, o **Aggiungi un'immagine…** finché non ne ha. La tua prende il posto di quella che ha. Oppure lascia il file nella cartella **inbox** della campagna e di' al master a quale pagina va.

### 3.12 Sicurezza: linee, veli e stop

Le **linee** non compaiono mai nel gioco; i **veli** succedono solo fuori scena. In qualsiasi momento scrivi *[stop]*: il master lascia subito quel contenuto e lo aggiunge alle tue linee.

### 3.13 Cambiare idea

Ogni impostazione può cambiare, in chat o nelle **Impostazioni**. Una decisione che il master prende senza il manuale diventa un **precedente**, così la stessa domanda avrà la stessa risposta la volta dopo.

---

## 4. La dashboard <!-- icon: party -->

Una pagina sul tuo computer, che si apre solo nel browser di quel computer, viva finché la chat è aperta. Quando la chat si chiude mostra *Non collegato*; torna da sola con la chat successiva.

- **Gruppo**: la tua scheda e quelle dei tuoi compagni. Clicca un numero per tirarlo; passaci sopra col mouse per vedere da dove viene e, quando una freccia segna il suo dado, cosa rende il tiro migliore o peggiore. Quando il master ti prepara delle scelte, come a un nuovo livello, un avviso sulla scheda le apre: scegli quando vuoi, leggi le pagine che le opzioni indicano, tira dove un'opzione prevede un tiro e poi conferma; intanto la storia va avanti. Accanto, i tiri.
- **Scena**: dove sei, la sua immagine e la sua mappa, chi c'è, cosa sta succedendo; in uno scontro, i turni e la scheda del tuo personaggio.
- **Diario**: le missioni, la storia come un libro, la sua cronologia, i diari dei compagni, le tue note.
- **Mondo**: la mappa del mondo, ciò che il tuo personaggio sa, i documenti trovati e il calendario.
- **Il vassoio dei dadi**: scegli dadi e modificatore, e tira; ×2 raddoppia i dadi, mai il modificatore, come per un colpo critico.
- **Salvataggi**, **Guida**, **Impostazioni** e **Info**, come icone in fondo alla riga. Le Impostazioni tengono anche le preferenze della pagina: tema, suono dei dadi, set di dadi, e lo **Stile del gioco**, cioè colori, caratteri e figure della pagina: quelli del sistema di gioco, di un tema che hai aggiunto in Pacchetti › Aggiungi, dal catalogo, da un link GitHub, da uno .zip o da una cartella, o quelli della pagina. Se il foglio di stile di un tema rende la pagina difficile da leggere, spegni lì lo **Stile proprio del tema**: le Impostazioni si mostrano sempre senza, all'indirizzo della pagina con `#/settings` in fondo.

Quando il master ti chiede qualcosa, il suo banner resta in alto, in qualsiasi sezione tu sia.

---

## 5. Sistemi di gioco e regole della casa <!-- icon: dice -->

### 5.1 Cos'è un sistema di gioco

I dati di un gioco: la sua scheda, i suoi numeri, le sue creature, gli oggetti, gli incantesimi e il testo delle regole. Ogni campagna gioca un sistema. RPG Engine calcola la scheda e ciò che si spende e ritorna; come funziona un privilegio, il master lo legge nelle regole e decide, come al tavolo.

### 5.2 La quinta edizione

Le razze, le classi, le sottoclassi, un background e un talento della SRD 5.1; i 319 incantesimi, le armi, le armature, gli oggetti magici e i mostri; i capitoli delle regole, che il master legge nel testo esatto; la scheda completa, calcolata.

È un pacchetto a sé: il master lo propone quando prepari una campagna, e lo installa. Una campagna di quinta edizione lo installa da sé la prima volta che si apre su un computer che non ce l'ha, e il master te lo dice.

Puoi giocare anche contenuti che la SRD non ha, da un manuale che possiedi: il master li scrive come pagine della tua campagna, e RPG Engine li tratta come suoi. RPG Engine distribuisce solo contenuti aperti; ciò che il tuo master conosce non ha limiti.

I tuoi manuali possono essere la tua biblioteca: di' al master dove sono, *[I miei manuali sono in D:\Libri\5e.]*, o aggiungi la loro cartella in Pacchetti › Biblioteca, e rispondi di sì nella finestra che il computer ti mostra, una volta sola. RPG Engine li legge su questo computer; ogni campagna usa le cartelle che lì attivi, e il master li consulta quando decide una regola, dopo la SRD, citando il libro e la pagina. Si leggono meglio come testo, o come PDF con il testo selezionabile; un PDF scansionato si legge dalle immagini delle sue pagine, solo su Windows, in qualche minuto e con qualche errore. RPG Engine non cambia mai i tuoi manuali, non ne manda mai il testo da nessuna parte e non lo copia mai in una campagna.

### 5.3 Regole della casa e aggiunte tue

Chiedi al master: *[Regola della casa: un 1 naturale in attacco ti fa cadere l'arma.]* La tiene come accordo del tavolo, o scrive una pagina o un numero della scheda quando serve. Le regole della casa già scritte possono stare come file di testo nella cartella `rules` della campagna.

Quando il master cambia per la tua campagna una pagina del sistema di gioco, come i punti ferita di una creatura o la gittata di un incantesimo, la dashboard la segna con un piccolo asterisco dopo il nome, ovunque compaia. Pacchetti › Installati elenca ciò che è cambiato, sotto il sistema di gioco, accanto a ciò che dava il sistema; una creatura che il tuo personaggio non conosce compare col solo nome. Lì puoi ripristinare una pagina, che torna com'è nel sistema di gioco, quando la scena in corso è finita; la dashboard non può annullarlo, solo il master può riscrivere il cambio.

### 5.4 Aggiungere o importare un sistema tuo

Un sistema di gioco è un pacchetto: il master ne installa uno da npm, da una cartella o da un file, e uno che non è nostro solo col tuo sì, in un modulo del tuo agente o in una finestra del tuo computer. Farne uno è lavoro da sviluppatori, descritto nei documenti di RPG Engine su GitHub. Trasformare un tuo libro in un sistema di gioco non c'è ancora ([In arrivo](#9-coming-later)).

---

## 6. Estensioni <!-- icon: plus -->

Un'estensione aggiunge qualcosa a una campagna oltre al suo sistema di gioco: una funzione come il meteo, che cambia a ogni alba, o lo scasso di una serratura coi dadi. Se ne aggiunge una in Pacchetti › Aggiungi, dall'elenco o col suo nome su npm, una cartella o un file; una che non è nostra porta codice, e arriva solo col tuo sì, in una finestra del tuo computer. Una fatta per un altro sistema di gioco dice quale, e non si aggiunge. In Pacchetti › Installati la aggiorni o la togli; può aggiungerne una anche il master, quando glielo chiedi.

---

## 7. Da dove viene una campagna, e la sua lingua <!-- icon: world -->

### 7.1 Tre modi per avere un mondo

- **Creato al momento**: dalla tua premessa, il master costruisce ogni luogo, persona e trama appena prima che ti serva, e lo conserva.
- **Preparato all'inizio**: lo stesso, con il mondo costruito prima di giocare.
- **Dalla tua avventura o da un tuo libro**: dai al master il suo file, *[Importa questa avventura come nostra campagna: D:\Libri\avventura.pdf. Non dirmi niente di ciò che contiene.]* Si legge meglio come testo, EPUB, documento Word o PDF con il testo selezionabile; un PDF scansionato si legge dalle immagini delle sue pagine, solo su Windows, lentamente e con qualche errore. Lo legge fuori dalla chat il tuo Codex o il tuo Claude Code, altrimenti il master nella chat, sul tuo piano: tutto il documento va a OpenAI o ad Anthropic, sotto i termini del tuo account e la sua scelta sull'addestramento. La dashboard mostra a che punto è; da un romanzo, il master propone da dove cominciare. Scrive i luoghi, i personaggi e i segreti.

Una campagna si gioca una volta: per rigiocare la stessa avventura, crea una campagna nuova.

### 7.2 Le lingue

Una lingua per campagna, quella del master, che la dashboard segue. La dashboard ha 26 lingue. Qualsiasi altra viene tradotta sul tuo computer da Codex o Claude Code, oppure, senza di loro, dal master in chat. I termini della quinta edizione in italiano vengono dalla SRD italiana ufficiale; il testo delle regole resta in inglese, e il master te lo racconta nella tua lingua.

---

## 8. Per curiosi: la cartella della campagna <!-- icon: list -->

Non devi mai aprirla, e contiene i segreti della tua campagna. Ha `campaign.yaml` (le tue impostazioni), `state.yaml` (a che punto è il gioco), `world/` (una pagina markdown per ogni personaggio, luogo, missione e il resto), `rules/` (le tue regole della casa), `images/`, `log.jsonl` (ogni cambiamento), `sessions/` (le tue chat col master in testo, da Claude Code e Codex), `.saves/`, `.player/` (le tue note) e i piccoli file che dicono agli agenti IA dov'è RPG Engine. Le pagine usano il formato di Obsidian. Se cambi una pagina a mano, il master lo sente alla sua risposta successiva.

RPG Engine resta in questa cartella: legge e scrive il gioco solo qui, e non tocca mai gli altri tuoi file; le cartelle dei tuoi manuali le legge soltanto. Fuori, tiene solo cartelle di dati sue (le traduzioni della dashboard, il testo che ha letto dei tuoi manuali, e Codex o Claude Code se gli permetti di installarli) e cartelle temporanee mentre disegna un'immagine. Qualsiasi altra cosa il tuo agente voglia fare sul tuo computer, te la chiede prima. Un sistema di gioco o un'estensione è codice, come ogni pacchetto npm: uno che non è nostro gira sul tuo computer con i tuoi permessi, e RPG Engine lo installa solo col tuo sì, in un modulo del tuo agente o in una finestra del tuo computer. Di' sì solo ai pacchetti di autori di cui ti fidi.

Ogni comando che usa il master si può lanciare anche nella cartella della campagna: `rpg --help` li elenca. Molti stampano i segreti della campagna.

---

## 9. In arrivo <!-- icon: hourglass -->

- **Tu come master**, con l'IA che gioca il gruppo.
- **Modalità autore**: scrivi un'avventura con l'IA, poi la esporti e la condividi.
- **Più giocatori sullo stesso computer**, ognuno con il suo personaggio, a turno nella stessa chat.
- **Altre estensioni**: mondi, funzioni e regole della casa da condividere.
- **Altri giochi**: altri sistemi di gioco, e il tuo.

---

## 10. Domande e problemi <!-- icon: info -->

### Domande

**Devo conoscere le regole?** No. Scegli il mentore tutorial, e chiedi con `[OOC: …]` quando vuoi.

**Il master può barare?** Non può cambiare un tiro fatto da RPG Engine, tranne alla difficoltà storia, né i fatti già stabiliti.

**Costa qualcosa?** RPG Engine è gratuito. Il master gira sul piano del tuo agente, o sul tuo computer con un modello locale. Una serata di gioco è una chat lunga: con i piani più piccoli puoi arrivare al limite prima della fine della serata. Immagini, traduzioni e import usano lo stesso piano. RPG Engine da sé non usa mai una chiave API, che si paga a chiamata: collega il tuo agente col tuo account, non con una chiave.

**Posso giocare dal telefono?** No: il master gira sul tuo computer, e la dashboard si apre solo lì.

**Posso giocare con degli amici?** Non ancora: oggi un giocatore, un personaggio, più i compagni ([In arrivo](#9-coming-later)).

**Posso usare un'altra IA la prossima volta?** Sì: apri la campagna in un altro agente e scrivi *continua*.

### Problemi

**La dashboard non si apre.** Chiedi al master: `[OOC: Qual è il link della dashboard?]`. Funziona solo mentre è aperta una chat di quella campagna: in Claude Code e in Codex parte appena si apre la chat, in Antigravity con il tuo primo messaggio. Nell'app di Claude una chat lasciata a lungo in secondo piano si addormenta, e la pagina con essa: clicca sulla chat, e la pagina torna allo stesso indirizzo.

**Il master non sembra conoscere il gioco.** Il tuo agente non ha caricato RPG Engine. Controlla di averlo avviato nella cartella della campagna e di esserti fidato. In Claude Code, scrivi `/mcp` e ricollega `rpg`. In Codex, `codex mcp list` nella cartella della campagna deve mostrare `rpg`. Se `rpg --version` non viene trovato, installa di nuovo RPG Engine ([2.2](#22-install)).

**Windows non trova `claude`.** Il suo programma di installazione lo segnala in una nota gialla, con la cartella in cui è finito: aggiungi quella cartella al PATH (Proprietà del sistema > Variabili d'ambiente), poi apri un terminale nuovo.

**Aggiornare.** Lancia di nuovo `npm install -g rpg-engine`, poi apri una chat nuova: un master già avviato tiene la versione con cui è partito.

**Il master ricorda qualcosa che ho annullato.** Apri una chat nuova e premi **Ho aperto una chat nuova** in Salvataggi.

**Non compaiono immagini.** Impostazioni > Immagini dice se questo computer può farle, e come.

**L'installazione fallisce, o `rpg` non parte.** `node --version` deve dire 24 o più. Se Windows risponde che l'esecuzione di script è disabilitata, vedi la [2.1](#21-what-you-need). Su Windows, tieni RPG Engine e le campagne fuori da percorsi che contengono `&`.

**Il link della dashboard è cambiato.** Ogni campagna ha il suo indirizzo, sempre lo stesso da una chat all'altra. Cambia solo se un altro programma lo sta già usando: il master ti dà il link nuovo, e da lì in poi resta quello. Una seconda chat della stessa campagna lascia la pagina allo stesso indirizzo, e ne prende il posto quando chiudi la prima.
