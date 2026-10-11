# Orynt

## What this is
Frontend of a web application to monitor, analyze and manage PostgreSQL databases ("Toda lentidão tem uma
origem."). Phase 1 only: the login screen, the connection screen, the application shell and a first
dashboard, all on simulated data. The backend (OryntAPI) does not exist yet. Product decisions live in
`REQUISITOS.md` and are requirements: do not change them without the user's approval.

## Type
web/frontend - release: branch + PR to `main` (no CI or release workflow yet; no remote configured)

## Stack
React 18, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vite 5, React Router 6 (v7 future
flags on), CSS Modules with custom properties, Recharts, lucide-react, Geist / Geist Mono via
`@fontsource-variable`, Vitest. Same stack and folder conventions as `D:\Projetos\OrbitWeb`, from which
the design system (`src/componentes/ui/`), the HTTP layer and the layout were adapted.

## Structure
| Path | Holds |
|---|---|
| `src/api/` | `clienteHttp` (the only place that makes requests), `rotasApi` (every API path), `ErroApi`, `tratamentoErros`, the `fetch` transport |
| `src/dados/simulacao/` | API simulator: `transporteSimulado` (routes), `manipuladores/`, `series` (deterministic dashboard data), `consultasFicticias`, `credenciaisDemonstracao` (the fictitious login), `acessoSimulado` and `sessaoSimulada` (login and connection cookies), `controles` (dev switches) |
| `src/servicos/` | `servicoAutenticacao`, `servicoConexao`, `servicoDashboard`: a thin layer over `clienteHttp` |
| `src/modelos/` | DTO types, enums and Portuguese labels (`rotulos.ts`) |
| `src/regras/` | Pure rules with tests: `validacaoAcesso`, `falhaAcesso`, `validacaoConexao`, `urlConexao`, `falhaConexao`, `conexoesRecentes` |
| `src/provedores/` | `ProvedorTema`, `ProvedorNotificacoes`, `ProvedorAutenticacao` (signed-in user, checked on load), `ProvedorConexao` (active connection, checked on load) |
| `src/ganchos/` | `useFluxoAcesso` (the login form state machine), `useFluxoConexao` (the connection form state machine), `useCenaMonitoramento` (clock of the login illustration), `useConexoesRecentes`, `useDadosAssincronos` |
| `src/componentes/` | `ui/` (design system), `layout/`, `comum/` (brand), `login/` (form, demo access note and the animated panel; `roteiroCena.ts` is its deterministic script), `conexao/`, `dashboard/`, `configuracoes/` |
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
* The app stores only `orynt:tema`, `orynt:menu-recolhido` and `orynt:conexoes-recentes` (name, host, port, database and user; `lerConexoesRecentes` strips any other field).
* The real session is an `HttpOnly` cookie set by the API at login; the app never reads it. `acessoSimulado.ts` and `sessaoSimulada.ts` are the simulator playing the server and go away with it.
* The login is fictitious (`REQUISITOS.md`, "Acesso"): the simulator compares the form with `credenciaisDemonstracao.ts` (`demo@orynt.local` / `orynt-demo`). The login password follows the same rule as the database password: never stored, dropped from state when accepted. Never present this login as production-grade.

## Gotchas
* Without a `.env`, the app runs on simulated data (`VITE_FONTE_DADOS=simulada`). With `VITE_FONTE_DADOS=api`, the simulator is not bundled (checked by building both ways).
* Nothing simulated may look real: `ConexaoDTO.simulada` drives the "Demonstração" badge in the header and the notices on the connection, success, dashboard and settings screens. Keep them when adding screens.
* The connection scenario panel (`PainelSimulacao`) and `window.oryntSimulacao` exist only in development. Console controls: `cenario('SENHA_INCORRETA' | 'SERVIDOR_INACESSIVEL' | 'BANCO_INEXISTENTE' | 'TEMPO_ESGOTADO' | 'SUCESSO')`, `falhar('/dashboard')` (`false` turns it off), `latencia(8000)`, `esvaziar()` (empty states; `esvaziar(false)` restores), `encerrarSessao()` (drops the connection), `sair()` (drops login and connection, then reloads on `/login`; there is no sign-out button yet).
* The dashboard data is deterministic: `series.ts` seeds every interval with its own start time, and the indicators are derived from the same series and query list. `series.test.ts` enforces that the total equals the sum of the chart and that the slow-query count matches the table.
* The first theme is dark: `public/tema-inicial.js` applies it before React mounts (no inline script). If `CHAVE_TEMA` changes, update that file too.
* A `Botao` with `carregando` is `aria-disabled`, not `disabled`, so it keeps focus while the request runs. Do not switch it back.
* The palette is neutral black or white plus blue (decided with the login screen). Three blue roles, do not merge them: `--destaque` is for text, icons, borders and focus on a surface; `--acao`, `--acao-forte` and `--acao-contraste` are for filled buttons (white text needs the deeper blue); `--grafico-1` is for chart marks and was validated against both surfaces with the dataviz palette validator.
* The brand mark (`MarcaOrynt`) is three stacked rings with the middle one pulled out of the stack, drawn from the `--marca-*` ramp in `temas.css` (`--marca-luz` is toned down in the light theme so the bright ring keeps its edge on white). `public/icone.svg` is a static copy with the same geometry and hex values: change both together.
* The brand panels (`PainelIdentidade` on the connection screen, `PainelMonitoramento` on the login) share the `--identidade-*` tokens, which now follow the theme.
* The login illustration is a pure function of a step counter (`montarCena(passo)` in `roteiroCena.ts`, covered by tests); `useCenaMonitoramento` only advances the step once a second, and stops when the panel is off screen, the tab is hidden or the system asks for reduced motion. The chart slides with the Web Animations API, so the scene must not be remounted per step.
* The login chart line is a monotone curve (`tracarCurvaSuave` in `src/utilitarios/tracado.ts`, covered by tests), so smoothing never overshoots the peak. The scene's phase accents (red ring on the chart card during `PICO`, blue ring on the origin card during `ORIGEM`) are driven by `data-fase` in `CenaMonitoramento.module.css`, not by component state.
* The line from the chart card to the origin card (`RotaCena`) is an SVG path measured from its own box and drawn with `stroke-dashoffset`, so it travels through the corner to the node. It replays by remounting on `EstadoCena.rastreio`, which changes only on the step where the phase becomes `RASTREANDO` (tested); do not swap the animation by phase selector, or it restarts when the phase leaves.
* The login panel is clipped to the viewport height on desktop: the tiers in `PainelMonitoramento.module.css` and `CenaMonitoramento.module.css` (`max-height` 899, 860, 799, 679, 579) drop pieces so nothing overflows; the indicator card is the first to go, below 900px of height. Re-check 1280x720 and 1024x768 after changing its content.
* `/login` never shows the splash: `RotaVisitante` renders the page while the session check is still running and only redirects once the user turns out to be signed in, and the page's `Suspense` fallback is empty. Elsewhere `TelaVerificacao` stays blank for the first 600ms, so a quick check shows no logo screen at all.
* The login entrance is one top-to-bottom cascade across both halves: `--entrada-inicio`, `--entrada-passo` and `--entrada-duracao` on `.pagina` set the pace, each piece takes a step number by its height on the screen (the left column in `PaginaLogin.module.css` and `FormularioAcesso.module.css`, the right in `PainelMonitoramento.module.css` and the `--entrada-*` offsets on `.cena`), and everything falls into place from above (`--animacao-emergir`). The `Suspense` fallback of the demo access card reserves its height (`reservaDemonstracao`), so the centered column does not jump when the lazy chunk arrives; adjust it if that card changes size.
* The login column (brand, title, form) is centered in the left half, both ways, independently of the panel on the right; the brand and the title are centered text, the fields stay left-aligned.
* `roteiroCena.ts` is not named after `CenaMonitoramento.tsx` on purpose: two files differing only in case break the build on Windows.
* The connection form and the dashboard use container queries (`formulario`, `resumo`, `consultas`) because the sidebar changes the space actually available. The query table turns into cards below 780px of container width.
* Chrome cannot be resized below about 500px, and not at all when maximized; check 320, 390 and 834 widths by loading the app in iframes.
* Route guards, outermost first: `RotaVisitante` (`/login`; shown right away, and a signed-in user is sent on to `/conexao` or `/dashboard` as soon as the check answers), `RotaAutenticada` (everything else; `401` on `GET /autenticacao/sessao` sends to `/login`), `RotaProtegida` (the shell; `401` on `GET /conexoes/atual` sends to `/conexao`). `/` redirects to `/dashboard`, so a first visit lands on `/login`. The login page does not navigate after success: it registers the user and `RotaVisitante` redirects.
* The simulator answers `401` on `GET /conexoes/atual` without a login, and a new login drops the previous connection, as a real session would.
