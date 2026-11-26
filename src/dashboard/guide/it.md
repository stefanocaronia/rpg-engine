<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: la guida completa

**RPG Engine** ti permette di giocare a un gioco di ruolo da tavolo con una **IA come master**. Giochi nella **dashboard**, una finestra sul tuo computer con la tua scheda, i dadi, le mappe, il tuo diario e la **chat** con il master. RPG Engine lavora dietro le quinte: **ricorda il mondo**, **tira i dadi** e **tiene i conti**.

Questa guida è per chi gioca: non serve saper programmare.

## Avvio rapido <!-- icon: send -->

1. Installa **Node.js** da [nodejs.org](https://nodejs.org) (la versione LTS).
2. Una volta sola, in un terminale nuovo aperto dopo aver installato Node.js, installa RPG Engine: `npm install -g rpg-engine`. Se Windows risponde che l'esecuzione di script è disabilitata, scrivi una volta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, rispondi di sì e riprova.
3. Scrivi `rpg open`. Ti chiede se mettere l'icona di RPG Engine sul desktop e nel menu: premi Invio per il sì. Da lì in poi avvii RPG Engine dalla sua icona, senza terminale ([2.2](#22-install)).
4. Una finestra mostra le tue campagne. Premi **Nuova campagna**, dalle un nome e premi **Crea** ([2.3](#23-create-a-campaign)): la sua dashboard si apre in una finestra tutta sua.
5. Nella chat con il master, scegli la tua app di IA e il suo modello: Claude Code vuole un piano Claude a pagamento, Codex un account ChatGPT, gratuito o a pagamento ([2.4](#24-connect-your-ai)). Se l'app manca, o non hai fatto l'accesso, la pagina la installa o ti fa accedere. Premi **Apri la chat**, poi **Comincia**. La prima risposta può volerci un paio di minuti; poi il master ti chiede come vuoi giocare, e fate insieme il tuo personaggio.

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
- Un **terminale**, una volta sola, per installare RPG Engine: su Windows, Terminale o PowerShell; su macOS, Terminale. Per aprirne uno in una cartella, fai clic con il tasto destro sulla cartella e scegli **Apri nel Terminale** (Windows) o **Servizi > Nuovo Terminale nella cartella** (macOS). Se Windows risponde che l'esecuzione degli script è disattivata, scrivi una volta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e rispondi di sì.
- Un'**app di IA** per il master, con il tuo account ([2.4](#24-connect-your-ai)): la pagina può installarla al posto tuo. Gioca con il **modello più grande** che offre: un modello piccolo si lascia convincere più facilmente a rivelare segreti o a piegare le regole.

### 2.2 Installazione

```text
npm install -g rpg-engine
rpg open
```

La prima riga installa RPG Engine; con `rpg --version` controlli che sia andato tutto bene. Se npm propone di aggiornarsi, puoi ignorarlo.

`rpg open` apre la finestra di RPG Engine, con le tue campagne. La prima volta ti chiede nel terminale se aggiungere la sua icona al desktop e al menu Start (su un Mac, ad Applicazioni): premi Invio per il sì. Da lì in poi fai doppio clic sull'icona, e il terminale non ti serve più. Senza l'icona, scrivi `rpg open` ogni volta che giochi; `rpg icon` aggiunge l'icona più tardi, e `rpg icon --remove` la toglie.

### 2.3 Creare una campagna

La finestra di RPG Engine mostra le tue campagne come carte, prima l'ultima aperta. Premi **Nuova campagna** e dalle il **Nome**, la **Lingua** e il **Sistema di gioco**: il resto lo crea il master con te. Va in una cartella con il suo nome, dentro la cartella `RPG Engine` della tua cartella utente (su Windows, `C:\Users\<nome>`); **Scegli un'altra cartella…** la mette in una cartella vuota a tua scelta. Sotto **Il master** puoi già scegliere l'app di IA e il modello per la sua prima chat ([2.4](#24-connect-your-ai)). Premi **Crea**: la dashboard della campagna si apre in una finestra tutta sua.

La volta dopo, clicca una carta per aprire la sua campagna; quella aperta lo dice, **Aperta ora**. **Apri una cartella…** aggiunge una campagna che hai già su questo computer. La piccola croce su una carta la toglie dall'elenco: i suoi file restano dove sono.

### 2.4 Collegare la tua IA

Il master gira in un'**app di IA** sul tuo computer, con il tuo account: Claude Code, Codex, OpenCode o Antigravity. Una chat semplice come claude.ai o ChatGPT, o un'app per telefono, non basta: il master deve poter raggiungere i file della campagna sul tuo computer. Ogni app ha bisogno del suo account: Claude Code di un piano Claude a pagamento (Pro o superiore); Codex di un account ChatGPT, gratuito o a pagamento; Antigravity di un account Google, il cui uso gratuito ha limiti settimanali; OpenCode ha alcuni modelli gratuiti per un periodo limitato, oppure usa quelli del tuo fornitore, anche locali.

Nella chat della dashboard scegli l'app in **La tua app di IA**, poi il suo **Modello** e il **Ragionamento del master**: la pagina te li propone. Più ragionamento è più lento e usa più del tuo piano. Un'app che non è pronta dice cosa le serve, con un pulsante che lo fa:

- **Claude Code** e **Codex**: **Installa Claude Code** o **Installa Codex** la scarica nella cartella di RPG Engine su questo computer; **Accedi a Claude Code** o **Accedi a Codex** apre la sua pagina di accesso nel browser. RPG Engine non vede mai la tua password.
- **OpenCode** e **Antigravity**: **Scarica OpenCode** o **Scarica Antigravity** apre il suo sito, da cui la installi. OpenCode gioca senza accesso; ad Antigravity accedi dalla sua app. Poi torna qui e premi **Controlla di nuovo**.

Antigravity è segnata **in prova**: può uscire dal gioco e fare domande a modo suo, quindi per giocare sono meglio Claude Code, Codex o OpenCode. Antigravity conserva le tue chat passate e la sua memoria non si può disattivare: al master viene detto di non leggerle mai. Quello che scrivi va a Google, che potrebbe farlo leggere a delle persone: tieni i dati personali fuori dal gioco. RPG Engine non è un prodotto Google. Noi giochiamo e proviamo RPG Engine soprattutto con **Claude Code**: con le altre non è ancora stata giocata una campagna intera.

Nella chat della dashboard il master tocca il tuo computer solo attraverso RPG Engine: non apre da sé nessuno dei tuoi file. Fuori dalla campagna RPG Engine legge solo ciò che hai scelto tu, dopo il tuo sì in una finestra del tuo computer.

Puoi giocare anche nella chat della tua app di IA, in un terminale o nella sua app desktop ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 La prima chat

Scelti l'app e il modello, premi **Apri la chat**: l'app si avvia, e può volerci qualche secondo. Poi premi **Comincia**, o scrivi quello che vuoi, per esempio *Ciao! Iniziamo.* La prima risposta può richiedere un paio di minuti, mentre il master prepara la scena.

La chat ha una sezione tutta sua, **Gioco**, oppure sta accanto alla pagina: i piccoli pulsanti in cima la mettono **Nella sua scheda**, **A sinistra** o **A destra**, e trascinandone il bordo la allarghi.

Una nuova campagna passa per tre fasi, mostrate in cima alla dashboard: **1 Impostazioni** (come vuoi giocare), **2 Sessione zero** (crei il tuo personaggio, giocando), **3 Gioco**.

### 2.6 Impostazioni: scegliere come giocare

Il master chiede solo ciò che manca ancora, poche domande alla volta; il passo **Impostazioni** della dashboard mostra le stesse domande come schede. Scrivi "decidi tu" e il master sceglie. Tutto si può cambiare dopo, nella chat o in **Impostazioni**.

| Impostazione | Cosa decide | Valori |
|---|---|---|
| **Mentore** | Quanto il master ti insegna le regole | spento, suggerimenti, tutorial |
| **Difficoltà** | Quanto è duro il mondo | storia, facile, normale, difficile, brutale |
| **Letalità** | Cosa significa cadere in uno scontro | narrativa (non si muore mai), epica (solo quando conta), dadi |
| **Salvataggi** | Quando puoi tornare indietro | morte permanente, checkpoint, libero ([3.8](#38-saves-and-going-back)) |
| **Rigore** | Quanto cibo, luce e viaggio seguono da vicino le regole | scorrevole, regole, simulazione |
| **Dadi** | Chi tira i tuoi dadi | digitali, fisici |
| **Unità di misura** | Distanze e pesi | metriche, imperiali |
| **Voci dei personaggi** | Chi parla per i personaggi che incontri, dal master ai personaggi stessi: sempre il master; nei momenti chiave il personaggio in persona, che sa solo ciò che sa lui, a scelta del master; oppure sempre il personaggio, per quelli principali o per tutti, in modo più lento e più costoso, dove la tua app di IA lo permette | il master, a volte, i principali, tutti |
| **Il tuo personaggio** | Come viene creato il tuo personaggio nella sessione zero | con il master, lo crea il master, ce l'ho già ([2.7](#27-session-zero-your-character)) |
| **Compagni** | Chi viaggia con te | nessuno, creati con te, creati dal master, incontrati giocando |
| **Immagini** | Immagini di luoghi, missioni e di chi incontri | nessuna, su richiesta, nuovi luoghi, missioni e chi incontri ([3.11](#311-pictures)) |
| **Mai nel gioco** e **Solo fuori scena** | I temi che non vuoi incontrare, e quelli che accadono solo fuori scena, senza dettagli | elenchi |
| **Lingua** | La lingua del gioco e della dashboard | qualsiasi |

La quinta edizione aggiunge l'**avanzamento**: punti esperienza o traguardi.

Se non c'è un mondo già scritto, il master chiede anche una **Premessa** (genere, tono, qualche elemento e ciò che ti piace di più in un gioco, come scontri, misteri, dialoghi o esplorazione, **A parole tue**), la **Preparazione**: costruire il mondo al momento, man mano, oppure tutto all'inizio; e la **Durata**: una sera, qualche sessione (da tre a cinque sere), oppure senza fine, un'avventura dopo l'altra. Alla fine di una storia con una durata puoi sempre continuare.

**Lo stile del master** non viene mai chiesto, ma puoi cambiarlo nella chat o in **Impostazioni**: la **Narrazione** (asciutta, letteraria, pulp, ironica), le **Storie** che inventa (situazioni, arco narrativo, episodi, mistero), un autore di cui prendere il modo di raccontare (**Scrivi come**), o qualsiasi altra cosa **A parole tue**.

### 2.7 Sessione zero: il tuo personaggio

Crei il tuo personaggio insieme al master, come a un tavolo. Ogni scelta è tua, a meno che tu non chieda al master di farla: puoi arrivare con un'idea completa, con una vaga o con niente; oppure chiedere al master di creare tutto partendo da poche parole. In un gioco con i livelli il master ti chiede da quale livello vuoi partire: il primo, a meno che tu non ne voglia un altro. Il master ti spiega come si determinano i punteggi di caratteristica prima che venga tirato qualsiasi dado. La tua storia non è mai obbligatoria; se ne dai una, il master la scrive con le tue parole. Poi il master ti chiede un'immagine del tuo personaggio ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcola la scheda: i conti non li fai mai tu.

Hai già un personaggio, di un altro gioco o di un'altra campagna? Scegli **Ce l'ho già** nella configurazione e consegnalo al master: incolla la scheda nella chat. Nella chat della tua app puoi anche dire dove si trova il suo file sul tuo computer (un PDF, un'immagine, un testo); nella chat della dashboard il master non apre nessun tuo file. Il master lo scrive così com'è, al suo livello, lo confronta con le regole e con il mondo, e concorda con te tutto ciò che non torna.

### 2.8 L'altra strada: la chat della tua app

Puoi giocare anche nella chat della tua app di IA, in un terminale o nella sua app desktop, con la dashboard aperta accanto. Allora crei la campagna da un terminale, nella cartella dove tieni i tuoi giochi ([2.1](#21-what-you-need) spiega come), sempre con il suo nome: `rpg init "Le Isole del Sale"` crea la cartella `Le Isole del Sale` con una nuova campagna dentro. RPG Engine prepara da sé lì ciò che serve a ogni app.

Avvia la tua app in quella cartella: `claude` per Claude Code, `codex` per Codex, `agy` per Antigravity, `opencode` per OpenCode; oppure apri la cartella nella sua app desktop. Rispondi di sì quando chiede se ti fidi della cartella: attenzione, in Claude Code la risposta già selezionata è *No, exit*. Anche qualsiasi altro agente che supporti MCP può fare da master: avvialo nella cartella della campagna e dagli il server MCP `rpg mcp`.

Scrivi *Ciao! Iniziamo.* Nella sua prima risposta di ogni chat il master ti dà il **link alla tua dashboard**, qualcosa come `http://127.0.0.1:4750`: aprilo accanto alla chat.

- Tra un messaggio e l'altro del master, la tua app mostra gli strumenti che usa: non aprirne i dettagli (in Claude Code, ctrl+o), perché possono mostrare segreti.
- La campagna disattiva la memoria propria dell'app: il gioco vive nei suoi file, così tornare a un salvataggio significa davvero tornare indietro. Nell'app desktop di Codex, controlla nelle impostazioni che le memorie siano disattivate per le chat del gioco.
- Se il master dice di non trovare gli strumenti di RPG Engine, scrivi `rpg init` nella cartella della campagna, poi apri una nuova chat.
- Una campagna la gioca una chat alla volta: finché la tua è aperta, la chat della dashboard aspetta.

---

## 3. Giocare <!-- icon: chat -->

### 3.1 Parlare con il master

Scrivi cosa fa o dice il tuo personaggio, con parole tue:

> Chiedo all'oste chi altro è passato stanotte.

Fuori dalla storia, scrivi `[OOC: …]` (fuori dal personaggio): *[OOC: Come funziona la lotta?]* Il master risponde allo stesso modo; nella chat della dashboard le sue parole fuori dal gioco stanno a parte, segnate OOC.

Nella chat della dashboard scrivi nel riquadro in basso e premi Invio per mandare; Maiusc+Invio va a capo. Mentre il master risponde, **Ferma** lo interrompe, e le tue parole aspettano nel riquadro. Quando il master ti chiede qualcosa, i suoi pulsanti arrivano con la domanda, tiri compresi: cliccane uno, o scrivi la tua risposta. Sotto il riquadro vedi l'app e il modello; dove l'app lo permette, clicca il modello per cambiarlo quando il master ha risposto. **Chiudi la chat** chiude la chat; il gioco resta nei suoi file.

Tu dici cosa tenti; il master dice cosa succede. Il master non decide mai per il tuo personaggio, e non parla mai di RPG Engine. Puoi chiedergli come si usa la dashboard.

**Agire dalla dashboard**: clicca un nome della tua scheda, come un'arma, un incantesimo o una cosa che porti: la sua carta dice cos'è; uno zaino si apre con la sua freccia, e la sua ⓘ ne mostra la carta. Scegli cosa ci fai. Ciò che non ha bisogno di nessuno, come **Equipaggia**, chiede conferma sullo stesso pulsante, *Conferma: Mi equipaggio con Scudo*: premilo di nuovo e va al master. Ciò che fai a qualcuno, come **Attacca**, chiede su chi, nell'elenco o con un clic sulla mappa; poi il pulsante dice tutta la frase, *Attacco Brigante incappucciato 1 con Mazza*, e un clic la manda. Per dirla a modo tuo, clicca una persona per parlarle, o scrivi in chat. Il master la sente come detta in chat, la tratta come ogni altra, e ti chiede con dei pulsanti ciò che hai lasciato fuori. Dove la tua app di IA non ha il campanello, il master la legge appena gli scrivi di nuovo in chat; se la chat era stata chiusa prima, **Ridillo** la manda di nuovo.

### 3.2 I tiri

Il master chiede un tiro solo quando l'esito è incerto e conta, e prima dice cosa c'è in gioco. Poi:

- **Sulla dashboard**, un banner mostra un pulsante per ogni prova, come *Acrobazia +4 · con vantaggio*. Cliccalo: i dadi cadono sulla pagina e il master sente il risultato. Puoi anche cliccare la riga della tua scheda che si illumina, lanciare i dadi dal vassoio, o scrivere altro nel banner.
- **A mano**, nell'angolo del banner o nelle **Impostazioni**: il banner ti dice cosa tirare, e lo tiri dalla scheda o dal vassoio.
- **Dadi fisici**, con l'impostazione dei dadi su fisici: scrivi i numeri usciti, *[Ho fatto 14.]*, e RPG Engine aggiunge i tuoi modificatori.

**Tiri liberi**: clicca un numero qualsiasi della tua scheda, o apri il vassoio, per tirare per gioco. Non contano mai e il master non li vede.

**I tiri del master** compaiono nella tua colonna dei tiri, tranne quelli segreti. Puoi sempre chiedere *[Quel tiro era vero?]*: per un tiro segreto il master dà un codice che prova che il tiro era stato fatto prima della tua domanda.

### 3.3 Scene e scontri

La storia procede per **scene**: uno scontro, una conversazione, un'esplorazione, un viaggio, un riposo. Alla fine di ogni scena il gioco salva da solo, la scena entra nel tuo diario e, a ogni svolta della storia, il master scrive le scene dall'ultimo capitolo come un nuovo capitolo del libro della tua storia.

In uno scontro il master racconta ogni turno che non è tuo, e si ferma dove puoi decidere. La **Scena** mostra in cima a chi tocca e chi viene dopo, e la scheda del tuo personaggio accanto alla mappa; l'ordine dei turni, i punti ferita del tuo gruppo e quanto sono feriti i nemici, a parole, restano nella colonna a lato. Se il tuo personaggio cade, i tiri salvezza contro la morte compaiono in grande sulla pagina.

**Ordini permanenti**: di' ai tuoi compagni qualcosa che deve durare, per esempio *D'ora in poi, lasciatene sempre uno vivo*, e il master lo ricorda finché non lo ritiri. I tuoi compagni lo seguono per quanto il loro carattere lo permette, e chi non lo farebbe lo dice. Trovi i tuoi ordini nelle **Impostazioni**, dove puoi aggiungerli e toglierli.

### 3.4 Il tempo, i viaggi e il mondo che si muove

RPG Engine tiene la data. Tra una sessione e l'altra il tempo di gioco si ferma, a meno che tu non scelga in **Impostazioni** di lasciarlo scorrere, per esempio un giorno di gioco per ogni settimana di assenza, o non lo chieda al master. Di' che riposate, *Facciamo un riposo lungo*, e quando il master è d'accordo il riposo restituisce ciò che deve. In un riposo breve il master può chiederti sulla dashboard quanti dadi vita spendi: tirali uno alla volta, guarda quanto cura ciascuno e smetti quando vuoi. Di' dove andate, *Prendiamo la strada a nord verso Rocca*, e RPG Engine calcola la via, la distanza e i giorni, fermandosi quando succede qualcosa lungo la strada. Il denaro si conta nelle monete del gioco, resto compreso.

I cattivi hanno piani con scadenze. A ogni giorno nuovo il master fa avanzare le minacce che il tempo ha spinto avanti, e tu ne vedi i segni, mai l'orologio.

### 3.5 Le mappe

**Mondo** mostra i luoghi che il tuo personaggio conosce, le strade tra loro e il percorso che hai fatto, con la nebbia sul resto. **Scena** mostra la mappa del luogo dove sei, quando ne ha una, con chi sta dove; in uno scontro, nel tuo turno, le caselle che non raggiungi sono velate. Quando il master chiede dove ti muovi, tocca una casella, o scrivila, come *E4*.

**Mondo** tiene anche ciò che sa il tuo personaggio. **Conoscenze** elenca le persone, i luoghi, le fazioni, le creature e le storie che il personaggio conosce, ciascuna come la conosce lui: cercale, o aprine una per leggerla tutta; un nome nel testo porta alla sua pagina. **Documenti** conserva le lettere, gli avvisi e le pagine trovate, da rileggere. **Calendario** mostra la data di oggi, le scadenze delle tue missioni con il tempo che resta e i giorni della storia: un giorno con delle scene porta a quelle scene nella Cronologia del Diario.

### 3.6 Missioni, diario e note

Un incarico che il tuo personaggio accetta diventa una missione nel **Diario**, con i suoi obiettivi, la scadenza e il conto dei suoi progressi; con la stella la tieni in vista in cima a **Scena**. In **Storia** il **Diario** racconta la tua storia come un libro: il master scrive un capitolo in prosa a ogni svolta della storia, con le scene dall'ultimo capitolo, nello stile che hai scelto; lo leggi capitolo per capitolo, l'ultimo segnato dal segnalibro, e lo scarichi in Markdown o come pagina web, da stampare o da far leggere. In una campagna cominciata prima che ci fosse questo libro, chiedi al master di scrivere la storia fin qui. **Cronologia** elenca le scene, numerate, con ciò che è successo in ciascuna. Il **Diario** tiene anche le tue **Note**: sono private, a meno che tu non usi **Condividi** su una di esse; il master la sente come ciò che pensi, mai come un fatto. In **Compagni** leggi i diari dei tuoi compagni: ogni tanto, alla fine di una giornata o di una missione, scrivono qualche riga di ciò che pensano e sentono.

### 3.7 La storia e l'immagine del tuo personaggio

Sulla tua scheda, la carta **Descrizione** ha una casella per la storia del tuo personaggio: il master la scrive, dopo il tuo sì. Per un'immagine, di' al master dove si trova il file sul tuo computer (PNG, JPEG, WebP o SVG, fino a 5 MB), oppure fai fare un ritratto ([3.11](#311-pictures)): *[Fammi un ritratto: capelli grigi in una treccia, una cicatrice sul mento.]*

### 3.8 Salvataggi e tornare indietro

RPG Engine salva l'intera campagna alla fine di ogni scena. L'impostazione **Salvataggi** decide il resto:

| Salvataggi | Salvare quando vuoi | Tornare indietro |
|---|---|---|
| **morte permanente** | no | mai |
| **checkpoint** | no | all'ultimo salvataggio, solo se il tuo personaggio muore |
| **libero** | sì | a qualsiasi salvataggio |

In ogni modalità puoi **ricominciare**, dall'inizio del gioco o dalla sessione zero. Fallo in chat o in **Salvataggi**.

Dopo essere tornato indietro, **apri una chat nuova**: quella vecchia ricorda ciò che è stato annullato. Nella chat della dashboard premi **Chiudi la chat**, poi **Nuova chat**; nella chat della tua app apri una conversazione nuova (`/clear` in Claude Code). Scrivi *continua* nella chat nuova. Poi di' al master che la chat è nuova: premi **Ho aperto una chat nuova** in Salvataggi, o diglielo in chat. Fino ad allora il master non va avanti.

Se non sai cos'è git, salta questo paragrafo. Se la cartella della campagna è un repository git, le **Impostazioni** hanno una sezione **Git**, tutta disattivata finché non scegli tu: un commit all'inizio di ogni sessione, a ogni salvataggio e alla fine di ogni scena, e se vuoi anche un push dopo. Un commit è una foto della campagna in quel momento; un push manda le foto al repository online, per esempio su GitHub, così ne hai una copia fuori dal computer. I salvataggi e le tue chat con il master restano fuori dal repository, a meno che tu non li faccia entrare; fai entrare le chat solo se il repository è privato.

### 3.9 Sessioni: fermarsi e tornare

Fermati quando vuoi: *[Fermiamoci qui per stasera.]* È già tutto salvato nei file. Per tornare, apri RPG Engine dalla sua icona e clicca la tua campagna. Se avevi lasciato la chat aperta, torna da sola. Se l'avevi chiusa, premi **Riprendi la chat**. Poi premi **Riprendi**: il master ti dice in poche righe dove eravate, e va avanti. Se il gioco è stato chiuso mentre il master stava ancora rispondendo, o mentre una sua domanda ti aspettava, quel pulsante dice invece **Riprendi da qui**. **Nuova chat** apre una chat da capo sullo stesso gioco. Nella chat della tua app, avviala nella cartella della campagna e scrivi *continua*.

### 3.10 L'umore del master

Il robot in cima alla dashboard è il master: il suo volto segue il tono della storia, e non tradisce mai ciò che ancora non sai. Quando la dashboard non è collegata al gioco, dorme.

### 3.11 Le immagini

RPG Engine può far fare immagini dei luoghi che raggiungi, delle missioni che prendi e di chi incontri, come dice l'impostazione **Immagini**, e il ritratto del tuo personaggio quando lo chiedi. La tua app di IA le fa con i suoi mezzi, con il tuo account, sul tuo piano e nei suoi limiti: **Claude** le disegna come immagini vettoriali, **Codex** e **Antigravity** le dipingono, **OpenCode** disegna semplici immagini vettoriali nella chat. In **Impostazioni > Campagna > Immagini** puoi far dipingere le immagini a Codex o ad Antigravity anche quando il tuo master è un'altra app: dove quello che hai scelto non può, le fa la tua chat. Le **Impostazioni** dicono se questo computer può farle, e se no come prepararlo. Puoi sempre dare un'immagine tua al tuo personaggio o a qualsiasi pagina che vedi: passa col puntatore su una delle sue immagini e nel suo angolo compare un piccolo pulsante con un'immagine (anche con la tastiera, e sempre su un telefono); nel **Mondo** la pagina che apri ha anche **Cambia l'immagine…**, o **Aggiungi un'immagine…** finché non ne ha. Col puntatore su un'immagine, o col fuoco sul suo pulsante, puoi anche incollarne una che hai copiato, con Ctrl+V (⌘V su Mac). La tua prende il posto di quella che c'è. Oppure lascia il file nella cartella **inbox** della campagna e di' al master a quale pagina va.

### 3.12 Sicurezza: i tuoi limiti e lo stop

Ciò che metti in **Mai nel gioco** non compare mai; ciò che metti in **Solo fuori scena** succede senza essere mostrato (al tavolo si chiamano *linee* e *veli*). In qualsiasi momento scrivi *[stop]*: il master lascia subito quel contenuto e lo aggiunge a **Mai nel gioco**.

### 3.13 Cambiare idea

Ogni impostazione può cambiare, in chat o nelle **Impostazioni**. Una decisione che il master prende senza il manuale diventa un **precedente**, così la stessa domanda avrà la stessa risposta la volta dopo.

---

## 4. La dashboard <!-- icon: party -->

Una pagina sul tuo computer, in una finestra tutta sua, che si apre solo su quel computer. Resta viva finché la sua finestra è aperta, con o senza chat; circa trenta secondi dopo che l'hai chiusa, il gioco si ferma, e la chat con lui. Non si perde niente: è tutto nei file. Nella chat della tua app, è viva finché quella chat è aperta. Quando il gioco non c'è la pagina mostra *Non collegato*: premi **Riapri la campagna**, oppure, nella tua app, apri la chat successiva. Il pulsante **Campagne**, con la casetta, riporta a tutte le tue campagne.

- **Gioco**: la chat con il master, quando non sta accanto alla pagina ([2.5](#25-the-first-chat)).
- **Gruppo**: la tua scheda e quelle dei tuoi compagni. Clicca un numero per tirarlo; passaci sopra col mouse per vedere da dove viene e, quando una freccia segna il suo dado, cosa rende il tiro migliore o peggiore. Quando il master ti prepara delle scelte, come a un nuovo livello, un avviso sulla scheda le apre: scegli quando vuoi, leggi le pagine che le opzioni indicano, tira dove un'opzione prevede un tiro e poi conferma; intanto la storia va avanti. Accanto, i tiri.
- **Scena**: dove sei, la sua immagine e la sua mappa, chi c'è, cosa sta succedendo; in uno scontro, i turni e la scheda del tuo personaggio.
- **Diario**: le missioni, la storia come un libro, la sua cronologia, i diari dei compagni, le tue note.
- **Mondo**: la mappa del mondo, ciò che il tuo personaggio sa, i documenti trovati e il calendario.
- **Il vassoio dei dadi**: scegli dadi e modificatore, e tira; ×2 raddoppia i dadi, mai il modificatore, come per un colpo critico.
- **Salvataggi**, **Guida**, **Impostazioni** e **Info**, come icone in fondo alla riga. Le Impostazioni tengono anche, sotto **Dashboard**, le preferenze della pagina: modalità, suono dei dadi, set di dadi, e il **Tema**, cioè colori, caratteri e figure della pagina: quelli del sistema di gioco, di un tema che hai aggiunto in Pacchetti › Aggiungi, dal catalogo, da un link GitHub, da uno .zip o da una cartella, o quelli della pagina. Se il foglio di stile di un tema rende la pagina difficile da leggere, spegni lì lo **Stile proprio del tema**: le Impostazioni si mostrano sempre senza, all'indirizzo della pagina con `#/settings/page` in fondo.

Quando il master ti chiede qualcosa, il suo banner resta in alto, in qualsiasi sezione tu sia.

---

## 5. Sistemi di gioco e regole della casa <!-- icon: dice -->

### 5.1 Cos'è un sistema di gioco

I dati di un gioco: la sua scheda, i suoi numeri, le sue creature, gli oggetti, gli incantesimi e il testo delle regole. Ogni campagna usa un sistema. RPG Engine calcola la scheda e ciò che si spende e ritorna; come funziona un privilegio, il master lo legge nelle regole e decide, come al tavolo.

### 5.2 La quinta edizione

Le razze, le classi, le sottoclassi, un background e un talento della SRD 5.1; i 319 incantesimi, le armi, le armature, gli oggetti magici e i mostri; i capitoli delle regole, che il master legge nel testo esatto; la scheda completa, calcolata.

È un pacchetto a sé: il master lo propone quando prepari una campagna, e lo installa. Una campagna di quinta edizione lo installa da sé la prima volta che si apre su un computer che non ce l'ha, e il master te lo dice.

Puoi giocare anche contenuti che la SRD non ha, da un manuale che possiedi: il master li scrive come pagine della tua campagna, e RPG Engine li tratta come suoi. RPG Engine distribuisce solo contenuti aperti; ciò che il tuo master conosce non ha limiti.

I tuoi manuali possono essere la tua biblioteca: di' al master dove sono, *[I miei manuali sono in D:\Libri\5e.]*, o aggiungi la loro cartella in Pacchetti › Biblioteca, e rispondi di sì nella finestra che il computer ti mostra, una volta sola. RPG Engine li legge su questo computer; ogni campagna usa le cartelle che lì attivi, e il master li consulta quando decide una regola, dopo la SRD, citando il libro e la pagina. Si leggono meglio come testo, o come PDF con il testo selezionabile; un PDF scansionato si legge dalle immagini delle sue pagine, solo su Windows, in qualche minuto e con qualche errore. RPG Engine non cambia mai i tuoi manuali, non ne manda mai il testo da nessuna parte e non lo copia mai in una campagna.

### 5.3 Regole della casa e aggiunte tue

Chiedi al master: *[Regola della casa: un 1 naturale in attacco ti fa cadere l'arma.]* La tiene come accordo del tavolo, o scrive una pagina o un numero della scheda quando serve. Le regole della casa già scritte possono stare come file di testo nella cartella `rules` della campagna.

Quando il master cambia per la tua campagna una pagina del sistema di gioco, come i punti ferita di una creatura o la gittata di un incantesimo, la dashboard la segna con un piccolo asterisco dopo il nome, ovunque compaia. Pacchetti › Installati elenca ciò che è cambiato, sotto il sistema di gioco, accanto a ciò che dava il sistema; una creatura che il tuo personaggio non conosce compare col solo nome. Lì puoi ripristinare una pagina, che torna com'è nel sistema di gioco, quando la scena in corso è finita; la dashboard non può annullarlo, solo il master può riscrivere la modifica.

### 5.4 Aggiungere o importare un sistema tuo

Un sistema di gioco è un pacchetto: il master ne installa uno da npm, da una cartella o da un file, e uno che non è nostro solo col tuo sì, in una richiesta del tuo agente o in una finestra del tuo computer. Farne uno è lavoro da sviluppatori, descritto nei documenti di RPG Engine su GitHub. Trasformare un tuo libro in un sistema di gioco non c'è ancora ([In arrivo](#9-coming-later)).

---

## 6. Estensioni <!-- icon: plus -->

Un'estensione aggiunge qualcosa a una campagna oltre al suo sistema di gioco: una funzione come il meteo, che cambia a ogni alba, o lo scasso di una serratura coi dadi. Se ne aggiunge una in Pacchetti › Aggiungi, dall'elenco o col suo nome su npm, una cartella o un file; una che non è nostra porta codice, e arriva solo col tuo sì, in una finestra del tuo computer. Una fatta per un altro sistema di gioco dice quale, e non si aggiunge. In Pacchetti › Installati la aggiorni o la togli; può aggiungerne una anche il master, quando glielo chiedi.

---

## 7. Da dove viene una campagna, e la sua lingua <!-- icon: world -->

### 7.1 Tre modi per avere un mondo

- **Creato al momento**: dalla tua premessa, il master costruisce ogni luogo, persona e trama appena prima che ti serva, e lo conserva.
- **Preparato all'inizio**: lo stesso, con il mondo costruito prima di giocare.
- **Dalla tua avventura o da un tuo libro**: dai al master il suo file, *[Importa questa avventura come nostra campagna: D:\Libri\avventura.pdf. Non dirmi niente di ciò che contiene.]* Un file fuori dalla campagna si legge solo dopo il tuo sì in una finestra del tuo computer; uno che metti nella cartella **inbox** della campagna si legge subito. Si legge meglio come testo, EPUB, documento Word o PDF con il testo selezionabile; un PDF scansionato si legge dalle immagini delle sue pagine, solo su Windows, lentamente e con qualche errore. Lo legge fuori dalla chat la tua app di IA, altrimenti il master nella chat, sul tuo piano: con Claude Code o Codex lo legge uno dei due, con Antigravity il tuo Antigravity, con OpenCode il modello che hai scelto per ultimo. Tutto il documento va a chi ha prodotto quello che lo legge, sotto i termini del tuo account e la sua scelta sull'addestramento. La dashboard mostra a che punto è; da un romanzo, il master propone da dove cominciare. Il master scrive i luoghi, i personaggi e i segreti.

Una campagna si gioca una volta: per rigiocare la stessa avventura, crea una campagna nuova.

### 7.2 Le lingue

Una lingua per campagna, quella del master, che la dashboard segue. La dashboard ha 26 lingue. Qualsiasi altra viene tradotta sul tuo computer dalla tua app di IA fuori dalla chat (Codex o Claude Code; in Antigravity e OpenCode, la loro), oppure, dove nessuna può, dal master in chat. I termini della quinta edizione in italiano vengono dalla SRD italiana ufficiale; il testo delle regole resta in inglese, e il master te lo racconta nella tua lingua.

---

## 8. Per curiosi: la cartella della campagna <!-- icon: list -->

Non devi mai aprirla, e contiene i segreti della tua campagna. Ha `campaign.yaml` (le tue impostazioni), `state.yaml` (a che punto è il gioco), `world/` (una pagina markdown per ogni personaggio, luogo, missione e il resto), `rules/` (le tue regole della casa), `images/`, `log.jsonl` (ogni cambiamento), `sessions/` (le tue chat col master in testo, da Claude Code e Codex), `.saves/`, `.player/` (le tue note) e i piccoli file che dicono agli agenti IA dov'è RPG Engine. Le pagine usano il formato di Obsidian. Se cambi una pagina a mano, il master lo sente alla sua risposta successiva.

RPG Engine resta in questa cartella: legge e scrive il gioco solo qui, e non tocca mai gli altri tuoi file; le cartelle dei tuoi manuali le legge soltanto. Fuori, tiene solo cartelle di dati sue (le traduzioni della dashboard, il testo che ha letto dei tuoi manuali, e Codex o Claude Code se gli permetti di installarli) e cartelle temporanee mentre disegna un'immagine. Qualsiasi altra cosa il tuo agente voglia fare sul tuo computer, te la chiede prima. Un sistema di gioco o un'estensione è codice, come ogni pacchetto npm: uno che non è nostro gira sul tuo computer con i tuoi permessi, e RPG Engine lo installa solo col tuo sì, in una richiesta del tuo agente o in una finestra del tuo computer. Di' sì solo ai pacchetti di autori di cui ti fidi.

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

**Costa qualcosa?** RPG Engine è gratuito. Il master gira sul piano della tua app di IA, o sul tuo computer con un modello locale. Una serata di gioco è una chat lunga: con i piani più piccoli puoi arrivare al limite prima della fine della serata. Immagini, traduzioni e import usano lo stesso piano. RPG Engine da sé non usa mai una chiave API, che si paga a chiamata: collega la tua app di IA col tuo account, non con una chiave.

**Posso giocare dal telefono?** No: il master gira sul tuo computer, e la dashboard si apre solo lì.

**Posso giocare con degli amici?** Non ancora: oggi un giocatore, un personaggio, più i compagni ([In arrivo](#9-coming-later)).

**Posso usare un'altra IA la prossima volta?** Sì: nella chat scegli un'altra app prima di aprirla, oppure apri la campagna in un'altra app e scrivi *continua*.

### Problemi

**Una campagna non si apre.** Riapri RPG Engine dalla sua icona, o con `rpg open` in un terminale, e clicca la campagna. Se la sua dashboard dice *Non collegato*, premi **Riapri la campagna**. Una carta che dice **Cartella non trovata** ha perso la sua cartella: toglila dall'elenco, e aggiungila di nuovo con **Apri una cartella…** da dove si trova ora. Nella chat della tua app, la dashboard funziona solo mentre è aperta una chat di quella campagna: chiedi al master `[OOC: Qual è il link della dashboard?]`. Nell'app di Claude una chat lasciata a lungo in secondo piano si addormenta, e la pagina con essa: clicca sulla chat, e la pagina torna allo stesso indirizzo.

**Il master non sembra conoscere il gioco.** Succede nella chat della tua app: non ha caricato RPG Engine. Controlla di averlo avviato nella cartella della campagna e di aver risposto sì quando ha chiesto se ti fidi della cartella. In Claude Code, scrivi `/mcp` e ricollega `rpg`. In Codex, `codex mcp list` nella cartella della campagna deve mostrare `rpg`. Se `rpg --version` non viene trovato, installa di nuovo RPG Engine ([2.2](#22-install)).

**Windows non trova `claude`.** Succede quando hai installato Claude Code da te. Il suo programma di installazione lo segnala in una nota gialla, con la cartella in cui è finito: aggiungi quella cartella al PATH (Proprietà del sistema > Variabili d'ambiente), poi apri un terminale nuovo.

**Aggiornare.** Quando esce un RPG Engine più nuovo, la dashboard te lo dice: in Pacchetti › Installati, RPG Engine è il primo, con **Aggiorna**; poi fai ciò che ti dice la pagina. Oppure lancia di nuovo `npm install -g rpg-engine` in un terminale, poi apri una chat nuova: un master già avviato tiene la versione con cui è partito.

**Il master ricorda qualcosa che ho annullato.** Apri una chat nuova e premi **Ho aperto una chat nuova** in Salvataggi.

**Un'app non si installa.** La pagina dice perché: premi **Riprova**. Oppure installala da te dal sito di chi la fa, poi premi **Controlla di nuovo**.

**La pagina di accesso non si apre nel browser.** Mentre la pagina ti aspetta, premi **Riapri la pagina d'accesso** dove compare, oppure **Annulla** e riprova.

**La chat della dashboard dice che gioca un'altra chat.** Una chat che hai aperto tu nella tua app di IA sta giocando questa campagna: continua lì, oppure chiudila per giocare nella dashboard.

**Non compaiono immagini.** Impostazioni > Campagna > Immagini dice se questo computer può farle, e come.

**L'installazione fallisce, o `rpg` non parte.** `node --version` deve dire 24 o più. Se Windows risponde che l'esecuzione di script è disabilitata, vedi la [2.1](#21-what-you-need). Su Windows, tieni RPG Engine e le campagne fuori da percorsi che contengono `&`.

**Il link della dashboard è cambiato.** Nella chat della tua app, ogni campagna ha il suo indirizzo, sempre lo stesso da una chat all'altra. Cambia solo se un altro programma lo sta già usando: il master ti dà il link nuovo, e da lì in poi resta quello. Una seconda chat della stessa campagna lascia la pagina allo stesso indirizzo, e ne prende il posto quando chiudi la prima.
