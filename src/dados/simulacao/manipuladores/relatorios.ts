import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import {
  GRANULARIDADE_INICIAL,
  MESES_DE_HISTORICO,
  granularidadesRelatorio,
  lerGranularidade,
  lerPeriodo,
  ultimoPeriodoFechado,
} from '@/regras/periodoRelatorio';
import { dadosVazios } from '../controles';
import { gerarResumoRelatorio, resumoRelatorioVazio } from '../relatorios';
import { dadosInvalidos, naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';

function ausente(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

export function buscarResumoRelatorio(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();

  const { granularidade: granularidadeInformada, inicio } = requisicao.consulta;
  const granularidade = ausente(granularidadeInformada) ? GRANULARIDADE_INICIAL : lerGranularidade(granularidadeInformada);
  if (!granularidade) {
    return dadosInvalidos([
      { campo: 'granularidade', mensagem: `Use uma destas granularidades: ${granularidadesRelatorio.join(', ')}.` },
    ]);
  }

  const periodo = ausente(inicio) ? ultimoPeriodoFechado(granularidade, agora) : lerPeriodo({ granularidade, inicio }, agora);
  if (!periodo) {
    return dadosInvalidos([
      {
        campo: 'inicio',
        mensagem: `Use o primeiro dia de um período já encerrado, dentro dos últimos ${MESES_DE_HISTORICO} meses, no formato AAAA-MM-DD.`,
      },
    ]);
  }

  return ok(dadosVazios() ? resumoRelatorioVazio(periodo) : gerarResumoRelatorio(periodo));
}
