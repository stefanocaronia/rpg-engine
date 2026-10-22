<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 21501b79 75985e6d ece214f0 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
# RPG Engine: eksiksiz kılavuz

**RPG Engine**, masa başı rol yapma oyununu **yapay zekâ oyun yöneticisiyle** oynamanı sağlar. Oyun yöneticisiyle bir **sohbette** konuşursun; RPG Engine ise arka planda çalışır: **dünyayı hatırlar**, **zarları atar** ve **hesapları tutar**. Sohbetin yanında tarayıcında bir sayfa açık tutarsın: **gösterge paneli**. Orada karakter kağıdın, zarların, haritaların ve günlüğün durur.

Bu kılavuz oyuncular için yazıldı: program yazmayı bilmen gerekmez.

## Hızlı başlangıç <!-- icon: send -->

1. [nodejs.org](https://nodejs.org) adresinden **Node.js** kur (LTS sürümü).
2. Bir **yapay zekâ ajanı** kur ve giriş yap. Oyun yöneticisi bu programın içinde çalışır. Örneğin Claude Code ya da Codex ([2.4](#24-connect-your-ai)).
3. Bir terminalde RPG Engine'i kur: `npm install -g rpg-engine`.
4. Bir kampanya oluştur: `rpg init "The Salt Isles"`.
5. Yeni klasöre gir, `cd "The Salt Isles"`, ve ajanını orada başlat: Claude Code için `claude`, Codex için `codex`. Klasöre güvenip güvenmediğini sorduğunda evet de ([2.4](#24-connect-your-ai)), sonra *Merhaba! Başlayalım.* yaz. Oyun yöneticisi gösterge panelinin bağlantısıyla yanıt verir.

## 1. RPG Engine nedir <!-- icon: about -->

| Kim | Ne yapar |
|---|---|
| **Sen** | Karakterini oynarsın: ne yaptığını, ne söylediğini ve neyi denediğini sen belirlersin. |
| **Oyun yöneticisi** (yapay zekâ) | Hikâyeyi anlatır, diğer herkesi oynar, olacakları belirler, atış ister. |
| **RPG Engine** | Dünyayı dosyalarda tutar, zarları atar, can puanını, parayı, zamanı ve mesafeleri sayar, sırları sen keşfedene kadar saklar. |

Dünya bir akşamdan ötekine aynı kalır. Yeni bir sohbette de, başka bir yapay zekâyla da değişmez:

- **Söylenen şey doğru kalır.** Ölen kötü karakter ölü kalır.
- **Zarlar gerçektir.** Oyun yöneticisi onları eğip bükemez. Tek istisna, seçersen en kolay zorluk seviyesidir.
- **Sırlar sır kalır.** Oyun yöneticisi, karakterinin bilmediği şeyi sana asla söylemez.
- **Dünya hareket eder.** Sen dinlenirken ya da yolculuk ederken tehditler ilerler ve işaretlerini görürsün.
- **Kampanya bir klasördür.** Bilgisayarında durur: istediğin zaman bırak, sonra devam et.

RPG Engine bugün tek bir oyun sistemi oynatır: ücretsiz System Reference Document 5.1'den **beşinci edisyon**. Diğerleri gelecek ([Daha sonra gelecekler](#9-coming-later)).

---

## 2. Başlarken <!-- icon: path -->

### 2.1 Neye ihtiyacın var

- Windows, macOS veya Linux yüklü bir bilgisayar ve bir web tarayıcısı.
- [nodejs.org](https://nodejs.org) adresinden **Node.js 22** veya daha yeni bir sürüm. Yanında `npm` gelir. RPG Engine'i `npm` kurar.
- Bir **terminal**: Windows'ta Terminal ya da PowerShell, macOS'ta Terminal. Terminali bir klasörde açmak için klasöre sağ tıkla ve **Terminalde aç** (Windows) ya da **Hizmetler > Klasörde Yeni Terminal** (macOS) seçeneğini seç.
- Oyun yöneticisi için bir **yapay zekâ ajanı** ([2.4](#24-connect-your-ai)). Ajanın sunduğu **en büyük modeli** kullan: küçük bir modeli sır vermeye ya da kuralları esnetmeye ikna etmek daha kolaydır.

### 2.2 Kurulum

```text
npm install -g rpg-engine
```

`rpg --version` komutu kurulumun işe yaradığını kontrol eder. `rpg` komutunu kampanya başına bir kez, kampanyayı oluşturmak için kullanırsın. Sonrasında ajanın RPG Engine'i kendisi başlatır.

### 2.3 Kampanya oluşturma

Oyunlarını sakladığın klasörde bir terminal aç ([2.1](#21-what-you-need) nasıl yapılacağını anlatır):

```text
rpg init "The Salt Isles"
```

Bu komut `The Salt Isles` adlı bir klasör ve içinde yeni bir kampanya oluşturur. `cd "The Salt Isles"` ile klasöre gir. Klasörün yerini unutma: her oynayışında buraya döneceksin. Geri kalan her şeyi sonra, sohbette ya da kontrol panelinde seçersin. `rpg init --help` komutu, bazılarını şimdiden seçmen için seçenekleri listeler. Örneğin `--language it` ya da `--difficulty hard`.

Oyun yöneticisi senin yerine kampanya oluşturamaz: `init` çalışmadan önce ajanına RPG Engine'in nerede olduğunu söyleyen hiçbir şey yoktur.

### 2.4 Yapay zekânı bağla

Oyun yöneticisi bir **yapay zekâ ajanında** çalışır. Bu, bilgisayarındaki dosyalarla çalışabilen bir yapay zekâ uygulamasıdır; terminalde ya da masaüstünde olabilir. Claude Code ve Codex bunun örnekleridir. claude.ai ya da ChatGPT gibi sade bir sohbet veya bir telefon uygulaması yetmez: oyun yöneticisinin bilgisayarındaki kampanya dosyalarına erişmesi gerekir. Her ajanın kendi planı ve girişi vardır: Claude Code için ücretli bir Claude planı, Codex için bir ChatGPT girişi. Ajanı bir kez, kendi sayfasından kurarsın: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: kampanya klasöründe `claude` yaz. Klasöre güvenip güvenmediğini sorduğunda **Yes, I trust this folder** seçeneğini seç. Dikkat: önceden seçili gelen cevap *No, exit* olur.
- **Codex**: kampanya klasöründe `codex` yaz. Klasöre güvenip güvenmediğini sorduğunda evet de. Masaüstü uygulamasında, ayarlardan oyunun sohbetleri için belleklerin kapalı olduğunu kontrol et.
- **Başka bir ajan**: ajanı kampanya klasöründe başlat ve ona `rpg mcp` MCP sunucusunu ver. RPG Engine standart bir MCP sunucusudur: MCP destekleyen her ajan, yerel olanlar dahil, oyun yöneticisi olabilir.

Oyunu **Claude Code** ile oynuyor ve test ediyoruz. **Codex** bağlı ve kontrol edildi, ama onunla henüz tam bir kampanya oynanmadı. `init` ayrıca **Gemini CLI**'ı da hazırlar. Kampanya, ajanın kendi belleğini kapatır: oyun dosyalarında yaşar, böylece bir kayda dönmek gerçekten geri dönmek olur.

### 2.5 İlk sohbet

İstediğini yaz, örneğin *Merhaba! Başlayalım.* Oyun yöneticisi, her sohbetin ilk cevabında sana **kontrol paneli bağlantını** verir. Bağlantı `http://127.0.0.1:4750` gibi bir şeydir. Bağlantıyı aç ve sohbetin yanında tut.

Oyun yöneticisinin mesajları arasında ajanın kullandığı araçları gösterir. Ayrıntılarını açma (Claude Code'da ctrl+o): sırları gösterebilirler.

Yeni bir kampanya, kontrol panelinin üstünde gösterilen üç aşamadan geçer: **1 Ayarlar** (nasıl oynamak istediğin), **2 Sıfırıncı oturum** (karakterini oyun içinde yaratırsın), **3 Oyun**.

### 2.6 Ayarlar: nasıl oynayacağını seçmek

Oyun yöneticisi yalnızca eksik kalanı sorar, her seferinde birkaç soru. Kontrol panelinin **Ayarlar** adımı aynı soruları kartlar olarak gösterir. "Sen karar ver" yazarsan oyun yöneticisi seçer. Her şey sonradan, sohbette ya da **Ayarlar**'da değiştirilebilir.

| Ayar | Neyi belirler | Değerler |
|---|---|---|
| **Akıl hocası** | Oyun yöneticisinin sana kuralları ne kadar öğrettiği | kapalı, ipuçları, öğretici |
| **Zorluk** | Dünyanın ne kadar zor oynadığı | story, easy, normal, hard, brutal |
| **Ölümcüllük** | Bir çatışmada yere düşmenin ne anlama geldiği | narrative (asla ölmezsin), epic (yalnızca önemli olduğunda), dice |
| **Kayıtlar** | Ne zaman geri dönebileceğin | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Kural sıkılığı** | Yiyecek, ışık ve yolculuğun kuralları ne kadar yakından izlediği | smooth, rules, simulation |
| **Zarlar** | Zarlarını kimin attığı | digital, physical |
| **Birimler** | Mesafeler ve ağırlıklar | metric, imperial |
| **Sesler** | Karşılaştığın karakterler adına kimin konuştuğu: önemli anlarda karakterin kendisi, yalnızca kendi bildiğini bilerek, oyun yöneticisinin seçtiği gibi; her zaman oyun yöneticisi; ya da yapay zekâ uygulaman destekliyorsa her zaman karakterin kendisi, ana karakterler için ya da herkes için, daha yavaş ve daha pahalı | auto, master, important, always |
| **Yoldaşlar** | Seninle kimin yolculuk ettiği | none, made with you, made by the master, met in play |
| **Görseller** | Yerlerin, görevlerin ve karşılaştığın kişilerin görselleri | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Sınırlar** ve **Perdeler** | Hiç görünmeyecek olanlar ve yalnızca sahne dışında olanlar | listeler |
| **Dil** | Oyunun ve kontrol panelinin dili | herhangi biri |

Beşinci sürüm **gelişim** ekler: deneyim puanı ya da kilometre taşları.

Yazılı bir dünya yoksa oyun yöneticisi ayrıca bir **öncül** (tür, ton, birkaç öğe; kendi sözlerinle) ve **hazırlık** sorar: dünyayı oynarken anında kurmak ya da hepsini baştan kurmak.

**Oyun yöneticisinin üslubu** hiç sorulmaz, ama sohbette ya da **Ayarlar**'da değiştirebilirsin: **anlatım** (sade, edebî, pulp, esprili), oyun yöneticisinin uydurduğu **hikâyeler** (durumlar, yaylar, bölümler, gizem), **tarzını örnek alacağı** bir yazar ya da **kendi sözlerinle** başka her şey.

### 2.7 Sıfırıncı oturum: karakterin

Karakterini oyun yöneticisiyle, bir masadaki gibi yaratırsın. Her seçim senindir, ta ki oyun yöneticisinden onu yapmasını isteyene kadar: dolu bir fikirle, belirsiz bir fikirle ya da hiçbir şeyle gel. Oyun yöneticisi, hiçbir zar atılmadan önce yetenek puanlarının nasıl belirleneceğini söyler. Bir hikâye şart değildir. Verirsen oyun yöneticisi onu senin sözlerinle yazar. Sonra oyun yöneticisi karakterin için bir görsel ister ([3.7](#37-your-characters-story-and-picture)). Karakter kağıdını RPG Engine hesaplar: toplamları sen hiç yapmazsın.

---

## 3. Oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterinin ne yaptığını ya da ne söylediğini kendi sözlerinle yaz:

> Han sahibine bu gece başka kimin uğradığını soruyorum.

Hikâyenin dışına çıkmak için köşeli parantez kullan: *[Güreş tutma nasıl işliyor?]* Oyun yöneticisi de köşeli parantezle yanıtlar.

Sen ne denediğini söylersin, olanı oyun yöneticisi anlatır. Oyun yöneticisi karakterin yerine asla karar vermez ve motordan asla söz etmez. Gösterge panelini nasıl kullanacağını ona sorabilirsin.

### 3.2 Atışlar

Oyun yöneticisi yalnızca sonucun belirsiz ve önemli olduğu durumlarda atış ister. Önce de nelerin tehlikede olduğunu söyler. Sonra:

- **Gösterge panelinde** bir afiş, her kontrol için bir düğme gösterir, örneğin *Acrobatics +4 · with advantage*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Karakter kağıdında yanan satıra da tıklayabilir, zarları zar tepsisinden atabilir ya da afişe başka bir şey yazabilirsin.
- **Elle**, afişin köşesinde ya da **Ayarlar**'da: afiş neyi atacağını söyler, atışı karakter kağıdından ya da zar tepsisinden yaparsın.
- **Gerçek zarlar**, zar ayarı fiziksel olduğunda: attığın yüzleri yazarsın, *[14 attım.]*, RPG Engine değiştiricilerini ekler.

**Serbest atışlar**: Eğlenmek için karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Bunlar hiçbir şeye sayılmaz ve oyun yöneticisi onları asla görmez.

**Oyun yöneticisinin atışları**, gizli olanlar dışında, atış sütununda görünür. Her zaman *[Şu atış gerçek miydi?]* diye sorabilirsin: gizli bir atış için oyun yöneticisi, atışın sen sormadan önce yapıldığını kanıtlayan bir parmak izi verir.

### 3.3 Sahneler ve çatışmalar

Hikâye **sahneler** hâlinde ilerler: bir çatışma, bir sohbet, keşif, yolculuk, bir dinlenme. Her sahnenin sonunda oyun kendiliğinden kaydeder ve sahne günlüğüne eklenir.

Çatışmada oyun yöneticisi, sana ait olmayan her sırayı anlatır ve karar verebileceğin yerde durur. **Sahne** sayfası en üstte sıranın kimde olduğunu ve sonra kimin geldiğini, haritanın yanında da karakterinin kartını gösterir. Sıra düzeni, grubunun can puanları ve düşmanların ne kadar yaralı göründüğü, sözlerle, sayfanın yanında kalır. Karakterin yere düşerse ölüm kurtarma atışları sayfada büyük görünür.

### 3.4 Zaman, yolculuk ve hareket eden dünya

RPG Engine tarihi tutar; oturumlar arasında zaman geçmez. *Uzun bir dinlenme yapıyoruz* de; oyun yöneticisi kabul edince dinlenme geri getirmesi gerekeni getirir. Kısa bir dinlenmede oyun yöneticisi gösterge panelinde kaç can zarı harcayacağını sorabilir: zarları tek tek at, her birinin ne kadar iyileştirdiğini gör ve istediğin zaman dur. Nereye gittiğini söyle, *Kuzeye, Rocca'ya giden yola çıkıyoruz*; RPG Engine yolu, mesafeyi ve günleri hesaplar, yolda bir şey olursa durur. Para, oyunun madeni paralarıyla sayılır, para üstü dâhil.

Kötülerin son tarihli planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir. Onların izlerini görürsün, saatin kendisini asla.

### 3.5 Haritalar

**Dünya**, karakterinin bildiği yerleri, aralarındaki yolları ve yürüdüğün izi gösterir; geri kalanın üstünde sis vardır. **Sahne**, bulunduğun yerin haritasını, varsa, kimin nerede durduğuyla birlikte gösterir. Çatışmada, senin sıranda, ulaşamayacağın kareler örtülür. Oyun yöneticisi nereye gideceğini sorduğunda bir kareye dokun ya da onu yaz, örneğin *E4*.

### 3.6 Görevler, günlük ve notlar

Karakterinin üstlendiği bir iş, **Günlük**'te hedefleri, son tarihi ve neyi ölçtüğüyle bir görev olur. Sahne'nin en üstünde görünür kalması için görevi yıldızla. Günlük ayrıca **hikâyeni** sahne sahne anlatır ve **notlarını** tutar: notlar özeldir, birini **Paylaş**'a basarak paylaşmazsan. Oyun yöneticisi paylaşılan notu senin düşüncen olarak duyar, asla bir gerçek olarak değil.

### 3.7 Karakterinin hikâyesi ve resmi

Karakter kağıdında **Açıklama** kartında, karakterinin hikâyesi için bir kutu vardır: sen evet dedikten sonra oyun yöneticisi onu oraya yazar. Resim için oyun yöneticisine bir dosya ver (PNG, JPEG, WebP ya da SVG, en fazla 5 MB) ve bilgisayarında nerede olduğunu söyle ya da bir portre yaptır ([3.11](#311-pictures)): *[Bana bir portre yap: örgülü gri saçlar, çenesinde bir yara izi.]*

### 3.8 Kayıtlar ve geri dönmek

RPG Engine, her sahnenin sonunda tüm kampanyayı kaydeder. Gerisini **kayıtlar** ayarı belirler:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **permadeath** | hayır | asla |
| **checkpoint** | hayır | son kayda, yalnızca karakterin ölürse |
| **boşta** | evet | herhangi bir kayda |

Her modda **baştan başlayabilirsin**: oyunun başından ya da sıfırıncı oturumdan. Bunu sohbette ya da **Kayıtlar**'da yap.

Geri döndükten sonra **yeni bir sohbet aç**: eski sohbet geri alınanı hatırlar. Yeni sohbete *devam* yaz, sonra Kayıtlar'da **Yeni sohbet açtım** düğmesine bas.

### 3.9 Oturumlar: durmak ve geri dönmek

İstediğin zaman dur: *[Bu gecelik burada duralım.]* Her şey zaten dosyalarda kayıtlı. Geri dönmek için ajanını kampanya klasöründe başlat ve *devam* yaz: oyun yöneticisi sana kısa bir özet verir ve devam eder.

### 3.10 Oyun yöneticisinin ruh hâli

Gösterge panelinin üstündeki robot oyun yöneticisidir: yüzü hikâyenin tonunu izler ve henüz bilmediğin hiçbir şeyi ele vermez. Sohbet kapalıyken uyur.

### 3.11 Resimler

RPG Engine, ulaştığın yerlerin, üstlendiğin görevlerin ve karşılaştığın kişilerin resimlerini, **resimler** ayarının dediği gibi yaptırabilir; istediğinde karakterinin portresini de. Bilgisayarında olanı, kendi girişinle kullanır: **Codex** resimleri boyar, yoksa **Claude Code** çizer. Bu bilgisayarın resim yapıp yapamadığını ve yapamıyorsa nasıl kurulacağını **Ayarlar** söyler. Oyun yöneticisine her zaman kendi resmini verebilirsin.

### 3.12 Güvenlik: sınırlar, perdeler ve dur

**Sınırlar** oyunda asla yer almaz; **perdeler** yalnızca sahne dışında geçer. Her an *[dur]* yazabilirsin: oyun yöneticisi o içeriği hemen bırakır ve onu sınırlarına ekler.

### 3.13 Fikrini değiştirmek

Her ayar, sohbette ya da **Ayarlar**'da değiştirilebilir. Oyun yöneticisinin kitapta olmayan bir konuda verdiği karar **emsal** olur; böylece aynı soru bir dahaki sefere aynı yanıtı alır.

---

## 4. Gösterge paneli <!-- icon: party -->

Kendi bilgisayarındaki bir sayfa. Yalnızca o bilgisayarın tarayıcısında açılır ve sohbet açıkken canlıdır. Sohbet kapanınca *Not connected* gösterir. Sonraki sohbetle kendiliğinden geri gelir.

- **Grup**: senin karakter kağıdın ve yoldaşlarınınkiler. Atmak için bir sayıya tıkla. Nereden geldiğini görmek için üstüne gel. Yanında atışlar durur.
- **Sahne**: bulunduğun yer, resmi ve haritası, orada kimlerin olduğu, neler olduğu. Çatışmada sıralar ve karakterinin kartı.
- **Günlük**: görevler, hikâye, notların.
- **Dünya**: karakterinin bildiği hâliyle dünya haritası.
- **Zar tepsisi**: zarları ve bir değiştirici seç, sonra at.
- **Kayıtlar**, **Yardım**, **Ayarlar** ve **Hakkında**, satırın sonunda simgeler olarak. Ayarlar sayfanın kendi tercihlerini de tutar: tema, zar sesi, zar takımı.

Oyun yöneticisi sana bir şey sorduğunda, hangi bölümde olursan ol, bandı üstte durur.

---

## 5. Oyun sistemleri ve ev kuralları <!-- icon: dice -->

### 5.1 Oyun sistemi nedir

Bir oyunun tüm verisi: karakter kağıdı, sayıları, yaratıkları, eşyaları, büyüleri ve kural metinleri. Her kampanya tek bir sistemle oynanır. RPG Engine, karakter kağıdını ve harcanıp geri gelen kaynakları hesaplar. Bir özelliğin nasıl işlediğini ise oyun yöneticisi kurallardan okur ve karar verir, tıpkı bir masada olduğu gibi.

### 5.2 Beşinci baskı, dahil

SRD 5.1'in ırkları, sınıfları, alt sınıfları, bir geçmişi ve bir yeteneği (feat); 319 büyü, silahlar, zırhlar, büyülü eşyalar ve canavarlar; oyun yöneticisinin tam metniyle okuduğu kural bölümleri; baştan sona hesaplanmış karakter kağıdı.

SRD'de olmayan içerikle de oynayabilirsin. Sahip olduğun bir kitaptan gelen içeriği oyun yöneticisi kampanyanın sayfaları olarak yazar, RPG Engine de bunları kendi içeriği gibi kullanır. RPG Engine yalnızca açık içerik sunar. Oyun yöneticisinin bildikleri ise bununla sınırlı değildir.

Kendi kılavuzların kitaplığın olabilir. Oyun yöneticisine nerede olduklarını söyle: *[Kılavuzlarım D:\Books\5e klasöründe.]* Ya da klasörü Packages › Library bölümünden ekle. Bilgisayarının gösterdiği pencerede bir kez evet de. RPG Engine kılavuzları bu bilgisayarda okur. Her kampanya, orada açtığın klasörleri kullanır. Oyun yöneticisi bir kurala karar verirken SRD'den sonra bu klasörlerde arama yapar ve kitabı ile sayfayı belirtir. Kılavuzlar en iyi metin olarak ya da metni seçilebilen PDF olarak okunur. Taranmış bir PDF ise sayfaların görüntülerinden okunur. Bu yalnızca Windows'ta çalışır, birkaç dakika sürer ve birkaç hata çıkabilir. RPG Engine kılavuzlarını asla değiştirmez, metinlerini hiçbir yere göndermez ve bir kampanyaya kopyalamaz.

### 5.3 Ev kuralları ve kendi eklemelerin

Oyun yöneticisine söyle: *[Ev kuralı: saldırıda doğal 1 gelirse silahını düşürürsün.]* Oyun yöneticisi bunu masanın bir anlaşması olarak tutar. Gerekirse bir sayfa ya da karakter kağıdına bir sayı da yazar. Önceden yazılmış ev kuralları, kampanyanın `rules` klasörüne metin dosyaları olarak konabilir.

### 5.4 Kendi oyun sistemini ekleme ya da içe aktarma

Henüz yok: bugün RPG Engine yalnızca beşinci baskıyı oynatır ([Daha sonra gelecekler](#9-coming-later)).

---

## 6. Eklentiler <!-- icon: plus -->

Henüz değil. Bir eklenti, oyun sisteminin üstüne kampanyaya bir şey ekleyecek: bir dünya, bir macera, hava durumu gibi bir özellik, paylaşılacak ev kuralları.

---

## 7. Kampanya nereden gelir ve dili <!-- icon: world -->

### 7.1 Dünya edinmenin üç yolu

- **Anında yaratılan**: Oyun yöneticisi, senin fikrinden yola çıkarak her yeri, kişiyi ve olay örgüsünü tam ihtiyaç duyulmadan önce kurar ve saklar.
- **Başta hazırlanan**: Aynısıdır, ama dünya oyundan önce kurulur.
- **Kendi macerandan ya da kitabından**: Oyun yöneticisine dosyasını ver, *[Bu macerayı kampanyamız olarak içe aktar: D:\Books\adventure.pdf. İçindekilerden hiçbirini bana söyleme.]* En iyi metin, EPUB, Word belgesi ya da metni seçilebilen bir PDF olarak okunur. Taranmış bir PDF sayfalarının görüntülerinden okunur. Bu yalnızca Windows'ta olur, yavaştır ve birkaç hata çıkabilir. Bilgisayarındaki Codex ya da Claude Code dosyayı sohbetin dışında okur, dashboard da ne kadarının bittiğini gösterir. Bir romandan yola çıkılıyorsa oyun yöneticisi nereden başlanacağını önerir. Yerleri, karakterleri ve sırları o yazar.

Bir kampanya yalnızca bir kez oynanır. Aynı macerayı yeniden oynamak için yeni bir kampanya oluştur.

### 7.2 Diller

Her kampanya tek bir dilde olur: oyun yöneticisinin dilinde. Dashboard da bu dili izler. Dashboard 26 dille gelir. Başka bir dil, bilgisayarında Codex ya da Claude Code tarafından çevrilir. Onlar yoksa sohbette oyun yöneticisi çevirir. Beşinci baskının İtalyanca terimleri resmî İtalyanca SRD'den gelir. Kural metni İngilizce kalır, oyun yöneticisi onu senin dilinde anlatır.

---

## 8. Meraklısına: kampanya klasörü <!-- icon: list -->

Onu hiç açman gerekmez. Kampanyanın sırlarını da içerir. İçinde şunlar var: `campaign.yaml` (ayarların), `state.yaml` (oyunun geldiği yer), `world/` (her karakter, yer, görev ve diğerleri için birer markdown sayfası), `rules/` (ev kuralların), `images/`, `log.jsonl` (her değişiklik), `.saves/`, `.player/` (notların) ve yapay zekâ ajanlarına RPG Engine'in nerede olduğunu söyleyen küçük dosyalar. Sayfalar Obsidian'ın biçimini kullanır. Bir sayfayı elle değiştirirsen oyun yöneticisi bunu bir sonraki cevabında öğrenir.

RPG Engine bu klasörün içinde kalır: oyunu yalnızca burada okur ve yazar, diğer dosyalarına asla dokunmaz. Kılavuzlarının klasörlerini ise yalnızca okur. Bunun dışında yalnızca kendi veri klasörlerini tutar (dashboard'un çevirileri, kılavuzlarından okuduğu metin ve izin verirsen kurduğu Codex ya da Claude Code) ve bir görsel çizilirken geçici klasörler kullanır. Ajanın bilgisayarında başka bir şey yapmak isterse önce sana sorar.

Oyun yöneticisinin kullandığı her komut kampanya klasöründe de çalıştırılabilir: `rpg --help` hepsini listeler. Birçoğu kampanyanın sırlarını yazdırır.

---

## 9. Daha sonra gelecekler <!-- icon: hourglass -->

- **Oyun yöneticisi olarak sen**, grubu ise yapay zekâ oynar.
- **Yazar modu**: yapay zekâyla bir macera yaz, sonra dışa aktar ve paylaş.
- **Aynı bilgisayarda birkaç oyuncu**: her biri kendi karakteriyle, aynı sohbette sırayla oynar.
- **Eklentiler**: ayarlar, maceralar, özellikler ve ev kuralları.
- **Başka oyunlar**: daha fazla oyun sistemi ve kendi sistemin.

---

## 10. Sorular ve sorunlar <!-- icon: info -->

### Sorular

**Kuralları bilmem gerekiyor mu?** Hayır. Öğretici akıl hocasını seç ve istediğin zaman köşeli parantez içinde sor.

**Oyun yöneticisi hile yapabilir mi?** RPG Engine'in yaptığı bir atışı değiştiremez; yalnızca hikâye zorluğunda bu mümkündür. Belirlenmiş gerçekleri de değiştiremez.

**Bir maliyeti var mı?** RPG Engine ücretsizdir. Oyun yöneticisi ajanının planıyla ya da yerel bir modelle kendi bilgisayarında çalışır. Bir oyun akşamı uzun bir sohbettir: en küçük planlarda akşam bitmeden planın sınırına ulaşabilirsin. Görseller ve çeviriler aynı planı kullanır.

**Telefonumda oynayabilir miyim?** Hayır: oyun yöneticisi bilgisayarında çalışır ve gösterge paneli yalnızca orada açılır.

**Arkadaşlarımla oynayabilir miyim?** Henüz değil: bugün tek oyuncu, tek karakter ve yoldaşlar var ([Daha sonra gelecekler](#9-coming-later)).

**Bir dahaki sefere başka bir yapay zekâ kullanabilir miyim?** Evet: kampanyayı başka bir ajanda aç ve *devam* yaz.

### Sorunlar

**Gösterge paneli açılmıyor.** Oyun yöneticisine sor: `[Gösterge panelinin bağlantısı ne?]`. Yalnızca o kampanyada bir sohbet açıkken, oyun yöneticisinin ilk yanıtından sonra çalışır.

**Oyun yöneticisi oyunu bilmiyor gibi.** Ajanın RPG Engine'i yüklemedi. Onu kampanya klasöründe başlattığından ve ona güvendiğinden emin ol. Claude Code'da `/mcp` yaz ve `rpg`'yi yeniden bağla. Codex'te kampanya klasöründeki `codex mcp list` çıktısında `rpg` görünmelidir. `rpg --version` bulunamıyorsa RPG Engine'i yeniden kur ([2.2](#22-install)).

**Güncelleme.** `npm install -g rpg-engine` komutunu yeniden çalıştır, sonra yeni bir sohbet aç: çalışan bir oyun yöneticisi başladığı sürümü korur.

**Oyun yöneticisi geri aldığım bir şeyi hatırlıyor.** Yeni bir sohbet aç ve Kayıtlar'da **Yeni sohbet açtım** düğmesine bas.

**Hiç görsel çıkmıyor.** Ayarlar > Görseller, bu bilgisayarın görsel yapıp yapamadığını ve nasıl yapacağını söyler.

**Kurulum başarısız oluyor ya da `rpg` başlamıyor.** `node --version` 22 ya da daha yenisini göstermeli. Windows'ta RPG Engine'i ve kampanyalarını `&` içeren yollardan uzak tut.

**Gösterge paneli bağlantısı değişti.** Başka bir program olağan adresi aldı; oyun yöneticisi sana yeni bağlantıyı verir.
