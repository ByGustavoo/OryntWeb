import type { AlvoDaConcessaoDTO, AtributosDoPapelDTO, OperacaoDTO, OrigemDaAlteracao } from '@/modelos/alteracoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { instanteDaValidade } from './aplicacaoAlteracoes';
import { formatarData } from './papeis';
import { nomeCompleto, PUBLICO } from './permissoes';

export type TempoDaFrase = 'INFINITIVO' | 'PASSADO';

const verbos = {
  criar: ['Criar', 'Criou'],
  alterar: ['Alterar', 'Alterou'],
  renomear: ['Renomear', 'Renomeou'],
  mudar: ['Mudar', 'Mudou'],
  tirar: ['Tirar', 'Tirou'],
  definir: ['Definir', 'Definiu'],
  excluir: ['Excluir', 'Excluiu'],
  por: ['Pôr', 'Pôs'],
  conceder: ['Conceder', 'Concedeu'],
  revogar: ['Revogar', 'Revogou'],
} as const satisfies Record<string, readonly [string, string]>;

const palavraLigada: Record<keyof AtributosDoPapelDTO, string> = {
  login: 'LOGIN',
  superusuario: 'SUPERUSER',
  criaBancos: 'CREATEDB',
  criaPapeis: 'CREATEROLE',
  replicacao: 'REPLICATION',
  ignoraRls: 'BYPASSRLS',
  herda: 'INHERIT',
};

const palavraDesligada: Record<keyof AtributosDoPapelDTO, string> = {
  login: 'NOLOGIN',
  superusuario: 'NOSUPERUSER',
  criaBancos: 'NOCREATEDB',
  criaPapeis: 'NOCREATEROLE',
  replicacao: 'NOREPLICATION',
  ignoraRls: 'NOBYPASSRLS',
  herda: 'NOINHERIT',
};

const textoDeTodos = {
  TABELAS: 'todas as tabelas e visões de',
  SEQUENCIAS: 'todas as sequências de',
  FUNCOES: 'todas as funções de',
};

const textoDoPadrao = {
  TABELAS: 'as tabelas e visões',
  SEQUENCIAS: 'as sequências',
  FUNCOES: 'as funções',
};

export const rotuloOrigemAlteracao: Record<OrigemDaAlteracao, string> = {
  FORMULARIO: 'Formulário',
  MODELO: 'Modelo de papel',
  PONTO_DE_ATENCAO: 'Ponto de atenção',
  LOTE: 'Comandos em lote',
  DESFAZER: 'Desfazer',
  DETALHE: 'Detalhe',
};

function verbo(chave: keyof typeof verbos, tempo: TempoDaFrase): string {
  return verbos[chave][tempo === 'INFINITIVO' ? 0 : 1];
}

function textoDoAlvo(alvo: AlvoDaConcessaoDTO): string {
  if (alvo.tipo === 'TODOS_DO_ESQUEMA') return `${textoDeTodos[alvo.tipoDeObjeto]} ${alvo.esquema}`;
  return nomeCompleto(alvo.objeto);
}

function quem(beneficiario: string): string {
  return beneficiario === PUBLICO ? 'PUBLIC' : beneficiario;
}

function mudancasDaAlteracao(operacao: Extract<OperacaoDTO, { tipo: 'ALTERAR_PAPEL' }>): string[] {
  const mudancas = (Object.keys(operacao.atributos) as (keyof AtributosDoPapelDTO)[]).flatMap((atributo) => {
    const valor = operacao.atributos[atributo];
    if (valor === undefined) return [];
    return [valor ? palavraLigada[atributo] : palavraDesligada[atributo]];
  });
  if (operacao.limiteConexoes !== undefined) {
    mudancas.push(
      operacao.limiteConexoes === null
        ? 'sem limite de conexões'
        : `limite de ${formatarNumero(operacao.limiteConexoes)} ${pluralizar(operacao.limiteConexoes, 'conexão', 'conexões')}`,
    );
  }
  if (operacao.validadeSenha !== undefined) {
    mudancas.push(
      operacao.validadeSenha === null ? 'senha sem validade' : `senha válida até ${formatarData(instanteDaValidade(operacao.validadeSenha))}`,
    );
  }
  if (operacao.senha !== undefined) mudancas.push(operacao.senha.tipo === 'NENHUMA' ? 'sem senha' : 'senha nova');
  return mudancas;
}

export function descreverOperacao(operacao: OperacaoDTO, tempo: TempoDaFrase): string {
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL':
      return `${verbo('criar', tempo)} o ${operacao.atributos.login ? 'usuário' : 'grupo'} ${operacao.papel}`;
    case 'ALTERAR_PAPEL': {
      const mudancas = mudancasDaAlteracao(operacao);
      return `${verbo('alterar', tempo)} ${operacao.papel}${mudancas.length > 0 ? `: ${mudancas.join(', ')}` : ''}`;
    }
    case 'RENOMEAR_PAPEL':
      return `${verbo('renomear', tempo)} ${operacao.papel} para ${operacao.novoNome}`;
    case 'DESCREVER_PAPEL':
      return operacao.descricao === null
        ? `${verbo('tirar', tempo)} a descrição de ${operacao.papel}`
        : `${verbo('mudar', tempo)} a descrição de ${operacao.papel}`;
    case 'CONFIGURAR_PAPEL':
      return operacao.valor === null
        ? `${verbo('tirar', tempo)} ${operacao.parametro} de ${operacao.papel}`
        : `${verbo('definir', tempo)} ${operacao.parametro} = ${operacao.valor} para ${operacao.papel}`;
    case 'EXCLUIR_PAPEL':
      return `${verbo('excluir', tempo)} ${operacao.papel}${operacao.herdeiro ? `, passando os objetos dele para ${operacao.herdeiro}` : ''}`;
    case 'CONCEDER_PARTICIPACAO':
      return `${verbo('por', tempo)} ${operacao.membro} no grupo ${operacao.grupo}`;
    case 'REVOGAR_PARTICIPACAO':
      return `${verbo('tirar', tempo)} ${operacao.membro} do grupo ${operacao.grupo}`;
    case 'CONCEDER': {
      const colunas = operacao.colunas && operacao.colunas.length > 0 ? ` (${operacao.colunas.join(', ')})` : '';
      return `${verbo('conceder', tempo)} ${operacao.privilegios.join(', ')}${colunas} em ${textoDoAlvo(operacao.alvo)} a ${quem(operacao.beneficiario)}${operacao.repassavel ? ', com repasse' : ''}`;
    }
    case 'REVOGAR': {
      const colunas = operacao.colunas && operacao.colunas.length > 0 ? ` (${operacao.colunas.join(', ')})` : '';
      if (operacao.soRepasse) {
        return `${verbo('tirar', tempo)} o repasse de ${operacao.privilegios.join(', ')} em ${textoDoAlvo(operacao.alvo)} de ${quem(operacao.beneficiario)}`;
      }
      return `${verbo('revogar', tempo)} ${operacao.privilegios.join(', ')}${colunas} em ${textoDoAlvo(operacao.alvo)} de ${quem(operacao.beneficiario)}`;
    }
    case 'PRIVILEGIO_PADRAO': {
      const onde = operacao.esquema === null ? 'em qualquer esquema' : `em ${operacao.esquema}`;
      const sujeito = `${textoDoPadrao[operacao.tipoDeObjeto]} que ${operacao.criador} criar ${onde}`;
      return operacao.acao === 'CONCEDER'
        ? `${verbo('definir', tempo)} que ${sujeito} nascem com ${operacao.privilegios.join(', ')} para ${quem(operacao.beneficiario)}`
        : `${verbo('tirar', tempo)} ${operacao.privilegios.join(', ')} para ${quem(operacao.beneficiario)} do que ${operacao.criador} criar ${onde}`;
    }
  }
}

export function tituloDaAlteracao(operacoes: OperacaoDTO[], tempo: TempoDaFrase): string {
  const principal =
    operacoes.find((operacao) => operacao.tipo === 'CRIAR_PAPEL' || operacao.tipo === 'EXCLUIR_PAPEL') ?? operacoes[0];
  if (!principal) return '';
  const texto = descreverOperacao(principal, tempo);
  const outras = operacoes.length - 1;
  if (outras === 0) return texto;
  return `${texto} e mais ${formatarNumero(outras)} ${pluralizar(outras, 'mudança', 'mudanças')}`;
}

export function papeisDaAlteracao(operacoes: OperacaoDTO[]): string[] {
  const nomes = operacoes.flatMap((operacao): string[] => {
    switch (operacao.tipo) {
      case 'CONCEDER':
      case 'REVOGAR':
        return [operacao.beneficiario];
      case 'PRIVILEGIO_PADRAO':
        return [operacao.beneficiario, operacao.criador];
      case 'CONCEDER_PARTICIPACAO':
      case 'REVOGAR_PARTICIPACAO':
        return [operacao.membro, operacao.grupo];
      case 'RENOMEAR_PAPEL':
        return [operacao.papel, operacao.novoNome];
      case 'EXCLUIR_PAPEL':
        return operacao.herdeiro ? [operacao.papel, operacao.herdeiro] : [operacao.papel];
      default:
        return [operacao.papel];
    }
  });
  return [...new Set(nomes)];
}
