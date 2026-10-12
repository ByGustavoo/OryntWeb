import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { destacarSql } from '@/utilitarios/sql';
import estilos from './TrechoSql.module.css';

interface TrechoSqlProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  sql: string;
  inteiro?: boolean;
  dica?: boolean;
}

export const TrechoSql = forwardRef<HTMLElement, TrechoSqlProps>(function TrechoSql(
  { sql, inteiro = false, dica = true, className, ...resto },
  ref,
) {
  return (
    <code
      ref={ref}
      className={juntarClasses(estilos.sql, inteiro && estilos.inteiro, 'codigo', className)}
      title={dica ? sql : undefined}
      {...resto}
    >
      {destacarSql(sql).map((trecho, indice) =>
        trecho.palavraChave ? (
          <span className={estilos.palavraChave} key={indice}>
            {trecho.texto}
          </span>
        ) : (
          trecho.texto
        ),
      )}
    </code>
  );
});
