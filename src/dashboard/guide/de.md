<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 d32a17eb 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: die vollständige Anleitung

**RPG Engine** lässt dich ein Pen-&-Paper-Rollenspiel mit einer **KI als Spielleitung** spielen.

Du sprichst mit der Spielleitung in einem **Chat**: Sie erzählt die Geschichte, spielt alle anderen Figuren und entscheidet, was passiert.

RPG Engine arbeitet im Hintergrund: Es **merkt sich die Welt**, **würfelt** und **führt Buch**.

Neben dem Chat hast du im Browser eine Seite geöffnet, das **Dashboard**. Dort findest du den Charakterbogen deines Charakters, die Würfel, die Karten und dein Tagebuch.

Diese Anleitung ist für Spielende: Du musst nicht programmieren können.

## Schnellstart <!-- icon: send -->

1. Installiere **Node.js** von [nodejs.org](https://nodejs.org) (die LTS-Version).
2. Installiere **Claude Code** oder **Codex**, die KI-App, in der die Spielleitung läuft, und melde dich an ([2.4](#24-connect-your-ai)).
3. Öffne ein Terminal und installiere RPG Engine: `npm install -g rpg-engine`.
4. Erstelle im Terminal eine Kampagne: `rpg init "The Salt Isles"`.
5. Öffne Claude Code oder Codex im neuen Ordner und schreib *Hallo! Lass uns anfangen.* Die Spielleitung antwortet mit dem Link zu deinem Dashboard: Öffne ihn neben dem Chat.

Der Rest dieses Handbuchs erklärt jeden Schritt und dann, wie du spielst.

## 1. Was RPG Engine ist <!-- icon: about -->

### Wer macht was

| Wer | Was die Person oder das Programm tut |
|---|---|
| **Du** | Du spielst deinen Charakter. Du sagst, was er tut, sagt und versucht. |
| **Die Spielleitung** (die KI) | Erzählt die Geschichte, spielt alle anderen Figuren, entscheidet, was passiert, und verlangt Würfe. |
| **RPG Engine** | Merkt sich alles in Dateien, würfelt, zählt Trefferpunkte, Geld, Zeit und Entfernungen und hält Geheimnisse zurück, bis du sie entdeckst. |

Eine KI ist gut darin, Geschichten zu erzählen, und schlecht darin, sich Dinge zu merken. Sich selbst überlassen, vergisst sie, wer dir Geld schuldet, wie viele Pfeile du hast oder dass die Brücke vor zwei Sitzungen abgebrannt ist. RPG Engine behält das alles. So bleibt die Welt von einem Abend zum nächsten gleich, auch in einem neuen Chat, sogar mit einer anderen KI.

### Wie es sich anfühlt

Du schreibst im Chat, so wie du am Tisch sprechen würdest:

> Ich drücke die Tür langsam auf und schaue hinein.

Die Spielleitung antwortet mit dem, was du siehst, und hört auf, wenn du an der Reihe bist, dich zu entscheiden. Wenn etwas unsicher und wichtig ist, sagt die Spielleitung, was auf dem Spiel steht, und verlangt einen Wurf. Die Schaltflächen für den Wurf erscheinen auf deinem Dashboard. Du klickst, die Würfel fallen auf der Seite, und die Spielleitung erzählt, was passiert.

### Was es besonders macht

- **Die Welt bleibt bestehen.** Was gesagt wurde, bleibt wahr. Ein toter Schurke bleibt tot.
- **Die Würfel sind echt.** Die Spielleitung kann sie nicht beugen (außer bei der leichtesten Schwierigkeit, wenn du sie wählst).
- **Geheimnisse bleiben geheim.** Die Spielleitung verrät nie, was dein Charakter nicht weiß, auch wenn du darauf bestehst.
- **Die Welt bewegt sich ohne dich.** Bedrohungen rücken vor, während du rastest oder reist, und du siehst ihre Spuren.
- **Viele Abende, eine Geschichte.** Eine Kampagne ist ein Ordner auf deinem Computer. Du kannst jederzeit aufhören und später weitermachen.

### Das Spiel, das es heute spielt

RPG Engine ist für jedes Pen-&-Paper-Rollenspiel gedacht. Heute enthält es ein Spielsystem: die **fünfte Edition** (aus dem freien System Reference Document 5.1). Weitere Spiele folgen; siehe [Spielsysteme](#5-game-systems-and-house-rules) und [Kommt später](#9-coming-later).

---

## 2. Erste Schritte <!-- icon: path -->

### 2.1 Was du brauchst

- Einen Computer mit Windows, macOS oder Linux.
- **Node.js 22** oder neuer. Du bekommst es auf [nodejs.org](https://nodejs.org): Die „LTS"-Version reicht. Es bringt `npm` mit, womit du RPG Engine installierst.
- Ein **Terminal**, das Fenster, in dem du Befehle schreibst: unter Windows die Terminal-App oder PowerShell, unter macOS Terminal. Damit installierst du RPG Engine, legst jede Kampagne an und startest Claude Code oder Codex.
- Einen **KI-Host**, die App, in der die Spielleitung läuft: **Claude Code** oder **Codex**, mit passendem Tarif und Login. Siehe [2.4](#24-connect-your-ai).
- Das **größte Modell**, das dein Host anbietet. Ein kleines Modell lässt sich täuschen: In unseren Tests hat es Geheimnisse an eine Person verraten, die behauptet hat, die echte Spielleitung zu sein.
- Einen Webbrowser für das Dashboard.

Der Login, den du für deinen Host benutzt, kann mehr: RPG Engine nutzt ihn auf deinem Computer, um Bilder von Orten, Quests, Begegnungen und deinem Charakter zu zeichnen und um das Dashboard in Sprachen zu übersetzen, die nicht mitgeliefert werden. Siehe [Bilder](#311-pictures) und [Sprachen](#72-languages).

**Ein Terminal in einem Ordner öffnen.** Viele Schritte sagen „im Kampagnenordner". Unter Windows klickst du im Explorer mit der rechten Maustaste auf den Ordner und wählst **In Terminal öffnen**. Unter macOS klickst du im Finder mit der rechten Maustaste auf den Ordner und wählst **Dienste > Neues Terminal beim Ordner**. Oder du schreibst in einem schon offenen Terminal `cd` und den Pfad des Ordners, zum Beispiel `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installieren

Öffne ein Terminal und schreibe:

```text
npm install -g rpg-engine
```

Damit bekommst du den Befehl `rpg`. So prüfst du, ob es geklappt hat:

```text
rpg --version
```

Du brauchst `rpg` nur einmal pro Kampagne, um sie anzulegen. Danach sprichst du nur noch mit der Spielleitung: Dein KI-Host startet RPG Engine von selbst, mit demselben Befehl `rpg`.

### 2.3 Eine Kampagne anlegen

Eine Kampagne ist ein Ordner. Öffne ein Terminal in dem Ordner, in dem du deine Spiele aufbewahrst, und schreibe:

```text
rpg init "The Salt Isles"
```

Das erstellt den Ordner `The Salt Isles` mit einer neuen Kampagne darin und sagt dir, was als Nächstes zu tun ist:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Die Zeilen nach *For the master* sind für die Spielleitung, die sie im Chat liest: Du musst damit nichts tun. Merk dir, wo der Ordner liegt: Du kehrst jedes Mal dorthin zurück, wenn du spielst. Ohne Ordnernamen macht `rpg init` aus dem Ordner, in dem du bist, die Kampagne.

`init` legt alles an, was die Kampagne braucht: ihre Einstellungen, ihre Weltordner und die kleinen Dateien, die deinem KI-Host sagen, dass er RPG Engine benutzen und außerhalb der Kampagne kein eigenes Gedächtnis führen soll.

Du musst jetzt nichts auswählen. Die Spielleitung fragt dich den Rest im Chat, oder du wählst ihn im Dashboard. Wenn du manche Entscheidungen schon kennst, kannst du sie gleich hier angeben:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Das erstellt den Ordner `salt-isles` mit der Kampagne *The Salt Isles* darin: ein Ordnername ohne Leerzeichen und ein Kampagnenname, wie du ihn willst.

| Option | Was sie festlegt | Werte |
|---|---|---|
| `--name` | Der Name der Kampagne | beliebig; ohne Angabe der Name des Ordners |
| `--language` | Die Sprache des Spiels | ein Code, zum Beispiel `en`, `it`, `fr` |
| `--system` | Das Spielsystem | `5e`, heute das einzige |
| `--difficulty` | Wie hart die Welt spielt | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Was es bedeutet, im Kampf zu fallen | `narrative`, `epic`, `dice` |

`rpg init --help` listet sie ebenfalls auf. Eine Kampagne kann nicht im Ordner einer anderen Kampagne liegen.

Du kannst die Spielleitung nicht bitten, eine Kampagne anzulegen: Vor `init` enthält der Ordner nichts, was deinem KI-Host sagt, wo RPG Engine ist.

### 2.4 Deine KI verbinden

RPG Engine funktioniert mit **Claude Code** und **Codex**. Andere KI-Apps, die MCP-Werkzeuge nutzen, funktionieren vielleicht auch, aber wir garantieren es nicht.

**Deinen Host installieren.** Claude Code und Codex laufen im Terminal: Sie sind nicht die Claude- oder ChatGPT-App auf deinem Handy. Beide brauchen einen eigenen Tarif und Login: Claude Code einen bezahlten Claude-Tarif, Codex einen ChatGPT-Login. Folge den eigenen Seiten der beiden, um sie zu installieren und dich anzumelden: [Claude Code](https://code.claude.com/docs/en/setup) und [Codex](https://learn.chatgpt.com/docs/codex/cli). Das machst du einmal für alle deine Kampagnen.

**Claude Code.** Öffne ein Terminal im Kampagnenordner und schreibe `claude`. Beim ersten Mal fragt es, ob du dem Ordner vertraust, und sagt, dass der Ordner die Werkzeuge des Spiels erlaubt (`mcp__rpg`): Wähle **Yes, I trust this folder**. Vorsicht: Die schon vorausgewählte Antwort ist *No, exit*, daher schließt ein sofortiges Drücken der Eingabetaste Claude Code. Mehr ist nicht nötig: Die Kampagne hat Claude Code bereits gesagt, dass es RPG Engine und seine Werkzeuge benutzen und sein Gedächtnis ausgeschaltet lassen soll.

**Codex.** Öffne ein Terminal im Kampagnenordner und schreibe `codex`. Wenn es fragt, ob du dem Ordner vertraust, sag ja: Die eigenen Einstellungen der Kampagne sagen Codex, wo RPG Engine ist, erlauben seine Werkzeuge und lassen sein Gedächtnis ausgeschaltet, und Codex liest sie nur in einem Ordner, dem du vertraust. Prüfe in der Desktop-App, dass die Erinnerungen für die Chats des Spiels ausgeschaltet sind.

**Warum das Gedächtnis wichtig ist.** Die Kampagne lebt in ihren Dateien. Wenn sich der Host zusätzlich selbst Dinge merkt, wäre das Zurückgehen zu einem Spielstand kein echtes Zurückgehen: Die Spielleitung würde sich weiter an das erinnern, was rückgängig gemacht wurde.

### 2.5 Der erste Chat

Schreibe irgendetwas, zum Beispiel:

> Hallo! Lass uns anfangen.

Die Spielleitung liest, wo das Spiel steht, und antwortet. In ihrer ersten Antwort jedes Chats gibt sie dir den **Link zu deinem Dashboard** (etwa `http://127.0.0.1:4750`). Öffne ihn in deinem Browser und lass ihn das ganze Spiel über neben dem Chat offen. Jede Kampagne behält von Chat zu Chat denselben Link, außer ein anderes Programm hat ihn belegt: Dann gibt dir die Spielleitung den neuen.

Zwischen den Nachrichten der Spielleitung zeigt dein Host die Werkzeuge, die sie benutzt, in kurzen Zeilen. Öffne ihre Details nicht (in Claude Code mit Strg+O): Sie können zeigen, was die Spielleitung schreibt, auch Geheimnisse.

Eine neue Kampagne durchläuft drei Phasen, wie ein Spiel mit einer menschlichen Spielleitung. Das Dashboard zeigt sie oben als *1 Einstellungen · 2 Session Zero · 3 Spiel*:

1. **Einstellungen**: Du wählst, wie du spielen willst. Außerhalb der Geschichte.
2. **Session Zero**: Du erstellst deinen Charakter, im Spiel.
3. **Spiel**: die Geschichte.

### 2.6 Einstellungen: wählen, wie du spielst

Die Spielleitung fragt nur, was noch fehlt, ein paar Fragen auf einmal. Wenn du „du entscheidest" schreibst, wählt die Spielleitung und sagt dir, was sie gewählt hat. Bei geöffnetem Dashboard zeigt der erste Schritt, **Einstellungen**, dieselben Fragen als Karten: eine Frage nach der anderen, jeder Wert mit seiner Bedeutung, der übliche mit **Empfohlen** markiert. Wähle dort, und die Spielleitung fragt im Chat nicht noch einmal; mit **Überspringen** lässt du eine Frage für später. Der Chat klärt, was nur Worte klären können: die Ausgangslage einer neuen Welt, die Sprache und die Bilder, nach denen die Spielleitung nur fragt, wenn dein Computer sie erzeugen kann. Darum stellt die Seite weniger Fragen, als die Tabelle unten aufführt.

Du musst die Tabelle nicht auswendig lernen: Sie ist zum Nachschlagen da. Du kannst jede dieser Einstellungen später ändern, im Chat oder in den **Einstellungen** des Dashboards. Eine Änderung gilt ab der nächsten Antwort der Spielleitung.

| Einstellung | Was sie festlegt | Werte | Empfohlen |
|---|---|---|---|
| **Mentor** (gefragt als „Wie gut kennst du dieses Spiel?") | Wie viel dir die Spielleitung die Regeln beibringt, außerhalb der Geschichte | **aus** (nur die Geschichte; frag in Klammern, wenn du willst), **Hinweise** (ein kurzer Tipp vor wichtigen Entscheidungen und wenn eine Regel untergeht), **Tutorial** (jede Regel beim ersten Mal erklärt, die ganze Rechnung jedes Wurfs, eine kurze Nachbesprechung nach Kämpfen) | nach deiner Antwort: nie gespielt → Tutorial, ein bisschen → Hinweise, ich kenne es → aus |
| **Schwierigkeit** | Wie hart die Welt spielt: Kämpfe, Taktik der Gegner, Hinweise, Schätze, wie schnell Bedrohungen vorrücken | Geschichte, leicht, normal, schwer, brutal | |
| **Tödlichkeit** | Was es bedeutet, im Kampf zu fallen | **erzählerisch** (dein Charakter stirbt nie), **episch** (stirbt nur, wenn es für die Geschichte zählt), **Würfel** (die Würfel entscheiden) | folgt der Schwierigkeit: Geschichte → erzählerisch, leicht → episch, normal und höher → Würfel |
| **Spielstände** | Wann du zurückgehen darfst | **Permadeath** (nie; nur die Kampagne neu beginnen), **Checkpoint** (zurück zum letzten Szenenende, nur wenn dein Charakter stirbt), **frei** (zurück zu jedem Spielstand, und speichern, wann immer du fragst) | Checkpoint |
| **Strenge** | Wie genau Essen, Licht, Erschöpfung, Traglast, Zauberkomponenten und Reisen den Regeln folgen | **locker** (die Spielleitung geht darüber hinweg), **Regeln** (wie geschrieben: Fackeln brennen herunter, Rationen gehen aus), **Simulation** (über die Regeln hinaus: Verschleiß, Verderben, Wetter) | locker |
| **Würfel** | Wer die Würfel deines Charakters wirft | **digital** (RPG Engine würfelt, auf der Seite), **physisch** (du würfelst selbst und nennst die Augen) | |
| **Maßeinheiten** | Entfernungen und Gewichte in der Geschichte | metrisch, imperial | |
| **Begleiter** | Wer mit dir reist | keine, in Session Zero mit dir erstellt, von der Spielleitung erstellt, im Spiel getroffen | |
| **Bilder** | Bilder von Orten, Quests und Begegnungen, und das Porträt deines Charakters auf Wunsch | keine, auf Wunsch, neue Orte, Quests und Begegnungen | einmal gefragt, nur wenn dein Computer sie erzeugen kann |
| **Linien** | Was im Spiel nie vorkommt | eine Liste oder keine | |
| **Schleier** | Was geschehen darf, aber nur außerhalb der Szene | eine Liste oder keine | |
| **Sprache** | Die Sprache des Spiels und des Dashboards | beliebig | aus deiner Schreibweise erkannt und bestätigt |

Das Spielsystem kann eigene Einstellungen hinzufügen. Die fünfte Edition fügt die **Entwicklung** hinzu: wie dein Charakter aufsteigt, mit **Erfahrungspunkten** oder an **Meilensteinen** der Geschichte.

**Was die Schwierigkeit im Spiel bedeutet.** Geschichte: schwache, naive Gegner, offensichtliche Hinweise, reichlich von allem; die Spielleitung darf ihre eigenen Würfe abmildern. Leicht: einfache Gegner, großzügige Ressourcen. Normal: vernünftige Gegner, drei Hinweise für jeden Schluss, übliche Preise und Schätze. Schwer: kluge Gegner, feine Hinweise, knappe Ressourcen, Bedrohungen, die schnell vorrücken. Brutal: Gegner, die Hinterhalte legen, sich zurückziehen und Gefallene erledigen, sehr knappe Ressourcen, die härtesten Rasten. Kämpfe sind immer auf deine Gruppe in ihrem jetzigen Zustand zugeschnitten.

**Ohne eine geschriebene Welt** fragt die Einrichtung zwei weitere Dinge:

- **Ausgangslage**: das Genre, der Ton und ein paar Elemente der Welt, in deinen Worten. Zum Beispiel: *„Low Fantasy, düster, aber mit Hoffnung. Eine Flussstadt, eine spukende Furt, ein Kult in den Hügeln."*
- **Vorbereitung**: **spontan** (die Spielleitung baut jeden Teil der Welt kurz bevor du ihn brauchst; empfohlen) oder **alles am Anfang**.

Danach schlägt die Spielleitung einen Namen für die Kampagne vor. Wenn nichts mehr fehlt und du sagst, dass du bereit bist, geht das Spiel zu Session Zero über.

### 2.7 Session Zero: dein Charakter

Session Zero ist Spiel: Du erstellst deinen Charakter gemeinsam mit der Spielleitung, wie an einem Spieltisch.

- **Jede Entscheidung liegt bei dir**, außer du bittest die Spielleitung, sie zu treffen. Du kannst mit einer fertigen Idee kommen („eine halbelfische Klerikerperson, die den Tempel verlassen hat"), mit einer vagen („jemand, der heilt, aber nicht nett dabei ist") oder mit nichts („überrasch mich, dann lass mich Dinge ändern").
- **Attributswerte.** Die Spielleitung nennt dir die Methode und das Sicherheitsnetz, bevor ein Würfel fällt. In der fünften Edition: die Standardwerte, Point Buy oder 4W6, der niedrigste fällt weg. Die Methode, auf die ihr euch einigt, bleibt in den Absprachen der Runde.
- **Deine Geschichte** ist nie Pflicht. Wenn du eine gibst, schreibt die Spielleitung sie in deinen Worten auf, liest sie dir einmal vor und verknüpft ihre Menschen und Orte mit der Welt. Du kannst sie auch im Dashboard schreiben (siehe [Gruppe](#party)).
- **Persönlichkeit** (fünfte Edition): ein Wesenszug, ein Ideal, eine Bindung und ein Makel, aus den Tabellen deines Hintergrunds oder aus eigenen Ideen.
- **Ein Bild.** Sobald dein Charakter fertig ist, fragt dich die Spielleitung nach einem Bild: eine Datei auf deinem Computer oder ein Porträt, das auf deinem Computer aus deiner Beschreibung erzeugt wird (siehe [das Bild deines Charakters](#37-your-characters-story-and-picture)).

Die Zahlen des Charakterbogens berechnet RPG Engine aus deinen Entscheidungen: Du rechnest nie selbst. Wenn die Charaktere erstellt sind und du bestätigst, beginnt die Geschichte.

---

## 3. Spielen <!-- icon: chat -->

### 3.1 Mit der Spielleitung sprechen

Schreibe in deinen eigenen Worten, was dein Charakter tut oder sagt. Kurz ist in Ordnung.

> Ich frage die Wirtin, wer heute Abend sonst noch hier war.
>
> „Wir suchen keinen Ärger", sage ich, die Hand fern vom Schwert.
>
> Ich klettere aufs Dach und warte.

**Außerhalb der Geschichte** schreibst du in eckigen Klammern:

> [Wie funktioniert Ringen?]
>
> [Kann ich in dieser Runde noch meine Reaktion benutzen?]
>
> [Hören wir für heute Abend hier auf.]

Die Spielleitung antwortet ebenfalls in Klammern und kehrt dann zur Geschichte zurück.

**Du sagst, was du versuchst; die Spielleitung sagt, was passiert.** Was die Logik der Welt oder bereits feststehende Fakten bricht, geschieht nicht: Die Spielleitung sagt es dir innerhalb der Geschichte und bietet an, was möglich ist.

**Die Spielleitung entscheidet nie für deinen Charakter.** Sie lässt dich nicht sprechen, fühlen oder wählen. Im Zweifel fragt sie nach.

**Die Spielleitung spricht nie über die Technik.** Frag sie, ob sie Dinge festhält, und sie antwortet wie eine Spielleitung am Tisch: „Ich behalte alles: Wir machen beim nächsten Mal hier weiter."

**Du kannst die Spielleitung fragen, wie das Dashboard funktioniert.** Sie kennt die Seite: „Wo sehe ich meine Zauber?", „Wie würfle ich von Hand?"

### 3.2 Würfe

**Wann gewürfelt wird.** Die Spielleitung verlangt einen Wurf nur, wenn der Ausgang ungewiss ist und etwas zählt. Sonst sagt sie ja oder „ja, aber". Vor deinem Wurf sagt die Spielleitung, was auf dem Spiel steht und welche Proben passen, und hält dann an. Du würfelst oder überlegst es dir anders:

> **Spielleitung:** Der Vorsprung ist schmal und nass. Wenn du ausrutschst, fällst du tief in den Fluss. Eine Probe auf Geschicklichkeit (Akrobatik), oder du gehst zurück und suchst die Treppe.
>
> **Du:** Ich versuche es.

**Auf dem Dashboard würfeln.** Wenn die Spielleitung fragt, erscheint oben auf der Seite ein Banner mit einem Button für jede Probe, zum Beispiel *Akrobatik +4 · mit Vorteil*. Klicke ihn an: Die Würfel fallen auf der Seite, und die Spielleitung hört das Ergebnis. Du kannst auch:

- die passende Zeile deines Charakterbogens anklicken, die golden aufleuchtet;
- die richtigen Würfel aus der Würfelschale werfen;
- stattdessen im Banner deine eigenen Worte schreiben, wenn du etwas anderes tun willst.

**Von Hand würfeln.** Wenn du die Würfel lieber selbst auswählst, schalte **Von Hand** in der Ecke des Banners ein (oder in den **Einstellungen**). Der Button der Probe verschwindet, und das Banner sagt wie eine Spielleitung, was zu würfeln ist: *Würfle Akrobatik selbst, auf deinem Charakterbogen oder mit den Würfeln.* Klicke die Zeile deines Charakterbogens an, die aufleuchtet, oder wirf die richtigen Würfel aus der Würfelschale: RPG Engine würfelt, addiert deinen Bonus, und die Spielleitung hört das Ergebnis. Eine Probe, die weder dein Charakterbogen noch die Würfelschale ausführen kann, etwa Schaden, bei dem Einsen neu gewürfelt werden, behält ihren Button. Von Hand bleibt in diesem Browser eingeschaltet, bis du es ausschaltest.

**Physische Würfel für das ganze Spiel.** Steht die Einstellung **Würfel** auf physisch, verlangt die Spielleitung deine Würfe in Worten, und du schreibst die gewürfelten Augen:

> [Ich habe eine 14 gewürfelt.]

RPG Engine addiert deine Modifikatoren und lehnt Augen ab, die deine Würfel nicht zeigen können.

**Freie Würfe.** Klicke eine beliebige Zahl auf deinem Charakterbogen an oder öffne die Würfelschale, um einfach so zu würfeln. Freie Würfe zählen nie, werden nie aufgezeichnet, und die Spielleitung sieht sie nie. Eine freie 20 wird später nie zu einer echten.

**Die Würfe der Spielleitung.** Die Spielleitung würfelt für Gegner und andere ebenfalls mit RPG Engine. Die meisten Würfe siehst du in deiner Wurfspalte. Wenn du ein Ergebnis nicht sehen darfst, würfelt die Spielleitung im Geheimen. Du kannst jederzeit fragen:

> [War dieser Wurf echt?]

Bei einem gezeigten Wurf nennt die Spielleitung seine Zahlen und den Grund. Bei einem geheimen gibt sie einen Fingerabdruck, der beweist, dass der Wurf gemacht wurde, bevor du gefragt hast.

**Würfe im Chat** erscheinen in Klammern, direkt nach dem Moment, den sie entscheiden: *[Überzeugen 14 + 3 = 17]*. Dann erzählt die Geschichte den Ausgang.

### 3.3 Szenen und Kämpfe

Die Spielleitung führt die Geschichte in **Szenen**: ein Kampf, ein Gespräch, Erkunden, Reisen, eine Rast, eine Herausforderung (eine Verfolgungsjagd, ein Rennen, ein Rätsel). Du musst sie nicht verwalten: So hält RPG Engine die Kapitel der Geschichte fest. Am Ende jeder Szene speichert das Spiel von selbst, und die Szene wandert in die Geschichte deines Tagebuchs.

**In einem Kampf** erzählt die Spielleitung alle Züge, die nicht deine sind, einen nach dem anderen, mit jedem Wurf, und **hält dort an, wo du entscheiden kannst**: dein Zug, eine Reaktion, eine Wahl. In deinem Zug sagst du, was du tust:

> Ich wirke Heilige Flamme auf den bei der Tür.

Der Bereich **Kampf** des Dashboards zeigt die Reihenfolge der Züge, wer gerade dran ist, die Trefferpunkte deiner Gruppe und wie verletzt die Gegner aussehen (unverletzt, verletzt, blutend, am Boden: in Worten, nie in Zahlen). Wenn dein Charakter fällt, erscheinen die Todesrettungswürfe groß auf der Seite.

**Wenn der Kampf schon entschieden ist**, bietet die Spielleitung vielleicht an, den Rest in einer Nachricht zu erzählen.

### 3.4 Zeit, Reisen und die Welt in Bewegung

**Zeit.** Jede Handlung braucht in der Geschichte Zeit, und RPG Engine führt das Datum: Tag 3, früher Morgen. Die Spielleitung nennt die Zeit so, wie die Welt sie misst: Morgengrauen, die dritte Glocke, Einbruch der Nacht. Zwischen den Sitzungen vergeht keine Zeit: Du machst dort weiter, wo du aufgehört hast.

**Rasten.** Sag, dass ihr rastet, und die Spielleitung wendet an, was eine Rast zurückbringt, etwa Trefferpunkte und Zauberplätze:

> Wir schlagen ein Lager auf und machen eine lange Rast.

**Reisen.** Sag, wohin du willst:

> Wir nehmen die Straße nach Norden Richtung Rocca.

RPG Engine berechnet den Weg, die Entfernung und die Tage in deinem Tempo und bringt dich hin. Eine Reise hält an, wenn unterwegs etwas Geplantes geschieht, am Ende jedes Reisetags und bei der Ankunft. Du kannst fragen, wie weit ein Ort entfernt ist, bevor du aufbrichst:

> [Wie weit ist Rocca, und wie lange würde es zu Fuß dauern?]

**Die Welt bewegt sich ohne dich.** Schurken haben Pläne mit Fristen und Uhren. Mit jedem neuen Tag rückt die Spielleitung die Bedrohungen vor, die die Zeit vorangebracht hat, und du siehst ihre Zeichen: ein Gerücht, eine Spur, eine Veränderung in der Stadt. Die Uhr selbst siehst du nie, nur was sie hinterlässt.

**Geld** wird in den Münzen des Spiels gezählt. Bezahlen, verkaufen, bezahlt werden: RPG Engine gibt das Wechselgeld heraus.

### 3.5 Karten

**Die Weltkarte** (Dashboard: **Welt**) zeigt nur die Orte, die dein Charakter kennt, mit den Straßen dazwischen, dem Weg, den ihr gegangen seid, und dem Nebel über allem anderen. Klicke einen Ort an, um zu sehen, was du über ihn weißt und wie weit er entfernt ist.

**Die Karte eines Ortes** (Dashboard: **Szene**, und **Kampf** in einem Kampf) erscheint, wenn die Spielleitung eine für deinen Aufenthaltsort zeichnet: Wände, Türen, der Boden und wer wo steht, als Spielfiguren. In einem Kampf sind in deinem Zug die Felder, die du nicht erreichst, verschleiert, sodass du auf einen Blick siehst, wohin du kannst. Wenn die Spielleitung fragt, wohin sich dein Charakter bewegt, öffnet die Seite die Karte, und du tippst auf ein Feld oder schreibst es, etwa *E4*.

### 3.6 Quests, Tagebuch und Notizen

**Quests.** Wenn dein Charakter eine Aufgabe übernimmt, wird sie zu einer Quest in deinem **Tagebuch**: wer sie gegeben hat, wo, bis wann, ihre Ziele als Liste und was sie misst (eine Frist mit der verbleibenden Zeit, eine Uhr, ein Zähler). Markiere eine mit ihrem Stern, um ihr zu folgen: Sie bleibt klein oben in der Szene, mit ihrem nächsten Ziel. Die Quest endet, wenn die Geschichte sie beendet, nie von selbst.

**Die Geschichte.** Der Reiter „Geschichte" im Tagebuch ist deine Kampagne als Zeitleiste: jede Szene ein Kapitel, mit Ort, Datum und einer kurzen Zusammenfassung, die letzte zuerst.

**Deine Notizen.** Im Reiter „Notizen" des Tagebuchs schreibst du deine eigenen Notizen: Theorien, Namen, Pläne. Sie bleiben auf deinem Computer, und die Spielleitung liest sie nicht, außer du **Teilen** eine davon. Eine geteilte Notiz erreicht die Spielleitung bei ihrer nächsten Antwort als das, was du denkst, nie als Tatsache. Deine Theorie wird nicht wahr, nur weil du sie aufgeschrieben hast. Eine Notiz, die darum bittet, bestimmte Inhalte zu beenden oder zu meiden, zählt, als hättest du es am Tisch gesagt.

### 3.7 Die Geschichte und das Bild deines Charakters

Auf dem Charakterbogen deines Charakters hat die Karte **Beschreibung** ein Feld, in das du die Geschichte deines Charakters schreibst. Schick sie ab, und die Spielleitung schreibt sie in eigenen Worten in den Charakter ein, nachdem du ja gesagt hast.

Für das Bild deines Charakters gibst du der Spielleitung im Chat eine Bilddatei mit dem Ort, an dem sie auf deinem Computer liegt (PNG, JPEG, WebP oder SVG, bis 5 MB):

> [Hier ist das Porträt meines Charakters: C:\Users\me\Pictures\mira.png]

Die Spielleitung kopiert es in die Kampagne, und es erscheint auf der Spielfigur deines Charakters im Dashboard. Du kannst es jederzeit auf dieselbe Weise ändern.

Oder lass das Porträt erzeugen, wo dein Computer Bilder erzeugen kann (siehe [Bilder](#311-pictures)): Beschreibe der Spielleitung deinen Charakter, oder lass die Spielleitung ihn beschreiben.

> [Mach mir ein Porträt: graues Haar in einem Zopf, eine Narbe am Kinn, müde Augen.]

Das Porträt zeigt genau, was dein Charakter im Spiel ist, sein Volk so, wie diese Welt es kennt, ein Hügelzwerg als Hügelzwerg, mit dem Aussehen, das du beschrieben hast. Es kommt in etwa einer Minute auf der Spielfigur deines Charakters. Deine Begleiter können ihres auf dieselbe Weise bekommen.

### 3.8 Spielstände und Zurückgehen

RPG Engine speichert die ganze Kampagne **am Ende jeder Szene** von selbst. Was du mit diesen Spielständen tun kannst, hängt von der Einstellung **Spielstände** ab:

| Spielstände | Speichern, wann du willst | Zurückgehen |
|---|---|---|
| **Permadeath** | nein | nie; du kannst die Kampagne nur neu beginnen |
| **Checkpoint** | nein | zum letzten Spielstand, nur wenn dein Charakter stirbt |
| **frei** | ja | zu jedem Spielstand, wann du willst |

In jedem Modus kannst du **neu beginnen**: vom Spielbeginn mit demselben Charakter oder von Session Zero mit einem neuen.

Das alles kannst du im Chat tun („[Gehen wir zurück zu vor dem Duell.]") oder im Bereich **Spielstände** des Dashboards.

**Öffne nach dem Zurückgehen einen neuen Chat.** Der Chat, in dem du gespielt hast, erinnert sich an das, was rückgängig gemacht wurde. Öffne einen neuen Chat mit der Spielleitung (`/clear` in Claude Code, `/new` in Codex), schreibe *weiter*, drücke dann **Ich habe einen neuen Chat geöffnet** in den Spielständen oder sag es der Spielleitung im neuen Chat. Setze den alten Chat nie fort. Bis du bestätigst, macht die Spielleitung nicht weiter.

### 3.9 Sitzungen: aufhören und zurückkommen

**Du beendest die Sitzung**, wann du willst:

> [Hören wir für heute Abend hier auf.]

Es gibt kein „Speichern und Beenden": Alles steht schon in den Dateien.

**Um den Chat zu schließen**, schreibe `/exit` in Claude Code oder `/quit` in Codex. Das Dashboard wird still bis zum nächsten Chat.

**Um zurückzukommen**, öffne ein Terminal im Kampagnenordner (dem, den `init` ausgegeben hat), starte dort deinen Host und schreibe *weiter*. Die Spielleitung liest, wo das Spiel steht, gibt dir eine kurze Zusammenfassung und beginnt mit etwas, das passiert. Ein neuer Chat verliert nichts: Die Kampagne lebt in ihren Dateien, nicht im Chat.

Die Spielleitung stellt am Ende keine Routinefragen. Nur wenn ihr aufgefallen ist, dass etwas nicht funktioniert hat, fragt sie kurz nach.

### 3.10 Die Stimmung der Spielleitung

Oben im Dashboard sitzt der Avatar der Spielleitung, ein kleiner Roboter. Sein Gesicht folgt dem Ton der Geschichte: besorgt, wenn die Gefahr wächst, begeistert bei einer kühnen Idee, überrascht bei einer Wendung. Bei einer natürlichen 20 oder einer natürlichen 1 reagiert er einen Moment lang. Er zeigt nie, was du noch nicht weißt: kein Grinsen, bevor die Falle zuschnappt. Die Spielfiguren deiner Gruppe zeigen ebenfalls ihre Stimmungen. Wenn der Chat geschlossen ist, schläft der Roboter.

### 3.11 Bilder

RPG Engine kann für jeden Ort, den du erreichst, jede Quest, die du annimmst, und jeden Charakter oder jede Art von Wesen, denen du begegnest, ein Bild erzeugen lassen, so gezeichnet, wie du sie siehst, wie es die Einstellung **Bilder** sagt, und auf Wunsch das Porträt deines Charakters. Es nutzt, was auf deinem Computer schon vorhanden ist:

- **Codex**, mit deinem ChatGPT-Login: ein gemaltes Bild.
- Sonst **Claude Code**, mit deinem Claude-Login: eine Zeichnung.

Das Bild nutzt deinen eigenen Tarif, nicht unseren. Der Bereich **Einstellungen** sagt dir, ob auf deinem Computer Bilder erzeugt werden können, und wenn nicht, die Schritte zur Einrichtung. Ohne Bilder zeigt die Seite stattdessen das Zeichen der jeweiligen Art von Ort. Du kannst der Spielleitung auch ein eigenes Bild für jeden Ort oder Charakter geben.

### 3.12 Sicherheit: Linien, Schleier und Stopp

- **Linien**: was im Spiel nie vorkommt.
- **Schleier**: was geschehen darf, aber nur außerhalb der Szene.
- **Stopp**: Du kannst jederzeit einen Inhalt stoppen, ohne es zu erklären. Schreibe es außerhalb der Geschichte:

> [stopp]

Die Spielleitung lässt ihn sofort fallen und fügt ihn deinen Linien hinzu, für alle kommenden Sitzungen. Du kannst deine Linien und Schleier in den **Einstellungen** ansehen und ändern.

### 3.13 Deine Meinung ändern

Jede Einstellung kann sich während der Kampagne ändern: im Chat („[Machen wir es schwerer.]") oder in den **Einstellungen**. Die Spielleitung erfährt von einer Änderung bei ihrer nächsten Antwort. Eine Entscheidung, die die Spielleitung ohne das Regelbuch getroffen hat, wird zu einem **Präzedenzfall** und bleibt erhalten, sodass dieselbe Frage beim nächsten Mal dieselbe Antwort bekommt.

---

## 4. Das Dashboard, Bereich für Bereich <!-- icon: party -->

Das Dashboard ist eine Seite auf deinem eigenen Computer. Die Spielleitung gibt dir ihren Link zu Beginn jedes Chats. Es folgt dem Spiel live: Wenn die Spielleitung etwas ändert, ändert sich auch die Seite.

Nur der Browser des Computers, auf dem du spielst, kann sie öffnen: kein Handy und kein Tablet, auch nicht im selben WLAN. Die Seite passt sich auch einem schmalen Fenster an: Dann wandern die Bereiche in eine Leiste am unteren Rand und die Symbole in ein Menü.

Die Seite lebt so lange wie der Chat. Schließt du den Chat, zeigt eine offen gelassene Seite *Nicht verbunden* mit dem Charakterbogen, wie er war, und der Roboter der Spielleitung schläft ein; öffnest du wieder einen Chat in der Kampagne, kommt die Seite von selbst zurück, sobald die Spielleitung geantwortet hat.

### Ganz oben

- Der **Avatar der Spielleitung**, mit seiner Stimmung.
- Der Name der Kampagne, das Spielsystem, die **Spielzeit** und ob das Spiel **verbunden** ist (der Chat angeschlossen).
- Die Bereiche: **Gruppe**, **Szene**, **Kampf** (nur während eines Kampfes), **Tagebuch**, **Welt**; am Ende der Reihe als Symbole: **Spielstände**, **Hilfe**, **Einstellungen**, **Info**.
- Das helle und das dunkle Design, in der oberen rechten Ecke.

Wenn die Spielleitung dich etwas fragt, bleibt ihr Banner oben auf der Seite, in welchem Bereich du auch bist.

### Gruppe

Der Charakterbogen deines Charakters und die deiner Begleiter. Jeder Teil des Charakterbogens ist eine Karte, die du öffnen und schließen kannst.

- **Klick eine Zahl** an, um sie zum Spaß zu würfeln. Zeig auf eine Zahl, um zu sehen, wie sie zustande kommt („+5: Weisheit +3, Übungsbonus +2“).
- **Trefferpunkte, Plätze und Anwendungen** erscheinen als Balken und Punkte.
- **Zustände und Effekte** erscheinen mit ihrer Dauer.
- **Beschreibung** enthält den Text deines Charakters und das Feld, um der Spielleitung die Geschichte deines Charakters zu schicken.
- Bei 0 Trefferpunkten erscheinen die **Todesrettungswürfe** groß unter dem Namen.
- Neben dem Charakterbogen (auf einem schmalen Bildschirm darunter): **die Würfe**, neueste zuerst, deine und die der Spielleitung, die du sehen darfst. **Entfernen** leert die Liste; **Wiederherstellen** bringt sie zurück. Freie Würfe erscheinen gestrichelt und abgedunkelt.

Ein Begleiter mit Werteblock, etwa ein Wolf, zeigt statt eines vollen Charakterbogens seinen Werteblock.

### Szene

Wo deine Gruppe ist: das Bild und der Name des Ortes, die Orte in der Umgebung, die Karte des Ortes, wenn es eine gibt, wer da ist, und die offene Szene mit dem, was gerade passiert. Die Quest, der du folgst, sitzt oben.

### Kampf

Nur während eines Kampfes. Oben: die Runde, wer handelt, wer als Nächstes kommt. Darunter: die Reihenfolge der Züge, jede kämpfende Figur mit ihrem Zustand, deine Gruppe in Zahlen und die Gegner in Worten; was dein Charakter zur Hand hat (Rüstungsklasse, Trefferpunkte, Angriffe); die Karte des Ortes, mit einem Ring um die handelnde Figur. In deinem Zug pulsiert der Link zu Kampf golden, wo auch immer du bist.

### Tagebuch

Drei Tabs:

- **Quests**: aktive, abgeschlossene und gescheiterte, jede als Karte mit ihren Zielen, ihrer Frist als Timer und ihren Uhren. Der Stern folgt einer Quest.
- **Geschichte**: die Kapitel der Kampagne, Szene für Szene, die letzte zuerst.
- **Notizen**: deine eigenen Notizen, privat, bis du eine teilst.

### Welt

Die Weltkarte, wie dein Charakter sie kennt, mit dem Nebel über dem Rest. Zieh, um sie zu verschieben, nutze Mausrad oder Fingergeste zum Zoomen. Klick einen Ort für seine Karte an. Eine Liste der Orte, die nächsten zuerst, steht daneben. Bei mehr als einer Karte (eine Stadt, ein Kontinent, eine andere Ebene) wechseln Tabs zwischen ihnen.

### Die Würfelschale

Die Würfel-Schaltfläche öffnet die Würfelschale: Wähle Würfel und einen Modifikator und wirf. Bei zwei oder mehr Würfeln einer Art wählst du, welche zählen: **Alle**, **Höchste** (nur der höchste) oder **Niedrigste** (nur der niedrigste). Die gewählten Würfel bleiben, bis du **Entfernen** drückst, sodass derselbe Schadenswurf jede Runde nur ein Klick ist. Während die Spielleitung einen Wurf verlangt, sagt dir die Würfelschale, welche Würfel darauf antworten.

### Spielstände

Deine Spielstände, neueste zuerst, jeder mit seinem Ort, dem Spieldatum und dem Zeitpunkt, an dem er erstellt wurde. **Jetzt speichern** (bei freien Spielständen), **Hierher zurückkehren** und **Neu beginnen**, in Rot, in zwei Schritten. Siehe [Spielstände und Zurückgehen](#38-saves-and-going-back).

### Einstellungen

Deine Einstellungen, in Gruppen: das Spiel, das Spiel lernen (der Mentor und die Regeln, die dir schon erklärt wurden), Würfel und Maße, Grenzen (Linien und Schleier), Bilder, Sprache. Klick einen Wert an, um ihn zu wählen; darunter steht, was er bedeutet. Dann die eigenen Vorlieben der Seite, die nur in diesem Browser gespeichert werden: das Design, der Ton der Würfel, das **Würfelset** (Harz, Metall, Holz, Stein), abgerundete oder scharfe Kanten, von Hand würfeln.

Die eigenen Einstellungen der Spielleitung, etwa Hausregeln und Präzedenzfälle, sind nicht hier: Sie bleiben im Chat.

### Hilfe und Info

**Hilfe**: dieses Handbuch. **Info**: was RPG Engine ist, seine Links, seine Lizenzen und die Danksagungen des Spielsystems.

### Vor dem Spiel: Einstellungen und Session Zero

Solange eine neue Kampagne in ihrem ersten Schritt, den **Einstellungen**, ist, stellt die ganze Seite ihre Fragen: eine nach der anderen, jede mit der Bedeutung ihrer Werte und dem empfohlenen. **Du entscheidest** überlässt eine Frage der Spielleitung, außer Linien und Schleier, die immer bei dir liegen; **Überspringen** hebt sie für später auf. Am Ende: **Ich bin bereit**.

### Meldungen der Seite

Manchmal zeigt die Seite einen Hinweis über sich: ein Problem in den Dateien der Kampagne (die Spielleitung behebt es), das Spiel ist weg (der Chat ist geschlossen), die Seite wird übersetzt.

---

## 5. Spielsysteme und Hausregeln <!-- icon: dice -->

### 5.1 Was ein Spielsystem ist

Ein Spielsystem sind die Daten eines Spiels: sein Charakterbogen, seine Zahlen, seine Kreaturen, Gegenstände, Zauber und Regeltexte. Jede Kampagne spielt ein System.

RPG Engine rechnet deinen Charakterbogen aus und verwaltet, was verbraucht wird und zurückkommt, etwa Trefferpunkte und Zauberplätze, so wie es ein digitaler Charakterbogen tut. Wie ein Merkmal oder ein Zauber wirkt, liest die Spielleitung in den Regeln nach und entscheidet es, wie an einem Spieltisch.

### 5.2 Fünfte Edition, enthalten

RPG Engine liefert **5e** mit, aus dem System Reference Document 5.1 (die Regeln von 2014, frei unter Creative Commons). Enthalten sind:

- die Völker, Klassen, Unterklassen, ein Hintergrund und ein Talent aus dem SRD;
- die 319 Zauber, die Waffen, Rüstungen und Ausrüstung, die magischen Gegenstände und die Monster des SRD;
- die Regelkapitel, die die Spielleitung anhand ihres genauen Wortlauts nachschlägt;
- der vollständige Charakterbogen, durchgerechnet: Attributsmodifikatoren, Rettungswürfe, Fertigkeiten, Rüstungsklasse, Angriffe, Zauber-Rettungswurf-SG, Zauberplätze, Trefferwürfel, Merkmale nach Stufe, Erfahrung und Stufenaufstieg;
- Rasten, die zurückbringen, was sie zurückbringen sollen; Zustände mit ihrem Regeltext; Erinnerungen an die Konzentration.

**Inhalte über das SRD hinaus.** Du kannst die fünfte Edition mit Inhalten spielen, die im SRD fehlen, etwa eine Klasse oder ein Monster aus einem Buch, das du besitzt. Die Spielleitung kennt das Spiel, kann deine Regelwerke lesen und im Web suchen. Was sie braucht, schreibt sie als Seiten deiner Kampagne, und RPG Engine arbeitet mit ihnen genauso. Was wir mitliefern, ist durch seine Lizenz begrenzt. Was deine Spielleitung weiß, ist es nicht.

RPG Engine liefert nur eigene oder offen lizenzierte Inhalte mit: für die fünfte Edition das SRD 5.1 unter CC BY 4.0. Alles andere, was in deinem Spiel auftaucht, schreibt deine KI oder du selbst, als Seiten deiner Kampagne auf deinem Computer. Es gehört nicht zu RPG Engine, und wir verbreiten es nicht.

RPG Engine ist mit der fünften Edition kompatibel.

### 5.3 Hausregeln und eigene Ergänzungen

Du musst keine Datei anfassen. Bitte die Spielleitung darum:

> [Hausregel: Bei einer natürlichen 1 auf einen Angriff lässt du deine Waffe fallen.]
>
> [Ich möchte einen Blutjäger spielen. Ich habe das Buch: Hier sind die Klassenmerkmale.]
>
> [In dieser Kampagne dauert eine kurze Rast 10 Minuten.]

Die Spielleitung hält das in deiner Kampagne fest, und zwar auf eine dieser Arten:

- **Eine Absprache am Tisch**, in Worten, wie die fallen gelassene Waffe oder die kurze Rast oben. Die Spielleitung bewahrt sie bei den Einstellungen der Kampagne auf und spielt ab da danach. Entscheidet die Spielleitung etwas ohne das Regelbuch, wird das auf dieselbe Weise als **Präzedenzfall** festgehalten.
- **Eine neue Seite**, etwa eine Klasse, ein Volk oder ein Gegenstand. Eine neue Klasse funktioniert wie die des Systems: Stufe, Trefferwürfel und Merkmale werden mitgezählt. Ein neues Volk kann auf einem bestehenden aufbauen („wie der Elf, plus …"). Ein benanntes Schwert kann auf dem Langschwert aufbauen.
- **Neue Zahlen für den Charakterbogen**: ein Feld, eine Tabelle, eine Formel, ein Zähler, den eine Rast zurückbringt. Zum Beispiel die Überlegenheitswürfel eines Kampfmeisters, die nach einer kurzen Rast zurückkehren. Eine Hausregel kann auch eine der Formeln des Systems ersetzen.

Hast du Hausregeln schon ausgeschrieben, kannst du sie auch als Textdateien in den Ordner `rules` der Kampagne legen (siehe [der Kampagnenordner](#8-for-the-curious-the-campaign-folder)). Die Spielleitung liest sie vor der gleichnamigen Regel des Buchs.

### 5.4 Ein eigenes Spielsystem hinzufügen oder importieren

Derzeit spielt RPG Engine nur die fünfte Edition. Weitere Spielsysteme kommen, ebenso eine Möglichkeit, ein eigenes hinzuzufügen oder ein Spiel, das du besitzt, aus seinen Regelwerken in eines zu verwandeln. Siehe [Kommt später](#9-coming-later).

---

## 6. Erweiterungen <!-- icon: plus -->

**Erweiterungen sind noch nicht verfügbar.** Eine Erweiterung wird einer Kampagne etwas hinzufügen, zusätzlich zu ihrem Spielsystem: eine Welt, ein Abenteuer, eine Funktion wie das Wetter oder ein Tarotdeck, Hausregeln zum Teilen. Du wählst, welche jede Kampagne nutzt. Die ersten geplanten für die fünfte Edition sind Wetter und Schlösserknacken.

---

## 7. Woher eine Kampagne kommt, und ihre Sprache <!-- icon: world -->

### 7.1 Drei Wege zu einer Welt

**Spontan erschaffen.** Du gibst in der Einrichtung eine Ausgangslage vor, und die Spielleitung baut die Welt im Laufe des Spiels: jeden Ort, jede Person und jeden Handlungsstrang kurz bevor du sie brauchst, und danach bleiben sie erhalten. Das ist der schnellste Weg zu spielen: installieren, erstellen, und in ein paar Minuten erschaffst du deinen Charakter. Nichts Erfundenes geht verloren: Einmal gesagt, wird es aufgeschrieben und bleibt wahr.

**Zu Beginn vorbereitet.** Dieselbe Ausgangslage, aber mit der **Vorbereitung: alles zu Beginn** baut die Spielleitung die Orte, Fraktionen, Bedrohungen und ihre Pläne, bevor das Spiel beginnt. Die erste Sitzung beginnt später, mit mehr Vorbereitetem im Hintergrund.

**Aus einer bestehenden Kampagne oder einem Abenteuer.** Heute gibt es keine Import-Schaltfläche. Gib der Spielleitung dein Abenteuer (einen Text oder ein PDF, das dein Host lesen kann) und bitte sie, es einzurichten:

> [Ich habe dieses Abenteuer als PDF. Richte es als unsere Kampagne ein: Lies es und schreib seine Orte, Figuren und Geheimnisse auf. Verrate mir nichts von dem, was darin steht.]

Die Spielleitung liest es mit den Tools deines KI-Hosts und schreibt es als Seiten der Kampagne, Geheimnisse eingeschlossen, die du im Spiel entdecken wirst. Claude Code liest PDFs; bei Codex ist eine Text- oder Markdown-Datei die sicherere Wahl. Mach das während der Einrichtung, vor Session Zero.

Während die Spielleitung arbeitet, öffne die Details dessen, was sie liest oder schreibt, nicht (in Claude Code: ctrl+o): Sie zeigen den Text des Abenteuers samt Geheimnissen. Die Spielleitung selbst hält die Geheimnisse zurück, wie immer.

Sobald die Kampagne eigene Seiten hat, fragt die Einrichtung nicht mehr nach Ausgangslage und Vorbereitung. Auch in einer geschriebenen Kampagne erschafft die Spielleitung, was gebraucht wird, und hält es fest, wenn du irgendwohin gehst, was der Text nicht abdeckt.

**Eine Kampagne wird einmal gespielt.** Um dasselbe Abenteuer noch einmal zu spielen, erstelle eine neue Kampagne. Innerhalb einer Kampagne kannst du weiterhin zu einem Spielstand zurückgehen oder neu beginnen, soweit es die Einstellung Spielstände erlaubt.

### 7.2 Sprachen

**Eine Sprache pro Kampagne**: die der Spielleitung. Die Spielleitung schreibt darin, und das Dashboard folgt ihr. Die Spielleitung erkennt sie an deiner Schreibweise und bestätigt sie.

**Das Dashboard** wird auf Englisch und Italienisch (von Hand betreut) und in 24 weiteren Sprachen mitgeliefert: Französisch, Deutsch, Spanisch, Portugiesisch (brasilianisch), Niederländisch, Schwedisch, Norwegisch, Dänisch, Finnisch, Isländisch, Russisch, Ukrainisch, Polnisch, Tschechisch, Rumänisch, Ungarisch, Griechisch, Türkisch, Arabisch, Hebräisch, Hindi, Chinesisch, Japanisch, Koreanisch. Arabisch und Hebräisch werden von rechts nach links gelesen: Die Seite spiegelt sich, während Karten und Würfel bleiben, wie sie gezeichnet sind.

**Jede andere Sprache**, die du in den Einstellungen wählst, wird auf deinem Computer im Hintergrund von Codex oder Claude Code mit deiner eigenen Anmeldung übersetzt, beginnend mit dem Bereich, den du offen hast. Das geschieht einmal pro Sprache, für alle deine Kampagnen. Bis sie fertig ist, ist die Seite auf Englisch. Die Einstellungen sagen dir, ob die Übersetzung läuft, fertig ist oder auf deinem Computer nicht möglich ist.

**Die Wörter des Spiels.** Die fünfte Edition bringt ihre eigenen Begriffe auf Italienisch aus dem offiziellen italienischen SRD mit, sodass italienische Spielende *Classe Armatura*, *tiro salvezza*, *vantaggio* lesen. Andere Sprachen bekommen die Begriffe des Systems übersetzt.

**Der eigene Text des Spielsystems** (die Zauber, die Monster, die Regelkapitel) bleibt auf Englisch. Die Spielleitung liest ihn und erzählt ihn dir in deiner Sprache.

**Die Sprache mitten in der Kampagne zu wechseln** lässt die schon geschriebenen Seiten unverändert; die Spielleitung schreibt neue in der neuen Sprache.

---

## 8. Für Neugierige: der Kampagnenordner <!-- icon: list -->

Du musst ihn nie öffnen. Falls doch, bedenke: **Er enthält die Geheimnisse** deiner Kampagne, ihn zu lesen verdirbt das Spiel.

Ein Kampagnenordner enthält:

- `campaign.yaml`: deine Einstellungen;
- `state.yaml`: wie das Spiel jetzt steht: seine Phase, das Datum, die offene Szene;
- `world/`: eine Seite pro Charakter, Ort, Fraktion, Quest, Gegenstand, Ereignis, Thema oder Kreatur, als Markdown-Dateien;
- `rules/`: deine Hausregeln als Textdateien, falls du welche hinzufügst (`init` legt ihn nicht an);
- `images/`: die Bilder, sobald es welche gibt;
- `log.jsonl`: jede Änderung, der Reihe nach;
- `.saves/`: die Spielstände, vom ersten an;
- `.player/`: deine eigenen Notizen aus dem Tagebuch, die die Spielleitung nicht liest;
- `sessions/`: von RPG Engine geführt;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: die kleinen Dateien, die KI-Hosts sagen, wo RPG Engine ist, und ihr Gedächtnis ausgeschaltet halten. RPG Engine hält sie aktuell; lass sie, wie sie sind.

Die Seiten sind einfaches Markdown mit Links wie `[[Rocca]]`, dem Format von Obsidian: Das Notizbuch der Spielleitung kann dort geöffnet werden. **Wenn du eine Seite von Hand änderst**, erfährt die Spielleitung bei ihrer nächsten Antwort, was sich geändert hat.

**Die Befehlszeile.** Alles, was die Spielleitung tut, läuft über Befehle, die du im Kampagnenordner auch selbst ausführen kannst. Zum Spielen brauchst du sie nie, und viele geben die Geheimnisse der Kampagne aus, so wie `rpg status` und `rpg show`. `rpg --help` listet sie alle auf, und `rpg roll --help` erklärt einen. Ein Befehl, der etwas ändert, während ein Chat offen ist, ist in Ordnung: Die Spielleitung erfährt davon bei ihrer nächsten Antwort, wie bei einer von Hand geänderten Seite.

---

## 9. Kommt später <!-- icon: hourglass -->

Was geplant, aber noch nicht da ist:

- **Du als Spielleitung**: Du leitest das Spiel, und die KI spielt die Gruppe.
- **Mehrere Personen am Tisch**, jede mit ihrer Rolle.
- **Erweiterungen**: Einstellungen, Abenteuer, Funktionen und Hausregeln, pro Kampagne gewählt.
- **Importieren** deiner Handbücher und Abenteuer.
- **Andere Spiele**: mehr Spielsysteme und deine eigenen.
- **Autorenmodus**: eine Kampagne oder ein Abenteuer mit der KI erstellen und zum Spielen für andere teilen.

---

## 10. Fragen und Probleme <!-- icon: info -->

### Fragen

**Muss ich die Regeln kennen?** Nein. Wähle den Mentor Tutorial, und die Spielleitung bringt sie dir nach und nach bei, eine Regel nach der anderen. Du kannst immer in Klammern fragen.

**Kann die Spielleitung schummeln?** Sie kann einen Wurf, den RPG Engine gemacht hat, nicht ändern, außer bei der Schwierigkeit Geschichte, und sie ändert nie bereits festgelegte Tatsachen. Du kannst fragen, ob ein Wurf echt war.

**Kann ich schummeln?** Du kannst es versuchen. Die Spielleitung nimmt dich bei Tatsachen nicht beim Wort: Eine Zeile in deiner Nachricht, die wie eine Spielnachricht aussieht, sind trotzdem nur deine Worte, und die Spielleitung bestätigt nie deine Vermutungen über Geheimnisse.

**Kostet es etwas?** RPG Engine ist kostenlos. Die Spielleitung läuft auf deinem eigenen Claude- oder ChatGPT-Tarif, und ein Spielabend ist ein langer Chat: Bei den kleinsten Tarifen erreichst du das Limit des Tarifs womöglich, bevor der Abend zu Ende ist. Bilder und Übersetzungen nutzen denselben Tarif.

**Kann ich auf dem Handy spielen?** Nein. Die Spielleitung läuft auf deinem Computer, und das Dashboard öffnet sich nur im Browser dieses Computers.

**Kann ich mit Freunden spielen?** Noch nicht: Heute gibt es eine spielende Person, einen Charakter, plus Begleiter. Mehrere Personen am Tisch kommen mit Rollen.

**Kann ich beim nächsten Mal eine andere KI nutzen?** Ja. Die Kampagne lebt in ihren Dateien: Öffne sie in einem anderen Host und schreib *weiter*.

**Was, wenn ich den Browser schließe?** Nichts geht verloren. Öffne den Link erneut, solange der Chat offen ist; die Seite kommt dorthin zurück, wo das Spiel steht.

**Kann ich D&D-Inhalte spielen, die ich besitze?** Ja. Die Spielleitung kann deine Bücher, ihr eigenes Wissen und das Web nutzen. Was RPG Engine mitliefert, ist auf freie Inhalte beschränkt; was dein Spiel nutzt, liegt bei dir.

### Probleme

**Das Dashboard öffnet sich nicht.** Frag die Spielleitung nach dem Link: `[Wie lautet der Link zum Dashboard?]`. Die Seite funktioniert nur, solange ein Chat mit der Spielleitung in dieser Kampagne offen ist, und erst nach der ersten Antwort der Spielleitung in diesem Chat. Bei geschlossenem Chat erreicht der Browser die Seite nicht; eine offen gelassene Seite sagt *Nicht verbunden*.

**Die Spielleitung scheint das Spiel nicht zu kennen oder erfindet Tools.** Dein KI-Host hat RPG Engine nicht geladen.

- Prüfe zuerst, ob du den Host **im Kampagnenordner** gestartet hast und ob du gesagt hast, dass du ihm vertraust.
- **Claude Code**: Schreib `/mcp`. Wenn `rpg` dort steht, aber fehlgeschlagen ist, wähle es und dann **Reconnect**. Wenn es fehlt, schließ Claude Code, schreib im Kampagnenordner `claude mcp reset-project-choices` und starte es erneut.
- **Codex**: Schreib `codex mcp list` in einem Terminal im Kampagnenordner. Wenn `rpg` fehlt, vertraut Codex dem Ordner nicht: Starte es dort erneut und sag ja, wenn es fragt.
- In beiden Fällen: Wenn `rpg --version` in einem Terminal sagt, dass der Befehl nicht gefunden wurde, installiere RPG Engine erneut ([2.2](#22-install)) und öffne ein neues Terminal.

**Nach einem Update hat sich nichts geändert.** Eine laufende Spielleitung behält die Version, mit der sie gestartet ist. Öffne einen neuen Chat oder verbinde in Claude Code den Server neu (`/mcp`, dann `rpg`, dann **Reconnect**).

**Die Spielleitung erinnert sich an etwas, das ich rückgängig gemacht habe.** Du bist zu einem Spielstand zurückgegangen, hast aber im selben Chat weitergespielt. Öffne einen neuen Chat und drück **Ich habe einen neuen Chat geöffnet** in den Spielständen.

**Die Spielleitung stellt Fragen zur Einrichtung, die ich auf der Seite schon beantwortet habe.** Sag es ihr: `[Das habe ich schon im Dashboard gewählt.]`

**Es erscheinen keine Bilder.** Öffne Einstellungen > Bilder: Dort steht, ob dieser Computer sie erzeugen kann, und wenn nicht, die Schritte, jeder Befehl mit einer Schaltfläche zum Kopieren.

**Die Seite ist auf Englisch, aber ich habe eine andere Sprache gewählt.** Sie wird im Hintergrund übersetzt; die Einstellungen sagen, wie weit das ist. Ohne Codex oder Claude Code auf diesem Computer bleibt sie auf Englisch.

**Die Spielleitung sagt, die Kampagne habe Probleme.** Sie behebt sie von selbst. Wenn du Dateien von Hand bearbeitet hast, fragt sie vielleicht, was du gemeint hast.

**Windows: `npm` schlägt in meinem Ordner fehl.** Leg die Kampagne oder RPG Engine nicht unter einem Pfad ab, der ein `&` enthält.

**Die Installation schlägt fehl, oder `rpg` startet nicht.** Prüfe deine Node.js-Version mit `node --version`: Sie muss 22 oder neuer sein. Wenn sie älter ist, installiere die LTS-Version von [nodejs.org](https://nodejs.org) und installiere dann RPG Engine erneut.

**Der Link zum Dashboard hat sich geändert.** Ein anderes Programm hat die übliche Adresse der Kampagne benutzt, oder Windows hatte sie reserviert. RPG Engine hat eine andere genommen; die Spielleitung gibt dir den neuen Link. Sonst ändert sich nichts.
