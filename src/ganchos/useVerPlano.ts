import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { estadoDoPlano } from '@/regras/planoExecucao';
import { caminhos } from '@/rotas/caminhos';

export function useVerPlano(): (consulta: string, versao?: string | null, comparacao?: string | null) => void {
  const navegar = useNavigate();

  return useCallback(
    (consulta: string, versao: string | null = null, comparacao: string | null = null) =>
      navegar(caminhos.consultasPlanos, { state: estadoDoPlano(consulta, versao, comparacao) }),
    [navegar],
  );
}
