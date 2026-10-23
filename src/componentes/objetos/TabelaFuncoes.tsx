import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { CampoSelecao, Dica, Esqueleto } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { FuncaoDTO, OrdenacaoFuncoes } from '@/modelos/objetos';
import {
  encontradaSoNoCodigo,
  estadoDoUso,
  formatarTempoPorChamada,
  rotuloSituacaoFuncao,
  situacoesDaFuncao,
  tempoMedioPorChamada,
} from '@/regras/funcoes';
import type { ContextoDasFuncoes } from '@/regras/funcoes';
import { formatarDuracaoExtensa, formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoFuncao, SeloTipoFuncao } from './SeloSituacaoFuncao';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica, ordemAria } from './TabelaObjetos';
import type { ColunaOrdenavel } from './TabelaObjetos';
import estilos from './TabelaObjetos.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoFuncoes;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoFuncoes) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoFuncoes) => void;
}

interface TabelaFuncoesProps extends OrdenacaoDaTabelaProps {
  funcoes: FuncaoDTO[];
  contexto: ContextoDasFuncoes;
  busca: string;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (funcao: FuncaoDTO) => void;
}

interface EsqueletoFuncoesProps extends OrdenacaoDaTabelaProps {
  linhas: number;
}

const colunaDoNome: ColunaOrdenavel<OrdenacaoFuncoes> = { ordenacao: 'NOME', rotulo: 'Função', rotuloOrdenacao: 'Nome' };

const colunasNumericas: ColunaOrdenavel<OrdenacaoFuncoes>[] = [
  { ordenacao: 'CHAMADAS', rotulo: 'Chamadas em 30 dias', rotuloOrdenacao: 'Mais chamadas' },
  { ordenacao: 'TEMPO_TOTAL', rotulo: 'Tempo total', rotuloOrdenacao: 'Maior tempo total' },
  { ordenacao: 'TEMPO_MEDIO', rotulo: 'Por chamada', rotuloOrdenacao: 'Maior tempo por chamada' },
];

const opcoesOrdenacao = [colunaDoNome, ...colunasNumericas].map(({ ordenacao, rotuloOrdenacao }) => ({
  valor: ordenacao,
  rotulo: rotuloOrdenacao,
}));

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
        id="ordenacao-funcoes"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Funções e procedimentos do banco. Use os cabeçalhos para mudar a ordenação e abra uma função para ver o código, o
          uso, os gatilhos e as consultas que a chamam.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao} aria-sort={ordemAria(ordenacao === 'NOME', direcao)}>
              <BotaoOrdenar coluna={colunaDoNome} ordenacao={ordenacao} direcao={direcao} aoAlternarOrdenacao={aoAlternarOrdenacao} />
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Situação
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Tipo
            </th>
            {colunasNumericas.map((coluna) => (
              <th
                key={coluna.ordenacao}
                scope="col"
                className={estilos.colunaNumerica}
                aria-sort={ordemAria(ordenacao === coluna.ordenacao, direcao)}
              >
                <BotaoOrdenar coluna={coluna} ordenacao={ordenacao} direcao={direcao} aoAlternarOrdenacao={aoAlternarOrdenacao} />
              </th>
            ))}
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function CelulaSituacao({ funcao, contexto }: { funcao: FuncaoDTO; contexto: ContextoDasFuncoes }) {
  const [principal, ...outras] = situacoesDaFuncao(funcao, contexto);
  if (!principal) return <span className={estilos.secundario}>Em dia</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloSituacaoFuncao situacao={principal} />
      {outras.length > 0 ? (
        <Dica conteudo={outras.map((situacao) => rotuloSituacaoFuncao[situacao]).join(', ')}>
          <span className={estilos.textoSecundario}>
            e mais {formatarNumero(outras.length)} {pluralizar(outras.length, 'ponto', 'pontos')}
          </span>
        </Dica>
      ) : null}
    </span>
  );
}

function CelulaChamadas({ funcao, contexto }: { funcao: FuncaoDTO; contexto: ContextoDasFuncoes }) {
  const estado = estadoDoUso(funcao, contexto);
  if (estado === 'NAO_MEDIDA' || !funcao.uso) {
    return (
      <Dica conteudo={"O servidor não mede as chamadas desta função"}>
        <span className={estilos.secundario}>
          Não medida
        </span>
      </Dica>
    );
  }
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className="numeros">{formatarNumero(funcao.uso.chamadas)}</span>
      {estado === 'EM_OBSERVACAO' ? <span className={estilos.textoSecundario}>Em observação</span> : null}
    </span>
  );
}

function CelulaTempo({ funcao, medio }: { funcao: FuncaoDTO; medio: boolean }) {
  const uso = funcao.uso;
  if (!uso || uso.chamadas === 0) return <NaoSeAplica />;
  const valor = medio ? formatarTempoPorChamada(tempoMedioPorChamada(uso) ?? 0) : formatarDuracaoExtensa(uso.tempoTotalMs);
  return <span className="numeros">{valor}</span>;
}

function DescricaoDaFuncao({ funcao, busca }: { funcao: FuncaoDTO; busca: string }) {
  if (encontradaSoNoCodigo(funcao, busca)) {
    return <span className={juntarClasses(estilos.descricao, estilos.semDescricao)}>Encontrada no código</span>;
  }
  return (
    <Dica conteudo={funcao.descricao ?? undefined} soSeCortado>
      <span className={juntarClasses(estilos.descricao, !funcao.descricao && estilos.semDescricao)}>
        {funcao.descricao ?? 'Sem descrição no banco'}
      </span>
    </Dica>
  );
}

export function EsqueletoFuncoes({ linhas, ...ordenacaoDaTabela }: EsqueletoFuncoesProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as funções…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${48 - ((indice * 11) % 16)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${70 - ((indice * 17) % 24)}%`} altura={10} />
                </span>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                {indice % 4 === 1 ? (
                  <Esqueleto largura={108} altura={22} raio="var(--raio-sm)" />
                ) : (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={44} altura={12} />
                  </span>
                )}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <Esqueleto largura={indice % 3 === 1 ? 96 : 76} altura={22} raio="var(--raio-sm)" />
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={52} altura={10} />
                  </span>
                </span>
              </td>
              {colunasNumericas.map((coluna, posicao) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={posicao === 1 ? 72 : 56} altura={12} />
                  </span>
                </td>
              ))}
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

export function TabelaFuncoes({
  funcoes,
  contexto,
  busca,
  ordenacao,
  direcao,
  idAberta,
  rolarAteAberta,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaFuncoesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (idAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta, rolarAteAberta, funcoes]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, funcao: FuncaoDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(funcao);
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
      <tbody ref={corpo}>
        {funcoes.map((funcao, posicao) => (
          <tr
            key={funcao.id}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-funcao={funcao.id}
            aria-current={funcao.id === idAberta ? 'true' : undefined}
            style={{ '--indice': posicao } as CSSProperties}
            onClick={(evento) => abrir(evento, funcao)}
            onAnimationEnd={posicao === funcoes.length - 1 ? encerrarEntrada : undefined}
          >
            <td className={estilos.celulaVisao}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                <Dica conteudo={funcao.id} soSeCortado>
                  <span className={`${estilos.nome} codigo`}>
                    <NomeObjeto esquema={funcao.esquema} nome={funcao.nome} classeEsquema={estilos.esquema} />
                    <span className={estilos.esquema}>({funcao.argumentos})</span>
                  </span>
                </Dica>
                <DescricaoDaFuncao funcao={funcao} busca={busca} />
                <span className="visualmente-oculto">. Ver os detalhes desta função</span>
              </button>
            </td>
            <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
              <CelulaSituacao funcao={funcao} contexto={contexto} />
            </td>
            <td className={estilos.celulaTipo} data-rotulo="Tipo">
              <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                <SeloTipoFuncao tipo={funcao.tipo} />
                <span className={`${estilos.textoSecundario} codigo`}>{funcao.linguagem}</span>
              </span>
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Chamadas em 30 dias">
              <CelulaChamadas funcao={funcao} contexto={contexto} />
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Tempo total">
              <CelulaTempo funcao={funcao} medio={false} />
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Por chamada">
              <CelulaTempo funcao={funcao} medio />
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
