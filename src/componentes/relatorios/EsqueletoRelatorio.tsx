import type { CSSProperties, ReactNode } from 'react';
import { CabecalhoPainel, Esqueleto, Painel } from '@/componentes/ui';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './EsqueletoRelatorio.module.css';

const ESMAECIMENTO_DAS_LINHAS = 0.6;

interface RelatorioEmEsperaProps {
  rotulo: string;
  imediato?: boolean;
  className?: string;
  children: ReactNode;
}

export function RelatorioEmEspera({ rotulo, imediato = false, className, children }: RelatorioEmEsperaProps) {
  return (
    <div className={className} style={imediato ? ({ '--espera-esqueleto': '0ms' } as CSSProperties) : undefined}>
      <span className="visualmente-oculto" role="status">
        {rotulo}
      </span>
      {children}
    </div>
  );
}

interface LinhaEmEsperaProps {
  largura: number | string;
  altura?: number;
  className?: string;
}

export function LinhaEmEspera({ largura, altura = 12, className }: LinhaEmEsperaProps) {
  return (
    <span className={juntarClasses(estilos.linha, className)}>
      <Esqueleto largura={largura} altura={altura} />
    </span>
  );
}

interface PainelEmEsperaProps {
  titulo: string;
  descricao?: string;
  larguraDaAcao?: number;
  acao?: ReactNode;
  espacamento?: 'nenhum' | 'md';
  className?: string;
  classeCabecalho?: string;
  children: ReactNode;
}

export function PainelEmEspera({
  titulo,
  descricao,
  larguraDaAcao,
  acao,
  espacamento = 'md',
  className,
  classeCabecalho,
  children,
}: PainelEmEsperaProps) {
  const cabecalho = (
    <CabecalhoPainel
      titulo={titulo}
      descricao={
        descricao ?? (
          <>
            <LinhaEmEspera largura="min(27rem, 92%)" />
            <LinhaEmEspera largura="min(7rem, 36%)" />
          </>
        )
      }
      acao={
        acao ?? (larguraDaAcao ? <Esqueleto largura={larguraDaAcao} altura={32} raio="var(--raio-md)" /> : undefined)
      }
    />
  );

  return (
    <Painel espacamento={espacamento} className={className} aria-hidden="true">
      {classeCabecalho ? <div className={classeCabecalho}>{cabecalho}</div> : cabecalho}
      {children}
    </Painel>
  );
}

interface GraficosEmEsperaProps {
  alturas: number[];
  comLegenda?: boolean;
}

export function GraficosEmEspera({ alturas, comLegenda = false }: GraficosEmEsperaProps) {
  return (
    <div className={estilos.graficos}>
      {comLegenda ? (
        <div className={estilos.legenda}>
          <Esqueleto largura={120} altura={12} />
          <Esqueleto largura={120} altura={12} />
        </div>
      ) : null}
      {alturas.map((altura, indice) => (
        <div key={indice}>
          <LinhaEmEspera largura={indice % 2 === 0 ? 132 : 168} className={estilos.tituloDoGrafico} />
          <Esqueleto altura={altura} raio="var(--raio-md)" />
        </div>
      ))}
    </div>
  );
}

interface TabelaEmEsperaProps {
  linhas: number;
  alturaDaLinha: number;
  alturaDoCabecalho: number;
}

export function TabelaEmEspera({ linhas, alturaDaLinha, alturaDoCabecalho }: TabelaEmEsperaProps) {
  return (
    <div className={estilos.tabela}>
      <div className={estilos.cabecalhoDaTabela} style={{ height: alturaDoCabecalho }}>
        <Esqueleto largura={64} altura={10} />
        <span className={estilos.medidas}>
          <Esqueleto largura={72} altura={10} />
          <Esqueleto largura={72} altura={10} />
          <Esqueleto largura={72} altura={10} />
        </span>
      </div>
      {Array.from({ length: linhas }, (_, indice) => (
        <div
          key={indice}
          className={estilos.linhaDaTabela}
          style={{ height: alturaDaLinha, opacity: 1 - indice * (ESMAECIMENTO_DAS_LINHAS / linhas) }}
        >
          <span className={estilos.textoDaLinha}>
            <LinhaEmEspera largura={`${86 - ((indice * 23) % 40)}%`} />
            {indice % 2 === 1 ? <LinhaEmEspera largura={`${48 - ((indice * 13) % 24)}%`} /> : null}
          </span>
          <span className={estilos.medidas}>
            <Esqueleto largura={56} altura={12} />
            <Esqueleto largura={56} altura={12} />
            <Esqueleto largura={84} altura={22} raio="var(--raio-sm)" />
          </span>
        </div>
      ))}
    </div>
  );
}

interface DesempenhoEmEsperaProps {
  barras: number;
  frases: number;
  alturaMinima: number;
}

export function DesempenhoEmEspera({ barras, frases, alturaMinima }: DesempenhoEmEsperaProps) {
  return (
    <div className={estilos.desempenho} style={{ minHeight: alturaMinima }}>
      <div className={estilos.barras}>
        <div className={estilos.frases}>
          {Array.from({ length: frases }, (_, indice) => (
            <LinhaEmEspera key={indice} largura={indice === frases - 1 ? '34%' : '88%'} />
          ))}
        </div>
        {Array.from({ length: barras }, (_, indice) => (
          <Esqueleto key={indice} altura={14} raio="var(--raio-xs)" />
        ))}
      </div>
      <div className={estilos.faixas}>
        {Array.from({ length: 4 }, (_, indice) => (
          <div key={indice} className={estilos.faixa}>
            <Esqueleto largura={indice === 0 ? 48 : 96} altura={indice === 0 ? 10 : 12} />
            <span className={estilos.medidas}>
              <Esqueleto largura={48} altura={indice === 0 ? 10 : 12} />
              <Esqueleto largura={48} altura={indice === 0 ? 10 : 12} />
              <Esqueleto largura={48} altura={indice === 0 ? 10 : 12} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
