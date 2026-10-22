<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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
- **Node.js 22** eða nýrra, frá [nodejs.org](https://nodejs.org). Með því fylgir `npm`, sem setur RPG Engine upp.
- **Skipanaglugga**: í Windows er það Terminal eða PowerShell, í macOS Terminal. Til að opna hann í möppu hægrismellirðu á möppuna og velur **Opna í Terminal** (Windows) eða **Þjónustur > Nýtt Terminal í möppu** (macOS).
- **gervigreindarforrit** fyrir sögumanninn ([2.4](#24-connect-your-ai)) með **stærsta líkaninu** sem það býður: auðveldara er að tala lítið líkan inn á að ljóstra upp leyndarmálum eða beygja reglurnar.

### 2.2 Uppsetning

```text
npm install -g rpg-engine
```

`rpg --version` sýnir hvort þetta tókst. Þú notar `rpg` einu sinni fyrir hverja herferð, til að búa hana til. Eftir það ræsir gervigreindarforritið þitt RPG Engine sjálft.

### 2.3 Herferð búin til

Opnaðu skipanaglugga í möppunni þar sem þú geymir leikina þína ([2.1](#21-what-you-need) segir hvernig):

```text
rpg init "The Salt Isles"
```

Þetta býr til möppuna `The Salt Isles` með nýrri herferð. Farðu inn í hana með `cd "The Salt Isles"`. Mundu hvar hún er, því þú kemur aftur í hana í hvert sinn sem þú spilar. Allt annað velurðu síðar, í spjallinu eða á mælaborðinu. `rpg init --help` sýnir valkostina ef þú vilt velja eitthvað strax, til dæmis `--language it` eða `--difficulty hard`.

Sögumaðurinn getur ekki búið herferðina til fyrir þig: áður en `init` er keyrt veit gervigreindarforritið þitt ekki hvar RPG Engine er.

### 2.4 Gervigreindin tengd

Sögumaðurinn keyrir í **gervigreindarforriti**: forriti, í skipanaglugga eða á skjáborði, sem getur unnið með skrárnar á tölvunni þinni, eins og Claude Code eða Codex. Venjulegt spjall eins og claude.ai eða ChatGPT, eða símaforrit, dugar ekki: sögumaðurinn þarf aðgang að skrám herferðarinnar á tölvunni þinni. Hvert forrit þarf sína eigin áskrift og innskráningu: Claude Code þarf greidda Claude-áskrift, Codex innskráningu í ChatGPT. Þú setur forritið upp einu sinni, af síðu þess: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skrifaðu `claude` í möppu herferðarinnar. Þegar það spyr hvort þú treystir möppunni velurðu **Yes, I trust this folder**. Farðu varlega: svarið sem er valið fyrirfram er *No, exit*. Herferðin hefur líka lítinn krók, `rpg --listen`, sem spurningin sýnir ekki: hann lætur sögumanninn vita strax þegar þú gerir eitthvað á mælaborðinu.
- **Codex**: skrifaðu `codex` í möppu herferðarinnar og svaraðu já þegar það spyr hvort þú treystir möppunni. Í skjáborðsforritinu skaltu athuga í stillingunum að minni sé slökkt fyrir spjöll leiksins.
- **Annað forrit**: ræstu það í möppu herferðarinnar og gefðu því MCP-þjóninn `rpg mcp`. RPG Engine er hefðbundinn MCP-þjónn: hvaða forrit sem styður MCP getur verið sögumaður, líka staðbundin.

Við spilum og prófum með **Claude Code**. **Codex** er tengt og athugað, en engin heil herferð hefur enn verið spiluð með því. Herferðin slekkur á eigin minni forritsins: leikurinn lifir í skránum þess, svo að það að fara aftur í vistun fari raunverulega aftur.

### 2.5 Fyrsta spjallið

Skrifaðu hvað sem er, til dæmis *Hæ! Byrjum.* Í fyrsta svari hvers spjalls gefur sögumaðurinn þér **hlekkinn á mælaborðið þitt**, eitthvað á borð við `http://127.0.0.1:4750`. Opnaðu hann og hafðu hann við hliðina á spjallinu.

Milli skilaboða sögumannsins sýnir forritið þitt verkfærin sem það notar. Ekki opna upplýsingar um þau (í Claude Code er það ctrl+o), því þær geta sýnt leyndarmál.

Ný herferð fer í gegnum þrjú stig, sem sjást efst á mælaborðinu: **1 Stillingar** (hvernig þú vilt spila), **2 Núllti fundur** (þú býrð til persónuna þína, í leiknum), **3 Leikur**.

### 2.6 Stillingar: hvernig þú spilar

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu. Skrefið **Stillingar** á mælaborðinu sýnir sömu spurningar sem spjöld. Skrifaðu „þú ræður“ og sögumaðurinn velur. Allt má breyta síðar, í spjallinu eða í **Stillingar**.

| Stilling | Hvað hún ákveður | Gildi |
|---|---|---|
| **Leiðbeinandi** | Hversu mikið sögumaðurinn kennir þér reglurnar | slökkt, ábendingar, kennsla |
| **Erfiðleikastig** | Hversu erfiður heimurinn er | saga, auðvelt, venjulegt, erfitt, miskunnarlaust |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | frásögn (enginn deyr), epískt (aðeins þegar það skiptir máli), teningar |
| **Vistanir** | Hvenær þú mátt fara til baka | varanlegur dauði, vistunarpunktur, laust ([3.8](#38-saves-and-going-back)) |
| **Strangleiki** | Hversu nákvæmlega matur, ljós og ferðalög fylgja reglunum | mjúkt, reglur, hermun |
| **Teningar** | Hver kastar teningunum þínum | stafrænir, eðlilegir |
| **Mælieiningar** | Vegalengdir og þyngd | metrakerfi, breskar einingar |
| **Raddir** | Hver talar fyrir persónurnar sem þú hittir: á lykilaugnablikum persónan sjálf, sem veit aðeins það sem hún veit, eins og sögumaðurinn velur; sögumaðurinn alltaf; eða alltaf persónan sjálf, fyrir helstu persónur eða allar, hægara og dýrara, þar sem gervigreindarforritið þitt getur það | sjálfvirkt, sögumaður, mikilvægar, alltaf |
| **Félagar** | Hver ferðast með þér | enginn, búnir til með þér, búnir til af sögumanni, hitta í leiknum |
| **Myndir** | Myndir af stöðum, verkefnum og þeim sem þú hittir | engar, ef beðið er um, nýir staðir, verkefni og þeir sem þú hittir ([3.11](#311-pictures)) |
| **Línur** og **Slæður** | Hvað birtist aldrei og hvað gerist aðeins utan sviðs | listar |
| **Tungumál** | Tungumál leiksins og mælaborðsins | hvaða sem er |

Fimmta útgáfa bætir við **framvindu**: reynslustigum eða áföngum.

Ef enginn heimur hefur verið skrifaður spyr sögumaðurinn líka um **söguforsendu** (stíltegund, tón og nokkur atriði, með þínum orðum) og um **undirbúning**: að byggja heiminn jafnóðum, eftir því sem þú spilar, eða allan í upphafi.

**Stíll sögumanns** er aldrei spurt um, en þú getur breytt honum í spjallinu eða í **Stillingar**: **textinn** (einfaldur, bókmenntalegur, reyfarastíll, kaldhæðinn), **sögurnar** sem hann býr til (aðstæður, söguþræðir, þættir, ráðgáta), höfundur til að **skrifa eins og**, eða hvað sem er annað **með þínum orðum**.

### 2.7 Núllti fundur: persónan þín

Þú býrð persónuna til með sögumanninum, eins og við borð. Allt val er þitt, nema þú biðjir sögumanninn að velja: komdu með fullmótaða hugmynd, óljósa eða enga. Sögumaðurinn segir þér hvernig hæfnigildi eru ákveðin áður en nokkrum teningi er kastað. Sagan þín er aldrei skilyrði. Ef þú gefur upp sögu skrifar sögumaðurinn hana með þínum orðum. Síðan biður sögumaðurinn um mynd af persónunni þinni ([3.7](#37-your-characters-story-and-picture)). RPG Engine reiknar persónublaðið: þú þarft aldrei að reikna.

---

## 3. Að spila <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum:

> Ég spyr gestgjafann hver annar hafi komið hér við í kvöld.

Utan sögunnar skrifarðu innan hornklofa: *[Hvernig virkar að glíma?]* Sögumaðurinn svarar líka innan hornklofa.

Þú segir hvað þú reynir, sögumaðurinn segir hvað gerist. Sögumaðurinn ákveður aldrei fyrir persónuna þína og talar aldrei um vélina. Þú getur spurt hann hvernig á að nota mælaborðið.

**Að gera eitthvað á mælaborðinu**: smelltu á nafn á persónublaðinu þínu, til dæmis vopn, galdur eða hlut sem þú berð, og síðan á þann sem það beinist að. Eða smelltu á einhvern til að tala við hann. Mælaborðið skrifar setninguna fyrir þig, *Ég ræðst á Hooded Bandit 1 með Mace.*, og þú getur breytt henni áður en þú velur **Segðu sögumanni**. Sögumaðurinn heyrir hana eins og hún væri sögð í spjallinu og úrskurðar um hana eins og um allt annað. Þar sem gervigreindarforritið þitt heyrir ekki sjálft í henni undirbýr **Afrita** hana til að líma í spjallið.

### 3.2 Köst

Sögumaðurinn biður aðeins um kast þegar útkoman er óviss og skiptir máli, og segir fyrst hvað er í húfi. Síðan:

- **Á mælaborðinu** sýnir borði hnapp fyrir hvert próf, til dæmis *Acrobatics +4 · með vantaggio*. Smelltu á hann: teningarnir falla á síðuna og sögumaðurinn heyrir útkomuna. Þú getur líka smellt á línuna á persónublaðinu sem lýsist upp, kastað teningunum úr bakkanum eða skrifað eitthvað annað í borðann.
- **Handvirkt**, í horni borðans eða í **Stillingar**: borðinn segir þér hverju á að kasta og þú kastar því af persónublaðinu eða úr bakkanum.
- **Eðlilegir teningar**, þegar teningastillingin er á eðlilegum: þú skrifar töluna sem kom upp, *[Ég kastaði 14.]*, og RPG Engine bætir breytunum þínum við.

**Frjáls köst**: smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu bakkann, til að kasta þér til gamans. Þau telja aldrei og sögumaðurinn sér þau aldrei.

**Köst sögumannsins** birtast í kastdálkinum þínum, nema þau leynilegu. Þú getur alltaf spurt *[Var þetta kast raunverulegt?]*: fyrir leynilegt kast gefur sögumaðurinn fingrafar sem sannar að kastið var gert áður en þú spurðir.

### 3.3 Atriði og bardagar

Sagan gerist í **atriðum**: bardaga, samtali, könnun, ferðalagi, hvíld. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í dagbókina þína.

Í bardaga segir sögumaðurinn frá hverri röð sem er ekki þín og stoppar þar sem þú getur ákveðið. **Atriði** sýnir efst hver á röðina og hver kemur næst, og spjald persónunnar þinnar við hliðina á kortinu. Röð umferðanna, lífstig hópsins þíns og hversu særðir óvinirnir líta út, í orðum, eru áfram við hlið síðunnar. Ef persónan þín fellur birtast björgunarköstin gegn dauða stór á síðunni.

### 3.4 Tími, ferðalög og heimur á hreyfingu

RPG Engine heldur utan um dagsetninguna. Enginn tími líður milli funda. Segðu að þið hvílist, *Við tökum langa hvíld*, og þegar sögumaðurinn samþykkir skilar hvíldin því sem hún á að skila. Í stuttri hvíld getur sögumaðurinn spurt á mælaborðinu hversu marga lífteninga þú eyðir: kastaðu þeim einum í einu, sjáðu hvað hver læknar og hættu þegar þú vilt. Segðu hvert þið farið, *Við förum veginn norður til Rocca*, og RPG Engine reiknar leiðina, vegalengdina og dagana og stoppar þegar eitthvað gerist á leiðinni. Peningar eru taldir í mynt leiksins, skiptimynt meðtalin.

Illmenni hafa áætlanir með tímamörkum. Hvern nýjan dag færir sögumaðurinn ógnirnar sem tíminn hefur þokað áfram og þú sérð merki þeirra, aldrei klukkuna sjálfa.

### 3.5 Kort

**Heimur** sýnir staðina sem persónan þín þekkir, vegina á milli þeirra og slóðina sem þú gekkst, með þoku yfir restinni. **Atriði** sýnir kort af staðnum þar sem þú ert, ef það er til, með því hver stendur hvar. Í bardaga, í þinni röð, eru reitirnir sem þú nærð ekki til huldir. Þegar sögumaðurinn spyr hvert þú ferð skaltu snerta reit eða skrifa hann, til dæmis *E4*.

### 3.6 Verkefni, dagbók og minnisblöð

Verkefni sem persónan þín tekur að sér verður að verkefni í **Dagbók**, með markmiðum sínum, tímamörkum og því sem það mælir. Settu stjörnu á það til að hafa það í sjónmáli efst í Atriði. Dagbókin segir líka **söguna** þína, atriði fyrir atriði, og geymir **minnisblöðin** þín: einkamál, nema þú veljir **Deila** fyrir eitt þeirra, sem sögumaðurinn heyrir sem það sem þú heldur, aldrei sem staðreynd.

### 3.7 Saga og mynd persónunnar þinnar

Á persónublaðinu er í spjaldinu **Lýsing** reitur fyrir sögu persónunnar þinnar: sögumaðurinn skrifar í hann, eftir að þú segir já. Fyrir mynd gefurðu sögumanninum skrá (PNG, JPEG, WebP eða SVG, allt að 5 MB) ásamt staðsetningu hennar á tölvunni þinni, eða lætur gera andlitsmynd ([3.11](#311-pictures)): *[Gerðu andlitsmynd af mér: grátt hár í fléttu, ör á hökunni.]*

### 3.8 Vistanir og að fara til baka

RPG Engine vistar alla herferðina í lok hvers atriðis. Stillingin **vistanir** ákveður restina:

| Vistanir | Vista þegar þú vilt | Fara til baka |
|---|---|---|
| **varanlegur dauði** | nei | aldrei |
| **vistunarpunktur** | nei | í síðustu vistun, aðeins þegar persónan þín deyr |
| **laust** | já | í hvaða vistun sem er |

Í öllum stillingum geturðu **byrjað upp á nýtt**, frá upphafi leiks eða frá núllta fundi. Gerðu það í spjallinu eða í **Vistanir**.

Eftir að hafa farið til baka skaltu **opna nýtt spjall**: gamla spjallið man það sem var afturkallað. Skrifaðu *höldum áfram* í nýja spjallinu og ýttu síðan á **Ég opnaði nýtt spjall** í Vistanir.

### 3.9 Fundir: að hætta og koma aftur

Hættu hvenær sem þú vilt: *[Hættum hér í kvöld.]* Allt er þegar vistað í skránum. Til að koma aftur ræsirðu forritið þitt í möppu herferðarinnar og skrifar *höldum áfram*: sögumaðurinn gefur þér stutta samantekt og heldur áfram.

### 3.10 Skap sögumannsins

Vélmennið efst á mælaborðinu er sögumaðurinn: andlit þess fylgir tóni sögunnar og ljóstrar aldrei upp því sem þú veist ekki enn. Þegar spjallið er lokað sefur það.

### 3.11 Myndir

RPG Engine getur látið gera myndir af stöðunum sem þú kemur á, verkefnunum sem þú tekur að þér og þeim sem þú hittir, eins og stillingin **myndir** segir til um, og andlitsmynd af persónunni þinni þegar þú biður um hana. Það notar þitt eigið Codex eða Claude Code, með þinni innskráningu, á þinni áskrift og innan hennar marka: **Codex** málar þær, annars teiknar **Claude Code** þær. **Stillingar** segir hvort þessi tölva geti búið þær til og hvernig á að setja það upp ef ekki. Þú getur alltaf gefið sögumanninum þína eigin mynd.

### 3.12 Öryggi: línur, slæður og stopp

**Línur** birtast aldrei í leiknum, **slæður** gerast aðeins utan sviðs. Skrifaðu hvenær sem er *[stopp]*: sögumaðurinn sleppir því efni strax og bætir því við línurnar þínar.

### 3.13 Að skipta um skoðun

Allar stillingar má breyta, í spjallinu eða í **Stillingar**. Úrskurður sem sögumaðurinn gefur án reglubókarinnar verður að **fordæmi**, svo að sama spurning fái sama svar næst.

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

### 7.1 Þrjár leiðir til að eignast heim

- **Búinn til jafnóðum**: út frá forsendu þinni byggir sögumaðurinn hvern stað, hverja persónu og hvern söguþráð rétt áður en þú þarft á honum að halda, og geymir hann.
- **Undirbúinn í upphafi**: það sama, en heimurinn er byggður fyrir spilun.
- **Úr þínu eigin ævintýri eða bók**: gefðu sögumanninum skrána, *[Fluttu þetta ævintýri inn sem herferðina okkar: D:\Books\adventure.pdf. Segðu mér ekkert af því sem stendur í því.]* Best er að það sé texti, EPUB, Word-skjal eða PDF þar sem hægt er að velja textann. Skönnuð PDF er lesin af myndum síðnanna, aðeins á Windows, hægt og með nokkrum villum. Þitt eigið Codex eða Claude Code les það utan spjallsins, annars sögumaðurinn í spjallinu, á þinni áskrift: allt skjalið fer til OpenAI eða Anthropic, samkvæmt skilmálum reikningsins þíns og vali hans um þjálfun. Mælaborðið sýnir hvernig gengur. Úr skáldsögu leggur sögumaðurinn til hvar á að byrja. Hann skrifar staðina, persónurnar og leyndarmálin.

Herferð er spiluð einu sinni: til að spila sama ævintýrið aftur skaltu búa til nýja herferð.

### 7.2 Tungumál

Eitt tungumál fyrir hverja herferð, tungumál sögumannsins, sem mælaborðið fylgir. Mælaborðið kemur á 26 tungumálum. Hvert annað tungumál er þýtt á tölvunni þinni af Codex eða Claude Code, eða, án þeirra, af sögumanninum í spjallinu. Hugtök fimmtu útgáfu á ítölsku koma úr opinberu ítölsku SRD-útgáfunni. Reglutextinn er áfram á ensku og sögumaðurinn segir frá honum á þínu tungumáli.

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

**Þarf ég að kunna reglurnar?** Nei. Veldu kennslu sem leiðbeinanda og spurðu innan hornklofa hvenær sem þú vilt.

**Getur sögumaðurinn svindlað?** Hann getur ekki breytt kasti sem RPG Engine gerði, nema á erfiðleikastiginu saga, né staðreyndum sem þegar hafa verið ákveðnar.

**Kostar það eitthvað?** RPG Engine er ókeypis. Sögumaðurinn keyrir á áskrift gervigreindarforritsins þíns, eða á þinni eigin tölvu með staðbundnu líkani. Kvöld í spilun er langt spjall: á minnstu áskriftunum gætirðu náð mörkum áskriftarinnar áður en kvöldið er á enda. Myndir, þýðingar og innflutningur nota sömu áskrift. RPG Engine sjálft notar aldrei API-lykil, sem er greiddur fyrir hvert kall: skráðu gervigreindarforritið þitt inn með reikningnum þínum, ekki með lykli.

**Get ég spilað í símanum?** Nei: sögumaðurinn keyrir á tölvunni þinni og mælaborðið opnast aðeins þar.

**Get ég spilað með vinum?** Ekki enn: í dag er einn spilari, ein persóna, auk félaga ([Væntanlegt síðar](#9-coming-later)).

**Get ég notað aðra gervigreind næst?** Já: opnaðu herferðina í öðru forriti og skrifaðu *haltu áfram*.

### Vandamál

**Mælaborðið opnast ekki.** Spurðu sögumanninn: `[Hver er hlekkurinn á mælaborðið?]`. Það virkar aðeins meðan spjall er opið í þeirri herferð, eftir fyrsta svar sögumannsins.

**Sögumaðurinn virðist ekki þekkja leikinn.** Gervigreindarforritið þitt hlóð ekki RPG Engine. Athugaðu að þú ræstir það í herferðarmöppunni og treystir henni. Í Claude Code skaltu skrifa `/mcp` og tengja `rpg` aftur. Í Codex verður `codex mcp list` í herferðarmöppunni að sýna `rpg`. Ef `rpg --version` finnst ekki skaltu setja RPG Engine upp aftur ([2.2](#22-install)).

**Uppfærsla.** Keyrðu `npm install -g rpg-engine` aftur og opnaðu síðan nýtt spjall: sögumaður sem er í gangi heldur þeirri útgáfu sem hann ræsti með.

**Sögumaðurinn man eitthvað sem ég afturkallaði.** Opnaðu nýtt spjall og ýttu á **Ég opnaði nýtt spjall** í Vistanir.

**Engar myndir birtast.** Stillingar > Myndir segir hvort þessi tölva getur gert þær og hvernig.

**Uppsetning mistekst, eða `rpg` ræsist ekki.** `node --version` verður að sýna 22 eða nýrra. Á Windows skaltu halda RPG Engine og herferðunum þínum frá slóðum sem innihalda `&`.

**Hlekkurinn á mælaborðið breyttist.** Annað forrit tók venjulega vistfangið. Sögumaðurinn gefur þér nýja hlekkinn.
