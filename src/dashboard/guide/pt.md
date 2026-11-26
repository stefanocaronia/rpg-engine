<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: o guia completo

**RPG Engine** permite que você jogue um jogo de RPG de mesa com uma **IA como mestre**. Você joga no **Painel**, uma janela no seu computador com sua ficha, os dados, os mapas, seu diário e o **chat** com o mestre.

Este guia explica como jogar. A própria página explica seus botões: deixe o ponteiro sobre um deles para ver o que ele faz.

## Início rápido <!-- icon: send -->

1. Instale o **Node.js** em [nodejs.org](https://nodejs.org) (a versão LTS).
2. Abra um terminal novo e escreva `npm install -g rpg-engine`. Se o Windows disser que a execução de scripts está desabilitada, escreva `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responda sim e tente de novo.
3. Escreva `rpg open` e aperte Enter quando ele oferecer o ícone na sua área de trabalho ([2.2](#22-installing)). Daí em diante, você inicia o RPG Engine pelo ícone.
4. Clique em **Nova campanha**, dê um nome a ela e clique em **Criar** ([2.3](#23-a-new-campaign)).
5. No chat, escolha seu app de IA e o modelo dele ([2.4](#24-connect-your-ai)): o Claude Code exige um plano pago do Claude; o Codex, uma conta do ChatGPT, gratuita ou paga. Clique em **Abrir o chat** e depois em **Começar**.

A primeira resposta pode levar alguns minutos. Depois, o mestre pergunta como você quer jogar, e vocês criam seu personagem juntos.

## 1. O que é o RPG Engine <!-- icon: about -->

| Quem | O que faz |
|---|---|
| **Você** | Interpreta seu personagem: o que ele faz, diz e tenta. |
| **O mestre** (a IA) | Conta a história, interpreta todas as outras pessoas, decide o que acontece e pede rolagens. |
| **RPG Engine** | Guarda o mundo em arquivos, rola os dados, conta pontos de vida, dinheiro, tempo e distâncias, e mantém os segredos até você descobri-los. |

Assim, o mundo continua o mesmo de uma noite para a outra, mesmo em um novo chat, mesmo com outra IA:

- **O que foi dito continua valendo.** Um vilão morto continua morto.
- **Os dados são de verdade.** O mestre não pode alterá-los, exceto na dificuldade mais fácil.
- **Segredos continuam secretos.** O mestre nunca conta o que seu personagem não sabe.
- **O mundo se move.** As ameaças avançam enquanto você descansa ou viaja.
- **Uma campanha é uma pasta** no seu computador: pare quando quiser e continue depois.

Um jogo vem como um sistema de jogo: hoje o nosso é a **quinta edição**, do System Reference Document 5.1, gratuito. Sem um sistema, você joga de forma livre, uma história sem números.

---

## 2. Primeiros passos <!-- icon: path -->

### 2.1 O que você precisa

- Um computador com Windows, macOS ou Linux.
- **Node.js 24** ou mais recente, de [nodejs.org](https://nodejs.org).
- Um **terminal**, só para instalar: no Windows, Terminal ou PowerShell; no macOS, Terminal.
- Um **app de IA** para o mestre, com sua própria conta ([2.4](#24-connect-your-ai)).

### 2.2 Instalação

```text
npm install -g rpg-engine
rpg open
```

A primeira linha instala o RPG Engine. Se o npm se oferecer para se atualizar, você pode ignorar.

O `rpg open` abre a janela do RPG Engine. Na primeira vez, ele oferece um ícone na sua área de trabalho e no seu menu: aperte Enter para sim e, daí em diante, você inicia pelo ícone.

Se a instalação falhar, confira se `node --version` mostra 24 ou mais. Se o Windows disser que a execução de scripts está desabilitada, escreva `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e responda sim. No Windows, mantenha o RPG Engine e suas campanhas fora de caminhos que contenham `&`.

### 2.3 Uma nova campanha

Clique em **Nova campanha** e informe o **Nome**, o **Idioma** e o **Sistema de jogo**. O mestre faz o resto com você. Clique em **Criar**: a campanha abre em uma janela própria.

O mestre e o Painel falam o idioma da campanha. O texto das regras da quinta edição continua em inglês, e o mestre o conta no seu idioma.

A campanha é uma pasta com o nome dela, dentro da pasta `RPG Engine` da sua pasta de usuário. Da próxima vez, clique no cartão dela.

### 2.4 Conectar sua IA

O mestre roda em um **app de IA** no seu computador, com sua conta. Um chat da web, como o claude.ai ou o ChatGPT, não basta: o mestre precisa acessar os arquivos da campanha.

- **Claude Code**: um plano pago do Claude (Pro ou superior).
- **Codex**: uma conta do ChatGPT, gratuita ou paga.
- **OpenCode**: sem conta; alguns modelos gratuitos por tempo limitado, ou os do seu próprio provedor, inclusive locais.
- **Antigravity**: uma conta Google; o uso gratuito tem limites semanais.

No chat, escolha o app, o **Modelo** e o **Raciocínio do mestre**. Se o app não estiver instalado ou você não tiver entrado na conta, um botão o instala, faz o login ou abre o site dele. O RPG Engine nunca vê sua senha.

Uma noite de jogo é um chat longo: nos planos menores, você pode chegar ao limite antes de a noite acabar. Jogue com o maior modelo que você tiver: é mais fácil convencer um modelo pequeno a revelar segredos.

Nós jogamos e testamos o RPG Engine mais com o **Claude Code**. O Antigravity está **em teste**: ele pode sair do jogo e guarda seus chats em uma memória que não pode ser desligada. O que você escreve ali vai para o Google, que pode pedir a pessoas que leiam. O RPG Engine não é um produto do Google.

### 2.5 O primeiro chat

Clique em **Abrir o chat** e depois em **Começar**. A primeira resposta pode levar alguns minutos. Depois, uma campanha nova passa por três etapas:

1. **Configurações**: o mestre pergunta como você quer jogar, algumas perguntas por vez: quão difícil é o mundo, se você pode morrer, quando pode voltar a um jogo salvo. Escreva *Você decide* para deixar que ele escolha. Tudo pode mudar depois.
2. **Sessão zero**: você cria seu personagem com o mestre, como em uma mesa. O RPG Engine faz as contas da ficha. Se você já tem um personagem, cole a ficha dele no chat.
3. **Jogar**: o mestre monta a primeira cena.

### 2.6 Jogando no seu app de IA

Você também pode jogar no chat do próprio app de IA, em um terminal ou no app de desktop, com o Painel ao lado.

1. Abra um terminal na pasta onde você guarda seus jogos: clique com o botão direito na pasta e escolha **Abrir no Terminal** (Windows) ou **Serviços > Novo Terminal na Pasta** (macOS).
2. Escreva `rpg init "The Salt Isles"`: ele cria a pasta `The Salt Isles` com uma campanha nova dentro.
3. Inicie seu app nessa pasta: `claude`, `codex`, `agy` para o Antigravity, ou `opencode`. Diga sim quando ele perguntar se você confia na pasta: no Claude Code, a resposta já selecionada é *No, exit*.
4. Escreva *Oi! Vamos começar.* O mestre dá a você o link do seu Painel: abra-o ao lado do chat.

Bom saber:

- Não abra os detalhes das ferramentas que seu app usa (no Claude Code, ctrl+o): eles podem mostrar segredos.
- No app de desktop do Codex, desligue as memórias para os chats do jogo.
- Se o mestre não conhecer o jogo, escreva `rpg init` na pasta da campanha e abra um novo chat.
- Se o Windows não encontrar o `claude`, adicione ao PATH a pasta que o instalador indicou e depois abra um novo terminal.
- Um chat por vez joga uma campanha: enquanto o seu estiver aberto, o chat do Painel espera.

---

## 3. Jogando <!-- icon: chat -->

### 3.1 Conversando com o mestre

Escreva o que seu personagem faz ou diz:

> Pergunto ao estalajadeiro quem mais passou por aqui esta noite.

Você diz o que tenta; o mestre diz o que acontece. O mestre nunca decide pelo seu personagem.

Para falar fora da história, escreva `[OOC: …]` (out of character, ou "fora do personagem"): *[OOC: Como funciona a agarrada?]* Você pode perguntar ao mestre sobre as regras ou sobre como o Painel funciona.

Quando o mestre perguntar algo a você, responda com os botões dele ou com suas próprias palavras. Você também pode agir pela ficha: clique em uma arma, uma magia ou um item e escolha o que fazer.

**Ordens permanentes**: diga aos seus companheiros algo que deva durar, como *De agora em diante, deixem sempre um vivo*. O mestre mantém essa ordem até você cancelá-la.

### 3.2 Rolagens

O mestre só pede uma rolagem quando o resultado é incerto e importa. Um aviso mostra a rolagem: clique nele e os dados caem.

Os dados são do RPG Engine, não do mestre. Você sempre pode perguntar *[Essa rolagem foi de verdade?]*: mesmo no caso de uma rolagem secreta, o mestre pode provar que ela foi feita antes de você perguntar.

Com a configuração **Dados** em físicos, role seus próprios dados e escreva o resultado: *[Tirei 14.]* As rolagens que você faz por diversão, pela ficha ou com a **Rolagem livre**, nunca contam.

### 3.3 Cenas, combates e viagens

A história se desenrola em **cenas**: um combate, uma conversa, uma viagem, um descanso. No fim de cada cena, o jogo é salvo automaticamente e a cena entra no seu diário.

Em um combate, o mestre joga todos os turnos que não são seus e para quando você precisa decidir.

Diga para onde vai, *Pegamos a estrada ao norte, rumo a Rocca*: o RPG Engine calcula a distância e os dias, e para se algo acontecer no caminho. Enquanto isso, os planos dos vilões continuam, e você vê os sinais deles.

### 3.4 Jogos salvos

O RPG Engine salva a campanha no fim de cada cena. A configuração **Jogos salvos** decide quando você pode voltar atrás:

- **Morte permanente**: nunca.
- **Checkpoint**: ao último jogo salvo, só quando seu personagem morre.
- **Livre**: a qualquer jogo salvo, e você pode salvar quando quiser.

Em todos os modos você pode recomeçar, no chat ou em **Jogos salvos**.

Depois de voltar atrás, abra um novo chat, porque o antigo se lembra do que foi desfeito:

1. Clique em **Fechar o chat** e depois em **Novo chat**. No chat do próprio app de IA, abra uma nova conversa (`/clear` no Claude Code).
2. Escreva *Continuar*.
3. Clique em **Abri um novo chat** em Jogos salvos. Até lá, o mestre espera.

### 3.5 Parar e retomar

Pare quando quiser: tudo já está salvo. Feche a janela do Painel e, pouco depois, o jogo para. Nada se perde.

Para voltar, abra o RPG Engine pelo ícone e clique na sua campanha. Clique em **Retomar o chat** e depois em **Retomar a história**: o mestre diz onde você estava e segue em frente. Da próxima vez, você também pode escolher outro app de IA.

### 3.6 Limites e parar

As **Linhas** nunca aparecem no jogo; os **Véus** acontecem apenas fora de cena. Você os define em **Configurações**.

A qualquer momento, escreva *[parar]*: o mestre abandona esse conteúdo e o acrescenta às suas linhas.

### 3.7 Imagens

O mestre pode pedir imagens de locais, missões e pessoas, conforme a configuração **Imagens**, e um retrato do seu personagem quando você pedir. Seu app de IA as faz, no seu plano. Se nenhuma aparecer, **Configurações** diz se este computador pode gerá-las.

Você também pode dar ao seu personagem, ou a uma página do mundo, uma imagem sua, pela própria página.

---

## 4. O painel <!-- icon: party -->

A janela onde você vê seu jogo. Ela mostra apenas o que seu personagem sabe.

- **Roleplay**: o chat com o mestre, quando não está ao lado da página.
- **Grupo**: sua ficha, a dos seus companheiros e as rolagens.
- **Cena**: onde você está, quem está presente e o mapa; em um combate, os turnos.
- **Diário**: missões, a história como um livro, os diários dos seus companheiros e suas notas.
- **Mundo**: o mapa do mundo, o que seu personagem sabe, os documentos encontrados e o calendário.
- **Jogos salvos**: voltar atrás e recomeçar.
- **Configurações**: como você joga e como a página se parece.
- **Pacotes**: o sistema de jogo, as extensões, seus manuais e as atualizações: quando sai um RPG Engine novo, ele avisa aqui.

Se a página disser que não está conectada, clique em **Reabrir a campanha**.

Para jogar pelo celular, em casa: em **Configurações**, **Painel**, ative **Acesso pelo celular** e enquadre o código com o celular, na mesma rede Wi-Fi do computador. O Windows pode perguntar se o Node.js pode usar a rede: permita em redes privadas e defina o Wi-Fi como rede privada. O jogo trafega sem criptografia: use-o apenas em uma rede de confiança, como a da sua casa; nunca em um Wi-Fi público, de hotel ou de escritório. Desative quando terminar: o jogo termina com a última janela do computador.

Se um tema deixar a página difícil de ler, acrescente `#/settings/page` ao fim do endereço dela e desative **Estilo próprio do tema**.

---

## 5. Regras, manuais e extensões <!-- icon: dice -->

Um **Sistema de jogo** é o conjunto de dados de um jogo: a ficha, as criaturas, os itens, as magias e as regras. O RPG Engine calcula a ficha. Como uma regra se aplica, o mestre lê e decide, como numa mesa de jogo.

A **Quinta edição** traz as regras gratuitas do System Reference Document 5.1. Você também pode jogar com o conteúdo de um livro que você tem: o mestre o escreve na sua campanha.

**Seus manuais**: diga ao mestre onde eles estão, ou adicione a pasta deles em **Pacotes**. O mestre consulta as regras neles e cita o livro e a página. O RPG Engine nunca altera os manuais e nunca os copia para uma campanha.

**Regras da casa**: peça ao mestre, *[Regra da casa: um 1 natural em um ataque faz você largar a arma.]* Ele guarda a regra. Uma decisão que o mestre toma uma vez vale também nas próximas vezes.

As **Extensões** acrescentam algo ao jogo, como o clima. Adicione-as em **Pacotes** ou peça ao mestre.

---

## 6. Sua própria aventura <!-- icon: world -->

Sem um mundo escrito, o mestre cria um a partir da sua premissa e o mantém.

Para jogar uma aventura ou um livro que você tem, entregue o arquivo ao mestre: *[Importe esta aventura como nossa campanha: D:\Books\adventure.pdf. Não me conte nada do que está nela.]* Um arquivo fora da campanha só é lido depois do seu sim. Ele é lido melhor como texto, EPUB, Word ou PDF cujo texto possa ser selecionado.

O documento inteiro vai para a empresa da IA que o lê. Uma campanha é jogada uma única vez: para jogar a mesma aventura de novo, crie uma nova campanha.

---

## 7. Seus dados <!-- icon: lock -->

- Uma campanha é uma pasta. Ela guarda os segredos da campanha e também as suas conversas com o mestre: você nunca precisa abri-la.
- O RPG Engine lê e escreve apenas nessa pasta. Seus manuais ele só lê. Qualquer outra coisa fora da campanha, só depois do seu sim, em uma janela do seu computador.
- No chat do dashboard, o mestre não abre nenhum dos seus arquivos por conta própria.
- O que você escreve vai para a empresa cujo modelo faz o papel de mestre, sob os termos da sua conta. Com um modelo local, fica no seu computador.
- Um Sistema de jogo ou uma extensão que não seja nossa é código que roda no seu computador: só chega com o seu sim. Diga sim apenas a autores em quem você confia.
- Se a pasta da campanha for um repositório git, as **Configurações** podem fazer o commit por você. Permita a entrada das suas conversas só se o repositório for privado.
- Com o **Acesso pelo celular** ligado, o jogo vai sem criptografia do computador para o celular pela sua rede doméstica, sem passar por nenhum serviço externo: quem estiver nessa rede poderia lê-lo.
