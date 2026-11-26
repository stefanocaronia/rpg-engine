<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: täydellinen opas

**RPG Engine** antaa sinun pelata pöytäroolipeliä, jossa **tekoäly toimii pelinjohtajana**. Pelaat **kojelaudassa**, tietokoneesi ikkunassa, jossa ovat hahmolomake, nopat, kartat, päiväkirja ja **keskustelu** pelinjohtajan kanssa. RPG Engine työskentelee taustalla: se **muistaa maailman**, **heittää nopat** ja **pitää kirjaa**.

Tämä opas on pelaajille: ohjelmointitaitoja ei tarvita.

## Pika-aloitus <!-- icon: send -->

1. Asenna **Node.js** osoitteesta [nodejs.org](https://nodejs.org) (LTS-versio).
2. Asenna RPG Engine kerran uudessa päätteessä, joka on avattu Node.js:n asennuksen jälkeen: `npm install -g rpg-engine`. Jos Windows ilmoittaa, että komentosarjojen suorittaminen on estetty, kirjoita kerran `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, vastaa myöntävästi ja yritä uudelleen.
3. Kirjoita `rpg open`. Se kysyy, lisätäänkö RPG Enginen kuvake työpöydälle ja valikkoon: vastaa myöntävästi painamalla Enteriä. Sen jälkeen käynnistät RPG Enginen kuvakkeesta ilman päätettä ([2.2](#22-install)).
4. Ikkunassa näkyvät kampanjasi. Paina **Uusi kampanja**, anna sille nimi ja paina **Luo** ([2.3](#23-create-a-campaign)): sen kojelauta avautuu omaan ikkunaansa.
5. Valitse pelinjohtajan kanssa käytävässä keskustelussa tekoälysovelluksesi ja sen malli: Claude Code vaatii maksullisen Claude-tilauksen, Codex ChatGPT-tilin, ilmaisen tai maksullisen ([2.4](#24-connect-your-ai)). Jos sovellus puuttuu tai et ole kirjautunut sisään, sivu asentaa sovelluksen tai kirjaa sinut sisään. Paina **Avaa keskustelu** ja sitten **Aloita**. Ensimmäinen vastaus voi kestää pari minuuttia. Sen jälkeen pelinjohtaja kysyy, miten haluat pelata, ja teette hahmosi yhdessä.

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
- **Node.js 24** tai uudempi, osoitteesta [nodejs.org](https://nodejs.org). Mukana tulee `npm`, joka asentaa RPG Enginen.
- **Pääte** kerran RPG Enginen asentamista varten: Windowsissa Terminal tai PowerShell, macOS:ssä Terminal. Voit avata päätteen kansioon napsauttamalla kansiota hiiren kakkospainikkeella ja valitsemalla **Avaa päätteessä** (Windows) tai **Palvelut > Uusi Terminal kansiossa** (macOS). Jos Windows ilmoittaa, että komentosarjojen suorittaminen on estetty, kirjoita kerran `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` ja vastaa myöntävästi.
- Pelinjohtajalle **tekoälysovellus** omalla tilillä ([2.4](#24-connect-your-ai)): sivu voi asentaa sen puolestasi. Pelaa sen tarjoamalla **suurimmalla mallilla**: pieni malli antaa helpommin puhua itsensä paljastamaan salaisuuksia tai taivuttamaan sääntöjä.

### 2.2 Asennus

```text
npm install -g rpg-engine
rpg open
```

Ensimmäinen rivi asentaa RPG Enginen. Komento `rpg --version` tarkistaa, että asennus onnistui. Jos npm tarjoutuu päivittämään itsensä, voit ohittaa tarjouksen.

`rpg open` avaa RPG Enginen ikkunan, jossa näkyvät kampanjasi. Ensimmäisellä kerralla se kysyy päätteessä, lisätäänkö sen kuvake työpöydälle ja Käynnistä-valikkoon (Macilla Appeihin): vastaa myöntävästi painamalla Enteriä. Sen jälkeen kaksoisnapsautat kuvaketta, eikä päätettä tarvita enää. Ilman kuvaketta kirjoita `rpg open` aina, kun pelaat. Komento `rpg icon` lisää kuvakkeen myöhemmin, ja `rpg icon --remove` poistaa sen.

### 2.3 Kampanjan luominen

RPG Enginen ikkunassa kampanjasi näkyvät korttina, viimeksi avattu ensimmäisenä. Paina **Uusi kampanja** ja anna sille **Nimi**, **Kieli** ja **Pelijärjestelmä**: loput pelinjohtaja tekee kanssasi. Kampanja tallentuu nimensä mukaiseen kansioon käyttäjäkansiosi `RPG Engine` -kansion sisään (Windowsissa `C:\Users\<nimi>`). **Valitse toinen kansio…** vie sen valitsemaasi tyhjään kansioon. Kohdassa **Pelinjohtaja** voit jo valita tekoälysovelluksen ja mallin sen ensimmäistä keskustelua varten ([2.4](#24-connect-your-ai)). Paina **Luo**: kampanjan kojelauta avautuu omaan ikkunaansa.

Seuraavalla kerralla avaat kampanjan napsauttamalla sen korttia. Auki olevassa kampanjassa lukee **Avoinna nyt**. **Avaa kansio…** lisää kampanjan, joka sinulla on jo tällä tietokoneella. Kortin pieni risti poistaa sen luettelosta: sen tiedostot jäävät paikoilleen.

### 2.4 Tekoälyn yhdistäminen

Pelinjohtaja toimii tietokoneellasi **tekoälysovelluksessa**, sinun omalla tililläsi: Claude Code, Codex, OpenCode tai Antigravity. Pelkkä chat, kuten claude.ai tai ChatGPT, tai puhelinsovellus ei riitä: pelinjohtajan täytyy päästä käsiksi kampanjan tiedostoihin tietokoneellasi. Jokainen sovellus tarvitsee oman tilinsä: Claude Code maksullisen Claude-tilauksen (Pro tai korkeampi), Codex ChatGPT-tilin, ilmaisen tai maksullisen, Antigravity Google-tilin, jonka ilmaisessa käytössä on viikoittaiset rajat. OpenCodessa on joitakin ilmaisia malleja rajoitetun ajan, tai se käyttää oman palveluntarjoajasi malleja, myös paikallisia.

Valitse kojelaudan keskustelussa sovellus kohdasta **Tekoälysovelluksesi**, sitten sen **Malli** ja **Pelinjohtajan ajatukset**: sivu ehdottaa niitä. Enemmän ajattelua on hitaampaa ja kuluttaa enemmän tilaustasi. Sovellus, joka ei ole valmis, kertoo, mitä se tarvitsee, ja tarjoaa painikkeen, joka hoitaa asian:

- **Claude Code** ja **Codex**: **Install Claude Code** tai **Install Codex** lataa sovelluksen RPG Enginen omaan kansioon tälle tietokoneelle. **Sign in to Claude Code** tai **Sign in to Codex** avaa sovelluksen kirjautumissivun selaimessasi. RPG Engine ei koskaan näe salasanaasi.
- **OpenCode** ja **Antigravity**: **Get OpenCode** tai **Get Antigravity** avaa sovelluksen sivuston, jossa asennat sen. OpenCodella pelaa ilman kirjautumista. Antigravityyn kirjaudutaan sen omassa sovelluksessa. Palaa sitten takaisin ja paina **Tarkista uudelleen**.

Antigravity on merkitty **kokeilussa**: se voi astua ulos pelistä ja kysellä omalla tavallaan, joten Claude Code, Codex tai OpenCode sopivat pelaamiseen paremmin. Antigravity säilyttää aiemmat keskustelusi, eikä sen muistia voi poistaa käytöstä: pelinjohtajaa on kielletty lukemasta niitä. Se, mitä kirjoitat, menee Googlelle, joka voi antaa ihmisten lukea sen: pidä henkilötiedot poissa pelistä. RPG Engine ei ole Googlen tuote. Pelaamme ja testaamme RPG Enginea eniten **Claude Codella**: muilla ei ole vielä pelattu kokonaista kampanjaa.

Kojelaudan keskustelussa pelinjohtaja koskee tietokoneeseesi vain RPG Enginen kautta: se ei avaa tiedostojasi itse. RPG Engine lukee kampanjan ulkopuolelta vain sen, minkä valitsit, kun olet vastannut myöntävästi tietokoneesi ikkunassa.

Voit pelata myös tekoälysovelluksesi omassa keskustelussa, päätteessä tai sen työpöytäsovelluksessa ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Ensimmäinen keskustelu

Kun sovellus ja malli on valittu, paina **Avaa keskustelu**: sovellus käynnistyy, mikä voi kestää muutaman sekunnin. Paina sitten **Aloita** tai kirjoita mitä tahansa, vaikka *Hei! Aloitetaan.* Ensimmäinen vastaus voi kestää pari minuuttia, kun pelinjohtaja luo kohtausta.

Keskustelulla on oma osionsa, **Roolipeli**, tai se on sivun vieressä: sen yläreunan pienillä painikkeilla voit asettaa sen kohtaan **Omalla välilehdellään**, **Vasemmalla** tai **Oikealla**, ja reunaa vetämällä saat sen leveämmäksi.

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
| **Hahmosi** | Miten hahmosi tehdään nollasessiossa | pelinjohtajan kanssa, pelinjohtajan tekemä, oma ([2.7](#27-session-zero-your-character)) |
| **Seuralaiset** | Kuka matkaa mukanasi | ei kukaan, luotu yhdessä kanssasi, pelinjohtajan luoma, tavattu pelissä |
| **Kuvat** | Kuvia paikoista, tehtävistä ja tapaamistasi hahmoista | ei mitään, pyynnöstä, uudet paikat, tehtävät ja tapaamasi hahmot ([3.11](#311-pictures)) |
| **Rajat** ja **Verhot** | Mikä ei koskaan esiinny pelissä ja mikä tapahtuu vain kuvaruudun ulkopuolella | luettelot |
| **Kieli** | Pelin ja kojelaudan kieli | mikä tahansa |

Viides editio lisää **kehittymisen**: kokemuspisteet tai merkkipaalut.

Jos maailmaa ei ole kirjoitettu valmiiksi, pelinjohtaja kysyy myös nämä: **Lähtökohta** (tyylilaji, sävy, muutama aines ja se, mistä pelissä nautit eniten, kuten taisteluista, arvoituksista, puheesta tai tutkimisesta, omin sanoin), **Valmistelu** (rakennetaanko maailma lennossa pelin edetessä vai kokonaan alussa) ja **Pituus** (yksi ilta, muutama pelikerta eli kolmesta viiteen iltaa, tai avoin, seikkailu toisensa jälkeen). Kun rajatun mittainen tarina päättyy, voit aina jatkaa.

Pelinjohtaja ei koskaan kysy asetusta **Pelinjohtajan tyyli**, mutta voit muuttaa sitä keskustelussa tai kohdassa **Asetukset**. Siellä on **Proosa** (selkeä, kirjallinen, pulp, kuiva), **Tarinat** (pelinjohtajan keksimät: tilanteet, juonikaaret, jaksot, mysteeri), **Kirjoita kuin** (kirjailija, jonka tyyliä pelinjohtaja jäljittelee) ja **Omin sanoin** (mikä tahansa muu toive).

### 2.7 Nollasessio: hahmosi

Teet hahmosi pelinjohtajan kanssa, kuten pelipöydän ääressä. Jokainen valinta on sinun, ellet pyydä pelinjohtajaa tekemään sitä: tule mukaan valmiin idean, epämääräisen idean tai ilman mitään ideaa, tai pyydä pelinjohtajaa tekemään koko hahmo muutaman sanan pohjalta. Tasoihin perustuvassa pelissä pelinjohtaja kysyy, miltä tasolta aloitat: ensimmäiseltä, ellet halua toista. Pelinjohtaja kertoo, miten ominaisuuspisteet määritetään, ennen kuin yhtään noppaa heitetään. Taustatarinaa ei koskaan vaadita. Jos kerrot sellaisen, pelinjohtaja kirjoittaa sen sinun sanoillasi. Sitten pelinjohtaja pyytää kuvaa hahmostasi ([3.7](#37-your-characters-story-and-picture)). RPG Engine laskee hahmolomakkeen: sinun ei koskaan tarvitse laskea itse.

Onko sinulla jo hahmo, toisesta pelistä tai toisesta kampanjasta? Valitse asetuksissa **Minulla on jo yksi** ja anna hahmo pelinjohtajalle: liitä hahmolomake keskusteluun. Tekoälysovelluksesi omassa keskustelussa voit myös kertoa, missä sen tiedosto on tietokoneellasi (PDF, kuva, teksti). Kojelaudan keskustelussa pelinjohtaja ei avaa tiedostojasi. Pelinjohtaja kirjoittaa hahmon sellaisenaan, sen tasolla, tarkistaa sen sääntöjä ja maailmaa vasten ja sopii kanssasi kaikesta, mikä ei sovi.

### 2.8 Toinen tapa: tekoälysovelluksesi oma keskustelu

Voit pelata myös suoraan tekoälysovelluksesi keskustelussa, päätteessä tai sen työpöytäsovelluksessa, kojelauta auki sen vieressä. Silloin luot kampanjan päätteessä, kansiossa, jossa säilytät pelisi ([2.1](#21-what-you-need) kertoo, miten), ja kirjoitat aina nimen: `rpg init "The Salt Isles"` luo kansion `The Salt Isles`, jossa on uusi kampanja. RPG Engine valmistelee siellä itse sen, mitä kukin sovellus tarvitsee.

Käynnistä sovelluksesi siinä kansiossa: `claude` Claude Codelle, `codex` Codexille, `agy` Antigravitylle, `opencode` OpenCodelle. Voit myös avata kansion sovelluksen työpöytäversiossa. Vastaa myöntävästi, kun se kysyy, luotatko kansioon. Varo: Claude Codessa valmiiksi valittuna on vastaus *No, exit*. Pelinjohtajaksi kelpaa myös mikä tahansa muu MCP:tä tukeva agentti: käynnistä se kampanjakansiossa ja anna sille MCP-palvelin `rpg mcp`.

Kirjoita *Hei! Aloitetaan.* Pelinjohtaja antaa jokaisen keskustelun ensimmäisessä vastauksessaan **linkin kojelautaasi**, esimerkiksi `http://127.0.0.1:4750`: avaa se keskustelun viereen.

- Pelinjohtajan viestien välissä sovelluksesi näyttää käyttämänsä työkalut. Älä avaa niiden tietoja (Claude Codessa ctrl+o), sillä ne voivat paljastaa salaisuuksia.
- Kampanja poistaa sovelluksen oman muistin käytöstä: peli elää sen tiedostoissa, jotta tallennukseen palaaminen palauttaa pelin todella takaisin. Tarkista Codexin työpöytäsovelluksen asetuksista, että muistit on poistettu käytöstä pelin keskusteluissa.
- Jos pelinjohtaja sanoo, ettei löydä RPG Enginen työkaluja, kirjoita kampanjakansiossa `rpg init` ja avaa sitten uusi keskustelu.
- Kampanjaa pelaa yksi keskustelu kerrallaan: kun sinun keskustelusi on auki, kojelaudan keskustelu odottaa.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Keskustelu pelinjohtajan kanssa

Kirjoita, mitä hahmosi tekee tai sanoo, omin sanoin:

> Kysyn majatalon isännältä, kuka muu kävi täällä tänä iltana.

Jos haluat puhua tarinan ulkopuolelta, kirjoita `[OOC: …]` (out of character, eli hahmon ulkopuolelta): *[OOC: Miten painiminen toimii?]* Pelinjohtaja vastaa samalla tavalla. Kojelaudan keskustelussa sen pelin ulkopuoliset sanat erottuvat omikseen, OOC-merkittyinä.

Kirjoita kojelaudan keskustelussa alareunan kenttään ja lähetä painamalla Enteriä. Shift+Enter aloittaa uuden rivin. Kun pelinjohtaja vastaa, **Pysäytä** keskeyttää vastauksen, ja sanasi odottavat kentässä. Kun pelinjohtaja kysyy sinulta jotain, kysymyksen mukana tulevat painikkeet, heitotkin: klikkaa yhtä tai kirjoita vastauksesi. Kentän alla näet sovelluksen ja mallin. Jos sovellus sen sallii, voit vaihtaa mallin klikkaamalla sitä, kun pelinjohtaja on vastannut. **Sulje keskustelu** päättää keskustelun, ja peli säilyy tiedostoissaan.

Sinä kerrot, mitä yrität. Pelinjohtaja kertoo, mitä tapahtuu. Pelinjohtaja ei koskaan päätä hahmosi puolesta eikä puhu pelimoottorista. Pelinjohtajalta voi kysyä, miten kojelautaa käytetään.

**Toimiminen kojelaudalta**: klikkaa hahmolomakkeessa nimeä, esimerkiksi asetta, loitsua tai jotakin mukana kantamaasi: sen kortti kertoo, mikä se on. Laukku aukeaa nuolestaan, ja sen ⓘ näyttää sen kortin. Valitse, mitä sillä teet. Jos teko ei tarvitse ketään toista, kuten **Varusta**, sama painike pyytää vahvistamaan, *Vahvista: varustan kilven*. Paina sitä uudelleen, niin se menee pelinjohtajalle. Jos teko kohdistuu johonkuhun, kuten **Hyökkää**, kojelauta kysyy kehen: listasta tai klikkaamalla karttaa. Sitten painike sanoo koko lauseen, *Hyökkään Huppupäisen rosvon 1 kimppuun nuijalla*, ja yksi klikkaus lähettää sen. Jos haluat sanoa asian omin sanoin, klikkaa henkilöä, jolle haluat puhua, tai kirjoita keskusteluun. Pelinjohtaja kuulee sen samalla tavalla kuin keskustelussa sanotun, ratkaisee sen kuten kaiken muunkin ja kysyy painikkeilla sen, minkä jätit kertomatta. Jos tekoälysovelluksesi ei voi ilmoittaa asiasta heti, pelinjohtaja lukee sen, kun seuraavan kerran kirjoitat keskusteluun. Jos keskustelu oli ehtinyt sulkeutua, **Sano uudelleen** lähettää sen vielä kerran.

### 3.2 Heitot

Pelinjohtaja pyytää heiton vain, kun lopputulos on epävarma ja sillä on merkitystä. Pelinjohtaja kertoo ensin, mitä on pelissä. Sitten:

- **Kojelaudalla** ilmoituspalkissa on painike jokaiselle heitolle, esimerkiksi *Acrobatics +4 · with advantage*. Klikkaa sitä: nopat putoavat sivulle ja pelinjohtaja kuulee tuloksen. Voit myös klikata hahmolomakkeen valaistua riviä, heittää nopat noppa-alustalta tai kirjoittaa palkkiin jotain muuta.
- **Käsin**, palkin kulmassa tai kohdassa **Asetukset**: palkki kertoo, mitä heittää, ja heität sen hahmolomakkeelta tai noppa-alustalta.
- **Fyysiset nopat**, kun noppa-asetuksena on fyysiset: kirjoitat heittämäsi silmäluvut, *[Heitin 14.]*, ja RPG Engine lisää muuntimesi.

**Vapaat heitot**: klikkaa mitä tahansa lukua hahmolomakkeessa tai avaa noppa-alusta, jos haluat heittää huvikseen. Ne eivät koskaan lasketa, eikä pelinjohtaja näe niitä.

**Pelinjohtajan heitot** näkyvät heittosarakkeessasi, salaisia lukuun ottamatta. Voit aina kysyä *[Oliko tuo heitto oikea?]*: salaisesta heitosta pelinjohtaja antaa sormenjäljen, joka todistaa heiton tehdyn ennen kysymystäsi.

### 3.3 Kohtaukset ja taistelut

Tarina etenee **kohtauksina**: taistelu, keskustelu, tutkiminen, matkustaminen, lepo. Jokaisen kohtauksen lopussa peli tallentaa itse ja kohtaus siirtyy päiväkirjaasi. Kun tarina kääntyy, pelinjohtaja kirjoittaa edellisen luvun jälkeiset kohtaukset uudeksi luvuksi tarinasi kirjaan.

Taistelussa pelinjohtaja kertoo jokaisen vuoron, joka ei ole sinun, ja pysähtyy kohtaan, jossa voit päättää. **Kohtaus** näyttää ylhäällä, kenen vuoro on ja kuka on seuraava. Hahmosi kortti on kartan vieressä. Vuorojärjestys, seurueesi osumapisteet ja se, miten haavoittuneilta viholliset näyttävät sanoin kuvattuna, pysyvät sivun reunalla. Jos hahmosi kaatuu, kuolemanpelastusheitot näkyvät isoina sivulla.

**Pysyvät käskyt**: kerro seuralaisillesi jotain, minkä pitäisi pysyä voimassa, esimerkiksi *Tästä lähtien jätä aina yksi henkiin*, ja pelinjohtaja pitää sen voimassa, kunnes perut sen. Seuralaisesi noudattavat käskyä niin pitkälle kuin heidän hahmonsa sallii, ja jos joku ei noudattaisi sitä, hän sanoo sen. Löydät käskysi kohdasta **Asetukset**, jossa voit lisätä niitä ja poistaa niitä.

### 3.4 Aika, matkustaminen ja liikkuva maailma

RPG Engine pitää kirjaa päivämäärästä. Istuntojen välillä peliaika pysähtyy, ellet valitse kohdassa **Asetukset**, että se kuluu, esimerkiksi yksi pelipäivä jokaista poissaoloviikkoa kohden, tai pyydä sitä pelinjohtajalta. Sano, että lepäätte, *Lepäämme pitkän levon*, ja kun pelinjohtaja suostuu, lepo palauttaa sen, minkä pitää. Lyhyessä levossa pelinjohtaja voi kysyä kojelaudalla, montako osumanoppaa käytät. Heitä ne yksi kerrallaan, katso, paljonko kukin parantaa, ja lopeta, kun haluat. Sano, minne menet, *Lähdemme pohjoiseen vievälle tielle kohti Roccaa*, ja RPG Engine laskee reitin, matkan ja päivät. Matka keskeytyy, jos matkalla tapahtuu jotain. Raha lasketaan pelin kolikoissa, vaihtorahat mukaan lukien.

Konnilla on suunnitelmia ja määräaikoja. Joka uusi päivä pelinjohtaja siirtää uhkia, joita aika on edistänyt, ja sinä näet niiden merkit, mutta et koskaan itse kelloa.

### 3.5 Kartat

**Maailma** näyttää paikat, jotka hahmosi tuntee, niiden väliset tiet ja kulkemasi reitin. Loput peittää sumu. **Kohtaus** näyttää sen paikan kartan, jossa olet, jos kartta on olemassa, ja kuka seisoo missä. Taistelussa omalla vuorollasi ruudut, joihin et ylety, on peitetty. Kun pelinjohtaja kysyy, minne liikut, kosketa ruutua tai kirjoita se, esimerkiksi *E4*.

**Maailma** säilyttää myös sen, mitä hahmosi tietää. **Tietämys** listaa ihmiset, paikat, ryhmittymät, olennot ja tarinat, jotka hahmo tuntee, kunkin sellaisena kuin hahmo sen tuntee. Voit hakea listasta tai avata yhden luettavaksi kokonaan. Tekstissä oleva nimi vie omalle sivulleen. **Asiakirjat** säilyttää hahmosi löytämät kirjeet, ilmoitukset ja sivut uudelleen luettaviksi. **Kalenteri** näyttää tämän päivän, tehtäviesi määräajat jäljellä olevine aikoineen ja tarinan päivät. Päivä, jolle on kohtauksia, vie niihin Päiväkirjan **Aikajanalla**.

### 3.6 Tehtävät, päiväkirja ja muistiinpanot

Tehtävä, jonka hahmosi ottaa vastaan, muuttuu **Päiväkirjassa** tehtäväksi tavoitteineen, määräaikoineen ja mittareineen. Merkitse se tähdellä, niin se pysyy esillä **Kohtaus**-näkymän yläreunassa. **Tarina**-osiossa Päiväkirja kertoo tarinasi kirjana: pelinjohtaja kirjoittaa proosaluvun aina, kun tarina kääntyy, ja kertoo siinä edellisen luvun jälkeiset kohtaukset valitsemallasi tyylillä. Lue kirjaa luku kerrallaan, viimeisen luvun kohdalla on kirjanmerkki. Voit ladata kirjan Markdownina tai verkkosivuna tulostettavaksi tai jaettavaksi. Jos peli on alkanut ennen tätä, pyydä pelinjohtajaa kirjoittamaan tarina tähän asti. **Aikajana** listaa kohtaukset numeroituina ja sen, mitä kussakin tapahtui. Päiväkirja säilyttää myös **Muistiinpanot**: ne ovat yksityisiä, ellet paina **Jaa** jonkin kohdalla. Pelinjohtaja kuulee jaetun muistiinpanon sinun ajatuksenasi, ei koskaan tosiasiana. **Seuralaiset**-osiossa luet seuralaistesi päiväkirjoja: silloin tällöin, päivän tai tehtävän lopussa, he kirjoittavat muutaman rivin siitä, mitä ajattelevat ja tuntevat.

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

Kun olet palannut takaisin, **avaa uusi keskustelu**: vanha muistaa, mikä peruttiin. Paina kojelaudan keskustelussa **Sulje keskustelu** ja sitten **Uusi keskustelu**. Tekoälysovelluksesi omassa keskustelussa avaa uusi keskustelu (Claude Codessa `/clear`). Kirjoita uuteen keskusteluun *jatka*. Kerro sitten pelinjohtajalle, että keskustelu on uusi: paina Tallennuksissa **Avasin uuden keskustelun** tai sano se keskustelussa. Siihen asti pelinjohtaja ei jatka.

Jos et tiedä, mikä git on, ohita tämä kappale. Jos kampanjan kansio on git-tietovarasto, kohdassa **Asetukset** on **Git**-osio, jossa kaikki on pois päältä, kunnes valitset toisin: commit jokaisen istunnon alussa, jokaisen tallennuksen yhteydessä ja jokaisen kohtauksen lopussa sekä halutessasi push sen jälkeen. Commit on tilannekuva kampanjasta kyseisellä hetkellä. Push lähettää tilannekuvat verkossa olevaan tietovarastoon, esimerkiksi GitHubiin, jolloin kopio on myös tämän tietokoneen ulkopuolella. Tallennukset ja keskustelusi pelinjohtajan kanssa pysyvät tietovaraston ulkopuolella, ellet ota niitä mukaan. Ota keskustelut mukaan vain, jos tietovarasto on yksityinen.

### 3.9 Istunnot: lopettaminen ja palaaminen

Lopeta, kun haluat: *[Lopetetaan tältä illalta.]* Kaikki on jo tallennettu tiedostoihin. Kun haluat palata, avaa RPG Engine kuvakkeesta ja klikkaa kampanjaasi. Jos jätit keskustelun auki, se palaa itsestään. Jos suljit sen, paina **Jatka keskustelua**. Paina sitten **Jatka tarinaa**: pelinjohtaja kertoo parilla rivillä, mihin jäitte, ja jatkaa. Jos peli suljettiin, kun pelinjohtaja vielä vastasi tai kun pelinjohtajan kysymys odotti sinua, painikkeessa lukee sen sijaan **Jatka tästä**. **Uusi keskustelu** avaa uuden keskustelun samaan peliin. Tekoälysovelluksesi omassa keskustelussa käynnistä se kampanjakansiossa ja kirjoita *jatka*.

### 3.10 Pelinjohtajan mieliala

Kojelaudan yläreunan robotti on pelinjohtaja: sen ilme seuraa tarinan sävyä eikä koskaan paljasta sitä, mitä et vielä tiedä. Kun kojelauta ei ole yhteydessä peliin, robotti nukkuu.

### 3.11 Kuvat

RPG Engine voi teettää kuvia paikoista, joihin saavut, tehtävistä, jotka otat vastaan, ja ihmisistä, joita tapaat, **Kuvat**-asetuksen mukaan. Pyynnöstä se tekee myös hahmosi muotokuvan. Oma tekoälysovelluksesi tekee ne omilla keinoillaan, sinun kirjautumisellasi, sinun tilauksellasi ja sen rajoilla: **Claude** piirtää ne vektorikuvina, **Codex** ja **Antigravity** maalaavat ne, **OpenCode** piirtää keskustelussa yksinkertaisia vektorikuvia. Kohdassa **Asetukset > Kampanja > Kuvat** voit teettää kuvat Codexilla tai Antigravityllä myös silloin, kun pelinjohtajasi on jokin muu sovellus. Jos valitsemasi ei siihen pysty, keskustelusi tekee ne. **Asetukset** kertoo, pystyykö tämä tietokone tekemään kuvia, ja jos ei, miten sen saa kuntoon. Voit aina antaa oman kuvasi hahmollesi tai mille tahansa näkemällesi sivulle: vie osoitin jonkin sivun kuvan päälle, niin sen kulmaan ilmestyy pieni kuvapainike (myös näppäimistöllä, ja puhelimessa aina). Kohdassa **Maailma** avaamallasi sivulla on myös **Vaihda kuva…**, tai **Lisää kuva…**, kun sivulla ei vielä ole kuvaa. Kun osoitin on kuvan päällä tai sen painike on kohdistettuna, voit myös liittää kopioimasi kuvan näppäimillä Ctrl+V (Macilla ⌘V). Oma kuvasi korvaa sivun nykyisen kuvan. Voit myös pudottaa tiedoston kampanjan **inbox**-kansioon ja kertoa pelinjohtajalle, mille sivulle se kuuluu.

### 3.12 Turvallisuus: rajat, verhot ja stop

**Rajat** eivät koskaan esiinny pelissä. **Verhot** tapahtuvat vain kuvan ulkopuolella. Kirjoita milloin tahansa *[stop]*: pelinjohtaja jättää sen sisällön heti pois ja lisää sen rajoihisi.

### 3.13 Mielen muuttaminen

Jokaista asetusta voi muuttaa, keskustelussa tai kohdassa **Asetukset**. Ratkaisu, jonka pelinjohtaja tekee ilman sääntökirjaa, muuttuu **ennakkotapaukseksi**, jolloin sama kysymys saa ensi kerralla saman vastauksen.

---

## 4. Hallintanäkymä <!-- icon: party -->

Sivu omalla tietokoneellasi, omassa ikkunassaan, joka aukeaa vain tällä tietokoneella. Se pysyy käynnissä niin kauan kuin sen ikkuna on auki, keskustelun kanssa tai ilman. Noin kolmekymmentä sekuntia ikkunan sulkemisen jälkeen peli pysähtyy, ja keskustelu sen mukana. Mitään ei katoa: kaikki on tiedostoissa. Tekoälysovelluksesi omassa keskustelussa sivu on käynnissä niin kauan kuin keskustelu on auki. Kun peli on poissa, sivulla lukee *Not connected*: paina **Avaa kampanja uudelleen** tai avaa omassa sovelluksessasi seuraava keskustelu. Talon kuvalla merkitty **Kampanjat**-painike vie takaisin kaikkiin kampanjoihisi.

- **Roolipeli**: keskustelu pelinjohtajan kanssa, kun se ei ole sivun vieressä ([2.5](#25-the-first-chat)).
- **Seurue**: oma hahmolomakkeesi ja seuralaistesi lomakkeet. Heitä numerolla napsauttamalla. Vie osoitin numeron päälle, niin näet, mistä se tulee. Jos nuoli merkitsee noppaa, näet myös, mikä parantaa tai huonontaa heittoa. Kun pelinjohtaja valmistelee sinulle valintoja, kuten uudella tasolla, hahmolomakkeen ilmoitus avaa ne. Valitse silloin kun haluat, lue sivut, joihin vaihtoehdot viittaavat, heitä nopat, jos vaihtoehto sitä vaatii, ja vahvista lopuksi. Tarina jatkuu sillä välin. Sen vieressä näkyvät heitot.
- **Kohtaus**: missä olet, paikan kuva ja kartta, ketkä ovat paikalla ja mitä tapahtuu. Taistelussa näet vuorot ja hahmosi kortin.
- **Päiväkirja**: tehtävät, tarina kirjana, sen aikajana, seuralaistesi päiväkirjat ja omat muistiinpanosi.
- **Maailma**: maailmankartta, se mitä hahmosi tietää, löydetyt asiakirjat ja kalenteri.
- **Noppa-alusta**: valitse nopat ja muunnin ja heitä. ×2 kaksinkertaistaa nopat mutta ei muunninta, kuten kriittisessä osumassa.
- **Tallennukset**, **Ohje**, **Asetukset** ja **Tietoja** näkyvät kuvakkeina rivin lopussa. Asetuksista löytyy myös osio **Kojelauta**, jossa ovat sivun omat valinnat: tila, noppien ääni, noppasetti ja **Teema**. Se on sivun värit, kasvot ja kuvat. Voit valita pelijärjestelmän oman teeman, teeman, jonka olet lisännyt kohdassa Packages › Add (luettelosta, GitHub-linkistä, .zip-tiedostosta tai kansiosta), tai sivun oman teeman. Jos teeman oma tyylitiedosto tekee sivusta vaikealukuisen, poista siellä käytöstä **Teeman oma tyyli**. Asetukset näkyvät aina ilman sitä, kun sivun osoitteen loppuun lisätään `#/settings/page`.

Kun pelinjohtaja kysyy sinulta jotain, sen palkki pysyy ylhäällä, missä osiossa tahansa olet.

---

## 5. Pelijärjestelmät ja kotisäännöt <!-- icon: dice -->

### 5.1 Mikä pelijärjestelmä on

Yhden pelin tiedot: sen hahmolomake, luvut, olennot, esineet, loitsut ja sääntötekstit. Jokainen kampanja pelaa yhtä järjestelmää. RPG Engine laskee hahmolomakkeen sekä sen, mitä kuluu ja mitä palautuu. Pelinjohtaja lukee säännöistä, miten kyvyt toimivat, ja päättää asiasta, kuten pöydän ääressä.

### 5.2 Viides editio

SRD 5.1:n rodut, hahmoluokat, alaluokat, tausta ja urateko, 319 loitsua, aseet, haarniskat, taikaesineet ja hirviöt sekä sääntöluvut, jotka pelinjohtaja lukee tarkalta sanamuodolta. Mukana on myös täysi, laskettu hahmolomake.

Tämä on oma pakettinsa: pelinjohtaja tarjoaa sitä, kun perustat kampanjan, ja asentaa sen. Jos kampanja pelaa tätä järjestelmää, paketti asentuu itsestään, kun kampanja avataan ensimmäistä kertaa tietokoneella, jolla sitä ei vielä ole. Pelinjohtaja kertoo siitä sinulle.

Voit pelata myös sisältöä, jota SRD:ssä ei ole, omasta kirjastasi. Pelinjohtaja kirjoittaa sen kampanjasi sivuiksi, ja RPG Engine käsittelee ne ominaan. RPG Engine toimittaa vain avointa sisältöä, mutta pelinjohtajan tietämys ei rajoitu siihen.

Omat sääntökirjasi voivat olla kirjastosi. Kerro pelinjohtajalle, missä ne ovat: *[Sääntökirjani ovat kansiossa D:\Books\5e.]* Voit myös lisätä niiden kansion kohdassa Paketit › Kirjasto ja vastata kyllä tietokoneesi näyttämään ikkunaan, kerran. RPG Engine lukee kirjat tällä tietokoneella. Jokainen kampanja käyttää kansioita, jotka olet ottanut siellä käyttöön. Pelinjohtaja hakee niistä, kun ratkaisee sääntöä SRD:n jälkeen, ja mainitsee kirjan ja sivun. Kirjat luetaan parhaiten tekstinä tai PDF-tiedostoina, joiden tekstin voi valita. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, muutamassa minuutissa ja muutamin virhein. RPG Engine ei koskaan muuta kirjojasi, ei lähetä niiden tekstiä minnekään eikä kopioi sitä kampanjaan.

### 5.3 Kotisäännöt ja omat lisäykset

Pyydä pelinjohtajaa: *[Kotisääntö: luonnollinen 1 hyökkäyksessä tarkoittaa, että pudotat aseesi.]* Pelinjohtaja pitää sen pöydän sopimuksena tai kirjoittaa sivun tai hahmolomakkeen luvun, jos sellainen tarvitaan. Valmiiksi kirjoitetut kotisäännöt voi lisätä tekstitiedostoina kampanjan `rules`-kansioon.

Kun pelinjohtaja muuttaa kampanjasi pelijärjestelmän sivua, esimerkiksi olennon osumapisteitä tai loitsun kantamaa, kojelauta merkitsee sen pienellä asteriskilla nimen perässä kaikkialla, missä sivu näkyy. Paketit › Asennetut näyttää järjestelmän kohdalla, mikä on muuttunut, ja järjestelmän antama alkuperäinen on sen vieressä. Olento, jota hahmosi ei tunne, näkyy siellä pelkällä nimellä. Siellä voit palauttaa sivun sellaiseksi kuin järjestelmä sen kirjoittaa, kun käynnissä oleva kohtaus on päättynyt. Kojelauta ei voi perua palautusta, vaan vain pelinjohtaja voi kirjoittaa muutoksen uudelleen.

### 5.4 Oman pelijärjestelmän lisääminen tai tuonti

Pelijärjestelmä on paketti. Pelinjohtaja asentaa sen npm:stä, kansiosta tai tiedostosta. Jos paketti ei ole meidän, asennus tehdään vain sinun luvallasi agenttisi lomakkeessa tai tietokoneesi ikkunassa. Paketin tekeminen on kehittäjän työtä, ja se on kuvattu RPG Enginen dokumenteissa GitHubissa. Omasta kirjastasi pelijärjestelmän tekemistä ei vielä ole ([Tulossa myöhemmin](#9-coming-later)).

---

## 6. Laajennukset <!-- icon: plus -->

Laajennus lisää kampanjaan jotakin pelijärjestelmän päälle: esimerkiksi sään, joka muuttuu joka aamunkoitteessa, tai lukon tiputtelun nopilla. Lisää laajennus kohdassa Paketit › Lisää: valitse se listasta tai anna sen nimi npm:ssä, kansio tai tiedosto. Laajennus, joka ei ole meidän tekemämme, tuo mukanaan koodia. Se tulee mukaan vain sinun suostumuksellasi, tietokoneesi ikkunassa. Jos laajennus on tehty toiselle pelijärjestelmälle, se kertoo sen, eikä sitä lisätä. Kohdassa Paketit › Asennetut voit päivittää laajennuksen tai poistaa sen. Pelinjohtaja voi myös lisätä laajennuksen, kun pyydät.

---

## 7. Mistä kampanja tulee, ja sen kieli <!-- icon: world -->

### 7.1 Kolme tapaa saada maailma

- **Tehty lennossa**: lähtökohdastasi pelinjohtaja rakentaa jokaisen paikan, henkilön ja juonen juuri ennen kuin tarvitset sen, ja säilyttää sen.
- **Valmisteltu alussa**: sama, mutta maailma rakennetaan ennen pelin alkua.
- **Omasta seikkailustasi tai kirjastasi**: anna pelinjohtajalle sen tiedosto, *[Tuo tämä seikkailu kampanjaksemme: D:\Books\adventure.pdf. Älä kerro minulle mitään, mikä siinä on.]* Kampanjan ulkopuolinen tiedosto luetaan vasta, kun olet vastannut myöntävästi tietokoneesi ikkunassa. Kampanjan **inbox**-kansioon laittamasi tiedosto luetaan heti. Se luetaan parhaiten tekstinä, EPUBina, Word-asiakirjana tai PDF:nä, jonka tekstin voi valita. Skannattu PDF luetaan sivujen kuvista, vain Windowsissa, hitaasti ja muutaman virheen kera. Oma tekoälysovelluksesi lukee sen keskustelun ulkopuolella, tai muuten pelinjohtaja keskustelussa, sinun tilauksellasi: Claude Codessa tai Codexissa lukee jompikumpi niistä, Antigravityssa sinun Antigravitysi, OpenCodessa malli, jonka valitsit siinä viimeksi. Koko asiakirja menee sen tekijälle, joka sen lukee, tilisi ehtojen ja sen koulutusvalinnan mukaisesti. Kojelauta näyttää, kuinka pitkällä työ on. Romaanista pelinjohtaja ehdottaa, mistä aloittaa. Pelinjohtaja kirjoittaa paikat, hahmot ja salaisuudet.

Kampanja pelataan kerran: jos haluat pelata saman seikkailun uudestaan, luo uusi kampanja.

### 7.2 Kielet

Yksi kieli kampanjaa kohden, pelinjohtajan kieli, jota kojelauta seuraa. Kojelaudan mukana tulee 26 kieltä. Minkä tahansa muun kielen kääntää tietokoneellasi oma tekoälysovelluksesi keskustelun ulkopuolella (Codex tai Claude Code, Antigravityssa ja OpenCodessa niiden omat), tai jos mikään niistä ei pysty siihen, pelinjohtaja keskustelussa. Viidennen laitoksen termit italiaksi tulevat viralliselta italialaiselta SRD:ltä. Sääntöteksti pysyy englanniksi, ja pelinjohtaja kertoo sen sinun kielelläsi.

---

## 8. Uteliaille: kampanjakansio <!-- icon: list -->

Sinun ei koskaan tarvitse avata sitä, ja siinä on kampanjasi salaisuudet. Siinä on `campaign.yaml` (asetuksesi), `state.yaml` (pelin tilanne), `world/` (yksi markdown-sivu jokaista hahmoa, paikkaa, tehtävää ja muuta kohden), `rules/` (kotisääntösi), `images/`, `log.jsonl` (jokainen muutos), `sessions/` (keskustelusi pelinjohtajan kanssa tekstinä, Claude Codesta ja Codexista), `.saves/`, `.player/` (muistiinpanosi) sekä pienet tiedostot, jotka kertovat tekoälyagenteille, missä RPG Engine on. Sivut käyttävät Obsidianin muotoa. Jos muutat sivua käsin, pelinjohtaja huomaa sen seuraavassa vastauksessaan.

RPG Engine pysyy tässä kansiossa: se lukee ja kirjoittaa peliä vain täällä eikä koske muihin tiedostoihisi. Kirjojesi kansioita se vain lukee. Sen ulkopuolella se säilyttää vain omia datakansioitaan (dashboardin käännökset, kirjoistasi lukemansa teksti sekä Codex tai Claude Code, jos annat asentaa ne) ja väliaikaisia kansioita kuvan piirtämisen ajan. Jos agenttisi haluaa tehdä tietokoneellasi jotain muuta, se kysyy ensin sinulta. Pelijärjestelmä tai laajennus on koodia, kuten jokainen npm-paketti: paketti, joka ei ole meidän, toimii tietokoneellasi sinun oikeuksillasi, ja RPG Engine asentaa sen vain sinun luvallasi agenttisi lomakkeessa tai tietokoneesi ikkunassa. Vastaa kyllä vain paketeille, joiden tekijöihin luotat.

Jokaisen komennon, jota pelinjohtaja käyttää, voi ajaa myös kampanjakansiossa: `rpg --help` listaa ne. Moni niistä tulostaa kampanjan salaisuuksia.

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

**Pitääkö minun osata säännöt?** Ei. Valitse mentoriksi opastus ja kysy `[OOC: …]`-merkinnällä milloin haluat.

**Voiko pelinjohtaja huijata?** Se ei voi muuttaa RPG Enginen tekemää heittoa, paitsi vaikeustasolla tarina, eikä jo vahvistettuja tosiasioita.

**Maksaako se mitään?** RPG Engine on ilmainen. Pelinjohtaja toimii tekoälysovelluksesi tilauksella tai omalla tietokoneellasi paikallisella mallilla. Pelilta on pitkä keskustelu: pienimmillä tilauksilla voit saavuttaa tilauksen rajan ennen illan loppua. Kuvat, käännökset ja tuonnit käyttävät samaa tilausta. RPG Engine itse ei koskaan käytä API-avainta, joka maksaa kutsukohtaisesti: kirjaa tekoälysovelluksesi sisään tililläsi, älä avaimella.

**Voinko pelata puhelimella?** Et: pelinjohtaja toimii tietokoneellasi, ja kojelauta aukeaa vain siellä.

**Voinko pelata kavereiden kanssa?** Ei vielä: nykyisin yksi pelaaja, yksi hahmo ja seuralaiset ([Tulossa myöhemmin](#9-coming-later)).

**Voinko käyttää ensi kerralla eri tekoälyä?** Voit: valitse keskustelussa toinen sovellus ennen kuin avaat sen, tai avaa kampanja toisessa sovelluksessa ja kirjoita *jatka*.

### Ongelmat

**Kampanja ei aukea.** Avaa RPG Engine uudelleen kuvakkeesta tai kirjoita päätteessä `rpg open` ja klikkaa kampanjaa. Jos sen kojelaudassa lukee *Not connected*, paina **Avaa kampanja uudelleen**. Kortti, jossa lukee **Kansiota ei löytynyt**, on menettänyt kansionsa: poista se luettelosta ja lisää kampanja uudelleen kohdassa **Avaa kansio…**, siellä missä se nyt on. Tekoälysovelluksesi omassa keskustelussa kojelauta toimii vain, kun kyseisen kampanjan keskustelu on auki: kysy pelinjohtajalta `[OOC: Mikä on kojelaudan linkki?]`. Clauden sovelluksessa jonkin aikaa taustalla ollut keskustelu menee lepotilaan, ja sivu sen mukana: klikkaa keskustelua, niin sivu palaa samaan osoitteeseen.

**Pelinjohtaja ei tunnu tuntevan peliä.** Tämä tapahtuu tekoälysovelluksesi omassa keskustelussa: se ei ladannut RPG Enginea. Tarkista, että käynnistit sen kampanjakansiossa ja että luotit kansioon. Claude Codessa kirjoita `/mcp` ja yhdistä `rpg` uudelleen. Codexissa komennon `codex mcp list` kampanjakansiossa pitää näyttää `rpg`. Jos komentoa `rpg --version` ei löydy, asenna RPG Engine uudelleen ([2.2](#22-install)).

**Windows ei löydä komentoa `claude`.** Näin käy, kun olet asentanut Claude Coden itse. Asennusohjelma kertoo siitä keltaisessa huomautuksessa ja mainitsee kansion, johon asennus meni: lisää kansio PATH-ympäristömuuttujaan (Järjestelmän ominaisuudet > Ympäristömuuttujat) ja avaa sitten uusi pääte.

**Päivittäminen.** Kun uudempi RPG Engine on ilmestynyt, kojelauta kertoo siitä: kohdassa Packages › Installed RPG Engine on ensimmäisenä, ja sen vieressä on **Päivitä**. Tee sitten, mitä sivu neuvoo. Voit myös suorittaa `npm install -g rpg-engine` uudelleen päätteessä ja avata sitten uuden keskustelun: käynnissä oleva pelinjohtaja pitää sen version, jolla se käynnistyi.

**Pelinjohtaja muistaa jotain, minkä peruin.** Avaa uusi keskustelu ja paina Tallennuksissa **Avasin uuden keskustelun**.

**Sovellus ei asennu.** Sivu kertoo syyn: paina **Yritä uudelleen**. Tai asenna sovellus itse sen tekijän sivustolta ja paina sitten **Tarkista uudelleen**.

**Kirjautumissivu ei aukea selaimessa.** Kun sivu odottaa sinua, paina **Avaa kirjautumissivu uudelleen**, jos se näkyy, tai **Peruuta** ja yritä vielä kerran.

**Kojelaudan keskustelu kertoo, että toinen keskustelu pelaa.** Tekoälysovelluksessasi itse avaamasi keskustelu pelaa tätä kampanjaa: jatka siellä tai sulje se, jotta voit pelata kojelaudassa.

**Kuvia ei ilmesty.** Asetukset > Kampanja > Kuvat kertoo, voiko tämä tietokone tehdä niitä, ja miten.

**Asennus epäonnistuu tai `rpg` ei käynnisty.** Komennon `node --version` pitää näyttää 24 tai uudempi. Jos Windows ilmoittaa, että komentosarjojen suorittaminen on estetty, katso [2.1](#21-what-you-need). Pidä Windowsissa RPG Engine ja kampanjasi poissa poluista, joissa on `&`.

**Kojelaudan linkki muuttui.** Tekoälysovelluksesi omassa keskustelussa jokaisella kampanjalla on oma osoitteensa, joka pysyy samana keskustelusta toiseen. Se muuttuu vain, jos jokin toinen ohjelma käyttää sitä jo: pelinjohtaja antaa sinulle uuden linkin, ja siitä lähtien se pysyy. Saman kampanjan toinen keskustelu pitää sivun samassa osoitteessa ja ottaa sen haltuunsa, kun suljet ensimmäisen.
