import { Activity, Plug, Timer, TriangleAlert } from 'lucide-react';
import { GradeIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { IndicadorNumerico } from '@/componentes/dashboard/IndicadorNumerico';
import { MedidorOcupacao } from '@/componentes/dashboard/MedidorOcupacao';
import { VariacaoIndicador } from '@/componentes/dashboard/VariacaoIndicador';
import type { GranularidadeRelatorio, IndicadoresRelatorioDTO } from '@/modelos/relatorios';
import { periodoAnteriorNaFrase } from '@/regras/periodoRelatorio';
import {
  formatarDecimal,
  formatarDiaMes,
  formatarDiaSemana,
  formatarHorario,
  formatarNumero,
  formatarQuantidade,
  pluralizar,
} from '@/utilitarios/formatacao';
import estilos from './IndicadoresRelatorio.module.css';

interface IndicadoresRelatorioProps {
  indicadores: IndicadoresRelatorioDTO;
  granularidade: GranularidadeRelatorio;
}

function descreverMomento(instante: string, granularidade: GranularidadeRelatorio): string {
  if (granularidade === 'DIA') return `às ${formatarHorario(instante)}`;
  return `${formatarDiaSemana(instante)} ${formatarDiaMes(instante)} às ${formatarHorario(instante)}`;
}

export function IndicadoresRelatorio({ indicadores, granularidade }: IndicadoresRelatorioProps) {
  const referencia = periodoAnteriorNaFrase[granularidade].comparado;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-indicadores-relatorio">
      <h2 className="visualmente-oculto" id="titulo-indicadores-relatorio">
        Indicadores do período
      </h2>
      <GradeIndicadores>
        <IndicadorNumerico
          icone={Activity}
          rotulo="Consultas executadas"
          valor={indicadores.totalConsultas}
          formatar={formatarQuantidade}
          contexto={
            <VariacaoIndicador valor={indicadores.variacaoTotalConsultas} referencia={referencia} favoravel="ALTA" />
          }
        />
        <IndicadorNumerico
          icone={Timer}
          rotulo="Tempo médio de execução"
          valor={indicadores.tempoMedioMs}
          casasDecimais={1}
          formatar={(valor) => formatarDecimal(valor, 1)}
          unidade="ms"
          contexto={<VariacaoIndicador valor={indicadores.variacaoTempoMedio} referencia={referencia} favoravel="QUEDA" />}
        />
        <IndicadorNumerico
          icone={TriangleAlert}
          rotulo="Consultas lentas"
          valor={indicadores.consultasLentas}
          formatar={formatarNumero}
          tom={indicadores.consultasLentas > 0 ? 'aviso' : 'sucesso'}
          contexto={`de ${formatarNumero(indicadores.consultasDistintas)} ${pluralizar(indicadores.consultasDistintas, 'consulta distinta', 'consultas distintas')}`}
        />
        <IndicadorNumerico
          icone={Plug}
          rotulo="Pico de conexões"
          valor={indicadores.picoConexoes}
          formatar={formatarNumero}
          contexto={
            <MedidorOcupacao valor={indicadores.picoConexoes} limite={indicadores.limiteConexoes}>
              de {formatarNumero(indicadores.limiteConexoes)} permitidas
              {indicadores.instantePicoConexoes ? (
                <>
                  , <span className={estilos.momento}>{descreverMomento(indicadores.instantePicoConexoes, granularidade)}</span>
                </>
              ) : null}
            </MedidorOcupacao>
          }
        />
      </GradeIndicadores>
    </section>
  );
}
