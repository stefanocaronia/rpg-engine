<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
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
- **Node.js 22** sau mai nou, de pe [nodejs.org](https://nodejs.org). Vine cu `npm`, care instalează RPG Engine.
- Un **terminal**: pe Windows, Terminal sau PowerShell; pe macOS, Terminal. Ca să deschizi unul într-un folder, dă clic dreapta pe folder și alege **Open in Terminal** (Windows) sau **Services > New Terminal at Folder** (macOS).
- Un **agent IA** pentru maestrul de joc ([2.4](#24-connect-your-ai)), cu **cel mai mare model** pe care îl oferă: un model mic poate fi convins mai ușor să dezvăluie secrete sau să încalce regulile.

### 2.2 Instalare

```text
npm install -g rpg-engine
```

`rpg --version` verifică dacă a mers. Folosești `rpg` o dată pe campanie, ca s-o creezi; după aceea agentul pornește singur RPG Engine.

### 2.3 Creează o campanie

Deschide un terminal în folderul unde ții jocurile ([2.1](#21-what-you-need) spune cum):

```text
rpg init "The Salt Isles"
```

Aceasta creează folderul `The Salt Isles` cu o campanie nouă înăuntru; intră în el cu `cd "The Salt Isles"`. Ține minte unde se află: te întorci la el de fiecare dată când joci. Restul îl alegi mai târziu, în chat sau în dashboard; `rpg init --help` listează opțiunile pe care le poți alege chiar acum, cum ar fi `--language it` sau `--difficulty hard`.

Maestrul de joc nu poate crea o campanie în locul tău: înainte de `init`, nimic nu-i spune agentului unde se află RPG Engine.

### 2.4 Conectează-ți IA

Maestrul de joc rulează într-un **agent IA**: o aplicație IA, în terminal sau pe desktop, care poate lucra cu fișierele de pe calculatorul tău, cum ar fi Claude Code sau Codex. Un chat simplu, precum claude.ai sau ChatGPT, sau o aplicație de telefon nu ajunge: maestrul de joc trebuie să ajungă la fișierele campaniei de pe calculatorul tău. Fiecare agent cere propriul abonament și propria autentificare: Claude Code un abonament Claude plătit, Codex o autentificare ChatGPT. Îl instalezi o singură dată, de pe pagina lui: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: în folderul campaniei scrie `claude`. Când te întreabă dacă ai încredere în folder, alege **Yes, I trust this folder**; atenție, răspunsul deja selectat este *No, exit*.
- **Codex**: în folderul campaniei scrie `codex` și spune da când te întreabă dacă ai încredere în folder. În aplicația lui desktop, verifică în setări că memoriile sunt dezactivate pentru chaturile jocului.
- **Alt agent**: pornește-l în folderul campaniei și dă-i serverul MCP `rpg mcp`. RPG Engine este un server MCP standard: orice agent care suportă MCP poate fi maestrul de joc, inclusiv cei locali.

Jucăm și testăm cu **Claude Code**; **Codex** este conectat și verificat, dar încă nu s-a jucat o campanie întreagă cu el; `init` configurează și **Gemini CLI**. Campania dezactivează memoria proprie a agentului: jocul trăiește în fișierele lui, ca revenirea la o salvare să fie cu adevărat o revenire.

### 2.5 Primul chat

Scrie orice, de exemplu *Salut! Hai să începem.* În primul răspuns din fiecare chat, maestrul de joc îți dă **linkul către dashboard**, ceva de genul `http://127.0.0.1:4750`: deschide-l și ține-l lângă chat.

Între mesajele maestrului de joc, agentul tău arată uneltele pe care le folosește: nu deschide detaliile lor (în Claude Code, ctrl+o), pentru că pot arăta secrete.

O campanie nouă trece prin trei etape, afișate sus în dashboard: **1 Setări** (cum vrei să joci), **2 Sesiunea zero** (îți faci personajul, jucând), **3 Joc**.

### 2.6 Setări: alegi cum joci

Maestrul de joc întreabă doar ce mai lipsește, câteva întrebări odată; pasul **Setări** din dashboard arată aceleași întrebări sub formă de cartonașe. Scrie „alege tu” și maestrul de joc hotărăște. Totul se poate schimba mai târziu, în chat sau în **Setări**.

| Setare | Ce hotărăște | Valori |
|---|---|---|
| **Mentor** | Cât de mult te învață maestrul de joc regulile | oprit, indicii, tutorial |
| **Dificultate** | Cât de grea e lumea | poveste, ușor, normal, greu, brutal |
| **Letalitate** | Ce înseamnă să cazi într-o luptă | narativ (nu mori niciodată), epic (doar când contează), zaruri |
| **Salvări** | Când te poți întoarce | moarte definitivă, punct de control, liber ([3.8](#38-saves-and-going-back)) |
| **Rigoare** | Cât de strict urmează regulile hrana, lumina și călătoria | fluid, reguli, simulare |
| **Zaruri** | Cine aruncă zarurile tale | digitale, fizice |
| **Unități de măsură** | Distanțe și greutăți | metrice, imperiale |
| **Însoțitori** | Cine călătorește cu tine | niciunul, făcuți împreună cu tine, făcuți de maestrul de joc, întâlniți în joc |
| **Imagini** | Imagini cu locuri, misiuni și cei pe care îi întâlnești | niciuna, la cerere, locuri noi, misiuni și cei pe care îi întâlnești ([3.11](#311-pictures)) |
| **Linii** și **Văluri** | Ce nu apare niciodată și ce se petrece doar în afara scenei | liste |
| **Limbă** | Limba jocului și a dashboardului | oricare |

Ediția a cincea adaugă **progresia**: puncte de experiență sau borne.

Dacă nu ai o lume scrisă, maestrul de joc îți cere și o **premisă** (gen, ton, câteva elemente, în cuvintele tale) și **pregătirea**: lumea se construiește din mers, pe parcurs, sau toată la început.

**Stilul maestrului de joc** nu se întreabă niciodată, dar îl poți schimba în chat sau în **Setări**: **proza** (simplă, literară, pulp, ironică), **poveștile** pe care le inventează (situații, arcuri, episoade, mister), un autor după care să **scrie** sau orice altceva **în cuvintele tale**.

### 2.7 Sesiunea zero: personajul tău

Îți faci personajul împreună cu maestrul de joc, ca la o masă de joc. Fiecare alegere îți aparține, dacă nu-i ceri maestrului de joc s-o facă el: vino cu o idee completă, cu una vagă sau cu nimic. Maestrul de joc îți spune cum se obțin valorile abilităților înainte să se arunce vreun zar. Povestea ta nu este niciodată obligatorie; dacă dai una, maestrul de joc o scrie în cuvintele tale. Apoi maestrul de joc cere o imagine a personajului tău ([3.7](#37-your-characters-story-and-picture)). RPG Engine calculează fișa: nu faci tu niciodată socotelile.

---

## 3. Jocul <!-- icon: chat -->

### 3.1 Vorbești cu maestrul de joc

Scrie ce face sau ce spune personajul tău, în cuvintele tale:

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.

Ca să ieși din poveste, scrie între paranteze drepte: *[Cum funcționează lupta corp la corp?]* Maestrul de joc răspunde tot între paranteze.

Tu spui ce încerci; maestrul de joc spune ce se întâmplă. Maestrul de joc nu hotărăște niciodată pentru personajul tău și nu vorbește niciodată despre motor. Îl poți întreba cum se folosește dashboardul.

### 3.2 Aruncări

Maestrul de joc cere o aruncare doar când rezultatul este nesigur și contează, și spune mai întâi ce este în joc. Apoi:

- **În dashboard**, un banner arată un buton pentru fiecare probă, de exemplu *Acrobatics +4 · with advantage*. Apasă-l: zarurile cad pe pagină și maestrul de joc află rezultatul. Poți și să apeși linia fișei tale care se luminează, să arunci zarurile din tavă sau să scrii altceva în banner.
- **Manual**, în colțul bannerului sau în **Setări**: bannerul îți spune ce să arunci, iar tu arunci de pe fișă sau din tavă.
- **Zaruri fizice**, cu setarea zarurilor pe fizice: scrii fețele pe care le-ai aruncat, *[Am aruncat 14.]*, iar RPG Engine adaugă modificatorii tăi.

**Aruncări libere**: apasă orice număr de pe fișă sau deschide tava ca să arunci de plăcere. Nu contează niciodată, iar maestrul de joc nu le vede.

**Aruncările maestrului de joc** apar în coloana ta de aruncări, în afară de cele secrete. Poți întreba oricând *[Aruncarea aceea a fost reală?]*: pentru o aruncare secretă, maestrul de joc dă o amprentă care dovedește că a fost făcută înainte să întrebi.

### 3.3 Scene și lupte

Povestea se desfășoară în **scene**: o luptă, o conversație, o explorare, o călătorie, o odihnă. La sfârșitul fiecărei scene jocul se salvează singur, iar scena intră în jurnalul tău.

Într-o luptă, maestrul de joc povestește fiecare tură care nu e a ta și se oprește unde poți decide. Secțiunea **Luptă** arată ordinea turelor, punctele de viață ale grupului tău și cât de răniți par inamicii, în cuvinte. Dacă personajul tău cade, salvările împotriva morții apar mari pe pagină.

### 3.4 Timp, călătorii și lumea care se mișcă

RPG Engine ține data; între sesiuni nu trece timp. Spune că te odihnești, *Facem o odihnă lungă*, și odihna aduce înapoi ce trebuie. Spune încotro mergi, *Luăm drumul spre nord, către Rocca*, și RPG Engine calculează drumul, distanța și zilele, oprindu-se când se întâmplă ceva pe cale. Banii sunt numărați în monedele jocului, cu rest cu tot.

Ticăloșii au planuri cu termene. În fiecare zi nouă, maestrul de joc mișcă amenințările pe care timpul le-a făcut să avanseze, iar tu le vezi semnele, niciodată ceasul însuși.

### 3.5 Hărți

**Lume** arată locurile pe care le cunoaște personajul tău, drumurile dintre ele și traseul parcurs, cu ceață peste rest. **Scenă** arată harta locului în care te afli, când are una, cu cine unde se află; într-o luptă, în rândul tău, căsuțele la care nu poți ajunge sunt acoperite. Când maestrul de joc întreabă unde te muți, atinge o căsuță sau scrie-o, de exemplu *E4*.

### 3.6 Misiuni, jurnal și notițe

O sarcină pe care o ia personajul tău devine o misiune în **Jurnal**, cu obiectivele ei, termenul și ce măsoară; pune-i o stea ca s-o ții la vedere în partea de sus a secțiunii Scenă. Jurnalul îți spune și **povestea**, scenă cu scenă, și păstrează **notițele** tale: private, dacă nu o **Partajează** pe una, pe care maestrul de joc o aude ca ceea ce crezi tu, niciodată ca fapt.

### 3.7 Povestea și imaginea personajului tău

Pe fișa ta, cartonașul **Descriere** are o casetă pentru povestea personajului: maestrul de joc o scrie acolo, după ce spui da. Pentru o imagine, dă-i maestrului de joc un fișier (PNG, JPEG, WebP sau SVG, până la 5 MB) cu locul unde se află pe calculatorul tău, sau cere un portret ([3.11](#311-pictures)): *[Fă-mi un portret: păr cenușiu împletit într-o coadă, o cicatrice pe bărbie.]*

### 3.8 Salvări și întoarcerea în timp

RPG Engine salvează toată campania la sfârșitul fiecărei scene. Setarea **salvări** hotărăște restul:

| Salvări | Salvezi când vrei | Te întorci |
|---|---|---|
| **moarte definitivă** | nu | niciodată |
| **punct de control** | nu | la ultima salvare, doar când personajul tău moare |
| **liber** | da | la orice salvare |

În orice mod poți **relua de la capăt**, de la începutul jocului sau de la sesiunea zero. Fă-o în chat sau în **Salvări**.

După ce te-ai întors, **deschide un chat nou**: cel vechi își amintește ce s-a anulat. Scrie *continuă* în chatul nou, apoi apasă **Am deschis un chat nou** în Salvări.

### 3.9 Sesiuni: oprirea și revenirea

Oprește-te când vrei: *[Ne oprim aici pentru în seara asta.]* Totul este deja salvat în fișiere. Ca să revii, pornește agentul în folderul campaniei și scrie *continuă*: maestrul de joc îți face un scurt rezumat și merge mai departe.

### 3.10 Dispoziția maestrului de joc

Robotul din partea de sus a dashboardului este maestrul de joc: fața lui urmează tonul poveștii și nu dezvăluie niciodată ce nu știi încă. Când chatul este închis, doarme.

### 3.11 Imagini

RPG Engine poate genera imagini cu locurile la care ajungi, misiunile pe care le iei și cei pe care îi întâlnești, după cum spune setarea **imagini**, și portretul personajului tău când îl ceri. Folosește ce se află pe calculatorul tău, cu propria ta autentificare: **Codex** le pictează, altfel **Claude Code** le desenează. **Setări** spune dacă acest calculator le poate genera și cum îl configurezi dacă nu. Îi poți oricând da maestrului de joc o imagine a ta.

### 3.12 Siguranță: linii, văluri și stop

**Liniile** nu apar niciodată în joc; **vălurile** se petrec doar în afara scenei. În orice moment scrie *[stop]*: maestrul de joc renunță imediat la acel conținut și îl adaugă la liniile tale.

### 3.13 Te răzgândești

Orice setare se poate schimba, în chat sau în **Setări**. O decizie pe care maestrul de joc o ia fără carte devine un **precedent**, astfel că aceeași întrebare primește același răspuns data viitoare.

---

## 4. Dashboardul <!-- icon: party -->

O pagină pe propriul tău calculator, deschisă doar în browserul acelui calculator, activă cât timp chatul este deschis. Când chatul se închide, arată *Not connected*; revine singură la următorul chat.

- **Grup**: fișa ta și cele ale însoțitorilor tăi. Apasă un număr ca să-l arunci; ține cursorul deasupra ca să vezi de unde vine. Alături, aruncările.
- **Scenă**: unde te afli, imaginea și harta ei, cine e acolo, ce se întâmplă.
- **Luptă**: doar într-o luptă: turele, combatanții, ce ai la îndemână.
- **Jurnal**: misiuni, povestea, notițele tale.
- **Lume**: harta lumii așa cum o cunoaște personajul tău.
- **Tava pentru zaruri**: alege zarurile și un modificator, apoi aruncă.
- **Salvări**, **Ajutor**, **Setări** și **Despre**, ca pictograme la capătul rândului. Setări conține și preferințele paginii: tema, sunetul zarurilor, setul de zaruri.

Când maestrul de joc te întreabă ceva, bannerul lui rămâne sus, indiferent în ce secțiune te afli.

---

## 5. Sisteme de joc și reguli de casă <!-- icon: dice -->

### 5.1 Ce este un sistem de joc

Datele unui joc: fișa, numerele, creaturile, obiectele, vrăjile și textul regulilor. Fiecare campanie joacă un singur sistem. RPG Engine calculează fișa și ce se consumă și ce se reface; cum funcționează o trăsătură, maestrul de joc citește în reguli și hotărăște, ca la o masă de joc.

### 5.2 Ediția a cincea, inclusă

Rasele, clasele, subclasele, un background și un feat din SRD 5.1; cele 319 vrăji, armele, armurile, obiectele magice și monștrii; capitolele de reguli, pe care maestrul de joc le citește după textul lor exact; fișa completă, calculată.

Poți juca și conținut care lipsește din SRD, dintr-o carte pe care o deții: maestrul de joc îl scrie ca pagini ale campaniei tale, iar RPG Engine le tratează ca pe ale lui. RPG Engine livrează doar conținut deschis; ce știe maestrul tău de joc nu este limitat.

### 5.3 Reguli de casă și adăugirile tale

Cere-i maestrului de joc: *[Regulă de casă: un 1 natural la atac înseamnă că scapi arma.]* O păstrează ca pe o înțelegere a mesei de joc sau scrie o pagină ori un număr al fișei când e nevoie. Regulile de casă deja scrise pot merge ca fișiere text în folderul `rules` al campaniei.

### 5.4 Adaugă sau importă propriul sistem de joc

Încă nu: astăzi RPG Engine joacă doar ediția a cincea ([Mai târziu](#9-coming-later)).

---

## 6. Extensii <!-- icon: plus -->

Încă nu. O extensie va adăuga ceva unei campanii, peste sistemul ei de joc: o lume, o aventură, o funcție precum vremea, reguli de casă de împărțit.

---

## 7. De unde vine o campanie și limba ei <!-- icon: world -->

### 7.1 Trei moduri de a avea o lume

- **Făcută din mers**: pornind de la premisa ta, maestrul de joc construiește fiecare loc, persoană și intrigă chiar înainte să ai nevoie de ele și le păstrează.
- **Pregătită la început**: la fel, dar cu lumea construită înainte de joc.
- **Din propria ta aventură**: dă-i maestrului de joc un text sau un PDF și cere-i să o pregătească, *[Pregătește această aventură ca pe campania noastră. Nu-mi spune nimic din ce se află în ea.]* Maestrul de joc scrie locurile, personajele și secretele. Încă nu există buton de import.

O campanie se joacă o singură dată: ca să joci din nou aceeași aventură, creează o campanie nouă.

### 7.2 Limbi

O singură limbă pe campanie, cea a maestrului de joc, pe care o urmează dashboardul. Dashboardul vine în 26 de limbi. Orice altă limbă este tradusă pe calculatorul tău de Codex sau Claude Code sau, fără ele, de maestrul de joc în chat. Termenii ediției a cincea în italiană provin din SRD-ul italian oficial; textul regulilor rămâne în engleză, iar maestrul de joc îl povestește în limba ta.

---

## 8. Pentru curioși: folderul campaniei <!-- icon: list -->

Nu trebuie să-l deschizi niciodată, iar el conține secretele campaniei tale. Are `campaign.yaml` (setările tale), `state.yaml` (unde a ajuns jocul), `world/` (o pagină markdown pentru fiecare personaj, loc, misiune și restul), `rules/` (regulile tale de casă), `images/`, `log.jsonl` (fiecare schimbare), `.saves/`, `.player/` (notițele tale) și fișierele mici care spun agenților IA unde se află RPG Engine. Paginile folosesc formatul Obsidian. Dacă schimbi o pagină de mână, maestrul de joc află la următorul răspuns.

Fiecare comandă pe care o folosește maestrul de joc poate fi rulată și în folderul campaniei: `rpg --help` le listează. Multe afișează secretele campaniei.

---

## 9. Mai târziu <!-- icon: hourglass -->

- **Tu ca maestru de joc**, cu IA jucând grupul.
- **Mod autor**: scrie o aventură cu IA, apoi exportă-o și împărtășește-o.
- **Mai mulți jucători pe același calculator**, fiecare cu propriul personaj, pe rând, în același chat.
- **Extensii**: setări, aventuri, funcții și reguli de casă.
- **Importul** manualelor și aventurilor tale.
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
