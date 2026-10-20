import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { rotasApi } from '@/api/rotasApi';
import type { AlteracaoDTO, ListaAlteracoesDTO, OperacaoDTO, OrigemDaAlteracao } from '@/modelos/alteracoes';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO } from '@/modelos/permissoes';
import type { ListaSessoesDTO } from '@/modelos/sessoes';
import { calcularEfeito } from '@/regras/efeitoAlteracoes';
import { operacoesDoModelo } from '@/regras/formularioPapel';
import { inversasDe } from '@/regras/inversasAlteracoes';
import { comandosDoPapel, situacoesDoPapel } from '@/regras/papeis';
import { acessoDe, comandosDoAcesso, indexarPermissoes, linhasDoPapel, pontosDeAtencaoPermissoes } from '@/regras/permissoes';
import { contarConexoes } from '@/regras/sessoes';
import { aplicarAlteracao, listarAlteracoes } from './manipuladores/alteracoes';
import { listarTabelas } from './manipuladores/objetos';
import { listarPapeis, listarPermissoes, listarSessoes } from './manipuladores/usuarios';
import { definirRecusaDeAlteracoes, restaurarPapeisSimulados } from './alteracoesSimuladas';
import type { ContaSimulada } from './contasSimuladas';
import { conexoesNoInstante } from './series';

const agora = new Date(2026, 9, 19, 15, 7, 23);
const contaDaDemonstracao: ContaSimulada = {
  id: 'u1',
  nome: 'Demonstração',
  email: 'demo@orynt.local',
  perfil: 'ADMINISTRADOR',
  permissoes: [],
  ativa: true,
  inicial: true,
  criadaEm: agora.toISOString(),
  criadaPor: null,
  atualizadaEm: agora.toISOString(),
  ultimoAcessoEm: null,
  senha: null,
  convite: null,
  bloqueadaAte: null,
  sessoes: [],
};
const armazenamento = new Map<string, string>();
let usuarioDaConexao = 'postgres';

function cookies(): string {
  const sessao = {
    id: 'conexao-teste',
    tipoBanco: 'POSTGRESQL',
    nome: 'Loja',
    host: 'db.loja.local',
    porta: 5432,
    banco: 'loja',
    usuario: usuarioDaConexao,
    versaoServidor: '18.0',
    conectadaEm: new Date(2026, 9, 19, 14, 40).toISOString(),
    simulada: true,
  };
  const acesso = { id: 'u1', nome: 'Demonstração', email: 'demo@orynt.local' };
  return [
    `orynt_sessao_simulada=${encodeURIComponent(JSON.stringify(sessao))}`,
    `orynt_acesso_simulado=${encodeURIComponent(JSON.stringify(acesso))}`,
  ].join('; ');
}

vi.stubGlobal('window', {
  localStorage: {
    getItem: (chave: string) => armazenamento.get(chave) ?? null,
    setItem: (chave: string, valor: string) => armazenamento.set(chave, valor),
    removeItem: (chave: string) => armazenamento.delete(chave),
  },
});
vi.stubGlobal('document', {
  get cookie() {
    return cookies();
  },
});

afterAll(() => vi.unstubAllGlobals());

function requisicao(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): RequisicaoTransporte {
  return { metodo, caminho, consulta: {}, corpo, cabecalhos: {}, signal: new AbortController().signal };
}

function aplicar(operacoes: OperacaoDTO[], extra: { inversas?: OperacaoDTO[] | null; desfaz?: string | null; origem?: OrigemDaAlteracao } = {}): RespostaTransporte {
  return aplicarAlteracao(
    requisicao('POST', rotasApi.usuarios.alteracoes, {
      operacoes,
      inversas: extra.inversas ?? null,
      desfaz: extra.desfaz ?? null,
      origem: extra.origem ?? 'FORMULARIO',
    }),
    agora,
    {},
    { conta: contaDaDemonstracao },
  );
}

function papeis(): ListaPapeisDTO {
  return listarPapeis(requisicao('GET', rotasApi.usuarios.papeis), agora).corpo as ListaPapeisDTO;
}

function permissoes(): ListaPermissoesDTO {
  return listarPermissoes(requisicao('GET', rotasApi.usuarios.permissoes), agora).corpo as ListaPermissoesDTO;
}

function sessoes(): ListaSessoesDTO {
  return listarSessoes(requisicao('GET', rotasApi.usuarios.sessoes), agora).corpo as ListaSessoesDTO;
}

function historico(): AlteracaoDTO[] {
  return (listarAlteracoes(requisicao('GET', rotasApi.usuarios.alteracoes), agora).corpo as ListaAlteracoesDTO).alteracoes;
}

function tipoDoProblema(resposta: RespostaTransporte): string {
  return (resposta.corpo as { type: string }).type;
}

const contexto = () => {
  const lista = papeis();
  return { geradoEm: lista.geradoEm, coletaDesde: lista.coletaDesde, papelDaConexao: lista.papelDaConexao };
};

const atributosDeUsuario = {
  login: true,
  superusuario: false,
  criaBancos: false,
  criaPapeis: false,
  replicacao: false,
  ignoraRls: false,
  herda: true,
};

function criar(papel: string, extra: Partial<Extract<OperacaoDTO, { tipo: 'CRIAR_PAPEL' }>> = {}): OperacaoDTO {
  return { tipo: 'CRIAR_PAPEL', papel, atributos: atributosDeUsuario, limiteConexoes: null, validadeSenha: null, senha: null, ...extra };
}

beforeEach(() => {
  armazenamento.clear();
  usuarioDaConexao = 'postgres';
  restaurarPapeisSimulados();
  definirRecusaDeAlteracoes(false);
});

describe('POST /usuarios/alteracoes', () => {
  it('cria um papel que aparece em Papéis e em Permissões, sem sessão e em observação, e registra no histórico', () => {
    const resposta = aplicar([criar('ana', { senha: { tipo: 'VERIFICADOR', valor: 'SCRAM-SHA-256$4096:c2Fs$Z3VhcmRhZGE=:c2Vydmlkb3I=' } })]);
    expect(resposta.status).toBe(201);
    const ana = papeis().papeis.find((papel) => papel.nome === 'ana');
    expect(ana).toMatchObject({ login: true, sessoes: 0, metodoSenha: 'SCRAM', observadoDesde: agora.toISOString() });
    expect(situacoesDoPapel(ana!, contexto())).toEqual([]);
    expect(permissoes().papeis.some((papel) => papel.nome === 'ana')).toBe(true);
    expect(historico()).toHaveLength(1);
    expect(historico()[0]).toMatchObject({ resultado: 'APLICADA', conta: 'demo@orynt.local', papelDaConexao: 'postgres' });
  });

  it('nunca guarda o verificador da senha, nem no histórico nem no armazenamento do simulador', () => {
    aplicar([criar('ana', { senha: { tipo: 'VERIFICADOR', valor: 'SCRAM-SHA-256$4096:c2Fs$Z3VhcmRhZGE=:c2Vydmlkb3I=' } })]);
    expect([...armazenamento.values()].join('')).not.toContain('Z3VhcmRhZGE=');
    expect(historico()[0]?.comandos).toEqual(["CREATE ROLE ana LOGIN PASSWORD '<verificador SCRAM omitido>';"]);
  });

  it('mantém a soma das sessões igual às conexões ativas do Dashboard depois de excluir um papel com sessões', () => {
    const resposta = aplicar([{ tipo: 'EXCLUIR_PAPEL', papel: 'auditoria_app', herdeiro: 'postgres', removerPermissoes: true, encerrarSessoes: true }]);
    expect(resposta.corpo).toMatchObject({ resultado: 'APLICADA' });
    const lista = papeis();
    expect(lista.papeis.some((papel) => papel.nome === 'auditoria_app')).toBe(false);
    expect(lista.papeis.reduce((soma, papel) => soma + papel.sessoes, 0)).toBe(conexoesNoInstante(agora));
    expect(contarConexoes(sessoes().sessoes)).toBe(conexoesNoInstante(agora));
  });

  it('recusa excluir um papel com objetos sem herdeiro e, com herdeiro, passa os objetos para ele em todas as telas', () => {
    const recusada = aplicar([{ tipo: 'EXCLUIR_PAPEL', papel: 'loja_auditoria', herdeiro: null, removerPermissoes: true, encerrarSessoes: false }]);
    expect(recusada.status).toBe(422);
    expect(tipoDoProblema(recusada)).toBe('/problems/database-dependent-objects');
    expect(historico()[0]).toMatchObject({ resultado: 'RECUSADA', falha: { codigo: '2BP01' } });

    const aceita = aplicar([{ tipo: 'EXCLUIR_PAPEL', papel: 'loja_auditoria', herdeiro: 'postgres', removerPermissoes: true, encerrarSessoes: false }]);
    expect(aceita.status).toBe(201);
    const tabelas = (listarTabelas(requisicao('GET', rotasApi.objetos.tabelas), agora).corpo as { tabelas: { dono: string }[] }).tabelas;
    expect(tabelas.some((tabela) => tabela.dono === 'loja_auditoria')).toBe(false);
    expect(permissoes().objetos.some((objeto) => objeto.dono === 'loja_auditoria')).toBe(false);
    expect(papeis().papeis.find((papel) => papel.nome === 'postgres')?.objetos.some((objeto) => objeto.esquema === 'auditoria')).toBe(true);
  });

  it('recusa o que o papel da conexão não pode fazer, como o PostgreSQL', () => {
    usuarioDaConexao = 'loja_app';
    const criarSemCreateRole = aplicar([criar('ana')]);
    expect(criarSemCreateRole.status).toBe(422);
    expect(tipoDoProblema(criarSemCreateRole)).toBe('/problems/database-permission-denied');

    const tabela = permissoes().objetos.find((objeto) => objeto.id === 'public.pedidos')!;
    const concederComoDono = aplicar([
      { tipo: 'CONCEDER', alvo: { tipo: 'OBJETO', objeto: { id: tabela.id, tipo: tabela.tipo, esquema: tabela.esquema, nome: tabela.nome } }, beneficiario: 'leitura', privilegios: ['INSERT'], colunas: null, repassavel: false },
    ]);
    expect(concederComoDono.status).toBe(201);

    const excluirASiMesmo = aplicar([{ tipo: 'EXCLUIR_PAPEL', papel: 'loja_app', herdeiro: 'postgres', removerPermissoes: true, encerrarSessoes: false }]);
    expect(tipoDoProblema(excluirASiMesmo)).toBe('/problems/database-object-in-use');
  });

  it('recusa tudo com o controle de desenvolvimento ligado', () => {
    definirRecusaDeAlteracoes(true);
    expect(aplicar([criar('ana')]).status).toBe(422);
    expect(papeis().papeis.some((papel) => papel.nome === 'ana')).toBe(false);
  });

  it('desfaz uma alteração com as inversas e não deixa desfazer duas vezes', () => {
    const estado = { papeis: papeis(), permissoes: permissoes() };
    const operacoes: OperacaoDTO[] = [criar('ana')];
    const feita = aplicar(operacoes, { inversas: inversasDe(operacoes, estado) }).corpo as AlteracaoDTO;
    expect(feita.inversas).toEqual([{ tipo: 'EXCLUIR_PAPEL', papel: 'ana', herdeiro: null, removerPermissoes: true, encerrarSessoes: false }]);

    const desfeita = aplicar(feita.inversas!, { desfaz: feita.id, origem: 'DESFAZER' });
    expect(desfeita.status).toBe(201);
    expect(papeis().papeis.some((papel) => papel.nome === 'ana')).toBe(false);
    expect(historico().find((item) => item.id === feita.id)?.desfeitaPor).toBe((desfeita.corpo as AlteracaoDTO).id);
    expect(aplicar(feita.inversas!, { desfaz: feita.id, origem: 'DESFAZER' }).status).toBe(409);
  });

  it('mantém as sessões desenhadas de um papel renomeado, com o nome novo', () => {
    const antes = sessoes().sessoes.filter((sessao) => sessao.papel === 'fila_pedidos').length;
    expect(aplicar([{ tipo: 'RENOMEAR_PAPEL', papel: 'fila_pedidos', novoNome: 'worker_pedidos' }]).status).toBe(201);
    const depois = sessoes().sessoes;
    expect(depois.filter((sessao) => sessao.papel === 'worker_pedidos')).toHaveLength(antes);
    expect(depois.some((sessao) => sessao.papel === 'fila_pedidos')).toBe(false);
    expect(contarConexoes(depois)).toBe(conexoesNoInstante(agora));
  });
});

describe('comandos que as telas sugerem', () => {
  it('a escrita na leitura sai com GRANTED BY de quem concedeu, e depois de aplicada o ponto some', () => {
    const indice = indexarPermissoes(permissoes());
    const linha = linhasDoPapel('leitura', indice).find((item) => item.chave === 'public.produtos')!;
    const comando = comandosDoAcesso(linha, indice).find((item) => item.situacao === 'ESCRITA_NA_LEITURA')!;
    expect(comando.comando).toBe('REVOKE UPDATE ON TABLE public.produtos FROM leitura GRANTED BY migracao;');
    expect(aplicar(comando.operacoes, { origem: 'PONTO_DE_ATENCAO' }).status).toBe(201);
    const depois = indexarPermissoes(permissoes());
    expect(pontosDeAtencaoPermissoes(depois).some((ponto) => ponto.tipo === 'ESCRITA_NA_LEITURA')).toBe(false);
    const produtos = depois.objetos.get('public.produtos')!;
    expect(acessoDe('leitura', produtos, depois).privilegios.map((item) => item.privilegio)).toEqual(['SELECT']);
  });

  it('o superusuário a mais deixa de ser apontado depois de executar o comando do detalhe', () => {
    const migracao = papeis().papeis.find((papel) => papel.nome === 'migracao')!;
    const comando = comandosDoPapel(migracao, contexto()).find((item) => item.situacao === 'SUPERUSUARIO')!;
    expect(comando.comando).toBe('ALTER ROLE migracao NOSUPERUSER;');
    expect(aplicar(comando.operacoes!, { origem: 'PONTO_DE_ATENCAO' }).status).toBe(201);
    expect(situacoesDoPapel(papeis().papeis.find((papel) => papel.nome === 'migracao')!, contexto())).not.toContain('SUPERUSUARIO');
  });
});

describe('inversasDe', () => {
  it('volta Papéis e Permissões ao que eram depois de aplicar uma alteração e as inversas dela', () => {
    const antesPapeis = papeis();
    const antesPermissoes = permissoes();
    const tabela = antesPermissoes.objetos.find((objeto) => objeto.id === 'public.estoque')!;
    const referencia = { id: tabela.id, tipo: tabela.tipo, esquema: tabela.esquema, nome: tabela.nome };
    const operacoes: OperacaoDTO[] = [
      { tipo: 'CONCEDER_PARTICIPACAO', grupo: 'leitura', membro: 'suporte_dba', herda: true, assume: true, administra: false },
      { tipo: 'REVOGAR_PARTICIPACAO', grupo: 'leitura', membro: 'loja_analise' },
      { tipo: 'CONCEDER', alvo: { tipo: 'OBJETO', objeto: referencia }, beneficiario: 'leitura', privilegios: ['SELECT', 'DELETE'], colunas: null, repassavel: false },
      { tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: referencia }, beneficiario: 'fila_pedidos', privilegios: ['UPDATE'], colunas: null, soRepasse: false, concedentes: [], cascata: false },
      { tipo: 'ALTERAR_PAPEL', papel: 'fila_pedidos', atributos: { login: false }, limiteConexoes: 8, validadeSenha: '2027-03-01' },
      { tipo: 'CONFIGURAR_PAPEL', papel: 'fila_pedidos', parametro: 'statement_timeout', valor: '10s' },
      { tipo: 'PRIVILEGIO_PADRAO', acao: 'CONCEDER', criador: 'loja_app', esquema: 'public', tipoDeObjeto: 'TABELAS', beneficiario: 'leitura', privilegios: ['SELECT', 'INSERT'] },
      { tipo: 'RENOMEAR_PAPEL', papel: 'relatorios_antigos', novoNome: 'relatorios_v1' },
    ];
    const inversas = inversasDe(operacoes, { papeis: antesPapeis, permissoes: antesPermissoes });
    expect(inversas).not.toBeNull();
    expect(aplicar(operacoes).status).toBe(201);
    expect(aplicar(inversas!).status).toBe(201);

    const porNome = (a: { papel: string }, b: { papel: string }) => a.papel.localeCompare(b.papel);
    const limpar = (lista: ListaPapeisDTO) =>
      lista.papeis.map(({ sessoes, vistoPorUltimo, ...resto }) => ({
        ...resto,
        membroDe: [...resto.membroDe].sort(porNome),
        membros: [...resto.membros].sort(porNome),
      }));
    expect(limpar(papeis())).toEqual(limpar(antesPapeis));
    const ordenar = (lista: ListaPermissoesDTO) => ({
      ...lista,
      objetos: lista.objetos.map((objeto) => ({
        ...objeto,
        concessoes: [...objeto.concessoes].sort((a, b) =>
          `${a.beneficiario}${a.privilegio}${a.concedente}`.localeCompare(`${b.beneficiario}${b.privilegio}${b.concedente}`),
        ),
      })),
      privilegiosPadrao: [...lista.privilegiosPadrao].sort((a, b) => `${a.criador}${a.beneficiario}`.localeCompare(`${b.criador}${b.beneficiario}`)),
    });
    expect(ordenar(permissoes())).toEqual(ordenar(antesPermissoes));
  });

  it('não oferece desfazer uma exclusão nem uma troca de senha sozinha', () => {
    const estado = { papeis: papeis(), permissoes: permissoes() };
    expect(inversasDe([{ tipo: 'EXCLUIR_PAPEL', papel: 'relatorios_antigos', herdeiro: null, removerPermissoes: true, encerrarSessoes: false }], estado)).toBeNull();
    expect(inversasDe([{ tipo: 'ALTERAR_PAPEL', papel: 'loja_app', atributos: {}, senha: { tipo: 'NENHUMA' } }], estado)).toBeNull();
  });
});

describe('modelos de papel', () => {
  it('a leitura de um esquema lê todas as relações dele e deixa o privilégio padrão para as que vierem', () => {
    const lista = permissoes();
    const operacoes = [criar('leitor_public'), ...operacoesDoModelo('LEITURA', 'leitor_public', 'public', lista)];
    expect(aplicar(operacoes, { origem: 'MODELO' }).status).toBe(201);
    const indice = indexarPermissoes(permissoes());
    const relacoes = indice.ordenados.filter((objeto) => objeto.esquema === 'public' && ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA'].includes(objeto.tipo));
    expect(relacoes.length).toBeGreaterThan(5);
    for (const objeto of relacoes) {
      expect(acessoDe('leitor_public', objeto, indice).privilegios.some((item) => item.privilegio === 'SELECT')).toBe(true);
    }
    expect(indice.dados.privilegiosPadrao.some((padrao) => padrao.beneficiario === 'leitor_public' && padrao.criador === 'loja_app')).toBe(true);
  });
});

describe('calcularEfeito', () => {
  it('diz quem perde o quê, junta os membros que perdem o mesmo e avisa o que continua por outro caminho', () => {
    const estado = { papeis: papeis(), permissoes: permissoes() };
    const indice = indexarPermissoes(estado.permissoes);
    const produtos = indice.objetos.get('public.produtos')!;
    const referencia = { id: produtos.id, tipo: produtos.tipo, esquema: produtos.esquema, nome: produtos.nome };
    const efeito = calcularEfeito(
      [{ tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: referencia }, beneficiario: 'leitura', privilegios: ['UPDATE'], colunas: null, soRepasse: false, concedentes: [], cascata: false }],
      estado,
    );
    expect(efeito.linhas.map((linha) => linha.texto)).toEqual([
      'leitura continua com UPDATE em public.produtos. Concedido por migracao, direto a ele.',
    ]);

    const comGrantedBy = calcularEfeito(
      [{ tipo: 'REVOGAR', alvo: { tipo: 'OBJETO', objeto: referencia }, beneficiario: 'leitura', privilegios: ['UPDATE'], colunas: null, soRepasse: false, concedentes: ['migracao'], cascata: false }],
      estado,
    );
    expect(comGrantedBy.linhas[0]?.tom).toBe('PERDE');
    expect(comGrantedBy.linhas[0]?.texto).toMatch(/^leitura, .+ perdem UPDATE em public\.produtos\.$/);
  });

  it('avisa ao dar superusuário e ao revogar de PUBLIC', () => {
    const estado = { papeis: papeis(), permissoes: permissoes() };
    const efeito = calcularEfeito([{ tipo: 'ALTERAR_PAPEL', papel: 'loja_app', atributos: { superusuario: true } }], estado);
    expect(efeito.avisos.map((aviso) => aviso.tom)).toContain('erro');
    expect(efeito.linhas.map((linha) => linha.texto)).toContain(
      'loja_app passa a ser superusuário: pode tudo no servidor, sem depender de nenhuma permissão.',
    );
  });
});
