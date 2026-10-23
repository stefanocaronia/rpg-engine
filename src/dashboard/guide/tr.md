<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb d90880b0 1e0398b1 e9b90526 ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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
- [nodejs.org](https://nodejs.org) adresinden **Node.js 22** veya daha yenisi. Yanında `npm` gelir; RPG Engine'i o kurar.
- Bir **terminal**: Windows'ta Terminal ya da PowerShell; macOS'ta Terminal. Terminali bir klasörde açmak için klasöre sağ tıkla ve **Terminalde Aç** (Windows) ya da **Servisler > Klasörde Yeni Terminal** (macOS) seçeneğini seç.
- Oyun yöneticisi için bir **yapay zekâ ajanı** ([2.4](#24-connect-your-ai)). Ajanın sunduğu **en büyük modeli** kullan: küçük bir modeli sır vermeye ya da kuralları esnetmeye ikna etmek daha kolaydır.

### 2.2 Kurulum

```text
npm install -g rpg-engine
```

`rpg --version` komutu kurulumun işe yaradığını doğrular. `rpg` komutunu kampanya başına bir kez, kampanyayı oluşturmak için kullanırsın. Sonrasında ajanın RPG Engine'i kendisi başlatır.

### 2.3 Kampanya oluşturma

Oyunlarını tuttuğun klasörde bir terminal aç ([2.1](#21-what-you-need) nasıl yapılacağını anlatır):

```text
rpg init "The Salt Isles"
```

Bu komut `The Salt Isles` adında bir klasör ve içinde yeni bir kampanya oluşturur. `cd "The Salt Isles"` ile klasörün içine gir. Yerini unutma: oynadığın her seferde buraya döneceksin. Geri kalan her şeyi sonra, sohbette ya da panoda seçersin. `rpg init --help` komutu, bazılarını şimdiden seçmen için seçenekleri listeler; örneğin `--language it` ya da `--difficulty hard`.

Oyun yöneticisi senin için kampanya oluşturamaz: `init` çalışmadan önce ajanına RPG Engine'in nerede olduğunu söyleyen hiçbir şey yoktur.

### 2.4 Yapay zekânı bağla

Oyun yöneticisi bir **yapay zekâ ajanında** çalışır. Bu, terminalde ya da masaüstünde çalışan, bilgisayarındaki dosyalarla iş yapabilen bir yapay zekâ uygulamasıdır; Claude Code ve Codex gibi. claude.ai ya da ChatGPT gibi düz bir sohbet veya bir telefon uygulaması yetmez: oyun yöneticisinin bilgisayarındaki kampanya dosyalarına erişmesi gerekir. Her ajanın kendi planı ve girişi vardır: Claude Code için ücretli bir Claude planı, Codex için bir ChatGPT girişi. Ajanı kendi sayfasından bir kez kurarsın: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: kampanya klasöründe `claude` yaz. Klasöre güvenip güvenmediğini sorduğunda **Yes, I trust this folder** seçeneğini seç; dikkat, önceden seçili gelen cevap *No, exit* olur. Kampanyada ayrıca küçük bir kanca (hook) vardır: `rpg --listen`. Soruda görünmez; panodan bir şey yaptığında oyun yöneticisine hemen haber verir.
- **Codex**: kampanya klasöründe `codex` yaz ve klasöre güvenip güvenmediğini sorduğunda evet de. Masaüstü uygulamasında, ayarlardan oyunun sohbetleri için belleklerin kapalı olduğunu kontrol et.
- **Başka bir ajan**: ajanı kampanya klasöründe başlat ve ona `rpg mcp` MCP sunucusunu ver. RPG Engine standart bir MCP sunucusudur: MCP destekleyen her ajan oyun yöneticisi olabilir, yerel olanlar da.

Biz **Claude Code** ile oynuyor ve test ediyoruz. **Codex** bağlı ve kontrol edildi, ama onunla henüz tam bir kampanya oynanmadı. Kampanya, ajanın kendi belleğini kapatır: oyun dosyalarında yaşar, böylece bir kayda dönmek gerçekten geri dönmek olur.

### 2.5 İlk sohbet

İstediğini yaz; örneğin *Selam! Başlayalım.* Oyun yöneticisi her sohbetin ilk cevabında sana **panonun bağlantısını** verir; şuna benzer bir şey: `http://127.0.0.1:4750`. Bağlantıyı aç ve sohbetin yanında tut.

Oyun yöneticisinin mesajları arasında ajanın kullandığı araçları gösterir. Ayrıntılarını açma (Claude Code'da ctrl+o), çünkü sırları gösterebilirler.

Yeni bir kampanya üç aşamadan geçer; panonun üstünde görünürler: **1 Ayarlar** (nasıl oynamak istediğin), **2 Sıfırıncı oturum** (karakterini oyun içinde yaparsın), **3 Oyun**.

### 2.6 Ayarlar: nasıl oynayacağını seçmek

Oyun yöneticisi yalnızca eksik kalanı sorar, her seferinde birkaç soru. Panonun **Ayarlar** adımı aynı soruları kartlar olarak gösterir. "Sen karar ver" yazarsan oyun yöneticisi seçer. Her şey sonradan, sohbette ya da **Ayarlar**'da değiştirilebilir.

| Ayar | Neye karar verir | Değerler |
|---|---|---|
| **Akıl hocası** | Oyun yöneticisinin sana kuralları ne kadar öğrettiği | kapalı, ipuçları, öğretici |
| **Zorluk** | Dünyanın ne kadar zor oynadığı | hikâye, kolay, normal, zor, acımasız |
| **Ölümcüllük** | Bir çatışmada yere düşmenin ne anlama geldiği | anlatı (asla ölmezsin), destansı (yalnızca önemli olduğunda), zarlar |
| **Kayıtlar** | Ne zaman geri dönebileceğin | kalıcı ölüm, kontrol noktası, serbest ([3.8](#38-saves-and-going-back)) |
| **Kural sıkılığı** | Yiyecek, ışık ve yolculuğun kuralları ne kadar yakından izlediği | akıcı, kurallı, simülasyon |
| **Zarlar** | Zarları kimin attığı | dijital, fiziksel |
| **Birimler** | Mesafeler ve ağırlıklar | metrik, imperial |
| **Karakter sesleri** | Karşılaştığın karakterler adına kimin konuştuğu, oyun yöneticisinden karakterlere doğru: hep oyun yöneticisi; önemli anlarda karakterin kendisi, yalnızca bildiğini bilerek, oyun yöneticisinin seçtiği gibi; ya da her zaman karakterin kendisi, ana karakterler için veya herkes için, daha yavaş ve daha pahalı, yapay zekâ uygulaman destekliyorsa | oyun yöneticisi, ara sıra, ana karakterler, herkes |
| **Yoldaşlar** | Seninle kimin yolculuk ettiği | yok, seninle yapılan, oyun yöneticisinin yaptığı, oyunda tanışılan |
| **Görseller** | Yerlerin, görevlerin ve karşılaştığın kişilerin görselleri | yok, istek üzerine, yeni yerler, görevler ve karşılaştığın kişiler ([3.11](#311-pictures)) |
| **Sınırlar** ve **Perdeler** | Hiç görünmeyen konular ve yalnızca sahne dışında olanlar | listeler |
| **Dil** | Oyunun ve panonun dili | herhangi biri |

Beşinci sürüm **ilerleme** ekler: deneyim puanları ya da kilometre taşları.

Yazılı bir dünya yoksa oyun yöneticisi ayrıca bir **öncül** (tür, ton, birkaç öğe, kendi sözlerinle) ve **hazırlık** sorar: dünyayı oynarken akış içinde mi kuracak, yoksa baştan hepsini mi.

**Oyun yöneticisinin üslubu** hiç sorulmaz, ama sohbette ya da **Ayarlar**'da değiştirebilirsin: **anlatım** (sade, edebi, pulp, alaycı), uydurduğu **hikâyeler** (durumlar, yaylar, bölümler, gizem), **tarzında yazması** için bir yazar ya da **kendi sözlerinle** başka herhangi bir şey.

### 2.7 Sıfırıncı oturum: karakterin

Karakterini oyun yöneticisiyle birlikte yaparsın, tıpkı bir masada olduğu gibi. Oyun yöneticisinden yapmasını istemediğin sürece her seçim senindir: dolu bir fikirle, belirsiz bir fikirle ya da hiçbir şeyle gelebilirsin. Oyun yöneticisi, herhangi bir zar atılmadan önce yetenek puanlarının nasıl belirleneceğini anlatır. Hikâyen hiçbir zaman zorunlu değildir; verirsen oyun yöneticisi onu senin sözlerinle yazar. Sonra oyun yöneticisi karakterin için bir görsel ister ([3.7](#37-your-characters-story-and-picture)). Karakter kağıdını RPG Engine hesaplar: hiçbir zaman toplama çıkarma yapmazsın.

---

## 3. Oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterinin ne yaptığını ya da ne dediğini kendi sözlerinle yaz:

> Han sahibine bu gece başka kimin uğradığını soruyorum.

Hikâyenin dışında konuşmak için köşeli parantez kullan: *[Tutuşma nasıl işliyor?]* Oyun yöneticisi de köşeli parantezle yanıt verir.

Sen neyi denediğini söylersin; ne olduğunu oyun yöneticisi söyler. Oyun yöneticisi karakterin yerine asla karar vermez ve motordan asla söz etmez. Ona panonun nasıl kullanılacağını sorabilirsin.

**Panodan eylem yapmak**: karakter kağıdında bir ada tıkla; örneğin bir silaha, bir büyüye ya da taşıdığın bir eşyaya. Sonra kimin için olduğunu seç. Konuşmak için bir kişiye de tıklayabilirsin. Pano senin cümleni yazar, örneğin *Kapüşonlu Haydut 1'e Gürz ile saldırıyorum.* **Oyun yöneticisine söyle** düğmesine basmadan önce cümleyi değiştirebilirsin. Oyun yöneticisi bunu sohbette söylenmiş gibi duyar ve diğer sözlerin gibi karara bağlar. Yapay zekâ uygulaman bunu kendiliğinden duyamıyorsa **Kopyala** cümleyi sohbete yapıştırmaya hazırlar.

### 3.2 Atışlar

Oyun yöneticisi atışı yalnızca sonuç belirsizse ve önemliyse ister. Önce neyin tehlikede olduğunu söyler. Sonra:

- **Panoda** bir afiş her kontrol için bir düğme gösterir; örneğin *Akrobasi +4 · avantajlı*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Karakter kağıdında yanan satıra da tıklayabilir, zarları zar tepsisinden atabilir ya da afişe başka bir şey yazabilirsin.
- **Elle** seçeneği afişin köşesinde ya da **Ayarlar**'da bulunur: afiş neyi atacağını söyler, sen de atışı karakter kağıdından ya da zar tepsisinden yaparsın.
- **Gerçek zarlar** için zar ayarını fiziksel yap: attığın yüzleri yazarsın, *[14 attım.]*, RPG Engine değiştiricilerini ekler.

**Serbest atışlar**: eğlenmek için karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Bu atışlar hiçbir şeye sayılmaz ve oyun yöneticisi onları asla görmez.

**Oyun yöneticisinin atışları**, gizli olanlar hariç, atış sütununda görünür. Her zaman sorabilirsin: *[O atış gerçek miydi?]* Gizli bir atış için oyun yöneticisi, atışın sen sormadan önce yapıldığını kanıtlayan bir parmak izi verir.

### 3.3 Sahneler ve çatışmalar

Hikâye **sahneler** hâlinde ilerler: bir çatışma, bir konuşma, keşif, yolculuk, dinlenme. Her sahnenin sonunda oyun kendiliğinden kaydedilir ve sahne günlüğüne eklenir.

Çatışmada oyun yöneticisi senin olmayan her sırayı anlatır ve karar verebileceğin yerde durur. **Sahne** sayfasının üstünde sıranın kimde olduğunu ve sonra kimin geleceğini görürsün. Karakterinin kartı haritanın yanında durur. Sıra düzeni, grubunun can puanları ve düşmanların ne kadar yaralı göründüğü (sözlerle) sayfanın yanında kalır. Karakterin yere düşerse ölüm kurtarmaları sayfada büyük görünür.

### 3.4 Zaman, yolculuk ve hareket eden dünya

RPG Engine tarihi tutar; oturumlar arasında zaman geçmez. Dinlendiğini söyle, *Uzun bir dinlenme yapıyoruz*, oyun yöneticisi onaylayınca dinlenme geri gelmesi gerekeni geri getirir. Kısa bir dinlenmede oyun yöneticisi panodan kaç can zarı harcayacağını sorabilir: zarları tek tek at, her birinin ne kadar iyileştirdiğini gör ve istediğinde dur. Nereye gittiğini söyle, *Kuzeye, Rocca'ya giden yola çıkıyoruz*, RPG Engine yolu, mesafeyi ve gün sayısını hesaplar; yolda bir şey olursa durur. Para, oyunun madeni paralarıyla sayılır, para üstü dahil.

Kötü karakterlerin son tarihli planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir. Onların izlerini görürsün ama saatin kendisini asla görmezsin.

### 3.5 Haritalar

**Dünya**, karakterinin bildiği yerleri, aralarındaki yolları ve yürüdüğün izi gösterir; gerisi sisle kaplıdır. **Sahne**, bulunduğun yerin haritasını (varsa) ve kimin nerede durduğunu gösterir. Çatışmada, sıran geldiğinde, ulaşamayacağın kareler örtülüdür. Oyun yöneticisi nereye gideceğini sorduğunda bir kareye dokun ya da onu yaz, örneğin *E4*.

### 3.6 Görevler, günlük ve notlar

Karakterinin üstlendiği iş, **Günlük**'te bir görev olur; hedefleri, son tarihi ve neyi ölçtüğü ile birlikte. Görünür kalması için yıldızla: Sahne'nin en üstünde durur. Günlük ayrıca **hikâyeni** sahne sahne anlatır ve **notlarını** saklar. Notlar özeldir; bir notu **Paylaş** ile paylaşmazsan oyun yöneticisi onu görmez. Paylaşırsa, onu senin düşüncen olarak duyar, asla bir gerçek olarak değil. **Yoldaşlar** altında yoldaşlarının günlüklerini okursun: arada bir, bir günün ya da bir görevin sonunda, ne düşündüklerini ve hissettiklerini anlatan birkaç satır yazarlar.

### 3.7 Karakterinin hikâyesi ve resmi

Karakter kağıdında **Açıklama** kartında karakterinin hikâyesi için bir kutu vardır: sen evet dedikten sonra oyun yöneticisi onu oraya yazar. Resim için oyun yöneticisine bir dosya ver (PNG, JPEG, WebP ya da SVG, en çok 5 MB) ve bilgisayarında nerede olduğunu söyle. Ya da bir portre yaptır ([3.11](#311-pictures)): *[Bana bir portre yap: örgülü gri saçlar, çenede bir yara izi.]*

### 3.8 Kayıtlar ve geri dönmek

RPG Engine tüm kampanyayı her sahnenin sonunda kaydeder. Gerisini **kayıt** ayarı belirler:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **permadeath** | hayır | asla |
| **checkpoint** | hayır | son kayda, yalnızca karakterin ölünce |
| **free** | evet | herhangi bir kayda |

Her kipte **baştan başlayabilirsin**: oyunun başından ya da sıfırıncı oturumdan. Bunu sohbette ya da **Kayıtlar**'da yap.

Geri döndükten sonra **yeni bir sohbet aç**: eski sohbet geri alınanı hâlâ hatırlar. Yeni sohbete *devam* yaz, sonra Kayıtlar'da **Yeni sohbet açtım** düğmesine bas.

### 3.9 Oturumlar: durmak ve geri dönmek

İstediğin zaman dur: *[Bu gece burada duralım.]* Her şey zaten dosyalarda kayıtlıdır. Geri dönmek için ajanını kampanya klasöründe başlat ve *devam* yaz: oyun yöneticisi sana kısa bir özet verir ve devam eder.

### 3.10 Oyun yöneticisinin ruh hâli

Panonun en üstündeki robot oyun yöneticisidir: yüzü hikâyenin tonunu izler ve henüz bilmediğin bir şeyi asla ele vermez. Sohbet kapalıyken uyur.

### 3.11 Resimler

RPG Engine; ulaştığın yerlerin, üstlendiğin görevlerin ve karşılaştığın kişilerin resimlerini, **resim** ayarının dediği gibi, yaptırabilir. İstediğinde karakterinin portresini de yapar. Kendi Codex ya da Claude Code'unu, kendi girişinle, kendi planında ve sınırları içinde kullanır: **Codex** onları boyar, o yoksa **Claude Code** çizer. **Ayarlar**, bu bilgisayarın resim yapıp yapamayacağını ve yapamıyorsa nasıl kurulacağını söyler. Oyun yöneticisine her zaman kendi resmini verebilirsin.

### 3.12 Güvenlik: sınırlar, perdeler ve dur

**Sınırlar** oyunda asla görünmez; **perdeler** yalnızca sahne dışında olur. İstediğin an *[dur]* yaz: oyun yöneticisi o içeriği hemen bırakır ve onu sınırlarına ekler.

### 3.13 Fikrini değiştirmek

Her ayar değişebilir; sohbette ya da **Ayarlar**'da. Oyun yöneticisinin kitapta olmayan bir konuda verdiği karar bir **emsal** olur; böylece aynı soru bir dahaki sefer aynı yanıtı alır.

---

## 4. Pano <!-- icon: party -->

Kendi bilgisayarındaki bir sayfa. Yalnızca o bilgisayarın tarayıcısında açılır ve sohbet açıkken canlıdır. Sohbet kapanınca *Bağlı değil* yazar; bir sonraki sohbetle kendiliğinden geri gelir.

- **Grup**: senin ve yoldaşlarının karakter kağıtları. Atmak için bir sayıya tıkla; nereden geldiğini görmek için üzerine gel. Yanında atışlar durur.
- **Sahne**: bulunduğun yer, resmi ve haritası, orada kimlerin olduğu, neler olduğu. Çatışmada sıralar ve karakterinin kartı.
- **Günlük**: görevler, hikâye, yoldaşlarının günlükleri, notların.
- **Dünya**: karakterinin bildiği hâliyle dünya haritası.
- **Zar tepsisi**: zarları ve bir değiştirici seç, sonra at.
- **Kayıtlar**, **Yardım**, **Ayarlar** ve **Hakkında**, satırın sonunda simgeler olarak durur. Ayarlar sayfanın kendi tercihlerini de içerir: tema, zar sesi, zar takımı.

Oyun yöneticisi sana bir şey sorduğunda, hangi bölümde olursan ol, afişi en üstte kalır.

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

## 7. Bir kampanya nereden gelir ve dili <!-- icon: world -->

### 7.1 Dünyaya sahip olmanın üç yolu

- **Anında yapılan**: öncülünden yola çıkarak oyun yöneticisi her yeri, kişiyi ve olay örgüsünü tam ihtiyacın olmadan önce kurar ve saklar.
- **Baştan hazırlanan**: aynısı, ama dünya oyundan önce kurulur.
- **Kendi macerandan veya kitabından**: oyun yöneticisine dosyasını ver, *[Bu macerayı kampanyamız olarak içe aktar: D:\Books\adventure.pdf. İçindekilerden hiçbirini bana söyleme.]* En iyi metin, EPUB, Word belgesi veya metni seçilebilen bir PDF olarak okunur. Taranmış bir PDF sayfalarının görsellerinden okunur; yalnızca Windows'ta, yavaş ve birkaç hatayla. Kendi Codex'in veya Claude Code'un onu sohbetin dışında okur, olmazsa sohbetteki oyun yöneticisi okur; senin planınla. Belgenin tamamı OpenAI'a veya Anthropic'e gider; hesabının koşullarına ve eğitim konusundaki tercihine tabidir. Panel ne kadar ilerlediğini gösterir. Bir romandan başlıyorsan oyun yöneticisi nereden başlanacağını önerir. Yerleri, karakterleri ve sırları yazar.

Bir kampanya bir kez oynanır: aynı macerayı yeniden oynamak için yeni bir kampanya oluştur.

### 7.2 Diller

Kampanya başına tek dil vardır: oyun yöneticisinin dili; panel onu izler. Panel 26 dille gelir. Başka her dil bilgisayarında Codex veya Claude Code tarafından, onlar yoksa sohbetteki oyun yöneticisi tarafından çevrilir. Beşinci sürümün İtalyanca terimleri resmî İtalyanca SRD'den gelir. Kural metni İngilizce kalır, oyun yöneticisi onu senin dilinde anlatır.

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

**Kuralları bilmem gerekiyor mu?** Hayır. Eğitim akıl hocasını seç ve istediğin zaman köşeli parantez içinde sor.

**Oyun yöneticisi hile yapabilir mi?** RPG Engine'in yaptığı bir atışı değiştiremez; yalnızca hikâye zorluğunda değiştirebilir. Belirlenmiş gerçekleri de değiştiremez.

**Bir maliyeti var mı?** RPG Engine ücretsizdir. Oyun yöneticisi ajanının planında ya da kendi bilgisayarında yerel bir modelle çalışır. Bir oyun akşamı uzun bir sohbettir: en küçük planlarda akşam bitmeden planın sınırına ulaşabilirsin. Görseller, çeviriler ve içe aktarmalar aynı planı kullanır. RPG Engine'in kendisi çağrı başına ücretlenen bir API anahtarını asla kullanmaz: ajanında anahtarla değil, hesabınla oturum aç.

**Telefonumda oynayabilir miyim?** Hayır: oyun yöneticisi bilgisayarında çalışır ve panel yalnızca orada açılır.

**Arkadaşlarımla oynayabilir miyim?** Henüz değil: bugün bir oyuncu, bir karakter, artı yoldaşlar var ([Yakında](#9-coming-later)).

**Bir dahaki sefere farklı bir yapay zekâ kullanabilir miyim?** Evet: kampanyayı başka bir ajanda aç ve *devam* yaz.

### Sorunlar

**Panel açılmıyor.** Oyun yöneticisine sor: `[Panelin bağlantısı ne?]`. Yalnızca o kampanyada bir sohbet açıkken, oyun yöneticisinin ilk yanıtından sonra çalışır.

**Oyun yöneticisi oyunu bilmiyor gibi.** Ajanın RPG Engine'i yüklemedi. Onu kampanya klasöründe başlattığını ve klasöre güvendiğini kontrol et. Claude Code'da `/mcp` yaz ve `rpg`'yi yeniden bağla. Codex'te kampanya klasöründe `codex mcp list` çıktısında `rpg` görünmelidir. `rpg --version` bulunamıyorsa RPG Engine'i yeniden kur ([2.2](#22-install)).

**Güncelleme.** `npm install -g rpg-engine` komutunu yeniden çalıştır, sonra yeni bir sohbet aç: çalışan bir oyun yöneticisi başladığı sürümü korur.

**Oyun yöneticisi geri aldığım bir şeyi hatırlıyor.** Yeni bir sohbet aç ve Kayıtlar'da **Yeni sohbet açtım** düğmesine bas.

**Hiç görsel çıkmıyor.** Ayarlar > Görseller, bu bilgisayarın görsel yapıp yapamadığını ve nasıl yapabileceğini söyler.

**Kurulum başarısız oluyor veya `rpg` başlamıyor.** `node --version` çıktısı 22 veya daha yeni olmalı. Windows'ta RPG Engine'i ve kampanyalarını `&` içeren yollardan uzak tut.

**Panel bağlantısı değişti.** Başka bir program olağan adresi aldı; oyun yöneticisi sana yeni bağlantıyı verir.
