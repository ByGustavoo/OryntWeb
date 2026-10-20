import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Botao, CabecalhoPainel, Esqueleto, Painel } from '@/componentes/ui';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import estilos from './PontosDeAtencao.module.css';

const TITULO = 'Pontos de atenção';
const PONTOS_A_MOSTRAR = 3;
const PONTOS_SEM_RECOLHER = PONTOS_A_MOSTRAR + 1;

function pontosVisiveis(total: number, expandido: boolean): number {
  return expandido || total <= PONTOS_SEM_RECOLHER ? total : PONTOS_A_MOSTRAR;
}

export type TomDoPonto = 'aviso' | 'erro' | 'info';

export interface ItemDeAtencao {
  chave: string;
  tom: TomDoPonto;
  icone: LucideIcon;
  objeto: { esquema: string | null; nome: string } | null;
  titulo: string | null;
  texto: string;
  acao: string;
  rotuloDaAcao: string;
  aoSeguir: () => void;
}

interface PontosDeAtencaoProps {
  descricao: string;
  itens: ItemDeAtencao[];
}

export function PontosDeAtencao({ descricao, itens }: PontosDeAtencaoProps) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = pontosVisiveis(itens.length, expandido);
  const recolhivel = itens.length > PONTOS_SEM_RECOLHER;
  const ocultos = itens.length - PONTOS_A_MOSTRAR;

  return (
    <Painel aria-labelledby="titulo-pontos-de-atencao" className={estilos.painel}>
      <CabecalhoPainel titulo={<span id="titulo-pontos-de-atencao">{TITULO}</span>} descricao={descricao} />
      <ul className={estilos.lista} id="lista-pontos-de-atencao">
        {itens.slice(0, visiveis).map((item, posicao) => {
          const Icone = item.icone;
          const revelado = posicao >= PONTOS_A_MOSTRAR;
          return (
            <li
              key={item.chave}
              className={juntarClasses(estilos.item, revelado && 'item-em-cascata')}
              style={revelado ? ({ '--indice': posicao - PONTOS_A_MOSTRAR } as CSSProperties) : undefined}
            >
              <span className={juntarClasses(estilos.icone, estilos[item.tom])} aria-hidden="true">
                <Icone size={15} strokeWidth={2.25} />
              </span>
              <div className={estilos.textos}>
                <p className={estilos.titulo}>
                  {item.objeto ? (
                    <span className="codigo">
                      <NomeObjeto esquema={item.objeto.esquema} nome={item.objeto.nome} classeEsquema={estilos.esquema} />
                    </span>
                  ) : (
                    item.titulo
                  )}
                </p>
                <p className={estilos.frase}>{item.texto}</p>
              </div>
              <Botao
                variante="secundario"
                tamanho="sm"
                iconeDireita={ChevronRight}
                className={estilos.acao}
                aria-label={item.rotuloDaAcao}
                onClick={item.aoSeguir}
              >
                {item.acao}
              </Botao>
            </li>
          );
        })}
      </ul>
      {recolhivel ? (
        <div className={estilos.alternar}>
          <Botao
            variante="terciario"
            tamanho="sm"
            iconeDireita={ChevronDown}
            className={juntarClasses(estilos.botaoAlternar, expandido && estilos.expandido)}
            aria-expanded={expandido}
            aria-controls="lista-pontos-de-atencao"
            onClick={() => setExpandido((atual) => !atual)}
          >
            {expandido ? (
              <span>
                Mostrar só os <span className="numeros">{formatarNumero(PONTOS_A_MOSTRAR)}</span> mais urgentes
              </span>
            ) : (
              <span>
                Mostrar os outros <span className="numeros">{formatarNumero(ocultos)}</span> pontos
              </span>
            )}
          </Botao>
        </div>
      ) : null}
    </Painel>
  );
}

interface EsqueletoPontosDeAtencaoProps {
  descricao: string;
  linhasPorFrase: number[];
}

export function EsqueletoPontosDeAtencao({ descricao, linhasPorFrase }: EsqueletoPontosDeAtencaoProps) {
  const recolhivel = linhasPorFrase.length > PONTOS_SEM_RECOLHER;
  return (
    <PainelEmEspera titulo={TITULO} descricao={descricao} className={estilos.painel}>
      <ul className={estilos.lista} aria-hidden="true">
        {linhasPorFrase.slice(0, pontosVisiveis(linhasPorFrase.length, false)).map((linhas, indice) => (
          <li key={indice} className={estilos.item}>
            <Esqueleto largura={26} altura={26} raio="var(--raio-sm)" />
            <div className={estilos.textos}>
              <LinhaEmEspera largura={`${34 - ((indice * 7) % 12)}%`} className={estilos.titulo} />
              {Array.from({ length: linhas }, (_, linha) => (
                <LinhaEmEspera
                  key={linha}
                  largura={linha < linhas - 1 || linhas === 1 ?`${92 - ((indice * 19 + linha * 7) % 20)}%` : `${28 + ((indice * 13) % 24)}%`}
                  className={estilos.frase}
                />
              ))}
            </div>
            <Esqueleto largura={84} altura={32} raio="var(--raio-md)" className={estilos.acao} />
          </li>
        ))}
      </ul>
      {recolhivel ? (
        <div className={estilos.alternar} aria-hidden="true">
          <Esqueleto largura={184} altura={32} raio="var(--raio-md)" />
        </div>
      ) : null}
    </PainelEmEspera>
  );
}
