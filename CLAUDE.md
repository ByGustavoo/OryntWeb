# Orynt

## What this is
Frontend of a web application to monitor, analyze and manage PostgreSQL databases ("Toda lentidão tem uma
origem."). Phase 1 only: the login screen, the connection modal with saved connections, the application
shell and a first dashboard, all on simulated data. The backend (OryntAPI) does not exist yet. Product decisions live in
`REQUISITOS.md` and are requirements: do not change them without the user's approval.

## Type
web/frontend - release: branch + PR to `main` on `ByGustavoo/OryntWeb` (GitHub); the branch and the PR title take the commit id, such as `ORY-2`. No CI or release workflow yet.

## Stack
React 18, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vite 5, React Router 6 (v7 future
flags on), CSS Modules with custom properties, Recharts, lucide-react, Geist / Geist Mono via
`@fontsource-variable`, Vitest. Same stack and folder conventions as `D:\Projetos\OrbitWeb`, from which
the design system (`src/componentes/ui/`), the HTTP layer and the layout were adapted.

## Structure
| Path | Holds |
|---|---|
| `src/api/` | `clienteHttp` (the only place that makes requests), `rotasApi` (every API path), `ErroApi`, `tratamentoErros`, the `fetch` transport |
| `src/dados/simulacao/` | API simulator: `transporteSimulado` (routes, with `:id` segments), `manipuladores/`, `series` (deterministic dashboard data), `consultasFicticias`, `credenciaisDemonstracao` (the fictitious login), `acessoSimulado` and `sessaoSimulada` (login and connection cookies), `conexoesSalvasSimuladas` (the saved list, in `localStorage`), `controles` (dev switches) |
| `src/servicos/` | `servicoAutenticacao`, `servicoConexao`, `servicoDashboard`, `servicoSistema`: a thin layer over `clienteHttp` |
| `src/modelos/` | DTO types, enums and Portuguese labels (`rotulos.ts`) |
| `src/regras/` | Pure rules with tests: `validacaoAcesso`, `falhaAcesso`, `validacaoConexao`, `urlConexao`, `falhaConexao`, `conexoesSalvas` |
| `src/provedores/` | `ProvedorTema`, `ProvedorNotificacoes`, `ProvedorAutenticacao` (signed-in user, checked on load, and sign-out), `ProvedorConexao` (active connection, saved connections and the reconnection on load), `ProvedorNovaConexao` (opens the connection modal; mounted by `LayoutAplicacao`) |
| `src/ganchos/` | `useFluxoAcesso` (the login form state machine), `useFluxoConexao` (the connection form state machine), `useCenaMonitoramento` (clock of the login illustration), `useDadosAssincronos` |
| `src/componentes/` | `ui/` (design system), `layout/` (`SeletorConexao` is the header switcher), `comum/` (brand), `login/` (form, demo access note and the animated panel; `roteiroCena.ts` is its deterministic script), `conexao/` (`ModalConexao`, `FormularioConexao`, `ListaConexoesSalvas`, `PainelSemConexao`), `dashboard/`, `configuracoes/` |
| `src/paginas/` | One page per route; the four planned features share `PaginaFuncionalidadePlanejada` |
| `src/configuracoes/` | `ambiente` (only reader of env and `window.__ORYNT_CONFIG__`), `aplicacao`, `navegacao` (menu and planned features) |
| `src/estilos/` | `tokens.css` (scale), `temas.css` (colors per theme), `global.css` |
| `docs/api-contrato.md` | The contract the future API must implement |

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

## Security rules (from REQUISITOS.md)
* The database password is never written to `localStorage`, `sessionStorage`, a cookie, the URL or the console. `useFluxoConexao` drops it from state as soon as the connection is accepted.
* The app stores only `orynt:tema` and `orynt:menu-recolhido`. Saved connections belong to the account and come from the API. The simulator, playing the server, keeps them in `orynt:simulacao:conexoes-salvas` (id, type, name, host, port, database, user and last use; `lerConexoesSalvas` strips any other field, so a password can never be written there).
* The real session is an `HttpOnly` cookie set by the API at login; the app never reads it. `acessoSimulado.ts` and `sessaoSimulada.ts` are the simulator playing the server and go away with it.
* The login is fictitious (`REQUISITOS.md`, "Acesso"): the simulator compares the form with `credenciaisDemonstracao.ts` (`demo@orynt.local` / `orynt-demo`). The login password follows the same rule as the database password: never stored, dropped from state when accepted. Never present this login as production-grade.

## Gotchas
* Without a `.env`, the app runs on simulated data (`VITE_FONTE_DADOS=simulada`). With `VITE_FONTE_DADOS=api`, the simulator is not bundled (checked by building both ways).
* Nothing simulated may look real: `ConexaoDTO.simulada` drives the "Demonstração" badge in the header (shown only while a connection is active; without a connection and without saved connections `SeletorConexao` renders nothing, because the dashboard already says "Nenhum banco conectado") and the notices in the connection modal, the success notification, the dashboard and the settings. Keep them when adding screens.
* There is no `/conexao` page. The login goes straight to `/dashboard`, and `ProvedorConexao` decides what the shell shows through `situacao`: `VERIFICANDO` (only this one blocks the shell, in `RotaProtegida`), `CONECTANDO` (reactivating the most recently used saved connection), `CONECTADA`, `DESCONECTADA` (with `falhaReconexao` when the reactivation failed) and `INDISPONIVEL` (the check itself failed; `verificarNovamente` retries). The shell renders in every state but the first, so nothing inside it may assume a connection: read `conexao` from `useConexao()` and handle `null`.
* The connection check runs while the login check is still running (`temSessao` is true until the user turns out to be anonymous) and runs again after a login. A `401` on `GET /conexoes` means no session and sends to `/login`; a `401` on `GET /conexoes/atual` only means no active connection.
* The connection modal never opens by itself: only a click opens it (`abrir` in `ProvedorNovaConexao`), from "Conectar ao banco" on the empty dashboard, "Nova conexão" in the header and the saved connections. `ModalConexao` is lazy and keeps the typed fields between openings, except the password; after a successful connection the next opening remounts it (`geracao`) so the form starts empty.
* Switching connections keeps the current one on screen until the new one answers (`alvo` is the one being activated). `DashboardConectado` is keyed by the connection id, so the data reloads on a switch.
* The modal actions live in the `Modal` footer and submit the form through the `form` attribute; do not move them back inside `FormularioConexao`.
* `Modal` records the element to give focus back to only when the focus is outside its panel, so a modal mounted already open (rename, the lazy connection modal) survives the double effect of StrictMode.
* The connection scenario panel (`PainelSimulacao`, inside the modal) and `window.oryntSimulacao` exist only in development. Console controls: `cenario('SENHA_INCORRETA' | 'SERVIDOR_INACESSIVEL' | 'BANCO_INEXISTENTE' | 'TEMPO_ESGOTADO' | 'SUCESSO')` (also applies to activating a saved connection), `falhar('/dashboard')` (`false` turns it off; `falhar('/conexoes')` shows the failed-check state), `latencia(8000)`, `esvaziar()` (empty states; `esvaziar(false)` restores), `encerrarSessao()` (drops the active connection), `sair()` (drops login and connection, then reloads on `/login`; the menu also has a "Sair" button).
* Editing a provider file that also exports its hook makes Vite recreate the context on hot reload, and a lazily loaded page then fails with "precisa estar dentro de"; reload the page before reading that as a bug.
* The dashboard data is deterministic: `series.ts` seeds every interval with its own start time, and the indicators are derived from the same series and query list. `series.test.ts` enforces that the total equals the sum of the chart and that the slow-query count matches the table.
* The first theme is dark: `public/tema-inicial.js` applies it before React mounts (no inline script). If `CHAVE_TEMA` changes, update that file too.
* A `Botao` with `carregando` is `aria-disabled`, not `disabled`, so it keeps focus while the request runs. Do not switch it back.
* The palette is neutral black or white plus blue (decided with the login screen). Three blue roles, do not merge them: `--destaque` is for text, icons, borders and focus on a surface; `--acao`, `--acao-forte` and `--acao-contraste` are for filled buttons (white text needs the deeper blue); `--grafico-1` is for chart marks and was validated against both surfaces with the dataviz palette validator.
* The brand mark (`MarcaOrynt`) is flat, on purpose (the user asked for no 3D on 11 October 2026): a donut chart that forms the "O" of the name, with one slice pulled out of the ring. The ring takes `--marca-corpo` (the text color) and the slice `--marca-destaque` (the accent blue), both aliases in `temas.css`, so it follows the theme. The slice slides out on the login entrance (`animada`) and snaps back into the ring when a link around the mark is hovered. `public/icone.svg` is a static copy of the same two paths on a blue tile (`#2563eb`, ring `#a3c4ff`, slice white), so the tab icon reads on light and dark browser chrome: change both together.
* The login brand panel (`PainelMonitoramento`) uses the `--identidade-*` tokens, which follow the theme.
* The login illustration is a pure function of a step counter (`montarCena(passo)` in `roteiroCena.ts`, covered by tests); `useCenaMonitoramento` only advances the step once a second, and stops when the panel is off screen, the tab is hidden or the system asks for reduced motion. The chart slides with the Web Animations API, so the scene must not be remounted per step.
* The login chart line is a monotone curve (`tracarCurvaSuave` in `src/utilitarios/tracado.ts`, covered by tests), so smoothing never overshoots the peak. The scene's phase accents (red ring on the chart card during `PICO`, blue ring on the origin card during `ORIGEM`) are driven by `data-fase` in `CenaMonitoramento.module.css`, not by component state.
* The line from the chart card to the origin card (`RotaCena`) is an SVG path measured from its own box and drawn with `stroke-dashoffset`, so it travels through the corner to the node. It replays by remounting on `EstadoCena.rastreio`, which changes only on the step where the phase becomes `RASTREANDO` (tested); do not swap the animation by phase selector, or it restarts when the phase leaves.
* The login panel is clipped to the viewport height on desktop: the tiers in `PainelMonitoramento.module.css` and `CenaMonitoramento.module.css` (`max-height` 899, 860, 799, 679, 579) drop pieces so nothing overflows; the indicator card is the first to go, below 900px of height. Re-check 1280x720 and 1024x768 after changing its content.
* `/login` never shows the splash: `RotaVisitante` renders the page while the session check is still running and only redirects once the user turns out to be signed in, and the page's `Suspense` fallback is empty. Elsewhere `TelaVerificacao` stays blank for the first 600ms, so a quick check shows no logo screen at all.
* The login entrance is one top-to-bottom cascade across both halves: `--entrada-inicio`, `--entrada-passo` and `--entrada-duracao` on `.pagina` set the pace, each piece takes a step number by its height on the screen (the left column in `PaginaLogin.module.css` and `FormularioAcesso.module.css`, the right in `PainelMonitoramento.module.css` and the `--entrada-*` offsets on `.cena`), and everything falls into place from above (`--animacao-emergir`). The `Suspense` fallback of the demo access card reserves its height (`reservaDemonstracao`), so the centered column does not jump when the lazy chunk arrives; adjust it if that card changes size.
* The login column (brand, title, form) is centered in the left half, both ways, independently of the panel on the right; the brand and the title are centered text, the fields stay left-aligned.
* `roteiroCena.ts` is not named after `CenaMonitoramento.tsx` on purpose: two files differing only in case break the build on Windows.
* The connection form and the dashboard use container queries (`formulario`, `resumo`, `consultas`) because the modal and the sidebar change the space actually available. The query table turns into cards below 780px of container width.
* The settings page fills the content width through container queries too: `configuracoes` puts "Conexão em uso" beside "Conexões salvas" from 900px of container width (one column below it, and the lone panel spans both when the saved list is hidden), `aparencia` lays the theme options out as horizontal cards from 860px, `resumo-conexao` switches the summary from right-aligned values to a fixed label column from 26rem, `conexoes-salvas` moves the rename and delete icons beside the name and "Conectar" under it below 430px, and `versoes` stacks the two version cards below 520px. Container names are not scoped by CSS Modules, so pick one that is not taken.
* "Versões" in the settings shows two cards. The web version is `window.__ORYNT_CONFIG__.versao`, falling back to the `version` of `package.json`, which `vite.config.ts` injects as `import.meta.env.VITE_VERSAO_PACOTE` (not a variable to set in `.env`); the release date comes only from `window.__ORYNT_CONFIG__.dataLancamento`, so a local run says "Ambiente de desenvolvimento". The API card reads `GET /sistema/versao`; the simulator answers `Simulada` and the card says no API is in use. `falhar('/sistema')` shows its error state.
* Below 421px the header drops the settings icon to leave room for the connection name; the same destination stays in the switcher ("Gerenciar conexões") and in the menu.
* Chrome cannot be resized below about 500px, and not at all when maximized; check 320, 390 and 834 widths by loading the app in iframes.
* Route guards, outermost first: `RotaVisitante` (`/login`; shown right away, and a signed-in user is sent on to `/dashboard` as soon as the check answers), `RotaAutenticada` (everything else; `401` on `GET /autenticacao/sessao` sends to `/login`), `RotaProtegida` (the shell; waits only for the connection check). `/` redirects to `/dashboard`, so a first visit lands on `/login`. The login page does not navigate after success: it registers the user and `RotaVisitante` redirects.
* The simulator answers `401` on the connection routes without a login, and a new login drops the active connection, as a real session would; the saved list stays, so the next dashboard visit reactivates the most recent one.
