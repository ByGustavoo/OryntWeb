import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AreaNotificacoes, ItemNotificacao } from '@/componentes/ui/Notificacao';
import type { AcaoNotificacao, MensagemNotificacao, VarianteNotificacao } from '@/componentes/ui/Notificacao';

export interface EntradaNotificacao {
  titulo: string;
  descricao?: string;
  variante?: VarianteNotificacao;
  acao?: AcaoNotificacao;
}

interface ValorContextoNotificacoes {
  notificar: (entrada: EntradaNotificacao) => void;
  sucesso: (titulo: string, descricao?: string) => void;
  aviso: (titulo: string, descricao?: string) => void;
  informacao: (titulo: string, descricao?: string) => void;
  erro: (titulo: string, descricao?: string) => void;
  dispensar: (id: string) => void;
}

const ContextoNotificacoes = createContext<ValorContextoNotificacoes | null>(null);

const DURACAO_BASE_MS: Record<VarianteNotificacao, number> = {
  sucesso: 4000,
  informacao: 5000,
  aviso: 6500,
  erro: 8000,
};
const MS_POR_CARACTERE_EXTRA = 45;
const CARACTERES_LEITURA_BASE = 60;
const DURACAO_MAXIMA_MS = 12000;
const DURACAO_SAIDA_MS = 360;
const MAXIMO_VISIVEIS = 3;

function calcularDuracao(entrada: EntradaNotificacao, variante: VarianteNotificacao): number {
  const caracteres = entrada.titulo.length + (entrada.descricao?.length ?? 0);
  const extra = Math.max(0, caracteres - CARACTERES_LEITURA_BASE) * MS_POR_CARACTERE_EXTRA;
  const minimoComAcao = entrada.acao ? 8000 : 0;
  return Math.min(Math.max(DURACAO_BASE_MS[variante] + extra, minimoComAcao), DURACAO_MAXIMA_MS);
}

function marcarSaida(lista: MensagemNotificacao[], ids: Set<string>): MensagemNotificacao[] {
  return lista.map((item) => (ids.has(item.id) && !item.saindo ? { ...item, saindo: true } : item));
}

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<MensagemNotificacao[]>([]);
  const [pausado, setPausado] = useState(false);
  const remocoes = useRef(new Map<string, number>());

  useEffect(() => {
    notificacoes.forEach((item) => {
      if (!item.saindo || remocoes.current.has(item.id)) return;
      const temporizador = window.setTimeout(() => {
        remocoes.current.delete(item.id);
        setNotificacoes((atual) => atual.filter((outra) => outra.id !== item.id));
      }, DURACAO_SAIDA_MS);
      remocoes.current.set(item.id, temporizador);
    });
  }, [notificacoes]);

  useEffect(() => {
    const pendentes = remocoes.current;
    return () => {
      pendentes.forEach((temporizador) => window.clearTimeout(temporizador));
      pendentes.clear();
    };
  }, []);

  const dispensar = useCallback((id: string) => {
    setNotificacoes((atual) => marcarSaida(atual, new Set([id])));
  }, []);

  const notificar = useCallback((entrada: EntradaNotificacao) => {
    const variante = entrada.variante ?? 'informacao';
    const duracao = calcularDuracao(entrada, variante);

    setNotificacoes((atual) => {
      const repetida = atual.find(
        (item) =>
          !item.saindo &&
          item.variante === variante &&
          item.titulo === entrada.titulo &&
          item.descricao === entrada.descricao,
      );
      if (repetida) {
        return atual.map((item) => (item === repetida ? { ...item, duracao, versao: item.versao + 1 } : item));
      }

      const nova: MensagemNotificacao = {
        id: crypto.randomUUID(),
        titulo: entrada.titulo,
        descricao: entrada.descricao,
        acao: entrada.acao,
        variante,
        duracao,
        versao: 0,
        saindo: false,
      };
      const ativas = atual.filter((item) => !item.saindo);
      const excedentes = ativas.slice(0, Math.max(0, ativas.length + 1 - MAXIMO_VISIVEIS));
      return [...marcarSaida(atual, new Set(excedentes.map((item) => item.id))), nova];
    });
  }, []);

  const valor = useMemo<ValorContextoNotificacoes>(
    () => ({
      notificar,
      dispensar,
      sucesso: (titulo, descricao) => notificar({ titulo, descricao, variante: 'sucesso' }),
      aviso: (titulo, descricao) => notificar({ titulo, descricao, variante: 'aviso' }),
      informacao: (titulo, descricao) => notificar({ titulo, descricao, variante: 'informacao' }),
      erro: (titulo, descricao) => notificar({ titulo, descricao, variante: 'erro' }),
    }),
    [notificar, dispensar],
  );

  return (
    <ContextoNotificacoes.Provider value={valor}>
      {children}
      <AreaNotificacoes quantidade={notificacoes.length} aoPausar={setPausado}>
        {notificacoes.map((item) => (
          <ItemNotificacao key={item.id} notificacao={item} pausado={pausado} aoDispensar={dispensar} />
        ))}
      </AreaNotificacoes>
    </ContextoNotificacoes.Provider>
  );
}

export function useNotificacoes(): ValorContextoNotificacoes {
  const contexto = useContext(ContextoNotificacoes);
  if (!contexto) throw new Error('useNotificacoes precisa estar dentro de <ProvedorNotificacoes>.');
  return contexto;
}
