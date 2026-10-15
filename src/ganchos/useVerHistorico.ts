import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { estadoDoHistorico } from '@/regras/historicoConsulta';
import { caminhos } from '@/rotas/caminhos';

export function useVerHistorico(): (consulta: string, periodo: PeriodoDashboard) => void {
  const navegar = useNavigate();

  return useCallback(
    (consulta: string, periodo: PeriodoDashboard) =>
      navegar(caminhos.consultasHistorico, { state: estadoDoHistorico(consulta, periodo) }),
    [navegar],
  );
}
