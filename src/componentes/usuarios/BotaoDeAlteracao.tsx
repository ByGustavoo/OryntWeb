import { createContext, useContext } from 'react';
import type { MouseEvent } from 'react';
import { Botao, BotaoIcone } from '@/componentes/ui';
import type { BotaoProps } from '@/componentes/ui';
import type { BotaoIconeProps } from '@/componentes/ui/BotaoIcone';
import type { CodigoPermissao } from '@/modelos/administracao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import type { Capacidade } from '@/regras/capacidadeAlteracoes';
import { possui, rotuloDaPermissao } from '@/regras/permissoesConta';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './BotaoDeAlteracao.module.css';

const TITULO_DO_BLOQUEIO = 'O papel do Orynt não pode fazer isso';
const TITULO_DO_BLOQUEIO_DA_CONTA = 'A sua conta do Orynt não pode fazer isso';

export const PermissaoDasAlteracoes = createContext<CodigoPermissao | null>(null);

function useCapacidadeDaConta(capacidade: Capacidade | null): { capacidade: Capacidade | null; daConta: boolean } {
  const { usuario } = useAutenticacao();
  const exigida = useContext(PermissaoDasAlteracoes);
  const exigidas: CodigoPermissao[] = exigida ? [exigida] : ['BANCO_PAPEIS_ALTERAR', 'BANCO_PERMISSOES_ALTERAR'];
  const permitida = exigida ? possui(usuario, exigida) : exigidas.some((codigo) => possui(usuario, codigo));
  if (permitida) return { capacidade, daConta: false };
  return {
    capacidade: {
      permitido: false,
      motivo: `A sua conta não tem “${rotuloDaPermissao(exigidas[0] ?? 'BANCO_PAPEIS_ALTERAR')}”. Peça a quem administra o Orynt.`,
    },
    daConta: true,
  };
}

function useBloqueio(capacidadeDoBanco: Capacidade | null, aoClicar: ((evento: MouseEvent<HTMLButtonElement>) => void) | undefined) {
  const notificacoes = useNotificacoes();
  const { capacidade, daConta } = useCapacidadeDaConta(capacidadeDoBanco);
  const bloqueado = capacidade === null || !capacidade.permitido;
  return {
    bloqueado,
    motivo: capacidade?.motivo ?? undefined,
    aoClicar: (evento: MouseEvent<HTMLButtonElement>) => {
      if (capacidade === null) return;
      if (!capacidade.permitido) {
        notificacoes.aviso(daConta ? TITULO_DO_BLOQUEIO_DA_CONTA : TITULO_DO_BLOQUEIO, capacidade.motivo ?? undefined);
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
