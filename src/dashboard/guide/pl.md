<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: pełny przewodnik

**RPG Engine** pozwala grać w tabletopową grę fabularną z **AI w roli Mistrza Gry**.

Rozmawiasz z Mistrzem Gry na **czacie**: Mistrz Gry opowiada historię, odgrywa wszystkie pozostałe postaci i rozstrzyga, co się dzieje.

RPG Engine działa w tle: **pamięta świat**, **rzuca kośćmi** i **prowadzi rachunki**.

Obok czatu masz otwartą w przeglądarce stronę, czyli **dashboard**, z kartą postaci, kośćmi, mapami i dziennikiem.

Ten przewodnik jest dla graczy: nie musisz umieć programować.

## Szybki start <!-- icon: send -->

1. Zainstaluj **Node.js** ze strony [nodejs.org](https://nodejs.org) (wersja LTS).
2. Zainstaluj **Claude Code** lub **Codex**, czyli aplikację AI, w której działa Mistrz Gry, i zaloguj się ([2.4](#24-connect-your-ai)).
3. Otwórz terminal i zainstaluj RPG Engine: `npm install -g rpg-engine`.
4. W terminalu utwórz kampanię: `rpg init "The Salt Isles"`.
5. Otwórz Claude Code lub Codex w nowym folderze i napisz *Cześć! Zaczynajmy.* Mistrz Gry odpowie linkiem do twojego panelu: otwórz go obok czatu.

Dalej przewodnik wyjaśnia każdy krok, a potem to, jak grać.

## 1. Czym jest RPG Engine <!-- icon: about -->

### Kto co robi

| Kto | Co robi |
|---|---|
| **Ty** | Grasz swoją postacią. Mówisz, co robi, mówi i próbuje. |
| **Mistrz Gry** (AI) | Opowiada historię, gra wszystkie inne postacie, decyduje, co się dzieje, prosi o rzuty. |
| **RPG Engine** | Pamięta wszystko w plikach, rzuca kośćmi, liczy punkty życia, pieniądze, czas i odległości, strzeże sekretów, dopóki ich nie odkryjesz. |

AI świetnie opowiada historie, ale słabo pamięta. Zostawione samo sobie, zapomni, kto jest ci winien pieniądze, ile masz strzał albo że most spłonął dwie sesje temu. RPG Engine trzyma to wszystko, więc świat pozostaje taki sam z wieczoru na wieczór, nawet w nowym czacie, nawet z inną AI.

### Jak to wygląda w grze

Piszesz na czacie tak, jak mówiłbyś przy stole:

> Powoli pcham drzwi i zaglądam do środka.

Mistrz Gry odpowiada tym, co widzisz, i zatrzymuje się, gdy przychodzi pora na twój wybór. Gdy coś jest niepewne i ma znaczenie, Mistrz Gry mówi, o co toczy się gra, i prosi o rzut. Przyciski rzutu pojawiają się w panelu. Klikasz, kości spadają na stronę, a Mistrz Gry mówi, co się stało.

### Co go wyróżnia

- **Świat jest trwały.** To, co zostało powiedziane, pozostaje prawdą. Martwy łotr zostaje martwy.
- **Kości są prawdziwe.** Mistrz Gry nie może ich naginać (poza najłatwiejszym poziomem trudności, jeśli go wybierzesz).
- **Sekrety pozostają sekretami.** Mistrz Gry nigdy nie powie ci tego, czego twoja postać nie wie, nawet jeśli będziesz nalegać.
- **Świat toczy się bez ciebie.** Zagrożenia rosną, gdy odpoczywasz lub podróżujesz, a ty widzisz ich ślady.
- **Wiele wieczorów, jedna historia.** Kampania to folder na twoim komputerze. Możesz przerwać, kiedy chcesz, i wrócić później.

### Gra, w którą dziś można zagrać

RPG Engine jest stworzony z myślą o dowolnej tradycyjnej grze fabularnej. Dziś zawiera jeden system: **piątą edycję** (z darmowego System Reference Document 5.1). Kolejne gry dopiero się pojawią; zobacz [Systemy gry](#5-game-systems-and-house-rules) i [W planach](#9-coming-later).

---

## 2. Pierwsze kroki <!-- icon: path -->

### 2.1 Czego potrzebujesz

- Komputera z Windows, macOS lub Linuksem.
- **Node.js 22** lub nowszego. Pobierz go ze strony [nodejs.org](https://nodejs.org): wersja „LTS" wystarczy. Razem z nim dostajesz `npm`, które instaluje RPG Engine.
- **Terminala**, czyli okna, w którym wpisujesz polecenia: w Windows to aplikacja Terminal lub PowerShell, w macOS Terminal. Używasz go do instalacji RPG Engine, do tworzenia każdej kampanii i do uruchamiania Claude Code lub Codex.
- **Hosta AI**, czyli aplikacji, w której działa Mistrz Gry: **Claude Code** lub **Codex**, wraz z planem i kontem. Zobacz [2.4](#24-connect-your-ai).
- **Największego modelu**, jaki oferuje twój host. Mały model daje się oszukać: w naszych testach wyjawił sekrety graczowi, który twierdził, że jest prawdziwym Mistrzem Gry.
- Przeglądarki internetowej, do panelu.

Konto, którego używasz w hoście, służy do czegoś jeszcze: RPG Engine korzysta z niego na twoim komputerze, żeby rysować obrazy miejsc i tłumaczyć panel na języki, których nie ma w zestawie. Zobacz [Obrazy](#311-pictures) i [Języki](#72-languages).

**Jak otworzyć terminal w folderze.** Wiele kroków mówi „w folderze kampanii". W Windows kliknij folder prawym przyciskiem w Eksploratorze plików i wybierz **Otwórz w Terminalu**. W macOS kliknij folder prawym przyciskiem w Finderze i wybierz **Usługi > Nowy terminal w folderze**. Możesz też w otwartym już terminalu wpisać `cd` i ścieżkę folderu, na przykład `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Instalacja

Otwórz terminal i wpisz:

```text
npm install -g rpg-engine
```

Dzięki temu masz polecenie `rpg`. Żeby sprawdzić, czy się udało:

```text
rpg --version
```

Polecenia `rpg` użyjesz raz na kampanię, żeby ją utworzyć. Potem tylko rozmawiasz z Mistrzem Gry: twój host AI sam uruchamia RPG Engine, tym samym poleceniem `rpg`.

### 2.3 Tworzenie kampanii

Kampania to folder. Otwórz terminal w folderze, w którym trzymasz swoje gry, i wpisz:

```text
rpg init "The Salt Isles"
```

Powstaje folder `The Salt Isles` z nową kampanią w środku, a terminal mówi, co robić dalej:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Wiersze po *For the master* są dla Mistrza Gry, który przeczyta je na czacie: ty nie musisz nic z nimi robić. Zapamiętaj, gdzie jest folder: wracasz do niego za każdym razem, gdy grasz. Bez nazwy folderu `rpg init` zamienia w kampanię folder, w którym jesteś.

`init` tworzy wszystko, czego kampania potrzebuje: jej ustawienia, foldery świata i małe pliki, które każą twojemu hostowi AI używać RPG Engine i nie przechowywać własnej pamięci poza kampanią.

Nie musisz teraz niczego wybierać. Resztę Mistrz Gry zapyta na czacie albo wybierzesz w panelu. Jeśli znasz już część wyborów, możesz je podać tutaj:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Powstaje folder `salt-isles` z kampanią *The Salt Isles* w środku: nazwa folderu bez spacji, a nazwa kampanii taka, jaką chcesz.

| Opcja | Co ustawia | Wartości |
|---|---|---|
| `--name` | Nazwę kampanii | dowolna; jeśli ją pominiesz, nazwa folderu |
| `--language` | Język gry | kod, na przykład `en`, `it`, `fr` |
| `--system` | System gry | `5e`, dziś jedyny |
| `--difficulty` | Jak trudny jest świat | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Co oznacza upadek w walce | `narrative`, `epic`, `dice` |

`rpg init --help` też je wymienia. Kampania nie może leżeć w folderze innej kampanii.

Nie możesz poprosić Mistrza Gry o utworzenie kampanii: przed `init` w folderze nie ma niczego, co mówiłoby twojemu hostowi AI, gdzie jest RPG Engine.

### 2.4 Połączenie z AI

RPG Engine działa z **Claude Code** i **Codex**. Inne aplikacje AI korzystające z narzędzi MCP mogą też działać, ale tego nie gwarantujemy.

**Instalacja hosta.** Claude Code i Codex działają w terminalu: to nie jest aplikacja Claude ani ChatGPT na telefonie. Każdy wymaga własnego planu i konta: Claude Code płatnego planu Claude, Codex konta ChatGPT. Zainstaluj je i zaloguj się według ich własnych stron: [Claude Code](https://code.claude.com/docs/en/setup) i [Codex](https://learn.chatgpt.com/docs/codex/cli). Robisz to raz, dla wszystkich swoich kampanii.

**Claude Code.** Otwórz terminal w folderze kampanii i wpisz `claude`. Za pierwszym razem zapyta, czy ufasz folderowi, i powie, że folder zezwala na narzędzia gry (`mcp__rpg`): wybierz **Yes, I trust this folder**. Uwaga: domyślnie zaznaczona odpowiedź to *No, exit*, więc naciśnięcie Enter od razu zamknie Claude Code. To wszystko: kampania już powiedziała Claude Code, żeby używał RPG Engine i jego narzędzi oraz żeby wyłączył swoją pamięć.

**Codex.** Otwórz terminal w folderze kampanii i wpisz `codex`. Gdy zapyta, czy ufasz folderowi, odpowiedz twierdząco: własne ustawienia kampanii mówią Codexowi, gdzie jest RPG Engine, zezwalają na jego narzędzia i wyłączają jego pamięć, a Codex czyta je tylko w folderze, któremu ufasz. W aplikacji desktopowej sprawdź, czy pamięć jest wyłączona dla czatów gry.

**Dlaczego pamięć ma znaczenie.** Kampania żyje w swoich plikach. Gdyby host pamiętał też coś sam z siebie, powrót do zapisu nie byłby prawdziwym powrotem: Mistrz Gry nadal pamiętałby to, co cofnięto.

### 2.5 Pierwszy czat

Napisz cokolwiek, na przykład:

> Cześć! Zaczynajmy.

Mistrz Gry sprawdza, na czym stoi gra, i odpowiada. W pierwszej odpowiedzi każdego czatu podaje **link do twojego panelu** (coś w rodzaju `http://127.0.0.1:4750`). Otwórz go w przeglądarce i trzymaj obok czatu przez całą grę. Każda kampania zachowuje ten sam link z czatu na czat, chyba że zajął go inny program: wtedy Mistrz Gry poda nowy.

Między wiadomościami Mistrza Gry twój host pokazuje narzędzia, których Mistrz Gry używa, w krótkich wierszach. Nie otwieraj ich szczegółów (w Claude Code ctrl+o): mogą pokazywać to, co pisze Mistrz Gry, razem z sekretami.

Nowa kampania przechodzi trzy etapy, jak gra z prawdziwym Mistrzem Gry. Panel pokazuje je u góry jako *1 Ustawienia · 2 Sesja zero · 3 Gra*:

1. **Ustawienia**: wybierasz, jak chcesz grać. Poza fabułą.
2. **Sesja zero**: tworzysz swoją postać, w trakcie gry.
3. **Gra**: historia.

### 2.6 Ustawienia: wybór sposobu gry

Mistrz Gry pyta tylko o to, czego jeszcze brakuje, po kilka pytań naraz. Jeśli napiszesz „ty decydujesz", Mistrz Gry wybiera i mówi ci, co wybrał. Gdy panel jest otwarty, jego pierwszy krok, **Ustawienia**, pokazuje te same pytania jako karty: jedno pytanie naraz, każda wartość z objaśnieniem, a zwykle wybierana oznaczona jako **Polecane**. Wybierz tam, a Mistrz Gry nie zapyta ponownie na czacie; **Pomiń** zostawia pytanie na później. Czat rozstrzyga to, co da się załatwić tylko słowami: założenie nowego świata, język i obrazy, o które Mistrz Gry pyta tylko wtedy, gdy twój komputer potrafi je tworzyć. Dlatego strona zadaje mniej pytań, niż wymienia tabela poniżej.

Nie musisz uczyć się tabeli: jest do zaglądania. Każde z tych ustawień możesz zmienić później, na czacie lub w **Ustawieniach** panelu. Zmiana obowiązuje od następnej odpowiedzi Mistrza Gry.

| Ustawienie | O czym decyduje | Wartości | Polecane |
|---|---|---|---|
| **Mentor** (pytanie brzmi: „Jak dobrze znasz tę grę?") | Ile Mistrz Gry uczy cię zasad, poza fabułą | **wyłączony** (sama historia; pytaj w nawiasach kwadratowych, kiedy chcesz), **wskazówki** (krótka rada przed ważnymi wyborami i gdy umknie jakaś zasada), **samouczek** (każda zasada objaśniona przy pierwszym użyciu, pełne rachunki każdego rzutu, krótkie podsumowanie po walkach) | zależnie od twojej odpowiedzi: nigdy nie grałem → samouczek, trochę → wskazówki, znam grę → wyłączony |
| **Poziom trudności** | Jak trudny jest świat: walki, taktyka wrogów, wskazówki, skarby, tempo zagrożeń | story, easy, normal, hard, brutal | |
| **Śmiertelność** | Co oznacza upadek w walce | **narracyjna** (twoja postać nigdy nie ginie), **epicka** (ginie tylko wtedy, gdy ma to znaczenie dla historii), **na kościach** (decydują kości) | zależy od poziomu trudności: story → narracyjna, easy → epicka, normal i wyżej → na kościach |
| **Zapisy** | Kiedy możesz wrócić | **permadeath** (nigdy; można tylko zacząć kampanię od nowa), **punkt kontrolny** (do ostatniego końca sceny, tylko jeśli twoja postać zginie), **swobodne** (do dowolnego zapisu, a zapisać możesz, kiedy poprosisz) | punkt kontrolny |
| **Rygor** | Jak ściśle obowiązują zasady dotyczące jedzenia, światła, zmęczenia, udźwigu, składników czarów i podróży | **płynny** (Mistrz Gry pomija je), **zasady** (jak w podręczniku: pochodnie się wypalają, racje się kończą), **symulacja** (ponad zasady: zużycie, psucie się, pogoda) | płynny |
| **Kości** | Kto rzuca kośćmi twojej postaci | **cyfrowe** (RPG Engine rzuca na stronie), **fizyczne** (rzucasz własnymi i podajesz wyniki) | |
| **Jednostki** | Odległości i ciężary w historii | metryczne, imperialne | |
| **Towarzysze** | Kto z tobą podróżuje | brak, stworzeni z tobą na sesji zero, stworzeni przez Mistrza Gry, spotkani w grze | |
| **Obrazy** | Obrazy miejsc i zadań | brak, na prośbę, nowe miejsca i zadania | pytanie pada raz, tylko jeśli twój komputer potrafi je tworzyć |
| **Linie** | Co nigdy nie pojawia się w grze | lista lub brak | |
| **Zasłony** | Co może się zdarzyć, ale tylko poza sceną | lista lub brak | |
| **Język** | Język gry i panelu | dowolny | wybrany po tym, jak piszesz, i potwierdzony |

System gry może dodać własne ustawienia. Piąta edycja dodaje **awans**: jak twoja postać zdobywa poziomy, za pomocą **punktów doświadczenia** albo **kamieni milowych** fabuły.

**Co poziom trudności oznacza w grze.** Story: słabi, naiwni wrogowie, oczywiste wskazówki, wszystkiego pod dostatkiem; Mistrz Gry może łagodzić własne rzuty. Easy: prości wrogowie, hojne zasoby. Normal: rozsądni wrogowie, trzy wskazówki do każdego wniosku, standardowe ceny i skarby. Hard: sprytni wrogowie, subtelne wskazówki, skąpe zasoby, szybko postępujące zagrożenia. Brutal: wrogowie, którzy napadają z zasadzki, wycofują się i dobijają poległych, bardzo skąpe zasoby, najsurowszy odpoczynek. Walki są zawsze dobrane do twojej drużyny w jej obecnym stanie.

**Gdy nie ma gotowego świata**, ustawienia pytają jeszcze o dwie rzeczy:

- **Założenie**: gatunek, ton i kilka elementów świata, twoimi słowami. Na przykład: *„Low fantasy, ponure, ale z nadzieją. Miasteczko nad rzeką, nawiedzony bród, kult na wzgórzach."*
- **Przygotowanie**: **w locie** (Mistrz Gry tworzy każdą część świata tuż przed tym, jak jej potrzebujesz; polecane) albo **wszystko na początku**.

Następnie Mistrz Gry proponuje nazwę kampanii. Gdy niczego nie brakuje i powiesz, że jesteś gotów, gra przechodzi do sesji zero.

### 2.7 Sesja zero: twoja postać

Sesja zero to już gra: tworzysz swoją postać razem z Mistrzem Gry, jak przy stole.

- **Każdy wybór należy do ciebie**, chyba że poprosisz Mistrza Gry, żeby go dokonał. Możesz przyjść z pełnym pomysłem („półelfka kapłanka, która opuściła świątynię"), mglistym („ktoś, kto leczy, ale nie jest miły") albo z niczym („zaskocz mnie, potem pozwól mi coś zmienić").
- **Cechy.** Mistrz Gry mówi ci, jaka jest metoda i siatka bezpieczeństwa, zanim padnie jakikolwiek rzut. W piątej edycji: standardowy zestaw, zakup punktów albo 4k6 z odrzuceniem najniższej. Ustalona metoda zostaje w ustaleniach stołu.
- **Twoja historia** nigdy nie jest obowiązkowa. Jeśli ją podasz, Mistrz Gry zapisuje ją twoimi słowami, raz ci ją odczytuje i wplata jej osoby i miejsca w świat. Możesz też napisać ją w panelu (zobacz [Drużyna](#party)).
- **Osobowość** (piąta edycja): cecha, ideał, więź i wada, z tabel twojego pochodzenia albo własne.
- **Obraz.** Gdy postać jest gotowa, Mistrz Gry prosi cię o jej obraz: plik na twoim komputerze. Jeśli twój host AI potrafi sam rysować obrazy, Mistrz Gry może zaproponować, że jeden stworzy.

Liczby na karcie postaci oblicza RPG Engine na podstawie twoich wyborów: nigdy nie musisz nic liczyć. Gdy postacie są gotowe i potwierdzisz, historia się zaczyna.

---

## 3. Gra <!-- icon: chat -->

### 3.1 Rozmowa z Mistrzem Gry

Pisz, co twoja postać robi lub mówi, własnymi słowami. Krótko też jest dobrze.

> Pytam karczmarza, kto jeszcze tu dziś przechodził.
>
> – Nie szukamy kłopotów – mówię, trzymając rękę z dala od miecza.
>
> Wspinam się na dach i czekam.

**Poza fabułą** pisz w nawiasach kwadratowych:

> [Jak działa chwyt?]
>
> [Czy mogę jeszcze użyć reakcji w tej rundzie?]
>
> [Zatrzymajmy się na dziś.]

Mistrz Gry też odpowiada w nawiasach, a potem wraca do historii.

**Ty mówisz, co próbujesz; Mistrz Gry mówi, co się dzieje.** To, co łamie logikę świata albo ustalone już fakty, nie dzieje się: Mistrz Gry powie ci o tym w ramach fabuły i zaproponuje, co jest możliwe.

**Mistrz Gry nigdy nie decyduje za twoją postać.** Nie każe ci mówić, czuć ani wybierać. W razie wątpliwości pyta.

**Mistrz Gry nigdy nie mówi o silniku.** Zapytaj, czy śledzi różne rzeczy, a odpowie jak Mistrz Gry: „Trzymam to wszystko: następnym razem zaczniemy stąd."

**Możesz zapytać Mistrza Gry, jak korzystać z panelu.** Zna stronę: „Gdzie zobaczę swoje czary?", „Jak rzucić ręcznie?"

### 3.2 Rzuty

**Kiedy pada rzut.** Mistrz Gry prosi o rzut tylko wtedy, gdy wynik jest niepewny i ma znaczenie. W przeciwnym razie mówi „tak" albo „tak, ale". Przed twoim rzutem Mistrz Gry mówi, o co toczy się gra i jakie testy pasują, po czym się zatrzymuje. Rzucasz albo zmieniasz zdanie:

> **Mistrz Gry:** Półka jest wąska i mokra. Jeśli się poślizgniesz, czeka cię długi upadek do rzeki. Test Zręczności (Akrobatyka) albo możesz wrócić i poszukać schodów.
>
> **Ty:** Spróbuję.

**Rzut w panelu.** Gdy Mistrz Gry o to prosi, u góry strony pojawia się baner z przyciskiem dla każdego testu, na przykład *Akrobatyka +4 · z przewagą*. Kliknij go: kości spadają na stronę, a Mistrz Gry słyszy wynik. Możesz też:

- kliknąć odpowiedni wiersz swojej karty postaci, który zaświeci się na złoto;
- rzucić odpowiednimi kośćmi z tacki na kości;
- napisać w banerze własne słowa, jeśli chcesz zrobić coś innego.

**Rzut ręczny.** Jeśli wolisz sam wybierać kości, włącz **Ręcznie** w rogu banera (albo w **Ustawieniach**). Przycisk testu znika, a baner mówi, co rzucić, jak zrobiłby to Mistrz Gry: *Rzuć samodzielnie Akrobatykę, na karcie postaci albo kośćmi.* Kliknij wiersz karty, który się zaświeci, albo rzuć odpowiednimi kośćmi z tacki: RPG Engine rzuca nimi, dodaje twój bonus, a Mistrz Gry słyszy wynik. Test, którego nie da się wykonać ani z karty, ani z tacki, na przykład obrażenia z przerzucaniem jedynek, zachowuje swój przycisk. Tryb Ręcznie pozostaje włączony w tej przeglądarce, dopóki go nie wyłączysz.

**Fizyczne kości przez całą grę.** Gdy ustawienie **Kości** jest na fizyczne, Mistrz Gry prosi o rzuty słowami, a ty wpisujesz wyniki, które wyrzuciłeś na kościach:

> [Wyrzucone: 14.]

RPG Engine dodaje twoje modyfikatory i odrzuca wynik, którego twoje kości nie mogą pokazać.

**Swobodne rzuty.** Kliknij dowolną liczbę na karcie postaci albo otwórz tackę na kości, żeby rzucić dla zabawy. Swobodne rzuty nigdy się nie liczą, nigdy nie są zapisywane, a Mistrz Gry ich nie widzi. Swobodna dwudziestka nigdy nie zamieni się później w prawdziwą.

**Rzuty Mistrza Gry.** Mistrz Gry rzuca za wrogów i inne postacie również przez RPG Engine. Większość rzutów widzisz w swojej kolumnie rzutów. Gdy nie wolno ci zobaczyć wyniku, Mistrz Gry rzuca w sekrecie. Zawsze możesz zapytać:

> [Czy ten rzut był prawdziwy?]

Przy rzucie pokazanym Mistrz Gry podaje liczby i uzasadnienie. Przy sekretnym podaje odcisk, który dowodzi, że rzut wykonano, zanim zapytałeś.

**Rzuty na czacie** pojawiają się w nawiasach, zaraz po chwili, którą rozstrzygają: *[Perswazja 14 + 3 = 17]*. Potem historia opowiada wynik.

### 3.3 Sceny i walki

Mistrz Gry prowadzi historię w **scenach**: walka, rozmowa, eksploracja, podróż, odpoczynek, wyzwanie (pościg, wyścig, zagadka). Nie musisz nimi zarządzać: dzięki nim RPG Engine dzieli historię na rozdziały. Na końcu każdej sceny gra sama się zapisuje, a scena trafia do historii w dzienniku.

**W walce** Mistrz Gry opowiada wszystkie tury, które nie są twoje, jedna po drugiej, z każdym rzutem, i **zatrzymuje się tam, gdzie możesz zdecydować**: twoja tura, reakcja, wybór. W swojej turze powiedz, co robisz:

> Rzucam Sacred Flame w tego przy drzwiach.

Sekcja **Walka** w panelu pokazuje kolejność tur, czyja jest tura, punkty życia twojej drużyny i to, jak ranni wyglądają wrogowie (cali, ranni, broczący krwią, powaleni: słowami, nigdy liczbami). Jeśli twoja postać upadnie, na stronie pojawiają się duże rzuty obronne przeciw śmierci.

**Gdy walka jest już rozstrzygnięta**, Mistrz Gry może zaproponować, że opowie resztę jedną wiadomością.

### 3.4 Czas, podróż i świat, który się porusza

**Czas.** Każde działanie zajmuje w historii czas, a RPG Engine prowadzi datę: dzień 3, wczesny ranek. Mistrz Gry podaje czas tak, jak mierzy go świat: świt, trzeci dzwon, zmierzch. Między sesjami czas nie płynie: wracasz tam, gdzie skończyłeś.

**Odpoczynek.** Powiedz, że odpoczywasz, a Mistrz Gry zastosuje to, co odpoczynek przywraca, na przykład punkty życia i miejsca czarów:

> Rozbijamy obóz i robimy długi odpoczynek.

**Podróż.** Powiedz, dokąd chcesz iść:

> Idziemy drogą na północ, do Rocca.

RPG Engine wylicza drogę, dystans i liczbę dni w twoim tempie, i przenosi cię na miejsce. Podróż zatrzymuje się, gdy po drodze zdarza się coś zaplanowanego, na koniec każdego dnia marszu i po dotarciu na miejsce. Przed wyruszeniem możesz zapytać, jak daleko jest dane miejsce:

> [Jak daleko jest Rocca i ile to zajmie pieszo?]

**Świat porusza się bez ciebie.** Łotrzy mają plany z terminami i zegarami. Każdego nowego dnia Mistrz Gry przesuwa zagrożenia, które czas posunął naprzód, a ty widzisz ich ślady: plotkę, trop, zmianę w mieście. Nigdy nie widzisz samego zegara, tylko to, co po sobie zostawia.

**Pieniądze** liczy się w monetach gry. Płać, sprzedawaj, dostawaj zapłatę: resztę wydaje RPG Engine.

### 3.5 Mapy

**Mapa świata** (panel: **Świat**) pokazuje tylko miejsca, które twoja postać zna, z drogami między nimi, szlakiem, który przeszła, i mgłą nad całą resztą. Kliknij miejsce, żeby zobaczyć, co o nim wiesz i jak daleko jest.

**Mapa miejsca** (panel: **Scena**, a w walce **Walka**) pojawia się, gdy Mistrz Gry narysuje ją dla miejsca, w którym jesteś: ściany, drzwi, teren i to, kto gdzie stoi, jako żetony. W walce, w twojej turze, pola, do których nie możesz dotrzeć, są zasłonięte, więc od razu widzisz, dokąd możesz iść. Gdy Mistrz Gry pyta, dokąd idzie twoja postać, strona otwiera mapę, a ty dotykasz pola albo je wpisujesz, na przykład *E4*.

### 3.6 Zadania, dziennik i notatki

**Zadania.** Gdy twoja postać podejmuje się zadania, trafia ono do twojego **Dziennika**: kto je zlecił, gdzie, do kiedy, jego cele w postaci listy i to, co je mierzy (termin z pozostałym czasem, zegar, licznik). Oznacz zadanie gwiazdką, żeby je śledzić: zostaje małe u góry sekcji Scena, razem z następnym celem. Zadanie kończy się wtedy, gdy zakończy je historia, nigdy samo z siebie.

**Historia.** Karta Historia w Dzienniku to twoja kampania jako oś czasu: każda scena to rozdział z miejscem, datą i krótkim streszczeniem, ostatnia na początku.

**Twoje notatki.** Na karcie Notatki w Dzienniku piszesz własne notatki: teorie, imiona, plany. Zostają na twoim komputerze, a Mistrz Gry ich nie czyta, chyba że **Udostępnij** którąś. Udostępniona notatka dociera do Mistrza Gry przy jego następnej odpowiedzi jako to, co myślisz, nigdy jako fakt. Twoja teoria nie staje się prawdą dlatego, że ją zapisano. Notatka, która prosi o zaprzestanie lub unikanie jakiejś treści, liczy się tak, jakbyś powiedział to przy stole.

### 3.7 Historia i obraz twojej postaci

Na karcie postaci karta **Opis** ma pole, w którym możesz napisać historię swojej postaci. Wyślij ją, a Mistrz Gry zapisze ją w postaci własnymi słowami, po tym jak się zgodzisz.

Żeby dodać obraz postaci, podaj Mistrzowi Gry na czacie plik z obrazem wraz z jego położeniem na twoim komputerze (PNG, JPEG, WebP lub SVG, do 5 MB):

> [Oto portret mojej postaci: C:\Users\me\Pictures\mira.png]

Mistrz Gry kopiuje go do kampanii, a on pojawia się na żetonie twojej postaci w panelu. Możesz go zmienić w ten sam sposób, kiedy chcesz. Sam RPG Engine rysuje tylko miejsca i zadania (zobacz [Obrazy](#311-pictures)).

### 3.8 Zapisy i powrót

RPG Engine zapisuje całą kampanię **na końcu każdej sceny**, samodzielnie. To, co możesz zrobić z tymi zapisami, zależy od ustawienia **Zapisy**:

| Zapisy | Zapis na żądanie | Powrót |
|---|---|---|
| **permadeath** | nie | nigdy; można tylko zacząć kampanię od nowa |
| **punkt kontrolny** | nie | do ostatniego zapisu, tylko gdy twoja postać zginie |
| **swobodne** | tak | do dowolnego zapisu, kiedy chcesz |

W każdym trybie możesz **zacząć od nowa**: od początku gry z tą samą postacią albo od sesji zero z nową.

Wszystko to zrobisz na czacie („[Wróćmy do chwili przed pojedynkiem.]") albo w sekcji **Zapisy** panelu.

**Po powrocie otwórz nowy czat.** Czat, w którym grałeś, pamięta to, co zostało cofnięte. Otwórz nowy czat z Mistrzem Gry (`/clear` w Claude Code, `/new` w Codex), napisz *kontynuuj*, a potem naciśnij **Nowy czat otwarty** w sekcji Zapisy albo powiedz o tym Mistrzowi Gry w nowym czacie. Nigdy nie wznawiaj starego czatu. Dopóki nie potwierdzisz, Mistrz Gry nie będzie kontynuować.

### 3.9 Sesje: przerwa i powrót

**Sesję kończysz**, kiedy chcesz:

> [Zatrzymajmy się na dziś.]

Nie ma „zapisz i wyjdź": wszystko jest już w plikach.

**Żeby zamknąć** czat, wpisz `/exit` w Claude Code albo `/quit` w Codex. Panel cichnie do następnego czatu.

**Żeby wrócić**, otwórz terminal w folderze kampanii (tym, który wypisał `init`), uruchom tam swój host i napisz *kontynuuj*. Mistrz Gry sprawdza, na czym stoi gra, daje ci krótkie podsumowanie i zaczyna od czegoś, co się dzieje. Nowy czat niczego nie traci: kampania żyje w swoich plikach, nie w czacie.

Mistrz Gry nie zadaje rutynowych pytań na koniec. Tylko jeśli zauważył, że coś nie zadziałało, pyta krótko.

### 3.10 Nastrój Mistrza Gry

U góry panelu jest awatar Mistrza Gry, mały robot. Jego mina podąża za tonem historii: niepokój, gdy rośnie niebezpieczeństwo, zachwyt przy śmiałym pomyśle, zaskoczenie przy zwrocie akcji. Na chwilę reaguje na naturalną 20 lub naturalną 1. Nigdy nie pokazuje tego, czego jeszcze nie wiesz: żadnego uśmieszku, zanim pułapka się zatrzaśnie. Żetony twojej drużyny też pokazują nastroje. Gdy czat jest zamknięty, robot śpi.

### 3.11 Obrazy

RPG Engine może zlecić stworzenie obrazu dla każdego miejsca, do którego docierasz, i każdego zadania, które podejmujesz, zgodnie z ustawieniem **Obrazy**. Korzysta z tego, co już jest na twoim komputerze:

- **Codex**, z twoim kontem ChatGPT: malowany obraz.
- W przeciwnym razie **Claude Code**, z twoim kontem Claude: rysunek.

Obraz powstaje w ramach twojego planu, nie naszego. Sekcja **Ustawienia** mówi, czy obrazy można tworzyć na twoim komputerze, a jeśli nie, podaje kroki konfiguracji. Bez obrazów strona pokazuje zamiast nich znak każdego rodzaju miejsca. Możesz też dać Mistrzowi Gry własny obraz dowolnego miejsca lub postaci.

### 3.12 Bezpieczeństwo: linie, zasłony i stop

- **Linie**: to, co nigdy nie pojawia się w grze.
- **Zasłony**: to, co może się zdarzyć, ale tylko poza sceną.
- **Stop**: w każdej chwili możesz zatrzymać jakąś treść, bez tłumaczenia. Napisz to poza fabułą:

> [stop]

Mistrz Gry natychmiast z niej rezygnuje i dodaje ją do twoich linii, na wszystkie kolejne sesje. Swoje linie i zasłony możesz zobaczyć i zmienić w **Ustawieniach**.

### 3.13 Zmiana zdania

Każde ustawienie można zmienić w trakcie kampanii: na czacie („[Zróbmy trudniej.]") albo w **Ustawieniach**. Mistrz Gry dowiaduje się o zmianie przy następnej odpowiedzi. Rozstrzygnięcie, które Mistrz Gry podjął bez podręcznika, staje się **precedensem** i zostaje zapamiętane, więc to samo pytanie dostanie następnym razem tę samą odpowiedź.

---

## 4. Panel, sekcja po sekcji <!-- icon: party -->

Panel to strona na twoim własnym komputerze. Mistrz Gry podaje jej link na początku każdego czatu. Podąża za grą na żywo: gdy Mistrz Gry coś zmienia, strona też się zmienia.

Otworzyć ją może tylko przeglądarka na komputerze, na którym grasz: nie telefon ani tablet, nawet w tej samej sieci Wi-Fi. Strona dopasowuje się też do wąskiego okna: wtedy sekcje przenoszą się na pasek u dołu, a ikony do menu.

Strona żyje tyle, co czat. Gdy zamkniesz czat, otwarta strona pokazuje *Brak połączenia* z kartą postaci w takim stanie, w jakim była, a robot Mistrza Gry zasypia; gdy otworzysz czat w kampanii ponownie i Mistrz Gry odpowie, strona sama wraca do życia.

### U góry

- **Awatar Mistrza Gry** z jego nastrojem.
- Nazwa kampanii, system gry, **czas gry** i informacja, czy gra jest **połączono** (czat połączony).
- Sekcje: **Drużyna**, **Scena**, **Walka** (tylko w czasie walki), **Dziennik**, **Świat**; na końcu rzędu, jako ikony: **Zapisy**, **Pomoc**, **Ustawienia**, **Informacje**.
- Jasny i ciemny motyw, w prawym górnym rogu.

Gdy Mistrz Gry cię o coś pyta, jego baner zostaje u góry strony, niezależnie od tego, w której sekcji jesteś.

### Drużyna

Karta twojej postaci i kart twoich towarzyszy. Każda część karty to kafelek, który możesz otwierać i zamykać.

- **Kliknij liczbę**, żeby rzucić nią dla zabawy. Najedź na liczbę, żeby zobaczyć, z czego się składa („+5: Mądrość +3, biegłość +2").
- **Punkty życia, miejsca czarów i użycia** pokazują się jako paski i kropki.
- **Stany i efekty** pokazują się wraz z czasem trwania.
- **Opis** zawiera tekst o twojej postaci oraz pole do wysłania Mistrzowi Gry historii postaci.
- Przy 0 punktów życia pod imieniem pojawiają się duże **rzuty obronne przeciw śmierci**.
- Obok karty (pod nią na wąskim ekranie): **rzuty**, od najnowszego, twoje i Mistrza Gry, które możesz zobaczyć. **Usuń** opróżnia listę; **Przywróć** ją cofa. Swobodne rzuty pokazują się przerywaną linią i przyciemnione.

Towarzysz z opisem stworzenia, na przykład wilk, pokazuje swój opis zamiast pełnej karty postaci.

### Scena

Miejsce, w którym jest twoja drużyna: obraz i nazwa miejsca, miejsca wokół, mapa miejsca, jeśli jest, kto tam jest, oraz otwarta scena z tym, co dzieje się teraz. Zadanie, które śledzisz, jest u góry.

### Walka

Tylko w czasie walki. U góry: runda, kto działa, kto jest następny. Niżej: kolejność tur, każdy walczący ze swoim stanem, twoja drużyna w liczbach, a wrogowie słowami; to, co twoja postać ma pod ręką (klasa pancerza, punkty życia, ataki); mapa miejsca, z obwiedzioną postacią, która działa. W twojej turze odnośnik do Walki pulsuje na złoto, gdziekolwiek jesteś.

### Dziennik

Trzy karty:

- **Zadania**: aktywne, ukończone i nieudane, każde jako kafelek z celami, terminem w postaci odliczania i zegarami. Gwiazdka włącza śledzenie zadania.
- **Historia**: rozdziały kampanii, scena po scenie, ostatnia na początku.
- **Notatki**: twoje własne notatki, prywatne, dopóki żadnej nie udostępnisz.

### Świat

Mapa świata taka, jaką zna twoja postać, z mgłą nad resztą. Przeciągnij, żeby przesunąć, użyj kółka lub gestu szczypania, żeby powiększyć. Kliknij miejsce, żeby zobaczyć jego kartę. Obok jest lista miejsc, od najbliższego. Gdy map jest więcej (miasto, kontynent, inny plan), karty przełączają między nimi.

### Tacka na kości

Przycisk kości otwiera tackę: wybierz kości i modyfikator, i rzuć. Gdy masz dwie lub więcej kości tego samego rodzaju, wybierz, które się liczą: **Wszystkie**, **Najwyższe** (tylko najwyższa) albo **Najniższe** (tylko najniższa). Wybrane kości zostają, dopóki nie naciśniesz **Usuń**, więc ten sam rzut na obrażenia to jedno kliknięcie w każdej rundzie. Gdy Mistrz Gry prosi o rzut, tacka mówi, które kości na niego odpowiadają.

### Zapisy

Twoje zapisy, od najnowszego, każdy z miejscem, datą w grze i czasem utworzenia. **Zapisz teraz** (przy swobodnych zapisach), **Wróć tutaj** i **Zacznij od nowa**, na czerwono, w dwóch krokach. Zobacz [Zapisy i powrót](#38-saves-and-going-back).

### Ustawienia

Twoje ustawienia, w grupach: gra, nauka gry (mentor i zasady, które już ci wyjaśniono), kości i miary, granice (linie i zasłony), obrazy, język. Kliknij wartość, żeby ją wybrać; pod nią jest objaśnienie. Dalej preferencje samej strony, zapamiętane tylko w tej przeglądarce: motyw, dźwięk kości, **zestaw kości** (żywica, metal, drewno, kamień), zaokrąglone lub ostre krawędzie, rzut ręczny.

Własnych ustawień Mistrza Gry, takich jak zasady domowe i precedensy, tu nie ma: zostają na czacie.

### Pomoc i Informacje

**Pomoc**: ten przewodnik. **Informacje**: czym jest RPG Engine, jego linki, licencje i podziękowania dla systemu gry.

### Przed grą: Ustawienia i sesja zero

Gdy nowa kampania jest w pierwszym kroku, **Ustawieniach**, cała strona zadaje swoje pytania: po jednym, każde z objaśnieniem wartości i polecaną odpowiedzią. **Ty decydujesz** zostawia pytanie Mistrzowi Gry, z wyjątkiem linii i zasłon, które zawsze należą do ciebie; **Pomiń** zostawia je na później. Na końcu **Zaczynajmy**.

### Komunikaty strony

Czasem strona pokazuje nad sobą komunikat: problem w plikach kampanii (Mistrz Gry go naprawia), gra niedostępna (czat jest zamknięty), tłumaczenie strony w toku.

---

## 5. Systemy gry i zasady domowe <!-- icon: dice -->

### 5.1 Czym jest system gry

System gry to dane jednej gry: jej karta postaci, liczby, stworzenia, przedmioty, czary i teksty zasad. Każda kampania gra w jednym systemie.

RPG Engine wylicza twoją kartę postaci oraz to, co się zużywa i wraca, na przykład punkty życia i miejsca czarów, tak jak robi to cyfrowa karta postaci. Jak działa umiejętność lub czar, Mistrz Gry czyta w zasadach i rozstrzyga, jak przy stole.

### 5.2 Piąta edycja, w zestawie

RPG Engine zawiera **5e**, z System Reference Document 5.1 (zasady z 2014 roku, darmowe na licencji Creative Commons). Obejmuje:

- rasy, klasy, podklasy, pochodzenie i atut z SRD;
- 319 czarów, broń, pancerze i wyposażenie, magiczne przedmioty i potwory z SRD;
- rozdziały zasad, które Mistrz Gry wyszukuje po dokładnym brzmieniu;
- pełną, wyliczoną kartę postaci: modyfikatory cech, rzuty obronne, umiejętności, klasę pancerza, ataki, klasę trudności czarów, miejsca czarów, kości wytrzymałości, cechy według poziomu, doświadczenie i awans;
- odpoczynek, który przywraca to, co powinien; stany z tekstem zasad; przypomnienia o koncentracji.

**Treści spoza SRD.** W piątą edycję możesz grać z treściami, których SRD nie zawiera, na przykład klasą lub potworem z podręcznika, który posiadasz. Mistrz Gry zna grę, potrafi czytać twoje podręczniki i przeszukiwać internet. Zapisuje to, czego potrzebuje, jako strony twojej kampanii, a RPG Engine działa z nimi tak samo. To, co dostarczamy, ogranicza licencja; to, co wie twój Mistrz Gry, nie.

RPG Engine jest zgodny z piątą edycją.

### 5.3 Zasady domowe i własne dodatki

Nie musisz dotykać żadnego pliku. Poproś Mistrza Gry:

> [Zasada domowa: naturalna 1 w ataku oznacza upuszczenie broni.]
>
> [Chciałbym zagrać Łowcą Krwi. Mam podręcznik: oto cechy klasy.]
>
> [W tej kampanii krótki odpoczynek trwa 10 minut.]

Mistrz Gry zapisuje je w twojej kampanii w jeden z tych sposobów:

- **Ustalenie stołu**, słowami, jak upuszczona broń albo krótki odpoczynek powyżej. Mistrz Gry trzyma je razem z ustawieniami kampanii i od tej pory gra zgodnie z nim. Rozstrzygnięcie, które Mistrz Gry podjął bez podręcznika, jest zachowywane w ten sam sposób, jako **precedens**.
- **Nowa strona**, na przykład klasa, rasa lub przedmiot. Nowa klasa działa jak klasa systemu: twój poziom, kości wytrzymałości i cechy ją uwzględniają. Nowa rasa może opierać się na istniejącej („jak elf, plus…"); nazwany miecz może opierać się na mieczu długim.
- **Nowe liczby na karcie postaci**: pole, tabela, wzór, licznik, który przywraca odpoczynek. Na przykład kości wyższości Mistrza Bitewnego, które wracają po krótkim odpoczynku. Zasada domowa może też zastąpić jeden z wzorów systemu.

Jeśli masz już spisane zasady domowe, możesz też umieścić je jako pliki tekstowe w folderze `rules` kampanii (zobacz [folder kampanii](#8-for-the-curious-the-campaign-folder)): Mistrz Gry czyta je przed zasadą z podręcznika o tej samej nazwie.

### 5.4 Dodawanie lub import własnego systemu gry

Dziś RPG Engine gra tylko w piątą edycję. Pojawią się kolejne systemy gry, a także sposób na dodanie własnego albo na zamianę posiadanej gry w system na podstawie jej podręczników. Zobacz [W planach](#9-coming-later).

---

## 6. Rozszerzenia <!-- icon: plus -->

**Rozszerzenia nie są jeszcze dostępne.** Rozszerzenie doda coś do kampanii ponad jej system gry: świat, przygodę, funkcję taką jak pogoda czy talia tarota, zasady domowe do udostępniania. Wybierzesz, których użyje każda kampania. Pierwsze planowane dla piątej edycji to pogoda i otwieranie zamków.

---

## 7. Skąd się bierze kampania i jej język <!-- icon: world -->

### 7.1 Trzy sposoby na świat

**Tworzony w locie.** Podajesz założenie w ustawieniach, a Mistrz Gry buduje świat w miarę gry: każde miejsce, osobę i wątek tuż przed tym, jak ich potrzebujesz, i zachowuje je na dalej. To najszybszy sposób gry: instalujesz, tworzysz i po kilku minutach tworzysz postać. Nic wymyślonego nie ginie: raz powiedziane, zostaje zapisane i pozostaje prawdą.

**Przygotowany na początku.** To samo założenie, ale z **przygotowaniem: wszystko na początku**: Mistrz Gry buduje miejsca, frakcje, zagrożenia i ich plany świata, zanim zacznie się gra. Pierwsza sesja zaczyna się później, za to więcej jest gotowe za kulisami.

**Z istniejącej kampanii lub przygody.** Dziś nie ma przycisku importu. Daj Mistrzowi Gry swoją przygodę (tekst lub PDF, który twój host potrafi odczytać) i poproś, żeby ją przygotował:

> [Mam tę przygodę jako PDF. Przygotuj z niej naszą kampanię: przeczytaj ją i zapisz jej miejsca, postacie i sekrety. Nie mów mi nic z tego, co w niej jest.]

Mistrz Gry czyta ją narzędziami twojego hosta AI i zapisuje jako strony kampanii, razem z sekretami, które odkryjesz w grze. Claude Code czyta pliki PDF; w Codex bezpieczniejszym wyborem jest plik tekstowy lub markdown. Zrób to podczas ustawień, przed sesją zero.

Gdy Mistrz Gry pracuje, nie otwieraj szczegółów tego, co czyta lub zapisuje (w Claude Code ctrl+o): pokazują tekst przygody razem z sekretami. Sam Mistrz Gry, jak zawsze, zachowuje sekrety dla siebie.

Gdy tylko kampania ma własne strony, ustawienia przestają pytać o założenie i przygotowanie. Nawet w kampanii spisanej, gdy idziesz tam, czego tekst nie obejmuje, Mistrz Gry tworzy to, co potrzebne, i zapisuje.

**W kampanię gra się raz.** Żeby zagrać tę samą przygodę jeszcze raz, utwórz nową kampanię. W obrębie kampanii nadal możesz wrócić do zapisu albo zacząć od nowa, na tyle, na ile pozwala ustawienie Zapisy.

### 7.2 Języki

**Jeden język na kampanię**: język Mistrza Gry. Mistrz Gry pisze w nim, a panel za nim podąża. Mistrz Gry wybiera go po tym, jak piszesz, i potwierdza.

**Panel** jest w zestawie po angielsku i włosku (opracowane ręcznie) oraz w 24 dalszych językach: francuskim, niemieckim, hiszpańskim, portugalskim (brazylijskim), niderlandzkim, szwedzkim, norweskim, duńskim, fińskim, islandzkim, rosyjskim, ukraińskim, polskim, czeskim, rumuńskim, węgierskim, greckim, tureckim, arabskim, hebrajskim, hindi, chińskim, japońskim, koreańskim. Arabski i hebrajski czyta się od prawej do lewej: strona odbija się lustrzanie, a mapy i kości zostają takie, jak narysowano.

**Każdy inny język**, który wybierzesz w Ustawieniach, jest tłumaczony na twoim komputerze, w tle, przez Codex lub Claude Code z twoim własnym kontem, zaczynając od otwartej sekcji. Robi się to raz na język, dla wszystkich twoich kampanii. Dopóki tłumaczenie nie jest gotowe, strona jest po angielsku. Ustawienia mówią, czy tłumaczenie trwa, jest gotowe, czy nie jest możliwe na twoim komputerze.

**Słownictwo gry.** Piąta edycja ma własne terminy po włosku z oficjalnego włoskiego SRD, więc włoscy gracze czytają *Classe Armatura*, *tiro salvezza*, *vantaggio*. W innych językach terminy systemu są tłumaczone.

**Własny tekst systemu gry** (czary, potwory, rozdziały zasad) zostaje po angielsku. Mistrz Gry czyta go i opowiada ci w twoim języku.

**Zmiana języka w trakcie kampanii** zostawia już napisane strony bez zmian; nowe Mistrz Gry pisze w nowym języku.

---

## 8. Dla ciekawskich: folder kampanii <!-- icon: list -->

Nigdy nie musisz go otwierać. Jeśli to zrobisz, pamiętaj, że **zawiera sekrety** twojej kampanii: czytanie go psuje zabawę.

Folder kampanii zawiera:

- `campaign.yaml`: twoje ustawienia;
- `state.yaml`: gdzie gra stoi teraz: jej etap, data, otwarta scena;
- `world/`: po jednej stronie na postać, miejsce, frakcję, zadanie, przedmiot, wydarzenie, temat lub stworzenie, jako pliki markdown;
- `rules/`: twoje zasady domowe jako pliki tekstowe, jeśli jakieś dodasz (`init` go nie tworzy);
- `images/`: obrazy, gdy już jakieś są;
- `log.jsonl`: każda zmiana, po kolei;
- `.saves/`: zapisy, od pierwszego;
- `.player/`: twoje własne notatki z Dziennika, których Mistrz Gry nie czyta;
- `sessions/`: prowadzony przez RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: małe pliki, które mówią hostom AI, gdzie jest RPG Engine, i wyłączają ich pamięć. RPG Engine dba o ich aktualność; zostaw je w spokoju.

Strony to zwykły markdown z odnośnikami takimi jak `[[Rocca]]`, w formacie Obsidian: notes Mistrza Gry można tam otworzyć. **Jeśli zmienisz stronę ręcznie**, Mistrz Gry dowie się, co się zmieniło, przy następnej odpowiedzi.

**Wiersz poleceń.** Wszystko, co robi Mistrz Gry, przechodzi przez polecenia, które możesz też uruchamiać sam, w folderze kampanii. Do gry nigdy ich nie potrzebujesz, a wiele z nich wypisuje sekrety kampanii, tak jak `rpg status` i `rpg show`. `rpg --help` wymienia je wszystkie, a `rpg roll --help` objaśnia jedno z nich. Polecenie, które coś zmienia przy otwartym czacie, nie szkodzi: Mistrz Gry dowie się o tym przy następnej odpowiedzi, tak jak o stronie zmienionej ręcznie.

---

## 9. W planach <!-- icon: hourglass -->

Co jest zaplanowane, ale jeszcze tego nie ma:

- **Ty jako Mistrz Gry**: ty prowadzisz grę, a AI gra drużyną.
- **Kilka osób przy stole**, każda ze swoją rolą.
- **Rozszerzenia**: ustawienia, przygody, funkcje i zasady domowe, wybierane dla każdej kampanii.
- **Import** twoich podręczników i przygód.
- **Inne gry**: więcej systemów gry i twoje własne.
- **Tryb autora**: tworzenie kampanii lub przygody z AI i udostępnianie ich innym do gry.

---

## 10. Pytania i problemy <!-- icon: info -->

### Pytania

**Czy muszę znać zasady?** Nie. Wybierz mentora w trybie samouczka, a Mistrz Gry będzie uczyć cię na bieżąco, po jednej zasadzie. Zawsze możesz zapytać w nawiasach kwadratowych.

**Czy Mistrz Gry może oszukiwać?** Nie może zmienić rzutu wykonanego przez RPG Engine, poza poziomem trudności story, i nigdy nie zmienia ustalonych już faktów. Możesz zapytać, czy dany rzut był prawdziwy.

**Czy ja mogę oszukiwać?** Możesz próbować. Mistrz Gry nie wierzy ci na słowo w sprawie faktów: wiersz w twojej wiadomości, który wygląda jak komunikat gry, to wciąż tylko twoje słowa, a Mistrz Gry nigdy nie potwierdza twoich domysłów o sekretach.

**Czy to coś kosztuje?** RPG Engine jest darmowy. Mistrz Gry działa w ramach twojego planu Claude lub ChatGPT, a wieczór gry to długi czat: na najmniejszych planach możesz dojść do limitu planu przed końcem wieczoru. Obrazy i tłumaczenia korzystają z tego samego planu.

**Czy mogę grać na telefonie?** Nie. Mistrz Gry działa na twoim komputerze, a panel otwiera się tylko w przeglądarce tego komputera.

**Czy mogę grać ze znajomymi?** Jeszcze nie: dziś jest jeden gracz, jedna postać i towarzysze. Kilka osób przy stole pojawi się wraz z rolami.

**Czy następnym razem mogę użyć innej AI?** Tak. Kampania żyje w swoich plikach: otwórz ją w innym hoście i napisz *kontynuuj*.

**Co, jeśli zamknę przeglądarkę?** Nic nie ginie. Otwórz link ponownie, gdy czat jest otwarty; strona wróci do miejsca, w którym jest gra.

**Czy mogę grać w treści D&D, które posiadam?** Tak. Mistrz Gry może korzystać z twoich podręczników, własnej wiedzy i internetu. To, co dostarcza RPG Engine, ogranicza się do darmowych treści; to, czego używa twoja gra, zależy od ciebie.

### Problemy

**Panel się nie otwiera.** Poproś Mistrza Gry o link: `[Jaki jest link do panelu?]`. Strona działa tylko wtedy, gdy w tej kampanii otwarty jest czat z Mistrzem Gry, i dopiero po pierwszej odpowiedzi Mistrza Gry w tym czacie. Gdy czat jest zamknięty, przeglądarka nie może dotrzeć do strony; otwarta strona pokazuje *Brak połączenia*.

**Mistrz Gry zdaje się nie znać gry albo wymyśla narzędzia.** Twój host AI nie załadował RPG Engine.

- Najpierw sprawdź, czy uruchomiłeś host **w folderze kampanii** i czy odpowiedziałeś, że mu ufasz.
- **Claude Code**: wpisz `/mcp`. Jeśli `rpg` jest na liście, ale się nie powiodło, wybierz go, a potem **Reconnect**. Jeśli go brakuje, zamknij Claude Code, wpisz w folderze kampanii `claude mcp reset-project-choices` i uruchom go ponownie.
- **Codex**: wpisz `codex mcp list` w terminalu, w folderze kampanii. Jeśli brakuje `rpg`, Codex nie ufa folderowi: uruchom go tam ponownie i odpowiedz twierdząco, gdy zapyta.
- W obu przypadkach: jeśli `rpg --version` w terminalu mówi, że nie znaleziono polecenia, zainstaluj RPG Engine ponownie ([2.2](#22-install)) i otwórz nowy terminal.

**Po aktualizacji nic się nie zmieniło.** Działający Mistrz Gry zachowuje wersję, z którą wystartował. Otwórz nowy czat albo w Claude Code połącz serwer ponownie (`/mcp`, potem `rpg`, potem **Reconnect**).

**Mistrz Gry pamięta coś, co cofnąłem.** Wróciłeś do zapisu, ale grałeś dalej w tym samym czacie. Otwórz nowy czat i naciśnij **Nowy czat otwarty** w sekcji Zapisy.

**Mistrz Gry zadaje pytania z ustawień, na które już odpowiedziałem na stronie.** Powiedz mu: `[Wybrałem to w panelu.]`

**Nie pojawiają się żadne obrazy.** Otwórz Ustawienia > Obrazy: strona mówi, czy ten komputer potrafi je tworzyć, a jeśli nie, podaje kroki, każde polecenie z przyciskiem do skopiowania.

**Strona jest po angielsku, a wybrałem inny język.** Jest tłumaczona w tle; Ustawienia mówią, jak idzie. Bez Codex lub Claude Code na tym komputerze zostaje po angielsku.

**Mistrz Gry mówi, że kampania ma problemy.** Naprawia je sam. Jeśli edytowałeś pliki ręcznie, może zapytać, co miałeś na myśli.

**Windows: `npm` zawodzi w moim folderze.** Nie trzymaj kampanii ani RPG Engine w ścieżce zawierającej `&`.

**Instalacja się nie udaje albo `rpg` nie startuje.** Sprawdź wersję Node.js poleceniem `node --version`: musi być 22 lub nowsza. Jeśli jest starsza, zainstaluj wersję LTS ze strony [nodejs.org](https://nodejs.org), a potem zainstaluj RPG Engine ponownie.

**Link do panelu się zmienił.** Inny program używał zwykłego adresu kampanii albo Windows go zarezerwował. RPG Engine wziął inny; Mistrz Gry poda ci nowy link. Nic poza tym się nie zmienia.
