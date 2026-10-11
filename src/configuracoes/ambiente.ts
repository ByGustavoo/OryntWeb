const configuracaoExecucao = typeof window === 'undefined' ? undefined : window.__ORYNT_CONFIG__;

const fonteDados = import.meta.env.VITE_FONTE_DADOS === 'api' ? 'api' : 'simulada';

export const ambiente = {
  fonteDados,
  dadosSimulados: fonteDados === 'simulada',
  urlApi: configuracaoExecucao?.urlApi || import.meta.env.VITE_URL_API || 'http://localhost:8080/api',
  versao: configuracaoExecucao?.versao || import.meta.env.VITE_VERSAO_PACOTE || null,
  dataLancamento: configuracaoExecucao?.dataLancamento || null,
  desenvolvimento: import.meta.env.DEV,
  simulacaoControlavel: import.meta.env.DEV && fonteDados === 'simulada',
} as const;
