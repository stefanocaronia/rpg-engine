<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 16d08ee1 75985e6d b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
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
- **Node.js 22** oder neuer, von [nodejs.org](https://nodejs.org). Es bringt `npm` mit, womit RPG Engine installiert wird.
- Ein **Terminal**: unter Windows Terminal oder PowerShell, unter macOS Terminal. Um eines in einem Ordner zu öffnen, klicke den Ordner mit der rechten Maustaste an und wähle **Im Terminal öffnen** (Windows) oder **Dienste > Neues Terminal beim Ordner** (macOS).
- Einen **KI-Agenten** für die Spielleitung ([2.4](#24-connect-your-ai)), mit dem **größten Modell**, das er anbietet: Ein kleines Modell lässt sich leichter dazu überreden, Geheimnisse zu verraten oder Regeln zu beugen.

### 2.2 Installieren

```text
npm install -g rpg-engine
```

Mit `rpg --version` prüfst du, ob es geklappt hat. Du benutzt `rpg` einmal pro Kampagne, um sie anzulegen; danach startet dein Agent RPG Engine von selbst.

### 2.3 Eine Kampagne anlegen

Öffne ein Terminal in dem Ordner, in dem du deine Spiele aufbewahrst ([2.1](#21-what-you-need) erklärt, wie):

```text
rpg init "The Salt Isles"
```

Das erzeugt den Ordner `The Salt Isles` mit einer neuen Kampagne darin; wechsle mit `cd "The Salt Isles"` hinein. Merke dir, wo er liegt: Du kehrst jedes Mal dorthin zurück, wenn du spielst. Alles andere wählst du später, im Chat oder im Dashboard; `rpg init --help` listet die Optionen auf, mit denen du schon jetzt einiges festlegen kannst, etwa `--language it` oder `--difficulty hard`.

Die Spielleitung kann keine Kampagne für dich anlegen: Vor `init` sagt nichts deinem Agenten, wo RPG Engine ist.

### 2.4 Deine KI verbinden

Die Spielleitung läuft in einem **KI-Agenten**: einer KI-App im Terminal oder auf dem Desktop, die mit den Dateien auf deinem Computer arbeiten kann, wie Claude Code oder Codex. Ein einfacher Chat wie claude.ai oder ChatGPT oder eine Handy-App reicht nicht: Die Spielleitung muss die Dateien der Kampagne auf deinem Computer erreichen. Jeder Agent braucht seinen eigenen Tarif und sein eigenes Login: Claude Code einen kostenpflichtigen Claude-Tarif, Codex ein ChatGPT-Login. Du installierst ihn einmal, über seine eigene Seite: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: Schreibe im Kampagnenordner `claude`. Wenn es fragt, ob du dem Ordner vertraust, wähle **Yes, I trust this folder**; Vorsicht, die vorausgewählte Antwort ist *No, exit*.
- **Codex**: Schreibe im Kampagnenordner `codex` und bestätige mit Ja, wenn es fragt, ob du dem Ordner vertraust. Prüfe in der Desktop-App in den Einstellungen, dass die Erinnerungen für die Chats des Spiels ausgeschaltet sind.
- **Ein anderer Agent**: Starte ihn im Kampagnenordner und gib ihm den MCP-Server `rpg mcp`. RPG Engine ist ein Standard-MCP-Server: Jeder Agent, der MCP unterstützt, kann die Spielleitung sein, auch lokale.

Wir spielen und testen mit **Claude Code**; **Codex** ist angebunden und geprüft, aber mit ihm wurde noch keine ganze Kampagne gespielt; `init` richtet außerdem **Gemini CLI** ein. Die Kampagne schaltet das eigene Gedächtnis des Agenten aus: Das Spiel lebt in seinen Dateien, damit ein Zurückgehen zu einem Spielstand wirklich zurückführt.

### 2.5 Der erste Chat

Schreibe irgendetwas, zum Beispiel *Hallo! Lass uns anfangen.* In ihrer ersten Antwort jedes Chats gibt dir die Spielleitung den **Link zu deinem Dashboard**, etwa `http://127.0.0.1:4750`: Öffne ihn und lass ihn neben dem Chat offen.

Zwischen den Nachrichten der Spielleitung zeigt dein Agent die Werkzeuge, die er benutzt: Öffne ihre Details nicht (in Claude Code mit ctrl+o), sie können Geheimnisse zeigen.

Eine neue Kampagne durchläuft drei Stufen, die oben im Dashboard stehen: **1 Einstellungen** (wie du spielen willst), **2 Session Zero** (du erschaffst deinen Charakter, im Spiel), **3 Spielen**.

### 2.6 Einstellungen: festlegen, wie du spielst

Die Spielleitung fragt nur, was noch fehlt, ein paar Fragen auf einmal; der Schritt **Einstellungen** im Dashboard zeigt dieselben Fragen als Karten. Schreibe „entscheide du", dann wählt die Spielleitung. Alles lässt sich später ändern, im Chat oder in den **Einstellungen**.

| Einstellung | Was sie bestimmt | Werte |
|---|---|---|
| **Mentor** | Wie viel die Spielleitung dir über die Regeln beibringt | aus, Hinweise, Tutorial |
| **Schwierigkeit** | Wie hart die Welt spielt | Geschichte, leicht, normal, schwer, brutal |
| **Tödlichkeit** | Was es bedeutet, in einem Kampf zu fallen | erzählerisch (nie sterben), episch (nur wenn es zählt), Würfel |
| **Spielstände** | Wann du zurückgehen darfst | Permadeath, Checkpoint, frei ([3.8](#38-saves-and-going-back)) |
| **Strenge** | Wie genau Nahrung, Licht und Reisen den Regeln folgen | flüssig, Regeln, Simulation |
| **Würfel** | Wer deine Würfel wirft | digital, physisch |
| **Maßeinheiten** | Entfernungen und Gewichte | metrisch, imperial |
| **Begleiter** | Wer mit dir reist | keine, mit dir erschaffen, von der Spielleitung erschaffen, im Spiel getroffen |
| **Bilder** | Bilder von Orten, Quests und den Menschen, denen du begegnest | keine, auf Wunsch, neue Orte, Quests und Begegnungen ([3.11](#311-pictures)) |
| **Linien** und **Schleier** | Was nie vorkommt und was nur abseits der Szene geschieht | Listen |
| **Sprache** | Die Sprache des Spiels und des Dashboards | beliebig |

Die fünfte Edition fügt den **Aufstieg** hinzu: Erfahrungspunkte oder Meilensteine.

Gibt es keine geschriebene Welt, fragt die Spielleitung außerdem nach einer **Prämisse** (Genre, Ton, ein paar Elemente, in deinen Worten) und nach der **Vorbereitung**: die Welt unterwegs aufbauen, während ihr spielt, oder ganz am Anfang.

Nach dem **Stil der Spielleitung** wird nie gefragt, aber du kannst ihn im Chat oder in den **Einstellungen** ändern: die **Prosa** (schlicht, literarisch, Pulp, trocken-witzig), die **Geschichten**, die sie erfindet (Situationen, Handlungsbögen, Episoden, Rätsel), eine Autorin oder ein Autor, **in deren Stil geschrieben** wird, oder alles andere **in deinen Worten**.

### 2.7 Session Zero: dein Charakter

Du erschaffst deinen Charakter gemeinsam mit der Spielleitung, wie an einem Tisch. Jede Entscheidung liegt bei dir, es sei denn, du bittest die Spielleitung, sie zu treffen: Komm mit einer fertigen Idee, einer vagen oder mit nichts. Die Spielleitung sagt dir, wie die Attributswerte bestimmt werden, bevor ein Würfel fällt. Eine Hintergrundgeschichte ist nie Pflicht; wenn du eine gibst, schreibt die Spielleitung sie in deinen Worten auf. Danach fragt die Spielleitung nach einem Bild deines Charakters ([3.7](#37-your-characters-story-and-picture)). RPG Engine berechnet den Charakterbogen: Du musst nie rechnen.

---

## 3. Spielen <!-- icon: chat -->

### 3.1 Mit der Spielleitung sprechen

Schreib, was dein Charakter tut oder sagt, in deinen eigenen Worten:

> Ich frage den Wirt, wer heute Nacht sonst noch vorbeigekommen ist.

Willst du außerhalb der Geschichte sprechen, schreib in eckigen Klammern: *[Wie funktioniert Ringen?]* Die Spielleitung antwortet ebenfalls in Klammern.

Du sagst, was du versuchst; die Spielleitung sagt, was geschieht. Die Spielleitung entscheidet nie für deinen Charakter und redet nie über die Engine. Du kannst sie fragen, wie das Dashboard funktioniert.

### 3.2 Würfe

Die Spielleitung verlangt nur dann einen Wurf, wenn der Ausgang unsicher ist und etwas davon abhängt. Vorher sagt sie, was auf dem Spiel steht. Dann:

- **Auf dem Dashboard** zeigt ein Banner für jede Probe einen Button, zum Beispiel *Akrobatik +4 · mit Vorteil*. Klick darauf: Die Würfel fallen auf der Seite, und die Spielleitung erfährt das Ergebnis. Du kannst auch auf die Zeile deines Charakterbogens klicken, die aufleuchtet, die Würfel aus der Würfelschale werfen oder im Banner etwas anderes schreiben.
- **Von Hand**, in der Ecke des Banners oder in den **Einstellungen**: Das Banner sagt dir, was du würfeln sollst, und du würfelst es mit deinem Charakterbogen oder der Würfelschale.
- **Echte Würfel**, wenn die Würfel-Einstellung auf „physisch" steht: Du schreibst die gewürfelten Augen, *[Ich habe eine 14 gewürfelt.]*, und RPG Engine rechnet deine Modifikatoren dazu.

**Freie Würfe**: Klick auf eine beliebige Zahl auf deinem Charakterbogen oder öffne die Würfelschale, um just for fun zu würfeln. Sie zählen nie, und die Spielleitung sieht sie nie.

**Die Würfe der Spielleitung** erscheinen in deiner Wurfspalte, außer den geheimen. Du kannst jederzeit fragen: *[War dieser Wurf echt?]* Bei einem geheimen Wurf nennt die Spielleitung einen Fingerabdruck, der beweist, dass er gemacht wurde, bevor du gefragt hast.

### 3.3 Szenen und Kämpfe

Die Geschichte läuft in **Szenen** ab: ein Kampf, ein Gespräch, Erkunden, Reisen, eine Rast. Am Ende jeder Szene speichert das Spiel von selbst, und die Szene kommt in dein Tagebuch.

In einem Kampf erzählt die Spielleitung jeden Zug, der nicht deiner ist, und hält an, wo du entscheiden kannst. Die **Szene** zeigt oben, wer am Zug ist und wer als Nächstes kommt, und neben der Karte die Karte deines Charakters. Die Zugreihenfolge, die Trefferpunkte deiner Gruppe und in Worten, wie angeschlagen die Gegner aussehen, bleiben neben der Seite. Wenn dein Charakter stürzt, erscheinen die Todesrettungswürfe groß auf der Seite.

### 3.4 Zeit, Reisen und die Welt in Bewegung

RPG Engine führt das Datum; zwischen den Sessions vergeht keine Zeit. Sag, dass ihr rastet, *Wir machen eine lange Rast*, und die Rast gibt zurück, was sie soll. Sag, wohin du gehst, *Wir nehmen die Straße nach Norden Richtung Rocca*, und RPG Engine berechnet den Weg, die Entfernung und die Tage. Es hält an, wenn unterwegs etwas geschieht. Geld wird in den Münzen des Spiels gezählt, Wechselgeld inbegriffen.

Schurken haben Pläne mit Fristen. Mit jedem neuen Tag bewegt die Spielleitung die Bedrohungen, die die Zeit vorangebracht hat. Du siehst ihre Anzeichen, nie die Uhr selbst.

### 3.5 Karten

**Welt** zeigt die Orte, die dein Charakter kennt, die Straßen dazwischen und den Weg, den du gegangen bist, mit Nebel über dem Rest. **Szene** zeigt die Karte des Ortes, an dem du bist, sofern es eine gibt, und wer wo steht. In einem Kampf sind auf deinem Zug die Felder verhüllt, die du nicht erreichen kannst. Wenn die Spielleitung fragt, wohin du dich bewegst, tippe auf ein Feld oder schreib es, zum Beispiel *E4*.

### 3.6 Quests, Tagebuch und Notizen

Eine Aufgabe, die dein Charakter annimmt, wird im **Tagebuch** zu einer Quest, mit ihren Zielen, ihrer Frist und dem, was sie misst. Markiere sie mit einem Stern, um sie oben in der Szene im Blick zu behalten. Das Tagebuch erzählt auch deine **Geschichte**, Szene für Szene, und bewahrt deine **Notizen** auf: privat, solange du sie nicht **teilst**. Die Spielleitung hört eine geteilte Notiz als das, was du denkst, nie als Tatsache.

### 3.7 Die Geschichte und das Bild deines Charakters

Auf deinem Charakterbogen hat die Karte **Beschreibung** ein Feld für die Geschichte deines Charakters: Die Spielleitung schreibt sie hinein, nachdem du ja gesagt hast. Für ein Bild gib der Spielleitung eine Datei (PNG, JPEG, WebP oder SVG, bis zu 5 MB) und sag, wo sie auf deinem Computer liegt. Oder lass ein Porträt anfertigen ([3.11](#311-pictures)): *[Mach mir ein Porträt: graues Haar in einem Zopf, eine Narbe am Kinn.]*

### 3.8 Spielstände und zurückgehen

RPG Engine speichert die ganze Kampagne am Ende jeder Szene. Die Einstellung **Spielstände** bestimmt den Rest:

| Spielstände | Speichern, wann du willst | Zurückgehen |
|---|---|---|
| **permadeath** | nein | nie |
| **checkpoint** | nein | zum letzten Spielstand, nur wenn dein Charakter stirbt |
| **free** | ja | zu jedem Spielstand |

In jedem Modus kannst du **neu beginnen**, vom Anfang des Spiels oder von Session Zero an. Mach es im Chat oder unter **Spielstände**.

Nach dem Zurückgehen **öffne einen neuen Chat**: Der alte erinnert sich an das, was rückgängig gemacht wurde. Schreib im neuen Chat *weiter*, dann drück unter Spielstände auf **Ich habe einen neuen Chat geöffnet**.

### 3.9 Sessions: aufhören und zurückkommen

Hör auf, wann du willst: *[Lass uns für heute Abend hier aufhören.]* Alles ist schon in den Dateien gespeichert. Um zurückzukommen, starte deinen Agenten im Kampagnenordner und schreib *weiter*: Die Spielleitung gibt dir eine kurze Zusammenfassung und macht weiter.

### 3.10 Die Stimmung der Spielleitung

Der Roboter oben auf dem Dashboard ist die Spielleitung: Sein Gesicht folgt dem Ton der Geschichte und verrät nie, was du noch nicht weißt. Wenn der Chat geschlossen ist, schläft er.

### 3.11 Bilder

RPG Engine kann Bilder von den Orten anfertigen lassen, die du erreichst, von den Quests, die du annimmst, und von denen, die du triffst, je nach Einstellung **Bilder**. Auf Wunsch entsteht auch das Porträt deines Charakters. Es nutzt, was auf deinem Computer ist, mit deinem eigenen Login: **Codex** malt sie, sonst zeichnet **Claude Code** sie. Die **Einstellungen** zeigen, ob dieser Computer sie erstellen kann und wie du es einrichtest, falls nicht. Du kannst der Spielleitung jederzeit ein eigenes Bild geben.

### 3.12 Sicherheit: Linien, Schleier und Stopp

**Linien** erscheinen nie im Spiel; **Schleier** geschehen nur außerhalb der Szene. Schreib jederzeit *[stopp]*: Die Spielleitung lässt diesen Inhalt sofort fallen und fügt ihn deinen Linien hinzu.

### 3.13 Deine Meinung ändern

Jede Einstellung lässt sich ändern, im Chat oder in den **Einstellungen**. Eine Entscheidung, die die Spielleitung ohne Regelbuch trifft, wird zum **Präzedenzfall**, damit dieselbe Frage beim nächsten Mal dieselbe Antwort bekommt.

---

## 4. Das Dashboard <!-- icon: party -->

Eine Seite auf deinem eigenen Computer, nur im Browser dieses Computers geöffnet, aktiv, solange der Chat offen ist. Wenn der Chat schließt, zeigt sie *Nicht verbunden*; mit dem nächsten Chat kommt sie von selbst zurück.

- **Gruppe**: dein Charakterbogen und die deiner Begleiter. Klick auf eine Zahl, um sie zu würfeln; fahr mit der Maus darüber, um zu sehen, woher sie kommt. Daneben stehen die Würfe.
- **Szene**: wo du bist, ihr Bild und ihre Karte, wer da ist, was geschieht; in einem Kampf die Züge und die Karte deines Charakters.
- **Tagebuch**: Quests, die Geschichte, deine Notizen.
- **Welt**: die Weltkarte, wie dein Charakter sie kennt.
- **Die Würfelschale**: Würfel und einen Modifikator wählen und werfen.
- **Spielstände**, **Hilfe**, **Einstellungen** und **Info** als Icons am Ende der Reihe. Die Einstellungen enthalten auch die eigenen Vorgaben der Seite: Design, Würfelklang, Würfelset.

Wenn die Spielleitung dich etwas fragt, bleibt ihr Banner oben, in welchem Bereich du auch bist.

---

## 5. Spielsysteme und Hausregeln <!-- icon: dice -->

### 5.1 Was ein Spielsystem ist

Die Daten eines Spiels: sein Charakterbogen, seine Zahlen, seine Kreaturen, Gegenstände, Zauber und Regeltexte. Jede Kampagne spielt ein System. RPG Engine berechnet den Charakterbogen und was verbraucht wird und zurückkommt; wie eine Fähigkeit funktioniert, liest die Spielleitung in den Regeln nach und entscheidet, wie an einem Tisch.

### 5.2 Fünfte Edition, enthalten

Die Völker, Klassen, Unterklassen, ein Hintergrund und ein Talent des SRD 5.1; die 319 Zauber, die Waffen, Rüstungen, magischen Gegenstände und Monster; die Regelkapitel, die die Spielleitung im genauen Wortlaut liest; der vollständige, berechnete Charakterbogen.

Du kannst auch Inhalte spielen, die im SRD fehlen, aus einem Buch, das du besitzt: Die Spielleitung schreibt sie als Seiten deiner Kampagne, und RPG Engine behandelt sie wie seine eigenen. RPG Engine liefert nur offene Inhalte mit; was deine Spielleitung weiß, ist nicht begrenzt.

### 5.3 Hausregeln und eigene Ergänzungen

Frag die Spielleitung: *[Hausregel: Eine natürliche 1 bei einem Angriff bedeutet, dass du deine Waffe fallen lässt.]* Sie hält sie als Vereinbarung des Tisches fest oder schreibt eine Seite oder eine Zahl des Charakterbogens, wenn eine nötig ist. Bereits ausgeschriebene Hausregeln können als Textdateien in den Ordner `rules` der Kampagne gelegt werden.

### 5.4 Ein eigenes Spielsystem hinzufügen oder importieren

Noch nicht: Heute spielt RPG Engine nur die fünfte Edition ([Später geplant](#9-coming-later)).

---

## 6. Erweiterungen <!-- icon: plus -->

Noch nicht. Eine Erweiterung wird einer Kampagne etwas zusätzlich zu ihrem Spielsystem hinzufügen: eine Welt, ein Abenteuer, eine Funktion wie das Wetter, Hausregeln zum Teilen.

---

## 7. Woher eine Kampagne kommt, und ihre Sprache <!-- icon: world -->

### 7.1 Drei Wege zu einer Welt

- **Unterwegs erschaffen**: Aus deiner Prämisse baut die Spielleitung jeden Ort, jede Person und jede Handlung kurz bevor du sie brauchst, und behält sie.
- **Am Anfang vorbereitet**: dasselbe, mit der Welt, die vor dem Spiel aufgebaut wird.
- **Aus deinem eigenen Abenteuer**: Gib der Spielleitung einen Text oder ein PDF und bitte sie, es einzurichten: *[Richte dieses Abenteuer als unsere Kampagne ein. Verrate mir nichts, was darin steht.]* Sie schreibt die Orte, die Figuren und die Geheimnisse. Eine Import-Schaltfläche gibt es noch nicht.

Eine Kampagne wird einmal gespielt: Um dasselbe Abenteuer noch einmal zu spielen, lege eine neue Kampagne an.

### 7.2 Sprachen

Eine Sprache pro Kampagne, die der Spielleitung, der das Dashboard folgt. Das Dashboard bringt 26 Sprachen mit. Jede andere wird auf deinem Computer von Codex oder Claude Code übersetzt oder, ohne sie, von der Spielleitung im Chat. Die Begriffe der fünften Edition auf Italienisch stammen aus dem offiziellen italienischen SRD; der Regeltext bleibt auf Englisch, und die Spielleitung erzählt ihn in deiner Sprache.

---

## 8. Für Neugierige: der Kampagnenordner <!-- icon: list -->

Du musst ihn nie öffnen, und er enthält die Geheimnisse deiner Kampagne. Er enthält `campaign.yaml` (deine Einstellungen), `state.yaml` (der aktuelle Stand des Spiels), `world/` (eine Markdown-Seite für jeden Charakter, jeden Ort, jede Quest und alles Weitere), `rules/` (deine Hausregeln), `images/`, `log.jsonl` (jede Änderung), `.saves/`, `.player/` (deine Notizen) und die kleinen Dateien, die KI-Agenten sagen, wo RPG Engine liegt. Die Seiten nutzen das Format von Obsidian. Wenn du eine Seite von Hand änderst, erfährt die Spielleitung bei der nächsten Antwort davon.

RPG Engine bleibt in diesem Ordner: Es liest und schreibt das Spiel nur hier und fasst deine anderen Dateien nie an. Außerhalb davon legt es nur einen eigenen Datenordner an (die Übersetzungen des Dashboards sowie Codex oder Claude Code, wenn du sie installieren lässt) und temporäre Ordner, während ein Bild gezeichnet wird. Alles andere, was dein Agent auf deinem Computer tun will, fragt er vorher bei dir an.

Jeden Befehl, den die Spielleitung nutzt, kannst du auch im Kampagnenordner ausführen: `rpg --help` listet sie auf. Viele davon zeigen die Geheimnisse der Kampagne an.

---

## 9. Später geplant <!-- icon: hourglass -->

- **Du als Spielleitung**, wobei die KI die Gruppe spielt.
- **Autorenmodus**: ein Abenteuer mit der KI schreiben, dann exportieren und teilen.
- **Mehrere Spielende am selben Computer**, jede Person mit eigenem Charakter, abwechselnd im selben Chat.
- **Erweiterungen**: Einstellungen, Abenteuer, Funktionen und Hausregeln.
- **Import** deiner Regelwerke und Abenteuer.
- **Andere Spiele**: weitere Spielsysteme und deine eigenen.

---

## 10. Fragen und Probleme <!-- icon: info -->

### Fragen

**Muss ich die Regeln kennen?** Nein. Wähle den Mentor Tutorial und frage in Klammern, wann immer du willst.

**Kann die Spielleitung schummeln?** Sie kann einen Wurf, den RPG Engine gemacht hat, nicht ändern, außer bei der Schwierigkeit Geschichte, und auch keine bereits festgelegten Tatsachen.

**Kostet es etwas?** RPG Engine ist kostenlos. Die Spielleitung läuft über den Tarif deines Agenten oder auf deinem eigenen Computer mit einem lokalen Modell. Ein Spielabend ist ein langer Chat: Bei den kleinsten Tarifen kannst du die Grenze des Tarifs erreichen, bevor der Abend zu Ende ist. Bilder und Übersetzungen nutzen denselben Tarif.

**Kann ich auf dem Handy spielen?** Nein: Die Spielleitung läuft auf deinem Computer, und das Dashboard öffnet sich nur dort.

**Kann ich mit Freunden spielen?** Noch nicht: Heute gibt es eine Person, einen Charakter, dazu Begleiter ([Später geplant](#9-coming-later)).

**Kann ich beim nächsten Mal eine andere KI benutzen?** Ja: Öffne die Kampagne in einem anderen Agenten und schreibe *weiter*.

### Probleme

**Das Dashboard öffnet sich nicht.** Frag die Spielleitung: `[Wie lautet der Link zum Dashboard?]`. Es funktioniert nur, solange in dieser Kampagne ein Chat offen ist, nach der ersten Antwort der Spielleitung.

**Die Spielleitung scheint das Spiel nicht zu kennen.** Dein Agent hat RPG Engine nicht geladen. Prüfe, ob du ihn im Kampagnenordner gestartet und dem Ordner vertraut hast. Schreibe in Claude Code `/mcp` und verbinde `rpg` neu. In Codex muss `codex mcp list` im Kampagnenordner `rpg` anzeigen. Wird `rpg --version` nicht gefunden, installiere RPG Engine noch einmal ([2.2](#22-install)).

**Aktualisieren.** Führe `npm install -g rpg-engine` noch einmal aus und öffne dann einen neuen Chat: Eine laufende Spielleitung behält die Version, mit der sie gestartet ist.

**Die Spielleitung erinnert sich an etwas, das ich rückgängig gemacht habe.** Öffne einen neuen Chat und drücke unter Spielstände auf **Ich habe einen neuen Chat geöffnet**.

**Es erscheinen keine Bilder.** Unter Einstellungen > Bilder steht, ob dieser Computer sie erstellen kann und wie.

**Die Installation schlägt fehl, oder `rpg` startet nicht.** `node --version` muss 22 oder neuer anzeigen. Halte RPG Engine und deine Kampagnen unter Windows aus Pfaden heraus, die `&` enthalten.

**Der Link zum Dashboard hat sich geändert.** Ein anderes Programm hat die übliche Adresse belegt; die Spielleitung gibt dir den neuen Link.
