<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: der komplette Leitfaden

**RPG Engine** lässt dich ein Pen-&-Paper-Rollenspiel mit einer **KI als Spielleitung** spielen. Du spielst im **Dashboard**, einem Fenster auf deinem Computer mit deinem Charakterbogen, den Würfeln, den Karten, deinem Tagebuch und dem **Chat** mit der Spielleitung. RPG Engine arbeitet im Hintergrund: Es **merkt sich die Welt**, **würfelt** und **führt Buch**.

Dieser Leitfaden richtet sich an Spielende: Du musst nicht programmieren können.

## Schnellstart <!-- icon: send -->

1. Installiere **Node.js** von [nodejs.org](https://nodejs.org) (die LTS-Version).
2. Installiere RPG Engine, einmalig, in einem neuen Terminal, das du nach der Installation von Node.js geöffnet hast: `npm install -g rpg-engine`. Wenn Windows meldet, dass das Ausführen von Skripten deaktiviert ist, schreibe einmal `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, antworte mit Ja und versuche es noch einmal.
3. Schreibe `rpg open`. Es fragt, ob das Symbol von RPG Engine auf deinen Desktop und in dein Menü soll: Drücke Enter für Ja. Ab dann startest du RPG Engine über sein Symbol, ohne Terminal ([2.2](#22-install)).
4. Ein Fenster zeigt deine Kampagnen. Drücke auf **Neue Kampagne**, gib ihr einen Namen und drücke auf **Erstellen** ([2.3](#23-create-a-campaign)): Ihr Dashboard öffnet sich in einem eigenen Fenster.
5. Wähle im Chat mit der Spielleitung deine KI-App und ihr Modell: Claude Code braucht einen bezahlten Claude-Tarif, Codex ein ChatGPT-Konto, kostenlos oder bezahlt ([2.4](#24-connect-your-ai)). Fehlt die App oder bist du nicht angemeldet, installiert die Seite sie oder meldet dich an. Drücke auf **Chat öffnen**, dann auf **Beginnen**. Die erste Antwort kann ein paar Minuten dauern. Dann fragt die Spielleitung, wie du spielen möchtest, und ihr erschafft gemeinsam deinen Charakter.

## 1. Was RPG Engine ist <!-- icon: about -->

| Wer | Was sie tun |
|---|---|
| **Du** | Du spielst deinen Charakter: was er tut, sagt und versucht. |
| **Die Spielleitung** (die KI) | Erzählt die Geschichte, spielt alle anderen, entscheidet, was passiert, und verlangt Würfe. |
| **RPG Engine** | Hält die Welt in Dateien fest, würfelt, zählt Trefferpunkte, Geld, Zeit und Entfernungen und bewahrt Geheimnisse, bis du sie entdeckst. |

Die Welt bleibt von einem Abend zum nächsten gleich, auch in einem neuen Chat, auch mit einer anderen KI:

- **Was gesagt wurde, bleibt wahr.** Ein toter Schurke bleibt tot.
- **Die Würfel sind echt.** Die Spielleitung kann sie nicht beugen, außer bei der leichtesten Schwierigkeit, wenn du sie wählst.
- **Geheimnisse bleiben geheim.** Die Spielleitung verrät dir nie, was dein Charakter nicht weiß.
- **Die Welt bewegt sich.** Bedrohungen rücken vor, während ihr rastet oder reist, und du siehst ihre Zeichen.
- **Eine Kampagne ist ein Ordner** auf deinem Computer: Hör auf, wann du willst, und mach später weiter.

Ein Spiel kommt als Spielsystem, ein Paket, das die Spielleitung für deine Kampagne installiert: Heute ist unseres die **fünfte Edition** aus dem freien System Reference Document 5.1. Ohne Spielsystem spielst du frei, eine Geschichte ohne Zahlen. Weitere werden folgen ([Später geplant](#9-coming-later)).

---

## 2. Erste Schritte <!-- icon: path -->

### 2.1 Was du brauchst

- Einen Computer mit Windows, macOS oder Linux und einen Webbrowser.
- **Node.js 24** oder neuer, von [nodejs.org](https://nodejs.org). Es bringt `npm` mit, womit du RPG Engine installierst.
- Ein **Terminal**, einmalig, um RPG Engine zu installieren: unter Windows Terminal oder PowerShell, unter macOS Terminal. Um eines in einem Ordner zu öffnen, klickst du den Ordner mit der rechten Maustaste an und wählst **Im Terminal öffnen** (Windows) oder **Dienste > Neues Terminal beim Ordner** (macOS). Wenn Windows meldet, dass das Ausführen von Skripten deaktiviert ist, schreibe einmal `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` und antworte mit Ja.
- Eine **KI-App** für die Spielleitung, mit deinem eigenen Konto ([2.4](#24-connect-your-ai)): Die Seite kann sie für dich installieren. Spiele mit dem **größten Modell**, das sie anbietet: Ein kleines Modell lässt sich leichter dazu bringen, Geheimnisse zu verraten oder die Regeln zu verbiegen.

### 2.2 Installieren

```text
npm install -g rpg-engine
rpg open
```

Die erste Zeile installiert RPG Engine. Mit `rpg --version` prüfst du, ob es geklappt hat. Wenn npm anbietet, sich selbst zu aktualisieren, kannst du das ignorieren.

`rpg open` öffnet das Fenster von RPG Engine mit deinen Kampagnen. Beim ersten Mal fragt es im Terminal, ob sein Symbol auf deinen Desktop und in dein Startmenü (unter macOS in Programme) soll: Drücke Enter für Ja. Ab dann klickst du doppelt auf das Symbol und brauchst das Terminal nicht mehr. Ohne das Symbol schreibst du bei jedem Spielen `rpg open`. Mit `rpg icon` fügst du das Symbol später hinzu, mit `rpg icon --remove` entfernst du es.

### 2.3 Eine Kampagne anlegen

Das Fenster von RPG Engine zeigt deine Kampagnen als Karten, die zuletzt geöffnete zuerst. Drücke auf **Neue Kampagne** und fülle **Name**, **Sprache** und **Spielsystem** aus: Den Rest erschafft die Spielleitung mit dir. Die Kampagne liegt in einem Ordner mit ihrem Namen, im Ordner `RPG Engine` deines Benutzerordners (unter Windows `C:\Users\<name>`). Mit **Anderen Ordner wählen…** legst du sie in einem leeren Ordner deiner Wahl ab. Unter **Die Spielleitung** kannst du schon die KI-App und das Modell für den ersten Chat wählen ([2.4](#24-connect-your-ai)). Drücke auf **Erstellen**: Das Dashboard der Kampagne öffnet sich in einem eigenen Fenster.

Beim nächsten Mal klickst du auf eine Karte, um ihre Kampagne zu öffnen. Eine geöffnete Kampagne trägt den Vermerk **Jetzt geöffnet**. Mit **Ordner öffnen…** fügst du eine Kampagne hinzu, die du schon auf diesem Computer hast. Das kleine Kreuz auf einer Karte nimmt sie von der Liste: Ihre Dateien bleiben, wo sie sind.

### 2.4 Deine KI verbinden

Die Spielleitung läuft in einer **KI-App** auf deinem Computer, mit deinem eigenen Konto: Claude Code, Codex, OpenCode oder Antigravity. Ein einfacher Chat wie claude.ai oder ChatGPT oder eine Handy-App reicht nicht: Die Spielleitung muss die Dateien der Kampagne auf deinem Computer erreichen können. Jede App braucht ihr eigenes Konto: Claude Code einen bezahlten Claude-Tarif (Pro oder höher), Codex ein ChatGPT-Konto, kostenlos oder bezahlt, Antigravity ein Google-Konto, dessen kostenlose Nutzung Wochenlimits hat. OpenCode hat zeitweise einige kostenlose Modelle oder nutzt die deines eigenen Anbieters, auch lokale.

Wähle im Chat des Dashboards unter **Deine KI-App** die App, dann ihr **Modell** und die **Überlegungen der Spielleitung**: Die Seite schlägt sie vor. Mehr Überlegung ist langsamer und verbraucht mehr von deinem Tarif. Eine App, die noch nicht bereit ist, sagt, was sie braucht, mit einer Schaltfläche, die es erledigt:

- **Claude Code** und **Codex**: **Claude Code installieren** oder **Codex installieren** lädt die App in den eigenen Ordner von RPG Engine auf diesem Computer herunter. **Bei Claude Code anmelden** oder **Bei Codex anmelden** öffnet ihre Anmeldeseite in deinem Browser. RPG Engine sieht nie dein Passwort.
- **OpenCode** und **Antigravity**: **OpenCode holen** oder **Antigravity holen** öffnet ihre Website, wo du sie installierst. OpenCode spielt ohne Anmeldung, Antigravity meldet sich in seiner eigenen App an. Komm dann zurück und drücke auf **Erneut prüfen**.

Antigravity ist als **in der Testphase** markiert: Es kann aus dem Spiel aussteigen und auf seine eigene Art Fragen stellen, deshalb eignen sich Claude Code, Codex oder OpenCode besser zum Spielen. Antigravity behält deine bisherigen Chats, und sein Speicher lässt sich nicht ausschalten: Die Spielleitung hat die Anweisung, sie nie zu lesen. Was du schreibst, geht an Google, wo es unter Umständen von Menschen gelesen wird: Gib keine persönlichen Daten ins Spiel ein. RPG Engine ist kein Produkt von Google. Wir spielen und testen RPG Engine am meisten mit **Claude Code**: Mit den anderen wurde noch keine ganze Kampagne gespielt.

Im Chat des Dashboards greift die Spielleitung nur über RPG Engine auf deinen Computer zu: Von selbst öffnet sie keine deiner Dateien. RPG Engine liest außerhalb der Kampagne nur, was du gewählt hast, nachdem du in einem Fenster deines Computers Ja gesagt hast.

Du kannst auch im eigenen Chat deiner KI-App spielen, in einem Terminal oder in ihrer Desktop-App ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Der erste Chat

Sind App und Modell gewählt, drücke auf **Chat öffnen**: Die App startet, was ein paar Sekunden dauern kann. Drücke dann auf **Beginnen** oder schreibe irgendetwas, zum Beispiel *Hallo! Lass uns anfangen.* Die erste Antwort kann ein paar Minuten dauern, während die Spielleitung die Szene aufbaut.

Der Chat hat einen eigenen Bereich, **Rollenspiel**, oder steht neben der Seite: Die kleinen Schaltflächen oben im Chat legen ihn **In eigenem Tab**, **Links** oder **Rechts** ab, und du ziehst an seinem Rand, um ihn breiter zu machen.

Eine neue Kampagne durchläuft drei Schritte, die oben im Dashboard stehen: **1 Einstellungen** (wie du spielen willst), **2 Session Zero** (du erschaffst deinen Charakter, im Spiel), **3 Spiel**.

### 2.6 Einstellungen: festlegen, wie du spielst

Die Spielleitung fragt nur, was noch fehlt, ein paar Fragen auf einmal. Der Schritt **Einstellungen** im Dashboard zeigt dieselben Fragen als Karten. Schreib „entscheide du", dann wählt die Spielleitung. Alles lässt sich später ändern, im Chat oder unter **Einstellungen**.

| Einstellung | Was sie bestimmt | Werte |
|---|---|---|
| **Mentor** | Wie viel die Spielleitung dir über die Regeln beibringt | aus, Hinweise, Tutorial |
| **Schwierigkeit** | Wie hart die Welt spielt | Geschichte, leicht, normal, schwer, brutal |
| **Tödlichkeit** | Was es bedeutet, im Kampf zu fallen | erzählerisch (nie sterben), episch (nur wenn es zählt), Würfel |
| **Spielstände** | Wann du zurückgehen darfst | Permadeath, Checkpoint, frei ([3.8](#38-saves-and-going-back)) |
| **Strenge** | Wie genau Essen, Licht und Reisen den Regeln folgen | flüssig, Regeln, Simulation |
| **Würfel** | Wer deine Würfel wirft | digital, physisch |
| **Maßeinheiten** | Entfernungen und Gewichte | metrisch, imperial |
| **Stimmen der Charaktere** | Wer für die Charaktere spricht, denen du begegnest, von der Spielleitung bis zu den Charakteren selbst: immer die Spielleitung; in Schlüsselmomenten der Charakter selbst, der nur weiß, was er weiß, nach Ermessen der Spielleitung; oder immer der Charakter, für die wichtigen oder für alle, langsamer und teurer, wo deine KI-App das kann | die Spielleitung, manchmal, wichtige Charaktere, alle |
| **dein Charakter** | Wie dein Charakter in Session Zero erschaffen wird | mit der Spielleitung, von der Spielleitung, dein eigener ([2.7](#27-session-zero-your-character)) |
| **Begleiter** | Wer mit dir reist | keine, mit dir erschaffen, von der Spielleitung erschaffen, im Spiel getroffen |
| **Bilder** | Bilder von Orten, Quests und denen, die du triffst | keine, auf Wunsch, neue Orte, Quests und die, die du triffst ([3.11](#311-pictures)) |
| **Linien** und **Schleier** | Was nie vorkommt und was nur abseits der Bühne geschieht | Listen |
| **Sprache** | Die Sprache des Spiels und des Dashboards | beliebig |

Die fünfte Edition fügt den **Aufstieg** hinzu: Erfahrungspunkte oder Meilensteine.

Wenn es keine geschriebene Welt gibt, fragt die Spielleitung außerdem nach der **Ausgangslage** (Genre, Ton, ein paar Elemente und was dir an einem Spiel am meisten Spaß macht, etwa Kämpfe, Rätsel, Gespräche oder Erkunden, in deinen Worten), nach der **Vorbereitung**: die Welt unterwegs aufbauen, während ihr spielt, oder alles gleich am Anfang, und nach der **Länge**: ein Abend, ein paar Sitzungen (drei bis fünf Abende) oder offen, ein Abenteuer nach dem anderen. Am Ende einer Geschichte mit festgelegter Länge kannst du immer weiterspielen.

Der **Stil der Spielleitung** wird nie abgefragt, aber du kannst ihn im Chat oder unter **Einstellungen** ändern: den **Erzählstil** (schlicht, literarisch, Pulp, trocken-ironisch), die **Geschichten**, die die Spielleitung erfindet (Situationen, Handlungsbögen, Episoden, Rätsel), unter **Schreiben wie** eine Autorin oder einen Autor, deren Stil die Spielleitung folgt, oder alles andere **in deinen Worten**.

### 2.7 Session Zero: dein Charakter

Du erschaffst deinen Charakter gemeinsam mit der Spielleitung, wie an einem Spieltisch. Jede Entscheidung liegt bei dir, außer du bittest die Spielleitung, sie zu treffen: Komm mit einer fertigen Idee, einer vagen oder mit nichts. Oder bitte die Spielleitung, alles aus ein paar Worten zu erschaffen. In einem Spiel mit Stufen fragt die Spielleitung, mit welcher Stufe du beginnst: mit der ersten, außer du willst eine andere. Die Spielleitung sagt dir, wie die Attributswerte bestimmt werden, bevor ein Würfel fällt. Eine Hintergrundgeschichte ist nie Pflicht. Wenn du eine erzählst, schreibt die Spielleitung sie in deinen Worten auf. Danach bittet die Spielleitung dich um ein Bild deines Charakters ([3.7](#37-your-characters-story-and-picture)). RPG Engine berechnet den Charakterbogen: Du musst nie rechnen.

Hast du schon einen Charakter, aus einem anderen Spiel oder einer anderen Kampagne? Wähle bei der Einrichtung **ich habe schon eine** und gib ihn der Spielleitung: Füge den Charakterbogen in den Chat ein. Im eigenen Chat deiner KI-App kannst du auch sagen, wo seine Datei auf deinem Computer liegt (ein PDF, ein Bild, ein Text). Im Chat des Dashboards öffnet die Spielleitung keine Datei von dir. Die Spielleitung schreibt den Charakter so auf, wie er ist, auf seiner Stufe, prüft ihn an den Regeln und an der Welt und klärt mit dir alles, was nicht passt.

### 2.8 Der andere Weg: der eigene Chat deiner KI-App

Du kannst auch im Chat deiner KI-App selbst spielen, in einem Terminal oder in ihrer Desktop-App, mit dem Dashboard daneben. Dann legst du die Kampagne in einem Terminal an, in dem Ordner, in dem du deine Spiele aufbewahrst ([2.1](#21-what-you-need) sagt, wie), immer mit ihrem Namen: `rpg init "The Salt Isles"` erstellt den Ordner `The Salt Isles` mit einer neuen Kampagne darin. RPG Engine bereitet dort von selbst vor, was jede App braucht.

Starte deine App in diesem Ordner: `claude` für Claude Code, `codex` für Codex, `agy` für Antigravity, `opencode` für OpenCode. Oder öffne den Ordner in ihrer Desktop-App. Antworte mit Ja, wenn sie fragt, ob du dem Ordner vertraust. Vorsicht: In Claude Code ist die vorausgewählte Antwort *No, exit*. Jeder andere Agent, der MCP unterstützt, kann ebenfalls die Spielleitung sein: Starte ihn im Kampagnenordner und gib ihm den MCP-Server `rpg mcp`.

Schreibe *Hallo! Lass uns anfangen.* In ihrer ersten Antwort jedes Chats gibt dir die Spielleitung den **Link zu deinem Dashboard**, etwa `http://127.0.0.1:4750`: Öffne ihn neben dem Chat.

- Zwischen den Nachrichten der Spielleitung zeigt deine App die Werkzeuge, die sie benutzt. Öffne ihre Details nicht (in Claude Code mit Strg+O), denn sie können Geheimnisse zeigen.
- Die Kampagne schaltet den eigenen Speicher der App ab: Das Spiel lebt in seinen Dateien, damit die Rückkehr zu einem Spielstand wirklich zurückführt. Prüfe in der Desktop-App von Codex in den Einstellungen, dass die Erinnerungen für die Chats des Spiels ausgeschaltet sind.
- Wenn die Spielleitung sagt, dass sie die Werkzeuge von RPG Engine nicht finden kann, schreibe `rpg init` im Kampagnenordner und öffne dann einen neuen Chat.
- Eine Kampagne wird immer nur von einem Chat gespielt: Solange deiner offen ist, wartet der Chat des Dashboards.

---

## 3. Spielen <!-- icon: chat -->

### 3.1 Mit der Spielleitung sprechen

Schreib, was dein Charakter tut oder sagt, in deinen eigenen Worten:

> Ich frage die Wirtin, wer heute Nacht noch vorbeigekommen ist.

Außerhalb der Geschichte schreibst du `[OOC: …]` (out of character): *[OOC: Wie funktioniert das Ringen?]* Die Spielleitung antwortet genauso. Im Chat des Dashboards stehen ihre Worte außerhalb des Spiels abgesetzt und sind mit OOC markiert.

Schreibe im Chat des Dashboards in das Feld unten und drücke Enter zum Senden. Mit Umschalt+Enter beginnst du eine neue Zeile. Während die Spielleitung antwortet, hält **Stopp** sie an, und deine Worte warten im Feld. Wenn die Spielleitung dir eine Frage stellt, kommen ihre Schaltflächen mit der Frage, Würfe eingeschlossen: Klicke auf eine oder schreibe deine Antwort. Unter dem Feld siehst du die App und das Modell. Wo die App es erlaubt, klickst du auf das Modell, um es zu wechseln, sobald die Spielleitung geantwortet hat. **Chat schließen** beendet den Chat. Das Spiel bleibt in seinen Dateien.

Du sagst, was du versuchst. Die Spielleitung sagt, was passiert. Sie entscheidet nie für deinen Charakter und spricht nie über die Engine. Du kannst sie fragen, wie das Dashboard funktioniert.

**Vom Dashboard aus handeln**: Klick auf deinem Charakterbogen auf einen Namen, zum Beispiel eine Waffe, einen Zauber oder einen Gegenstand, den du trägst. Seine Karte sagt dir, was es ist. Ein Beutel öffnet sich mit seinem Pfeil, und sein ⓘ zeigt seine Karte. Wähle dann, was du damit tust. Wofür du niemanden brauchst, zum Beispiel **Ausrüsten**, bestätigst du auf derselben Schaltfläche, *Bestätigen: Ich rüste Schild aus*. Drück sie noch einmal, dann geht es an die Spielleitung. Was du jemandem antust, zum Beispiel **Angreifen**, fragt, wen: in der Liste oder mit einem Klick auf die Karte. Dann nennt die Schaltfläche den ganzen Satz, *Ich greife Kapuzenbandit 1 mit Streitkolben an*, und ein Klick schickt ihn ab. Um es auf deine eigene Art zu sagen, klick auf eine Person, mit der du sprechen willst, oder schreib im Chat. Die Spielleitung hört es, als hättest du es im Chat gesagt, entscheidet darüber wie bei jedem anderen Satz und fragt dich mit Schaltflächen, was du offengelassen hast. Hat deine KI-App keine Türklingel, liest die Spielleitung es, sobald du das nächste Mal im Chat schreibst. War der Chat vorher geschlossen, schickt **Nochmal sagen** es noch einmal.

### 3.2 Würfe

Die Spielleitung verlangt nur dann einen Wurf, wenn der Ausgang unsicher ist und etwas davon abhängt. Vorher sagt sie, was auf dem Spiel steht. Dann gilt:

- **Auf dem Dashboard** zeigt ein Banner für jede Probe eine Schaltfläche, zum Beispiel *Akrobatik +4 · mit Vorteil*. Klick darauf: Die Würfel fallen auf der Seite, und die Spielleitung hört das Ergebnis. Du kannst auch auf die Zeile deines Charakterbogens klicken, die aufleuchtet, die Würfel aus der Würfelschale werfen oder im Banner etwas anderes schreiben.
- **Von Hand**, in der Ecke des Banners oder in den **Einstellungen**: Das Banner sagt dir, was du würfeln musst, und du würfelst es von deinem Charakterbogen oder aus der Würfelschale.
- **Echte Würfel**, wenn die Würfel-Einstellung auf „physisch“ steht: Du schreibst die gewürfelten Augenzahlen, *[Ich habe eine 14 gewürfelt.]*, und RPG Engine rechnet deine Modifikatoren dazu.

**Freie Würfe**: Klick auf eine beliebige Zahl auf deinem Charakterbogen oder öffne die Würfelschale, um zum Spaß zu würfeln. Sie zählen nie, und die Spielleitung sieht sie nie.

**Die Würfe der Spielleitung** erscheinen in deiner Wurfspalte, außer den geheimen. Du kannst jederzeit fragen: *[War dieser Wurf echt?]* Bei einem geheimen Wurf gibt die Spielleitung einen Fingerabdruck, der beweist, dass er vor deiner Frage gemacht wurde.

### 3.3 Szenen und Kämpfe

Die Geschichte läuft in **Szenen**: ein Kampf, ein Gespräch, Erkunden, Reisen, eine Rast. Am Ende jeder Szene speichert das Spiel von selbst, die Szene kommt in dein Tagebuch, und wenn die Geschichte eine Wendung nimmt, schreibt die Spielleitung die Szenen seit dem letzten Kapitel als neues Kapitel im Buch deiner Geschichte.

In einem Kampf erzählt die Spielleitung jeden Zug, der nicht deiner ist, und hält an, wo du entscheiden kannst. Die **Szene** zeigt oben, wer am Zug ist und wer als Nächstes kommt, und daneben die Karte deines Charakters neben der Karte des Ortes. Die Reihenfolge der Züge, die Trefferpunkte deiner Gruppe und in Worten, wie verletzt die Gegner aussehen, bleiben neben der Seite stehen. Wenn dein Charakter fällt, erscheinen die Todesrettungswürfe groß auf der Seite.

**Dauerbefehle**: Sag deinen Begleitern etwas, das dauerhaft gelten soll, zum Beispiel *Ab jetzt lass immer einen am Leben*. Die Spielleitung behält es bei, bis du es aufhebst. Deine Begleiter befolgen es, soweit ihr Charakter es zulässt, und wenn einer es nicht täte, sagt er das. Du findest deine Befehle in den **Einstellungen**, wo du sie hinzufügen und entfernen kannst.

### 3.4 Zeit, Reisen und die Welt in Bewegung

RPG Engine führt das Datum. Zwischen den Sessions steht die Spielzeit still, es sei denn, du wählst in den **Einstellungen**, sie weiterlaufen zu lassen, zum Beispiel einen Spieltag für jede Woche Abwesenheit, oder du bittest die Spielleitung darum. Sag, dass ihr rastet, *Wir machen eine lange Rast*, und sobald die Spielleitung zustimmt, gibt die Rast zurück, was sie zurückgeben soll. Bei einer kurzen Rast kann die Spielleitung auf dem Dashboard fragen, wie viele Trefferwürfel du ausgibst: Würfle sie einzeln, sieh, was jeder heilt, und hör auf, wann du willst. Sag, wohin ihr geht, *Wir nehmen die Straße nach Norden Richtung Rocca*, und RPG Engine berechnet den Weg, die Entfernung und die Tage. Es hält an, wenn unterwegs etwas passiert. Geld wird in den Münzen des Spiels gezählt, Wechselgeld inklusive.

Schurken haben Pläne mit Fristen. Mit jedem neuen Tag bewegt die Spielleitung die Bedrohungen, die die Zeit vorangebracht hat. Du siehst ihre Zeichen, nie die Uhr selbst.

### 3.5 Karten

**Welt** zeigt die Orte, die dein Charakter kennt, die Straßen dazwischen und den Weg, den du gegangen bist. Der Rest liegt unter Nebel. **Szene** zeigt die Karte des Ortes, an dem du bist, wenn es eine gibt, und wer wo steht. In einem Kampf sind auf deinem Zug die Felder verhüllt, die du nicht erreichen kannst. Wenn die Spielleitung fragt, wohin du dich bewegst, tippe auf ein Feld oder schreib es, zum Beispiel *E4*.

**Welt** hält auch fest, was dein Charakter weiß. **Wissen** listet die Personen, Orte, Fraktionen, Kreaturen und Geschichten auf, die der Charakter kennt, jeweils so, wie der Charakter sie kennt. Du kannst darin suchen oder einen Eintrag öffnen, um ihn ganz zu lesen. Ein Name im Text führt zu seiner Seite. **Dokumente** bewahrt die Briefe, Aushänge und Seiten auf, die dein Charakter gefunden hat, damit du sie noch einmal lesen kannst. Der **Kalender** zeigt den heutigen Tag, die Fristen deiner Quests mit der verbleibenden Zeit und die Tage der Geschichte: Ein Tag mit Szenen führt zu diesen Szenen in der Zeitleiste des Tagebuchs.

### 3.6 Quests, Tagebuch und Notizen

Eine Aufgabe, die dein Charakter übernimmt, wird im **Tagebuch** zu einer Quest, mit ihren Zielen, ihrer Frist und dem, was sie misst. Markier sie mit einem Stern, um sie oben in der Szene im Blick zu behalten. Unter **Geschichte** erzählt das Tagebuch deine Geschichte wie ein Buch: Jedes Mal, wenn die Geschichte eine Wendung nimmt, schreibt die Spielleitung ein Kapitel in Prosa, das die Szenen seit dem letzten Kapitel erzählt, in dem Stil, den du gewählt hast. Du liest es Kapitel für Kapitel, das letzte ist durch sein Lesezeichen markiert, und kannst es als Markdown oder als Webseite herunterladen, zum Drucken oder Weitergeben. Wenn du ein Spiel schon vorher begonnen hast, bitte die Spielleitung, die Geschichte bis jetzt zu schreiben. Die **Zeitleiste** listet die Szenen nummeriert auf, mit dem, was in jeder passiert ist. Das Tagebuch bewahrt auch deine **Notizen** auf: Sie sind privat, es sei denn, du klickst bei einer auf **Teilen**. Die Spielleitung hört sie dann als das, was du denkst, nie als Tatsache. Unter **Begleiter** liest du die Tagebücher deiner Begleiter: Hin und wieder, am Ende eines Tages oder einer Quest, schreiben sie ein paar Zeilen darüber, was sie denken und fühlen.

### 3.7 Die Geschichte und das Bild deines Charakters

Auf deinem Charakterbogen hat die Karte **Beschreibung** ein Feld für die Geschichte deines Charakters: Die Spielleitung schreibt sie dort ein, nachdem du Ja gesagt hast. Für ein Bild gib der Spielleitung eine Datei (PNG, JPEG, WebP oder SVG, bis zu 5 MB) und sag, wo sie auf deinem Computer liegt. Oder lass ein Porträt erstellen ([3.11](#311-pictures)): *[Mach mir ein Porträt: graues Haar in einem Zopf, eine Narbe am Kinn.]*

### 3.8 Spielstände und Zurückgehen

RPG Engine speichert die ganze Kampagne am Ende jeder Szene. Die Einstellung **Spielstände** entscheidet über den Rest:

| Spielstände | Speichern, wann du willst | Zurückgehen |
|---|---|---|
| **permadeath** | nein | nie |
| **checkpoint** | nein | zum letzten Spielstand, nur wenn dein Charakter stirbt |
| **frei** | ja | zu jedem Spielstand |

In jedem Modus kannst du **neu anfangen**, vom Beginn des Spiels oder von Session Zero an. Mach das im Chat oder unter **Spielstände**.

Öffne nach dem Zurückgehen **einen neuen Chat**: Der alte erinnert sich an das, was rückgängig gemacht wurde. Drücke im Chat des Dashboards auf **Chat schließen**, dann auf **Neuer Chat**. Öffne im eigenen Chat deiner KI-App eine neue Unterhaltung (`/clear` in Claude Code). Schreibe im neuen Chat *weiter*. Sag dann der Spielleitung, dass der Chat neu ist: Drücke unter **Spielstände** auf **Ich habe einen neuen Chat geöffnet** oder sag es im Chat. Bis dahin macht die Spielleitung nicht weiter.

Wenn du nicht weißt, was Git ist, überspringe diesen Absatz. Ist der Ordner der Kampagne ein Git-Repository, gibt es in den **Einstellungen** einen Abschnitt **Git**. Alles ist ausgeschaltet, bis du etwas wählst: ein Commit zu Beginn jeder Session, bei jedem Spielstand und am Ende jeder Szene, und danach auf Wunsch ein Push. Ein Commit ist eine Momentaufnahme der Kampagne zu diesem Zeitpunkt. Ein Push schickt die Momentaufnahmen an das Repository im Internet, zum Beispiel auf GitHub, damit eine Kopie außerhalb dieses Computers liegt. Die Spielstände und deine Chats mit der Spielleitung bleiben außerhalb des Repositorys, es sei denn, du lässt sie hinein. Lass die Chats nur hinein, wenn das Repository privat ist.

### 3.9 Sessions: aufhören und zurückkommen

Hör auf, wann du willst: *[Lass uns für heute Abend hier aufhören.]* Alles ist schon in den Dateien gespeichert. Um zurückzukommen, öffne RPG Engine über sein Symbol und klicke auf deine Kampagne. Hast du den Chat offen gelassen, kommt er von selbst zurück. Hast du ihn geschlossen, drücke auf **Chat fortsetzen**. Drücke dann auf **Geschichte fortsetzen**: Die Spielleitung sagt dir in ein paar Zeilen, wo du warst, und macht weiter. Wurde das Spiel geschlossen, während die Spielleitung noch antwortete oder eine Frage von ihr auf dich wartete, steht auf dieser Schaltfläche stattdessen **Hier weitermachen**. **Neuer Chat** öffnet einen frischen Chat zum selben Spiel. Starte im eigenen Chat deiner KI-App den Chat im Kampagnenordner und schreibe *weiter*.

### 3.10 Die Stimmung der Spielleitung

Der Roboter oben im Dashboard ist die Spielleitung: Sein Gesicht folgt dem Ton der Geschichte und verrät nie, was du noch nicht weißt. Wenn das Dashboard nicht mit dem Spiel verbunden ist, schläft er.

### 3.11 Bilder

RPG Engine kann Bilder von den Orten erstellen lassen, die du erreichst, von den Quests, die du übernimmst, und von denen, die du triffst, so wie es die Einstellung **Bilder** festlegt. Auf Wunsch entsteht auch das Porträt deines Charakters. Deine eigene KI-App erstellt sie mit ihren eigenen Mitteln, mit deinem Login, in deinem Tarif und mit dessen Grenzen: **Claude** zeichnet sie als Vektorbilder, **Codex** und **Antigravity** malen sie, **OpenCode** zeichnet im Chat einfache Vektorbilder. Unter **Einstellungen > Kampagne > Bilder** kannst du Codex oder Antigravity die Bilder auch dann malen lassen, wenn deine Spielleitung eine andere App ist. Wo die gewählte App es nicht kann, erstellt dein Chat sie. Die **Einstellungen** sagen, ob dieser Computer sie erstellen kann und wie du es einrichtest, wenn nicht. Du kannst jederzeit ein eigenes Bild geben, für deinen Charakter oder für jede Seite, die du siehst: Fahr mit dem Mauszeiger über eines ihrer Bilder, dann erscheint in dessen Ecke eine kleine Bild-Schaltfläche (auch mit der Tastatur, und auf dem Handy immer). In **Welt** hat die Seite, die du öffnest, außerdem **Bild ändern…**, oder **Bild hinzufügen…**, solange sie noch keines hat. Wenn du den Mauszeiger über einem Bild hast oder seine Schaltfläche fokussiert ist, kannst du auch ein kopiertes Bild einfügen, mit Strg+V (⌘V auf dem Mac). Dein Bild ersetzt das vorhandene. Oder leg die Datei im Ordner **inbox** der Kampagne ab und sag der Spielleitung, für welche Seite sie gedacht ist.

### 3.12 Sicherheit: Linien, Schleier und Stopp

**Linien** erscheinen nie im Spiel, **Schleier** geschehen nur abseits der Bühne. Schreib jederzeit *[stopp]*: Die Spielleitung lässt diesen Inhalt sofort fallen und fügt ihn deinen Linien hinzu.

### 3.13 Es sich anders überlegen

Jede Einstellung lässt sich ändern, im Chat oder in den **Einstellungen**. Eine Entscheidung, die die Spielleitung ohne Regelbuch trifft, wird zu einem **Präzedenzfall**, damit dieselbe Frage das nächste Mal dieselbe Antwort bekommt.

---

## 4. Das Dashboard <!-- icon: party -->

Eine Seite auf deinem eigenen Computer, in einem eigenen Fenster, nur auf diesem Computer zu öffnen. Sie ist live, solange ihr Fenster offen ist, mit oder ohne Chat. Etwa dreißig Sekunden nachdem du es schließt, endet das Spiel und mit ihm der Chat. Nichts geht verloren: Alles liegt in den Dateien. Im eigenen Chat deiner KI-App ist die Seite live, solange dieser Chat offen ist. Ist das Spiel nicht mehr da, zeigt die Seite *Nicht verbunden*: Drücke auf **Kampagne erneut öffnen** oder öffne in deiner eigenen App den nächsten Chat. Die Schaltfläche **Kampagnen** mit dem Haus führt zurück zu all deinen Kampagnen.

- **Rollenspiel**: der Chat mit der Spielleitung, wenn er nicht neben der Seite steht ([2.5](#25-the-first-chat)).
- **Gruppe**: dein Charakterbogen und die deiner Begleiter. Klicke auf eine Zahl, um sie zu würfeln. Fahre mit der Maus darüber, um zu sehen, woher sie kommt und, wenn ein Pfeil den Würfel markiert, was den Wurf besser oder schlechter macht. Wenn die Spielleitung Auswahlmöglichkeiten für dich vorbereitet, etwa bei einer neuen Stufe, öffnet ein Hinweis auf dem Charakterbogen sie. Wähle, wann du magst, lies die Seiten, die die Optionen nennen, würfle, wo eine Option einen Wurf verlangt, und bestätige dann. Die Geschichte geht in der Zwischenzeit weiter. Daneben stehen die Würfe.
- **Szene**: wo du bist, mit Bild und Karte, wer da ist und was gerade passiert. Im Kampf siehst du die Züge und die Karte deines Charakters.
- **Tagebuch**: Quests, die Geschichte als Buch, ihre Zeitleiste, die Tagebücher deiner Begleiter und deine Notizen.
- **Welt**: die Weltkarte, was dein Charakter weiß, die gefundenen Dokumente und der Kalender.
- **Die Würfelschale**: Wähle Würfel und einen Modifikator und wirf. ×2 verdoppelt die Würfel, nie den Modifikator, wie bei einem kritischen Treffer.
- **Spielstände**, **Hilfe**, **Einstellungen** und **Info** stehen als Symbole am Ende der Zeile. Die Einstellungen enthalten unter **Dashboard** auch die eigenen Vorlieben der Seite: Modus, Würfelsound, Würfelset und das **Design**, also die Farben, Gesichter und Bilder der Seite. Du kannst das Design des Spielsystems wählen, ein Design, das du unter Packages › Add hinzugefügt hast (aus dem Katalog, per GitHub-Link, als .zip oder als Ordner), oder das eigene der Seite. Wenn das eigene Stylesheet eines Designs die Seite schwer lesbar macht, schalte dort **Eigener Stil des Themes** aus. Die Einstellungen erscheinen immer ohne diesen Stil, unter der Adresse der Seite mit `#/settings/page` am Ende.

Wenn die Spielleitung dir eine Frage stellt, bleibt ihr Banner oben stehen, in welchem Bereich du auch bist.

---

## 5. Spielsysteme und Hausregeln <!-- icon: dice -->

### 5.1 Was ein Spielsystem ist

Die Daten eines Spiels: sein Charakterbogen, seine Zahlen, seine Kreaturen, Gegenstände, Zauber und Regeltexte. Jede Kampagne spielt ein System. RPG Engine berechnet den Charakterbogen und was verbraucht wird und wieder zurückkommt. Wie eine Fähigkeit funktioniert, liest die Spielleitung in den Regeln und entscheidet es, wie an einem echten Spieltisch.

### 5.2 Fünfte Edition

Die Völker, Klassen, Unterklassen, ein Hintergrund und ein Talent aus dem SRD 5.1; die 319 Zauber, die Waffen, Rüstungen, magischen Gegenstände und Monster; die Regelkapitel, die die Spielleitung nach ihrem genauen Wortlaut liest; der vollständige, berechnete Charakterbogen.

Es ist ein eigenes Paket: Die Spielleitung bietet es dir an, wenn du eine Kampagne einrichtest, und installiert es. Eine Kampagne, die dieses System spielt, installiert es von selbst, wenn sie zum ersten Mal auf einem Computer geöffnet wird, auf dem es fehlt. Die Spielleitung sagt dir dann Bescheid.

Du kannst auch Inhalte spielen, die im SRD fehlen, aus einem Buch, das du besitzt: Die Spielleitung schreibt sie als Seiten deiner Kampagne, und RPG Engine behandelt sie wie eigene. RPG Engine liefert nur offene Inhalte mit; was deine Spielleitung weiß, ist nicht begrenzt.

Deine eigenen Regelbücher können deine Bibliothek sein: Sag der Spielleitung, wo sie liegen, *[Meine Regelbücher liegen in D:\Books\5e.]*, oder füge ihren Ordner unter Pakete › Bibliothek hinzu und sag einmal ja in dem Fenster, das dein Computer zeigt. RPG Engine liest sie auf diesem Computer. Jede Kampagne nutzt die Ordner, die du dort einschaltest. Die Spielleitung durchsucht sie, wenn sie eine Regel entscheidet, nach dem SRD und nennt dabei Buch und Seite. Am besten lassen sie sich als Text lesen oder als PDFs, deren Text sich markieren lässt. Ein gescanntes PDF wird anhand der Bilder seiner Seiten gelesen, nur unter Windows, in einigen Minuten und mit ein paar Fehlern. RPG Engine verändert deine Regelbücher nie, schickt ihren Text nie irgendwohin und kopiert ihn nie in eine Kampagne.

### 5.3 Hausregeln und eigene Ergänzungen

Frag die Spielleitung: *[Hausregel: Eine natürliche 1 bei einem Angriff bedeutet, dass du deine Waffe fallen lässt.]* Sie hält sie als Absprache der Runde fest oder schreibt eine Seite oder eine Zahl des Charakterbogens, wenn das nötig ist. Hausregeln, die schon ausgeschrieben sind, können als Textdateien im Ordner `rules` der Kampagne liegen.

Wenn die Spielleitung für deine Kampagne eine Seite des Spielsystems ändert, etwa die Trefferpunkte einer Kreatur oder die Reichweite eines Zaubers, markiert das Dashboard sie überall, wo sie erscheint, mit einem kleinen Sternchen hinter ihrem Namen. Unter Pakete › Installiert siehst du, was sich geändert hat. Die Liste steht unter dem Spielsystem, neben dem, was das System mitgegeben hat. Eine Kreatur, die dein Charakter nicht kennt, steht dort nur mit ihrem Namen. Dort kannst du eine Seite so zurücksetzen, wie das System sie schreibt, sobald die Szene, die gerade gespielt wird, vorbei ist. Das Dashboard kann die Änderung nicht rückgängig machen. Nur die Spielleitung kann sie noch einmal schreiben.

### 5.4 Ein eigenes Spielsystem hinzufügen oder importieren

Ein Spielsystem ist ein Paket: Die Spielleitung installiert eines aus npm, aus einem Ordner oder aus einer Datei. Eines, das nicht von uns stammt, installiert sie nur mit deinem Ja, in einem Formular deines Agenten oder in einem Fenster deines Computers. Ein Paket zu erstellen ist Arbeit für Entwickler und steht in den Dokumenten von RPG Engine auf GitHub. Ein eigenes Buch in ein Spielsystem zu verwandeln, geht noch nicht ([Kommt später](#9-coming-later)).

---

## 6. Erweiterungen <!-- icon: plus -->

Eine Erweiterung ergänzt eine Kampagne um etwas, das über das Spielsystem hinausgeht: zum Beispiel das Wetter, das sich bei jedem Morgengrauen ändert, oder Schlösserknacken mit Würfeln. Füge eine unter Pakete › Hinzufügen hinzu. Du wählst sie aus der Liste oder gibst ihren Namen auf npm an, einen Ordner oder eine Datei. Eine Erweiterung, die nicht von uns stammt, bringt Code mit. Sie kommt nur mit deinem Ja, in einem Fenster deines Computers. Ist eine Erweiterung für ein anderes Spielsystem gemacht, sagt sie dir, für welches. Dann wird sie nicht hinzugefügt. Unter Pakete › Installiert aktualisierst du eine Erweiterung oder entfernst sie. Die Spielleitung kann auch eine hinzufügen, wenn du sie darum bittest.

---

## 7. Woher eine Kampagne kommt, und ihre Sprache <!-- icon: world -->

### 7.1 Drei Wege zu einer Welt

- **Unterwegs aufgebaut**: Aus deiner Prämisse baut die Spielleitung jeden Ort, jede Person und jeden Plot kurz bevor du sie brauchst, und behält sie.
- **Am Anfang vorbereitet**: dasselbe, nur wird die Welt vor dem Spiel aufgebaut.
- **Aus deinem eigenen Abenteuer oder Buch**: Gib der Spielleitung die Datei, *[Importiere dieses Abenteuer als unsere Kampagne: D:\Books\adventure.pdf. Verrate mir nichts von dem, was darin steht.]* Eine Datei außerhalb der Kampagne wird erst gelesen, nachdem du in einem Fenster deines Computers Ja gesagt hast. Eine Datei im Ordner **inbox** der Kampagne wird sofort gelesen. Am besten liest sie sich als Text, als EPUB, als Word-Dokument oder als PDF, dessen Text sich markieren lässt. Ein eingescanntes PDF wird aus den Bildern seiner Seiten gelesen, nur unter Windows, langsam und mit ein paar Fehlern. Deine eigene KI-App liest sie außerhalb des Chats, oder sonst die Spielleitung im Chat, in deinem Tarif: In Claude Code oder Codex liest eines der beiden, in Antigravity dein Antigravity, in OpenCode das Modell, das du zuletzt darin gewählt hast. Das ganze Dokument geht an den Hersteller dessen, was es liest, unter den Bedingungen deines Kontos und seiner Wahl zum Training. Das Dashboard zeigt, wie weit es ist. Bei einem Roman schlägt die Spielleitung vor, wo man beginnt. Sie schreibt die Orte, die Charaktere und die Geheimnisse.

Eine Kampagne wird einmal gespielt: Um dasselbe Abenteuer noch einmal zu spielen, erstelle eine neue Kampagne.

### 7.2 Sprachen

Eine Sprache pro Kampagne, die der Spielleitung, der das Dashboard folgt. Das Dashboard kommt in 26 Sprachen. Jede andere wird auf deinem Computer von deiner eigenen KI-App außerhalb des Chats übersetzt (Codex oder Claude Code; in Antigravity und OpenCode jeweils ihre eigene) oder, wenn keine das kann, von der Spielleitung im Chat. Die Begriffe der fünften Edition auf Italienisch stammen aus dem offiziellen italienischen SRD. Der Regeltext bleibt auf Englisch, und die Spielleitung erzählt ihn in deiner Sprache.

---

## 8. Für Neugierige: der Kampagnenordner <!-- icon: list -->

Du musst ihn nie öffnen, und er enthält die Geheimnisse deiner Kampagne. Er enthält `campaign.yaml` (deine Einstellungen), `state.yaml` (der Stand des Spiels), `world/` (eine Markdown-Seite für jeden Charakter, jeden Ort, jede Quest und alles Weitere), `rules/` (deine Hausregeln), `images/`, `log.jsonl` (jede Änderung), `sessions/` (deine Chats mit der Spielleitung als Text, aus Claude Code und Codex), `.saves/`, `.player/` (deine Notizen) und die kleinen Dateien, die KI-Agenten sagen, wo RPG Engine liegt. Die Seiten verwenden das Format von Obsidian. Wenn du eine Seite von Hand änderst, erfährt die Spielleitung bei ihrer nächsten Antwort davon.

RPG Engine bleibt in diesem Ordner: Es liest und schreibt das Spiel nur hier und berührt nie deine anderen Dateien. Die Ordner deiner Regelbücher liest es nur. Außerhalb davon legt es nur eigene Datenordner an (die Übersetzungen des Dashboards, den Text, den es aus deinen Regelbüchern gelesen hat, und Codex oder Claude Code, falls du die Installation erlaubst) sowie temporäre Ordner, während ein Bild gezeichnet wird. Alles andere, was dein Agent auf deinem Computer tun will, fragt er vorher bei dir an. Ein Spielsystem oder eine Erweiterung ist Code, wie jedes npm-Paket: Eines, das nicht von uns stammt, läuft mit deinen Berechtigungen auf deinem Computer, und RPG Engine installiert es nur mit deinem Ja, in einem Formular deines Agenten oder in einem Fenster deines Computers. Sag nur zu Paketen ja, deren Autorinnen und Autoren du vertraust.

Jeden Befehl, den die Spielleitung benutzt, kannst du auch im Kampagnenordner ausführen: `rpg --help` listet sie auf. Viele geben die Geheimnisse der Kampagne aus.

---

## 9. Das kommt später <!-- icon: hourglass -->

- **Du als Spielleitung**, während die KI die Gruppe spielt.
- **Autorenmodus**: Schreibe mit der KI ein Abenteuer, exportiere es und teile es.
- **Mehrere Spielende am selben Computer**, jeweils mit eigenem Charakter, die sich im selben Chat abwechseln.
- **Mehr Erweiterungen**: Welten, Funktionen und Hausregeln zum Teilen.
- **Andere Spiele**: mehr Spielsysteme und deine eigenen.

---

## 10. Fragen und Probleme <!-- icon: info -->

### Fragen

**Muss ich die Regeln kennen?** Nein. Wähle den Mentor Tutorial und frag mit `[OOC: …]`, wann immer du willst.

**Kann die Spielleitung schummeln?** Sie kann einen Wurf, den RPG Engine gemacht hat, nicht ändern, außer bei der Schwierigkeit Story, und auch keine Fakten, die schon feststehen.

**Kostet es etwas?** RPG Engine ist kostenlos. Die Spielleitung läuft im Tarif deiner KI-App oder auf deinem eigenen Computer mit einem lokalen Modell. Ein Spielabend ist ein langer Chat: In den kleinsten Tarifen kann es sein, dass du die Grenze des Tarifs erreichst, bevor der Abend vorbei ist. Bilder, Übersetzungen und Importe nutzen denselben Tarif. RPG Engine selbst nutzt nie einen API-Schlüssel, der pro Aufruf bezahlt wird: Melde deine KI-App mit deinem Konto an, nicht mit einem Schlüssel.

**Kann ich am Handy spielen?** Nein: Die Spielleitung läuft auf deinem Computer, und das Dashboard öffnet sich nur dort.

**Kann ich mit Freunden spielen?** Noch nicht: Heute gibt es eine Person, einen Charakter, dazu Begleiter ([Coming later](#9-coming-later)).

**Kann ich nächstes Mal eine andere KI nutzen?** Ja: Wähle im Chat eine andere App, bevor du ihn öffnest, oder öffne die Kampagne in einer anderen App und schreibe *weiter*.

### Probleme

**Eine Kampagne öffnet sich nicht.** Öffne RPG Engine noch einmal über sein Symbol oder mit `rpg open` in einem Terminal und klicke auf die Kampagne. Wenn ihr Dashboard *Nicht verbunden* zeigt, drücke auf **Kampagne erneut öffnen**. Eine Karte mit dem Vermerk **Ordner nicht gefunden** hat ihren Ordner verloren: Nimm sie von der Liste und füge sie mit **Ordner öffnen…** dort, wo er jetzt liegt, wieder hinzu. Im eigenen Chat deiner KI-App funktioniert das Dashboard nur, solange ein Chat dieser Kampagne offen ist: Frage die Spielleitung `[OOC: Wie lautet der Link zum Dashboard?]`. In der Claude App schläft ein Chat, der eine Weile im Hintergrund bleibt, und mit ihm die Seite: Klicke auf den Chat, dann kommt die Seite unter derselben Adresse zurück.

**Die Spielleitung scheint das Spiel nicht zu kennen.** Das passiert im eigenen Chat deiner KI-App: Sie hat RPG Engine nicht geladen. Prüfe, ob du sie im Kampagnenordner gestartet und dem Ordner vertraut hast. Schreibe in Claude Code `/mcp` und verbinde `rpg` neu. In Codex muss `codex mcp list` im Kampagnenordner `rpg` anzeigen. Wenn `rpg --version` nicht gefunden wird, installiere RPG Engine neu ([2.2](#22-install)).

**Windows findet `claude` nicht.** Das passiert, wenn du Claude Code selbst installiert hast. Der Installer weist in einem gelben Hinweis darauf hin und nennt den Ordner, in den er installiert hat. Füge diesen Ordner zum PATH hinzu (Systemeigenschaften > Umgebungsvariablen) und öffne dann ein neues Terminal.

**Aktualisieren.** Wenn es ein neueres RPG Engine gibt, sagt das Dashboard es: Unter Packages › Installed steht RPG Engine zuerst, mit **Aktualisieren**. Tu dann, was die Seite dir sagt. Oder führe in einem Terminal `npm install -g rpg-engine` noch einmal aus und öffne dann einen neuen Chat: Die laufende Spielleitung behält die Version, mit der sie gestartet ist.

**Die Spielleitung erinnert sich an etwas, das ich rückgängig gemacht habe.** Öffne einen neuen Chat und drück unter Spielstände auf **Ich habe einen neuen Chat geöffnet**.

**Eine App lässt sich nicht installieren.** Die Seite sagt, warum: Drücke auf **Erneut versuchen**. Oder installiere sie selbst von der Website ihres Herstellers und drücke dann auf **Erneut prüfen**.

**Die Anmeldeseite öffnet sich nicht im Browser.** Solange die Seite auf dich wartet, drücke auf **Anmeldeseite erneut öffnen**, wo es angezeigt wird, oder auf **Abbrechen** und versuche es noch einmal.

**Der Chat des Dashboards sagt, dass ein anderer Chat spielt.** Ein Chat, den du selbst in deiner KI-App geöffnet hast, spielt diese Kampagne: Mach dort weiter oder schließe ihn, um im Dashboard zu spielen.

**Es erscheinen keine Bilder.** Unter Einstellungen > Kampagne > Bilder steht, ob dieser Computer sie erzeugen kann, und wie.

**Die Installation schlägt fehl, oder `rpg` startet nicht.** `node --version` muss 24 oder neuer anzeigen. Wenn Windows meldet, dass das Ausführen von Skripten deaktiviert ist, siehe [2.1](#21-what-you-need). Halte RPG Engine und deine Kampagnen unter Windows aus Pfaden heraus, die `&` enthalten.

**Der Link zum Dashboard hat sich geändert.** Im eigenen Chat deiner KI-App hat jede Kampagne ihre eigene Adresse, Chat für Chat dieselbe. Sie ändert sich nur, wenn ein anderes Programm sie schon belegt: Die Spielleitung gibt dir den neuen Link, und ab dann bleibt er. Ein zweiter Chat derselben Kampagne zeigt die Seite unter derselben Adresse und übernimmt sie, sobald du den ersten schließt.
