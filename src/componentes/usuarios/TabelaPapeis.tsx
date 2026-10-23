import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { NomeObjeto } from '@/componentes/objetos/NomeObjeto';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica, ordemAria } from '@/componentes/objetos/TabelaObjetos';
import type { ColunaOrdenavel } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { CampoSelecao, Dica, Esqueleto, Selo } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { OrdenacaoPapeis, PapelDTO } from '@/modelos/papeis';
import {
  atributosDoPapel,
  estadoDaSenha,
  estadoDoUsoDoPapel,
  rotuloAtributo,
  rotuloDaSituacaoDoPapel,
  rotuloMetodoSenha,
  situacoesDoPapel,
  textoDaValidade,
  textoDoUltimoUso,
  tipoDoPapel,
} from '@/regras/papeis';
import type { ContextoDosPapeis } from '@/regras/papeis';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloSituacaoPapel, SeloTipoPapel } from './SeloSituacaoPapel';
import proprios from './TabelaPapeis.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoPapeis;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoPapeis) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoPapeis) => void;
}

interface TabelaPapeisProps extends OrdenacaoDaTabelaProps {
  papeis: PapelDTO[];
  contexto: ContextoDosPapeis;
  nomeAberto: string | null;
  rolarAteAberto: boolean;
  aoAbrir: (papel: PapelDTO) => void;
}

interface EsqueletoPapeisProps extends OrdenacaoDaTabelaProps {
  linhas: number;
}

const colunaDoNome: ColunaOrdenavel<OrdenacaoPapeis> = { ordenacao: 'NOME', rotulo: 'Papel', rotuloOrdenacao: 'Nome' };

const colunasNumericas: ColunaOrdenavel<OrdenacaoPapeis>[] = [
  { ordenacao: 'SESSOES', rotulo: 'Sessões agora', rotuloOrdenacao: 'Mais sessões agora' },
  { ordenacao: 'ULTIMO_USO', rotulo: 'Último uso', rotuloOrdenacao: 'Uso mais recente' },
  { ordenacao: 'VALIDADE', rotulo: 'Validade da senha', rotuloOrdenacao: 'Senha que vence antes' },
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
        id="ordenacao-papeis"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Papéis do banco, usuários e grupos. Use os cabeçalhos para mudar a ordenação e abra um papel para ver os atributos,
          as participações, os objetos de que é dono e as configurações.
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

export function resumoDosAtributos(papel: PapelDTO): string | null {
  if (papel.superusuario) return rotuloAtributo.SUPERUSUARIO;
  const [primeiro, ...outros] = atributosDoPapel(papel);
  if (!primeiro) return null;
  if (outros.length === 0) return rotuloAtributo[primeiro];
  return `${rotuloAtributo[primeiro]} e mais ${formatarNumero(outros.length)}`;
}

function CelulaSituacao({ papel, contexto }: { papel: PapelDTO; contexto: ContextoDosPapeis }) {
  const [principal, ...outras] = situacoesDoPapel(papel, contexto);
  if (!principal) return <span className={estilos.secundario}>Em dia</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloSituacaoPapel situacao={principal} papel={papel} contexto={contexto} />
      {outras.length > 0 ? (
        <Dica conteudo={outras.map((situacao) => rotuloDaSituacaoDoPapel(situacao, papel, contexto)).join(', ')}>
          <span
            className={estilos.textoSecundario}
          >
            e mais {formatarNumero(outras.length)} {pluralizar(outras.length, 'ponto', 'pontos')}
          </span>
        </Dica>
      ) : null}
    </span>
  );
}

function CelulaSessoes({ papel }: { papel: PapelDTO }) {
  if (!papel.login) return <NaoSeAplica />;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className="numeros">{formatarNumero(papel.sessoes)}</span>
      {papel.limiteConexoes === null ? null : (
        <span className={estilos.textoSecundario}>de {formatarNumero(papel.limiteConexoes)}</span>
      )}
    </span>
  );
}

function CelulaUltimoUso({ papel, contexto }: { papel: PapelDTO; contexto: ContextoDosPapeis }) {
  const estado = estadoDoUsoDoPapel(papel, contexto);
  if (estado === 'GRUPO') return <NaoSeAplica />;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className={estado === 'SEM_USO' || estado === 'EM_OBSERVACAO' ? estilos.secundario : undefined}>
        {textoDoUltimoUso(papel, contexto)}
      </span>
      {estado === 'EM_OBSERVACAO' ? <span className={estilos.textoSecundario}>Em observação</span> : null}
    </span>
  );
}

function CelulaValidade({ papel, contexto }: { papel: PapelDTO; contexto: ContextoDosPapeis }) {
  if (!papel.login) return <NaoSeAplica />;
  const estado = estadoDaSenha(papel, contexto);
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className={estado === 'SEM_VALIDADE' || estado === 'SEM_SENHA' ? estilos.secundario : undefined}>
        {textoDaValidade(papel, contexto)}
      </span>
      {papel.metodoSenha && papel.metodoSenha !== 'SEM_SENHA' ? (
        <span className={estilos.textoSecundario}>{rotuloMetodoSenha[papel.metodoSenha]}</span>
      ) : null}
    </span>
  );
}

export function EsqueletoPapeis({ linhas, ...ordenacaoDaTabela }: EsqueletoPapeisProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando os papéis…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${30 - ((indice * 11) % 12)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${58 - ((indice * 17) % 22)}%`} altura={10} />
                </span>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                {indice % 3 === 1 ? (
                  <Esqueleto largura={112} altura={22} raio="var(--raio-sm)" />
                ) : (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={44} altura={12} />
                  </span>
                )}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <Esqueleto largura={indice % 4 === 3 ? 66 : 76} altura={22} raio="var(--raio-sm)" />
                  {indice % 4 === 2 ? (
                    <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                      <Esqueleto largura={84} altura={10} />
                    </span>
                  ) : null}
                </span>
              </td>
              {colunasNumericas.map((coluna, posicao) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                    <span className={estilos.linhaEmEspera}>
                      <Esqueleto largura={[24, 64, 92][posicao]} altura={12} />
                    </span>
                    {posicao === 1 ? null : (
                      <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                        <Esqueleto largura={posicao === 0 ? 44 : 72} altura={10} />
                      </span>
                    )}
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

export function TabelaPapeis({
  papeis,
  contexto,
  ordenacao,
  direcao,
  nomeAberto,
  rolarAteAberto,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaPapeisProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (nomeAberto === null || !rolarAteAberto) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [nomeAberto, rolarAteAberto, papeis]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, papel: PapelDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(papel);
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
        {papeis.map((papel, posicao) => {
          const daConexao = papel.nome === contexto.papelDaConexao;
          return (
            <tr
              key={papel.nome}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-papel={papel.nome}
              aria-current={papel.nome === nomeAberto ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, papel)}
              onAnimationEnd={posicao === papeis.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={proprios.linhaDoNome}>
                    <Dica conteudo={papel.nome} soSeCortado>
                      <span className={`${estilos.nome} codigo`}>
                        <NomeObjeto esquema={null} nome={papel.nome} />
                      </span>
                    </Dica>
                    {daConexao ? (
                      <Selo tom="destaque" className={proprios.voce} titulo="O papel com que o Orynt está conectado">
                        Você
                      </Selo>
                    ) : null}
                  </span>
                  <Dica conteudo={papel.descricao ?? undefined} soSeCortado>
                    <span
                      className={juntarClasses(estilos.descricao, !papel.descricao && estilos.semDescricao)}
                    >
                      {papel.descricao ?? 'Sem descrição no banco'}
                    </span>
                  </Dica>
                  <span className="visualmente-oculto">
                    {daConexao ? '. É o papel da conexão em uso' : ''}. Ver os detalhes deste papel
                  </span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                <CelulaSituacao papel={papel} contexto={contexto} />
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <SeloTipoPapel tipo={tipoDoPapel(papel)} />
                  {resumoDosAtributos(papel) ? (
                    <span className={estilos.textoSecundario}>{resumoDosAtributos(papel)}</span>
                  ) : null}
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Sessões agora">
                <CelulaSessoes papel={papel} />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Último uso">
                <CelulaUltimoUso papel={papel} contexto={contexto} />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Validade da senha">
                <CelulaValidade papel={papel} contexto={contexto} />
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
