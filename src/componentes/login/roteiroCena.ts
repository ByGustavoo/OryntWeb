import type { DesempenhoConsulta } from '@/modelos/dashboard';

export type FaseCena = 'ESTAVEL' | 'PICO' | 'RASTREANDO' | 'ORIGEM';

export interface OrigemCena {
  id: string;
  linhas: string[];
  resumo: string;
  tempoMedioMs: number;
  execucoes: number;
  percentualTempoTotal: number;
}

export interface RegistroCena {
  id: number;
  sql: string;
  duracaoMs: number;
  desempenho: DesempenhoConsulta;
}

export interface PontoCena {
  passo: number;
  tempoMedioMs: number;
}

export interface EstadoCena {
  passo: number;
  fase: FaseCena;
  serie: PontoCena[];
  pico: PontoCena | null;
  tempoMedioMs: number;
  origem: OrigemCena;
  rastreio: number;
  registros: RegistroCena[];
  volume: number[];
  consultasPorSegundo: number;
  conexoesAtivas: number;
  acertoCache: number;
}

export const INTERVALO_CENA_MS = 1000;
export const PASSOS_DO_CICLO = 20;
export const PONTOS_VISIVEIS = 20;
export const PONTOS_DE_FOLGA = 2;
export const PASSO_INICIAL_CENA = 18;
export const LIMITE_ALERTA_MS = 1000;
export const TETO_ESCALA_MS = 2700;
export const LIMITE_CONEXOES = 100;
export const REGISTROS_NA_CENA = 5;
export const BARRAS_DE_VOLUME = 12;

const PASSO_DO_PICO = 13;
const PERFIL_DO_PICO: Record<number, number> = { 12: 0.58, 13: 1, 14: 0.44 };
const FASES_DO_CICLO: { ate: number; fase: FaseCena }[] = [
  { ate: 7, fase: 'ORIGEM' },
  { ate: 11, fase: 'ESTAVEL' },
  { ate: 13, fase: 'PICO' },
  { ate: 15, fase: 'RASTREANDO' },
  { ate: PASSOS_DO_CICLO - 1, fase: 'ORIGEM' },
];
const PASSO_DA_TROCA_DE_ORIGEM = 14;

export const ORIGENS_DA_CENA: OrigemCena[] = [
  {
    id: 'ranking-clientes',
    linhas: ['SELECT c.nome, count(p.id)', 'FROM clientes c', 'JOIN pedidos p ON p.cliente_id = c.id'],
    resumo: 'SELECT c.nome, count(p.id) FROM clientes c JOIN pedidos p',
    tempoMedioMs: 1840,
    execucoes: 212,
    percentualTempoTotal: 62,
  },
  {
    id: 'reservas-expiradas',
    linhas: ['UPDATE estoque e SET reservado = 0', 'FROM pedidos p', 'WHERE p.id = e.pedido_id AND p.expirado'],
    resumo: 'UPDATE estoque e SET reservado = 0 FROM pedidos p',
    tempoMedioMs: 2310,
    execucoes: 38,
    percentualTempoTotal: 48,
  },
  {
    id: 'faturamento-diario',
    linhas: ['SELECT date(criado_em), sum(total)', 'FROM pedidos WHERE status = $1', 'GROUP BY date(criado_em)'],
    resumo: 'SELECT date(criado_em), sum(total) FROM pedidos',
    tempoMedioMs: 1420,
    execucoes: 96,
    percentualTempoTotal: 54,
  },
];

const CONSULTAS_ROTINEIRAS: { sql: string; tempoBaseMs: number }[] = [
  { sql: 'SELECT * FROM sessoes WHERE token = $1', tempoBaseMs: 1.8 },
  { sql: 'INSERT INTO itens_pedido VALUES ($1, $2, $3)', tempoBaseMs: 3.2 },
  { sql: 'UPDATE estoque SET quantidade = quantidade - $1', tempoBaseMs: 6.1 },
  { sql: 'SELECT id, nome, preco FROM produtos WHERE ativo', tempoBaseMs: 12.4 },
  { sql: 'SELECT * FROM pedidos WHERE cliente_id = $1', tempoBaseMs: 184 },
  { sql: 'SELECT count(*) FROM carrinhos WHERE aberto', tempoBaseMs: 42 },
  { sql: 'SELECT id, email FROM usuarios WHERE email = $1', tempoBaseMs: 268 },
  { sql: 'SELECT preco FROM produtos WHERE id = $1', tempoBaseMs: 0.9 },
];

function resto(valor: number, divisor: number): number {
  return ((valor % divisor) + divisor) % divisor;
}

function ruido(passo: number, semente: number): number {
  const onda = Math.sin(passo * 12.9898 + semente * 78.233) * 43758.5453;
  return onda - Math.floor(onda);
}

function posicaoNoCiclo(passo: number): number {
  return resto(passo, PASSOS_DO_CICLO);
}

function origemDoCiclo(ciclo: number): OrigemCena {
  return ORIGENS_DA_CENA[resto(ciclo, ORIGENS_DA_CENA.length)] as OrigemCena;
}

function cicloDoPasso(passo: number): number {
  return Math.floor(passo / PASSOS_DO_CICLO);
}

function classificar(duracaoMs: number): DesempenhoConsulta {
  if (duracaoMs < 100) return 'RAPIDA';
  return duracaoMs < 500 ? 'MODERADA' : 'LENTA';
}

export function faseDoPasso(passo: number): FaseCena {
  const posicao = posicaoNoCiclo(passo);
  return (FASES_DO_CICLO.find((trecho) => posicao <= trecho.ate) as { fase: FaseCena }).fase;
}

export function origemExibidaNoPasso(passo: number): OrigemCena {
  const ciclo = cicloDoPasso(passo);
  return origemDoCiclo(posicaoNoCiclo(passo) >= PASSO_DA_TROCA_DE_ORIGEM ? ciclo : ciclo - 1);
}

export function rastreioDoPasso(passo: number): number {
  return cicloDoPasso(passo - PASSO_DA_TROCA_DE_ORIGEM);
}

export function tempoMedioNoPasso(passo: number): number {
  const intensidade = PERFIL_DO_PICO[posicaoNoCiclo(passo)];
  if (intensidade) return Math.round(origemDoCiclo(cicloDoPasso(passo)).tempoMedioMs * intensidade);
  return Math.round(330 + ruido(passo, 1) * 310);
}

function registroDoPasso(passo: number): RegistroCena {
  if (posicaoNoCiclo(passo) === PASSO_DO_PICO) {
    const origem = origemDoCiclo(cicloDoPasso(passo));
    return { id: passo, sql: origem.resumo, duracaoMs: origem.tempoMedioMs, desempenho: 'LENTA' };
  }
  const indice = Math.floor(ruido(passo, 2) * CONSULTAS_ROTINEIRAS.length);
  const consulta = CONSULTAS_ROTINEIRAS[indice] as { sql: string; tempoBaseMs: number };
  const duracaoMs = Math.round(consulta.tempoBaseMs * (0.82 + ruido(passo, 3) * 0.36) * 10) / 10;
  return { id: passo, sql: consulta.sql, duracaoMs, desempenho: classificar(duracaoMs) };
}

function volumeNoPasso(passo: number): number {
  return Math.round(1180 + ruido(passo, 4) * 260);
}

function conexoesNoPasso(passo: number): number {
  const posicao = posicaoNoCiclo(passo);
  const filaDoPico = posicao >= PASSO_DO_PICO - 1 && posicao <= PASSO_DO_PICO + 2 ? 9 : 0;
  return 22 + Math.round(ruido(passo, 5) * 5) + filaDoPico;
}

function sequencia<T>(quantidade: number, criar: (indice: number) => T): T[] {
  return Array.from({ length: quantidade }, (_, indice) => criar(indice));
}

export function montarCena(passo: number): EstadoCena {
  const totalDePontos = PONTOS_VISIVEIS + PONTOS_DE_FOLGA;
  const primeiroPasso = passo - totalDePontos + 1;
  const serie = sequencia(totalDePontos, (indice) => ({
    passo: primeiroPasso + indice,
    tempoMedioMs: tempoMedioNoPasso(primeiroPasso + indice),
  }));
  const visiveis = serie.slice(PONTOS_DE_FOLGA);
  const maior = visiveis.reduce((atual, ponto) => (ponto.tempoMedioMs > atual.tempoMedioMs ? ponto : atual));

  return {
    passo,
    fase: faseDoPasso(passo),
    serie,
    pico: maior.tempoMedioMs >= LIMITE_ALERTA_MS ? maior : null,
    tempoMedioMs: tempoMedioNoPasso(passo),
    origem: origemExibidaNoPasso(passo),
    rastreio: rastreioDoPasso(passo),
    registros: sequencia(REGISTROS_NA_CENA, (indice) => registroDoPasso(passo - indice)),
    volume: sequencia(BARRAS_DE_VOLUME, (indice) => volumeNoPasso(passo - BARRAS_DE_VOLUME + 1 + indice)),
    consultasPorSegundo: volumeNoPasso(passo),
    conexoesAtivas: conexoesNoPasso(passo),
    acertoCache: Math.round((99.1 + ruido(passo, 6) * 0.6) * 10) / 10,
  };
}
