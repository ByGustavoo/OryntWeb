import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock, CopyMinus, CopyX, EyeOff, Lightbulb, OctagonAlert, SearchX, Waypoints } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraFiltrosIndices } from '@/componentes/objetos/BarraFiltrosIndices';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { CustoDosIndices, EsqueletoCustoDosIndices } from '@/componentes/objetos/CustoDosIndices';
import { DetalheIndice } from '@/componentes/objetos/DetalheIndice';
import { Panorama } from '@/componentes/objetos/Panorama';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { EsqueletoSugestoesDeIndices, SugestoesDeIndices } from '@/componentes/objetos/SugestoesDeIndices';
import { EsqueletoIndices, TabelaIndices } from '@/componentes/objetos/TabelaIndices';
import {
  Abas,
  Botao,
  ConteudoAssincrono,
  Dica,
  EstadoVazio,
  idDaAba,
  Paginacao,
  Painel,
  PainelDaAba,
} from '@/componentes/ui';
import type { Aba } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosIndices } from '@/ganchos/useFiltrosIndices';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useObjetoDaChegada, useVerObjeto } from '@/ganchos/useVerObjeto';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type {
  AbaIndices,
  FiltroSituacaoIndice,
  FiltrosIndices,
  IndiceDTO,
  OrdenacaoIndices,
  UsoDoIndiceDTO,
} from '@/modelos/objetos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  PERIODO_DO_USO,
  alternarOrdenacaoIndices,
  contarPorFiltro,
  descreverFiltrosIndices,
  direcaoInicialDaOrdenacaoIndices,
  esquemasDosIndices,
  filtrarIndices,
  idDaTabela,
  loteDeComandos,
  pontosDeAtencaoIndices,
  resumirIndices,
  rotuloFiltroSituacaoIndice,
  semFiltrosIndices,
  sobreposicoesDosIndices,
  tabelasDosIndices,
  temFiltroAtivoIndices,
  textoDaColeta,
} from '@/regras/indices';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import type {
  AlvoDoPontoIndice,
  ContextoDosIndices,
  PontoDeAtencaoIndice,
  TipoPontoDeAtencaoIndice,
} from '@/regras/indices';
import { idDoObjeto } from '@/regras/visoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoObjetos } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'Do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [3, 2, 2, 2, 2];
const ID_DAS_ABAS = 'indices';

const iconesDosPontos: Record<TipoPontoDeAtencaoIndice, LucideIcon> = {
  INVALIDO: OctagonAlert,
  DUPLICADO: CopyX,
  REDUNDANTE: CopyMinus,
  SEM_USO: EyeOff,
  SUGERIDOS: Lightbulb,
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver os índices que ele tem.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

function chaveDoPonto(ponto: PontoDeAtencaoIndice): string {
  if (ponto.alvo.tipo === 'INDICE') return ponto.alvo.id;
  if (ponto.alvo.tipo === 'FILTRO') return `${ponto.tipo}-${ponto.alvo.situacao}`;
  return ponto.tipo;
}

function acaoDoPonto(ponto: PontoDeAtencaoIndice): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'FILTRO') {
    return {
      acao: 'Ver na lista',
      rotulo: `Filtrar a lista pelos índices ${rotuloFiltroSituacaoIndice[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  if (ponto.alvo.tipo === 'SUGESTOES') return { acao: 'Ver sugestões', rotulo: 'Abrir a aba dos índices sugeridos pelos planos' };
  return { acao: 'Abrir', rotulo: `Abrir ${ponto.indice ? idDoObjeto(ponto.indice) : 'o índice'}` };
}

export default function PaginaIndices() {
  useTituloDocumento('Objetos do banco: Índices');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosIndices(caminhos.objetosIndices);

  return (
    <>
      <CabecalhoPagina
        titulo="Índices"
        descricao={
          conexao
            ? 'Os índices do banco, com o espaço que ocupam, o quanto são lidos e o que custa mantê-los.'
            : descreverSemConexao(situacao)
        }
      />
      {conexao ? (
        <ListaConectada key={conexao.id} filtros={filtros} mudarFiltros={mudarFiltros} />
      ) : (
        <PainelSemConexao />
      )}
    </>
  );
}

interface ListaConectadaProps {
  filtros: FiltrosIndices;
  mudarFiltros: (mudanca: Partial<FiltrosIndices>) => void;
}

function ListaConectada({ filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaOHistorico = useVerHistorico();
  const irParaOPlano = useVerPlano();
  const irParaObjeto = useVerObjeto();
  const chegada = useObjetoDaChegada();
  const chegadaAtendida = useRef(false);
  const regiao = useRef<HTMLDivElement>(null);
  const inicio = useRef<HTMLDivElement>(null);
  const ultimoAberto = useRef<string | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberto, setAberto] = useState<IndiceDTO | null>(null);
  const [abertoPeloPainel, setAbertoPeloPainel] = useState(false);

  const lista = useDadosAssincronos((signal) => servicoObjetos.listarIndices(signal), []);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const indices = useMemo(() => lista.dados?.indices ?? [], [lista.dados]);
  const sugestoes = useMemo(() => lista.dados?.sugestoes ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDosIndices>(() => {
    const agora = new Date().toISOString();
    return {
      geradoEm: lista.dados?.geradoEm ?? agora,
      coletaDesde: lista.dados?.coletaDesde ?? agora,
      sobreposicoes: sobreposicoesDosIndices(indices),
    };
  }, [lista.dados, indices]);
  const esquemas = useMemo(() => esquemasDosIndices(indices), [indices]);
  const tabelas = useMemo(() => tabelasDosIndices(indices, filtros.esquema), [indices, filtros.esquema]);
  const filtrados = useMemo(() => filtrarIndices(indices, filtros, contexto), [indices, filtros, contexto]);
  const pontos = useMemo(() => pontosDeAtencaoIndices(indices, sugestoes, contexto), [indices, sugestoes, contexto]);
  const contagens = useMemo(() => contarPorFiltro(indices, contexto), [indices, contexto]);
  const lote = useMemo(
    () => (filtros.situacao === null ? null : loteDeComandos(filtrados, contexto)),
    [filtros.situacao, filtrados, contexto],
  );
  const buscaDigitada = limparBusca(busca);
  const carregado = lista.dados !== null;
  const esquemaInexistente = carregado && filtros.esquema !== null && !esquemas.includes(filtros.esquema);
  const tabelaInexistente = carregado && filtros.tabela !== null && !tabelas.includes(filtros.tabela);
  const indiceAberto = aberto ? filtrados.findIndex((indice) => indice.id === aberto.id) : -1;
  const paginaAtual = useMemo(() => paginarLista(filtrados, filtros.pagina), [filtrados, filtros.pagina]);
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const temporizador = window.setTimeout(() => mudarFiltros({ busca: buscaDigitada }), ESPERA_DA_BUSCA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscaDigitada, filtros.busca, mudarFiltros]);

  useEffect(() => {
    if (esquemaInexistente) mudarFiltros({ esquema: null });
    else if (tabelaInexistente) mudarFiltros({ tabela: null });
  }, [esquemaInexistente, tabelaInexistente, mudarFiltros]);

  useEffect(() => {
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  useEffect(() => {
    if (chegada === null || chegadaAtendida.current || !carregado) return;
    chegadaAtendida.current = true;
    const alvo = indices.find((indice) => indice.id === chegada);
    const posicao = alvo ? filtrados.indexOf(alvo) : -1;
    if (alvo) {
      ultimoAberto.current = alvo.id;
      setAbertoPeloPainel(true);
      setAberto(alvo);
    }
    mudarFiltros(posicao >= 0 ? { pagina: paginaDaPosicao(posicao), aba: 'EXISTENTES' } : {});
  }, [chegada, carregado, indices, filtrados, mudarFiltros]);

  const rolarAte = (elemento: HTMLElement | null) =>
    elemento?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });

  const abrir = (indice: IndiceDTO) => {
    ultimoAberto.current = indice.id;
    setAberto(indice);
  };

  const abrirIndice = (id: string) => {
    const indice = indices.find((candidato) => candidato.id === id);
    if (indice) abrir(indice);
  };

  const abrirPelaTabela = (indice: IndiceDTO) => {
    setAbertoPeloPainel(false);
    abrir(indice);
  };

  const seguirPonto = (alvo: AlvoDoPontoIndice) => {
    if (alvo.tipo === 'INDICE') {
      setAbertoPeloPainel(true);
      abrirIndice(alvo.id);
      return;
    }
    if (alvo.tipo === 'SUGESTOES') {
      mudarAba('SUGERIDOS');
      document.getElementById(idDaAba(ID_DAS_ABAS, 'SUGERIDOS'))?.focus({ preventScroll: true });
      rolarAte(inicio.current);
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosIndices(), situacao: alvo.situacao, aba: 'EXISTENTES' });
    rolarAte(inicio.current);
  };

  const mudarAba = (aba: AbaIndices) => {
    if (aba !== filtros.aba) mudarFiltros({ aba });
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    inicio.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const posicao = indiceAberto + sentido;
    const vizinho = filtrados[posicao];
    if (indiceAberto < 0 || !vizinho) return;
    abrir(vizinho);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosIndices());
  };

  const linhaDoUltimoAberto = () => {
    const id = ultimoAberto.current;
    if (id === null || abertoPeloPainel) return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-indice="${CSS.escape(id)}"] button`) ?? null;
  };

  const alternarSituacao = (situacao: FiltroSituacaoIndice) =>
    mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao });

  const filtrarPelaFigura = (situacao: FiltroSituacaoIndice) => {
    const ativo = filtros.aba === 'EXISTENTES' && filtros.situacao === situacao;
    mudarFiltros({ situacao: ativo ? null : situacao, aba: 'EXISTENTES' });
    if (!ativo) rolarAte(inicio.current);
  };

  const filtrarTabelaPelaFigura = (tabela: string) => {
    const ativa = filtros.aba === 'EXISTENTES' && filtros.tabela === tabela;
    mudarFiltros({ tabela: ativa ? null : tabela, esquema: null, aba: 'EXISTENTES' });
    if (!ativa) rolarAte(inicio.current);
  };

  const atalho = (
    situacao: FiltroSituacaoIndice,
    icone: LucideIcon,
    singular: string,
    plural: string,
    tom: AtalhoDaLista['tom'] = 'aviso',
  ): AtalhoDaLista => ({
    chave: situacao,
    icone,
    tom,
    quantidade: contagens[situacao],
    texto: pluralizar(contagens[situacao], singular, plural),
    ativo: filtros.situacao === situacao,
    aoAlternar: () => alternarSituacao(situacao),
  });

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoIndices) => mudarFiltros(alternarOrdenacaoIndices(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoIndices) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacaoIndices[ordenacao] }),
  };

  const verHistorico = (consulta: { id: string }) => irParaOHistorico(consulta.id, PERIODO_DO_USO);
  const abas: Aba<AbaIndices>[] = [
    { valor: 'EXISTENTES', rotulo: 'Índices existentes', rotuloCurto: 'Existentes', quantidade: carregado ? indices.length : null },
    { valor: 'SUGERIDOS', rotulo: 'Sugeridos pelos planos', rotuloCurto: 'Sugeridos', quantidade: carregado ? sugestoes.length : null },
  ];
  const coleta = textoDaColeta(contexto);

  return (
    <div className={estilos.blocos}>
      {lista.dados === null && lista.carregando ? (
        <Panorama
          figura={<EsqueletoCustoDosIndices />}
          pontos={
            <EsqueletoPontosDeAtencao
              descricao={DESCRICAO_DOS_PONTOS}
              linhasPorFrase={LINHAS_POR_FRASE_EM_ESPERA}
              variante="lateral"
            />
          }
        />
      ) : null}
      {carregado && indices.length > 0 ? (
        <Panorama
          figura={
            <CustoDosIndices
              indices={indices}
              contexto={contexto}
              situacaoAtiva={filtros.aba === 'EXISTENTES' ? filtros.situacao : null}
              tabelaAtiva={filtros.aba === 'EXISTENTES' ? filtros.tabela : null}
              aoFiltrarSituacao={filtrarPelaFigura}
              aoFiltrarTabela={filtrarTabelaPelaFigura}
            />
          }
          pontos={
            pontos.length > 0 ? (
              <PontosDeAtencao
                descricao={DESCRICAO_DOS_PONTOS}
                variante="lateral"
                itens={pontos.map((ponto): ItemDeAtencao => {
                  const { acao, rotulo } = acaoDoPonto(ponto);
                  return {
                    chave: chaveDoPonto(ponto),
                    tom: ponto.tom,
                    icone: iconesDosPontos[ponto.tipo],
                    objeto: ponto.indice,
                    titulo: ponto.titulo,
                    texto: ponto.texto,
                    acao,
                    rotuloDaAcao: rotulo,
                    aoSeguir: () => seguirPonto(ponto.alvo),
                  };
                })}
              />
            ) : null
          }
        />
      ) : null}

      <div ref={inicio} className={estilos.ancora}>
        <Painel como="div" espacamento="nenhum" aria-busy={lista.carregando}>
          <Abas
            id={ID_DAS_ABAS}
            rotulo="Índices do banco"
            abas={abas}
            valor={filtros.aba}
            aoMudar={mudarAba}
          />

          <PainelDaAba id={ID_DAS_ABAS} valor="EXISTENTES" ativa={filtros.aba === 'EXISTENTES'}>
            <div className={estilos.topo}>
              <h2 className="visualmente-oculto">Lista de índices</h2>
              <BarraFiltrosIndices
                busca={busca}
                filtros={filtros}
                esquemas={esquemas}
                tabelas={tabelas}
                aoDigitarBusca={setBusca}
                aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
                aoMudar={mudarFiltros}
              />
              <ResumoDaLista
                contagem={carregado ? resumirIndices(indices, filtrados.length, filtros) : ''}
                complemento={
                  carregado && indices.length > 0 ? (
                    <Dica conteudo={coleta.completo}>
                      <p
                        className={juntarClasses(estilos.coleta, coleta.incompleta && estilos.coletaIncompleta)}
                      >
                        <Clock size={14} strokeWidth={2} aria-hidden="true" />
                        {coleta.incompleta ? coleta.completo : coleta.curto}
                      </p>
                    </Dica>
                  ) : null
                }
                emEspera={lista.dados === null && lista.carregando}
                rotuloDosAtalhos="Índices que pedem atenção"
                atalhos={[
                  atalho('INVALIDOS', OctagonAlert, 'inválido', 'inválidos', 'erro'),
                  atalho('DUPLICADOS', CopyX, 'duplicado', 'duplicados'),
                  atalho('SEM_USO', EyeOff, 'sem uso em 30 dias', 'sem uso em 30 dias'),
                ]}
                acao={lote ? <CopiarComandos key={lote.comandos.join(' ')} lote={lote} /> : null}
                mostrarLimpar={temFiltroAtivoIndices(filtros) && filtrados.length > 0}
                aoLimpar={limparFiltros}
              />
            </div>

            <div ref={regiao}>
              <ConteudoAssincrono
                resultado={lista}
                esqueleto={<EsqueletoIndices linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
                tituloErro="Não foi possível carregar os índices"
              >
                {() =>
                  indices.length === 0 ? (
                    <EstadoVazio
                      icone={Waypoints}
                      titulo="O banco não tem índices"
                      descricao="Os índices aparecem aqui assim que o banco tiver ao menos uma tabela com índice fora dos esquemas do sistema."
                    />
                  ) : filtrados.length === 0 ? (
                    <EstadoVazio
                      icone={SearchX}
                      titulo="Nenhum índice encontrado"
                      descricao={`Nenhum dos ${formatarNumero(indices.length)} índices corresponde aos filtros (${descreverFiltrosIndices(filtros).join(', ')}).`}
                      acao={
                        <Botao variante="secundario" onClick={limparFiltros}>
                          Limpar filtros
                        </Botao>
                      }
                    />
                  ) : (
                    <>
                      <TabelaIndices
                        indices={paginaAtual.itens}
                        contexto={contexto}
                        idAberto={aberto?.id ?? null}
                        rolarAteAberto={!abertoPeloPainel}
                        aoAbrir={abrirPelaTabela}
                        {...ordenacaoDaTabela}
                      />
                      {paginaAtual.totalPaginas > 1 ? (
                        <Paginacao
                          rotulo="Páginas da lista de índices"
                          resumo={`${formatarNumero(paginaAtual.primeiro)} a ${formatarNumero(paginaAtual.ultimo)} de ${formatarNumero(filtrados.length)}`}
                          pagina={paginaAtual.pagina}
                          totalPaginas={paginaAtual.totalPaginas}
                          aoMudar={mudarPagina}
                          className={estilos.paginacao}
                        />
                      ) : null}
                    </>
                  )
                }
              </ConteudoAssincrono>
            </div>
          </PainelDaAba>

          <PainelDaAba id={ID_DAS_ABAS} valor="SUGERIDOS" ativa={filtros.aba === 'SUGERIDOS'}>
            <ConteudoAssincrono
              resultado={lista}
              esqueleto={<EsqueletoSugestoesDeIndices />}
              tituloErro="Não foi possível carregar os índices sugeridos"
            >
              {() =>
                sugestoes.length === 0 ? (
                  <EstadoVazio
                    icone={Lightbulb}
                    titulo="Nenhum índice sugerido"
                    descricao="Os planos de execução dos últimos 30 dias não pedem nenhum índice que o banco ainda não tenha."
                  />
                ) : (
                  <SugestoesDeIndices
                    sugestoes={sugestoes}
                    aoVerPlano={(consulta) => irParaOPlano(consulta.id)}
                    aoVerHistorico={verHistorico}
                  />
                )
              }
            </ConteudoAssincrono>
          </PainelDaAba>
        </Painel>
      </div>

      <DetalheIndice
        indice={aberto}
        indices={indices}
        contexto={contexto}
        posicao={indiceAberto >= 0 ? indiceAberto + 1 : null}
        total={filtrados.length}
        aoPercorrer={percorrer}
        aoAbrirIndice={abrirIndice}
        aoVerTabela={(indice: IndiceDTO) =>
          indice.tabela.tipo === 'TABELA' ? irParaObjeto.tabela(idDaTabela(indice)) : irParaObjeto.visao(idDaTabela(indice))
        }
        aoAbrirFuncao={irParaObjeto.funcao}
        aoVerHistorico={(uso: UsoDoIndiceDTO) => verHistorico(uso.consulta)}
        aoVerPlano={(uso: UsoDoIndiceDTO) =>
          irParaOPlano(uso.consulta.id, uso.versao === uso.versaoAtual ? null : uso.versao)
        }
        aoCompararPlanos={(uso: UsoDoIndiceDTO) => irParaOPlano(uso.consulta.id, uso.versaoAtual, uso.versao)}
        aoFechar={() => setAberto(null)}
        focoAoFechar={linhaDoUltimoAberto}
      />
    </div>
  );
}
