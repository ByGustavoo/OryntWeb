import type { CredenciaisConexaoDTO } from '@/modelos/conexao';

export interface CamposConexao {
  nome: string;
  host: string;
  porta: string;
  banco: string;
  usuario: string;
  senha: string;
}

export type CampoConexao = keyof CamposConexao;
export type ErrosConexao = Partial<Record<CampoConexao, string>>;

export const PORTA_PADRAO = '5432';
export const PORTA_MINIMA = 1;
export const PORTA_MAXIMA = 65535;
export const TAMANHO_MAXIMO_NOME = 60;
export const TAMANHO_MAXIMO_HOST = 253;
export const TAMANHO_MAXIMO_IDENTIFICADOR = 63;

export const ORDEM_CAMPOS: CampoConexao[] = ['nome', 'host', 'porta', 'banco', 'usuario', 'senha'];

export const CAMPOS_CONEXAO_INICIAIS: CamposConexao = {
  nome: '',
  host: '',
  porta: PORTA_PADRAO,
  banco: '',
  usuario: '',
  senha: '',
};

const HOST_VALIDO = /^[a-zA-Z0-9._:[\]-]+$/;
const SOMENTE_DIGITOS = /^\d+$/;

function validarHost(valor: string): string | undefined {
  const host = valor.trim();
  if (!host) return 'Informe o endereço do servidor.';
  if (host.includes('://')) return 'Use só o endereço, sem "postgresql://" ou "http://".';
  if (/\s/.test(host)) return 'O endereço não pode ter espaços.';
  if (host.includes('/')) return 'Use só o endereço. O nome do banco vai no campo próprio.';
  if (!HOST_VALIDO.test(host)) return 'Use um domínio ou um IP, como db.empresa.com ou 10.0.0.12.';
  if (host.length > TAMANHO_MAXIMO_HOST) return `O endereço pode ter até ${TAMANHO_MAXIMO_HOST} caracteres.`;
  return undefined;
}

function validarPorta(valor: string): string | undefined {
  const porta = valor.trim();
  if (!porta) return 'Informe a porta.';
  if (!SOMENTE_DIGITOS.test(porta)) return 'A porta tem só números.';
  const numero = Number(porta);
  if (numero < PORTA_MINIMA || numero > PORTA_MAXIMA) return `Use uma porta entre ${PORTA_MINIMA} e ${PORTA_MAXIMA}.`;
  return undefined;
}

function validarIdentificador(valor: string, vazio: string, longo: string): string | undefined {
  const texto = valor.trim();
  if (!texto) return vazio;
  if (texto.length > TAMANHO_MAXIMO_IDENTIFICADOR) return longo;
  return undefined;
}

export function validarCampo(campo: CampoConexao, valor: string): string | undefined {
  switch (campo) {
    case 'nome':
      return valor.trim().length > TAMANHO_MAXIMO_NOME ? `O nome pode ter até ${TAMANHO_MAXIMO_NOME} caracteres.` : undefined;
    case 'host':
      return validarHost(valor);
    case 'porta':
      return validarPorta(valor);
    case 'banco':
      return validarIdentificador(
        valor,
        'Informe o nome do banco de dados.',
        `O nome do banco pode ter até ${TAMANHO_MAXIMO_IDENTIFICADOR} caracteres.`,
      );
    case 'usuario':
      return validarIdentificador(
        valor,
        'Informe o usuário do banco.',
        `O usuário pode ter até ${TAMANHO_MAXIMO_IDENTIFICADOR} caracteres.`,
      );
    case 'senha':
      return valor ? undefined : 'Informe a senha.';
  }
}

export function validarConexao(campos: CamposConexao): ErrosConexao {
  const erros: ErrosConexao = {};
  for (const campo of ORDEM_CAMPOS) {
    const erro = validarCampo(campo, campos[campo]);
    if (erro) erros[campo] = erro;
  }
  return erros;
}

export function primeiroCampoComErro(erros: ErrosConexao): CampoConexao | null {
  return ORDEM_CAMPOS.find((campo) => erros[campo]) ?? null;
}

export function montarCredenciais(campos: CamposConexao): CredenciaisConexaoDTO {
  return {
    tipoBanco: 'POSTGRESQL',
    nome: campos.nome.trim() || null,
    host: campos.host.trim(),
    porta: Number(campos.porta.trim()),
    banco: campos.banco.trim(),
    usuario: campos.usuario.trim(),
    senha: campos.senha,
  };
}

export function nomeSugerido(banco: string, host: string): string {
  return `${banco.trim()} em ${host.trim()}`;
}
