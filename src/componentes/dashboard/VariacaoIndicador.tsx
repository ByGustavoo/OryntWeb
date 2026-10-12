import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatarComSinal, formatarDecimal } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './VariacaoIndicador.module.css';

export type SentidoFavoravel = 'ALTA' | 'QUEDA';

interface VariacaoIndicadorProps {
  valor: number | null;
  favoravel?: SentidoFavoravel;
  referencia?: string;
}

function escolherTom(valor: number, favoravel: SentidoFavoravel | undefined): string | undefined {
  if (!favoravel || valor === 0) return undefined;
  return valor > 0 === (favoravel === 'ALTA') ? estilos.melhora : estilos.piora;
}

export function VariacaoIndicador({ valor, favoravel, referencia = 'ao período anterior' }: VariacaoIndicadorProps) {
  if (valor === null) return <>Sem período anterior para comparar</>;
  const Icone = valor > 0 ? ArrowUpRight : valor < 0 ? ArrowDownRight : Minus;
  const tom = escolherTom(valor, favoravel);
  return (
    <span className={estilos.variacao}>
      <Icone size={14} strokeWidth={2.5} aria-hidden="true" className={juntarClasses(estilos.seta, tom)} />
      <span>
        <span className={juntarClasses(estilos.valor, tom)}>
          <span className="numeros">{formatarComSinal(valor, (absoluto) => formatarDecimal(absoluto, 1))}</span>
          <span className={estilos.percentual}>%</span>
        </span>{' '}
        em relação {referencia}
      </span>
    </span>
  );
}
