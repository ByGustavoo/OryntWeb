import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock, FlaskConical, SearchX, SquareFunction, TriangleAlert } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraFiltrosFuncoes } from '@/componentes/objetos/BarraFiltrosFuncoes';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { DetalheFuncao } from '@/componentes/objetos/DetalheFuncao';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { iconeDaSituacaoFuncao } from '@/componentes/objetos/SeloSituacaoFuncao';
import { EsqueletoFuncoes, TabelaFuncoes } from '@/componentes/objetos/TabelaFuncoes';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { QuemAcessa } from '@/componentes/usuarios/QuemAcessa';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosFuncoes } from '@/ganchos/useFiltrosFuncoes';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { usePermissao } from '@/ganchos/usePermissao';
import { usePermissoesSobDemanda } from '@/ganchos/usePermissoesSobDemanda';
import { useObjetoDaChegada, useVerObjeto } from '@/ganchos/useVerObjeto';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { FiltrosFuncoes, FuncaoDTO, OrdenacaoFuncoes, SituacaoFuncao } from '@/modelos/objetos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  PERIODO_DAS_FUNCOES,
  alternarOrdenacaoFuncoes,
  contarPorSituacaoFuncao,
  descreverFiltrosFuncoes,
  direcaoInicialDaOrdenacaoFuncoes,
  esquemasDasFuncoes,
  filtrarFuncoes,
  idDaFuncao,
  linguagensDasFuncoes,
  loteDeComandosDasFuncoes,
  loteQueMedeAsFuncoes,
  pontosDeAtencaoFuncoes,
  resumirFuncoes,
  rotuloFiltroSituacaoFuncao,
  semFiltrosFuncoes,
  temFiltroAtivoFuncoes,
  textoDaColetaDasFuncoes,
  tomDaSituacaoFuncao,
} from '@/regras/funcoes';
import type { AlvoDoPontoFuncao, ContextoDasFuncoes, PontoDeAtencaoFuncao } from '@/regras/funcoes';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import { caminhos } from '@/rotas/caminhos';
import { servicoObjetos } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nas funções deste banco, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [3, 3, 3];
const ERRO_AO_COPIAR = 'O navegador bloqueou a área de transferência. Abra cada função e copie o comando pelo detalhe.';

type Origem = 'LISTA' | 'PAINEL' | 'CHEGADA';

const textosDosAtalhos: Record<SituacaoFuncao, [singular: string, plural: string]> = {
  RISCO_DE_SEGURANCA: ['com risco de segurança', 'com risco de segurança'],
  PESADA: ['pesada', 'pesadas'],
  SEM_CHAMADAS: ['sem chamadas em 30 dias', 'sem chamadas em 30 dias'],
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver as funções que ele tem.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

function chaveDoPonto(ponto: PontoDeAtencaoFuncao): string {
  return ponto.alvo.tipo === 'FUNCAO' ? `${ponto.tipo}-${ponto.alvo.id}` : `${ponto.tipo}-filtro`;
}

function acaoDoPonto(ponto: PontoDeAtencaoFuncao): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'FILTRO') {
    return {
      acao: 'Ver na lista',
      rotulo: `Filtrar a lista pelas funções: ${rotuloFiltroSituacaoFuncao[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  return { acao: 'Abrir', rotulo: `Abrir ${ponto.funcao ? idDaFuncao(ponto.funcao) : 'a função'}` };
}

export default function PaginaFuncoes() {
  useTituloDocumento('Objetos do banco: Funções');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosFuncoes(caminhos.objetosFuncoes);

  return (
    <>
      <CabecalhoPagina
        titulo="Funções"
        descricao={
          conexao
            ? 'As funções e os procedimentos do banco, com o código, as chamadas, o tempo que gastam e quem depende de cada um.'
            : descreverSemConexao(situacao)
        }
      />
      {conexao ? (
        <ListaConectada key={conexao.id} simulada={conexao.simulada} filtros={filtros} mudarFiltros={mudarFiltros} />
      ) : (
        <PainelSemConexao />
      )}
    </>
  );
}

interface ListaConectadaProps {
  simulada: boolean;
  filtros: FiltrosFuncoes;
  mudarFiltros: (mudanca: Partial<FiltrosFuncoes>) => void;
}

function ListaConectada({ simulada, filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaOHistorico = useVerHistorico();
  const irParaOPlano = useVerPlano();
  const irParaObjeto = useVerObjeto();
  const chegada = useObjetoDaChegada();
  const chegadaAtendida = useRef(false);
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const ultimaAberta = useRef<string | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberta, setAberta] = useState<FuncaoDTO | null>(null);
  const veAcessos = usePermissao('BANCO_ACESSOS_VER');
  const permissoes = usePermissoesSobDemanda(aberta !== null && veAcessos);
  const [origem, setOrigem] = useState<Origem>('LISTA');

  const lista = useDadosAssincronos((signal) => servicoObjetos.listarFuncoes(signal), []);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const funcoes = useMemo(() => lista.dados?.funcoes ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDasFuncoes>(() => {
    const agora = new Date().toISOString();
    return {
      geradoEm: lista.dados?.geradoEm ?? agora,
      coletaDesde: lista.dados?.coletaDesde ?? agora,
      rastreamento: lista.dados?.rastreamento ?? 'PL',
    };
  }, [lista.dados]);
  const esquemas = useMemo(() => esquemasDasFuncoes(funcoes), [funcoes]);
  const linguagens = useMemo(() => linguagensDasFuncoes(funcoes), [funcoes]);
  const filtradas = useMemo(() => filtrarFuncoes(funcoes, filtros, contexto), [funcoes, filtros, contexto]);
  const pontos = useMemo(() => pontosDeAtencaoFuncoes(funcoes, contexto), [funcoes, contexto]);
  const contagens = useMemo(() => contarPorSituacaoFuncao(funcoes, contexto), [funcoes, contexto]);
  const lote = useMemo(
    () => (filtros.situacao === null ? null : loteDeComandosDasFuncoes(filtradas, filtros.situacao, contexto)),
    [filtros.situacao, filtradas, contexto],
  );
  const buscaDigitada = limparBusca(busca);
  const carregado = lista.dados !== null;
  const esquemaInexistente = carregado && filtros.esquema !== null && !esquemas.includes(filtros.esquema);
  const linguagemInexistente = carregado && filtros.linguagem !== null && !linguagens.includes(filtros.linguagem);
  const indiceAberta = aberta ? filtradas.findIndex((funcao) => funcao.id === aberta.id) : -1;
  const paginaAtual = useMemo(() => paginarLista(filtradas, filtros.pagina), [filtradas, filtros.pagina]);
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;
  const semMedida = carregado && funcoes.length > 0 && contexto.rastreamento === 'NENHUM';

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
  }, [esquemaInexistente, mudarFiltros]);

  useEffect(() => {
    if (linguagemInexistente) mudarFiltros({ linguagem: null });
  }, [linguagemInexistente, mudarFiltros]);

  useEffect(() => {
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  useEffect(() => {
    if (chegada === null || chegadaAtendida.current || !carregado) return;
    chegadaAtendida.current = true;
    const alvo = funcoes.find((funcao) => funcao.id === chegada);
    const posicao = alvo ? filtradas.indexOf(alvo) : -1;
    if (alvo) {
      ultimaAberta.current = alvo.id;
      setOrigem('CHEGADA');
      setAberta(alvo);
    }
    mudarFiltros(posicao >= 0 ? { pagina: paginaDaPosicao(posicao) } : {});
  }, [chegada, carregado, funcoes, filtradas, mudarFiltros]);

  const abrir = (funcao: FuncaoDTO, deOnde: Origem) => {
    ultimaAberta.current = funcao.id;
    setOrigem(deOnde);
    setAberta(funcao);
  };

  const seguirPonto = (alvo: AlvoDoPontoFuncao) => {
    if (alvo.tipo === 'FUNCAO') {
      const funcao = funcoes.find((candidata) => candidata.id === alvo.id);
      if (funcao) abrir(funcao, 'PAINEL');
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosFuncoes(), situacao: alvo.situacao });
    topo.current?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const posicao = indiceAberta + sentido;
    const vizinha = filtradas[posicao];
    if (indiceAberta < 0 || !vizinha) return;
    abrir(vizinha, origem);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosFuncoes());
  };

  const linhaDaUltimaAberta = () => {
    const id = ultimaAberta.current;
    if (id === null || origem === 'PAINEL') return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-funcao="${CSS.escape(id)}"] button`) ?? null;
  };

  const atalho = (situacao: SituacaoFuncao, icone: LucideIcon): AtalhoDaLista => {
    const [singular, plural] = textosDosAtalhos[situacao];
    return {
      chave: situacao,
      icone,
      tom: tomDaSituacaoFuncao(situacao),
      quantidade: contagens[situacao],
      texto: pluralizar(contagens[situacao], singular, plural),
      ativo: filtros.situacao === situacao,
      aoAlternar: () => mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
    };
  };

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoFuncoes) => mudarFiltros(alternarOrdenacaoFuncoes(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoFuncoes) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacaoFuncoes[ordenacao] }),
  };

  const coleta = textoDaColetaDasFuncoes(contexto);

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          As funções e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
          estiver ligado à API.
        </Nota>
      ) : null}

      {semMedida ? (
        <Nota tom="aviso" icone={TriangleAlert} titulo="O banco não mede as chamadas das funções.">
          <span className={estilos.notaComAcao}>
            <span>
              O <span className="codigo">track_functions</span> do servidor está em <span className="codigo">none</span>, e
              por isso nenhuma função é marcada sem chamadas ou pesada. Os dois comandos ligam a medida das funções em
              linguagens procedurais sem reiniciar o servidor. O Orynt não executa nada no banco.
            </span>
            <CopiarComandos lote={loteQueMedeAsFuncoes} seFalhar={ERRO_AO_COPIAR} />
          </span>
        </Nota>
      ) : null}

      {lista.dados === null && lista.carregando ? (
        <EsqueletoPontosDeAtencao descricao={DESCRICAO_DOS_PONTOS} linhasPorFrase={LINHAS_POR_FRASE_EM_ESPERA} />
      ) : null}
      {carregado && pontos.length > 0 ? (
        <PontosDeAtencao
          descricao={DESCRICAO_DOS_PONTOS}
          itens={pontos.map((ponto): ItemDeAtencao => {
            const { acao, rotulo } = acaoDoPonto(ponto);
            return {
              chave: chaveDoPonto(ponto),
              tom: ponto.tom,
              icone: iconeDaSituacaoFuncao[ponto.tipo],
              objeto: ponto.funcao ? { esquema: ponto.funcao.esquema, nome: `${ponto.funcao.nome}(${ponto.funcao.argumentos})` } : null,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao,
              rotuloDaAcao: rotulo,
              aoSeguir: () => seguirPonto(ponto.alvo),
            };
          })}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-funcoes" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-funcoes">
            Lista de funções
          </h2>
          <BarraFiltrosFuncoes
            busca={busca}
            filtros={filtros}
            esquemas={esquemas}
            linguagens={linguagens}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={carregado ? resumirFuncoes(funcoes, filtradas.length, filtros) : ''}
            complemento={
              carregado && funcoes.length > 0 ? (
                <p
                  className={juntarClasses(estilos.coleta, coleta.incompleta && estilos.coletaIncompleta)}
                  title={coleta.completo}
                >
                  <Clock size={14} strokeWidth={2} aria-hidden="true" />
                  {coleta.incompleta && contexto.rastreamento !== 'NENHUM' ? coleta.completo : coleta.curto}
                </p>
              ) : null
            }
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Funções que pedem atenção"
            atalhos={[
              atalho('RISCO_DE_SEGURANCA', iconeDaSituacaoFuncao.RISCO_DE_SEGURANCA),
              atalho('PESADA', iconeDaSituacaoFuncao.PESADA),
              atalho('SEM_CHAMADAS', iconeDaSituacaoFuncao.SEM_CHAMADAS),
            ]}
            acao={lote ? <CopiarComandos key={lote.comandos.join(' ')} lote={lote} seFalhar={ERRO_AO_COPIAR} /> : null}
            mostrarLimpar={temFiltroAtivoFuncoes(filtros) && filtradas.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoFuncoes linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
            tituloErro="Não foi possível carregar as funções"
          >
            {() =>
              funcoes.length === 0 ? (
                <EstadoVazio
                  icone={SquareFunction}
                  titulo="O banco não tem funções"
                  descricao="As funções e os procedimentos aparecem aqui assim que o banco tiver ao menos um fora dos esquemas do sistema e das extensões."
                />
              ) : filtradas.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma função encontrada"
                  descricao={`Nenhuma das ${formatarNumero(funcoes.length)} rotinas corresponde aos filtros (${descreverFiltrosFuncoes(filtros).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <TabelaFuncoes
                    funcoes={paginaAtual.itens}
                    contexto={contexto}
                    busca={filtros.busca}
                    idAberta={aberta?.id ?? null}
                    rolarAteAberta={origem === 'LISTA'}
                    aoAbrir={(funcao) => abrir(funcao, 'LISTA')}
                    {...ordenacaoDaTabela}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de funções"
                      resumo={`${formatarNumero(paginaAtual.primeiro)} a ${formatarNumero(paginaAtual.ultimo)} de ${formatarNumero(filtradas.length)}`}
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
      </Painel>

      <DetalheFuncao
        funcao={aberta}
        contexto={contexto}
        simulada={simulada}
        posicao={indiceAberta >= 0 ? indiceAberta + 1 : null}
        total={filtradas.length}
        aoPercorrer={percorrer}
        aoVerHistorico={(consulta) => irParaOHistorico(consulta.id, PERIODO_DAS_FUNCOES)}
        aoVerPlano={(consulta) => irParaOPlano(consulta.id)}
        aoAbrirTabela={irParaObjeto.tabela}
        aoAbrirIndice={irParaObjeto.indice}
        aoAbrirVisao={irParaObjeto.visao}
        aoAbrirPapel={irParaObjeto.papel}
        quemAcessa={
          veAcessos ? (id) => <QuemAcessa objetoId={id} permissoes={permissoes} aoVer={irParaObjeto.permissoesDoObjeto} /> : undefined
        }
        aoFechar={() => setAberta(null)}
        focoAoFechar={linhaDaUltimaAberta}
      />
    </div>
  );
}
