import { ErroApi } from '@/api/ErroApi';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';
import type { EtapaRecuperacao } from './recuperacaoSenha';

export type MotivoFalhaRecuperacao =
  | 'CODIGO_INVALIDO'
  | 'TENTATIVAS_ESGOTADAS'
  | 'REDEFINICAO_EXPIRADA'
  | 'MUITOS_PEDIDOS'
  | 'DADOS_INVALIDOS'
  | 'SEM_RESPOSTA'
  | 'TEMPO_ESGOTADO'
  | 'DESCONHECIDO';

export interface FalhaRecuperacao {
  motivo: MotivoFalhaRecuperacao;
  titulo: string;
  descricao: string;
}

const TITULO_DESCONHECIDO: Record<EtapaRecuperacao, string> = {
  EMAIL: 'Não foi possível enviar o pedido',
  CODIGO: 'Não foi possível validar o código',
  SENHA: 'Não foi possível salvar a nova senha',
};

function motivoDoErro(erro: unknown): MotivoFalhaRecuperacao {
  if (!(erro instanceof ErroApi)) return 'DESCONHECIDO';
  const tipoProblema = erro.resposta?.type ?? '';
  if (tipoProblema.endsWith(PROBLEMAS_AUTENTICACAO.codigoInvalido)) return 'CODIGO_INVALIDO';
  if (tipoProblema.endsWith(PROBLEMAS_AUTENTICACAO.tentativasEsgotadas)) return 'TENTATIVAS_ESGOTADAS';
  if (tipoProblema.endsWith(PROBLEMAS_AUTENTICACAO.redefinicaoExpirada)) return 'REDEFINICAO_EXPIRADA';
  if (erro.tipo === 'LIMITE_EXCEDIDO') return 'MUITOS_PEDIDOS';
  if (erro.tipo === 'VALIDACAO') return 'DADOS_INVALIDOS';
  if (erro.tipo === 'REDE') return 'SEM_RESPOSTA';
  if (erro.tipo === 'TEMPO_ESGOTADO') return 'TEMPO_ESGOTADO';
  return 'DESCONHECIDO';
}

export function interpretarFalhaRecuperacao(erro: unknown, etapa: EtapaRecuperacao): FalhaRecuperacao {
  const motivo = motivoDoErro(erro);

  switch (motivo) {
    case 'CODIGO_INVALIDO':
      return {
        motivo,
        titulo: 'Código incorreto ou expirado',
        descricao: 'Confira a mensagem mais recente e digite de novo, ou peça um novo código.',
      };
    case 'TENTATIVAS_ESGOTADAS':
      return {
        motivo,
        titulo: 'Tentativas esgotadas',
        descricao: 'Este código não vale mais. Peça um novo código para continuar.',
      };
    case 'REDEFINICAO_EXPIRADA':
      return {
        motivo,
        titulo: 'O prazo para trocar a senha terminou',
        descricao: 'Por segurança, a validação do código vale por pouco tempo. Peça um novo código para recomeçar.',
      };
    case 'MUITOS_PEDIDOS':
      return {
        motivo,
        titulo: 'Muitos pedidos em pouco tempo',
        descricao: 'Aguarde alguns minutos antes de tentar de novo.',
      };
    case 'DADOS_INVALIDOS':
      return {
        motivo,
        titulo: 'Os dados não foram aceitos',
        descricao: 'Revise os campos destacados e tente de novo.',
      };
    case 'SEM_RESPOSTA':
      return {
        motivo,
        titulo: 'O Orynt não respondeu',
        descricao: 'Confira a sua conexão com a internet e tente de novo.',
      };
    case 'TEMPO_ESGOTADO':
      return {
        motivo,
        titulo: 'A resposta demorou demais',
        descricao: 'O servidor não respondeu a tempo. Tente de novo em instantes.',
      };
    case 'DESCONHECIDO':
      return {
        motivo,
        titulo: TITULO_DESCONHECIDO[etapa],
        descricao: 'Algo inesperado aconteceu. Tente de novo em instantes.',
      };
  }
}
