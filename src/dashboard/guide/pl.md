<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
# RPG Engine: pełny przewodnik

**RPG Engine** pozwala grać w tradycyjną grę fabularną z **AI w roli Mistrza Gry**. Rozmawiasz z Mistrzem Gry na **czacie**. RPG Engine pracuje w tle: **pamięta świat**, **rzuca kośćmi** i **prowadzi rachunki**. Obok czatu trzymasz otwartą w przeglądarce stronę, czyli **dashboard**, z kartą postaci, kośćmi, mapami i dziennikiem.

Ten przewodnik jest dla graczy: nie musisz umieć programować.

## Szybki start <!-- icon: send -->

1. Zainstaluj **Node.js** ze strony [nodejs.org](https://nodejs.org) (wersja LTS).
2. Zainstaluj **agenta AI**, czyli program, w którym działa Mistrz Gry, i zaloguj się: na przykład Claude Code albo Codex ([2.4](#24-connect-your-ai)).
3. W terminalu zainstaluj RPG Engine: `npm install -g rpg-engine`.
4. Utwórz kampanię: `rpg init "The Salt Isles"`.
5. Wejdź do nowego folderu poleceniem `cd "The Salt Isles"` i uruchom tam agenta: `claude` dla Claude Code, `codex` dla Codex. Zgódź się, gdy zapyta, czy ufasz temu folderowi ([2.4](#24-connect-your-ai)), a potem napisz *Cześć! Zaczynajmy.* Mistrz Gry odpowie linkiem do dashboardu.

## 1. Czym jest RPG Engine <!-- icon: about -->

| Kto | Co robi |
|---|---|
| **Ty** | Grasz swoją postacią: decydujesz, co robi, mówi i próbuje zrobić. |
| **Mistrz Gry** (AI) | Opowiada historię, gra wszystkich pozostałych, decyduje, co się dzieje, i prosi o rzuty. |
| **RPG Engine** | Przechowuje świat w plikach, rzuca kośćmi, liczy punkty życia, pieniądze, czas i odległości oraz strzeże sekretów, dopóki ich nie odkryjesz. |

Świat pozostaje taki sam z wieczoru na wieczór, nawet w nowym czacie, nawet z inną AI:

- **To, co zostało powiedziane, pozostaje prawdą.** Martwy złoczyńca pozostaje martwy.
- **Kości są prawdziwe.** Mistrz Gry nie może ich naginać, chyba że na najłatwiejszym poziomie trudności, jeśli go wybierzesz.
- **Sekrety pozostają sekretami.** Mistrz Gry nigdy nie zdradza tego, czego postać nie wie.
- **Świat się porusza.** Zagrożenia narastają, gdy odpoczywacie lub podróżujecie, a Ty widzisz ich znaki.
- **Kampania to folder** na komputerze: przerywasz, kiedy chcesz, i wracasz później.

Gra działa w oparciu o system gry, czyli pakiet, który Mistrz Gry instaluje do kampanii. Obecnie nasz to **piąta edycja**, oparta na darmowym System Reference Document 5.1. Bez systemu gry grasz za darmo w historię bez liczb. Kolejne systemy pojawią się później ([Plany na przyszłość](#9-coming-later)).

---

## 2. Pierwsze kroki <!-- icon: path -->

### 2.1 Co jest potrzebne

- Komputer z Windows, macOS lub Linuksem oraz przeglądarka internetowa.
- **Node.js 22** lub nowszy, ze strony [nodejs.org](https://nodejs.org). Razem z nim instaluje się `npm`, który instaluje RPG Engine.
- **Terminal**: w Windows Terminal lub PowerShell, w macOS Terminal. Aby otworzyć terminal w folderze, kliknij folder prawym przyciskiem myszy i wybierz **Otwórz w Terminalu** (Windows) lub **Usługi > Nowy terminal w folderze** (macOS).
- **Agent AI** dla Mistrza Gry ([2.4](#24-connect-your-ai)), z **największym modelem**, jaki oferuje. Mały model łatwiej namówić do ujawnienia sekretów albo naginania zasad.

### 2.2 Instalacja

```text
npm install -g rpg-engine
```

Polecenie `rpg --version` sprawdza, czy instalacja się udała. Używasz `rpg` raz na kampanię, aby ją utworzyć. Potem agent uruchamia RPG Engine sam.

### 2.3 Tworzenie kampanii

Otwórz terminal w folderze, w którym trzymasz swoje gry ([2.1](#21-what-you-need) mówi, jak to zrobić):

```text
rpg init "The Salt Isles"
```

To tworzy folder `The Salt Isles` z nową kampanią w środku. Wejdź do niego poleceniem `cd "The Salt Isles"`. Zapamiętaj, gdzie on jest: wracasz do niego za każdym razem, gdy grasz. Całą resztę wybierasz później, w czacie lub na dashboardzie. Polecenie `rpg init --help` pokazuje opcje, które można wybrać już teraz, na przykład `--language it` lub `--difficulty hard`.

Mistrz Gry nie może utworzyć kampanii za Ciebie: przed `init` nic nie mówi agentowi, gdzie jest RPG Engine.

### 2.4 Połącz swoją AI

Mistrz Gry działa w **agencie AI**: aplikacji AI, w terminalu lub na pulpicie, która potrafi pracować na plikach na Twoim komputerze, jak Claude Code czy Codex. Zwykły czat, taki jak claude.ai lub ChatGPT, ani aplikacja na telefon nie wystarczą: Mistrz Gry musi mieć dostęp do plików kampanii na Twoim komputerze. Każdy agent wymaga własnego planu i logowania: Claude Code płatnego planu Claude, Codex logowania do ChatGPT. Instalujesz go raz, ze strony agenta: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: w folderze kampanii wpisz `claude`. Gdy zapyta, czy ufasz folderowi, wybierz **Yes, I trust this folder**. Uwaga: domyślnie zaznaczona jest odpowiedź *No, exit*. Kampania ma też mały hook, `rpg --listen`, którego to pytanie nie pokazuje: informuje on Mistrza Gry od razu, gdy działasz z dashboardu.
- **Codex**: w folderze kampanii wpisz `codex` i zgódź się, gdy zapyta, czy ufasz folderowi. W jego aplikacji na pulpit sprawdź w ustawieniach, czy pamięć jest wyłączona dla czatów gry.
- **Inny agent**: uruchom go w folderze kampanii i podaj mu serwer MCP `rpg mcp`. RPG Engine to standardowy serwer MCP: Mistrzem Gry może być każdy agent obsługujący MCP, także lokalny.

Gramy i testujemy z **Claude Code**. **Codex** jest podłączony i sprawdzony, ale nie rozegrano z nim jeszcze całej kampanii. Kampania wyłącza własną pamięć agenta: gra żyje w jego plikach, dzięki czemu powrót do zapisu naprawdę cofa grę.

### 2.5 Pierwszy czat

Napisz cokolwiek, na przykład *Cześć! Zaczynajmy.* W pierwszej odpowiedzi w każdym czacie Mistrz Gry podaje **link do Twojego dashboardu**, coś w rodzaju `http://127.0.0.1:4750`. Otwórz go i trzymaj obok czatu.

Między wiadomościami Mistrza Gry agent pokazuje narzędzia, których używa. Nie otwieraj ich szczegółów (w Claude Code ctrl+o), bo mogą zdradzać sekrety.

Nowa kampania przechodzi przez trzy etapy, widoczne u góry dashboardu: **1 Ustawienia** (jak chcesz grać), **2 Sesja zero** (tworzysz postać, w grze), **3 Gra**.

### 2.6 Ustawienia: jak chcesz grać

Mistrz Gry pyta tylko o to, czego jeszcze brakuje, po kilka pytań naraz. Krok **Ustawienia** na dashboardzie pokazuje te same pytania jako karty. Napisz „Ty decyduj", a Mistrz Gry wybierze. Wszystko można zmienić później, w czacie lub w **Ustawieniach**.

| Ustawienie | Co decyduje | Wartości |
|---|---|---|
| **Mentor** | Jak dużo Mistrz Gry uczy Cię zasad | wyłączony, podpowiedzi, samouczek |
| **Poziom trudności** | Jak trudny jest świat | fabuła, łatwy, normalny, trudny, brutalny |
| **Śmiertelność** | Co oznacza upadek w walce | narracyjna (nigdy nie giniesz), epicka (tylko gdy to ważne), kości |
| **Zapisy** | Kiedy można wrócić | permasmierć, punkt kontrolny, dowolne ([3.8](#38-saves-and-going-back)) |
| **Rygor** | Jak ściśle obowiązują zasady dotyczące jedzenia, światła i podróży | płynny, zasady, symulacja |
| **Kości** | Kto rzuca Twoimi kośćmi | cyfrowe, fizyczne |
| **Jednostki** | Odległości i wagi | metryczne, imperialne |
| **Głosy postaci** | Kto mówi za spotykane postacie, od Mistrza Gry po same postacie: zawsze Mistrz Gry; w kluczowych momentach sama postać, znająca tylko to, co wie, według wyboru Mistrza Gry; albo zawsze sama postać, dla głównych lub dla wszystkich, wolniej i drożej, jeśli Twoja aplikacja AI to potrafi | Mistrz Gry, czasem, główne postacie, wszyscy |
| **Towarzysze** | Kto podróżuje z Tobą | brak, tworzeni z Tobą, tworzeni przez Mistrza Gry, poznani w grze |
| **Obrazy** | Obrazy miejsc, zadań i spotykanych postaci | brak, na prośbę, nowe miejsca, zadania i spotkane postacie ([3.11](#311-pictures)) |
| **Linie** i **Zasłony** | Co nigdy się nie pojawia, a co dzieje się tylko poza ekranem | listy |
| **Język** | Język gry i dashboardu | dowolny |

Piąta edycja dodaje **rozwój postaci**: punkty doświadczenia albo kamienie milowe.

Gdy nie ma gotowego świata, Mistrz Gry pyta też o **założenie** (gatunek, ton, kilka elementów i to, co w grze lubisz najbardziej, na przykład walki, zagadki, rozmowy lub eksplorację, własnymi słowami) oraz o **przygotowanie**: czy budować świat w locie, w trakcie gry, czy całość na początku.

**Styl Mistrza Gry** nie jest nigdy pytany, ale można go zmienić w czacie lub w **Ustawieniach**: **proza** (prosta, literacka, pulpowa, ironiczna), wymyślane **historie** (sytuacje, wątki, odcinki, tajemnica), autor, **na wzór którego pisać**, albo cokolwiek innego **Twoimi słowami**.

### 2.7 Sesja zero: Twoja postać

Postać tworzysz z Mistrzem Gry, jak przy stole. Każdy wybór należy do Ciebie, chyba że poprosisz Mistrza Gry, aby go dokonał. Możesz przyjść z pełnym pomysłem, mglistym albo z niczym. Mistrz Gry mówi, jak powstają wartości cech, zanim padnie jakikolwiek rzut kością. Historia postaci nigdy nie jest wymagana. Jeśli ją podasz, Mistrz Gry zapisze ją Twoimi słowami. Potem Mistrz Gry prosi o obraz postaci ([3.7](#37-your-characters-story-and-picture)). RPG Engine liczy kartę postaci: nigdy nie robisz rachunków.

---

## 3. Granie <!-- icon: chat -->

### 3.1 Rozmowa z Mistrzem Gry

Pisz, co robi lub mówi Twoja postać, własnymi słowami:

> Pytam karczmarza, kto jeszcze tu dzisiaj zaglądał.

Żeby wyjść poza opowieść, pisz w nawiasach kwadratowych: *[Jak działa chwyt zapaśniczy?]* Mistrz Gry też odpowie w nawiasach.

Ty mówisz, czego próbujesz. Mistrz Gry mówi, co się dzieje. Mistrz Gry nigdy nie decyduje za Twoją postać i nigdy nie mówi o silniku gry. Możesz go zapytać, jak korzystać z dashboardu.

**Działanie z poziomu dashboardu**: kliknij nazwę na karcie postaci, na przykład broń, zaklęcie lub coś, co nosisz, a potem wybierz, kogo to dotyczy. Możesz też kliknąć osobę, z którą chcesz porozmawiać. Dashboard układa Twoje zdanie, *Atakuję Zakapturzonego Bandytę 1 Maczugą.*, które możesz zmienić przed kliknięciem **Powiedz Mistrzowi Gry**. Mistrz Gry słyszy je tak, jakby padło na czacie, i rozstrzyga jak każde inne. Gdy Twoja aplikacja AI nie może go odebrać sama, **Kopiuj** przygotowuje zdanie do wklejenia na czacie.

### 3.2 Rzuty

Mistrz Gry prosi o rzut tylko wtedy, gdy wynik jest niepewny i ma znaczenie. Najpierw mówi, o co toczy się gra. Potem:

- **Na dashboardzie** baner pokazuje przycisk dla każdego testu, na przykład *Acrobatics +4 · z przewagą*. Kliknij go: kości spadną na stronie, a Mistrz Gry usłyszy wynik. Możesz też kliknąć podświetlony wiersz karty postaci, rzucić kośćmi z tacki na kości albo wpisać w banerze coś innego.
- **Ręcznie**, w rogu banera lub w **Ustawieniach**: baner mówi, czym rzucić, a Ty rzucasz z karty postaci lub z tacki na kości.
- **Kości fizyczne**, gdy ustawienie kości jest na fizyczne: wpisujesz wyniki rzutu, *[Wyrzucono 14.]*, a RPG Engine dodaje Twoje modyfikatory.

**Swobodne rzuty**: kliknij dowolną liczbę na karcie postaci albo otwórz tackę na kości, żeby rzucać dla zabawy. Nigdy się nie liczą, a Mistrz Gry ich nie widzi.

**Rzuty Mistrza Gry** pojawiają się w kolumnie rzutów, oprócz tajnych. Zawsze możesz zapytać *[Czy ten rzut był prawdziwy?]*: przy tajnym rzucie Mistrz Gry podaje odcisk, który dowodzi, że rzut wykonano, zanim padło pytanie.

### 3.3 Sceny i walki

Opowieść toczy się w **scenach**: walka, rozmowa, zwiedzanie, podróż, odpoczynek. Na końcu każdej sceny gra zapisuje się sama, a scena trafia do Twojego dziennika.

W walce Mistrz Gry opowiada o każdej turze, która nie jest Twoja, i zatrzymuje się tam, gdzie możesz podjąć decyzję. **Scena** pokazuje u góry, czyja jest tura i kto będzie następny, a obok mapy kartę Twojej postaci. Kolejność tur, punkty wytrzymałości drużyny i to, jak ranni wyglądają przeciwnicy (opisane słowami), zostają z boku strony. Jeśli Twoja postać upadnie, rzuty obronne przeciw śmierci pojawią się na stronie w dużym rozmiarze.

### 3.4 Czas, podróże i świat, który się zmienia

RPG Engine pilnuje daty. Między sesjami czas nie płynie. Powiedz, że odpoczywacie, *Robimy długi odpoczynek*, a gdy Mistrz Gry się zgodzi, odpoczynek przywróci to, co trzeba. Przy krótkim odpoczynku Mistrz Gry może zapytać na dashboardzie, ile kości wytrzymałości wydajesz: rzucaj nimi po jednej, patrz, ile każda leczy, i przestań, kiedy chcesz. Powiedz, dokąd idziesz, *Ruszamy drogą na północ do Rocca*, a RPG Engine obliczy trasę, dystans i liczbę dni, zatrzymując się, gdy coś wydarzy się po drodze. Pieniądze liczy się w monetach gry, łącznie z resztą.

Złoczyńcy mają plany z terminami. Każdego nowego dnia Mistrz Gry porusza zagrożenia, które czas posunął naprzód. Widzisz ich znaki, ale nigdy sam zegar.

### 3.5 Mapy

**Świat** pokazuje miejsca, które zna Twoja postać, drogi między nimi i szlak, który przebyła, a resztę przykrywa mgła. **Scena** pokazuje mapę miejsca, w którym jesteś, jeśli je ma, razem z tym, kto gdzie stoi. W walce, w Twojej turze, pola poza zasięgiem są zasłonięte. Gdy Mistrz Gry pyta, dokąd się ruszasz, dotknij pola albo je wpisz, na przykład *E4*.

**Świat** przechowuje też wiedzę Twojej postaci. **Wiedza** zawiera listę osób, miejsc, frakcji, stworzeń i opowieści, które postać zna, każde tak, jak ona je zna: przeszukaj ją albo otwórz wpis, żeby przeczytać go w całości. Nazwa w tekście prowadzi do swojej strony. **Dokumenty** przechowują listy, ogłoszenia i strony, które postać znalazła, żeby można je było przeczytać ponownie. **Kalendarz** pokazuje dzisiejszy dzień, terminy zadań z pozostałym czasem oraz dni opowieści: dzień ze scenami prowadzi do jego rozdziałów w Dzienniku.

### 3.6 Zadania, dziennik i notatki

Sprawa, którą podejmuje Twoja postać, staje się zadaniem w **Dzienniku**, z jego celami, terminem i tym, co mierzy. Oznacz je gwiazdką, żeby zostało na widoku u góry Sceny. Dziennik opowiada też Twoją **historię**, scena po scenie, i przechowuje Twoje **notatki**: są prywatne, chyba że klikniesz **Udostępnij**. Mistrz Gry słyszy wtedy notatkę jako to, co myślisz, nigdy jako fakt. W sekcji **Towarzysze** czytasz dzienniki towarzyszy: od czasu do czasu, na koniec dnia lub zadania, zapisują kilka linijek o tym, co myślą i czują.

### 3.7 Historia i obraz postaci

Na karcie postaci karta **Opis** ma pole na historię Twojej postaci: Mistrz Gry wpisuje ją tam, gdy się zgodzisz. Jako obraz możesz dać Mistrzowi Gry plik (PNG, JPEG, WebP lub SVG, do 5 MB) wraz z informacją, gdzie jest na Twoim komputerze, albo poprosić o portret ([3.11](#311-pictures)): *[Zrób mi portret: siwe włosy w warkoczu, blizna na brodzie.]*

### 3.8 Zapisy i powroty

RPG Engine zapisuje całą kampanię na końcu każdej sceny. Resztę określa ustawienie **zapisów**:

| Zapisy | Zapis na życzenie | Powrót |
|---|---|---|
| **permadeath** | nie | nigdy |
| **checkpoint** | nie | do ostatniego zapisu, tylko gdy postać zginie |
| **wolna** | tak | do dowolnego zapisu |

W każdym trybie możesz **zacząć od nowa**, od początku gry lub od sesji zero. Zrób to na czacie albo w **Zapisach**.

Po powrocie **otwórz nowy czat**: stary pamięta to, co zostało cofnięte. Napisz *kontynuuj* na nowym czacie, a potem naciśnij **Nowy czat otwarty** w Zapisach.

### 3.9 Sesje: przerwa i powrót

Przerwij, kiedy chcesz: *[Skończmy na dziś.]* Wszystko jest już zapisane w plikach. Żeby wrócić, uruchom swojego agenta w folderze kampanii i napisz *kontynuuj*: Mistrz Gry krótko podsumuje, co było, i poprowadzi dalej.

### 3.10 Nastrój Mistrza Gry

Robot u góry dashboardu to Mistrz Gry: jego twarz podąża za tonem opowieści i nigdy nie zdradza tego, czego jeszcze nie wiesz. Gdy czat jest zamknięty, robot śpi.

### 3.11 Obrazy

RPG Engine potrafi tworzyć obrazy miejsc, do których docierasz, zadań, które podejmujesz, i osób, które spotykasz, zgodnie z ustawieniem **obrazów**, a także portret Twojej postaci na prośbę. Korzysta z Twojego własnego Codex lub Claude Code, z Twoim logowaniem, w ramach Twojego planu i jego limitów: **Codex** maluje obrazy, a w przeciwnym razie rysuje je **Claude Code**. **Ustawienia** pokazują, czy ten komputer może je tworzyć, a jeśli nie, jak to skonfigurować. Zawsze możesz dać Mistrzowi Gry własny obraz.

### 3.12 Bezpieczeństwo: linie, zasłony i stop

**Linie** nigdy nie pojawiają się w grze, a **zasłony** działają tylko poza ekranem. W każdej chwili napisz *[stop]*: Mistrz Gry od razu porzuca tę treść i dodaje ją do Twoich linii.

### 3.13 Zmiana zdania

Każde ustawienie można zmienić, na czacie lub w **Ustawieniach**. Rozstrzygnięcie, które Mistrz Gry podejmuje bez podręcznika, staje się **precedensem**, więc to samo pytanie następnym razem dostaje tę samą odpowiedź.

---

## 4. Pulpit <!-- icon: party -->

Strona na Twoim komputerze, otwierana tylko w przeglądarce na tym komputerze. Działa, dopóki czat jest otwarty. Gdy czat się zamyka, pokazuje *Not connected*. Wraca sama przy następnym czacie.

- **Drużyna**: Twoja karta postaci i karty towarzyszy. Kliknij liczbę, aby wykonać rzut. Najedź na nią kursorem, aby zobaczyć, skąd się bierze. Gdy strzałka oznacza kość, zobaczysz też, co poprawia rzut lub go pogarsza. Obok są rzuty.
- **Scena**: gdzie jesteś, obraz i mapa miejsca, kto tam jest, co się dzieje. W walce: tury i karta Twojej postaci.
- **Dziennik**: zadania, fabuła, dzienniki towarzyszy, Twoje notatki.
- **Świat**: mapa świata, to, co wie Twoja postać, znalezione dokumenty i kalendarz.
- **Tacka na kości**: wybierz kości i modyfikator, potem rzuć. ×2 podwaja kości, nigdy modyfikator, tak jak przy trafieniu krytycznym.
- **Zapisy**, **Pomoc**, **Ustawienia** i **Informacje**: ikony na końcu rzędu. W Ustawieniach są też preferencje samej strony: motyw, dźwięk kości, zestaw kości.

Gdy Mistrz Gry o coś pyta, jego baner zostaje na górze, w jakiejkolwiek sekcji jesteś.

---

## 5. Systemy gry i zasady domowe <!-- icon: dice -->

### 5.1 Czym jest system gry

To dane jednej gry: jej karta postaci, liczby, stworzenia, przedmioty, zaklęcia i tekst zasad. Każda kampania korzysta z jednego systemu. RPG Engine oblicza kartę postaci oraz to, co się zużywa i odnawia. Jak działa dana zdolność, Mistrz Gry czyta w zasadach i rozstrzyga, tak jak przy stole.

### 5.2 Piąta edycja

Rasy, klasy, podklasy, pochodzenie i atut z SRD 5.1; 319 zaklęć, broń, pancerze, przedmioty magiczne i potwory; rozdziały z zasadami, które Mistrz Gry czyta w dokładnym brzmieniu; pełna, wyliczona karta postaci.

To osobny pakiet: Mistrz Gry proponuje go przy zakładaniu kampanii i instaluje. Kampania, która z niego korzysta, instaluje go sama przy pierwszym otwarciu na komputerze, na którym go nie ma, a Mistrz Gry daje Ci o tym znać.

Możesz też grać treściami, których brakuje w SRD, z posiadanego podręcznika: Mistrz Gry zapisuje je jako strony Twojej kampanii, a RPG Engine traktuje je jak własne. RPG Engine dostarcza wyłącznie treści otwarte, ale wiedza Mistrza Gry nie jest niczym ograniczona.

Własne podręczniki mogą stać się Twoją biblioteką: powiedz Mistrzowi Gry, gdzie są, *[Moje podręczniki są w D:\Books\5e.]*, albo dodaj ich folder w Packages › Library i raz zgódź się w oknie, które pokaże komputer. RPG Engine czyta je na tym komputerze. Każda kampania korzysta z folderów, które tam włączysz, a Mistrz Gry przeszukuje je przy rozstrzyganiu zasad, po SRD, podając książkę i stronę. Najlepiej czytają się jako tekst albo jako pliki PDF z tekstem, który można zaznaczyć. Zeskanowany PDF jest odczytywany z obrazów stron, tylko w systemie Windows, w kilka minut i z kilkoma błędami. RPG Engine nigdy nie zmienia Twoich podręczników, nigdzie nie wysyła ich tekstu i nigdy nie kopiuje go do kampanii.

### 5.3 Zasady domowe i własne dodatki

Poproś Mistrza Gry: *[Zasada domowa: naturalna 1 w ataku oznacza upuszczenie broni.]* Mistrz Gry zapisuje ją jako umowę przy stole albo tworzy stronę lub wartość na karcie postaci, jeśli jest potrzebna. Gotowe zasady domowe można umieścić jako pliki tekstowe w folderze `rules` kampanii.

### 5.4 Dodawanie lub importowanie własnego systemu gry

System gry to pakiet: Mistrz Gry instaluje go z npm, z folderu lub z pliku, a pakiet spoza naszej oferty tylko po Twojej zgodzie, w oknie na komputerze. Stworzenie takiego pakietu to praca dla programisty, opisana w dokumentach RPG Engine na GitHubie. Zamiana Twojego podręcznika w system gry jeszcze nie jest dostępna ([Plany na przyszłość](#9-coming-later)).

---

## 6. Rozszerzenia <!-- icon: plus -->

Rozszerzenie dodaje do kampanii coś ekstra, ponad system gry: na przykład pogodę, która zmienia się z każdym świtem, albo otwieranie zamków za pomocą kości. Dodasz je w Packages › Add: z listy albo przez nazwę w npm, folder lub plik. Rozszerzenie spoza naszej oferty zawiera kod, więc działa tylko za Twoją zgodą, w oknie na Twoim komputerze. Rozszerzenie stworzone dla innego systemu gry informuje o tym i nie zostanie dodane. W Packages › Installed aktualizujesz rozszerzenia lub je usuwasz. Mistrz Gry też może dodać rozszerzenie, gdy o to poprosisz.

---

## 7. Skąd się bierze kampania i jej język <!-- icon: world -->

### 7.1 Trzy sposoby na świat

- **Tworzony na bieżąco**: na podstawie Twojego założenia Mistrz Gry buduje każde miejsce, osobę i wątek tuż przed tym, jak będą potrzebne, i je zapamiętuje.
- **Przygotowany na początku**: tak samo, tylko świat powstaje przed grą.
- **Z Twojej własnej przygody lub książki**: daj Mistrzowi Gry jej plik, *[Zaimportuj tę przygodę jako naszą kampanię: D:\Books\adventure.pdf. Nie mów mi nic z tego, co w niej jest.]* Najlepiej czyta się tekst, EPUB, dokument Word albo PDF z zaznaczalnym tekstem. PDF ze skanu jest czytany z obrazów stron, tylko w systemie Windows, powoli i z kilkoma błędami. Twój Codex lub Claude Code czyta go poza czatem, a jeśli nie, to Mistrz Gry w czacie, w ramach Twojego planu: cały dokument trafia do OpenAI lub Anthropic, na warunkach Twojego konta i jego ustawień dotyczących trenowania. Dashboard pokazuje postęp. Przy powieści Mistrz Gry proponuje, od czego zacząć. Spisuje miejsca, postacie i sekrety.

W kampanię gra się raz: aby zagrać tę samą przygodę jeszcze raz, utwórz nową kampanię.

### 7.2 Języki

Jeden język na kampanię, język Mistrza Gry, za którym podąża dashboard. Dashboard jest dostępny w 26 językach. Każdy inny tłumaczy na Twoim komputerze Codex lub Claude Code, a bez nich Mistrz Gry w czacie. Terminy piątej edycji po włosku pochodzą z oficjalnego włoskiego SRD. Tekst zasad zostaje po angielsku, a Mistrz Gry opowiada go w Twoim języku.

---

## 8. Dla ciekawskich: folder kampanii <!-- icon: list -->

Nigdy nie trzeba go otwierać, a zawiera sekrety kampanii. Znajdują się w nim: `campaign.yaml` (ustawienia), `state.yaml` (stan gry), `world/` (jedna strona markdown dla każdej postaci, miejsca, zadania i reszty), `rules/` (zasady domowe), `images/`, `log.jsonl` (każda zmiana), `.saves/`, `.player/` (notatki) oraz małe pliki, które mówią agentom AI, gdzie jest RPG Engine. Strony używają formatu Obsidiana. Jeśli zmienisz stronę ręcznie, Mistrz Gry dowie się o tym przy następnej odpowiedzi.

RPG Engine pozostaje w tym folderze: czyta i zapisuje grę tylko tutaj i nigdy nie dotyka innych plików. Foldery z podręcznikami tylko czyta. Poza kampanią trzyma wyłącznie własne foldery z danymi (tłumaczenia dashboardu, tekst odczytany z podręczników oraz Codex lub Claude Code, jeśli pozwolisz je zainstalować) i foldery tymczasowe na czas rysowania obrazu. O wszystko inne, co agent chce zrobić na komputerze, najpierw pyta.

Każde polecenie, którego używa Mistrz Gry, można też uruchomić w folderze kampanii: `rpg --help` wyświetla ich listę. Wiele z nich wypisuje sekrety kampanii.

---

## 9. Plany na przyszłość <!-- icon: hourglass -->

- **Ty jako Mistrz Gry**, a AI gra drużyną.
- **Tryb autora**: piszesz przygodę z AI, a potem ją eksportujesz i udostępniasz.
- **Kilka osób na jednym komputerze**, każda z własną postacią, na zmianę w tym samym czacie.
- **Więcej rozszerzeń**: światy, funkcje i zasady domowe do udostępniania.
- **Inne gry**: kolejne systemy gier i własne.

---

## 10. Pytania i problemy <!-- icon: info -->

### Pytania

**Czy muszę znać zasady?** Nie. Wybierz mentora w trybie samouczka i pytaj w nawiasach, kiedy chcesz.

**Czy Mistrz Gry może oszukiwać?** Nie może zmienić rzutu wykonanego przez RPG Engine, chyba że na poziomie trudności fabularnym, ani faktów już ustalonych.

**Czy to coś kosztuje?** RPG Engine jest darmowy. Mistrz Gry działa w ramach planu Twojego agenta albo na Twoim komputerze z modelem lokalnym. Wieczór gry to długi czat: na najmniejszych planach możesz dojść do limitu planu przed końcem wieczoru. Obrazy, tłumaczenia i importy korzystają z tego samego planu. RPG Engine nigdy nie używa klucza API, za który płaci się za każde wywołanie: zaloguj agenta swoim kontem, nie kluczem.

**Czy mogę grać na telefonie?** Nie: Mistrz Gry działa na Twoim komputerze, a dashboard otwiera się tylko tam.

**Czy mogę grać ze znajomymi?** Jeszcze nie: dziś jest jeden gracz, jedna postać i towarzysze ([Wkrótce](#9-coming-later)).

**Czy następnym razem mogę użyć innego AI?** Tak: otwórz kampanię w innym agencie i napisz *kontynuuj*.

### Problemy

**Dashboard się nie otwiera.** Zapytaj Mistrza Gry: `[Jaki jest link do dashboardu?]`. Działa tylko wtedy, gdy w tej kampanii jest otwarty czat, po pierwszej odpowiedzi Mistrza Gry.

**Mistrz Gry chyba nie zna gry.** Twój agent nie załadował RPG Engine. Sprawdź, czy uruchomiono go w folderze kampanii i czy ufasz temu folderowi. W Claude Code wpisz `/mcp` i połącz ponownie `rpg`. W Codex polecenie `codex mcp list` w folderze kampanii musi pokazać `rpg`. Jeśli `rpg --version` nie zostanie znalezione, zainstaluj RPG Engine ponownie ([2.2](#22-install)).

**Aktualizacja.** Uruchom ponownie `npm install -g rpg-engine`, a potem otwórz nowy czat: działający Mistrz Gry zachowuje wersję, z którą wystartował.

**Mistrz Gry pamięta coś, co cofnięto.** Otwórz nowy czat i naciśnij **Nowy czat otwarty** w Zapisach.

**Nie pojawiają się obrazy.** Ustawienia > Obrazy mówią, czy ten komputer może je tworzyć i jak.

**Instalacja się nie udaje albo `rpg` nie startuje.** `node --version` musi pokazać 22 lub nowszą wersję. W systemie Windows trzymaj RPG Engine i swoje kampanie poza ścieżkami zawierającymi `&`.

**Link do dashboardu się zmienił.** Inny program zajął zwykły adres. Mistrz Gry poda Ci nowy link.
