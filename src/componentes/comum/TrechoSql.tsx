import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { Dica } from '@/componentes/ui';
import { intervalosMarcados } from '@/regras/buscaConsultas';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { destacarSql } from '@/utilitarios/sql';
import estilos from './TrechoSql.module.css';

interface TrechoSqlProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  sql: string;
  inteiro?: boolean;
  dica?: boolean;
  termos?: string[];
}

const SEM_TERMOS: string[] = [];

export const TrechoSql = forwardRef<HTMLElement, TrechoSqlProps>(function TrechoSql(
  { sql, inteiro = false, dica = true, termos = SEM_TERMOS, className, ...resto },
  ref,
) {
  const marcados = termos.length > 0 ? intervalosMarcados(sql, termos) : [];

  return (
    <Dica conteudo={dica ? sql : undefined} larga>
      <code
        ref={ref}
        className={juntarClasses(estilos.sql, inteiro && estilos.inteiro, 'codigo', className)}
        {...resto}
      >
        {destacarSql(sql, marcados).map((trecho, indice) => {
          if (!trecho.palavraChave && !trecho.marcado) return trecho.texto;
          const Elemento = trecho.marcado ? 'mark' : 'span';
          return (
            <Elemento
              key={indice}
              className={juntarClasses(trecho.palavraChave && estilos.palavraChave, trecho.marcado && estilos.encontrado)}
            >
              {trecho.texto}
            </Elemento>
          );
        })}
      </code>
    </Dica>
  );
});
