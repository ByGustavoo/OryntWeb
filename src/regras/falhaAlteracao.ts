import { ErroApi } from '@/api/ErroApi';
import { PROBLEMAS_ALTERACAO } from '@/modelos/alteracoes';
import type { ProblemaAlteracao } from '@/modelos/alteracoes';

export type MotivoFalhaAlteracao = ProblemaAlteracao | 'DADOS_INVALIDOS' | 'SEM_SESSAO' | 'SEM_RESPOSTA' | 'DESCONHECIDO';

export interface FalhaAlteracao {
  motivo: MotivoFalhaAlteracao;
  titulo: string;
  descricao: string;
  doBanco: string | null;
}

function motivoDoErro(erro: unknown): MotivoFalhaAlteracao {
  if (!(erro instanceof ErroApi)) return 'DESCONHECIDO';
  const tipo = erro.resposta?.type ?? '';
  const problema = (Object.keys(PROBLEMAS_ALTERACAO) as ProblemaAlteracao[]).find((chave) =>
    tipo.endsWith(PROBLEMAS_ALTERACAO[chave]),
  );
  if (problema) return problema;
  if (erro.tipo === 'VALIDACAO') return 'DADOS_INVALIDOS';
  if (erro.tipo === 'NAO_AUTORIZADO') return 'SEM_SESSAO';
  if (erro.tipo === 'REDE' || erro.tipo === 'TEMPO_ESGOTADO') return 'SEM_RESPOSTA';
  return 'DESCONHECIDO';
}

const textos: Record<MotivoFalhaAlteracao, { titulo: string; descricao: string }> = {
  permissaoNegada: {
    titulo: 'O banco recusou por falta de permissão',
    descricao: 'O papel com que o Orynt está conectado não pode fazer esta alteração. Nada foi mudado.',
  },
  dependencias: {
    titulo: 'Ainda há o que depende do papel',
    descricao: 'O papel tem objetos ou permissões, neste ou em outro banco do servidor. Nada foi mudado.',
  },
  duplicado: {
    titulo: 'Já existe um papel com esse nome',
    descricao: 'Os nomes de papel valem para o servidor inteiro, não só para este banco. Escolha outro nome.',
  },
  inexistente: {
    titulo: 'O papel ou o objeto não existe mais',
    descricao: 'Alguém o alterou ou removeu depois que esta tela carregou. Nada foi mudado: recarregue e revise de novo.',
  },
  participacaoInvalida: {
    titulo: 'A participação não pode ser feita',
    descricao: 'Ela criaria um ciclo de grupos ou já existe do jeito pedido. Nada foi mudado.',
  },
  emUso: {
    titulo: 'O papel está em uso',
    descricao: 'O PostgreSQL não muda o papel da sessão em uso. Nada foi mudado.',
  },
  recusado: {
    titulo: 'O banco recusou o comando',
    descricao: 'Os comandos rodam numa transação só: como um falhou, nenhum foi aplicado.',
  },
  DADOS_INVALIDOS: {
    titulo: 'A alteração tem dados que a API não aceitou',
    descricao: 'Nada foi mudado. Volte ao formulário, revise os campos e tente de novo.',
  },
  SEM_SESSAO: {
    titulo: 'A sessão com o banco terminou',
    descricao: 'Conecte o banco de novo para fazer a alteração.',
  },
  SEM_RESPOSTA: {
    titulo: 'O servidor não respondeu a tempo',
    descricao: 'Não dá para saber se a alteração foi aplicada. Confira em Alterações antes de tentar de novo.',
  },
  DESCONHECIDO: {
    titulo: 'Não foi possível fazer a alteração',
    descricao: 'Tente de novo em alguns instantes. Se continuar, confira em Alterações o que aconteceu.',
  },
};

export function interpretarFalhaAlteracao(erro: unknown): FalhaAlteracao {
  const motivo = motivoDoErro(erro);
  const doBanco = erro instanceof ErroApi && motivo in PROBLEMAS_ALTERACAO ? (erro.resposta?.detail ?? null) : null;
  return { motivo, ...textos[motivo], doBanco };
}
