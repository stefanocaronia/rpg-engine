<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
# RPG Engine : le guide complet

**RPG Engine** te permet de jouer à un jeu de rôle sur table avec une **IA comme MJ**. Tu parles avec le MJ dans un **chat**. RPG Engine travaille en coulisses : il **garde en mémoire le monde**, **lance les dés** et **tient les comptes**. À côté du chat, tu gardes ouverte dans ton navigateur une page, le **tableau de bord**, avec ta fiche, les dés, les cartes et ton journal.

Ce guide s'adresse aux joueurs et joueuses : tu n'as pas besoin de savoir programmer.

## Démarrage rapide <!-- icon: send -->

1. Installe **Node.js** depuis [nodejs.org](https://nodejs.org) (la version LTS).
2. Installe un **agent IA**, le programme dans lequel le MJ fonctionne, et connecte-toi : par exemple Claude Code ou Codex ([2.4](#24-connect-your-ai)).
3. Dans un terminal, installe RPG Engine : `npm install -g rpg-engine`.
4. Crée une campagne : `rpg init "The Salt Isles"`.
5. Entre dans le nouveau dossier, `cd "The Salt Isles"`, et lance ton agent à cet endroit : `claude` pour Claude Code, `codex` pour Codex. Réponds oui quand il demande si tu fais confiance au dossier ([2.4](#24-connect-your-ai)), puis écris *Salut ! On commence.* Le MJ répond avec le lien vers ton tableau de bord.

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
- **Node.js 22** ou plus récent, sur [nodejs.org](https://nodejs.org). Il apporte `npm`, qui installe RPG Engine.
- Un **terminal** : sous Windows, Terminal ou PowerShell ; sous macOS, Terminal. Pour en ouvrir un dans un dossier, fais un clic droit sur le dossier et choisis **Ouvrir dans le Terminal** (Windows) ou **Services > Nouveau terminal au dossier** (macOS).
- Un **agent IA** pour le MJ ([2.4](#24-connect-your-ai)), avec le **plus grand modèle** qu'il propose : un petit modèle se laisse plus facilement convaincre de révéler des secrets ou de contourner les règles.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` vérifie que tout a fonctionné. Tu utilises `rpg` une seule fois par campagne, pour la créer ; ensuite, ton agent lance RPG Engine tout seul.

### 2.3 Créer une campagne

Ouvre un terminal dans le dossier où tu ranges tes jeux ([2.1](#21-what-you-need) explique comment) :

```text
rpg init "The Salt Isles"
```

Cela crée le dossier `The Salt Isles` avec une nouvelle campagne dedans ; entres-y avec `cd "The Salt Isles"`. Retiens où il se trouve : tu y reviendras à chaque partie. Tu choisiras tout le reste plus tard, dans le chat ou sur le dashboard ; `rpg init --help` liste les options pour en choisir certaines dès maintenant, comme `--language it` ou `--difficulty hard`.

Le MJ ne peut pas créer une campagne à ta place : avant `init`, rien n'indique à ton agent où se trouve RPG Engine.

### 2.4 Connecter ton IA

Le MJ tourne dans un **agent IA** : une appli d'IA, dans le terminal ou sur le bureau, qui peut travailler avec les fichiers de ton ordinateur, comme Claude Code ou Codex. Un simple chat comme claude.ai ou ChatGPT, ou une appli de téléphone, ne suffit pas : le MJ doit pouvoir accéder aux fichiers de la campagne sur ton ordinateur. Chaque agent demande son propre abonnement et sa propre connexion : Claude Code un abonnement Claude payant, Codex une connexion ChatGPT. Tu l'installes une seule fois, depuis sa propre page : [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code** : dans le dossier de la campagne, écris `claude`. Quand il demande si tu fais confiance au dossier, choisis **Yes, I trust this folder** ; attention, la réponse déjà sélectionnée est *No, exit*. La campagne contient aussi un petit hook, `rpg --listen`, que la question ne montre pas : il prévient aussitôt le MJ quand tu agis depuis le dashboard.
- **Codex** : dans le dossier de la campagne, écris `codex`, et réponds oui quand il demande si tu fais confiance au dossier. Dans son appli de bureau, vérifie dans les paramètres que les mémoires sont désactivées pour les chats du jeu.
- **Un autre agent** : lance-le dans le dossier de la campagne et donne-lui le serveur MCP `rpg mcp`. RPG Engine est un serveur MCP standard : tout agent compatible MCP peut être le MJ, y compris les agents locaux.

Nous jouons et testons avec **Claude Code** ; **Codex** est connecté et vérifié, mais aucune campagne entière n'a encore été jouée avec lui. La campagne désactive la mémoire propre de l'agent : la partie vit dans ses fichiers, pour qu'un retour à une sauvegarde revienne vraiment en arrière.

### 2.5 Le premier chat

Écris n'importe quoi, par exemple *Salut ! On commence.* Dans sa première réponse de chaque chat, le MJ te donne le **lien vers ton dashboard**, quelque chose comme `http://127.0.0.1:4750` : ouvre-le et garde-le à côté du chat.

Entre les messages du MJ, ton agent affiche les outils qu'il utilise : n'ouvre pas leurs détails (dans Claude Code, ctrl+o), ils peuvent montrer des secrets.

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
| **Compagnons** | Qui voyage avec toi | aucun, créés avec toi, créés par le MJ, rencontrés en jeu |
| **Images** | Images des lieux, des quêtes et des personnages rencontrés | aucune, sur demande, nouveaux lieux, quêtes et personnages rencontrés ([3.11](#311-pictures)) |
| **Lignes** et **Voiles** | Ce qui n'apparaît jamais, et ce qui se passe seulement hors champ | listes |
| **Langue** | La langue du jeu et du dashboard | toutes |

La cinquième édition ajoute la **progression** : points d'expérience ou paliers.

Si tu n'as pas de monde écrit, le MJ demande aussi une **prémisse** (le genre, le ton, quelques éléments, et ce que tu préfères dans un jeu, comme les combats, les mystères, les dialogues ou l'exploration, avec tes propres mots) et la **préparation** : construire le monde au fil du jeu, ou tout au début.

**Le style du MJ** n'est jamais demandé, mais tu peux le changer dans le chat ou dans **Paramètres** : la **prose** (simple, littéraire, pulp, pince-sans-rire), les **histoires** qu'il invente (situations, arcs, épisodes, mystère), un auteur dont **imiter la plume**, ou toute autre chose **avec tes mots**.

### 2.7 Session zéro : ton personnage

Tu crées ton personnage avec le MJ, comme à une table. Chaque choix t'appartient, sauf si tu demandes au MJ de le faire : viens avec une idée complète, une idée vague, ou rien du tout. Le MJ t'explique comment sont obtenus les scores de caractéristiques avant qu'un seul dé soit lancé. Ton histoire n'est jamais obligatoire ; si tu en donnes une, le MJ la rédige avec tes mots. Ensuite, le MJ te propose une image de ton personnage ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcule la fiche : tu n'as jamais à faire les additions.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que fait ou dit ton personnage, avec tes propres mots :

> Je demande à l'aubergiste qui d'autre est passé ce soir.

Pour parler hors de l'histoire, écris entre crochets : *[Comment fonctionne la lutte ?]* Le MJ répond lui aussi entre crochets.

Tu dis ce que tu tentes ; le MJ dit ce qui arrive. Le MJ ne décide jamais à la place de ton personnage, et ne parle jamais du moteur de jeu. Tu peux lui demander comment utiliser le tableau de bord.

**Agir depuis le tableau de bord** : clique sur un nom de ta fiche, comme une arme, un sort ou un objet que tu portes, puis sur la cible. Tu peux aussi cliquer sur un personnage pour lui parler. Le tableau de bord écrit ta phrase, *J'attaque Bandit encapuchonné 1 avec Masse.*, que tu peux modifier avant de cliquer sur **Dire au MJ**. Le MJ l'entend comme si tu l'avais dite dans le chat, et tranche comme pour toute autre action. Si ton application d'IA ne peut pas l'entendre toute seule, **Copier** prépare la phrase à coller dans le chat.

### 3.2 Jets

Le MJ demande un jet seulement quand l'issue est incertaine et compte, et dit d'abord ce qui est en jeu. Ensuite :

- **Sur le tableau de bord**, une bannière affiche un bouton pour chaque test, par exemple *Acrobaties +4 · avec avantage*. Clique dessus : les dés tombent sur la page et le MJ entend le résultat. Tu peux aussi cliquer sur la ligne de ta fiche qui s'allume, lancer les dés depuis la piste de dés, ou écrire autre chose dans la bannière.
- **À la main**, dans le coin de la bannière ou dans **Paramètres** : la bannière t'indique quoi lancer, et tu fais le jet depuis ta fiche ou la piste de dés.
- **Dés physiques**, avec le réglage des dés sur physiques : tu écris les faces obtenues, *[J'ai fait 14.]*, et RPG Engine ajoute tes modificateurs.

**Jets libres** : clique sur n'importe quel nombre de ta fiche, ou ouvre la piste de dés, pour lancer pour le plaisir. Ils ne comptent jamais et le MJ ne les voit jamais.

**Les jets du MJ** apparaissent dans ta colonne de jets, sauf les jets secrets. Tu peux toujours demander *[Ce jet était-il réel ?]* : pour un jet secret, le MJ donne une empreinte qui prouve qu'il a été fait avant ta question.

### 3.3 Scènes et combats

L'histoire se déroule en **scènes** : un combat, une conversation, une exploration, un voyage, un repos. À la fin de chaque scène, le jeu se sauvegarde tout seul, et la scène entre dans ton journal.

Dans un combat, le MJ raconte chaque tour qui n'est pas le tien, et s'arrête au moment où tu peux décider. La **Scène** affiche en haut à qui est le tour et qui vient ensuite, ainsi que la carte de ton personnage à côté de la carte du lieu. L'ordre des tours, les points de vie de ton groupe et l'état des ennemis, décrit avec des mots, restent à côté de la page. Si ton personnage tombe, les jets de sauvegarde contre la mort s'affichent en grand sur la page.

### 3.4 Temps, voyage et monde qui bouge

RPG Engine tient la date ; aucun temps ne passe entre deux sessions. Dis que vous vous reposez, *On fait un long repos*, et quand le MJ est d'accord, le repos rend ce qu'il doit rendre. Pendant un repos court, le MJ peut te demander sur le tableau de bord combien de dés de vie tu dépenses : lance-les un par un, vois ce que chacun soigne, et arrête-toi quand tu veux. Dis où tu vas, *On prend la route du nord vers Rocca*, et RPG Engine calcule le chemin, la distance et les jours, en s'arrêtant quand quelque chose se passe en route. L'argent se compte en pièces du jeu, monnaie rendue comprise.

Les méchants ont des plans avec des échéances. Chaque nouveau jour, le MJ fait avancer les menaces que le temps a fait progresser, et tu en vois les signes, jamais l'horloge elle-même.

### 3.5 Cartes

**Monde** montre les lieux que ton personnage connaît, les routes qui les relient et le chemin que tu as parcouru, avec du brouillard sur le reste. **Scène** montre la carte du lieu où tu te trouves, quand il en a une, avec qui se tient où. En combat, à ton tour, les cases que tu ne peux pas atteindre sont voilées. Quand le MJ te demande où tu te déplaces, touche une case, ou écris-la, par exemple *E4*.

**Monde** garde aussi ce que ton personnage sait. **Savoirs** liste les gens, les lieux, les factions, les créatures et les histoires qu'il connaît, chacun tel qu'il le connaît : fais une recherche, ou ouvre une entrée pour la lire en entier ; un nom dans le texte mène à sa page. **Documents** garde les lettres, les avis et les pages trouvés, pour les relire. **Calendrier** montre aujourd'hui, les échéances de tes quêtes avec le temps qui reste, et les jours de l'histoire : un jour avec des scènes mène à ses chapitres dans le Journal.

### 3.6 Quêtes, journal et notes

Une tâche que ton personnage accepte devient une quête dans le **Journal**, avec ses objectifs, son échéance et ce qu'elle mesure ; mets-la en favori pour la garder en vue en haut de la Scène. Le Journal raconte aussi ton **histoire**, scène par scène, et garde tes **notes** : elles sont privées, sauf si tu en **Partages** une ; le MJ l'entend alors comme ce que tu penses, jamais comme un fait. Sous **Compagnons**, tu lis les journaux de tes compagnons : de temps en temps, à la fin d'une journée ou d'une quête, ils écrivent quelques lignes sur ce qu'ils pensent et ressentent.

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

Après un retour en arrière, **ouvre un nouveau chat** : l'ancien se souvient de ce qui a été annulé. Écris *continue* dans le nouveau chat, puis appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

### 3.9 Sessions : s'arrêter et revenir

Arrête-toi quand tu veux : *[On s'arrête ici pour ce soir.]* Tout est déjà sauvegardé dans les fichiers. Pour revenir, lance ton agent dans le dossier de la campagne et écris *continue* : le MJ te fait un court résumé et reprend l'histoire.

### 3.10 L'humeur du MJ

Le robot en haut du tableau de bord, c'est le MJ : son visage suit le ton de l'histoire, sans jamais révéler ce que tu ne sais pas encore. Quand le chat est fermé, il dort.

### 3.11 Images

RPG Engine peut faire créer des images des lieux que tu atteins, des quêtes que tu acceptes et des personnes que tu rencontres, selon le réglage **images**, ainsi que le portrait de ton personnage quand tu le demandes. Il utilise ton propre Codex ou Claude Code, avec ta connexion, sur ton abonnement et ses limites : **Codex** les peint, sinon **Claude Code** les dessine. **Paramètres** indique si cet ordinateur peut les créer, et comment le configurer si ce n'est pas le cas. Tu peux toujours donner au MJ une image à toi.

### 3.12 Sécurité : lignes, voiles et stop

Les **lignes** n'apparaissent jamais dans le jeu ; les **voiles** n'ont lieu que hors champ. À tout moment, écris *[stop]* : le MJ abandonne aussitôt ce contenu et l'ajoute à tes lignes.

### 3.13 Changer d'avis

Chaque réglage peut changer, dans le chat ou dans **Paramètres**. Une décision que le MJ prend sans le livre de règles devient un **précédent**, pour que la même question reçoive la même réponse la prochaine fois.

---

## 4. Le tableau de bord <!-- icon: party -->

Une page sur ton propre ordinateur, ouverte uniquement dans le navigateur de cet ordinateur, active tant que le chat est ouvert. Quand le chat se ferme, elle affiche *Not connected*. Elle revient toute seule avec le prochain chat.

- **Groupe**&nbsp;: ta fiche et celles de tes compagnons. Clique sur un nombre pour le lancer. Survole-le pour voir d'où il vient et, quand une flèche marque son dé, ce qui améliore ou aggrave le jet. À côté, les jets.
- **Scène**&nbsp;: où tu es, son image et sa carte, qui est là, ce qui se passe. Pendant un combat, les tours et la carte de ton personnage.
- **Journal**&nbsp;: les quêtes, l'histoire, les journaux de tes compagnons, tes notes.
- **Monde**&nbsp;: la carte du monde, ce que sait ton personnage, les documents trouvés et le calendrier.
- **La piste de dés**&nbsp;: choisis les dés et un modificateur, puis lance. ×2 double les dés, jamais le modificateur, comme pour un coup critique.
- **Sauvegardes**, **Aide**, **Paramètres** et **À propos**, sous forme d'icônes au bout de la rangée. Les Paramètres contiennent aussi les préférences propres à la page&nbsp;: thème, son des dés, jeu de dés.

Quand le MJ te pose une question, sa bannière reste en haut, quelle que soit la section où tu te trouves.

---

## 5. Systèmes de jeu et règles maison <!-- icon: dice -->

### 5.1 Ce qu'est un système de jeu

Les données d'un jeu : sa fiche, ses chiffres, ses créatures, ses objets, ses sorts et le texte de ses règles. Chaque campagne utilise un seul système. RPG Engine calcule la fiche, ce qui est dépensé et ce qui revient. Pour le fonctionnement d'une capacité, le MJ lit les règles et décide, comme à une vraie table.

### 5.2 Cinquième édition

Les races, les classes, les sous-classes, un historique et un don du SRD 5.1 ; les 319 sorts, les armes, les armures, les objets magiques et les monstres ; les chapitres de règles, que le MJ lit selon leur texte exact ; la fiche complète, calculée.

C'est un paquet à part : le MJ te le propose quand tu prépares une campagne et l'installe. Une campagne qui l'utilise l'installe toute seule la première fois qu'elle s'ouvre sur un ordinateur qui ne l'a pas, et le MJ te le dit.

Tu peux aussi jouer du contenu que le SRD n'a pas, tiré d'un livre que tu possèdes : le MJ l'écrit sous forme de pages de ta campagne, et RPG Engine le traite comme le sien. RPG Engine ne fournit que du contenu libre ; ce que ton MJ connaît n'est pas limité.

Tes propres manuels peuvent devenir ta bibliothèque : dis au MJ où ils se trouvent, *[Mes manuels sont dans D:\Books\5e.]*, ou ajoute leur dossier dans Packages › Library, puis réponds oui dans la fenêtre que ton ordinateur affiche, une seule fois. RPG Engine les lit sur cet ordinateur ; chaque campagne utilise les dossiers que tu y as activés, et le MJ les consulte quand il décide d'une règle, après le SRD, en citant le livre et la page. Ils se lisent mieux en texte, ou en PDF dont le texte peut être sélectionné ; un PDF scanné est lu à partir des images de ses pages, sous Windows uniquement, en quelques minutes et avec quelques erreurs. RPG Engine ne modifie jamais tes manuels, n'envoie jamais leur texte nulle part et ne le copie jamais dans une campagne.

### 5.3 Règles maison et ajouts personnels

Demande au MJ : *[Règle maison : un 1 naturel à une attaque te fait lâcher ton arme.]* Il la garde comme un accord de la table, ou il écrit une page ou un chiffre de la fiche quand il en faut un. Les règles maison déjà rédigées peuvent aller dans le dossier `rules` de la campagne, sous forme de fichiers texte.

### 5.4 Ajouter ou importer ton propre système de jeu

Un système de jeu est un paquet : le MJ en installe un depuis npm, un dossier ou un fichier, et si ce n'est pas le nôtre, seulement avec ton accord, dans une fenêtre de ton ordinateur. En créer un est un travail de développeur, décrit dans les documents de RPG Engine sur GitHub. Transformer un de tes livres en système de jeu n'est pas encore possible ([À venir](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

Une extension ajoute quelque chose à une campagne, en plus de son système de jeu : une fonctionnalité comme la météo, qui change à chaque aube, ou le crochetage d'une serrure avec des dés. Ajoute-en une dans Packages › Add, depuis la liste ou grâce à son nom sur npm, à un dossier ou à un fichier. Une extension qui n'est pas la nôtre apporte du code, et ne s'installe qu'avec ton accord, dans une fenêtre de ton ordinateur. Une extension conçue pour un autre système de jeu l'indique, et n'est pas ajoutée. Dans Packages › Installed, tu peux mettre à jour une extension ou la retirer. Le MJ peut aussi en ajouter une, quand tu le demandes.

---

## 7. D'où vient une campagne, et sa langue <!-- icon: world -->

### 7.1 Trois façons d'avoir un monde

- **Créé au fil du jeu** : à partir de ta prémisse, le MJ construit chaque lieu, chaque personne et chaque intrigue juste avant que tu en aies besoin, et les garde.
- **Préparé au début** : pareil, mais avec le monde construit avant le jeu.
- **À partir de ta propre aventure ou de ton propre livre** : donne son fichier au MJ, *[Importe cette aventure comme notre campagne : D:\Books\adventure.pdf. Ne me dis rien de ce qu'elle contient.]* Elle se lit mieux en texte, en EPUB, en document Word ou en PDF dont on peut sélectionner le texte ; un PDF scanné est lu à partir des images de ses pages, sous Windows uniquement, lentement et avec quelques erreurs. Ton propre Codex ou Claude Code la lit en dehors du chat, ou sinon le MJ dans le chat, sur ton abonnement : le document entier part chez OpenAI ou Anthropic, selon les conditions de ton compte et son choix concernant l'entraînement. Le tableau de bord montre l'avancement ; pour un roman, le MJ propose par où commencer. Il écrit les lieux, les personnages et les secrets.

Une campagne se joue une seule fois : pour rejouer la même aventure, crée une nouvelle campagne.

### 7.2 Langues

Une langue par campagne, celle du MJ, que le tableau de bord suit. Le tableau de bord est fourni en 26 langues. Toute autre est traduite sur ton ordinateur par Codex ou Claude Code, ou, sans eux, par le MJ dans le chat. Les termes de la cinquième édition en italien viennent du SRD italien officiel ; le texte des règles reste en anglais, et le MJ le raconte dans ta langue.

---

## 8. Pour les curieux : le dossier de la campagne <!-- icon: list -->

Tu n'as jamais besoin de l'ouvrir, et il contient les secrets de ta campagne. Il comprend `campaign.yaml` (tes réglages), `state.yaml` (où en est la partie), `world/` (une page markdown pour chaque personnage, lieu, quête et le reste), `rules/` (tes règles maison), `images/`, `log.jsonl` (chaque changement), `.saves/`, `.player/` (tes notes), et les petits fichiers qui indiquent aux agents IA où se trouve RPG Engine. Les pages utilisent le format d'Obsidian. Si tu modifies une page à la main, le MJ l'apprend à sa prochaine réponse.

RPG Engine reste dans ce dossier : il lit et écrit la partie uniquement ici, et ne touche jamais à tes autres fichiers. Les dossiers de tes manuels, il ne fait que les lire. En dehors de ce dossier, il garde seulement ses propres dossiers de données (les traductions du dashboard, le texte qu'il a lu de tes manuels, ainsi que Codex ou Claude Code si tu le laisses les installer) et des dossiers temporaires pendant qu'une image est dessinée. Pour tout le reste que ton agent veut faire sur ton ordinateur, il te demande d'abord.

Chaque commande qu'utilise le MJ peut aussi être lancée dans le dossier de la campagne : `rpg --help` les liste. Beaucoup affichent les secrets de la campagne.

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

**Dois-je connaître les règles ?** Non. Choisis le mentor tutoriel, et pose tes questions entre crochets quand tu veux.

**Le MJ peut-il tricher ?** Il ne peut pas changer un jet fait par RPG Engine, sauf en difficulté histoire, ni les faits déjà établis.

**Est-ce que ça coûte quelque chose ?** RPG Engine est gratuit. Le MJ tourne sur l'abonnement de ton agent, ou sur ton propre ordinateur avec un modèle local. Une soirée de jeu, c'est un long chat : avec les plus petits abonnements, tu peux atteindre la limite de l'abonnement avant la fin de la soirée. Les images, les traductions et les imports utilisent le même abonnement. RPG Engine lui-même n'utilise jamais de clé d'API, qui se paie à l'appel : connecte ton agent avec ton compte, pas avec une clé.

**Puis-je jouer sur mon téléphone ?** Non : le MJ tourne sur ton ordinateur, et le tableau de bord ne s'ouvre que là.

**Puis-je jouer avec des amis ?** Pas encore : pour l'instant, un joueur, un personnage, plus des compagnons ([Bientôt](#9-coming-later)).

**Puis-je utiliser une autre IA la prochaine fois ?** Oui : ouvre la campagne dans un autre agent et écris *continue*.

### Problèmes

**Le tableau de bord ne s'ouvre pas.** Demande au MJ : `[Quel est le lien du tableau de bord ?]`. Il ne fonctionne que tant qu'un chat est ouvert dans cette campagne, après la première réponse du MJ.

**Le MJ ne semble pas connaître le jeu.** Ton agent n'a pas chargé RPG Engine. Vérifie que tu l'as lancé dans le dossier de la campagne et que tu lui as fait confiance. Dans Claude Code, écris `/mcp` et reconnecte `rpg`. Dans Codex, `codex mcp list` dans le dossier de la campagne doit afficher `rpg`. Si `rpg --version` est introuvable, réinstalle RPG Engine ([2.2](#22-install)).

**Mise à jour.** Relance `npm install -g rpg-engine`, puis ouvre un nouveau chat : un MJ déjà en cours garde la version avec laquelle il a démarré.

**Le MJ se souvient de quelque chose que j'ai annulé.** Ouvre un nouveau chat et appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

**Aucune image n'apparaît.** Paramètres > Images indique si cet ordinateur peut en créer, et comment.

**L'installation échoue, ou `rpg` ne démarre pas.** `node --version` doit afficher 22 ou plus. Sous Windows, garde RPG Engine et tes campagnes loin des chemins qui contiennent `&`.

**Le lien du tableau de bord a changé.** Un autre programme a pris l'adresse habituelle ; le MJ te donne le nouveau lien.
