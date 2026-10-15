import { DatabaseZap, Rows3, Timer, Workflow } from 'lucide-react';
import { GradeIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { IndicadorNumerico } from '@/componentes/dashboard/IndicadorNumerico';
import type { NoPlanoDTO, OperacaoPlano, PlanoExecucaoDTO } from '@/modelos/planos';
import { BYTES_POR_BLOCO, linhasDevolvidas, linhasEsperadas, registroDoPlano } from '@/regras/planoExecucao';
import {
  formatarDecimal,
  formatarNumero,
  formatarPercentual,
  formatarQuantidade,
  medirDuracao,
  pluralizar,
} from '@/utilitarios/formatacao';

const BYTES_POR_MB = 1024 * 1024;
const BYTES_POR_KB = 1024;
const CASAS_DO_PLANEJAMENTO_ATE_MS = 10;

const rotuloDaGravacao: Record<OperacaoPlano, string> = {
  INSERT: 'Linhas inseridas',
  UPDATE: 'Linhas atualizadas',
  DELETE: 'Linhas apagadas',
};

function etapaDasLinhas(raiz: NoPlanoDTO): { etapa: NoPlanoDTO; rotulo: string } {
  const gravadas = raiz.tipo === 'ModifyTable' && raiz.operacao ? raiz.filhos[0] : undefined;
  if (gravadas && raiz.operacao) return { etapa: gravadas, rotulo: rotuloDaGravacao[raiz.operacao] };
  return { etapa: raiz, rotulo: 'Linhas devolvidas' };
}

function medirTamanho(bytes: number): { valor: number; casas: number; unidade: string } {
  if (bytes >= BYTES_POR_MB) return { valor: Math.round((bytes / BYTES_POR_MB) * 10) / 10, casas: 1, unidade: 'MB' };
  return { valor: Math.round((bytes / BYTES_POR_KB) * 10) / 10, casas: 1, unidade: 'kB' };
}

export function IndicadoresPlano({ plano }: { plano: PlanoExecucaoDTO }) {
  const execucao = medirDuracao(plano.tempoExecucaoMs);
  const planejamento =
    plano.tempoPlanejamentoMs < CASAS_DO_PLANEJAMENTO_ATE_MS
      ? { valor: Math.round(plano.tempoPlanejamentoMs * 100) / 100, casas: 2, unidade: 'ms' }
      : medirDuracao(plano.tempoPlanejamentoMs);
  const { emCache, lidos } = plano.raiz.buffers;
  const blocos = emCache + lidos;
  const lido = medirTamanho(blocos * BYTES_POR_BLOCO);
  const linhas = etapaDasLinhas(plano.raiz);
  const devolvidas = linhasDevolvidas(linhas.etapa);
  const esperadas = linhasEsperadas(linhas.etapa);
  const parteDoCache = blocos > 0 ? (emCache / blocos) * 100 : 100;
  const planejamentoNaExecucao = plano.tempoExecucaoMs > 0 ? (plano.tempoPlanejamentoMs / plano.tempoExecucaoMs) * 100 : 0;

  return (
    <section aria-labelledby="titulo-indicadores-plano">
      <h2 className="visualmente-oculto" id="titulo-indicadores-plano">
        Números da execução registrada
      </h2>
      <GradeIndicadores>
        <IndicadorNumerico
          icone={Timer}
          rotulo="Tempo de execução"
          valor={execucao.valor}
          casasDecimais={execucao.casas}
          formatar={(valor) => formatarDecimal(valor, execucao.casas)}
          unidade={execucao.unidade}
          contexto={registroDoPlano(plano)}
        />
        <IndicadorNumerico
          icone={Workflow}
          rotulo="Tempo de planejamento"
          valor={planejamento.valor}
          casasDecimais={planejamento.casas}
          formatar={(valor) => formatarDecimal(valor, planejamento.casas)}
          unidade={planejamento.unidade}
          contexto={
            <>
              {planejamentoNaExecucao < 0.1 ? 'Menos de ' : 'Equivale a '}
              <span className="numeros">{formatarPercentual(Math.max(0.1, planejamentoNaExecucao))}</span> da execução
            </>
          }
        />
        <IndicadorNumerico
          icone={Rows3}
          rotulo={linhas.rotulo}
          valor={devolvidas}
          formatar={formatarQuantidade}
          contexto={
            <>
              O planejador esperava <span className="numeros">{formatarNumero(esperadas)}</span>{' '}
              {pluralizar(esperadas, 'linha', 'linhas')}
            </>
          }
        />
        <IndicadorNumerico
          icone={DatabaseZap}
          rotulo="Dados lidos"
          valor={lido.valor}
          casasDecimais={lido.casas}
          formatar={(valor) => formatarDecimal(valor, lido.casas)}
          unidade={lido.unidade}
          contexto={
            <>
              <span className="numeros">{formatarPercentual(parteDoCache)}</span> já estavam no cache
            </>
          }
        />
      </GradeIndicadores>
    </section>
  );
}
