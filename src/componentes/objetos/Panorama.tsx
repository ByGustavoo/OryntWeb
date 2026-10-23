import type { ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Panorama.module.css';

interface PanoramaProps {
  figura: ReactNode;
  pontos: ReactNode;
  proporcao?: 'equilibrada' | 'figura-larga';
}

export function Panorama({ figura, pontos, proporcao = 'figura-larga' }: PanoramaProps) {
  const sozinho = !figura || !pontos;
  return (
    <div className={estilos.conteiner}>
      <div className={juntarClasses(estilos.panorama, estilos[proporcao], sozinho && estilos.soFigura)}>
        {figura ? <div className={estilos.figura}>{figura}</div> : null}
        {pontos ? <div className={estilos.pontos}>{pontos}</div> : null}
      </div>
    </div>
  );
}
