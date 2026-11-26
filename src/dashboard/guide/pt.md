<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: o guia completo

**RPG Engine** permite que você jogue um jogo de RPG de mesa com uma **IA como mestre**. Você joga no **painel**, uma janela no seu computador com sua ficha, os dados, os mapas, seu diário e o **chat** com o mestre. O RPG Engine trabalha nos bastidores: ele **lembra do mundo**, **rola os dados** e **faz as contas**.

Este guia é para quem joga: você não precisa saber programar.

## Início rápido <!-- icon: send -->

1. Instale o **Node.js** em [nodejs.org](https://nodejs.org) (a versão LTS).
2. Uma única vez, em um terminal novo, aberto depois de instalar o Node.js, instale o RPG Engine: `npm install -g rpg-engine`. Se o Windows responder que a execução de scripts está desabilitada, escreva uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responda sim e tente de novo.
3. Escreva `rpg open`. Ele pergunta se deve colocar o ícone do RPG Engine na sua área de trabalho e no seu menu: aperte Enter para sim. Daí em diante, você inicia o RPG Engine pelo ícone, sem terminal ([2.2](#22-install)).
4. Uma janela mostra suas campanhas. Clique em **Nova campanha**, dê um nome a ela e clique em **Criar** ([2.3](#23-create-a-campaign)): o painel dela abre em uma janela própria.
5. No chat com o mestre, escolha seu app de IA e o modelo dele: o Claude Code exige um plano pago do Claude; o Codex, uma conta do ChatGPT, gratuita ou paga ([2.4](#24-connect-your-ai)). Se o app não estiver instalado, ou você não tiver entrado na conta, a página o instala ou faz o login para você. Clique em **Abrir o chat** e depois em **Começar**. A primeira resposta pode levar alguns minutos; depois o mestre pergunta como você quer jogar, e vocês criam seu personagem juntos.

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
- **Node.js 24** ou mais recente, de [nodejs.org](https://nodejs.org). Ele traz o `npm`, que instala o RPG Engine.
- Um **terminal**, uma vez, para instalar o RPG Engine: no Windows, Terminal ou PowerShell; no macOS, Terminal. Para abrir um em uma pasta, clique com o botão direito na pasta e escolha **Abrir no Terminal** (Windows) ou **Serviços > Novo Terminal na Pasta** (macOS). Se o Windows responder que a execução de scripts está desabilitada, escreva uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e responda sim.
- Um **app de IA** para o mestre, com sua própria conta ([2.4](#24-connect-your-ai)): a página pode instalá-lo para você. Jogue com o **maior modelo** que ele oferecer: um modelo pequeno é mais fácil de convencer a revelar segredos ou a quebrar as regras.

### 2.2 Instalar

```text
npm install -g rpg-engine
rpg open
```

A primeira linha instala o RPG Engine; `rpg --version` confirma que deu certo. Se o npm se oferecer para se atualizar, você pode ignorar.

O `rpg open` abre a janela do RPG Engine, com suas campanhas. Na primeira vez, ele pergunta no terminal se deve adicionar o ícone à sua área de trabalho e ao seu menu Iniciar (Aplicativos no Mac): aperte Enter para sim. Daí em diante, você dá dois cliques no ícone e não precisa mais do terminal. Sem o ícone, escreva `rpg open` toda vez que for jogar; `rpg icon` adiciona o ícone depois, e `rpg icon --remove` o remove.

### 2.3 Criar uma campanha

A janela do RPG Engine mostra suas campanhas como cartões, com a última aberta primeiro. Clique em **Nova campanha** e informe o **Nome**, o **Idioma** e o **Sistema de jogo**: o mestre faz o resto com você. A campanha fica em uma pasta com o nome dela, dentro da pasta `RPG Engine` da sua pasta de usuário (no Windows, `C:\Users\<name>`); **Escolher outra pasta…** a coloca em uma pasta vazia à sua escolha. Em **O mestre**, você já pode escolher o app de IA e o modelo do primeiro chat dela ([2.4](#24-connect-your-ai)). Clique em **Criar**: o painel da campanha abre em uma janela própria.

Da próxima vez, clique em um cartão para abrir a campanha; a que já está aberta diz **Aberta agora**. **Abrir uma pasta…** adiciona uma campanha que você já tem neste computador. A pequena cruz em um cartão o tira da lista: os arquivos ficam onde estão.

### 2.4 Conectar sua IA

O mestre roda em um **app de IA** no seu computador, com sua própria conta: Claude Code, Codex, OpenCode ou Antigravity. Um chat simples, como o claude.ai ou o ChatGPT, ou um app de celular, não basta: o mestre precisa acessar os arquivos da campanha no seu computador. Cada app exige sua própria conta: o Claude Code, um plano pago do Claude (Pro ou superior); o Codex, uma conta do ChatGPT, gratuita ou paga; o Antigravity, uma conta Google, cujo uso gratuito tem limites semanais; o OpenCode tem alguns modelos gratuitos por tempo limitado, ou usa os do seu próprio provedor, inclusive locais.

No chat do painel, escolha o app em **Seu app de IA**, depois o **Modelo** e o **Raciocínio do mestre**: a página os sugere. Mais raciocínio é mais lento e gasta mais do seu plano. Um app que não está pronto diz o que precisa, com um botão que resolve:

- **Claude Code** e **Codex**: **Instalar Claude Code** ou **Instalar Codex** o baixa para a pasta do próprio RPG Engine neste computador; **Entrar no Claude Code** ou **Entrar no Codex** abre a página de login dele no navegador. O RPG Engine nunca vê sua senha.
- **OpenCode** e **Antigravity**: **Obter OpenCode** ou **Obter Antigravity** abre o site dele, onde você o instala. O OpenCode joga sem login; o Antigravity entra pelo próprio app. Depois volte e clique em **Verificar novamente**.

O Antigravity está marcado como **em teste**: ele pode sair do jogo e fazer perguntas do jeito dele, então o Claude Code, o Codex ou o OpenCode são melhores para jogar. O Antigravity guarda seus chats anteriores, e a memória dele não pode ser desligada: o mestre é instruído a nunca lê-los. O que você escreve vai para o Google, que pode pedir a pessoas que leiam: não coloque dados pessoais no jogo. O RPG Engine não é um produto do Google. Nós jogamos e testamos o RPG Engine mais com o **Claude Code**: nenhuma campanha inteira foi jogada com os outros ainda.

No chat do painel, o mestre mexe no seu computador apenas por meio do RPG Engine: ele não abre nenhum arquivo seu por conta própria. O RPG Engine lê fora da campanha só o que você escolheu, depois que você diz sim em uma janela do seu computador.

Você também pode jogar no chat do próprio app de IA, em um terminal ou no app de desktop ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 O primeiro chat

Com o app e o modelo escolhidos, clique em **Abrir o chat**: o app inicia, o que pode levar alguns segundos. Depois clique em **Começar** ou escreva qualquer coisa, como *Oi! Vamos começar.* A primeira resposta pode levar alguns minutos, enquanto o mestre monta a cena.

O chat tem uma seção própria, **Roleplay**, ou fica ao lado da página: os pequenos botões no topo dele o colocam **Na própria aba**, **À esquerda** ou **À direita**, e você arrasta a borda para alargá-lo.

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
| **Seu personagem** | Como seu personagem é criado na sessão zero | com o mestre, pelo mestre, o seu próprio ([2.7](#27-session-zero-your-character)) |
| **Companheiros** | Quem viaja com você | nenhum, criados com você, criados pelo mestre, encontrados no jogo |
| **Imagens** | Imagens de locais, missões e de quem você encontra | nenhuma, sob pedido, locais novos, missões e quem você encontra ([3.11](#311-pictures)) |
| **Linhas** e **Véus** | O que nunca aparece e o que acontece só fora de cena | listas |
| **Idioma** | O idioma do jogo e do dashboard | qualquer um |

A quinta edição acrescenta o **avanço**: pontos de experiência ou marcos.

Sem um mundo escrito, o mestre também pergunta uma **premissa** (gênero, tom, alguns elementos e o que você mais gosta em um jogo, como combates, mistérios, conversas ou exploração, com suas palavras), a **preparação**: construir o mundo na hora, conforme o jogo avança, ou todo no começo; e a **duração**: uma noite, algumas sessões (de três a cinco noites), ou aberta, uma aventura após a outra. Ao fim de uma história com duração definida, você sempre pode continuar.

**O estilo do mestre** nunca é perguntado, mas você pode mudá-lo no chat ou em **Configurações**: **Prosa** (simples, literária, pulp, irônica), **Histórias** que o mestre inventa (situações, arcos, episódios, mistério), **Escrever como** um autor à sua escolha, ou qualquer outra coisa **Com suas palavras**.

### 2.7 Sessão zero: seu personagem

Você cria seu personagem com o mestre, como em uma mesa. Toda escolha é sua, a menos que você peça ao mestre para fazê-la: chegue com uma ideia completa, uma ideia vaga ou nada; ou peça ao mestre que crie tudo a partir de poucas palavras. Em um jogo com níveis, o mestre pergunta de qual nível você quer começar: o primeiro, a menos que você queira outro. O mestre explica como os valores de habilidade são definidos antes de qualquer dado ser rolado. Sua história nunca é obrigatória; se você der uma, o mestre a escreve com as suas palavras. Depois, o mestre pede uma imagem do seu personagem ([3.7](#37-your-characters-story-and-picture)). O RPG Engine calcula a ficha: você nunca faz as contas.

Você já tem um personagem, de outro jogo ou de outra campanha? Escolha **Eu já tenho um** na configuração e entregue-o ao mestre: cole a ficha no chat. No chat do próprio app de IA, você também pode dizer onde fica o arquivo dela no seu computador (um PDF, uma imagem, um texto); no chat do painel, o mestre não abre nenhum arquivo seu. O mestre a escreve como ela é, no nível dela, confere com as regras e com o mundo, e combina com você o que não se encaixar.

### 2.8 A outra forma: o chat do próprio app de IA

Você também pode jogar no chat do próprio app de IA, em um terminal ou no app de desktop, com o painel aberto ao lado. Nesse caso, você cria a campanha em um terminal, na pasta onde guarda seus jogos ([2.1](#21-what-you-need) explica como), sempre com o nome dela: `rpg init "The Salt Isles"` cria a pasta `The Salt Isles` com uma campanha nova dentro. O RPG Engine prepara sozinho o que cada app precisa ali.

Inicie seu app nessa pasta: `claude` para o Claude Code, `codex` para o Codex, `agy` para o Antigravity, `opencode` para o OpenCode; ou abra a pasta no app de desktop dele. Diga sim quando ele perguntar se você confia na pasta: atenção, no Claude Code a resposta já selecionada é *No, exit*. Qualquer outro agente que suporte MCP também pode ser o mestre: inicie-o na pasta da campanha e dê a ele o servidor MCP `rpg mcp`.

Escreva *Oi! Vamos começar.* Na primeira resposta de cada chat, o mestre dá a você o **link do seu painel**, algo como `http://127.0.0.1:4750`: abra-o ao lado do chat.

- Entre as mensagens do mestre, seu app mostra as ferramentas que usa: não abra os detalhes delas (no Claude Code, ctrl+o), pois podem mostrar segredos.
- A campanha desliga a memória própria do app: o jogo vive nos arquivos dele, para que voltar a um jogo salvo realmente volte no tempo. No app de desktop do Codex, confira nas configurações se as memórias estão desligadas para os chats do jogo.
- Se o mestre disser que não encontra as ferramentas do RPG Engine, escreva `rpg init` na pasta da campanha e depois abra um novo chat.
- Um chat por vez joga uma campanha: enquanto o seu estiver aberto, o chat do painel espera.

---

## 3. Jogando <!-- icon: chat -->

### 3.1 Conversando com o mestre

Escreva o que seu personagem faz ou diz, com suas próprias palavras:

> Pergunto ao estalajadeiro quem mais passou por aqui esta noite.

Para falar fora da história, escreva `[OOC: …]` (out of character, ou "fora do personagem"): *[OOC: Como funciona a agarrada?]* O mestre responde da mesma forma; no chat do painel, as palavras dele fora do jogo aparecem separadas, marcadas com OOC.

No chat do painel, escreva na caixa na parte de baixo e aperte Enter para enviar; Shift+Enter começa uma nova linha. Enquanto o mestre responde, o botão **Parar** interrompe a resposta, e suas palavras ficam esperando na caixa. Quando o mestre pergunta algo a você, os botões dele vêm com a pergunta, rolagens incluídas: clique em um ou escreva sua resposta. Sob a caixa você vê o app e o modelo; onde o app permitir, clique no modelo para trocá-lo depois que o mestre responder. **Fechar o chat** encerra o chat; o jogo fica nos arquivos.

Você diz o que tenta; o mestre diz o que acontece. O mestre nunca decide pelo seu personagem e nunca fala do motor do jogo. Você pode perguntar a ele como usar o dashboard.

**Agindo pelo dashboard**: clique em um nome da sua ficha, como uma arma, uma magia ou algo que você carrega: o cartão dele diz o que é; uma bolsa se abre pela seta dela, e o ⓘ mostra o cartão do item. Escolha o que fazer com ele. Algo que não precisa de ninguém, como **Equipar**, pede que você confirme no mesmo botão, *Confirmar: equipo Escudo*: aperte de novo e a ação vai para o mestre. Algo feito a alguém, como **Atacar**, pergunta quem, na lista ou com um clique no mapa; então o botão diz a frase inteira, *Ataco Bandido Encapuzado 1 com Maça*, e um clique a envia. Para dizer do seu jeito, clique em uma pessoa para conversar ou escreva no chat. O mestre a recebe como se tivesse sido dita no chat, decide como em qualquer outra ação e pergunta com botões o que você deixou de dizer. Onde seu app de IA não tem campainha, o mestre a lê assim que você escrever de novo no chat; se o chat estava fechado antes, **Repetir** a envia mais uma vez.

### 3.2 Rolagens

O mestre só pede uma rolagem quando o resultado é incerto e importa, e antes diz o que está em jogo. Depois:

- **No dashboard**, um aviso mostra um botão para cada teste, como *Acrobacia +4 · com vantagem*. Clique nele: os dados caem na página e o mestre recebe o resultado. Você também pode clicar na linha da ficha que se acende, jogar os dados da bandeja de dados ou escrever outra coisa no aviso.
- **Manual**, no canto do aviso ou em **Configurações**: o aviso diz o que rolar, e você rola pela ficha ou pela bandeja de dados.
- **Dados físicos**, com a configuração de dados em físicos: você escreve as faces que tirou, *[Tirei 14.]*, e o RPG Engine soma seus modificadores.

**Rolagens livres**: clique em qualquer número da ficha, ou abra a bandeja de dados, para rolar por diversão. Elas nunca contam e o mestre nunca as vê.

**As rolagens do mestre** aparecem na sua coluna de rolagens, exceto as secretas. Você sempre pode perguntar *[Essa rolagem foi de verdade?]*: no caso de uma rolagem secreta, o mestre dá uma impressão digital que prova que ela foi feita antes de você perguntar.

### 3.3 Cenas e combates

A história se desenrola em **cenas**: um combate, uma conversa, uma exploração, uma viagem, um descanso. No fim de cada cena, o jogo é salvo automaticamente e a cena entra no seu diário. Quando a história muda de rumo, o mestre reúne as cenas desde o último capítulo em um novo capítulo do livro da sua história.

Em um combate, o mestre narra todos os turnos que não são seus e para quando você precisa decidir. A **Cena** mostra no alto de quem é a vez e quem vem depois, e o cartão do seu personagem ao lado do mapa; a ordem dos turnos, os pontos de vida do seu grupo e o estado dos inimigos, descrito em palavras, ficam ao lado da página. Se seu personagem cair, os testes de morte aparecem grandes na página.

**Ordens permanentes**: diga aos seus companheiros algo que deva durar, como *De agora em diante, deixem sempre um vivo*, e o mestre mantém essa ordem até você cancelá-la. Seus companheiros a seguem até onde o personagem deles permitir e, se algum não a seguir, avisa. Você encontra suas ordens em **Configurações**, onde pode adicioná-las e removê-las.

### 3.4 Tempo, viagens e o mundo que se move

O RPG Engine controla a data. Entre as sessões, o tempo do jogo para, a menos que você escolha em **Configurações** deixá-lo correr, como um dia de jogo para cada semana fora, ou peça ao mestre. Diga que vai descansar, *Fazemos um descanso longo*, e, quando o mestre concordar, o descanso devolve o que deve. Em um descanso curto, o mestre pode perguntar no dashboard quantos dados de vida você gasta: role um de cada vez, veja quanto cada um cura e pare quando quiser. Diga para onde vai, *Pegamos a estrada ao norte, rumo a Rocca*, e o RPG Engine calcula o caminho, a distância e os dias, parando quando algo acontecer no trajeto. O dinheiro é contado nas moedas do jogo, troco incluído.

Os vilões têm planos com prazos. A cada novo dia, o mestre move as ameaças que o tempo fez avançar, e você vê os sinais delas, nunca o relógio em si.

### 3.5 Mapas

**Mundo** mostra os locais que seu personagem conhece, as estradas entre eles e o caminho que você percorreu, com névoa sobre o resto. **Cena** mostra o mapa do local onde você está, quando há um, com quem está em cada lugar; em um combate, na sua vez, os quadrados que você não alcança ficam velados. Quando o mestre perguntar para onde você se move, toque em um quadrado ou escreva-o, como *E4*.

**Mundo** também guarda o que seu personagem sabe. **Conhecimentos** lista as pessoas, os locais, as facções, as criaturas e as histórias que ele conhece, cada uma como ele a conhece: pesquise ou abra uma para ler por inteiro; um nome no texto leva à página correspondente. **Documentos** guarda as cartas, os avisos e as páginas que ele encontrou, para reler. **Calendário** mostra hoje, os prazos das suas missões com o tempo que resta e os dias da história: um dia com cenas leva a elas na linha do tempo do Diário.

### 3.6 Missões, diário e notas

Uma tarefa que seu personagem assume vira uma missão no **Diário**, com seus objetivos, seu prazo e o que ela mede. Marque-a com uma estrela para mantê-la à vista no alto da Cena. Em **História**, o Diário conta a sua história como um livro: a cada virada da história, o mestre escreve um capítulo em prosa que narra as cenas desde o capítulo anterior, no estilo que você escolheu. Leia capítulo por capítulo, com o último marcado pelo marcador de página, e baixe o livro em Markdown ou como página da web, para imprimir ou compartilhar. Em um jogo começado antes, peça ao mestre que escreva a história até aqui. **Linha do tempo** lista as cenas, numeradas, com o que aconteceu em cada uma. O Diário também guarda suas **Notas**: privadas, a menos que você use **Compartilhar** em uma. Então o mestre a recebe como algo que seu personagem pensa, nunca como um fato. Em **Companheiros** você lê os diários dos seus companheiros: de vez em quando, no fim de um dia ou de uma missão, eles escrevem algumas linhas sobre o que pensam e sentem.

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

Depois de voltar, **abra um novo chat**: o antigo se lembra do que foi desfeito. No chat do painel, clique em **Fechar o chat** e depois em **Novo chat**; no chat do próprio app de IA, abra uma nova conversa (`/clear` no Claude Code). Escreva *continuar* no novo chat. Depois avise o mestre de que o chat é novo: clique em **Abri um novo chat** em Jogos salvos, ou diga isso no chat. Até lá, o mestre não segue em frente.

Se você não sabe o que é git, pule este parágrafo. Se a pasta da campanha for um repositório git, **Configurações** tem uma seção **Git**, tudo desligado até você escolher: um commit no início de cada sessão, em cada jogo salvo e no fim de cada cena, e um push depois dele, se você quiser. Um commit é uma foto da campanha naquele momento; um push envia essas fotos para o repositório online, no GitHub por exemplo, para que uma cópia fique fora deste computador. Os jogos salvos e seus chats com o mestre ficam fora do repositório, a menos que você os inclua; inclua os chats apenas se o repositório for privado.

### 3.9 Sessões: parar e voltar

Pare quando quiser: *[Vamos parar por aqui esta noite.]* Tudo já está salvo nos arquivos. Para voltar, abra o RPG Engine pelo ícone e clique na sua campanha. Se você deixou o chat aberto, ele volta sozinho. Se o fechou, clique em **Retomar o chat**. Depois clique em **Retomar a história**: o mestre diz em poucas linhas onde você estava e segue em frente. Se o jogo foi fechado enquanto o mestre ainda respondia, ou enquanto uma pergunta dele esperava por você, esse botão diz **Continuar daqui**. **Novo chat** abre um chat novo no mesmo jogo. No chat do próprio app de IA, inicie-o na pasta da campanha e escreva *continuar*.

### 3.10 O humor do mestre

O robô no alto do painel é o mestre: o rosto dele acompanha o tom da história e nunca revela o que você ainda não sabe. Quando o painel não está conectado ao jogo, ele dorme.

### 3.11 Imagens

O RPG Engine pode gerar imagens dos locais a que você chega, das missões que assume e das pessoas que encontra, conforme a configuração **Imagens**, e também o retrato do seu personagem quando você pedir. Seu próprio app de IA as faz com os meios dele, com seu login, no seu plano e dentro dos limites dele: o **Claude** as desenha como imagens vetoriais, o **Codex** e o **Antigravity** as pintam, o **OpenCode** desenha imagens vetoriais simples no chat. Em **Configurações > Campanha > Imagens**, você pode pedir que o Codex ou o Antigravity as pintem também quando seu mestre for outro app: onde o app escolhido não puder, seu chat as faz. **Configurações** diz se este computador pode gerá-las e, se não puder, como configurar. Você sempre pode dar uma imagem sua, ao seu personagem ou a qualquer página que vê: passe o ponteiro sobre uma das imagens da página e um pequeno botão de imagem aparece no canto (também pelo teclado, e sempre no celular). Em **Mundo**, a página que você abre também tem **Trocar a imagem…**, ou **Adicionar uma imagem…** enquanto ela não tem nenhuma. Com o ponteiro sobre uma imagem, ou com o botão dela em foco, você também pode colar uma que tenha copiado, com Ctrl+V (⌘V no Mac). A sua imagem toma o lugar da que a página já tem. Ou então solte o arquivo na pasta **inbox** da campanha e diga ao mestre para qual página ele é.

### 3.12 Segurança: linhas, véus e parar

As **linhas** nunca aparecem no jogo; os **véus** acontecem apenas fora de cena. A qualquer momento, escreva *[parar]*: o mestre abandona esse conteúdo na hora e o acrescenta às suas linhas.

### 3.13 Mudando de ideia

Toda configuração pode mudar, no chat ou em **Configurações**. Uma decisão que o mestre toma sem consultar o livro vira um **precedente**, e assim a mesma pergunta recebe a mesma resposta da próxima vez.

---

## 4. O painel <!-- icon: party -->

Uma página no seu próprio computador, em uma janela própria, aberta apenas nesse computador. Ela fica ativa enquanto a janela estiver aberta, com ou sem chat; cerca de trinta segundos depois que você a fecha, o jogo para, e o chat com ele. Nada se perde: tudo está nos arquivos. No chat do próprio app de IA, ela fica ativa enquanto esse chat estiver aberto. Quando o jogo está fora, a página mostra *Not connected*: clique em **Reabrir a campanha** ou, no seu próprio app, abra o próximo chat. O botão **Campanhas**, com a casa, leva de volta a todas as suas campanhas.

- **Roleplay**: o chat com o mestre, quando não está ao lado da página ([2.5](#25-the-first-chat)).
- **Grupo**: sua ficha e a dos seus companheiros. Clique em um número para rolá-lo; passe o mouse sobre ele para ver de onde vem e, quando uma seta marca o dado, o que melhora ou piora a rolagem. Quando o mestre prepara escolhas para você, como ao subir de nível, um aviso na ficha as abre: escolha quando quiser, leia as páginas que as opções indicam, role onde uma opção pedir uma rolagem e depois confirme; a história continua enquanto isso. Ao lado, as rolagens.
- **Cena**: onde você está, a imagem e o mapa do local, quem está presente, o que está acontecendo; em um combate, os turnos e o cartão do seu personagem.
- **Diário**: missões, a história como um livro, a linha do tempo, os diários dos seus companheiros, suas notas.
- **Mundo**: o mapa do mundo, o que seu personagem sabe, os documentos encontrados e o calendário.
- **A bandeja de dados**: escolha os dados e um modificador, e role; ×2 dobra os dados, nunca o modificador, como em um acerto crítico.
- **Jogos salvos**, **Ajuda**, **Configurações** e **Sobre**, como ícones no fim da fileira. As Configurações também reúnem, em **Painel**, as preferências da própria página: modo, som dos dados, conjunto de dados e o **Tema**, que define as cores, as fontes e as imagens da página: o do sistema de jogo, um tema que você adicionou em Packages › Add, a partir do catálogo, de um link do GitHub, de um .zip ou de uma pasta, ou o da própria página. Se a folha de estilo própria de um tema deixar a página difícil de ler, desative **Estilo próprio do tema** ali: as Configurações sempre aparecem sem ele, no endereço da página com `#/settings/page` no final.

Quando o mestre pergunta algo a você, o aviso dele fica no topo, em qualquer seção em que você esteja.

---

## 5. Sistemas de jogo e regras da casa <!-- icon: dice -->

### 5.1 O que é um sistema de jogo

Os dados de um jogo: sua ficha, seus números, suas criaturas, itens, magias e o texto das regras. Cada campanha usa um sistema. O RPG Engine calcula a ficha e o que é gasto e recuperado. Como uma característica funciona, o mestre lê nas regras e decide, como em uma mesa.

### 5.2 Quinta edição

As raças, classes, subclasses, um antecedente e uma façanha do SRD 5.1; as 319 magias, as armas, armaduras, itens mágicos e monstros; os capítulos de regras, que o mestre lê pelo texto exato; a ficha completa, já calculada.

É um pacote à parte: o mestre o oferece quando você configura uma campanha e o instala. Uma campanha que usa esse sistema o instala sozinha na primeira vez que é aberta em um computador que não o tenha, e o mestre avisa você.

Você também pode jogar com conteúdo que o SRD não tem, de um livro que você possui: o mestre o escreve como páginas da sua campanha, e o RPG Engine as trata como suas. O RPG Engine inclui apenas conteúdo aberto. O que o seu mestre conhece não tem esse limite.

Seus próprios manuais podem formar a sua biblioteca. Diga ao mestre onde eles estão, *[Meus manuais estão em D:\Books\5e.]*, ou adicione a pasta deles em Pacotes › Biblioteca, e diga sim, uma única vez, na janela que o computador mostrar. O RPG Engine lê os manuais neste computador. Cada campanha usa as pastas que você ativar ali, e o mestre as consulta quando decide uma regra, depois do SRD, citando o livro e a página. Eles funcionam melhor em texto ou em PDFs cujo texto possa ser selecionado. Um PDF escaneado é lido a partir das imagens das páginas, somente no Windows, em alguns minutos e com alguns erros. O RPG Engine nunca altera seus manuais, nunca envia o texto deles a lugar nenhum e nunca o copia para uma campanha.

### 5.3 Regras da casa e acréscimos seus

Peça ao mestre: *[Regra da casa: um 1 natural em um ataque faz você derrubar a arma.]* O mestre registra isso como um acordo da mesa, ou escreve uma página ou um número da ficha quando for preciso. Regras da casa que já estejam escritas podem ficar como arquivos de texto na pasta `rules` da campanha.

Quando o mestre altera uma página do sistema de jogo para a sua campanha, como os pontos de vida de uma criatura ou o alcance de uma magia, o painel marca a alteração com um pequeno asterisco depois do nome, em todo lugar onde ele aparece. Pacotes › Instaladas lista o que mudou, abaixo do sistema de jogo, ao lado do que o sistema trouxe. Uma criatura que o seu personagem não conhece aparece ali só pelo nome. Ali você pode devolver uma página ao texto original do sistema, depois que a cena em andamento terminar. O painel não consegue desfazer a alteração: só o mestre pode escrever a mudança de novo.

### 5.4 Adicionar ou importar seu próprio sistema de jogo

Um sistema de jogo é um pacote: o mestre instala um a partir do npm, de uma pasta ou de um arquivo. Se o pacote não for nosso, ele só o instala com o seu sim, em um formulário do seu agente ou em uma janela do computador. Criar um sistema é trabalho de quem desenvolve, descrito nos documentos do RPG Engine no GitHub. Transformar um livro seu em sistema de jogo ainda não é possível ([Em breve](#9-coming-later)).

---

## 6. Extensões <!-- icon: plus -->

Uma extensão acrescenta algo a uma campanha, além do sistema de jogo: um recurso como o clima, que muda a cada amanhecer, ou arrombar uma fechadura com dados. Para adicionar uma, vá em Pacotes › Adicionar. Você pode escolher na lista ou informar o nome no npm, uma pasta ou um arquivo. Uma extensão que não é nossa traz código e só entra com o seu sim, em uma janela do seu computador. Uma extensão feita para outro sistema de jogo avisa qual é e não é adicionada. Em Pacotes › Instaladas, você atualiza ou remove uma extensão. O mestre também pode adicionar uma, quando você pedir.

---

## 7. De onde vem uma campanha, e seu idioma <!-- icon: world -->

### 7.1 Três jeitos de ter um mundo

- **Criado na hora**: a partir da sua premissa, o mestre constrói cada local, pessoa e trama logo antes de você precisar deles, e os guarda.
- **Preparado no início**: o mesmo, com o mundo construído antes do jogo.
- **De uma aventura ou livro seu**: dê ao mestre o arquivo, *[Importe esta aventura como nossa campanha: D:\Books\adventure.pdf. Não me conte nada do que está nela.]* Um arquivo fora da campanha só é lido depois que você diz sim em uma janela do seu computador; um que você coloca na pasta **inbox** da campanha é lido na hora. Ele é lido melhor como texto, EPUB, documento do Word ou PDF cujo texto possa ser selecionado; um PDF escaneado é lido a partir das imagens das páginas, só no Windows, devagar e com alguns erros. Seu próprio app de IA o lê fora do chat, ou então o mestre no chat, no seu plano: no Claude Code ou no Codex, um dos dois o lê; no Antigravity, o seu Antigravity; no OpenCode, o modelo que você escolheu por último nele. O documento inteiro vai para a empresa que criou quem o lê, sob os termos da sua conta e a escolha dela sobre treinamento. O painel mostra o andamento; a partir de um romance, o mestre propõe por onde começar. O mestre escreve os locais, os personagens e os segredos.

Uma campanha é jogada uma vez: para jogar a mesma aventura de novo, crie uma campanha nova.

### 7.2 Idiomas

Um idioma por campanha, o do mestre, que o dashboard acompanha. O dashboard já vem com 26 idiomas. Qualquer outro é traduzido no seu computador pelo seu próprio app de IA, fora do chat (o Codex ou o Claude Code; no Antigravity e no OpenCode, o próprio app) ou, onde nenhum puder, pelo mestre no chat. Os termos da quinta edição em italiano vêm do SRD italiano oficial; o texto das regras fica em inglês, e o mestre o conta no seu idioma.

---

## 8. Para os curiosos: a pasta da campanha <!-- icon: list -->

Você nunca precisa abri-la, e ela guarda os segredos da sua campanha. Nela estão `campaign.yaml` (suas configurações), `state.yaml` (como está o jogo), `world/` (uma página em markdown para cada personagem, local, missão e o restante), `rules/` (suas regras da casa), `images/`, `log.jsonl` (cada alteração), `sessions/` (suas conversas com o mestre em texto, do Claude Code e do Codex), `.saves/`, `.player/` (suas notas) e os pequenos arquivos que dizem aos agentes de IA onde o RPG Engine está. As páginas usam o formato do Obsidian. Se você alterar uma página à mão, o mestre fica sabendo na resposta seguinte.

O RPG Engine fica dentro desta pasta: ele lê e grava o jogo somente aqui e nunca toca em seus outros arquivos. As pastas dos seus manuais, ele apenas lê. Fora dela, ele guarda só pastas de dados próprias (as traduções do painel, o texto que ele leu dos seus manuais, e o Codex ou o Claude Code, se você deixar que ele os instale) e pastas temporárias enquanto uma imagem é desenhada. Qualquer outra coisa que o seu agente queira fazer no computador, ele pergunta antes. Um sistema de jogo ou uma extensão é código, como qualquer pacote npm: um que não seja nosso roda no seu computador com as suas permissões, e o RPG Engine só o instala com o seu sim, em um formulário do seu agente ou em uma janela do computador. Diga sim apenas a pacotes cujos autores você conhece e em quem confia.

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

**Preciso saber as regras?** Não. Escolha o mentor tutorial e pergunte com `[OOC: …]` quando quiser.

**O mestre pode trapacear?** Ele não pode mudar uma rolagem feita pelo RPG Engine, exceto na dificuldade história, nem fatos já definidos.

**Custa algo?** O RPG Engine é gratuito. O mestre roda no plano do seu app de IA, ou no seu próprio computador com um modelo local. Uma noite de jogo é um chat longo: nos planos menores, você pode atingir o limite do plano antes de a noite acabar. Imagens, traduções e importações usam o mesmo plano. O próprio RPG Engine nunca usa uma chave de API, que é paga por chamada: entre no seu app de IA com a sua conta, não com uma chave.

**Posso jogar no celular?** Não: o mestre roda no seu computador, e o painel só abre nele.

**Posso jogar com amigos?** Ainda não: hoje é um jogador, um personagem, mais companheiros ([Em breve](#9-coming-later)).

**Posso usar outra IA da próxima vez?** Pode: escolha outro app no chat antes de abri-lo, ou abra a campanha em outro app e escreva *continuar*.

### Problemas

**Uma campanha não abre.** Abra o RPG Engine de novo pelo ícone, ou com `rpg open` em um terminal, e clique na campanha. Se o painel dela disser *Not connected*, clique em **Reabrir a campanha**. Um cartão que diz **Pasta não encontrada** perdeu a pasta: tire-o da lista e adicione-o de novo com **Abrir uma pasta…** onde ela está agora. No chat do próprio app de IA, o painel só funciona enquanto um chat dessa campanha está aberto: pergunte ao mestre `[OOC: Qual é o link do painel?]`. No app do Claude, um chat deixado em segundo plano por um tempo adormece, e a página com ele: clique no chat, e a página volta no mesmo endereço.

**O mestre parece não conhecer o jogo.** Isso acontece no chat do próprio app de IA: ele não carregou o RPG Engine. Confira se você o iniciou na pasta da campanha e se confiou nela. No Claude Code, escreva `/mcp` e reconecte o `rpg`. No Codex, `codex mcp list` na pasta da campanha deve mostrar `rpg`. Se o `rpg --version` não for encontrado, instale o RPG Engine de novo ([2.2](#22-install)).

**O Windows não encontra o `claude`.** Isso acontece quando você instalou o Claude Code por conta própria. O instalador avisa isso em uma nota amarela, com a pasta onde ele foi instalado: adicione essa pasta ao PATH (Propriedades do Sistema > Variáveis de Ambiente) e abra um novo terminal.

**Atualizando.** Quando há um RPG Engine mais novo, o painel avisa: em Packages › Installed, o RPG Engine vem primeiro, com **Atualizar**; depois faça o que a página disser. Ou rode `npm install -g rpg-engine` de novo em um terminal e abra um novo chat: um mestre em andamento mantém a versão com que começou.

**O mestre lembra algo que eu desfiz.** Abra um novo chat e clique em **Abri um novo chat** em Jogos salvos.

**Um app não instala.** A página diz por quê: clique em **Tentar novamente**. Ou instale-o você mesmo pelo site de quem o criou e depois clique em **Verificar novamente**.

**A página de login não abre no navegador.** Enquanto a página espera por você, clique em **Abrir a página de login novamente** onde ela aparece, ou em **Cancelar** e tente mais uma vez.

**O chat do painel diz que outro chat está jogando.** Um chat que você mesmo abriu no seu app de IA está jogando esta campanha: continue lá, ou feche-o para jogar no painel.

**Nenhuma imagem aparece.** Em Configurações > Campaign > Pictures, você vê se este computador consegue gerá-las e como.

**A instalação falha, ou o `rpg` não inicia.** `node --version` deve mostrar 24 ou mais recente. Se o Windows responder que a execução de scripts está desabilitada, veja [2.1](#21-what-you-need). No Windows, mantenha o RPG Engine e suas campanhas fora de caminhos que contenham `&`.

**O link do painel mudou.** No chat do próprio app de IA, cada campanha tem o próprio endereço, o mesmo chat após chat. Ele só muda quando outro programa já o está usando: o mestre dá a você o novo link, e daí em diante ele permanece. Um segundo chat da mesma campanha mantém a página no mesmo endereço e passa a controlá-la quando você fecha o primeiro.
