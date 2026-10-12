import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLarguraElemento } from '@/ganchos/useLarguraElemento';
import type { PontoAtividadeDTO } from '@/modelos/dashboard';
import type { GranularidadeRelatorio } from '@/modelos/relatorios';
import {
  formatarDiaMes,
  formatarDiaSemana,
  formatarDuracaoMs,
  formatarHorario,
  formatarNumero,
  formatarNumeroCompacto,
} from '@/utilitarios/formatacao';
import { marcasDoEixo, prefereMovimentoReduzido } from '@/utilitarios/graficos';
import estilos from './GraficoEvolucao.module.css';

interface GraficoEvolucaoProps {
  pontos: PontoAtividadeDTO[];
  granularidade: GranularidadeRelatorio;
}

interface FormatoGranularidade {
  eixo: (instante: string) => string;
  completo: (instante: string) => string;
  cabecalhoTabela: string;
}

interface PosicaoRotulo {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  index?: number;
}

type Medida = 'consultas' | 'tempoMedioMs';

const ALTURA_VOLUME_PX = 190;
const ALTURA_TEMPO_PX = 180;
const LARGURA_EIXO_PX = 52;
const ESPESSURA_MAXIMA_BARRA_PX = 24;
const RAIO_BARRA_PX = 4;
const RAIO_MARCADOR_PX = 4;
const RESPIRO_ROTULO_PX = 8;
const SINCRONIA = 'evolucao-relatorio';
const margem = { top: 26, right: 8, bottom: 0, left: 0 };

function descreverDia(instante: string): string {
  return `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}`;
}

const formatos: Record<GranularidadeRelatorio, FormatoGranularidade> = {
  DIA: {
    eixo: formatarHorario,
    completo: (instante) => `A partir de ${formatarHorario(instante)}, por 1 hora`,
    cabecalhoTabela: 'Hora',
  },
  SEMANA: {
    eixo: (instante) => `${formatarDiaSemana(instante)} ${formatarDiaMes(instante)}`,
    completo: descreverDia,
    cabecalhoTabela: 'Dia',
  },
  MES: {
    eixo: formatarDiaMes,
    completo: descreverDia,
    cabecalhoTabela: 'Dia',
  },
};

function encontrarPico(pontos: PontoAtividadeDTO[], medida: Medida): number {
  return pontos.reduce((maior, ponto, indice) => (ponto[medida] > (pontos[maior]?.[medida] ?? 0) ? indice : maior), 0);
}

function DicaEvolucao({
  active,
  payload,
  formato,
  children,
}: TooltipProps<number, string> & { formato: FormatoGranularidade; children: (ponto: PontoAtividadeDTO) => ReactNode }) {
  const ponto = payload?.[0]?.payload as PontoAtividadeDTO | undefined;
  if (!active || !ponto) return null;

  return (
    <div className={estilos.dica}>
      <span className={estilos.dicaRotulo}>{formato.completo(ponto.instante)}</span>
      <span className={estilos.dicaLinha}>
        <span className={estilos.dicaMarca} aria-hidden="true" />
        {children(ponto)}
      </span>
    </div>
  );
}

export function GraficoEvolucao({ pontos, granularidade }: GraficoEvolucaoProps) {
  const idResumo = useId();
  const idGradiente = useId();
  const areaTempoRef = useRef<HTMLDivElement>(null);
  const larguraTempo = useLarguraElemento(areaTempoRef);
  const formato = formatos[granularidade];
  const indicePicoVolume = encontrarPico(pontos, 'consultas');
  const picoVolume = pontos[indicePicoVolume];
  const picoTempo = pontos[encontrarPico(pontos, 'tempoMedioMs')];
  if (!picoVolume || !picoTempo) return null;

  const marcasVolume = marcasDoEixo(picoVolume.consultas);
  const marcasTempo = marcasDoEixo(picoTempo.tempoMedioMs);
  const animar = !prefereMovimentoReduzido();
  const larguraDoPlano = Math.max(0, larguraTempo - LARGURA_EIXO_PX - margem.left - margem.right);
  const meiaFaixa = larguraDoPlano / pontos.length / 2;

  const rotularPicoVolume = ({ x, y, width, index }: PosicaoRotulo) =>
    index === indicePicoVolume ? (
      <text
        x={Number(x) + Number(width) / 2}
        y={Number(y) - RESPIRO_ROTULO_PX}
        textAnchor="middle"
        className={estilos.rotuloPico}
      >
        Pico: {formatarNumeroCompacto(picoVolume.consultas)}
      </text>
    ) : null;

  return (
    <figure className={estilos.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Consultas executadas e tempo médio de execução ao longo do período. Maior volume:{' '}
        {formatarNumero(picoVolume.consultas)} consultas ({formato.completo(picoVolume.instante)}). Maior tempo médio:{' '}
        {formatarDuracaoMs(picoTempo.tempoMedioMs)} ({formato.completo(picoTempo.instante)}).
      </figcaption>

      <div className={estilos.grafico}>
        <p className={estilos.titulo}>Consultas executadas</p>
        <div className={estilos.area} style={{ height: ALTURA_VOLUME_PX }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pontos} margin={margem} syncId={SINCRONIA}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="instante" hide />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickFormatter={formatarNumeroCompacto}
                ticks={marcasVolume}
                domain={[0, marcasVolume[marcasVolume.length - 1] ?? 'auto']}
                width={LARGURA_EIXO_PX}
                tickMargin={6}
              />
              <Tooltip
                cursor={{ className: estilos.faixaCursor }}
                content={
                  <DicaEvolucao formato={formato}>
                    {(ponto) => (
                      <>
                        <span className={estilos.dicaValor}>{formatarNumero(ponto.consultas)}</span> consultas
                      </>
                    )}
                  </DicaEvolucao>
                }
                isAnimationActive={false}
              />
              <Bar
                dataKey="consultas"
                name="Consultas"
                className={estilos.barras}
                maxBarSize={ESPESSURA_MAXIMA_BARRA_PX}
                radius={[RAIO_BARRA_PX, RAIO_BARRA_PX, 0, 0]}
                isAnimationActive={animar}
                animationDuration={480}
              >
                <LabelList dataKey="consultas" content={rotularPicoVolume} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={estilos.grafico}>
        <p className={estilos.titulo}>Tempo médio de execução</p>
        <div ref={areaTempoRef} className={estilos.area} style={{ height: ALTURA_TEMPO_PX }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pontos} margin={margem} syncId={SINCRONIA}>
              <defs>
                <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" className={estilos.gradienteTopo} />
                  <stop offset="100%" className={estilos.gradienteBase} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="instante"
                padding={{ left: meiaFaixa, right: meiaFaixa }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formato.eixo}
                interval="equidistantPreserveStart"
                tickMargin={10}
                height={30}
                minTickGap={24}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(valor: number) => formatarNumero(valor)}
                ticks={marcasTempo}
                domain={[0, marcasTempo[marcasTempo.length - 1] ?? 'auto']}
                width={LARGURA_EIXO_PX}
                tickMargin={6}
                unit=" ms"
              />
              <Tooltip
                cursor={{ className: estilos.linhaCursor }}
                content={
                  <DicaEvolucao formato={formato}>
                    {(ponto) => (
                      <>
                        <span className={estilos.dicaValor}>{formatarDuracaoMs(ponto.tempoMedioMs)}</span> de tempo médio
                      </>
                    )}
                  </DicaEvolucao>
                }
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="tempoMedioMs"
                name="Tempo médio"
                strokeWidth={2}
                fill={`url(#${idGradiente})`}
                className={estilos.serie}
                activeDot={{ r: 5, strokeWidth: 2, className: estilos.marcador }}
                isAnimationActive={animar}
                animationDuration={480}
              />
              <ReferenceDot
                x={picoTempo.instante}
                y={picoTempo.tempoMedioMs}
                r={RAIO_MARCADOR_PX}
                strokeWidth={2}
                className={estilos.marcador}
                label={{
                  value: `Pico: ${formatarDuracaoMs(picoTempo.tempoMedioMs)}`,
                  position: 'top',
                  offset: RESPIRO_ROTULO_PX,
                  className: estilos.rotuloPico,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="visualmente-oculto">
        <table>
          <caption>Consultas executadas e tempo médio de execução ao longo do período</caption>
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
