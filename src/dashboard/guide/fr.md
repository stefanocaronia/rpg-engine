<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine : le guide complet

**RPG Engine** te permet de jouer à un jeu de rôle sur table avec une **IA comme MJ**. Tu joues dans le **Tableau de bord**, une fenêtre sur ton ordinateur avec ta fiche, les dés, les cartes, ton journal et le **chat** avec le MJ.

Ce guide t'explique comment jouer. La page explique ses propres boutons : laisse le pointeur sur l'un d'eux pour voir à quoi il sert.

## Démarrage rapide <!-- icon: send -->

1. Installe **Node.js** depuis [nodejs.org](https://nodejs.org) (la version LTS).
2. Ouvre un nouveau terminal et écris `npm install -g rpg-engine`. Si Windows répond que l'exécution de scripts est désactivée, écris `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, réponds oui et réessaie.
3. Écris `rpg open`, et appuie sur Entrée quand il propose l'icône sur ton bureau ([2.2](#22-installing)). Ensuite, tu lances RPG Engine depuis l'icône.
4. Appuie sur **Nouvelle campagne**, donne-lui un nom et appuie sur **Créer** ([2.3](#23-a-new-campaign)).
5. Dans le chat, choisis ton appli d'IA et son modèle ([2.4](#24-connect-your-ai)) : Claude Code demande un abonnement Claude payant, Codex un compte ChatGPT, gratuit ou payant. Appuie sur **Ouvrir le chat**, puis sur **Commencer**.

La première réponse peut prendre quelques minutes. Ensuite, le MJ te demande comment tu veux jouer, et vous créez ton personnage ensemble.

## 1. Qu'est-ce que RPG Engine <!-- icon: about -->

| Qui | Ce qu'il fait |
|---|---|
| **Toi** | Tu joues ton personnage : ce qu'il fait, dit et tente. |
| **Le MJ** (l'IA) | Raconte l'histoire, joue tous les autres personnages, décide de ce qui arrive, demande des jets. |
| **RPG Engine** | Garde le monde dans des fichiers, lance les dés, compte les points de vie, l'argent, le temps et les distances, garde les secrets jusqu'à ce que tu les découvres. |

Le monde reste donc le même d'une soirée à l'autre, même dans un nouveau chat, même avec une autre IA :

- **Ce qui a été dit reste vrai.** Un méchant mort reste mort.
- **Les dés sont réels.** Le MJ ne peut pas les modifier, sauf à la difficulté la plus facile.
- **Les secrets restent secrets.** Le MJ ne te dit jamais ce que ton personnage ne sait pas.
- **Le monde bouge.** Les menaces avancent pendant que vous vous reposez ou voyagez.
- **Une campagne est un dossier** sur ton ordinateur : arrête-toi quand tu veux, reprends plus tard.

Un jeu prend la forme d'un système de jeu : aujourd'hui, le nôtre est la **cinquième édition**, tirée du System Reference Document 5.1, gratuit. Sans système de jeu, tu joues en mode libre, une histoire sans chiffres.

---

## 2. Pour commencer <!-- icon: path -->

### 2.1 Ce qu'il te faut

- Un ordinateur sous Windows, macOS ou Linux.
- **Node.js 24** ou plus récent, sur [nodejs.org](https://nodejs.org).
- Un **terminal**, seulement pour installer : sous Windows, Terminal ou PowerShell ; sous macOS, Terminal.
- Une **appli d'IA** pour le MJ, avec ton propre compte ([2.4](#24-connect-your-ai)).

### 2.2 Installer

```text
npm install -g rpg-engine
rpg open
```

La première ligne installe RPG Engine. Si npm propose de se mettre à jour, tu peux l'ignorer.

`rpg open` ouvre la fenêtre de RPG Engine. La première fois, il propose une icône sur ton bureau et dans ton menu : appuie sur Entrée pour dire oui. Ensuite, tu lances RPG Engine depuis l'icône.

Si l'installation échoue, vérifie que `node --version` indique 24 ou plus. Si Windows répond que l'exécution de scripts est désactivée, écris `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` et réponds oui. Sous Windows, garde RPG Engine et tes campagnes hors des chemins qui contiennent `&`.

### 2.3 Une nouvelle campagne

Appuie sur **Nouvelle campagne**, puis choisis son **Nom**, sa **Langue** et son **Système de jeu**. Le MJ fait le reste avec toi. Appuie sur **Créer** : la campagne s'ouvre dans une fenêtre à part.

Le MJ et le Tableau de bord parlent la langue de la campagne. Le texte des règles de la cinquième édition reste en anglais, et le MJ te le raconte dans ta langue.

La campagne est un dossier à son nom, dans le dossier `RPG Engine` de ton dossier personnel. La fois suivante, clique sur sa carte.

### 2.4 Connecter ton IA

Le MJ tourne dans une **appli d'IA** sur ton ordinateur, avec ton compte. Un chat web comme claude.ai ou ChatGPT ne suffit pas : le MJ doit pouvoir accéder aux fichiers de la campagne.

- **Claude Code** : un abonnement Claude payant (Pro ou supérieur).
- **Codex** : un compte ChatGPT, gratuit ou payant.
- **OpenCode** : aucun compte ; quelques modèles gratuits pour une durée limitée, ou ceux de ton propre fournisseur, y compris les modèles locaux.
- **Antigravity** : un compte Google ; son offre gratuite a des limites hebdomadaires.

Dans le chat, choisis l'appli, son **Modèle** et la **Réflexion du MJ**. Si l'appli manque ou si tu n'es pas connecté, un bouton l'installe, te connecte ou ouvre son site. RPG Engine ne voit jamais ton mot de passe.

Une soirée de jeu, c'est un long chat : avec les abonnements les plus modestes, tu peux atteindre la limite avant la fin de la soirée. Joue avec le plus grand modèle dont tu disposes : un petit modèle se laisse plus facilement convaincre de révéler des secrets.

Nous jouons et testons surtout RPG Engine avec **Claude Code**. Antigravity est **en test** : il peut sortir du jeu, et il garde tes chats dans une mémoire que tu ne peux pas désactiver. Ce que tu y écris part chez Google, qui peut le faire relire par des personnes. RPG Engine n'est pas un produit Google.

### 2.5 Le premier chat

Appuie sur **Ouvrir le chat**, puis sur **Commencer**. La première réponse peut prendre quelques minutes. Ensuite, une nouvelle campagne passe par trois étapes :

1. **Paramètres** : le MJ te demande comment tu veux jouer, quelques questions à la fois : la dureté du monde, la possibilité de mourir, le moment où tu peux revenir à une sauvegarde. Écris *À toi de décider* pour lui laisser le choix. Tout peut changer plus tard.
2. **Session zéro** : tu crées ton personnage avec le MJ, comme à une table. RPG Engine fait les calculs de la fiche. Si tu as déjà un personnage, colle sa fiche dans le chat.
3. **Jeu** : le MJ installe la première scène.

### 2.6 Jouer dans ton appli d'IA

Tu peux aussi jouer dans le chat propre à ton appli d'IA, dans un terminal ou dans son appli de bureau, avec le Tableau de bord à côté.

1. Ouvre un terminal dans le dossier où tu ranges tes jeux : fais un clic droit sur le dossier et choisis **Ouvrir dans le Terminal** (Windows) ou **Services > Nouveau terminal au dossier** (macOS).
2. Écris `rpg init "The Salt Isles"` : cela crée le dossier `The Salt Isles` avec une nouvelle campagne dedans.
3. Lance ton appli dans ce dossier : `claude`, `codex`, `agy` pour Antigravity, ou `opencode`. Réponds oui quand elle demande si tu fais confiance au dossier : dans Claude Code, la réponse déjà sélectionnée est *No, exit*.
4. Écris *Salut ! On commence.* Le MJ te donne le lien vers ton Tableau de bord : ouvre-le à côté du chat.

Bon à savoir :

- N'ouvre pas les détails des outils que ton appli utilise (dans Claude Code, ctrl+o) : ils peuvent montrer des secrets.
- Dans l'appli de bureau de Codex, désactive les mémoires pour les chats du jeu.
- Si le MJ ne connaît pas le jeu, écris `rpg init` dans le dossier de la campagne et ouvre un nouveau chat.
- Si Windows ne trouve pas `claude`, ajoute au PATH le dossier que son installateur a indiqué, puis ouvre un nouveau terminal.
- Un seul chat à la fois joue une campagne : tant que le tien est ouvert, le chat du Tableau de bord attend.

---

## 3. Jouer <!-- icon: chat -->

### 3.1 Parler avec le MJ

Écris ce que fait ou dit ton personnage :

> Je demande à l'aubergiste qui d'autre est passé ce soir.

Tu dis ce que tu tentes ; le MJ dit ce qui arrive. Il ne décide jamais à la place de ton personnage.

Pour parler hors de l'histoire, écris `[OOC: …]` (hors personnage) : *[OOC: Comment fonctionne la lutte ?]* Tu peux interroger le MJ sur les règles, ou sur le fonctionnement du Tableau de bord.

Quand le MJ te pose une question, réponds avec ses boutons ou avec tes propres mots. Tu peux aussi agir depuis ta fiche : clique sur une arme, un sort ou un objet, et choisis ce que tu en fais.

**Ordres permanents** : dis à tes compagnons quelque chose qui doit durer, par exemple *Désormais, laissez toujours un ennemi en vie*. Le MJ le garde jusqu'à ce que tu le retires.

### 3.2 Jets

Le MJ ne demande un jet que lorsque l'issue est incertaine et compte. Une bannière affiche le jet : clique dessus et les dés tombent.

Les dés appartiennent à RPG Engine, pas au MJ. Tu peux toujours demander *[Ce jet était-il réel ?]* : même pour un jet secret, le MJ peut prouver qu'il a été fait avant ta question.

Quand le réglage **Dés** est sur physiques, lance tes propres dés et écris le résultat : *[J'ai fait 14.]* Les jets que tu fais pour le plaisir, depuis ta fiche ou avec **Jet libre**, ne comptent jamais.

### 3.3 Scènes, combats et voyages

L'histoire se déroule en **scènes** : un combat, une conversation, un voyage, un repos. À la fin de chaque scène, le jeu se sauvegarde tout seul, et la scène entre dans ton journal.

Dans un combat, le MJ joue chaque tour qui n'est pas le tien, et s'arrête quand tu dois décider.

Dis où tu vas, *On prend la route du nord vers Rocca* : RPG Engine calcule la distance et les jours, et s'arrête si quelque chose se passe en route. Pendant ce temps, les plans des méchants avancent, et tu en vois les signes.

### 3.4 Sauvegardes

RPG Engine sauvegarde la campagne à la fin de chaque scène. Le réglage **Sauvegardes** décide du moment où tu peux revenir en arrière :

- **Mort définitive** : jamais.
- **Point de sauvegarde** : à la dernière sauvegarde, seulement quand ton personnage meurt.
- **libre** : à n'importe quelle sauvegarde, et tu peux sauvegarder quand tu veux.

Dans tous les modes, tu peux recommencer, dans le chat ou dans **Sauvegardes**.

Après un retour en arrière, ouvre un nouveau chat, car l'ancien se souvient de ce qui a été annulé :

1. Appuie sur **Fermer le chat**, puis sur **Nouveau chat**. Dans le chat propre à ton appli d'IA, ouvre une nouvelle conversation (`/clear` dans Claude Code).
2. Écris *Continuer*.
3. Appuie sur **J'ai ouvert un nouveau chat** dans Sauvegardes. Jusque-là, le MJ attend.

### 3.5 S'arrêter et reprendre

Arrête-toi quand tu veux : tout est déjà sauvegardé. Ferme la fenêtre du Tableau de bord, et peu après le jeu s'arrête. Rien n'est perdu.

Pour revenir, ouvre RPG Engine depuis son icône et clique sur ta campagne. Appuie sur **Reprendre le chat**, puis sur **Reprendre** : le MJ te rappelle où tu en étais et continue. La fois suivante, tu peux aussi choisir une autre appli d'IA.

### 3.6 Limites et stop

Les **Lignes** n'apparaissent jamais dans le jeu ; les **Voiles** n'ont lieu que hors champ. Tu les règles dans **Paramètres**.

À tout moment, écris *[stop]* : le MJ abandonne ce contenu et l'ajoute à tes lignes.

### 3.7 Images

Le MJ peut faire créer des images des lieux, des quêtes et des personnes, selon le réglage **Images**, ainsi qu'un portrait de ton personnage quand tu le demandes. Ton appli d'IA les crée, sur ton abonnement. Si aucune n'apparaît, **Paramètres** indique si cet ordinateur peut en créer.

Tu peux aussi donner à ton personnage, ou à une page du monde, une image à toi, depuis la page elle-même.

---

## 4. Le tableau de bord <!-- icon: party -->

La fenêtre où tu vois ta partie. Elle ne montre que ce que ton personnage sait.

- **Roleplay** : le chat avec le MJ, quand il n'est pas à côté de la page.
- **Groupe** : ta fiche, celles de tes compagnons et les jets.
- **Scène** : où tu es, qui est là et la carte ; pendant un combat, les tours.
- **Journal** : les quêtes, l'histoire comme un livre, les journaux de tes compagnons et tes notes.
- **Monde** : la carte du monde, ce que sait ton personnage, les documents trouvés et le calendrier.
- **Sauvegardes** : revenir en arrière et recommencer.
- **Paramètres** : comment tu joues, et l'aspect de la page.
- **Paquets** : le système de jeu, les extensions, tes manuels, et les mises à jour : quand une nouvelle version de RPG Engine sort, elle est signalée ici.

Si la page indique qu'elle n'est pas connectée, appuie sur **Rouvrir la campagne**.

Pour jouer depuis ton téléphone, chez toi : dans **Paramètres**, **Tableau de bord**, active **Accès depuis le téléphone** et cadre le code avec le téléphone, sur le même Wi-Fi que l'ordinateur. Windows peut demander si Node.js peut utiliser le réseau : autorise-le sur les réseaux privés, et règle le Wi-Fi comme réseau privé. Le jeu circule sans chiffrement : utilise-le seulement sur un réseau de confiance, comme celui de ta maison ; jamais sur un Wi-Fi public, d'hôtel ou de bureau. Désactive-le quand tu as fini : la partie se termine avec la dernière fenêtre de l'ordinateur.

Si un thème rend la page difficile à lire, ajoute `#/settings/page` à la fin de son adresse, et désactive **Style propre au thème**.

---

## 5. Règles, manuels et extensions <!-- icon: dice -->

Un **Système de jeu** réunit les données d'un jeu : la fiche, les créatures, les objets, les sorts et les règles. RPG Engine calcule la fiche. Pour l'application d'une règle, le MJ lit et décide, comme à une table.

La **cinquième édition** contient les règles libres du System Reference Document 5.1. Tu peux aussi jouer du contenu tiré d'un livre que tu possèdes : le MJ l'écrit dans ta campagne.

**Tes manuels** : indique au MJ où ils se trouvent, ou ajoute leur dossier dans **Paquets**. Le MJ y cherche les règles et cite le livre et la page. RPG Engine ne les modifie jamais et ne les copie jamais dans une campagne.

**Règles maison** : demande au MJ, *[House rule: a natural 1 on an attack means you drop your weapon.]* Il retient la règle. Une décision qu'il prend une fois vaut aussi les fois suivantes.

**Les extensions** ajoutent un élément au jeu, comme la météo. Ajoute-les dans **Paquets**, ou demande au MJ.

---

## 6. Ta propre aventure <!-- icon: world -->

Sans monde écrit, le MJ en construit un à partir de ton point de départ, et le conserve.

Pour jouer une aventure ou un livre que tu possèdes, donne son fichier au MJ : *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Un fichier extérieur à la campagne n'est lu qu'après ton accord. La lecture est meilleure avec du texte, un EPUB, un document Word ou un PDF dont le texte peut être sélectionné.

Le document entier est transmis à l'entreprise de l'IA qui le lit. Une campagne se joue une seule fois : pour rejouer la même aventure, crée une nouvelle campagne.

---

## 7. Tes données <!-- icon: lock -->

- Une campagne est un dossier. Il contient les secrets de la campagne, ainsi que tes conversations avec le MJ : tu n'as jamais besoin de l'ouvrir.
- RPG Engine lit et écrit uniquement dans ce dossier. Tes manuels, il les lit seulement. Tout le reste en dehors de la campagne, il n'y touche qu'après ton accord, dans une fenêtre de ton ordinateur.
- Dans le chat du tableau de bord, le MJ n'ouvre aucun de tes fichiers de lui-même.
- Ce que tu écris est transmis à l'entreprise dont le modèle joue le MJ, selon les conditions de ton compte. Avec un modèle local, tout reste sur ton ordinateur.
- Un système de jeu ou une extension qui ne vient pas de nous est du code qui s'exécute sur ton ordinateur : il n'est installé qu'avec ton accord. Donne ton accord uniquement à des auteurs de confiance.
- Si le dossier de la campagne est un dépôt git, les **Paramètres** peuvent y faire un commit à ta place. N'y inclus tes conversations que si le dépôt est privé.
- Quand l'**Accès depuis le téléphone** est activé, le jeu circule sans chiffrement de l'ordinateur au téléphone, sur ton réseau domestique, sans passer par aucun service extérieur : toute personne présente sur ce réseau pourrait le lire.
