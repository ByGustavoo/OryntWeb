import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { destinoInicial, funcionalidadesPlanejadas } from '@/configuracoes/navegacao';
import { LayoutAplicacao } from '@/layouts/LayoutAplicacao';
import { RotaAutenticada } from './RotaAutenticada';
import { RotaProtegida } from './RotaProtegida';
import { RotaVisitante } from './RotaVisitante';
import { caminhos } from './caminhos';

const PaginaLogin = lazy(() => import('@/paginas/PaginaLogin'));
const PaginaDashboard = lazy(() => import('@/paginas/PaginaDashboard'));
const PaginaFuncionalidadePlanejada = lazy(() => import('@/paginas/PaginaFuncionalidadePlanejada'));
const PaginaConfiguracoes = lazy(() => import('@/paginas/PaginaConfiguracoes'));
const PaginaNaoEncontrada = lazy(() => import('@/paginas/PaginaNaoEncontrada'));

export function RotasAplicacao() {
  return (
    <Routes>
      <Route element={<RotaVisitante />}>
        <Route
          path={caminhos.login}
          element={
            <Suspense fallback={null}>
              <PaginaLogin />
            </Suspense>
          }
        />
      </Route>

      <Route element={<RotaAutenticada />}>
        <Route element={<RotaProtegida />}>
          <Route element={<LayoutAplicacao />}>
            <Route path={caminhos.inicio} element={<Navigate to={caminhos.dashboard} replace />} />
            <Route path={caminhos.dashboard} element={<PaginaDashboard />} />
            {funcionalidadesPlanejadas.map((funcionalidade) => (
              <Route
                key={funcionalidade.destino}
                path={funcionalidade.destino}
                element={<Navigate to={destinoInicial(funcionalidade)} replace />}
              />
            ))}
            {funcionalidadesPlanejadas.flatMap((funcionalidade) =>
              funcionalidade.filhos.map((tela) => (
                <Route
                  key={tela.destino}
                  path={tela.destino}
                  element={<PaginaFuncionalidadePlanejada funcionalidade={funcionalidade} tela={tela} />}
                />
              )),
            )}
            <Route path={caminhos.configuracoes} element={<PaginaConfiguracoes />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Suspense fallback={null}>
            <PaginaNaoEncontrada />
          </Suspense>
        }
      />
    </Routes>
  );
}
