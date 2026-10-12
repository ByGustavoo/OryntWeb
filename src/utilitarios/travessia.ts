import { flushSync } from 'react-dom';
import { prefereMovimentoReduzido } from './graficos';

export type SentidoTravessia = 'chegada' | 'saida';

const ESPERA_MAXIMA_DO_DESTINO_MS = 600;
const ACOMODACAO_APOS_A_TRAVESSIA_MS = 700;

interface DocumentoComTransicao {
  startViewTransition?: (atualizar: () => Promise<void>) => { finished: Promise<void> };
}

let concluirEspera: (() => void) | null = null;
let travessiaAtual = 0;

function aguardarDestinoMontado(): Promise<void> {
  return new Promise((resolver) => {
    const concluir = () => {
      window.clearTimeout(limite);
      concluirEspera = null;
      resolver();
    };
    const limite = window.setTimeout(concluir, ESPERA_MAXIMA_DO_DESTINO_MS);
    concluirEspera = concluir;
  });
}

export function avisarDestinoMontado(): void {
  concluirEspera?.();
}

export function travessiaEmCurso(): SentidoTravessia | null {
  const sentido = document.documentElement.dataset.travessia;
  return sentido === 'chegada' || sentido === 'saida' ? sentido : null;
}

export function atravessar(sentido: SentidoTravessia, trocarDeTela: () => void): void {
  const documento = document as unknown as DocumentoComTransicao;
  const podeTransitar =
    documento.startViewTransition && document.visibilityState === 'visible' && !prefereMovimentoReduzido();

  if (!podeTransitar || !documento.startViewTransition) {
    trocarDeTela();
    return;
  }

  const raiz = document.documentElement;
  const estaTravessia = ++travessiaAtual;
  const limpar = () =>
    window.setTimeout(() => {
      if (travessiaAtual === estaTravessia) delete raiz.dataset.travessia;
    }, ACOMODACAO_APOS_A_TRAVESSIA_MS);

  raiz.dataset.travessia = sentido;
  documento
    .startViewTransition(async () => {
      const destinoMontado = aguardarDestinoMontado();
      flushSync(trocarDeTela);
      await destinoMontado;
    })
    .finished.then(limpar, limpar);
}
