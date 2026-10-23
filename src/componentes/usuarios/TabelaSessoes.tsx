import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica, ordemAria } from '@/componentes/objetos/TabelaObjetos';
import type { ColunaOrdenavel } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { CampoSelecao, Dica, Esqueleto } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { OrdenacaoSessoes, SessaoDTO } from '@/modelos/sessoes';
import {
  estadoExibido,
  explicarEspera,
  formatarInicio,
  formatarTempoDecorrido,
  nomeDaSessao,
  rotuloSituacaoSessao,
  situacoesDaSessao,
  tempoDaTransacaoMs,
  tempoNoEstadoMs,
  textoDaEspera,
} from '@/regras/sessoes';
import type { ContextoDasSessoes } from '@/regras/sessoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloEstadoSessao, SeloOrynt, SeloSituacaoSessao } from './SeloSituacaoSessao';
import proprios from './TabelaSessoes.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoSessoes;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoSessoes) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoSessoes) => void;
}

interface TabelaSessoesProps extends OrdenacaoDaTabelaProps {
  sessoes: SessaoDTO[];
  todas: SessaoDTO[];
  contexto: ContextoDasSessoes;
  termos: string[];
  pidAberto: number | null;
  rolarAteAberta: boolean;
  aoAbrir: (sessao: SessaoDTO) => void;
}

interface EsqueletoSessoesProps extends OrdenacaoDaTabelaProps {
  linhas: number;
}

const colunaDaSessao: ColunaOrdenavel<OrdenacaoSessoes> = { ordenacao: 'PID', rotulo: 'Sessão', rotuloOrdenacao: 'PID' };

const colunasDeTempo: ColunaOrdenavel<OrdenacaoSessoes>[] = [
  { ordenacao: 'TEMPO_NO_ESTADO', rotulo: 'No estado', rotuloOrdenacao: 'Mais tempo no estado' },
  { ordenacao: 'TRANSACAO', rotulo: 'Transação', rotuloOrdenacao: 'Transação mais antiga' },
];

const opcoesOrdenacao = [
  { valor: 'URGENCIA' as const, rotulo: 'Mais urgente primeiro' },
  ...[colunaDaSessao, ...colunasDeTempo].map(({ ordenacao, rotuloOrdenacao }) => ({ valor: ordenacao, rotulo: rotuloOrdenacao })),
];

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
        id="ordenacao-sessoes"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Sessões do servidor no instante do retrato, da mais urgente para a menos urgente. Use os cabeçalhos para mudar a
          ordenação e abra uma sessão para ver a consulta, os bloqueios e os comandos.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className={juntarClasses(estilos.colunaVisao, proprios.colunaSessao)}
              aria-sort={ordemAria(ordenacao === 'PID', direcao)}
            >
              <BotaoOrdenar coluna={colunaDaSessao} ordenacao={ordenacao} direcao={direcao} aoAlternarOrdenacao={aoAlternarOrdenacao} />
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Situação
            </th>
            <th scope="col" className={proprios.colunaEstado}>
              Estado
            </th>
            <th scope="col" className={proprios.colunaConsulta}>
              Consulta
            </th>
            {colunasDeTempo.map((coluna) => (
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

function detalheDaSessao(sessao: SessaoDTO, contexto: ContextoDasSessoes): string {
  if (sessao.tipo === 'SERVIDOR' || sessao.tipo === 'AUTOVACUUM') {
    return sessao.banco && sessao.banco !== contexto.bancoDaConexao ? `Processo do servidor · ${sessao.banco}` : 'Processo do servidor';
  }
  const partes = [
    sessao.tipo === 'REPLICACAO' ? 'Replicação' : null,
    sessao.aplicacao ?? 'Sem nome de aplicação',
    sessao.banco && sessao.banco !== contexto.bancoDaConexao ? `banco ${sessao.banco}` : null,
  ];
  return partes.filter((parte): parte is string => parte !== null).join(' · ');
}

function CelulaSituacao({ sessao, todas, contexto }: { sessao: SessaoDTO; todas: SessaoDTO[]; contexto: ContextoDasSessoes }) {
  const [principal, ...outras] = situacoesDaSessao(sessao, todas, contexto);
  if (!principal) return <span className={estilos.secundario}>{sessao.tipo === 'CLIENTE' && !sessao.doOrynt ? 'Sem alerta' : 'Não se aplica'}</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloSituacaoSessao situacao={principal} />
      {outras.length > 0 ? (
        <Dica conteudo={outras.map((situacao) => rotuloSituacaoSessao[situacao]).join(', ')}>
          <span className={estilos.textoSecundario}>
            e mais {formatarNumero(outras.length)} {pluralizar(outras.length, 'ponto', 'pontos')}
          </span>
        </Dica>
      ) : null}
    </span>
  );
}

function CelulaEstado({ sessao }: { sessao: SessaoDTO }) {
  const explicacao = sessao.espera ? explicarEspera(sessao.espera) : null;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloEstadoSessao estado={estadoExibido(sessao)} />
      {sessao.espera ? (
        <Dica conteudo={explicacao ?? undefined}>
          <span className={juntarClasses(estilos.textoSecundario, proprios.espera)}>
            <span className="codigo">{textoDaEspera(sessao.espera)}</span>
          </span>
        </Dica>
      ) : null}
    </span>
  );
}

function CelulaTempo({ milissegundos, desde, contexto }: { milissegundos: number | null; desde: string | null; contexto: ContextoDasSessoes }) {
  if (milissegundos === null || desde === null) return <NaoSeAplica />;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
      <span className="numeros">{formatarTempoDecorrido(milissegundos)}</span>
      <span className={juntarClasses(estilos.textoSecundario, 'numeros')}>desde {formatarInicio(desde, contexto)}</span>
    </span>
  );
}

export function EsqueletoSessoes({ linhas, ...ordenacaoDaTabela }: EsqueletoSessoesProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as sessões…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={juntarClasses(estilos.celulaVisao, proprios.celulaSessao)}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={44} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${62 - ((indice * 17) % 24)}%`} altura={10} />
                </span>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                {indice < 2 ? (
                  <Esqueleto largura={112} altura={22} raio="var(--raio-sm)" />
                ) : (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={44} altura={12} />
                  </span>
                )}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Estado">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <Esqueleto largura={indice % 3 === 0 ? 70 : 84} altura={22} raio="var(--raio-sm)" />
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={104} altura={10} />
                  </span>
                </span>
              </td>
              <td className={juntarClasses(proprios.celulaConsulta, estilos.celulaLarga)} data-rotulo="Consulta">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura="92%" altura={11} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${40 + ((indice * 13) % 40)}%`} altura={11} />
                </span>
              </td>
              {colunasDeTempo.map((coluna, posicao) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                    <span className={estilos.linhaEmEspera}>
                      <Esqueleto largura={posicao === 0 ? 64 : 48} altura={12} />
                    </span>
                    <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                      <Esqueleto largura={84} altura={10} />
                    </span>
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

export function TabelaSessoes({
  sessoes,
  todas,
  contexto,
  termos,
  ordenacao,
  direcao,
  pidAberto,
  rolarAteAberta,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaSessoesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (pidAberto === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [pidAberto, rolarAteAberta, sessoes]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, sessao: SessaoDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(sessao);
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
        {sessoes.map((sessao, posicao) => {
          const processo = sessao.tipo === 'SERVIDOR' || sessao.tipo === 'AUTOVACUUM';
          return (
            <tr
              key={sessao.pid}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-pid={sessao.pid}
              aria-current={sessao.pid === pidAberto ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, sessao)}
              onAnimationEnd={posicao === sessoes.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={juntarClasses(estilos.celulaVisao, proprios.celulaSessao)}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={proprios.linhaDoPid}>
                    <span className={juntarClasses(estilos.nome, 'numeros')}>{String(sessao.pid)}</span>
                    <Dica conteudo={nomeDaSessao(sessao)} soSeCortado>
                      <span className={juntarClasses(proprios.quem, processo ? undefined : 'codigo')}>
                        {nomeDaSessao(sessao)}
                      </span>
                    </Dica>
                    {sessao.doOrynt ? <SeloOrynt /> : null}
                  </span>
                  <Dica conteudo={sessao.endereco ?? undefined} soSeCortado>
                    <span className={estilos.descricao}>
                      {detalheDaSessao(sessao, contexto)}
                    </span>
                  </Dica>
                  <span className="visualmente-oculto">. Ver os detalhes desta sessão</span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                <CelulaSituacao sessao={sessao} todas={todas} contexto={contexto} />
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Estado">
                <CelulaEstado sessao={sessao} />
              </td>
              <td className={juntarClasses(proprios.celulaConsulta, estilos.celulaLarga)} data-rotulo="Consulta">
                {sessao.consulta ? (
                  <TrechoSql sql={sessao.consulta} termos={termos} className={proprios.sql} />
                ) : (
                  <NaoSeAplica />
                )}
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="No estado">
                <CelulaTempo milissegundos={tempoNoEstadoMs(sessao, contexto)} desde={sessao.estadoDesde} contexto={contexto} />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Transação">
                <CelulaTempo
                  milissegundos={tempoDaTransacaoMs(sessao, contexto)}
                  desde={sessao.transacaoDesde}
                  contexto={contexto}
                />
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
