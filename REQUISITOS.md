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
* **Navegação em grupos e subgrupos:** pedido do usuário em 11 de outubro de 2026, no modelo do PrismaWeb. O menu tem o Dashboard, o grupo "Análise" (Relatórios e Consultas SQL) e o grupo "Gerenciamento" (Objetos do banco e Usuários e permissões); Configurações segue no rodapé. Cada item de grupo abre as suas telas: Relatórios (Resumo, Exportação, Comparação), Consultas SQL (Todas, Histórico, Planos de execução), Objetos do banco (Visões, Índices, Tabelas, Funções) e Usuários e permissões (Papéis, Sessões, Permissões). Os nomes dos grupos e das telas foram escolhidos por boa prática, a partir do que já estava previsto para cada funcionalidade.
* **Telas planejadas:** o grupo em que nada está pronto leva o selo "Em breve" ao lado do título (antes havia um único grupo chamado "Em breve"). Num grupo que já tem tela pronta, a marca "Em breve" desce para o item em que nada está pronto (Consultas SQL) e para cada tela planejada de um item que já tem tela pronta (nenhuma hoje: as três telas de Relatórios estão prontas). Cada tela planejada tem a própria rota, mostra o que está previsto para a funcionalidade, com a tela aberta em evidência, e não simula nada.
* **Demonstração:** selo "Demonstração" no menu da conta enquanto há uma conexão simulada ativa e aviso "Dados demonstrativos" no dashboard. Sem conexão, o selo não aparece. O selo saiu do cabeçalho a pedido do usuário em 11 de outubro de 2026.
* **Dashboard:** períodos de 1 h, 24 h, 7 dias e 30 dias; a tabela vira cartões em telas estreitas.
* **Consulta inteira e cópia:** pedido do usuário em 12 de outubro de 2026. Na tabela das consultas que mais pesam, do Dashboard e do Resumo, a consulta que não cabe em duas linhas (três nos cartões) é cortada com reticências e ganha um botão que a mostra inteira na própria linha; clicar no texto cortado também a abre. Toda linha tem um botão que copia o SQL completo, que aparece ao passar o mouse ou focar a linha e fica sempre visível em telas de toque. O texto copiado é só o SQL, sem aviso de demonstração, para poder ser colado e executado. A tabela de Comparação ainda não tem os dois botões.
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
| Paleta | Escuro: fundo `#0A0A0A`, superfícies `#111111` e `#171717`, texto branco. Claro: fundo branco levemente acinzentado, superfícies brancas, texto escuro. Azul como cor de destaque nos dois temas, no lugar do ciano. Vale para o produto inteiro. No tema escuro, o card de notificação usa `#1B1B1B` com borda `#272727`, para se destacar do fundo como no OrbitWeb (pedido do usuário em 11 de outubro de 2026). |

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
| Q2 | Quantas por conta | Várias. A usada por último carrega sozinha ao entrar, e a troca é feita pelo menu da conta, no cabeçalho. |
| Q3 | Fechar o modal sem conectar | Permitido. O dashboard mostra "Nenhum banco conectado" com o botão "Conectar ao banco". O cabeçalho não mostra a conexão: nome, tipo, estado e troca ficam no menu da conta, que sem conexão ativa diz "Nenhum banco conectado" e lista as conexões salvas para escolher uma (pedido do usuário em 11 de outubro de 2026, quando o indicador de conexão saiu da barra superior). |
| Q4 | Depois de conectar | O modal fecha e o dashboard carrega, com a notificação "Conectado a `nome`". A etapa "Conexão estabelecida" deixou de existir. |
| Q5 | Conteúdo do modal | Tudo o que a página tinha: colar URL, os seis campos, "Testar conexão" e o alerta de falha. |
| S1 | Botão "Sair" | No menu da conta: um círculo com a primeira letra do usuário, no canto superior direito do cabeçalho, ao lado do botão de tema. O menu mostra a conta, a conexão em uso (nome, tipo, servidor, banco, usuário e o selo de estado), as outras conexões salvas para trocar, "Gerenciar conexões" e "Sair". Saiu do rodapé do menu lateral a pedido do usuário em 11 de outubro de 2026. O círculo aparece com ou sem banco conectado, para que "Sair" continue ao alcance; sem conexão, o menu diz "Nenhum banco conectado". Encerra o login e a conexão ativa; as conexões salvas continuam na conta. Aprovada. |
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

## Relatórios: Resumo

Pedido pelo usuário em 11 de outubro de 2026: a tela "Resumo" de Relatórios deixa de ser planejada. O
Dashboard responde "como o banco está agora?"; o Resumo responde "como foi o período?".

| # | Tema | Decisão |
|---|---|---|
| Q1 | Modelo de período | Períodos fechados de calendário: dia, semana (de segunda a domingo) ou mês, com setas para o anterior e o seguinte. |
| Q2 | Período em andamento | Fica de fora. Hoje, esta semana e este mês não têm relatório; o "agora" é do Dashboard. |
| Q3 | Conteúdo | Seis blocos: período, destaques em frases, quatro indicadores com a variação contra o período anterior, evolução do volume e do tempo médio com o pico marcado, divisão das execuções e do tempo por faixa de desempenho e as consultas que mais pesaram, com a variação do tempo médio de cada uma. |
| Q4 | Período na URL | O endereço é sempre `/relatorios/resumo`, sem parâmetros (o usuário pediu a URL limpa). O período aberto fica no histórico do navegador: recarregar a página o mantém; abrir o endereço de novo começa no período mais recente. |
| S1 | Imprimir | Botão "Imprimir", que abre a impressão do navegador. A folha sai sem menu, cabeçalho e controles, em tema claro, com a conexão e o momento em que foi gerada. Aprovada. |
| S2 | Atalho no Dashboard | Link no painel "Atividade das consultas" para o resumo de ontem (períodos de 1 h e 24 h), da semana passada (7 dias) ou do mês passado (30 dias). Aprovada. |
| S3 | Copiar destaques | Botão "Copiar" no bloco de destaques, que leva as frases como texto, com o nome da conexão e o período. Aprovada. |

Regras:

* **Período inicial:** a última semana fechada.
* **Histórico:** dá para voltar até o primeiro período inteiro dos últimos 12 meses. A seta do período seguinte fica desabilitada no último período fechado, e "Mais recente" volta a ele.
* **Trocar o tamanho do período:** a tela vai para o dia, a semana ou o mês que contém o último dia do período aberto, sem nunca cair num período em andamento.
* **Comparação:** toda variação é contra o período de mesmo tamanho imediatamente anterior, que a tela nomeia ("Comparado com…").
* **Destaques:** as frases são montadas pelo front a partir dos números do relatório. A queda do tempo médio é marcada como boa e a alta como ponto de atenção; o volume não tem juízo de valor.
* **Desempenho:** a API classifica as consultas, como no Dashboard (Q3 de "Decisões"); o front só apresenta as faixas.
* **Sem conexão:** a tela mostra o mesmo painel do Dashboard.
* **Demonstração:** o aviso "Dados demonstrativos" aparece na tela e na folha impressa, e o texto copiado termina com "(dados demonstrativos)".

## Relatórios: Exportação

Pedido pelo usuário em 11 de outubro de 2026: a tela "Exportação" de Relatórios deixa de ser planejada.
Ela entrega como arquivo o mesmo relatório que o Resumo mostra na tela.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Quem gera o arquivo | O front, a partir do mesmo `GET /relatorios/resumo`. Não há rota de exportação na API, e o arquivo nunca diverge do que o Resumo mostra. |
| Q2 | Período | Um período fechado por vez, com a mesma barra do Resumo. |
| Q3 | Formatos | CSV e JSON, sem dependência nova. PDF continua sendo o "Imprimir" do Resumo. Markdown entrou pela S3. |
| Q4 | CSV com mais de um bloco | Um arquivo por bloco marcado, para cada um abrir como tabela na planilha. |
| Q5 | Números no CSV | Padrão brasileiro por omissão (`;` entre as colunas e vírgula decimal), com opção de trocar para o internacional (`,` e ponto). |
| S1 | Botão "Exportar" no Resumo | Ao lado de "Imprimir", abre a Exportação no período que estava na tela. Aprovada. |
| S2 | Copiar como tabela | Cada bloco tem um botão que o copia com as colunas separadas por tabulação, para colar numa planilha. Aprovada. |
| S3 | Formato Markdown | Um documento com título e uma tabela por bloco. Aprovada. |

Regras:

* **Blocos:** evolução, consultas, desempenho e indicadores, todos marcados ao abrir. Sem nenhum marcado, o botão de baixar fica desabilitado e a tela diz por quê.
* **Arquivos:** CSV gera um arquivo por bloco; JSON e Markdown geram um arquivo só, com os blocos marcados na ordem do relatório.
* **Nome do arquivo:** `orynt-resumo-<dia|semana|mes>-<primeiro dia>`, mais o bloco no CSV, mais `-demonstracao` quando os dados são fictícios.
* **CSV:** UTF-8 com marca de ordem de bytes, linhas em CRLF, datas em `AAAA-MM-DD` e números sem separador de milhar. O texto que uma planilha leria como fórmula (começando por `=`, `+`, `-` ou `@`) sai com um apóstrofo na frente.
* **JSON:** os mesmos nomes de campo do contrato da API, mais a conexão, o período, o momento em que foi gerado e `dadosDemonstrativos`.
* **Markdown:** números no formato brasileiro, para leitura; o padrão dos números vale para o CSV e para a tabela copiada.
* **Demonstração:** além do nome do arquivo, o aviso vai dentro do conteúdo: uma coluna "Origem dos dados" em cada linha do CSV e da tabela copiada, os campos `dadosDemonstrativos` e `aviso` no JSON e uma citação no topo do Markdown.
* **Prévia:** a tela mostra as primeiras linhas, o nome, o tamanho e a quantidade de linhas de cada arquivo antes de baixar.
* **Histórico:** a tela não guarda o que foi baixado.
* **URL:** sempre `/relatorios/exportacao`, com o período no histórico do navegador, como no Resumo.

## Relatórios: Comparação

Pedido pelo usuário em 11 de outubro de 2026: a tela "Comparação" de Relatórios deixa de ser planejada.
O Resumo responde "como foi o período?"; a Comparação responde "o que mudou entre estes dois períodos?",
com os dois escolhidos livremente.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Períodos comparáveis | Dois períodos fechados do mesmo tamanho (dia com dia, semana com semana, mês com mês), dentro dos 12 meses de histórico. |
| Q2 | Origem dos dados | Duas leituras do mesmo `GET /relatorios/resumo`, e o front calcula as diferenças. Não há rota de comparação na API, e a tela nunca diverge do Resumo. |
| Q3 | Conteúdo | Seis blocos: os dois períodos, "O que mudou" em frases, quatro indicadores com o valor de cada lado, a evolução dos dois períodos sobreposta, a divisão por faixa de desempenho lado a lado e as consultas com o tempo médio nos dois períodos. |
| Q4 | Ordem das consultas | Pela maior alta do tempo médio: as que pioraram vêm primeiro. |
| S1 | Atalhos de comparação | "Dia anterior" e "7 dias antes", "Semana anterior" e "4 semanas antes", "Mês anterior" e "3 meses antes". Aprovada. |
| S2 | Botão "Comparar" no Resumo | Abre a Comparação no período que estava na tela, contra o anterior. Aprovada. |
| S3 | Imprimir | Mesma folha do Resumo: sem menu nem controles, em tema claro, com a conexão e o momento em que foi gerada. Aprovada. |
| S4 | Copiar "O que mudou" | As frases como texto, com a conexão e os dois períodos. Aprovada. |
| S5 | Filtro das consultas | Todas, Pioraram, Melhoraram. Aprovada. |

Regras:

* **Ao abrir:** a última semana fechada contra a semana anterior.
* **Direção:** toda diferença é do período em relação ao de comparação. "Inverter os períodos" troca os dois de lugar.
* **Período de comparação:** pode ser anterior ou posterior ao período, nunca igual; as setas dele pulam o período. Um atalho fora do histórico fica desabilitado.
* **Andar com o período:** o de comparação mantém a distância (o atalho em uso continua valendo). Se a distância sair do histórico, ele volta a ser o período anterior.
* **Trocar o tamanho:** os dois períodos passam para o novo tamanho e o de comparação volta a ser o anterior.
* **Alinhamento da evolução:** hora com hora no dia, dia da semana com dia da semana na semana e dia do mês com dia do mês no mês. O mês mais curto termina antes.
* **Meses de tamanhos diferentes:** o total aparece como é, com a variação do volume por dia ao lado, e uma frase avisa a diferença de dias.
* **Juízo de valor:** a queda do tempo médio e das consultas lentas é marcada como boa e a alta como ponto de atenção; volume e pico de conexões não têm juízo.
* **Consultas:** entram as que aparecem em pelo menos uma das duas listas. A que falta numa delas aparece sem valor naquele lado e sem variação: a lista traz só as que mais pesaram, então a tela não a chama de nova nem de extinta.
* **Piorou e melhorou:** a consulta cujo tempo médio subiu ou caiu. Variação menor que 0,05% conta como igual.
* **Desempenho:** a diferença da fatia do tempo é dada em pontos percentuais.
* **Sem atividade:** se um dos dois períodos não teve consultas, a tela diz que não há o que comparar.
* **Sem conexão e demonstração:** como no Resumo. O texto copiado termina a primeira linha com "(dados demonstrativos)".
* **URL:** sempre `/relatorios/comparacao`, com os dois períodos no histórico do navegador, como no Resumo.

## Fora desta fase

Backend, coleta de métricas reais, telas completas de Consultas SQL, Usuários e permissões e Objetos do
banco, modo SSL, Docker, CI e vídeo de apresentação.
