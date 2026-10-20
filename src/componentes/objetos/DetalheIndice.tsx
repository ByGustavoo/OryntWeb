import { useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FlaskConical,
  GitCompareArrows,
  History,
  Layers,
  ListTree,
  OctagonAlert,
  SquareFunction,
  Table2,
  TriangleAlert,
  Waypoints,
} from 'lucide-react';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { IndiceDTO, UsoDoIndiceDTO } from '@/modelos/objetos';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  avisosDoIndice,
  colunasDoIndice,
  comandoDoIndice,
  descreverUso,
  gravacoesNoIndice,
  idDaTabela,
  rotuloDoTipoDoIndice,
  rotuloMetodoIndice,
  rotuloSituacaoIndice,
  situacaoDoIndice,
} from '@/regras/indices';
import type { ContextoDosIndices } from '@/regras/indices';
import { rotuloTipoObjeto } from '@/regras/visoes';
import {
  formatarNumero,
  formatarQuantidade,
  formatarTamanho,
  formatarTempoRelativo,
  pluralizar,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { IndiceDoDetalhe, ItemConsulta, Medida, SecaoCopiavel } from './DetalheObjeto';
import estilos from './DetalheObjeto.module.css';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoIndice, temSelo } from './SeloSituacaoIndice';

interface AcoesDosUsos {
  aoVerHistorico: (uso: UsoDoIndiceDTO) => void;
  aoVerPlano: (uso: UsoDoIndiceDTO) => void;
  aoCompararPlanos: (uso: UsoDoIndiceDTO) => void;
}

interface DetalheIndiceProps extends AcoesDosUsos {
  indice: IndiceDTO | null;
  indices: IndiceDTO[];
  contexto: ContextoDosIndices;
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoAbrirIndice: (id: string) => void;
  aoVerTabela: (indice: IndiceDTO) => void;
  aoAbrirFuncao: (id: string) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheIndice({
  indice,
  indices,
  contexto,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoAbrirIndice,
  aoVerTabela,
  aoAbrirFuncao,
  aoVerHistorico,
  aoVerPlano,
  aoCompararPlanos,
  aoFechar,
  focoAoFechar,
}: DetalheIndiceProps) {
  const [exibido, setExibido] = useState(indice);
  if (indice && indice !== exibido) setExibido(indice);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={indice !== null}
      aoFechar={aoFechar}
      titulo="Detalhes do índice"
      descricao={exibido ? descreverIndice(exibido) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer os índices da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Índice anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próximo índice"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Índice </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibido ? (
        <CorpoDetalhe
          key={exibido.id}
          indice={exibido}
          indices={indices}
          contexto={contexto}
          simulada={simulada}
          aoAbrirIndice={aoAbrirIndice}
          aoVerTabela={aoVerTabela}
          aoAbrirFuncao={aoAbrirFuncao}
          aoVerHistorico={aoVerHistorico}
          aoVerPlano={aoVerPlano}
          aoCompararPlanos={aoCompararPlanos}
        />
      ) : null}
    </Modal>
  );
}

function descreverIndice(indice: IndiceDTO): string {
  const tabela = indice.tabela.tipo === 'TABELA' ? 'da tabela' : 'da visão materializada';
  return `Índice ${rotuloMetodoIndice[indice.metodo]} ${tabela} ${idDaTabela(indice)}.`;
}

interface CorpoDetalheProps extends AcoesDosUsos {
  indice: IndiceDTO;
  indices: IndiceDTO[];
  contexto: ContextoDosIndices;
  simulada: boolean;
  aoAbrirIndice: (id: string) => void;
  aoVerTabela: (indice: IndiceDTO) => void;
  aoAbrirFuncao: (id: string) => void;
}

function CorpoDetalhe({
  indice,
  indices,
  contexto,
  simulada,
  aoAbrirIndice,
  aoVerTabela,
  aoAbrirFuncao,
  aoVerHistorico,
  aoVerPlano,
  aoCompararPlanos,
}: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const situacao = situacaoDoIndice(indice, contexto);
  const avisos = avisosDoIndice(indice, contexto);
  const comando = comandoDoIndice(indice, contexto);
  const tipo = rotuloDoTipoDoIndice(indice);
  const tabela = indice.tabela;
  const daMesmaTabela = indices.filter((outro) => outro.id !== indice.id && idDaTabela(outro) === idDaTabela(indice));

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={indice.esquema} nome={indice.nome} classeEsquema={estilos.esquema} />
        </p>
        <p className={estilos.descricao}>
          {rotuloTipoObjeto[tabela.tipo]} <span className="codigo">{idDaTabela(indice)}</span>, com{' '}
          <span className="numeros">{formatarNumero(tabela.linhas)}</span> {pluralizar(tabela.linhas, 'linha', 'linhas')} e{' '}
          <span className="numeros">{formatarTamanho(tabela.tamanhoBytes)}</span>.
        </p>
        <div className={estilos.selos}>
          <Selo tom="neutro" icone={Waypoints}>
            {rotuloMetodoIndice[indice.metodo]}
          </Selo>
          {tipo ? <Selo tom="neutro">{tipo}</Selo> : null}
          {temSelo(situacao) ? <SeloSituacaoIndice situacao={situacao} /> : null}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      <IndiceDoDetalhe raiz={raiz} />

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : TriangleAlert}>
          {aviso.texto}
        </Nota>
      ))}

      {comando ? (
        <SecaoCopiavel
          id="titulo-comando-indice"
          titulo={comando.rotulo}
          texto={comando.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>{comando.explicacao}</p>
        </SecaoCopiavel>
      ) : null}

      <SecaoUso indice={indice} />

      <SecaoCopiavel
        id="titulo-definicao-indice"
        indice="Definição"
        titulo="Definição"
        texto={`${indice.definicao};`}
        copiado="Copiada"
        anuncio="Definição copiada para a área de transferência."
        tituloDoErro="Não foi possível copiar a definição"
        descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto da definição e copie por lá."
      />

      <SecaoEstrutura indice={indice} />
      {indice.funcoes.length > 0 ? <SecaoFuncoes indice={indice} aoAbrirFuncao={aoAbrirFuncao} /> : null}

      <section className={estilos.secao} aria-labelledby="titulo-consultas-indice" data-indice="Consultas">
        <h3 className={estilos.tituloSecao} id="titulo-consultas-indice">
          Consultas cujo plano lê o índice{' '}
          <span className={`${estilos.contagem} numeros`}>{formatarNumero(indice.usos.length)}</span>
        </h3>
        {indice.usos.length > 0 ? (
          <ul className={estilos.consultas}>
            {indice.usos.map((uso) => (
              <li key={`${uso.consulta.id}-${uso.versao}-${uso.etapa}`}>
                <ConsultaDoIndice
                  uso={uso}
                  geradoEm={contexto.geradoEm}
                  aoVerHistorico={aoVerHistorico}
                  aoVerPlano={aoVerPlano}
                  aoCompararPlanos={aoCompararPlanos}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={estilos.leitura}>{semConsultas(indice, situacao)}</p>
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-tabela-indice" data-indice="Tabela">
        <h3 className={estilos.tituloSecao} id="titulo-tabela-indice">
          {rotuloTipoObjeto[tabela.tipo]}
        </h3>
        <button type="button" className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)} onClick={() => aoVerTabela(indice)}>
          {tabela.tipo === 'TABELA' ? (
            <Table2 className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Layers className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
          )}
          <span className={estilos.textosObjeto}>
            <span className={`${estilos.nomeObjeto} codigo`}>
              <NomeObjeto esquema={tabela.esquema} nome={tabela.nome} classeEsquema={estilos.esquema} />
            </span>
            <span className={estilos.tipoObjeto}>
              <span className="numeros">{formatarNumero(tabela.linhas)}</span> {pluralizar(tabela.linhas, 'linha', 'linhas')} ·{' '}
              <span className="numeros">{formatarTamanho(tabela.tamanhoBytes)}</span> de dados
            </span>
          </span>
          <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
          <span className="visualmente-oculto">
            {tabela.tipo === 'TABELA' ? '. Abrir esta tabela em Tabelas' : '. Abrir esta visão em Visões'}
          </span>
        </button>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-outros-indices" data-indice="Outros índices">
        <h3 className={estilos.tituloSecao} id="titulo-outros-indices">
          Outros índices de {tabela.nome}{' '}
          <span className={`${estilos.contagem} numeros`}>{formatarNumero(daMesmaTabela.length)}</span>
        </h3>
        {daMesmaTabela.length > 0 ? (
          <ul className={estilos.objetos}>
            {daMesmaTabela.map((outro) => (
              <li key={outro.id}>
                <button
                  type="button"
                  className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                  onClick={() => aoAbrirIndice(outro.id)}
                >
                  <Waypoints className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className={estilos.textosObjeto}>
                    <span className={`${estilos.nomeObjeto} codigo`}>{outro.nome}</span>
                    <span className={estilos.tipoObjeto}>
                      <span className="codigo">({colunasDoIndice(outro)})</span> ·{' '}
                      {rotuloSituacaoIndice[situacaoDoIndice(outro, contexto)]}
                    </span>
                  </span>
                  <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="visualmente-oculto">. Abrir este índice</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={estilos.leitura}>Este é o único índice de {tabela.nome}.</p>
        )}
      </section>
    </div>
  );
}

function SecaoFuncoes({ indice, aoAbrirFuncao }: { indice: IndiceDTO; aoAbrirFuncao: (id: string) => void }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-funcoes-indice" data-indice="Funções">
      <h3 className={estilos.tituloSecao} id="titulo-funcoes-indice">
        Funções que ele usa <span className={`${estilos.contagem} numeros`}>{formatarNumero(indice.funcoes.length)}</span>
      </h3>
      <ul className={estilos.objetos}>
        {indice.funcoes.map((funcao) => (
          <li key={funcao}>
            <button
              type="button"
              className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
              onClick={() => aoAbrirFuncao(funcao)}
            >
              <SquareFunction className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
              <span className={estilos.textosObjeto}>
                <span className={`${estilos.nomeObjeto} codigo`}>{funcao}</span>
                <span className={estilos.tipoObjeto}>Calculada em cada linha gravada</span>
              </span>
              <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
              <span className="visualmente-oculto">. Abrir esta função em Funções</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={estilos.leitura}>
        O índice guarda o resultado {indice.funcoes.length === 1 ? 'da função' : 'das funções'} para cada linha. Se o código
        mudar sem um REINDEX, o índice fica com os resultados antigos e as buscas por ele erram em silêncio.
      </p>
    </section>
  );
}

function semConsultas(indice: IndiceDTO, situacao: ReturnType<typeof situacaoDoIndice>): string {
  if (situacao === 'INVALIDO') return 'Nenhum plano registrado lê este índice: o planejador não usa um índice inválido.';
  if (situacao === 'GARANTE_UNICIDADE') {
    return `Nenhuma consulta leu este índice nos últimos 30 dias, mas ele continua necessário: é ele que impede valores repetidos em (${colunasDoIndice(indice)}).`;
  }
  return 'Nenhum plano registrado nos últimos 30 dias lê este índice.';
}

function SecaoUso({ indice }: { indice: IndiceDTO }) {
  const { insercoes, atualizacoes, atualizacoesHot } = indice.tabela;
  const foraDoHot = Math.max(0, atualizacoes - atualizacoesHot);
  const composicao = `${formatarNumero(insercoes)} ${pluralizar(insercoes, 'inserção', 'inserções')} e ${formatarNumero(foraDoHot)} ${pluralizar(foraDoHot, 'atualização', 'atualizações')} fora do HOT`;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-uso-indice" data-indice="Uso">
      <h3 className={estilos.tituloSecao} id="titulo-uso-indice">
        Uso nos últimos 30 dias
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Tamanho" valor={formatarTamanho(indice.tamanhoBytes)} />
        <Medida rotulo="Leituras" valor={formatarQuantidade(indice.leituras)} dica={formatarNumero(indice.leituras)} />
        <Medida
          rotulo="Linhas lidas"
          valor={formatarQuantidade(indice.linhasLidas)}
          dica={formatarNumero(indice.linhasLidas)}
        />
        <Medida rotulo="Gravações" valor={formatarQuantidade(gravacoesNoIndice(indice))} dica={composicao} />
      </dl>
      <p className={estilos.leitura}>
        Cada inserção em {indice.tabela.nome} também grava neste índice, assim como cada atualização que não é HOT (a HOT não
        muda nenhuma coluna indexada). No período foram {composicao}.
      </p>
    </section>
  );
}

function SecaoEstrutura({ indice }: { indice: IndiceDTO }) {
  const linhas: [string, string][] = [
    ...indice.colunas.map((coluna, posicao): [string, string] => [coluna, `${formatarNumero(posicao + 1)}ª coluna`]),
    ...indice.incluidas.map((coluna): [string, string] => [coluna, 'Incluída']),
    ...(indice.predicado ? [[indice.predicado, 'Condição'] as [string, string]] : []),
  ];

  return (
    <section className={estilos.secao} aria-labelledby="titulo-estrutura-indice" data-indice="Colunas">
      <h3 className={estilos.tituloSecao} id="titulo-estrutura-indice">
        Colunas <span className={`${estilos.contagem} numeros`}>{formatarNumero(indice.colunas.length)}</span>
      </h3>
      <dl className={estilos.colunas}>
        {linhas.map(([expressao, papel]) => (
          <div key={`${papel}-${expressao}`} className={estilos.coluna}>
            <dt className={`${estilos.nomeColuna} codigo`}>{expressao}</dt>
            <dd className={estilos.tipoColuna}>{papel}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ConsultaDoIndice({
  uso,
  geradoEm,
  aoVerHistorico,
  aoVerPlano,
  aoCompararPlanos,
}: AcoesDosUsos & { uso: UsoDoIndiceDTO; geradoEm: string }) {
  const anterior = uso.usadoAte !== null;
  const etapa = (
    <>
      <span className="codigo">{uso.etapa}</span> · {descreverUso(uso.leiturasPorExecucao)}
      {uso.usadoAte ? `, no plano anterior, usado até ${formatarTempoRelativo(uso.usadoAte, new Date(geradoEm))}` : ''}
    </>
  );

  return (
    <ItemConsulta consulta={uso.consulta} etapa={etapa}>
      {anterior ? (
        <Botao variante="terciario" tamanho="sm" icone={GitCompareArrows} onClick={() => aoCompararPlanos(uso)}>
          Comparar planos
        </Botao>
      ) : (
        <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(uso)}>
          Ver plano
        </Botao>
      )}
      <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(uso)}>
        Ver histórico
      </Botao>
    </ItemConsulta>
  );
}
