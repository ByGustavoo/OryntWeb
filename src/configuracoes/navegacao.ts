import type { LucideIcon } from 'lucide-react';
import { FileChartColumn, LayoutDashboard, Settings, SquareTerminal, Table2, Users } from 'lucide-react';
import { caminhos } from '@/rotas/caminhos';

export interface FilhoNavegacao {
  rotulo: string;
  destino: string;
}

export interface ItemNavegacao {
  rotulo: string;
  icone: LucideIcon;
  destino: string;
  planejado?: boolean;
  filhos?: FilhoNavegacao[];
}

export interface SecaoNavegacao {
  titulo?: string;
  itens: ItemNavegacao[];
}

export interface TelaPlanejada extends FilhoNavegacao {
  descricao: string;
}

export interface FuncionalidadePlanejada extends ItemNavegacao {
  descricao: string;
  filhos: TelaPlanejada[];
}

const relatorios: FuncionalidadePlanejada = {
  rotulo: 'Relatórios',
  icone: FileChartColumn,
  destino: caminhos.relatorios,
  planejado: true,
  descricao: 'Resumos periódicos para acompanhar a evolução do banco e compartilhar com o time.',
  filhos: [
    { rotulo: 'Resumo', destino: caminhos.relatoriosResumo, descricao: 'O desempenho do banco em cada período.' },
    {
      rotulo: 'Exportação',
      destino: caminhos.relatoriosExportacao,
      descricao: 'Arquivos para compartilhar fora do Orynt.',
    },
    {
      rotulo: 'Comparação',
      destino: caminhos.relatoriosComparacao,
      descricao: 'Um período ao lado de outro, para ver o que mudou.',
    },
  ],
};

const consultasSql: FuncionalidadePlanejada = {
  rotulo: 'Consultas SQL',
  icone: SquareTerminal,
  destino: caminhos.consultas,
  planejado: true,
  descricao: 'O lugar para investigar cada consulta: quanto ela custa, com que frequência roda e como o banco a executa.',
  filhos: [
    {
      rotulo: 'Todas',
      destino: caminhos.consultasTodas,
      descricao: 'A lista completa das consultas, com busca e ordenação.',
    },
    {
      rotulo: 'Histórico',
      destino: caminhos.consultasHistorico,
      descricao: 'O tempo e as execuções de cada consulta ao longo dos dias.',
    },
    {
      rotulo: 'Planos de execução',
      destino: caminhos.consultasPlanos,
      descricao: 'Como o banco executa a consulta e onde o tempo é gasto.',
    },
  ],
};

const objetosBanco: FuncionalidadePlanejada = {
  rotulo: 'Objetos do banco',
  icone: Table2,
  destino: caminhos.objetos,
  planejado: true,
  descricao: 'O inventário do que existe no banco e de quanto espaço cada coisa ocupa.',
  filhos: [
    {
      rotulo: 'Visões',
      destino: caminhos.objetosVisoes,
      descricao: 'Visões e visões materializadas de cada esquema.',
    },
    {
      rotulo: 'Índices',
      destino: caminhos.objetosIndices,
      descricao: 'O tamanho e o uso de cada índice, com os pouco usados em evidência.',
    },
    {
      rotulo: 'Tabelas',
      destino: caminhos.objetosTabelas,
      descricao: 'Tamanho em disco, quantidade de linhas e manutenção recente.',
    },
    {
      rotulo: 'Funções',
      destino: caminhos.objetosFuncoes,
      descricao: 'Funções e procedimentos de cada esquema.',
    },
  ],
};

const usuariosPermissoes: FuncionalidadePlanejada = {
  rotulo: 'Usuários e permissões',
  icone: Users,
  destino: caminhos.usuarios,
  planejado: true,
  descricao: 'Uma visão clara de quem acessa o banco e do que cada pessoa ou serviço pode fazer.',
  filhos: [
    {
      rotulo: 'Papéis',
      destino: caminhos.usuariosPapeis,
      descricao: 'Papéis e usuários do banco, com os atributos de cada um.',
    },
    { rotulo: 'Sessões', destino: caminhos.usuariosSessoes, descricao: 'As sessões abertas por usuário.' },
    {
      rotulo: 'Permissões',
      destino: caminhos.usuariosPermissoes,
      descricao: 'O que cada papel pode fazer em cada banco, esquema e tabela.',
    },
  ],
};

export const funcionalidadesPlanejadas: FuncionalidadePlanejada[] = [
  relatorios,
  consultasSql,
  objetosBanco,
  usuariosPermissoes,
];

export const navegacaoPrincipal: SecaoNavegacao[] = [
  {
    itens: [{ rotulo: 'Dashboard', icone: LayoutDashboard, destino: caminhos.dashboard }],
  },
  {
    titulo: 'Análise',
    itens: [relatorios, consultasSql],
  },
  {
    titulo: 'Gerenciamento',
    itens: [objetosBanco, usuariosPermissoes],
  },
];

export const navegacaoRodape: ItemNavegacao = {
  rotulo: 'Configurações',
  icone: Settings,
  destino: caminhos.configuracoes,
};

export function destinoInicial(item: ItemNavegacao): string {
  return item.filhos?.[0]?.destino ?? item.destino;
}

export function contemCaminho(item: ItemNavegacao, caminho: string): boolean {
  if (caminho === item.destino) return true;
  return item.filhos?.some((filho) => filho.destino === caminho) ?? false;
}

export function secaoPlanejada(secao: SecaoNavegacao): boolean {
  return secao.itens.every((item) => item.planejado === true);
}
