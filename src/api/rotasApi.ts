export const rotasApi = {
  autenticacao: {
    sessao: '/autenticacao/sessao',
    recuperacao: '/autenticacao/recuperacao',
    verificacaoRecuperacao: '/autenticacao/recuperacao/verificacao',
    novaSenha: '/autenticacao/recuperacao/senha',
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
  relatorios: {
    resumo: '/relatorios/resumo',
  },
  sistema: {
    versao: '/sistema/versao',
  },
} as const;
