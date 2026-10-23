import { Suspense, createContext, lazy, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConexaoDTO } from '@/modelos/conexao';
import { useConexao } from './ProvedorConexao';
import { useNotificacoes } from './ProvedorNotificacoes';

const ModalConexao = lazy(() => import('@/componentes/conexao/ModalConexao'));

interface ValorContextoNovaConexao {
  abrir: () => void;
}

const ContextoNovaConexao = createContext<ValorContextoNovaConexao | null>(null);

export function ProvedorNovaConexao({ children }: { children: ReactNode }) {
  const { registrarConexao } = useConexao();
  const notificacoes = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [geracao, setGeracao] = useState(0);
  const renovarFormulario = useRef(false);

  const abrir = useCallback(() => {
    if (renovarFormulario.current) {
      renovarFormulario.current = false;
      setGeracao((valor) => valor + 1);
    }
    setCarregado(true);
    setAberto(true);
  }, []);

  const fechar = useCallback(() => setAberto(false), []);

  const aoConectar = useCallback(
    (conexao: ConexaoDTO) => {
      renovarFormulario.current = true;
      registrarConexao(conexao);
      setAberto(false);
      notificacoes.sucesso(`Conectado a ${conexao.nome}.`);
    },
    [registrarConexao, notificacoes],
  );

  const valor = useMemo<ValorContextoNovaConexao>(() => ({ abrir }), [abrir]);

  return (
    <ContextoNovaConexao.Provider value={valor}>
      {children}
      {carregado ? (
        <Suspense fallback={null}>
          <ModalConexao key={geracao} aberto={aberto} aoFechar={fechar} aoConectar={aoConectar} />
        </Suspense>
      ) : null}
    </ContextoNovaConexao.Provider>
  );
}

export function useNovaConexao(): ValorContextoNovaConexao {
  const contexto = useContext(ContextoNovaConexao);
  if (!contexto) throw new Error('useNovaConexao precisa estar dentro de <ProvedorNovaConexao>.');
  return contexto;
}
