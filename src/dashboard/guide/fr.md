<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine : le guide complet

**RPG Engine** te permet de jouer à un jeu de rôle sur table avec une **IA comme MJ**. Tu joues dans le **tableau de bord**, une fenêtre sur ton ordinateur avec ta fiche, les dés, les cartes, ton journal et le **chat** avec le MJ. RPG Engine travaille en coulisses : il **garde en mémoire le monde**, **lance les dés** et **tient les comptes**.

Ce guide s'adresse aux joueurs et joueuses : tu n'as pas besoin de savoir programmer.

## Démarrage rapide <!-- icon: send -->

1. Installe **Node.js** depuis [nodejs.org](https://nodejs.org) (la version LTS).
2. Une seule fois, dans un nouveau terminal ouvert après l'installation de Node.js, installe RPG Engine : `npm install -g rpg-engine`. Si Windows répond que l'exécution de scripts est désactivée, écris une fois `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, réponds oui et réessaie.
3. Écris `rpg open`. Il demande s'il doit mettre l'icône de RPG Engine sur ton bureau et dans ton menu : appuie sur Entrée pour dire oui. Ensuite, tu lances RPG Engine depuis son icône, sans terminal ([2.2](#22-install)).
4. Une fenêtre affiche tes campagnes. Appuie sur **Nouvelle campagne**, donne-lui un nom et appuie sur **Créer** ([2.3](#23-create-a-campaign)) : son tableau de bord s'ouvre dans une fenêtre à part.
5. Dans le chat avec le MJ, choisis ton appli d'IA et son modèle : Claude Code demande un abonnement Claude payant, Codex un compte ChatGPT, gratuit ou payant ([2.4](#24-connect-your-ai)). Si l'appli manque, ou si tu n'es pas connecté, la page l'installe ou te connecte. Appuie sur **Ouvrir le chat**, puis sur **Commencer**. La première réponse peut prendre quelques minutes ; ensuite, le MJ te demande comment tu veux jouer, et vous créez ton personnage ensemble.

## 1. Qu'est-ce que RPG Engine <!-- icon: about -->

| Qui | Ce qu'il fait |
|---|---|
| **Toi** | Tu joues ton personnage : ce qu'il fait, dit et tente. |
| **Le MJ** (l'IA) | Raconte l'histoire, joue tous les autres personnages, décide de ce qui arrive, demande des jets. |
| **RPG Engine** | Garde le monde dans des fichiers, lance les dés, compte les points de vie, l'argent, le temps et les distances, garde les secrets jusqu'à ce que tu les découvres. |

Le monde reste le même d'une soirée à l'autre, même dans un nouveau chat, même avec une autre IA :

- **Ce qui a été dit reste vrai.** Un méchant mort reste mort.
- **Les dés sont réels.** Le MJ ne peut pas les truquer, sauf à la difficulté la plus facile, si tu la choisis.
- **Les secrets restent secrets.** Le MJ ne te dit jamais ce que ton personnage ne sait pas.
- **Le monde bouge.** Les menaces avancent pendant que vous vous reposez ou voyagez, et tu en vois les signes.
- **Une campagne est un dossier** sur ton ordinateur : arrête-toi quand tu veux, reprends plus tard.

Un jeu prend la forme d'un système de jeu, un paquet que le MJ installe pour ta campagne. Aujourd'hui, le nôtre est la **cinquième édition**, tirée du System Reference Document 5.1, gratuit. Sans système de jeu, tu joues librement, une histoire sans chiffres. D'autres viendront ([À venir](#9-coming-later)).

---

## 2. Pour commencer <!-- icon: path -->

### 2.1 Ce qu'il te faut

- Un ordinateur sous Windows, macOS ou Linux, et un navigateur web.
- **Node.js 24** ou plus récent, sur [nodejs.org](https://nodejs.org). Il apporte `npm`, qui installe RPG Engine.
- Un **terminal**, une seule fois, pour installer RPG Engine : sous Windows, Terminal ou PowerShell ; sous macOS, Terminal. Pour en ouvrir un dans un dossier, fais un clic droit sur le dossier et choisis **Ouvrir dans le Terminal** (Windows) ou **Services > Nouveau terminal au dossier** (macOS). Si Windows répond que l'exécution de scripts est désactivée, écris une fois `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` et réponds oui.
- Une **appli d'IA** pour le MJ, avec ton propre compte ([2.4](#24-connect-your-ai)) : la page peut l'installer pour toi. Joue avec le **plus grand modèle** qu'elle propose : un petit modèle se laisse plus facilement convaincre de révéler des secrets ou de contourner les règles.

### 2.2 Installer

```text
npm install -g rpg-engine
rpg open
```

La première ligne installe RPG Engine ; `rpg --version` vérifie que tout a fonctionné. Si npm propose de se mettre à jour, tu peux l'ignorer.

`rpg open` ouvre la fenêtre de RPG Engine, avec tes campagnes. La première fois, il demande dans le terminal s'il doit ajouter son icône à ton bureau et à ton menu Démarrer (Applications sur un Mac) : appuie sur Entrée pour dire oui. Ensuite, tu double-cliques sur l'icône, et tu n'as plus besoin du terminal. Sans l'icône, écris `rpg open` à chaque partie ; `rpg icon` ajoute l'icône plus tard, et `rpg icon --remove` l'enlève.

### 2.3 Créer une campagne

La fenêtre de RPG Engine affiche tes campagnes sous forme de cartes, la dernière ouverte en premier. Appuie sur **Nouvelle campagne**, puis renseigne son **Nom**, sa **Langue** et son **Système de jeu** : le MJ fait le reste avec toi. Elle est rangée dans un dossier à son nom, dans le dossier `RPG Engine` de ton dossier personnel (sous Windows, `C:\Users\<nom>`) ; **Choisir un autre dossier…** la place dans un dossier vide de ton choix. Sous **Le MJ**, tu peux déjà choisir l'appli d'IA et le modèle de son premier chat ([2.4](#24-connect-your-ai)). Appuie sur **Créer** : le tableau de bord de la campagne s'ouvre dans une fenêtre à part.

La fois suivante, clique sur une carte pour ouvrir sa campagne ; une campagne ouverte indique **Ouverte en ce moment**. **Ouvrir un dossier…** ajoute une campagne que tu as déjà sur cet ordinateur. La petite croix sur une carte la retire de la liste : ses fichiers restent où ils sont.

### 2.4 Connecter ton IA

Le MJ tourne dans une **appli d'IA** sur ton ordinateur, avec ton propre compte : Claude Code, Codex, OpenCode ou Antigravity. Un simple chat comme claude.ai ou ChatGPT, ou une appli de téléphone, ne suffit pas : le MJ doit pouvoir accéder aux fichiers de la campagne sur ton ordinateur. Chaque appli demande son propre compte : Claude Code un abonnement Claude payant (Pro ou supérieur) ; Codex un compte ChatGPT, gratuit ou payant ; Antigravity un compte Google, dont l'offre gratuite a des limites hebdomadaires ; OpenCode propose quelques modèles gratuits pour une durée limitée, ou utilise ceux de ton propre fournisseur, y compris les modèles locaux.

Dans le chat du tableau de bord, choisis l'appli sous **Ton appli d'IA**, puis son **Modèle** et la **Réflexion du MJ** : la page te les propose. Plus de réflexion, c'est plus lent et cela consomme davantage ton abonnement. Une appli qui n'est pas prête dit ce qu'il lui faut, avec un bouton qui s'en charge :

- **Claude Code** et **Codex** : **Installer Claude Code** ou **Installer Codex** le télécharge dans le dossier propre à RPG Engine sur cet ordinateur ; **Se connecter à Claude Code** ou **Se connecter à Codex** ouvre sa page de connexion dans ton navigateur. RPG Engine ne voit jamais ton mot de passe.
- **OpenCode** et **Antigravity** : **Obtenir OpenCode** ou **Obtenir Antigravity** ouvre son site, où tu l'installes. OpenCode fonctionne sans connexion ; Antigravity se connecte depuis sa propre appli. Reviens ensuite et appuie sur **Revérifier**.

Antigravity est marqué **en test** : il peut sortir du jeu et poser des questions à sa façon, donc Claude Code, Codex ou OpenCode conviennent mieux pour jouer. Antigravity garde tes anciens chats, et sa mémoire ne peut pas être désactivée : le MJ a pour consigne de ne jamais les lire. Ce que tu écris part chez Google, qui peut le faire relire par des personnes : ne mets pas de données personnelles dans la partie. RPG Engine n'est pas un produit Google. Nous jouons et testons surtout avec **Claude Code** : aucune campagne entière n'a encore été jouée avec les autres.

Dans le chat du tableau de bord, le MJ ne touche à ton ordinateur que par RPG Engine : il n'ouvre aucun de tes fichiers de lui-même. RPG Engine ne lit hors de la campagne que ce que tu as choisi, après ton accord dans une fenêtre de ton ordinateur.

Tu peux aussi jouer dans le chat propre à ton appli d'IA, dans un terminal ou dans son appli de bureau ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Le premier chat

Une fois l'appli et le modèle choisis, appuie sur **Ouvrir le chat** : l'appli démarre, ce qui peut prendre quelques secondes. Ensuite, appuie sur **Commencer**, ou écris n'importe quoi, par exemple *Salut ! On commence.* La première réponse peut prendre quelques minutes, le temps que le MJ installe la scène.

Le chat a sa propre section, **Roleplay**, ou se place à côté de la page : les petits boutons en haut du chat le mettent **Dans son onglet**, **À gauche** ou **À droite**, et tu fais glisser son bord pour l'élargir.

Une nouvelle campagne passe par trois étapes, affichées en haut du dashboard : **1 Paramètres** (comment tu veux jouer), **2 Session zéro** (tu crées ton personnage, en jouant), **3 Jeu**.

### 2.6 Paramètres : choisir comment tu joues

Le MJ ne demande que ce qui manque encore, quelques questions à la fois ; l'étape **Paramètres** du dashboard montre les mêmes questions sous forme de cartes. Écris « décide toi-même » et le MJ choisit. Tout peut changer plus tard, dans le chat ou dans **Paramètres**.

| Réglage | Ce qu'il décide | Valeurs |
|---|---|---|
| **Mentor** | Combien le MJ t'enseigne les règles | désactivé, indices, tutoriel |
| **Difficulté** | Le degré de dureté du monde | histoire, facile, normal, difficile, brutal |
| **Létalité** | Ce que signifie tomber en combat | narrative (jamais de mort), épique (seulement quand ça compte), dés |
| **Sauvegardes** | Quand tu peux revenir en arrière | mort définitive, point de contrôle, libre ([3.8](#38-saves-and-going-back)) |
| **Rigueur** | À quel point la nourriture, la lumière et les voyages suivent les règles | fluide, règles, simulation |
| **Dés** | Qui lance tes dés | numériques, physiques |
| **Unités** | Distances et poids | métriques, impériales |
| **Voix des personnages** | Qui parle pour les personnages que tu rencontres, du MJ aux personnages : toujours le MJ ; aux moments clés, le personnage lui-même, qui ne sait que ce qu'il sait, selon le choix du MJ ; ou toujours le personnage, pour les principaux ou pour tous, plus lent et plus coûteux, là où ton appli d'IA le permet | le MJ, parfois, personnages principaux, tous |
| **Ton personnage** | Comment ton personnage est créé en session zéro | avec le MJ, par le MJ, le tien ([2.7](#27-session-zero-your-character)) |
| **Compagnons** | Qui voyage avec toi | aucun, créés avec toi, créés par le MJ, rencontrés en jeu |
| **Images** | Images des lieux, des quêtes et des personnages rencontrés | aucune, sur demande, nouveaux lieux, quêtes et personnages rencontrés ([3.11](#311-pictures)) |
| **Lignes** et **Voiles** | Ce qui n'apparaît jamais, et ce qui se passe seulement hors champ | listes |
| **Langue** | La langue du jeu et du dashboard | toutes |

La cinquième édition ajoute la **progression** : points d'expérience ou paliers.

Si tu n'as pas de monde écrit, le MJ demande aussi une **prémisse** (le genre, le ton, quelques éléments, et ce que tu préfères dans un jeu, comme les combats, les mystères, les dialogues ou l'exploration, avec tes propres mots), la **préparation** : construire le monde au fil du jeu, ou tout au début ; et la **durée** : une soirée, quelques sessions (de trois à cinq soirées), ou ouverte, une aventure après l'autre. À la fin d'une histoire d'une durée donnée, tu peux toujours continuer.

**Le style du MJ** n'est jamais demandé, mais tu peux le changer dans le chat ou dans **Paramètres** : la **Narration** (simple, littéraire, pulp, pince-sans-rire), les **Histoires** que le MJ invente (situations, arcs, épisodes, mystère), un auteur pour **Écrire comme**, ou toute autre chose **Avec tes mots**.

### 2.7 Session zéro : ton personnage

Tu crées ton personnage avec le MJ, comme à une table. Chaque choix t'appartient, sauf si tu demandes au MJ de le faire : viens avec une idée complète, une idée vague, ou rien du tout ; ou demande au MJ de tout créer à partir de quelques mots. Dans un jeu à niveaux, le MJ demande à partir de quel niveau tu commences : le premier, sauf si tu en veux un autre. Le MJ t'explique comment sont obtenus les scores de caractéristiques avant qu'un seul dé soit lancé. Ton histoire n'est jamais obligatoire ; si tu en donnes une, le MJ la rédige avec tes mots. Ensuite, le MJ te propose une image de ton personnage ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcule la fiche : tu n'as jamais à faire les additions.

Tu as déjà un personnage, d'un autre jeu ou d'une autre campagne ? Choisis **J'en ai déjà un** dans la configuration et donne-le au MJ : colle la fiche dans le chat. Dans le chat propre à ton appli d'IA, tu peux aussi indiquer où se trouve son fichier sur ton ordinateur (un PDF, une image, un texte) ; dans le chat du tableau de bord, le MJ n'ouvre aucun de tes fichiers. Le MJ le reprend tel quel, à son niveau, le vérifie au regard des règles et du monde, et s'accorde avec toi sur tout ce qui ne colle pas.

### 2.8 L'autre façon : le chat propre à ton appli d'IA

Tu peux aussi jouer dans le chat de ton appli d'IA elle-même, dans un terminal ou dans son appli de bureau, avec le tableau de bord ouvert à côté. Dans ce cas, tu crées la campagne dans un terminal, dans le dossier où tu ranges tes jeux ([2.1](#21-what-you-need) explique comment), toujours avec son nom : `rpg init "The Salt Isles"` crée le dossier `The Salt Isles` avec une nouvelle campagne dedans. RPG Engine y prépare tout seul ce dont chaque appli a besoin.

Lance ton appli dans ce dossier : `claude` pour Claude Code, `codex` pour Codex, `agy` pour Antigravity, `opencode` pour OpenCode ; ou ouvre le dossier dans son appli de bureau. Réponds oui quand elle demande si tu fais confiance au dossier : attention, dans Claude Code, la réponse déjà sélectionnée est *No, exit*. Tout autre agent compatible MCP peut aussi être le MJ : lance-le dans le dossier de la campagne et donne-lui le serveur MCP `rpg mcp`.

Écris *Salut ! On commence.* Dans sa première réponse de chaque chat, le MJ te donne le **lien vers ton tableau de bord**, quelque chose comme `http://127.0.0.1:4750` : ouvre-le à côté du chat.

- Entre les messages du MJ, ton appli affiche les outils qu'elle utilise : n'ouvre pas leurs détails (dans Claude Code, ctrl+o), ils peuvent montrer des secrets.
- La campagne désactive la mémoire propre à l'appli : la partie vit dans ses fichiers, pour qu'un retour à une sauvegarde revienne vraiment en arrière. Dans l'appli de bureau de Codex, vérifie dans les paramètres que les mémoires sont désactivées pour les chats du jeu.
- Si le MJ dit qu'il ne trouve pas les outils de RPG Engine, écris `rpg init` dans le dossier de la campagne, puis ouvre un nouveau chat.
- Un seul chat à la fois joue une campagne : tant que le tien est ouvert, le chat du tableau de bord attend.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que fait ou dit ton personnage, avec tes propres mots :

> Je demande à l'aubergiste qui d'autre est passé ce soir.

Pour parler hors de l'histoire, écris `[OOC: …]` (hors personnage) : *[OOC: Comment fonctionne la lutte ?]* Le MJ répond de la même façon ; dans le chat du tableau de bord, ses propos hors jeu sont mis à part, marqués OOC.

Dans le chat du tableau de bord, écris dans la zone en bas et appuie sur Entrée pour envoyer ; Maj+Entrée passe à la ligne. Pendant que le MJ répond, **Arrêter** l'interrompt, et tes mots attendent dans la zone. Quand le MJ te pose une question, ses boutons accompagnent la question, jets compris : clique sur l'un d'eux, ou écris ta réponse. Sous la zone, tu vois l'appli et le modèle ; là où l'appli le permet, clique sur le modèle pour le changer une fois que le MJ a répondu. **Fermer le chat** termine le chat ; la partie reste dans ses fichiers.

Tu dis ce que tu tentes ; le MJ dit ce qui arrive. Le MJ ne décide jamais à la place de ton personnage, et ne parle jamais du moteur de jeu. Tu peux lui demander comment utiliser le tableau de bord.

**Agir depuis le tableau de bord** : clique sur un nom de ta fiche, comme une arme, un sort ou un objet que tu portes : sa carte explique ce que c'est. Un sac s'ouvre avec sa flèche, et son ⓘ montre sa carte. Choisis ce que tu en fais. Une action qui ne vise personne, comme **Équiper**, te demande de confirmer sur le même bouton, *Confirmer : j'équipe Bouclier* : appuie encore une fois et elle part au MJ. Une action faite à quelqu'un, comme **Attaquer**, demande qui est visé, dans la liste ou d'un clic sur la carte ; le bouton dit alors la phrase entière, *J'attaque Bandit encapuchonné 1 avec Masse*, et un clic l'envoie. Pour le dire à ta façon, clique sur une personne pour lui parler, ou écris dans le chat. Le MJ l'entend comme si tu l'avais dit dans le chat, tranche comme pour toute autre action, et te demande avec des boutons ce que tu as laissé de côté. Si ton appli d'IA ne peut pas prévenir le MJ toute seule, il le lit dès que tu écris dans le chat ; si le chat était fermé avant, **Le redire** l'envoie une fois de plus.

### 3.2 Jets

Le MJ demande un jet seulement quand l'issue est incertaine et compte, et dit d'abord ce qui est en jeu. Ensuite :

- **Sur le tableau de bord**, une bannière affiche un bouton pour chaque test, par exemple *Acrobaties +4 · avec avantage*. Clique dessus : les dés tombent sur la page et le MJ entend le résultat. Tu peux aussi cliquer sur la ligne de ta fiche qui s'allume, lancer les dés depuis la piste de dés, ou écrire autre chose dans la bannière.
- **À la main**, dans le coin de la bannière ou dans **Paramètres** : la bannière t'indique quoi lancer, et tu fais le jet depuis ta fiche ou la piste de dés.
- **Dés physiques**, avec le réglage des dés sur physiques : tu écris les faces obtenues, *[J'ai fait 14.]*, et RPG Engine ajoute tes modificateurs.

**Jets libres** : clique sur n'importe quel nombre de ta fiche, ou ouvre la piste de dés, pour lancer pour le plaisir. Ils ne comptent jamais et le MJ ne les voit jamais.

**Les jets du MJ** apparaissent dans ta colonne de jets, sauf les jets secrets. Tu peux toujours demander *[Ce jet était-il réel ?]* : pour un jet secret, le MJ donne une empreinte qui prouve qu'il a été fait avant ta question.

### 3.3 Scènes et combats

L'histoire se déroule en **scènes** : un combat, une conversation, une exploration, un voyage, un repos. À la fin de chaque scène, le jeu se sauvegarde tout seul et la scène entre dans ton journal. Quand l'histoire prend un tournant, le MJ écrit les scènes depuis le dernier chapitre sous la forme d'un nouveau chapitre du livre de ton histoire.

Dans un combat, le MJ raconte chaque tour qui n'est pas le tien, et s'arrête au moment où tu peux décider. La **Scène** affiche en haut à qui est le tour et qui vient ensuite, ainsi que la carte de ton personnage à côté de la carte du lieu. L'ordre des tours, les points de vie de ton groupe et l'état des ennemis, décrit avec des mots, restent à côté de la page. Si ton personnage tombe, les jets de sauvegarde contre la mort s'affichent en grand sur la page.

**Ordres permanents** : dis à tes compagnons quelque chose qui doit durer, par exemple *Désormais, laissez toujours un ennemi en vie*, et le MJ le garde en mémoire jusqu'à ce que tu le retires. Tes compagnons le suivent autant que leur caractère le permet, et si l'un d'eux refuse, il le dit. Tu retrouves tes ordres dans **Paramètres**, où tu peux en ajouter et en retirer.

### 3.4 Temps, voyage et monde qui bouge

RPG Engine tient la date. Entre deux sessions, le temps du jeu s'arrête, sauf si tu choisis dans **Paramètres** de le laisser filer, par exemple un jour de jeu pour chaque semaine d'absence, ou si tu le demandes au MJ. Dis que vous vous reposez, *On fait un long repos*, et quand le MJ est d'accord, le repos rend ce qu'il doit rendre. Pendant un repos court, le MJ peut te demander sur le tableau de bord combien de dés de vie tu dépenses : lance-les un par un, vois ce que chacun soigne, et arrête-toi quand tu veux. Dis où tu vas, *On prend la route du nord vers Rocca*, et RPG Engine calcule le chemin, la distance et les jours, en s'arrêtant quand quelque chose se passe en route. L'argent se compte en pièces du jeu, monnaie rendue comprise.

Les méchants ont des plans avec des échéances. Chaque nouveau jour, le MJ fait avancer les menaces que le temps a fait progresser, et tu en vois les signes, jamais l'horloge elle-même.

### 3.5 Cartes

**Monde** montre les lieux que ton personnage connaît, les routes qui les relient et le chemin que tu as parcouru, avec du brouillard sur le reste. **Scène** montre la carte du lieu où tu te trouves, quand il en a une, avec qui se tient où. En combat, à ton tour, les cases que tu ne peux pas atteindre sont voilées. Quand le MJ te demande où tu te déplaces, touche une case, ou écris-la, par exemple *E4*.

**Monde** garde aussi ce que ton personnage sait. **Savoirs** liste les gens, les lieux, les factions, les créatures et les histoires qu'il connaît, chacun tel qu'il le connaît : fais une recherche, ou ouvre une entrée pour la lire en entier ; un nom dans le texte mène à sa page. **Documents** garde les lettres, les avis et les pages trouvés, pour les relire. **Calendrier** montre aujourd'hui, les échéances de tes quêtes avec le temps qui reste, et les jours de l'histoire : un jour avec des scènes renvoie à celles-ci dans la **Chronologie** du Journal.

### 3.6 Quêtes, journal et notes

Une tâche que ton personnage accepte devient une quête dans le **Journal**, avec ses objectifs, son échéance et ce qu'elle mesure ; mets-la en favori pour la garder en vue en haut de la **Scène**. Sous **Histoire**, le Journal raconte ton histoire comme un livre : le MJ écrit un chapitre en prose chaque fois que l'histoire prend un tournant, en racontant les scènes depuis le dernier chapitre, dans le style que tu as choisi ; lis-le chapitre par chapitre, le dernier étant marqué par son signet, et télécharge-le en Markdown ou en page web à imprimer ou à partager. Dans une partie commencée avant, demande au MJ d'écrire l'histoire jusqu'ici. La **Chronologie** liste les scènes, numérotées, avec ce qui s'est passé dans chacune. Le Journal garde aussi tes **Notes** : elles sont privées, sauf si tu utilises **Partager** sur l'une d'elles ; le MJ l'entend alors comme ce que tu penses, jamais comme un fait. Sous **Compagnons**, tu lis les journaux de tes compagnons : de temps en temps, à la fin d'une journée ou d'une quête, ils écrivent quelques lignes sur ce qu'ils pensent et ressentent.

### 3.7 Histoire et image de ton personnage

Sur ta fiche, la carte **Description** a une zone pour l'histoire de ton personnage : le MJ l'y écrit, une fois que tu as dit oui. Pour une image, donne au MJ un fichier (PNG, JPEG, WebP ou SVG, jusqu'à 5 Mo) avec son emplacement sur ton ordinateur, ou fais créer un portrait ([3.11](#311-pictures)) : *[Fais-moi un portrait : cheveux gris en tresse, une cicatrice au menton.]*

### 3.8 Sauvegardes et retour en arrière

RPG Engine sauvegarde toute la campagne à la fin de chaque scène. Le réglage **sauvegardes** décide du reste :

| Sauvegardes | Sauvegarder quand tu veux | Revenir en arrière |
|---|---|---|
| **permadeath** | non | jamais |
| **checkpoint** | non | à la dernière sauvegarde, seulement quand ton personnage meurt |
| **libre** | oui | à n'importe quelle sauvegarde |

Dans tous les modes, tu peux **recommencer**, depuis le début du jeu ou depuis la session zéro. Fais-le dans le chat ou dans **Sauvegardes**.

Après un retour en arrière, **ouvre un nouveau chat** : l'ancien se souvient de ce qui a été annulé. Dans le chat du tableau de bord, appuie sur **Fermer le chat**, puis sur **Nouveau chat** ; dans le chat propre à ton appli d'IA, ouvre une nouvelle conversation (`/clear` dans Claude Code). Écris *continue* dans le nouveau chat. Dis ensuite au MJ que le chat est nouveau : appuie sur **J'ai ouvert un nouveau chat** dans **Sauvegardes**, ou dis-le dans le chat. Tant que ce n'est pas fait, le MJ ne continue pas.

Si tu ne sais pas ce qu'est git, passe ce paragraphe. Si le dossier de la campagne est un dépôt git, **Paramètres** contient une section **Git**, entièrement désactivée tant que tu n'as rien choisi : un commit au début de chaque session, à chaque sauvegarde et à la fin de chaque scène, et un push juste après si tu le veux. Un commit est un instantané de la campagne à ce moment-là ; un push envoie les instantanés vers le dépôt en ligne, sur GitHub par exemple, pour qu'une copie existe hors de cet ordinateur. Les sauvegardes et tes chats avec le MJ restent hors du dépôt, sauf si tu les y autorises ; n'autorise les chats que si le dépôt est privé.

### 3.9 Sessions : s'arrêter et revenir

Arrête-toi quand tu veux : *[On s'arrête ici pour ce soir.]* Tout est déjà sauvegardé dans les fichiers. Pour revenir, ouvre RPG Engine depuis son icône et clique sur ta campagne. Si tu avais laissé le chat ouvert, il revient tout seul. Si tu l'avais fermé, appuie sur **Reprendre le chat**. Appuie ensuite sur **Reprendre** : le MJ te rappelle en quelques lignes où tu en étais, puis continue. Si le jeu a été fermé pendant que le MJ répondait encore, ou pendant qu'une de ses questions t'attendait, ce bouton affiche plutôt **Reprendre à partir d'ici**. **Nouveau chat** ouvre un chat tout neuf sur la même partie. Dans le chat propre à ton appli d'IA, lance-la dans le dossier de la campagne et écris *continue*.

### 3.10 L'humeur du MJ

Le robot en haut du tableau de bord, c'est le MJ : son visage suit le ton de l'histoire, sans jamais révéler ce que tu ne sais pas encore. Quand le tableau de bord n'est pas connecté au jeu, il dort.

### 3.11 Images

RPG Engine peut faire créer des images des lieux que tu atteins, des quêtes que tu acceptes et des personnes que tu rencontres, selon le réglage **Images**, ainsi que le portrait de ton personnage quand tu le demandes. Ton appli d'IA les crée avec ses propres moyens, avec ta connexion, sur ton abonnement et ses limites : **Claude** les dessine en images vectorielles, **Codex** et **Antigravity** les peignent, **OpenCode** dessine de simples images vectorielles dans le chat. Dans **Paramètres > Campagne > Images**, tu peux faire peindre les images par Codex ou Antigravity même quand ton MJ est une autre appli : là où celle que tu as choisie ne peut pas, ton chat les crée. **Paramètres** indique si cet ordinateur peut les créer, et comment le configurer si ce n'est pas le cas. Tu peux toujours donner une image à toi, pour ton personnage ou pour n'importe quelle page que tu vois : passe le pointeur sur l'une de ses images et un petit bouton image apparaît dans son coin (au clavier aussi, et toujours sur téléphone) ; dans **Monde**, la page que tu ouvres a aussi **Changer l'image…**, ou **Ajouter une image…** tant qu'elle n'en a pas. Avec le pointeur sur une image, ou son bouton sélectionné, tu peux aussi coller une image que tu as copiée, avec Ctrl+V (⌘V sur Mac). La tienne prend la place de celle qui existe. Ou dépose le fichier dans le dossier **inbox** de la campagne et dis au MJ pour quelle page il est.

### 3.12 Sécurité : lignes, voiles et stop

Les **lignes** n'apparaissent jamais dans le jeu ; les **voiles** n'ont lieu que hors champ. À tout moment, écris *[stop]* : le MJ abandonne aussitôt ce contenu et l'ajoute à tes lignes.

### 3.13 Changer d'avis

Chaque réglage peut changer, dans le chat ou dans **Paramètres**. Une décision que le MJ prend sans le livre de règles devient un **précédent**, pour que la même question reçoive la même réponse la prochaine fois.

---

## 4. Le tableau de bord <!-- icon: party -->

Une page sur ton propre ordinateur, dans une fenêtre à part, ouverte uniquement sur cet ordinateur. Elle reste active tant que sa fenêtre est ouverte, avec ou sans chat ; environ trente secondes après que tu l'as fermée, le jeu s'arrête, et le chat avec lui. Rien n'est perdu : tout est dans les fichiers. Dans le chat propre à ton appli d'IA, elle est active tant que ce chat est ouvert. Quand le jeu est absent, la page affiche *Not connected* : appuie sur **Rouvrir la campagne** ou, dans ton appli, ouvre le chat suivant. Le bouton **Campagnes**, avec la maison, ramène à toutes tes campagnes.

- **Roleplay** : le chat avec le MJ, quand il n'est pas à côté de la page ([2.5](#25-the-first-chat)).
- **Groupe** : ta fiche et celles de tes compagnons. Clique sur un nombre pour le lancer ; survole-le pour voir d'où il vient et, quand une flèche marque son dé, ce qui améliore ou aggrave le jet. Quand le MJ te prépare des choix, par exemple à un nouveau niveau, un avis sur la fiche les ouvre : choisis quand tu veux, lis les pages que nomment les options, lance les dés là où une option le demande, puis confirme ; l'histoire continue pendant ce temps. À côté, les jets.
- **Scène** : où tu es, son image et sa carte, qui est là, ce qui se passe ; pendant un combat, les tours et la carte de ton personnage.
- **Journal** : les quêtes, l'histoire comme un livre, sa chronologie, les journaux de tes compagnons, tes notes.
- **Monde** : la carte du monde, ce que sait ton personnage, les documents trouvés et le calendrier.
- **La piste de dés** : choisis les dés et un modificateur, puis lance ; ×2 double les dés, jamais le modificateur, comme pour un coup critique.
- **Sauvegardes**, **Aide**, **Paramètres** et **À propos**, sous forme d'icônes au bout de la rangée. Les Paramètres contiennent aussi, sous **Tableau de bord**, les préférences propres à la page : mode, son des dés, jeu de dés, et le **Thème**, c'est-à-dire les couleurs, les faces et les images de la page : ceux du système de jeu, un thème que tu as ajouté dans Packages › Add, depuis le catalogue, un lien GitHub, un .zip ou un dossier, ou ceux de la page elle-même. Si la feuille de style propre à un thème rend la page difficile à lire, désactive **Style propre au thème** à cet endroit : les Paramètres s'affichent toujours sans elle, à l'adresse de la page terminée par `#/settings/page`.

Quand le MJ te pose une question, sa bannière reste en haut, quelle que soit la section où tu te trouves.

---

## 5. Systèmes de jeu et règles maison <!-- icon: dice -->

### 5.1 Ce qu'est un système de jeu

Les données d'un jeu : sa fiche, ses nombres, ses créatures, ses objets, ses sorts et le texte de ses règles. Chaque campagne joue un seul système. RPG Engine calcule la fiche, ce qui est dépensé et ce qui revient. Pour le fonctionnement d'une capacité, le MJ lit les règles et tranche, comme à une vraie table.

### 5.2 Cinquième édition

Les races, les classes, les sous-classes, un historique et un don du SRD 5.1 ; les 319 sorts, les armes, les armures, les objets magiques et les monstres ; les chapitres de règles, que le MJ lit dans leur texte exact ; la fiche complète, calculée.

C'est un paquet à part : le MJ te le propose quand tu crées une campagne, puis il l'installe. Une campagne qui le joue l'installe toute seule la première fois qu'elle s'ouvre sur un ordinateur qui ne l'a pas, et le MJ te le dit.

Tu peux aussi jouer du contenu qui manque au SRD, tiré d'un livre que tu possèdes : le MJ l'écrit sous forme de pages de ta campagne, et RPG Engine les traite comme les siennes. RPG Engine ne livre que du contenu ouvert ; ce que connaît ton MJ n'a pas de limite.

Tes propres manuels peuvent former ta bibliothèque. Dis au MJ où ils se trouvent, *[Mes manuels sont dans D:\Books\5e.]*, ou ajoute leur dossier dans Paquets › Bibliothèque, puis dis oui dans la fenêtre que ton ordinateur affiche, une seule fois. RPG Engine les lit sur cet ordinateur ; chaque campagne utilise les dossiers que tu y actives. Le MJ les consulte quand il tranche une règle, après le SRD, en citant le livre et la page. Ils se lisent mieux en texte, ou en PDF dont on peut sélectionner le texte. Un PDF scanné est lu à partir des images de ses pages, sous Windows seulement, en quelques minutes et avec quelques erreurs. RPG Engine ne modifie jamais tes manuels, n'envoie jamais leur texte ailleurs et ne le copie jamais dans une campagne.

### 5.3 Règles maison et ajouts personnels

Demande au MJ : *[Règle maison : un 1 naturel à une attaque te fait lâcher ton arme.]* Il la garde comme un accord de la table, ou il écrit une page ou un nombre de la fiche si c'est nécessaire. Les règles maison déjà rédigées peuvent être ajoutées sous forme de fichiers texte dans le dossier `rules` de la campagne.

Quand le MJ modifie une page du système de jeu pour ta campagne, comme les points de vie d'une créature ou la portée d'un sort, le tableau de bord la marque d'un petit astérisque après son nom partout où elle s'affiche. Paquets › Installées liste ce qui a changé, sous le système de jeu, à côté de ce que le système fournissait ; une créature que ton personnage ne connaît pas y figure sous son seul nom. Tu peux y remettre une page telle que le système l'écrit, une fois la scène en cours terminée. Le tableau de bord ne peut pas annuler la modification : seul le MJ peut la réécrire.

### 5.4 Ajouter ou importer ton propre système de jeu

Un système de jeu est un paquet : le MJ en installe un depuis npm, un dossier ou un fichier. S'il n'est pas de nous, il ne l'installe qu'avec ton oui, dans un formulaire de ton agent ou une fenêtre de ton ordinateur. En créer un est un travail de développeur, décrit dans les documents de RPG Engine sur GitHub. Transformer un de tes livres en système de jeu n'est pas encore possible ([Bientôt](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

Une extension ajoute quelque chose à une campagne, en plus de son système de jeu : une fonctionnalité comme la météo, qui change à chaque aube, ou le crochetage d'une serrure avec des dés. Ajoute-en une dans Paquets › Ajouter, depuis la liste ou grâce à son nom sur npm, à un dossier ou à un fichier. Une extension qui n'est pas la nôtre apporte du code, et ne s'installe qu'avec ton accord, dans une fenêtre de ton ordinateur. Une extension conçue pour un autre système de jeu l'indique, et n'est pas ajoutée. Dans Paquets › Installées, tu peux mettre à jour une extension ou la retirer. Le MJ peut aussi en ajouter une, quand tu le demandes.

---

## 7. D'où vient une campagne, et sa langue <!-- icon: world -->

### 7.1 Trois façons d'avoir un monde

- **Créé au fil du jeu** : à partir de ta prémisse, le MJ construit chaque lieu, chaque personne et chaque intrigue juste avant que tu en aies besoin, et les garde.
- **Préparé au début** : pareil, mais avec le monde construit avant le jeu.
- **À partir de ta propre aventure ou de ton propre livre** : donne son fichier au MJ, *[Importe cette aventure comme notre campagne : D:\Books\adventure.pdf. Ne me dis rien de ce qu'elle contient.]* Un fichier hors de la campagne n'est lu qu'après ton accord dans une fenêtre de ton ordinateur ; un fichier que tu déposes dans le dossier **inbox** de la campagne est lu aussitôt. Il se lit mieux en texte, en EPUB, en document Word ou en PDF dont on peut sélectionner le texte ; un PDF scanné est lu à partir des images de ses pages, sous Windows uniquement, lentement et avec quelques erreurs. Ton appli d'IA le lit en dehors du chat, ou sinon le MJ dans le chat, sur ton abonnement : dans Claude Code ou Codex, l'un des deux le lit ; dans Antigravity, ton Antigravity ; dans OpenCode, le modèle que tu y as choisi en dernier. Le document entier part chez le fabricant de celui qui le lit, selon les conditions de ton compte et son choix concernant l'entraînement. Le tableau de bord montre l'avancement ; pour un roman, le MJ propose par où commencer. Il écrit les lieux, les personnages et les secrets.

Une campagne se joue une seule fois : pour rejouer la même aventure, crée une nouvelle campagne.

### 7.2 Langues

Une langue par campagne, celle du MJ, que le tableau de bord suit. Le tableau de bord est fourni en 26 langues. Toute autre est traduite sur ton ordinateur par ton appli d'IA, en dehors du chat (Codex ou Claude Code ; dans Antigravity et OpenCode, la leur), ou, quand aucune ne le peut, par le MJ dans le chat. Les termes de la cinquième édition en italien viennent du SRD italien officiel ; le texte des règles reste en anglais, et le MJ le raconte dans ta langue.

---

## 8. Pour les curieux : le dossier de la campagne <!-- icon: list -->

Tu n'as jamais besoin de l'ouvrir, et il contient les secrets de ta campagne. Il contient `campaign.yaml` (tes réglages), `state.yaml` (où en est la partie), `world/` (une page markdown pour chaque personnage, lieu, quête et le reste), `rules/` (tes règles maison), `images/`, `log.jsonl` (chaque changement), `sessions/` (tes conversations avec le MJ en texte, depuis Claude Code et Codex), `.saves/`, `.player/` (tes notes), et les petits fichiers qui indiquent aux agents IA où se trouve RPG Engine. Les pages utilisent le format d'Obsidian. Si tu modifies une page à la main, le MJ le saura à sa prochaine réponse.

RPG Engine reste dans ce dossier : il y lit et y écrit la partie, et ne touche jamais à tes autres fichiers ; les dossiers de tes manuels, il les lit seulement. En dehors, il ne garde que ses propres dossiers de données (les traductions du tableau de bord, le texte qu'il a lu de tes manuels, et Codex ou Claude Code si tu le laisses les installer) et des dossiers temporaires pendant qu'une image est dessinée. Pour tout le reste, si ton agent veut agir sur ton ordinateur, il te demande d'abord. Un système de jeu ou une extension est du code, comme n'importe quel paquet npm : s'il n'est pas de nous, il s'exécute sur ton ordinateur avec tes permissions, et RPG Engine ne l'installe qu'avec ton oui, dans un formulaire de ton agent ou une fenêtre de ton ordinateur. Ne dis oui qu'aux paquets dont tu fais confiance aux auteurs.

Toutes les commandes que le MJ utilise peuvent aussi être lancées dans le dossier de la campagne : `rpg --help` les liste. Beaucoup affichent les secrets de la campagne.

---

## 9. Bientôt disponible <!-- icon: hourglass -->

- **Toi en MJ**, avec l'IA qui joue le groupe.
- **Mode auteur** : écris une aventure avec l'IA, puis exporte-la et partage-la.
- **Plusieurs joueurs sur le même ordinateur**, chacun avec son personnage, qui jouent à tour de rôle dans le même chat.
- **Plus d'extensions** : des mondes, des fonctionnalités et des règles maison à partager.
- **D'autres jeux** : davantage de systèmes de jeu, et les tiens.

---

## 10. Questions et problèmes <!-- icon: info -->

### Questions

**Dois-je connaître les règles ?** Non. Choisis le mentor tutoriel, et pose tes questions avec `[OOC: …]` quand tu veux.

**Le MJ peut-il tricher ?** Il ne peut pas changer un jet fait par RPG Engine, sauf en difficulté histoire, ni les faits déjà établis.

**Est-ce que ça coûte quelque chose ?** RPG Engine est gratuit. Le MJ tourne sur l'abonnement de ton appli d'IA, ou sur ton propre ordinateur avec un modèle local. Une soirée de jeu, c'est un long chat : avec les plus petits abonnements, tu peux atteindre la limite de l'abonnement avant la fin de la soirée. Les images, les traductions et les imports utilisent le même abonnement. RPG Engine lui-même n'utilise jamais de clé d'API, qui se paie à l'appel : connecte ton appli d'IA avec ton compte, pas avec une clé.

**Puis-je jouer sur mon téléphone ?** Non : le MJ tourne sur ton ordinateur, et le tableau de bord ne s'ouvre que là.

**Puis-je jouer avec des amis ?** Pas encore : pour l'instant, un joueur, un personnage, plus des compagnons ([Bientôt](#9-coming-later)).

**Puis-je utiliser une autre IA la prochaine fois ?** Oui : choisis une autre appli dans le chat avant de l'ouvrir, ou ouvre la campagne dans une autre appli et écris *continue*.

### Problèmes

**Une campagne ne s'ouvre pas.** Rouvre RPG Engine depuis son icône, ou avec `rpg open` dans un terminal, et clique sur la campagne. Si son tableau de bord affiche *Not connected*, appuie sur **Rouvrir la campagne**. Une carte qui indique **Dossier introuvable** a perdu son dossier : retire-la de la liste, puis ajoute-la de nouveau avec **Ouvrir un dossier…** là où il se trouve maintenant. Dans le chat propre à ton appli d'IA, le tableau de bord ne fonctionne que tant qu'un chat de cette campagne est ouvert : demande au MJ `[OOC: Quel est le lien du tableau de bord ?]`. Dans l'application Claude, un chat laissé un moment en arrière-plan s'endort, et la page avec lui : clique sur le chat, et la page revient à la même adresse.

**Le MJ ne semble pas connaître le jeu.** Cela arrive dans le chat propre à ton appli d'IA : elle n'a pas chargé RPG Engine. Vérifie que tu l'as lancée dans le dossier de la campagne et que tu lui as fait confiance. Dans Claude Code, écris `/mcp` et reconnecte `rpg`. Dans Codex, `codex mcp list` dans le dossier de la campagne doit afficher `rpg`. Si `rpg --version` est introuvable, réinstalle RPG Engine ([2.2](#22-install)).

**Windows ne trouve pas `claude`.** Cela arrive quand tu as installé Claude Code toi-même. Son installateur le signale dans une note jaune, avec le dossier où il s'est installé : ajoute ce dossier au PATH (Propriétés système > Variables d'environnement), puis ouvre un nouveau terminal.

**Mise à jour.** Quand une version plus récente de RPG Engine est disponible, le tableau de bord l'indique : dans Packages › Installed, RPG Engine est en premier, avec **Mettre à jour** ; fais ensuite ce que la page te dit. Ou relance `npm install -g rpg-engine` dans un terminal, puis ouvre un nouveau chat : un MJ déjà en cours garde la version avec laquelle il a démarré.

**Le MJ se souvient de quelque chose que j'ai annulé.** Ouvre un nouveau chat et appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

**Une appli ne s'installe pas.** La page en explique la raison : appuie sur **Réessayer**. Ou installe-la toi-même depuis le site de son fabricant, puis appuie sur **Revérifier**.

**La page de connexion ne s'ouvre pas dans le navigateur.** Pendant que la page t'attend, appuie sur **Rouvrir la page de connexion** là où il s'affiche, ou sur **Annuler** et réessaie.

**Le chat du tableau de bord dit qu'un autre chat est en train de jouer.** Un chat que tu as ouvert toi-même dans ton appli d'IA joue cette campagne : continue là-bas, ou ferme-le pour jouer dans le tableau de bord.

**Aucune image n'apparaît.** Paramètres > Campagne > Images indique si cet ordinateur peut en créer, et comment.

**L'installation échoue, ou `rpg` ne démarre pas.** `node --version` doit afficher 24 ou plus. Si Windows répond que l'exécution de scripts est désactivée, consulte [2.1](#21-what-you-need). Sous Windows, garde RPG Engine et tes campagnes loin des chemins qui contiennent `&`.

**Le lien du tableau de bord a changé.** Dans le chat propre à ton appli d'IA, chaque campagne a sa propre adresse, la même chat après chat. Elle ne change que si un autre programme l'occupe déjà : le MJ te donne alors le nouveau lien, qui ne bouge plus ensuite. Un deuxième chat de la même campagne garde la page à la même adresse, et la reprend quand tu fermes le premier.
