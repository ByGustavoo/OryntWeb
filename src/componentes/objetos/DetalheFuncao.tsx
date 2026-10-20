import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  FlaskConical,
  History,
  KeyRound,
  Layers,
  ListTree,
  OctagonAlert,
  TriangleAlert,
  Waypoints,
  Zap,
} from 'lucide-react';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { FuncaoDTO, ParametroFuncaoDTO } from '@/modelos/objetos';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  avisosDaFuncao,
  comandosDaFuncao,
  descreverConfiguracao,
  descreverDisparo,
  efeitoDaVolatilidade,
  formatarTempoPorChamada,
  palavraDaVolatilidade,
  parteDoTempoProprio,
  rotuloVolatilidade,
  situacoesDaFuncao,
  tempoMedioPorChamada,
} from '@/regras/funcoes';
import type { ContextoDasFuncoes } from '@/regras/funcoes';
import { idDoObjeto, rotuloTipoObjeto } from '@/regras/visoes';
import {
  formatarDuracaoExtensa,
  formatarNumero,
  formatarQuantidade,
  pluralizar,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { DonoDoObjeto, ItemConsulta, Medida, SecaoCopiavel } from './DetalheObjeto';
import estilos from './DetalheObjeto.module.css';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoFuncao, SeloTipoFuncao } from './SeloSituacaoFuncao';
import proprios from './DetalheTabela.module.css';

interface AcoesDoDetalhe {
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
  aoAbrirTabela: (id: string) => void;
  aoAbrirIndice: (id: string, tabela: string) => void;
  aoAbrirVisao: (id: string) => void;
  aoAbrirPapel: (nome: string) => void;
  quemAcessa?: (id: string) => ReactNode;
}

interface DetalheFuncaoProps extends AcoesDoDetalhe {
  funcao: FuncaoDTO | null;
  contexto: ContextoDasFuncoes;
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheFuncao({
  funcao,
  contexto,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  ...acoes
}: DetalheFuncaoProps) {
  const [exibida, setExibida] = useState(funcao);
  if (funcao && funcao !== exibida) setExibida(funcao);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={funcao !== null}
      aoFechar={aoFechar}
      titulo={exibida?.tipo === 'PROCEDIMENTO' ? 'Detalhes do procedimento' : 'Detalhes da função'}
      descricao={exibida ? descreverFuncao(exibida) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as funções da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Função anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima função"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Função </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibida ? <CorpoDetalhe key={exibida.id} funcao={exibida} contexto={contexto} simulada={simulada} {...acoes} /> : null}
    </Modal>
  );
}

function descreverFuncao(funcao: FuncaoDTO): string {
  const tipo = { FUNCAO: 'Função', PROCEDIMENTO: 'Procedimento', GATILHO: 'Função de gatilho' }[funcao.tipo];
  return `${tipo} em ${funcao.linguagem} do esquema ${funcao.esquema}, de ${funcao.dono}.`;
}

interface CorpoDetalheProps extends AcoesDoDetalhe {
  funcao: FuncaoDTO;
  contexto: ContextoDasFuncoes;
  simulada: boolean;
}

function CorpoDetalhe({ funcao, contexto, simulada, ...acoes }: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const avisos = avisosDaFuncao(funcao, contexto);
  const comandos = comandosDaFuncao(funcao, contexto);
  const deGatilho = funcao.tipo === 'GATILHO';

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={funcao.esquema} nome={funcao.nome} classeEsquema={estilos.esquema} />
          <span className={estilos.esquema}>({funcao.argumentos})</span>
        </p>
        <p className={juntarClasses(estilos.descricao, !funcao.descricao && estilos.semDescricao)}>
          {funcao.descricao ?? 'O banco não tem uma descrição para esta função.'}
        </p>
        <DonoDoObjeto dono={funcao.dono} aoAbrir={acoes.aoAbrirPapel} />
        <div className={estilos.selos}>
          <SeloTipoFuncao tipo={funcao.tipo} />
          <Selo tom="neutro">
            <span className="codigo">{funcao.linguagem}</span>
          </Selo>
          {funcao.tipo === 'PROCEDIMENTO' ? null : (
            <Selo tom="neutro" titulo={efeitoDaVolatilidade[funcao.volatilidade]}>
              {rotuloVolatilidade[funcao.volatilidade]}
            </Selo>
          )}
          {funcao.segurancaDefinidor ? (
            <Selo tom="neutro" icone={KeyRound} titulo={`Roda com os privilégios de ${funcao.dono}`}>
              SECURITY DEFINER
            </Selo>
          ) : null}
          {situacoesDaFuncao(funcao, contexto).map((situacao) => (
            <SeloSituacaoFuncao key={situacao} situacao={situacao} />
          ))}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : TriangleAlert}>
          {aviso.texto}
        </Nota>
      ))}

      {comandos.map((comando, posicao) => (
        <SecaoCopiavel
          key={comando.situacao}
          id={`titulo-comando-funcao-${posicao}`}
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

      <SecaoUso funcao={funcao} contexto={contexto} />
      <SecaoAssinatura funcao={funcao} />

      <SecaoCopiavel
        id="titulo-codigo-funcao"
        titulo="Código"
        texto={funcao.definicao}
        copiado="Copiado"
        anuncio="Código copiado para a área de transferência."
        tituloDoErro="Não foi possível copiar o código"
        descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o código e copie por lá."
      />

      {deGatilho || funcao.gatilhos.length > 0 ? <SecaoGatilhos funcao={funcao} aoAbrirTabela={acoes.aoAbrirTabela} /> : null}
      {deGatilho ? null : <SecaoConsultas funcao={funcao} aoVerHistorico={acoes.aoVerHistorico} aoVerPlano={acoes.aoVerPlano} />}
      {deGatilho ? null : (
        <SecaoDependentes funcao={funcao} aoAbrirIndice={acoes.aoAbrirIndice} aoAbrirVisao={acoes.aoAbrirVisao} />
      )}
      {acoes.quemAcessa?.(funcao.id)}
    </div>
  );
}

function textoSemMedida(funcao: FuncaoDTO, contexto: ContextoDasFuncoes): string {
  if (contexto.rastreamento === 'NENHUM') {
    return 'O servidor não mede as chamadas das funções (track_functions = none). Com a medida ligada, as chamadas e os tempos aparecem aqui.';
  }
  return `O servidor mede só as funções em linguagens procedurais (track_functions = pl), e esta é em ${funcao.linguagem}. Uma função em SQL simples muitas vezes é embutida na consulta que a chama e nem chega a ser chamada; com track_functions = all, o PostgreSQL mede as que não são embutidas.`;
}

function SecaoUso({ funcao, contexto }: { funcao: FuncaoDTO; contexto: ContextoDasFuncoes }) {
  const uso = funcao.uso;
  const medio = tempoMedioPorChamada(uso);
  const propria = uso ? Math.round(parteDoTempoProprio(uso) * 100) : 0;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-uso-funcao">
      <h3 className={estilos.tituloSecao} id="titulo-uso-funcao">
        Uso nos últimos 30 dias
      </h3>
      {uso ? (
        <>
          <dl className={estilos.medidas}>
            <Medida rotulo="Chamadas" valor={formatarQuantidade(uso.chamadas)} dica={formatarNumero(uso.chamadas)} />
            <Medida rotulo="Tempo total" valor={uso.chamadas > 0 ? formatarDuracaoExtensa(uso.tempoTotalMs) : '—'} />
            <Medida rotulo="Por chamada" valor={medio === null ? '—' : formatarTempoPorChamada(medio)} />
            <Medida
              rotulo="Tempo próprio"
              valor={uso.chamadas > 0 ? `${formatarNumero(propria)}%` : '—'}
              dica={uso.chamadas > 0 ? formatarDuracaoExtensa(uso.tempoProprioMs) : undefined}
            />
          </dl>
          <p className={estilos.leitura}>
            {uso.chamadas === 0
              ? 'Nenhuma chamada nos últimos 30 dias.'
              : propria >= 100
                ? 'Todo o tempo foi gasto dentro da própria função: ela não chama outra função medida.'
                : `${formatarNumero(propria)}% do tempo foi gasto dentro da própria função; o resto, nas funções que ela chama.`}
          </p>
        </>
      ) : (
        <p className={estilos.leitura}>{textoSemMedida(funcao, contexto)}</p>
      )}
    </section>
  );
}

function descreverParametro(parametro: ParametroFuncaoDTO): string {
  const partes = [parametro.modo === 'IN' ? null : parametro.modo, parametro.tipo, parametro.padrao ? `padrão ${parametro.padrao}` : null];
  return partes.filter((parte): parte is string => parte !== null).join(' ');
}

function frasesDoRetorno(funcao: FuncaoDTO): string {
  if (funcao.tipo === 'PROCEDIMENTO') return 'Não devolve valor: é chamado com CALL e pode confirmar ou desfazer a transação por dentro.';
  if (funcao.tipo === 'GATILHO') return 'Devolve trigger: só roda quando um gatilho a dispara, nunca numa consulta.';
  return `Devolve ${funcao.retorno ?? 'void'}.`;
}

function SecaoAssinatura({ funcao }: { funcao: FuncaoDTO }) {
  const entradas = funcao.parametros.filter((parametro) => funcao.tipo === 'PROCEDIMENTO' || parametro.modo !== 'OUT');
  const caracteristicas: { rotulo: string; valor: string; efeito: string }[] = [
    ...(funcao.tipo === 'PROCEDIMENTO'
      ? []
      : [
          {
            rotulo: rotuloVolatilidade[funcao.volatilidade],
            valor: palavraDaVolatilidade[funcao.volatilidade],
            efeito: efeitoDaVolatilidade[funcao.volatilidade],
          },
        ]),
    ...(funcao.estrita
      ? [{ rotulo: 'Estrita', valor: 'STRICT', efeito: 'Devolve nulo sem rodar quando algum argumento é nulo.' }]
      : []),
    funcao.segurancaDefinidor
      ? {
          rotulo: 'Privilégios do dono',
          valor: 'SECURITY DEFINER',
          efeito: `Roda com os privilégios de ${funcao.dono}, o dono, e não com os de quem chama.`,
        }
      : {
          rotulo: 'Privilégios de quem chama',
          valor: 'SECURITY INVOKER',
          efeito: 'Roda com os privilégios de quem chama, o padrão do PostgreSQL.',
        },
    ...funcao.configuracoes.map((configuracao) => {
      const { parametro, valor } = descreverConfiguracao(configuracao);
      return {
        rotulo: parametro === 'search_path' ? 'Caminho de busca fixo' : 'Configuração própria',
        valor: `${parametro} = ${valor}`,
        efeito:
          parametro === 'search_path'
            ? 'Procura os objetos só nesses esquemas durante a execução, seja quem for que chame.'
            : 'Vale só durante a execução.',
      };
    }),
  ];

  return (
    <section className={estilos.secao} aria-labelledby="titulo-assinatura-funcao">
      <h3 className={estilos.tituloSecao} id="titulo-assinatura-funcao">
        Parâmetros e retorno
      </h3>
      {entradas.length > 0 ? (
        <dl className={estilos.colunas}>
          {entradas.map((parametro, posicao) => (
            <div key={`${parametro.nome ?? ''}-${posicao}`} className={estilos.coluna}>
              <dt className={`${estilos.nomeColuna} codigo`}>{parametro.nome ?? `$${posicao + 1}`}</dt>
              <dd className={`${estilos.tipoColuna} codigo`}>{descreverParametro(parametro)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className={estilos.leitura}>
        {entradas.length === 0 ? 'Não recebe argumentos. ' : ''}
        {frasesDoRetorno(funcao)}
      </p>
      <dl className={proprios.ajustes}>
        {caracteristicas.map((caracteristica) => (
          <div key={caracteristica.valor} className={proprios.ajuste}>
            <dt className={proprios.rotuloAjuste}>
              {caracteristica.rotulo}
              <span className={`${proprios.parametro} codigo`}>{caracteristica.valor}</span>
            </dt>
            <dd className={proprios.efeitoAjuste}>{caracteristica.efeito}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SecaoGatilhos({ funcao, aoAbrirTabela }: { funcao: FuncaoDTO; aoAbrirTabela: (id: string) => void }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-gatilhos-funcao">
      <h3 className={estilos.tituloSecao} id="titulo-gatilhos-funcao">
        Gatilhos que a chamam <span className={`${estilos.contagem} numeros`}>{formatarNumero(funcao.gatilhos.length)}</span>
      </h3>
      {funcao.gatilhos.length > 0 ? (
        <ul className={estilos.objetos}>
          {funcao.gatilhos.map((gatilho) => {
            const tabela = idDoObjeto(gatilho.tabela);
            return (
              <li key={`${tabela}-${gatilho.nome}`}>
                <button
                  type="button"
                  className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                  onClick={() => aoAbrirTabela(tabela)}
                >
                  <Zap className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className={estilos.textosObjeto}>
                    <span className={`${estilos.nomeObjeto} codigo`}>{gatilho.nome}</span>
                    <span className={estilos.tipoObjeto}>
                      Em <span className="codigo">{tabela}</span> · {descreverDisparo(gatilho)}
                    </span>
                    {gatilho.ativo ? null : (
                      <Selo tom="aviso" className={proprios.seloNaLista}>
                        Desativado
                      </Selo>
                    )}
                  </span>
                  <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="visualmente-oculto">. Abrir esta tabela em Tabelas</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={estilos.leitura}>Nenhum gatilho chama esta função. Sem um gatilho, uma função de gatilho nunca roda.</p>
      )}
    </section>
  );
}

function SecaoConsultas({
  funcao,
  aoVerHistorico,
  aoVerPlano,
}: Pick<AcoesDoDetalhe, 'aoVerHistorico' | 'aoVerPlano'> & { funcao: FuncaoDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-consultas-funcao">
      <h3 className={estilos.tituloSecao} id="titulo-consultas-funcao">
        Consultas que {funcao.tipo === 'PROCEDIMENTO' ? 'o chamam' : 'a chamam'} <span className={`${estilos.contagem} numeros`}>{formatarNumero(funcao.consultas.length)}</span>
      </h3>
      {funcao.consultas.length > 0 ? (
        <ul className={estilos.consultas}>
          {funcao.consultas.map((consulta) => (
            <li key={consulta.id}>
              <ItemConsulta consulta={consulta}>
                <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(consulta)}>
                  Ver plano
                </Botao>
                <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(consulta)}>
                  Ver histórico
                </Botao>
              </ItemConsulta>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.leitura}>
          Nenhuma consulta dos últimos 30 dias cita {funcao.tipo === 'PROCEDIMENTO' ? 'este procedimento' : 'esta função'} no
          texto. {funcao.uso && funcao.uso.chamadas > 0 ? 'As chamadas vêm de outra função ou de um gatilho.' : ''}
        </p>
      )}
    </section>
  );
}

function SecaoDependentes({
  funcao,
  aoAbrirIndice,
  aoAbrirVisao,
}: Pick<AcoesDoDetalhe, 'aoAbrirIndice' | 'aoAbrirVisao'> & { funcao: FuncaoDTO }) {
  const quantidade = funcao.indices.length + funcao.visoes.length;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-dependentes-funcao">
      <h3 className={estilos.tituloSecao} id="titulo-dependentes-funcao">
        Objetos que dependem {funcao.tipo === 'PROCEDIMENTO' ? 'dele' : 'dela'} <span className={`${estilos.contagem} numeros`}>{formatarNumero(quantidade)}</span>
      </h3>
      {quantidade > 0 ? (
        <>
          <ul className={estilos.objetos}>
            {funcao.indices.map((indice) => (
              <li key={indice.id}>
                <button
                  type="button"
                  className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                  onClick={() => aoAbrirIndice(indice.id, indice.tabela)}
                >
                  <Waypoints className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className={estilos.textosObjeto}>
                    <span className={`${estilos.nomeObjeto} codigo`}>{indice.nome}</span>
                    <span className={estilos.tipoObjeto}>
                      Índice em <span className="codigo">{indice.tabela}</span>
                    </span>
                  </span>
                  <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="visualmente-oculto">. Abrir este índice em Índices</span>
                </button>
              </li>
            ))}
            {funcao.visoes.map((visao) => {
              const id = idDoObjeto(visao);
              const Icone = visao.tipo === 'VISAO_MATERIALIZADA' ? Layers : Eye;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                    onClick={() => aoAbrirVisao(id)}
                  >
                    <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                    <span className={estilos.textosObjeto}>
                      <span className={`${estilos.nomeObjeto} codigo`}>
                        <NomeObjeto esquema={visao.esquema} nome={visao.nome} classeEsquema={estilos.esquema} />
                      </span>
                      <span className={estilos.tipoObjeto}>{rotuloTipoObjeto[visao.tipo]}</span>
                    </span>
                    <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                    <span className="visualmente-oculto">. Abrir esta visão em Visões</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className={estilos.leitura}>
            {pluralizar(quantidade, 'Este objeto deixa', 'Estes objetos deixam')} de funcionar se a função for removida ou
            mudar de assinatura, e o PostgreSQL recusa um DROP FUNCTION sem CASCADE.
          </p>
        </>
      ) : (
        <p className={estilos.leitura}>
          Nenhum índice ou visão depende {funcao.tipo === 'PROCEDIMENTO' ? 'deste procedimento' : 'desta função'}.
        </p>
      )}
    </section>
  );
}
