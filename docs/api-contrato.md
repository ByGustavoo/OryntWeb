# Contrato da API — OryntAPI

Este documento descreve as rotas que o OryntWeb consome e como ele as consome. Foi escrito a
partir do código do front-end (`src/servicos/`, `src/modelos/`, `src/api/`) e do simulador
(`src/dados/simulacao/`), que hoje é a implementação de referência.

**O backend ainda não existe.** Nada aqui foi implementado no servidor: é o contrato que o front
espera. Onde algo depende de uma decisão do backend, o texto diz **A DEFINIR NO BACKEND**.

---

## 1. Convenções gerais

| Item | Valor |
|---|---|
| URL base | `VITE_URL_API`, ou `window.__ORYNT_CONFIG__.urlApi` quando preenchido. Padrão: `http://localhost:8080/api`. A URL definitiva é **A DEFINIR NO BACKEND**. |
| Formato | JSON em UTF-8. O front envia `Accept: application/json` e, quando há corpo, `Content-Type: application/json`. |
| Nomes | Campos em português, em camelCase sem acento. Enums em MAIÚSCULAS. Rotas em português, em kebab-case. |
| Instantes | ISO 8601 em UTC (`2026-10-10T19:15:10.651Z`). |
| Durações | Milissegundos, com uma casa decimal (`tempoMedioMs: 38.9`). |
| Tempo limite | O front desiste de uma requisição depois de 15 s. |

### 1.1 Sessão

A sessão é um cookie criado pela API no login, em `POST /autenticacao/sessao`. As conexões com bancos
ficam salvas na conta do usuário, e uma delas por vez fica ativa na sessão, por `POST /conexoes` ou
`POST /conexoes/{id}/ativacao`:

```http
Set-Cookie: orynt_sessao=<token opaco>; HttpOnly; Secure; SameSite=Strict; Path=/
```

* O front nunca lê nem guarda o token. Toda requisição sai com `credentials: 'include'`.
* A API precisa responder com `Access-Control-Allow-Credentials: true` e uma origem explícita em
  `Access-Control-Allow-Origin` (não `*`).
* Sem sessão válida, as rotas protegidas respondem `401`. O front volta para a tela de login quando o
  `401` vem de `GET /autenticacao/sessao` ou de `GET /conexoes`.
* Com sessão, mas sem conexão ativa, `GET /conexoes/atual` e as rotas do dashboard e dos relatórios respondem `401`. O
  front fica no dashboard: ativa a conexão salva usada por último ou, se não há nenhuma, mostra o botão que
  abre o modal de conexão.
* Um novo login abre uma sessão nova, sem conexão ativa. As conexões salvas continuam na conta.
* A senha do banco chega só em `POST /conexoes` e `POST /conexoes/teste`. A API a guarda cifrada junto
  da conexão salva, para reativá-la sem pedir a senha de novo, e ela nunca volta numa resposta. O
  algoritmo e a guarda da chave são **A DEFINIR NO BACKEND**.
* Nome do cookie e duração da sessão são **A DEFINIR NO BACKEND**.
* **Autorização:** cada rota pede uma permissão da conta (tabela abaixo), conferida pela API em toda
  requisição, com as permissões lidas do banco naquele momento. Sem ela, `403` com `type` terminando em
  `/problems/forbidden`, e a tentativa vira um evento `ACESSO_NEGADO` da auditoria. O front esconde menus e
  bloqueia botões pela mesma regra, mas a palavra final é da API.
* Uma sessão cuja conta foi desativada, excluída ou teve as sessões encerradas responde `401` com `type`
  terminando em `/problems/unauthenticated` em qualquer rota, e o front volta para o login.

| Permissão | Rotas |
|---|---|
| `DASHBOARD_VER` | `/dashboard/*` |
| `RELATORIOS_VER` | `/relatorios/*` (Resumo, Exportação e Comparação) |
| `CONSULTAS_VER` | `/consultas`, `/consultas/{id}/*` |
| `OBJETOS_VER` | `/objetos/*` |
| `BANCO_ACESSOS_VER` | `GET /usuarios/*` |
| `BANCO_PAPEIS_ALTERAR` | `POST /usuarios/alteracoes` com operações de papel (`CRIAR_PAPEL`, `ALTERAR_PAPEL`, `RENOMEAR_PAPEL`, `DESCREVER_PAPEL`, `CONFIGURAR_PAPEL`, `EXCLUIR_PAPEL`, `CONCEDER_PARTICIPACAO`, `REVOGAR_PARTICIPACAO`) |
| `BANCO_PERMISSOES_ALTERAR` | `POST /usuarios/alteracoes` com `CONCEDER`, `REVOGAR` ou `PRIVILEGIO_PADRAO` (um lote com os dois tipos pede as duas) |
| `CONEXOES_USAR` | `POST /conexoes`, `POST /conexoes/teste`, `POST /conexoes/{id}/ativacao`, `PATCH` e `DELETE /conexoes/{id}` |
| `ADMIN_USUARIOS` | `/administracao/*` |
| `ADMIN_AUDITORIA` | `GET /auditoria` |
| só a sessão | `GET` e `DELETE /autenticacao/sessao`, `GET /conexoes`, `GET` e `DELETE /conexoes/atual`, `GET /sistema/versao`, `POST /auditoria/acessos` |

---

## 2. Modelo de erro — `ErrorResponseDTO`

Toda resposta de erro tem este corpo, o mesmo dos outros projetos:

```json
{
  "status": 422,
  "title": "Autenticação recusada!",
  "instance": "/api/conexoes",
  "type": "/api/problems/connection-authentication-failed",
  "detail": "password authentication failed for user \"analista\"",
  "errors": [{ "campo": "host", "mensagem": "Informe o endereço do servidor." }]
}
```

`errors` só aparece em erro de validação. O `campo` usa o nome do campo do corpo enviado.

### 2.1 Como o front classifica

| Status | Tipo no front | O que a tela faz |
|---|---|---|
| `400`, `422` | `VALIDACAO` | Mostra as mensagens de `errors` nos campos |
| `401` | `NAO_AUTORIZADO` | Com `type` `/problems/unauthenticated`, volta para a tela de login de qualquer tela; sem ele, mostra a tela sem conexão; no login, mostra "E-mail ou senha incorretos" |
| `403` | `PROIBIDO` | Mostra o `detail` (a permissão que falta); no login, "Esta conta está desativada" |
| `404` | `NAO_ENCONTRADO` | Estado de erro da região |
| `409` | `CONFLITO` | Estado de erro da região |
| `429` | `LIMITE_EXCEDIDO` | Pede para aguardar antes de tentar de novo; na recuperação de senha, pede um novo código |
| outros `>= 400` | `SERVIDOR` | Estado de erro com "Tentar novamente"; o `detail` não é exibido |
| sem resposta | `REDE` | "O Orynt não respondeu" |
| 15 s sem resposta | `TEMPO_ESGOTADO` | "O servidor demorou demais para responder" |

### 2.2 Falhas de conexão com o banco

Para escolher a mensagem e os campos a destacar, o front olha o **fim** do `type`. O `detail` técnico
do PostgreSQL nunca é mostrado à pessoa.

| `type` termina em | Status sugerido | Significado | Campos destacados |
|---|---|---|---|
| `/problems/connection-authentication-failed` | `422` | Usuário ou senha recusados | usuário, senha |
| `/problems/connection-database-not-found` | `422` | O banco não existe no servidor | banco |
| `/problems/connection-unreachable` | `502` | Host ou porta não respondem | host, porta |
| `/problems/connection-timeout` | `504` | O banco não respondeu a tempo | nenhum |

Os valores de `type` e os status são provisórios: os definitivos são **A DEFINIR NO BACKEND**, e basta
ajustar `PROBLEMAS_CONEXAO` em `src/modelos/conexao.ts`.

---

## 3. Índice de endpoints

| Método | Rota | Para quê | Sessão |
|---|---|---|---|
| `POST` | `/autenticacao/sessao` | Faz o login e abre a sessão | não |
| `GET` | `/autenticacao/sessao` | Devolve o usuário da sessão | sim |
| `DELETE` | `/autenticacao/sessao` | Encerra o login e a conexão ativa | sim |
| `POST` | `/autenticacao/recuperacao` | Pede um código de recuperação de senha por e-mail | não |
| `POST` | `/autenticacao/recuperacao/verificacao` | Valida o código e libera a troca da senha | não |
| `POST` | `/autenticacao/recuperacao/senha` | Grava a senha nova | não |
| `POST` | `/conexoes/teste` | Testa as credenciais do banco sem conectar | sim |
| `POST` | `/conexoes` | Conecta ao banco, salva a conexão na conta e a ativa na sessão | sim |
| `GET` | `/conexoes` | Lista as conexões salvas na conta | sim |
| `POST` | `/conexoes/{id}/ativacao` | Ativa uma conexão salva na sessão | sim |
| `PATCH` | `/conexoes/{id}` | Renomeia uma conexão salva | sim |
| `DELETE` | `/conexoes/{id}` | Exclui uma conexão salva | sim |
| `GET` | `/conexoes/atual` | Devolve a conexão ativa da sessão | sim |
| `DELETE` | `/conexoes/atual` | Encerra a conexão ativa | sim |
| `GET` | `/dashboard/indicadores` | Os quatro indicadores do período | sim |
| `GET` | `/dashboard/atividade` | Série de consultas ao longo do tempo | sim |
| `GET` | `/dashboard/consultas` | Consultas que mais consumiram tempo | sim |
| `GET` | `/relatorios/resumo` | Resumo de um dia, uma semana ou um mês já encerrado | sim |
| `GET` | `/consultas` | Lista completa das consultas do período, com busca, filtros, ordenação e paginação | sim |
| `GET` | `/consultas/{id}/historico` | Uma consulta ao longo do período: os números dela e cada intervalo | sim |
| `GET` | `/consultas/{id}/plano` | O plano de execução registrado de uma consulta, as versões dele nos últimos 30 dias e os índices sugeridos | sim |
| `GET` | `/objetos/visoes` | As visões comuns e materializadas do banco, com as dependências e as consultas que as leem | sim |
| `GET` | `/objetos/indices` | Os índices do banco, com o tamanho, as leituras e as gravações dos últimos 30 dias, as consultas cujo plano os lê e os índices sugeridos pelos planos | sim |
| `GET` | `/objetos/tabelas` | As tabelas do banco, com o espaço que ocupam, as linhas vivas e mortas, a manutenção, as leituras e as gravações dos últimos 30 dias, o crescimento diário, as partições, os ajustes de autovacuum, os índices, as visões que dependem delas e as consultas cujo plano as lê | sim |
| `GET` | `/objetos/funcoes` | As funções e os procedimentos do banco, com o código, as chamadas e o tempo dos últimos 30 dias, os gatilhos que as chamam, os índices e as visões que dependem delas e as consultas que as citam | sim |
| `GET` | `/usuarios/papeis` | Os usuários e os grupos do servidor, com os atributos, as participações, as sessões abertas, o último uso visto, a validade e o formato da senha, as configurações próprias e os objetos deste banco de que cada um é dono | sim |
| `GET` | `/usuarios/sessoes` | O retrato do `pg_stat_activity` do servidor: cada sessão com o papel, o banco, a aplicação, o estado, a espera, a consulta com os literais trocados, quem a bloqueia e os bloqueios que segura | sim |
| `GET` | `/usuarios/permissoes` | As permissões de cada objeto do banco (o banco, os esquemas, as tabelas, as visões, as sequências e as funções), os papéis com as participações e os privilégios padrão | sim |
| `POST` | `/usuarios/alteracoes` | Executa, numa transação, as operações de papéis e de permissões revisadas na tela | sim |
| `GET` | `/usuarios/alteracoes` | O histórico das alterações feitas pelo Orynt no servidor, aplicadas e recusadas | sim |
| `GET` | `/sistema/versao` | Versão publicada da API e a data de lançamento | não |
| `POST` | `/autenticacao/convite/verificacao` | Confere o token de um convite e devolve o nome e o e-mail | não |
| `POST` | `/autenticacao/convite` | Define a senha pelo convite | não |
| `GET` | `/administracao/contas` | As contas do Orynt | sim |
| `POST` | `/administracao/contas` | Cria uma conta e envia o convite | sim |
| `PATCH` | `/administracao/contas/{id}` | Edita o nome e o e-mail, ativa ou desativa | sim |
| `PUT` | `/administracao/contas/{id}/permissoes` | Troca o perfil e as permissões | sim |
| `DELETE` | `/administracao/contas/{id}` | Exclui a conta | sim |
| `POST` | `/administracao/contas/{id}/convite` | Reenvia o convite | sim |
| `DELETE` | `/administracao/contas/{id}/sessoes` | Encerra as sessões da conta | sim |
| `DELETE` | `/administracao/contas/{id}/bloqueio` | Desbloqueia o login | sim |
| `GET` | `/auditoria` | Os eventos registrados, com filtros e paginação | sim |
| `POST` | `/auditoria/acessos` | Registra a tela aberta | sim |

---

## 4. Modelos (DTOs)

### 4.1 Enums

| Enum | Valores |
|---|---|
| `TipoBanco` | `POSTGRESQL` |
| `PeriodoDashboard` | `ULTIMA_HORA`, `ULTIMAS_24_HORAS`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS` |
| `DesempenhoConsulta` | `RAPIDA`, `MODERADA`, `LENTA` |
| `GranularidadeRelatorio` | `DIA`, `SEMANA`, `MES` |
| `TipoComando` | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `OUTRO` |
| `OrdenacaoConsultas` | `PERCENTUAL_TEMPO_TOTAL`, `TEMPO_MEDIO`, `TEMPO_MAXIMO`, `EXECUCOES` |
| `DirecaoOrdenacao` | `ASC`, `DESC` |
| `TipoVisao` | `COMUM`, `MATERIALIZADA` |
| `TipoObjetoBanco` | `TABELA`, `VISAO`, `VISAO_MATERIALIZADA` |

### 4.2 Autenticação

```ts
interface CredenciaisAcessoDTO {
  email: string;
  senha: string;
}

interface UsuarioDTO {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
  simulado: boolean;
}

interface VerificacaoConviteDTO {
  token: string;
}

interface ConviteValidoDTO {
  nome: string;
  email: string;
  expiraEm: string;
}

interface AceiteConviteDTO {
  token: string;
  senha: string;
}

interface PedidoRecuperacaoDTO {
  email: string;
}

interface VerificacaoCodigoDTO {
  email: string;
  codigo: string;
}

interface RedefinicaoLiberadaDTO {
  tokenRedefinicao: string;
}

interface NovaSenhaDTO {
  tokenRedefinicao: string;
  senha: string;
}
```

* `UsuarioDTO` nunca traz a senha.
* `simulado` é `true` só no simulador.
* `tokenRedefinicao` é opaco, de uso único e de vida curta. O front o mantém só na memória da tela.
* `permissoes` são as efetivas da conta naquele momento. O front as relê a cada tela aberta.
* O token do convite chega no fragmento do link (`/ativar-conta#convite=...`), que não vai ao servidor nem aos
  logs de acesso; a tela o tira do endereço assim que o lê.

### 4.11 Administração e auditoria

Os tipos estão em `src/modelos/administracao.ts`: `PerfilConta`, `CodigoPermissao`, `ContaDTO`, `ListaContasDTO`,
`NovaContaDTO`, `EdicaoContaDTO`, `PermissoesContaDTO`, `EventoAuditoriaDTO`, `PaginaAuditoriaDTO`,
`ResumoContaAuditoriaDTO` e `AcessoTelaDTO`.

* `ContaDTO` nunca traz a senha, o hash, o token do convite nem as sessões; só `sessoesAtivas` e `conexoesSalvas`
  como números. `convite` é `null` quando a senha já foi definida. `bloqueadaAte` vem só enquanto o bloqueio vale.
* A situação da conta é decidida no front (`regras/contas.ts`): `DESATIVADA`, `BLOQUEADA`, `CONVITE_PENDENTE`,
  `CONVITE_EXPIRADO` e `ATIVA`, nessa ordem.
* Os perfis são `LEITOR` (dashboard, relatórios e conexões), `ANALISTA` (o Leitor mais consultas, objetos e a
  leitura de papéis, sessões e permissões do banco) e `ADMINISTRADOR` (todo o catálogo). O perfil é um ponto de
  partida: `permissoes` é a lista efetiva, que pode fugir dele.
* `EventoAuditoriaDTO.conta` e `alvo.rotulo` guardam o nome e o e-mail do momento do evento, para continuarem
  legíveis depois que a conta mudar ou for excluída.

### 4.3 Conexão

```ts
interface CredenciaisConexaoDTO {
  tipoBanco: TipoBanco;
  nome: string | null;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  senha: string;
}

interface ConexaoDTO {
  id: string;
  tipoBanco: TipoBanco;
  nome: string;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  versaoServidor: string;
  conectadaEm: string;
  simulada: boolean;
}

interface ConexaoSalvaDTO {
  id: string;
  tipoBanco: TipoBanco;
  nome: string;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  ultimoUsoEm: string;
}

interface RenomeacaoConexaoDTO {
  nome: string;
}

interface TesteConexaoDTO {
  versaoServidor: string;
  latenciaMs: number;
  simulado: boolean;
}
```

* `ConexaoDTO` e `ConexaoSalvaDTO` nunca trazem a senha.
* O `id` de `ConexaoDTO` é o `id` da conexão salva que está ativa.
* `ultimoUsoEm` é o instante da última vez em que a conexão foi ativada.
* Quando `nome` chega nulo, a API devolve "`banco` em `host`".
* `simulada` e `simulado` são `true` só no simulador. A API real devolve `false`, e com isso o
  menu da conta troca o selo "Demonstração" por "Conectada" e os avisos de dados fictícios somem.

### 4.4 Dashboard

```ts
interface IndicadoresDashboardDTO {
  periodo: PeriodoDashboard;
  totalConsultas: number;
  variacaoTotalConsultas: number | null;
  tempoMedioMs: number;
  variacaoTempoMedio: number | null;
  consultasLentas: number;
  consultasDistintas: number;
  conexoesAtivas: number;
  limiteConexoes: number;
}

interface PontoAtividadeDTO {
  instante: string;
  consultas: number;
  tempoMedioMs: number;
}

interface ConsultaResumoDTO {
  id: string;
  sql: string;
  tempoMedioMs: number;
  quantidadeExecucoes: number;
  percentualTempoTotal: number;
  desempenho: DesempenhoConsulta;
}
```

### 4.5 Sistema

```ts
interface VersaoSistemaDTO {
  versao: string;
  dataLancamento: string | null;
}
```

### 4.6 Relatórios

```ts
interface ResumoRelatorioDTO {
  granularidade: GranularidadeRelatorio;
  inicio: string;
  fim: string;
  indicadores: IndicadoresRelatorioDTO;
  evolucao: PontoAtividadeDTO[];
  desempenho: FaixaDesempenhoDTO[];
  consultas: ConsultaRelatorioDTO[];
}

interface IndicadoresRelatorioDTO {
  totalConsultas: number;
  variacaoTotalConsultas: number | null;
  tempoMedioMs: number;
  variacaoTempoMedio: number | null;
  consultasLentas: number;
  consultasDistintas: number;
  picoConexoes: number;
  instantePicoConexoes: string | null;
  limiteConexoes: number;
}

interface FaixaDesempenhoDTO {
  desempenho: DesempenhoConsulta;
  consultasDistintas: number;
  quantidadeExecucoes: number;
  percentualExecucoes: number;
  percentualTempoTotal: number;
}

interface ConsultaRelatorioDTO extends ConsultaResumoDTO {
  variacaoTempoMedio: number | null;
}
```

### 4.7 Consultas

```ts
interface ConsultaDetalhadaDTO extends ConsultaResumoDTO {
  tipo: TipoComando;
  tempoTotalMs: number;
  tempoMinimoMs: number;
  tempoMaximoMs: number;
  linhasPorExecucao: number;
}

interface PaginaConsultasDTO {
  itens: ConsultaDetalhadaDTO[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
  totalDoPeriodo: number;
}

interface PontoHistoricoDTO {
  instante: string;
  quantidadeExecucoes: number;
  tempoMedioMs: number | null;
  tempoMaximoMs: number | null;
}

interface HistoricoConsultaDTO {
  periodo: PeriodoDashboard;
  consulta: ConsultaDetalhadaDTO;
  variacaoExecucoes: number | null;
  variacaoTempoMedio: number | null;
  posicao: number | null;
  totalDoPeriodo: number;
  idAnterior: string | null;
  idSeguinte: string | null;
  pontos: PontoHistoricoDTO[];
  trocasDePlano: TrocaDePlanoDTO[];
}

interface TrocaDePlanoDTO {
  instante: string;
  versao: string;
  versaoAnterior: string;
}

type TipoCondicaoPlano =
  | 'CONDICAO_INDICE'
  | 'RECHECAGEM'
  | 'CONDICAO_HASH'
  | 'FILTRO'
  | 'FILTRO_JUNCAO'
  | 'CHAVE_ORDENACAO'
  | 'CHAVE_AGRUPAMENTO';
type TipoJuncaoPlano = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'SEMI' | 'ANTI';
type EstrategiaAgregacao = 'SIMPLES' | 'ORDENADA' | 'HASH';
type OperacaoPlano = 'INSERT' | 'UPDATE' | 'DELETE';
type MetodoOrdenacao = 'QUICKSORT' | 'TOP_N_HEAPSORT' | 'EXTERNAL_MERGE';

interface NoPlanoDTO {
  id: number;
  tipo: string;
  operacao: OperacaoPlano | null;
  juncao: TipoJuncaoPlano | null;
  estrategia: EstrategiaAgregacao | null;
  sentidoInverso: boolean;
  relacao: string | null;
  apelido: string | null;
  indice: string | null;
  custoInicial: number;
  custoTotal: number;
  linhasEstimadas: number;
  larguraBytes: number;
  tempoInicialMs: number;
  tempoTotalMs: number;
  linhasReais: number;
  lacos: number;
  linhasRemovidasPeloFiltro: number | null;
  condicoes: { tipo: TipoCondicaoPlano; expressao: string }[];
  buffers: { emCache: number; lidos: number; temporariosLidos: number; temporariosEscritos: number };
  ordenacao: { metodo: MetodoOrdenacao; espacoKb: number; emDisco: boolean } | null;
  memoria: { lotes: number; memoriaKb: number; discoKb: number | null } | null;
  filhos: NoPlanoDTO[];
}

interface SugestaoIndiceDTO {
  no: number;
  tabela: string;
  colunas: string[];
  comando: string;
  extensao: string | null;
}

interface PlanoExecucaoDTO {
  id: string;
  registradoEm: string;
  tempoPlanejamentoMs: number;
  tempoExecucaoMs: number;
  raiz: NoPlanoDTO;
  sugestoes: SugestaoIndiceDTO[];
}

interface VersaoPlanoDTO {
  id: string;
  primeiroRegistro: string;
  ultimoRegistro: string;
  quantidadeExecucoes: number;
  tempoMedioMs: number;
}

interface PlanosConsultaDTO {
  consulta: ConsultaDetalhadaDTO;
  posicao: number | null;
  totalDoPeriodo: number;
  idAnterior: string | null;
  idSeguinte: string | null;
  versoes: VersaoPlanoDTO[];
  plano: PlanoExecucaoDTO | null;
}
```

### 4.8 Objetos do banco

```ts
interface ReferenciaObjetoDTO {
  tipo: TipoObjetoBanco;
  esquema: string;
  nome: string;
}

interface ColunaVisaoDTO {
  nome: string;
  tipo: string;
}

interface MaterializacaoDTO {
  populada: boolean;
  tamanhoBytes: number;
  linhas: number;
  ultimaAtualizacao: string | null;
  atualizacao: ConsultaDetalhadaDTO | null;
}

interface VisaoDTO {
  id: string;
  tipo: TipoVisao;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  definicao: string;
  colunas: ColunaVisaoDTO[];
  dependeDe: ReferenciaObjetoDTO[];
  usadaPor: ReferenciaObjetoDTO[];
  consultas: ConsultaDetalhadaDTO[];
  materializacao: MaterializacaoDTO | null;
}

interface ListaVisoesDTO {
  geradoEm: string;
  visoes: VisaoDTO[];
}

type MetodoIndice = 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'SPGIST' | 'BRIN';

type RestricaoIndice = 'CHAVE_PRIMARIA' | 'UNICA' | 'EXCLUSAO';

interface TabelaDoIndiceDTO {
  tipo: 'TABELA' | 'VISAO_MATERIALIZADA';
  esquema: string;
  nome: string;
  tamanhoBytes: number;
  linhas: number;
  insercoes: number;
  atualizacoes: number;
  atualizacoesHot: number;
}

interface UsoDoIndiceDTO {
  consulta: ConsultaDetalhadaDTO;
  etapa: string;
  leiturasPorExecucao: number;
  versao: string;
  versaoAtual: string;
  usadoAte: string | null;
}

interface IndiceDTO {
  id: string;
  esquema: string;
  nome: string;
  tabela: TabelaDoIndiceDTO;
  metodo: MetodoIndice;
  colunas: string[];
  incluidas: string[];
  predicado: string | null;
  unico: boolean;
  restricao: RestricaoIndice | null;
  valido: boolean;
  definicao: string;
  tamanhoBytes: number;
  leituras: number;
  linhasLidas: number;
  observadoDesde: string;
  funcoes: string[];
  usos: UsoDoIndiceDTO[];
}

interface SugestaoDeIndiceDTO {
  tabela: string;
  colunas: string[];
  comando: string;
  extensao: string | null;
  consultas: ConsultaDetalhadaDTO[];
}

interface ListaIndicesDTO {
  geradoEm: string;
  coletaDesde: string;
  indices: IndiceDTO[];
  sugestoes: SugestaoDeIndiceDTO[];
}

interface ColunaTabelaDTO {
  nome: string;
  tipo: string;
  anulavel: boolean;
  padrao: string | null;
}

type EstrategiaParticionamento = 'RANGE' | 'LIST' | 'HASH';

interface ParticaoDTO {
  id: string;
  esquema: string;
  nome: string;
  limites: string;
  tamanhoBytes: number;
  linhas: number;
  linhasMortas: number;
  idadeTransacoes: number;
  ultimoVacuum: string | null;
  ultimoAutovacuum: string | null;
}

interface ParticionamentoDTO {
  estrategia: EstrategiaParticionamento;
  chave: string;
  particoes: ParticaoDTO[];
}

interface IndiceDaTabelaDTO {
  id: string;
  nome: string;
  colunas: string[];
  restricao: RestricaoIndice | null;
  unico: boolean;
  valido: boolean;
  tamanhoBytes: number;
  leituras: number;
}

interface LeituraDaTabelaDTO {
  consulta: ConsultaDetalhadaDTO;
  etapa: string;
  indice: string | null;
  leiturasPorExecucao: number;
}

interface IndiceSugeridoDaTabelaDTO {
  colunas: string[];
  comando: string;
  extensao: string | null;
}

interface AjusteAutovacuumDTO {
  parametro: string;
  valor: string;
  padrao: string;
}

interface PontoDeCrescimentoDTO {
  dia: string;
  tamanhoBytes: number;
  linhas: number;
}

interface TabelaDTO {
  id: string;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  colunas: ColunaTabelaDTO[];
  chavePrimaria: string[] | null;
  tamanhoDadosBytes: number;
  tamanhoIndicesBytes: number;
  tamanhoToastBytes: number;
  linhas: number;
  linhasMortas: number;
  alteracoesDesdeAnalyze: number;
  insercoes: number;
  atualizacoes: number;
  atualizacoesHot: number;
  exclusoes: number;
  leiturasSequenciais: number;
  linhasLidasSequencialmente: number;
  leiturasPorIndice: number;
  linhasLidasPorIndice: number;
  ultimoVacuum: string | null;
  ultimoAutovacuum: string | null;
  ultimoAnalyze: string | null;
  ultimoAutoanalyze: string | null;
  idadeTransacoes: number;
  limiteCongelamento: number;
  autovacuum: AjusteAutovacuumDTO[];
  particionamento: ParticionamentoDTO | null;
  indices: IndiceDaTabelaDTO[];
  indicesSugeridos: IndiceSugeridoDaTabelaDTO[];
  usadaPor: ReferenciaObjetoDTO[];
  gatilhos: GatilhoDaTabelaDTO[];
  leituras: LeituraDaTabelaDTO[];
  crescimento: PontoDeCrescimentoDTO[];
}

interface ListaTabelasDTO {
  geradoEm: string;
  coletaDesde: string;
  tabelas: TabelaDTO[];
}

type MomentoGatilho = 'ANTES' | 'DEPOIS' | 'EM_VEZ_DE';
type EventoGatilho = 'INSERCAO' | 'ATUALIZACAO' | 'EXCLUSAO' | 'TRUNCAMENTO';
type NivelGatilho = 'LINHA' | 'COMANDO';

interface GatilhoDaTabelaDTO {
  nome: string;
  funcao: string;
  momento: MomentoGatilho;
  eventos: EventoGatilho[];
  nivel: NivelGatilho;
  ativo: boolean;
}

type TipoFuncao = 'FUNCAO' | 'PROCEDIMENTO' | 'GATILHO';
type VolatilidadeFuncao = 'IMUTAVEL' | 'ESTAVEL' | 'VOLATIL';
type ModoParametro = 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
type RastreamentoFuncoes = 'NENHUM' | 'PL' | 'TODAS';

interface ParametroFuncaoDTO {
  nome: string | null;
  tipo: string;
  modo: ModoParametro;
  padrao: string | null;
}

interface UsoDaFuncaoDTO {
  chamadas: number;
  tempoTotalMs: number;
  tempoProprioMs: number;
}

interface GatilhoDaFuncaoDTO {
  nome: string;
  tabela: ReferenciaObjetoDTO;
  momento: MomentoGatilho;
  eventos: EventoGatilho[];
  nivel: NivelGatilho;
  ativo: boolean;
}

interface IndiceDaFuncaoDTO {
  id: string;
  nome: string;
  tabela: string;
}

interface FuncaoDTO {
  id: string;
  esquema: string;
  nome: string;
  argumentos: string;
  tipo: TipoFuncao;
  linguagem: string;
  retorno: string | null;
  parametros: ParametroFuncaoDTO[];
  volatilidade: VolatilidadeFuncao;
  estrita: boolean;
  segurancaDefinidor: boolean;
  configuracoes: string[];
  dono: string;
  descricao: string | null;
  definicao: string;
  observadaDesde: string;
  uso: UsoDaFuncaoDTO | null;
  gatilhos: GatilhoDaFuncaoDTO[];
  indices: IndiceDaFuncaoDTO[];
  visoes: ReferenciaObjetoDTO[];
  consultas: ConsultaDetalhadaDTO[];
}

interface ListaFuncoesDTO {
  geradoEm: string;
  coletaDesde: string;
  rastreamento: RastreamentoFuncoes;
  funcoes: FuncaoDTO[];
}
```

### 4.9 Usuários e permissões

```ts
type MetodoSenha = 'SCRAM' | 'MD5' | 'SEM_SENHA';

type TipoObjetoDoPapel = 'TABELA' | 'VISAO' | 'VISAO_MATERIALIZADA' | 'FUNCAO' | 'PROCEDIMENTO';

interface ParticipacaoDTO {
  papel: string;
  herda: boolean;
  assume: boolean;
  administra: boolean;
}

interface FuncaoDoDonoDTO {
  segurancaDefinidor: boolean;
  configuracoes: string[];
}

interface ObjetoDoPapelDTO {
  tipo: TipoObjetoDoPapel;
  id: string;
  esquema: string;
  nome: string;
  funcao: FuncaoDoDonoDTO | null;
}

interface PapelDTO {
  nome: string;
  descricao: string | null;
  inicial: boolean;
  login: boolean;
  superusuario: boolean;
  criaBancos: boolean;
  criaPapeis: boolean;
  replicacao: boolean;
  ignoraRls: boolean;
  herda: boolean;
  limiteConexoes: number | null;
  validadeSenha: string | null;
  metodoSenha: MetodoSenha | null;
  configuracoes: string[];
  membroDe: ParticipacaoDTO[];
  membros: ParticipacaoDTO[];
  sessoes: number;
  vistoPorUltimo: string | null;
  observadoDesde: string;
  objetos: ObjetoDoPapelDTO[];
}

interface ListaPapeisDTO {
  geradoEm: string;
  coletaDesde: string;
  papelDaConexao: string;
  papeis: PapelDTO[];
}

type TipoObjetoPermissao =
  | 'BANCO'
  | 'ESQUEMA'
  | 'TABELA'
  | 'VISAO'
  | 'VISAO_MATERIALIZADA'
  | 'SEQUENCIA'
  | 'FUNCAO'
  | 'PROCEDIMENTO';

type Privilegio =
  | 'CONNECT'
  | 'CREATE'
  | 'TEMPORARY'
  | 'USAGE'
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'TRUNCATE'
  | 'REFERENCES'
  | 'TRIGGER'
  | 'MAINTAIN'
  | 'EXECUTE';

interface ConcessaoDTO {
  beneficiario: string;
  privilegio: Privilegio;
  concedente: string;
  repassavel: boolean;
  colunas: string[] | null;
}

interface ObjetoComPermissoesDTO {
  id: string;
  tipo: TipoObjetoPermissao;
  esquema: string | null;
  nome: string;
  dono: string;
  segurancaDefinidor: boolean;
  colunas: string[];
  concessoes: ConcessaoDTO[];
}

interface PrivilegioPadraoDTO {
  criador: string;
  esquema: string | null;
  tipoDeObjeto: 'TABELAS' | 'SEQUENCIAS' | 'FUNCOES';
  beneficiario: string;
  privilegios: Privilegio[];
}

interface PapelDasPermissoesDTO {
  nome: string;
  descricao: string | null;
  login: boolean;
  superusuario: boolean;
  membroDe: ParticipacaoDTO[];
}

interface ListaPermissoesDTO {
  geradoEm: string;
  banco: string;
  papelDaConexao: string;
  papeis: PapelDasPermissoesDTO[];
  objetos: ObjetoComPermissoesDTO[];
  privilegiosPadrao: PrivilegioPadraoDTO[];
}
```

### 4.10 Alterações de papéis e permissões

```ts
interface AtributosDoPapelDTO {
  login: boolean;
  superusuario: boolean;
  criaBancos: boolean;
  criaPapeis: boolean;
  replicacao: boolean;
  ignoraRls: boolean;
  herda: boolean;
}

type SenhaDaOperacaoDTO =
  | { tipo: 'VERIFICADOR'; valor: string }
  | { tipo: 'NENHUMA' }
  | { tipo: 'OCULTA' };

interface ReferenciaObjetoDTO {
  id: string;
  tipo: TipoObjetoPermissao;
  esquema: string | null;
  nome: string;
}

type AlvoDaConcessaoDTO =
  | { tipo: 'OBJETO'; objeto: ReferenciaObjetoDTO }
  | { tipo: 'TODOS_DO_ESQUEMA'; esquema: string; tipoDeObjeto: 'TABELAS' | 'SEQUENCIAS' | 'FUNCOES' };

type OperacaoDTO =
  | { tipo: 'CRIAR_PAPEL'; papel: string; atributos: AtributosDoPapelDTO; limiteConexoes: number | null; validadeSenha: string | null; senha: SenhaDaOperacaoDTO | null }
  | { tipo: 'ALTERAR_PAPEL'; papel: string; atributos: Partial<AtributosDoPapelDTO>; limiteConexoes?: number | null; validadeSenha?: string | null; senha?: SenhaDaOperacaoDTO }
  | { tipo: 'RENOMEAR_PAPEL'; papel: string; novoNome: string }
  | { tipo: 'DESCREVER_PAPEL'; papel: string; descricao: string | null }
  | { tipo: 'CONFIGURAR_PAPEL'; papel: string; parametro: string; valor: string | null }
  | { tipo: 'EXCLUIR_PAPEL'; papel: string; herdeiro: string | null; removerPermissoes: boolean; encerrarSessoes: boolean }
  | { tipo: 'CONCEDER_PARTICIPACAO'; grupo: string; membro: string; herda: boolean; assume: boolean; administra: boolean }
  | { tipo: 'REVOGAR_PARTICIPACAO'; grupo: string; membro: string }
  | { tipo: 'CONCEDER'; alvo: AlvoDaConcessaoDTO; beneficiario: string; privilegios: Privilegio[]; colunas: string[] | null; repassavel: boolean }
  | { tipo: 'REVOGAR'; alvo: AlvoDaConcessaoDTO; beneficiario: string; privilegios: Privilegio[]; colunas: string[] | null; soRepasse: boolean; concedentes: string[]; cascata: boolean }
  | { tipo: 'PRIVILEGIO_PADRAO'; acao: 'CONCEDER' | 'REVOGAR'; criador: string; esquema: string | null; tipoDeObjeto: 'TABELAS' | 'SEQUENCIAS' | 'FUNCOES'; beneficiario: string; privilegios: Privilegio[] };

type OrigemDaAlteracao = 'FORMULARIO' | 'MODELO' | 'PONTO_DE_ATENCAO' | 'LOTE' | 'DESFAZER' | 'DETALHE';

interface PedidoAlteracaoDTO {
  operacoes: OperacaoDTO[];
  inversas: OperacaoDTO[] | null;
  desfaz: string | null;
  origem: OrigemDaAlteracao;
}

interface AlteracaoDTO {
  id: string;
  feitaEm: string;
  conta: string;
  papelDaConexao: string;
  banco: string;
  origem: OrigemDaAlteracao;
  operacoes: OperacaoDTO[];
  comandos: string[];
  resultado: 'APLICADA' | 'RECUSADA';
  falha: { codigo: string; mensagem: string } | null;
  inversas: OperacaoDTO[] | null;
  desfaz: string | null;
  desfeitaPor: string | null;
}

interface ListaAlteracoesDTO {
  geradoEm: string;
  papelDaConexao: string;
  alteracoes: AlteracaoDTO[];
}
```

---

## 5. Autenticação

Nesta fase só o simulador responde a estas rotas. A conta de demonstração
(`src/dados/simulacao/credenciaisDemonstracao.ts`) é a conta inicial, administradora; as outras são criadas em
Administração › Usuários (seção 13) e entram com a senha definida pelo convite. A recuperação de senha (5.4 a 5.6) já tem contrato, porque a tela existe; o
simulador a cumpre sem enviar e-mail e sem gravar a senha.

### 5.1 `POST /autenticacao/sessao`

* **Corpo:** `CredenciaisAcessoDTO`.
* **`200`:** `UsuarioDTO`, com o `Set-Cookie` da seção 1.1.
* **`400`:** campos inválidos, com `errors` (`email` obrigatório e em formato de e-mail, até 254 caracteres; `senha` obrigatória e não aparada).
* **`401`:** credenciais recusadas, com `type` terminando em `/problems/invalid-credentials`. A resposta não diz qual dos dois campos está errado, nem se o e-mail tem conta.
* **`403`:** senha certa de uma conta desativada (`/problems/account-disabled`).
* **`429`:** cinco senhas erradas do mesmo e-mail em 15 minutos bloqueiam o login dele por 15 minutos, tenha o
  e-mail conta ou não, para o bloqueio não revelar quem existe (`/problems/too-many-attempts`). Durante o
  bloqueio, até a senha certa recebe `429`. A recuperação de senha e o desbloqueio pelo administrador tiram o bloqueio.
* O e-mail é comparado sem diferenciar maiúsculas de minúsculas.

### 5.2 `GET /autenticacao/sessao`

* **`200`:** `UsuarioDTO` da sessão.
* **`401`:** não há sessão. É a resposta normal de um primeiro acesso, e o front não a trata como erro.

### 5.3 `DELETE /autenticacao/sessao`

* **`204`:** login encerrado, junto com a conexão ativa. As conexões salvas continuam na conta.

### 5.4 `POST /autenticacao/recuperacao`

Pede o envio de um código de recuperação. **A resposta não pode revelar se o e-mail tem conta.**

* **Corpo:** `PedidoRecuperacaoDTO`.
* **`202`:** sem corpo, para qualquer e-mail bem formado, com conta ou sem. O corpo, os cabeçalhos e o
  tempo de resposta precisam ser os mesmos nos dois casos (o envio do e-mail acontece fora da requisição).
* **`400`:** e-mail malformado, com `errors` em `email` (obrigatório, formato de e-mail, até 254 caracteres).
* **`429`:** excesso de pedidos vindos da mesma origem. O limite é **A DEFINIR NO BACKEND** e não pode
  depender de o e-mail existir.
* Quando a conta existe, a API envia um e-mail com um código de 6 dígitos numéricos, válido por 10
  minutos, e o passo a passo. Quando não existe, não envia nada.
* Um novo código invalida o anterior e zera as tentativas. A API só gera outro código para o mesmo
  e-mail depois de 60 segundos; antes disso responde `202` do mesmo jeito e mantém o código atual. O
  front mostra essa contagem e só libera "Reenviar código" quando ela termina.

### 5.5 `POST /autenticacao/recuperacao/verificacao`

* **Corpo:** `VerificacaoCodigoDTO`.
* **`200`:** `RedefinicaoLiberadaDTO`. O código deixa de valer assim que é aceito.
* **`422`:** `type` terminando em `/problems/invalid-recovery-code`, para código errado, código expirado,
  e-mail sem conta e e-mail que nunca pediu um código. As quatro situações recebem exatamente a mesma
  resposta, e a tela mostra "Código incorreto ou expirado".
* **`429`:** `type` terminando em `/problems/recovery-attempts-exceeded`, a partir da quinta tentativa
  errada para o mesmo e-mail. O código deixa de valer, e nem o código certo é aceito até um novo pedido.
  As tentativas são contadas também para e-mails sem conta, para que o `429` não revele nada.
* **`400`:** e-mail malformado, com `errors`.

### 5.6 `POST /autenticacao/recuperacao/senha`

* **Corpo:** `NovaSenhaDTO`.
* **`204`:** senha trocada. A API encerra todas as sessões abertas da conta e invalida o token. Não
  abre uma sessão: a pessoa faz o login com a senha nova.
* **`400`:** senha recusada, com `errors` em `senha` (de 8 a 128 caracteres, não aparada, sem exigência
  de mistura de tipos de caractere). O token continua valendo.
* **`422`:** `type` terminando em `/problems/invalid-reset-token`, para token inexistente, já usado ou
  expirado. O token vale por 10 minutos (prazo **A DEFINIR NO BACKEND**). A tela volta à etapa do e-mail.
* A senha nunca volta numa resposta nem aparece em log.

---

## 6. Conexões

### 6.1 `POST /conexoes/teste`

Valida as credenciais contra o banco e não conecta.

* **Corpo:** `CredenciaisConexaoDTO`.
* **`200`:** `TesteConexaoDTO`.
* **`400`:** campos inválidos, com `errors`.
* **Falhas de conexão:** seção 2.2.

### 6.2 `POST /conexoes`

Conecta, salva a conexão na conta e a ativa na sessão, no lugar da que estava ativa.

* **Corpo:** `CredenciaisConexaoDTO`.
* **`201`:** `ConexaoDTO`.
* **`400`:** campos inválidos, com `errors`.
* **Falhas de conexão:** seção 2.2. Uma falha não salva nada e não derruba a conexão que já estava ativa.
* Se a conta já tem uma conexão com o mesmo `host` (sem diferenciar maiúsculas de minúsculas), `porta`,
  `banco` e `usuario`, a API atualiza essa conexão (nome e senha) e mantém o `id`, em vez de criar outra.

Validações que o front já aplica e a API deve repetir:

| Campo | Regra |
|---|---|
| `nome` | Opcional, até 60 caracteres |
| `host` | Obrigatório, até 253 caracteres; domínio, `localhost`, IPv4 ou IPv6; sem protocolo, espaço ou caminho |
| `porta` | Obrigatória, inteiro de 1 a 65535 |
| `banco` | Obrigatório, até 63 caracteres |
| `usuario` | Obrigatório, até 63 caracteres |
| `senha` | Obrigatória; não é aparada |

### 6.3 `GET /conexoes`

* **`200`:** `ConexaoSalvaDTO[]` da conta. Lista vazia quando não há nenhuma. O front ordena por `ultimoUsoEm`.
* **`401`:** não há sessão. O front volta para a tela de login.

### 6.4 `POST /conexoes/{id}/ativacao`

Conecta ao banco de uma conexão salva, com a senha guardada pela API, e a ativa na sessão.

* **Corpo:** nenhum.
* **`200`:** `ConexaoDTO`. A API atualiza o `ultimoUsoEm` da conexão.
* **`404`:** a conexão não existe mais.
* **Falhas de conexão:** seção 2.2. Uma falha não derruba a conexão que já estava ativa.

### 6.5 `PATCH /conexoes/{id}`

* **Corpo:** `RenomeacaoConexaoDTO`.
* **`200`:** `ConexaoSalvaDTO` com o novo nome. Se a conexão é a ativa, `GET /conexoes/atual` passa a devolver o novo nome.
* **`400`:** `nome` vazio ou com mais de 60 caracteres, com `errors`.
* **`404`:** a conexão não existe mais.

### 6.6 `DELETE /conexoes/{id}`

* **`204`:** conexão excluída da conta. Se era a ativa, a sessão fica sem conexão. Não altera nada no banco monitorado.
* **`404`:** a conexão não existe mais.

### 6.7 `GET /conexoes/atual`

* **`200`:** `ConexaoDTO` da sessão.
* **`401`:** não há sessão ou a sessão não tem conexão ativa. O front não a trata como erro.
* Qualquer outro erro faz o front mostrar "Não foi possível verificar a conexão", com "Tentar novamente".

### 6.8 `DELETE /conexoes/atual`

* **`204`:** conexão ativa encerrada; a sessão do login continua e a conexão continua salva. Não altera nada no banco monitorado.

---

## 7. Dashboard

As três rotas recebem `?periodo=<PeriodoDashboard>`. Sem o parâmetro, vale `ULTIMAS_24_HORAS`; com um
valor desconhecido, `400`. Sem sessão, `401`.

### 7.1 `GET /dashboard/indicadores`

* **`200`:** `IndicadoresDashboardDTO`.
* `totalConsultas` é a soma das execuções no período, igual à soma dos pontos de `/dashboard/atividade`.
* `variacaoTotalConsultas` e `variacaoTempoMedio` são percentuais em relação à janela de mesmo tamanho
  imediatamente anterior (`8.2` significa +8,2%). `null` quando não há janela anterior.
* `consultasLentas` conta as consultas **distintas** classificadas como `LENTA` no período, entre as
  `consultasDistintas`.
* `conexoesAtivas` é o número de agora, e `limiteConexoes` é o `max_connections` do servidor.

### 7.2 `GET /dashboard/atividade`

* **`200`:** `PontoAtividadeDTO[]`, em ordem crescente de `instante`. Lista vazia quando não houve atividade.
* Cada ponto cobre um intervalo que começa em `instante`. Só entram intervalos já encerrados.

| Período | Pontos | Intervalo |
|---|---|---|
| `ULTIMA_HORA` | 12 | 5 minutos |
| `ULTIMAS_24_HORAS` | 24 | 1 hora |
| `ULTIMOS_7_DIAS` | 28 | 6 horas |
| `ULTIMOS_30_DIAS` | 30 | 1 dia |

O alinhamento dos intervalos de 6 horas e de 1 dia depende do fuso (o simulador usa o do navegador).
O fuso que a API vai usar é **A DEFINIR NO BACKEND**.

### 7.3 `GET /dashboard/consultas`

* **`200`:** `ConsultaResumoDTO[]`. Lista vazia quando não houve consultas.
* `sql` é a consulta normalizada, com `$1`, `$2` no lugar dos valores, como em `pg_stat_statements`.
* `percentualTempoTotal` é a fatia do tempo total de execução do banco no período, de 0 a 100.
* O front ordena a lista em memória. A quantidade devolvida é **A DEFINIR NO BACKEND** (o simulador devolve 10).
* São as consultas que mais pesam: as mesmas, com os mesmos números, que abrem `GET /consultas` no mesmo
  período, na ordenação padrão. O Dashboard leva de uma tela à outra pelo link "Ver todas".
* `desempenho` é decidido pela API. O simulador usa: abaixo de 100 ms `RAPIDA`, de 100 ms a menos de
  500 ms `MODERADA`, a partir de 500 ms `LENTA`. Os limites definitivos são **A DEFINIR NO BACKEND**.

---

## 8. Sistema

### 8.1 `GET /sistema/versao`

Versão publicada da API, mostrada em Configurações › Versões ao lado da versão do front. É a mesma
rota do OrbitAPI. Não exige sessão e não acessa o banco, então também serve para saber se a API está no ar.

* **`200`:** `VersaoSistemaDTO`.

```json
{ "versao": "1.0.0", "dataLancamento": "2026-09-29T14:32:05Z" }
```

| Campo | Regra |
|---|---|
| `versao` | Versão declarada no build, sem o prefixo `v`; o front acrescenta o `v` quando ela começa com número |
| `dataLancamento` | Instante em UTC em que o artefato foi gerado, ou `null`; o front mostra só a data |

O simulador responde `{ "versao": "Simulada", "dataLancamento": null }`, e a tela diz que nenhuma API
está em uso.

---

## 9. Relatórios

### 9.1 `GET /relatorios/resumo`

Resumo de um período de calendário já encerrado, mostrado em Relatórios › Resumo. A resposta traz o
relatório inteiro numa só chamada, para que os blocos da tela nunca discordem entre si.

Relatórios › Exportação usa esta mesma rota: os arquivos CSV, JSON e Markdown são montados no front a
partir da resposta, e não existe rota de exportação. O JSON exportado repete os nomes de campo deste
contrato.

Relatórios › Comparação também usa esta rota, com duas chamadas (uma por período), e calcula as
diferenças no front. Não existe rota de comparação.

| Parâmetro | Regra |
|---|---|
| `granularidade` | `GranularidadeRelatorio`. Sem o parâmetro, vale `SEMANA`. |
| `inicio` | Primeiro dia do período, como data sem hora (`2026-09-28`). Sem o parâmetro, vale o último período encerrado da granularidade. |

* **`200`:** `ResumoRelatorioDTO`.
* **`400`:** granularidade desconhecida, ou `inicio` que não é o primeiro dia de um período (a segunda-feira,
  na semana; o dia 1, no mês), que ainda não terminou ou que está fora do histórico.
* **`401`:** sem sessão ou sem conexão ativa.
* A semana vai de segunda a domingo. `inicio` e `fim` voltam como datas sem hora, e `fim` é o último dia
  do período, incluído.
* O front oferece os períodos inteiros dos últimos 12 meses. Quanto histórico a API guarda é **A DEFINIR
  NO BACKEND**.
* As variações são percentuais em relação ao período de mesmo tamanho imediatamente anterior (`-3.9`
  significa −3,9%). `null` quando não há dado do período anterior.
* Cada variação é calculada com os valores como eles são devolvidos (o `tempoMedioMs` já arredondado),
  e arredondada a uma casa. Assim a Comparação, que recalcula a diferença a partir de duas respostas,
  chega ao mesmo número que o Resumo mostra para o período anterior.
* `evolucao` tem um ponto por hora quando a granularidade é `DIA` (24 pontos) e um ponto por dia nas
  outras, em ordem crescente. `indicadores.totalConsultas` é a soma dos pontos.
* `picoConexoes` é o maior número de conexões abertas no período e `instantePicoConexoes`, o momento
  em que ele ocorreu (`null` quando não houve atividade).
* `desempenho` tem as três faixas, na ordem `RAPIDA`, `MODERADA`, `LENTA`. A soma de `consultasDistintas`
  é `indicadores.consultasDistintas`, a de `quantidadeExecucoes` é `indicadores.totalConsultas`, e os
  dois percentuais somam 100 cada. `indicadores.consultasLentas` é o `consultasDistintas` da faixa `LENTA`.
* `consultas` segue as regras de `GET /dashboard/consultas`, com `variacaoTempoMedio` em cada item.
* Período sem atividade: `totalConsultas` igual a `0` e as três listas vazias. A tela mostra "Nenhuma
  atividade no período".

O fuso que define onde um dia começa e termina é **A DEFINIR NO BACKEND** (o simulador usa o do navegador).

---

## 10. Consultas

### 10.1 `GET /consultas`

Lista completa das consultas que o banco executou no período, mostrada em Consultas SQL › Todas. A
busca, os filtros, a ordenação e a paginação são feitos pela API: um banco pode ter milhares de consultas
distintas, e o front nunca recebe a lista inteira de uma vez.

| Parâmetro | Regra |
|---|---|
| `periodo` | `PeriodoDashboard`. Sem o parâmetro, vale `ULTIMAS_24_HORAS`. |
| `busca` | Texto procurado no `sql`, com até 200 caracteres. Opcional. |
| `desempenho` | `DesempenhoConsulta`. Opcional; sem ele, entram as três faixas. |
| `tipo` | `TipoComando`. Opcional; sem ele, entram todos os comandos. |
| `ordenacao` | `OrdenacaoConsultas`. Sem o parâmetro, vale `PERCENTUAL_TEMPO_TOTAL`. |
| `direcao` | `DirecaoOrdenacao`. Sem o parâmetro, vale `DESC`. |
| `pagina` | Inteiro a partir de `1`. Sem o parâmetro, vale `1`. |
| `tamanhoPagina` | Inteiro de `1` a `100`. Sem o parâmetro, vale `25`. |

* **`200`:** `PaginaConsultasDTO`.
* **`400`:** valor desconhecido num dos enums, `pagina` ou `tamanhoPagina` fora da faixa, ou `busca` com
  mais de 200 caracteres, com um item em `errors` para cada parâmetro recusado.
* **`401`:** sem sessão ou sem conexão ativa.
* O período é a mesma janela do Dashboard. As regras de `sql`, `percentualTempoTotal` e `desempenho` são
  as de `GET /dashboard/consultas`, e as consultas que aquela rota devolve são as primeiras desta, com
  os mesmos números, na ordenação padrão.
* `busca` é separada em termos pelos espaços. Entra a consulta cujo `sql` contém todos os termos, em
  qualquer ordem, sem diferenciar maiúsculas de minúsculas nem letras acentuadas das sem acento. O
  front marca na tela cada ocorrência dos termos, seguindo a mesma regra.
* `tipo` é o comando com que a consulta começa. `OUTRO` cobre o que não é um dos quatro: `COMMIT`,
  `ANALYZE`, `REFRESH MATERIALIZED VIEW` e os demais comandos utilitários.
* `tempoMinimoMs`, `tempoMedioMs` e `tempoMaximoMs` são por execução, com mínimo ≤ médio ≤ máximo.
  `tempoTotalMs` é a soma do tempo de todas as execuções no período, e `linhasPorExecucao`, a média de
  linhas devolvidas ou afetadas (pode ser `0`).
* `ordenacao` escolhe o campo (`PERCENTUAL_TEMPO_TOTAL` é `percentualTempoTotal`, `TEMPO_MEDIO` é
  `tempoMedioMs`, `TEMPO_MAXIMO` é `tempoMaximoMs` e `EXECUCOES` é `quantidadeExecucoes`). O desempate
  precisa ser estável entre as páginas (o simulador usa o `id`).
* `totalItens` e `totalPaginas` contam as consultas depois da busca e dos filtros. `totalDoPeriodo`
  conta todas as consultas do período, sem busca nem filtro, e é igual ao `consultasDistintas` de
  `GET /dashboard/indicadores`; a tela usa os dois em "3 de 42 consultas".
* A soma de `quantidadeExecucoes` de todas as consultas do período é o `totalConsultas` do Dashboard, e
  as consultas `LENTA` são as que o indicador `consultasLentas` conta.
* Uma `pagina` além da última devolve `itens` vazio com os totais corretos, e o front volta para a
  última página. Período sem consultas: `itens` vazio e os três totais em `0`.
* O botão "Exportar CSV" lê todas as páginas da lista filtrada, com `tamanhoPagina=100`, e monta o
  arquivo no front. Não existe rota de exportação.

```json
{
  "itens": [
    {
      "id": "q-pedidos-cliente",
      "sql": "SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC",
      "tipo": "SELECT",
      "tempoMedioMs": 193,
      "tempoMinimoMs": 50.1,
      "tempoMaximoMs": 1270,
      "tempoTotalMs": 5150205,
      "quantidadeExecucoes": 26685,
      "linhasPorExecucao": 14.2,
      "percentualTempoTotal": 28.4,
      "desempenho": "MODERADA"
    }
  ],
  "pagina": 1,
  "tamanhoPagina": 25,
  "totalItens": 42,
  "totalPaginas": 2,
  "totalDoPeriodo": 42
}
```

### 10.2 `GET /consultas/{id}/historico`

Uma consulta ao longo do período, mostrada em Consultas SQL › Histórico. A resposta traz tudo o que a
tela usa, para os blocos não discordarem entre si.

| Parâmetro | Regra |
|---|---|
| `id` (no caminho) | O `id` que `GET /consultas` devolve. O front só envia letras, números, `_`, `.`, `:` e `-`, com até 120 caracteres. |
| `periodo` | `PeriodoDashboard`. Sem o parâmetro, vale `ULTIMAS_24_HORAS`. |

* **`200`:** `HistoricoConsultaDTO`.
* **`400`:** `periodo` desconhecido, com o item em `errors`.
* **`401`:** sem sessão ou sem conexão ativa.
* **`404`:** a consulta não aparece nas estatísticas do banco. A tela explica e oferece a consulta que
  mais pesa no período.
* `consulta` é a mesma `ConsultaDetalhadaDTO`, com os mesmos números, que `GET /consultas` devolve para
  o período.
* `pontos` vem em ordem crescente de `instante` e cobre os mesmos intervalos de
  `GET /dashboard/atividade` (12 de 5 minutos, 24 de 1 hora, 28 de 6 horas ou 30 de 1 dia), inclusive os
  intervalos em que a consulta não rodou.
* A soma de `quantidadeExecucoes` dos pontos é a `quantidadeExecucoes` da consulta. O maior
  `tempoMaximoMs` dos pontos é o `tempoMaximoMs` da consulta, e os `tempoMedioMs` dos pontos, ponderados
  pelas execuções, dão o `tempoMedioMs` dela (a menos do arredondamento).
* O ponto sem execuções traz `quantidadeExecucoes` em `0` e os dois tempos em `null`. Nos demais,
  `tempoMedioMs` ≤ `tempoMaximoMs`.
* `variacaoExecucoes` e `variacaoTempoMedio` comparam a consulta com a janela anterior do mesmo tamanho,
  em percentual com uma casa, calculadas a partir dos valores como `GET /consultas` os devolve. `null`
  quando a consulta não rodou na janela anterior.
* `posicao` é o lugar da consulta na ordenação padrão de `GET /consultas` (do maior
  `percentualTempoTotal` para o menor, a partir de `1`), `totalDoPeriodo` é o mesmo daquela rota, e
  `idAnterior` e `idSeguinte` são as vizinhas nessa ordem (`null` nas pontas). A tela usa os quatro nas
  setas "Consulta 3 de 42 por peso".
* Consulta que existe mas não rodou no período: `200`, com `quantidadeExecucoes` e os tempos da
  `consulta` em `0`, as variações e a `posicao` em `null` e todos os pontos sem execuções. A tela diz que
  ela não foi executada e sugere um período maior.
* Ao abrir sem consulta escolhida, o front pede antes a primeira de `GET /consultas`
  (`tamanhoPagina=1`, na ordenação padrão) e mostra o histórico dela. As sugestões do seletor também vêm
  de `GET /consultas`, com `busca` e `tamanhoPagina=8`.
* O botão "Exportar CSV" monta o arquivo no front, a partir desta resposta. Não existe rota de
  exportação.
* `trocasDePlano` são os momentos do período em que o banco passou a usar outro plano para a consulta, em
  ordem crescente de `instante`, vazio quando o plano não mudou. `versao` e `versaoAnterior` são `id`s de
  `VersaoPlanoDTO` de `GET /consultas/{id}/plano`, e `instante` é o `primeiroRegistro` da `versao`. A tela
  marca o intervalo que contém o instante e abre a comparação dos dois planos.

```json
{
  "periodo": "ULTIMAS_24_HORAS",
  "consulta": {
    "id": "q-pedidos-cliente",
    "sql": "SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC",
    "tipo": "SELECT",
    "tempoMedioMs": 193,
    "tempoMinimoMs": 50.1,
    "tempoMaximoMs": 1270,
    "tempoTotalMs": 5150205,
    "quantidadeExecucoes": 26685,
    "linhasPorExecucao": 14.2,
    "percentualTempoTotal": 28.4,
    "desempenho": "MODERADA"
  },
  "variacaoExecucoes": 3.2,
  "variacaoTempoMedio": -4.1,
  "posicao": 2,
  "totalDoPeriodo": 42,
  "idAnterior": "q-usuarios-email",
  "idSeguinte": "q-produtos-busca",
  "pontos": [
    { "instante": "2026-10-11T13:00:00.000Z", "quantidadeExecucoes": 1420, "tempoMedioMs": 201.3, "tempoMaximoMs": 1270 },
    { "instante": "2026-10-11T14:00:00.000Z", "quantidadeExecucoes": 0, "tempoMedioMs": null, "tempoMaximoMs": null }
  ],
  "trocasDePlano": [
    { "instante": "2026-10-11T12:00:47.000Z", "versao": "q-pedidos-cliente-plano-2", "versaoAnterior": "q-pedidos-cliente-plano-1" }
  ]
}
```

---

### 10.3 `GET /consultas/{id}/plano`

O plano de execução de uma consulta, mostrado em Consultas SQL › Planos de execução. A API registra os
planos de execuções reais (por exemplo com `auto_explain`, `log_analyze` e `log_buffers` ligados) e a tela
nunca pede que o banco execute nada.

| Parâmetro | Regra |
|---|---|
| `id` (no caminho) | O `id` que `GET /consultas` devolve, com as mesmas regras de `GET /consultas/{id}/historico`. |
| `versao` | Opcional. O `id` de uma das `versoes`. Sem o parâmetro, ou com uma versão que não existe mais, vale a mais recente. |

* **`200`:** `PlanosConsultaDTO`.
* **`400`:** `versao` fora do formato do `id`, com o item em `errors`.
* **`401`:** sem sessão ou sem conexão ativa.
* **`404`:** a consulta não aparece nas estatísticas do banco.
* `consulta`, `posicao`, `totalDoPeriodo`, `idAnterior` e `idSeguinte` são os de `GET /consultas/{id}/historico`
  com `periodo=ULTIMOS_30_DIAS`: a tela não tem período e usa sempre a maior janela.
* `versoes` são os planos distintos que a consulta teve nos últimos 30 dias, do mais recente para o mais
  antigo. `primeiroRegistro` é a primeira vez que a API viu o plano (pode ser anterior aos 30 dias),
  `ultimoRegistro` a última; `quantidadeExecucoes` e `tempoMedioMs` contam só as execuções dos 30 dias. As
  execuções das versões somam a `quantidadeExecucoes` da consulta.
* `plano` é a execução mais recente registrada da versão pedida, e `plano.id` é o `id` dessa versão.
  `null`, com `versoes` vazia, quando a consulta não tem plano: comandos que não passam pelo planejador
  (`COMMIT`, `ANALYZE`, `REFRESH MATERIALIZED VIEW`) ou consulta sem execução registrada.
* `raiz` é a árvore de `NoPlanoDTO`, com os mesmos campos do `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`
  em português: `tipo` é o `Node Type` do PostgreSQL, sem tradução (`Seq Scan`, `Hash Join`, `ModifyTable`),
  `operacao`, `juncao`, `estrategia` e `sentidoInverso` são `Operation`, `Join Type`, `Strategy` e
  `Scan Direction`, e `id` numera as etapas de `1` em diante, de cima para baixo.
* Como no `EXPLAIN`, `tempoInicialMs`, `tempoTotalMs`, `linhasReais` e `linhasRemovidasPeloFiltro` são
  médias por laço, e `lacos` diz quantas vezes a etapa rodou; o front multiplica para chegar ao total.
  `buffers` incluem os das etapas de baixo; o front subtrai para mostrar os de cada etapa.
  `linhasRemovidasPeloFiltro` é `null` na etapa sem filtro.
* `CHAVE_ORDENACAO` e `CHAVE_AGRUPAMENTO` vêm uma por item de `condicoes`, na ordem da chave.
* `memoria` é o `Hash` (lotes e pico de memória) ou o `HashAggregate` (lotes, memória e disco).
* `sugestoes` são índices que a API recomenda (por exemplo testados com `hypopg`), cada um ligado à etapa
  `no` que ele melhora. `comando` vem pronto para copiar e usa `CREATE INDEX CONCURRENTLY`; `extensao` é a
  extensão que ele exige (`pg_trgm`), ou `null`. A API nunca executa o comando.
* As cópias em texto e em JSON e o diagnóstico são montados no front a partir desta resposta.
* A comparação de dois planos não tem rota própria: o front pede esta rota duas vezes, uma com cada
  `versao`, e calcula as diferenças.

```json
{
  "consulta": { "id": "q-usuarios-email", "sql": "SELECT id, email FROM usuarios WHERE lower(email) = lower($1)", "tipo": "SELECT", "tempoMedioMs": 254, "tempoMinimoMs": 46.2, "tempoMaximoMs": 1610, "tempoTotalMs": 158871412, "quantidadeExecucoes": 625478, "linhasPorExecucao": 1, "percentualTempoTotal": 34.1, "desempenho": "MODERADA" },
  "posicao": 1,
  "totalDoPeriodo": 42,
  "idAnterior": null,
  "idSeguinte": "q-pedidos-cliente",
  "versoes": [
    { "id": "q-usuarios-email-plano-1", "primeiroRegistro": "2026-07-31T18:02:17.000Z", "ultimoRegistro": "2026-10-14T23:11:23.000Z", "quantidadeExecucoes": 625478, "tempoMedioMs": 254 }
  ],
  "plano": {
    "id": "q-usuarios-email-plano-1",
    "registradoEm": "2026-10-14T23:11:23.000Z",
    "tempoPlanejamentoMs": 0.214,
    "tempoExecucaoMs": 249.31,
    "raiz": {
      "id": 1, "tipo": "Seq Scan", "operacao": null, "juncao": null, "estrategia": null, "sentidoInverso": false,
      "relacao": "usuarios", "apelido": null, "indice": null,
      "custoInicial": 0, "custoTotal": 20600, "linhasEstimadas": 4120, "larguraBytes": 36,
      "tempoInicialMs": 1.003, "tempoTotalMs": 248.064, "linhasReais": 1, "lacos": 1, "linhasRemovidasPeloFiltro": 823999,
      "condicoes": [{ "tipo": "FILTRO", "expressao": "(lower((email)::text) = lower($1))" }],
      "buffers": { "emCache": 2410, "lidos": 11388, "temporariosLidos": 0, "temporariosEscritos": 0 },
      "ordenacao": null, "memoria": null, "filhos": []
    },
    "sugestoes": [
      { "no": 1, "tabela": "usuarios", "colunas": ["lower(email)"], "comando": "CREATE INDEX CONCURRENTLY usuarios_lower_email_idx ON usuarios (lower(email));", "extensao": null }
    ]
  }
}
```

---

## 11. Objetos do banco

### 11.1 `GET /objetos/visoes`

Sem parâmetros. Devolve `200` com `ListaVisoesDTO`: todas as visões comuns (`pg_views`) e materializadas
(`pg_matviews`) da conexão ativa, fora de `pg_catalog`, `information_schema` e dos esquemas `pg_toast` e
`pg_temp_*`. A lista vem inteira, sem paginação: a tela busca, filtra e ordena no navegador. `geradoEm` é o
instante da resposta; a tela mede a idade da última atualização a partir dele, não do relógio do navegador.

* `id` é `esquema.nome`, como o PostgreSQL escreve o nome qualificado.
* `descricao` é o `COMMENT ON VIEW` (ou `null`) e `definicao` é o texto de `pg_get_viewdef`, com o espaço que
  o PostgreSQL põe no começo das linhas; a tela tira esse recuo para mostrar e para copiar.
* `colunas` seguem a ordem de `pg_attribute.attnum`, com o tipo escrito por `format_type`.
* `dependeDe` e `usadaPor` vêm de `pg_depend` e `pg_rewrite`: as tabelas, visões e materializadas que a
  definição lê, e as visões e materializadas cuja definição lê esta. Os dois sentidos são coerentes: se `A`
  está em `dependeDe` de `B`, `B` está em `usadaPor` de `A`.
* `consultas` são as consultas dos últimos 30 dias cujo texto cita a visão, com os mesmos números que
  `GET /consultas?periodo=ULTIMOS_30_DIAS` devolve para elas, da que mais pesa para a que menos pesa. Um
  `REFRESH` da visão não entra nesta lista.
* `materializacao` é `null` numa visão comum. Numa materializada, `populada` é o `ispopulated` de
  `pg_matviews`, `tamanhoBytes` é `pg_total_relation_size` e `linhas` é o `reltuples` mais recente.
  `atualizacao` é o `REFRESH MATERIALIZED VIEW` desta visão na lista de consultas dos 30 dias, ou `null`
  quando ele não aparece, e `ultimaAtualizacao` é o fim da última execução dele que a API coletou, ou `null`.

`401` sem conexão ativa, como as outras rotas de dados.

### 11.2 `GET /objetos/indices`

Sem parâmetros. Devolve `200` com `ListaIndicesDTO`: todos os índices das tabelas e visões materializadas da
conexão ativa, fora dos mesmos esquemas do sistema de `GET /objetos/visoes`. A lista vem inteira, sem
paginação: a tela busca, filtra e ordena no navegador, e é ela que decide se um índice está sem uso, duplicado
ou redundante, a partir dos campos abaixo. `geradoEm` é o instante da resposta e `coletaDesde` é quando a API
começou a coletar as estatísticas deste banco; a tela só marca um índice como sem uso depois de 30 dias de
coleta, contados a partir do mais recente entre `coletaDesde` e `observadoDesde`.

* `id` é `esquema.nome`; o esquema de um índice é sempre o da sua tabela.
* `metodo` é o `amname` de `pg_am`. `colunas` são as expressões da chave na ordem do índice, como
  `pg_get_indexdef(indexrelid, n, true)` as escreve, com `DESC`, `NULLS FIRST` e a classe de operador quando não
  são as padrão (`criado_em DESC`, `lower(email)`, `nome gin_trgm_ops`). `incluidas` são as colunas do `INCLUDE`,
  e `predicado` é a condição de um índice parcial, como `pg_get_expr(indpred, indrelid)` a escreve, ou `null`.
* `unico` é o `indisunique`, `restricao` diz se o índice sustenta uma chave primária, uma restrição única ou
  de exclusão (`pg_constraint.conindid`), ou `null`, e `valido` é o `indisvalid`. Um `CREATE INDEX
  CONCURRENTLY` ou `REINDEX CONCURRENTLY` que não terminou deixa o índice com `valido: false`.
* `definicao` é o texto de `pg_get_indexdef`, sem o ponto e vírgula; a tela o acrescenta ao copiar.
* `tamanhoBytes` é `pg_relation_size` do índice. `leituras` é quanto o `idx_scan` de
  `pg_stat_user_indexes` cresceu nos últimos 30 dias, e `linhasLidas` é o mesmo para `idx_tup_read`: a API guarda
  amostras dos contadores, porque o PostgreSQL só dá o acumulado desde o último reset.
* `observadoDesde` é a primeira amostra em que a API viu o índice (o PostgreSQL não guarda quando ele foi
  criado). Um índice recriado é outro objeto e começa do zero.
* `tabela` traz o tamanho (`pg_relation_size`), as linhas (`reltuples`) e quanto `n_tup_ins`, `n_tup_upd` e
  `n_tup_hot_upd` de `pg_stat_user_tables` cresceram nos 30 dias. Cada inserção e cada atualização que não é
  HOT grava em todos os índices da tabela; é com isso que a tela mostra o custo de manter um índice.
* `usos` são as consultas dos 30 dias cujo plano registrado (`GET /consultas/{id}/plano`) tem uma etapa que lê
  o índice, com os números que `GET /consultas?periodo=ULTIMOS_30_DIAS` devolve para elas. `etapa` é o `Node
  Type` dessa etapa, `leiturasPorExecucao` são os `Actual Loops` dela, `versao` é a versão do plano que a contém
  e `versaoAtual` é a versão atual da consulta. `usadoAte` é `null` quando a versão é a atual; numa versão
  anterior, é o último registro dela.
* `sugestoes` são os índices sugeridos pelos planos atuais das consultas dos 30 dias (os `sugestoes` de
  `PlanoExecucaoDTO`), um por comando, com a tabela qualificada (`esquema.nome`) e as consultas cujo plano o
  pede.
* `funcoes` são as funções de que o índice depende (`pg_depend` do índice para `pg_proc`), as usadas na
  expressão ou na condição dele, no mesmo formato do `id` de `GET /objetos/funcoes`. Um índice comum traz a
  lista vazia.

`401` sem conexão ativa, como as outras rotas de dados.

### 11.3 `GET /objetos/tabelas`

Sem parâmetros. Devolve `200` com `ListaTabelasDTO`: todas as tabelas comuns e particionadas da conexão ativa,
fora dos mesmos esquemas do sistema de `GET /objetos/visoes`. As partições não entram como tabelas próprias:
cada uma aparece em `particionamento.particoes` da tabela mãe, e as visões materializadas ficam em
`GET /objetos/visoes`. A lista vem inteira, sem paginação: a tela busca, filtra, ordena e decide a situação de
cada tabela no navegador. `geradoEm` e `coletaDesde` têm o mesmo sentido de `GET /objetos/indices`.

* `id` é `esquema.nome`. `descricao` é o `COMMENT` da tabela, ou `null`, e `dono` é o dono dela.
* `colunas` vêm na ordem de `attnum`, com o tipo como `format_type` o escreve, `anulavel` (o contrário de
  `attnotnull`) e o `padrao` como `pg_get_expr(adbin, adrelid)` o escreve. `chavePrimaria` são as colunas da
  chave primária, na ordem dela, ou `null` quando a tabela não tem uma.
* `tamanhoDadosBytes` é `pg_relation_size` da tabela, `tamanhoIndicesBytes` é `pg_indexes_size` e
  `tamanhoToastBytes` é `pg_total_relation_size` menos os dois. Numa tabela particionada, os três são a soma
  das partições.
* `linhas` é `n_live_tup`, `linhasMortas` é `n_dead_tup` e `alteracoesDesdeAnalyze` é `n_mod_since_analyze`
  de `pg_stat_user_tables`. `insercoes`, `atualizacoes`, `atualizacoesHot` e `exclusoes` são quanto
  `n_tup_ins`, `n_tup_upd`, `n_tup_hot_upd` e `n_tup_del` cresceram nos últimos 30 dias.
* `leiturasSequenciais` e `linhasLidasSequencialmente` são quanto `seq_scan` e `seq_tup_read` cresceram nos
  30 dias, e `leiturasPorIndice` e `linhasLidasPorIndice` o mesmo para `idx_scan` e `idx_tup_fetch`. A tela
  marca uma tabela como lida inteira quando ela tem 10 MB de dados ou mais e a maior parte das linhas lidas veio
  de leituras sequenciais. `leiturasPorIndice` é a soma das `leituras` dos índices dela em `GET /objetos/indices`.
* `ultimoVacuum`, `ultimoAutovacuum`, `ultimoAnalyze` e `ultimoAutoanalyze` são `last_vacuum`,
  `last_autovacuum`, `last_analyze` e `last_autoanalyze`, ou `null` quando o PostgreSQL não tem registro. Numa
  tabela particionada, `ultimoVacuum` e `ultimoAutovacuum` são os mais recentes entre as partições.
* `idadeTransacoes` é `age(relfrozenxid)`; numa tabela particionada, a maior entre as partições.
  `limiteCongelamento` é o `autovacuum_freeze_max_age` que vale para a tabela: o dela, quando definido, ou o do
  servidor.
* `autovacuum` são só os parâmetros de autovacuum definidos na própria tabela (`reloptions`), com o `valor`
  dela e o `padrao` do servidor (`pg_settings`). Uma tabela sem ajustes traz a lista vazia.
* `particionamento` é `null` numa tabela comum. Numa particionada, traz a estratégia, a chave como
  `pg_get_partkeydef` a escreve e as partições, com os limites como `pg_get_expr(relpartbound, oid)` os escreve e
  os números de cada uma.
* `indices` resume os índices da tabela, com os mesmos `id`, tamanho e leituras de `GET /objetos/indices`.
  `indicesSugeridos` são as sugestões dos planos atuais para esta tabela, as mesmas de `sugestoes` daquela rota.
* `usadaPor` são as visões que leem a tabela diretamente (`pg_depend` pelas regras de `pg_rewrite`).
* `gatilhos` são os gatilhos da tabela que não são internos (`pg_trigger` com `tgisinternal` falso, o que deixa
  de fora os das chaves estrangeiras), com a função que cada um chama no mesmo formato do `id` de
  `GET /objetos/funcoes`, o momento, os eventos, o nível e `ativo` falso quando `tgenabled` é `D`.
* `leituras` são as etapas dos planos atuais das consultas dos 30 dias que leem a tabela, com os números que
  `GET /consultas?periodo=ULTIMOS_30_DIAS` devolve para elas. `etapa` é o `Node Type`, `indice` é o índice que
  a etapa usa (o do `Bitmap Index Scan` filho num `Bitmap Heap Scan`) ou `null` num `Seq Scan`, e
  `leiturasPorExecucao` são os `Actual Loops` dela.
* `crescimento` tem um ponto por dia dos últimos 30 dias, mais o dia de hoje, do mais antigo ao mais novo:
  `dia` no formato `AAAA-MM-DD` do fuso do banco, `tamanhoBytes` como `pg_total_relation_size` e `linhas` como
  `n_live_tup`, na última amostra daquele dia. O último ponto é igual aos números atuais da tabela. Com menos de
  30 dias de coleta, a lista começa na primeira amostra.

A tela só lê; o texto que ela copia é só o comando, sem aviso de demonstração. `401` sem conexão ativa, como as
outras rotas de dados.

---

### 11.4 `GET /objetos/funcoes`

Sem parâmetros. Devolve `200` com `ListaFuncoesDTO`: as funções e os procedimentos da conexão ativa (`pg_proc`
com `prokind` `f` ou `p`), fora dos mesmos esquemas do sistema de `GET /objetos/visoes` e fora das extensões
(sem dependência `e` em `pg_depend`). Agregações e funções de janela ficam de fora. A lista vem inteira, sem
paginação: a tela busca, filtra, ordena e decide a situação de cada função no navegador. `geradoEm` e
`coletaDesde` têm o mesmo sentido de `GET /objetos/indices`, e `rastreamento` é o `track_functions` do servidor
(`none`, `pl` ou `all`).

* `id` é `esquema.nome(argumentos)`, e `argumentos` é `pg_get_function_identity_arguments` (só os tipos de
  entrada, separados por vírgula e espaço): é o que separa as sobrecargas e o que um `ALTER FUNCTION` ou um
  `DROP FUNCTION` aceita depois do nome.
* `tipo` é `PROCEDIMENTO` quando `prokind` é `p`, `GATILHO` quando a função devolve `trigger` (ou
  `event_trigger`) e `FUNCAO` no resto. `linguagem` é o `lanname`. `retorno` é
  `pg_get_function_result`, ou `null` num procedimento.
* `parametros` são todos os parâmetros, na ordem, com o nome (ou `null`), o tipo como `format_type` o escreve,
  o modo (`proargmodes`) e o valor padrão como `pg_get_function_arguments` o escreve.
* `volatilidade` vem de `provolatile`, `estrita` de `proisstrict` e `segurancaDefinidor` de `prosecdef`.
  `configuracoes` é `proconfig` como o banco o guarda (`search_path=auditoria, pg_temp`). A tela marca o risco
  de segurança quando `segurancaDefinidor` é verdadeiro e nenhuma configuração começa por `search_path=`.
* `descricao` é o `COMMENT` da função e `definicao` é `pg_get_functiondef`, com o cabeçalho e o corpo.
  `observadaDesde` é quando a API viu a função pela primeira vez: uma função medida e sem chamadas só é marcada
  sem chamadas depois de 30 dias de coleta, contados do mais recente entre `coletaDesde` e `observadaDesde`.
* `uso` é `null` quando o servidor não mede a função: sempre com `track_functions = none`, e com `pl` nas
  funções em `sql`, `c` e `internal`. Quando medida, `chamadas`, `tempoTotalMs` e `tempoProprioMs` são quanto
  `calls`, `total_time` e `self_time` de `pg_stat_user_functions` cresceram nos 30 dias. Uma função medida que
  não aparece em `pg_stat_user_functions` não foi chamada e vem com zeros.
* `gatilhos` são os gatilhos que chamam a função, no formato de `gatilhos` de `GET /objetos/tabelas`, com a
  tabela no lugar da função. `indices` são os índices cuja expressão ou condição usa a função, e `visoes` as
  visões que a citam (os dois por `pg_depend`), com o mesmo `id` de `GET /objetos/indices` e de
  `GET /objetos/visoes`. As tabelas que a função lê por dentro não entram: o PostgreSQL só registra essa
  dependência nas funções em SQL com corpo `BEGIN ATOMIC`.
* `consultas` são as consultas dos 30 dias cujo texto cita a função pelo nome, com os números que
  `GET /consultas?periodo=ULTIMOS_30_DIAS` devolve para elas.

A tela só lê; o texto que ela copia é só o comando ou o código, sem aviso de demonstração. `401` sem conexão
ativa, como as outras rotas de dados.

---

## 12. Usuários e permissões

### 12.1 `GET /usuarios/papeis`

Sem parâmetros. Devolve `200` com `ListaPapeisDTO`: os papéis do servidor da conexão ativa (`pg_roles`), fora
dos predefinidos, cujo nome começa por `pg_`. A lista vem inteira, sem paginação: a tela busca, filtra, ordena e
decide a situação de cada papel no navegador. `geradoEm` e `coletaDesde` têm o mesmo sentido de
`GET /objetos/indices`, aqui para as amostras de `pg_stat_activity`. `papelDaConexao` é o `current_user` da
conexão que a API usa, que a tela marca com "Você".

* `nome` é o `rolname`, que também serve de identificador. `descricao` é o `COMMENT ON ROLE`
  (`shobj_description`). `inicial` é verdadeiro só no papel criado na instalação (`oid` 10).
* `login`, `superusuario`, `criaBancos`, `criaPapeis`, `replicacao`, `ignoraRls` e `herda` são `rolcanlogin`,
  `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication`, `rolbypassrls` e `rolinherit`.
  `limiteConexoes` é `rolconnlimit`, ou `null` quando ele é `-1`. `validadeSenha` é `rolvaliduntil`, ou `null`
  quando não há validade (`infinity` também vem `null`).
* `metodoSenha` é `SCRAM` quando o `rolpassword` de `pg_authid` começa por `SCRAM-SHA-256$`, `MD5` quando começa
  por `md5`, e `SEM_SENHA` quando ele é nulo. Vem `null` num grupo e quando a conexão da API não pode ler
  `pg_authid`, o que exige superusuário: a tela então diz que o formato não está disponível. O hash nunca sai
  da API.
* `configuracoes` é o `setconfig` de `pg_db_role_setting` do papel em qualquer banco e no banco atual, no
  formato `parametro=valor`.
* `membroDe` e `membros` vêm de `pg_auth_members`: `papel` é o grupo (em `membroDe`) ou o membro (em `membros`),
  `herda` é `inherit_option`, `assume` é `set_option` e `administra` é `admin_option` (PostgreSQL 16 ou mais
  novo; antes disso, `herda` repete o `rolinherit` do membro e `assume` é sempre verdadeiro). `membroDe` pode
  citar papéis predefinidos, que não estão na lista.
* `sessoes` são as linhas de `pg_stat_activity` do papel com `backend_type` `client backend` ou `walsender`
  no instante de `geradoEm`, incluindo a da própria API: somadas, dão as conexões ativas de
  `GET /dashboard/indicadores`. `vistoPorUltimo` é o instante da última amostra em que o papel tinha uma sessão,
  ou `null` quando a API nunca o viu conectado; o PostgreSQL não registra o último login. `observadoDesde` é
  quando a API viu o papel pela primeira vez: um usuário sem sessão só é marcado sem uso depois de 30 dias de
  coleta, contados do mais recente entre `coletaDesde` e `observadoDesde`. `ociosasEmTransacao30Dias` tem o
  sentido de `GET /usuarios/sessoes`.
* `objetos` são as tabelas, as visões e as funções do banco da conexão de que o papel é dono, com o mesmo `id`
  de `GET /objetos/tabelas`, `GET /objetos/visoes` e `GET /objetos/funcoes`. Nas funções e nos procedimentos,
  `nome` traz os argumentos, `nome(argumentos)`, e `funcao` repete `segurancaDefinidor` e `configuracoes` de
  `FuncaoDTO`, para a tela apontar uma `SECURITY DEFINER` sem `search_path` fixo; nos outros, `funcao` é `null`.

A tela só lê. Os comandos que ela oferece nunca levam uma senha: a troca de senha é feita com `\password` no
psql. `limiteOciosoEmTransacao` tem o sentido de `GET /usuarios/sessoes`. `401` sem conexão ativa, como as
outras rotas de dados.

### 12.2 `GET /usuarios/sessoes`

Sem parâmetros. Devolve `200` com `ListaSessoesDTO`: cada linha de `pg_stat_activity` do servidor da conexão
ativa no instante de `geradoEm`, de todos os bancos. A lista vem inteira, sem paginação: o `max_connections`
limita o tamanho, e a tela busca, filtra, ordena e decide a situação de cada sessão no navegador.

* `bancoDaConexao` é o banco da conexão ativa, com que a tela começa filtrada. `limiteConexoes` é o
  `max_connections`. `limiteOciosoEmTransacao` é o `idle_in_transaction_session_timeout` do servidor, ou `null`
  quando ele é `0`.
* `papeis` traz, para cada papel com ao menos uma sessão, o `limiteConexoes` e as `configuracoes` de
  `GET /usuarios/papeis` e `ociosasEmTransacao30Dias`: quantas vezes, nas amostras dos últimos 30 dias, a API viu
  uma sessão do papel ociosa em transação por 5 minutos ou mais (cada sessão conta uma vez por episódio).
* `pid` é o `pid`. `tipo` agrupa o `backend_type`: `CLIENTE` (`client backend`), `REPLICACAO` (`walsender`),
  `AUTOVACUUM` (`autovacuum launcher` e `autovacuum worker`) e `SERVIDOR` (os outros); `processo` repete o
  `backend_type`. As sessões `CLIENTE` e `REPLICACAO` somadas dão as conexões ativas de
  `GET /dashboard/indicadores` e as `sessoes` de `GET /usuarios/papeis`.
* `papel`, `banco`, `aplicacao` e `endereco` são `usename`, `datname`, `application_name` (`null` quando vazio)
  e `client_addr` (`null` num socket local). `iniciadaEm`, `transacaoDesde`, `consultaDesde` e `estadoDesde` são
  `backend_start`, `xact_start`, `query_start` e `state_change`.
* `estado` traduz `state`: `ATIVA` (`active`), `OCIOSA` (`idle`), `OCIOSA_EM_TRANSACAO` (`idle in transaction`),
  `OCIOSA_EM_TRANSACAO_ABORTADA` (`idle in transaction (aborted)`), `CHAMADA_DE_FUNCAO` (`fastpath function
  call`) e `DESATIVADA` (`disabled`); `null` num processo sem estado. `espera` é `{ tipo, evento }` com
  `wait_event_type` e `wait_event`, ou `null`.
* `consulta` é o `query` com os literais trocados por `$1`, `$2`…, como o `pg_stat_statements` faz: os valores
  das consultas nunca chegam ao navegador. `consultaId` é o `id` de `GET /consultas` quando o `query_id` da
  sessão está entre as consultas medidas; senão, `null`.
* `bloqueadaPor` é o `pg_blocking_pids(pid)`. `bloqueios` são as linhas de `pg_locks` do `pid`: `tipo` traduz
  `locktype` (`relation`, `transactionid`, `tuple`, `advisory`), `alvo` é o nome da tabela, `xid N` ou a tabela
  com a linha, `modo` é o `mode` e `concedido` é o `granted`.
* `doOrynt` é verdadeiro só na sessão que a API usou para tirar o retrato: a tela nunca a aponta.

A tela só lê. Os comandos que ela oferece são `pg_cancel_backend` e `pg_terminate_backend`, prontos para copiar.
`401` sem conexão ativa, como as outras rotas de dados.

### 12.3 `GET /usuarios/permissoes`

Sem parâmetros. Devolve `200` com `ListaPermissoesDTO`: as permissões de todos os objetos do banco da conexão
ativa, numa resposta só, sem paginação. A tela calcula no navegador o acesso efetivo de cada papel (direto,
herdado por um grupo, por `PUBLIC`, por ser dono ou superusuário), decide as situações e monta os comandos.

* `banco` é o banco da conexão. `papelDaConexao` tem o sentido de `GET /usuarios/papeis`.
* `papeis` são os mesmos papéis de `GET /usuarios/papeis`, só com `nome`, `descricao`, `login`, `superusuario` e
  `membroDe` (com `herda`, `assume` e `administra`). A herança segue só as participações com `herda`: o que um
  grupo pode, sem herança, só vale depois de `SET ROLE` e não entra no acesso efetivo.
* `objetos` traz o banco, os esquemas fora dos do sistema (`pg_catalog`, `information_schema`, `pg_toast`), as
  tabelas, as visões, as visões materializadas, as sequências, as funções e os procedimentos. `id` é
  `banco:<nome>` no banco, `esquema:<nome>` num esquema e o mesmo `id` de `GET /objetos/tabelas`,
  `GET /objetos/visoes` e `GET /objetos/funcoes` nos outros; nas funções e nos procedimentos, `nome` traz os
  argumentos, como em `GET /usuarios/papeis`. `tipo` é `BANCO`, `ESQUEMA`, `TABELA`, `VISAO`,
  `VISAO_MATERIALIZADA`, `SEQUENCIA`, `FUNCAO` ou `PROCEDIMENTO` (a função de gatilho é `FUNCAO`). `dono` é o
  dono do objeto e `segurancaDefinidor` é o `prosecdef` (falso fora das funções). `colunas` são os nomes das
  colunas de uma tabela, de uma visão ou de uma visão materializada, na ordem de `attnum`, para a concessão por
  coluna; nos outros tipos, vazio.
* `concessoes` é o `aclexplode` da ACL do objeto (`datacl`, `nspacl`, `relacl`, `proacl`), com a ACL padrão do
  tipo (`acldefault`) quando ela é nula, fora as entradas do dono para ele mesmo, que já estão em `dono`.
  `beneficiario` é o papel, ou `PUBLIC` quando o `grantee` é `0`; `concedente` é o `grantor`; `privilegio` é o
  `privilege_type`; `repassavel` é o `is_grantable`. As permissões por coluna (`attacl` de `pg_attribute`) vêm
  como uma concessão por papel e privilégio, com as colunas em `colunas`; nas outras, `colunas` é `null`.
* `privilegiosPadrao` vem de `pg_default_acl`: `criador` é o `defaclrole` (o `FOR ROLE`), `esquema` é o
  `defaclnamespace` (`null` quando vale para qualquer esquema), `tipoDeObjeto` é `TABELAS` (`r`, que inclui
  visões), `SEQUENCIAS` (`S`) ou `FUNCOES` (`f`), e cada `beneficiario` traz os seus `privilegios`.

Os comandos que a tela oferece, `GRANT`, `REVOKE` e `ALTER DEFAULT PRIVILEGES`, saem para copiar ou, depois da
revisão, para `POST /usuarios/alteracoes`. `401` sem conexão ativa, como as outras rotas de dados.

### 12.4 `POST /usuarios/alteracoes`

Recebe `PedidoAlteracaoDTO` e executa as `operacoes`, na ordem, numa transação só, no servidor da conexão ativa. É a
única rota que muda o banco. O front nunca manda SQL: cada operação é estruturada, a API valida os nomes, cita os
identificadores (`quote_ident`) e os literais (`quote_literal`) e monta o SQL pela mesma regra de
`src/regras/sqlAlteracoes.ts`, que o front usa para a prévia. A resposta traz o SQL que rodou, que precisa ser igual
à prévia.

* **SQL de cada operação:** `CRIAR_PAPEL` é `CREATE ROLE` com `LOGIN` ou `NOLOGIN` e os atributos fora do padrão,
  `CONNECTION LIMIT`, `VALID UNTIL` (`AAAA-MM-DD`) e `PASSWORD`; `ALTER_PAPEL` é `ALTER ROLE` só com o que veio
  (`CONNECTION LIMIT -1` e `VALID UNTIL 'infinity'` tiram o limite e a validade, `PASSWORD NULL` tira a senha);
  `RENOMEAR_PAPEL` é `ALTER ROLE … RENAME TO`; `DESCREVER_PAPEL` é `COMMENT ON ROLE`; `CONFIGURAR_PAPEL` é
  `ALTER ROLE … SET` ou `RESET` (o `search_path` vai como lista de nomes); `EXCLUIR_PAPEL` é, nesta ordem, o
  `pg_terminate_backend` das sessões do papel quando `encerrarSessoes`, `REASSIGN OWNED BY … TO herdeiro` quando
  há herdeiro, `DROP OWNED BY` quando `removerPermissoes` e `DROP ROLE`; `CONCEDER_PARTICIPACAO` é
  `GRANT grupo TO membro` com `WITH INHERIT FALSE`, `SET FALSE` e `ADMIN TRUE` quando fogem do padrão
  (PostgreSQL 16 ou mais novo); `REVOGAR_PARTICIPACAO` é `REVOKE grupo FROM membro`; `CONCEDER` e `REVOGAR` são
  `GRANT` e `REVOKE` no objeto (`ON TABLE`, `ON SEQUENCE`, `ON FUNCTION`, `ON SCHEMA`, `ON DATABASE`) ou em
  `ALL TABLES|SEQUENCES|FUNCTIONS IN SCHEMA`, com as colunas quando há, `WITH GRANT OPTION`, `GRANT OPTION FOR`
  (`soRepasse`), um `REVOKE … GRANTED BY` por concedente quando `concedentes` não é vazio e `CASCADE`;
  `PRIVILEGIO_PADRAO` é `ALTER DEFAULT PRIVILEGES FOR ROLE … [IN SCHEMA …] GRANT|REVOKE … ON TABLES|SEQUENCES|FUNCTIONS`.
* **Senha:** só chega como verificador SCRAM-SHA-256 (`SCRAM-SHA-256$<iterações>:<sal>$<StoredKey>:<ServerKey>`),
  calculado no navegador. A API recusa qualquer outro formato com `400` e nunca recebe a senha. Nem o verificador
  volta numa resposta nem fica no histórico: lá a operação traz `{ "tipo": "OCULTA" }` e o comando,
  `PASSWORD '<verificador SCRAM omitido>'`.
* **Inversas:** `inversas` são as operações que desfazem esta, calculadas pelo front com o estado que ele mostrou
  (`src/regras/inversasAlteracoes.ts`), ou `null` quando não há desfazer (exclusão, troca de senha). A API só as
  guarda e as valida quando chegam de volta como `operacoes`. `desfaz` é o `id` da alteração desfeita: a API marca
  `desfeitaPor` nela e responde `409` quando ela não existe, foi recusada ou já foi desfeita.
* **Sucesso:** `201` com `AlteracaoDTO`. `conta` é o e-mail da conta do Orynt que fez a alteração.
* **Recusa do banco:** `422`, com o `detail` do PostgreSQL e o `type` pelo SQLSTATE: `database-permission-denied`
  (42501), `database-dependent-objects` (2BP01), `database-duplicate-object` (42710), `database-undefined-object`
  (42704), `database-invalid-grant` (0LP01), `database-object-in-use` (55006) e `database-command-failed` (os
  outros). A recusa também entra no histórico, com `resultado` `RECUSADA` e `falha`. Nenhum comando da transação
  fica aplicado.
* `400` quando o pedido não segue o formato; `401` sem conexão ativa; `403` quando a conta do Orynt não tem
  `BANCO_PAPEIS_ALTERAR` ou `BANCO_PERMISSOES_ALTERAR` (seção 1.1). A recusa do próprio banco continua `422`.

### 12.5 `GET /usuarios/alteracoes`

Sem parâmetros. Devolve `200` com `ListaAlteracoesDTO`: as alterações feitas pelo Orynt no servidor da conexão
ativa, da mais recente à mais antiga, aplicadas e recusadas, numa resposta só. A tela busca, filtra e pagina no
navegador. `401` sem conexão ativa.

---

## 13. Administração

Contas do Orynt (quem entra na aplicação), não papéis do PostgreSQL. Todas as rotas desta seção pedem
`ADMIN_USUARIOS`; sem ela a resposta é `403` e o servidor registra `ACESSO_NEGADO` na auditoria.

### 13.1 Regras que a API aplica, não o front

* **Só concede o que tem:** toda permissão que a conta passa a ter e não tinha precisa estar nas permissões de
  quem pede. Do contrário, `403` com `type` terminando em `/problems/privilege-escalation`. Revogar uma
  permissão que o administrador não tem é permitido.
* **Dependências:** `BANCO_PAPEIS_ALTERAR` e `BANCO_PERMISSOES_ALTERAR` só valem com `BANCO_ACESSOS_VER`. Um
  conjunto sem a dependência volta `400` no campo `permissoes`.
* **Proteções** (`409`, `type` terminando em `/problems/administrator-protection`): ninguém desativa, exclui
  nem tira `ADMIN_USUARIOS` da própria conta; a última conta ativa com `ADMIN_USUARIOS` não pode ser
  desativada, excluída nem perder essa permissão; a conta criada na instalação (`inicial`) não pode ser
  desativada nem excluída; não se encerram as sessões da própria conta por aqui (o caminho é
  `DELETE /autenticacao/sessao`).
* **Senha:** o administrador nunca define nem vê a senha. A conta nasce com um convite (token aleatório,
  guardado só como hash, válido por 7 dias, de uso único). A senha é guardada com um hash lento e com sal (o
  simulador usa PBKDF2-SHA-256 com 210.000 iterações; na API, Argon2id ou bcrypt, **A DEFINIR NO BACKEND**).
* **Permissões efetivas a cada requisição:** a API lê as permissões da conta em toda requisição, então uma
  revogação vale na seguinte, sem novo login. Desativar ou excluir a conta encerra as sessões dela.
* **Auditoria:** cada rota que muda algo registra um evento (seção 14), com o antes e o depois.

### 13.2 `GET /administracao/contas`

`200` com `ListaContasDTO`: todas as contas, numa resposta só. A tela busca, filtra e pagina no navegador.

### 13.3 `POST /administracao/contas`

* **Corpo:** `NovaContaDTO`. Com `ativa: true`, o convite sai na hora; com `false`, a conta fica guardada e o
  convite sai quando ela for ativada.
* **`201`:** `ContaDTO`, com `convite` preenchido quando saiu.
* **`400`:** `nome` (2 a 80 caracteres), `email` (formato e até 254), `perfil`, `permissoes` do catálogo, `ativa`.
* **`409`:** e-mail em uso (`/problems/email-in-use`, com `errors` em `email`). A comparação ignora maiúsculas.
* **`403`:** elevação de privilégio (13.1).

### 13.4 `PATCH /administracao/contas/{id}`

* **Corpo:** `EdicaoContaDTO`, só com os campos que mudam. Trocar o e-mail de quem ainda não definiu a senha
  envia um convite novo para o endereço novo. Ativar uma conta sem senha envia um convite novo.
* **`200`:** `ContaDTO`. **`404`**; **`409`** (e-mail em uso ou proteção).

### 13.5 `PUT /administracao/contas/{id}/permissoes`

* **Corpo:** `PermissoesContaDTO`, com o perfil e a lista completa de permissões efetivas (não um delta).
* **`200`:** `ContaDTO`. **`400`**, **`403`**, **`404`** e **`409`** conforme 13.1.

### 13.6 `DELETE /administracao/contas/{id}`

* **`204`:** encerra as sessões, apaga as conexões salvas da conta e a conta. A auditoria e o histórico de
  `/usuarios/alteracoes` não são apagados: os eventos guardam o nome e o e-mail que a conta tinha.
* **`404`**; **`409`** (proteção).

### 13.7 `POST /administracao/contas/{id}/convite`

Reenvia o convite; o token anterior deixa de valer. **`200`:** `ContaDTO`. **`409`:** a conta já tem senha ou
está desativada.

### 13.8 `DELETE /administracao/contas/{id}/sessoes`

Encerra todas as sessões da conta. **`200`:** `ContaDTO`. **`409`:** a própria conta.

### 13.9 `DELETE /administracao/contas/{id}/bloqueio`

Tira o bloqueio de login por tentativas (seção 5.1). **`200`:** `ContaDTO`.

---

## 14. Auditoria

### 14.1 `GET /auditoria`

Pede `ADMIN_AUDITORIA`. A lista é filtrada, ordenada do mais recente ao mais antigo e paginada pela API, porque
cresce sem limite.

| Parâmetro | Valores |
|---|---|
| `busca` | Texto livre, até 200 caracteres. Procura na frase do evento, no nome e no e-mail da conta, no e-mail digitado num login, no registro afetado, no módulo, na ação, na rota e no antes e depois. |
| `conta` | Id da conta: traz o que ela fez e o que fizeram com ela. |
| `categoria` | `AUTENTICACAO`, `NAVEGACAO`, `CONSULTA`, `CRIACAO`, `ATUALIZACAO`, `EXCLUSAO`, `PERMISSOES` |
| `modulo` | `ACESSO`, `DASHBOARD`, `RELATORIOS`, `CONSULTAS`, `OBJETOS`, `BANCO`, `CONEXOES`, `ADMINISTRACAO`, `CONFIGURACOES` |
| `resultado` | `SUCESSO`, `FALHA`, `NEGADO` |
| `periodo` | `ULTIMA_HORA`, `ULTIMAS_24_HORAS`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS`; sem ele, tudo |
| `pagina` | A partir de 1, com 25 eventos por página. Uma página além do fim volta a última. |

`200` com `PaginaAuditoriaDTO`. Com `conta`, `resumoDaConta` traz as contagens do que a própria conta fez no
período, por módulo e por ação, e as tentativas negadas.

### 14.2 `POST /auditoria/acessos`

Pede só a sessão. O front avisa a tela que abriu (`AcessoTelaDTO`, um caminho da lista de telas do Orynt). A API
confere a permissão da tela e registra `TELA_ACESSADA` (`204`) ou `ACESSO_NEGADO` (`403`); caminho desconhecido
volta `400`. É um evento por tela aberta: trocar filtros ou páginas não gera eventos.

### 14.3 O que é registrado

| Tipo | Quando |
|---|---|
| `LOGIN`, `LOGOUT` | Login aceito e saída |
| `LOGIN_FALHOU` | Login recusado, com `motivo` (`SENHA_INCORRETA`, `CONTA_INEXISTENTE`, `CONTA_DESATIVADA`, `CONVITE_PENDENTE`, `BLOQUEADA`) e o e-mail digitado em `emailInformado`; nunca a senha |
| `LOGIN_BLOQUEADO` | A quinta senha errada do mesmo e-mail em 15 minutos, que bloqueia o login por 15 minutos |
| `RECUPERACAO_PEDIDA`, `SENHA_REDEFINIDA` | Recuperação de senha de uma conta que existe |
| `CONVITE_ACEITO` | A pessoa definiu a senha pelo convite |
| `TELA_ACESSADA` | Tela aberta (14.2) |
| `ACESSO_NEGADO` | Qualquer rota ou tela recusada por falta de permissão, com a rota em `requisicao` |
| `CONTA_CRIADA`, `CONTA_EDITADA`, `CONTA_ATIVADA`, `CONTA_DESATIVADA`, `CONTA_EXCLUIDA`, `CONTA_DESBLOQUEADA`, `CONVITE_REENVIADO`, `SESSOES_ENCERRADAS` | Seção 13 |
| `PERMISSOES_ALTERADAS` | Seção 13.5, com `concedidas`, `revogadas` e a troca de perfil em `mudancas` |
| `CONEXAO_CRIADA`, `CONEXAO_ATIVADA`, `CONEXAO_ENCERRADA`, `CONEXAO_RENOMEADA`, `CONEXAO_EXCLUIDA` | Seção 6, também as tentativas recusadas pelo banco (`FALHA`) |
| `BANCO_ALTERADO` | `POST /usuarios/alteracoes`, aplicada ou recusada, com o id da alteração em `alvo` |

* **Nunca entram no registro:** senhas, códigos de recuperação, tokens de convite ou de redefinição,
  verificadores SCRAM e o corpo das requisições.
* **Origem:** `ip` e `navegador`, este resumido como "Chrome 141 no Windows". O simulador não tem IP. Guardar o
  IP é **A DEFINIR NO BACKEND**, junto com a política de privacidade.
* **Integridade:** não existe rota para editar ou apagar eventos, nem para o administrador. No banco da API a
  tabela deve ser só de inserção para o usuário da aplicação. A retenção é **A DEFINIR NO BACKEND** (o simulador
  guarda os 5.000 mais recentes).

---

## 15. Backup

Todas as rotas `/backup` pedem `BACKUP_GERENCIAR`; sem ela a resposta é `403` e o servidor registra `ACESSO_NEGADO`. Elas não dependem da conexão ativa: valem para todas as conexões salvas da conta, e não respondem `401` por falta de banco conectado. **A API não guarda arquivos de backup.** Ela roda o `pg_dump`, com a senha que guarda, e repassa a saída ao navegador sem gravar em disco, nem em arquivo temporário; o destino é sempre o computador de quem fez o pedido. Os dados passam pela API, e o banco precisa estar acessível a partir dela. Os DTOs estão em `src/modelos/backup.ts`.

### 15.1 Conexões salvas sem conectar

Estas pedem `CONEXOES_USAR`:

* `POST /conexoes/salvas`: recebe `CredenciaisConexaoDTO`, valida como `POST /conexoes` e responde `201` com `ConexaoSalvaDTO`, sem abrir sessão. O mesmo servidor, porta, banco e usuário atualizam a conexão existente. `ultimoUsoEm` vem `null` enquanto a conexão não for usada.
* `PUT /conexoes/{id}`: recebe `EdicaoConexaoDTO`. `senha: null` mantém a guardada. Responde `200` com `ConexaoSalvaDTO`, e os agendamentos passam a usar os dados novos. `400` com erro no campo `banco` quando outra conexão já tem esse servidor, banco e usuário.
* `POST /conexoes/{id}/teste`: sem corpo, testa os dados guardados; com `EdicaoConexaoDTO`, testa os dados enviados, usando a senha guardada se `senha` vier `null`. Responde `200` com `TesteConexaoDTO` ou as falhas de `POST /conexoes/teste`.
* `DELETE /conexoes/{id}` passa a desativar os agendamentos da conexão, com `conexaoId: null`. O histórico é mantido.

### 15.2 Resumo

* `GET /backup/resumo`: `ResumoBackupDTO`, com os totais, a última execução, os próximos agendamentos, as últimas execuções e os alertas.
* `GET /backup/alertas`: `ListaAlertasBackupDTO`. `ULTIMO_BACKUP_FALHOU` para o agendamento ativo cuja última execução falhou e para a última execução manual de cada conexão, quando falhou; `AGENDAMENTO_ATRASADO` para o agendamento ativo cuja ocorrência prevista passou da folga de uma hora sem um backup. Falhas vêm antes dos atrasos.
* `GET /backup/conexoes`: `ImpactoNaConexaoDTO[]`, com os agendamentos e a última execução de cada conexão salva.
* `GET /backup/conexoes/{id}/objetos`: `ObjetosDoBancoDTO`, os objetos do banco da conexão, fora dos esquemas do sistema e das extensões. `404` se a conexão não existe.

### 15.3 Execuções

* `GET /backup/execucoes`: parâmetros `periodo` (`ULTIMAS_24_HORAS`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS`), `banco`, `situacao` (`CONCLUIDO`, `FALHOU`, `CANCELADO`, `EM_ANDAMENTO`) e `pagina`. Responde `PaginaExecucoesDTO`, da mais recente à mais antiga, com 15 itens por página. A API filtra e pagina.
* `POST /backup/execucoes`: recebe `NovaExecucaoDTO` e responde `201` com a execução em `EM_ANDAMENTO`, sem destino: a API não decide onde o arquivo fica. `400` para objetos que o tipo não aceita.
* `GET /backup/execucoes/{id}`: `ExecucaoBackupDTO`. O front consulta a cada meio segundo enquanto acompanha. `etapa`, `objetosProcessados`, `objetoAtual` e `bytesTransferidos` vêm do que o `pg_dump` já fez (a saída de `--verbose`). `progresso` vai de 0 a 100, ou `null` quando a API não consegue medir, e nunca é estimado pelo tempo. `arquivo` já vem com o nome enquanto roda e é `null` se terminar sem arquivo.
* `GET /backup/execucoes/{id}/arquivo`: a saída do `pg_dump` em fluxo, para a aba que iniciou o backup. É esta conexão que mantém o backup vivo: se ela cair (aba fechada ou recarregada, rede, repouso), a API encerra o `pg_dump` e marca `FALHOU` com `interrompida: true`, sem arquivo. `410` (`/problems/backup-file-gone`) para qualquer outro pedido, porque nada fica guardado.
* `POST /backup/execucoes/{id}/cancelamento`: encerra o `pg_dump` e responde `200` com a execução em `CANCELADO`, sem arquivo. Se já terminou, responde `200` com a execução como está.
* `DELETE /backup/execucoes/{id}`: apaga só o registro e responde `204`. `409` (`/problems/backup-running`) enquanto a execução roda.

### 15.4 Agendamentos

São lembretes: a API nunca inicia um backup sozinha, porque o arquivo só tem para onde ir com o site aberto.

* `GET /backup/agendamentos`: `ListaAgendamentosDTO`. A API calcula `situacao`, `proximaExecucaoEm`, `ultimaExecucao` e `lembreteEm` (a ocorrência que chegou e ainda não teve backup, até uma hora depois dela). O front consulta a cada 30 segundos enquanto o site está aberto.
* `POST /backup/agendamentos` (`201`) e `PUT /backup/agendamentos/{id}` (`200`): recebem `DadosAgendamentoDTO`.
* `PATCH /backup/agendamentos/{id}`: recebe `{ "ativo": boolean }`. `409` (`/problems/backup-connection-unavailable`) ao ativar sem conexão.
* `DELETE /backup/agendamentos/{id}`: `204`. As execuções continuam no histórico.
* `POST /backup/agendamentos/{id}/execucoes`: sem corpo, faz agora o backup do agendamento e responde `201` com a execução, com `origem: AGENDADA`. `409` (`/problems/backup-connection-unavailable`) sem conexão.

### 15.5 No navegador

Não há rota de armazenamento: o destino é escolhido e usado só no navegador.

* **Pasta escolhida (File System Access API, Chrome e Edge para computador):** o front grava o fluxo direto na pasta, com `FileSystemWritableFileStream`.
* **Baixar pelo navegador:** o front junta o fluxo no navegador e oferece "Baixar backup" ao terminar, com um clique da pessoa, porque um download sem clique pode ser bloqueado. Backups grandes pedem o armazenamento privado do navegador (OPFS), não a memória.
* O simulador entrega hoje um `ArquivoDoBackupDTO` (`nome`, `tipo`, `conteudo`) de uma vez. Ligar a API real pede trocar `servicoBackup.buscarArquivo` por um `fetch` em fluxo, aberto logo depois do `POST`, fora do `clienteHttp` e do limite de 15 segundos dele.

---

## 16. Pendências do contrato

* Backup: as raízes de pasta permitidas, o formato do arquivo (o simulador usa `.dump`), o limite de execuções simultâneas, como `pg_dump` é chamado, o fuso do horário dos agendamentos e o que fazer com uma ocorrência perdida quando a API estava fora do ar.
* Contas: o algoritmo de hash da senha (Argon2id ou bcrypt), o serviço de e-mail dos convites, a duração e a
  ociosidade máxima da sessão, e se o bloqueio por tentativas também conta por origem.
* Auditoria: retenção, guarda do IP, exportação para um SIEM e proteção contra alteração no banco da API.
* Recuperação de senha: o serviço de envio de e-mail, o texto da mensagem, o limite de pedidos por origem e o prazo do token de redefinição.
* Como a senha das conexões salvas é cifrada e onde fica a chave.
* Limite de conexões salvas por conta, se houver.
* URL base, nome do cookie e duração da sessão.
* Valores definitivos de `type` e dos status das falhas de conexão.
* Limites de `desempenho` e se eles serão configuráveis.
* Fuso usado para alinhar os intervalos da série e os períodos dos relatórios.
* Quanto histórico fica disponível para os relatórios.
* Quantidade de consultas devolvidas por `GET /dashboard/consultas` e por `GET /relatorios/resumo` (o simulador devolve 10). A lista completa, paginada, é `GET /consultas`.
* De onde vêm o tempo mínimo e o máximo quando o período não cobre a vida inteira das estatísticas do banco.
* Quanto tempo de histórico por consulta a API guarda e com que frequência ela coleta os intervalos (`pg_stat_statements` só dá o acumulado).
* Formato definitivo do `id` da consulta (o `queryid` do PostgreSQL é um inteiro de 64 bits).
* `sslmode` em `CredenciaisConexaoDTO`, quando o modo SSL entrar no formulário.
* Views: como a API liga uma consulta à visão que ela lê (análise do texto ou do plano), se guarda a última
  atualização das materializadas além dos 30 dias e se as visões de extensões entram na lista.
* Índices: com que frequência a API amostra `pg_stat_user_indexes` e `pg_stat_user_tables`, o que faz depois de um
  `pg_stat_reset` e se os índices das tabelas de extensões entram na lista.
* Funções: com que frequência a API amostra `pg_stat_user_functions`, o que faz depois de um `pg_stat_reset`,
  como liga uma consulta à função que ela cita (análise do texto, como nas visões) e se guarda quando o
  `track_functions` mudou no período, o que deixaria uma parte dos 30 dias sem medida.
* Alterações: quanto tempo o histórico fica guardado, se ele é por conta ou por servidor (o simulador guarda por
  conexão), se a API recalcula as inversas em vez de guardar as do front e como trata um servidor anterior ao
  PostgreSQL 16, que não aceita `WITH INHERIT` e `WITH SET` no `GRANT` de um papel.
* Papéis: com que frequência a API amostra `pg_stat_activity`, quanto tempo guarda o último uso de cada papel e
  o que mostra quando a conexão dela não pode ler `pg_authid`, além do formato da senha.
* Planos de execução: como a API captura os planos (`auto_explain` com amostragem, `log_min_duration`), quantos guarda por consulta, como decide que dois planos são a mesma versão e se os valores dos parâmetros (`$1`) entram no plano guardado, o que exigiria cuidado com dados pessoais.
