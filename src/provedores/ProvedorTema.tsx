import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { CHAVE_TEMA } from '@/configuracoes/aplicacao';
import { gravarArmazenamentoLocal, lerArmazenamentoLocal } from '@/ganchos/useArmazenamentoLocal';

export type ModoTema = 'claro' | 'escuro' | 'sistema';
export type TemaAplicado = 'claro' | 'escuro';

interface ValorContextoTema {
  modo: ModoTema;
  tema: TemaAplicado;
  temaDoSistema: TemaAplicado;
  definirModo: (modo: ModoTema) => void;
  alternarTema: () => void;
}

const ContextoTema = createContext<ValorContextoTema | null>(null);

const CONSULTA_TEMA_ESCURO = '(prefers-color-scheme: dark)';
const CONSULTA_MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)';
const CLASSE_TROCANDO_TEMA = 'trocando-tema';
const CLASSE_CRUZANDO_TEMA = 'cruzando-tema';
const DURACAO_TROCA_TEMA_MS = 640;
const TEMA_DE_IMPRESSAO: TemaAplicado = 'claro';

interface DocumentoComTransicao {
  startViewTransition?: (atualizar: () => void) => { finished: Promise<void> };
}

let temporizadorTroca = 0;

function suavizarTroca(): void {
  const raiz = document.documentElement;
  raiz.classList.add(CLASSE_TROCANDO_TEMA);
  window.clearTimeout(temporizadorTroca);
  temporizadorTroca = window.setTimeout(() => raiz.classList.remove(CLASSE_TROCANDO_TEMA), DURACAO_TROCA_TEMA_MS);
}

function trocarComTransicao(aplicar: () => void): void {
  const documento = document as unknown as DocumentoComTransicao;
  const podeCruzar =
    documento.startViewTransition &&
    document.visibilityState === 'visible' &&
    !window.matchMedia(CONSULTA_MOVIMENTO_REDUZIDO).matches;

  if (!podeCruzar || !documento.startViewTransition) {
    suavizarTroca();
    aplicar();
    return;
  }

  const raiz = document.documentElement;
  const limpar = () => raiz.classList.remove(CLASSE_CRUZANDO_TEMA);
  raiz.classList.add(CLASSE_CRUZANDO_TEMA);
  documento.startViewTransition(aplicar).finished.then(limpar, limpar);
}

function lerModoSalvo(): ModoTema {
  const salvo = lerArmazenamentoLocal<string>(CHAVE_TEMA, 'escuro');
  return salvo === 'claro' || salvo === 'sistema' ? salvo : 'escuro';
}

function temaDoSistema(): TemaAplicado {
  return window.matchMedia(CONSULTA_TEMA_ESCURO).matches ? 'escuro' : 'claro';
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoTema>(lerModoSalvo);
  const [preferenciaSistema, setPreferenciaSistema] = useState<TemaAplicado>(temaDoSistema);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_TEMA_ESCURO);
    const atualizar = (evento: MediaQueryListEvent) => setPreferenciaSistema(evento.matches ? 'escuro' : 'claro');
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);

  const tema: TemaAplicado = modo === 'sistema' ? preferenciaSistema : modo;

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    const raiz = document.documentElement;
    const clarear = () => {
      raiz.dataset.tema = TEMA_DE_IMPRESSAO;
    };
    const restaurar = () => {
      raiz.dataset.tema = tema;
    };
    window.addEventListener('beforeprint', clarear);
    window.addEventListener('afterprint', restaurar);
    return () => {
      window.removeEventListener('beforeprint', clarear);
      window.removeEventListener('afterprint', restaurar);
    };
  }, [tema]);

  const definirModo = useCallback(
    (proximo: ModoTema) => {
      const resolvido: TemaAplicado = proximo === 'sistema' ? preferenciaSistema : proximo;
      gravarArmazenamentoLocal(CHAVE_TEMA, proximo);
      trocarComTransicao(() => {
        document.documentElement.dataset.tema = resolvido;
        flushSync(() => setModo(proximo));
      });
    },
    [preferenciaSistema],
  );

  const alternarTema = useCallback(() => {
    definirModo(tema === 'escuro' ? 'claro' : 'escuro');
  }, [definirModo, tema]);

  const valor = useMemo<ValorContextoTema>(
    () => ({ modo, tema, temaDoSistema: preferenciaSistema, definirModo, alternarTema }),
    [modo, tema, preferenciaSistema, definirModo, alternarTema],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorContextoTema {
  const contexto = useContext(ContextoTema);
  if (!contexto) throw new Error('useTema precisa estar dentro de <ProvedorTema>.');
  return contexto;
}
