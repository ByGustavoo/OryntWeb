import { useEffect, useState } from 'react';
import { PONTOS_QUEBRA } from '@/configuracoes/aplicacao';

export function useConsultaMidia(consulta: string): boolean {
  const [corresponde, setCorresponde] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const lista = window.matchMedia(consulta);
    const atualizar = (evento: MediaQueryListEvent) => setCorresponde(evento.matches);

    setCorresponde(lista.matches);
    lista.addEventListener('change', atualizar);
    return () => lista.removeEventListener('change', atualizar);
  }, [consulta]);

  return corresponde;
}

export const useMenuEmGaveta = () => useConsultaMidia(`(max-width: ${PONTOS_QUEBRA.gaveta}px)`);
