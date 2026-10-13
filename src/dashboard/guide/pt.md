<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 8b2b048d 7705224a 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: o guia completo

O **RPG Engine** permite que você jogue um RPG de mesa com uma **IA como mestre**.

Você conversa com o mestre em um **chat**: o mestre conta a história, interpreta todas as outras pessoas e decide o que acontece.

O RPG Engine trabalha nos bastidores: ele **lembra do mundo**, **rola os dados** e **faz as contas**.

Ao lado do chat, você mantém aberta no navegador uma página, o **dashboard**, com a ficha do seu personagem, os dados, os mapas e o seu diário.

Este guia é para quem joga: você não precisa saber programar.

## Início rápido <!-- icon: send -->

1. Instale o **Node.js** pelo site [nodejs.org](https://nodejs.org) (a versão LTS).
2. Instale o **Claude Code** ou o **Codex**, o aplicativo de IA em que o mestre funciona, e faça login ([2.4](#24-connect-your-ai)).
3. Abra um terminal e instale o RPG Engine: `npm install -g rpg-engine`.
4. No terminal, crie uma campanha: `rpg init "The Salt Isles"`.
5. Abra o Claude Code ou o Codex na pasta nova e escreva *Oi! Vamos começar.* O mestre responde com o link do seu painel: abra-o ao lado do chat.

O resto deste guia explica cada passo e, depois, como jogar.

## 1. O que é o RPG Engine <!-- icon: about -->

### Quem faz o quê

| Quem | O que faz |
|---|---|
| **Você** | Joga com o seu personagem. Diz o que ele faz, diz e tenta. |
| **O mestre** (a IA) | Conta a história, interpreta todos os outros personagens, decide o que acontece, pede rolagens. |
| **RPG Engine** | Guarda tudo em arquivos, rola os dados, conta pontos de vida, dinheiro, tempo e distâncias, e mantém os segredos até você descobri-los. |

Uma IA é boa para contar histórias e ruim para lembrar. Sozinha, ela esquece quem lhe deve dinheiro, quantas flechas você tem ou que a ponte pegou fogo duas sessões atrás. O RPG Engine guarda tudo isso, então o mundo continua o mesmo de uma noite para a outra, mesmo em um chat novo, mesmo com outra IA.

### Como é jogar

Você escreve no chat, como falaria em uma mesa:

> Empurro a porta devagar e olho lá dentro.

O mestre responde com o que você vê e para quando é a sua vez de escolher. Quando algo é incerto e importa, o mestre diz o que está em jogo e pede uma rolagem. Os botões da rolagem aparecem no seu painel. Você clica, os dados caem na página, e o mestre conta o que acontece.

### O que o torna diferente

- **O mundo é persistente.** O que foi dito continua valendo. Um vilão morto continua morto.
- **Os dados são de verdade.** O mestre não consegue entortá-los (exceto na dificuldade mais fácil, se você escolher).
- **Segredos continuam secretos.** O mestre nunca conta o que o seu personagem não sabe, mesmo que você insista.
- **O mundo se mexe sem você.** As ameaças avançam enquanto você descansa ou viaja, e você vê os sinais.
- **Muitas noites, uma só história.** Uma campanha é uma pasta no seu computador. Você pode parar quando quiser e continuar depois.

### O jogo que ele joga hoje

O RPG Engine foi feito para qualquer RPG de mesa. Hoje ele traz um sistema de jogo: a **quinta edição** (do System Reference Document 5.1, gratuito). Outros jogos virão; veja [Sistemas de jogo](#5-game-systems-and-house-rules) e [Em breve](#9-coming-later).

---

## 2. Primeiros passos <!-- icon: path -->

### 2.1 O que você precisa

- Um computador com Windows, macOS ou Linux.
- **Node.js 22** ou mais recente. Baixe em [nodejs.org](https://nodejs.org): a versão "LTS" serve. Ele vem com o `npm`, que instala o RPG Engine.
- Um **terminal**, a janela onde você escreve comandos: no Windows, o app Terminal ou o PowerShell; no macOS, o Terminal. Você o usa para instalar o RPG Engine, para criar cada campanha e para abrir o Claude Code ou o Codex.
- Um **host de IA**, o app em que o mestre roda: o **Claude Code** ou o **Codex**, com o plano e o login dele. Veja [2.4](#24-connect-your-ai).
- O **maior modelo** que seu host oferece. Um modelo pequeno se deixa enganar: nos nossos testes, ele contou segredos a um jogador que dizia ser o verdadeiro mestre.
- Um navegador, para o painel.

O login que você usa no seu host faz mais: o RPG Engine o usa, no seu computador, para desenhar imagens de locais, missões e do seu personagem, e para traduzir o painel para idiomas que ele não traz. Veja [Imagens](#311-pictures) e [Idiomas](#72-languages).

**Como abrir um terminal em uma pasta.** Muitos passos dizem "na pasta da campanha". No Windows, clique com o botão direito na pasta no Explorador de Arquivos e escolha **Abrir no Terminal**. No macOS, clique com o botão direito na pasta no Finder e escolha **Serviços > Novo Terminal na Pasta**. Ou, em um terminal já aberto, escreva `cd` e o caminho da pasta, como `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Instalar

Abra um terminal e escreva:

```text
npm install -g rpg-engine
```

Isso dá a você o comando `rpg`. Para conferir se funcionou:

```text
rpg --version
```

Você usa o `rpg` uma vez por campanha, para criá-la. Depois disso, você só conversa com o mestre: seu host de IA inicia o RPG Engine sozinho, com o mesmo comando `rpg`.

### 2.3 Criar uma campanha

Uma campanha é uma pasta. Abra um terminal na pasta onde você guarda seus jogos e escreva:

```text
rpg init "The Salt Isles"
```

Isso cria a pasta `The Salt Isles` com uma campanha nova dentro e diz o que fazer em seguida:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

As linhas depois de *For the master* são para o mestre, que as lê no chat: você não precisa fazer nada com elas. Guarde onde fica a pasta: você volta a ela toda vez que jogar. Sem um nome de pasta, o `rpg init` transforma a pasta em que você está na campanha.

O `init` cria tudo de que a campanha precisa: as configurações, as pastas do mundo e os pequenos arquivos que dizem ao seu host de IA para usar o RPG Engine e para não guardar memória própria fora da campanha.

Você não precisa escolher nada agora. O mestre pergunta o resto no chat, ou você escolhe no painel. Se você já sabe algumas escolhas, pode dá-las aqui:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Isso cria a pasta `salt-isles`, com a campanha *The Salt Isles* dentro: um nome de pasta sem espaços e o nome da campanha como você quiser.

| Opção | O que define | Valores |
|---|---|---|
| `--name` | O nome da campanha | qualquer um; o nome da pasta, se você omitir |
| `--language` | O idioma do jogo | um código, como `en`, `it`, `fr` |
| `--system` | O sistema de jogo | `5e`, por ora o único |
| `--difficulty` | Quão difícil é o mundo | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | O que significa cair em combate | `narrative`, `epic`, `dice` |

`rpg init --help` também lista as opções. Uma campanha não pode ficar dentro da pasta de outra campanha.

Você não pode pedir ao mestre que crie uma campanha: antes do `init`, a pasta não tem nada que diga ao seu host de IA onde está o RPG Engine.

### 2.4 Conectar sua IA

O RPG Engine funciona com o **Claude Code** e o **Codex**. Outros apps de IA que usam ferramentas MCP podem funcionar também, mas não garantimos.

**Instalando seu host.** O Claude Code e o Codex rodam no terminal: não são o app Claude ou ChatGPT do celular. Cada um precisa de plano e login próprios: o Claude Code, de um plano pago do Claude; o Codex, de um login do ChatGPT. Siga as páginas deles para instalar e entrar: [Claude Code](https://code.claude.com/docs/en/setup) e [Codex](https://learn.chatgpt.com/docs/codex/cli). Você faz isso uma vez, para todas as suas campanhas.

**Claude Code.** Abra um terminal na pasta da campanha e escreva `claude`. Na primeira vez, ele pergunta se você confia na pasta e diz que a pasta permite as ferramentas do jogo (`mcp__rpg`): escolha **Yes, I trust this folder**. Cuidado: a resposta já selecionada é *No, exit*, então apertar Enter de cara fecha o Claude Code. É só isso: a campanha já disse ao Claude Code para usar o RPG Engine e suas ferramentas, e para manter a memória desligada.

**Codex.** Abra um terminal na pasta da campanha e escreva `codex`. Quando ele perguntar se você confia na pasta, diga que sim: as configurações da própria campanha dizem ao Codex onde está o RPG Engine, permitem as ferramentas dele e mantêm a memória desligada, e o Codex só as lê em uma pasta em que você confia. No app para desktop, confira se as memórias estão desligadas nos chats do jogo.

**Por que a memória importa.** A campanha vive nos arquivos dela. Se o host também lembra das coisas por conta própria, voltar a um jogo salvo não voltaria de verdade: o mestre ainda lembraria do que foi desfeito.

### 2.5 O primeiro chat

Escreva qualquer coisa, por exemplo:

> Oi! Vamos começar.

O mestre lê em que pé está o jogo e responde. Na primeira resposta de cada chat, ele dá o **link do seu painel** (algo como `http://127.0.0.1:4750`). Abra-o no navegador e deixe-o ao lado do chat durante todo o jogo. Cada campanha mantém o mesmo link de um chat para o outro, a menos que outro programa o tenha tomado: nesse caso, o mestre dá o novo.

Entre as mensagens do mestre, seu host mostra as ferramentas que o mestre usa, em linhas curtas. Não abra os detalhes delas (no Claude Code, ctrl+o): podem mostrar o que o mestre escreve, segredos incluídos.

Uma campanha nova passa por três etapas, como um jogo com mestre humano. O painel as mostra no topo como *1 Configurações · 2 Sessão zero · 3 Jogar*:

1. **Configurações**: você escolhe como quer jogar. Fora da história.
2. **Sessão zero**: você cria seu personagem, jogando.
3. **Jogar**: a história.

### 2.6 Configurações: escolhendo como você joga

O mestre pergunta só o que ainda falta, algumas perguntas por vez. Se você escrever "decida você", o mestre escolhe e conta o que escolheu. Com o painel aberto, o primeiro passo dele, **Configurações**, mostra as mesmas perguntas como cartões: uma pergunta por vez, cada valor com o que significa, e o mais comum marcado como **Sugerida**. Escolha ali, e o mestre não pergunta de novo no chat; **Pular** deixa uma pergunta para depois. O chat resolve o que só palavras resolvem: a premissa de um mundo novo, o idioma e as imagens, que o mestre só pergunta se o seu computador puder criá-las. Por isso a página faz menos perguntas do que a tabela abaixo lista.

Você não precisa estudar a tabela: ela está aqui para consulta. Você pode mudar qualquer uma dessas opções depois, no chat ou nas **Configurações** do painel. A mudança vale a partir da próxima resposta do mestre.

| Configuração | O que decide | Valores | Sugerida |
|---|---|---|---|
| **Mentor** (perguntada como "How well do you know this game?") | Quanto o mestre ensina as regras a você, fora da história | **off** (só a história; pergunte entre colchetes quando quiser), **hints** (uma dica curta antes das escolhas importantes e quando uma regra passa batida), **tutorial** (cada regra explicada na primeira vez, a conta toda de cada rolagem, um breve balanço depois dos combates) | conforme sua resposta: nunca joguei → tutorial, um pouco → hints, conheço → off |
| **Dificuldade** | Quão difícil é o mundo: combates, táticas dos inimigos, pistas, tesouro, quão rápido as ameaças avançam | story, easy, normal, hard, brutal | |
| **Letalidade** | O que significa cair em combate | **narrative** (seu personagem nunca morre), **epic** (morre só quando importa para a história), **dice** (os dados decidem) | acompanha a dificuldade: story → narrative, easy → epic, normal ou acima → dice |
| **Jogos salvos** | Quando você pode voltar | **permadeath** (nunca; só recomeçar a campanha), **checkpoint** (volta ao último fim de cena, só se seu personagem morrer), **free** (volta a qualquer jogo salvo e salva quando você pedir) | checkpoint |
| **Rigor** | Quão de perto comida, luz, cansaço, peso carregado, componentes de magia e viagem seguem as regras | **smooth** (o mestre passa por cima), **rules** (como escrito: tochas se apagam, rações acabam), **simulation** (além das regras: desgaste, estragos, clima) | smooth |
| **Dados** | Quem rola os dados do seu personagem | **digital** (o RPG Engine rola, na página), **physical** (você rola os seus e conta as faces) | |
| **Unidades** | Distâncias e pesos na história | metric, imperial | |
| **Companheiros** | Quem viaja com você | none, criados com você na sessão zero, criados pelo mestre, encontrados no jogo | |
| **Imagens** | Imagens de locais e missões, e o retrato do seu personagem quando você pedir | none, sob pedido, novos locais e missões | perguntada uma vez, só se o seu computador puder criá-las |
| **Linhas** | O que nunca aparece no jogo | uma lista, ou nenhuma | |
| **Véus** | O que pode acontecer, mas só fora de cena | uma lista, ou nenhuma | |
| **Idioma** | O idioma do jogo e do painel | qualquer um | tirado de como você escreve, e confirmado |

O sistema de jogo pode acrescentar configurações próprias. A quinta edição acrescenta **advancement**: como seu personagem sobe de nível, com **pontos de experiência** ou por **marcos** da história.

**O que a dificuldade significa no jogo.** Story: inimigos fracos e ingênuos, pistas óbvias, fartura de tudo; o mestre pode amenizar as próprias rolagens. Easy: inimigos simples, recursos generosos. Normal: inimigos sensatos, três pistas para cada conclusão, preços e tesouros padrão. Hard: inimigos inteligentes, pistas sutis, recursos escassos, ameaças que avançam rápido. Brutal: inimigos que emboscam, recuam e rematam quem caiu, recursos muito escassos, os descansos mais duros. Os combates são sempre dimensionados para o seu grupo como ele está agora.

**Sem um mundo escrito**, a preparação pergunta mais duas coisas:

- **Premissa**: o gênero, o tom e alguns elementos do mundo, com suas palavras. Por exemplo: *"Fantasia baixa, sombria, mas com esperança. Uma cidade à beira de um rio, um vau assombrado, um culto nas colinas."*
- **Preparação**: **on the fly** (o mestre monta cada parte do mundo logo antes de você precisar; sugerida) ou **all at the start**.

O mestre então propõe um nome para a campanha. Quando nada falta e você diz que está pronto, o jogo passa para a sessão zero.

### 2.7 Sessão zero: seu personagem

A sessão zero já é jogo: você cria seu personagem com o mestre, como faria em uma mesa.

- **Toda escolha é sua**, a menos que você peça ao mestre que a faça. Você pode chegar com uma ideia completa ("uma clériga meio-elfa que deixou o templo"), uma vaga ("alguém que cura, mas não é nada simpático") ou nada ("me surpreenda, depois deixe eu mudar o que quiser").
- **Valores de habilidade.** O mestre conta o método e a rede de segurança antes de qualquer dado ser rolado. Na quinta edição: o conjunto padrão, a compra de pontos ou 4d6 descartando o menor. O método combinado fica nos acordos da mesa.
- **Sua história** nunca é obrigatória. Se você der uma, o mestre a escreve com as suas palavras, a lê de volta para você uma vez e liga as pessoas e os locais dela ao mundo. Você também pode escrevê-la no painel (veja [Grupo](#party)).
- **Personalidade** (quinta edição): um traço, um ideal, um vínculo e uma falha, das tabelas do seu antecedente ou criados por você.
- **Uma imagem.** Quando seu personagem estiver pronto, o mestre pede uma imagem dele: um arquivo no seu computador ou um retrato criado no seu computador a partir da sua descrição (veja [a imagem do seu personagem](#37-your-characters-story-and-picture)).

Os números da ficha são calculados pelo RPG Engine a partir das suas escolhas: você nunca faz as contas. Quando os personagens estiverem prontos e você confirmar, a história começa.

---

## 3. Jogando <!-- icon: chat -->

### 3.1 Conversando com o mestre

Escreva o que seu personagem faz ou diz, com suas palavras. Curto está bom.

> Pergunto ao estalajadeiro quem mais passou por aqui esta noite.
>
> "Não viemos criar problemas", digo, com a mão longe da espada.
>
> Subo no telhado e espero.

**Fora da história**, escreva entre colchetes:

> [Como funciona agarrar?]
>
> [Ainda posso usar minha reação nesta rodada?]
>
> [Vamos parar por aqui esta noite.]

O mestre também responde entre colchetes e depois volta à história.

**Você diz o que tenta; o mestre diz o que acontece.** O que quebra a lógica do mundo ou os fatos já estabelecidos não acontece: o mestre avisa, dentro da história, e oferece o que é possível.

**O mestre nunca decide pelo seu personagem.** Ele não faz você falar, sentir ou escolher. Na dúvida, ele pergunta.

**O mestre nunca fala do motor do jogo.** Pergunte se ele guarda o registro das coisas e ele responde como um mestre de jogo: "Eu guardo tudo: da próxima vez, continuamos daqui."

**Você pode perguntar ao mestre como usar o painel.** Ele conhece a página: "Onde vejo minhas magias?", "Como rolo na mão?"

### 3.2 Rolagens

**Quando há uma rolagem.** O mestre pede uma rolagem só quando o resultado é incerto e importa. Fora isso, ele diz sim, ou "sim, mas". Antes da sua rolagem, o mestre diz o que está em jogo e quais testes servem, e então para. Você rola ou muda de ideia:

> **Mestre:** A beirada é estreita e molhada. Se você escorregar, é uma longa queda no rio. Um teste de Destreza (Acrobacia), ou você pode voltar e procurar a escada.
>
> **Você:** Vou tentar.

**Rolando no painel.** Quando o mestre pede, um aviso aparece no topo da página com um botão para cada teste, por exemplo *Acrobacia +4 · com vantagem*. Clique nele: os dados caem na página e o mestre ouve o resultado. Você também pode:

- clicar na linha correspondente da sua ficha, que se acende em dourado;
- lançar os dados certos da bandeja de dados;
- escrever suas próprias palavras no aviso, se quiser fazer outra coisa.

**Rolando na mão.** Se você prefere escolher os dados, ative **Manual** no canto do aviso (ou em **Configurações**). O botão do teste some, e o aviso diz o que rolar como um mestre diria: *Role Acrobacia você mesmo, na sua ficha ou com os dados.* Clique na linha da ficha que se acende, ou lance os dados certos da bandeja de dados: o RPG Engine os rola, soma seu bônus e o mestre ouve o resultado. Um teste que nem a ficha nem a bandeja de dados conseguem fazer, como um dano que rerrola os 1, mantém o botão. O modo Manual continua ativo neste navegador até você desativá-lo.

**Dados físicos para o jogo todo.** Com a configuração de **dados** em physical, o mestre pede suas rolagens por palavras e você escreve as faces que tirou:

> [Tirei 14.]

O RPG Engine soma seus modificadores e recusa uma face que seus dados não podem mostrar.

**Rolagens livres.** Clique em qualquer número da sua ficha, ou abra a bandeja de dados, para rolar só por diversão. Rolagens livres nunca contam, nunca são registradas e o mestre nunca as vê. Um 20 livre nunca vira um 20 de verdade depois.

**As rolagens do mestre.** O mestre rola por inimigos e outros personagens também com o RPG Engine. A maioria das rolagens aparece na sua coluna de rolagens. Quando você não deve ver um resultado, o mestre rola em segredo. Você sempre pode perguntar:

> [Aquela rolagem foi de verdade?]

Numa rolagem mostrada, o mestre dá os números e o motivo. Numa secreta, dá uma impressão digital que prova que a rolagem foi feita antes de você perguntar.

**As rolagens no chat** aparecem entre colchetes, logo depois do momento que decidem: *[Persuasão 14 + 3 = 17]*. Depois a história conta o resultado.

### 3.3 Cenas e combates

O mestre conduz a história em **cenas**: um combate, uma conversa, uma exploração, uma viagem, um descanso, um desafio (uma perseguição, uma corrida, um enigma). Você não precisa gerenciá-las: é assim que o RPG Engine guarda os capítulos da história. No fim de cada cena, o jogo é salvo sozinho, e a cena entra na história do seu diário.

**Em um combate**, o mestre conta todos os turnos que não são seus, um após o outro, com cada rolagem, e **para onde você pode decidir**: sua vez, uma reação, uma escolha. Na sua vez, diga o que você faz:

> Lanço Chama Sagrada no que está perto da porta.

A seção **Combate** do painel mostra a ordem dos turnos, de quem é a vez, os pontos de vida do seu grupo e quão feridos os inimigos parecem (ilesos, feridos, ensanguentados, caídos: em palavras, nunca em números). Se seu personagem cair, os tiros de morte aparecem grandes na página.

**Quando o combate já está decidido**, o mestre pode se oferecer para contar o resto em uma mensagem só.

### 3.4 Tempo, viagem e o mundo que se move

**Tempo.** Toda ação leva tempo na história, e o RPG Engine guarda a data: dia 3, começo da manhã. O mestre conta o tempo como o mundo o mede: alvorada, o terceiro sino, anoitecer. Entre as sessões, o tempo não passa: você continua de onde parou.

**Descansos.** Diga que descansa, e o mestre aplica o que um descanso devolve, como pontos de vida e espaços de magia:

> Montamos acampamento e fazemos um descanso longo.

**Viagem.** Diga aonde quer ir:

> Seguimos a estrada para o norte, rumo a Rocca.

O RPG Engine calcula o caminho, a distância e os dias no seu ritmo, e leva você até lá. Uma viagem para quando algo planejado acontece no caminho, no fim da viagem de cada dia e na chegada. Você pode perguntar a que distância fica um local antes de partir:

> [A que distância fica Rocca, e quanto tempo levaria a pé?]

**O mundo se move sem você.** Vilões têm planos com prazos e relógios. A cada novo dia, o mestre move as ameaças que o tempo adiantou, e você vê os sinais delas: um boato, um rastro, uma mudança na cidade. Você nunca vê o relógio em si, só o que ele deixa para trás.

**O dinheiro** é contado nas moedas do jogo. Pagar, vender, receber: o RPG Engine dá o troco.

### 3.5 Mapas

**O mapa do mundo** (painel: **Mundo**) mostra só os locais que seu personagem conhece, com as estradas entre eles, a trilha que você percorreu e a névoa sobre todo o resto. Clique em um local para ver o que você sabe dele e a que distância fica.

**O mapa de um local** (painel: **Cena**, e **Combate** em um combate) aparece quando o mestre desenha um para onde você está: paredes, portas, o chão e quem está onde, como peças. Em um combate, na sua vez, os quadrados que você não alcança ficam velados, e você vê de relance para onde pode ir. Quando o mestre pergunta para onde seu personagem se move, a página abre o mapa e você toca em um quadrado, ou o escreve, como *E4*.

### 3.6 Missões, diário e notas

**Missões.** Quando seu personagem assume uma tarefa, ela vira uma missão no seu **Diário**: quem a deu, onde, até quando, seus objetivos em lista e o que ela mede (um prazo com o tempo restante, um relógio, uma contagem). Marque uma com a estrela para acompanhá-la: ela fica pequena no topo de Cena, com o próximo objetivo. A missão termina quando a história a termina, nunca sozinha.

**A história.** A aba História do Diário é a sua campanha como uma linha do tempo: cada cena é um capítulo, com seu local, data e um resumo curto, a última primeiro.

**Suas notas.** Na aba Notas do Diário, você escreve suas próprias notas: teorias, nomes, planos. Elas ficam no seu computador e o mestre não as lê, a menos que você **Compartilhar** uma. Uma nota compartilhada chega ao mestre na próxima resposta como aquilo que você pensa, nunca como um fato. Sua teoria não vira verdade porque você a escreveu. Uma nota que pede para parar ou evitar algum conteúdo vale como se você a tivesse dito à mesa.

### 3.7 A história e a imagem do seu personagem

Na ficha do seu personagem, o cartão **Descrição** tem uma caixa para escrever a história do personagem. Envie, e o mestre a escreve no personagem com as palavras dele, depois de você dizer sim.

Para a imagem do seu personagem, dê ao mestre um arquivo de imagem no chat, com o lugar dele no seu computador (PNG, JPEG, WebP ou SVG, até 5 MB):

> [Aqui está o retrato do meu personagem: C:\Users\me\Pictures\mira.png]

O mestre o copia para a campanha, e ele aparece na peça do seu personagem no painel. Você pode trocá-lo do mesmo jeito quando quiser.

Ou peça que o retrato seja criado, onde o seu computador cria imagens (veja [Imagens](#311-pictures)): descreva seu personagem ao mestre, ou deixe o mestre descrevê-lo.

> [Crie um retrato para mim: cabelo grisalho em trança, uma cicatriz no queixo, olhos cansados.]

O retrato mostra exatamente o que seu personagem é no jogo, o povo dele como este mundo o tem, um anão da colina como um anão da colina, com a aparência que você descreveu. Ele fica pronto em cerca de um minuto, na peça do seu personagem. Seus companheiros podem ter o deles do mesmo jeito.

### 3.8 Jogos salvos e voltar atrás

O RPG Engine salva a campanha inteira **no fim de cada cena**, sozinho. O que você pode fazer com esses jogos salvos depende da configuração de **jogos salvos**:

| Jogos salvos | Salvar quando quiser | Voltar |
|---|---|---|
| **permadeath** | não | nunca; só recomeçar a campanha |
| **checkpoint** | não | ao último jogo salvo, só quando seu personagem morrer |
| **free** | sim | a qualquer jogo salvo, quando quiser |

Em todos os modos você pode **recomeçar**: do início do jogo com o mesmo personagem, ou da sessão zero com um novo.

Você pode fazer tudo isso no chat ("[Vamos voltar para antes do duelo.]") ou na seção **Jogos salvos** do painel.

**Depois de voltar, abra um novo chat.** O chat em que você jogava lembra do que foi desfeito. Abra um novo chat com o mestre (`/clear` no Claude Code, `/new` no Codex), escreva *continuar*, depois aperte **Abri um novo chat** em Jogos salvos, ou conte ao mestre no novo chat. Nunca retome o chat antigo. Até você confirmar, o mestre não continua.

### 3.9 Sessões: parar e voltar

**Você encerra a sessão** quando quiser:

> [Vamos parar por aqui esta noite.]

Não existe "salvar e sair": tudo já está nos arquivos.

**Para fechar** o chat, escreva `/exit` no Claude Code ou `/quit` no Codex. O painel fica quieto até o próximo chat.

**Para voltar**, abra um terminal na pasta da campanha (a que o `init` mostrou), inicie seu host ali e escreva *continuar*. O mestre lê em que pé está o jogo, faz um breve resumo e começa com algo acontecendo. Um chat novo não perde nada: a campanha vive nos arquivos, não no chat.

O mestre não faz perguntas de rotina no final. Só se notou que algo não funcionou, ele pergunta rapidinho.

### 3.10 O humor do mestre

No topo do painel fica o avatar do mestre, um pequeno robô. O rosto dele acompanha o tom da história: preocupado quando o perigo cresce, encantado com uma ideia ousada, surpreso com uma reviravolta. Ele reage por um instante a um 20 natural ou a um 1 natural. Ele nunca mostra o que você ainda não sabe: nada de sorriso antes de a armadilha disparar. As peças do seu grupo também mostram o humor delas. Quando o chat está fechado, o robô dorme.

### 3.11 Imagens

O RPG Engine pode mandar criar uma imagem para cada local que você alcança e cada missão que assume, conforme a configuração de **imagens**, e o retrato do seu personagem quando você pedir. Ele usa o que já está no seu computador:

- **Codex**, com seu login do ChatGPT: uma imagem pintada.
- Caso contrário, **Claude Code**, com seu login do Claude: um desenho.

A imagem usa o seu próprio plano, não o nosso. A seção **Configurações** diz se as imagens podem ser criadas no seu computador e, se não, os passos para configurar. Sem imagens, a página mostra a marca de cada tipo de local. Você também pode dar ao mestre uma imagem sua para qualquer local ou personagem.

### 3.12 Segurança: linhas, véus e parar

- **Linhas**: o que nunca aparece no jogo.
- **Véus**: o que pode acontecer, mas só fora de cena.
- **Parar**: a qualquer momento você pode parar um conteúdo, sem explicar. Escreva fora da história:

> [parar]

O mestre abandona o assunto na hora e o acrescenta às suas linhas, para todas as sessões seguintes. Você pode ver e mudar suas linhas e véus em **Configurações**.

### 3.13 Mudando de ideia

Toda configuração pode mudar durante a campanha: no chat ("[Vamos deixar mais difícil.]") ou em **Configurações**. O mestre fica sabendo da mudança na próxima resposta. Uma decisão que o mestre tomou sem o livro vira um **precedente** e é guardada, para que a mesma pergunta receba a mesma resposta da próxima vez.

---

## 4. O painel, seção por seção <!-- icon: party -->

O painel é uma página no seu próprio computador. O mestre lhe dá o link no começo de cada chat. Ele acompanha o jogo ao vivo: quando o mestre muda algo, a página muda também.

Só o navegador do computador onde você joga consegue abri-lo: não um celular ou um tablet, nem na mesma rede Wi-Fi. A página também cabe em uma janela estreita: nesse caso, as seções vão para uma barra na parte de baixo, e os ícones para um menu.

A página vive enquanto o chat vive. Feche o chat, e uma página deixada aberta mostra *Não conectado* com a ficha como estava, e o robô do mestre adormece; abra um chat na campanha de novo e, depois que o mestre responder, a página volta sozinha.

### No alto

- O **avatar do mestre**, com o humor dele.
- O nome da campanha, o sistema de jogo, a **hora do jogo** e se o jogo está **conectado** (o chat ligado).
- As seções: **Grupo**, **Cena**, **Combate** (só durante um combate), **Diário**, **Mundo**; no fim da fileira, como ícones: **Jogos salvos**, **Ajuda**, **Configurações**, **Sobre**.
- O tema claro e escuro, no canto superior direito.

Quando o mestre lhe pergunta algo, o aviso dele fica no alto da página, em qualquer seção em que você esteja.

### Grupo

A ficha do seu personagem e as dos seus companheiros. Cada parte da ficha é um cartão que você pode abrir e fechar.

- **Clique em um número** para rolá-lo por diversão. Aponte para um número para ver como ele é formado ("+5: Sabedoria +3, proficiência +2").
- **Pontos de vida, espaços e usos** aparecem como barras e marcadores.
- **Condições e efeitos** aparecem com a duração.
- **Descrição** guarda o texto do seu personagem e a caixa para enviar ao mestre a história dele.
- Com 0 pontos de vida, os **testes contra a morte** aparecem grandes sob o nome.
- Ao lado da ficha (abaixo dela em uma tela estreita): **as rolagens**, da mais nova para a mais antiga, as suas e as do mestre que você pode ver. **Limpar** esvazia a lista; **Restaurar** a traz de volta. As rolagens livres aparecem tracejadas e esmaecidas.

Um companheiro com ficha de criatura, como um lobo, mostra essa ficha de criatura em vez de uma ficha completa.

### Cena

Onde o seu grupo está: a imagem e o nome do local, os locais ao redor, o mapa do local quando houver, quem está ali e a cena aberta com o que acontece agora. A missão que você acompanha fica no alto.

### Combate

Só durante um combate. No alto: a rodada, quem age, quem vem depois. Abaixo: a ordem dos turnos, cada combatente com o seu estado, o seu grupo em números e os inimigos em palavras; o que o seu personagem tem à mão (Classe de Armadura, pontos de vida, ataques); o mapa do local, com quem age destacado por um círculo. Na sua vez, o link Combate pulsa em dourado, onde quer que você esteja.

### Diário

Três abas:

- **Missões**: ativas, concluídas e fracassadas, cada uma em um cartão com os objetivos, o prazo como um cronômetro e os relógios. A estrela acompanha uma missão.
- **História**: os capítulos da campanha, cena por cena, o último primeiro.
- **Notas**: as suas próprias notas, privadas até você compartilhar uma.

### Mundo

O mapa do mundo como o seu personagem o conhece, com a névoa sobre o resto. Arraste para mover, use a roda do mouse ou o gesto de pinça para dar zoom. Clique em um local para ver o cartão dele. Uma lista dos locais, do mais próximo ao mais distante, fica ao lado. Com mais de um mapa (uma cidade, um continente, outro plano), abas alternam entre eles.

### A bandeja de dados

O botão de dados abre a bandeja: escolha os dados e um modificador, e lance. Com dois ou mais dados do mesmo tipo, escolha quais contam: **Todos**, **Maior** (só o mais alto) ou **Menor** (só o mais baixo). Os dados que você escolheu ficam até você apertar **Limpar**, então a mesma rolagem de dano é um clique a cada rodada. Enquanto o mestre pede uma rolagem, a bandeja diz quais dados a respondem.

### Jogos salvos

Os seus jogos salvos, do mais novo ao mais antigo, cada um com o local, a data do jogo e quando foi feito. **Salvar agora** (com jogos salvos livres), **Voltar para cá** e **Recomeçar**, em vermelho, em dois passos. Veja [Jogos salvos e voltar atrás](#38-saves-and-going-back).

### Configurações

Suas configurações, em grupos: o jogo, aprender o jogo (o mentor e as regras que já foram explicadas a você), dados e medidas, limites (linhas e véus), imagens, idioma. Clique em um valor para escolhê-lo; embaixo dele, o que significa. Depois, as preferências da própria página, guardadas só neste navegador: o tema, o som dos dados, o **conjunto de dados** (resina, metal, madeira, pedra), bordas arredondadas ou retas, rolar à mão.

As configurações do próprio mestre, como regras da casa e precedentes, não estão aqui: ficam no chat.

### Ajuda e Sobre

**Ajuda**: este guia. **Sobre**: o que é o RPG Engine, seus links, suas licenças e os créditos do sistema de jogo.

### Antes do jogo: Configurações e sessão zero

Enquanto uma campanha nova está no primeiro passo, **Configurações**, a página inteira faz as perguntas: uma por vez, cada uma com o que os valores significam e o valor sugerido. **Você decide** deixa a pergunta para o mestre, exceto linhas e véus, que são sempre seus; **Pular** a deixa para depois. No fim, **Pode começar**.

### Mensagens da página

Às vezes a página mostra um aviso sobre si mesma: um problema nos arquivos da campanha (o mestre corrige), o jogo ausente (o chat está fechado), a página sendo traduzida.

---

## 5. Sistemas de jogo e regras da casa <!-- icon: dice -->

### 5.1 O que é um sistema de jogo

Um sistema de jogo são os dados de um jogo: a ficha, os números, as criaturas, os itens, as magias e o texto das regras. Cada campanha joga um sistema.

O RPG Engine calcula a ficha do seu personagem e o que é gasto e volta, como pontos de vida e espaços de magia, como faz uma ficha digital. Como uma característica ou uma magia funciona, o mestre lê nas regras e decide, como em uma mesa.

### 5.2 Quinta edição, incluída

O RPG Engine traz a **5e**, do System Reference Document 5.1 (as regras de 2014, gratuitas sob Creative Commons). Ela inclui:

- as raças, classes, subclasses, um antecedente e uma façanha do SRD;
- as 319 magias, as armas, armaduras e equipamentos, os itens mágicos e os monstros do SRD;
- os capítulos de regras, que o mestre consulta pelo texto exato;
- a ficha de personagem completa, calculada: modificadores de atributo, testes de resistência, perícias, Classe de Armadura, ataques, CD de magia, espaços, dados de vida, características por nível, experiência e subida de nível;
- descansos que devolvem o que devem; condições com o texto de regra; lembretes de concentração.

**Conteúdo além do SRD.** Você pode jogar a quinta edição com conteúdo que o SRD não tem, como uma classe ou um monstro de um livro que você possui. O mestre conhece o jogo, pode ler os seus manuais e pode pesquisar na web. Ele escreve o que precisa como páginas da sua campanha, e o RPG Engine funciona do mesmo jeito com elas. O que nós distribuímos é limitado pela licença; o que o seu mestre sabe, não.

O RPG Engine é compatível com a quinta edição.

### 5.3 Regras da casa e acréscimos seus

Você não precisa mexer em nenhum arquivo. Peça ao mestre:

> [Regra da casa: um 1 natural em um ataque significa que você deixa a arma cair.]
>
> [Quero jogar com um Caçador de Sangue. Tenho o livro: aqui estão as características da classe.]
>
> [Nesta campanha, um descanso curto leva 10 minutos.]

O mestre registra isso na sua campanha, de um destes modos:

- **Um acordo da mesa**, em palavras, como a arma que cai ou o descanso curto acima. O mestre o guarda junto com as configurações da campanha e joga por ele daí em diante. Uma decisão que o mestre toma sem o livro é guardada do mesmo jeito, como um **precedente**.
- **Uma página nova**, como uma classe, uma raça ou um item. Uma classe nova funciona como as do sistema: o seu nível, os dados de vida e as características a contam. Uma raça nova pode partir de uma existente ("como o Elfo, mais…"); uma espada com nome pode partir da Espada Longa.
- **Números novos para a ficha**: um campo, uma tabela, uma fórmula, um contador que um descanso devolve. Por exemplo, os dados de superioridade de um Mestre de Batalha, que voltam em um descanso curto. Uma regra da casa também pode substituir uma das fórmulas do sistema.

Se você já tem regras da casa escritas, também pode colocá-las como arquivos de texto na pasta `rules` da campanha (veja [a pasta da campanha](#8-for-the-curious-the-campaign-folder)): o mestre as lê antes da regra do livro com o mesmo nome.

### 5.4 Adicionar ou importar o seu próprio sistema de jogo

Hoje o RPG Engine joga só a quinta edição. Outros sistemas de jogo virão, e também um modo de adicionar o seu, ou de transformar um jogo que você possui em um sistema a partir dos manuais. Veja [Em breve](#9-coming-later).

---

## 6. Extensões <!-- icon: plus -->

**As extensões ainda não estão disponíveis.** Uma extensão acrescentará algo a uma campanha, além do sistema de jogo: um mundo, uma aventura, um recurso como o clima ou um baralho de tarô, regras da casa para compartilhar. Você escolherá quais cada campanha usa. As primeiras planejadas para a quinta edição são clima e arrombamento de fechaduras.

---

## 7. De onde vem uma campanha, e o idioma dela <!-- icon: world -->

### 7.1 Três jeitos de ter um mundo

**Criado na hora.** Você dá uma premissa na preparação, e o mestre constrói o mundo conforme avança: cada local, pessoa e trama logo antes de você precisar, e guardado daí em diante. É o jeito mais rápido de jogar: instalar, criar, e em poucos minutos você está criando o seu personagem. Nada do que for inventado se perde: dito uma vez, fica escrito e continua valendo.

**Preparado no início.** A mesma premissa, mas com **preparação: tudo no início**: o mestre constrói os locais, as facções, as ameaças e os planos delas do mundo antes de o jogo começar. A primeira sessão começa mais tarde, com mais coisas prontas nos bastidores.

**A partir de uma campanha ou aventura existente.** Hoje não há botão de importar. Dê a sua aventura ao mestre (um texto ou um PDF que o seu host consiga ler) e peça que ele a monte:

> [Tenho esta aventura em PDF. Monte-a como nossa campanha: leia, e escreva os locais, personagens e segredos dela. Não me conte nada do que está nela.]

O mestre a lê com as ferramentas do seu host de IA e a escreve como páginas da campanha, segredos incluídos, que você descobrirá jogando. O Claude Code lê PDFs; com o Codex, um arquivo de texto ou markdown é a escolha mais segura. Faça isso durante a preparação, antes da sessão zero.

Enquanto o mestre trabalha, não abra os detalhes do que ele lê ou escreve (no Claude Code, ctrl+o): eles mostram o texto da aventura, segredos e tudo. O próprio mestre guarda os segredos, como sempre.

Assim que a campanha tem páginas próprias, a preparação deixa de pedir uma premissa e uma preparação. Mesmo em uma campanha escrita, quando você vai a um lugar que o texto não cobre, o mestre cria o que for preciso e registra.

**Uma campanha é jogada uma vez.** Para jogar a mesma aventura de novo, crie uma campanha nova. Dentro de uma campanha, você ainda pode voltar a um jogo salvo ou recomeçar, conforme a configuração Jogos salvos permitir.

### 7.2 Idiomas

**Um idioma por campanha**: o do mestre. O mestre escreve nele, e o painel o acompanha. O mestre o tira do seu jeito de escrever e o confirma.

**O painel** vem em inglês e italiano (revisados) e em mais 24 idiomas: francês, alemão, espanhol, português (brasileiro), holandês, sueco, norueguês, dinamarquês, finlandês, islandês, russo, ucraniano, polonês, tcheco, romeno, húngaro, grego, turco, árabe, hebraico, hindi, chinês, japonês, coreano. O árabe e o hebraico se leem da direita para a esquerda: a página se espelha, enquanto os mapas e os dados continuam como foram desenhados.

**Qualquer outro idioma** que você escolher em Configurações é traduzido no seu computador, em segundo plano, pelo Codex ou pelo Claude Code com o seu próprio login, começando pela seção que você tem aberta. Isso é feito uma vez por idioma, para todas as suas campanhas. Até ficar pronto, a página fica em inglês. As Configurações dizem se a tradução está em andamento, pronta ou impossível no seu computador.

**As palavras do jogo.** A quinta edição traz seus próprios termos em italiano, do SRD oficial italiano, então quem joga em italiano lê *Classe Armatura*, *tiro salvezza*, *vantaggio*. Os outros idiomas recebem os termos do sistema traduzidos.

**O texto do próprio sistema de jogo** (as magias, os monstros, os capítulos de regras) fica em inglês. O mestre o lê e o conta a você no seu idioma.

**Mudar de idioma no meio da campanha** mantém como estão as páginas já escritas; o mestre escreve as novas no novo idioma.

---

## 8. Para os curiosos: a pasta da campanha <!-- icon: list -->

Você nunca precisa abri-la. Se abrir, saiba que **ela guarda os segredos** da sua campanha: lê-la estraga o jogo.

Uma pasta de campanha contém:

- `campaign.yaml`: as suas configurações;
- `state.yaml`: em que ponto o jogo está agora: a etapa, a data, a cena aberta;
- `world/`: uma página por personagem, local, facção, missão, item, evento, tema ou criatura, como arquivos markdown;
- `rules/`: as suas regras da casa como arquivos de texto, se você acrescentar alguma (o `init` não a cria);
- `images/`: as imagens, quando houver alguma;
- `log.jsonl`: cada mudança, em ordem;
- `.saves/`: os jogos salvos, a partir do primeiro;
- `.player/`: as suas próprias notas do Diário, que o mestre não lê;
- `sessions/`: mantida pelo RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: os pequenos arquivos que dizem aos hosts de IA onde está o RPG Engine e mantêm a memória deles desligada. O RPG Engine os mantém atualizados; deixe-os como estão.

As páginas são markdown simples, com links como `[[Rocca]]`, o formato do Obsidian: o caderno do mestre pode ser aberto lá. **Se você mudar uma página à mão**, o mestre fica sabendo do que mudou na próxima resposta.

**A linha de comando.** Tudo o que o mestre faz passa por comandos que você também pode executar, na pasta da campanha. Você nunca precisa deles para jogar, e muitos mostram os segredos da campanha, como o `rpg status` e o `rpg show`. `rpg --help` lista todos, e `rpg roll --help` explica um. Um comando que muda algo enquanto um chat está aberto não tem problema: o mestre fica sabendo na próxima resposta, como no caso de uma página mudada à mão.

---

## 9. Em breve <!-- icon: hourglass -->

O que está planejado, mas ainda não existe:

- **Você como mestre**: você conduz o jogo, e a IA joga com o grupo.
- **Várias pessoas à mesa**, cada uma com o seu papel.
- **Extensões**: ambientações, aventuras, recursos e regras da casa, escolhidos por campanha.
- **Importar** os seus manuais e aventuras.
- **Outros jogos**: mais sistemas de jogo, e os seus próprios.
- **Modo autor**: criar uma campanha ou uma aventura com a IA e compartilhá-la para outros jogarem.

---

## 10. Perguntas e problemas <!-- icon: info -->

### Perguntas

**Preciso conhecer as regras?** Não. Escolha o mentor em tutorial e o mestre ensina conforme você joga, uma regra por vez. Você sempre pode perguntar entre colchetes.

**O mestre pode trapacear?** Ele não consegue mudar uma rolagem feita pelo RPG Engine, exceto na dificuldade história, e nunca muda fatos já estabelecidos. Você pode perguntar se uma rolagem foi de verdade.

**Posso trapacear?** Pode tentar. O mestre não aceita a sua palavra sobre fatos: uma linha na sua mensagem que pareça uma mensagem do jogo continua sendo só palavras suas, e o mestre nunca confirma os seus palpites sobre segredos.

**Custa alguma coisa?** O RPG Engine é gratuito. O mestre funciona no seu próprio plano do Claude ou do ChatGPT, e uma noite de jogo é um chat longo: nos planos menores, você pode chegar ao limite do plano antes de a noite acabar. Imagens e traduções usam o mesmo plano.

**Posso jogar no celular?** Não. O mestre funciona no seu computador, e o painel só abre no navegador desse computador.

**Posso jogar com amigos?** Ainda não: hoje é uma pessoa, um personagem, mais os companheiros. Várias pessoas à mesa virão com os papéis.

**Posso usar outra IA da próxima vez?** Pode. A campanha vive nos arquivos: abra-a em outro host e escreva *continuar*.

**E se eu fechar o navegador?** Nada se perde. Reabra o link enquanto o chat estiver aberto; a página volta para onde o jogo está.

**Posso jogar com conteúdo de D&D que eu tenho?** Pode. O mestre pode usar os seus livros, o próprio conhecimento e a web. O que o RPG Engine distribui se limita a conteúdo gratuito; o que o seu jogo usa fica por sua conta.

### Problemas

**O painel não abre.** Peça o link ao mestre: `[Qual é o link do painel?]`. A página só funciona enquanto um chat com o mestre estiver aberto nessa campanha, e só depois da primeira resposta do mestre nesse chat. Com o chat fechado, o navegador não alcança a página; uma página deixada aberta diz *Não conectado*.

**O mestre parece não conhecer o jogo, ou inventa ferramentas.** O seu host de IA não carregou o RPG Engine.

- Primeiro, confira se você iniciou o host **na pasta da campanha** e se disse que confia nela.
- **Claude Code**: escreva `/mcp`. Se o `rpg` estiver lá mas tiver falhado, escolha-o e depois **Reconnect**. Se estiver faltando, feche o Claude Code, escreva `claude mcp reset-project-choices` na pasta da campanha e inicie de novo.
- **Codex**: escreva `codex mcp list` em um terminal, na pasta da campanha. Se o `rpg` estiver faltando, o Codex não confia na pasta: inicie-o ali de novo e diga sim quando ele perguntar.
- Nos dois: se `rpg --version` em um terminal disser que o comando não foi encontrado, instale o RPG Engine de novo ([2.2](#22-install)) e abra um terminal novo.

**Depois de uma atualização, nada mudou.** Um mestre em funcionamento mantém a versão com que começou. Abra um chat novo ou, no Claude Code, reconecte o servidor (`/mcp`, depois `rpg`, depois **Reconnect**).

**O mestre lembra de algo que eu desfiz.** Você voltou a um jogo salvo, mas continuou jogando no mesmo chat. Abra um chat novo e aperte **Abri um novo chat** em Jogos salvos.

**O mestre faz perguntas de preparação que eu já respondi na página.** Avise: `[Eu escolhi isso no painel.]`

**Nenhuma imagem aparece.** Abra Configurações > Imagens: ali diz se este computador consegue criá-las, e os passos se não conseguir, cada comando com um botão para copiá-lo.

**A página está em inglês, mas eu escolhi outro idioma.** Ela está sendo traduzida em segundo plano; as Configurações dizem como vai. Sem o Codex ou o Claude Code neste computador, ela fica em inglês.

**O mestre diz que a campanha tem problemas.** Ele os corrige sozinho. Se você editou arquivos à mão, ele pode perguntar o que você quis fazer.

**Windows: o `npm` falha na minha pasta.** Não deixe a campanha, nem o RPG Engine, em um caminho que contenha `&`.

**A instalação falha, ou o `rpg` não inicia.** Confira a versão do Node.js com `node --version`: ela precisa ser 22 ou mais nova. Se for mais antiga, instale a versão LTS de [nodejs.org](https://nodejs.org) e depois instale o RPG Engine de novo.

**O link do painel mudou.** Outro programa estava usando o endereço habitual da campanha, ou o Windows o havia reservado. O RPG Engine pegou outro; o mestre lhe dá o novo link. Nada mais muda.
