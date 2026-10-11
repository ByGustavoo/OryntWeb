import type { LucideIcon } from 'lucide-react';
import { FileChartColumn, LayoutDashboard, Settings, SquareTerminal, Table2, Users } from 'lucide-react';
import { caminhos } from '@/rotas/caminhos';

export interface ItemNavegacao {
  rotulo: string;
  icone: LucideIcon;
  destino: string;
  planejado?: boolean;
}

export interface SecaoNavegacao {
  titulo?: string;
  itens: ItemNavegacao[];
}

export interface FuncionalidadePlanejada extends ItemNavegacao {
  descricao: string;
  previsto: string[];
}

export const funcionalidadesPlanejadas: FuncionalidadePlanejada[] = [
  {
    rotulo: 'Relatórios',
    icone: FileChartColumn,
    destino: caminhos.relatorios,
    planejado: true,
    descricao: 'Resumos periódicos para acompanhar a evolução do banco e compartilhar com o time.',
    previsto: [
      'Resumo de desempenho por período',
      'Comparação entre períodos',
      'Exportação para compartilhar fora do Orynt',
    ],
  },
  {
    rotulo: 'Consultas SQL',
    icone: SquareTerminal,
    destino: caminhos.consultas,
    planejado: true,
    descricao: 'O lugar para investigar cada consulta: quanto ela custa, com que frequência roda e como o banco a executa.',
    previsto: [
      'Lista completa das consultas, com busca e ordenação',
      'Histórico de tempo e de execuções de cada consulta',
      'Plano de execução para entender onde o tempo é gasto',
    ],
  },
  {
    rotulo: 'Objetos do banco',
    icone: Table2,
    destino: caminhos.objetos,
    planejado: true,
    descricao: 'O inventário do que existe no banco e de quanto espaço cada coisa ocupa.',
    previsto: [
      'Tabelas, índices, visões e funções por esquema',
      'Tamanho em disco e quantidade de linhas',
      'Índices pouco usados e tabelas sem manutenção recente',
    ],
  },
  {
    rotulo: 'Usuários e permissões',
    icone: Users,
    destino: caminhos.usuarios,
    planejado: true,
    descricao: 'Uma visão clara de quem acessa o banco e do que cada pessoa ou serviço pode fazer.',
    previsto: [
      'Papéis e usuários do banco, com os atributos de cada um',
      'Permissões por banco, esquema e tabela',
      'Sessões abertas por usuário',
    ],
  },
];

export const navegacaoPrincipal: SecaoNavegacao[] = [
  {
    itens: [{ rotulo: 'Dashboard', icone: LayoutDashboard, destino: caminhos.dashboard }],
  },
  {
    titulo: 'Em breve',
    itens: funcionalidadesPlanejadas,
  },
];

export const navegacaoRodape: ItemNavegacao = {
  rotulo: 'Configurações',
  icone: Settings,
  destino: caminhos.configuracoes,
};
