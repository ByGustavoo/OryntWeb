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

* **Planejado:** Consultas SQL, Usuários e permissões, Objetos do banco e Relatórios. As quatro funcionalidades existem na navegação, nos grupos "Análise" e "Gerenciamento", cada uma com as suas telas, e mostram só o que está previsto.

* **Pendente:** a API (OryntAPI). O contrato que ela precisa cumprir está em [`docs/api-contrato.md`](docs/api-contrato.md).

<br>

## ✨ Funcionalidades

🔹 **Login**

* Tela inicial em `/login`, com e-mail, senha com mostrar e ocultar, validação campo a campo e estado de carregamento

* Login fictício, conferido pelo simulador com as credenciais de demonstração

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

* Tabela das consultas que mais pesam, com ordenação e indicação de desempenho

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

Qualquer outra combinação mostra "E-mail ou senha incorretos". O link "Esqueceu sua senha?" só avisa
que a recuperação chega em uma próxima versão. Para voltar à tela de login depois de entrar, abra o
menu da conta (o círculo com a inicial, no canto superior direito) e use "Sair".

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

// Esvazia os dados do dashboard, para ver os estados vazios (esvaziar(false) restaura)
oryntSimulacao.esvaziar()

// Encerra a conexão simulada com o banco
oryntSimulacao.encerrarSessao()

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
│   ├── dashboard   # Indicadores, gráfico de atividade e tabela de consultas
│   ├── layout      # Menu lateral, cabeçalho e menu da conta
│   ├── login       # Formulário de acesso e painel animado de monitoramento
│   └── ui          # Design system
├── configuracoes   # Ambiente, nome da aplicação e navegação
├── dados
│   └── simulacao   # Simulador da API e dados demonstrativos
├── estilos         # Tokens, temas e estilos globais
├── ganchos         # Fluxos de acesso e de conexão, cena do login e dados assíncronos
├── layouts         # Estrutura com menu, cabeçalho e conteúdo
├── modelos         # DTOs, enums e rótulos
├── paginas         # Uma página por rota
├── provedores      # Tema, notificações, autenticação, conexões e modal de nova conexão
├── regras          # Validação, URL de conexão, conexões salvas e leitura de falhas, com testes
├── rotas           # Caminhos, tabela de rotas e guardas de acesso e de conexão
├── servicos        # Serviços de autenticação, de conexão e de dashboard
└── utilitarios     # Formatação, SQL e foco
```

<br>

## 📚 Documentação

| Arquivo | Conteúdo |
|---|---|
| [`REQUISITOS.md`](REQUISITOS.md) | Decisões de produto e regras da conexão |
| [`docs/api-contrato.md`](docs/api-contrato.md) | Rotas, DTOs e erros que a API precisa implementar |

<br>

## ⚠️ Limitações

* Nenhum banco real é acessado: a conexão é simulada e os números do dashboard são fictícios.

* Não há modo SSL no formulário de conexão.

* Não há Dockerfile, integração contínua nem publicação configurados.

<br>

## 🖥️ Desenvolvedor

### 🔵 LinkedIn: [Gustavo Correa](https://www.linkedin.com/in/gustavo-chauar-correa-946168269/)
