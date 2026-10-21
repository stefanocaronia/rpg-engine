<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d 4775a5e9 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
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
- Un **terminal**: pe Windows, Terminal sau PowerShell; pe macOS, Terminal. Ca să deschizi unul într-un dosar, fă clic dreapta pe dosar și alege **Open in Terminal** (Windows) sau **Services > New Terminal at Folder** (macOS).
- Un **agent AI** pentru maestrul de joc ([2.4](#24-connect-your-ai)), cu **cel mai mare model** pe care îl oferă: un model mic poate fi convins mai ușor să dezvăluie secrete sau să încalce regulile.

### 2.2 Instalare

```text
npm install -g rpg-engine
```

`rpg --version` verifică dacă a mers. Folosești `rpg` o singură dată pentru fiecare campanie, ca să o creezi; după aceea, agentul tău pornește singur RPG Engine.

### 2.3 Creează o campanie

Deschide un terminal în dosarul în care îți ții jocurile ([2.1](#21-what-you-need) îți arată cum):

```text
rpg init "The Salt Isles"
```

Comanda creează dosarul `The Salt Isles`, cu o campanie nouă în el; intră în el cu `cd "The Salt Isles"`. Ține minte unde se află: te întorci la el de fiecare dată când joci. Restul îl alegi mai târziu, în chat sau pe dashboard; `rpg init --help` arată opțiunile pe care le poți alege de pe acum, cum ar fi `--language it` sau `--difficulty hard`.

Maestrul de joc nu poate crea o campanie în locul tău: înainte de `init`, nimic nu-i spune agentului tău unde se află RPG Engine.

### 2.4 Conectează-ți AI-ul

Maestrul de joc rulează într-un **agent AI**: o aplicație AI, în terminal sau pe desktop, care poate lucra cu fișierele de pe calculatorul tău, cum ar fi Claude Code sau Codex. Un chat obișnuit, cum ar fi claude.ai sau ChatGPT, sau o aplicație de telefon nu ajunge: maestrul de joc trebuie să poată accesa fișierele campaniei de pe calculatorul tău. Fiecare agent are nevoie de propriul abonament și de propria autentificare: Claude Code un abonament Claude plătit, Codex o autentificare ChatGPT. Îl instalezi o singură dată, de pe pagina lui: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: în dosarul campaniei scrie `claude`. Când te întreabă dacă ai încredere în dosar, alege **Yes, I trust this folder**; atenție, răspunsul selectat deja este *No, exit*.
- **Codex**: în dosarul campaniei scrie `codex` și spune da când te întreabă dacă ai încredere în dosar. În aplicația lui desktop, verifică în setări că memoriile sunt dezactivate pentru chaturile jocului.
- **Alt agent**: pornește-l în dosarul campaniei și dă-i serverul MCP `rpg mcp`. RPG Engine este un server MCP standard: orice agent care acceptă MCP poate fi maestrul de joc, inclusiv cei locali.

Jucăm și testăm cu **Claude Code**; **Codex** este conectat și verificat, dar încă nu s-a jucat o campanie întreagă cu el; `init` configurează și **Gemini CLI**. Campania dezactivează memoria proprie a agentului: jocul trăiește în fișierele lui, astfel încât revenirea la o salvare să însemne cu adevărat o revenire în timp.

### 2.5 Primul chat

Scrie orice, de exemplu *Salut! Hai să începem.* În primul răspuns din fiecare chat, maestrul de joc îți dă **linkul către dashboard**, ceva de genul `http://127.0.0.1:4750`: deschide-l și ține-l lângă chat.

Între mesajele maestrului de joc, agentul tău arată uneltele pe care le folosește: nu deschide detaliile lor (în Claude Code, ctrl+o), pentru că pot dezvălui secrete.

O campanie nouă trece prin trei etape, afișate în partea de sus a dashboardului: **1 Setări** (cum vrei să joci), **2 Sesiunea zero** (îți creezi personajul, în joc), **3 Joc**.

### 2.6 Setări: alegi cum joci

Maestrul de joc întreabă doar ce mai lipsește, câteva întrebări odată; pasul **Setări** al dashboardului arată aceleași întrebări sub formă de carduri. Scrie „decide tu” și maestrul de joc alege. Tot ce setezi poate fi schimbat mai târziu, în chat sau în **Setări**.

| Setare | Ce hotărăște | Valori |
|---|---|---|
| **Mentor** | Cât de mult te învață maestrul de joc regulile | off, hints, tutorial |
| **Dificultate** | Cât de greu e jocul în lume | story, easy, normal, hard, brutal |
| **Letalitate** | Ce înseamnă să cazi într-o luptă | narrative (nu mori niciodată), epic (doar când contează), dice |
| **Salvări** | Când te poți întoarce în timp | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Rigoare** | Cât de strict urmează regulile mâncarea, lumina și călătoria | smooth, rules, simulation |
| **Zaruri** | Cine aruncă zarurile tale | digital, physical |
| **Unități de măsură** | Distanțe și greutăți | metric, imperial |
| **Voices** | Cine vorbește în numele personajelor pe care le întâlnești: în momentele cheie personajul însuși, știind doar ce știe el, după cum alege maestrul de joc; mereu maestrul de joc; sau mereu personajul, pentru cele principale ori pentru toate, mai lent și mai costisitor, acolo unde aplicația ta AI poate | auto, master, important, always |
| **Însoțitori** | Cine călătorește cu tine | none, made with you, made by the master, met in play |
| **Imagini** | Imagini cu locuri, misiuni și cei pe care îi întâlnești | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Linii** și **Văluri** | Ce nu apare niciodată și ce se petrece doar în afara scenei | liste |
| **Limbă** | Limba jocului și a dashboardului | oricare |

Ediția a cincea adaugă **progresia**: puncte de experiență sau borne.

Fără o lume scrisă, maestrul de joc cere și o **premisă** (gen, ton, câteva elemente, în cuvintele tale) și **pregătirea**: lumea se construiește din mers, pe parcurs, sau toată la început.

**Stilul maestrului de joc** nu este întrebat niciodată, dar îl poți schimba în chat sau în **Setări**: **proza** (simplă, literară, pulp, ironică), **poveștile** pe care le inventează (situații, arcuri, episoade, mister), un autor după care să **scrie** sau orice altceva **în cuvintele tale**.

### 2.7 Sesiunea zero: personajul tău

Îți creezi personajul împreună cu maestrul de joc, ca la o masă de joc. Fiecare alegere îți aparține, dacă nu îi ceri maestrului de joc să o facă el: vino cu o idee completă, cu una vagă sau cu nimic. Maestrul de joc îți spune cum se obțin scorurile de abilitate înainte să se arunce vreun zar. Povestea personajului nu e obligatorie; dacă îi dai una, maestrul de joc o scrie în cuvintele tale. Apoi maestrul de joc cere o imagine a personajului tău ([3.7](#37-your-characters-story-and-picture)). RPG Engine calculează fișa: nu faci tu niciodată socotelile.

---

## 3. Jocul <!-- icon: chat -->

### 3.1 Dialogul cu maestrul de joc

Scrie ce face sau ce spune personajul tău, cu cuvintele tale:

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.

Când vorbești în afara poveștii, scrie între paranteze drepte: *[Cum funcționează lupta corp la corp?]* Maestrul de joc răspunde tot între paranteze.

Tu spui ce încerci; maestrul de joc spune ce se întâmplă. Maestrul de joc nu decide niciodată pentru personajul tău și nu vorbește niciodată despre motor. Îl poți întreba cum se folosește dashboardul.

### 3.2 Aruncări

Maestrul de joc cere o aruncare doar când rezultatul este nesigur și contează, și spune mai întâi ce este în joc. Apoi:

- **Pe dashboard**, un banner arată un buton pentru fiecare probă, de exemplu *Acrobatics +4 · with advantage*. Apasă-l: zarurile cad pe pagină, iar maestrul de joc află rezultatul. Poți și să apeși linia din fișă care se luminează, să arunci zarurile din tava pentru zaruri sau să scrii altceva în banner.
- **Manual**, în colțul bannerului sau în **Setări**: bannerul îți spune ce să arunci, iar tu arunci din fișă sau din tava pentru zaruri.
- **Zaruri fizice**, cu setarea pentru zaruri pe fizice: scrii fețele obținute, *[Am aruncat 14.]*, iar RPG Engine adaugă modificatorii tăi.

**Aruncări libere**: apasă orice număr din fișă sau deschide tava pentru zaruri, ca să arunci de plăcere. Ele nu contează niciodată, iar maestrul de joc nu le vede.

**Aruncările maestrului de joc** apar în coloana ta de aruncări, cu excepția celor secrete. Poți oricând să întrebi *[Aruncarea aceea a fost reală?]*: pentru o aruncare secretă, maestrul de joc îți dă o amprentă care dovedește că a fost făcută înainte să întrebi.

### 3.3 Scene și lupte

Povestea se desfășoară în **scene**: o luptă, o conversație, o explorare, o călătorie, un popas. La sfârșitul fiecărei scene jocul se salvează singur, iar scena intră în jurnalul tău.

Într-o luptă, maestrul de joc povestește fiecare tură care nu este a ta și se oprește acolo unde poți decide. **Scenă** arată sus a cui este tura și cine urmează, iar lângă hartă apare fișa personajului tău; ordinea turelor, punctele de viață ale grupului tău și cât de răniți par dușmanii, descriși în cuvinte, rămân lângă pagină. Dacă personajul tău cade, salvările împotriva morții apar mari pe pagină.

### 3.4 Timp, călătorii și lumea care se mișcă

RPG Engine ține evidența datei; între sesiuni nu trece timp. Spune că vă odihniți, *Ne odihnim îndelung*, iar odihna readuce ce trebuie. Spune încotro mergi, *Luăm drumul spre nord, către Rocca*, iar RPG Engine calculează calea, distanța și zilele, oprindu-se când se întâmplă ceva pe drum. Banii sunt socotiți în monedele jocului, inclusiv restul.

Răufăcătorii au planuri cu termene limită. În fiecare zi nouă, maestrul de joc mișcă amenințările pe care timpul le-a avansat, iar tu le vezi semnele, niciodată ceasul în sine.

### 3.5 Hărți

**Lume** arată locurile pe care le cunoaște personajul tău, drumurile dintre ele și poteca pe care ai mers, cu ceață peste restul. **Scenă** arată harta locului în care te afli, când are una, cu cine stă unde; într-o luptă, în rândul tău, căsuțele la care nu poți ajunge sunt acoperite cu văl. Când maestrul de joc te întreabă unde te muți, atinge o căsuță sau scrie-o, de exemplu *E4*.

### 3.6 Misiuni, jurnal și notițe

O sarcină pe care o preia personajul tău devine o misiune în **Jurnal**, cu obiectivele ei, termenul limită și ce măsoară; marcheaz-o cu stea ca să rămână la vedere, sus, în Scenă. Jurnalul îți spune și **povestea**, scenă cu scenă, și păstrează **notițele** tale: private, cu excepția cazului în care **Partajează** una, pe care maestrul de joc o aude ca pe ce gândești tu, niciodată ca pe un fapt.

### 3.7 Povestea și imaginea personajului tău

În fișa ta, cartea **Descriere** are o casetă pentru povestea personajului tău: maestrul de joc o scrie acolo, după ce spui da. Pentru o imagine, dă-i maestrului de joc un fișier (PNG, JPEG, WebP sau SVG, până la 5 MB) împreună cu locul în care se află pe calculatorul tău, sau cere un portret ([3.11](#311-pictures)): *[Fă-mi un portret: păr cărunt într-o coadă împletită, o cicatrice pe bărbie.]*

### 3.8 Salvări și întoarcerea în timp

RPG Engine salvează toată campania la sfârșitul fiecărei scene. Setarea **salvări** hotărăște restul:

| Salvări | Salvezi când vrei | Te întorci |
|---|---|---|
| **permadeath** | nu | niciodată |
| **checkpoint** | nu | la ultima salvare, doar când personajul tău moare |
| **free** | da | la orice salvare |

În orice mod poți **relua de la capăt**, de la începutul jocului sau de la sesiunea zero. Fă asta în chat sau în **Salvări**.

După ce te întorci, **deschide un chat nou**: cel vechi își amintește ce a fost anulat. Scrie *continuă* în chatul nou, apoi apasă **Am deschis un chat nou** în Salvări.

### 3.9 Sesiuni: oprirea și revenirea

Oprește-te oricând vrei: *[Hai să ne oprim aici în seara asta.]* Totul este deja salvat în fișiere. Ca să revii, pornește agentul în folderul campaniei și scrie *continuă*: maestrul de joc îți face un scurt rezumat și merge mai departe.

### 3.10 Dispoziția maestrului de joc

Robotul din partea de sus a dashboardului este maestrul de joc: fața lui urmează tonul poveștii și nu dă niciodată de gol ce nu știi încă. Când chatul este închis, doarme.

### 3.11 Imagini

RPG Engine poate genera imagini cu locurile la care ajungi, misiunile pe care le preiei și personajele pe care le întâlnești, după cum spune setarea **imagini**, și portretul personajului tău, când îl ceri. Folosește ce se află pe calculatorul tău, cu propriul tău cont: **Codex** le pictează, altfel **Claude Code** le desenează. **Setări** arată dacă acest calculator le poate crea și cum se configurează, dacă nu. Îi poți oricând da maestrului de joc o imagine a ta.

### 3.12 Siguranță: linii, văluri și stop

**Liniile** nu apar niciodată în joc; **vălurile** se petrec doar în afara scenei. În orice moment scrie *[stop]*: maestrul de joc renunță imediat la acel conținut și îl adaugă la liniile tale.

### 3.13 Te-ai răzgândit

Orice setare poate fi schimbată, în chat sau în **Setări**. O decizie pe care maestrul de joc o ia fără carte devine un **precedent**, ca aceeași întrebare să primească data viitoare același răspuns.

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

Datele unui joc: fișa, numerele, creaturile, obiectele, vrăjile și textul regulilor. Fiecare campanie folosește un singur sistem. RPG Engine calculează fișa, precum și ce se consumă și ce se reface. Cum funcționează o trăsătură, citește maestrul de joc în reguli și hotărăște, ca la o masă de joc.

### 5.2 Ediția a cincea, inclusă

Rasele, clasele, subclasele, un background și un feat din SRD 5.1; cele 319 de vrăji, armele, armurile, obiectele magice și monștrii; capitolele de reguli, pe care maestrul de joc le citește după textul lor exact; fișa completă, calculată.

Poți juca și conținut care lipsește din SRD, dintr-o carte pe care o ai: maestrul de joc îl scrie sub formă de pagini ale campaniei tale, iar RPG Engine le tratează ca pe ale sale. RPG Engine include doar conținut deschis; ce știe maestrul tău de joc nu are această limită.

Manualele tale pot fi biblioteca campaniei: spune-i maestrului de joc unde sunt, *[Manualele mele sunt în D:\Books\5e.]*, și acceptă în fereastra pe care o arată calculatorul tău. RPG Engine le citește o singură dată, pe acest calculator, iar maestrul de joc le caută când hotărăște o regulă, după SRD, și citează cartea și pagina. Se citesc cel mai bine ca text sau ca PDF-uri al căror text poate fi selectat; un PDF scanat este citit din imaginile paginilor, doar pe Windows, în câteva minute și cu câteva greșeli. RPG Engine nu schimbă niciodată manualele tale, nu trimite nicăieri textul lor și nu îl copiază niciodată într-o campanie.

### 5.3 Reguli ale casei și adăugirile tale

Cere-i maestrului de joc: *[Regulă a casei: un 1 natural la un atac înseamnă că îți scapi arma.]* Maestrul o păstrează ca pe o înțelegere a mesei sau scrie o pagină ori un număr al fișei, când este nevoie. Regulile casei deja scrise pot fi puse ca fișiere text în folderul `rules` al campaniei.

### 5.4 Adăugarea sau importul propriului sistem de joc

Încă nu: azi RPG Engine joacă doar ediția a cincea ([Vine mai târziu](#9-coming-later)).

---

## 6. Extensii <!-- icon: plus -->

Încă nu. O extensie va adăuga ceva unei campanii, peste sistemul ei de joc: o lume, o aventură, o funcție precum vremea, reguli de casă de împărțit.

---

## 7. De unde vine o campanie și limba ei <!-- icon: world -->

### 7.1 Trei moduri de a avea o lume

- **Creată din mers**: pornind de la premisa ta, maestrul de joc construiește fiecare loc, persoană și fir narativ chiar înainte să ai nevoie de ele și le păstrează.
- **Pregătită de la început**: la fel, dar cu lumea construită înainte de joc.
- **Dintr-o aventură sau o carte a ta**: dă-i maestrului de joc fișierul, *[Importă această aventură ca pe campania noastră: D:\Books\adventure.pdf. Nu-mi spune nimic din ce se află în ea.]* Se citește cel mai bine ca text, EPUB, document Word sau PDF al cărui text poate fi selectat; un PDF scanat este citit din imaginile paginilor, doar pe Windows, încet și cu câteva greșeli. Codex sau Claude Code de pe calculatorul tău îl citește în afara chatului, iar dashboardul arată cât a înaintat; dacă pornești de la un roman, maestrul de joc propune de unde să începeți. Maestrul scrie locurile, personajele și secretele.

O campanie se joacă o singură dată: ca să joci din nou aceeași aventură, creează o campanie nouă.

### 7.2 Limbi

O limbă pe campanie, cea a maestrului de joc, pe care o urmează dashboardul. Dashboardul vine cu 26 de limbi. Orice altă limbă este tradusă pe calculatorul tău de Codex sau de Claude Code sau, fără ele, de maestrul de joc în chat. Termenii ediției a cincea în italiană vin din SRD-ul oficial italian; textul regulilor rămâne în engleză, iar maestrul de joc îl povestește în limba ta.

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

**Trebuie să cunosc regulile?** Nu. Alege mentorul în modul tutorial și întreabă între paranteze oricând vrei.

**Poate maestrul de joc să trișeze?** Nu poate schimba o aruncare făcută de RPG Engine, în afară de dificultatea poveste, nici faptele deja stabilite.

**Costă ceva?** RPG Engine este gratuit. Maestrul de joc rulează pe abonamentul agentului tău sau pe calculatorul tău, cu un model local. O seară de joc este un chat lung: pe cele mai mici abonamente poți atinge limita abonamentului înainte să se termine seara. Imaginile și traducerile folosesc același abonament.

**Pot juca pe telefon?** Nu: maestrul de joc rulează pe calculatorul tău, iar dashboardul se deschide doar acolo.

**Pot juca cu prieteni?** Încă nu: astăzi un jucător, un personaj, plus însoțitori ([Mai târziu](#9-coming-later)).

**Pot folosi altă IA data viitoare?** Da: deschide campania în alt agent și scrie *continuă*.

### Probleme

**Dashboardul nu se deschide.** Întreabă maestrul de joc: `[Care e linkul către dashboard?]`. Funcționează doar cât timp un chat este deschis în acea campanie, după primul răspuns al maestrului de joc.

**Maestrul de joc pare să nu cunoască jocul.** Agentul tău nu a încărcat RPG Engine. Verifică dacă l-ai pornit în folderul campaniei și dacă ai avut încredere în el. În Claude Code, scrie `/mcp` și reconectează `rpg`. În Codex, `codex mcp list` în folderul campaniei trebuie să arate `rpg`. Dacă `rpg --version` nu este găsit, instalează din nou RPG Engine ([2.2](#22-install)).

**Actualizare.** Rulează din nou `npm install -g rpg-engine`, apoi deschide un chat nou: un maestru de joc deja pornit păstrează versiunea cu care a început.

**Maestrul de joc își amintește ceva ce am anulat.** Deschide un chat nou și apasă **Am deschis un chat nou** în Salvări.

**Nu apar imagini.** Setări > Imagini spune dacă acest calculator le poate genera și cum.

**Instalarea eșuează sau `rpg` nu pornește.** `node --version` trebuie să arate 22 sau mai nou. Pe Windows, ține RPG Engine și campaniile tale în afara căilor care conțin `&`.

**Linkul dashboardului s-a schimbat.** Alt program a luat adresa obișnuită; maestrul de joc îți dă noul link.
