import { describe, expect, it } from 'vitest';
import type { FuncaoDTO, ListaFuncoesDTO } from '@/modelos/objetos';
import { PERIODO_DAS_FUNCOES, situacoesDaFuncao, tempoMedioPorChamada } from '@/regras/funcoes';
import { idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gatilhosFicticios, gerarFuncoes } from './funcoes';
import { gerarIndices } from './indices';
import { gerarTabelas } from './tabelas';

const agora = new Date(2026, 9, 19, 15, 0);
const lista = gerarFuncoes(agora);
const contexto = { geradoEm: lista.geradoEm, coletaDesde: lista.coletaDesde, rastreamento: lista.rastreamento };
const tabelas = gerarTabelas(agora).tabelas;
const consultas = new Map(gerarConsultasDetalhadas(PERIODO_DAS_FUNCOES, agora).map((consulta) => [consulta.id, consulta]));

function funcao(id: string, origem: ListaFuncoesDTO = lista): FuncaoDTO {
  const encontrada = origem.funcoes.find((candidata) => candidata.id === id);
  if (!encontrada) throw new Error(`Função ${id} não simulada.`);
  return encontrada;
}

function tabela(id: string) {
  const encontrada = tabelas.find((candidata) => candidata.id === id);
  if (!encontrada) throw new Error(`Tabela ${id} não simulada.`);
  return encontrada;
}

function execucoes(id: string): number {
  return consultas.get(id)?.quantidadeExecucoes ?? 0;
}

describe('gerarFuncoes', () => {
  it('dá a cada função um id único com os argumentos, que separa as sobrecargas', () => {
    const ids = lista.funcoes.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('public.calcular_frete(text, numeric)');
    expect(ids).toContain('public.calcular_frete(text, numeric, boolean)');
  });

  it('escreve o código no formato do pg_get_functiondef', () => {
    for (const item of lista.funcoes) {
      const palavra = item.tipo === 'PROCEDIMENTO' ? 'PROCEDURE' : 'FUNCTION';
      expect(item.definicao.startsWith(`CREATE OR REPLACE ${palavra} ${item.esquema}.${item.nome}(`)).toBe(true);
      expect(item.definicao).toContain(` LANGUAGE ${item.linguagem}`);
      expect(item.definicao.includes(' SECURITY DEFINER')).toBe(item.segurancaDefinidor);
    }
  });

  it('liga cada gatilho a uma função de gatilho e a uma tabela de Tabelas, nos dois sentidos', () => {
    for (const gatilho of gatilhosFicticios) {
      const daFuncao = funcao(gatilho.funcao);
      expect(daFuncao.tipo).toBe('GATILHO');
      expect(daFuncao.gatilhos.map((item) => item.nome)).toContain(gatilho.nome);
      expect(tabela(gatilho.tabela).gatilhos.map((item) => [item.nome, item.funcao])).toContainEqual([gatilho.nome, gatilho.funcao]);
    }
    const daTabela = tabelas.flatMap((item) => item.gatilhos);
    expect(daTabela).toHaveLength(gatilhosFicticios.length);
    for (const item of lista.funcoes.filter((candidata) => candidata.tipo === 'GATILHO')) {
      expect(item.retorno).toBe('trigger');
    }
  });

  it('conta as chamadas dos gatilhos pelas gravações de Tabelas', () => {
    expect(funcao('public.definir_atualizado_em()').uso?.chamadas).toBe(
      tabela('public.pedidos').atualizacoes + tabela('public.estoque').atualizacoes,
    );
    expect(funcao('public.validar_estoque()').uso?.chamadas).toBe(tabela('public.estoque').atualizacoes);
    expect(funcao('public.avisar_sessoes_expiradas()').uso?.chamadas).toBe(execucoes('q-sessoes-limpeza'));
    expect(funcao('public.copiar_cliente_para_legado()').uso?.chamadas).toBe(tabela('public.clientes').insercoes);
  });

  it('cita a função no texto de cada consulta que a chama, e conta uma chamada por execução', () => {
    const citadas = lista.funcoes.filter((item) => item.consultas.length > 0);
    expect(citadas.map((item) => item.id)).toEqual(['public.calcular_total_pedido(bigint)']);
    for (const item of citadas) {
      for (const consulta of item.consultas) expect(consulta.sql).toContain(`${item.nome}(`);
      expect(item.uso?.chamadas).toBe(item.consultas.reduce((soma, consulta) => soma + consulta.quantidadeExecucoes, 0));
    }
  });

  it('nunca dá a uma função mais tempo por chamada do que o comando que a chama leva', () => {
    const total = funcao('public.calcular_total_pedido(bigint)');
    expect(tempoMedioPorChamada(total.uso) ?? 0).toBeLessThan(consultas.get('q-pagamento-novo')?.tempoMedioMs ?? 0);
    expect(tempoMedioPorChamada(funcao('public.avisar_sessoes_expiradas()').uso) ?? 0).toBeLessThan(
      consultas.get('q-sessoes-limpeza')?.tempoMedioMs ?? 0,
    );
  });

  it('separa o tempo próprio do tempo das funções chamadas por dentro', () => {
    const total = funcao('public.calcular_total_pedido(bigint)').uso;
    const frete = funcao('public.calcular_frete(text, numeric)').uso;
    expect(total && frete).toBeTruthy();
    if (!total || !frete) return;
    expect(frete.chamadas).toBe(total.chamadas);
    expect(total.tempoProprioMs + frete.tempoTotalMs).toBeCloseTo(total.tempoTotalMs, 2);
    for (const item of lista.funcoes) {
      if (item.uso) expect(item.uso.tempoProprioMs).toBeLessThanOrEqual(item.uso.tempoTotalMs);
    }
  });

  it('liga os índices e as funções de que eles dependem, nos dois sentidos', () => {
    const indices = gerarIndices(agora).indices;
    const digitos = funcao('public.somente_digitos(text)');
    expect(digitos.indices.map((indice) => indice.id)).toEqual(['public.clientes_documento_key']);
    for (const item of lista.funcoes) {
      for (const indice of item.indices) {
        const emIndices = indices.find((candidato) => candidato.id === indice.id);
        expect(emIndices?.funcoes).toContain(item.id);
        expect(emIndices?.colunas.some((coluna) => coluna.startsWith(`${item.nome}(`))).toBe(true);
        expect(emIndices && idDoObjeto(emIndices.tabela)).toBe(indice.tabela);
      }
    }
    for (const indice of indices) {
      for (const id of indice.funcoes) expect(funcao(id).indices.map((item) => item.id)).toContain(indice.id);
    }
  });

  it('segue o track_functions do servidor', () => {
    expect(lista.rastreamento).toBe('PL');
    for (const item of lista.funcoes) expect(item.uso === null).toBe(item.linguagem === 'sql');
    expect(gerarFuncoes(agora, false, 'NENHUM').funcoes.every((item) => item.uso === null)).toBe(true);
    expect(gerarFuncoes(agora, false, 'TODAS').funcoes.every((item) => item.uso !== null)).toBe(true);
  });

  it('monta os casos desenhados', () => {
    const situacoes = (id: string) => situacoesDaFuncao(funcao(id), contexto);
    expect(situacoes('public.arquivar_pedidos_antigos(integer)')).toEqual(['RISCO_DE_SEGURANCA', 'SEM_CHAMADAS']);
    expect(situacoes('public.avisar_sessoes_expiradas()')).toEqual(['PESADA']);
    expect(situacoes('public.gerar_slug(text)')).toEqual(['SEM_CHAMADAS']);
    expect(situacoes('public.copiar_cliente_para_legado()')).toEqual(['SEM_CHAMADAS']);
    expect(situacoes('public.calcular_frete(text, numeric, boolean)')).toEqual([]);
    expect(situacoes('auditoria.registrar_alteracao()')).toEqual([]);
    expect(situacoes('public.somente_digitos(text)')).toEqual([]);
    expect(funcao('auditoria.registrar_alteracao()').segurancaDefinidor).toBe(true);
    const comMarcas = lista.funcoes.filter((item) => situacoesDaFuncao(item, contexto).length > 0);
    expect(comMarcas).toHaveLength(4);
  });

  it('devolve a lista vazia com as datas quando os dados estão vazios', () => {
    const vazia = gerarFuncoes(agora, true);
    expect(vazia.funcoes).toEqual([]);
    expect(vazia.coletaDesde).toBe(lista.coletaDesde);
  });
});
