<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: täydellinen opas

**RPG Engine** antaa sinun pelata pöytäroolipeliä, jossa **tekoäly toimii pelinjohtajana**.

Keskustelet pelinjohtajan kanssa **chatissa**: pelinjohtaja kertoo tarinaa, esittää kaikkia muita ja ratkaisee, mitä tapahtuu.

RPG Engine työskentelee taustalla: se **muistaa maailman**, **heittää nopat** ja **pitää kirjaa**.

Chatin rinnalla pidät selaimessa auki sivua, **kojetaulua**. Siellä ovat hahmosi hahmolomake, nopat, kartat ja päiväkirja.

Tämä opas on tarkoitettu pelaajille: ohjelmointitaitoja ei tarvita.

## Pikaopas <!-- icon: send -->

1. Asenna **Node.js** osoitteesta [nodejs.org](https://nodejs.org) (LTS-versio).
2. Asenna **Claude Code** tai **Codex**, tekoälysovellus, jossa pelinjohtaja toimii, ja kirjaudu sisään ([2.4](#24-connect-your-ai)).
3. Avaa pääte ja asenna RPG Engine: `npm install -g rpg-engine`.
4. Luo päätteessä kampanja: `rpg init "The Salt Isles"`.
5. Avaa Claude Code tai Codex uudessa kansiossa ja kirjoita *Hei! Aloitetaan.* Pelinjohtaja vastaa kojelautasi linkillä: avaa se chatin viereen.

Loppuopas selittää jokaisen vaiheen ja sen jälkeen pelaamisen.

## 1. Mikä RPG Engine on <!-- icon: about -->

### Kuka tekee mitä

| Kuka | Mitä tekee |
|---|---|
| **Sinä** | Pelaat hahmoasi. Kerrot, mitä hahmosi tekee, sanoo ja yrittää. |
| **Pelinjohtaja** (tekoäly) | Kertoo tarinan, esittää kaikkia muita hahmoja, päättää, mitä tapahtuu, ja pyytää heittoja. |
| **RPG Engine** | Muistaa kaiken tiedostoissa, heittää nopat, laskee osumapisteet, rahan, ajan ja matkat sekä pitää salaisuudet piilossa, kunnes löydät ne. |

Tekoäly kertoo hyvin tarinoita mutta muistaa huonosti. Yksin jätettynä se unohtaa, kuka on sinulle velkaa, kuinka monta nuolta sinulla on tai että silta paloi kaksi sessiota sitten. RPG Engine pitää kaiken tämän muistissa. Siksi maailma pysyy samana illasta toiseen, uudessa chatissakin ja jopa eri tekoälyllä.

### Miltä se tuntuu

Kirjoitat chattiin kuin puhuisit pelipöydässä:

> Työnnän oven hitaasti auki ja katson sisään.

Pelinjohtaja kertoo, mitä näet, ja pysähtyy, kun on sinun vuorosi valita. Kun jokin on epävarmaa ja tärkeää, pelinjohtaja kertoo, mikä on pelissä, ja pyytää heiton. Heiton painikkeet ilmestyvät kojelautaasi. Napsautat, nopat putoavat sivulle, ja pelinjohtaja kertoo, mitä tapahtuu.

### Mikä tekee siitä erilaisen

- **Maailma säilyy.** Mitä on sanottu, pysyy totena. Kuollut konna pysyy kuolleena.
- **Nopat ovat oikeita.** Pelinjohtaja ei voi taivuttaa niitä (paitsi helpoimmalla vaikeustasolla, jos valitset sen).
- **Salaisuudet pysyvät salaisina.** Pelinjohtaja ei koskaan kerro, mitä hahmosi ei tiedä, vaikka vaatisit.
- **Maailma liikkuu ilman sinua.** Uhat etenevät, kun lepäät tai matkaat, ja näet niiden merkit.
- **Monta iltaa, yksi tarina.** Kampanja on kansio tietokoneellasi. Voit lopettaa milloin haluat ja jatkaa myöhemmin.

### Peli, jota se pelaa nykyään

RPG Engine on tehty mille tahansa pöytäroolipelille. Nykyään mukana tulee yksi pelijärjestelmä: **viides editio** (ilmaisesta System Reference Document 5.1 -aineistosta). Muita pelejä on tulossa; katso [Pelijärjestelmät](#5-game-systems-and-house-rules) ja [Tulossa myöhemmin](#9-coming-later).

---

## 2. Alkuun pääseminen <!-- icon: path -->

### 2.1 Mitä tarvitset

- Tietokone, jossa on Windows, macOS tai Linux.
- **Node.js 22** tai uudempi. Hae se osoitteesta [nodejs.org](https://nodejs.org): "LTS"-versio käy. Mukana tulee `npm`, joka asentaa RPG Enginen.
- **Pääte**, ikkuna, johon kirjoitetaan komentoja: Windowsissa Pääte-sovellus tai PowerShell, macOS:ssä Pääte. Sillä asennat RPG Enginen, luot jokaisen kampanjan ja käynnistät Claude Coden tai Codexin.
- **Tekoälyisäntä**, sovellus, jossa pelinjohtaja toimii: **Claude Code** tai **Codex**, omine tilauksineen ja kirjautumisineen. Katso [2.4](#24-connect-your-ai).
- Isännän tarjoama **suurin malli**. Pieni malli menee helposti halpaan: testeissämme se paljasti salaisuuksia pelaajalle, joka väitti olevansa oikea pelinjohtaja.
- Verkkoselain kojelautaa varten.

Isäntääsi varten käyttämäsi kirjautuminen riittää muuhunkin: RPG Engine käyttää sitä tietokoneellasi piirtääkseen kuvia paikoista ja kääntääkseen kojelaudan kielille, joita se ei sisällä valmiina. Katso [Kuvat](#311-pictures) ja [Kielet](#72-languages).

**Päätteen avaaminen kansioon.** Monessa kohdassa sanotaan "kampanjakansiossa". Windowsissa napsauta kansiota hiiren kakkospainikkeella Resurssienhallinnassa ja valitse **Avaa Terminaalissa**. macOS:ssä napsauta kansiota hiiren kakkospainikkeella Finderissa ja valitse **Palvelut > Uusi pääte kansioon**. Tai kirjoita jo avoimeen päätteeseen `cd` ja kansion polku, esimerkiksi `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Asennus

Avaa pääte ja kirjoita:

```text
npm install -g rpg-engine
```

Saat käyttöösi `rpg`-komennon. Tarkista, että asennus onnistui:

```text
rpg --version
```

Käytät `rpg`-komentoa kerran kampanjaa kohden, sen luomiseen. Sen jälkeen puhut vain pelinjohtajan kanssa: tekoälyisäntäsi käynnistää RPG Enginen itse samalla `rpg`-komennolla.

### 2.3 Kampanjan luominen

Kampanja on kansio. Avaa pääte kansiossa, jossa pidät pelisi, ja kirjoita:

```text
rpg init "The Salt Isles"
```

Tämä luo kansion `The Salt Isles`, jossa on uusi kampanja, ja kertoo, mitä tehdä seuraavaksi:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Rivit *For the master* -tekstin jälkeen on tarkoitettu pelinjohtajalle, joka lukee ne chatissa. Sinun ei tarvitse tehdä niille mitään. Muista, missä kansio on: palaat siihen joka kerta, kun pelaat. Jos et anna kansiolle nimeä, `rpg init` muuttaa kansion, jossa olet, kampanjaksi.

`init` luo kaiken, mitä kampanja tarvitsee: asetukset, maailman kansiot ja pienet tiedostot, jotka käskevät tekoälyisäntääsi käyttämään RPG Engineä eikä pitämään omaa muistia kampanjan ulkopuolella.

Mitään ei tarvitse valita nyt. Pelinjohtaja kysyy loput chatissa, tai voit valita ne kojelaudalla. Jos tiedät jo joitakin valintoja, voit antaa ne tässä:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Tämä luo kansion `salt-isles`, jossa on kampanja *The Salt Isles*: kansion nimessä ei ole välilyöntejä, ja kampanjan nimen voit kirjoittaa haluamallasi tavalla.

| Valinta | Mitä se asettaa | Arvot |
|---|---|---|
| `--name` | Kampanjan nimi | mikä tahansa; kansion nimi, jos jätät pois |
| `--language` | Pelin kieli | koodi, kuten `en`, `it`, `fr` |
| `--system` | Pelijärjestelmä | `5e`, tällä hetkellä ainoa |
| `--difficulty` | Kuinka kova maailma on | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Mitä taistelussa kaatuminen tarkoittaa | `narrative`, `epic`, `dice` |

`rpg init --help` luettelee nämäkin. Kampanja ei voi olla toisen kampanjan kansion sisällä.

Et voi pyytää pelinjohtajaa luomaan kampanjaa: ennen `init`-komentoa kansiossa ei ole mitään, mikä kertoisi tekoälyisännällesi, missä RPG Engine on.

### 2.4 Tekoälyn yhdistäminen

RPG Engine toimii **Claude Coden** ja **Codexin** kanssa. Muutkin MCP-työkaluja käyttävät tekoälysovellukset saattavat toimia, mutta emme takaa sitä.

**Isännän asentaminen.** Claude Code ja Codex toimivat päätteessä: ne eivät ole puhelimesi Claude- tai ChatGPT-sovellus. Kumpikin tarvitsee oman tilauksensa ja kirjautumisensa: Claude Code maksullisen Claude-tilauksen, Codex ChatGPT-kirjautumisen. Asenna ne ja kirjaudu sisään niiden omien sivujen ohjeilla: [Claude Code](https://code.claude.com/docs/en/setup) ja [Codex](https://learn.chatgpt.com/docs/codex/cli). Teet tämän kerran kaikille kampanjoillesi.

**Claude Code.** Avaa pääte kampanjakansiossa ja kirjoita `claude`. Ensimmäisellä kerralla se kysyy, luotatko kansioon, ja kertoo, että kansio sallii pelin työkalut (`mcp__rpg`): valitse **Yes, I trust this folder**. Varo: valmiiksi valittu vastaus on *No, exit*, joten jos painat heti Enteriä, Claude Code sulkeutuu. Siinä kaikki: kampanja on jo käskenyt Claude Codea käyttämään RPG Engineä ja sen työkaluja sekä pitämään muistinsa pois päältä.

**Codex.** Avaa pääte kampanjakansiossa ja kirjoita `codex`. Kun se kysyy, luotatko kansioon, vastaa kyllä: kampanjan omat asetukset kertovat Codexille, missä RPG Engine on, sallivat sen työkalut ja pitävät muistin pois päältä, ja Codex lukee ne vain kansiossa, johon luotat. Tarkista työpöytäsovelluksesta, että muistit ovat pois päältä pelin chateissa.

**Miksi muistilla on väliä.** Kampanja elää tiedostoissaan. Jos isäntä muistaa asioita myös itse, tallennukseen palaaminen ei oikeasti palauttaisi mitään: pelinjohtaja muistaisi yhä sen, mikä peruttiin.

### 2.5 Ensimmäinen chat

Kirjoita mitä vain, esimerkiksi:

> Hei! Aloitetaan.

Pelinjohtaja lukee, missä peli on, ja vastaa. Jokaisen chatin ensimmäisessä vastauksessa se antaa sinulle **kojelautasi linkin** (jotakin tällaista: `http://127.0.0.1:4750`). Avaa se selaimessa ja pidä chatin vieressä koko pelin ajan. Jokainen kampanja pitää saman linkin chatista toiseen, ellei jokin toinen ohjelma ole ottanut sitä: silloin pelinjohtaja antaa uuden.

Pelinjohtajan viestien välissä isäntäsi näyttää pelinjohtajan käyttämät työkalut lyhyinä riveinä. Älä avaa niiden tietoja (Claude Codessa ctrl+o): ne voivat näyttää, mitä pelinjohtaja kirjoittaa, salaisuudet mukaan lukien.

Uusi kampanja käy läpi kolme vaihetta, kuten peli ihmispelinjohtajan kanssa. Kojelauta näyttää ne ylhäällä: *1 Asetukset · 2 Nollasessio · 3 Peli*:

1. **Asetukset**: valitset, miten haluat pelata. Tarinan ulkopuolella.
2. **Nollasessio**: luot hahmosi pelaten.
3. **Peli**: tarina.

### 2.6 Asetukset: miten pelaat

Pelinjohtaja kysyy vain sen, mikä vielä puuttuu, muutaman kysymyksen kerrallaan. Jos kirjoitat "päätä sinä", pelinjohtaja valitsee ja kertoo, mitä valitsi. Kun kojelauta on auki, sen ensimmäinen vaihe, **Asetukset**, näyttää samat kysymykset korteilla: yksi kysymys kerrallaan, jokaisen arvon merkitys kerrottuna ja tavallisin merkittynä sanalla **Ehdotettu**. Valitse siellä, niin pelinjohtaja ei kysy samaa uudelleen chatissa; **Ohita** jättää kysymyksen myöhemmäksi. Chatissa ratkaistaan se, minkä vain sanat voivat ratkaista: uuden maailman lähtökohta, kieli ja kuvat, joista pelinjohtaja kysyy vain, jos tietokoneesi osaa tehdä niitä. Siksi sivu kysyy vähemmän kuin alla oleva taulukko luettelee.

Taulukkoa ei tarvitse opiskella: se on tarkistettavaksi. Voit muuttaa jokaista näistä myöhemmin, chatissa tai kojelaudan kohdassa **Asetukset**. Muutos tulee voimaan pelinjohtajan seuraavasta vastauksesta.

| Asetus | Mitä se ratkaisee | Arvot | Ehdotettu |
|---|---|---|---|
| **Mentori** (kysytään muodossa "Kuinka hyvin tunnet tämän pelin?") | Kuinka paljon pelinjohtaja opettaa sinulle sääntöjä tarinan ulkopuolella | **pois** (pelkkä tarina; kysy hakasulkeissa, kun haluat), **vihjeet** (lyhyt vinkki tärkeiden valintojen edellä ja kun sääntö livahtaa ohi), **opastus** (jokainen sääntö selitetään ensimmäisellä kerralla, jokaisen heiton koko lasku, lyhyt läpikäynti taistelun jälkeen) | vastauksestasi: en ole koskaan pelannut → opastus, vähän → vihjeet, osaan sen → pois |
| **Vaikeustaso** | Kuinka kova maailma on: taistelut, vihollisten taktiikka, vihjeet, aarteet, uhkien etenemisvauhti | story, easy, normal, hard, brutal | |
| **Tappavuus** | Mitä taistelussa kaatuminen tarkoittaa | **narrative** (hahmosi ei koskaan kuole), **epic** (kuolee vain, kun sillä on merkitystä tarinalle), **dice** (nopat ratkaisevat) | seuraa vaikeustasoa: story → narrative, easy → epic, normal ja ylöspäin → dice |
| **Tallennukset** | Milloin voit palata taaksepäin | **permadeath** (ei koskaan; voit vain aloittaa kampanjan alusta), **checkpoint** (takaisin viimeiseen kohtauksen loppuun, vain jos hahmosi kuolee), **free** (takaisin mihin tahansa tallennukseen, ja tallennat aina kun pyydät) | checkpoint |
| **Tarkkuus** | Kuinka tarkasti ruoka, valo, väsymys, kantopaino, loitsujen aineosat ja matkustaminen noudattavat sääntöjä | **smooth** (pelinjohtaja sivuuttaa ne), **rules** (kuten säännöissä: soihdut palavat loppuun, muona loppuu), **simulation** (sääntöjä pidemmälle: kuluminen, pilaantuminen, sää) | smooth |
| **Nopat** | Kuka heittää hahmosi nopat | **digital** (RPG Engine heittää ne sivulla), **physical** (heität omat ja kerrot silmäluvut) | |
| **Mittayksiköt** | Etäisyydet ja painot tarinassa | metric, imperial | |
| **Seuralaiset** | Kuka matkaa kanssasi | ei ketään, tehty kanssasi nollasessiossa, pelinjohtajan tekemä, tavattu pelissä | |
| **Kuvat** | Kuvat paikoista ja tehtävistä | ei, pyydettäessä, uudet paikat ja tehtävät | kysytään kerran, vain jos tietokoneesi osaa tehdä niitä |
| **Rajat** | Mitä ei koskaan esiinny pelissä | luettelo tai ei mitään | |
| **Verhot** | Mikä saa tapahtua, mutta vain kameran ulkopuolella | luettelo tai ei mitään | |
| **Kieli** | Pelin ja kojelaudan kieli | mikä tahansa | otetaan siitä, miten kirjoitat, ja vahvistetaan |

Pelijärjestelmä voi lisätä omia asetuksiaan. Viides editio lisää **etenemisen**: miten hahmosi nousee tasoja, **kokemuspisteillä** vai tarinan **virstanpylväillä**.

**Mitä vaikeustaso tarkoittaa pelissä.** Story: heikkoja, naiiveja vihollisia, ilmeisiä vihjeitä, kaikkea runsaasti; pelinjohtaja voi pehmentää omia heittojaan. Easy: yksinkertaisia vihollisia, anteliaat varat. Normal: järkeviä vihollisia, kolme vihjettä jokaiseen johtopäätökseen, tavalliset hinnat ja aarteet. Hard: viisaita vihollisia, hienovaraisia vihjeitä, niukat varat, nopeasti etenevät uhat. Brutal: vihollisia, jotka väijyvät, vetäytyvät ja viimeistelevät kaatuneet, hyvin niukat varat, ankarimmat levot. Taistelut mitoitetaan aina seurueesi nykyisen voiman mukaan.

**Jos maailmaa ei ole kirjoitettu valmiiksi**, asetusvaihe kysyy kaksi asiaa lisää:

- **Lähtökohta**: genre, sävy ja muutama maailman piirre omin sanoin. Esimerkiksi: *"Matala fantasia, synkkä mutta toiveikas. Jokikaupunki, kummitteleva kahlaamo, kultti kukkuloilla."*
- **Valmistelu**: **lennossa** (pelinjohtaja rakentaa jokaisen maailman osan juuri ennen kuin tarvitset sitä; ehdotettu) tai **kaikki alussa**.

Sen jälkeen pelinjohtaja ehdottaa kampanjalle nimeä. Kun mikään ei enää puutu ja sanot olevasi valmis, peli siirtyy nollasessioon.

### 2.7 Nollasessio: hahmosi

Nollasessio on peliä: luot hahmosi pelinjohtajan kanssa, kuten pelipöydässä.

- **Jokainen valinta on sinun**, ellet pyydä pelinjohtajaa tekemään sitä. Voit tulla täydellä idealla ("puoliksi haltiasta papitar, joka jätti temppelinsä"), hataralla ("joku, joka parantaa, mutta ei ole kiltti") tai tyhjin käsin ("yllätä minut, sitten annat minun muuttaa asioita").
- **Ominaisuuspisteet.** Pelinjohtaja kertoo menetelmän ja turvaverkon ennen kuin yhtään noppaa heitetään. Viidennessä editiossa: vakiosarja, pisteostot tai 4d6 pienin pois. Sovittu menetelmä pysyy pöydän sopimuksissa.
- **Hahmon tarina** ei ole koskaan pakollinen. Jos annat sellaisen, pelinjohtaja kirjoittaa sen sanoillasi, lukee sen sinulle kerran takaisin ja kytkee sen ihmiset ja paikat maailmaan. Voit kirjoittaa sen myös kojelaudalla (katso [Seurue](#party)).
- **Persoonallisuus** (viides editio): luonteenpiirre, ihanne, side ja heikkous taustasi taulukoista tai omasta päästäsi.
- **Kuva.** Kun hahmosi on valmis, pelinjohtaja pyytää sinulta kuvaa hahmosta: tiedoston tietokoneeltasi. Jos tekoälyisäntäsi osaa piirtää kuvia itse, pelinjohtaja voi tarjoutua tekemään sellaisen.

RPG Engine laskee hahmolomakkeen luvut valintojesi perusteella: sinun ei tarvitse laskea itse. Kun hahmot on tehty ja vahvistat, tarina alkaa.

---

## 3. Pelaaminen <!-- icon: chat -->

### 3.1 Puhuminen pelinjohtajan kanssa

Kirjoita, mitä hahmosi tekee tai sanoo, omin sanoin. Lyhyt riittää.

> Kysyn majatalon isännältä, kuka muu kävi täällä tänä iltana.
>
> "Emme ole tulleet hankaluuksia hakemaan", sanon käsi poissa miekaltani.
>
> Kiipeän katolle ja odotan.

**Tarinan ulkopuolella** kirjoita hakasulkeiden väliin:

> [Miten kamppailu toimii?]
>
> [Voinko vielä käyttää reaktioni tällä kierroksella?]
>
> [Lopetetaan tältä illalta.]

Pelinjohtaja vastaa myös hakasulkeissa ja palaa sitten tarinaan.

**Sinä kerrot, mitä yrität; pelinjohtaja kertoo, mitä tapahtuu.** Mikä rikkoo maailman logiikan tai jo vahvistetut tosiasiat, ei tapahdu: pelinjohtaja kertoo sen sinulle tarinan sisällä ja tarjoaa, mikä on mahdollista.

**Pelinjohtaja ei koskaan päätä hahmosi puolesta.** Se ei pane hahmoasi puhumaan, tuntemaan tai valitsemaan. Epäselvissä tilanteissa se kysyy.

**Pelinjohtaja ei puhu koneistosta.** Jos kysyt, pitääkö se kirjaa asioista, se vastaa kuin pelinjohtaja: "Pidän kaiken muistissa: jatkamme tästä ensi kerralla."

**Voit kysyä pelinjohtajalta, miten kojelautaa käytetään.** Se tuntee sivun: "Mistä näen loitsuni?", "Miten heitän käsin?"

### 3.2 Heitot

**Milloin heitetään.** Pelinjohtaja pyytää heiton vain, kun lopputulos on epävarma ja sillä on merkitystä. Muuten se sanoo kyllä tai "kyllä, mutta". Ennen heittoasi pelinjohtaja kertoo, mikä on pelissä ja mitkä heitot sopivat, ja pysähtyy. Sinä heität tai muutat mielesi:

> **Pelinjohtaja:** Reunus on kapea ja märkä. Jos liukastut, edessä on pitkä pudotus jokeen. Ketteryysheitto (Akrobatia), tai voit palata etsimään portaita.
>
> **Sinä:** Yritän.

**Heittäminen kojelaudalla.** Kun pelinjohtaja pyytää, sivun ylälaitaan ilmestyy banneri, jossa on painike jokaiselle heitolle, esimerkiksi *Acrobatics +4 · with advantage*. Napsauta sitä: nopat putoavat sivulle, ja pelinjohtaja kuulee tuloksen. Voit myös:

- napsauttaa hahmolomakkeesi vastaavaa riviä, joka hehkuu kultaisena;
- heittää oikeat nopat noppa-alustalta;
- kirjoittaa bannerissa omat sanasi, jos haluat tehdä jotain muuta.

**Heittäminen käsin.** Jos haluat valita nopat itse, kytke bannerin kulmasta päälle **Käsin** (tai kohdassa **Asetukset**). Heiton painike katoaa, ja banneri kertoo, mitä heittää, kuten pelinjohtaja tekisi: *Roll Acrobatics yourself, on your sheet or with the dice.* Napsauta hahmolomakkeesi hehkuvaa riviä tai heitä oikeat nopat noppa-alustalta: RPG Engine heittää ne, lisää bonuksesi ja pelinjohtaja kuulee tuloksen. Heitto, jota hahmolomake tai noppa-alusta ei voi tehdä, kuten vahinko, joka heitetään uudelleen ykkösistä, säilyttää painikkeensa. Käsin pysyy päällä tässä selaimessa, kunnes kytket sen pois.

**Fyysiset nopat koko pelin ajan.** Kun **Nopat**-asetus on arvossa physical, pelinjohtaja pyytää heitot sanoin ja sinä kirjoitat heittämäsi silmäluvut:

> [Heitin 14.]

RPG Engine lisää muuntimesi ja hylkää silmäluvun, jota noppasi eivät voi näyttää.

**Vapaat heitot.** Napsauta mitä tahansa lukua hahmolomakkeellasi tai avaa noppa-alusta heittääksesi huvikseen. Vapaat heitot eivät koskaan lasketa, niitä ei kirjata, eikä pelinjohtaja koskaan näe niitä. Vapaa 20 ei muutu myöhemmin oikeaksi.

**Pelinjohtajan heitot.** Pelinjohtaja heittää vihollisten ja muiden puolesta myös RPG Enginellä. Useimmat heitot näkyvät heittosarakkeessasi. Kun et saa nähdä tulosta, pelinjohtaja heittää salaa. Voit aina kysyä:

> [Oliko tuo heitto aito?]

Näkyvästä heitosta pelinjohtaja antaa luvut ja perustelun. Salaisesta heitosta se antaa sormenjäljen, joka todistaa heiton tehdyn ennen kuin kysyit.

**Heitot chatissa** näkyvät hakasulkeissa heti sen hetken jälkeen, jonka ne ratkaisevat: *[Persuasion 14 + 3 = 17]*. Sitten tarina kertoo lopputuloksen.

### 3.3 Kohtaukset ja taistelut

Pelinjohtaja johtaa tarinaa **kohtauksina**: taistelu, keskustelu, tutkiminen, matkustaminen, lepo, haaste (takaa-ajo, kilpailu, pulma). Sinun ei tarvitse hallita niitä: niiden avulla RPG Engine pitää tarinan lukuja järjestyksessä. Jokaisen kohtauksen lopussa peli tallentaa itse, ja kohtaus siirtyy päiväkirjasi tarinaan.

**Taistelussa** pelinjohtaja kertoo kaikki vuorot, jotka eivät ole sinun, peräkkäin kaikkine heittoineen ja **pysähtyy kohtaan, jossa voit päättää**: sinun vuorosi, reaktio, valinta. Omalla vuorollasi kerro, mitä teet:

> Loitsin Sacred Flamen oven vieressä seisovaan.

Kojelaudan **Taistelu**-osio näyttää vuorojärjestyksen, kenen vuoro on, seurueesi osumapisteet ja sen, kuinka loukkaantuneilta viholliset näyttävät (vahingoittumaton, loukkaantunut, verta vuotava, kaatunut: sanoin, ei koskaan luvuin). Jos hahmosi kaatuu, kuolemantallennukset ilmestyvät isoina sivulle.

**Kun taistelu on jo ratkennut**, pelinjohtaja voi tarjoutua kertomaan lopun yhdessä viestissä.

### 3.4 Aika, matkustaminen ja maailma, joka liikkuu

**Aika.** Jokainen teko vie aikaa tarinassa, ja RPG Engine pitää päivämäärää: päivä 3, aikainen aamu. Pelinjohtaja kertoo ajan niin kuin maailma sen mittaa: aamunkoitto, kolmas kello, yön lasku. Sessioiden välillä aikaa ei kulu: jatkat siitä, mihin jäit.

**Levot.** Sano, että lepäät, niin pelinjohtaja soveltaa sen, mitä lepo palauttaa, kuten osumapisteet ja loitsupaikat:

> Pystytämme leirin ja otamme pitkän levon.

**Matkustaminen.** Kerro, minne haluat mennä:

> Lähdemme pohjoiseen vievälle tielle kohti Roccaa.

RPG Engine laskee reitin, matkan ja päivät vauhdillasi ja siirtää sinut perille. Matka pysähtyy, kun matkalla tapahtuu jotain suunniteltua, jokaisen päivän matkan lopussa ja perillä. Voit kysyä, kuinka kaukana paikka on, ennen lähtöä:

> [Kuinka kaukana Rocca on, ja kuinka kauan matka kestäisi jalan?]

**Maailma liikkuu ilman sinua.** Konnilla on suunnitelmia määräaikoineen ja kelloineen. Joka uusi päivä pelinjohtaja siirtää uhkia, joita aika on edistänyt, ja näet niiden merkit: huhun, jäljen, muutoksen kaupungissa. Et koskaan näe itse kelloa, vain sen jättämät jäljet.

**Raha** lasketaan pelin kolikoissa. Maksa, myy, saa maksu: RPG Engine antaa vaihtorahat.

### 3.5 Kartat

**Maailmankartta** (kojelauta: **Maailma**) näyttää vain paikat, jotka hahmosi tuntee, niiden väliset tiet, kulkemasi polun ja sumun kaiken muun päällä. Napsauta paikkaa nähdäksesi, mitä siitä tiedät ja kuinka kaukana se on.

**Paikan kartta** (kojelauta: **Kohtaus**, ja **Taistelu** taistelussa) ilmestyy, kun pelinjohtaja piirtää sellaisen siitä, missä olet: seinät, ovet, maaperä ja se, kuka seisoo missä, pelimerkkeinä. Taistelussa omalla vuorollasi ruudut, joihin et yllä, on verhottu, joten näet yhdellä silmäyksellä, minne voit mennä. Kun pelinjohtaja kysyy, minne hahmosi liikkuu, sivu avaa kartan ja voit napauttaa ruutua tai kirjoittaa sen, esimerkiksi *E4*.

### 3.6 Tehtävät, päiväkirja ja muistiinpanot

**Tehtävät.** Kun hahmosi ottaa tehtävän vastaan, siitä tulee tehtävä **Päiväkirjaasi**: kuka sen antoi, missä, mihin mennessä, sen tavoitteet luettelona ja se, mitä se mittaa (määräaika ja jäljellä oleva aika, kello, laskuri). Merkitse tehtävä tähdellä seurataksesi sitä: se pysyy pienenä Kohtauksen yläreunassa seuraavan tavoitteensa kanssa. Tehtävä päättyy, kun tarina päättää sen, ei koskaan itsestään.

**Tarina.** Päiväkirjan Tarina-välilehti on kampanjasi aikajanana: jokainen kohtaus on luku paikkoineen, päivämäärineen ja lyhyine tiivistelmineen, viimeisin ensin.

**Muistiinpanosi.** Päiväkirjan Muistiinpanot-välilehdellä kirjoitat omia muistiinpanojasi: teorioita, nimiä, suunnitelmia. Ne pysyvät tietokoneellasi, eikä pelinjohtaja lue niitä, ellet **Jaa** jotakin. Jaettu muistiinpano tavoittaa pelinjohtajan tämän seuraavassa vastauksessa sellaisena, mitä ajattelet, ei koskaan tosiasiana. Teoriasi ei muutu todeksi, koska kirjoitit sen. Muistiinpano, joka pyytää lopettamaan tai välttämään jonkin sisällön, lasketaan samoin kuin jos olisit sanonut sen pöydässä.

### 3.7 Hahmosi tarina ja kuva

Hahmosi hahmolomakkeella **Kuvaus**-kortissa on laatikko, johon voit kirjoittaa hahmosi tarinan. Lähetä se, niin pelinjohtaja kirjoittaa sen hahmoon omin sanoin, kun olet sanonut kyllä.

Hahmosi kuvaa varten anna pelinjohtajalle kuvatiedosto chatissa sekä se, missä se on tietokoneellasi (PNG, JPEG, WebP tai SVG, enintään 5 Mt):

> [Tässä on hahmoni muotokuva: C:\Users\me\Pictures\mira.png]

Pelinjohtaja kopioi sen kampanjaan, ja se ilmestyy hahmosi pelimerkkiin kojelaudalla. Voit vaihtaa sen samalla tavalla milloin haluat. RPG Engine itse piirtää vain paikkoja ja tehtäviä (katso [Kuvat](#311-pictures)).

### 3.8 Tallennukset ja taaksepäin palaaminen

RPG Engine tallentaa koko kampanjan **jokaisen kohtauksen lopussa**, itsestään. Mitä näillä tallennuksilla voit tehdä, riippuu **Tallennukset**-asetuksesta:

| Tallennukset | Tallenna, kun haluat | Palaa taaksepäin |
|---|---|---|
| **permadeath** | ei | ei koskaan; voit vain aloittaa kampanjan alusta |
| **checkpoint** | ei | viimeiseen tallennukseen, vain kun hahmosi kuolee |
| **free** | kyllä | mihin tahansa tallennukseen, milloin haluat |

Jokaisessa tilassa voit **aloittaa alusta**: pelin alusta samalla hahmolla tai nollasessiosta uudella hahmolla.

Voit tehdä kaiken tämän chatissa ("[Palataan ennen kaksintaistelua.]") tai kojelaudan **Tallennukset**-osiossa.

**Taaksepäin palaamisen jälkeen avaa uusi chat.** Chat, jossa pelasit, muistaa sen, mikä peruttiin. Avaa uusi chat pelinjohtajan kanssa (`/clear` Claude Codessa, `/new` Codexissa), kirjoita *jatka*, paina sitten Tallennukset-osiossa **Avasin uuden keskustelun** tai kerro asiasta pelinjohtajalle uudessa chatissa. Älä koskaan jatka vanhaa chattia. Kunnes vahvistat, pelinjohtaja ei jatka.

### 3.9 Sessiot: lopettaminen ja palaaminen

**Voit lopettaa session** milloin haluat:

> [Lopetetaan tältä illalta.]

"Tallenna ja lopeta" -toimintoa ei ole: kaikki on jo tiedostoissa.

**Sulje** chat kirjoittamalla `/exit` Claude Codessa tai `/quit` Codexissa. Kojelauta hiljenee seuraavaan chattiin asti.

**Palataksesi** avaa pääte kampanjakansiossa (siinä, jonka `init` tulosti), käynnistä isäntäsi siellä ja kirjoita *jatka*. Pelinjohtaja lukee, missä peli on, antaa lyhyen kertauksen ja aloittaa jollakin tapahtuvalla. Uusi chat ei hävitä mitään: kampanja elää tiedostoissaan, ei chatissa.

Pelinjohtaja ei kysy lopuksi rutiinikysymyksiä. Vain jos se huomasi, ettei jokin toiminut, se kysyy lyhyesti.

### 3.10 Pelinjohtajan mieliala

Kojelaudan yläreunassa on pelinjohtajan avatar, pieni robotti. Sen ilme seuraa tarinan sävyä: huolestunut, kun vaara kasvaa, ilahtunut rohkeasta ideasta, yllättynyt käänteestä. Se reagoi hetkeksi luonnolliseen 20:een tai luonnolliseen 1:een. Se ei koskaan näytä sitä, mitä et vielä tiedä: ei virnistystä ennen kuin ansa laukeaa. Seurueesi pelimerkit näyttävät myös mielialansa. Kun chat on suljettu, robotti nukkuu.

### 3.11 Kuvat

RPG Engine voi teettää kuvan jokaisesta paikasta, jonne saavut, ja jokaisesta tehtävästä, jonka otat, **Kuvat**-asetuksen mukaan. Se käyttää sitä, mitä tietokoneellasi jo on:

- **Codex**, ChatGPT-kirjautumisellasi: maalattu kuva.
- Muuten **Claude Code**, Claude-kirjautumisellasi: piirros.

Kuva käyttää omaa tilaustasi, ei meidän. **Asetukset**-osio kertoo, voiko tietokoneellasi tehdä kuvia, ja jos ei, vaiheet sen järjestämiseksi. Ilman kuvia sivu näyttää niiden sijaan kunkin paikkatyypin merkin. Voit myös antaa pelinjohtajalle oman kuvasi mistä tahansa paikasta tai hahmosta.

### 3.12 Turvallisuus: rajat, verhot ja stop

- **Rajat**: mitä ei koskaan esiinny pelissä.
- **Verhot**: mikä saa tapahtua, mutta vain kameran ulkopuolella.
- **Stop**: voit milloin tahansa pysäyttää jonkin sisällön selittämättä. Kirjoita se tarinan ulkopuolella:

> [stop]

Pelinjohtaja luopuu siitä heti ja lisää sen rajoihisi kaikille tuleville sessioille. Voit nähdä ja muuttaa rajojasi ja verhojasi kohdassa **Asetukset**.

### 3.13 Mielen muuttaminen

Jokaista asetusta voi muuttaa kampanjan aikana: chatissa ("[Tehdään siitä kovempaa.]") tai kohdassa **Asetukset**. Pelinjohtaja kuulee muutoksesta seuraavassa vastauksessaan. Ratkaisusta, jonka pelinjohtaja teki ilman sääntökirjaa, tulee **ennakkotapaus**, ja se säilytetään, jotta sama kysymys saa ensi kerralla saman vastauksen.

---

## 4. Kojelauta osio osiolta <!-- icon: party -->

Kojelauta on sivu omalla tietokoneellasi. Pelinjohtaja antaa sen linkin jokaisen chatin alussa. Se seuraa peliä suorana: kun pelinjohtaja muuttaa jotain, sivu muuttuu myös.

Vain sen tietokoneen selain, jolla pelaat, voi avata sen: ei puhelin eikä tabletti, vaikka ne olisivat samassa Wi-Fi-verkossa. Sivu sopii myös kapeaan ikkunaan: silloin osiot siirtyvät alapalkkiin ja kuvakkeet valikkoon.

Sivu elää niin kauan kuin chat. Sulje chat, ja auki jäänyt sivu näyttää tekstin *Not connected* hahmolomakkeen entisessä tilassa, ja pelinjohtajan robotti nukahtaa; avaa kampanjassa taas chat, ja kun pelinjohtaja on vastannut, sivu palaa itsestään.

### Yläreunassa

- **Pelinjohtajan avatar** mielialoineen.
- Kampanjan nimi, pelijärjestelmä, **peliaika** ja se, onko peli **yhteydessä** (chat yhdistetty).
- Osiot: **Seurue**, **Kohtaus**, **Taistelu** (vain taistelun aikana), **Päiväkirja**, **Maailma**; rivin lopussa kuvakkeina: **Tallennukset**, **Ohje**, **Asetukset**, **Tietoja**.
- Vaalea ja tumma teema oikeassa yläkulmassa.

Kun pelinjohtaja kysyy sinulta jotain, sen banneri pysyy sivun yläreunassa, missä osiossa tahansa olet.

### Seurue

Hahmosi hahmolomake ja seuralaistesi lomakkeet. Jokainen hahmolomakkeen osa on kortti, jonka voit avata ja sulkea.

- **Napsauta lukua** heittääksesi sen huvikseen. Osoita lukua nähdäksesi, miten se muodostuu ("+5: Viisaus +3, taitovarmuus +2").
- **Osumapisteet, paikat ja käyttökerrat** näkyvät palkkeina ja pisteinä.
- **Tilat ja vaikutukset** näkyvät kestonsa kanssa.
- **Kuvaus** sisältää hahmosi tekstin ja laatikon, jolla lähetät pelinjohtajalle hahmosi tarinan.
- Kun osumapisteet ovat 0, **kuolemantallennukset** ilmestyvät isoina nimen alle.
- Hahmolomakkeen vieressä (kapealla näytöllä sen alla): **heitot**, uusin ensin, omasi ja ne pelinjohtajan heitot, jotka saat nähdä. **Poista** tyhjentää luettelon; **Palauta** tuo sen takaisin. Vapaat heitot näkyvät katkoviivalla ja himmennettyinä.

Seuralainen, jolla on ominaisuuslista, kuten susi, näyttää täyden hahmolomakkeen sijaan ominaisuuslistansa.

### Kohtaus

Missä seurueesi on: paikan kuva ja nimi, sen ympärillä olevat paikat, paikan kartta, jos sellainen on, ketkä ovat paikalla, ja avoin kohtaus sen kanssa, mitä juuri nyt tapahtuu. Seuraamasi tehtävä on ylhäällä.

### Taistelu

Vain taistelun aikana. Ylhäällä: kierros, kuka toimii, kuka on seuraavana. Alla: vuorojärjestys, jokainen taistelija tiloineen, seurueesi lukuina ja viholliset sanoin; mitä hahmollasi on käden ulottuvilla (Classe Armatura, osumapisteet, hyökkäykset); paikan kartta, jossa toimiva on rengastettu. Omalla vuorollasi Taistelu-linkki sykkii kultaisena, missä tahansa oletkin.

### Päiväkirja

Kolme välilehteä:

- **Tehtävät**: aktiiviset, suoritetut ja epäonnistuneet, kukin korttina tavoitteineen, määräaikoineen ajastimena ja kelloineen. Tähti seuraa tehtävää.
- **Tarina**: kampanjan luvut kohtaus kohtaukselta, viimeisin ensin.
- **Muistiinpanot**: omat muistiinpanosi, yksityisiä, kunnes jaat jonkin.

### Maailma

Maailmankartta sellaisena kuin hahmosi sen tuntee, sumu muun päällä. Liikuta vetämällä, zoomaa rullalla tai nipistämällä. Napsauta paikkaa nähdäksesi sen kortin. Paikkojen luettelo, lähin ensin, on sen vieressä. Jos karttoja on useampi (kaupunki, manner, toinen taso), välilehdet vaihtavat niiden välillä.

### Noppa-alusta

Noppapainike avaa alustan: valitse nopat ja muunnin ja heitä. Jos samaa noppaa on kaksi tai useampi, valitse, mitkä lasketaan: **Kaikki**, **Korkein** (vain korkein) tai **Matalin** (vain matalin). Valitsemasi nopat pysyvät, kunnes painat **Poista**, joten sama vahinkoheitto on yksi napsautus joka kierros. Kun pelinjohtaja pyytää heittoa, alusta kertoo, mitkä nopat vastaavat siihen.

### Tallennukset

Tallennuksesi, uusin ensin, kukin paikkoineen, peli-päivämäärineen ja tekohetkineen. **Tallenna nyt** (vapailla tallennuksilla), **Palaa tähän** ja **Aloita alusta**, punaisena, kahdessa vaiheessa. Katso [Tallennukset ja taaksepäin palaaminen](#38-saves-and-going-back).

### Asetukset

Asetuksesi ryhmittäin: peli, pelin oppiminen (mentori ja sinulle jo selitetyt säännöt), nopat ja mitat, rajoitukset (rajat ja verhot), kuvat, kieli. Napsauta arvoa valitaksesi sen; sen alla kerrotaan, mitä se tarkoittaa. Sitten sivun omat asetukset, jotka säilyvät vain tässä selaimessa: teema, noppien ääni, **noppasarja** (hartsi, metalli, puu, kivi), pyöristetyt tai terävät reunat, käsin heittäminen.

Pelinjohtajan omat asetukset, kuten talosäännöt ja ennakkotapaukset, eivät ole täällä: ne pysyvät chatissa.

### Ohje ja Tietoja

**Ohje**: tämä opas. **Tietoja**: mikä RPG Engine on, sen linkit, lisenssit ja pelijärjestelmän tekijätiedot.

### Ennen peliä: Asetukset ja nollasessio

Kun uusi kampanja on ensimmäisessä vaiheessaan, **Asetuksissa**, koko sivu esittää kysymyksensä: yhden kerrallaan, jokaisen arvojen merkityksen ja ehdotetun arvon kanssa. **Päätä sinä** jättää kysymyksen pelinjohtajalle, paitsi rajat ja verhot, jotka ovat aina sinun; **Ohita** jättää sen myöhemmäksi. Lopuksi **Olen valmis**.

### Sivun ilmoitukset

Joskus sivu näyttää ilmoituksen päällään: ongelma kampanjan tiedostoissa (pelinjohtaja korjaa sen), peli poissa (chat on suljettu), sivua käännetään.

---

## 5. Pelijärjestelmät ja talosäännöt <!-- icon: dice -->

### 5.1 Mikä pelijärjestelmä on

Pelijärjestelmä on yhden pelin data: sen hahmolomake, luvut, olennot, esineet, loitsut ja sääntöteksti. Jokainen kampanja pelaa yhtä järjestelmää.

RPG Engine laskee hahmolomakkeesi sekä sen, mikä kuluu ja mikä palautuu, kuten osumapisteet ja loitsupaikat, kuten digitaalinen hahmolomake. Miten ominaisuus tai loitsu toimii, sen pelinjohtaja lukee säännöistä ja päättää, kuten pelipöydässä.

### 5.2 Viides editio, mukana

RPG Engine sisältää **5e**:n System Reference Document 5.1 -aineistosta (vuoden 2014 säännöt, ilmaiset Creative Commons -lisenssillä). Mukana on:

- SRD:n rodut, hahmoluokat, alaluokat, tausta ja erikoistaito;
- 319 loitsua, aseet, panssarit ja varusteet, taikaesineet ja SRD:n hirviöt;
- sääntöluvut, jotka pelinjohtaja hakee tarkan tekstinsä mukaan;
- täydellinen laskettu hahmolomake: ominaisuusmuuntimet, tallennusheitot, taidot, Classe Armatura, hyökkäykset, loitsujen vaikeusluku, paikat, osumanopat, ominaisuudet tasoittain, kokemus ja tasonnousu;
- levot, jotka palauttavat sen, minkä niiden kuuluu; tilat sääntötekstineen; keskittymismuistutukset.

**SRD:n ulkopuolinen sisältö.** Voit pelata viidettä editiota sisällöllä, jota SRD:ssä ei ole, kuten omistamasi kirjan hahmoluokalla tai hirviöllä. Pelinjohtaja tuntee pelin, osaa lukea oppaasi ja hakea verkosta. Se kirjoittaa tarvitsemansa kampanjasi sivuiksi, ja RPG Engine toimii niillä samoin. Se, mitä toimitamme, on lisenssin rajaamaa; se, minkä pelinjohtajasi tietää, ei ole.

RPG Engine on yhteensopiva viidennen position kanssa.

### 5.3 Talosäännöt ja omat lisäyksesi

Sinun ei tarvitse koskea yhteenkään tiedostoon. Pyydä pelinjohtajaa:

> [Talosääntö: luonnollinen 1 hyökkäyksessä tarkoittaa, että pudotat aseesi.]
>
> [Haluaisin pelata Blood Hunteria. Minulla on kirja: tässä ovat luokan ominaisuudet.]
>
> [Tässä kampanjassa lyhyt lepo kestää 10 minuuttia.]

Pelinjohtaja kirjaa ne kampanjaasi jollakin näistä tavoista:

- **Pöydän sopimus**, sanoin, kuten yllä oleva pudotettu ase tai lyhyt lepo. Pelinjohtaja säilyttää sen kampanjan asetusten kanssa ja pelaa sen mukaan tästä eteenpäin. Ratkaisu, jonka pelinjohtaja tekee ilman sääntökirjaa, säilytetään samoin, **ennakkotapauksena**.
- **Uusi sivu**, kuten hahmoluokka, rotu tai esine. Uusi hahmoluokka toimii kuin järjestelmän omat: tasosi, osumanoppasi ja ominaisuutesi lasketaan sen mukaan. Uusi rotu voi perustua olemassa olevaan ("kuten haltia, plus…"); nimetty miekka voi perustua pitkämiekkaan.
- **Uusia lukuja hahmolomakkeelle**: kenttä, taulukko, kaava, laskuri, jonka lepo palauttaa. Esimerkiksi Battle Masterin ylivoimanopat, jotka palautuvat lyhyessä levossa. Talosääntö voi myös korvata yhden järjestelmän kaavoista.

Jos sinulla on talosääntöjä jo kirjoitettuina, voit laittaa ne myös tekstitiedostoina kampanjan `rules`-kansioon (katso [kampanjakansio](#8-for-the-curious-the-campaign-folder)): pelinjohtaja lukee ne ennen kirjan samannimistä sääntöä.

### 5.4 Oman pelijärjestelmän lisääminen tai tuominen

Nykyään RPG Engine pelaa vain viidettä editiota. Muita pelijärjestelmiä on tulossa, samoin tapa lisätä omasi tai muuttaa omistamasi peli sellaiseksi sen oppaiden pohjalta. Katso [Tulossa myöhemmin](#9-coming-later).

---

## 6. Laajennukset <!-- icon: plus -->

**Laajennukset eivät ole vielä saatavilla.** Laajennus lisää kampanjaan jotain pelijärjestelmän päälle: maailman, seikkailun, ominaisuuden kuten sään tai tarot-pakan, jaettavia talosääntöjä. Valitset, mitä kukin kampanja käyttää. Ensimmäiset viidennelle editiolle suunnitellut ovat sää ja lukkojen tiirikointi.

---

## 7. Mistä kampanja tulee, ja sen kieli <!-- icon: world -->

### 7.1 Kolme tapaa saada maailma

**Tehty lennossa.** Annat lähtökohdan asetusvaiheessa, ja pelinjohtaja rakentaa maailman matkan varrella: jokaisen paikan, henkilön ja juonen juuri ennen kuin tarvitset sitä, ja säilyttää sen siitä eteenpäin. Tämä on nopein tapa pelata: asenna, luo, ja muutamassa minuutissa teet hahmoasi. Mitään keksittyä ei menetetä: kun jotain on sanottu, se kirjoitetaan ylös ja pysyy totena.

**Valmisteltu alussa.** Sama lähtökohta, mutta asetuksella **valmistelu: kaikki alussa** pelinjohtaja rakentaa maailman paikat, ryhmittymät, uhat ja niiden suunnitelmat ennen pelin alkua. Ensimmäinen sessio alkaa myöhemmin, ja taustalla on enemmän valmiina.

**Olemassa olevasta kampanjasta tai seikkailusta.** Nykyään tuontipainiketta ei ole. Anna pelinjohtajalle seikkailusi (teksti tai PDF, jonka isäntäsi osaa lukea) ja pyydä sitä valmistelemaan se:

> [Minulla on tämä seikkailu PDF:nä. Valmistele se kampanjaksemme: lue se ja kirjoita sen paikat, hahmot ja salaisuudet. Älä kerro minulle mitään siitä, mitä siinä on.]

Pelinjohtaja lukee sen tekoälyisäntäsi työkaluilla ja kirjoittaa sen kampanjan sivuiksi, salaisuudet mukaan lukien, jotka löydät pelissä. Claude Code lukee PDF-tiedostoja; Codexin kanssa teksti- tai markdown-tiedosto on varmempi valinta. Tee tämä asetusvaiheessa, ennen nollasessiota.

Kun pelinjohtaja työskentelee, älä avaa sen lukemisen tai kirjoittamisen tietoja (Claude Codessa ctrl+o): ne näyttävät seikkailun tekstin salaisuuksineen. Pelinjohtaja itse pitää salaisuudet, kuten aina.

Heti kun kampanjassa on omia sivuja, asetusvaihe lakkaa kysymästä lähtökohtaa ja valmistelua. Myös kirjoitetussa kampanjassa, kun menet paikkaan, jota teksti ei kata, pelinjohtaja luo tarvittavan ja kirjaa sen.

**Kampanja pelataan kerran.** Jos haluat pelata saman seikkailun uudelleen, luo uusi kampanja. Kampanjan sisällä voit yhä palata tallennukseen tai aloittaa alusta, sen mukaan kuin tallennusasetus sallii.

### 7.2 Kielet

**Yksi kieli kampanjaa kohden**: pelinjohtajan. Pelinjohtaja kirjoittaa sillä, ja kojelauta seuraa sitä. Pelinjohtaja ottaa sen siitä, miten kirjoitat, ja vahvistaa sen.

**Kojelauta** tulee englanniksi ja italiaksi (huolella laadittu) sekä 24 muulla kielellä: ranska, saksa, espanja, portugali (brasilialainen), hollanti, ruotsi, norja, tanska, suomi, islanti, venäjä, ukraina, puola, tšekki, romania, unkari, kreikka, turkki, arabia, heprea, hindi, kiina, japani, korea. Arabia ja heprea luetaan oikealta vasemmalle: sivu peilautuu, kun taas kartat ja nopat pysyvät piirrettyinä.

**Mikä tahansa muu kieli**, jonka valitset Asetuksissa, käännetään tietokoneellasi taustalla Codexilla tai Claude Codella omalla kirjautumisellasi, alkaen avoinna olevasta osiosta. Se tehdään kerran kieltä kohden, kaikille kampanjoillesi. Kunnes se on valmis, sivu on englanniksi. Asetukset kertoo, onko käännös käynnissä, valmis vai mahdoton tietokoneellasi.

**Pelin sanat.** Viides editio tuo omat termit italiaksi viralliselta italialaiselta SRD:ltä, joten italialaiset pelaajat lukevat *Classe Armatura*, *tiro salvezza*, *vantaggio*. Muille kielille järjestelmän termit käännetään.

**Pelijärjestelmän oma teksti** (loitsut, hirviöt, sääntöluvut) pysyy englanniksi. Pelinjohtaja lukee sen ja kertoo sen sinulle sinun kielelläsi.

**Kielen vaihtaminen kesken kampanjan** jättää jo kirjoitetut sivut ennalleen; pelinjohtaja kirjoittaa uudet uudella kielellä.

---

## 8. Uteliaille: kampanjakansio <!-- icon: list -->

Sinun ei koskaan tarvitse avata sitä. Jos avaat, tiedä, että **siinä ovat kampanjasi salaisuudet**: sen lukeminen pilaa pelin.

Kampanjakansiossa on:

- `campaign.yaml`: asetuksesi;
- `state.yaml`: missä peli on nyt: sen vaihe, päivämäärä, avoin kohtaus;
- `world/`: yksi sivu jokaista hahmoa, paikkaa, ryhmittymää, tehtävää, esinettä, tapahtumaa, aihetta tai olentoa kohden, markdown-tiedostoina;
- `rules/`: talosääntösi tekstitiedostoina, jos lisäät sellaisia (`init` ei luo sitä);
- `images/`: kuvat, kun niitä on;
- `log.jsonl`: jokainen muutos järjestyksessä;
- `.saves/`: tallennukset ensimmäisestä alkaen;
- `.player/`: omat muistiinpanosi Päiväkirjasta, joita pelinjohtaja ei lue;
- `sessions/`: RPG Enginen ylläpitämä;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: pienet tiedostot, jotka kertovat tekoälyisännille, missä RPG Engine on, ja pitävät niiden muistin pois päältä. RPG Engine pitää ne ajan tasalla; jätä ne ennalleen.

Sivut ovat pelkkää markdownia, ja linkit ovat muotoa `[[Rocca]]`, Obsidianin formaattia: pelinjohtajan muistikirjan voi avata siellä. **Jos muutat sivua käsin**, pelinjohtaja kuulee muutoksesta seuraavassa vastauksessaan.

**Komentorivi.** Kaikki, mitä pelinjohtaja tekee, kulkee komentojen kautta, joita voit ajaa myös itse kampanjakansiossa. Et koskaan tarvitse niitä pelaamiseen, ja monet tulostavat kampanjan salaisuuksia, kuten `rpg status` ja `rpg show`. `rpg --help` luettelee ne kaikki, ja `rpg roll --help` selittää yhden. Komento, joka muuttaa jotain chatin ollessa auki, on sallittu: pelinjohtaja kuulee siitä seuraavassa vastauksessaan, kuten käsin muutetusta sivusta.

---

## 9. Tulossa myöhemmin <!-- icon: hourglass -->

Mitä on suunnitteilla, mutta ei vielä täällä:

- **Sinä pelinjohtajana**: sinä johdat peliä, ja tekoäly pelaa seuruetta.
- **Useita ihmisiä pöydässä**, kullakin oma roolinsa.
- **Laajennukset**: asetuksia, seikkailuja, ominaisuuksia ja talosääntöjä, valittuna kampanjakohtaisesti.
- **Oppaiden ja seikkailujen tuonti.**
- **Muita pelejä**: lisää pelijärjestelmiä ja omasi.
- **Tekijätila**: tee kampanja tai seikkailu tekoälyn kanssa ja jaa se muiden pelattavaksi.

---

## 10. Kysymykset ja ongelmat <!-- icon: info -->

### Kysymykset

**Tarvitseeko minun tuntea säännöt?** Ei. Valitse mentoriksi opastus, niin pelinjohtaja opettaa sinulle sitä mukaa kuin pelaat, yksi sääntö kerrallaan. Voit aina kysyä hakasulkeissa.

**Voiko pelinjohtaja huijata?** Se ei voi muuttaa RPG Enginen tekemää heittoa paitsi vaikeustasolla story, eikä se koskaan muuta jo vahvistettuja tosiasioita. Voit kysyä, oliko jokin heitto aito.

**Voinko minä huijata?** Voit yrittää. Pelinjohtaja ei usko sanaasi tosiasioista: viestisi rivi, joka näyttää pelin viestiltä, on silti vain sanojasi, eikä pelinjohtaja koskaan vahvista arvauksiasi salaisuuksista.

**Maksaako se mitään?** RPG Engine on ilmainen. Pelinjohtaja toimii omalla Claude- tai ChatGPT-tilauksellasi, ja pelilta on pitkä chat: pienimmillä tilauksilla tilauksen raja voi tulla vastaan ennen illan loppua. Kuvat ja käännökset käyttävät samaa tilausta.

**Voinko pelata puhelimellani?** Et. Pelinjohtaja toimii tietokoneellasi, ja kojelauta aukeaa vain sen tietokoneen selaimessa.

**Voinko pelata ystävien kanssa?** Et vielä: nykyään yksi pelaaja, yksi hahmo ja seuralaiset. Useampi ihminen pöydässä tulee rooleineen.

**Voinko käyttää ensi kerralla toista tekoälyä?** Kyllä. Kampanja elää tiedostoissaan: avaa se toisessa isännässä ja kirjoita *jatka*.

**Entä jos suljen selaimen?** Mitään ei menetetä. Avaa linkki uudelleen, kun chat on auki; sivu palaa siihen, missä peli on.

**Voinko pelata omistamallani D&D-sisällöllä?** Kyllä. Pelinjohtaja voi käyttää kirjojasi, omaa tietoaan ja verkkoa. Se, mitä RPG Engine toimittaa, rajoittuu ilmaiseen sisältöön; se, mitä pelisi käyttää, on sinun päätettävissäsi.

### Ongelmat

**Kojelauta ei aukea.** Pyydä pelinjohtajalta linkki: `[Mikä on kojelaudan linkki?]`. Sivu toimii vain, kun chat pelinjohtajan kanssa on auki kyseisessä kampanjassa, ja vasta pelinjohtajan ensimmäisen vastauksen jälkeen siinä chatissa. Kun chat on suljettu, selain ei tavoita sivua; auki jäänyt sivu näyttää tekstin *Not connected*.

**Pelinjohtaja ei tunnu tuntevan peliä tai keksii työkaluja.** Tekoälyisäntäsi ei ladannut RPG Engineä.

- Tarkista ensin, että käynnistit isännän **kampanjakansiossa** ja että sanoit luottavasi siihen.
- **Claude Code**: kirjoita `/mcp`. Jos `rpg` on siellä mutta epäonnistui, valitse se ja sitten **Reconnect**. Jos se puuttuu, sulje Claude Code, kirjoita kampanjakansiossa `claude mcp reset-project-choices` ja käynnistä se uudelleen.
- **Codex**: kirjoita päätteessä kampanjakansiossa `codex mcp list`. Jos `rpg` puuttuu, Codex ei luota kansioon: käynnistä se siellä uudelleen ja vastaa kyllä, kun se kysyy.
- Molemmissa: jos `rpg --version` päätteessä sanoo, ettei komentoa löydy, asenna RPG Engine uudelleen ([2.2](#22-install)) ja avaa uusi pääte.

**Päivityksen jälkeen mikään ei muuttunut.** Käynnissä oleva pelinjohtaja pitää version, jolla se käynnistyi. Avaa uusi chat tai yhdistä Claude Codessa palvelin uudelleen (`/mcp`, sitten `rpg`, sitten **Reconnect**).

**Pelinjohtaja muistaa jotain, minkä peruin.** Palasit tallennukseen mutta jatkoit pelaamista samassa chatissa. Avaa uusi chat ja paina Tallennukset-osiossa **Avasin uuden keskustelun**.

**Pelinjohtaja kysyy asetuskysymyksiä, joihin jo vastasin sivulla.** Kerro sille: `[Valitsin ne kojelaudalla.]`

**Kuvia ei ilmesty.** Avaa Asetukset > Kuvat: se kertoo, voiko tämä tietokone tehdä niitä, ja jos ei, vaiheet, kunkin komennon vieressä painike sen kopioimiseksi.

**Sivu on englanniksi, vaikka valitsin toisen kielen.** Sitä käännetään taustalla; Asetukset kertoo, miten se edistyy. Jos tällä tietokoneella ei ole Codexia tai Claude Codea, se pysyy englanniksi.

**Pelinjohtaja sanoo, että kampanjassa on ongelmia.** Se korjaa ne itse. Jos muokkasit tiedostoja käsin, se voi kysyä, mitä tarkoitit.

**Windows: `npm` epäonnistuu kansiossani.** Älä pidä kampanjaa tai RPG Engineä polussa, jossa on `&`.

**Asennus epäonnistuu tai `rpg` ei käynnisty.** Tarkista Node.js-versiosi komennolla `node --version`: sen on oltava 22 tai uudempi. Jos se on vanhempi, asenna LTS-versio osoitteesta [nodejs.org](https://nodejs.org) ja asenna sitten RPG Engine uudelleen.

**Kojelaudan linkki muuttui.** Toinen ohjelma käytti kampanjan tavallista osoitetta, tai Windows oli varannut sen. RPG Engine otti toisen; pelinjohtaja antaa uuden linkin. Mikään muu ei muutu.
