<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: eksiksiz kılavuz

**RPG Engine**, masa başı rol yapma oyununu **yapay zekâ oyun yöneticisiyle** oynamanı sağlar. Oyunu **gösterge panelinde** oynarsın: bilgisayarındaki bu pencerede karakter kağıdın, zarlar, haritalar, günlüğün ve oyun yöneticisiyle **sohbetin** bulunur.

Bu kılavuz nasıl oynayacağını anlatır. Sayfa kendi düğmelerini kendisi açıklar: imleci birinin üstünde beklet, ne yaptığını görürsün.

## Hızlı başlangıç <!-- icon: send -->

1. [nodejs.org](https://nodejs.org) adresinden **Node.js** kur (LTS sürümü).
2. Yeni bir terminal aç ve `npm install -g rpg-engine` yaz. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz, evet de ve yeniden dene.
3. `rpg open` yaz. Masaüstüne simge eklemeyi önerdiğinde Enter'a bas ([2.2](#22-installing)). Bundan sonra RPG Engine'i simgesinden başlatırsın.
4. **Yeni kampanya**'ya bas, bir ad ver ve **Oluştur**'a bas ([2.3](#23-a-new-campaign)).
5. Sohbette yapay zekâ uygulamanı ve modelini seç ([2.4](#24-connect-your-ai)): Claude Code için ücretli bir Claude planı, Codex için ücretsiz ya da ücretli bir ChatGPT hesabı gerekir. **Sohbeti aç**'a, sonra **Başla**'ya bas.

İlk yanıt birkaç dakika sürebilir. Sonra oyun yöneticisi nasıl oynamak istediğini sorar ve karakterini birlikte yaparsınız.

## 1. RPG Engine nedir <!-- icon: about -->

| Kim | Ne yapar |
|---|---|
| **Sen** | Karakterini oynarsın: karakterin ne yapar, ne söyler, neyi dener. |
| **Oyun yöneticisi** (yapay zekâ) | Hikâyeyi anlatır, diğer herkesi oynar, ne olacağına karar verir, atış ister. |
| **RPG Engine** | Dünyayı dosyalarda tutar, zarları atar, can puanını, parayı, zamanı ve mesafeleri sayar, sırları sen keşfedene kadar saklar. |

Dünya bir akşamdan ötekine aynı kalır. Yeni bir sohbette de, farklı bir yapay zekâyla da değişmez:

- **Söylenen şey doğru kalır.** Ölen kötü karakter ölü kalır.
- **Zarlar gerçektir.** Oyun yöneticisi onları değiştiremez. Tek istisna en kolay zorluk seviyesidir.
- **Sırlar sır kalır.** Oyun yöneticisi sana karakterinin bilmediği şeyi asla söylemez.
- **Dünya hareket eder.** Sen dinlenirken ya da yolculuk ederken tehditler ilerler.
- **Bir kampanya, bilgisayarındaki bir klasördür.** Dilediğin zaman bırak, sonra devam et.

Bir oyun, oyun sistemiyle gelir. Bugün bizim sistemimiz **beşinci sürüm**: ücretsiz System Reference Document 5.1'den gelir. Sistem olmadan serbest oynarsın: sayıları olmayan bir hikâye.

---

## 2. Başlarken <!-- icon: path -->

### 2.1 Neye ihtiyacın var

- Windows, macOS veya Linux yüklü bir bilgisayar.
- [nodejs.org](https://nodejs.org) adresinden **Node.js 24** veya daha yenisi.
- Yalnızca kurulum için bir **terminal**: Windows'ta Terminal ya da PowerShell; macOS'ta Terminal.
- Oyun yöneticisi için, kendi hesabınla bir **yapay zekâ uygulaması** ([2.4](#24-connect-your-ai)).

### 2.2 Kurulum

```text
npm install -g rpg-engine
rpg open
```

İlk satır RPG Engine'i kurar. npm kendini güncellemeyi önerirse bunu yok sayabilirsin.

`rpg open`, RPG Engine'in penceresini açar. İlk seferde masaüstüne ve menüne bir simge eklemeyi önerir: evet için Enter'a bas. Bundan sonra RPG Engine'i simgesinden başlatırsın.

Kurulum başarısız olursa `node --version` komutunun 24 ya da daha yüksek bir sürüm yazdığını kontrol et. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz ve evet de. Windows'ta RPG Engine'i ve kampanyalarını içinde `&` olan yollardan uzak tut.

### 2.3 Yeni bir kampanya

**Yeni kampanya**'ya bas ve bir **Ad**, bir **Dil** ile bir **Oyun sistemi** seç. Gerisini oyun yöneticisi seninle birlikte yapar. **Oluştur**'a bas: kampanya kendi penceresinde açılır.

Oyun yöneticisi ve gösterge paneli kampanyanın dilini konuşur. Beşinci sürümün kural metni İngilizce kalır; oyun yöneticisi onu senin dilinde anlatır.

Kampanya, kullanıcı klasöründeki `RPG Engine` klasörünün içinde, kendi adıyla bir klasördür. Sonraki sefer kartına tıkla.

### 2.4 Yapay zekânı bağla

Oyun yöneticisi, bilgisayarındaki bir **yapay zekâ uygulamasında**, senin hesabınla çalışır. claude.ai ya da ChatGPT gibi bir web sohbeti yetmez: oyun yöneticisinin kampanya dosyalarına erişmesi gerekir.

- **Claude Code**: ücretli bir Claude planı (Pro ya da üstü).
- **Codex**: ücretsiz ya da ücretli bir ChatGPT hesabı.
- **OpenCode**: hesap gerekmez; sınırlı bir süre için bazı ücretsiz modeller vardır ya da kendi sağlayıcının modellerini, yerel olanlar dahil, kullanabilirsin.
- **Antigravity**: bir Google hesabı; ücretsiz kullanımın haftalık sınırları vardır.

Sohbette uygulamayı, **Model**'i ve **Oyun yöneticisinin düşüncelerini** seç. Uygulama kurulu değilse ya da giriş yapmadıysan bir düğme onu kurar, giriş yaptırır ya da sitesini açar. RPG Engine parolanı asla görmez.

Bir oyun akşamı uzun bir sohbettir: en küçük planlarda akşam bitmeden sınıra ulaşabilirsin. Elindeki en büyük modelle oyna: küçük bir modeli sır vermeye ikna etmek daha kolaydır.

RPG Engine'i en çok **Claude Code** ile oynuyor ve test ediyoruz. Antigravity **deneme aşamasında**: oyundan çıkabilir ve sohbetlerini kapatamayacağın bir bellekte tutar. Orada yazdıkların Google'a gider; Google bunları insanlara okutabilir. RPG Engine bir Google ürünü değildir.

### 2.5 İlk sohbet

**Sohbeti aç**'a, sonra **Başla**'ya bas. İlk yanıt birkaç dakika sürebilir. Sonra yeni bir kampanya üç aşamadan geçer:

1. **Ayarlar**: oyun yöneticisi nasıl oynamak istediğini her seferinde birkaç soruyla sorar: dünyanın ne kadar zor olduğu, ölüp ölemeyeceğin, bir kayda ne zaman dönebileceğin. Oyun yöneticisinin seçmesi için *Sen karar ver* yaz. Her şey sonradan değiştirilebilir.
2. **Sıfırıncı oturum**: karakterini oyun yöneticisiyle, bir masadaki gibi yaparsın. Karakter kağıdının hesaplarını RPG Engine yapar. Zaten bir karakterin varsa karakter kağıdını sohbete yapıştır.
3. **Oyun**: oyun yöneticisi ilk sahneyi kurar.

### 2.6 Yapay zekâ uygulamanda oynamak

Oyunu yapay zekâ uygulamanın kendi sohbetinde, bir terminalde ya da masaüstü uygulamasında da oynayabilirsin; gösterge paneli yanında açık durur.

1. Oyunlarını tuttuğun klasörde bir terminal aç: klasöre sağ tıkla ve **Terminalde Aç** (Windows) ya da **Servisler > Klasörde Yeni Terminal** (macOS) seçeneğini seç.
2. `rpg init "The Salt Isles"` yaz: `The Salt Isles` adında bir klasör ve içinde yeni bir kampanya oluşturur.
3. Uygulamanı o klasörde başlat: `claude`, `codex`, Antigravity için `agy` ya da `opencode`. Klasöre güvenip güvenmediğini sorduğunda evet de: Claude Code'da önceden seçili gelen cevap *No, exit* olur.
4. *Selam! Başlayalım.* yaz. Oyun yöneticisi sana gösterge panelinin bağlantısını verir: sohbetin yanında aç.

Bilmen iyi olur:

- Uygulamanın kullandığı araçların ayrıntılarını açma (Claude Code'da ctrl+o): sırları gösterebilirler.
- Codex'in masaüstü uygulamasında oyunun sohbetleri için belleği kapat.
- Oyun yöneticisi oyunu tanımıyorsa kampanya klasöründe `rpg init` yaz ve yeni bir sohbet aç.
- Windows `claude` komutunu bulamazsa kurulum programının söylediği klasörü PATH'e ekle, sonra yeni bir terminal aç.
- Bir kampanyayı aynı anda tek sohbet oynar: seninki açıkken gösterge panelinin sohbeti bekler.

---

## 3. Oyun oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterin ne yapıyor ya da ne söylüyorsa yaz:

> Han sahibine bu gece başka kimin uğradığını soruyorum.

Sen neyi denediğini söylersin, ne olacağını oyun yöneticisi söyler. Oyun yöneticisi karakterin adına asla karar vermez.

Hikâyenin dışına çıkmak için `[OOC: …]` yaz (karakter dışı): *[OOC: Tutuşma nasıl işliyor?]* Oyun yöneticisine kuralları ya da gösterge panelinin nasıl çalıştığını sorabilirsin.

Oyun yöneticisi sana bir şey sorduğunda düğmeleriyle ya da kendi sözlerinle yanıtla. Karakter kağıdından da eylem yapabilirsin: bir silaha, büyüye ya da eşyaya tıkla ve ne yapacağını seç.

**Kalıcı emirler**: yoldaşlarına kalıcı olması gereken bir şey söyle, örneğin *Bundan sonra her zaman birini sağ bırakın*. Oyun yöneticisi bunu sen kaldırana kadar tutar.

### 3.2 Atışlar

Oyun yöneticisi atış istemeyi yalnızca sonuç belirsizse ve önemliyse yapar. Bir banner atışı gösterir: ona tıkla, zarlar düşer.

Zarlar RPG Engine'indir, oyun yöneticisinin değil. İstediğin zaman sorabilirsin: *[Şu atış gerçek miydi?]* Gizli bir atış için bile oyun yöneticisi, atışın sen sormadan önce yapıldığını kanıtlayabilir.

**Zarlar** ayarı fiziksel olduğunda kendi zarlarını at ve sonucu yaz: *[14 attım.]* Eğlence için, karakter kağıdından ya da **Serbest atış** ile yaptığın atışlar hiçbir zaman sayılmaz.

### 3.3 Sahneler, çatışmalar ve yolculuk

Hikâye **sahneler** halinde ilerler: bir çatışma, bir konuşma, bir yolculuk, bir dinlenme. Her sahnenin sonunda oyun kendiliğinden kaydeder ve sahne günlüğüne girer.

Bir çatışmada sırası sende olmayan her sırayı oyun yöneticisi oynar ve karar vermen gereken yerde durur.

Nereye gittiğini söyle, *Kuzeye, Rocca'ya giden yola çıkıyoruz*: RPG Engine mesafeyi ve günleri hesaplar, yolda bir şey olursa durur. Bu arada kötülerin planları sürer ve sen onların izlerini görürsün.

### 3.4 Kayıtlar

RPG Engine, her sahnenin sonunda kampanyayı kaydeder. Ne zaman geri dönebileceğine **Kayıtlar** ayarı karar verir:

- **Kalıcı ölüm**: asla.
- **Kontrol noktası**: son kayda, yalnızca karakterin ölünce.
- **boşta**: herhangi bir kayda; istediğin zaman kaydedebilirsin.

Her kipte sohbette ya da **Kayıtlar**'da baştan başlayabilirsin.

Geri döndükten sonra yeni bir sohbet aç, çünkü eski sohbet geri alınanı hâlâ hatırlar:

1. **Sohbeti kapat**'a, sonra **Yeni sohbet**'e bas. Yapay zekâ uygulamanın kendi sohbetinde yeni bir konuşma aç (Claude Code'da `/clear`).
2. *devam et* yaz.
3. Kayıtlar'da **Yeni sohbet açtım**'a bas. O zamana kadar oyun yöneticisi bekler.

### 3.5 Durmak ve devam etmek

İstediğin zaman dur: her şey zaten kayıtlıdır. Gösterge panelinin penceresini kapat; kısa süre sonra oyun durur. Hiçbir şey kaybolmaz.

Geri dönmek için RPG Engine'i simgesinden aç ve kampanyana tıkla. **Sohbete devam et**'e, sonra **Hikâyeye devam et**'e bas: oyun yöneticisi nerede kaldığını anlatır ve devam eder. Sonraki sefer başka bir yapay zekâ uygulaması da seçebilirsin.

### 3.6 Kısıtlamalar ve dur

**Sınırlar** oyunda asla yer almaz; **perdeler** yalnızca sahne dışında olur. Bunları **Ayarlar**'da belirlersin.

İstediğin an *[dur]* yaz: oyun yöneticisi o içeriği bırakır ve sınırlarına ekler.

### 3.7 Görseller

Oyun yöneticisi, **Görseller** ayarının dediği gibi yerlerin, görevlerin ve kişilerin görsellerini, istersen karakterinin portresini de yaptırabilir. Görselleri yapay zekâ uygulaman, senin planınla yapar. Hiçbiri çıkmazsa **Ayarlar** bu bilgisayarın görsel yapıp yapamadığını söyler.

Karakterine ya da dünyanın bir sayfasına, sayfanın kendisinden, kendi görselini de verebilirsin.

---

## 4. Gösterge paneli <!-- icon: party -->

Oyununu gördüğün pencere. Yalnızca karakterinin bildiklerini gösterir.

- **Rol yapma**: oyun yöneticisiyle sohbet; sayfanın yanında değilse burada durur.
- **Grup**: senin karakter kağıdın, yoldaşlarınınkiler ve atışlar.
- **Sahne**: bulunduğun yer, orada kimlerin olduğu ve harita; çatışmada sıralar.
- **Günlük**: görevler, kitap olarak hikâye, yoldaşlarının günlükleri ve notların.
- **Dünya**: dünya haritası, karakterinin bildikleri, bulunan belgeler ve takvim.
- **Kayıtlar**: geri dönmek ve baştan başlamak.
- **Ayarlar**: nasıl oynadığın ve sayfanın nasıl göründüğü.
- **Paketler**: oyun sistemi, uzantılar, kılavuzların ve güncellemeler: yeni bir RPG Engine çıktığında burada yazar.

Sayfa bağlı olmadığını söylerse **Kampanyayı yeniden aç**'a bas.

Evde telefonundan oynamak için **Ayarlar**'da **Gösterge paneli** altında **Telefon erişimi**'ni aç ve kodu, bilgisayarla aynı Wi-Fi'daki telefonunla tara. Windows, Node.js'in ağı kullanıp kullanamayacağını sorabilir: özel ağlarda izin ver ve Wi-Fi'ı özel ağ olarak ayarla. Oyun şifrelenmeden gider: yalnızca evindeki gibi güvendiğin bir ağda kullan; asla herkese açık, otel ya da iş yeri Wi-Fi'ında kullanma. İşin bitince kapat: oyun, bilgisayarın son penceresiyle sona erer.

Bir tema sayfayı okumayı zorlaştırırsa adresinin sonuna `#/settings/page` ekle ve **Temanın kendi stili**'ni kapat.

---

## 5. Kurallar, kılavuzlar ve eklentiler <!-- icon: dice -->

Bir **Oyun sistemi**, tek bir oyunun verisidir: karakter kağıdı, yaratıklar, eşyalar, büyüler ve kurallar. RPG Engine karakter kağıdını hesaplar. Bir kuralın nasıl uygulanacağını ise oyun yöneticisi okur ve karar verir, tıpkı gerçek bir masada olduğu gibi.

**Beşinci baskı**, System Reference Document 5.1'in ücretsiz kurallarını içerir. Sahip olduğun bir kitaptaki içeriği de oynayabilirsin: oyun yöneticisi onu kampanyana yazar.

**Kılavuzların**: oyun yöneticisine nerede olduklarını söyle ya da klasörlerini **Paketler** bölümünden ekle. Oyun yöneticisi kuralları bu kılavuzlarda arar, kitabı ve sayfayı belirtir. RPG Engine kılavuzlarını asla değiştirmez ve hiçbir kampanyaya kopyalamaz.

**Ev kuralları**: oyun yöneticisine söyle, *[House rule: a natural 1 on an attack means you drop your weapon.]* Oyun yöneticisi kuralı aklında tutar. Bir kez verdiği karar bir sonraki sefer de geçerli olur.

**Eklentiler** oyuna bir şey katar, örneğin hava durumu. Eklentileri **Paketler** bölümünden ekle ya da oyun yöneticisinden iste.

---

## 6. Kendi macerın <!-- icon: world -->

Yazılı bir dünya yoksa oyun yöneticisi senin ana fikrinden bir dünya kurar ve onu korur.

Sahip olduğun bir macerayı ya da kitabı oynamak için dosyasını oyun yöneticisine ver: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Kampanyanın dışındaki bir dosya, ancak sen evet dedikten sonra okunur. En iyi metin, EPUB, Word ya da metni seçilebilen bir PDF olarak okunur.

Belgenin tamamı, onu okuyan yapay zekânın şirketine gider. Bir kampanya yalnızca bir kez oynanır: aynı macerayı yeniden oynamak için yeni bir kampanya oluştur.

---

## 7. Verilerin <!-- icon: lock -->

- Bir kampanya bir klasördür. Kampanyanın sırlarını, oyun yöneticisiyle yaptığın sohbetleri de içinde tutar. Klasörü hiç açman gerekmez.
- RPG Engine yalnızca bu klasöre yazar ve yalnızca bu klasörden okur. Kılavuzlarını sadece okur. Kampanyanın dışındaki her şeye ise ancak sen evet dedikten sonra, bilgisayarının bir penceresinde erişir.
- Kontrol panelinin sohbetinde oyun yöneticisi dosyalarından hiçbirini kendiliğinden açmaz.
- Yazdıkların, modeli oyun yöneticisini oynayan şirkete gider. Bu, hesabının koşullarına tabidir. Yerel bir modelle her şey bilgisayarında kalır.
- Bizim olmayan bir oyun sistemi ya da eklenti, bilgisayarında çalışan koddur: yalnızca sen evet dersen gelir. Sadece güvendiğin yapımcılara evet de.
- Kampanya klasörü bir git deposuysa **Ayarlar** senin için commit atabilir. Sohbetlerinin içeri girmesine yalnızca depo gizliyse izin ver.
- **Telefon erişimi** açıkken oyun, bilgisayardan telefona ev ağın üzerinden, şifrelenmeden ve hiçbir dış hizmete uğramadan gider. O ağdaki herkes oyunu okuyabilir.
