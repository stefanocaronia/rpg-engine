<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 21501b79 75985e6d ece214f0 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
# RPG Engine: täydellinen opas

**RPG Engine** antaa sinun pelata pöytäroolipeliä, jossa **tekoäly toimii pelinjohtajana**. Keskustelet pelinjohtajan kanssa **keskustelussa**. RPG Engine työskentelee taustalla: se **muistaa maailman**, **heittää nopat** ja **pitää kirjaa**. Keskustelun rinnalla pidät selaimessa auki sivua, **kojelautaa**, jossa ovat hahmolomake, nopat, kartat ja päiväkirja.

Tämä opas on pelaajille: ohjelmointitaitoja ei tarvita.

## Pika-aloitus <!-- icon: send -->

1. Asenna **Node.js** osoitteesta [nodejs.org](https://nodejs.org) (LTS-versio).
2. Asenna **tekoälyagentti**, ohjelma, jossa pelinjohtaja toimii, ja kirjaudu sisään: esimerkiksi Claude Code tai Codex ([2.4](#24-connect-your-ai)).
3. Asenna RPG Engine päätteessä: `npm install -g rpg-engine`.
4. Luo kampanja: `rpg init "The Salt Isles"`.
5. Siirry uuteen kansioon komennolla `cd "The Salt Isles"` ja käynnistä agentti siellä: `claude` Claude Codelle, `codex` Codexille. Vastaa myöntävästi, kun se kysyy, luotatko kansioon ([2.4](#24-connect-your-ai)), ja kirjoita sitten *Hei! Aloitetaan.* Pelinjohtaja vastaa antamalla kojelaudan linkin.

## 1. Mikä RPG Engine on <!-- icon: about -->

| Kuka | Mitä tekee |
|---|---|
| **Sinä** | Pelaat hahmoasi: mitä hahmo tekee, sanoo ja yrittää. |
| **Pelinjohtaja** (tekoäly) | Kertoo tarinaa, esittää kaikkia muita, päättää mitä tapahtuu ja pyytää heittoja. |
| **RPG Engine** | Pitää maailman tiedostoissa, heittää nopat, laskee osumapisteet, rahat, ajan ja etäisyydet sekä pitää salaisuudet piilossa, kunnes ne paljastuvat. |

Maailma pysyy samana illasta toiseen, vaikka keskustelu vaihtuisi tai tekoäly olisi toinen:

- **Sanottu pysyy totena.** Kuollut konna pysyy kuolleena.
- **Nopat ovat aitoja.** Pelinjohtaja ei voi vääntää niitä, paitsi helpoimmalla vaikeustasolla, jos valitset sen.
- **Salaisuudet pysyvät salaisina.** Pelinjohtaja ei koskaan kerro, mitä hahmosi ei tiedä.
- **Maailma liikkuu.** Uhat etenevät, kun lepäätte tai matkaatte, ja näet niiden merkit.
- **Kampanja on kansio** tietokoneellasi: voit lopettaa milloin haluat ja jatkaa myöhemmin.

Nykyisin RPG Engine pelaa yhtä pelijärjestelmää, **viidettä editiota**, ilmaisesta System Reference Document 5.1 -aineistosta. Muita on tulossa ([Tulossa myöhemmin](#9-coming-later)).

---

## 2. Aloittaminen <!-- icon: path -->

### 2.1 Mitä tarvitset

- Tietokone, jossa on Windows, macOS tai Linux, sekä verkkoselain.
- **Node.js 22** tai uudempi, osoitteesta [nodejs.org](https://nodejs.org). Mukana tulee `npm`, jolla RPG Engine asennetaan.
- **Pääte**: Windowsissa Terminal tai PowerShell, macOSissa Terminal. Voit avata päätteen kansioon napsauttamalla kansiota hiiren kakkospainikkeella ja valitsemalla **Open in Terminal** (Windows) tai **Services > New Terminal at Folder** (macOS).
- **Tekoälyagentti** pelinjohtajaa varten ([2.4](#24-connect-your-ai)). Valitse sen tarjoamista malleista **suurin**: pienemmän mallin saa helpommin paljastamaan salaisuuksia tai taivuttamaan sääntöjä.

### 2.2 Asennus

```text
npm install -g rpg-engine
```

Komento `rpg --version` näyttää, onnistuiko asennus. Käytät komentoa `rpg` kerran kampanjaa kohden, kampanjan luomiseen. Sen jälkeen agenttisi käynnistää RPG Enginen itse.

### 2.3 Luo kampanja

Avaa pääte kansiossa, johon tallennat pelisi ([2.1](#21-what-you-need) kertoo, miten):

```text
rpg init "The Salt Isles"
```

Komento luo kansion `The Salt Isles`, jossa on uusi kampanja. Siirry kansioon komennolla `cd "The Salt Isles"`. Muista, missä kansio on: palaat siihen joka kerta, kun pelaat. Kaiken muun valitset myöhemmin, keskustelussa tai kojelaudalla. Komento `rpg init --help` listaa valinnat, joilla voit päättää joitakin asioita jo nyt, kuten `--language it` tai `--difficulty hard`.

Pelinjohtaja ei voi luoda kampanjaa puolestasi: ennen komentoa `init` mikään ei kerro agentillesi, missä RPG Engine on.

### 2.4 Yhdistä tekoälysi

Pelinjohtaja toimii **tekoälyagentissa**. Se on tekoälysovellus, päätteessä tai työpöydällä, joka voi käsitellä tietokoneesi tiedostoja, esimerkiksi Claude Code tai Codex. Tavallinen keskustelupalvelu, kuten claude.ai tai ChatGPT, tai puhelinsovellus ei riitä: pelinjohtajan täytyy päästä käsiksi kampanjan tiedostoihin tietokoneellasi. Jokainen agentti tarvitsee oman tilauksensa ja kirjautumisensa: Claude Code maksullisen Claude-tilauksen, Codex ChatGPT-kirjautumisen. Asennat agentin kerran sen omalta sivulta: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: kirjoita kampanjakansiossa `claude`. Kun se kysyy, luotatko kansioon, valitse **Yes, I trust this folder**. Varo: valmiiksi valittuna on vastaus *No, exit*.
- **Codex**: kirjoita kampanjakansiossa `codex` ja vastaa kyllä, kun se kysyy, luotatko kansioon. Tarkista sen työpöytäsovelluksen asetuksista, että muistit ovat pois päältä pelin keskusteluissa.
- **Muu agentti**: käynnistä se kampanjakansiossa ja anna sille MCP-palvelin `rpg mcp`. RPG Engine on tavallinen MCP-palvelin: pelinjohtajaksi kelpaa mikä tahansa agentti, joka tukee MCP:tä, myös paikalliset.

Pelaamme ja testaamme **Claude Codella**. **Codex** on yhdistetty ja tarkistettu, mutta sillä ei ole vielä pelattu kokonaista kampanjaa. `init` valmistelee myös **Gemini CLI:n**. Kampanja kytkee pois agentin oman muistin: peli elää sen tiedostoissa, jotta tallennukseen palaaminen palauttaa pelin oikeasti takaisin.

### 2.5 Ensimmäinen keskustelu

Kirjoita mitä tahansa, vaikka *Moi! Aloitetaan.* Pelinjohtaja antaa jokaisen keskustelun ensimmäisessä vastauksessa **linkin kojelaudallesi**, joka on jotakin tämän tapaista: `http://127.0.0.1:4750`. Avaa se ja pidä se keskustelun vieressä.

Pelinjohtajan viestien välissä agenttisi näyttää käyttämänsä työkalut. Älä avaa niiden tietoja (Claude Codessa ctrl+o), sillä ne voivat paljastaa salaisuuksia.

Uusi kampanja käy läpi kolme vaihetta, jotka näkyvät kojelaudan yläreunassa: **1 Asetukset** (miten haluat pelata), **2 Nollasessio** (teet hahmosi, pelin kautta), **3 Peli**.

### 2.6 Asetukset: valitse, miten pelaat

Pelinjohtaja kysyy vain sen, mikä vielä puuttuu, muutaman kysymyksen kerrallaan. Kojelaudan **Asetukset**-vaihe näyttää samat kysymykset kortteina. Kirjoita "päätä sinä", niin pelinjohtaja valitsee. Kaiken voi muuttaa myöhemmin, keskustelussa tai kohdassa **Asetukset**.

| Asetus | Mitä se ratkaisee | Arvot |
|---|---|---|
| **Mentori** | Kuinka paljon pelinjohtaja opettaa sinulle sääntöjä | off, hints, tutorial |
| **Vaikeustaso** | Kuinka vaikea maailma on | story, easy, normal, hard, brutal |
| **Tappavuus** | Mitä taistelussa kaatuminen tarkoittaa | narrative (ei kuolemaa), epic (vain kun sillä on merkitystä), dice (nopat ratkaisevat) |
| **Tallennukset** | Milloin voit palata taaksepäin | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Tarkkuus** | Kuinka tarkasti ruoka, valo ja matkustaminen noudattavat sääntöjä | smooth, rules, simulation |
| **Nopat** | Kuka heittää nopat | digital, physical |
| **Mittayksiköt** | Etäisyydet ja painot | metric, imperial |
| **Voices** | Kuka puhuu tapaamiesi hahmojen puolesta: ratkaisevissa hetkissä hahmo itse, tietäen vain sen, minkä hahmo tietää, kuten pelinjohtaja valitsee; aina pelinjohtaja; tai aina hahmo itse, joko tärkeimmille tai kaikille, hitaammin ja kalliimmin, jos tekoälysovelluksesi sen sallii | auto, master, important, always |
| **Seuralaiset** | Kuka matkustaa kanssasi | none, made with you, made by the master, met in play |
| **Kuvat** | Kuvia paikoista, tehtävistä ja tapaamistasi hahmoista | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Rajat** ja **Verhot** | Mikä ei koskaan tule peliin ja mikä tapahtuu vain kuvaruudun ulkopuolella | listat |
| **Kieli** | Pelin ja kojelaudan kieli | mikä tahansa |

Viides editio lisää **etenemisen**: kokemuspisteet tai merkkipaalut.

Jos maailmaa ei ole kirjoitettu valmiiksi, pelinjohtaja kysyy myös **lähtökohdan** (tyylilaji, tunnelma ja muutama aihe omin sanoin) sekä **valmistelun**: rakennetaanko maailma lennossa pelin edetessä vai kokonaan alussa.

**Pelinjohtajan tyyliä** ei kysytä koskaan, mutta voit muuttaa sitä keskustelussa tai kohdassa **Asetukset**: **proosa** (selkeä, kirjallinen, roskakirjallisuus, kuivan humoristinen), **tarinat**, joita pelinjohtaja keksii (tilanteet, juonikaaret, jaksot, mysteeri), kirjailija, jonka **tyyliin kirjoitetaan**, tai mikä tahansa muu **omin sanoin**.

### 2.7 Nollasessio: hahmosi

Teet hahmosi yhdessä pelinjohtajan kanssa, kuten pelipöydän ääressä. Jokainen valinta on sinun, ellet pyydä pelinjohtajaa tekemään sitä. Voit tulla paikalle valmiin idean, epämääräisen aavistuksen tai tyhjän mielen kanssa. Pelinjohtaja kertoo, miten ominaisuuspisteet määräytyvät, ennen kuin yhtään noppaa heitetään. Taustatarinaa ei vaadita. Jos kerrot sellaisen, pelinjohtaja kirjoittaa sen sinun sanoillasi. Sen jälkeen pelinjohtaja pyytää kuvaa hahmostasi ([3.7](#37-your-characters-story-and-picture)). RPG Engine laskee hahmolomakkeen: sinun ei tarvitse laskea itse mitään.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Keskustelu pelinjohtajan kanssa

Kirjoita, mitä hahmosi tekee tai sanoo, omin sanoin:

> Kysyn majatalon isännältä, ketkä muut kävivät täällä tänä iltana.

Jos haluat puhua tarinan ulkopuolelta, kirjoita hakasulkeisiin: *[Miten kamppailu toimii?]* Pelinjohtaja vastaa myös hakasulkeissa.

Sinä kerrot, mitä yrität. Pelinjohtaja kertoo, mitä tapahtuu. Pelinjohtaja ei koskaan päätä hahmosi puolesta eikä puhu pelimoottorista. Voit kysyä pelinjohtajalta, miten kojelautaa käytetään.

### 3.2 Heitot

Pelinjohtaja pyytää heiton vain silloin, kun lopputulos on epävarma ja sillä on merkitystä. Ensin pelinjohtaja kertoo, mitä on pelissä. Sitten:

- **Kojelaudalla** banneri näyttää painikkeen jokaiselle heitolle, esimerkiksi *Acrobatics +4 · with advantage*. Napsauta sitä: nopat putoavat sivulle ja pelinjohtaja kuulee tuloksen. Voit myös napsauttaa hahmolomakkeen riviä, joka syttyy valoon, heittää nopat noppa-alustalta tai kirjoittaa bannerissa jotain muuta.
- **Käsin**, bannerin kulmassa tai kohdassa **Asetukset**: banneri kertoo, mitä heitetään, ja heität itse hahmolomakkeesta tai noppa-alustalta.
- **Fyysiset nopat**, kun noppa-asetuksena on fyysinen: kirjoitat heittämäsi silmäluvut, *[Heitin 14.]*, ja RPG Engine lisää muuntimesi.

**Vapaat heitot**: napsauta mitä tahansa lukua hahmolomakkeessa tai avaa noppa-alusta, niin voit heittää huvikseen. Ne eivät koskaan lasketa, eikä pelinjohtaja näe niitä.

**Pelinjohtajan heitot** näkyvät heittosarakkeessasi, salaisia lukuun ottamatta. Voit aina kysyä *[Oliko tuo heitto oikea?]*: salaisesta heitosta pelinjohtaja antaa sormenjäljen, joka todistaa heiton tehdyn ennen kysymystäsi.

### 3.3 Kohtaukset ja taistelut

Tarina etenee **kohtauksina**: taistelu, keskustelu, tutkiminen, matkustus, lepo. Jokaisen kohtauksen lopussa peli tallentaa itsestään, ja kohtaus siirtyy päiväkirjaasi.

Taistelussa pelinjohtaja kertoo jokaisen vuoron, joka ei ole sinun, ja pysähtyy kohtaan, jossa voit päättää. **Kohtaus** näyttää ylhäällä, kenen vuoro on ja kuka tulee seuraavaksi, sekä hahmosi kortin kartan vieressä. Vuorojärjestys, seurueesi osumapisteet ja se, kuinka haavoittuneilta viholliset näyttävät, sanoin kuvattuna, pysyvät sivun reunassa. Jos hahmosi kaatuu, kuolemanpelastusheitot näkyvät suurina sivulla.

### 3.4 Aika, matkustus ja maailma, joka liikkuu

RPG Engine pitää kirjaa päivämäärästä. Istuntojen välillä aika ei kulu. Sano, että lepäätte, *Lepäämme pitkän levon*, ja kun pelinjohtaja hyväksyy sen, lepo palauttaa sen, minkä pitääkin. Lyhyessä levossa pelinjohtaja voi kysyä kojelaudalla, montako osumanoppaa käytät: heitä ne yksi kerrallaan, katso, paljonko kukin parantaa, ja lopeta, kun haluat. Sano, minne menette, *Lähdemme pohjoiseen johtavaa tietä Roccaan*, niin RPG Engine laskee reitin, matkan ja päivät ja pysähtyy, kun matkalla tapahtuu jotain. Raha lasketaan pelin kolikoissa, vaihtorahat mukaan lukien.

Konnilla on suunnitelmia määräaikoineen. Joka uusi päivä pelinjohtaja siirtää uhkia, joita aika on edistänyt, ja näet niiden merkit, mutta et koskaan itse kelloa.

### 3.5 Kartat

**Maailma** näyttää paikat, jotka hahmosi tuntee, niiden väliset tiet ja kulkemasi reitin. Muu on sumun peitossa. **Kohtaus** näyttää sen paikan kartan, jossa olet, jos kartta on olemassa, ja kuka seisoo missä. Taistelussa omalla vuorollasi ruudut, joihin et ulotu, on verhottu. Kun pelinjohtaja kysyy, minne siirryt, kosketa ruutua tai kirjoita se, esimerkiksi *E4*.

### 3.6 Tehtävät, päiväkirja ja muistiinpanot

Tehtävä, jonka hahmosi ottaa vastaan, tulee **Päiväkirjaan** tehtäväksi tavoitteineen, määräaikoineen ja mittareineen. Merkitse se tähdellä, niin se pysyy näkyvissä Kohtauksen yläosassa. Päiväkirja kertoo myös **tarinasi** kohtaus kohtaukselta ja säilyttää **muistiinpanosi**: ne ovat yksityisiä, ellet **Jaa** jotakin. Pelinjohtaja kuulee jaetun muistiinpanon ajatuksenasi, ei koskaan tosiasiana.

### 3.7 Hahmosi tarina ja kuva

Hahmolomakkeen **Kuvaus**-kortissa on kenttä hahmosi tarinalle: pelinjohtaja kirjoittaa sen siihen, kun olet sanonut kyllä. Kuvaa varten anna pelinjohtajalle tiedosto (PNG, JPEG, WebP tai SVG, enintään 5 Mt) ja kerro, missä se on tietokoneellasi, tai teetä muotokuva ([3.11](#311-pictures)): *[Tee minulle muotokuva: harmaat hiukset letillä, arpi leuassa.]*

### 3.8 Tallennukset ja takaisin palaaminen

RPG Engine tallentaa koko kampanjan jokaisen kohtauksen lopussa. Loput ratkaisee **tallennus**-asetus:

| Tallennukset | Tallenna, kun haluat | Palaa takaisin |
|---|---|---|
| **permadeath** | ei | ei koskaan |
| **checkpoint** | ei | viimeiseen tallennukseen, vain kun hahmosi kuolee |
| **vapaa** | kyllä | mihin tahansa tallennukseen |

Kaikissa tiloissa voit **aloittaa alusta**, pelin alusta tai nollasessiosta. Tee se keskustelussa tai kohdassa **Tallennukset**.

Kun olet palannut taaksepäin, **avaa uusi keskustelu**: vanha muistaa sen, mikä peruttiin. Kirjoita uudessa keskustelussa *jatka*, ja paina sitten Tallennuksissa **Avasin uuden keskustelun**.

### 3.9 Istunnot: lopettaminen ja palaaminen

Lopeta milloin haluat: *[Lopetetaan tältä illalta.]* Kaikki on jo tallennettu tiedostoihin. Kun haluat palata, käynnistä agenttisi kampanjan kansiossa ja kirjoita *jatka*: pelinjohtaja antaa lyhyen kertauksen ja jatkaa.

### 3.10 Pelinjohtajan mieliala

Kojelaudan yläreunan robotti on pelinjohtaja: sen kasvot seuraavat tarinan sävyä eivätkä koskaan paljasta sitä, mitä et vielä tiedä. Kun keskustelu on suljettu, robotti nukkuu.

### 3.11 Kuvat

RPG Engine voi teettää kuvia paikoista, joihin saavut, tehtävistä, jotka otat vastaan, ja kohtaamistasi hahmoista, **kuvat**-asetuksen mukaan. Hahmosi muotokuvan se teettää, kun pyydät. Se käyttää sitä, mitä tietokoneellasi on, omalla kirjautumisellasi: **Codex** maalaa ne, muuten **Claude Code** piirtää ne. **Asetukset** kertoo, voiko tämä tietokone tehdä niitä, ja miten sen saa käyttöön, jos ei voi. Voit aina antaa pelinjohtajalle oman kuvasi.

### 3.12 Turvallisuus: rajat, verhot ja stop

**Rajat** eivät koskaan näy pelissä. **Verhot** tapahtuvat vain kuvan ulkopuolella. Voit milloin tahansa kirjoittaa *[stop]*: pelinjohtaja hylkää sen sisällön heti ja lisää sen rajoihisi.

### 3.13 Mielen muuttaminen

Jokaista asetusta voi muuttaa, keskustelussa tai kohdassa **Asetukset**. Päätös, jonka pelinjohtaja tekee ilman sääntökirjaa, muuttuu **ennakkotapaukseksi**, jotta sama kysymys saa ensi kerralla saman vastauksen.

---

## 4. Dashboard <!-- icon: party -->

Sivu omalla tietokoneellasi. Se avautuu vain tämän tietokoneen selaimessa ja on toiminnassa, kun keskustelu on auki. Kun keskustelu sulkeutuu, sivu näyttää *Not connected*. Se palaa itsestään seuraavan keskustelun mukana.

- **Seurue**: hahmolomakkeesi ja seuralaistesi lomakkeet. Napsauta lukua heittääksesi sen. Vie hiiri sen päälle nähdäksesi, mistä se tulee. Vieressä ovat heitot.
- **Kohtaus**: missä olet, paikan kuva ja kartta, ketä siellä on ja mitä tapahtuu. Taistelussa vuorot ja hahmosi kortti.
- **Päiväkirja**: tehtävät, tarina ja muistiinpanosi.
- **Maailma**: maailmankartta sellaisena kuin hahmosi sen tuntee.
- **Noppa-alusta**: valitse nopat ja muunnin, ja heitä.
- **Tallennukset**, **Ohje**, **Asetukset** ja **Tietoja** ovat kuvakkeina rivin lopussa. Asetuksissa ovat myös sivun omat valinnat: teema, noppien ääni ja noppasetti.

Kun pelinjohtaja kysyy sinulta jotain, sen banneri pysyy ylhäällä, missä tahansa osiossa oletkin.

---

## 5. Pelijärjestelmät ja kotisäännöt <!-- icon: dice -->

### 5.1 Mikä pelijärjestelmä on

Yhden pelin tiedot: sen hahmolomake, luvut, olennot, esineet, loitsut ja sääntötekstit. Jokainen kampanja pelaa yhtä järjestelmää. RPG Engine laskee hahmolomakkeen sekä sen, mitä kuluu ja mitä palautuu. Pelinjohtaja lukee säännöistä, miten ominaisuus toimii, ja päättää asiasta niin kuin pelipöydässä.

### 5.2 Viides laitos mukana

SRD 5.1:n rodut, hahmoluokat, alaluokat, tausta ja erikoistaito; 319 loitsua, aseet, panssarit, taikaesineet ja hirviöt; sääntöluvut, jotka pelinjohtaja lukee tarkalleen sellaisinaan; täysi hahmolomake laskettuna valmiiksi.

Voit pelata myös sisältöä, jota SRD:ssä ei ole, omistamastasi kirjasta: pelinjohtaja kirjoittaa sen kampanjasi sivuiksi, ja RPG Engine käsittelee sitä omanaan. RPG Engine sisältää vain avointa sisältöä, mutta pelinjohtajan tietämys ei rajoitu siihen.

Omat sääntökirjasi voivat olla kirjastosi. Kerro pelinjohtajalle, missä ne ovat, *[Sääntökirjani ovat kansiossa D:\Books\5e.]*, tai lisää niiden kansio kohdassa Packages › Library ja vastaa kerran myöntävästi tietokoneesi näyttämään ikkunaan. RPG Engine lukee kirjat tällä tietokoneella. Jokainen kampanja käyttää kansioita, jotka olet siellä ottanut käyttöön. Pelinjohtaja hakee niistä, kun ratkaisee sääntöä, SRD:n jälkeen, ja mainitsee kirjan ja sivun. Kirjat luetaan parhaiten tekstinä tai PDF-tiedostoina, joiden tekstin voi valita. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, muutamassa minuutissa ja muutamin virhein. RPG Engine ei koskaan muuta kirjojasi, ei lähetä niiden tekstiä minnekään eikä kopioi sitä kampanjaan.

### 5.3 Kotisäännöt ja omat lisäykset

Pyydä pelinjohtajalta: *[Kotisääntö: luonnollinen 1 hyökkäyksessä tarkoittaa, että pudotat aseesi.]* Pelinjohtaja pitää sen pöydän sopimuksena tai kirjoittaa sivun tai hahmolomakkeen luvun, jos sellaista tarvitaan. Valmiiksi kirjoitetut kotisäännöt voi laittaa tekstitiedostoina kampanjan `rules`-kansioon.

### 5.4 Oman pelijärjestelmän lisääminen tai tuominen

Ei vielä: nykyisin RPG Engine pelaa vain viidettä laitosta ([Tulossa myöhemmin](#9-coming-later)).

---

## 6. Laajennukset <!-- icon: plus -->

Ei vielä. Laajennus lisää kampanjaan jotakin pelijärjestelmän päälle: maailman, seikkailun, ominaisuuden kuten sään tai jaettavia kotisääntöjä.

---

## 7. Mistä kampanja tulee ja mikä on sen kieli <!-- icon: world -->

### 7.1 Kolme tapaa saada maailma

- **Tehdään lennosta**: pelinjohtaja rakentaa lähtöajatuksestasi jokaisen paikan, henkilön ja juonen juuri ennen kuin tarvitset sitä, ja muistaa ne.
- **Valmisteltu alussa**: sama, mutta maailma rakennetaan ennen pelin alkua.
- **Omasta seikkailusta tai kirjasta**: anna pelinjohtajalle sen tiedosto, *[Tuo tämä seikkailu kampanjaksemme: D:\Books\adventure.pdf. Älä kerro minulle mitään siitä, mitä siinä on.]* Se luetaan parhaiten tekstinä, EPUB-tiedostona, Word-asiakirjana tai PDF-tiedostona, jonka teksti on valittavissa. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, hitaasti ja muutamin virhein. Tietokoneellasi toimiva Codex tai Claude Code lukee tiedoston chatin ulkopuolella, ja kojelauta näyttää, miten pitkällä lukeminen on. Romaanista pelinjohtaja ehdottaa aloituskohtaa. Se kirjoittaa paikat, hahmot ja salaisuudet.

Kampanja pelataan kerran: jos haluat pelata saman seikkailun uudestaan, luo uusi kampanja.

### 7.2 Kielet

Kampanjalla on yksi kieli, pelinjohtajan kieli, jota kojelauta seuraa. Kojelaudassa on 26 kieltä. Minkä tahansa muun kielen käännöksen tekee tietokoneellasi Codex tai Claude Code tai, jos niitä ei ole, pelinjohtaja chatissa. Viidennen laitoksen italialaiset termit tulevat virallisesta italialaisesta SRD:stä. Sääntöteksti pysyy englanniksi, ja pelinjohtaja kertoo sen sinun kielelläsi.

---

## 8. Uteliaille: kampanjakansio <!-- icon: list -->

Sinun ei koskaan tarvitse avata sitä, ja siinä ovat kampanjasi salaisuudet. Siinä on `campaign.yaml` (asetuksesi), `state.yaml` (pelin tilanne), `world/` (yksi markdown-sivu jokaista hahmoa, paikkaa, tehtävää ja muuta kohden), `rules/` (kotisääntösi), `images/`, `log.jsonl` (jokainen muutos), `.saves/`, `.player/` (muistiinpanosi) sekä pienet tiedostot, jotka kertovat tekoälyagenteille, missä RPG Engine on. Sivut käyttävät Obsidianin muotoa. Jos muutat sivua käsin, pelinjohtaja saa siitä tiedon seuraavalla vastauksellaan.

RPG Engine pysyy tässä kansiossa: se lukee ja kirjoittaa peliä vain täällä eikä koske muihin tiedostoihisi. Sääntökirjojesi kansioita se vain lukee. Sen ulkopuolelle se jättää vain omia tietokansioitaan (kojelaudan käännökset, sääntökirjoistasi luetun tekstin sekä Codexin tai Claude Coden, jos annat asentaa ne) ja väliaikaisia kansioita kuvan piirtämisen ajaksi. Kaikesta muusta, mitä agenttisi haluaa tehdä tietokoneellasi, se kysyy sinulta ensin.

Kaikki pelinjohtajan käyttämät komennot voi ajaa myös kampanjakansiossa: `rpg --help` luettelee ne. Monet tulostavat kampanjan salaisuuksia.

---

## 9. Tulossa myöhemmin <!-- icon: hourglass -->

- **Sinä pelinjohtajana**, ja tekoäly pelaa seuruetta.
- **Tekijätila**: kirjoita seikkailu tekoälyn kanssa, vie se ja jaa se.
- **Useita pelaajia samalla tietokoneella**, jokaisella oma hahmo, vuorotellen samassa chatissa.
- **Laajennukset**: asetuksia, seikkailuja, ominaisuuksia ja kotisääntöjä.
- **Muut pelit**: lisää pelijärjestelmiä ja omat järjestelmäsi.

---

## 10. Kysymykset ja ongelmat <!-- icon: info -->

### Kysymykset

**Tarvitseeko minun osata säännöt?** Ei. Valitse opastava mentori ja kysy hakasulkeissa milloin haluat.

**Voiko pelinjohtaja huijata?** Se ei voi muuttaa RPG Enginen tekemää heittoa, paitsi vaikeustasolla tarina, eikä jo vahvistettuja tosiasioita.

**Maksaako se mitään?** RPG Engine on ilmainen. Pelinjohtaja toimii agenttisi tilauksella tai omalla koneellasi paikallisella mallilla. Pelilta on pitkä keskustelu: pienimmillä tilauksilla voit saavuttaa tilauksen rajan ennen illan loppua. Kuvat ja käännökset käyttävät samaa tilausta.

**Voinko pelata puhelimella?** Et: pelinjohtaja toimii tietokoneellasi, ja kojelauta aukeaa vain siellä.

**Voinko pelata kavereiden kanssa?** Et vielä: nykyisin yksi pelaaja, yksi hahmo ja seuralaiset ([Tulossa myöhemmin](#9-coming-later)).

**Voinko käyttää ensi kerralla toista tekoälyä?** Kyllä: avaa kampanja toisessa agentissa ja kirjoita *jatka*.

### Ongelmat

**Kojelauta ei aukea.** Kysy pelinjohtajalta: `[What's the dashboard link?]`. Se toimii vain, kun kyseisessä kampanjassa on keskustelu auki, pelinjohtajan ensimmäisen vastauksen jälkeen.

**Pelinjohtaja ei tunnu tuntevan peliä.** Agenttisi ei ladannut RPG Engineä. Tarkista, että käynnistit sen kampanjakansiossa ja luotit kansioon. Kirjoita Claude Codessa `/mcp` ja yhdistä `rpg` uudelleen. Codexissa komennon `codex mcp list` kampanjakansiossa on näytettävä `rpg`. Jos `rpg --version` ei löydy, asenna RPG Engine uudelleen ([2.2](#22-install)).

**Päivittäminen.** Suorita `npm install -g rpg-engine` uudelleen ja avaa sitten uusi keskustelu: käynnissä oleva pelinjohtaja pitää sen version, jolla se käynnistyi.

**Pelinjohtaja muistaa jotain, minkä peruin.** Avaa uusi keskustelu ja paina Tallennuksissa **Avasin uuden keskustelun**.

**Kuvia ei ilmesty.** Asetukset > Kuvat kertoo, voiko tämä tietokone tehdä niitä, ja miten.

**Asennus epäonnistuu tai `rpg` ei käynnisty.** Komennon `node --version` on kerrottava 22 tai uudempi. Windowsissa pidä RPG Engine ja kampanjasi poissa poluista, joissa on `&`.

**Kojelaudan linkki vaihtui.** Toinen ohjelma otti tavallisen osoitteen. Pelinjohtaja antaa sinulle uuden linkin.
