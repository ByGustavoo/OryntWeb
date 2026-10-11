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

  return (
    <div className={juntarClasses(estilos.indicador, estilos[tom])}>
      <dt className={estilos.rotulo}>
        <span className={estilos.icone} aria-hidden="true">
          <Icone size={15} strokeWidth={2.25} />
        </span>
        {rotulo}
      </dt>
      <dd className={`${estilos.valor} numeros`}>
        <span aria-hidden="true">{formatar(exibido)}</span>
        <span className="visualmente-oculto">{formatar(valor)}</span>
        {unidade ? <span className={estilos.unidade}>{unidade}</span> : null}
      </dd>
      <dd className={estilos.contexto}>{contexto}</dd>
    </div>
  );
}
