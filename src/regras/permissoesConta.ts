import type { CodigoPermissao, ContaDTO, ModuloAuditoria, PerfilConta } from '@/modelos/administracao';
import { caminhos } from '@/rotas/caminhos';

export interface DefinicaoPermissao {
  codigo: CodigoPermissao;
  rotulo: string;
  descricao: string;
  requer: CodigoPermissao[];
}

export interface GrupoDePermissoes {
  chave: string;
  titulo: string;
  permissoes: DefinicaoPermissao[];
}

export interface DefinicaoPerfil {
  perfil: PerfilConta;
  rotulo: string;
  descricao: string;
  permissoes: CodigoPermissao[];
}

export const gruposDePermissoes: GrupoDePermissoes[] = [
  {
    chave: 'analise',
    titulo: 'Dashboard e relatórios',
    permissoes: [
      {
        codigo: 'DASHBOARD_VER',
        rotulo: 'Ver o dashboard',
        descricao: 'Indicadores, atividade e as consultas que mais pesam.',
        requer: [],
      },
      {
        codigo: 'RELATORIOS_VER',
        rotulo: 'Ver os relatórios',
        descricao: 'Resumo, Exportação e Comparação de períodos fechados.',
        requer: [],
      },
    ],
  },
  {
    chave: 'consultas',
    titulo: 'Consultas SQL',
    permissoes: [
      {
        codigo: 'CONSULTAS_VER',
        rotulo: 'Ver as consultas',
        descricao: 'Todas, Histórico e Planos de execução, com o texto do SQL.',
        requer: [],
      },
    ],
  },
  {
    chave: 'objetos',
    titulo: 'Objetos do banco',
    permissoes: [
      {
        codigo: 'OBJETOS_VER',
        rotulo: 'Ver os objetos',
        descricao: 'Views, Índices, Tabelas e Funções, com as definições.',
        requer: [],
      },
    ],
  },
  {
    chave: 'banco',
    titulo: 'Usuários e permissões do banco',
    permissoes: [
      {
        codigo: 'BANCO_ACESSOS_VER',
        rotulo: 'Ver papéis, sessões e permissões',
        descricao: 'Papéis, Sessões, Permissões e Alterações do banco conectado.',
        requer: [],
      },
      {
        codigo: 'BANCO_PAPEIS_ALTERAR',
        rotulo: 'Alterar papéis do banco',
        descricao: 'Criar, editar e excluir papéis, trocar senhas e mudar participações em grupos.',
        requer: ['BANCO_ACESSOS_VER'],
      },
      {
        codigo: 'BANCO_PERMISSOES_ALTERAR',
        rotulo: 'Conceder e revogar no banco',
        descricao: 'GRANT, REVOKE e privilégios padrão nos objetos do banco conectado.',
        requer: ['BANCO_ACESSOS_VER'],
      },
    ],
  },
  {
    chave: 'conexoes',
    titulo: 'Conexões',
    permissoes: [
      {
        codigo: 'CONEXOES_USAR',
        rotulo: 'Conectar a bancos',
        descricao: 'Testar, conectar, renomear e excluir as conexões salvas da própria conta.',
        requer: [],
      },
    ],
  },
  {
    chave: 'backup',
    titulo: 'Backup',
    permissoes: [
      {
        codigo: 'BACKUP_GERENCIAR',
        rotulo: 'Gerenciar backups',
        descricao: 'Fazer backups para o próprio computador, criar lembretes e ver o histórico.',
        requer: ['CONEXOES_USAR'],
      },
    ],
  },
  {
    chave: 'administracao',
    titulo: 'Administração',
    permissoes: [
      {
        codigo: 'ADMIN_USUARIOS',
        rotulo: 'Gerenciar usuários',
        descricao: 'Criar, editar, desativar e excluir contas e mudar perfis e permissões.',
        requer: [],
      },
      {
        codigo: 'ADMIN_AUDITORIA',
        rotulo: 'Ver a auditoria',
        descricao: 'O histórico de acessos e operações de todas as contas.',
        requer: [],
      },
    ],
  },
];

export const definicoesDePermissao: DefinicaoPermissao[] = gruposDePermissoes.flatMap((grupo) => grupo.permissoes);

export const CATALOGO_DE_PERMISSOES: CodigoPermissao[] = definicoesDePermissao.map((definicao) => definicao.codigo);

export const perfis: DefinicaoPerfil[] = [
  {
    perfil: 'LEITOR',
    rotulo: 'Leitor',
    descricao: 'Acompanha o dashboard e os relatórios dos bancos que conecta.',
    permissoes: ['DASHBOARD_VER', 'RELATORIOS_VER', 'CONEXOES_USAR'],
  },
  {
    perfil: 'ANALISTA',
    rotulo: 'Analista',
    descricao: 'Investiga consultas, objetos e acessos do banco, sem alterar nada.',
    permissoes: ['DASHBOARD_VER', 'RELATORIOS_VER', 'CONSULTAS_VER', 'OBJETOS_VER', 'BANCO_ACESSOS_VER', 'CONEXOES_USAR'],
  },
  {
    perfil: 'ADMINISTRADOR',
    rotulo: 'Administrador',
    descricao: 'Tudo o que o Orynt faz, inclusive alterar o banco e administrar as contas.',
    permissoes: [...CATALOGO_DE_PERMISSOES],
  },
];

export const PERFIS: PerfilConta[] = perfis.map((definicao) => definicao.perfil);

export function definicaoDoPerfil(perfil: PerfilConta): DefinicaoPerfil {
  return perfis.find((definicao) => definicao.perfil === perfil) ?? (perfis[0] as DefinicaoPerfil);
}

export function rotuloDoPerfil(perfil: PerfilConta): string {
  return definicaoDoPerfil(perfil).rotulo;
}

export function definicaoDaPermissao(codigo: CodigoPermissao): DefinicaoPermissao {
  return definicoesDePermissao.find((definicao) => definicao.codigo === codigo) ?? (definicoesDePermissao[0] as DefinicaoPermissao);
}

export function rotuloDaPermissao(codigo: CodigoPermissao): string {
  return definicaoDaPermissao(codigo).rotulo;
}

export function ehPerfil(valor: unknown): valor is PerfilConta {
  return PERFIS.some((perfil) => perfil === valor);
}

export function ehCodigoPermissao(valor: unknown): valor is CodigoPermissao {
  return CATALOGO_DE_PERMISSOES.some((codigo) => codigo === valor);
}

export function normalizarPermissoes(lista: readonly unknown[]): CodigoPermissao[] {
  return CATALOGO_DE_PERMISSOES.filter((codigo) => lista.includes(codigo));
}

export function permissoesDoPerfil(perfil: PerfilConta): CodigoPermissao[] {
  return [...definicaoDoPerfil(perfil).permissoes];
}

export function requisitosFaltando(permissoes: readonly CodigoPermissao[]): { codigo: CodigoPermissao; requer: CodigoPermissao }[] {
  return permissoes.flatMap((codigo) =>
    definicaoDaPermissao(codigo)
      .requer.filter((requisito) => !permissoes.includes(requisito))
      .map((requer) => ({ codigo, requer })),
  );
}

export function marcarPermissao(permissoes: readonly CodigoPermissao[], codigo: CodigoPermissao, marcada: boolean): CodigoPermissao[] {
  if (marcada) return normalizarPermissoes([...permissoes, codigo, ...definicaoDaPermissao(codigo).requer]);
  const dependentes = definicoesDePermissao.filter((definicao) => definicao.requer.includes(codigo)).map((definicao) => definicao.codigo);
  return normalizarPermissoes(permissoes.filter((item) => item !== codigo && !dependentes.includes(item)));
}

export function mesmasPermissoes(primeira: readonly CodigoPermissao[], segunda: readonly CodigoPermissao[]): boolean {
  return primeira.length === segunda.length && primeira.every((codigo) => segunda.includes(codigo));
}

export function personalizada(perfil: PerfilConta, permissoes: readonly CodigoPermissao[]): boolean {
  return !mesmasPermissoes(permissoesDoPerfil(perfil), permissoes);
}

export interface DiferencaDePermissoes {
  concedidas: CodigoPermissao[];
  revogadas: CodigoPermissao[];
}

export function diferencaDePermissoes(antes: readonly CodigoPermissao[], depois: readonly CodigoPermissao[]): DiferencaDePermissoes {
  return {
    concedidas: CATALOGO_DE_PERMISSOES.filter((codigo) => depois.includes(codigo) && !antes.includes(codigo)),
    revogadas: CATALOGO_DE_PERMISSOES.filter((codigo) => antes.includes(codigo) && !depois.includes(codigo)),
  };
}

export type OrigemDaPermissao = 'DO_PERFIL' | 'CONCEDIDA_A_PARTE' | 'REVOGADA_DO_PERFIL' | 'FORA_DO_PERFIL';

export function origemDaPermissao(perfil: PerfilConta, permissoes: readonly CodigoPermissao[], codigo: CodigoPermissao): OrigemDaPermissao {
  const doPerfil = permissoesDoPerfil(perfil).includes(codigo);
  const tem = permissoes.includes(codigo);
  if (doPerfil) return tem ? 'DO_PERFIL' : 'REVOGADA_DO_PERFIL';
  return tem ? 'CONCEDIDA_A_PARTE' : 'FORA_DO_PERFIL';
}

export function possui(dono: { permissoes: readonly CodigoPermissao[] } | null | undefined, codigo: CodigoPermissao): boolean {
  return dono?.permissoes.includes(codigo) ?? false;
}

export interface TelaDoOrynt {
  caminho: string;
  rotulo: string;
  modulo: ModuloAuditoria;
  permissao: CodigoPermissao | null;
}

export const telasDoOrynt: TelaDoOrynt[] = [
  { caminho: caminhos.dashboard, rotulo: 'Dashboard', modulo: 'DASHBOARD', permissao: 'DASHBOARD_VER' },
  { caminho: caminhos.relatoriosResumo, rotulo: 'Relatórios › Resumo', modulo: 'RELATORIOS', permissao: 'RELATORIOS_VER' },
  { caminho: caminhos.relatoriosExportacao, rotulo: 'Relatórios › Exportação', modulo: 'RELATORIOS', permissao: 'RELATORIOS_VER' },
  { caminho: caminhos.relatoriosComparacao, rotulo: 'Relatórios › Comparação', modulo: 'RELATORIOS', permissao: 'RELATORIOS_VER' },
  { caminho: caminhos.consultasTodas, rotulo: 'Consultas SQL › Todas', modulo: 'CONSULTAS', permissao: 'CONSULTAS_VER' },
  { caminho: caminhos.consultasHistorico, rotulo: 'Consultas SQL › Histórico', modulo: 'CONSULTAS', permissao: 'CONSULTAS_VER' },
  { caminho: caminhos.consultasPlanos, rotulo: 'Consultas SQL › Planos de execução', modulo: 'CONSULTAS', permissao: 'CONSULTAS_VER' },
  { caminho: caminhos.objetosVisoes, rotulo: 'Objetos do banco › Views', modulo: 'OBJETOS', permissao: 'OBJETOS_VER' },
  { caminho: caminhos.objetosIndices, rotulo: 'Objetos do banco › Índices', modulo: 'OBJETOS', permissao: 'OBJETOS_VER' },
  { caminho: caminhos.objetosTabelas, rotulo: 'Objetos do banco › Tabelas', modulo: 'OBJETOS', permissao: 'OBJETOS_VER' },
  { caminho: caminhos.objetosFuncoes, rotulo: 'Objetos do banco › Funções', modulo: 'OBJETOS', permissao: 'OBJETOS_VER' },
  { caminho: caminhos.usuariosPapeis, rotulo: 'Usuários e permissões › Papéis', modulo: 'BANCO', permissao: 'BANCO_ACESSOS_VER' },
  { caminho: caminhos.usuariosSessoes, rotulo: 'Usuários e permissões › Sessões', modulo: 'BANCO', permissao: 'BANCO_ACESSOS_VER' },
  { caminho: caminhos.usuariosAlteracoes, rotulo: 'Usuários e permissões › Alterações', modulo: 'BANCO', permissao: 'BANCO_ACESSOS_VER' },
  { caminho: caminhos.usuariosPermissoes, rotulo: 'Usuários e permissões › Permissões', modulo: 'BANCO', permissao: 'BANCO_ACESSOS_VER' },
  { caminho: caminhos.backupResumo, rotulo: 'Backup › Resumo', modulo: 'BACKUP', permissao: 'BACKUP_GERENCIAR' },
  { caminho: caminhos.backupHistorico, rotulo: 'Backup › Histórico', modulo: 'BACKUP', permissao: 'BACKUP_GERENCIAR' },
  { caminho: caminhos.backupAgendamentos, rotulo: 'Backup › Agendamentos', modulo: 'BACKUP', permissao: 'BACKUP_GERENCIAR' },
  { caminho: caminhos.administracaoUsuarios, rotulo: 'Administração › Usuários', modulo: 'ADMINISTRACAO', permissao: 'ADMIN_USUARIOS' },
  { caminho: caminhos.administracaoAuditoria, rotulo: 'Administração › Auditoria', modulo: 'ADMINISTRACAO', permissao: 'ADMIN_AUDITORIA' },
  { caminho: caminhos.configuracoes, rotulo: 'Configurações', modulo: 'CONFIGURACOES', permissao: null },
];

export function telaDoCaminho(caminho: string): TelaDoOrynt | null {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;
  return telasDoOrynt.find((tela) => tela.caminho === limpo) ?? null;
}

export function podeAbrirTela(dono: { permissoes: readonly CodigoPermissao[] } | null, caminho: string): boolean {
  const tela = telaDoCaminho(caminho);
  if (!tela) return true;
  return tela.permissao === null || possui(dono, tela.permissao);
}

export function telasPermitidas(dono: { permissoes: readonly CodigoPermissao[] } | null): TelaDoOrynt[] {
  return telasDoOrynt.filter((tela) => tela.permissao === null || possui(dono, tela.permissao));
}

export function destinoInicialDaConta(dono: { permissoes: readonly CodigoPermissao[] } | null): string {
  return telasPermitidas(dono)[0]?.caminho ?? caminhos.configuracoes;
}

export function ehAdministradora(conta: Pick<ContaDTO, 'ativa' | 'permissoes'>): boolean {
  return conta.ativa && conta.permissoes.includes('ADMIN_USUARIOS');
}

export type MudancaDeConta =
  | { tipo: 'DESATIVAR' }
  | { tipo: 'EXCLUIR' }
  | { tipo: 'PERMISSOES'; perfil: PerfilConta; permissoes: CodigoPermissao[] };

type ContaAvaliada = Pick<ContaDTO, 'id' | 'ativa' | 'permissoes' | 'inicial' | 'nome'>;

export type MotivoDaRecusa = 'PROPRIA_CONTA' | 'ULTIMO_ADMINISTRADOR' | 'CONTA_INICIAL' | 'ELEVACAO' | 'REQUISITO';

export interface RecusaDeMudanca {
  motivo: MotivoDaRecusa;
  mensagem: string;
}

function listarRotulos(codigos: CodigoPermissao[]): string {
  const rotulos = codigos.map((codigo) => `“${rotuloDaPermissao(codigo)}”`);
  if (rotulos.length <= 1) return rotulos[0] ?? '';
  return `${rotulos.slice(0, -1).join(', ')} e ${rotulos[rotulos.length - 1] ?? ''}`;
}

export function avaliarMudancaDeConta(
  ator: ContaAvaliada,
  alvo: ContaAvaliada,
  mudanca: MudancaDeConta,
  contas: readonly ContaAvaliada[],
): RecusaDeMudanca | null {
  const propria = ator.id === alvo.id;
  const outrasAdministradoras = contas.filter((conta) => conta.id !== alvo.id && ehAdministradora(conta)).length;
  const ultimaAdministradora = ehAdministradora(alvo) && outrasAdministradoras === 0;

  if (mudanca.tipo === 'DESATIVAR' || mudanca.tipo === 'EXCLUIR') {
    const verbo = mudanca.tipo === 'DESATIVAR' ? 'desativar' : 'excluir';
    if (propria) {
      return { motivo: 'PROPRIA_CONTA', mensagem: `Não dá para ${verbo} a própria conta. Peça a outro administrador.` };
    }
    if (alvo.inicial) {
      return {
        motivo: 'CONTA_INICIAL',
        mensagem: `A conta criada na instalação do Orynt não pode ser ${mudanca.tipo === 'DESATIVAR' ? 'desativada' : 'excluída'}.`,
      };
    }
    if (ultimaAdministradora) {
      return {
        motivo: 'ULTIMO_ADMINISTRADOR',
        mensagem: `${alvo.nome} é a única conta ativa que gerencia usuários. Dê essa permissão a outra conta antes de ${verbo} esta.`,
      };
    }
    return null;
  }

  const faltando = requisitosFaltando(mudanca.permissoes);
  if (faltando.length > 0) {
    const [primeiro] = faltando;
    return {
      motivo: 'REQUISITO',
      mensagem: primeiro
        ? `“${rotuloDaPermissao(primeiro.codigo)}” só vale com “${rotuloDaPermissao(primeiro.requer)}”.`
        : 'Há permissões sem a permissão de que dependem.',
    };
  }

  const tiraAdministracao = alvo.permissoes.includes('ADMIN_USUARIOS') && !mudanca.permissoes.includes('ADMIN_USUARIOS');
  if (tiraAdministracao && propria) {
    return {
      motivo: 'PROPRIA_CONTA',
      mensagem: 'Não dá para tirar de si mesmo “Gerenciar usuários”. Peça a outro administrador.',
    };
  }
  if (tiraAdministracao && ultimaAdministradora) {
    return {
      motivo: 'ULTIMO_ADMINISTRADOR',
      mensagem: `${alvo.nome} é a única conta ativa que gerencia usuários. Dê essa permissão a outra conta antes de tirá-la desta.`,
    };
  }

  const { concedidas } = diferencaDePermissoes(alvo.permissoes, mudanca.permissoes);
  const alemDoAtor = concedidas.filter((codigo) => !ator.permissoes.includes(codigo));
  if (alemDoAtor.length > 0) {
    return {
      motivo: 'ELEVACAO',
      mensagem: `Só se concede o que a própria conta tem: a sua conta não tem ${listarRotulos(alemDoAtor)}.`,
    };
  }
  return null;
}

export function permissoesForaDoAlcance(
  ator: { permissoes: readonly CodigoPermissao[] },
  alvo: { permissoes: readonly CodigoPermissao[] },
): CodigoPermissao[] {
  return CATALOGO_DE_PERMISSOES.filter((codigo) => !ator.permissoes.includes(codigo) && !alvo.permissoes.includes(codigo));
}

const OPERACOES_DE_PAPEL = new Set([
  'CRIAR_PAPEL',
  'ALTERAR_PAPEL',
  'RENOMEAR_PAPEL',
  'DESCREVER_PAPEL',
  'CONFIGURAR_PAPEL',
  'EXCLUIR_PAPEL',
  'CONCEDER_PARTICIPACAO',
  'REVOGAR_PARTICIPACAO',
]);

export function permissoesDasOperacoes(tipos: readonly unknown[]): CodigoPermissao[] {
  const exigidas = new Set<CodigoPermissao>(['BANCO_ACESSOS_VER']);
  for (const tipo of tipos) {
    exigidas.add(typeof tipo === 'string' && OPERACOES_DE_PAPEL.has(tipo) ? 'BANCO_PAPEIS_ALTERAR' : 'BANCO_PERMISSOES_ALTERAR');
  }
  if (tipos.length === 0) exigidas.add('BANCO_PAPEIS_ALTERAR');
  return CATALOGO_DE_PERMISSOES.filter((codigo) => exigidas.has(codigo));
}

export function permissoesQueFaltam(
  dono: { permissoes: readonly CodigoPermissao[] } | null,
  exigidas: readonly CodigoPermissao[],
): CodigoPermissao[] {
  return exigidas.filter((codigo) => !possui(dono, codigo));
}

type ContaParaEdicao = Pick<ContaDTO, 'id' | 'ativa' | 'permissoes' | 'inicial' | 'nome'>;

export function motivoDoBloqueioDaPermissao(
  ator: { id: string; permissoes: readonly CodigoPermissao[] },
  alvo: ContaParaEdicao | null,
  contas: readonly ContaParaEdicao[],
  codigo: CodigoPermissao,
  marcada: boolean,
): string | null {
  const original = alvo?.permissoes.includes(codigo) ?? false;
  if (!marcada && !original && !ator.permissoes.includes(codigo)) {
    return 'A sua conta não tem esta permissão, então não pode concedê-la.';
  }
  if (marcada && codigo === 'ADMIN_USUARIOS' && alvo) {
    if (alvo.id === ator.id) return 'Não dá para tirar de si mesmo. Peça a outro administrador.';
    const outras = contas.filter((conta) => conta.id !== alvo.id && ehAdministradora(conta)).length;
    if (ehAdministradora(alvo) && outras === 0) return 'É a única conta ativa que gerencia usuários.';
  }
  return null;
}

export function permissoesAoTrocarDePerfil(
  ator: { permissoes: readonly CodigoPermissao[] },
  alvo: { permissoes: readonly CodigoPermissao[] } | null,
  perfil: PerfilConta,
): { permissoes: CodigoPermissao[]; foraDoAlcance: CodigoPermissao[] } {
  const doPerfil = permissoesDoPerfil(perfil);
  const alcancaveis = doPerfil.filter((codigo) => ator.permissoes.includes(codigo) || (alvo?.permissoes.includes(codigo) ?? false));
  return {
    permissoes: normalizarPermissoes(alcancaveis),
    foraDoAlcance: doPerfil.filter((codigo) => !alcancaveis.includes(codigo)),
  };
}
