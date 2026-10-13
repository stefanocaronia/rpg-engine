<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 d32a17eb 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: a teljes útmutató

Az **RPG Engine** segítségével **MI mesélővel** játszhatsz asztali szerepjátékot.

A mesélővel egy **csevegésben** beszélgetsz: a mesélő elmeséli a történetet, megszólaltat mindenki mást, és eldönti, mi történik.

Az RPG Engine a háttérben dolgozik: **megjegyzi a világot**, **dob a kockákkal**, és **vezeti a számításokat**.

A csevegés mellett nyitva tartasz egy oldalt a böngészőben, az **irányítópultot**. Itt találod a karaktered karakterlapját, a kockákat, a térképeket és a naplódat.

Ez az útmutató játékosoknak szól: nem kell hozzá tudnod programozni.

## Gyors kezdés <!-- icon: send -->

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org) oldalról (az LTS verziót).
2. Telepítsd a **Claude Code**-ot vagy a **Codex**-et, azt az MI-alkalmazást, amelyben a mesélő fut, és jelentkezz be ([2.4](#24-connect-your-ai)).
3. Nyiss egy terminált, és telepítsd az RPG Engine-t: `npm install -g rpg-engine`.
4. A terminálban hozz létre egy kampányt: `rpg init "The Salt Isles"`.
5. Nyisd meg a Claude Code-ot vagy a Codex-et az új mappában, és írd be: *Szia! Kezdjünk bele.* A mesélő a dashboard linkjével válaszol: nyisd meg a csevegés mellett.

Az útmutató többi része lépésről lépésre elmagyarázza ezeket, aztán azt is, hogyan kell játszani.

## 1. Mi az RPG Engine <!-- icon: about -->

### Ki mit csinál

| Ki | Mit csinál |
|---|---|
| **Te** | A karaktered játszod. Elmondod, mit tesz, mond és próbál meg a karaktered. |
| **A mesélő** (az MI) | Elmeséli a történetet, minden más szereplőt ő alakít, ő dönt a történésekről, és ő kér dobást. |
| **RPG Engine** | Fájlokban megjegyez mindent, dob a kockákkal, számolja az életpontokat, a pénzt, az időt és a távolságokat, és titokban tartja a titkokat, amíg fel nem fedezed őket. |

Az MI jól mesél, de rosszul emlékszik. Magára hagyva elfelejti, ki tartozik neked pénzzel, hány nyilad maradt, vagy hogy a híd két alkalommal ezelőtt leégett. Az RPG Engine mindezt megőrzi, így a világ estéről estére ugyanaz marad, új csevegésben is, más MI-vel is.

### Milyen érzés játszani

A csevegésben úgy írsz, ahogy az asztalnál beszélnél:

> Lassan benyitok az ajtón, és belesek.

A mesélő elmondja, mit látsz, és megáll, amikor te jössz döntéssel. Ha valami bizonytalan és fontos, a mesélő megmondja, mi a tét, és dobást kér. A dobás gombjai megjelennek a dashboardon. Kattintasz, a kockák legurulnak az oldalon, és a mesélő elmondja, mi történik.

### Mitől más

- **A világ állandó.** Ami elhangzott, az igaz marad. A halott gonosz halott marad.
- **A kockák valódiak.** A mesélő nem tud hamisítani rajtuk (kivéve a legkönnyebb nehézségen, ha azt választod).
- **A titkok titkok maradnak.** A mesélő sosem árulja el, amit a karaktered nem tud, akkor sem, ha győzködöd.
- **A világ nélküled is mozog.** A fenyegetések haladnak, amíg pihensz vagy utazol, és látod a nyomaikat.
- **Sok este, egy történet.** A kampány egy mappa a számítógépeden. Bármikor abbahagyhatod, és később folytathatod.

### A játék, amelyet ma játszhatsz

Az RPG Engine bármilyen asztali szerepjátékhoz készült. Ma egy játékrendszert tartalmaz: az **ötödik kiadást** (az ingyenes System Reference Document 5.1 alapján). További játékok következnek; lásd a [Játékrendszerek](#5-game-systems-and-house-rules) és a [Később jön](#9-coming-later) részt.

---

## 2. Első lépések <!-- icon: path -->

### 2.1 Mire van szükséged

- Egy számítógép Windows, macOS vagy Linux rendszerrel.
- **Node.js 22** vagy újabb. Töltsd le a [nodejs.org](https://nodejs.org) oldalról: az „LTS” verzió megfelel. Mellé jön az `npm`, amely telepíti az RPG Engine-t.
- Egy **terminál**, az ablak, ahová parancsokat írsz: Windowson a Terminál alkalmazás vagy a PowerShell, macOS-en a Terminál. Ezzel telepíted az RPG Engine-t, ezzel hozod létre az egyes kampányokat, és ezzel indítod el a Claude Code-ot vagy a Codexet.
- Egy **MI-gazda**, az alkalmazás, amelyben a mesélő fut: a **Claude Code** vagy a **Codex**, a hozzá tartozó előfizetéssel és bejelentkezéssel. Lásd [2.4](#24-connect-your-ai).
- A gazdád **legnagyobb modellje**. A kis modellt könnyű rászedni: a teszteinkben titkokat árult el egy játékosnak, aki azt állította, hogy ő az igazi mesélő.
- Egy webböngésző a dashboardhoz.

A bejelentkezésed a gazdához ennél többre is jó: az RPG Engine a te gépeden használja, hogy képeket rajzoljon a helyszínekről, a küldetésekről, a megismert szereplőkről és a karakteredről, és hogy lefordítsa a dashboardot olyan nyelvekre, amelyek nincsenek benne készen. Lásd [Képek](#311-pictures) és [Nyelvek](#72-languages).

**Terminál megnyitása egy mappában.** Sok lépés azt mondja: „a kampánymappában”. Windowson kattints jobb gombbal a mappára a Fájlkezelőben, és válaszd a **Megnyitás a Terminálban** menüpontot. macOS-en kattints jobb gombbal a mappára a Finderben, és válaszd a **Szolgáltatások > Új terminál a mappánál** menüpontot. Vagy egy már megnyitott terminálban írd be a `cd` parancsot és a mappa útvonalát, például: `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Telepítés

Nyiss egy terminált, és írd be:

```text
npm install -g rpg-engine
```

Ettől megkapod az `rpg` parancsot. Így ellenőrizheted, hogy sikerült-e:

```text
rpg --version
```

Az `rpg` parancsot kampányonként egyszer használod, a létrehozáshoz. Utána már csak a mesélővel beszélgetsz: az MI-gazdád magától elindítja az RPG Engine-t, ugyanezzel az `rpg` paranccsal.

### 2.3 Kampány létrehozása

A kampány egy mappa. Nyiss egy terminált abban a mappában, ahol a játékaidat tartod, és írd be:

```text
rpg init "The Salt Isles"
```

Ez létrehozza a `The Salt Isles` mappát egy új kampánnyal, és megmondja, mit tegyél legközelebb:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

A *For the master* utáni sorok a mesélőnek szólnak, aki a csevegésben olvassa őket: neked nincs velük teendőd. Jegyezd meg, hol van a mappa: minden játékalkalommal ide térsz vissza. Mappanév nélkül az `rpg init` abból a mappából csinál kampányt, amelyben éppen vagy.

Az `init` mindent létrehoz, amire a kampánynak szüksége van: a beállításait, a világ mappáit, és azokat a kis fájlokat, amelyek megmondják az MI-gazdádnak, hogy használja az RPG Engine-t, és ne őrizzen saját emlékezetet a kampányon kívül.

Most nem kell semmit eldöntened. A mesélő megkérdezi a többit a csevegésben, vagy te választod ki a dashboardon. Ha néhány döntést már ismersz, itt megadhatod őket:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Ez létrehozza a `salt-isles` mappát, benne *The Salt Isles* kampánnyal: a mappa neve szóköz nélküli, a kampány neve pedig olyan, amilyet szeretnél.

| Kapcsoló | Mit állít be | Értékek |
|---|---|---|
| `--name` | A kampány neve | bármi; ha kihagyod, a mappa neve |
| `--language` | A játék nyelve | egy kód, például `en`, `it`, `fr` |
| `--system` | A játékrendszer | `5e`, jelenleg az egyetlen |
| `--difficulty` | Mennyire nehéz a világ | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Mit jelent, ha valaki elesik a harcban | `narrative`, `epic`, `dice` |

Az `rpg init --help` is felsorolja őket. Kampány nem lehet egy másik kampány mappájában.

Nem kérheted meg a mesélőt, hogy hozzon létre egy kampányt: az `init` előtt a mappában nincs semmi, ami megmondaná az MI-gazdádnak, hol van az RPG Engine.

### 2.4 Az MI összekötése

Az RPG Engine a **Claude Code**-dal és a **Codexszel** működik. Más, MCP-eszközöket használó MI-alkalmazások is működhetnek, de nem garantáljuk őket.

**A gazda telepítése.** A Claude Code és a Codex a terminálban fut: nem a telefonos Claude vagy ChatGPT alkalmazás. Mindegyikhez saját előfizetés és bejelentkezés kell: a Claude Code-hoz fizetős Claude-csomag, a Codexhez ChatGPT-fiók. A telepítéshez és a bejelentkezéshez kövesd a saját oldalaikat: [Claude Code](https://code.claude.com/docs/en/setup) és [Codex](https://learn.chatgpt.com/docs/codex/cli). Ezt egyszer kell megtenned, az összes kampányodhoz.

**Claude Code.** Nyiss egy terminált a kampánymappában, és írd be: `claude`. Először azt kérdezi, megbízol-e a mappában, és jelzi, hogy a mappa engedélyezi a játék eszközeit (`mcp__rpg`): válaszd a **Yes, I trust this folder** lehetőséget. Vigyázz: az alapból kijelölt válasz a *No, exit*, ezért ha rögtön Entert nyomsz, a Claude Code bezárul. Ennyi az egész: a kampány már megmondta a Claude Code-nak, hogy használja az RPG Engine-t és az eszközeit, és hogy kapcsolja ki a saját emlékezetét.

**Codex.** Nyiss egy terminált a kampánymappában, és írd be: `codex`. Amikor megkérdezi, megbízol-e a mappában, mondj igent: a kampány saját beállításai megmondják a Codexnek, hol van az RPG Engine, engedélyezik az eszközeit, és kikapcsolják az emlékezetét, a Codex pedig ezeket csak olyan mappában olvassa be, amelyben megbízol. Az asztali alkalmazásban ellenőrizd, hogy az emlékek ki vannak kapcsolva a játék csevegéseinél.

**Miért számít az emlékezet.** A kampány a fájljaiban él. Ha a gazda magától is megjegyez dolgokat, egy mentéshez való visszatérés nem lenne valódi visszatérés: a mesélő továbbra is emlékezne arra, ami visszacsinálódott.

### 2.5 Az első csevegés

Írj bármit, például:

> Szia! Kezdjük el.

A mesélő elolvassa, hol tart a játék, és válaszol. Minden csevegés első válaszában megadja a **dashboard linkjét** (valami ilyesmi: `http://127.0.0.1:4750`). Nyisd meg a böngésződben, és tartsd a csevegés mellett az egész játék alatt. Minden kampány ugyanazt a linket tartja egyik csevegéstől a másikig, hacsak egy másik program el nem vette: ilyenkor a mesélő megadja az újat.

A mesélő üzenetei között a gazdád rövid sorokban mutatja a mesélő által használt eszközöket. Ne nyisd meg a részleteiket (Claude Code-ban ctrl+o): megmutathatják, mit ír a mesélő, titkokat is.

Az új kampány három szakaszon megy át, mint egy emberi mesélővel játszott játék. A dashboard felül mutatja őket: *1 Beállítások · 2 Nulladik alkalom · 3 Játék*.

1. **Beállítások**: kiválasztod, hogyan szeretnél játszani. A történeten kívül.
2. **Nulladik alkalom**: elkészíted a karakteredet, játékban.
3. **Játék**: a történet.

### 2.6 Beállítások: hogyan játszol

A mesélő csak azt kérdezi, ami még hiányzik, egyszerre néhány kérdést. Ha azt írod, „döntsd el te”, a mesélő választ, és elmondja, mit választott. Ha a dashboard nyitva van, az első lépése, a **Beállítások**, ugyanezeket a kérdéseket kártyákon mutatja: egyszerre egy kérdést, minden értéket a jelentésével, a szokásosat **Ajánlott** jelzéssel. Itt válassz, és a mesélő nem kérdezi meg újra a csevegésben; a **Kihagyás** későbbre hagyja a kérdést. A csevegés azt intézi el, amit csak szavakkal lehet: egy új világ alaphelyzetét, a nyelvet, és a képeket, amelyekről a mesélő csak akkor kérdez, ha a géped képes elkészíteni őket. Ezért kérdez az oldal kevesebbet, mint ahány sor az alábbi táblázatban van.

A táblázatot nem kell megtanulnod: nézz utána, ha kell. Ezek bármelyikét később megváltoztathatod, a csevegésben vagy a dashboard **Beállítások** részében. A változás a mesélő következő válaszától számít.

| Beállítás | Mit dönt el | Értékek | Ajánlott |
|---|---|---|---|
| **Mentor** (kérdése: „Mennyire ismered ezt a játékot?”) | Mennyit tanít a mesélő a szabályokból, a történeten kívül | **ki** (csak a történet; zárójelben kérdezel, amikor akarsz), **tippek** (rövid tipp a fontos döntések előtt és ha egy szabály elsiklik), **oktatás** (minden szabályt elmagyaráz az első alkalommal, minden dobás teljes számítását, és harc után rövid értékelést ad) | a válaszod alapján: még sosem játszottam → oktatás, egy kicsit → tippek, ismerem → ki |
| **Nehézség** | Mennyire nehéz a világ: harcok, ellenfelek taktikája, nyomok, kincsek, a fenyegetések tempója | mese, könnyű, normál, nehéz, kegyetlen | |
| **Halálosság** | Mit jelent, ha valaki elesik a harcban | **elbeszélő** (a karaktered sosem hal meg), **epikus** (csak akkor hal meg, ha ez számít a történetnek), **kockák** (a kockák döntenek) | a nehézséget követi: mese → elbeszélő, könnyű → epikus, normál és fölötte → kockák |
| **Mentések** | Mikor mehetsz vissza | **végleges halál** (soha; csak újrakezdheted a kampányt), **ellenőrzőpont** (vissza az utolsó jelenet végére, csak ha a karaktered meghal), **szabad** (vissza bármelyik mentésre, és mentesz, amikor kéred) | ellenőrzőpont |
| **Szigor** | Mennyire követik szorosan a szabályok az ételt, a fényt, a fáradtságot, a cipelt súlyt, a varázskellékeket és az utazást | **gördülékeny** (a mesélő átsiklik rajtuk), **szabályok** (ahogy le van írva: a fáklyák kialszanak, az adagok elfogynak), **szimuláció** (a szabályokon túl: kopás, romlás, időjárás) | gördülékeny |
| **Kockák** | Ki dobja a karaktered kockáit | **digitális** (az RPG Engine dobja őket, az oldalon), **fizikai** (te dobsz, és megmondod a kapott számokat) | |
| **Mértékegységek** | Távolságok és súlyok a történetben | metrikus, angolszász | |
| **Társak** | Ki utazik veled | senki, a nulladik alkalmon veled közösen készített, a mesélő által készített, játék közben megismert | |
| **Képek** | Képek a helyszínekről, a küldetésekről és a megismert szereplőkről, és a karaktered portréja, ha kéred | nincs, kérésre, új helyszínek, küldetések és megismert szereplők | egyszer kérdezi, csak ha a géped képes elkészíteni őket |
| **Határok** | Ami soha nem jelenik meg a játékban | egy lista, vagy semmi | |
| **Fátylak** | Ami megtörténhet, de csak színfalak mögött | egy lista, vagy semmi | |
| **Nyelv** | A játék és a dashboard nyelve | bármelyik | abból, ahogy írsz, megerősítéssel |

A játékrendszer saját beállításokat is hozzáadhat. Az ötödik kiadás hozzáadja a **fejlődést**: hogyan lép szintet a karaktered, **tapasztalati pontokkal** vagy a történet **mérföldköveinél**.

**Mit jelent a nehézség játék közben.** Mese: gyenge, naiv ellenfelek, egyértelmű nyomok, bőven mindenből; a mesélő enyhítheti a saját dobásait. Könnyű: egyszerű ellenfelek, bőkezű készletek. Normál: értelmes ellenfelek, minden következtetéshez három nyom, szokásos árak és kincsek. Nehéz: okos ellenfelek, finom nyomok, szűkös készletek, gyorsan mozgó fenyegetések. Kegyetlen: leselkedő, visszavonuló ellenfelek, akik végeznek az elesettekkel, nagyon szűkös készletek, a legkeményebb pihenők. A harcok mindig a csapatod jelenlegi erejéhez igazodnak.

**Írott világ nélkül** a beállítás még két dolgot kérdez:

- **Alaphelyzet**: a műfaj, a hangulat és a világ néhány eleme, a saját szavaiddal. Például: *„Alacsony fantasy, sötét, de reményteli. Egy folyami város, egy kísértetjárta gázló, egy kultusz a dombokon.”*
- **Előkészítés**: **menet közben** (a mesélő a világ minden részét épp azelőtt építi fel, hogy szükséged lenne rá; ajánlott) vagy **mindent az elején**.

A mesélő ezután javasol egy nevet a kampánynak. Ha semmi sem hiányzik, és azt mondod, készen állsz, a játék átlép a nulladik alkalomra.

### 2.7 Nulladik alkalom: a karaktered

A nulladik alkalom már játék: a mesélővel együtt készíted el a karaktered, ahogy egy asztalnál tennéd.

- **Minden döntés a tiéd**, hacsak nem kéred meg a mesélőt, hogy ő döntsön. Jöhetsz kész ötlettel („egy félelf pap, aki elhagyta a templomát”), homályossal („valaki, aki gyógyít, de nem kedves”), vagy semmivel („lepj meg, aztán hadd változtassak rajta”).
- **Képességpontok.** A mesélő elmondja a módszert és a biztonsági hálót, mielőtt bármelyik kockát eldobnád. Az ötödik kiadásban: a szokásos sorozat, a pontvásárlás, vagy 4d6 a legkisebb eldobásával. A megegyezett módszer megmarad az asztal megállapodásai között.
- **A történeted** soha nem kötelező. Ha megadsz egyet, a mesélő a te szavaiddal írja le, egyszer felolvassa neked, és a szereplőit és helyszíneit beköti a világba. A dashboardon is megírhatod (lásd [Csapat](#party)).
- **Személyiség** (ötödik kiadás): egy jellemvonás, egy eszmény, egy kötelék és egy hiba, a hátteredhez tartozó táblákból vagy a magadéból.
- **Egy kép.** Ha a karaktered elkészült, a mesélő képet kér róla: egy fájlt a gépedről, vagy egy portrét, amelyet a géped készít a leírásod alapján (lásd [a karaktered képe](#37-your-characters-story-and-picture)).

A karakterlap számait az RPG Engine számolja ki a döntéseidből: neked sosem kell összeadnod semmit. Ha a karakterek elkészültek, és megerősíted, elkezdődik a történet.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered, a saját szavaiddal. A rövid is jó.

> Megkérdezem a fogadóst, ki járt még erre ma este.
>
> – Nem bajt keresünk – mondom, a kezem távol a kardomtól.
>
> Felmászom a tetőre, és várok.

**A történeten kívül** szögletes zárójelben írj:

> [Hogyan működik a birkózás?]
>
> [Használhatom még a reakciómat ebben a fordulóban?]
>
> [Mára abbahagyjuk.]

A mesélő is zárójelben válaszol, aztán visszatér a történethez.

**Te megmondod, mit próbálsz; a mesélő megmondja, mi történik.** Ami megsérti a világ logikáját vagy a már rögzített tényeket, az nem történik meg: a mesélő ezt a történeten belül közli, és felkínálja, ami lehetséges.

**A mesélő sosem dönt a karaktered helyett.** Nem fog szólásra, érzésre vagy választásra kényszeríteni. Ha kétséges, megkérdezi.

**A mesélő sosem beszél a motorról.** Ha megkérdezed, számon tartja-e a dolgokat, úgy válaszol, mint egy mesélő: „Mindent megjegyzek: legközelebb innen folytatjuk.”

**Megkérdezheted a mesélőt, hogyan használd a dashboardot.** Ismeri az oldalt: „Hol látom a varázslataimat?”, „Hogyan dobok kézzel?”

### 3.2 Dobások

**Mikor van dobás.** A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan, és számít. Egyébként igent mond, vagy „igen, de”-t. A dobásod előtt a mesélő elmondja, mi a tét és mely próbák jönnek szóba, aztán megáll. Te dobsz, vagy meggondolod magad:

> **Mesélő:** A perem keskeny és nedves. Ha megcsúszol, hosszú zuhanás vár a folyóba. Ügyesség (Akrobatika) próba, vagy visszamehetsz, és megkeresheted a lépcsőt.
>
> **Te:** Megpróbálom.

**Dobás a dashboardon.** Amikor a mesélő kér, egy sáv jelenik meg az oldal tetején, minden próbához egy gombbal, például *Akrobatika +4 · előnnyel*. Kattints rá: a kockák leesnek az oldalon, és a mesélő meghallja az eredményt. Ezeket is megteheted:

- kattints a karakterlapod megfelelő sorára, amely aranyszínben világít;
- dobd el a megfelelő kockákat a dobótálcáról;
- írd be a saját szavaidat a sávba, ha mást szeretnél csinálni.

**Dobás kézzel.** Ha inkább magad választod ki a kockákat, kapcsold be a **Kézzel** kapcsolót a sáv sarkában (vagy a **Beállítások** között). A próba gombja eltűnik, a sáv pedig úgy mondja meg, mit dobj, ahogy egy mesélő tenné: *Dobj magad Akrobatikára, a karakterlapon vagy a kockákkal.* Kattints a karakterlapod felvillanó sorára, vagy dobd el a megfelelő kockákat a dobótálcáról: az RPG Engine eldobja őket, hozzáadja a bónuszodat, és a mesélő meghallja az eredményt. Az a próba, amelyet sem a karakterlapod, sem a dobótálca nem tud elvégezni, például az a sebzés, amely az 1-eseket újradobja, megtartja a gombját. A Kézzel ebben a böngészőben bekapcsolva marad, amíg ki nem kapcsolod.

**Fizikai kockák az egész játékhoz.** Ha a **Kockák** beállítás fizikai, a mesélő szavakkal kéri a dobásaidat, te pedig leírod a dobott számokat:

> [14-est dobtam.]

Az RPG Engine hozzáadja a módosítóidat, és visszautasít olyan számot, amelyet a kockáid nem mutathatnak.

**Szabad dobások.** Kattints bármelyik számra a karakterlapodon, vagy nyisd meg a dobótálcát, hogy csak úgy, kedvedre dobj. A szabad dobások sosem számítanak, soha nem kerülnek naplóba, és a mesélő sosem látja őket. Egy szabad 20-ból később sem lesz valódi.

**A mesélő dobásai.** A mesélő az ellenfelekért és másokért is az RPG Engine-nel dob. A legtöbb dobás látszik a dobásaid oszlopában. Ha az eredményt nem láthatod, a mesélő titokban dob. Bármikor megkérdezheted:

> [Valódi dobás volt?]

A látható dobásnál a mesélő megadja a számokat és az indokot. A titkosnál egy ujjlenyomatot, amely bizonyítja, hogy a dobás azelőtt megtörtént, hogy kérdeztél.

**A csevegésben a dobások** zárójelben jelennek meg, rögtön azután a pillanat után, amelyet eldöntenek: *[Meggyőzés 14 + 3 = 17]*. Aztán a történet elmondja a kimenetelt.

### 3.3 Jelenetek és harcok

A mesélő **jelenetekben** vezeti a történetet: egy harc, egy beszélgetés, felfedezés, utazás, pihenő, kihívás (üldözés, verseny, találós kérdés). Nem kell kezelned őket: így tartja számon az RPG Engine a történet fejezeteit. Minden jelenet végén a játék magától ment, és a jelenet bekerül a naplód történetébe.

**Harcban** a mesélő sorban elmondja az összes kört, amely nem a tiéd, minden dobással, és **megáll ott, ahol dönthetsz**: a köröd, egy reakció, egy választás. A köröd alatt mondd el, mit teszel:

> Szent lángot szórok az ajtónál állóra.

A dashboard **Harc** része mutatja a körök sorrendjét, kinek a köre van, a csapatod életpontjait, és hogy az ellenfelek mennyire tűnnek sebesültnek (sértetlen, sebesült, véres, elesett: szavakkal, soha nem számokkal). Ha a karaktered elesik, a halálmentések nagyban megjelennek az oldalon.

**Ha a harc már eldőlt**, a mesélő felajánlhatja, hogy a hátralévőt egyetlen üzenetben elmondja.

### 3.4 Idő, utazás és a világ, amely mozog

**Idő.** Minden cselekvés időt vesz igénybe a történetben, és az RPG Engine vezeti a dátumot: 3. nap, kora reggel. A mesélő úgy mondja az időt, ahogy a világ méri: hajnal, a harmadik harang, alkonyat. Az alkalmak között nem telik az idő: ott folytatod, ahol abbahagytad.

**Pihenők.** Mondd, hogy pihensz, és a mesélő alkalmazza, amit a pihenő visszaad, például életpontokat és varázslathelyeket:

> Tábort verünk, és hosszú pihenőt tartunk.

**Utazás.** Mondd meg, hová szeretnél menni:

> Az északi úton megyünk Roccába.

Az RPG Engine kiszámolja az utat, a távolságot és a napokat a te tempódban, és odavisz. Az utazás megáll, ha valami előre tervezett történik útközben, minden nap utazásának végén, és az érkezéskor. Indulás előtt megkérdezheted, milyen messze van egy hely:

> [Milyen messze van Rocca, és mennyi idő gyalog?]

**A világ nélküled is mozog.** A gonosztevőknek vannak határidős terveik és óráik. Minden új napon a mesélő előremozdítja azokat a fenyegetéseket, amelyeket az idő előrébb vitt, te pedig látod a jeleiket: egy hír, egy nyom, egy változás a városban. Az órát magát sosem látod, csak azt, amit maga után hagy.

**A pénzt** a játék érméiben számoljuk. Fizetsz, eladsz, fizetnek neked: az RPG Engine visszaadja a visszajárót.

### 3.5 Térképek

**A világtérkép** (dashboard: **Világ**) csak azokat a helyszíneket mutatja, amelyeket a karaktered ismer, köztük az utakkal, a bejárt ösvénnyel, és köddel mindenen, ami más. Kattints egy helyszínre, hogy lásd, mit tudsz róla, és milyen messze van.

**Egy helyszín térképe** (dashboard: **Jelenet**, harcban pedig **Harc**) akkor jelenik meg, ha a mesélő rajzol egyet arról, ahol vagy: falak, ajtók, a talaj, és hogy ki hol áll, jelölőkként. Harcban, a köröd alatt, a nem elérhető mezők el vannak fátyolozva, így egy pillantással látod, hová mehetsz. Amikor a mesélő megkérdezi, hová lép a karaktered, az oldal megnyitja a térképet, és te megérinted a mezőt, vagy leírod, például *E4*.

### 3.6 Küldetések, napló és jegyzetek

**Küldetések.** Amikor a karaktered feladatot vállal, az küldetéssé válik a **Naplódban**: ki adta, hol, meddig, a céljai listában, és amit mér (egy határidő a hátralévő idővel, egy óra, egy számláló). Jelölj meg egyet a csillagával, hogy kövesd: kicsiben a Jelenet tetején marad, a következő céljával. A küldetés akkor ér véget, amikor a történet befejezi, soha nem magától.

**A történet.** A Napló Történet füle a kampányod idővonalként: minden jelenet egy fejezet a helyszínével, dátumával és rövid összefoglalójával, az utolsó elöl.

**A jegyzeteid.** A Napló Jegyzetek fülén a saját jegyzeteidet írod: elméleteket, neveket, terveket. Ezek a gépeden maradnak, és a mesélő nem olvassa őket, hacsak nem **Megosztasz** egyet. A megosztott jegyzet a mesélő következő válaszánál úgy ér célba, mint amit te gondolsz, sosem mint tény. Az elméleted nem lesz igaz attól, hogy leírtad. Az a jegyzet, amely valamilyen tartalom leállítását vagy elkerülését kéri, úgy számít, mintha az asztalnál mondtad volna.

### 3.7 A karaktered története és képe

A karaktered karakterlapján a **Leírás** kártyán van egy mező, ahová megírhatod a karaktered történetét. Küldd el, és a mesélő beleírja a karakterbe a saját szavaival, miután igent mondtál.

A karaktered képéhez add át a mesélőnek egy képfájlt a csevegésben, a gépeden lévő helyével együtt (PNG, JPEG, WebP vagy SVG, legfeljebb 5 MB):

> [Itt a karakterem portréja: C:\Users\me\Pictures\mira.png]

A mesélő bemásolja a kampányba, és megjelenik a karaktered jelölőjén a dashboardon. Ugyanígy bármikor megváltoztathatod.

Vagy készíttesd el a portrét, ha a géped tud képeket készíteni (lásd [Képek](#311-pictures)): írd le a karaktered a mesélőnek, vagy hagyd, hogy a mesélő írja le.

> [Készíts egy portrét: ősz haj copfba fonva, egy heg az állán, fáradt szemek.]

A portré pontosan azt mutatja, ami a karaktered a játékban: a népét úgy, ahogy ez a világ ismeri, a hegyi törpét hegyi törpeként, azzal a külsővel, amelyet leírtál. Körülbelül egy perc alatt elkészül, a karaktered jelölőjén. A társaid is megkaphatják a sajátjukat ugyanígy.

### 3.8 Mentések és visszatérés

Az RPG Engine **minden jelenet végén** magától menti az egész kampányt. Hogy mit tehetsz ezekkel a mentésekkel, a **Mentések** beállítástól függ:

| Mentések | Mentés, amikor akarod | Visszatérés |
|---|---|---|
| **végleges halál** | nem | soha; csak újrakezdheted a kampányt |
| **ellenőrzőpont** | nem | az utolsó mentésre, csak ha a karaktered meghal |
| **szabad** | igen | bármelyik mentésre, amikor akarod |

Minden módban **újrakezdheted**: a játék elejétől ugyanazzal a karakterrel, vagy a nulladik alkalomtól egy újjal.

Mindezt megteheted a csevegésben („[Menjünk vissza a párbaj előttre.]”) vagy a dashboard **Mentések** részében.

**A visszatérés után nyiss új csevegést.** A csevegés, amelyben játszottál, emlékszik arra, ami visszacsinálódott. Nyiss egy új csevegést a mesélővel (`/clear` Claude Code-ban, `/new` Codexben), írd be: *folytatjuk*, aztán nyomd meg a **Megnyitottam az új csevegést** gombot a Mentésekben, vagy mondd el a mesélőnek az új csevegésben. Sosem folytasd a régi csevegést. Amíg meg nem erősíted, a mesélő nem megy tovább.

### 3.9 Alkalmak: megállás és visszatérés

**Te fejezed be az alkalmat**, amikor akarod:

> [Mára abbahagyjuk.]

Nincs „mentés és kilépés”: minden már a fájlokban van.

**A csevegés bezárásához** írd be: `/exit` Claude Code-ban, vagy `/quit` Codexben. A dashboard elcsendesedik a következő csevegésig.

**A visszatéréshez** nyiss egy terminált a kampánymappában (amelyet az `init` kiírt), indítsd el ott a gazdádat, és írd be: *folytatjuk*. A mesélő elolvassa, hol tart a játék, rövid összefoglalót ad, és valamivel kezd, ami éppen történik. Az új csevegés semmit sem veszít: a kampány a fájljaiban él, nem a csevegésben.

A mesélő nem tesz fel rutinkérdéseket a végén. Csak ha észrevett valamit, ami nem működött, kérdez röviden.

### 3.10 A mesélő hangulata

A dashboard tetején a mesélő avatárja áll, egy kis robot. Az arca a történet hangulatát követi: aggódik, ha nő a veszély, elragadtatott egy merész ötlettől, meglepett egy fordulattól. Egy pillanatra reagál egy természetes 20-ra vagy egy természetes 1-esre. Soha nem mutat olyat, amit még nem tudhatsz: nincs vigyor, mielőtt a csapda lecsapna. A csapatod jelölői is mutatják a hangulatukat. Ha a csevegés be van zárva, a robot alszik.

### 3.11 Képek

Az RPG Engine képet készíttethet minden helyszínről, amelyet elérsz, minden küldetésről, amelyet vállalsz, és minden karakterről vagy lénytípusról, akivel találkozol, úgy rajzolva, ahogy látod őket, a **Képek** beállítás szerint, valamint a karaktered portréját, ha kéred. Azt használja, ami már a gépeden van:

- **Codex**, a ChatGPT-bejelentkezéseddel: festett kép.
- Egyébként a **Claude Code**, a Claude-bejelentkezéseddel: rajz.

A kép a saját előfizetésedet használja, nem a miénket. A **Beállítások** rész megmondja, készíthetők-e képek a gépeden, és ha nem, megadja a beállítás lépéseit. Képek nélkül az oldal a helyszínek fajtáinak jelét mutatja helyettük. Bármelyik helyszínhez vagy karakterhez saját képet is adhatsz a mesélőnek.

### 3.12 Biztonság: határok, fátylak és stop

- **Határok**: ami soha nem jelenik meg a játékban.
- **Fátylak**: ami megtörténhet, de csak színfalak mögött.
- **Stop**: bármikor leállíthatsz egy tartalmat, magyarázkodás nélkül. Írd a történeten kívül:

> [stop]

A mesélő azonnal abbahagyja, és felveszi a határaid közé, minden következő alkalomra. A határaidat és a fátylaidat a **Beállítások** között láthatod és módosíthatod.

### 3.13 Meggondolod magad

Minden beállítás megváltoztatható a kampány alatt: a csevegésben („[Legyen nehezebb.]”) vagy a **Beállítások** között. A mesélő a következő válaszánál értesül a változásról. Az a döntés, amelyet a mesélő a szabálykönyv nélkül hozott, **precedenssé** válik, és megmarad, így ugyanarra a kérdésre legközelebb ugyanaz a válasz érkezik.

---

## 4. A dashboard, részenként <!-- icon: party -->

A dashboard egy oldal a saját számítógépeden. A mesélő minden csevegés elején megadja a linkjét. Élőben követi a játékot: amikor a mesélő változtat valamit, az oldal is változik.

Csak annak a számítógépnek a böngészője nyithatja meg, amelyiken játszol: telefon vagy tablet nem, még ugyanazon a Wi-Fi-n sem. Az oldal keskeny ablakban is elfér: ilyenkor a részek az alsó sávba kerülnek, az ikonok pedig egy menübe.

Az oldal addig él, amíg a csevegés. Zárd be a csevegést, és a nyitva hagyott oldal *Nincs kapcsolat* feliratot mutat a karakterlappal úgy, ahogy volt, a mesélő robotja pedig elalszik; nyiss újra csevegést a kampányban, és ha a mesélő válaszolt, az oldal magától visszatér.

### Felül

- A **mesélő avatárja**, a hangulatával.
- A kampány neve, a játékrendszer, a **játékidő**, és hogy a játék **élő**-e (a csevegés csatlakozik-e).
- A részek: **Csapat**, **Jelenet**, **Harc** (csak harc közben), **Napló**, **Világ**; a sor végén, ikonokként: **Mentések**, **Súgó**, **Beállítások**, **Névjegy**.
- A világos és a sötét téma, a jobb felső sarokban.

Amikor a mesélő kérdez tőled valamit, a sávja az oldal tetején marad, bármelyik részben vagy is.

### Csapat

A karaktered és a társaid karakterlapja. A karakterlap minden része egy kártya, amelyet kinyithatsz és bezárhatsz.

- **Kattints egy számra**, hogy szórakozásból dobj vele. Állj egy szám fölé, hogy lásd, hogyan áll össze („+5: Bölcsesség +3, jártasság +2").
- Az **életpontok, helyek és használatok** sávokként és pontokként látszanak.
- Az **állapotok és hatások** látszanak, azzal együtt, hogy meddig tartanak.
- A **Leírás** a karaktered szövegét tartalmazza, és a mezőt, ahol elküldheted a mesélőnek a karaktered történetét.
- 0 életpontnál a **halálmentő dobások** nagyban megjelennek a név alatt.
- A karakterlap mellett (keskeny képernyőn alatta): **a dobások**, a legújabb elöl, a tieid és a mesélő azon dobásai, amelyeket láthatsz. A **Törlés** kiüríti a listát; a **Visszaállítás** visszahozza. A szabad dobások szaggatott vonallal, halványan látszanak.

Az a társ, akinek van szörnylapja, például egy farkas, teljes karakterlap helyett a szörnylapját mutatja.

### Jelenet

Ahol a csapatod van: a helyszín képe és neve, a körülötte lévő helyek, a helyszín térképe, ha van, kik vannak ott, és a nyitott jelenet azzal, ami most történik. A követett küldetés legfelül áll.

### Harc

Csak harc közben. Felül: a forduló, ki cselekszik, ki jön utána. Alatta: a körök sorrendje, minden harcos az állapotával, a csapatod számokban, az ellenfelek szavakban; ami a karakterednél kéznél van (páncélosztály, életpontok, támadások); a helyszín térképe, a cselekvő körbekarikázva. A te köröd alatt a Harc hivatkozás arany fénnyel pulzál, bárhol is vagy.

### Napló

Három lap:

- **Küldetések**: aktív, teljesített és meghiúsult, mindegyik kártyaként a céljaival, a határidejével időzítőként és az óráival. A csillag követi a küldetést.
- **Történet**: a kampány fejezetei, jelenetről jelenetre, legfelül a legutóbbi.
- **Jegyzetek**: a saját jegyzeteid, magánjellegűek, amíg meg nem osztasz egyet.

### Világ

A világtérkép úgy, ahogy a karaktered ismeri, köddel a többin. Húzással mozgathatod, görgővel vagy csippentéssel nagyíthatod. Kattints egy helyszínre a kártyájáért. Mellette a helyszínek listája áll, a legközelebbi elöl. Ha egynél több térkép van (egy város, egy kontinens, egy másik sík), fülek váltanak közöttük.

### A dobótálca

A kocka gomb megnyitja a tálcát: válassz kockákat és egy módosítót, és dobj. Ha egyfajta kockából kettő vagy több van, kiválaszthatod, melyek számítanak: **Mind**, **Magas** (csak a legnagyobb) vagy **Alacsony** (csak a legkisebb). A kiválasztott kockák megmaradnak, amíg meg nem nyomod a **Törlés** gombot, így ugyanaz a sebzésdobás minden fordulóban egy kattintás. Amíg a mesélő dobást kér, a tálca megmondja, mely kockák felelnek rá.

### Mentések

A mentéseid, a legújabb elöl, mindegyik a helyszínével, a játékbeli dátummal és a készítés idejével. **Mentés most** (szabad mentéseknél), **Visszatérés ide** és **Újrakezdés**, pirossal, két lépésben. Lásd: [Mentések és visszatérés](#38-saves-and-going-back).

### Beállítások

A beállításaid csoportokban: a játék, a játék megtanulása (a mentor és a már elmagyarázott szabályok), kockák és mértékek, korlátok (határok és fátylak), képek, nyelv. Kattints egy értékre a kiválasztásához; alatta áll, mit jelent. Aztán az oldal saját beállításai, amelyek csak ebben a böngészőben maradnak meg: a téma, a kockák hangja, a **kockakészlet** (gyanta, fém, fa, kő), lekerekített vagy éles szélek, a kézzel dobás.

A mesélő saját beállításai, például a házi szabályok és a precedensek, nincsenek itt: a csevegésben maradnak.

### Súgó és Névjegy

**Súgó**: ez az útmutató. **Névjegy**: mi az RPG Engine, a hivatkozásai, a licencei és a játékrendszer köszönetnyilvánításai.

### Játék előtt: Beállítások és nulladik alkalom

Amíg egy új kampány az első lépésében, a **Beállítások**nál tart, az egész oldal a kérdéseit teszi fel: egyszerre egyet, mindegyiket az értékei jelentésével és az ajánlott értékkel. A **Te döntesz** a mesélőre bíz egy kérdést, kivéve a határokat és a fátylakat, amelyek mindig a tieid; a **Kihagyás** későbbre hagyja. A végén: **Kész vagyok**.

### Üzenetek az oldaltól

Néha az oldal egy értesítést mutat magán: gond a kampány fájljaiban (a mesélő megjavítja), a játék távol van (a csevegés be van zárva), az oldal éppen fordítás alatt áll.

---

## 5. Játékrendszerek és házi szabályok <!-- icon: dice -->

### 5.1 Mi az a játékrendszer?

A játékrendszer egy játék adatainak összessége: a karakterlap, a számok, a lények, a tárgyak, a varázslatok és a szabályszöveg. Minden kampány egy rendszert használ.

Az RPG Engine kiszámolja a karakterlapot, valamint azt, hogy mi fogy el és mi tér vissza, például az életerőpontokat és a varázshelyeket, ahogy egy digitális karakterlap is teszi. Hogy egy képesség vagy egy varázslat hogyan működik, azt a mesélő olvassa ki a szabályokból és ő dönti el, akárcsak az asztalnál.

### 5.2 Ötödik kiadás, mellékelve

Az RPG Engine az **5e** kiadást tartalmazza a System Reference Document 5.1-ből (a 2014-es szabályok, szabadon használhatók Creative Commons licenc alatt). Ezeket tartalmazza:

- az SRD fajait, kalandorosztályait, alosztályait, egy hátteret és egy különleges képességet (feat);
- a 319 varázslatot, a fegyvereket, páncélokat és felszereléseket, a mágikus tárgyakat és az SRD szörnyeit;
- a szabályfejezeteket, amelyeket a mesélő pontos szövegük alapján keres meg;
- a teljes, kiszámolt karakterlapot: képességmódosítókat, mentődobásokat, képzettségeket, páncélosztályt, támadásokat, varázslat-mentőnehézséget, varázshelyeket, életerőkockákat, szintenkénti jellemzőket, tapasztalatot és szintlépést;
- a pihenőket, amelyek visszaadják, amit kell; az állapotokat a szabályszövegükkel; a koncentrációra emlékeztető jelzéseket.

**Az SRD-n túli tartalom.** Az ötödik kiadást játszhatod olyan tartalommal is, amely nincs az SRD-ben, például egy kalandorosztállyal vagy egy szörnnyel egy saját könyvedből. A mesélő ismeri a játékot, el tudja olvasni a kézikönyveidet, és keresni is tud a weben. Amire szüksége van, azt a kampányod oldalaiként írja meg, és az RPG Engine ugyanúgy dolgozik velük. Azt, amit mi mellékelünk, a licenc korlátozza. Azt, amit a mesélőd tud, nem.

Az RPG Engine csak saját készítésű vagy nyílt licencű tartalmat mellékel: az ötödik kiadásnál az SRD 5.1-et CC BY 4.0 alatt. Minden más, ami megjelenik a játékodban, az MI-d vagy a te írásod, a kampány oldalaiként, a számítógépeden. Ez nem része az RPG Enginenek, és mi nem terjesztjük.

Az RPG Engine kompatibilis az ötödik kiadással.

### 5.3 Házi szabályok és saját kiegészítések

Nem kell fájlhoz nyúlnod. Kérd meg a mesélőt:

> [Házi szabály: ha természetes 1-est dobsz támadásnál, elejted a fegyvered.]
>
> [Vérvadász karaktert szeretnék játszani. Megvan a könyv, itt vannak az osztály képességei.]
>
> [Ebben a kampányban a rövid pihenő 10 percig tart.]

A mesélő a kampányodban rögzíti őket, az alábbi módok egyikén:

- **Asztali megegyezés**, szavakban, például a fenti elejtett fegyver vagy a rövid pihenő. A mesélő a kampány beállításai mellett tartja, és ezentúl eszerint játszik. Ha a mesélő a könyv nélkül hoz döntést, azt ugyanígy tárolja, **precedensként**.
- **Új oldal**, például egy kalandorosztály, egy faj vagy egy tárgy. Az új osztály úgy működik, mint a rendszer osztályai: a szinted, az életerőkockáid és a jellemzőid számítanak hozzá. Az új faj épülhet egy meglévőre ("mint az elf, plusz…"), egy névvel ellátott kard pedig a hosszúkardra.
- **Új számok a karakterlapra**: egy mező, egy táblázat, egy képlet, egy számláló, amelyet a pihenő visszaad. Például a Csatamester fölénykockái, amelyek rövid pihenő után visszatérnek. A házi szabály a rendszer egyik képletét le is cserélheti.

Ha már leírt házi szabályaid vannak, szövegfájlként a kampány `rules` mappájába is teheted őket (lásd [a kampánymappa](#8-for-the-curious-the-campaign-folder)). A mesélő ezeket előbb olvassa el, mint a könyv azonos nevű szabályát.

### 5.4 Saját játékrendszer hozzáadása vagy importálása

Ma az RPG Engine csak az ötödik kiadást játssza. Más játékrendszerek is jönnek, és jön egy mód arra is, hogy saját rendszert adj hozzá, vagy egy meglévő játékodat a kézikönyveiből rendszerré alakítsd. Lásd: [Később jön](#9-coming-later).

---

## 6. Bővítmények <!-- icon: plus -->

**A bővítmények még nem érhetők el.** Egy bővítmény a játékrendszeren felül ad valamit a kampányhoz: egy világot, egy kalandot, egy funkciót, például az időjárást vagy egy tarotpaklit, megosztható házi szabályokat. Te választod ki, hogy melyiket használja az egyes kampányok. Az ötödik kiadáshoz az első tervezettek az időjárás és a zárfeltörés.

---

## 7. Honnan jön egy kampány, és a nyelve <!-- icon: world -->

### 7.1 Három mód világot szerezni

**Menet közben készítve.** Az előkészítésnél megadsz egy alaphelyzetet, a mesélő pedig menet közben építi a világot: minden helyszínt, személyt és cselekményszálat közvetlenül azelőtt, hogy szükséged lenne rá, és onnantól megőrzi. Ez a leggyorsabb mód a játékra: telepítesz, létrehozol, és pár perc múlva már a karaktered készíted. Semmi kitalált nem vész el: ami egyszer elhangzott, az le van írva, és igaz marad.

**Az elején előkészítve.** Ugyanaz az alaphelyzet, de **előkészítés: mind az elején** beállítással a mesélő a játék kezdete előtt felépíti a világ helyszíneit, frakcióit, fenyegetéseit és terveiket. Az első alkalom később kezdődik, de több van készen a háttérben.

**Meglévő kampányból vagy kalandból.** Ma nincs importálás gomb. Add oda a mesélőnek a kalandodat (egy szöveget vagy egy PDF-et, amelyet a gazdád el tud olvasni), és kérd meg, hogy állítsa be:

> [Ez a kalandom PDF-ben. Állítsd be kampányunknak: olvasd el, és írd meg a helyszíneit, szereplőit és titkait. Ne áruld el nekem semmit, ami benne van.]

A mesélő elolvassa az MI-gazdád eszközeivel, és a kampány oldalaiként írja le, a titkokkal együtt, amelyeket majd játék közben fedezel fel. A Claude Code olvas PDF-et; a Codex-szel biztonságosabb a szöveg- vagy markdown-fájl. Ezt a beállítás alatt tedd meg, a nulladik alkalom előtt.

Amíg a mesélő dolgozik, ne nyisd meg annak részleteit, amit olvas vagy ír (Claude Code-ban ctrl+o): megmutatják a kaland szövegét, a titkokkal együtt. Maga a mesélő, mint mindig, megőrzi a titkokat.

Amint a kampánynak vannak saját oldalai, a beállítás nem kérdez többé alaphelyzetet és előkészítést. Egy megírt kampányban is, ha olyan helyre mész, amelyet a szöveg nem fed le, a mesélő létrehozza, ami kell, és rögzíti.

**Egy kampányt egyszer játszol végig.** Ha ugyanazt a kalandot újra akarod játszani, hozz létre új kampányt. Egy kampányon belül továbbra is visszatérhetsz egy mentéshez vagy újrakezdheted, amennyire a mentések beállítása engedi.

### 7.2 Nyelvek

**Kampányonként egy nyelv**: a mesélőé. A mesélő ezen ír, és a dashboard követi. A mesélő abból veszi, ahogy írsz, és megerősíti.

**A dashboard** angolul és olaszul (gondozott fordításban) és további 24 nyelven érkezik: francia, német, spanyol, portugál (brazil), holland, svéd, norvég, dán, finn, izlandi, orosz, ukrán, lengyel, cseh, román, magyar, görög, török, arab, héber, hindi, kínai, japán, koreai. Az arab és a héber jobbról balra olvasódik: az oldal tükröződik, a térképek és a kockák úgy maradnak, ahogy rajzolták őket.

**Bármely más nyelvet**, amelyet a Beállításokban választasz, a számítógépeden fordítja le a háttérben a Codex vagy a Claude Code, a saját bejelentkezéseddel, a megnyitott résszel kezdve. Ez nyelvenként egyszer történik, az összes kampányodra. Amíg el nem készül, az oldal angolul van. A Beállítások megmondja, hogy a fordítás folyamatban van, kész, vagy nem lehetséges a gépeden.

**A játék szavai.** Az ötödik kiadás a hivatalos olasz SRD-ből hozza a saját olasz kifejezéseit, így az olasz játékosok ezt olvassák: *Classe Armatura*, *tiro salvezza*, *vantaggio*. A többi nyelv a rendszer lefordított kifejezéseit kapja.

**A játékrendszer saját szövege** (a varázslatok, a szörnyek, a szabályfejezetek) angolul marad. A mesélő elolvassa, és a te nyelveden mondja el neked.

**Nyelvváltás a kampány közben** érintetlenül hagyja a már megírt oldalakat; a mesélő az újakat az új nyelven írja.

---

## 8. A kíváncsiaknak: a kampány mappája <!-- icon: list -->

Sosem kell megnyitnod. Ha mégis megteszed, tudd, hogy **a kampányod titkait tartalmazza**: ha elolvasod, lelövöd a játék poénját.

Egy kampány mappája ezeket tartalmazza:

- `campaign.yaml`: a beállításaid;
- `state.yaml`: hol tart most a játék: a szakasza, a dátum, a nyitott jelenet;
- `world/`: karakterenként, helyszínenként, frakciónként, küldetésenként, tárgyanként, eseményenként, témánként vagy lényenként egy oldal, markdown-fájlként;
- `rules/`: a házi szabályaid szöveges fájlokként, ha hozzáadsz ilyeneket (az `init` nem hozza létre);
- `images/`: a képek, ha már vannak;
- `log.jsonl`: minden változás, sorrendben;
- `.saves/`: a mentések, az elsőtől kezdve;
- `.player/`: a Naplóból a saját jegyzeteid, amelyeket a mesélő nem olvas;
- `sessions/`: az RPG Engine kezeli;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: a kis fájlok, amelyek megmondják az MI-gazdáknak, hol van az RPG Engine, és kikapcsolva tartják az emlékezetüket. Az RPG Engine naprakészen tartja őket; hagyd őket úgy, ahogy vannak.

Az oldalak sima markdown-fájlok, `[[Rocca]]`-hoz hasonló hivatkozásokkal, az Obsidian formátumában: a mesélő jegyzetfüzete ott megnyitható. **Ha kézzel módosítasz egy oldalt**, a mesélő a következő válaszánál értesül a változásról.

**A parancssor.** Minden, amit a mesélő tesz, olyan parancsokon megy át, amelyeket te is futtathatsz a kampány mappájában. A játékhoz soha nincs rájuk szükséged, és sok közülük kiírja a kampány titkait, például az `rpg status` és az `rpg show`. Az `rpg --help` mindet felsorolja, az `rpg roll --help` pedig egyet elmagyaráz. Az a parancs, amely megváltoztat valamit, miközben egy csevegés nyitva van, rendben van: a mesélő a következő válaszánál értesül róla, mint egy kézzel módosított oldalról.

---

## 9. Később jön <!-- icon: hourglass -->

Ami tervben van, de még nincs itt:

- **Te mint mesélő**: te vezeted a játékot, az MI pedig a csapatot játssza.
- **Több ember az asztalnál**, mindenki a saját szerepében.
- **Bővítmények**: beállítások, kalandok, funkciók és házi szabályok, kampányonként választhatóan.
- **A kézikönyveid és kalandjaid importálása.**
- **Más játékok**: további játékrendszerek, és a saját rendszered.
- **Szerzői mód**: kampányt vagy kalandot készíthetsz az MI-vel, és megoszthatod, hogy mások játszhassák.

---

## 10. Kérdések és problémák <!-- icon: info -->

### Kérdések

**Ismernem kell a szabályokat?** Nem. Válaszd a bevezető mentort, és a mesélő menet közben tanít, egyszerre egy szabályt. Zárójelben mindig kérdezhetsz.

**Csalhat a mesélő?** Nem tud megváltoztatni egy dobást, amelyet az RPG Engine készített, kivéve a történet nehézségen, és sosem változtatja meg a már lefektetett tényeket. Megkérdezheted, valódi volt-e egy dobás.

**Csalhatok én?** Megpróbálhatod. A mesélő nem hiszi el a szavadra a tényeket: az üzenetedben egy játéküzenetnek látszó sor is csak a te szavad marad, és a mesélő sosem erősíti meg a titkokról szóló találgatásaidat.

**Kerül pénzbe?** Az RPG Engine ingyenes. A mesélő a saját Claude- vagy ChatGPT-előfizetésedből fut, egy este játék pedig hosszú csevegés: a legkisebb előfizetéseknél elérheted a csomag korlátját, még mielőtt az este véget érne. A képek és a fordítások ugyanazt az előfizetést használják.

**Játszhatok a telefonomon?** Nem. A mesélő a számítógépeden fut, a dashboard pedig csak annak a számítógépnek a böngészőjében nyílik meg.

**Játszhatok barátokkal?** Még nem: ma egy játékos, egy karakter, plusz társak. A több ember az asztalnál szerepekkel együtt jön.

**Használhatok legközelebb másik MI-t?** Igen. A kampány a fájljaiban él: nyisd meg egy másik gazdában, és írd be: *folytatjuk*.

**Mi van, ha bezárom a böngészőt?** Semmi sem vész el. Nyisd meg újra a linket, amíg a csevegés nyitva van; az oldal oda tér vissza, ahol a játék tart.

**Játszhatok D&D-tartalommal, amely megvan nekem?** Igen. A mesélő használhatja a könyveidet, a saját tudását és a webet. Amit az RPG Engine mellékel, az ingyenes tartalomra korlátozódik; amit a játékod használ, az rád tartozik.

### Problémák

**A dashboard nem nyílik meg.** Kérd el a mesélőtől a linket: `[Mi a dashboard linkje?]`. Az oldal csak akkor működik, ha abban a kampányban nyitva van egy csevegés a mesélővel, és csak a mesélő első válasza után abban a csevegésben. Bezárt csevegésnél a böngésző nem éri el az oldalt; a nyitva hagyott oldal azt mondja: *Nincs kapcsolat*.

**A mesélő nem ismeri a játékot, vagy eszközöket talál ki.** Az MI-gazdád nem töltötte be az RPG Engine-t.

- Először ellenőrizd, hogy a gazdát **a kampány mappájában** indítottad-e el, és hogy megbízhatónak jelölted-e.
- **Claude Code**: írd be: `/mcp`. Ha az `rpg` ott van, de hibás, válaszd ki, aztán **Reconnect**. Ha hiányzik, zárd be a Claude Code-ot, írd be a kampány mappájában: `claude mcp reset-project-choices`, és indítsd el újra.
- **Codex**: írd be: `codex mcp list` egy terminálban, a kampány mappájában. Ha az `rpg` hiányzik, a Codex nem bízik a mappában: indítsd el újra ott, és mondj igent, amikor kérdezi.
- Mindkettőnél: ha az `rpg --version` egy terminálban azt mondja, hogy a parancs nem található, telepítsd újra az RPG Engine-t ([2.2](#22-install)), és nyiss új terminált.

**Frissítés után semmi sem változott.** A futó mesélő megtartja azt a verziót, amellyel elindult. Nyiss új csevegést, vagy Claude Code-ban csatlakoztasd újra a szervert (`/mcp`, aztán `rpg`, aztán **Reconnect**).

**A mesélő emlékszik valamire, amit visszacsináltam.** Visszatértél egy mentéshez, de ugyanabban a csevegésben folytattad a játékot. Nyiss új csevegést, és nyomd meg a **Megnyitottam az új csevegést** gombot a Mentések részben.

**A mesélő olyan beállítási kérdéseket tesz fel, amelyekre már válaszoltam az oldalon.** Mondd el neki: `[Ezeket már kiválasztottam a dashboardon.]`

**Nem jelennek meg képek.** Nyisd meg a Beállítások > Képek részt: megmondja, el tudja-e készíteni őket ez a számítógép, és ha nem, a lépéseket, minden parancshoz egy gombbal a másolásra.

**Az oldal angol, de én másik nyelvet választottam.** A háttérben fordítás alatt áll; a Beállítások megmondja, hogy áll. Ha ezen a számítógépen nincs Codex vagy Claude Code, angol marad.

**A mesélő azt mondja, hogy a kampányban hibák vannak.** Magától kijavítja őket. Ha kézzel szerkesztettél fájlokat, megkérdezheti, mire gondoltál.

**Windows: az `npm` hibát ad a mappámban.** Ne tartsd a kampányt vagy az RPG Engine-t olyan útvonal alatt, amelyben `&` van.

**A telepítés hibát ad, vagy az `rpg` nem indul.** Ellenőrizd a Node.js verziódat a `node --version` paranccsal: legalább 22-esnek kell lennie. Ha régebbi, telepítsd az LTS verziót a [nodejs.org](https://nodejs.org) oldalról, aztán telepítsd újra az RPG Engine-t.

**A dashboard linkje megváltozott.** Egy másik program használta a kampány szokásos címét, vagy a Windows lefoglalta. Az RPG Engine másikat vett; a mesélő megadja az új linket. Semmi más nem változik.
