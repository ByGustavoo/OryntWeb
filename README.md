<div align="center"> <br>
  <img align="center" alt="orynt-react" height="150" width="150" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" />
</div>

<br>

<div align="center">
  <strong>Orynt</strong> é o frontend de uma aplicação para monitorar, analisar e administrar bancos PostgreSQL, que guia quem desenvolve até a origem de um problema: <em>toda lentidão tem uma origem</em>. Nesta primeira fase ele entrega a tela de login, o cadastro e a troca de conexões, a estrutura da aplicação e um dashboard inicial. O backend ainda não existe: o login, a conexão e os dados são simulados, e a interface avisa isso em todas as telas.
</div>

<br> <br>

## 🚀 Ferramentas Utilizadas

* ⚡ Vite 5

* 🧪 Vitest

* 📊 Recharts

* ⚛️ React 18

* 🖼️ Lucide React

* 🎨 HTML e CSS

* 🔷 TypeScript 5

* 🧭 React Router 6

* 🔤 Geist e Geist Mono

<br>

## 🎯 Objetivo

Ajudar quem desenvolve ou administra um banco PostgreSQL a sair de um número fora do normal e chegar
à causa dele. O nome vem de orientação: o Orynt aponta o caminho entre o que a métrica mostra e a
consulta que explica.

<br>

## 📌 Status do Projeto

* **Fase 1 (concluída):** login fictício, conexões salvas simuladas, estrutura da aplicação e dashboard com dados demonstrativos.

* **Relatórios (concluído):** as telas Resumo, Exportação e Comparação estão prontas, com dados demonstrativos.

* **Consultas SQL:** as telas Todas, Histórico e Planos de execução estão prontas, com dados demonstrativos.

* **Objetos do banco (concluído):** as telas Visões, Índices, Tabelas e Funções estão prontas, com dados demonstrativos.

* **Usuários e permissões (concluído):** as telas Papéis, Sessões e Permissões estão prontas, com dados demonstrativos.

* **Pendente:** a API (OryntAPI). O contrato que ela precisa cumprir está em [`docs/api-contrato.md`](docs/api-contrato.md).

<br>

## ✨ Funcionalidades

🔹 **Login**

* Tela inicial em `/login`, com e-mail, senha com mostrar e ocultar, validação campo a campo e estado de carregamento

* Login fictício, conferido pelo simulador com as credenciais de demonstração

* Recuperação de senha em `/recuperar-senha`, em três etapas: e-mail, código de verificação de 6 dígitos e nova senha, com medidor de força

* A recuperação nunca diz se o e-mail informado tem conta: a resposta é a mesma para qualquer endereço

* Painel animado com dados fictícios: um pico no tempo médio é rastreado até a consulta que o causou

* Alternância entre tema escuro e claro, lembrada no navegador

🔹 **Conexão**

* Modal aberto sobre a aplicação, com tipo de banco, nome, host, porta, banco de dados, usuário e senha, validado campo a campo

* Preenchimento a partir de uma URL `postgresql://usuario:senha@host:porta/banco`

* Conexões salvas: a usada por último carrega sozinha ao entrar, e a troca é feita pelo menu da conta

* Gerenciamento em Configurações: conectar, renomear e excluir

* Teste de conexão separado da conexão

* Estados de espera, sucesso e erro, com cancelamento e nova tentativa

🔹 **Aplicação**

* Menu lateral recolhível, organizado em grupos com itens que abrem as suas telas, e que vira gaveta em telas menores

* Menu da conta no cabeçalho, com a conexão em uso, o selo de demonstração, a troca entre conexões salvas e o botão "Sair"

* Tema escuro, claro ou automático

* Versão e data de lançamento do Orynt Web e da Orynt API em Configurações

🔹 **Dashboard**

* Consultas executadas, tempo médio, consultas lentas e conexões ativas

* Gráfico da atividade das consultas em 1 h, 24 h, 7 dias ou 30 dias

* Tabela das consultas que mais pesam, com ordenação, indicação de desempenho e botões para ver a consulta inteira e copiar o SQL

* Atalho para o resumo de ontem, da semana passada ou do mês passado

🔹 **Relatórios › Resumo**

* Resumo de um dia, uma semana ou um mês já encerrado, com setas para andar entre os períodos dos últimos 12 meses

* Destaques em frases, montados a partir dos números, com botão para copiar como texto

* Indicadores comparados com o período anterior: consultas executadas, tempo médio, consultas lentas e pico de conexões

* Evolução do volume e do tempo médio, com o pico marcado, e divisão das execuções e do tempo do banco entre consultas rápidas, moderadas e lentas

* Consultas que mais pesaram, com a variação do tempo médio de cada uma

* Impressão em folha própria, sem menu nem controles e em tema claro, para salvar em PDF

🔹 **Relatórios › Exportação**

* O resumo de um período como arquivo: CSV (um por bloco), JSON ou Markdown

* Escolha dos blocos que entram: evolução, consultas, desempenho e indicadores

* CSV no padrão brasileiro ou internacional de números, pronto para abrir em planilha

* Prévia das primeiras linhas, com nome, tamanho e quantidade de linhas, antes de baixar

* Botão para copiar um bloco como tabela e colar direto numa planilha

* Arquivos de dados demonstrativos identificados no nome e no conteúdo

🔹 **Relatórios › Comparação**

* Dois períodos fechados do mesmo tamanho lado a lado, com atalhos para o anterior, 7 dias, 4 semanas ou 3 meses antes, e botão para inverter

* "O que mudou" em frases, com botão para copiar como texto

* Indicadores com o valor de cada período e a diferença entre eles

* Evolução dos dois períodos sobreposta, alinhada por hora, dia da semana ou dia do mês

* Divisão das execuções e do tempo do banco por faixa de desempenho nos dois períodos

* Consultas ordenadas pela maior alta do tempo médio, com filtro das que pioraram e das que melhoraram

* Impressão na mesma folha do Resumo

🔹 **Consultas SQL › Todas**

* Lista completa das consultas executadas em 1 h, 24 h, 7 dias ou 30 dias, em páginas de 25

* Busca no texto do SQL, com o termo em destaque e a tecla `/` como atalho, e filtros por desempenho e por tipo de comando

* Ordenação por tempo médio, tempo máximo, execuções ou parte do tempo total

* Modal de detalhes com o SQL inteiro, o tempo mínimo, médio e máximo, o tempo total e as linhas por execução, e setas para passar de uma consulta à outra sem fechar

* Exportação da lista filtrada em CSV, no padrão brasileiro ou internacional de números

* Atalhos no Dashboard: "Ver todas" e o indicador de consultas lentas, que abre a lista já filtrada

🔹 **Consultas SQL › Histórico**

* Uma consulta por vez em 1 h, 24 h, 7 dias ou 30 dias, abrindo na que mais pesa no período

* Busca de outra consulta pelo texto do SQL, com sugestões, e setas para percorrer as consultas pela ordem de peso

* Execuções, tempo médio, tempo máximo e tempo total, com a variação em relação ao período anterior

* Destaques em frases, com o intervalo de maior volume e o mais lento, e botão para copiar

* Gráficos de execuções e de tempo médio em cada intervalo, com o pico marcado

* Tabela por intervalo, com ordenação pelos cabeçalhos e exportação em CSV no padrão brasileiro ou internacional de números

* Atalho "Ver histórico" no modal de detalhes da lista Todas e nas tabelas de consultas do Dashboard, do Resumo e da Comparação

🔹 **Consultas SQL › Planos de execução**

* O plano registrado mais recente de uma consulta, abrindo na que mais pesa nos últimos 30 dias, com o mesmo seletor e as mesmas setas do Histórico

* Árvore do plano, uma linha por etapa, com o tempo gasto na própria etapa, as linhas devolvidas e as que o planejador esperava, navegável pelo teclado

* Detalhe de cada etapa: condições, linhas lidas e descartadas, blocos do cache e do disco, memória e custo estimado

* Diagnóstico em frases: a etapa que mais pesa, varreduras sequenciais, filtros que descartam quase tudo, estimativas erradas e uso de disco

* Índices sugeridos com o `CREATE INDEX CONCURRENTLY` pronto para copiar, sem executar nada no banco

* Mudanças de plano nos últimos 30 dias, com o tempo médio de cada versão

* Comparação de dois planos lado a lado: o que mudou em cada tabela, a diferença de tempo e de leitura e as duas árvores, com as etapas alteradas em destaque

* Troca de plano marcada nos gráficos e na tabela do Histórico, com atalho para comparar os dois planos

* Cópia do plano em texto, como o psql mostra, ou em JSON, para colar no explain.depesz.com ou no PEV2

* Atalho "Ver plano" no modal de detalhes da lista Todas, no Histórico e nas tabelas de consultas do Dashboard, do Resumo e da Comparação

🔹 **Objetos do banco › Visões**

* Inventário das visões comuns e materializadas de cada esquema, com busca pelo nome ou pela descrição e filtros de tipo, esquema e situação

* Leituras nos últimos 30 dias, tamanho e última atualização de cada visão, com ordenação pelas colunas e 15 visões por página

* Materializadas desatualizadas (mais de 24 horas sem atualizar) e sem dados marcadas na lista, e visões que nenhuma consulta leu em 30 dias em destaque, com atalhos que filtram cada caso

* Pontos de atenção no topo, do mais urgente ao menos urgente, cada um com o atalho para a visão ou para a lista filtrada

* Detalhe de cada visão: definição com cópia, colunas, do que ela depende e quem depende dela, e as consultas que a leem, com atalhos para o Histórico e o plano de execução

* Nas materializadas, o tamanho, as linhas e o comando REFRESH que as atualiza, com quantas vezes rodou e quanto tempo levou

🔹 **Objetos do banco › Índices**

* Inventário dos índices de cada tabela, com busca pelo nome, pela tabela ou pelas colunas e filtros de esquema, tabela e situação

* Método, chave primária, restrição única ou condição de cada índice, com o tamanho e as leituras dos últimos 30 dias, ordenação pelas colunas e 15 índices por página

* Índices inválidos, duplicados, redundantes e sem uso em 30 dias em destaque, com atalhos que filtram cada caso; chaves primárias e índices únicos nunca entram como sem uso

* Pontos de atenção no topo, do mais urgente ao menos urgente, com o espaço ocupado e as gravações que cada índice recebe

* Detalhe de cada índice: o comando que o refaz ou o remove, pronto para copiar, a definição, as colunas, as funções que ele usa, com atalho para Funções, os outros índices da mesma tabela e as consultas cujo plano o lê, com atalhos para o plano, para a comparação de planos e para o Histórico

* Com um filtro de situação, os comandos de todos os índices da lista copiados de uma vez, um por linha

* Índices sugeridos pelos planos de execução numa aba ao lado da lista, com o comando de cada um e a consulta que o pediu

* Data desde quando o uso é medido, e índices com menos de 30 dias de coleta em observação, para um índice novo não ser tomado por esquecido

🔹 **Objetos do banco › Tabelas**

* Inventário das tabelas de cada esquema, com busca pelo nome, pela descrição ou pelas colunas e filtros de esquema e situação

* Linhas, tamanho total, leituras dos últimos 30 dias e última manutenção de cada tabela, com ordenação pelas colunas e 15 tabelas por página; as particionadas aparecem uma vez, com as partições somadas

* Tabelas com idade de transação perto do limite, linhas mortas demais, estatísticas desatualizadas, lidas inteiras na maior parte das vezes ou sem chave primária em destaque, com atalhos que filtram cada caso

* Pontos de atenção no topo, do mais urgente ao menos urgente, cada um com o atalho para a tabela ou para a lista filtrada

* Detalhe de cada tabela: o comando de manutenção e os índices sugeridos pelos planos, prontos para copiar; o crescimento em 30 dias com um gráfico diário; o espaço em dados, índices e TOAST; as linhas vivas e mortas, a idade das transações e as datas de VACUUM e ANALYZE; os ajustes de autovacuum da tabela, com o valor do servidor; as partições, as colunas, os índices, as visões que dependem dela e as consultas cujo plano a lê

* Com um filtro de situação, os comandos de todas as tabelas da lista copiados de uma vez, um por linha

* Caminhos entre as telas: os índices da tabela abrem Índices, as visões abrem Visões, os gatilhos abrem a função deles em Funções, e a tabela de um índice ou de uma visão abre o detalhe dela em Tabelas

🔹 **Objetos do banco › Funções**

* Inventário das funções, dos procedimentos e das funções de gatilho de cada esquema, com busca pelo nome, pelos argumentos, pela descrição ou por um trecho do código e filtros de tipo, esquema, linguagem e situação

* Chamadas, tempo total e tempo por chamada dos últimos 30 dias, com ordenação pelas colunas e 15 funções por página; cada sobrecarga numa linha, com os argumentos ao lado do nome

* Funções que rodam com os privilégios do dono sem fixar o search_path, funções pesadas (100 ms ou mais por chamada) e funções sem chamadas em 30 dias em destaque, com atalhos que filtram cada caso; uma função de que dependem um gatilho ativo, um índice ou uma visão nunca entra como sem chamadas

* Pontos de atenção no topo, do mais urgente ao menos urgente, cada um com o atalho para a função ou para a lista filtrada

* Detalhe de cada função: o comando que fixa o caminho de busca ou remove a função, pronto para copiar; o uso, com a parte do tempo gasta dentro da própria função; os parâmetros, o retorno e a volatilidade explicados; o código com cópia; os gatilhos que a chamam, com atalho para a tabela; as consultas que a citam, com atalhos para o plano e o Histórico; e os índices e as visões que dependem dela

* Com um filtro de situação, os comandos de todas as funções da lista copiados de uma vez, um por linha

* Aviso quando o servidor não mede as chamadas das funções (`track_functions = none`), com os comandos que ligam a medida, e as funções que o servidor não mede marcadas como "Não medida"

🔹 **Usuários e permissões › Papéis**

* Inventário dos usuários e dos grupos do banco, com busca pelo nome ou pela descrição e filtros de tipo, atributo e situação; o papel da conexão em uso leva o selo "Você"

* Sessões abertas agora e o limite de cada usuário, o último uso visto pelo Orynt e a validade da senha, com ordenação pelas colunas e 15 papéis por página

* Superusuários com login além do criado na instalação, senhas vencidas ou que vencem em até 7 dias, senhas em MD5, usuários com 80% ou mais do limite de conexões, usuários sem nenhuma sessão em 30 dias e grupos vazios em destaque, com atalhos que filtram cada caso

* Pontos de atenção no topo, do mais urgente ao menos urgente, cada um com o atalho para o papel ou para a lista filtrada

* Detalhe de cada papel: o comando que resolve cada ponto, pronto para copiar e sem nenhuma senha no texto; o acesso; os atributos explicados, incluindo os que ele só ganha com SET ROLE num grupo; de quem ele é membro e quem é membro dele; as configurações próprias, com aviso quando um usuário comum não tem `statement_timeout`; e os objetos de que é dono, com atalho para Tabelas, Visões e Funções

* Aviso quando o papel é dono de uma função `SECURITY DEFINER` que não fixa o `search_path`

* Com um filtro de situação, os comandos de todos os papéis da lista copiados de uma vez, um por linha

* O dono no detalhe de uma tabela, de uma visão ou de uma função abre o papel em Papéis

* O detalhe de um usuário com sessões abertas leva às sessões dele em Sessões

* O detalhe de um papel leva ao que ele pode fazer em Permissões

🔹 **Usuários e permissões › Sessões**

* Retrato do `pg_stat_activity`: conexões sobre o `max_connections`, sessões por estado, por aplicação e por origem, com "Atualizar" e atualização automática a cada 10 segundos, que pausa com a aba oculta ou com um detalhe aberto

* Cadeias de bloqueio em árvore, da sessão que segura o bloqueio até as que esperam por ela

* Sessões bloqueando outras, esperando bloqueio há 30 s ou mais, com transação parada há 5 min ou mais, com consulta rodando há 5 min ou mais e com transação aberta há 30 min ou mais em destaque, com atalhos que filtram cada caso e pontos de atenção no topo

* Lista com busca pelo PID, papel, aplicação, endereço ou SQL e filtros de banco, estado, situação e papel; os processos do servidor ficam atrás de uma chave

* Detalhe de cada sessão: `pg_cancel_backend` e `pg_terminate_backend` prontos para copiar, a linha do tempo da sessão, a consulta com atalhos para o plano e o Histórico, quem ela bloqueia e por quem espera, os bloqueios que segura e espera, e a conexão, com atalho para o papel

* Sugestão de `idle_in_transaction_session_timeout` para o papel que deixa transações paradas com frequência, também no detalhe dele em Papéis

* Com um filtro de situação, os comandos de todas as sessões da lista copiados de uma vez, um por linha

* O cartão "Conexões ativas" do Dashboard leva a Sessões

🔹 **Usuários e permissões › Permissões**

* O que cada papel pode fazer em cada objeto do banco: o banco, os esquemas, as tabelas, as visões, as sequências e as funções, com o acesso efetivo e a origem de cada privilégio (direto, por um grupo, por PUBLIC, por ser dono ou superusuário)

* Três modos: tudo o que um papel alcança, todos que alcançam um objeto e dois papéis lado a lado, só com as diferenças, começando no papel mais parecido

* Funções `SECURITY DEFINER` que qualquer papel executa, esquemas em que qualquer papel cria objetos, escrita num grupo de leitura, `WITH GRANT OPTION` dado a um usuário, privilégio sem `USAGE` no esquema, `USAGE` sem nenhum objeto e esquema sem privilégio padrão para o grupo que o lê, com atalhos que filtram cada caso e pontos de atenção no topo

* Detalhe de cada acesso: o comando que resolve cada ponto, cada privilégio com o efeito e todas as origens, como tirar o acesso ou, sem acesso, o `GRANT` mínimo, e atalhos para o objeto, o papel e a comparação

* Privilégios padrão do banco em frases, com o `ALTER DEFAULT PRIVILEGES` de cada um

* Com um filtro de situação, os comandos de todas as linhas copiados de uma vez, um por linha

* O detalhe de uma tabela, de uma visão ou de uma função mostra quem a acessa e leva a Permissões

<br>

## ⚙️ Pré-requisitos

* Node.js 20 ou superior

* npm, que acompanha o Node.js

<br>

## 📦 Instalação

```bash
# Instala as dependências
$ npm install
```

<br>

## ▶️ Como Executar

```bash
# Sobe o servidor de desenvolvimento em http://localhost:5176
$ npm run dev
```

Sem um arquivo `.env`, a aplicação usa os dados simulados e não precisa de backend. A primeira tela é
o login; depois dele vem o dashboard, que carrega a conexão salva usada por último ou, se não houver
nenhuma, mostra o botão "Conectar ao banco". Ele abre o modal de conexão, onde qualquer conjunto de
dados válido conecta.

<br>

## 🔑 Acesso de Demonstração

O login desta fase é fictício: não há backend nem autenticação real, e ele não deve ser tratado como
seguro para produção. As credenciais ficam em
[`src/dados/simulacao/credenciaisDemonstracao.ts`](src/dados/simulacao/credenciaisDemonstracao.ts) e
também aparecem na própria tela de login, com um botão que preenche os campos.

| Campo | Valor |
|---|---|
| E-mail | `demo@orynt.local` |
| Senha | `orynt-demo` |

Qualquer outra combinação mostra "E-mail ou senha incorretos". Para voltar à tela de login depois de
entrar, abra o menu da conta (o círculo com a inicial, no canto superior direito) e use "Sair".

O link "Esqueceu sua senha?" abre a recuperação de senha. Ela também é fictícia: nenhum e-mail é
enviado. Informe `demo@orynt.local` e o código de verificação aparece no cartão "Caixa de entrada
simulada", na própria tela, com o botão "Usar código". Qualquer outro e-mail passa pela mesma etapa e
recebe a mesma resposta, mas nenhum código funciona, porque só o e-mail de demonstração tem conta. A
senha nova é conferida e descartada: o acesso continua sendo `orynt-demo`.

<br>

## 🔎 Como Testar os Cenários

Em desenvolvimento, o modal de conexão mostra o painel **Cenário da simulação**, que define o resultado
da próxima tentativa: sucesso, senha incorreta, servidor inacessível, banco inexistente ou tempo
esgotado. O cenário vale também para a ativação de uma conexão salva. O painel não entra no build de
produção.

O console do navegador tem os mesmos controles e alguns a mais:

```js
// Define o resultado da próxima tentativa de conexão
oryntSimulacao.cenario('SENHA_INCORRETA')

// Faz as rotas que começam assim responderem 503 (false desliga)
oryntSimulacao.falhar('/dashboard')

// Com '/conexoes', a verificação da conexão falha e o dashboard oferece "Tentar novamente"
oryntSimulacao.falhar('/conexoes')

// Fixa a latência em milissegundos, para ver os esqueletos (false volta ao normal)
oryntSimulacao.latencia(8000)

// Com '/relatorios', o resumo, a exportação e a comparação mostram o estado de erro
oryntSimulacao.falhar('/relatorios')

// Com '/objetos' ou '/usuarios', as telas de Objetos do banco ou as de Papéis, Sessões e Permissões mostram o estado de erro
oryntSimulacao.falhar('/usuarios')

// Esvazia os dados das telas, para ver os estados vazios (esvaziar(false) restaura)
oryntSimulacao.esvaziar()

// Muda o track_functions simulado do servidor ('none', 'pl' ou 'all'; o padrão é 'pl')
oryntSimulacao.rastrearFuncoes('none')

// Encerra a conexão simulada com o banco
oryntSimulacao.encerrarSessao()

// Na recuperação de senha, faz o código enviado expirar agora
oryntSimulacao.expirarCodigo()

// Na etapa da nova senha, faz o prazo da troca acabar agora
oryntSimulacao.expirarRedefinicao()

// Com '/autenticacao/recuperacao', as três etapas da recuperação mostram o erro do servidor
oryntSimulacao.falhar('/autenticacao/recuperacao')

// Encerra o login e a conexão, e recarrega na tela de login
oryntSimulacao.sair()
```

<br>

## 📜 Scripts Disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento na porta 5176 |
| `npm test` | Testes com Vitest |
| `npm run typecheck` | Checagem de tipos (`tsc -b`) |
| `npm run build` | Checagem de tipos e build de produção em `dist` |
| `npm run preview` | Serve o build de produção na porta 4176 |

<br>

## 🔐 Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_FONTE_DADOS` | Origem dos dados: `simulada` (padrão) ou `api` |
| `VITE_URL_API` | URL base da API, usada quando `VITE_FONTE_DADOS=api`. Padrão: `http://localhost:8080/api` |

Copie `.env.example` para `.env` para alterar os valores.

`public/config.js` define `window.__ORYNT_CONFIG__` e é carregado antes da aplicação, para que o mesmo
build sirva qualquer ambiente. `urlApi` tem prioridade sobre `VITE_URL_API`; `versao` e `dataLancamento`
aparecem em Configurações › Versões. Sem `versao`, a tela usa o `version` do `package.json`.

```js
window.__ORYNT_CONFIG__ = {
  urlApi: 'https://api.exemplo.com/orynt',
  versao: '1.0.0',
  dataLancamento: '2026-09-29T14:32:05Z',
};
```

<br>

## 🔌 Integração com a API

Páginas e componentes chamam serviços, os serviços chamam o cliente HTTP, e só ele escolhe o
transporte: o simulador ou o `fetch`.

```
Página → Serviço → Cliente HTTP → Transporte simulado  (VITE_FONTE_DADOS=simulada)
                                → Transporte fetch     (VITE_FONTE_DADOS=api)
```

Quando a API existir, trocar a origem dos dados é mudar as duas variáveis acima. Com
`VITE_FONTE_DADOS=api`, o simulador nem entra no pacote. O selo de demonstração e os avisos de dados
fictícios dependem do campo `simulada` da conexão, e somem quando a API responder `false`.

<br>

## 🔒 Segurança

* **Senha:** não é gravada em `localStorage`, `sessionStorage`, cookie, URL ou console, e sai da memória do formulário quando a conexão é aceita.

* **Login:** é fictício nesta fase. A senha digitada não é gravada em lugar nenhum e sai da memória do formulário quando o acesso é aceito.

* **Recuperação de senha:** a tela nunca confirma se um e-mail tem conta, e código errado, expirado ou de e-mail sem conta recebem a mesma mensagem. E-mail, código e senha nova ficam só na memória da página, fora da URL e do armazenamento do navegador.

* **Sessão:** o contrato prevê um cookie `HttpOnly; Secure; SameSite=Strict` criado pela API no login, que nenhum script consegue ler.

* **Simulação:** enquanto não há API, o simulador faz o papel do servidor com cookies de sessão comuns (um do login, outro da conexão), sem senha e sem dado real.

* **Conexões salvas:** pelo contrato ficam na conta, com a senha cifrada pela API. No simulador a lista fica no `localStorage`, só com nome, tipo, host, porta, banco, usuário e último uso.

<br>

## 📂 Estrutura do Projeto

```
src
├── api             # Cliente HTTP, rotas da API, erros e transporte fetch
├── componentes
│   ├── comum       # Marca e tela de verificação
│   ├── conexao     # Modal e formulário, URL de conexão, conexões salvas e alerta
│   ├── configuracoes # Seções de conexão em uso, de conexões salvas, de aparência e de versões
│   ├── consultas   # Filtros, tabela e modal da lista de consultas; seletor, gráficos e tabela do histórico
│   ├── dashboard   # Indicadores, gráfico de atividade e tabela de consultas
│   ├── layout      # Menu lateral, cabeçalho e menu da conta
│   ├── login       # Formulário de acesso e painel animado de monitoramento
│   ├── recuperacao # Etapas da recuperação de senha, medidor de força e cartão de demonstração
│   ├── relatorios  # Barra de período, blocos do resumo, da exportação e da comparação
│   └── ui          # Design system
├── configuracoes   # Ambiente, nome da aplicação e navegação
├── dados
│   └── simulacao   # Simulador da API e dados demonstrativos
├── estilos         # Tokens, temas e estilos globais
├── ganchos         # Fluxos de acesso, de recuperação de senha e de conexão, cena do login e dados assíncronos
├── layouts         # Estrutura com menu, cabeçalho e conteúdo, e a do login e da recuperação de senha
├── modelos         # DTOs, enums e rótulos
├── paginas         # Uma página por rota
├── provedores      # Tema, notificações, autenticação, conexões e modal de nova conexão
├── regras          # Validação, URL de conexão, conexões salvas, leitura de falhas e períodos, destaques e exportação dos relatórios, com testes
├── rotas           # Caminhos, tabela de rotas e guardas de acesso e de conexão
├── servicos        # Serviços de autenticação, de conexão, de dashboard e de relatórios
└── utilitarios     # Formatação, SQL, gráficos, área de transferência, download e foco
```

<br>

## 📚 Documentação

| Arquivo | Conteúdo |
|---|---|
| [`REQUISITOS.md`](REQUISITOS.md) | Decisões de produto e regras da conexão |
| [`docs/api-contrato.md`](docs/api-contrato.md) | Rotas, DTOs e erros que a API precisa implementar |

<br>

## ⚠️ Limitações

* Nenhum banco real é acessado: a conexão é simulada e os números do dashboard e do resumo são fictícios.

* Não há modo SSL no formulário de conexão.

* Não há Dockerfile, integração contínua nem publicação configurados.

<br>

## 🖥️ Desenvolvedor

### 🔵 LinkedIn: [Gustavo Correa](https://www.linkedin.com/in/gustavo-chauar-correa-946168269/)
