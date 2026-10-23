import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Esqueleto } from '@/componentes/ui';
import { agruparPorDia } from '@/regras/linhaDoTempo';
import { formatarHorario } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './LinhaDoTempo.module.css';

export type TomDoMarco = 'sucesso' | 'aviso' | 'erro' | 'info' | 'neutro';

interface LinhaDoTempoProps<T> {
  itens: T[];
  agora: Date;
  rotulo: string;
  atributo: string;
  idAberto: string | null;
  chave: (item: T) => string;
  instante: (item: T) => string;
  tom: (item: T) => TomDoMarco;
  icone: (item: T) => LucideIcon;
  conteudo: (item: T) => ReactNode;
  complemento?: (item: T) => ReactNode;
  rotuloDaAcao: string;
  rolarAteAberto?: boolean;
  aoAbrir: (item: T) => void;
}

export function LinhaDoTempo<T>({
  itens,
  agora,
  rotulo,
  atributo,
  idAberto,
  chave,
  instante,
  tom,
  icone,
  conteudo,
  complemento,
  rotuloDaAcao,
  rolarAteAberto = true,
  aoAbrir,
}: LinhaDoTempoProps<T>) {
  const raiz = useRef<HTMLDivElement>(null);
  const [entrando, setEntrando] = useState(true);
  const dias = agruparPorDia(itens, instante, agora);
  let posicao = 0;

  useEffect(() => {
    if (idAberto === null || !rolarAteAberto) return;
    raiz.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberto, rolarAteAberto, itens]);

  const encerrarEntrada = (evento: AnimationEvent<HTMLLIElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <div ref={raiz} className={estilos.linhaDoTempo} role="region" aria-label={rotulo}>
      {dias.map((dia) => (
        <section key={dia.chave} className={estilos.dia} aria-label={dia.nome}>
          <h3 className={estilos.cabecaDoDia}>{dia.nome}</h3>
          <ol className={estilos.marcos}>
            {dia.itens.map((item) => {
              const id = chave(item);
              const Icone = icone(item);
              const extra = complemento ? complemento(item) : null;
              const indice = posicao;
              posicao += 1;
              const ultimo = indice === itens.length - 1;
              return (
                <li
                  key={id}
                  className={juntarClasses(estilos.marco, estilos[tom(item)], entrando && 'item-em-cascata')}
                  style={{ '--indice': indice } as CSSProperties}
                  {...{ [`data-${atributo}`]: id }}
                  aria-current={id === idAberto ? 'true' : undefined}
                  onAnimationEnd={ultimo ? encerrarEntrada : undefined}
                >
                  <time className={estilos.hora} dateTime={instante(item)}>
                    {formatarHorario(instante(item))}
                  </time>
                  <span className={estilos.trilho} aria-hidden="true">
                    <span className={estilos.ponto}>
                      <Icone size={12} strokeWidth={2.5} />
                    </span>
                  </span>
                  <button type="button" className={estilos.abrir} aria-haspopup="dialog" onClick={() => aoAbrir(item)}>
                    <span className={estilos.conteudo}>{conteudo(item)}</span>
                    {extra ? <span className={estilos.complemento}>{extra}</span> : null}
                    <span className="visualmente-oculto">. {rotuloDaAcao}</span>
                    <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={estilos.seta} />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function EsqueletoLinhaDoTempo({ linhas, rotulo }: { linhas: number; rotulo: string }) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        {rotulo}
      </span>
      <div className={estilos.linhaDoTempo} aria-hidden="true">
        <section className={estilos.dia}>
          <div className={estilos.cabecaDoDia}>
            <Esqueleto largura={150} altura={12} />
          </div>
          <ol className={estilos.marcos}>
            {Array.from({ length: linhas }, (_, indice) => (
              <li key={indice} className={juntarClasses(estilos.marco, estilos.neutro)} style={{ opacity: 1 - indice * (0.6 / linhas) }}>
                <span className={estilos.hora}>
                  <Esqueleto largura={36} altura={12} />
                </span>
                <span className={estilos.trilho}>
                  <span className={estilos.ponto} />
                </span>
                <span className={estilos.abrir}>
                  <span className={estilos.conteudo}>
                    <Esqueleto largura={`${58 - ((indice * 13) % 24)}%`} altura={12} />
                    <Esqueleto largura={`${34 - ((indice * 7) % 12)}%`} altura={10} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
