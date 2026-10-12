<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine : le guide complet

**RPG Engine** te permet de jouer à un jeu de rôle sur table avec une **IA comme MJ**.

Tu discutes avec le MJ dans un **chat** : le MJ raconte l'histoire, joue tous les autres rôles et tranche ce qui se passe.

RPG Engine travaille en coulisses : il **garde en mémoire le monde**, **lance les dés** et **tient les comptes**.

À côté du chat, tu gardes ouverte dans ton navigateur une page, le **dashboard**, avec la fiche de ton personnage, les dés, les cartes et ton journal.

Ce guide s'adresse aux joueurs et joueuses : tu n'as pas besoin de savoir programmer.

## Démarrage rapide <!-- icon: send -->

1. Installe **Node.js** depuis [nodejs.org](https://nodejs.org) (la version LTS).
2. Installe **Claude Code** ou **Codex**, l'appli d'IA dans laquelle tourne le MJ, et connecte-toi ([2.4](#24-connect-your-ai)).
3. Ouvre un terminal et installe RPG Engine : `npm install -g rpg-engine`.
4. Dans le terminal, crée une campagne : `rpg init "The Salt Isles"`.
5. Ouvre Claude Code ou Codex dans le nouveau dossier et écris *Salut ! On commence.* Le MJ répond avec le lien vers ton tableau de bord : ouvre-le à côté du chat.

La suite de ce guide détaille chaque étape, puis explique comment jouer.

## 1. Ce qu'est RPG Engine <!-- icon: about -->

### Qui fait quoi

| Qui | Ce que ça fait |
|---|---|
| **Toi** | Tu joues ton personnage. Tu dis ce qu'il fait, dit et tente. |
| **Le MJ** (l'IA) | Raconte l'histoire, joue tous les autres personnages, décide de ce qui arrive, demande des jets. |
| **RPG Engine** | Garde tout en mémoire dans des fichiers, lance les dés, compte les points de vie, l'argent, le temps et les distances, et garde les secrets jusqu'à ce que tu les découvres. |

Une IA est douée pour raconter des histoires et mauvaise pour se souvenir. Livrée à elle-même, elle oublie qui te doit de l'argent, combien de flèches il te reste, ou que le pont a brûlé il y a deux sessions. RPG Engine garde tout cela, si bien que le monde reste le même d'un soir à l'autre, même dans un nouveau chat, même avec une autre IA.

### Ce que ça donne

Tu écris dans le chat, comme tu parlerais à une table :

> Je pousse doucement la porte et je regarde à l'intérieur.

Le MJ répond avec ce que tu vois, et s'arrête quand c'est à toi de choisir. Quand quelque chose est incertain et important, le MJ dit ce qui est en jeu et demande un jet. Les boutons du jet apparaissent sur ton tableau de bord. Tu cliques, les dés tombent sur la page, et le MJ te dit ce qui se passe.

### Ce qui le distingue

- **Le monde est persistant.** Ce qui a été dit reste vrai. Un méchant mort reste mort.
- **Les dés sont réels.** Le MJ ne peut pas les truquer (sauf à la difficulté la plus facile, si tu la choisis).
- **Les secrets restent secrets.** Le MJ ne te dit jamais ce que ton personnage ne sait pas, même si tu insistes.
- **Le monde avance sans toi.** Les menaces progressent pendant que tu te reposes ou voyages, et tu en vois les signes.
- **Plusieurs soirées, une seule histoire.** Une campagne est un dossier sur ton ordinateur. Tu peux t'arrêter quand tu veux et reprendre plus tard.

### Le jeu proposé aujourd'hui

RPG Engine est fait pour n'importe quel jeu de rôle sur table. Aujourd'hui, il livre un seul système de jeu : la **cinquième édition** (à partir du System Reference Document 5.1, libre). D'autres jeux viendront ; vois [Systèmes de jeu](#5-game-systems-and-house-rules) et [À venir](#9-coming-later).

---

## 2. Bien démarrer <!-- icon: path -->

### 2.1 Ce qu'il te faut

- Un ordinateur sous Windows, macOS ou Linux.
- **Node.js 22** ou plus récent. Prends-le sur [nodejs.org](https://nodejs.org) : la version « LTS » convient. Il est livré avec `npm`, qui installe RPG Engine.
- Un **terminal**, la fenêtre où l'on écrit des commandes : sous Windows, l'appli Terminal ou PowerShell ; sous macOS, Terminal. Tu t'en sers pour installer RPG Engine, créer chaque campagne et lancer Claude Code ou Codex.
- Un **hôte d'IA**, l'appli dans laquelle tourne le MJ : **Claude Code** ou **Codex**, avec son abonnement et sa connexion. Voir [2.4](#24-connect-your-ai).
- Le **plus grand modèle** que ton hôte propose. Un petit modèle se laisse berner : dans nos tests, il a révélé des secrets à un joueur qui prétendait être le vrai MJ.
- Un navigateur web, pour le tableau de bord.

La connexion que tu utilises pour ton hôte sert aussi à autre chose : RPG Engine l'utilise, sur ton ordinateur, pour dessiner des images de lieux et pour traduire le tableau de bord dans des langues qu'il ne livre pas. Voir [Images](#311-pictures) et [Langues](#72-languages).

**Ouvrir un terminal dans un dossier.** Beaucoup d'étapes disent « dans le dossier de la campagne ». Sous Windows, fais un clic droit sur le dossier dans l'Explorateur de fichiers et choisis **Ouvrir dans le Terminal**. Sous macOS, fais un clic droit sur le dossier dans le Finder et choisis **Services > Nouveau Terminal au dossier**. Ou, dans un terminal déjà ouvert, écris `cd` suivi du chemin du dossier, par exemple `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installer

Ouvre un terminal et écris :

```text
npm install -g rpg-engine
```

Cela te donne la commande `rpg`. Pour vérifier que ça a marché :

```text
rpg --version
```

Tu utilises `rpg` une fois par campagne, pour la créer. Ensuite, tu ne fais que parler avec le MJ : ton hôte d'IA lance RPG Engine tout seul, avec la même commande `rpg`.

### 2.3 Créer une campagne

Une campagne est un dossier. Ouvre un terminal dans le dossier où tu ranges tes jeux, et écris :

```text
rpg init "The Salt Isles"
```

Cela crée le dossier `The Salt Isles` avec une nouvelle campagne dedans, et te dit quoi faire ensuite :

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Les lignes après *For the master* sont destinées au MJ, qui les lit dans le chat : tu n'as rien à en faire. Retiens où se trouve le dossier : tu y reviens à chaque partie. Sans nom de dossier, `rpg init` transforme le dossier où tu te trouves en campagne.

`init` crée tout ce dont la campagne a besoin : ses paramètres, ses dossiers du monde, et les petits fichiers qui disent à ton hôte d'IA d'utiliser RPG Engine et de ne garder aucune mémoire à lui en dehors de la campagne.

Tu n'as rien à choisir maintenant. Le MJ te demande le reste dans le chat, ou tu choisis sur le tableau de bord. Si tu connais déjà certains choix, tu peux les donner ici :

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Cela crée le dossier `salt-isles`, avec la campagne *The Salt Isles* dedans : un nom de dossier sans espaces, et le nom de la campagne comme tu l'aimes.

| Option | Ce qu'elle règle | Valeurs |
|---|---|---|
| `--name` | Le nom de la campagne | au choix ; le nom du dossier si tu l'omets |
| `--language` | La langue du jeu | un code, comme `en`, `it`, `fr` |
| `--system` | Le système de jeu | `5e`, le seul aujourd'hui |
| `--difficulty` | La difficulté du monde | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Ce que signifie tomber en combat | `narrative`, `epic`, `dice` |

`rpg init --help` les liste aussi. Une campagne ne peut pas se trouver dans le dossier d'une autre campagne.

Tu ne peux pas demander au MJ de créer une campagne : avant `init`, le dossier ne contient rien qui dise à ton hôte d'IA où se trouve RPG Engine.

### 2.4 Connecter ton IA

RPG Engine fonctionne avec **Claude Code** et **Codex**. D'autres applis d'IA qui utilisent des outils MCP pourraient fonctionner aussi, mais nous ne le garantissons pas.

**Installer ton hôte.** Claude Code et Codex tournent dans le terminal : ce ne sont pas les applis Claude ou ChatGPT de ton téléphone. Chacun demande son propre abonnement et sa propre connexion : Claude Code un abonnement Claude payant, Codex une connexion ChatGPT. Suis leurs pages pour les installer et te connecter : [Claude Code](https://code.claude.com/docs/en/setup) et [Codex](https://learn.chatgpt.com/docs/codex/cli). Tu le fais une seule fois, pour toutes tes campagnes.

**Claude Code.** Ouvre un terminal dans le dossier de la campagne et écris `claude`. La première fois, il te demande si tu fais confiance au dossier, et indique que le dossier autorise les outils du jeu (`mcp__rpg`) : choisis **Yes, I trust this folder**. Attention : la réponse déjà sélectionnée est *No, exit*, donc appuyer tout de suite sur Entrée ferme Claude Code. C'est tout : la campagne a déjà dit à Claude Code d'utiliser RPG Engine et ses outils, et de désactiver sa mémoire.

**Codex.** Ouvre un terminal dans le dossier de la campagne et écris `codex`. Quand il te demande si tu fais confiance au dossier, réponds oui : les paramètres propres à la campagne disent à Codex où se trouve RPG Engine, autorisent ses outils et désactivent sa mémoire, et Codex ne les lit que dans un dossier de confiance. Dans l'appli de bureau, vérifie que les mémoires sont désactivées pour les chats du jeu.

**Pourquoi la mémoire compte.** La campagne vit dans ses fichiers. Si l'hôte retient aussi des choses de son côté, revenir à une sauvegarde ne ramènerait pas vraiment en arrière : le MJ se souviendrait encore de ce qui a été annulé.

### 2.5 Le premier chat

Écris n'importe quoi, par exemple :

> Salut ! On commence.

Le MJ lit où en est le jeu et répond. Dans sa première réponse de chaque chat, il te donne le **lien vers ton tableau de bord** (quelque chose comme `http://127.0.0.1:4750`). Ouvre-le dans ton navigateur et garde-le à côté du chat pendant toute la partie. Chaque campagne garde le même lien d'un chat à l'autre, sauf si un autre programme l'a pris : le MJ te donne alors le nouveau.

Entre les messages du MJ, ton hôte affiche les outils que le MJ utilise, en lignes courtes. N'ouvre pas leurs détails (dans Claude Code, ctrl+o) : ils peuvent montrer ce que le MJ écrit, secrets compris.

Une nouvelle campagne passe par trois étapes, comme une partie avec un MJ humain. Le tableau de bord les affiche en haut : *1 Paramètres · 2 Session zéro · 3 Jeu*.

1. **Paramètres** : tu choisis comment tu veux jouer. Hors de l'histoire.
2. **Session zéro** : tu crées ton personnage, en jouant.
3. **Jeu** : l'histoire.

### 2.6 Paramètres : choisir comment tu joues

Le MJ ne demande que ce qui manque encore, quelques questions à la fois. Si tu écris « à toi de décider », le MJ choisit et te dit ce qu'il a choisi. Avec le tableau de bord ouvert, sa première étape, **Paramètres**, présente les mêmes questions sous forme de cartes : une question à la fois, chaque valeur avec sa signification, la valeur habituelle marquée **Conseillé**. Choisis là, et le MJ ne reposera pas la question dans le chat ; **Passer** laisse une question pour plus tard. Le chat règle ce que seuls les mots peuvent régler : la prémisse d'un nouveau monde, la langue, et les images, dont le MJ ne parle que si ton ordinateur peut en créer. C'est pourquoi la page pose moins de questions que n'en liste le tableau ci-dessous.

Tu n'as pas besoin d'étudier ce tableau : il est là pour t'y reporter. Tu peux modifier chacun de ces réglages plus tard, dans le chat ou dans les **Paramètres** du tableau de bord. Un changement compte à partir de la prochaine réponse du MJ.

| Réglage | Ce qu'il décide | Valeurs | Conseillé |
|---|---|---|---|
| **Mentor** (demandé sous la forme « Tu connais bien ce jeu ? ») | Combien le MJ t'enseigne les règles, hors de l'histoire | **désactivé** (l'histoire seule ; pose ta question entre crochets quand tu veux), **indices** (un court conseil avant les choix importants et quand une règle passe inaperçue), **tutoriel** (chaque règle expliquée la première fois, le calcul complet de chaque jet, un court bilan après les combats) | selon ta réponse : jamais joué → tutoriel, un peu → indices, je connais → désactivé |
| **Difficulté** | La dureté du monde : combats, tactiques des ennemis, indices, trésors, vitesse des menaces | histoire, facile, normal, difficile, brutal | |
| **Létalité** | Ce que signifie tomber en combat | **narrative** (ton personnage ne meurt jamais), **épique** (meurt seulement quand c'est important pour l'histoire), **dés** (les dés décident) | suit la difficulté : histoire → narrative, facile → épique, normal et au-delà → dés |
| **Sauvegardes** | Quand tu peux revenir en arrière | **mort définitive** (jamais ; tu peux seulement recommencer la campagne), **point de contrôle** (retour à la dernière fin de scène, seulement si ton personnage meurt), **libre** (retour à n'importe quelle sauvegarde, et sauvegarde quand tu veux) | point de contrôle |
| **Rigueur** | À quel point la nourriture, la lumière, la fatigue, le poids porté, les composantes de sorts et les voyages suivent les règles | **fluide** (le MJ les survole), **règles** (à la lettre : les torches s'éteignent, les rations s'épuisent), **simulation** (au-delà des règles : usure, péremption, météo) | fluide |
| **Dés** | Qui lance les dés de ton personnage | **numériques** (RPG Engine les lance, sur la page), **physiques** (tu lances les tiens et tu annonces les faces) | |
| **Unités** | Distances et poids dans l'histoire | métriques, impériales | |
| **Compagnons** | Qui voyage avec toi | aucun, créés avec toi en session zéro, créés par le MJ, rencontrés en jeu | |
| **Images** | Images des lieux et des quêtes | aucune, sur demande, nouveaux lieux et quêtes | demandé une seule fois, seulement si ton ordinateur peut en créer |
| **Lignes** | Ce qui n'apparaît jamais dans le jeu | une liste, ou aucune | |
| **Voiles** | Ce qui peut arriver, mais seulement hors-champ | une liste, ou aucun | |
| **Langue** | La langue du jeu et du tableau de bord | toutes | déduite de ta façon d'écrire, puis confirmée |

Le système de jeu peut ajouter ses propres réglages. La cinquième édition ajoute la **progression** : comment ton personnage monte de niveau, avec des **points d'expérience** ou aux **étapes clés** de l'histoire.

**Ce que la difficulté change en jeu.** Histoire : des adversaires faibles et naïfs, des indices évidents, de tout en abondance ; le MJ peut adoucir ses propres jets. Facile : des adversaires simples, des ressources généreuses. Normal : des adversaires censés, trois indices pour chaque conclusion, des prix et des trésors standard. Difficile : des adversaires malins, des indices subtils, des ressources rares, des menaces qui avancent vite. Brutal : des adversaires qui tendent des embuscades, battent en retraite et achèvent les blessés, des ressources très rares, les repos les plus durs. Les combats sont toujours dimensionnés pour ton groupe tel qu'il est maintenant.

**Sans monde écrit**, la mise en place pose deux questions de plus :

- **Prémisse** : le genre, le ton et quelques éléments du monde, dans tes mots. Par exemple : *« Fantasy sombre, mais avec de l'espoir. Une ville au bord d'une rivière, un gué hanté, un culte dans les collines. »*
- **Préparation** : **à la volée** (le MJ construit chaque partie du monde juste avant que tu en aies besoin ; conseillé) ou **tout au début**.

Le MJ propose alors un nom pour la campagne. Quand il ne manque rien et que tu dis que tu es prêt, le jeu passe à la session zéro.

### 2.7 Session zéro : ton personnage

La session zéro, c'est déjà du jeu : tu crées ton personnage avec le MJ, comme à une table.

- **Chaque choix t'appartient**, sauf si tu demandes au MJ de le faire. Tu peux venir avec une idée complète (« un personnage demi-elfe, clerc, qui a quitté son temple »), une idée vague (« quelqu'un qui soigne, mais sans être gentil ») ou rien du tout (« surprends-moi, puis laisse-moi changer des choses »).
- **Valeurs de caractéristiques.** Le MJ t'explique la méthode et le filet de sécurité avant de lancer le moindre dé. Dans la cinquième édition : la série standard, l'achat de points, ou 4d6 en retirant le plus bas. La méthode convenue reste dans les accords de la table.
- **Ton histoire** n'est jamais obligatoire. Si tu en donnes une, le MJ l'écrit avec tes mots, te la relit une fois, et relie ses personnages et ses lieux au monde. Tu peux aussi l'écrire sur le tableau de bord (voir [Groupe](#party)).
- **Personnalité** (cinquième édition) : un trait, un idéal, un lien et un défaut, tirés des tables de ton historique ou inventés par toi.
- **Une image.** Une fois ton personnage créé, le MJ te demande une image de lui : un fichier sur ton ordinateur. Si ton hôte d'IA peut dessiner des images lui-même, le MJ peut proposer d'en faire une.

Les chiffres de la fiche sont calculés par RPG Engine à partir de tes choix : tu ne fais jamais les additions. Quand les personnages sont créés et que tu confirmes, l'histoire commence.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que ton personnage fait ou dit, avec tes propres mots. Court, c'est très bien.

> Je demande à l'aubergiste qui d'autre est passé ce soir.
>
> « On n'est pas là pour chercher des ennuis », dis-je, la main loin de mon épée.
>
> Je grimpe sur le toit et j'attends.

**Hors de l'histoire**, écris entre crochets :

> [Comment fonctionne la lutte ?]
>
> [Est-ce que je peux encore utiliser ma réaction ce round ?]
>
> [On s'arrête là pour ce soir.]

Le MJ répond aussi entre crochets, puis retourne à l'histoire.

**Tu dis ce que tu tentes ; le MJ dit ce qui arrive.** Ce qui brise la logique du monde ou les faits déjà établis n'arrive pas : le MJ te le dit, dans l'histoire, et propose ce qui est possible.

**Le MJ ne décide jamais à la place de ton personnage.** Il ne te fera ni parler, ni ressentir, ni choisir. Dans le doute, il demande.

**Le MJ ne parle jamais du moteur.** Demande-lui s'il garde une trace des choses, et il répond en MJ : « Je garde tout : on reprend d'ici la prochaine fois. »

**Tu peux demander au MJ comment utiliser le tableau de bord.** Il connaît la page : « Où est-ce que je vois mes sorts ? », « Comment je lance les dés à la main ? »

### 3.2 Les jets

**Quand un jet a lieu.** Le MJ ne demande un jet que si l'issue est incertaine et importante. Sinon, il dit oui, ou « oui, mais ». Avant ton jet, le MJ dit ce qui est en jeu et quels tests conviennent, puis s'arrête. Tu lances, ou tu changes d'avis :

> **MJ :** La corniche est étroite et mouillée. Si tu glisses, c'est une longue chute jusqu'à la rivière. Un test de Dextérité (Acrobaties), ou tu peux faire demi-tour et chercher l'escalier.
>
> **Toi :** Je tente.

**Lancer sur le tableau de bord.** Quand le MJ le demande, une bannière apparaît en haut de la page, avec un bouton pour chaque test, par exemple *Acrobaties +4 · avec avantage*. Clique dessus : les dés tombent sur la page, et le MJ entend le résultat. Tu peux aussi :

- cliquer sur la ligne correspondante de ta fiche, qui s'illumine en or ;
- lancer les bons dés depuis la piste de dés ;
- écrire tes propres mots dans la bannière à la place, si tu veux faire autre chose.

**Lancer à la main.** Si tu préfères choisir les dés toi-même, active **À la main** dans le coin de la bannière (ou dans les **Paramètres**). Le bouton du test disparaît, et la bannière dit quoi lancer, comme le ferait un MJ : *Lance toi-même Acrobaties, sur ta fiche ou avec les dés.* Clique sur la ligne de ta fiche qui s'illumine, ou lance les bons dés depuis la piste de dés : RPG Engine les lance, ajoute ton bonus et le MJ entend le résultat. Un test que ni ta fiche ni la piste de dés ne peuvent faire, comme des dégâts qui relancent les 1, garde son bouton. À la main reste activé dans ce navigateur jusqu'à ce que tu le désactives.

**Des dés physiques pour toute la partie.** Avec le réglage **Dés** sur physiques, le MJ te demande tes jets avec des mots et tu écris les faces que tu as obtenues :

> [J'ai fait 14.]

RPG Engine ajoute tes modificateurs et refuse une face que tes dés ne peuvent pas montrer.

**Jets libres.** Clique sur n'importe quel nombre de ta fiche, ou ouvre la piste de dés, pour lancer juste pour le plaisir. Les jets libres ne comptent jamais, ne sont jamais enregistrés, et le MJ ne les voit jamais. Un 20 libre ne devient jamais un vrai 20 plus tard.

**Les jets du MJ.** Le MJ lance aussi avec RPG Engine pour les ennemis et les autres. La plupart des jets sont affichés dans ta colonne des jets. Quand tu ne dois pas voir un résultat, le MJ lance en secret. Tu peux toujours demander :

> [Ce jet était vrai ?]

Pour un jet affiché, le MJ donne ses chiffres et sa raison. Pour un jet secret, une empreinte qui prouve que le jet a été fait avant que tu demandes.

**Les jets dans le chat** apparaissent entre crochets, juste après le moment qu'ils décident : *[Persuasion 14 + 3 = 17]*. Puis l'histoire raconte l'issue.

### 3.3 Scènes et combats

Le MJ mène l'histoire en **scènes** : un combat, une conversation, une exploration, un voyage, un repos, un défi (une poursuite, une course, une énigme). Tu n'as pas à les gérer : c'est ainsi que RPG Engine tient les chapitres de l'histoire. À la fin de chaque scène, le jeu se sauvegarde tout seul, et la scène entre dans l'histoire de ton journal.

**Dans un combat**, le MJ raconte tous les tours qui ne sont pas les tiens, l'un après l'autre, avec chaque jet, et **s'arrête là où tu peux décider** : ton tour, une réaction, un choix. À ton tour, dis ce que tu fais :

> Je lance Flamme sacrée sur celui qui est près de la porte.

La section **Combat** du tableau de bord montre l'ordre des tours, à qui c'est le tour, les points de vie de ton groupe, et l'état des ennemis (indemne, blessé, en sang, à terre : en mots, jamais en chiffres). Si ton personnage tombe, les jets de sauvegarde contre la mort apparaissent en grand sur la page.

**Quand le combat est déjà décidé**, le MJ peut proposer de raconter la suite en un seul message.

### 3.4 Temps, voyages et monde en mouvement

**Le temps.** Chaque action prend du temps dans l'histoire, et RPG Engine tient la date : jour 3, tôt le matin. Le MJ dit l'heure comme le monde la mesure : l'aube, la troisième cloche, la tombée de la nuit. Entre les sessions, aucun temps ne passe : tu reprends là où tu t'es arrêté.

**Les repos.** Dis que tu te reposes, et le MJ applique ce qu'un repos rend, comme les points de vie et les emplacements de sorts :

> On installe le camp et on prend un repos long.

**Les voyages.** Dis où tu veux aller :

> On prend la route du nord vers Rocca.

RPG Engine calcule le chemin, la distance et les jours à ton allure, et t'y emmène. Un voyage s'arrête quand un événement prévu survient en chemin, à la fin de chaque journée de marche, et à l'arrivée. Tu peux demander à quelle distance se trouve un lieu avant de partir :

> [À quelle distance est Rocca, et combien de temps ça prendrait à pied ?]

**Le monde avance sans toi.** Les méchants ont des plans avec des échéances et des horloges. Chaque nouveau jour, le MJ fait avancer les menaces que le temps a fait progresser, et tu en vois les signes : une rumeur, une trace, un changement en ville. Tu ne vois jamais l'horloge elle-même, seulement ce qu'elle laisse derrière elle.

**L'argent** est compté dans les pièces du jeu. Payer, vendre, être payé : RPG Engine rend la monnaie.

### 3.5 Les cartes

**La carte du monde** (tableau de bord : **Monde**) ne montre que les lieux que ton personnage connaît, avec les routes entre eux, le chemin que tu as parcouru, et le brouillard sur tout le reste. Clique sur un lieu pour voir ce que tu en sais et à quelle distance il se trouve.

**La carte d'un lieu** (tableau de bord : **Scène**, et **Combat** pendant un combat) apparaît quand le MJ en dessine une pour l'endroit où tu te trouves : murs, portes, sol, et qui se tient où, sous forme de pions. Dans un combat, à ton tour, les cases que tu ne peux pas atteindre sont voilées, donc tu vois d'un coup d'œil où tu peux aller. Quand le MJ demande où ton personnage se déplace, la page ouvre la carte et tu touches une case, ou tu l'écris, par exemple *E4*.

### 3.6 Quêtes, journal et notes

**Quêtes.** Quand ton personnage se charge d'une tâche, elle devient une quête dans ton **Journal** : qui l'a confiée, où, pour quand, ses objectifs sous forme de liste, et ce qu'elle mesure (une échéance avec le temps restant, une horloge, un décompte). Marque-en une avec son étoile pour la suivre : elle reste en petit en haut de Scène, avec son prochain objectif. La quête se termine quand l'histoire la termine, jamais toute seule.

**L'histoire.** L'onglet Histoire du Journal est ta campagne sous forme de chronologie : chaque scène est un chapitre, avec son lieu, sa date et un court résumé, la plus récente en premier.

**Tes notes.** Dans l'onglet Notes du Journal, tu écris tes propres notes : théories, noms, plans. Elles restent sur ton ordinateur et le MJ ne les lit pas, sauf si tu en **Partages** une. Une note partagée parvient au MJ à sa prochaine réponse comme ce que tu penses, jamais comme un fait. Ta théorie ne devient pas vraie parce que tu l'as écrite. Une note qui demande d'arrêter ou d'éviter un contenu compte comme si tu l'avais dit à la table.

### 3.7 L'histoire et l'image de ton personnage

Sur la fiche de ton personnage, la carte **Description** contient une zone pour écrire l'histoire de ton personnage. Envoie-la, et le MJ l'écrit dans le personnage avec ses propres mots, après que tu as dit oui.

Pour l'image de ton personnage, donne au MJ un fichier d'image dans le chat, avec son emplacement sur ton ordinateur (PNG, JPEG, WebP ou SVG, jusqu'à 5 Mo) :

> [Voici le portrait de mon personnage : C:\Users\me\Pictures\mira.png]

Le MJ la copie dans la campagne, et elle apparaît sur le pion de ton personnage dans le tableau de bord. Tu peux la changer de la même façon quand tu veux. RPG Engine lui-même ne dessine que des lieux et des quêtes (voir [Images](#311-pictures)).

### 3.8 Sauvegardes et retour en arrière

RPG Engine sauvegarde toute la campagne **à la fin de chaque scène**, tout seul. Ce que tu peux faire de ces sauvegardes dépend du réglage **Sauvegardes** :

| Sauvegardes | Sauvegarder quand tu veux | Revenir en arrière |
|---|---|---|
| **mort définitive** | non | jamais ; tu peux seulement recommencer la campagne |
| **point de contrôle** | non | à la dernière sauvegarde, seulement quand ton personnage meurt |
| **libre** | oui | à n'importe quelle sauvegarde, quand tu veux |

Dans tous les modes, tu peux **recommencer** : depuis le début du jeu avec le même personnage, ou depuis la session zéro avec un nouveau.

Tu peux tout faire dans le chat (« [Revenons à avant le duel.] ») ou dans la section **Sauvegardes** du tableau de bord.

**Après un retour en arrière, ouvre un nouveau chat.** Le chat dans lequel tu jouais se souvient de ce qui a été annulé. Ouvre un nouveau chat avec le MJ (`/clear` dans Claude Code, `/new` dans Codex), écris *continue*, puis appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes, ou dis-le au MJ dans le nouveau chat. Ne reprends jamais l'ancien chat. Tant que tu n'as pas confirmé, le MJ ne continue pas.

### 3.9 Sessions : s'arrêter et revenir

**Tu termines la session** quand tu veux :

> [On s'arrête là pour ce soir.]

Il n'y a pas de « sauvegarder et quitter » : tout est déjà dans les fichiers.

**Pour fermer** le chat, écris `/exit` dans Claude Code, ou `/quit` dans Codex. Le tableau de bord devient silencieux jusqu'au prochain chat.

**Pour revenir**, ouvre un terminal dans le dossier de la campagne (celui qu'`init` a affiché), lance ton hôte dedans et écris *continue*. Le MJ lit où en est le jeu, te fait un court résumé, et commence par quelque chose qui se passe. Un nouveau chat ne fait rien perdre : la campagne vit dans ses fichiers, pas dans le chat.

Le MJ ne pose pas de questions de routine à la fin. Seulement s'il a remarqué que quelque chose n'a pas fonctionné, il demande brièvement.

### 3.10 L'humeur du MJ

En haut du tableau de bord se trouve l'avatar du MJ, un petit robot. Son visage suit le ton de l'histoire : inquiet quand le danger grandit, ravi devant une idée audacieuse, surpris par un rebondissement. Il réagit un instant à un 20 naturel ou à un 1 naturel. Il ne montre jamais ce que tu ne sais pas encore : pas de sourire avant que le piège ne se referme. Les pions de ton groupe montrent aussi leurs humeurs. Quand le chat est fermé, le robot dort.

### 3.11 Images

RPG Engine peut faire créer une image pour chaque lieu où tu arrives et chaque quête que tu prends, selon ce que dit le réglage **Images**. Il utilise ce qui est déjà sur ton ordinateur :

- **Codex**, avec ta connexion ChatGPT : une image peinte.
- Sinon **Claude Code**, avec ta connexion Claude : un dessin.

L'image utilise ton propre abonnement, pas le nôtre. La section **Paramètres** t'indique si des images peuvent être créées sur ton ordinateur, et sinon, les étapes pour le configurer. Sans images, la page affiche à la place le symbole de chaque type de lieu. Tu peux aussi donner au MJ une image à toi pour n'importe quel lieu ou personnage.

### 3.12 Sécurité : lignes, voiles et stop

- **Lignes** : ce qui n'apparaît jamais dans le jeu.
- **Voiles** : ce qui peut arriver, mais seulement hors-champ.
- **Stop** : à tout moment, tu peux arrêter un contenu, sans avoir à t'expliquer. Écris-le hors de l'histoire :

> [stop]

Le MJ l'abandonne aussitôt et l'ajoute à tes lignes, pour toutes les sessions à venir. Tu peux voir et modifier tes lignes et tes voiles dans les **Paramètres**.

### 3.13 Changer d'avis

Chaque réglage peut changer pendant la campagne : dans le chat (« [Rends le jeu plus difficile.] ») ou dans les **Paramètres**. Le MJ prend connaissance d'un changement à sa prochaine réponse. Une décision que le MJ a prise sans le livre devient un **précédent** et est conservée, pour que la même question reçoive la même réponse la prochaine fois.

---

## 4. Le tableau de bord, section par section <!-- icon: party -->

Le tableau de bord est une page sur ton propre ordinateur. Le MJ te donne son lien au début de chaque chat. Il suit le jeu en direct : quand le MJ change quelque chose, la page change aussi.

Seul le navigateur de l'ordinateur où tu joues peut l'ouvrir : pas un téléphone ni une tablette, même sur le même Wi-Fi. La page s'adapte aussi à une fenêtre étroite : les sections passent alors dans une barre en bas, et les icônes dans un menu.

La page vit aussi longtemps que le chat. Ferme le chat, et une page restée ouverte affiche *Non connecté* avec la fiche telle qu'elle était, et le robot du MJ s'endort ; rouvre un chat dans la campagne, et dès que le MJ a répondu, la page revient toute seule.

### En haut

- L'**avatar du MJ**, avec son humeur.
- Le nom de la campagne, le système de jeu, l'**heure du jeu** et si le jeu est **en direct** (le chat est connecté).
- Les sections : **Groupe**, **Scène**, **Combat** (seulement pendant un combat), **Journal**, **Monde** ; au bout de la rangée, sous forme d'icônes : **Sauvegardes**, **Aide**, **Paramètres**, **À propos**.
- Le thème clair et sombre, dans le coin supérieur droit.

Quand le MJ te demande quelque chose, sa bannière reste en haut de la page, quelle que soit la section où tu te trouves.

### Groupe

La fiche de ton personnage, et celles de tes compagnons. Chaque partie de la fiche est une carte que tu peux ouvrir et fermer.

- **Clique sur un nombre** pour le lancer pour le plaisir. Pointe un nombre pour voir comment il est formé (« +5 : Sagesse +3, maîtrise +2 »).
- **Les points de vie, les emplacements et les utilisations** s'affichent sous forme de barres et de pastilles.
- **Les états et les effets** s'affichent avec leur durée.
- **Description** contient le texte de ton personnage, et la zone pour envoyer au MJ l'histoire de ton personnage.
- À 0 point de vie, les **jets de sauvegarde contre la mort** apparaissent en grand sous le nom.
- À côté de la fiche (en dessous sur un écran étroit) : **les jets**, du plus récent au plus ancien, les tiens et ceux du MJ que tu peux voir. **Retirer** vide la liste ; **Restaurer** la ramène. Les jets libres s'affichent en pointillés et atténués.

Un compagnon doté d'un profil de créature, comme un loup, affiche ce profil au lieu d'une fiche complète.

### Scène

L'endroit où se trouve ton groupe : l'image et le nom du lieu, les lieux autour, la carte du lieu s'il y en a une, qui est là, et la scène ouverte avec ce qui se passe maintenant. La quête que tu suis est en haut.

### Combat

Seulement pendant un combat. En haut : le round, qui agit, qui est le suivant. En dessous : l'ordre des tours, chaque combattant avec son état, ton groupe en chiffres et les ennemis en mots ; ce que ton personnage a sous la main (classe d'armure, points de vie, attaques) ; la carte du lieu, avec celui qui agit entouré. À ton tour, le lien Combat pulse en or, où que tu sois.

### Journal

Trois onglets :

- **Quêtes** : en cours, terminées et échouées, chacune sous forme de carte avec ses objectifs, son échéance sous forme de minuteur et ses horloges. L'étoile permet de suivre une quête.
- **Histoire** : les chapitres de la campagne, scène par scène, le dernier en premier.
- **Notes** : tes propres notes, privées jusqu'à ce que tu en partages une.

### Monde

La carte du monde telle que ton personnage la connaît, avec le brouillard sur le reste. Fais glisser pour déplacer, molette ou pincement pour zoomer. Clique sur un lieu pour voir sa carte. Une liste des lieux, du plus proche au plus lointain, se trouve à côté. S'il y a plusieurs cartes (une ville, un continent, un autre plan), des onglets permettent de passer de l'une à l'autre.

### La piste de dés

Le bouton des dés ouvre la piste : choisis des dés et un modificateur, et lance. Avec deux dés d'un même type ou plus, choisis lesquels comptent : **Tous**, **Haut** (seulement le plus haut) ou **Bas** (seulement le plus bas). Les dés que tu as choisis restent jusqu'à ce que tu appuies sur **Retirer**, si bien que le même jet de dégâts se fait en un clic à chaque round. Quand le MJ demande un jet, la piste t'indique quels dés y répondent.

### Sauvegardes

Tes sauvegardes, de la plus récente à la plus ancienne, chacune avec son lieu, la date du jeu et le moment où elle a été faite. **Sauvegarder maintenant** (avec les sauvegardes libres), **Revenir ici**, et **Recommencer**, en rouge, en deux étapes. Voir [Sauvegardes et retour en arrière](#38-saves-and-going-back).

### Paramètres

Tes réglages, en groupes : le jeu, l'apprentissage du jeu (le mentor et les règles qu'on t'a déjà expliquées), les dés et les mesures, les limites (lignes et voiles), les images, la langue. Clique sur une valeur pour la choisir ; en dessous, ce qu'elle signifie. Viennent ensuite les préférences propres à la page, conservées dans ce navigateur seulement : le thème, le son des dés, le **jeu de dés** (résine, métal, bois, pierre), les bords arrondis ou vifs, le lancer à la main.

Les réglages propres au MJ, comme les règles maison et les précédents, ne sont pas ici : ils restent dans le chat.

### Aide et À propos

**Aide** : ce guide. **À propos** : ce qu'est RPG Engine, ses liens, ses licences, et les crédits du système de jeu.

### Avant le jeu : Paramètres et session zéro

Tant qu'une nouvelle campagne est à sa première étape, **Paramètres**, toute la page pose ses questions : une à la fois, chacune avec la signification de ses valeurs et la valeur conseillée. **À toi de décider** laisse une question au MJ, sauf les lignes et les voiles, qui sont toujours à toi ; **Passer** la laisse pour plus tard. À la fin, **C'est parti**.

### Messages de la page

Parfois la page affiche un avis par-dessus elle-même : un problème dans les fichiers de la campagne (le MJ le répare), le jeu absent (le chat est fermé), la page en cours de traduction.

---

## 5. Systèmes de jeu et règles maison <!-- icon: dice -->

### 5.1 Ce qu'est un système de jeu

Un système de jeu, ce sont les données d'un jeu : sa fiche, ses chiffres, ses créatures, ses objets, ses sorts et le texte de ses règles. Chaque campagne joue un seul système.

RPG Engine calcule ta fiche de personnage ainsi que ce qui est dépensé et ce qui revient, comme les points de vie et les emplacements de sorts, comme le fait une fiche de personnage numérique. Comment fonctionne un trait ou un sort, le MJ le lit dans les règles et en décide, comme à une table.

### 5.2 La cinquième édition, incluse

RPG Engine livre la **5e**, à partir du System Reference Document 5.1 (les règles de 2014, libres sous Creative Commons). Elle comprend :

- les races, classes, sous-classes, un historique et un don du SRD ;
- les 319 sorts, les armes, armures et équipements, les objets magiques et les monstres du SRD ;
- les chapitres de règles, que le MJ consulte à partir de leur texte exact ;
- la fiche de personnage complète, calculée : modificateurs de caractéristique, jets de sauvegarde, compétences, classe d'armure, attaques, DD de sauvegarde des sorts, emplacements, dés de vie, aptitudes par niveau, expérience et montée de niveau ;
- des repos qui rendent ce qu'ils doivent rendre ; des états avec leur texte de règle ; des rappels de concentration.

**Du contenu au-delà du SRD.** Tu peux jouer à la cinquième édition avec du contenu que le SRD n'a pas, comme une classe ou un monstre d'un livre que tu possèdes. Le MJ connaît le jeu, peut lire tes manuels et peut chercher sur le web. Il écrit ce dont il a besoin sous forme de pages de ta campagne, et RPG Engine fonctionne de la même façon avec elles. Ce que nous livrons est limité par sa licence ; ce que ton MJ connaît ne l'est pas.

RPG Engine est compatible avec la cinquième édition.

### 5.3 Règles maison et ajouts personnels

Tu n'as pas besoin de toucher à un fichier. Demande au MJ :

> [Règle maison : un 1 naturel à une attaque te fait lâcher ton arme.]
>
> [J'aimerais jouer un Blood Hunter. J'ai le livre : voici les aptitudes de la classe.]
>
> [Dans cette campagne, un repos court dure 10 minutes.]

Le MJ les enregistre dans ta campagne, d'une de ces façons :

- **Un accord de la table**, en mots, comme l'arme lâchée ou le repos court ci-dessus. Le MJ le garde avec les paramètres de la campagne et joue selon lui à partir de là. Une décision que le MJ prend sans le livre est conservée de la même manière, comme **précédent**.
- **Une nouvelle page**, comme une classe, une race ou un objet. Une nouvelle classe fonctionne comme celles du système : ton niveau, tes dés de vie et tes aptitudes la prennent en compte. Une nouvelle race peut s'appuyer sur une race existante (« comme l'Elfe, plus… ») ; une épée nommée peut s'appuyer sur l'Épée longue.
- **De nouveaux chiffres pour la fiche** : un champ, une table, une formule, un compteur qu'un repos restaure. Par exemple, les dés de supériorité d'un Maître de guerre, qui reviennent après un repos court. Une règle maison peut aussi remplacer l'une des formules du système.

Si tu as déjà des règles maison écrites, tu peux aussi les placer sous forme de fichiers texte dans le dossier `rules` de la campagne (voir [le dossier de la campagne](#8-for-the-curious-the-campaign-folder)) : le MJ les lit avant la règle du livre portant le même nom.

### 5.4 Ajouter ou importer ton propre système de jeu

Aujourd'hui, RPG Engine ne joue qu'à la cinquième édition. D'autres systèmes de jeu viendront, ainsi qu'un moyen d'ajouter le tien, ou de transformer un jeu que tu possèdes en système à partir de ses manuels. Voir [À venir](#9-coming-later).

---

## 6. Extensions <!-- icon: plus -->

**Les extensions ne sont pas encore disponibles.** Une extension ajoutera quelque chose à une campagne en plus de son système de jeu : un monde, une aventure, une fonctionnalité comme la météo ou un jeu de tarot, des règles maison à partager. Tu choisiras celles que chaque campagne utilise. Les premières prévues pour la cinquième édition sont la météo et le crochetage.

---

## 7. D'où vient une campagne, et sa langue <!-- icon: world -->

### 7.1 Trois façons d'avoir un monde

**Créé à la volée.** Tu donnes une prémisse lors de la mise en place, et le MJ construit le monde au fur et à mesure : chaque lieu, personne et intrigue juste avant que tu en aies besoin, puis conservé. C'est la façon la plus rapide de jouer : installer, créer, et en quelques minutes tu fais ton personnage. Rien de ce qui est inventé n'est perdu : une fois dit, c'est écrit et cela reste vrai.

**Préparé au début.** Même prémisse, mais avec **Préparation : tout au début**, le MJ construit les lieux, les factions, les menaces du monde et leurs plans avant que le jeu commence. La première session démarre plus tard, avec davantage de matière prête en coulisses.

**À partir d'une campagne ou d'une aventure existante.** Aujourd'hui, il n'y a pas de bouton d'import. Donne ton aventure au MJ (un texte ou un PDF que ton hôte peut lire) et demande-lui de la mettre en place :

> [J'ai cette aventure en PDF. Mets-la en place comme notre campagne : lis-la, et écris ses lieux, ses personnages et ses secrets. Ne me dis rien de ce qu'elle contient.]

Le MJ la lit avec les outils de ton hôte d'IA et l'écrit sous forme de pages de la campagne, secrets compris, que tu découvriras en jouant. Claude Code lit les PDF ; avec Codex, un fichier texte ou markdown est plus sûr. Fais-le pendant la mise en place, avant la session zéro.

Pendant que le MJ travaille, n'ouvre pas les détails de ce qu'il lit ou écrit (dans Claude Code, ctrl+o) : ils montrent le texte de l'aventure, secrets compris. Le MJ, lui, garde les secrets, comme toujours.

Dès que la campagne a ses propres pages, la mise en place cesse de demander une prémisse et une préparation. Même dans une campagne écrite, quand tu vas quelque part que le texte ne couvre pas, le MJ crée ce qu'il faut et l'enregistre.

**Une campagne se joue une seule fois.** Pour rejouer la même aventure, crée une nouvelle campagne. Au sein d'une campagne, tu peux toujours revenir à une sauvegarde ou recommencer, selon ce que permet le réglage Sauvegardes.

### 7.2 Langues

**Une langue par campagne** : celle du MJ. Le MJ écrit dedans, et le tableau de bord la suit. Le MJ la déduit de ta façon d'écrire, et la confirme.

**Le tableau de bord** est livré en anglais et en italien (soignés) et dans 24 autres langues : français, allemand, espagnol, portugais (brésilien), néerlandais, suédois, norvégien, danois, finnois, islandais, russe, ukrainien, polonais, tchèque, roumain, hongrois, grec, turc, arabe, hébreu, hindi, chinois, japonais, coréen. L'arabe et l'hébreu se lisent de droite à gauche : la page se met en miroir, tandis que les cartes et les dés restent tels qu'ils sont dessinés.

**Toute autre langue** que tu choisis dans les Paramètres est traduite sur ton ordinateur, en arrière-plan, par Codex ou Claude Code avec ta propre connexion, en commençant par la section que tu as ouverte. C'est fait une fois par langue, pour toutes tes campagnes. Tant que ce n'est pas prêt, la page est en anglais. Les Paramètres t'indiquent si la traduction est en cours, prête, ou impossible sur ton ordinateur.

**Les mots du jeu.** La cinquième édition apporte ses propres termes en italien, tirés du SRD italien officiel, si bien que les joueurs italiens lisent *Classe Armatura*, *tiro salvezza*, *vantaggio*. Les autres langues reçoivent les termes du système traduits.

**Le texte propre au système de jeu** (les sorts, les monstres, les chapitres de règles) reste en anglais. Le MJ le lit et te le dit dans ta langue.

**Changer de langue en cours de campagne** laisse les pages déjà écrites telles quelles ; le MJ écrit les nouvelles dans la nouvelle langue.

---

## 8. Pour les curieux : le dossier de la campagne <!-- icon: list -->

Tu n'as jamais besoin de l'ouvrir. Si tu le fais, sache qu'**il contient les secrets** de ta campagne : le lire gâche le jeu.

Un dossier de campagne contient :

- `campaign.yaml` : tes réglages ;
- `state.yaml` : où en est le jeu maintenant : son étape, la date, la scène ouverte ;
- `world/` : une page par personnage, lieu, faction, quête, objet, événement, sujet ou créature, sous forme de fichiers markdown ;
- `rules/` : tes règles maison sous forme de fichiers texte, si tu en ajoutes (`init` ne le crée pas) ;
- `images/` : les images, dès qu'il y en a ;
- `log.jsonl` : chaque changement, dans l'ordre ;
- `.saves/` : les sauvegardes, depuis la première ;
- `.player/` : tes propres notes du Journal, que le MJ ne lit pas ;
- `sessions/` : tenu par RPG Engine ;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/` : les petits fichiers qui disent aux hôtes d'IA où se trouve RPG Engine et désactivent leur mémoire. RPG Engine les tient à jour ; laisse-les tels quels.

Les pages sont du markdown simple avec des liens comme `[[Rocca]]`, le format d'Obsidian : le carnet du MJ peut s'y ouvrir. **Si tu modifies une page à la main**, le MJ prend connaissance de ce qui a changé à sa prochaine réponse.

**La ligne de commande.** Tout ce que fait le MJ passe par des commandes que tu peux aussi lancer, dans le dossier de la campagne. Tu n'en as jamais besoin pour jouer, et beaucoup affichent les secrets de la campagne, comme le font `rpg status` et `rpg show`. `rpg --help` les liste toutes, et `rpg roll --help` en explique une. Une commande qui change quelque chose pendant qu'un chat est ouvert ne pose pas de problème : le MJ en prend connaissance à sa prochaine réponse, comme pour une page modifiée à la main.

---

## 9. À venir <!-- icon: hourglass -->

Ce qui est prévu, mais pas encore là :

- **Toi en MJ** : tu mènes le jeu, et l'IA joue le groupe.
- **Plusieurs personnes à la table**, chacune avec son rôle.
- **Extensions** : réglages, aventures, fonctionnalités et règles maison, choisis par campagne.
- **Importer** tes manuels et tes aventures.
- **D'autres jeux** : plus de systèmes de jeu, et les tiens.
- **Mode auteur** : créer une campagne ou une aventure avec l'IA, et la partager pour que d'autres y jouent.

---

## 10. Questions et problèmes <!-- icon: info -->

### Questions

**Est-ce que je dois connaître les règles ?** Non. Choisis le mentor en mode tutoriel et le MJ t'enseigne au fur et à mesure, une règle à la fois. Tu peux toujours poser une question entre crochets.

**Le MJ peut-il tricher ?** Il ne peut pas changer un jet fait par RPG Engine, sauf à la difficulté histoire, et il ne change jamais les faits déjà établis. Tu peux demander si un jet était vrai.

**Est-ce que je peux tricher ?** Tu peux essayer. Le MJ ne te croit pas sur parole pour les faits : une ligne de ton message qui ressemble à un message du jeu reste simplement tes mots, et le MJ ne confirme jamais tes hypothèses sur les secrets.

**Est-ce que ça coûte quelque chose ?** RPG Engine est gratuit. Le MJ tourne sur ton propre abonnement Claude ou ChatGPT, et une soirée de jeu fait un long chat : avec les plus petits abonnements, tu peux atteindre la limite de l'abonnement avant la fin de la soirée. Les images et les traductions utilisent le même abonnement.

**Est-ce que je peux jouer sur mon téléphone ?** Non. Le MJ tourne sur ton ordinateur, et le tableau de bord ne s'ouvre que dans le navigateur de cet ordinateur.

**Est-ce que je peux jouer avec des amis ?** Pas encore : aujourd'hui, une personne, un personnage, plus des compagnons. Plusieurs personnes à la table arriveront avec les rôles.

**Est-ce que je peux utiliser une autre IA la prochaine fois ?** Oui. La campagne vit dans ses fichiers : ouvre-la dans un autre hôte et écris *continue*.

**Et si je ferme le navigateur ?** Rien n'est perdu. Rouvre le lien tant que le chat est ouvert ; la page revient là où en est le jeu.

**Est-ce que je peux jouer du contenu D&D que je possède ?** Oui. Le MJ peut utiliser tes livres, ses propres connaissances et le web. Ce que RPG Engine livre se limite au contenu libre ; ce que ton jeu utilise, c'est à toi de voir.

### Problèmes

**Le tableau de bord ne s'ouvre pas.** Demande le lien au MJ : `[Quel est le lien du tableau de bord ?]`. La page ne fonctionne que tant qu'un chat avec le MJ est ouvert dans cette campagne, et seulement après la première réponse du MJ dans ce chat. Avec le chat fermé, le navigateur ne peut pas atteindre la page ; une page restée ouverte affiche *Non connecté*.

**Le MJ n'a pas l'air de connaître le jeu, ou invente des outils.** Ton hôte d'IA n'a pas chargé RPG Engine.

- D'abord, vérifie que tu as lancé l'hôte **dans le dossier de la campagne**, et que tu as dit que tu lui fais confiance.
- **Claude Code** : écris `/mcp`. Si `rpg` y figure mais en échec, choisis-le, puis **Reconnect**. S'il manque, ferme Claude Code, écris `claude mcp reset-project-choices` dans le dossier de la campagne, et relance-le.
- **Codex** : écris `codex mcp list` dans un terminal, dans le dossier de la campagne. Si `rpg` manque, Codex ne fait pas confiance au dossier : relance-le là et réponds oui quand il le demande.
- Dans les deux cas : si `rpg --version` dans un terminal dit que la commande est introuvable, réinstalle RPG Engine ([2.2](#22-install)) et ouvre un nouveau terminal.

**Après une mise à jour, rien n'a changé.** Un MJ en cours d'exécution garde la version avec laquelle il a démarré. Ouvre un nouveau chat, ou dans Claude Code reconnecte le serveur (`/mcp`, puis `rpg`, puis **Reconnect**).

**Le MJ se souvient de quelque chose que j'ai annulé.** Tu es revenu à une sauvegarde mais tu as continué à jouer dans le même chat. Ouvre un nouveau chat et appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

**Le MJ pose des questions de mise en place auxquelles j'ai déjà répondu sur la page.** Dis-le-lui : `[J'ai choisi ça sur le tableau de bord.]`

**Aucune image n'apparaît.** Ouvre Paramètres > Images : la page indique si cet ordinateur peut en créer, et les étapes sinon, chaque commande avec un bouton pour la copier.

**La page est en anglais alors que j'ai choisi une autre langue.** Elle est en cours de traduction en arrière-plan ; les Paramètres indiquent où ça en est. Sans Codex ni Claude Code sur cet ordinateur, elle reste en anglais.

**Le MJ dit que la campagne a des problèmes.** Il les répare tout seul. Si tu as modifié des fichiers à la main, il peut te demander ce que tu voulais faire.

**Windows : `npm` échoue dans mon dossier.** Ne garde ni la campagne, ni RPG Engine, dans un chemin qui contient `&`.

**L'installation échoue, ou `rpg` ne démarre pas.** Vérifie ta version de Node.js avec `node --version` : elle doit être 22 ou plus récente. Si elle est plus ancienne, installe la version LTS depuis [nodejs.org](https://nodejs.org), puis réinstalle RPG Engine.

**Le lien du tableau de bord a changé.** Un autre programme utilisait l'adresse habituelle de la campagne, ou Windows l'avait réservée. RPG Engine en a pris une autre ; le MJ te donne le nouveau lien. Rien d'autre ne change.
