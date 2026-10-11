import { Outlet } from 'react-router-dom';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { useConexao } from '@/provedores/ProvedorConexao';

export function RotaProtegida() {
  const { situacao } = useConexao();

  if (situacao === 'VERIFICANDO') return <TelaVerificacao />;
  return <Outlet />;
}
