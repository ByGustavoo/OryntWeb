import type { ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './CabecalhoPagina.module.css';

export interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  imprimir?: boolean;
}

export function CabecalhoPagina({ titulo, descricao, acoes, imprimir = true }: CabecalhoPaginaProps) {
  return (
    <div className={juntarClasses(estilos.cabecalhoPagina, !imprimir && 'nao-imprimir')}>
      <div className={estilos.textos}>
        <h1 className={estilos.titulo}>{titulo}</h1>
        {descricao ? <p className={estilos.descricao}>{descricao}</p> : null}
      </div>
      {acoes ? <div className={estilos.acoes}>{acoes}</div> : null}
    </div>
  );
}
