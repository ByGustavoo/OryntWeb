import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock, DatabaseZap, EyeOff, FlaskConical, ScanEye, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraFiltrosVisoes } from '@/componentes/objetos/BarraFiltrosVisoes';
import { DetalheVisao } from '@/componentes/objetos/DetalheVisao';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { EsqueletoVisoes, TabelaVisoes } from '@/componentes/objetos/TabelaVisoes';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosVisoes } from '@/ganchos/useFiltrosVisoes';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { FiltroSituacaoVisao, FiltrosVisoes, OrdenacaoVisoes, VisaoDTO } from '@/modelos/objetos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import {
  PERIODO_DAS_LEITURAS,
  alternarOrdenacaoVisoes,
  descreverFiltrosVisoes,
  direcaoInicialDaOrdenacao,
  esquemasDasVisoes,
  filtrarVisoes,
  idDoObjeto,
  pontosDeAtencao,
  rotuloFiltroSituacao,
  resumirVisoes,
  semFiltrosVisoes,
  situacaoDaMaterializada,
  temFiltroAtivoVisoes,
  visoesSemLeitura,
} from '@/regras/visoes';
import type { AlvoDoPonto, ContextoDasVisoes, PontoDeAtencao, TipoPontoDeAtencao } from '@/regras/visoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoObjetos } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nas visões deste banco, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [2, 2, 1, 2];

const iconesDosPontos: Record<TipoPontoDeAtencao, LucideIcon> = {
  DESATUALIZADA_LIDA: Clock,
  SEM_DADOS: DatabaseZap,
  ATUALIZADA_SEM_LEITURA: EyeOff,
  SEM_LEITURA: EyeOff,
};

function rotuloDaAcaoDoPonto(ponto: PontoDeAtencao): string {
  if (ponto.alvo.tipo === 'FILTRO') {
    return `Filtrar a lista pelas visões ${rotuloFiltroSituacao[ponto.alvo.situacao].toLowerCase()}`;
  }
  return `Abrir ${ponto.visao ? idDoObjeto(ponto.visao) : 'a visão'}`;
}

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver as visões que ele tem.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaVisoes() {
  useTituloDocumento('Objetos do banco: Visões');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosVisoes(caminhos.objetosVisoes);

  return (
    <>
      <CabecalhoPagina
        titulo="Visões"
        descricao={
          conexao
            ? 'As visões comuns e materializadas do banco, com o que cada uma lê e quem as consulta.'
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
  filtros: FiltrosVisoes;
  mudarFiltros: (mudanca: Partial<FiltrosVisoes>) => void;
}

function ListaConectada({ simulada, filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaOHistorico = useVerHistorico();
  const irParaOPlano = useVerPlano();
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const ultimaAberta = useRef<string | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberta, setAberta] = useState<VisaoDTO | null>(null);
  const [abertaPeloPainel, setAbertaPeloPainel] = useState(false);

  const lista = useDadosAssincronos((signal) => servicoObjetos.listarVisoes(signal), []);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const visoes = useMemo(() => lista.dados?.visoes ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDasVisoes>(
    () => ({ geradoEm: lista.dados?.geradoEm ?? new Date().toISOString(), semLeitura: visoesSemLeitura(visoes) }),
    [lista.dados, visoes],
  );
  const esquemas = useMemo(() => esquemasDasVisoes(visoes), [visoes]);
  const filtradas = useMemo(() => filtrarVisoes(visoes, filtros, contexto), [visoes, filtros, contexto]);
  const conhecidas = useMemo(() => new Set(visoes.map((visao) => visao.id)), [visoes]);
  const pontos = useMemo(() => pontosDeAtencao(visoes, contexto), [visoes, contexto]);
  const buscaDigitada = limparBusca(busca);
  const esquemaInexistente = lista.dados !== null && filtros.esquema !== null && !esquemas.includes(filtros.esquema);
  const indiceAberta = aberta ? filtradas.findIndex((visao) => visao.id === aberta.id) : -1;
  const paginaAtual = useMemo(() => paginarLista(filtradas, filtros.pagina), [filtradas, filtros.pagina]);
  const paginaForaDaLista = lista.dados !== null && paginaAtual.pagina !== filtros.pagina;

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

  const abrir = (visao: VisaoDTO) => {
    ultimaAberta.current = visao.id;
    setAberta(visao);
  };

  const abrirObjeto = (id: string) => {
    const visao = visoes.find((candidata) => candidata.id === id);
    if (visao) abrir(visao);
  };

  const abrirPelaTabela = (visao: VisaoDTO) => {
    setAbertaPeloPainel(false);
    abrir(visao);
  };

  const seguirPonto = (alvo: AlvoDoPonto) => {
    if (alvo.tipo === 'VISAO') {
      setAbertaPeloPainel(true);
      abrirObjeto(alvo.id);
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosVisoes(), situacao: alvo.situacao });
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
    abrir(vizinha);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosVisoes());
  };

  const linhaDaUltimaAberta = () => {
    const id = ultimaAberta.current;
    if (id === null || abertaPeloPainel) return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-visao="${CSS.escape(id)}"] button`) ?? null;
  };

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoVisoes) => mudarFiltros(alternarOrdenacaoVisoes(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoVisoes) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacao[ordenacao] }),
  };

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          As visões e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
          estiver ligado à API.
        </Nota>
      ) : null}

      {lista.dados === null && lista.carregando ? (
        <EsqueletoPontosDeAtencao descricao={DESCRICAO_DOS_PONTOS} linhasPorFrase={LINHAS_POR_FRASE_EM_ESPERA} />
      ) : null}
      {lista.dados !== null && pontos.length > 0 ? (
        <PontosDeAtencao
          descricao={DESCRICAO_DOS_PONTOS}
          itens={pontos.map(
            (ponto): ItemDeAtencao => ({
              chave: ponto.alvo.tipo === 'VISAO' ? ponto.alvo.id : `${ponto.tipo}-${ponto.alvo.situacao}`,
              tom: ponto.tom,
              icone: iconesDosPontos[ponto.tipo],
              objeto: ponto.visao,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao: ponto.alvo.tipo === 'FILTRO' ? 'Ver na lista' : 'Abrir',
              rotuloDaAcao: rotuloDaAcaoDoPonto(ponto),
              aoSeguir: () => seguirPonto(ponto.alvo),
            }),
          )}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-visoes" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-visoes">
            Lista de visões
          </h2>
          <BarraFiltrosVisoes
            busca={busca}
            filtros={filtros}
            esquemas={esquemas}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={lista.dados ? resumirVisoes(visoes.length, filtradas.length, filtros) : ''}
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Visões que pedem atenção"
            atalhos={atalhosDeAtencao(visoes, contexto, filtros.situacao, (situacao) =>
              mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
            )}
            mostrarLimpar={temFiltroAtivoVisoes(filtros) && filtradas.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoVisoes linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
            tituloErro="Não foi possível carregar as visões"
          >
            {() =>
              visoes.length === 0 ? (
                <EstadoVazio
                  icone={ScanEye}
                  titulo="O banco não tem visões"
                  descricao="As visões comuns e materializadas aparecem aqui assim que o banco tiver ao menos uma fora dos esquemas do sistema."
                />
              ) : filtradas.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma visão encontrada"
                  descricao={`Nenhuma das ${formatarNumero(visoes.length)} visões corresponde aos filtros (${descreverFiltrosVisoes(filtros).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <TabelaVisoes
                    visoes={paginaAtual.itens}
                    contexto={contexto}
                    idAberta={aberta?.id ?? null}
                    rolarAteAberta={!abertaPeloPainel}
                    aoAbrir={abrirPelaTabela}
                    {...ordenacaoDaTabela}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de visões"
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

      <DetalheVisao
        visao={aberta}
        contexto={contexto}
        conhecidas={conhecidas}
        simulada={simulada}
        posicao={indiceAberta >= 0 ? indiceAberta + 1 : null}
        total={filtradas.length}
        aoPercorrer={percorrer}
        aoAbrirObjeto={abrirObjeto}
        aoVerHistorico={(consulta: ConsultaDetalhadaDTO) => irParaOHistorico(consulta.id, PERIODO_DAS_LEITURAS)}
        aoVerPlano={(consulta: ConsultaDetalhadaDTO) => irParaOPlano(consulta.id)}
        aoFechar={() => setAberta(null)}
        focoAoFechar={linhaDaUltimaAberta}
      />
    </div>
  );
}

function atalhosDeAtencao(
  visoes: VisaoDTO[],
  contexto: ContextoDasVisoes,
  ativa: FiltroSituacaoVisao | null,
  aoAlternar: (situacao: FiltroSituacaoVisao) => void,
): AtalhoDaLista[] {
  const contar = (situacao: 'NAO_POPULADA' | 'DESATUALIZADA') =>
    visoes.filter((visao) => situacaoDaMaterializada(visao, contexto.geradoEm) === situacao).length;
  const desatualizadas = contar('DESATUALIZADA');

  const atalho = (
    situacao: FiltroSituacaoVisao,
    icone: LucideIcon,
    quantidade: number,
    texto: string,
    tom: AtalhoDaLista['tom'] = 'aviso',
  ): AtalhoDaLista => ({
    chave: situacao,
    icone,
    tom,
    quantidade,
    texto,
    ativo: ativa === situacao,
    aoAlternar: () => aoAlternar(situacao),
  });

  return [
    atalho('SEM_DADOS', DatabaseZap, contar('NAO_POPULADA'), 'sem dados', 'erro'),
    atalho('DESATUALIZADAS', Clock, desatualizadas, pluralizar(desatualizadas, 'desatualizada', 'desatualizadas')),
    atalho('SEM_LEITURA', EyeOff, contexto.semLeitura.size, 'sem leitura em 30 dias'),
  ];
}
