import type { BloqueioDTO, EstadoSessao, EsperaDTO, ListaSessoesDTO, SessaoDTO, TipoProcesso } from '@/modelos/sessoes';
import { consultasFicticias, consultasSecundarias } from './consultasFicticias';
import { PAPEL_DO_RESTO_DAS_SESSOES, gerarPapeis } from './papeis';
import { LIMITE_CONEXOES, sorteio } from './series';

export const BANCO_DE_MANUTENCAO = 'postgres';

const MS_POR_SEGUNDO = 1000;
const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 86_400_000;
const DIAS_DESDE_O_INICIO_DO_SERVIDOR = 12;
const MINUTOS_DO_EPISODIO_DE_BLOQUEIO = 20;
const MINUTOS_DA_CONSULTA_LONGA = 10;
const MINUTOS_DA_TRANSACAO_ESQUECIDA = 60;
const ENDERECO_DO_ORYNT = '10.0.0.5';

const consultasDaLoja = [
  'q-usuarios-email',
  'q-pedidos-cliente',
  'q-produtos-busca',
  'q-produtos-categoria',
  'q-sessoes-token',
  'q-usuarios-id',
  'q-clientes-id',
  'q-pedidos-id',
  'q-itens-do-pedido',
  'q-produtos-id',
  'q-categorias-ativas',
  'q-estoque-produto',
  'q-carrinho-usuario',
  'q-carrinho-item-novo',
  'q-pedido-novo',
  'q-pagamento-novo',
  'q-cupom-codigo',
  'q-avaliacoes-produto',
  'q-favoritos-usuario',
  'q-notificacoes-nao-lidas',
];

const enderecosDaApi = ['10.0.1.11', '10.0.1.12', '10.0.1.13', '10.0.1.14'];

const sqlPorId = new Map([...consultasFicticias, ...consultasSecundarias].map((consulta) => [consulta.id, consulta.sql]));

function sqlDe(id: string): string {
  return sqlPorId.get(id) ?? '';
}

interface ConexaoSimulada {
  usuario: string;
  banco: string;
  conectadaEm: string;
}

interface SessaoEsbocada {
  chave: string;
  tipo?: TipoProcesso;
  processo?: string;
  papel: string | null;
  banco?: string | null;
  aplicacao: string | null;
  endereco: string | null;
  iniciadaEm: Date;
  transacaoDesde?: Date | null;
  consultaDesde?: Date | null;
  estadoDesde?: Date | null;
  estado: EstadoSessao | null;
  espera?: EsperaDTO | null;
  consulta?: string | null;
  consultaId?: string | null;
  bloqueadaPor?: string[];
  bloqueios?: BloqueioDTO[];
  doOrynt?: boolean;
}

function inicioDaJanela(agora: Date, minutos: number): Date {
  const meiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const tamanho = minutos * MS_POR_MINUTO;
  return new Date(meiaNoite + Math.floor((agora.getTime() - meiaNoite) / tamanho) * tamanho);
}

function antes(instante: Date, milissegundos: number): Date {
  return new Date(instante.getTime() - milissegundos);
}

function ciclo(agora: Date, segundos: number, deslocamento = 0): number {
  const periodo = segundos * MS_POR_SEGUNDO;
  return (((agora.getTime() + deslocamento * MS_POR_SEGUNDO) % periodo) + periodo) % periodo;
}

function sementeDoTexto(texto: string): number {
  let valor = 0;
  for (const caractere of texto) valor = (Math.imul(valor, 31) + caractere.charCodeAt(0)) | 0;
  return valor;
}

function inicioDoServidor(agora: Date): Date {
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - DIAS_DESDE_O_INICIO_DO_SERVIDOR, 4, 12, 37);
}

function processosDoServidor(agora: Date, banco: string): SessaoEsbocada[] {
  const inicio = inicioDoServidor(agora);
  const fixos: [processo: string, evento: string, tipo: TipoProcesso][] = [
    ['autovacuum launcher', 'AutoVacuumMain', 'AUTOVACUUM'],
    ['logical replication launcher', 'LogicalLauncherMain', 'SERVIDOR'],
    ['checkpointer', 'CheckpointerMain', 'SERVIDOR'],
    ['background writer', 'BgWriterMain', 'SERVIDOR'],
    ['walwriter', 'WalWriterMain', 'SERVIDOR'],
  ];
  const processos: SessaoEsbocada[] = fixos.map(([processo, evento, tipo]) => ({
    chave: `servidor-${processo}`,
    tipo,
    processo,
    papel: null,
    banco: null,
    aplicacao: null,
    endereco: null,
    iniciadaEm: inicio,
    estado: null,
    espera: { tipo: 'Activity', evento },
  }));

  const minuto = Math.floor(agora.getTime() / MS_POR_MINUTO);
  if (minuto % 7 < 3) {
    const comeco = new Date(Math.floor(agora.getTime() / (7 * MS_POR_MINUTO)) * 7 * MS_POR_MINUTO);
    processos.push({
      chave: `autovacuum-${comeco.getTime()}`,
      tipo: 'AUTOVACUUM',
      processo: 'autovacuum worker',
      papel: null,
      banco,
      aplicacao: null,
      endereco: null,
      iniciadaEm: comeco,
      transacaoDesde: comeco,
      consultaDesde: comeco,
      estadoDesde: comeco,
      estado: 'ATIVA',
      consulta: 'autovacuum: VACUUM ANALYZE public.sessoes',
      bloqueios: [{ tipo: 'RELACAO', alvo: 'sessoes', modo: 'ShareUpdateExclusiveLock', concedido: true }],
    });
  }

  return processos;
}

function episodioDeBloqueio(agora: Date): Record<'raiz' | 'primeira' | 'segunda' | 'daLoja', SessaoEsbocada> {
  const janela = inicioDaJanela(agora, MINUTOS_DO_EPISODIO_DE_BLOQUEIO);
  const xid = 48_211_000 + Math.floor(janela.getTime() / MS_POR_MINUTO) % 900;
  const transacaoDaRaiz = antes(janela, 6 * MS_POR_MINUTO);
  const consultaDaRaiz = antes(janela, 5 * MS_POR_MINUTO + 58 * MS_POR_SEGUNDO);
  const esperaDaPrimeira = antes(agora, 30 * MS_POR_SEGUNDO + ciclo(agora, 30));
  const esperaDaSegunda = antes(agora, ciclo(agora, 20, 6));
  const esperaDaLoja = antes(agora, ciclo(agora, 30, 13));
  const atualizacao = sqlDe('q-pedido-status');
  const linha = 'pedidos (linha 4.812.077)';

  return {
    raiz: {
      chave: `bloqueio-raiz-${janela.getTime()}`,
      papel: PAPEL_DO_RESTO_DAS_SESSOES,
      aplicacao: 'loja-admin',
      endereco: '10.0.2.20',
      iniciadaEm: antes(janela, 3 * MS_POR_HORA + 12 * MS_POR_MINUTO),
      transacaoDesde: transacaoDaRaiz,
      consultaDesde: consultaDaRaiz,
      estadoDesde: new Date(consultaDaRaiz.getTime() + 840),
      estado: 'OCIOSA_EM_TRANSACAO',
      espera: { tipo: 'Client', evento: 'ClientRead' },
      consulta: atualizacao,
      consultaId: 'q-pedido-status',
      bloqueios: [
        { tipo: 'RELACAO', alvo: 'pedidos', modo: 'RowExclusiveLock', concedido: true },
        { tipo: 'TRANSACAO', alvo: `xid ${xid}`, modo: 'ExclusiveLock', concedido: true },
      ],
    },
    primeira: {
      chave: 'fila-pedidos-1',
      papel: 'fila_pedidos',
      aplicacao: 'fila-pedidos',
      endereco: '10.0.4.21',
      iniciadaEm: antes(janela, 9 * MS_POR_HORA + 41 * MS_POR_MINUTO),
      transacaoDesde: esperaDaPrimeira,
      consultaDesde: esperaDaPrimeira,
      estadoDesde: esperaDaPrimeira,
      estado: 'ATIVA',
      espera: { tipo: 'Lock', evento: 'transactionid' },
      consulta: atualizacao,
      consultaId: 'q-pedido-status',
      bloqueadaPor: [`bloqueio-raiz-${janela.getTime()}`],
      bloqueios: [
        { tipo: 'RELACAO', alvo: 'pedidos', modo: 'RowExclusiveLock', concedido: true },
        { tipo: 'TUPLA', alvo: linha, modo: 'ExclusiveLock', concedido: true },
        { tipo: 'TRANSACAO', alvo: `xid ${xid}`, modo: 'ShareLock', concedido: false },
      ],
    },
    segunda: {
      chave: 'fila-pedidos-2',
      papel: 'fila_pedidos',
      aplicacao: 'fila-pedidos',
      endereco: '10.0.4.22',
      iniciadaEm: antes(janela, 9 * MS_POR_HORA + 41 * MS_POR_MINUTO),
      transacaoDesde: esperaDaSegunda,
      consultaDesde: esperaDaSegunda,
      estadoDesde: esperaDaSegunda,
      estado: 'ATIVA',
      espera: { tipo: 'Lock', evento: 'tuple' },
      consulta: atualizacao,
      consultaId: 'q-pedido-status',
      bloqueadaPor: ['fila-pedidos-1'],
      bloqueios: [
        { tipo: 'RELACAO', alvo: 'pedidos', modo: 'RowExclusiveLock', concedido: true },
        { tipo: 'TUPLA', alvo: linha, modo: 'ExclusiveLock', concedido: false },
      ],
    },
    daLoja: {
      chave: 'bloqueio-loja',
      papel: PAPEL_DO_RESTO_DAS_SESSOES,
      aplicacao: 'loja-api',
      endereco: '10.0.1.12',
      iniciadaEm: antes(janela, 47 * MS_POR_MINUTO),
      transacaoDesde: esperaDaLoja,
      consultaDesde: esperaDaLoja,
      estadoDesde: esperaDaLoja,
      estado: 'ATIVA',
      espera: { tipo: 'Lock', evento: 'tuple' },
      consulta: atualizacao,
      consultaId: 'q-pedido-status',
      bloqueadaPor: ['fila-pedidos-1'],
      bloqueios: [
        { tipo: 'RELACAO', alvo: 'pedidos', modo: 'RowExclusiveLock', concedido: true },
        { tipo: 'TUPLA', alvo: linha, modo: 'ExclusiveLock', concedido: false },
      ],
    },
  };
}

function sessoesDaAnalise(agora: Date): SessaoEsbocada[] {
  const janelaLonga = inicioDaJanela(agora, MINUTOS_DA_CONSULTA_LONGA);
  const inicioDaLonga = antes(janelaLonga, 5 * MS_POR_MINUTO + 30 * MS_POR_SEGUNDO);
  const janelaEsquecida = inicioDaJanela(agora, MINUTOS_DA_TRANSACAO_ESQUECIDA);
  const consultaEsquecida = antes(janelaEsquecida, 12 * MS_POR_MINUTO);

  return [
    {
      chave: `analise-longa-${janelaLonga.getTime()}`,
      papel: 'loja_analise',
      aplicacao: 'Metabase',
      endereco: '10.0.5.40',
      iniciadaEm: antes(janelaLonga, 2 * MS_POR_HORA + 4 * MS_POR_MINUTO),
      transacaoDesde: inicioDaLonga,
      consultaDesde: inicioDaLonga,
      estadoDesde: inicioDaLonga,
      estado: 'ATIVA',
      espera: { tipo: 'IO', evento: 'DataFileRead' },
      consulta:
        'SELECT date_trunc($1, criado_em) AS dia, sum(total) AS faturamento, count(*) AS pedidos FROM pedidos WHERE criado_em >= $2 GROUP BY 1 ORDER BY 1',
      bloqueios: [{ tipo: 'RELACAO', alvo: 'pedidos', modo: 'AccessShareLock', concedido: true }],
    },
    {
      chave: `analise-esquecida-${janelaEsquecida.getTime()}`,
      papel: 'loja_analise',
      aplicacao: 'Metabase',
      endereco: '10.0.5.40',
      iniciadaEm: antes(janelaEsquecida, 58 * MS_POR_MINUTO),
      transacaoDesde: antes(janelaEsquecida, 32 * MS_POR_MINUTO),
      consultaDesde: consultaEsquecida,
      estadoDesde: new Date(consultaEsquecida.getTime() + 780),
      estado: 'OCIOSA_EM_TRANSACAO',
      espera: { tipo: 'Client', evento: 'ClientRead' },
      consulta: 'SELECT dia, total_pedidos, faturamento FROM relatorios.vendas_diarias WHERE dia >= $1 ORDER BY dia',
      bloqueios: [{ tipo: 'RELACAO', alvo: 'relatorios.vendas_diarias', modo: 'AccessShareLock', concedido: true }],
    },
  ];
}

function sessaoOciosa(
  chave: string,
  papel: string,
  aplicacao: string,
  endereco: string,
  agora: Date,
  consultaId: string,
  segundos: number,
  banco?: string,
): SessaoEsbocada {
  const ultima = antes(agora, ciclo(agora, segundos, sementeDoTexto(chave) % segundos) + 1200);
  return {
    chave,
    papel,
    banco,
    aplicacao,
    endereco,
    iniciadaEm: antes(inicioDaJanela(agora, 240), (sementeDoTexto(chave) % 180) * MS_POR_MINUTO + 3 * MS_POR_HORA),
    consultaDesde: ultima,
    estadoDesde: new Date(ultima.getTime() + 3),
    estado: 'OCIOSA',
    espera: { tipo: 'Client', evento: 'ClientRead' },
    consulta: sqlDe(consultaId) || consultaId,
    consultaId: sqlPorId.has(consultaId) ? consultaId : null,
  };
}

function sessaoDoPool(indice: number, agora: Date): SessaoEsbocada {
  const minuto = Math.floor(agora.getTime() / MS_POR_MINUTO);
  const sorte = sorteio(minuto * 97 + indice * 13);
  const consultaId = consultasDaLoja[Math.floor(sorteio(minuto * 31 + indice) * consultasDaLoja.length)] ?? 'q-usuarios-id';
  const doAdmin = indice % 7 === 6;
  const base = {
    chave: `pool-${indice}`,
    papel: PAPEL_DO_RESTO_DAS_SESSOES,
    aplicacao: doAdmin ? 'loja-admin' : 'loja-api',
    endereco: doAdmin ? '10.0.2.20' : (enderecosDaApi[indice % enderecosDaApi.length] ?? '10.0.1.11'),
    iniciadaEm: antes(inicioDaJanela(agora, 240), ((indice * 37) % 200) * MS_POR_MINUTO + MS_POR_HORA),
    consulta: sqlDe(consultaId),
    consultaId,
  };

  if (sorte < 0.68) {
    const parado = Math.floor(sorteio(minuto * 53 + indice) * (indice % 3 === 0 ? 1100 : 40)) * MS_POR_SEGUNDO + 400;
    const ultima = antes(agora, parado);
    return {
      ...base,
      consultaDesde: ultima,
      estadoDesde: new Date(ultima.getTime() + 2),
      estado: 'OCIOSA',
      espera: { tipo: 'Client', evento: 'ClientRead' },
    };
  }
  if (sorte < 0.94) {
    const inicio = antes(agora, 3 + Math.floor(sorteio(minuto * 71 + indice) * 900));
    return {
      ...base,
      transacaoDesde: inicio,
      consultaDesde: inicio,
      estadoDesde: inicio,
      estado: 'ATIVA',
      espera: sorte < 0.8 ? null : { tipo: 'IO', evento: 'DataFileRead' },
    };
  }
  const transacao = antes(agora, 1400);
  return {
    ...base,
    transacaoDesde: transacao,
    consultaDesde: antes(agora, 900),
    estadoDesde: antes(agora, 880),
    estado: 'OCIOSA_EM_TRANSACAO',
    espera: { tipo: 'Client', evento: 'ClientRead' },
  };
}

function sessaoDoOrynt(papel: string, conexao: ConexaoSimulada, agora: Date): SessaoEsbocada {
  const conectada = new Date(conexao.conectadaEm);
  const inicio = Number.isNaN(conectada.getTime()) || conectada > agora ? antes(agora, 2 * MS_POR_MINUTO) : conectada;
  const consulta = antes(agora, 4);
  return {
    chave: 'orynt',
    papel,
    aplicacao: 'Orynt',
    endereco: ENDERECO_DO_ORYNT,
    iniciadaEm: inicio,
    transacaoDesde: consulta,
    consultaDesde: consulta,
    estadoDesde: consulta,
    estado: 'ATIVA',
    consulta: 'SELECT pid, usename, datname, application_name, client_addr, state, wait_event_type, wait_event, query FROM pg_stat_activity',
    doOrynt: true,
  };
}

function sessaoDaReplicacao(agora: Date): SessaoEsbocada {
  const inicio = antes(inicioDoServidor(agora), -2 * MS_POR_MINUTO);
  return {
    chave: 'replicacao',
    tipo: 'REPLICACAO',
    processo: 'walsender',
    papel: 'replicador',
    banco: null,
    aplicacao: 'walreceiver',
    endereco: '10.0.9.2',
    iniciadaEm: inicio,
    consultaDesde: inicio,
    estadoDesde: inicio,
    estado: 'ATIVA',
    espera: { tipo: 'Activity', evento: 'WalSenderMain' },
    consulta: 'START_REPLICATION SLOT replica_leitura 1A/3F000000 TIMELINE 1',
  };
}

function sessoesFixas(papel: string, agora: Date): SessaoEsbocada[] {
  const bloqueio = episodioDeBloqueio(agora);
  if (papel === 'fila_pedidos') {
    return [
      bloqueio.primeira,
      bloqueio.segunda,
      sessaoOciosa('fila-pedidos-3', 'fila_pedidos', 'fila-pedidos', '10.0.4.21', agora, 'q-pedido-status', 9),
      sessaoOciosa('fila-pedidos-4', 'fila_pedidos', 'fila-pedidos', '10.0.4.22', agora, 'q-pedido-status', 11),
    ];
  }
  if (papel === 'loja_analise') return sessoesDaAnalise(agora);
  if (papel === 'auditoria_app') {
    return [sessaoOciosa('auditoria-1', 'auditoria_app', 'auditoria-worker', '10.0.3.15', agora, 'q-auditoria-nova', 45)];
  }
  if (papel === 'suporte_dba') {
    const janela = inicioDaJanela(agora, MINUTOS_DA_TRANSACAO_ESQUECIDA);
    const ultima = antes(janela, 25 * MS_POR_MINUTO);
    return [
      {
        chave: 'suporte-psql',
        papel,
        banco: BANCO_DE_MANUTENCAO,
        aplicacao: 'psql',
        endereco: '10.0.8.12',
        iniciadaEm: antes(janela, 41 * MS_POR_MINUTO),
        consultaDesde: ultima,
        estadoDesde: new Date(ultima.getTime() + 12),
        estado: 'OCIOSA',
        espera: { tipo: 'Client', evento: 'ClientRead' },
        consulta: 'SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC',
      },
    ];
  }
  if (papel === 'replicador') return [sessaoDaReplicacao(agora)];
  if (papel === PAPEL_DO_RESTO_DAS_SESSOES) return [bloqueio.raiz, bloqueio.daLoja];
  return [];
}

function sessoesDoPapel(papel: string, quantidade: number, papelDaConexao: string, conexao: ConexaoSimulada, agora: Date): SessaoEsbocada[] {
  const fixas = sessoesFixas(papel, agora);
  const doOrynt = papel === papelDaConexao ? [sessaoDoOrynt(papel, conexao, agora)] : [];
  const ordenadas = papel === PAPEL_DO_RESTO_DAS_SESSOES ? [...fixas, ...doOrynt] : [...doOrynt, ...fixas];
  const doPool =
    papel === PAPEL_DO_RESTO_DAS_SESSOES
      ? Array.from({ length: Math.max(0, quantidade - ordenadas.length) }, (_, indice) => sessaoDoPool(indice, agora))
      : [];
  return [...ordenadas, ...doPool].slice(0, quantidade);
}

function pidsDistintos(esbocos: SessaoEsbocada[], agora: Date): Map<string, number> {
  const dia = Math.floor(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime() / MS_POR_DIA);
  const usados = new Set<number>();
  const pids = new Map<string, number>();
  for (const esboco of esbocos) {
    const base = esboco.tipo === 'SERVIDOR' || esboco.tipo === 'AUTOVACUUM' ? 600 : 1200;
    let pid = base + Math.floor(sorteio(sementeDoTexto(esboco.chave) + dia * 7) * (esboco.tipo === 'SERVIDOR' ? 400 : 63_000));
    while (usados.has(pid)) pid += 1;
    usados.add(pid);
    pids.set(esboco.chave, pid);
  }
  return pids;
}

function materializar(esboco: SessaoEsbocada, pids: Map<string, number>, bancoDaConexao: string): SessaoDTO {
  const tipo = esboco.tipo ?? 'CLIENTE';
  return {
    pid: pids.get(esboco.chave) ?? 0,
    tipo,
    processo: esboco.processo ?? 'client backend',
    papel: esboco.papel,
    banco: esboco.banco === undefined ? bancoDaConexao : esboco.banco,
    aplicacao: esboco.aplicacao,
    endereco: esboco.endereco,
    iniciadaEm: esboco.iniciadaEm.toISOString(),
    transacaoDesde: esboco.transacaoDesde?.toISOString() ?? null,
    consultaDesde: esboco.consultaDesde?.toISOString() ?? null,
    estadoDesde: esboco.estadoDesde?.toISOString() ?? null,
    estado: esboco.estado,
    espera: esboco.espera ?? null,
    consulta: esboco.consulta ?? null,
    consultaId: esboco.consultaId ?? null,
    bloqueadaPor: (esboco.bloqueadaPor ?? []).flatMap((chave) => pids.get(chave) ?? []),
    bloqueios: esboco.bloqueios ?? [],
    doOrynt: esboco.doOrynt ?? false,
  };
}

export function gerarSessoes(agora: Date, conexao: ConexaoSimulada, vazio = false): ListaSessoesDTO {
  const geradoEm = agora.toISOString();
  const papeis = gerarPapeis(agora, conexao.usuario, false, false);
  const base = {
    geradoEm,
    bancoDaConexao: conexao.banco,
    limiteConexoes: LIMITE_CONEXOES,
    limiteOciosoEmTransacao: papeis.limiteOciosoEmTransacao,
  };
  if (vazio) return { ...base, papeis: [], sessoes: [] };

  const esbocos = papeis.papeis.flatMap((papel) =>
    papel.sessoes > 0 ? sessoesDoPapel(papel.nome, papel.sessoes, conexao.usuario, conexao, agora) : [],
  );
  const presentes = new Set(esbocos.map((esboco) => esboco.chave));
  const coerentes = esbocos.map((esboco) => ({
    ...esboco,
    bloqueadaPor: (esboco.bloqueadaPor ?? []).filter((chave) => presentes.has(chave)),
  }));
  const todos = [...coerentes, ...processosDoServidor(agora, conexao.banco)];
  const pids = pidsDistintos(todos, agora);
  const sessoes = todos.map((esboco) => materializar(esboco, pids, conexao.banco));

  return {
    ...base,
    papeis: papeis.papeis
      .filter((papel) => papel.sessoes > 0)
      .map((papel) => ({
        nome: papel.nome,
        limiteConexoes: papel.limiteConexoes,
        configuracoes: papel.configuracoes,
        ociosasEmTransacao30Dias: papel.ociosasEmTransacao30Dias,
      })),
    sessoes,
  };
}
