<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
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
- Un **agent IA** pour le MJ ([2.4](#24-connect-your-ai)), avec le **plus grand modèle** qu'il propose : un petit modèle se laisse plus facilement convaincre de révéler des secrets ou de contourner les règles.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` vérifie que tout a marché. Tu utilises `rpg` une seule fois par campagne, pour la créer. Ensuite, ton agent lance RPG Engine tout seul.

### 2.3 Créer une campagne

Ouvre un terminal dans le dossier où tu ranges tes parties ([2.1](#21-what-you-need) explique comment) :

```text
rpg init "The Salt Isles"
```

Cela crée le dossier `The Salt Isles` avec une nouvelle campagne dedans. Entres-y avec `cd "The Salt Isles"`. Retiens où il se trouve : tu y reviens à chaque partie. Tu choisis tout le reste plus tard, dans le chat ou sur le tableau de bord. `rpg init --help` liste les options pour en choisir dès maintenant, comme `--language it` ou `--difficulty hard`.

Le MJ ne peut pas créer une campagne à ta place : avant `init`, rien n'indique à ton agent où se trouve RPG Engine.

### 2.4 Connecter ton IA

Le MJ fonctionne dans un **agent IA** : une appli d'IA, dans le terminal ou sur le bureau, qui peut travailler avec les fichiers de ton ordinateur, comme Claude Code ou Codex. Un simple chat comme claude.ai ou ChatGPT, ou une appli de téléphone, ne suffit pas : le MJ doit pouvoir accéder aux fichiers de la campagne sur ton ordinateur. Chaque agent demande son propre abonnement et sa propre connexion : Claude Code un abonnement Claude payant, Codex une connexion ChatGPT. Tu l'installes une fois, depuis sa propre page : [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code** : dans le dossier de la campagne, écris `claude`. Quand il demande si tu fais confiance au dossier, choisis **Yes, I trust this folder** ; attention, la réponse déjà sélectionnée est *No, exit*.
- **Codex** : dans le dossier de la campagne, écris `codex`, et réponds oui quand il demande si tu fais confiance au dossier. Dans son appli de bureau, vérifie dans les paramètres que les mémoires sont désactivées pour les chats du jeu.
- **Un autre agent** : lance-le dans le dossier de la campagne et donne-lui le serveur MCP `rpg mcp`. RPG Engine est un serveur MCP standard : tout agent qui gère MCP peut être le MJ, y compris les agents locaux.

Nous jouons et testons avec **Claude Code**. **Codex** est connecté et vérifié, mais aucune campagne entière n'a encore été jouée avec lui. `init` prépare aussi **Gemini CLI**. La campagne désactive la mémoire propre de l'agent : la partie vit dans ses fichiers, pour qu'un retour à une sauvegarde revienne vraiment en arrière.

### 2.5 Le premier chat

Écris ce que tu veux, par exemple *Salut ! On commence.* Dans sa première réponse de chaque chat, le MJ te donne le **lien vers ton tableau de bord**, quelque chose comme `http://127.0.0.1:4750` : ouvre-le et garde-le à côté du chat.

Entre les messages du MJ, ton agent montre les outils qu'il utilise. N'ouvre pas leurs détails (dans Claude Code, ctrl+o) : ils peuvent révéler des secrets.

Une nouvelle campagne passe par trois étapes, affichées en haut du tableau de bord : **1 Paramètres** (comment tu veux jouer), **2 Session zéro** (tu crées ton personnage, en jouant), **3 Jeu**.

### 2.6 Paramètres : choisir comment jouer

Le MJ ne demande que ce qui manque encore, quelques questions à la fois. L'étape **Paramètres** du tableau de bord montre les mêmes questions sous forme de cartes. Écris « choisis toi-même » et le MJ décide. Tout peut changer plus tard, dans le chat ou dans **Paramètres**.

| Réglage | Ce qu'il décide | Valeurs |
|---|---|---|
| **Mentor** | Combien le MJ t'enseigne les règles | désactivé, conseils, tutoriel |
| **Difficulté** | Le niveau d'exigence du monde | histoire, facile, normal, difficile, brutal |
| **Létalité** | Ce que signifie tomber en combat | narrative (jamais de mort), épique (seulement quand c'est important), dés |
| **Sauvegardes** | Quand tu peux revenir en arrière | mort définitive, point de contrôle, libre ([3.8](#38-saves-and-going-back)) |
| **Rigueur** | À quel point la nourriture, la lumière et les voyages suivent les règles | fluide, règles, simulation |
| **Dés** | Qui lance tes dés | numériques, physiques |
| **Unités** | Distances et poids | métriques, impériales |
| **Compagnons** | Qui voyage avec toi | aucun, créés avec toi, créés par le MJ, rencontrés en jeu |
| **Images** | Images des lieux, des quêtes et des personnes rencontrées | aucune, sur demande, nouveaux lieux, quêtes et personnes rencontrées ([3.11](#311-pictures)) |
| **Lignes** et **Voiles** | Ce qui n'apparaît jamais, et ce qui se passe seulement hors champ | listes |
| **Langue** | La langue du jeu et du tableau de bord | toutes |

La cinquième édition ajoute la **progression** : points d'expérience ou paliers.

Sans monde déjà écrit, le MJ demande aussi un **pitch** (genre, ton, quelques éléments, avec tes mots) et la **préparation** : construire le monde au fil du jeu, ou tout au début.

**Le style du MJ** n'est jamais demandé, mais tu peux le changer dans le chat ou dans **Paramètres** : la **prose** (simple, littéraire, pulp, pince-sans-rire), les **histoires** qu'il invente (situations, arcs, épisodes, mystère), un auteur ou une autrice dont **imiter l'écriture**, ou tout autre souhait **avec tes mots**.

### 2.7 Session zéro : ton personnage

Tu crées ton personnage avec le MJ, comme à une table. Chaque choix est le tien, sauf si tu demandes au MJ de le faire : viens avec une idée précise, une idée floue, ou rien du tout. Le MJ t'explique comment sont déterminés les scores de caractéristiques avant qu'un seul dé soit lancé. Ton histoire n'est jamais obligatoire. Si tu en donnes une, le MJ l'écrit avec tes mots. Ensuite, le MJ demande une image de ton personnage ([3.7](#37-your-characters-story-and-picture)). RPG Engine calcule la fiche : tu ne fais jamais les additions.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que fait ou dit ton personnage, avec tes propres mots :

> Je demande à l'aubergiste qui d'autre est passé ce soir.

Pour sortir de l'histoire, écris entre crochets : *[Comment marche la lutte ?]* Le MJ répond aussi entre crochets.

Tu dis ce que tu tentes ; le MJ dit ce qui arrive. Le MJ ne décide jamais à la place de ton personnage, et ne parle jamais du moteur de jeu. Tu peux lui demander comment utiliser le tableau de bord.

### 3.2 Les jets

Le MJ demande un jet seulement quand l'issue est incertaine et compte, et il dit d'abord ce qui est en jeu. Ensuite :

- **Sur le tableau de bord**, une bannière affiche un bouton pour chaque test, par exemple *Acrobaties +4 · avec avantage*. Clique dessus : les dés tombent sur la page et le MJ en entend le résultat. Tu peux aussi cliquer sur la ligne de ta fiche qui s'allume, lancer les dés depuis la piste de dés, ou écrire autre chose dans la bannière.
- **À la main**, dans le coin de la bannière ou dans **Paramètres** : la bannière t'indique quoi lancer, et tu le lances depuis ta fiche ou la piste de dés.
- **Dés physiques**, avec le réglage des dés sur physiques : tu écris les faces obtenues, *[J'ai fait 14.]*, et RPG Engine ajoute tes modificateurs.

**Jets libres** : clique sur n'importe quel nombre de ta fiche, ou ouvre la piste de dés, pour lancer juste pour le plaisir. Ils ne comptent jamais et le MJ ne les voit jamais.

**Les jets du MJ** apparaissent dans ta colonne de jets, sauf les jets secrets. Tu peux toujours demander *[Ce jet était-il réel ?]* : pour un jet secret, le MJ donne une empreinte qui prouve qu'il a été fait avant ta question.

### 3.3 Scènes et combats

L'histoire se déroule en **scènes** : un combat, une conversation, une exploration, un voyage, un repos. À la fin de chaque scène, la partie est sauvegardée automatiquement, et la scène entre dans ton journal.

Dans un combat, le MJ raconte tous les tours qui ne sont pas les tiens, et s'arrête là où tu peux décider. La section **Combat** montre l'ordre des tours, les points de vie de ton groupe et l'état des ennemis, en mots. Si ton personnage tombe, les jets de sauvegarde contre la mort s'affichent en grand sur la page.

### 3.4 Le temps, les voyages et le monde qui bouge

RPG Engine tient la date ; aucun temps ne passe entre les sessions. Dis que vous vous reposez, *On prend un long repos*, et le repos rend ce qu'il doit rendre. Dis où tu vas, *On prend la route du nord vers Rocca*, et RPG Engine calcule le chemin, la distance et les jours, en s'arrêtant quand quelque chose se passe en route. L'argent est compté dans les pièces du jeu, monnaie rendue comprise.

Les méchants ont des plans avec des échéances. Chaque nouveau jour, le MJ fait avancer les menaces que le temps a fait progresser, et tu en vois les signes, jamais l'horloge elle-même.

### 3.5 Cartes

**Monde** montre les lieux que ton personnage connaît, les routes entre eux et le chemin que tu as parcouru, avec du brouillard sur le reste. **Scène** montre la carte du lieu où tu te trouves, quand il en a une, avec la position de chacun ; en combat, à ton tour, les cases que tu ne peux pas atteindre sont voilées. Quand le MJ demande où tu te déplaces, touche une case, ou écris-la, par exemple *E4*.

### 3.6 Quêtes, journal et notes

Une tâche que ton personnage prend en charge devient une quête dans le **Journal**, avec ses objectifs, son échéance et ce qu'elle mesure ; mets-la en favori pour la garder sous les yeux en haut de Scène. Le Journal raconte aussi ton **histoire**, scène par scène, et garde tes **notes** : privées, sauf si tu en **Partages** une, que le MJ entend comme ce que tu penses, jamais comme un fait.

### 3.7 L'histoire et l'image de ton personnage

Sur ta fiche, la carte **Description** a une zone pour l'histoire de ton personnage : le MJ y écrit, après ton accord. Pour une image, donne au MJ un fichier (PNG, JPEG, WebP ou SVG, jusqu'à 5 Mo) avec son emplacement sur ton ordinateur, ou fais créer un portrait ([3.11](#311-pictures)) : *[Fais-moi un portrait : cheveux gris en tresse, une cicatrice au menton.]*

### 3.8 Sauvegardes et retour en arrière

RPG Engine sauvegarde toute la campagne à la fin de chaque scène. Le réglage **Sauvegardes** décide du reste :

| Sauvegardes | Sauvegarder quand tu veux | Revenir en arrière |
|---|---|---|
| **mort définitive** | non | jamais |
| **point de contrôle** | non | à la dernière sauvegarde, seulement quand ton personnage meurt |
| **libre** | oui | à n'importe quelle sauvegarde |

Dans tous les modes, tu peux **recommencer**, depuis le début du jeu ou depuis la session zéro. Fais-le dans le chat ou dans **Sauvegardes**.

Après un retour en arrière, **ouvre un nouveau chat** : l'ancien se souvient de ce qui a été annulé. Écris *continue* dans le nouveau chat, puis appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

### 3.9 Sessions : s'arrêter et revenir

Arrête-toi quand tu veux : *[On s'arrête là pour ce soir.]* Tout est déjà sauvegardé dans les fichiers. Pour revenir, lance ton agent dans le dossier de la campagne et écris *continue* : le MJ te fait un court résumé et reprend.

### 3.10 L'humeur du MJ

Le robot en haut du tableau de bord, c'est le MJ : son visage suit le ton de l'histoire, sans jamais révéler ce que tu ne sais pas encore. Quand le chat est fermé, il dort.

### 3.11 Images

RPG Engine peut faire créer des images des lieux que tu atteins, des quêtes que tu prends et des personnes que tu rencontres, selon le réglage **Images**, ainsi que le portrait de ton personnage quand tu le demandes. Il utilise ce qui se trouve sur ton ordinateur, avec ta propre connexion : **Codex** les peint, sinon **Claude Code** les dessine. **Paramètres** indique si cet ordinateur peut en créer, et comment le configurer sinon. Tu peux toujours donner au MJ une image à toi.

### 3.12 Sécurité : lignes, voiles et stop

Les **lignes** n'apparaissent jamais dans le jeu ; les **voiles** se passent seulement hors champ. À tout moment, écris *[stop]* : le MJ abandonne aussitôt ce contenu et l'ajoute à tes lignes.

### 3.13 Changer d'avis

Chaque réglage peut changer, dans le chat ou dans **Paramètres**. Une décision que le MJ prend sans le livre devient un **précédent**, pour que la même question reçoive la même réponse la prochaine fois.

---

## 4. Le tableau de bord <!-- icon: party -->

Une page sur ton propre ordinateur, ouverte seulement dans le navigateur de cet ordinateur, active tant que le chat est ouvert. Quand le chat se ferme, elle affiche *Not connected* ; elle revient toute seule avec le chat suivant.

- **Groupe** : ta fiche et celles de tes compagnons. Clique sur un nombre pour le lancer ; survole-le pour voir d'où il vient. À côté, les jets.
- **Scène** : où tu es, son image et sa carte, qui est là, ce qui se passe.
- **Combat** : seulement pendant un combat : les tours, les combattants, ce que tu as sous la main.
- **Journal** : les quêtes, l'histoire, tes notes.
- **Monde** : la carte du monde telle que ton personnage la connaît.
- **La piste de dés** : choisis des dés et un modificateur, puis lance.
- **Sauvegardes**, **Aide**, **Paramètres** et **À propos**, sous forme d'icônes au bout de la rangée. Paramètres contient aussi les préférences de la page elle-même : thème, son des dés, type de dés.

Quand le MJ te pose une question, sa bannière reste en haut, quelle que soit la section où tu te trouves.

---

## 5. Systèmes de jeu et règles maison <!-- icon: dice -->

### 5.1 Ce qu'est un système de jeu

Les données d'un jeu : sa fiche, ses nombres, ses créatures, ses objets, ses sorts et le texte de ses règles. Chaque campagne joue un seul système. RPG Engine calcule la fiche, ce qui est dépensé et ce qui revient ; pour savoir comment fonctionne une capacité, le MJ lit les règles et décide, comme à une table.

### 5.2 La cinquième édition, incluse

Les races, les classes, les sous-classes, un historique et un don du SRD 5.1 ; les 319 sorts, les armes, les armures, les objets magiques et les monstres ; les chapitres de règles, que le MJ lit dans leur texte exact ; la fiche complète, calculée.

Tu peux aussi jouer du contenu qui manque au SRD, tiré d'un livre que tu possèdes : le MJ l'écrit sous forme de pages de ta campagne, et RPG Engine les traite comme les siennes. RPG Engine ne fournit que du contenu libre ; ce que ton MJ connaît n'a pas cette limite.

### 5.3 Règles maison et ajouts personnels

Demande au MJ : *[Règle maison : un 1 naturel sur une attaque fait lâcher ton arme.]* Il la garde comme un accord de la table, ou écrit une page ou un nombre de la fiche quand il en faut un. Les règles maison déjà rédigées peuvent aller dans des fichiers texte, dans le dossier `rules` de la campagne.

### 5.4 Ajouter ou importer ton propre système de jeu

Pas encore : aujourd'hui, RPG Engine ne joue que la cinquième édition ([Plus tard](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

Pas encore. Une extension ajoutera quelque chose à une campagne, en plus de son système de jeu : un monde, une aventure, une fonction comme la météo, des règles maison à partager.

---

## 7. D'où vient une campagne, et sa langue <!-- icon: world -->

### 7.1 Trois façons d'avoir un monde

- **Créé au fil du jeu** : à partir de ton pitch, le MJ construit chaque lieu, personnage et intrigue juste avant que tu en aies besoin, et le garde.
- **Préparé au début** : pareil, mais avec le monde construit avant le jeu.
- **À partir de ta propre aventure** : donne au MJ un texte ou un PDF et demande-lui de la mettre en place, *[Mets en place cette aventure comme notre campagne. Ne me dis rien de ce qu'elle contient.]* Il écrit les lieux, les personnages et les secrets. Il n'y a pas encore de bouton d'importation.

Une campagne se joue une seule fois : pour rejouer la même aventure, crée une nouvelle campagne.

### 7.2 Langues

Une langue par campagne, celle du MJ, que le tableau de bord suit. Le tableau de bord est fourni en 26 langues. Toute autre est traduite sur ton ordinateur par Codex ou Claude Code, ou, sans eux, par le MJ dans le chat. Les termes de la cinquième édition en italien viennent du SRD italien officiel ; le texte des règles reste en anglais, et le MJ le raconte dans ta langue.

---

## 8. Pour les curieux : le dossier de la campagne <!-- icon: list -->

Tu n'as jamais besoin de l'ouvrir, et il contient les secrets de ta campagne. Il comprend `campaign.yaml` (tes réglages), `state.yaml` (où en est la partie), `world/` (une page markdown pour chaque personnage, lieu, quête et le reste), `rules/` (tes règles maison), `images/`, `log.jsonl` (chaque changement), `.saves/`, `.player/` (tes notes), et les petits fichiers qui indiquent aux agents IA où se trouve RPG Engine. Les pages utilisent le format d'Obsidian. Si tu modifies une page à la main, le MJ l'apprend à sa prochaine réponse.

Chaque commande que le MJ utilise peut aussi être lancée dans le dossier de la campagne : `rpg --help` les liste. Beaucoup affichent les secrets de la campagne.

---

## 9. Plus tard <!-- icon: hourglass -->

- **Toi comme MJ**, avec l'IA qui joue le groupe.
- **Mode auteur** : écrire une aventure avec l'IA, puis l'exporter et la partager.
- **Plusieurs joueurs et joueuses sur le même ordinateur**, chacun avec son personnage, à tour de rôle dans le même chat.
- **Extensions** : réglages, aventures, fonctions et règles maison.
- **Importer** tes manuels et tes aventures.
- **Autres jeux** : d'autres systèmes de jeu, et les tiens.

---

## 10. Questions et problèmes <!-- icon: info -->

### Questions

**Dois-je connaître les règles ?** Non. Choisis le mentor en mode tutoriel, et pose tes questions entre crochets quand tu veux.

**Le MJ peut-il tricher ?** Il ne peut pas modifier un jet fait par RPG Engine, sauf à la difficulté histoire, ni les faits déjà établis.

**Est-ce que ça coûte quelque chose ?** RPG Engine est gratuit. Le MJ fonctionne grâce à l'abonnement de ton agent, ou sur ton propre ordinateur avec un modèle local. Une soirée de jeu, c'est un long chat : avec les plus petits abonnements, tu peux atteindre la limite de l'abonnement avant la fin de la soirée. Les images et les traductions utilisent le même abonnement.

**Puis-je jouer sur mon téléphone ?** Non : le MJ fonctionne sur ton ordinateur, et le tableau de bord ne s'ouvre que là.

**Puis-je jouer avec des amis ?** Pas encore : aujourd'hui, un joueur ou une joueuse, un personnage, plus des compagnons ([Plus tard](#9-coming-later)).

**Puis-je utiliser une autre IA la prochaine fois ?** Oui : ouvre la campagne dans un autre agent et écris *continue*.

### Problèmes

**Le tableau de bord ne s'ouvre pas.** Demande au MJ : `[Quel est le lien du tableau de bord ?]`. Il ne fonctionne que tant qu'un chat est ouvert dans cette campagne, après la première réponse du MJ.

**Le MJ ne semble pas connaître le jeu.** Ton agent n'a pas chargé RPG Engine. Vérifie que tu l'as lancé dans le dossier de la campagne et que tu lui as fait confiance. Dans Claude Code, écris `/mcp` et reconnecte `rpg`. Dans Codex, `codex mcp list` dans le dossier de la campagne doit afficher `rpg`. Si `rpg --version` est introuvable, installe de nouveau RPG Engine ([2.2](#22-install)).

**Mise à jour.** Lance de nouveau `npm install -g rpg-engine`, puis ouvre un nouveau chat : un MJ déjà en cours garde la version avec laquelle il a démarré.

**Le MJ se souvient de quelque chose que j'ai annulé.** Ouvre un nouveau chat et appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes.

**Aucune image n'apparaît.** Paramètres > Images indique si cet ordinateur peut en créer, et comment.

**L'installation échoue, ou `rpg` ne démarre pas.** `node --version` doit indiquer 22 ou plus. Sous Windows, garde RPG Engine et tes campagnes loin des chemins qui contiennent `&`.

**Le lien du tableau de bord a changé.** Un autre programme a pris l'adresse habituelle ; le MJ te donne le nouveau lien.
