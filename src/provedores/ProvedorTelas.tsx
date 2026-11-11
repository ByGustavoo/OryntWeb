import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { descreverFalha } from '@/api/tratamentoErros';
import type { CodigoTela } from '@/modelos/telas';
import { normalizarTelas, rotuloDaTela, telaDoDestino } from '@/regras/telasOcultas';
import { servicoTelas } from '@/servicos';
import { useAutenticacao } from './ProvedorAutenticacao';
import { useNotificacoes } from './ProvedorNotificacoes';

export type EstadoGravacaoTelas = 'PARADO' | 'SALVANDO' | 'SALVO';

interface ValorContextoTelas {
  telasOcultas: CodigoTela[];
  carregado: boolean;
  erro: unknown;
  estadoGravacao: EstadoGravacaoTelas;
  estaOculta: (destino: string) => boolean;
  definirOculta: (tela: CodigoTela, oculta: boolean) => void;
  mostrarTodas: () => void;
  recarregar: () => void;
}

const ContextoTelas = createContext<ValorContextoTelas | null>(null);

export function ProvedorTelas({ children }: { children: ReactNode }) {
  const notificacoes = useNotificacoes();
  const { usuario } = useAutenticacao();
  const idConta = usuario?.id ?? null;
  const [telasOcultas, setTelasOcultas] = useState<CodigoTela[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [estadoGravacao, setEstadoGravacao] = useState<EstadoGravacaoTelas>('PARADO');
  const [versao, setVersao] = useState(0);
  const atuais = useRef<CodigoTela[]>([]);
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const pendentes = useRef(0);

  useEffect(() => {
    if (!idConta) return;
    const controle = new AbortController();
    setCarregado(false);
    setErro(null);
    setEstadoGravacao('PARADO');

    servicoTelas
      .buscarOcultas(controle.signal)
      .then((resposta) => {
        const telas = normalizarTelas(resposta.telas);
        atuais.current = telas;
        setTelasOcultas(telas);
        setCarregado(true);
      })
      .catch((causa: unknown) => {
        if (controle.signal.aborted) return;
        atuais.current = [];
        setTelasOcultas([]);
        setErro(causa);
        setCarregado(true);
      });

    return () => controle.abort();
  }, [idConta, versao]);

  const recarregar = useCallback(() => setVersao((valor) => valor + 1), []);

  const estaOculta = useCallback(
    (destino: string) => {
      const tela = telaDoDestino(destino);
      return tela !== null && telasOcultas.includes(tela);
    },
    [telasOcultas],
  );

  const salvar = useCallback(
    (proximas: CodigoTela[], mensagemErro: string) => {
      const anteriores = atuais.current;
      const normalizadas = normalizarTelas(proximas);

      atuais.current = normalizadas;
      setTelasOcultas(normalizadas);
      setEstadoGravacao('SALVANDO');
      pendentes.current += 1;

      fila.current = fila.current
        .then(() => servicoTelas.atualizarOcultas({ telas: normalizadas }))
        .catch((causa: unknown) => {
          atuais.current = anteriores;
          setTelasOcultas(anteriores);
          notificacoes.erro(mensagemErro, descreverFalha(causa));
        })
        .finally(() => {
          pendentes.current -= 1;
          if (pendentes.current === 0) setEstadoGravacao('SALVO');
        });
    },
    [notificacoes],
  );

  const definirOculta = useCallback(
    (tela: CodigoTela, oculta: boolean) => {
      const outras = atuais.current.filter((item) => item !== tela);
      const rotulo = rotuloDaTela(tela);
      salvar(oculta ? [...outras, tela] : outras, oculta ? `Não foi possível ocultar ${rotulo}.` : `Não foi possível mostrar ${rotulo}.`);
    },
    [salvar],
  );

  const mostrarTodas = useCallback(() => salvar([], 'Não foi possível mostrar as telas ocultas.'), [salvar]);

  const valor = useMemo(
    () => ({ telasOcultas, carregado, erro, estadoGravacao, estaOculta, definirOculta, mostrarTodas, recarregar }),
    [telasOcultas, carregado, erro, estadoGravacao, estaOculta, definirOculta, mostrarTodas, recarregar],
  );

  return <ContextoTelas.Provider value={valor}>{children}</ContextoTelas.Provider>;
}

export function useTelas(): ValorContextoTelas {
  const contexto = useContext(ContextoTelas);
  if (!contexto) throw new Error('useTelas precisa estar dentro de ProvedorTelas.');
  return contexto;
}
