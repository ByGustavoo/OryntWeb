import { useMemo, useState } from 'react';
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, History, ListTree, Minus } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { BotaoIcone, CabecalhoPainel, CampoSelecao, Dica, GrupoOpcoes, Painel } from '@/componentes/ui';
import { rotuloDesempenho } from '@/modelos/rotulos';
import { filtrarConsultas, resumirTendencias } from '@/regras/comparacaoRelatorio';
import type { ConsultaComparada, FiltroConsultas, RotulosDaComparacao } from '@/regras/comparacaoRelatorio';
import { formatarComSinal, formatarDuracaoMs, formatarNumero, formatarVariacao } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { PainelEmEspera, TabelaEmEspera } from './EsqueletoRelatorio';
import estilos from './ConsultasComparadas.module.css';

const TITULO = 'Consultas que mudaram';

type ColunaOrdenavel = 'variacao' | 'tempoMedio' | 'execucoes';
type Direcao = 'asc' | 'desc';

interface Ordenacao {
  coluna: ColunaOrdenavel;
  direcao: Direcao;
}

interface ConsultasComparadasProps {
  consultas: ConsultaComparada[];
  rotulos: RotulosDaComparacao;
  titulos: RotulosDaComparacao;
  rotuloHistorico?: string;
  aoVerHistorico?: (consulta: ConsultaComparada) => void;
  aoVerPlano?: (consulta: ConsultaComparada) => void;
}

const ORDENACAO_INICIAL: Ordenacao = { coluna: 'variacao', direcao: 'desc' };
const METADE_DO_TRILHO = 50;

const rotuloOrdenacao: Record<ColunaOrdenavel, string> = {
  variacao: 'Maior alta do tempo médio',
  execucoes: 'Mais execuções no período',
  tempoMedio: 'Maior tempo médio no período',
};

const opcoesDeFiltro: { valor: FiltroConsultas; rotulo: string }[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'PIORARAM', rotulo: 'Pioraram' },
  { valor: 'MELHORARAM', rotulo: 'Melhoraram' },
];

const semResultado: Record<FiltroConsultas, string> = {
  TODAS: 'Nenhuma consulta nos dois períodos.',
  PIORARAM: 'Nenhuma consulta ficou mais lenta.',
  MELHORARAM: 'Nenhuma consulta ficou mais rápida.',
};

const leitores: Record<ColunaOrdenavel, (consulta: ConsultaComparada) => number | null> = {
  variacao: (consulta) => consulta.variacaoTempoMedio,
  tempoMedio: (consulta) => consulta.principal?.tempoMedioMs ?? null,
  execucoes: (consulta) => consulta.principal?.quantidadeExecucoes ?? null,
};

function ordenar(consultas: ConsultaComparada[], { coluna, direcao }: Ordenacao): ConsultaComparada[] {
  const ler = leitores[coluna];
  const sentido = direcao === 'asc' ? 1 : -1;
  return [...consultas].sort((a, b) => {
    const valorA = ler(a);
    const valorB = ler(b);
    if (valorA === null || valorB === null) return Number(valorA === null) - Number(valorB === null);
    return (valorA - valorB) * sentido;
  });
}

function Ausente({ rotulo }: { rotulo: string }) {
  return (
    <Dica conteudo={`Fora da lista das consultas que mais pesaram em ${rotulo}`}>
      <span className={estilos.ausente}>
        <span aria-hidden="true">—</span>
        <span className="visualmente-oculto">Fora da lista das consultas que mais pesaram em {rotulo}</span>
      </span>
    </Dica>
  );
}

function Variacao({ consulta, maiorVariacao }: { consulta: ConsultaComparada; maiorVariacao: number }) {
  const { variacaoTempoMedio: variacao, diferencaTempoMedioMs: diferenca, tendencia } = consulta;
  if (variacao === null || diferenca === null) return <span className={estilos.semComparacao}>Sem comparação</span>;

  const Icone = tendencia === 'PIOROU' ? ArrowUpRight : tendencia === 'MELHOROU' ? ArrowDownRight : Minus;
  const tom = tendencia === 'PIOROU' ? estilos.piora : tendencia === 'MELHOROU' ? estilos.melhora : undefined;
  const alcance = maiorVariacao > 0 ? (Math.abs(variacao) / maiorVariacao) * METADE_DO_TRILHO : 0;

  return (
    <span className={estilos.variacao}>
      <span className={juntarClasses(estilos.percentual, tom)}>
        <Icone size={13} strokeWidth={2.25} aria-hidden="true" />
        {formatarVariacao(variacao)}
      </span>
      <span className={estilos.trilho} aria-hidden="true">
        <span
          className={juntarClasses(estilos.preenchimento, tom)}
          style={variacao >= 0 ? { left: '50%', width: `${alcance}%` } : { right: '50%', width: `${alcance}%` }}
        />
      </span>
      <span className={estilos.detalhe}>{formatarComSinal(diferenca, formatarDuracaoMs)}</span>
    </span>
  );
}

export function ConsultasComparadas({
  consultas,
  rotulos,
  titulos,
  rotuloHistorico = 'Ver o histórico da consulta',
  aoVerHistorico,
  aoVerPlano,
}: ConsultasComparadasProps) {
  const [filtro, setFiltro] = useState<FiltroConsultas>('TODAS');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(ORDENACAO_INICIAL);

  const tendencias = useMemo(() => resumirTendencias(consultas), [consultas]);
  const visiveis = useMemo(
    () => ordenar(filtrarConsultas(consultas, filtro), ordenacao),
    [consultas, filtro, ordenacao],
  );
  const maiorVariacao = useMemo(
    () => consultas.reduce((maior, consulta) => Math.max(maior, Math.abs(consulta.variacaoTempoMedio ?? 0)), 0),
    [consultas],
  );

  const colunas: { coluna: ColunaOrdenavel; rotulo: string; periodo?: string }[] = [
    { coluna: 'tempoMedio', rotulo: 'Tempo médio', periodo: titulos.principal },
    { coluna: 'variacao', rotulo: 'Variação' },
    { coluna: 'execucoes', rotulo: 'Execuções', periodo: titulos.principal },
  ];

  const alternar = (coluna: ColunaOrdenavel) => {
    setOrdenacao((atual) =>
      atual.coluna === coluna ? { coluna, direcao: atual.direcao === 'desc' ? 'asc' : 'desc' } : { coluna, direcao: 'desc' },
    );
  };

  const cabecalhoOrdenavel = (coluna: ColunaOrdenavel) => {
    const definicao = colunas.find((candidata) => candidata.coluna === coluna);
    const ativa = ordenacao.coluna === coluna;
    const Icone = !ativa ? ArrowUpDown : ordenacao.direcao === 'desc' ? ArrowDown : ArrowUp;
    return (
      <th
        scope="col"
        className={estilos.colunaNumerica}
        aria-sort={ativa ? (ordenacao.direcao === 'desc' ? 'descending' : 'ascending') : 'none'}
      >
        <button
          type="button"
          className={juntarClasses(estilos.ordenar, ativa && estilos.ordenarAtivo)}
          onClick={() => alternar(coluna)}
        >
          <span className={estilos.textosCabecalho}>
            {definicao?.rotulo}
            {definicao?.periodo ? <span className={`${estilos.periodoCabecalho} numeros`}>{definicao.periodo}</span> : null}
          </span>
          <Icone size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <Painel espacamento="nenhum" className={estilos.painel} aria-labelledby="titulo-consultas-comparadas">
      <div className={estilos.cabecalho}>
        <CabecalhoPainel
          titulo={<span id="titulo-consultas-comparadas">{TITULO}</span>}
          descricao={`Tempo médio de cada consulta em ${rotulos.principal}, em relação a ${rotulos.base}: ${tendencias}.`}
          acao={
            <GrupoOpcoes
              rotulo="Mostrar consultas"
              tamanho="sm"
              className={`${estilos.filtro} nao-imprimir`}
              opcoes={opcoesDeFiltro}
              valor={filtro}
              aoMudar={setFiltro}
            />
          }
        />
      </div>

      <div className={estilos.conteiner}>
        <CampoSelecao
          id="ordenacao-consultas-comparadas"
          rotulo="Ordenar por"
          className={estilos.ordenacaoCompacta}
          opcoes={(Object.keys(rotuloOrdenacao) as ColunaOrdenavel[]).map((coluna) => ({
            valor: coluna,
            rotulo: rotuloOrdenacao[coluna],
          }))}
          valor={ordenacao.coluna}
          aoMudar={(coluna) => coluna && setOrdenacao({ coluna, direcao: 'desc' })}
        />

        {visiveis.length === 0 ? (
          <p className={estilos.vazio} role="status">
            {semResultado[filtro]}
          </p>
        ) : (
          <table className={estilos.tabela}>
            <caption className="visualmente-oculto">
              Tempo médio e execuções de cada consulta em {rotulos.principal}, em relação a {rotulos.base}. Use os
              cabeçalhos para mudar a ordenação.
            </caption>
            <thead>
              <tr>
                <th scope="col" className={estilos.colunaConsulta}>
                  Consulta
                </th>
                {cabecalhoOrdenavel('tempoMedio')}
                <th scope="col" className={estilos.colunaNumerica}>
                  <span className={estilos.textosCabecalho}>
                    Tempo médio
                    <span className={`${estilos.periodoCabecalho} numeros`}>{titulos.base}</span>
                  </span>
                </th>
                {cabecalhoOrdenavel('variacao')}
                {cabecalhoOrdenavel('execucoes')}
                <th scope="col" className={estilos.colunaDesempenho}>
                  Desempenho
                </th>
                {aoVerHistorico || aoVerPlano ? (
                  <th scope="col" className={estilos.colunaHistorico}>
                    <span className="visualmente-oculto">Atalhos</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((consulta) => {
                const { principal, base } = consulta;
                const desempenho = principal?.desempenho ?? base?.desempenho;
                const mudouDeFaixa = principal && base && principal.desempenho !== base.desempenho;

                return (
                  <tr key={consulta.id}>
                    <td className={estilos.celulaConsulta}>
                      <TrechoSql sql={consulta.sql} />
                    </td>
                    <td className={`${estilos.celulaNumerica} numeros`} data-rotulo={`Tempo médio em ${rotulos.principal}`}>
                      {principal ? formatarDuracaoMs(principal.tempoMedioMs) : <Ausente rotulo={rotulos.principal} />}
                    </td>
                    <td
                      className={`${estilos.celulaNumerica} ${estilos.daBase} numeros`}
                      data-rotulo={`Tempo médio em ${rotulos.base}`}
                    >
                      {base ? formatarDuracaoMs(base.tempoMedioMs) : <Ausente rotulo={rotulos.base} />}
                    </td>
                    <td className={`${estilos.celulaNumerica} numeros`} data-rotulo="Variação">
                      <Variacao consulta={consulta} maiorVariacao={maiorVariacao} />
                    </td>
                    <td className={`${estilos.celulaNumerica} numeros`} data-rotulo={`Execuções em ${rotulos.principal}`}>
                      <span className={estilos.empilhado}>
                        {principal ? formatarNumero(principal.quantidadeExecucoes) : <Ausente rotulo={rotulos.principal} />}
                        {consulta.variacaoExecucoes === null ? null : (
                          <span className={estilos.detalhe}>
                            {formatarVariacao(consulta.variacaoExecucoes)}
                            <span className="visualmente-oculto"> em relação a {rotulos.base}</span>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={estilos.celulaDesempenho} data-rotulo="Desempenho">
                      <span className={estilos.desempenho}>
                        {desempenho ? <SeloDesempenho desempenho={desempenho} /> : null}
                        {mudouDeFaixa ? (
                          <span className={estilos.detalhe}>
                            {rotuloDesempenho[base.desempenho]} em {rotulos.base}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    {aoVerHistorico || aoVerPlano ? (
                      <td className={estilos.celulaHistorico}>
                        <span className={estilos.atalhos}>
                          {aoVerHistorico ? (
                            <BotaoIcone
                              icone={History}
                              tamanho="sm"
                              rotulo={rotuloHistorico}
                              onClick={() => aoVerHistorico(consulta)}
                            />
                          ) : null}
                          {aoVerPlano ? (
                            <BotaoIcone
                              icone={ListTree}
                              tamanho="sm"
                              rotulo="Ver o plano de execução da consulta"
                              onClick={() => aoVerPlano(consulta)}
                            />
                          ) : null}
                        </span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Painel>
  );
}

export function EsqueletoConsultasComparadas() {
  return (
    <PainelEmEspera
      espacamento="nenhum"
      titulo={TITULO}
      larguraDaAcao={204}
      className={estilos.painel}
      classeCabecalho={estilos.cabecalho}
    >
      <TabelaEmEspera linhas={10} alturaDaLinha={74} alturaDoCabecalho={51} />
    </PainelEmEspera>
  );
}
