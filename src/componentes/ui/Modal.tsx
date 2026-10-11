import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTravarRolagem } from '@/ganchos/useTravarRolagem';
import { devolverFoco, focaveisVisiveis, manterTabDentro } from '@/utilitarios/foco';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { BotaoIcone } from './BotaoIcone';
import estilos from './Modal.module.css';

const DURACAO_SAIDA_MS = 200;

const pilhaModais: symbol[] = [];

function estaNoTopo(identificador: symbol): boolean {
  return pilhaModais[pilhaModais.length - 1] === identificador;
}

export interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  tamanho?: 'sm' | 'md' | 'lg';
  rodape?: ReactNode;
  papel?: 'dialog' | 'alertdialog';
  focarPrimeiroCampo?: boolean;
  children?: ReactNode;
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  tamanho = 'md',
  rodape,
  papel = 'dialog',
  focarPrimeiroCampo = false,
  children,
}: ModalProps) {
  const [montado, setMontado] = useState(aberto);
  const [saindo, setSaindo] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const origemRef = useRef<HTMLElement | null>(null);
  const identificador = useRef(Symbol('modal')).current;
  const idBase = useId();
  const idTitulo = `${idBase}-titulo`;
  const idDescricao = `${idBase}-descricao`;

  useEffect(() => {
    if (aberto) {
      origemRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMontado(true);
      setSaindo(false);
      return;
    }
    if (!montado) return;
    setSaindo(true);
    const temporizador = window.setTimeout(() => {
      setMontado(false);
      setSaindo(false);
      devolverFoco(origemRef.current);
    }, DURACAO_SAIDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [aberto, montado]);

  useTravarRolagem(montado);

  useEffect(() => {
    if (!montado) return;
    pilhaModais.push(identificador);
    return () => {
      const indice = pilhaModais.lastIndexOf(identificador);
      if (indice >= 0) pilhaModais.splice(indice, 1);
    };
  }, [montado, identificador]);

  useEffect(() => {
    if (!montado || saindo) return;
    const painel = painelRef.current;
    if (!painel || painel.contains(document.activeElement)) return;
    const primeiroCampo = focarPrimeiroCampo
      ? focaveisVisiveis(painel).find((elemento) => elemento.matches('input, select, textarea'))
      : null;
    (primeiroCampo ?? painel).focus();
  }, [montado, saindo, focarPrimeiroCampo]);

  useEffect(() => {
    if (!montado || saindo) return;
    const aoPressionar = (evento: KeyboardEvent) => {
      if (!estaNoTopo(identificador)) return;
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        aoFechar();
        return;
      }
      if (painelRef.current) manterTabDentro(evento, painelRef.current);
    };
    document.addEventListener('keydown', aoPressionar);
    return () => document.removeEventListener('keydown', aoPressionar);
  }, [montado, saindo, aoFechar, identificador]);

  if (!montado) return null;

  return createPortal(
    <div className={juntarClasses(estilos.sobreposicao, saindo && estilos.saindo)} onMouseDown={aoFechar}>
      <div
        ref={painelRef}
        role={papel}
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        className={juntarClasses(estilos.painel, estilos[tamanho])}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className={estilos.cabecalho}>
          <div className={estilos.textos}>
            <h2 className={estilos.titulo} id={idTitulo}>
              {titulo}
            </h2>
            {descricao ? (
              <p className={estilos.descricao} id={idDescricao}>
                {descricao}
              </p>
            ) : null}
          </div>
          <BotaoIcone icone={X} rotulo="Fechar" tamanho="sm" onClick={aoFechar} className={estilos.fechar} />
        </header>

        {children ? <div className={estilos.conteudo}>{children}</div> : null}

        {rodape ? <footer className={estilos.rodape}>{rodape}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
