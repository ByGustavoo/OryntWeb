import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';
import { ehCancelamento } from '@/api/ErroApi';

interface EstadoAssincrono<T> {
  dados: T | null;
  carregando: boolean;
  erro: Error | null;
}

export interface ResultadoAssincrono<T> extends EstadoAssincrono<T> {
  recarregar: () => void;
}

export function useDadosAssincronos<T>(
  buscar: (signal: AbortSignal) => Promise<T>,
  dependencias: DependencyList = [],
): ResultadoAssincrono<T> {
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const [estado, setEstado] = useState<EstadoAssincrono<T>>({ dados: null, carregando: true, erro: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));

    buscarRef
      .current(controlador.signal)
      .then((dados) => {
        if (!controlador.signal.aborted) setEstado({ dados, carregando: false, erro: null });
      })
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || ehCancelamento(erro)) return;
        setEstado({ dados: null, carregando: false, erro: erro instanceof Error ? erro : new Error('Erro inesperado.') });
      });

    return () => controlador.abort();
  }, [...dependencias, tentativa]);

  const recarregar = useCallback(() => setTentativa((valor) => valor + 1), []);

  return { ...estado, recarregar };
}
