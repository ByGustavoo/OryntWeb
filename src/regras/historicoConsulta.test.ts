import { describe, expect, it } from 'vitest';
import type { HistoricoConsultaDTO, PontoHistoricoDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import {
  alternarOrdemDosIntervalos,
  INTERVALOS_RECOLHIDOS,
  intervalosPorPeriodo,
  cabecalhoDoHistorico,
  estadoDoHistorico,
  descreverTroca,
  foiExecutada,
  intervaloDaTroca,
  intervalosComTroca,
  lerIdDaConsulta,
  lerSelecao,
  montarDestaquesDoHistorico,
  ordemInicialDosIntervalos,
  ordenarIntervalos,
  periodoDoHistorico,
  pontoComMaisExecucoes,
  pontoDaExecucaoMaisLenta,
  pontoMaisLento,
  quantidadeVisivel,
  recortarIntervalos,
  rotuloCurtoDoAlternador,
  rotuloDosIntervalosOcultos,
  rotuloParaRecolher,
  rotuloVerHistorico,
  selecaoInicial,
  textosDoIntervalo,
} from './historicoConsulta';

const inicio = new Date(2026, 9, 7, 13, 0).toISOString();
const meio = new Date(2026, 9, 7, 14, 0).toISOString();
const fim = new Date(2026, 9, 7, 15, 0).toISOString();

const pontos: PontoHistoricoDTO[] = [
  { instante: inicio, quantidadeExecucoes: 100, tempoMedioMs: 180, tempoMaximoMs: 1270 },
  { instante: meio, quantidadeExecucoes: 300, tempoMedioMs: 240, tempoMaximoMs: 610 },
  { instante: fim, quantidadeExecucoes: 0, tempoMedioMs: null, tempoMaximoMs: null },
];

function historico(mudanca: Partial<HistoricoConsultaDTO> = {}): HistoricoConsultaDTO {
  return {
    periodo: 'ULTIMAS_24_HORAS',
    consulta: {
      id: 'q-pedidos-cliente',
      sql: 'SELECT * FROM pedidos WHERE cliente_id = $1',
      tipo: 'SELECT',
      tempoMedioMs: 193,
      tempoMinimoMs: 50.1,
      tempoMaximoMs: 1270,
      tempoTotalMs: 5150205,
      quantidadeExecucoes: 26685,
      linhasPorExecucao: 14.2,
      percentualTempoTotal: 28.4,
      desempenho: 'MODERADA',
    },
    trocasDePlano: [],
    variacaoExecucoes: 3.2,
    variacaoTempoMedio: 4.1,
    posicao: 3,
    totalDoPeriodo: 42,
    idAnterior: 'q-a',
    idSeguinte: 'q-b',
    pontos,
    ...mudanca,
  };
}

function textos(dados: HistoricoConsultaDTO): string[] {
  return montarDestaquesDoHistorico(dados).map((destaque) => destaque.texto);
}

describe('seleção do histórico guardada no navegador', () => {
  it('começa sem consulta escolhida, nas últimas 24 horas', () => {
    expect(selecaoInicial).toEqual({ consulta: null, periodo: 'ULTIMAS_24_HORAS' });
    expect(lerSelecao(null)).toEqual(selecaoInicial);
    expect(lerSelecao('texto')).toEqual(selecaoInicial);
  });

  it('aceita a consulta e o período válidos', () => {
    expect(lerSelecao({ consulta: 'q-pedidos-cliente', periodo: 'ULTIMOS_7_DIAS' })).toEqual({
      consulta: 'q-pedidos-cliente',
      periodo: 'ULTIMOS_7_DIAS',
    });
  });

  it('troca cada campo inválido pelo valor inicial', () => {
    expect(lerSelecao({ consulta: 42, periodo: 'ONTEM' })).toEqual(selecaoInicial);
    expect(lerSelecao({ consulta: 'q-1' })).toEqual({ consulta: 'q-1', periodo: 'ULTIMAS_24_HORAS' });
  });

  it('recusa um identificador que não poderia entrar no caminho da rota', () => {
    expect(lerIdDaConsulta('q-pedidos_cliente.1:2')).toBe('q-pedidos_cliente.1:2');
    expect(lerIdDaConsulta('1234567890')).toBe('1234567890');
    expect(lerIdDaConsulta('')).toBeNull();
    expect(lerIdDaConsulta('../conexoes')).toBeNull();
    expect(lerIdDaConsulta('a/b')).toBeNull();
    expect(lerIdDaConsulta('a?b=c')).toBeNull();
    expect(lerIdDaConsulta('a b')).toBeNull();
    expect(lerIdDaConsulta('x'.repeat(121))).toBeNull();
  });
});

describe('textos de cada intervalo', () => {
  const instante = new Date(2026, 9, 7, 12, 0).toISOString();
  const cincoMinutos = new Date(2026, 9, 7, 14, 5).toISOString();

  it('descreve o intervalo de 5 minutos pelo horário', () => {
    const texto = textosDoIntervalo.ULTIMA_HORA;

    expect(texto.eixo(cincoMinutos)).toBe('14:05');
    expect(texto.linha(cincoMinutos)).toBe('14:05 a 14:10');
    expect(texto.completo(cincoMinutos)).toBe('Das 14:05 às 14:10');
    expect(texto.quando(cincoMinutos)).toBe('às 14:05');
    expect(texto.naFrase(cincoMinutos)).toBe('entre 14:05 e 14:10');
  });

  it('descreve a hora com o dia, porque as 24 horas atravessam a meia-noite', () => {
    const texto = textosDoIntervalo.ULTIMAS_24_HORAS;

    expect(texto.linha(instante)).toBe('07/10, 12:00');
    expect(texto.completo(instante)).toBe('07/10, das 12:00 às 13:00');
    expect(texto.quando(instante)).toBe('em 07/10, às 12:00');
    expect(texto.naFrase(instante)).toBe('em 7 de outubro, entre 12:00 e 13:00');
  });

  it('descreve o intervalo de 6 horas com o dia da semana', () => {
    const texto = textosDoIntervalo.ULTIMOS_7_DIAS;

    expect(texto.eixo(instante)).toBe('qua 07/10');
    expect(texto.linha(instante)).toBe('qua 07/10, 12:00');
    expect(texto.completo(instante)).toBe('qua, 07/10, das 12:00 às 18:00');
    expect(texto.quando(instante)).toBe('em 07/10, a partir das 12:00');
    expect(texto.naFrase(instante)).toBe('na quarta-feira, 7 de outubro, entre 12:00 e 18:00');
  });

  it('descreve o dia sem horário', () => {
    const texto = textosDoIntervalo.ULTIMOS_30_DIAS;
    const dia = new Date(2026, 9, 7).toISOString();

    expect(texto.eixo(dia)).toBe('07/10');
    expect(texto.linha(dia)).toBe('qua, 07/10');
    expect(texto.quando(dia)).toBe('em 07/10');
    expect(texto.naFrase(dia)).toBe('na quarta-feira, 7 de outubro');
  });
});

describe('pontos em evidência', () => {
  it('acha o intervalo com mais execuções, o mais lento e o da execução mais lenta', () => {
    expect(pontoComMaisExecucoes(pontos)?.instante).toBe(meio);
    expect(pontoMaisLento(pontos)?.instante).toBe(meio);
    expect(pontoDaExecucaoMaisLenta(pontos)?.instante).toBe(inicio);
  });

  it('não aponta nenhum quando não houve execução', () => {
    const vazios = pontos.map((ponto) => ({ ...ponto, quantidadeExecucoes: 0, tempoMedioMs: null, tempoMaximoMs: null }));

    expect(pontoComMaisExecucoes(vazios)).toBeNull();
    expect(pontoMaisLento(vazios)).toBeNull();
    expect(pontoDaExecucaoMaisLenta(vazios)).toBeNull();
    expect(pontoComMaisExecucoes([])).toBeNull();
  });
});

describe('destaques do histórico', () => {
  it('conta o volume, o tempo, o pico e o intervalo mais lento', () => {
    expect(textos(historico())).toEqual([
      'A consulta foi executada 26.685 vezes, 3,2% a mais que nas 24 horas anteriores.',
      'O tempo médio de execução ficou em 193 ms, 4,1% maior que nas 24 horas anteriores.',
      'O maior volume foi em 7 de outubro, entre 14:00 e 15:00, com 300 execuções.',
      'O intervalo mais lento foi em 7 de outubro, entre 14:00 e 15:00, com tempo médio de 240 ms, 24,4% acima do tempo médio do período.',
    ]);
  });

  it('trata a alta do tempo como atenção, a queda como positiva e o volume sem julgamento', () => {
    const tons = (dados: HistoricoConsultaDTO) => montarDestaquesDoHistorico(dados).map((destaque) => `${destaque.tipo}:${destaque.tom}`);

    expect(tons(historico())).toEqual(['VOLUME:neutro', 'TEMPO:atencao', 'PICO:neutro', 'LENTIDAO:atencao']);
    expect(tons(historico({ variacaoExecucoes: -40, variacaoTempoMedio: -12.5 })).slice(0, 2)).toEqual([
      'VOLUME:neutro',
      'TEMPO:positivo',
    ]);
  });

  it('escreve a queda, a igualdade e a falta de período anterior', () => {
    expect(textos(historico({ variacaoExecucoes: -8, variacaoTempoMedio: -12.5 })).slice(0, 2)).toEqual([
      'A consulta foi executada 26.685 vezes, 8,0% a menos que nas 24 horas anteriores.',
      'O tempo médio de execução ficou em 193 ms, 12,5% menor que nas 24 horas anteriores.',
    ]);
    expect(textos(historico({ variacaoExecucoes: 0, variacaoTempoMedio: 0 })).slice(0, 2)).toEqual([
      'A consulta foi executada 26.685 vezes, o mesmo volume das 24 horas anteriores.',
      'O tempo médio de execução ficou em 193 ms, igual ao das 24 horas anteriores.',
    ]);
    expect(textos(historico({ variacaoExecucoes: null, variacaoTempoMedio: null })).slice(0, 2)).toEqual([
      'A consulta foi executada 26.685 vezes.',
      'O tempo médio de execução ficou em 193 ms.',
    ]);
  });

  it('cita a janela anterior de cada período', () => {
    const frases: Record<PeriodoDashboard, string> = {
      ULTIMA_HORA: 'na hora anterior',
      ULTIMAS_24_HORAS: 'nas 24 horas anteriores',
      ULTIMOS_7_DIAS: 'nos 7 dias anteriores',
      ULTIMOS_30_DIAS: 'nos 30 dias anteriores',
    };

    for (const [periodo, frase] of Object.entries(frases) as [PeriodoDashboard, string][]) {
      expect(textos(historico({ periodo }))[0]).toBe(`A consulta foi executada 26.685 vezes, 3,2% a mais que ${frase}.`);
    }
  });

  it('usa o singular e a grandeza por extenso quando o volume pede', () => {
    const base = historico();
    const uma = historico({
      consulta: { ...base.consulta, quantidadeExecucoes: 1 },
      variacaoExecucoes: null,
      pontos: [{ instante: meio, quantidadeExecucoes: 1, tempoMedioMs: 193, tempoMaximoMs: 193 }],
    });
    const milhoes = historico({ consulta: { ...base.consulta, quantidadeExecucoes: 2_400_000 }, variacaoExecucoes: null });

    expect(textos(uma)).toEqual([
      'A consulta foi executada 1 vez.',
      'O tempo médio de execução ficou em 193 ms, 4,1% maior que nas 24 horas anteriores.',
      'O maior volume foi em 7 de outubro, entre 14:00 e 15:00, com 1 execução.',
      'O tempo médio não passou de 193 ms em nenhum intervalo.',
    ]);
    expect(textos(milhoes)[0]).toBe('A consulta foi executada 2,4 milhões de vezes.');
  });

  it('não pede atenção quando o intervalo mais lento fica perto do tempo médio', () => {
    const proximo = historico({
      pontos: [
        { instante: inicio, quantidadeExecucoes: 100, tempoMedioMs: 190, tempoMaximoMs: 400 },
        { instante: meio, quantidadeExecucoes: 300, tempoMedioMs: 205, tempoMaximoMs: 1270 },
      ],
    });
    const lentidao = montarDestaquesDoHistorico(proximo)[3];

    expect(lentidao).toEqual({
      tipo: 'LENTIDAO',
      tom: 'neutro',
      texto:
        'O intervalo mais lento foi em 7 de outubro, entre 14:00 e 15:00, com tempo médio de 205 ms, 6,2% acima do tempo médio do período.',
    });
  });

  it('não monta frases para a consulta que não foi executada', () => {
    const base = historico();
    const parada = historico({ consulta: { ...base.consulta, quantidadeExecucoes: 0 } });

    expect(foiExecutada(base)).toBe(true);
    expect(foiExecutada(parada)).toBe(false);
    expect(montarDestaquesDoHistorico(parada)).toEqual([]);
  });
});

describe('texto copiado', () => {
  it('abre o texto copiado com a conexão, o período e o SQL', () => {
    expect(cabecalhoDoHistorico('Produção', historico(), false)).toBe(
      'Histórico de uma consulta de Produção, nas últimas 24 horas\nSELECT * FROM pedidos WHERE cliente_id = $1',
    );
  });

  it('avisa na primeira linha quando os dados são demonstrativos', () => {
    const [primeiraLinha] = cabecalhoDoHistorico('Loja', historico({ periodo: 'ULTIMOS_7_DIAS' }), true).split('\n');

    expect(primeiraLinha).toBe('Histórico de uma consulta de Loja, nos últimos 7 dias (dados demonstrativos)');
  });
});

describe('ordenação da tabela por intervalo', () => {
  const instantes = (ordenados: PontoHistoricoDTO[]) => ordenados.map((ponto) => ponto.instante);

  it('começa do intervalo mais antigo para o mais recente', () => {
    expect(ordemInicialDosIntervalos).toEqual({ ordenacao: 'INSTANTE', direcao: 'ASC' });
    expect(instantes(ordenarIntervalos([pontos[2]!, pontos[0]!, pontos[1]!], ordemInicialDosIntervalos))).toEqual([inicio, meio, fim]);
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'INSTANTE', direcao: 'DESC' }))).toEqual([fim, meio, inicio]);
  });

  it('ordena por cada medida, nos dois sentidos, sem mexer na lista recebida', () => {
    const copia = [...pontos];

    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'EXECUCOES', direcao: 'DESC' }))).toEqual([meio, inicio, fim]);
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'EXECUCOES', direcao: 'ASC' }))).toEqual([fim, inicio, meio]);
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'TEMPO_MEDIO', direcao: 'DESC' }))).toEqual([meio, inicio, fim]);
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'TEMPO_MAXIMO', direcao: 'DESC' }))).toEqual([inicio, meio, fim]);
    expect(pontos).toEqual(copia);
  });

  it('deixa por último o intervalo sem execuções, qualquer que seja o sentido do tempo', () => {
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'TEMPO_MEDIO', direcao: 'ASC' }))).toEqual([inicio, meio, fim]);
    expect(instantes(ordenarIntervalos(pontos, { ordenacao: 'TEMPO_MAXIMO', direcao: 'ASC' }))).toEqual([meio, inicio, fim]);
  });

  it('desempata pela ordem do tempo', () => {
    const iguais: PontoHistoricoDTO[] = [
      { instante: fim, quantidadeExecucoes: 5, tempoMedioMs: 10, tempoMaximoMs: 20 },
      { instante: inicio, quantidadeExecucoes: 5, tempoMedioMs: 10, tempoMaximoMs: 20 },
      { instante: meio, quantidadeExecucoes: 5, tempoMedioMs: 10, tempoMaximoMs: 20 },
    ];

    expect(instantes(ordenarIntervalos(iguais, { ordenacao: 'EXECUCOES', direcao: 'DESC' }))).toEqual([inicio, meio, fim]);
    expect(instantes(ordenarIntervalos(iguais, { ordenacao: 'TEMPO_MEDIO', direcao: 'ASC' }))).toEqual([inicio, meio, fim]);
  });

  it('abre uma medida do maior para o menor, o intervalo do mais antigo, e inverte no segundo clique', () => {
    const porExecucoes = alternarOrdemDosIntervalos(ordemInicialDosIntervalos, 'EXECUCOES');

    expect(porExecucoes).toEqual({ ordenacao: 'EXECUCOES', direcao: 'DESC' });
    expect(alternarOrdemDosIntervalos(porExecucoes, 'EXECUCOES')).toEqual({ ordenacao: 'EXECUCOES', direcao: 'ASC' });
    expect(alternarOrdemDosIntervalos(porExecucoes, 'INSTANTE')).toEqual({ ordenacao: 'INSTANTE', direcao: 'ASC' });
    expect(alternarOrdemDosIntervalos(ordemInicialDosIntervalos, 'INSTANTE')).toEqual({ ordenacao: 'INSTANTE', direcao: 'DESC' });
  });
});

describe('tabela por intervalo recolhida', () => {
  const dias: PontoHistoricoDTO[] = Array.from({ length: 30 }, (_, indice) => ({
    instante: new Date(2026, 8, 14 + indice).toISOString(),
    quantidadeExecucoes: indice + 1,
    tempoMedioMs: 100,
    tempoMaximoMs: 200,
  }));
  const instantes = (lista: PontoHistoricoDTO[]) => lista.map((ponto) => ponto.instante);

  it('nunca recolhe a última hora, que já cabe inteira', () => {
    expect(intervalosPorPeriodo.ULTIMA_HORA).toBe(INTERVALOS_RECOLHIDOS);
    expect(recortarIntervalos(dias.slice(0, 12), ordemInicialDosIntervalos, false)).toMatchObject({ ocultos: 0, recolhivel: false });
    expect(quantidadeVisivel(30, false)).toBe(12);
    expect(quantidadeVisivel(30, true)).toBe(30);
  });

  it('na ordem do mais antigo, esconde o começo e mostra os intervalos mais recentes', () => {
    const recorte = recortarIntervalos(dias, ordemInicialDosIntervalos, false);

    expect(recorte).toMatchObject({ ocultos: 18, recolhivel: true, lado: 'INICIO' });
    expect(instantes(recorte.visiveis)).toEqual(instantes(dias.slice(18)));
  });

  it('nas outras ordens, mostra o começo da ordem e esconde o resto', () => {
    const recente = recortarIntervalos([...dias].reverse(), { ordenacao: 'INSTANTE', direcao: 'DESC' }, false);
    const porExecucoes = recortarIntervalos([...dias].reverse(), { ordenacao: 'EXECUCOES', direcao: 'DESC' }, false);

    expect(recente).toMatchObject({ ocultos: 18, lado: 'FIM' });
    expect(instantes(recente.visiveis)).toEqual(instantes([...dias].reverse().slice(0, 12)));
    expect(porExecucoes.lado).toBe('FIM');
  });

  it('mostra tudo quando aberta, e continua podendo recolher', () => {
    const recorte = recortarIntervalos(dias, ordemInicialDosIntervalos, true);

    expect(recorte).toMatchObject({ ocultos: 0, recolhivel: true });
    expect(recorte.visiveis).toHaveLength(30);
  });

  it('diz quantos intervalos estão escondidos, com a palavra de cada período', () => {
    const porTempo = { ordenacao: 'TEMPO_MAXIMO', direcao: 'DESC' } as const;

    expect(rotuloDosIntervalosOcultos('ULTIMOS_30_DIAS', ordemInicialDosIntervalos, 18)).toBe('Mostrar os 18 dias anteriores');
    expect(rotuloDosIntervalosOcultos('ULTIMAS_24_HORAS', ordemInicialDosIntervalos, 12)).toBe('Mostrar as 12 horas anteriores');
    expect(rotuloDosIntervalosOcultos('ULTIMOS_7_DIAS', ordemInicialDosIntervalos, 16)).toBe('Mostrar os 16 intervalos anteriores');
    expect(rotuloDosIntervalosOcultos('ULTIMAS_24_HORAS', porTempo, 12)).toBe('Mostrar as outras 12 horas');
    expect(rotuloDosIntervalosOcultos('ULTIMOS_30_DIAS', porTempo, 18)).toBe('Mostrar os outros 18 dias');
  });

  it('tem um rótulo curto para telas estreitas', () => {
    expect(rotuloCurtoDoAlternador('ULTIMOS_30_DIAS', 30, false)).toBe('Mostrar os 30 dias');
    expect(rotuloCurtoDoAlternador('ULTIMAS_24_HORAS', 24, false)).toBe('Mostrar as 24 horas');
    expect(rotuloCurtoDoAlternador('ULTIMOS_7_DIAS', 28, false)).toBe('Mostrar os 28 intervalos');
    expect(rotuloCurtoDoAlternador('ULTIMOS_7_DIAS', 28, true)).toBe('Mostrar só 12');
  });

  it('diz, com a lista aberta, quais intervalos ficam ao recolher', () => {
    const porTempo = { ordenacao: 'TEMPO_MAXIMO', direcao: 'DESC' } as const;

    expect(rotuloParaRecolher('ULTIMOS_30_DIAS', ordemInicialDosIntervalos)).toBe('Mostrar só os 12 mais recentes');
    expect(rotuloParaRecolher('ULTIMAS_24_HORAS', { ordenacao: 'INSTANTE', direcao: 'DESC' })).toBe('Mostrar só as 12 mais recentes');
    expect(rotuloParaRecolher('ULTIMAS_24_HORAS', porTempo)).toBe('Mostrar só as 12 primeiras');
    expect(rotuloParaRecolher('ULTIMOS_7_DIAS', porTempo)).toBe('Mostrar só os 12 primeiros');
  });
});

describe('atalho para o histórico', () => {
  it('leva a consulta e o período no estado da navegação, no formato que a tela lê', () => {
    const estado = estadoDoHistorico('q-pedidos-cliente', 'ULTIMOS_7_DIAS');

    expect(estado).toEqual({ historico: { consulta: 'q-pedidos-cliente', periodo: 'ULTIMOS_7_DIAS' } });
    expect(lerSelecao(estado.historico)).toEqual(estado.historico);
  });

  it('abre, a partir de um relatório, a janela recente do mesmo tamanho', () => {
    expect(periodoDoHistorico).toEqual({ DIA: 'ULTIMAS_24_HORAS', SEMANA: 'ULTIMOS_7_DIAS', MES: 'ULTIMOS_30_DIAS' });
  });

  it('diz no rótulo qual janela o histórico vai mostrar', () => {
    expect(rotuloVerHistorico('ULTIMAS_24_HORAS')).toBe('Ver o histórico da consulta nas últimas 24 horas');
    expect(rotuloVerHistorico('ULTIMOS_30_DIAS')).toBe('Ver o histórico da consulta nos últimos 30 dias');
  });
});

describe('trocas de plano', () => {
  const troca = { instante: new Date(2026, 9, 7, 14, 20, 47).toISOString(), versao: 'v2', versaoAnterior: 'v1' };

  it('acha o intervalo em que o plano mudou', () => {
    expect(intervaloDaTroca(pontos, 'ULTIMAS_24_HORAS', troca)?.instante).toBe(meio);
    expect(intervaloDaTroca(pontos, 'ULTIMAS_24_HORAS', { ...troca, instante: new Date(2026, 9, 6).toISOString() })).toBeNull();
  });

  it('lista os intervalos com troca e descreve o momento', () => {
    expect(intervalosComTroca(historico({ trocasDePlano: [troca] }))).toEqual([meio]);
    expect(intervalosComTroca(historico())).toEqual([]);
    expect(descreverTroca(troca)).toBe('O plano de execução mudou em 7 de outubro, às 14:20');
  });
});
