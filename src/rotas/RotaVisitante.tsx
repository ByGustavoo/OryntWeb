import { Fragment } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useChegadaNaAplicacao } from '@/ganchos/useChegadaNaAplicacao';
import { caminhos } from './caminhos';

export function RotaVisitante() {
  const { liberada, tentativa } = useChegadaNaAplicacao();

  if (liberada) return <Navigate to={caminhos.dashboard} replace />;
  return (
    <Fragment key={tentativa}>
      <Outlet />
    </Fragment>
  );
}
