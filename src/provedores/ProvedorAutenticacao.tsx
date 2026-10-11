import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import type { UsuarioDTO } from '@/modelos/autenticacao';
import { servicoAutenticacao } from '@/servicos';

export type SituacaoAutenticacao = 'VERIFICANDO' | 'ANONIMA' | 'AUTENTICADA';

interface EstadoAutenticacao {
  situacao: SituacaoAutenticacao;
  usuario: UsuarioDTO | null;
}

interface ValorContextoAutenticacao extends EstadoAutenticacao {
  registrarUsuario: (usuario: UsuarioDTO) => void;
}

const ContextoAutenticacao = createContext<ValorContextoAutenticacao | null>(null);

const ANONIMA: EstadoAutenticacao = { situacao: 'ANONIMA', usuario: null };

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAutenticacao>({ situacao: 'VERIFICANDO', usuario: null });

  useEffect(() => {
    const controlador = new AbortController();
    servicoAutenticacao
      .buscarUsuarioAtual(controlador.signal)
      .then((usuario) => setEstado({ situacao: 'AUTENTICADA', usuario }))
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || ehCancelamento(erro)) return;
        setEstado(ANONIMA);
      });
    return () => controlador.abort();
  }, []);

  const registrarUsuario = useCallback((usuario: UsuarioDTO) => setEstado({ situacao: 'AUTENTICADA', usuario }), []);

  const valor = useMemo<ValorContextoAutenticacao>(() => ({ ...estado, registrarUsuario }), [estado, registrarUsuario]);

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): ValorContextoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAutenticacao precisa estar dentro de <ProvedorAutenticacao>.');
  return contexto;
}
