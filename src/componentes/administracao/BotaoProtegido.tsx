import type { MouseEvent } from 'react';
import { Botao, Dica } from '@/componentes/ui';
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
  const botao = (
    <Botao
      {...resto}
      className={juntarClasses(motivo && estilos.bloqueado, className)}
      aria-disabled={motivo ? true : undefined}
      onClick={aoClicar}
    />
  );
  return motivo ? (
    <Dica titulo={tituloDoMotivo} conteudo={motivo} descrever>
      {botao}
    </Dica>
  ) : (
    botao
  );
}
