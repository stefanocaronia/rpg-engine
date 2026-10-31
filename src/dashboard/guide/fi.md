<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
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
| **Pelinjohtaja** (tekoäly) | Kertoo tarinan, esittää kaikkia muita, päättää, mitä tapahtuu, ja pyytää heittoja. |
| **RPG Engine** | Säilyttää maailman tiedostoissa, heittää nopat, laskee osumapisteet, rahat, ajan ja etäisyydet sekä pitää salaisuudet piilossa, kunnes ne paljastuvat. |

Maailma pysyy samana illasta toiseen, vaikka avaisit uuden keskustelun tai käyttäisit eri tekoälyä:

- **Mikä on sanottu, se pysyy totena.** Kuollut konna pysyy kuolleena.
- **Nopat ovat oikeat.** Pelinjohtaja ei voi taivuttaa niitä, paitsi helpoimmalla vaikeustasolla, jos valitset sen.
- **Salaisuudet pysyvät salaisina.** Pelinjohtaja ei koskaan kerro sinulle sitä, mitä hahmosi ei tiedä.
- **Maailma liikkuu.** Uhat etenevät, kun lepäätte tai matkaatte, ja näet niiden merkit.
- **Kampanja on kansio** tietokoneellasi: voit lopettaa milloin haluat ja jatkaa myöhemmin.

Peli tulee pelijärjestelmänä. Se on paketti, jonka pelinjohtaja asentaa kampanjaasi. Nyt meillä on **viides painos** ilmaisesta System Reference Document 5.1 -aineistosta. Ilman pelijärjestelmää pelaat vapaasti: tarinaa ilman lukuja. Lisää on tulossa ([Tulossa myöhemmin](#9-coming-later)).

---

## 2. Aloittaminen <!-- icon: path -->

### 2.1 Mitä tarvitset

- Tietokone, jossa on Windows, macOS tai Linux, sekä verkkoselain.
- **Node.js 22** tai uudempi, osoitteesta [nodejs.org](https://nodejs.org). Mukana tulee `npm`, joka asentaa RPG Enginen.
- **Pääte**: Windowsissa Terminal tai PowerShell, macOS:ssä Terminal. Voit avata päätteen kansioon napsauttamalla kansiota hiiren kakkospainikkeella ja valitsemalla **Open in Terminal** (Windows) tai **Services > New Terminal at Folder** (macOS).
- Pelinjohtajalle **tekoälyagentti** ([2.4](#24-connect-your-ai)), jossa on tarjolla oleva **suurin malli**: pieni malli antaa helpommin puhua itsensä paljastamaan salaisuuksia tai taivuttamaan sääntöjä.

### 2.2 Asennus

```text
npm install -g rpg-engine
```

Komento `rpg --version` tarkistaa, että asennus onnistui. Käytät komentoa `rpg` kerran kampanjaa kohti, kampanjan luomiseen. Sen jälkeen agenttisi käynnistää RPG Enginen itse.

### 2.3 Kampanjan luominen

Avaa pääte kansioon, jossa säilytät pelisi ([2.1](#21-what-you-need) kertoo, miten):

```text
rpg init "The Salt Isles"
```

Komento luo kansion `The Salt Isles`, jossa on uusi kampanja. Siirry siihen komennolla `cd "The Salt Isles"`. Muista, missä kansio on: palaat siihen aina, kun pelaat. Kaiken muun valitset myöhemmin, keskustelussa tai kojelaudalla. Komento `rpg init --help` luettelee valinnat, joita voit tehdä jo nyt, kuten `--language it` tai `--difficulty hard`.

Pelinjohtaja ei voi luoda kampanjaa puolestasi: ennen komentoa `init` mikään ei kerro agentillesi, missä RPG Engine on.

### 2.4 Tekoälyn yhdistäminen

Pelinjohtaja toimii **tekoälyagentissa**. Se on tekoälysovellus, päätteessä tai työpöydällä, joka voi käsitellä tietokoneesi tiedostoja, kuten Claude Code tai Codex. Pelkkä chat, kuten claude.ai tai ChatGPT, tai puhelinsovellus ei riitä: pelinjohtajan täytyy päästä käsiksi kampanjan tiedostoihin tietokoneellasi. Jokainen agentti tarvitsee oman tilauksensa ja kirjautumisensa: Claude Code maksullisen Claude-tilauksen, Codex ChatGPT-kirjautumisen. Asennat sen kerran sen omalta sivulta: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: kirjoita kampanjakansiossa `claude`. Kun se kysyy, luotatko kansioon, valitse **Yes, I trust this folder**. Varo: valmiiksi valittuna on vastaus *No, exit*. Kampanjassa on myös pieni koukku, `rpg --listen`, jota kysymys ei näytä: se kertoo pelinjohtajalle heti, kun toimit kojelaudalla.
- **Codex**: kirjoita kampanjakansiossa `codex` ja vastaa myöntävästi, kun se kysyy, luotatko kansioon. Tarkista sen työpöytäsovelluksen asetuksista, että muistit on poistettu käytöstä pelin keskusteluissa.
- **Muu agentti**: käynnistä se kampanjakansiossa ja anna sille MCP-palvelin `rpg mcp`. RPG Engine on tavallinen MCP-palvelin: pelinjohtajaksi kelpaa mikä tahansa MCP:tä tukeva agentti, myös paikalliset.

Pelaamme ja testaamme **Claude Codella**. **Codex** on yhdistetty ja tarkistettu, mutta sillä ei ole vielä pelattu kokonaista kampanjaa. Kampanja poistaa agentin oman muistin käytöstä: peli elää sen tiedostoissa, jotta tallennukseen palaaminen palauttaa pelin todella takaisin.

### 2.5 Ensimmäinen keskustelu

Kirjoita mitä tahansa, vaikka *Hei! Aloitetaan.* Pelinjohtaja antaa jokaisen keskustelun ensimmäisessä vastauksessaan **linkin kojelautaasi**, esimerkiksi `http://127.0.0.1:4750`. Avaa se ja pidä se keskustelun vieressä.

Pelinjohtajan viestien välissä agenttisi näyttää käyttämänsä työkalut. Älä avaa niiden tietoja (Claude Codessa ctrl+o), sillä ne voivat paljastaa salaisuuksia.

Uusi kampanja käy läpi kolme vaihetta, jotka näkyvät kojelaudan ylälaidassa: **1 Asetukset** (miten haluat pelata), **2 Nollasessio** (teet hahmosi, pelin sisällä), **3 Pelaaminen**.

### 2.6 Asetukset: pelitapasi valinta

Pelinjohtaja kysyy vain sen, mikä vielä puuttuu, muutaman kysymyksen kerrallaan. Kojelaudan **Asetukset**-vaihe näyttää samat kysymykset korteilla. Kirjoita "päätä sinä", niin pelinjohtaja valitsee. Kaiken voi muuttaa myöhemmin, keskustelussa tai kohdassa **Asetukset**.

| Asetus | Mitä se ratkaisee | Arvot |
|---|---|---|
| **Mentori** | Kuinka paljon pelinjohtaja opettaa sinulle sääntöjä | pois, vihjeet, opastus |
| **Vaikeustaso** | Kuinka vaikea maailma on | tarina, helppo, normaali, vaikea, häikäilemätön |
| **Tappavuus** | Mitä taistelussa kaatuminen tarkoittaa | kerronnallinen (ei kuolemaa), eeppinen (vain kun sillä on merkitystä), nopat |
| **Tallennukset** | Milloin voit palata takaisin | pysyvä kuolema, tallennuspiste, vapaa ([3.8](#38-saves-and-going-back)) |
| **Tarkkuus** | Kuinka tarkasti ruoka, valo ja matkustaminen noudattavat sääntöjä | sujuva, säännöt, simulaatio |
| **Nopat** | Kuka heittää noppasi | digitaaliset, fyysiset |
| **Mittayksiköt** | Etäisyydet ja painot | metrijärjestelmä, brittiläinen mittajärjestelmä |
| **Hahmojen äänet** | Kuka puhuu tapaamiesi hahmojen puolesta, pelinjohtajasta hahmoihin: aina pelinjohtaja; ratkaisevissa hetkissä hahmo itse, tietäen vain sen, minkä tietää, pelinjohtajan valinnan mukaan; tai aina hahmo itse, tärkeimmät tai kaikki, hitaammin ja kalliimmin, jos tekoälysovelluksesi sen sallii | pelinjohtaja, joskus, tärkeimmät hahmot, kaikki |
| **Seuralaiset** | Kuka matkaa mukanasi | ei kukaan, luotu yhdessä kanssasi, pelinjohtajan luoma, tavattu pelissä |
| **Kuvat** | Kuvia paikoista, tehtävistä ja tapaamistasi hahmoista | ei mitään, pyynnöstä, uudet paikat, tehtävät ja tapaamasi hahmot ([3.11](#311-pictures)) |
| **Rajat** ja **Verhot** | Mikä ei koskaan esiinny pelissä ja mikä tapahtuu vain kuvaruudun ulkopuolella | luettelot |
| **Kieli** | Pelin ja kojelaudan kieli | mikä tahansa |

Viides editio lisää **kehittymisen**: kokemuspisteet tai merkkipaalut.

Jos maailmaa ei ole kirjoitettu valmiiksi, pelinjohtaja kysyy myös **lähtökohdan** (tyylilaji, sävy, muutama aines ja se, mistä pelissä nautit eniten, kuten taisteluista, arvoituksista, puheesta tai tutkimisesta, omin sanoin) sekä **valmistelun**: rakennetaanko maailma lennossa pelin edetessä vai kokonaan alussa.

**Pelinjohtajan tyyliä** ei koskaan kysytä, mutta voit muuttaa sitä keskustelussa tai kohdassa **Asetukset**: **proosa** (selkeä, kirjallinen, pulp, kuiva), **tarinat**, joita pelinjohtaja keksii (tilanteet, juonikaaret, jaksot, mysteeri), kirjailija, jonka tyyliin **kirjoitetaan**, tai mikä tahansa muu **omin sanoin**.

### 2.7 Nollasessio: hahmosi

Teet hahmosi pelinjohtajan kanssa, kuten pelipöydän ääressä. Jokainen valinta on sinun, ellet pyydä pelinjohtajaa tekemään sitä: tule mukaan valmiin idean, epämääräisen idean tai tyhjän pään kanssa. Pelinjohtaja kertoo, miten ominaisuuspisteet määritetään, ennen kuin yhtään noppaa heitetään. Taustatarinaa ei koskaan vaadita. Jos kerrot sellaisen, pelinjohtaja kirjoittaa sen sinun sanoillasi. Sitten pelinjohtaja pyytää kuvaa hahmostasi ([3.7](#37-your-characters-story-and-picture)). RPG Engine laskee hahmolomakkeen: sinun ei koskaan tarvitse laskea itse.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Keskustelu pelinjohtajan kanssa

Kirjoita, mitä hahmosi tekee tai sanoo, omin sanoin:

> Kysyn majatalon isännältä, kuka muu kävi täällä tänä iltana.

Jos haluat puhua tarinan ulkopuolelta, kirjoita hakasulkeisiin: *[Miten painiminen toimii?]* Pelinjohtaja vastaa myös hakasulkeissa.

Sinä kerrot, mitä yrität. Pelinjohtaja kertoo, mitä tapahtuu. Pelinjohtaja ei koskaan päätä hahmosi puolesta eikä puhu pelimoottorista. Pelinjohtajalta voi kysyä, miten kojelautaa käytetään.

**Toimiminen kojelaudalta**: klikkaa hahmolomakkeessa nimeä, esimerkiksi asetta, loitsua tai jotakin mukana kantamaasi, ja valitse sitten, kehen se kohdistuu. Voit myös klikata henkilöä, jolle haluat puhua. Kojelauta kirjoittaa lauseesi, *Hyökkään Huppupäisen rosvon 1 kimppuun nuijalla.*, ja voit muokata sitä ennen kuin painat **Kerro pelinjohtajalle**. Pelinjohtaja kuulee sen samalla tavalla kuin keskustelussa sanotun ja ratkaisee sen kuten kaiken muunkin. Jos tekoälysovelluksesi ei kuule sitä itse, **Kopioi** valmistelee lauseen liitettäväksi keskusteluun.

### 3.2 Heitot

Pelinjohtaja pyytää heiton vain, kun lopputulos on epävarma ja sillä on merkitystä. Pelinjohtaja kertoo ensin, mitä on pelissä. Sitten:

- **Kojelaudalla** ilmoituspalkissa on painike jokaiselle heitolle, esimerkiksi *Acrobatics +4 · with advantage*. Klikkaa sitä: nopat putoavat sivulle ja pelinjohtaja kuulee tuloksen. Voit myös klikata hahmolomakkeen valaistua riviä, heittää nopat noppa-alustalta tai kirjoittaa palkkiin jotain muuta.
- **Käsin**, palkin kulmassa tai kohdassa **Asetukset**: palkki kertoo, mitä heittää, ja heität sen hahmolomakkeelta tai noppa-alustalta.
- **Fyysiset nopat**, kun noppa-asetuksena on fyysiset: kirjoitat heittämäsi silmäluvut, *[Heitin 14.]*, ja RPG Engine lisää muuntimesi.

**Vapaat heitot**: klikkaa mitä tahansa lukua hahmolomakkeessa tai avaa noppa-alusta, jos haluat heittää huvikseen. Ne eivät koskaan lasketa, eikä pelinjohtaja näe niitä.

**Pelinjohtajan heitot** näkyvät heittosarakkeessasi, salaisia lukuun ottamatta. Voit aina kysyä *[Oliko tuo heitto oikea?]*: salaisesta heitosta pelinjohtaja antaa sormenjäljen, joka todistaa heiton tehdyn ennen kysymystäsi.

### 3.3 Kohtaukset ja taistelut

Tarina etenee **kohtauksina**: taistelu, keskustelu, tutkiminen, matkustaminen, lepo. Jokaisen kohtauksen lopussa peli tallentaa itse, ja kohtaus siirtyy päiväkirjaasi.

Taistelussa pelinjohtaja kertoo jokaisen vuoron, joka ei ole sinun, ja pysähtyy kohtaan, jossa voit päättää. **Kohtaus** näyttää ylhäällä, kenen vuoro on ja kuka on seuraava. Hahmosi kortti on kartan vieressä. Vuorojärjestys, seurueesi osumapisteet ja se, miten haavoittuneilta viholliset näyttävät sanoin kuvattuna, pysyvät sivun reunalla. Jos hahmosi kaatuu, kuolemanpelastusheitot näkyvät isoina sivulla.

### 3.4 Aika, matkustaminen ja liikkuva maailma

RPG Engine pitää kirjaa päivämäärästä. Istuntojen välillä aika ei kulu. Sano, että lepäätte, *Lepäämme pitkän levon*, ja kun pelinjohtaja suostuu, lepo palauttaa sen, minkä pitää. Lyhyessä levossa pelinjohtaja voi kysyä kojelaudalla, montako osumanoppaa käytät. Heitä ne yksi kerrallaan, katso, paljonko kukin parantaa, ja lopeta, kun haluat. Sano, minne menet, *Lähdemme pohjoiseen vievälle tielle kohti Roccaa*, ja RPG Engine laskee reitin, matkan ja päivät. Matka keskeytyy, jos matkalla tapahtuu jotain. Raha lasketaan pelin kolikoissa, vaihtorahat mukaan lukien.

Konnilla on suunnitelmia ja määräaikoja. Joka uusi päivä pelinjohtaja siirtää uhkia, joita aika on edistänyt, ja sinä näet niiden merkit, mutta et koskaan itse kelloa.

### 3.5 Kartat

**Maailma** näyttää paikat, jotka hahmosi tuntee, niiden väliset tiet ja kulkemasi reitin. Loput peittää sumu. **Kohtaus** näyttää sen paikan kartan, jossa olet, jos kartta on olemassa, ja kuka seisoo missä. Taistelussa omalla vuorollasi ruudut, joihin et ylety, on peitetty. Kun pelinjohtaja kysyy, minne liikut, kosketa ruutua tai kirjoita se, esimerkiksi *E4*.

**Maailma** säilyttää myös sen, mitä hahmosi tietää. **Tietämys** listaa ihmiset, paikat, ryhmittymät, olennot ja tarinat, jotka hahmo tuntee, kunkin sellaisena kuin hahmo sen tuntee. Voit hakea listasta tai avata yhden luettavaksi kokonaan. Tekstissä oleva nimi vie omalle sivulleen. **Asiakirjat** säilyttää löytämänsä kirjeet, ilmoitukset ja sivut uudelleen luettaviksi. **Kalenteri** näyttää tämän päivän, tehtäviesi määräajat jäljellä olevine aikoineen ja tarinan päivät. Päivä, jolle on kohtauksia, vie päiväkirjan lukuihin.

### 3.6 Tehtävät, päiväkirja ja muistiinpanot

Tehtävä, jonka hahmosi ottaa vastaan, muuttuu **Päiväkirjassa** tehtäväksi tavoitteineen, määräaikoineen ja mittareineen. Merkitse se tähdellä, niin se pysyy esillä Kohtauksen yläreunassa. Päiväkirja kertoo myös **tarinasi** kohtaus kohtaukselta ja säilyttää **muistiinpanosi**: ne ovat yksityisiä, ellet **Jaa** jotakin. Pelinjohtaja kuulee jaetun muistiinpanon sinun ajatuksenasi, ei koskaan tosiasiana. Kohdassa **Seuralaiset** luet seuralaistesi päiväkirjoja: silloin tällöin, päivän tai tehtävän lopussa, he kirjoittavat muutaman rivin siitä, mitä ajattelevat ja tuntevat.

### 3.7 Hahmosi tarina ja kuva

Hahmolomakkeen **Kuvaus**-kortissa on kenttä hahmosi tarinalle. Pelinjohtaja kirjoittaa sen siihen, kun olet sanonut kyllä. Kuvaa varten anna pelinjohtajalle tiedosto (PNG, JPEG, WebP tai SVG, enintään 5 Mt) ja kerro, missä se on tietokoneellasi. Voit myös teettää muotokuvan ([3.11](#311-pictures)): *[Tee minulle muotokuva: harmaat hiukset letillä, arpi leuassa.]*

### 3.8 Tallennukset ja takaisin palaaminen

RPG Engine tallentaa koko kampanjan jokaisen kohtauksen lopussa. Asetus **tallennukset** ratkaisee lopun:

| Tallennukset | Tallenna, kun haluat | Palaa takaisin |
|---|---|---|
| **pysyvä kuolema** | ei | ei koskaan |
| **tarkistuspiste** | ei | viimeiseen tallennukseen, vain kun hahmosi kuolee |
| **vapaa** | kyllä | mihin tahansa tallennukseen |

Kaikissa tiloissa voit **aloittaa alusta**, joko pelin alusta tai nollasessiosta. Tee se keskustelussa tai kohdassa **Tallennukset**.

Kun olet palannut takaisin, **avaa uusi keskustelu**: vanha muistaa, mikä peruttiin. Kirjoita uuteen keskusteluun *jatka* ja paina sitten Tallennuksissa **Avasin uuden keskustelun**.

### 3.9 Istunnot: lopettaminen ja palaaminen

Lopeta, kun haluat: *[Lopetetaan tältä illalta.]* Kaikki on jo tallennettu tiedostoihin. Kun haluat palata, käynnistä agenttisi kampanjan kansiossa ja kirjoita *jatka*. Pelinjohtaja antaa lyhyen kertauksen ja jatkaa.

### 3.10 Pelinjohtajan mieliala

Kojelaudan yläreunan robotti on pelinjohtaja. Sen ilme seuraa tarinan sävyä eikä koskaan paljasta sitä, mitä et vielä tiedä. Kun keskustelu on suljettu, robotti nukkuu.

### 3.11 Kuvat

RPG Engine voi teettää kuvia paikoista, joihin saavut, tehtävistä, jotka otat vastaan, ja ihmisistä, joita tapaat, **kuvat**-asetuksen mukaan. Pyynnöstä se tekee myös hahmosi muotokuvan. Se käyttää omaa Codexiasi tai Claude Codeasi, sinun kirjautumisellasi, sinun tilauksellasi ja sen rajoilla: **Codex** maalaa ne, muuten **Claude Code** piirtää ne. **Asetukset** kertoo, pystyykö tämä tietokone tekemään niitä, ja jos ei, miten sen saa kuntoon. Voit aina antaa pelinjohtajalle oman kuvasi.

### 3.12 Turvallisuus: rajat, verhot ja stop

**Rajat** eivät koskaan esiinny pelissä. **Verhot** tapahtuvat vain kuvan ulkopuolella. Kirjoita milloin tahansa *[stop]*: pelinjohtaja jättää sen sisällön heti pois ja lisää sen rajoihisi.

### 3.13 Mielen muuttaminen

Jokaista asetusta voi muuttaa, keskustelussa tai kohdassa **Asetukset**. Ratkaisu, jonka pelinjohtaja tekee ilman sääntökirjaa, muuttuu **ennakkotapaukseksi**, jolloin sama kysymys saa ensi kerralla saman vastauksen.

---

## 4. Hallintanäkymä <!-- icon: party -->

Sivu omalla tietokoneellasi. Se avautuu vain tämän tietokoneen selaimessa ja toimii niin kauan kuin keskustelu on auki. Kun keskustelu sulkeutuu, sivulla lukee *Not connected*. Yhteys palaa itsestään seuraavan keskustelun mukana.

- **Seurue**: oma hahmolomakkeesi ja seuralaistesi lomakkeet. Heitä numerolla napsauttamalla. Vie osoitin numeron päälle, niin näet, mistä se tulee. Jos nuoli merkitsee noppaa, näet myös, mikä parantaa tai huonontaa heittoa. Sen vieressä näkyvät heitot.
- **Kohtaus**: missä olet, paikan kuva ja kartta, ketkä ovat paikalla ja mitä tapahtuu. Taistelussa näet vuorot ja hahmosi kortin.
- **Päiväkirja**: tehtävät, tarina, seuralaistesi päiväkirjat ja omat muistiinpanosi.
- **Maailma**: maailmankartta, se mitä hahmosi tietää, löydetyt asiakirjat ja kalenteri.
- **Noppa-alusta**: valitse nopat ja muunnin ja heitä. ×2 kaksinkertaistaa nopat mutta ei muunninta, kuten kriittisessä osumassa.
- **Tallennukset**, **Ohje**, **Asetukset** ja **Tietoja** näkyvät kuvakkeina rivin lopussa. Asetuksissa ovat myös sivun omat valinnat: teema, noppien ääni ja noppasetti.

Kun pelinjohtaja kysyy sinulta jotain, sen palkki pysyy ylhäällä, missä osiossa tahansa olet.

---

## 5. Pelijärjestelmät ja talosäännöt <!-- icon: dice -->

### 5.1 Mikä pelijärjestelmä on

Yhden pelin tiedot: sen hahmolomake, luvut, olennot, esineet, loitsut ja sääntötekstit. Jokainen kampanja pelaa yhtä järjestelmää. RPG Engine laskee hahmolomakkeen sekä sen, mikä kuluu ja mikä palautuu. Pelinjohtaja lukee säännöistä, miten kyky toimii, ja päättää, kuten pelipöydässä.

### 5.2 Viides painos

SRD 5.1:n rodut, hahmoluokat, alaluokat, tausta ja erikoistaito; 319 loitsua, aseet, haarniskat, taikaesineet ja hirviöt; sääntöluvut, jotka pelinjohtaja lukee tarkalta sanamuodolta; täysi hahmolomake laskettuna valmiiksi.

Se on oma pakettinsa: pelinjohtaja tarjoaa sitä, kun luot kampanjaa, ja asentaa sen. Kampanja, joka pelaa sitä, asentaa paketin itse, kun se avataan ensimmäistä kertaa tietokoneella, jolla pakettia ei ole. Pelinjohtaja kertoo siitä sinulle.

Voit pelata myös sisältöä, jota SRD:stä puuttuu, omistamastasi kirjasta: pelinjohtaja kirjoittaa sen kampanjasi sivuiksi, ja RPG Engine käsittelee ne ominaan. RPG Engine toimittaa vain avointa sisältöä, mutta pelinjohtajan tiedot eivät rajoitu siihen.

Omat sääntökirjasi voivat olla kirjastosi: kerro pelinjohtajalle, missä ne ovat, *[Sääntökirjani ovat kansiossa D:\Books\5e.]*, tai lisää niiden kansio kohdassa Packages › Library ja vastaa kerran myöntävästi tietokoneesi näyttämään ikkunaan. RPG Engine lukee ne tällä tietokoneella. Jokainen kampanja käyttää kansioita, jotka olet siellä ottanut käyttöön. Pelinjohtaja hakee niistä, kun hän ratkaisee sääntöä, SRD:n jälkeen, ja mainitsee kirjan ja sivun. Ne luetaan parhaiten tekstinä tai PDF-tiedostoina, joiden teksti on valittavissa. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, muutamassa minuutissa ja muutamin virhein. RPG Engine ei koskaan muuta sääntökirjojasi, ei koskaan lähetä niiden tekstiä minnekään eikä koskaan kopioi sitä kampanjaan.

### 5.3 Talosäännöt ja omat lisäykset

Pyydä pelinjohtajaa: *[Talosääntö: luonnollinen 1 hyökkäyksessä tarkoittaa, että pudotat aseesi.]* Pelinjohtaja pitää sen pöydän sopimuksena tai kirjoittaa sivun tai hahmolomakkeen luvun, kun sellainen tarvitaan. Valmiiksi kirjoitetut talosäännöt voivat olla tekstitiedostoina kampanjan `rules`-kansiossa.

### 5.4 Oman pelijärjestelmän lisääminen tai tuominen

Pelijärjestelmä on paketti: pelinjohtaja asentaa sen npm:stä, kansiosta tai tiedostosta. Jos paketti ei ole meidän, asennus vaatii sinun myöntävän vastauksesi tietokoneesi ikkunassa. Paketin tekeminen on kehittäjän työtä, ja se kuvataan RPG Enginen dokumenteissa GitHubissa. Oman kirjasi muuttaminen pelijärjestelmäksi ei ole vielä mahdollista ([Tulossa myöhemmin](#9-coming-later)).

---

## 6. Laajennukset <!-- icon: plus -->

Laajennus lisää kampanjaan jotakin pelijärjestelmän päälle: esimerkiksi sään, joka muuttuu joka aamunkoitteessa, tai lukon tiputtelun nopilla. Lisää laajennus kohdassa Packages › Add: valitse se listasta tai anna sen nimi npm:ssä, kansio tai tiedosto. Laajennus, joka ei ole meidän tekemämme, tuo mukanaan koodia. Se tulee mukaan vain sinun suostumuksellasi, tietokoneesi ikkunassa. Jos laajennus on tehty toiselle pelijärjestelmälle, se kertoo sen, eikä sitä lisätä. Kohdassa Packages › Installed voit päivittää laajennuksen tai poistaa sen. Pelinjohtaja voi myös lisätä laajennuksen, kun pyydät.

---

## 7. Mistä kampanja tulee, ja sen kieli <!-- icon: world -->

### 7.1 Kolme tapaa saada maailma

- **Tehty lennossa**: lähtökohdastasi pelinjohtaja rakentaa jokaisen paikan, henkilön ja juonen juuri ennen kuin tarvitset sen, ja säilyttää sen.
- **Valmisteltu alussa**: sama, mutta maailma rakennetaan ennen pelin alkua.
- **Omasta seikkailustasi tai kirjastasi**: anna pelinjohtajalle sen tiedosto, *[Tuo tämä seikkailu kampanjaksemme: D:\Books\adventure.pdf. Älä kerro minulle mitään, mikä siinä on.]* Se luetaan parhaiten tekstinä, EPUBina, Word-asiakirjana tai PDF:nä, jonka tekstin voi valita. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, hitaasti ja muutaman virheen kera. Oma Codexisi tai Claude Codesi lukee sen keskustelun ulkopuolella, tai muuten pelinjohtaja keskustelussa, sinun tilauksellasi: koko asiakirja menee OpenAI:lle tai Anthropicille tilisi ehtojen ja sen koulutusvalinnan mukaisesti. Kojelauta näyttää, kuinka pitkällä työ on. Romaanista pelinjohtaja ehdottaa, mistä aloittaa. Pelinjohtaja kirjoittaa paikat, hahmot ja salaisuudet.

Kampanja pelataan kerran: jos haluat pelata saman seikkailun uudestaan, luo uusi kampanja.

### 7.2 Kielet

Yksi kieli kampanjaa kohden, pelinjohtajan kieli, jota kojelauta seuraa. Kojelaudan mukana tulee 26 kieltä. Minkä tahansa muun kielen kääntää tietokoneellasi Codex tai Claude Code, tai ilman niitä pelinjohtaja keskustelussa. Viidennen laitoksen termit italiaksi tulevat viralliselta italialaiselta SRD:ltä. Sääntöteksti pysyy englanniksi, ja pelinjohtaja kertoo sen sinun kielelläsi.

---

## 8. Uteliaille: kampanjakansio <!-- icon: list -->

Sinun ei koskaan tarvitse avata sitä, ja siinä ovat kampanjasi salaisuudet. Siinä on `campaign.yaml` (asetuksesi), `state.yaml` (pelin tilanne), `world/` (yksi markdown-sivu jokaista hahmoa, paikkaa, tehtävää ja muuta kohden), `rules/` (kotisääntösi), `images/`, `log.jsonl` (jokainen muutos), `.saves/`, `.player/` (muistiinpanosi) sekä pienet tiedostot, jotka kertovat tekoälyagenteille, missä RPG Engine on. Sivut käyttävät Obsidianin muotoa. Jos muutat sivua käsin, pelinjohtaja saa siitä tiedon seuraavalla vastauksellaan.

RPG Engine pysyy tässä kansiossa: se lukee ja kirjoittaa peliä vain täällä eikä koske muihin tiedostoihisi. Sääntökirjojesi kansioita se vain lukee. Sen ulkopuolelle se jättää vain omia tietokansioitaan (kojelaudan käännökset, sääntökirjoistasi luetun tekstin sekä Codexin tai Claude Coden, jos annat asentaa ne) ja väliaikaisia kansioita kuvan piirtämisen ajaksi. Kaikesta muusta, mitä agenttisi haluaa tehdä tietokoneellasi, se kysyy sinulta ensin.

Kaikki pelinjohtajan käyttämät komennot voi ajaa myös kampanjakansiossa: `rpg --help` luettelee ne. Monet tulostavat kampanjan salaisuuksia.

---

## 9. Tulossa myöhemmin <!-- icon: hourglass -->

- **Sinä pelinjohtajana**, ja tekoäly pelaa seuruetta.
- **Tekijätila**: kirjoita seikkailu tekoälyn kanssa, vie se ja jaa se.
- **Useita pelaajia samalla tietokoneella**, jokaisella oma hahmo, vuorotellen samassa keskustelussa.
- **Lisää laajennuksia**: maailmoja, ominaisuuksia ja kotisääntöjä jaettavaksi.
- **Muita pelejä**: lisää pelijärjestelmiä ja omia pelejä.

---

## 10. Kysymykset ja ongelmat <!-- icon: info -->

### Kysymykset

**Pitääkö minun osata säännöt?** Ei. Valitse mentoriksi opastus ja kysy hakasulkeissa milloin haluat.

**Voiko pelinjohtaja huijata?** Se ei voi muuttaa RPG Enginen tekemää heittoa, paitsi vaikeustasolla tarina, eikä jo vahvistettuja tosiasioita.

**Maksaako se mitään?** RPG Engine on ilmainen. Pelinjohtaja toimii agenttisi tilauksella tai omalla tietokoneellasi paikallisella mallilla. Pelilta on pitkä keskustelu: pienimmillä tilauksilla voit saavuttaa tilauksen rajan ennen illan loppua. Kuvat, käännökset ja tuonnit käyttävät samaa tilausta. RPG Engine itse ei koskaan käytä API-avainta, joka maksaa kutsukohtaisesti: kirjaudu agenttiisi tililläsi, älä avaimella.

**Voinko pelata puhelimella?** Et: pelinjohtaja toimii tietokoneellasi, ja kojelauta aukeaa vain siellä.

**Voinko pelata kavereiden kanssa?** Ei vielä: nykyisin yksi pelaaja, yksi hahmo ja seuralaiset ([Tulossa myöhemmin](#9-coming-later)).

**Voinko käyttää ensi kerralla eri tekoälyä?** Voit: avaa kampanja toisessa agentissa ja kirjoita *jatka*.

### Ongelmat

**Kojelauta ei aukea.** Kysy pelinjohtajalta: `[Mikä on kojelaudan linkki?]`. Se toimii vain, kun kyseisessä kampanjassa on keskustelu auki, pelinjohtajan ensimmäisen vastauksen jälkeen.

**Pelinjohtaja ei tunnu tuntevan peliä.** Agenttisi ei ladannut RPG Engineä. Tarkista, että käynnistit sen kampanjakansiossa ja että luotit kansioon. Claude Codessa kirjoita `/mcp` ja yhdistä `rpg` uudelleen. Codexissa komennon `codex mcp list` kampanjakansiossa pitää näyttää `rpg`. Jos komentoa `rpg --version` ei löydy, asenna RPG Engine uudelleen ([2.2](#22-install)).

**Päivittäminen.** Suorita `npm install -g rpg-engine` uudelleen ja avaa sitten uusi keskustelu: käynnissä oleva pelinjohtaja pitää sen version, jolla se käynnistyi.

**Pelinjohtaja muistaa jotain, minkä peruin.** Avaa uusi keskustelu ja paina Tallennuksissa **Avasin uuden keskustelun**.

**Kuvia ei ilmesty.** Asetukset > Kuvat kertoo, voiko tämä tietokone tehdä niitä, ja miten.

**Asennus epäonnistuu tai `rpg` ei käynnisty.** Komennon `node --version` pitää näyttää 22 tai uudempi. Pidä Windowsissa RPG Engine ja kampanjasi poissa poluista, joissa on `&`.

**Kojelaudan linkki muuttui.** Toinen ohjelma otti tavallisen osoitteen. Pelinjohtaja antaa sinulle uuden linkin.
