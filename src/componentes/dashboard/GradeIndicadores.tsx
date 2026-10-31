import type { ReactNode } from 'react';
import { Esqueleto } from '@/componentes/ui';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './GradeIndicadores.module.css';

const QUANTIDADE_INDICADORES = 4;

type ColunasDaGrade = 3 | 4;

export function GradeIndicadores({ colunas = 4, children }: { colunas?: ColunasDaGrade; children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <dl className={juntarClasses(estilos.grade, colunas === 3 && estilos.tresColunas)}>{children}</dl>
    </div>
  );
}

export function EsqueletoIndicadores({ colunas = 4, quantidade = QUANTIDADE_INDICADORES }: { colunas?: ColunasDaGrade; quantidade?: number }) {
  return (
    <div className={estilos.conteiner}>
      <div className={juntarClasses(estilos.grade, colunas === 3 && estilos.tresColunas)} role="status" aria-label="Carregando os indicadores…">
        {Array.from({ length: quantidade }, (_, indice) => (
          <div className={estilos.esqueleto} key={indice}>
            <div className={estilos.esqueletoRotulo}>
              <Esqueleto largura={32} altura={32} raio="var(--raio-md)" />
              <Esqueleto largura="50%" altura={14} />
            </div>
            <span className={estilos.esqueletoValor}>
              <Esqueleto altura={30} raio="var(--raio-sm)" />
            </span>
            <span className={estilos.esqueletoContexto}>
              <Esqueleto largura="75%" altura={14} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
