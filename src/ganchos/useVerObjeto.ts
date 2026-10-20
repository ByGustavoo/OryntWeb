import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { lerIdDaFuncao } from '@/regras/funcoes';
import { lerTabela } from '@/regras/indices';
import { lerNomeDoPapel } from '@/regras/papeis';
import { estadoDasSessoesDoPapel } from '@/regras/sessoes';
import { caminhos } from '@/rotas/caminhos';

export interface IrParaObjeto {
  tabela: (id: string) => void;
  visao: (id: string) => void;
  indice: (id: string, tabela: string) => void;
  indicesDaTabela: (tabela: string) => void;
  funcao: (id: string) => void;
  papel: (nome: string) => void;
  sessoesDoPapel: (nome: string, replicacao: boolean) => void;
  permissoesDoPapel: (nome: string) => void;
  permissoesDoObjeto: (id: string, abrir?: string) => void;
}

export function lerObjetoParaAbrir(estado: unknown): string | null {
  if (!estado || typeof estado !== 'object') return null;
  const abrir = (estado as { abrir?: unknown }).abrir;
  return lerTabela(abrir) ?? lerIdDaFuncao(abrir) ?? lerNomeDoPapel(abrir);
}

export function useVerObjeto(): IrParaObjeto {
  const navegar = useNavigate();

  return useMemo(
    () => ({
      tabela: (id: string) => navegar(caminhos.objetosTabelas, { state: { abrir: id } }),
      visao: (id: string) => navegar(caminhos.objetosVisoes, { state: { abrir: id } }),
      indice: (id: string, tabela: string) =>
        navegar(caminhos.objetosIndices, { state: { indices: { tabela }, abrir: id } }),
      indicesDaTabela: (tabela: string) => navegar(caminhos.objetosIndices, { state: { indices: { tabela } } }),
      funcao: (id: string) => navegar(caminhos.objetosFuncoes, { state: { abrir: id } }),
      papel: (nome: string) => navegar(caminhos.usuariosPapeis, { state: { abrir: nome } }),
      sessoesDoPapel: (nome: string, replicacao: boolean) =>
        navegar(caminhos.usuariosSessoes, { state: estadoDasSessoesDoPapel(nome, replicacao) }),
      permissoesDoPapel: (nome: string) =>
        navegar(caminhos.usuariosPermissoes, { state: { permissoes: { modo: 'PAPEL', papel: nome } } }),
      permissoesDoObjeto: (id: string, abrir?: string) =>
        navegar(caminhos.usuariosPermissoes, { state: { permissoes: { modo: 'OBJETO', objeto: id }, abrir } }),
    }),
    [navegar],
  );
}

export function useObjetoDaChegada(): string | null {
  const localizacao = useLocation();
  const [objeto] = useState(() => lerObjetoParaAbrir(localizacao.state));
  return objeto;
}
