import { describe, expect, it } from 'vitest';
import type { FiltrosSessoes, SessaoDTO } from '@/modelos/sessoes';
import {
  BANCO_DA_CONEXAO,
  aplicarMudancaSessoes,
  avisosDaSessao,
  bloqueioEsperado,
  bloqueiosSegurados,
  cadeiasDeBloqueio,
  comandosDaSessao,
  contarPorEstado,
  distribuirSessoes,
  estadoExibido,
  filtrarSessoes,
  filtrosSessoesIniciais,
  formatarTempoDecorrido,
  lerFiltrosSessoes,
  linhaDoTempo,
  loteDeComandosDasSessoes,
  pontosDeAtencaoSessoes,
  raizDoBloqueio,
  resumirCadeia,
  resumirSessoes,
  situacoesDaSessao,
  sugestaoDeTempoOcioso,
  temFiltroAtivoSessoes,
} from './sessoes';
import type { ContextoDasSessoes } from './sessoes';

const geradoEm = '2026-10-19T18:00:00.000Z';
const contexto: ContextoDasSessoes = { geradoEm, bancoDaConexao: 'loja' };

function segundosAntes(segundos: number): string {
  return new Date(new Date(geradoEm).getTime() - segundos * 1000).toISOString();
}

function criarSessao(pid: number, campos: Partial<SessaoDTO> = {}): SessaoDTO {
  return {
    pid,
    tipo: 'CLIENTE',
    processo: 'client backend',
    papel: 'loja_app',
    banco: 'loja',
    aplicacao: 'loja-api',
    endereco: '10.0.1.11',
    iniciadaEm: segundosAntes(3600),
    transacaoDesde: null,
    consultaDesde: segundosAntes(20),
    estadoDesde: segundosAntes(20),
    estado: 'OCIOSA',
    espera: { tipo: 'Client', evento: 'ClientRead' },
    consulta: 'SELECT * FROM pedidos WHERE id = $1',
    consultaId: 'q-pedidos-id',
    bloqueadaPor: [],
    bloqueios: [],
    doOrynt: false,
    ...campos,
  };
}

const raiz = criarSessao(100, {
  estado: 'OCIOSA_EM_TRANSACAO',
  transacaoDesde: segundosAntes(400),
  consultaDesde: segundosAntes(380),
  estadoDesde: segundosAntes(379),
  consulta: 'UPDATE pedidos SET status = $1 WHERE id = $2',
});
const primeira = criarSessao(200, {
  papel: 'fila_pedidos',
  estado: 'ATIVA',
  espera: { tipo: 'Lock', evento: 'transactionid' },
  transacaoDesde: segundosAntes(45),
  consultaDesde: segundosAntes(45),
  estadoDesde: segundosAntes(45),
  bloqueadaPor: [100],
});
const segunda = criarSessao(300, {
  estado: 'ATIVA',
  espera: { tipo: 'Lock', evento: 'tuple' },
  transacaoDesde: segundosAntes(12),
  consultaDesde: segundosAntes(12),
  estadoDesde: segundosAntes(12),
  bloqueadaPor: [200],
});
const longa = criarSessao(400, {
  papel: 'loja_analise',
  aplicacao: 'Metabase',
  endereco: '10.0.5.40',
  estado: 'ATIVA',
  espera: { tipo: 'IO', evento: 'DataFileRead' },
  transacaoDesde: segundosAntes(2000),
  consultaDesde: segundosAntes(400),
  estadoDesde: segundosAntes(400),
});
const doOrynt = criarSessao(500, {
  papel: 'postgres',
  aplicacao: 'Orynt',
  estado: 'ATIVA',
  espera: null,
  transacaoDesde: segundosAntes(4000),
  consultaDesde: segundosAntes(4000),
  estadoDesde: segundosAntes(4000),
  doOrynt: true,
});
const ociosa = criarSessao(600, { endereco: null, aplicacao: null });
const daManutencao = criarSessao(700, { papel: 'suporte_dba', banco: 'postgres', aplicacao: 'psql' });
const checkpointer = criarSessao(800, {
  tipo: 'SERVIDOR',
  processo: 'checkpointer',
  papel: null,
  banco: null,
  aplicacao: null,
  endereco: null,
  estado: null,
  consulta: null,
  consultaId: null,
});
const sessoes = [raiz, primeira, segunda, longa, doOrynt, ociosa, daManutencao, checkpointer];

function filtros(campos: Partial<FiltrosSessoes> = {}): FiltrosSessoes {
  return { ...filtrosSessoesIniciais, ...campos };
}

describe('filtros das sessões', () => {
  it('lê o estado do histórico e troca cada campo inválido pelo padrão', () => {
    expect(lerFiltrosSessoes(null)).toEqual(filtrosSessoesIniciais);
    expect(lerFiltrosSessoes({ banco: null, estado: 'ESPERANDO', papel: 'loja_app', ordenacao: 'PID' })).toMatchObject({
      banco: null,
      estado: 'ESPERANDO',
      papel: 'loja_app',
      ordenacao: 'PID',
      direcao: 'ASC',
    });
    expect(lerFiltrosSessoes({ banco: 'drop table;', estado: 'X', papel: 1, pagina: -2 })).toMatchObject({
      banco: BANCO_DA_CONEXAO,
      estado: null,
      papel: null,
      pagina: 1,
    });
  });

  it('volta à primeira página em qualquer mudança, menos a página e a atualização automática', () => {
    const naTerceira = filtros({ pagina: 3 });
    expect(aplicarMudancaSessoes(naTerceira, { automatica: true }).pagina).toBe(3);
    expect(aplicarMudancaSessoes(naTerceira, { estado: 'OCIOSA' }).pagina).toBe(1);
    expect(aplicarMudancaSessoes(naTerceira, { processos: true }).pagina).toBe(1);
  });

  it('não conta o banco da conexão como filtro ativo', () => {
    expect(temFiltroAtivoSessoes(filtros())).toBe(false);
    expect(temFiltroAtivoSessoes(filtros({ banco: null }))).toBe(true);
  });

  it('mostra só as sessões de cliente do banco da conexão, a menos que se peça outra coisa', () => {
    expect(filtrarSessoes(sessoes, filtros(), contexto).map((sessao) => sessao.pid)).not.toContain(700);
    expect(filtrarSessoes(sessoes, filtros(), contexto).map((sessao) => sessao.pid)).not.toContain(800);
    expect(filtrarSessoes(sessoes, filtros({ banco: null }), contexto).map((sessao) => sessao.pid)).toContain(700);
    expect(filtrarSessoes(sessoes, filtros({ processos: true }), contexto).map((sessao) => sessao.pid)).toContain(800);
  });

  it('busca no PID, no papel, na aplicação, no endereço e na consulta', () => {
    const buscar = (busca: string) => filtrarSessoes(sessoes, filtros({ busca, banco: null }), contexto).map((sessao) => sessao.pid);
    expect(buscar('metabase')).toEqual([400]);
    expect(buscar('10.0.5')).toEqual([400]);
    expect(buscar('600')).toEqual([600]);
    expect(buscar('update pedidos')).toEqual([100]);
  });

  it('ordena pela urgência e, depois, pelo maior tempo no estado', () => {
    expect(filtrarSessoes(sessoes, filtros(), contexto).map((sessao) => sessao.pid)).toEqual([100, 200, 400, 600, 300, 500]);
  });

  it('resume a contagem com e sem filtro', () => {
    expect(resumirSessoes(6, 6, filtros())).toBe('6 sessões');
    expect(resumirSessoes(6, 2, filtros({ estado: 'ATIVA' }))).toBe('2 de 6 sessões');
    expect(resumirSessoes(25, 25, filtros({ processos: true }))).toBe('25 sessões e processos');
  });
});

describe('situações das sessões', () => {
  it('aponta cada situação a partir do limite dela', () => {
    expect(situacoesDaSessao(raiz, sessoes, contexto)).toEqual(['BLOQUEANDO', 'OCIOSA_EM_TRANSACAO']);
    expect(situacoesDaSessao(primeira, sessoes, contexto)).toEqual(['ESPERANDO_BLOQUEIO']);
    expect(situacoesDaSessao(segunda, sessoes, contexto)).toEqual([]);
    expect(situacoesDaSessao(longa, sessoes, contexto)).toEqual(['CONSULTA_LONGA', 'TRANSACAO_LONGA']);
  });

  it('nunca aponta a sessão do Orynt nem um processo do servidor', () => {
    expect(situacoesDaSessao(doOrynt, sessoes, contexto)).toEqual([]);
    expect(situacoesDaSessao(checkpointer, sessoes, contexto)).toEqual([]);
    expect(comandosDaSessao(doOrynt, sessoes)).toEqual([]);
  });

  it('separa a espera por bloqueio do estado ativo', () => {
    expect(estadoExibido(primeira)).toBe('ESPERANDO');
    expect(estadoExibido(longa)).toBe('ATIVA');
    expect(estadoExibido(raiz)).toBe('OCIOSA_EM_TRANSACAO');
    expect(contarPorEstado(sessoes)).toMatchObject({ ATIVA: 2, ESPERANDO: 2, OCIOSA_EM_TRANSACAO: 1, OCIOSA: 2 });
  });

  it('monta a cadeia a partir da raiz e encontra a raiz de quem espera', () => {
    const [cadeia] = cadeiasDeBloqueio(sessoes);
    expect(cadeia?.sessao.pid).toBe(100);
    expect(cadeia?.total).toBe(2);
    expect(cadeia?.filhos.map((filho) => filho.sessao.pid)).toEqual([200]);
    expect(cadeia?.filhos[0]?.filhos.map((filho) => filho.sessao.pid)).toEqual([300]);
    expect(raizDoBloqueio(segunda, sessoes)?.pid).toBe(100);
  });

  it('resume a cadeia pelos níveis e pela espera mais longa, e separa o bloqueio seguro do esperado', () => {
    const [cadeia] = cadeiasDeBloqueio(sessoes);
    expect(cadeia && resumirCadeia(cadeia, contexto)).toEqual({ niveis: 2, maiorEsperaMs: 45_000 });
    const comBloqueios = criarSessao(400, {
      bloqueios: [
        { tipo: 'RELACAO', alvo: 'pedidos', modo: 'RowExclusiveLock', concedido: true },
        { tipo: 'TUPLA', alvo: '(12,4)', modo: 'ExclusiveLock', concedido: false },
      ],
    });
    expect(bloqueiosSegurados(comBloqueios).map((bloqueio) => bloqueio.modo)).toEqual(['RowExclusiveLock']);
    expect(bloqueioEsperado(comBloqueios)?.alvo).toBe('(12,4)');
    expect(bloqueioEsperado(raiz)).toBeNull();
  });

  it('escreve as frases com os tempos medidos a partir do retrato', () => {
    const [bloqueio] = avisosDaSessao(raiz, sessoes, contexto);
    expect(bloqueio?.texto).toBe(
      'Está parada há 6 min 19 s com uma transação aberta e segura o bloqueio que 2 sessões esperam. A que espera há mais tempo está parada há 45 s. Enquanto a aplicação não confirmar ou desfizer a transação, nenhuma delas anda.',
    );
    expect(avisosDaSessao(primeira, sessoes, contexto)[0]?.texto).toBe(
      'Espera há 45 s um bloqueio que a sessão 100 (loja_app) segura. Resolver a sessão 100 libera esta.',
    );
  });

  it('cita cada sessão uma vez, na situação mais urgente dela', () => {
    const lista = { geradoEm, bancoDaConexao: 'loja', limiteConexoes: 100, limiteOciosoEmTransacao: null, papeis: [], sessoes };
    const citadas = pontosDeAtencaoSessoes(lista, contexto).map((ponto) => [ponto.tipo, ponto.alvo]);
    expect(citadas).toEqual([
      ['BLOQUEANDO', { tipo: 'SESSAO', pid: 100 }],
      ['ESPERANDO_BLOQUEIO', { tipo: 'SESSAO', pid: 200 }],
      ['CONSULTA_LONGA', { tipo: 'SESSAO', pid: 400 }],
    ]);
  });

  it('agrupa a partir de três sessões na mesma situação', () => {
    const muitas = [100, 101, 102].map((pid) => criarSessao(pid, { estado: 'OCIOSA_EM_TRANSACAO', estadoDesde: segundosAntes(600) }));
    const lista = { geradoEm, bancoDaConexao: 'loja', limiteConexoes: 100, limiteOciosoEmTransacao: null, papeis: [], sessoes: muitas };
    expect(pontosDeAtencaoSessoes(lista, contexto)).toMatchObject([
      { tipo: 'OCIOSA_EM_TRANSACAO', titulo: '3 transações paradas', alvo: { tipo: 'FILTRO' } },
    ]);
  });
});

describe('comandos das sessões', () => {
  it('cancela a consulta em andamento e encerra a sessão parada', () => {
    expect(comandosDaSessao(longa, sessoes).map((comando) => comando.comando)).toEqual([
      'SELECT pg_cancel_backend(400);',
      'SELECT pg_terminate_backend(400);',
    ]);
    expect(comandosDaSessao(raiz, sessoes).map((comando) => comando.comando)).toEqual(['SELECT pg_terminate_backend(100);']);
    expect(comandosDaSessao(raiz, sessoes)[0]?.explicacao).toContain('Libera as 2 sessões que esperam por ela.');
  });

  it('copia em lote o comando de cada sessão da situação', () => {
    expect(loteDeComandosDasSessoes(sessoes, 'ESPERANDO_BLOQUEIO', sessoes, contexto)).toMatchObject({
      comandos: ['SELECT pg_cancel_backend(200);'],
      rotulo: 'Copiar o comando',
    });
    expect(loteDeComandosDasSessoes(sessoes, 'BLOQUEANDO', sessoes, contexto)?.comandos).toEqual([
      'SELECT pg_terminate_backend(100);',
    ]);
    expect(loteDeComandosDasSessoes(sessoes, 'CONSULTA_LONGA', sessoes, contexto)?.rotulo).toBe('Copiar o comando');
  });

  it('sugere o tempo ocioso só quando o papel repete e nada o limita', () => {
    const papel = { nome: 'loja_analise', configuracoes: ['work_mem=64MB'], ociosasEmTransacao30Dias: 9 };
    expect(sugestaoDeTempoOcioso(papel, null)?.comando).toBe(
      "ALTER ROLE loja_analise SET idle_in_transaction_session_timeout = '5min';",
    );
    expect(sugestaoDeTempoOcioso({ ...papel, ociosasEmTransacao30Dias: 2 }, null)).toBeNull();
    expect(sugestaoDeTempoOcioso(papel, '10min')).toBeNull();
    expect(sugestaoDeTempoOcioso({ ...papel, configuracoes: ['idle_in_transaction_session_timeout=1min'] }, null)).toBeNull();
    expect(sugestaoDeTempoOcioso({ ...papel, nome: 'Relatórios' }, null)?.comando).toContain('ALTER ROLE "Relatórios"');
  });
});

describe('apresentação das sessões', () => {
  it('escreve o tempo decorrido em duas unidades no máximo', () => {
    expect(formatarTempoDecorrido(400)).toBe('menos de 1 s');
    expect(formatarTempoDecorrido(45_000)).toBe('45 s');
    expect(formatarTempoDecorrido(379_000)).toBe('6 min 19 s');
    expect(formatarTempoDecorrido(7_260_000)).toBe('2 h 1 min');
    expect(formatarTempoDecorrido(90_000_000)).toBe('1 d 1 h');
  });

  it('distribui as sessões de cliente por aplicação e por origem', () => {
    expect(distribuirSessoes(sessoes, 'APLICACAO').map((fatia) => [fatia.rotulo, fatia.quantidade])).toEqual([
      ['loja-api', 3],
      ['Metabase', 1],
      ['Orynt', 1],
      ['psql', 1],
      ['Sem nome de aplicação', 1],
    ]);
    expect(distribuirSessoes(sessoes, 'ORIGEM').find((fatia) => fatia.vazia)?.rotulo).toBe('Socket local');
  });

  it('monta a linha do tempo só com os marcos que existem', () => {
    expect(linhaDoTempo(ociosa, contexto).map((marco) => marco.chave)).toEqual(['SESSAO', 'CONSULTA', 'ESTADO']);
    expect(linhaDoTempo(raiz, contexto).map((marco) => marco.ha)).toEqual(['há 1 h', 'há 6 min 40 s', 'há 6 min 20 s', 'há 6 min 19 s']);
  });
});
