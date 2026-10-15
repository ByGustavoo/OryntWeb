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
| `401`, `403` | `NAO_AUTORIZADO` | Volta para a tela de login ou mostra o dashboard sem conexão; no login, mostra "E-mail ou senha incorretos" |
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
| `GET` | `/sistema/versao` | Versão publicada da API e a data de lançamento | não |

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
  simulado: boolean;
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

---

## 5. Autenticação

Nesta fase só o simulador responde a estas rotas, com um login fictício: ele aceita apenas as
credenciais de `src/dados/simulacao/credenciaisDemonstracao.ts`. A autenticação real e o cadastro são
**A DEFINIR NO BACKEND**. A recuperação de senha (5.4 a 5.6) já tem contrato, porque a tela existe; o
simulador a cumpre sem enviar e-mail e sem gravar a senha.

### 5.1 `POST /autenticacao/sessao`

* **Corpo:** `CredenciaisAcessoDTO`.
* **`200`:** `UsuarioDTO`, com o `Set-Cookie` da seção 1.1.
* **`400`:** campos inválidos, com `errors` (`email` obrigatório e em formato de e-mail, até 254 caracteres; `senha` obrigatória e não aparada).
* **`401`:** credenciais recusadas, com `type` terminando em `/problems/invalid-credentials`. A resposta não diz qual dos dois campos está errado.
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

## 11. Pendências do contrato

* Autenticação real: como as contas são criadas.
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
* Planos de execução: como a API captura os planos (`auto_explain` com amostragem, `log_min_duration`), quantos guarda por consulta, como decide que dois planos são a mesma versão e se os valores dos parâmetros (`$1`) entram no plano guardado, o que exigiria cuidado com dados pessoais.
