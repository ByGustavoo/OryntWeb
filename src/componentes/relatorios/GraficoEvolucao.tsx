import { useId, useRef } from 'react';
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
import { useLarguraElemento } from '@/ganchos/useLarguraElemento';
import { useLeituraDoGrafico } from '@/ganchos/useLeituraDoGrafico';
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
import { marcasDoEixo, posicionarRotulo, prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { LeituraDoGrafico } from './LeituraDoGrafico';
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

export function GraficoEvolucao({ pontos, granularidade }: GraficoEvolucaoProps) {
  const idResumo = useId();
  const idGradiente = useId();
  const areaTempoRef = useRef<HTMLDivElement>(null);
  const larguraTempo = useLarguraElemento(areaTempoRef);
  const formato = formatos[granularidade];
  const { lido, eventos } = useLeituraDoGrafico();
  const indicePicoVolume = encontrarPico(pontos, 'consultas');
  const picoVolume = pontos[indicePicoVolume];
  const picoTempo = pontos[encontrarPico(pontos, 'tempoMedioMs')];
  if (!picoVolume || !picoTempo) return null;
  const pontoLido = lido ? pontos[lido.indice] : undefined;
  const xLido = pontoLido && lido ? lido.x : null;

  const marcasVolume = marcasDoEixo(picoVolume.consultas);
  const marcasTempo = marcasDoEixo(picoTempo.tempoMedioMs);
  const animar = !prefereMovimentoReduzido();
  const larguraDoPlano = Math.max(0, larguraTempo - LARGURA_EIXO_PX - margem.left - margem.right);
  const meiaFaixa = larguraDoPlano / pontos.length / 2;

  const limitesDoPlano = {
    inicio: margem.left + LARGURA_EIXO_PX,
    fim: larguraTempo > 0 ? larguraTempo - margem.right : Number.POSITIVE_INFINITY,
  };

  const desenharRotuloDoPico = (texto: string, centro: number, meiaLarguraDaMarca: number, topo: number) => (
    <text
      {...posicionarRotulo(texto, centro, meiaLarguraDaMarca, limitesDoPlano)}
      y={topo - RESPIRO_ROTULO_PX}
      className={estilos.rotuloPico}
    >
      {texto}
    </text>
  );

  const rotularPicoVolume = ({ x, y, width, index }: PosicaoRotulo) =>
    index === indicePicoVolume
      ? desenharRotuloDoPico(
          `Pico: ${formatarNumeroCompacto(picoVolume.consultas)}`,
          Number(x) + Number(width) / 2,
          Number(width) / 2,
          Number(y),
        )
      : null;

  const rotularPicoTempo = ({ viewBox }: { viewBox?: PosicaoRotulo }) =>
    desenharRotuloDoPico(
      `Pico: ${formatarDuracaoMs(picoTempo.tempoMedioMs)}`,
      Number(viewBox?.x) + Number(viewBox?.width) / 2,
      RAIO_MARCADOR_PX,
      Number(viewBox?.y),
    );

  return (
    <figure className={estilos.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Consultas executadas e tempo médio de execução ao longo do período. Maior volume:{' '}
        {formatarNumero(picoVolume.consultas)} consultas ({formato.completo(picoVolume.instante)}). Maior tempo médio:{' '}
        {formatarDuracaoMs(picoTempo.tempoMedioMs)} ({formato.completo(picoTempo.instante)}).
      </figcaption>

      <div className={estilos.grafico}>
        <LeituraDoGrafico titulo="Consultas executadas" x={xLido}>
          {pontoLido ? (
            <>
              <span className={estilos.leituraRotulo}>{formato.completo(pontoLido.instante)}</span>
              <span>
                <span className={estilos.dicaValor}>{formatarNumero(pontoLido.consultas)}</span> consultas
              </span>
            </>
          ) : null}
        </LeituraDoGrafico>
        <div className={estilos.area} style={{ height: ALTURA_VOLUME_PX }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pontos} margin={margem} syncId={SINCRONIA} {...eventos}>
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
              <Tooltip cursor={{ className: estilos.faixaCursor }} content={() => null} isAnimationActive={false} />
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
        <LeituraDoGrafico titulo="Tempo médio de execução" x={xLido}>
          {pontoLido ? (
            <>
              <span className={estilos.leituraRotulo}>{formato.completo(pontoLido.instante)}</span>
              <span>
                <span className={estilos.dicaValor}>{formatarDuracaoMs(pontoLido.tempoMedioMs)}</span> de tempo médio
              </span>
            </>
          ) : null}
        </LeituraDoGrafico>
        <div ref={areaTempoRef} className={estilos.area} style={{ height: ALTURA_TEMPO_PX }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pontos} margin={margem} syncId={SINCRONIA} {...eventos}>
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
              <Tooltip cursor={{ className: estilos.linhaCursor }} content={() => null} isAnimationActive={false} />
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
                label={rotularPicoTempo}
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
