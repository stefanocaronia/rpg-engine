<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d ece214f0 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
# RPG Engine: heildarleiðbeiningar

**RPG Engine** lætur þig spila borðhlutverkaleik með **gervigreind sem sögumann**. Þú talar við sögumanninn í **spjalli**; RPG Engine vinnur á bak við tjöldin: það **man heiminn**, **kastar teningunum** og **heldur utan um bókhaldið**. Við hliðina á spjallinu hefurðu síðu opna í vafranum, **mælaborðið**, með persónublaðinu þínu, teningunum, kortunum og dagbókinni.

Þessar leiðbeiningar eru fyrir spilara: þú þarft ekki að kunna að forrita.

## Fljótleg byrjun <!-- icon: send -->

1. Settu upp **Node.js** frá [nodejs.org](https://nodejs.org) (LTS-útgáfuna).
2. Settu upp **gervigreindarforrit**, forritið sem sögumaðurinn keyrir í, og skráðu þig inn: til dæmis Claude Code eða Codex ([2.4](#24-connect-your-ai)).
3. Settu RPG Engine upp í skipanaglugga: `npm install -g rpg-engine`.
4. Búðu til herferð: `rpg init "The Salt Isles"`.
5. Farðu inn í nýju möppuna með `cd "The Salt Isles"` og ræstu forritið þar: `claude` fyrir Claude Code, `codex` fyrir Codex. Segðu já þegar það spyr hvort þú treystir möppunni ([2.4](#24-connect-your-ai)) og skrifaðu svo *Hæ! Byrjum.* Sögumaðurinn svarar með tengli á mælaborðið þitt.

## 1. Hvað RPG Engine er <!-- icon: about -->

| Hver | Hvað viðkomandi gerir |
|---|---|
| **Þú** | Þú spilar persónuna þína: hvað hún gerir, segir og reynir. |
| **Sögumaðurinn** (gervigreindin) | Segir söguna, leikur alla aðra, ákveður hvað gerist og biður um köst. |
| **RPG Engine** | Geymir heiminn í skrám, kastar teningunum, telur lífspunkta, peninga, tíma og vegalengdir og heldur leyndarmálum þar til þú uppgötvar þau. |

Heimurinn helst eins frá einu kvöldi til annars, jafnvel í nýju spjalli og jafnvel með annarri gervigreind:

- **Það sem hefur verið sagt stendur.** Dauður óvinur helst dauður.
- **Teningarnir eru raunverulegir.** Sögumaðurinn getur ekki hnikað þeim til, nema á léttasta erfiðleikastiginu, ef þú velur það.
- **Leyndarmál haldast leyndarmál.** Sögumaðurinn segir þér aldrei það sem persónan þín veit ekki.
- **Heimurinn hreyfist.** Ógnir færast nær á meðan þið hvílist eða ferðist og þú sérð merki þeirra.
- **Herferð er mappa** á tölvunni þinni: hættu hvenær sem þú vilt og taktu upp þráðinn síðar.

Í dag spilar RPG Engine eitt leikjakerfi, **fimmtu útgáfu**, úr ókeypis System Reference Document 5.1. Fleiri koma ([Væntanlegt](#9-coming-later)).

---

## 2. Að byrja <!-- icon: path -->

### 2.1 Það sem þú þarft

- Tölvu með Windows, macOS eða Linux og vafra.
- **Node.js 22** eða nýrra, frá [nodejs.org](https://nodejs.org). Með því fylgir `npm`, sem setur upp RPG Engine.
- **Skipanalínu** (terminal): í Windows er það Terminal eða PowerShell, í macOS Terminal. Til að opna hana í möppu skaltu hægrismella á möppuna og velja **Open in Terminal** (Windows) eða **Services > New Terminal at Folder** (macOS).
- **gervigreindarforrit** (AI agent) fyrir sögumanninn ([2.4](#24-connect-your-ai)), með **stærsta líkaninu** sem það býður: með litlu líkani er auðveldara að fá sögumanninn til að ljóstra upp leyndarmálum eða beygja reglurnar.

### 2.2 Uppsetning

```text
npm install -g rpg-engine
```

`rpg --version` sýnir hvort uppsetningin tókst. Þú notar `rpg` einu sinni fyrir hverja herferð, til að búa hana til. Eftir það ræsir gervigreindarforritið RPG Engine sjálft.

### 2.3 Búa til herferð

Opnaðu skipanalínu í möppunni þar sem þú geymir leikina þína ([2.1](#21-what-you-need) segir hvernig):

```text
rpg init "The Salt Isles"
```

Þetta býr til möppuna `The Salt Isles` með nýrri herferð. Farðu inn í hana með `cd "The Salt Isles"`. Mundu hvar hún er: þú kemur aftur í hana í hvert sinn sem þú spilar. Allt annað velur þú síðar, í spjallinu eða á mælaborðinu. `rpg init --help` sýnir valkostina ef þú vilt velja eitthvað strax, til dæmis `--language it` eða `--difficulty hard`.

Sögumaðurinn getur ekki búið til herferð fyrir þig: fyrir `init` veit gervigreindarforritið ekki hvar RPG Engine er.

### 2.4 Tengja gervigreindina

Sögumaðurinn keyrir í **gervigreindarforriti** (AI agent): forriti í skipanalínu eða á skjáborði sem getur unnið með skrárnar á tölvunni þinni, eins og Claude Code eða Codex. Venjulegt spjall eins og claude.ai eða ChatGPT, eða símaforrit, dugar ekki: sögumaðurinn þarf aðgang að skrám herferðarinnar á tölvunni þinni. Hvert forrit þarf sína áskrift og sína innskráningu: Claude Code þarf greidda Claude-áskrift, Codex þarf ChatGPT-innskráningu. Þú setur forritið upp einu sinni, frá þess eigin síðu: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skrifaðu `claude` í möppu herferðarinnar. Þegar það spyr hvort þú treystir möppunni skaltu velja **Yes, I trust this folder**. Farðu varlega: svarið sem er valið fyrirfram er *No, exit*.
- **Codex**: skrifaðu `codex` í möppu herferðarinnar og svaraðu já þegar það spyr hvort þú treystir möppunni. Í skjáborðsforritinu skaltu athuga í stillingunum að minni (memories) sé slökkt fyrir spjöll leiksins.
- **Annað forrit**: ræstu það í möppu herferðarinnar og gefðu því MCP-þjóninn `rpg mcp`. RPG Engine er hefðbundinn MCP-þjónn: hvaða forrit sem styður MCP getur verið sögumaður, líka forrit sem keyra á þinni eigin tölvu.

Við spilum og prófum með **Claude Code**. **Codex** er tengt og athugað, en engin heil herferð hefur enn verið spiluð með því. `init` setur líka upp **Gemini CLI**. Herferðin slekkur á eigin minni forritsins: leikurinn lifir í skrám sínum, þannig að þegar farið er aftur í vistun er í raun farið aftur í tímann.

### 2.5 Fyrsta spjallið

Skrifaðu hvað sem er, til dæmis *Halló! Byrjum.* Í fyrsta svari hvers spjalls gefur sögumaðurinn þér **hlekkinn á mælaborðið þitt**, eitthvað á borð við `http://127.0.0.1:4750`. Opnaðu hann og hafðu hann við hliðina á spjallinu.

Á milli skilaboða sögumannsins sýnir forritið verkfærin sem það notar. Ekki opna upplýsingar um þau (í Claude Code ctrl+o), því þær geta sýnt leyndarmál.

Ný herferð fer í gegnum þrjú stig, sem sjást efst á mælaborðinu: **1 Stillingar** (hvernig þú vilt spila), **2 Núllti fundur** (þú býrð til persónuna þína, í leiknum), **3 Spilun**.

### 2.6 Stillingar: hvernig þú vilt spila

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu. Skrefið **Stillingar** á mælaborðinu sýnir sömu spurningar sem spjöld. Skrifaðu „þú ákveður“ og sögumaðurinn velur. Allt má breyta síðar, í spjallinu eða í **Stillingar**.

| Stilling | Hvað hún ákveður | Gildi |
|---|---|---|
| **Leiðbeinandi** | Hve mikið sögumaðurinn kennir þér reglurnar | off, hints, tutorial |
| **Erfiðleikastig** | Hve erfiður heimurinn er | story, easy, normal, hard, brutal |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | narrative (aldrei dauði), epic (aðeins þegar það skiptir máli), dice |
| **Vistanir** | Hvenær þú mátt fara til baka | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Strangleiki** | Hve nákvæmlega matur, ljós og ferðalög fylgja reglunum | smooth, rules, simulation |
| **Teningar** | Hver kastar teningunum þínum | digital, physical |
| **Mælieiningar** | Vegalengdir og þyngd | metric, imperial |
| **Voices** | Hver talar fyrir persónurnar sem þú hittir: á lykilstundum persónan sjálf, sem veit aðeins það sem hún veit, eins og sögumaðurinn velur; sögumaðurinn alltaf; eða alltaf persónan, fyrir helstu persónur eða allar, hægar og dýrara, þar sem gervigreindarforritið þitt getur það | auto, master, important, always |
| **Félagar** | Hver ferðast með þér | none, made with you, made by the master, met in play |
| **Myndir** | Myndir af stöðum, verkefnum og þeim sem þú hittir | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Línur** og **Slæður** | Það sem birtist aldrei og það sem gerist aðeins utan sviðs | listar |
| **Tungumál** | Tungumál leiksins og mælaborðsins | hvaða tungumál sem er |

Fimmta útgáfa bætir við **framvindu**: reynslustigum eða áföngum.

Ef enginn heimur er skrifaður spyr sögumaðurinn líka um **forsendu** (tegund, tón og nokkra þætti, með þínum orðum) og **undirbúning**: hvort heimurinn er byggður jafnóðum, eftir því sem líður á, eða allur í upphafi.

**Stíll sögumanns** er aldrei spurt um, en þú getur breytt honum í spjallinu eða í **Stillingar**: **textinn** (einfaldur, bókmenntalegur, pulp, kaldhæðinn), **sögurnar** sem sögumaðurinn býr til (aðstæður, söguþræðir, þættir, ráðgáta), höfundur til að **skrifa eins og**, eða hvað annað sem er **með þínum orðum**.

### 2.7 Núllti fundur: persónan þín

Þú býrð til persónuna með sögumanninum, eins og við borð. Hvert val er þitt, nema þú biðjir sögumanninn að taka það: komdu með fullmótaða hugmynd, óljósa eða enga. Sögumaðurinn segir þér hvernig hæfnigildi eru búin til áður en nokkrum teningi er kastað. Saga persónunnar er aldrei skilyrði. Ef þú gefur hana skrifar sögumaðurinn hana með þínum orðum. Síðan biður sögumaðurinn um mynd af persónunni þinni ([3.7](#37-your-characters-story-and-picture)). RPG Engine reiknar persónublaðið: þú þarft aldrei að reikna sjálf(ur).

---

## 3. Að spila <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum:

> Ég spyr gestgjafann hver annar hafi komið hér í kvöld.

Utan sögunnar skrifarðu innan hornklofa: *[Hvernig virkar glíma?]* Sögumaðurinn svarar líka innan hornklofa.

Þú segir hvað þú reynir. Sögumaðurinn segir hvað gerist. Sögumaðurinn ákveður aldrei fyrir persónuna þína og talar aldrei um vélina. Þú getur spurt hann hvernig á að nota stjórnborðið.

### 3.2 Köst

Sögumaðurinn biður um kast aðeins þegar útkoman er óviss og skiptir máli, og segir fyrst hvað er í húfi. Síðan:

- **Á stjórnborðinu** birtist borði með hnapp fyrir hvert próf, til dæmis *Acrobatics +4 · with advantage*. Smelltu á hann: teningarnir falla á síðunni og sögumaðurinn fær útkomuna. Þú getur líka smellt á línuna á persónublaðinu sem lýsist upp, kastað teningunum úr teningabakkanum eða skrifað eitthvað annað í borðann.
- **Handvirkt**, í horni borðans eða í **Stillingum**: borðinn segir þér hvað á að kasta og þú kastar því af persónublaðinu eða úr teningabakkanum.
- **Alvöru teningar**, þegar teningastillingin er á alvöru teningum: þú skrifar töluna sem þú kastaðir, *[Ég kastaði 14.]*, og RPG Engine bætir breytunum þínum við.

**Frjáls köst**: smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu teningabakkann, til að kasta upp á gamanið. Þau telja aldrei og sögumaðurinn sér þau aldrei.

**Köst sögumannsins** birtast í kastdálkinum þínum, nema leynileg köst. Þú getur alltaf spurt *[Var þetta kast raunverulegt?]*: fyrir leynilegt kast gefur sögumaðurinn fingrafar sem sannar að það var gert áður en þú spurðir.

### 3.3 Atriði og bardagar

Sagan gerist í **atriðum**: bardaga, samtali, könnun, ferðalagi eða hvíld. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í dagbókina þína.

Í bardaga segir sögumaðurinn frá hverri röð sem er ekki þín og stoppar þar sem þú getur tekið ákvörðun. **Atriði** sýnir efst hver á röðina og hver kemur næst, og spjald persónunnar þinnar er við hlið kortsins. Röð umferðarinnar, lífspunktar hópsins þíns og hversu særðir óvinirnir líta út, í orðum, eru áfram við hlið síðunnar. Ef persónan þín fellur birtast dauðavistanir stórar á síðunni.

### 3.4 Tími, ferðalög og heimur á hreyfingu

RPG Engine heldur utan um dagsetninguna. Enginn tími líður á milli funda. Segðu að þið hvílist, *Við tökum langa hvíld*, og hvíldin skilar því sem hún á að skila. Segðu hvert þið farið, *Við förum veginn norður til Rocca*, og RPG Engine reiknar leiðina, vegalengdina og dagana, og stoppar þegar eitthvað gerist á leiðinni. Peningar eru taldir í mynt leiksins, líka skiptimynt.

Skúrkar hafa áætlanir með tímamörkum. Á hverjum nýjum degi hreyfir sögumaðurinn þær ógnir sem tíminn hefur fært áfram, og þú sérð merki þeirra en aldrei klukkuna sjálfa.

### 3.5 Kort

**Heimur** sýnir staðina sem persónan þín þekkir, vegina á milli þeirra og slóðina sem þú gekkst, með þoku yfir restinni. **Atriði** sýnir kort af staðnum þar sem þú ert, ef hann hefur kort, og hver stendur hvar. Í bardaga, í þinni röð, eru reitirnir sem þú nærð ekki til huldir. Þegar sögumaðurinn spyr hvert þú færir þig, snertu reit eða skrifaðu hann, til dæmis *E4*.

### 3.6 Verkefni, dagbók og minnisblöð

Verkefni sem persónan þín tekur að sér verður að verkefni í **Dagbók**, með markmiðum sínum, tímamörkum og því sem það mælir. Settu stjörnu á það til að halda því sýnilegu efst í Atriði. Dagbókin segir líka **söguna** þína, atriði fyrir atriði, og geymir **minnisblöðin** þín: þau eru einkamál nema þú veljir að **Deila** einu. Sögumaðurinn heyrir það sem það sem þú hugsar, aldrei sem staðreynd.

### 3.7 Saga og mynd persónunnar

Á persónublaðinu er í spjaldinu **Lýsing** reitur fyrir sögu persónunnar: sögumaðurinn skrifar hana inn eftir að þú segir já. Fyrir mynd geturðu gefið sögumanninum skrá (PNG, JPEG, WebP eða SVG, allt að 5 MB) og sagt hvar hún er í tölvunni þinni, eða látið gera andlitsmynd ([3.11](#311-pictures)): *[Búðu til andlitsmynd af mér: grátt hár í fléttu, ör á hökunni.]*

### 3.8 Vistanir og að fara til baka

RPG Engine vistar alla herferðina í lok hvers atriðis. **Vistanir**-stillingin ræður restinni:

| Vistanir | Vista þegar þú vilt | Fara til baka |
|---|---|---|
| **permadeath** | nei | aldrei |
| **checkpoint** | nei | í síðustu vistun, aðeins þegar persónan þín deyr |
| **free** | já | í hvaða vistun sem er |

Í öllum stillingum geturðu **byrjað upp á nýtt**, frá upphafi leiks eða frá núllta fundi. Gerðu það í spjallinu eða í **Vistunum**.

Eftir að hafa farið til baka skaltu **opna nýtt spjall**: gamla spjallið man það sem var afturkallað. Skrifaðu *áfram* í nýja spjallinu og ýttu síðan á **Ég opnaði nýtt spjall** í Vistunum.

### 3.9 Fundir: að hætta og koma aftur

Hættu hvenær sem þú vilt: *[Hættum hér í kvöld.]* Allt er nú þegar vistað í skránum. Til að koma aftur skaltu ræsa forritið þitt í herferðarmöppunni og skrifa *áfram*: sögumaðurinn gefur þér stutta upprifjun og heldur áfram.

### 3.10 Skap sögumannsins

Vélmennið efst á stjórnborðinu er sögumaðurinn: andlitið fylgir tóni sögunnar og gefur aldrei upp það sem þú veist ekki enn. Þegar spjallið er lokað sefur það.

### 3.11 Myndir

RPG Engine getur látið gera myndir af stöðunum sem þú kemur til, verkefnunum sem þú tekur að þér og þeim sem þú hittir, eins og **myndastillingin** segir til um, og andlitsmynd af persónunni þinni þegar þú biður um það. Það notar það sem er í tölvunni þinni, með þinni eigin innskráningu: **Codex** málar þær, annars teiknar **Claude Code** þær. **Stillingar** segja hvort þessi tölva getur búið þær til og hvernig á að setja það upp ef ekki. Þú getur alltaf gefið sögumanninum þína eigin mynd.

### 3.12 Öryggi: línur, slæður og stopp

**Línur** birtast aldrei í leiknum. **Slæður** gerast aðeins utan sviðs. Hvenær sem er geturðu skrifað *[stopp]*: sögumaðurinn sleppir því efni strax og bætir því við línurnar þínar.

### 3.13 Að skipta um skoðun

Allar stillingar má breyta, í spjallinu eða í **Stillingum**. Úrskurður sem sögumaðurinn gefur án reglubókarinnar verður að **fordæmi**, þannig að sama spurning fær sama svar næst.

---

## 4. Stjórnborðið <!-- icon: party -->

Síða á þinni eigin tölvu, opin aðeins í vafra þeirrar tölvu og virk meðan spjallið er opið. Þegar spjallinu er lokað sýnir hún *Not connected*. Hún kemur aftur af sjálfu sér með næsta spjalli.

- **Hópur**: persónublaðið þitt og félaga þinna. Smelltu á tölu til að kasta henni. Haltu bendlinum yfir henni til að sjá hvaðan hún kemur. Við hliðina eru köstin.
- **Atriði**: hvar þú ert, mynd þess og kort, hver er þar og hvað er að gerast. Í bardaga, raðirnar og spjald persónunnar þinnar.
- **Dagbók**: verkefni, sagan og minnisblöðin þín.
- **Heimur**: heimskortið eins og persónan þín þekkir það.
- **Teningabakkinn**: veldu teninga og breyti og kastaðu.
- **Vistanir**, **Hjálp**, **Stillingar** og **Um**, sem tákn aftast í röðinni. Stillingar geyma líka eigin kjörstillingar síðunnar: þema, teningahljóð, teningasett.

Þegar sögumaðurinn spyr þig einhvers helst borðinn hans efst, sama í hvaða hluta þú ert.

---

## 5. Leikjakerfi og húsreglur <!-- icon: dice -->

### 5.1 Hvað leikjakerfi er

Gögn eins leiks: persónublað hans, tölur, verur, hlutir, galdrar og reglutexti. Hver herferð spilar eitt kerfi. RPG Engine reiknar út persónublaðið og það sem er eytt og það sem kemur aftur. Hvernig eiginleiki virkar les sögumaðurinn í reglunum og ákveður, eins og við borðið.

### 5.2 Fimmta útgáfa, innifalin

Kynþættirnir, flokkarnir, undirflokkarnir, bakgrunnur og hæfileiki (feat) úr SRD 5.1; galdrarnir 319, vopnin, brynjurnar, töfragripirnir og skrímslin; reglukaflarnir, sem sögumaðurinn les eftir nákvæmum texta þeirra; allt persónublaðið, útreiknað.

Þú getur líka spilað efni sem vantar í SRD, úr bók sem þú átt: sögumaðurinn skrifar það sem síður í herferðinni þinni og RPG Engine meðhöndlar þær eins og sínar eigin. RPG Engine fylgir aðeins opið efni. Þekking sögumannsins er ekki takmörkuð við það.

Þínar eigin handbækur geta orðið bókasafnið þitt. Segðu sögumanninum hvar þær eru: *[Handbækurnar mínar eru í D:\Books\5e.]*, eða bættu möppunni þeirra við í Packages › Library og segðu já í glugganum sem tölvan sýnir, í eitt skipti. RPG Engine les þær á þessari tölvu. Hver herferð notar möppurnar sem þú kveikir á þar, og sögumaðurinn leitar í þeim þegar hann ákveður reglu, á eftir SRD, og vísar í bókina og blaðsíðuna. Þær lesast best sem texti eða sem PDF-skjöl þar sem hægt er að velja textann. PDF-skjal sem er skannað er lesið úr myndum af síðunum, aðeins á Windows, á nokkrum mínútum og með nokkrum villum. RPG Engine breytir aldrei handbókunum þínum, sendir texta þeirra aldrei neitt og afritar hann aldrei inn í herferð.

### 5.3 Húsreglur og þínar eigin viðbætur

Biddu sögumanninn: *[Húsregla: náttúrulegur 1 í árás þýðir að þú missir vopnið.]* Sögumaðurinn geymir hana sem samkomulag borðsins, eða skrifar síðu eða tölu á persónublaðið þegar þess þarf. Húsreglur sem þegar eru skrifaðar má setja sem textaskrár í `rules` möppu herferðarinnar.

### 5.4 Að bæta við eða flytja inn eigið leikjakerfi

Ekki enn: í dag spilar RPG Engine aðeins fimmtu útgáfu ([Væntanlegt síðar](#9-coming-later)).

---

## 6. Viðbætur <!-- icon: plus -->

Ekki enn. Viðbót mun bæta einhverju við herferð ofan á leikjakerfið hennar: heimi, ævintýri, eiginleika eins og veðri, húsreglum til að deila.

---

## 7. Hvaðan herferð kemur og tungumál hennar <!-- icon: world -->

### 7.1 Þrjár leiðir til að fá heim

- **Búinn til jafnóðum**: út frá forsendu þinni byggir sögumaðurinn hvern stað, hverja persónu og hvern söguþráð rétt áður en þú þarft á því að halda, og geymir það.
- **Undirbúinn í upphafi**: það sama, en heimurinn er byggður áður en spilun hefst.
- **Úr þinni eigin ævintýrabók eða bók**: gefðu sögumanninum skrána, *[Fluttu þetta ævintýri inn sem herferðina okkar: D:\Books\adventure.pdf. Segðu mér ekkert af því sem stendur í því.]* Það les best sem texti, EPUB, Word-skjal eða PDF-skrá þar sem hægt er að velja textann. Skönnuð PDF-skrá er lesin út frá myndum af síðunum, aðeins á Windows, hægt og með nokkrum villum. Codex eða Claude Code á tölvunni þinni les það utan spjallsins og stjórnborðið sýnir hve langt það er komið. Úr skáldsögu leggur sögumaðurinn til hvar á að byrja. Hann skrifar staðina, persónurnar og leyndarmálin.

Herferð er spiluð einu sinni: til að spila sama ævintýri aftur skaltu búa til nýja herferð.

### 7.2 Tungumál

Eitt tungumál í hverri herferð, tungumál sögumannsins, og stjórnborðið fylgir því. Stjórnborðið kemur á 26 tungumálum. Öll önnur eru þýdd á tölvunni þinni af Codex eða Claude Code, eða, án þeirra, af sögumanninum í spjallinu. Hugtök fimmtu útgáfu á ítölsku koma úr opinberu ítölsku SRD-skránni. Reglutextinn helst á ensku og sögumaðurinn segir hann á þínu tungumáli.

---

## 8. Fyrir forvitna: herferðarmappan <!-- icon: list -->

Þú þarft aldrei að opna hana og hún geymir leyndarmál herferðarinnar þinnar. Í henni eru `campaign.yaml` (stillingarnar þínar), `state.yaml` (hvernig leikurinn stendur), `world/` (ein markdown-síða fyrir hverja persónu, hvern stað, hvert verkefni og allt annað), `rules/` (húsreglurnar þínar), `images/`, `log.jsonl` (sérhver breyting), `.saves/`, `.player/` (minnisblöðin þín) og litlu skrárnar sem segja gervigreindarfulltrúum hvar RPG Engine er. Síðurnar nota snið Obsidian. Ef þú breytir síðu með höndunum frétt sögumaðurinn af því í næsta svari sínu.

RPG Engine heldur sig í þessari möppu: það les og skrifar leikinn aðeins þar og snertir aldrei aðrar skrár þínar. Möppur handbókanna þinna les það aðeins. Utan hennar geymir það aðeins eigin gagnamöppur (þýðingar stjórnborðsins, textann sem það las úr handbókunum þínum, og Codex eða Claude Code ef þú leyfir því að setja þau upp) og tímabundnar möppur meðan mynd er teiknuð. Allt annað sem fulltrúinn vill gera á tölvunni þinni spyr hann þig um fyrst.

Sérhverja skipun sem sögumaðurinn notar er líka hægt að keyra í herferðarmöppunni: `rpg --help` listar þær. Margar prenta leyndarmál herferðarinnar.

---

## 9. Væntanlegt síðar <!-- icon: hourglass -->

- **Þú sem sögumaður**, með gervigreindina í hlutverki hópsins.
- **Höfundarhamur**: skrifaðu ævintýri með gervigreindinni, fluttu það svo út og deildu því.
- **Margir spilarar á sömu tölvu**, hver með sína persónu, til skiptis í sama spjalli.
- **Viðbætur**: stillingar, ævintýri, eiginleikar og húsreglur.
- **Aðrir leikir**: fleiri leikjakerfi og þín eigin.

---

## 10. Spurningar og vandamál <!-- icon: info -->

### Spurningar

**Þarf ég að kunna reglurnar?** Nei. Veldu leiðbeinanda í kennsluham og spurðu innan hornklofa hvenær sem er.

**Getur sögumaðurinn svindlað?** Hann getur ekki breytt kasti sem RPG Engine gerði, nema á erfiðleikastiginu saga, né staðreyndum sem þegar eru festar.

**Kostar þetta eitthvað?** RPG Engine er ókeypis. Sögumaðurinn keyrir á áskrift forritsins þíns, eða á þinni eigin tölvu með staðbundnu líkani. Kvöld í spilun er langt spjall: á minnstu áskriftunum gætirðu náð hámarki áskriftarinnar áður en kvöldið er á enda. Myndir og þýðingar nota sömu áskrift.

**Get ég spilað í símanum?** Nei: sögumaðurinn keyrir á tölvunni þinni og mælaborðið opnast aðeins þar.

**Get ég spilað með vinum?** Ekki enn: í dag einn spilari, ein persóna, auk félaga ([Væntanlegt](#9-coming-later)).

**Get ég notað aðra gervigreind næst?** Já: opnaðu herferðina í öðru forriti og skrifaðu *haltu áfram*.

### Vandamál

**Mælaborðið opnast ekki.** Spurðu sögumanninn: `[Hver er tengillinn á mælaborðið?]`. Það virkar aðeins á meðan spjall er opið í þeirri herferð, eftir fyrsta svar sögumannsins.

**Sögumaðurinn virðist ekki þekkja leikinn.** Forritið þitt hlóð ekki RPG Engine. Athugaðu að þú ræstir það í herferðarmöppunni og treystir henni. Í Claude Code skaltu skrifa `/mcp` og tengja `rpg` aftur. Í Codex verður `codex mcp list` í herferðarmöppunni að sýna `rpg`. Ef `rpg --version` finnst ekki skaltu setja RPG Engine upp aftur ([2.2](#22-install)).

**Uppfærsla.** Keyrðu `npm install -g rpg-engine` aftur og opnaðu svo nýtt spjall: sögumaður sem er í gangi heldur útgáfunni sem hann byrjaði með.

**Sögumaðurinn man eitthvað sem ég afturkallaði.** Opnaðu nýtt spjall og ýttu á **Ég opnaði nýtt spjall** í Vistanir.

**Engar myndir birtast.** Stillingar > Myndir segir hvort þessi tölva getur gert þær og hvernig.

**Uppsetning mistekst, eða `rpg` ræsist ekki.** `node --version` verður að segja 22 eða nýrra. Á Windows skaltu forðast slóðir sem innihalda `&` fyrir RPG Engine og herferðirnar þínar.

**Tengill mælaborðsins breyttist.** Annað forrit tók venjulega vistfangið; sögumaðurinn gefur þér nýja tengilinn.
