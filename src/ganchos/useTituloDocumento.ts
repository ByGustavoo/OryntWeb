import { useEffect } from 'react';
import { definirTituloBase } from '@/utilitarios/tituloDocumento';

export function useTituloDocumento(titulo: string): void {
  useEffect(() => {
    definirTituloBase(titulo);
  }, [titulo]);
}
