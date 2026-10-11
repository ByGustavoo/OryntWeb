export const rotasApi = {
  autenticacao: {
    sessao: '/autenticacao/sessao',
  },
  conexoes: {
    lista: '/conexoes',
    teste: '/conexoes/teste',
    atual: '/conexoes/atual',
  },
  dashboard: {
    indicadores: '/dashboard/indicadores',
    atividade: '/dashboard/atividade',
    consultas: '/dashboard/consultas',
  },
} as const;
