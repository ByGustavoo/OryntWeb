import { Fragment } from 'react';

interface NomeObjetoProps {
  esquema: string | null;
  nome: string;
  classeEsquema?: string;
}

export function NomeObjeto({ esquema, nome, classeEsquema }: NomeObjetoProps) {
  const partes = nome.split('_');

  return (
    <>
      {esquema === null ? null : (
        <>
          <span className={classeEsquema}>{esquema}.</span>
          <wbr />
        </>
      )}
      {partes.map((parte, indice) => (
        <Fragment key={indice}>
          {parte}
          {indice < partes.length - 1 ? (
            <>
              _<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
