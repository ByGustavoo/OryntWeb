import { describe, expect, it } from 'vitest';
import type { OperacaoDTO, ReferenciaObjetoDTO } from '@/modelos/alteracoes';
import { comandosDaOperacao, comandosDasOperacoes, literalSql, ocultarSenhas, TEXTO_DA_SENHA_OCULTA } from './sqlAlteracoes';

const tabela: ReferenciaObjetoDTO = { id: 'public.pedidos', tipo: 'TABELA', esquema: 'public', nome: 'pedidos' };
const funcao: ReferenciaObjetoDTO = {
  id: 'public.arquivar(integer)',
  tipo: 'FUNCAO',
  esquema: 'public',
  nome: 'arquivar(integer)',
};
const atributos = {
  login: true,
  superusuario: false,
  criaBancos: false,
  criaPapeis: false,
  replicacao: false,
  ignoraRls: false,
  herda: true,
};

describe('comandosDaOperacao', () => {
  it('cria o papel com LOGIN ou NOLOGIN explícito e só os atributos fora do padrão', () => {
    expect(
      comandosDaOperacao({
        tipo: 'CRIAR_PAPEL',
        papel: 'ana',
        atributos: { ...atributos, criaBancos: true, herda: false },
        limiteConexoes: 20,
        validadeSenha: '2027-01-31',
        senha: { tipo: 'VERIFICADOR', valor: 'SCRAM-SHA-256$4096:abc$def:ghi' },
      }),
    ).toEqual([
      "CREATE ROLE ana LOGIN CREATEDB NOINHERIT CONNECTION LIMIT 20 VALID UNTIL '2027-01-31' PASSWORD 'SCRAM-SHA-256$4096:abc$def:ghi';",
    ]);
    expect(
      comandosDaOperacao({
        tipo: 'CRIAR_PAPEL',
        papel: 'Relatórios BI',
        atributos: { ...atributos, login: false },
        limiteConexoes: null,
        validadeSenha: null,
        senha: null,
      }),
    ).toEqual(['CREATE ROLE "Relatórios BI" NOLOGIN;']);
  });

  it('altera só o que mudou, com -1 e infinity para tirar o limite e a validade', () => {
    expect(
      comandosDaOperacao({
        tipo: 'ALTERAR_PAPEL',
        papel: 'ana',
        atributos: { superusuario: false, login: true },
        limiteConexoes: null,
        validadeSenha: null,
        senha: { tipo: 'NENHUMA' },
      }),
    ).toEqual(["ALTER ROLE ana LOGIN NOSUPERUSER CONNECTION LIMIT -1 VALID UNTIL 'infinity' PASSWORD NULL;"]);
    expect(comandosDaOperacao({ tipo: 'ALTERAR_PAPEL', papel: 'ana', atributos: {} })).toEqual([]);
  });

  it('escreve renomear, descrever e configurar, com search_path como lista de nomes', () => {
    expect(comandosDasOperacoes([
      { tipo: 'RENOMEAR_PAPEL', papel: 'ana', novoNome: 'ana_silva' },
      { tipo: 'DESCREVER_PAPEL', papel: 'ana', descricao: "Analista d'água" },
      { tipo: 'DESCREVER_PAPEL', papel: 'ana', descricao: null },
      { tipo: 'CONFIGURAR_PAPEL', papel: 'ana', parametro: 'statement_timeout', valor: '30s' },
      { tipo: 'CONFIGURAR_PAPEL', papel: 'ana', parametro: 'search_path', valor: '"$user", public, Relatórios' },
      { tipo: 'CONFIGURAR_PAPEL', papel: 'ana', parametro: 'work_mem', valor: null },
    ])).toEqual([
      'ALTER ROLE ana RENAME TO ana_silva;',
      "COMMENT ON ROLE ana IS 'Analista d''água';",
      'COMMENT ON ROLE ana IS NULL;',
      "ALTER ROLE ana SET statement_timeout = '30s';",
      'ALTER ROLE ana SET search_path = "$user", public, "Relatórios";',
      'ALTER ROLE ana RESET work_mem;',
    ]);
  });

  it('exclui na ordem que o PostgreSQL exige: sessões, objetos, permissões e o papel', () => {
    expect(
      comandosDaOperacao({ tipo: 'EXCLUIR_PAPEL', papel: 'ana', herdeiro: 'postgres', removerPermissoes: true, encerrarSessoes: true }),
    ).toEqual([
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'ana';",
      'REASSIGN OWNED BY ana TO postgres;',
      'DROP OWNED BY ana;',
      'DROP ROLE ana;',
    ]);
    expect(
      comandosDaOperacao({ tipo: 'EXCLUIR_PAPEL', papel: 'g', herdeiro: null, removerPermissoes: false, encerrarSessoes: false }),
    ).toEqual(['DROP ROLE g;']);
  });

  it('põe e tira de um grupo, com as opções que fogem do padrão', () => {
    expect(comandosDasOperacoes([
      { tipo: 'CONCEDER_PARTICIPACAO', grupo: 'leitura', membro: 'ana', herda: true, assume: true, administra: false },
      { tipo: 'CONCEDER_PARTICIPACAO', grupo: 'loja_admin', membro: 'ana', herda: false, assume: true, administra: true },
      { tipo: 'REVOGAR_PARTICIPACAO', grupo: 'leitura', membro: 'ana' },
    ])).toEqual([
      'GRANT leitura TO ana;',
      'GRANT loja_admin TO ana WITH INHERIT FALSE, ADMIN TRUE;',
      'REVOKE leitura FROM ana;',
    ]);
  });

  it('concede e revoga num objeto ou em todos de um esquema, por coluna e com GRANTED BY de cada concedente', () => {
    const operacoes: OperacaoDTO[] = [
      { tipo: 'CONCEDER', alvo: { tipo: 'OBJETO', objeto: tabela }, beneficiario: 'ana', privilegios: ['SELECT', 'UPDATE'], colunas: ['id', 'Total'], repassavel: true },
      { tipo: 'CONCEDER', alvo: { tipo: 'TODOS_DO_ESQUEMA', esquema: 'public', tipoDeObjeto: 'SEQUENCIAS' }, beneficiario: 'ana', privilegios: ['USAGE'], colunas: null, repassavel: false },
      { tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: funcao }, beneficiario: 'PUBLIC', privilegios: ['EXECUTE'], colunas: null, soRepasse: false, concedentes: [], cascata: false },
      { tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: tabela }, beneficiario: 'leitura', privilegios: ['UPDATE'], colunas: null, soRepasse: false, concedentes: ['migracao', 'postgres'], cascata: true },
      { tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: tabela }, beneficiario: 'erp', privilegios: ['SELECT'], colunas: null, soRepasse: true, concedentes: [], cascata: false },
    ];
    expect(comandosDasOperacoes(operacoes)).toEqual([
      'GRANT SELECT (id, "Total"), UPDATE (id, "Total") ON TABLE public.pedidos TO ana WITH GRANT OPTION;',
      'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ana;',
      'REVOKE EXECUTE ON FUNCTION public.arquivar(integer) FROM PUBLIC;',
      'REVOKE UPDATE ON TABLE public.pedidos FROM leitura GRANTED BY migracao CASCADE;',
      'REVOKE UPDATE ON TABLE public.pedidos FROM leitura GRANTED BY postgres CASCADE;',
      'REVOKE GRANT OPTION FOR SELECT ON TABLE public.pedidos FROM erp;',
    ]);
  });

  it('define e retira privilégios padrão', () => {
    expect(comandosDasOperacoes([
      { tipo: 'PRIVILEGIO_PADRAO', acao: 'CONCEDER', criador: 'loja_app', esquema: 'public', tipoDeObjeto: 'TABELAS', beneficiario: 'leitura', privilegios: ['SELECT'] },
      { tipo: 'PRIVILEGIO_PADRAO', acao: 'REVOGAR', criador: 'loja_app', esquema: null, tipoDeObjeto: 'FUNCOES', beneficiario: 'PUBLIC', privilegios: ['EXECUTE'] },
    ])).toEqual([
      'ALTER DEFAULT PRIVILEGES FOR ROLE loja_app IN SCHEMA public GRANT SELECT ON TABLES TO leitura;',
      'ALTER DEFAULT PRIVILEGES FOR ROLE loja_app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;',
    ]);
  });
});

describe('ocultarSenhas', () => {
  it('troca o verificador pelo marcador, para o histórico nunca guardar o verificador', () => {
    const [criada, alterada] = ocultarSenhas([
      { tipo: 'CRIAR_PAPEL', papel: 'ana', atributos, limiteConexoes: null, validadeSenha: null, senha: { tipo: 'VERIFICADOR', valor: 'SCRAM-SHA-256$x' } },
      { tipo: 'ALTERAR_PAPEL', papel: 'ana', atributos: {}, senha: { tipo: 'VERIFICADOR', valor: 'SCRAM-SHA-256$y' } },
    ]);
    expect(comandosDasOperacoes([criada!, alterada!])).toEqual([
      `CREATE ROLE ana LOGIN PASSWORD ${TEXTO_DA_SENHA_OCULTA};`,
      `ALTER ROLE ana PASSWORD ${TEXTO_DA_SENHA_OCULTA};`,
    ]);
  });
});

describe('literalSql', () => {
  it('dobra as aspas simples', () => {
    expect(literalSql("o'neil")).toBe("'o''neil'");
  });
});
