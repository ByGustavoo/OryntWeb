import { useEffect, useRef, useState } from 'react';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { atravessar } from '@/utilitarios/travessia';

const ESPERA_MAXIMA_DA_VERIFICACAO_MS = 1200;

interface ChegadaNaAplicacao {
  liberada: boolean;
  tentativa: number;
}

export function useChegadaNaAplicacao(): ChegadaNaAplicacao {
  const { situacao: acesso } = useAutenticacao();
  const { situacao: conexao } = useConexao();
  const [entrouPorAqui, setEntrouPorAqui] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [esperaEsgotada, setEsperaEsgotada] = useState(false);
  const [retinha, setRetinha] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const transitando = useRef(false);

  if (acesso === 'ANONIMA' && !entrouPorAqui) setEntrouPorAqui(true);

  const autenticada = acesso === 'AUTENTICADA';
  const retendo = autenticada && entrouPorAqui && !liberada;
  const conexaoVerificada = conexao !== 'VERIFICANDO';

  if (retinha !== retendo) {
    setRetinha(retendo);
    if (retinha && !liberada) {
      setEsperaEsgotada(false);
      setTentativa((atual) => atual + 1);
    }
  }

  useEffect(() => {
    if (!retendo) return;
    transitando.current = false;
    void import('@/paginas/PaginaDashboard');
    const limite = window.setTimeout(() => setEsperaEsgotada(true), ESPERA_MAXIMA_DA_VERIFICACAO_MS);
    return () => window.clearTimeout(limite);
  }, [retendo]);

  useEffect(() => {
    if (!retendo || transitando.current || !(conexaoVerificada || esperaEsgotada)) return;
    transitando.current = true;
    atravessar('chegada', () => setLiberada(true));
  }, [retendo, conexaoVerificada, esperaEsgotada]);

  return { liberada: autenticada && (liberada || !entrouPorAqui), tentativa };
}
