import { useEffect, useRef, useState } from 'react';

const DURACAO_MS = 900;

function desacelerar(progresso: number): number {
  return 1 - (1 - progresso) ** 3;
}

function prefereMovimentoReduzido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useContagem(alvo: number, casasDecimais = 0): number {
  const [valor, setValor] = useState(() => (prefereMovimentoReduzido() ? alvo : 0));
  const valorAtual = useRef(valor);

  useEffect(() => {
    const inicio = valorAtual.current;
    if (inicio === alvo) return;
    if (prefereMovimentoReduzido() || document.hidden) {
      valorAtual.current = alvo;
      setValor(alvo);
      return;
    }

    let quadro = 0;
    const escala = 10 ** casasDecimais;
    const comeco = performance.now();
    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - comeco) / DURACAO_MS);
      const intermediario = Math.round((inicio + (alvo - inicio) * desacelerar(progresso)) * escala) / escala;
      const proximo = progresso < 1 ? intermediario : alvo;
      valorAtual.current = proximo;
      setValor(proximo);
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    const concluirQuandoOculta = () => {
      if (!document.hidden) return;
      cancelAnimationFrame(quadro);
      valorAtual.current = alvo;
      setValor(alvo);
    };
    quadro = requestAnimationFrame(passo);
    document.addEventListener('visibilitychange', concluirQuandoOculta);
    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener('visibilitychange', concluirQuandoOculta);
    };
  }, [alvo, casasDecimais]);

  return valor;
}
