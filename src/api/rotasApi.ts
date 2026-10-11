export const rotasApi = {
  autenticacao: {
    sessao: '/autenticacao/sessao',
  },
  conexoes: {
    lista: '/conexoes',
    teste: '/conexoes/teste',
    atual: '/conexoes/atual',
    salva: (id: string) => `/conexoes/${id}`,
    ativacao: (id: string) => `/conexoes/${id}/ativacao`,
  },
  dashboard: {
    indicadores: '/dashboard/indicadores',
    atividade: '/dashboard/atividade',
    consultas: '/dashboard/consultas',
  },
  sistema: {
    versao: '/sistema/versao',
  },
} as const;
