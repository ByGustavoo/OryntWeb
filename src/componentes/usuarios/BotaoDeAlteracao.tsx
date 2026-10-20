import type { MouseEvent } from 'react';
import { Botao, BotaoIcone } from '@/componentes/ui';
import type { BotaoProps } from '@/componentes/ui';
import type { BotaoIconeProps } from '@/componentes/ui/BotaoIcone';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import type { Capacidade } from '@/regras/capacidadeAlteracoes';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './BotaoDeAlteracao.module.css';

const TITULO_DO_BLOQUEIO = 'O papel do Orynt não pode fazer isso';

function useBloqueio(capacidade: Capacidade | null, aoClicar: ((evento: MouseEvent<HTMLButtonElement>) => void) | undefined) {
  const notificacoes = useNotificacoes();
  const bloqueado = capacidade === null || !capacidade.permitido;
  return {
    bloqueado,
    motivo: capacidade?.motivo ?? undefined,
    aoClicar: (evento: MouseEvent<HTMLButtonElement>) => {
      if (capacidade === null) return;
      if (!capacidade.permitido) {
        notificacoes.aviso(TITULO_DO_BLOQUEIO, capacidade.motivo ?? undefined);
        return;
      }
      aoClicar?.(evento);
    },
  };
}

interface BotaoDeAlteracaoProps extends BotaoProps {
  capacidade: Capacidade | null;
}

export function BotaoDeAlteracao({ capacidade, onClick, className, ...resto }: BotaoDeAlteracaoProps) {
  const { bloqueado, motivo, aoClicar } = useBloqueio(capacidade, onClick);
  return (
    <Botao
      {...resto}
      className={juntarClasses(bloqueado && estilos.bloqueado, className)}
      aria-disabled={bloqueado || undefined}
      title={motivo}
      onClick={aoClicar}
    />
  );
}

interface BotaoIconeDeAlteracaoProps extends BotaoIconeProps {
  capacidade: Capacidade | null;
}

export function BotaoIconeDeAlteracao({ capacidade, onClick, rotulo, ...resto }: BotaoIconeDeAlteracaoProps) {
  const { bloqueado, motivo, aoClicar } = useBloqueio(capacidade, onClick);
  return (
    <BotaoIcone
      {...resto}
      rotulo={rotulo}
      aria-disabled={bloqueado || undefined}
      title={motivo ?? rotulo}
      onClick={aoClicar}
    />
  );
}
