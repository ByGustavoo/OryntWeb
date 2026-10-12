import { useOutletContext } from 'react-router-dom';

export interface ContextoAcesso {
  emailLembrado: string;
  senhaRedefinida: boolean;
  lembrarEmail: (email: string) => void;
  registrarSenhaRedefinida: (email: string) => void;
  dispensarSenhaRedefinida: () => void;
}

export function useContextoAcesso(): ContextoAcesso {
  return useOutletContext<ContextoAcesso>();
}
