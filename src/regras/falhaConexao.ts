import { ErroApi } from '@/api/ErroApi';
import { PROBLEMAS_CONEXAO } from '@/modelos/conexao';
import type { CampoConexao } from './validacaoConexao';

export type MotivoFalhaConexao =
  | 'AUTENTICACAO'
  | 'SERVIDOR_INACESSIVEL'
  | 'BANCO_INEXISTENTE'
  | 'TEMPO_ESGOTADO'
  | 'DADOS_INVALIDOS'
  | 'SEM_RESPOSTA'
  | 'DESCONHECIDO';

export interface FalhaConexao {
  motivo: MotivoFalhaConexao;
  titulo: string;
  descricao: string;
  orientacao: string;
  campos: CampoConexao[];
}

export interface AlvoConexao {
  host: string;
  porta: number;
  banco: string;
  usuario: string;
}

export const REVISAO_DO_CAMPO: Record<CampoConexao, string> = {
  nome: 'Confira o nome da conexão.',
  host: 'Confira o endereço do servidor.',
  porta: 'Confira a porta.',
  banco: 'Confira o nome do banco.',
  usuario: 'Confira o usuário.',
  senha: 'Digite a senha de novo.',
};

function motivoDoErro(erro: unknown): MotivoFalhaConexao {
  if (!(erro instanceof ErroApi)) return 'DESCONHECIDO';
  const tipoProblema = erro.resposta?.type ?? '';
  if (tipoProblema.endsWith(PROBLEMAS_CONEXAO.autenticacao)) return 'AUTENTICACAO';
  if (tipoProblema.endsWith(PROBLEMAS_CONEXAO.servidorInacessivel)) return 'SERVIDOR_INACESSIVEL';
  if (tipoProblema.endsWith(PROBLEMAS_CONEXAO.bancoInexistente)) return 'BANCO_INEXISTENTE';
  if (tipoProblema.endsWith(PROBLEMAS_CONEXAO.tempoEsgotado) || erro.tipo === 'TEMPO_ESGOTADO') return 'TEMPO_ESGOTADO';
  if (erro.tipo === 'VALIDACAO') return 'DADOS_INVALIDOS';
  if (erro.tipo === 'REDE') return 'SEM_RESPOSTA';
  return 'DESCONHECIDO';
}

export function interpretarFalhaConexao(erro: unknown, alvo: AlvoConexao): FalhaConexao {
  const motivo = motivoDoErro(erro);

  switch (motivo) {
    case 'AUTENTICACAO':
      return {
        motivo,
        titulo: 'Usuário ou senha não aceitos',
        descricao: `O servidor ${alvo.host} recusou o acesso do usuário "${alvo.usuario}".`,
        orientacao: 'Confira o usuário e digite a senha de novo.',
        campos: ['usuario', 'senha'],
      };
    case 'SERVIDOR_INACESSIVEL':
      return {
        motivo,
        titulo: 'Servidor não encontrado',
        descricao: `Ninguém respondeu em ${alvo.host}:${alvo.porta}.`,
        orientacao: 'Confira o host e a porta, e se o servidor aceita conexões de fora da rede dele.',
        campos: ['host', 'porta'],
      };
    case 'BANCO_INEXISTENTE':
      return {
        motivo,
        titulo: 'Banco de dados não encontrado',
        descricao: `O servidor respondeu, mas não existe um banco chamado "${alvo.banco}".`,
        orientacao: 'Confira o nome do banco. Maiúsculas e minúsculas fazem diferença.',
        campos: ['banco'],
      };
    case 'TEMPO_ESGOTADO':
      return {
        motivo,
        titulo: 'O servidor demorou demais para responder',
        descricao: `A tentativa em ${alvo.host}:${alvo.porta} foi interrompida ao atingir o tempo limite.`,
        orientacao: 'Tente de novo. Se continuar, verifique a rede e o firewall do servidor.',
        campos: [],
      };
    case 'DADOS_INVALIDOS':
      return {
        motivo,
        titulo: 'Alguns dados não foram aceitos',
        descricao: 'Há campos com valores que o servidor não reconheceu.',
        orientacao: 'Revise os campos destacados e tente de novo.',
        campos: [],
      };
    case 'SEM_RESPOSTA':
      return {
        motivo,
        titulo: 'O Orynt não respondeu',
        descricao: 'Não foi possível falar com o serviço que faz a conexão com o banco.',
        orientacao: 'Verifique a sua internet e tente de novo em instantes.',
        campos: [],
      };
    case 'DESCONHECIDO':
      return {
        motivo,
        titulo: 'Não foi possível conectar',
        descricao: 'A tentativa falhou por um motivo que o Orynt não reconheceu.',
        orientacao: 'Tente de novo. Se o erro continuar, confira os dados da conexão.',
        campos: [],
      };
  }
}
