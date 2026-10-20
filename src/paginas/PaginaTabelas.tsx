import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock, FlaskConical, SearchX, Table2 } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraFiltrosTabelas } from '@/componentes/objetos/BarraFiltrosTabelas';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { DetalheTabela } from '@/componentes/objetos/DetalheTabela';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { iconeDaSituacaoTabela } from '@/componentes/objetos/SeloSituacaoTabela';
import { EsqueletoTabelas, TabelaDeTabelas } from '@/componentes/objetos/TabelaDeTabelas';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { QuemAcessa } from '@/componentes/usuarios/QuemAcessa';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosTabelas } from '@/ganchos/useFiltrosTabelas';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { usePermissoesSobDemanda } from '@/ganchos/usePermissoesSobDemanda';
import { useObjetoDaChegada, useVerObjeto } from '@/ganchos/useVerObjeto';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { FiltrosTabelas, OrdenacaoTabelas, SituacaoTabela, TabelaDTO } from '@/modelos/objetos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import {
  PERIODO_DAS_TABELAS,
  alternarOrdenacaoTabelas,
  contarPorSituacao,
  descreverFiltrosTabelas,
  direcaoInicialDaOrdenacaoTabelas,
  esquemasDasTabelas,
  filtrarTabelas,
  loteDeComandosDasTabelas,
  pontosDeAtencaoTabelas,
  resumirTabelas,
  rotuloFiltroSituacaoTabela,
  semFiltrosTabelas,
  temFiltroAtivoTabelas,
  textoDaColetaDasTabelas,
  tomDaSituacao,
} from '@/regras/tabelas';
import type { AlvoDoPontoTabela, ContextoDasTabelas, PontoDeAtencaoTabela } from '@/regras/tabelas';
import { idDoObjeto } from '@/regras/visoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoObjetos } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nas tabelas deste banco, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [3, 3, 2, 2, 2];
const ERRO_AO_COPIAR = 'O navegador bloqueou a área de transferência. Abra cada tabela e copie o comando pelo detalhe.';

type Origem = 'LISTA' | 'PAINEL' | 'CHEGADA';

const textosDosAtalhos: Record<SituacaoTabela, [singular: string, plural: string]> = {
  IDADE_ALTA: ['com idade alta', 'com idade alta'],
  PRECISA_VACUUM: ['precisa de VACUUM', 'precisam de VACUUM'],
  LIDA_INTEIRA: ['lida inteira', 'lidas inteiras'],
  ESTATISTICAS_DESATUALIZADAS: ['com estatísticas antigas', 'com estatísticas antigas'],
  SEM_CHAVE_PRIMARIA: ['sem chave primária', 'sem chave primária'],
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver as tabelas que ele tem.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

function chaveDoPonto(ponto: PontoDeAtencaoTabela): string {
  return ponto.alvo.tipo === 'TABELA' ? `${ponto.tipo}-${ponto.alvo.id}` : `${ponto.tipo}-filtro`;
}

function acaoDoPonto(ponto: PontoDeAtencaoTabela): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'FILTRO') {
    return {
      acao: 'Ver na lista',
      rotulo: `Filtrar a lista pelas tabelas: ${rotuloFiltroSituacaoTabela[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  return { acao: 'Abrir', rotulo: `Abrir ${ponto.tabela ? idDoObjeto(ponto.tabela) : 'a tabela'}` };
}

export default function PaginaTabelas() {
  useTituloDocumento('Objetos do banco: Tabelas');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosTabelas(caminhos.objetosTabelas);

  return (
    <>
      <CabecalhoPagina
        titulo="Tabelas"
        descricao={
          conexao
            ? 'As tabelas do banco, com o espaço que ocupam, como são lidas, quanto crescem e a manutenção que pedem.'
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
  filtros: FiltrosTabelas;
  mudarFiltros: (mudanca: Partial<FiltrosTabelas>) => void;
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
  const [aberta, setAberta] = useState<TabelaDTO | null>(null);
  const permissoes = usePermissoesSobDemanda(aberta !== null);
  const [origem, setOrigem] = useState<Origem>('LISTA');

  const lista = useDadosAssincronos((signal) => servicoObjetos.listarTabelas(signal), []);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const tabelas = useMemo(() => lista.dados?.tabelas ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDasTabelas>(() => {
    const agora = new Date().toISOString();
    return { geradoEm: lista.dados?.geradoEm ?? agora, coletaDesde: lista.dados?.coletaDesde ?? agora };
  }, [lista.dados]);
  const esquemas = useMemo(() => esquemasDasTabelas(tabelas), [tabelas]);
  const filtradas = useMemo(() => filtrarTabelas(tabelas, filtros), [tabelas, filtros]);
  const pontos = useMemo(() => pontosDeAtencaoTabelas(tabelas, contexto), [tabelas, contexto]);
  const contagens = useMemo(() => contarPorSituacao(tabelas), [tabelas]);
  const lote = useMemo(
    () => (filtros.situacao === null ? null : loteDeComandosDasTabelas(filtradas, filtros.situacao)),
    [filtros.situacao, filtradas],
  );
  const buscaDigitada = limparBusca(busca);
  const carregado = lista.dados !== null;
  const esquemaInexistente = carregado && filtros.esquema !== null && !esquemas.includes(filtros.esquema);
  const indiceAberta = aberta ? filtradas.findIndex((tabela) => tabela.id === aberta.id) : -1;
  const paginaAtual = useMemo(() => paginarLista(filtradas, filtros.pagina), [filtradas, filtros.pagina]);
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
  }, [esquemaInexistente, mudarFiltros]);

  useEffect(() => {
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  useEffect(() => {
    if (chegada === null || chegadaAtendida.current || !carregado) return;
    chegadaAtendida.current = true;
    const alvo = tabelas.find((tabela) => tabela.id === chegada);
    const posicao = alvo ? filtradas.indexOf(alvo) : -1;
    if (alvo) {
      ultimaAberta.current = alvo.id;
      setOrigem('CHEGADA');
      setAberta(alvo);
    }
    mudarFiltros(posicao >= 0 ? { pagina: paginaDaPosicao(posicao) } : {});
  }, [chegada, carregado, tabelas, filtradas, mudarFiltros]);

  const abrir = (tabela: TabelaDTO, deOnde: Origem) => {
    ultimaAberta.current = tabela.id;
    setOrigem(deOnde);
    setAberta(tabela);
  };

  const seguirPonto = (alvo: AlvoDoPontoTabela) => {
    if (alvo.tipo === 'TABELA') {
      const tabela = tabelas.find((candidata) => candidata.id === alvo.id);
      if (tabela) abrir(tabela, 'PAINEL');
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosTabelas(), situacao: alvo.situacao });
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
    mudarFiltros(semFiltrosTabelas());
  };

  const linhaDaUltimaAberta = () => {
    const id = ultimaAberta.current;
    if (id === null || origem === 'PAINEL') return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-tabela="${CSS.escape(id)}"] button`) ?? null;
  };

  const atalho = (situacao: SituacaoTabela, icone: LucideIcon): AtalhoDaLista => {
    const [singular, plural] = textosDosAtalhos[situacao];
    return {
      chave: situacao,
      icone,
      tom: tomDaSituacao(situacao),
      quantidade: contagens[situacao],
      texto: pluralizar(contagens[situacao], singular, plural),
      ativo: filtros.situacao === situacao,
      aoAlternar: () => mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
    };
  };

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoTabelas) => mudarFiltros(alternarOrdenacaoTabelas(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoTabelas) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacaoTabelas[ordenacao] }),
  };

  const coleta = textoDaColetaDasTabelas(contexto);

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          As tabelas e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
          estiver ligado à API.
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
              icone: iconeDaSituacaoTabela[ponto.tipo],
              objeto: ponto.tabela,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao,
              rotuloDaAcao: rotulo,
              aoSeguir: () => seguirPonto(ponto.alvo),
            };
          })}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-tabelas" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-tabelas">
            Lista de tabelas
          </h2>
          <BarraFiltrosTabelas
            busca={busca}
            filtros={filtros}
            esquemas={esquemas}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={carregado ? resumirTabelas(tabelas, filtradas.length, filtros) : ''}
            complemento={
              carregado && tabelas.length > 0 ? (
                <p
                  className={juntarClasses(estilos.coleta, coleta.incompleta && estilos.coletaIncompleta)}
                  title={coleta.completo}
                >
                  <Clock size={14} strokeWidth={2} aria-hidden="true" />
                  {coleta.incompleta ? coleta.completo : coleta.curto}
                </p>
              ) : null
            }
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Tabelas que pedem atenção"
            atalhos={[
              atalho('IDADE_ALTA', iconeDaSituacaoTabela.IDADE_ALTA),
              atalho('PRECISA_VACUUM', iconeDaSituacaoTabela.PRECISA_VACUUM),
              atalho('LIDA_INTEIRA', iconeDaSituacaoTabela.LIDA_INTEIRA),
              atalho('ESTATISTICAS_DESATUALIZADAS', iconeDaSituacaoTabela.ESTATISTICAS_DESATUALIZADAS),
              atalho('SEM_CHAVE_PRIMARIA', iconeDaSituacaoTabela.SEM_CHAVE_PRIMARIA),
            ]}
            acao={lote ? <CopiarComandos key={lote.comandos.join(' ')} lote={lote} seFalhar={ERRO_AO_COPIAR} /> : null}
            mostrarLimpar={temFiltroAtivoTabelas(filtros) && filtradas.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoTabelas linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
            tituloErro="Não foi possível carregar as tabelas"
          >
            {() =>
              tabelas.length === 0 ? (
                <EstadoVazio
                  icone={Table2}
                  titulo="O banco não tem tabelas"
                  descricao="As tabelas aparecem aqui assim que o banco tiver ao menos uma fora dos esquemas do sistema."
                />
              ) : filtradas.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma tabela encontrada"
                  descricao={`Nenhuma das ${formatarNumero(tabelas.length)} tabelas corresponde aos filtros (${descreverFiltrosTabelas(filtros).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <TabelaDeTabelas
                    tabelas={paginaAtual.itens}
                    contexto={contexto}
                    idAberta={aberta?.id ?? null}
                    rolarAteAberta={origem === 'LISTA'}
                    aoAbrir={(tabela) => abrir(tabela, 'LISTA')}
                    {...ordenacaoDaTabela}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de tabelas"
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

      <DetalheTabela
        tabela={aberta}
        contexto={contexto}
        simulada={simulada}
        posicao={indiceAberta >= 0 ? indiceAberta + 1 : null}
        total={filtradas.length}
        aoPercorrer={percorrer}
        aoVerHistorico={(consulta) => irParaOHistorico(consulta.id, PERIODO_DAS_TABELAS)}
        aoVerPlano={(consulta) => irParaOPlano(consulta.id)}
        aoAbrirIndice={(indice, tabela) => irParaObjeto.indice(indice.id, tabela.id)}
        aoVerIndices={(tabela) => irParaObjeto.indicesDaTabela(tabela.id)}
        aoAbrirVisao={irParaObjeto.visao}
        aoAbrirFuncao={irParaObjeto.funcao}
        aoAbrirPapel={irParaObjeto.papel}
        quemAcessa={(id) => <QuemAcessa objetoId={id} permissoes={permissoes} aoVer={irParaObjeto.permissoesDoObjeto} />}
        aoFechar={() => setAberta(null)}
        focoAoFechar={linhaDaUltimaAberta}
      />
    </div>
  );
}
