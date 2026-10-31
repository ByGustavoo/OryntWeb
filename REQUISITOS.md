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
* **Navegação em grupos e subgrupos:** pedido do usuário em 11 de outubro de 2026, no modelo do PrismaWeb. O menu tem o Dashboard, o grupo "Análise" (Relatórios e Consultas SQL), o grupo "Gerenciamento" (Backup, desde 30 de outubro de 2026, Objetos do banco e Usuários e permissões) e, desde 20 de outubro de 2026, o grupo "Administração" (Usuários e Auditoria), que só aparece para quem tem as permissões; Configurações segue no rodapé. O menu mostra só as telas que a conta pode abrir. Cada item de grupo abre as suas telas: Relatórios (Resumo, Exportação, Comparação), Consultas SQL (Todas, Histórico, Planos de execução), Objetos do banco (Views, Índices, Tabelas, Funções) e Usuários e permissões (Papéis, Sessões, Alterações, Permissões; Alterações entrou em 20 de outubro de 2026). Os nomes dos grupos e das telas foram escolhidos por boa prática, a partir do que já estava previsto para cada funcionalidade.
* **Telas planejadas:** o grupo em que nada está pronto leva o selo "Em breve" ao lado do título (antes havia um único grupo chamado "Em breve"). Num grupo que já tem tela pronta, a marca "Em breve" desce para cada tela planejada. Não sobrou nenhuma: Papéis, Sessões e Permissões ficaram prontas em 19 de outubro de 2026. Objetos do banco não tem mais tela planejada: Views e Índices ficaram prontas em 18 de outubro de 2026, e Tabelas e Funções, em 19 de outubro. O item em que nada está pronto não leva a marca ao lado do nome desde então: "Usuários e permissões" com a marca não cabia no menu e aparecia cortado; as telas dele, ao abrir o item, mostram a marca uma a uma. Cada tela planejada tem a própria rota, mostra o que está previsto para a funcionalidade, com a tela aberta em evidência, e não simula nada.
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
| Autenticação | Fictícia nesta fase: um e-mail e uma senha de teste definidos no projeto, conferidos pelo simulador. Sem API. Desde 20 de outubro de 2026 as contas criadas em Administração › Usuários também entram, com a senha que a pessoa definiu pelo convite. A recuperação de senha tem tela e fluxo próprios, também simulados (ver "Recuperação de senha"). Não é apresentada como segura. |
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

Ficaram de fora: envio real de e-mail e autenticação real. O cadastro de contas entrou em 20 de outubro de 2026, com
convite e senha definida pela pessoa, no simulador (ver "Administração: Usuários e Auditoria"). O botão "Sair"
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
| S3 | Gerenciar conexões | Seção "Conexões salvas" em Configurações: conectar, editar e excluir. Aprovada. Desde 30 de outubro de 2026, editar cobre todos os dados e substitui o renomear, e salvar sem conectar fica no Backup (ver "Backup"). |

Regras:

* **Ao entrar no dashboard:** se a sessão já tem conexão ativa, ela é usada. Se não tem e há conexões salvas, a usada por último é ativada sozinha. Se não há nenhuma, o dashboard mostra "Nenhum banco conectado" com o botão "Conectar ao banco".
* **Abertura do modal:** nunca abre sozinho. Abre só por ação do usuário: "Conectar ao banco" no dashboard, "Nova conexão" no cabeçalho e nas conexões salvas. Configurações e as telas "Em breve" abrem normalmente sem conexão.
* **Falha ao reativar:** o dashboard diz qual conexão falhou, por que e o que fazer, com "Tentar novamente", a lista das conexões salvas e "Nova conexão".
* **Trocar de conexão:** uma falha na troca não derruba a conexão que estava em uso.
* **Mesmo banco:** conectar de novo ao mesmo host, porta, banco e usuário atualiza a conexão salva, em vez de criar outra.
* **Desconectar:** encerra a conexão da sessão e leva ao dashboard sem conexão. A conexão continua salva; ao recarregar a página ou entrar de novo, a usada por último volta a ser ativada.
* **Excluir:** pede confirmação. Excluir a conexão em uso deixa a aplicação sem conexão.
* **Editar:** os mesmos campos do cadastro, com a senha opcional: em branco, a guardada continua valendo.
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
* **Árvore:** de cima para baixo, como o `EXPLAIN` em texto; cada etapa recebe as linhas das que estão abaixo dela. Cada linha mostra o nome da etapa como o PostgreSQL o escreve (Seq Scan, Hash Right Join, HashAggregate), a tabela e o índice, a condição principal, o tempo gasto na própria etapa (sem as de baixo, somando todas as execuções dela), a parte do tempo de execução, as linhas devolvidas e as que o planejador esperava. Abre com a etapa mais lenta escolhida. Setas do teclado: para cima e para baixo andam pelas etapas, para a esquerda recolhe a etapa aberta ou vai à etapa de cima e para a direita abre a etapa recolhida ou vai à primeira de baixo. Desde 20 de outubro de 2026, a pedido do usuário, cada etapa com etapas abaixo tem uma seta que recolhe e abre esse ramo, e a recolhida diz quantas etapas esconde; o caminho da primeira etapa até a escolhida fica destacado nas guias, e o detalhe da etapa mostra esse caminho, com cada etapa clicável. Recolher o ramo da etapa escolhida escolhe a etapa que recolheu, e "Ver X na árvore" reabre o que estiver recolhido no caminho.
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

## Objetos do banco: Views

Pedido pelo usuário em 18 de outubro de 2026: a tela "Views" de Objetos do banco deixa de ser planejada. É
o inventário das visões comuns e materializadas do banco conectado e responde a três perguntas: que visões
existem e o que cada uma faz, do que cada uma depende e quem depende dela (se dá para alterar uma tabela sem
quebrar nada), e se as materializadas estão atualizadas e quanto custa atualizá-las.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Comuns e materializadas | Uma lista só, com filtro de tipo. |
| Q2 | Origem dos dados | `GET /objetos/visoes` devolve a lista inteira; a busca, os filtros e a ordem são feitos no navegador. |
| Q3 | Ações sobre o banco | Só leitura. A tela não executa `REFRESH` nem nenhum outro comando. |
| Q4 | Clique na visão | Abre o modal centralizado com setas no rodapé, como o detalhe de Consultas SQL › Todas. |
| Q5 | Última atualização das materializadas | A API deduz pela última execução do `REFRESH` que o Orynt coletou; sem registro nos 30 dias, a tela diz "Sem registro". |
| Q6 | Dependências | "Depende de" e "Usada por" no detalhe. |
| Q7 | Ligação com Consultas SQL | O detalhe lista as consultas que leem a visão, com "Ver histórico" e "Ver plano", e o `REFRESH` da materializada, com "Ver histórico". |
| S1 | Materializadas desatualizadas | Marcadas quando a última atualização tem mais de 24 horas ou não foi registrada nos 30 dias. Aprovada; o limite de 24 horas foi o do exemplo da descoberta. |
| S2 | Views sem leitura | Destacadas quando nenhuma consulta as leu nos últimos 30 dias, nem diretamente nem por outra visão. Aprovada. |
| S3 | Exportar CSV | Recusada. |
| S4 | Diagrama de dependências | Fica para uma fase futura. |

Regras:

* **Dados:** uma rota nova, `GET /objetos/visoes`, devolve numa resposta só todas as visões fora dos esquemas do sistema, cada uma com o dono, a descrição (o `COMMENT` do banco), a definição, as colunas, as dependências nos dois sentidos, as consultas que a leem com os números dos últimos 30 dias (os mesmos de `GET /consultas`) e, nas materializadas, se tem dados, o tamanho, as linhas, a última atualização e o comando `REFRESH` com os números dele. A resposta traz o instante em que foi gerada, e a tela mede a idade da atualização a partir dele.
* **Lista:** nome com o esquema, descrição (ou "Sem descrição no banco"), tipo, leituras nos 30 dias, tamanho e última atualização. Ordem inicial por esquema e nome; dá para ordenar pelo nome, pelas leituras (mais lidas primeiro), pelo tamanho (maiores primeiro) e pela última atualização (mais antigas primeiro); as visões comuns ficam no fim quando a ordem é por tamanho ou por atualização. A tabela vira cartões em telas estreitas.
* **Situação das materializadas:** "Sem dados" quando a visão foi criada ou atualizada com `WITH NO DATA`, "Desatualizada" acima de 24 horas ou sem registro e "Atualizada" no resto.
* **Sem leitura:** uma visão é lida quando uma consulta dos últimos 30 dias a cita, quando uma visão que depende dela é lida ou quando uma materializada que depende dela foi atualizada no período (o `REFRESH` lê a visão). A atualização da própria materializada não conta como leitura dela.
* **Pontos de atenção:** painel acima da lista, pedido pelo usuário no mesmo dia, com uma frase por visão que pede atenção, do mais urgente ao menos urgente: a materializada desatualizada que ainda é lida (quem a lê recebe dado antigo), a materializada sem dados, a materializada atualizada que ninguém lê (com o custo das atualizações) e a visão sem leitura. "Abrir" leva ao detalhe da visão. A partir de três visões do mesmo caso (duas, nas sem leitura), elas viram uma frase só, com os três primeiros nomes, e "Ver na lista" aplica o filtro de situação. Sem nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, "1 sem dados", "1 desatualizada" e "4 sem leitura em 30 dias" aplicam o filtro de situação com um clique e o tiram no segundo.
* **Detalhe:** nome, descrição, tipo, situação e os avisos em frases (desatualizada, sem dados, sem leitura com o custo das atualizações); os dados guardados e o comando que atualiza a materializada; a definição com "Copiar"; as colunas e os tipos; as dependências, em que cada visão citada abre o próprio detalhe; e as consultas que leem a visão. O texto copiado é só a definição, sem aviso de demonstração.
* **Paginação:** pedida pelo usuário no mesmo dia, junto com a de Índices. A lista mostra 15 visões por página, com "1 a 15 de 20" e as setas de página embaixo dela, e a paginação só aparece com mais de uma página: com as 9 visões simuladas, ela não aparece. Funciona como em Índices: no navegador, sobre a lista filtrada, de volta à primeira página com qualquer mudança de busca, filtro ou ordem, e as setas do detalhe trocam de página quando a visão seguinte está na outra.
* **URL:** sempre `/objetos/visoes`, sem parâmetros. A busca, os filtros, a ordem e a página ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** nove visões em três esquemas (`public`, `relatorios` e `auditoria`), sobre as tabelas que as consultas fictícias já usam. Para que as consultas leiam visões, cinco consultas secundárias passaram a citá-las no texto (`produtos_ativos`, `categorias_ativas`, `notificacoes_nao_lidas`, `entregas_pendentes` e `relatorios.resumo_avaliacoes`), sem mudar nenhum número, e o `REFRESH` passou a citar `relatorios.vendas_diarias`. `vendas_diarias` é atualizada e ninguém a lê, `resumo_avaliacoes` é lida e não é atualizada há mais de 30 dias e `estoque_por_categoria` está sem dados.

## Objetos do banco: Índices

Pedido pelo usuário em 18 de outubro de 2026: a tela "Índices" de Objetos do banco deixa de ser planejada. É o
inventário dos índices do banco conectado e responde a três perguntas: que índices existem e quanto espaço
ocupam, quais são lidos pelas consultas e quais só custam (ocupam disco e atrasam as gravações), e quais pedem
uma ação (os inválidos, os duplicados ou redundantes e os sem uso). As decisões foram as recomendadas na
descoberta, e as quatro sugestões foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /objetos/indices` devolve a lista inteira; a busca, os filtros e a ordem são feitos no navegador, como em Views. |
| Q2 | Janela do uso | As leituras dos últimos 30 dias: a API amostra os contadores do PostgreSQL, que só dão o acumulado desde o último reset. |
| Q3 | Chave primária e restrição única | Aparecem na lista com o selo da restrição e nunca são marcadas como sem uso nem recebem comando de remoção. Vale também para o índice único sem restrição. |
| Q4 | Ações sobre o banco | Só leitura. A tela mostra o comando pronto para copiar: `DROP INDEX CONCURRENTLY` para o sem uso, o duplicado e o redundante, e `REINDEX INDEX CONCURRENTLY` para o inválido. |
| Q5 | Situações apontadas | Sem uso em 30 dias, duplicado ou redundante e inválido. O inchaço estimado ficou de fora, porque sem `pgstattuple` a estimativa não é confiável. |
| Q6 | Clique no índice | Abre o modal centralizado com setas no rodapé, como em Views. |
| Q7 | Organização da lista | Uma lista só, com a coluna da tabela e um filtro por tabela. |
| S1 | Custo de manter | As frases e o detalhe dizem quanto o índice ocupa e quantas gravações recebeu em 30 dias: as inserções e as atualizações que não são HOT na tabela dele. Aprovada. |
| S2 | Consultas que usam o índice | O detalhe lista as consultas cujo plano registrado lê o índice, com "Ver plano" e "Ver histórico"; uma consulta que o usava num plano anterior oferece "Comparar planos". Aprovada. |
| S3 | Índices sugeridos | Os índices que os planos de execução sugerem aparecem com o comando para copiar e a consulta que os pediu. Aprovada. Ficavam num bloco abaixo da lista e passaram para uma aba ao lado dela no mesmo dia (ver "Paginação e abas"). |
| S4 | Data das estatísticas | A tela diz desde quando o uso é medido, e um índice com menos de 30 dias de coleta fica "Em observação" em vez de "Sem uso". Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /objetos/indices`, devolve numa resposta só todos os índices fora dos esquemas do sistema, cada um com a tabela (tamanho, linhas, inserções, atualizações e atualizações HOT dos 30 dias), o método, as colunas, as colunas incluídas, a condição, se é único, a restrição que sustenta, se é válido, a definição, o tamanho, as leituras e as linhas lidas dos 30 dias, desde quando a API o vê e as consultas cujo plano o lê; e os índices sugeridos pelos planos atuais. A resposta traz o instante em que foi gerada e desde quando a API coleta as estatísticas do banco.
* **Situação de cada índice**, nesta ordem: "Inválido" quando o `CREATE INDEX CONCURRENTLY` ou o `REINDEX CONCURRENTLY` não terminou; "Duplicado" quando outro índice válido da mesma tabela tem o mesmo método, as mesmas colunas e a mesma condição (fica marcado o índice comum, nunca o que garante unicidade; entre dois comuns, o menos lido); "Redundante" quando as colunas de um índice B-tree comum são o começo das de outro índice da mesma tabela, com a mesma condição; "Em uso" quando foi lido nos 30 dias; "Garante unicidade" quando não foi lido mas sustenta uma chave primária, uma restrição única ou é único; "Em observação" quando não foi lido e tem menos de 30 dias de coleta; "Sem uso" no resto.
* **Lista:** nome com o esquema e, embaixo, a tabela e as colunas; tipo (o método e, embaixo, chave primária, restrição única, único ou parcial); situação; tamanho; leituras em 30 dias. Ordem inicial por esquema, tabela e nome; dá para ordenar por tabela e nome, pelo tamanho (maiores primeiro) e pelas leituras (menos lidos primeiro). A tabela vira cartões em telas estreitas.
* **Pontos de atenção:** painel acima da lista, com uma frase por índice que pede atenção, do mais urgente ao menos urgente: inválido, duplicado, redundante e sem uso, cada caso do maior índice para o menor. Cada frase diz o espaço ocupado e as gravações recebidas em 30 dias. A partir de três índices do mesmo caso, eles viram uma frase só, com o espaço e as gravações somados, e "Ver na lista" aplica o filtro de situação. A última linha conta os índices sugeridos pelos planos e abre a aba deles. Sem nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, "1 inválido", "2 duplicados" (duplicados e redundantes) e "3 sem uso em 30 dias" aplicam o filtro de situação com um clique e o tiram no segundo. Ao lado da contagem também aparece "Uso medido desde 1 de setembro"; com menos de 30 dias de coleta, a frase explica que nenhum índice é marcado sem uso antes disso.
* **Comandos em lote:** pedido pelo usuário no mesmo dia. Com um filtro de situação aplicado, "Copiar os 3 comandos" copia de uma vez o comando de cada índice da lista filtrada, um por linha, só os comandos, sem aviso de demonstração.
* **Filtros em telas estreitas:** pedido pelo usuário no mesmo dia. Esquema e tabela dividem uma linha quando a barra tem até 560px, e cada um passa a dizer só "Esquema" e "Tabela" quando "Qualquer esquema" não cabe.
* **Detalhe:** nome, tabela, selos do método, da restrição e da situação; o aviso em frase; o comando que refaz ou remove o índice, com "Copiar" e o cuidado que ele pede; tamanho, leituras, linhas lidas e gravações dos 30 dias; a definição, com "Copiar"; as colunas na ordem do índice, as incluídas e a condição; as consultas cujo plano lê o índice; e os outros índices da mesma tabela, que abrem o próprio detalhe. O texto copiado é só o comando ou a definição, sem aviso de demonstração.
* **Índices sugeridos:** aba "Sugeridos pelos planos", com a tabela e as colunas, o `CREATE INDEX CONCURRENTLY` com "Copiar", a extensão que ele precisa, quando precisa, e as consultas cujo plano o pede, com "Ver plano" e "Ver histórico". Sem sugestão, a aba diz que os planos dos últimos 30 dias não pedem nenhum índice.
* **Paginação e abas:** pedido pelo usuário no mesmo dia, porque era preciso rolar muito para chegar ao fim da lista e às sugestões. A lista mostra 15 índices por página (eram 25 na primeira versão, o usuário achou muito), com "1 a 15 de 40" e as setas de página embaixo dela; com uma página só, a paginação não aparece. A paginação é feita no navegador, sobre a lista filtrada, e qualquer mudança de busca, filtro ou ordem volta à primeira página. As setas do detalhe percorrem a lista filtrada inteira e trocam de página quando o índice seguinte está na outra. Acima da lista, duas abas dividem o painel: "Índices existentes", com a busca, os filtros, a contagem, a tabela e a paginação, e "Sugeridos pelos planos", cada uma com a sua quantidade; em telas estreitas elas dizem só "Existentes" e "Sugeridos". Os pontos de atenção ficam acima das duas abas: "Ver na lista" volta para a primeira e "Ver sugestões" abre a segunda.
* **URL:** sempre `/objetos/indices`, sem parâmetros. A busca, os filtros, a ordem, a página e a aba ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** 40 índices nas tabelas que as consultas fictícias já usam e nas duas materializadas de Views (41 desde 19 de outubro de 2026, quando `clientes_documento_key`, o índice único sobre `somente_digitos(documento)`, entrou com a tela Funções). As leituras de cada índice saem dos planos simulados (as execuções da versão atual do plano de cada consulta vezes os laços da etapa que lê o índice), e as gravações saem das consultas `INSERT` e `UPDATE` de cada tabela, para as telas contarem a mesma história. `pedidos_cliente_id_idx` está inválido desde o instante em que a consulta dos pedidos por cliente trocou de plano, há três dias às 9h, e passou a ler a tabela inteira; `usuarios_email_idx` repete `usuarios_email_key`; `avaliacoes_produto_id_idx` é o começo de `avaliacoes_produto_id_criado_em_idx`; `pedidos_atualizado_em_idx`, `sessoes_usuario_id_idx` e `auditoria_alvo_idx` não são lidos; `cupons_valido_ate_idx` foi visto pela primeira vez há cinco dias. A coleta começou há 47 dias.

## Objetos do banco: Tabelas

Pedido pelo usuário em 19 de outubro de 2026: a tela "Tabelas" de Objetos do banco deixa de ser planejada. É o
inventário das tabelas do banco conectado e responde a três perguntas: que tabelas existem e quanto espaço
ocupam (dados, índices e TOAST), como cada uma é usada (leituras por índice, leituras da tabela inteira e
gravações), e quais pedem manutenção (linhas mortas, estatísticas antigas, idade de transação, falta de chave
primária). As decisões foram as recomendadas na descoberta, e as quatro sugestões foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /objetos/tabelas` devolve a lista inteira; a busca, os filtros e a ordem são feitos no navegador, como em Views e Índices. |
| Q2 | O que entra na lista | Só tabelas comuns. A tabela particionada aparece uma vez, com as partições somadas e listadas no detalhe; as visões materializadas continuam em Views. |
| Q3 | Ações sobre o banco | Só leitura, como Índices: a tela mostra o comando pronto para copiar (`VACUUM (FREEZE)`, `VACUUM (ANALYZE)`, `ANALYZE`) e o cuidado que ele pede. |
| Q4 | Situações apontadas | As cinco: linhas mortas, estatísticas desatualizadas, sem chave primária, lida inteira e idade de transação perto do limite. |
| Q5 | Janela do uso | As leituras e as gravações dos últimos 30 dias, a mesma janela de Índices. |
| Q6 | Tamanho na lista | O total na coluna; a divisão entre dados, índices e TOAST fica no detalhe. |
| Q7 | Ligação com as outras telas | Os índices do detalhe abrem Índices filtrado pela tabela, com o índice aberto; as visões que dependem dela abrem o detalhe em Views; as consultas têm "Ver plano" e "Ver histórico". |
| S1 | Crescimento em 30 dias | O tamanho e as linhas no início e no fim do período, com um gráfico diário do tamanho no detalhe. Aprovada. |
| S2 | Comandos em lote | Com um filtro de situação, "Copiar os N comandos", como em Índices. Aprovada. |
| S3 | Caminho de volta | O detalhe de um índice ganha a tabela dele, que abre o detalhe em Tabelas (ou em Views, numa materializada), e as tabelas das dependências em Views abrem o detalhe em Tabelas. Aprovada. |
| S4 | Autovacuum por tabela | Os ajustes de autovacuum da tabela no detalhe, com o valor do servidor e o comando que volta ao padrão. Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /objetos/tabelas`, devolve numa resposta só todas as tabelas fora dos esquemas do sistema, cada uma com o dono, a descrição, as colunas, a chave primária, o espaço em dados, índices e TOAST, as linhas vivas e mortas, as alterações desde o último ANALYZE, as gravações e as leituras (sequenciais e por índice, em número e em linhas) dos 30 dias, as quatro datas de manutenção, a idade das transações e o limite de congelamento, os ajustes de autovacuum, as partições, os índices, os índices sugeridos pelos planos, as visões que dependem dela, as consultas cujo plano a lê e um ponto de crescimento por dia. A resposta traz o instante em que foi gerada e desde quando a API coleta as estatísticas.
* **Situação de cada tabela**, do mais urgente ao menos urgente, e uma tabela pode ter várias: "Idade alta" quando a idade das transações passa de 50% do limite de congelamento (numa particionada, a de qualquer partição); "Precisa de VACUUM" quando as linhas mortas passam de 20% das vivas e são pelo menos 10 mil; "Lida inteira" quando a tabela tem 10 MB de dados ou mais e a maior parte das linhas lidas nos 30 dias veio de leituras da tabela inteira; "Estatísticas antigas" quando as linhas alteradas desde o último ANALYZE passam de 10% das linhas; "Sem chave primária". A regra da leitura inteira conta as linhas lidas (`seq_tup_read` contra `idx_tup_fetch`), não o número de leituras, porque uma leitura sequencial de uma tabela de 2 milhões de linhas pesa o mesmo que 2 milhões de leituras por índice: contando leituras, nenhuma tabela da simulação seria marcada, nem a dos pedidos, lida inteira 125 mil vezes no período.
* **Lista:** nome com o esquema e, embaixo, a descrição (ou "Sem descrição no banco"); a situação mais urgente, com "e mais 1 ponto" quando há outras; linhas, e embaixo quantas partições; tamanho total; leituras em 30 dias, e embaixo quantas foram da tabela inteira; última manutenção, o mais recente entre o VACUUM manual e o automático, ou "Sem registro". Ordem inicial pelo tamanho, maiores primeiro; dá para ordenar pelo nome, pelas linhas, pelo tamanho, pelas leituras (mais lidas primeiro) e pela última manutenção (mais antigas primeiro, as sem registro antes). 15 tabelas por página, com a paginação só quando há mais de uma. A tabela vira cartões em telas estreitas.
* **Pontos de atenção:** painel acima da lista, com uma frase por tabela que pede atenção, na ordem das situações e, em cada uma, da maior tabela para a menor. A partir de três tabelas na mesma situação, elas viram uma frase só, e "Ver na lista" aplica o filtro de situação. Uma tabela que precisa de VACUUM e tem estatísticas antigas aparece uma vez, na frase do VACUUM, que diz que o `VACUUM (ANALYZE)` resolve as duas coisas. Sem nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, um atalho por situação com tabelas ("1 com idade alta", "1 precisa de VACUUM", "5 lidas inteiras", "2 com estatísticas antigas", "1 sem chave primária") aplica o filtro com um clique e o tira no segundo. Ao lado da contagem também aparece "Uso medido desde 2 de setembro".
* **Comandos:** a idade alta pede `VACUUM (FREEZE)` em cada partição acima do limite (ou na tabela), as linhas mortas pedem `VACUUM (ANALYZE)` e as estatísticas antigas, sozinhas, pedem `ANALYZE`. A tabela lida inteira mostra os índices sugeridos pelos planos, cada um com o `CREATE INDEX CONCURRENTLY` e a extensão que ele precisa. Com o filtro de situação, "Copiar os N comandos" copia os comandos da lista filtrada, um por linha (os índices sugeridos, no caso da leitura inteira); a falta de chave primária não tem comando, porque a coluna certa depende dos dados.
* **Detalhe:** nome, descrição, selos (particionada, situações e demonstração); os avisos em frases; o comando de manutenção e os índices sugeridos, com "Copiar"; o crescimento em 30 dias, com o tamanho e as linhas de hoje, a variação no período, uma frase (que diz quando o espaço cresceu sem novas linhas) e o gráfico do tamanho por dia; o espaço em dados, índices e TOAST; as linhas vivas, mortas e alteradas, a idade das transações em porcentagem do limite e as quatro datas de manutenção; os ajustes de autovacuum da tabela, com o valor do servidor e o comando `ALTER TABLE … RESET`, ou a frase de que ela segue o servidor; as leituras e as gravações dos 30 dias; as consultas cujo plano lê a tabela, com a etapa e o índice, "Ver plano" e "Ver histórico"; as partições, com as linhas, o tamanho, o último autovacuum e a idade de cada uma; as colunas, com a chave primária marcada; os índices, que abrem Índices; e as visões que dependem dela, que abrem Views. O texto copiado é só o comando, sem aviso de demonstração.
* **Chegada de outra tela:** Índices, Views e Tabelas abrem o detalhe do objeto que a outra tela indicou ao navegar (no histórico do navegador, nunca na URL), já na página da lista em que ele está.
* **URL:** sempre `/objetos/tabelas`, sem parâmetros. A busca, os filtros, a ordem e a página ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** as 18 tabelas de `public` que as consultas fictícias e os índices simulados já usam, mais `importacoes_legado`, uma cópia da plataforma antiga sem chave primária e sem índices. As gravações saem das consultas `INSERT`, `UPDATE` e `DELETE` de cada tabela, as leituras por índice são as de Índices e as leituras inteiras saem dos `Seq Scan` dos planos atuais. `auditoria` é particionada por ano em sete partições, e a de 2020 chegou a 64% do limite de congelamento; `notificacoes` está com o autovacuum desligado, 1,2 milhão de linhas mortas, estatísticas de 1,2 milhão de linhas atrás e 8 MB a mais em 30 dias sem nenhuma linha nova; `sessoes` analisa a partir de 20% de alterações, o dobro do padrão, e está com as estatísticas antigas; `itens_pedido` tem os limites do autovacuum mais baixos que o servidor, sem nenhum problema; `usuarios`, `clientes`, `pedidos`, `produtos` e `sessoes` são lidas inteiras, e os planos sugerem índices para quatro delas. O último ANALYZE de `pedidos` sai do histórico do comando `ANALYZE pedidos`. A chave primária de `auditoria` passou a ser `(id, criado_em)` também em Índices, porque o PostgreSQL exige a chave de partição nela.

## Objetos do banco: Funções

Pedido pelo usuário em 19 de outubro de 2026: a tela "Funções" de Objetos do banco deixa de ser planejada, e
Objetos do banco fica sem tela planejada. É o inventário das funções e dos procedimentos do banco conectado e
responde a três perguntas: que funções existem e o que cada uma faz, quais são chamadas e quanto tempo gastam,
e quais pedem atenção (risco de segurança, código parado, funções caras). As decisões foram as recomendadas na
descoberta, e as quatro sugestões foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /objetos/funcoes` devolve a lista inteira; a busca, os filtros e a ordem são feitos no navegador, como nas outras telas de Objetos do banco. |
| Q2 | O que entra na lista | Funções, procedimentos e funções de gatilho criados no banco, com filtro de tipo. As que vêm de extensões, as agregações e as funções de janela ficam de fora. |
| Q3 | Uso (chamadas e tempo) | Chamadas, tempo total e tempo próprio dos 30 dias, quando o `track_functions` do servidor mede a função. Desligado, a tela diz isso, mostra o comando que o liga e não marca nenhuma função como sem chamadas. |
| Q4 | Ações sobre o banco | Só leitura, com os comandos prontos para copiar, como Índices e Tabelas. |
| Q5 | Situações apontadas | `SECURITY DEFINER` sem `search_path` fixo, sem chamadas em 30 dias (exceto quando um gatilho ativo, um índice ou uma visão dependem da função) e pesada. |
| Q6 | Clique na função | Abre o modal centralizado com setas no rodapé, como nas outras telas. |
| Q7 | Ligação com as outras telas | Os gatilhos abrem a tabela em Tabelas; as consultas cujo texto cita a função têm "Ver plano" e "Ver histórico"; os índices e as visões que dependem dela abrem as telas deles. As tabelas que a função lê por dentro não aparecem, porque o banco não registra essa dependência. |
| Q8 | Sobrecargas | Cada uma numa linha, com os argumentos ao lado do nome: no banco, são objetos distintos. |
| S1 | Busca no código | A busca procura também no código das funções, que é como achar quem usa uma tabela. Aprovada. |
| S2 | Comando do `search_path` | `ALTER FUNCTION … SET search_path` pronto para copiar nas `SECURITY DEFINER` sem caminho fixo. Aprovada. |
| S3 | Comandos em lote | Com um filtro de situação, "Copiar os N comandos", como em Índices e Tabelas. Aprovada. |
| S4 | Caminho de volta | O detalhe de uma tabela em Tabelas ganha a seção "Gatilhos", e cada gatilho abre a função dele aqui. Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /objetos/funcoes`, devolve numa resposta só todas as funções e os procedimentos fora dos esquemas do sistema e das extensões, cada um com o tipo, a linguagem, os argumentos, os parâmetros (nome, tipo, modo e valor padrão), o retorno, a volatilidade, se é estrita, se roda com os privilégios do dono (`SECURITY DEFINER`), as configurações próprias (`SET search_path = …`), o dono, a descrição, o código (`pg_get_functiondef`), desde quando a API a vê, o uso dos 30 dias, os gatilhos que a chamam, os índices e as visões que dependem dela e as consultas dos 30 dias cujo texto a cita. A resposta traz o instante em que foi gerada, desde quando a API coleta as estatísticas e o valor do `track_functions` do servidor (`none`, `pl` ou `all`).
* **Uso medido:** com `track_functions = none`, nenhuma função tem uso; com `pl`, só as funções em linguagens procedurais (as em SQL e em C aparecem como "Não medida"); com `all`, todas. A API manda o uso nulo quando o servidor não mede a função, e a tela nunca trata uma função não medida como sem chamadas.
* **Situação de cada função**, do mais urgente ao menos urgente, e uma função pode ter várias: "Risco de segurança" quando roda com os privilégios do dono e não fixa o `search_path` (quem puder criar objetos num esquema do caminho de busca faz a função executar código dele com aqueles privilégios); "Pesada" quando cada chamada leva 100 ms ou mais em média, o mesmo limite que separa as consultas rápidas das moderadas; "Sem chamadas" quando a função é medida, não foi chamada nos 30 dias, a API a vê há 30 dias ou mais (antes disso, fica "Em observação", como os índices) e nenhum gatilho ativo, índice ou visão depende dela.
* **Lista:** nome com o esquema e os argumentos e, embaixo, a descrição (ou "Sem descrição no banco"; numa busca que só achou o termo no código, "Encontrada no código"); tipo e, embaixo, a linguagem; a situação mais urgente, com "e mais 1 ponto" quando há outras; chamadas em 30 dias ("Não medida" e "Em observação" quando é o caso); tempo médio por chamada e, embaixo, o tempo total. Ordem inicial por esquema e nome; dá para ordenar pelo nome, pelas chamadas, pelo tempo total e pelo tempo médio (os maiores primeiro, as não medidas no fim). 15 funções por página, com a paginação só quando há mais de uma. A tabela vira cartões em telas estreitas.
* **Filtros:** busca no nome, na descrição, nos argumentos e no código; tipo (função, procedimento, de gatilho), esquema, linguagem e situação.
* **Pontos de atenção:** painel acima da lista, com uma frase por função que pede atenção, na ordem das situações. A partir de três funções na mesma situação, elas viram uma frase só, e "Ver na lista" aplica o filtro de situação. Sem nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, "1 com risco de segurança", "1 pesada" e "3 sem chamadas em 30 dias" aplicam o filtro com um clique e o tiram no segundo. Ao lado da contagem também aparece "Uso medido desde 2 de setembro".
* **Sem medida do servidor:** com `track_functions = none`, um aviso acima da lista diz que o banco não mede as chamadas das funções, que por isso nenhuma é marcada sem chamadas ou pesada, e oferece o comando que liga a medida das funções em linguagens procedurais (`ALTER SYSTEM SET track_functions = 'pl'` e `SELECT pg_reload_conf()`), que não precisa reiniciar o servidor.
* **Comandos:** o risco de segurança pede `ALTER FUNCTION` (ou `ALTER PROCEDURE`) `… SET search_path = <esquema da função>, pg_temp`; a função sem chamadas, `DROP FUNCTION` (ou `DROP PROCEDURE`), precedido do `DROP TRIGGER` de cada gatilho desativado que ainda a cita. Cada comando vem com o cuidado que pede: conferir os objetos de outros esquemas que o corpo usa sem o nome do esquema, e procurar o nome da função no código da aplicação e nos agendamentos, porque uma rotina mensal ou anual não aparece em 30 dias. A função pesada não tem comando, porque a correção está no código dela. Com o filtro de situação, "Copiar os N comandos" copia os comandos da lista filtrada, um por linha.
* **Detalhe:** nome com os argumentos, descrição, selos (tipo, linguagem, volatilidade, `SECURITY DEFINER`, situações e demonstração); os avisos em frases; o comando, com "Copiar"; o uso dos 30 dias (chamadas, tempo total, tempo médio e tempo próprio, a parte gasta dentro da própria função); os parâmetros e o retorno, com a volatilidade e as configurações explicadas; o código, com "Copiar"; os gatilhos que a chamam, cada um com a tabela, o momento, os eventos e se está ativo, que abrem a tabela em Tabelas; as consultas que a citam, com "Ver plano" e "Ver histórico"; e os índices e as visões que dependem dela, que abrem as telas deles. O texto copiado é só o comando ou o código, sem aviso de demonstração.
* **Gatilhos em Tabelas (S4):** o detalhe de uma tabela ganha a seção "Gatilhos", com o nome, o momento, os eventos e se está ativo, e cada gatilho abre a função dele em Funções. A tabela sem gatilho diz que nenhuma gravação nela dispara função.
* **Funções em Índices:** pedido pelo usuário no mesmo dia. O detalhe de um índice que usa uma função na expressão ou na condição ganha a seção "Funções que ele usa", que abre a função em Funções e avisa que mudar o código dela sem um REINDEX deixa o índice com resultados antigos. Um índice sem função não mostra a seção.
* **URL:** sempre `/objetos/funcoes`, sem parâmetros. A busca, os filtros, a ordem e a página ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** 13 funções em `public`, `relatorios` e `auditoria`, com o servidor em `track_functions = pl`. As chamadas saem das outras telas: as dos gatilhos são as gravações de Tabelas (`definir_atualizado_em` em cada atualização de `pedidos`, `validar_estoque` em cada atualização de `estoque`, `avisar_sessoes_expiradas` uma vez por limpeza de sessões), as de `calcular_total_pedido` são as execuções da consulta que registra um pagamento, que passou a chamá-la no texto sem mudar nenhum número, e `calcular_frete` é chamada por ela. `avisar_sessoes_expiradas` é pesada; `arquivar_pedidos_antigos` roda com os privilégios de `postgres` sem `search_path` fixo e não é chamada; `gerar_slug` e `copiar_cliente_para_legado`, cujo gatilho foi desativado depois da migração, também não; a versão de `calcular_frete` com frete expresso foi criada há quatro dias e está em observação; `auditoria.registrar_alteracao` tem um gatilho ativo numa tabela que ninguém grava, e por isso não é marcada; `somente_digitos` sustenta o índice único `clientes_documento_key`, que entrou em Índices (são 41 agora). Os controles do console ganham `rastrearFuncoes('none' | 'pl' | 'all')`.

## Usuários e permissões: Papéis

Pedido pelo usuário em 19 de outubro de 2026: a tela "Papéis" de Usuários e permissões deixa de ser planejada. É
o inventário dos papéis do servidor conectado, usuários e grupos, e responde a três perguntas: quem existe e o que
cada um pode fazer, quem está em uso e quem é um risco (superusuário a mais, senha vencida ou fraca, papel
esquecido). Permissões continua planejada: esta tela não lista as permissões por tabela. As decisões
foram as recomendadas na descoberta, e as quatro sugestões foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /usuarios/papeis` devolve a lista inteira; a busca, os filtros e a ordem são feitos no navegador, como nas telas de Objetos do banco. |
| Q2 | O que entra na lista | Os papéis criados no servidor. Os predefinidos do PostgreSQL (`pg_*`) ficam de fora e só aparecem em "Membro de", quando alguém participa deles. |
| Q3 | Ações sobre o banco | Só leitura, com os comandos prontos para copiar, como em Índices, Tabelas e Funções. Revista em 20 de outubro de 2026: os comandos de papéis passam a ser executados depois de uma revisão (ver "Usuários e permissões: administração e Alterações"). |
| Q4 | Uso | O PostgreSQL não registra o último login: a API amostra o `pg_stat_activity` e informa quando viu o papel conectado pela última vez. Antes de 30 dias de coleta, o usuário sem sessão fica "Em observação", como os índices. |
| Q5 | Senha | A validade (`rolvaliduntil`) e o formato em que a senha está guardada (SCRAM ou MD5), quando a conexão da API pode ler `pg_authid`; sem isso, a tela diz que o formato não está disponível. |
| Q6 | Situações apontadas | Superusuário com login além do criado na instalação, senha vencida ou que vence em até 7 dias, senha em MD5, sessões em 80% ou mais do limite do papel, usuário sem nenhuma sessão em 30 dias e grupo sem membros que não é dono de nada. |
| Q7 | Herança | O detalhe mostra os atributos que o papel ganha ao assumir um grupo com SET ROLE, com o caminho, e as permissões que ele herda pelos grupos. |
| Q8 | Papel da conexão em uso | Marcado com o selo "Você", na lista e no detalhe. |
| Q9 | Sessões na lista | Só a contagem de agora e o limite. Desde que Sessões ficou pronta, o detalhe abre as sessões do papel lá. |
| S1 | Comandos em lote | Com um filtro de situação, "Copiar os N comandos", como em Índices. Aprovada. |
| S2 | Configurações por papel | O detalhe mostra o `statement_timeout`, o `search_path` e as outras configurações definidas com `ALTER ROLE … SET`, e avisa quando um usuário comum não tem `statement_timeout`. Aprovada. |
| S3 | Caminho de volta | O dono no detalhe de Tabelas, Views e Funções vira link para o papel aqui. Aprovada. |
| S4 | Cruzamento com Funções | A função `SECURITY DEFINER` sem `search_path` fixo aparece no detalhe do papel dono dela, como risco herdado. Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /usuarios/papeis`, devolve numa resposta só todos os papéis fora dos
  predefinidos, cada um com a descrição, se é o criado na instalação, os atributos (login, superusuário, cria
  bancos, cria papéis, replicação, ignora RLS, herda), o limite de conexões, a validade e o formato da senha, as
  configurações próprias, de quem é membro e quem é membro dele (com herança, SET ROLE e se pode conceder a
  outros), as sessões abertas agora, quando a API o viu conectado pela última vez, desde quando a API o vê e os
  objetos deste banco de que é dono. A resposta traz o instante em que foi gerada, desde quando a API acompanha
  as sessões e o papel com que a API está conectada.
* **Situação de cada papel**, do mais urgente ao menos urgente, e um papel pode ter várias: "Superusuário" quando
  um usuário que faz login é superusuário e não é o criado na instalação; "Senha vencida" ou "Senha a vencer"
  quando a validade passou ou acaba em até 7 dias; "Senha em MD5", formato que o PostgreSQL 18 marca como
  obsoleto; "Perto do limite" quando as sessões abertas chegam a 80% do limite do papel; "Sem uso" quando o
  usuário não abriu nenhuma sessão nos 30 dias e a API o vê há 30 dias ou mais (antes disso, "Em observação");
  "Grupo vazio" quando um grupo não tem membros nem é dono de nenhum objeto.
* **Atributos e SET ROLE:** no PostgreSQL, os atributos não passam pela participação num grupo; valem só depois de
  SET ROLE. O detalhe mostra os atributos que o papel ganha assim, com o grupo de onde vem cada um, e avisa em
  vermelho quando um usuário consegue virar superusuário por esse caminho.
* **Lista:** nome e, embaixo, a descrição (ou "Sem descrição no banco"), com o selo "Você" no papel da conexão; a
  situação mais urgente, com "e mais 1 ponto" quando há outras; o tipo (usuário ou grupo) e, embaixo, os
  atributos; as sessões agora, com o limite embaixo quando há; o último uso ("Agora", "Há 3 dias", "Nunca visto",
  "Em observação"); a validade da senha, com o formato embaixo. Num grupo, as três últimas colunas não se
  aplicam. Ordem inicial pelo nome, usuários antes dos grupos; dá para ordenar pelas sessões, pelo último uso e
  pela validade (os grupos no fim). 15 papéis por página, com a paginação só quando há mais de uma. A tabela vira
  cartões em telas estreitas.
* **Filtros:** busca no nome e na descrição; tipo (usuários, grupos), atributo e situação.
* **Pontos de atenção:** painel acima da lista, com uma frase por papel que pede atenção, na ordem das situações.
  A partir de três papéis na mesma situação, eles viram uma frase só, e "Ver na lista" aplica o filtro. Sem
  nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, um atalho por situação com papéis ("1 superusuário", "2 senhas
  vencidas ou a vencer"…), que aplica o filtro com um clique e o tira no segundo. Ao lado da contagem também
  aparece "Sessões acompanhadas desde 2 de setembro".
* **Comandos:** o superusuário pede `ALTER ROLE … NOSUPERUSER`; a senha vencida ou a vencer, `ALTER ROLE … VALID
  UNTIL` com 90 dias à frente; a senha em MD5, `SET password_encryption = 'scram-sha-256'` e `\password` no
  psql; o limite, `ALTER ROLE … CONNECTION LIMIT` com metade a mais; o usuário sem uso, `ALTER ROLE … NOLOGIN`,
  que se desfaz com `LOGIN`; o grupo vazio, `DROP ROLE`. Nenhum comando leva uma senha no texto. Cada um vem com o
  cuidado que pede, e com o filtro de situação "Copiar os N comandos" copia os da lista filtrada, um por linha.
* **Detalhe:** nome, descrição e selos (tipo, "Você", atributos, situações, demonstração); os avisos em frases;
  os comandos, com "Copiar"; o acesso de um usuário (sessões, limite, último uso e formato da senha, com a
  validade em frase); os atributos explicados e os que ele ganha com SET ROLE; "Membro de" e "Membros", que abrem
  o outro papel (um papel predefinido aparece sem link); as configurações próprias explicadas, com o aviso do
  `statement_timeout` (S2); e os objetos de que é dono, seis de cada vez, que abrem Tabelas, Views e Funções.
* **Risco herdado (S4):** o papel dono de uma função `SECURITY DEFINER` que não fixa o `search_path` recebe o
  aviso no detalhe, em vermelho quando ele é superusuário.
* **Dono em Objetos do banco (S3):** o detalhe de uma tabela, de uma visão e de uma função mostra "Dono" com o nome
  do papel, que abre o papel em Papéis.
* **URL:** sempre `/usuarios-e-permissoes/papeis`, sem parâmetros. A busca, os filtros, a ordem e a página ficam
  no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** 15 papéis, mais o papel da conexão quando ele não está entre eles. Os donos são os de Tabelas,
  Views e Funções, e as sessões somadas dão as conexões ativas do Dashboard: `loja_app` fica com o que sobra.
  `migracao` faz login como superusuário; a senha de `relatorio_bi` venceu há 12 dias e a de `loja_analise` vence
  em 5; `auditoria_app` guarda a senha em MD5; `fila_pedidos` usa 4 das 5 conexões dele; `integracao_erp` não
  conecta há 41 dias; `relatorios_antigos` é um grupo vazio; `exportacao_temp` foi criado há quatro dias e está em
  observação; `suporte_dba` assume `loja_admin`, que cria bancos e papéis, sem herdar as permissões dele; e
  `postgres` é dono de `arquivar_pedidos_antigos`, a `SECURITY DEFINER` sem `search_path` fixo de Funções.
  `falhar('/usuarios')` mostra o estado de erro.

## Usuários e permissões: Sessões

Pedido pelo usuário em 19 de outubro de 2026: a tela "Sessões" de Usuários e permissões deixa de ser planejada. É
o retrato do `pg_stat_activity` do servidor conectado e responde a três perguntas: quem está usando o servidor
agora, se há algo travado (bloqueios, sessões paradas com uma transação aberta, consultas longas) e o que fazer a
respeito. Permissões continua planejada. As decisões foram as recomendadas na descoberta, e as quatro sugestões
foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /usuarios/sessoes` devolve o retrato inteiro numa resposta só; a busca, os filtros e a ordem são feitos no navegador, como em Papéis. A lista é limitada pelo `max_connections`. |
| Q2 | Ações sobre o banco | Só leitura: `pg_cancel_backend` e `pg_terminate_backend` aparecem como comandos prontos para copiar. O Orynt não executa nada no banco. |
| Q3 | O que entra na lista | As sessões de cliente de todos os bancos do servidor, com o filtro de banco começando no banco da conexão. Os processos do servidor (replicação, autovacuum, checkpointer e os outros) ficam atrás da chave "Mostrar processos do servidor". |
| Q4 | Texto da consulta | A API troca os literais por `$1`, como o `pg_stat_statements`, para os dados dos clientes não chegarem ao navegador. O `query_id` liga a consulta da sessão à lista de Consultas SQL. |
| Q5 | Atualização | Um retrato tirado num instante, com "Atualizar" e uma atualização automática opcional a cada 10 segundos, que pausa com a aba oculta ou com um detalhe aberto. |
| Q6 | Situações apontadas | Bloqueando outras sessões; esperando um bloqueio há 30 s ou mais; ociosa em transação há 5 min ou mais; consulta rodando há 5 min ou mais; transação aberta há 30 min ou mais. |
| Q7 | Cadeias de bloqueio | Painel acima da lista, com a cadeia em árvore a partir de `pg_blocking_pids`, só quando existe uma. |
| Q8 | Ligações | Papéis abre Sessões filtrada pelo papel; a sessão abre o papel em Papéis e, quando a consulta está na lista de 30 dias, o plano e o histórico dela. |
| S1 | Comandos em lote | Com um filtro de situação, "Copiar os N comandos", como em Índices. Aprovada. |
| S2 | Atalho no Dashboard | O cartão "Conexões ativas" vira link para Sessões, como "Consultas lentas". Aprovada. |
| S3 | Quem ocupa as conexões | As sessões por aplicação e por origem, ao lado do resumo. Aprovada. |
| S4 | Tempo ocioso em transação | O papel que deixou transações paradas três vezes ou mais em 30 dias, sem `idle_in_transaction_session_timeout` nele nem no servidor, recebe a sugestão de `ALTER ROLE … SET idle_in_transaction_session_timeout`, em Sessões e no detalhe do papel em Papéis. Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /usuarios/sessoes`, devolve numa resposta só cada processo do `pg_stat_activity`
  com o PID, o tipo (cliente, replicação, autovacuum ou outro processo do servidor), o papel, o banco, a
  aplicação, o endereço do cliente, os instantes de início da sessão, da transação, da consulta e do estado, o
  estado, o evento de espera, a consulta com os literais trocados por `$1` e o id dela em Consultas SQL quando
  existe, os PIDs que a bloqueiam e os bloqueios que ela segura ou espera. A resposta traz o instante em que foi
  gerada, o banco da conexão, o `max_connections`, o `idle_in_transaction_session_timeout` do servidor e, para
  cada papel com sessão, o limite, as configurações próprias e quantas vezes a API o viu parado numa transação
  por 5 min ou mais em 30 dias. A sessão do próprio Orynt vem marcada.
* **Conexões:** o resumo conta as sessões de cliente e as de replicação, o mesmo número das conexões ativas do
  Dashboard e da soma das sessões de Papéis. Os outros processos do servidor não contam.
* **Situação de cada sessão**, do mais urgente ao menos urgente, e uma sessão pode ter várias: "Bloqueando" quando
  outra sessão espera por ela e ela mesma não espera; "Esperando bloqueio" quando a consulta espera um bloqueio há
  30 s ou mais; "Transação parada" quando está ociosa com uma transação aberta há 5 min ou mais; "Consulta longa" quando a consulta
  roda há 5 min ou mais sem esperar bloqueio; "Transação longa" quando a transação está aberta há 30 min ou mais,
  o que segura o VACUUM em todas as tabelas. Os tempos são medidos a partir do instante da resposta, nunca do
  relógio do navegador. A sessão do Orynt e os processos do servidor nunca são apontados.
* **Resumo:** as conexões sobre o `max_connections`, com a barra de ocupação do Dashboard; as sessões de cliente
  por estado (ativa, esperando, ociosa em transação, ociosa); o instante do retrato, "Atualizar" e a chave da
  atualização automática. Ao lado, as sessões por aplicação e por origem (S3), as cinco maiores de cada.
* **Cadeias de bloqueio:** a sessão que bloqueia na raiz e, abaixo dela, as que esperam, com o papel, o estado, a
  consulta e há quanto tempo cada uma está assim. Cada sessão abre o detalhe.
* **Lista:** o PID com o selo "Orynt" na sessão do Orynt, e embaixo o papel, a aplicação e o banco quando não é o
  da conexão; a situação mais urgente, com "e mais 1 ponto"; o estado e, embaixo, o evento de espera; a consulta,
  em até duas linhas; há quanto tempo está no estado; há quanto tempo a transação está aberta. Ordem inicial pela
  situação mais urgente e, depois, pelo maior tempo no estado; dá para ordenar pelo PID, pelo tempo no estado e
  pela transação. 15 sessões por página, com a paginação só quando há mais de uma. A tabela vira cartões em telas
  estreitas.
* **Filtros:** busca no PID, no papel, na aplicação, no endereço e na consulta; banco, estado, situação, papel e a
  chave dos processos do servidor.
* **Pontos de atenção:** painel acima da lista, com uma frase por sessão que pede atenção, citada uma vez só, na
  situação mais urgente dela;
  a partir de três sessões na mesma situação, elas viram uma frase só, e "Ver na lista" aplica o filtro. A
  sugestão do S4 entra no fim, com "Abrir papel". Sem nenhum ponto, o painel não aparece.
* **Atalhos de atenção:** ao lado da contagem, um atalho por situação com sessões, que aplica o filtro com um
  clique e o tira no segundo.
* **Comandos:** a consulta ativa pede `pg_cancel_backend(pid)`, que interrompe só a consulta; a sessão ociosa em
  transação, a que bloqueia parada e a transação longa parada pedem `pg_terminate_backend(pid)`, que encerra a
  sessão e desfaz a transação. Cada um vem com o cuidado que pede, e com um filtro de situação "Copiar os N
  comandos" copia os da lista filtrada, um por linha (S1). A sessão do Orynt nunca recebe comando.
* **Detalhe:** PID, papel, aplicação e selos (tipo, estado, "Orynt", situações, demonstração); os avisos em frases;
  os comandos, com "Copiar"; a linha do tempo (início da sessão, da transação, da consulta e do estado atual até
  o retrato); a consulta, com "Copiar", "Ver plano" e "Ver histórico" quando ela está em Consultas SQL; quem ela
  bloqueia e por quem espera, que abrem a outra sessão; os bloqueios que segura e espera; a conexão (papel, que
  abre Papéis, banco, aplicação, endereço e processo); e a sugestão do S4 quando o papel a tem.
* **Papéis (Q8 e S4):** o detalhe de um usuário com sessões abertas ganha "Ver as N sessões", que abre Sessões
  filtrada pelo papel, e a seção "Configurações próprias" ganha a sugestão do S4 quando ela se aplica.
* **Dashboard (S2):** o cartão "Conexões ativas" vira link para Sessões, como "Consultas lentas".
* **URL:** sempre `/usuarios-e-permissoes/sessoes`, sem parâmetros. A busca, os filtros, a ordem, a página e a
  atualização automática ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** as sessões de cada papel são as de Papéis, e somadas dão as conexões ativas do Dashboard; o
  `replicador` é a sessão de replicação. Uma sessão de `loja_app` atualizou um pedido e ficou parada com a
  transação aberta, segurando o bloqueio da linha: duas de `fila_pedidos` e outra de `loja_app` esperam por ela.
  `loja_analise` tem uma consulta de relatório rodando há mais de 5 min e outra sessão parada numa transação
  aberta há mais de 30 min; ela fez isso nove vezes em 30 dias e não tem `idle_in_transaction_session_timeout`,
  por isso recebe a sugestão do S4. `suporte_dba` está conectado pelo psql ao banco `postgres`. Os episódios se
  repetem em janelas do relógio, para os tempos crescerem entre uma atualização e outra.
  `falhar('/usuarios')` mostra o estado de erro também desta tela.

## Usuários e permissões: Permissões

Pedido pelo usuário em 19 de outubro de 2026: a tela "Permissões" de Usuários e permissões deixa de ser planejada.
Mostra o que cada papel pode fazer em cada objeto do banco conectado e responde a três perguntas: o que um papel
consegue fazer, e por qual caminho; quem consegue ler ou alterar um objeto; e quais permissões são um risco ou
estão faltando. Completa Papéis, que mostra os atributos de cada papel mas não as permissões por objeto. As
decisões foram as recomendadas na descoberta, com as situações a, b, d, e, f e g de Q5, e as quatro sugestões
foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Origem dos dados | `GET /usuarios/permissoes` devolve numa resposta só as permissões de todos os objetos, os papéis com as participações e os privilégios padrão; a busca, os filtros e o cálculo do acesso efetivo são feitos no navegador, como em Papéis. |
| Q2 | Eixo da tela | Três modos num controle segmentado, sobre o mesmo DTO: "Por papel" (o que um papel alcança), "Por objeto" (quem alcança um objeto) e "Comparar papéis" (S4). |
| Q3 | Que permissões contam | As efetivas, cada uma com a origem: direta, por um grupo (só nas participações que herdam), por PUBLIC, por ser dono ou por ser superusuário. |
| Q4 | Objetos desta versão | O banco (`CONNECT`, `CREATE`, `TEMPORARY`), os esquemas (`USAGE`, `CREATE`), as tabelas, as visões e as visões materializadas (com as permissões por coluna), as sequências, as funções e os procedimentos (`EXECUTE`), além dos privilégios padrão. As políticas de RLS ficam fora. |
| Q5 | Situações apontadas | Função `SECURITY DEFINER` que PUBLIC executa; PUBLIC com `CREATE` num esquema; `WITH GRANT OPTION` dado a um usuário que não é dono; escrita num grupo de leitura; privilégio num objeto sem `USAGE` no esquema dele, e `USAGE` num esquema sem nenhum objeto dele; grupo que lê um esquema sem privilégio padrão para os objetos novos. A permissão dada direto a um usuário não é apontada. |
| Q6 | Ações sobre o banco | Só leitura, com os comandos `GRANT`, `REVOKE` e `ALTER DEFAULT PRIVILEGES` prontos para copiar. Revista em 20 de outubro de 2026: esses comandos passam a ser executados depois de uma revisão (ver "Usuários e permissões: administração e Alterações"). |
| S1 | Comandos em lote | Com um filtro de situação, "Copiar os N comandos" da lista filtrada, como em Índices. Aprovada. |
| S2 | Quem acessa | O detalhe de Tabelas, Views e Funções ganha a seção "Quem acessa", com os papéis que alcançam o objeto, que abrem a linha em Permissões. Aprovada. |
| S3 | Caminho a partir de Papéis | O detalhe de um papel ganha "Ver o que ele pode fazer em Permissões". Aprovada. |
| S4 | Comparar dois papéis | O modo "Comparar papéis" mostra lado a lado o acesso de dois papéis a cada objeto, só as diferenças por padrão, e começa no papel mais parecido. Aprovada. |

Regras:

* **Dados:** uma rota nova, `GET /usuarios/permissoes`, devolve o banco, os esquemas fora dos do sistema, as
  tabelas, as visões, as sequências, as funções e os procedimentos, cada um com o dono, se roda como `SECURITY
  DEFINER` e a ACL explodida (beneficiário, privilégio, concedente, se pode repassar e as colunas, quando a
  concessão é por coluna), com a ACL padrão do tipo quando ela é nula e sem as entradas do dono para ele mesmo.
  Traz também os papéis (nome, descrição, login, superusuário e de quem é membro, com herança) e os privilégios
  padrão (`pg_default_acl`).
* **Acesso efetivo:** o superusuário pode tudo; o dono, e quem herda o papel dono, pode tudo; os outros recebem as
  concessões feitas a eles, aos grupos que herdam e a PUBLIC. Um grupo do qual o papel participa sem herdar não
  conta: vale só depois de `SET ROLE`, e a tela avisa isso acima da lista. O nível de cada linha é "Total" (dono
  ou superusuário), "Leitura e escrita" ou "Escrita" (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `CREATE`),
  "Leitura", "Uso", "Conexão" ou "Execução" (`SELECT`, `USAGE`, `CONNECT`, `TEMPORARY`, `EXECUTE`, com a palavra
  do tipo de objeto), "Manutenção" (`REFERENCES`, `TRIGGER`, `MAINTAIN`) ou "Sem acesso".
* **Situações**, da mais urgente à menos urgente, e uma linha pode ter várias: "Aberta a todos", a função
  `SECURITY DEFINER` que PUBLIC executa; "Todos criam aqui", o esquema em que PUBLIC tem `CREATE`; "Escrita na
  leitura", a escrita concedida a um grupo de leitura (um grupo que lê três objetos ou mais e grava em no máximo
  um quarto deles), também na linha de cada membro; "Pode repassar", a concessão com `WITH GRANT OPTION` feita
  direto a um usuário que não é dono; "Sem USAGE", o privilégio próprio num objeto de um esquema em que o papel
  não tem `USAGE`; "Sem privilégio padrão", o grupo que lê dois objetos ou mais de um esquema sem privilégio
  padrão de `SELECT` para os donos desses objetos; "USAGE sem objetos", o `USAGE` dado direto num esquema em que
  o papel não alcança nenhum objeto nem tem `CREATE`.
* **Por papel:** começa no papel da conexão; o seletor tem os usuários, os grupos e PUBLIC. A lista traz cada
  objeto, do banco às funções, com a situação mais urgente, o nível e os privilégios, e a origem resumida
  ("Direta", "Pelo grupo leitura", "PUBLIC", "Dono", "Superusuário", "Direta e pelo grupo leitura"). Por padrão
  mostra só os objetos com algum acesso; o filtro de acesso mostra os sem acesso.
* **Por objeto:** começa na primeira tabela em ordem de esquema e nome. A lista traz PUBLIC na primeira linha,
  quando PUBLIC tem algum privilégio, e os papéis com acesso próprio, do nível mais alto ao mais baixo, usuários
  antes dos grupos. Quem só recebe o acesso de PUBLIC está na linha de PUBLIC.
* **Comparar papéis (S4):** dois seletores e "Inverter"; o segundo começa no papel mais parecido com o primeiro
  (o maior índice de Jaccard sobre os privilégios próprios, sem superusuários). A lista mostra, por objeto, o
  nível e os privilégios de cada um, com os que só um dos dois tem marcados, e a chave "Só as diferenças".
* **Filtros:** busca no nome do objeto (ou do papel e da descrição, em "Por objeto"), esquema, tipo de objeto,
  tipo de papel, acesso e situação, conforme o modo. 15 linhas por página, com a paginação só quando há mais de
  uma. A tabela vira cartões em telas estreitas, e o controle dos modos dá lugar a um select nas mais estreitas.
* **Pontos de atenção:** painel acima da lista, com uma frase por caso, na ordem das situações. "Abrir" leva a
  lista ao modo e à seleção em que o caso aparece e abre a linha; quando um papel tem o mesmo caso em vários
  objetos, "Ver na lista" aplica o filtro de situação. A partir de três casos do mesmo tipo, eles viram uma frase
  só, com "Abrir o primeiro". Sem nenhum ponto, o painel não aparece.
* **Atalhos e comandos:** ao lado da contagem, um atalho por situação presente na lista, que aplica o filtro. Cada
  situação tem o comando que a resolve (`REVOKE EXECUTE … FROM PUBLIC`, `REVOKE CREATE ON SCHEMA … FROM PUBLIC`,
  `REVOKE … FROM` o grupo, `REVOKE GRANT OPTION FOR …`, `GRANT USAGE ON SCHEMA …`, `ALTER DEFAULT PRIVILEGES …`
  com os `GRANT` do que já ficou de fora, `REVOKE USAGE ON SCHEMA …`), com o cuidado que pede; com o filtro de
  situação, "Copiar os N comandos" (S1).
* **Detalhe:** o objeto (nome, tipo e dono) e, para o papel (ou os dois, na comparação), o nível, as situações em
  frases, os comandos, cada privilégio com o efeito e todas as origens em frases (com o caminho dos grupos, o
  concedente, o `WITH GRANT OPTION` e as colunas), como tirar o acesso (a concessão direta, a participação no
  grupo ou PUBLIC; o dono e o superusuário não têm um `REVOKE`) ou, sem acesso, os comandos que concedem o
  mínimo, com o `USAGE` no esquema quando falta. "Ver também" leva a todos que acessam o objeto, a tudo o que o
  papel acessa, à comparação, a Papéis e a Tabelas, Views ou Funções. As setas percorrem a lista filtrada.
* **Privilégios padrão:** painel abaixo da lista com cada privilégio padrão em frase e o comando, marcando os que
  alcançam o papel em análise.
* **Quem acessa (S2):** no detalhe de Tabelas, Views e Funções, os papéis com acesso próprio, PUBLIC quando tem
  algum privilégio, e os superusuários numa frase; cada item abre a linha em Permissões, no modo "Por objeto". As
  permissões são pedidas uma vez, quando o primeiro detalhe abre.
* **Papéis (S3):** a seção "Participação" do detalhe ganha "Ver o que ele pode fazer em Permissões".
* **URL:** sempre `/usuarios-e-permissoes/permissoes`, sem parâmetros. O modo, os papéis, o objeto, a busca, os
  filtros e a página ficam no histórico do navegador, como nas outras telas.
* **Sem conexão e demonstração:** o mesmo painel e o mesmo aviso "Dados demonstrativos" das outras telas.
* **Simulação:** os papéis de Papéis e os objetos de Tabelas, Views e Funções, com os mesmos donos, mais as
  sequências das chaves e os três esquemas. O banco veio de uma versão anterior ao PostgreSQL 15, e PUBLIC ainda
  cria objetos em `public`; PUBLIC executa todas as funções, inclusive `arquivar_pedidos_antigos`, a `SECURITY
  DEFINER` de `postgres`, menos `auditoria.registrar_alteracao`; o grupo `leitura` lê as tabelas e visões de
  `loja_app` e duas visões de `relatorios`, mas `migracao` lhe deu `UPDATE` em `produtos`, e
  `relatorios.estoque_por_categoria` ficou de fora porque `relatorios` não tem privilégio padrão para ele;
  `integracao_erp` pode repassar o `SELECT` em `pedidos` e `pagamentos`; `relatorio_bi` lê
  `auditoria.acoes_recentes` sem `USAGE` em `auditoria`; `relatorios_antigos` tem `USAGE` em `relatorios` e mais
  nada; `fila_pedidos` lê e atualiza `pedidos` e `estoque`; `loja_admin` cria esquemas e mantém (`MAINTAIN`) as
  tabelas de `loja_app`, mas `suporte_dba` participa dele sem herdar; e `suporte_dba` lê só `id`, `email` e
  `criado_em` de `usuarios`. `falhar('/usuarios')` mostra o estado de erro também desta tela.

## Usuários e permissões: administração e Alterações

Pedido pelo usuário em 20 de outubro de 2026: gerenciar os papéis pelo Orynt (criar, alterar, excluir, listar, GRANT
e REVOKE). Até aqui, Papéis e Permissões só liam o banco e mostravam os comandos para copiar; desde esta data o Orynt
executa, nessas duas telas, os comandos de papéis e de permissões, sempre depois de uma revisão. As outras telas
(Objetos do banco, Sessões, Consultas SQL) continuam só lendo. As decisões foram as recomendadas na descoberta, e as
seis sugestões foram aprovadas.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Executar no banco | Sim, pela API, depois de revisar o SQL; "Copiar" continua ao lado. Revê Q3 de Papéis e Q6 de Permissões. |
| Q2 | Onde fica | Nas telas que já existem: "Novo papel" no topo de Papéis; "Editar", "Trocar a senha" e "Excluir" no detalhe do papel; "Conceder ou revogar" no topo e no detalhe de Permissões. A tela nova é só o histórico (S1). |
| Q3 | Contrato | Operações estruturadas (`OperacaoDTO`), nunca SQL livre. A API monta o SQL com os nomes citados; o front mostra a prévia pela mesma regra (`regras/sqlAlteracoes.ts`). Uma rota só, `POST /usuarios/alteracoes`, porque um modelo, um lote e uma exclusão são vários comandos que rodam numa transação. |
| Q4 | Senha | O navegador calcula o verificador SCRAM-SHA-256 (PBKDF2 com 4096 iterações e SASLprep, como o `\password` do psql) e só ele vai à API. A senha fica só no estado do formulário. O histórico guarda um marcador no lugar do verificador. |
| Q5 | Excluir com dependências | A tela mostra o que prende o papel e resolve numa transação: `REASSIGN OWNED BY … TO` o herdeiro escolhido, `DROP OWNED BY` e `DROP ROLE`, avisando que outros bancos do servidor precisam do mesmo. |
| Q6 | O que o GRANT cobre | Participações (com INHERIT, SET e ADMIN), o banco, os esquemas, as tabelas e visões (também por coluna), as sequências, as funções, "todos de um esquema" e os privilégios padrão. |
| Q7 | Confirmação | Toda alteração passa pela revisão. Excluir um papel, tirar SUPERUSER, revogar de PUBLIC e tirar o próprio acesso do papel da conexão pedem o nome digitado. |
| Q8 | O que a conexão não pode | O botão fica bloqueado, com o motivo, calculado pelo papel da conexão (superusuário, CREATEROLE com ADMIN, dono ou herdeiro do dono, WITH GRANT OPTION, quem concedeu). A API continua sendo a palavra final, e a recusa vira frase. |
| Q9 | Proteções | Não dá para excluir o papel da conexão nem o criado na instalação, nem renomear o papel da conexão. Avisa ao tirar o próprio LOGIN ou CREATEROLE. |
| Q10 | Sessões ao excluir | Avisa quantas há e oferece encerrá-las na mesma transação, desmarcado por padrão. NOLOGIN não encerra as sessões abertas. |
| S1 | Histórico | Tela Usuários e permissões › Alterações: cada alteração feita pelo Orynt, aplicada ou recusada, com a conta, o papel da conexão, o banco, quando, os comandos e a resposta do banco. Aprovada. |
| S2 | Desfazer | A notificação de sucesso e o detalhe do histórico oferecem o comando inverso, que passa pela revisão. Excluir e trocar a senha não têm desfazer. Aprovada. |
| S3 | Efeito antes de confirmar | A revisão diz o que muda no acesso de cada papel, junta quem ganha ou perde o mesmo e avisa o que continua por outro caminho. Aprovada. |
| S4 | Modelos de papel | Em branco, Grupo de leitura, Usuário de aplicação e Leitura de um esquema. Aprovada. |
| S5 | Executar os pontos de atenção | Os comandos que Papéis e Permissões sugerem ganham "Executar", também no lote ("Executar os N"). A senha em MD5 vira "Trocar a senha". Aprovada. |
| S6 | Gerador de senha | "Gerar senha forte" (24 caracteres, sem os que se confundem), com o medidor de força da recuperação de senha. Aprovada. |

Regras:

* **Revisão:** um modal só, com o formulário e a revisão como duas etapas (o formulário fica montado e escondido,
  então "Voltar" mantém o que foi digitado). A revisão mostra o que vai ser feito, os avisos, "O que muda", os
  comandos na ordem em que rodam, com "Copiar", o aviso de demonstração e a confirmação digitada quando pedida. O
  botão diz o que faz ("Criar usuário", "Excluir papel", "Conceder", "Revogar", "Desfazer").
* **Modelos (S4):** "Usuário de aplicação" é um usuário com 20 conexões, `statement_timeout` de 30 s,
  `idle_in_transaction_session_timeout` de 5 min, CONNECT no banco, USAGE no esquema, SELECT, INSERT, UPDATE e
  DELETE em todas as tabelas, USAGE e SELECT nas sequências e os privilégios padrão para o que os donos do esquema
  criarem. "Leitura de um esquema" é um usuário com 5 conexões e `statement_timeout` de 5 min que lê todas as tabelas
  e visões do esquema, com o privilégio padrão de SELECT. "Grupo de leitura" é o mesmo acesso num grupo sem login,
  com os membros escolhidos no formulário.
* **Nome:** até 63 bytes, sem `pg_`, sem as palavras reservadas, único no servidor e só com letras sem acento,
  números, `_`, `$`, ponto e hífen (o que as outras telas aceitam abrir). Com maiúsculas, ponto ou hífen, o nome
  vai entre aspas.
* **Revogação:** o PostgreSQL só revoga em nome de quem concedeu, então o comando leva `GRANTED BY` quando a
  concessão não é do dono (`REVOKE UPDATE … FROM leitura GRANTED BY migracao`), e `CASCADE` quando quem perde o
  acesso já o repassou.
* **Depois de executar:** a notificação diz o que foi feito e oferece "Desfazer"; Papéis, Permissões, Sessões e
  Alterações recarregam; o detalhe aberto acompanha um papel renomeado e fecha quando ele é excluído.
* **Alterações (S1):** lista da mais recente à mais antiga, busca (alteração, comandos, conta), filtros de resultado
  (aplicadas, desfeitas, recusadas) e de papel, atalho "N recusadas pelo banco", 15 por página e detalhe com as
  setas, os comandos, a falha com o SQLSTATE e os vínculos entre uma alteração e a que a desfez. A URL é sempre
  `/usuarios-e-permissoes/alteracoes`, com os filtros no histórico do navegador.
* **Simulação:** as alterações ficam no `localStorage` (`orynt:simulacao:alteracoes`), por conexão, sem senha nem
  verificador, e são reaplicadas sobre os dados gerados a cada leitura, em Papéis, Permissões, Sessões e nos donos de
  Tabelas, Views e Funções. As sessões de um papel excluído vão para `loja_app`, para a soma seguir igual às
  conexões ativas do Dashboard. O simulador valida como o PostgreSQL e recusa com o SQLSTATE: papel que já existe,
  falta de permissão, dependências sem herdeiro, ciclo de grupos, excluir ou renomear o papel da conexão.
  `oryntSimulacao.restaurarPapeis()` volta ao início e `oryntSimulacao.recusarAlteracoes()` recusa tudo (`false`
  desliga).

## Administração: Usuários e Auditoria

Pedido pelo usuário em 20 de outubro de 2026: uma área para o administrador gerenciar as contas do Orynt (quem entra
na aplicação, não os papéis do PostgreSQL, que continuam em Usuários e permissões), com as permissões de cada conta,
e uma tela de auditoria do que cada conta acessou e fez. Os dados continuam no simulador do front ("por enquanto
deixa os dados mocados pelo front, iremos fazer a api mais tarde"), que faz o papel do servidor também na
autorização: ele recusa com `403` a chamada direta sem permissão, não só o botão. As decisões foram as recomendadas
na descoberta.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Perfil e permissões | Três perfis (Leitor, Analista, Administrador) trazem um conjunto de permissões, e cada permissão pode ser concedida ou revogada à parte. A conta que foge do perfil leva o selo "Personalizado" e "Voltar ao do perfil". |
| Q2 | Catálogo | Permissões reais por módulo, as que o servidor consegue fazer valer: ver o dashboard, ver os relatórios, ver as consultas, ver os objetos, ver papéis, sessões e permissões do banco, alterar papéis do banco, conceder e revogar no banco, conectar a bancos, gerenciar usuários e ver a auditoria. |
| Q3 | Senha inicial | Convite: a pessoa recebe um link e define a própria senha. O administrador nunca conhece a senha. O convite vale 7 dias e é de uso único. |
| Q4 | Contas criadas entram | Sim. O simulador guarda só o hash (PBKDF2-SHA-256, 210.000 iterações, com sal) em `orynt:simulacao:contas`. |
| Q5 | Excluir | Permitido, com o e-mail digitado. A auditoria guarda o nome e o e-mail de cada evento e não perde nada; as conexões salvas da conta são apagadas; o histórico de Alterações continua. |
| Q6 | Branch | A ORY-14 foi fechada (PR #12) e a área entrou na ORY-15. |
| Q7 | Acesso a telas | Um evento por tela aberta, não por troca de filtro ou de página. |
| Q8 | Tela sem permissão | Some do menu; a rota digitada mostra "Sem acesso" e registra a tentativa. Quem não vê o Dashboard entra na primeira tela que pode abrir. |
| Q9 | Revogação | Vale na próxima requisição: o servidor lê as permissões a cada chamada e o front as relê a cada tela aberta. Desativar encerra as sessões. |
| S1 | Ver atividade | No detalhe da conta, abre a Auditoria filtrada por ela. Aprovada. |
| S2 | Encerrar sessões | No detalhe da conta, com confirmação. Aprovada. |
| S3 | Exportar CSV da auditoria | Recusada. |
| S4 | Bloqueio por tentativas | Cinco senhas erradas do mesmo e-mail em 15 minutos bloqueiam o login por 15 minutos, tenha o e-mail conta ou não, e o administrador pode desbloquear. Aprovada. |
| S5 | Atalhos de atenção | "N bloqueadas", "N convites expirados" e "N sem acesso há 30 dias" ao lado da contagem, como filtros. Aprovada. |

Regras:

* **Duas permissões ficaram diferentes do que a descoberta listou, por uma razão de segurança:** "exportar
  relatórios" saiu do catálogo, porque o arquivo é montado no navegador com os mesmos dados que a conta já lê, e o
  servidor não teria como impedir; seria um botão escondido, não uma permissão. Conexões têm uma permissão só,
  "Conectar a bancos", porque as conexões salvas são da conta e uma conta sem poder criar a própria conexão ficaria
  sem nenhuma.
* **Dependências:** alterar papéis e conceder e revogar no banco só valem com ver papéis, sessões e permissões.
  Marcar uma marca a outra; desmarcar a de que dependem desmarca as duas.
* **Elevação:** só se concede o que a própria conta tem; a caixa de uma permissão que o administrador não tem fica
  travada com o motivo, e o servidor recusa com `403` se a chamada vier direto. Revogar é livre.
* **Proteções:** ninguém desativa, exclui nem tira de si "Gerenciar usuários"; a última conta ativa que gerencia
  usuários não pode ser desativada, excluída nem perder a permissão; a conta de demonstração, criada na
  instalação, não pode ser desativada nem excluída; não se encerram as sessões da própria conta pela Administração
  ("Sair" faz isso). Os botões ficam visíveis e bloqueados, com o motivo.
* **Usuários de banco e contas do Orynt são coisas separadas:** a conta do Orynt decide o que a pessoa pode fazer no
  Orynt; o papel da conexão decide o que o banco aceita. Papéis e Permissões exigem as duas coisas: a revisão de
  uma alteração diz qual permissão da conta falta, e os botões avisam antes.
* **Situação da conta:** decidida no front, nesta ordem: Desativada, Bloqueada, Convite pendente, Convite expirado,
  Ativa. "Sem acesso há 30 dias" é um atalho de atenção, contado da criação quando a pessoa nunca entrou.
* **Detalhe da conta:** modal com os dados, a situação, as ações, as medidas (último acesso, sessões, conexões e
  permissões) e as permissões agrupadas por módulo, cada uma com "Concedida" ou "Negada" e a origem (do perfil,
  concedida à parte, revogada do perfil). As mudanças ficam pendentes numa barra com "Descartar" e "Salvar
  permissões"; com mudanças pendentes as setas travam, e fechar pergunta se descarta.
* **Auditoria:** do mais recente ao mais antigo, 25 por página, com os filtros e a busca feitos pelo servidor
  (usuário, tipo de ação, módulo, resultado e período). Escolher um usuário mostra "Atividade de", com as áreas
  acessadas, o que fez e as tentativas negadas. Nenhum evento é inventado: a lista começa vazia e só tem o que
  aconteceu neste navegador. Não há editar nem apagar pela interface. Senhas, códigos e tokens nunca entram.
* **Caixa de entrada simulada:** o link do convite aparece no detalhe da conta pendente, só na memória da aba. Ele
  abre `/ativar-conta#convite=…`, que fica fora do login e funciona com outra conta aberta; o token sai do endereço
  assim que é lido.
* **Simulação:** as contas e as tentativas de login ficam em `orynt:simulacao:contas` e
  `orynt:simulacao:tentativas-de-login`, a auditoria em `orynt:simulacao:auditoria` (os 5.000 eventos mais
  recentes) e as conexões salvas passaram a ser por conta (a lista antiga foi para a conta de demonstração).
  `oryntSimulacao.restaurarAdministracao()` volta ao início, só com a conta de demonstração.

## Revisão de interface (20 de outubro de 2026)

Pedida pelo usuário: composição de cada tela, espaços vazios, modais e a árvore do plano, sem inventar conteúdo nem mudar o que cada tela faz.

* **Pontos de atenção:** com mais de quatro pontos, o painel mostra os três mais urgentes e "Mostrar os outros N pontos" abre o resto, na mesma ordem; "Mostrar só os 3 mais urgentes" recolhe de novo. Assim a lista de Papéis, Permissões, Sessões, Índices e Tabelas começa na primeira tela. Com quatro ou menos, todos aparecem.
* **Detalhes longos:** os detalhes de Tabelas, Funções, Índices, Views, Papéis e Sessões ganham, abaixo da identificação, uma linha de atalhos para as seções, que fica fixa no topo do modal ao rolar e marca a seção em tela. O detalhe da tabela usa o modal largo.
* **Exportação:** a prévia acompanha a altura de "O que exportar" e mostra até 24 linhas de cada arquivo.
* **Histórico, Por intervalo:** a coluna de execuções vira uma barra larga, e a hora deixa de ocupar metade da tabela.
* **Comparação de planos:** os dois planos lado a lado têm a mesma altura.
* **Usuários do Orynt:** as permissões do formulário e do detalhe viram uma lista só, com o grupo à esquerda e uma linha por permissão, e a origem (do perfil, fora do perfil, concedida à parte, revogada do perfil) à direita; o selo "Concedida"/"Negada", que repetia a caixa marcada, sai. O detalhe da conta deixa de repetir o e-mail no topo.
* **Planos de execução:** "Mudanças de plano" termina na mesma linha do detalhe da etapa.
* **Sessões, cadeias de bloqueio:** cada cadeia abre com uma frase (quantas sessões, em quantos níveis, a espera mais longa), e cada sessão mostra o que espera e de quem, o que segura e o tempo, alinhado à direita.
* **Cabeçalho das telas:** a descrição ocupa uma linha ao lado das ações nas telas largas, e trocar entre uma tela curta e uma longa não desloca mais o conteúdo para o lado.

## Redesenho das composições (22 de outubro de 2026)

Pedido pelo usuário: as telas pareciam o mesmo esqueleto (título, aviso, pontos de atenção, filtros, tabela) com
outros dados. Cada tela passa a ter a composição da sua tarefa, sem mudar dados, regras, rotas nem o que cada
tela faz. As regras de "Pontos de atenção" e do aviso de demonstração das seções acima continuam valendo; muda só
onde e como aparecem.

* **Aviso de demonstração:** em todas as telas, deixa de ser uma caixa âmbar no corpo e vira uma linha sob a
  descrição, com o selo "Dados demonstrativos." e a frase da tela. O texto e as condições não mudam, e ele
  continua na folha impressa. O modal de revisão das alterações mantém a nota.
* **Panorama das telas de inventário:** acima da lista, uma figura própria de cada tela e, ao lado, os pontos de
  atenção numa coluna (o ícone, o objeto, a frase em até duas linhas e a ação; a frase inteira está no detalhe).
  Em telas estreitas a coluna desce para baixo da figura. Sem nenhum ponto, a figura ocupa a largura toda.
  * **Tabelas, "Onde está o espaço":** o espaço total, a soma de dados, índices e TOAST e as sete maiores tabelas
    em barras divididas nas três partes, com a situação mais urgente marcada; clicar abre o detalhe.
  * **Índices, "Para que serve o espaço dos índices":** o espaço total, o espaço que não ajuda nenhuma consulta
    (sem leitura, duplicados ou redundantes e inválidos) e uma barra por situação; cada situação com problema
    filtra a lista, e as cinco tabelas com mais espaço em índices filtram a lista pela tabela.
  * **Views, "Frescor e leitura":** há quanto tempo cada materializada foi atualizada, numa escala de 72 h com a
    marca das 24 h, e as leituras de 30 dias de cada visão, com "Sem leitura" e "Por outra visão".
  * **Funções, "Onde vai o tempo das funções":** o tempo total e as seis funções medidas que mais gastaram, com o
    tempo dentro delas separado do tempo nas funções que elas chamam; as não medidas são contadas no rodapé.
  * **Papéis, "Quem pertence a quem":** usuários, grupos, superusuários e sessões agora, e uma linha por grupo com
    os membros (a participação sem herança tracejada), mais os usuários fora de grupo.
* **Sessões:** os pontos de atenção ficam na coluna ao lado das cadeias de bloqueio, quando há cadeia.
* **Permissões:** a tela é uma ferramenta de consulta, então os pontos de atenção ficam numa faixa recolhida com a
  contagem e os três mais urgentes; "Ver todos" abre a lista inteira.
* **Auditoria e Alterações:** a tabela vira uma linha do tempo agrupada por dia ("Hoje", "Ontem", o dia da
  semana), com a hora, um marco com o ícone da ação e a cor do resultado (Auditoria: neutro, falha em âmbar,
  negado em vermelho, e o selo só quando não deu certo; Alterações: aplicada, desfeita, recusada).
* **Administração › Usuários:** cada conta ganha a inicial num círculo, e um painel "Perfis" ao lado da lista
  mostra o que cada perfil pode fazer, quantas contas tem e quantas permissões dá; escolher um filtra a lista.
* **Planos de execução:** os números da execução ficam numa faixa logo abaixo da consulta, a árvore e o detalhe
  da etapa vêm em seguida, e o diagnóstico passa para baixo da árvore, antes dos índices sugeridos.
* **Telas mantidas:** Dashboard, Resumo, Comparação, Exportação, Todas as consultas, Histórico, Configurações e as
  telas de acesso já têm composição própria da tarefa e não mudaram.

## Refinamento de 22 de outubro de 2026: dicas, Views, mapa de Papéis e avisos

Pedido pelo usuário no mesmo dia, depois do redesenho das composições.

* **Views:** a tela e o objeto passam a se chamar "Views", em inglês, em toda a interface: menu, título, aba do
  navegador, seções e atalhos dos detalhes de Tabelas, Funções e Índices, tipos ("View comum", "View
  materializada"), frases e rótulos de acessibilidade. A rota (`/objetos/visoes`), os identificadores e o contrato
  da API não mudam. "Visão" no sentido comum (como em "uma visão clara") continua em português.
* **Avisos de demonstração:** saem da interface. Não aparecem mais o aviso "Dados demonstrativos." das telas, o
  selo "Dados demonstrativos" dos detalhes, o selo "Demonstração" do menu da conta, as notas "Conexão simulada." do
  modal de conexão e das configurações, a nota "Demonstração." do convite, a nota da revisão de uma alteração, as
  frases de demonstração das notificações (conexão e alteração aplicada) e do teste de conexão, a frase "Login
  fictício…" do cartão de acesso e a frase "os dados vêm do simulador" do cartão de versões. Isso substitui as
  regras "Sem conexão e demonstração" e o item "Demonstração" das seções acima no que diz respeito ao que aparece
  na tela. Continuam, porque têm outra função: o cartão com as credenciais de acesso, a caixa de entrada simulada
  da recuperação e do convite (sem elas os fluxos não terminam), o painel de cenários, que só existe em
  desenvolvimento, e a marca dentro dos arquivos exportados e do texto copiado ("Origem dos dados", `-demonstracao`
  no nome, `dadosDemonstrativos` no JSON, "(dados demonstrativos)" nos destaques), para que um arquivo com números
  fictícios não passe por real fora do Orynt. Nenhuma notificação diz que uma alteração rodou num banco quando a
  conexão é simulada.
* **Dicas:** toda informação que aparecia no `title` do navegador vira a dica do Orynt (`Dica`): mesma aparência
  nos dois temas, com seta, título opcional, posição que não sai da tela e troca de lado quando falta espaço,
  abertura com o mouse depois de uma pequena espera (sem espera ao passar de uma dica para outra), com o foco do
  teclado e com um toque nos textos que não são botões, e fechamento com Esc, ao rolar ou ao tocar fora. Os nomes
  e descrições cortados com reticências só mostram a dica quando estão cortados. As dicas dos gráficos usam as
  mesmas cores, borda e sombra.
* **Papéis, "Quem pertence a quem":** a figura ocupa a largura toda e os pontos de atenção viram a faixa
  recolhida de Permissões, acima dela. Um resumo (grupos, usuários, quantos têm sessão aberta e o total de
  sessões, superusuários), os grupos em blocos com o cabeçalho (nome e quantos membros, quantos com sessão) e uma
  linha por membro com as iniciais, o nome, as marcas (superusuário, a situação mais urgente, "Sem herança", "Esta
  conexão") e as sessões abertas em texto e ponto verde; os usuários sem grupo numa área separada, com a
  explicação. Um grupo com mais de cinco membros mostra quatro e "Mostrar mais N". "Com sessão aberta" mostra só
  quem tem sessão agora, conforme o número de sessões que a API devolve.

## Segunda revisão de 22 de outubro de 2026: dicas, gráficos dos relatórios e mapa de Papéis

Pedida pelo usuário no mesmo dia, porque as dicas ainda cobriam informação e o mapa de Papéis não agradou.

* **Dicas que não cobrem o que se está lendo:** numa tabela, a dica sai da linha inteira (acima dela ou, sem
  espaço, abaixo), então nunca cobre a própria linha. Nas figuras de Tabelas e Funções, a dica fica ao lado da
  ponta da barra, no trecho vazio da trilha, e só vai para o outro lado quando não cabe; ela não repete o nome que
  já está na linha (Funções mostra a assinatura inteira, que a linha corta). O mouse pode passar para cima da
  dica sem que ela suma, e ela fecha ao sair, com Esc ou ao tocar fora (WCAG 1.4.13). No tema claro a dica é
  escura, e no escuro um cinza mais claro que os cartões, para se separar do conteúdo.
* **Gráficos de linha do tempo:** nos dois gráficos de Resumo, de Comparação e de Histórico a dica flutuante deu
  lugar a uma leitura na linha do título de cada gráfico, que acompanha a coluna sob o mouse e nunca fica em cima
  de barras, linhas ou rótulos de pico. Em Histórico ela mostra "Novo plano" no intervalo da troca de plano, e o
  rótulo "Novo plano" da linha tracejada fica do lado oposto ao do pico. O gráfico de atividade do Dashboard
  mantém a dica flutuante, com as cores novas.
* **Desempenho das consultas:** as barras de Resumo e Comparação não têm mais dica. Passar o mouse numa faixa da
  barra ou numa linha da tabela ao lado destaca a mesma faixa nos dois lugares (as outras ficam apagadas); no
  toque, um toque liga e desliga o destaque. Os números exatos estão na tabela.
* **Papéis, "Quem pertence a quem":** uma lista com uma linha por grupo, como uma tabela: à esquerda o grupo
  (nome e quantos membros, quantos com sessão), à direita os membros em fichas com as iniciais, o nome, a coroa
  de superusuário, "esta conexão", "sem herança" (borda tracejada) e, quando há, "N sessões" com o ponto verde. A
  última linha, "Sem grupo", com fundo e borda própria, traz os usuários fora de grupo e a explicação. Um grupo
  vazio ocupa uma linha só. Quando os membros de um grupo passam de duas linhas, a linha mostra só o que cabe numa e "Mais N". Com mais de sete grupos aparecem os seis maiores (quatro em telas estreitas) e "Mostrar os outros N grupos"; os grupos vazios ficam juntos numa linha "Sem membros". Uma busca no card encontra um grupo ou um usuário pelo nome e mostra só as linhas onde ele aparece, e "Com sessão aberta" esconde os grupos sem ninguém conectado. Assim o card tem altura limitada mesmo com muitos usuários. As situações de senha e de uso
  saíram do mapa: estão nos pontos de atenção e na lista logo abaixo. Uma legenda no rodapé explica a borda
  tracejada quando existe uma participação sem herança. Abaixo de 640px do card o grupo fica acima das fichas.

## Páginas de erro (23 de outubro de 2026)

Pedido pelo usuário: as páginas 404, 403 e de falha geral seguem o modelo das 404 de PrismaWeb e OrbitWeb, com
elementos de banco de dados. Duas versões da 404 foram recusadas (uma busca num índice B-tree e um painel de
pontos), e a escolhida, entre quatro propostas, foi o terminal psql.

* **Um visual para as três:** marca e slogan no topo, cartão com um terminal psql que digita um comando e mostra a
  resposta, sobretítulo com o código ("Erro 404", "Erro 403", "Erro inesperado"), título, descrição e ações. O
  fundo da página tem uma grade de pontos, dois brilhos azuis que se deslocam devagar e pulsos de luz que correm
  pela grade; no celular os pulsos somem. Com movimento reduzido, o terminal já aparece completo e o fundo fica
  parado.
* **404:** o terminal procura o endereço na tabela de telas, devolve `(0 linhas)` e, quando há uma tela parecida
  com o endereço entre as que a conta pode abrir, mostra "DICA: você quis dizer …?", e o botão principal abre essa
  tela. A semelhança tolera erros de digitação, acentos, maiúsculas, barras a mais e o grupo que faltou. Sem
  login não há sugestão e a ação é ir para a tela de login.
* **403:** a página "Sem acesso a esta tela" ocupa a página inteira, como a 404, no lugar do menu e do
  cabeçalho. O terminal tenta ler a tabela da área da tela e recebe "permissão negada". A mensagem não diz qual
  permissão falta: diz a tela, que quem administra o Orynt pode liberar o acesso e que a tentativa ficou
  registrada na auditoria, o que continua valendo. Continua valendo também que a tela some do menu.
* **Falha geral:** quando o Orynt quebra fora de uma tela, o terminal mostra `FATAL` e a conexão perdida, ou
  `ERRO` e a explicação da versão nova ou da rede quando uma parte do Orynt não chegou; a ação é "Recarregar a
  página". A falha de uma tela só continua dentro do shell, com o menu funcionando.

## Backup

Pedido pelo usuário em 30 de outubro de 2026: um módulo para fazer e acompanhar backups de bancos PostgreSQL, salvos no computador de quem os faz, nesta etapa só no front. Nenhum `pg_dump` roda e nenhum agendador existe de verdade: o simulador faz o papel da API, e o arquivo salvo é de demonstração. Revisto no mesmo dia (backup local): revogou Q5 e S1 e ajustou Q2, Q3, Q7, Q9, S4 e S5, a pedido do usuário.

| # | Tema | Decisão |
|---|---|---|
| Q1 | Conexões | **Revista em 30 de outubro de 2026, a pedido do usuário:** a tela Backup › Conexões saiu, por ser uma tela para muito poucos registros. As conexões são as mesmas salvas na conta: Configurações conecta, edita e exclui, e o Backup cadastra uma conexão sem conectar quando não há nenhuma, ou pelo formulário do backup. |
| Q2 | Navegação | Item "Backup" em Gerenciamento, com telas e rotas próprias: Resumo, Histórico e Agendamentos. "Visão geral" virou "Resumo" pela regra de ordem do menu, porque a primeira tela é a que abre. A tela Destino saiu em 30 de outubro de 2026, a pedido do usuário: o destino é escolhido na etapa Destino do formulário. |
| Q3 | Configuração e agendamento | Um único formulário em quatro etapas (Origem, Objetos, Destino e Quando). A última decide entre executar agora e uma frequência. |
| Q4 | Conexão em uso | O módulo mostra todas as conexões e funciona sem banco conectado. |
| Q5 | Onde roda e grava | **Revista.** O destino é sempre o computador de quem faz o backup, e o servidor não guarda nenhum arquivo. Como o navegador não fala com o PostgreSQL nem roda `pg_dump`, a API roda o `pg_dump` e repassa o arquivo ao navegador sem gravar em disco (escolha do usuário entre repasse, auxiliar local obrigatório e os dois). Os dados passam pela API, o banco precisa estar acessível a partir dela, e a interface diz isso. Um auxiliar local pode vir depois, para bancos em rede privada. |
| Q6 | Tipos | Completo, Só estrutura e Só dados, o que o `pg_dump` faz e permite escolher objetos. |
| Q7 | Executar agora | Simula o progresso, termina em sucesso, falha ou cancelamento e entra no Histórico e nos indicadores. **Revista em 30 de outubro de 2026, a pedido do usuário, que achou o segundo plano esquisito:** nenhum modal abre sozinho ao iniciar. Um cartão flutuante no canto inferior direito acompanha cada execução em todas as telas e pode ser recolhido, e os detalhes abrem só quando a pessoa pede. |
| Q8 | Banco de dados | Vem da conexão, sem escolha: para outro banco, usa-se outra conexão. |
| Q9 | Excluir do histórico | Apaga só o registro, com confirmação: o arquivo está no computador da pessoa e não é afetado. A exclusão fica na auditoria. |
| Q10 | Excluir uma conexão com agendamentos | A confirmação lista os agendamentos, que ficam desativados e marcados "Sem conexão". O histórico é mantido. Vale também para a exclusão em Configurações. |
| Q11 | Permissão | Uma só, `BACKUP_GERENCIAR`, do perfil Administrador. Exige `CONEXOES_USAR`. |
| S1 | Retenção | **Revogada** com o backup local: o site não apaga arquivos do computador de ninguém. |
| Q12 | Agendamentos | Viram lembretes (escolha do usuário): na hora prevista, com o Orynt aberto, o cartão avisa e a pessoa confirma o início. Com o site fechado, nada roda, e o agendamento aparece como atrasado, com "Fazer agora". |
| Q13 | Conta | Login e `BACKUP_GERENCIAR` continuam (escolha do usuário). Nenhum arquivo fica ligado à conta: ela guarda só as conexões salvas e o registro do histórico. |
| S4 | Próximos lembretes | Aprovada. O formulário e o detalhe do agendamento mostram as 3 próximas datas. |
| S5 | Alerta de proteção | Aprovada. Quando o último backup falha ou um agendamento atrasa, um ponto de atenção aparece no Resumo e, recolhido, no Dashboard, só para quem tem a permissão. O atraso oferece "Fazer agora". |
| S2 e S3 | Comandos `pg_restore` e `pg_dump` para copiar | Recusadas nesta etapa. |

Regras:

* **Objetos:** esquema, tipo e objeto, com Tabelas, Views, Views materializadas, Funções, Procedimentos e Sequências. Índices, gatilhos e restrições acompanham a tabela. "Banco inteiro" inclui o que for criado depois. Em Só dados, só tabelas e sequências podem ser marcadas.
* **Frequência:** diária, semanal, mensal ou a cada N horas (até 168) ou N dias (até 90). O horário é o do computador da pessoa. O dia 29, 30 ou 31 cai no último dia dos meses mais curtos.
* **Situação do agendamento:** é calculada, não escolhida. Sem conexão, Inativo, Atrasado (a hora passou e o backup não foi feito, com uma hora de folga) ou Ativo.
* **Destino:** baixar pelo navegador (o padrão, para a pasta de downloads) ou escolher uma pasta, quando o navegador permite (File System Access API). A escolha vale para esta aba e nunca mostra caminho de servidor. O arquivo fica disponível para baixar enquanto a aba estiver aberta.
* **Progresso:** nunca inventado. Etapa, objetos processados e bytes recebidos vêm da API; sem como medir, a barra fica indeterminada, sem percentual.
* **Segundo plano:** continua ao trocar de tela e, mais lento, em outra aba. Recarregar ou fechar a aba interrompe o backup, com confirmação antes. Com o site fechado, nada roda. O texto com sublinhado azul "Como funciona o segundo plano?", na última etapa do formulário, no cartão e nos detalhes, explica esses limites numa dica.
* **Resultado:** o cartão mostra concluído, falhou ou cancelado. Falha e arquivo por baixar ficam até serem dispensados; arquivo já salvo sai depois de um tempo. Um resultado não remove o acompanhamento dos outros backups.
* **Senha:** as regras de sempre. Ao editar uma conexão, deixar a senha em branco mantém a guardada pela API; ela nunca volta para o navegador.
* **Auditoria:** salvar e editar conexão, iniciar, cancelar e excluir backup e criar, editar, ativar, desativar e excluir agendamento geram eventos no módulo Backup.

## Fora desta fase

Backend, coleta de métricas reais, execução real de backups, modo SSL, Docker, CI e vídeo de apresentação.
