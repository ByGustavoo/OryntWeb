import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, Minus } from 'lucide-react';
import { ConsultaSql } from '@/componentes/comum/ConsultaSql';
import { CampoSelecao, Esqueleto } from '@/componentes/ui';
import type { ConsultaResumoDTO } from '@/modelos/dashboard';
import { formatarDuracaoMs, formatarNumero, formatarPercentual, formatarVariacao } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloDesempenho } from './SeloDesempenho';
import estilos from './TabelaConsultas.module.css';

type ColunaOrdenavel = 'percentualTempoTotal' | 'tempoMedioMs' | 'quantidadeExecucoes';
type Direcao = 'asc' | 'desc';

export interface OrdenacaoDaTabela {
  coluna: ColunaOrdenavel;
  direcao: Direcao;
}

interface OrdenacaoControlada {
  ordenacao?: OrdenacaoDaTabela;
  aoOrdenar?: (ordenacao: OrdenacaoDaTabela) => void;
}

export interface ConsultaDaTabela extends ConsultaResumoDTO {
  variacaoTempoMedio?: number | null;
}

interface TabelaConsultasProps extends OrdenacaoControlada {
  consultas: ConsultaDaTabela[];
  referenciaVariacao?: string;
  rotuloHistorico?: string;
  aoVerHistorico?: (consulta: ConsultaDaTabela) => void;
  aoVerPlano?: (consulta: ConsultaDaTabela) => void;
}

interface EsqueletoTabelaConsultasProps extends OrdenacaoControlada {
  linhas: number;
}

interface MolduraDaTabelaProps {
  ordenacao: OrdenacaoDaTabela;
  aoOrdenar: (ordenacao: OrdenacaoDaTabela) => void;
  referenciaVariacao?: string;
  children: ReactNode;
}

const colunasOrdenaveis: { coluna: ColunaOrdenavel; rotulo: string; rotuloOrdenacao: string }[] = [
  { coluna: 'tempoMedioMs', rotulo: 'Tempo médio', rotuloOrdenacao: 'Maior tempo médio' },
  { coluna: 'quantidadeExecucoes', rotulo: 'Execuções', rotuloOrdenacao: 'Mais execuções' },
  { coluna: 'percentualTempoTotal', rotulo: '% do tempo total', rotuloOrdenacao: 'Maior parte do tempo total' },
];

const ORDENACAO_INICIAL: OrdenacaoDaTabela = { coluna: 'percentualTempoTotal', direcao: 'desc' };
const ESMAECIMENTO_DO_ESQUELETO = 0.6;

function ordenar(consultas: ConsultaDaTabela[], { coluna, direcao }: OrdenacaoDaTabela): ConsultaDaTabela[] {
  const sentido = direcao === 'asc' ? 1 : -1;
  return [...consultas].sort((a, b) => (a[coluna] - b[coluna]) * sentido);
}

function useOrdenacao({
  ordenacao,
  aoOrdenar,
}: OrdenacaoControlada): [OrdenacaoDaTabela, (ordenacao: OrdenacaoDaTabela) => void] {
  const [propria, setPropria] = useState(ORDENACAO_INICIAL);
  return [ordenacao ?? propria, aoOrdenar ?? setPropria];
}

function VariacaoTempo({ valor, referencia }: { valor: number | null; referencia: string }) {
  if (valor === null) return <span className={estilos.variacao}>Sem comparação</span>;
  const Icone = valor > 0 ? ArrowUpRight : valor < 0 ? ArrowDownRight : Minus;
  const tom = valor < 0 ? estilos.melhora : valor > 0 ? estilos.piora : undefined;
  return (
    <span className={juntarClasses(estilos.variacao, tom)}>
      <Icone size={12} strokeWidth={2.25} aria-hidden="true" />
      {formatarVariacao(valor)}
      <span className="visualmente-oculto"> em relação {referencia}</span>
    </span>
  );
}

function MolduraDaTabela({ ordenacao, aoOrdenar, referenciaVariacao, children }: MolduraDaTabelaProps) {
  const alternar = (coluna: ColunaOrdenavel) => {
    const inverter = ordenacao.coluna === coluna && ordenacao.direcao === 'desc';
    aoOrdenar({ coluna, direcao: inverter ? 'asc' : 'desc' });
  };

  return (
    <div className={estilos.conteiner}>
      <CampoSelecao
        id="ordenacao-consultas"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={colunasOrdenaveis.map(({ coluna, rotuloOrdenacao }) => ({ valor: coluna, rotulo: rotuloOrdenacao }))}
        valor={ordenacao.coluna}
        aoMudar={(coluna) => coluna && aoOrdenar({ coluna, direcao: 'desc' })}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Consultas que mais consomem tempo do banco no período
          {referenciaVariacao ? `, com a variação do tempo médio em relação ${referenciaVariacao}` : ''}. Use os cabeçalhos para
          mudar a ordenação.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaConsulta}>
              Consulta
            </th>
            {colunasOrdenaveis.map(({ coluna, rotulo }) => {
              const ativa = ordenacao.coluna === coluna;
              const Icone = !ativa ? ArrowUpDown : ordenacao.direcao === 'desc' ? ArrowDown : ArrowUp;
              return (
                <th
                  key={coluna}
                  scope="col"
                  className={estilos.colunaNumerica}
                  aria-sort={ativa ? (ordenacao.direcao === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    className={juntarClasses(estilos.ordenar, ativa && estilos.ordenarAtivo)}
                    onClick={() => alternar(coluna)}
                  >
                    {rotulo}
                    <Icone size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
            <th scope="col" className={estilos.colunaDesempenho}>
              Desempenho
            </th>
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function EsqueletoTabelaConsultas({ linhas, ...controlada }: EsqueletoTabelaConsultasProps) {
  const [ordenacao, aoOrdenar] = useOrdenacao(controlada);

  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as consultas…
      </span>
      <MolduraDaTabela ordenacao={ordenacao} aoOrdenar={aoOrdenar}>
        <tbody className={estilos.emEspera} aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaConsulta}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${88 - ((indice * 23) % 46)}%`} altura={12} />
                </span>
                <span className={juntarClasses(estilos.linhaEmEspera, estilos.segundaLinha)}>
                  <Esqueleto largura={`${52 - ((indice * 13) % 28)}%`} altura={12} />
                </span>
                <span className={juntarClasses(estilos.linhaEmEspera, estilos.terceiraLinha)}>
                  <Esqueleto largura={`${34 - ((indice * 7) % 18)}%`} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Tempo médio">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={52} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Execuções">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={52} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="% do tempo total">
                <span className={estilos.participacao}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={40} altura={12} />
                  </span>
                  <Esqueleto altura={4} raio="var(--raio-pilula)" />
                </span>
              </td>
              <td className={estilos.celulaDesempenho} data-rotulo="Desempenho">
                <Esqueleto largura={89} altura={22} raio="var(--raio-sm)" />
              </td>
            </tr>
          ))}
        </tbody>
      </MolduraDaTabela>
    </>
  );
}

export function TabelaConsultas({
  consultas,
  referenciaVariacao,
  rotuloHistorico,
  aoVerHistorico,
  aoVerPlano,
  ...controlada
}: TabelaConsultasProps) {
  const [ordenacao, aoOrdenar] = useOrdenacao(controlada);
  const [entrando, setEntrando] = useState(true);
  const ordenadas = useMemo(() => ordenar(consultas, ordenacao), [consultas, ordenacao]);

  return (
    <MolduraDaTabela ordenacao={ordenacao} aoOrdenar={aoOrdenar} referenciaVariacao={referenciaVariacao}>
      <tbody className={entrando ? estilos.entrando : undefined}>
        {ordenadas.map((consulta, indice) => (
          <tr
            key={consulta.id}
            className={entrando ? 'item-em-cascata' : undefined}
            style={{ '--indice': indice } as CSSProperties}
          >
            <td className={estilos.celulaConsulta}>
              <ConsultaSql
                sql={consulta.sql}
                classeAcoes={estilos.acoesConsulta}
                rotuloHistorico={rotuloHistorico}
                aoVerHistorico={aoVerHistorico ? () => aoVerHistorico(consulta) : undefined}
                aoVerPlano={aoVerPlano ? () => aoVerPlano(consulta) : undefined}
              />
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Tempo médio">
              <span className={estilos.tempo}>
                {formatarDuracaoMs(consulta.tempoMedioMs)}
                {referenciaVariacao ? (
                  <VariacaoTempo valor={consulta.variacaoTempoMedio ?? null} referencia={referenciaVariacao} />
                ) : null}
              </span>
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Execuções">
              {formatarNumero(consulta.quantidadeExecucoes)}
            </td>
            <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="% do tempo total">
              <span className={estilos.participacao}>
                {formatarPercentual(consulta.percentualTempoTotal)}
                <span className={estilos.trilho} aria-hidden="true">
                  <span
                    className={estilos.preenchimento}
                    style={{ width: `${Math.min(100, consulta.percentualTempoTotal)}%` }}
                    onAnimationEnd={indice === ordenadas.length - 1 ? () => setEntrando(false) : undefined}
                  />
                </span>
              </span>
            </td>
            <td className={estilos.celulaDesempenho} data-rotulo="Desempenho">
              <SeloDesempenho desempenho={consulta.desempenho} />
            </td>
          </tr>
        ))}
      </tbody>
    </MolduraDaTabela>
  );
}
