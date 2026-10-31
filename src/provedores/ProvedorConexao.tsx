import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import { ehErroApi } from '@/api/tratamentoErros';
import type { ConexaoDTO, ConexaoSalvaDTO } from '@/modelos/conexao';
import {
  conexaoMaisRecente,
  ordenarPorUso,
  registrarConexaoSalva,
  removerConexaoSalva,
  salvaDaConexao,
} from '@/regras/conexoesSalvas';
import { interpretarFalhaConexao } from '@/regras/falhaConexao';
import type { FalhaConexao } from '@/regras/falhaConexao';
import { servicoConexao } from '@/servicos';
import { useAutenticacao } from './ProvedorAutenticacao';
import { useNotificacoes } from './ProvedorNotificacoes';

export type SituacaoConexao = 'VERIFICANDO' | 'CONECTANDO' | 'CONECTADA' | 'DESCONECTADA' | 'INDISPONIVEL';

export interface FalhaReconexao {
  conexao: ConexaoSalvaDTO;
  falha: FalhaConexao;
}

interface EstadoConexao {
  situacao: SituacaoConexao;
  conexao: ConexaoDTO | null;
  salvas: ConexaoSalvaDTO[];
  alvo: ConexaoSalvaDTO | null;
  falhaReconexao: FalhaReconexao | null;
  erroVerificacao: unknown;
  verificandoDeNovo: boolean;
}

interface ValorContextoConexao extends EstadoConexao {
  registrarConexao: (conexao: ConexaoDTO) => void;
  guardarSalva: (salva: ConexaoSalvaDTO) => void;
  ativarConexao: (salva: ConexaoSalvaDTO) => Promise<void>;
  excluirConexao: (id: string) => Promise<void>;
  encerrarConexao: () => Promise<void>;
  marcarDesconectada: () => void;
  verificarNovamente: () => void;
}

const ContextoConexao = createContext<ValorContextoConexao | null>(null);

const INICIAL: EstadoConexao = {
  situacao: 'VERIFICANDO',
  conexao: null,
  salvas: [],
  alvo: null,
  falhaReconexao: null,
  erroVerificacao: null,
  verificandoDeNovo: false,
};

function conectada(conexao: ConexaoDTO, salvas: ConexaoSalvaDTO[]): EstadoConexao {
  return { ...INICIAL, situacao: 'CONECTADA', conexao, salvas };
}

function desconectada(salvas: ConexaoSalvaDTO[], falhaReconexao: FalhaReconexao | null = null): EstadoConexao {
  return { ...INICIAL, situacao: 'DESCONECTADA', salvas, falhaReconexao };
}

export function ProvedorConexao({ children }: { children: ReactNode }) {
  const { situacao: situacaoAcesso, marcarAnonima } = useAutenticacao();
  const notificacoes = useNotificacoes();
  const [estado, setEstado] = useState<EstadoConexao>(INICIAL);
  const [tentativa, setTentativa] = useState(0);
  const temSessao = situacaoAcesso !== 'ANONIMA';

  const ativar = useCallback(async (salva: ConexaoSalvaDTO, signal?: AbortSignal): Promise<FalhaConexao | null> => {
    setEstado((anterior) => ({
      ...anterior,
      situacao: anterior.conexao ? 'CONECTADA' : 'CONECTANDO',
      alvo: salva,
      falhaReconexao: null,
      erroVerificacao: null,
    }));
    try {
      const conexao = await servicoConexao.ativarConexao(salva.id, signal);
      if (signal?.aborted) return null;
      setEstado((anterior) => conectada(conexao, registrarConexaoSalva(anterior.salvas, salvaDaConexao(conexao))));
      return null;
    } catch (erro) {
      if (signal?.aborted || ehCancelamento(erro)) return null;
      const falha = interpretarFalhaConexao(erro, salva);
      setEstado((anterior) =>
        anterior.conexao ? conectada(anterior.conexao, anterior.salvas) : desconectada(anterior.salvas, { conexao: salva, falha }),
      );
      return falha;
    }
  }, []);

  useEffect(() => {
    if (!temSessao) {
      setEstado(INICIAL);
      return;
    }
    setEstado((anterior) => (anterior.situacao === 'INDISPONIVEL' ? { ...anterior, verificandoDeNovo: true } : INICIAL));

    const controlador = new AbortController();
    const { signal } = controlador;

    const verificar = async () => {
      const [atual, lista] = await Promise.allSettled([
        servicoConexao.buscarConexaoAtual(signal),
        servicoConexao.listarConexoes(signal),
      ]);
      if (signal.aborted) return;

      if (lista.status === 'rejected') {
        if (ehErroApi(lista.reason, 'NAO_AUTORIZADO')) marcarAnonima();
        else setEstado({ ...INICIAL, situacao: 'INDISPONIVEL', erroVerificacao: lista.reason });
        return;
      }

      const salvas = ordenarPorUso(lista.value);
      if (atual.status === 'fulfilled') {
        setEstado(conectada(atual.value, salvas));
        return;
      }
      if (!ehErroApi(atual.reason, 'NAO_AUTORIZADO')) {
        setEstado({ ...INICIAL, situacao: 'INDISPONIVEL', salvas, erroVerificacao: atual.reason });
        return;
      }

      const recente = conexaoMaisRecente(salvas);
      if (!recente) {
        setEstado(desconectada(salvas));
        return;
      }
      setEstado({ ...INICIAL, situacao: 'CONECTANDO', salvas, alvo: recente });
      await ativar(recente, signal);
    };

    void verificar();
    return () => controlador.abort();
  }, [temSessao, tentativa, ativar, marcarAnonima]);

  const registrarConexao = useCallback((conexao: ConexaoDTO) => {
    setEstado((anterior) => conectada(conexao, registrarConexaoSalva(anterior.salvas, salvaDaConexao(conexao))));
  }, []);

  const guardarSalva = useCallback((salva: ConexaoSalvaDTO) => {
    setEstado((anterior) => ({
      ...anterior,
      conexao:
        anterior.conexao?.id === salva.id
          ? { ...anterior.conexao, nome: salva.nome, host: salva.host, porta: salva.porta, banco: salva.banco, usuario: salva.usuario }
          : anterior.conexao,
      salvas: ordenarPorUso([...anterior.salvas.filter((item) => item.id !== salva.id), salva]),
    }));
  }, []);

  const ativarConexao = useCallback(
    async (salva: ConexaoSalvaDTO) => {
      const falha = await ativar(salva);
      if (falha) {
        notificacoes.erro(`Não foi possível conectar a ${salva.nome}.`, `${falha.descricao} ${falha.orientacao}`);
        return;
      }
      notificacoes.sucesso(`Conectado a ${salva.nome}.`);
    },
    [ativar, notificacoes],
  );

  const excluirConexao = useCallback(async (id: string) => {
    await servicoConexao.excluirConexao(id);
    setEstado((anterior) => {
      const salvas = removerConexaoSalva(anterior.salvas, id);
      if (anterior.conexao?.id === id) return desconectada(salvas);
      const falhaReconexao = anterior.falhaReconexao?.conexao.id === id ? null : anterior.falhaReconexao;
      return { ...anterior, salvas, falhaReconexao };
    });
  }, []);

  const encerrarConexao = useCallback(async () => {
    await servicoConexao.encerrarConexao();
    setEstado((anterior) => desconectada(anterior.salvas));
  }, []);

  const marcarDesconectada = useCallback(() => setEstado((anterior) => desconectada(anterior.salvas)), []);

  const verificarNovamente = useCallback(() => setTentativa((valor) => valor + 1), []);

  const valor = useMemo<ValorContextoConexao>(
    () => ({
      ...estado,
      registrarConexao,
      guardarSalva,
      ativarConexao,
      excluirConexao,
      encerrarConexao,
      marcarDesconectada,
      verificarNovamente,
    }),
    [
      estado,
      registrarConexao,
      guardarSalva,
      ativarConexao,
      excluirConexao,
      encerrarConexao,
      marcarDesconectada,
      verificarNovamente,
    ],
  );

  return <ContextoConexao.Provider value={valor}>{children}</ContextoConexao.Provider>;
}

export function useConexao(): ValorContextoConexao {
  const contexto = useContext(ContextoConexao);
  if (!contexto) throw new Error('useConexao precisa estar dentro de <ProvedorConexao>.');
  return contexto;
}
