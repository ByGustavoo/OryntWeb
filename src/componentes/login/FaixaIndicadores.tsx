import type { CSSProperties } from 'react';
import { formatarDecimal, formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { CartaoCena } from './CartaoCena';
import { LIMITE_CONEXOES } from './roteiroCena';
import type { EstadoCena } from './roteiroCena';
import estilos from './FaixaIndicadores.module.css';

interface FaixaIndicadoresProps {
  cena: EstadoCena;
  className?: string;
}

const ALTURA_MINIMA_BARRA = 0.28;

export function FaixaIndicadores({ cena, className }: FaixaIndicadoresProps) {
  const menorVolume = Math.min(...cena.volume);
  const amplitude = Math.max(1, Math.max(...cena.volume) - menorVolume);
  const alturaDaBarra = (volume: number) => ALTURA_MINIMA_BARRA + (1 - ALTURA_MINIMA_BARRA) * ((volume - menorVolume) / amplitude);

  return (
    <CartaoCena className={juntarClasses(estilos.faixa, className)}>
      <div className={estilos.indicador}>
        <span className={estilos.rotulo}>Consultas por segundo</span>
        <div className={estilos.leitura}>
          <span className={estilos.valor}>{formatarNumero(cena.consultasPorSegundo)}</span>
          <span className={estilos.barras}>
            {cena.volume.map((volume, indice) => (
              <span key={indice} style={{ '--altura': alturaDaBarra(volume) } as CSSProperties} />
            ))}
          </span>
        </div>
      </div>

      <div className={estilos.indicador}>
        <span className={estilos.rotulo}>Conexões ativas</span>
        <div className={estilos.leitura}>
          <span className={estilos.valor}>
            {cena.conexoesAtivas}
            <span className={estilos.complemento}> de {LIMITE_CONEXOES}</span>
          </span>
        </div>
        <span className={estilos.trilho}>
          <span style={{ '--ocupacao': cena.conexoesAtivas / LIMITE_CONEXOES } as CSSProperties} />
        </span>
      </div>

      <div className={estilos.indicador}>
        <span className={estilos.rotulo}>Acerto de cache</span>
        <div className={estilos.leitura}>
          <span className={estilos.valor}>{formatarDecimal(cena.acertoCache, 1)}%</span>
        </div>
        <span className={estilos.trilho}>
          <span style={{ '--ocupacao': cena.acertoCache / 100 } as CSSProperties} />
        </span>
      </div>
    </CartaoCena>
  );
}
