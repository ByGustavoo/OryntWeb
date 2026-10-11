import { useRef } from 'react';
import { useTamanhoElemento } from '@/ganchos/useTamanhoElemento';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import type { FaseCena } from './roteiroCena';
import estilos from './RotaCena.module.css';

interface RotaCenaProps {
  fase: FaseCena;
  rastreio: number;
  className?: string;
}

const RAIO_DA_CURVA = 14;
const EIXO_DO_TRACO = 1;

function tracarRota(largura: number, altura: number): string {
  const base = altura - EIXO_DO_TRACO;
  const raio = Math.max(0, Math.min(RAIO_DA_CURVA, base, largura - EIXO_DO_TRACO));
  return `M${EIXO_DO_TRACO} 0V${base - raio}A${raio} ${raio} 0 0 0 ${EIXO_DO_TRACO + raio} ${base}H${largura}`;
}

export function RotaCena({ fase, rastreio, className }: RotaCenaProps) {
  const trilhaRef = useRef<HTMLSpanElement>(null);
  const rastreioInicial = useRef(rastreio).current;
  const { largura, altura } = useTamanhoElemento(trilhaRef);
  const rota = tracarRota(largura, altura);

  return (
    <span
      className={juntarClasses(estilos.rota, className)}
      data-fase={fase}
      data-entrada={rastreio === rastreioInicial || undefined}
    >
      <span ref={trilhaRef} className={estilos.trilha}>
        {largura > 0 && altura > 0 ? (
          <svg className={estilos.desenho} width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`}>
            <path d={rota} className={estilos.fundo} />
            <g key={rastreio}>
              <path d={rota} pathLength={1} className={estilos.traco} />
              <path d={rota} pathLength={1} className={estilos.cometa} />
            </g>
          </svg>
        ) : null}
      </span>
      <span key={rastreio} className={estilos.destino} />
    </span>
  );
}
