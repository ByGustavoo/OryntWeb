# Backup: Resumo, Histórico e Agendamentos

Decisões em `REQUISITOS.md`, "Backup". Construído em 30 de outubro de 2026 e revisto no mesmo dia para o backup local: o arquivo vai para o computador da pessoa, e o servidor não guarda nada. Só no front e sobre o simulador: nenhum `pg_dump` roda e nenhum agendador existe. Contrato: `docs/api-contrato.md`, seção 15.

## Como o backup local funciona

* O navegador não abre conexão TCP com o PostgreSQL nem roda `pg_dump`. Por decisão do usuário, a API faz a ponte: roda o `pg_dump` e transmite o arquivo para o navegador sem gravar em disco. Os dados passam pela API, e o banco precisa estar acessível a partir dela. As telas dizem isso (`CaminhoDoBackup`). Um auxiliar local fica para depois, para bancos em rede privada.
* O destino é `DestinoEscolhido`, em `ProvedorBackupLocal`: `NAVEGADOR` (download pelo navegador, com clique, para o navegador nunca bloquear) ou `PASTA` (File System Access API, em `utilitarios/arquivoLocal.ts`). O `FileSystemDirectoryHandle` fica só na memória da aba: nada novo no `localStorage`, então recarregar volta a `NAVEGADOR`. O navegador só revela o nome da pasta, nunca o caminho. Fora do Chrome e do Edge para computador, a opção aparece desabilitada com o motivo.
* O simulador entrega um arquivo real, pequeno e marcado: nome com `-demonstracao`, cabeçalho "não serve para restaurar" e o tamanho simulado escrito nele. O download e a gravação na pasta são de verdade; só o conteúdo é de demonstração. Por isso o tamanho na tela (simulado) difere do tamanho em disco.
* `GET /backup/execucoes/{id}/arquivo` responde `410` para quem não é a aba que fez o backup, inclusive todo o histórico semeado: o servidor não tem o arquivo.

## Acompanhamento em segundo plano

* A causa do sumiço antigo: o acompanhamento vivia dentro do `ModalPlanoBackup`, que é da página. "Continuar em segundo plano" só fechava o modal, e trocar de tela desmontava a consulta de progresso.
* Agora `ProvedorBackupLocal` envolve o shell inteiro (`LayoutAplicacao`): guarda as execuções acompanhadas, consulta o progresso num só laço e mantém os arquivos em memória.
* O segundo plano foi redesenhado em 30 de outubro de 2026 (o usuário o achou esquisito): antes, um modal abria sozinho ao iniciar, com um botão "Segundo plano", e por trás dele ficava uma barra da largura da tela com banco, arquivo, objetos e bytes. Agora nenhum modal abre sozinho, e `AcompanhamentoBackup` é um cartão fixo no canto inferior direito, como o painel de downloads de um navegador, com só o que se acompanha: nome, barra, percentual e etapa, tempo. O resto fica em `DetalheAcompanhamento`, aberto pelo ícone da linha, e fechar devolve o foco a esse ícone.
* São dois contextos: `useBackupLocal` (ações, destino e `versao`, muda pouco, usado pelas páginas) e `useAcompanhamentoBackup` (a lista, muda a cada meio segundo, usado pelo cartão). Uma página que usasse o segundo seria redesenhada a cada consulta.
* O cartão publica a distância da sua borda de cima até o fim da tela em `--altura-acompanhamento-backup`: as notificações sobem esse tanto para não o cobrir, e `.conteudo` de `LayoutAplicacao` soma o mesmo valor ao espaçamento de baixo, para o fim de qualquer página poder rolar para fora dele. O cartão é `position: fixed` e cobre o canto da página; recolhido, fica só o cabeçalho e, com um backup rodando, um filete de progresso.
* Progresso honesto: `progresso` é `null` quando não dá para medir (Só estrutura não tem tamanho), e aí a barra fica indeterminada e a linha mostra a etapa. Vários backups não têm percentual geral: o cabeçalho só conta por situação, e o filete só aparece com um backup.
* Tempo no cartão (`tempoNaBarraMs`): falhou ou tem arquivo para baixar, fica até a pessoa dispensar; já salvo, 20 segundos; cancelado, 8 segundos. Passar o mouse ou focar pausa a contagem. Dispensar não perde o arquivo: Histórico › detalhe continua oferecendo "Baixar backup" enquanto a aba viver.
* Um backup novo ou um resultado novo reabrem o cartão se ele estiver recolhido. A própria linha é a notificação (`role="status"` ou `alert`), sem toast repetindo o mesmo texto.
* `ComoFuncionaSegundoPlano` é o texto "Como funciona o segundo plano?", com sublinhado azul (`--destaque`, pedido em 30 de outubro de 2026) e a dica dos limites, na última etapa do formulário (só em "Agora"), no rodapé do cartão e nos detalhes. Por ele, `dentroDeInterativo` de `Dica` deixou de contar o `tabindex` do próprio gatilho: um gatilho `focavel` que não é um controle agora abre com um toque.

## Limites do navegador

* Trocar de tela: continua. Outra aba: continua, com timers mais lentos. Recarregar ou fechar: interrompe, e `beforeunload` pede confirmação enquanto algo se perderia (`pedeConfirmacaoAoSair`). Site fechado: nada roda. A tela Destino, que listava isso, saiu em 30 de outubro de 2026 a pedido do usuário, e `/backup/destino` agora cai na 404: a escolha do destino ficou só na etapa Destino do formulário, e os limites, em `ComoFuncionaSegundoPlano`.
* Como o simulador faz o papel da transferência: `execucoesDestaAba` guarda, em memória, o que esta carga da página iniciou. No `pagehide`, o que ainda roda vira `FALHOU` com `interrompida: true`, como a API faria ao ver a conexão cair; a uma aba que trava sem descarregar, sobra o limite de 5 segundos sem sinal. Ao carregar, o provedor adota o que está `EM_ANDAMENTO` ou foi interrompido nos últimos 5 minutos, então quem recarregou vê o que aconteceu. Cada recarga dentro desses minutos mostra o aviso de novo, porque dispensar vale só na memória da aba. Uma execução adotada de outra aba é só acompanhada: o arquivo foi para a aba que a iniciou (`NA_OUTRA_ABA`).
* Sair da conta durante um backup: `MenuConta` pede confirmação.

## Como está montado

* Todas as telas e rotas pedem uma só permissão, `BACKUP_GERENCIAR`, que exige `CONEXOES_USAR` e fica só com o perfil Administrador. Uma conta inicial gravada antes dela recebe a permissão ao ser lida (`lerConta`, em `contasSimuladas.ts`). As outras contas de Administrador já gravadas continuam com a lista antiga, até alguém mudar as permissões delas. A conta guarda só as conexões salvas e o registro do histórico, nunca arquivos.
* O módulo não depende da conexão em uso: mostra todas as conexões e abre sem banco conectado. Ele só usa `salvas` de `useConexao()`.
* Um só formulário em quatro etapas (`ModalPlanoBackup`) faz o backup na hora e cria, edita e duplica agendamento. `usePlanoBackup` abre o modal, e cada abertura troca a `key`, para os campos recomeçarem. A etapa Quando decide entre `POST /backup/execucoes` e `POST` ou `PUT /backup/agendamentos`. A etapa Destino mexe na escolha guardada em `ProvedorBackupLocal`, que vale para os próximos backups da aba. O aviso de "Banco inteiro" na etapa Objetos muda com o tipo (`descricaoBancoInteiro`), porque Só dados não leva índices, gatilhos nem restrições.
* `regras/backup.ts` guarda rótulos, filtros, validação das etapas e a montagem dos pedidos. `regras/frequenciaBackup.ts` guarda as contas de calendário, a situação do agendamento e o lembrete. `regras/selecaoObjetosBackup.ts` guarda a árvore. `regras/acompanhamentoBackup.ts` guarda os textos do cartão, os passos e o tempo no cartão. Todos têm testes e nenhum conhece a tela.
* O histórico é como a Auditoria: a API filtra e pagina, e a página guarda o pedido ao lado da resposta (`Carga.pedido`). Nunca filtre `itens` no navegador. Excluir apaga só o registro, e o arquivo no computador não é afetado.
* Os alertas (`GET /backup/alertas`, sugestão S5) usam `PontosDeAtencao`: lista no Resumo e `variante="recolhida"` no Dashboard. O Dashboard só pede os alertas para quem tem a permissão, e espera a resposta deles junto com a entrada coordenada dos outros blocos, para o bloco não empurrar a tela depois. O alerta de atraso oferece "Fazer agora".

## Agendamentos são lembretes

* Nada roda sozinho. `lembreteDevido` diz que a hora chegou (`lembreteEm`, até uma hora depois da ocorrência); o provedor consulta os agendamentos a cada 30 segundos e a barra mostra "Hora do backup", com "Fazer agora" e "Agora não". "Agora não" vale só nesta aba e para esta ocorrência.
* Passada a folga sem backup, a situação vira `ATRASADO`. Fazer o backup (`POST /backup/agendamentos/{id}/execucoes`) limpa o atraso, porque a última execução passa a ser mais nova que a ocorrência prevista.
* A retenção saiu: o site não apaga arquivos do computador de ninguém.

## Conexões

* A tela Backup › Conexões saiu em 30 de outubro de 2026 (o usuário a achou uma tela para muito poucos registros), e `/backup/conexoes` agora cai na 404. São as mesmas conexões salvas de Configurações, que edita e exclui. Sem nenhuma conexão salva, o Resumo e Agendamentos oferecem "Cadastrar conexão", e o formulário do backup tem "Nova conexão". O teste ficou no botão "Testar conexão" do modal, e a linha com os agendamentos e o último backup de cada conexão saiu; `GET /backup/conexoes` continua, para o diálogo de exclusão.
* Editar substituiu o renomear em Configurações, porque o modal já cobre o nome. `PATCH /conexoes/{id}` e `servicoConexao.renomearConexao` continuam no contrato e no simulador, sem uso nas telas.
* Foram acrescentados `POST /conexoes/salvas` (salva sem abrir sessão), `PUT /conexoes/{id}` (edita, com `senha: null` mantendo a guardada) e `POST /conexoes/{id}/teste`.
* `ModalConexaoSalva` reaproveita o `FormularioConexao` com `senhaOpcional`, mas tem o próprio gancho, `useFormularioConexaoSalva`: o `useFluxoConexao` conecta, e aqui conectar trocaria o banco do app inteiro.
* `ultimoUsoEm` agora aceita `null`: uma conexão salva sem conectar nunca foi usada, e por isso não passa à frente na hora de reconectar sozinho. `ordenarPorUso` a deixa por último, e as telas mostram "Nunca usada".
* Editar uma conexão para os mesmos servidor, banco e usuário de outra é recusado com `400`: `registrarConexaoSalva` apagaria a outra e deixaria os agendamentos dela sem conexão.
* `DialogoExcluirConexao`, em Configurações, conta quais agendamentos ficam sem conexão. Ele só consulta o impacto se a conta tem a permissão.

## Resumo

* Em "Próximos lembretes", a lista fecha com uma linha embaixo do último registro (`.listaFechada`, pedido em 30 de outubro de 2026), porque ela costuma ser mais curta que o card. "Últimas execuções" ocupa o card inteiro e fica sem essa linha.

## Simulador (`dados/simulacao/backup.ts`)

* Fica em `orynt:simulacao:backup`, por conta. Nenhuma senha passa por ele. O estado tem `versao`: um estado de versão antiga é descartado e semeado de novo.
* A primeira leitura de uma conta com conexão salva semeia cinco agendamentos e 30 dias de histórico, como se os lembretes tivessem sido atendidos. Depois disso, nenhuma execução nasce sozinha. Sem conexão salva, nada é semeado nem gravado.
* Duas situações da demonstração são plantadas ao semear: "Estrutura semanal" tem a última execução marcada como falha, e "Auditoria toda madrugada" fica sem execuções, e por isso aparece atrasada. `oryntSimulacao.restaurarBackup()` volta ao início. Com o tempo, os outros também atrasam, porque nada roda sozinho: é o comportamento certo.
* Uma execução leva 24 segundos de relógio (14 em Só estrutura), e a situação, a etapa e os objetos são calculados na leitura (`paraDTO`). A duração mostrada é a do relógio; o tamanho é o estimado pela seleção.
* `falharBackups()` faz os próximos backups falharem aos 60%; os cenários de conexão (`cenario('SENHA_INCORRETA')`...) fazem falhar logo na conexão. O flag é lido quando o `POST` é atendido, não quando o botão é clicado.

## Armadilhas

* `agendamentoAtrasado` só cobra ocorrências depois de `vigenteDesde` e com uma hora de folga. Ativar e editar um agendamento movem `vigenteDesde`; sem isso, reativar acusaria atraso na hora.
* No tipo Só dados entram apenas tabelas e sequências. Ao trocar de tipo, `ajustarSelecaoAoTipo` tira da seleção o que não vale mais. A API confere de novo (`objetosAceitosDaSelecao`).
* Marcar um grupo com a busca ativa marca todo o grupo, enquanto "Marcar todos" marca só o que a busca está mostrando.
* `ProvedorBackupLocal` importa o `DetalheAcompanhamento`, então salvar qualquer arquivo de `componentes/backup/` (até um CSS) com a tela aberta pode disparar "useBackupLocal precisa estar dentro de" no hot reload: recarregue antes de tratar como bug. Com um backup rodando ou um arquivo para baixar, recarregar abre o diálogo do `beforeunload`.
* Ao verificar pela extensão do Chrome: o diálogo do `beforeunload` trava a extensão, então dispense as linhas do cartão antes de navegar, ou registre antes `window.addEventListener('beforeunload', (e) => e.stopImmediatePropagation(), true)`. O seletor de pasta é nativo e também trava: troque `window.showDirectoryPicker` por uma função que devolve uma pasta de `navigator.storage.getDirectory()`, que é um `FileSystemDirectoryHandle` de verdade e deixa conferir o arquivo gravado.
* Conferido no Chrome em 30 de outubro de 2026, com o cartão: em 1920px, o fluxo inteiro no tema escuro (andamento, recolhido, dois backups, baixar, falha, cancelar, lembrete) e dois backups no tema claro; em iframes, 320 e 390px no tema escuro. A gravação na pasta foi conferida antes, com a barra antiga, com um `FileSystemDirectoryHandle` do armazenamento privado, não com o seletor nativo, que a extensão não opera.
