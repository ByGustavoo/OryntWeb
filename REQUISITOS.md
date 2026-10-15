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
* **Telas planejadas:** o grupo em que nada está pronto leva o selo "Em breve" ao lado do título (antes havia um único grupo chamado "Em breve"). Num grupo que já tem tela pronta, a marca "Em breve" desce para o item em que nada está pronto (nenhum hoje) e para cada tela planejada de um item que já tem tela pronta (nenhuma hoje: Histórico saiu da lista em 12 de outubro de 2026 e Planos de execução em 14 de outubro de 2026, quando ficaram prontas, e as três telas de Relatórios estão prontas). Cada tela planejada tem a própria rota, mostra o que está previsto para a funcionalidade, com a tela aberta em evidência, e não simula nada.
* **Demonstração:** selo "Demonstração" no menu da conta enquanto há uma conexão simulada ativa e aviso "Dados demonstrativos" no dashboard. Sem conexão, o selo não aparece. O selo saiu do cabeçalho a pedido do usuário em 11 de outubro de 2026.
* **Dashboard:** períodos de 1 h, 24 h, 7 dias e 30 dias; a tabela vira cartões em telas estreitas.
* **Carregamento do Dashboard:** ao trocar o período, os indicadores, o gráfico e a tabela dão lugar na hora a um esqueleto no formato deles, com as molduras, os títulos e o cabeçalho da tabela no lugar, até a resposta chegar (pedido pelo usuário em 12 de outubro de 2026; antes os dados do período anterior ficavam na tela, esmaecidos). Os três blocos voltam em sequência, de cima para baixo, e a ordenação escolhida na tabela é mantida. Na primeira carga o esqueleto só aparece se a resposta demorar.
* **Consulta inteira e cópia:** pedido do usuário em 12 de outubro de 2026. Na tabela das consultas que mais pesam, do Dashboard e do Resumo, a consulta que não cabe em duas linhas (três nos cartões) é cortada com reticências e ganha um botão que a mostra inteira na própria linha; clicar no texto cortado também a abre. Toda linha tem um botão que copia o SQL completo, que aparece ao passar o mouse ou focar a linha e fica sempre visível em telas de toque. O texto copiado é só o SQL, sem aviso de demonstração, para poder ser colado e executado. A tabela de Comparação ainda não tem os dois botões.
* **Versões:** seção em Configurações, abaixo de "Aparência", com um cartão para o Orynt Web e outro para a Orynt API, cada um com a versão e a data de lançamento (pedido do usuário em 11 de outubro de 2026). A versão do front vem de `window.__ORYNT_CONFIG__.versao` e, na falta dela, do `version` do `package.json`; a data de lançamento vem só de `window.__ORYNT_CONFIG__.dataLancamento`. A da API vem de `GET /sistema/versao`. Com dados simulados, o cartão da API mostra "Simulada" e diz que nenhuma API está em uso.

## Acesso (login)

Pedido pelo usuário em 10 de outubro de 2026, depois da descoberta inicial. O login passa a ser a porta
de entrada e a paleta do produto muda.

| Tema | Decisão |
|---|---|
| Rota inicial | `/login` é a primeira tela. Sem login, qualquer outra rota leva a ela. |
| Depois do login | O usuário vai direto para `/dashboard`, com ou sem conexão. Quem já está logado e abre `/login` também vai para lá. |
| Autenticação | Fictícia nesta fase: um e-mail e uma senha de teste definidos no projeto, conferidos pelo simulador. Sem cadastro e sem API. A recuperação de senha tem tela e fluxo próprios, também simulados (ver "Recuperação de senha"). Não é apresentada como segura. |
| Credenciais de teste | `demo@orynt.local` e `orynt-demo`, em `src/dados/simulacao/credenciaisDemonstracao.ts`, no README e na própria tela de login. |
| Campos | E-mail e senha, ambos obrigatórios. A senha tem mostrar e ocultar. |
| Validação | Campo vazio só é cobrado no envio; formato do e-mail, ao sair do campo; depois de um erro, a cada tecla. No envio, o foco vai ao primeiro campo com problema. |
| Credenciais incorretas | Mensagem única, que não diz qual dos dois campos errou. O e-mail fica preenchido e a senha fica selecionada para ser redigitada. |
| Carregamento | O botão mostra "Entrando…" e ignora novos envios enquanto a verificação corre. |
| Esqueceu sua senha? | Abre `/recuperar-senha`, levando o e-mail já digitado (revisto em 12 de outubro de 2026, ver "Recuperação de senha"). |
| Senha do login | Mesma regra da senha do banco: nunca vai para `localStorage`, `sessionStorage`, cookie, URL ou console. |
| Sessão | Como em Q2: cookie `HttpOnly` criado pela API no login. Enquanto não há API, o simulador guarda só o usuário (sem senha) num cookie de sessão comum. |
| Painel da tela de login | Formulário à esquerda e painel animado à direita, com métrica, rota e consulta de origem numa cena com dados fictícios. Respeita a preferência de movimento reduzido. Em telas estreitas o formulário vem primeiro. |
| Tema | Alternância entre escuro e claro na tela de login, com a escolha lembrada no navegador. O modo automático continua nas configurações (Q6). |
| Paleta | Escuro: fundo `#0A0A0A`, superfícies `#111111` e `#171717`, texto branco. Claro: fundo branco levemente acinzentado, superfícies brancas, texto escuro. Azul como cor de destaque nos dois temas, no lugar do ciano. Vale para o produto inteiro. No tema escuro, o card de notificação usa `#1B1B1B` com borda `#272727`, para se destacar do fundo como no OrbitWeb (pedido do usuário em 11 de outubro de 2026). |

Ficaram de fora: cadastro de usuários, envio real de e-mail e autenticação real. O botão "Sair"
entrou em 11 de outubro de 2026 (S1 de "Conexões salvas") e a tela de recuperação de senha, em 12 de
outubro de 2026.

## Recuperação de senha

Pedido pelo usuário em 12 de outubro de 2026: quem esqueceu a senha informa o e-mail, recebe um código
de verificação, valida o código e só então troca a senha. A tela não pode dizer se o e-mail informado
existe, para não servir de consulta a quem tenta descobrir contas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Como o código chega na demonstração | Sem backend, nenhum e-mail é enviado. Um cartão "Caixa de entrada simulada", na própria tela, mostra o código quando o e-mail é o de demonstração (`demo@orynt.local`). Ele só existe com dados simulados e some com a API. |
| Q2 | O que a troca faz na demonstração | A senha nova é conferida e descartada. O acesso continua sendo `orynt-demo`, e a tela diz isso antes e depois de salvar. |
| Q3 | Depois de trocar | Volta para `/login` com o e-mail preenchido, o foco na senha e o aviso de que a troca foi concluída. Não entra direto. |
| Q4 | Regra da senha nova | De 8 a 128 caracteres, mais a confirmação. Não exige mistura de maiúsculas, números e símbolos. |
| S1 | Colar o código | Colar preenche os seis dígitos de uma vez, mesmo com espaço, traço ou texto em volta, e a validação dispara sozinha ao completar o sexto dígito, digitado ou colado. Aprovada. |
| S2 | Força da senha | Medidor de quatro barras abaixo do campo, com o nível (fraca, razoável, boa, forte) e uma orientação. É só orientação: quem decide se a senha é aceita é a regra de Q4. O campo mostra uma mensagem por vez: o erro, que conta quantos caracteres faltam, toma o lugar da orientação (pedido do usuário em 12 de outubro de 2026). Aprovada. |
| S3 | Outras sessões | A etapa da senha avisa que, ao salvar, as outras sessões abertas da conta são encerradas, e o contrato da API exige isso. Aprovada. |

Regras:

* **Rota:** `/recuperar-senha`, com o mesmo layout do login (formulário à esquerda, painel à direita). Quem já está logado é levado ao dashboard.
* **Etapas:** e-mail, código e nova senha, numeradas na tela ("Etapa 2 de 3"). Ficam só na memória da página: recarregar volta à etapa 1.
* **Sigilo sobre a conta:** depois do e-mail, a resposta é sempre a mesma: "Se `e-mail` estiver cadastrado, você vai receber uma mensagem com o código de verificação e o passo a passo para recuperar a senha". A etapa do código abre para qualquer e-mail válido, e código errado, expirado ou de e-mail sem conta recebem a mesma mensagem, "Código incorreto ou expirado".
* **Código:** 6 dígitos numéricos, válido por 10 minutos, com 5 tentativas. Na quinta tentativa errada o código deixa de valer e a tela pede um novo.
* **Reenvio:** liberado 60 segundos depois de cada pedido, com a contagem na tela. Um novo código invalida o anterior.
* **Usar outro e-mail:** volta à etapa 1 com o e-mail preenchido.
* **Nova senha:** só abre com o código validado. A validação vale por 10 minutos; se o prazo acabar, a tela volta à etapa 1 e explica por quê.
* **Validação:** como no login: campo vazio só é cobrado no envio; formato do e-mail, tamanho da senha e confirmação, ao sair do campo; depois de um erro, a cada tecla.
* **Sigilo dos dados:** e-mail, código e senha não vão para a URL, o `localStorage`, o `sessionStorage`, cookies ou o console. O e-mail passa entre o login e a recuperação pela memória do layout que as duas telas compartilham.
* **Simulação:** o cartão de demonstração acompanha as três etapas (o e-mail de teste, a caixa de entrada simulada, o aviso de que a senha é descartada). Para um e-mail sem conta, a caixa simulada diz que não há mensagem; é o simulador mostrando a caixa de entrada, não a tela revelando a conta.

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
| S1 | Imprimir | Botão "Imprimir", que abre a impressão do navegador. A folha sai sem menu, cabeçalho e controles, em tema claro, com a conexão e o momento em que foi gerada. Aprovada. Em 12 de outubro de 2026 o usuário pediu a folha personalizada: ela abre com a marca e o nome do Orynt, o nome da tela, o período, o período de comparação e a conexão, e cada página leva o slogan e a numeração no rodapé. A tela não muda de tema ao imprimir, e o arquivo é sugerido com o nome do relatório e do período. No mesmo dia o usuário apontou que o título do documento ficava solto no meio do topo da folha, escrito pelo navegador: o topo passou a ser da folha, sem a data e o título do navegador. A primeira página não repete nada acima do cabeçalho, e as seguintes levam o nome da tela e o período no canto esquerdo, no mesmo estilo do rodapé. |
| S2 | Atalho no Dashboard | Link no painel "Atividade das consultas" para o resumo de ontem (períodos de 1 h e 24 h), da semana passada (7 dias) ou do mês passado (30 dias). Aprovada. |
| S3 | Copiar destaques | Botão "Copiar" no bloco de destaques, que leva as frases como texto, com o nome da conexão e o período. Aprovada. |

Regras:

* **Período inicial:** a última semana fechada.
* **Histórico:** dá para voltar até o primeiro período inteiro dos últimos 12 meses. A seta do período seguinte fica desabilitada no último período fechado, e "Mais recente" volta a ele.
* **Trocar o tamanho do período:** a tela vai para o dia, a semana ou o mês que contém o último dia do período aberto, sem nunca cair num período em andamento.
* **Comparação:** toda variação é contra o período de mesmo tamanho imediatamente anterior, que a tela nomeia ("Comparado com…").
* **Destaques:** as frases são montadas pelo front a partir dos números do relatório. A queda do tempo médio é marcada como boa e a alta como ponto de atenção; o volume não tem juízo de valor.
* **Indicadores:** no card "Consultas executadas", a seta e o percentual da variação ficam verdes quando o volume sobe e vermelhos quando cai, como no Dashboard (pedido pelo usuário em 12 de outubro de 2026). Nas frases de destaque o volume continua sem juízo de valor.
* **Ações:** "Comparar", "Exportar" e "Imprimir" ficam na mesma linha do seletor de dia, semana e mês, à direita (pedido pelo usuário em 12 de outubro de 2026). Quando a linha aperta, os três botões mostram só o ícone; em telas estreitas, descem para uma linha própria.
* **Desempenho:** a API classifica as consultas, como no Dashboard (Q3 de "Decisões"); o front só apresenta as faixas.
* **Carregamento:** ao trocar o período, os blocos dão lugar na hora a um esqueleto no formato deles, com as molduras e os títulos no lugar, até a resposta chegar (pedido em 12 de outubro de 2026 para as três telas de Relatórios; antes o relatório anterior ficava na tela, esmaecido). A primeira carga usa o mesmo esqueleto.
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
* **Carregamento:** ao trocar o período, "O que exportar" continua na tela, com as marcações e o formato escolhidos; só a quantidade de linhas de cada bloco e a prévia viram esqueleto, e "Baixar" e os botões de copiar ficam em espera até a resposta chegar, para nenhum arquivo sair com os dados do período anterior.
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
* **Juízo de valor:** a queda do tempo médio e das consultas lentas é marcada como boa e a alta como ponto de atenção. No card "Consultas executadas", a seta e o percentual ficam verdes quando o volume sobe e vermelhos quando cai, como no Resumo e no Dashboard (pedido pelo usuário em 12 de outubro de 2026); nas frases de "O que mudou" o volume continua sem juízo. No card "Pico de conexões", a seta e a diferença ficam vermelhas quando o pico sobe e verdes quando cai (pedido pelo usuário em 12 de outubro de 2026, junto com a cor em todas as setas de variação; o sentido foi escolhido por boa prática, porque conexões são um recurso com limite). Na frase da consulta que mais piorou, a seta é vermelha, e na da que mais melhorou, verde.
* **Ações:** "Imprimir" fica na mesma linha do seletor de dia, semana e mês, à direita (pedido pelo usuário em 12 de outubro de 2026).
* **Consultas:** entram as que aparecem em pelo menos uma das duas listas. A que falta numa delas aparece sem valor naquele lado e sem variação: a lista traz só as que mais pesaram, então a tela não a chama de nova nem de extinta.
* **Piorou e melhorou:** a consulta cujo tempo médio subiu ou caiu. Variação menor que 0,05% conta como igual.
* **Desempenho:** a diferença da fatia do tempo é dada em pontos percentuais.
* **Sem atividade:** se um dos dois períodos não teve consultas, a tela diz que não há o que comparar.
* **Carregamento:** ao trocar qualquer um dos dois períodos, os blocos dão lugar na hora a um esqueleto no formato deles, como no Resumo.
* **Sem conexão e demonstração:** como no Resumo. O texto copiado termina a primeira linha com "(dados demonstrativos)".
* **URL:** sempre `/relatorios/comparacao`, com os dois períodos no histórico do navegador, como no Resumo.

## Consultas SQL: Todas

Pedido pelo usuário em 12 de outubro de 2026: a tela "Todas" de Consultas SQL deixa de ser planejada. O
Dashboard mostra as dez consultas que mais pesam; esta tela é o inventário completo, para achar uma
consulta e ordenar o conjunto inteiro por custo, frequência ou tempo.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Período | Os mesmos do Dashboard (1 h, 24 h, 7 dias, 30 dias), abrindo em 24 h. A tabela do Dashboard é o topo desta lista, com os mesmos números. |
| Q2 | Quem busca, ordena e pagina | A API, numa rota nova, `GET /consultas`, com busca, filtros, ordenação e página. O front não guarda a lista inteira: um banco real pode ter milhares de consultas distintas. O simulador implementa a rota. |
| Q3 | Dados de cada consulta | Os do Dashboard (tempo médio, execuções, % do tempo total e desempenho) mais tempo total, tempo mínimo e máximo, linhas por execução e tipo de comando (`SELECT`, `INSERT`, `UPDATE`, `DELETE` ou outro). |
| Q4 | Clique na linha | Abre um modal centralizado com o SQL inteiro, todas as medidas e o botão de copiar. Em telas estreitas o modal sobe de baixo. Era um painel lateral à direita; trocado a pedido em 12 de outubro de 2026. |
| Q5 | Filtros | Busca no texto do SQL, desempenho (Todas, Rápidas, Moderadas, Lentas) e tipo de comando. |
| Q6 | Paginação | Páginas de 25, com "1 a 25 de 42" e as setas de página anterior e próxima. |
| S1 | "Ver todas" no Dashboard | Link no painel "Consultas que mais pesam", que abre a lista no período que estava na tela. Aprovada. |
| S2 | Indicador "Consultas lentas" | No Dashboard, o cartão abre a lista no mesmo período, já filtrada em "Lentas". Só vira link quando há consulta lenta. Aprovada. |
| S3 | Termo buscado em destaque | Cada ocorrência dos termos da busca fica marcada no SQL da linha e do modal de detalhes. Aprovada. |
| S4 | Exportar CSV | Baixa a lista filtrada inteira, não só a página, com os cuidados da Exportação dos Relatórios. Aprovada. |
| S5 | Percorrer no modal | O modal de detalhes tem as setas de consulta anterior e próxima, com a posição na lista ("Consulta 3 de 42"), para ver uma consulta depois da outra sem fechar. Aprovada no mesmo dia. |
| S6 | Atalho da busca | A tecla `/` leva o foco ao campo de busca, e o campo mostra a tecla enquanto está vazio. Aprovada no mesmo dia. |
| S7 | Padrão dos números no CSV | "Exportar CSV" abre a escolha entre o padrão brasileiro e o internacional, como na Exportação dos Relatórios. Aprovada no mesmo dia. |

Regras:

* **Colunas:** consulta, tempo médio, tempo máximo, execuções, % do tempo total e desempenho. As outras medidas ficam no modal de detalhes.
* **Ordenação:** pelos cabeçalhos de tempo médio, tempo máximo, execuções e % do tempo total, do maior para o menor no primeiro clique e invertendo no segundo. Abre pelo % do tempo total.
* **Busca:** não diferencia maiúsculas nem acentos, exige todos os termos digitados, em qualquer ordem, e espera 250 ms depois da digitação (Enter busca na hora). Até 200 caracteres.
* **Contagem:** a tela diz quantas consultas o período tem e, com filtro, quantas sobraram ("3 de 42 consultas"), com "Limpar filtros" ao lado.
* **Mudar um filtro, o período ou a ordenação:** volta à primeira página.
* **Carregamento:** ao trocar o período, as linhas, a contagem e a paginação dão lugar na hora a um esqueleto no formato da tabela, com o cabeçalho no lugar, até a resposta chegar (pedido em 12 de outubro de 2026: as linhas do período anterior na tela pareciam um travamento). Ao buscar, filtrar, ordenar ou mudar de página, as linhas anteriores ficam na tela, esmaecidas, até a resposta.
* **Sem resultado:** a tela diz que nenhuma das consultas do período corresponde aos filtros, cita os filtros e oferece "Limpar filtros". Sem nenhuma consulta no período, sugere um período maior.
* **Modal de detalhes:** tipo de comando, desempenho, o SQL inteiro com "Copiar", o tempo mínimo, médio e máximo por execução, com a frase que compara a execução mais lenta com o tempo médio, e execuções, tempo total, % do tempo total e linhas por execução do período. O texto copiado é só o SQL, como no Dashboard.
* **Percorrer no modal:** as setas seguem a ordem da lista filtrada e atravessam as páginas: depois da última consulta de uma página vem a primeira da seguinte, e a lista ao fundo acompanha, com a linha da consulta aberta em evidência. Param na primeira e na última consulta da lista. Ao fechar, o foco volta para a linha da consulta que estava aberta.
* **Atalho da busca:** `/` só vale fora de um campo de texto e com o modal de detalhes e os menus fechados. Em telas de toque a tecla não é mostrada.
* **Exportação:** um arquivo CSV, com todas as medidas, na ordenação da tela, no padrão escolhido ao exportar: brasileiro (`;` e vírgula decimal) ou internacional (`,` e ponto decimal). O padrão não muda o nome do arquivo. Nome: `orynt-consultas-<1h|24h|7d|30d>-<dia>`, mais `-filtradas` quando há filtro e `-demonstracao` quando os dados são fictícios. O SQL que uma planilha leria como fórmula sai com um apóstrofo na frente, e os dados fictícios levam a coluna "Origem dos dados".
* **URL:** sempre `/consultas/todas`, sem parâmetros. Período, busca, filtros, ordenação e página ficam no histórico do navegador, como nos Relatórios: recarregar a página os mantém; abrir o endereço de novo começa do zero.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas; o modal de detalhes repete o aviso.
* **Simulação:** a lista tem as 42 consultas que os indicadores já anunciavam. As execuções somam o total do Dashboard e as lentas são as mesmas do indicador.

## Consultas SQL: Histórico

Pedido pelo usuário em 12 de outubro de 2026: a tela "Histórico" de Consultas SQL deixa de ser planejada. A
lista Todas dá um número por consulta no período; esta tela abre esse número no tempo, para responder "esta
consulta piorou? Desde quando? Em que horas ela pesa?".

| # | Tema | Decisão |
|---|---|---|
| Q1 | Centro da tela | Uma consulta por vez, com um seletor para trocar. A lista de consultas continua sendo a tela Todas. |
| Q2 | Períodos | Os quatro da Todas e do Dashboard (1 h, 24 h, 7 dias, 30 dias), com os mesmos intervalos do gráfico de atividade (5 minutos, 1 hora, 6 horas, 1 dia). As execuções dos intervalos somam o número que a Todas mostra para a consulta. |
| Q3 | Cada intervalo | Execuções, tempo médio e tempo máximo. O intervalo sem execuções não tem tempo. |
| Q4 | Escolher a consulta | Campo de busca com sugestões, com a mesma busca da Todas (`GET /consultas`), mostrando o SQL, o tempo médio, o peso e o desempenho de cada uma. |
| Q5 | Período anterior | Variação das execuções e do tempo médio nos indicadores, com a seta verde ou vermelha, como no Dashboard. |
| S1 | "Ver histórico" na Todas | Botão no rodapé do modal de detalhes, que abre o Histórico naquela consulta e no período da lista. Aprovada. |
| S2 | Destaques | Frases acima dos gráficos, como no Resumo: o volume, o tempo médio, o intervalo com mais execuções e o intervalo mais lento, com "Copiar". Aprovada. |
| S3 | Exportar CSV | A tabela por intervalo, com a escolha do padrão dos números e os cuidados da Exportação. Aprovada. |
| S4 | Percorrer as consultas | Setas de consulta anterior e próxima, na ordem de peso (a ordenação padrão da Todas), com a posição ("Consulta 3 de 42 por peso"). Aprovada. |
| S5 | "Ver histórico" nas outras tabelas | Botão em cada linha da tabela das consultas que mais pesam, no Dashboard e no Resumo, e da tabela de consultas da Comparação. Aprovada no mesmo dia. |
| S6 | Ordenar a tabela por intervalo | Pelos cabeçalhos de intervalo, execuções, tempo médio e tempo máximo. Aprovada no mesmo dia. |
| S7 | Tabela por intervalo mais curta | Cabeçalho fixo ao rolar e lista recolhida em 12 intervalos, com um botão para ver os outros, no lugar de paginação. Aprovada em 14 de outubro de 2026. |

Regras:

* **Dados:** uma rota nova, `GET /consultas/{id}/historico`, devolve numa resposta só a consulta com os números do período, as duas variações, a posição por peso com as vizinhas e os intervalos, para os blocos não discordarem. O simulador implementa a rota.
* **Ao abrir pelo menu:** a tela mostra a consulta que mais pesa no período (a primeira da Todas), nunca uma tela vazia. Trocar o período mantém a consulta que estava na tela.
* **Seletor:** ao clicar no campo aparecem as oito consultas que mais pesam; digitar busca no texto do SQL, com os termos marcados, e espera 250 ms. As setas do teclado andam pelas sugestões, Enter escolhe e Esc fecha. A tecla `/` leva o foco ao campo, como na Todas. A consulta em análise aparece marcada na lista.
* **Consulta em análise:** o SQL inteiro, o tipo de comando, o desempenho e "Copiar", que copia só o SQL.
* **Indicadores:** execuções e tempo médio, com a variação em relação ao período anterior do mesmo tamanho; tempo máximo, com o intervalo em que aconteceu; e tempo total, com a parte do tempo do banco.
* **Destaques:** a alta do tempo médio pede atenção e a queda é positiva; o volume não leva julgamento. O intervalo mais lento pede atenção quando fica 20% ou mais acima do tempo médio do período. O texto copiado abre com a conexão, o período e o SQL, e leva "(dados demonstrativos)" na primeira linha quando é o caso.
* **Evolução:** dois gráficos alinhados, como no Resumo: execuções em barras e tempo médio em área, com o pico de cada um marcado. O tempo máximo fica na dica do gráfico e na tabela, não no desenho: ele costuma ser várias vezes o tempo médio e achataria a linha.
* **Por intervalo:** tabela com execuções, tempo médio e tempo máximo de cada intervalo, e as marcas "Mais lento" e "Mais execuções". Em telas estreitas cada intervalo vira um cartão.
* **Ordenação da tabela:** abre do intervalo mais antigo para o mais recente. O primeiro clique no cabeçalho de uma medida ordena do maior para o menor e o segundo inverte; o do intervalo alterna entre o mais antigo e o mais recente primeiro. O intervalo sem execuções fica por último ao ordenar por tempo, e os empates seguem a ordem do tempo. A ordem escolhida é mantida ao trocar de consulta e de período, mas não ao sair da tela. Nos cartões, a escolha é feita por um campo "Ordenar por".
* **Tamanho da tabela:** sem paginação, porque a tabela tem no máximo 30 linhas e acompanha o gráfico. O cabeçalho fica fixo ao rolar a página, e ordenar com ele fixo leva ao começo da tabela. Acima de 12 intervalos a tabela abre recolhida em 12: na ordem do mais antigo ficam os 12 mais recentes, e nas outras ordens os 12 primeiros da ordem. O botão fica no cabeçalho do painel, ao lado de "Exportar CSV" (pedido em 14 de outubro de 2026), e diz o que mostra: "Mostrar os 18 dias anteriores" ou "Mostrar os outros 18 dias"; aberto, "Mostrar só os 12 mais recentes" ou "Mostrar só os 12 primeiros". Em telas abaixo de 360 px ele diz só "Mostrar os 30 dias" ou "Mostrar só 12". A escolha é mantida ao trocar de consulta, de período e de ordem, mas não ao sair da tela. O CSV leva sempre todos os intervalos.
* **Atalhos nas outras tabelas:** no Dashboard o botão abre o histórico no período que está na tela. No Resumo e na Comparação, que mostram períodos fechados de calendário, ele abre a janela recente do mesmo tamanho (dia: últimas 24 horas; semana: últimos 7 dias; mês: últimos 30 dias), e o rótulo do botão diz qual é, porque o histórico não mostra períodos antigos. Na tabela do Dashboard e do Resumo o botão aparece ao passar o mouse ou focar a linha, ao lado do de copiar, e fica sempre visível em telas de toque; na da Comparação fica numa coluna própria, sempre visível.
* **Carregamento:** ao trocar de consulta ou de período, os blocos dão lugar na hora a um esqueleto com as molduras e os títulos no lugar; o seletor continua disponível. Ao trocar só o período, o SQL fica na tela.
* **Sem execuções no período:** a tela diz que a consulta não foi executada e oferece os últimos 30 dias. Sem nenhuma consulta no período, sugere um período maior.
* **Consulta que não existe mais:** a tela explica e oferece a que mais pesa no período.
* **Exportação:** um arquivo CSV com uma linha por intervalo, sempre do mais antigo para o mais recente, qualquer que seja a ordenação da tela (início, execuções, tempo médio, tempo máximo), e o SQL em todas as linhas, para o arquivo continuar dizendo de que consulta é depois de renomeado. Nome: `orynt-historico-consulta-<1h|24h|7d|30d>-<dia>`, mais `-demonstracao` quando os dados são fictícios.
* **URL:** sempre `/consultas/historico`, sem parâmetros. A consulta e o período ficam no histórico do navegador, como nas outras telas. Ao trocar de conexão, a tela volta à consulta que mais pesa.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** os intervalos de cada consulta somam as execuções da Todas, o maior tempo máximo dos intervalos é o tempo máximo da consulta e os tempos médios, ponderados pelas execuções, dão o tempo médio dela. Cada consulta fictícia tem um comportamento ligado ao horário real (acompanha a carga, piora de madrugada, piora às segundas, ficou mais lenta há três dias ou é estável), para os quatro períodos contarem a mesma história.

## Consultas SQL: Planos de execução

Pedido pelo usuário em 14 de outubro de 2026: a tela "Planos de execução" de Consultas SQL deixa de ser
planejada. Todas diz quanto cada consulta custa e Histórico diz quando ela piorou; esta tela diz por quê:
como o PostgreSQL executa a consulta e em qual etapa o tempo é gasto.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem do plano | O plano que a API registrou numa execução real (por `auto_explain`). A tela nunca executa nada no banco. |
| Q2 | Medidas | As do `EXPLAIN (ANALYZE, BUFFERS)`: tempo real, linhas estimadas e reais, laços e blocos lidos, além do custo estimado. |
| Q3 | Período | A tela não tem período: mostra o plano registrado mais recente, com a data e a hora em que foi registrado. |
| Q4 | Desenho do plano | Uma árvore indentada, uma linha por etapa, com a barra do tempo gasto na própria etapa. |
| Q5 | Clique na etapa | Abre o detalhe da etapa num painel ao lado da árvore no desktop e abaixo dela em telas estreitas. |
| Q6 | Diagnóstico | Frases automáticas que apontam o problema, no formato dos Destaques do Resumo. |
| S1 | "Ver plano" nas outras telas | Botão no modal de detalhes da Todas, na consulta em análise do Histórico e nas tabelas de consultas do Dashboard, do Resumo e da Comparação. Aprovada. |
| S2 | Mudanças de plano | A lista dos planos que a consulta teve nos últimos 30 dias, com o período de uso, as execuções e o tempo médio de cada um, e a variação em relação ao anterior. Aprovada. |
| S3 | Copiar o plano | Em texto, como o psql mostra, e em JSON, nos formatos do `EXPLAIN`, para colar no explain.depesz.com ou no PEV2. Aprovada. |
| S4 | Índice sugerido | Quando uma etapa lê a tabela e o filtro descarta quase tudo, o `CREATE INDEX CONCURRENTLY` pronto para copiar. Só texto: a tela não executa o comando. Aprovada. |
| S5 | Comparar dois planos | Duas versões do plano lado a lado, com o que mudou. Pedida pelo usuário no mesmo dia. |
| S6 | Troca de plano no Histórico | O momento em que o plano mudou, marcado nos gráficos e na tabela do Histórico, com atalho para comparar os dois planos. Pedida pelo usuário no mesmo dia. |

Regras:

* **Dados:** uma rota nova, `GET /consultas/{id}/plano`, devolve numa resposta só a consulta com os números dos últimos 30 dias, a posição por peso com as vizinhas, as versões do plano e o plano escolhido, com os índices sugeridos. O simulador implementa a rota. Os índices sugeridos vêm da API, como o desempenho da consulta (Q3 da descoberta inicial).
* **Janela:** a posição por peso, as sugestões do seletor e as mudanças de plano usam os últimos 30 dias, a maior janela das outras telas (decidido por boa prática, porque a tela não tem período). O "Ver histórico" da tela abre o Histórico nesses 30 dias.
* **Ao abrir pelo menu:** a tela mostra a consulta que mais pesa nos últimos 30 dias, nunca uma tela vazia. O seletor e as setas são os do Histórico ("Consulta 3 de 42 por peso em 30 dias").
* **Árvore:** de cima para baixo, como o `EXPLAIN` em texto; cada etapa recebe as linhas das que estão abaixo dela. Cada linha mostra o nome da etapa como o PostgreSQL o escreve (Seq Scan, Hash Right Join, HashAggregate), a tabela e o índice, a condição principal, o tempo gasto na própria etapa (sem as de baixo, somando todas as execuções dela), a parte do tempo de execução, as linhas devolvidas e as que o planejador esperava. Abre com a etapa mais lenta escolhida. Setas do teclado: para cima e para baixo andam pelas etapas, para a esquerda vai à etapa de cima e para a direita, à primeira de baixo.
* **Detalhe da etapa:** o que ela faz, em uma frase; o tempo próprio; linhas devolvidas, esperadas, lidas e descartadas pelo filtro e execuções da etapa; todas as condições; os blocos lidos do cache, do disco e de arquivos temporários só dela; a memória da ordenação ou da tabela hash; o tempo com as etapas de baixo, o tempo até a primeira linha, o custo estimado e a largura média da linha.
* **Diagnóstico:** a etapa que mais pesa, sempre; a varredura sequencial que lê 10.000 linhas ou mais (até duas), que pede atenção quando o filtro descarta 90% ou mais; o filtro de outra etapa que descarta 90% ou mais de pelo menos 1.000 linhas; o pior erro de estimativa, de 10 vezes ou mais, ignorando a etapa que um `LIMIT` interrompeu antes do fim; a maior gravação em disco por falta de memória, com a sugestão de aumentar o `work_mem`; e a etapa executada 1.000 vezes ou mais dentro de outra. Sem nenhum desses sinais, a frase diz que o plano está saudável. A primeira frase de cada etapa leva a ela na árvore, quando o plano tem mais de uma etapa.
* **Erro de estimativa:** marcado com o ícone de alerta na árvore e no detalhe, sem depender só da cor.
* **Plano anterior na tela:** uma nota diz qual plano é, quando foi usado e oferece "Ver o plano atual".
* **Cópia:** o texto copiado é só o plano, sem aviso de demonstração, para poder ser colado nas ferramentas, como o SQL copiado das outras telas. O índice sugerido copia só o comando.
* **Sem plano:** um comando que não passa pelo planejador (COMMIT, ANALYZE, REFRESH MATERIALIZED VIEW) explica isso; uma consulta sem execução registrada oferece a que mais pesa. Sem nenhuma consulta nos 30 dias, a tela diz que os planos aparecem quando o banco executar as primeiras.
* **Carregamento:** ao trocar de consulta ou de versão do plano, os blocos dão lugar na hora a um esqueleto com as molduras e os títulos no lugar; o seletor continua disponível.
* **URL:** sempre `/consultas/planos-de-execucao`, sem parâmetros. A consulta e a versão ficam no histórico do navegador, como nas outras telas. Ao trocar de conexão, a tela volta à consulta que mais pesa.
* **Comparação:** "Comparar planos", em "Mudanças de plano", põe a versão em tela à esquerda e a outra à direita (a anterior, quando a da tela é a atual). Mostra frases sobre a diferença de tempo médio, sobre cada tabela que passou a ser lida de outro jeito e sobre as linhas lidas das tabelas; uma tabela com o tempo médio e as execuções dos 30 dias, o tempo da execução registrada, o planejamento, as linhas lidas das tabelas, os dados lidos e o número de etapas, com a diferença da esquerda em relação à direita (em vezes, a partir de 10 vezes); e as duas árvores, com a marca "Mudou" nas etapas das tabelas que mudaram de leitura. "Inverter" troca os lados, "Abrir este plano" mostra um deles sozinho e "Fechar comparação" volta ao plano da esquerda. Não existe rota de comparação: a tela lê `GET /consultas/{id}/plano` uma vez para cada versão, como a Comparação dos Relatórios faz com o Resumo. A comparação fica no histórico do navegador com a consulta e a versão.
* **Troca de plano no Histórico:** `GET /consultas/{id}/historico` traz as trocas de plano que caem no período. O intervalo da troca ganha uma linha tracejada "Novo plano" nos dois gráficos, uma frase na dica e o selo "Novo plano" na tabela, e a descrição do painel "Evolução no período" diz quando foi. "Comparar os planos", no mesmo painel, abre Planos de execução comparando o plano novo com o anterior.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** planos escritos à mão para as dez consultas principais, coerentes com o desempenho de cada uma (a que mais pesa faz uma varredura sequencial em `usuarios` por falta de um índice em `lower(email)`), e planos simples por índice para as 32 secundárias; COMMIT, ANALYZE e REFRESH MATERIALIZED VIEW não têm plano. O tempo de execução fica a menos de 10% do tempo médio da consulta. A consulta dos pedidos por cliente trocou de plano há três dias às 9h, o mesmo momento em que o Histórico mostra a piora dela: as execuções das duas versões somam as dos 30 dias.

## Fora desta fase

Backend, coleta de métricas reais, as telas de
Usuários e permissões e de Objetos do banco, modo SSL, Docker, CI e vídeo de apresentação.
