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

## 10. Pendências do contrato

* Autenticação real: como as contas são criadas.
* Recuperação de senha: o serviço de envio de e-mail, o texto da mensagem, o limite de pedidos por origem e o prazo do token de redefinição.
* Como a senha das conexões salvas é cifrada e onde fica a chave.
* Limite de conexões salvas por conta, se houver.
* URL base, nome do cookie e duração da sessão.
* Valores definitivos de `type` e dos status das falhas de conexão.
* Limites de `desempenho` e se eles serão configuráveis.
* Fuso usado para alinhar os intervalos da série e os períodos dos relatórios.
* Quanto histórico fica disponível para os relatórios.
* Quantidade de consultas devolvidas e se haverá paginação.
* `sslmode` em `CredenciaisConexaoDTO`, quando o modo SSL entrar no formulário.
