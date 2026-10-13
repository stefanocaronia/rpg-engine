<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 d32a17eb 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: eksiksiz kılavuz

**RPG Engine**, bir **yapay zekâ oyun yöneticisiyle** masaüstü rol yapma oyunu oynamanı sağlar.

Oyun yöneticisiyle bir **sohbet** içinde konuşursun: oyun yöneticisi hikâyeyi anlatır, diğer herkesi oynar ve olanlara karar verir.

RPG Engine perde arkasında çalışır: **dünyayı hatırlar**, **zarları atar** ve **hesapları tutar**.

Sohbetin yanında tarayıcında bir sayfa açık tutarsın, yani **gösterge paneli**. Orada karakterinin kağıdı, zarlar, haritalar ve günlüğün yer alır.

Bu kılavuz oyuncular içindir: programlamayı bilmen gerekmez.

## Hızlı başlangıç <!-- icon: send -->

1. [nodejs.org](https://nodejs.org) adresinden **Node.js** kur (LTS sürümü).
2. Oyun yöneticisinin çalıştığı yapay zekâ uygulaması olan **Claude Code** ya da **Codex**'i kur ve giriş yap ([2.4](#24-connect-your-ai)).
3. Bir terminal aç ve RPG Engine'i kur: `npm install -g rpg-engine`.
4. Terminalde bir kampanya oluştur: `rpg init "The Salt Isles"`.
5. Yeni klasörde Claude Code'u ya da Codex'i aç ve *Merhaba! Başlayalım.* yaz. Oyun yöneticisi gösterge panelinin bağlantısıyla yanıt verir. Bağlantıyı sohbetin yanında aç.

Kılavuzun geri kalanı her adımı, sonra da nasıl oynanacağını anlatır.

## 1. RPG Engine nedir <!-- icon: about -->

### Kim ne yapar

| Kim | Ne yapar |
|---|---|
| **Sen** | Karakterini oynarsın. Karakterinin ne yaptığını, ne söylediğini ve neyi denediğini sen belirlersin. |
| **Oyun yöneticisi** (yapay zekâ) | Hikâyeyi anlatır, diğer tüm karakterleri oynar, olanlara karar verir, atış ister. |
| **RPG Engine** | Her şeyi dosyalarda hatırlar, zarları atar, can puanlarını, parayı, zamanı ve mesafeleri sayar, sırları sen keşfedene kadar saklar. |

Yapay zekâ hikâye anlatmada iyidir, hatırlamada kötü. Kendi başına bırakılırsa kimin sana borcu olduğunu, kaç okun kaldığını ya da köprünün iki oturum önce yandığını unutur. RPG Engine bunların hepsini tutar. Böylece dünya bir akşamdan ötekine aynı kalır. Yeni bir sohbette de, farklı bir yapay zekâyla da.

### Nasıl hissettirir

Sohbete, masada konuşur gibi yazarsın:

> Kapıyı yavaşça iterim ve içeri bakarım.

Oyun yöneticisi gördüklerini anlatır ve seçim sırası sana geldiğinde durur. Bir şey belirsizse ve önemliyse, oyun yöneticisi nelerin tehlikede olduğunu söyler ve atış ister. Atışın düğmeleri gösterge panelinde belirir. Tıklarsın, zarlar sayfaya düşer ve oyun yöneticisi ne olduğunu anlatır.

### Onu farklı kılan ne

- **Dünya kalıcıdır.** Söylenen her şey doğru kalır. Ölen kötü karakter ölü kalır.
- **Zarlar gerçektir.** Oyun yöneticisi onları eğip bükemez (seçersen, en kolay zorlukta hariç).
- **Sırlar sır kalır.** Oyun yöneticisi, karakterinin bilmediği şeyi asla söylemez. Ne kadar ısrar edersen et.
- **Dünya sensiz de hareket eder.** Dinlenirken ya da yolculuk ederken tehditler ilerler ve izlerini görürsün.
- **Çok akşam, tek hikâye.** Kampanya, bilgisayarındaki bir klasördür. İstediğin zaman bırakır, sonra devam edersin.

### Bugün oynadığı oyun

RPG Engine her masaüstü rol yapma oyunu için yapılmıştır. Bugün tek bir oyun sistemiyle gelir: **beşinci sürüm** (ücretsiz System Reference Document 5.1'den). Başka oyunlar gelecek. Bkz. [Oyun sistemleri](#5-game-systems-and-house-rules) ve [Daha sonra gelecekler](#9-coming-later).

---

## 2. Başlarken <!-- icon: path -->

### 2.1 Neye ihtiyacın var

- Windows, macOS ya da Linux çalıştıran bir bilgisayar.
- **Node.js 22** ya da daha yenisi. [nodejs.org](https://nodejs.org) adresinden indirebilirsin: "LTS" sürümü yeterli. Yanında `npm` gelir, RPG Engine'i o kurar.
- Bir **terminal**. Komut yazdığın penceredir. Windows'ta Terminal uygulaması ya da PowerShell, macOS'ta Terminal. Terminali RPG Engine'i kurmak, her kampanyayı oluşturmak ve Claude Code ya da Codex'i başlatmak için kullanırsın.
- Bir **yapay zekâ ortamı**. Oyun yöneticisinin çalıştığı uygulamadır: **Claude Code** ya da **Codex**. Kendi planı ve girişiyle gelir. Bkz. [2.4](#24-connect-your-ai).
- Ortamının sunduğu **en büyük model**. Küçük model kolay kandırılır: testlerimizde kendini gerçek oyun yöneticisi olarak tanıtan bir oyuncuya sırları anlattı.
- Kontrol paneli için bir web tarayıcısı.

Ortamın için kullandığın giriş bilgisi başka işlere de yarar. RPG Engine bu girişi bilgisayarında kullanır: yerlerin, görevlerin, karşılaştığın kişilerin ve karakterinin görsellerini çizmek ve kontrol panelini kendi sunmadığı dillere çevirmek için. Bkz. [Görseller](#311-pictures) ve [Diller](#72-languages).

**Terminali bir klasörde açmak.** Birçok adım "kampanya klasöründe" der. Windows'ta Dosya Gezgini'nde klasöre sağ tıkla ve **Terminalde Aç**'ı seç. macOS'ta Finder'da klasöre sağ tıkla ve **Servisler > Klasörde Yeni Terminal**'i seç. Ya da zaten açık bir terminalde `cd` yaz, ardından klasörün yolunu ekle. Örneğin `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Kurulum

Bir terminal aç ve şunu yaz:

```text
npm install -g rpg-engine
```

Bu, sana `rpg` komutunu verir. Çalıştığını kontrol etmek için:

```text
rpg --version
```

`rpg` komutunu her kampanya için bir kez kullanırsın: kampanyayı oluşturmak için. Sonrasında yalnızca oyun yöneticisiyle konuşursun. Yapay zekâ ortamın RPG Engine'i aynı `rpg` komutuyla kendi başına başlatır.

### 2.3 Kampanya oluşturma

Kampanya bir klasördür. Oyunlarını tuttuğun klasörde bir terminal aç ve şunu yaz:

```text
rpg init "The Salt Isles"
```

Bu komut, içinde yeni bir kampanya olan `The Salt Isles` klasörünü oluşturur ve sana sonraki adımı söyler:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

*For the master* satırından sonrakiler oyun yöneticisi içindir. Onları sohbette oyun yöneticisi okur, senin yapacağın bir şey yok. Klasörün nerede olduğunu aklında tut: her oynadığında ona dönersin. Klasör adı vermezsen `rpg init`, içinde bulunduğun klasörü kampanyaya çevirir.

`init`, kampanyanın ihtiyaç duyduğu her şeyi hazırlar: ayarlarını, dünya klasörlerini ve yapay zekâ ortamına RPG Engine'i kullanmasını, kampanya dışında kendi belleğini tutmamasını söyleyen küçük dosyaları.

Şimdi bir şey seçmen gerekmiyor. Gerisini oyun yöneticisi sohbette sorar, ya da kontrol panelinden seçersin. Bazı seçimleri şimdiden biliyorsan burada verebilirsin:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Bu komut `salt-isles` klasörünü ve içinde *The Salt Isles* kampanyasını oluşturur: klasör adı boşluksuzdur, kampanyanın adı istediğin gibi olur.

| Seçenek | Neyi belirler | Değerler |
|---|---|---|
| `--name` | Kampanyanın adı | herhangi bir ad; boş bırakırsan klasörün adı |
| `--language` | Oyunun dili | `en`, `it`, `fr` gibi bir kod |
| `--system` | Oyun sistemi | `5e`, şimdilik tek seçenek |
| `--difficulty` | Dünyanın ne kadar zor olduğu | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Çatışmada yere düşmenin anlamı | `narrative`, `epic`, `dice` |

`rpg init --help` da bunları listeler. Bir kampanya, başka bir kampanyanın klasörünün içinde olamaz.

Oyun yöneticisinden kampanya oluşturmasını isteyemezsin: `init`'ten önce klasörde, yapay zekâ ortamına RPG Engine'in nerede olduğunu söyleyecek hiçbir şey yoktur.

### 2.4 Yapay zekâni bağla

RPG Engine, **Claude Code** ve **Codex** ile çalışır. MCP araçlarını kullanan başka yapay zekâ uygulamaları da çalışabilir, ama bunu garanti etmiyoruz.

**Ortamını kurmak.** Claude Code ve Codex terminalde çalışır: telefondaki Claude ya da ChatGPT uygulaması değildirler. İkisinin de kendi planı ve girişi gerekir: Claude Code için ücretli bir Claude planı, Codex için bir ChatGPT girişi. Kurmak ve giriş yapmak için kendi sayfalarını izle: [Claude Code](https://code.claude.com/docs/en/setup) ve [Codex](https://learn.chatgpt.com/docs/codex/cli). Bunu bir kez yaparsın, tüm kampanyaların için geçerli olur.

**Claude Code.** Kampanya klasöründe bir terminal aç ve `claude` yaz. İlk seferde klasöre güvenip güvenmediğini sorar ve klasörün oyunun araçlarına (`mcp__rpg`) izin verdiğini söyler: **Yes, I trust this folder**'ı seç. Dikkat: önceden seçili cevap *No, exit*'tir, yani hemen Enter'a basarsan Claude Code kapanır. Hepsi bu kadar: kampanya, Claude Code'a RPG Engine'i ve araçlarını kullanmasını, belleğini kapalı tutmasını zaten söylemiştir.

**Codex.** Kampanya klasöründe bir terminal aç ve `codex` yaz. Klasöre güvenip güvenmediğini sorduğunda evet de: kampanyanın kendi ayarları Codex'e RPG Engine'in nerede olduğunu söyler, araçlarına izin verir ve belleğini kapalı tutar. Codex bu ayarları yalnızca güvendiğin bir klasörde okur. Masaüstü uygulamasında, oyunun sohbetleri için belleklerin kapalı olduğundan emin ol.

**Bellek neden önemli?** Kampanya dosyalarında yaşar. Ortam kendi başına da bir şeyler hatırlarsa, bir kayda dönmek gerçekten geri dönmek olmaz: oyun yöneticisi geri alınanı yine hatırlar.

### 2.5 İlk sohbet

Herhangi bir şey yaz. Örneğin:

> Selam! Başlayalım.

Oyun yöneticisi oyunun nerede kaldığını okur ve cevap verir. Her sohbetteki ilk cevabında sana **kontrol panelinin bağlantısını** verir (`http://127.0.0.1:4750` gibi bir şey). Tarayıcında aç ve tüm oyun boyunca sohbetin yanında tut. Başka bir program almadıysa, her kampanya sohbetten sohbete aynı bağlantıyı korur. Aldıysa oyun yöneticisi sana yenisini verir.

Oyun yöneticisinin mesajları arasında ortamın, oyun yöneticisinin kullandığı araçları kısa satırlarla gösterir. Ayrıntılarını açma (Claude Code'da ctrl+o): oyun yöneticisinin yazdıklarını, sırlar dahil, gösterebilirler.

Yeni bir kampanya, insan oyun yöneticisi olan bir oyun gibi üç aşamadan geçer. Kontrol paneli bunları üstte *1 Ayarlar · 2 Sıfırıncı oturum · 3 Oyun* diye gösterir:

1. **Ayarlar**: Nasıl oynamak istediğini seçersin. Hikâyenin dışında.
2. **Sıfırıncı oturum**: Karakterini oyunun içinde yaratırsın.
3. **Oyun**: Hikâye.

### 2.6 Ayarlar: nasıl oynayacağını seçmek

Oyun yöneticisi yalnızca eksik kalanı sorar, her seferinde birkaç soru. "Sen karar ver" yazarsan oyun yöneticisi seçer ve ne seçtiğini söyler. Kontrol paneli açıkken ilk adımı **Ayarlar**, aynı soruları kartlar olarak gösterir: her seferinde bir soru, her değer anlamıyla birlikte, olağan olan **Önerilen** diye işaretli. Seçimini orada yap, oyun yöneticisi sohbette bir daha sormaz. **Atla** bir soruyu sonraya bırakır. Yalnızca sözle çözülebilecek şeyleri sohbet halleder: yeni bir dünyanın temel fikri, dil ve görseller. Görselleri oyun yöneticisi yalnızca bilgisayarın üretebiliyorsa sorar. Bu yüzden sayfa, aşağıdaki tablonun sıraladığından daha az soru sorar.

Tabloyu ezberlemen gerekmiyor: bakıp bulmak için burada. Bunların hepsini sonradan sohbette ya da kontrol panelinin **Ayarlar** bölümünde değiştirebilirsin. Değişiklik, oyun yöneticisinin bir sonraki cevabından itibaren geçerli olur.

| Ayar | Neyi belirler | Değerler | Önerilen |
|---|---|---|---|
| **Akıl hocası** ("Bu oyunu ne kadar iyi biliyorsun?" diye sorulur) | Oyun yöneticisinin sana kuralları hikâyenin dışında ne kadar öğrettiği | **kapalı** (yalnızca hikâye; istediğinde köşeli parantez arasında sor), **ipuçları** (önemli seçimlerden önce kısa bir öneri ve bir kural gözden kaçtığında), **eğitim** (her kural ilk seferde açıklanır, her atışın tüm toplamı gösterilir, çatışmalardan sonra kısa bir değerlendirme yapılır) | cevabına göre: hiç oynamadım → eğitim, biraz → ipuçları, biliyorum → kapalı |
| **Zorluk** | Dünyanın ne kadar zor olduğu: çatışmalar, düşman taktikleri, ipuçları, hazine, tehditlerin ne kadar hızlı ilerlediği | story, easy, normal, hard, brutal | |
| **Ölümcüllük** | Çatışmada yere düşmenin anlamı | **narrative** (karakterin hiç ölmez), **epic** (yalnızca hikâye için önemliyse ölür), **dice** (zarlar karar verir) | zorluğu izler: story → narrative, easy → epic, normal ve üstü → dice |
| **Kayıtlar** | Ne zaman geri dönebileceğin | **permadeath** (asla; yalnızca kampanyayı baştan başlatabilirsin), **checkpoint** (son sahne sonuna, yalnızca karakterin ölürse), **free** (herhangi bir kayda, istediğin an kaydedebilirsin) | checkpoint |
| **Kural sıkılığı** | Yemek, ışık, yorgunluk, taşıma ağırlığı, büyü malzemeleri ve yolculuğun kurallara ne kadar sıkı uyduğu | **smooth** (oyun yöneticisi bunları geçiştirir), **rules** (yazıldığı gibi: meşaleler söner, erzak biter), **simulation** (kuralların ötesinde: yıpranma, bozulma, hava durumu) | smooth |
| **Zarlar** | Karakterinin zarlarını kimin attığı | **digital** (RPG Engine sayfada atar), **physical** (sen kendi zarlarını atarsın ve yüzleri söylersin) | |
| **Birimler** | Hikâyedeki mesafeler ve ağırlıklar | metric, imperial | |
| **Yoldaşlar** | Seninle kimin yolculuk ettiği | yok, sıfırıncı oturumda seninle yaratılan, oyun yöneticisinin yarattığı, oyunda tanışılan | |
| **Görseller** | Yerlerin, görevlerin ve tanıştığın kişilerin görselleri, istediğinde de karakterinin portresi | yok, istek üzerine, yeni yerler, görevler ve tanışılan kişiler | bir kez sorulur, yalnızca bilgisayarın üretebiliyorsa |
| **Sınırlar** | Oyunda asla yer almayacak şeyler | bir liste ya da yok | |
| **Perdeler** | Olabilecek ama yalnızca sahne dışında olacak şeyler | bir liste ya da yok | |
| **Dil** | Oyunun ve kontrol panelinin dili | herhangi biri | nasıl yazdığından alınır ve onaylanır |

Oyun sistemi kendi ayarlarını ekleyebilir. Beşinci sürüm **ilerleme** ekler: karakterinin seviye atlama biçimi, **deneyim puanlarıyla** ya da hikâyenin **kilometre taşlarında**.

**Zorluk oyunda ne anlama gelir?** Story: zayıf, saf düşmanlar, bariz ipuçları, her şeyden bol; oyun yöneticisi kendi atışlarını yumuşatabilir. Easy: basit düşmanlar, cömert kaynaklar. Normal: mantıklı düşmanlar, her sonuca üç ipucu, standart fiyatlar ve hazine. Hard: akıllı düşmanlar, ince ipuçları, kıt kaynaklar, hızlı ilerleyen tehditler. Brutal: pusu kuran, geri çekilen ve yere düşenleri bitiren düşmanlar, çok kıt kaynaklar, en sert dinlenmeler. Çatışmalar her zaman grubunun o anki gücüne göre ayarlanır.

**Yazılı bir dünya yoksa** kurulum iki şey daha sorar:

- **Temel fikir**: türü, tonu ve dünyanın birkaç öğesi, kendi sözlerinle. Örneğin: *"Düşük fantezi, kasvetli ama umut dolu. Bir nehir kasabası, perili bir geçit, tepelerde bir tarikat."*
- **Hazırlık**: **anında** (oyun yöneticisi dünyanın her parçasını tam ihtiyaç duymadan önce kurar; önerilen) ya da **baştan hepsi**.

Ardından oyun yöneticisi kampanya için bir ad önerir. Eksik bir şey kalmadığında ve hazır olduğunu söylediğinde oyun sıfırıncı oturuma geçer.

### 2.7 Sıfırıncı oturum: karakterin

Sıfırıncı oturum oyunun bir parçasıdır: karakterini, masadaki gibi oyun yöneticisiyle birlikte yaratırsın.

- **Her seçim senindir**, oyun yöneticisinden yapmasını istemediysen. Dolu bir fikirle gelebilirsin ("tapınağını terk etmiş bir yarı-elf rahip"), belirsiz bir fikirle ("iyileştiren ama pek sevimli olmayan biri"), ya da hiçbir şeyle ("beni şaşırt, sonra bir şeyleri değiştirmeme izin ver").
- **Yetenek puanları.** Oyun yöneticisi, herhangi bir zar atılmadan önce sana yöntemi ve güvenlik ağını söyler. Beşinci sürümde: standart dizi, puan satın alma ya da 4d6'dan en düşüğü atma. Üzerinde anlaştığınız yöntem, masanın anlaşmaları arasında kalır.
- **Karakterinin hikâyesi** hiçbir zaman zorunlu değildir. Bir hikâye verirsen oyun yöneticisi onu senin sözlerinle yazar, sana bir kez okuyarak geri verir ve içindeki kişileri ve yerleri dünyaya bağlar. Hikâyeyi kontrol panelinde de yazabilirsin (bkz. [Grup](#party)).
- **Kişilik** (beşinci sürüm): bir özellik, bir ideal, bir bağ ve bir kusur; geçmişinin tablolarından ya da kendi seçiminden.
- **Bir görsel.** Karakterin yaratılınca oyun yöneticisi senden karakterin için bir görsel ister: bilgisayarındaki bir dosya ya da onu nasıl tarif ettiğine göre bilgisayarında üretilen bir portre (bkz. [karakterinin görseli](#37-your-characters-story-and-picture)).

Karakter kağıdındaki sayıları RPG Engine, seçimlerinden hesaplar: hiçbir zaman toplama yapmazsın. Karakterler yaratılıp sen onayladığında hikâye başlar.

---

## 3. Oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterinin ne yaptığını ya da ne söylediğini kendi sözlerinle yaz. Kısa olması yeterli.

> Han sahibine bu gece buradan başka kimlerin geçtiğini soruyorum.
>
> "Dert çıkarmaya gelmedik," diyorum, elim kılıcımdan uzakta.
>
> Çatıya tırmanıp bekliyorum.

**Hikâyenin dışında** köşeli parantez arasında yaz:

> [Tutuşma nasıl işliyor?]
>
> [Bu turda tepkimi hâlâ kullanabilir miyim?]
>
> [Bu gece burada bırakalım.]

Oyun yöneticisi de parantez içinde cevap verir, sonra hikâyeye döner.

**Sen neyi denediğini söylersin, ne olacağını oyun yöneticisi söyler.** Dünyanın mantığını ya da önceden belirlenmiş gerçekleri bozan bir şey gerçekleşmez: oyun yöneticisi bunu sana hikâyenin içinde söyler ve mümkün olanı önerir.

**Oyun yöneticisi karakterin adına asla karar vermez.** Seni konuşturmaz, hissettirmez, seçtirmez. Tereddüt ettiğinde sorar.

**Oyun yöneticisi motordan asla bahsetmez.** Her şeyi takip edip etmediğini sorarsan bir oyun yöneticisi gibi cevap verir: "Hepsini tutuyorum: bir dahaki sefere buradan devam ederiz."

**Oyun yöneticisine kontrol panelini nasıl kullanacağını sorabilirsin.** Sayfayı bilir: "Büyülerimi nerede görürüm?", "Zarı elle nasıl atarım?"

### 3.2 Atışlar

**Atış ne zaman olur?** Oyun yöneticisi atışı yalnızca sonuç belirsizse ve önemliyse ister. Aksi halde evet der ya da "evet, ama" der. Atışından önce oyun yöneticisi neyin tehlikede olduğunu ve hangi kontrollerin uyduğunu söyler, sonra durur. Sen atarsın ya da fikrini değiştirirsin:

> **Oyun yöneticisi:** Çıkıntı dar ve ıslak. Kayarsan nehre uzun bir düşüş olur. Bir Çeviklik (Akrobasi) kontrolü ya da geri dönüp merdivenleri arayabilirsin.
>
> **Sen:** Deneyeceğim.

**Kontrol panelinde atmak.** Oyun yöneticisi istediğinde sayfanın üstünde, her kontrol için bir düğme taşıyan bir şerit çıkar. Örneğin *Akrobasi +4 · avantajlı*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Şunları da yapabilirsin:

- karakter kağıdında ilgili satıra tıkla, altın rengiyle yanar;
- zar tepsisinden doğru zarları at;
- başka bir şey yapmak istiyorsan, şeride kendi sözlerini yaz.

**Elle atmak.** Zarları kendin seçmeyi tercih edersen şeridin köşesindeki **Elle**'yi aç (ya da **Ayarlar**'dan). Kontrolün düğmesi kaybolur ve şerit, bir oyun yöneticisi gibi neyi atacağını söyler: *Akrobasiyi kendin at, karakter kağıdında ya da zarlarla.* Karakter kağıdında yanan satıra tıkla ya da zar tepsisinden doğru zarları at: RPG Engine onları atar, bonusunu ekler ve oyun yöneticisi sonucu duyar. Ne karakter kağıdının ne de zar tepsisinin yapamayacağı bir kontrol, örneğin 1'lerini yeniden atan bir hasar, düğmesini korur. Elle, sen kapatana kadar bu tarayıcıda açık kalır.

**Tüm oyun boyunca fiziksel zarlar.** **Zarlar** ayarı physical olduğunda oyun yöneticisi atışlarını sözle ister ve sen attığın yüzleri yazarsın:

> [14 attım.]

RPG Engine değiştiricilerini ekler ve zarlarının gösteremeyeceği bir yüzü reddeder.

**Serbest atışlar.** Sadece eğlence için atmak üzere karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Serbest atışlar hiçbir şeye sayılmaz, kaydedilmez ve oyun yöneticisi onları asla görmez. Serbest bir 20 sonradan asla gerçek bir 20 olmaz.

**Oyun yöneticisinin atışları.** Oyun yöneticisi düşmanlar ve diğerleri için de RPG Engine ile atar. Çoğu atış atış sütununda gösterilir. Bir sonucu görmemen gerektiğinde oyun yöneticisi gizlice atar. Her zaman sorabilirsin:

> [Bu atış gerçek miydi?]

Gösterilen bir atış için oyun yöneticisi sayılarını ve gerekçesini verir. Gizli bir atış için, sen sormadan önce atıldığını kanıtlayan bir parmak izi verir.

**Sohbetteki atışlar** köşeli parantez içinde, karara bağladıkları anın hemen ardından görünür: *[İkna 14 + 3 = 17]*. Ardından hikâye sonucu anlatır.

### 3.3 Sahneler ve çatışmalar

Oyun yöneticisi hikâyeyi **sahnelerle** yürütür: bir çatışma, bir konuşma, keşif, yolculuk, bir dinlenme, bir meydan okuma (kovalamaca, yarış, bulmaca). Onları yönetmen gerekmez: RPG Engine hikâyenin bölümlerini böyle tutar. Her sahnenin sonunda oyun kendiliğinden kaydedilir ve sahne günlüğünün hikâyesine girer.

**Bir çatışmada** oyun yöneticisi senin olmayan tüm sıraları, her atışla birlikte, peş peşe anlatır ve **karar verebileceğin yerde durur**: sıran, bir tepki, bir seçim. Sıranda ne yaptığını söyle:

> Kapının yanındakine Sacred Flame atıyorum.

Kontrol panelinin **Çatışma** bölümü sıraların düzenini, kimin sırası olduğunu, grubunun can puanlarını ve düşmanların ne kadar yaralı göründüğünü gösterir (yaralanmamış, yaralı, kanlar içinde, yere düşmüş: sözle, asla sayıyla). Karakterin yere düşerse ölüm kurtarma atışları sayfada büyük görünür.

**Çatışmanın sonucu belli olduğunda** oyun yöneticisi geri kalanı tek mesajda anlatmayı önerebilir.

### 3.4 Zaman, yolculuk ve hareket eden dünya

**Zaman.** Hikâyede her eylem zaman alır ve RPG Engine tarihi tutar: 3. gün, sabahın erken saatleri. Oyun yöneticisi zamanı dünyanın ölçtüğü gibi anlatır: şafak, üçüncü çan, akşam çökerken. Oturumlar arasında zaman geçmez: kaldığın yerden devam edersin.

**Dinlenmeler.** Dinlendiğini söyle, oyun yöneticisi bir dinlenmenin geri getirdiklerini, örneğin can puanlarını ve büyü yuvalarını uygular:

> Kamp kuruyoruz ve uzun bir dinlenme yapıyoruz.

**Yolculuk.** Nereye gitmek istediğini söyle:

> Kuzeye, Rocca'ya giden yola çıkıyoruz.

RPG Engine yolu, mesafeyi ve günleri senin hızına göre hesaplar ve seni oraya götürür. Yolda planlı bir şey olduğunda, her günlük yolculuğun sonunda ve varışta yolculuk durur. Yola çıkmadan önce bir yerin ne kadar uzak olduğunu sorabilirsin:

> [Rocca ne kadar uzakta, yürüyerek ne kadar sürer?]

**Dünya sensiz de hareket eder.** Kötülerin süreleri ve saatleri olan planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir ve sen onların izlerini görürsün: bir söylenti, bir iz, kasabada bir değişiklik. Saatin kendisini asla görmezsin, yalnızca geride bıraktığını görürsün.

**Para** oyunun madeni paralarıyla sayılır. Öde, sat, ödeme al: para üstünü RPG Engine verir.

### 3.5 Haritalar

**Dünya haritası** (kontrol paneli: **Dünya**) yalnızca karakterinin bildiği yerleri, aralarındaki yolları, yürüdüğün izi ve geri kalan her şeyin üstündeki sisi gösterir. Bir yere tıkla, onunla ilgili bildiklerini ve ne kadar uzak olduğunu gör.

**Bir yerin haritası** (kontrol paneli: **Sahne**, çatışmada ise **Çatışma**), oyun yöneticisi bulunduğun yer için bir harita çizdiğinde görünür: duvarlar, kapılar, zemin ve kimin nerede durduğu, jetonlar olarak. Çatışmada, sıranda ulaşamayacağın kareler perdelenir, böylece nereye gidebileceğini bir bakışta görürsün. Oyun yöneticisi karakterinin nereye hareket ettiğini sorduğunda sayfa haritayı açar ve sen bir kareye dokunursun ya da *E4* gibi yazarsın.

### 3.6 Görevler, günlük ve notlar

**Görevler.** Karakterin bir işi üstlendiğinde, **Günlük**'te bir göreve dönüşür: kimin verdiği, nerede, ne zamana kadar, hedefleri bir liste olarak ve neyi ölçtüğü (kalan süreli bir son tarih, bir saat, bir sayaç). Takip etmek için bir görevi yıldızıyla işaretle: Sahne'nin üstünde, sıradaki hedefiyle birlikte küçük olarak durur. Görev, hikâye bitirdiğinde biter, kendiliğinden asla.

**Hikâye.** Günlüğün Hikâye sekmesi kampanyanı bir zaman çizelgesi olarak gösterir: her sahne bir bölüm, yeri, tarihi ve kısa bir özetiyle, en sonuncusu en üstte.

**Notların.** Günlüğün Notlar sekmesinde kendi notlarını yazarsın: kuramlar, adlar, planlar. Bilgisayarında kalırlar ve bir notu **Paylaş**mazsan oyun yöneticisi onları okumaz. Paylaşılan bir not oyun yöneticisine bir sonraki cevabında senin düşüncen olarak ulaşır, asla gerçek olarak değil. Kuramın yazdığın için doğru olmaz. Bir içeriği durdurmayı ya da kaçınmayı isteyen bir not, masada söylemiş gibi sayılır.

### 3.7 Karakterinin hikâyesi ve görseli

Karakterinin karakter kağıdında, **Açıklama** kartında karakterinin hikâyesini yazacağın bir kutu vardır. Gönder, sen evet dedikten sonra oyun yöneticisi onu kendi sözleriyle karaktere yazar.

Karakterinin görseli için oyun yöneticisine sohbette bir görsel dosyası ver ve bilgisayarında nerede olduğunu söyle (PNG, JPEG, WebP ya da SVG, en fazla 5 MB):

> [İşte karakterimin portresi: C:\Users\me\Pictures\mira.png]

Oyun yöneticisi onu kampanyaya kopyalar ve kontrol panelinde karakterinin jetonunda görünür. İstediğin zaman aynı şekilde değiştirebilirsin.

Ya da bilgisayarının görsel üretebildiği yerde portrenin üretilmesini sağla (bkz. [Görseller](#311-pictures)): karakterini oyun yöneticisine anlat ya da oyun yöneticisinin anlatmasına izin ver.

> [Bana bir portre yap: örgülü gri saçlar, çenede bir yara izi, yorgun gözler.]

Portre, karakterinin oyunda tam olarak ne olduğunu gösterir: onun halkı bu dünyada nasılsa öyle, bir tepe cücesi tepe cücesi olarak, anlattığın görünümle. Bir dakika kadar içinde, karakterinin jetonunda gelir. Yoldaşların da portrelerini aynı şekilde alabilir.

### 3.8 Kayıtlar ve geri dönmek

RPG Engine tüm kampanyayı **her sahnenin sonunda** kendiliğinden kaydeder. Bu kayıtlarla ne yapabileceğin **kayıtlar** ayarına bağlıdır:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **permadeath** | hayır | asla; yalnızca kampanyayı baştan başlatabilirsin |
| **checkpoint** | hayır | son kayda, yalnızca karakterin öldüğünde |
| **free** | evet | herhangi bir kayda, istediğin zaman |

Her kipte **baştan başlayabilirsin**: aynı karakterle oyunun başından ya da yeni bir karakterle sıfırıncı oturumdan.

Bunların hepsini sohbette ("[Düellodan öncesine dönelim.]") ya da kontrol panelinin **Kayıtlar** bölümünde yapabilirsin.

**Geri döndükten sonra yeni bir sohbet aç.** Oynadığın sohbet geri alınanı hatırlar. Oyun yöneticisiyle yeni bir sohbet aç (Claude Code'da `/clear`, Codex'te `/new`), *devam* yaz, sonra Kayıtlar'da **Yeni sohbet açtım**'a bas ya da yeni sohbette oyun yöneticisine söyle. Eski sohbete asla geri dönme. Sen onaylayana kadar oyun yöneticisi devam etmez.

### 3.9 Oturumlar: durmak ve geri dönmek

**Oturumu istediğin zaman bitirirsin:**

> [Bu gece burada bırakalım.]

"Kaydet ve çık" diye bir şey yoktur: her şey zaten dosyalardadır.

**Sohbeti kapatmak için** Claude Code'da `/exit`, Codex'te `/quit` yaz. Kontrol paneli bir sonraki sohbete kadar sessizleşir.

**Geri dönmek için** kampanya klasöründe (`init`'in yazdığı klasör) bir terminal aç, ortamını orada başlat ve *devam* yaz. Oyun yöneticisi oyunun nerede kaldığını okur, sana kısa bir özet verir ve bir şeylerin olmasıyla başlar. Yeni bir sohbet hiçbir şeyi kaybettirmez: kampanya sohbette değil, dosyalarında yaşar.

Oyun yöneticisi sonunda sıradan sorular sormaz. Yalnızca bir şeyin çalışmadığını fark ettiyse kısaca sorar.

### 3.10 Oyun yöneticisinin ruh hâli

Kontrol panelinin üstünde oyun yöneticisinin avatarı, küçük bir robot durur. Yüzü hikâyenin tonunu izler: tehlike büyüyünce endişeli, cesur bir fikre sevinçli, bir sürprize şaşkın. Doğal bir 20 ya da doğal bir 1'e bir an tepki verir. Henüz bilmediğin şeyi asla göstermez: tuzak kurulmadan sırıtmaz. Grubunun jetonları da ruh hâllerini gösterir. Sohbet kapalıyken robot uyur.

### 3.11 Görseller

RPG Engine, ulaştığın her yer, üstlendiğin her görev ve tanıştığın her karakter ya da yaratık türü için, **görseller** ayarının dediği gibi, gördüğün şekilde çizilmiş bir görsel ürettirebilir, istediğinde de karakterinin portresini. Bilgisayarında zaten olanı kullanır:

- **Codex**, ChatGPT girişinle: boyanmış bir görsel.
- Aksi halde **Claude Code**, Claude girişinle: bir çizim.

Görsel bizim değil, senin kendi planını kullanır. **Ayarlar** bölümü sana bilgisayarında görsel üretilip üretilemeyeceğini, üretilemiyorsa kurulum adımlarını söyler. Görseller olmadan sayfa, her yer türünün işaretini gösterir. Oyun yöneticisine herhangi bir yer ya da karakter için kendi görselini de verebilirsin.

### 3.12 Güvenlik: sınırlar, perdeler ve durdur

- **Sınırlar**: oyunda asla yer almayacak şeyler.
- **Perdeler**: olabilecek ama yalnızca sahne dışında olacak şeyler.
- **Durdur**: istediğin her an, açıklama yapmadan bir içeriği durdurabilirsin. Hikâyenin dışında yaz:

> [dur]

Oyun yöneticisi onu hemen bırakır ve sonraki tüm oturumlar için sınırlarına ekler. Sınırlarını ve perdelerini **Ayarlar**'da görebilir ve değiştirebilirsin.

### 3.13 Fikrini değiştirmek

Her ayar kampanya sırasında değişebilir: sohbette ("[Daha zor yapalım.]") ya da **Ayarlar**'da. Oyun yöneticisi değişikliği bir sonraki cevabında öğrenir. Oyun yöneticisinin kitapta olmayan bir konuda verdiği karar **emsal** olur ve saklanır, böylece aynı soru bir dahaki sefer aynı cevabı alır.

---

## 4. Gösterge paneli, bölüm bölüm <!-- icon: party -->

Gösterge paneli, kendi bilgisayarındaki bir sayfadır. Oyun yöneticisi bağlantısını her sohbetin başında verir. Oyunu canlı izler: oyun yöneticisi bir şeyi değiştirdiğinde sayfa da değişir.

Yalnızca oynadığın bilgisayarın tarayıcısı onu açabilir. Aynı Wi-Fi'da bile telefon ya da tablet açamaz. Sayfa dar bir pencereye de uyar: o zaman bölümler alttaki bir çubuğa, simgeler bir menüye taşınır.

Sayfa sohbet kadar yaşar. Sohbeti kapatırsan açık kalan bir sayfa karakter kağıdı olduğu gibi *Not connected* gösterir ve oyun yöneticisinin robotu uyur. Kampanyada yeniden bir sohbet açarsan ve oyun yöneticisi yanıt verdikten sonra sayfa kendiliğinden geri gelir.

### Üstte

- **Oyun yöneticisinin avatarı**, ruh hâliyle.
- Kampanyanın adı, oyun sistemi, **oyun zamanı** ve oyunun **bağlı** olup olmadığı (sohbetin bağlı olması).
- Bölümler: **Grup**, **Sahne**, **Çatışma** (yalnızca bir çatışma sırasında), **Günlük**, **Dünya**. Satırın sonunda simgeler olarak: **Kayıtlar**, **Yardım**, **Ayarlar**, **Hakkında**.
- Açık ve koyu tema, sağ üst köşede.

Oyun yöneticisi sana bir şey sorduğunda, hangi bölümde olursan ol, başlığı sayfanın üstünde kalır.

### Grup

Karakterinin ve yoldaşlarının karakter kağıdı. Karakter kağıdının her bölümü açıp kapatabileceğin bir karttır.

- Eğlence için atmak üzere **bir sayıya tıkla**. Nasıl oluştuğunu görmek için bir sayının üstüne gel ("+5: Bilgelik +3, ustalık +2").
- **Can puanları, yuvalar ve kullanımlar** çubuklar ve noktalar olarak görünür.
- **Durumlar ve etkiler**, ne kadar süreceğiyle birlikte görünür.
- **Açıklama**, karakterinin metnini ve oyun yöneticisine karakterinin hikâyesini göndereceğin kutuyu içerir.
- 0 can puanında **ölüm kurtarma atışları** adın altında büyük görünür.
- Karakter kağıdının yanında (dar ekranda altında): **atışlar**, en yeni en üstte; seninkiler ve oyun yöneticisinin görmene izin verdikleri. **Kaldır** listeyi boşaltır, **Geri getir** onu geri getirir. Serbest atışlar kesik çizgili ve soluk görünür.

Bir kurt gibi istatistik bloğu olan bir yoldaş, tam bir karakter kağıdı yerine istatistik bloğunu gösterir.

### Sahne

Grubunun bulunduğu yer: yerin görseli ve adı, çevresindeki yerler, varsa yerin haritası, orada kimlerin olduğu ve şu anda olanlarla açık sahne. İzlediğin görev en üstte durur.

### Çatışma

Yalnızca bir çatışma sırasında. Üstte: tur, kimin hareket ettiği, sırada kimin olduğu. Altta: sıraların düzeni, her savaşçı durumuyla birlikte, grubun sayılarla ve düşmanlar sözcüklerle; karakterinin elinin altındakiler (zırh sınıfı, can puanları, saldırılar); yerin haritası, hareket eden çevrelenmiş olarak. Sıran geldiğinde, hangi bölümde olursan ol, Çatışma bağlantısı altın renkle atar.

### Günlük

Üç sekme:

- **Görevler**: etkin, tamamlanmış ve başarısız olanlar, her biri hedefleriyle, zamanlayıcı olarak son tarihiyle ve saatleriyle bir kart. Yıldız bir görevi izler.
- **Hikâye**: kampanyanın bölümleri, sahne sahne, en son olan ilk.
- **Notlar**: kendi notların, birini paylaşana kadar özel.

### Dünya

Karakterinin bildiği haliyle dünya haritası, geri kalanın üstünde sisle. Taşımak için sürükle, yakınlaştırmak için tekerleği kullan ya da çimdikle. Bir yerin kartı için ona tıkla. Yerlerin listesi, en yakın olan ilk, yanında durur. Birden fazla harita varsa (bir şehir, bir kıta, başka bir boyut) sekmeler aralarında geçiş yapar.

### Zar tepsisi

Zar düğmesi tepsiyi açar: zarları ve bir değiştirici seç, at. Aynı türden iki ya da daha fazla zarda hangilerinin sayılacağını seç: **Hepsi**, **Yüksek** (yalnızca en yüksek) ya da **Düşük** (yalnızca en düşük). Seçtiğin zarlar **Kaldır**'a basana kadar kalır, böylece aynı hasar atışı her turda tek tıktır. Oyun yöneticisi bir atış isterken tepsi hangi zarların ona yanıt olduğunu söyler.

### Kayıtlar

Kayıtların, en yeni en üstte; her biri yeriyle, oyun tarihiyle ve ne zaman yapıldığıyla. **Şimdi kaydet** (serbest kayıtlarla), **Buraya dön** ve kırmızı olan **Baştan başla**, iki adımda. Bkz. [Kayıtlar ve geri dönmek](#38-saves-and-going-back).

### Ayarlar

Ayarların gruplar halinde: oyun, oyunu öğrenmek (akıl hocası ve sana zaten açıklanmış kurallar), zarlar ve ölçüler, kısıtlamalar (sınırlar ve perdeler), görseller, dil. Seçmek için bir değere tıkla, altında ne anlama geldiği yazar. Sonra yalnızca bu tarayıcıda tutulan sayfanın kendi tercihleri: tema, zarların sesi, **zar seti** (reçine, metal, ahşap, taş), yuvarlak ya da keskin kenarlar, elle atmak.

Oyun yöneticisinin kendi ayarları, örneğin ev kuralları ve emsaller burada değil. Onlar sohbette kalır.

### Yardım ve Hakkında

**Yardım**: bu kılavuz. **Hakkında**: RPG Engine nedir, bağlantıları, lisansları ve oyun sisteminin emeği geçenleri.

### Oyundan önce: Ayarlar ve sıfırıncı oturum

Yeni bir kampanya ilk adımı olan **Ayarlar**'dayken sayfanın tamamı sorularını sorar: her seferinde bir soru, her biri değerlerinin anlamıyla ve önerilenle. **Sen karar ver** bir soruyu oyun yöneticisine bırakır, sınırlar ve perdeler hariç. Onlar her zaman senindir. **Atla** soruyu sonraya bırakır. En sonda **Hazırım**.

### Sayfadan mesajlar

Bazen sayfa üstünde bir bildirim gösterir: kampanyanın dosyalarında bir sorun (oyun yöneticisi düzeltir), oyunun uzakta olması (sohbet kapalı), sayfanın çevrilmesi.

---

## 5. Oyun sistemleri ve ev kuralları <!-- icon: dice -->

### 5.1 Oyun sistemi nedir?

Oyun sistemi, bir oyunun verileridir: karakter kağıdı, sayılar, yaratıklar, eşyalar, büyüler ve kural metinleri. Her kampanya tek bir sistemle oynanır.

RPG Engine, dijital bir karakter kağıdı gibi çalışır. Karakter kağıdını hesaplar. Harcanan ve geri gelen şeyleri de takip eder, örneğin can puanlarını ve büyü yuvalarını. Bir özelliğin ya da büyünün nasıl işlediğini ise oyun yöneticisi kurallardan okuyup karara bağlar, tıpkı gerçek bir masada olduğu gibi.

### 5.2 Beşinci baskı, hazır olarak gelir

RPG Engine, **5e** ile birlikte gelir. Bu, System Reference Document 5.1'e dayanır (2014 kuralları, Creative Commons altında ücretsiz). İçinde şunlar var:

- SRD'deki ırklar, sınıflar, alt sınıflar, bir geçmiş ve bir yetenek;
- SRD'deki 319 büyü, silahlar, zırhlar ve donanımlar, sihirli eşyalar ve canavarlar;
- oyun yöneticisinin tam metniyle aradığı kural bölümleri;
- hesaplanmış, eksiksiz karakter kağıdı: yetenek değiştiricileri, kayıt zarları, beceriler, zırh sınıfı, saldırılar, büyü kayıt zorluk sınıfı, yuvalar, can zarları, seviyeye göre özellikler, deneyim ve seviye atlama;
- doğru şeyleri geri getiren dinlenmeler; kural metniyle birlikte durumlar; konsantrasyon hatırlatmaları.

**SRD dışındaki içerik.** Beşinci baskıyı, SRD'de olmayan içeriklerle de oynayabilirsin. Örneğin sahip olduğun bir kitaptaki sınıfı ya da canavarı kullanabilirsin. Oyun yöneticisi oyunu bilir, kılavuzlarını okuyabilir ve internette arama yapabilir. İhtiyacı olanı kampanyanın sayfaları olarak yazar. RPG Engine de bunlarla aynı şekilde çalışır. Bizim sunduğumuz içerik lisansla sınırlıdır. Oyun yöneticisinin bildikleri ise sınırlı değildir.

RPG Engine yalnızca özgün ya da açık lisanslı içerik sunar. Beşinci baskı için bu, CC BY 4.0 altındaki SRD 5.1'dir. Oyununda görünen diğer her şeyi yapay zekân ya da sen yazarsın. Bunlar bilgisayarındaki kampanyanın sayfaları olarak durur. RPG Engine'in parçası değildir ve biz bunları dağıtmayız.

RPG Engine, beşinci baskıyla uyumludur.

### 5.3 Ev kuralları ve kendi eklemelerin

Hiçbir dosyaya dokunman gerekmez. Oyun yöneticisine söylemen yeter:

> [Ev kuralı: saldırıda doğal 1 gelirse silahını düşürürsün.]
>
> [Blood Hunter oynamak istiyorum. Kitap bende, sınıf özellikleri şunlar.]
>
> [Bu kampanyada kısa dinlenme 10 dakika sürsün.]

Oyun yöneticisi bunları kampanyana şu yollardan biriyle kaydeder:

- **Masanın anlaşması:** Sözle verilen bir karardır, örneğin yukarıdaki düşen silah ya da kısa dinlenme. Oyun yöneticisi bunu kampanyanın ayarlarıyla birlikte tutar ve o andan sonra buna göre oynar. Oyun yöneticisinin kitaba bakmadan verdiği bir karar da aynı şekilde, bir **emsal** olarak tutulur.
- **Yeni bir sayfa:** Örneğin bir sınıf, bir ırk ya da bir eşya. Yeni bir sınıf, sistemdeki sınıflar gibi çalışır: seviyen, can zarların ve özelliklerin onu sayar. Yeni bir ırk, var olan birinin üzerine kurulabilir ("Elf gibi, artı…"). Adı olan bir kılıç da Uzun Kılıç'ın üzerine kurulabilir.
- **Karakter kağıdı için yeni sayılar:** Bir alan, bir tablo, bir formül ya da dinlenmenin geri getirdiği bir sayaç. Örneğin bir Battle Master'ın kısa dinlenmede geri gelen üstünlük zarları. Bir ev kuralı, sistemin formüllerinden birinin yerine de geçebilir.

Önceden yazılmış ev kuralların varsa, bunları kampanyanın `rules` klasörüne metin dosyası olarak da koyabilirsin ([kampanya klasörü](#8-for-the-curious-the-campaign-folder) bölümüne bak). Oyun yöneticisi bunları, kitaptaki aynı adlı kuraldan önce okur.

### 5.4 Kendi oyun sistemini eklemek ya da içe aktarmak

RPG Engine şu an yalnızca beşinci baskıyı oynatır. Başka oyun sistemleri de gelecek. Kendi sistemini eklemenin ya da sahip olduğun bir oyunu kılavuzlarından bir sisteme çevirmenin bir yolu da gelecek. Bkz. [Daha sonra gelecekler](#9-coming-later).

---

## 6. Uzantılar <!-- icon: plus -->

**Uzantılar henüz mevcut değil.** Bir uzantı, bir kampanyaya oyun sisteminin üstüne bir şey ekler: bir dünya, bir macera, hava durumu ya da tarot destesi gibi bir özellik, paylaşılacak ev kuralları. Her kampanyanın hangilerini kullanacağını sen seçeceksin. Beşinci sürüm için planlanan ilk uzantılar hava durumu ve kilit açma.

---

## 7. Bir kampanya nereden gelir ve dili <!-- icon: world -->

### 7.1 Dünya edinmenin üç yolu

**Anında yapılan.** Kurulumda bir temel fikir verirsin ve oyun yöneticisi dünyayı ilerledikçe kurar: her yeri, kişiyi ve olay örgüsünü tam ihtiyacın olmadan önce, ve o andan sonra saklanır. Oynamanın en hızlı yolu budur: kur, oluştur ve birkaç dakika içinde karakterini yaratıyorsun. Uydurulan hiçbir şey kaybolmaz: söylendi mi yazılır ve doğru kalır.

**Başta hazırlanan.** Aynı temel fikir, ama **hazırlık: all at the start** ile. Oyun yöneticisi oyun başlamadan önce dünyanın yerlerini, hizip­lerini, tehditlerini ve planlarını kurar. İlk oturum daha geç başlar, ama perde arkasında daha fazlası hazırdır.

**Var olan bir kampanyadan ya da maceradan.** Bugün içe aktarma düğmesi yok. Oyun yöneticisine macerani ver (yapay zekâ ortamının okuyabileceği bir metin ya da PDF) ve kurmasını iste:

> [Bu maceraya PDF olarak sahibim. Bunu kampanyamız olarak kur: oku, yerlerini, karakterlerini ve sırlarını yaz. İçindeki hiçbir şeyi bana söyleme.]

Oyun yöneticisi bunu yapay zekâ ortamının araçlarıyla okur ve sırlar dahil kampanyanın sayfaları olarak yazar. Sırları oyunda keşfedeceksin. Claude Code PDF okur. Codex ile bir metin ya da markdown dosyası daha güvenli bir seçimdir. Bunu kurulum sırasında, sıfırıncı oturumdan önce yap.

Oyun yöneticisi çalışırken okuduğunun ya da yazdığının ayrıntılarını açma (Claude Code'da ctrl+o). Macera metnini, sırlarıyla birlikte gösterirler. Oyun yöneticisinin kendisi sırları, her zamanki gibi, saklar.

Kampanyanın kendi sayfaları olur olmaz kurulum temel fikir ve hazırlık sormayı bırakır. Yazılı bir kampanyada bile, metnin kapsamadığı bir yere gittiğinde oyun yöneticisi gerekeni yaratır ve kaydeder.

**Bir kampanya bir kez oynanır.** Aynı macerayı yeniden oynamak için yeni bir kampanya oluştur. Bir kampanya içinde, kayıtlar ayarının izin verdiği ölçüde yine de bir kayda dönebilir ya da baştan başlayabilirsin.

### 7.2 Diller

**Kampanya başına tek dil**: oyun yöneticisininki. Oyun yöneticisi o dilde yazar ve gösterge paneli onu izler. Oyun yöneticisi dili nasıl yazdığından alır ve onaylar.

**Gösterge paneli** İngilizce ve İtalyanca (özenle hazırlanmış) ve 24 dille daha gelir: Fransızca, Almanca, İspanyolca, Portekizce (Brezilya), Felemenkçe, İsveççe, Norveççe, Danca, Fince, İzlandaca, Rusça, Ukraynaca, Lehçe, Çekçe, Rumence, Macarca, Yunanca, Türkçe, Arapça, İbranice, Hintçe, Çince, Japonca, Korece. Arapça ve İbranice sağdan sola okunur: sayfa aynalanır, haritalar ve zarlar çizildiği gibi kalır.

**Ayarlar'da seçtiğin başka herhangi bir dil**, bilgisayarında, arka planda, Codex ya da Claude Code tarafından kendi girişinle çevrilir, açık olan bölümden başlayarak. Her dil için bir kez yapılır ve tüm kampanyaların için geçerlidir. Hazır olana kadar sayfa İngilizcedir. Ayarlar sana çevirinin sürüp sürmediğini, hazır olup olmadığını ya da bilgisayarında mümkün olup olmadığını söyler.

**Oyunun sözcükleri.** Beşinci sürüm kendi terimlerini resmî İtalyanca SRD'den İtalyanca getirir. Böylece İtalyan oyuncular *Classe Armatura*, *tiro salvezza*, *vantaggio* okur. Diğer dillere sistemin terimleri çevrilerek verilir.

**Oyun sisteminin kendi metni** (büyüler, canavarlar, kural bölümleri) İngilizce kalır. Oyun yöneticisi onu okur ve sana kendi dilinde anlatır.

**Kampanya ortasında dil değiştirmek**, yazılmış sayfaları olduğu gibi bırakır. Oyun yöneticisi yenilerini yeni dilde yazar.

---

## 8. Meraklısına: kampanya klasörü <!-- icon: list -->

Hiçbir zaman açman gerekmez. Açarsan **kampanyanın sırlarını içerdiğini** bil: okumak oyunu bozar.

Bir kampanya klasörünün içinde şunlar var:

- `campaign.yaml`: ayarların;
- `state.yaml`: oyunun şimdi nerede olduğu: aşaması, tarih, açık sahne;
- `world/`: her karakter, yer, hizip, görev, eşya, olay, konu ya da yaratık için markdown dosyası olarak bir sayfa;
- `rules/`: eklersen ev kuralların metin dosyaları olarak (`init` bunu oluşturmaz);
- `images/`: görseller, varsa;
- `log.jsonl`: her değişiklik, sırayla;
- `.saves/`: kayıtlar, ilkinden başlayarak;
- `.player/`: Günlük'teki kendi notların, oyun yöneticisi bunları okumaz;
- `sessions/`: RPG Engine tarafından tutulur;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: yapay zekâ ortamlarına RPG Engine'in nerede olduğunu söyleyen ve hafızalarını kapalı tutan küçük dosyalar. RPG Engine bunları güncel tutar. Olduğu gibi bırak.

Sayfalar, `[[Rocca]]` gibi bağlantılarla düz markdowndır, Obsidian'ın biçimi. Oyun yöneticisinin defteri orada açılabilir. **Bir sayfayı elle değiştirirsen** oyun yöneticisi neyin değiştiğini bir sonraki yanıtında öğrenir.

**Komut satırı.** Oyun yöneticisinin yaptığı her şey, senin de kampanya klasöründe çalıştırabileceğin komutlardan geçer. Oynamak için onlara hiç ihtiyacın yok, ve çoğu, `rpg status` ve `rpg show` gibi, kampanyanın sırlarını yazdırır. `rpg --help` hepsini listeler, `rpg roll --help` birini açıklar. Bir sohbet açıkken bir şeyi değiştiren komut sorun değil: oyun yöneticisi, elle değiştirilen bir sayfada olduğu gibi, bir sonraki yanıtında öğrenir.

---

## 9. Daha sonra gelecekler <!-- icon: hourglass -->

Planlanan ama henüz olmayanlar:

- **Oyun yöneticisi olarak sen**: oyunu sen yönetirsin, yapay zekâ grubu oynar.
- **Masada birkaç kişi**, her biri kendi rolüyle.
- **Uzantılar**: ayarlar, maceralar, özellikler ve ev kuralları, kampanya başına seçilir.
- Kılavuzlarını ve maceralarını **içe aktarma**.
- **Başka oyunlar**: daha fazla oyun sistemi ve kendi sistemin.
- **Yazar modu**: yapay zekâyla bir kampanya ya da macera yap ve başkaları oynasın diye paylaş.

---

## 10. Sorular ve sorunlar <!-- icon: info -->

### Sorular

**Kuralları bilmem gerekir mi?** Hayır. Tutorial akıl hocasını seç, oyun yöneticisi sana ilerledikçe, her seferinde tek bir kuralı öğretir. Her zaman parantez içinde sorabilirsin.

**Oyun yöneticisi hile yapabilir mi?** RPG Engine'in yaptığı bir atışı değiştiremez, story zorluğu hariç, ve zaten belirlenmiş gerçekleri asla değiştirmez. Herhangi bir atışın gerçek olup olmadığını sorabilirsin.

**Ben hile yapabilir miyim?** Deneyebilirsin. Oyun yöneticisi gerçekler konusunda sözüne güvenmez: mesajındaki bir oyun mesajına benzeyen satır yine yalnızca senin sözlerindir ve oyun yöneticisi sırlar hakkındaki tahminlerini asla doğrulamaz.

**Bir maliyeti var mı?** RPG Engine ücretsizdir. Oyun yöneticisi kendi Claude ya da ChatGPT planında çalışır ve bir akşamlık oyun uzun bir sohbettir: en küçük planlarda akşam bitmeden planın sınırına ulaşabilirsin. Görseller ve çeviriler aynı planı kullanır.

**Telefonumda oynayabilir miyim?** Hayır. Oyun yöneticisi bilgisayarında çalışır ve gösterge paneli yalnızca o bilgisayarın tarayıcısında açılır.

**Arkadaşlarımla oynayabilir miyim?** Henüz değil: bugün tek oyuncu, tek karakter, artı yoldaşlar. Masada birkaç kişi rollerle gelecek.

**Bir dahaki sefere farklı bir yapay zekâ kullanabilir miyim?** Evet. Kampanya dosyalarında yaşar: onu başka bir ortamda aç ve *devam* yaz.

**Tarayıcıyı kapatırsam ne olur?** Hiçbir şey kaybolmaz. Sohbet açıkken bağlantıyı yeniden aç, sayfa oyunun olduğu yerde geri gelir.

**Sahip olduğum D&D içeriğiyle oynayabilir miyim?** Evet. Oyun yöneticisi kitaplarını, kendi bilgisini ve web'i kullanabilir. RPG Engine'in sunduğu ücretsiz içerikle sınırlıdır. Oyununun kullandığı sana kalmış.

### Sorunlar

**Gösterge paneli açılmıyor.** Oyun yöneticisinden bağlantıyı iste: `[Gösterge panelinin bağlantısı ne?]`. Sayfa yalnızca o kampanyada oyun yöneticisiyle bir sohbet açıkken ve yalnızca oyun yöneticisinin o sohbetteki ilk yanıtından sonra çalışır. Sohbet kapalıyken tarayıcı sayfaya ulaşamaz. Açık kalan bir sayfa *Not connected* der.

**Oyun yöneticisi oyunu bilmiyor gibi ya da olmayan araçlar uyduruyor.** Yapay zekâ ortamın RPG Engine'i yüklemedi.

- Önce ortamı **kampanya klasöründe** başlattığını ve ona güvendiğini söylediğini kontrol et.
- **Claude Code**: `/mcp` yaz. `rpg` oradaysa ama başarısız olduysa onu seç, sonra **Reconnect**'i seç. Yoksa Claude Code'u kapat, kampanya klasöründe `claude mcp reset-project-choices` yaz ve yeniden başlat.
- **Codex**: kampanya klasöründe bir terminalde `codex mcp list` yaz. `rpg` yoksa Codex klasöre güvenmiyor demektir: onu orada yeniden başlat ve sorduğunda evet de.
- İkisinde de: terminalde `rpg --version` komutun bulunamadığını söylüyorsa RPG Engine'i yeniden kur ([2.2](#22-install)) ve yeni bir terminal aç.

**Güncellemeden sonra hiçbir şey değişmedi.** Çalışan bir oyun yöneticisi başladığı sürümü korur. Yeni bir sohbet aç ya da Claude Code'da sunucuyu yeniden bağla (`/mcp`, sonra `rpg`, sonra **Reconnect**).

**Oyun yöneticisi geri aldığım bir şeyi hatırlıyor.** Bir kayda döndün ama aynı sohbette oynamaya devam ettin. Yeni bir sohbet aç ve Kayıtlar'da **Yeni sohbet açtım**'a bas.

**Oyun yöneticisi sayfada zaten yanıtladığım kurulum sorularını soruyor.** Ona söyle: `[Onları gösterge panelinde seçtim.]`

**Hiç görsel çıkmıyor.** Ayarlar > Görseller'i aç: bu bilgisayarın görsel yapıp yapamadığını ve yapamıyorsa adımları söyler, her komut kopyalamak için bir düğmeyle.

**Sayfa İngilizce ama başka bir dil seçtim.** Arka planda çevriliyor. Ayarlar nasıl gittiğini söyler. Bu bilgisayarda Codex ya da Claude Code yoksa İngilizce kalır.

**Oyun yöneticisi kampanyada sorunlar olduğunu söylüyor.** Onları kendisi düzeltir. Dosyaları elle düzenlediysen ne demek istediğini sana sorabilir.

**Windows: `npm` klasörümde başarısız oluyor.** Kampanyayı ya da RPG Engine'i `&` içeren bir yolun altında tutma.

**Kurulum başarısız oluyor ya da `rpg` başlamıyor.** Node.js sürümünü `node --version` ile kontrol et: 22 ya da daha yeni olmalı. Daha eskiyse [nodejs.org](https://nodejs.org) adresinden LTS sürümünü kur, sonra RPG Engine'i yeniden kur.

**Gösterge paneli bağlantısı değişti.** Başka bir program kampanyanın olağan adresini kullanıyordu ya da Windows onu ayırmıştı. RPG Engine başka bir adres aldı. Oyun yöneticisi sana yeni bağlantıyı verir. Başka hiçbir şey değişmez.
