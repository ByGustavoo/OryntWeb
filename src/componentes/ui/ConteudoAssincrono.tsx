import type { ReactNode } from 'react';
import type { ResultadoAssincrono } from '@/ganchos/useDadosAssincronos';
import { EstadoErro } from './EstadoErro';
import estilos from './ConteudoAssincrono.module.css';

export interface ConteudoAssincronoProps<T> {
  resultado: ResultadoAssincrono<T>;
  esqueleto: ReactNode;
  tituloErro: string;
  children: (dados: T) => ReactNode;
}

export function ConteudoAssincrono<T>({ resultado, esqueleto, tituloErro, children }: ConteudoAssincronoProps<T>) {
  if (resultado.dados !== null) return <div className={`${estilos.conteudo} revelar`}>{children(resultado.dados)}</div>;
  if (resultado.erro) {
    return (
      <EstadoErro
        compacto
        titulo={tituloErro}
        erro={resultado.erro}
        aoTentarNovamente={resultado.recarregar}
        tentando={resultado.carregando}
      />
    );
  }
  return <>{esqueleto}</>;
}
