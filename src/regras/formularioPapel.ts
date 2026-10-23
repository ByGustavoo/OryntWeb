import type { AtributosDoPapelDTO, OperacaoDTO, TipoTodosDoEsquema } from '@/modelos/alteracoes';
import type { PapelDTO, TipoPapel } from '@/modelos/papeis';
import type { ListaPermissoesDTO, ObjetoComPermissoesDTO, Privilegio, TipoPrivilegioPadrao } from '@/modelos/permissoes';
import { dataDaValidade } from './aplicacaoAlteracoes';
import { descreverConfiguracao } from './funcoes';
import { lerNomeDoPapel, papelDoSistema } from './papeis';
import { PUBLICO, referenciaDoObjeto } from './permissoes';
import { validarNovaSenha } from './recuperacaoSenha';

export type ModeloDePapel = 'EM_BRANCO' | 'GRUPO_DE_LEITURA' | 'APLICACAO' | 'LEITURA';

export const modelosDePapel: ModeloDePapel[] = ['EM_BRANCO', 'GRUPO_DE_LEITURA', 'APLICACAO', 'LEITURA'];

export const rotuloModeloDePapel: Record<ModeloDePapel, string> = {
  EM_BRANCO: 'Em branco',
  GRUPO_DE_LEITURA: 'Grupo de leitura',
  APLICACAO: 'Usuário de aplicação',
  LEITURA: 'Leitura de um esquema',
};

export const descricaoModeloDePapel: Record<ModeloDePapel, string> = {
  EM_BRANCO: 'Você escolhe o tipo, os atributos e as participações.',
  GRUPO_DE_LEITURA: 'Grupo sem login que lê um esquema inteiro, para dar a leitura a vários usuários de uma vez.',
  APLICACAO: 'Usuário que lê e grava nas tabelas de um esquema, com limite de conexões e de tempo.',
  LEITURA: 'Usuário que só lê as tabelas e views de um esquema, inclusive as criadas depois.',
};

export type AtributoDoFormulario = Exclude<keyof AtributosDoPapelDTO, 'login'>;

export const atributosDoFormulario: AtributoDoFormulario[] = [
  'superusuario',
  'criaBancos',
  'criaPapeis',
  'replicacao',
  'ignoraRls',
  'herda',
];

export const rotuloAtributoDoFormulario: Record<AtributoDoFormulario, string> = {
  superusuario: 'Superusuário',
  criaBancos: 'Cria bancos',
  criaPapeis: 'Cria papéis',
  replicacao: 'Replicação',
  ignoraRls: 'Ignora RLS',
  herda: 'Herda as permissões dos grupos',
};

export const palavraAtributoDoFormulario: Record<AtributoDoFormulario, string> = {
  superusuario: 'SUPERUSER',
  criaBancos: 'CREATEDB',
  criaPapeis: 'CREATEROLE',
  replicacao: 'REPLICATION',
  ignoraRls: 'BYPASSRLS',
  herda: 'INHERIT',
};

export interface ParticipacaoNoFormulario {
  papel: string;
  herda: boolean;
  assume: boolean;
  administra: boolean;
}

export interface ConfiguracaoNoFormulario {
  chave: string;
  parametro: string;
  valor: string;
}

export interface CamposPapel {
  modelo: ModeloDePapel;
  tipo: TipoPapel;
  nome: string;
  descricao: string;
  esquema: string | null;
  definirSenha: boolean;
  senha: string;
  validade: string;
  limite: string;
  atributos: Record<AtributoDoFormulario, boolean>;
  participacoes: ParticipacaoNoFormulario[];
  membros: string[];
  configuracoes: ConfiguracaoNoFormulario[];
}

export type ErrosPapel = Partial<Record<string, string>>;

export const LIMITE_MAXIMO_DE_CONEXOES = 10_000;

const BYTES_DO_NOME = 63;
const NOMES_RESERVADOS = new Set(['public', 'none', 'current_user', 'current_role', 'session_user', 'user']);
const PARAMETRO_VALIDO = /^[a-z_][a-z0-9_.]*$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const CODIFICADOR = new TextEncoder();

let proximaChave = 0;

function chaveNova(): string {
  proximaChave += 1;
  return `configuracao-${proximaChave}`;
}

const atributosPadrao: Record<AtributoDoFormulario, boolean> = {
  superusuario: false,
  criaBancos: false,
  criaPapeis: false,
  replicacao: false,
  ignoraRls: false,
  herda: true,
};

const configuracoesDoModelo: Record<ModeloDePapel, [parametro: string, valor: string][]> = {
  EM_BRANCO: [],
  GRUPO_DE_LEITURA: [],
  APLICACAO: [
    ['statement_timeout', '30s'],
    ['idle_in_transaction_session_timeout', '5min'],
  ],
  LEITURA: [['statement_timeout', '5min']],
};

const limiteDoModelo: Record<ModeloDePapel, string> = {
  EM_BRANCO: '',
  GRUPO_DE_LEITURA: '',
  APLICACAO: '20',
  LEITURA: '5',
};

export function tipoDoModelo(modelo: ModeloDePapel): TipoPapel | null {
  if (modelo === 'EM_BRANCO') return null;
  return modelo === 'GRUPO_DE_LEITURA' ? 'GRUPO' : 'USUARIO';
}

export function modeloComEsquema(modelo: ModeloDePapel): boolean {
  return modelo !== 'EM_BRANCO';
}

export function configuracaoNova(parametro = '', valor = ''): ConfiguracaoNoFormulario {
  return { chave: chaveNova(), parametro, valor };
}

export function camposDoModelo(modelo: ModeloDePapel, atuais: CamposPapel | null, esquemaPadrao: string | null): CamposPapel {
  return {
    modelo,
    tipo: tipoDoModelo(modelo) ?? atuais?.tipo ?? 'USUARIO',
    nome: atuais?.nome ?? '',
    descricao: atuais?.descricao ?? '',
    esquema: modeloComEsquema(modelo) ? (atuais?.esquema ?? esquemaPadrao) : null,
    definirSenha: true,
    senha: atuais?.senha ?? '',
    validade: atuais?.validade ?? '',
    limite: limiteDoModelo[modelo],
    atributos: { ...atributosPadrao },
    participacoes: modelo === 'EM_BRANCO' ? (atuais?.participacoes ?? []) : [],
    membros: atuais?.membros ?? [],
    configuracoes: configuracoesDoModelo[modelo].map(([parametro, valor]) => configuracaoNova(parametro, valor)),
  };
}

export function camposDoPapel(papel: PapelDTO): CamposPapel {
  return {
    modelo: 'EM_BRANCO',
    tipo: papel.login ? 'USUARIO' : 'GRUPO',
    nome: papel.nome,
    descricao: papel.descricao ?? '',
    esquema: null,
    definirSenha: false,
    senha: '',
    validade: papel.validadeSenha === null ? '' : dataDaValidade(papel.validadeSenha),
    limite: papel.limiteConexoes === null ? '' : String(papel.limiteConexoes),
    atributos: {
      superusuario: papel.superusuario,
      criaBancos: papel.criaBancos,
      criaPapeis: papel.criaPapeis,
      replicacao: papel.replicacao,
      ignoraRls: papel.ignoraRls,
      herda: papel.herda,
    },
    participacoes: papel.membroDe.map((item) => ({ ...item })),
    membros: papel.membros.map((item) => item.papel),
    configuracoes: papel.configuracoes.map((configuracao) => {
      const { parametro, valor } = descreverConfiguracao(configuracao);
      return configuracaoNova(parametro, valor);
    }),
  };
}

export function hojeComoData(agora: Date = new Date()): string {
  return dataDaValidade(agora.toISOString());
}

export function validarNomeDoPapel(nome: string, papeis: { nome: string }[], original: string | null): string | undefined {
  const limpo = nome.trim();
  if (!limpo) return 'Informe o nome do papel.';
  if (CODIFICADOR.encode(limpo).length > BYTES_DO_NOME) return `Use até ${BYTES_DO_NOME} caracteres: o PostgreSQL corta o resto.`;
  if (papelDoSistema(limpo)) return 'Nomes que começam por pg_ são reservados aos papéis do PostgreSQL.';
  if (NOMES_RESERVADOS.has(limpo.toLowerCase())) return `“${limpo}” é uma palavra reservada do PostgreSQL. Escolha outro nome.`;
  if (!lerNomeDoPapel(limpo)) {
    return 'Use letras sem acento, números, _, $, ponto ou hífen, começando por uma letra ou _.';
  }
  if (limpo !== original && papeis.some((papel) => papel.nome === limpo)) return `Já existe um papel chamado ${limpo} neste servidor.`;
  return undefined;
}

export function dicaDoNome(nome: string): string | undefined {
  const limpo = nome.trim();
  if (!limpo || !lerNomeDoPapel(limpo)) return undefined;
  if (/^[a-z_][a-z0-9_$]*$/.test(limpo)) return undefined;
  return 'Com maiúsculas, ponto ou hífen, o nome vai entre aspas em todo comando.';
}

export function validarValidade(validade: string, hoje: string): string | undefined {
  if (!validade) return undefined;
  const partes = DATA.exec(validade);
  if (!partes) return 'Use uma data no formato dia/mês/ano.';
  const [, ano, mes, dia] = partes.map(Number);
  const data = new Date(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
  if (data.getMonth() !== (mes ?? 1) - 1 || data.getDate() !== dia) return 'Essa data não existe.';
  if (validade <= hoje) return 'Escolha uma data a partir de amanhã: com uma data passada, a senha já nasce vencida.';
  return undefined;
}

export function validarLimite(limite: string): string | undefined {
  if (!limite.trim()) return undefined;
  if (!/^\d+$/.test(limite.trim())) return 'Use um número inteiro, ou deixe em branco para não ter limite.';
  if (Number(limite) > LIMITE_MAXIMO_DE_CONEXOES) return 'O limite passa do que um servidor costuma aceitar. Confira o número.';
  return undefined;
}

export function avisoDoLimite(limite: string): string | undefined {
  return limite.trim() === '0' ? 'Com 0, ninguém abre uma conexão nova com este papel.' : undefined;
}

export function validarConfiguracoes(configuracoes: ConfiguracaoNoFormulario[]): ErrosPapel {
  const erros: ErrosPapel = {};
  const vistos = new Set<string>();
  for (const configuracao of configuracoes) {
    const parametro = configuracao.parametro.trim();
    if (!parametro && !configuracao.valor.trim()) continue;
    if (!PARAMETRO_VALIDO.test(parametro)) erros[`${configuracao.chave}-parametro`] = 'Use o nome do parâmetro, como statement_timeout.';
    else if (vistos.has(parametro)) erros[`${configuracao.chave}-parametro`] = 'Esse parâmetro já está na lista.';
    if (!configuracao.valor.trim()) erros[`${configuracao.chave}-valor`] = 'Informe o valor.';
    vistos.add(parametro);
  }
  return erros;
}

export interface ContextoDoFormularioPapel {
  papeis: { nome: string }[];
  original: PapelDTO | null;
  hoje: string;
}

export function validarCamposPapel(campos: CamposPapel, contexto: ContextoDoFormularioPapel): ErrosPapel {
  const erros: ErrosPapel = { ...validarConfiguracoes(campos.configuracoes) };
  const nome = validarNomeDoPapel(campos.nome, contexto.papeis, contexto.original?.nome ?? null);
  if (nome) erros.nome = nome;
  if (campos.tipo === 'USUARIO') {
    if (campos.definirSenha && campos.senha) {
      const senha = validarNovaSenha(campos.senha);
      if (senha) erros.senha = senha;
    }
    if (campos.definirSenha && contexto.original && !campos.senha) erros.senha = 'Digite a nova senha.';
    const validade = validarValidade(campos.validade, contexto.hoje);
    if (validade && campos.validade !== (contexto.original?.validadeSenha ? dataDaValidade(contexto.original.validadeSenha) : '')) {
      erros.validade = validade;
    }
    const limite = validarLimite(campos.limite);
    if (limite) erros.limite = limite;
  }
  if (modeloComEsquema(campos.modelo) && !campos.esquema) erros.esquema = 'Escolha o esquema.';
  return erros;
}

export function ordemDosCamposPapel(campos: CamposPapel): string[] {
  return [
    'nome',
    'esquema',
    'senha',
    'validade',
    'limite',
    ...campos.configuracoes.flatMap((configuracao) => [`${configuracao.chave}-parametro`, `${configuracao.chave}-valor`]),
  ];
}

function atributosDoCampo(campos: CamposPapel): AtributosDoPapelDTO {
  return { login: campos.tipo === 'USUARIO', ...campos.atributos };
}

function configuracoesValidas(campos: CamposPapel): [string, string][] {
  return campos.configuracoes
    .map((configuracao): [string, string] => [configuracao.parametro.trim(), configuracao.valor.trim()])
    .filter(([parametro, valor]) => parametro && valor);
}

function relacoesDoEsquema(permissoes: ListaPermissoesDTO, esquema: string): ObjetoComPermissoesDTO[] {
  return permissoes.objetos.filter(
    (objeto) => objeto.esquema === esquema && ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA', 'SEQUENCIA'].includes(objeto.tipo),
  );
}

export function criadoresDoEsquema(permissoes: ListaPermissoesDTO, esquema: string): string[] {
  const donos = [...new Set(relacoesDoEsquema(permissoes, esquema).map((objeto) => objeto.dono))].sort();
  if (donos.length > 0) return donos;
  const doEsquema = permissoes.objetos.find((objeto) => objeto.tipo === 'ESQUEMA' && objeto.nome === esquema);
  return doEsquema ? [doEsquema.dono] : [];
}

function todos(esquema: string, tipoDeObjeto: TipoTodosDoEsquema, papel: string, privilegios: Privilegio[]): OperacaoDTO {
  return {
    tipo: 'CONCEDER',
    alvo: { tipo: 'TODOS_DO_ESQUEMA', esquema, tipoDeObjeto },
    beneficiario: papel,
    privilegios,
    colunas: null,
    repassavel: false,
  };
}

function padrao(criador: string, esquema: string, tipoDeObjeto: TipoPrivilegioPadrao, papel: string, privilegios: Privilegio[]): OperacaoDTO {
  return { tipo: 'PRIVILEGIO_PADRAO', acao: 'CONCEDER', criador, esquema, tipoDeObjeto, beneficiario: papel, privilegios };
}

export function operacoesDoModelo(modelo: ModeloDePapel, papel: string, esquema: string, permissoes: ListaPermissoesDTO): OperacaoDTO[] {
  if (modelo === 'EM_BRANCO') return [];
  const banco = permissoes.objetos.find((objeto) => objeto.tipo === 'BANCO');
  const objetoDoEsquema = permissoes.objetos.find((objeto) => objeto.tipo === 'ESQUEMA' && objeto.nome === esquema);
  const criadores = criadoresDoEsquema(permissoes, esquema).filter((criador) => criador !== papel);
  const temSequencias = permissoes.objetos.some((objeto) => objeto.esquema === esquema && objeto.tipo === 'SEQUENCIA');
  const conceder = (objeto: ObjetoComPermissoesDTO | undefined, privilegios: Privilegio[]): OperacaoDTO[] =>
    objeto
      ? [{ tipo: 'CONCEDER', alvo: { tipo: 'OBJETO', objeto: referenciaDoObjeto(objeto) }, beneficiario: papel, privilegios, colunas: null, repassavel: false }]
      : [];

  const base = [...conceder(banco, ['CONNECT']), ...conceder(objetoDoEsquema, ['USAGE'])];
  if (modelo === 'APLICACAO') {
    const escrita: Privilegio[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    return [
      ...base,
      todos(esquema, 'TABELAS', papel, escrita),
      ...(temSequencias ? [todos(esquema, 'SEQUENCIAS', papel, ['USAGE', 'SELECT'])] : []),
      ...criadores.flatMap((criador) => [
        padrao(criador, esquema, 'TABELAS', papel, escrita),
        padrao(criador, esquema, 'SEQUENCIAS', papel, ['USAGE', 'SELECT']),
      ]),
    ];
  }
  return [
    ...base,
    todos(esquema, 'TABELAS', papel, ['SELECT']),
    ...criadores.map((criador) => padrao(criador, esquema, 'TABELAS', papel, ['SELECT'])),
  ];
}

export interface EntradaDasOperacoesPapel {
  campos: CamposPapel;
  original: PapelDTO | null;
  permissoes: ListaPermissoesDTO | null;
  verificador: string | null;
}

function operacoesDeCriacao({ campos, permissoes, verificador }: EntradaDasOperacoesPapel): OperacaoDTO[] {
  const nome = campos.nome.trim();
  const usuario = campos.tipo === 'USUARIO';
  const operacoes: OperacaoDTO[] = [
    {
      tipo: 'CRIAR_PAPEL',
      papel: nome,
      atributos: atributosDoCampo(campos),
      limiteConexoes: usuario && campos.limite.trim() ? Number(campos.limite) : null,
      validadeSenha: usuario && campos.validade ? campos.validade : null,
      senha: usuario && verificador ? { tipo: 'VERIFICADOR', valor: verificador } : null,
    },
  ];
  if (campos.descricao.trim()) operacoes.push({ tipo: 'DESCREVER_PAPEL', papel: nome, descricao: campos.descricao.trim() });
  for (const [parametro, valor] of configuracoesValidas(campos)) operacoes.push({ tipo: 'CONFIGURAR_PAPEL', papel: nome, parametro, valor });
  for (const participacao of campos.participacoes) {
    operacoes.push({ tipo: 'CONCEDER_PARTICIPACAO', grupo: participacao.papel, membro: nome, ...participacaoSemPapel(participacao) });
  }
  if (!usuario) {
    for (const membro of campos.membros) {
      operacoes.push({ tipo: 'CONCEDER_PARTICIPACAO', grupo: nome, membro, herda: true, assume: true, administra: false });
    }
  }
  if (permissoes && campos.esquema && modeloComEsquema(campos.modelo)) {
    operacoes.push(...operacoesDoModelo(campos.modelo, nome, campos.esquema, permissoes));
  }
  return operacoes;
}

function participacaoSemPapel(participacao: ParticipacaoNoFormulario): { herda: boolean; assume: boolean; administra: boolean } {
  return { herda: participacao.herda, assume: participacao.assume, administra: participacao.administra };
}

function operacoesDeEdicao({ campos, original, verificador }: EntradaDasOperacoesPapel & { original: PapelDTO }): OperacaoDTO[] {
  const operacoes: OperacaoDTO[] = [];
  const nome = original.nome;
  const usuario = campos.tipo === 'USUARIO';
  const atributos: Partial<AtributosDoPapelDTO> = {};
  if (usuario !== original.login) atributos.login = usuario;
  for (const atributo of atributosDoFormulario) {
    if (campos.atributos[atributo] !== original[atributo]) atributos[atributo] = campos.atributos[atributo];
  }
  const alteracao: Extract<OperacaoDTO, { tipo: 'ALTERAR_PAPEL' }> = { tipo: 'ALTERAR_PAPEL', papel: nome, atributos };
  if (usuario) {
    const limite = campos.limite.trim() ? Number(campos.limite) : null;
    if (limite !== original.limiteConexoes) alteracao.limiteConexoes = limite;
    const validadeAtual = original.validadeSenha === null ? null : dataDaValidade(original.validadeSenha);
    const validade = campos.validade || null;
    if (validade !== validadeAtual) alteracao.validadeSenha = validade;
    if (campos.definirSenha && verificador) alteracao.senha = { tipo: 'VERIFICADOR', valor: verificador };
  }
  if (Object.keys(atributos).length > 0 || alteracao.limiteConexoes !== undefined || alteracao.validadeSenha !== undefined || alteracao.senha) {
    operacoes.push(alteracao);
  }

  const descricao = campos.descricao.trim() || null;
  if (descricao !== original.descricao) operacoes.push({ tipo: 'DESCREVER_PAPEL', papel: nome, descricao });

  const atuais = new Map(original.configuracoes.map((configuracao) => {
    const { parametro, valor } = descreverConfiguracao(configuracao);
    return [parametro, valor] as const;
  }));
  const novas = new Map(configuracoesValidas(campos));
  for (const [parametro, valor] of novas) {
    if (atuais.get(parametro) !== valor) operacoes.push({ tipo: 'CONFIGURAR_PAPEL', papel: nome, parametro, valor });
  }
  for (const parametro of atuais.keys()) {
    if (!novas.has(parametro)) operacoes.push({ tipo: 'CONFIGURAR_PAPEL', papel: nome, parametro, valor: null });
  }

  const novoNome = campos.nome.trim();
  if (novoNome !== nome) operacoes.push({ tipo: 'RENOMEAR_PAPEL', papel: nome, novoNome });
  return operacoes;
}

export function operacoesDoFormularioPapel(entrada: EntradaDasOperacoesPapel): OperacaoDTO[] {
  return entrada.original ? operacoesDeEdicao({ ...entrada, original: entrada.original }) : operacoesDeCriacao(entrada);
}

export function gruposDisponiveis(papeis: PapelDTO[], nome: string | null): PapelDTO[] {
  return papeis.filter((papel) => !papel.login && papel.nome !== nome);
}

export function usuariosDisponiveis(papeis: PapelDTO[], nome: string | null): PapelDTO[] {
  return papeis.filter((papel) => papel.login && papel.nome !== nome);
}

export interface CamposParticipacao {
  grupo: string | null;
  membro: string | null;
  herda: boolean;
  assume: boolean;
  administra: boolean;
}

function participaDe(papeis: PapelDTO[], origem: string, alvo: string): boolean {
  const porNome = new Map(papeis.map((papel) => [papel.nome, papel]));
  const visitados = new Set<string>();
  const fila = [origem];
  for (let atual = fila.shift(); atual !== undefined; atual = fila.shift()) {
    if (atual === alvo) return true;
    if (visitados.has(atual)) continue;
    visitados.add(atual);
    fila.push(...(porNome.get(atual)?.membroDe.map((item) => item.papel) ?? []));
  }
  return false;
}

export function validarParticipacao(campos: CamposParticipacao, papeis: PapelDTO[]): ErrosPapel {
  const erros: ErrosPapel = {};
  if (!campos.grupo) erros.grupo = 'Escolha o grupo.';
  if (!campos.membro) erros.membro = 'Escolha o papel que vai participar.';
  if (!campos.grupo || !campos.membro) return erros;
  if (campos.grupo === campos.membro) erros.membro = 'Um papel não participa de si mesmo.';
  else if (papeis.find((papel) => papel.nome === campos.membro)?.membroDe.some((item) => item.papel === campos.grupo)) {
    erros.membro = `${campos.membro} já participa de ${campos.grupo}.`;
  } else if (participaDe(papeis, campos.grupo, campos.membro)) {
    erros.membro = `${campos.grupo} já participa de ${campos.membro}: a participação criaria um ciclo, que o PostgreSQL recusa.`;
  }
  return erros;
}

export function operacoesDaParticipacao(campos: CamposParticipacao): OperacaoDTO[] {
  if (!campos.grupo || !campos.membro) return [];
  return [
    {
      tipo: 'CONCEDER_PARTICIPACAO',
      grupo: campos.grupo,
      membro: campos.membro,
      herda: campos.herda,
      assume: campos.assume,
      administra: campos.administra,
    },
  ];
}

export function beneficiarioValido(nome: string | null, papeis: { nome: string }[]): boolean {
  return nome === PUBLICO || (nome !== null && papeis.some((papel) => papel.nome === nome));
}
