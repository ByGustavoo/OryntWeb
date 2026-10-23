import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import type { TelaDoOrynt } from '@/regras/permissoesConta';
import { destinoInicialDaConta, podeAbrirTela, telaDoCaminho } from '@/regras/permissoesConta';
import { caminhos } from '@/rotas/caminhos';

export function deveDesviarDaTela(usuario: Parameters<typeof podeAbrirTela>[0], caminho: string): boolean {
  return caminho === caminhos.dashboard && !podeAbrirTela(usuario, caminho);
}

export function telaNegada(usuario: Parameters<typeof podeAbrirTela>[0], caminho: string): TelaDoOrynt | null {
  const tela = telaDoCaminho(caminho);
  if (!tela || podeAbrirTela(usuario, caminho) || deveDesviarDaTela(usuario, caminho)) return null;
  return tela;
}

export function GuardaDaTela({ children }: { children: ReactNode }) {
  const { usuario } = useAutenticacao();
  const { pathname } = useLocation();

  if (deveDesviarDaTela(usuario, pathname)) return <Navigate to={destinoInicialDaConta(usuario)} replace />;
  return <>{children}</>;
}
