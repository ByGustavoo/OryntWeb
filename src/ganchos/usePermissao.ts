import type { CodigoPermissao } from '@/modelos/administracao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { possui } from '@/regras/permissoesConta';

export function usePermissao(codigo: CodigoPermissao): boolean {
  const { usuario } = useAutenticacao();
  return possui(usuario, codigo);
}
