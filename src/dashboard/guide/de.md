<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: der komplette Leitfaden

**RPG Engine** lässt dich ein Pen-&-Paper-Rollenspiel mit einer **KI als Spielleitung** spielen. Du spielst im **Dashboard**, einem Fenster auf deinem Computer mit deinem Charakterbogen, den Würfeln, den Karten, deinem Tagebuch und dem **Chat** mit der Spielleitung.

Dieser Leitfaden erklärt dir, wie du spielst. Die Seite erklärt ihre Schaltflächen selbst: Halte den Mauszeiger auf eine, um zu sehen, was sie tut.

## Schnellstart <!-- icon: send -->

1. Installiere **Node.js** von [nodejs.org](https://nodejs.org) (die LTS-Version).
2. Öffne ein neues Terminal und schreibe `npm install -g rpg-engine`. Wenn Windows meldet, dass das Ausführen von Skripten deaktiviert ist, schreibe `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, antworte mit Ja und versuche es noch einmal.
3. Schreibe `rpg open` und drücke Enter, wenn es dir das Symbol auf deinem Desktop anbietet ([2.2](#22-installing)). Ab dann startest du RPG Engine über das Symbol.
4. Drücke auf **Neue Kampagne**, gib ihr einen Namen und drücke auf **Erstellen** ([2.3](#23-a-new-campaign)).
5. Wähle im Chat deine KI-App und ihr Modell ([2.4](#24-connect-your-ai)): Claude Code braucht einen bezahlten Claude-Tarif, Codex ein ChatGPT-Konto, kostenlos oder bezahlt. Drücke auf **Chat öffnen**, dann auf **Beginnen**.

Die erste Antwort kann ein paar Minuten dauern. Dann fragt die Spielleitung, wie du spielen möchtest, und ihr erschafft gemeinsam deinen Charakter.

## 1. Was RPG Engine ist <!-- icon: about -->

| Wer | Was sie tun |
|---|---|
| **Du** | Du spielst deinen Charakter: was er tut, sagt und versucht. |
| **Die Spielleitung** (die KI) | Erzählt die Geschichte, spielt alle anderen, entscheidet, was passiert, und verlangt Würfe. |
| **RPG Engine** | Hält die Welt in Dateien fest, würfelt, zählt Trefferpunkte, Geld, Zeit und Entfernungen und bewahrt Geheimnisse, bis du sie entdeckst. |

So bleibt die Welt von einem Abend zum nächsten gleich, auch in einem neuen Chat, auch mit einer anderen KI:

- **Was gesagt wurde, bleibt wahr.** Ein toter Schurke bleibt tot.
- **Die Würfel sind echt.** Die Spielleitung kann sie nicht ändern, außer bei der leichtesten Schwierigkeit.
- **Geheimnisse bleiben geheim.** Die Spielleitung verrät dir nie, was dein Charakter nicht weiß.
- **Die Welt bewegt sich.** Bedrohungen rücken vor, während ihr rastet oder reist.
- **Eine Kampagne ist ein Ordner** auf deinem Computer: Hör auf, wann du willst, und mach später weiter.

Ein Spiel kommt als Spielsystem: Heute ist unseres die **fünfte Edition** aus dem freien System Reference Document 5.1. Ohne Spielsystem spielst du frei, eine Geschichte ohne Zahlen.

---

## 2. Erste Schritte <!-- icon: path -->

### 2.1 Was du brauchst

- Ein Computer mit Windows, macOS oder Linux.
- **Node.js 24** oder neuer, von [nodejs.org](https://nodejs.org).
- Ein **Terminal**, nur zum Installieren: unter Windows Terminal oder PowerShell, unter macOS Terminal.
- Eine **KI-App** für die Spielleitung, mit deinem eigenen Konto ([2.4](#24-connect-your-ai)).

### 2.2 Installieren

```text
npm install -g rpg-engine
rpg open
```

Die erste Zeile installiert RPG Engine. Wenn npm anbietet, sich selbst zu aktualisieren, kannst du das ignorieren.

`rpg open` öffnet das Fenster von RPG Engine. Beim ersten Mal bietet es ein Symbol auf deinem Desktop und in deinem Menü an: Drücke Enter für Ja. Ab dann startest du über das Symbol.

Wenn die Installation fehlschlägt, prüfe, dass `node --version` 24 oder mehr anzeigt. Wenn Windows meldet, dass das Ausführen von Skripten deaktiviert ist, schreibe `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` und antworte mit Ja. Lege RPG Engine und deine Kampagnen unter Windows nicht in Pfaden ab, die `&` enthalten.

### 2.3 Eine neue Kampagne

Drücke auf **Neue Kampagne** und gib ihr einen **Name**n, eine **Sprache** und ein **Spielsystem**. Den Rest erschafft die Spielleitung mit dir. Drücke auf **Erstellen**: Die Kampagne öffnet sich in einem eigenen Fenster.

Die Spielleitung und das Dashboard sprechen die Sprache der Kampagne. Der Regeltext der fünften Edition bleibt auf Englisch, und die Spielleitung erzählt ihn in deiner Sprache.

Die Kampagne ist ein Ordner mit ihrem Namen, im Ordner `RPG Engine` deines Benutzerordners. Beim nächsten Mal klickst du auf ihre Karte.

### 2.4 Deine KI verbinden

Die Spielleitung läuft in einer **KI-App** auf deinem Computer, mit deinem Konto. Ein Web-Chat wie claude.ai oder ChatGPT reicht nicht: Die Spielleitung muss die Dateien der Kampagne erreichen können.

- **Claude Code**: ein bezahlter Claude-Tarif (Pro oder höher).
- **Codex**: ein ChatGPT-Konto, kostenlos oder bezahlt.
- **OpenCode**: kein Konto; zeitweise einige kostenlose Modelle oder die deines eigenen Anbieters, auch lokale.
- **Antigravity**: ein Google-Konto; die kostenlose Nutzung hat Wochenlimits.

Wähle im Chat die App, ihr **Modell** und die **Überlegungen der Spielleitung**. Fehlt die App oder bist du nicht angemeldet, installiert eine Schaltfläche sie, meldet dich an oder öffnet ihre Website. RPG Engine sieht nie dein Passwort.

Ein Spielabend ist ein langer Chat: Bei den kleinsten Tarifen kannst du das Limit erreichen, bevor der Abend zu Ende ist. Spiele mit dem größten Modell, das du hast: Ein kleines lässt sich leichter dazu bringen, Geheimnisse zu verraten.

Wir spielen und testen RPG Engine am meisten mit **Claude Code**. Antigravity ist **in der Testphase**: Es kann aus dem Spiel aussteigen, und es behält deine Chats in einem Speicher, den du nicht ausschalten kannst. Was du dort schreibst, geht an Google, wo es unter Umständen von Menschen gelesen wird. RPG Engine ist kein Produkt von Google.

### 2.5 Der erste Chat

Drücke auf **Chat öffnen**, dann auf **Beginnen**. Die erste Antwort kann ein paar Minuten dauern. Dann durchläuft eine neue Kampagne drei Schritte:

1. **Einstellungen**: Die Spielleitung fragt, wie du spielen möchtest, ein paar Fragen auf einmal: wie hart die Welt ist, ob du sterben kannst, wann du zu einem Spielstand zurückgehen darfst. Schreibe *Du entscheidest*, damit die Spielleitung wählt. Alles lässt sich später ändern.
2. **Session Zero**: Du erschaffst deinen Charakter mit der Spielleitung, wie an einem Spieltisch. RPG Engine rechnet den Charakterbogen aus. Hast du schon einen Charakter, füge seinen Charakterbogen in den Chat ein.
3. **Spiel**: Die Spielleitung eröffnet die erste Szene.

### 2.6 In deiner KI-App spielen

Du kannst auch im eigenen Chat deiner KI-App spielen, in einem Terminal oder in ihrer Desktop-App, mit dem Dashboard daneben.

1. Öffne ein Terminal in dem Ordner, in dem du deine Spiele aufbewahrst: Klicke den Ordner mit der rechten Maustaste an und wähle **Im Terminal öffnen** (Windows) oder **Dienste > Neues Terminal beim Ordner** (macOS).
2. Schreibe `rpg init "The Salt Isles"`: Es erstellt den Ordner `The Salt Isles` mit einer neuen Kampagne darin.
3. Starte deine App in diesem Ordner: `claude`, `codex`, `agy` für Antigravity oder `opencode`. Antworte mit Ja, wenn sie fragt, ob du dem Ordner vertraust: In Claude Code ist die vorausgewählte Antwort *No, exit*.
4. Schreibe *Hallo! Lass uns anfangen.* Die Spielleitung gibt dir den Link zu deinem Dashboard: Öffne ihn neben dem Chat.

Gut zu wissen:

- Öffne nicht die Details der Werkzeuge, die deine App benutzt (in Claude Code mit Strg+O): Sie können Geheimnisse zeigen.
- Schalte in der Desktop-App von Codex die Erinnerungen für die Chats des Spiels aus.
- Wenn die Spielleitung das Spiel nicht kennt, schreibe `rpg init` im Kampagnenordner und öffne einen neuen Chat.
- Wenn Windows `claude` nicht findet, füge den Ordner, den sein Installationsprogramm genannt hat, zum PATH hinzu und öffne dann ein neues Terminal.
- Eine Kampagne wird immer nur von einem Chat gespielt: Solange deiner offen ist, wartet der Chat des Dashboards.

---

## 3. Spielen <!-- icon: chat -->

### 3.1 Mit der Spielleitung sprechen

Schreib, was dein Charakter tut oder sagt:

> Ich frage die Wirtin, wer heute Nacht noch vorbeigekommen ist.

Du sagst, was du versuchst; die Spielleitung sagt, was passiert. Sie entscheidet nie für deinen Charakter.

Außerhalb der Geschichte schreibst du `[OOC: …]` (out of character): *[OOC: Wie funktioniert das Ringen?]* Du kannst die Spielleitung nach den Regeln fragen oder danach, wie das Dashboard funktioniert.

Wenn die Spielleitung dich etwas fragt, antworte mit ihren Schaltflächen oder in deinen eigenen Worten. Du kannst auch von deinem Charakterbogen aus handeln: Klicke auf eine Waffe, einen Zauber oder einen Gegenstand und wähle, was du tun willst.

**Dauerbefehle**: Sag deinen Begleitern etwas, das dauerhaft gelten soll, zum Beispiel *Ab jetzt lass immer einen am Leben*. Die Spielleitung behält es bei, bis du es aufhebst.

### 3.2 Würfe

Die Spielleitung verlangt nur dann einen Wurf, wenn der Ausgang unsicher ist und etwas davon abhängt. Ein Banner zeigt den Wurf: Klicke darauf, und die Würfel fallen.

Die Würfel gehören RPG Engine, nicht der Spielleitung. Du kannst jederzeit fragen: *[War dieser Wurf echt?]* Auch bei einem geheimen Wurf kann die Spielleitung beweisen, dass er vor deiner Frage gemacht wurde.

Steht die Einstellung **Würfel** auf „physisch“, würfle mit deinen eigenen Würfeln und schreibe das Ergebnis: *[Ich habe eine 14 gewürfelt.]* Die Würfe, die du zum Spaß machst, von deinem Charakterbogen aus oder mit **Freier Wurf**, zählen nie.

### 3.3 Szenen, Kämpfe und Reisen

Die Geschichte läuft in **Szenen**: ein Kampf, ein Gespräch, eine Reise, eine Rast. Am Ende jeder Szene speichert das Spiel von selbst, und die Szene kommt in dein Tagebuch.

In einem Kampf spielt die Spielleitung jeden Zug, der nicht deiner ist, und hält an, wenn du entscheiden musst.

Sag, wohin du gehst, *Wir nehmen die Straße nach Norden Richtung Rocca*: RPG Engine berechnet die Entfernung und die Tage und hält an, wenn unterwegs etwas passiert. Währenddessen gehen die Pläne der Schurken weiter, und du siehst ihre Zeichen.

### 3.4 Spielstände

RPG Engine speichert die Kampagne am Ende jeder Szene. Die Einstellung **Spielstände** entscheidet, wann du zurückgehen darfst:

- **Permadeath**: nie.
- **Checkpoint**: zum letzten Spielstand, nur wenn dein Charakter stirbt.
- **frei**: zu jedem Spielstand, und du kannst speichern, wann du willst.

In jedem Modus kannst du neu anfangen, im Chat oder unter **Spielstände**.

Öffne nach dem Zurückgehen einen neuen Chat, denn der alte erinnert sich an das, was rückgängig gemacht wurde:

1. Drücke auf **Chat schließen**, dann auf **Neuer Chat**. Öffne im eigenen Chat deiner KI-App eine neue Unterhaltung (`/clear` in Claude Code).
2. Schreibe *Weiter*.
3. Drücke unter Spielstände auf **Ich habe einen neuen Chat geöffnet**. Bis dahin wartet die Spielleitung.

### 3.5 Aufhören und weitermachen

Hör auf, wann du willst: Alles ist schon gespeichert. Schließe das Fenster des Dashboards, und kurz danach endet das Spiel. Nichts geht verloren.

Um zurückzukommen, öffne RPG Engine über sein Symbol und klicke auf deine Kampagne. Drücke auf **Chat fortsetzen**, dann auf **Geschichte fortsetzen**: Die Spielleitung sagt dir, wo du warst, und macht weiter. Beim nächsten Mal kannst du auch eine andere KI-App wählen.

### 3.6 Grenzen und Stopp

**Linien** erscheinen nie im Spiel; **Schleier** geschehen nur abseits der Bühne. Du legst sie in den **Einstellungen** fest.

Schreibe jederzeit *[stopp]*: Die Spielleitung lässt diesen Inhalt fallen und fügt ihn deinen Linien hinzu.

### 3.7 Bilder

Die Spielleitung kann Bilder von Orten, Quests und Personen erstellen lassen, so wie es die Einstellung **Bilder** festlegt, und auf Wunsch ein Porträt deines Charakters. Deine KI-App erstellt sie, in deinem Tarif. Erscheint keines, sagen die **Einstellungen**, ob dieser Computer sie erstellen kann.

Du kannst deinem Charakter oder einer Seite der Welt auch ein eigenes Bild geben, von der Seite selbst aus.

---

## 4. Das Dashboard <!-- icon: party -->

Das Fenster, in dem du dein Spiel siehst. Es zeigt nur, was dein Charakter weiß.

- **Rollenspiel**: der Chat mit der Spielleitung, wenn er nicht neben der Seite steht.
- **Gruppe**: dein Charakterbogen, die deiner Begleiter und die Würfe.
- **Szene**: wo du bist, wer da ist und die Karte; im Kampf die Züge.
- **Tagebuch**: Quests, die Geschichte als Buch, die Tagebücher deiner Begleiter und deine Notizen.
- **Welt**: die Weltkarte, was dein Charakter weiß, die gefundenen Dokumente und der Kalender.
- **Spielstände**: zurückgehen und neu anfangen.
- **Einstellungen**: wie du spielst und wie die Seite aussieht.
- **Pakete**: das Spielsystem, Erweiterungen, deine Handbücher und Updates: Wenn ein neues RPG Engine erschienen ist, steht es hier.

Wenn die Seite meldet, dass sie nicht verbunden ist, drücke auf **Kampagne erneut öffnen**.

Um zu Hause vom Smartphone aus zu spielen, schalte in den **Einstellungen** unter **Dashboard** den **Smartphone-Zugriff** ein und erfasse den Code mit dem Smartphone, im selben WLAN wie der Computer. Windows fragt eventuell, ob Node.js das Netzwerk nutzen darf: Erlaube es in privaten Netzwerken und stelle das WLAN als privates Netzwerk ein. Das Spiel wird unverschlüsselt übertragen: Nutze es nur in einem Netzwerk, dem du vertraust, etwa deinem Heimnetz, nie in einem öffentlichen WLAN, im Hotel oder im Büro. Schalte den Zugriff aus, wenn du fertig bist: Das Spiel endet mit dem letzten Fenster des Computers.

Wenn ein Theme die Seite schwer lesbar macht, füge am Ende ihrer Adresse `#/settings/page` hinzu und schalte den **Eigenen Stil des Themes** aus.

---

## 5. Regeln, Handbücher und Erweiterungen <!-- icon: dice -->

Ein **Spielsystem** besteht aus den Daten eines Spiels: dem Charakterbogen, den Kreaturen, Gegenständen, Zaubern und Regeln. RPG Engine berechnet den Charakterbogen. Wie eine Regel gilt, liest und entscheidet die Spielleitung, wie an einem echten Spieltisch.

Die **Fünfte Edition** enthält die freien Regeln des System Reference Document 5.1. Du kannst auch Inhalte aus einem Buch spielen, das du besitzt: Die Spielleitung schreibt sie in deine Kampagne.

**Deine Handbücher**: Sag der Spielleitung, wo sie liegen, oder füge ihren Ordner unter **Pakete** hinzu. Die Spielleitung schlägt Regeln darin nach und nennt Buch und Seite. RPG Engine verändert die Handbücher nie und kopiert sie auch nie in eine Kampagne.

**Hausregeln**: Sag der Spielleitung zum Beispiel: *[House rule: a natural 1 on an attack means you drop your weapon.]* Sie merkt sich die Regel. Eine Entscheidung, die die Spielleitung einmal getroffen hat, gilt auch beim nächsten Mal.

**Erweiterungen** fügen dem Spiel etwas hinzu, zum Beispiel das Wetter. Füge sie unter **Pakete** hinzu oder bitte die Spielleitung darum.

---

## 6. Dein eigenes Abenteuer <!-- icon: world -->

Gibt es noch keine geschriebene Welt, baut die Spielleitung aus deiner Ausgangsidee eine und behält sie bei.

Du willst ein Abenteuer oder ein Buch spielen, das du besitzt? Gib der Spielleitung die Datei: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Eine Datei außerhalb der Kampagne liest die Spielleitung erst, wenn du zugestimmt hast. Am besten eignet sich Text, EPUB, Word oder eine PDF, deren Text sich markieren lässt.

Das ganze Dokument geht an das Unternehmen der KI, die es liest. Eine Kampagne wird nur einmal gespielt: Willst du dasselbe Abenteuer noch einmal spielen, lege eine neue Kampagne an.

---

## 7. Deine Daten <!-- icon: lock -->

- Eine Kampagne ist ein Ordner. Darin liegen die Geheimnisse der Kampagne und auch deine Chats mit der Spielleitung. Du musst ihn nie öffnen.
- RPG Engine liest und schreibt nur in diesem Ordner. Deine Handbücher liest es nur. Alles andere außerhalb der Kampagne gibt es erst nach deinem Ja, in einem Fenster deines Computers.
- Im Chat des Dashboards öffnet die Spielleitung von sich aus keine deiner Dateien.
- Was du schreibst, geht an das Unternehmen, dessen Modell die Spielleitung spielt, unter den Bedingungen deines Kontos. Bei einem lokalen Modell bleibt es auf deinem Computer.
- Ein Spielsystem oder eine Erweiterung, die nicht von uns stammt, ist Code, der auf deinem Computer läuft. Er kommt nur mit deinem Ja. Sag nur Ja zu Autorinnen und Autoren, denen du vertraust.
- Ist der Kampagnenordner ein Git-Repository, kann **Einstellungen** ihn für dich committen. Lass deine Chats nur hinein, wenn das Repository privat ist.
- Ist **Smartphone-Zugriff** an, geht das Spiel unverschlüsselt vom Computer über dein Heimnetz zum Smartphone, ohne einen externen Dienst: Wer in diesem Netz ist, könnte es mitlesen.
