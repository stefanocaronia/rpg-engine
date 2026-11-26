<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: eksiksiz kılavuz

**RPG Engine**, masa başı rol yapma oyununu **yapay zekâ oyun yöneticisiyle** oynamanı sağlar. Oyunu **gösterge panelinde** oynarsın: bilgisayarındaki bu pencerede karakter kağıdın, zarlar, haritalar, günlüğün ve oyun yöneticisiyle **sohbetin** bulunur. RPG Engine arka planda çalışır: **dünyayı hatırlar**, **zarları atar** ve **hesapları tutar**.

Bu kılavuz oyuncular için yazıldı: program yazmayı bilmen gerekmez.

## Hızlı başlangıç <!-- icon: send -->

1. [nodejs.org](https://nodejs.org) adresinden **Node.js** kur (LTS sürümü).
2. Node.js kurulduktan sonra açtığın yeni bir terminalde bir kez RPG Engine'i kur: `npm install -g rpg-engine`. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse, bir kez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz, evet de ve yeniden dene.
3. `rpg open` yaz. RPG Engine'in simgesinin masaüstüne ve menüne eklenip eklenmeyeceğini sorar: evet için Enter'a bas. Bundan sonra RPG Engine'i terminal olmadan, simgesinden başlatırsın ([2.2](#22-install)).
4. Bir pencere kampanyalarını gösterir. **Yeni kampanya**'ya bas, bir ad ver ve **Oluştur**'a bas ([2.3](#23-create-a-campaign)): kampanyanın gösterge paneli kendi penceresinde açılır.
5. Oyun yöneticisiyle sohbette yapay zekâ uygulamanı ve modelini seç: Claude Code için ücretli bir Claude planı, Codex için ücretsiz ya da ücretli bir ChatGPT hesabı gerekir ([2.4](#24-connect-your-ai)). Uygulama yoksa ya da giriş yapmadıysan sayfa uygulamayı kurar veya giriş yaptırır. **Sohbeti aç**'a, sonra **Başla**'ya bas. İlk yanıt birkaç dakika sürebilir. Sonra oyun yöneticisi nasıl oynamak istediğini sorar ve karakterini birlikte yaparsınız.

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
- RPG Engine'i kurmak için bir kez **terminal**: Windows'ta Terminal ya da PowerShell; macOS'ta Terminal. Terminali bir klasörde açmak için klasöre sağ tıkla ve **Terminalde Aç** (Windows) ya da **Servisler > Klasörde Yeni Terminal** (macOS) seçeneğini seç. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse, bir kez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz ve evet de.
- Oyun yöneticisi için, kendi hesabınla bir **yapay zekâ uygulaması** ([2.4](#24-connect-your-ai)): sayfa uygulamayı senin için kurabilir. Uygulamanın sunduğu **en büyük modelle** oyna: küçük bir modeli sır vermeye ya da kuralları esnetmeye ikna etmek daha kolaydır.

### 2.2 Kurulum

```text
npm install -g rpg-engine
rpg open
```

İlk satır RPG Engine'i kurar; `rpg --version` kurulumun işe yaradığını doğrular. npm kendini güncellemeyi önerirse bunu yok sayabilirsin.

`rpg open`, RPG Engine'in kampanyalarını gösteren penceresini açar. İlk seferde terminalde, simgesinin masaüstüne ve Başlat menüne (Mac'te Uygulamalar) eklenip eklenmeyeceğini sorar: evet için Enter'a bas. Bundan sonra simgeye çift tıklarsın, terminale artık gerek kalmaz. Simge yoksa her oynayışında `rpg open` yaz. `rpg icon` simgeyi sonradan ekler, `rpg icon --remove` kaldırır.

### 2.3 Kampanya oluşturma

RPG Engine'in penceresi kampanyalarını kartlar olarak gösterir; en son açılan başta durur. **Yeni kampanya**'ya bas ve **Ad**, **Dil** ile **Oyun sistemi** seç: gerisini oyun yöneticisi seninle birlikte yapar. Kampanya, kullanıcı klasöründeki `RPG Engine` klasörünün içinde, kendi adıyla bir klasöre konur (Windows'ta `C:\Users\<ad>`). **Başka bir klasör seç…** onu senin seçtiğin boş bir klasöre koyar. **Oyun yöneticisi** bölümünde ilk sohbet için yapay zekâ uygulamasını ve modeli şimdiden seçebilirsin ([2.4](#24-connect-your-ai)). **Oluştur**'a bas: kampanyanın gösterge paneli kendi penceresinde açılır.

Sonraki sefer, kampanyasını açmak için bir karta tıkla. Açık olan kartta **Şu an açık** yazar. **Klasör aç…** bu bilgisayarda zaten olan bir kampanyayı ekler. Kartın üstündeki küçük çarpı kartı listeden kaldırır: dosyaları olduğu yerde kalır.

### 2.4 Yapay zekânı bağla

Oyun yöneticisi, bilgisayarında kendi hesabınla çalışan bir **yapay zekâ uygulamasında** çalışır: Claude Code, Codex, OpenCode ya da Antigravity. claude.ai ya da ChatGPT gibi düz bir sohbet veya bir telefon uygulaması yetmez: oyun yöneticisinin bilgisayarındaki kampanya dosyalarına erişmesi gerekir. Her uygulamanın kendi hesabı gerekir: Claude Code için ücretli bir Claude planı (Pro ya da üstü); Codex için ücretsiz ya da ücretli bir ChatGPT hesabı; Antigravity için bir Google hesabı, ücretsiz kullanımın haftalık sınırları vardır; OpenCode'un sınırlı bir süre için bazı ücretsiz modelleri vardır, ya da kendi sağlayıcının modellerini, yerel olanlar dahil, kullanır.

Gösterge panelinin sohbetinde **Yapay zekâ uygulaman** altından uygulamayı, sonra **Model**'i ve **Oyun yöneticisinin düşüncelerini** seç: sayfa bunları önerir. Daha fazla düşünce daha yavaştır ve planının daha çoğunu harcar. Hazır olmayan bir uygulama neye ihtiyacı olduğunu söyler ve bunu yapan bir düğme gösterir:

- **Claude Code** ve **Codex**: **Install Claude Code** ya da **Install Codex** uygulamayı bu bilgisayarda RPG Engine'in kendi klasörüne indirir. **Sign in to Claude Code** ya da **Sign in to Codex** giriş sayfasını tarayıcında açar. RPG Engine parolanı asla görmez.
- **OpenCode** ve **Antigravity**: **Get OpenCode** ya da **Get Antigravity** sitesini açar, uygulamayı orada kurarsın. OpenCode ile giriş yapmadan oynarsın; Antigravity'de giriş kendi uygulamasından yapılır. Sonra geri gel ve **Yeniden kontrol et**'e bas.

Antigravity **deneme aşamasında** olarak işaretlidir: oyundan çıkıp kendi tarzıyla sorular sorabilir, bu yüzden Claude Code, Codex ya da OpenCode oynamak için daha iyidir. Antigravity geçmiş sohbetlerini saklar ve belleği kapatılamaz: oyun yöneticisine bunları asla okumaması söylenir. Yazdıkların Google'a gider ve Google bunları insanlara okutabilir: kişisel verilerini oyunun dışında tut. RPG Engine bir Google ürünü değildir. RPG Engine'i en çok **Claude Code** ile oynuyor ve test ediyoruz: diğerleriyle henüz tam bir kampanya oynanmadı.

Gösterge panelinin sohbetinde oyun yöneticisi bilgisayarına yalnızca RPG Engine üzerinden dokunur: dosyalarından hiçbirini kendi kendine açmaz. RPG Engine kampanyanın dışında yalnızca senin seçtiğini okur; bunu da bilgisayarının bir penceresinde evet dedikten sonra yapar.

Yapay zekâ uygulamasının kendi sohbetinde, bir terminalde ya da masaüstü uygulamasında da oynayabilirsin ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 İlk sohbet

Uygulama ve model seçildiğinde **Sohbeti aç**'a bas: uygulama başlar, bu birkaç saniye sürebilir. Sonra **Başla**'ya bas ya da *Selam! Başlayalım.* gibi bir şey yaz. İlk yanıt birkaç dakika sürebilir; oyun yöneticisi bu sürede sahneyi kurar.

Sohbetin kendi bölümü olan **Rol yapma** vardır, ya da sayfanın yanında durur: üstündeki küçük düğmeler onu **Kendi sekmesinde**, **Solda** ya da **Sağda** gösterir. Kenarından sürükleyerek genişletebilirsin.

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
| **Karakterin** | Karakterinin sıfırıncı oturumda nasıl yapıldığı | oyun yöneticisiyle, oyun yöneticisi tarafından, kendi karakterin ([2.7](#27-session-zero-your-character)) |
| **Yoldaşlar** | Seninle kimin yolculuk ettiği | yok, seninle yapılan, oyun yöneticisinin yaptığı, oyunda tanışılan |
| **Görseller** | Yerlerin, görevlerin ve karşılaştığın kişilerin görselleri | yok, istek üzerine, yeni yerler, görevler ve karşılaştığın kişiler ([3.11](#311-pictures)) |
| **Sınırlar** ve **Perdeler** | Hiç görünmeyen konular ve yalnızca sahne dışında olanlar | listeler |
| **Dil** | Oyunun ve panonun dili | herhangi biri |

Beşinci sürüm **ilerleme** ekler: deneyim puanları ya da kilometre taşları.

Yazılı bir dünya yoksa oyun yöneticisi bir de **temel fikir** sorar (tür, ton, birkaç öğe ve bir oyunda en çok neyden keyif aldığın: çatışma, gizem, sohbet ya da keşif gibi, kendi sözlerinle), **hazırlığı** sorar: dünyayı oyun sırasında anında kurmak ya da hepsini baştan hazırlamak; ve **uzunluğu** sorar: bir akşam, birkaç oturum (üç ila beş akşam) ya da açık uçlu, bir macera ardından bir başkası. Belirli bir uzunluğu olan bir hikâye bittiğinde istersen her zaman devam edebilirsin.

**Oyun yöneticisinin üslubu** hiç sorulmaz, ama sohbette ya da **Ayarlar**'da değiştirebilirsin: **Anlatım** (sade, edebi, pulp, alaycı), uydurduğu **Hikâyeler** (durumlar, yaylar, bölümler, gizem), **Şunun gibi yaz** için bir yazar ya da başka herhangi bir şey için **Kendi sözlerinle**.

### 2.7 Sıfırıncı oturum: karakterin

Karakterini oyun yöneticisiyle birlikte yaparsın, tıpkı bir masada olduğu gibi. Oyun yöneticisinden yapmasını istemediğin sürece her seçim senindir: dolu bir fikirle, belirsiz bir fikirle ya da hiçbir şeyle gelebilirsin; ya da oyun yöneticisinden birkaç sözcükten yola çıkıp her şeyi yapmasını isteyebilirsin. Seviyeli bir oyunda oyun yöneticisi hangi seviyeden başlayacağını sorar: istemediğin sürece birinci seviyeden. Oyun yöneticisi, herhangi bir zar atılmadan önce yetenek puanlarının nasıl belirleneceğini anlatır. Hikâyen hiçbir zaman zorunlu değildir; verirsen oyun yöneticisi onu senin sözlerinle yazar. Sonra oyun yöneticisi karakterin için bir görsel ister ([3.7](#37-your-characters-story-and-picture)). Karakter kağıdını RPG Engine hesaplar: toplama çıkarma yapmazsın.

Başka bir oyundan ya da başka bir kampanyadan zaten bir karakterin mi var? Kurulumda **Zaten bir tanem var** seçeneğini seç ve karakteri oyun yöneticisine ver: karakter kağıdını sohbete yapıştır. Yapay zekâ uygulamanın kendi sohbetinde dosyasının bilgisayarında nerede olduğunu da söyleyebilirsin (bir PDF, bir görsel, bir metin). Gösterge panelinin sohbetinde oyun yöneticisi senin hiçbir dosyanı açmaz. Oyun yöneticisi karakteri olduğu gibi, kendi seviyesinde yazar, kurallara ve dünyaya uygun olup olmadığını kontrol eder ve uymayan her şeyi seninle birlikte çözer.

### 2.8 Diğer yol: yapay zekâ uygulamanın kendi sohbeti

Oyunu doğrudan yapay zekâ uygulamanın sohbetinde, bir terminalde ya da masaüstü uygulamasında da oynayabilirsin; gösterge paneli yanında açık durur. O zaman kampanyayı bir terminalde, oyunlarını tuttuğun klasörde oluşturursun ([2.1](#21-what-you-need) nasıl yapılacağını anlatır). Adı her zaman yaz: `rpg init "The Salt Isles"` komutu `The Salt Isles` adında bir klasör ve içinde yeni bir kampanya oluşturur. RPG Engine her uygulamanın orada ihtiyaç duyduğunu kendiliğinden hazırlar.

Uygulamanı o klasörde başlat: Claude Code için `claude`, Codex için `codex`, Antigravity için `agy`, OpenCode için `opencode`. Ya da klasörü masaüstü uygulamasında aç. Klasöre güvenip güvenmediğini sorduğunda evet de. Dikkat: Claude Code'da önceden seçili gelen cevap *No, exit* olur. MCP destekleyen her ajan da oyun yöneticisi olabilir: onu kampanya klasöründe başlat ve ona `rpg mcp` MCP sunucusunu ver.

*Selam! Başlayalım.* yaz. Oyun yöneticisi her sohbetin ilk yanıtında sana **gösterge panelinin bağlantısını** verir; şuna benzer bir şey: `http://127.0.0.1:4750`. Bağlantıyı sohbetin yanında aç.

- Oyun yöneticisinin mesajları arasında uygulaman kullandığı araçları gösterir. Ayrıntılarını açma (Claude Code'da ctrl+o), çünkü sırları gösterebilirler.
- Kampanya, uygulamanın kendi belleğini kapatır: oyun dosyalarında yaşar, böylece bir kayda dönmek gerçekten geri dönmek olur. Codex'in masaüstü uygulamasında, ayarlardan oyunun sohbetleri için belleklerin kapalı olduğunu kontrol et.
- Oyun yöneticisi RPG Engine'in araçlarını bulamadığını söylerse kampanya klasöründe `rpg init` yaz, sonra yeni bir sohbet aç.
- Bir kampanyayı aynı anda tek sohbet oynar: seninki açıkken gösterge panelinin sohbeti bekler.

---

## 3. Oyun oynamak <!-- icon: chat -->

### 3.1 Oyun yöneticisiyle konuşmak

Karakterin ne yapıyor ya da ne söylüyorsa kendi sözlerinle yaz:

> Han sahibine bu gece başka kimin uğradığını soruyorum.

Hikâyenin dışına çıkmak için `[OOC: …]` yaz (karakter dışı): *[OOC: Tutuşma nasıl işliyor?]* Oyun yöneticisi de aynı şekilde yanıt verir. Gösterge panelinin sohbetinde oyun dışı sözleri ayrı durur, OOC ile işaretlenir.

Gösterge panelinin sohbetinde alttaki kutuya yaz ve göndermek için Enter'a bas; Shift+Enter yeni satır başlatır. Oyun yöneticisi yanıt verirken **Durdur** onu durdurur, yazdıkların kutuda bekler. Oyun yöneticisi sana bir şey sorduğunda düğmeleri soruyla birlikte gelir, atışlar da dahil: birine tıkla ya da yanıtını yaz. Kutunun altında uygulamayı ve modeli görürsün. Uygulama izin veriyorsa, oyun yöneticisi yanıt verdikten sonra modele tıklayarak onu değiştirebilirsin. **Sohbeti kapat** sohbeti bitirir; oyun dosyalarında kalır.

Sen neyi denediğini söylersin, ne olacağını oyun yöneticisi söyler. Oyun yöneticisi karakterin adına asla karar vermez ve motordan asla söz etmez. Gösterge panelini nasıl kullanacağını ona sorabilirsin.

**Gösterge panelinden eylem yapmak**: Karakter kağıdındaki bir ada tıkla; bu bir silah, bir büyü ya da taşıdığın bir şey olabilir. Kartı bunun ne olduğunu söyler. Bir çanta okuyla açılır, ⓘ simgesi de çantanın kartını gösterir. Onunla ne yapacağını seç. Kimseyi gerektirmeyen bir eylem, örneğin **Kuşan**, aynı düğmede onay ister: *Onayla: Kalkanı kuşanıyorum*. Düğmeye bir kez daha bas, eylem oyun yöneticisine gider. Birine yönelik bir eylem, örneğin **Saldır**, kimin için olduğunu sorar: listeden ya da haritaya tıklayarak seç. Sonra düğme cümlenin tamamını söyler, *Kapüşonlu Haydut 1'e Gürz ile saldırıyorum*, ve tek tıkla gider. Kendi sözlerinle söylemek için konuşmak istediğin kişiye tıkla ya da sohbete yaz. Oyun yöneticisi bunu sohbette söylenmiş gibi duyar, diğer her şey gibi karara bağlar ve eksik bıraktığın şeyi sana düğmelerle sorar. Yapay zekâ uygulaman oyun yöneticisine anında haber veremiyorsa, oyun yöneticisi bunu sen sohbete bir sonraki yazışında okur. Sohbet daha önce kapatıldıysa **Tekrar söyle** bunu bir kez daha gönderir.

### 3.2 Atışlar

Oyun yöneticisi atış istemeyi yalnızca sonuç belirsizse ve önemliyse yapar. Önce de neyin söz konusu olduğunu söyler. Sonra:

- **Gösterge panelinde** bir bannerda her kontrol için bir düğme çıkar, örneğin *Acrobatics +4 · avantajlı*. Düğmeye tıkla: zarlar sayfaya düşer ve oyun yöneticisi sonucu duyar. Karakter kağıdında yanan satıra da tıklayabilir, zarları zar tepsisinden atabilir ya da bannera başka bir şey yazabilirsin.
- **Elle** seçeneği bannerın köşesinde ya da **Ayarlar**'da bulunur: banner neyi atman gerektiğini söyler, sen de atışı karakter kağıdından ya da zar tepsisinden yaparsın.
- **Fiziksel zarlar** için zar ayarını fiziksel yap: attığın yüzleri yazarsın, *[14 attım.]*, RPG Engine de değiştiricilerini ekler.

**Serbest atışlar**: eğlence için atmak istersen karakter kağıdındaki herhangi bir sayıya tıkla ya da zar tepsisini aç. Bunlar hiçbir zaman sayılmaz ve oyun yöneticisi onları görmez.

**Oyun yöneticisinin atışları**, gizli olanlar dışında, atış sütununda görünür. İstediğin zaman sorabilirsin: *[Şu atış gerçek miydi?]* Gizli bir atış için oyun yöneticisi, sen sormadan önce yapıldığını kanıtlayan bir parmak izi verir.

### 3.3 Sahneler ve çatışmalar

Hikâye **sahneler** halinde ilerler: bir çatışma, bir konuşma, keşif, yolculuk, bir dinlenme. Her sahnenin sonunda oyun kendiliğinden kaydeder ve sahne günlüğüne girer. Hikâye bir dönemece girdiğinde oyun yöneticisi, son bölümden bu yana geçen sahneleri hikâyenin kitabına yeni bir bölüm olarak yazar.

Bir çatışmada, sırası sende olmayan her sırayı oyun yöneticisi anlatır ve karar verebileceğin yerde durur. **Sahne** üstte sırasının kimde olduğunu ve sonra kimin geldiğini, haritanın yanında da karakterinin kartını gösterir. Sıraların düzeni, grubunun can puanları ve düşmanların ne kadar yaralı göründüğü ise sözcüklerle sayfanın yanında durur. Karakterin düşerse ölüm kurtarmaları sayfada büyük görünür.

**Kalıcı emirler**: yoldaşlarına kalıcı olması gereken bir şey söyle, örneğin *Bundan sonra her zaman birini sağ bırakın*; oyun yöneticisi bunu sen kaldırana kadar tutar. Yoldaşların bunu karakterlerinin elverdiği ölçüde uygular, biri uygulamayacaksa bunu söyler. Emirlerini **Ayarlar**'da bulursun; orada ekleyebilir ve kaldırabilirsin.

### 3.4 Zaman, yolculuk ve hareket eden dünya

RPG Engine tarihi tutar. Oturumlar arasında oyun zamanı durur; ama **Ayarlar**'dan zamanın akmasına izin verebilirsin, örneğin uzakta geçen her hafta için oyunda bir gün, ya da bunu oyun yöneticisinden isteyebilirsin. Dinlendiğini söyle, *Uzun bir dinlenme yapıyoruz*; oyun yöneticisi kabul edince dinlenme geri getirmesi gerekeni geri getirir. Kısa bir dinlenmede oyun yöneticisi gösterge panelinden kaç can zarı harcadığını sorabilir: zarları tek tek at, her birinin ne kadar iyileştirdiğini gör ve istediğin zaman dur. Nereye gittiğini söyle, *Kuzeye, Rocca'ya giden yola çıkıyoruz*; RPG Engine yolu, mesafeyi ve günleri hesaplar, yolda bir şey olursa durur. Para oyunun madeni paralarıyla sayılır, para üstü dahil.

Kötülerin son tarihli planları vardır. Her yeni günde oyun yöneticisi, zamanın ilerlettiği tehditleri hareket ettirir. Sen onların izlerini görürsün, saatin kendisini asla.

### 3.5 Haritalar

**Dünya**, karakterinin bildiği yerleri, aralarındaki yolları ve yürüdüğün izi gösterir; gerisi sisle örtülüdür. **Sahne**, bulunduğun yerin haritasını, varsa, kimin nerede durduğuyla birlikte gösterir. Çatışmada, sıran geldiğinde ulaşamayacağın kareler örtülür. Oyun yöneticisi nereye gideceğini sorduğunda bir kareye dokun ya da *E4* gibi yaz.

**Dünya** ayrıca karakterinin bildiklerini de tutar. **Bilgiler**, karakterin tanıdığı kişileri, yerleri, hizipleri, yaratıkları ve hikâyeleri listeler; her biri karakterin bildiği haliyle yazılır. İçinde arama yapabilir ya da birini açıp tamamını okuyabilirsin. Metindeki bir ad, kendi sayfasına götürür. **Belgeler**, bulunan mektupları, duyuruları ve sayfaları tekrar okuman için saklar. **Takvim** bugünü, görevlerinin kalan süreyle birlikte son tarihlerini ve hikâyenin günlerini gösterir. Sahnesi olan bir gün, seni Günlük'teki zaman çizelgesinde o sahnelere götürür.

### 3.6 Görevler, günlük ve notlar

Karakterinin üstlendiği bir iş, **Günlük**'te hedefleri, son tarihi ve neyi ölçtüğüyle bir görev olur. Sahne'nin en üstünde görünür kalması için görevi yıldızla. **Hikâye** altında Günlük, hikâyeni bir kitap gibi anlatır: hikâye her dönemece girdiğinde oyun yöneticisi, seçtiğin üslupla düzyazı bir bölüm yazar ve bir önceki bölümden bu yana geçen sahneleri anlatır. Bölüm bölüm oku; sonuncusu yer imiyle işaretlidir. Hikâyeyi Markdown olarak ya da yazdırmak veya paylaşmak için web sayfası olarak indirebilirsin. Daha önce başlamış bir oyunda oyun yöneticisinden şimdiye kadarki hikâyeyi yazmasını iste. **Zaman çizelgesi**, sahneleri numaralı olarak, her birinde olanlarla listeler. Günlük, **Notlar**'ı da tutar. Notlar özeldir. **Paylaş**'a basarsan oyun yöneticisi o notu senin düşüncen olarak duyar, asla bir gerçek olarak değil. **Yoldaşlar** altında yoldaşlarının günlüklerini okursun: arada bir, bir günün ya da görevin sonunda, düşündükleri ve hissettikleri hakkında birkaç satır yazarlar.

### 3.7 Karakterinin hikâyesi ve resmi

Karakter kağıdında **Açıklama** kartında karakterinin hikâyesi için bir kutu vardır; sen evet dedikten sonra oyun yöneticisi onu oraya yazar. Resim için oyun yöneticisine bir dosya ver (PNG, JPEG, WebP ya da SVG, en çok 5 MB) ve bilgisayarında nerede olduğunu söyle. Ya da bir portre yaptır ([3.11](#311-pictures)): *[Bana bir portre yap: örgülü gri saçlar, çenede bir yara izi.]*

### 3.8 Kayıtlar ve geri dönmek

RPG Engine, her sahnenin sonunda tüm kampanyayı kaydeder. Gerisini **Kayıtlar** ayarı belirler:

| Kayıtlar | İstediğinde kaydet | Geri dön |
|---|---|---|
| **permadeath** | hayır | asla |
| **checkpoint** | hayır | son kayda, yalnızca karakterin ölünce |
| **free** | evet | herhangi bir kayda |

Her kipte **baştan başlayabilirsin**: oyunun başından ya da sıfırıncı oturumdan. Bunu sohbette ya da **Kayıtlar**'da yap.

Geri döndükten sonra **yeni bir sohbet aç**: eski sohbet geri alınanı hâlâ hatırlar. Gösterge panelinin sohbetinde **Sohbeti kapat**'a, sonra **Yeni sohbet**'e bas. Yapay zekâ uygulamanın kendi sohbetinde yeni bir konuşma aç (Claude Code'da `/clear`). Yeni sohbete *devam* yaz. Sonra oyun yöneticisine sohbetin yeni olduğunu söyle: Kayıtlar'da **Yeni sohbet açtım**'a bas ya da sohbette söyle. O zamana kadar oyun yöneticisi devam etmez.

Git'in ne olduğunu bilmiyorsan bu paragrafı atla. Kampanyanın klasörü bir git deposuysa **Ayarlar**'da bir **Git** bölümü bulunur. Sen seçene kadar hepsi kapalıdır: her oturumun başında, her kayıtta ve her sahnenin sonunda bir commit, istersen ardından bir push. Commit, kampanyanın o andaki anlık görüntüsüdür. Push ise bu görüntüleri çevrimiçi depoya, örneğin GitHub'a gönderir; böylece bir kopya bu bilgisayarın dışında durur. Kayıtlar ve oyun yöneticisiyle yaptığın sohbetler, sen izin vermedikçe depoya girmez. Sohbetlere yalnızca depo özelse izin ver.

### 3.9 Oturumlar: durmak ve geri dönmek

İstediğin zaman dur: *[Bu gecelik burada bırakalım.]* Her şey zaten dosyalara kayıtlı. Geri dönmek için RPG Engine'i simgesinden aç ve kampanyana tıkla. Sohbeti açık bıraktıysan kendiliğinden geri gelir. Kapattıysan **Sohbete devam et**'e bas. Sonra **Hikâyeye devam et**'e bas: oyun yöneticisi kaldığın yeri sana birkaç satırda anlatır ve oyunu sürdürür. Oyun, oyun yöneticisi hâlâ yanıt verirken ya da onun sorduğu bir soru seni beklerken kapandıysa bu düğmede bunun yerine **Buradan devam et** yazar. **Yeni sohbet** aynı oyun üzerinde yeni bir sohbet açar. Yapay zekâ uygulamanın kendi sohbetinde, uygulamayı kampanya klasöründe başlat ve *devam* yaz.

### 3.10 Oyun yöneticisinin ruh hali

Gösterge panelinin üstündeki robot oyun yöneticisidir. Yüzü hikâyenin tonunu izler ve henüz bilmediğin hiçbir şeyi ele vermez. Gösterge paneli oyuna bağlı değilken uyur.

### 3.11 Resimler

RPG Engine, ulaştığın yerlerin, üstlendiğin görevlerin ve karşılaştığın kişilerin görsellerini **Görseller** ayarının dediği gibi yaptırabilir. İstersen karakterinin portresini de yaptırır. Görselleri kendi yapay zekâ uygulaman, kendi imkânlarıyla, senin girişinle, senin planın ve sınırlarınla yapar: **Claude** vektör görsel olarak çizer, **Codex** ve **Antigravity** boyar, **OpenCode** sohbette basit vektör görseller çizer. **Ayarlar > Kampanya > Görseller** bölümünde, oyun yöneticin başka bir uygulama olsa da Codex'in ya da Antigravity'nin görselleri boyamasını sağlayabilirsin. Seçtiğin uygulama yapamıyorsa görselleri sohbetin kendisi yapar. **Ayarlar**, bu bilgisayarın görsel yapıp yapamadığını ve yapamıyorsa nasıl kurulacağını söyler. Karakterine ya da gördüğün herhangi bir sayfaya her zaman kendi görselini verebilirsin: imleci sayfanın görsellerinden birinin üstüne getir, köşesinde küçük bir resim düğmesi çıkar (klavyeyle de çıkar, telefonda her zaman görünür). **Dünya**'da açtığın sayfada da **Resmi değiştir…** vardır; sayfanın görseli yoksa **Resim ekle…** vardır. İmleç bir görselin üstündeyken ya da düğmesine odaklanmışken, kopyaladığın bir görseli Ctrl+V ile (Mac'te ⌘V) yapıştırabilirsin. Seninki, sayfadaki görselin yerini alır. Ya da dosyayı kampanyanın **inbox** klasörüne bırak ve oyun yöneticisine hangi sayfa için olduğunu söyle.

### 3.12 Güvenlik: sınırlar, perdeler ve dur

**Sınırlar** oyunda asla yer almaz; **perdeler** yalnızca sahne dışında olur. İstediğin an *[dur]* yaz: oyun yöneticisi o içeriği hemen bırakır ve sınırlarına ekler.

### 3.13 Fikrini değiştirmek

Her ayar değiştirilebilir, sohbette ya da **Ayarlar**'da. Oyun yöneticisinin kitapsız verdiği bir karar **emsal** olur; böylece aynı soru bir sonraki sefer aynı yanıtı alır.

---

## 4. Gösterge paneli <!-- icon: party -->

Kendi bilgisayarındaki bir sayfa; kendi penceresinde açılır ve yalnızca o bilgisayarda açılır. Penceresi açık olduğu sürece, sohbet olsun olmasın canlıdır. Pencereyi kapattıktan yaklaşık otuz saniye sonra oyun durur, sohbet de onunla birlikte. Hiçbir şey kaybolmaz: hepsi dosyalarda durur. Yapay zekâ uygulamanın kendi sohbetinde, o sohbet açık olduğu sürece canlıdır. Oyun yokken sayfada *Bağlı değil* yazar: **Kampanyayı yeniden aç**'a bas ya da kendi uygulamanda bir sonraki sohbeti aç. Ev simgeli **Kampanyalar** düğmesi seni tüm kampanyalarına geri götürür.

- **Rol yapma**: oyun yöneticisiyle sohbet; sayfanın yanında değilse burada durur ([2.5](#25-the-first-chat)).
- **Grup**: senin karakter kağıdın ve yoldaşlarınınkiler. Bir sayıya tıklayarak onu at. Üzerine gelirsen sayının nereden geldiğini görürsün. Bir ok zarını işaretliyorsa atışı neyin iyileştirdiğini ya da kötüleştirdiğini de görürsün. Oyun yöneticisi sana seçimler hazırladığında, örneğin yeni bir seviyede, karakter kağıdındaki bir bildirim bunları açar. İstediğin zaman seç, seçeneklerin adını verdiği sayfaları oku, bir seçenek atış istiyorsa at, sonra onayla. Hikâye bu sırada devam eder. Yanında atışlar yer alır.
- **Sahne**: bulunduğun yer, resmi ve haritası, orada kimlerin olduğu, neler olduğu. Çatışmada sıralar ve karakterinin kartı da burada görünür.
- **Günlük**: görevler, kitap olarak hikâye, zaman çizelgesi, yoldaşlarının günlükleri, notların.
- **Dünya**: dünya haritası, karakterinin bildikleri, bulunan belgeler ve takvim.
- **Zar tepsisi**: zarları ve bir değiştirici seç, sonra at. ×2 zarları ikiye katlar, değiştiriciyi asla katlamaz; kritik vuruşta olduğu gibi.
- **Kayıtlar**, **Yardım**, **Ayarlar** ve **Hakkında**: satırın sonunda simge olarak durur. **Ayarlar** ayrıca **Gösterge paneli** altında sayfanın kendi tercihlerini içerir: mod, zar sesi, zar seti ve **Tema**. Tema, sayfanın renkleri, yazı tipleri ve resimleridir. Bunlar oyun sisteminin teması olabilir, Packages › Add ile kataloğdan, bir GitHub bağlantısından, bir .zip dosyasından ya da bir klasörden eklediğin bir tema olabilir ya da sayfanın kendi teması olabilir. Bir temanın kendi stil sayfası sayfayı okumayı zorlaştırırsa orada **Temanın kendi stili** seçeneğini kapat. **Ayarlar** her zaman o stil olmadan görünür: sayfanın adresinin sonuna `#/settings/page` ekleyerek aç.

Oyun yöneticisi sana bir şey sorduğunda, afişi hangi bölümde olursan ol en üstte kalır.

---

## 5. Oyun sistemleri ve ev kuralları <!-- icon: dice -->

### 5.1 Oyun sistemi nedir?

Bir oyunun verileridir: karakter kağıdı, sayılar, yaratıklar, eşyalar, büyüler ve kural metinleri. Her kampanya tek bir sistemle oynanır. RPG Engine karakter kağıdını ve harcanan ile geri kazanılan şeyleri hesaplar. Bir özelliğin nasıl işlediğini ise oyun yöneticisi kurallardan okur ve bir masadaki gibi karara bağlar.

### 5.2 Beşinci sürüm

SRD 5.1'in ırkları, sınıfları, alt sınıfları, bir geçmişi ve bir yeteneği (feat); 319 büyü, silahlar, zırhlar, sihirli eşyalar ve canavarlar; oyun yöneticisinin tam metinlerinden okuduğu kural bölümleri; hesaplanmış, eksiksiz karakter kağıdı.

Bu, başlı başına bir pakettir. Kampanya kurarken oyun yöneticisi onu önerir ve kurar. Bu sistemi oynayan bir kampanya, paketin olmadığı bir bilgisayarda ilk kez açıldığında paketi kendiliğinden kurar. Oyun yöneticisi de sana haber verir.

SRD'de olmayan içerikleri de oynayabilirsin. Sahip olduğun bir kitaptan alabilirsin. Oyun yöneticisi bunu kampanyanın sayfaları olarak yazar, RPG Engine de onları kendi sayfaları gibi kullanır. RPG Engine yalnızca açık içerik sunar. Oyun yöneticisinin bildikleri ise bununla sınırlı değildir.

Kendi kılavuzların kütüphanen olabilir. Oyun yöneticisine nerede olduklarını söyle: *[Kılavuzlarım D:\Books\5e klasöründe.]* Ya da klasörlerini Paketler › Kütüphane bölümünden ekle ve bilgisayarının gösterdiği pencerede bir kez evet de. RPG Engine onları bu bilgisayarda okur. Her kampanya, orada açtığın klasörleri kullanır. Oyun yöneticisi bir kurala karar verirken SRD'den sonra bu klasörlerde arar ve kitabı ile sayfayı belirtir. En iyi metin olarak okunurlar. Metni seçilebilen PDF'ler de iyi okunur. Taranmış bir PDF ise sayfaların görüntülerinden okunur. Bu yalnızca Windows'ta olur, birkaç dakika sürer ve birkaç hata çıkabilir. RPG Engine kılavuzlarını asla değiştirmez, metinlerini hiçbir yere göndermez ve hiçbir kampanyaya kopyalamaz.

### 5.3 Ev kuralları ve kendi eklemelerin

Oyun yöneticisine sor: *[Ev kuralı: saldırıda doğal 1 gelirse silahını düşürürsün.]* Oyun yöneticisi bunu masanın bir anlaşması olarak tutar. Gerekirse bir sayfa ya da karakter kağıdında bir sayı yazar. Önceden yazılmış ev kuralları, kampanyanın `rules` klasörüne metin dosyaları olarak konabilir.

Oyun yöneticisi kampanyan için oyun sisteminin bir sayfasını değiştirdiğinde, örneğin bir yaratığın can puanını ya da bir büyünün menzilini, gösterge paneli bunu göründüğü her yerde adının sonuna küçük bir yıldız işaretiyle (*) belirtir. Paketler › Yüklü, değişenleri oyun sisteminin altında, sistemin verdiklerinin yanında listeler. Karakterinin bilmediği bir yaratık orada yalnızca adıyla yer alır. Orada bir sayfayı, oynanmakta olan sahne bittikten sonra sistemin yazdığı haline geri koyabilirsin. Gösterge paneli değişikliği geri alamaz. Değişikliği yalnızca oyun yöneticisi yeniden yazabilir.

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
- **Kendi macerandan veya kitabından**: oyun yöneticisine dosyasını ver, *[OOC: Bu macerayı kampanyamız olarak içe aktar: D:\Books\adventure.pdf. İçindekilerden hiçbirini bana söyleme.]* Kampanyanın dışındaki bir dosya, ancak bilgisayarının bir penceresinde evet dedikten sonra okunur. Kampanyanın **inbox** klasörüne koyduğun dosya hemen okunur. En iyi metin, EPUB, Word belgesi veya metni seçilebilen bir PDF olarak okunur. Taranmış bir PDF sayfalarının görsellerinden okunur; yalnızca Windows'ta, yavaş ve birkaç hatayla. Onu sohbetin dışında kendi yapay zekâ uygulaman okur, olmazsa sohbetteki oyun yöneticisi okur; senin planınla. Claude Code ya da Codex kullanıyorsan bu ikisinden biri okur, Antigravity'de senin Antigravity'n, OpenCode'da içinde en son seçtiğin model. Belgenin tamamı, onu okuyanın yapımcısına gider; hesabının koşullarına ve eğitim konusundaki tercihine tabidir. Gösterge paneli ne kadar ilerlediğini gösterir. Bir romandan başlıyorsan oyun yöneticisi nereden başlanacağını önerir. Yerleri, karakterleri ve sırları yazar.

Bir kampanya bir kez oynanır: aynı macerayı yeniden oynamak için yeni bir kampanya oluştur.

### 7.2 Diller

Kampanya başına tek dil vardır: oyun yöneticisinin dili; gösterge paneli onu izler. Gösterge paneli 26 dille gelir. Başka her dil, bilgisayarında kendi yapay zekâ uygulaman tarafından sohbetin dışında çevrilir (Codex ya da Claude Code; Antigravity ve OpenCode'da kendileri). Hiçbiri yapamıyorsa sohbetteki oyun yöneticisi çevirir. Beşinci sürümün İtalyanca terimleri resmî İtalyanca SRD'den gelir. Kural metni İngilizce kalır, oyun yöneticisi onu senin dilinde anlatır.

---

## 8. Merak edenler için: kampanya klasörü <!-- icon: list -->

Onu açman hiç gerekmez; kampanyanın sırlarını içerir. İçinde şunlar var: `campaign.yaml` (ayarların), `state.yaml` (oyunun geldiği yer), `world/` (her karakter, yer, görev ve diğerleri için birer markdown sayfası), `rules/` (ev kuralların), `images/`, `log.jsonl` (her değişiklik), `sessions/` (oyun yöneticisiyle sohbetlerin metin olarak, Claude Code ve Codex'ten), `.saves/`, `.player/` (notların) ve yapay zekâ ajanlarına RPG Engine'in nerede olduğunu söyleyen küçük dosyalar. Sayfalar Obsidian biçimini kullanır. Bir sayfayı elle değiştirirsen oyun yöneticisi bunu bir sonraki cevabında öğrenir.

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

**Kuralları bilmem gerekiyor mu?** Hayır. Eğitim akıl hocasını seç ve istediğin zaman `[OOC: …]` içinde sor.

**Oyun yöneticisi hile yapabilir mi?** RPG Engine'in yaptığı bir atışı değiştiremez; yalnızca hikâye zorluğunda değiştirebilir. Belirlenmiş gerçekleri de değiştiremez.

**Bir maliyeti var mı?** RPG Engine ücretsizdir. Oyun yöneticisi yapay zekâ uygulamanın planında ya da kendi bilgisayarında yerel bir modelle çalışır. Bir oyun akşamı uzun bir sohbettir: en küçük planlarda akşam bitmeden planın sınırına ulaşabilirsin. Görseller, çeviriler ve içe aktarmalar aynı planı kullanır. RPG Engine'in kendisi çağrı başına ücretlenen bir API anahtarını asla kullanmaz: yapay zekâ uygulamana anahtarla değil, hesabınla giriş yap.

**Telefonumda oynayabilir miyim?** Hayır: oyun yöneticisi bilgisayarında çalışır ve panel yalnızca orada açılır.

**Arkadaşlarımla oynayabilir miyim?** Henüz değil: bugün bir oyuncu, bir karakter, artı yoldaşlar var ([Yakında](#9-coming-later)).

**Bir dahaki sefere farklı bir yapay zekâ kullanabilir miyim?** Evet: sohbeti açmadan önce sohbette başka bir uygulama seç ya da kampanyayı başka bir uygulamada aç ve *devam* yaz.

### Sorunlar

**Bir kampanya açılmıyor.** RPG Engine'i simgesinden ya da bir terminalde `rpg open` ile yeniden aç ve kampanyaya tıkla. Gösterge paneli *Bağlı değil* diyorsa **Kampanyayı yeniden aç**'a bas. **Klasör bulunamadı** yazan bir kart klasörünü kaybetmiştir: onu listeden kaldır ve şimdi bulunduğu yerden **Klasör aç…** ile yeniden ekle. Yapay zekâ uygulamanın kendi sohbetinde gösterge paneli yalnızca o kampanyanın bir sohbeti açıkken çalışır: oyun yöneticisine sor: `[OOC: Gösterge panelinin bağlantısı ne?]`. Claude uygulamasında bir süre arka planda bırakılan sohbet uykuya geçer, sayfa da onunla birlikte. Sohbete tıkla, sayfa aynı adreste geri gelir.

**Oyun yöneticisi oyunu bilmiyor gibi.** Bu, yapay zekâ uygulamanın kendi sohbetinde olur: uygulama RPG Engine'i yüklemedi. Onu kampanya klasöründe başlattığını ve klasöre güvendiğini kontrol et. Claude Code'da `/mcp` yaz ve `rpg`'yi yeniden bağla. Codex'te kampanya klasöründe `codex mcp list` çıktısında `rpg` görünmelidir. `rpg --version` bulunamıyorsa RPG Engine'i yeniden kur ([2.2](#22-install)).

**Windows `claude` komutunu bulamıyor.** Bu, Claude Code'u kendin kurduğunda olur. Kurulum programı bunu sarı bir notla söyler ve programın girdiği klasörü gösterir. O klasörü PATH'e ekle (Sistem Özellikleri > Ortam Değişkenleri), sonra yeni bir terminal aç.

**Güncelleme.** RPG Engine'in daha yeni bir sürümü çıktığında gösterge paneli bunu söyler: Packages › Installed bölümünde RPG Engine en başta durur ve yanında **Güncelle** vardır; sonra sayfanın söylediğini yap. Ya da bir terminalde `npm install -g rpg-engine` komutunu yeniden çalıştır, sonra yeni bir sohbet aç: çalışan bir oyun yöneticisi başladığı sürümü korur.

**Oyun yöneticisi geri aldığım bir şeyi hatırlıyor.** Yeni bir sohbet aç ve Kayıtlar'da **Yeni sohbet açtım** düğmesine bas.

**Bir uygulama kurulmuyor.** Sayfa nedenini söyler: **Tekrar dene**'ye bas. Ya da uygulamayı yapımcısının sitesinden kendin kur, sonra **Yeniden kontrol et**'e bas.

**Giriş sayfası tarayıcıda açılmıyor.** Sayfa seni beklerken, göründüğü yerdeki **Giriş sayfasını yeniden aç**'a bas ya da **İptal**'e basıp bir kez daha dene.

**Gösterge panelinin sohbeti başka bir sohbetin oynadığını söylüyor.** Yapay zekâ uygulamanda kendin açtığın bir sohbet bu kampanyayı oynuyor: orada devam et ya da gösterge panelinde oynamak için onu kapat.

**Hiç görsel çıkmıyor.** Ayarlar > Campaign > Pictures, bu bilgisayarın görsel yapıp yapamadığını ve nasıl yapabileceğini söyler.

**Kurulum başarısız oluyor veya `rpg` başlamıyor.** `node --version` çıktısı 24 veya daha yeni olmalı. Windows betiklerin çalıştırılmasının devre dışı olduğunu söylerse [2.1](#21-what-you-need) bölümüne bak. Windows'ta RPG Engine'i ve kampanyalarını `&` içeren yollardan uzak tut.

**Gösterge paneli bağlantısı değişti.** Yapay zekâ uygulamanın kendi sohbetinde her kampanyanın kendi adresi vardır ve bu adres sohbetten sohbete aynı kalır. Adres yalnızca başka bir program onu zaten kullanıyorsa değişir: oyun yöneticisi sana yeni bağlantıyı verir ve bundan sonra o kalır. Aynı kampanyanın ikinci bir sohbeti sayfayı aynı adreste tutar, birincisini kapattığında da sayfayı devralır.
