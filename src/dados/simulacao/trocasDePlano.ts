import type { TrocaDePlanoDTO } from '@/modelos/consultas';

const DIAS_DESDE_O_DEGRAU = 3;
const HORA_DO_DEGRAU = 9;
const SEGUNDOS_ATE_O_REGISTRO = 47;

const consultasComTroca = ['q-pedidos-cliente'];

export function marcoDoDegrau(agora: Date): number {
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - DIAS_DESDE_O_DEGRAU, HORA_DO_DEGRAU).getTime();
}

export function versaoDoPlano(id: string, numero: number): string {
  return `${id}-plano-${numero}`;
}

export function trocasDePlano(id: string, agora: Date): TrocaDePlanoDTO[] {
  if (!consultasComTroca.includes(id)) return [];
  return [
    {
      instante: new Date(marcoDoDegrau(agora) + SEGUNDOS_ATE_O_REGISTRO * 1000).toISOString(),
      versao: versaoDoPlano(id, 2),
      versaoAnterior: versaoDoPlano(id, 1),
    },
  ];
}
