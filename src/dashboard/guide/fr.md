<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
# RPG Engine : le guide complet

**RPG Engine** te permet de jouer à un jeu de rôle sur table avec une **IA comme MJ**. Tu parles avec le MJ dans un **chat**. RPG Engine travaille en coulisses : il **garde en mémoire le monde**, **lance les dés** et **tient les comptes**. À côté du chat, tu gardes ouverte dans ton navigateur une page, le **tableau de bord**, avec ta fiche, les dés, les cartes et ton journal.

Ce guide s'adresse aux joueurs et joueuses : tu n'as pas besoin de savoir programmer.

## Démarrage rapide <!-- icon: send -->

1. Installe **Node.js** depuis [nodejs.org](https://nodejs.org) (la version LTS).
2. Installe un **agent IA**, le programme dans lequel le MJ fonctionne, et connecte-toi : par exemple Claude Code ou Codex ([2.4](#24-connect-your-ai)).
3. Dans un terminal, installe RPG Engine : `npm install -g rpg-engine`.
4. Crée une campagne : `rpg init "The Salt Isles"`.
5. Entre dans le nouveau dossier, `cd "The Salt Isles"`, et lance ton agent à cet endroit : `claude` pour Claude Code, `codex` pour Codex. Réponds oui quand il demande si tu fais confiance au dossier ([2.4](#24-connect-your-ai)), puis écris *Salut ! On commence.* Le MJ répond avec le lien vers ton tableau de bord.

## 1. Ce qu'est RPG Engine <!-- icon: about -->

| Qui | Ce qu'il ou elle fait |
|---|---|
| **Toi** | Tu joues ton personnage : ce qu'il fait, dit et tente. |
| **Le MJ** (l'IA) | Raconte l'histoire, joue tous les autres rôles, décide de ce qui arrive, demande des jets. |
| **RPG Engine** | Garde le monde dans des fichiers, lance les dés, compte les points de vie, l'argent, le temps et les distances, garde les secrets jusqu'à ce que tu les découvres. |

Le monde reste le même d'une soirée à l'autre, même dans un nouveau chat, même avec une autre IA :

- **Ce qui a été dit reste vrai.** Un méchant mort reste mort.
- **Les dés sont réels.** Le MJ ne peut pas les truquer, sauf à la difficulté la plus facile, si tu la choisis.
- **Les secrets restent secrets.** Le MJ ne te dit jamais ce que ton personnage ne sait pas.
- **Le monde bouge.** Les menaces avancent pendant que vous vous reposez ou voyagez, et tu en vois les signes.
- **Une campagne est un dossier** sur ton ordinateur : arrête-toi quand tu veux, reprends plus tard.

Aujourd'hui, RPG Engine joue un seul système de jeu, la **cinquième édition**, tirée du System Reference Document 5.1, libre de droits. D'autres suivront ([Plus tard](#9-coming-later)).

---

## 2. Pour commencer <!-- icon: path -->

### 2.1 Ce qu'il te faut

- Un ordinateur sous Windows, macOS ou Linux, et un navigateur web.
- **Node.js 22** ou plus récent, depuis [nodejs.org](https://nodejs.org). Il apporte `npm`, qui installe RPG Engine.
- Un **terminal** : sous Windows, Terminal ou PowerShell ; sous macOS, Terminal. Pour en ouvrir un dans un dossier, fais un clic droit sur le dossier et choisis **Ouvrir dans le Terminal** (Windows) ou **Services > Nouveau terminal au dossier** (macOS).
- Un **agent IA** pour le MJ ([2.4](#24-connect-your-ai)), avec le **plus grand modèle** qu'il propose : on convainc plus facilement un petit modèle de révéler des secrets ou d'entorser les règles.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` vérifie que tout a fonctionné. Tu utilises `rpg` une seule fois par campagne, pour la créer ; ensuite, ton agent lance RPG Engine tout seul.

### 2.3 Créer une campagne

Ouvre un terminal dans le dossier où tu ranges tes parties ([2.1](#21-what-you-need) explique comment) :

```text
rpg init "The Salt Isles"
```

Cela crée le dossier `The Salt Isles` avec une nouvelle campagne dedans ; entres-y avec `cd "The Salt Isles"`. Retiens où il se trouve : tu y reviendras à chaque partie. Tout le reste, tu le choisis plus tard, dans le chat ou sur le dashboard ; `rpg init --help` liste les options pour en choisir dès maintenant, comme `--language it` ou `--difficulty hard`.

Le MJ ne peut pas créer une campagne à ta place : avant `init`, rien n'indique à ton agent où se trouve RPG Engine.

### 2.4 Connecter ton IA

Le MJ tourne dans un **agent IA** : une appli d'IA, dans le terminal ou sur le bureau, capable de travailler avec les fichiers de ton ordinateur, comme Claude Code ou Codex. Un simple chat comme claude.ai ou ChatGPT, ou une appli de téléphone, ne suffit pas : le MJ doit accéder aux fichiers de la campagne sur ton ordinateur. Chaque agent demande son propre abonnement et sa propre connexion : Claude Code un abonnement Claude payant, Codex une connexion ChatGPT. Tu l'installes une seule fois, depuis sa propre page : [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code** : dans le dossier de la campagne, écris `claude`. Quand il demande si tu fais confiance au dossier, choisis **Yes, I trust this folder** ; attention, la réponse déjà sélectionnée est *No, exit*. La campagne contient aussi un petit hook, `rpg --listen`, que la question ne montre pas : il prévient aussitôt le MJ quand tu agis depuis le dashboard.
- **Codex** : dans le dossier de la campagne, écris `codex`, et réponds oui quand il demande si tu fais confiance au dossier. Dans son appli de bureau, vérifie dans les paramètres que les mémoires sont désactivées pour les chats du jeu.
- **Un autre agent** : lance-le dans le dossier de la campagne et donne-lui le serveur MCP `rpg mcp`. RPG Engine est un serveur MCP standard : tout agent compatible MCP peut être le MJ, y compris les agents locaux.

Nous jouons et testons avec **Claude Code** ; **Codex** est connecté et vérifié, mais aucune campagne entière n'a encore été jouée avec lui. La campagne désactive la mémoire propre à l'agent : la partie vit dans ses fichiers, pour qu'un retour à une sauvegarde revienne vraiment en arrière.

### 2.5 Le premier chat

Écris ce que tu veux, par exemple *Salut ! On commence.* Dans sa première réponse de chaque chat, le MJ te donne le **lien vers ton dashboard**, quelque chose comme `http://127.0.0.1:4750` : ouvre-le et garde-le à côté du chat.

Entre les messages du MJ, ton agent montre les outils qu'il utilise : n'ouvre pas leurs détails (dans Claude Code, ctrl+o), ils peuvent révéler des secrets.

Une nouvelle campagne passe par trois étapes, affichées en haut du dashboard : **1 Paramètres** (comment tu veux jouer), **2 Session zéro** (tu crées ton personnage, en jouant), **3 Jeu**.

### 2.6 Paramètres : choisir comment tu joues

Le MJ ne demande que ce qui manque encore, quelques questions à la fois ; l'étape **Paramètres** du dashboard montre les mêmes questions sous forme de cartes. Écris « décide toi-même » et le MJ choisit. Tout peut changer plus tard, dans le chat ou dans **Paramètres**.

| Réglage | Ce qu'il décide | Valeurs |
|---|---|---|
| **Mentor** | Combien le MJ t'enseigne les règles | désactivé, conseils, tutoriel |
| **Difficulté** | La dureté du monde | histoire, facile, normal, difficile, brutal |
| **Létalité** | Ce que veut dire tomber au combat | narrative (jamais de mort), épique (seulement quand c'est important), dés |
| **Sauvegardes** | Quand tu peux revenir en arrière | mort définitive, point de contrôle, libre ([3.8](#38-saves-and-going-back)) |
| **Rigueur** | À quel point nourriture, lumière et voyage suivent les règles | fluide, règles, simulation |
| **Dés** | Qui lance tes dés | numériques, physiques |
| **Unités** | Distances et poids | métriques, impériales |
| **Voix** | Qui parle pour les personnages que tu rencontres : aux moments clés, le personnage lui-même, qui ne sait que ce qu'il sait, selon le choix du MJ ; toujours le MJ ; ou toujours le personnage, pour les principaux ou pour tous, plus lent et plus coûteux, là où ton appli d'IA le permet | auto, MJ, importants, toujours |
| **Compagnons** | Qui voyage avec toi | aucun, créés avec toi, créés par le MJ, rencontrés en jeu |
| **Images** | Des images des lieux, des quêtes et des gens que tu rencontres | aucune, sur demande, nouveaux lieux, quêtes et rencontres ([3.11](#311-pictures)) |
| **Lignes** et **Voiles** | Ce qui n'apparaît jamais, et ce qui se passe seulement hors champ | listes |
| **Langue** | La langue du jeu et du dashboard | au choix |

La cinquième édition ajoute l'**évolution** : points d'expérience ou paliers.

Sans monde écrit, le MJ demande aussi un **pitch** (genre, ton, quelques éléments, avec tes mots) et la **préparation** : construire le monde au fil de la partie, ou tout au début.

**Le style du MJ** n'est jamais demandé, mais tu peux le changer dans le chat ou dans **Paramètres** : la **prose** (simple, littéraire, pulp, pince-sans-rire), les **histoires** qu'il invente (situations, arcs, épisodes, mystère), un auteur dont **imiter l'écriture**, ou tout autre souhait **avec tes mots**.

### 2.7 Session zéro : ton personnage

Tu crées ton personnage avec le MJ, comme à une table. Chaque choix est le tien, sauf si tu demandes au MJ de le faire : viens avec une idée complète, une idée vague, ou rien du tout. Le MJ t'explique comment les scores de caractéristiques sont déterminés avant de lancer le moindre dé. Une histoire n'est jamais obligatoire ; si tu en donnes une, le MJ l'écrit avec tes mots. Ensuite, le MJ te propose une image de ton personnage ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcule la fiche : tu ne fais jamais les additions.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que ton personnage fait ou dit, avec tes propres mots :

> Je demande à l'aubergiste qui d'autre est passé ce soir.

Pour parler hors de l'histoire, écris entre crochets : *[Comment fonctionne la lutte ?]* Le MJ répond aussi entre crochets.

Tu dis ce que tu tentes ; le MJ dit ce qui se passe. Le MJ ne décide jamais à la place de ton personnage, et ne parle jamais du moteur. Tu peux lui demander comment utiliser le dashboard.

**Agir depuis le dashboard** : clique sur un nom de ta fiche, comme une arme, un sort ou un objet que tu portes, puis sur la cible ; ou clique sur une personne pour lui parler. Le dashboard écrit ta phrase, *J'attaque Bandit encapuchonné 1 avec la Masse.*, que tu peux modifier avant **Dire au MJ**. Le MJ l'entend comme si elle avait été dite dans le chat, et tranche comme pour toute autre action. Là où ton appli d'IA ne peut pas l'entendre toute seule, **Copier** la prépare pour que tu la colles dans le chat.

### 3.2 Les jets

Le MJ ne demande un jet que lorsque l'issue est incertaine et importe, et il dit d'abord ce qui est en jeu. Ensuite :

- **Sur le dashboard**, une bannière montre un bouton pour chaque test, par exemple *Acrobaties +4 · avec avantage*. Clique dessus : les dés tombent sur la page et le MJ entend le résultat. Tu peux aussi cliquer sur la ligne de ta fiche qui s'allume, lancer les dés depuis la piste de dés, ou écrire autre chose dans la bannière.
- **À la main**, dans le coin de la bannière ou dans **Paramètres** : la bannière t'indique ce qu'il faut lancer, et tu le lances depuis ta fiche ou la piste de dés.
- **Dés physiques**, quand le réglage des dés est sur physiques : tu écris les faces obtenues, *[J'ai fait 14.]*, et RPG Engine ajoute tes modificateurs.

**Jets libres** : clique sur n'importe quel nombre de ta fiche, ou ouvre la piste de dés, pour lancer les dés pour le plaisir. Ils ne comptent jamais et le MJ ne les voit jamais.

**Les jets du MJ** apparaissent dans ta colonne de jets, sauf les jets secrets. Tu peux toujours demander *[Ce jet était-il réel ?]* : pour un jet secret, le MJ donne une empreinte qui prouve qu'il a été fait avant ta question.

### 3.3 Scènes et combats

L'histoire se déroule en **scènes** : un combat, une conversation, une exploration, un voyage, un repos. À la fin de chaque scène, le jeu se sauvegarde tout seul, et la scène entre dans ton journal.

Dans un combat, le MJ raconte chaque tour qui n'est pas le tien, et s'arrête là où tu peux décider. La **Scène** affiche en haut à qui est le tour et qui vient ensuite, ainsi que la carte de ton personnage à côté de la carte du lieu ; l'ordre des tours, les points de vie de ton groupe et l'état des ennemis, décrit en mots, restent à côté de la page. Si ton personnage tombe, les jets de sauvegarde contre la mort s'affichent en grand sur la page.

### 3.4 Le temps, les voyages et le monde qui bouge

RPG Engine tient la date ; aucun temps ne passe entre les sessions. Dis que tu te reposes, *On fait un repos long*, et une fois que le MJ est d'accord, le repos rend ce qu'il doit rendre. Pendant un repos court, le MJ peut te demander sur le dashboard combien de dés de vie tu dépenses : lance-les un par un, vois ce que chacun soigne, et arrête-toi quand tu veux. Dis où tu vas, *On prend la route du nord vers Rocca*, et RPG Engine calcule le chemin, la distance et les jours, en s'arrêtant quand quelque chose arrive en route. L'argent se compte en pièces du jeu, monnaie comprise.

Les méchants ont des plans avec des échéances. Chaque nouveau jour, le MJ fait avancer les menaces que le temps a fait progresser, et tu en vois les signes, jamais l'horloge elle-même.

### 3.5 Cartes

**Monde** montre les lieux que ton personnage connaît, les routes qui les relient et le chemin que vous avez parcouru, avec du brouillard sur le reste. **Scène** montre la carte du lieu où tu te trouves, quand il en a une, avec qui se tient où ; en combat, à ton tour, les cases que tu ne peux pas atteindre sont voilées. Quand le MJ demande où tu te déplaces, touche une case, ou écris-la, par exemple *E4*.

### 3.6 Quêtes, journal et notes

Une tâche que ton personnage accepte devient une quête dans le **Journal**, avec ses objectifs, son échéance et ce qu'elle mesure ; mets-la en favori pour la garder en vue en haut de Scène. Le Journal raconte aussi ton **histoire**, scène après scène, et garde tes **notes** : privées, sauf si tu en **Partager** une, que le MJ entend comme ce que tu penses, jamais comme un fait.

### 3.7 L'histoire et l'image de ton personnage

Sur ta fiche, la carte **Description** contient une zone pour l'histoire de ton personnage : le MJ y écrit, après ton accord. Pour une image, donne au MJ un fichier (PNG, JPEG, WebP ou SVG, jusqu'à 5 Mo) avec son emplacement sur ton ordinateur, ou fais créer un portrait ([3.11](#311-pictures)) : *[Fais-moi un portrait : cheveux gris en tresse, une cicatrice au menton.]*

### 3.8 Sauvegardes et retours en arrière

RPG Engine sauvegarde toute la campagne à la fin de chaque scène. Le réglage **Sauvegardes** décide du reste :

| Sauvegardes | Sauvegarder quand tu veux | Revenir en arrière |
|---|---|---|
| **mort définitive** | non | jamais |
| **point de contrôle** | non | à la dernière sauvegarde, seulement quand ton personnage meurt |
| **libre** | oui | à n'importe quelle sauvegarde |

Dans tous les modes, tu peux **recommencer**, depuis le début du jeu ou depuis la session zéro. Fais-le dans le chat ou dans **Sauvegardes**.

Après un retour en arrière, **ouvre un nouveau chat** : l'ancien se souvient de ce qui a été annulé. Écris *continue* dans le nouveau chat, puis appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

### 3.9 Sessions : s'arrêter et reprendre

Arrête-toi quand tu veux : *[On s'arrête là pour ce soir.]* Tout est déjà sauvegardé dans les fichiers. Pour reprendre, lance ton agent dans le dossier de la campagne et écris *continue* : le MJ te fait un court résumé et poursuit.

### 3.10 L'humeur du MJ

Le robot en haut du dashboard, c'est le MJ : son visage suit le ton de l'histoire, sans jamais révéler ce que tu ne sais pas encore. Quand le chat est fermé, il dort.

### 3.11 Images

RPG Engine peut faire créer des images des lieux que tu atteins, des quêtes que tu acceptes et des gens que tu rencontres, selon le réglage **Images**, ainsi que le portrait de ton personnage quand tu le demandes. Il utilise ton propre Codex ou Claude Code, avec ta connexion, sur ton abonnement et ses limites : **Codex** les peint, sinon **Claude Code** les dessine. **Paramètres** indique si cet ordinateur peut les créer, et comment le configurer sinon. Tu peux toujours donner au MJ une image de ton choix.

### 3.12 Sécurité : lignes, voiles et stop

Les **lignes** n'apparaissent jamais dans le jeu ; les **voiles** se passent seulement hors champ. À tout moment, écris *[stop]* : le MJ abandonne aussitôt ce contenu et l'ajoute à tes lignes.

### 3.13 Changer d'avis

Chaque réglage peut changer, dans le chat ou dans **Paramètres**. Une décision que le MJ prend sans le livre de règles devient un **précédent**, pour que la même question reçoive la même réponse la prochaine fois.

---

## 4. Le tableau de bord <!-- icon: party -->

Une page sur ton propre ordinateur, ouverte seulement dans le navigateur de cet ordinateur, active tant que le chat est ouvert. Quand le chat se ferme, elle affiche *Non connecté* ; elle revient toute seule avec le chat suivant.

- **Groupe** : ta fiche et celles de tes compagnons. Clique sur un nombre pour le lancer ; survole-le pour voir d'où il vient. À côté, les jets.
- **Scène** : où tu es, son image et sa carte, qui est là, ce qui se passe ; en combat, les tours et la carte de ton personnage.
- **Journal** : les quêtes, l'histoire, tes notes.
- **Monde** : la carte du monde telle que ton personnage la connaît.
- **La piste de dés** : choisis des dés et un modificateur, puis lance.
- **Sauvegardes**, **Aide**, **Paramètres** et **À propos**, sous forme d'icônes au bout de la rangée. Paramètres contient aussi les préférences de la page : thème, son des dés, jeu de dés.

Quand le MJ te demande quelque chose, son bandeau reste en haut, quelle que soit la section où tu te trouves.

---

## 5. Systèmes de jeu et règles maison <!-- icon: dice -->

### 5.1 Qu'est-ce qu'un système de jeu ?

Les données d'un jeu : sa fiche, ses chiffres, ses créatures, ses objets, ses sorts et le texte de ses règles. Chaque campagne utilise un seul système. RPG Engine calcule la fiche, ce qui est dépensé et ce qui revient. Le fonctionnement d'une capacité, lui, est lu dans les règles par le MJ, qui tranche, comme à une vraie table.

### 5.2 Cinquième édition, incluse

Les races, les classes, les sous-classes, un historique et un don du SRD 5.1 ; les 319 sorts, les armes, les armures, les objets magiques et les monstres ; les chapitres de règles, que le MJ lit selon leur texte exact ; la fiche complète, calculée pour toi.

Tu peux aussi jouer du contenu absent du SRD, tiré d'un livre que tu possèdes : le MJ l'écrit sous forme de pages de ta campagne, et RPG Engine les traite comme les siennes. RPG Engine ne fournit que du contenu ouvert ; ce que connaît ton MJ n'a pas cette limite.

Tes propres manuels peuvent former ta bibliothèque. Dis au MJ où ils se trouvent, *[Mes manuels sont dans D:\Books\5e.]*, ou ajoute leur dossier dans Packages › Library, puis réponds oui dans la fenêtre que ton ordinateur affiche, une seule fois. RPG Engine les lit sur cet ordinateur. Chaque campagne utilise les dossiers que tu y actives. Quand le MJ doit trancher une règle, il les consulte après le SRD et cite le livre et la page. Ils se lisent mieux en texte, ou en PDF dont le texte peut être sélectionné. Un PDF numérisé est lu à partir des images de ses pages, sous Windows seulement, en quelques minutes et avec quelques erreurs. RPG Engine ne modifie jamais tes manuels, n'envoie jamais leur texte nulle part et ne le copie jamais dans une campagne.

### 5.3 Règles maison et ajouts personnels

Demande au MJ : *[Règle maison : un 1 naturel à l'attaque te fait lâcher ton arme.]* Il la retient comme un accord de la table, ou il écrit une page ou un chiffre de la fiche quand il le faut. Les règles maison déjà rédigées peuvent être placées sous forme de fichiers texte dans le dossier `rules` de la campagne.

### 5.4 Ajouter ou importer ton propre système de jeu

Pas encore : aujourd'hui, RPG Engine ne joue qu'à la cinquième édition ([Prévu pour plus tard](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

Pas encore. Une extension ajoutera quelque chose à une campagne, en plus de son système de jeu : un monde, une aventure, une fonction comme la météo, des règles maison à partager.

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

## 9. Prochainement <!-- icon: hourglass -->

- **Toi en MJ**, avec l'IA qui joue le groupe.
- **Mode auteur** : écris une aventure avec l'IA, puis exporte-la et partage-la.
- **Plusieurs joueurs sur le même ordinateur**, chacun avec son personnage, à tour de rôle dans le même chat.
- **Extensions** : réglages, aventures, fonctionnalités et règles maison.
- **D'autres jeux** : plus de systèmes de jeu, et les tiens.

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
