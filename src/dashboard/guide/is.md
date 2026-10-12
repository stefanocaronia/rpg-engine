<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
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

### 2.1 Hvað þú þarft

- Tölvu með Windows, macOS eða Linux.
- **Node.js 22** eða nýrra. Náðu í það á [nodejs.org](https://nodejs.org): „LTS“-útgáfan dugar. Með því fylgir `npm`, sem setur upp RPG Engine.
- **Skipanalínu**, gluggann þar sem þú skrifar skipanir: í Windows er það Terminal-forritið eða PowerShell, í macOS Terminal. Þú notar hana til að setja upp RPG Engine, til að búa til hverja herferð og til að ræsa Claude Code eða Codex.
- **Gervigreindarhýsil**, forritið sem sögumaðurinn keyrir í: **Claude Code** eða **Codex**, með áskrift og innskráningu. Sjá [2.4](#24-connect-your-ai).
- **Stærsta líkanið** sem hýsillinn býður. Lítið líkan er auðblekkt: í prófunum okkar sagði það leyndarmál við spilara sem þóttist vera hinn raunverulegi sögumaður.
- Vafra fyrir mælaborðið.

Innskráningin sem þú notar fyrir hýsilinn gerir meira: RPG Engine notar hana, á tölvunni þinni, til að teikna myndir af stöðum og til að þýða mælaborðið yfir á tungumál sem það fylgir ekki með. Sjá [Myndir](#311-pictures) og [Tungumál](#72-languages).

**Að opna skipanalínu í möppu.** Mörg skref segja „í herferðarmöppunni“. Í Windows hægrismellirðu á möppuna í Skráarkönnuði og velur **Opna í Terminal**. Í macOS hægrismellirðu á möppuna í Finder og velur **Þjónusta > Nýr Terminal í möppu**. Eða, í skipanalínu sem þegar er opin, skrifarðu `cd` og slóð möppunnar, til dæmis `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Uppsetning

Opnaðu skipanalínu og skrifaðu:

```text
npm install -g rpg-engine
```

Þá færðu skipunina `rpg`. Til að athuga hvort það tókst:

```text
rpg --version
```

Þú notar `rpg` einu sinni fyrir hverja herferð, til að búa hana til. Eftir það talarðu bara við sögumanninn: gervigreindarhýsillinn ræsir RPG Engine sjálfur, með sömu `rpg` skipuninni.

### 2.3 Að búa til herferð

Herferð er mappa. Opnaðu skipanalínu í möppunni þar sem þú geymir leikina þína og skrifaðu:

```text
rpg init "The Salt Isles"
```

Þetta býr til möppuna `The Salt Isles` með nýrri herferð í og segir þér hvað á að gera næst:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Línurnar á eftir *For the master* eru ætlaðar sögumanninum, sem les þær í spjallinu: þú þarft ekkert að gera með þær. Mundu hvar mappan er: þú kemur aftur í hana í hvert sinn sem þú spilar. Án möppuheitis breytir `rpg init` möppunni sem þú ert í í herferðina.

`init` býr til allt sem herferðin þarf: stillingar hennar, heimsmöppurnar og litlu skrárnar sem segja gervigreindarhýslinum að nota RPG Engine og geyma ekkert eigið minni utan herferðarinnar.

Þú þarft ekki að velja neitt núna. Sögumaðurinn spyr þig um afganginn í spjallinu, eða þú velur það á mælaborðinu. Ef þú veist nú þegar sum svörin geturðu gefið þau hér:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Þetta býr til möppuna `salt-isles` með herferðinni *The Salt Isles* í: möppuheiti án bila og herferðarheiti eins og þér sýnist.

| Valkostur | Hvað hann stillir | Gildi |
|---|---|---|
| `--name` | Heiti herferðarinnar | hvað sem er; heiti möppunnar ef þú sleppir honum |
| `--language` | Tungumál leiksins | kóði, til dæmis `en`, `it`, `fr` |
| `--system` | Leikjakerfið | `5e`, það eina í dag |
| `--difficulty` | Hversu erfiður heimurinn er | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Hvað það þýðir að falla í bardaga | `narrative`, `epic`, `dice` |

`rpg init --help` sýnir þá líka. Herferð má ekki vera inni í möppu annarrar herferðar.

Þú getur ekki beðið sögumanninn um að búa til herferð: fyrir `init` er ekkert í möppunni sem segir gervigreindarhýslinum hvar RPG Engine er.

### 2.4 Að tengja gervigreindina

RPG Engine virkar með **Claude Code** og **Codex**. Önnur gervigreindarforrit sem nota MCP-verkfæri gætu líka virkað, en við ábyrgjumst það ekki.

**Að setja upp hýsilinn.** Claude Code og Codex keyra í skipanalínunni: þau eru ekki Claude- eða ChatGPT-appið í símanum þínum. Hvort um sig þarf sína eigin áskrift og innskráningu: Claude Code þarf greidda Claude-áskrift, Codex ChatGPT-innskráningu. Fylgdu þeirra eigin síðum til að setja þau upp og skrá þig inn: [Claude Code](https://code.claude.com/docs/en/setup) og [Codex](https://learn.chatgpt.com/docs/codex/cli). Þú gerir þetta einu sinni, fyrir allar herferðirnar þínar.

**Claude Code.** Opnaðu skipanalínu í herferðarmöppunni og skrifaðu `claude`. Í fyrsta skipti spyr það hvort þú treystir möppunni og segir að mappan leyfi verkfæri leiksins (`mcp__rpg`): veldu **Yes, I trust this folder**. Varaðu þig: svarið sem er þegar valið er *No, exit*, þannig að ef þú ýtir strax á Enter lokast Claude Code. Þar með er það klárt: herferðin hefur þegar sagt Claude Code að nota RPG Engine og verkfæri þess og að hafa minnið slökkt.

**Codex.** Opnaðu skipanalínu í herferðarmöppunni og skrifaðu `codex`. Þegar það spyr hvort þú treystir möppunni skaltu segja já: eigin stillingar herferðarinnar segja Codex hvar RPG Engine er, leyfa verkfæri þess og hafa minnið slökkt, og Codex les þær aðeins í möppu sem þú treystir. Í skjáborðsforritinu skaltu athuga að slökkt sé á minni fyrir spjöll leiksins.

**Hvers vegna minnið skiptir máli.** Herferðin lifir í skrám sínum. Ef hýsillinn man líka hluti sjálfur væri ekki raunveruleg afturför að fara aftur í vistun: sögumaðurinn myndi samt muna það sem var afturkallað.

### 2.5 Fyrsta spjallið

Skrifaðu hvað sem er, til dæmis:

> Hæ! Byrjum.

Sögumaðurinn les hvar leikurinn stendur og svarar. Í fyrsta svari hvers spjalls gefur hann þér **tengilinn á mælaborðið þitt** (eitthvað eins og `http://127.0.0.1:4750`). Opnaðu hann í vafranum og hafðu hann við hlið spjallsins allan leikinn. Hver herferð heldur sama tengli frá einu spjalli til annars, nema annað forrit hafi tekið hann: þá gefur sögumaðurinn þér nýjan.

Milli skilaboða sögumannsins sýnir hýsillinn verkfærin sem sögumaðurinn notar, í stuttum línum. Ekki opna nánari upplýsingar um þau (í Claude Code, ctrl+o): þær geta sýnt það sem sögumaðurinn skrifar, leyndarmál með talin.

Ný herferð fer í gegnum þrjú stig, eins og leikur með mennskum sögumanni. Mælaborðið sýnir þau efst sem *1 Stillingar · 2 Núllti fundur · 3 Spilun*:

1. **Stillingar**: þú velur hvernig þú vilt spila. Utan sögunnar.
2. **Núllti fundur**: þú býrð til persónuna þína, í leik.
3. **Spilun**: sagan.

### 2.6 Stillingar: að velja hvernig þú spilar

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu. Ef þú skrifar „þú ákveður“ velur sögumaðurinn og segir þér hvað hann valdi. Þegar mælaborðið er opið sýnir fyrsta skref þess, **Stillingar**, sömu spurningar sem spjöld: eina spurningu í einu, hvert gildi með merkingu sinni og það venjulega merkt **Mælt með**. Veldu þar og sögumaðurinn spyr ekki aftur í spjallinu; **Sleppa** geymir spurningu til síðari tíma. Spjallið ræður því sem aðeins orð geta ráðið: forsendu nýs heims, tungumálið og myndirnar, sem sögumaðurinn spyr aðeins um ef tölvan þín getur búið þær til. Þess vegna spyr síðan færri spurninga en taflan hér að neðan telur upp.

Þú þarft ekki að læra töfluna: hún er til að fletta upp í. Þú getur breytt öllu þessu síðar, í spjallinu eða í **Stillingar** mælaborðsins. Breyting gildir frá næsta svari sögumannsins.

| Stilling | Hvað hún ákveður | Gildi | Mælt með |
|---|---|---|---|
| **Leiðbeinandi** (spurt sem „Hversu vel þekkirðu þennan leik?“) | Hversu mikið sögumaðurinn kennir þér reglurnar, utan sögunnar | **off** (sagan ein; spyrðu innan hornklofa þegar þú vilt), **hints** (stutt ábending fyrir val sem skipta máli og þegar regla fer fram hjá), **tutorial** (hver regla útskýrð í fyrsta sinn, öll summa hvers kasts, stutt uppgjör eftir bardaga) | eftir svari þínu: aldrei spilað → tutorial, lítillega → hints, ég kann það → off |
| **Erfiðleikastig** | Hversu erfiður heimurinn er: bardagar, brögð óvina, vísbendingar, fjársjóðir, hversu hratt ógnir færast | story, easy, normal, hard, brutal | |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | **narrative** (persónan þín deyr aldrei), **epic** (deyr aðeins þegar það skiptir söguna máli), **dice** (teningarnir ráða) | fylgir erfiðleikastiginu: story → narrative, easy → epic, normal og ofar → dice |
| **Vistanir** | Hvenær þú mátt fara til baka | **permadeath** (aldrei; aðeins byrja herferðina upp á nýtt), **checkpoint** (aftur að síðustu lokum atriðis, aðeins ef persónan þín deyr), **free** (aftur í hvaða vistun sem er, og vista hvenær sem þú biður um það) | checkpoint |
| **Strangleiki** | Hversu nákvæmlega er fylgt reglum um fæði, ljós, þreytu, burðarþyngd, galdraefni og ferðalög | **smooth** (sögumaðurinn skautar yfir þau), **rules** (eins og skrifað stendur: kyndlar brenna út, nesti klárast), **simulation** (umfram reglurnar: slit, skemmdir, veður) | smooth |
| **Teningar** | Hver kastar teningum persónu þinnar | **digital** (RPG Engine kastar þeim, á síðunni), **physical** (þú kastar þínum eigin og segir upp tölurnar) | |
| **Mælieiningar** | Vegalengdir og þyngdir í sögunni | metric, imperial | |
| **Félagar** | Hver ferðast með þér | none, búnir til með þér á núllta fundi, búnir til af sögumanni, hittast í leik | |
| **Myndir** | Myndir af stöðum og verkefnum | none, on request, nýir staðir og verkefni | spurt einu sinni, aðeins ef tölvan þín getur búið þær til |
| **Línur** | Það sem birtist aldrei í leiknum | listi, eða ekkert | |
| **Slæður** | Það sem má gerast, en aðeins utan sviðs | listi, eða ekkert | |
| **Tungumál** | Tungumál leiksins og mælaborðsins | hvaða sem er | tekið af því hvernig þú skrifar, og staðfest |

Leikjakerfið getur bætt við eigin stillingum. Fimmta útgáfa bætir við **framvindu**: hvernig persónan þín hækkar í stigum, með **reynslustigum** eða á **áfangastöðum** sögunnar.

**Hvað erfiðleikastigið þýðir í leik.** Story: veikir, einfaldir óvinir, augljósar vísbendingar, nóg af öllu; sögumaðurinn má mýkja eigin köst. Easy: einfaldir óvinir, rausnarlegar birgðir. Normal: skynsamir óvinir, þrjár vísbendingar fyrir hverja niðurstöðu, venjuleg verð og fjársjóðir. Hard: snjallir óvinir, lúmskar vísbendingar, af skornum skammti, ógnir sem færast hratt. Brutal: óvinir sem sitja fyrir, hörfa og ganga frá föllnum, afar naumar birgðir, hörðustu hvíldirnar. Bardagar eru alltaf miðaðir við hópinn þinn eins og hann er núna.

**Án skrifaðs heims** spyr uppsetningin um tvennt til viðbótar:

- **Forsenda**: söguflokkurinn, tónninn og nokkur atriði úr heiminum, með þínum orðum. Til dæmis: *„Lág fantasía, drungaleg en með von. Árbær, reimt vað, sértrúarsöfnuður í hæðunum.“*
- **Undirbúningur**: **on the fly** (sögumaðurinn byggir hvern hluta heimsins rétt áður en þú þarft á honum að halda; mælt með) eða **all at the start**.

Sögumaðurinn leggur síðan til nafn á herferðina. Þegar ekkert vantar og þú segist tilbúin(n)… 

Þegar ekkert vantar og þú segist vera til í slaginn fer leikurinn yfir á núllta fund.

### 2.7 Núllti fundur: persónan þín

Núllti fundur er leikur: þú býrð til persónuna þína með sögumanninum, eins og við borð.

- **Hvert val er þitt**, nema þú biðjir sögumanninn um að velja. Þú getur komið með fullmótaða hugmynd („hálfálfa-prestur sem yfirgaf hofið sitt“), óljósa („einhver sem læknar, en er ekki almennilegur“) eða enga („komdu mér á óvart, svo leyfðu mér að breyta“).
- **Eiginleikagildi.** Sögumaðurinn segir þér aðferðina og öryggisnetið áður en nokkrum teningi er kastað. Í fimmtu útgáfu: staðlaða röðin, punktakaup eða 4d6 þar sem lægsti er sleppt. Aðferðin sem þið komist að samkomulagi um helst í samkomulagi borðsins.
- **Saga þín** er aldrei skylda. Ef þú gefur hana skrifar sögumaðurinn hana með þínum orðum, les hana einu sinni upp fyrir þig og tengir fólk hennar og staði við heiminn. Þú getur líka skrifað hana á mælaborðinu (sjá [Hópur](#party)).
- **Persónuleiki** (fimmta útgáfa): einkenni, hugsjón, tengsl og galli, úr töflum bakgrunns þíns eða þínum eigin.
- **Mynd.** Þegar persónan þín er tilbúin biður sögumaðurinn þig um mynd af henni: skrá á tölvunni þinni. Ef gervigreindarhýsillinn þinn getur teiknað myndir sjálfur gæti sögumaðurinn boðist til að búa til eina.

RPG Engine reiknar tölur persónublaðsins út frá vali þínu: þú gerir aldrei reikningana. Þegar persónurnar eru tilbúnar og þú staðfestir hefst sagan.

---

## 3. Að spila <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum. Stutt er í lagi.

> Ég spyr gestgjafann hver annar hafi komið hér við í kvöld.
>
> „Við erum ekki komin til að valda vandræðum,“ segi ég og held hendinni frá sverðinu.
>
> Ég klifra upp á þakið og bíð.

**Utan sögunnar** skrifarðu innan hornklofa:

> [Hvernig virka glímutök?]
>
> [Get ég enn notað viðbrögðin mín í þessari umferð?]
>
> [Hættum hér í kvöld.]

Sögumaðurinn svarar líka innan hornklofa og snýr svo aftur að sögunni.

**Þú segir hvað þú reynir; sögumaðurinn segir hvað gerist.** Það sem brýtur rökvísi heimsins eða staðreyndir sem þegar eru fastar gerist ekki: sögumaðurinn segir þér það innan sögunnar og býður það sem er mögulegt.

**Sögumaðurinn ákveður aldrei fyrir persónuna þína.** Hann lætur þig ekki tala, finna til eða velja. Ef vafi leikur á spyr hann.

**Sögumaðurinn talar aldrei um vélina.** Spyrðu hann hvort hann haldi utan um hlutina og hann svarar eins og sögumaður: „Ég man allt: við tökum upp þráðinn héðan næst.“

**Þú getur spurt sögumanninn hvernig á að nota mælaborðið.** Hann þekkir síðuna: „Hvar sé ég galdrana mína?“, „Hvernig kasta ég í höndunum?“

### 3.2 Köst

**Hvenær kast gerist.** Sögumaðurinn biður um kast aðeins þegar niðurstaðan er óviss og skiptir máli. Annars segir hann já, eða „já, en“. Áður en þú kastar segir sögumaðurinn hvað er í húfi og hvaða próf passa, og stoppar svo. Þú kastar, eða skiptir um skoðun:

> **Sögumaður:** Syllan er mjó og blaut. Ef þú rennur er það langt fall í ána. Lipurðarpróf (Fimleikar), eða þú getur farið til baka og leitað að stiganum.
>
> **Þú:** Ég reyni það.

**Að kasta á mælaborðinu.** Þegar sögumaðurinn biður um það birtist borði efst á síðunni með hnapp fyrir hvert próf, til dæmis *Acrobatics +4 · with advantage*. Smelltu á hann: teningarnir falla á síðuna og sögumaðurinn heyrir niðurstöðuna. Þú getur líka:

- smellt á samsvarandi línu á persónublaðinu þínu, sem lýsist upp í gulli;
- kastað réttu teningunum úr bakkanum;
- skrifað þín eigin orð í borðann í staðinn, ef þú vilt gera eitthvað annað.

**Að kasta í höndunum.** Ef þú vilt frekar velja teningana sjálf(ur) skaltu kveikja á **Handvirkt** í horni borðans (eða í **Stillingar**). Hnappur prófsins hverfur og borðinn segir hvað á að kasta eins og sögumaður myndi gera: *Roll Acrobatics yourself, on your sheet or with the dice.* Smelltu á línuna á persónublaðinu sem lýsist upp, eða kastaðu réttu teningunum úr bakkanum: RPG Engine kastar þeim, leggur bónusinn þinn við og sögumaðurinn heyrir niðurstöðuna. Próf sem hvorki persónublaðið né bakkinn getur gert, eins og skaði sem endurkastar einum, heldur hnappnum sínum. Handvirkt helst kveikt í þessum vafra þar til þú slekkur á því.

**Efnislegir teningar allan leikinn.** Þegar stillingin **Teningar** er á physical biður sögumaðurinn um köst þín í orðum og þú skrifar tölurnar sem þú kastaðir:

> [Ég kastaði 14.]

RPG Engine leggur breytana þína við og hafnar tölu sem teningarnir þínir geta ekki sýnt.

**Frjáls köst.** Smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu teningabakkann, til að kasta bara til gamans. Frjáls köst telja aldrei, eru aldrei skráð og sögumaðurinn sér þau aldrei. Frjáls 20 verður aldrei raunveruleg síðar.

**Köst sögumannsins.** Sögumaðurinn kastar fyrir óvini og aðra með RPG Engine líka. Flest köst eru sýnd í kastdálknum þínum. Þegar þú mátt ekki sjá niðurstöðu kastar sögumaðurinn í leyni. Þú getur alltaf spurt:

> [Var þetta kast raunverulegt?]

Fyrir sýnt kast gefur sögumaðurinn tölurnar og ástæðuna. Fyrir leynilegt kast gefur hann fingrafar sem sannar að kastið var gert áður en þú spurðir.

**Köst í spjallinu** birtast innan hornklofa, rétt eftir stundina sem þau ráða úrslitum um: *[Persuasion 14 + 3 = 17]*. Síðan segir sagan frá útkomunni.

### 3.3 Atriði og bardagar

Sögumaðurinn stýrir sögunni í **atriðum**: bardagi, samtal, könnun, ferðalag, hvíld, áskorun (eltingarleikur, kapphlaup, gáta). Þú þarft ekki að halda utan um þau: þau eru kaflar sögunnar hjá RPG Engine. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í sögu dagbókarinnar þinnar.

**Í bardaga** segir sögumaðurinn frá öllum röðum sem eru ekki þínar, hverri á eftir annarri, með öllum köstum, og **stoppar þar sem þú getur ákveðið**: þín röð, viðbragð, val. Í þinni röð segirðu hvað þú gerir:

> Ég kasta Sacred Flame á þann við dyrnar.

Hlutinn **Bardagi** á mælaborðinu sýnir röð raðanna, hver á röðina, lífspunkta hópsins þíns og hversu særðir óvinirnir virðast (óskaddaður, særður, blóðugur, fallinn: í orðum, aldrei í tölum). Ef persónan þín fellur birtast dauðavistunarköstin stór á síðunni.

**Þegar bardaginn er þegar ráðinn** getur sögumaðurinn boðist til að segja frá restinni í einum skilaboðum.

### 3.4 Tími, ferðalög og heimurinn sem hreyfist

**Tími.** Sérhver athöfn tekur tíma í sögunni og RPG Engine heldur dagatalið: dagur 3, snemma morguns. Sögumaðurinn segir tímann eins og heimurinn mælir hann: dögun, þriðja bjallan, nátthúm. Milli funda líður enginn tími: þú tekur upp þráðinn þar sem þú hættir.

**Hvíld.** Segðu að þú hvílist og sögumaðurinn beitir því sem hvíldin endurheimtir, eins og lífspunktum og galdrareitum:

> Við tjöldum og tökum langa hvíld.

**Ferðalög.** Segðu hvert þú vilt fara:

> Við tökum veginn norður til Rocca.

RPG Engine reiknar út leiðina, vegalengdina og dagana á þínum hraða og flytur þig þangað. Ferð stoppar þegar eitthvað fyrirfram ákveðið gerist á leiðinni, í lok hvers ferðadags og við komu. Þú getur spurt hversu langt staður er áður en þú leggur af stað:

> [Hversu langt er til Rocca og hve lengi tæki það fótgangandi?]

**Heimurinn hreyfist án þín.** Skúrkar hafa áætlanir með tímamörkum og klukkum. Hvern nýjan dag færir sögumaðurinn ógnirnar sem tíminn hefur fært nær og þú sérð merki þeirra: orðróm, slóð, breytingu í bænum. Þú sérð aldrei klukkuna sjálfa, aðeins það sem hún skilur eftir sig.

**Peningar** eru taldir í mynt leiksins. Borga, selja, fá borgað: RPG Engine sér um skiptimyntina.

### 3.5 Kort

**Heimskortið** (mælaborð: **Heimur**) sýnir aðeins staðina sem persónan þín þekkir, með vegunum á milli þeirra, slóðinni sem þú hefur gengið og þokunni yfir öllu öðru. Smelltu á stað til að sjá hvað þú veist um hann og hversu langt er þangað.

**Kort af stað** (mælaborð: **Atriði**, og **Bardagi** í bardaga) birtist þegar sögumaðurinn teiknar það fyrir staðinn þar sem þú ert: veggir, dyr, jörðin og hver stendur hvar, sem leikmenn. Í bardaga, í þinni röð, eru reitirnir sem þú nærð ekki til huldir slæðu, svo þú sérð strax hvert þú getur farið. Þegar sögumaðurinn spyr hvert persónan þín fari opnar síðan kortið og þú snertir reit, eða skrifar hann, til dæmis *E4*.

### 3.6 Verkefni, dagbók og minnisblöð

**Verkefni.** Þegar persónan þín tekur að sér verkefni verður það að verkefni í **Dagbók** þinni: hver gaf það, hvar, fyrir hvenær, markmiðin sem listi og hvað það mælir (frestur með tíma sem eftir er, klukka, talning). Merktu eitt með stjörnunni til að fylgjast með því: það helst lítið efst í Atriði, með næsta markmiði sínu. Verkefninu lýkur þegar sagan lýkur því, aldrei af sjálfu sér.

**Sagan.** Flipinn Saga í dagbókinni er herferðin þín sem tímalína: hvert atriði er kafli, með stað sínum, dagsetningu og stuttu yfirliti, það nýjasta fyrst.

**Minnisblöðin þín.** Í flipanum Minnisblöð í dagbókinni skrifarðu þín eigin minnisblöð: kenningar, nöfn, áætlanir. Þau haldast á tölvunni þinni og sögumaðurinn les þau ekki, nema þú veljir **Deila** á eitt. Sameiginlegt minnisblað berst sögumanninum í næsta svari hans sem það sem þú heldur, aldrei sem staðreynd. Kenningin þín verður ekki sönn af því að þú skrifaðir hana. Minnisblað sem biður um að hætta eða forðast tiltekið efni gildir eins og þú hefðir sagt það við borðið.

### 3.7 Saga og mynd persónunnar þinnar

Á persónublaði persónunnar þinnar er í spjaldinu **Lýsing** reitur til að skrifa sögu persónunnar. Sendu hana og sögumaðurinn skrifar hana inn í persónuna með eigin orðum, eftir að þú segir já.

Fyrir mynd persónunnar gefurðu sögumanninum myndskrá í spjallinu, með því hvar hún er á tölvunni þinni (PNG, JPEG, WebP eða SVG, allt að 5 MB):

> [Hér er andlitsmynd persónunnar minnar: C:\Users\me\Pictures\mira.png]

Sögumaðurinn afritar hana inn í herferðina og hún birtist á leikmanni persónunnar þinnar á mælaborðinu. Þú getur breytt henni á sama hátt hvenær sem þú vilt. RPG Engine sjálft teiknar aðeins staði og verkefni (sjá [Myndir](#311-pictures)).

### 3.8 Vistanir og að fara til baka

RPG Engine vistar alla herferðina **í lok hvers atriðis**, sjálfkrafa. Hvað þú getur gert við þær vistanir fer eftir stillingunni **Vistanir**:

| Vistanir | Vista þegar þú vilt | Fara til baka |
|---|---|---|
| **permadeath** | nei | aldrei; þú getur aðeins byrjað herferðina upp á nýtt |
| **checkpoint** | nei | í síðustu vistun, aðeins þegar persónan þín deyr |
| **free** | já | í hvaða vistun sem er, hvenær sem þú vilt |

Í öllum stillingum geturðu **byrjað upp á nýtt**: frá upphafi spilunar með sömu persónu, eða frá núllta fundi með nýrri.

Þú getur gert allt þetta í spjallinu („[Förum aftur til þess áður en einvígið var.]“) eða í hlutanum **Vistanir** á mælaborðinu.

**Eftir að hafa farið til baka skaltu opna nýtt spjall.** Spjallið sem þú varst að spila í man það sem var afturkallað. Opnaðu nýtt spjall við sögumanninn (`/clear` í Claude Code, `/new` í Codex), skrifaðu *haltu áfram*, ýttu síðan á **Ég opnaði nýtt spjall** í Vistunum, eða segðu sögumanninum það í nýja spjallinu. Taktu aldrei upp gamla spjallið aftur. Þar til þú staðfestir heldur sögumaðurinn ekki áfram.

### 3.9 Fundir: að hætta og koma aftur

**Þú lýkur fundinum** hvenær sem þú vilt:

> [Hættum hér í kvöld.]

Það er ekkert „vista og hætta“: allt er þegar í skránum.

**Til að loka** spjallinu skaltu skrifa `/exit` í Claude Code eða `/quit` í Codex. Mælaborðið þagnar fram að næsta spjalli.

**Til að koma aftur** skaltu opna skipanalínu í herferðarmöppunni (þeirri sem `init` prentaði), ræsa hýsilinn þar og skrifa *haltu áfram*. Sögumaðurinn les hvar leikurinn stendur, gefur þér stutt yfirlit og byrjar á einhverju sem gerist. Nýtt spjall tapar engu: herferðin lifir í skrám sínum, ekki í spjallinu.

Sögumaðurinn spyr ekki venjulegra spurninga í lokin. Aðeins ef hann tók eftir að eitthvað virkaði ekki spyr hann stuttlega.

### 3.10 Skap sögumannsins

Efst á mælaborðinu er andlitsmynd sögumannsins, lítið vélmenni. Svipur þess fylgir tóni sögunnar: áhyggjufullur þegar hætta vex, glaður yfir djörfu bragði, hissa á óvæntum snúningi. Það bregst um stund við náttúrulegri 20 eða náttúrulegri 1. Það sýnir aldrei það sem þú veist ekki enn: ekkert glott áður en gildran smellur. Leikmenn hópsins þíns sýna líka skap sitt. Þegar spjallinu er lokað sefur vélmennið.

### 3.11 Myndir

RPG Engine getur látið búa til mynd af hverjum stað sem þú nærð og hverju verkefni sem þú tekur að þér, eins og stillingin **Myndir** segir til um. Það notar það sem þegar er á tölvunni þinni:

- **Codex**, með ChatGPT-innskráningunni þinni: máluð mynd.
- Annars **Claude Code**, með Claude-innskráningunni þinni: teikning.

Myndin notar þína eigin áskrift, ekki okkar. Hlutinn **Stillingar** segir þér hvort hægt er að búa til myndir á tölvunni þinni og, ef ekki, hvaða skref þarf til að setja það upp. Án mynda sýnir síðan merki hverrar tegundar staðar í staðinn. Þú getur líka gefið sögumanninum þína eigin mynd fyrir hvaða stað eða persónu sem er.

### 3.12 Öryggi: línur, slæður og stopp

- **Línur**: það sem birtist aldrei í leiknum.
- **Slæður**: það sem má gerast, en aðeins utan sviðs.
- **Stopp**: hvenær sem er geturðu stöðvað efni, án útskýringa. Skrifaðu það utan sögunnar:

> [stop]

Sögumaðurinn sleppir því strax og bætir því við línurnar þínar, fyrir alla komandi fundi. Þú getur séð og breytt línum þínum og slæðum í **Stillingar**.

### 3.13 Að skipta um skoðun

Allar stillingar geta breyst í herferðinni: í spjallinu („[Gerum þetta erfiðara.]“) eða í **Stillingar**. Sögumaðurinn fréttir af breytingu í næsta svari sínu. Úrskurður sem sögumaðurinn gaf án bókarinnar verður að **fordæmi** og er varðveittur, svo sama spurning fær sama svar næst.

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

Leikjakerfi eru gögn eins leiks: persónublað hans, tölur, verur, hlutir, galdrar og reglutexti. Hver herferð spilar eitt kerfi.

RPG Engine reiknar persónublaðið þitt og það sem eyðist og kemur aftur, eins og lífspunkta og galdrareiti, eins og stafrænt persónublað gerir. Hvernig eiginleiki eða galdur virkar les sögumaðurinn í reglunum og ákveður, eins og við borð.

### 5.2 Fimmta útgáfa, innifalin

RPG Engine fylgir **5e**, úr System Reference Document 5.1 (reglurnar frá 2014, frjálsar undir Creative Commons). Það inniheldur:

- kynþætti, flokka, undirflokka, einn bakgrunn og eina hæfni úr SRD;
- 319 galdra, vopn, herklæði og búnað, töfragripi og skrímsli úr SRD;
- reglukaflana, sem sögumaðurinn flettir upp eftir nákvæmum texta þeirra;
- fullt persónublað, reiknað: eiginleikabreytar, vistunarköst, færni, herklæðaflokkur, árásir, galdraerfiðleiki, reitir, lífteningar, eiginleikar eftir stigum, reynsla og stigahækkun;
- hvíldir sem endurheimta það sem þær eiga að gera; ástönd með reglutexta sínum; áminningar um einbeitingu.

**Efni umfram SRD.** Þú getur spilað fimmtu útgáfu með efni sem SRD vantar, eins og flokk eða skrímsli úr bók sem þú átt. Sögumaðurinn þekkir leikinn, getur lesið handbækurnar þínar og leitað á vefnum. Hann skrifar það sem hann þarf sem síður herferðarinnar og RPG Engine vinnur eins með þær. Það sem við látum fylgja er takmarkað af leyfi þess; það sem sögumaðurinn þinn veit er það ekki.

RPG Engine er samhæft fimmtu útgáfu.

### 5.3 Húsreglur og eigin viðbætur

Þú þarft ekki að snerta neina skrá. Biddu sögumanninn:

> [Húsregla: náttúrulegur 1 í árás þýðir að þú missir vopnið.]
>
> [Mig langar að spila Blood Hunter. Ég á bókina: hér eru eiginleikar flokksins.]
>
> [Í þessari herferð tekur stutt hvíld 10 mínútur.]

Sögumaðurinn skráir þær í herferðina þína á einn af þessum leiðum:

- **Samkomulag borðsins**, í orðum, eins og vopnamissirinn eða stutta hvíldin hér að ofan. Sögumaðurinn geymir það með stillingum herferðarinnar og spilar eftir því upp frá því. Úrskurður sem sögumaðurinn gefur án bókarinnar er geymdur á sama hátt, sem **fordæmi**.
- **Ný síða**, eins og flokkur, kynþáttur eða hlutur. Nýr flokkur virkar eins og flokkar kerfisins: stig þitt, lífteningar og eiginleikar telja hann. Nýr kynþáttur getur byggt á þeim sem fyrir er („eins og álfur, auk…“); nafngreint sverð getur byggt á Longsword.
- **Nýjar tölur fyrir persónublaðið**: reitur, tafla, formúla, teljari sem hvíld endurheimtir. Til dæmis yfirburðateningar Battle Master sem koma aftur í stuttri hvíld. Húsregla getur líka komið í stað einnar af formúlum kerfisins.

Ef þú ert með húsreglur sem þegar eru skrifaðar geturðu líka sett þær sem textaskrár í `rules` möppu herferðarinnar (sjá [herferðarmappan](#8-for-the-curious-the-campaign-folder)): sögumaðurinn les þær á undan reglu bókarinnar með sama nafni.

### 5.4 Að bæta við eða flytja inn eigið leikjakerfi

Í dag spilar RPG Engine aðeins fimmtu útgáfu. Önnur leikjakerfi koma, og einnig leið til að bæta við þínu eigin, eða til að breyta leik sem þú átt í kerfi út frá handbókunum. Sjá [Væntanlegt](#9-coming-later).

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
