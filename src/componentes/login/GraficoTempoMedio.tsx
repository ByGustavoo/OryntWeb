import { useId, useLayoutEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import { useLarguraElemento } from '@/ganchos/useLarguraElemento';
import { formatarDuracaoMs } from '@/utilitarios/formatacao';
import { tracarCurvaSuave } from '@/utilitarios/tracado';
import { CartaoCena, TituloCena } from './CartaoCena';
import {
  INTERVALO_CENA_MS,
  LIMITE_ALERTA_MS,
  PONTOS_DE_FOLGA,
  PONTOS_VISIVEIS,
  TETO_ESCALA_MS,
} from './roteiroCena';
import type { EstadoCena, FaseCena, PontoCena } from './roteiroCena';
import estilos from './GraficoTempoMedio.module.css';

interface GraficoTempoMedioProps {
  cena: EstadoCena;
  className?: string;
}

const ALTURA = 124;
const RESPIRO_TOPO = 24;
const RESPIRO_BASE = 4;
const MARGEM_ROTULO_PICO = 34;
const LINHAS_DE_GRADE = [0.25, 0.5, 0.75];
const CONSULTA_MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)';

const situacaoDaFase: Record<FaseCena, { tom: TomSelo; rotulo: string }> = {
  ESTAVEL: { tom: 'neutro', rotulo: 'Dentro do esperado' },
  PICO: { tom: 'erro', rotulo: 'Pico detectado' },
  RASTREANDO: { tom: 'info', rotulo: 'Rastreando a origem' },
  ORIGEM: { tom: 'sucesso', rotulo: 'Origem encontrada' },
};

function alturaDoTempo(tempoMedioMs: number): number {
  const areaUtil = ALTURA - RESPIRO_TOPO - RESPIRO_BASE;
  return ALTURA - RESPIRO_BASE - (Math.min(tempoMedioMs, TETO_ESCALA_MS) / TETO_ESCALA_MS) * areaUtil;
}

function ancoraDoRotulo(posicao: number, largura: number): 'start' | 'middle' | 'end' {
  if (posicao < MARGEM_ROTULO_PICO) return 'start';
  return posicao > largura - MARGEM_ROTULO_PICO ? 'end' : 'middle';
}

export function GraficoTempoMedio({ cena, className }: GraficoTempoMedioProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const fluxoRef = useRef<SVGGElement>(null);
  const largura = useLarguraElemento(areaRef);
  const idPreenchimento = `preenchimento-${useId().replace(/:/g, '')}`;
  const passoHorizontal = largura / (PONTOS_VISIVEIS - 1);
  const situacao = situacaoDaFase[cena.fase];

  useLayoutEffect(() => {
    const fluxo = fluxoRef.current;
    if (!fluxo || passoHorizontal <= 0 || window.matchMedia(CONSULTA_MOVIMENTO_REDUZIDO).matches) return;
    const deslizamento = fluxo.animate(
      [{ transform: `translateX(${passoHorizontal}px)` }, { transform: 'translateX(0)' }],
      { duration: INTERVALO_CENA_MS, easing: 'linear' },
    );
    return () => deslizamento.cancel();
  }, [cena.passo, passoHorizontal]);

  const posicaoDoPonto = (ponto: PontoCena, indice: number) => ({
    x: (indice - PONTOS_DE_FOLGA) * passoHorizontal,
    y: alturaDoTempo(ponto.tempoMedioMs),
  });
  const pontos = cena.serie.map(posicaoDoPonto);
  const linha = tracarCurvaSuave(pontos);
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const area = primeiro && ultimo ? `${linha} L${ultimo.x.toFixed(1)} ${ALTURA} L${primeiro.x.toFixed(1)} ${ALTURA} Z` : '';
  const indiceDoPico = cena.pico ? cena.serie.indexOf(cena.pico) : -1;
  const pico = pontos[indiceDoPico];
  const acimaDoAlerta = cena.tempoMedioMs >= LIMITE_ALERTA_MS;

  return (
    <CartaoCena className={className}>
      <div className={estilos.cabecalho}>
        <div className={estilos.leitura}>
          <TituloCena icone={Activity}>Tempo médio de execução</TituloCena>
          <span className={estilos.valor} data-alerta={acimaDoAlerta || undefined}>
            {formatarDuracaoMs(cena.tempoMedioMs)}
          </span>
        </div>
        <Selo key={cena.fase} tom={situacao.tom} ponto className={estilos.situacao}>
          {situacao.rotulo}
        </Selo>
      </div>

      <div ref={areaRef} className={estilos.area}>
        {largura > 0 ? (
          <svg className={estilos.grafico} width={largura} height={ALTURA} viewBox={`0 0 ${largura} ${ALTURA}`}>
            <defs>
              <linearGradient id={idPreenchimento} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={estilos.preenchimentoTopo} />
                <stop offset="100%" className={estilos.preenchimentoBase} />
              </linearGradient>
            </defs>

            {LINHAS_DE_GRADE.map((fracao) => (
              <line key={fracao} x1="0" x2={largura} y1={ALTURA * fracao} y2={ALTURA * fracao} className={estilos.grade} />
            ))}

            <g ref={fluxoRef}>
              <path d={area} fill={`url(#${idPreenchimento})`} />
              <path d={linha} className={estilos.linha} />
              {pico && cena.pico ? (
                <g>
                  <line x1={pico.x} x2={pico.x} y1={pico.y} y2={ALTURA} className={estilos.guiaPico} />
                  <circle cx={pico.x} cy={pico.y} r="8" className={estilos.haloPico} />
                  <circle cx={pico.x} cy={pico.y} r="4" className={estilos.marcaPico} />
                  <text
                    x={pico.x}
                    y={pico.y - 11}
                    textAnchor={ancoraDoRotulo(pico.x, largura)}
                    className={estilos.rotuloPico}
                  >
                    {formatarDuracaoMs(cena.pico.tempoMedioMs)}
                  </text>
                </g>
              ) : null}
            </g>
          </svg>
        ) : null}
      </div>

      <div className={estilos.eixo}>
        <span>há {PONTOS_VISIVEIS} s</span>
        <span className={estilos.agora}>
          <span className={estilos.pulso} />
          agora
        </span>
      </div>
    </CartaoCena>
  );
}
