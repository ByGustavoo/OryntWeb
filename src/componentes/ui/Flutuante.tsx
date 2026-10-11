import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';
import { manterTabDentro } from '@/utilitarios/foco';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Flutuante.module.css';

const DISTANCIA_ANCORA = 6;
const MARGEM_TELA = 8;

export interface FlutuanteProps {
  aberto: boolean;
  ancora: RefObject<HTMLElement>;
  aoFechar: (devolverFocoParaAncora: boolean) => void;
  larguraMinimaDaAncora?: boolean;
  id?: string;
  papel?: 'dialog' | 'listbox';
  rotulo?: string;
  className?: string;
  children: ReactNode;
}

interface Posicao {
  top: number;
  left: number;
  minWidth: number;
  origem: 'topo' | 'base';
}

export function Flutuante({
  aberto,
  ancora,
  aoFechar,
  larguraMinimaDaAncora = false,
  id,
  papel = 'dialog',
  rotulo,
  className,
  children,
}: FlutuanteProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const ladoEscolhido = useRef<'abaixo' | 'acima' | null>(null);

  const posicionar = useCallback(() => {
    const elementoAncora = ancora.current;
    const painel = painelRef.current;
    if (!elementoAncora || !painel) return;

    const retangulo = elementoAncora.getBoundingClientRect();
    const altura = painel.offsetHeight;
    const largura = Math.max(painel.offsetWidth, larguraMinimaDaAncora ? retangulo.width : 0);
    const cabeAbaixo = retangulo.bottom + DISTANCIA_ANCORA + altura <= window.innerHeight - MARGEM_TELA;
    const cabeAcima = retangulo.top - DISTANCIA_ANCORA - altura >= MARGEM_TELA;
    const ladoAnterior = ladoEscolhido.current;
    const manterAnterior =
      (ladoAnterior === 'abaixo' && cabeAbaixo) || (ladoAnterior === 'acima' && cabeAcima);
    const abrirAcima = manterAnterior ? ladoAnterior === 'acima' : !cabeAbaixo && cabeAcima;
    ladoEscolhido.current = abrirAcima ? 'acima' : 'abaixo';
    const topo = abrirAcima
      ? retangulo.top - DISTANCIA_ANCORA - altura
      : Math.min(retangulo.bottom + DISTANCIA_ANCORA, window.innerHeight - MARGEM_TELA - altura);
    const esquerda = Math.min(Math.max(retangulo.left, MARGEM_TELA), window.innerWidth - MARGEM_TELA - largura);

    setPosicao({
      top: Math.max(topo, MARGEM_TELA),
      left: Math.max(esquerda, MARGEM_TELA),
      minWidth: larguraMinimaDaAncora ? retangulo.width : 0,
      origem: abrirAcima ? 'base' : 'topo',
    });
  }, [ancora, larguraMinimaDaAncora]);

  useLayoutEffect(() => {
    if (!aberto) {
      setPosicao(null);
      ladoEscolhido.current = null;
      return;
    }
    posicionar();
  }, [aberto, posicionar]);

  useEffect(() => {
    if (!aberto) return;
    let quadro = 0;
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(posicionar);
    };
    const observador = new ResizeObserver(agendar);
    if (painelRef.current) observador.observe(painelRef.current);
    window.addEventListener('resize', agendar);
    window.addEventListener('scroll', agendar, true);
    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      window.removeEventListener('resize', agendar);
      window.removeEventListener('scroll', agendar, true);
    };
  }, [aberto, posicionar]);

  useEffect(() => {
    if (!aberto) return;
    const aoPressionarFora = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (painelRef.current?.contains(alvo) || ancora.current?.contains(alvo)) return;
      aoFechar(false);
    };
    document.addEventListener('pointerdown', aoPressionarFora, true);
    return () => document.removeEventListener('pointerdown', aoPressionarFora, true);
  }, [aberto, ancora, aoFechar]);

  const aoPressionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.nativeEvent.stopPropagation();
      aoFechar(true);
      return;
    }
    if (evento.key === 'Tab' && painelRef.current) {
      evento.nativeEvent.stopPropagation();
      manterTabDentro(evento.nativeEvent, painelRef.current);
    }
  };

  if (!aberto) return null;

  const estilo: CSSProperties = posicao
    ? { top: posicao.top, left: posicao.left, minWidth: posicao.minWidth || undefined }
    : { top: 0, left: 0, visibility: 'hidden' };

  return createPortal(
    <div
      ref={painelRef}
      id={id}
      role={papel === 'dialog' ? 'dialog' : undefined}
      aria-label={papel === 'dialog' ? rotulo : undefined}
      className={juntarClasses(
        estilos.flutuante,
        posicao?.origem === 'base' ? estilos.deBaixo : estilos.deCima,
        className,
      )}
      style={estilo}
      onKeyDown={aoPressionarTecla}
    >
      {children}
    </div>,
    document.body,
  );
}
