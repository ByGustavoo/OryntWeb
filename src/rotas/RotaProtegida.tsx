import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { EsqueletoAplicacao } from '@/componentes/comum/EsqueletoAplicacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { avisarDestinoMontado } from '@/utilitarios/travessia';

export function RotaProtegida() {
  const { situacao } = useConexao();

  useLayoutEffect(avisarDestinoMontado, []);

  if (situacao === 'VERIFICANDO') return <EsqueletoAplicacao rotulo="Verificando a conexão…" />;
  return <Outlet />;
}
