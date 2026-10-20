import { describe, expect, it } from 'vitest';
import type { PapelDTO } from '@/modelos/papeis';
import { capacidadeDasOperacoes, nomeParaConfirmar, podeCriarPapeis, podeExcluirPapel, podeMudarParticipacao } from './capacidadeAlteracoes';
import {
  camposDoModelo,
  camposDoPapel,
  operacoesDoFormularioPapel,
  validarCamposPapel,
  validarNomeDoPapel,
  validarParticipacao,
  validarValidade,
} from './formularioPapel';
import { filtrarAlteracoes, lerFiltrosAlteracoes } from './historicoAlteracoes';
import { comandosDasOperacoes } from './sqlAlteracoes';

function papel(nome: string, extra: Partial<PapelDTO> = {}): PapelDTO {
  return {
    nome,
    descricao: null,
    inicial: false,
    login: true,
    superusuario: false,
    criaBancos: false,
    criaPapeis: false,
    replicacao: false,
    ignoraRls: false,
    herda: true,
    limiteConexoes: null,
    validadeSenha: null,
    metodoSenha: 'SCRAM',
    configuracoes: [],
    membroDe: [],
    membros: [],
    sessoes: 0,
    ociosasEmTransacao30Dias: 0,
    vistoPorUltimo: null,
    observadoDesde: '2026-09-01T00:00:00.000Z',
    objetos: [],
    ...extra,
  };
}

const papeis = [papel('postgres', { inicial: true, superusuario: true }), papel('ana'), papel('leitura', { login: false })];

describe('validarNomeDoPapel', () => {
  it('recusa vazio, prefixo pg_, palavras reservadas, nomes repetidos e caracteres que a tela não abriria', () => {
    expect(validarNomeDoPapel('', papeis, null)).toBe('Informe o nome do papel.');
    expect(validarNomeDoPapel('pg_leitor', papeis, null)).toMatch(/reservados/);
    expect(validarNomeDoPapel('public', papeis, null)).toMatch(/reservada/);
    expect(validarNomeDoPapel('ana', papeis, null)).toMatch(/Já existe/);
    expect(validarNomeDoPapel('ana', papeis, 'ana')).toBeUndefined();
    expect(validarNomeDoPapel('relatórios', papeis, null)).toMatch(/sem acento/);
    expect(validarNomeDoPapel('a'.repeat(64), papeis, null)).toMatch(/63/);
    expect(validarNomeDoPapel('leitor_bi', papeis, null)).toBeUndefined();
  });
});

describe('validarValidade', () => {
  it('aceita em branco e datas a partir de amanhã', () => {
    expect(validarValidade('', '2026-10-20')).toBeUndefined();
    expect(validarValidade('2026-10-21', '2026-10-20')).toBeUndefined();
    expect(validarValidade('2026-10-20', '2026-10-20')).toMatch(/amanhã/);
    expect(validarValidade('2026-02-30', '2026-01-01')).toBe('Essa data não existe.');
  });
});

describe('operacoesDoFormularioPapel', () => {
  it('cria com o verificador, a descrição, as configurações e as participações, nessa ordem', () => {
    const campos = { ...camposDoModelo('APLICACAO', null, 'public'), nome: 'api', descricao: 'API', participacoes: [] };
    const operacoes = operacoesDoFormularioPapel({ campos, original: null, permissoes: null, verificador: 'SCRAM-SHA-256$1:a$b:c' });
    expect(comandosDasOperacoes(operacoes)).toEqual([
      "CREATE ROLE api LOGIN CONNECTION LIMIT 20 PASSWORD 'SCRAM-SHA-256$1:a$b:c';",
      "COMMENT ON ROLE api IS 'API';",
      "ALTER ROLE api SET statement_timeout = '30s';",
      "ALTER ROLE api SET idle_in_transaction_session_timeout = '5min';",
    ]);
  });

  it('na edição, gera só o que mudou e renomeia por último', () => {
    const original = papel('ana', { limiteConexoes: 5, configuracoes: ['statement_timeout=30s', 'work_mem=64MB'] });
    const campos = camposDoPapel(original);
    const alterados = {
      ...campos,
      nome: 'ana_silva',
      limite: '',
      atributos: { ...campos.atributos, criaBancos: true },
      configuracoes: campos.configuracoes.filter((item) => item.parametro !== 'work_mem'),
    };
    expect(comandosDasOperacoes(operacoesDoFormularioPapel({ campos: alterados, original, permissoes: null, verificador: null }))).toEqual([
      'ALTER ROLE ana CREATEDB CONNECTION LIMIT -1;',
      'ALTER ROLE ana RESET work_mem;',
      'ALTER ROLE ana RENAME TO ana_silva;',
    ]);
    expect(operacoesDoFormularioPapel({ campos, original, permissoes: null, verificador: null })).toEqual([]);
  });

  it('pede a senha nova quando a troca está ligada na edição', () => {
    const original = papel('ana');
    const erros = validarCamposPapel({ ...camposDoPapel(original), definirSenha: true }, { papeis, original, hoje: '2026-10-20' });
    expect(erros.senha).toBe('Digite a nova senha.');
  });
});

describe('validarParticipacao', () => {
  it('recusa a participação que já existe e a que criaria um ciclo', () => {
    const grupo = papel('g', { login: false, membroDe: [{ papel: 'ana', herda: true, assume: true, administra: false }] });
    const lista = [...papeis, grupo, papel('bia', { membroDe: [{ papel: 'leitura', herda: true, assume: true, administra: false }] })];
    const base = { herda: true, assume: true, administra: false };
    expect(validarParticipacao({ grupo: 'leitura', membro: 'bia', ...base }, lista).membro).toMatch(/já participa/);
    expect(validarParticipacao({ grupo: 'ana', membro: 'g', ...base }, lista).membro).toMatch(/já participa/);
    expect(validarParticipacao({ grupo: 'leitura', membro: 'ana', ...base }, lista).membro).toBeUndefined();
    expect(validarParticipacao({ grupo: 'g', membro: 'ana', ...base }, lista).membro).toMatch(/ciclo/);
  });
});

describe('capacidade', () => {
  it('só deixa administrar papéis com CREATEROLE e ADMIN, ou como superusuário, e protege a conexão e a instalação', () => {
    const contexto = { ator: 'ana', papeis };
    expect(podeCriarPapeis(contexto).permitido).toBe(false);
    expect(podeCriarPapeis({ ator: 'postgres', papeis }).permitido).toBe(true);
    expect(podeExcluirPapel({ ator: 'postgres', papeis }, 'postgres').motivo).toMatch(/conectado/);
    expect(podeExcluirPapel({ ator: 'ana', papeis }, 'postgres').motivo).toMatch(/instalação/);
    const admin = [papel('gerente', { criaPapeis: true, membroDe: [{ papel: 'ana', herda: false, assume: false, administra: true }] }), ...papeis];
    expect(podeExcluirPapel({ ator: 'gerente', papeis: admin }, 'ana').permitido).toBe(true);
    expect(podeExcluirPapel({ ator: 'gerente', papeis: admin }, 'leitura').permitido).toBe(false);
    expect(podeMudarParticipacao({ ator: 'gerente', papeis: admin }, 'ana').permitido).toBe(true);
  });

  it('deixa cada um trocar a própria senha, mas não os próprios atributos', () => {
    const contexto = { ator: 'ana', papeis };
    expect(capacidadeDasOperacoes([{ tipo: 'ALTERAR_PAPEL', papel: 'ana', atributos: {}, senha: { tipo: 'NENHUMA' } }], contexto).permitido).toBe(true);
    expect(capacidadeDasOperacoes([{ tipo: 'ALTERAR_PAPEL', papel: 'ana', atributos: { criaBancos: true } }], contexto).permitido).toBe(false);
  });

  it('pede o nome digitado para excluir, tirar superusuário, revogar de PUBLIC e tirar o próprio acesso', () => {
    expect(nomeParaConfirmar([{ tipo: 'EXCLUIR_PAPEL', papel: 'ana', herdeiro: null, removerPermissoes: false, encerrarSessoes: false }], 'postgres')).toBe('ana');
    expect(nomeParaConfirmar([{ tipo: 'REVOGAR_PARTICIPACAO', grupo: 'leitura', membro: 'postgres' }], 'postgres')).toBe('postgres');
    expect(nomeParaConfirmar([{ tipo: 'CONCEDER_PARTICIPACAO', grupo: 'leitura', membro: 'ana', herda: true, assume: true, administra: false }], 'postgres')).toBeNull();
  });
});

describe('histórico de alterações', () => {
  it('lê os filtros do histórico do navegador, descartando o que não vale, e filtra por papel e resultado', () => {
    expect(lerFiltrosAlteracoes({ busca: '  ana ', resultado: 'X', papel: 'pg ruim', pagina: 3 })).toEqual({
      busca: 'ana',
      resultado: null,
      papel: null,
      pagina: 3,
    });
    const base = {
      conta: 'demo@orynt.local',
      papelDaConexao: 'postgres',
      banco: 'loja',
      origem: 'FORMULARIO' as const,
      comandos: [],
      falha: null,
      inversas: null,
      desfaz: null,
      desfeitaPor: null,
    };
    const alteracoes = [
      { ...base, id: '1', feitaEm: '2026-10-20T10:00:00.000Z', resultado: 'APLICADA' as const, operacoes: [{ tipo: 'REVOGAR_PARTICIPACAO' as const, grupo: 'leitura', membro: 'ana' }] },
      { ...base, id: '2', feitaEm: '2026-10-20T11:00:00.000Z', resultado: 'RECUSADA' as const, operacoes: [{ tipo: 'RENOMEAR_PAPEL' as const, papel: 'bia', novoNome: 'beatriz' }] },
    ];
    expect(filtrarAlteracoes(alteracoes, { busca: '', resultado: null, papel: null, pagina: 1 }).map((item) => item.id)).toEqual(['2', '1']);
    expect(filtrarAlteracoes(alteracoes, { busca: '', resultado: 'RECUSADA', papel: null, pagina: 1 }).map((item) => item.id)).toEqual(['2']);
    expect(filtrarAlteracoes(alteracoes, { busca: '', resultado: null, papel: 'ana', pagina: 1 }).map((item) => item.id)).toEqual(['1']);
    expect(filtrarAlteracoes(alteracoes, { busca: 'beatriz', resultado: null, papel: null, pagina: 1 }).map((item) => item.id)).toEqual(['2']);
  });
});
