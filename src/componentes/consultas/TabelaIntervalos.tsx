import { useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Botao, CampoSelecao, Esqueleto, Selo } from '@/componentes/ui';
import type { PontoHistoricoDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import {
  alternarOrdemDosIntervalos,
  intervalosRecolhiveis,
  ordenarIntervalos,
  pontoComMaisExecucoes,
  pontoMaisLento,
  quantidadeVisivel,
  recortarIntervalos,
  rotuloCurtoDoAlternador,
  rotuloDosIntervalosOcultos,
  rotuloParaRecolher,
  textosDoIntervalo,
} from '@/regras/historicoConsulta';
import type { OrdemDosIntervalos, OrdenacaoIntervalos } from '@/regras/historicoConsulta';
import { formatarDuracaoMs, formatarNumero } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './TabelaIntervalos.module.css';

interface OrdemDaTabelaProps {
  periodo: PeriodoDashboard;
  ordem: OrdemDosIntervalos;
  aoOrdenar: (ordem: OrdemDosIntervalos) => void;
}

interface ExpansaoDaTabelaProps {
  expandido: boolean;
  aoExpandir: (expandido: boolean) => void;
}

interface MolduraProps extends OrdemDaTabelaProps {
  children: ReactNode;
}

interface TabelaIntervalosProps extends OrdemDaTabelaProps {
  expandido: boolean;
  pontos: PontoHistoricoDTO[];
  intervalosComTroca?: string[];
}

interface EsqueletoIntervalosProps extends OrdemDaTabelaProps {
  total: number;
  expandido: boolean;
}

interface AlternarIntervalosProps extends ExpansaoDaTabelaProps {
  periodo: PeriodoDashboard;
  ordem: OrdemDosIntervalos;
  total: number;
  emEspera?: boolean;
}

type OrdemCompacta = `${OrdenacaoIntervalos}:${OrdemDosIntervalos['direcao']}`;

const ESMAECIMENTO_DO_ESQUELETO = 0.6;

const ID_DAS_LINHAS = 'linhas-intervalos-historico';

const medidasOrdenaveis: { ordenacao: OrdenacaoIntervalos; rotulo: string }[] = [
  { ordenacao: 'EXECUCOES', rotulo: 'Execuções' },
  { ordenacao: 'TEMPO_MEDIO', rotulo: 'Tempo médio' },
  { ordenacao: 'TEMPO_MAXIMO', rotulo: 'Tempo máximo' },
];

const ordensCompactas: { valor: OrdemCompacta; rotulo: string }[] = [
  { valor: 'INSTANTE:ASC', rotulo: 'Mais antigo primeiro' },
  { valor: 'INSTANTE:DESC', rotulo: 'Mais recente primeiro' },
  { valor: 'EXECUCOES:DESC', rotulo: 'Mais execuções' },
  { valor: 'TEMPO_MEDIO:DESC', rotulo: 'Maior tempo médio' },
  { valor: 'TEMPO_MAXIMO:DESC', rotulo: 'Maior tempo máximo' },
];

function lerOrdemCompacta(valor: OrdemCompacta): OrdemDosIntervalos {
  const [ordenacao, direcao] = valor.split(':') as [OrdenacaoIntervalos, OrdemDosIntervalos['direcao']];
  return { ordenacao, direcao };
}

function Moldura({ periodo, ordem, aoOrdenar, children }: MolduraProps) {
  const tabela = useRef<HTMLTableElement>(null);
  const compacta: OrdemCompacta = `${ordem.ordenacao}:${ordem.direcao}`;

  const ordenarDoCabecalho = (nova: OrdemDosIntervalos) => {
    const celula = tabela.current?.tHead?.rows[0]?.cells[0];
    if (tabela.current && celula) {
      const topoFixo = parseFloat(getComputedStyle(celula).top);
      const topo = tabela.current.getBoundingClientRect().top;
      if (topo < topoFixo) {
        window.scrollBy({ top: topo - topoFixo, behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
      }
    }
    aoOrdenar(nova);
  };

  const cabecalho = (ordenacao: OrdenacaoIntervalos, rotulo: string, numerica: boolean) => {
    const ativa = ordem.ordenacao === ordenacao;
    const Icone = !ativa ? ArrowUpDown : ordem.direcao === 'DESC' ? ArrowDown : ArrowUp;
    return (
      <th
        key={ordenacao}
        scope="col"
        className={numerica ? estilos.colunaNumerica : undefined}
        aria-sort={ativa ? (ordem.direcao === 'DESC' ? 'descending' : 'ascending') : 'none'}
      >
        <button
          type="button"
          className={juntarClasses(estilos.ordenar, ativa && estilos.ordenarAtivo)}
          onClick={() => ordenarDoCabecalho(alternarOrdemDosIntervalos(ordem, ordenacao))}
        >
          {rotulo}
          <Icone size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className={estilos.conteiner}>
      <CampoSelecao
        id="ordenacao-intervalos"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={ordensCompactas}
        valor={ordensCompactas.some((opcao) => opcao.valor === compacta) ? compacta : null}
        textoVazio="Outra ordem"
        aoMudar={(valor) => valor && aoOrdenar(lerOrdemCompacta(valor))}
      />

      <table ref={tabela} className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Execuções, tempo médio e tempo máximo da consulta em cada {textosDoIntervalo[periodo].unidade} do período. Use os
          cabeçalhos para mudar a ordenação.
        </caption>
        <thead>
          <tr>
            {cabecalho('INSTANTE', textosDoIntervalo[periodo].coluna, false)}
            {medidasOrdenaveis.map(({ ordenacao, rotulo }) => cabecalho(ordenacao, rotulo, true))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function Duracao({ valor }: { valor: number | null }) {
  if (valor === null) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="visualmente-oculto">Sem execuções</span>
      </>
    );
  }
  return <>{formatarDuracaoMs(valor)}</>;
}

export function TabelaIntervalos({
  pontos,
  periodo,
  ordem,
  aoOrdenar,
  expandido,
  intervalosComTroca = [],
}: TabelaIntervalosProps) {
  const textos = textosDoIntervalo[periodo];
  const maisExecucoes = pontoComMaisExecucoes(pontos);
  const maisLento = pontoMaisLento(pontos);
  const maiorVolume = Math.max(1, maisExecucoes?.quantidadeExecucoes ?? 0);
  const ordenados = useMemo(() => ordenarIntervalos(pontos, ordem), [pontos, ordem]);
  const { visiveis } = recortarIntervalos(ordenados, ordem, expandido);

  return (
    <Moldura periodo={periodo} ordem={ordem} aoOrdenar={aoOrdenar}>
      <tbody id={ID_DAS_LINHAS}>
        {visiveis.map((ponto) => {
          const semExecucoes = ponto.quantidadeExecucoes === 0;
          return (
            <tr key={ponto.instante} className={semExecucoes ? estilos.semExecucoes : undefined}>
              <th scope="row" className={estilos.intervalo}>
                <span className={estilos.rotuloDoIntervalo}>
                  <span className="numeros">{textos.linha(ponto.instante)}</span>
                  {ponto === maisLento ? <Selo tom="aviso">Mais lento</Selo> : null}
                  {ponto === maisExecucoes ? <Selo tom="destaque">Mais execuções</Selo> : null}
                  {intervalosComTroca.includes(ponto.instante) ? <Selo tom="info">Novo plano</Selo> : null}
                </span>
              </th>
              <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Execuções">
                <span className={estilos.volume}>
                  {formatarNumero(ponto.quantidadeExecucoes)}
                  <span className={estilos.trilho} aria-hidden="true">
                    <span
                      className={estilos.preenchimento}
                      style={{ '--parte': ponto.quantidadeExecucoes / maiorVolume } as CSSProperties}
                    />
                  </span>
                </span>
              </td>
              <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Tempo médio">
                <Duracao valor={ponto.tempoMedioMs} />
              </td>
              <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Tempo máximo">
                <Duracao valor={ponto.tempoMaximoMs} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </Moldura>
  );
}

export function AlternarIntervalos({ periodo, ordem, total, expandido, aoExpandir, emEspera = false }: AlternarIntervalosProps) {
  if (!intervalosRecolhiveis(total)) return null;

  const ocultos = total - quantidadeVisivel(total, expandido);
  const botao = (
    <Botao
      variante="secundario"
      icone={expandido ? ChevronsDownUp : ChevronsUpDown}
      aria-expanded={expandido}
      aria-controls={emEspera ? undefined : ID_DAS_LINHAS}
      tabIndex={emEspera ? -1 : undefined}
      onClick={() => aoExpandir(!expandido)}
    >
      <span className={estilos.rotuloLongo}>
        {expandido ? rotuloParaRecolher(periodo, ordem) : rotuloDosIntervalosOcultos(periodo, ordem, ocultos)}
      </span>
      <span className={estilos.rotuloCurto} aria-hidden="true">
        {rotuloCurtoDoAlternador(periodo, total, expandido)}
      </span>
    </Botao>
  );

  if (!emEspera) return botao;
  return (
    <span className={estilos.reserva}>
      {botao}
      <Esqueleto altura="100%" raio="var(--raio-md)" className={estilos.esqueletoDaReserva} />
    </span>
  );
}

export function EsqueletoIntervalos({ total, expandido, ...ordemDaTabela }: EsqueletoIntervalosProps) {
  const linhas = quantidadeVisivel(total, expandido);
  return (
    <Moldura {...ordemDaTabela}>
      <tbody id={ID_DAS_LINHAS} aria-hidden="true">
        {Array.from({ length: linhas }, (_, indice) => (
          <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
            <th scope="row" className={estilos.intervalo}>
              <span className={estilos.linhaEmEspera}>
                <Esqueleto largura={96 + ((indice * 17) % 32)} altura={12} />
              </span>
            </th>
            <td className={estilos.celulaNumerica} data-rotulo="Execuções">
              <span className={estilos.volume}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={44} altura={12} />
                </span>
                <Esqueleto altura={4} raio="var(--raio-pilula)" />
              </span>
            </td>
            {['Tempo médio', 'Tempo máximo'].map((rotulo) => (
              <td key={rotulo} className={estilos.celulaNumerica} data-rotulo={rotulo}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={52} altura={12} />
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Moldura>
  );
}
