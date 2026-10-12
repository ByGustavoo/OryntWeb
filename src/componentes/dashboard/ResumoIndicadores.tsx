import { Activity, ArrowDownRight, ArrowUpRight, Cable, Minus, Timer, TriangleAlert } from 'lucide-react';
import { ConteudoAssincrono, Esqueleto } from '@/componentes/ui';
import type { ResultadoAssincrono } from '@/ganchos/useDadosAssincronos';
import type { IndicadoresDashboardDTO } from '@/modelos/dashboard';
import {
  formatarDecimal,
  formatarNumero,
  formatarNumeroCompacto,
  formatarVariacao,
  pluralizar,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { IndicadorNumerico } from './IndicadorNumerico';
import estilos from './ResumoIndicadores.module.css';

interface ResumoIndicadoresProps {
  resultado: ResultadoAssincrono<IndicadoresDashboardDTO>;
}

const LIMITE_NUMERO_COMPACTO = 1_000_000;
const QUANTIDADE_INDICADORES = 4;

function formatarTotal(valor: number): string {
  return valor >= LIMITE_NUMERO_COMPACTO ? formatarNumeroCompacto(valor) : formatarNumero(valor);
}

function Variacao({ valor, menorMelhor = false }: { valor: number | null; menorMelhor?: boolean }) {
  if (valor === null) return <>Sem período anterior para comparar</>;
  const Icone = valor > 0 ? ArrowUpRight : valor < 0 ? ArrowDownRight : Minus;
  const tom = menorMelhor && valor !== 0 ? (valor < 0 ? estilos.melhora : estilos.piora) : undefined;
  return (
    <span className={estilos.variacao}>
      <Icone size={13} strokeWidth={2.25} aria-hidden="true" className={tom} />
      <span>
        <span className={juntarClasses('numeros', tom)}>{formatarVariacao(valor)}</span> em relação ao período anterior
      </span>
    </span>
  );
}

function EsqueletoIndicadores() {
  return (
    <div className={estilos.grade} role="status" aria-label="Carregando os indicadores…">
      {Array.from({ length: QUANTIDADE_INDICADORES }, (_, indice) => (
        <div className={estilos.esqueleto} key={indice}>
          <Esqueleto largura="55%" altura={14} />
          <Esqueleto largura="45%" altura={30} raio="var(--raio-sm)" />
          <Esqueleto largura="75%" altura={11} />
        </div>
      ))}
    </div>
  );
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
      >
        {(indicadores) => {
          const ocupacao =
            indicadores.limiteConexoes > 0 ? (indicadores.conexoesAtivas / indicadores.limiteConexoes) * 100 : 0;
          return (
            <dl className={estilos.grade}>
              <IndicadorNumerico
                icone={Activity}
                rotulo="Consultas executadas"
                valor={indicadores.totalConsultas}
                formatar={formatarTotal}
                contexto={<Variacao valor={indicadores.variacaoTotalConsultas} />}
              />
              <IndicadorNumerico
                icone={Timer}
                rotulo="Tempo médio de execução"
                valor={indicadores.tempoMedioMs}
                casasDecimais={1}
                formatar={(valor) => formatarDecimal(valor, 1)}
                unidade="ms"
                contexto={<Variacao valor={indicadores.variacaoTempoMedio} menorMelhor />}
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
                icone={Cable}
                rotulo="Conexões ativas"
                valor={indicadores.conexoesAtivas}
                formatar={formatarNumero}
                contexto={
                  <span className={estilos.ocupacao}>
                    <span className={estilos.trilho} aria-hidden="true">
                      <span className={estilos.preenchimento} style={{ width: `${Math.min(100, ocupacao)}%` }} />
                    </span>
                    de {formatarNumero(indicadores.limiteConexoes)} permitidas
                  </span>
                }
              />
            </dl>
          );
        }}
      </ConteudoAssincrono>
    </section>
  );
}
