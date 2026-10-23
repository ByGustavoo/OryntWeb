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

export type VarianteDosPontos = 'painel' | 'lateral' | 'recolhida';

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
  variante?: VarianteDosPontos;
  className?: string;
}

function TituloDoPonto({ item }: { item: ItemDeAtencao }) {
  return item.objeto ? (
    <span className="codigo">
      <NomeObjeto esquema={item.objeto.esquema} nome={item.objeto.nome} classeEsquema={estilos.esquema} />
    </span>
  ) : (
    <>{item.titulo}</>
  );
}

export function PontosDeAtencao({ descricao, itens, variante = 'painel', className }: PontosDeAtencaoProps) {
  if (variante === 'recolhida') return <PontosRecolhidos descricao={descricao} itens={itens} className={className} />;
  return <PontosEmLista descricao={descricao} itens={itens} variante={variante} className={className} />;
}

const PONTOS_NO_RESUMO = 3;

function PontosRecolhidos({ descricao, itens, className }: Omit<PontosDeAtencaoProps, 'variante'>) {
  const [aberto, setAberto] = useState(false);
  const resumo = itens.slice(0, PONTOS_NO_RESUMO);
  const restantes = itens.length - resumo.length;

  return (
    <Painel
      aria-labelledby="titulo-pontos-de-atencao"
      espacamento="nenhum"
      className={juntarClasses(estilos.painel, estilos.painelRecolhido, aberto && estilos.recolhidoAberto, className)}
    >
      <h2 className={estilos.cabecaRecolhida}>
        <button
          type="button"
          className={estilos.alternarRecolhido}
          aria-expanded={aberto}
          aria-controls="lista-pontos-de-atencao"
          onClick={() => setAberto((atual) => !atual)}
        >
          <span id="titulo-pontos-de-atencao" className={estilos.tituloDoPainel}>
            {TITULO}
            <span className={juntarClasses(estilos.quantidade, 'numeros')}>{formatarNumero(itens.length)}</span>
          </span>
          {aberto ? (
            <span className={estilos.descricaoRecolhida}>{descricao}</span>
          ) : (
            <span className={estilos.resumoRecolhido} aria-hidden="true">
              {resumo.map((item) => {
                const Icone = item.icone;
                return (
                  <span key={item.chave} className={estilos.fichaRecolhida}>
                    <span className={juntarClasses(estilos.iconePequeno, estilos[item.tom])}>
                      <Icone size={12} strokeWidth={2.25} />
                    </span>
                    <span className={juntarClasses(estilos.textoDaFicha, item.objeto && 'codigo')}>
                      {item.objeto ? item.objeto.nome : item.titulo}
                    </span>
                  </span>
                );
              })}
              {restantes > 0 ? <span className={estilos.maisRecolhido}>e mais {formatarNumero(restantes)}</span> : null}
            </span>
          )}
          <span className={estilos.verRecolhido}>
            {aberto ? 'Recolher' : 'Ver todos'}
            <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
          </span>
        </button>
      </h2>
      {aberto ? (
        <ul className={juntarClasses(estilos.lista, estilos.listaRecolhida)} id="lista-pontos-de-atencao">
          {itens.map((item, posicao) => {
            const Icone = item.icone;
            return (
              <li
                key={item.chave}
                className={juntarClasses(estilos.item, 'item-em-cascata')}
                style={{ '--indice': posicao } as CSSProperties}
              >
                <span className={juntarClasses(estilos.icone, estilos[item.tom])} aria-hidden="true">
                  <Icone size={15} strokeWidth={2.25} />
                </span>
                <div className={estilos.textos}>
                  <p className={estilos.titulo}>
                    <TituloDoPonto item={item} />
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
      ) : (
        <span id="lista-pontos-de-atencao" hidden />
      )}
    </Painel>
  );
}

function PontosEmLista({
  descricao,
  itens,
  variante,
  className,
}: PontosDeAtencaoProps & { variante: Exclude<VarianteDosPontos, 'recolhida'> }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = pontosVisiveis(itens.length, expandido);
  const recolhivel = itens.length > PONTOS_SEM_RECOLHER;
  const ocultos = itens.length - PONTOS_A_MOSTRAR;
  const lateral = variante === 'lateral';

  return (
    <Painel
      aria-labelledby="titulo-pontos-de-atencao"
      className={juntarClasses(estilos.painel, lateral && estilos.painelLateral, className)}
    >
      <CabecalhoPainel
        titulo={
          <span id="titulo-pontos-de-atencao" className={estilos.tituloDoPainel}>
            {TITULO}
            {lateral ? (
              <span className={juntarClasses(estilos.quantidade, 'numeros')} aria-label={`${itens.length} pontos`}>
                {formatarNumero(itens.length)}
              </span>
            ) : null}
          </span>
        }
        descricao={descricao}
      />
      <ul className={juntarClasses(estilos.lista, lateral && estilos.listaLateral)} id="lista-pontos-de-atencao">
        {itens.slice(0, visiveis).map((item, posicao) => {
          const Icone = item.icone;
          const revelado = posicao >= PONTOS_A_MOSTRAR;
          const cascata = revelado ? ({ '--indice': posicao - PONTOS_A_MOSTRAR } as CSSProperties) : undefined;
          if (lateral) {
            return (
              <li
                key={item.chave}
                className={juntarClasses(estilos.itemLateral, revelado && 'item-em-cascata')}
                style={cascata}
              >
                <button type="button" className={estilos.botaoDoPonto} onClick={item.aoSeguir}>
                  <span className={juntarClasses(estilos.icone, estilos[item.tom])} aria-hidden="true">
                    <Icone size={15} strokeWidth={2.25} />
                  </span>
                  <span className={estilos.textos}>
                    <span className={estilos.titulo}>
                      <TituloDoPonto item={item} />
                    </span>
                    <span className={juntarClasses(estilos.frase, estilos.fraseRecortada)}>{item.texto}</span>
                    <span className={estilos.seguir}>
                      {item.acao}
                      <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li key={item.chave} className={juntarClasses(estilos.item, revelado && 'item-em-cascata')} style={cascata}>
              <span className={juntarClasses(estilos.icone, estilos[item.tom])} aria-hidden="true">
                <Icone size={15} strokeWidth={2.25} />
              </span>
              <div className={estilos.textos}>
                <p className={estilos.titulo}>
                  <TituloDoPonto item={item} />
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
        <div className={juntarClasses(estilos.alternar, lateral && estilos.alternarLateral)}>
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
  variante?: VarianteDosPontos;
  className?: string;
}

export function EsqueletoPontosDeAtencao({
  descricao,
  linhasPorFrase,
  variante = 'painel',
  className,
}: EsqueletoPontosDeAtencaoProps) {
  const recolhivel = linhasPorFrase.length > PONTOS_SEM_RECOLHER;
  const lateral = variante === 'lateral';
  const visiveis = linhasPorFrase.slice(0, pontosVisiveis(linhasPorFrase.length, false));

  if (variante === 'recolhida') {
    return (
      <Painel
        espacamento="nenhum"
        aria-hidden="true"
        className={juntarClasses(estilos.painel, estilos.painelRecolhido, className)}
      >
        <span className={estilos.alternarRecolhido}>
          <span className={estilos.tituloDoPainel}>
            {TITULO}
            <Esqueleto largura={22} altura={20} raio="var(--raio-pilula)" />
          </span>
          <span className={estilos.resumoRecolhido}>
            {[150, 120, 180].map((largura) => (
              <Esqueleto key={largura} largura={largura} altura={24} raio="var(--raio-sm)" />
            ))}
          </span>
          <Esqueleto largura={72} altura={14} />
        </span>
      </Painel>
    );
  }

  if (lateral) {
    return (
      <PainelEmEspera
        titulo={TITULO}
        descricao={descricao}
        className={juntarClasses(estilos.painel, estilos.painelLateral, className)}
      >
        <ul className={juntarClasses(estilos.lista, estilos.listaLateral)} aria-hidden="true">
          {visiveis.map((linhas, indice) => (
            <li key={indice} className={estilos.itemLateral}>
              <span className={estilos.botaoDoPonto}>
                <Esqueleto largura={26} altura={26} raio="var(--raio-sm)" />
                <span className={estilos.textos}>
                  <LinhaEmEspera largura={`${44 - ((indice * 7) % 12)}%`} className={estilos.titulo} />
                  {Array.from({ length: Math.min(linhas, 2) }, (_, linha) => (
                    <LinhaEmEspera
                      key={linha}
                      largura={linha === 0 ? `${94 - ((indice * 11) % 14)}%` : `${62 + ((indice * 13) % 24)}%`}
                      className={estilos.frase}
                    />
                  ))}
                  <LinhaEmEspera largura="22%" className={estilos.seguir} />
                </span>
              </span>
            </li>
          ))}
        </ul>
        {recolhivel ? (
          <div className={juntarClasses(estilos.alternar, estilos.alternarLateral)} aria-hidden="true">
            <Esqueleto largura={184} altura={32} raio="var(--raio-md)" />
          </div>
        ) : null}
      </PainelEmEspera>
    );
  }

  return (
    <PainelEmEspera titulo={TITULO} descricao={descricao} className={juntarClasses(estilos.painel, className)}>
      <ul className={estilos.lista} aria-hidden="true">
        {visiveis.map((linhas, indice) => (
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
