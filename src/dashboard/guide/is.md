<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
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
- **Node.js 22** eða nýrra, frá [nodejs.org](https://nodejs.org). Því fylgir `npm`, sem setur RPG Engine upp.
- **Skipanaglugga**: á Windows Terminal eða PowerShell; á macOS Terminal. Til að opna hann í möppu skaltu hægrismella á möppuna og velja **Open in Terminal** (Windows) eða **Services > New Terminal at Folder** (macOS).
- **Gervigreindarforrit** fyrir sögumanninn ([2.4](#24-connect-your-ai)), með **stærsta líkaninu** sem það býður: minna líkan er auðveldara að tala til að ljóstra upp leyndarmálum eða víkja frá reglunum.

### 2.2 Uppsetning

```text
npm install -g rpg-engine
```

`rpg --version` athugar hvort þetta tókst. Þú notar `rpg` einu sinni fyrir hverja herferð, til að búa hana til; eftir það ræsir gervigreindarforritið þitt RPG Engine sjálft.

### 2.3 Að búa til herferð

Opnaðu skipanaglugga í möppunni þar sem þú geymir leikina þína ([2.1](#21-what-you-need) segir hvernig):

```text
rpg init "The Salt Isles"
```

Þetta býr til möppuna `The Salt Isles` með nýrri herferð; farðu inn í hana með `cd "The Salt Isles"`. Mundu hvar hún er: þú kemur aftur í hana í hvert sinn sem þú spilar. Allt annað velurðu síðar, í spjallinu eða á mælaborðinu; `rpg init --help` sýnir valkostina til að velja eitthvað strax, til dæmis `--language it` eða `--difficulty hard`.

Sögumaðurinn getur ekki búið til herferð fyrir þig: fyrir `init` segir ekkert gervigreindarforritinu þínu hvar RPG Engine er.

### 2.4 Tengdu gervigreindina þína

Sögumaðurinn keyrir í **gervigreindarforriti**: gervigreindarappi, í skipanaglugga eða á skjáborði, sem getur unnið með skrárnar á tölvunni þinni, eins og Claude Code eða Codex. Venjulegt spjall eins og claude.ai eða ChatGPT, eða símaapp, dugar ekki: sögumaðurinn þarf að komast í skrár herferðarinnar á tölvunni þinni. Hvert forrit þarf sína eigin áskrift og innskráningu: Claude Code þarf greidda Claude-áskrift, Codex ChatGPT-innskráningu. Þú setur það upp einu sinni, frá þess eigin síðu: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skrifaðu `claude` í herferðarmöppunni. Þegar það spyr hvort þú treystir möppunni skaltu velja **Yes, I trust this folder**; farðu varlega, svarið sem er valið fyrirfram er *No, exit*.
- **Codex**: skrifaðu `codex` í herferðarmöppunni og segðu já þegar það spyr hvort þú treystir möppunni. Í skjáborðsforritinu skaltu athuga í stillingunum að minni sé slökkt fyrir spjöll leiksins.
- **Annað forrit**: ræstu það í herferðarmöppunni og gefðu því MCP-þjóninn `rpg mcp`. RPG Engine er hefðbundinn MCP-þjónn: hvaða forrit sem styður MCP getur verið sögumaður, líka staðbundin.

Við spilum og prófum með **Claude Code**; **Codex** er tengt og athugað, en engin heil herferð hefur enn verið spiluð með því; `init` setur líka upp **Gemini CLI**. Herferðin slekkur á eigin minni forritsins: leikurinn lifir í skránum þess, svo að það að fara aftur í vistun fari í raun aftur.

### 2.5 Fyrsta spjallið

Skrifaðu hvað sem er, til dæmis *Hæ! Byrjum.* Í fyrsta svari hvers spjalls gefur sögumaðurinn þér **tengilinn á mælaborðið þitt**, eitthvað á borð við `http://127.0.0.1:4750`: opnaðu hann og hafðu hann við hliðina á spjallinu.

Á milli skilaboða sögumannsins sýnir forritið þitt verkfærin sem það notar: opnaðu ekki nánari upplýsingar þeirra (í Claude Code ctrl+o), þær geta sýnt leyndarmál.

Ný herferð fer í gegnum þrjú stig, sýnd efst á mælaborðinu: **1 Stillingar** (hvernig þú vilt spila), **2 Núllti fundur** (þú býrð til persónuna þína, í spilun), **3 Spilun**.

### 2.6 Stillingar: hvernig þú spilar

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu; skrefið **Stillingar** á mælaborðinu sýnir sömu spurningar sem spjöld. Skrifaðu „þú ákveður“ og sögumaðurinn velur. Allt má breyta síðar, í spjallinu eða í **Stillingar**.

| Stilling | Hvað hún ákveður | Gildi |
|---|---|---|
| **Leiðbeinandi** | Hve mikið sögumaðurinn kennir þér reglurnar | slökkt, ábendingar, kennsla |
| **Erfiðleikastig** | Hve erfiður heimurinn er | saga, auðvelt, venjulegt, erfitt, grimmt |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | frásögn (aldrei dauði), hetjusaga (aðeins þegar það skiptir máli), teningar |
| **Vistanir** | Hvenær þú mátt fara aftur | varanlegur dauði, varðpunktur, frjálst ([3.8](#38-saves-and-going-back)) |
| **Strangleiki** | Hve nákvæmlega matur, ljós og ferðalög fylgja reglunum | létt, reglur, hermun |
| **Teningar** | Hver kastar teningunum þínum | stafrænir, raunverulegir |
| **Mælieiningar** | Vegalengdir og þyngd | metrakerfi, breskar einingar |
| **Félagar** | Hver ferðast með þér | engir, gerðir með þér, gerðir af sögumanni, hitt í spilun |
| **Myndir** | Myndir af stöðum, verkefnum og þeim sem þú hittir | engar, að beiðni, nýir staðir, verkefni og þau sem þú hittir ([3.11](#311-pictures)) |
| **Línur** og **Slæður** | Það sem birtist aldrei og það sem gerist aðeins utan sviðs | listar |
| **Tungumál** | Tungumál leiksins og mælaborðsins | hvaða sem er |

Fimmta útgáfa bætir við **framvindu**: reynslustigum eða áfanga.

Ef enginn heimur er skrifaður spyr sögumaðurinn líka um **söguforsendu** (tegund, tón og nokkur atriði, með þínum orðum) og **undirbúning**: að byggja heiminn jafnóðum, eftir því sem líður á, eða allan í byrjun.

**Stíll sögumanns** er aldrei spurt um, en þú getur breytt honum í spjallinu eða í **Stillingar**: **textann** (einfaldur, bókmenntalegur, reyfarastíll, kímilegur), **sögurnar** sem hann býr til (aðstæður, söguþræðir, þættir, ráðgáta), höfund til að **skrifa eins og**, eða hvað annað sem er **með þínum orðum**.

### 2.7 Núllti fundur: persónan þín

Þú býrð til persónuna þína með sögumanninum, eins og við borð. Hvert val er þitt, nema þú biðjir sögumanninn að velja: komdu með fullmótaða hugmynd, óljósa eða enga. Sögumaðurinn segir þér hvernig eiginleikastig eru ákvörðuð áður en nokkrum teningi er kastað. Saga þín er aldrei skylda; ef þú gefur hana skrifar sögumaðurinn hana með þínum orðum. Síðan biður sögumaðurinn um mynd af persónunni þinni ([3.7](#37-your-characters-story-and-picture)). RPG Engine reiknar persónublaðið: þú þarft aldrei að reikna sjálf/ur.

---

## 3. Spilun <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum:

> Ég spyr gestgjafann hver fleiri hafi komið hér í kvöld.

Utan sögunnar skaltu skrifa innan hornklofa: *[Hvernig virkar glíma?]* Sögumaðurinn svarar líka innan hornklofa.

Þú segir hvað þú reynir; sögumaðurinn segir hvað gerist. Sögumaðurinn ákveður aldrei neitt fyrir persónuna þína og talar aldrei um vélina. Þú getur spurt hann hvernig á að nota mælaborðið.

### 3.2 Köst

Sögumaðurinn biður um kast aðeins þegar útkoman er óviss og skiptir máli, og segir fyrst hvað er í húfi. Síðan:

- **Á mælaborðinu** sýnir borði hnapp fyrir hvert próf, til dæmis *Acrobatics +4 · with advantage*. Smelltu á hann: teningarnir falla á síðunni og sögumaðurinn fær útkomuna. Þú getur líka smellt á línuna á persónublaðinu sem lýsist upp, kastað teningunum úr bakkanum eða skrifað eitthvað annað í borðann.
- **Handvirkt**, í horni borðans eða í **Stillingar**: borðinn segir þér hverju á að kasta og þú kastar því af persónublaðinu eða úr bakkanum.
- **Raunverulegir teningar**, þegar teningastillingin er á raunverulegum: þú skrifar hliðarnar sem þú kastaðir, *[Ég kastaði 14.]*, og RPG Engine bætir við breytunum þínum.

**Frjáls köst**: smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu bakkann, til að kasta að gamni. Þau telja aldrei og sögumaðurinn sér þau aldrei.

**Köst sögumannsins** birtast í kastdálknum þínum, nema þau leynilegu. Þú getur alltaf spurt *[Var þetta kast raunverulegt?]*: fyrir leynilegt kast gefur sögumaðurinn fingrafar sem sannar að það var gert áður en þú spurðir.

### 3.3 Atriði og bardagar

Sagan gengur í **atriðum**: bardaga, samtali, könnun, ferðalagi, hvíld. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í dagbókina þína.

Í bardaga segir sögumaðurinn frá hverri röð sem er ekki þín og stoppar þar sem þú getur ákveðið. Hlutinn **Bardagi** sýnir röð raðanna, lífspunkta hópsins þíns og hve særðir óvinirnir virðast, í orðum. Ef persónan þín fellur birtast dauðavistanir stórar á síðunni.

### 3.4 Tími, ferðalög og heimurinn sem hreyfist

RPG Engine heldur utan um dagsetninguna; enginn tími líður milli funda. Segðu að þið hvílist, *Við tökum langa hvíld*, og hvíldin skilar því sem hún á að skila. Segðu hvert þið farið, *Við förum veginn norður til Rocca*, og RPG Engine reiknar leiðina, vegalengdina og dagana og stoppar þegar eitthvað gerist á leiðinni. Peningar eru taldir í mynt leiksins, með skiptimynt.

Illmenni hafa áætlanir með tímamörkum. Hvern nýjan dag færir sögumaðurinn þær ógnir sem tíminn hefur fært nær, og þú sérð merki þeirra, aldrei klukkuna sjálfa.

### 3.5 Kort

**Heimur** sýnir staðina sem persónan þín þekkir, vegina á milli þeirra og slóðina sem þú gekkst, með þoku yfir restinni. **Atriði** sýnir kortið af staðnum þar sem þú ert, þegar það er til, og hver stendur hvar; í bardaga, í þinni röð, eru reitirnir sem þú nærð ekki til huldir slæðu. Þegar sögumaðurinn spyr hvert þú færir þig skaltu snerta reit eða skrifa hann, til dæmis *E4*.

### 3.6 Verkefni, dagbók og minnisblöð

Verkefni sem persónan þín tekur að sér verður að verkefni í **Dagbók**, með markmiðum sínum, tímamörkum og því sem það mælir; merktu það með stjörnu til að hafa það í sýn efst í Atriði. Dagbókin segir líka **söguna** þína, atriði fyrir atriði, og geymir **minnisblöðin** þín: einkamál, nema þú veljir að **Deila** einu, og þá heyrir sögumaðurinn það sem það sem þú hugsar, aldrei sem staðreynd.

### 3.7 Saga og mynd persónunnar

Á persónublaðinu er í spjaldinu **Lýsing** reitur fyrir sögu persónunnar þinnar: sögumaðurinn skrifar hana þar inn eftir að þú segir já. Fyrir mynd skaltu gefa sögumanninum skrá (PNG, JPEG, WebP eða SVG, allt að 5 MB) og segja hvar hún er á tölvunni þinni, eða láta gera andlitsmynd ([3.11](#311-pictures)): *[Gerðu andlitsmynd af mér: grátt hár í fléttu, ör á hökunni.]*

### 3.8 Vistanir og að fara aftur

RPG Engine vistar alla herferðina í lok hvers atriðis. Stillingin **vistanir** ákveður restina:

| Vistanir | Vista þegar þú vilt | Fara aftur |
|---|---|---|
| **varanlegur dauði** | nei | aldrei |
| **varðpunktur** | nei | í síðustu vistun, aðeins þegar persónan þín deyr |
| **frjálst** | já | í hvaða vistun sem er |

Í öllum stillingum geturðu **byrjað upp á nýtt**, frá upphafi spilunar eða frá núllta fundi. Gerðu það í spjallinu eða í **Vistanir**.

Eftir að hafa farið aftur skaltu **opna nýtt spjall**: gamla spjallið man það sem var afturkallað. Skrifaðu *haltu áfram* í nýja spjallinu og ýttu svo á **Ég opnaði nýtt spjall** í Vistanir.

### 3.9 Fundir: að hætta og koma aftur

Hættu hvenær sem þú vilt: *[Hættum hér í kvöld.]* Allt er þegar vistað í skránum. Til að koma aftur skaltu ræsa forritið í herferðarmöppunni og skrifa *haltu áfram*: sögumaðurinn gefur þér stutt yfirlit og heldur áfram.

### 3.10 Skap sögumannsins

Vélmennið efst á mælaborðinu er sögumaðurinn: andlit þess fylgir tóni sögunnar og ljóstrar aldrei upp því sem þú veist ekki enn. Þegar spjallinu er lokað sefur það.

### 3.11 Myndir

RPG Engine getur látið gera myndir af stöðunum sem þú kemur á, verkefnunum sem þú tekur að þér og þeim sem þú hittir, eins og stillingin **Myndir** segir til um, og andlitsmynd af persónunni þinni þegar þú biður um það. Það notar það sem er á tölvunni þinni, með þinni eigin innskráningu: **Codex** málar þær, annars teiknar **Claude Code** þær. **Stillingar** segja hvort þessi tölva getur gert þær og hvernig á að setja það upp ef ekki. Þú getur alltaf gefið sögumanninum þína eigin mynd.

### 3.12 Öryggi: línur, slæður og stopp

**Línur** birtast aldrei í leiknum; **slæður** gerast aðeins utan sviðs. Hvenær sem er geturðu skrifað *[stopp]*: sögumaðurinn sleppir því efni strax og bætir því við línurnar þínar.

### 3.13 Að skipta um skoðun

Allar stillingar má breyta, í spjallinu eða í **Stillingar**. Úrskurður sem sögumaðurinn fellir án bókarinnar verður að **fordæmi**, svo að sama spurning fái sama svar næst.

---

## 4. Mælaborðið <!-- icon: party -->

Síða á þinni eigin tölvu, aðeins opin í vafra þeirrar tölvu og lifandi á meðan spjallið er opið. Þegar spjallinu er lokað sýnir hún *Not connected*; hún kemur aftur sjálf með næsta spjalli.

- **Hópur**: persónublaðið þitt og blöð félaganna. Smelltu á tölu til að kasta henni; haltu bendlinum yfir henni til að sjá hvaðan hún kemur. Við hliðina eru köstin.
- **Atriði**: hvar þú ert, mynd þess og kort, hver er þar, hvað er að gerast.
- **Bardagi**: aðeins í bardaga: raðirnar, bardagafólkið, það sem þú hefur við höndina.
- **Dagbók**: verkefni, sagan, minnisblöðin þín.
- **Heimur**: heimskortið eins og persónan þín þekkir það.
- **Teningabakkinn**: veldu teninga og breyti og kastaðu.
- **Vistanir**, **Hjálp**, **Stillingar** og **Um**, sem tákn aftast í röðinni. Stillingar geyma líka eigin óskir síðunnar: þema, teningahljóð, teningasett.

Þegar sögumaðurinn spyr þig að einhverju helst borði hans efst, í hvaða hluta sem þú ert.

---

## 5. Leikjakerfi og húsreglur <!-- icon: dice -->

### 5.1 Hvað leikjakerfi er

Gögn eins leiks: persónublað hans, tölur, skepnur, hlutir, galdrar og reglutexti. Hver herferð spilar eitt kerfi. RPG Engine reiknar persónublaðið og hvað er eytt og hvað kemur aftur; hvernig eiginleiki virkar les sögumaðurinn í reglunum og ákveður, eins og við borð.

### 5.2 Fimmta útgáfa, innifalin

Kynþættir, starfsstéttir, undirstéttir, bakgrunnur og hæfileiki úr SRD 5.1; galdrarnir 319, vopnin, brynjurnar, töfrahlutirnir og skrímslin; reglukaflarnir, sem sögumaðurinn les eftir nákvæmum texta þeirra; fullt persónublað, reiknað.

Þú getur líka spilað efni sem vantar í SRD, úr bók sem þú átt: sögumaðurinn skrifar það sem síður herferðarinnar og RPG Engine meðhöndlar þær eins og sínar eigin. RPG Engine fylgir aðeins opið efni; þekking sögumannsins er ekki takmörkuð.

### 5.3 Húsreglur og eigin viðbætur

Biddu sögumanninn: *[Húsregla: náttúrulegur 1 í árás þýðir að þú missir vopnið.]* Hann geymir hana sem samkomulag borðsins, eða skrifar síðu eða tölu á persónublaðið þegar þarf. Húsreglur sem þegar eru skrifaðar má setja sem textaskrár í möppuna `rules` í herferðinni.

### 5.4 Að bæta við eða flytja inn eigið leikjakerfi

Ekki enn: í dag spilar RPG Engine aðeins fimmtu útgáfu ([Væntanlegt](#9-coming-later)).

---

## 6. Viðbætur <!-- icon: plus -->

Ekki enn. Viðbót mun bæta einhverju við herferð ofan á leikjakerfið hennar: heimi, ævintýri, eiginleika eins og veðri, húsreglum til að deila.

---

## 7. Hvaðan herferð kemur og tungumál hennar <!-- icon: world -->

### 7.1 Þrjár leiðir til að eignast heim

- **Gerður jafnóðum**: út frá söguforsendu þinni býr sögumaðurinn til hvern stað, hverja persónu og hvern söguþráð rétt áður en þú þarft á þeim að halda og geymir það.
- **Undirbúinn í byrjun**: það sama, með heiminn byggðan fyrir spilun.
- **Úr þínu eigin ævintýri**: gefðu sögumanninum texta eða PDF og biddu hann að setja það upp, *[Settu þetta ævintýri upp sem herferðina okkar. Segðu mér ekkert af því sem í því er.]* Hann skrifar staðina, persónurnar og leyndarmálin. Enn er enginn innflutningshnappur.

Herferð er spiluð einu sinni: til að spila sama ævintýri aftur skaltu búa til nýja herferð.

### 7.2 Tungumál

Eitt tungumál á herferð, tungumál sögumannsins, sem mælaborðið fylgir. Mælaborðið kemur með 26 tungumálum. Hvert annað er þýtt á tölvunni þinni af Codex eða Claude Code, eða, án þeirra, af sögumanninum í spjallinu. Hugtök fimmtu útgáfu á ítölsku koma úr opinberu ítölsku SRD; reglutextinn helst á ensku og sögumaðurinn segir hann á þínu tungumáli.

---

## 8. Fyrir forvitna: herferðarmappan <!-- icon: list -->

Þú þarft aldrei að opna hana og hún geymir leyndarmál herferðarinnar þinnar. Í henni eru `campaign.yaml` (stillingarnar þínar), `state.yaml` (hvar leikurinn stendur), `world/` (ein markdown-síða fyrir hverja persónu, stað, verkefni og annað), `rules/` (húsreglurnar þínar), `images/`, `log.jsonl` (hver breyting), `.saves/`, `.player/` (minnisblöðin þín) og litlu skrárnar sem segja gervigreindarforritum hvar RPG Engine er. Síðurnar nota snið Obsidian. Ef þú breytir síðu í höndunum heyrir sögumaðurinn af því í næsta svari sínu.

Hverja skipun sem sögumaðurinn notar má líka keyra í herferðarmöppunni: `rpg --help` listar þær. Margar prenta leyndarmál herferðarinnar.

---

## 9. Væntanlegt <!-- icon: hourglass -->

- **Þú sem sögumaður**, með gervigreindina í hlutverki hópsins.
- **Höfundarhamur**: skrifaðu ævintýri með gervigreindinni, fluttu það svo út og deildu því.
- **Margir spilarar á sömu tölvu**, hver með sína persónu, til skiptis í sama spjalli.
- **Viðbætur**: stillingar, ævintýri, eiginleikar og húsreglur.
- **Innflutningur** á handbókum þínum og ævintýrum.
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
