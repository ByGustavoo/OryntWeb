import type { ConexaoDTO, ConexaoSalvaDTO } from '@/modelos/conexao';
import type { AlvoConexao } from './falhaConexao';
import { TAMANHO_MAXIMO_NOME } from './validacaoConexao';

export function mesmaConexao(a: AlvoConexao, b: AlvoConexao): boolean {
  return (
    a.host.toLowerCase() === b.host.toLowerCase() && a.porta === b.porta && a.banco === b.banco && a.usuario === b.usuario
  );
}

export function enderecoConexao(conexao: AlvoConexao): string {
  return `${conexao.usuario}@${conexao.host}:${conexao.porta}/${conexao.banco}`;
}

export function ordenarPorUso(lista: ConexaoSalvaDTO[]): ConexaoSalvaDTO[] {
  return [...lista].sort((a, b) => (b.ultimoUsoEm ?? '').localeCompare(a.ultimoUsoEm ?? ''));
}

export function conexaoMaisRecente(lista: ConexaoSalvaDTO[]): ConexaoSalvaDTO | null {
  return ordenarPorUso(lista)[0] ?? null;
}

export function salvaDaConexao(conexao: ConexaoDTO): ConexaoSalvaDTO {
  return {
    id: conexao.id,
    tipoBanco: conexao.tipoBanco,
    nome: conexao.nome,
    host: conexao.host,
    porta: conexao.porta,
    banco: conexao.banco,
    usuario: conexao.usuario,
    ultimoUsoEm: conexao.conectadaEm,
  };
}

export function registrarConexaoSalva(lista: ConexaoSalvaDTO[], conexao: ConexaoSalvaDTO): ConexaoSalvaDTO[] {
  const outras = lista.filter((item) => item.id !== conexao.id && !mesmaConexao(item, conexao));
  return ordenarPorUso([...outras, conexao]);
}

export function renomearConexaoSalva(lista: ConexaoSalvaDTO[], id: string, nome: string): ConexaoSalvaDTO[] {
  return lista.map((item) => (item.id === id ? { ...item, nome } : item));
}

export function removerConexaoSalva(lista: ConexaoSalvaDTO[], id: string): ConexaoSalvaDTO[] {
  return lista.filter((item) => item.id !== id);
}

export function descreverUso(ultimoUsoEm: string | null, descrever: (instante: string) => string): string {
  return ultimoUsoEm ? descrever(ultimoUsoEm) : 'nunca usada';
}

export function validarNomeConexaoSalva(valor: string): string | undefined {
  const nome = valor.trim();
  if (!nome) return 'Informe um nome para a conexão.';
  if (nome.length > TAMANHO_MAXIMO_NOME) return `O nome pode ter até ${TAMANHO_MAXIMO_NOME} caracteres.`;
  return undefined;
}

function temFormatoDeConexaoSalva(item: unknown): item is ConexaoSalvaDTO {
  if (!item || typeof item !== 'object') return false;
  const bruto = item as Record<string, unknown>;
  return (
    typeof bruto.id === 'string' &&
    bruto.tipoBanco === 'POSTGRESQL' &&
    typeof bruto.nome === 'string' &&
    typeof bruto.host === 'string' &&
    typeof bruto.porta === 'number' &&
    typeof bruto.banco === 'string' &&
    typeof bruto.usuario === 'string' &&
    (typeof bruto.ultimoUsoEm === 'string' || bruto.ultimoUsoEm === null)
  );
}

export function lerConexoesSalvas(valor: unknown): ConexaoSalvaDTO[] {
  if (!Array.isArray(valor)) return [];
  return ordenarPorUso(
    valor
      .filter(temFormatoDeConexaoSalva)
      .map(({ id, tipoBanco, nome, host, porta, banco, usuario, ultimoUsoEm }) => ({
        id,
        tipoBanco,
        nome,
        host,
        porta,
        banco,
        usuario,
        ultimoUsoEm,
      })),
  );
}
