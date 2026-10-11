import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
import estilos from './GraficoAtividade.module.css';

interface GraficoAtividadeProps {
  pontos: PontoAtividadeDTO[];
  periodo: PeriodoDashboard;
}

interface FormatoPeriodo {
  eixo: (instante: string) => string;
  completo: (instante: string) => string;
  cabecalhoTabela: string;
}

const ALTURA_GRAFICO_PX = 260;

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

const INTERVALOS_DO_EIXO = 4;
const PASSOS_REDONDOS = [1, 2, 2.5, 5, 10];

function marcasDoEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  const passoBruto = maximo / INTERVALOS_DO_EIXO;
  const grandeza = 10 ** Math.floor(Math.log10(passoBruto));
  const fator = PASSOS_REDONDOS.find((candidato) => candidato * grandeza >= passoBruto) ?? 10;
  const passo = Math.max(1, fator * grandeza);
  const quantidade = Math.ceil(maximo / passo);
  return Array.from({ length: quantidade + 1 }, (_, indice) => indice * passo);
}

function prefereMovimentoReduzido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

  return (
    <figure className={estilos.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Consultas executadas ao longo do tempo. {resumir(pontos, periodo, formato)}
      </figcaption>

      <div className={estilos.area} style={{ height: ALTURA_GRAFICO_PX }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              isAnimationActive={!prefereMovimentoReduzido()}
              animationDuration={480}
            />
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
