import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { avisarDestinoMontado } from '@/utilitarios/travessia';

export function RotaProtegida() {
  const { situacao } = useConexao();

  useLayoutEffect(avisarDestinoMontado, []);

  if (situacao === 'VERIFICANDO') return <TelaVerificacao />;
  return <Outlet />;
}
