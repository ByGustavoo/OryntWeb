import type { ReactNode } from 'react';
import type { ResultadoAssincrono } from '@/ganchos/useDadosAssincronos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { EstadoErro } from './EstadoErro';
import estilos from './ConteudoAssincrono.module.css';

export interface ConteudoAssincronoProps<T> {
  resultado: ResultadoAssincrono<T>;
  esqueleto: ReactNode;
  tituloErro: string;
  revelar?: boolean;
  children: (dados: T) => ReactNode;
}

export function ConteudoAssincrono<T>({
  resultado,
  esqueleto,
  tituloErro,
  revelar = true,
  children,
}: ConteudoAssincronoProps<T>) {
  if (resultado.dados !== null) {
    return <div className={juntarClasses(estilos.conteudo, revelar && 'revelar')}>{children(resultado.dados)}</div>;
  }
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
