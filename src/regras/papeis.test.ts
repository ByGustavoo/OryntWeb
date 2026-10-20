import { describe, expect, it } from 'vitest';
import type { PapelDTO } from '@/modelos/papeis';
import {
  aplicarMudancaPapeis,
  avisosDoPapel,
  comandosDoPapel,
  estadoDaSenha,
  estadoDoUsoDoPapel,
  filtrarPapeis,
  filtrosPapeisIniciais,
  gruposHerdados,
  identificadorSql,
  lerFiltrosPapeis,
  lerNomeDoPapel,
  loteDeComandosDosPapeis,
  ordenarPapeis,
  participacoesComSetRole,
  pontosDeAtencaoPapeis,
  resumirPapeis,
  semLimiteDeTempo,
  situacoesDoPapel,
  textoDaValidade,
  textoDoUltimoUso,
} from './papeis';
import type { ContextoDosPapeis } from './papeis';

const geradoEm = '2026-10-19T18:00:00.000Z';
const contexto: ContextoDosPapeis = { geradoEm, coletaDesde: '2026-09-02T13:12:00.000Z', papelDaConexao: 'loja_app' };

function diasAntes(dias: number): string {
  return new Date(new Date(geradoEm).getTime() - dias * 86_400_000).toISOString();
}

function criarPapel(nome: string, campos: Partial<PapelDTO> = {}): PapelDTO {
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
    configuracoes: ['statement_timeout=30s'],
    membroDe: [],
    membros: [],
    sessoes: 1,
    ociosasEmTransacao30Dias: 0,
    vistoPorUltimo: geradoEm,
    observadoDesde: contexto.coletaDesde,
    objetos: [],
    ...campos,
  };
}

function participacao(papel: string, campos: Partial<PapelDTO['membroDe'][number]> = {}) {
  return { papel, herda: true, assume: true, administra: false, ...campos };
}

describe('lerFiltrosPapeis', () => {
  it('começa pelo nome e troca cada campo inválido pelo padrão', () => {
    expect(lerFiltrosPapeis(undefined)).toEqual(filtrosPapeisIniciais);
    expect(lerFiltrosPapeis({ tipo: 'TABELA', atributo: 'LOGIN', situacao: 'LENTA', ordenacao: 'TAMANHO', pagina: -1 })).toEqual(
      filtrosPapeisIniciais,
    );
    expect(lerFiltrosPapeis({ tipo: 'GRUPO', atributo: 'REPLICACAO', ordenacao: 'VALIDADE' })).toMatchObject({
      tipo: 'GRUPO',
      atributo: 'REPLICACAO',
      ordenacao: 'VALIDADE',
      direcao: 'ASC',
    });
  });

  it('volta à primeira página a cada mudança que não seja de página', () => {
    const naTerceira = { ...filtrosPapeisIniciais, pagina: 3 };

    expect(aplicarMudancaPapeis(naTerceira, { situacao: 'SEM_USO' }).pagina).toBe(1);
    expect(aplicarMudancaPapeis(naTerceira, { pagina: 2 }).pagina).toBe(2);
  });
});

describe('nomes de papel', () => {
  it('aceita só nomes que cabem num identificador do PostgreSQL', () => {
    expect(lerNomeDoPapel('loja_app')).toBe('loja_app');
    expect(lerNomeDoPapel('ana.souza')).toBe('ana.souza');
    expect(lerNomeDoPapel('loja app')).toBeNull();
    expect(lerNomeDoPapel(42)).toBeNull();
  });

  it('põe aspas no nome que não é um identificador simples', () => {
    expect(identificadorSql('loja_app')).toBe('loja_app');
    expect(identificadorSql('Ana.Souza')).toBe('"Ana.Souza"');
  });
});

describe('situacoesDoPapel', () => {
  it('aponta o superusuário com login, mas não o criado na instalação nem o grupo', () => {
    expect(situacoesDoPapel(criarPapel('migracao', { superusuario: true }), contexto)).toEqual(['SUPERUSUARIO']);
    expect(situacoesDoPapel(criarPapel('postgres', { superusuario: true, inicial: true }), contexto)).toEqual([]);
    expect(
      situacoesDoPapel(criarPapel('admins', { login: false, superusuario: true, membros: [participacao('ana')] }), contexto),
    ).toEqual([]);
  });

  it('aponta a senha vencida e a que vence em até 7 dias, com tons diferentes', () => {
    const vencida = criarPapel('bi', { validadeSenha: diasAntes(12) });
    const aVencer = criarPapel('analise', { validadeSenha: diasAntes(-5) });
    const distante = criarPapel('app', { validadeSenha: diasAntes(-40) });

    expect(estadoDaSenha(vencida, contexto)).toBe('VENCIDA');
    expect(estadoDaSenha(aVencer, contexto)).toBe('A_VENCER');
    expect(situacoesDoPapel(vencida, contexto)).toEqual(['VALIDADE_DA_SENHA']);
    expect(situacoesDoPapel(aVencer, contexto)).toEqual(['VALIDADE_DA_SENHA']);
    expect(situacoesDoPapel(distante, contexto)).toEqual([]);
    expect(textoDaValidade(vencida, contexto)).toBe('Venceu há 12 dias');
    expect(textoDaValidade(aVencer, contexto)).toBe('Vence em 5 dias');
    expect(pontosDeAtencaoPapeis([aVencer, vencida], contexto).map((ponto) => [ponto.papel, ponto.tom])).toEqual([
      ['bi', 'erro'],
      ['analise', 'aviso'],
    ]);
  });

  it('aponta a senha em MD5 e o usuário com 80% do limite de conexões', () => {
    expect(situacoesDoPapel(criarPapel('auditoria', { metodoSenha: 'MD5' }), contexto)).toEqual(['SENHA_MD5']);
    expect(situacoesDoPapel(criarPapel('fila', { limiteConexoes: 5, sessoes: 4 }), contexto)).toEqual(['PERTO_DO_LIMITE']);
    expect(situacoesDoPapel(criarPapel('fila', { limiteConexoes: 5, sessoes: 3 }), contexto)).toEqual([]);
  });

  it('só marca sem uso depois de 30 dias de observação sem nenhuma sessão', () => {
    const antigo = criarPapel('erp', { sessoes: 0, vistoPorUltimo: diasAntes(41) });
    const novo = criarPapel('exportacao', { sessoes: 0, vistoPorUltimo: null, observadoDesde: diasAntes(4) });
    const recente = criarPapel('backup', { sessoes: 0, vistoPorUltimo: diasAntes(3) });

    expect(situacoesDoPapel(antigo, contexto)).toEqual(['SEM_USO']);
    expect(estadoDoUsoDoPapel(novo, contexto)).toBe('EM_OBSERVACAO');
    expect(situacoesDoPapel(novo, contexto)).toEqual([]);
    expect(situacoesDoPapel(recente, contexto)).toEqual([]);
    expect(textoDoUltimoUso(recente, contexto)).toBe('Há 3 dias');
    expect(textoDoUltimoUso(novo, contexto)).toBe('Nunca visto');
    expect(avisosDoPapel(novo, [novo], contexto).at(-1)?.texto).toContain('há 4 dias e ainda não o viu conectado');
  });

  it('marca o grupo sem membros e sem objetos', () => {
    const vazio = criarPapel('relatorios_antigos', { login: false, sessoes: 0, vistoPorUltimo: null });
    const comMembro = { ...vazio, membros: [participacao('bi')] };

    expect(situacoesDoPapel(vazio, contexto)).toEqual(['GRUPO_VAZIO']);
    expect(situacoesDoPapel(comMembro, contexto)).toEqual([]);
  });
});

describe('participação em outros papéis', () => {
  const admin = criarPapel('loja_admin', { login: false, criaBancos: true, criaPapeis: true, membroDe: [participacao('raiz')] });
  const raiz = criarPapel('raiz', { login: false, superusuario: true });
  const suporte = criarPapel('suporte_dba', { membroDe: [participacao('loja_admin', { herda: false })] });
  const papeis = [admin, raiz, suporte];

  it('mostra os atributos que só valem depois de SET ROLE, com o caminho', () => {
    expect(participacoesComSetRole(suporte, papeis)).toEqual([
      { atributo: 'SUPERUSUARIO', caminho: ['loja_admin', 'raiz'] },
      { atributo: 'CRIA_BANCOS', caminho: ['loja_admin'] },
      { atributo: 'CRIA_PAPEIS', caminho: ['loja_admin'] },
    ]);
    expect(avisosDoPapel(suporte, papeis, contexto).map((aviso) => aviso.texto)).toContain(
      'Pode virar superusuário com SET ROLE raiz, pela participação em loja_admin › raiz. Na prática, é um superusuário com outro nome.',
    );
  });

  it('herda as permissões só pelas participações com herança', () => {
    expect(gruposHerdados(suporte, papeis)).toEqual([]);
    expect(gruposHerdados(admin, papeis)).toEqual(['raiz']);
  });

  it('não segue a participação sem SET ROLE', () => {
    const semAssumir = criarPapel('leitor', { membroDe: [participacao('loja_admin', { assume: false })] });
    expect(participacoesComSetRole(semAssumir, papeis)).toEqual([]);
  });
});

describe('avisos e comandos', () => {
  it('avisa da função SECURITY DEFINER sem search_path de que o papel é dono', () => {
    const postgres = criarPapel('postgres', {
      superusuario: true,
      inicial: true,
      objetos: [
        {
          tipo: 'FUNCAO',
          id: 'public.arquivar_pedidos_antigos(integer)',
          esquema: 'public',
          nome: 'arquivar_pedidos_antigos',
          funcao: { segurancaDefinidor: true, configuracoes: [] },
        },
        {
          tipo: 'FUNCAO',
          id: 'public.segura()',
          esquema: 'public',
          nome: 'segura',
          funcao: { segurancaDefinidor: true, configuracoes: ['search_path=public, pg_temp'] },
        },
      ],
    });

    const avisos = avisosDoPapel(postgres, [postgres], contexto);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tom: 'erro' });
    expect(avisos[0]?.texto).toContain('arquivar_pedidos_antigos');
  });

  it('escreve um comando por situação, sem senha no texto', () => {
    const papel = criarPapel('auditoria_app', {
      superusuario: true,
      metodoSenha: 'MD5',
      validadeSenha: diasAntes(2),
      limiteConexoes: 2,
      sessoes: 2,
    });

    expect(comandosDoPapel(papel, contexto).map((comando) => comando.comando)).toEqual([
      'ALTER ROLE auditoria_app NOSUPERUSER;',
      "ALTER ROLE auditoria_app VALID UNTIL '2027-01-17';",
      "SET password_encryption = 'scram-sha-256';\n\\password auditoria_app",
      'ALTER ROLE auditoria_app CONNECTION LIMIT 3;',
    ]);
  });

  it('junta os comandos da lista filtrada num lote', () => {
    const primeiro = criarPapel('erp', { sessoes: 0, vistoPorUltimo: diasAntes(41) });
    const segundo = criarPapel('legado', { sessoes: 0, vistoPorUltimo: null });

    expect(loteDeComandosDosPapeis([primeiro, segundo], 'SEM_USO', contexto)).toEqual({
      comandos: ['ALTER ROLE erp NOLOGIN;', 'ALTER ROLE legado NOLOGIN;'],
      rotulo: 'Copiar os 2 comandos',
      descricao: 'Copiar os 2 comandos dos papéis da lista, um por linha',
    });
    expect(loteDeComandosDosPapeis([primeiro], 'SUPERUSUARIO', contexto)).toBeNull();
  });

  it('cobra o statement_timeout só do usuário comum', () => {
    expect(semLimiteDeTempo(criarPapel('analise', { configuracoes: [] }))).toBe(true);
    expect(semLimiteDeTempo(criarPapel('app'))).toBe(false);
    expect(semLimiteDeTempo(criarPapel('raiz', { superusuario: true, configuracoes: [] }))).toBe(false);
    expect(semLimiteDeTempo(criarPapel('grupo', { login: false, configuracoes: [] }))).toBe(false);
  });
});

describe('lista', () => {
  const papeis = [
    criarPapel('loja_app', { sessoes: 30, limiteConexoes: 60 }),
    criarPapel('leitura', { login: false, sessoes: 0, vistoPorUltimo: null, membros: [participacao('bi')] }),
    criarPapel('bi', { sessoes: 0, vistoPorUltimo: diasAntes(12), validadeSenha: diasAntes(12) }),
    criarPapel('analise', { sessoes: 2, validadeSenha: diasAntes(-5), descricao: 'Painéis de vendas' }),
  ];

  it('põe os usuários antes dos grupos e os grupos no fim de uma ordem numérica', () => {
    expect(ordenarPapeis(papeis, 'NOME', 'ASC', contexto).map((papel) => papel.nome)).toEqual([
      'analise',
      'bi',
      'loja_app',
      'leitura',
    ]);
    expect(ordenarPapeis(papeis, 'SESSOES', 'DESC', contexto).map((papel) => papel.nome)).toEqual([
      'loja_app',
      'analise',
      'bi',
      'leitura',
    ]);
    expect(ordenarPapeis(papeis, 'VALIDADE', 'ASC', contexto).map((papel) => papel.nome)).toEqual([
      'bi',
      'analise',
      'loja_app',
      'leitura',
    ]);
  });

  it('busca no nome e na descrição e filtra por tipo e situação', () => {
    expect(filtrarPapeis(papeis, { ...filtrosPapeisIniciais, busca: 'vendas' }, contexto).map((papel) => papel.nome)).toEqual([
      'analise',
    ]);
    expect(filtrarPapeis(papeis, { ...filtrosPapeisIniciais, tipo: 'GRUPO' }, contexto).map((papel) => papel.nome)).toEqual([
      'leitura',
    ]);
    expect(
      filtrarPapeis(papeis, { ...filtrosPapeisIniciais, situacao: 'VALIDADE_DA_SENHA' }, contexto).map((papel) => papel.nome),
    ).toEqual(['analise', 'bi']);
  });

  it('resume a lista em usuários e grupos', () => {
    expect(resumirPapeis(papeis, 4, filtrosPapeisIniciais)).toBe('3 usuários e 1 grupo');
    expect(resumirPapeis(papeis, 1, { ...filtrosPapeisIniciais, tipo: 'GRUPO' })).toBe('1 de 4 papéis');
    expect(resumirPapeis([], 0, filtrosPapeisIniciais)).toBe('Nenhum papel no banco');
  });
});
