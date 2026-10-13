<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 8b2b048d 7705224a 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
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

- Windows, macOS veya Linux kullanan bir bilgisayar.
- **Node.js 22** veya daha yenisi. [nodejs.org](https://nodejs.org) adresinden indir: "LTS" sürümü yeterli. Yanında `npm` gelir. RPG Engine'i o kurar.
- Bir **terminal**: komut yazdığın pencere. Windows'ta Terminal uygulaması veya PowerShell, macOS'ta Terminal. Terminali RPG Engine'i kurmak, her kampanyayı oluşturmak ve Claude Code ya da Codex'i başlatmak için kullanırsın.
- Bir **yapay zekâ ortamı**: oyun yöneticisinin çalıştığı uygulama. **Claude Code** veya **Codex**, kendi planı ve girişiyle. Bkz. [2.4](#24-connect-your-ai).
- Ortamının sunduğu **en büyük model**. Küçük bir model kolay kandırılır: testlerimizde, kendini gerçek oyun yöneticisi olarak tanıtan bir oyuncuya sırları söyledi.
- Gösterge paneli için bir web tarayıcısı.

Ortamın için kullandığın giriş bundan fazlasını yapar. RPG Engine onu kendi bilgisayarında kullanır: yerlerin, görevlerin ve karakterinin görsellerini çizmek, ayrıca gösterge panelini kendisiyle gelmeyen dillere çevirmek için. Bkz. [Görseller](#311-pictures) ve [Diller](#72-languages).

**Terminali bir klasörde açmak.** Birçok adımda "kampanya klasöründe" denir. Windows'ta Dosya Gezgini'nde klasöre sağ tıkla ve **Terminalde aç**'ı seç. macOS'ta Finder'da klasöre sağ tıkla ve **Servisler > Klasörde Yeni Terminal**'i seç. Ya da zaten açık bir terminalde `cd` yaz, ardından klasörün yolunu ekle, örneğin `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Kurulum

Bir terminal aç ve şunu yaz:

```text
npm install -g rpg-engine
```

Bu sana `rpg` komutunu verir. Çalıştığını kontrol etmek için:

```text
rpg --version
```

`rpg` komutunu kampanya başına bir kez, kampanyayı oluşturmak için kullanırsın. Sonrasında yalnızca oyun yöneticisiyle konuşursun: yapay zekâ ortamın RPG Engine'i aynı `rpg` komutuyla kendi başına başlatır.

### 2.3 Kampanya oluşturma

Kampanya bir klasördür. Oyunlarını tuttuğun klasörde bir terminal aç ve şunu yaz:

```text
rpg init "The Salt Isles"
```

Bu komut `The Salt Isles` adlı klasörü ve içinde yeni bir kampanya oluşturur, sonra sana ne yapacağını söyler:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

*For the master* satırından sonrası oyun yöneticisi içindir. Onları sohbette o okur, senin yapacağın bir şey yok. Klasörün nerede olduğunu aklında tut: her oynayışta oraya dönersin. Klasör adı vermezsen `rpg init`, içinde bulunduğun klasörü kampanyaya çevirir.

`init`, kampanyanın ihtiyaç duyduğu her şeyi hazırlar: ayarlarını, dünya klasörlerini ve yapay zekâ ortamına RPG Engine'i kullanmasını, kampanya dışında kendi belleğini tutmamasını söyleyen küçük dosyaları.

Şimdi bir şey seçmen gerekmez. Gerisini oyun yöneticisi sohbette sorar, ya da gösterge panelinden seçersin. Bazı seçimleri şimdiden biliyorsan buraya yazabilirsin:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Bu komut `salt-isles` klasörünü ve içinde *The Salt Isles* kampanyasını oluşturur: klasör adı boşluksuz, kampanya adı istediğin gibi.

| Seçenek | Neyi belirler | Değerler |
|---|---|---|
| `--name` | Kampanyanın adı | herhangi biri; yazmazsan klasörün adı |
| `--language` | Oyunun dili | bir kod, örneğin `en`, `it`, `fr` |
| `--system` | Oyun sistemi | `5e`, şimdilik tek seçenek |
| `--difficulty` | Dünyanın ne kadar zor olduğu | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Çatışmada düşmenin ne demek olduğu | `narrative`, `epic`, `dice` |

`rpg init --help` da bunları listeler. Bir kampanya, başka bir kampanyanın klasörünün içinde olamaz.

Oyun yöneticisinden kampanya oluşturmasını isteyemezsin: `init` çalışmadan önce klasörde, yapay zekâ ortamına RPG Engine'in nerede olduğunu söyleyen hiçbir şey yoktur.

### 2.4 Yapay zekânı bağla

RPG Engine, **Claude Code** ve **Codex** ile çalışır. MCP araçlarını kullanan başka yapay zekâ uygulamaları da çalışabilir, ama bunun garantisini vermiyoruz.

**Ortamını kurmak.** Claude Code ve Codex terminalde çalışır: telefonundaki Claude veya ChatGPT uygulaması değildir. İkisinin de kendi planı ve girişi gerekir: Claude Code için ücretli bir Claude planı, Codex için bir ChatGPT girişi. Kurmak ve giriş yapmak için kendi sayfalarını izle: [Claude Code](https://code.claude.com/docs/en/setup) ve [Codex](https://learn.chatgpt.com/docs/codex/cli). Bunu tüm kampanyaların için bir kez yaparsın.

**Claude Code.** Kampanya klasöründe bir terminal aç ve `claude` yaz. İlk seferde klasöre güenip güvenmediğini sorar ve klasörün oyunun araçlarına (`mcp__rpg`) izin verdiğini söyler: **Yes, I trust this folder**'ı seç. Dikkat: önceden seçili gelen yanıt *No, exit*'tir, bu yüzden hemen Enter'a basarsan Claude Code kapanır. Gerisi bu kadar: kampanya Claude Code'a RPG Engine'i ve araçlarını kullanmasını, belleğini kapalı tutmasını zaten söyledi.

**Codex.** Kampanya klasöründe bir terminal aç ve `codex` yaz. Klasöre güvenip güvenmediğini sorduğunda evet de: kampanyanın kendi ayarları Codex'e RPG Engine'in nerede olduğunu söyler, araçlarına izin verir ve belleğini kapalı tutar. Codex bu ayarları yalnızca güvendiğin bir klasörde okur. Masaüstü uygulamasında, oyunun sohbetleri için anıların kapalı olduğunu kontrol et.

**Bellek neden önemli.** Kampanya dosyalarında yaşar. Ortam kendi başına da bir şeyler hatırlarsa, bir kayda dönmek gerçekten geri dönmek olmaz: oyun yöneticisi geri alınanı yine hatırlar.

### 2.5 İlk sohbet

Herhangi bir şey yaz, örneğin:

> Selam! Başlayalım.

Oyun yöneticisi oyunun nerede olduğunu okur ve yanıt verir. Her sohbetteki ilk yanıtında sana **gösterge panelinin bağlantısını** verir (şuna benzer bir şey: `http://127.0.0.1:4750`). Tarayıcında aç ve tüm oyun boyunca sohbetin yanında tut. Her kampanya, bir sohbetten ötekine aynı bağlantıyı korur. Başka bir program onu almışsa oyun yöneticisi sana yenisini verir.

Oyun yöneticisinin mesajlarının arasında ortamın, oyun yöneticisinin kullandığı araçları kısa satırlar halinde gösterir. Ayrıntılarını açma (Claude Code'da ctrl+o): oyun yöneticisinin yazdıklarını, sırlar dahil, gösterebilirler.

Yeni bir kampanya, insan yöneticili bir oyun gibi üç aşamadan geçer. Gösterge paneli bunları en üstte *1 Ayarlar · 2 Sıfırıncı oturum · 3 Oyun* olarak gösterir:

1. **Ayarlar**: nasıl oynamak istediğini seçersin. Hikâyenin dışında.
2. **Sıfırıncı oturum**: karakterini oyunun içinde yaratırsın.
3. **Oyun**: hikâye.

### 2.6 Ayarlar: nasıl oynayacağını seçmek

Oyun yöneticisi yalnızca eksik kalanı sorar, bir seferde birkaç soru. "Sen karar ver" yazarsan oyun yöneticisi seçer ve ne seçtiğini söyler. Gösterge paneli açıksa ilk adımı **Ayarlar**, aynı soruları kartlar halinde gösterir: her seferinde tek soru, her değer anlamıyla birlikte, olağan olan **Önerilen** diye işaretli. Seçimini orada yap, oyun yöneticisi sohbette tekrar sormaz. **Atla** bir soruyu sonraya bırakır. Yalnızca sözle çözülenleri sohbet halleder: yeni bir dünyanın temel fikri, dil ve görseller. Görselleri oyun yöneticisi ancak bilgisayarın üretebiliyorsa sorar. Sayfanın aşağıdaki tablodan daha az soru sormasının nedeni budur.

Tabloyu ezberlemen gerekmez: bakıp bulman için burada. Bunların hepsini sonradan sohbette veya gösterge panelinin **Ayarlar** bölümünde değiştirebilirsin. Değişiklik, oyun yöneticisinin bir sonraki yanıtından itibaren geçerli olur.

| Ayar | Neyi belirler | Değerler | Önerilen |
|---|---|---|---|
| **Akıl hocası** ("Bu oyunu ne kadar iyi biliyorsun?" diye sorulur) | Oyun yöneticisinin sana kuralları, hikâyenin dışında ne kadar öğrettiği | **kapalı** (yalnızca hikâye; istediğinde köşeli parantez içinde sor), **ipuçları** (önemli seçimlerden önce kısa bir ipucu ve bir kural gözden kaçtığında), **eğitim** (her kural ilk seferinde açıklanır, her atışın toplamı eksiksiz gösterilir, çatışmalardan sonra kısa bir değerlendirme yapılır) | cevabına göre: hiç oynamadım → eğitim, biraz → ipuçları, biliyorum → kapalı |
| **Zorluk** | Dünyanın ne kadar zor olduğu: çatışmalar, düşman taktikleri, ipuçları, hazine, tehditlerin ilerleme hızı | hikâye, kolay, normal, zor, acımasız | |
| **Ölümcüllük** | Çatışmada düşmenin ne demek olduğu | **anlatısal** (karakterin asla ölmez), **destansı** (yalnızca hikâye için önemliyse ölür), **zar** (zarlar karar verir) | zorluğu izler: hikâye → anlatısal, kolay → destansı, normal ve üstü → zar |
| **Kayıtlar** | Ne zaman geri dönebileceğin | **kalıcı ölüm** (asla; yalnızca kampanyayı baştan başlatırsın), **kontrol noktası** (son sahne sonuna, yalnızca karakterin ölürse), **serbest** (herhangi bir kayda döner, istediğin zaman kaydedersin) | kontrol noktası |
| **Kural sıkılığı** | Yiyecek, ışık, yorgunluk, taşıma ağırlığı, büyü bileşenleri ve yolculuğun kurallara ne kadar sıkı uyduğu | **akıcı** (oyun yöneticisi bunları geçiştirir), **kurallar** (yazıldığı gibi: meşaleler söner, erzak biter), **simülasyon** (kuralların ötesinde: aşınma, bozulma, hava durumu) | akıcı |
| **Zarlar** | Karakterinin zarlarını kimin attığı | **dijital** (RPG Engine sayfada atar), **fiziksel** (kendi zarlarını sen atar, yüzleri söylersin) | |
| **Birimler** | Hikâyedeki mesafe ve ağırlıklar | metrik, imperyal | |
| **Yoldaşlar** | Seninle kimin yolculuk ettiği | yok, sıfırıncı oturumda seninle yaratılanlar, oyun yöneticisinin yarattıkları, oyun içinde tanışılanlar | |
| **Görseller** | Yerlerin ve görevlerin görselleri, istediğinde karakterinin portresi | yok, istek üzerine, yeni yerler ve görevler | bir kez sorulur, yalnızca bilgisayarın üretebiliyorsa |
| **Sınırlar** | Oyunda asla yer almayacak şeyler | bir liste veya yok | |
| **Perdeler** | Olabilecek ama yalnızca ekran dışında olacak şeyler | bir liste veya yok | |
| **Dil** | Oyunun ve gösterge panelinin dili | herhangi biri | yazış biçiminden alınır ve onaylanır |

Oyun sistemi kendi ayarlarını ekleyebilir. Beşinci sürüm **ilerleme** ekler: karakterinin seviye atlaması, **deneyim puanlarıyla** veya hikâyenin **kilometre taşlarında**.

**Zorluğun oyunda anlamı.** Hikâye: zayıf, saf düşmanlar, bariz ipuçları, her şeyden bol. Oyun yöneticisi kendi atışlarını yumuşatabilir. Kolay: basit düşmanlar, cömert kaynaklar. Normal: mantıklı düşmanlar, her sonuca üç ipucu, standart fiyatlar ve hazine. Zor: zeki düşmanlar, ince ipuçları, kıt kaynaklar, hızlı ilerleyen tehditler. Acımasız: pusu kuran, geri çekilen ve yaralıları bitiren düşmanlar, çok kıt kaynaklar, en sert dinlenmeler. Çatışmalar her zaman grubunun o anki gücüne göre ayarlanır.

**Yazılı bir dünya yoksa** kurulum iki şey daha sorar:

- **Temel fikir**: türü, tonu ve dünyanın birkaç öğesi, senin sözlerinle. Örneğin: *"Düşük fantezi, kasvetli ama umutlu. Nehir kenarında bir kasaba, perili bir geçit, tepelerde bir tarikat."*
- **Hazırlık**: **anında** (oyun yöneticisi dünyanın her parçasını tam ihtiyacın olmadan önce kurar; önerilen) veya **baştan hepsi**.

Ardından oyun yöneticisi kampanya için bir ad önerir. Eksik bir şey kalmayıp hazır olduğunu söylediğinde oyun sıfırıncı oturuma geçer.

### 2.7 Sıfırıncı oturum: karakterin

Sıfırıncı oturum oyunun kendisidir: karakterini oyun yöneticisiyle birlikte, bir masada olduğu gibi yaratırsın.

- **Her seçim senindir**, oyun yöneticisinden onu yapmasını istemediğin sürece. Eksiksiz bir fikirle gelebilirsin ("tapınağını terk etmiş yarı elf bir rahip"), belirsiz bir fikirle ("iyileştiren ama pek de tatlı olmayan biri") ya da hiçbir şeyle ("beni şaşırt, sonra değiştirmeme izin ver").
- **Yetenek puanları.** Oyun yöneticisi, herhangi bir zar atılmadan önce sana yöntemi ve güvenlik ağını söyler. Beşinci sürümde: standart dizi, puan satın alma veya 4d6'dan en düşüğü atmak. Üzerinde anlaştığın yöntem masanın anlaşmalarında kalır.
- **Hikâyen** hiçbir zaman zorunlu değildir. Bir hikâye verirsen oyun yöneticisi onu senin sözlerinle yazar, sana bir kez okur ve içindeki kişileri ve yerleri dünyaya bağlar. Onu gösterge panelinde de yazabilirsin (bkz. [Grup](#party)).
- **Kişilik** (beşinci sürüm): bir özellik, bir ideal, bir bağ ve bir kusur; geçmişinin tablolarından veya kendi seçtiklerinden.
- **Bir görsel.** Karakterin hazır olunca oyun yöneticisi senden onun için bir görsel ister: bilgisayarındaki bir dosya ya da onu nasıl tarif ettiğine göre bilgisayarında üretilen bir portre (bkz. [karakterinin görseli](#37-your-characters-story-and-picture)).

Karakter kağıdının sayılarını RPG Engine senin seçimlerinden hesaplar: hesap yapmak zorunda kalmazsın. Karakterler hazır olup onayladığında hikâye başlar.

---

## 3. Oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterinin ne yaptığını veya ne söylediğini kendi sözlerinle yaz. Kısa olması sorun değil.

> Han sahibine bu gece kimlerin uğradığını soruyorum.
>
> "Dert çıkarmaya gelmedik," diyorum, elimi kılıcımdan uzak tutarak.
>
> Çatıya tırmanıp bekliyorum.

**Hikâyenin dışında** köşeli parantez arasında yaz:

> [Yakalama nasıl işliyor?]
>
> [Bu turda hâlâ tepkimi kullanabilir miyim?]
>
> [Bu gece burada bırakalım.]

Oyun yöneticisi de köşeli parantezle yanıt verir, sonra hikâyeye döner.

**Sen neyi denediğini söylersin, olanı oyun yöneticisi söyler.** Dünyanın mantığını veya belirlenmiş olguları bozan bir şey gerçekleşmez: oyun yöneticisi bunu sana hikâyenin içinde söyler ve mümkün olanı sunar.

**Oyun yöneticisi karakterin yerine asla karar vermez.** Seni konuşturmaz, hissettirmez, seçtirmez. Emin olamadığında sorar.

**Oyun yöneticisi motordan asla söz etmez.** Bir şeyleri takip edip etmediğini sorarsan bir oyun yöneticisi gibi yanıtlar: "Hepsi bende: bir sonraki sefer buradan devam ederiz."

**Oyun yöneticisine gösterge panelini nasıl kullanacağını sorabilirsin.** Sayfayı bilir: "Büyülerimi nerede görürüm?", "Elle nasıl atış yaparım?"

### 3.2 Atışlar

**Atış ne zaman olur.** Oyun yöneticisi atışı yalnızca sonuç belirsiz ve önemliyse ister. Aksi hâlde evet der ya da "evet, ama" der. Atışından önce oyun yöneticisi neyin tehlikede olduğunu ve hangi kontrollerin uygun olduğunu söyler, sonra durur. Sen atarsın ya da fikrini değiştirirsin:

> **Oyun yöneticisi:** Çıkıntı dar ve ıslak. Kayarsan nehre uzun bir düşüş var. Bir Çeviklik (Akrobasi) kontrolü yap, ya da geri dönüp merdivenleri arayabilirsin.
>
> **Sen:** Deneyeceğim.

**Gösterge panelinde atmak.** Oyun yöneticisi istediğinde sayfanın üstünde, her kontrol için bir düğme içeren bir şerit belirir, örneğin *Akrobasi +4 · vantaggio ile*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Ayrıca şunları yapabilirsin:

- karakter kağıdında ilgili satıra tıkla, altın rengi parlar;
- zar tepsisinden doğru zarları at;
- başka bir şey yapmak istiyorsan şeride kendi sözlerini yaz.

**Elle atmak.** Zarları kendin seçmeyi tercih edersen şeridin köşesindeki **Elle**'yi aç (veya **Ayarlar**'dan). Kontrolün düğmesi kalkar ve şerit neyi atacağını bir oyun yöneticisi gibi söyler: *Akrobasi'yi kendin at, karakter kağıdında ya da zarlarla.* Karakter kağıdında parlayan satıra tıkla ya da zar tepsisinden doğru zarları at: RPG Engine onları atar, bonusunu ekler ve oyun yöneticisi sonucu duyar. Ne karakter kağıdının ne de zar tepsisinin yapabildiği bir kontrol, örneğin 1'leri yeniden atılan hasar, düğmesini korur. Elle, sen kapatana kadar bu tarayıcıda açık kalır.

**Tüm oyun için fiziksel zarlar.** **Zarlar** ayarı fiziksel olduğunda oyun yöneticisi atışlarını sözle ister, sen de attığın yüzleri yazarsın:

> [14 attım.]

RPG Engine değiştiricilerini ekler ve zarlarının gösteremeyeceği bir yüzü reddeder.

**Serbest atışlar.** Sırf eğlence için atmak üzere karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Serbest atışlar hiçbir şeye sayılmaz, kaydedilmez ve oyun yöneticisi onları asla görmez. Serbest bir 20, sonradan gerçek bir 20'ye dönüşmez.

**Oyun yöneticisinin atışları.** Oyun yöneticisi düşmanlar ve diğerleri için de RPG Engine ile atar. Çoğu atış atış sütununda gösterilir. Sonucu görmemen gerektiğinde oyun yöneticisi gizlice atar. Her zaman sorabilirsin:

> [O atış gerçek miydi?]

Gösterilen bir atış için oyun yöneticisi sayılarını ve gerekçesini verir. Gizli bir atış için, atışın sen sormadan önce yapıldığını kanıtlayan bir parmak izi verir.

**Sohbetteki atışlar** karar verdikleri anın hemen ardından köşeli parantez içinde görünür: *[İkna 14 + 3 = 17]*. Sonra hikâye sonucu anlatır.

### 3.3 Sahneler ve çatışmalar

Oyun yöneticisi hikâyeyi **sahneler** halinde yürütür: bir çatışma, bir konuşma, keşif, yolculuk, bir dinlenme, bir sınav (kovalamaca, yarış, bulmaca). Onları yönetmek zorunda değilsin: RPG Engine hikâyenin bölümlerini böyle tutar. Her sahnenin sonunda oyun kendiliğinden kaydeder ve sahne günlüğünün hikâyesine girer.

**Bir çatışmada** oyun yöneticisi, senin olmayan tüm sıraları her atışıyla birlikte art arda anlatır ve **karar verebileceğin yerde durur**: senin sıran, bir tepki, bir seçim. Sıran geldiğinde ne yaptığını söyle:

> Kapıdaki olana Sacred Flame yapıyorum.

Gösterge panelinin **Çatışma** bölümü sıraların düzenini, sıranın kimde olduğunu, grubunun can puanlarını ve düşmanların ne kadar yaralı göründüğünü gösterir (sağlam, yaralı, kanlar içinde, yere serilmiş: sayıyla değil, sözle). Karakterin düşerse ölüm kurtarma atışları sayfada büyük görünür.

**Çatışmanın sonucu belli olduğunda** oyun yöneticisi geri kalanını tek mesajda anlatmayı önerebilir.

### 3.4 Zaman, yolculuk ve hareket eden dünya

**Zaman.** Hikâyede her eylem zaman alır ve RPG Engine tarihi tutar: 3. gün, sabahın erken saatleri. Oyun yöneticisi zamanı dünyanın ölçtüğü gibi söyler: şafak, üçüncü çan, akşam çökerken. Oturumlar arasında zaman geçmez: kaldığın yerden devam edersin.

**Dinlenmeler.** Dinlendiğini söyle, oyun yöneticisi bir dinlenmenin geri getirdiklerini, örneğin can puanlarını ve büyü yuvalarını uygular:

> Kamp kuruyoruz ve uzun dinlenme yapıyoruz.

**Yolculuk.** Nereye gitmek istediğini söyle:

> Kuzeye, Rocca'ya giden yola çıkıyoruz.

RPG Engine yolu, mesafeyi ve adım hızınla kaç gün süreceğini hesaplar ve seni oraya götürür. Yolculuk, yolda planlı bir şey olduğunda, her günlük yolculuğun sonunda ve varışta durur. Yola çıkmadan önce bir yerin ne kadar uzak olduğunu sorabilirsin:

> [Rocca ne kadar uzakta, yürüyerek ne kadar sürer?]

**Dünya sen olmadan da hareket eder.** Kötülerin süreleri ve saatleri olan planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir ve sen onların izlerini görürsün: bir söylenti, bir iz, kasabada bir değişiklik. Saatin kendisini asla görmezsin, yalnızca geride bıraktıklarını.

**Para** oyunun madeni paralarıyla sayılır. Öde, sat, ödeme al: para üstünü RPG Engine verir.

### 3.5 Haritalar

**Dünya haritası** (gösterge paneli: **Dünya**) yalnızca karakterinin bildiği yerleri, aralarındaki yolları, yürüdüğün izi ve geri kalan her şeyin üstündeki sisi gösterir. Bir yere tıkla, onun hakkında ne bildiğini ve ne kadar uzak olduğunu gör.

**Bir yerin haritası** (gösterge paneli: **Sahne**, çatışmada **Çatışma**) oyun yöneticisi bulunduğun yer için bir harita çizdiğinde belirir: duvarlar, kapılar, zemin ve kimin nerede durduğu, jetonlar olarak. Bir çatışmada, sıran geldiğinde ulaşamayacağın kareler örtülür, böylece nereye gidebileceğini bir bakışta görürsün. Oyun yöneticisi karakterinin nereye hareket ettiğini sorduğunda sayfa haritayı açar; sen bir kareye dokunursun ya da onu yazarsın, örneğin *E4*.

### 3.6 Görevler, günlük ve notlar

**Görevler.** Karakterin bir işi üstlendiğinde, bu **Günlük**'ünde bir göreve dönüşür: kimin verdiği, nerede, ne zamana kadar, hedefleri bir liste olarak ve neyi ölçtüğü (kalan süreli bir son tarih, bir saat, bir sayaç). Takip etmek için yıldızıyla işaretle: Sahne'nin üstünde, sıradaki hedefiyle birlikte küçük olarak durur. Görev, hikâye bitirdiğinde biter, asla kendiliğinden bitmez.

**Hikâye.** Günlük'ün Hikâye sekmesi kampanyanı bir zaman çizelgesi olarak gösterir: her sahne bir bölüm, yeri, tarihi ve kısa bir özetiyle; en sonuncusu en üstte.

**Notların.** Günlük'ün Notlar sekmesinde kendi notlarını yazarsın: kuramlar, isimler, planlar. Bunlar bilgisayarında kalır ve bir notu **Paylaş**madıkça oyun yöneticisi onları okumaz. Paylaşılan bir not, oyun yöneticisine bir sonraki yanıtında senin düşüncen olarak ulaşır, asla bir olgu olarak değil. Kuramın yazdığın için doğru olmaz. Bir içeriğin durdurulmasını veya kaçınılmasını isteyen bir not, masada söylemişsin gibi sayılır.

### 3.7 Karakterinin hikâyesi ve görseli

Karakterinin karakter kağıdında, **Açıklama** kartında karakterinin hikâyesini yazabileceğin bir kutu vardır. Gönder; sen evet dedikten sonra oyun yöneticisi onu kendi sözleriyle karaktere yazar.

Karakterinin görseli için sohbette oyun yöneticisine bir görsel dosyası ver, bilgisayarında nerede olduğunu da belirt (PNG, JPEG, WebP veya SVG, en fazla 5 MB):

> [İşte karakterimin portresi: C:\Users\me\Pictures\mira.png]

Oyun yöneticisi onu kampanyaya kopyalar ve gösterge panelinde karakterinin jetonunda görünür. İstediğin zaman aynı yolla değiştirebilirsin.

Ya da, bilgisayarın görsel üretebiliyorsa portrenin üretilmesini sağla (bkz. [Görseller](#311-pictures)): karakterini oyun yöneticisine anlat ya da oyun yöneticisi anlatsın.

> [Bana bir portre yap: örgülü gri saçlar, çenede bir yara izi, yorgun gözler.]

Portre, karakterinin oyunda tam olarak ne olduğunu gösterir: halkı bu dünyada nasıl varsa öyle, bir tepe cücesi tepe cücesi olarak, tarif ettiğin görünümle. Yaklaşık bir dakika içinde karakterinin jetonunda belirir. Yoldaşların da aynı şekilde kendi portrelerine sahip olabilir.

### 3.8 Kayıtlar ve geri dönmek

RPG Engine tüm kampanyayı **her sahnenin sonunda** kendiliğinden kaydeder. Bu kayıtlarla ne yapabileceğin **Kayıtlar** ayarına bağlıdır:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **kalıcı ölüm** | hayır | asla; yalnızca kampanyayı baştan başlatabilirsin |
| **kontrol noktası** | hayır | son kayda, yalnızca karakterin öldüğünde |
| **serbest** | evet | herhangi bir kayda, istediğin zaman |

Her kipte **baştan başlayabilirsin**: aynı karakterle oyunun başından ya da yeni bir karakterle sıfırıncı oturumdan.

Bunların hepsini sohbette ("[Düellodan öncesine dönelim.]") ya da gösterge panelinin **Kayıtlar** bölümünde yapabilirsin.

**Geri döndükten sonra yeni bir sohbet aç.** Oynadığın sohbet geri alınanı hatırlar. Oyun yöneticisiyle yeni bir sohbet aç (Claude Code'da `/clear`, Codex'te `/new`), *devam* yaz, sonra Kayıtlar'da **Yeni sohbet açtım**'a bas ya da yeni sohbette oyun yöneticisine söyle. Eski sohbeti asla sürdürme. Sen onaylayana kadar oyun yöneticisi devam etmez.

### 3.9 Oturumlar: durmak ve geri dönmek

**Oturumu istediğin zaman bitirirsin:**

> [Bu gece burada bırakalım.]

"Kaydet ve çık" diye bir şey yok: her şey zaten dosyalarda.

Sohbeti **kapatmak** için Claude Code'da `/exit`, Codex'te `/quit` yaz. Gösterge paneli bir sonraki sohbete kadar sessizleşir.

**Geri dönmek** için kampanya klasöründe (`init`'in yazdırdığı klasör) bir terminal aç, ortamını orada başlat ve *devam* yaz. Oyun yöneticisi oyunun nerede olduğunu okur, sana kısa bir özet verir ve olan bir şeyle başlar. Yeni bir sohbet hiçbir şeyi kaybettirmez: kampanya sohbette değil, dosyalarında yaşar.

Oyun yöneticisi sonunda alışılmış sorular sormaz. Yalnızca bir şeyin yolunda gitmediğini fark ettiyse kısaca sorar.

### 3.10 Oyun yöneticisinin ruh hâli

Gösterge panelinin üstünde oyun yöneticisinin avatarı, küçük bir robot durur. Yüzü hikâyenin tonunu izler: tehlike büyüdüğünde endişeli, cesur bir fikre sevinçli, bir dönüşe şaşkın. Doğal 20 ya da doğal 1'e kısa bir an tepki verir. Henüz bilmediğin hiçbir şeyi asla göstermez: tuzak kurulmadan sırıtma yok. Grubunun jetonları da ruh hâllerini gösterir. Sohbet kapalıyken robot uyur.

### 3.11 Görseller

RPG Engine, **Görseller** ayarının dediği gibi, ulaştığın her yer ve üstlendiğin her görev için bir görsel ürettirebilir, istediğinde de karakterinin portresini. Bilgisayarında zaten olanı kullanır:

- **Codex**, ChatGPT girişinle: boyanmış bir görsel.
- Aksi hâlde **Claude Code**, Claude girişinle: bir çizim.

Görsel bizim değil, senin kendi planını kullanır. **Ayarlar** bölümü görsellerin bilgisayarında üretilip üretilemeyeceğini, üretilemiyorsa kurulum adımlarını söyler. Görsel yoksa sayfa her yer türünün işaretini gösterir. Oyun yöneticisine herhangi bir yer ya da karakter için kendi görselini de verebilirsin.

### 3.12 Güvenlik: sınırlar, perdeler ve dur

- **Sınırlar**: oyunda asla yer almayacak şeyler.
- **Perdeler**: olabilecek ama yalnızca ekran dışında olacak şeyler.
- **Dur**: istediğin an, açıklama yapmadan bir içeriği durdurabilirsin. Hikâyenin dışında yaz:

> [dur]

Oyun yöneticisi onu hemen bırakır ve gelecek tüm oturumlar için sınırlarına ekler. Sınırlarını ve perdelerini **Ayarlar**'da görebilir ve değiştirebilirsin.

### 3.13 Fikrini değiştirmek

Her ayar kampanya sırasında değişebilir: sohbette ("[Biraz zorlaştıralım.]") ya da **Ayarlar**'da. Oyun yöneticisi bir değişikliği bir sonraki yanıtında öğrenir. Oyun yöneticisinin kural kitabına bakmadan verdiği bir karar **emsal** olur ve saklanır, böylece aynı soru bir dahaki sefer aynı yanıtı alır.

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

### 5.1 Oyun sistemi nedir

Oyun sistemi, tek bir oyunun verisidir: karakter kağıdı, sayıları, yaratıkları, eşyaları, büyüleri ve kural metni. Her kampanya tek bir sistem oynar.

RPG Engine, dijital bir karakter kağıdının yaptığı gibi karakter kağıdını ve harcananı ve geri geleni, örneğin can puanlarını ve büyü yuvalarını hesaplar. Bir özelliğin ya da büyünün nasıl çalıştığını oyun yöneticisi kurallardan okur ve masadaki gibi karar verir.

### 5.2 Beşinci sürüm, dahil

RPG Engine, System Reference Document 5.1'den (2014 kuralları, Creative Commons altında ücretsiz) **5e** ile gelir. İçinde şunlar var:

- SRD'nin ırkları, sınıfları, alt sınıfları, bir geçmişi ve bir yeteneği;
- 319 büyü, silahlar, zırhlar ve ekipman, büyülü eşyalar ve SRD'nin canavarları;
- oyun yöneticisinin tam metinleriyle aradığı kural bölümleri;
- hesaplanmış tam karakter kağıdı: yetenek değiştiricileri, kayıt atışları, beceriler, zırh sınıfı, saldırılar, büyü kurtarma zorluk sınıfı, yuvalar, vuruş zarları, seviyeye göre özellikler, deneyim ve seviye atlama;
- geri getirmesi gerekeni geri getiren dinlenmeler; kural metinleriyle durumlar; konsantrasyon hatırlatmaları.

**SRD'nin ötesindeki içerik.** Beşinci sürümü, SRD'de olmayan içerikle oynayabilirsin, örneğin sahip olduğun bir kitaptan bir sınıf ya da bir canavar. Oyun yöneticisi oyunu bilir, kitaplarını okuyabilir ve webde arama yapabilir. İhtiyacı olanı kampanyanın sayfaları olarak yazar ve RPG Engine onlarla aynı şekilde çalışır. Bizim sunduğumuz, lisansıyla sınırlıdır. Oyun yöneticisinin bildiği sınırlı değildir.

RPG Engine beşinci sürümle uyumludur.

### 5.3 Ev kuralları ve kendi eklemelerin

Hiçbir dosyaya dokunman gerekmez. Oyun yöneticisine sor:

> [Ev kuralı: saldırıda doğal 1, silahını düşürmen demek.]
>
> [Bir Blood Hunter oynamak istiyorum. Kitap bende: sınıf özellikleri şunlar.]
>
> [Bu kampanyada kısa bir dinlenme 10 dakika sürüyor.]

Oyun yöneticisi bunları kampanyana şu yollardan biriyle kaydeder:

- **Masanın bir anlaşması**, sözcüklerle. Yukarıdaki düşen silah ya da kısa dinlenme gibi. Oyun yöneticisi onu kampanyanın ayarlarıyla birlikte tutar ve bundan sonra ona göre oynar. Oyun yöneticisinin kitapta olmayan bir kararı da aynı şekilde **emsal** olarak saklanır.
- **Yeni bir sayfa**, örneğin bir sınıf, bir ırk ya da bir eşya. Yeni bir sınıf sistemin sınıfı gibi çalışır: seviyen, vuruş zarların ve özelliklerin onu sayar. Yeni bir ırk var olan birinin üstüne kurulabilir ("Elf gibi, artı…"). Adı olan bir kılıç Uzun Kılıç'ın üstüne kurulabilir.
- **Karakter kağıdı için yeni sayılar**: bir alan, bir tablo, bir formül, dinlenmenin geri getirdiği bir sayaç. Örneğin kısa dinlenmede geri dönen bir Battle Master'ın üstünlük zarları. Bir ev kuralı sistemin formüllerinden birinin yerini de alabilir.

Önceden yazılmış ev kuralların varsa onları kampanyanın `rules` klasörüne metin dosyaları olarak da koyabilirsin (bkz. [kampanya klasörü](#8-for-the-curious-the-campaign-folder)). Oyun yöneticisi onları, kitabın aynı adlı kuralından önce okur.

### 5.4 Kendi oyun sistemini eklemek ya da içe aktarmak

Bugün RPG Engine yalnızca beşinci sürümü oynar. Başka oyun sistemleri gelecek. Kendi sistemini eklemenin ya da sahip olduğun bir oyunu kılavuzlarından bir sisteme çevirmenin yolu da gelecek. Bkz. [Daha sonra gelecekler](#9-coming-later).

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
