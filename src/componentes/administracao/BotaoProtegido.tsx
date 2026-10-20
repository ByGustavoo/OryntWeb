import type { MouseEvent } from 'react';
import { Botao } from '@/componentes/ui';
import type { BotaoProps } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from '@/componentes/usuarios/BotaoDeAlteracao.module.css';

interface BotaoProtegidoProps extends BotaoProps {
  motivo: string | null;
  tituloDoMotivo?: string;
}

export function BotaoProtegido({ motivo, tituloDoMotivo = 'Esta ação está protegida', onClick, className, ...resto }: BotaoProtegidoProps) {
  const notificacoes = useNotificacoes();
  const aoClicar = (evento: MouseEvent<HTMLButtonElement>) => {
    if (motivo) {
      notificacoes.aviso(tituloDoMotivo, motivo);
      return;
    }
    onClick?.(evento);
  };
  return (
    <Botao
      {...resto}
      className={juntarClasses(motivo && estilos.bloqueado, className)}
      aria-disabled={motivo ? true : undefined}
      title={motivo ?? undefined}
      onClick={aoClicar}
    />
  );
}
