import { useId } from 'react';
import type { CSSProperties } from 'react';
import { Area, AreaChart, CartesianGrid, Customized, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { PeriodoDashboard, PontoAtividadeDTO } from '@/modelos/dashboard';
import { descricaoPeriodo } from '@/modelos/rotulos';
import {
  formatarDiaMes,
  formatarDiaSemana,
  formatarDuracaoMs,
  formatarHorario,
  formatarNumero,
  formatarNumeroCompacto,
} from '@/utilitarios/formatacao';
import { marcasDoEixo } from '@/utilitarios/graficos';
import estilos from './GraficoAtividade.module.css';

interface GraficoAtividadeProps {
  pontos: PontoAtividadeDTO[];
  periodo: PeriodoDashboard;
}

interface AreaDeTracado {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

interface FormatoPeriodo {
  eixo: (instante: string) => string;
  completo: (instante: string) => string;
  cabecalhoTabela: string;
}

const ALTURA_GRAFICO_PX = 260;
const LARGURA_MAXIMA_RASTRO_PX = 128;
const PROPORCAO_RASTRO = 0.3;

const formatos: Record<PeriodoDashboard, FormatoPeriodo> = {
  ULTIMA_HORA: {
    eixo: formatarHorario,
    completo: (instante) => `A partir de ${formatarHorario(instante)}, por 5 minutos`,
    cabecalhoTabela: 'Intervalo de 5 minutos',
  },
  ULTIMAS_24_HORAS: {
    eixo: formatarHorario,
    completo: (instante) => `${formatarDiaMes(instante)}, a partir de ${formatarHorario(instante)}, por 1 hora`,
    cabecalhoTabela: 'Hora',
  },
  ULTIMOS_7_DIAS: {
    eixo: (instante) => `${formatarDiaSemana(instante)} ${formatarDiaMes(instante)}`,
    completo: (instante) =>
      `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}, a partir de ${formatarHorario(instante)}, por 6 horas`,
    cabecalhoTabela: 'Intervalo de 6 horas',
  },
  ULTIMOS_30_DIAS: {
    eixo: formatarDiaMes,
    completo: (instante) => `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}`,
    cabecalhoTabela: 'Dia',
  },
};

function DicaAtividade({ active, payload, formato }: TooltipProps<number, string> & { formato: FormatoPeriodo }) {
  const ponto = payload?.[0]?.payload as PontoAtividadeDTO | undefined;
  if (!active || !ponto) return null;

  return (
    <div className={estilos.dica}>
      <span className={estilos.dicaRotulo}>{formato.completo(ponto.instante)}</span>
      <span className={estilos.dicaLinha}>
        <span className={estilos.dicaMarca} aria-hidden="true" />
        <span className={estilos.dicaValor}>{formatarNumero(ponto.consultas)}</span> consultas
      </span>
      <span className={estilos.dicaLinha}>
        <span className={estilos.dicaValor}>{formatarDuracaoMs(ponto.tempoMedioMs)}</span> de tempo médio
      </span>
    </div>
  );
}

function FioDeLeitura({ offset }: { offset?: AreaDeTracado }) {
  const idRecorte = useId();
  const idRastro = useId();
  const { left = 0, top = 0, width = 0, height = 0 } = offset ?? {};
  if (width <= 0 || height <= 0) return null;
  const rastro = Math.min(LARGURA_MAXIMA_RASTRO_PX, width * PROPORCAO_RASTRO);

  return (
    <g className={estilos.leitura} clipPath={`url(#${idRecorte})`}>
      <defs>
        <clipPath id={idRecorte}>
          <rect x={left} y={top} width={width + 1} height={height} />
        </clipPath>
        <linearGradient id={idRastro} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" className={estilos.rastroInicio} />
          <stop offset="62%" className={estilos.rastroMeio} />
          <stop offset="100%" className={estilos.rastroFim} />
        </linearGradient>
      </defs>
      <g className={estilos.fio} style={{ '--percurso': `${width}px` } as CSSProperties}>
        <rect x={left - rastro} y={top} width={rastro} height={height} fill={`url(#${idRastro})`} />
        <line x1={left} y1={top} x2={left} y2={top + height} />
      </g>
    </g>
  );
}

function resumir(pontos: PontoAtividadeDTO[], periodo: PeriodoDashboard, formato: FormatoPeriodo): string {
  const pico = pontos.reduce((maior, ponto) => (ponto.consultas > maior.consultas ? ponto : maior));
  const total = pontos.reduce((soma, ponto) => soma + ponto.consultas, 0);
  return `${formatarNumero(total)} consultas ${descricaoPeriodo[periodo]}. Maior volume: ${formatarNumero(pico.consultas)} consultas (${formato.completo(pico.instante)}).`;
}

export function GraficoAtividade({ pontos, periodo }: GraficoAtividadeProps) {
  const idResumo = useId();
  const idGradiente = useId();
  const formato = formatos[periodo];
  if (pontos.length === 0) return null;
  const marcas = marcasDoEixo(Math.max(...pontos.map((ponto) => ponto.consultas)));
  const leitura = `${pontos[0]?.instante}/${pontos.length}`;

  return (
    <figure className={estilos.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Consultas executadas ao longo do tempo. {resumir(pontos, periodo, formato)}
      </figcaption>

      <div className={estilos.area} style={{ height: ALTURA_GRAFICO_PX }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart key={leitura} data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={estilos.gradienteTopo} />
                <stop offset="100%" className={estilos.gradienteBase} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="instante"
              axisLine={false}
              tickLine={false}
              tickFormatter={formato.eixo}
              interval="equidistantPreserveStart"
              tickMargin={10}
              height={30}
              minTickGap={28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickFormatter={formatarNumeroCompacto}
              ticks={marcas}
              domain={[0, marcas[marcas.length - 1] ?? 'auto']}
              width={52}
              tickMargin={6}
            />
            <Tooltip
              cursor={{ className: estilos.cursor }}
              content={<DicaAtividade formato={formato} />}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="consultas"
              name="Consultas"
              strokeWidth={2}
              fill={`url(#${idGradiente})`}
              className={estilos.serie}
              activeDot={{ r: 5, strokeWidth: 2, className: estilos.pontoAtivo }}
              isAnimationActive={false}
            />
            <Customized component={FioDeLeitura} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="visualmente-oculto">
        <table>
          <caption>Consultas executadas {descricaoPeriodo[periodo]}</caption>
          <thead>
            <tr>
              <th scope="col">{formato.cabecalhoTabela}</th>
              <th scope="col">Consultas</th>
              <th scope="col">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((ponto) => (
              <tr key={ponto.instante}>
                <th scope="row">{formato.completo(ponto.instante)}</th>
                <td>{formatarNumero(ponto.consultas)}</td>
                <td>{formatarDuracaoMs(ponto.tempoMedioMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
