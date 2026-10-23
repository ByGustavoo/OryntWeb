# Orynt

## O que é
Frontend de uma aplicação para monitorar, analisar e administrar bancos PostgreSQL ("Toda lentidão tem uma
origem."), toda sobre dados simulados: login, recuperação de senha, o modal de conexão com as conexões salvas, o
shell e o Dashboard, Relatórios (Resumo, Exportação, Comparação), Consultas SQL (Todas, Histórico, Planos de
execução), Objetos do banco (Views, Índices, Tabelas, Funções), Usuários e permissões (Papéis, Sessões,
Permissões, Alterações) e Administração (Usuários e Auditoria: as contas do Orynt, suas permissões e a auditoria do
que cada uma fez). Papéis e Permissões também alteram o banco (papéis, participações, GRANT, REVOKE, privilégios
padrão), sempre depois de uma revisão; Alterações é o histórico dessas mudanças. O backend (OryntAPI) ainda não
existe. As decisões de produto ficam no `REQUISITOS.md` e são requisitos: não as altere sem a aprovação do
usuário. O contrato que a futura API precisa cumprir está em `docs/api-contrato.md`.

## Tipo
web/frontend - entrega: branch + PR para a `main` em `ByGustavoo/OryntWeb` (GitHub); a branch e o título do PR
levam o id do commit, como `ORY-2`. Ainda não há CI nem workflow de entrega.

## Stack
React 18, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vite 5, React Router 6 (flags futuras da v7
ligadas), CSS Modules com propriedades customizadas, Recharts, lucide-react, Geist / Geist Mono via
`@fontsource-variable`, Vitest. Mesma stack e mesmas convenções de pastas de `D:\Projetos\OrbitWeb`, de onde vieram
o design system (`src/componentes/ui/`), a camada HTTP e o layout.

## Notas detalhadas
Este arquivo guarda só o que vale para o projeto inteiro. As decisões, medidas e armadilhas de cada área ficam em
`docs/notas/`, movidas para lá sem alteração em 23 de outubro de 2026, quando este arquivo passou de 160 mil
caracteres, e traduzidas para o português no mesmo dia. **Leia o arquivo da área antes de mexer nela** e registre ali as armadilhas novas daquela área, não
aqui:

| Arquivo | Cobre |
|---|---|
| `docs/notas/estrutura.md` | Cada arquivo de `src/`, pasta por pasta (módulos do simulador, regras, hooks, componentes) |
| `docs/notas/seguranca.md` | As regras de segurança completas, resumidas abaixo |
| `docs/notas/acesso.md` | Login, recuperação de senha, guardas de rota, as transições de entrada e saída, a ilustração do login |
| `docs/notas/interface.md` | Shell, menu, cabeçalho, menu da conta, configurações, componentes de `ui/` (`Dica`, `Modal`, `Botao`), tokens e paleta, marca, Dashboard e suas animações, as revisões de interface de 20 e 22 de outubro de 2026, telas de erro, páginas 404, 403 e de falha geral (`MolduraDeErro`, `TerminalPsql`) |
| `docs/notas/consultas.md` | Consultas SQL › Todas, Histórico e Planos de execução, `ConsultaSql`, a árvore do plano e as consultas, o histórico e os planos simulados |
| `docs/notas/objetos.md` | Objetos do banco › Views, Índices, Tabelas e Funções, `useVerObjeto` |
| `docs/notas/usuarios.md` | Papéis, Sessões, Permissões, as alterações no banco (`POST /usuarios/alteracoes`), `CadeiasDeBloqueio`, `MapaDosPapeis` |
| `docs/notas/relatorios.md` | Resumo, Exportação e Comparação, períodos, impressão, arquivos CSV/JSON/Markdown |
| `docs/notas/desenvolvimento.md` | Dados simulados × API, controles de console `window.oryntSimulacao`, armadilhas do hot reload do Vite, verificação no Chrome |

## Estrutura
| Caminho | Guarda |
|---|---|
| `src/api/` | `clienteHttp` (o único lugar que faz requisições), `rotasApi` (todos os caminhos da API), `ErroApi`, `tratamentoErros`, o transporte `fetch` |
| `src/dados/simulacao/` | O simulador da API: `transporteSimulado` (rotas e seu `acesso`), `manipuladores/` e um gerador determinístico por área (`series`, `relatorios`, `consultas`, `planosExecucao`, `indices`, `tabelas`, `funcoes`, `papeis`, `sessoes`, `permissoes`…), além das contas, auditoria, sessões e conexões salvas simuladas no `localStorage` e de `controles` (chaves de desenvolvimento) |
| `src/servicos/` | Um serviço por área, uma camada fina sobre o `clienteHttp` |
| `src/modelos/` | Tipos de DTO, enums e rótulos em português (`rotulos.ts`) |
| `src/regras/` | Regras puras com testes: validação, falhas em palavras, filtros e ordenação lidos do estado do histórico, frases dos pontos de atenção e dos destaques, comandos SQL, exportações, sugestão de tela da 404 |
| `src/provedores/` | Tema, notificações, autenticação, conexão, modal de nova conexão, modal de alterações (`ProvedorAlteracoes`) |
| `src/ganchos/` | Hooks: filtros de cada tela guardados no estado do histórico, navegação entre telas (`useVerHistorico`, `useVerPlano`, `useVerObjeto`), permissões, dados assíncronos, consultas de mídia e de tamanho |
| `src/componentes/` | `ui/` (design system), `layout/`, `comum/` e uma pasta por área (`login/`, `recuperacao/`, `conexao/`, `dashboard/`, `relatorios/`, `consultas/`, `objetos/`, `usuarios/`, `administracao/`, `configuracoes/`); `usuarios/` e `administracao/` reaproveitam o CSS de `objetos/` |
| `src/layouts/` | `LayoutAplicacao` (o shell) e `LayoutAcesso` (em volta de `/login`, `/recuperar-senha` e `/ativar-conta`) |
| `src/paginas/` | Uma página por rota; as telas planejadas compartilham `PaginaFuncionalidadePlanejada` |
| `src/rotas/` | `caminhos` (todos os caminhos das telas), `RotasAplicacao` (a tabela de rotas) e as guardas `RotaVisitante`, `RotaAutenticada` e `RotaProtegida` |
| `src/configuracoes/` | `ambiente` (único leitor do env e de `window.__ORYNT_CONFIG__`), `aplicacao`, `navegacao` (grupos, itens e telas do menu) |
| `src/estilos/` | `tokens.css` (escala), `temas.css` (cores por tema), `global.css` |
| `src/utilitarios/` | Formatação em pt-BR, realce de SQL, gráficos e traçados, SCRAM, gerador de senha, área de transferência, download, foco, título da aba e a transição de entrada e saída do shell |

Arquivo por arquivo: `docs/notas/estrutura.md`.

## Comandos
| Para | Comando |
|---|---|
| Instalar | `npm install` |
| Rodar (dev) | `npm run dev` (porta 5176, depois de PrismaWeb 5173, OrbitWeb 5174 e AegisWeb 5175) |
| Testar | `npm test` |
| Checar tipos | `npm run typecheck` (`tsc -b`) |
| Gerar o build | `npm run build` |
| Pré-visualizar | `npm run preview` (porta 4176) |

Não há linter nem formatador configurados. Antes de dar uma tarefa por concluída, rode `npm run typecheck` e
`npm test`.

## Convenções
* Todos os identificadores, tipos, campos, arquivos e pastas em português (`ConexaoDTO`, `tempoMedioMs`, `aoConectar`); valores de enum em MAIÚSCULAS (`'ULTIMAS_24_HORAS'`). O texto da interface é em pt-BR acentuado, com só a primeira letra maiúscula.
* Nenhum comentário no código-fonte, no CSS, na configuração ou no HTML. As únicas exceções são o `.env.example` e `/// <reference>`.
* Nenhuma cor hexadecimal nos componentes: as cores vêm dos tokens de `temas.css` (`[data-tema='escuro']`, `[data-tema='claro']`). O único hex fora dele é a miniatura de prévia do tema em `SecaoAparencia.module.css`.
* Páginas e componentes nunca chamam `fetch` nem `clienteHttp`; chamam serviços. Os caminhos da API ficam só em `src/api/rotasApi.ts`.
* `import.meta.env` e `window.__ORYNT_CONFIG__` são lidos só em `src/configuracoes/ambiente.ts`.
* Rotas só a partir de `src/rotas/caminhos.ts`. Imports entre pastas usam o alias `@/`.
* Todo trabalho novo de interface passa pela skill `elite-web-experience` e é verificado no Chrome.
* Listas curtas de rótulos vão do rótulo mais curto ao mais longo, medidos como aparecem na tela (itens do menu, telas de cada item, linhas de `ResumoConexao`, formatos de exportação). Opções de uma escala seguem a ordem da escala (1 h, 24 h, 7 dias, 30 dias; Dia, Semana, Mês).
* As dicas são `Dica` (`componentes/ui/Dica.tsx`); não há atributo `title` nos componentes: não acrescente um.
* Um `Botao` com `carregando` e um `BotaoIcone` que deixa de funcionar ficam `aria-disabled`, não `disabled`, para manterem o foco.
* Os nomes de container (container queries) não são isolados pelos CSS Modules: escolha um que ainda não esteja em uso.
* Quando as notas registram que um layout ou um esqueleto foi medido para coincidir com o carregado, meça de novo depois de alterá-lo.
* Nenhum aviso de demonstração na interface (removidos em 22 de outubro de 2026, a pedido do usuário): nada de selo "Dados demonstrativos", nem de selo "Demonstração", nem de nota "Conexão simulada". Ficam de propósito: o cartão de credenciais do login, as caixas de entrada simuladas da recuperação e do convite, o painel de cenários só de desenvolvimento e as marcas dentro dos arquivos exportados e dos textos copiados ("Origem dos dados", `-demonstracao`, `dadosDemonstrativos`, "(dados demonstrativos)").

## Regras de segurança (do REQUISITOS.md)
Texto completo em `docs/notas/seguranca.md`.
* A senha do banco nunca é gravada no `localStorage`, no `sessionStorage`, em cookie, na URL ou no console; `useFluxoConexao` a tira do estado assim que a conexão é aceita. A senha do login segue a mesma regra.
* O app guarda só `orynt:tema` e `orynt:menu-recolhido`. As conexões salvas pertencem à conta e vêm da API; o simulador as guarda em `orynt:simulacao:conexoes-salvas`, e `lerConexoesSalvas` descarta qualquer campo além de id, tipo, nome, servidor, porta, banco, usuário e último uso.
* A senha de um papel (Papéis) vive só no estado do `FormularioPapel` e morre com o modal; só o verificador SCRAM-SHA-256 chega à API, e o histórico e o simulador nunca o guardam (`ocultarSenhas`).
* A sessão real é um cookie `HttpOnly` que o app nunca lê; `acessoSimulado.ts` e `sessaoSimulada.ts` são o simulador fazendo o papel do servidor.
* A recuperação de senha nunca revela se um e-mail tem conta: nenhum caminho no front pode depender de a conta existir. E-mail, código, token de redefinição e nova senha vivem só no estado do React.
* As contas do Orynt não são papéis do PostgreSQL. Toda rota do simulador declara seu `acesso` em `transporteSimulado`, e `autorizar` o confere antes do manipulador, respondendo `403` (`PROIBIDO` de `ErroApi`). O front esconde itens do menu, bloqueia botões com o motivo e mostra `SemAcessoNaTela` usando `regras/permissoesConta.ts`, nunca como a única guarda. Uma tela nova precisa de sua entrada em `telasDoOrynt`; uma rota nova precisa do seu `acesso` e, quando protegida, de uma `descricao`.
* Os botões de Papéis e Permissões conferem tanto a permissão da conta (`PermissaoDasAlteracoes`, lida por `BotaoDeAlteracao`) quanto o papel do banco (`capacidade`).
* Todo manipulador recebe `contexto` (`{ conta }`) e registra os próprios eventos de auditoria por `registrarEvento`; nunca escreva uma senha, um código, um token ou o corpo de uma requisição num evento.
* As senhas das contas são hashes PBKDF2 no simulador; os tokens de convite são guardados como SHA-256 e viajam no fragmento da URL. O bloqueio de login conta por e-mail, com ou sem conta.
* O login é fictício (`demo@orynt.local` / `orynt-demo`, `credenciaisDemonstracao.ts`): nunca o apresente como pronto para produção.

## Armadilhas que valem para todo o projeto
* Sem `.env`, o app roda com dados simulados (`VITE_FONTE_DADOS=simulada`). Com `VITE_FONTE_DADOS=api`, o simulador não entra no build. Os controles de console (`window.oryntSimulacao`: `cenario`, `falhar`, `latencia`, `esvaziar`, `restaurarPapeis`, `sair`…) estão listados em `docs/notas/desenvolvimento.md`.
* O shell é desenhado enquanto a conexão está `CONECTANDO`, `CONECTADA`, `DESCONECTADA` ou `INDISPONIVEL` (só `VERIFICANDO` o bloqueia), então nada dentro dele pode supor uma conexão: leia `conexao` de `useConexao()` e trate o `null`.
* As listas filtradas no navegador (Views, Índices, Tabelas, Funções, Papéis, Sessões, Permissões) guardam os filtros no estado do histórico por um hook `useFiltros…`, lido por uma função `lerFiltros…` que troca cada campo inválido pelo padrão. Consultas SQL › Todas e Auditoria são o contrário: a API busca, filtra, ordena e pagina, então nunca ordene nem filtre os `itens` delas no navegador.
* As páginas que carregam por seleção guardam, ao lado de cada resposta, o pedido que a produziu (`aplicados`, `Carga.pedido`) e leem dali as contagens, as marcas e as frases de vazio, não dos filtros sendo pedidos; uma troca de período ou de seleção mostra o esqueleto na hora.
* Os dados simulados são determinísticos e as telas contam uma só história (Dashboard, relatórios, consultas, histórico, planos, índices, tabelas, funções, papéis, sessões): os `*.test.ts` de `dados/simulacao/` garantem as somas e as ligações entre elas. Confira-os antes de mudar um gerador.
* Os blocos dos relatórios tiram o período do DTO, nunca do período sendo pedido. Os relatórios mostram só períodos de calendário fechados, guardados no estado do histórico, nunca na URL.
* O `Modal` só registra o elemento que vai receber o foco de volta quando o foco está fora do seu painel, e aceita `focoAoFechar`; os modais de detalhe percorrem a lista filtrada pelas setas do rodapé.
* O Vite pode continuar servindo um módulo antigo sob o carimbo `?t=` depois de dois salvamentos seguidos, e editar um arquivo de provedor que também exporta o seu hook recria o contexto ("precisa estar dentro de"): recarregue ou reinicie o `npm run dev` antes de tratar qualquer um dos dois como bug.
* O Chrome não diminui abaixo de uns 500px: confira as larguras de 320, 390 e 834 carregando o app em iframes. Antes de usar "Copiar", "Exportar CSV" ou "Imprimir" pela extensão do Chrome, substitua na página `navigator.clipboard.writeText`, `HTMLAnchorElement.prototype.click`, `URL.createObjectURL` ou `window.print`.
* Cada tela aberta grava um evento de auditoria `TELA_ACESSADA`, inclusive cada recarga feita ao conferir a interface.
* Dois arquivos que diferem só em maiúsculas e minúsculas quebram o build no Windows.
