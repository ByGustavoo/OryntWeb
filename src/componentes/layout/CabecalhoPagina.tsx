import type { ReactNode } from 'react';
import estilos from './CabecalhoPagina.module.css';

export interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}

export function CabecalhoPagina({ titulo, descricao, acoes }: CabecalhoPaginaProps) {
  return (
    <div className={estilos.cabecalhoPagina}>
      <div className={estilos.textos}>
        <h1 className={estilos.titulo}>{titulo}</h1>
        {descricao ? <p className={estilos.descricao}>{descricao}</p> : null}
      </div>
      {acoes ? <div className={estilos.acoes}>{acoes}</div> : null}
    </div>
  );
}
