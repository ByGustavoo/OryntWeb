import { describe, expect, it } from 'vitest';
import type { ListaSessoesDTO, SessaoDTO } from '@/modelos/sessoes';
import {
  cadeiasDeBloqueio,
  contarConexoes,
  situacoesDaSessao,
  sugestoesDasSessoes,
} from '@/regras/sessoes';
import type { ContextoDasSessoes } from '@/regras/sessoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarPapeis } from './papeis';
import { conexoesNoInstante } from './series';
import { BANCO_DE_MANUTENCAO, gerarSessoes } from './sessoes';

const agora = new Date(2026, 9, 19, 15, 7, 23);
const conexao = { usuario: 'postgres', banco: 'loja', conectadaEm: new Date(2026, 9, 19, 14, 40).toISOString() };
const lista = gerarSessoes(agora, conexao);

function contextoDe(origem: ListaSessoesDTO): ContextoDasSessoes {
  return { geradoEm: origem.geradoEm, bancoDaConexao: origem.bancoDaConexao };
}

function situacoes(sessao: SessaoDTO, origem: ListaSessoesDTO = lista) {
  return situacoesDaSessao(sessao, origem.sessoes, contextoDe(origem));
}

function sessoesDe(papel: string, origem: ListaSessoesDTO = lista): SessaoDTO[] {
  return origem.sessoes.filter((sessao) => sessao.papel === papel);
}

const instantesDaSemana = Array.from({ length: 7 * 8 }, (_, indice) => new Date(2026, 9, 12, indice * 3, 17 + indice, 41));

describe('gerarSessoes', () => {
  it('soma nas conexões as conexões ativas do Dashboard e, por papel, as sessões de Papéis', () => {
    for (const instante of instantesDaSemana) {
      for (const usuario of ['postgres', 'loja_app', 'ana_dev', 'fila_pedidos']) {
        const origem = gerarSessoes(instante, { ...conexao, usuario });
        expect(contarConexoes(origem.sessoes)).toBe(conexoesNoInstante(instante));
        for (const papel of gerarPapeis(instante, usuario, false, false).papeis) {
          expect(sessoesDe(papel.nome, origem)).toHaveLength(papel.sessoes);
        }
      }
    }
  });

  it('marca uma única sessão como a do Orynt, do papel da conexão, sem nenhuma situação', () => {
    for (const usuario of ['postgres', 'loja_app', 'ana_dev']) {
      const origem = gerarSessoes(agora, { ...conexao, usuario });
      const doOrynt = origem.sessoes.filter((sessao) => sessao.doOrynt);
      expect(doOrynt).toHaveLength(1);
      expect(doOrynt[0]?.papel).toBe(usuario);
      expect(situacoes(doOrynt[0] as SessaoDTO, origem)).toEqual([]);
    }
  });

  it('usa PIDs distintos e bloqueios que apontam para sessões que existem', () => {
    for (const instante of instantesDaSemana) {
      const origem = gerarSessoes(instante, conexao);
      const pids = new Set(origem.sessoes.map((sessao) => sessao.pid));
      expect(pids.size).toBe(origem.sessoes.length);
      for (const sessao of origem.sessoes) {
        for (const pid of sessao.bloqueadaPor) expect(pids.has(pid)).toBe(true);
      }
    }
  });

  it('liga a consulta de cada sessão a uma consulta da lista de 30 dias, com o mesmo texto', () => {
    const consultas = new Map(gerarConsultasDetalhadas('ULTIMOS_30_DIAS', agora).map((consulta) => [consulta.id, consulta.sql]));
    for (const sessao of lista.sessoes) {
      if (sessao.consultaId === null) continue;
      expect(consultas.get(sessao.consultaId)).toBe(sessao.consulta);
    }
  });

  it('desenha a cadeia de bloqueio, a consulta longa e a transação esquecida em toda hora da semana', () => {
    for (const instante of instantesDaSemana) {
      const origem = gerarSessoes(instante, conexao);
      const contexto = contextoDe(origem);
      const cadeias = cadeiasDeBloqueio(origem.sessoes);
      expect(cadeias).toHaveLength(1);
      const [cadeia] = cadeias;
      expect(cadeia?.sessao.papel).toBe('loja_app');
      expect(cadeia?.sessao.estado).toBe('OCIOSA_EM_TRANSACAO');
      expect(cadeia?.total).toBe(3);
      expect(situacoesDaSessao(cadeia?.sessao as SessaoDTO, origem.sessoes, contexto)).toEqual([
        'BLOQUEANDO',
        'OCIOSA_EM_TRANSACAO',
      ]);

      const fila = sessoesDe('fila_pedidos', origem).map((sessao) => situacoesDaSessao(sessao, origem.sessoes, contexto));
      expect(fila).toEqual([['ESPERANDO_BLOQUEIO'], [], [], []]);

      const analise = sessoesDe('loja_analise', origem).map((sessao) => situacoesDaSessao(sessao, origem.sessoes, contexto));
      expect(analise).toEqual([['CONSULTA_LONGA'], ['OCIOSA_EM_TRANSACAO', 'TRANSACAO_LONGA']]);
    }
  });

  it('não aponta nenhuma outra sessão', () => {
    const contexto = contextoDe(lista);
    const apontadas = lista.sessoes.filter((sessao) => situacoesDaSessao(sessao, lista.sessoes, contexto).length > 0);
    expect(apontadas.map((sessao) => sessao.papel).sort()).toEqual([
      'fila_pedidos',
      'loja_analise',
      'loja_analise',
      'loja_app',
    ]);
  });

  it('sugere o tempo ocioso só para loja_analise', () => {
    expect(sugestoesDasSessoes(lista).map((sugestao) => sugestao.papel)).toEqual(['loja_analise']);
  });

  it('põe o suporte no banco de manutenção, a réplica fora de qualquer banco e os processos sem papel', () => {
    expect(sessoesDe('suporte_dba').map((sessao) => sessao.banco)).toEqual([BANCO_DE_MANUTENCAO]);
    expect(sessoesDe('replicador')).toMatchObject([{ tipo: 'REPLICACAO', banco: null }]);
    const processos = lista.sessoes.filter((sessao) => sessao.tipo === 'SERVIDOR' || sessao.tipo === 'AUTOVACUUM');
    expect(processos.length).toBeGreaterThanOrEqual(5);
    expect(processos.every((sessao) => sessao.papel === null)).toBe(true);
  });

  it('faz os tempos crescerem entre duas atualizações', () => {
    const depois = gerarSessoes(new Date(agora.getTime() + 10_000), conexao);
    const raizAntes = cadeiasDeBloqueio(lista.sessoes)[0]?.sessao;
    const raizDepois = cadeiasDeBloqueio(depois.sessoes)[0]?.sessao;
    expect(raizDepois?.pid).toBe(raizAntes?.pid);
    expect(raizDepois?.estadoDesde).toBe(raizAntes?.estadoDesde);
  });

  it('esvazia a lista quando pedido', () => {
    expect(gerarSessoes(agora, conexao, true).sessoes).toEqual([]);
  });
});
