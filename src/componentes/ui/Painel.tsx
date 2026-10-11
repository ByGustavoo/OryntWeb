import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Painel.module.css';

export interface PainelProps extends HTMLAttributes<HTMLElement> {
  como?: ElementType;
  tom?: 'padrao' | 'suave' | 'destaque';
  espacamento?: 'nenhum' | 'sm' | 'md';
  interativo?: boolean;
}

export function Painel({
  como: Elemento = 'section',
  tom = 'padrao',
  espacamento = 'md',
  interativo = false,
  className,
  children,
  ...resto
}: PainelProps) {
  return (
    <Elemento
      className={juntarClasses(
        estilos.painel,
        estilos[tom],
        estilos[`espacamento-${espacamento}`],
        interativo && estilos.interativo,
        className,
      )}
      {...resto}
    >
      {children}
    </Elemento>
  );
}

export interface CabecalhoPainelProps {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  nivel?: 2 | 3;
}

export function CabecalhoPainel({ titulo, descricao, acao, nivel = 2 }: CabecalhoPainelProps) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';

  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.textosCabecalho}>
        <Titulo className={estilos.titulo}>{titulo}</Titulo>
        {descricao ? <p className={estilos.descricao}>{descricao}</p> : null}
      </div>
      {acao ? <div className={estilos.acao}>{acao}</div> : null}
    </header>
  );
}
