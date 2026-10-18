import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Botao, CabecalhoPainel, Esqueleto, Painel } from '@/componentes/ui';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import estilos from './PontosDeAtencao.module.css';

const TITULO = 'Pontos de atenção';

export type TomDoPonto = 'aviso' | 'erro' | 'info';

export interface ItemDeAtencao {
  chave: string;
  tom: TomDoPonto;
  icone: LucideIcon;
  objeto: { esquema: string; nome: string } | null;
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
  return (
    <Painel aria-labelledby="titulo-pontos-de-atencao" className={estilos.painel}>
      <CabecalhoPainel titulo={<span id="titulo-pontos-de-atencao">{TITULO}</span>} descricao={descricao} />
      <ul className={estilos.lista}>
        {itens.map((item) => {
          const Icone = item.icone;
          return (
            <li key={item.chave} className={estilos.item}>
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
    </Painel>
  );
}

interface EsqueletoPontosDeAtencaoProps {
  descricao: string;
  linhasPorFrase: number[];
}

export function EsqueletoPontosDeAtencao({ descricao, linhasPorFrase }: EsqueletoPontosDeAtencaoProps) {
  return (
    <PainelEmEspera titulo={TITULO} descricao={descricao} className={estilos.painel}>
      <ul className={estilos.lista} aria-hidden="true">
        {linhasPorFrase.map((linhas, indice) => (
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
    </PainelEmEspera>
  );
}
