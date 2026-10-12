import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const ESPERA_PARA_PINTAR_MS = 50;

interface Impressao {
  imprimir: () => void;
  imprimindo: boolean;
  instante: Date;
}

export function useImpressao(nomeDoDocumento: string): Impressao {
  const [imprimindo, setImprimindo] = useState(false);
  const [instante, setInstante] = useState(() => new Date());
  const nome = useRef(nomeDoDocumento);
  nome.current = nomeDoDocumento;
  const temporizador = useRef(0);

  useEffect(() => {
    let tituloDaTela: string | null = null;
    const preparar = () => {
      if (tituloDaTela === null) tituloDaTela = document.title;
      document.title = nome.current;
      flushSync(() => setInstante(new Date()));
    };
    const concluir = () => {
      if (tituloDaTela !== null) document.title = tituloDaTela;
      tituloDaTela = null;
      setImprimindo(false);
    };
    window.addEventListener('beforeprint', preparar);
    window.addEventListener('afterprint', concluir);
    return () => {
      window.removeEventListener('beforeprint', preparar);
      window.removeEventListener('afterprint', concluir);
      window.clearTimeout(temporizador.current);
      concluir();
    };
  }, []);

  const imprimir = useCallback(() => {
    setImprimindo(true);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      window.print();
      setImprimindo(false);
    }, ESPERA_PARA_PINTAR_MS);
  }, []);

  return { imprimir, imprimindo, instante };
}
