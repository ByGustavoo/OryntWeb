import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './GraficoEvolucao.module.css';

interface LeituraDoGraficoProps {
  titulo: ReactNode;
  x: number | null;
  children?: ReactNode;
}

export function LeituraDoGrafico({ titulo, x, children }: LeituraDoGraficoProps) {
  const faixa = useRef<HTMLDivElement>(null);
  const leitura = useRef<HTMLParagraphElement>(null);
  const lendo = x !== null && children !== undefined && children !== null;

  useLayoutEffect(() => {
    if (!lendo || !faixa.current || !leitura.current) return;
    const largura = leitura.current.offsetWidth;
    const disponivel = faixa.current.clientWidth;
    const esquerda = Math.min(Math.max(x - largura / 2, 0), Math.max(0, disponivel - largura));
    leitura.current.style.left = `${esquerda}px`;
  });

  return (
    <div ref={faixa} className={estilos.cabeca}>
      <p className={juntarClasses(estilos.titulo, lendo && estilos.tituloLendo)}>{titulo}</p>
      {lendo ? (
        <p ref={leitura} className={estilos.leitura} aria-hidden="true">
          {children}
        </p>
      ) : null}
    </div>
  );
}
