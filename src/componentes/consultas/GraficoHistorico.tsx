import { useId, useRef } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LeituraDoGrafico } from '@/componentes/relatorios/LeituraDoGrafico';
import estilos from '@/componentes/relatorios/GraficoEvolucao.module.css';
import { useLarguraElemento } from '@/ganchos/useLarguraElemento';
import { useLeituraDoGrafico } from '@/ganchos/useLeituraDoGrafico';
import type { PontoHistoricoDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { pontoComMaisExecucoes, pontoMaisLento, textosDoIntervalo } from '@/regras/historicoConsulta';
import { formatarDuracaoMs, formatarNumero, formatarNumeroCompacto, pluralizar } from '@/utilitarios/formatacao';
import { marcasDoEixo, posicionarRotulo, prefereMovimentoReduzido } from '@/utilitarios/graficos';
import trocas from './GraficoHistorico.module.css';

interface GraficoHistoricoProps {
  pontos: PontoHistoricoDTO[];
  periodo: PeriodoDashboard;
  intervalosComTroca?: string[];
}

interface PosicaoRotulo {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  index?: number;
}

const ALTURA_VOLUME_PX = 190;
const ALTURA_TEMPO_PX = 180;
const LARGURA_EIXO_PX = 52;
const ESPESSURA_MAXIMA_BARRA_PX = 24;
const RAIO_BARRA_PX = 4;
const RAIO_MARCADOR_PX = 4;
const RAIO_PONTO_ISOLADO_PX = 3;
const RESPIRO_ROTULO_PX = 8;
const INTERVALOS_ANTES_DO_ROTULO = 3;
const SINCRONIA = 'historico-consulta';
const margem = { top: 26, right: 8, bottom: 0, left: 0 };

export function GraficoHistorico({ pontos, periodo, intervalosComTroca = [] }: GraficoHistoricoProps) {
  const idResumo = useId();
  const idGradiente = useId();
  const areaTempoRef = useRef<HTMLDivElement>(null);
  const larguraTempo = useLarguraElemento(areaTempoRef);
  const textos = textosDoIntervalo[periodo];
  const { lido, eventos } = useLeituraDoGrafico();
  const picoVolume = pontoComMaisExecucoes(pontos);
  const picoTempo = pontoMaisLento(pontos);
  if (!picoVolume || !picoTempo || picoTempo.tempoMedioMs === null) return null;

  const indicePicoVolume = pontos.indexOf(picoVolume);
  const ladoDoRotuloDaTroca = (instante: string) => {
    const indiceDaTroca = pontos.findIndex((ponto) => ponto.instante === instante);
    return indicePicoVolume >= indiceDaTroca && indiceDaTroca >= INTERVALOS_ANTES_DO_ROTULO ? 'insideTopRight' : 'insideTopLeft';
  };
  const pontoLido = lido ? pontos[lido.indice] : undefined;
  const xLido = pontoLido && lido ? lido.x : null;
  const trocaNoLido = pontoLido ? intervalosComTroca.includes(pontoLido.instante) : false;
  const rotuloDoLido = pontoLido ? (
    <>
      <span className={estilos.leituraRotulo}>{textos.completo(pontoLido.instante)}</span>
      {trocaNoLido ? <span className={trocas.leituraTroca}>Novo plano</span> : null}
    </>
  ) : null;
  const temIntervaloVazio = pontos.some((ponto) => ponto.tempoMedioMs === null);
  const marcasVolume = marcasDoEixo(picoVolume.quantidadeExecucoes);
  const marcasTempo = marcasDoEixo(picoTempo.tempoMedioMs);
  const animar = !prefereMovimentoReduzido();
  const larguraDoPlano = Math.max(0, larguraTempo - LARGURA_EIXO_PX - margem.left - margem.right);
  const meiaFaixa = larguraDoPlano / pontos.length / 2;
  const iniciosDeDia =
    periodo === 'ULTIMOS_7_DIAS'
      ? pontos.filter((ponto) => new Date(ponto.instante).getHours() === 0).map((ponto) => ponto.instante)
      : undefined;

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
          `Pico: ${formatarNumeroCompacto(picoVolume.quantidadeExecucoes)}`,
          Number(x) + Number(width) / 2,
          Number(width) / 2,
          Number(y),
        )
      : null;

  const textoDoPicoTempo = `Pico: ${formatarDuracaoMs(picoTempo.tempoMedioMs)}`;
  const rotularPicoTempo = ({ viewBox }: { viewBox?: PosicaoRotulo }) =>
    desenharRotuloDoPico(
      textoDoPicoTempo,
      Number(viewBox?.x) + Number(viewBox?.width) / 2,
      RAIO_MARCADOR_PX,
      Number(viewBox?.y),
    );

  return (
    <figure className={estilos.figura} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Execuções e tempo médio da consulta ao longo do período. Maior volume: {formatarNumero(picoVolume.quantidadeExecucoes)}{' '}
        execuções ({textos.completo(picoVolume.instante)}). Maior tempo médio: {formatarDuracaoMs(picoTempo.tempoMedioMs)} (
        {textos.completo(picoTempo.instante)}).
        {intervalosComTroca.map((instante) => ` O plano de execução mudou no intervalo ${textos.completo(instante)}.`).join('')} A
        tabela “Por intervalo”, logo abaixo, traz todos os valores.
      </figcaption>

      <div className={estilos.grafico}>
        <LeituraDoGrafico titulo="Execuções" x={xLido}>
          {pontoLido ? (
            <>
              {rotuloDoLido}
              <span>
                <span className={estilos.dicaValor}>{formatarNumero(pontoLido.quantidadeExecucoes)}</span>{' '}
                {pluralizar(pontoLido.quantidadeExecucoes, 'execução', 'execuções')}
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
                dataKey="quantidadeExecucoes"
                name="Execuções"
                className={estilos.barras}
                maxBarSize={ESPESSURA_MAXIMA_BARRA_PX}
                radius={[RAIO_BARRA_PX, RAIO_BARRA_PX, 0, 0]}
                isAnimationActive={animar}
                animationDuration={480}
              >
                <LabelList dataKey="quantidadeExecucoes" content={rotularPicoVolume} />
              </Bar>
              {intervalosComTroca.map((instante) => (
                <ReferenceLine
                  key={instante}
                  x={instante}
                  className={trocas.trocaDePlano}
                  ifOverflow="visible"
                  label={{ value: 'Novo plano', position: ladoDoRotuloDaTroca(instante), offset: 6, className: trocas.rotuloTroca }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={estilos.grafico}>
        <LeituraDoGrafico titulo="Tempo médio de execução, em milissegundos" x={xLido}>
          {pontoLido ? (
            <>
              {rotuloDoLido}
              {pontoLido.tempoMedioMs === null || pontoLido.tempoMaximoMs === null ? (
                <span>Sem execuções</span>
              ) : (
                <>
                  <span>
                    <span className={estilos.dicaValor}>{formatarDuracaoMs(pontoLido.tempoMedioMs)}</span> de média
                  </span>
                  <span>
                    <span className={estilos.dicaValor}>{formatarDuracaoMs(pontoLido.tempoMaximoMs)}</span> na mais lenta
                  </span>
                </>
              )}
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
                tickFormatter={textos.eixo}
                ticks={iniciosDeDia}
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
              />
              <Tooltip cursor={{ className: estilos.linhaCursor }} content={() => null} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="tempoMedioMs"
                name="Tempo médio"
                strokeWidth={2}
                fill={`url(#${idGradiente})`}
                className={estilos.serie}
                connectNulls={false}
                dot={temIntervaloVazio ? { r: RAIO_PONTO_ISOLADO_PX, strokeWidth: 0, className: estilos.marcador } : false}
                activeDot={{ r: 5, strokeWidth: 2, className: estilos.marcador }}
                isAnimationActive={animar}
                animationDuration={480}
              />
              {intervalosComTroca.map((instante) => (
                <ReferenceLine key={instante} x={instante} className={trocas.trocaDePlano} ifOverflow="visible" />
              ))}
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
    </figure>
  );
}
