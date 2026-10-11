import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import type { ConexaoDTO } from '@/modelos/conexao';
import { servicoConexao } from '@/servicos';

export type SituacaoConexao = 'VERIFICANDO' | 'DESCONECTADA' | 'CONECTADA';

interface EstadoConexao {
  situacao: SituacaoConexao;
  conexao: ConexaoDTO | null;
}

interface ValorContextoConexao extends EstadoConexao {
  registrarConexao: (conexao: ConexaoDTO) => void;
  marcarDesconectada: () => void;
  encerrarConexao: () => Promise<void>;
}

const ContextoConexao = createContext<ValorContextoConexao | null>(null);

const DESCONECTADA: EstadoConexao = { situacao: 'DESCONECTADA', conexao: null };

export function ProvedorConexao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoConexao>({ situacao: 'VERIFICANDO', conexao: null });

  useEffect(() => {
    const controlador = new AbortController();
    servicoConexao
      .buscarConexaoAtual(controlador.signal)
      .then((conexao) => setEstado({ situacao: 'CONECTADA', conexao }))
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || ehCancelamento(erro)) return;
        setEstado(DESCONECTADA);
      });
    return () => controlador.abort();
  }, []);

  const registrarConexao = useCallback((conexao: ConexaoDTO) => setEstado({ situacao: 'CONECTADA', conexao }), []);

  const marcarDesconectada = useCallback(() => setEstado(DESCONECTADA), []);

  const encerrarConexao = useCallback(async () => {
    await servicoConexao.encerrarConexao();
    setEstado(DESCONECTADA);
  }, []);

  const valor = useMemo<ValorContextoConexao>(
    () => ({ ...estado, registrarConexao, marcarDesconectada, encerrarConexao }),
    [estado, registrarConexao, marcarDesconectada, encerrarConexao],
  );

  return <ContextoConexao.Provider value={valor}>{children}</ContextoConexao.Provider>;
}

export function useConexao(): ValorContextoConexao {
  const contexto = useContext(ContextoConexao);
  if (!contexto) throw new Error('useConexao precisa estar dentro de <ProvedorConexao>.');
  return contexto;
}

export function useConexaoAtiva(): ConexaoDTO {
  const { conexao } = useConexao();
  if (!conexao) throw new Error('useConexaoAtiva só pode ser usado em telas protegidas por uma conexão ativa.');
  return conexao;
}
