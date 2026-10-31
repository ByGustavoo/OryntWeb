import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Dica.module.css';

const ESPERA_PARA_ABRIR_MS = 320;
const JANELA_SEM_ESPERA_MS = 400;
const TOLERANCIA_PARA_FECHAR_MS = 140;
const MARGEM_DA_TELA = 8;
const DISTANCIA_DO_GATILHO = 8;
const ALTURA_MAXIMA_DA_LINHA = 96;

let ultimaDicaFechadaEm = 0;

export type LadoDaDica = 'cima' | 'baixo' | 'direita' | 'esquerda';

type PropsDoGatilho = {
  ref?: Ref<HTMLElement>;
  'aria-describedby'?: string;
  onPointerEnter?: (evento: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (evento: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (evento: PointerEvent<HTMLElement>) => void;
  onFocus?: (evento: FocusEvent<HTMLElement>) => void;
  onBlur?: (evento: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (evento: KeyboardEvent<HTMLElement>) => void;
  tabIndex?: number;
};

export interface DicaProps {
  conteudo: ReactNode;
  titulo?: ReactNode;
  lado?: LadoDaDica;
  soSeCortado?: boolean;
  focavel?: boolean;
  descrever?: boolean;
  larga?: boolean;
  children: ReactElement<PropsDoGatilho>;
}

interface Posicao {
  x: number;
  y: number;
  lado: LadoDaDica;
  seta: number;
}

function estaCortado(elemento: HTMLElement): boolean {
  const alvo = elemento.querySelector<HTMLElement>('[data-corte]') ?? elemento;
  return alvo.scrollWidth > alvo.clientWidth + 1 || alvo.scrollHeight > alvo.clientHeight + 1;
}

function dentroDeInterativo(elemento: HTMLElement): boolean {
  return (
    elemento.closest('a[href], button, input, select, textarea, label, [role="button"]') !== null ||
    elemento.parentElement?.closest('[tabindex]:not([tabindex="-1"])') != null
  );
}

interface Faixa {
  inicio: number;
  fim: number;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

function faixaVertical(gatilho: HTMLElement, caixa: DOMRect): Faixa {
  const linha = gatilho.closest<HTMLElement>('tr, [data-dica-linha]');
  if (!linha) return { inicio: caixa.top, fim: caixa.bottom };
  const caixaDaLinha = linha.getBoundingClientRect();
  if (caixaDaLinha.height > ALTURA_MAXIMA_DA_LINHA) return { inicio: caixa.top, fim: caixa.bottom };
  return { inicio: Math.min(caixa.top, caixaDaLinha.top), fim: Math.max(caixa.bottom, caixaDaLinha.bottom) };
}

function calcularPosicao(gatilho: HTMLElement, balao: HTMLElement, lado: LadoDaDica): Posicao {
  const ancora = gatilho.querySelector<HTMLElement>('[data-dica-ancora]') ?? gatilho;
  const caixa = ancora.getBoundingClientRect();
  const largura = balao.offsetWidth;
  const altura = balao.offsetHeight;
  const larguraDaTela = document.documentElement.clientWidth;
  const alturaDaTela = window.innerHeight;
  const area = ancora.closest<HTMLElement>('[data-dica-limite]')?.getBoundingClientRect();
  const esquerdaUtil = Math.max(area?.left ?? 0, 0) + MARGEM_DA_TELA;
  const direitaUtil = Math.min(area?.right ?? larguraDaTela, larguraDaTela) - MARGEM_DA_TELA;
  const meio = caixa.top + caixa.height / 2;

  const aoLado = (ladoFinal: 'direita' | 'esquerda'): Posicao => {
    const y = limitar(meio - altura / 2, MARGEM_DA_TELA, alturaDaTela - altura - MARGEM_DA_TELA);
    const x = ladoFinal === 'direita' ? caixa.right + DISTANCIA_DO_GATILHO : caixa.left - DISTANCIA_DO_GATILHO - largura;
    return { x, y, lado: ladoFinal, seta: limitar(meio - y, 10, altura - 10) };
  };
  const cabeADireita = caixa.right + DISTANCIA_DO_GATILHO + largura <= direitaUtil;
  const cabeAEsquerda = caixa.left - DISTANCIA_DO_GATILHO - largura >= esquerdaUtil;
  if (lado === 'direita' && cabeADireita) return aoLado('direita');
  if (lado === 'direita' && cabeAEsquerda && area) return aoLado('esquerda');
  if (lado === 'esquerda' && cabeAEsquerda) return aoLado('esquerda');
  if (lado === 'esquerda' && cabeADireita && area) return aoLado('direita');

  const faixa = faixaVertical(gatilho, caixa);
  const cabeAcima = faixa.inicio - altura - DISTANCIA_DO_GATILHO >= MARGEM_DA_TELA;
  const cabeAbaixo = faixa.fim + altura + DISTANCIA_DO_GATILHO <= alturaDaTela - MARGEM_DA_TELA;
  const ladoFinal: LadoDaDica =
    lado === 'baixo' ? (cabeAbaixo || !cabeAcima ? 'baixo' : 'cima') : cabeAcima || !cabeAbaixo ? 'cima' : 'baixo';
  const centro = caixa.left + caixa.width / 2;
  const x = limitar(centro - largura / 2, MARGEM_DA_TELA, larguraDaTela - largura - MARGEM_DA_TELA);
  const y = ladoFinal === 'cima' ? faixa.inicio - altura - DISTANCIA_DO_GATILHO : faixa.fim + DISTANCIA_DO_GATILHO;
  return { x, y, lado: ladoFinal, seta: limitar(centro - x, 12, largura - 12) };
}

export function Dica({
  conteudo,
  titulo,
  lado = 'cima',
  soSeCortado = false,
  focavel = false,
  descrever = false,
  larga = false,
  children,
}: DicaProps) {
  const id = useId();
  const gatilho = useRef<HTMLElement | null>(null);
  const balao = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  const [aberta, setAberta] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);

  const cancelarEspera = () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = null;
  };

  const abrir = useCallback(
    (imediata: boolean) => {
      const elemento = gatilho.current;
      if (!elemento || (soSeCortado && !estaCortado(elemento))) return;
      cancelarEspera();
      const semEspera = imediata || Date.now() - ultimaDicaFechadaEm < JANELA_SEM_ESPERA_MS;
      if (semEspera) setAberta(true);
      else temporizador.current = window.setTimeout(() => setAberta(true), ESPERA_PARA_ABRIR_MS);
    },
    [soSeCortado],
  );

  const fechar = useCallback(() => {
    cancelarEspera();
    setAberta((estava) => {
      if (estava) ultimaDicaFechadaEm = Date.now();
      return false;
    });
    setPosicao(null);
  }, []);

  const fecharEmBreve = useCallback(() => {
    cancelarEspera();
    temporizador.current = window.setTimeout(fechar, TOLERANCIA_PARA_FECHAR_MS);
  }, [fechar]);

  useLayoutEffect(() => {
    if (!aberta || !gatilho.current || !balao.current) return;
    setPosicao(calcularPosicao(gatilho.current, balao.current, lado));
  }, [aberta, lado, conteudo, titulo]);

  useEffect(() => {
    if (!aberta) return;
    const fecharAoRolar = () => fechar();
    const fecharFora = (evento: globalThis.PointerEvent) => {
      const alvo = evento.target as Node;
      if (!gatilho.current?.contains(alvo) && !balao.current?.contains(alvo)) fechar();
    };
    const fecharComEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') fechar();
    };
    window.addEventListener('scroll', fecharAoRolar, true);
    window.addEventListener('resize', fecharAoRolar);
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      window.removeEventListener('scroll', fecharAoRolar, true);
      window.removeEventListener('resize', fecharAoRolar);
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberta, fechar]);

  useEffect(() => cancelarEspera, []);

  if (!isValidElement(children)) return children;
  if (conteudo === null || conteudo === undefined || conteudo === '') return children;

  const props = children.props;
  const refOriginal = (children as ReactElement & { ref?: Ref<HTMLElement> }).ref;
  const juntarRef = (elemento: HTMLElement | null) => {
    gatilho.current = elemento;
    if (typeof refOriginal === 'function') refOriginal(elemento);
    else if (refOriginal && typeof refOriginal === 'object') (refOriginal as { current: HTMLElement | null }).current = elemento;
  };
  const idDaDescricao = `${id}-descricao`;
  const descreve = descrever || focavel;
  const descritoPor = [props['aria-describedby'], descreve ? idDaDescricao : null].filter(Boolean).join(' ') || undefined;

  const gatilhoComDica = cloneElement(children, {
    ref: juntarRef,
    'aria-describedby': descritoPor,
    tabIndex: focavel && props.tabIndex === undefined ? 0 : props.tabIndex,
    onPointerEnter: (evento: PointerEvent<HTMLElement>) => {
      props.onPointerEnter?.(evento);
      if (evento.pointerType === 'mouse' || evento.pointerType === 'pen') abrir(false);
    },
    onPointerLeave: (evento: PointerEvent<HTMLElement>) => {
      props.onPointerLeave?.(evento);
      if (evento.pointerType === 'mouse' || evento.pointerType === 'pen') fecharEmBreve();
    },
    onPointerDown: (evento: PointerEvent<HTMLElement>) => {
      props.onPointerDown?.(evento);
      if (evento.pointerType === 'touch' && gatilho.current && !dentroDeInterativo(gatilho.current)) {
        if (aberta) fechar();
        else abrir(true);
      } else if (evento.pointerType === 'mouse') {
        fechar();
      }
    },
    onFocus: (evento: FocusEvent<HTMLElement>) => {
      props.onFocus?.(evento);
      if (evento.currentTarget.matches(':focus-visible')) abrir(true);
    },
    onBlur: (evento: FocusEvent<HTMLElement>) => {
      props.onBlur?.(evento);
      fechar();
    },
    onKeyDown: (evento: KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(evento);
      if (evento.key === 'Escape' && aberta) {
        evento.stopPropagation();
        fechar();
      }
    },
  });

  return (
    <>
      {gatilhoComDica}
      {descreve ? (
        <span id={idDaDescricao} hidden>
          {titulo ? <>{titulo}: </> : null}
          {conteudo}
        </span>
      ) : null}
      {aberta
        ? createPortal(
            <div
              ref={balao}
              role="tooltip"
              className={juntarClasses(estilos.dica, larga && estilos.larga, posicao && estilos.visivel)}
              data-lado={posicao?.lado ?? lado}
              onPointerEnter={cancelarEspera}
              onPointerLeave={fecharEmBreve}
              style={
                {
                  left: posicao?.x ?? 0,
                  top: posicao?.y ?? 0,
                  '--posicao-da-seta': `${posicao?.seta ?? 0}px`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              {titulo ? <span className={estilos.titulo}>{titulo}</span> : null}
              <span className={estilos.conteudo}>{conteudo}</span>
              <span className={estilos.seta} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
