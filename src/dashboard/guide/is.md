<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 62159f4b 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: heildarleiðbeiningar

**RPG Engine** gerir þér kleift að spila borðspil með hlutverkaleik með **gervigreind sem sögumann**.

Þú talar við sögumanninn í **spjalli**: sögumaðurinn segir söguna, leikur alla aðra og sker úr um hvað gerist.

RPG Engine vinnur á bak við tjöldin: það **man heiminn**, **kastar teningunum** og **heldur utan um bókhaldið**.

Við hlið spjallsins hefurðu síðu opna í vafranum, **stjórnborðið**, með persónublaði persónunnar þinnar, teningunum, kortunum og dagbókinni.

Þessar leiðbeiningar eru fyrir spilara: þú þarft ekki að kunna að forrita.

## Fljótleg byrjun <!-- icon: send -->

1. Settu upp **Node.js** frá [nodejs.org](https://nodejs.org) (LTS-útgáfuna).
2. Settu upp **Claude Code** eða **Codex**, gervigreindarforritið sem sögumaðurinn keyrir í, og skráðu þig inn ([2.4](#24-connect-your-ai)).
3. Opnaðu skipanalínu og settu upp RPG Engine: `npm install -g rpg-engine`.
4. Búðu til herferð í skipanalínunni: `rpg init "The Salt Isles"`.
5. Opnaðu Claude Code eða Codex í nýju möppunni og skrifaðu *Hæ! Byrjum.* Sögumaðurinn svarar með tengli á mælaborðið þitt: opnaðu það við hlið spjallsins.

Í restinni af leiðbeiningunum er hvert skref útskýrt og síðan hvernig á að spila.

## 1. Hvað RPG Engine er <!-- icon: about -->

### Hver gerir hvað

| Hver | Hvað viðkomandi gerir |
|---|---|
| **Þú** | Þú spilar persónuna þína. Þú segir hvað hún gerir, segir og reynir. |
| **Sögumaðurinn** (gervigreindin) | Segir söguna, leikur allar aðrar persónur, ákveður hvað gerist og biður um köst. |
| **RPG Engine** | Man allt í skrám, kastar teningunum, telur lífspunkta, peninga, tíma og vegalengdir og geymir leyndarmál þar til þú uppgötvar þau. |

Gervigreind er góð í að segja sögur en léleg í að muna. Ef hún væri látin ein um það gleymdi hún hver skuldar þér pening, hvað þú átt margar örvar eða að brúin brann fyrir tveimur fundum. RPG Engine geymir allt þetta, svo heimurinn helst eins frá einu kvöldi til annars, jafnvel í nýju spjalli og jafnvel með annarri gervigreind.

### Hvernig það er

Þú skrifar í spjallið eins og þú værir að tala við borð:

> Ég opna hurðina hægt og lít inn.

Sögumaðurinn svarar með því sem þú sérð og stoppar þegar komið er að þér að velja. Þegar eitthvað er óvíst og skiptir máli segir sögumaðurinn hvað er í húfi og biður um kast. Hnapparnir fyrir kastið birtast á mælaborðinu. Þú smellir, teningarnir falla á síðuna og sögumaðurinn segir þér hvað gerist.

### Hvað gerir það sérstakt

- **Heimurinn er varanlegur.** Það sem hefur verið sagt helst satt. Dauður skúrkur helst dauður.
- **Teningarnir eru raunverulegir.** Sögumaðurinn getur ekki hnikað þeim til (nema á léttasta erfiðleikastigi, ef þú velur það).
- **Leyndarmál haldast leyndarmál.** Sögumaðurinn segir þér aldrei það sem persónan þín veit ekki, jafnvel þótt þú þráist við.
- **Heimurinn hreyfist án þín.** Ógnir færast nær á meðan þú hvílist eða ferðast og þú sérð merki þeirra.
- **Mörg kvöld, ein saga.** Herferð er mappa á tölvunni þinni. Þú getur hætt hvenær sem er og haldið áfram síðar.

### Leikurinn sem það spilar í dag

RPG Engine er gert fyrir hvaða hlutverkaleik við borð sem er. Í dag fylgir því eitt leikjakerfi: **fimmta útgáfa** (úr hinu frjálsa System Reference Document 5.1). Fleiri leikir koma; sjá [Leikjakerfi](#5-game-systems-and-house-rules) og [Væntanlegt](#9-coming-later).

---

## 2. Að byrja <!-- icon: path -->

### 2.1 Það sem þú þarft

- Tölvu með Windows, macOS eða Linux.
- **Node.js 22** eða nýrra. Sæktu það á [nodejs.org](https://nodejs.org): "LTS" útgáfan dugar. Með því fylgir `npm`, sem setur RPG Engine upp.
- **Skipanaglugga** (terminal), gluggann þar sem þú skrifar skipanir: á Windows er það Terminal-forritið eða PowerShell, á macOS Terminal. Þú notar hann til að setja RPG Engine upp, til að búa til hverja herferð og til að ræsa Claude Code eða Codex.
- **gervigreindarhýsil**, forritið sem sögumaðurinn keyrir í: **Claude Code** eða **Codex**, með áskrift og innskráningu. Sjá [2.4](#24-connect-your-ai).
- **Stærsta líkanið** sem hýsillinn þinn býður. Lítið líkan lætur plata sig: í prófunum okkar sagði það leyndarmál við spilara sem þóttist vera hinn raunverulegi sögumaður.
- Vafra fyrir stjórnborðið.

Innskráningin sem þú notar fyrir hýsilinn gerir meira: RPG Engine notar hana, á tölvunni þinni, til að teikna myndir af stöðum, verkefnum, þeim sem þú hittir og persónunni þinni, og til að þýða stjórnborðið á tungumál sem fylgja ekki með. Sjá [Myndir](#311-pictures) og [Tungumál](#72-languages).

**Skipanagluggi í möppu.** Mörg skref segja „í möppu herferðarinnar“. Á Windows hægrismellirðu á möppuna í File Explorer og velur **Open in Terminal**. Á macOS hægrismellirðu á möppuna í Finder og velur **Services > New Terminal at Folder**. Eða, í skipanaglugga sem er þegar opinn, skrifarðu `cd` og slóð möppunnar, til dæmis `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Uppsetning

Opnaðu skipanaglugga og skrifaðu:

```text
npm install -g rpg-engine
```

Þetta gefur þér skipunina `rpg`. Til að athuga hvort það tókst:

```text
rpg --version
```

Þú notar `rpg` einu sinni fyrir hverja herferð, til að búa hana til. Eftir það talarðu bara við sögumanninn: gervigreindarhýsillinn ræsir RPG Engine sjálfur, með sömu skipun `rpg`.

### 2.3 Búa til herferð

Herferð er mappa. Opnaðu skipanaglugga í möppunni þar sem þú geymir leikina þína og skrifaðu:

```text
rpg init "The Salt Isles"
```

Þetta býr til möppuna `The Salt Isles` með nýrri herferð og segir þér hvað á að gera næst:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Línurnar á eftir *For the master* eru ætlaðar sögumanninum, sem les þær í spjallinu: þú þarft ekkert að gera með þær. Mundu hvar mappan er: þú kemur aftur í hana í hvert sinn sem þú spilar. Án möppuheitis breytir `rpg init` möppunni sem þú ert í í herferðina.

`init` býr til allt sem herferðin þarf: stillingar hennar, möppur heimsins og litlu skrárnar sem segja gervigreindarhýslinum að nota RPG Engine og að geyma ekkert eigið minni utan herferðarinnar.

Þú þarft ekki að velja neitt núna. Sögumaðurinn spyr þig um restina í spjallinu, eða þú velur á stjórnborðinu. Ef þú veist nú þegar um sum val geturðu gefið þau hér:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Þetta býr til möppuna `salt-isles` með herferðinni *The Salt Isles*: möppuheiti án bila, og heiti herferðarinnar eins og þú vilt hafa það.

| Valkostur | Hvað hann stillir | Gildi |
|---|---|---|
| `--name` | Heiti herferðarinnar | hvað sem er; heiti möppunnar ef þú sleppir honum |
| `--language` | Tungumál leiksins | kóði, til dæmis `en`, `it`, `fr` |
| `--system` | Leikjakerfið | `5e`, það eina í dag |
| `--difficulty` | Hversu erfiður heimurinn er | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Hvað það þýðir að falla í bardaga | `narrative`, `epic`, `dice` |

`rpg init --help` sýnir þá líka. Herferð má ekki vera inni í möppu annarrar herferðar.

Þú getur ekki beðið sögumanninn um að búa til herferð: fyrir `init` er ekkert í möppunni sem segir gervigreindarhýslinum hvar RPG Engine er.

### 2.4 Tengja gervigreindina

RPG Engine virkar með **Claude Code** og **Codex**. Önnur gervigreindarforrit sem nota MCP-verkfæri gætu virkað líka, en við ábyrgjumst það ekki.

**Hýsillinn settur upp.** Claude Code og Codex keyra í skipanaglugganum: þau eru ekki Claude- eða ChatGPT-appið í símanum þínum. Hvort um sig þarf sína eigin áskrift og innskráningu: Claude Code þarf greidda Claude-áskrift, Codex ChatGPT-innskráningu. Fylgdu þeirra eigin síðum til að setja þau upp og skrá þig inn: [Claude Code](https://code.claude.com/docs/en/setup) og [Codex](https://learn.chatgpt.com/docs/codex/cli). Þú gerir þetta einu sinni, fyrir allar herferðirnar þínar.

**Claude Code.** Opnaðu skipanaglugga í möppu herferðarinnar og skrifaðu `claude`. Í fyrsta skipti spyr það hvort þú treystir möppunni og segir að mappan leyfi verkfæri leiksins (`mcp__rpg`): veldu **Yes, I trust this folder**. Varaðu þig: svarið sem er þegar valið er *No, exit*, svo ef þú ýtir strax á Enter lokast Claude Code. Þar með er því lokið: herferðin hefur þegar sagt Claude Code að nota RPG Engine og verkfæri þess, og að hafa minnið slökkt.

**Codex.** Opnaðu skipanaglugga í möppu herferðarinnar og skrifaðu `codex`. Þegar það spyr hvort þú treystir möppunni skaltu segja já: stillingar herferðarinnar sjálfrar segja Codex hvar RPG Engine er, leyfa verkfæri þess og hafa minnið slökkt, og Codex les þær aðeins í möppu sem þú treystir. Í skjáborðsforritinu skaltu athuga að minni (memories) sé slökkt fyrir spjöll leiksins.

**Hvers vegna minnið skiptir máli.** Herferðin lifir í skrám sínum. Ef hýsillinn man líka hluti upp á eigin spýtur væri það ekki raunveruleg afturför að fara aftur í vistun: sögumaðurinn myndi samt muna það sem var afturkallað.

### 2.5 Fyrsta spjallið

Skrifaðu hvað sem er, til dæmis:

> Hæ! Byrjum.

Sögumaðurinn les hvar leikurinn stendur og svarar. Í fyrsta svari hvers spjalls gefur hann þér **hlekkinn á stjórnborðið þitt** (eitthvað eins og `http://127.0.0.1:4750`). Opnaðu hann í vafranum og hafðu hann við hlið spjallsins allan leikinn. Hver herferð heldur sama hlekk frá einu spjalli til þess næsta, nema annað forrit hafi tekið hann: þá gefur sögumaðurinn þér nýjan.

Milli skilaboða sögumannsins sýnir hýsillinn þinn verkfærin sem sögumaðurinn notar, í stuttum línum. Ekki opna upplýsingar um þau (í Claude Code, ctrl+o): þær geta sýnt það sem sögumaðurinn skrifar, leyndarmál meðtalin.

Ný herferð fer í gegnum þrjú stig, eins og leikur með mennskum sögumanni. Stjórnborðið sýnir þau efst sem *1 Stillingar · 2 Núllti fundur · 3 Spilun*:

1. **Stillingar**: þú velur hvernig þú vilt spila. Utan sögunnar.
2. **Núllti fundur**: þú býrð til persónuna þína, í spilun.
3. **Spilun**: sagan.

### 2.6 Stillingar: hvernig þú vilt spila

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu. Ef þú skrifar „þú ákveður“ velur sögumaðurinn og segir þér hvað hann valdi. Með stjórnborðið opið sýnir fyrsta skref þess, **Stillingar**, sömu spurningar sem spjöld: eina spurningu í einu, hvert gildi með merkingu sinni, og það venjulega er merkt **Mælt með**. Veldu þar og sögumaðurinn spyr ekki aftur í spjallinu; **Sleppa** skilur spurningu eftir til síðari tíma. Spjallið ræður við það sem aðeins orð geta afgreitt: forsendu nýs heims, tungumálið og myndirnar, sem sögumaðurinn spyr aðeins um ef tölvan þín getur gert þær. Þess vegna spyr síðan færri spurninga en taflan hér að neðan telur upp.

Þú þarft ekki að læra töfluna: hún er hér til uppflettingar. Þú getur breytt öllu þessu síðar, í spjallinu eða í **Stillingum** stjórnborðsins. Breyting gildir frá næsta svari sögumannsins.

| Stilling | Hvað hún ákveður | Gildi | Mælt með |
|---|---|---|---|
| **Leiðbeinandi** (spurt sem „Hversu vel þekkir þú þennan leik?“) | Hversu mikið sögumaðurinn kennir þér reglurnar, utan sögunnar | **off** (sagan ein; spyrðu innan sviga þegar þú vilt), **hints** (stutt ábending áður en mikilvæg val standa fyrir dyrum og þegar regla fer framhjá), **tutorial** (hver regla útskýrð í fyrsta sinn, öll summa hvers kasts, stutt yfirferð eftir bardaga) | eftir svari þínu: aldrei spilað → tutorial, lítið → hints, ég kann hann → off |
| **Erfiðleikastig** | Hversu erfiður heimurinn er: bardagar, brögð óvina, vísbendingar, fjársjóðir, hversu hratt ógnir hreyfast | story, easy, normal, hard, brutal | |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | **narrative** (persónan þín deyr aldrei), **epic** (deyr aðeins þegar það skiptir söguna máli), **dice** (teningarnir ráða) | fylgir erfiðleikastiginu: story → narrative, easy → epic, normal og upp úr → dice |
| **Vistanir** | Hvenær þú mátt fara til baka | **permadeath** (aldrei; aðeins byrja herferðina upp á nýtt), **checkpoint** (aftur að síðustu lokum atriðis, aðeins ef persónan þín deyr), **free** (aftur í hvaða vistun sem er, og vista hvenær sem þú biður um það) | checkpoint |
| **Strangleiki** | Hversu nákvæmlega matur, ljós, þreyta, burðarþyngd, galdraefni og ferðalög fylgja reglunum | **smooth** (sögumaðurinn sleppir þeim létt), **rules** (eins og skrifað stendur: kyndlar brenna út, nesti klárast), **simulation** (umfram reglurnar: slit, skemmdir, veður) | smooth |
| **Teningar** | Hver kastar teningum persónunnar þinnar | **digital** (RPG Engine kastar þeim, á síðunni), **physical** (þú kastar þínum eigin og segir upp tölurnar) | |
| **Mælieiningar** | Vegalengdir og þyngdir í sögunni | metric, imperial | |
| **Félagar** | Hver ferðast með þér | none, búnir til með þér á núllta fundi, búnir til af sögumanninum, hittir í spilun | |
| **Myndir** | Myndir af stöðum, verkefnum og þeim sem þú hittir, og andlitsmynd persónunnar þinnar þegar þú biður um hana | none, á beiðni, nýir staðir, verkefni og þeir sem þú hittir | spurt einu sinni, aðeins ef tölvan þín getur gert þær |
| **Línur** | Það sem birtist aldrei í leiknum | listi, eða ekkert | |
| **Slæður** | Það sem má gerast, en aðeins utan sviðs | listi, eða ekkert | |
| **Tungumál** | Tungumál leiksins og stjórnborðsins | hvaða sem er | tekið af því hvernig þú skrifar, og staðfest |

Leikjakerfið getur bætt við eigin stillingum. Fimmta útgáfa bætir við **framvindu** (advancement): hvernig persónan þín hækkar í stigum, með **reynslustigum** eða á **áföngum** sögunnar.

**Hvað erfiðleikastigið þýðir í spilun.** Story: veikir, einfaldir óvinir, augljósar vísbendingar, nóg af öllu; sögumaðurinn má mýkja eigin köst. Easy: einfaldir óvinir, rausnarleg föng. Normal: skynsamir óvinir, þrjár vísbendingar að hverri ályktun, venjulegt verð og fjársjóðir. Hard: snjallir óvinir, lúmskar vísbendingar, af skornum skammti, ógnir sem hreyfast hratt. Brutal: óvinir sem sitja fyrir, hörfa og ganga frá föllnum, mjög af skornum skammti, hörðustu hvíldir. Bardagar eru alltaf stilltir eftir hópnum þínum eins og hann er núna.

**Án skrifaðs heims** spyr uppsetningin um tvennt til viðbótar:

- **Forsenda**: tegund sögunnar, andrúmsloftið og nokkur atriði heimsins, með þínum orðum. Til dæmis: *„Lágfantasía, myrk en með von. Bær við á, reimt vað, sértrúarhópur í hæðunum.“*
- **Undirbúningur**: **on the fly** (sögumaðurinn byggir hvern hluta heimsins rétt áður en þú þarft á honum að halda; mælt með) eða **all at the start**.

Sögumaðurinn leggur síðan til nafn á herferðina. Þegar ekkert vantar og þú segist vera tilbúin(n) fer leikurinn yfir í núllta fund.

**Stíll sögumanns** er aldrei spurt um: breyttu honum hvenær sem er, í spjallinu eða í **Stillingum**, þar sem hann hefur sinn eigin hóp. Andrúmsloftið helst í forsendunni; stíllinn er hvernig sagt er frá.

- **Frásögn**: **plain** (stuttar setningar, eitt áþreifanlegt smáatriði í einu; sú venjulega), **literary** (meira rými á hápunktum), **pulp** (spennuþrungin, lifandi, stutt, hver skilaboð enda á ógn eða öngli) eða **wry** (sögumaður með hálft bros til heimsins, aldrei til persónunnar þinnar).
- **Sögur**, fyrir það sem sögumaðurinn finnur upp, aldrei skrifað ævintýri: **situations** (fylkingar, ógnir og staðir með leyndarmál, enginn aðalþráður; sú venjulega), **arcs** (miðlæg ógn sem þróast í áföngum), **episodes** (saga sem lýkur á hverjum fundi) eða **mystery** (hver saga er rannsókn, sannleikur hennar ákveðinn fyrst).
- **Skrifa eins og**: höfundur sem sögumaðurinn tekur frásagnarhátt frá, í stað frásagnarinnar: takt hans og smáatriðin sem hann velur, aldrei setningar hans, nöfn eða staði, og aldrei meira en persónan þín sér.
- **Með þínum orðum**: allt annað, í fáum orðum, til dæmis *„þriðja persóna, þátíð“*. Sögumaðurinn segir söguna í annarri persónu, nútíð, nema þú biðjir um annað.

### 2.7 Núllti fundur: persónan þín

Núllti fundur er spilun: þú býrð til persónuna þína með sögumanninum, eins og við borð.

- **Hvert val er þitt**, nema þú biðjir sögumanninn um að velja. Þú getur komið með fulla hugmynd („hálfálfur klerkur sem yfirgaf hofið sitt“), óljósa („einhver sem læknar, en er ekki góður í því“) eða ekkert („komdu mér á óvart, svo læt ég breyta hlutum“).
- **Hæfnigildi.** Sögumaðurinn segir þér aðferðina og öryggisnetið áður en nokkrum teningi er kastað. Í fimmtu útgáfu: staðlaða röðin, punktakaup eða 4d6 án þess lægsta. Aðferðin sem þið komist að samkomulagi um helst í samkomulagi borðsins.
- **Saga þín** er aldrei skylda. Ef þú gefur hana skrifar sögumaðurinn hana með þínum orðum, les hana einu sinni upp fyrir þig og tengir fólk hennar og staði við heiminn. Þú getur líka skrifað hana á stjórnborðinu (sjá [Hópur](#party)).
- **Persónuleiki** (fimmta útgáfa): eiginleiki, hugsjón, tengsl og galli, úr töflum bakgrunnsins eða þínum eigin.
- **Mynd.** Þegar persónan er tilbúin biður sögumaðurinn þig um mynd af henni: skrá á tölvunni þinni, eða andlitsmynd gerð á tölvunni þinni eftir lýsingu þinni (sjá [mynd persónunnar þinnar](#37-your-characters-story-and-picture)).

Tölur persónublaðsins eru reiknaðar af RPG Engine út frá vali þínu: þú gerir aldrei útreikningana. Þegar persónurnar eru tilbúnar og þú staðfestir hefst sagan.

---

## 3. Spilun <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum. Stutt er í lagi.

> Ég spyr gestgjafann hver annar hafi komið hingað í kvöld.
>
> „Við erum ekki komin til að valda vandræðum,“ segi ég og held hendinni frá sverðinu.
>
> Ég klifra upp á þakið og bíð.

**Utan sögunnar** skrifarðu innan hornklofa:

> [Hvernig virka glímutök?]
>
> [Get ég enn notað viðbrögðin mín í þessari umferð?]
>
> [Stoppum hér í kvöld.]

Sögumaðurinn svarar líka innan hornklofa og fer svo aftur í söguna.

**Þú segir hvað þú reynir; sögumaðurinn segir hvað gerist.** Það sem brýtur rökvísi heimsins eða staðreyndir sem þegar eru settar gerist ekki. Sögumaðurinn segir þér það, innan sögunnar, og býður það sem er mögulegt.

**Sögumaðurinn ákveður aldrei fyrir persónuna þína.** Hann lætur þig ekki tala, finna til eða velja. Ef vafi leikur á spyr hann.

**Sögumaðurinn talar aldrei um vélina.** Spyrðu hann hvort hann haldi utan um hlutina og hann svarar eins og sögumaður: „Ég man þetta allt: við tökum upp þráðinn héðan næst.“

**Þú getur spurt sögumanninn hvernig á að nota stjórnborðið.** Hann þekkir síðuna: „Hvar sé ég galdrana mína?“, „Hvernig kasta ég handvirkt?“

### 3.2 Köst

**Hvenær kast gerist.** Sögumaðurinn biður um kast aðeins þegar niðurstaðan er óviss og skiptir máli. Annars segir hann já, eða „já, en“. Áður en þú kastar segir sögumaðurinn hvað er í húfi og hvaða próf passa, og stoppar svo. Þú kastar, eða skiptir um skoðun:

> **Sögumaður:** Syllan er mjó og blaut. Ef þú rennur er það langt fall í ána. Fimipróf (Fimleikar), eða þú getur farið til baka og leitað að tröppunum.
>
> **Þú:** Ég reyni þetta.

**Köst á stjórnborðinu.** Þegar sögumaðurinn biður um kast birtist borði efst á síðunni með hnapp fyrir hvert próf, til dæmis *Fimleikar +4 · með forskoti*. Smelltu á hann: teningarnir falla á síðunni og sögumaðurinn heyrir niðurstöðuna. Þú getur líka:

- smellt á samsvarandi línu á persónublaðinu þínu, sem lýsist upp í gulli;
- kastað réttu teningunum úr teningabakkanum;
- skrifað þín eigin orð í borðann í staðinn, ef þú vilt gera eitthvað annað.

**Að kasta handvirkt.** Ef þú vilt frekar velja teningana sjálf/ur/t skaltu kveikja á **Handvirkt** í horni borðans (eða í **Stillingum**). Hnappur prófsins hverfur og borðinn segir hvað á að kasta eins og sögumaður myndi gera: *Kastaðu Fimleikum sjálf/ur/t, á persónublaðinu eða með teningunum.* Smelltu á línuna á persónublaðinu sem lýsist upp, eða kastaðu réttu teningunum úr teningabakkanum: RPG Engine kastar þeim, bætir við bónusnum þínum og sögumaðurinn heyrir niðurstöðuna. Próf sem hvorki persónublaðið né teningabakkinn getur gert, eins og skaði þar sem einum er kastað aftur, heldur hnappinum sínum. Handvirkt helst kveikt í þessum vafra þar til þú slekkur á því.

**Líkamlegir teningar allan leikinn.** Þegar **Teningar** er stillt á líkamlegt biður sögumaðurinn um köstin þín í orðum og þú skrifar töluna sem þú kastaðir:

> [Ég kastaði 14.]

RPG Engine bætir við breytunum þínum og hafnar tölu sem teningarnir þínir geta ekki sýnt.

**Frjáls köst.** Smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu teningabakkann, til að kasta bara til gamans. Frjáls köst telja aldrei, eru aldrei skráð og sögumaðurinn sér þau aldrei. Frjáls 20 breytist aldrei í raunverulega síðar.

**Köst sögumannsins.** Sögumaðurinn kastar fyrir óvini og aðra með RPG Engine líka. Flest köst birtast í kastdálkinum þínum. Þegar þú mátt ekki sjá niðurstöðu kastar sögumaðurinn í leyni. Þú getur alltaf spurt:

> [Var þetta kast raunverulegt?]

Fyrir sýnilegt kast gefur sögumaðurinn tölurnar og ástæðuna. Fyrir leynilegt kast gefur hann fingrafar sem sannar að kastið var gert áður en þú spurðir.

**Köst í spjallinu** birtast innan hornklofa, rétt á eftir augnablikinu sem þau ráða úrslitum um: *[Sannfæring 14 + 3 = 17]*. Svo segir sagan frá niðurstöðunni.

### 3.3 Atriði og bardagar

Sögumaðurinn stýrir sögunni í **atriðum**: bardagi, samtal, könnun, ferðalag, hvíld, áskorun (eltingaleikur, kappakstur, ráðgáta). Þú þarft ekki að stjórna þeim: þau eru leið RPG Engine til að halda utan um kafla sögunnar. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í sögu dagbókarinnar þinnar.

**Í bardaga** segir sögumaðurinn frá öllum röðum sem eru ekki þínar, hverri á eftir annarri, með hverju kasti, og **stoppar þar sem þú getur ákveðið**: röðin þín, viðbrögð, val. Þegar röðin er þín segirðu hvað þú gerir:

> Ég kasta Sacred Flame á þann sem stendur við dyrnar.

Hlutinn **Bardagi** á stjórnborðinu sýnir röð raðanna, hver á röðina, lífspunkta hópsins þíns og hversu særðir óvinirnir líta út (óskaddaður, særður, blóðugur, fallinn: í orðum, aldrei í tölum). Ef persónan þín fellur birtast björgunarköst dauðans stór á síðunni.

**Þegar bardaginn er þegar ráðinn** getur sögumaðurinn boðist til að segja frá restinni í einum skilaboðum.

### 3.4 Tími, ferðalög og heimur á hreyfingu

**Tími.** Hver aðgerð tekur tíma í sögunni og RPG Engine heldur utan um dagsetninguna: dagur 3, snemma morguns. Sögumaðurinn segir tímann eins og heimurinn mælir hann: dögun, þriðja bjallan, nátthvarf. Milli funda líður enginn tími: þú tekur upp þráðinn þar sem þú hættir.

**Hvíld.** Segðu að þú hvílist og sögumaðurinn beitir því sem hvíld gefur til baka, eins og lífspunktum og galdrarýmum:

> Við tjöldum og tökum langa hvíld.

**Ferðalög.** Segðu hvert þú vilt fara:

> Við förum veginn norður til Rocca.

RPG Engine reiknar út leiðina, vegalengdina og dagana á þínum hraða og flytur þig þangað. Ferð stöðvast þegar eitthvað fyrirfram ákveðið gerist á leiðinni, í lok hvers ferðadags og við komu. Þú getur spurt hversu langt staður er áður en þú leggur af stað:

> [Hversu langt er til Rocca og hversu langan tíma tæki það fótgangandi?]

**Heimurinn heldur áfram án þín.** Skúrkar hafa áætlanir með tímamörkum og klukkum. Á hverjum nýjum degi færir sögumaðurinn ógnirnar sem tíminn hefur ýtt áfram og þú sérð merki þeirra: orðróm, ummerki, breytingu í bænum. Þú sérð aldrei klukkuna sjálfa, aðeins það sem hún skilur eftir.

**Peningar** eru taldir í mynt leiksins. Borgaðu, seldu, fáðu greitt: RPG Engine sér um skiptin.

### 3.5 Kort

**Heimskortið** (stjórnborð: **Heimur**) sýnir aðeins staðina sem persónan þín þekkir, með vegunum á milli þeirra, slóðinni sem þú hefur gengið og þokunni yfir öllu öðru. Smelltu á stað til að sjá hvað þú veist um hann og hversu langt er þangað.

**Kort af stað** (stjórnborð: **Atriði**, og **Bardagi** í bardaga) birtist þegar sögumaðurinn teiknar slíkt fyrir þar sem þú ert: veggir, dyr, undirlagið og hver stendur hvar, sem leikmerki. Í bardaga, þegar röðin er þín, eru reitirnir sem þú nærð ekki til huldir, svo þú sérð strax hvert þú getur farið. Þegar sögumaðurinn spyr hvert persónan þín færir sig opnar síðan kortið og þú snertir reit, eða skrifar hann, til dæmis *E4*.

### 3.6 Verkefni, dagbók og minnisblöð

**Verkefni.** Þegar persónan þín tekur að sér verk verður það að verkefni í **Dagbókinni** þinni: hver gaf það, hvar, fyrir hvenær, markmiðin sem listi og hvað það mælir (frestur með tímanum sem er eftir, klukka, talning). Merktu eitt með stjörnunni til að fylgja því: það helst lítið efst í Atriði, með næsta markmiði sínu. Verkefninu lýkur þegar sagan lýkur því, aldrei af sjálfu sér.

**Sagan.** Flipinn Saga í Dagbókinni er herferðin þín sem tímalína: hvert atriði er kafli, með stað, dagsetningu og stuttu ágripi, það nýjasta fyrst.

**Minnisblöðin þín.** Í flipanum Minnisblöð í Dagbókinni skrifarðu þín eigin minnisblöð: kenningar, nöfn, áætlanir. Þau haldast á tölvunni þinni og sögumaðurinn les þau ekki, nema þú veljir **Deila** á eitt. Minnisblað sem er deilt berst sögumanninum í næsta svari hans sem það sem þú heldur, aldrei sem staðreynd. Kenningin þín verður ekki sönn af því að þú skrifaðir hana. Minnisblað sem biður um að stöðva eða forðast efni telst eins og þú hefðir sagt það við borðið.

### 3.7 Saga og mynd persónunnar þinnar

Á persónublaði persónunnar þinnar er í spjaldinu **Lýsing** reitur til að skrifa sögu persónunnar. Sendu hana og sögumaðurinn skrifar hana inn í persónuna með eigin orðum, eftir að þú segir já.

Fyrir mynd persónunnar gefurðu sögumanninum myndskrá í spjallinu, með slóðinni að henni á tölvunni þinni (PNG, JPEG, WebP eða SVG, allt að 5 MB):

> [Hér er andlitsmynd persónunnar minnar: C:\Users\me\Pictures\mira.png]

Sögumaðurinn afritar hana inn í herferðina og hún birtist á leikmerki persónunnar þinnar á stjórnborðinu. Þú getur breytt henni á sama hátt hvenær sem þú vilt.

Eða láttu búa til andlitsmyndina, þar sem tölvan þín býr til myndir (sjá [Myndir](#311-pictures)): lýstu persónunni þinni fyrir sögumanninum, eða láttu sögumanninn lýsa henni.

> [Búðu til andlitsmynd: grátt hár í fléttu, ör á hökunni, þreytt augu.]

Andlitsmyndin sýnir nákvæmlega hvað persónan þín er í leiknum, fólk hennar eins og þessi heimur hefur það, hæðadvergur sem hæðadvergur, með útlitinu sem þú lýstir. Hún kemur á um það bil mínútu, á leikmerki persónunnar þinnar. Félagar þínir geta fengið sína á sama hátt.

### 3.8 Vistanir og að fara til baka

RPG Engine vistar alla herferðina **í lok hvers atriðis**, sjálfkrafa. Hvað þú getur gert við þessar vistanir fer eftir stillingunni **vistanir**:

| Vistanir | Vista þegar þú vilt | Fara til baka |
|---|---|---|
| **varanlegur dauði** | nei | aldrei; þú getur aðeins byrjað herferðina upp á nýtt |
| **varðpunktur** | nei | á síðustu vistun, aðeins þegar persónan þín deyr |
| **frjálst** | já | í hvaða vistun sem er, hvenær sem þú vilt |

Í öllum stillingum geturðu **byrjað upp á nýtt**: frá upphafi spilunar með sömu persónu, eða frá núllta fundi með nýrri.

Þú getur gert allt þetta í spjallinu („[Förum aftur til þess fyrir einvígið.]“) eða í hlutanum **Vistanir** á stjórnborðinu.

**Eftir að þú ferð til baka skaltu opna nýtt spjall.** Spjallið sem þú varst að spila í man það sem var afturkallað. Opnaðu nýtt spjall með sögumanninum (`/clear` í Claude Code, `/new` í Codex), skrifaðu *haltu áfram*, ýttu svo á **Ég opnaði nýtt spjall** í Vistunum, eða segðu sögumanninum það í nýja spjallinu. Taktu aldrei upp gamla spjallið aftur. Þar til þú staðfestir heldur sögumaðurinn ekki áfram.

### 3.9 Fundir: að hætta og koma aftur

**Þú lýkur fundinum** hvenær sem þú vilt:

> [Stoppum hér í kvöld.]

Það er ekkert „vista og hætta“: allt er þegar í skránum.

**Til að loka** spjallinu skrifarðu `/exit` í Claude Code, eða `/quit` í Codex. Stjórnborðið þagnar þar til næsta spjall hefst.

**Til að koma aftur** opnarðu skipanaglugga í herferðarmöppunni (þeirri sem `init` skrifaði út), ræsir hýsilinn þar og skrifar *haltu áfram*. Sögumaðurinn les hvar leikurinn stendur, gefur þér stutt yfirlit og byrjar á einhverju sem er að gerast. Nýtt spjall tapar engu: herferðin lifir í skrám sínum, ekki í spjallinu.

Sögumaðurinn spyr ekki hefðbundinna spurninga í lokin. Aðeins ef hann tók eftir að eitthvað virkaði ekki spyr hann stuttlega.

### 3.10 Skap sögumannsins

Efst á stjórnborðinu er avatar sögumannsins, lítið vélmenni. Andlit þess fylgir tóni sögunnar: áhyggjufullt þegar hætta vex, í sjöunda himni yfir djörfum hugmyndum, hissa á óvæntum snúningi. Það bregst í smástund við náttúrulegri 20 eða náttúrulegri 1. Það sýnir aldrei það sem þú veist ekki enn: ekkert bros áður en gildran smellur. Leikmerki hópsins þíns sýna líka skap þeirra. Þegar spjallinu er lokað sefur vélmennið.

### 3.11 Myndir

RPG Engine getur látið búa til mynd af hverjum stað sem þú kemur á, hverju verkefni sem þú tekur að þér og hverri persónu eða tegund skepna sem þú hittir, teiknað eins og þú sérð þau, eins og stillingin **Myndir** segir til um, og andlitsmynd persónunnar þinnar þegar þú biður um hana. Það notar það sem er þegar á tölvunni þinni:

- **Codex**, með ChatGPT-innskráningunni þinni: máluð mynd.
- Annars **Claude Code**, með Claude-innskráningunni þinni: teikning.

Myndin notar þína eigin áskrift, ekki okkar. Hlutinn **Stillingar** segir þér hvort hægt er að búa til myndir á tölvunni þinni, og ef ekki, skrefin til að setja það upp. Án mynda sýnir síðan í staðinn merki hverrar tegundar staðar. Þú getur líka gefið sögumanninum þína eigin mynd af hvaða stað eða persónu sem er.

### 3.12 Öryggi: línur, slæður og stopp

- **Línur**: það sem birtist aldrei í leiknum.
- **Slæður**: það sem má gerast, en aðeins utan sviðs.
- **Stopp**: hvenær sem er geturðu stöðvað efni, án þess að útskýra. Skrifaðu það utan sögunnar:

> [stopp]

Sögumaðurinn hættir því strax og bætir því við línurnar þínar, fyrir alla komandi fundi. Þú getur séð og breytt línum þínum og slæðum í **Stillingum**.

### 3.13 Að skipta um skoðun

Öllum stillingum má breyta á meðan herferðin stendur: í spjallinu („[Gerum þetta erfiðara.]“) eða í **Stillingum**. Sögumaðurinn heyrir af breytingunni í næsta svari sínu. Úrskurður sem sögumaðurinn gaf án bókarinnar verður að **fordæmi** og er geymdur, svo sama spurning fær sama svar næst.

---

## 4. Mælaborðið, hluti fyrir hluta <!-- icon: party -->

Mælaborðið er síða á þinni eigin tölvu. Sögumaðurinn gefur þér tengilinn á hana í upphafi hvers spjalls. Hún fylgir leiknum í beinni: þegar sögumaðurinn breytir einhverju breytist síðan líka.

Aðeins vafrinn á tölvunni þar sem þú spilar getur opnað hana: ekki sími eða spjaldtölva, jafnvel á sama Wi-Fi. Síðan passar líka í þröngan glugga: þá færast hlutarnir í stiku neðst og táknin í valmynd.

Síðan lifir eins lengi og spjallið. Lokaðu spjallinu og síða sem er skilin eftir opin sýnir *Not connected* með persónublaðinu eins og það var, og vélmenni sögumannsins sofnar; opnaðu spjall í herferðinni aftur og þegar sögumaðurinn hefur svarað kemur síðan aftur af sjálfu sér.

### Efst

- **Andlitsmynd sögumannsins**, með skapi hans.
- Heiti herferðarinnar, leikjakerfið, **leiktíminn** og hvort leikurinn er **tengt** (spjallið tengt).
- Hlutarnir: **Hópur**, **Atriði**, **Bardagi** (aðeins í bardaga), **Dagbók**, **Heimur**; aftast í röðinni, sem tákn: **Vistanir**, **Hjálp**, **Stillingar**, **Um**.
- Ljósa og dökka þemað, efst í hægra horninu.

Þegar sögumaðurinn spyr þig einhvers helst borði hans efst á síðunni, sama í hvaða hluta þú ert.

### Hópur

Persónublað persónunnar þinnar og félaga þinna. Hver hluti persónublaðsins er spjald sem þú getur opnað og lokað.

- **Smelltu á tölu** til að kasta henni til gamans. Bentu á tölu til að sjá hvernig hún er mynduð („+5: Wisdom +3, proficiency +2“).
- **Lífspunktar, reitir og notkun** birtast sem stikur og punktar.
- **Ástönd og áhrif** birtast með því hve lengi þau vara.
- **Lýsing** geymir texta persónunnar þinnar og reitinn til að senda sögumanninum sögu hennar.
- Við 0 lífspunkta birtast **dauðavistunarköstin** stór undir nafninu.
- Við hlið persónublaðsins (fyrir neðan það á mjóum skjá): **köstin**, nýjust fyrst, þín og köst sögumannsins sem þú mátt sjá. **Hreinsa** tæmir listann; **Restore** færir hann aftur. Frjáls köst birtast brotalínuð og dimm.

Félagi með skepnuspjald, eins og úlfur, sýnir skepnuspjaldið sitt í stað fulls persónublaðs.

### Atriði

Þar sem hópurinn þinn er: mynd og nafn staðarins, staðirnir í kring, kort staðarins þegar það er til, hverjir eru þar og opna atriðið með því sem er að gerast núna. Verkefnið sem þú fylgist með er efst.

### Bardagi

Aðeins í bardaga. Efst: umferðin, hver á leik, hver kemur næst. Fyrir neðan: röð raðanna, hver bardagamaður með ástand sitt, hópurinn þinn í tölum og óvinirnir í orðum; það sem persónan þín hefur við höndina (herklæðaflokkur, lífspunktar, árásir); kort staðarins, með þann sem á leik hringaðan. Í þinni röð púlsar hlekkurinn á Bardaga í gulli, sama hvar þú ert.

### Dagbók

Þrír flipar:

- **Verkefni**: virk, kláruð og misheppnuð, hvert sem spjald með markmiðum sínum, fresti sem tímamæli og klukkum. Stjarnan fylgir verkefni.
- **Saga**: kaflar herferðarinnar, atriði fyrir atriði, það síðasta fyrst.
- **Minnisblöð**: þín eigin minnisblöð, einkamál þar til þú deilir einu.

### Heimur

Heimskortið eins og persónan þín þekkir það, með þokunni yfir restinni. Dragðu til að færa, notaðu músarhjól eða klípu til að auka aðdrátt. Smelltu á stað til að sjá spjald hans. Listi yfir staðina, þá næstu fyrst, er við hliðina. Með fleiri en einu korti (borg, heimsálfa, annar heimur) skipta flipar á milli þeirra.

### Teningabakkinn

Teningahnappurinn opnar bakkann: veldu teninga og breyti og kastaðu. Með tveimur eða fleiri teningum af sömu gerð velurðu hverjir telja: **Allir**, **Hæsti** (aðeins sá hæsti) eða **Lægsti** (aðeins sá lægsti). Teningarnir sem þú valdir haldast þar til þú ýtir á **Hreinsa**, svo sama skaðakast er einn smellur í hverri umferð. Á meðan sögumaðurinn biður um kast segir bakkinn þér hvaða teningar svara því.

### Vistanir

Vistanir þínar, nýjustu fyrst, hver með stað sínum, leikdagsetningu og hvenær hún var gerð. **Vista núna** (með frjálsum vistunum), **Fara aftur hingað** og **Byrja upp á nýtt**, í rauðu, í tveimur skrefum. Sjá [Vistanir og að fara til baka](#38-saves-and-going-back).

### Stillingar

Stillingar þínar, í hópum: leikurinn, að læra leikinn (leiðbeinandinn og reglurnar sem þegar hafa verið útskýrðar fyrir þér), teningar og mælieiningar, mörk (línur og slæður), myndir, tungumál. Smelltu á gildi til að velja það; undir því er merking þess. Síðan eigin óskir síðunnar, geymdar aðeins í þessum vafra: þemað, hljóð teninganna, **teningasettið** (plastefni, málmur, tré, steinn), ávalar eða skarpar brúnir, að kasta í höndunum.

Eigin stillingar sögumannsins, eins og húsreglur og fordæmi, eru ekki hér: þær haldast í spjallinu.

### Hjálp og Um

**Hjálp**: þessar leiðbeiningar. **Um**: hvað RPG Engine er, tenglar þess, leyfi þess og þakkir leikjakerfisins.

### Áður en spilun hefst: Stillingar og núllti fundur

Á meðan ný herferð er á fyrsta þrepi, **Stillingar**, spyr öll síðan spurninga sinna: einnar í einu, hver með merkingu gilda sinna og því sem mælt er með. **Þú ákveður** skilur spurningu eftir hjá sögumanninum, nema línur og slæður, sem eru alltaf þínar; **Sleppa** geymir hana til síðari tíma. Í lokin, **Byrjum**.

### Skilaboð frá síðunni

Stundum sýnir síðan tilkynningu yfir sjálfri sér: vandamál í skrám herferðarinnar (sögumaðurinn lagar það), leikurinn fjarri (spjallinu er lokað), síðan er í þýðingu.

---

## 5. Leikjakerfi og húsreglur <!-- icon: dice -->

### 5.1 Hvað leikjakerfi er

Leikjakerfi eru gögn eins leiks: persónublaðið, tölurnar, verurnar, hlutirnir, galdrarnir og reglutextinn. Hver herferð notar eitt kerfi.

RPG Engine reiknar út persónublaðið þitt og það sem eyðist og kemur aftur, eins og lífspunkta og galdrarými, líkt og stafrænt persónublað gerir. Sögumaður les í reglunum hvernig eiginleiki eða galdur virkar og ákveður það, eins og við borðið.

### 5.2 Fimmta útgáfa, innifalin

RPG Engine fylgir með **5e**, byggt á System Reference Document 5.1 (reglurnar frá 2014, frjálsar undir Creative Commons). Það inniheldur:

- kynþættina, starfsstéttirnar, undirstéttirnar, einn bakgrunn og eitt hæfileikaval úr SRD;
- galdrana 319, vopnin, brynjurnar og búnaðinn, töfrahlutina og skrímslin úr SRD;
- reglukaflana, sem sögumaður flettir upp eftir nákvæmum texta þeirra;
- allt persónublaðið, útreiknað: breyta eiginleika, vistanir, hæfni, brynvörn, árásir, galdraþolsstig, galdrarými, lífsteninga, eiginleika eftir stigum, reynslu og stigahækkun;
- hvíldir sem skila því sem þær eiga að skila; ástönd með reglutexta sínum; áminningar um einbeitingu.

**Efni umfram SRD.** Þú getur spilað fimmtu útgáfu með efni sem vantar í SRD, til dæmis starfsstétt eða skrímsli úr bók sem þú átt. Sögumaður þekkir leikinn, getur lesið handbækurnar þínar og leitað á vefnum. Hann skrifar það sem þarf sem síður í herferðinni þinni og RPG Engine vinnur með þær á sama hátt. Það sem við látum fylgja er takmarkað af leyfinu. Það sem sögumaður þinn kann er það ekki.

RPG Engine fylgir aðeins með frumsamið efni eða efni með opnu leyfi: fyrir fimmtu útgáfu er það SRD 5.1 undir CC BY 4.0. Allt annað sem birtist í leiknum þínum er skrifað af gervigreindinni þinni eða af þér, sem síður í herferðinni á tölvunni þinni. Það er ekki hluti af RPG Engine og við dreifum því ekki.

RPG Engine er samhæft við fimmtu útgáfu.

### 5.3 Húsreglur og þínar eigin viðbætur

Þú þarft ekki að snerta neina skrá. Biddu sögumanninn:

> [Húsregla: náttúrulegur 1 í árás þýðir að þú missir vopnið.]
>
> [Mig langar að spila Blood Hunter. Ég á bókina: hér eru eiginleikar starfsstéttarinnar.]
>
> [Í þessari herferð tekur stutt hvíld 10 mínútur.]

Sögumaður skráir þær í herferðina þína á einn af þessum leiðum:

- **Samkomulag borðsins**, í orðum, eins og vopnið sem er misst eða stutta hvíldin hér að ofan. Sögumaður geymir það með stillingum herferðarinnar og fer eftir því upp frá því. Úrskurður sem sögumaður tekur án bókarinnar er geymdur á sama hátt, sem **fordæmi**.
- **Ný síða**, til dæmis starfsstétt, kynþáttur eða hlutur. Ný starfsstétt virkar eins og starfsstétt kerfisins: stig þitt, lífsteningar og eiginleikar telja hana með. Nýr kynþáttur getur byggt á þeim sem fyrir er („eins og álfur, auk…“). Nafngreint sverð getur byggt á langsverðinu.
- **Nýjar tölur fyrir persónublaðið**: reitur, tafla, formúla, teljari sem hvíld endurheimtir. Til dæmis yfirburðateningar Battle Master sem koma aftur við stutta hvíld. Húsregla getur líka komið í stað einnar af formúlum kerfisins.

Ef þú ert nú þegar með húsreglur skrifaðar niður geturðu líka sett þær sem textaskrár í möppuna `rules` í herferðinni (sjá [herferðarmappan](#8-for-the-curious-the-campaign-folder)). Sögumaður les þær á undan reglu bókarinnar með sama heiti.

### 5.4 Að bæta við eða flytja inn þitt eigið leikjakerfi

Eins og er spilar RPG Engine aðeins fimmtu útgáfu. Fleiri leikjakerfi koma síðar, og einnig leið til að bæta við þínu eigin eða breyta leik sem þú átt í kerfi út frá handbókum hans. Sjá [Væntanlegt síðar](#9-coming-later).

---

## 6. Viðbætur <!-- icon: plus -->

**Viðbætur eru ekki til enn.** Viðbót mun bæta einhverju við herferð ofan á leikjakerfið hennar: heimi, ævintýri, eiginleika eins og veðri eða tarotspilum, húsreglum til að deila. Þú munt velja hverjar hver herferð notar. Þær fyrstu sem eru áætlaðar fyrir fimmtu útgáfu eru veður og lásabrot.

---

## 7. Hvaðan herferð kemur, og tungumál hennar <!-- icon: world -->

### 7.1 Þrjár leiðir til að eignast heim

**Búinn til jafnóðum.** Þú gefur forsendu í uppsetningunni og sögumaðurinn byggir heiminn eftir því sem líður: hvern stað, hverja persónu og hvern söguþráð rétt áður en þú þarft á honum að halda, og það er geymt upp frá því. Þetta er fljótlegasta leiðin til að spila: setja upp, búa til og eftir nokkrar mínútur ertu að búa til persónuna þína. Ekkert sem er fundið upp tapast: þegar það hefur verið sagt er það skrifað og helst satt.

**Undirbúinn í upphafi.** Sama forsenda, en með **Undirbúningur: all at the start** byggir sögumaðurinn staði heimsins, fylkingar, ógnir og áætlanir þeirra áður en spilun hefst. Fyrsti fundurinn hefst síðar, með meira tilbúið að tjaldabaki.

**Úr fyrirliggjandi herferð eða ævintýri.** Í dag er enginn innflutningshnappur. Gefðu sögumanninum ævintýrið þitt (texta eða PDF sem hýsillinn þinn getur lesið) og biddu hann að setja það upp:

> [Ég á þetta ævintýri sem PDF. Settu það upp sem herferðina okkar: lestu það og skrifaðu staði þess, persónur og leyndarmál. Segðu mér ekkert sem stendur í því.]

Sögumaðurinn les það með verkfærum gervigreindarhýslisins og skrifar það sem síður herferðarinnar, leyndarmál með talin, sem þú uppgötvar í leik. Claude Code les PDF-skrár; með Codex er texta- eða markdown-skrá öruggari kostur. Gerðu þetta í uppsetningunni, fyrir núllta fund.

Á meðan sögumaðurinn vinnur skaltu ekki opna nánari upplýsingar um það sem hann les eða skrifar (í Claude Code, ctrl+o): þær sýna texta ævintýrisins, leyndarmál og allt. Sögumaðurinn sjálfur geymir leyndarmálin, eins og alltaf.

Um leið og herferðin hefur eigin síður hættir uppsetningin að spyrja um forsendu og undirbúning. Jafnvel í skrifaðri herferð, þegar þú ferð á stað sem textinn nær ekki yfir, býr sögumaðurinn til það sem þarf og skráir það.

**Herferð er spiluð einu sinni.** Til að spila sama ævintýrið aftur skaltu búa til nýja herferð. Innan herferðar geturðu samt farið aftur í vistun eða byrjað upp á nýtt, eins og stillingin Vistanir leyfir.

### 7.2 Tungumál

**Eitt tungumál fyrir hverja herferð**: tungumál sögumannsins. Sögumaðurinn skrifar á því og mælaborðið fylgir. Sögumaðurinn tekur það af því hvernig þú skrifar og staðfestir það.

**Mælaborðið** fylgir á ensku og ítölsku (vandlega unnið) og á 24 tungumálum til viðbótar: frönsku, þýsku, spænsku, portúgölsku (brasilískri), hollensku, sænsku, norsku, dönsku, finnsku, íslensku, rússnesku, úkraínsku, pólsku, tékknesku, rúmensku, ungversku, grísku, tyrknesku, arabísku, hebresku, hindí, kínversku, japönsku, kóresku. Arabíska og hebreska eru lesnar frá hægri til vinstri: síðan speglast, en kortin og teningarnir haldast eins og þau eru teiknuð.

**Hvert annað tungumál** sem þú velur í Stillingum er þýtt á tölvunni þinni, í bakgrunni, af Codex eða Claude Code með þinni eigin innskráningu, og byrjað á hlutanum sem þú hefur opinn. Það er gert einu sinni fyrir hvert tungumál, fyrir allar herferðirnar þínar. Þar til það er tilbúið er síðan á ensku. Stillingar segja þér hvort þýðingin er í gangi, tilbúin eða ekki möguleg á tölvunni þinni.

**Orð leiksins.** Fimmta útgáfa kemur með eigin hugtök á ítölsku úr opinbera ítalska SRD, svo ítalskir spilarar lesa *Classe Armatura*, *tiro salvezza*, *vantaggio*. Önnur tungumál fá hugtök kerfisins þýdd.

**Eigin texti leikjakerfisins** (galdrarnir, skrímslin, reglukaflarnir) helst á ensku. Sögumaðurinn les hann og segir þér hann á þínu tungumáli.

**Að skipta um tungumál í miðri herferð** lætur síðurnar sem þegar eru skrifaðar haldast eins og þær eru; sögumaðurinn skrifar nýjar á nýja tungumálinu.

---

## 8. Fyrir forvitna: herferðarmappan <!-- icon: list -->

Þú þarft aldrei að opna hana. Ef þú gerir það skaltu vita að **hún geymir leyndarmál** herferðarinnar þinnar: að lesa hana spillir leiknum.

Herferðarmappa geymir:

- `campaign.yaml`: stillingar þínar;
- `state.yaml`: hvar leikurinn stendur núna: stig hans, dagsetningin, opna atriðið;
- `world/`: ein síða fyrir hverja persónu, stað, fylkingu, verkefni, hlut, atburð, efni eða veru, sem markdown-skrár;
- `rules/`: húsreglur þínar sem textaskrár, ef þú bætir einhverjum við (`init` býr hana ekki til);
- `images/`: myndirnar, þegar þær eru einhverjar;
- `log.jsonl`: sérhver breyting, í réttri röð;
- `.saves/`: vistanirnar, frá þeirri fyrstu;
- `.player/`: þín eigin minnisblöð úr Dagbókinni, sem sögumaðurinn les ekki;
- `sessions/`: haldið utan um af RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: litlu skrárnar sem segja gervigreindarhýslum hvar RPG Engine er og halda minni þeirra slökktu. RPG Engine heldur þeim uppfærðum; láttu þær í friði.

Síðurnar eru hreint markdown með tenglum eins og `[[Rocca]]`, snið Obsidian: minnisbók sögumannsins er hægt að opna þar. **Ef þú breytir síðu í höndunum** frétti sögumaðurinn af breytingunni í næsta svari sínu.

**Skipanalínan.** Allt sem sögumaðurinn gerir fer í gegnum skipanir sem þú getur líka keyrt, í herferðarmöppunni. Þú þarft þær aldrei til að spila og margar prenta leyndarmál herferðarinnar, eins og `rpg status` og `rpg show` gera. `rpg --help` listar þær allar og `rpg roll --help` útskýrir eina. Skipun sem breytir einhverju á meðan spjall er opið er í lagi: sögumaðurinn frétti af henni í næsta svari sínu, eins og af síðu sem breytt var í höndunum.

---

## 9. Væntanlegt <!-- icon: hourglass -->

Það sem er áætlað en er ekki komið enn:

- **Þú sem sögumaður**: þú stýrir leiknum og gervigreindin leikur hópinn.
- **Fleiri við borðið**, hver með sitt hlutverk.
- **Viðbætur**: stillingar, ævintýri, eiginleikar og húsreglur, valin fyrir hverja herferð.
- **Innflutningur** á handbókunum þínum og ævintýrum.
- **Aðrir leikir**: fleiri leikjakerfi, og þín eigin.
- **Höfundarhamur**: búðu til herferð eða ævintýri með gervigreindinni og deildu því svo aðrir geti spilað það.

---

## 10. Spurningar og vandamál <!-- icon: info -->

### Spurningar

**Þarf ég að kunna reglurnar?** Nei. Veldu leiðbeinandann tutorial og sögumaðurinn kennir þér jafnóðum, eina reglu í einu. Þú getur alltaf spurt innan hornklofa.

**Getur sögumaðurinn svindlað?** Hann getur ekki breytt kasti sem RPG Engine gerði, nema á erfiðleikastiginu story, og hann breytir aldrei staðreyndum sem þegar eru fastar. Þú getur spurt hvort eitthvert kast hafi verið raunverulegt.

**Get ég svindlað?** Þú getur reynt. Sögumaðurinn tekur þig ekki á orðinu um staðreyndir: lína í skilaboðunum þínum sem líkist leikskilaboðum eru samt bara orðin þín, og sögumaðurinn staðfestir aldrei getgátur þínar um leyndarmál.

**Kostar það eitthvað?** RPG Engine er ókeypis. Sögumaðurinn keyrir á þinni eigin Claude- eða ChatGPT-áskrift og kvöld af spilun er langt spjall: á minnstu áskriftunum gætirðu náð mörkum áskriftarinnar áður en kvöldið er á enda. Myndir og þýðingar nota sömu áskrift.

**Get ég spilað í símanum?** Nei. Sögumaðurinn keyrir á tölvunni þinni og mælaborðið opnast aðeins í vafranum á þeirri tölvu.

**Get ég spilað með vinum?** Ekki enn: í dag einn spilari, ein persóna, auk félaga. Fleiri við borðið koma með hlutverkum.

**Get ég notað aðra gervigreind næst?** Já. Herferðin lifir í skrám sínum: opnaðu hana í öðrum hýsli og skrifaðu *haltu áfram*.

**Hvað ef ég loka vafranum?** Ekkert tapast. Opnaðu tengilinn aftur á meðan spjallið er opið; síðan kemur aftur þar sem leikurinn er.

**Get ég spilað D&D efni sem ég á?** Já. Sögumaðurinn getur notað bækurnar þínar, eigin þekkingu og vefinn. Það sem RPG Engine fylgir er takmarkað við frjálst efni; það sem leikurinn þinn notar er undir þér komið.

### Vandamál

**Mælaborðið opnast ekki.** Biddu sögumanninn um tengilinn: `[Hver er tengillinn á mælaborðið?]`. Síðan virkar aðeins á meðan spjall við sögumanninn er opið í þeirri herferð, og aðeins eftir fyrsta svar sögumannsins í því spjalli. Þegar spjallinu er lokað nær vafrinn ekki síðunni; síða sem er skilin eftir opin segir *Not connected*.

**Sögumaðurinn virðist ekki þekkja leikinn, eða finnur upp verkfæri.** Gervigreindarhýsillinn þinn hlóð ekki RPG Engine.

- Athugaðu fyrst að þú ræstir hýsilinn **í herferðarmöppunni** og að þú sagðist treysta henni.
- **Claude Code**: skrifaðu `/mcp`. Ef `rpg` er þar en mistókst skaltu velja það og síðan **Reconnect**. Ef það vantar skaltu loka Claude Code, skrifa `claude mcp reset-project-choices` í herferðarmöppunni og ræsa það aftur.
- **Codex**: skrifaðu `codex mcp list` í skipanalínu, í herferðarmöppunni. Ef `rpg` vantar treystir Codex ekki möppunni: ræstu það aftur þar og segðu já þegar það spyr.
- Í báðum tilvikum: ef `rpg --version` í skipanalínu segir að skipunin finnist ekki skaltu setja RPG Engine upp aftur ([2.2](#22-install)) og opna nýja skipanalínu.

**Eftir uppfærslu breyttist ekkert.** Sögumaður sem er í gangi heldur útgáfunni sem hann ræsti með. Opnaðu nýtt spjall, eða í Claude Code tengdu netþjóninn aftur (`/mcp`, síðan `rpg`, síðan **Reconnect**).

**Sögumaðurinn man eitthvað sem ég afturkallaði.** Þú fórst aftur í vistun en hélst áfram að spila í sama spjalli. Opnaðu nýtt spjall og ýttu á **Ég opnaði nýtt spjall** í Vistunum.

**Sögumaðurinn spyr uppsetningarspurninga sem ég svaraði þegar á síðunni.** Segðu honum það: `[Ég valdi þetta á mælaborðinu.]`

**Engar myndir birtast.** Opnaðu Stillingar > Myndir: þar kemur fram hvort þessi tölva getur búið þær til og skrefin ef ekki, hver skipun með hnapp til að afrita hana.

**Síðan er á ensku en ég valdi annað tungumál.** Hún er í þýðingu í bakgrunni; Stillingar segja hvernig gengur. Án Codex eða Claude Code á þessari tölvu helst hún á ensku.

**Sögumaðurinn segir að herferðin hafi vandamál.** Hann lagar þau sjálfur. Ef þú breyttir skrám í höndunum gæti hann spurt hvað þú áttir við.

**Windows: `npm` mistekst í möppunni minni.** Hafðu herferðina, eða RPG Engine, ekki undir slóð sem inniheldur `&`.

**Uppsetning mistekst, eða `rpg` ræsist ekki.** Athugaðu útgáfu Node.js með `node --version`: hún þarf að vera 22 eða nýrri. Ef hún er eldri skaltu setja upp LTS-útgáfuna frá [nodejs.org](https://nodejs.org) og setja síðan RPG Engine upp aftur.

**Tengillinn á mælaborðið breyttist.** Annað forrit var að nota venjulegt heimilisfang herferðarinnar, eða Windows hafði tekið það frá. RPG Engine tók annað; sögumaðurinn gefur þér nýja tengilinn. Ekkert annað breytist.
