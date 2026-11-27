<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: täydellinen opas

**RPG Engine** antaa sinun pelata pöytäroolipeliä, jossa **tekoäly toimii pelinjohtajana**. Pelaat **kojelaudassa**, tietokoneesi ikkunassa, jossa ovat hahmolomake, nopat, kartat, päiväkirja ja **keskustelu** pelinjohtajan kanssa.

Tämä opas kertoo, miten pelataan. Sivu selittää omat painikkeensa: vie osoitin painikkeen päälle, niin näet, mitä se tekee.

## Pika-aloitus <!-- icon: send -->

1. Asenna **Node.js** osoitteesta [nodejs.org](https://nodejs.org) (LTS-versio).
2. Avaa uusi pääte ja kirjoita `npm install -g rpg-engine`. Jos Windows ilmoittaa, että komentosarjojen suorittaminen on estetty, kirjoita `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, vastaa myöntävästi ja yritä uudelleen.
3. Kirjoita `rpg open`: se tuo RPG Enginen kuvakkeen työpöydällesi ([2.2](#22-installing)). Sen jälkeen käynnistät RPG Enginen kuvakkeesta.
4. Paina **Uusi kampanja**, anna sille nimi ja paina **Luo** ([2.3](#23-a-new-campaign)).
5. Valitse keskustelussa tekoälysovelluksesi ja sen malli ([2.4](#24-connect-your-ai)): Claude Code vaatii maksullisen Claude-tilauksen, Codex ChatGPT-tilin, ilmaisen tai maksullisen. Paina **Avaa keskustelu** ja sitten **Aloita**.

Ensimmäinen vastaus voi kestää pari minuuttia. Sen jälkeen pelinjohtaja kysyy, miten haluat pelata, ja teette hahmosi yhdessä.

## 1. Mikä RPG Engine on <!-- icon: about -->

| Kuka | Mitä tekee |
|---|---|
| **Sinä** | Pelaat hahmoasi: mitä hahmo tekee, sanoo ja yrittää. |
| **Pelinjohtaja** (tekoäly) | Kertoo tarinan, esittää kaikkia muita, päättää, mitä tapahtuu, ja pyytää heittoja. |
| **RPG Engine** | Säilyttää maailman tiedostoissa, heittää nopat, laskee osumapisteet, rahat, ajan ja etäisyydet sekä pitää salaisuudet piilossa, kunnes ne paljastuvat. |

Maailma pysyy siis samana illasta toiseen, vaikka avaisit uuden keskustelun tai käyttäisit eri tekoälyä:

- **Mikä on sanottu, se pysyy totena.** Kuollut konna pysyy kuolleena.
- **Nopat ovat oikeat.** Pelinjohtaja ei voi muuttaa niitä, paitsi helpoimmalla vaikeustasolla.
- **Salaisuudet pysyvät salaisina.** Pelinjohtaja ei koskaan kerro sinulle sitä, mitä hahmosi ei tiedä.
- **Maailma liikkuu.** Uhat etenevät, kun lepäätte tai matkaatte.
- **Kampanja on kansio** tietokoneellasi: voit lopettaa milloin haluat ja jatkaa myöhemmin.

Peli tulee pelijärjestelmänä. Nykyinen järjestelmämme on **viides painos** ilmaisesta System Reference Document 5.1 -aineistosta. Ilman pelijärjestelmää pelaat vapaasti: tarinaa ilman lukuja.

---

## 2. Aloittaminen <!-- icon: path -->

### 2.1 Mitä tarvitset

- Tietokone, jossa on Windows, macOS tai Linux.
- **Node.js 24** tai uudempi, osoitteesta [nodejs.org](https://nodejs.org).
- **Pääte**, vain asennusta varten: Windowsissa Terminal tai PowerShell, macOS:ssä Terminal.
- Pelinjohtajalle **tekoälysovellus** omalla tilillä ([2.4](#24-connect-your-ai)).

### 2.2 Asennus

```text
npm install -g rpg-engine
rpg open
```

Ensimmäinen rivi asentaa RPG Enginen. Jos npm tarjoutuu päivittämään itsensä, voit ohittaa tarjouksen.

`rpg open` avaa RPG Enginen ikkunan. Ensimmäisellä kerralla se tuo kuvakkeen myös työpöydälle ja valikkoon: sen jälkeen käynnistät pelin kuvakkeesta. Jos haluat poistaa kuvakkeen, kirjoita `rpg icon --remove`.

Jos asennus epäonnistuu, tarkista, että `node --version` näyttää 24 tai suuremman luvun. Jos Windows ilmoittaa, että komentosarjojen suorittaminen on estetty, kirjoita `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` ja vastaa myöntävästi. Windowsissa pidä RPG Engine ja kampanjasi poissa poluista, joissa on `&`.

### 2.3 Uusi kampanja

Paina **Uusi kampanja** ja anna sille **Nimi**, **Kieli** ja **Pelijärjestelmä**. Loput pelinjohtaja tekee kanssasi. Paina **Luo**: kampanja avautuu omaan ikkunaansa.

Pelinjohtaja ja kojelauta puhuvat kampanjan kieltä. Viidennen editionin sääntöteksti pysyy englanniksi, ja pelinjohtaja kertoo sen sinun kielelläsi.

Kampanja on nimensä mukainen kansio käyttäjäkansiosi `RPG Engine` -kansion sisällä. Seuraavalla kerralla napsauta sen korttia.

### 2.4 Tekoälyn yhdistäminen

Pelinjohtaja toimii tietokoneellasi **tekoälysovelluksessa**, sinun tililläsi. Pelkkä verkkokeskustelu, kuten claude.ai tai ChatGPT, ei riitä: pelinjohtajan täytyy päästä käsiksi kampanjan tiedostoihin.

- **Claude Code**: maksullinen Claude-tilaus (Pro tai korkeampi).
- **Codex**: ChatGPT-tili, ilmainen tai maksullinen.
- **OpenCode**: ei tiliä; muutama ilmainen malli rajoitetun ajan, tai oman palveluntarjoajasi mallit, myös paikalliset.
- **Antigravity**: Google-tili; ilmaisessa käytössä on viikoittaiset rajat.

Valitse keskustelussa sovellus, sen **Malli** ja **Pelinjohtajan ajatukset**. Jos sovellus puuttuu tai et ole kirjautunut sisään, painike asentaa sovelluksen, kirjaa sinut sisään tai avaa sovelluksen sivuston. RPG Engine ei koskaan näe salasanaasi.

Pelilta on pitkä keskustelu: pienimmillä tilauksilla raja voi tulla vastaan ennen illan loppua. Pelaa suurimmalla mallilla, joka sinulla on: pienen mallin saa helpommin puhuttua paljastamaan salaisuuksia.

Pelaamme ja testaamme RPG Enginea eniten **Claude Codella**. Antigravity on **kokeilussa**: se voi astua ulos pelistä, ja se säilyttää keskustelusi muistissa, jota et voi poistaa käytöstä. Se, mitä siellä kirjoitat, menee Googlelle, joka voi antaa ihmisten lukea sen. RPG Engine ei ole Googlen tuote.

### 2.5 Ensimmäinen keskustelu

Paina **Avaa keskustelu** ja sitten **Aloita**. Ensimmäinen vastaus voi kestää pari minuuttia. Sen jälkeen uusi kampanja käy läpi kolme vaihetta:

1. **Asetukset**: pelinjohtaja kysyy, miten haluat pelata, muutaman kysymyksen kerrallaan: kuinka vaikea maailma on, voitko kuolla ja milloin voit palata tallennukseen. Kirjoita *päätä sinä*, niin pelinjohtaja valitsee. Kaiken voi muuttaa myöhemmin.
2. **Nollasessio**: teet hahmosi pelinjohtajan kanssa, kuten pelipöydän ääressä. RPG Engine laskee hahmolomakkeen luvut. Jos sinulla on jo hahmo, liitä sen lomake keskusteluun.
3. **Peli**: pelinjohtaja avaa ensimmäisen kohtauksen.

### 2.6 Pelaaminen tekoälysovelluksessasi

Voit pelata myös tekoälysovelluksesi omassa keskustelussa, päätteessä tai sen työpöytäsovelluksessa, kojelauta sen vieressä.

1. Avaa pääte kansiossa, jossa säilytät pelisi: napsauta kansiota hiiren kakkospainikkeella ja valitse **Avaa päätteessä** (Windows) tai **Palvelut > Uusi Terminal kansiossa** (macOS).
2. Kirjoita `rpg init "The Salt Isles"`: se luo kansion `The Salt Isles`, jossa on uusi kampanja.
3. Käynnistä sovelluksesi siinä kansiossa: `claude`, `codex`, `agy` Antigravitylle tai `opencode`. Vastaa myöntävästi, kun se kysyy, luotatko kansioon: Claude Codessa valmiiksi valittuna on vastaus *No, exit*.
4. Kirjoita *Hei! Aloitetaan.* Pelinjohtaja antaa sinulle linkin kojelautaasi: avaa se keskustelun viereen.

Hyvä tietää:

- Älä avaa sovelluksesi käyttämien työkalujen tietoja (Claude Codessa ctrl+o): ne voivat paljastaa salaisuuksia.
- Codexin työpöytäsovelluksessa poista muistit käytöstä pelin keskusteluissa.
- Jos pelinjohtaja ei tunne peliä, kirjoita kampanjakansiossa `rpg init` ja avaa uusi keskustelu.
- Jos Windows ei löydä komentoa `claude`, lisää asennusohjelman nimeämä kansio PATH-muuttujaan ja avaa sitten uusi pääte.
- Kampanjaa pelaa yksi keskustelu kerrallaan: kun sinun keskustelusi on auki, kojelaudan keskustelu odottaa.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Keskustelu pelinjohtajan kanssa

Kirjoita, mitä hahmosi tekee tai sanoo:

> Kysyn majatalon isännältä, kuka muu kävi täällä tänä iltana.

Sinä kerrot, mitä yrität. Pelinjohtaja kertoo, mitä tapahtuu. Pelinjohtaja ei koskaan päätä hahmosi puolesta.

Jos haluat puhua tarinan ulkopuolelta, kirjoita `[OOC: …]` (out of character, eli hahmon ulkopuolelta): *[OOC: Miten painiminen toimii?]* Voit kysyä pelinjohtajalta sääntöjä tai sitä, miten kojelauta toimii.

Kun pelinjohtaja kysyy sinulta jotain, vastaa sen painikkeilla tai omin sanoin. Voit toimia myös hahmolomakkeesta: klikkaa asetta, loitsua tai esinettä ja valitse, mitä teet.

**Pysyvät käskyt**: kerro seuralaisillesi jotain, minkä pitäisi pysyä voimassa, esimerkiksi *Tästä lähtien jätä aina yksi henkiin*. Pelinjohtaja pitää sen voimassa, kunnes perut sen.

### 3.2 Heitot

Pelinjohtaja pyytää heiton vain, kun lopputulos on epävarma ja sillä on merkitystä. Ilmoituspalkki näyttää heiton: klikkaa sitä, niin nopat putoavat.

Nopat kuuluvat RPG Enginelle, eivät pelinjohtajalle. Voit aina kysyä *[Oliko tuo heitto oikea?]*: salaisestakin heitosta pelinjohtaja voi todistaa, että se tehtiin ennen kysymystäsi.

Kun **Nopat**-asetuksena on fyysiset, heitä omat noppasi ja kirjoita tulos: *[Heitin 14.]* Huvikseen tekemäsi heitot, hahmolomakkeelta tai **Vapaalla heitolla**, eivät koskaan lasketa.

### 3.3 Kohtaukset, taistelut ja matkustaminen

Tarina etenee **kohtauksina**: taistelu, keskustelu, matka, lepo. Jokaisen kohtauksen lopussa peli tallentaa itse, ja kohtaus siirtyy päiväkirjaasi.

Taistelussa pelinjohtaja pelaa jokaisen vuoron, joka ei ole sinun, ja pysähtyy, kun sinun pitää päättää.

Kerro, minne menet, *Lähdemme pohjoiseen vievälle tielle kohti Roccaa*: RPG Engine laskee matkan ja päivät ja pysähtyy, jos matkalla tapahtuu jotain. Sillä välin konnien suunnitelmat etenevät, ja näet niiden merkit.

### 3.4 Tallennukset

RPG Engine tallentaa kampanjan jokaisen kohtauksen lopussa. Asetus **Tallennukset** ratkaisee, milloin voit palata takaisin:

- **Pysyvä kuolema**: et koskaan.
- **Tallennuspiste**: viimeiseen tallennukseen, vain kun hahmosi kuolee.
- **Vapaa**: mihin tahansa tallennukseen, ja voit tallentaa milloin haluat.

Kaikissa tiloissa voit aloittaa alusta, keskustelussa tai kohdassa **Tallennukset**.

Kun olet palannut takaisin, avaa uusi keskustelu, sillä vanha muistaa, mikä peruttiin:

1. Paina **Sulje keskustelu** ja sitten **Uusi keskustelu**. Tekoälysovelluksesi omassa keskustelussa avaa uusi keskustelu (Claude Codessa `/clear`).
2. Kirjoita *jatka*.
3. Paina Tallennuksissa **Avasin uuden keskustelun**. Siihen asti pelinjohtaja odottaa.

### 3.5 Lopettaminen ja jatkaminen

Lopeta, kun haluat: kaikki on jo tallennettu. Sulje kojelaudan ikkuna, ja hetken kuluttua peli pysähtyy. Mitään ei katoa.

Kun haluat palata, avaa RPG Engine kuvakkeesta ja klikkaa kampanjaasi. Paina **Jatka keskustelua** ja sitten **Jatka tarinaa**: pelinjohtaja kertoo, mihin jäitte, ja jatkaa. Ensi kerralla voit valita myös toisen tekoälysovelluksen.

### 3.6 Rajoitukset ja stop

**Rajat** eivät koskaan esiinny pelissä; **verhot** tapahtuvat vain kuvan ulkopuolella. Ne asetat kohdassa **Asetukset**.

Kirjoita milloin tahansa *[stop]*: pelinjohtaja jättää sen sisällön pois ja lisää sen rajoihisi.

### 3.7 Kuvat

Pelinjohtaja voi teettää kuvia paikoista, tehtävistä ja ihmisistä **Kuvat**-asetuksen mukaan sekä hahmosi muotokuvan, kun pyydät. Tekoälysovelluksesi tekee ne sinun tilauksellasi. Jos kuvia ei ilmesty, **Asetukset** kertoo, pystyykö tämä tietokone tekemään niitä.

Voit myös antaa hahmollesi tai maailman sivulle oman kuvasi, suoraan sivulta.

---

## 4. Hallintanäkymä <!-- icon: party -->

Ikkuna, jossa näet pelisi. Se näyttää vain sen, minkä hahmosi tietää.

- **Roolipeli**: keskustelu pelinjohtajan kanssa, kun se ei ole sivun vieressä.
- **Seurue**: oma hahmolomakkeesi, seuralaistesi lomakkeet ja heitot.
- **Kohtaus**: missä olet, ketkä ovat paikalla ja kartta; taistelussa vuorot.
- **Päiväkirja**: tehtävät, tarina kirjana, seuralaistesi päiväkirjat ja muistiinpanosi.
- **Maailma**: maailmankartta, se mitä hahmosi tietää, löydetyt asiakirjat ja kalenteri.
- **Tallennukset**: takaisin palaaminen ja alusta aloittaminen.
- **Asetukset**: miten pelaat ja miltä sivu näyttää.
- **Paketit**: pelijärjestelmä, laajennukset, omat käsikirjasi ja päivitykset: kun uusi RPG Engine on ilmestynyt, se kerrotaan täällä.

Jos sivu kertoo, ettei yhteyttä ole, paina **Avaa kampanja uudelleen**.

Jos haluat pelata puhelimella kotona: ota kohdassa **Asetukset**, **Kojelauta**, käyttöön **Puhelinyhteys** ja kohdista puhelimen kamera koodiin. Puhelimen pitää olla samassa Wi-Fi-verkossa kuin tietokone. Windows voi kysyä, saako Node.js käyttää verkkoa: salli se yksityisissä verkoissa ja aseta Wi-Fi yksityiseksi verkoksi. Peli kulkee salaamattomana: käytä sitä vain luotettavassa verkossa, kuten kotonasi, ei koskaan julkisessa, hotellin tai työpaikan Wi-Fi-verkossa. Sammuta yhteys, kun olet valmis: peli päättyy tietokoneen viimeisen ikkunan mukana.

Jos teema tekee sivusta vaikealukuisen, lisää sivun osoitteen loppuun `#/settings/page` ja poista käytöstä **Teeman oma tyyli**.

---

## 5. Säännöt, käsikirjat ja laajennukset <!-- icon: dice -->

**Pelijärjestelmä** on yhden pelin tiedot: hahmolomake, otukset, esineet, loitsut ja säännöt. RPG Engine laskee hahmolomakkeen luvut. Pelinjohtaja lukee, miten sääntöä sovelletaan, ja päättää siitä, kuten pöydän ääressä.

**Fifth edition** sisältää System Reference Document 5.1:n vapaat säännöt. Voit pelata myös omistamasi kirjan sisältöä: pelinjohtaja kirjoittaa sen kampanjaasi.

**Omat käsikirjasi**: kerro pelinjohtajalle, missä ne ovat, tai lisää niiden kansio kohdassa **Paketit**. Pelinjohtaja hakee säännöt niistä ja mainitsee kirjan ja sivun. RPG Engine ei koskaan muuta käsikirjoja eikä kopioi niitä kampanjaan.

**Kotisäännöt**: pyydä pelinjohtajaa, *[House rule: a natural 1 on an attack means you drop your weapon.]* Pelinjohtaja muistaa säännön. Kerran tehty ratkaisu pätee myös seuraavalla kerralla.

**Laajennukset** tuovat peliin jotain lisää, esimerkiksi sään. Lisää ne kohdassa **Paketit** tai pyydä pelinjohtajaa.

---

## 6. Oma seikkailusi <!-- icon: world -->

Jos kirjoitettua maailmaa ei ole, pelinjohtaja rakentaa sellaisen lähtökohtasi pohjalta ja pitää sen tallessa.

Jos haluat pelata seikkailun tai omistamasi kirjan, anna pelinjohtajalle sen tiedosto: *[OOC: Tuo tämä seikkailu kampanjaksemme: D:\Books\adventure.pdf. Älä kerro minulle mitään, mitä siinä on.]* Kampanjan ulkopuolista tiedostoa luetaan vasta, kun olet sanonut kyllä. Se luetaan parhaiten tekstinä, EPUB-, Word- tai PDF-tiedostona, jonka teksti on valittavissa.

Koko asiakirja lähtee sen tekoälyn yritykselle, joka sen lukee. Kampanja pelataan vain kerran: jos haluat pelata saman seikkailun uudelleen, luo uusi kampanja.

---

## 7. Tietosi <!-- icon: lock -->

- Kampanja on kansio. Siinä ovat kampanjan salaisuudet ja myös keskustelusi pelinjohtajan kanssa. Sinun ei koskaan tarvitse avata sitä.
- RPG Engine lukee ja kirjoittaa vain tässä kansiossa. Käsikirjojasi se vain lukee. Kaikkea muuta kampanjan ulkopuolella se käyttää vasta, kun olet sanonut kyllä tietokoneesi ikkunassa.
- Kojelaudan keskustelussa pelinjohtaja ei avaa tiedostojasi omin päin.
- Kirjoittamasi menee sille yritykselle, jonka malli pelaa pelinjohtajaa, tilisi ehtojen mukaisesti. Paikallisella mallilla kaikki pysyy tietokoneellasi.
- Pelijärjestelmä tai laajennus, joka ei ole meidän, on koodia, joka toimii tietokoneellasi. Se tulee käyttöön vain, kun olet sanonut kyllä. Sano kyllä vain tekijöille, joihin luotat.
- Jos kampanjan kansio on git-varasto, **Asetukset** voi tallentaa sen muutokset puolestasi. Päästä keskustelusi mukaan vain, jos varasto on yksityinen.
- Kun **Puhelinyhteys** on päällä, peli kulkee salaamattomana tietokoneelta puhelimeen kotiverkkosi kautta, ilman ulkopuolista palvelua. Kuka tahansa samassa verkossa voisi lukea sen.
