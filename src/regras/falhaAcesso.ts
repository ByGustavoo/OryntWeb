import { ErroApi } from '@/api/ErroApi';

export type MotivoFalhaAcesso =
  | 'CREDENCIAIS_INCORRETAS'
  | 'DADOS_INVALIDOS'
  | 'SEM_RESPOSTA'
  | 'TEMPO_ESGOTADO'
  | 'DESCONHECIDO';

export interface FalhaAcesso {
  motivo: MotivoFalhaAcesso;
  titulo: string;
  descricao: string;
}

function motivoDoErro(erro: unknown): MotivoFalhaAcesso {
  if (!(erro instanceof ErroApi)) return 'DESCONHECIDO';
  if (erro.tipo === 'NAO_AUTORIZADO') return 'CREDENCIAIS_INCORRETAS';
  if (erro.tipo === 'VALIDACAO') return 'DADOS_INVALIDOS';
  if (erro.tipo === 'REDE') return 'SEM_RESPOSTA';
  if (erro.tipo === 'TEMPO_ESGOTADO') return 'TEMPO_ESGOTADO';
  return 'DESCONHECIDO';
}

export function interpretarFalhaAcesso(erro: unknown): FalhaAcesso {
  const motivo = motivoDoErro(erro);

  switch (motivo) {
    case 'CREDENCIAIS_INCORRETAS':
      return {
        motivo,
        titulo: 'E-mail ou senha incorretos',
        descricao: 'Nenhuma conta corresponde a esses dados. Confira o e-mail e digite a senha de novo.',
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
        descricao: 'Não foi possível verificar o seu acesso. Confira a sua conexão com a internet e tente de novo.',
      };
    case 'TEMPO_ESGOTADO':
      return {
        motivo,
        titulo: 'A verificação demorou demais',
        descricao: 'O servidor não respondeu a tempo. Tente de novo em instantes.',
      };
    case 'DESCONHECIDO':
      return {
        motivo,
        titulo: 'Não foi possível entrar',
        descricao: 'Algo inesperado aconteceu ao verificar o seu acesso. Tente de novo em instantes.',
      };
  }
}
