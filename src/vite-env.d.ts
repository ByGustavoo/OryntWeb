/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FONTE_DADOS?: 'simulada' | 'api';
  readonly VITE_URL_API?: string;
  readonly VITE_VERSAO_PACOTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ConfiguracaoExecucaoOrynt {
  readonly urlApi?: string;
  readonly versao?: string;
  readonly dataLancamento?: string;
}

interface Window {
  __ORYNT_CONFIG__?: ConfiguracaoExecucaoOrynt;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
