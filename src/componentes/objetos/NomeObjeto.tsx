import { Fragment } from 'react';

interface NomeObjetoProps {
  esquema: string;
  nome: string;
  classeEsquema?: string;
}

export function NomeObjeto({ esquema, nome, classeEsquema }: NomeObjetoProps) {
  const partes = nome.split('_');

  return (
    <>
      <span className={classeEsquema}>{esquema}.</span>
      <wbr />
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
