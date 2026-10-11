export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ValorConsulta = string | number | boolean | null | undefined | (string | number)[];

export interface RequisicaoTransporte {
  metodo: MetodoHttp;
  caminho: string;
  consulta: Record<string, ValorConsulta>;
  corpo?: unknown;
  cabecalhos: Record<string, string>;
  signal: AbortSignal;
}

export interface RespostaTransporte {
  status: number;
  corpo: unknown;
}

export type Transporte = (requisicao: RequisicaoTransporte) => Promise<RespostaTransporte>;
