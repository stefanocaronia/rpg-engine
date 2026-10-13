<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
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

## 2. Alkuun pääseminen <!-- icon: path -->

### 2.1 Mitä tarvitset

- Tietokoneen, jossa on Windows, macOS tai Linux, sekä selaimen.
- **Node.js 22:n** tai uudemman osoitteesta [nodejs.org](https://nodejs.org). Mukana tulee `npm`, joka asentaa RPG Enginen.
- **Päätteen**: Windowsissa Terminal tai PowerShell, macOS:ssä Terminal. Voit avata päätteen kansiossa napsauttamalla kansiota hiiren kakkospainikkeella ja valitsemalla **Avaa Terminalissa** (Windows) tai **Palvelut > Uusi Terminal kansiossa** (macOS).
- **Tekoälyagentin** pelinjohtajaksi ([2.4](#24-connect-your-ai)). Valitse sen tarjoama **suurin malli**: pienen mallin voi helpommin puhua paljastamaan salaisuuksia tai taivuttamaan sääntöjä.

### 2.2 Asennus

```text
npm install -g rpg-engine
```

Komento `rpg --version` tarkistaa, että asennus onnistui. Käytät komentoa `rpg` vain kerran kampanjaa kohden, sen luomiseen. Sen jälkeen agenttisi käynnistää RPG Enginen itse.

### 2.3 Kampanjan luominen

Avaa pääte kansiossa, jossa pidät pelisi ([2.1](#21-what-you-need) kertoo miten):

```text
rpg init "The Salt Isles"
```

Tämä luo kansion `The Salt Isles`, jossa on uusi kampanja. Siirry siihen komennolla `cd "The Salt Isles"`. Muista, missä kansio on: palaat siihen joka pelikerralla. Kaiken muun valitset myöhemmin keskustelussa tai kojelaudalla. Komento `rpg init --help` listaa valinnat, joilla voit asettaa jotain jo nyt, kuten `--language it` tai `--difficulty hard`.

Pelinjohtaja ei voi luoda kampanjaa puolestasi: ennen komentoa `init` mikään ei kerro agentillesi, missä RPG Engine on.

### 2.4 Tekoälyn yhdistäminen

Pelinjohtaja toimii **tekoälyagentissa**: tekoälysovelluksessa, päätteessä tai työpöydällä, joka voi käsitellä tietokoneesi tiedostoja, kuten Claude Code tai Codex. Pelkkä keskustelupalvelu, kuten claude.ai tai ChatGPT, tai puhelinsovellus ei riitä: pelinjohtajan on päästävä käsiksi kampanjan tiedostoihin tietokoneellasi. Jokainen agentti tarvitsee oman tilauksensa ja kirjautumisensa: Claude Code maksullisen Claude-tilauksen, Codex ChatGPT-kirjautumisen. Asennat sen kerran sen omalta sivulta: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: kirjoita kampanjakansiossa `claude`. Kun se kysyy, luotatko kansioon, valitse **Yes, I trust this folder**. Varo: valmiiksi valittuna on *No, exit*.
- **Codex**: kirjoita kampanjakansiossa `codex` ja vastaa myöntävästi, kun se kysyy, luotatko kansioon. Tarkista sen työpöytäsovelluksen asetuksista, että muistit ovat pois päältä pelin keskusteluissa.
- **Muu agentti**: käynnistä se kampanjakansiossa ja anna sille MCP-palvelin `rpg mcp`. RPG Engine on tavallinen MCP-palvelin: mikä tahansa MCP:tä tukeva agentti voi olla pelinjohtaja, myös paikalliset.

Pelaamme ja testaamme **Claude Codella**. **Codex** on yhdistetty ja tarkistettu, mutta sillä ei ole vielä pelattu kokonaista kampanjaa. `init` valmistelee myös **Gemini CLI:n**. Kampanja sammuttaa agentin oman muistin: peli elää sen tiedostoissa, jotta tallennukseen palaaminen todella palauttaa pelin aiempaan tilaan.

### 2.5 Ensimmäinen keskustelu

Kirjoita mitä tahansa, vaikka *Hei! Aloitetaan.* Jokaisen keskustelun ensimmäisessä vastauksessa pelinjohtaja antaa **linkin kojelautaasi**, joka on esimerkiksi `http://127.0.0.1:4750`. Avaa se ja pidä keskustelun rinnalla.

Pelinjohtajan viestien välissä agenttisi näyttää käyttämänsä työkalut. Älä avaa niiden tietoja (Claude Codessa ctrl+o), sillä ne voivat paljastaa salaisuuksia.

Uusi kampanja käy läpi kolme vaihetta, jotka näkyvät kojelaudan yläreunassa: **1 Asetukset** (miten haluat pelata), **2 Nollasessio** (teet hahmosi pelaamalla), **3 Pelaaminen**.

### 2.6 Asetukset: miten pelaat

Pelinjohtaja kysyy vain sen, mikä vielä puuttuu, muutaman kysymyksen kerrallaan. Kojelaudan **Asetukset**-vaihe näyttää samat kysymykset korteilla. Kirjoita "päätä sinä", niin pelinjohtaja valitsee. Kaiken voi muuttaa myöhemmin, keskustelussa tai **Asetuksissa**.

| Asetus | Mitä se ratkaisee | Arvot |
|---|---|---|
| **Mentori** | Kuinka paljon pelinjohtaja opettaa sinulle sääntöjä | pois, vihjeet, opastus |
| **Vaikeustaso** | Kuinka vaikea maailma on | tarina, helppo, normaali, vaikea, häikäilemätön |
| **Tappavuus** | Mitä kaatuminen taistelussa tarkoittaa | kerronnallinen (ei kuolemaa), eeppinen (vain kun sillä on merkitystä), nopat |
| **Tallennukset** | Milloin voit palata taaksepäin | pysyvä kuolema, tarkistuspiste, vapaa ([3.8](#38-saves-and-going-back)) |
| **Tarkkuus** | Kuinka tarkasti ruoka, valo ja matkustaminen noudattavat sääntöjä | sujuva, säännöt, simulaatio |
| **Nopat** | Kuka heittää noppasi | digitaaliset, fyysiset |
| **Mittayksiköt** | Etäisyydet ja painot | metrijärjestelmä, brittiläiset yksiköt |
| **Seuralaiset** | Ketkä matkaavat kanssasi | ei ketään, tehty yhdessä kanssasi, pelinjohtajan tekemät, tavataan pelissä |
| **Kuvat** | Kuvat paikoista, tehtävistä ja tapaamistasi hahmoista | ei mitään, pyydettäessä, uudet paikat, tehtävät ja tapaamasi hahmot ([3.11](#311-pictures)) |
| **Rajat** ja **Verhot** | Mikä ei koskaan näy ja mikä tapahtuu vain kuvan ulkopuolella | listat |
| **Kieli** | Pelin ja kojelaudan kieli | mikä tahansa |

Viides edtio lisää **kehittymisen**: kokemuspisteet tai merkkipaalut.

Jos maailmaa ei ole kirjoitettu valmiiksi, pelinjohtaja kysyy myös **lähtökohdan** (genre, tunnelma, muutama elementti omin sanoin) ja **valmistelun**: rakennetaanko maailma lennossa pelin edetessä vai kokonaan alussa.

**Pelinjohtajan tyyliä** ei kysytä koskaan, mutta voit muuttaa sitä keskustelussa tai **Asetuksissa**: **proosa** (selkeä, kirjallinen, pulp, kuivan humoristinen), keksittävät **tarinat** (tilanteet, kaaret, jaksot, mysteeri), kirjailija, jonka tapaan **kirjoitetaan**, tai mikä tahansa muu **omin sanoin**.

### 2.7 Nollasessio: hahmosi

Teet hahmosi pelinjohtajan kanssa, kuten pelipöydässä. Jokainen valinta on sinun, ellet pyydä pelinjohtajaa tekemään sitä. Voit tulla valmiin idean, epämääräisen idean tai tyhjin käsin. Pelinjohtaja kertoo, miten kykypisteet määräytyvät, ennen kuin yhtään noppaa heitetään. Hahmon tarinaa ei vaadita koskaan. Jos annat sellaisen, pelinjohtaja kirjoittaa sen sinun sanoillasi. Sen jälkeen pelinjohtaja kysyy kuvaa hahmostasi ([3.7](#37-your-characters-story-and-picture)). RPG Engine laskee hahmolomakkeen: sinun ei tarvitse laskea itse mitään.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Puhuminen pelinjohtajan kanssa

Kirjoita omin sanoin, mitä hahmosi tekee tai sanoo:

> Kysyn majatalon isännältä, ketä muita on käynyt täällä tänä iltana.

Tarinan ulkopuolella kirjoita hakasulkeiden väliin: *[Miten kamppailu toimii?]* Pelinjohtaja vastaa myös hakasulkeissa.

Sinä kerrot, mitä yrität. Pelinjohtaja kertoo, mitä tapahtuu. Pelinjohtaja ei koskaan päätä hahmosi puolesta eikä puhu pelimoottorista. Voit kysyä siltä, miten kojelautaa käytetään.

### 3.2 Heitot

Pelinjohtaja pyytää heittoa vain, kun lopputulos on epävarma ja sillä on merkitystä, ja kertoo ensin, mikä on pelissä. Sitten:

- **Kojelaudalla** banneri näyttää painikkeen jokaiselle heitolle, esimerkiksi *Acrobatics +4 · with advantage*. Napsauta sitä: nopat putoavat sivulle ja pelinjohtaja saa tuloksen. Voit myös napsauttaa hahmolomakkeen valaistua riviä, heittää noppia noppa-alustalta tai kirjoittaa bannerissa jotain muuta.
- **Käsin**, bannerin kulmasta tai **Asetuksista**: banneri kertoo, mitä heittää, ja heität sen hahmolomakkeesta tai noppa-alustalta.
- **Fyysiset nopat**, kun noppa-asetus on fyysinen: kirjoitat heittämäsi silmäluvut, *[Heitin 14.]*, ja RPG Engine lisää muuntimesi.

**Vapaat heitot**: napsauta mitä tahansa hahmolomakkeen lukua tai avaa noppa-alusta heittääksesi huvikseen. Ne eivät koskaan lasku mihinkään, eikä pelinjohtaja näe niitä.

**Pelinjohtajan heitot** näkyvät heittosarakkeessasi, salaisia lukuun ottamatta. Voit aina kysyä *[Oliko tuo heitto aito?]*: salaisesta heitosta pelinjohtaja antaa sormenjäljen, joka todistaa heiton tehdyn ennen kysymystäsi.

### 3.3 Kohtaukset ja taistelut

Tarina etenee **kohtauksissa**: taistelu, keskustelu, tutkiminen, matkustaminen, lepo. Jokaisen kohtauksen lopussa peli tallentaa itsestään, ja kohtaus siirtyy päiväkirjaasi.

Taistelussa pelinjohtaja kertoo jokaisen vuoron, joka ei ole sinun, ja pysähtyy kohtaan, jossa voit päättää. **Taistelu**-osio näyttää vuorojärjestyksen, seurueesi osumapisteet ja sen, miltä viholliset näyttävät sanoin kuvattuna. Jos hahmosi kaatuu, kuolemanpelastusheitot näkyvät suurina sivulla.

### 3.4 Aika, matkustaminen ja liikkuva maailma

RPG Engine pitää kirjaa päivämäärästä. Pelikertojen välillä aikaa ei kulu. Sano, että lepäätte, *Pidämme pitkän levon*, ja lepo palauttaa sen, minkä pitääkin. Kerro, minne menette, *Lähdemme pohjoiseen johtavaa tietä Roccaan*, ja RPG Engine laskee reitin, matkan ja päivät, ja pysähtyy, kun matkalla tapahtuu jotain. Raha lasketaan pelin kolikoissa, vaihtorahat mukaan lukien.

Konnilla on suunnitelmia, joilla on määräajat. Joka uusi päivä pelinjohtaja siirtää uhkia, joita aika on edistänyt, ja näet niiden merkit, mutta et koskaan itse kelloa.

### 3.5 Kartat

**Maailma** näyttää hahmosi tuntemat paikat, niiden väliset tiet ja kulkemasi reitin. Muu on sumun peitossa. **Kohtaus** näyttää sen paikan kartan, jossa olet, kun sellainen on, ja kuka missäkin seisoo. Taistelussa omalla vuorollasi ruudut, joihin et yllä, on verhottu. Kun pelinjohtaja kysyy, minne siirryt, kosketa ruutua tai kirjoita se, esimerkiksi *E4*.

### 3.6 Tehtävät, päiväkirja ja muistiinpanot

Tehtävä, jonka hahmosi ottaa vastaan, tulee **Päiväkirjaan** omine tavoitteineen, määräaikoineen ja mittareineen. Tähdellä merkitty tehtävä pysyy näkyvillä Kohtauksen yläosassa. Päiväkirja kertoo myös **tarinasi** kohtaus kohtaukselta ja säilyttää **muistiinpanosi**: ne ovat yksityisiä, ellet **Jaa** jotakin. Pelinjohtaja kuulee jaetun muistiinpanon sinun ajatuksenasi, ei koskaan tosiasiana.

### 3.7 Hahmosi tarina ja kuva

Hahmolomakkeen **Kuvaus**-kortissa on kenttä hahmosi tarinalle: pelinjohtaja kirjoittaa sen siihen, kun olet myöntänyt. Kuvaksi voit antaa pelinjohtajalle tiedoston (PNG, JPEG, WebP tai SVG, enintään 5 Mt) ja kertoa, missä se on tietokoneellasi, tai teettää muotokuvan ([3.11](#311-pictures)): *[Tee minulle muotokuva: harmaat hiukset letillä, arpi leuassa.]*

### 3.8 Tallennukset ja taaksepäin palaaminen

RPG Engine tallentaa koko kampanjan jokaisen kohtauksen lopussa. **Tallennukset**-asetus ratkaisee lopun:

| Tallennukset | Tallenna kun haluat | Palaa taaksepäin |
|---|---|---|
| **pysyvä kuolema** | ei | ei koskaan |
| **tarkistuspiste** | ei | viimeiseen tallennukseen, vain kun hahmosi kuolee |
| **vapaa** | kyllä | mihin tahansa tallennukseen |

Jokaisessa tilassa voit **aloittaa alusta**, pelin alusta tai nollasessiosta. Tee se keskustelussa tai kohdassa **Tallennukset**.

Taaksepäin palaamisen jälkeen **avaa uusi keskustelu**: vanha muistaa, mikä peruttiin. Kirjoita uudessa keskustelussa *jatka* ja paina sitten Tallennuksissa **Avasin uuden keskustelun**.

### 3.9 Pelikerrat: lopettaminen ja palaaminen

Lopeta milloin haluat: *[Lopetetaan tältä illalta tähän.]* Kaikki on jo tallennettu tiedostoihin. Palataksesi käynnistä agenttisi kampanjakansiossa ja kirjoita *jatka*: pelinjohtaja antaa lyhyen kertauksen ja jatkaa.

### 3.10 Pelinjohtajan mieliala

Kojelaudan yläreunan robotti on pelinjohtaja: sen ilme seuraa tarinan tunnelmaa eikä koskaan paljasta sitä, mitä et vielä tiedä. Kun keskustelu on suljettu, se nukkuu.

### 3.11 Kuvat

RPG Engine voi teettää kuvia saavuttamistasi paikoista, ottamistasi tehtävistä ja tapaamistasi hahmoista **Kuvat**-asetuksen mukaan sekä hahmosi muotokuvan, kun pyydät. Se käyttää sitä, mitä tietokoneellasi on, omalla kirjautumisellasi: **Codex** maalaa ne, muuten **Claude Code** piirtää ne. **Asetukset** kertoo, voiko tämä tietokone tehdä niitä, ja miten sen saa toimimaan, jos ei voi. Voit aina antaa pelinjohtajalle oman kuvasi.

### 3.12 Turvallisuus: rajat, verhot ja pysäytys

**Rajat** eivät koskaan näy pelissä. **Verhot** tapahtuvat vain kuvan ulkopuolella. Kirjoita milloin tahansa *[stop]*: pelinjohtaja jättää sen sisällön heti pois ja lisää sen rajoihisi.

### 3.13 Mielen muuttaminen

Jokaista asetusta voi muuttaa, keskustelussa tai **Asetuksissa**. Pelinjohtajan ilman sääntökirjaa tekemä ratkaisu muuttuu **ennakkotapaukseksi**, jotta sama kysymys saa ensi kerralla saman vastauksen.

---

## 4. Kojelauta <!-- icon: party -->

Sivu omalla tietokoneellasi, avattavissa vain sen koneen selaimessa ja elossa niin kauan kuin keskustelu on auki. Kun keskustelu sulkeutuu, sivulla lukee *Not connected*. Yhteys palaa itsestään seuraavan keskustelun mukana.

- **Seurue**: sinun ja seuralaistesi hahmolomakkeet. Napsauta lukua heittääksesi sen, vie hiiri sen päälle nähdäksesi, mistä se tulee. Vieressä ovat heitot.
- **Kohtaus**: missä olet, sen kuva ja kartta, ketkä ovat paikalla ja mitä tapahtuu.
- **Taistelu**: vain taistelussa: vuorot, taistelijat ja se, mitä sinulla on käsillä.
- **Päiväkirja**: tehtävät, tarina ja muistiinpanosi.
- **Maailma**: maailmankartta sellaisena kuin hahmosi sen tuntee.
- **Noppa-alusta**: valitse nopat ja muunnin ja heitä.
- **Tallennukset**, **Ohje**, **Asetukset** ja **Tietoja** kuvakkeina rivin lopussa. Asetuksissa ovat myös sivun omat valinnat: teema, noppien ääni, noppasetti.

Kun pelinjohtaja kysyy sinulta jotain, sen banneri pysyy ylhäällä missä osiossa tahansa olet.

---

## 5. Pelijärjestelmät ja kotisäännöt <!-- icon: dice -->

### 5.1 Mikä pelijärjestelmä on

Yhden pelin tiedot: sen hahmolomake, luvut, olennot, esineet, loitsut ja sääntötekstit. Jokainen kampanja pelaa yhtä järjestelmää. RPG Engine laskee hahmolomakkeen sekä sen, mitä kuluu ja mitä palautuu. Pelinjohtaja lukee säännöistä, miten ominaisuus toimii, ja päättää, kuten pelipöydässä.

### 5.2 Viides edtio, mukana

SRD 5.1:n rodut, hahmoluokat, alaluokat, tausta ja erikoistaito; 319 loitsua, aseet, panssarit, taikaesineet ja hirviöt; sääntöluvut, jotka pelinjohtaja lukee tarkalla sanamuodolla; täysi hahmolomake, laskettuna valmiiksi.

Voit pelata myös sisältöä, jota SRD:stä puuttuu, omistamastasi kirjasta: pelinjohtaja kirjoittaa sen kampanjasi sivuiksi, ja RPG Engine käsittelee niitä ominaan. RPG Engine toimittaa vain avointa sisältöä. Pelinjohtajasi tietämys ei ole rajattua.

### 5.3 Kotisäännöt ja omat lisäykset

Pyydä pelinjohtajalta: *[Kotisääntö: luonnollinen 1 hyökkäyksessä tarkoittaa, että pudotat aseesi.]* Se pitää sen pöydän sopimuksena tai kirjoittaa sivun tai hahmolomakkeen luvun, kun sellainen tarvitaan. Valmiiksi kirjoitetut kotisäännöt voivat olla tekstitiedostoina kampanjan `rules`-kansiossa.

### 5.4 Oman pelijärjestelmän lisääminen tai tuominen

Ei vielä: nykyisin RPG Engine pelaa vain viidettä editiota ([Tulossa myöhemmin](#9-coming-later)).

---

## 6. Laajennukset <!-- icon: plus -->

Ei vielä. Laajennus lisää kampanjaan jotakin pelijärjestelmän päälle: maailman, seikkailun, ominaisuuden kuten sään tai jaettavia kotisääntöjä.

---

## 7. Mistä kampanja tulee ja sen kieli <!-- icon: world -->

### 7.1 Kolme tapaa saada maailma

- **Tehty lennossa**: lähtökohdastasi pelinjohtaja rakentaa jokaisen paikan, henkilön ja juonen juuri ennen kuin tarvitset sen, ja säilyttää sen.
- **Valmisteltu alussa**: sama, mutta maailma rakennetaan ennen pelin alkua.
- **Omasta seikkailusta**: anna pelinjohtajalle teksti tai PDF ja pyydä sitä valmistelemaan se, *[Valmistele tämä seikkailu kampanjaksemme. Älä kerro minulle mitään siitä, mitä siinä on.]* Se kirjoittaa paikat, hahmot ja salaisuudet. Tuontipainiketta ei vielä ole.

Kampanja pelataan kerran: pelataksesi saman seikkailun uudelleen luo uusi kampanja.

### 7.2 Kielet

Yksi kieli kampanjaa kohden, pelinjohtajan kieli, jota kojelauta seuraa. Kojelaudan mukana tulee 26 kieltä. Minkä tahansa muun kielen kääntää tietokoneellasi Codex tai Claude Code, tai ilman niitä pelinjohtaja keskustelussa. Viidennen editionin italiankieliset termit tulevat viralliselta italialaiselta SRD:ltä. Sääntöteksti pysyy englanniksi, ja pelinjohtaja kertoo sen sinun kielelläsi.

---

## 8. Uteliaille: kampanjakansio <!-- icon: list -->

Sinun ei koskaan tarvitse avata sitä, ja siinä ovat kampanjasi salaisuudet. Siinä on `campaign.yaml` (asetuksesi), `state.yaml` (missä peli on), `world/` (yksi markdown-sivu jokaista hahmoa, paikkaa, tehtävää ja muuta kohden), `rules/` (kotisääntösi), `images/`, `log.jsonl` (jokainen muutos), `.saves/`, `.player/` (muistiinpanosi) sekä pienet tiedostot, jotka kertovat tekoälyagenteille, missä RPG Engine on. Sivut käyttävät Obsidianin muotoa. Jos muutat sivua käsin, pelinjohtaja saa siitä tiedon seuraavassa vastauksessaan.

Jokaisen pelinjohtajan käyttämän komennon voi ajaa myös kampanjakansiossa: `rpg --help` listaa ne. Monet tulostavat kampanjan salaisuuksia.

---

## 9. Tulossa myöhemmin <!-- icon: hourglass -->

- **Sinä pelinjohtajana**, ja tekoäly pelaa seuruetta.
- **Tekijätila**: kirjoita seikkailu tekoälyn kanssa, vie se ulos ja jaa se.
- **Useita pelaajia samalla tietokoneella**, joilla kullakin on oma hahmo ja jotka vuorottelevat samassa keskustelussa.
- **Laajennukset**: asetukset, seikkailut, ominaisuudet ja kotisäännöt.
- **Oppaiden ja seikkailujen tuonti**.
- **Muut pelit**: lisää pelijärjestelmiä ja omat järjestelmät.

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
