import { useCallback, useState } from 'react';

export function lerArmazenamentoLocal<T>(chave: string, valorPadrao: T): T {
  try {
    const salvo = window.localStorage.getItem(chave);
    return salvo ? (JSON.parse(salvo) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function gravarArmazenamentoLocal<T>(chave: string, valor: T): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    return;
  }
}

export function useArmazenamentoLocal<T>(chave: string, valorPadrao: T) {
  const [valor, setValor] = useState<T>(() => lerArmazenamentoLocal(chave, valorPadrao));

  const atualizar = useCallback(
    (proximo: T) => {
      setValor(proximo);
      gravarArmazenamentoLocal(chave, proximo);
    },
    [chave],
  );

  return [valor, atualizar] as const;
}
