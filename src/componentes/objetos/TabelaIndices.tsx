import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { CampoSelecao, Dica, Esqueleto } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { IndiceDTO, OrdenacaoIndices } from '@/modelos/objetos';
import {
  colunasDoIndice,
  rotuloDoTipoDoIndice,
  rotuloMetodoIndice,
  rotuloSituacaoIndice,
  situacaoDoIndice,
} from '@/regras/indices';
import type { ContextoDosIndices } from '@/regras/indices';
import { formatarNumero, formatarTamanho } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoIndice, temSelo } from './SeloSituacaoIndice';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, ordemAria } from './TabelaObjetos';
import type { ColunaOrdenavel } from './TabelaObjetos';
import estilos from './TabelaObjetos.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoIndices;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoIndices) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoIndices) => void;
}

interface TabelaIndicesProps extends OrdenacaoDaTabelaProps {
  indices: IndiceDTO[];
  contexto: ContextoDosIndices;
  idAberto: string | null;
  rolarAteAberto: boolean;
  aoAbrir: (indice: IndiceDTO) => void;
}

interface EsqueletoIndicesProps extends OrdenacaoDaTabelaProps {
  linhas: number;
}

const colunaDoNome: ColunaOrdenavel<OrdenacaoIndices> = { ordenacao: 'NOME', rotulo: 'Índice', rotuloOrdenacao: 'Tabela e nome' };

const colunasNumericas: ColunaOrdenavel<OrdenacaoIndices>[] = [
  { ordenacao: 'TAMANHO', rotulo: 'Tamanho', rotuloOrdenacao: 'Maior tamanho' },
  { ordenacao: 'LEITURAS', rotulo: 'Leituras em 30 dias', rotuloOrdenacao: 'Menos leituras' },
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
        id="ordenacao-indices"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Índices do banco. Use os cabeçalhos para mudar a ordenação e abra um índice para ver a definição, o custo de mantê-lo
          e as consultas que o leem.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao} aria-sort={ordemAria(ordenacao === 'NOME', direcao)}>
              <BotaoOrdenar
                coluna={colunaDoNome}
                ordenacao={ordenacao}
                direcao={direcao}
                aoAlternarOrdenacao={aoAlternarOrdenacao}
              />
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Tipo
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Situação
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

function CelulaSituacao({ indice, contexto }: { indice: IndiceDTO; contexto: ContextoDosIndices }) {
  const situacao = situacaoDoIndice(indice, contexto);
  if (temSelo(situacao)) return <SeloSituacaoIndice situacao={situacao} />;
  return <span className={estilos.secundario}>{rotuloSituacaoIndice[situacao]}</span>;
}

function descricaoDoIndice(indice: IndiceDTO): string {
  const predicado = indice.predicado ? ` WHERE ${indice.predicado}` : '';
  return `${indice.tabela.nome} (${colunasDoIndice(indice)})${predicado}`;
}

export function EsqueletoIndices({ linhas, ...ordenacaoDaTabela }: EsqueletoIndicesProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando os índices…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${46 - ((indice * 11) % 18)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${38 - ((indice * 17) % 16)}%`} altura={10} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={52} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  {indice % 2 === 0 ? <Esqueleto largura={84} altura={10} /> : null}
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Situação">
                <Esqueleto largura={indice % 3 === 0 ? 92 : 56} altura={22} raio="var(--raio-sm)" />
              </td>
              {colunasNumericas.map((coluna) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={56} altura={12} />
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

export function TabelaIndices({
  indices,
  contexto,
  ordenacao,
  direcao,
  idAberto,
  rolarAteAberto,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaIndicesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (idAberto === null || !rolarAteAberto) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberto, rolarAteAberto, indices]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, indice: IndiceDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(indice);
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
        {indices.map((indice, posicao) => {
          const tipo = rotuloDoTipoDoIndice(indice);
          return (
            <tr
              key={indice.id}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-indice={indice.id}
              aria-current={indice.id === idAberto ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, indice)}
              onAnimationEnd={posicao === indices.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={`${estilos.nome} codigo`}>
                    <NomeObjeto esquema={indice.esquema} nome={indice.nome} classeEsquema={estilos.esquema} />
                  </span>
                  <Dica conteudo={descricaoDoIndice(indice)} soSeCortado>
                    <span className={`${estilos.descricao} codigo`}>
                      {descricaoDoIndice(indice)}
                    </span>
                  </Dica>
                  <span className="visualmente-oculto">. Ver os detalhes deste índice</span>
                </button>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <span className={estilos.celulaEmLinhas}>
                  <span className={estilos.textoPrincipal}>{rotuloMetodoIndice[indice.metodo]}</span>
                  {tipo ? <span className={estilos.textoSecundario}>{tipo}</span> : null}
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Situação">
                <CelulaSituacao indice={indice} contexto={contexto} />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Tamanho">
                <span className="numeros">{formatarTamanho(indice.tamanhoBytes)}</span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Leituras em 30 dias">
                <span className="numeros">{formatarNumero(indice.leituras)}</span>
              </td>
              <td className={estilos.celulaSeta} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={2} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </MolduraDaTabela>
  );
}
