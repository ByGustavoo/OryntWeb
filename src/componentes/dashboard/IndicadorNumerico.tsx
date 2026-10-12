import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useContagem } from '@/ganchos/useContagem';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './IndicadorNumerico.module.css';

export type TomIndicador = 'destaque' | 'aviso' | 'sucesso';

export interface IndicadorNumericoProps {
  icone: LucideIcon;
  rotulo: string;
  valor: number;
  casasDecimais?: number;
  formatar: (valor: number) => string;
  unidade?: string;
  contexto: ReactNode;
  tom?: TomIndicador;
}

const TAMANHO_ICONE = 18;
const SEPARADORES_NUMERICOS = /([.,])/;

export function IndicadorNumerico({
  icone: Icone,
  rotulo,
  valor,
  casasDecimais = 0,
  formatar,
  unidade,
  contexto,
  tom = 'destaque',
}: IndicadorNumericoProps) {
  const exibido = useContagem(valor, casasDecimais);
  const moldura = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    moldura.current?.querySelectorAll('svg > *').forEach((traco) => traco.setAttribute('pathLength', '1'));
  }, [Icone]);

  return (
    <div className={juntarClasses(estilos.indicador, estilos[tom])}>
      <dt className={estilos.rotulo}>
        <span className={estilos.icone} ref={moldura} aria-hidden="true">
          <Icone size={TAMANHO_ICONE} strokeWidth={2} />
        </span>
        <span className={estilos.nome}>{rotulo}</span>
      </dt>
      <dd className={`${estilos.valor} numeros`}>
        <span aria-hidden="true">
          {formatar(exibido)
            .split(SEPARADORES_NUMERICOS)
            .map((trecho, posicao) =>
              posicao % 2 === 1 ? (
                <span className={estilos.separador} key={posicao}>
                  {trecho}
                </span>
              ) : (
                trecho
              ),
            )}
        </span>
        <span className="visualmente-oculto">{formatar(valor)}</span>
        {unidade ? <span className={estilos.unidade}>{unidade}</span> : null}
      </dd>
      <dd className={estilos.contexto}>{contexto}</dd>
    </div>
  );
}
