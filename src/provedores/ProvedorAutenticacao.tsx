import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { aoPerderOAcesso } from '@/api/clienteHttp';
import { ehCancelamento } from '@/api/ErroApi';
import { ehErroApi } from '@/api/tratamentoErros';
import type { UsuarioDTO } from '@/modelos/autenticacao';
import { servicoAutenticacao } from '@/servicos';
import { atravessar } from '@/utilitarios/travessia';

export type SituacaoAutenticacao = 'VERIFICANDO' | 'ANONIMA' | 'AUTENTICADA';

interface EstadoAutenticacao {
  situacao: SituacaoAutenticacao;
  usuario: UsuarioDTO | null;
}

interface ValorContextoAutenticacao extends EstadoAutenticacao {
  registrarUsuario: (usuario: UsuarioDTO) => void;
  atualizarUsuario: () => Promise<void>;
  marcarAnonima: () => void;
  sair: () => Promise<void>;
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

  const marcarAnonima = useCallback(() => setEstado(ANONIMA), []);

  useEffect(() => aoPerderOAcesso(() => setEstado((atual) => (atual.situacao === 'AUTENTICADA' ? ANONIMA : atual))), []);

  const atualizarUsuario = useCallback(async () => {
    try {
      const usuario = await servicoAutenticacao.buscarUsuarioAtual();
      setEstado((atual) => (atual.situacao === 'AUTENTICADA' ? { situacao: 'AUTENTICADA', usuario } : atual));
    } catch (erro) {
      if (ehErroApi(erro, 'NAO_AUTORIZADO')) setEstado((atual) => (atual.situacao === 'AUTENTICADA' ? ANONIMA : atual));
    }
  }, []);

  const sair = useCallback(async () => {
    await servicoAutenticacao.sair();
    await Promise.allSettled([import('@/layouts/LayoutAcesso'), import('@/paginas/PaginaLogin')]);
    atravessar('saida', () => setEstado(ANONIMA));
  }, []);

  const valor = useMemo<ValorContextoAutenticacao>(
    () => ({ ...estado, registrarUsuario, atualizarUsuario, marcarAnonima, sair }),
    [estado, registrarUsuario, atualizarUsuario, marcarAnonima, sair],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): ValorContextoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAutenticacao precisa estar dentro de <ProvedorAutenticacao>.');
  return contexto;
}
