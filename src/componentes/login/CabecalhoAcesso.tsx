import type { ReactNode } from 'react';
import estilos from './CabecalhoAcesso.module.css';

interface ProgressoAcesso {
  atual: number;
  total: number;
}

interface CabecalhoAcessoProps {
  titulo: ReactNode;
  progresso?: ProgressoAcesso;
  children: ReactNode;
}

export function CabecalhoAcesso({ titulo, progresso, children }: CabecalhoAcessoProps) {
  return (
    <header className={estilos.cabecalho}>
      {progresso ? (
        <p className={estilos.progresso}>
          <span className={estilos.trilha} aria-hidden="true">
            {Array.from({ length: progresso.total }, (_, indice) => (
              <span key={indice} className={estilos.passo} data-feito={indice < progresso.atual || undefined} />
            ))}
          </span>
          Etapa {progresso.atual} de {progresso.total}
        </p>
      ) : null}
      <h1 className={estilos.titulo}>{titulo}</h1>
      <p className={estilos.descricao}>{children}</p>
    </header>
  );
}
