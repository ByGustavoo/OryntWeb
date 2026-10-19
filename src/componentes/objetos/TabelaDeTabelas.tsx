import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { CampoSelecao, Esqueleto } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { OrdenacaoTabelas, TabelaDTO } from '@/modelos/objetos';
import { leiturasDaTabela, rotuloSituacaoTabela, situacoesDaTabela, tamanhoTotal, ultimaManutencao } from '@/regras/tabelas';
import type { ContextoDasTabelas } from '@/regras/tabelas';
import {
  formatarDataHoraCompleta,
  formatarNumero,
  formatarQuantidade,
  formatarTamanho,
  formatarTempoRelativo,
  iniciarComMaiuscula,
  pluralizar,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoTabela } from './SeloSituacaoTabela';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, ordemAria } from './TabelaObjetos';
import type { ColunaOrdenavel } from './TabelaObjetos';
import estilos from './TabelaObjetos.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoTabelas;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoTabelas) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoTabelas) => void;
}

interface TabelaDeTabelasProps extends OrdenacaoDaTabelaProps {
  tabelas: TabelaDTO[];
  contexto: ContextoDasTabelas;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (tabela: TabelaDTO) => void;
}

interface EsqueletoTabelasProps extends OrdenacaoDaTabelaProps {
  linhas: number;
}

const colunaDoNome: ColunaOrdenavel<OrdenacaoTabelas> = { ordenacao: 'NOME', rotulo: 'Tabela', rotuloOrdenacao: 'Nome' };

const colunasNumericas: ColunaOrdenavel<OrdenacaoTabelas>[] = [
  { ordenacao: 'LINHAS', rotulo: 'Linhas', rotuloOrdenacao: 'Mais linhas' },
  { ordenacao: 'TAMANHO', rotulo: 'Tamanho', rotuloOrdenacao: 'Maior tamanho' },
  { ordenacao: 'LEITURAS', rotulo: 'Leituras em 30 dias', rotuloOrdenacao: 'Mais leituras' },
  { ordenacao: 'MANUTENCAO', rotulo: 'Última manutenção', rotuloOrdenacao: 'Manutenção mais antiga' },
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
        id="ordenacao-tabelas"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Tabelas do banco. Use os cabeçalhos para mudar a ordenação e abra uma tabela para ver o espaço que ela ocupa, a
          manutenção, o crescimento e as consultas que a leem.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao} aria-sort={ordemAria(ordenacao === 'NOME', direcao)}>
              <BotaoOrdenar coluna={colunaDoNome} ordenacao={ordenacao} direcao={direcao} aoAlternarOrdenacao={aoAlternarOrdenacao} />
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

function CelulaSituacao({ tabela }: { tabela: TabelaDTO }) {
  const [principal, ...outras] = situacoesDaTabela(tabela);
  if (!principal) return <span className={estilos.secundario}>Em dia</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloSituacaoTabela situacao={principal} />
      {outras.length > 0 ? (
        <span className={estilos.textoSecundario} title={outras.map((situacao) => rotuloSituacaoTabela[situacao]).join(', ')}>
          e mais {formatarNumero(outras.length)} {pluralizar(outras.length, 'ponto', 'pontos')}
        </span>
      ) : null}
    </span>
  );
}

function CelulaManutencao({ tabela, geradoEm }: { tabela: TabelaDTO; geradoEm: string }) {
  const manutencao = ultimaManutencao(tabela);
  if (!manutencao) return <span className={estilos.secundario}>Sem registro</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className="numeros" title={formatarDataHoraCompleta(new Date(manutencao.instante))}>
        {iniciarComMaiuscula(formatarTempoRelativo(manutencao.instante, new Date(geradoEm)))}
      </span>
      <span className={estilos.textoSecundario}>{manutencao.automatica ? 'Autovacuum' : 'VACUUM manual'}</span>
    </span>
  );
}

function linhasSecundarias(tabela: TabelaDTO): string | null {
  const particoes = tabela.particionamento?.particoes.length ?? 0;
  if (particoes === 0) return null;
  return `em ${formatarNumero(particoes)} ${pluralizar(particoes, 'partição', 'partições')}`;
}

export function EsqueletoTabelas({ linhas, ...ordenacaoDaTabela }: EsqueletoTabelasProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as tabelas…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${34 - ((indice * 11) % 14)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${62 - ((indice * 17) % 22)}%`} altura={10} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Situação">
                {indice % 3 === 0 ? (
                  <Esqueleto largura={indice % 2 === 0 ? 124 : 96} altura={22} raio="var(--raio-sm)" />
                ) : (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={44} altura={12} />
                  </span>
                )}
              </td>
              {colunasNumericas.map((coluna, posicao) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={posicao === 3 ? 64 : 56} altura={12} />
                  </span>
                  {posicao === 3 ? (
                    <span className={estilos.linhaEmEspera}>
                      <Esqueleto largura={72} altura={10} />
                    </span>
                  ) : null}
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

export function TabelaDeTabelas({
  tabelas,
  contexto,
  ordenacao,
  direcao,
  idAberta,
  rolarAteAberta,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaDeTabelasProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (idAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta, rolarAteAberta, tabelas]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, tabela: TabelaDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(tabela);
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
        {tabelas.map((tabela, posicao) => {
          const secundaria = linhasSecundarias(tabela);
          const inteiras = tabela.leiturasSequenciais;
          return (
            <tr
              key={tabela.id}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-tabela={tabela.id}
              aria-current={tabela.id === idAberta ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, tabela)}
              onAnimationEnd={posicao === tabelas.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={`${estilos.nome} codigo`}>
                    <NomeObjeto esquema={tabela.esquema} nome={tabela.nome} classeEsquema={estilos.esquema} />
                  </span>
                  <span
                    className={juntarClasses(estilos.descricao, !tabela.descricao && estilos.semDescricao)}
                    title={tabela.descricao ?? undefined}
                  >
                    {tabela.descricao ?? 'Sem descrição no banco'}
                  </span>
                  <span className="visualmente-oculto">. Ver os detalhes desta tabela</span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                <CelulaSituacao tabela={tabela} />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Linhas">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                  <span className="numeros">{formatarNumero(tabela.linhas)}</span>
                  {secundaria ? <span className={estilos.textoSecundario}>{secundaria}</span> : null}
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Tamanho">
                <span className="numeros">{formatarTamanho(tamanhoTotal(tabela))}</span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Leituras em 30 dias">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                  <span className="numeros">{formatarNumero(leiturasDaTabela(tabela))}</span>
                  {inteiras > 0 ? (
                    <span className={estilos.textoSecundario}>
                      <span className="numeros">{formatarQuantidade(inteiras)}</span> {pluralizar(inteiras, 'inteira', 'inteiras')}
                    </span>
                  ) : null}
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Última manutenção">
                <CelulaManutencao tabela={tabela} geradoEm={contexto.geradoEm} />
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
