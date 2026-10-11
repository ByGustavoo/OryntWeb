import { Navigate, Outlet } from 'react-router-dom';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { caminhos } from './caminhos';

export function RotaVisitante() {
  const { situacao } = useAutenticacao();

  if (situacao !== 'AUTENTICADA') return <Outlet />;
  return <Navigate to={caminhos.dashboard} replace />;
}
