import {
  ESPERA_REENVIO_SEGUNDOS,
  LIMITE_TENTATIVAS_CODIGO,
  TAMANHO_CODIGO,
  VALIDADE_CODIGO_MINUTOS,
} from '@/regras/recuperacaoSenha';

export interface MensagemSimulada {
  destinatario: string;
  codigo: string | null;
  expiraEm: number;
  esgotada: boolean;
}

export type ResultadoConferencia = 'ACEITO' | 'RECUSADO' | 'ESGOTADO';

interface PedidoSimulado {
  destinatario: string;
  codigo: string | null;
  pedidoEm: number;
  expiraEm: number;
  tentativas: number;
}

const VALIDADE_CODIGO_MS = VALIDADE_CODIGO_MINUTOS * 60_000;
const VALIDADE_REDEFINICAO_MS = 10 * 60_000;
const ESPERA_REENVIO_MS = ESPERA_REENVIO_SEGUNDOS * 1000;

const pedidos = new Map<string, PedidoSimulado>();
const redefinicoes = new Map<string, number>();
const ouvintes = new Set<() => void>();
let chaveDaUltimaMensagem: string | null = null;
let ultimaMensagem: MensagemSimulada | null = null;

function chaveDoEmail(email: string): string {
  return email.trim().toLowerCase();
}

function gerarCodigo(): string {
  const [sorteado = 0] = crypto.getRandomValues(new Uint32Array(1));
  return String(sorteado % 10 ** TAMANHO_CODIGO).padStart(TAMANHO_CODIGO, '0');
}

function publicarMensagem(chave: string | null): void {
  const pedido = chave === null ? undefined : pedidos.get(chave);
  chaveDaUltimaMensagem = pedido ? chave : null;
  ultimaMensagem = pedido
    ? {
        destinatario: pedido.destinatario,
        codigo: pedido.codigo,
        expiraEm: pedido.expiraEm,
        esgotada: pedido.tentativas >= LIMITE_TENTATIVAS_CODIGO,
      }
    : null;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function registrarPedidoSimulado(email: string, temConta: boolean, agora: number): void {
  const chave = chaveDoEmail(email);
  const anterior = pedidos.get(chave);
  const dentroDoIntervalo = anterior !== undefined && agora - anterior.pedidoEm < ESPERA_REENVIO_MS;

  if (!dentroDoIntervalo) {
    pedidos.set(chave, {
      destinatario: email.trim(),
      codigo: temConta ? gerarCodigo() : null,
      pedidoEm: agora,
      expiraEm: agora + VALIDADE_CODIGO_MS,
      tentativas: 0,
    });
  }

  publicarMensagem(chave);
}

export function conferirCodigoSimulado(email: string, codigo: string, agora: number): ResultadoConferencia {
  const chave = chaveDoEmail(email);
  const pedido = pedidos.get(chave);
  if (!pedido) return 'RECUSADO';
  if (pedido.tentativas >= LIMITE_TENTATIVAS_CODIGO) return 'ESGOTADO';

  if (pedido.codigo !== null && agora < pedido.expiraEm && pedido.codigo === codigo) {
    pedidos.delete(chave);
    if (chaveDaUltimaMensagem === chave) publicarMensagem(null);
    return 'ACEITO';
  }

  pedido.tentativas += 1;
  if (chaveDaUltimaMensagem === chave) publicarMensagem(chave);
  return pedido.tentativas >= LIMITE_TENTATIVAS_CODIGO ? 'ESGOTADO' : 'RECUSADO';
}

export function abrirRedefinicaoSimulada(agora: number): string {
  const token = crypto.randomUUID();
  redefinicoes.set(token, agora + VALIDADE_REDEFINICAO_MS);
  return token;
}

export function redefinicaoSimuladaValida(token: string, agora: number): boolean {
  const expiraEm = redefinicoes.get(token);
  return expiraEm !== undefined && agora < expiraEm;
}

export function encerrarRedefinicaoSimulada(token: string): void {
  redefinicoes.delete(token);
}

export function expirarCodigoSimulado(): void {
  pedidos.forEach((pedido) => {
    pedido.expiraEm = 0;
  });
  publicarMensagem(chaveDaUltimaMensagem);
}

export function expirarRedefinicaoSimulada(): void {
  redefinicoes.forEach((_, token) => redefinicoes.set(token, 0));
}

export function reiniciarRecuperacaoSimulada(): void {
  pedidos.clear();
  redefinicoes.clear();
  publicarMensagem(null);
}

export function lerCaixaEntradaSimulada(): MensagemSimulada | null {
  return ultimaMensagem;
}

export function assinarCaixaEntradaSimulada(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
