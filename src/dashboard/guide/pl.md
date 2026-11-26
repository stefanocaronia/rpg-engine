<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: pełny przewodnik

**RPG Engine** pozwala grać w tradycyjną grę fabularną z **AI w roli Mistrza Gry**. Grasz na **Pulpicie**, czyli w oknie na komputerze, z kartą postaci, kośćmi, mapami, dziennikiem i **czatem** z Mistrzem Gry. RPG Engine pracuje w tle: **pamięta świat**, **rzuca kośćmi** i **prowadzi rachunki**.

Ten przewodnik jest dla graczy: nie musisz umieć programować.

## Szybki start <!-- icon: send -->

1. Zainstaluj **Node.js** ze strony [nodejs.org](https://nodejs.org) (wersja LTS).
2. Jednorazowo, w nowym terminalu otwartym po zainstalowaniu Node.js, zainstaluj RPG Engine: `npm install -g rpg-engine`. Jeśli Windows odpowie, że uruchamianie skryptów jest wyłączone, wpisz raz `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, odpowiedz tak i spróbuj ponownie.
3. Wpisz `rpg open`. RPG Engine zapyta, czy umieścić jego ikonę na pulpicie komputera i w menu: naciśnij Enter, żeby się zgodzić. Odtąd uruchamiasz RPG Engine z ikony, bez terminala ([2.2](#22-install)).
4. Okno pokaże Twoje kampanie. Naciśnij **Nowa kampania**, nadaj jej nazwę i naciśnij **Utwórz** ([2.3](#23-create-a-campaign)): jej Pulpit otworzy się w osobnym oknie.
5. W czacie z Mistrzem Gry wybierz swoją aplikację AI i jej model: Claude Code wymaga płatnego planu Claude, Codex konta ChatGPT, darmowego lub płatnego ([2.4](#24-connect-your-ai)). Jeśli aplikacji brakuje albo brakuje logowania, strona ją zainstaluje lub Cię zaloguje. Naciśnij **Otwórz czat**, a potem **Zaczynamy**. Pierwsza odpowiedź może potrwać kilka minut. Potem Mistrz Gry zapyta, jak chcesz grać, i razem stworzycie Twoją postać.

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
- **Node.js 24** lub nowszy, ze strony [nodejs.org](https://nodejs.org). Razem z nim instaluje się `npm`, który instaluje RPG Engine.
- **Terminal**, jednorazowo, do zainstalowania RPG Engine: w Windows Terminal lub PowerShell, w macOS Terminal. Aby otworzyć terminal w folderze, kliknij folder prawym przyciskiem myszy i wybierz **Otwórz w Terminalu** (Windows) lub **Usługi > Nowy terminal w folderze** (macOS). Jeśli Windows odpowie, że uruchamianie skryptów jest wyłączone, wpisz raz `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` i odpowiedz tak.
- **Aplikacja AI** dla Mistrza Gry, z Twoim własnym kontem ([2.4](#24-connect-your-ai)): strona może ją zainstalować za Ciebie. Graj z **największym modelem**, jaki oferuje: mały model łatwiej namówić do ujawnienia sekretów albo naginania zasad.

### 2.2 Instalacja

```text
npm install -g rpg-engine
rpg open
```

Pierwsze polecenie instaluje RPG Engine, a `rpg --version` sprawdza, czy się udało. Jeśli npm zaproponuje aktualizację samego siebie, możesz ją pominąć.

`rpg open` otwiera okno RPG Engine z Twoimi kampaniami. Za pierwszym razem pyta w terminalu, czy dodać jego ikonę na pulpit komputera i do menu Start (w macOS do folderu Programy): naciśnij Enter, żeby się zgodzić. Odtąd klikasz ikonę dwukrotnie i terminal nie jest już potrzebny. Bez ikony wpisuj `rpg open` przy każdej grze. `rpg icon` dodaje ikonę później, a `rpg icon --remove` ją usuwa.

### 2.3 Tworzenie kampanii

Okno RPG Engine pokazuje kampanie jako karty, ostatnio otwarta jest pierwsza. Naciśnij **Nowa kampania** i podaj jej **Nazwę**, **Język** i **System gry**: resztę Mistrz Gry tworzy razem z Tobą. Kampania trafia do folderu o jej nazwie, w folderze `RPG Engine` w Twoim folderze użytkownika (w Windows `C:\Users\<name>`). **Wybierz inny folder…** umieszcza ją w pustym folderze, który wskażesz. W sekcji **Mistrz Gry** możesz już wybrać aplikację AI i model do pierwszego czatu ([2.4](#24-connect-your-ai)). Naciśnij **Utwórz**: Pulpit kampanii otworzy się w osobnym oknie.

Następnym razem kliknij kartę, żeby otworzyć kampanię. Karta otwartej kampanii ma napis **Otwarta teraz**. **Otwórz folder…** dodaje kampanię, którą już masz na tym komputerze. Mały krzyżyk na karcie usuwa ją z listy: pliki zostają tam, gdzie są.

### 2.4 Połącz swoją AI

Mistrz Gry działa w **aplikacji AI** na Twoim komputerze, z Twoim własnym kontem: Claude Code, Codex, OpenCode lub Antigravity. Zwykły czat, taki jak claude.ai lub ChatGPT, ani aplikacja na telefon nie wystarczą: Mistrz Gry musi mieć dostęp do plików kampanii na Twoim komputerze. Każda aplikacja wymaga własnego konta: Claude Code płatnego planu Claude (Pro lub wyższego), Codex konta ChatGPT, darmowego lub płatnego, Antigravity konta Google, którego darmowe użycie ma tygodniowe limity. OpenCode ma kilka darmowych modeli przez ograniczony czas albo korzysta z modeli Twojego dostawcy, także lokalnych.

W czacie Pulpitu wybierz aplikację w polu **Twoja aplikacja AI**, potem jej **Model** i **Przemyślenia Mistrza Gry**: strona je proponuje. Więcej myślenia oznacza wolniejszą grę i większe zużycie planu. Aplikacja, która nie jest gotowa, mówi, czego potrzebuje, i pokazuje przycisk, który to załatwia:

- **Claude Code** i **Codex**: **Zainstaluj Claude Code** lub **Zainstaluj Codex** pobiera aplikację do własnego folderu RPG Engine na tym komputerze. **Zaloguj się do Claude Code** lub **Zaloguj się do Codex** otwiera w przeglądarce jej stronę logowania. RPG Engine nigdy nie widzi Twojego hasła.
- **OpenCode** i **Antigravity**: **Pobierz OpenCode** lub **Pobierz Antigravity** otwiera stronę aplikacji, na której ją zainstalujesz. OpenCode działa bez logowania, a w Antigravity logujesz się w jego własnej aplikacji. Potem wróć i naciśnij **Sprawdź ponownie**.

Antigravity jest oznaczony jako **w wersji próbnej**: może wyjść z gry i zadawać pytania po swojemu, więc do gry lepsze są Claude Code, Codex lub OpenCode. Antigravity zachowuje Twoje dawne czaty, a jego pamięci nie da się wyłączyć: Mistrz Gry ma polecenie, by nigdy ich nie czytać. To, co piszesz, trafia do Google, który może pozwolić ludziom to czytać: nie podawaj w grze danych osobowych. RPG Engine nie jest produktem Google. Najwięcej gramy i testujemy z **Claude Code**: z pozostałymi nie rozegrano jeszcze całej kampanii.

W czacie Pulpitu Mistrz Gry dotyka Twojego komputera tylko przez RPG Engine: sam nie otwiera żadnych Twoich plików. RPG Engine czyta poza kampanią tylko to, co wybierzesz, gdy zgodzisz się w oknie komputera.

Możesz też grać w czacie własnej aplikacji AI, w terminalu lub w jej aplikacji na komputer ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Pierwszy czat

Gdy aplikacja i model są wybrane, naciśnij **Otwórz czat**: aplikacja się uruchamia, co może potrwać kilka sekund. Potem naciśnij **Zaczynamy** albo napisz cokolwiek, na przykład *Cześć! Zaczynajmy.* Pierwsza odpowiedź może potrwać kilka minut, bo Mistrz Gry buduje scenę.

Czat ma własną sekcję, **Odgrywanie**, albo stoi obok strony: małe przyciski u góry umieszczają go **W osobnej karcie**, **Po lewej** lub **Po prawej**, a przeciągnięcie jego krawędzi poszerza go.

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
| **Twoja postać** | Jak powstaje Twoja postać w sesji zero | z Mistrzem Gry, przez Mistrza Gry, własna ([2.7](#27-session-zero-your-character)) |
| **Towarzysze** | Kto podróżuje z Tobą | brak, tworzeni z Tobą, tworzeni przez Mistrza Gry, poznani w grze |
| **Obrazy** | Obrazy miejsc, zadań i spotykanych postaci | brak, na prośbę, nowe miejsca, zadania i spotkane postacie ([3.11](#311-pictures)) |
| **Linie** i **Zasłony** | Co nigdy się nie pojawia, a co dzieje się tylko poza ekranem | listy |
| **Język** | Język gry i dashboardu | dowolny |

Piąta edycja dodaje **rozwój postaci**: punkty doświadczenia albo kamienie milowe.

Gdy nie ma gotowego świata, Mistrz Gry pyta też o **założenie** (gatunek, ton, kilka elementów i to, co w grze lubisz najbardziej, na przykład walki, zagadki, rozmowy lub eksplorację, własnymi słowami), o **przygotowanie**: czy budować świat w locie, w trakcie gry, czy całość na początku, oraz o **długość**: jeden wieczór, kilka sesji (od trzech do pięciu wieczorów) albo otwarta, jedna przygoda po drugiej. Po zakończeniu historii o określonej długości zawsze można grać dalej.

**Styl Mistrza Gry** nie jest nigdy pytany, ale można go zmienić w czacie lub w **Ustawieniach**: **Narracja** (prosta, literacka, pulpowa, ironiczna), wymyślane **Historie** (sytuacje, wątki, odcinki, tajemnica), autor, którego styl można wybrać w opcji **Pisz jak**, albo cokolwiek innego **Własnymi słowami**.

### 2.7 Sesja zero: Twoja postać

Postać tworzysz z Mistrzem Gry, jak przy stole. Każdy wybór należy do Ciebie, chyba że poprosisz Mistrza Gry, aby go dokonał. Możesz przyjść z pełnym pomysłem, z mglistym albo z niczym. Możesz też poprosić Mistrza Gry, aby stworzył całą postać na podstawie kilku słów. W grze z poziomami Mistrz Gry pyta, od którego poziomu zaczynasz: od pierwszego, chyba że chcesz inny. Mistrz Gry mówi, jak powstają wartości cech, zanim padnie jakikolwiek rzut kością. Historia postaci nigdy nie jest wymagana. Jeśli ją podasz, Mistrz Gry zapisze ją Twoimi słowami. Potem Mistrz Gry prosi o obraz postaci ([3.7](#37-your-characters-story-and-picture)). RPG Engine liczy kkartę postaci: nigdy nie robisz rachunków.

Masz już postać, z innej gry lub z innej kampanii? Wybierz w ustawieniach początkowych **Już mam** i przekaż ją Mistrzowi Gry: wklej kartę postaci w czacie. W czacie własnej aplikacji AI możesz też podać, gdzie na komputerze leży plik (PDF, obraz, tekst). W czacie Pulpitu Mistrz Gry nie otwiera żadnych Twoich plików. Mistrz Gry zapisuje postać taką, jaka jest, na jej poziomie, sprawdza ją z zasadami i światem oraz uzgadnia z Tobą wszystko, co do nich nie pasuje.

### 2.8 Inny sposób: czat własnej aplikacji AI

Możesz też grać w czacie samej aplikacji AI, w terminalu lub w jej aplikacji na komputer, z Pulpitem otwartym obok. Wtedy kampanię tworzysz w terminalu, w folderze, w którym trzymasz swoje gry ([2.1](#21-what-you-need) mówi, jak to zrobić), zawsze z jej nazwą: `rpg init "The Salt Isles"` tworzy folder `The Salt Isles` z nową kampanią w środku. RPG Engine sam przygotowuje tam to, czego potrzebuje każda aplikacja.

Uruchom aplikację w tym folderze: `claude` dla Claude Code, `codex` dla Codex, `agy` dla Antigravity, `opencode` dla OpenCode. Możesz też otworzyć folder w jej aplikacji na komputer. Zgódź się, gdy zapyta, czy ufasz folderowi: uwaga, w Claude Code domyślnie zaznaczona jest odpowiedź *No, exit*. Mistrzem Gry może być też każdy inny agent obsługujący MCP: uruchom go w folderze kampanii i podaj mu serwer MCP `rpg mcp`.

Napisz *Cześć! Zaczynajmy.* W pierwszej odpowiedzi w każdym czacie Mistrz Gry podaje **link do Twojego Pulpitu**, coś w rodzaju `http://127.0.0.1:4750`: otwórz go obok czatu.

- Między wiadomościami Mistrza Gry aplikacja pokazuje narzędzia, których używa: nie otwieraj ich szczegółów (w Claude Code ctrl+o), bo mogą zdradzać sekrety.
- Kampania wyłącza własną pamięć aplikacji: gra żyje w jej plikach, dzięki czemu powrót do zapisu naprawdę cofa grę. W aplikacji Codex na komputer sprawdź w ustawieniach, czy pamięć jest wyłączona dla czatów gry.
- Jeśli Mistrz Gry mówi, że nie może znaleźć narzędzi RPG Engine, wpisz `rpg init` w folderze kampanii, a potem otwórz nowy czat.
- Kampanię prowadzi naraz jeden czat: gdy Twój jest otwarty, czat Pulpitu czeka.

---

## 3. Granie <!-- icon: chat -->

### 3.1 Rozmowa z Mistrzem Gry

Pisz, co robi lub mówi Twoja postać, własnymi słowami:

> Pytam karczmarza, kto jeszcze tu dzisiaj zaglądał.

Żeby wyjść poza opowieść, pisz `[OOC: …]` (poza postacią): *[OOC: Jak działa chwyt zapaśniczy?]* Mistrz Gry odpowiada w ten sam sposób. W czacie Pulpitu jego słowa spoza gry są wyodrębnione i oznaczone OOC.

W czacie Pulpitu pisz w polu na dole i naciśnij Enter, żeby wysłać. Shift+Enter zaczyna nowy wiersz. Gdy Mistrz Gry odpowiada, **Zatrzymaj** wstrzymuje jego odpowiedź, a Twoje słowa czekają w polu. Gdy Mistrz Gry o coś pyta, razem z pytaniem pojawiają się jego przyciski, także te z rzutami: kliknij jeden albo napisz odpowiedź. Pod polem widzisz aplikację i model. Jeśli aplikacja na to pozwala, kliknij model, żeby go zmienić po odpowiedzi Mistrza Gry. **Zamknij czat** kończy czat, a gra zostaje w swoich plikach.

Ty mówisz, czego próbujesz. Mistrz Gry mówi, co się dzieje. Mistrz Gry nigdy nie decyduje za Twoją postać i nigdy nie mówi o silniku gry. Możesz go zapytać, jak korzystać z dashboardu.

**Działanie z poziomu dashboardu**: kliknij nazwę na karcie postaci, na przykład broń, zaklęcie lub coś, co nosisz: karta powie, czym to jest. Torba otwiera się strzałką, a jej ⓘ pokazuje kartę torby. Wybierz, co chcesz z tym zrobić. Gdy akcja nie wymaga nikogo innego, jak **Załóż**, ten sam przycisk prosi o potwierdzenie, *Potwierdź: zakładam Tarczę*. Naciśnij go ponownie, a akcja trafi do Mistrza Gry. Gdy akcja dotyczy kogoś, jak **Atakuj**, dashboard pyta, kogo: na liście albo kliknięciem na mapie. Wtedy przycisk mówi całe zdanie, *Atakuję Zakapturzonego Bandytę 1 Maczugą*, a jedno kliknięcie je wysyła. Aby powiedzieć to po swojemu, kliknij osobę, z którą chcesz porozmawiać, albo napisz na czacie. Mistrz Gry słyszy to tak, jakby padło na czacie, rozstrzyga jak każde inne działanie i pyta przyciskami o to, czego zabrakło. Gdy Twoja aplikacja AI nie ma „dzwonka”, Mistrz Gry przeczyta to, gdy następnym razem napiszesz na czacie. Jeśli czat był wcześniej zamknięty, **Powtórz** wyśle to jeszcze raz.

### 3.2 Rzuty

Mistrz Gry prosi o rzut tylko wtedy, gdy wynik jest niepewny i ma znaczenie. Najpierw mówi, o co toczy się gra. Potem:

- **Na dashboardzie** baner pokazuje przycisk dla każdego testu, na przykład *Acrobatics +4 · z przewagą*. Kliknij go: kości spadną na stronie, a Mistrz Gry usłyszy wynik. Możesz też kliknąć podświetlony wiersz karty postaci, rzucić kośćmi z tacki na kości albo wpisać w banerze coś innego.
- **Ręcznie**, w rogu banera lub w **Ustawieniach**: baner mówi, czym rzucić, a Ty rzucasz z karty postaci lub z tacki na kości.
- **Kości fizyczne**, gdy ustawienie kości jest na fizyczne: wpisujesz wyniki rzutu, *[Wyrzucono 14.]*, a RPG Engine dodaje Twoje modyfikatory.

**Swobodne rzuty**: kliknij dowolną liczbę na karcie postaci albo otwórz tackę na kości, żeby rzucać dla zabawy. Nigdy się nie liczą, a Mistrz Gry ich nie widzi.

**Rzuty Mistrza Gry** pojawiają się w kolumnie rzutów, oprócz tajnych. Zawsze możesz zapytać *[Czy ten rzut był prawdziwy?]*: przy tajnym rzucie Mistrz Gry podaje odcisk, który dowodzi, że rzut wykonano, zanim padło pytanie.

### 3.3 Sceny i walki

Opowieść toczy się w **scenach**: walka, rozmowa, zwiedzanie, podróż, odpoczynek. Na końcu każdej sceny gra zapisuje się sama, scena trafia do Twojego dziennika, a gdy opowieść skręca, Mistrz Gry spisuje sceny od ostatniego rozdziału jako nowy rozdział książki o Twojej opowieści.

W walce Mistrz Gry opowiada o każdej turze, która nie jest Twoja, i zatrzymuje się tam, gdzie możesz podjąć decyzję. **Scena** pokazuje u góry, czyja jest tura i kto będzie następny, a obok mapy kartę Twojej postaci. Kolejność tur, punkty wytrzymałości drużyny i to, jak ranni wyglądają przeciwnicy (opisane słowami), zostają z boku strony. Jeśli Twoja postać upadnie, rzuty obronne przeciw śmierci pojawią się na stronie w dużym rozmiarze.

**Stałe rozkazy**: powiedz towarzyszom coś, co ma obowiązywać dłużej, na przykład *Od teraz zawsze zostawiajcie jednego przy życiu*. Mistrz Gry pilnuje tego, dopóki tego nie odwołasz. Towarzysze wykonują rozkaz tak, jak pozwala im ich postać, a jeśli któryś by tego nie zrobił, mówi o tym. Swoje rozkazy znajdziesz w **Ustawieniach**, gdzie możesz je dodawać i usuwać.

### 3.4 Czas, podróże i świat, który się zmienia

RPG Engine pilnuje daty. Między sesjami czas gry nie płynie, chyba że w **Ustawieniach** wybierzesz, żeby płynął, na przykład dzień gry za każdy tydzień przerwy, albo poprosisz o to Mistrza Gry. Powiedz, że odpoczywacie, *Robimy długi odpoczynek*, a gdy Mistrz Gry się zgodzi, odpoczynek przywróci to, co trzeba. Przy krótkim odpoczynku Mistrz Gry może zapytać na dashboardzie, ile kości wytrzymałości wydajesz: rzucaj nimi po jednej, patrz, ile każda leczy, i przestań, kiedy chcesz. Powiedz, dokąd idziesz, *Ruszamy drogą na północ do Rocca*, a RPG Engine obliczy trasę, dystans i liczbę dni, zatrzymując się, gdy coś wydarzy się po drodze. Pieniądze liczy się w monetach gry, łącznie z resztą.

Złoczyńcy mają plany z terminami. Każdego nowego dnia Mistrz Gry porusza zagrożenia, które czas posunął naprzód. Widzisz ich znaki, ale nigdy sam zegar.

### 3.5 Mapy

**Świat** pokazuje miejsca, które zna Twoja postać, drogi między nimi i szlak, który przebyła, a resztę przykrywa mgła. **Scena** pokazuje mapę miejsca, w którym jesteś, jeśli je ma, razem z tym, kto gdzie stoi. W walce, w Twojej turze, pola poza zasięgiem są zasłonięte. Gdy Mistrz Gry pyta, dokąd się ruszasz, dotknij pola albo je wpisz, na przykład *E4*.

**Świat** przechowuje też wiedzę Twojej postaci. **Wiedza** zawiera listę osób, miejsc, frakcji, stworzeń i opowieści, które postać zna, każde tak, jak ona je zna: przeszukaj ją albo otwórz wpis, żeby przeczytać go w całości. Nazwa w tekście prowadzi do swojej strony. **Dokumenty** przechowują listy, ogłoszenia i strony, które postać znalazła, żeby można je było przeczytać ponownie. **Kalendarz** pokazuje dzisiejszy dzień, terminy zadań z pozostałym czasem oraz dni opowieści: dzień ze scenami prowadzi do nich na osi czasu w Dzienniku.

### 3.6 Zadania, dziennik i notatki

Zadanie, które podejmuje Twoja postać, staje się zadaniem w **Dzienniku**, z jego celami, terminem i tym, co mierzy. Oznacz je gwiazdką, żeby zostało na widoku u góry Sceny. W części **Historia** Dziennik opowiada Twoją historię jak książkę: Mistrz Gry pisze rozdział prozą za każdym razem, gdy opowieść skręca, opisując sceny od poprzedniego rozdziału, w stylu, który wybierasz. Czytaj rozdział po rozdziale, a ostatni przeczytany oznacza zakładka. Możesz pobrać książkę jako Markdown albo jako stronę internetową do wydruku lub przekazania dalej. W grze rozpoczętej wcześniej poproś Mistrza Gry o spisanie dotychczasowej historii. **Oś czasu** wylicza ponumerowane sceny wraz z tym, co się w każdej wydarzyło. Dziennik przechowuje też Twoje **Notatki**: są prywatne, chyba że klikniesz **Udostępnij** przy jednej z nich. Mistrz Gry słyszy wtedy notatkę jako to, co myślisz, nigdy jako fakt. W części **Towarzysze** czytasz dzienniki towarzyszy: od czasu do czasu, na koniec dnia lub zadania, zapisują kilka linijek o tym, co myślą i czują.

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

Po powrocie **otwórz nowy czat**: stary pamięta to, co cofnięto. W czacie Pulpitu naciśnij **Zamknij czat**, a potem **Nowy czat**. W czacie własnej aplikacji AI otwórz nową rozmowę (`/clear` w Claude Code). Napisz *dalej* w nowym czacie. Potem powiedz Mistrzowi Gry, że czat jest nowy: naciśnij **Nowy czat otwarty** w Zapisach albo napisz o tym w czacie. Do tego czasu Mistrz Gry nie rusza dalej.

Jeśli nie wiesz, czym jest git, pomiń ten akapit. Jeśli folder kampanii jest repozytorium git, w **Ustawieniach** znajdziesz sekcję **Git**, w której wszystko jest wyłączone, dopóki nie wybierzesz inaczej: commit na początku każdej sesji, przy każdym zapisie i na końcu każdej sceny, a po nim, jeśli chcesz, push. Commit to migawka kampanii z danej chwili. Push wysyła migawki do repozytorium online, na przykład na GitHubie, żeby kopia istniała też poza tym komputerem. Zapisy i Twoje czaty z Mistrzem Gry zostają poza repozytorium, chyba że je tam dopuścisz. Dopuszczaj czaty tylko wtedy, gdy repozytorium jest prywatne.

### 3.9 Sesje: przerwa i powrót

Przerwij, kiedy chcesz: *[Skończmy na dziś.]* Wszystko jest już zapisane w plikach. Żeby wrócić, uruchom RPG Engine z ikony i kliknij swoją kampanię. Jeśli czat został otwarty, wróci sam. Jeśli został zamknięty, naciśnij **Wznów czat**. Potem naciśnij **Wznów historię**: Mistrz Gry w kilku zdaniach przypomina, gdzie skończyła się gra, i prowadzi dalej. Jeśli gra została zamknięta, gdy Mistrz Gry jeszcze odpowiadał albo gdy czekało na Ciebie jego pytanie, ten przycisk nazywa się **Wznów od tego miejsca**. **Nowy czat** otwiera świeży czat w tej samej grze. W czacie własnej aplikacji AI uruchom ją w folderze kampanii i napisz *dalej*.

### 3.10 Nastrój Mistrza Gry

Robot u góry Pulpitu to Mistrz Gry: jego twarz podąża za tonem opowieści i nigdy nie zdradza tego, czego jeszcze nie wiesz. Gdy Pulpit nie jest połączony z grą, robot śpi.

### 3.11 Obrazy

RPG Engine potrafi tworzyć obrazy miejsc, do których docierasz, zadań, które podejmujesz, i osób, które spotykasz, zgodnie z ustawieniem **Obrazy**, a także portret Twojej postaci na prośbę. Twoja aplikacja AI robi to własnymi środkami, z Twoim logowaniem, w ramach Twojego planu i jego limitów: **Claude** rysuje obrazy wektorowe, **Codex** i **Antigravity** je malują, a **OpenCode** rysuje w czacie proste obrazy wektorowe. W **Ustawienia > Kampania > Obrazy** możesz sprawić, że Codex lub Antigravity będzie malować obrazy także wtedy, gdy Mistrzem Gry jest inna aplikacja. Jeśli wybrana aplikacja nie potrafi tego robić, obrazy tworzy Twój czat. **Ustawienia** pokazują, czy ten komputer może je tworzyć, a jeśli nie, jak to skonfigurować. Zawsze możesz dać własny obraz, swojej postaci lub dowolnej stronie, którą widzisz: najedź wskaźnikiem na jeden z jej obrazów, a w rogu pojawi się mały przycisk obrazu (działa też z klawiatury, a na telefonie jest zawsze widoczny). W części **Świat** otwarta strona ma także **Zmień obraz…**, a gdy jeszcze nie ma obrazu, **Dodaj obraz…**. Gdy wskaźnik jest nad obrazem albo jego przycisk jest zaznaczony, możesz też wkleić skopiowany obraz skrótem Ctrl+V (⌘V na komputerze Mac). Twój obraz zajmuje miejsce dotychczasowego. Możesz też wrzucić plik do folderu **inbox** kampanii i powiedzieć Mistrzowi Gry, do której strony należy.

### 3.12 Bezpieczeństwo: linie, zasłony i stop

**Linie** nigdy nie pojawiają się w grze, a **zasłony** działają tylko poza ekranem. W każdej chwili napisz *[stop]*: Mistrz Gry od razu porzuca tę treść i dodaje ją do Twoich linii.

### 3.13 Zmiana zdania

Każde ustawienie można zmienić, na czacie lub w **Ustawieniach**. Rozstrzygnięcie, które Mistrz Gry podejmuje bez podręcznika, staje się **precedensem**, więc to samo pytanie następnym razem dostaje tę samą odpowiedź.

---

## 4. Pulpit <!-- icon: party -->

Strona na Twoim komputerze, w osobnym oknie, otwierana tylko na tym komputerze. Działa, dopóki jej okno jest otwarte, z czatem lub bez. Około trzydziestu sekund po jego zamknięciu gra się zatrzymuje, a razem z nią czat. Nic nie ginie: wszystko jest w plikach. W czacie własnej aplikacji AI strona działa, dopóki ten czat jest otwarty. Gdy gry nie ma, strona pokazuje *Not connected*: naciśnij **Wznów kampanię** albo, we własnej aplikacji, otwórz następny czat. Przycisk **Kampanie**, z domkiem, prowadzi z powrotem do wszystkich Twoich kampanii.

- **Odgrywanie**: czat z Mistrzem Gry, gdy nie stoi obok strony ([2.5](#25-the-first-chat)).
- **Drużyna**: Twoja karta postaci i karty towarzyszy. Kliknij liczbę, aby wykonać rzut. Najedź na nią kursorem, aby zobaczyć, skąd się bierze. Gdy strzałka oznacza kość, zobaczysz też, co poprawia rzut lub go pogarsza. Gdy Mistrz Gry przygotowuje dla Ciebie wybory, na przykład przy nowym poziomie, otwiera je powiadomienie na karcie postaci. Wybierz, kiedy chcesz, przeczytaj strony wskazane w opcjach, wykonaj rzut tam, gdzie opcja tego wymaga, a potem potwierdź. Opowieść toczy się w tym czasie dalej. Obok są rzuty.
- **Scena**: gdzie jesteś, obraz i mapa miejsca, kto tam jest, co się dzieje. W walce: tury i karta Twojej postaci.
- **Dziennik**: zadania, historia jako książka, jej oś czasu, dzienniki towarzyszy, Twoje notatki.
- **Świat**: mapa świata, to, co wie Twoja postać, znalezione dokumenty i kalendarz.
- **Tacka na kości**: wybierz kości i modyfikator, potem rzuć. ×2 podwaja kości, nigdy modyfikator, tak jak przy trafieniu krytycznym.
- **Zapisy**, **Pomoc**, **Ustawienia** i **Informacje**: ikony na końcu rzędu. W Ustawieniach, w sekcji **Pulpit**, są też preferencje samej strony: tryb, dźwięk kości, zestaw kości oraz **Motyw**, czyli kolory, ścianki kości i obrazy strony. Może to być motyw systemu gry, motyw dodany w Packages › Add (z katalogu, z linku do GitHuba, z pliku .zip lub z folderu) albo motyw samej strony. Jeśli własny arkusz stylów motywu sprawia, że strona jest trudna do czytania, wyłącz tam **Własny styl motywu**. Ustawienia zawsze otwierają się bez niego, pod adresem strony z `#/settings/page` na końcu.

Gdy Mistrz Gry o coś pyta, jego baner zostaje na górze, w jakiejkolwiek sekcji jesteś.

---

## 5. Systemy gry i zasady domowe <!-- icon: dice -->

### 5.1 Czym jest system gry

To dane jednej gry: jej karta postaci, liczby, stworzenia, przedmioty, zaklęcia i tekst zasad. Każda kampania korzysta z jednego systemu. RPG Engine liczy kartę postaci oraz to, co się zużywa i wraca. Jak działa dana zdolność, Mistrz Gry sprawdza w zasadach i rozstrzyga, tak jak przy stole.

### 5.2 Piąta edycja

Rasy, klasy, podklasy, pochodzenie i atut z SRD 5.1; 319 zaklęć, broń, pancerze, magiczne przedmioty i potwory; rozdziały zasad, które Mistrz Gry czyta w ich dokładnym brzmieniu; pełna, wyliczona karta postaci.

To osobny pakiet: Mistrz Gry proponuje go przy tworzeniu kampanii i instaluje. Kampania, która z niego korzysta, sama go instaluje przy pierwszym otwarciu na komputerze, na którym go nie ma. Mistrz Gry informuje o tym.

Można też grać treściami, których brakuje w SRD, z posiadanego podręcznika. Mistrz Gry zapisuje je jako strony kampanii, a RPG Engine traktuje je jak własne. RPG Engine zawiera tylko otwarte treści, ale wiedza Mistrza Gry nie ma takiego ograniczenia.

Własne podręczniki mogą stać się biblioteką. Powiedz Mistrzowi Gry, gdzie są: *[Moje podręczniki są w D:\Books\5e.]* Albo dodaj ich folder w Pakiety › Biblioteka i raz powiedz „tak" w oknie, które pokaże komputer. RPG Engine czyta je na tym komputerze. Każda kampania używa folderów, które tam włączysz. Mistrz Gry przeszukuje je, gdy rozstrzyga zasadę, po SRD, i podaje książkę oraz stronę. Najlepiej czyta się tekst albo pliki PDF z zaznaczalnym tekstem. Zeskanowany PDF jest odczytywany z obrazów stron, tylko w systemie Windows, w kilka minut i z kilkoma błędami. RPG Engine nigdy nie zmienia Twoich podręczników, nigdzie nie wysyła ich tekstu i nigdy nie kopiuje go do kampanii.

### 5.3 Zasady domowe i własne dodatki

Poproś Mistrza Gry: *[Zasada domowa: naturalna 1 w ataku oznacza upuszczenie broni.]* Mistrz Gry zapisuje ją jako ustalenie stołu albo tworzy stronę lub liczbę na karcie postaci, jeśli jest potrzebna. Gotowe zasady domowe można umieścić jako pliki tekstowe w folderze `rules` kampanii.

Gdy Mistrz Gry zmienia w Twojej kampanii stronę systemu gry, na przykład punkty wytrzymałości stworzenia albo zasięg zaklęcia, dashboard oznacza ją małą gwiazdką po nazwie, wszędzie, gdzie ją pokazuje. Pakiety › Zainstalowane wymienia zmienione strony pod nazwą systemu gry, obok tego, co dał system. Stworzenie, którego Twoja postać nie zna, jest tam wymienione samą nazwą. Tam można przywrócić stronę do postaci, w jakiej zapisuje ją system, gdy rozgrywana scena dobiegnie końca. Dashboard nie może cofnąć zmiany, tylko Mistrz Gry może zapisać ją ponownie.

### 5.4 Dodawanie lub import własnego systemu gry

System gry to pakiet. Mistrz Gry instaluje go z npm, z folderu lub z pliku. Pakiet, który nie jest nasz, tylko za Twoim „tak", w formularzu Twojego agenta lub w oknie komputera. Tworzenie pakietu to praca programisty, opisana w dokumentach RPG Engine na GitHubie. Zamiana własnego podręcznika w system gry jeszcze nie jest dostępna ([Wkrótce](#9-coming-later)).

---

## 6. Rozszerzenia <!-- icon: plus -->

Rozszerzenie dodaje do kampanii coś ekstra, ponad system gry: na przykład pogodę, która zmienia się z każdym świtem, albo otwieranie zamków za pomocą kości. Dodasz je w Pakiety › Dodaj: z listy albo przez nazwę w npm, folder lub plik. Rozszerzenie spoza naszej oferty zawiera kod, więc działa tylko za Twoją zgodą, w oknie na Twoim komputerze. Rozszerzenie stworzone dla innego systemu gry informuje o tym i nie zostanie dodane. W Pakiety › Zainstalowane aktualizujesz rozszerzenia lub je usuwasz. Mistrz Gry też może dodać rozszerzenie, gdy o to poprosisz.

---

## 7. Skąd się bierze kampania i jej język <!-- icon: world -->

### 7.1 Trzy sposoby na świat

- **Tworzony na bieżąco**: na podstawie Twojego założenia Mistrz Gry buduje każde miejsce, osobę i wątek tuż przed tym, jak będą potrzebne, i je zapamiętuje.
- **Przygotowany na początku**: tak samo, tylko świat powstaje przed grą.
- **Z Twojej własnej przygody lub książki**: daj Mistrzowi Gry jej plik, *[Zaimportuj tę przygodę jako naszą kampanię: D:\Books\adventure.pdf. Nie mów mi nic z tego, co w niej jest.]* Plik spoza kampanii jest czytany dopiero po Twojej zgodzie w oknie komputera, a plik włożony do folderu **inbox** kampanii jest czytany od razu. Najlepiej czyta się tekst, EPUB, dokument Word albo PDF z zaznaczalnym tekstem. PDF ze skanu jest czytany z obrazów stron, tylko w systemie Windows, powoli i z kilkoma błędami. Czyta go Twoja aplikacja AI poza czatem, a jeśli nie może, to Mistrz Gry w czacie, w ramach Twojego planu: w Claude Code lub Codex czyta jedno z tych dwóch, w Antigravity Twój Antigravity, a w OpenCode model, który ostatnio w nim wybrano. Cały dokument trafia do producenta tego, kto go czyta, na warunkach Twojego konta i jego ustawień dotyczących trenowania. Pulpit pokazuje postęp. Przy powieści Mistrz Gry proponuje, od czego zacząć. Mistrz Gry spisuje miejsca, postacie i sekrety.

W kampanię gra się raz: aby zagrać tę samą przygodę jeszcze raz, utwórz nową kampanię.

### 7.2 Języki

Jeden język na kampanię, język Mistrza Gry, za którym podąża dashboard. Dashboard jest dostępny w 26 językach. Każdy inny jest tłumaczony na Twoim komputerze przez Twoją aplikację AI poza czatem (Codex lub Claude Code; w Antigravity i OpenCode robią to one same), a gdy żadna nie może, przez Mistrza Gry w czacie. Terminy piątej edycji po włosku pochodzą z oficjalnego włoskiego SRD. Tekst zasad zostaje po angielsku, a Mistrz Gry opowiada go w Twoim języku.

---

## 8. Dla ciekawskich: folder kampanii <!-- icon: list -->

Nie musisz go nigdy otwierać, a zawiera sekrety Twojej kampanii. Znajdziesz w nim `campaign.yaml` (Twoje ustawienia), `state.yaml` (stan gry), `world/` (jedna strona markdown dla każdej postaci, miejsca, zadania i reszty), `rules/` (Twoje zasady domowe), `images/`, `log.jsonl` (każda zmiana), `sessions/` (Twoje rozmowy z Mistrzem Gry w formie tekstu, z Claude Code i Codex), `.saves/`, `.player/` (Twoje notatki) oraz małe pliki, które mówią agentom AI, gdzie jest RPG Engine. Strony mają format Obsidiana. Jeśli zmienisz stronę ręcznie, Mistrz Gry dowie się o tym przy najbliższej odpowiedzi.

RPG Engine działa tylko w tym folderze: czyta i zapisuje grę wyłącznie tu i nigdy nie rusza Twoich innych plików. Foldery z podręcznikami tylko czyta. Poza nim trzyma jedynie własne foldery danych (tłumaczenia dashboardu, tekst odczytany z Twoich podręczników oraz Codex lub Claude Code, jeśli pozwolisz je zainstalować) i foldery tymczasowe na czas rysowania obrazu. Wszystko inne, czego agent chce na Twoim komputerze, robi dopiero po pytaniu. System gry lub rozszerzenie to kod, jak każdy pakiet npm: pakiet, który nie jest nasz, działa na Twoim komputerze z Twoimi uprawnieniami, a RPG Engine instaluje go tylko za Twoim „tak", w formularzu Twojego agenta lub w oknie komputera. Odpowiadaj „tak" tylko na pakiety, których autorom ufasz.

Każde polecenie, którego używa Mistrz Gry, można też uruchomić w folderze kampanii: `rpg --help` pokazuje ich listę. Wiele z nich wypisuje sekrety kampanii.

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

**Czy muszę znać zasady?** Nie. Wybierz mentora w trybie samouczka i pytaj, kiedy chcesz, pisząc `[OOC: …]`.

**Czy Mistrz Gry może oszukiwać?** Nie może zmienić rzutu wykonanego przez RPG Engine, chyba że na poziomie trudności fabularnym, ani faktów już ustalonych.

**Czy to coś kosztuje?** RPG Engine jest darmowy. Mistrz Gry działa w ramach planu Twojej aplikacji AI albo na Twoim komputerze z modelem lokalnym. Wieczór gry to długi czat: na najmniejszych planach możesz dojść do limitu planu przed końcem wieczoru. Obrazy, tłumaczenia i importy korzystają z tego samego planu. RPG Engine nigdy nie używa klucza API, za który płaci się za każde wywołanie: zaloguj aplikację AI swoim kontem, nie kluczem.

**Czy mogę grać na telefonie?** Nie: Mistrz Gry działa na Twoim komputerze, a dashboard otwiera się tylko tam.

**Czy mogę grać ze znajomymi?** Jeszcze nie: dziś jest jeden gracz, jedna postać i towarzysze ([Wkrótce](#9-coming-later)).

**Czy następnym razem mogę użyć innej AI?** Tak: wybierz inną aplikację w czacie, zanim go otworzysz, albo otwórz kampanię w innej aplikacji i napisz *dalej*.

### Problemy

**Kampania się nie otwiera.** Uruchom RPG Engine ponownie z ikony albo poleceniem `rpg open` w terminalu i kliknij kampanię. Jeśli jej Pulpit pokazuje *Not connected*, naciśnij **Wznów kampanię**. Karta z napisem **Nie znaleziono folderu** straciła swój folder: usuń ją z listy i dodaj ponownie przez **Otwórz folder…**, tam gdzie folder jest teraz. W czacie własnej aplikacji AI Pulpit działa tylko wtedy, gdy otwarty jest czat tej kampanii: zapytaj Mistrza Gry `[OOC: Jaki jest link do Pulpitu?]`. W aplikacji Claude czat zostawiony na jakiś czas w tle zasypia, a razem z nim strona: kliknij czat, a strona wróci pod tym samym adresem.

**Mistrz Gry chyba nie zna gry.** Dzieje się tak w czacie własnej aplikacji AI: nie załadowała ona RPG Engine. Sprawdź, czy uruchomiono ją w folderze kampanii i czy ufasz temu folderowi. W Claude Code wpisz `/mcp` i połącz ponownie `rpg`. W Codex polecenie `codex mcp list` w folderze kampanii musi pokazać `rpg`. Jeśli `rpg --version` nie zostanie znalezione, zainstaluj RPG Engine ponownie ([2.2](#22-install)).

**Windows nie znajduje `claude`.** Dzieje się tak, gdy Claude Code został zainstalowany ręcznie. Jego instalator informuje o tym w żółtej notatce i podaje folder, do którego trafił program: dodaj ten folder do PATH (Właściwości systemu > Zmienne środowiskowe), a potem otwórz nowy terminal.

**Aktualizacja.** Gdy jest nowsza wersja RPG Engine, Pulpit o tym informuje: w Packages › Installed RPG Engine jest pierwszy, z przyciskiem **Aktualizuj**, a potem rób to, co podpowiada strona. Albo uruchom ponownie `npm install -g rpg-engine` w terminalu, a potem otwórz nowy czat: działający Mistrz Gry zachowuje wersję, z którą wystartował.

**Mistrz Gry pamięta coś, co cofnięto.** Otwórz nowy czat i naciśnij **Nowy czat otwarty** w Zapisach.

**Aplikacja się nie instaluje.** Strona podaje powód: naciśnij **Spróbuj ponownie**. Albo zainstaluj aplikację samodzielnie ze strony jej producenta, a potem naciśnij **Sprawdź ponownie**.

**Strona logowania nie otwiera się w przeglądarce.** Gdy strona na Ciebie czeka, naciśnij tam **Otwórz stronę logowania ponownie** albo **Anuluj** i spróbuj jeszcze raz.

**Czat Pulpitu mówi, że gra inny czat.** Tę kampanię prowadzi czat otwarty w Twojej aplikacji AI: graj dalej tam albo zamknij go, żeby grać w Pulpicie.

**Nie pojawiają się obrazy.** Ustawienia > Kampania > Obrazy mówią, czy ten komputer może je tworzyć i jak.

**Instalacja się nie udaje albo `rpg` nie startuje.** `node --version` musi pokazać 24 lub nowszą wersję. Jeśli Windows odpowie, że uruchamianie skryptów jest wyłączone, zobacz [2.1](#21-what-you-need). W systemie Windows trzymaj RPG Engine i swoje kampanie poza ścieżkami zawierającymi `&`.

**Link do Pulpitu się zmienił.** W czacie własnej aplikacji AI każda kampania ma własny adres, taki sam czat po czacie. Zmienia się on tylko wtedy, gdy zajmuje go już inny program: Mistrz Gry poda Ci nowy link, który od tej chwili zostaje. Drugi czat tej samej kampanii zachowuje stronę pod tym samym adresem i przejmuje ją, gdy zamkniesz pierwszy.
