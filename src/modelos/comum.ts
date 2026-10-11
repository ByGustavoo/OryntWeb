export interface ErroCampoDTO {
  campo: string;
  mensagem: string;
}

export interface ErrorResponseDTO {
  status: number;
  title: string;
  instance: string;
  type: string;
  detail: string;
  errors?: ErroCampoDTO[] | null;
}

export interface VersaoSistemaDTO {
  versao: string;
  dataLancamento: string | null;
}
