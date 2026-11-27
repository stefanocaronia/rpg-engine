<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: pełny przewodnik

**RPG Engine** pozwala grać w tradycyjną grę fabularną z **AI w roli Mistrza Gry**. Grasz na **Pulpicie**, czyli w oknie na komputerze, z kartą postaci, kośćmi, mapami, dziennikiem i **czatem** z Mistrzem Gry.

Ten przewodnik mówi, jak grać. Strona sama objaśnia swoje przyciski: najedź wskaźnikiem na przycisk, żeby zobaczyć, co robi.

## Szybki start <!-- icon: send -->

1. Zainstaluj **Node.js** ze strony [nodejs.org](https://nodejs.org) (wersja LTS).
2. Otwórz nowy terminal i wpisz `npm install -g rpg-engine`. Jeśli Windows odpowie, że uruchamianie skryptów jest wyłączone, wpisz `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, odpowiedz tak i spróbuj ponownie.
3. Wpisz `rpg open`: na pulpicie komputera pojawi się ikona RPG Engine ([2.2](#22-installing)). Odtąd uruchamiasz RPG Engine z ikony.
4. Naciśnij **Nowa kampania**, nadaj jej nazwę i naciśnij **Utwórz** ([2.3](#23-a-new-campaign)).
5. W czacie wybierz swoją aplikację AI i jej model ([2.4](#24-connect-your-ai)): Claude Code wymaga płatnego planu Claude, Codex konta ChatGPT, darmowego lub płatnego. Naciśnij **Otwórz czat**, a potem **Zaczynamy**.

Pierwsza odpowiedź może potrwać kilka minut. Potem Mistrz Gry zapyta, jak chcesz grać, i razem stworzycie Twoją postać.

## 1. Czym jest RPG Engine <!-- icon: about -->

| Kto | Co robi |
|---|---|
| **Ty** | Grasz swoją postacią: decydujesz, co robi, mówi i próbuje zrobić. |
| **Mistrz Gry** (AI) | Opowiada historię, gra wszystkich pozostałych, decyduje, co się dzieje, i prosi o rzuty. |
| **RPG Engine** | Przechowuje świat w plikach, rzuca kośćmi, liczy punkty życia, pieniądze, czas i odległości oraz strzeże sekretów, dopóki ich nie odkryjesz. |

Dzięki temu świat pozostaje taki sam z wieczoru na wieczór, nawet w nowym czacie, nawet z inną AI:

- **To, co zostało powiedziane, pozostaje prawdą.** Martwy złoczyńca pozostaje martwy.
- **Kości są prawdziwe.** Mistrz Gry nie może ich zmieniać, chyba że na najłatwiejszym poziomie trudności.
- **Sekrety pozostają sekretami.** Mistrz Gry nigdy nie zdradza tego, czego postać nie wie.
- **Świat się porusza.** Zagrożenia narastają, gdy odpoczywacie lub podróżujecie.
- **Kampania to folder** na komputerze: przerywasz, kiedy chcesz, i wracasz później.

Gra występuje jako system gry: obecnie nasz to **piąta edycja**, oparta na darmowym System Reference Document 5.1. Bez systemu gry grasz swobodnie, w historię bez liczb.

---

## 2. Pierwsze kroki <!-- icon: path -->

### 2.1 Co jest potrzebne

- Komputer z Windows, macOS lub Linuksem.
- **Node.js 24** lub nowszy, ze strony [nodejs.org](https://nodejs.org).
- **Terminal**, tylko do instalacji: w Windows Terminal lub PowerShell, w macOS Terminal.
- **Aplikacja AI** dla Mistrza Gry, z Twoim własnym kontem ([2.4](#24-connect-your-ai)).

### 2.2 Instalacja

```text
npm install -g rpg-engine
rpg open
```

Pierwsze polecenie instaluje RPG Engine. Jeśli npm zaproponuje aktualizację samego siebie, możesz ją pominąć.

`rpg open` otwiera okno RPG Engine. Za pierwszym razem dodaje też ikonę na pulpicie komputera i w menu: odtąd uruchamiasz grę z ikony. Aby ją usunąć, wpisz `rpg icon --remove`.

Jeśli instalacja się nie uda, sprawdź, czy `node --version` pokazuje 24 lub więcej. Jeśli Windows odpowie, że uruchamianie skryptów jest wyłączone, wpisz `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` i odpowiedz tak. W Windows trzymaj RPG Engine i swoje kampanie z dala od ścieżek zawierających `&`.

### 2.3 Nowa kampania

Naciśnij **Nowa kampania** i podaj jej **Nazwę**, **Język** i **System gry**. Resztę Mistrz Gry tworzy razem z Tobą. Naciśnij **Utwórz**: kampania otworzy się w osobnym oknie.

Mistrz Gry i Pulpit mówią w języku kampanii. Tekst zasad piątej edycji zostaje po angielsku, a Mistrz Gry opowiada go w Twoim języku.

Kampania to folder o jej nazwie, w folderze `RPG Engine` w Twoim folderze użytkownika. Następnym razem kliknij jej kartę.

### 2.4 Połącz swoją AI

Mistrz Gry działa w **aplikacji AI** na Twoim komputerze, z Twoim kontem. Zwykły czat w przeglądarce, taki jak claude.ai lub ChatGPT, nie wystarczy: Mistrz Gry musi mieć dostęp do plików kampanii.

- **Claude Code**: płatny plan Claude (Pro lub wyższy).
- **Codex**: konto ChatGPT, darmowe lub płatne.
- **OpenCode**: bez konta; kilka darmowych modeli przez ograniczony czas albo modele Twojego dostawcy, także lokalne.
- **Antigravity**: konto Google; jego darmowe użycie ma tygodniowe limity.

W czacie wybierz aplikację, jej **Model** i **Przemyślenia Mistrza Gry**. Jeśli aplikacji brakuje albo nie jesteś zalogowany(-a), przycisk ją zainstaluje, zaloguje Cię lub otworzy jej stronę. RPG Engine nigdy nie widzi Twojego hasła.

Wieczór gry to długi czat: w najmniejszych planach można dojść do limitu przed końcem wieczoru. Graj z największym modelem, jaki masz: mały łatwiej namówić do ujawnienia sekretów.

Najwięcej gramy i testujemy z **Claude Code**. Antigravity jest **w wersji próbnej**: może wyjść z gry, a Twoje czaty zachowuje w pamięci, której nie da się wyłączyć. To, co tam piszesz, trafia do Google, który może pozwolić ludziom to czytać. RPG Engine nie jest produktem Google.

### 2.5 Pierwszy czat

Naciśnij **Otwórz czat**, a potem **Zaczynamy**. Pierwsza odpowiedź może potrwać kilka minut. Potem nowa kampania przechodzi przez trzy etapy:

1. **Ustawienia**: Mistrz Gry pyta, jak chcesz grać, po kilka pytań naraz: jak trudny jest świat, czy można zginąć, kiedy można wrócić do zapisu. Napisz *Ty decydujesz*, a Mistrz Gry wybierze. Wszystko można zmienić później.
2. **Sesja zero**: tworzysz postać z Mistrzem Gry, jak przy stole. RPG Engine robi rachunki na karcie postaci. Jeśli masz już postać, wklej jej kartę w czacie.
3. **Gra**: Mistrz Gry ustawia pierwszą scenę.

### 2.6 Gra w aplikacji AI

Możesz też grać w czacie samej aplikacji AI, w terminalu lub w jej aplikacji na komputer, z Pulpitem otwartym obok.

1. Otwórz terminal w folderze, w którym trzymasz swoje gry: kliknij folder prawym przyciskiem myszy i wybierz **Otwórz w Terminalu** (Windows) lub **Usługi > Nowy terminal w folderze** (macOS).
2. Wpisz `rpg init "The Salt Isles"`: powstanie folder `The Salt Isles` z nową kampanią w środku.
3. Uruchom aplikację w tym folderze: `claude`, `codex`, `agy` dla Antigravity lub `opencode`. Zgódź się, gdy zapyta, czy ufasz folderowi: w Claude Code domyślnie zaznaczona jest odpowiedź *No, exit*.
4. Napisz *Cześć! Zaczynajmy.* Mistrz Gry poda Ci link do Pulpitu: otwórz go obok czatu.

Warto wiedzieć:

- Nie otwieraj szczegółów narzędzi, których używa aplikacja (w Claude Code ctrl+o): mogą zdradzać sekrety.
- W aplikacji Codex na komputer wyłącz pamięć dla czatów gry.
- Jeśli Mistrz Gry nie zna gry, wpisz `rpg init` w folderze kampanii i otwórz nowy czat.
- Jeśli Windows nie znajduje `claude`, dodaj do PATH folder podany przez instalator, a potem otwórz nowy terminal.
- Kampanię prowadzi naraz jeden czat: gdy Twój jest otwarty, czat Pulpitu czeka.

---

## 3. Granie <!-- icon: chat -->

### 3.1 Rozmowa z Mistrzem Gry

Pisz, co robi lub mówi Twoja postać:

> Pytam karczmarza, kto jeszcze tu dzisiaj zaglądał.

Ty mówisz, czego próbujesz, a Mistrz Gry mówi, co się dzieje. Mistrz Gry nigdy nie decyduje za Twoją postać.

Żeby wyjść poza opowieść, pisz `[OOC: …]` (poza postacią): *[OOC: Jak działa chwyt zapaśniczy?]* Możesz pytać Mistrza Gry o zasady albo o to, jak działa Pulpit.

Gdy Mistrz Gry o coś pyta, odpowiedz jego przyciskami lub własnymi słowami. Możesz też działać z karty postaci: kliknij broń, zaklęcie lub przedmiot i wybierz, co chcesz zrobić.

**Stałe rozkazy**: powiedz towarzyszom coś, co ma obowiązywać dłużej, na przykład *Od teraz zawsze zostawiajcie jednego przy życiu*. Mistrz Gry pilnuje tego, dopóki tego nie odwołasz.

### 3.2 Rzuty

Mistrz Gry prosi o rzut tylko wtedy, gdy wynik jest niepewny i ma znaczenie. Baner pokazuje rzut: kliknij go, a kości spadną.

Kości należą do RPG Engine, nie do Mistrza Gry. Zawsze możesz zapytać *[Czy ten rzut był prawdziwy?]*: nawet przy tajnym rzucie Mistrz Gry może dowieść, że wykonano go, zanim padło pytanie.

Gdy ustawienie **Kości** jest na fizyczne, rzucaj własnymi kośćmi i wpisz wynik: *[OOC: Wyrzucono 14.]* Rzuty dla zabawy, z karty postaci lub ze **Swobodnego rzutu**, nigdy się nie liczą.

### 3.3 Sceny, walki i podróże

Opowieść toczy się w **scenach**: walka, rozmowa, podróż, odpoczynek. Na końcu każdej sceny gra zapisuje się sama, a scena trafia do Twojego dziennika.

W walce Mistrz Gry prowadzi każdą turę, która nie jest Twoja, i zatrzymuje się, gdy musisz zdecydować.

Powiedz, dokąd idziesz, *Ruszamy drogą na północ do Rocca*: RPG Engine obliczy dystans i liczbę dni, a zatrzyma się, gdy coś wydarzy się po drodze. Tymczasem plany złoczyńców idą dalej, a Ty widzisz ich znaki.

### 3.4 Zapisy

RPG Engine zapisuje kampanię na końcu każdej sceny. Ustawienie **Zapisy** decyduje, kiedy można wrócić:

- **Permanentna śmierć**: nigdy.
- **Punkt kontrolny**: do ostatniego zapisu, tylko gdy postać zginie.
- **Wolna**: do dowolnego zapisu, a zapisać można, kiedy chcesz.

W każdym trybie możesz zacząć od nowa, w czacie lub w **Zapisach**.

Po powrocie otwórz nowy czat, bo stary pamięta to, co cofnięto:

1. Naciśnij **Zamknij czat**, a potem **Nowy czat**. W czacie własnej aplikacji AI otwórz nową rozmowę (`/clear` w Claude Code).
2. Napisz *dalej*.
3. Naciśnij **Nowy czat otwarty** w Zapisach. Do tego czasu Mistrz Gry czeka.

### 3.5 Przerwa i powrót

Przerwij, kiedy chcesz: wszystko jest już zapisane. Zamknij okno Pulpitu, a chwilę później gra się zatrzyma. Nic nie ginie.

Żeby wrócić, uruchom RPG Engine z ikony i kliknij swoją kampanię. Naciśnij **Wznów czat**, a potem **Wznów historię**: Mistrz Gry powie, gdzie skończyła się gra, i poprowadzi dalej. Następnym razem możesz też wybrać inną aplikację AI.

### 3.6 Granice i stop

**Linie** nigdy nie pojawiają się w grze, a **zasłony** działają tylko poza ekranem. Ustawiasz je w **Ustawieniach**.

W każdej chwili napisz *[stop]*: Mistrz Gry porzuci tę treść i doda ją do Twoich linii.

### 3.7 Obrazy

Mistrz Gry może zlecić obrazy miejsc, zadań i osób, zgodnie z ustawieniem **Obrazy**, a także portret Twojej postaci na prośbę. Tworzy je Twoja aplikacja AI, w ramach Twojego planu. Jeśli żaden się nie pojawia, **Ustawienia** pokażą, czy ten komputer może je tworzyć.

Możesz też dać swojej postaci albo stronie świata własny obraz, bezpośrednio na tej stronie.

---

## 4. Pulpit <!-- icon: party -->

Okno, w którym widzisz swoją grę. Pokazuje tylko to, co wie Twoja postać.

- **Odgrywanie**: czat z Mistrzem Gry, gdy nie stoi obok strony.
- **Drużyna**: Twoja karta postaci, karty towarzyszy i rzuty.
- **Scena**: gdzie jesteś, kto tam jest i mapa; w walce tury.
- **Dziennik**: zadania, historia jako książka, dzienniki towarzyszy i Twoje notatki.
- **Świat**: mapa świata, to, co wie Twoja postać, znalezione dokumenty i kalendarz.
- **Zapisy**: powroty i zaczynanie od nowa.
- **Ustawienia**: jak grasz i jak wygląda strona.
- **Pakiety**: system gry, rozszerzenia, Twoje podręczniki i aktualizacje: gdy pojawi się nowy RPG Engine, strona o tym informuje.

Jeśli strona pokazuje, że nie jest połączona, naciśnij **Wznów kampanię**.

Żeby grać z telefonu, w domu: w **Ustawieniach**, w sekcji **Pulpit**, włącz **Dostęp z telefonu** i skieruj aparat telefonu na kod, w tej samej sieci Wi-Fi co komputer. Windows może zapytać, czy Node.js może używać sieci: zezwól w sieciach prywatnych i ustaw Wi-Fi jako sieć prywatną. Gra jest przesyłana bez szyfrowania: używaj jej tylko w zaufanej sieci, takiej jak domowa, nigdy w publicznej, hotelowej ani biurowej sieci Wi-Fi. Wyłącz dostęp, gdy skończysz: gra kończy się razem z ostatnim oknem komputera.

Jeśli motyw utrudnia czytanie strony, dopisz `#/settings/page` na końcu jej adresu i wyłącz **Własny styl motywu**.

---

## 5. Zasady, podręczniki i rozszerzenia <!-- icon: dice -->

**System gry** to dane jednej gry: karta postaci, stworzenia, przedmioty, zaklęcia i zasady. RPG Engine liczy kartę postaci. Jak zasada działa w danej sytuacji, czyta i rozstrzyga Mistrz Gry, tak jak przy stole.

**Piąta edycja** zawiera darmowe zasady z System Reference Document 5.1. Możesz też grać treścią z posiadanego podręcznika: Mistrz Gry zapisze ją w Twojej kampanii.

**Twoje podręczniki**: powiedz Mistrzowi Gry, gdzie są, albo dodaj ich folder w **Pakiety**. Mistrz Gry szuka w nich zasad i podaje książkę oraz stronę. RPG Engine nigdy ich nie zmienia i nie kopiuje do kampanii.

**Zasady własne**: poproś Mistrza Gry, *[House rule: a natural 1 on an attack means you drop your weapon.]* Mistrz Gry zapamięta zasadę. Rozstrzygnięcie podjęte raz obowiązuje też następnym razem.

**Rozszerzenia** dodają coś do gry, na przykład pogodę. Dodasz je w **Pakiety** albo poprosisz o to Mistrza Gry.

---

## 6. Twoja własna przygoda <!-- icon: world -->

Bez gotowego świata Mistrz Gry tworzy go na podstawie Twojego pomysłu i go pamięta.

Aby zagrać w przygodę albo w posiadany podręcznik, daj Mistrzowi Gry jego plik: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Plik spoza kampanii zostanie odczytany dopiero po Twojej zgodzie. Najlepiej czyta się tekst, EPUB, Word albo PDF z tekstem, który da się zaznaczyć.

Cały dokument trafia do firmy, której AI go czyta. Kampanię rozgrywa się raz: aby zagrać w tę samą przygodę jeszcze raz, utwórz nową kampanię.

---

## 7. Twoje dane <!-- icon: lock -->

- Kampania to folder. Zawiera sekrety kampanii, także Twoje rozmowy z Mistrzem Gry. Nie musisz go nigdy otwierać.
- RPG Engine czyta i zapisuje tylko w tym folderze. Twoje podręczniki tylko czyta. Cokolwiek innego poza kampanią rusza dopiero po Twojej zgodzie, w oknie na komputerze.
- W czacie na dashboardzie Mistrz Gry sam nie otwiera żadnych Twoich plików.
- To, co piszesz, trafia do firmy, której model gra Mistrza Gry, na warunkach Twojego konta. Przy modelu lokalnym zostaje na Twoim komputerze.
- System gry albo rozszerzenie, które nie pochodzi od nas, to kod uruchamiany na Twoim komputerze. Instaluje się go tylko za Twoją zgodą. Zgadzaj się wyłącznie na rozwiązania autorów, którym ufasz.
- Jeśli folder kampanii jest repozytorium git, **Ustawienia** mogą go zatwierdzać za Ciebie. Włącz rozmowy tylko wtedy, gdy repozytorium jest prywatne.
- Gdy **Dostęp z telefonu** jest włączony, gra idzie z komputera na telefon bez szyfrowania, przez Twoją sieć domową i bez żadnej zewnętrznej usługi: każdy w tej sieci mógłby ją czytać.
