import { Navigate, Outlet } from 'react-router-dom';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { caminhos } from './caminhos';

export function RotaProtegida() {
  const { situacao } = useConexao();

  if (situacao === 'VERIFICANDO') return <TelaVerificacao />;
  if (situacao === 'DESCONECTADA') return <Navigate to={caminhos.conexao} replace />;
  return <Outlet />;
}
