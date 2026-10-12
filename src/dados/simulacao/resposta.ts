import type { RespostaTransporte } from '@/api/transporte';
import type { ErroCampoDTO, ErrorResponseDTO } from '@/modelos/comum';

export const TIPOS_PROBLEMA_SIMULADOS = {
  validacao: '/problems/validation-error',
  naoAutorizado: '/problems/unauthorized',
  rotaInexistente: '/problems/resource-not-found',
  indisponivel: '/problems/service-unavailable',
} as const;

export function ok(corpo: unknown): RespostaTransporte {
  return { status: 200, corpo };
}

export function criado(corpo: unknown): RespostaTransporte {
  return { status: 201, corpo };
}

export function aceito(): RespostaTransporte {
  return { status: 202, corpo: undefined };
}

export function semConteudo(): RespostaTransporte {
  return { status: 204, corpo: undefined };
}

export function problema(status: number, titulo: string, tipo: string, detalhe: string, erros?: ErroCampoDTO[]): RespostaTransporte {
  const corpo: ErrorResponseDTO = { status, title: titulo, instance: '', type: tipo, detail: detalhe };
  if (erros && erros.length > 0) corpo.errors = erros;
  return { status, corpo };
}

export function dadosInvalidos(erros: ErroCampoDTO[]): RespostaTransporte {
  return problema(400, 'Erro de Validação!', TIPOS_PROBLEMA_SIMULADOS.validacao, 'Revise os campos destacados e tente de novo.', erros);
}

export function naoAutorizado(): RespostaTransporte {
  return problema(401, 'Sem conexão ativa!', TIPOS_PROBLEMA_SIMULADOS.naoAutorizado, 'Não há uma conexão ativa nesta sessão.');
}

export function rotaInexistente(detalhe: string): RespostaTransporte {
  return problema(404, 'Recurso não encontrado!', TIPOS_PROBLEMA_SIMULADOS.rotaInexistente, detalhe);
}

export function servicoIndisponivel(detalhe: string): RespostaTransporte {
  return problema(503, 'Serviço Indisponível!', TIPOS_PROBLEMA_SIMULADOS.indisponivel, detalhe);
}
