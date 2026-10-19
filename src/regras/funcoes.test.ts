import { describe, expect, it } from 'vitest';
import type { FuncaoDTO, GatilhoDaFuncaoDTO } from '@/modelos/objetos';
import {
  aplicarMudancaFuncoes,
  avisosDaFuncao,
  comandosDaFuncao,
  descreverDisparo,
  encontradaSoNoCodigo,
  estadoDoUso,
  filtrarFuncoes,
  filtrosFuncoesIniciais,
  idDaFuncao,
  lerFiltrosFuncoes,
  lerIdDaFuncao,
  linguagemMedida,
  loteDeComandosDasFuncoes,
  ordenarFuncoes,
  pontosDeAtencaoFuncoes,
  resumirFuncoes,
  situacoesDaFuncao,
  textoDaColetaDasFuncoes,
} from './funcoes';
import type { ContextoDasFuncoes } from './funcoes';

const geradoEm = '2026-10-19T18:00:00.000Z';
const contexto: ContextoDasFuncoes = { geradoEm, coletaDesde: '2026-09-02T13:12:00.000Z', rastreamento: 'PL' };

function criarFuncao(nome: string, campos: Partial<FuncaoDTO> = {}): FuncaoDTO {
  const base = {
    esquema: 'public',
    nome,
    argumentos: '',
    tipo: 'FUNCAO' as const,
    linguagem: 'plpgsql',
    retorno: 'integer',
    parametros: [],
    volatilidade: 'VOLATIL' as const,
    estrita: false,
    segurancaDefinidor: false,
    configuracoes: [],
    dono: 'loja_app',
    descricao: null,
    definicao: `CREATE OR REPLACE FUNCTION public.${nome}()\n RETURNS integer\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  RETURN 1;\nEND;\n$function$`,
    observadaDesde: '2026-09-02T13:12:00.000Z',
    uso: { chamadas: 10, tempoTotalMs: 20, tempoProprioMs: 20 },
    gatilhos: [],
    indices: [],
    visoes: [],
    consultas: [],
    ...campos,
  };
  return { ...base, id: idDaFuncao(base), ...campos };
}

function gatilho(campos: Partial<GatilhoDaFuncaoDTO> = {}): GatilhoDaFuncaoDTO {
  return {
    nome: 'pedidos_gatilho',
    tabela: { tipo: 'TABELA', esquema: 'public', nome: 'pedidos' },
    momento: 'ANTES',
    eventos: ['ATUALIZACAO'],
    nivel: 'LINHA',
    ativo: true,
    ...campos,
  };
}

describe('lerFiltrosFuncoes', () => {
  it('começa pelo nome e troca cada campo inválido pelo padrão', () => {
    expect(lerFiltrosFuncoes(null)).toEqual(filtrosFuncoesIniciais);
    expect(
      lerFiltrosFuncoes({ tipo: 'TABELA', linguagem: 'pl pgsql', situacao: 'LENTA', ordenacao: 'TAMANHO', pagina: 0 }),
    ).toEqual(filtrosFuncoesIniciais);
    expect(lerFiltrosFuncoes({ tipo: 'GATILHO', linguagem: 'sql', ordenacao: 'CHAMADAS' })).toMatchObject({
      tipo: 'GATILHO',
      linguagem: 'sql',
      ordenacao: 'CHAMADAS',
      direcao: 'DESC',
    });
  });

  it('volta à primeira página em qualquer mudança que não seja a página', () => {
    const naTerceira = { ...filtrosFuncoesIniciais, pagina: 3 };
    expect(aplicarMudancaFuncoes(naTerceira, { linguagem: 'sql' }).pagina).toBe(1);
    expect(aplicarMudancaFuncoes(naTerceira, { pagina: 2 }).pagina).toBe(2);
  });
});

describe('lerIdDaFuncao', () => {
  it('aceita a assinatura com tipos compostos e recusa o resto', () => {
    expect(lerIdDaFuncao('public.calcular_frete(text, numeric)')).toBe('public.calcular_frete(text, numeric)');
    expect(lerIdDaFuncao('public.agendar(timestamp with time zone, numeric(12,2), text[])')).not.toBeNull();
    expect(lerIdDaFuncao('public.definir_atualizado_em()')).toBe('public.definir_atualizado_em()');
    expect(lerIdDaFuncao('public.pedidos')).toBeNull();
    expect(lerIdDaFuncao('public.x(); DROP TABLE y')).toBeNull();
    expect(lerIdDaFuncao(42)).toBeNull();
  });
});

describe('linguagemMedida', () => {
  it('segue o track_functions do servidor', () => {
    expect(linguagemMedida('plpgsql', 'PL')).toBe(true);
    expect(linguagemMedida('sql', 'PL')).toBe(false);
    expect(linguagemMedida('c', 'PL')).toBe(false);
    expect(linguagemMedida('sql', 'TODAS')).toBe(true);
    expect(linguagemMedida('plpgsql', 'NENHUM')).toBe(false);
  });
});

describe('situacoesDaFuncao', () => {
  it('marca o SECURITY DEFINER sem search_path fixo', () => {
    expect(situacoesDaFuncao(criarFuncao('a', { segurancaDefinidor: true }), contexto)).toEqual(['RISCO_DE_SEGURANCA']);
    expect(
      situacoesDaFuncao(
        criarFuncao('b', { segurancaDefinidor: true, configuracoes: ['search_path=public, pg_temp'] }),
        contexto,
      ),
    ).toEqual([]);
    expect(situacoesDaFuncao(criarFuncao('c', { configuracoes: [] }), contexto)).toEqual([]);
  });

  it('marca como pesada a partir de 100 ms por chamada', () => {
    expect(
      situacoesDaFuncao(criarFuncao('a', { uso: { chamadas: 10, tempoTotalMs: 1000, tempoProprioMs: 900 } }), contexto),
    ).toEqual(['PESADA']);
    expect(
      situacoesDaFuncao(criarFuncao('b', { uso: { chamadas: 10, tempoTotalMs: 999, tempoProprioMs: 900 } }), contexto),
    ).toEqual([]);
  });

  it('só marca sem chamadas a função medida, vista há 30 dias e sem nada que dependa dela', () => {
    const parada = { uso: { chamadas: 0, tempoTotalMs: 0, tempoProprioMs: 0 } };
    expect(situacoesDaFuncao(criarFuncao('a', parada), contexto)).toEqual(['SEM_CHAMADAS']);
    expect(situacoesDaFuncao(criarFuncao('b', { uso: null }), contexto)).toEqual([]);
    expect(situacoesDaFuncao(criarFuncao('c', { ...parada, observadaDesde: '2026-10-15T16:40:00.000Z' }), contexto)).toEqual([]);
    expect(situacoesDaFuncao(criarFuncao('d', { ...parada, gatilhos: [gatilho()] }), contexto)).toEqual([]);
    expect(situacoesDaFuncao(criarFuncao('e', { ...parada, gatilhos: [gatilho({ ativo: false })] }), contexto)).toEqual([
      'SEM_CHAMADAS',
    ]);
    expect(
      situacoesDaFuncao(
        criarFuncao('f', { ...parada, indices: [{ id: 'public.x_key', nome: 'x_key', tabela: 'public.x' }] }),
        contexto,
      ),
    ).toEqual([]);
  });

  it('diz quando a função não é medida ou ainda está em observação', () => {
    expect(estadoDoUso(criarFuncao('a', { uso: null }), contexto)).toBe('NAO_MEDIDA');
    expect(
      estadoDoUso(
        criarFuncao('b', { uso: { chamadas: 0, tempoTotalMs: 0, tempoProprioMs: 0 }, observadaDesde: '2026-10-15T16:40:00.000Z' }),
        contexto,
      ),
    ).toBe('EM_OBSERVACAO');
    expect(estadoDoUso(criarFuncao('c'), contexto)).toBe('MEDIDA');
  });
});

describe('ordenarFuncoes e filtrarFuncoes', () => {
  const lenta = criarFuncao('lenta', { uso: { chamadas: 5, tempoTotalMs: 5000, tempoProprioMs: 5000 } });
  const frequente = criarFuncao('frequente', { uso: { chamadas: 9000, tempoTotalMs: 90, tempoProprioMs: 90 } });
  const naoMedida = criarFuncao('nao_medida', { linguagem: 'sql', uso: null });
  const sobrecarga = criarFuncao('lenta', { argumentos: 'integer' });

  it('deixa as não medidas no fim nas duas direções e separa as sobrecargas pelo argumento', () => {
    const funcoes = [naoMedida, lenta, frequente];
    expect(ordenarFuncoes(funcoes, 'CHAMADAS', 'DESC').map((item) => item.nome)).toEqual(['frequente', 'lenta', 'nao_medida']);
    expect(ordenarFuncoes(funcoes, 'CHAMADAS', 'ASC').map((item) => item.nome)).toEqual(['lenta', 'frequente', 'nao_medida']);
    expect(ordenarFuncoes(funcoes, 'TEMPO_MEDIO', 'DESC').map((item) => item.nome)).toEqual(['lenta', 'frequente', 'nao_medida']);
    expect(ordenarFuncoes([sobrecarga, lenta], 'NOME', 'ASC').map((item) => item.id)).toEqual([
      'public.lenta()',
      'public.lenta(integer)',
    ]);
  });

  it('busca no nome, nos argumentos, na descrição e no código', () => {
    const comCodigo = criarFuncao('total', { definicao: 'SELECT sum(valor) FROM pagamentos' });
    const funcoes = [comCodigo, lenta, naoMedida];
    const filtros = { ...filtrosFuncoesIniciais, busca: 'pagamentos' };
    expect(filtrarFuncoes(funcoes, filtros, contexto).map((item) => item.nome)).toEqual(['total']);
    expect(encontradaSoNoCodigo(comCodigo, 'pagamentos')).toBe(true);
    expect(encontradaSoNoCodigo(comCodigo, 'total')).toBe(false);
    expect(filtrarFuncoes(funcoes, { ...filtrosFuncoesIniciais, linguagem: 'sql' }, contexto)).toEqual([naoMedida]);
  });
});

describe('resumirFuncoes', () => {
  it('separa funções e procedimentos e conta as encontradas com filtro', () => {
    const funcoes = [criarFuncao('a'), criarFuncao('b'), criarFuncao('c', { tipo: 'PROCEDIMENTO', retorno: null })];
    expect(resumirFuncoes(funcoes, 3, filtrosFuncoesIniciais)).toBe('2 funções e 1 procedimento');
    expect(resumirFuncoes(funcoes, 1, { ...filtrosFuncoesIniciais, tipo: 'PROCEDIMENTO' })).toBe('1 de 3 rotinas');
    expect(resumirFuncoes([], 0, filtrosFuncoesIniciais)).toBe('Nenhuma função no banco');
  });
});

describe('pontosDeAtencaoFuncoes', () => {
  it('ordena as situações pela urgência e junta a partir de três funções', () => {
    const parada = { uso: { chamadas: 0, tempoTotalMs: 0, tempoProprioMs: 0 } };
    const funcoes = [
      criarFuncao('arriscada', { segurancaDefinidor: true, tipo: 'PROCEDIMENTO', retorno: null }),
      criarFuncao('a', parada),
      criarFuncao('b', parada),
      criarFuncao('c', parada),
      criarFuncao('pesada', { uso: { chamadas: 2, tempoTotalMs: 600, tempoProprioMs: 600 } }),
      criarFuncao('composta', { uso: { chamadas: 4, tempoTotalMs: 800, tempoProprioMs: 600 } }),
    ];
    const pontos = pontosDeAtencaoFuncoes(funcoes, contexto);
    expect(pontos.map((ponto) => ponto.tipo)).toEqual(['RISCO_DE_SEGURANCA', 'PESADA', 'PESADA', 'SEM_CHAMADAS']);
    expect(pontos[1]?.texto.startsWith('Cada chamada leva 200 ms em média, 75% dentro da própria função.')).toBe(true);
    expect(pontos[0]?.texto).toContain('o procedimento usar o objeto dele');
    expect(pontos[2]?.texto).toBe(
      'Cada chamada leva 300 ms em média. Foram 2 chamadas nos últimos 30 dias, 600 ms no total.',
    );
    expect(pontos[3]).toMatchObject({ titulo: '3 funções sem chamadas em 30 dias', alvo: { tipo: 'FILTRO', situacao: 'SEM_CHAMADAS' } });
    expect(pontos[3]?.texto.startsWith('a, b e c não foram chamadas')).toBe(true);
  });
});

describe('comandosDaFuncao', () => {
  it('fixa o search_path no esquema da função, com a palavra do tipo', () => {
    const procedimento = criarFuncao('arquivar', {
      tipo: 'PROCEDIMENTO',
      retorno: null,
      argumentos: 'integer',
      segurancaDefinidor: true,
      uso: { chamadas: 3, tempoTotalMs: 9, tempoProprioMs: 9 },
    });
    expect(comandosDaFuncao(procedimento, contexto).map((comando) => comando.comando)).toEqual([
      'ALTER PROCEDURE public.arquivar(integer) SET search_path = public, pg_temp;',
    ]);
  });

  it('remove antes o gatilho desativado que ainda cita a função', () => {
    const copiar = criarFuncao('copiar', {
      tipo: 'GATILHO',
      retorno: 'trigger',
      uso: { chamadas: 0, tempoTotalMs: 0, tempoProprioMs: 0 },
      gatilhos: [gatilho({ nome: 'clientes_copiar', tabela: { tipo: 'TABELA', esquema: 'public', nome: 'clientes' }, ativo: false })],
    });
    const [comando] = comandosDaFuncao(copiar, contexto);
    expect(comando?.comando).toBe('DROP TRIGGER clientes_copiar ON public.clientes;\nDROP FUNCTION public.copiar();');
    expect(avisosDaFuncao(copiar, contexto)[0]?.texto).toContain('O gatilho que a chamava, clientes_copiar em clientes, está desativado.');
    expect(loteDeComandosDasFuncoes([copiar, criarFuncao('ativa')], 'SEM_CHAMADAS', contexto)).toMatchObject({
      comandos: ['DROP TRIGGER clientes_copiar ON public.clientes;', 'DROP FUNCTION public.copiar();'],
      rotulo: 'Copiar os 2 comandos',
    });
    expect(loteDeComandosDasFuncoes([criarFuncao('ativa')], 'PESADA', contexto)).toBeNull();
  });
});

describe('descreverDisparo', () => {
  it('escreve o momento, os eventos e o nível do gatilho', () => {
    expect(descreverDisparo(gatilho())).toBe('Antes de cada atualização, linha a linha');
    expect(
      descreverDisparo(gatilho({ momento: 'DEPOIS', eventos: ['INSERCAO', 'ATUALIZACAO', 'EXCLUSAO'], nivel: 'COMANDO' })),
    ).toBe('Depois de cada inserção, atualização ou exclusão, uma vez por comando');
  });
});

describe('textoDaColetaDasFuncoes', () => {
  it('diz desde quando mede e o que o servidor mede', () => {
    expect(textoDaColetaDasFuncoes(contexto)).toMatchObject({ curto: 'Uso medido desde 2 de setembro', incompleta: false });
    expect(textoDaColetaDasFuncoes(contexto).completo).toContain('track_functions = pl');
    expect(textoDaColetaDasFuncoes({ ...contexto, rastreamento: 'NENHUM' })).toMatchObject({
      curto: 'O servidor não mede as chamadas',
      incompleta: true,
    });
  });
});
