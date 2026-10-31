import { Navigate, Outlet } from 'react-router-dom';
import { EsqueletoAplicacao } from '@/componentes/comum/EsqueletoAplicacao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { caminhos } from './caminhos';

export function RotaAutenticada() {
  const { situacao } = useAutenticacao();

  if (situacao === 'VERIFICANDO') return <EsqueletoAplicacao rotulo="Verificando o acesso…" />;
  if (situacao === 'ANONIMA') return <Navigate to={caminhos.login} replace />;
  return <Outlet />;
}
