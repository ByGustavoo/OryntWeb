import type { ErroCampoDTO, ErrorResponseDTO } from '@/modelos/comum';

export type TipoErroApi =
  | 'REDE'
  | 'TEMPO_ESGOTADO'
  | 'VALIDACAO'
  | 'NAO_AUTORIZADO'
  | 'PROIBIDO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'LIMITE_EXCEDIDO'
  | 'SERVIDOR'
  | 'CANCELADO';

export class ErroApi extends Error {
  readonly tipo: TipoErroApi;
  readonly status: number;
  readonly resposta: ErrorResponseDTO | null;

  constructor(tipo: TipoErroApi, mensagem: string, status = 0, resposta: ErrorResponseDTO | null = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.status = status;
    this.resposta = resposta;
  }

  get errosCampos(): ErroCampoDTO[] {
    return this.resposta?.errors ?? [];
  }
}

export function ehCancelamento(erro: unknown): boolean {
  return (
    (erro instanceof ErroApi && erro.tipo === 'CANCELADO') ||
    (erro instanceof DOMException && erro.name === 'AbortError')
  );
}

export function tipoPorStatus(status: number): TipoErroApi {
  if (status === 400 || status === 422) return 'VALIDACAO';
  if (status === 401) return 'NAO_AUTORIZADO';
  if (status === 403) return 'PROIBIDO';
  if (status === 404) return 'NAO_ENCONTRADO';
  if (status === 409) return 'CONFLITO';
  if (status === 429) return 'LIMITE_EXCEDIDO';
  return 'SERVIDOR';
}
