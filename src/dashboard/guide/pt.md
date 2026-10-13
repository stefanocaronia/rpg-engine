<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: o guia completo

**RPG Engine** permite que você jogue um jogo de RPG de mesa com uma **IA como mestre**. Você conversa com o mestre em um **chat**; o RPG Engine trabalha nos bastidores: ele **lembra do mundo**, **rola os dados** e **faz as contas**. Ao lado do chat, você mantém aberta uma página no navegador, o **painel**, com sua ficha, os dados, os mapas e seu diário.

Este guia é para quem joga: você não precisa saber programar.

## Início rápido <!-- icon: send -->

1. Instale o **Node.js** em [nodejs.org](https://nodejs.org) (a versão LTS).
2. Instale um **agente de IA**, o programa em que o mestre roda, e entre na sua conta: por exemplo, Claude Code ou Codex ([2.4](#24-connect-your-ai)).
3. Em um terminal, instale o RPG Engine: `npm install -g rpg-engine`.
4. Crie uma campanha: `rpg init "The Salt Isles"`.
5. Entre na nova pasta, `cd "The Salt Isles"`, e inicie seu agente nela: `claude` para o Claude Code, `codex` para o Codex. Diga sim quando ele perguntar se você confia na pasta ([2.4](#24-connect-your-ai)) e escreva *Oi! Vamos começar.* O mestre responde com o link do seu painel.

## 1. O que é o RPG Engine <!-- icon: about -->

| Quem | O que faz |
|---|---|
| **Você** | Joga com seu personagem: o que ele faz, diz e tenta. |
| **O mestre** (a IA) | Conta a história, interpreta todos os outros, decide o que acontece e pede rolagens. |
| **RPG Engine** | Guarda o mundo em arquivos, rola os dados, conta pontos de vida, dinheiro, tempo e distâncias, e mantém os segredos até você descobri-los. |

O mundo continua o mesmo de uma noite para outra, até em um chat novo, até com outra IA:

- **O que foi dito continua valendo.** Um vilão morto continua morto.
- **Os dados são de verdade.** O mestre não pode alterá-los, exceto na dificuldade mais fácil, se você escolher.
- **Segredos continuam secretos.** O mestre nunca conta o que seu personagem não sabe.
- **O mundo se move.** As ameaças avançam enquanto você descansa ou viaja, e você vê os sinais delas.
- **Uma campanha é uma pasta** no seu computador: pare quando quiser e retome depois.

Hoje o RPG Engine joga um sistema de jogo, a **quinta edição**, a partir do System Reference Document 5.1, que é gratuito. Outros virão ([Em breve](#9-coming-later)).

---

## 2. Primeiros passos <!-- icon: path -->

### 2.1 O que você precisa

- Um computador com Windows, macOS ou Linux, e um navegador.
- **Node.js 22** ou mais novo, em [nodejs.org](https://nodejs.org). Ele traz o `npm`, que instala o RPG Engine.
- Um **terminal**: no Windows, Terminal ou PowerShell; no macOS, Terminal. Para abrir um terminal em uma pasta, clique nela com o botão direito e escolha **Abrir no Terminal** (Windows) ou **Serviços > Novo Terminal na Pasta** (macOS).
- Um **agente de IA** para o mestre ([2.4](#24-connect-your-ai)), com o **maior modelo** que ele oferecer: um modelo pequeno é mais fácil de convencer a revelar segredos ou a burlar as regras.

### 2.2 Instalar

```text
npm install -g rpg-engine
```

`rpg --version` confirma que deu certo. Você usa `rpg` uma vez por campanha, para criá-la; depois disso, seu agente inicia o RPG Engine sozinho.

### 2.3 Criar uma campanha

Abra um terminal na pasta onde você guarda seus jogos ([2.1](#21-what-you-need) explica como):

```text
rpg init "The Salt Isles"
```

Isso cria a pasta `The Salt Isles` com uma campanha nova dentro; entre nela com `cd "The Salt Isles"`. Lembre onde ela está: você volta a ela toda vez que jogar. O resto você escolhe depois, no chat ou no painel; `rpg init --help` lista as opções para escolher algumas agora, como `--language it` ou `--difficulty hard`.

O mestre não pode criar uma campanha para você: antes do `init`, nada diz ao seu agente onde está o RPG Engine.

### 2.4 Conectar sua IA

O mestre roda em um **agente de IA**: um aplicativo de IA, no terminal ou no desktop, que consegue trabalhar com os arquivos do seu computador, como o Claude Code ou o Codex. Um chat comum, como o claude.ai ou o ChatGPT, ou um aplicativo de celular, não basta: o mestre precisa acessar os arquivos da campanha no seu computador. Cada agente exige seu próprio plano e login: o Claude Code, um plano pago do Claude; o Codex, um login do ChatGPT. Você o instala uma vez, pela página dele: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: na pasta da campanha, escreva `claude`. Quando ele perguntar se você confia na pasta, escolha **Yes, I trust this folder**; cuidado, a resposta já selecionada é *No, exit*.
- **Codex**: na pasta da campanha, escreva `codex` e diga sim quando ele perguntar se você confia na pasta. No aplicativo desktop dele, confira nas configurações se as memórias estão desligadas para os chats do jogo.
- **Outro agente**: inicie-o na pasta da campanha e dê a ele o servidor MCP `rpg mcp`. O RPG Engine é um servidor MCP padrão: qualquer agente que aceite MCP pode ser o mestre, inclusive os locais.

Nós jogamos e testamos com o **Claude Code**; o **Codex** está conectado e verificado, mas ainda não se jogou uma campanha inteira com ele; o `init` também configura o **Gemini CLI**. A campanha desliga a memória própria do agente: o jogo vive nos arquivos, para que voltar a um jogo salvo realmente volte.

### 2.5 O primeiro chat

Escreva qualquer coisa, como *Oi! Vamos começar.* Na primeira resposta de cada chat, o mestre dá o **link do seu painel**, algo como `http://127.0.0.1:4750`: abra-o e deixe-o ao lado do chat.

Entre as mensagens do mestre, seu agente mostra as ferramentas que usa: não abra os detalhes delas (no Claude Code, ctrl+o), pois podem revelar segredos.

Uma campanha nova passa por três etapas, mostradas no topo do painel: **1 Configurações** (como você quer jogar), **2 Sessão zero** (você cria seu personagem, jogando), **3 Jogar**.

### 2.6 Configurações: escolhendo como jogar

O mestre pergunta só o que ainda falta, algumas perguntas por vez; a etapa **Configurações** do painel mostra as mesmas perguntas em cartões. Escreva "você decide" e o mestre escolhe. Tudo pode mudar depois, no chat ou em **Configurações**.

| Configuração | O que decide | Valores |
|---|---|---|
| **Mentor** | Quanto o mestre ensina as regras a você | desligado, dicas, tutorial |
| **Dificuldade** | Quão duro o mundo joga | história, fácil, normal, difícil, brutal |
| **Letalidade** | O que significa cair em um combate | narrativa (nunca morre), épica (só quando importa), dados |
| **Jogos salvos** | Quando você pode voltar | morte permanente, ponto de controle, livre ([3.8](#38-saves-and-going-back)) |
| **Rigor** | Quão de perto comida, luz e viagem seguem as regras | fluido, regras, simulação |
| **Dados** | Quem rola seus dados | digitais, físicos |
| **Unidades** | Distâncias e pesos | métrico, imperial |
| **Companheiros** | Quem viaja com você | nenhum, criados com você, criados pelo mestre, encontrados no jogo |
| **Imagens** | Imagens de locais, missões e de quem você encontra | nenhuma, sob pedido, novos locais, missões e quem você encontra ([3.11](#311-pictures)) |
| **Linhas** e **Véus** | O que nunca aparece e o que acontece só fora de cena | listas |
| **Idioma** | O idioma do jogo e do painel | qualquer um |

A quinta edição acrescenta o **avanço**: pontos de experiência ou marcos.

Sem um mundo escrito, o mestre também pergunta uma **premissa** (gênero, tom, alguns elementos, com suas palavras) e a **preparação**: montar o mundo na hora, conforme você avança, ou tudo no início.

**O estilo do mestre** nunca é perguntado, mas você pode mudá-lo no chat ou em **Configurações**: a **prosa** (simples, literária, pulp, irônica), as **histórias** que ele inventa (situações, arcos, episódios, mistério), um autor para **escrever como** ou qualquer outra coisa **com suas palavras**.

### 2.7 Sessão zero: seu personagem

Você cria seu personagem com o mestre, como em uma mesa. Toda escolha é sua, a menos que você peça ao mestre para fazê-la: venha com uma ideia completa, uma ideia vaga ou nada. O mestre explica como os valores de habilidade são feitos antes de qualquer dado ser rolado. A história do personagem nunca é obrigatória; se você der uma, o mestre a escreve com suas palavras. Depois, o mestre pede uma imagem do personagem ([3.7](#37-your-characters-story-and-picture)). O RPG Engine calcula a ficha: você nunca faz as contas.

---

## 3. Jogando <!-- icon: chat -->

### 3.1 Conversando com o mestre

Escreva o que seu personagem faz ou diz, com suas próprias palavras:

> Pergunto ao estalajadeiro quem mais passou por aqui esta noite.

Fora da história, escreva entre colchetes: *[Como funciona agarrar?]* O mestre também responde entre colchetes.

Você diz o que tenta; o mestre diz o que acontece. O mestre nunca decide pelo seu personagem e nunca fala do motor do jogo. Você pode perguntar a ele como usar o painel.

### 3.2 Rolagens

O mestre pede uma rolagem só quando o resultado é incerto e importa, e diz antes o que está em jogo. Então:

- **No painel**, um aviso mostra um botão para cada teste, como *Acrobacia +4 · com vantagem*. Clique nele: os dados caem na página e o mestre recebe o resultado. Você também pode clicar na linha da sua ficha que se acende, jogar os dados pela bandeja de dados ou escrever outra coisa no aviso.
- **Manual**, no canto do aviso ou em **Configurações**: o aviso diz o que rolar, e você rola pela ficha ou pela bandeja de dados.
- **Dados físicos**, com a configuração de dados em físicos: você escreve as faces que tirou, *[Tirei 14.]*, e o RPG Engine soma seus modificadores.

**Rolagens livres**: clique em qualquer número da sua ficha, ou abra a bandeja de dados, para rolar por diversão. Elas nunca contam e o mestre nunca as vê.

**As rolagens do mestre** aparecem na sua coluna de rolagens, exceto as secretas. Você sempre pode perguntar *[Essa rolagem foi de verdade?]*: para uma rolagem secreta, o mestre dá uma impressão digital que prova que ela foi feita antes de você perguntar.

### 3.3 Cenas e combates

A história corre em **cenas**: um combate, uma conversa, uma exploração, uma viagem, um descanso. No fim de cada cena o jogo é salvo sozinho, e a cena entra no seu diário.

Em um combate, o mestre narra todo turno que não é seu e para onde você pode decidir. A seção **Combate** mostra a ordem dos turnos, os pontos de vida do seu grupo e o quanto os inimigos parecem feridos, em palavras. Se seu personagem cair, os testes de morte aparecem grandes na página.

### 3.4 Tempo, viagem e o mundo que se move

O RPG Engine guarda a data; nenhum tempo passa entre as sessões. Diga que você descansa, *Fazemos um descanso longo*, e o descanso devolve o que deve. Diga para onde vai, *Pegamos a estrada ao norte, rumo a Rocca*, e o RPG Engine calcula o caminho, a distância e os dias, parando quando algo acontece no trajeto. O dinheiro é contado nas moedas do jogo, troco incluído.

Vilões têm planos com prazos. A cada novo dia, o mestre move as ameaças que o tempo fez avançar, e você vê os sinais delas, nunca o relógio em si.

### 3.5 Mapas

**Mundo** mostra os locais que seu personagem conhece, as estradas entre eles e o caminho que você percorreu, com névoa sobre o resto. **Cena** mostra o mapa do local onde você está, quando há um, com quem está em cada lugar; em um combate, na sua vez, os quadrados que você não alcança ficam velados. Quando o mestre perguntar para onde você se move, toque em um quadrado ou escreva-o, como *E4*.

### 3.6 Missões, diário e notas

Uma tarefa que seu personagem assume vira uma missão no **Diário**, com seus objetivos, seu prazo e o que ela mede; marque-a com uma estrela para mantê-la à vista no topo de Cena. O Diário também conta sua **história**, cena por cena, e guarda suas **notas**: privadas, a menos que você **Compartilhar** uma, que o mestre ouve como o que você pensa, nunca como um fato.

### 3.7 A história e a imagem do seu personagem

Na sua ficha, o cartão **Descrição** tem uma caixa para a história do seu personagem: o mestre a escreve ali, depois que você disser sim. Para uma imagem, dê ao mestre um arquivo (PNG, JPEG, WebP ou SVG, até 5 MB) com o local dele no seu computador, ou peça um retrato ([3.11](#311-pictures)): *[Faça um retrato meu: cabelo grisalho em uma trança, uma cicatriz no queixo.]*

### 3.8 Jogos salvos e voltar atrás

O RPG Engine salva a campanha inteira no fim de cada cena. A configuração **Jogos salvos** decide o resto:

| Jogos salvos | Salvar quando quiser | Voltar |
|---|---|---|
| **morte permanente** | não | nunca |
| **ponto de controle** | não | ao último jogo salvo, só quando seu personagem morre |
| **livre** | sim | a qualquer jogo salvo |

Em todos os modos você pode **recomeçar**, desde o início do jogo ou desde a sessão zero. Faça isso no chat ou em **Jogos salvos**.

Depois de voltar, **abra um chat novo**: o antigo lembra do que foi desfeito. Escreva *continuar* no chat novo e depois aperte **Abri um novo chat** em Jogos salvos.

### 3.9 Sessões: parar e voltar

Pare quando quiser: *[Vamos parar por aqui esta noite.]* Tudo já está salvo nos arquivos. Para voltar, inicie seu agente na pasta da campanha e escreva *continuar*: o mestre faz um resumo curto e segue em frente.

### 3.10 O humor do mestre

O robô no topo do painel é o mestre: o rosto dele acompanha o tom da história e nunca revela o que você ainda não sabe. Quando o chat está fechado, ele dorme.

### 3.11 Imagens

O RPG Engine pode gerar imagens dos locais a que você chega, das missões que você assume e de quem você encontra, conforme a configuração **Imagens**, e o retrato do seu personagem quando você pedir. Ele usa o que há no seu computador, com o seu próprio login: o **Codex** as pinta; se não, o **Claude Code** as desenha. **Configurações** diz se este computador consegue gerá-las e como configurá-lo, se não. Você sempre pode dar ao mestre uma imagem sua.

### 3.12 Segurança: linhas, véus e parar

As **Linhas** nunca aparecem no jogo; os **véus** acontecem só fora de cena. A qualquer momento, escreva *[parar]*: o mestre abandona esse conteúdo na hora e o acrescenta às suas linhas.

### 3.13 Mudando de ideia

Toda configuração pode mudar, no chat ou em **Configurações**. Uma decisão que o mestre toma sem o livro vira um **precedente**, para que a mesma pergunta tenha a mesma resposta da próxima vez.

---

## 4. O painel <!-- icon: party -->

Uma página no seu próprio computador, aberta só no navegador dele, ativa enquanto o chat estiver aberto. Quando o chat fecha, ela mostra *Não conectado*; volta sozinha com o próximo chat.

- **Grupo**: sua ficha e a dos seus companheiros. Clique em um número para rolá-lo; passe o mouse sobre ele para ver de onde vem. Ao lado, as rolagens.
- **Cena**: onde você está, a imagem e o mapa dela, quem está lá, o que está acontecendo.
- **Combate**: só em um combate: os turnos, quem luta, o que você tem à mão.
- **Diário**: missões, a história, suas notas.
- **Mundo**: o mapa do mundo como seu personagem o conhece.
- **A bandeja de dados**: escolha os dados e um modificador, e jogue.
- **Jogos salvos**, **Ajuda**, **Configurações** e **Sobre**, como ícones no fim da fileira. Configurações também guarda as preferências da própria página: tema, som dos dados, conjunto de dados.

Quando o mestre pergunta algo a você, o aviso dele fica no topo, em qualquer seção em que você esteja.

---

## 5. Sistemas de jogo e regras da casa <!-- icon: dice -->

### 5.1 O que é um sistema de jogo

Os dados de um jogo: a ficha, os números, as criaturas, os itens, as magias e o texto das regras. Cada campanha joga um sistema. O RPG Engine calcula a ficha e o que é gasto e o que volta; como uma característica funciona, o mestre lê nas regras e decide, como em uma mesa.

### 5.2 Quinta edição, incluída

As raças, classes, subclasses, um antecedente e uma talento do SRD 5.1; as 319 magias, as armas, armaduras, itens mágicos e monstros; os capítulos de regras, que o mestre lê pelo texto exato; a ficha completa, calculada.

Você também pode jogar conteúdo que o SRD não tem, de um livro que você possua: o mestre o escreve como páginas da sua campanha, e o RPG Engine as trata como suas. O RPG Engine traz só conteúdo aberto; o que seu mestre sabe não tem esse limite.

### 5.3 Regras da casa e acréscimos seus

Peça ao mestre: *[Regra da casa: um 1 natural em um ataque faz você largar a arma.]* Ele a guarda como um acordo da mesa ou escreve uma página ou um número da ficha quando for preciso. Regras da casa já escritas podem ir como arquivos de texto na pasta `rules` da campanha.

### 5.4 Adicionar ou importar seu próprio sistema de jogo

Ainda não: hoje o RPG Engine joga só a quinta edição ([Em breve](#9-coming-later)).

---

## 6. Extensões <!-- icon: plus -->

Ainda não. Uma extensão vai acrescentar algo a uma campanha além do sistema de jogo: um mundo, uma aventura, um recurso como o clima, regras da casa para compartilhar.

---

## 7. De onde vem uma campanha, e seu idioma <!-- icon: world -->

### 7.1 Três jeitos de ter um mundo

- **Feito na hora**: a partir da sua premissa, o mestre monta cada local, pessoa e trama pouco antes de você precisar, e os guarda.
- **Preparado no início**: o mesmo, com o mundo montado antes do jogo.
- **De uma aventura sua**: dê ao mestre um texto ou um PDF e peça que ele prepare tudo, *[Prepare esta aventura como nossa campanha. Não me conte nada do que está nela.]* Ele escreve os locais, os personagens e os segredos. Ainda não há botão de importar.

Uma campanha é jogada uma vez: para jogar a mesma aventura de novo, crie uma campanha nova.

### 7.2 Idiomas

Um idioma por campanha, o do mestre, que o painel acompanha. O painel vem com 26 idiomas. Qualquer outro é traduzido no seu computador pelo Codex ou pelo Claude Code ou, sem eles, pelo mestre no chat. Os termos da quinta edição em italiano vêm do SRD italiano oficial; o texto das regras fica em inglês, e o mestre o conta no seu idioma.

---

## 8. Para os curiosos: a pasta da campanha <!-- icon: list -->

Você nunca precisa abri-la, e ela guarda os segredos da sua campanha. Nela estão `campaign.yaml` (suas configurações), `state.yaml` (em que pé está o jogo), `world/` (uma página markdown para cada personagem, local, missão e o resto), `rules/` (suas regras da casa), `images/`, `log.jsonl` (cada mudança), `.saves/`, `.player/` (suas notas) e os pequenos arquivos que dizem aos agentes de IA onde está o RPG Engine. As páginas usam o formato do Obsidian. Se você mudar uma página à mão, o mestre fica sabendo na resposta seguinte.

Todo comando que o mestre usa também pode ser executado na pasta da campanha: `rpg --help` os lista. Muitos mostram os segredos da campanha.

---

## 9. Em breve <!-- icon: hourglass -->

- **Você como mestre**, com a IA jogando o grupo.
- **Modo autor**: escreva uma aventura com a IA, depois exporte e compartilhe.
- **Vários jogadores no mesmo computador**, cada um com seu personagem, alternando a vez no mesmo chat.
- **Extensões**: configurações, aventuras, recursos e regras da casa.
- **Importar** seus manuais e aventuras.
- **Outros jogos**: mais sistemas de jogo, e os seus.

---

## 10. Perguntas e problemas <!-- icon: info -->

### Perguntas

**Preciso saber as regras?** Não. Escolha o mentor tutorial e pergunte entre colchetes quando quiser.

**O mestre pode trapacear?** Ele não pode mudar uma rolagem feita pelo RPG Engine, exceto na dificuldade história, nem fatos já estabelecidos.

**Custa alguma coisa?** O RPG Engine é gratuito. O mestre roda no plano do seu agente, ou no seu próprio computador com um modelo local. Uma noite de jogo é um chat longo: nos planos menores você pode atingir o limite do plano antes de a noite acabar. Imagens e traduções usam o mesmo plano.

**Posso jogar no celular?** Não: o mestre roda no seu computador, e o painel só abre lá.

**Posso jogar com amigos?** Ainda não: hoje é um jogador, um personagem, mais companheiros ([Em breve](#9-coming-later)).

**Posso usar outra IA da próxima vez?** Sim: abra a campanha em outro agente e escreva *continuar*.

### Problemas

**O painel não abre.** Pergunte ao mestre: `[Qual é o link do painel?]`. Ele só funciona enquanto há um chat aberto nessa campanha, depois da primeira resposta do mestre.

**O mestre parece não conhecer o jogo.** Seu agente não carregou o RPG Engine. Confira se você o iniciou na pasta da campanha e confiou nela. No Claude Code, escreva `/mcp` e reconecte o `rpg`. No Codex, `codex mcp list` na pasta da campanha deve mostrar `rpg`. Se `rpg --version` não for encontrado, instale o RPG Engine de novo ([2.2](#22-install)).

**Atualizar.** Execute `npm install -g rpg-engine` de novo e depois abra um chat novo: um mestre em execução mantém a versão com que começou.

**O mestre lembra de algo que eu desfiz.** Abra um chat novo e aperte **Abri um novo chat** em Jogos salvos.

**Nenhuma imagem aparece.** Configurações > Imagens diz se este computador consegue gerá-las e como.

**A instalação falha, ou o `rpg` não inicia.** `node --version` deve mostrar 22 ou mais novo. No Windows, mantenha o RPG Engine e suas campanhas fora de caminhos que contenham `&`.

**O link do painel mudou.** Outro programa ocupou o endereço de costume; o mestre dá a você o novo link.
