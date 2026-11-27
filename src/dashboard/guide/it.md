<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: la guida completa

**RPG Engine** ti permette di giocare a un gioco di ruolo da tavolo con una **IA come master**. Giochi nella **dashboard**, una finestra sul tuo computer con la tua scheda, i dadi, le mappe, il tuo diario e la **chat** con il master.

Questa guida spiega come si gioca. I pulsanti li spiega la pagina: fermati col puntatore su uno e ti dice cosa fa.

## Avvio rapido <!-- icon: send -->

1. Installa **Node.js** da [nodejs.org](https://nodejs.org) (la versione LTS).
2. Apri un terminale nuovo e scrivi `npm install -g rpg-engine`. Se Windows dice che l'esecuzione di script è disabilitata, scrivi `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, rispondi di sì e riprova.
3. Scrivi `rpg open`: mette l'icona di RPG Engine sul desktop ([2.2](#22-installing)). Da lì in poi avvii RPG Engine dall'icona.
4. Premi **Nuova campagna**, dalle un nome e premi **Crea** ([2.3](#23-a-new-campaign)).
5. Nella chat scegli la tua app di IA e il modello ([2.4](#24-connect-your-ai)): Claude Code vuole un piano Claude a pagamento, Codex un account ChatGPT, anche gratuito. Premi **Apri la chat**, poi **Comincia**.

La prima risposta può volerci un paio di minuti. Poi il master ti chiede come vuoi giocare, e create insieme il tuo personaggio.

## 1. Cos'è RPG Engine <!-- icon: about -->

| Chi | Cosa fa |
|---|---|
| **Tu** | Giochi il tuo personaggio: cosa fa, dice e tenta. |
| **Il master** (l'IA) | Racconta la storia, interpreta tutti gli altri, decide cosa succede, chiede i tiri. |
| **RPG Engine** | Tiene il mondo nei file, tira i dadi, conta punti ferita, denaro, tempo e distanze, custodisce i segreti finché non li scopri. |

Così il mondo resta lo stesso da una sera all'altra, anche in una chat nuova, anche con un'altra IA:

- **Ciò che è stato detto resta vero.** Un cattivo morto resta morto.
- **I dadi sono veri.** Il master non può cambiarli, tranne alla difficoltà più facile.
- **I segreti restano segreti.** Il master non ti dice mai ciò che il tuo personaggio non sa.
- **Il mondo si muove.** Le minacce avanzano mentre riposi o viaggi.
- **Una campagna è una cartella** sul tuo computer: ti fermi quando vuoi, riprendi dopo.

Un gioco arriva come sistema di gioco: oggi il nostro è la **quinta edizione**, dal System Reference Document 5.1 gratuito. Senza, giochi libero: una storia senza numeri.

---

## 2. Per iniziare <!-- icon: path -->

### 2.1 Cosa ti serve

- Un computer con Windows, macOS o Linux.
- **Node.js 24** o più recente, da [nodejs.org](https://nodejs.org).
- Un **terminale**, solo per installare: su Windows, Terminale o PowerShell; su macOS, Terminale.
- Un'**app di IA** per il master, con il tuo account ([2.4](#24-connect-your-ai)).

### 2.2 Installare

```text
npm install -g rpg-engine
rpg open
```

La prima riga installa RPG Engine. Se npm propone di aggiornarsi, puoi ignorarlo.

`rpg open` apre la finestra di RPG Engine. La prima volta mette anche un'icona sul desktop e nel menu: da lì in poi parti dall'icona. Per toglierla, scrivi `rpg icon --remove`.

Se l'installazione non va, controlla che `node --version` dica 24 o più. Se Windows dice che l'esecuzione di script è disabilitata, scrivi `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e rispondi di sì. Su Windows, tieni RPG Engine e le campagne fuori da percorsi che contengono `&`.

### 2.3 Una campagna nuova

Premi **Nuova campagna** e dalle un **Nome**, una **Lingua** e un **Sistema di gioco**. Il resto lo crea il master con te. Premi **Crea**: la campagna si apre in una finestra tutta sua.

Il master e la dashboard parlano la lingua della campagna. Il testo delle regole della quinta edizione resta in inglese, e il master te lo racconta in italiano.

La campagna è una cartella col suo nome, dentro la cartella `RPG Engine` della tua cartella utente. La volta dopo, clicca la sua carta.

### 2.4 La tua app di IA

Il master gira in un'**app di IA** sul tuo computer, con il tuo account. Una chat sul web come claude.ai o ChatGPT non basta: il master deve raggiungere i file della campagna.

- **Claude Code**: un piano Claude a pagamento (Pro o superiore).
- **Codex**: un account ChatGPT, gratuito o a pagamento.
- **OpenCode**: nessun account; alcuni modelli gratuiti per un periodo limitato, oppure quelli del tuo fornitore, anche locali.
- **Antigravity**: un account Google; l'uso gratuito ha limiti settimanali.

Nella chat scegli l'app, il suo **Modello** e il **Ragionamento del master**. Se l'app manca o non hai fatto l'accesso, un pulsante la installa, ti fa accedere o apre il suo sito. RPG Engine non vede mai la tua password.

Una serata di gioco è una chat lunga: con i piani più piccoli puoi arrivare al limite prima della fine della serata. Usa il modello più grande che hai: uno piccolo si lascia convincere più facilmente a rivelare i segreti.

Noi giochiamo e proviamo RPG Engine soprattutto con **Claude Code**. Antigravity è **in prova**: può uscire dal gioco, e tiene le tue chat in una memoria che non si può spegnere. Quello che ci scrivi va a Google, che potrebbe farlo leggere a delle persone. RPG Engine non è un prodotto Google.

### 2.5 La prima chat

Premi **Apri la chat**, poi **Comincia**. La prima risposta può volerci un paio di minuti. Poi una campagna nuova passa per tre fasi:

1. **Impostazioni**: il master ti chiede come vuoi giocare, poche domande alla volta: quanto è duro il mondo, se puoi morire, quando puoi tornare a un salvataggio. Scrivi *decidi tu* e sceglie lui. Tutto si può cambiare dopo.
2. **Sessione zero**: crei il tuo personaggio con il master, come al tavolo. I conti della scheda li fa RPG Engine. Se hai già un personaggio, incolla la sua scheda in chat.
3. **Gioco**: il master prepara la prima scena.

### 2.6 Giocare nella tua app di IA

Puoi giocare anche nella chat della tua app di IA, in un terminale o nella sua app desktop, con la dashboard accanto.

1. Apri un terminale nella cartella dove tieni i tuoi giochi: clic destro sulla cartella e scegli **Apri nel Terminale** (Windows) o **Servizi > Nuovo Terminale nella cartella** (macOS).
2. Scrivi `rpg init "Le Isole del Sale"`: crea la cartella `Le Isole del Sale` con una campagna nuova dentro.
3. Avvia la tua app in quella cartella: `claude`, `codex`, `agy` per Antigravity, oppure `opencode`. Rispondi di sì quando ti chiede se ti fidi della cartella: in Claude Code la risposta già selezionata è *No, exit*.
4. Scrivi *Ciao! Iniziamo.* Il master ti dà il link della tua dashboard: aprilo accanto alla chat.

Da sapere:

- Non aprire i dettagli degli strumenti che usa la tua app (in Claude Code, ctrl+o): possono mostrare segreti.
- Nell'app desktop di Codex, spegni le memorie per le chat del gioco.
- Se il master non conosce il gioco, scrivi `rpg init` nella cartella della campagna e apri una chat nuova.
- Se Windows non trova `claude`, aggiungi al PATH la cartella indicata dal suo programma di installazione, poi apri un terminale nuovo.
- Una campagna la gioca una chat alla volta: finché la tua è aperta, la chat della dashboard aspetta.

---

## 3. Giocare <!-- icon: chat -->

### 3.1 Parlare con il master

Scrivi cosa fa o dice il tuo personaggio:

> Chiedo all'oste chi altro è passato stanotte.

Tu dici cosa tenti; il master dice cosa succede. Non decide mai al posto del tuo personaggio.

Fuori dalla storia, scrivi `[OOC: …]` (fuori dal personaggio): *[OOC: Come funziona la lotta?]* Puoi chiedere al master le regole, o come funziona la dashboard.

Quando il master ti chiede qualcosa, rispondi coi suoi pulsanti o con parole tue. Puoi anche agire dalla scheda: clicca un'arma, un incantesimo o un oggetto, e scegli cosa farci.

**Ordini permanenti**: di' ai tuoi compagni qualcosa che deve durare, per esempio *D'ora in poi, lasciatene sempre uno vivo*. Il master lo ricorda finché non lo ritiri.

### 3.2 I tiri

Il master chiede un tiro solo quando l'esito è incerto e conta. Un banner ti mostra il tiro: cliccalo e i dadi cadono.

I dadi sono di RPG Engine, non del master. Puoi sempre chiedere *[Quel tiro era vero?]*: anche per un tiro segreto, il master può provare che era stato fatto prima della tua domanda.

Con l'impostazione **Dadi** su fisici, tiri i tuoi dadi e scrivi il risultato: *[Ho fatto 14.]* I tiri che fai per gioco, dalla scheda o con **Tiro libero**, non contano mai.

### 3.3 Scene, scontri e viaggi

La storia procede per **scene**: uno scontro, una conversazione, un viaggio, un riposo. Alla fine di ogni scena il gioco salva da solo, e la scena entra nel tuo diario.

In uno scontro il master gioca ogni turno che non è tuo, e si ferma quando devi decidere tu.

Di' dove andate, *Prendiamo la strada a nord verso Rocca*: RPG Engine calcola la distanza e i giorni, e si ferma se lungo la strada succede qualcosa. Intanto i piani dei cattivi vanno avanti, e tu ne vedi i segni.

### 3.4 Salvataggi

RPG Engine salva la campagna alla fine di ogni scena. L'impostazione **Salvataggi** decide quando puoi tornare indietro:

- **morte permanente**: mai.
- **checkpoint**: all'ultimo salvataggio, solo se il tuo personaggio muore.
- **libero**: a qualsiasi salvataggio, e puoi salvare quando vuoi.

In ogni modalità puoi ricominciare da capo, in chat o in **Salvataggi**.

Dopo essere tornato indietro, apri una chat nuova, perché quella vecchia ricorda ciò che hai annullato:

1. Premi **Chiudi la chat**, poi **Nuova chat**. Nella chat della tua app, apri una conversazione nuova (`/clear` in Claude Code).
2. Scrivi *continua*.
3. Premi **Ho aperto una chat nuova** in Salvataggi. Fino ad allora il master aspetta.

### 3.5 Fermarsi e riprendere

Fermati quando vuoi: è già tutto salvato. Chiudi la finestra della dashboard, e poco dopo il gioco si ferma. Non si perde niente.

Per tornare, apri RPG Engine dall'icona e clicca la tua campagna. Premi **Riprendi la chat**, poi **Riprendi**: il master ti ricorda dove eravate e va avanti. La volta dopo puoi anche scegliere un'altra app di IA.

### 3.6 Limiti e stop

Ciò che metti in **Mai nel gioco** non compare mai; ciò che metti in **Solo fuori scena** succede senza essere mostrato. Li scegli nelle **Impostazioni**.

In qualsiasi momento scrivi *[stop]*: il master lascia quel contenuto e lo aggiunge a **Mai nel gioco**.

### 3.7 Immagini

Il master può far fare immagini dei luoghi, delle missioni e delle persone, come dice l'impostazione **Immagini**, e un ritratto del tuo personaggio quando lo chiedi. Le fa la tua app di IA, sul tuo piano. Se non ne compaiono, le **Impostazioni** dicono se questo computer può farle.

Puoi anche dare al tuo personaggio, o a una pagina del mondo, un'immagine tua, dalla pagina stessa.

---

## 4. La dashboard <!-- icon: party -->

La finestra in cui vedi la tua partita. Mostra solo ciò che il tuo personaggio sa.

- **Gioco**: la chat con il master, quando non è accanto alla pagina.
- **Gruppo**: la tua scheda, quelle dei tuoi compagni e i tiri.
- **Scena**: dove ti trovi, chi c'è e la mappa; in uno scontro, i turni.
- **Diario**: le missioni, la storia come un libro, i diari dei tuoi compagni e le tue note.
- **Mondo**: la mappa del mondo, ciò che il tuo personaggio sa, i documenti trovati e il calendario.
- **Salvataggi**: tornare indietro e ricominciare.
- **Impostazioni**: come giochi e come appare la pagina.
- **Pacchetti**: il sistema di gioco, le estensioni, i tuoi manuali e gli aggiornamenti: quando esce un nuovo RPG Engine, lo dice qui.

Se la pagina dice di non essere connessa, premi **Riapri la campagna**.

Per giocare dal telefono, a casa: in **Impostazioni**, **Dashboard**, accendi **Accesso dal telefono** e inquadra il codice col telefono, sulla stessa Wi-Fi del computer. Windows può chiedere se Node.js può usare la rete: consentilo sulle reti private, e imposta la Wi-Fi come rete privata. Il gioco viaggia in chiaro: usalo solo su una rete di cui ti fidi, come quella di casa; mai su una Wi-Fi pubblica, d'albergo o d'ufficio. Spegnilo quando hai finito: il gioco si chiude con l'ultima finestra del computer.

Se un tema rende la pagina difficile da leggere, aggiungi `#/settings/page` alla fine del suo indirizzo e disattiva **Stile proprio del tema**.

---

## 5. Regole, manuali ed estensioni <!-- icon: dice -->

Un **sistema di gioco** sono i dati di un gioco: la scheda, le creature, gli oggetti, gli incantesimi e le regole. RPG Engine calcola la scheda; come si applica una regola, il master lo legge e decide, come al tavolo.

La **quinta edizione** contiene le regole gratuite del System Reference Document 5.1. Puoi giocare anche i contenuti di un manuale che hai: il master li scrive nella tua campagna.

**I tuoi manuali**: di' al master dove sono, o aggiungi la loro cartella in **Pacchetti**. Il master ci cerca le regole e cita il libro e la pagina. RPG Engine non li cambia mai e non li copia mai in una campagna.

**Regole della casa**: chiedile al master, *[Regola della casa: un 1 naturale in attacco ti fa cadere l'arma.]* Lui la tiene. Una decisione che prende una volta vale anche la volta dopo.

Le **estensioni** aggiungono qualcosa al gioco, come il meteo. Le aggiungi in **Pacchetti**, o le chiedi al master.

---

## 6. Un'avventura tua <!-- icon: world -->

Se non c'è un mondo già scritto, il master lo costruisce dalla tua premessa, e lo conserva.

Per giocare un'avventura o un libro che hai, dai al master il suo file: *[Importa questa avventura come nostra campagna: D:\Libri\avventura.pdf. Non dirmi niente di ciò che contiene.]* Un file fuori dalla campagna si legge solo dopo il tuo sì. Si legge meglio come testo, EPUB, Word o PDF con il testo selezionabile.

Tutto il documento va all'azienda dell'IA che lo legge. Una campagna si gioca una volta: per rigiocare la stessa avventura, crea una campagna nuova.

---

## 7. I tuoi dati <!-- icon: lock -->

- Una campagna è una cartella. Contiene i segreti della campagna, anche le tue chat col master: non devi mai aprirla.
- RPG Engine legge e scrive solo in quella cartella. I tuoi manuali li legge soltanto; qualsiasi altra cosa fuori dalla campagna, solo dopo il tuo sì in una finestra del computer.
- Nella chat della dashboard il master non apre da sé nessuno dei tuoi file.
- Quello che scrivi va all'azienda del modello che fa da master, secondo i termini del tuo account. Con un modello locale resta sul tuo computer.
- Un sistema di gioco o un'estensione che non è nostra è codice che gira sul tuo computer: arriva solo col tuo sì. Di' sì solo ad autori di cui ti fidi.
- Se la cartella della campagna è un repository git, le **Impostazioni** possono farne i commit per te. Fai entrare le chat solo se il repository è privato.
- Con l'**Accesso dal telefono** acceso, la partita passa in chiaro dal computer al telefono sulla rete di casa, senza servizi esterni: chi è sulla stessa rete potrebbe leggerla.
