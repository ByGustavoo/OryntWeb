import type { ReactNode } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Minus, Plug, Timer, TriangleAlert } from 'lucide-react';
import { GradeIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { IndicadorNumerico } from '@/componentes/dashboard/IndicadorNumerico';
import type { SentidoFavoravel } from '@/componentes/dashboard/VariacaoIndicador';
import type { IndicadoresComparados, ValorComparado } from '@/regras/comparacaoRelatorio';
import {
  formatarComSinal,
  formatarDecimal,
  formatarNumero,
  formatarQuantidade,
  formatarVariacao,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './IndicadoresComparacao.module.css';

interface IndicadoresComparacaoProps {
  indicadores: IndicadoresComparados;
  rotuloBase: string;
}

interface MudancaProps {
  valor: ValorComparado;
  medida: 'PERCENTUAL' | 'ABSOLUTA';
  formatarBase: (valor: number) => string;
  rotuloBase: string;
  favoravel?: SentidoFavoravel;
  children?: ReactNode;
}

function descreverMudanca({ diferenca, variacao }: ValorComparado, medida: MudancaProps['medida']): string {
  if (medida === 'ABSOLUTA') return diferenca === 0 ? 'Sem mudança' : formatarComSinal(diferenca, formatarNumero);
  return variacao === null ? 'Sem comparação' : formatarVariacao(variacao);
}

function Mudanca({ valor, medida, formatarBase, rotuloBase, favoravel, children }: MudancaProps) {
  const sentido = medida === 'ABSOLUTA' ? valor.diferenca : (valor.variacao ?? 0);
  const Icone = sentido > 0 ? ArrowUpRight : sentido < 0 ? ArrowDownRight : Minus;
  const melhorou = sentido > 0 === (favoravel === 'ALTA');
  const tom = favoravel && sentido !== 0 ? (melhorou ? estilos.melhora : estilos.piora) : undefined;

  return (
    <span className={estilos.contexto}>
      <span className={juntarClasses(estilos.mudanca, tom)}>
        <Icone size={14} strokeWidth={2.25} aria-hidden="true" />
        <span className={sentido === 0 ? undefined : 'numeros'}>{descreverMudanca(valor, medida)}</span>
      </span>
      <span className={estilos.base}>
        <span className="visualmente-oculto">em relação a </span>
        <span className={estilos.traco} aria-hidden="true" />
        <span>
          <span className={`${estilos.valorBase} numeros`}>{formatarBase(valor.base)}</span> em {rotuloBase}
        </span>
      </span>
      {children}
    </span>
  );
}

export function IndicadoresComparacao({ indicadores, rotuloBase }: IndicadoresComparacaoProps) {
  const { totalConsultas, consultasPorDia, tempoMedioMs, consultasLentas, picoConexoes } = indicadores;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-indicadores-comparacao">
      <h2 className="visualmente-oculto" id="titulo-indicadores-comparacao">
        Indicadores dos dois períodos
      </h2>
      <GradeIndicadores>
        <IndicadorNumerico
          icone={Activity}
          rotulo="Consultas executadas"
          valor={totalConsultas.principal}
          formatar={formatarQuantidade}
          contexto={
            <Mudanca
              valor={totalConsultas}
              medida="PERCENTUAL"
              formatarBase={formatarQuantidade}
              rotuloBase={rotuloBase}
              favoravel="ALTA"
            >
              {consultasPorDia && consultasPorDia.variacao !== null ? (
                <span>
                  Por dia: <span className="numeros">{formatarVariacao(consultasPorDia.variacao)}</span>
                </span>
              ) : null}
            </Mudanca>
          }
        />
        <IndicadorNumerico
          icone={Timer}
          rotulo="Tempo médio de execução"
          valor={tempoMedioMs.principal}
          casasDecimais={1}
          formatar={(valor) => formatarDecimal(valor, 1)}
          unidade="ms"
          contexto={
            <Mudanca
              valor={tempoMedioMs}
              medida="PERCENTUAL"
              formatarBase={(valor) => `${formatarDecimal(valor, 1)} ms`}
              rotuloBase={rotuloBase}
              favoravel="QUEDA"
            />
          }
        />
        <IndicadorNumerico
          icone={TriangleAlert}
          rotulo="Consultas lentas"
          valor={consultasLentas.principal}
          formatar={formatarNumero}
          tom={consultasLentas.principal > 0 ? 'aviso' : 'sucesso'}
          contexto={
            <Mudanca
              valor={consultasLentas}
              medida="ABSOLUTA"
              formatarBase={formatarNumero}
              rotuloBase={rotuloBase}
              favoravel="QUEDA"
            />
          }
        />
        <IndicadorNumerico
          icone={Plug}
          rotulo="Pico de conexões"
          valor={picoConexoes.principal}
          formatar={formatarNumero}
          contexto={<Mudanca valor={picoConexoes} medida="ABSOLUTA" formatarBase={formatarNumero} rotuloBase={rotuloBase} />}
        />
      </GradeIndicadores>
    </section>
  );
}
