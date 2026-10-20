import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { destinoInicialDaConta, podeAbrirTela, telaDoCaminho } from '@/regras/permissoesConta';
import { caminhos } from '@/rotas/caminhos';
import { SemAcessoNaTela } from './SemAcessoNaTela';

export function deveDesviarDaTela(usuario: Parameters<typeof podeAbrirTela>[0], caminho: string): boolean {
  return caminho === caminhos.dashboard && !podeAbrirTela(usuario, caminho);
}

export function GuardaDaTela({ children }: { children: ReactNode }) {
  const { usuario } = useAutenticacao();
  const { pathname } = useLocation();
  const tela = telaDoCaminho(pathname);

  if (!tela || podeAbrirTela(usuario, pathname)) return <>{children}</>;
  if (deveDesviarDaTela(usuario, pathname)) return <Navigate to={destinoInicialDaConta(usuario)} replace />;
  return <SemAcessoNaTela tela={tela} />;
}
