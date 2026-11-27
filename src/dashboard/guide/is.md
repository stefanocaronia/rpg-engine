<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: heildarleiðbeiningar

**RPG Engine** lætur þig spila borðhlutverkaleik með **gervigreind sem sögumann**. Þú spilar í **yfirlitinu**, glugga á tölvunni þinni með persónublaðinu þínu, teningunum, kortunum, dagbókinni og **spjallinu** við sögumanninn.

Þessar leiðbeiningar segja þér hvernig á að spila. Síðan útskýrir hnappana sína sjálf: haltu bendlinum yfir hnapp til að sjá hvað hann gerir.

## Fljótleg byrjun <!-- icon: send -->

1. Settu upp **Node.js** frá [nodejs.org](https://nodejs.org) (LTS-útgáfuna).
2. Opnaðu nýjan skipanaglugga og skrifaðu `npm install -g rpg-engine`. Ef Windows segir að keyrsla skripta sé óvirk skaltu skrifa `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svara já og reyna aftur.
3. Skrifaðu `rpg open`: það setur tákn RPG Engine á skjáborðið ([2.2](#22-installing)). Eftir það ræsirðu RPG Engine með tákninu.
4. Ýttu á **Ný herferð**, gefðu henni nafn og ýttu á **Búa til** ([2.3](#23-a-new-campaign)).
5. Veldu í spjallinu gervigreindarforritið þitt og líkan þess ([2.4](#24-connect-your-ai)): Claude Code krefst greiddrar Claude-áskriftar, Codex ChatGPT-reiknings, ókeypis eða greidds. Ýttu á **Opna spjallið** og svo á **Byrja**.

Fyrsta svarið getur tekið nokkrar mínútur. Síðan spyr sögumaðurinn hvernig þú vilt spila og þið búið til persónuna saman.

## 1. Hvað RPG Engine er <!-- icon: about -->

| Hver | Hvað gerir hann |
|---|---|
| **Þú** | Þú spilar persónuna þína: hvað hún gerir, segir og reynir. |
| **Sögumaður** (gervigreindin) | Segir söguna, leikur alla aðra, ákveður hvað gerist og biður um köst. |
| **RPG Engine** | Geymir heiminn í skrám, kastar teningunum, telur lífsstig, peninga, tíma og vegalengdir og heldur leyndarmálum földum þar til þú uppgötvar þau. |

Heimurinn helst eins frá einu kvöldi til þess næsta, jafnvel í nýju spjalli, jafnvel með annarri gervigreind:

- **Það sem hefur verið sagt stendur.** Dauður óþokki helst dauður.
- **Teningarnir eru raunverulegir.** Sögumaðurinn getur ekki breytt þeim, nema á léttasta erfiðleikastiginu.
- **Leyndarmál haldast leyndarmál.** Sögumaðurinn segir þér aldrei það sem persónan þín veit ekki.
- **Heimurinn hreyfist.** Ógnir færast nær á meðan þú hvílist eða ferðast.
- **Herferð er mappa** á tölvunni þinni: þú hættir hvenær sem þú vilt og heldur áfram síðar.

Leikur kemur sem leikjakerfi: núna er það okkar **fimmta útgáfa**, úr ókeypis System Reference Document 5.1. Án leikjakerfis spilar þú frjálst, sögu án talna.

---

## 2. Að byrja <!-- icon: path -->

### 2.1 Það sem þú þarft

- Tölva með Windows, macOS eða Linux.
- **Node.js 24** eða nýrra, frá [nodejs.org](https://nodejs.org).
- **Skipanagluggi**, aðeins til að setja upp: á Windows Terminal eða PowerShell, á macOS Terminal.
- **Gervigreindarforrit** fyrir sögumanninn, með þínum eigin reikningi ([2.4](#24-connect-your-ai)).

### 2.2 Uppsetning

```text
npm install -g rpg-engine
rpg open
```

Fyrsta línan setur RPG Engine upp. Ef npm býðst til að uppfæra sig sjálft geturðu hunsað það.

`rpg open` opnar glugga RPG Engine. Í fyrsta skipti setur það líka tákn á skjáborðið og í valmyndina: eftir það ræsirðu forritið með tákninu. Til að fjarlægja það skaltu skrifa `rpg icon --remove`.

Ef uppsetningin mistekst skaltu athuga að `node --version` segi 24 eða hærra. Ef Windows segir að keyrsla skripta sé óvirk skaltu skrifa `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` og svara já. Á Windows skaltu hafa RPG Engine og herferðirnar þínar utan slóða sem innihalda `&`.

### 2.3 Ný herferð

Ýttu á **Ný herferð** og gefðu henni **Nafn**, **Tungumál** og **Leikjakerfi**. Sögumaðurinn býr til afganginn með þér. Ýttu á **Búa til**: herferðin opnast í sérstökum glugga.

Sögumaðurinn og yfirlitið tala tungumál herferðarinnar. Reglutexti fimmtu útgáfu helst á ensku og sögumaðurinn segir þér hann á þínu tungumáli.

Herferðin er mappa með nafni hennar, inni í möppunni `RPG Engine` í notandamöppunni þinni. Næst smellirðu á spjald hennar.

### 2.4 Tengja gervigreindina

Sögumaðurinn keyrir í **gervigreindarforriti** á tölvunni þinni, með þínum reikningi. Vefspjall eins og claude.ai eða ChatGPT dugar ekki: sögumaðurinn þarf að komast í skrár herferðarinnar.

- **Claude Code**: greidd Claude-áskrift (Pro eða hærri).
- **Codex**: ChatGPT-reikningur, ókeypis eða greiddur.
- **OpenCode**: enginn reikningur; nokkur ókeypis líkön í takmarkaðan tíma, eða líkön þíns eigin þjónustuaðila, líka staðbundin.
- **Antigravity**: Google-reikningur; ókeypis notkun hans hefur vikuleg mörk.

Veldu í spjallinu forritið, **Líkan** þess og **Hugsun sögumanns**. Ef forritið vantar eða innskráning vantar, setur hnappur það upp, skráir þig inn eða opnar vefsíðu þess. RPG Engine sér aldrei lykilorðið þitt.

Kvöld í spilun er langt spjall: á minnstu áskriftunum getur þú náð mörkunum áður en kvöldinu lýkur. Spilaðu með stærsta líkaninu sem þú átt: lítið líkan er auðveldara að fá til að ljóstra upp leyndarmálum.

Við spilum og prófum RPG Engine mest með **Claude Code**. Antigravity er **í prófun**: það getur stigið út úr leiknum og geymir spjöllin þín í minni sem ekki er hægt að slökkva á. Það sem þú skrifar þar fer til Google, sem gæti látið fólk lesa það. RPG Engine er ekki vara frá Google.

### 2.5 Fyrsta spjallið

Ýttu á **Opna spjallið** og svo á **Byrja**. Fyrsta svarið getur tekið nokkrar mínútur. Síðan fer ný herferð í gegnum þrjú stig:

1. **Stillingar**: sögumaðurinn spyr hvernig þú vilt spila, nokkrar spurningar í einu: hversu erfiður heimurinn er, hvort þú getur dáið, hvenær þú mátt fara til baka í vistun. Skrifaðu *Þú ákveður* til að láta hann velja. Allt má breyta síðar.
2. **Núllti fundur**: þú býrð til persónuna þína með sögumanninum, eins og við borð. RPG Engine sér um útreikningana á persónublaðinu. Ef þú átt nú þegar persónu skaltu líma persónublaðið hennar inn í spjallið.
3. **Spilun**: sögumaðurinn setur fyrsta atriðið.

### 2.6 Að spila í gervigreindarforritinu þínu

Þú getur líka spilað í spjalli gervigreindarforritsins sjálfs, í skipanaglugga eða í skjáborðsappi þess, með yfirlitið opið við hliðina.

1. Opnaðu skipanaglugga í möppunni þar sem þú geymir leikina þína: hægrismelltu á möppuna og veldu **Opna í Terminal** (Windows) eða **Þjónusta > Nýr Terminal við möppu** (macOS).
2. Skrifaðu `rpg init "The Salt Isles"`: það býr til möppuna `The Salt Isles` með nýrri herferð.
3. Ræstu forritið þitt í þeirri möppu: `claude`, `codex`, `agy` fyrir Antigravity, eða `opencode`. Segðu já þegar það spyr hvort þú treystir möppunni: í Claude Code er svarið sem er valið fyrirfram *No, exit*.
4. Skrifaðu *Hæ! Byrjum.* Sögumaðurinn gefur þér hlekkinn á yfirlitið þitt: opnaðu hann við hliðina á spjallinu.

Gott að vita:

- Ekki opna upplýsingar um verkfærin sem forritið þitt notar (í Claude Code ctrl+o): þær geta sýnt leyndarmál.
- Í skjáborðsappi Codex skaltu slökkva á minni fyrir spjöll leiksins.
- Ef sögumaðurinn þekkir ekki leikinn skaltu skrifa `rpg init` í herferðarmöppunni og opna nýtt spjall.
- Ef Windows finnur ekki `claude` skaltu bæta möppunni sem uppsetningarforritið nefndi við PATH og opna svo nýjan skipanaglugga.
- Eitt spjall í einu spilar herferð: meðan þitt er opið bíður spjallið í yfirlitinu.

---

## 3. Að spila <!-- icon: chat -->

### 3.1 Að tala við sögumanninn

Skrifaðu hvað persónan þín gerir eða segir:

> Ég spyr gestgjafann hver annar kom hér við í kvöld.

Þú segir hvað þú reynir; sögumaðurinn segir hvað gerist. Sögumaðurinn ákveður aldrei neitt fyrir persónuna þína.

Utan sögunnar skrifarðu `[OOC: …]` (utan persónu): *[OOC: Hvernig virka glímutök?]* Þú getur spurt sögumanninn um reglurnar eða hvernig yfirlitið virkar.

Þegar sögumaðurinn spyr þig einhvers geturðu svarað með hnöppunum hans eða með þínum eigin orðum. Þú getur líka athafnað þig af persónublaðinu: smelltu á vopn, galdur eða hlut og veldu hvað þú gerir.

**Varanleg fyrirmæli**: segðu félögum þínum eitthvað sem á að gilda áfram, til dæmis *Héðan í frá skaltu alltaf skilja einn eftir á lífi*. Sögumaðurinn man það þar til þú afléttir því.

### 3.2 Köst

Sögumaðurinn biður um kast aðeins þegar útkoman er óviss og skiptir máli. Borði sýnir kastið: smelltu á hann og teningarnir falla.

Teningarnir tilheyra RPG Engine, ekki sögumanninum. Þú getur alltaf spurt *[Var þetta kast raunverulegt?]*: jafnvel fyrir leynilegt kast getur sögumaðurinn sannað að það var gert áður en þú spurðir.

Þegar stillingin **Teningar** er á líkamlegum kastarðu þínum eigin teningum og skrifar útkomuna: *[Ég kastaði 14.]* Köst sem þú gerir til gamans, af persónublaðinu eða með **Frjálst kast**, telja aldrei.

### 3.3 Atriði, bardagar og ferðalög

Sagan gengur fram í **atriðum**: bardaga, samtali, ferðalagi eða hvíld. Í lok hvers atriðis vistast leikurinn sjálfkrafa og atriðið fer í dagbókina þína.

Í bardaga leikur sögumaðurinn hverja röð sem er ekki þín og stoppar þegar þú þarft að ákveða.

Segðu hvert þú ferð, *Við förum veginn norður til Rocca*: RPG Engine reiknar út vegalengdina og dagana og stoppar ef eitthvað gerist á leiðinni. Á meðan halda áætlanir skúrkanna áfram og þú sérð merki þeirra.

### 3.4 Vistanir

RPG Engine vistar herferðina í lok hvers atriðis. Stillingin **Vistanir** ræður hvenær þú mátt fara til baka:

- **varanlegur dauði**: aldrei.
- **vistunarpunktur**: á síðustu vistun, aðeins þegar persónan þín deyr.
- **laust**: á hvaða vistun sem er, og þú getur vistað hvenær sem þú vilt.

Í öllum stillingum geturðu byrjað upp á nýtt, í spjallinu eða í **Vistanir**.

Eftir að þú ferð til baka skaltu opna nýtt spjall, því gamla spjallið man það sem var afturkallað:

1. Ýttu á **Loka spjallinu** og svo á **Nýtt spjall**. Í spjalli gervigreindarforritsins sjálfs skaltu opna nýtt samtal (`/clear` í Claude Code).
2. Skrifaðu *Halda áfram*.
3. Ýttu á **Ég opnaði nýtt spjall** í Vistanir. Þar til það er gert bíður sögumaðurinn.

### 3.5 Að hætta og halda áfram

Hættu hvenær sem þú vilt: allt er þegar vistað. Lokaðu glugga yfirlitsins og stuttu síðar stöðvast leikurinn. Ekkert tapast.

Til að koma aftur skaltu opna RPG Engine með tákninu og smella á herferðina þína. Ýttu á **Halda spjallinu áfram** og svo á **Halda sögunni áfram**: sögumaðurinn segir þér hvar þú varst og heldur áfram. Næst geturðu líka valið annað gervigreindarforrit.

### 3.6 Mörk og stopp

**Línur** birtast aldrei í leiknum; **slæður** gerast aðeins utan sviðs. Þú stillir þær í **Stillingar**.

Hvenær sem er geturðu skrifað *[stopp]*: sögumaðurinn sleppir því efni og bætir því við línurnar þínar.

### 3.7 Myndir

Sögumaðurinn getur látið gera myndir af stöðum, verkefnum og fólki, eins og stillingin **Myndir** segir til um, og andlitsmynd af persónunni þinni þegar þú biður um það. Gervigreindarforritið þitt býr þær til, á þinni áskrift. Ef engar birtast segir **Stillingar** hvort þessi tölva getur gert þær.

Þú getur líka gefið persónunni þinni, eða síðu í heiminum, mynd að eigin vali, af síðunni sjálfri.

---

## 4. Mælaborðið <!-- icon: party -->

Glugginn þar sem þú sérð leikinn þinn. Hann sýnir aðeins það sem persónan þín veit.

- **Leikur**: spjallið við sögumanninn, þegar það er ekki við hlið síðunnar.
- **Hópur**: persónublaðið þitt, blöð félaga þinna og köstin.
- **Atriði**: hvar þú ert, hverjir eru þar og kortið; í bardaga raðirnar.
- **Dagbók**: verkefni, sagan sem bók, dagbækur félaga þinna og minnisblöðin þín.
- **Heimur**: heimskortið, það sem persónan þín veit, skjölin sem hafa fundist og dagatalið.
- **Vistanir**: að fara til baka og byrja upp á nýtt.
- **Stillingar**: hvernig þú spilar og hvernig síðan lítur út.
- **Pakkar**: leikjakerfið, viðbætur, handbækurnar þínar og uppfærslur: þegar ný útgáfa af RPG Engine kemur segir það hér.

Ef síðan segir að hún sé ekki tengd skaltu ýta á **Opna herferðina aftur**.

Til að spila úr símanum heima: farðu í **Stillingar**, síðan í **Yfirlit**, kveiktu á **Aðgangur úr síma** og miðaðu símanum á kóðann. Síminn þarf að vera á sama Wi-Fi og tölvan. Windows gæti spurt hvort Node.js megi nota netið: leyfðu það á einkanetum og stilltu Wi-Fi sem einkanet. Leikurinn berst ódulkóðaður: notaðu hann aðeins á neti sem þú treystir, eins og heimanetinu þínu, aldrei á opinberu Wi-Fi, hótelneti eða skrifstofuneti. Slökktu á þessu þegar þú hættir: leikurinn endar með síðasta glugga tölvunnar.

Ef þema gerir síðuna erfiða aflestrar skaltu bæta `#/settings/page` aftan við slóð hennar og slökkva á valkostinum **Eigin stíll þemans**.

---

## 5. Reglur, handbækur og viðbætur <!-- icon: dice -->

**Leikjakerfi** er gagnasafn eins leiks: persónublaðið, verur, hlutir, galdrar og reglur. RPG Engine reiknar út persónublaðið. Sögumaðurinn les hvernig regla gildir og ákveður það, eins og við borðið.

**Fimmta útgáfa** inniheldur frjálsu reglurnar úr System Reference Document 5.1. Þú getur líka spilað efni úr bók sem þú átt: sögumaðurinn skrifar það inn í herferðina þína.

**Handbækurnar þínar**: Segðu sögumanninum hvar þær eru, eða bættu möppunni þeirra við í **Pakkar**. Sögumaðurinn flettir upp reglum í þeim og vísar í bókina og blaðsíðuna. RPG Engine breytir þeim aldrei og afritar þær aldrei inn í herferð.

**Húsreglur**: Biddu sögumanninn, *[House rule: a natural 1 on an attack means you drop your weapon.]* Hann man regluna. Úrskurður, sem hann gefur einu sinni, gildir líka næst.

**Viðbætur** bæta einhverju við leikinn, til dæmis veðri. Bættu þeim við í **Pakkar** eða biddu sögumanninn um það.

---

## 6. Þitt eigið ævintýri <!-- icon: world -->

Ef þú ert ekki með skrifaðan heim býr sögumaðurinn til heim út frá forsendunni þinni og heldur honum.

Til að spila ævintýri eða bók sem þú átt skaltu gefa sögumanninum skrána: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Skrá utan herferðarinnar er aðeins lesin eftir að þú hefur samþykkt það. Best er að hún sé á textaformi, EPUB, Word eða PDF þar sem hægt er að velja textann.

Allt skjalið fer til fyrirtækisins sem rekur gervigreindina sem les það. Herferð er spiluð einu sinni: til að spila sama ævintýri aftur skaltu búa til nýja herferð.

---

## 7. Gögnin þín <!-- icon: lock -->

- Herferð er mappa. Í henni eru leyndarmál herferðarinnar og líka samtölin þín við sögumanninn. Þú þarft aldrei að opna hana.
- RPG Engine les og skrifar aðeins í þessari möppu. Handbækurnar þínar les það aðeins. Allt annað utan herferðarinnar aðeins eftir að þú hefur samþykkt það, í glugga í tölvunni þinni.
- Í spjalli stjórnborðsins opnar sögumaðurinn engar skrár frá þér að eigin frumkvæði.
- Það sem þú skrifar fer til fyrirtækisins sem rekur líkanið sem leikur sögumanninn, samkvæmt skilmálum reikningsins þíns. Með staðbundnu líkani helst það í tölvunni þinni.
- Leikjakerfi eða viðbót sem er ekki frá okkur er kóði sem keyrir á tölvunni þinni. Hann kemur aðeins með samþykki þínu. Samþykktu aðeins höfunda sem þú treystir.
- Ef herferðarmappan er git-safn getur **Stillingar** vistað breytingar í það fyrir þig. Hleyptu spjallinu þínu inn aðeins ef safnið er einkasafn.
- Þegar kveikt er á **Aðgangur úr síma** fer leikurinn ódulritaður úr tölvunni í símann um heimanetið þitt, án nokkurrar utanaðkomandi þjónustu. Hver sem er á því neti gæti lesið hann.
