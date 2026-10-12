import type { ReactNode } from 'react';
import estilos from './MedidorOcupacao.module.css';

interface MedidorOcupacaoProps {
  valor: number;
  limite: number;
  children: ReactNode;
}

export function MedidorOcupacao({ valor, limite, children }: MedidorOcupacaoProps) {
  const ocupacao = limite > 0 ? (valor / limite) * 100 : 0;
  return (
    <span className={estilos.ocupacao}>
      <span className={estilos.trilho} aria-hidden="true">
        <span className={estilos.preenchimento} style={{ width: `${Math.min(100, ocupacao)}%` }} />
      </span>
      <span className={estilos.texto}>{children}</span>
    </span>
  );
}
