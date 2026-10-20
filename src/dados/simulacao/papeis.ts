import type { ListaPapeisDTO, MetodoSenha, ObjetoDoPapelDTO, PapelDTO, ParticipacaoDTO } from '@/modelos/papeis';
import { gerarFuncoes } from './funcoes';
import { inicioDaColeta } from './indices';
import { conexoesNoInstante } from './series';
import { gerarTabelas } from './tabelas';
import { gerarVisoes } from './visoes';

type Instante = [dias: number, hora: number, minuto: number];

interface ParticipacaoFicticia {
  papel: string;
  herda?: boolean;
  assume?: boolean;
  administra?: boolean;
}

interface PapelFicticio {
  nome: string;
  descricao: string | null;
  inicial?: boolean;
  login: boolean;
  superusuario?: boolean;
  criaBancos?: boolean;
  criaPapeis?: boolean;
  replicacao?: boolean;
  ignoraRls?: boolean;
  herda?: boolean;
  limiteConexoes?: number;
  validadeEmHoras?: number;
  metodoSenha?: MetodoSenha;
  configuracoes?: string[];
  membroDe?: ParticipacaoFicticia[];
  sessoes?: number;
  ociosasEmTransacao30Dias?: number;
  vistoHa?: Instante | null;
  vistoHaHoras?: number;
  criadoHa?: Instante;
}

export const PAPEL_DO_RESTO_DAS_SESSOES = 'loja_app';

export const LIMITE_OCIOSO_DO_SERVIDOR: string | null = null;

export const papeisFicticios: PapelFicticio[] = [
  {
    nome: 'postgres',
    descricao: 'Superusuário criado na instalação do servidor.',
    inicial: true,
    login: true,
    superusuario: true,
    criaBancos: true,
    criaPapeis: true,
    replicacao: true,
    ignoraRls: true,
    vistoHa: [2, 3, 10],
  },
  {
    nome: 'loja_app',
    descricao: 'Aplicação da loja: a API e o painel administrativo.',
    login: true,
    limiteConexoes: 60,
    configuracoes: ['statement_timeout=30s', 'search_path=public'],
    ociosasEmTransacao30Dias: 1,
  },
  {
    nome: 'loja_analise',
    descricao: 'Painéis e relatórios de vendas.',
    login: true,
    validadeEmHoras: 5 * 24 + 6,
    configuracoes: ['work_mem=64MB'],
    membroDe: [{ papel: 'leitura' }],
    sessoes: 2,
    ociosasEmTransacao30Dias: 9,
  },
  {
    nome: 'relatorio_bi',
    descricao: 'Ferramenta de BI do financeiro.',
    login: true,
    validadeEmHoras: -(12 * 24 + 6),
    configuracoes: ['statement_timeout=5min'],
    membroDe: [{ papel: 'leitura' }],
    vistoHaHoras: 12 * 24 + 8,
  },
  {
    nome: 'auditoria_app',
    descricao: 'Serviço que grava a trilha de auditoria.',
    login: true,
    metodoSenha: 'MD5',
    configuracoes: ['statement_timeout=5s'],
    membroDe: [{ papel: 'loja_auditoria' }],
    sessoes: 1,
  },
  {
    nome: 'migracao',
    descricao: 'Ferramenta de migrações do esquema, usada no deploy.',
    login: true,
    superusuario: true,
    vistoHa: [3, 14, 5],
  },
  {
    nome: 'fila_pedidos',
    descricao: 'Worker que processa a fila de pedidos.',
    login: true,
    limiteConexoes: 5,
    configuracoes: ['statement_timeout=60s'],
    sessoes: 4,
  },
  {
    nome: 'replicador',
    descricao: 'Réplica de leitura do servidor.',
    login: true,
    replicacao: true,
    limiteConexoes: 5,
    sessoes: 1,
  },
  {
    nome: 'suporte_dba',
    descricao: 'Plantão de banco de dados.',
    login: true,
    configuracoes: ['statement_timeout=15min'],
    membroDe: [{ papel: 'loja_admin', herda: false }],
    sessoes: 1,
    vistoHa: [6, 10, 22],
  },
  {
    nome: 'integracao_erp',
    descricao: 'Sincronização das notas fiscais com o ERP.',
    login: true,
    configuracoes: ['statement_timeout=2min'],
    membroDe: [{ papel: 'leitura' }],
    vistoHa: [41, 2, 0],
  },
  {
    nome: 'exportacao_temp',
    descricao: null,
    login: true,
    validadeEmHoras: 86 * 24,
    membroDe: [{ papel: 'leitura' }],
    vistoHa: null,
    criadoHa: [4, 16, 40],
  },
  {
    nome: 'leitura',
    descricao: 'Leitura das tabelas de public e de relatorios.',
    login: false,
  },
  {
    nome: 'loja_admin',
    descricao: 'Administração do banco sem superusuário.',
    login: false,
    criaBancos: true,
    criaPapeis: true,
    membroDe: [{ papel: 'pg_signal_backend' }],
  },
  {
    nome: 'loja_auditoria',
    descricao: 'Dono dos objetos do esquema auditoria.',
    login: false,
  },
  {
    nome: 'relatorios_antigos',
    descricao: 'Grupo dos relatórios do sistema antigo.',
    login: false,
  },
];

function noPassado(agora: Date, [dias, hora, minuto]: Instante): Date {
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dias, hora, minuto);
}

function vistoPorUltimo(papel: PapelFicticio, agora: Date): string | null {
  if (papel.vistoHaHoras !== undefined) return new Date(agora.getTime() - papel.vistoHaHoras * 3_600_000).toISOString();
  return papel.vistoHa ? noPassado(agora, papel.vistoHa).toISOString() : null;
}

function participacao(ficticia: ParticipacaoFicticia, papel: string): ParticipacaoDTO {
  return {
    papel,
    herda: ficticia.herda ?? true,
    assume: ficticia.assume ?? true,
    administra: ficticia.administra ?? false,
  };
}

export function papelDaSessao(nome: string): PapelFicticio {
  return { nome, descricao: null, login: true, vistoHa: null };
}

function objetosPorDono(agora: Date): Map<string, ObjetoDoPapelDTO[]> {
  const porDono = new Map<string, ObjetoDoPapelDTO[]>();
  const juntar = (dono: string, objeto: ObjetoDoPapelDTO) => porDono.set(dono, [...(porDono.get(dono) ?? []), objeto]);

  for (const tabela of gerarTabelas(agora).tabelas) {
    juntar(tabela.dono, { tipo: 'TABELA', id: tabela.id, esquema: tabela.esquema, nome: tabela.nome, funcao: null });
  }
  for (const visao of gerarVisoes(agora).visoes) {
    juntar(visao.dono, {
      tipo: visao.tipo === 'MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO',
      id: visao.id,
      esquema: visao.esquema,
      nome: visao.nome,
      funcao: null,
    });
  }
  for (const funcao of gerarFuncoes(agora).funcoes) {
    juntar(funcao.dono, {
      tipo: funcao.tipo === 'PROCEDIMENTO' ? 'PROCEDIMENTO' : 'FUNCAO',
      id: funcao.id,
      esquema: funcao.esquema,
      nome: `${funcao.nome}(${funcao.argumentos})`,
      funcao: { segurancaDefinidor: funcao.segurancaDefinidor, configuracoes: funcao.configuracoes },
    });
  }

  return porDono;
}

export function sessoesPorPapel(ficticios: PapelFicticio[], papelDaConexao: string, agora: Date): Map<string, number> {
  const sessoes = new Map(ficticios.map((papel) => [papel.nome, papel.sessoes ?? 0]));
  if (papelDaConexao !== PAPEL_DO_RESTO_DAS_SESSOES) sessoes.set(papelDaConexao, (sessoes.get(papelDaConexao) ?? 0) + 1);
  const outras = [...sessoes.entries()]
    .filter(([nome]) => nome !== PAPEL_DO_RESTO_DAS_SESSOES)
    .reduce((soma, [, quantidade]) => soma + quantidade, 0);
  sessoes.set(PAPEL_DO_RESTO_DAS_SESSOES, Math.max(0, conexoesNoInstante(agora) - outras));
  return sessoes;
}

export function gerarPapeis(agora: Date, papelDaConexao: string, vazio = false, comObjetos = true): ListaPapeisDTO {
  const geradoEm = agora.toISOString();
  const coletaDesde = inicioDaColeta(agora).toISOString();
  const limiteOciosoEmTransacao = LIMITE_OCIOSO_DO_SERVIDOR;
  if (vazio) return { geradoEm, coletaDesde, papelDaConexao, limiteOciosoEmTransacao, papeis: [] };

  const ficticios = papeisFicticios.some((papel) => papel.nome === papelDaConexao)
    ? papeisFicticios
    : [...papeisFicticios, papelDaSessao(papelDaConexao)];
  const sessoes = sessoesPorPapel(ficticios, papelDaConexao, agora);
  const objetos = comObjetos ? objetosPorDono(agora) : new Map<string, ObjetoDoPapelDTO[]>();

  const papeis = ficticios.map((papel): PapelDTO => {
    const quantasSessoes = papel.login ? (sessoes.get(papel.nome) ?? 0) : 0;
    const visto = vistoPorUltimo(papel, agora);
    return {
      nome: papel.nome,
      descricao: papel.descricao,
      inicial: papel.inicial ?? false,
      login: papel.login,
      superusuario: papel.superusuario ?? false,
      criaBancos: papel.criaBancos ?? false,
      criaPapeis: papel.criaPapeis ?? false,
      replicacao: papel.replicacao ?? false,
      ignoraRls: papel.ignoraRls ?? false,
      herda: papel.herda ?? true,
      limiteConexoes: papel.limiteConexoes ?? null,
      validadeSenha:
        papel.validadeEmHoras === undefined
          ? null
          : new Date(agora.getTime() + papel.validadeEmHoras * 3_600_000).toISOString(),
      metodoSenha: papel.login ? (papel.metodoSenha ?? 'SCRAM') : null,
      configuracoes: papel.configuracoes ?? [],
      membroDe: (papel.membroDe ?? []).map((item) => participacao(item, item.papel)),
      membros: ficticios.flatMap((membro) =>
        (membro.membroDe ?? []).filter((item) => item.papel === papel.nome).map((item) => participacao(item, membro.nome)),
      ),
      sessoes: quantasSessoes,
      ociosasEmTransacao30Dias: papel.ociosasEmTransacao30Dias ?? 0,
      vistoPorUltimo: quantasSessoes > 0 ? geradoEm : visto,
      observadoDesde: papel.criadoHa ? noPassado(agora, papel.criadoHa).toISOString() : coletaDesde,
      objetos: objetos.get(papel.nome) ?? [],
    };
  });

  return { geradoEm, coletaDesde, papelDaConexao, limiteOciosoEmTransacao, papeis };
}
