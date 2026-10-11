import { useCallback, useState } from 'react';
import { CHAVE_CONEXOES_RECENTES } from '@/configuracoes/aplicacao';
import type { ConexaoRecente } from '@/modelos/conexao';
import { lerConexoesRecentes, registrarConexaoRecente, removerConexaoRecente } from '@/regras/conexoesRecentes';
import type { DadosConexaoRecente } from '@/regras/conexoesRecentes';
import { gravarArmazenamentoLocal, lerArmazenamentoLocal } from './useArmazenamentoLocal';

function lerSalvas(): ConexaoRecente[] {
  return lerConexoesRecentes(lerArmazenamentoLocal<unknown>(CHAVE_CONEXOES_RECENTES, []));
}

export function useConexoesRecentes() {
  const [recentes, setRecentes] = useState<ConexaoRecente[]>(lerSalvas);

  const atualizar = useCallback((transformar: (lista: ConexaoRecente[]) => ConexaoRecente[]) => {
    const proximas = transformar(lerSalvas());
    gravarArmazenamentoLocal(CHAVE_CONEXOES_RECENTES, proximas);
    setRecentes(proximas);
  }, []);

  const registrar = useCallback(
    (conexao: DadosConexaoRecente) => atualizar((lista) => registrarConexaoRecente(lista, conexao, new Date())),
    [atualizar],
  );

  const remover = useCallback(
    (conexao: DadosConexaoRecente) => atualizar((lista) => removerConexaoRecente(lista, conexao)),
    [atualizar],
  );

  return { recentes, registrar, remover };
}
