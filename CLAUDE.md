# Orynt

## What this is
Frontend of a web application to monitor, analyze and manage PostgreSQL databases ("Toda lentidão tem uma
origem."), all on simulated data: login, password recovery, the connection modal with saved connections, the
application shell and dashboard, Relatórios (Resumo, Exportação, Comparação), Consultas SQL (Todas, Histórico,
Planos de execução), Objetos do banco (Views, Índices, Tabelas, Funções), Usuários e permissões (Papéis, Sessões,
Permissões, Alterações) and Administração (Usuários and Auditoria: the Orynt accounts, their permissions and the
audit of what each one did). Papéis and Permissões also change the database (roles, memberships, GRANT, REVOKE,
default privileges), always through a review; Alterações is the history of those changes. The backend (OryntAPI)
does not exist yet. Product decisions live in `REQUISITOS.md` and are requirements: do not change them without the
user's approval. The contract the future API must implement is `docs/api-contrato.md`.

## Type
web/frontend - release: branch + PR to `main` on `ByGustavoo/OryntWeb` (GitHub); the branch and the PR title take
the commit id, such as `ORY-2`. No CI or release workflow yet.

## Stack
React 18, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vite 5, React Router 6 (v7 future flags on), CSS
Modules with custom properties, Recharts, lucide-react, Geist / Geist Mono via `@fontsource-variable`, Vitest. Same
stack and folder conventions as `D:\Projetos\OrbitWeb`, from which the design system (`src/componentes/ui/`), the
HTTP layer and the layout were adapted.

## Detailed notes
This file holds only what applies everywhere. The decisions, measurements and traps of each area live in
`docs/notas/`, moved there verbatim on 23 October 2026 when this file passed 160k characters. **Read the file of
the area before changing it**, and write new area-specific gotchas there, not here:

| File | Covers |
|---|---|
| `docs/notas/estrutura.md` | Every file of `src/` folder by folder (simulator modules, rules, hooks, components) |
| `docs/notas/seguranca.md` | The full security rules summarized below |
| `docs/notas/acesso.md` | Login, recovery, route guards, the login/sign-out view transitions, the login illustration |
| `docs/notas/interface.md` | Shell, menu, header, account menu, settings, `ui/` components (`Dica`, `Modal`, `Botao`), tokens and palette, brand mark, dashboard and its animations, the UI reviews of 20 and 22 October 2026, error screens |
| `docs/notas/consultas.md` | Consultas SQL › Todas, Histórico and Planos de execução, `ConsultaSql`, the plan tree and the simulated queries, history and plans |
| `docs/notas/objetos.md` | Objetos do banco › Views, Índices, Tabelas and Funções, `useVerObjeto` |
| `docs/notas/usuarios.md` | Papéis, Sessões, Permissões, the database changes (`POST /usuarios/alteracoes`), `CadeiasDeBloqueio`, `MapaDosPapeis` |
| `docs/notas/relatorios.md` | Resumo, Exportação and Comparação, periods, printing, CSV/JSON/Markdown files |
| `docs/notas/desenvolvimento.md` | Simulated vs. API data, `window.oryntSimulacao` console controls, Vite hot-reload traps, checking in Chrome |

## Structure
| Path | Holds |
|---|---|
| `src/api/` | `clienteHttp` (the only place that makes requests), `rotasApi` (every API path), `ErroApi`, `tratamentoErros`, the `fetch` transport |
| `src/dados/simulacao/` | The API simulator: `transporteSimulado` (routes and their `acesso`), `manipuladores/`, and one deterministic generator per area (`series`, `relatorios`, `consultas`, `planosExecucao`, `indices`, `tabelas`, `funcoes`, `papeis`, `sessoes`, `permissoes`…), plus the simulated accounts, audit, sessions and saved connections in `localStorage` and `controles` (dev switches) |
| `src/servicos/` | One service per area, a thin layer over `clienteHttp` |
| `src/modelos/` | DTO types, enums and Portuguese labels (`rotulos.ts`) |
| `src/regras/` | Pure rules with tests: validation, failures in words, filters and ordering read from the history state, sentences of attention points and highlights, SQL commands, exports |
| `src/provedores/` | Theme, notifications, authentication, connection, new connection modal, changes modal (`ProvedorAlteracoes`) |
| `src/ganchos/` | Hooks: per-screen filters kept in the history state, navigation between screens (`useVerHistorico`, `useVerPlano`, `useVerObjeto`), permissions, async data, media and size queries |
| `src/componentes/` | `ui/` (design system), `layout/`, `comum/`, and one folder per area (`login/`, `recuperacao/`, `conexao/`, `dashboard/`, `relatorios/`, `consultas/`, `objetos/`, `usuarios/`, `administracao/`, `configuracoes/`); `usuarios/` and `administracao/` reuse the CSS of `objetos/` |
| `src/layouts/` | `LayoutAplicacao` (the shell) and `LayoutAcesso` (around `/login`, `/recuperar-senha` and `/ativar-conta`) |
| `src/paginas/` | One page per route; planned screens share `PaginaFuncionalidadePlanejada` |
| `src/configuracoes/` | `ambiente` (only reader of env and `window.__ORYNT_CONFIG__`), `aplicacao`, `navegacao` (menu groups, items, screens) |
| `src/estilos/` | `tokens.css` (scale), `temas.css` (colors per theme), `global.css` |

File by file: `docs/notas/estrutura.md`.

## Commands
| Purpose | Command |
|---|---|
| Install | `npm install` |
| Run (dev) | `npm run dev` (port 5176, after PrismaWeb 5173, OrbitWeb 5174 and AegisWeb 5175) |
| Test | `npm test` |
| Typecheck | `npm run typecheck` (`tsc -b`) |
| Build | `npm run build` |
| Preview | `npm run preview` (port 4176) |

No linter or formatter is configured. Before calling a task done, run `npm run typecheck` and `npm test`.

## Conventions
* All identifiers, types, fields, files and folders in Portuguese (`ConexaoDTO`, `tempoMedioMs`, `aoConectar`); enum values in UPPER_CASE (`'ULTIMAS_24_HORAS'`). Interface text is accented pt-BR in sentence case.
* No comments in source, CSS, config or HTML. The only exceptions are `.env.example` and `/// <reference>`.
* No hex colors in components: colors come from `temas.css` tokens (`[data-tema='escuro']`, `[data-tema='claro']`). The only hex outside it is the theme preview miniature in `SecaoAparencia.module.css`.
* Pages and components never call `fetch` or `clienteHttp`; they call services. API paths live only in `src/api/rotasApi.ts`.
* `import.meta.env` and `window.__ORYNT_CONFIG__` are read only in `src/configuracoes/ambiente.ts`.
* Routes only from `src/rotas/caminhos.ts`. Imports between folders use the `@/` alias.
* New interface work goes through the `elite-web-experience` skill and is verified in Chrome.
* Short lists of labels run from the shortest label to the longest, measured as rendered (menu items, screens under an item, rows of `ResumoConexao`, export formats). Options on a scale keep the order of the scale (1 h, 24 h, 7 dias, 30 dias; Dia, Semana, Mês).
* Tooltips are `Dica` (`componentes/ui/Dica.tsx`); there is no `title` attribute in the components: do not add one.
* `Botao` with `carregando` and a `BotaoIcone` that stops working are `aria-disabled`, not `disabled`, so they keep the focus.
* Container names (container queries) are not scoped by CSS Modules: pick one that is not taken.
* When a layout or a skeleton was measured to match (the notes give the numbers), measure again after changing it.
* No demo notice in the interface (removed on 22 October 2026, asked by the user): no "Dados demonstrativos" badge, no "Demonstração" badge, no "Conexão simulada" note. What stays on purpose: the login credentials card, the simulated inboxes of recovery and invite, the dev-only scenario panel, and the marks inside exported files and copied text ("Origem dos dados", `-demonstracao`, `dadosDemonstrativos`, "(dados demonstrativos)").

## Security rules (from REQUISITOS.md)
Full text in `docs/notas/seguranca.md`.
* The database password is never written to `localStorage`, `sessionStorage`, a cookie, the URL or the console; `useFluxoConexao` drops it from state as soon as the connection is accepted. The login password follows the same rule.
* The app stores only `orynt:tema` and `orynt:menu-recolhido`. Saved connections belong to the account and come from the API; the simulator keeps them in `orynt:simulacao:conexoes-salvas` and `lerConexoesSalvas` strips any field other than id, type, name, host, port, database, user and last use.
* A role password (Papéis) lives only in the state of `FormularioPapel` and dies with the modal; only its SCRAM-SHA-256 verifier reaches the API, and the history and the simulator never keep it (`ocultarSenhas`).
* The real session is an `HttpOnly` cookie the app never reads; `acessoSimulado.ts` and `sessaoSimulada.ts` are the simulator playing the server.
* Password recovery never tells whether an e-mail has an account: no branch in the front may depend on the account existing. E-mail, code, reset token and new password live only in React state.
* Orynt accounts are not PostgreSQL roles. Every simulator route declares its `acesso` in `transporteSimulado` and `autorizar` checks it before the handler, answering `403` (`PROIBIDO` of `ErroApi`). The front hides menu items, blocks buttons with the reason and shows `SemAcessoNaTela` using `regras/permissoesConta.ts`, never as the only guard. A new screen needs its entry in `telasDoOrynt`; a new route needs its `acesso` and, when protected, a `descricao`.
* Papéis and Permissões buttons check both the account permission (`PermissaoDasAlteracoes`, read by `BotaoDeAlteracao`) and the database role (`capacidade`).
* Every handler takes `contexto` (`{ conta }`) and records its own audit events through `registrarEvento`; never write a password, a code, a token or a request body into an event.
* Account passwords are PBKDF2 hashes in the simulator; invite tokens are stored as SHA-256 and travel in the URL fragment. Login lockout counts per e-mail, with or without an account.
* The login is fictitious (`demo@orynt.local` / `orynt-demo`, `credenciaisDemonstracao.ts`): never present it as production-grade.

## Cross-cutting gotchas
* Without a `.env`, the app runs on simulated data (`VITE_FONTE_DADOS=simulada`). With `VITE_FONTE_DADOS=api`, the simulator is not bundled. Console controls (`window.oryntSimulacao`: `cenario`, `falhar`, `latencia`, `esvaziar`, `restaurarPapeis`, `sair`…) are listed in `docs/notas/desenvolvimento.md`.
* The shell renders while the connection is `CONECTANDO`, `CONECTADA`, `DESCONECTADA` or `INDISPONIVEL` (only `VERIFICANDO` blocks it), so nothing inside it may assume a connection: read `conexao` from `useConexao()` and handle `null`.
* Lists filtered in the browser (Views, Índices, Tabelas, Funções, Papéis, Sessões, Permissões) keep their filters in the history state through a `useFiltros…` hook read by a `lerFiltros…` function that replaces invalid fields by defaults. Consultas SQL › Todas and Auditoria are the opposite: the API searches, filters, orders and pages them, so never sort or filter their `itens` in the browser.
* Pages that load per selection keep, beside each answer, the request that produced it (`aplicados`, `Carga.pedido`) and read counts, marks and empty sentences from that, not from the filters being requested; a change of period or selection shows the skeleton at once.
* The simulated data is deterministic and the screens tell one story (dashboard, reports, queries, history, plans, indexes, tables, functions, roles, sessions): the `*.test.ts` of `dados/simulacao/` enforce the sums and links between them. Check them before changing a generator.
* Report blocks take the period from the DTO, never from the period being requested. Reports show closed calendar periods only, kept in the history state, never in the URL.
* `Modal` records the element to give focus back to only when the focus is outside its panel, and takes `focoAoFechar`; detail modals step through the filtered list with arrows in the footer.
* Vite can keep serving a stale module under the `?t=` timestamp after two quick saves, and editing a provider file that also exports its hook recreates its context ("precisa estar dentro de"): reload or restart `npm run dev` before reading either as a bug.
* Chrome cannot be resized below about 500px: check 320, 390 and 834 widths by loading the app in iframes. Before touching "Copiar", "Exportar CSV" or "Imprimir" through the Chrome extension, replace `navigator.clipboard.writeText`, `HTMLAnchorElement.prototype.click`, `URL.createObjectURL` or `window.print` in the page.
* Every screen opened writes one `TELA_ACESSADA` audit event, including every reload while checking the UI.
* Two files differing only in case break the build on Windows.
