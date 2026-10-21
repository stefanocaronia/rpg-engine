<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d 4775a5e9 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
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
| **Ty** | Grasz swoją postacią: co robi, mówi i próbuje. |
| **Mistrz Gry** (AI) | Opowiada historię, gra wszystkich pozostałych, decyduje, co się dzieje, prosi o rzuty. |
| **RPG Engine** | Trzyma świat w plikach, rzuca kośćmi, liczy punkty życia, pieniądze, czas i odległości, ukrywa sekrety, dopóki ich nie odkryjesz. |

Świat pozostaje taki sam z wieczoru na wieczór, nawet w nowym czacie, nawet z inną AI:

- **To, co zostało powiedziane, pozostaje prawdą.** Martwy złoczyńca pozostaje martwy.
- **Kości są prawdziwe.** Mistrz Gry nie może ich naginać, chyba że na najłatwiejszym poziomie trudności, jeśli go wybierzesz.
- **Sekrety pozostają sekretami.** Mistrz Gry nigdy nie zdradza tego, czego Twoja postać nie wie.
- **Świat się porusza.** Zagrożenia rosną, gdy odpoczywacie lub podróżujecie, a Ty widzisz ich znaki.
- **Kampania to folder** na Twoim komputerze: przerwij, kiedy chcesz, wróć później.

Obecnie RPG Engine obsługuje jeden system gry, **piątą edycję**, opartą na darmowym System Reference Document 5.1. Kolejne dopiero powstaną ([Wkrótce](#9-coming-later)).

---

## 2. Pierwsze kroki <!-- icon: path -->

### 2.1 Czego potrzebujesz

- Komputera z systemem Windows, macOS lub Linux oraz przeglądarki internetowej.
- **Node.js 22** lub nowszego, ze strony [nodejs.org](https://nodejs.org). Razem z nim instaluje się `npm`, który instaluje RPG Engine.
- **Terminala**: w Windows to Terminal lub PowerShell, w macOS to Terminal. Aby otworzyć terminal w folderze, kliknij folder prawym przyciskiem myszy i wybierz **Otwórz w Terminalu** (Windows) lub **Usługi > Nowy Terminal w folderze** (macOS).
- **Agenta AI** dla Mistrza Gry ([2.4](#24-connect-your-ai)), z **największym modelem**, jaki oferuje. Mały model łatwiej namówić do zdradzenia sekretów albo naginania zasad.

### 2.2 Instalacja

```text
npm install -g rpg-engine
```

Polecenie `rpg --version` sprawdza, czy instalacja się udała. Polecenia `rpg` używasz raz na kampanię, aby ją utworzyć. Potem agent uruchamia RPG Engine sam.

### 2.3 Tworzenie kampanii

Otwórz terminal w folderze, w którym trzymasz swoje gry ([2.1](#21-what-you-need) podpowiada, jak to zrobić):

```text
rpg init "The Salt Isles"
```

Powstaje folder `The Salt Isles` z nową kampanią w środku. Wejdź do niego poleceniem `cd "The Salt Isles"`. Zapamiętaj, gdzie on jest: wracasz do niego za każdym razem, gdy grasz. Całą resztę wybierzesz później, w czacie albo na dashboardzie. Polecenie `rpg init --help` pokazuje opcje, które można wybrać już teraz, takie jak `--language it` albo `--difficulty hard`.

Mistrz Gry nie może utworzyć kampanii za Ciebie: przed `init` nic nie mówi agentowi, gdzie jest RPG Engine.

### 2.4 Połącz swoje AI

Mistrz Gry działa w **agencie AI**: aplikacji AI, w terminalu lub na pulpicie, która potrafi pracować na plikach na Twoim komputerze, takiej jak Claude Code lub Codex. Zwykły czat, taki jak claude.ai czy ChatGPT, albo aplikacja w telefonie nie wystarczy: Mistrz Gry musi mieć dostęp do plików kampanii na Twoim komputerze. Każdy agent wymaga własnego planu i logowania: Claude Code płatnego planu Claude, Codex logowania do ChatGPT. Instalujesz go raz, ze strony agenta: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: w folderze kampanii wpisz `claude`. Gdy zapyta, czy ufasz folderowi, wybierz **Yes, I trust this folder**. Uwaga: domyślnie zaznaczona jest odpowiedź *No, exit*.
- **Codex**: w folderze kampanii wpisz `codex` i zgódź się, gdy zapyta, czy ufasz folderowi. W aplikacji na pulpit sprawdź w ustawieniach, czy pamięci są wyłączone dla czatów gry.
- **Inny agent**: uruchom go w folderze kampanii i podaj mu serwer MCP `rpg mcp`. RPG Engine to standardowy serwer MCP: Mistrzem Gry może być każdy agent obsługujący MCP, także lokalny.

Gramy i testujemy z **Claude Code**. **Codex** jest podłączony i sprawdzony, ale nie rozegrano z nim jeszcze całej kampanii. Polecenie `init` przygotowuje też **Gemini CLI**. Kampania wyłącza własną pamięć agenta: gra żyje w swoich plikach, dzięki czemu powrót do zapisu naprawdę cofa grę.

### 2.5 Pierwszy czat

Napisz cokolwiek, na przykład *Cześć! Zaczynajmy.* W pierwszej odpowiedzi w każdym czacie Mistrz Gry podaje **link do Twojego dashboardu**, coś w rodzaju `http://127.0.0.1:4750`. Otwórz go i trzymaj obok czatu.

Między wiadomościami Mistrza Gry agent pokazuje narzędzia, których używa. Nie otwieraj ich szczegółów (w Claude Code to ctrl+o), bo mogą ujawnić sekrety.

Nowa kampania przechodzi trzy etapy, widoczne u góry dashboardu: **1 Ustawienia** (jak chcesz grać), **2 Sesja zero** (tworzysz postać, w trakcie gry), **3 Gra**.

### 2.6 Ustawienia: wybierasz, jak grasz

Mistrz Gry pyta tylko o to, czego jeszcze brakuje, po kilka pytań naraz. Krok **Ustawienia** na dashboardzie pokazuje te same pytania jako karty. Napisz „zdecyduj Ty”, a Mistrz Gry wybierze. Wszystko można później zmienić, w czacie albo w **Ustawieniach**.

| Ustawienie | Co decyduje | Wartości |
|---|---|---|
| **Mentor** | Jak dużo Mistrz Gry uczy Cię zasad | wyłączony, podpowiedzi, samouczek |
| **Poziom trudności** | Jak trudny jest świat | fabularny, łatwy, normalny, trudny, brutalny |
| **Śmiertelność** | Co oznacza upadek w walce | narracyjna (nigdy nie giniesz), epicka (tylko gdy to ważne), na kościach |
| **Zapisy** | Kiedy możesz wrócić | permanentna śmierć, punkt kontrolny, dowolnie ([3.8](#38-saves-and-going-back)) |
| **Rygor** | Jak ściśle jedzenie, światło i podróż podlegają zasadom | płynnie, zasady, symulacja |
| **Kości** | Kto rzuca Twoimi kośćmi | cyfrowe, fizyczne |
| **Jednostki** | Odległości i wagi | metryczne, imperialne |
| **Głosy** | Kto mówi za spotykane postacie: w kluczowych momentach sama postać, znająca tylko to, co zna ona; albo zawsze Mistrz Gry; albo zawsze postać, dla głównych lub dla wszystkich, wolniej i drożej, o ile Twoja aplikacja AI to umożliwia | auto, Mistrz Gry, ważne, zawsze |
| **Towarzysze** | Kto podróżuje z Tobą | brak, stworzeni z Tobą, stworzeni przez Mistrza Gry, poznani w grze |
| **Obrazy** | Obrazy miejsc, zadań i spotkanych postaci | brak, na życzenie, nowe miejsca, zadania i spotkane postacie ([3.11](#311-pictures)) |
| **Linie** i **Zasłony** | Co nigdy się nie pojawia i co dzieje się tylko poza sceną | listy |
| **Język** | Język gry i dashboardu | dowolny |

Piąta edycja dodaje **rozwój postaci**: punkty doświadczenia lub kamienie milowe.

Gdy nie ma gotowego świata, Mistrz Gry pyta też o **założenie** (gatunek, ton, kilka elementów, Twoimi słowami) oraz o **przygotowanie**: tworzenie świata na bieżąco, w trakcie gry, albo w całości na początku.

O **Styl Mistrza Gry** nikt nie pyta, ale możesz go zmienić w czacie lub w **Ustawieniach**: **proza** (prosta, literacka, pulpowa, ironiczna), wymyślane **historie** (sytuacje, wątki, epizody, tajemnica), autor, **na którego wzór** pisze Mistrz Gry, albo cokolwiek innego **Twoimi słowami**.

### 2.7 Sesja zero: Twoja postać

Postać tworzysz razem z Mistrzem Gry, jak przy stole. Każdy wybór należy do Ciebie, chyba że poprosisz Mistrza Gry, by go dokonał: przyjdź z pełnym pomysłem, mglistym albo z niczym. Mistrz Gry mówi, jak powstają wartości cech, zanim padnie jakikolwiek rzut kością. Historia postaci nigdy nie jest wymagana. Jeśli ją podasz, Mistrz Gry zapisze ją Twoimi słowami. Potem Mistrz Gry prosi o obraz postaci ([3.7](#37-your-characters-story-and-picture)). RPG Engine liczy kartę postaci: nigdy nie robisz rachunków.

---

## 3. Granie <!-- icon: chat -->

### 3.1 Rozmowa z Mistrzem Gry

Pisz, co robi lub mówi Twoja postać, własnymi słowami:

> Pytam karczmarza, kto jeszcze tu dziś zaglądał.

Poza fabułą pisz w nawiasach kwadratowych: *[Jak działa chwytanie?]* Mistrz Gry też odpowiada w nawiasach.

Ty mówisz, co próbujesz zrobić. Mistrz Gry mówi, co się dzieje. Mistrz Gry nigdy nie decyduje za Twoją postać i nigdy nie mówi o silniku gry. Możesz zapytać go, jak korzystać z dashboardu.

### 3.2 Rzuty

Mistrz Gry prosi o rzut tylko wtedy, gdy wynik jest niepewny i ma znaczenie. Najpierw mówi, o co toczy się gra. Potem:

- **Na dashboardzie** baner pokazuje przycisk dla każdego testu, na przykład *Acrobatics +4 · with advantage*. Kliknij go: kości spadną na stronę, a Mistrz Gry usłyszy wynik. Możesz też kliknąć podświetlony wiersz karty postaci, rzucić kośćmi z tacki na kości albo napisać w banerze coś innego.
- **Ręcznie**, w rogu banera lub w **Ustawieniach**: baner podpowiada, czym rzucić, a Ty rzucasz z karty postaci lub z tacki na kości.
- **Fizyczne kości**, gdy w ustawieniach kości są ustawione jako fizyczne: wpisujesz wyniki, które wypadły, *[Wyrzucono 14.]*, a RPG Engine dodaje Twoje modyfikatory.

**Swobodne rzuty**: kliknij dowolną liczbę na karcie postaci albo otwórz tackę na kości, aby rzucić dla zabawy. Nigdy się nie liczą, a Mistrz Gry ich nie widzi.

**Rzuty Mistrza Gry** widać w kolumnie rzutów, oprócz tajnych. Zawsze możesz zapytać *[Czy ten rzut był prawdziwy?]*: przy tajnym rzucie Mistrz Gry podaje odcisk, który dowodzi, że rzut wykonano, zanim padło pytanie.

### 3.3 Sceny i walki

Historia toczy się w **scenach**: walka, rozmowa, zwiedzanie, podróż, odpoczynek. Na końcu każdej sceny gra zapisuje się sama, a scena trafia do dziennika.

W walce Mistrz Gry opowiada każdą turę, która nie jest Twoja, i zatrzymuje się tam, gdzie możesz zdecydować. **Scena** pokazuje na górze, czyja jest tura i kto jest następny, a obok mapy kartę Twojej postaci. Kolejność tur, punkty życia drużyny i to, jak ranni wyglądają przeciwnicy (opisane słowami), zostają z boku strony. Jeśli postać upadnie, rzuty obronne przeciw śmierci pojawiają się dużo większe na stronie.

### 3.4 Czas, podróże i świat, który się zmienia

RPG Engine pilnuje daty; między sesjami czas nie płynie. Powiedz, że odpoczywacie, *Robimy długi odpoczynek*, a odpoczynek przywróci to, co powinien. Powiedz, dokąd idziecie, *Ruszamy drogą na północ do Rocca*, a RPG Engine wyliczy trasę, odległość i liczbę dni, zatrzymując się, gdy coś wydarzy się po drodze. Pieniądze liczy się w monetach gry, łącznie z resztą.

Złoczyńcy mają plany z terminami. Każdego nowego dnia Mistrz Gry posuwa naprzód zagrożenia, którym czas dał przewagę. Widać ich znaki, ale nigdy sam zegar.

### 3.5 Mapy

**Świat** pokazuje miejsca, które zna Twoja postać, drogi między nimi i przebytą trasę, a resztę przykrywa mgła. **Scena** pokazuje mapę miejsca, w którym jesteś, jeśli je ma, wraz z tym, kto gdzie stoi. W walce, w Twojej turze, pola poza zasięgiem są zasłonięte. Gdy Mistrz Gry zapyta, dokąd się ruszasz, dotknij pola albo je wpisz, na przykład *E4*.

### 3.6 Zadania, dziennik i notatki

Zadanie, które podejmuje postać, trafia do **Dziennika** jako zadanie, razem z celami, terminem i tym, co mierzy. Oznacz je gwiazdką, aby zostało na widoku u góry Sceny. Dziennik opowiada też Twoją **historię**, scena po scenie, i przechowuje Twoje **notatki**: są prywatne, chyba że **Udostępnisz** którąś. Mistrz Gry odbierze ją jako to, co myślisz, nigdy jako fakt.

### 3.7 Historia i obraz postaci

Na karcie postaci karta **Opis** ma pole na historię postaci: Mistrz Gry wpisuje ją tam po Twojej zgodzie. Jeśli chcesz obraz, daj Mistrzowi Gry plik (PNG, JPEG, WebP lub SVG, do 5 MB) wraz z informacją, gdzie leży na komputerze, albo zamów portret ([3.11](#311-pictures)): *[Zrób mi portret: siwe włosy w warkoczu, blizna na brodzie.]*

### 3.8 Zapisy i powroty

RPG Engine zapisuje całą kampanię na końcu każdej sceny. Resztę określa ustawienie **zapisów**:

| Zapisy | Zapisz, kiedy chcesz | Powrót |
|---|---|---|
| **permadeath** | nie | nigdy |
| **checkpoint** | nie | do ostatniego zapisu, tylko gdy postać zginie |
| **free** | tak | do dowolnego zapisu |

W każdym trybie można **zacząć od nowa**: od początku gry albo od sesji zero. Zrób to na czacie lub w **Zapisach**.

Po powrocie **otwórz nowy czat**: stary pamięta to, co cofnięto. Napisz w nowym czacie *kontynuuj*, a potem naciśnij **Nowy czat otwarty** w Zapisach.

### 3.9 Sesje: przerwa i powrót

Przerwij, kiedy chcesz: *[Zatrzymajmy się na dziś.]* Wszystko jest już zapisane w plikach. Aby wrócić, uruchom agenta w folderze kampanii i napisz *kontynuuj*: Mistrz Gry krótko przypomni, co było, i ruszy dalej.

### 3.10 Nastrój Mistrza Gry

Robot na górze dashboardu to Mistrz Gry: jego twarz podąża za tonem historii i nigdy nie zdradza tego, czego jeszcze nie wiesz. Gdy czat jest zamknięty, robot śpi.

### 3.11 Obrazy

RPG Engine może tworzyć obrazy miejsc, do których docierasz, zadań, które podejmujesz, i osób, które spotykasz, zgodnie z ustawieniem **obrazów**, a także portret postaci na życzenie. Korzysta z tego, co jest na Twoim komputerze, z Twojego własnego logowania: **Codex** maluje je, a w przeciwnym razie rysuje je **Claude Code**. **Ustawienia** pokazują, czy ten komputer może je tworzyć, a jeśli nie, jak go skonfigurować. Zawsze możesz dać Mistrzowi Gry własny obraz.

### 3.12 Bezpieczeństwo: linie, zasłony i stop

**Linie** nigdy nie pojawiają się w grze; **zasłony** oznaczają, że coś dzieje się tylko poza ekranem. W każdej chwili napisz *[stop]*: Mistrz Gry natychmiast porzuci tę treść i doda ją do Twoich linii.

### 3.13 Zmiana zdania

Każde ustawienie można zmienić, na czacie lub w **Ustawieniach**. Rozstrzygnięcie, które Mistrz Gry podejmie bez podręcznika, staje się **precedensem**, więc na to samo pytanie następnym razem padnie ta sama odpowiedź.

---

## 4. Dashboard <!-- icon: party -->

Strona na Twoim komputerze, otwierana tylko w przeglądarce tego komputera, działa, dopóki czat jest otwarty. Gdy czat się zamyka, pokazuje *Not connected*; wraca sama przy następnym czacie.

- **Drużyna**: Twoja karta postaci i karty towarzyszy. Kliknij liczbę, aby nią rzucić; najedź na nią, aby zobaczyć, skąd się bierze. Obok są rzuty.
- **Scena**: gdzie jesteś, jej obraz i mapa, kto tam jest, co się dzieje. W walce: tury i karta Twojej postaci.
- **Dziennik**: zadania, historia, Twoje notatki.
- **Świat**: mapa świata taka, jaką zna Twoja postać.
- **Tacka na kości**: wybierz kości i modyfikator, a potem rzuć.
- **Zapisy**, **Pomoc**, **Ustawienia** i **Informacje**, jako ikony na końcu rzędu. W Ustawieniach są też preferencje samej strony: motyw, dźwięk kości, zestaw kości.

Gdy Mistrz Gry o coś zapyta, jego baner zostaje na górze, w której części strony byś nie był.

---

## 5. Systemy gry i zasady domowe <!-- icon: dice -->

### 5.1 Czym jest system gry

To dane jednej gry: jej karta postaci, liczby, stworzenia, przedmioty, czary i tekst zasad. Każda kampania korzysta z jednego systemu. RPG Engine liczy kartę postaci oraz to, co się zużywa i wraca. Jak działa dana zdolność, Mistrz Gry czyta w zasadach i rozstrzyga, tak jak przy stole.

### 5.2 Piąta edycja w zestawie

Rasy, klasy, podklasy, pochodzenie i atut z SRD 5.1; 319 czarów, broń, pancerze, przedmioty magiczne i potwory; rozdziały z zasadami, które Mistrz Gry czyta dokładnie w ich brzmieniu; pełna karta postaci, z wyliczonymi wartościami.

Można też grać treściami, których brakuje w SRD, z posiadanej książki: Mistrz Gry zapisuje je jako strony kampanii, a RPG Engine traktuje je jak własne. RPG Engine zawiera tylko otwarte treści, ale wiedza Mistrza Gry nie ma takiego ograniczenia.

Własne podręczniki mogą stać się biblioteką kampanii. Wystarczy powiedzieć Mistrzowi Gry, gdzie leżą: *[Moje podręczniki są w D:\Books\5e.]*, i zgodzić się w oknie, które pokaże komputer. RPG Engine czyta je jednorazowo, na tym komputerze. Później Mistrz Gry przeszukuje je przy rozstrzyganiu zasad, po SRD, i podaje książkę oraz stronę. Najlepiej czytają się jako tekst albo jako pliki PDF z tekstem, który można zaznaczyć. Zeskanowany PDF jest odczytywany z obrazów stron, tylko w Windows, w kilka minut i z kilkoma błędami. RPG Engine nigdy nie zmienia podręczników, nigdzie nie wysyła ich tekstu i nie kopiuje go do kampanii.

### 5.3 Zasady domowe i własne dodatki

Poproś Mistrza Gry: *[Zasada domowa: naturalna 1 w ataku oznacza upuszczenie broni.]* Mistrz Gry zapisuje ją jako umowę stołu albo tworzy stronę czy wartość na karcie postaci, jeśli jest potrzebna. Gotowe zasady domowe można umieścić jako pliki tekstowe w folderze `rules` kampanii.

### 5.4 Dodawanie lub importowanie własnego systemu gry

Jeszcze nie: dziś RPG Engine obsługuje tylko piątą edycję ([Wkrótce](#9-coming-later)).

---

## 6. Rozszerzenia <!-- icon: plus -->

Jeszcze nie. Rozszerzenie doda coś do kampanii na wierzchu jej systemu gry: świat, przygodę, funkcję taką jak pogoda, zasady domowe do udostępniania.

---

## 7. Skąd się bierze kampania i w jakim języku <!-- icon: world -->

### 7.1 Trzy sposoby na świat

- **Tworzony na bieżąco**: na podstawie Twojego pomysłu Mistrz Gry buduje każde miejsce, każdą osobę i każdy wątek tuż przed tym, jak będą potrzebne, i zapamiętuje je.
- **Przygotowany na początku**: tak samo, ale świat powstaje przed grą.
- **Z własnej przygody lub książki**: podaj Mistrzowi Gry plik: *[Zaimportuj tę przygodę jako naszą kampanię: D:\Books\adventure.pdf. Nie mów mi nic z tego, co w niej jest.]* Najlepiej czyta się tekst, EPUB, dokument Word lub PDF z tekstem, który można zaznaczyć. Zeskanowany PDF jest odczytywany z obrazów stron, tylko w Windows, powoli i z kilkoma błędami. Codex lub Claude Code na Twoim komputerze czyta plik poza czatem, a dashboard pokazuje postęp. Przy powieści Mistrz Gry proponuje, od którego miejsca zacząć. Zapisuje miejsca, postacie i sekrety.

Kampanię rozgrywa się raz: aby zagrać tę samą przygodę jeszcze raz, utwórz nową kampanię.

### 7.2 Języki

Jedna kampania ma jeden język: język Mistrza Gry, za którym podąża dashboard. Dashboard jest dostępny w 26 językach. Każdy inny tłumaczy na Twoim komputerze Codex lub Claude Code, a bez nich Mistrz Gry na czacie. Włoskie nazwy z piątej edycji pochodzą z oficjalnego włoskiego SRD. Tekst zasad zostaje po angielsku, a Mistrz Gry opowiada go w Twoim języku.

---

## 8. Dla ciekawskich: folder kampanii <!-- icon: list -->

Nigdy nie trzeba go otwierać, a zawiera sekrety kampanii. Znajdują się w nim: `campaign.yaml` (ustawienia), `state.yaml` (stan gry), `world/` (jedna strona markdown dla każdej postaci, miejsca, zadania i reszty), `rules/` (zasady domowe), `images/`, `log.jsonl` (każda zmiana), `.saves/`, `.player/` (notatki) oraz małe pliki, które mówią agentom AI, gdzie jest RPG Engine. Strony używają formatu Obsidiana. Jeśli zmienisz stronę ręcznie, Mistrz Gry dowie się o tym przy następnej odpowiedzi.

RPG Engine pozostaje w tym folderze: czyta i zapisuje grę tylko tutaj i nigdy nie dotyka innych plików. Foldery z podręcznikami tylko czyta. Poza kampanią trzyma wyłącznie własne foldery z danymi (tłumaczenia dashboardu, tekst odczytany z podręczników oraz Codex lub Claude Code, jeśli pozwolisz je zainstalować) i foldery tymczasowe na czas rysowania obrazu. O wszystko inne, co agent chce zrobić na komputerze, najpierw pyta.

Każde polecenie, którego używa Mistrz Gry, można też uruchomić w folderze kampanii: `rpg --help` wyświetla ich listę. Wiele z nich wypisuje sekrety kampanii.

---

## 9. Wkrótce <!-- icon: hourglass -->

- **Ty jako Mistrz Gry**, a AI gra drużyną.
- **Tryb autora**: napisz przygodę z AI, a potem wyeksportuj ją i udostępnij.
- **Kilku graczy na jednym komputerze**, każdy z własną postacią, na zmianę w tym samym czacie.
- **Rozszerzenia**: ustawienia, przygody, funkcje i zasady domowe.
- **Inne gry**: więcej systemów gry i własne.

---

## 10. Pytania i problemy <!-- icon: info -->

### Pytania

**Czy muszę znać zasady?** Nie. Wybierz mentora tutorial i pytaj w nawiasach, kiedy chcesz.

**Czy Mistrz Gry może oszukiwać?** Nie może zmienić rzutu wykonanego przez RPG Engine, chyba że na poziomie trudności story, ani faktów już ustalonych.

**Czy to coś kosztuje?** RPG Engine jest darmowy. Mistrz Gry działa w ramach planu Twojego agenta albo na Twoim komputerze z modelem lokalnym. Wieczór gry to długi czat: w najmniejszych planach możesz dojść do limitu planu przed końcem wieczoru. Obrazy i tłumaczenia korzystają z tego samego planu.

**Czy mogę grać na telefonie?** Nie: Mistrz Gry działa na Twoim komputerze, a dashboard otwiera się tylko tam.

**Czy mogę grać ze znajomymi?** Jeszcze nie: obecnie jeden gracz, jedna postać, plus towarzysze ([Wkrótce](#9-coming-later)).

**Czy następnym razem mogę użyć innej AI?** Tak: otwórz kampanię w innym agencie i napisz *kontynuuj*.

### Problemy

**Dashboard się nie otwiera.** Zapytaj Mistrza Gry: `[Jaki jest link do dashboardu?]`. Działa tylko wtedy, gdy w tej kampanii jest otwarty czat, po pierwszej odpowiedzi Mistrza Gry.

**Mistrz Gry chyba nie zna gry.** Agent nie załadował RPG Engine. Sprawdź, czy uruchomiono go w folderze kampanii i czy zaufano temu folderowi. W Claude Code napisz `/mcp` i połącz ponownie `rpg`. W Codex polecenie `codex mcp list` w folderze kampanii musi pokazać `rpg`. Jeśli `rpg --version` nie zostanie znalezione, zainstaluj RPG Engine ponownie ([2.2](#22-install)).

**Aktualizacja.** Uruchom ponownie `npm install -g rpg-engine`, a potem otwórz nowy czat: działający Mistrz Gry zachowuje wersję, z którą wystartował.

**Mistrz Gry pamięta coś, co cofnięto.** Otwórz nowy czat i naciśnij **Nowy czat otwarty** w Zapisach.

**Nie pojawiają się obrazy.** Ustawienia > Obrazy mówią, czy ten komputer potrafi je tworzyć, i jak.

**Instalacja się nie udaje albo `rpg` nie startuje.** Polecenie `node --version` musi pokazać 22 lub nowszą wersję. W Windows trzymaj RPG Engine i swoje kampanie z dala od ścieżek zawierających `&`.

**Link do dashboardu się zmienił.** Inny program zajął zwykły adres. Mistrz Gry poda Ci nowy link.
