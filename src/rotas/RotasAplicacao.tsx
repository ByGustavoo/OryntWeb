import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { destinoInicial, funcionalidades, telasPlanejadas } from '@/configuracoes/navegacao';
import { LayoutAplicacao } from '@/layouts/LayoutAplicacao';
import { RotaAutenticada } from './RotaAutenticada';
import { RotaProtegida } from './RotaProtegida';
import { RotaVisitante } from './RotaVisitante';
import { caminhos } from './caminhos';

const LayoutAcesso = lazy(() => import('@/layouts/LayoutAcesso'));
const PaginaLogin = lazy(() => import('@/paginas/PaginaLogin'));
const PaginaRecuperacaoSenha = lazy(() => import('@/paginas/PaginaRecuperacaoSenha'));
const PaginaDashboard = lazy(() => import('@/paginas/PaginaDashboard'));
const PaginaResumoRelatorio = lazy(() => import('@/paginas/PaginaResumoRelatorio'));
const PaginaExportacaoRelatorio = lazy(() => import('@/paginas/PaginaExportacaoRelatorio'));
const PaginaComparacaoRelatorio = lazy(() => import('@/paginas/PaginaComparacaoRelatorio'));
const PaginaTodasConsultas = lazy(() => import('@/paginas/PaginaTodasConsultas'));
const PaginaHistoricoConsulta = lazy(() => import('@/paginas/PaginaHistoricoConsulta'));
const PaginaPlanosExecucao = lazy(() => import('@/paginas/PaginaPlanosExecucao'));
const PaginaVisoes = lazy(() => import('@/paginas/PaginaVisoes'));
const PaginaIndices = lazy(() => import('@/paginas/PaginaIndices'));
const PaginaTabelas = lazy(() => import('@/paginas/PaginaTabelas'));
const PaginaFuncoes = lazy(() => import('@/paginas/PaginaFuncoes'));
const PaginaPapeis = lazy(() => import('@/paginas/PaginaPapeis'));
const PaginaSessoes = lazy(() => import('@/paginas/PaginaSessoes'));
const PaginaPermissoes = lazy(() => import('@/paginas/PaginaPermissoes'));
const PaginaFuncionalidadePlanejada = lazy(() => import('@/paginas/PaginaFuncionalidadePlanejada'));
const PaginaConfiguracoes = lazy(() => import('@/paginas/PaginaConfiguracoes'));
const PaginaNaoEncontrada = lazy(() => import('@/paginas/PaginaNaoEncontrada'));

export function RotasAplicacao() {
  return (
    <Routes>
      <Route element={<RotaVisitante />}>
        <Route
          element={
            <Suspense fallback={null}>
              <LayoutAcesso />
            </Suspense>
          }
        >
          <Route path={caminhos.login} element={<PaginaLogin />} />
          <Route path={caminhos.recuperarSenha} element={<PaginaRecuperacaoSenha />} />
        </Route>
      </Route>

      <Route element={<RotaAutenticada />}>
        <Route element={<RotaProtegida />}>
          <Route element={<LayoutAplicacao />}>
            <Route path={caminhos.inicio} element={<Navigate to={caminhos.dashboard} replace />} />
            <Route path={caminhos.dashboard} element={<PaginaDashboard />} />
            <Route path={caminhos.relatoriosResumo} element={<PaginaResumoRelatorio />} />
            <Route path={caminhos.relatoriosExportacao} element={<PaginaExportacaoRelatorio />} />
            <Route path={caminhos.relatoriosComparacao} element={<PaginaComparacaoRelatorio />} />
            <Route path={caminhos.consultasTodas} element={<PaginaTodasConsultas />} />
            <Route path={caminhos.consultasHistorico} element={<PaginaHistoricoConsulta />} />
            <Route path={caminhos.consultasPlanos} element={<PaginaPlanosExecucao />} />
            <Route path={caminhos.objetosVisoes} element={<PaginaVisoes />} />
            <Route path={caminhos.objetosIndices} element={<PaginaIndices />} />
            <Route path={caminhos.objetosTabelas} element={<PaginaTabelas />} />
            <Route path={caminhos.objetosFuncoes} element={<PaginaFuncoes />} />
            <Route path={caminhos.usuariosPapeis} element={<PaginaPapeis />} />
            <Route path={caminhos.usuariosSessoes} element={<PaginaSessoes />} />
            <Route path={caminhos.usuariosPermissoes} element={<PaginaPermissoes />} />
            {funcionalidades.map((funcionalidade) => (
              <Route
                key={funcionalidade.destino}
                path={funcionalidade.destino}
                element={<Navigate to={destinoInicial(funcionalidade)} replace />}
              />
            ))}
            {funcionalidades.flatMap((funcionalidade) =>
              telasPlanejadas(funcionalidade).map((tela) => (
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
