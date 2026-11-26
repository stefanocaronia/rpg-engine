<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: heildarleiðbeiningar

**RPG Engine** lætur þig spila borðhlutverkaleik með **gervigreind sem sögumann**. Þú spilar í **yfirlitinu**, glugga á tölvunni þinni með persónublaðinu þínu, teningunum, kortunum, dagbókinni og **spjallinu** við sögumanninn. RPG Engine vinnur á bak við tjöldin: það **man heiminn**, **kastar teningunum** og **heldur utan um bókhaldið**.

Þessar leiðbeiningar eru fyrir spilara: þú þarft ekki að kunna að forrita.

## Fljótleg byrjun <!-- icon: send -->

1. Settu upp **Node.js** frá [nodejs.org](https://nodejs.org) (LTS-útgáfuna).
2. Einu sinni, í nýjum skipanaglugga sem þú opnaðir eftir að Node.js var sett upp, settu upp RPG Engine: `npm install -g rpg-engine`. Ef Windows svarar að keyrsla skripta sé óvirk skaltu skrifa einu sinni `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svara já og reyna aftur.
3. Skrifaðu `rpg open`. Það spyr hvort setja eigi tákn RPG Engine á skjáborðið og í valmyndina: ýttu á Enter til að svara já. Eftir það ræsirðu RPG Engine með tákninu, án skipanaglugga ([2.2](#22-install)).
4. Gluggi sýnir herferðirnar þínar. Ýttu á **Ný herferð**, gefðu henni nafn og ýttu á **Búa til** ([2.3](#23-create-a-campaign)): yfirlit hennar opnast í sérstökum glugga.
5. Veldu í spjallinu við sögumanninn gervigreindarforritið þitt og líkan þess: Claude Code krefst greiddrar Claude-áskriftar, Codex ChatGPT-reiknings, ókeypis eða greidds ([2.4](#24-connect-your-ai)). Ef forritið vantar eða þú hefur ekki skráð þig inn setur síðan það upp eða skráir þig inn. Ýttu á **Opna spjallið** og svo á **Byrja**. Fyrsta svarið getur tekið nokkrar mínútur. Síðan spyr sögumaðurinn hvernig þú vilt spila og þið búið til persónuna saman.

## 1. Hvað RPG Engine er <!-- icon: about -->

| Hver | Hvað gerir hann |
|---|---|
| **Þú** | Þú spilar persónuna þína: hvað hún gerir, segir og reynir. |
| **Sögumaður** (gervigreindin) | Segir söguna, leikur alla aðra, ákveður hvað gerist og biður um köst. |
| **RPG Engine** | Geymir heiminn í skrám, kastar teningunum, telur lífsstig, peninga, tíma og vegalengdir og heldur leyndarmálum földum þar til þú uppgötvar þau. |

Heimurinn helst eins frá einu kvöldi til þess næsta, jafnvel í nýju spjalli, jafnvel með annarri gervigreind:

- **Það sem hefur verið sagt stendur.** Dauður óþokki helst dauður.
- **Teningarnir eru raunverulegir.** Sögumaður getur ekki hnikað þeim til, nema á léttasta erfiðleikastiginu, ef þú velur það.
- **Leyndarmál haldast leyndarmál.** Sögumaður segir þér aldrei það sem persónan þín veit ekki.
- **Heimurinn hreyfist.** Ógnir færast nær á meðan þú hvílist eða ferðast og þú sérð merki þeirra.
- **Herferð er mappa** á tölvunni þinni: þú hættir hvenær sem þú vilt og heldur áfram síðar.

Leikur kemur sem leikjakerfi, pakki sem sögumaður setur upp fyrir herferðina þína. Núna er það okkar **fimmta útgáfa**, úr ókeypis System Reference Document 5.1. Án leikjakerfis spilar þú frjálst, sögu án talna. Fleiri koma síðar ([Væntanlegt síðar](#9-coming-later)).

---

## 2. Að byrja <!-- icon: path -->

### 2.1 Það sem þú þarft

- Tölva með Windows, macOS eða Linux og vafri.
- **Node.js 24** eða nýrra, frá [nodejs.org](https://nodejs.org). Með því fylgir `npm`, sem setur upp RPG Engine.
- **Skipanagluggi**, einu sinni, til að setja RPG Engine upp: á Windows Terminal eða PowerShell, á macOS Terminal. Til að opna hann í möppu skaltu hægrismella á möppuna og velja **Opna í Terminal** (Windows) eða **Þjónusta > Nýr Terminal við möppu** (macOS). Ef Windows svarar að keyrsla skripta sé óvirk skaltu skrifa einu sinni `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` og svara já.
- **Gervigreindarforrit** fyrir sögumanninn, með þínum eigin reikningi ([2.4](#24-connect-your-ai)): síðan getur sett það upp fyrir þig. Spilaðu með **stærsta líkaninu** sem það býður: lítið líkan er auðveldara að fá til að ljóstra upp leyndarmálum eða sveigja reglurnar.

### 2.2 Uppsetning

```text
npm install -g rpg-engine
rpg open
```

Fyrsta línan setur RPG Engine upp; `rpg --version` sýnir hvort það tókst. Ef npm býðst til að uppfæra sig sjálft geturðu hunsað það.

`rpg open` opnar glugga RPG Engine með herferðunum þínum. Í fyrsta skipti spyr það í skipanaglugganum hvort bæta eigi tákni þess á skjáborðið og í Start-valmyndina (Forrit á Mac): ýttu á Enter til að svara já. Eftir það tvísmellirðu á táknið og þarft ekki lengur skipanaglugga. Án táknsins skaltu skrifa `rpg open` í hvert sinn sem þú spilar; `rpg icon` bætir tákninu við síðar og `rpg icon --remove` fjarlægir það.

### 2.3 Búa til herferð

Gluggi RPG Engine sýnir herferðirnar þínar sem spjöld, þá síðustu sem var opnuð fyrst. Ýttu á **Ný herferð** og fylltu út **Nafn**, **Tungumál** og **Leikjakerfi**: sögumaðurinn býr til afganginn með þér. Herferðin fer í möppu með nafni hennar, inni í möppunni `RPG Engine` í notandamöppunni þinni (á Windows `C:\Users\<name>`); með **Veldu aðra möppu…** fer hún í tóma möppu að þínu vali. Undir **Sögumaður** geturðu nú þegar valið gervigreindarforritið og líkanið fyrir fyrsta spjallið ([2.4](#24-connect-your-ai)). Ýttu á **Búa til**: yfirlit herferðarinnar opnast í sérstökum glugga.

Næst smellirðu á spjald til að opna herferðina þess; herferð sem er opin segir **Opin núna**. Með **Opna möppu…** bætirðu við herferð sem þú átt nú þegar á þessari tölvu. Litli krossinn á spjaldinu tekur það af listanum: skrárnar haldast þar sem þær eru.

### 2.4 Tengja gervigreindina

Sögumaðurinn keyrir í **gervigreindarforriti** á tölvunni þinni, með þínum eigin reikningi: Claude Code, Codex, OpenCode eða Antigravity. Venjulegt spjall eins og claude.ai eða ChatGPT, eða símaapp, dugar ekki: sögumaðurinn þarf að komast í skrár herferðarinnar á tölvunni þinni. Hvert forrit þarf sinn eigin reikning: Claude Code greidda Claude-áskrift (Pro eða hærri); Codex ChatGPT-reikning, ókeypis eða greiddan; Antigravity Google-reikning, en ókeypis notkun hans hefur vikuleg mörk; OpenCode býður nokkur ókeypis líkön í takmarkaðan tíma, eða notar líkön þíns eigin þjónustuaðila, líka staðbundin.

Veldu í spjallinu forritið undir **Gervigreindarforritið þitt**, síðan **Líkan** þess og **Hugsun sögumanns**: síðan stingur upp á gildum. Meiri hugsun er hægari og notar meira af áskriftinni þinni. Forrit sem er ekki tilbúið segir hvað það þarf, með hnappi sem gerir það:

- **Claude Code** og **Codex**: **Setja upp Claude Code** eða **Setja upp Codex** sækir það í sérstaka möppu RPG Engine á þessari tölvu; **Skrá inn í Claude Code** eða **Skrá inn í Codex** opnar innskráningarsíðu þess í vafranum þínum. RPG Engine sér aldrei lykilorðið þitt.
- **OpenCode** og **Antigravity**: **Sækja OpenCode** eða **Sækja Antigravity** opnar vefsíðu þess, þar sem þú setur það upp. OpenCode virkar án innskráningar; Antigravity skráir þig inn úr sínu eigin forriti. Komdu síðan aftur og ýttu á **Athuga aftur**.

Antigravity er merkt **í prófun**: það getur stigið út úr leiknum og spurt spurninga á sinn hátt, svo Claude Code, Codex eða OpenCode henta betur til að spila. Antigravity geymir fyrri spjöll þín og ekki er hægt að slökkva á minni þess: sögumanninum er sagt að lesa þau aldrei. Það sem þú skrifar fer til Google, sem gæti látið fólk lesa það: haltu persónuupplýsingum utan leiksins. RPG Engine er ekki vara frá Google. Við spilum og prófum RPG Engine mest með **Claude Code**: engin heil herferð hefur enn verið spiluð með hinum.

Í spjallinu í yfirlitinu snertir sögumaðurinn tölvuna þína aðeins í gegnum RPG Engine: hann opnar engar skrár þínar sjálfur. RPG Engine les utan herferðarinnar aðeins það sem þú valdir, eftir að þú segir já í glugga á tölvunni þinni.

Þú getur líka spilað í spjalli gervigreindarforritsins sjálfs, í skipanaglugga eða í skjáborðsappi þess ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Fyrsta spjallið

Þegar forritið og líkanið eru valin skaltu ýta á **Opna spjallið**: forritið ræsist, sem getur tekið nokkrar sekúndur. Ýttu síðan á **Byrja** eða skrifaðu hvað sem er, til dæmis *Hæ! Byrjum.* Fyrsta svarið getur tekið nokkrar mínútur meðan sögumaðurinn sviðsetur atriðið.

Spjallið hefur sinn eigin hluta, **Leikur**, eða stendur við hlið síðunnar: litlu hnapparnir efst á því setja það **Í sínum flipa**, **Til vinstri** eða **Til hægri**, og þú dregur brúnina til að breikka það.

Ný herferð fer í gegnum þrjú stig, sem sjást efst á stjórnborðinu: **1 Stillingar** (hvernig þú vilt spila), **2 Núllti fundur** (þú býrð til persónuna þína, í leiknum), **3 Spilun**.

### 2.6 Stillingar: hvernig þú vilt spila

Sögumaðurinn spyr aðeins um það sem vantar enn, nokkrar spurningar í einu. Skrefið **Stillingar** á stjórnborðinu sýnir sömu spurningar sem spjöld. Skrifaðu „þú ræður“ og sögumaðurinn velur. Allt má breyta síðar, í spjallinu eða í **Stillingar**.

| Stilling | Hvað hún ákveður | Gildi |
|---|---|---|
| **Leiðbeinandi** | Hversu mikið sögumaðurinn kennir þér reglurnar | off, hints, tutorial |
| **Erfiðleikastig** | Hversu erfiður heimurinn er | story, easy, normal, hard, brutal |
| **Banvænleiki** | Hvað það þýðir að falla í bardaga | narrative (aldrei dauði), epic (aðeins þegar það skiptir máli), dice |
| **Vistanir** | Hvenær þú mátt fara til baka | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Strangleiki** | Hversu nákvæmlega matur, ljós og ferðalög fylgja reglunum | smooth, rules, simulation |
| **Teningar** | Hver kastar teningunum þínum | digital, physical |
| **Mælieiningar** | Vegalengdir og þyngd | metric, imperial |
| **Raddir persóna** | Hver talar fyrir persónurnar sem þú hittir, frá sögumanninum til persónanna: sögumaðurinn alltaf; á lykilaugnablikum persónan sjálf, sem veit aðeins það sem hún veit, að vali sögumannsins; eða alltaf persónan, fyrir helstu persónur eða allar, hægar og dýrara, þar sem gervigreindarappið þitt getur það | the master, sometimes, main characters, everyone |
| **Persónan þín** | Hvernig persónan þín er búin til á núllta fundi | with the master, by the master, your own ([2.7](#27-session-zero-your-character)) |
| **Félagar** | Hver ferðast með þér | none, made with you, made by the master, met in play |
| **Myndir** | Myndir af stöðum, verkefnum og þeim sem þú hittir | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Línur** og **Slæður** | Það sem birtist aldrei og það sem gerist aðeins utan sviðs | listar |
| **Tungumál** | Tungumál leiksins og stjórnborðsins | hvaða sem er |

Fimmta útgáfa bætir við **framvindu**: reynslustigum eða áföngum.

Ef enginn heimur er skrifaður spyr sögumaðurinn líka um **Forsendu** (tegund, tón, nokkur atriði og hvað þér þykir skemmtilegast í leik, til dæmis bardaga, ráðgátur, samtöl eða könnun, með þínum orðum), um **Undirbúning**: að smíða heiminn jafnóðum, eftir því sem líður á, eða allan í byrjun, og um **Lengd**: eitt kvöld, nokkra fundi (þrjú til fimm kvöld) eða opna, eitt ævintýri á fætur öðru. Þegar saga með ákveðna lengd er á enda geturðu alltaf haldið áfram.

**Stíll sögumanns** er aldrei spurt um, en þú getur breytt honum í spjallinu eða í **Stillingar**: **Frásögn** (einföld, bókmenntaleg, pulp, kímin), **Sögur** sem sögumaðurinn semur (aðstæður, söguþræðir, þættir, ráðgáta), höfundur til að **Skrifa eins og**, eða hvað sem er **Með þínum orðum**.

### 2.7 Núllti fundur: persónan þín

Þú býrð til persónuna þína með sögumanninum, eins og við borð. Hvert val er þitt, nema þú biðjir sögumanninn að taka það: komdu með fullmótaða hugmynd, óljósa eða enga, eða biddu sögumanninn að búa allt til út frá nokkrum orðum. Í leik með stigum spyr sögumaðurinn á hvaða stigi þú vilt byrja: á fyrsta, nema þú viljir annað. Sögumaðurinn segir þér hvernig hæfnistig eru ákveðin áður en nokkrum teningi er kastað. Saga þín er aldrei skilyrði. Ef þú gefur upp sögu skrifar sögumaðurinn hana með þínum orðum. Síðan biður sögumaðurinn um mynd af persónunni þinni ([3.7](#37-your-characters-story-and-picture)). RPG Engine reiknar persónublaðið: þú þarft aldrei að reikna sjálf/ur.

Áttu nú þegar persónu, úr öðrum leik eða annarri herferð? Veldu **Ég á nú þegar einn** í uppsetningunni og réttu sögumanninum hana: límdu persónublaðið inn í spjallið. Í spjalli gervigreindarforritsins sjálfs geturðu líka sagt hvar skráin er á tölvunni þinni (PDF, mynd, texti); í spjallinu í yfirlitinu opnar sögumaðurinn enga skrá frá þér. Sögumaðurinn skrifar persónuna eins og hún er, á stigi hennar, ber hana saman við reglurnar og heiminn og semur við þig um allt sem passar ekki.

### 2.8 Hin leiðin: spjall gervigreindarforritsins sjálfs

Þú getur líka spilað í spjalli gervigreindarforritsins sjálfs, í skipanaglugga eða í skjáborðsappi þess, með yfirlitið opið við hliðina. Þá býrðu herferðina til í skipanaglugga, í möppunni þar sem þú geymir leikina þína ([2.1](#21-what-you-need) segir hvernig), alltaf með nafni: `rpg init "The Salt Isles"` býr til möppuna `The Salt Isles` með nýrri herferð. RPG Engine undirbýr sjálft það sem hvert forrit þarf þar.

Ræstu forritið þitt í þeirri möppu: `claude` fyrir Claude Code, `codex` fyrir Codex, `agy` fyrir Antigravity, `opencode` fyrir OpenCode; eða opnaðu möppuna í skjáborðsappi þess. Segðu já þegar það spyr hvort þú treystir möppunni: farðu varlega, í Claude Code er svarið sem er valið fyrirfram *No, exit*. Hvaða annað forrit sem styður MCP getur líka verið sögumaðurinn: ræstu það í herferðarmöppunni og gefðu því MCP-þjóninn `rpg mcp`.

Skrifaðu *Hæ! Byrjum.* Í fyrsta svari hvers spjalls gefur sögumaðurinn þér **hlekkinn á yfirlitið þitt**, eitthvað á borð við `http://127.0.0.1:4750`: opnaðu hann við hliðina á spjallinu.

- Milli skilaboða sögumannsins sýnir forritið þitt verkfærin sem það notar: ekki opna upplýsingar um þau (í Claude Code ctrl+o), því þær geta sýnt leyndarmál.
- Herferðin slekkur á eigin minni forritsins: leikurinn býr í skrám þess, svo að það að fara aftur í vistun fari raunverulega aftur. Í skjáborðsappi Codex skaltu athuga í stillingunum að minni sé slökkt fyrir spjöll leiksins.
- Ef sögumaðurinn segist ekki finna verkfæri RPG Engine skaltu skrifa `rpg init` í herferðarmöppunni og opna síðan nýtt spjall.
- Eitt spjall í einu spilar herferð: meðan þitt er opið bíður spjallið í yfirlitinu.

---

## 3. Að spila <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir, með þínum eigin orðum:

> Ég spyr gestgjafann hver annar kom hér við í kvöld.

Utan sögunnar skrifarðu `[OOC: …]` (utan persónu): *[OOC: Hvernig virka glímutök?]* Sögumaðurinn svarar á sama hátt; í spjallinu í yfirlitinu sker mál hans utan leiks sig úr og er merkt OOC.

Í spjallinu í yfirlitinu skrifarðu í reitinn neðst og ýtir á Enter til að senda; Shift+Enter byrjar nýja línu. Meðan sögumaðurinn svarar stöðvar **Stöðva** hann og orðin þín bíða í reitnum. Þegar sögumaðurinn spyr þig einhvers fylgja hnappar spurningunni, líka köst: smelltu á einn eða skrifaðu svarið. Undir reitnum sérðu forritið og líkanið; þar sem forritið leyfir geturðu smellt á líkanið til að breyta því eftir að sögumaðurinn hefur svarað. **Loka spjallinu** bindur enda á spjallið; leikurinn helst í skránum sínum.

Þú segir hvað þú reynir. Sögumaðurinn segir hvað gerist. Sögumaðurinn ákveður aldrei neitt fyrir persónuna þína og talar aldrei um vélina á bak við leikinn. Þú getur spurt um það hvernig á að nota stjórnborðið.

**Að athafna sig af stjórnborðinu**: smelltu á nafn á persónublaðinu, til dæmis vopn, galdur eða hlut sem þú berð. Spjaldið þess segir hvað það er. Taska opnast með örinni sinni og ⓘ sýnir spjald hennar. Veldu hvað þú gerir við hlutinn. Aðgerð sem krefst einskis annars, til dæmis **Útbúðu þig**, biður þig að staðfesta á sama hnappi, *Staðfesta: Ég útbý mig með Shield*. Ýttu aftur og þá fer hún til sögumannsins. Aðgerð sem beinist að einhverjum, til dæmis **Árás**, spyr á hvern, á listanum eða með smelli á kortið. Þá segir hnappurinn alla setninguna, *Ég ræðst á Hooded Bandit 1 með Mace*, og einn smellur sendir hana. Til að segja það á þinn hátt skaltu smella á persónu til að tala við hana eða skrifa í spjallið. Sögumaðurinn heyrir það eins og það væri sagt í spjallinu, úrskurðar um það eins og allt annað og spyr þig með hnöppum um það sem þú sleppir. Þar sem gervigreindarforritið þitt hefur enga dyrabjöllu les sögumaðurinn það þegar þú skrifar næst í spjallið. Ef spjallinu var lokað áður sendir **Segja aftur** það einu sinni enn.

### 3.2 Köst

Sögumaðurinn biður um kast aðeins þegar útkoman er óviss og skiptir máli, og segir fyrst hvað er í húfi. Síðan:

- **Á stjórnborðinu** birtist borði með hnappi fyrir hvert próf, til dæmis *Loftfimleikar +4 · með forskoti*. Smelltu á hann: teningarnir falla á síðunni og sögumaðurinn fær útkomuna. Þú getur líka smellt á línuna á persónublaðinu sem lýsir upp, kastað teningunum úr teningabakkanum eða skrifað eitthvað annað í borðann.
- **Handvirkt**, í horni borðans eða í **Stillingar**: borðinn segir þér hverju á að kasta og þú kastar því af persónublaðinu eða úr teningabakkanum.
- **Alvöru teningar**, þegar teningastillingin er á líkamlegum: þú skrifar töluna sem kom upp, *[Ég kastaði 14.]*, og RPG Engine bætir breytunum þínum við.

**Frjáls köst**: smelltu á hvaða tölu sem er á persónublaðinu, eða opnaðu teningabakkann, til að kasta til gamans. Þau telja aldrei og sögumaðurinn sér þau aldrei.

**Köst sögumannsins** birtast í kastadálknum þínum, nema þau leynilegu. Þú getur alltaf spurt *[Var þetta kast raunverulegt?]*: fyrir leynilegt kast gefur sögumaðurinn fingrafar sem sannar að kastið var gert áður en þú spurðir.

### 3.3 Atriði og bardagar

Sagan gengur fram í **atriðum**: bardaga, samtali, könnun, ferðalagi eða hvíld. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í dagbókina þína. Þegar sagan tekur nýja stefnu skrifar sögumaðurinn atriðin frá síðasta kafla sem nýjan kafla í sögubók þinni.

Í bardaga segir sögumaðurinn frá hverri röð sem er ekki þín og stoppar þar sem þú getur tekið ákvörðun. **Atriði** sýnir efst hver á röðina og hver kemur næst, og spjald persónunnar þinnar við hlið kortsins. Röð umferðarinnar, lífsstig hópsins þíns og hve særðir óvinirnir líta út, í orðum, eru áfram við hlið síðunnar. Ef persónan þín fellur birtast dauðabjörgunarköstin stór á síðunni.

**Varanleg fyrirmæli**: segðu félögum þínum eitthvað sem á að gilda áfram, til dæmis *Héðan í frá skaltu alltaf skilja einn eftir á lífi*, og sögumaðurinn man það þar til þú afléttir því. Félagar þínir fara eftir fyrirmælunum eins langt og eðli þeirra leyfir, og ef einhver þeirra myndi ekki gera það, segir hann frá því. Fyrirmælin þín finnurðu í **Stillingar**, þar sem þú getur bætt þeim við og tekið þau af.

### 3.4 Tími, ferðalög og heimur á hreyfingu

RPG Engine heldur utan um dagsetninguna. Milli funda stöðvast leiktíminn, nema þú veljir í **Stillingar** að láta hann líða, til dæmis einn dag í leiknum fyrir hverja viku í burtu, eða biðjir sögumanninn um það. Segðu að þið hvílist, *Við tökum langa hvíld*, og þegar sögumaðurinn samþykkir skilar hvíldin því sem hún á að skila. Í stuttri hvíld getur sögumaðurinn spurt á stjórnborðinu hve marga lífsteninga þú notar: kastaðu þeim einum í einu, sjáðu hvað hver læknar og hættu þegar þú vilt. Segðu hvert þið farið, *Við förum veginn norður til Rocca*, og RPG Engine reiknar út leiðina, vegalengdina og dagana, og stoppar þegar eitthvað gerist á leiðinni. Peningar eru taldir í mynt leiksins, líka afgangurinn.

Skúrkar hafa áætlanir með tímamörkum. Með hverjum nýjum degi færir sögumaðurinn ógnirnar sem tíminn hefur þokað áfram. Þú sérð merki þeirra, aldrei sjálfa klukkuna.

### 3.5 Kort

**Heimur** sýnir staðina sem persónan þín þekkir, vegina á milli þeirra og slóðina sem þú gekkst, með þoku yfir restinni. **Atriði** sýnir kort af staðnum þar sem þú ert, ef hann er með kort, og hver stendur hvar. Í bardaga, í þinni röð, eru reitirnir sem þú nærð ekki til huldir. Þegar sögumaðurinn spyr hvert þú ferð, snertu reit eða skrifaðu hann, til dæmis *E4*.

**Heimur** geymir líka það sem persónan þín veit. **Fróðleikur** telur upp fólkið, staðina, fylkingarnar, skepnurnar og sögurnar sem hún þekkir, hvert eins og hún þekkir það: leitaðu í honum eða opnaðu færslu til að lesa hana alla. Nafn í textanum leiðir á síðu þess. **Skjöl** geymir bréfin, tilkynningarnar og síðurnar sem hún fann, svo þú getir lesið þau aftur. **Dagatal** sýnir daginn í dag, tímamörk verkefnanna þinna með tímanum sem er eftir og daga sögunnar: dagur með atriðum leiðir á þau í **Tímalínu** í dagbókinni.

### 3.6 Verkefni, dagbók og minnisblöð

Verk sem persónan þín tekur að sér verður að verkefni í **Dagbók**, með markmiðum sínum, tímamörkum og því sem það mælir. Settu stjörnu á það til að hafa það sýnilegt efst í **Atriði**. Undir **Saga** segir dagbókin söguna þína sem bók: sögumaðurinn skrifar kafla í lausu máli í hvert sinn sem sagan tekur nýja stefnu, um atriðin frá síðasta kafla, í þeim stíl sem þú valdir. Lestu hana kafla fyrir kafla, þann síðasta merktan með bókamerki, og sæktu hana sem Markdown eða sem vefsíðu til að prenta eða senda áfram. Í leik sem hófst áður skaltu biðja sögumanninn að skrifa söguna fram til þessa. **Tímalína** telur upp atriðin, númeruð, með því sem gerðist í hverju þeirra. Í dagbókinni eru líka **Minnisblöð**: þau eru einkamál, nema þú smellir á **Deila** á einu þeirra. Sögumaðurinn heyrir það þá sem það sem þú heldur, aldrei sem staðreynd. Undir **Félagar** lestu dagbækur félaga þinna: öðru hverju, í lok dags eða verkefnis, skrifa þeir nokkrar línur um það sem þeir hugsa og finna.

### 3.7 Saga og mynd persónunnar

Á persónublaðinu er í spjaldinu **Lýsing** reitur fyrir sögu persónunnar. Sögumaðurinn skrifar hana inn, eftir að þú hefur sagt já. Fyrir mynd skaltu gefa sögumanninum skrá (PNG, JPEG, WebP eða SVG, allt að 5 MB) ásamt slóðinni að henni í tölvunni þinni, eða láta gera andlitsmynd ([3.11](#311-pictures)): *[Gerðu andlitsmynd af mér: grátt hár í fléttu, ör á hökunni.]*

### 3.8 Vistanir og að fara til baka

RPG Engine vistar alla herferðina í lok hvers atriðis. Stillingin **vistanir** ræður restinni:

| Vistanir | Vista þegar þú vilt | Fara til baka |
|---|---|---|
| **varanlegur dauði** | nei | aldrei |
| **vistunarpunktur** | nei | á síðustu vistun, aðeins þegar persónan þín deyr |
| **laust** | já | á hvaða vistun sem er |

Í öllum stillingum geturðu **byrjað upp á nýtt**, frá upphafi leiks eða frá núllta fundi. Gerðu það í spjallinu eða í **Vistanir**.

Eftir að þú ferð til baka skaltu **opna nýtt spjall**: gamla spjallið man það sem var afturkallað. Í spjallinu í yfirlitinu skaltu ýta á **Loka spjallinu** og svo á **Nýtt spjall**; í spjalli gervigreindarforritsins sjálfs skaltu opna nýtt samtal (`/clear` í Claude Code). Skrifaðu *Halda áfram* í nýja spjallið. Segðu síðan sögumanninum að spjallið sé nýtt: ýttu á **Ég opnaði nýtt spjall** í Vistanir, eða segðu það í spjallinu. Þar til það er gert heldur sögumaðurinn ekki áfram.

Ef þú veist ekki hvað git er skaltu sleppa þessari málsgrein. Ef mappa herferðarinnar er git-geymsla hefur **Stillingar** hlutann **Git**, allt slökkt þar til þú velur: framlag (commit) í upphafi hverrar lotu, við hverja vistun og í lok hvers atriðis, og ýting (push) á eftir ef þú vilt. Framlag er skyndimynd af herferðinni á þeirri stundu; ýting sendir skyndimyndirnar í geymsluna á netinu, til dæmis á GitHub, svo að afrit sé til utan þessarar tölvu. Vistanir og spjöll þín við sögumanninn haldast utan geymslunnar nema þú hleypir þeim inn; hleyptu spjöllunum aðeins inn ef geymslan er einkageymsla.

### 3.9 Fundir: að hætta og koma aftur

Hættu hvenær sem þú vilt: *[Hættum hér í kvöld.]* Allt er þegar vistað í skrárnar. Til að koma aftur skaltu opna RPG Engine með tákninu og smella á herferðina þína. Ef þú skildir spjallið eftir opið kemur það aftur af sjálfu sér. Ef þú lokaðir því skaltu ýta á **Halda spjallinu áfram**. Ýttu síðan á **Halda sögunni áfram**: sögumaðurinn segir þér í fáum línum hvar þú varst og heldur áfram. Ef leiknum var lokað meðan sögumaðurinn var enn að svara, eða meðan spurning frá honum beið þín, stendur **Halda áfram héðan** á hnappnum í staðinn. **Nýtt spjall** opnar nýtt spjall í sama leik. Í spjalli gervigreindarforritsins sjálfs skaltu ræsa það í herferðarmöppunni og skrifa *Halda áfram*.

### 3.10 Skap sögumannsins

Vélmennið efst á yfirlitinu er sögumaðurinn: andlit hans fylgir tóni sögunnar og gefur aldrei upp það sem þú veist ekki enn. Þegar yfirlitið er ekki tengt við leikinn sefur hann.

### 3.11 Myndir

RPG Engine getur látið gera myndir af stöðunum sem þú kemur til, verkefnunum sem þú tekur að þér og persónum sem þú hittir, eins og stillingin **Myndir** segir til um, og andlitsmynd af persónunni þinni þegar þú biður um það. Gervigreindarforritið þitt gerir þær með eigin aðferðum, með þinni innskráningu, á þinni áskrift og innan marka hennar: **Claude** teiknar þær sem vigurmyndir, **Codex** og **Antigravity** mála þær, **OpenCode** teiknar einfaldar vigurmyndir í spjallinu. Í **Stillingar > Herferð > Myndir** geturðu látið Codex eða Antigravity mála þær líka þegar sögumaðurinn keyrir í öðru forriti: þar sem forritið sem þú valdir getur það ekki býr spjallið þitt þær til. **Stillingar** segja þér hvort þessi tölva getur gert þær og hvernig á að setja það upp ef ekki. Þú getur alltaf lagt til þína eigin mynd, fyrir persónuna þína eða hvaða síðu sem þú sérð: færðu bendilinn yfir eina af myndum hennar og lítill myndahnappur birtist í horninu (líka með lyklaborðinu og alltaf í síma). Undir **Heimur** er líka hnappurinn **Skipta um mynd…** á síðunni sem þú opnar, eða **Bæta við mynd…** á meðan hún er án myndar. Með bendilinn yfir mynd, eða með hnappinn hennar í fókus, geturðu líka límt inn mynd sem þú afritaðir, með Ctrl+V (⌘V á Mac). Þín mynd kemur í stað þeirrar sem er fyrir. Eða settu skrána í möppuna **inbox** í herferðinni og segðu sögumanninum fyrir hvaða síðu hún er.

### 3.12 Öryggi: línur, slæður og stopp

**Línur** birtast aldrei í leiknum. **Slæður** gerast aðeins utan sviðs. Hvenær sem er geturðu skrifað *[stopp]*: sögumaðurinn sleppir því efni strax og bætir því við línurnar þínar.

### 3.13 Að skipta um skoðun

Allar stillingar má breyta, í spjallinu eða í **Stillingar**. Úrskurður sem sögumaðurinn gefur án reglubókarinnar verður að **fordæmi**, svo sama spurning fái sama svar næst.

---

## 4. Mælaborðið <!-- icon: party -->

Síða á þinni eigin tölvu, í sérstökum glugga, opin aðeins á þeirri tölvu. Hún er virk meðan glugginn er opinn, með eða án spjalls; um þrjátíu sekúndum eftir að þú lokar honum stöðvast leikurinn og spjallið með honum. Ekkert tapast: allt er í skránum. Í spjalli gervigreindarforritsins sjálfs er hún virk meðan það spjall er opið. Þegar leikurinn er ekki tengdur sýnir síðan *Not connected*: ýttu á **Opna herferðina aftur** eða, í þínu eigin forriti, opnaðu næsta spjall. Hnappurinn **Herferðir**, með húsinu, leiðir aftur í allar herferðirnar þínar.

- **Leikur**: spjallið við sögumanninn, þegar það er ekki við hlið síðunnar ([2.5](#25-the-first-chat)).
- **Hópur**: persónublaðið þitt og blöð félaga þinna. Smelltu á tölu til að kasta henni; haltu bendlinum yfir hana til að sjá hvaðan hún kemur og, þegar ör merkir tening hennar, hvað gerir kastið betra eða verra. Þegar sögumaðurinn undirbýr val fyrir þig, til dæmis á nýju stigi, opnar tilkynning á persónublaðinu það: veldu þegar þér hentar, lestu síðurnar sem valkostirnir nefna, kastaðu þar sem valkostur krefst kasts og staðfestu svo; sagan heldur áfram á meðan. Við hliðina eru köstin.
- **Atriði**: hvar þú ert, mynd þess og kort, hverjir eru þar, hvað er að gerast; í bardaga eru það raðirnar og spjald persónunnar þinnar.
- **Dagbók**: verkefni, sagan sem bók, tímalína hennar, dagbækur félaga þinna, minnisblöðin þín.
- **Heimur**: heimskortið, það sem persónan þín veit, skjölin sem hafa fundist og dagatalið.
- **Teningabakkinn**: veldu teninga og breyti og kastaðu; ×2 tvöfaldar teningana, aldrei breytinn, eins og við critical hit.
- **Vistanir**, **Hjálp**, **Stillingar** og **Um**, sem tákn aftast í röðinni. Í Stillingum eru líka, undir **Yfirlit**, eigin valkostir síðunnar: hamur, teningahljóð, teningasett og **Þema**, það er litirnir, svipirnir og myndirnar á síðunni: þau sem leikjakerfið býður, þema sem þú bættir við í Packages › Add, úr safninu, með GitHub-hlekk, .zip-skrá eða möppu, eða þau sem síðan sjálf hefur. Ef eigin stílblað þema gerir síðuna erfiða aflestrar skaltu slökkva þar á valkostinum **Eigin stíll þemans**: Stillingar birtast alltaf án hans, á slóð síðunnar með `#/settings/page` aftan við.

Þegar sögumaðurinn spyr þig einhvers helst borðinn hans efst, sama í hvaða hluta þú ert.

---

## 5. Leikjakerfi og húsreglur <!-- icon: dice -->

### 5.1 Hvað leikjakerfi er

Gögn eins leiks: persónublaðið, tölurnar, skepnurnar, hlutirnir, galdrarnir og reglutextinn. Hver herferð spilar eitt kerfi. RPG Engine reiknar út persónublaðið og það sem er eytt og það sem kemur aftur. Sögumaður les í reglunum hvernig eiginleiki virkar og ákveður það, eins og við borðið.

### 5.2 Fimmta útgáfa

Kynþættir, flokkar, undirflokkar, bakgrunnur og eiginleiki (feat) úr SRD 5.1; galdrarnir 319, vopnin, herklæðin, töfragripirnir og skrímslin; reglukaflarnir, sem sögumaður les eftir nákvæmum texta þeirra; fullt persónublað, útreiknað.

Þetta er sérstakur pakki: sögumaður býður hann þegar þú setur upp herferð og setur hann upp. Herferð sem spilar hann setur hann upp sjálf í fyrsta sinn sem hún er opnuð í tölvu sem hefur hann ekki, og sögumaður segir þér frá því.

Þú getur líka spilað efni sem SRD vantar, úr bók sem þú átt: sögumaður skrifar það sem síður í herferðinni þinni og RPG Engine meðhöndlar það eins og sitt eigið. RPG Engine fylgir aðeins opið efni; þekking sögumanns er ekki takmörkuð.

Þínar eigin reglubækur geta verið safnið þitt: segðu sögumanni hvar þær eru, *[Reglubækurnar mínar eru í D:\Books\5e.]*, eða bættu möppunni þeirra við í Pakkar › Safn og segðu já í glugganum sem tölvan sýnir, einu sinni. RPG Engine les þær á þessari tölvu; hver herferð notar þær möppur sem þú kveikir á þar, og sögumaður leitar í þeim þegar hann ákveður reglu, á eftir SRD, og vísar í bókina og blaðsíðuna. Þær lesast best sem texti eða sem PDF-skjöl þar sem hægt er að velja textann; skönnuð PDF-skrá er lesin úr myndum síðnanna, aðeins í Windows, á nokkrum mínútum og með nokkrum villum. RPG Engine breytir aldrei reglubókunum þínum, sendir texta þeirra aldrei neitt og afritar hann aldrei í herferð.

### 5.3 Húsreglur og þínar eigin viðbætur

Biddu sögumann: *[Húsregla: náttúrulegur 1 í árás þýðir að þú missir vopnið.]* Sögumaður geymir það sem samkomulag borðsins, eða skrifar síðu eða tölu á persónublaðið þegar þess þarf. Húsreglur sem þegar eru skrifaðar má setja sem textaskrár í `rules` möppu herferðarinnar.

Þegar sögumaður breytir síðu í leikjakerfinu fyrir herferðina þína, til dæmis lífspunktum skepnu eða drægi galdurs, merkir mælaborðið breytinguna með lítilli stjörnu á eftir nafninu hvar sem það birtist. Pakkar › Uppsettar sýnir hvað var breytt, undir leikjakerfinu, við hlið þess sem kerfið gaf; skepna sem persónan þín þekkir ekki birtist þar aðeins undir nafni. Þar geturðu sett síðu aftur eins og kerfið skrifar hana, þegar atriðinu sem er í gangi er lokið; mælaborðið getur ekki afturkallað breytinguna, aðeins sögumaður getur skrifað hana aftur.

### 5.4 Að bæta við eða flytja inn eigið leikjakerfi

Leikjakerfi er pakki: sögumaður setur hann upp úr npm, möppu eða skrá, og pakka sem er ekki frá okkur aðeins með þínu já, í eyðublaði umboðsmannsins þíns eða glugga tölvunnar. Að búa til slíkan pakka er verk forritara og er lýst í skjölum RPG Engine á GitHub. Að breyta bók eftir þig í leikjakerfi er ekki komið enn ([Væntanlegt síðar](#9-coming-later)).

---

## 6. Viðbætur <!-- icon: plus -->

Viðbót bætir einhverju við herferð ofan á leikjakerfið hennar: eiginleika eins og veðrið, sem breytist við hverja dögun, eða það að opna lás með teningum. Þú bætir viðbót við í Pakkar › Bæta við, annaðhvort af listanum eða með nafni hennar á npm, úr möppu eða úr skrá. Viðbót frá öðrum en okkur inniheldur kóða og bætist aðeins við með þínu samþykki, í glugga í tölvunni þinni. Ef viðbót er gerð fyrir annað leikjakerfi, segir hún til um það og er ekki bætt við. Í Pakkar › Uppsettar uppfærir þú viðbót eða fjarlægir hana. Sögumaðurinn getur líka bætt við viðbót ef þú biður um það.

---

## 7. Hvaðan herferð kemur og tungumál hennar <!-- icon: world -->

### 7.1 Þrjár leiðir til að eignast heim

- **Búinn til jafnóðum**: út frá forsendu þinni byggir sögumaðurinn hvern stað, hverja persónu og hvern söguþráð rétt áður en þú þarft á honum að halda, og geymir hann.
- **Undirbúinn í upphafi**: það sama, en heimurinn er byggður fyrir spilun.
- **Úr þínu eigin ævintýri eða bók**: gefðu sögumanninum skrána, *[Fluttu þetta ævintýri inn sem herferðina okkar: D:\Books\adventure.pdf. Segðu mér ekkert af því sem stendur í því.]* Skrá utan herferðarinnar er aðeins lesin eftir að þú segir já í glugga á tölvunni þinni; skrá sem þú setur í möppuna **inbox** í herferðinni er lesin strax. Best er að hún sé texti, EPUB, Word-skjal eða PDF þar sem hægt er að velja textann; skönnuð PDF er lesin af myndum síðnanna, aðeins á Windows, hægt og með nokkrum villum. Gervigreindarforritið þitt les hana utan spjallsins, annars sögumaðurinn í spjallinu, á þinni áskrift: í Claude Code eða Codex les annað þeirra hana, í Antigravity þitt Antigravity, í OpenCode líkanið sem þú valdir síðast í því. Allt skjalið fer til framleiðanda þess sem les það, samkvæmt skilmálum reikningsins þíns og vali hans um þjálfun. Yfirlitið sýnir hvernig gengur; úr skáldsögu leggur sögumaðurinn til hvar á að byrja. Hann skrifar staðina, persónurnar og leyndarmálin.

Herferð er spiluð einu sinni: til að spila sama ævintýrið aftur skaltu búa til nýja herferð.

### 7.2 Tungumál

Eitt tungumál fyrir hverja herferð, tungumál sögumannsins, sem stjórnborðið fylgir. Stjórnborðið kemur á 26 tungumálum. Hvert annað tungumál er þýtt á tölvunni þinni af gervigreindarforritinu þínu utan spjallsins (Codex eða Claude Code; í Antigravity og OpenCode þeirra eigin forriti), eða, þar sem ekkert þeirra getur það, af sögumanninum í spjallinu. Hugtök fimmtu útgáfu á ítölsku koma úr opinberu ítölsku SRD-útgáfunni. Reglutextinn er áfram á ensku og sögumaðurinn segir frá honum á þínu tungumáli.

---

## 8. Fyrir forvitna: herferðarmappan <!-- icon: list -->

Þú þarft aldrei að opna hana, og hún geymir leyndarmál herferðarinnar þinnar. Í henni eru `campaign.yaml` (stillingarnar þínar), `state.yaml` (staða leiksins), `world/` (ein markdown-síða fyrir hverja persónu, stað, verkefni og annað), `rules/` (húsreglurnar þínar), `images/`, `log.jsonl` (hver breyting), `sessions/` (spjöllin þín við sögumanninn sem texti, úr Claude Code og Codex), `.saves/`, `.player/` (minnisblöðin þín) og litlu skrárnar sem segja gervigreindarumboðsmönnum hvar RPG Engine er. Síðurnar nota snið Obsidian. Ef þú breytir síðu í höndunum fréttir sögumaðurinn af því í næsta svari sínu.

RPG Engine heldur sig í þessari möppu: það les og skrifar leikinn aðeins þar og snertir aldrei aðrar skrár þínar; möppur reglubókanna þinna les það aðeins. Utan hennar geymir það aðeins eigin gagnamöppur (þýðingar stjórnborðsins, textann sem það las úr reglubókunum þínum, og Codex eða Claude Code ef þú leyfir því að setja þau upp) og tímabundnar möppur meðan mynd er teiknuð. Allt annað sem umboðsmaðurinn þinn vill gera í tölvunni þinni spyr hann þig um fyrst. Leikjakerfi eða viðbót er kóði, eins og allir npm-pakkar: pakki sem er ekki frá okkur keyrir á tölvunni þinni með þínum réttindum, og RPG Engine setur hann aðeins upp með þínu já, í eyðublaði umboðsmannsins þíns eða glugga tölvunnar. Segðu aðeins já við pökkum þar sem þú treystir höfundunum.

Sérhver skipun sem sögumaður notar má líka keyra í herferðarmöppunni: `rpg --help` sýnir þær allar. Margar þeirra prenta leyndarmál herferðarinnar.

---

## 9. Væntanlegt <!-- icon: hourglass -->

- **Þú sem sögumaður**, með gervigreindina í hlutverki hópsins.
- **Höfundahamur**: skrifaðu ævintýri með gervigreindinni, fluttu það síðan út og deildu því.
- **Margir spilarar í sömu tölvu**, hver með sína persónu, sem skiptast á í sama spjalli.
- **Fleiri viðbætur**: heimar, eiginleikar og húsreglur til að deila.
- **Aðrir leikir**: fleiri leikjakerfi, og þín eigin.

---

## 10. Spurningar og vandamál <!-- icon: info -->

### Spurningar

**Þarf ég að kunna reglurnar?** Nei. Veldu kennslu sem leiðbeinanda og spurðu með `[OOC: …]` hvenær sem þú vilt.

**Getur sögumaðurinn svindlað?** Hann getur ekki breytt kasti sem RPG Engine gerði, nema á erfiðleikastiginu saga, né staðreyndum sem þegar hafa verið ákveðnar.

**Kostar það eitthvað?** RPG Engine er ókeypis. Sögumaðurinn keyrir á áskrift gervigreindarforritsins þíns, eða á þinni eigin tölvu með staðbundnu líkani. Kvöld í spilun er langt spjall: á minnstu áskriftunum gætirðu náð mörkum áskriftarinnar áður en kvöldið er á enda. Myndir, þýðingar og innflutningur nota sömu áskrift. RPG Engine sjálft notar aldrei API-lykil, sem er greiddur fyrir hvert kall: skráðu gervigreindarforritið þitt inn með reikningnum þínum, ekki með lykli.

**Get ég spilað í símanum?** Nei: sögumaðurinn keyrir á tölvunni þinni og mælaborðið opnast aðeins þar.

**Get ég spilað með vinum?** Ekki enn: í dag er einn spilari, ein persóna, auk félaga ([Væntanlegt síðar](#9-coming-later)).

**Get ég notað aðra gervigreind næst?** Já: veldu annað forrit í spjallinu áður en þú opnar það, eða opnaðu herferðina í öðru forriti og skrifaðu *Halda áfram*.

### Vandamál

**Herferð opnast ekki.** Opnaðu RPG Engine aftur með tákninu, eða með `rpg open` í skipanaglugga, og smelltu á herferðina. Ef yfirlit hennar segir *Not connected* skaltu ýta á **Opna herferðina aftur**. Spjald sem segir **Mappa fannst ekki** hefur misst möppuna sína: taktu það af listanum og bættu henni við aftur með **Opna möppu…** þar sem hún er núna. Í spjalli gervigreindarforritsins sjálfs virkar yfirlitið aðeins meðan spjall þeirrar herferðar er opið: spurðu sögumanninn `[OOC: Hver er hlekkurinn á yfirlitið?]`. Í Claude appinu fer spjall sem hefur verið látið liggja í bakgrunni um tíma að sofa, og síðan með því: smelltu á spjallið og þá kemur síðan aftur á sama vistfangi.

**Sögumaðurinn virðist ekki þekkja leikinn.** Þetta gerist í spjalli gervigreindarforritsins sjálfs: það hlóð ekki RPG Engine. Athugaðu að þú ræstir það í herferðarmöppunni og treystir henni. Í Claude Code skaltu skrifa `/mcp` og tengja `rpg` aftur. Í Codex verður `codex mcp list` í herferðarmöppunni að sýna `rpg`. Ef `rpg --version` finnst ekki skaltu setja RPG Engine upp aftur ([2.2](#22-install)).

**Windows finnur ekki `claude`.** Þetta gerist þegar þú settir Claude Code upp sjálf/ur. Uppsetningarforritið þess segir frá því í gulum reit, ásamt möppunni sem það fór í: bættu þeirri möppu við PATH (Kerfiseiginleikar > Umhverfisbreytur) og opnaðu síðan nýjan skipanaglugga.

**Uppfærsla.** Þegar nýrra RPG Engine er komið út segir yfirlitið frá því: í Packages › Installed er RPG Engine fyrst, með **Uppfæra**; gerðu síðan það sem síðan segir þér. Eða keyrðu `npm install -g rpg-engine` aftur í skipanaglugga og opnaðu síðan nýtt spjall: sögumaður sem er í gangi heldur þeirri útgáfu sem hann ræsti með.

**Sögumaðurinn man eitthvað sem ég afturkallaði.** Opnaðu nýtt spjall og ýttu á **Ég opnaði nýtt spjall** í Vistanir.

**Forrit setst ekki upp.** Síðan segir hvers vegna: ýttu á **Reyna aftur**. Eða settu það upp af vef framleiðandans og ýttu síðan á **Athuga aftur**.

**Innskráningarsíðan opnast ekki í vafranum.** Meðan síðan bíður eftir þér skaltu ýta á **Opna innskráningarsíðuna aftur** þar sem hún birtist, eða **Hætta við** og reyna aftur.

**Spjallið í yfirlitinu segir að annað spjall sé í gangi.** Spjall sem þú opnaðir sjálf/ur í gervigreindarforritinu þínu spilar þessa herferð: haltu áfram þar, eða lokaðu því til að spila í yfirlitinu.

**Engar myndir birtast.** Stillingar > Herferð > Myndir segir hvort þessi tölva getur gert þær og hvernig.

**Uppsetning mistekst, eða `rpg` ræsist ekki.** `node --version` verður að sýna 24 eða nýrra. Ef Windows svarar að keyrsla skripta sé óvirk, sjá [2.1](#21-what-you-need). Á Windows skaltu halda RPG Engine og herferðunum þínum frá slóðum sem innihalda `&`.

**Hlekkurinn á yfirlitið breyttist.** Í spjalli gervigreindarforritsins sjálfs hefur hver herferð sitt eigið vistfang, það sama spjall eftir spjall. Það breytist aðeins þegar annað forrit er þegar að nota það: sögumaðurinn gefur þér nýja hlekkinn og eftir það helst hann. Annað spjall í sömu herferð heldur síðunni á sama vistfangi og tekur hana yfir þegar þú lokar því fyrsta.
