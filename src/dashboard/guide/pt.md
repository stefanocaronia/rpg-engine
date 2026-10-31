<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
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
| **Você** | Interpreta seu personagem: o que ele faz, diz e tenta. |
| **O mestre** (a IA) | Conta a história, interpreta todas as outras pessoas, decide o que acontece e pede rolagens. |
| **RPG Engine** | Guarda o mundo em arquivos, rola os dados, conta pontos de vida, dinheiro, tempo e distâncias, e mantém os segredos até você descobri-los. |

O mundo continua o mesmo de uma noite para a outra, mesmo em um novo chat, mesmo com outra IA:

- **O que foi dito continua valendo.** Um vilão morto continua morto.
- **Os dados são de verdade.** O mestre não pode manipulá-los, exceto na dificuldade mais fácil, se você escolher.
- **Segredos continuam secretos.** O mestre nunca conta o que seu personagem não sabe.
- **O mundo se move.** As ameaças avançam enquanto você descansa ou viaja, e você vê os sinais delas.
- **Uma campanha é uma pasta** no seu computador: pare quando quiser e retome depois.

Um jogo vem como um sistema de jogo, um pacote que o mestre instala para a sua campanha: hoje o nosso é a **quinta edição**, do System Reference Document 5.1, gratuito. Sem um sistema, você joga livremente, uma história sem números. Outros virão ([Em breve](#9-coming-later)).

---

## 2. Primeiros passos <!-- icon: path -->

### 2.1 O que você precisa

- Um computador com Windows, macOS ou Linux, e um navegador.
- **Node.js 22** ou mais recente, de [nodejs.org](https://nodejs.org). Ele traz o `npm`, que instala o RPG Engine.
- Um **terminal**: no Windows, Terminal ou PowerShell; no macOS, Terminal. Para abrir um terminal em uma pasta, clique com o botão direito na pasta e escolha **Abrir no Terminal** (Windows) ou **Serviços > Novo Terminal na Pasta** (macOS).
- Um **agente de IA** para o mestre ([2.4](#24-connect-your-ai)), com o **maior modelo** que ele oferecer: um modelo pequeno é mais fácil de convencer a revelar segredos ou a quebrar as regras.

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

Isso cria a pasta `The Salt Isles` com uma campanha nova dentro. Entre nela com `cd "The Salt Isles"`. Lembre onde ela fica: você volta a ela toda vez que for jogar. Todo o resto você escolhe depois, no chat ou no dashboard; `rpg init --help` lista as opções para escolher algumas agora, como `--language it` ou `--difficulty hard`.

O mestre não pode criar uma campanha para você: antes do `init`, nada diz ao seu agente onde está o RPG Engine.

### 2.4 Conectar sua IA

O mestre roda em um **agente de IA**: um app de IA, no terminal ou no desktop, que consegue trabalhar com os arquivos do seu computador, como o Claude Code ou o Codex. Um chat simples, como o claude.ai ou o ChatGPT, ou um app de celular, não basta: o mestre precisa acessar os arquivos da campanha no seu computador. Cada agente exige seu próprio plano e login: o Claude Code, um plano pago do Claude; o Codex, um login do ChatGPT. Você instala o agente uma vez, pela página dele: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: na pasta da campanha, escreva `claude`. Quando ele perguntar se você confia na pasta, escolha **Yes, I trust this folder**; atenção, a resposta já selecionada é *No, exit*. A campanha também tem um pequeno hook, `rpg --listen`, que a pergunta não mostra: ele avisa o mestre na hora quando você age pelo dashboard.
- **Codex**: na pasta da campanha, escreva `codex` e diga sim quando ele perguntar se você confia na pasta. No app de desktop, confira nas configurações se as memórias estão desligadas para os chats do jogo.
- **Outro agente**: inicie-o na pasta da campanha e dê a ele o servidor MCP `rpg mcp`. O RPG Engine é um servidor MCP padrão: qualquer agente que suporte MCP pode ser o mestre, inclusive os locais.

Nós jogamos e testamos com o **Claude Code**; o **Codex** está conectado e verificado, mas nenhuma campanha inteira foi jogada com ele ainda. A campanha desliga a memória própria do agente: o jogo vive nos arquivos dele, para que voltar a um jogo salvo realmente volte no tempo.

### 2.5 O primeiro chat

Escreva qualquer coisa, como *Oi! Vamos começar.* Na primeira resposta de cada chat, o mestre dá a você o **link do seu dashboard**, algo como `http://127.0.0.1:4750`: abra-o e deixe-o ao lado do chat.

Entre as mensagens do mestre, seu agente mostra as ferramentas que usa: não abra os detalhes delas (no Claude Code, ctrl+o), pois podem mostrar segredos.

Uma campanha nova passa por três etapas, mostradas no topo do dashboard: **1 Configurações** (como você quer jogar), **2 Sessão zero** (você cria seu personagem, jogando), **3 Jogar**.

### 2.6 Configurações: escolhendo como jogar

O mestre pergunta só o que ainda falta, algumas perguntas por vez; a etapa **Configurações** do dashboard mostra as mesmas perguntas como cartões. Escreva "você decide" e o mestre escolhe. Tudo pode mudar depois, no chat ou em **Configurações**.

| Configuração | O que decide | Valores |
|---|---|---|
| **Mentor** | Quanto o mestre ensina as regras a você | desligado, dicas, tutorial |
| **Dificuldade** | Quão difícil o mundo joga | história, fácil, normal, difícil, brutal |
| **Letalidade** | O que significa cair em combate | narrativa (nunca morrer), épica (só quando importa), dados |
| **Jogos salvos** | Quando você pode voltar atrás | morte permanente, ponto de controle, livre ([3.8](#38-saves-and-going-back)) |
| **Rigor** | Quão de perto comida, luz e viagem seguem as regras | fluido, regras, simulação |
| **Dados** | Quem rola os seus dados | digitais, físicos |
| **Unidades** | Distâncias e pesos | métricas, imperiais |
| **Vozes dos personagens** | Quem fala pelos personagens que você encontra, do mestre aos personagens: sempre o mestre; em momentos-chave o próprio personagem, sabendo só o que sabe, conforme o mestre escolher; ou sempre o personagem, para os principais ou para todos, mais lento e mais caro, onde seu app de IA permitir | o mestre, às vezes, personagens principais, todos |
| **Companheiros** | Quem viaja com você | nenhum, criados com você, criados pelo mestre, encontrados no jogo |
| **Imagens** | Imagens de locais, missões e de quem você encontra | nenhuma, sob pedido, locais novos, missões e quem você encontra ([3.11](#311-pictures)) |
| **Linhas** e **Véus** | O que nunca aparece e o que acontece só fora de cena | listas |
| **Idioma** | O idioma do jogo e do dashboard | qualquer um |

A quinta edição acrescenta o **avanço**: pontos de experiência ou marcos.

Sem um mundo escrito, o mestre também pergunta uma **premissa** (gênero, tom, alguns elementos e o que você mais gosta em um jogo, como combates, mistérios, conversas ou exploração, com suas palavras) e a **preparação**: construir o mundo na hora, conforme o jogo avança, ou todo no começo.

**O estilo do mestre** nunca é perguntado, mas você pode mudá-lo no chat ou em **Configurações**: a **prosa** (simples, literária, pulp, irônica), as **histórias** que ele inventa (situações, arcos, episódios, mistério), um autor para **escrever à maneira de**, ou qualquer outra coisa **com suas palavras**.

### 2.7 Sessão zero: seu personagem

Você cria seu personagem com o mestre, como em uma mesa. Toda escolha é sua, a menos que você peça ao mestre para fazê-la: chegue com uma ideia completa, uma ideia vaga ou nada. O mestre explica como os valores de habilidade são definidos antes de qualquer dado ser rolado. Sua história nunca é obrigatória; se você der uma, o mestre a escreve com as suas palavras. Depois, o mestre pede uma imagem do seu personagem ([3.7](#37-your-characters-story-and-picture)). O RPG Engine calcula a ficha: você nunca faz as contas.

---

## 3. Jogando <!-- icon: chat -->

### 3.1 Conversando com o mestre

Escreva o que seu personagem faz ou diz, com suas próprias palavras:

> Pergunto ao estalajadeiro quem mais passou por aqui esta noite.

Para falar fora da história, escreva entre colchetes: *[Como funciona a agarrada?]* O mestre também responde entre colchetes.

Você diz o que tenta; o mestre diz o que acontece. O mestre nunca decide pelo seu personagem e nunca fala do motor do jogo. Você pode perguntar a ele como usar o dashboard.

**Agindo pelo dashboard**: clique em um nome da sua ficha, como uma arma, uma magia ou algo que você carrega, e depois em quem será o alvo; ou clique em uma pessoa para conversar. O dashboard escreve a frase por você, *Ataco Bandido Encapuzado 1 com Maça.*, e você pode alterá-la antes de clicar em **Dizer ao mestre**. O mestre a recebe como se tivesse sido dita no chat e decide como em qualquer outra ação. Se o seu aplicativo de IA não consegue receber a frase sozinho, **Copiar** deixa o texto pronto para colar no chat.

### 3.2 Rolagens

O mestre só pede uma rolagem quando o resultado é incerto e importa, e antes diz o que está em jogo. Depois:

- **No dashboard**, um aviso mostra um botão para cada teste, como *Acrobacia +4 · com vantagem*. Clique nele: os dados caem na página e o mestre recebe o resultado. Você também pode clicar na linha da ficha que se acende, jogar os dados da bandeja de dados ou escrever outra coisa no aviso.
- **Manual**, no canto do aviso ou em **Configurações**: o aviso diz o que rolar, e você rola pela ficha ou pela bandeja de dados.
- **Dados físicos**, com a configuração de dados em físicos: você escreve as faces que tirou, *[Tirei 14.]*, e o RPG Engine soma seus modificadores.

**Rolagens livres**: clique em qualquer número da ficha, ou abra a bandeja de dados, para rolar por diversão. Elas nunca contam e o mestre nunca as vê.

**As rolagens do mestre** aparecem na sua coluna de rolagens, exceto as secretas. Você sempre pode perguntar *[Essa rolagem foi de verdade?]*: no caso de uma rolagem secreta, o mestre dá uma impressão digital que prova que ela foi feita antes de você perguntar.

### 3.3 Cenas e combates

A história se desenrola em **cenas**: um combate, uma conversa, uma exploração, uma viagem, um descanso. No fim de cada cena o jogo é salvo automaticamente, e a cena entra no seu diário.

Em um combate, o mestre narra todos os turnos que não são seus e para quando você precisa decidir. A **Cena** mostra no alto de quem é a vez e quem vem depois, e o cartão do seu personagem ao lado do mapa; a ordem dos turnos, os pontos de vida do seu grupo e o estado dos inimigos, descrito em palavras, ficam ao lado da página. Se seu personagem cair, os testes de morte aparecem grandes na página.

### 3.4 Tempo, viagens e o mundo que se move

O RPG Engine controla a data; nenhum tempo passa entre as sessões. Diga que vai descansar, *Fazemos um descanso longo*, e, quando o mestre concordar, o descanso devolve o que deve. Em um descanso curto, o mestre pode perguntar no dashboard quantos dados de vida você gasta: role um de cada vez, veja quanto cada um cura e pare quando quiser. Diga para onde vai, *Pegamos a estrada ao norte, rumo a Rocca*, e o RPG Engine calcula o caminho, a distância e os dias, parando quando algo acontecer no trajeto. O dinheiro é contado nas moedas do jogo, troco incluído.

Os vilões têm planos com prazos. A cada novo dia, o mestre move as ameaças que o tempo fez avançar, e você vê os sinais delas, nunca o relógio em si.

### 3.5 Mapas

**Mundo** mostra os locais que seu personagem conhece, as estradas entre eles e o caminho que você percorreu, com névoa sobre o resto. **Cena** mostra o mapa do local onde você está, quando há um, com quem está em cada lugar; em um combate, na sua vez, os quadrados que você não alcança ficam velados. Quando o mestre perguntar para onde você se move, toque em um quadrado ou escreva-o, como *E4*.

**Mundo** também guarda o que seu personagem sabe. **Conhecimentos** lista as pessoas, os locais, as facções, as criaturas e as histórias que ele conhece, cada uma como ele a conhece: pesquise ou abra uma para ler por inteiro; um nome no texto leva à página correspondente. **Documentos** guarda as cartas, os avisos e as páginas que ele encontrou, para reler. **Calendário** mostra hoje, os prazos das suas missões com o tempo que resta e os dias da história: um dia com cenas leva aos capítulos dele no Diário.

### 3.6 Missões, diário e notas

Uma tarefa que seu personagem assume vira uma missão no **Diário**, com seus objetivos, seu prazo e o que ela mede; marque-a com uma estrela para mantê-la à vista no alto da Cena. O Diário também conta sua **história**, cena por cena, e guarda suas **notas**: privadas, a menos que você use **Compartilhar** em uma, e então o mestre a recebe como algo que seu personagem pensa, nunca como um fato. Em **Companheiros** você lê os diários dos seus companheiros: de vez em quando, no fim de um dia ou de uma missão, eles escrevem algumas linhas sobre o que pensam e sentem.

### 3.7 A história e a imagem do seu personagem

Na sua ficha, o cartão **Descrição** tem um campo para a história do seu personagem: o mestre a escreve ali, depois que você disser sim. Para ter uma imagem, entregue ao mestre um arquivo (PNG, JPEG, WebP ou SVG, de até 5 MB) com o local dele no seu computador, ou peça um retrato ([3.11](#311-pictures)): *[Faça um retrato meu: cabelo grisalho em trança, uma cicatriz no queixo.]*

### 3.8 Jogos salvos e voltar atrás

O RPG Engine salva a campanha inteira no fim de cada cena. A configuração de **jogos salvos** decide o resto:

| Jogos salvos | Salvar quando quiser | Voltar |
|---|---|---|
| **permadeath** | não | nunca |
| **checkpoint** | não | ao último jogo salvo, só quando seu personagem morre |
| **livre** | sim | a qualquer jogo salvo |

Em todos os modos você pode **recomeçar**, desde o início do jogo ou desde a sessão zero. Faça isso no chat ou em **Jogos salvos**.

Depois de voltar, **abra um novo chat**: o antigo se lembra do que foi desfeito. Escreva *continuar* no novo chat e depois clique em **Abri um novo chat** em Jogos salvos.

### 3.9 Sessões: parar e voltar

Pare quando quiser: *[Vamos parar por aqui esta noite.]* Tudo já está salvo nos arquivos. Para voltar, inicie seu agente na pasta da campanha e escreva *continuar*: o mestre faz um resumo curto e segue em frente.

### 3.10 O humor do mestre

O robô no alto do dashboard é o mestre: o rosto dele acompanha o tom da história e nunca revela o que você ainda não sabe. Quando o chat está fechado, ele dorme.

### 3.11 Imagens

O RPG Engine pode gerar imagens dos locais a que você chega, das missões que assume e das pessoas que encontra, conforme a configuração de **imagens**, e o retrato do seu personagem quando você pedir. Ele usa seu próprio Codex ou Claude Code, com seu login, no seu plano e dentro dos limites dele: o **Codex** pinta as imagens; na falta dele, o **Claude Code** as desenha. **Configurações** diz se este computador pode gerá-las e, se não puder, como configurar. Você sempre pode dar ao mestre uma imagem sua.

### 3.12 Segurança: linhas, véus e parar

As **linhas** nunca aparecem no jogo; os **véus** acontecem apenas fora de cena. A qualquer momento, escreva *[parar]*: o mestre abandona esse conteúdo na hora e o acrescenta às suas linhas.

### 3.13 Mudando de ideia

Toda configuração pode mudar, no chat ou em **Configurações**. Uma decisão que o mestre toma sem consultar o livro vira um **precedente**, e assim a mesma pergunta recebe a mesma resposta da próxima vez.

---

## 4. O painel <!-- icon: party -->

Uma página no seu próprio computador, aberta apenas no navegador desse computador e ativa enquanto o chat estiver aberto. Quando o chat é fechado, ela mostra *Not connected*; ela volta sozinha no próximo chat.

- **Grupo**: sua ficha e as dos seus companheiros. Clique em um número para rolá-lo; passe o mouse sobre ele para ver de onde vem e, quando uma seta marca o dado, o que melhora ou piora a rolagem. Ao lado, as rolagens.
- **Cena**: onde você está, a imagem e o mapa do lugar, quem está presente, o que está acontecendo; em um combate, os turnos e a carta do seu personagem.
- **Diário**: missões, a história, os diários dos seus companheiros, suas notas.
- **Mundo**: o mapa do mundo, o que seu personagem sabe, os documentos encontrados e o calendário.
- **A bandeja de dados**: escolha os dados e um modificador, e role; ×2 dobra os dados, nunca o modificador, como em um acerto crítico.
- **Jogos salvos**, **Ajuda**, **Configurações** e **Sobre**, como ícones no fim da fileira. As Configurações também guardam as preferências da própria página: tema, som dos dados, conjunto de dados.

Quando o mestre pergunta algo a você, o aviso dele fica no topo, em qualquer seção em que você esteja.

---

## 5. Sistemas de jogo e regras da casa <!-- icon: dice -->

### 5.1 O que é um sistema de jogo

Os dados de um jogo: a ficha, os números, as criaturas, os itens, as magias e o texto das regras. Cada campanha usa um sistema. O RPG Engine calcula a ficha e o que é gasto e recuperado; como uma característica funciona, o mestre lê nas regras e decide, como em uma mesa.

### 5.2 Quinta edição

As raças, classes, subclasses, um antecedente e um talento do SRD 5.1; as 319 magias, as armas, armaduras, itens mágicos e monstros; os capítulos de regras, que o mestre lê pelo texto exato; a ficha completa, calculada.

É um pacote à parte: o mestre o oferece quando você configura uma campanha e o instala. Uma campanha que usa esse sistema o instala sozinha na primeira vez que é aberta em um computador que não o tenha, e o mestre avisa você.

Você também pode jogar com conteúdo que o SRD não tem, de um livro que você possui: o mestre o escreve como páginas da sua campanha, e o RPG Engine as trata como suas. O RPG Engine inclui apenas conteúdo aberto; o que o seu mestre conhece não tem limite.

Seus próprios manuais podem ser a sua biblioteca: diga ao mestre onde estão, *[Meus manuais estão em D:\Books\5e.]*, ou adicione a pasta deles em Pacotes › Biblioteca, e diga sim na janela que o computador mostrar, uma única vez. O RPG Engine lê os manuais neste computador; cada campanha usa as pastas que você ativar ali, e o mestre as consulta quando decide uma regra, depois do SRD, citando o livro e a página. Eles são lidos melhor como texto ou como PDFs com texto selecionável; um PDF escaneado é lido a partir das imagens das páginas, somente no Windows, em alguns minutos e com alguns erros. O RPG Engine nunca altera seus manuais, nunca envia o texto deles para lugar nenhum e nunca o copia para uma campanha.

### 5.3 Regras da casa e acréscimos seus

Peça ao mestre: *[Regra da casa: um 1 natural em um ataque faz você derrubar a arma.]* Ele guarda a regra como um acordo da mesa ou escreve uma página ou um número da ficha quando for preciso. Regras da casa já escritas podem ir como arquivos de texto na pasta `rules` da campanha.

### 5.4 Adicionar ou importar seu próprio sistema de jogo

Um sistema de jogo é um pacote: o mestre instala um a partir do npm, de uma pasta ou de um arquivo, e um que não seja nosso só com o seu sim, em uma janela do seu computador. Criar um é trabalho de quem desenvolve, descrito nos documentos do RPG Engine no GitHub. Transformar um livro seu em um sistema de jogo ainda não é possível ([Em breve](#9-coming-later)).

---

## 6. Extensões <!-- icon: plus -->

Uma extensão acrescenta algo a uma campanha, além do sistema de jogo: um recurso como o clima, que muda a cada amanhecer, ou arrombar uma fechadura com dados. Para adicionar uma, vá em Packages › Add. Você pode escolher na lista ou informar o nome no npm, uma pasta ou um arquivo. Uma extensão que não é nossa traz código e só entra com o seu sim, em uma janela do seu computador. Uma extensão feita para outro sistema de jogo avisa qual é e não é adicionada. Em Packages › Installed, você atualiza ou remove uma extensão. O mestre também pode adicionar uma, quando você pedir.

---

## 7. De onde vem uma campanha, e seu idioma <!-- icon: world -->

### 7.1 Três jeitos de ter um mundo

- **Criado na hora**: a partir da sua premissa, o mestre constrói cada local, pessoa e trama logo antes de você precisar deles, e os guarda.
- **Preparado no início**: o mesmo, com o mundo construído antes do jogo.
- **De uma aventura ou livro seu**: dê ao mestre o arquivo, *[Importe esta aventura como nossa campanha: D:\Books\adventure.pdf. Não me conte nada do que está nela.]* Ele lê melhor texto, EPUB, documento do Word ou PDF cujo texto possa ser selecionado; um PDF escaneado é lido a partir das imagens das páginas, só no Windows, devagar e com alguns erros. Seu próprio Codex ou Claude Code o lê fora do chat, ou então o mestre no chat, no seu plano: o documento inteiro vai para a OpenAI ou a Anthropic, sob os termos da sua conta e a escolha dela sobre treinamento. O painel mostra o andamento; a partir de um romance, o mestre propõe por onde começar. Ele escreve os locais, os personagens e os segredos.

Uma campanha é jogada uma vez: para jogar a mesma aventura de novo, crie uma campanha nova.

### 7.2 Idiomas

Um idioma por campanha, o do mestre, que o painel acompanha. O painel já vem com 26 idiomas. Qualquer outro é traduzido no seu computador pelo Codex ou pelo Claude Code ou, sem eles, pelo mestre no chat. Os termos da quinta edição em italiano vêm do SRD italiano oficial; o texto das regras fica em inglês, e o mestre o conta no seu idioma.

---

## 8. Para os curiosos: a pasta da campanha <!-- icon: list -->

Você nunca precisa abri-la, e ela guarda os segredos da sua campanha. Nela estão `campaign.yaml` (suas configurações), `state.yaml` (em que ponto o jogo está), `world/` (uma página markdown para cada personagem, local, missão e o resto), `rules/` (suas regras da casa), `images/`, `log.jsonl` (cada mudança), `.saves/`, `.player/` (suas notas) e os pequenos arquivos que dizem aos agentes de IA onde o RPG Engine está. As páginas usam o formato do Obsidian. Se você alterar uma página à mão, o mestre fica sabendo na resposta seguinte.

O RPG Engine fica nesta pasta: ele lê e grava o jogo só aqui e nunca mexe nos seus outros arquivos; as pastas dos seus manuais ele apenas lê. Fora dela, guarda somente pastas de dados próprias (as traduções do dashboard, o texto que leu dos seus manuais e o Codex ou o Claude Code, se você deixar que ele os instale) e pastas temporárias enquanto uma imagem é desenhada. Qualquer outra coisa que seu agente queira fazer no seu computador, ele pergunta antes.

Todo comando que o mestre usa também pode ser executado na pasta da campanha: `rpg --help` lista todos. Muitos mostram os segredos da campanha.

---

## 9. Em breve <!-- icon: hourglass -->

- **Você como mestre**, com a IA jogando como o grupo.
- **Modo autor**: escreva uma aventura com a IA, depois exporte e compartilhe.
- **Vários jogadores no mesmo computador**, cada um com seu próprio personagem, alternando as vezes no mesmo chat.
- **Mais extensões**: mundos, recursos e regras da casa para compartilhar.
- **Outros jogos**: mais sistemas de jogo, e os seus próprios.

---

## 10. Perguntas e problemas <!-- icon: info -->

### Perguntas

**Preciso saber as regras?** Não. Escolha o mentor em modo tutorial e pergunte entre colchetes quando quiser.

**O mestre pode trapacear?** Ele não pode mudar uma rolagem feita pelo RPG Engine, exceto na dificuldade história, nem fatos já definidos.

**Custa algo?** O RPG Engine é gratuito. O mestre roda no plano do seu agente, ou no seu próprio computador com um modelo local. Uma noite de jogo é um chat longo: nos planos menores, você pode atingir o limite do plano antes de a noite acabar. Imagens, traduções e importações usam o mesmo plano. O próprio RPG Engine nunca usa uma chave de API, que é paga por chamada: entre no seu agente com a sua conta, não com uma chave.

**Posso jogar no celular?** Não: o mestre roda no seu computador, e o painel só abre nele.

**Posso jogar com amigos?** Ainda não: hoje é um jogador, um personagem, mais companheiros ([Em breve](#9-coming-later)).

**Posso usar outra IA da próxima vez?** Pode: abra a campanha em outro agente e escreva *continuar*.

### Problemas

**O painel não abre.** Pergunte ao mestre: `[Qual é o link do painel?]`. Ele só funciona enquanto um chat está aberto nessa campanha, depois da primeira resposta do mestre.

**O mestre parece não conhecer o jogo.** Seu agente não carregou o RPG Engine. Confira se você o iniciou na pasta da campanha e se confiou nela. No Claude Code, escreva `/mcp` e reconecte o `rpg`. No Codex, `codex mcp list` na pasta da campanha deve mostrar `rpg`. Se o `rpg --version` não for encontrado, instale o RPG Engine de novo ([2.2](#22-install)).

**Atualizando.** Rode `npm install -g rpg-engine` de novo e depois abra um novo chat: um mestre em andamento mantém a versão com que começou.

**O mestre lembra algo que eu desfiz.** Abra um novo chat e clique em **Abri um novo chat** em Jogos salvos.

**Nenhuma imagem aparece.** Configurações > Imagens diz se este computador consegue gerá-las e como.

**A instalação falha, ou o `rpg` não inicia.** `node --version` deve mostrar 22 ou mais recente. No Windows, mantenha o RPG Engine e suas campanhas fora de caminhos que contenham `&`.

**O link do painel mudou.** Outro programa ocupou o endereço habitual; o mestre dá a você o novo link.
