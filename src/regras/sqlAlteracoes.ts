import type {
  AlvoDaConcessaoDTO,
  AtributosDoPapelDTO,
  OperacaoDTO,
  SenhaDaOperacaoDTO,
  TipoTodosDoEsquema,
} from '@/modelos/alteracoes';
import type { Privilegio } from '@/modelos/permissoes';
import { identificadorSql } from './papeis';
import { beneficiarioSql, palavraDoPadraoSql, referenciaSql } from './permissoes';

export const TEXTO_DA_SENHA_OCULTA = "'<verificador SCRAM omitido>'";

const palavrasDoAtributo: Record<keyof AtributosDoPapelDTO, [ligado: string, desligado: string]> = {
  login: ['LOGIN', 'NOLOGIN'],
  superusuario: ['SUPERUSER', 'NOSUPERUSER'],
  criaBancos: ['CREATEDB', 'NOCREATEDB'],
  criaPapeis: ['CREATEROLE', 'NOCREATEROLE'],
  replicacao: ['REPLICATION', 'NOREPLICATION'],
  ignoraRls: ['BYPASSRLS', 'NOBYPASSRLS'],
  herda: ['INHERIT', 'NOINHERIT'],
};

const ordemDosAtributos: (keyof AtributosDoPapelDTO)[] = [
  'login',
  'superusuario',
  'criaBancos',
  'criaPapeis',
  'replicacao',
  'ignoraRls',
  'herda',
];

const padraoDosAtributos: AtributosDoPapelDTO = {
  login: false,
  superusuario: false,
  criaBancos: false,
  criaPapeis: false,
  replicacao: false,
  ignoraRls: false,
  herda: true,
};

const palavraDeTodos: Record<TipoTodosDoEsquema, string> = {
  TABELAS: 'ALL TABLES',
  SEQUENCIAS: 'ALL SEQUENCES',
  FUNCOES: 'ALL FUNCTIONS',
};

const PARAMETROS_EM_LISTA = new Set(['search_path']);

export function literalSql(texto: string): string {
  return `'${texto.replaceAll("'", "''")}'`;
}

function textoDaSenha(senha: SenhaDaOperacaoDTO): string {
  if (senha.tipo === 'NENHUMA') return 'PASSWORD NULL';
  if (senha.tipo === 'OCULTA') return `PASSWORD ${TEXTO_DA_SENHA_OCULTA}`;
  return `PASSWORD ${literalSql(senha.valor)}`;
}

function textoDoLimite(limite: number | null): string {
  return `CONNECTION LIMIT ${limite === null ? -1 : limite}`;
}

function textoDaValidade(validade: string | null): string {
  return `VALID UNTIL ${literalSql(validade ?? 'infinity')}`;
}

function valorDaConfiguracao(parametro: string, valor: string): string {
  if (!PARAMETROS_EM_LISTA.has(parametro)) return literalSql(valor);
  return valor
    .split(',')
    .map((trecho) => trecho.trim())
    .filter(Boolean)
    .map((trecho) => (trecho.startsWith('"') ? trecho : identificadorSql(trecho)))
    .join(', ');
}

export function alvoSql(alvo: AlvoDaConcessaoDTO): string {
  if (alvo.tipo === 'OBJETO') return referenciaSql(alvo.objeto);
  return `${palavraDeTodos[alvo.tipoDeObjeto]} IN SCHEMA ${identificadorSql(alvo.esquema)}`;
}

function privilegiosSql(privilegios: Privilegio[], colunas: string[] | null): string {
  const lista = colunas && colunas.length > 0 ? ` (${colunas.map(identificadorSql).join(', ')})` : '';
  return privilegios.map((privilegio) => `${privilegio}${lista}`).join(', ');
}

function opcoesDaParticipacao(herda: boolean, assume: boolean, administra: boolean): string {
  const opcoes = [!herda && 'INHERIT FALSE', !assume && 'SET FALSE', administra && 'ADMIN TRUE'].filter(Boolean);
  return opcoes.length > 0 ? ` WITH ${opcoes.join(', ')}` : '';
}

export function comandosDaOperacao(operacao: OperacaoDTO): string[] {
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL': {
      const partes = ordemDosAtributos.flatMap((atributo) => {
        const valor = operacao.atributos[atributo];
        if (atributo !== 'login' && valor === padraoDosAtributos[atributo]) return [];
        return [palavrasDoAtributo[atributo][valor ? 0 : 1]];
      });
      if (operacao.limiteConexoes !== null) partes.push(textoDoLimite(operacao.limiteConexoes));
      if (operacao.validadeSenha !== null) partes.push(textoDaValidade(operacao.validadeSenha));
      if (operacao.senha !== null) partes.push(textoDaSenha(operacao.senha));
      return [`CREATE ROLE ${identificadorSql(operacao.papel)} ${partes.join(' ')};`];
    }
    case 'ALTERAR_PAPEL': {
      const partes = ordemDosAtributos.flatMap((atributo) => {
        const valor = operacao.atributos[atributo];
        return valor === undefined ? [] : [palavrasDoAtributo[atributo][valor ? 0 : 1]];
      });
      if (operacao.limiteConexoes !== undefined) partes.push(textoDoLimite(operacao.limiteConexoes));
      if (operacao.validadeSenha !== undefined) partes.push(textoDaValidade(operacao.validadeSenha));
      if (operacao.senha !== undefined) partes.push(textoDaSenha(operacao.senha));
      return partes.length === 0 ? [] : [`ALTER ROLE ${identificadorSql(operacao.papel)} ${partes.join(' ')};`];
    }
    case 'RENOMEAR_PAPEL':
      return [`ALTER ROLE ${identificadorSql(operacao.papel)} RENAME TO ${identificadorSql(operacao.novoNome)};`];
    case 'DESCREVER_PAPEL':
      return [
        `COMMENT ON ROLE ${identificadorSql(operacao.papel)} IS ${operacao.descricao === null ? 'NULL' : literalSql(operacao.descricao)};`,
      ];
    case 'CONFIGURAR_PAPEL': {
      const papel = identificadorSql(operacao.papel);
      return [
        operacao.valor === null
          ? `ALTER ROLE ${papel} RESET ${operacao.parametro};`
          : `ALTER ROLE ${papel} SET ${operacao.parametro} = ${valorDaConfiguracao(operacao.parametro, operacao.valor)};`,
      ];
    }
    case 'EXCLUIR_PAPEL': {
      const papel = identificadorSql(operacao.papel);
      return [
        ...(operacao.encerrarSessoes
          ? [`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = ${literalSql(operacao.papel)};`]
          : []),
        ...(operacao.herdeiro ? [`REASSIGN OWNED BY ${papel} TO ${identificadorSql(operacao.herdeiro)};`] : []),
        ...(operacao.removerPermissoes ? [`DROP OWNED BY ${papel};`] : []),
        `DROP ROLE ${papel};`,
      ];
    }
    case 'CONCEDER_PARTICIPACAO':
      return [
        `GRANT ${identificadorSql(operacao.grupo)} TO ${identificadorSql(operacao.membro)}${opcoesDaParticipacao(operacao.herda, operacao.assume, operacao.administra)};`,
      ];
    case 'REVOGAR_PARTICIPACAO':
      return [`REVOKE ${identificadorSql(operacao.grupo)} FROM ${identificadorSql(operacao.membro)};`];
    case 'CONCEDER':
      return [
        `GRANT ${privilegiosSql(operacao.privilegios, operacao.colunas)} ON ${alvoSql(operacao.alvo)} TO ${beneficiarioSql(operacao.beneficiario)}${operacao.repassavel ? ' WITH GRANT OPTION' : ''};`,
      ];
    case 'REVOGAR': {
      const inicio = `REVOKE ${operacao.soRepasse ? 'GRANT OPTION FOR ' : ''}${privilegiosSql(operacao.privilegios, operacao.colunas)} ON ${alvoSql(operacao.alvo)} FROM ${beneficiarioSql(operacao.beneficiario)}`;
      const fim = operacao.cascata ? ' CASCADE;' : ';';
      if (operacao.concedentes.length === 0) return [`${inicio}${fim}`];
      return operacao.concedentes.map((concedente) => `${inicio} GRANTED BY ${identificadorSql(concedente)}${fim}`);
    }
    case 'PRIVILEGIO_PADRAO': {
      const onde = operacao.esquema === null ? '' : ` IN SCHEMA ${identificadorSql(operacao.esquema)}`;
      const inicio = `ALTER DEFAULT PRIVILEGES FOR ROLE ${identificadorSql(operacao.criador)}${onde}`;
      const tipo = palavraDoPadraoSql[operacao.tipoDeObjeto];
      const privilegios = operacao.privilegios.join(', ');
      const quem = beneficiarioSql(operacao.beneficiario);
      return [
        operacao.acao === 'CONCEDER'
          ? `${inicio} GRANT ${privilegios} ON ${tipo} TO ${quem};`
          : `${inicio} REVOKE ${privilegios} ON ${tipo} FROM ${quem};`,
      ];
    }
  }
}

export function comandosDasOperacoes(operacoes: OperacaoDTO[]): string[] {
  return operacoes.flatMap(comandosDaOperacao);
}

export function ocultarSenhas(operacoes: OperacaoDTO[]): OperacaoDTO[] {
  return operacoes.map((operacao) => {
    if (operacao.tipo === 'CRIAR_PAPEL' && operacao.senha?.tipo === 'VERIFICADOR') {
      return { ...operacao, senha: { tipo: 'OCULTA' } };
    }
    if (operacao.tipo === 'ALTERAR_PAPEL' && operacao.senha?.tipo === 'VERIFICADOR') {
      return { ...operacao, senha: { tipo: 'OCULTA' } };
    }
    return operacao;
  });
}
