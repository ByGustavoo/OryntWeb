import { Activity, Plug, Timer, TriangleAlert } from 'lucide-react';
import { ConteudoAssincrono } from '@/componentes/ui';
import type { ResultadoAssincrono } from '@/ganchos/useDadosAssincronos';
import type { IndicadoresDashboardDTO } from '@/modelos/dashboard';
import { caminhos } from '@/rotas/caminhos';
import { formatarDecimal, formatarNumero, formatarQuantidade, pluralizar } from '@/utilitarios/formatacao';
import { EsqueletoIndicadores, GradeIndicadores } from './GradeIndicadores';
import { IndicadorNumerico } from './IndicadorNumerico';
import { MedidorOcupacao } from './MedidorOcupacao';
import { VariacaoIndicador } from './VariacaoIndicador';
import estilos from './ResumoIndicadores.module.css';

interface ResumoIndicadoresProps {
  resultado: ResultadoAssincrono<IndicadoresDashboardDTO>;
}

export function ResumoIndicadores({ resultado }: ResumoIndicadoresProps) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-indicadores" aria-busy={resultado.carregando}>
      <h2 className="visualmente-oculto" id="titulo-indicadores">
        Indicadores do período
      </h2>
      <ConteudoAssincrono
        resultado={resultado}
        esqueleto={<EsqueletoIndicadores />}
        tituloErro="Não foi possível carregar os indicadores"
        revelar={false}
      >
        {(indicadores) => (
          <GradeIndicadores>
            <IndicadorNumerico
              icone={Activity}
              rotulo="Consultas executadas"
              valor={indicadores.totalConsultas}
              formatar={formatarQuantidade}
              contexto={<VariacaoIndicador valor={indicadores.variacaoTotalConsultas} favoravel="ALTA" />}
            />
            <IndicadorNumerico
              icone={Timer}
              rotulo="Tempo médio de execução"
              valor={indicadores.tempoMedioMs}
              casasDecimais={1}
              formatar={(valor) => formatarDecimal(valor, 1)}
              unidade="ms"
              contexto={<VariacaoIndicador valor={indicadores.variacaoTempoMedio} favoravel="QUEDA" />}
            />
            <IndicadorNumerico
              icone={TriangleAlert}
              rotulo="Consultas lentas"
              valor={indicadores.consultasLentas}
              formatar={formatarNumero}
              tom={indicadores.consultasLentas > 0 ? 'aviso' : 'sucesso'}
              destino={
                indicadores.consultasLentas > 0
                  ? {
                      para: caminhos.consultasTodas,
                      estado: { lista: { periodo: indicadores.periodo, desempenho: 'LENTA' } },
                      descricao: 'ver quais são, na lista de consultas',
                    }
                  : undefined
              }
              contexto={`de ${formatarNumero(indicadores.consultasDistintas)} ${pluralizar(indicadores.consultasDistintas, 'consulta distinta', 'consultas distintas')}`}
            />
            <IndicadorNumerico
              icone={Plug}
              rotulo="Conexões ativas"
              valor={indicadores.conexoesAtivas}
              formatar={formatarNumero}
              contexto={
                <MedidorOcupacao valor={indicadores.conexoesAtivas} limite={indicadores.limiteConexoes}>
                  de {formatarNumero(indicadores.limiteConexoes)} permitidas
                </MedidorOcupacao>
              }
            />
          </GradeIndicadores>
        )}
      </ConteudoAssincrono>
    </section>
  );
}
