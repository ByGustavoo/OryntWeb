import type { OperacaoDTO, OrigemDaAlteracao } from '@/modelos/alteracoes';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO } from '@/modelos/permissoes';
import type { IndiceDasPermissoes } from '@/regras/permissoes';

export interface EstadoDaAlteracao {
  papeis: ListaPapeisDTO;
  permissoes: ListaPermissoesDTO;
  indice: IndiceDasPermissoes;
}

export interface RevisaoPedida {
  operacoes: OperacaoDTO[];
  origem: OrigemDaAlteracao;
}

export interface PropriedadesDoFormulario {
  idFormulario: string;
  estado: EstadoDaAlteracao;
  aoRevisar: (revisao: RevisaoPedida) => void;
  aoOcupar: (ocupado: boolean) => void;
}

export function focarPrimeiroErro(formulario: HTMLFormElement | null, ordem: string[], erros: Partial<Record<string, string>>): void {
  const primeiro = ordem.find((campo) => erros[campo]);
  if (!formulario || !primeiro) return;
  const campo = formulario.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`);
  (campo?.querySelector<HTMLElement>('input, button') ?? campo)?.focus();
}
