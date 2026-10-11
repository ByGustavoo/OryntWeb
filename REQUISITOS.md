# Requisitos do Orynt

Decisões da descoberta de produto (10 de outubro de 2026). Elas são requisitos: não mudam nas fases
seguintes sem nova aprovação. O produto nasceu como QueryLens e foi renomeado para Orynt no mesmo dia,
por decisão do usuário.

## Produto

Aplicação web para monitorar, analisar e administrar bancos PostgreSQL. Responde a três perguntas de
quem desenvolve ou administra um banco: "o banco está saudável agora?", "quais consultas pesam mais?"
e "onde está o gargalo?". A interface transmite precisão e clareza: densa onde há dado técnico,
silenciosa no resto.

* **Nome:** Orynt. Evoca orientação e direção: uma ferramenta que guia quem desenvolve até a origem de um problema.
* **Conceito:** encontrar o caminho para a causa.
* **Slogan:** **Toda lentidão tem uma origem.**
* **Marca:** plana, sem volume nem degradê: um gráfico de rosca, que é o "O" do nome, com uma fatia azul puxada para fora do anel, a origem da lentidão isolada. O anel usa a cor do texto e a fatia, o azul de destaque (escolhida pelo usuário em 11 de outubro de 2026, entre doze opções).

## Decisões

| # | Tema | Decisão |
|---|---|---|
| Q1 | Conexão com a API | `POST /conexoes` recebe as credenciais uma vez, salva a conexão na conta e a ativa na sessão; as demais rotas usam essa sessão. A senha passa pelo front uma única vez e não é guardada no navegador: quem a guarda, cifrada, é a API (revisto em 11 de outubro de 2026, ver "Conexões salvas"). |
| Q2 | Sessão ao recarregar | A sessão fica num cookie `HttpOnly; Secure; SameSite=Strict` criado pela API, que nenhum script lê. O front não guarda nada da sessão: ao abrir, pergunta `GET /conexoes/atual` e `GET /conexoes`. Enquanto não há API, o simulador faz o papel do servidor com um cookie de sessão comum, sem senha (um script não consegue criar cookie `HttpOnly`), e guarda a lista de conexões salvas no `localStorage`, também sem senha. |
| Q3 | Quem classifica o desempenho | A API devolve `desempenho` (`RAPIDA`, `MODERADA`, `LENTA`) e o front só apresenta. O indicador "Consultas lentas" e a tabela saem da mesma classificação. |
| Q4 | Testar sucesso e falha | Painel "Cenário da simulação" no modal de conexão, só em desenvolvimento, e os controles `oryntSimulacao` no console. O cenário vale também para a ativação de uma conexão salva. |
| Q5 | Botão Cancelar | Durante uma tentativa, interrompe. Fora dela, fecha o modal. "Limpar campos" deixou de existir. |
| Q6 | Tema | Escuro na primeira visita, com alternância para claro e automático. |
| S1 | URL de conexão | Colar `postgresql://usuario:senha@host:porta/banco` preenche os campos. A URL é descartada depois de lida. Aprovada. |
| S2 | Modo SSL | Fica para depois: um bloco "Opções avançadas" com `sslmode`. Não entrou nesta fase. |
| S3 | Conexões recentes | Substituídas pelas conexões salvas na conta em 11 de outubro de 2026. A chave `orynt:conexoes-recentes` deixou de ser usada. |
| S4 | Testar conexão | Botão separado de "Conectar", que valida os dados sem abrir a sessão. Aprovada. |

## Decisões tomadas por boa prática

* **Projeto:** `OryntWeb`, com repositório próprio, porta 5176 e prefixo de armazenamento `orynt:`.
* **Stack e arquitetura:** as mesmas do OrbitWeb; DTOs, tipos e arquivos em português.
* **Conexão:** modal aberto sobre a aplicação. A página `/conexao` foi removida em 11 de outubro de 2026 (ver "Conexões salvas").
* **Navegação:** menu lateral recolhível no desktop e gaveta abaixo de 1100px.
* **Tipo de banco:** aparece como campo já resolvido (PostgreSQL), não como lista de uma opção.
* **Rótulos:** capitalização de frase ("Usuários e permissões", "Objetos do banco"), como nos outros projetos.
* **Telas planejadas:** agrupadas no menu sob "Em breve". Mostram o que está previsto e não simulam nada.
* **Demonstração:** selo "Demonstração" no cabeçalho enquanto há uma conexão simulada ativa e aviso "Dados demonstrativos" no dashboard. Sem conexão, o cabeçalho não mostra o selo (pedido do usuário em 11 de outubro de 2026).
* **Dashboard:** períodos de 1 h, 24 h, 7 dias e 30 dias; a tabela vira cartões em telas estreitas.
* **Versões:** seção em Configurações, abaixo de "Aparência", com um cartão para o Orynt Web e outro para a Orynt API, cada um com a versão e a data de lançamento (pedido do usuário em 11 de outubro de 2026). A versão do front vem de `window.__ORYNT_CONFIG__.versao` e, na falta dela, do `version` do `package.json`; a data de lançamento vem só de `window.__ORYNT_CONFIG__.dataLancamento`. A da API vem de `GET /sistema/versao`. Com dados simulados, o cartão da API mostra "Simulada" e diz que nenhuma API está em uso.

## Acesso (login)

Pedido pelo usuário em 10 de outubro de 2026, depois da descoberta inicial. O login passa a ser a porta
de entrada e a paleta do produto muda.

| Tema | Decisão |
|---|---|
| Rota inicial | `/login` é a primeira tela. Sem login, qualquer outra rota leva a ela. |
| Depois do login | O usuário vai direto para `/dashboard`, com ou sem conexão. Quem já está logado e abre `/login` também vai para lá. |
| Autenticação | Fictícia nesta fase: um e-mail e uma senha de teste definidos no projeto, conferidos pelo simulador. Sem cadastro, sem recuperação de senha e sem API. Não é apresentada como segura. |
| Credenciais de teste | `demo@orynt.local` e `orynt-demo`, em `src/dados/simulacao/credenciaisDemonstracao.ts`, no README e na própria tela de login. |
| Campos | E-mail e senha, ambos obrigatórios. A senha tem mostrar e ocultar. |
| Validação | Campo vazio só é cobrado no envio; formato do e-mail, ao sair do campo; depois de um erro, a cada tecla. No envio, o foco vai ao primeiro campo com problema. |
| Credenciais incorretas | Mensagem única, que não diz qual dos dois campos errou. O e-mail fica preenchido e a senha fica selecionada para ser redigitada. |
| Carregamento | O botão mostra "Entrando…" e ignora novos envios enquanto a verificação corre. |
| Esqueceu sua senha? | Só informa que a recuperação estará disponível em uma próxima versão. |
| Senha do login | Mesma regra da senha do banco: nunca vai para `localStorage`, `sessionStorage`, cookie, URL ou console. |
| Sessão | Como em Q2: cookie `HttpOnly` criado pela API no login. Enquanto não há API, o simulador guarda só o usuário (sem senha) num cookie de sessão comum. |
| Painel da tela de login | Formulário à esquerda e painel animado à direita, com métrica, rota e consulta de origem numa cena com dados fictícios. Respeita a preferência de movimento reduzido. Em telas estreitas o formulário vem primeiro. |
| Tema | Alternância entre escuro e claro na tela de login, com a escolha lembrada no navegador. O modo automático continua nas configurações (Q6). |
| Paleta | Escuro: fundo `#0A0A0A`, superfícies `#111111` e `#171717`, texto branco. Claro: fundo branco levemente acinzentado, superfícies brancas, texto escuro. Azul como cor de destaque nos dois temas, no lugar do ciano. Vale para o produto inteiro. |

Ficaram de fora: cadastro de usuários, recuperação de senha real e autenticação real. O botão "Sair"
entrou em 11 de outubro de 2026 (S1 de "Conexões salvas").

## Regras da conexão

* **Campos:** nome (opcional, até 60 caracteres), host, porta (1 a 65535, começa em 5432), banco, usuário e senha. Banco e usuário têm até 63 caracteres, o limite de um identificador do PostgreSQL.
* **Host:** domínio, `localhost`, IPv4 ou IPv6; sem protocolo, sem espaço e sem caminho.
* **Validação:** ao sair do campo; depois que um campo acusa erro, a cada tecla. No envio, o foco vai ao primeiro campo com problema.
* **Nome ausente:** a conexão recebe "`banco` em `host`".
* **Senha:** nunca vai para `localStorage`, `sessionStorage`, cookie, URL ou console. Sai da memória do formulário assim que a conexão é aceita.
* **Falha:** o alerta diz o que houve, por que e o que fazer, marca os campos envolvidos e oferece "Tentar novamente". O que foi digitado continua no formulário.
* **Sucesso:** o modal fecha, o dashboard carrega e uma notificação confirma "Conectado a `nome`", dizendo que a conexão é simulada quando for o caso.

## Conexões salvas

Pedido pelo usuário em 11 de outubro de 2026: a tela `/conexao` sai, o login leva direto ao dashboard, e
o dashboard carrega a conexão salva ou abre um modal para cadastrar uma. No mesmo dia o usuário pediu
que o modal deixasse de abrir sozinho: sem conexão salva, o dashboard espera o clique em "Conectar ao banco".

| # | Tema | Decisão |
|---|---|---|
| Q1 | O que é "conexão salva" | Conexões guardadas na conta, no servidor, com a senha cifrada do lado da API. O front nunca recebe a senha de volta. |
| Q2 | Quantas por conta | Várias. A usada por último carrega sozinha ao entrar, e a troca é feita pelo cabeçalho. |
| Q3 | Fechar o modal sem conectar | Permitido. O dashboard mostra "Nenhum banco conectado" com o botão "Conectar ao banco". O cabeçalho não repete esse estado: sem conexão ativa e sem conexão salva, o indicador de conexão some; havendo conexões salvas, ele mostra "Sem conexão" e serve para escolher uma (pedido do usuário em 11 de outubro de 2026). |
| Q4 | Depois de conectar | O modal fecha e o dashboard carrega, com a notificação "Conectado a `nome`". A etapa "Conexão estabelecida" deixou de existir. |
| Q5 | Conteúdo do modal | Tudo o que a página tinha: colar URL, os seis campos, "Testar conexão" e o alerta de falha. |
| S1 | Botão "Sair" | No rodapé do menu lateral. Encerra o login e a conexão ativa; as conexões salvas continuam na conta. Aprovada. |
| S2 | Falha ao verificar | Um erro em `GET /conexoes/atual` ou `GET /conexoes` que não seja "sem conexão" mostra "Não foi possível verificar a conexão" com "Tentar novamente", e não abre o modal. Aprovada. |
| S3 | Gerenciar conexões | Seção "Conexões salvas" em Configurações: conectar, renomear e excluir. Aprovada. |

Regras:

* **Ao entrar no dashboard:** se a sessão já tem conexão ativa, ela é usada. Se não tem e há conexões salvas, a usada por último é ativada sozinha. Se não há nenhuma, o dashboard mostra "Nenhum banco conectado" com o botão "Conectar ao banco".
* **Abertura do modal:** nunca abre sozinho. Abre só por ação do usuário: "Conectar ao banco" no dashboard, "Nova conexão" no cabeçalho e nas conexões salvas. Configurações e as telas "Em breve" abrem normalmente sem conexão.
* **Falha ao reativar:** o dashboard diz qual conexão falhou, por que e o que fazer, com "Tentar novamente", a lista das conexões salvas e "Nova conexão".
* **Trocar de conexão:** uma falha na troca não derruba a conexão que estava em uso.
* **Mesmo banco:** conectar de novo ao mesmo host, porta, banco e usuário atualiza a conexão salva, em vez de criar outra.
* **Desconectar:** encerra a conexão da sessão e leva ao dashboard sem conexão. A conexão continua salva; ao recarregar a página ou entrar de novo, a usada por último volta a ser ativada.
* **Excluir:** pede confirmação. Excluir a conexão em uso deixa a aplicação sem conexão.
* **Renomear:** nome obrigatório, até 60 caracteres.
* **Fechar o modal:** os campos digitados ficam para a próxima abertura, menos a senha, que é descartada. Durante uma tentativa, só "Cancelar" interrompe.
* **Simulação:** a lista fica no `localStorage` em `orynt:simulacao:conexoes-salvas`, sem senha, e a tela de Configurações diz isso.

## Fora desta fase

Backend, coleta de métricas reais, telas completas de Consultas SQL, Usuários e permissões, Objetos do
banco e Relatórios, modo SSL, Docker, CI e vídeo de apresentação.
