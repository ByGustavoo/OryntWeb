import { Navigate, Outlet } from 'react-router-dom';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { caminhos } from './caminhos';

export function RotaAutenticada() {
  const { situacao } = useAutenticacao();

  if (situacao === 'VERIFICANDO') return <TelaVerificacao mensagem="Verificando o acesso…" />;
  if (situacao === 'ANONIMA') return <Navigate to={caminhos.login} replace />;
  return <Outlet />;
}
