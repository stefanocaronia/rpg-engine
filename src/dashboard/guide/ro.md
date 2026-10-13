<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 d32a17eb 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: ghidul complet

**RPG Engine** îți permite să joci un joc de rol de masă cu o **IA în rolul de maestru de joc**.

Vorbești cu maestrul de joc într-un **chat**: maestrul de joc spune povestea, joacă toate celelalte roluri și hotărăște ce se întâmplă.

RPG Engine lucrează în fundal: **ține minte lumea**, **aruncă zarurile** și **ține socotelile**.

Lângă chat ții deschisă în browser o pagină, **dashboard-ul**, cu fișa personajului tău, zarurile, hărțile și jurnalul.

Ghidul este pentru jucători: nu trebuie să știi să programezi.

## Pornire rapidă <!-- icon: send -->

1. Instalează **Node.js** de pe [nodejs.org](https://nodejs.org) (versiunea LTS).
2. Instalează **Claude Code** sau **Codex**, aplicația AI în care rulează maestrul de joc, și autentifică-te ([2.4](#24-connect-your-ai)).
3. Deschide un terminal și instalează RPG Engine: `npm install -g rpg-engine`.
4. În terminal, creează o campanie: `rpg init "The Salt Isles"`.
5. Deschide Claude Code sau Codex în folderul nou și scrie *Salut! Hai să începem.* Maestrul de joc răspunde cu linkul către dashboard: deschide-l lângă chat.

Restul ghidului explică fiecare pas, apoi cum se joacă.

## 1. Ce este RPG Engine <!-- icon: about -->

### Cine ce face

| Cine | Ce face |
|---|---|
| **Tu** | Joci personajul tău. Spui ce face, ce spune și ce încearcă. |
| **Maestrul de joc** (AI-ul) | Spune povestea, joacă toate celelalte personaje, hotărăște ce se întâmplă, cere aruncări. |
| **RPG Engine** | Ține minte totul în fișiere, aruncă zarurile, numără punctele de viață, banii, timpul și distanțele, păstrează secretele până le descoperi. |

O inteligență artificială se pricepe să spună povești, dar ține minte prost. Lăsată singură, uită cine îți datorează bani, câte săgeți ai sau că podul a ars acum două sesiuni. RPG Engine ține minte toate acestea, așa că lumea rămâne aceeași de la o seară la alta, chiar într-un chat nou, chiar cu o altă inteligență artificială.

### Cum se simte

Scrii în chat, ca și cum ai vorbi la masă:

> Împing ușa încet și mă uit înăuntru.

Maestrul de joc răspunde cu ce vezi și se oprește când e rândul tău să alegi. Când ceva e nesigur și contează, maestrul de joc spune ce e în joc și cere o aruncare. Butoanele aruncării apar pe dashboard. Dai clic, zarurile cad pe pagină, iar maestrul de joc îți spune ce se întâmplă.

### Ce îl face deosebit

- **Lumea este persistentă.** Ce s-a spus rămâne adevărat. Un ticălos mort rămâne mort.
- **Zarurile sunt reale.** Maestrul de joc nu le poate trișa (în afară de dificultatea cea mai ușoară, dacă o alegi).
- **Secretele rămân secrete.** Maestrul de joc nu-ți spune niciodată ce nu știe personajul tău, chiar dacă insiști.
- **Lumea se mișcă fără tine.** Amenințările înaintează cât timp te odihnești sau călătorești, iar tu le vezi semnele.
- **Multe seri, o singură poveste.** O campanie este un folder pe computerul tău. Te poți opri oricând și poți continua mai târziu.

### Jocul pe care îl joacă astăzi

RPG Engine este făcut pentru orice joc de rol de masă. Astăzi vine cu un singur sistem de joc: **ediția a cincea** (din System Reference Document 5.1, gratuit). Vor veni și alte jocuri; vezi [Sisteme de joc](#5-game-systems-and-house-rules) și [Va urma](#9-coming-later).

---

## 2. Primii pași <!-- icon: path -->

### 2.1 Ce îți trebuie

- Un calculator cu Windows, macOS sau Linux.
- **Node.js 22** sau mai nou. Descarcă-l de la [nodejs.org](https://nodejs.org): versiunea „LTS" e potrivită. Vine cu `npm`, care instalează RPG Engine.
- Un **terminal**, fereastra în care scrii comenzi: pe Windows, aplicația Terminal sau PowerShell; pe macOS, Terminal. Îl folosești ca să instalezi RPG Engine, să creezi fiecare campanie și să pornești Claude Code sau Codex.
- O **gazdă AI**, aplicația în care rulează maestrul de joc: **Claude Code** sau **Codex**, cu planul și autentificarea lor. Vezi [2.4](#24-connect-your-ai).
- Cel mai **mare model** pe care îl oferă gazda ta. Un model mic se lasă păcălit: în testele noastre a spus secrete unui jucător care pretindea că e adevăratul maestru de joc.
- Un browser, pentru dashboard.

Autentificarea pe care o folosești pentru gazdă face mai mult: RPG Engine o folosește, pe calculatorul tău, ca să deseneze imagini cu locuri, misiuni, cei pe care îi întâlnești și personajul tău, și ca să traducă dashboardul în limbi pe care nu le include. Vezi [Imagini](#311-pictures) și [Limbi](#72-languages).

**Cum deschizi un terminal într-un folder.** Mulți pași spun „în folderul campaniei". Pe Windows, dă clic dreapta pe folder în File Explorer și alege **Deschide în Terminal**. Pe macOS, dă clic dreapta pe folder în Finder și alege **Servicii > Terminal nou în folder**. Sau, într-un terminal deja deschis, scrie `cd` și calea folderului, de exemplu `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Instalare

Deschide un terminal și scrie:

```text
npm install -g rpg-engine
```

Astfel primești comanda `rpg`. Ca să verifici că a mers:

```text
rpg --version
```

Vei folosi `rpg` o singură dată pentru fiecare campanie, ca s-o creezi. După aceea vorbești doar cu maestrul de joc: gazda ta AI pornește singură RPG Engine, cu aceeași comandă `rpg`.

### 2.3 Crearea unei campanii

O campanie este un folder. Deschide un terminal în folderul unde ții jocurile și scrie:

```text
rpg init "The Salt Isles"
```

Se creează folderul `The Salt Isles` cu o campanie nouă în el și ți se spune ce ai de făcut mai departe:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Rândurile de după *For the master* sunt pentru maestrul de joc, care le citește în chat: tu nu ai nimic de făcut cu ele. Ține minte unde se află folderul: te întorci la el de fiecare dată când joci. Fără un nume de folder, `rpg init` transformă folderul în care te afli în campanie.

`init` creează tot ce îi trebuie campaniei: setările, folderele lumii și fișierele mici care îi spun gazdei tale AI să folosească RPG Engine și să nu păstreze nicio memorie proprie în afara campaniei.

Nu trebuie să alegi nimic acum. Maestrul de joc te întreabă restul în chat, sau alegi tu în dashboard. Dacă știi deja unele alegeri, le poți da aici:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Se creează folderul `salt-isles`, cu campania *The Salt Isles* în el: un nume de folder fără spații și numele campaniei așa cum îți place.

| Opțiune | Ce stabilește | Valori |
|---|---|---|
| `--name` | Numele campaniei | oricare; numele folderului, dacă o omiți |
| `--language` | Limba jocului | un cod, precum `en`, `it`, `fr` |
| `--system` | Sistemul de joc | `5e`, deocamdată singurul |
| `--difficulty` | Cât de dur e jocul | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Ce înseamnă să cazi într-o luptă | `narrative`, `epic`, `dice` |

`rpg init --help` le listează și el. O campanie nu poate sta în folderul altei campanii.

Nu poți cere maestrului de joc să creeze o campanie: înainte de `init`, folderul nu conține nimic care să-i spună gazdei tale AI unde se află RPG Engine.

### 2.4 Conectează-ți AI-ul

RPG Engine funcționează cu **Claude Code** și **Codex**. Alte aplicații AI care folosesc unelte MCP ar putea funcționa și ele, dar nu le garantăm.

**Instalarea gazdei.** Claude Code și Codex rulează în terminal: nu sunt aplicația Claude sau ChatGPT de pe telefon. Fiecare are nevoie de propriul plan și de propria autentificare: Claude Code de un plan Claude plătit, Codex de o autentificare ChatGPT. Urmează paginile lor pentru instalare și autentificare: [Claude Code](https://code.claude.com/docs/en/setup) și [Codex](https://learn.chatgpt.com/docs/codex/cli). Faci asta o singură dată, pentru toate campaniile.

**Claude Code.** Deschide un terminal în folderul campaniei și scrie `claude`. Prima dată te întreabă dacă ai încredere în folder și spune că folderul permite uneltele jocului (`mcp__rpg`): alege **Yes, I trust this folder**. Atenție: răspunsul deja selectat este *No, exit*, deci dacă apeși Enter imediat, Claude Code se închide. Atât: campania i-a spus deja lui Claude Code să folosească RPG Engine și uneltele lui și să-și țină memoria oprită.

**Codex.** Deschide un terminal în folderul campaniei și scrie `codex`. Când te întreabă dacă ai încredere în folder, spune da: setările campaniei îi arată lui Codex unde se află RPG Engine, îi permit uneltele și îi opresc memoria, iar Codex le citește doar într-un folder în care ai încredere. În aplicația desktop, verifică dacă memoriile sunt oprite pentru chaturile jocului.

**De ce contează memoria.** Campania trăiește în fișierele ei. Dacă gazda își amintește lucruri și pe cont propriu, întoarcerea la o salvare nu ar fi o adevărată întoarcere: maestrul de joc ar ține minte ce a fost anulat.

### 2.5 Primul chat

Scrie orice, de exemplu:

> Salut! Hai să începem.

Maestrul de joc citește unde a rămas jocul și răspunde. În primul răspuns din fiecare chat îți dă **linkul către dashboard** (ceva de forma `http://127.0.0.1:4750`). Deschide-l în browser și ține-l lângă chat pe toată durata jocului. Fiecare campanie păstrează același link de la un chat la altul, doar dacă nu l-a luat alt program: atunci maestrul de joc îți dă linkul nou.

Între mesajele maestrului de joc, gazda ta arată uneltele pe care le folosește el, în rânduri scurte. Nu deschide detaliile lor (în Claude Code, ctrl+o): pot arăta ce scrie maestrul de joc, secretele incluse.

O campanie nouă trece prin trei etape, ca un joc cu un maestru de joc uman. Dashboardul le arată sus ca *1 Setări · 2 Sesiunea zero · 3 Joc*:

1. **Setări**: alegi cum vrei să joci. În afara poveștii.
2. **Sesiunea zero**: îți creezi personajul, în joc.
3. **Joc**: povestea.

### 2.6 Setări: alegerea modului în care joci

Maestrul de joc întreabă doar ce mai lipsește, câteva întrebări odată. Dacă scrii „decide tu", maestrul de joc alege și îți spune ce a ales. Cu dashboardul deschis, primul lui pas, **Setări**, arată aceleași întrebări ca niște cartonașe: o întrebare pe rând, fiecare valoare cu ce înseamnă, cea obișnuită marcată **Sugerat**. Alege acolo și maestrul de joc nu te va mai întreba în chat; **Sari peste** lasă o întrebare pentru mai târziu. Chatul rezolvă ce se poate face doar cu cuvinte: premisa unei lumi noi, limba și imaginile, despre care maestrul de joc întreabă doar dacă calculatorul tău le poate crea. De aceea pagina pune mai puține întrebări decât listează tabelul de mai jos.

Nu trebuie să studiezi tabelul: e aici ca să-l consulți. Poți schimba oricare dintre aceste setări mai târziu, în chat sau în **Setări** din dashboard. O schimbare se aplică de la următorul răspuns al maestrului de joc.

| Setare | Ce stabilește | Valori | Sugerat |
|---|---|---|---|
| **Mentor** (întrebat ca „Cât de bine cunoști jocul acesta?") | Cât te învață maestrul de joc regulile, în afara poveștii | **oprit** (doar povestea; întrebi între paranteze când vrei), **indicii** (un sfat scurt înainte de alegerile importante și când o regulă e ratată), **tutorial** (fiecare regulă explicată prima oară, suma completă a fiecărei aruncări, o scurtă recapitulare după lupte) | după răspunsul tău: n-am jucat niciodată → tutorial, puțin → indicii, îl cunosc → oprit |
| **Dificultate** | Cât de dur e jocul: lupte, tactica dușmanilor, indicii, comori, cât de repede se mișcă amenințările | poveste, ușor, normal, dificil, brutal | |
| **Letalitate** | Ce înseamnă să cazi într-o luptă | **narativă** (personajul tău nu moare niciodată), **epică** (moare doar când contează pentru poveste), **zaruri** (decid zarurile) | urmează dificultatea: poveste → narativă, ușor → epică, normal și peste → zaruri |
| **Salvări** | Când te poți întoarce | **moarte definitivă** (niciodată; poți doar să reiei campania de la capăt), **punct de control** (înapoi la ultimul sfârșit de scenă, doar dacă personajul tău moare), **liber** (înapoi la orice salvare și salvezi oricând ceri) | punct de control |
| **Rigoare** | Cât de strict urmează regulile hrana, lumina, oboseala, greutatea purtată, componentele vrăjilor și călătoria | **fluidă** (maestrul de joc le trece cu vederea), **reguli** (ca în carte: torțele se sting, rațiile se termină), **simulare** (dincolo de reguli: uzură, stricare, vreme) | fluidă |
| **Zaruri** | Cine aruncă zarurile personajului tău | **digitale** (le aruncă RPG Engine, pe pagină), **fizice** (le arunci tu pe ale tale și spui fețele) | |
| **Unități de măsură** | Distanțele și greutățile din poveste | metrice, imperiale | |
| **Însoțitori** | Cine călătorește cu tine | niciunul, creați cu tine în sesiunea zero, creați de maestrul de joc, întâlniți în joc | |
| **Imagini** | Imagini cu locuri, misiuni și cei pe care îi întâlnești, și portretul personajului tău, când ceri | niciuna, la cerere, locuri noi, misiuni și cei pe care îi întâlnești | întrebat o dată, doar dacă calculatorul tău le poate crea |
| **Linii** | Ce nu apare niciodată în joc | o listă sau nimic | |
| **Văluri** | Ce se poate întâmpla, dar doar în afara scenei | o listă sau nimic | |
| **Limbă** | Limba jocului și a dashboardului | oricare | luată după cum scrii și confirmată |

Sistemul de joc își poate adăuga propriile setări. Ediția a cincea adaugă **avansarea**: cum crește personajul tău în nivel, cu **puncte de experiență** sau la **repere** ale poveștii.

**Ce înseamnă dificultatea în joc.** Poveste: dușmani slabi, naivi, indicii evidente, din belșug din toate; maestrul de joc își poate îndulci propriile aruncări. Ușor: dușmani simpli, resurse generoase. Normal: dușmani rezonabili, trei indicii pentru fiecare concluzie, prețuri și comori standard. Dificil: dușmani isteți, indicii subtile, resurse rare, amenințări care se mișcă repede. Brutal: dușmani care întind ambuscade, se retrag și îi termină pe cei căzuți, resurse foarte rare, cele mai aspre odihne. Luptele sunt mereu dimensionate după grupul tău așa cum este acum.

**Fără o lume scrisă**, configurarea mai cere două lucruri:

- **Premisă**: genul, tonul și câteva elemente ale lumii, în cuvintele tale. De exemplu: *„Fantasy sumbru, dar cu speranță. Un oraș de pe malul unui râu, un vad bântuit, un cult în dealuri."*
- **Pregătire**: **din mers** (maestrul de joc construiește fiecare parte a lumii chiar înainte să ai nevoie de ea; sugerat) sau **totul la început**.

Apoi maestrul de joc propune un nume pentru campanie. Când nu mai lipsește nimic și spui că ești gata, jocul trece la sesiunea zero.

### 2.7 Sesiunea zero: personajul tău

Sesiunea zero este joc: îți creezi personajul împreună cu maestrul de joc, ca la o masă de joc.

- **Orice alegere e a ta**, dacă nu ceri maestrului de joc să o facă el. Poți veni cu o idee completă („un cleric semi-elf care și-a părăsit templul"), una vagă („cineva care vindecă, dar nu e deloc drăguț") sau cu nimic („surprinde-mă, apoi las-o să schimb lucruri").
- **Valorile abilităților.** Maestrul de joc îți spune metoda și plasa de siguranță înainte să se arunce vreun zar. În ediția a cincea: șirul standard, cumpărarea de puncte sau 4d6 renunțând la cel mai mic. Metoda pe care o stabiliți rămâne în înțelegerile mesei.
- **Povestea ta** nu e niciodată obligatorie. Dacă o dai, maestrul de joc o scrie în cuvintele tale, ți-o citește o dată înapoi și îi leagă oamenii și locurile de lume. O poți scrie și în dashboard (vezi [Grup](#party)).
- **Personalitate** (ediția a cincea): o trăsătură, un ideal, o legătură și un defect, din tabelele fundalului tău sau ale tale.
- **O imagine.** După ce personajul e gata, maestrul de joc îți cere o imagine cu el: un fișier de pe calculatorul tău sau un portret creat pe calculatorul tău după cum îl descrii (vezi [imaginea personajului tău](#37-your-characters-story-and-picture)).

Numerele fișei sunt calculate de RPG Engine din alegerile tale: nu faci tu niciodată calculele. Când personajele sunt gata și confirmi, începe povestea.

---

## 3. Jocul <!-- icon: chat -->

### 3.1 Vorbind cu maestrul de joc

Scrie ce face sau ce spune personajul tău, în cuvintele tale. Scurt e în regulă.

> Îl întreb pe hangiu cine a mai trecut pe aici în seara asta.
>
> „Nu venim după necazuri", spun, cu mâna departe de sabie.
>
> Mă urc pe acoperiș și aștept.

**În afara poveștii**, scrie între paranteze drepte:

> [Cum funcționează lupta corp la corp?]
>
> [Îmi mai pot folosi reacția în runda asta?]
>
> [Ne oprim aici pentru în seara asta.]

Maestrul de joc răspunde tot între paranteze, apoi se întoarce la poveste.

**Tu spui ce încerci; maestrul de joc spune ce se întâmplă.** Ceva care încalcă logica lumii sau faptele deja stabilite nu se întâmplă: maestrul de joc îți spune, în interiorul poveștii, și îți oferă ce este posibil.

**Maestrul de joc nu decide niciodată pentru personajul tău.** Nu te va pune să vorbești, să simți sau să alegi. Când are îndoieli, întreabă.

**Maestrul de joc nu vorbește niciodată despre motor.** Întreabă-l dacă ține evidența lucrurilor și va răspunde ca un maestru de joc: „Țin minte totul: continuăm de aici data viitoare."

**Poți să-l întrebi pe maestrul de joc cum se folosește dashboardul.** Cunoaște pagina: „Unde îmi văd vrăjile?", „Cum arunc manual?"

### 3.2 Aruncările

**Când are loc o aruncare.** Maestrul de joc cere o aruncare doar când rezultatul e nesigur și contează. Altfel spune da sau „da, dar". Înainte de aruncarea ta, maestrul de joc spune ce e în joc și ce probe se potrivesc, apoi se oprește. Tu arunci sau te răzgândești:

> **Maestru de joc:** Pervazul e îngust și ud. Dacă aluneci, e o cădere lungă în râu. O probă de Dexteritate (Acrobatică) sau te poți întoarce și poți căuta scările.
>
> **Tu:** Încerc.

**Aruncarea pe dashboard.** Când maestrul de joc cere, apare sus pe pagină un banner cu un buton pentru fiecare probă, de exemplu *Acrobatică +4 · cu avantaj*. Dă clic: zarurile cad pe pagină, iar maestrul de joc află rezultatul. Mai poți:

- să dai clic pe rândul potrivit al fișei, care se aprinde în auriu;
- să arunci zarurile potrivite din tava pentru zaruri;
- să scrii în banner propriile cuvinte, dacă vrei să faci altceva.

**Aruncarea manuală.** Dacă preferi să alegi zarurile singur, pornește **Manual** în colțul bannerului (sau în **Setări**). Butonul probei dispare, iar bannerul spune ce să arunci, ca un maestru de joc: *Aruncă singur Acrobatică, pe fișă sau cu zarurile.* Dă clic pe rândul fișei care se aprinde sau aruncă zarurile potrivite din tavă: RPG Engine le aruncă, adaugă bonusul tău, iar maestrul de joc află rezultatul. O probă pe care nici fișa, nici tava nu o pot face, cum ar fi o daună care re-aruncă 1-urile, își păstrează butonul. Manual rămâne pornit în acest browser până îl oprești.

**Zaruri fizice pentru tot jocul.** Cu setarea **Zaruri** pe fizice, maestrul de joc îți cere aruncările în cuvinte, iar tu scrii fețele pe care le-ai aruncat:

> [Am aruncat 14.]

RPG Engine îți adaugă modificatorii și refuză o față pe care zarurile tale nu o pot arăta.

**Aruncări libere.** Dă clic pe orice număr de pe fișă sau deschide tava pentru zaruri ca să arunci doar de distracție. Aruncările libere nu contează niciodată, nu sunt înregistrate, iar maestrul de joc nu le vede. Un 20 liber nu devine mai târziu unul adevărat.

**Aruncările maestrului de joc.** Maestrul de joc aruncă și pentru dușmani și pentru alții tot cu RPG Engine. Majoritatea aruncărilor sunt afișate în coloana ta de aruncări. Când nu trebuie să vezi un rezultat, maestrul de joc aruncă în secret. Poți oricând să întrebi:

> [A fost reală aruncarea aceea?]

Pentru o aruncare afișată, maestrul de joc îți dă numerele și motivul. Pentru una secretă, o amprentă care dovedește că aruncarea a fost făcută înainte să întrebi.

**Aruncările din chat** apar între paranteze drepte, imediat după momentul pe care îl decid: *[Persuasiune 14 + 3 = 17]*. Apoi povestea spune rezultatul.

### 3.3 Scene și lupte

Maestrul de joc conduce povestea în **scene**: o luptă, o conversație, o explorare, o călătorie, o odihnă, o provocare (o urmărire, o cursă, un puzzle). Nu trebuie să le gestionezi: așa ține RPG Engine capitolele poveștii. La sfârșitul fiecărei scene jocul se salvează singur, iar scena intră în povestea din jurnalul tău.

**Într-o luptă**, maestrul de joc povestește toate turele care nu sunt ale tale, una după alta, cu fiecare aruncare, și **se oprește unde poți decide**: rândul tău, o reacție, o alegere. Când îți vine rândul, spune ce faci:

> Lansez Sacred Flame asupra celui de lângă ușă.

Secțiunea **Luptă** din dashboard arată ordinea turelor, al cui e rândul, punctele de viață ale grupului tău și cât de răniți par dușmanii (nevătămat, rănit, plin de sânge, doborât: în cuvinte, niciodată în cifre). Dacă personajul tău cade, salvările contra morții apar mari pe pagină.

**Când lupta e deja decisă**, maestrul de joc poate să se ofere să povestească restul într-un singur mesaj.

### 3.4 Timpul, călătoria și lumea care se mișcă

**Timpul.** Fiecare acțiune durează în poveste, iar RPG Engine ține data: ziua 3, dimineață devreme. Maestrul de joc spune timpul așa cum îl măsoară lumea: zorii, al treilea clopot, căderea nopții. Între sesiuni nu trece timp: continui de unde te-ai oprit.

**Odihne.** Spune că te odihnești, iar maestrul de joc aplică ce aduce înapoi o odihnă, cum ar fi punctele de viață și locurile de vrăji:

> Ne facem tabăra și ne odihnim îndelung.

**Călătoria.** Spune unde vrei să mergi:

> Luăm drumul spre nord, către Rocca.

RPG Engine calculează drumul, distanța și zilele în ritmul tău și te mută acolo. O călătorie se oprește când se întâmplă ceva planificat pe drum, la sfârșitul călătoriei din fiecare zi și la sosire. Poți întreba cât de departe e un loc înainte să pleci:

> [Cât de departe e Rocca și cât ar dura pe jos?]

**Lumea se mișcă și fără tine.** Răufăcătorii au planuri cu termene și ceasuri. În fiecare zi nouă, maestrul de joc mută amenințările pe care timpul le-a avansat, iar tu le vezi semnele: un zvon, o urmă, o schimbare în oraș. Nu vezi niciodată ceasul în sine, doar ce lasă în urmă.

**Banii** se numără în monedele jocului. Plătești, vinzi, ești plătit: RPG Engine dă restul.

### 3.5 Hărți

**Harta lumii** (dashboard: **Lume**) arată doar locurile pe care le cunoaște personajul tău, cu drumurile dintre ele, poteca pe care ai mers și ceața peste tot restul. Dă clic pe un loc ca să vezi ce știi despre el și cât de departe e.

**Harta unui loc** (dashboard: **Scenă**, iar în luptă **Luptă**) apare când maestrul de joc desenează una pentru locul în care te afli: ziduri, uși, terenul și cine stă unde, ca jetoane. Într-o luptă, în rândul tău, căsuțele pe care nu le poți atinge sunt acoperite cu un văl, așa că vezi dintr-o privire unde poți merge. Când maestrul de joc întreabă unde se mută personajul tău, pagina deschide harta, iar tu atingi o căsuță sau o scrii, de exemplu *E4*.

### 3.6 Misiuni, jurnal și notițe

**Misiuni.** Când personajul tău își asumă o sarcină, aceasta devine o misiune în **Jurnal**: cine a dat-o, unde, până când, obiectivele ei ca listă și ce măsoară (un termen cu timpul rămas, un ceas, un număr). Marcheaz-o cu steluța ca s-o urmărești: rămâne mică sus în Scenă, cu următorul ei obiectiv. Misiunea se încheie când o încheie povestea, niciodată de la sine.

**Povestea.** Fila Poveste din Jurnal este campania ta ca o cronologie: fiecare scenă un capitol, cu locul, data și un scurt rezumat, ultima prima.

**Notițele tale.** În fila Notițe din Jurnal îți scrii propriile notițe: teorii, nume, planuri. Rămân pe calculatorul tău, iar maestrul de joc nu le citește, decât dacă le **Partajează**. O notiță partajată ajunge la maestrul de joc la următorul lui răspuns ca ceea ce crezi tu, nu ca un fapt. Teoria ta nu devine adevărată pentru că ai scris-o. O notiță care cere să se oprească sau să se evite un anumit conținut contează ca și cum ai fi spus-o la masă.

### 3.7 Povestea și imaginea personajului tău

Pe fișa personajului tău, cartonașul **Descriere** are o casetă în care îți scrii povestea personajului. Trimite-o, iar maestrul de joc o scrie în personaj cu propriile cuvinte, după ce spui da.

Pentru imaginea personajului tău, dă-i maestrului de joc în chat un fișier cu o imagine, împreună cu locul unde se află pe calculatorul tău (PNG, JPEG, WebP sau SVG, până la 5 MB):

> [Iată portretul personajului meu: C:\Users\me\Pictures\mira.png]

Maestrul de joc o copiază în campanie, iar ea apare pe jetonul personajului tău din dashboard. O poți schimba la fel oricând vrei.

Sau poți cere să fie creat portretul, acolo unde calculatorul tău creează imagini (vezi [Imagini](#311-pictures)): descrie-i personajul maestrului de joc sau lasă-l pe maestrul de joc să-l descrie.

> [Fă-mi un portret: păr cărunt împletit într-o coadă, o cicatrice pe bărbie, ochi obosiți.]

Portretul arată exact ce este personajul tău în joc, oamenii lui așa cum îi are această lume, un pitic de deal ca un pitic de deal, cu înfățișarea pe care ai descris-o. Vine în cam un minut, pe jetonul personajului tău. Și însoțitorii tăi îl pot avea la fel.

### 3.8 Salvări și întoarcerea în timp

RPG Engine salvează toată campania **la sfârșitul fiecărei scene**, singur. Ce poți face cu aceste salvări depinde de setarea **Salvări**:

| Salvări | Salvezi când vrei | Te întorci |
|---|---|---|
| **moarte definitivă** | nu | niciodată; poți doar să reiei campania de la capăt |
| **punct de control** | nu | la ultima salvare, doar când personajul tău moare |
| **liber** | da | la orice salvare, oricând vrei |

În orice mod poți **relua de la capăt**: de la începutul jocului cu același personaj sau de la sesiunea zero cu unul nou.

Poți face toate acestea în chat („[Hai să ne întoarcem la dinainte de duel.]") sau în secțiunea **Salvări** din dashboard.

**După ce te-ai întors, deschide un chat nou.** Chatul în care jucai își amintește ce a fost anulat. Deschide un chat nou cu maestrul de joc (`/clear` în Claude Code, `/new` în Codex), scrie *continuă*, apoi apasă **Am deschis un chat nou** în Salvări sau spune-i maestrului de joc în chatul nou. Nu relua niciodată chatul vechi. Până nu confirmi, maestrul de joc nu merge mai departe.

### 3.9 Sesiuni: oprirea și întoarcerea

**Încheii sesiunea** oricând vrei:

> [Ne oprim aici pentru în seara asta.]

Nu există „salvează și ieși": totul e deja în fișiere.

**Ca să închizi** chatul, scrie `/exit` în Claude Code sau `/quit` în Codex. Dashboardul amuțește până la următorul chat.

**Ca să te întorci**, deschide un terminal în folderul campaniei (cel afișat de `init`), pornește gazda acolo și scrie *continuă*. Maestrul de joc citește unde a rămas jocul, îți face o scurtă recapitulare și începe cu ceva care se întâmplă. Un chat nou nu pierde nimic: campania trăiește în fișierele ei, nu în chat.

Maestrul de joc nu pune întrebări de rutină la final. Doar dacă a observat că ceva n-a mers, întreabă pe scurt.

### 3.10 Starea maestrului de joc

Sus în dashboard se află avatarul maestrului de joc, un mic robot. Fața lui urmează tonul poveștii: îngrijorat când pericolul crește, încântat la o idee îndrăzneață, surprins la o întorsătură. Reacționează o clipă la un 20 natural sau la un 1 natural. Nu arată niciodată ce nu știi încă: niciun rânjet înainte să se declanșeze capcana. Și jetoanele grupului tău își arată stările. Când chatul e închis, robotul doarme.

### 3.11 Imagini

RPG Engine poate crea o imagine pentru fiecare loc la care ajungi, fiecare misiune pe care o primești și fiecare personaj sau fel de creatură pe care o întâlnești, desenate așa cum le vezi, după cum spune setarea **Imagini**, și portretul personajului tău când ceri. Folosește ce există deja pe calculatorul tău:

- **Codex**, cu autentificarea ta ChatGPT: o imagine pictată.
- Altfel **Claude Code**, cu autentificarea ta Claude: un desen.

Imaginea folosește propriul tău plan, nu pe al nostru. Secțiunea **Setări** îți spune dacă pe calculatorul tău se pot crea imagini și, dacă nu, pașii pentru a le configura. Fără imagini, pagina arată în schimb semnul fiecărui fel de loc. Poți să-i dai maestrului de joc și o imagine a ta pentru orice loc sau personaj.

### 3.12 Siguranță: linii, văluri și stop

- **Linii**: ce nu apare niciodată în joc.
- **Văluri**: ce se poate întâmpla, dar doar în afara scenei.
- **Stop**: în orice moment poți opri un conținut, fără să explici. Scrie în afara poveștii:

> [stop]

Maestrul de joc renunță imediat la el și îl adaugă la liniile tale, pentru toate sesiunile următoare. Îți poți vedea și schimba liniile și vălurile în **Setări**.

### 3.13 Răzgândirea

Orice setare se poate schimba în timpul campaniei: în chat („[Hai să fie mai greu.]") sau în **Setări**. Maestrul de joc află de schimbare la următorul răspuns. O decizie luată de maestrul de joc fără carte devine un **precedent** și este păstrată, astfel că aceeași întrebare primește aceeași dată viitoare același răspuns.

---

## 4. Dashboardul, secțiune cu secțiune <!-- icon: party -->

Dashboardul este o pagină de pe propriul tău computer. Maestrul de joc îți dă linkul ei la începutul fiecărui chat. Urmărește jocul în direct: când maestrul de joc schimbă ceva, se schimbă și pagina.

O poate deschide doar browserul computerului pe care joci: nu un telefon sau o tabletă, nici măcar pe același Wi-Fi. Pagina încape și într-o fereastră îngustă: atunci secțiunile trec într-o bară de jos, iar iconițele într-un meniu.

Pagina trăiește cât trăiește chatul. Închide chatul, iar o pagină rămasă deschisă arată *Nu este conectat*, cu fișa așa cum era, iar robotul maestrului de joc adoarme; deschide din nou un chat în campanie și, după ce maestrul de joc a răspuns, pagina revine singură.

### Sus

- **Avatarul maestrului de joc**, cu starea lui de spirit.
- Numele campaniei, sistemul de joc, **ora jocului** și dacă jocul este **conectat** (chatul legat).
- Secțiunile: **Grup**, **Scenă**, **Luptă** (doar în timpul unei lupte), **Jurnal**, **Lume**; la capătul rândului, ca iconițe: **Salvări**, **Ajutor**, **Setări**, **Despre**.
- Tema deschisă și cea închisă, în colțul din dreapta sus.

Când maestrul de joc te întreabă ceva, bannerul lui rămâne sus pe pagină, în ce secțiune ai fi.

### Grup

Fișa personajului tău și cele ale însoțitorilor. Fiecare parte a fișei este un card pe care îl poți deschide și închide.

- **Dă clic pe un număr** ca să-l arunci de plăcere. Ține cursorul pe un număr ca să vezi cum se formează („+5: Înțelepciune +3, măiestrie +2”).
- **Punctele de viață, locurile și utilizările** apar ca bare și buline.
- **Stările și efectele** apar cu durata lor.
- **Descriere** conține textul personajului tău și caseta în care îi trimiți maestrului de joc povestea personajului.
- La 0 puncte de viață, **aruncările de salvare la moarte** apar mari sub nume.
- Lângă fișă (sub ea, pe un ecran îngust): **aruncările**, cele mai noi primele, ale tale și ale maestrului de joc pe care ai voie să le vezi. **Scoate** golește lista; **Restabilește** o aduce înapoi. Aruncările libere apar punctate și estompate.

Un însoțitor cu fișă de creatură, cum ar fi un lup, își arată fișa de creatură în loc de o fișă completă.

### Scenă

Unde se află grupul tău: imaginea și numele locului, locurile din jur, harta locului când există una, cine este acolo și scena deschisă, cu ce se întâmplă acum. Misiunea pe care o urmărești stă sus.

### Luptă

Doar în timpul unei lupte. Sus: runda, cine acționează, cine urmează. Dedesubt: ordinea turelor, fiecare luptător cu starea lui, grupul tău în numere și dușmanii în cuvinte; ce are personajul tău la îndemână (clasa de armură, punctele de viață, atacurile); harta locului, cu cel care acționează încercuit. La rândul tău, linkul Luptă pulsează în auriu, oriunde te-ai afla.

### Jurnal

Trei file:

- **Misiuni**: active, încheiate și eșuate, fiecare ca un card cu obiectivele, termenul ca temporizator și ceasurile. Steluța urmărește o misiune.
- **Poveste**: capitolele campaniei, scenă cu scenă, ultimul primul.
- **Notițe**: notițele tale, private până partajezi una.

### Lume

Harta lumii așa cum o cunoaște personajul tău, cu ceața peste restul. Trage ca să muți harta, rotița sau ciupirea ca să mărești. Dă clic pe un loc pentru cardul lui. Alături se află o listă a locurilor, cele mai apropiate primele. Cu mai multe hărți (un oraș, un continent, un alt plan), filele comută între ele.

### Tava pentru zaruri

Butonul cu zaruri deschide tava: alege zarurile și un modificator, apoi aruncă. Cu două sau mai multe zaruri de același fel, alegi care contează: **Toate**, **Mare** (doar cel mai mare) sau **Mic** (doar cel mai mic). Zarurile alese rămân până apeși **Scoate**, așa că aceeași aruncare de daună înseamnă un singur clic în fiecare rundă. Cât timp maestrul de joc cere o aruncare, tava îți spune care zaruri răspund la ea.

### Salvări

Salvările tale, cele mai noi primele, fiecare cu locul, data jocului și momentul în care a fost făcută. **Salvează acum** (cu salvări libere), **Revino aici** și **Reia de la capăt**, în roșu, în doi pași. Vezi [Salvări și întoarcerea în timp](#38-saves-and-going-back).

### Setări

Setările tale, în grupuri: jocul, învățarea jocului (mentorul și regulile deja explicate), zaruri și măsuri, limite (linii și văluri), imagini, limbă. Dă clic pe o valoare ca s-o alegi; sub ea, ce înseamnă. Apoi preferințele paginii însăși, păstrate doar în acest browser: tema, sunetul zarurilor, **setul de zaruri** (rășină, metal, lemn, piatră), muchii rotunjite sau ascuțite, aruncarea manuală.

Setările proprii ale maestrului de joc, cum ar fi regulile casei și precedentele, nu sunt aici: rămân în chat.

### Ajutor și Despre

**Ajutor**: acest ghid. **Despre**: ce este RPG Engine, linkurile lui, licențele și creditele sistemului de joc.

### Înainte de joc: Setări și sesiunea zero

Cât timp o campanie nouă este în primul ei pas, **Setări**, toată pagina își pune întrebările: una pe rând, fiecare cu ce înseamnă valorile ei și cu cea sugerată. **Decizi tu** lasă o întrebare în seama maestrului de joc, în afară de linii și văluri, care sunt mereu ale tale; **Sari peste** o lasă pe mai târziu. La final, **Sunt gata**.

### Mesaje de la pagină

Uneori pagina arată o notificare peste ea însăși: o problemă în fișierele campaniei (o rezolvă maestrul de joc), jocul plecat (chatul este închis), pagina în curs de traducere.

---

## 5. Sisteme de joc și reguli de casă <!-- icon: dice -->

### 5.1 Ce este un sistem de joc

Un sistem de joc reprezintă datele unui singur joc: fișa, cifrele, creaturile, obiectele, vrăjile și textul regulilor. Fiecare campanie folosește un singur sistem.

RPG Engine calculează fișa personajului și ce se consumă și ce se reface, precum punctele de viață și locurile de vrăji, ca o fișă digitală de personaj. Cum funcționează o abilitate sau o vrajă, maestrul de joc citește în reguli și hotărăște, ca la o masă de joc.

### 5.2 Ediția a cincea, inclusă

RPG Engine include **5e**, din System Reference Document 5.1 (regulile din 2014, libere sub Creative Commons). Conține:

- rasele, clasele, subclasele, un background și un feat din SRD;
- cele 319 vrăji, armele, armurile și echipamentul, obiectele magice și monștrii din SRD;
- capitolele de reguli, pe care maestrul de joc le caută după textul lor exact;
- fișa completă a personajului, calculată: modificatorii abilităților, salvările, abilitățile de tip skill, Classe Armatura, atacurile, dificultatea de salvare a vrăjilor, locurile de vrăji, zarurile de viață, trăsăturile pe niveluri, experiența și creșterea în nivel;
- odihne care refac ce trebuie; stări cu textul regulii lor; mementouri pentru concentrare.

**Conținut dincolo de SRD.** Poți juca ediția a cincea cu conținut care lipsește din SRD, cum ar fi o clasă sau un monstru dintr-o carte pe care o ai. Maestrul de joc cunoaște jocul, îți poate citi manualele și poate căuta pe web. Scrie ce are nevoie sub formă de pagini ale campaniei tale, iar RPG Engine funcționează la fel cu ele. Ce livrăm noi este limitat de licență; ce știe maestrul tău de joc nu este.

RPG Engine livrează doar conținut original sau cu licență deschisă: pentru ediția a cincea, SRD 5.1 sub CC BY 4.0. Orice altceva apare în jocul tău este scris de AI-ul tău sau de tine, ca pagini ale campaniei tale, pe calculatorul tău: nu face parte din RPG Engine și nu îl distribuim.

RPG Engine este compatibil cu ediția a cincea.

### 5.3 Reguli de casă și completările tale

Nu trebuie să atingi niciun fișier. Cere-i maestrului de joc:

> [Regulă de casă: un 1 natural la atac înseamnă că îți scapi arma.]
>
> [Aș vrea să joc un Blood Hunter. Am cartea: iată trăsăturile clasei.]
>
> [În campania asta, o odihnă scurtă durează 10 minute.]

Maestrul de joc le înregistrează în campania ta, într-unul dintre aceste moduri:

- **O înțelegere a mesei**, în cuvinte, precum arma scăpată sau odihna scurtă de mai sus. Maestrul de joc o păstrează laolaltă cu setările campaniei și joacă după ea de atunci încolo. O decizie pe care maestrul de joc o ia fără carte este păstrată la fel, ca **precedent**.
- **O pagină nouă**, precum o clasă, o rasă sau un obiect. O clasă nouă funcționează ca cele ale sistemului: nivelul, zarurile de viață și trăsăturile tale o iau în calcul. O rasă nouă se poate baza pe una existentă („ca Elful, plus…"); o sabie cu nume se poate baza pe Sabia lungă.
- **Cifre noi pentru fișă**: un câmp, un tabel, o formulă, un contor pe care o odihnă îl reface. De exemplu, zarurile de superioritate ale unui Battle Master, care revin la o odihnă scurtă. O regulă de casă poate înlocui și una dintre formulele sistemului.

Dacă ai deja reguli de casă scrise, le poți pune și ca fișiere text în folderul `rules` al campaniei (vezi [folderul campaniei](#8-for-the-curious-the-campaign-folder)): maestrul de joc le citește înaintea regulii din carte cu același nume.

### 5.4 Adăugarea sau importul propriului sistem de joc

Astăzi RPG Engine joacă doar ediția a cincea. Vor veni și alte sisteme de joc, precum și o cale de a-l adăuga pe al tău sau de a transforma un joc pe care îl ai într-unul pornind de la manualele lui. Vezi [Mai târziu](#9-coming-later).

---

## 6. Extensii <!-- icon: plus -->

**Extensiile nu sunt încă disponibile.** O extensie va adăuga ceva unei campanii, peste sistemul ei de joc: o lume, o aventură, o funcție precum vremea sau un pachet de tarot, reguli ale casei de partajat. Vei alege care dintre ele le folosește fiecare campanie. Primele planificate pentru ediția a cincea sunt vremea și forțarea încuietorilor.

---

## 7. De unde vine o campanie și limba ei <!-- icon: world -->

### 7.1 Trei moduri de a avea o lume

**Făcută din mers.** Dai o premisă la configurare, iar maestrul de joc construiește lumea pe măsură ce mergi: fiecare loc, persoană și intrigă chiar înainte să ai nevoie de ele, apoi păstrate. Este cel mai rapid mod de a juca: instalezi, creezi și în câteva minute îți faci personajul. Nimic din ce s-a inventat nu se pierde: odată spus, este scris și rămâne adevărat.

**Pregătită la început.** Aceeași premisă, dar cu **pregătire: totul la început**; maestrul de joc construiește locurile lumii, facțiunile, amenințările și planurile lor înainte să înceapă jocul. Prima sesiune începe mai târziu, cu mai multe lucruri pregătite în spate.

**Dintr-o campanie sau aventură existentă.** Astăzi nu există un buton de import. Dă-i maestrului de joc aventura ta (un text sau un PDF pe care gazda ta îl poate citi) și cere-i s-o pregătească:

> [Am aventura asta ca PDF. Pregătește-o ca pe campania noastră: citește-o și scrie locurile, personajele și secretele ei. Nu-mi spune nimic din ce se află în ea.]

Maestrul de joc o citește cu uneltele gazdei tale AI și o scrie ca pagini ale campaniei, cu tot cu secrete, pe care le vei descoperi în joc. Claude Code citește PDF-uri; cu Codex, un fișier text sau markdown este alegerea mai sigură. Fă asta în timpul configurării, înainte de sesiunea zero.

Cât lucrează maestrul de joc, nu deschide detaliile a ce citește sau scrie (în Claude Code, ctrl+o): arată textul aventurii, cu tot cu secrete. Maestrul de joc însuși păstrează secretele, ca întotdeauna.

De îndată ce campania are pagini proprii, configurarea nu mai cere premisă și pregătire. Chiar și într-o campanie scrisă, când mergi într-un loc pe care textul nu îl acoperă, maestrul de joc creează ce e nevoie și înregistrează.

**O campanie se joacă o singură dată.** Ca să joci din nou aceeași aventură, creează o campanie nouă. În cadrul unei campanii, tot poți să te întorci la o salvare sau să reiei de la capăt, după cum permite setarea Salvări.

### 7.2 Limbi

**O limbă pe campanie**: cea a maestrului de joc. Maestrul de joc scrie în ea, iar dashboardul o urmează. Maestrul de joc o ia din felul în care scrii și o confirmă.

**Dashboardul** vine în engleză și italiană (îngrijite) și în încă 24 de limbi: franceză, germană, spaniolă, portugheză (braziliană), olandeză, suedeză, norvegiană, daneză, finlandeză, islandeză, rusă, ucraineană, poloneză, cehă, română, maghiară, greacă, turcă, arabă, ebraică, hindi, chineză, japoneză, coreeană. Araba și ebraica se citesc de la dreapta la stânga: pagina se oglindește, iar hărțile și zarurile rămân așa cum sunt desenate.

**Orice altă limbă** pe care o alegi în Setări este tradusă pe computerul tău, în fundal, de Codex sau Claude Code cu propria ta autentificare, începând cu secțiunea pe care o ai deschisă. Se face o singură dată pentru fiecare limbă, pentru toate campaniile tale. Până e gata, pagina este în engleză. Setări îți spune dacă traducerea este în curs, gata sau imposibilă pe computerul tău.

**Cuvintele jocului.** Ediția a cincea vine cu propriii termeni în italiană din SRD-ul oficial italian, așa că jucătorii italieni citesc *Classe Armatura*, *tiro salvezza*, *vantaggio*. Celelalte limbi primesc termenii sistemului traduși.

**Textul propriu al sistemului de joc** (vrăjile, monștrii, capitolele de reguli) rămâne în engleză. Maestrul de joc îl citește și ți-l spune în limba ta.

**Schimbarea limbii în mijlocul campaniei** lasă paginile deja scrise așa cum sunt; maestrul de joc le scrie pe cele noi în limba nouă.

---

## 8. Pentru curioși: folderul campaniei <!-- icon: list -->

Nu trebuie niciodată să-l deschizi. Dacă o faci, să știi că **el conține secretele** campaniei tale: citindu-l îți strici jocul.

Un folder de campanie conține:

- `campaign.yaml`: setările tale;
- `state.yaml`: unde se află jocul acum: etapa, data, scena deschisă;
- `world/`: câte o pagină pentru fiecare personaj, loc, facțiune, misiune, obiect, eveniment, subiect sau creatură, ca fișiere markdown;
- `rules/`: regulile tale ale casei ca fișiere text, dacă adaugi unele (`init` nu îl creează);
- `images/`: imaginile, după ce există unele;
- `log.jsonl`: fiecare schimbare, în ordine;
- `.saves/`: salvările, de la prima încolo;
- `.player/`: notițele tale din Jurnal, pe care maestrul de joc nu le citește;
- `sessions/`: ținut de RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: fișierele mici care spun gazdelor AI unde este RPG Engine și le țin memoria oprită. RPG Engine le ține la zi; lasă-le așa cum sunt.

Paginile sunt markdown simplu, cu linkuri precum `[[Rocca]]`, formatul din Obsidian: carnetul maestrului de joc poate fi deschis acolo. **Dacă schimbi o pagină manual**, maestrul de joc află ce s-a schimbat la următorul răspuns.

**Linia de comandă.** Tot ce face maestrul de joc trece prin comenzi pe care le poți rula și tu, în folderul campaniei. Nu ai nevoie de ele ca să joci, iar multe afișează secretele campaniei, cum fac `rpg status` și `rpg show`. `rpg --help` le listează pe toate, iar `rpg roll --help` o explică pe una. O comandă care schimbă ceva cât timp un chat este deschis nu face rău: maestrul de joc află de ea la următorul răspuns, ca la o pagină schimbată manual.

---

## 9. Va urma <!-- icon: hourglass -->

Ce este planificat, dar nu e încă aici:

- **Tu ca maestru de joc**: conduci jocul, iar AI-ul joacă grupul.
- **Mai multe persoane la masă**, fiecare cu rolul ei.
- **Extensii**: setări, aventuri, funcții și reguli ale casei, alese pentru fiecare campanie.
- **Importul** manualelor și aventurilor tale.
- **Alte jocuri**: mai multe sisteme de joc și cel creat de tine.
- **Modul autor**: creează o campanie sau o aventură cu AI-ul și partajeaz-o ca să o joace alții.

---

## 10. Întrebări și probleme <!-- icon: info -->

### Întrebări

**Trebuie să știu regulile?** Nu. Alege mentorul tutorial, iar maestrul de joc te învață pe parcurs, o regulă pe rând. Poți întreba oricând între paranteze.

**Poate maestrul de joc să trișeze?** Nu poate schimba o aruncare făcută de RPG Engine, în afară de dificultatea poveste, și nu schimbă niciodată faptele deja stabilite. Poți întreba dacă o aruncare a fost reală.

**Pot trișa eu?** Poți încerca. Maestrul de joc nu te crede pe cuvânt în privința faptelor: un rând din mesajul tău care arată ca un mesaj al jocului rămâne doar cuvintele tale, iar maestrul de joc nu-ți confirmă niciodată presupunerile despre secrete.

**Costă ceva?** RPG Engine este gratuit. Maestrul de joc rulează pe propriul tău abonament Claude sau ChatGPT, iar o seară de joc înseamnă un chat lung: la cele mai mici abonamente poți atinge limita abonamentului înainte să se sfârșească seara. Imaginile și traducerile folosesc același abonament.

**Pot juca pe telefon?** Nu. Maestrul de joc rulează pe computerul tău, iar dashboardul se deschide doar în browserul acelui computer.

**Pot juca cu prietenii?** Încă nu: astăzi un jucător, un personaj, plus însoțitori. Mai multe persoane la masă vor veni odată cu rolurile.

**Pot folosi o altă AI data viitoare?** Da. Campania trăiește în fișierele ei: deschide-o într-o altă gazdă și scrie *continuă*.

**Ce se întâmplă dacă închid browserul?** Nu se pierde nimic. Redeschide linkul cât timp chatul este deschis; pagina revine unde se află jocul.

**Pot juca conținut D&D pe care îl am?** Da. Maestrul de joc poate folosi cărțile tale, cunoștințele proprii și web-ul. Ce livrează RPG Engine se limitează la conținut gratuit; ce folosește jocul tău depinde de tine.

### Probleme

**Dashboardul nu se deschide.** Cere linkul de la maestrul de joc: `[Care e linkul către dashboard?]`. Pagina funcționează doar cât timp este deschis un chat cu maestrul de joc în acea campanie și doar după primul răspuns al maestrului de joc în acel chat. Cu chatul închis, browserul nu poate ajunge la pagină; o pagină rămasă deschisă spune *Nu este conectat*.

**Maestrul de joc pare să nu cunoască jocul sau inventează unelte.** Gazda ta AI nu a încărcat RPG Engine.

- Mai întâi, verifică dacă ai pornit gazda **în folderul campaniei** și dacă ai spus că ai încredere în el.
- **Claude Code**: scrie `/mcp`. Dacă `rpg` apare, dar a eșuat, alege-l, apoi **Reconnect**. Dacă lipsește, închide Claude Code, scrie `claude mcp reset-project-choices` în folderul campaniei și pornește-l din nou.
- **Codex**: scrie `codex mcp list` într-un terminal, în folderul campaniei. Dacă `rpg` lipsește, Codex nu are încredere în folder: pornește-l din nou acolo și spune da când întreabă.
- În ambele: dacă `rpg --version` într-un terminal spune că nu găsește comanda, instalează din nou RPG Engine ([2.2](#22-install)) și deschide un terminal nou.

**După o actualizare nu s-a schimbat nimic.** Un maestru de joc care rulează păstrează versiunea cu care a pornit. Deschide un chat nou sau, în Claude Code, reconectează serverul (`/mcp`, apoi `rpg`, apoi **Reconnect**).

**Maestrul de joc ține minte ceva ce am anulat.** Te-ai întors la o salvare, dar ai continuat să joci în același chat. Deschide un chat nou și apasă **Am deschis un chat nou** în Salvări.

**Maestrul de joc pune întrebări de configurare la care am răspuns deja pe pagină.** Spune-i: `[Pe acelea le-am ales pe dashboard.]`

**Nu apare nicio imagine.** Deschide Setări > Imagini: îți spune dacă acest computer le poate crea și, dacă nu, pașii, fiecare comandă cu un buton pentru a o copia.

**Pagina este în engleză, dar am ales altă limbă.** Se traduce în fundal; Setări spune cum merge. Fără Codex sau Claude Code pe acest computer, rămâne în engleză.

**Maestrul de joc spune că campania are probleme.** Le rezolvă singur. Dacă ai modificat fișiere manual, te poate întreba ce ai vrut să faci.

**Windows: `npm` eșuează în folderul meu.** Nu ține campania, sau RPG Engine, într-o cale care conține `&`.

**Instalarea eșuează sau `rpg` nu pornește.** Verifică versiunea de Node.js cu `node --version`: trebuie să fie 22 sau mai nouă. Dacă este mai veche, instalează versiunea LTS de pe [nodejs.org](https://nodejs.org), apoi instalează din nou RPG Engine.

**Linkul dashboardului s-a schimbat.** Alt program folosea adresa obișnuită a campaniei sau Windows o rezervase. RPG Engine a luat alta; maestrul de joc îți dă linkul nou. Nimic altceva nu se schimbă.
