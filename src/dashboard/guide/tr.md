<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,e51b18d7,be38a186 f2f35057,b493dc90 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,afad321d,99406ef2,f831ecd8,d69e75c5,b5544596,5c016bb1,3afa0abc,af2ce7c5,bc923cc3,07c079ea,30f9af2f,60051919,8619db5f,06d7d789,e6f82f9e,6def7d66,f27372ca,d904fdec,8da0dbd5,197704ab,de62cd09,f7bd4d35,56b73d9b,d9fbeec2,b8c831ca,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e2d161a6,25f9bdf8,d8c01f15,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,3de0391e,15e36217,cb7d8189,bbee57ae,056b4e29,2ef22287,d61653a8,e47ab79b,f4c26681,20018bab,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,44639926,86179abe,323d8fa3,f8d6b2fd,18bc17d2,3bbb14f4,2b2d7c37,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,92e343cc,67dbbc85,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,6ea1911c,b8e71497,32482cb4,65c75baa,cb3f91d5 eac34391,4ee44b3b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,b830ae6c,697b0622,180f77d8,e0f88bdb,1e0ccfed,05fde17f,5070d986,891d9bc7,5b0bb1d2,6b115391,5db3836c,252805d8,df64a3bb,e214ff4a. Change the English, then run it again. -->
# RPG Engine: eksiksiz kılavuz

**RPG Engine**, masa başı rol yapma oyununu **yapay zekâ oyun yöneticisiyle** oynamanı sağlar. Oyun yöneticisiyle bir **sohbette** konuşursun; RPG Engine ise arka planda çalışır: **dünyayı hatırlar**, **zarları atar** ve **hesapları tutar**. Sohbetin yanında tarayıcında bir sayfa açık tutarsın: **gösterge paneli**. Orada karakter kağıdın, zarların, haritaların ve günlüğün durur.

Bu kılavuz oyuncular için yazıldı: program yazmayı bilmen gerekmez.

## Hızlı başlangıç <!-- icon: send -->

1. [nodejs.org](https://nodejs.org) adresinden **Node.js** kur (LTS sürümü).
2. Bir **yapay zekâ ajanı** kur ve giriş yap. Oyun yöneticisi bu programın içinde çalışır. Örneğin Claude Code ya da Codex ([2.4](#24-connect-your-ai)).
3. Node.js kurulduktan sonra açtığın yeni bir terminalde RPG Engine'i kur: `npm install -g rpg-engine`.
4. Bir kampanya oluştur: `rpg init "The Salt Isles"`.
5. Yeni klasöre gir, `cd "The Salt Isles"`, ve ajanını orada başlat: Claude Code için `claude`, Codex için `codex`. Klasöre güvenip güvenmediğini sorduğunda evet de ([2.4](#24-connect-your-ai)), sonra *Merhaba! Başlayalım.* yaz. Oyun yöneticisi gösterge panelinin bağlantısıyla yanıt verir.

## 1. RPG Engine nedir <!-- icon: about -->

| Kim | Ne yapar |
|---|---|
| **Sen** | Karakterini oynarsın: karakterin ne yapar, ne söyler, neyi dener. |
| **Oyun yöneticisi** (yapay zekâ) | Hikâyeyi anlatır, diğer herkesi oynar, ne olacağına karar verir, atış ister. |
| **RPG Engine** | Dünyayı dosyalarda tutar, zarları atar, can puanını, parayı, zamanı ve mesafeleri sayar, sırları sen keşfedene kadar saklar. |

Dünya bir akşamdan ötekine aynı kalır. Yeni bir sohbette de, farklı bir yapay zekâyla da değişmez:

- **Söylenen şey doğru kalır.** Ölen kötü karakter ölü kalır.
- **Zarlar gerçektir.** Oyun yöneticisi onları eğip bükemez. Tek istisna en kolay zorluk seviyesidir; onu seçersen olur.
- **Sırlar sır kalır.** Oyun yöneticisi sana karakterinin bilmediği şeyi asla söylemez.
- **Dünya hareket eder.** Sen dinlenirken ya da yolculuk ederken tehditler ilerler ve belirtilerini görürsün.
- **Bir macera, bilgisayarındaki bir klasördür.** Dilediğin zaman bırak, sonra devam et.

Bir oyun, oyun sistemiyle gelir. Oyun sistemi, oyun yöneticisinin macerana kurduğu bir pakettir. Bugün bizim sistemimiz **beşinci sürüm**, ücretsiz System Reference Document 5.1'den gelir. Sistem olmadan serbest oynarsın: sayısız bir hikâye. Başkaları da gelecek ([Daha sonra gelecekler](#9-coming-later)).

---

## 2. Başlarken <!-- icon: path -->

### 2.1 Neye ihtiyacın var

- Windows, macOS veya Linux yüklü bir bilgisayar ve bir web tarayıcısı.
- [nodejs.org](https://nodejs.org) adresinden **Node.js 24** veya daha yenisi. Yanında `npm` gelir; RPG Engine'i o kurar.
- Bir **terminal**: Windows'ta Terminal ya da PowerShell; macOS'ta Terminal. Terminali bir klasörde açmak için klasöre sağ tıkla ve **Terminalde Aç** (Windows) ya da **Servisler > Klasörde Yeni Terminal** (macOS) seçeneğini seç. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse, bir kez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz ve evet de.
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

Oyun yöneticisi bir **yapay zekâ ajanında** çalışır. Bu, terminalde ya da masaüstünde çalışan, bilgisayarındaki dosyalarla iş yapabilen bir yapay zekâ uygulamasıdır; Claude Code ve Codex gibi. claude.ai ya da ChatGPT gibi düz bir sohbet veya bir telefon uygulaması yetmez: oyun yöneticisinin bilgisayarındaki kampanya dosyalarına erişmesi gerekir. Her ajanın kendi planı ve girişi vardır: Claude Code için ücretli bir Claude planı, Codex için bir ChatGPT girişi. Ajanı kendi sayfasından bir kez kurarsın: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://developers.openai.com/codex).

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

Yazılı bir dünya yoksa oyun yöneticisi bir de **temel fikir** sorar (tür, ton, birkaç öğe ve bir oyunda en çok neyden keyif aldığın: çatışma, gizem, sohbet ya da keşif gibi, kendi sözlerinle) ve **hazırlığı** sorar: dünyayı oyun sırasında anında kurmak ya da hepsini baştan hazırlamak.

**Oyun yöneticisinin üslubu** hiç sorulmaz, ama sohbette ya da **Ayarlar**'da değiştirebilirsin: **anlatım** (sade, edebi, pulp, alaycı), uydurduğu **hikâyeler** (durumlar, yaylar, bölümler, gizem), **tarzında yazması** için bir yazar ya da **kendi sözlerinle** başka herhangi bir şey.

### 2.7 Sıfırıncı oturum: karakterin

Karakterini oyun yöneticisiyle birlikte yaparsın, tıpkı bir masada olduğu gibi. Oyun yöneticisinden yapmasını istemediğin sürece her seçim senindir: dolu bir fikirle, belirsiz bir fikirle ya da hiçbir şeyle gelebilirsin. Oyun yöneticisi, herhangi bir zar atılmadan önce yetenek puanlarının nasıl belirleneceğini anlatır. Hikâyen hiçbir zaman zorunlu değildir; verirsen oyun yöneticisi onu senin sözlerinle yazar. Sonra oyun yöneticisi karakterin için bir görsel ister ([3.7](#37-your-characters-story-and-picture)). Karakter kağıdını RPG Engine hesaplar: hiçbir zaman toplama çıkarma yapmazsın.

---

## 3. Oyun oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterin ne yapıyor ya da ne söylüyorsa kendi sözlerinle yaz:

> Han sahibine bu gece başka kimin uğradığını soruyorum.

Hikâyenin dışına çıkmak için köşeli parantez kullan: *[Tutuşma nasıl işliyor?]* Oyun yöneticisi de köşeli parantezle yanıt verir.

Sen neyi denediğini söylersin, ne olacağını oyun yöneticisi söyler. Oyun yöneticisi karakterin adına asla karar vermez ve motordan asla söz etmez. Gösterge panelini nasıl kullanacağını ona sorabilirsin.

**Gösterge panelinden eylem yapmak**: karakter kağıdındaki bir ada tıkla; bu bir silah, bir büyü ya da taşıdığın bir şey olabilir. Sonra kimin için olduğunu seç. Biriyle konuşmak için de kişiye tıklayabilirsin. Gösterge paneli cümleni yazar, örneğin *Kapüşonlu Haydut 1'e Gürz ile saldırıyorum.* **Oyun yöneticisine söyle**'ye basmadan önce cümleyi değiştirebilirsin. Oyun yöneticisi bunu sohbette söylenmiş gibi duyar ve diğer her şey gibi karara bağlar. Yapay zekâ uygulaman cümleyi kendi başına duyamıyorsa **Kopyala** cümleyi sohbete yapıştırmaya hazırlar.

### 3.2 Atışlar

Oyun yöneticisi atış istemeyi yalnızca sonuç belirsizse ve önemliyse yapar. Önce de neyin söz konusu olduğunu söyler. Sonra:

- **Gösterge panelinde** bir bannerda her kontrol için bir düğme çıkar, örneğin *Acrobatics +4 · avantajlı*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Karakter kağıdında yanan satıra da tıklayabilir, zarları zar tepsisinden atabilir ya da bannera başka bir şey yazabilirsin.
- **Elle** seçeneği bannerın köşesinde ya da **Ayarlar**'da bulunur: banner neyi atman gerektiğini söyler, sen de atışı karakter kağıdından ya da zar tepsisinden yaparsın.
- **Fiziksel zarlar** için zar ayarını fiziksel yap: attığın yüzleri yazarsın, *[14 attım.]*, RPG Engine de değiştiricilerini ekler.

**Serbest atışlar**: eğlence için atmak istersen karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Bunlar hiçbir zaman sayılmaz ve oyun yöneticisi onları görmez.

**Oyun yöneticisinin atışları**, gizli olanlar dışında, atış sütununda görünür. İstediğin zaman sorabilirsin: *[Şu atış gerçek miydi?]* Gizli bir atış için oyun yöneticisi, sen sormadan önce yapıldığını kanıtlayan bir parmak izi verir.

### 3.3 Sahneler ve çatışmalar

Hikâye **sahneler** halinde ilerler: bir çatışma, bir konuşma, keşif, yolculuk, bir dinlenme. Her sahnenin sonunda oyun kendiliğinden kaydeder ve sahne günlüğüne girer.

Bir çatışmada, sırası sende olmayan her sırayı oyun yöneticisi anlatır ve karar verebileceğin yerde durur. **Sahne** üstte sırasının kimde olduğunu ve sonra kimin geldiğini, haritanın yanında da karakterinin kartını gösterir. Sıraların düzeni, grubunun can puanları ve düşmanların ne kadar yaralı göründüğü ise sözcüklerle sayfanın yanında durur. Karakterin düşerse ölüm kurtarmaları sayfada büyük görünür.

### 3.4 Zaman, yolculuk ve hareket eden dünya

RPG Engine tarihi tutar. Oturumlar arasında oyun zamanı durur; ama oyun yöneticisinden zamanın akmasına izin vermesini isteyebilirsin, örneğin uzakta geçen her hafta için oyunda bir gün. Dinlendiğini söyle, *Uzun bir dinlenme yapıyoruz*; oyun yöneticisi kabul edince dinlenme geri getirmesi gerekeni geri getirir. Kısa bir dinlenmede oyun yöneticisi gösterge panelinden kaç can zarı harcadığını sorabilir: zarları tek tek at, her birinin ne kadar iyileştirdiğini gör ve istediğin zaman dur. Nereye gittiğini söyle, *Kuzeye, Rocca'ya giden yola çıkıyoruz*; RPG Engine yolu, mesafeyi ve günleri hesaplar, yolda bir şey olursa durur. Para oyunun madeni paralarıyla sayılır, para üstü dahil.

Kötülerin son tarihli planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir. Sen onların izlerini görürsün, saatin kendisini asla.

### 3.5 Haritalar

**Dünya**, karakterinin bildiği yerleri, aralarındaki yolları ve yürüdüğün izi gösterir; gerisi sisle örtülüdür. **Sahne**, bulunduğun yerin haritasını, varsa, kimin nerede durduğuyla birlikte gösterir. Çatışmada, sıran geldiğinde ulaşamayacağın kareler örtülür. Oyun yöneticisi nereye gideceğini sorduğunda bir kareye dokun ya da *E4* gibi yaz.

**Dünya** ayrıca karakterinin bildiklerini de tutar. **Bilgiler**, karakterin tanıdığı kişileri, yerleri, hizipleri, yaratıkları ve hikâyeleri listeler; her biri karakterin bildiği haliyle yazılır. İçinde arama yapabilir ya da birini açıp tamamını okuyabilirsin. Metindeki bir ad, kendi sayfasına götürür. **Belgeler**, bulunan mektupları, duyuruları ve sayfaları tekrar okuman için saklar. **Takvim** bugünü, görevlerinin kalan süreyle birlikte son tarihlerini ve hikâyenin günlerini gösterir. Sahnesi olan bir gün, Günlük'teki bölümlerine götürür.

### 3.6 Görevler, günlük ve notlar

Karakterinin üstlendiği bir iş, **Günlük**'te hedefleri, son tarihi ve neyi ölçtüğüyle bir görev olur. Görünür kalması için yıldızla; Sahne'nin en üstünde durur. Günlük ayrıca **hikâyeni** sahne sahne anlatır ve **notlarını** tutar. Notlar özeldir; bir notu **Paylaş**mazsan oyun yöneticisi onu görmez. Paylaşırsan oyun yöneticisi bunu senin düşüncen olarak duyar, asla bir gerçek olarak değil. **Yoldaşlar** altında yoldaşlarının günlüklerini okursun: arada bir, bir günün ya da görevin sonunda, düşündükleri ve hissettikleri hakkında birkaç satır yazarlar.

### 3.7 Karakterinin hikâyesi ve resmi

Karakter kağıdında **Açıklama** kartında karakterinin hikâyesi için bir kutu vardır; sen evet dedikten sonra oyun yöneticisi onu oraya yazar. Resim için oyun yöneticisine bir dosya ver (PNG, JPEG, WebP ya da SVG, en çok 5 MB) ve bilgisayarında nerede olduğunu söyle. Ya da bir portre yaptır ([3.11](#311-pictures)): *[Bana bir portre yap: örgülü gri saçlar, çenede bir yara izi.]*

### 3.8 Kayıtlar ve geri dönmek

RPG Engine, her sahnenin sonunda tüm kampanyayı kaydeder. Gerisini **kayıt** ayarı belirler:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **permadeath** | hayır | asla |
| **checkpoint** | hayır | son kayda, yalnızca karakterin ölünce |
| **free** | evet | herhangi bir kayda |

Her kipte **baştan başlayabilirsin**: oyunun başından ya da sıfırıncı oturumdan. Bunu sohbette ya da **Kayıtlar**'da yap.

Geri döndükten sonra **yeni bir sohbet aç**: eski sohbet geri alınanı hâlâ hatırlar. Yeni sohbete *devam* yaz, sonra Kayıtlar'da **Yeni sohbet açtım**'a bas.

### 3.9 Oturumlar: durmak ve geri dönmek

İstediğin zaman dur: *[Bu gecelik burada bırakalım.]* Her şey zaten dosyalara kayıtlı. Geri dönmek için ajanını kampanya klasöründe başlat ve *devam* yaz: oyun yöneticisi sana kısa bir özet verir ve kaldığınız yerden sürdürür.

### 3.10 Oyun yöneticisinin ruh hali

Gösterge panelinin üstündeki robot oyun yöneticisidir. Yüzü hikâyenin tonunu izler ve henüz bilmediğin hiçbir şeyi ele vermez. Sohbet kapalıyken uyur.

### 3.11 Resimler

RPG Engine, ulaştığın yerlerin, üstlendiğin görevlerin ve karşılaştığın kişilerin resimlerini, **resimler** ayarının dediği gibi yaptırabilir; istersen karakterinin portresini de. Kendi Codex'ini ya da Claude Code'unu, kendi girişinle, kendi planın ve sınırlarınla kullanır: **Codex** boyar, o yoksa **Claude Code** çizer. **Ayarlar**, bu bilgisayarın resim yapıp yapamadığını ve yapamıyorsa nasıl kurulacağını söyler. Oyun yöneticisine her zaman kendi resmini de verebilirsin.

### 3.12 Güvenlik: sınırlar, perdeler ve dur

**Sınırlar** oyunda asla yer almaz; **perdeler** yalnızca sahne dışında olur. İstediğin an *[dur]* yaz: oyun yöneticisi o içeriği hemen bırakır ve sınırlarına ekler.

### 3.13 Fikrini değiştirmek

Her ayar değiştirilebilir, sohbette ya da **Ayarlar**'da. Oyun yöneticisinin kitapsız verdiği bir karar **emsal** olur; böylece aynı soru bir sonraki sefer aynı yanıtı alır.

---

## 4. Gösterge paneli <!-- icon: party -->

Kendi bilgisayarındaki bir sayfa. Yalnızca o bilgisayarın tarayıcısında açılır ve sohbet açık olduğu sürece canlıdır. Sohbet kapanınca *Bağlı değil* yazar. Bir sonraki sohbetle kendiliğinden geri gelir.

- **Grup**: senin karakter kağıdın ve yoldaşlarınınkiler. Bir sayıya tıklayarak onu atabilirsin. Üzerine gelirsen sayının nereden geldiğini görürsün. Bir ok zarını işaretliyorsa atışı neyin iyileştirdiğini ya da kötüleştirdiğini de görürsün. Yanında atışlar yer alır.
- **Sahne**: bulunduğun yer, resmi ve haritası, orada kimlerin olduğu, neler olduğu. Çatışmada sıralar ve karakterinin kartı da burada görünür.
- **Günlük**: görevler, hikâye, yoldaşlarının günlükleri, notların.
- **Dünya**: dünya haritası, karakterinin bildikleri, bulunan belgeler ve takvim.
- **Zar tepsisi**: zarları ve bir değiştirici seç, sonra at. ×2 zarları ikiye katlar, değiştiriciyi asla katlamaz. Kritik vuruşta olduğu gibi.
- **Kayıtlar**, **Yardım**, **Ayarlar** ve **Hakkında**: satırın sonunda simge olarak durur. Ayarlar, sayfanın kendi tercihlerini de içerir: tema, zar sesi, zar seti.

Oyun yöneticisi sana bir şey sorduğunda, afişi hangi bölümde olursan ol en üstte kalır.

---

## 5. Oyun sistemleri ve ev kuralları <!-- icon: dice -->

### 5.1 Oyun sistemi nedir?

Bir oyunun verileridir: karakter kağıdı, sayılar, yaratıklar, eşyalar, büyüler ve kural metinleri. Her kampanya tek bir sistemle oynanır. RPG Engine karakter kağıdını ve harcanan ile geri kazanılan şeyleri hesaplar. Bir özelliğin nasıl işlediğini ise oyun yöneticisi kurallardan okur ve bir masadaki gibi karara bağlar.

### 5.2 Beşinci sürüm

SRD 5.1'in ırkları, sınıfları, alt sınıfları, bir geçmişi ve bir yeteneği (feat); 319 büyü, silahlar, zırhlar, sihirli eşyalar ve canavarlar; oyun yöneticisinin tam metinlerinden okuduğu kural bölümleri; hesaplanmış, eksiksiz karakter kağıdı.

Bu, başlı başına bir pakettir. Kampanya kurarken oyun yöneticisi onu önerir ve kurar. Bu sistemi oynayan bir kampanya, paketin olmadığı bir bilgisayarda ilk kez açıldığında paketi kendiliğinden kurar. Oyun yöneticisi de sana haber verir.

SRD'de olmayan içerikleri de oynayabilirsin. Sahip olduğun bir kitaptan alabilirsin. Oyun yöneticisi bunu kampanyanın sayfaları olarak yazar, RPG Engine de onları kendi sayfaları gibi kullanır. RPG Engine yalnızca açık içerik sunar. Oyun yöneticisinin bildikleri ise bununla sınırlı değildir.

Kendi kılavuzların kütüphanen olabilir. Oyun yöneticisine nerede olduklarını söyle: *[Kılavuzlarım D:\Books\5e klasöründe.]* Ya da klasörlerini Packages › Library bölümünden ekle ve bilgisayarının gösterdiği pencerede bir kez evet de. RPG Engine onları bu bilgisayarda okur. Her kampanya, orada açtığın klasörleri kullanır. Oyun yöneticisi bir kurala karar verirken SRD'den sonra bu klasörlerde arar ve kitabı ile sayfayı belirtir. En iyi metin olarak okunurlar. Metni seçilebilen PDF'ler de iyi okunur. Taranmış bir PDF ise sayfaların görüntülerinden okunur. Bu yalnızca Windows'ta olur, birkaç dakika sürer ve birkaç hata çıkabilir. RPG Engine kılavuzlarını asla değiştirmez, metinlerini hiçbir yere göndermez ve hiçbir kampanyaya kopyalamaz.

### 5.3 Ev kuralları ve kendi eklemelerin

Oyun yöneticisine sor: *[Ev kuralı: saldırıda doğal 1 gelirse silahını düşürürsün.]* Oyun yöneticisi bunu masanın bir anlaşması olarak tutar. Gerekirse bir sayfa ya da karakter kağıdında bir sayı yazar. Önceden yazılmış ev kuralları, kampanyanın `rules` klasörüne metin dosyaları olarak konabilir.

### 5.4 Kendi oyun sistemini eklemek veya içe aktarmak

Oyun sistemi bir pakettir. Oyun yöneticisi onu npm'den, bir klasörden ya da bir dosyadan kurar. Bizim olmayan bir paketi ise yalnızca senin evetinle kurar. Bu onayı, ajanının bir formunda ya da bilgisayarının bir penceresinde verirsin. Paket hazırlamak bir geliştiricinin işidir ve RPG Engine'in GitHub'daki belgelerinde anlatılır. Kendi kitabını oyun sistemine dönüştürmek henüz yok ([Sonra gelecekler](#9-coming-later)).

---

## 6. Eklentiler <!-- icon: plus -->

Eklenti, bir kampanyaya oyun sisteminin üstüne yeni bir şey katar. Örneğin her şafakta değişen hava durumu ya da zarlarla kilit açma gibi bir özellik olabilir. Eklentiyi Paketler › Ekle bölümünden eklersin. Listeden seçebilir, npm üzerindeki adını yazabilir, bir klasör ya da dosya gösterebilirsin. Bizim yapmadığımız bir eklenti kod getirir. Bu yüzden yalnızca senin onayınla, bilgisayarında açılan bir pencerede eklenir. Başka bir oyun sistemi için yapılmış eklenti hangi sistem için olduğunu söyler ve eklenmez. Paketler › Yüklü bölümünde bir eklentiyi güncelleyebilir ya da kaldırabilirsin. İstersen oyun yöneticisi de bir eklenti ekleyebilir.

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

## 8. Merak edenler için: kampanya klasörü <!-- icon: list -->

Onu açman gerekmez. Kampanyanın sırlarını da içerir. İçinde şunlar var: `campaign.yaml` (ayarların), `state.yaml` (oyunun geldiği yer), `world/` (her karakter, yer, görev ve diğerleri için birer markdown sayfası), `rules/` (ev kuralların), `images/`, `log.jsonl` (her değişiklik), `.saves/`, `.player/` (notların) ve yapay zekâ ajanlarına RPG Engine'in nerede olduğunu söyleyen küçük dosyalar. Sayfalar Obsidian biçimini kullanır. Bir sayfayı elle değiştirirsen oyun yöneticisi bunu bir sonraki cevabında öğrenir.

RPG Engine bu klasörde kalır. Oyunu yalnızca burada okur ve yazar, diğer dosyalarına hiç dokunmaz. Kılavuzlarının klasörlerini ise yalnızca okur. Bunun dışında yalnızca kendi veri klasörlerini tutar (panonun çevirileri, kılavuzlarından okuduğu metin, izin verirsen kurduğu Codex veya Claude Code) ve bir resim çizilirken geçici klasörler kullanır. Ajanının bilgisayarında yapmak istediği başka her şey için önce sana sorar. Bir oyun sistemi ya da eklenti koddur, her npm paketi gibi. Bizim olmayan bir paket bilgisayarında senin izinlerinle çalışır. RPG Engine onu yalnızca senin evetinle kurar. Bu onayı ajanının bir formunda ya da bilgisayarının bir penceresinde verirsin. Yalnızca yazarlarına güvendiğin paketlere evet de.

Oyun yöneticisinin kullandığı her komut kampanya klasöründe de çalıştırılabilir: `rpg --help` hepsini listeler. Çoğu, kampanyanın sırlarını yazdırır.

---

## 9. Yakında <!-- icon: hourglass -->

- **Oyun yöneticisi sen olursun**, grubu yapay zekâ oynar.
- **Yazar modu**: Yapay zekâyla bir macera yaz, sonra dışa aktar ve paylaş.
- **Aynı bilgisayarda birden fazla oyuncu**: Her oyuncunun kendi karakteri olur ve hepsi aynı sohbette sırayla oynar.
- **Daha fazla eklenti**: Paylaşabileceğin dünyalar, özellikler ve ev kuralları.
- **Başka oyunlar**: Daha fazla oyun sistemi ve kendi oyun sistemin.

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

**Kurulum başarısız oluyor veya `rpg` başlamıyor.** `node --version` çıktısı 24 veya daha yeni olmalı. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse [2.1](#21-what-you-need) bölümüne bak. Windows'ta RPG Engine'i ve kampanyalarını `&` içeren yollardan uzak tut.

**Panel bağlantısı değişti.** Başka bir program olağan adresi aldı; oyun yöneticisi sana yeni bağlantıyı verir.
