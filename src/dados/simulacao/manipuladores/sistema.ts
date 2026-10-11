import type { RespostaTransporte } from '@/api/transporte';
import type { VersaoSistemaDTO } from '@/modelos/comum';
import { ok } from '../resposta';

const VERSAO_SIMULADA: VersaoSistemaDTO = { versao: 'Simulada', dataLancamento: null };

export function buscarVersao(): RespostaTransporte {
  return ok(VERSAO_SIMULADA);
}
