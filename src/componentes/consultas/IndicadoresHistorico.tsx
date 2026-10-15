import { Activity, ArrowUpToLine, ChartPie, Timer } from 'lucide-react';
import { GradeIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { IndicadorNumerico } from '@/componentes/dashboard/IndicadorNumerico';
import { VariacaoIndicador } from '@/componentes/dashboard/VariacaoIndicador';
import type { HistoricoConsultaDTO } from '@/modelos/consultas';
import { pontoDaExecucaoMaisLenta, textosDoIntervalo } from '@/regras/historicoConsulta';
import {
  formatarDecimal,
  formatarPercentual,
  formatarQuantidade,
  iniciarComMaiuscula,
  medirDuracao,
} from '@/utilitarios/formatacao';
import estilos from './IndicadoresHistorico.module.css';

export function IndicadoresHistorico({ historico }: { historico: HistoricoConsultaDTO }) {
  const { consulta, periodo, pontos } = historico;
  const medio = medirDuracao(consulta.tempoMedioMs);
  const maximo = medirDuracao(consulta.tempoMaximoMs);
  const total = medirDuracao(consulta.tempoTotalMs);
  const maisLenta = pontoDaExecucaoMaisLenta(pontos);

  return (
    <section className={estilos.secao} aria-labelledby="titulo-indicadores-historico">
      <h2 className="visualmente-oculto" id="titulo-indicadores-historico">
        Indicadores da consulta no período
      </h2>
      <GradeIndicadores>
        <IndicadorNumerico
          icone={Activity}
          rotulo="Execuções"
          valor={consulta.quantidadeExecucoes}
          formatar={formatarQuantidade}
          contexto={<VariacaoIndicador valor={historico.variacaoExecucoes} favoravel="ALTA" />}
        />
        <IndicadorNumerico
          icone={Timer}
          rotulo="Tempo médio"
          valor={medio.valor}
          casasDecimais={medio.casas}
          formatar={(valor) => formatarDecimal(valor, medio.casas)}
          unidade={medio.unidade}
          contexto={<VariacaoIndicador valor={historico.variacaoTempoMedio} favoravel="QUEDA" />}
        />
        <IndicadorNumerico
          icone={ArrowUpToLine}
          rotulo="Tempo máximo"
          valor={maximo.valor}
          casasDecimais={maximo.casas}
          formatar={(valor) => formatarDecimal(valor, maximo.casas)}
          unidade={maximo.unidade}
          contexto={
            maisLenta
              ? iniciarComMaiuscula(textosDoIntervalo[periodo].quando(maisLenta.instante))
              : 'A execução mais lenta do período'
          }
        />
        <IndicadorNumerico
          icone={ChartPie}
          rotulo="Tempo total"
          valor={total.valor}
          casasDecimais={total.casas}
          formatar={(valor) => formatarDecimal(valor, total.casas)}
          unidade={total.unidade}
          contexto={
            <>
              <span className="numeros">{formatarPercentual(consulta.percentualTempoTotal)}</span> do tempo do banco
            </>
          }
        />
      </GradeIndicadores>
    </section>
  );
}
