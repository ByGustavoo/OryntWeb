import { Suspense, createContext, lazy, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AlteracaoDTO, OperacaoDTO, OrigemDaAlteracao } from '@/modelos/alteracoes';
import type { CamposConcessao, CamposPadrao } from '@/regras/formularioConcessao';
import { tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import { useConexao } from './ProvedorConexao';
import { useNotificacoes } from './ProvedorNotificacoes';

const ModalAlteracao = lazy(() => import('@/componentes/usuarios/ModalAlteracao'));

export type PedidoDeAlteracao =
  | { tipo: 'NOVO_PAPEL' }
  | { tipo: 'EDITAR_PAPEL'; papel: string; trocarSenha?: boolean }
  | { tipo: 'EXCLUIR_PAPEL'; papel: string }
  | { tipo: 'PARTICIPACAO'; grupo?: string | null; membro?: string | null }
  | { tipo: 'CONCESSAO'; inicial?: Partial<CamposConcessao> }
  | { tipo: 'PADRAO'; inicial?: Partial<CamposPadrao> }
  | { tipo: 'OPERACOES'; operacoes: OperacaoDTO[]; origem: OrigemDaAlteracao; desfaz?: string | null };

interface ValorContextoAlteracoes {
  abrir: (pedido: PedidoDeAlteracao) => void;
  versao: number;
  ultima: AlteracaoDTO | null;
}

const ContextoAlteracoes = createContext<ValorContextoAlteracoes | null>(null);

export function ProvedorAlteracoes({ children }: { children: ReactNode }) {
  const { conexao } = useConexao();
  const notificacoes = useNotificacoes();
  const [pedido, setPedido] = useState<PedidoDeAlteracao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);
  const [versao, setVersao] = useState(0);
  const [ultima, setUltima] = useState<AlteracaoDTO | null>(null);

  const abrir = useCallback((novo: PedidoDeAlteracao) => {
    setPedido(novo);
    setAbertura((valor) => valor + 1);
    setAberto(true);
  }, []);

  const fechar = useCallback(() => setAberto(false), []);

  const aoAplicar = useCallback(
    (alteracao: AlteracaoDTO) => {
      setAberto(false);
      setUltima(alteracao);
      setVersao((valor) => valor + 1);
      const titulo = `${tituloDaAlteracao(alteracao.operacoes, 'PASSADO')}.`;
      const inversas = alteracao.inversas;
      notificacoes.notificar({
        variante: 'sucesso',
        titulo,
        descricao: conexao?.simulada
          ? 'Aplicado aos dados de demonstração: nenhum banco real foi alterado.'
          : 'Os comandos rodaram no banco numa transação só.',
        acao: inversas
          ? {
              rotulo: 'Desfazer',
              aoExecutar: () => abrir({ tipo: 'OPERACOES', operacoes: inversas, origem: 'DESFAZER', desfaz: alteracao.id }),
            }
          : undefined,
      });
    },
    [abrir, conexao?.simulada, notificacoes],
  );

  const valor = useMemo<ValorContextoAlteracoes>(() => ({ abrir, versao, ultima }), [abrir, versao, ultima]);

  return (
    <ContextoAlteracoes.Provider value={valor}>
      {children}
      {pedido && conexao ? (
        <Suspense fallback={null}>
          <ModalAlteracao
            key={abertura}
            pedido={pedido}
            aberto={aberto}
            simulada={conexao.simulada}
            aoFechar={fechar}
            aoAplicar={aoAplicar}
          />
        </Suspense>
      ) : null}
    </ContextoAlteracoes.Provider>
  );
}

export function useAlteracoes(): ValorContextoAlteracoes {
  const contexto = useContext(ContextoAlteracoes);
  if (!contexto) throw new Error('useAlteracoes precisa estar dentro de <ProvedorAlteracoes>.');
  return contexto;
}
