<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: ghidul complet

**RPG Engine** îți permite să joci un joc de rol de masă cu o **IA în rolul de maestru de joc**. Joci în **tabloul de bord**, o fereastră pe calculatorul tău cu fișa ta, zarurile, hărțile, jurnalul și **chatul** cu maestrul de joc.

Acest ghid îți spune cum să joci. Pagina își explică singură butoanele: oprește cursorul pe unul ca să vezi ce face.

## Pornire rapidă <!-- icon: send -->

1. Instalează **Node.js** de pe [nodejs.org](https://nodejs.org) (versiunea LTS).
2. Deschide un terminal nou și scrie `npm install -g rpg-engine`. Dacă Windows spune că rularea scripturilor este dezactivată, scrie `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, răspunde da și încearcă din nou.
3. Scrie `rpg open` și apasă Enter când îți propune pictograma pe desktop ([2.2](#22-installing)). De atunci pornești RPG Engine din pictogramă.
4. Apasă **Campanie nouă**, dă-i un nume și apasă **Creează** ([2.3](#23-a-new-campaign)).
5. În chat, alege aplicația ta de AI și modelul ei ([2.4](#24-connect-your-ai)): Claude Code are nevoie de un abonament Claude cu plată, Codex de un cont ChatGPT, gratuit sau cu plată. Apasă **Deschide chatul**, apoi **Începe**.

Primul răspuns poate dura câteva minute. Apoi maestrul de joc te întreabă cum vrei să joci, iar voi doi creați personajul împreună.

## 1. Ce este RPG Engine <!-- icon: about -->

| Cine | Ce face |
|---|---|
| **Tu** | Îți joci personajul: ce face, ce spune și ce încearcă. |
| **Maestrul de joc** (AI-ul) | Spune povestea, joacă pe toți ceilalți, hotărăște ce se întâmplă, cere aruncări. |
| **RPG Engine** | Ține lumea în fișiere, aruncă zarurile, numără punctele de viață, banii, timpul și distanțele, păstrează secretele până le descoperi. |

Lumea rămâne aceeași de la o seară la alta, chiar și într-un chat nou, chiar și cu o altă IA:

- **Ce s-a spus rămâne adevărat.** Un răufăcător mort rămâne mort.
- **Zarurile sunt adevărate.** Maestrul de joc nu le poate schimba, în afară de dificultatea cea mai ușoară.
- **Secretele rămân secrete.** Maestrul de joc nu-ți spune niciodată ce nu știe personajul tău.
- **Lumea se mișcă.** Amenințările înaintează cât timp te odihnești sau călătorești.
- **O campanie este un folder** pe calculatorul tău: te poți opri oricând, poți continua mai târziu.

Un joc vine sub forma unui sistem de joc: azi al nostru este **a cincea ediție**, din System Reference Document 5.1, gratuit. Fără unul, joci liber, o poveste fără cifre.

---

## 2. Primii pași <!-- icon: path -->

### 2.1 Ce îți trebuie

- Un calculator cu Windows, macOS sau Linux.
- **Node.js 24** sau mai nou, de pe [nodejs.org](https://nodejs.org).
- Un **terminal**, doar pentru instalare: pe Windows, Terminal sau PowerShell; pe macOS, Terminal.
- O **aplicație de AI** pentru maestrul de joc, cu contul tău propriu ([2.4](#24-connect-your-ai)).

### 2.2 Instalare

```text
npm install -g rpg-engine
rpg open
```

Prima linie instalează RPG Engine. Dacă npm se oferă să se actualizeze singur, poți ignora oferta.

`rpg open` deschide fereastra RPG Engine. Prima dată, îți propune o pictogramă pe desktop și în meniu: apasă Enter pentru da, iar de atunci pornești din pictogramă.

Dacă instalarea eșuează, verifică dacă `node --version` arată 24 sau mai mult. Dacă Windows spune că rularea scripturilor este dezactivată, scrie `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` și răspunde da. Pe Windows, ține RPG Engine și campaniile tale în afara căilor care conțin `&`.

### 2.3 O campanie nouă

Apasă **Campanie nouă** și completează **Nume**, **Limbă** și **Sistem de joc**. Restul îl faci împreună cu maestrul de joc. Apasă **Creează**: campania se deschide într-o fereastră proprie.

Maestrul de joc și tabloul de bord vorbesc în limba campaniei. Textul regulilor din a cincea ediție rămâne în engleză, iar maestrul de joc ți-l spune în limba ta.

Campania este un folder cu numele ei, în folderul `RPG Engine` din folderul tău de utilizator. Data viitoare, dă clic pe cartonașul ei.

### 2.4 Conectarea AI-ului

Maestrul de joc rulează într-o **aplicație de AI** de pe calculatorul tău, cu contul tău. Un chat web, precum claude.ai sau ChatGPT, nu ajunge: maestrul de joc trebuie să poată accesa fișierele campaniei.

- **Claude Code**: un abonament Claude cu plată (Pro sau superior).
- **Codex**: un cont ChatGPT, gratuit sau cu plată.
- **OpenCode**: fără cont; câteva modele gratuite pentru o perioadă limitată, sau cele ale furnizorului tău, inclusiv cele locale.
- **Antigravity**: un cont Google; utilizarea gratuită are limite săptămânale.

În chat, alege aplicația, **Model** și **Gândirea maestrului de joc**. Dacă aplicația lipsește sau nu ești conectat, un buton o instalează, te conectează sau deschide site-ul ei. RPG Engine nu îți vede niciodată parola.

O seară de joc este un chat lung: cu cele mai mici abonamente poți atinge limita înainte să se termine seara. Joacă cu cel mai mare model pe care îl ai: unul mic poate fi convins mai ușor să dezvăluie secrete.

Jucăm și testăm RPG Engine cel mai mult cu **Claude Code**. Antigravity este **în probă**: poate ieși din joc, iar chaturile tale rămân într-o memorie pe care nu o poți opri. Ce scrii acolo ajunge la Google, care poate pune oameni să citească. RPG Engine nu este un produs Google.

### 2.5 Primul chat

Apasă **Deschide chatul**, apoi **Începe**. Primul răspuns poate dura câteva minute. Apoi o campanie nouă trece prin trei etape:

1. **Setări**: maestrul de joc te întreabă cum vrei să joci, câteva întrebări odată: cât de grea e lumea, dacă poți muri, când te poți întoarce la o salvare. Scrie *Decizi tu* ca să aleagă el. Totul poate fi schimbat mai târziu.
2. **Sesiunea zero**: îți creezi personajul împreună cu maestrul de joc, ca la o masă de joc. RPG Engine face socotelile fișei. Dacă ai deja un personaj, lipește fișa lui în chat.
3. **Joc**: maestrul de joc pune prima scenă.

### 2.6 Jocul în aplicația ta de AI

Poți juca și în chatul propriu al aplicației tale de AI, într-un terminal sau în aplicația ei desktop, cu tabloul de bord alături.

1. Deschide un terminal în folderul în care ții jocurile tale: dă clic dreapta pe folder și alege **Deschide în Terminal** (Windows) sau **Servicii > Terminal nou la dosar** (macOS).
2. Scrie `rpg init "The Salt Isles"`: se creează folderul `The Salt Isles` cu o campanie nouă în el.
3. Pornește aplicația în acel folder: `claude`, `codex`, `agy` pentru Antigravity sau `opencode`. Spune da când te întreabă dacă ai încredere în folder: în Claude Code, răspunsul deja selectat este *No, exit*.
4. Scrie *Salut! Hai să începem.* Maestrul de joc îți dă linkul către tabloul de bord: deschide-l lângă chat.

Bine de știut:

- Nu deschide detaliile uneltelor pe care le folosește aplicația ta (în Claude Code, ctrl+o): pot arăta secrete.
- În aplicația desktop Codex, oprește memoriile pentru chaturile jocului.
- Dacă maestrul de joc nu cunoaște jocul, scrie `rpg init` în folderul campaniei și deschide un chat nou.
- Dacă Windows nu găsește `claude`, adaugă în PATH folderul numit de instalatorul lui, apoi deschide un terminal nou.
- Un singur chat joacă o campanie la un moment dat: cât timp al tău este deschis, chatul din tabloul de bord așteaptă.

---

## 3. Cum se joacă <!-- icon: chat -->

### 3.1 Dialogul cu maestrul de joc

Scrie ce face sau ce spune personajul tău:

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.

Tu spui ce încerci, iar maestrul de joc spune ce se întâmplă. Maestrul de joc nu decide niciodată pentru personajul tău.

Ca să ieși din poveste, scrie `[OOC: …]` (out of character): *[OOC: Cum funcționează imobilizarea?]* Îl poți întreba pe maestrul de joc despre reguli sau despre cum funcționează tabloul de bord.

Când maestrul de joc te întreabă ceva, răspunde cu butoanele lui sau cu cuvintele tale. Poți acționa și din fișă: dă clic pe o armă, o vrajă sau un obiect și alege ce faci.

**Ordine permanente**: spune-le însoțitorilor tăi ceva care să dureze, de exemplu *De acum încolo, lăsați mereu pe cineva în viață*. Maestrul de joc ține minte asta până când o anulezi.

### 3.2 Aruncări

Maestrul de joc cere o aruncare doar când rezultatul este incert și contează. Un banner arată aruncarea: dă clic pe el și zarurile cad.

Zarurile sunt ale RPG Engine, nu ale maestrului de joc. Poți întreba oricând *[A fost reală aruncarea aceea?]*: chiar și pentru o aruncare secretă, maestrul de joc poate dovedi că a fost făcută înainte să întrebi.

Cu setarea **Zaruri** pe fizice, aruncă-ți propriile zaruri și scrie rezultatul: *[Am aruncat 14.]* Aruncările pe care le faci de plăcere, din fișă sau cu **Aruncare liberă**, nu contează niciodată.

### 3.3 Scene, lupte și călătorii

Povestea se desfășoară în **scene**: o luptă, o conversație, o călătorie, un popas. La sfârșitul fiecărei scene jocul se salvează singur, iar scena intră în jurnalul tău.

Într-o luptă, maestrul de joc joacă fiecare tură care nu este a ta și se oprește când trebuie să decizi.

Spune încotro mergi, *Pornim pe drumul spre nord, către Rocca*: RPG Engine calculează distanța și zilele și se oprește dacă se întâmplă ceva pe drum. Între timp, planurile răufăcătorilor merg mai departe, iar tu le vezi semnele.

### 3.4 Salvări

RPG Engine salvează campania la sfârșitul fiecărei scene. Setarea **Salvări** decide când te poți întoarce:

- **permadeath**: niciodată.
- **checkpoint**: la ultima salvare, doar când personajul tău moare.
- **free**: la orice salvare, iar tu poți salva când vrei.

În toate modurile poți începe de la capăt, în chat sau în **Salvări**.

După ce te-ai întors, deschide un chat nou, pentru că cel vechi își amintește ce a fost anulat:

1. Apasă **Închide chatul**, apoi **Chat nou**. În chatul propriu al aplicației tale de AI, deschide o conversație nouă (`/clear` în Claude Code).
2. Scrie *continuă*.
3. Apasă **Am deschis un chat nou** în Salvări. Până atunci, maestrul de joc așteaptă.

### 3.5 Oprirea și reluarea

Oprește-te oricând vrei: totul este deja salvat. Închide fereastra tabloului de bord, iar la scurt timp jocul se oprește. Nu se pierde nimic.

Ca să revii, deschide RPG Engine din pictogramă și dă clic pe campania ta. Apasă **Reia chatul**, apoi **Reia povestea**: maestrul de joc îți spune unde ai rămas și merge mai departe. Data viitoare poți alege și altă aplicație de AI.

### 3.6 Limite și oprire

**Liniile** nu apar niciodată în joc; **vălurile** se petrec doar în afara scenei. Le stabilești în **Setări**.

În orice moment scrie *[stop]*: maestrul de joc renunță la acel conținut și îl adaugă la liniile tale.

### 3.7 Imagini

Maestrul de joc poate cere imagini cu locuri, misiuni și persoane, după cum hotărăște setarea **Imagini**, plus un portret al personajului tău când îl ceri. Aplicația ta de AI le face, în abonamentul tău. Dacă nu apare niciuna, **Setări** spune dacă acest calculator le poate genera.

Poți oricând să dai personajului tău sau unei pagini din lume o imagine a ta, chiar din pagină.

---

## 4. Tabloul de comandă <!-- icon: party -->

Fereastra în care îți vezi jocul. Arată doar ce știe personajul tău.

- **Joc de rol**: chatul cu maestrul de joc, când nu este lângă pagină.
- **Grup**: fișa ta, fișele însoțitorilor tăi și aruncările.
- **Scenă**: unde te afli, cine este de față și harta; într-o luptă, turele.
- **Jurnal**: misiuni, povestea ca o carte, jurnalele însoțitorilor tăi și notițele tale.
- **Lume**: harta lumii, ce știe personajul tău, documentele găsite și calendarul.
- **Salvări**: întoarcerea în timp și începutul de la capăt.
- **Setări**: cum joci și cum arată pagina.
- **Pachete**: sistemul de joc, extensiile, manualele tale și actualizările: când apare un RPG Engine nou, o spune aici.

Dacă pagina spune că nu este conectată, apasă **Redeschide campania**.

Ca să joci de pe telefon, acasă: în **Setări**, la **Tablou de bord**, pornește **Acces de pe telefon** și încadrează codul cu telefonul, în aceeași rețea Wi-Fi cu calculatorul. Windows te poate întreba dacă Node.js are voie să folosească rețeaua: permite-i accesul în rețelele private și setează rețeaua Wi-Fi ca rețea privată. Jocul circulă necriptat: folosește-l doar într-o rețea de încredere, precum cea de acasă; niciodată într-un Wi-Fi public, de hotel sau de birou. Oprește-l când ai terminat: jocul se încheie odată cu ultima fereastră a calculatorului.

Dacă o temă face pagina greu de citit, adaugă `#/settings/page` la sfârșitul adresei ei și dezactivează **Stilul propriu al temei**.

---

## 5. Reguli, manuale și extensii <!-- icon: dice -->

Un **Sistem de joc** reunește datele unui joc: fișa, creaturile, obiectele, vrăjile și regulile. RPG Engine calculează fișa; cum se aplică o regulă, citește și hotărăște maestrul de joc, ca la o masă de joc.

**A cincea ediție** conține regulile gratuite din System Reference Document 5.1. Poți juca și conținut dintr-o carte pe care o deții: maestrul de joc îl scrie în campania ta.

**Manualele tale**: spune-i maestrului de joc unde se află sau adaugă folderul lor în **Pachete**. Maestrul de joc caută regulile în ele și citează cartea și pagina. RPG Engine nu le modifică niciodată și nu le copiază în campanie.

**Reguli de casă**: cere-i maestrului de joc, *[House rule: un 1 natural la atac înseamnă că scapi arma.]* Maestrul de joc păstrează regula. O decizie luată o dată rămâne valabilă și data viitoare.

**Extensiile** adaugă ceva jocului, cum ar fi vremea. Adaugă-le în **Pachete** sau cere-le maestrului de joc.

---

## 6. Aventura ta <!-- icon: world -->

Dacă nu ai o lume scrisă, maestrul de joc construiește una pornind de la premisa ta și o ține minte.

Ca să joci o aventură sau o carte pe care o deții, dă-i maestrului de joc fișierul ei: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Un fișier din afara campaniei este citit doar după ce spui da. Se citește cel mai bine ca text, EPUB, Word sau PDF cu text selectabil.

Întregul document ajunge la compania AI-ului care îl citește. O campanie se joacă o singură dată: ca să joci din nou aceeași aventură, creează o campanie nouă.

---

## 7. Datele tale <!-- icon: lock -->

- O campanie este un folder. În el sunt secretele campaniei, precum și conversațiile tale cu maestrul de joc: nu trebuie să îl deschizi niciodată.
- RPG Engine citește și scrie doar în acel folder. Manualele tale le citește doar; orice altceva din afara campaniei, doar după ce spui da, într-o fereastră a computerului tău.
- În chatul din dashboard, maestrul de joc nu deschide singur niciunul dintre fișierele tale.
- Ce scrii ajunge la compania al cărei model joacă rolul maestrului de joc, conform termenilor contului tău. Cu un model local, rămâne pe computerul tău.
- Un sistem de joc sau o extensie care nu e de la noi este cod care rulează pe computerul tău: vine doar cu acordul tău. Spune da doar autorilor în care ai încredere.
- Dacă folderul campaniei este un depozit git, **Setări** poate face commit în locul tău. Include conversațiile tale doar dacă depozitul este privat.
- Cu **Acces de pe telefon** activat, jocul circulă necriptat de la computer la telefon, prin rețeaua ta de acasă, fără niciun serviciu extern: oricine se află în rețeaua respectivă l-ar putea citi.
