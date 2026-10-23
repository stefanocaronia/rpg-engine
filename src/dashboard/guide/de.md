<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb d90880b0 1e0398b1 e9b90526 ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
# RPG Engine: der komplette Leitfaden

**RPG Engine** lässt dich ein Pen-&-Paper-Rollenspiel mit einer **KI als Spielleitung** spielen. Du sprichst mit der Spielleitung in einem **Chat**; RPG Engine arbeitet im Hintergrund: Es **merkt sich die Welt**, **würfelt** und **führt Buch**. Neben dem Chat hältst du im Browser eine Seite offen, das **Dashboard**, mit deinem Charakterbogen, den Würfeln, den Karten und deinem Tagebuch.

Dieser Leitfaden richtet sich an Spielende: Du musst nicht programmieren können.

## Schnellstart <!-- icon: send -->

1. Installiere **Node.js** von [nodejs.org](https://nodejs.org) (die LTS-Version).
2. Installiere einen **KI-Agenten**, das Programm, in dem die Spielleitung läuft, und melde dich an: zum Beispiel Claude Code oder Codex ([2.4](#24-connect-your-ai)).
3. Installiere RPG Engine in einem Terminal: `npm install -g rpg-engine`.
4. Lege eine Kampagne an: `rpg init "The Salt Isles"`.
5. Wechsle in den neuen Ordner mit `cd "The Salt Isles"` und starte dort deinen Agenten: `claude` für Claude Code, `codex` für Codex. Bestätige mit Ja, wenn er fragt, ob du dem Ordner vertraust ([2.4](#24-connect-your-ai)), und schreibe dann *Hallo! Lass uns anfangen.* Die Spielleitung antwortet mit dem Link zu deinem Dashboard.

## 1. Was RPG Engine ist <!-- icon: about -->

| Wer | Was sie tun |
|---|---|
| **Du** | Du spielst deinen Charakter: was er tut, sagt und versucht. |
| **Die Spielleitung** (die KI) | Erzählt die Geschichte, spielt alle anderen, entscheidet, was passiert, und verlangt Würfe. |
| **RPG Engine** | Hält die Welt in Dateien fest, würfelt, zählt Trefferpunkte, Geld, Zeit und Entfernungen und hält Geheimnisse zurück, bis du sie entdeckst. |

Die Welt bleibt von einem Abend zum nächsten gleich, auch in einem neuen Chat, sogar mit einer anderen KI:

- **Was gesagt wurde, bleibt wahr.** Ein toter Schurke bleibt tot.
- **Die Würfel sind echt.** Die Spielleitung kann sie nicht beugen, außer bei der leichtesten Schwierigkeit, wenn du sie wählst.
- **Geheimnisse bleiben geheim.** Die Spielleitung verrät dir nie, was dein Charakter nicht weiß.
- **Die Welt bewegt sich.** Bedrohungen rücken vor, während ihr rastet oder reist, und du siehst ihre Zeichen.
- **Eine Kampagne ist ein Ordner** auf deinem Computer: Hör auf, wann du willst, und mach später weiter.

Heute spielt RPG Engine ein Spielsystem: die **fünfte Edition**, aus dem freien System Reference Document 5.1. Weitere folgen ([Später geplant](#9-coming-later)).

---

## 2. Erste Schritte <!-- icon: path -->

### 2.1 Was du brauchst

- Einen Computer mit Windows, macOS oder Linux und einen Webbrowser.
- **Node.js 22** oder neuer, von [nodejs.org](https://nodejs.org). Es bringt `npm` mit, womit du RPG Engine installierst.
- Ein **Terminal**: unter Windows Terminal oder PowerShell, unter macOS Terminal. Um eines in einem Ordner zu öffnen, klickst du den Ordner mit der rechten Maustaste an und wählst **Im Terminal öffnen** (Windows) oder **Dienste > Neues Terminal beim Ordner** (macOS).
- Einen **KI-Agenten** für die Spielleitung ([2.4](#24-connect-your-ai)), mit dem **größten Modell**, das er anbietet: Ein kleines Modell lässt sich leichter dazu bringen, Geheimnisse zu verraten oder die Regeln zu verbiegen.

### 2.2 Installieren

```text
npm install -g rpg-engine
```

Mit `rpg --version` prüfst du, ob es geklappt hat. Du nutzt `rpg` einmal pro Kampagne, um sie anzulegen. Danach startet dein Agent RPG Engine von selbst.

### 2.3 Eine Kampagne anlegen

Öffne ein Terminal in dem Ordner, in dem du deine Spiele aufbewahrst ([2.1](#21-what-you-need) erklärt, wie):

```text
rpg init "The Salt Isles"
```

Das erstellt den Ordner `The Salt Isles` mit einer neuen Kampagne darin. Wechsle mit `cd "The Salt Isles"` hinein. Merk dir, wo er liegt: Du kehrst jedes Mal dorthin zurück, wenn du spielst. Alles andere legst du später fest, im Chat oder im Dashboard. `rpg init --help` listet die Optionen auf, mit denen du schon jetzt einiges festlegen kannst, etwa `--language it` oder `--difficulty hard`.

Die Spielleitung kann keine Kampagne für dich anlegen: Vor `init` sagt nichts deinem Agenten, wo RPG Engine ist.

### 2.4 Deine KI verbinden

Die Spielleitung läuft in einem **KI-Agenten**: einer KI-App im Terminal oder auf dem Desktop, die mit den Dateien auf deinem Computer arbeiten kann, zum Beispiel Claude Code oder Codex. Ein einfacher Chat wie claude.ai oder ChatGPT oder eine Handy-App reicht nicht: Die Spielleitung muss die Dateien der Kampagne auf deinem Computer erreichen können. Jeder Agent braucht seinen eigenen Tarif und sein eigenes Login: Claude Code einen bezahlten Claude-Tarif, Codex ein ChatGPT-Login. Du installierst ihn einmal, über seine eigene Seite: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: Schreibe im Kampagnenordner `claude`. Wenn es fragt, ob du dem Ordner vertraust, wähle **Yes, I trust this folder**. Vorsicht: Die vorausgewählte Antwort ist *No, exit*. Die Kampagne hat außerdem einen kleinen Hook, `rpg --listen`, den die Frage nicht zeigt: Er sagt der Spielleitung sofort Bescheid, wenn du im Dashboard etwas tust.
- **Codex**: Schreibe im Kampagnenordner `codex` und antworte mit Ja, wenn es fragt, ob du dem Ordner vertraust. Prüfe in der Desktop-App in den Einstellungen, dass die Erinnerungen für die Chats des Spiels ausgeschaltet sind.
- **Ein anderer Agent**: Starte ihn im Kampagnenordner und gib ihm den MCP-Server `rpg mcp`. RPG Engine ist ein Standard-MCP-Server: Jeder Agent, der MCP unterstützt, kann die Spielleitung sein, auch lokale.

Wir spielen und testen mit **Claude Code**. **Codex** ist angebunden und geprüft, aber es wurde noch keine ganze Kampagne damit gespielt. Die Kampagne schaltet den eigenen Speicher des Agenten ab: Das Spiel lebt in seinen Dateien, damit die Rückkehr zu einem Spielstand wirklich zurückführt.

### 2.5 Der erste Chat

Schreib irgendetwas, zum Beispiel *Hallo! Lass uns anfangen.* In ihrer ersten Antwort jedes Chats gibt dir die Spielleitung den **Link zu deinem Dashboard**, etwa `http://127.0.0.1:4750`. Öffne ihn und lass ihn neben dem Chat offen.

Zwischen den Nachrichten der Spielleitung zeigt dein Agent die Werkzeuge, die er benutzt. Öffne ihre Details nicht (in Claude Code mit Strg+O), denn sie können Geheimnisse zeigen.

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
| **Begleiter** | Wer mit dir reist | keine, mit dir erschaffen, von der Spielleitung erschaffen, im Spiel getroffen |
| **Bilder** | Bilder von Orten, Quests und denen, die du triffst | keine, auf Wunsch, neue Orte, Quests und die, die du triffst ([3.11](#311-pictures)) |
| **Linien** und **Schleier** | Was nie vorkommt und was nur abseits der Bühne geschieht | Listen |
| **Sprache** | Die Sprache des Spiels und des Dashboards | beliebig |

Die fünfte Edition fügt den **Aufstieg** hinzu: Erfahrungspunkte oder Meilensteine.

Ohne eine ausgearbeitete Welt fragt die Spielleitung außerdem nach einer **Prämisse** (Genre, Ton, ein paar Elemente, in deinen Worten) und nach der **Vorbereitung**: die Welt unterwegs aufbauen, während du spielst, oder alles gleich am Anfang.

Der **Stil der Spielleitung** wird nie abgefragt, aber du kannst ihn im Chat oder unter **Einstellungen** ändern: die **Prosa** (schlicht, literarisch, Pulp, trocken-ironisch), die **Geschichten**, die die Spielleitung erfindet (Situationen, Handlungsbögen, Episoden, Rätsel), eine Autorin oder ein Autor, in deren Stil **geschrieben** wird, oder alles andere **in deinen Worten**.

### 2.7 Session Zero: dein Charakter

Du erschaffst deinen Charakter gemeinsam mit der Spielleitung, wie an einem Spieltisch. Jede Entscheidung liegt bei dir, außer du bittest die Spielleitung, sie zu treffen: Komm mit einer fertigen Idee, einer vagen oder mit nichts. Die Spielleitung sagt dir, wie die Attributswerte bestimmt werden, bevor ein Würfel fällt. Eine Hintergrundgeschichte ist nie Pflicht. Wenn du eine erzählst, schreibt die Spielleitung sie in deinen Worten auf. Danach bittet die Spielleitung dich um ein Bild deines Charakters ([3.7](#37-your-characters-story-and-picture)). RPG Engine berechnet den Charakterbogen: Du musst nie rechnen.

---

## 3. Spielen <!-- icon: chat -->

### 3.1 Mit der Spielleitung sprechen

Schreib, was dein Charakter tut oder sagt, mit deinen eigenen Worten:

> Ich frage die Wirtin, wer heute Abend sonst noch vorbeigekommen ist.

Willst du außerhalb der Geschichte sprechen, schreib in eckigen Klammern: *[Wie funktioniert Ringen?]* Die Spielleitung antwortet ebenfalls in Klammern.

Du sagst, was du versuchst. Die Spielleitung sagt, was geschieht. Sie entscheidet nie für deinen Charakter und redet nie über die Engine. Du kannst die Spielleitung fragen, wie das Dashboard funktioniert.

**Vom Dashboard aus handeln**: Klicke auf einen Namen auf deinem Charakterbogen, zum Beispiel eine Waffe, einen Zauber oder etwas, das du trägst. Wähle dann, für wen es gilt. Oder klicke auf eine Person, um mit ihr zu sprechen. Das Dashboard schreibt deinen Satz, *Ich greife Kapuzenbandit 1 mit Streitkolben an.*, den du vor **Der Spielleitung sagen** noch ändern kannst. Die Spielleitung hört ihn, als wäre er im Chat gesagt worden, und entscheidet darüber wie über jeden anderen. Wenn deine KI-App ihn nicht selbst hören kann, macht **Kopieren** ihn bereit zum Einfügen in den Chat.

### 3.2 Würfe

Die Spielleitung verlangt nur dann einen Wurf, wenn der Ausgang ungewiss ist und etwas davon abhängt. Vorher sagt sie, was auf dem Spiel steht. Dann gilt:

- **Auf dem Dashboard** zeigt ein Banner für jede Probe eine Schaltfläche, zum Beispiel *Akrobatik +4 · mit Vorteil*. Klicke darauf: Die Würfel fallen auf der Seite, und die Spielleitung hört das Ergebnis. Du kannst auch auf die Zeile deines Charakterbogens klicken, die aufleuchtet, die Würfel aus der Würfelschale werfen oder im Banner etwas anderes schreiben.
- **Von Hand**, in der Ecke des Banners oder in den **Einstellungen**: Das Banner sagt dir, was du würfeln sollst, und du würfelst es von deinem Charakterbogen oder aus der Würfelschale.
- **Echte Würfel**, wenn die Würfeleinstellung auf „physisch“ steht: Du schreibst die gewürfelten Augenzahlen, *[Ich habe eine 14 gewürfelt.]*, und RPG Engine addiert deine Modifikatoren.

**Freie Würfe**: Klicke auf eine beliebige Zahl auf deinem Charakterbogen oder öffne die Würfelschale, um zum Spaß zu würfeln. Sie zählen nie, und die Spielleitung sieht sie nie.

**Die Würfe der Spielleitung** erscheinen in deiner Wurfspalte, außer den geheimen. Du kannst jederzeit fragen: *[War dieser Wurf echt?]* Bei einem geheimen Wurf nennt die Spielleitung einen Fingerabdruck, der beweist, dass er gemacht wurde, bevor du gefragt hast.

### 3.3 Szenen und Kämpfe

Die Geschichte läuft in **Szenen**: ein Kampf, ein Gespräch, Erkunden, Reisen, eine Rast. Am Ende jeder Szene speichert das Spiel von selbst, und die Szene kommt in dein Tagebuch.

In einem Kampf erzählt die Spielleitung jeden Zug, der nicht deiner ist, und hält an, wo du entscheiden kannst. Die **Szene** zeigt oben, wer am Zug ist und wer als Nächstes kommt, und daneben die Karte deines Charakters neben der Karte des Ortes. Die Reihenfolge der Züge, die Trefferpunkte deiner Gruppe und wie verletzt die Gegner aussehen, in Worten, bleiben am Rand der Seite. Wenn dein Charakter fällt, erscheinen die Todesrettungswürfe groß auf der Seite.

### 3.4 Zeit, Reisen und die Welt in Bewegung

RPG Engine führt das Datum. Zwischen den Sessions vergeht keine Zeit. Sag, dass ihr rastet, *Wir machen eine lange Rast*, und sobald die Spielleitung zustimmt, gibt die Rast zurück, was sie zurückgeben soll. Bei einer kurzen Rast kann die Spielleitung auf dem Dashboard fragen, wie viele Trefferwürfel du einsetzt. Würfle sie einzeln, sieh, was jeder heilt, und hör auf, wann du willst. Sag, wohin ihr geht, *Wir nehmen die Straße nach Norden Richtung Rocca*, und RPG Engine berechnet den Weg, die Entfernung und die Tage. Es hält an, wenn unterwegs etwas geschieht. Geld wird in den Münzen des Spiels gezählt, Wechselgeld inklusive.

Schurken haben Pläne mit Fristen. Mit jedem neuen Tag bewegt die Spielleitung die Bedrohungen, die die Zeit vorangebracht hat. Du siehst ihre Zeichen, nie die Uhr selbst.

### 3.5 Karten

**Welt** zeigt die Orte, die dein Charakter kennt, die Straßen zwischen ihnen und den Weg, den du gegangen bist, mit Nebel über dem Rest. **Szene** zeigt die Karte des Ortes, an dem du dich befindest, wenn es eine gibt, und wer wo steht. In einem Kampf sind auf deinem Zug die Felder verhüllt, die du nicht erreichen kannst. Wenn die Spielleitung fragt, wohin du dich bewegst, tippe auf ein Feld oder schreib es, zum Beispiel *E4*.

### 3.6 Quests, Tagebuch und Notizen

Eine Aufgabe, die dein Charakter annimmt, wird im **Tagebuch** zu einer Quest, mit ihren Zielen, ihrer Frist und dem, was sie misst. Markiere sie mit einem Stern, damit sie oben in der Szene im Blick bleibt. Das Tagebuch erzählt auch deine **Geschichte**, Szene für Szene, und bewahrt deine **Notizen** auf: privat, solange du keine **Teilen** lässt. Die Spielleitung hört sie dann als das, was du denkst, nie als Tatsache. Unter **Begleiter** liest du die Tagebücher deiner Begleiter: Hin und wieder, am Ende eines Tages oder einer Quest, schreiben sie ein paar Zeilen darüber, was sie denken und fühlen.

### 3.7 Die Geschichte und das Bild deines Charakters

Auf deinem Charakterbogen hat die Karte **Beschreibung** ein Feld für die Geschichte deines Charakters: Die Spielleitung schreibt sie hinein, nachdem du Ja gesagt hast. Für ein Bild gib der Spielleitung eine Datei (PNG, JPEG, WebP oder SVG, bis zu 5 MB) und sag, wo sie auf deinem Computer liegt. Oder lass ein Porträt erstellen ([3.11](#311-pictures)): *[Mach mir ein Porträt: graues Haar in einem Zopf, eine Narbe am Kinn.]*

### 3.8 Spielstände und Zurückgehen

RPG Engine speichert die ganze Kampagne am Ende jeder Szene. Die Einstellung **Spielstände** bestimmt den Rest:

| Spielstände | Speichern, wann du willst | Zurückgehen |
|---|---|---|
| **permadeath** | nein | nie |
| **checkpoint** | nein | zum letzten Spielstand, nur wenn dein Charakter stirbt |
| **frei** | ja | zu jedem Spielstand |

In jedem Modus kannst du **neu beginnen**, vom Spielanfang oder von Session Zero an. Mach das im Chat oder unter **Spielstände**.

Nach dem Zurückgehen **öffne einen neuen Chat**: Der alte erinnert sich an das, was rückgängig gemacht wurde. Schreib *weiter* im neuen Chat und drücke dann unter Spielstände auf **Ich habe einen neuen Chat geöffnet**.

### 3.9 Sessions: aufhören und wiederkommen

Hör auf, wann du willst: *[Lass uns für heute Abend hier aufhören.]* Alles ist schon in den Dateien gespeichert. Um zurückzukommen, starte deinen Agenten im Kampagnenordner und schreib *weiter*. Die Spielleitung gibt dir eine kurze Zusammenfassung und macht weiter.

### 3.10 Die Stimmung der Spielleitung

Der Roboter oben im Dashboard ist die Spielleitung. Sein Gesicht folgt dem Ton der Geschichte und verrät nie, was du noch nicht weißt. Wenn der Chat geschlossen ist, schläft er.

### 3.11 Bilder

RPG Engine kann Bilder erstellen lassen von den Orten, die du erreichst, den Quests, die du annimmst, und denen, die du triffst, so wie es die Einstellung **Bilder** festlegt, und das Porträt deines Charakters, wenn du darum bittest. Es nutzt dein eigenes Codex oder Claude Code, mit deinem Login, über deinen Tarif und mit dessen Grenzen: **Codex** malt sie, sonst zeichnet **Claude Code** sie. Die **Einstellungen** zeigen, ob dieser Computer sie erstellen kann und wie du es einrichtest, falls nicht. Du kannst der Spielleitung jederzeit ein eigenes Bild geben.

### 3.12 Sicherheit: Linien, Schleier und Stopp

**Linien** erscheinen nie im Spiel, **Schleier** geschehen nur außerhalb des Bildes. Schreib jederzeit *[Stopp]*: Die Spielleitung lässt diesen Inhalt sofort fallen und fügt ihn deinen Linien hinzu.

### 3.13 Es sich anders überlegen

Jede Einstellung lässt sich ändern, im Chat oder in den **Einstellungen**. Eine Entscheidung, die die Spielleitung ohne Regelbuch trifft, wird zu einem **Präzedenzfall**, damit dieselbe Frage beim nächsten Mal dieselbe Antwort bekommt.

---

## 4. Das Dashboard <!-- icon: party -->

Eine Seite auf deinem eigenen Computer, nur im Browser dieses Computers zu öffnen und aktiv, solange der Chat offen ist. Wenn der Chat schließt, zeigt sie *Nicht verbunden*. Mit dem nächsten Chat kommt sie von selbst zurück.

- **Gruppe**: dein Charakterbogen und die deiner Begleiter. Klicke auf eine Zahl, um sie zu würfeln. Fahre mit der Maus darüber, um zu sehen, woher sie kommt. Daneben stehen die Würfe.
- **Szene**: wo du bist, ihr Bild und ihre Karte, wer da ist, was geschieht. In einem Kampf die Züge und die Karte deines Charakters.
- **Tagebuch**: Quests, die Geschichte, die Tagebücher deiner Begleiter, deine Notizen.
- **Welt**: die Weltkarte, wie dein Charakter sie kennt.
- **Die Würfelschale**: Würfel und einen Modifikator wählen und werfen.
- **Spielstände**, **Hilfe**, **Einstellungen** und **Info**, als Symbole am Ende der Reihe. Die Einstellungen enthalten auch die eigenen Vorlieben der Seite: Design, Würfelgeräusch, Würfelsatz.

Wenn die Spielleitung dich etwas fragt, bleibt ihr Banner oben, in welchem Bereich du auch bist.

---

## 5. Spielsysteme und Hausregeln <!-- icon: dice -->

### 5.1 Was ein Spielsystem ist

Die Daten eines Spiels: sein Charakterbogen, seine Zahlen, seine Kreaturen, Gegenstände, Zauber und Regeltexte. Jede Kampagne spielt ein System. RPG Engine berechnet den Charakterbogen und das, was verbraucht wird und wiederkommt. Wie eine Fähigkeit funktioniert, liest die Spielleitung in den Regeln nach und entscheidet, wie an einem echten Spieltisch.

### 5.2 Fünfte Edition, inklusive

Die Völker, Klassen, Unterklassen, ein Hintergrund und ein Talent aus dem SRD 5.1; die 319 Zauber, die Waffen, Rüstungen, magischen Gegenstände und Monster; die Regelkapitel, die die Spielleitung in ihrem genauen Wortlaut liest; der vollständige, berechnete Charakterbogen.

Du kannst auch Inhalte spielen, die im SRD fehlen, aus einem Buch, das du besitzt: Die Spielleitung schreibt sie als Seiten deiner Kampagne, und RPG Engine behandelt sie wie eigene Inhalte. RPG Engine liefert nur offene Inhalte mit; was deine Spielleitung kennt, ist nicht begrenzt.

Deine eigenen Regelbücher können deine Bibliothek sein: Sag der Spielleitung, wo sie liegen, *[Meine Regelbücher liegen in D:\Books\5e.]*, oder füge ihren Ordner unter Pakete › Bibliothek hinzu und bestätige einmal mit „Ja" im Fenster, das dein Computer zeigt. RPG Engine liest sie auf diesem Computer. Jede Kampagne nutzt die Ordner, die du dort aktivierst. Die Spielleitung durchsucht sie, wenn sie eine Regel entscheidet, nach dem SRD, und nennt dabei das Buch und die Seite. Am besten lassen sie sich als Text lesen oder als PDF, dessen Text sich markieren lässt. Ein gescanntes PDF wird anhand der Bilder seiner Seiten gelesen, nur unter Windows, in einigen Minuten und mit ein paar Fehlern. RPG Engine verändert deine Regelbücher nie, schickt ihren Text nie irgendwohin und kopiert ihn nie in eine Kampagne.

### 5.3 Hausregeln und eigene Ergänzungen

Frag die Spielleitung: *[Hausregel: Bei einer natürlichen 1 auf einen Angriff lässt du deine Waffe fallen.]* Sie hält sie als Absprache des Tisches fest oder schreibt eine Seite oder einen Wert des Charakterbogens, wenn das nötig ist. Hausregeln, die schon ausgeschrieben sind, kannst du als Textdateien in den Ordner `rules` der Kampagne legen.

### 5.4 Ein eigenes Spielsystem hinzufügen oder importieren

Noch nicht: Heute spielt RPG Engine nur die fünfte Edition ([Kommt später](#9-coming-later)).

---

## 6. Erweiterungen <!-- icon: plus -->

Noch nicht. Eine Erweiterung wird einer Kampagne etwas zusätzlich zu ihrem Spielsystem hinzufügen: eine Welt, ein Abenteuer, eine Funktion wie das Wetter, Hausregeln zum Teilen.

---

## 7. Woher eine Kampagne kommt, und ihre Sprache <!-- icon: world -->

### 7.1 Drei Wege zu einer Welt

- **Unterwegs aufgebaut**: Aus deiner Prämisse baut die Spielleitung jeden Ort, jede Person und jeden Plot kurz bevor du sie brauchst, und behält sie.
- **Am Anfang vorbereitet**: dasselbe, nur wird die Welt vor dem Spiel aufgebaut.
- **Aus deinem eigenen Abenteuer oder Buch**: Gib der Spielleitung die Datei, *[Importiere dieses Abenteuer als unsere Kampagne: D:\Books\adventure.pdf. Sag mir nichts von dem, was darin steht.]* Am besten liest es sich als Text, als EPUB, als Word-Dokument oder als PDF, dessen Text sich markieren lässt. Ein eingescanntes PDF wird aus den Bildern seiner Seiten gelesen, nur unter Windows, langsam und mit ein paar Fehlern. Dein eigenes Codex oder Claude Code liest es außerhalb des Chats, oder sonst die Spielleitung im Chat, in deinem Tarif: Das ganze Dokument geht an OpenAI oder Anthropic, unter den Bedingungen deines Kontos und seiner Wahl zum Training. Das Dashboard zeigt, wie weit es ist. Bei einem Roman schlägt die Spielleitung vor, wo man beginnt. Sie schreibt die Orte, die Charaktere und die Geheimnisse.

Eine Kampagne wird einmal gespielt: Um dasselbe Abenteuer noch einmal zu spielen, erstelle eine neue Kampagne.

### 7.2 Sprachen

Eine Sprache pro Kampagne, die der Spielleitung, der das Dashboard folgt. Das Dashboard kommt in 26 Sprachen. Jede andere wird auf deinem Computer von Codex oder Claude Code übersetzt oder, ohne sie, von der Spielleitung im Chat. Die Begriffe der fünften Edition auf Italienisch stammen aus dem offiziellen italienischen SRD. Der Regeltext bleibt auf Englisch, und die Spielleitung erzählt ihn in deiner Sprache.

---

## 8. Für Neugierige: der Kampagnenordner <!-- icon: list -->

Du musst ihn nie öffnen, und er enthält die Geheimnisse deiner Kampagne. Er enthält `campaign.yaml` (deine Einstellungen), `state.yaml` (wo das Spiel steht), `world/` (eine Markdown-Seite für jeden Charakter, jeden Ort, jede Quest und alles Übrige), `rules/` (deine Hausregeln), `images/`, `log.jsonl` (jede Änderung), `.saves/`, `.player/` (deine Notizen) und die kleinen Dateien, die KI-Agenten sagen, wo RPG Engine liegt. Die Seiten nutzen das Format von Obsidian. Wenn du eine Seite von Hand änderst, erfährt die Spielleitung davon bei ihrer nächsten Antwort.

RPG Engine bleibt in diesem Ordner: Es liest und schreibt das Spiel nur hier und berührt nie deine anderen Dateien. Die Ordner deiner Regelbücher liest es nur. Außerhalb davon hält es nur eigene Datenordner (die Übersetzungen des Dashboards, den Text, den es aus deinen Regelbüchern gelesen hat, und Codex oder Claude Code, wenn du sie installieren lässt) und temporäre Ordner, während ein Bild gezeichnet wird. Alles andere, was dein Agent auf deinem Computer tun will, fragt er vorher bei dir an.

Jeden Befehl, den die Spielleitung nutzt, kannst du auch im Kampagnenordner ausführen: `rpg --help` listet sie auf. Viele geben die Geheimnisse der Kampagne aus.

---

## 9. Kommt später <!-- icon: hourglass -->

- **Du als Spielleitung**, während die KI die Gruppe spielt.
- **Autorenmodus**: Schreibe mit der KI ein Abenteuer, exportiere es und teile es.
- **Mehrere Spielende am selben Computer**, jeweils mit eigenem Charakter, abwechselnd im selben Chat.
- **Erweiterungen**: Einstellungen, Abenteuer, Funktionen und Hausregeln.
- **Andere Spiele**: mehr Spielsysteme und deine eigenen.

---

## 10. Fragen und Probleme <!-- icon: info -->

### Fragen

**Muss ich die Regeln kennen?** Nein. Wähle den Mentor Tutorial und frag in Klammern, wann immer du willst.

**Kann die Spielleitung schummeln?** Sie kann einen Wurf, den RPG Engine gemacht hat, nicht ändern, außer bei der Schwierigkeit Story, und auch keine Fakten, die schon feststehen.

**Kostet es etwas?** RPG Engine ist kostenlos. Die Spielleitung läuft im Tarif deines Agenten oder auf deinem eigenen Computer mit einem lokalen Modell. Ein Spielabend ist ein langer Chat: In den kleinsten Tarifen kann es sein, dass du die Grenze des Tarifs erreichst, bevor der Abend vorbei ist. Bilder, Übersetzungen und Importe nutzen denselben Tarif. RPG Engine selbst nutzt nie einen API-Schlüssel, der pro Aufruf bezahlt wird: Melde deinen Agenten mit deinem Konto an, nicht mit einem Schlüssel.

**Kann ich am Handy spielen?** Nein: Die Spielleitung läuft auf deinem Computer, und das Dashboard öffnet sich nur dort.

**Kann ich mit Freunden spielen?** Noch nicht: Heute gibt es eine Person, einen Charakter, dazu Begleiter ([Coming later](#9-coming-later)).

**Kann ich nächstes Mal eine andere KI nutzen?** Ja: Öffne die Kampagne in einem anderen Agenten und schreib *weiter*.

### Probleme

**Das Dashboard öffnet sich nicht.** Frag die Spielleitung: `[Wie lautet der Link zum Dashboard?]`. Es funktioniert nur, solange in dieser Kampagne ein Chat offen ist, nach der ersten Antwort der Spielleitung.

**Die Spielleitung scheint das Spiel nicht zu kennen.** Dein Agent hat RPG Engine nicht geladen. Prüfe, ob du ihn im Kampagnenordner gestartet und dem Ordner vertraut hast. Schreib in Claude Code `/mcp` und verbinde `rpg` neu. In Codex muss `codex mcp list` im Kampagnenordner `rpg` anzeigen. Wenn `rpg --version` nicht gefunden wird, installiere RPG Engine neu ([2.2](#22-install)).

**Aktualisieren.** Führe `npm install -g rpg-engine` noch einmal aus und öffne dann einen neuen Chat: Eine laufende Spielleitung behält die Version, mit der sie gestartet ist.

**Die Spielleitung erinnert sich an etwas, das ich rückgängig gemacht habe.** Öffne einen neuen Chat und drück unter Spielstände auf **Ich habe einen neuen Chat geöffnet**.

**Es erscheinen keine Bilder.** Unter Einstellungen > Bilder steht, ob dieser Computer sie erzeugen kann, und wie.

**Die Installation schlägt fehl, oder `rpg` startet nicht.** `node --version` muss 22 oder neuer anzeigen. Halte RPG Engine und deine Kampagnen unter Windows aus Pfaden heraus, die `&` enthalten.

**Der Link zum Dashboard hat sich geändert.** Ein anderes Programm hat die übliche Adresse belegt. Die Spielleitung gibt dir den neuen Link.
