import { ambiente } from '@/configuracoes/ambiente';
import type { ErroCampoDTO, ErrorResponseDTO } from '@/modelos/comum';
import { ErroApi } from './ErroApi';
import type { TipoErroApi } from './ErroApi';

const DESCRICAO_PADRAO: Record<TipoErroApi, string> = {
  REDE: 'Verifique a conexão e tente de novo.',
  TEMPO_ESGOTADO: 'O servidor demorou demais para responder. Tente de novo.',
  SERVIDOR: 'O servidor encontrou um problema. Tente de novo daqui a pouco.',
  VALIDACAO: 'Alguns dados não foram aceitos. Revise e tente de novo.',
  NAO_AUTORIZADO: 'A conexão com o banco foi encerrada. Conecte de novo para continuar.',
  NAO_ENCONTRADO: 'O registro não existe mais. Ele pode ter sido excluído em outra tela.',
  CONFLITO: 'A alteração entra em conflito com dados já salvos.',
  LIMITE_EXCEDIDO: 'Foram muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  CANCELADO: 'A operação foi cancelada.',
};

const TIPOS_COM_DETALHE_PARA_PESSOA: TipoErroApi[] = ['VALIDACAO', 'NAO_ENCONTRADO', 'CONFLITO'];

function textoOuVazio(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function lerErrosCampos(valor: unknown): ErroCampoDTO[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is ErroCampoDTO =>
      Boolean(item) && typeof item === 'object' && typeof item.campo === 'string' && typeof item.mensagem === 'string',
  );
}

export function lerErrorResponse(corpo: unknown, status: number): ErrorResponseDTO | null {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return null;
  const bruto = corpo as Record<string, unknown>;
  if (typeof bruto.title !== 'string' && typeof bruto.detail !== 'string') return null;
  return {
    status: typeof bruto.status === 'number' ? bruto.status : status,
    title: textoOuVazio(bruto.title),
    instance: textoOuVazio(bruto.instance),
    type: textoOuVazio(bruto.type),
    detail: textoOuVazio(bruto.detail),
    errors: lerErrosCampos(bruto.errors),
  };
}

export function ehErroApi(erro: unknown, ...tipos: TipoErroApi[]): erro is ErroApi {
  return erro instanceof ErroApi && (tipos.length === 0 || tipos.includes(erro.tipo));
}

export function errosDeCampo<Campo extends string>(erro: unknown): Partial<Record<Campo, string>> {
  if (!(erro instanceof ErroApi)) return {};
  const erros: Partial<Record<Campo, string>> = {};
  erro.errosCampos.forEach(({ campo, mensagem }) => {
    const ultimoTrecho = campo.slice(campo.lastIndexOf('.') + 1);
    erros[campo as Campo] ??= mensagem;
    erros[ultimoTrecho as Campo] ??= mensagem;
  });
  return erros;
}

export function descreverFalha(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return 'Algo inesperado aconteceu. Tente de novo.';
  const detalhe = erro.resposta?.detail.trim();
  if (detalhe && TIPOS_COM_DETALHE_PARA_PESSOA.includes(erro.tipo)) return detalhe;
  return DESCRICAO_PADRAO[erro.tipo];
}

export function registrarErro(erro: ErroApi, requisicao: { metodo: string; caminho: string }): void {
  if (erro.tipo === 'CANCELADO' || erro.tipo === 'NAO_AUTORIZADO') return;
  const grave = erro.tipo === 'SERVIDOR' || erro.tipo === 'REDE' || erro.tipo === 'TEMPO_ESGOTADO';
  if (!grave && !ambiente.desenvolvimento) return;
  const registrar = grave ? console.error : console.warn;
  registrar(`[Orynt] ${requisicao.metodo} ${requisicao.caminho} falhou: ${erro.tipo}`, erro.resposta ?? { status: erro.status });
}
