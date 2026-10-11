import { Navigate, Outlet } from 'react-router-dom';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { caminhos } from './caminhos';

export function RotaVisitante() {
  const { situacao } = useAutenticacao();
  const { situacao: situacaoConexao } = useConexao();

  if (situacao !== 'AUTENTICADA') return <Outlet />;
  if (situacaoConexao === 'VERIFICANDO') return <TelaVerificacao />;
  return <Navigate to={situacaoConexao === 'CONECTADA' ? caminhos.dashboard : caminhos.conexao} replace />;
}
