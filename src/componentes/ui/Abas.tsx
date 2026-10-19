import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Abas.module.css';

export interface Aba<T extends string> {
  valor: T;
  rotulo: string;
  rotuloCurto?: string;
  quantidade?: number | null;
}

export interface AbasProps<T extends string> {
  id: string;
  rotulo: string;
  abas: Aba<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  className?: string;
}

export function idDaAba(id: string, valor: string): string {
  return `${id}-aba-${valor.toLowerCase()}`;
}

export function idDoPainelDaAba(id: string, valor: string): string {
  return `${id}-painel-${valor.toLowerCase()}`;
}

export function Abas<T extends string>({ id, rotulo, abas, valor, aoMudar, className }: AbasProps<T>) {
  const lista = useRef<HTMLDivElement>(null);

  const focarAba = (posicao: number) => {
    const escolhida = abas[(posicao + abas.length) % abas.length];
    if (!escolhida) return;
    aoMudar(escolhida.valor);
    lista.current?.querySelector<HTMLElement>(`#${CSS.escape(idDaAba(id, escolhida.valor))}`)?.focus();
  };

  const navegar = (evento: KeyboardEvent<HTMLDivElement>) => {
    const atual = abas.findIndex((aba) => aba.valor === valor);
    const destinos: Record<string, number> = {
      ArrowRight: atual + 1,
      ArrowLeft: atual - 1,
      Home: 0,
      End: abas.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    focarAba(destino);
  };

  return (
    <div className={juntarClasses(estilos.abas, className)}>
      <div ref={lista} role="tablist" aria-label={rotulo} className={estilos.lista} onKeyDown={navegar}>
        {abas.map((aba) => {
          const ativa = aba.valor === valor;
          return (
            <button
              key={aba.valor}
              type="button"
              role="tab"
              id={idDaAba(id, aba.valor)}
              aria-selected={ativa}
              aria-controls={idDoPainelDaAba(id, aba.valor)}
              tabIndex={ativa ? 0 : -1}
              className={estilos.aba}
              onClick={() => aoMudar(aba.valor)}
            >
              <RotuloDaAba rotulo={aba.rotulo} rotuloCurto={aba.rotuloCurto} />
              {aba.quantidade !== undefined && aba.quantidade !== null ? (
                <span className={`${estilos.quantidade} numeros`}>{formatarNumero(aba.quantidade)}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RotuloDaAba({ rotulo, rotuloCurto }: { rotulo: string; rotuloCurto?: string }) {
  if (!rotuloCurto) return <span>{rotulo}</span>;
  return (
    <>
      <span className={estilos.rotuloLongo}>{rotulo}</span>
      <span className={estilos.rotuloCurto} aria-hidden="true">
        {rotuloCurto}
      </span>
    </>
  );
}

export interface PainelDaAbaProps {
  id: string;
  valor: string;
  ativa: boolean;
  className?: string;
  children: ReactNode;
}

export function PainelDaAba({ id, valor, ativa, className, children }: PainelDaAbaProps) {
  return (
    <div
      role="tabpanel"
      id={idDoPainelDaAba(id, valor)}
      aria-labelledby={idDaAba(id, valor)}
      hidden={!ativa}
      className={className}
    >
      {ativa ? children : null}
    </div>
  );
}
