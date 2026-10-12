import type { ReactNode } from 'react';
import { Esqueleto } from '@/componentes/ui';
import estilos from './GradeIndicadores.module.css';

const QUANTIDADE_INDICADORES = 4;

export function GradeIndicadores({ children }: { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <dl className={estilos.grade}>{children}</dl>
    </div>
  );
}

export function EsqueletoIndicadores() {
  return (
    <div className={estilos.conteiner}>
      <div className={estilos.grade} role="status" aria-label="Carregando os indicadores…">
        {Array.from({ length: QUANTIDADE_INDICADORES }, (_, indice) => (
          <div className={estilos.esqueleto} key={indice}>
            <div className={estilos.esqueletoRotulo}>
              <Esqueleto largura={32} altura={32} raio="var(--raio-md)" />
              <Esqueleto largura="50%" altura={14} />
            </div>
            <Esqueleto largura="45%" altura={30} raio="var(--raio-sm)" />
            <Esqueleto largura="75%" altura={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
