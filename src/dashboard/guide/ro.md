<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: ghidul complet

**RPG Engine** îți permite să joci un joc de rol de masă cu o **IA în rolul de maestru de joc**. Joci în **tabloul de bord**, o fereastră pe calculatorul tău cu fișa ta, zarurile, hărțile, jurnalul și **chatul** cu maestrul de joc. RPG Engine lucrează în spate: **își amintește lumea**, **aruncă zarurile** și **ține socotelile**.

Ghidul este pentru jucători: nu e nevoie să știi să programezi.

## Pornire rapidă <!-- icon: send -->

1. Instalează **Node.js** de pe [nodejs.org](https://nodejs.org) (versiunea LTS).
2. O singură dată, într-un terminal nou, deschis după instalarea Node.js, instalează RPG Engine: `npm install -g rpg-engine`. Dacă Windows răspunde că rularea scripturilor este dezactivată, scrie o singură dată `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, răspunde da și încearcă din nou.
3. Scrie `rpg open`. Te întreabă dacă să pună pictograma RPG Engine pe desktop și în meniu: apasă Enter pentru da. De atunci pornești RPG Engine din pictogramă, fără terminal ([2.2](#22-install)).
4. O fereastră îți arată campaniile. Apasă **Campanie nouă**, dă-i un nume și apasă **Creează** ([2.3](#23-create-a-campaign)): tabloul ei de bord se deschide într-o fereastră proprie.
5. În chatul cu maestrul de joc, alege aplicația ta de AI și modelul ei: Claude Code are nevoie de un abonament Claude cu plată, Codex de un cont ChatGPT, gratuit sau cu plată ([2.4](#24-connect-your-ai)). Dacă aplicația lipsește sau nu ești conectat, pagina o instalează sau te conectează. Apasă **Deschide chatul**, apoi **Începe**. Primul răspuns poate dura câteva minute; apoi maestrul de joc te întreabă cum vrei să joci, iar voi doi creați personajul împreună.

## 1. Ce este RPG Engine <!-- icon: about -->

| Cine | Ce face |
|---|---|
| **Tu** | Îți joci personajul: ce face, ce spune și ce încearcă. |
| **Maestrul de joc** (AI-ul) | Spune povestea, joacă pe toți ceilalți, hotărăște ce se întâmplă, cere aruncări. |
| **RPG Engine** | Ține lumea în fișiere, aruncă zarurile, numără punctele de viață, banii, timpul și distanțele, păstrează secretele până le descoperi. |

Lumea rămâne aceeași de la o seară la alta, chiar și într-un chat nou, chiar și cu un alt AI:

- **Ce s-a spus rămâne adevărat.** Un răufăcător mort rămâne mort.
- **Zarurile sunt adevărate.** Maestrul de joc nu le poate trișa, în afară de dificultatea cea mai ușoară, dacă o alegi.
- **Secretele rămân secrete.** Maestrul de joc nu-ți spune niciodată ce nu știe personajul tău.
- **Lumea se mișcă.** Amenințările înaintează cât timp te odihnești sau călătorești, și vezi semnele lor.
- **O campanie este un folder** pe calculatorul tău: te poți opri oricând, o poți relua mai târziu.

Un joc vine sub forma unui sistem de joc, un pachet pe care maestrul de joc îl instalează pentru campania ta: azi al nostru este **a cincea ediție**, din System Reference Document 5.1, gratuit. Fără unul, joci liber, o poveste fără cifre. Vor veni și altele ([Mai târziu](#9-coming-later)).

---

## 2. Primii pași <!-- icon: path -->

### 2.1 Ce îți trebuie

- Un calculator cu Windows, macOS sau Linux și un browser web.
- **Node.js 24** sau mai nou, de pe [nodejs.org](https://nodejs.org). Vine cu `npm`, care instalează RPG Engine.
- Un **terminal**, o singură dată, ca să instalezi RPG Engine: pe Windows, Terminal sau PowerShell; pe macOS, Terminal. Ca să deschizi unul într-un dosar, dă clic dreapta pe dosar și alege **Deschide în Terminal** (Windows) sau **Servicii > Terminal nou la dosar** (macOS). Dacă Windows răspunde că rularea scripturilor este dezactivată, scrie o singură dată `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` și răspunde da.
- O **aplicație de AI** pentru maestrul de joc, cu contul tău propriu ([2.4](#24-connect-your-ai)): pagina o poate instala pentru tine. Joacă cu **cel mai mare model** pe care îl oferă: un model mic poate fi convins mai ușor să dezvăluie secrete sau să încalce regulile.

### 2.2 Instalare

```text
npm install -g rpg-engine
rpg open
```

Prima linie instalează RPG Engine; `rpg --version` verifică dacă a mers. Dacă npm se oferă să se actualizeze singur, poți ignora oferta.

`rpg open` deschide fereastra RPG Engine, cu campaniile tale. Prima dată, te întreabă în terminal dacă să adauge pictograma pe desktop și în meniul Start (Aplicații pe un Mac): apasă Enter pentru da. De atunci dai dublu clic pe pictogramă și nu mai ai nevoie de terminal. Fără pictogramă, scrie `rpg open` de fiecare dată când joci; `rpg icon` adaugă pictograma mai târziu, iar `rpg icon --remove` o scoate.

### 2.3 Crearea unei campanii

Fereastra RPG Engine îți arată campaniile ca pe niște cartonașe, cea deschisă ultima fiind prima. Apasă **Campanie nouă** și completează **Nume**, **Limbă** și **Sistem de joc**: restul îl faci împreună cu maestrul de joc. Campania se pune într-un dosar cu numele ei, în dosarul `RPG Engine` din dosarul tău de utilizator (pe Windows, `C:\Users\<name>`); **Alege alt dosar…** o pune într-un dosar gol, ales de tine. La **Maestrul de joc** poți alege deja aplicația de AI și modelul pentru primul chat ([2.4](#24-connect-your-ai)). Apasă **Creează**: tabloul de bord al campaniei se deschide într-o fereastră proprie.

Data viitoare, dă clic pe un cartonaș ca să deschizi campania; cea deschisă are mențiunea **Deschisă acum**. **Deschide un dosar…** adaugă o campanie pe care o ai deja pe acest calculator. Cruciulița de pe un cartonaș îl scoate din listă: fișierele rămân unde sunt.

### 2.4 Conectarea AI-ului

Maestrul de joc rulează într-o **aplicație de AI** de pe calculatorul tău, cu contul tău propriu: Claude Code, Codex, OpenCode sau Antigravity. Un chat obișnuit, precum claude.ai sau ChatGPT, sau o aplicație de telefon nu ajunge: maestrul de joc trebuie să poată accesa fișierele campaniei de pe calculatorul tău. Fiecare aplicație are nevoie de propriul cont: Claude Code, un abonament Claude cu plată (Pro sau superior); Codex, un cont ChatGPT, gratuit sau cu plată; Antigravity, un cont Google, a cărui utilizare gratuită are limite săptămânale; OpenCode are câteva modele gratuite pentru o perioadă limitată sau folosește modelele furnizorului tău, inclusiv cele locale.

În chatul din tabloul de bord, alege aplicația la **Aplicația ta de AI**, apoi **Model** și **Gândirea maestrului de joc**: pagina ți le propune. Mai multă gândire înseamnă mai lent și mai mult din abonamentul tău consumat. O aplicație care nu este gata spune ce îi trebuie, cu un buton care face asta:

- **Claude Code** și **Codex**: **Instalează Claude Code** sau **Instalează Codex** o descarcă în dosarul propriu al RPG Engine de pe acest calculator; **Conectează-te la Claude Code** sau **Conectează-te la Codex** deschide pagina de conectare în browser. RPG Engine nu îți vede niciodată parola.
- **OpenCode** și **Antigravity**: **Obține OpenCode** sau **Obține Antigravity** deschide site-ul aplicației, unde o instalezi. OpenCode se joacă fără conectare; Antigravity se conectează din aplicația lui. Apoi revino și apasă **Verifică din nou**.

Antigravity este marcat **în probă**: poate ieși din joc și pune întrebări în felul lui, așa că Claude Code, Codex sau OpenCode sunt mai potrivite pentru joc. Antigravity păstrează chaturile tale anterioare, iar memoria lui nu poate fi oprită: maestrului de joc i se spune să nu le citească niciodată. Ce scrii ajunge la Google, care poate pune oameni să citească: nu introduce date personale în joc. RPG Engine nu este un produs Google. Jucăm și testăm RPG Engine cel mai mult cu **Claude Code**: cu celelalte nu s-a jucat încă o campanie întreagă.

În chatul din tabloul de bord, maestrul de joc atinge calculatorul tău doar prin RPG Engine: nu deschide singur niciun fișier de-al tău. RPG Engine citește în afara campaniei doar ce ai ales, după ce spui da într-o fereastră a calculatorului tău.

Poți juca și în chatul propriu al aplicației tale de AI, într-un terminal sau în aplicația ei desktop ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Primul chat

După ce ai ales aplicația și modelul, apasă **Deschide chatul**: aplicația pornește, ceea ce poate dura câteva secunde. Apoi apasă **Începe** sau scrie orice, de exemplu *Salut! Hai să începem.* Primul răspuns poate dura câteva minute, cât timp maestrul de joc pregătește scena.

Chatul are propria secțiune, **Joc de rol**, sau stă lângă pagină: butoanele mici de deasupra îl pun **În fila proprie**, **În stânga** sau **În dreapta**, iar îi poți trage marginea ca să-l lărgești.

O campanie nouă trece prin trei etape, afișate în partea de sus a dashboardului: **1 Setări** (cum vrei să joci), **2 Sesiunea zero** (îți creezi personajul, în joc), **3 Joc**.

### 2.6 Setări: alegerea modului de joc

Maestrul de joc întreabă doar ce mai lipsește, câteva întrebări odată; pasul **Setări** din dashboard arată aceleași întrebări sub formă de cartonașe. Scrie „alege tu” și maestrul de joc alege. Totul poate fi schimbat mai târziu, în chat sau în **Setări**.

| Setare | Ce hotărăște | Valori |
|---|---|---|
| **Mentor** | Cât te învață maestrul de joc regulile | off, hints, tutorial |
| **Dificultate** | Cât de greu se joacă lumea | story, easy, normal, hard, brutal |
| **Letalitate** | Ce înseamnă să cazi într-o luptă | narrative (nu mori niciodată), epic (doar când contează), dice |
| **Salvări** | Când te poți întoarce | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Rigoare** | Cât de strict urmează regulile hrana, lumina și călătoria | smooth, rules, simulation |
| **Zaruri** | Cine aruncă zarurile tale | digital, physical |
| **Unități de măsură** | Distanțe și greutăți | metric, imperial |
| **Vocile personajelor** | Cine vorbește pentru personajele pe care le întâlnești, de la maestrul de joc la personaje: mereu maestrul de joc; în momentele-cheie personajul însuși, știind doar ce știe el, după alegerea maestrului de joc; sau mereu personajul, pentru cele principale sau pentru toate, mai lent și mai costisitor, acolo unde aplicația ta AI poate | the master, sometimes, main characters, everyone |
| **Personajul tău** | Cum îți este creat personajul în sesiunea zero | with the master, by the master, your own ([2.7](#27-session-zero-your-character)) |
| **Însoțitori** | Cine călătorește cu tine | none, made with you, made by the master, met in play |
| **Imagini** | Imagini cu locuri, misiuni și cei pe care îi întâlnești | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Linii** și **Văluri** | Ce nu apare niciodată și ce se petrece doar în afara scenei | liste |
| **Limbă** | Limba jocului și a dashboardului | oricare |

Ediția a cincea adaugă **progresia**: puncte de experiență sau etape.

Dacă nu ai o lume scrisă, maestrul de joc întreabă și o **Premisă** (gen, ton, câteva elemente și ce îți place cel mai mult într-un joc, de pildă luptele, misterele, dialogurile sau explorarea, în cuvintele tale), **Pregătirea**: construiește lumea din mers, pe parcurs, sau toată de la început; și **Lungimea**: o seară, câteva sesiuni (trei până la cinci seri) sau deschisă, o aventură după alta. La finalul unei povești cu o anumită lungime poți oricând să continui.

**Stilul maestrului de joc** nu este întrebat niciodată, dar îl poți schimba în chat sau în **Setări**: **Proza** (simplă, literară, pulp, ironică), **Poveștile** pe care le inventează (situații, arcuri, episoade, mister), un autor după care să **Scrie ca** sau orice altceva **Cu cuvintele tale**.

### 2.7 Sesiunea zero: personajul tău

Îți creezi personajul împreună cu maestrul de joc, ca la o masă de joc. Fiecare alegere îți aparține, în afară de cazul în care îi ceri maestrului de joc s-o facă: vino cu o idee completă, cu una vagă sau cu nimic; sau cere-i maestrului de joc să facă totul pornind de la câteva cuvinte. Într-un joc cu niveluri, maestrul de joc te întreabă de la ce nivel începi: de la primul, dacă nu vrei altul. Maestrul de joc îți spune cum se stabilesc valorile abilităților înainte să se arunce vreun zar. Povestea ta nu este niciodată obligatorie; dacă dai una, maestrul de joc o scrie în cuvintele tale. Apoi maestrul de joc îți cere o imagine a personajului tău ([3.7](#37-your-characters-story-and-picture)). RPG Engine calculează fișa: nu faci tu niciodată socotelile.

Ai deja un personaj, dintr-un alt joc sau dintr-o altă campanie? Alege **Am deja unul** la configurare și dă-l maestrului de joc: lipește fișa în chat. În chatul propriu al aplicației tale de AI poți spune și unde se află fișierul ei pe calculatorul tău (un PDF, o imagine, un text); în chatul din tabloul de bord, maestrul de joc nu deschide niciun fișier de-al tău. Maestrul de joc o scrie ca atare, la nivelul ei, o verifică în raport cu regulile și cu lumea și stabilește cu tine tot ce nu se potrivește.

### 2.8 Cealaltă variantă: chatul propriu al aplicației tale de AI

Poți juca și în chatul propriu al aplicației tale de AI, într-un terminal sau în aplicația ei desktop, cu tabloul de bord deschis alături. Atunci creezi campania într-un terminal, în dosarul în care ții jocurile tale ([2.1](#21-what-you-need) îți arată cum), mereu cu numele ei: `rpg init "The Salt Isles"` creează dosarul `The Salt Isles` cu o campanie nouă în el. RPG Engine pregătește singur acolo tot ce are nevoie fiecare aplicație.

Pornește aplicația în acel dosar: `claude` pentru Claude Code, `codex` pentru Codex, `agy` pentru Antigravity, `opencode` pentru OpenCode; sau deschide dosarul în aplicația ei desktop. Spune da când te întreabă dacă ai încredere în dosar: atenție, în Claude Code răspunsul deja selectat este *No, exit*. Orice alt agent care acceptă MCP poate fi și el maestrul de joc: pornește-l în dosarul campaniei și dă-i serverul MCP `rpg mcp`.

Scrie *Salut! Hai să începem.* În primul său răspuns din fiecare chat, maestrul de joc îți dă **linkul către tabloul de bord**, ceva de genul `http://127.0.0.1:4750`: deschide-l lângă chat.

- Între mesajele maestrului de joc, aplicația ta arată uneltele pe care le folosește: nu deschide detaliile lor (în Claude Code, ctrl+o), pentru că pot arăta secrete.
- Campania oprește memoria proprie a aplicației: jocul trăiește în fișierele lui, ca revenirea la o salvare să fie cu adevărat o revenire. În aplicația desktop Codex, verifică în setări că memoriile sunt oprite pentru chaturile jocului.
- Dacă maestrul de joc spune că nu găsește uneltele RPG Engine, scrie `rpg init` în dosarul campaniei, apoi deschide un chat nou.
- Un singur chat joacă o campanie la un moment dat: cât timp al tău este deschis, chatul din tabloul de bord așteaptă.

---

## 3. Cum se joacă <!-- icon: chat -->

### 3.1 Dialogul cu maestrul de joc

Scrie ce face sau ce spune personajul tău, cu cuvintele tale:

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.

Când vrei să ieși din poveste, scrie `[OOC: …]` (out of character): *[OOC: Cum funcționează imobilizarea?]* Maestrul de joc răspunde la fel; în chatul din tabloul de bord, cuvintele lui din afara jocului stau separat, marcate cu OOC.

În chatul din tabloul de bord, scrie în caseta de jos și apasă Enter ca să trimiți; Shift+Enter începe un rând nou. Cât timp maestrul de joc răspunde, **Oprește** îl oprește, iar cuvintele tale așteaptă în casetă. Când maestrul de joc te întreabă ceva, butoanele lui vin odată cu întrebarea, inclusiv aruncările: apasă pe unul sau scrie răspunsul. Sub casetă vezi aplicația și modelul; acolo unde aplicația permite, apasă pe model ca să-l schimbi după ce maestrul de joc a răspuns. **Închide chatul** încheie chatul; jocul rămâne în fișierele lui.

Tu spui ce încerci, iar maestrul de joc spune ce se întâmplă. Maestrul de joc nu decide niciodată pentru personajul tău și nu vorbește despre motor. Poți întreba maestrul de joc cum se folosește tabloul de bord.

**Acțiuni din dashboard**: apasă pe un nume din fișa ta, de exemplu o armă, o vrajă sau un obiect pe care îl porți: cartonașul lui spune ce este; o geantă se deschide cu săgeata ei, iar ⓘ-ul ei arată cartonașul. Alege ce faci cu obiectul. O acțiune care nu are nevoie de nimeni, precum **Echipează**, îți cere să confirmi pe același buton, *Confirmă: Echipez Scutul*: apasă-l din nou și acțiunea ajunge la maestrul de joc. O acțiune îndreptată spre cineva, precum **Atacă**, te întreabă spre cine, în listă sau cu un clic pe hartă; apoi butonul spune propoziția întreagă, *Atac Bandit cu glugă 1 cu Buzdugan*, iar un singur clic o trimite. Ca s-o spui în felul tău, apasă pe o persoană cu care vrei să vorbești sau scrie în chat. Maestrul de joc o aude ca pe o replică spusă în chat, o judecă la fel ca pe oricare alta și te întreabă cu butoane ce ai lăsat nespus. Acolo unde aplicația ta AI nu are sonerie, maestrul de joc citește acțiunea de îndată ce scrii următoarea dată în chat; dacă chatul fusese închis înainte, **Spune din nou** o trimite încă o dată.

### 3.2 Aruncări

Maestrul de joc cere o aruncare doar când rezultatul este incert și contează, și spune mai întâi ce este în joc. Apoi:

- **Pe tabloul de bord**, un banner arată un buton pentru fiecare probă, de exemplu *Acrobatică +4 · cu avantaj*. Apasă pe el: zarurile cad pe pagină, iar maestrul de joc află rezultatul. Poți și să apeși pe linia din fișă care se luminează, să arunci zarurile din tava pentru zaruri sau să scrii altceva în banner.
- **Manual**, în colțul bannerului sau în **Setări**: bannerul îți spune ce trebuie să arunci, iar tu arunci din fișă sau din tava pentru zaruri.
- **Zaruri fizice**, cu setarea pentru zaruri pe fizice: scrii fețele pe care le-ai obținut, *[Am aruncat 14.]*, iar RPG Engine adaugă modificatorii tăi.

**Aruncări libere**: apasă pe orice număr din fișă sau deschide tava pentru zaruri, ca să arunci de plăcere. Ele nu contează niciodată, iar maestrul de joc nu le vede.

**Aruncările maestrului de joc** apar în coloana ta de aruncări, cu excepția celor secrete. Poți întreba oricând *[A fost reală aruncarea aceea?]*: pentru o aruncare secretă, maestrul de joc dă o amprentă care dovedește că aruncarea a fost făcută înainte să întrebi.

### 3.3 Scene și lupte

Povestea se desfășoară în **scene**: o luptă, o conversație, o explorare, o călătorie, un popas. La sfârșitul fiecărei scene jocul se salvează singur, scena intră în jurnalul tău, iar când povestea face o cotitură, maestrul de joc scrie scenele de la ultimul capitol ca pe un capitol nou în cartea poveștii tale.

Într-o luptă, maestrul de joc povestește fiecare tură care nu este a ta și se oprește acolo unde poți decide. **Scenă** arată sus al cui este rândul și cine urmează, iar lângă hartă apare cartonașul personajului tău. Ordinea turelor, punctele de viață ale grupului și cât de răniți arată dușmanii, în cuvinte, rămân lângă pagină. Dacă personajul tău cade, aruncările de salvare împotriva morții apar mari pe pagină.

**Ordine permanente**: spune-le însoțitorilor tăi ceva care să dureze, de exemplu *De acum încolo, lăsați mereu pe cineva în viață*, iar maestrul de joc ține minte asta până când o anulezi. Însoțitorii o respectă în măsura în care le permite firea, iar dacă vreunul nu ar face-o, spune deschis. Îți găsești ordinele în **Setări**, unde le poți adăuga și șterge.

### 3.4 Timpul, călătoriile și lumea care se mișcă

RPG Engine ține socoteala datei. Între sesiuni, timpul jocului se oprește, dacă nu alegi în **Setări** să îl lași să treacă, de exemplu o zi de joc pentru fiecare săptămână de absență, sau dacă nu îi ceri maestrului de joc acest lucru. Spune că vă odihniți, *Ne odihnim îndelung*, și, odată ce maestrul de joc este de acord, odihna aduce înapoi ce trebuie. La o odihnă scurtă, maestrul de joc îți poate cere pe tabloul de bord câte zaruri de viață cheltuiești: le arunci pe rând, vezi cât vindecă fiecare și te oprești când vrei. Spune încotro mergeți, *Pornim pe drumul spre nord, către Rocca*, iar RPG Engine calculează drumul, distanța și zilele, oprindu-se când se întâmplă ceva pe cale. Banii se numără în monedele jocului, inclusiv restul.

Răufăcătorii au planuri cu termene limită. În fiecare zi nouă, maestrul de joc mișcă amenințările pe care timpul le-a făcut să avanseze, iar tu le vezi semnele, niciodată ceasul în sine.

### 3.5 Hărți

**Lume** arată locurile pe care le cunoaște personajul tău, drumurile dintre ele și traseul parcurs, cu ceață peste restul. **Scenă** arată harta locului în care te afli, când are una, cu cine se află unde. Într-o luptă, în rândul tău, căsuțele pe care nu le poți atinge sunt acoperite. Când maestrul de joc te întreabă unde te muți, atinge o căsuță sau scrie-o, de exemplu *E4*.

**Lume** păstrează și ce știe personajul tău. **Cunoștințe** enumeră oamenii, locurile, facțiunile, creaturile și poveștile pe care le cunoaște personajul, fiecare așa cum îi este cunoscută: caută în listă sau deschide o intrare ca s-o citești întreagă; un nume din text duce la pagina lui. **Documente** păstrează scrisorile, anunțurile și paginile găsite, ca să le poți reciti. **Calendar** arată ziua de azi, termenele misiunilor tale cu timpul rămas și zilele poveștii: o zi cu scene duce la ele în Cronologia din Jurnal.

### 3.6 Misiuni, jurnal și notițe

O sarcină pe care o preia personajul tău devine o misiune în **Jurnal**, cu obiectivele ei, termenul limită și ce măsoară; marchează-o cu stea ca s-o ai la vedere în partea de sus a paginii Scenă. La **Poveste**, Jurnalul îți spune povestea ca pe o carte: maestrul de joc scrie un capitol în proză de fiecare dată când povestea face o cotitură, relatând scenele de la ultimul capitol, în stilul pe care l-ai ales; citește capitol cu capitol, ultimul fiind marcat cu semnul de carte, și descarcă-l ca Markdown sau ca pagină web, ca să-l tipărești sau să-l dai mai departe. Într-un joc început înainte, cere maestrului de joc să scrie povestea de până acum. **Cronologia** enumeră scenele, numerotate, cu ce s-a întâmplat în fiecare. Jurnalul păstrează și **notițele** tale: private, până când apeși **Partajează** pe una; maestrul de joc o aude ca pe ceea ce gândești tu, niciodată ca pe un fapt. La **Însoțitori** citești jurnalele însoțitorilor tăi: din când în când, la sfârșitul unei zile sau al unei misiuni, ei scriu câteva rânduri despre ce gândesc și ce simt.

### 3.7 Povestea și chipul personajului tău

În fișa ta, cartonașul **Descriere** are o casetă pentru povestea personajului tău: maestrul de joc o scrie acolo, după ce spui da. Pentru o imagine, dă-i maestrului de joc un fișier (PNG, JPEG, WebP sau SVG, până la 5 MB) împreună cu locul unde se află pe calculatorul tău, sau cere un portret ([3.11](#311-pictures)): *[Fă-mi un portret: păr cărunt împletit, o cicatrice pe bărbie.]*

### 3.8 Salvări și întoarcerea în timp

RPG Engine salvează toată campania la sfârșitul fiecărei scene. Setarea **salvări** decide restul:

| Salvări | Salvezi când vrei | Te întorci |
|---|---|---|
| **permadeath** | nu | niciodată |
| **checkpoint** | nu | la ultima salvare, doar când personajul tău moare |
| **liberă** | da | la orice salvare |

În toate modurile poți **începe de la capăt**, de la începutul jocului sau de la sesiunea zero. Fă asta în chat sau în **Salvări**.

După ce te-ai întors în timp, **deschide un chat nou**: cel vechi își amintește ce a fost anulat. În chatul din tabloul de bord, apasă **Închide chatul**, apoi **Chat nou**; în chatul propriu al aplicației tale de AI, deschide o conversație nouă (`/clear` în Claude Code). Scrie *continuă* în chatul nou. Apoi spune-i maestrului de joc că chatul este nou: apasă **Am deschis un chat nou** în Salvări sau spune-o în chat. Până atunci, maestrul de joc nu merge mai departe.

Dacă nu știi ce este git, sari peste acest paragraf. Dacă dosarul campaniei este un depozit git, **Setări** are o secțiune **Git**, cu totul oprit până când alegi tu: un commit la începutul fiecărei sesiuni, la fiecare salvare și la sfârșitul fiecărei scene, plus un push după aceea, dacă vrei. Un commit este o instantanee a campaniei din acel moment; un push trimite instantaneele către depozitul online, de exemplu pe GitHub, ca o copie să existe și în afara acestui calculator. Salvările și chaturile tale cu maestrul de joc rămân în afara depozitului, dacă nu le permiți să intre; permite intrarea chaturilor doar dacă depozitul este privat.

### 3.9 Sesiuni: oprirea și revenirea

Oprește-te oricând vrei: *[Să ne oprim aici pentru în seara asta.]* Totul este deja salvat în fișiere. Ca să revii, deschide RPG Engine din pictogramă și dă clic pe campania ta. Dacă ai lăsat chatul deschis, revine singur. Dacă l-ai închis, apasă **Reia chatul**. Apoi apasă **Reia povestea**: maestrul de joc îți spune în câteva rânduri unde ai rămas și merge mai departe. Dacă jocul a fost închis cât timp maestrul de joc încă răspundea sau cât timp o întrebare a lui te aștepta, butonul acela spune în schimb **Continuă de aici**. **Chat nou** deschide un chat proaspăt pe același joc. În chatul propriu al aplicației tale de AI, pornește-l în dosarul campaniei și scrie *continuă*.

### 3.10 Starea de spirit a maestrului de joc

Robotul din partea de sus a tabloului de bord este maestrul de joc: chipul lui urmează tonul poveștii și nu dezvăluie niciodată ce nu știi încă. Când tabloul de bord nu este conectat la joc, robotul doarme.

### 3.11 Imagini

RPG Engine poate genera imagini cu locurile la care ajungi, misiunile pe care le preiei și persoanele pe care le întâlnești, după cum hotărăște setarea **Imagini**, plus portretul personajului tău când îl ceri. Aplicația ta AI le face cu mijloacele ei, cu autentificarea ta, în abonamentul tău și cu limitele lui: **Claude** le desenează ca imagini vectoriale, **Codex** și **Antigravity** le pictează, **OpenCode** desenează în chat imagini vectoriale simple. În **Setări > Campanie > Imagini** poți cere ca Codex sau Antigravity să le picteze și atunci când maestrul de joc este o altă aplicație: acolo unde cea aleasă de tine nu poate, le face chatul tău. **Setări** arată dacă acest calculator le poate genera și, dacă nu, cum le configurezi. Poți oricând să dai o imagine a ta, personajului tău sau oricărei pagini pe care o vezi: trece cursorul peste una dintre imaginile ei și în colț apare un mic buton cu o imagine (și de la tastatură, iar pe telefon mereu); în **Lume**, pagina pe care o deschizi are și **Schimbă imaginea…**, sau **Adaugă o imagine…** cât timp nu are niciuna. Cu cursorul peste o imagine, sau cu butonul ei selectat, poți și să lipești una copiată, cu Ctrl+V (⌘V pe Mac). Imaginea ta o înlocuiește pe cea existentă. Sau pune fișierul în folderul **inbox** al campaniei și spune-i maestrului de joc pentru ce pagină este.

### 3.12 Siguranță: linii, văluri și oprire

**Liniile** nu apar niciodată în joc; **vălurile** se petrec doar în afara scenei. În orice moment scrie *[stop]*: maestrul de joc renunță imediat la acel conținut și îl adaugă la liniile tale.

### 3.13 Când te răzgândești

Orice setare poate fi schimbată, în chat sau în **Setări**. O decizie pe care maestrul de joc o ia fără carte devine un **precedent**, ca aceeași întrebare să primească data viitoare același răspuns.

---

## 4. Tabloul de comandă <!-- icon: party -->

O pagină de pe propriul tău calculator, într-o fereastră proprie, deschisă doar pe acel calculator. Rămâne activă cât timp fereastra ei este deschisă, cu chat sau fără; la aproximativ treizeci de secunde după ce o închizi, jocul se oprește, iar chatul odată cu el. Nu se pierde nimic: totul este în fișiere. În chatul propriu al aplicației tale de AI, pagina este activă cât timp acel chat este deschis. Când jocul lipsește, pagina arată *Not connected*: apasă **Redeschide campania** sau, în aplicația ta, deschide următorul chat. Butonul **Campanii**, cu căsuța, te duce înapoi la toate campaniile tale.

- **Joc de rol**: chatul cu maestrul de joc, când nu este lângă pagină ([2.5](#25-the-first-chat)).
- **Grup**: fișa ta și fișele însoțitorilor tăi. Dă clic pe un număr ca să-l arunci; ține cursorul deasupra lui ca să vezi de unde vine și, când o săgeată marchează zarul, ce îmbunătățește sau înrăutățește aruncarea. Când maestrul de joc pregătește alegeri pentru tine, de exemplu la un nivel nou, o notificare de pe fișă le deschide: alege când vrei, citește paginile pe care le numesc opțiunile, aruncă acolo unde o opțiune cere o aruncare, apoi confirmă; povestea merge mai departe între timp. Alături, aruncările.
- **Scenă**: unde te afli, imaginea și harta ei, cine este de față, ce se întâmplă; într-o luptă, turele și cartonașul personajului tău.
- **Jurnal**: misiuni, povestea ca o carte, cronologia ei, jurnalele însoțitorilor tăi, notițele tale.
- **Lume**: harta lumii, ce știe personajul tău, documentele găsite și calendarul.
- **Tava pentru zaruri**: alege zarurile și un modificator, apoi aruncă; ×2 dublează zarurile, niciodată modificatorul, ca la o lovitură critică.
- **Salvări**, **Ajutor**, **Setări** și **Despre**, ca pictograme la capătul rândului. **Setări** conține și, la **Tablou de bord**, preferințele proprii ale paginii: modul, sunetul zarurilor, setul de zaruri și **Temă**, adică culorile, chipurile și imaginile paginii: cele ale sistemului de joc, o temă adăugată din Packages › Add, din catalog, dintr-un link GitHub, dintr-un .zip sau dintr-un dosar, ori cele proprii ale paginii. Dacă foaia de stil a unei teme face pagina greu de citit, dezactivează acolo **Stilul propriu al temei**: **Setări** se afișează întotdeauna fără el, la adresa paginii cu `#/settings/page` la final.

Când maestrul de joc îți pune o întrebare, bannerul lui rămâne în partea de sus, indiferent în ce secțiune te afli.

---

## 5. Sisteme de joc și reguli de casă <!-- icon: dice -->

### 5.1 Ce este un sistem de joc

Datele unui singur joc: fișa, cifrele, creaturile, obiectele, vrăjile și textul regulilor. Fiecare campanie folosește un singur sistem. RPG Engine calculează fișa, ce se consumă și ce se reface. Cum funcționează o abilitate, maestrul de joc citește în reguli și hotărăște, ca la o masă de joc.

### 5.2 Ediția a cincea

Rasele, clasele, subclasele, un background și un feat din SRD 5.1; cele 319 de vrăji, armele, armurile, obiectele magice și monștrii; capitolele de reguli, pe care maestrul de joc le citește după textul lor exact; fișa completă, calculată.

Este un pachet separat: maestrul de joc ți-l oferă când configurezi o campanie și îl instalează. O campanie care îl folosește se instalează singură prima dată când se deschide pe un calculator care nu îl are, iar maestrul de joc îți spune.

Poți juca și conținut care lipsește din SRD, dintr-o carte pe care o ai: maestrul de joc îl scrie ca pagini ale campaniei tale, iar RPG Engine le tratează ca pe ale sale. RPG Engine livrează doar conținut deschis; ce știe maestrul tău nu este limitat.

Manualele tale pot fi biblioteca ta: spune-i maestrului de joc unde se află, *[Manualele mele sunt în D:\Books\5e.]*, sau adaugă folderul lor în Pachete › Bibliotecă și spune da în fereastra pe care ți-o arată calculatorul, o singură dată. RPG Engine le citește pe acest calculator; fiecare campanie folosește folderele pe care le activezi acolo, iar maestrul de joc le caută când hotărăște o regulă, după SRD, citând cartea și pagina. Se citesc cel mai bine ca text sau ca PDF-uri al căror text poate fi selectat; un PDF scanat este citit din imaginile paginilor, doar pe Windows, în câteva minute și cu câteva greșeli. RPG Engine nu îți modifică niciodată manualele, nu le trimite textul nicăieri și nu îl copiază niciodată într-o campanie.

### 5.3 Reguli de casă și adăugările tale

Cere-i maestrului de joc: *[Regulă de casă: un 1 natural la atac înseamnă că îți scapi arma.]* Maestrul o păstrează ca pe o înțelegere a mesei de joc sau scrie o pagină ori o cifră a fișei, când este nevoie. Regulile de casă deja scrise pot fi puse ca fișiere text în folderul `rules` al campaniei.

Când maestrul de joc modifică o pagină a sistemului de joc pentru campania ta, de exemplu punctele de viață ale unei creaturi sau raza de acțiune a unei vrăji, dashboard-ul o marchează cu un mic asterisc după nume, oriunde apare. Pachete › Instalate listează ce s-a schimbat, sub sistemul de joc, alături de ce a oferit sistemul; o creatură pe care personajul tău nu o cunoaște apare acolo doar cu numele. Acolo poți pune o pagină înapoi așa cum o scrie sistemul, după ce se încheie scena în curs; dashboard-ul nu poate anula modificarea, doar maestrul de joc poate scrie din nou schimbarea.

### 5.4 Adăugarea sau importul propriului sistem de joc

Un sistem de joc este un pachet: maestrul de joc instalează unul din npm, dintr-un folder sau dintr-un fișier, iar unul care nu este al nostru, doar cu acordul tău, într-un formular al agentului tău sau într-o fereastră a calculatorului. Crearea unuia este treaba unui dezvoltator și este descrisă în documentele RPG Engine de pe GitHub. Transformarea unei cărți de-ale tale într-un sistem de joc nu există încă ([Vine mai târziu](#9-coming-later)).

---

## 6. Extensiile <!-- icon: plus -->

O extensie adaugă ceva unei campanii, peste sistemul ei de joc: o funcție precum vremea, care se schimbă la fiecare răsărit, sau forțarea unei încuietori cu zaruri. Adaugi o extensie din Pachete › Adaugă, alegând din listă sau după numele de pe npm, un folder ori un fișier. Una care nu este a noastră aduce cod și vine doar cu acordul tău, într-o fereastră a computerului. Dacă o extensie este făcută pentru alt sistem de joc, îți spune care, și nu este adăugată. În Pachete › Instalate poți actualiza o extensie sau o poți scoate. Maestrul de joc poate adăuga și el una, când îi ceri.

---

## 7. De unde vine o campanie și limba ei <!-- icon: world -->

### 7.1 Trei feluri de a avea o lume

- **Creată din mers**: pornind de la premisa ta, maestrul de joc construiește fiecare loc, persoană și intrigă chiar înainte să ai nevoie de ele și le păstrează.
- **Pregătită la început**: la fel, dar cu lumea construită înainte de joc.
- **Dintr-o aventură sau o carte a ta**: dă-i maestrului de joc fișierul, *[Importă această aventură ca pe campania noastră: D:\Books\adventure.pdf. Nu-mi spune nimic din ce e în ea.]* Un fișier din afara campaniei este citit doar după ce spui da într-o fereastră a calculatorului tău; unul pus în dosarul **inbox** al campaniei este citit pe loc. Se citește cel mai bine ca text, EPUB, document Word sau PDF cu text selectabil; un PDF scanat se citește din imaginile paginilor, doar pe Windows, lent și cu câteva greșeli. Aplicația ta de AI îl citește în afara chatului, sau altfel maestrul de joc din chat, în abonamentul tău: în Claude Code sau Codex îl citește unul dintre cele două, în Antigravity Antigravity-ul tău, în OpenCode modelul pe care l-ai ales ultima dată în el. Întregul document ajunge la firma care a creat aplicația ce îl citește, conform termenilor contului tău și opțiunii tale privind antrenarea. Tabloul de bord arată cât a avansat citirea; dintr-un roman, maestrul de joc propune de unde să începi. Maestrul de joc scrie locurile, personajele și secretele.

O campanie se joacă o singură dată: ca să joci din nou aceeași aventură, creează o campanie nouă.

### 7.2 Limbi

O singură limbă pe campanie, cea a maestrului de joc, pe care o urmează dashboardul. Dashboardul vine în 26 de limbi. Orice altă limbă este tradusă pe calculatorul tău de aplicația ta AI, în afara chatului (Codex sau Claude Code; în Antigravity și OpenCode, cele proprii), sau, acolo unde niciuna nu poate, de maestrul de joc din chat. Termenii ediției a cincea în italiană vin din SRD-ul oficial italian; textul regulilor rămâne în engleză, iar maestrul de joc îl povestește în limba ta.

---

## 8. Pentru curioși: folderul campaniei <!-- icon: list -->

Nu trebuie să îl deschizi niciodată, iar el conține secretele campaniei tale. Are `campaign.yaml` (setările tale), `state.yaml` (unde a ajuns jocul), `world/` (o pagină markdown pentru fiecare personaj, loc, misiune și restul), `rules/` (regulile tale de casă), `images/`, `log.jsonl` (fiecare schimbare), `sessions/` (conversațiile tale cu maestrul de joc, sub formă de text, din Claude Code și Codex), `.saves/`, `.player/` (notițele tale) și fișierele mici care spun agenților AI unde se află RPG Engine. Paginile folosesc formatul Obsidian. Dacă schimbi o pagină manual, maestrul de joc află la următorul răspuns.

RPG Engine rămâne în acest folder: citește și scrie jocul doar aici și nu atinge niciodată celelalte fișiere ale tale; folderele cu manualele tale doar le citește. În afara lui, păstrează doar foldere de date proprii (traducerile dashboardului, textul citit din manualele tale, iar Codex sau Claude Code dacă îl lași să le instaleze) și foldere temporare cât timp se desenează o imagine. Orice altceva vrea agentul tău să facă pe calculatorul tău, te întreabă mai întâi. Un sistem de joc sau o extensie este cod, ca orice pachet npm: unul care nu este al nostru rulează pe calculatorul tău cu permisiunile tale, iar RPG Engine îl instalează doar cu acordul tău, într-un formular al agentului tău sau într-o fereastră a calculatorului. Spune da doar pachetelor ai căror autori ai încredere.

Fiecare comandă pe care o folosește maestrul de joc poate fi rulată și în folderul campaniei: `rpg --help` le listează. Multe afișează secretele campaniei.

---

## 9. Ce urmează <!-- icon: hourglass -->

- **Tu ca maestru de joc**, cu AI-ul jucând grupul.
- **Modul autor**: scrie o aventură cu AI-ul, apoi exportă-o și împarte-o cu alții.
- **Mai mulți jucători pe același computer**, fiecare cu personajul lui, pe rând în același chat.
- **Mai multe extensii**: lumi, funcții și reguli ale casei de împărțit cu alții.
- **Alte jocuri**: mai multe sisteme de joc, și ale tale.

---

## 10. Întrebări și probleme <!-- icon: info -->

### Întrebări

**Trebuie să cunosc regulile?** Nu. Alege mentorul tutorial și întreabă în `[OOC: …]` oricând vrei.

**Poate maestrul să trișeze?** Nu poate schimba o aruncare făcută de RPG Engine, decât la dificultatea poveste, și nici faptele deja stabilite.

**Costă ceva?** RPG Engine este gratuit. Maestrul de joc rulează pe abonamentul aplicației tale de AI sau pe calculatorul tău, cu un model local. O seară de joc înseamnă un chat lung: pe cele mai mici abonamente poți atinge limita abonamentului înainte să se termine seara. Imaginile, traducerile și importurile folosesc același abonament. RPG Engine în sine nu folosește niciodată o cheie API, care se plătește la fiecare apel: conectează-ți aplicația de AI cu contul tău, nu cu o cheie.

**Pot juca pe telefon?** Nu: maestrul rulează pe calculatorul tău, iar dashboardul se deschide doar acolo.

**Pot juca cu prieteni?** Încă nu: azi există un jucător, un personaj și însoțitori ([Coming later](#9-coming-later)).

**Pot folosi alt AI data viitoare?** Da: alege altă aplicație în chat înainte să-l deschizi sau deschide campania în altă aplicație și scrie *continuă*.

### Probleme

**O campanie nu se deschide.** Deschide din nou RPG Engine din pictogramă sau cu `rpg open` într-un terminal și dă clic pe campanie. Dacă tabloul ei de bord spune *Not connected*, apasă **Redeschide campania**. Un cartonaș care spune **Dosarul nu a fost găsit** și-a pierdut dosarul: scoate-l din listă și adaugă-l din nou cu **Deschide un dosar…**, de unde se află acum. În chatul propriu al aplicației tale de AI, tabloul de bord funcționează doar cât timp este deschis un chat al acelei campanii: întreabă maestrul de joc `[OOC: Care e linkul către tabloul de bord?]`. În aplicația Claude, un chat lăsat o vreme pe fundal adoarme, iar pagina odată cu el: apasă pe chat și pagina revine la aceeași adresă.

**Maestrul de joc pare să nu cunoască jocul.** Se întâmplă în chatul propriu al aplicației tale de AI: aceasta nu a încărcat RPG Engine. Verifică dacă ai pornit-o în dosarul campaniei și dacă ai avut încredere în dosar. În Claude Code, scrie `/mcp` și reconectează `rpg`. În Codex, `codex mcp list` în dosarul campaniei trebuie să arate `rpg`. Dacă `rpg --version` nu e găsit, instalează din nou RPG Engine ([2.2](#22-install)).

**Windows nu găsește `claude`.** Se întâmplă când ai instalat Claude Code chiar tu. Programul lui de instalare spune asta într-o notă galbenă, cu dosarul în care s-a instalat: adaugă dosarul respectiv la PATH (Proprietăți sistem > Variabile de mediu), apoi deschide un terminal nou.

**Actualizare.** Când apare un RPG Engine mai nou, tabloul de bord anunță asta: în Packages › Installed, RPG Engine este primul, cu **Actualizează**; apoi urmează ce îți spune pagina. Sau rulează din nou `npm install -g rpg-engine` într-un terminal, apoi deschide un chat nou: un maestru de joc aflat în rulare păstrează versiunea cu care a pornit.

**Maestrul își amintește ceva ce am anulat.** Deschide un chat nou și apasă **Am deschis un chat nou** în Salvări.

**O aplicație nu se instalează.** Pagina spune de ce: apasă **Încearcă din nou**. Sau instal-o chiar tu de pe site-ul creatorului ei, apoi apasă **Verifică din nou**.

**Pagina de conectare nu se deschide în browser.** Cât timp pagina te așteaptă, apasă **Deschide din nou pagina de conectare** acolo unde apare sau **Anulează** și încearcă încă o dată.

**Chatul din tabloul de bord spune că joacă alt chat.** Un chat deschis chiar de tine în aplicația ta de AI joacă această campanie: continuă acolo sau închide-l ca să joci în tabloul de bord.

**Nu apare nicio imagine.** **Setări** > Campaign > Pictures arată dacă acest calculator le poate face și cum.

**Instalarea eșuează sau `rpg` nu pornește.** `node --version` trebuie să arate 24 sau mai nou. Dacă Windows răspunde că rularea scripturilor este dezactivată, vezi [2.1](#21-what-you-need). Pe Windows, ține RPG Engine și campaniile tale departe de căi care conțin `&`.

**Linkul tabloului de bord s-a schimbat.** În chatul propriu al aplicației tale de AI, fiecare campanie are propria adresă, aceeași chat după chat. Se schimbă doar când un alt program o folosește deja: maestrul de joc îți dă noul link, iar de atunci acesta rămâne. Un al doilea chat al aceleiași campanii păstrează pagina la aceeași adresă și o preia după ce îl închizi pe primul.
