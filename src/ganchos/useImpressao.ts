import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';

const ESPERA_PARA_PINTAR_MS = 50;
const IDENTIFICACAO_DA_FOLHA = '--folha-identificacao';

interface Impressao {
  imprimir: () => void;
  imprimindo: boolean;
  instante: Date;
}

export function useImpressao(documento: string, assunto: string): Impressao {
  const [imprimindo, setImprimindo] = useState(false);
  const [instante, setInstante] = useState(() => new Date());
  const folha = useRef({ arquivo: '', identificacao: '' });
  folha.current = {
    arquivo: `${NOME_APLICACAO} - ${documento} - ${assunto}`,
    identificacao: `${documento} · ${assunto}`,
  };
  const temporizador = useRef(0);

  useEffect(() => {
    const raiz = document.documentElement;
    let tituloDaTela: string | null = null;
    const preparar = () => {
      if (tituloDaTela === null) tituloDaTela = document.title;
      document.title = folha.current.arquivo;
      raiz.style.setProperty(IDENTIFICACAO_DA_FOLHA, JSON.stringify(folha.current.identificacao));
      flushSync(() => setInstante(new Date()));
    };
    const concluir = () => {
      if (tituloDaTela !== null) document.title = tituloDaTela;
      tituloDaTela = null;
      raiz.style.removeProperty(IDENTIFICACAO_DA_FOLHA);
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
