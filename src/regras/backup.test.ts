import { describe, expect, it } from 'vitest';
import type { ObjetoBackupDTO } from '@/modelos/backup';
import {
  aplicarMudancaHistorico,
  camposDoAgendamento,
  camposPlanoIniciais,
  descreverImpactoDaExclusao,
  errosDaEtapa,
  filtrarExecucoes,
  filtrosHistoricoIniciais,
  lerFiltrosHistorico,
  montarDadosAgendamento,
  montarNovaExecucao,
  nomeDoArquivo,
} from './backup';
import {
  agruparObjetos,
  ajustarSelecaoAoTipo,
  alternarIds,
  estadoDaMarcacao,
  filtrarObjetos,
  quantidadeNaSelecao,
  tamanhoDaSelecao,
} from './selecaoObjetosBackup';

const objetos: ObjetoBackupDTO[] = [
  { id: 'public.pedidos', tipo: 'TABELA', esquema: 'public', nome: 'pedidos', tamanhoBytes: 1000 },
  { id: 'public.clientes', tipo: 'TABELA', esquema: 'public', nome: 'clientes', tamanhoBytes: 500 },
  { id: 'public.ativos', tipo: 'VISAO', esquema: 'public', nome: 'ativos', tamanhoBytes: null },
  { id: 'relatorios.vendas', tipo: 'VISAO_MATERIALIZADA', esquema: 'relatorios', nome: 'vendas', tamanhoBytes: null },
  { id: 'public.pedidos_id_seq', tipo: 'SEQUENCIA', esquema: 'public', nome: 'pedidos_id_seq', tamanhoBytes: null },
];

describe('filtros do histórico', () => {
  it('troca o que for inválido pelo padrão', () => {
    expect(lerFiltrosHistorico(null)).toEqual(filtrosHistoricoIniciais);
    expect(lerFiltrosHistorico({ periodo: 'SEMPRE', situacao: 'X', banco: 3, pagina: -1 })).toEqual(filtrosHistoricoIniciais);
  });

  it('volta para a primeira página ao mudar um filtro', () => {
    expect(aplicarMudancaHistorico({ ...filtrosHistoricoIniciais, pagina: 4 }, { banco: 'loja' }).pagina).toBe(1);
    expect(aplicarMudancaHistorico({ ...filtrosHistoricoIniciais, pagina: 4 }, { pagina: 2 }).pagina).toBe(2);
  });

  it('filtra por período, banco e status', () => {
    const agora = new Date('2026-10-30T12:00:00.000Z');
    const lista = [
      { banco: 'loja', situacao: 'CONCLUIDO' as const, iniciadaEm: '2026-10-30T02:00:00.000Z' },
      { banco: 'loja', situacao: 'FALHOU' as const, iniciadaEm: '2026-10-20T02:00:00.000Z' },
      { banco: 'hml', situacao: 'CONCLUIDO' as const, iniciadaEm: '2026-10-29T02:00:00.000Z' },
    ];
    expect(filtrarExecucoes(lista, { ...filtrosHistoricoIniciais, banco: 'loja' }, agora)).toHaveLength(2);
    expect(filtrarExecucoes(lista, { ...filtrosHistoricoIniciais, situacao: 'FALHOU' }, agora)).toHaveLength(1);
    expect(filtrarExecucoes(lista, { ...filtrosHistoricoIniciais, periodo: 'ULTIMOS_7_DIAS' }, agora)).toHaveLength(2);
  });
});

describe('etapas do plano', () => {
  const campos = { ...camposPlanoIniciais, conexaoId: 'c1' };

  it('pede a conexão na origem', () => {
    expect(errosDaEtapa('ORIGEM', { ...campos, conexaoId: null }).conexaoId).toBeDefined();
    expect(errosDaEtapa('ORIGEM', campos)).toEqual({});
  });

  it('pede ao menos um objeto ao escolher', () => {
    expect(errosDaEtapa('OBJETOS', { ...campos, selecao: { modo: 'ESCOLHIDOS', objetos: [] } }).selecao).toBeDefined();
    expect(errosDaEtapa('OBJETOS', campos)).toEqual({});
  });

  it('não pede nada no destino, porque o arquivo vem sempre para o computador', () => {
    expect(errosDaEtapa('DESTINO', campos)).toEqual({});
  });

  it('dispensa o nome ao executar agora e exige ao agendar', () => {
    expect(errosDaEtapa('QUANDO', campos)).toEqual({});
    expect(errosDaEtapa('QUANDO', { ...campos, quando: 'DIARIA' }).nome).toBeDefined();
  });

  it('confere os limites da frequência', () => {
    const agendado = { ...campos, nome: 'Diário', quando: 'MENSAL' as const, diaDoMes: '32' };
    expect(errosDaEtapa('QUANDO', agendado).diaDoMes).toBeDefined();
    expect(errosDaEtapa('QUANDO', { ...agendado, quando: 'PERSONALIZADA', unidade: 'HORAS', intervalo: '169' }).intervalo).toBeDefined();
  });

  it('monta o pedido e volta aos mesmos campos', () => {
    const preenchidos = { ...campos, nome: ' Semanal ', quando: 'SEMANAL' as const, diaDaSemana: 3 };
    const dados = montarDadosAgendamento(preenchidos);
    expect(dados).toMatchObject({ nome: 'Semanal', frequencia: { tipo: 'SEMANAL', diaDaSemana: 3 } });
    expect(dados).not.toHaveProperty('destino');
    expect(dados).not.toHaveProperty('retencao');
    expect(montarNovaExecucao(campos)).toEqual({ nome: null, conexaoId: 'c1', tipo: 'COMPLETO', selecao: { modo: 'BANCO_INTEIRO' } });
    const agendamento = {
      ...dados!,
      id: 'a1',
      conexaoNome: 'Loja',
      banco: 'loja',
      situacao: 'ATIVO' as const,
      vigenteDesde: '',
      proximaExecucaoEm: null,
      lembreteEm: null,
      ultimaExecucao: null,
      criadoEm: '',
      atualizadoEm: '',
    };
    expect(camposDoAgendamento(agendamento)).toMatchObject({ quando: 'SEMANAL', diaDaSemana: 3 });
  });
});

describe('seleção de objetos', () => {
  it('agrupa por esquema com public primeiro e por tipo na ordem do catálogo', () => {
    const grupos = agruparObjetos(objetos);
    expect(grupos.map((grupo) => grupo.esquema)).toEqual(['public', 'relatorios']);
    expect(grupos[0]?.tipos.map((grupo) => grupo.tipo)).toEqual(['TABELA', 'VISAO', 'SEQUENCIA']);
    expect(grupos[0]?.tipos[0]?.objetos.map((objeto) => objeto.nome)).toEqual(['clientes', 'pedidos']);
  });

  it('calcula o estado da marcação', () => {
    expect(estadoDaMarcacao(['a', 'b'], new Set())).toBe('VAZIA');
    expect(estadoDaMarcacao(['a', 'b'], new Set(['a']))).toBe('PARCIAL');
    expect(estadoDaMarcacao(['a', 'b'], new Set(['a', 'b']))).toBe('MARCADA');
  });

  it('marca e desmarca sem repetir', () => {
    expect(alternarIds(['a'], ['a', 'b'], true)).toEqual(['a', 'b']);
    expect(alternarIds(['a', 'b'], ['a'], false)).toEqual(['b']);
  });

  it('tira o que não tem dados ao trocar para só dados', () => {
    const selecao = { modo: 'ESCOLHIDOS' as const, objetos: ['public.pedidos', 'public.ativos', 'public.pedidos_id_seq'] };
    expect(ajustarSelecaoAoTipo(selecao, objetos, 'DADOS')).toEqual({ modo: 'ESCOLHIDOS', objetos: ['public.pedidos', 'public.pedidos_id_seq'] });
    expect(quantidadeNaSelecao({ modo: 'BANCO_INTEIRO' }, objetos, 'DADOS')).toBe(3);
    expect(quantidadeNaSelecao({ modo: 'BANCO_INTEIRO' }, objetos, 'COMPLETO')).toBe(5);
  });

  it('soma só o tamanho do que foi escolhido', () => {
    expect(tamanhoDaSelecao({ modo: 'BANCO_INTEIRO' }, objetos, 'COMPLETO')).toBe(1500);
    expect(tamanhoDaSelecao({ modo: 'ESCOLHIDOS', objetos: ['public.clientes'] }, objetos, 'COMPLETO')).toBe(500);
  });

  it('busca sem diferenciar acento nem maiúscula', () => {
    expect(filtrarObjetos(objetos, 'RELATORIOS vendas').map((objeto) => objeto.id)).toEqual(['relatorios.vendas']);
    expect(filtrarObjetos(objetos, '  ')).toHaveLength(objetos.length);
  });
});

describe('textos', () => {
  it('nomeia o arquivo com o banco, o instante e o tipo', () => {
    expect(nomeDoArquivo('loja', new Date(2026, 9, 5, 2, 7), 'ESTRUTURA')).toBe('backup_loja_2026-10-05_0207_estrutura.dump');
    expect(nomeDoArquivo('loja', new Date(2026, 9, 5, 2, 7), 'COMPLETO', true)).toBe('backup_loja_2026-10-05_0207_completo-demonstracao.dump');
  });

  it('avisa o que acontece com os agendamentos ao excluir a conexão', () => {
    const impacto = { conexaoId: 'c1', agendamentos: 2, agendamentosAtivos: 1, nomesDosAgendamentos: ['A', 'B'], ultimaExecucao: null };
    expect(descreverImpactoDaExclusao(impacto)).toContain('2 agendamentos ficam desativados');
    expect(descreverImpactoDaExclusao({ ...impacto, agendamentos: 0, nomesDosAgendamentos: [] })).toBeNull();
    expect(descreverImpactoDaExclusao(null)).toBeNull();
  });
});
