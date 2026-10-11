export type TipoBanco = 'POSTGRESQL';

export interface CredenciaisConexaoDTO {
  tipoBanco: TipoBanco;
  nome: string | null;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  senha: string;
}

export interface ConexaoDTO {
  id: string;
  tipoBanco: TipoBanco;
  nome: string;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  versaoServidor: string;
  conectadaEm: string;
  simulada: boolean;
}

export interface TesteConexaoDTO {
  versaoServidor: string;
  latenciaMs: number;
  simulado: boolean;
}

export interface ConexaoSalvaDTO {
  id: string;
  tipoBanco: TipoBanco;
  nome: string;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  ultimoUsoEm: string;
}

export interface RenomeacaoConexaoDTO {
  nome: string;
}

export const PROBLEMAS_CONEXAO = {
  autenticacao: '/problems/connection-authentication-failed',
  servidorInacessivel: '/problems/connection-unreachable',
  bancoInexistente: '/problems/connection-database-not-found',
  tempoEsgotado: '/problems/connection-timeout',
} as const;
