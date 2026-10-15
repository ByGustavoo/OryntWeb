import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { CampoSelecao, Esqueleto } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO, DirecaoOrdenacao, OrdenacaoConsultas } from '@/modelos/consultas';
import { formatarDuracaoMs, formatarNumero, formatarPercentual } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './TabelaTodasConsultas.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoConsultas;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoConsultas) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoConsultas) => void;
}

interface TabelaTodasConsultasProps extends OrdenacaoDaTabelaProps {
  consultas: ConsultaDetalhadaDTO[];
  termos: string[];
  idAberta: string | null;
  aoAbrir: (consulta: ConsultaDetalhadaDTO) => void;
}

interface EsqueletoTodasConsultasProps extends OrdenacaoDaTabelaProps {
  linhas: number;
  imediato?: boolean;
}

const colunasOrdenaveis: { ordenacao: OrdenacaoConsultas; rotulo: string; rotuloOrdenacao: string }[] = [
  { ordenacao: 'TEMPO_MEDIO', rotulo: 'Tempo médio', rotuloOrdenacao: 'Maior tempo médio' },
  { ordenacao: 'TEMPO_MAXIMO', rotulo: 'Tempo máximo', rotuloOrdenacao: 'Maior tempo máximo' },
  { ordenacao: 'EXECUCOES', rotulo: 'Execuções', rotuloOrdenacao: 'Mais execuções' },
  { ordenacao: 'PERCENTUAL_TEMPO_TOTAL', rotulo: '% do tempo total', rotuloOrdenacao: 'Maior parte do tempo total' },
];

const opcoesOrdenacao = colunasOrdenaveis.map(({ ordenacao, rotuloOrdenacao }) => ({ valor: ordenacao, rotulo: rotuloOrdenacao }));

const ESMAECIMENTO_DO_ESQUELETO = 0.6;

function MolduraDaTabela({
  ordenacao,
  direcao,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  children,
}: OrdenacaoDaTabelaProps & { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <CampoSelecao
        id="ordenacao-todas-consultas"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Consultas executadas pelo banco no período. Use os cabeçalhos para mudar a ordenação e abra uma consulta para ver
          os detalhes.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaConsulta}>
              Consulta
            </th>
            {colunasOrdenaveis.map((coluna) => {
              const ativa = ordenacao === coluna.ordenacao;
              const Icone = !ativa ? ArrowUpDown : direcao === 'DESC' ? ArrowDown : ArrowUp;
              return (
                <th
                  key={coluna.ordenacao}
                  scope="col"
                  className={estilos.colunaNumerica}
                  aria-sort={ativa ? (direcao === 'DESC' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    className={juntarClasses(estilos.ordenar, ativa && estilos.ordenarAtivo)}
                    onClick={() => aoAlternarOrdenacao(coluna.ordenacao)}
                  >
                    {coluna.rotulo}
                    <Icone size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
            <th scope="col" className={estilos.colunaDesempenho}>
              Desempenho
            </th>
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function EsqueletoTodasConsultas({ linhas, imediato = false, ...ordenacaoDaTabela }: EsqueletoTodasConsultasProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as consultas…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaConsulta}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${88 - ((indice * 23) % 46)}%`} altura={12} imediato={imediato} />
                </span>
                {indice % 2 === 1 ? (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={`${52 - ((indice * 13) % 28)}%`} altura={12} imediato={imediato} />
                  </span>
                ) : null}
              </td>
              {colunasOrdenaveis.slice(0, 3).map((coluna) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={52} altura={12} imediato={imediato} />
                  </span>
                </td>
              ))}
              <td className={estilos.celulaNumerica} data-rotulo="% do tempo total">
                <span className={estilos.participacao}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={40} altura={12} imediato={imediato} />
                  </span>
                  <Esqueleto altura={4} raio="var(--raio-pilula)" imediato={imediato} />
                </span>
              </td>
              <td className={estilos.celulaDesempenho} data-rotulo="Desempenho">
                <Esqueleto largura={89} altura={22} raio="var(--raio-sm)" imediato={imediato} />
              </td>
              <td className={estilos.celulaSeta}>
                <span className={estilos.lugarDaSeta} />
              </td>
            </tr>
          ))}
        </tbody>
      </MolduraDaTabela>
    </>
  );
}

export function TabelaTodasConsultas({
  consultas,
  termos,
  ordenacao,
  direcao,
  idAberta,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaTodasConsultasProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (idAberta === null) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, consulta: ConsultaDetalhadaDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(consulta);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <MolduraDaTabela
      ordenacao={ordenacao}
      direcao={direcao}
      aoAlternarOrdenacao={aoAlternarOrdenacao}
      aoEscolherOrdenacao={aoEscolherOrdenacao}
    >
      <tbody ref={corpo} className={entrando ? estilos.entrando : undefined}>
        {consultas.map((consulta, indice) => (
          <tr
            key={consulta.id}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-consulta={consulta.id}
            aria-current={consulta.id === idAberta ? 'true' : undefined}
            style={{ '--indice': indice } as CSSProperties}
            onClick={(evento) => abrir(evento, consulta)}
            onAnimationEnd={indice === consultas.length - 1 ? encerrarEntrada : undefined}
          >
            <td className={estilos.celulaConsulta}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                <TrechoSql sql={consulta.sql} termos={termos} dica={false} />
                <span className="visualmente-oculto">. Ver os detalhes desta consulta</span>
              </button>
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Tempo médio">
              {formatarDuracaoMs(consulta.tempoMedioMs)}
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Tempo máximo">
              {formatarDuracaoMs(consulta.tempoMaximoMs)}
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Execuções">
              {formatarNumero(consulta.quantidadeExecucoes)}
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="% do tempo total">
              <span className={estilos.participacao}>
                {formatarPercentual(consulta.percentualTempoTotal)}
                <span className={estilos.trilho} aria-hidden="true">
                  <span className={estilos.preenchimento} style={{ width: `${Math.min(100, consulta.percentualTempoTotal)}%` }} />
                </span>
              </span>
            </td>
            <td className={estilos.celulaDesempenho} data-rotulo="Desempenho">
              <SeloDesempenho desempenho={consulta.desempenho} />
            </td>
            <td className={estilos.celulaSeta} aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2} />
            </td>
          </tr>
        ))}
      </tbody>
    </MolduraDaTabela>
  );
}
