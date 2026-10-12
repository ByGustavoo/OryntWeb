import { useId } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { GranularidadeRelatorio } from '@/modelos/relatorios';
import { variacaoEntre } from '@/regras/comparacaoRelatorio';
import type { PontoComparado, RotulosDaComparacao } from '@/regras/comparacaoRelatorio';
import { nomeDoDia } from '@/regras/periodoRelatorio';
import {
  formatarDiaMes,
  formatarDiaSemana,
  formatarDuracaoMs,
  formatarHorario,
  formatarNumero,
  formatarNumeroCompacto,
  formatarVariacao,
  iniciarComMaiuscula,
} from '@/utilitarios/formatacao';
import { marcasDoEixo, prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilosEvolucao from './GraficoEvolucao.module.css';
import estilos from './GraficoComparacao.module.css';

interface GraficoComparacaoProps {
  pontos: PontoComparado[];
  granularidade: GranularidadeRelatorio;
  rotulos: RotulosDaComparacao;
  titulos: RotulosDaComparacao;
}

interface FormatoGranularidade {
  eixo: (ponto: PontoComparado) => string;
  completo: (ponto: PontoComparado) => string;
  data: (instante: string) => string;
  cabecalhoTabela: string;
}

interface Medida {
  titulo: string;
  nome: string;
  principal: 'consultasPrincipal' | 'tempoMedioPrincipal';
  base: 'consultasBase' | 'tempoMedioBase';
  alturaPx: number;
  unidadeDoEixo?: string;
  formatarEixo: (valor: number) => string;
  formatarValor: (valor: number) => string;
  complemento?: string;
}

const LARGURA_EIXO_PX = 52;
const RESPIRO_LATERAL_PX = 16;
const SINCRONIA = 'comparacao-relatorio';
const margem = { top: 12, right: 8, bottom: 0, left: 0 };

const medidas: Medida[] = [
  {
    titulo: 'Consultas executadas',
    nome: 'Consultas',
    principal: 'consultasPrincipal',
    base: 'consultasBase',
    alturaPx: 180,
    formatarEixo: formatarNumeroCompacto,
    formatarValor: formatarNumero,
    complemento: 'consultas',
  },
  {
    titulo: 'Tempo médio de execução',
    nome: 'Tempo médio',
    principal: 'tempoMedioPrincipal',
    base: 'tempoMedioBase',
    alturaPx: 200,
    unidadeDoEixo: ' ms',
    formatarEixo: formatarNumero,
    formatarValor: formatarDuracaoMs,
  },
];

function instanteDoPonto(ponto: PontoComparado): string {
  return ponto.instantePrincipal ?? ponto.instanteBase ?? '';
}

const formatos: Record<GranularidadeRelatorio, FormatoGranularidade> = {
  DIA: {
    eixo: (ponto) => formatarHorario(instanteDoPonto(ponto)),
    completo: (ponto) => `A partir de ${formatarHorario(instanteDoPonto(ponto))}, por 1 hora`,
    data: formatarDiaMes,
    cabecalhoTabela: 'Hora',
  },
  SEMANA: {
    eixo: (ponto) => formatarDiaSemana(instanteDoPonto(ponto)),
    completo: (ponto) => iniciarComMaiuscula(nomeDoDia(new Date(instanteDoPonto(ponto)))),
    data: formatarDiaMes,
    cabecalhoTabela: 'Dia da semana',
  },
  MES: {
    eixo: (ponto) => String(ponto.posicao + 1),
    completo: (ponto) => `Dia ${ponto.posicao + 1} do mês`,
    data: (instante) => formatarDiaSemana(instante) + ' ' + formatarDiaMes(instante),
    cabecalhoTabela: 'Dia do mês',
  },
};

function maiorValor(pontos: PontoComparado[], medida: Medida): number {
  return pontos.reduce((maior, ponto) => Math.max(maior, ponto[medida.principal] ?? 0, ponto[medida.base] ?? 0), 0);
}

function LinhaDaDica({
  instante,
  valor,
  medida,
  formato,
  base = false,
}: {
  instante: string | null;
  valor: number | null;
  medida: Medida;
  formato: FormatoGranularidade;
  base?: boolean;
}) {
  if (instante === null || valor === null) return null;
  return (
    <span className={estilosEvolucao.dicaLinha}>
      <span className={juntarClasses(estilos.traco, base && estilos.tracoBase)} aria-hidden="true" />
      <span className={estilos.dicaData}>{formato.data(instante)}</span>
      <span>
        <span className={estilosEvolucao.dicaValor}>{medida.formatarValor(valor)}</span>
        {medida.complemento ? ` ${medida.complemento}` : null}
      </span>
    </span>
  );
}

function DicaComparacao({
  active,
  payload,
  formato,
  medida,
}: TooltipProps<number, string> & { formato: FormatoGranularidade; medida: Medida }) {
  const ponto = payload?.[0]?.payload as PontoComparado | undefined;
  if (!active || !ponto) return null;
  const principal = ponto[medida.principal];
  const base = ponto[medida.base];
  const variacao = principal !== null && base !== null ? variacaoEntre(principal, base) : null;

  return (
    <div className={estilosEvolucao.dica}>
      <span className={estilosEvolucao.dicaRotulo}>{formato.completo(ponto)}</span>
      <LinhaDaDica instante={ponto.instantePrincipal} valor={principal} medida={medida} formato={formato} />
      <LinhaDaDica instante={ponto.instanteBase} valor={base} medida={medida} formato={formato} base />
      {variacao === null ? null : (
        <span className={estilos.dicaVariacao}>
          Diferença de <span className="numeros">{formatarVariacao(variacao)}</span>
        </span>
      )}
    </div>
  );
}

export function GraficoComparacao({ pontos, granularidade, rotulos, titulos }: GraficoComparacaoProps) {
  const idResumo = useId();
  const formato = formatos[granularidade];
  const animar = !prefereMovimentoReduzido();
  const ultimaMedida = medidas[medidas.length - 1];
  if (pontos.length === 0) return null;

  return (
    <figure className={estilosEvolucao.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Consultas executadas e tempo médio de execução, ponto a ponto, em {rotulos.principal} e em {rotulos.base}. Os
        valores estão na tabela logo depois dos gráficos.
      </figcaption>

      <ul className={estilos.legenda} aria-label="Legenda">
        <li className={estilos.itemLegenda}>
          <span className={estilos.traco} aria-hidden="true" />
          {titulos.principal}
        </li>
        <li className={estilos.itemLegenda}>
          <span className={juntarClasses(estilos.traco, estilos.tracoBase)} aria-hidden="true" />
          {titulos.base}
        </li>
      </ul>

      {medidas.map((medida) => {
        const marcas = marcasDoEixo(maiorValor(pontos, medida));
        const comEixo = medida === ultimaMedida;

        return (
          <div className={estilosEvolucao.grafico} key={medida.principal}>
            <p className={estilosEvolucao.titulo}>{medida.titulo}</p>
            <div className={estilosEvolucao.area} style={{ height: medida.alturaPx }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pontos} margin={margem} syncId={SINCRONIA}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="posicao"
                    hide={!comEixo}
                    padding={{ left: RESPIRO_LATERAL_PX, right: RESPIRO_LATERAL_PX }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(posicao: number) => {
                      const ponto = pontos[posicao];
                      return ponto ? formato.eixo(ponto) : '';
                    }}
                    interval="equidistantPreserveStart"
                    tickMargin={10}
                    height={30}
                    minTickGap={20}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tickFormatter={medida.formatarEixo}
                    ticks={marcas}
                    domain={[0, marcas[marcas.length - 1] ?? 'auto']}
                    width={LARGURA_EIXO_PX}
                    tickMargin={6}
                    unit={medida.unidadeDoEixo}
                  />
                  <Tooltip
                    cursor={{ className: estilosEvolucao.linhaCursor }}
                    content={<DicaComparacao formato={formato} medida={medida} />}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={medida.base}
                    name={`${medida.nome}, ${rotulos.base}`}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, className: estilos.marcadorBase }}
                    className={estilos.serieBase}
                    isAnimationActive={animar}
                    animationDuration={480}
                  />
                  <Line
                    type="monotone"
                    dataKey={medida.principal}
                    name={`${medida.nome}, ${rotulos.principal}`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, className: estilos.marcadorPrincipal }}
                    className={estilos.seriePrincipal}
                    isAnimationActive={animar}
                    animationDuration={480}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}

      <div className="visualmente-oculto">
        <table>
          <caption>Consultas executadas e tempo médio de execução nos dois períodos</caption>
          <thead>
            <tr>
              <th scope="col">{formato.cabecalhoTabela}</th>
              <th scope="col">Consultas em {rotulos.principal}</th>
              <th scope="col">Consultas em {rotulos.base}</th>
              <th scope="col">Tempo médio em {rotulos.principal}</th>
              <th scope="col">Tempo médio em {rotulos.base}</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((ponto) => (
              <tr key={ponto.posicao}>
                <th scope="row">{formato.completo(ponto)}</th>
                <td>{ponto.consultasPrincipal === null ? 'Sem dados' : formatarNumero(ponto.consultasPrincipal)}</td>
                <td>{ponto.consultasBase === null ? 'Sem dados' : formatarNumero(ponto.consultasBase)}</td>
                <td>{ponto.tempoMedioPrincipal === null ? 'Sem dados' : formatarDuracaoMs(ponto.tempoMedioPrincipal)}</td>
                <td>{ponto.tempoMedioBase === null ? 'Sem dados' : formatarDuracaoMs(ponto.tempoMedioBase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
