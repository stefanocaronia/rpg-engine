<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
# RPG Engine: ghidul complet

**RPG Engine** îți permite să joci un joc de rol de masă cu o **IA în rolul de maestru de joc**. Vorbești cu maestrul de joc într-un **chat**; RPG Engine lucrează în spate: **își amintește lumea**, **aruncă zarurile** și **ține socotelile**. Lângă chat ții deschisă în browser o pagină, **dashboardul**, cu fișa ta, zarurile, hărțile și jurnalul.

Ghidul este pentru jucători: nu e nevoie să știi să programezi.

## Pornire rapidă <!-- icon: send -->

1. Instalează **Node.js** de pe [nodejs.org](https://nodejs.org) (versiunea LTS).
2. Instalează un **agent IA**, programul în care rulează maestrul de joc, și autentifică-te: de exemplu Claude Code sau Codex ([2.4](#24-connect-your-ai)).
3. Într-un terminal, instalează RPG Engine: `npm install -g rpg-engine`.
4. Creează o campanie: `rpg init "The Salt Isles"`.
5. Intră în folderul nou, `cd "The Salt Isles"`, și pornește agentul acolo: `claude` pentru Claude Code, `codex` pentru Codex. Spune da când te întreabă dacă ai încredere în folder ([2.4](#24-connect-your-ai)), apoi scrie *Salut! Hai să începem.* Maestrul de joc răspunde cu linkul către dashboard.

## 1. Ce este RPG Engine <!-- icon: about -->

| Cine | Ce face |
|---|---|
| **Tu** | Joci personajul tău: ce face, ce spune și ce încearcă. |
| **Maestrul de joc** (IA) | Spune povestea, joacă pe toți ceilalți, hotărăște ce se întâmplă, cere aruncări. |
| **RPG Engine** | Ține lumea în fișiere, aruncă zarurile, numără punctele de viață, banii, timpul și distanțele, păstrează secretele până le descoperi. |

Lumea rămâne aceeași de la o seară la alta, chiar și într-un chat nou, chiar și cu altă IA:

- **Ce s-a spus rămâne adevărat.** Un ticălos mort rămâne mort.
- **Zarurile sunt reale.** Maestrul de joc nu le poate trunchia, în afară de dificultatea cea mai ușoară, dacă o alegi.
- **Secretele rămân secrete.** Maestrul de joc nu-ți spune niciodată ce nu știe personajul tău.
- **Lumea se mișcă.** Amenințările înaintează cât timp te odihnești sau călătorești, și le vezi semnele.
- **O campanie este un folder** pe calculatorul tău: te oprești când vrei, o reiei mai târziu.

Astăzi RPG Engine joacă un singur sistem de joc, **ediția a cincea**, din System Reference Document 5.1, gratuit. Vor veni și altele ([Mai târziu](#9-coming-later)).

---

## 2. Primii pași <!-- icon: path -->

### 2.1 Ce îți trebuie

- Un calculator cu Windows, macOS sau Linux și un browser web.
- **Node.js 22** sau mai nou, de la [nodejs.org](https://nodejs.org). Vine cu `npm`, care instalează RPG Engine.
- Un **terminal**: pe Windows, Terminal sau PowerShell; pe macOS, Terminal. Ca să deschizi unul într-un dosar, dă clic dreapta pe dosar și alege **Deschide în Terminal** (Windows) sau **Servicii > Terminal nou în dosar** (macOS).
- Un **agent AI** pentru maestrul de joc ([2.4](#24-connect-your-ai)), cu cel mai **mare model** pe care îl oferă: un model mic poate fi convins mai ușor să dezvăluie secrete sau să încalce regulile.

### 2.2 Instalare

```text
npm install -g rpg-engine
```

Cu `rpg --version` verifici dacă a mers. Folosești `rpg` o singură dată pentru fiecare campanie, ca s-o creezi; după aceea, agentul tău pornește singur RPG Engine.

### 2.3 Creează o campanie

Deschide un terminal în dosarul în care ții jocurile ([2.1](#21-what-you-need) îți spune cum):

```text
rpg init "The Salt Isles"
```

Comanda creează dosarul `The Salt Isles`, cu o campanie nouă în el; intră în el cu `cd "The Salt Isles"`. Ține minte unde se află: te întorci la el de fiecare dată când joci. Restul alegerilor le faci mai târziu, în chat sau pe dashboard; `rpg init --help` arată opțiunile cu care poți alege unele lucruri de pe acum, cum ar fi `--language it` sau `--difficulty hard`.

Maestrul de joc nu poate crea o campanie în locul tău: înainte de `init`, nimic nu-i spune agentului unde se află RPG Engine.

### 2.4 Conectează-ți AI-ul

Maestrul de joc rulează într-un **agent AI**: o aplicație AI, în terminal sau pe desktop, care poate lucra cu fișierele de pe calculatorul tău, precum Claude Code sau Codex. Un chat obișnuit, cum sunt claude.ai sau ChatGPT, ori o aplicație de telefon nu ajunge: maestrul de joc trebuie să ajungă la fișierele campaniei de pe calculatorul tău. Fiecare agent are nevoie de propriul abonament și de propria autentificare: Claude Code un abonament Claude plătit, Codex o autentificare ChatGPT. Îl instalezi o singură dată, de pe pagina lui: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: în dosarul campaniei scrie `claude`. Când te întreabă dacă ai încredere în dosar, alege **Yes, I trust this folder**; atenție, răspunsul deja selectat este *No, exit*. Campania are și un mic hook, `rpg --listen`, pe care întrebarea nu îl arată: el îi spune maestrului de joc pe loc când acționezi de pe dashboard.
- **Codex**: în dosarul campaniei scrie `codex` și răspunde afirmativ când te întreabă dacă ai încredere în dosar. În aplicația lui desktop, verifică în setări că memoriile sunt oprite pentru chaturile jocului.
- **Alt agent**: pornește-l în dosarul campaniei și dă-i serverul MCP `rpg mcp`. RPG Engine este un server MCP standard: orice agent care acceptă MCP poate fi maestrul de joc, inclusiv cei locali.

Noi jucăm și testăm cu **Claude Code**; **Codex** este conectat și verificat, dar încă nu s-a jucat o campanie întreagă cu el. Campania oprește memoria proprie a agentului: jocul trăiește în fișierele lui, ca întoarcerea la o salvare să te ducă cu adevărat înapoi.

### 2.5 Primul chat

Scrie orice, de pildă *Salut! Hai să începem.* În primul răspuns din fiecare chat, maestrul de joc îți dă **linkul către dashboard**, ceva de genul `http://127.0.0.1:4750`: deschide-l și ține-l lângă chat.

Între mesajele maestrului de joc, agentul tău arată uneltele pe care le folosește: nu deschide detaliile lor (în Claude Code, ctrl+o), pentru că ele pot arăta secrete.

O campanie nouă trece prin trei etape, afișate sus pe dashboard: **1 Setări** (cum vrei să joci), **2 Sesiunea zero** (îți creezi personajul, în joc), **3 Joc**.

### 2.6 Setări: alegi cum joci

Maestrul de joc întreabă doar ce mai lipsește, câteva întrebări odată; pasul **Setări** de pe dashboard arată aceleași întrebări sub formă de cărți. Scrie „decide tu” și maestrul de joc alege. Totul se poate schimba mai târziu, în chat sau în **Setări**.

| Setare | Ce hotărăște | Valori |
|---|---|---|
| **Mentor** | Cât de mult te învață maestrul de joc regulile | oprit, indicii, tutorial |
| **Dificultate** | Cât de greu e jocul cu tine | poveste, ușor, normal, greu, brutal |
| **Letalitate** | Ce înseamnă să cazi într-o luptă | narativă (nu mori niciodată), epică (doar când contează), zaruri |
| **Salvări** | Când te poți întoarce în timp | permadeath, punct de control, liberă ([3.8](#38-saves-and-going-back)) |
| **Rigoare** | Cât de strict urmează regulile mâncarea, lumina și călătoria | fluidă, reguli, simulare |
| **Zaruri** | Cine aruncă zarurile tale | digitale, fizice |
| **Unități de măsură** | Distanțe și greutăți | metrice, imperiale |
| **Voci** | Cine vorbește pentru personajele pe care le întâlnești: în momentele cheie chiar personajul, care știe doar ce știe el, după cum alege maestrul de joc; mereu maestrul de joc; sau mereu personajul, pentru cele principale ori pentru toate, mai lent și mai costisitor, acolo unde aplicația ta AI poate | auto, maestru, importante, mereu |
| **Însoțitori** | Cine călătorește cu tine | niciunul, creați împreună cu tine, creați de maestrul de joc, întâlniți în joc |
| **Imagini** | Imagini cu locurile, misiunile și cei pe care îi întâlnești | niciuna, la cerere, locuri noi, misiuni și cei pe care îi întâlnești ([3.11](#311-pictures)) |
| **Linii** și **Văluri** | Ce nu apare niciodată și ce se întâmplă doar în afara scenei | liste |
| **Limbă** | Limba jocului și a dashboardului | oricare |

Ediția a cincea adaugă **progresia**: puncte de experiență sau borne.

Dacă nu ai o lume scrisă, maestrul de joc cere și o **premisă** (gen, ton, câteva elemente, în cuvintele tale) și **pregătirea**: lumea se construiește din mers, pe parcurs, sau toată la început.

**Stilul maestrului de joc** nu se întreabă niciodată, dar îl poți schimba în chat sau în **Setări**: **proza** (simplă, literară, pulp, ironică), **poveștile** pe care le inventează (situații, arcuri, episoade, mister), un autor după care să **scrie** sau orice altceva **în cuvintele tale**.

### 2.7 Sesiunea zero: personajul tău

Îți creezi personajul împreună cu maestrul de joc, ca la o masă de joc. Fiecare alegere îți aparține, în afară de cazul în care îi ceri maestrului de joc s-o facă: poți veni cu o idee completă, cu una vagă sau cu nimic. Maestrul de joc îți spune cum se obțin valorile abilităților înainte de a arunca vreun zar. Povestea ta nu este niciodată obligatorie; dacă o dai, maestrul de joc o scrie cu cuvintele tale. Apoi maestrul de joc cere o imagine a personajului tău ([3.7](#37-your-characters-story-and-picture)). RPG Engine calculează fișa: nu faci tu niciodată socotelile.

---

## 3. Jocul <!-- icon: chat -->

### 3.1 Vorbești cu maestrul de joc

Scrie ce face sau ce spune personajul tău, cu cuvintele tale:

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.

Când ieși din poveste, scrie între paranteze drepte: *[Cum funcționează lupta corp la corp?]* Maestrul de joc răspunde tot între paranteze.

Tu spui ce încerci; maestrul de joc spune ce se întâmplă. Maestrul de joc nu hotărăște niciodată pentru personajul tău și nu vorbește niciodată despre motor. Îl poți întreba cum să folosești dashboardul.

**Acțiunea de pe dashboard**: dă clic pe un nume de pe fișă, cum ar fi o armă, o vrajă sau ceva ce porți, apoi pe cel către care e îndreptat; sau dă clic pe o persoană ca să vorbești cu ea. Dashboardul îți scrie propoziția, *Atac Bandit cu glugă 1 cu Buzduganul.*, pe care o poți schimba înainte de **Spune-i maestrului de joc**. Maestrul de joc o aude ca pe ceva spus în chat și hotărăște ca pentru oricare alta. Acolo unde aplicația ta AI nu o poate auzi singură, **Copiază** o pregătește ca s-o lipești în chat.

### 3.2 Aruncări

Maestrul de joc cere o aruncare doar când rezultatul e nesigur și contează, și spune mai întâi ce e în joc. Apoi:

- **Pe dashboard**, un banner arată un buton pentru fiecare probă, de exemplu *Acrobatică +4 · cu vantaggio*. Dă clic pe el: zarurile cad pe pagină, iar maestrul de joc află rezultatul. Poți da clic și pe linia de pe fișă care se luminează, poți arunca zarurile din tavă sau poți scrie altceva în banner.
- **Manual**, în colțul bannerului sau în **Setări**: bannerul îți spune ce să arunci, iar tu arunci de pe fișă sau din tavă.
- **Zaruri fizice**, cu setarea zarurilor pe fizice: scrii fețele pe care le-ai obținut, *[Am aruncat 14.]*, iar RPG Engine adaugă modificatorii tăi.

**Aruncări libere**: dă clic pe orice număr de pe fișă sau deschide tava ca să arunci de plăcere. Nu contează niciodată, iar maestrul de joc nu le vede.

**Aruncările maestrului de joc** apar în coloana ta de aruncări, în afară de cele secrete. Poți întreba oricând *[A fost reală aruncarea aceea?]*: pentru o aruncare secretă, maestrul de joc dă o amprentă care dovedește că a fost făcută înainte să întrebi.

### 3.3 Scene și lupte

Povestea se desfășoară în **scene**: o luptă, o conversație, o explorare, o călătorie, un popas. La sfârșitul fiecărei scene jocul se salvează singur, iar scena intră în jurnalul tău.

Într-o luptă, maestrul de joc spune fiecare tură care nu e a ta și se oprește acolo unde poți hotărî. **Scena** arată sus al cui e rândul și cine urmează, iar fișa personajului tău apare lângă hartă; ordinea turelor, punctele de viață ale grupului tău și cât de răniți arată dușmanii, în cuvinte, rămân lângă pagină. Dacă personajul tău cade, aruncările de salvare la moarte apar mari pe pagină.

### 3.4 Timpul, călătoria și lumea care se mișcă

RPG Engine ține data; între sesiuni nu trece timp. Spune că te odihnești, *Facem o odihnă lungă*, și, odată ce maestrul de joc e de acord, odihna aduce înapoi ce trebuie. Într-o odihnă scurtă, maestrul de joc te poate întreba pe dashboard câte zaruri de viață cheltuiești: le arunci pe rând, vezi cât vindecă fiecare și te oprești când vrei. Spune încotro mergi, *Luăm drumul spre nord, la Rocca*, iar RPG Engine calculează calea, distanța și zilele, oprindu-se când se întâmplă ceva pe drum. Banii se numără în monedele jocului, rest inclus.

Răufăcătorii au planuri cu termene limită. În fiecare zi nouă, maestrul de joc mișcă amenințările pe care timpul le-a făcut să avanseze, iar tu le vezi semnele, niciodată ceasul însuși.

### 3.5 Hărți

**Lume** arată locurile pe care le cunoaște personajul tău, drumurile dintre ele și poteca pe care ai străbătut-o, cu ceață peste restul. **Scenă** arată harta locului unde te afli, când are una, cu cine stă unde; într-o luptă, în tura ta, căsuțele la care nu poți ajunge sunt acoperite cu văl. Când maestrul de joc te întreabă unde te muți, atinge o căsuță sau scrie-o, de exemplu *E4*.

### 3.6 Misiuni, jurnal și notițe

O sarcină pe care o ia personajul tău devine o misiune în **Jurnal**, cu obiectivele ei, termenul limită și ceea ce măsoară; pune-i o stea ca s-o ții la vedere sus, în Scenă. Jurnalul îți spune și **povestea**, scenă cu scenă, și păstrează **notițele** tale: private, în afară de cazul în care **Partajezi** una, pe care maestrul de joc o aude ca pe ceea ce crezi tu, niciodată ca pe un fapt.

### 3.7 Povestea și imaginea personajului tău

Pe fișă, cartea **Descriere** are o casetă pentru povestea personajului tău: maestrul de joc o scrie acolo, după ce spui da. Pentru o imagine, dă-i maestrului de joc un fișier (PNG, JPEG, WebP sau SVG, până la 5 MB) împreună cu locul unde se află pe calculatorul tău, sau cere un portret ([3.11](#311-pictures)): *[Fă-mi un portret: păr cărunt împletit într-o coadă, o cicatrice pe bărbie.]*

### 3.8 Salvări și întoarcerea în timp

RPG Engine salvează toată campania la sfârșitul fiecărei scene. Setarea **salvări** hotărăște restul:

| Salvări | Salvezi când vrei | Te întorci |
|---|---|---|
| **permadeath** | nu | niciodată |
| **punct de control** | nu | la ultima salvare, doar când personajul tău moare |
| **liberă** | da | la orice salvare |

În orice mod poți **relua de la început**, de la începutul jocului sau de la sesiunea zero. Fă-o în chat sau în **Salvări**.

După ce te-ai întors în timp, **deschide un chat nou**: cel vechi își amintește ce a fost anulat. Scrie *continuă* în chatul nou, apoi apasă **Am deschis un chat nou** în Salvări.

### 3.9 Sesiuni: oprirea și reluarea

Oprește-te oricând vrei: *[Ne oprim aici pentru în seara asta.]* Totul e deja salvat în fișiere. Ca să revii, pornește agentul în dosarul campaniei și scrie *continuă*: maestrul de joc îți face un scurt rezumat și merge mai departe.

### 3.10 Dispoziția maestrului de joc

Robotul din partea de sus a dashboardului este maestrul de joc: chipul lui urmează tonul poveștii și nu dă niciodată de gol ce nu știi încă. Când chatul e închis, doarme.

### 3.11 Imagini

RPG Engine poate genera imagini cu locurile la care ajungi, cu misiunile pe care le iei și cu cei pe care îi întâlnești, după cum spune setarea **imagini**, și portretul personajului tău când ceri. Folosește Codex-ul sau Claude Code-ul tău, cu autentificarea ta, în abonamentul tău și în limitele lui: **Codex** le pictează, altfel le desenează **Claude Code**. **Setări** arată dacă acest calculator le poate genera și cum să configurezi asta, dacă nu. Îi poți da oricând maestrului de joc o imagine a ta.

### 3.12 Siguranță: linii, văluri și stop

**Liniile** nu apar niciodată în joc; **vălurile** se petrec doar în afara scenei. În orice moment scrie *[stop]*: maestrul de joc renunță pe loc la acel conținut și îl adaugă la liniile tale.

### 3.13 Te răzgândești

Orice setare se poate schimba, în chat sau în **Setări**. O decizie pe care maestrul de joc o ia fără carte devine un **precedent**, ca aceeași întrebare să primească data viitoare același răspuns.

---

## 4. Dashboardul <!-- icon: party -->

O pagină pe propriul tău calculator, deschisă doar în browserul acelui calculator, activă cât timp chatul este deschis. Când chatul se închide, arată *Not connected*; revine singură la următorul chat.

- **Grup**: fișa ta și fișele însoțitorilor. Apasă un număr ca să-l arunci; ține cursorul deasupra lui ca să vezi de unde vine. Alături, aruncările.
- **Scenă**: unde te afli, imaginea și harta ei, cine este acolo, ce se întâmplă; într-o luptă, turele și fișa personajului tău.
- **Jurnal**: misiuni, povestea, notițele tale.
- **Lume**: harta lumii așa cum o cunoaște personajul tău.
- **Tava pentru zaruri**: alege zarurile și un modificator, apoi aruncă.
- **Salvări**, **Ajutor**, **Setări** și **Despre**, ca pictograme la capătul rândului. Setări cuprinde și preferințele paginii: tema, sunetul zarurilor, setul de zaruri.

Când maestrul de joc te întreabă ceva, bannerul lui rămâne sus, indiferent de secțiunea în care te afli.

---

## 5. Sisteme de joc și reguli ale casei <!-- icon: dice -->

### 5.1 Ce este un sistem de joc

Datele unui singur joc: fișa, numerele, creaturile, obiectele, vrăjile și textul regulilor. Fiecare campanie folosește un singur sistem. RPG Engine calculează fișa, precum și ce se cheltuiește și ce se recuperează. Cum funcționează o abilitate, maestrul de joc citește în reguli și hotărăște, ca la o masă de joc.

### 5.2 Ediția a cincea, inclusă

Rasele, clasele, subclasele, un background și un feat din SRD 5.1; cele 319 de vrăji, armele, armurile, obiectele magice și monștrii; capitolele de reguli, pe care maestrul de joc le citește după textul lor exact; fișa completă, calculată.

Poți juca și conținut care lipsește din SRD, dintr-o carte pe care o deții: maestrul de joc îl scrie sub formă de pagini ale campaniei tale, iar RPG Engine le tratează ca pe ale sale. RPG Engine include doar conținut deschis; ce știe maestrul de joc nu are această limită.

Manualele tale pot deveni biblioteca ta: spune-i maestrului de joc unde sunt, *[Manualele mele sunt în D:\Books\5e.]*, sau adaugă folderul lor în Packages › Library și spune da în fereastra pe care o afișează calculatorul tău, o singură dată. RPG Engine le citește pe acest calculator; fiecare campanie folosește folderele pe care le activezi acolo, iar maestrul de joc le caută când hotărăște o regulă, după SRD, citând cartea și pagina. Se citesc cel mai bine ca text sau ca PDF-uri al căror text poate fi selectat; un PDF scanat este citit din imaginile paginilor sale, doar pe Windows, în câteva minute și cu câteva greșeli. RPG Engine nu îți modifică niciodată manualele, nu le trimite textul nicăieri și nu îl copiază niciodată într-o campanie.

### 5.3 Reguli ale casei și completări proprii

Cere-i maestrului de joc: *[Regulă a casei: un 1 natural la un atac înseamnă că scapi arma.]* Maestrul de joc o păstrează ca pe o înțelegere a mesei sau scrie o pagină ori un număr al fișei, când este nevoie. Regulile casei deja scrise pot fi puse ca fișiere text în folderul `rules` al campaniei.

### 5.4 Adăugarea sau importul propriului sistem de joc

Încă nu: astăzi RPG Engine joacă doar ediția a cincea ([Vine mai târziu](#9-coming-later)).

---

## 6. Extensii <!-- icon: plus -->

Încă nu. O extensie va adăuga ceva unei campanii, peste sistemul ei de joc: o lume, o aventură, o funcție precum vremea, reguli de casă de împărțit.

---

## 7. De unde vine o campanie și limba ei <!-- icon: world -->

### 7.1 Trei feluri de a avea o lume

- **Creată din mers**: pornind de la premisa ta, maestrul construiește fiecare loc, persoană și intrigă chiar înainte să ai nevoie de ele și le păstrează.
- **Pregătită la început**: la fel, dar cu lumea construită înainte de joc.
- **Dintr-o aventură sau o carte a ta**: dă-i maestrului fișierul, *[Importă această aventură ca pe campania noastră: D:\Books\adventure.pdf. Nu-mi spune nimic din ce e în ea.]* Se citește cel mai bine ca text, EPUB, document Word sau PDF cu text selectabil; un PDF scanat se citește din imaginile paginilor, doar pe Windows, lent și cu câteva greșeli. Codex sau Claude Code ale tale îl citesc în afara chatului, sau altfel maestrul din chat, pe abonamentul tău: tot documentul ajunge la OpenAI sau Anthropic, conform termenilor contului tău și alegerii lui privind antrenarea. Dashboardul arată cât a avansat; dintr-un roman, maestrul propune de unde să începi. Maestrul scrie locurile, personajele și secretele.

O campanie se joacă o singură dată: ca să joci din nou aceeași aventură, creează o campanie nouă.

### 7.2 Limbi

O singură limbă pe campanie, cea a maestrului, pe care o urmează dashboardul. Dashboardul vine în 26 de limbi. Orice altă limbă este tradusă pe calculatorul tău de Codex sau Claude Code, sau, fără ele, de maestrul din chat. Termenii ediției a cincea în italiană vin din SRD-ul oficial italian; textul regulilor rămâne în engleză, iar maestrul îl povestește în limba ta.

---

## 8. Pentru curioși: folderul campaniei <!-- icon: list -->

Nu ai nevoie niciodată să îl deschizi și conține secretele campaniei tale. Are `campaign.yaml` (setările tale), `state.yaml` (unde se află jocul), `world/` (câte o pagină markdown pentru fiecare personaj, loc, misiune și restul), `rules/` (regulile tale ale casei), `images/`, `log.jsonl` (fiecare schimbare), `.saves/`, `.player/` (notițele tale) și fișierele mici care spun agenților AI unde se află RPG Engine. Paginile folosesc formatul Obsidian. Dacă schimbi o pagină de mână, maestrul de joc află la următorul răspuns.

RPG Engine rămâne în acest folder: citește și scrie jocul doar aici și nu atinge niciodată alte fișiere ale tale; folderele cu manualele tale le citește doar. În afara lui, păstrează doar foldere de date proprii (traducerile dashboardului, textul citit din manualele tale, iar Codex sau Claude Code dacă îl lași să le instaleze) și foldere temporare cât timp se desenează o imagine. Orice altceva vrea agentul tău să facă pe calculatorul tău, te întreabă mai întâi.

Fiecare comandă folosită de maestrul de joc poate fi rulată și în folderul campaniei: `rpg --help` le listează. Multe afișează secretele campaniei.

---

## 9. Vine mai târziu <!-- icon: hourglass -->

- **Tu ca maestru de joc**, cu AI-ul în rolul grupului.
- **Modul autor**: scrie o aventură cu AI-ul, apoi exportă-o și împarte-o cu alții.
- **Mai mulți jucători pe același calculator**, fiecare cu propriul personaj, pe rând în același chat.
- **Extensii**: setări, aventuri, trăsături și reguli ale casei.
- **Alte jocuri**: mai multe sisteme de joc și ale tale.

---

## 10. Întrebări și probleme <!-- icon: info -->

### Întrebări

**Trebuie să cunosc regulile?** Nu. Alege mentorul tutorial și întreabă între paranteze oricând vrei.

**Poate maestrul să trișeze?** Nu poate schimba o aruncare făcută de RPG Engine, decât la dificultatea poveste, și nici faptele deja stabilite.

**Costă ceva?** RPG Engine este gratuit. Maestrul rulează pe abonamentul agentului tău sau pe calculatorul tău, cu un model local. O seară de joc înseamnă un chat lung: pe cele mai mici abonamente poți atinge limita abonamentului înainte să se termine seara. Imaginile, traducerile și importurile folosesc același abonament. RPG Engine în sine nu folosește niciodată o cheie API, care se plătește la fiecare apel: autentifică-ți agentul cu contul tău, nu cu o cheie.

**Pot juca pe telefon?** Nu: maestrul rulează pe calculatorul tău, iar dashboardul se deschide doar acolo.

**Pot juca cu prieteni?** Încă nu: azi există un jucător, un personaj și însoțitori ([Coming later](#9-coming-later)).

**Pot folosi alt AI data viitoare?** Da: deschide campania în alt agent și scrie *continuă*.

### Probleme

**Dashboardul nu se deschide.** Întreabă maestrul: `[Care e linkul către dashboard?]`. Funcționează doar cât timp e deschis un chat în acea campanie, după primul răspuns al maestrului.

**Maestrul pare să nu cunoască jocul.** Agentul tău nu a încărcat RPG Engine. Verifică dacă l-ai pornit în folderul campaniei și dacă ai avut încredere în el. În Claude Code, scrie `/mcp` și reconectează `rpg`. În Codex, `codex mcp list` în folderul campaniei trebuie să arate `rpg`. Dacă `rpg --version` nu e găsit, instalează din nou RPG Engine ([2.2](#22-install)).

**Actualizare.** Rulează din nou `npm install -g rpg-engine`, apoi deschide un chat nou: un maestru aflat în rulare păstrează versiunea cu care a pornit.

**Maestrul își amintește ceva ce am anulat.** Deschide un chat nou și apasă **Am deschis un chat nou** în Salvări.

**Nu apare nicio imagine.** Setări > Imagini arată dacă acest calculator le poate face și cum.

**Instalarea eșuează sau `rpg` nu pornește.** `node --version` trebuie să arate 22 sau mai nou. Pe Windows, ține RPG Engine și campaniile tale departe de căi care conțin `&`.

**Linkul dashboardului s-a schimbat.** Alt program a luat adresa obișnuită; maestrul îți dă noul link.
