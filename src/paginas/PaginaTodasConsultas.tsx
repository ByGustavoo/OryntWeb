import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { BarraFiltrosConsultas } from '@/componentes/consultas/BarraFiltrosConsultas';
import { DetalheConsulta } from '@/componentes/consultas/DetalheConsulta';
import { EsqueletoTodasConsultas, TabelaTodasConsultas } from '@/componentes/consultas/TabelaTodasConsultas';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { Botao, ConteudoAssincrono, Esqueleto, EstadoVazio, GrupoOpcoes, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosConsultas } from '@/ganchos/useFiltrosConsultas';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ConsultaDetalhadaDTO, FiltrosConsultas, PaginaConsultasDTO } from '@/modelos/consultas';
import { descricaoPeriodo, periodosDashboard, rotuloPeriodo } from '@/modelos/rotulos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { limparBusca, termosDaBusca } from '@/regras/buscaConsultas';
import { gerarArquivoDeConsultas } from '@/regras/exportacaoConsultas';
import type { PadraoNumerico } from '@/regras/exportacaoRelatorio';
import {
  alternarOrdenacao,
  consultaDaPonta,
  descreverFiltros,
  intervaloDaPagina,
  passoNaLista,
  posicaoNaLista,
  resumirResultado,
  semFiltros,
  temFiltroAtivo,
} from '@/regras/filtrosConsultas';
import type { PontaDaPagina, SentidoDoPasso } from '@/regras/filtrosConsultas';
import { caminhos } from '@/rotas/caminhos';
import { servicoConsultas } from '@/servicos';
import { baixarArquivo } from '@/utilitarios/download';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaTodasConsultas.module.css';

const TITULO = 'Todas as consultas';
const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;

const opcoesPeriodo = periodosDashboard.map((periodo) => ({ valor: periodo, rotulo: rotuloPeriodo[periodo] }));

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver as consultas que ele executa.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaTodasConsultas() {
  useTituloDocumento('Consultas SQL: Todas');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosConsultas(caminhos.consultasTodas);

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao={conexao ? `O que o banco executou ${descricaoPeriodo[filtros.periodo]}.` : descreverSemConexao(situacao)}
        acoes={
          conexao ? (
            <GrupoOpcoes
              rotulo="Período"
              opcoes={opcoesPeriodo}
              valor={filtros.periodo}
              aoMudar={(periodo) => mudarFiltros({ periodo })}
            />
          ) : undefined
        }
      />
      {conexao ? (
        <ListaConectada key={conexao.id} conexao={conexao} filtros={filtros} mudarFiltros={mudarFiltros} />
      ) : (
        <PainelSemConexao />
      )}
    </>
  );
}

interface ListaCarregada {
  pagina: PaginaConsultasDTO;
  aplicados: FiltrosConsultas;
}

interface ChegadaNaPagina {
  pagina: number;
  ponta: PontaDaPagina;
}

interface ListaConectadaProps {
  conexao: ConexaoDTO;
  filtros: FiltrosConsultas;
  mudarFiltros: (mudanca: Partial<FiltrosConsultas>) => void;
}

function ListaConectada({ conexao, filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const notificacoes = useNotificacoes();
  const irParaOHistorico = useVerHistorico();
  const irParaOPlano = useVerPlano();
  const topo = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const regiao = useRef<HTMLDivElement>(null);
  const ultimaAberta = useRef<string | null>(null);
  const [aberta, setAberta] = useState<ConsultaDetalhadaDTO | null>(null);
  const [chegada, setChegada] = useState<ChegadaNaPagina | null>(null);
  const [exportando, setExportando] = useState(false);

  const lista = useDadosAssincronos(
    async (signal): Promise<ListaCarregada> => ({ pagina: await servicoConsultas.listar(filtros, signal), aplicados: filtros }),
    [filtros],
  );
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const carregada = lista.dados;
  const trocandoDePeriodo = carregada !== null && carregada.aplicados.periodo !== filtros.periodo;
  const buscaAplicada = carregada?.aplicados.busca ?? '';
  const termos = useMemo(() => termosDaBusca(buscaAplicada), [buscaAplicada]);
  const buscaDigitada = limparBusca(busca);
  const paginaAlemDoFim =
    carregada !== null && !lista.carregando && carregada.pagina.itens.length === 0 && carregada.pagina.totalItens > 0
      ? carregada.pagina.totalPaginas
      : null;

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const temporizador = window.setTimeout(() => mudarFiltros({ busca: buscaDigitada }), ESPERA_DA_BUSCA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscaDigitada, filtros.busca, mudarFiltros]);

  useEffect(() => {
    if (paginaAlemDoFim !== null) mudarFiltros({ pagina: paginaAlemDoFim });
  }, [paginaAlemDoFim, mudarFiltros]);

  useEffect(() => {
    if (chegada === null) return;
    if (lista.erro) {
      setChegada(null);
      return;
    }
    if (lista.carregando || carregada === null || carregada.pagina.pagina !== chegada.pagina) return;
    const destino = consultaDaPonta(carregada.pagina, chegada.ponta);
    setChegada(null);
    if (!destino) return;
    ultimaAberta.current = destino.id;
    setAberta(destino);
  }, [chegada, lista.erro, lista.carregando, carregada]);

  const abrir = (consulta: ConsultaDetalhadaDTO) => {
    ultimaAberta.current = consulta.id;
    setAberta(consulta);
  };

  const fechar = () => {
    setAberta(null);
    setChegada(null);
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    if (!carregada || !aberta || chegada !== null) return;
    const passo = passoNaLista(carregada.pagina, aberta.id, sentido);
    if (!passo) return;
    if (passo.tipo === 'CONSULTA') {
      abrir(passo.consulta);
      return;
    }
    setChegada({ pagina: passo.pagina, ponta: passo.ponta });
    mudarFiltros({ pagina: passo.pagina });
  };

  const verHistorico = (consulta: ConsultaDetalhadaDTO) =>
    irParaOHistorico(consulta.id, carregada?.aplicados.periodo ?? filtros.periodo);

  const linhaDaUltimaAberta = () => {
    const id = ultimaAberta.current;
    if (id === null) return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-consulta="${CSS.escape(id)}"] button`) ?? null;
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltros());
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const exportar = async (padrao: PadraoNumerico) => {
    setExportando(true);
    try {
      const consultas = await servicoConsultas.listarTodas(filtros);
      const arquivo = gerarArquivoDeConsultas(consultas, { filtros, padrao, simulada: conexao.simulada, geradoEm: new Date() });
      baixarArquivo(arquivo);
      notificacoes.sucesso(
        'Arquivo gerado',
        `${arquivo.nome}, com ${formatarNumero(arquivo.linhas)} ${pluralizar(arquivo.linhas, 'consulta', 'consultas')}.`,
      );
    } catch (erro) {
      if (ehErroApi(erro, 'NAO_AUTORIZADO')) marcarDesconectada();
      else notificacoes.erro('Não foi possível exportar as consultas', 'O banco não respondeu ao pedido. Tente de novo em instantes.');
    } finally {
      setExportando(false);
    }
  };

  const totalFiltrado = carregada?.pagina.totalItens ?? 0;

  return (
    <div className={estilos.blocos}>
      {conexao.simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          As consultas e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o
          Orynt estiver ligado à API.
        </Nota>
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-consultas" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-consultas">
            Lista de consultas
          </h2>
          <BarraFiltrosConsultas
            busca={busca}
            filtros={filtros}
            exportando={exportando}
            podeExportar={totalFiltrado > 0}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
            aoExportar={(padrao) => void exportar(padrao)}
          />
          <ResumoDaLista
            carregada={carregada}
            emEspera={trocandoDePeriodo || (carregada === null && lista.carregando)}
            imediato={trocandoDePeriodo}
            podeLimpar={temFiltroAtivo(filtros) && !(carregada !== null && totalFiltrado === 0)}
            aoLimpar={limparFiltros}
          />
        </div>

        <div
          ref={regiao}
          className={juntarClasses(
            estilos.regiao,
            lista.carregando && carregada !== null && !trocandoDePeriodo && estilos.atualizando,
          )}
        >
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<ListaEmEspera linhas={LINHAS_DO_ESQUELETO} filtros={filtros} aoMudar={mudarFiltros} />}
            tituloErro="Não foi possível carregar as consultas"
          >
            {({ pagina, aplicados }) =>
              trocandoDePeriodo ? (
                <ListaEmEspera
                  linhas={pagina.itens.length || LINHAS_DO_ESQUELETO}
                  comPaginas={pagina.totalPaginas > 1}
                  imediato
                  filtros={filtros}
                  aoMudar={mudarFiltros}
                />
              ) : (
                <CorpoDaLista
                  pagina={pagina}
                  aplicados={aplicados}
                  filtros={filtros}
                  termos={termos}
                  aoMudar={mudarFiltros}
                  aoMudarPagina={mudarPagina}
                  idAberta={aberta?.id ?? null}
                  aoLimpar={limparFiltros}
                  aoAbrir={abrir}
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </Painel>

      <DetalheConsulta
        consulta={aberta}
        periodo={carregada?.aplicados.periodo ?? filtros.periodo}
        termos={termos}
        simulada={conexao.simulada}
        posicao={carregada && aberta ? posicaoNaLista(carregada.pagina, aberta.id) : null}
        total={totalFiltrado}
        trocandoDePagina={chegada !== null}
        aoPercorrer={percorrer}
        aoVerHistorico={verHistorico}
        aoVerPlano={(consulta) => irParaOPlano(consulta.id)}
        aoFechar={fechar}
        focoAoFechar={linhaDaUltimaAberta}
      />
    </div>
  );
}

interface ResumoDaListaProps {
  carregada: ListaCarregada | null;
  emEspera: boolean;
  imediato: boolean;
  podeLimpar: boolean;
  aoLimpar: () => void;
}

function ResumoDaLista({ carregada, emEspera, imediato, podeLimpar, aoLimpar }: ResumoDaListaProps) {
  return (
    <div className={estilos.resumo}>
      <p className={estilos.contagem} role="status">
        {emEspera ? (
          <Esqueleto largura={96} altura={12} imediato={imediato} />
        ) : carregada ? (
          resumirResultado(carregada.pagina, carregada.aplicados)
        ) : (
          ''
        )}
      </p>
      {podeLimpar ? (
        <Botao variante="terciario" tamanho="sm" onClick={aoLimpar}>
          Limpar filtros
        </Botao>
      ) : null}
    </div>
  );
}

interface ListaEmEsperaProps {
  linhas: number;
  comPaginas?: boolean;
  imediato?: boolean;
  filtros: FiltrosConsultas;
  aoMudar: (mudanca: Partial<FiltrosConsultas>) => void;
}

function ListaEmEspera({ linhas, comPaginas = false, imediato = false, filtros, aoMudar }: ListaEmEsperaProps) {
  return (
    <>
      <EsqueletoTodasConsultas
        linhas={linhas}
        imediato={imediato}
        ordenacao={filtros.ordenacao}
        direcao={filtros.direcao}
        aoAlternarOrdenacao={(ordenacao) => aoMudar(alternarOrdenacao(filtros, ordenacao))}
        aoEscolherOrdenacao={(ordenacao) => aoMudar({ ordenacao, direcao: 'DESC' })}
      />
      <div className={juntarClasses(estilos.paginacao, estilos.paginacaoEmEspera)} aria-hidden="true">
        <Esqueleto largura={96} altura={12} imediato={imediato} />
        {comPaginas ? <Esqueleto largura={148} altura={12} imediato={imediato} /> : null}
      </div>
    </>
  );
}

interface CorpoDaListaProps {
  pagina: PaginaConsultasDTO;
  aplicados: FiltrosConsultas;
  filtros: FiltrosConsultas;
  termos: string[];
  idAberta: string | null;
  aoMudar: (mudanca: Partial<FiltrosConsultas>) => void;
  aoMudarPagina: (pagina: number) => void;
  aoLimpar: () => void;
  aoAbrir: (consulta: ConsultaDetalhadaDTO) => void;
}

function CorpoDaLista({
  pagina,
  aplicados,
  filtros,
  termos,
  idAberta,
  aoMudar,
  aoMudarPagina,
  aoLimpar,
  aoAbrir,
}: CorpoDaListaProps) {
  if (pagina.totalDoPeriodo === 0) {
    return (
      <EstadoVazio
        icone={SearchX}
        titulo="Nenhuma consulta registrada no período"
        descricao="Escolha um período maior ou aguarde o banco receber consultas."
      />
    );
  }

  if (pagina.totalItens === 0) {
    const criterios = descreverFiltros(aplicados).join(', ');
    return (
      <EstadoVazio
        icone={SearchX}
        titulo="Nenhuma consulta encontrada"
        descricao={`Nenhuma das ${formatarNumero(pagina.totalDoPeriodo)} consultas do período corresponde aos filtros (${criterios}).`}
        acao={
          <Botao variante="secundario" onClick={aoLimpar}>
            Limpar filtros
          </Botao>
        }
      />
    );
  }

  const { primeiro, ultimo } = intervaloDaPagina(pagina);

  return (
    <>
      <TabelaTodasConsultas
        consultas={pagina.itens}
        termos={termos}
        ordenacao={filtros.ordenacao}
        direcao={filtros.direcao}
        idAberta={idAberta}
        aoAlternarOrdenacao={(ordenacao) => aoMudar(alternarOrdenacao(filtros, ordenacao))}
        aoEscolherOrdenacao={(ordenacao) => aoMudar({ ordenacao, direcao: 'DESC' })}
        aoAbrir={aoAbrir}
      />
      <Paginacao
        rotulo="Páginas da lista de consultas"
        resumo={`${formatarNumero(primeiro)} a ${formatarNumero(ultimo)} de ${formatarNumero(pagina.totalItens)}`}
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        aoMudar={aoMudarPagina}
        className={estilos.paginacao}
      />
    </>
  );
}
