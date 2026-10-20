import { useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FlaskConical,
  History,
  Info,
  ListTree,
  Lightbulb,
  OctagonAlert,
  TriangleAlert,
} from 'lucide-react';
import { Medida, SecaoCopiavel } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { BotaoIcone, Botao, Modal, Nota, Selo } from '@/componentes/ui';
import type { SessaoDTO } from '@/modelos/sessoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  avisosDaSessao,
  comandosDaSessao,
  descreverBloqueio,
  descreverSessao,
  estadoExibido,
  explicarEspera,
  formatarInicio,
  formatarTempoDecorrido,
  linhaDoTempo,
  rotuloTipoBloqueio,
  rotuloTipoProcesso,
  sessoesQueBloqueiam,
  sessoesQueEsperam,
  situacoesDaSessao,
  tempoDaConsultaMs,
  tempoNoEstadoMs,
  textoDaEspera,
} from '@/regras/sessoes';
import type { ContextoDasSessoes, SugestaoDeTempoOcioso } from '@/regras/sessoes';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import locais from './DetalheSessao.module.css';
import { SeloEstadoSessao, SeloOrynt, SeloSituacaoSessao } from './SeloSituacaoSessao';

interface AcoesDoDetalhe {
  aoAbrirSessao: (pid: number) => void;
  aoAbrirPapel: (nome: string) => void;
  aoVerPlano: (consulta: string) => void;
  aoVerHistorico: (consulta: string) => void;
}

interface DetalheSessaoProps extends AcoesDoDetalhe {
  sessao: SessaoDTO | null;
  sessoes: SessaoDTO[];
  contexto: ContextoDasSessoes;
  sugestoes: SugestaoDeTempoOcioso[];
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheSessao({
  sessao,
  sessoes,
  contexto,
  sugestoes,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  ...acoes
}: DetalheSessaoProps) {
  const [exibida, setExibida] = useState(sessao);
  if (sessao && sessao !== exibida) setExibida(sessao);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={sessao !== null}
      aoFechar={aoFechar}
      titulo="Detalhes da sessão"
      descricao={exibida ? descreverSessao(exibida) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as sessões da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Sessão anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima sessão"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Sessão </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibida ? (
        <CorpoDetalhe
          key={exibida.pid}
          sessao={exibida}
          sessoes={sessoes}
          contexto={contexto}
          sugestao={sugestoes.find((sugestao) => sugestao.papel === exibida.papel) ?? null}
          simulada={simulada}
          {...acoes}
        />
      ) : null}
    </Modal>
  );
}

interface CorpoDetalheProps extends AcoesDoDetalhe {
  sessao: SessaoDTO;
  sessoes: SessaoDTO[];
  contexto: ContextoDasSessoes;
  sugestao: SugestaoDeTempoOcioso | null;
  simulada: boolean;
}

const iconeDoAviso = { erro: OctagonAlert, aviso: TriangleAlert, info: Info } as const;

function CorpoDetalhe({ sessao, sessoes, contexto, sugestao, simulada, ...acoes }: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const avisos = avisosDaSessao(sessao, sessoes, contexto);
  const comandos = comandosDaSessao(sessao, sessoes);
  const situacoes = situacoesDaSessao(sessao, sessoes, contexto);
  const cliente = sessao.tipo === 'CLIENTE' || sessao.tipo === 'REPLICACAO';

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={estilos.nome}>
          <span className="numeros">PID {String(sessao.pid)}</span>
          {sessao.papel ? <span className={`${locais.papelNoNome} codigo`}> · {sessao.papel}</span> : null}
        </p>
        <p className={estilos.descricao}>
          {cliente ? (sessao.aplicacao ?? 'A aplicação não informou um nome (application_name).') : sessao.processo}
        </p>
        <div className={estilos.selos}>
          {sessao.tipo !== 'CLIENTE' ? <Selo tom="neutro">{rotuloTipoProcesso[sessao.tipo]}</Selo> : null}
          <SeloEstadoSessao estado={estadoExibido(sessao)} />
          {sessao.doOrynt ? <SeloOrynt /> : null}
          {situacoes.map((situacao) => (
            <SeloSituacaoSessao key={situacao} situacao={situacao} />
          ))}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={iconeDoAviso[aviso.tom]}>
          {aviso.texto}
        </Nota>
      ))}

      {comandos.map((comando, posicao) => (
        <SecaoCopiavel
          key={comando.acao}
          id={`titulo-comando-sessao-${posicao}`}
          titulo={comando.rotulo}
          texto={comando.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>{comando.explicacao}</p>
        </SecaoCopiavel>
      ))}

      {sugestao ? <SecaoSugestao sugestao={sugestao} aoAbrirPapel={acoes.aoAbrirPapel} /> : null}

      <SecaoLinhaDoTempo sessao={sessao} contexto={contexto} />
      <SecaoConsulta sessao={sessao} contexto={contexto} aoVerPlano={acoes.aoVerPlano} aoVerHistorico={acoes.aoVerHistorico} />
      <SecaoFila sessao={sessao} sessoes={sessoes} contexto={contexto} aoAbrirSessao={acoes.aoAbrirSessao} />
      <SecaoBloqueios sessao={sessao} />
      <SecaoConexao sessao={sessao} contexto={contexto} aoAbrirPapel={acoes.aoAbrirPapel} />
    </div>
  );
}

function SecaoSugestao({ sugestao, aoAbrirPapel }: { sugestao: SugestaoDeTempoOcioso; aoAbrirPapel: (nome: string) => void }) {
  return (
    <SecaoCopiavel
      id="titulo-sugestao-sessao"
      titulo={`Sugestão para ${sugestao.papel}`}
      texto={sugestao.comando}
      copiado="Copiado"
      anuncio="Comando copiado para a área de transferência."
      tituloDoErro="Não foi possível copiar o comando"
      descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
    >
      <p className={juntarClasses(estilos.leitura, locais.comIcone)}>
        <Lightbulb size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          {sugestao.frase} {sugestao.explicacao}
        </span>
      </p>
      <Botao
        variante="terciario"
        tamanho="sm"
        iconeDireita={ChevronRight}
        className={locais.acaoDaSecao}
        onClick={() => aoAbrirPapel(sugestao.papel)}
      >
        Abrir {sugestao.papel} em Papéis
      </Botao>
    </SecaoCopiavel>
  );
}

function SecaoLinhaDoTempo({ sessao, contexto }: { sessao: SessaoDTO; contexto: ContextoDasSessoes }) {
  const marcos = linhaDoTempo(sessao, contexto);
  return (
    <section className={estilos.secao} aria-labelledby="titulo-tempo-sessao">
      <h3 className={estilos.tituloSecao} id="titulo-tempo-sessao">
        Linha do tempo
      </h3>
      <ol className={locais.linhaDoTempo}>
        {marcos.map((marco) => (
          <li key={marco.chave} className={locais.marco}>
            <span className={locais.ponto} aria-hidden="true" />
            <span className={locais.rotuloMarco}>{marco.rotulo}</span>
            <span className={`${locais.instanteMarco} numeros`}>{formatarInicio(marco.instante, contexto)}</span>
            <span className={`${locais.haMarco} numeros`}>{marco.ha}</span>
          </li>
        ))}
        <li className={juntarClasses(locais.marco, locais.agora)}>
          <span className={locais.ponto} aria-hidden="true" />
          <span className={locais.rotuloMarco}>Retrato</span>
          <span className={`${locais.instanteMarco} numeros`}>{formatarInicio(contexto.geradoEm, contexto)}</span>
          <span className={locais.haMarco} />
        </li>
      </ol>
    </section>
  );
}

function SecaoConsulta({
  sessao,
  contexto,
  aoVerPlano,
  aoVerHistorico,
}: {
  sessao: SessaoDTO;
  contexto: ContextoDasSessoes;
  aoVerPlano: (consulta: string) => void;
  aoVerHistorico: (consulta: string) => void;
}) {
  if (!sessao.consulta) {
    return (
      <section className={estilos.secao} aria-labelledby="titulo-consulta-sessao">
        <h3 className={estilos.tituloSecao} id="titulo-consulta-sessao">
          Consulta
        </h3>
        <p className={estilos.leitura}>Este processo não roda consultas de cliente.</p>
      </section>
    );
  }

  const emAndamento = estadoExibido(sessao) === 'ATIVA' || estadoExibido(sessao) === 'ESPERANDO';
  const tempo = tempoDaConsultaMs(sessao, contexto);
  const consultaId = sessao.consultaId;

  return (
    <SecaoCopiavel
      id="titulo-consulta-sessao"
      titulo={emAndamento ? 'Consulta em andamento' : 'Última consulta'}
      texto={sessao.consulta}
      copiado="Copiada"
      anuncio="Consulta copiada para a área de transferência."
      tituloDoErro="Não foi possível copiar a consulta"
      descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto da consulta e copie por lá."
    >
      <p className={estilos.leitura}>
        {emAndamento
          ? `Roda há ${formatarTempoDecorrido(tempo ?? 0)}.`
          : `Começou às ${sessao.consultaDesde ? formatarInicio(sessao.consultaDesde, contexto) : ''} e já terminou.`}{' '}
        Os valores aparecem como $1, $2…: a API não traz os dados da consulta para o navegador.
        {consultaId ? '' : ' Esta consulta não está entre as consultas medidas nos últimos 30 dias.'}
      </p>
      {consultaId ? (
        <div className={locais.acoesConsulta}>
          <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(consultaId)}>
            Ver plano
          </Botao>
          <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(consultaId)}>
            Ver histórico
          </Botao>
        </div>
      ) : null}
    </SecaoCopiavel>
  );
}

function ItemSessao({
  sessao,
  descricao,
  aoAbrirSessao,
}: {
  sessao: SessaoDTO;
  descricao: string;
  aoAbrirSessao: (pid: number) => void;
}) {
  return (
    <button type="button" className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)} onClick={() => aoAbrirSessao(sessao.pid)}>
      <span className={estilos.textosObjeto}>
        <span className={estilos.nomeObjeto}>
          <span className="numeros">{String(sessao.pid)}</span>
          {sessao.papel ? <span className="codigo"> · {sessao.papel}</span> : null}
        </span>
        <span className={estilos.tipoObjeto}>{descricao}</span>
      </span>
      <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
      <span className="visualmente-oculto">. Abrir esta sessão</span>
    </button>
  );
}

function comoEsta(sessao: SessaoDTO, contexto: ContextoDasSessoes): string {
  const estado = estadoExibido(sessao);
  if (estado === 'OCIOSA_EM_TRANSACAO') return `Parada com a transação aberta há ${formatarTempoDecorrido(tempoNoEstadoMs(sessao, contexto) ?? 0)}`;
  if (estado === 'ESPERANDO') return `Também espera, há ${formatarTempoDecorrido(tempoDaConsultaMs(sessao, contexto) ?? 0)}`;
  return `Roda a consulta há ${formatarTempoDecorrido(tempoDaConsultaMs(sessao, contexto) ?? 0)}`;
}

function SecaoFila({
  sessao,
  sessoes,
  contexto,
  aoAbrirSessao,
}: {
  sessao: SessaoDTO;
  sessoes: SessaoDTO[];
  contexto: ContextoDasSessoes;
  aoAbrirSessao: (pid: number) => void;
}) {
  const bloqueiam = sessoesQueBloqueiam(sessao, sessoes);
  const esperam = sessoesQueEsperam(sessao, sessoes);
  if (bloqueiam.length === 0 && esperam.length === 0) return null;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-fila-sessao">
      <h3 className={estilos.tituloSecao} id="titulo-fila-sessao">
        Fila do bloqueio
      </h3>
      <div className={estilos.dependencias}>
        {bloqueiam.length > 0 ? (
          <div className={estilos.grupoObjetos}>
            <h4 className={estilos.rotuloGrupo}>
              Espera por <span className={`${estilos.contagem} numeros`}>{formatarNumero(bloqueiam.length)}</span>
            </h4>
            <ul className={estilos.objetos}>
              {bloqueiam.map((outra) => (
                <li key={outra.pid}>
                  <ItemSessao
                    sessao={outra}
                    descricao={comoEsta(outra, contexto)}
                    aoAbrirSessao={aoAbrirSessao}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {esperam.length > 0 ? (
          <div className={estilos.grupoObjetos}>
            <h4 className={estilos.rotuloGrupo}>
              Bloqueia <span className={`${estilos.contagem} numeros`}>{formatarNumero(esperam.length)}</span>
            </h4>
            <ul className={estilos.objetos}>
              {esperam.map((outra) => (
                <li key={outra.pid}>
                  <ItemSessao
                    sessao={outra}
                    descricao={`Espera há ${formatarTempoDecorrido(tempoDaConsultaMs(outra, contexto) ?? 0)}`}
                    aoAbrirSessao={aoAbrirSessao}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SecaoBloqueios({ sessao }: { sessao: SessaoDTO }) {
  if (sessao.bloqueios.length === 0) return null;
  return (
    <section className={estilos.secao} aria-labelledby="titulo-bloqueios-sessao">
      <h3 className={estilos.tituloSecao} id="titulo-bloqueios-sessao">
        Bloqueios <span className={`${estilos.contagem} numeros`}>{formatarNumero(sessao.bloqueios.length)}</span>
      </h3>
      <ul className={locais.bloqueios}>
        {sessao.bloqueios.map((bloqueio) => (
          <li key={`${bloqueio.tipo}-${bloqueio.modo}-${bloqueio.alvo ?? ''}`} className={locais.bloqueio}>
            <span className={locais.tipoBloqueio}>{rotuloTipoBloqueio[bloqueio.tipo]}</span>
            <span className={`${locais.descricaoBloqueio} codigo`}>{descreverBloqueio(bloqueio)}</span>
            <Selo tom={bloqueio.concedido ? 'neutro' : 'erro'}>{bloqueio.concedido ? 'Segura' : 'Espera'}</Selo>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecaoConexao({
  sessao,
  contexto,
  aoAbrirPapel,
}: {
  sessao: SessaoDTO;
  contexto: ContextoDasSessoes;
  aoAbrirPapel: (nome: string) => void;
}) {
  const explicacao = sessao.espera ? explicarEspera(sessao.espera) : null;
  return (
    <section className={estilos.secao} aria-labelledby="titulo-conexao-sessao">
      <h3 className={estilos.tituloSecao} id="titulo-conexao-sessao">
        Conexão
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Banco" valor={sessao.banco ?? 'Nenhum'} dica={sessao.banco === contexto.bancoDaConexao ? 'O banco da conexão' : undefined} />
        <Medida rotulo="Endereço" valor={sessao.endereco ?? 'Socket local'} />
        <Medida rotulo="Processo" valor={sessao.processo} />
        <Medida rotulo="Espera" valor={sessao.espera ? sessao.espera.evento : 'Nenhuma'} dica={sessao.espera ? textoDaEspera(sessao.espera) : undefined} />
      </dl>
      <p className={estilos.leitura}>
        {sessao.espera ? `Evento de espera ${textoDaEspera(sessao.espera)}${explicacao ? `: ${explicacao}` : ''}. ` : ''}
        {sessao.papel ? (
          <>
            Conectada como{' '}
            <button type="button" className={`${estilos.linkDono} codigo`} onClick={() => aoAbrirPapel(sessao.papel ?? '')}>
              {sessao.papel}
              <span className="visualmente-oculto">. Abrir este papel em Papéis</span>
            </button>
            .
          </>
        ) : (
          'Processo do próprio servidor, sem papel.'
        )}
      </p>
    </section>
  );
}
