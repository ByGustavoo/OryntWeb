import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, FlaskConical, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { BarraFiltrosSessoes } from '@/componentes/usuarios/BarraFiltrosSessoes';
import { CadeiasDeBloqueio } from '@/componentes/usuarios/CadeiasDeBloqueio';
import { DetalheSessao } from '@/componentes/usuarios/DetalheSessao';
import { EsqueletoResumoSessoes, ResumoSessoes } from '@/componentes/usuarios/ResumoSessoes';
import { iconeDaSituacaoSessao } from '@/componentes/usuarios/SeloSituacaoSessao';
import { EsqueletoSessoes, TabelaSessoes } from '@/componentes/usuarios/TabelaSessoes';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosSessoes } from '@/ganchos/useFiltrosSessoes';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useVerObjeto } from '@/ganchos/useVerObjeto';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { FiltrosSessoes, OrdenacaoSessoes, SessaoDTO, SituacaoSessao } from '@/modelos/sessoes';
import { useAlteracoes } from '@/provedores/ProvedorAlteracoes';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca, termosDaBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import {
  PERIODO_DO_HISTORICO_DA_SESSAO,
  SEGUNDOS_ENTRE_ATUALIZACOES,
  alternarOrdenacaoSessoes,
  bancoEfetivo,
  bancosDasSessoes,
  cadeiasDeBloqueio,
  contarPorSituacaoSessao,
  descreverFiltrosSessoes,
  direcaoInicialDaOrdenacaoSessoes,
  filtrarSessoes,
  loteDeComandosDasSessoes,
  noEscopo,
  papeisDasSessoes,
  pontosDeAtencaoSessoes,
  resumirSessoes,
  rotuloFiltroSituacaoSessao,
  semFiltrosSessoes,
  sugestoesDasSessoes,
  temFiltroAtivoSessoes,
  tomDaSituacaoSessao,
} from '@/regras/sessoes';
import type { AlvoDoPontoSessao, ContextoDasSessoes, PontoDeAtencaoSessao } from '@/regras/sessoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoUsuarios } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nas sessões agora, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [3, 2, 2, 2];
const ERRO_AO_COPIAR = 'O navegador bloqueou a área de transferência. Abra cada sessão e copie o comando pelo detalhe.';

type Origem = 'LISTA' | 'PAINEL';

const textosDosAtalhos: Record<SituacaoSessao, [singular: string, plural: string]> = {
  BLOQUEANDO: ['bloqueando outras', 'bloqueando outras'],
  ESPERANDO_BLOQUEIO: ['esperando bloqueio', 'esperando bloqueio'],
  OCIOSA_EM_TRANSACAO: ['transação parada', 'transações paradas'],
  CONSULTA_LONGA: ['consulta longa', 'consultas longas'],
  TRANSACAO_LONGA: ['transação longa', 'transações longas'],
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver as sessões abertas no servidor.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

function chaveDoPonto(ponto: PontoDeAtencaoSessao): string {
  if (ponto.alvo.tipo === 'SESSAO') return `${ponto.tipo}-${ponto.alvo.pid}`;
  if (ponto.alvo.tipo === 'PAPEL') return `${ponto.tipo}-${ponto.alvo.nome}`;
  return `${ponto.tipo}-filtro`;
}

function acaoDoPonto(ponto: PontoDeAtencaoSessao): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'FILTRO') {
    return {
      acao: 'Ver na lista',
      rotulo: `Filtrar a lista pelas sessões: ${rotuloFiltroSituacaoSessao[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  if (ponto.alvo.tipo === 'PAPEL') return { acao: 'Abrir papel', rotulo: `Abrir ${ponto.alvo.nome} em Papéis` };
  return { acao: 'Abrir', rotulo: `Abrir a sessão ${String(ponto.alvo.pid)}` };
}

function usePaginaVisivel(): boolean {
  const [visivel, setVisivel] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const atualizar = () => setVisivel(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', atualizar);
    return () => document.removeEventListener('visibilitychange', atualizar);
  }, []);
  return visivel;
}

export default function PaginaSessoes() {
  useTituloDocumento('Usuários e permissões: Sessões');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosSessoes(caminhos.usuariosSessoes);

  return (
    <>
      <CabecalhoPagina
        titulo="Sessões"
        descricao={
          conexao
            ? 'Quem está conectado ao servidor agora, o que cada sessão está fazendo e o que está travado.'
            : descreverSemConexao(situacao)
        }
      />
      {conexao ? (
        <ListaConectada
          key={conexao.id}
          simulada={conexao.simulada}
          banco={conexao.banco}
          filtros={filtros}
          mudarFiltros={mudarFiltros}
        />
      ) : (
        <PainelSemConexao />
      )}
    </>
  );
}

interface ListaConectadaProps {
  simulada: boolean;
  banco: string;
  filtros: FiltrosSessoes;
  mudarFiltros: (mudanca: Partial<FiltrosSessoes>) => void;
}

function ListaConectada({ simulada, banco, filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaObjeto = useVerObjeto();
  const irParaOPlano = useVerPlano();
  const irParaOHistorico = useVerHistorico();
  const visivel = usePaginaVisivel();
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const ultimaAberta = useRef<number | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [pidAberto, setPidAberto] = useState<number | null>(null);
  const [origem, setOrigem] = useState<Origem>('LISTA');

  const { versao } = useAlteracoes();
  const lista = useDadosAssincronos((signal) => servicoUsuarios.listarSessoes(signal), [versao]);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const sessoes = useMemo(() => lista.dados?.sessoes ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDasSessoes>(
    () => ({
      geradoEm: lista.dados?.geradoEm ?? new Date().toISOString(),
      bancoDaConexao: lista.dados?.bancoDaConexao ?? banco,
    }),
    [lista.dados, banco],
  );
  const filtrados = useMemo(() => filtrarSessoes(sessoes, filtros, contexto), [sessoes, filtros, contexto]);
  const noEscopoDoFiltro = useMemo(
    () => sessoes.filter((sessao) => noEscopo(sessao, filtros, contexto)).length,
    [sessoes, filtros, contexto],
  );
  const pontos = useMemo(() => (lista.dados ? pontosDeAtencaoSessoes(lista.dados, contexto) : []), [lista.dados, contexto]);
  const cadeias = useMemo(() => cadeiasDeBloqueio(sessoes), [sessoes]);
  const sugestoes = useMemo(() => (lista.dados ? sugestoesDasSessoes(lista.dados) : []), [lista.dados]);
  const contagens = useMemo(() => contarPorSituacaoSessao(sessoes, contexto), [sessoes, contexto]);
  const bancos = useMemo(() => bancosDasSessoes(sessoes, contexto), [sessoes, contexto]);
  const papeis = useMemo(() => papeisDasSessoes(sessoes, filtros.papel), [sessoes, filtros.papel]);
  const lote = useMemo(
    () => (filtros.situacao === null ? null : loteDeComandosDasSessoes(filtrados, filtros.situacao, sessoes, contexto)),
    [filtros.situacao, filtrados, sessoes, contexto],
  );
  const termos = useMemo(() => termosDaBusca(filtros.busca), [filtros.busca]);
  const buscaDigitada = limparBusca(busca);
  const carregado = lista.dados !== null;
  const aberta = pidAberto === null ? null : (sessoes.find((sessao) => sessao.pid === pidAberto) ?? null);
  const indiceAberto = aberta ? filtrados.indexOf(aberta) : -1;
  const paginaAtual = useMemo(() => paginarLista(filtrados, filtros.pagina), [filtrados, filtros.pagina]);
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;
  const atualizando = carregado && lista.carregando;
  const emPausa = aberta !== null || !visivel;

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const temporizador = window.setTimeout(() => mudarFiltros({ busca: buscaDigitada }), ESPERA_DA_BUSCA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscaDigitada, filtros.busca, mudarFiltros]);

  useEffect(() => {
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  const { recarregar } = lista;
  useEffect(() => {
    if (!filtros.automatica || emPausa || lista.carregando || lista.erro) return;
    const temporizador = window.setTimeout(recarregar, SEGUNDOS_ENTRE_ATUALIZACOES * 1000);
    return () => window.clearTimeout(temporizador);
  }, [filtros.automatica, emPausa, lista.carregando, lista.erro, lista.dados, recarregar]);

  const abrir = (sessao: SessaoDTO, deOnde: Origem) => {
    ultimaAberta.current = sessao.pid;
    setOrigem(deOnde);
    setPidAberto(sessao.pid);
  };

  const abrirPeloPid = (pid: number) => {
    const sessao = sessoes.find((candidata) => candidata.pid === pid);
    if (!sessao) return;
    abrir(sessao, origem);
    const posicao = filtrados.indexOf(sessao);
    if (posicao >= 0 && paginaDaPosicao(posicao) !== paginaAtual.pagina) mudarFiltros({ pagina: paginaDaPosicao(posicao) });
  };

  const seguirPonto = (alvo: AlvoDoPontoSessao) => {
    if (alvo.tipo === 'SESSAO') {
      const sessao = sessoes.find((candidata) => candidata.pid === alvo.pid);
      if (sessao) abrir(sessao, 'PAINEL');
      return;
    }
    if (alvo.tipo === 'PAPEL') {
      irParaObjeto.papel(alvo.nome);
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosSessoes(), banco: null, situacao: alvo.situacao });
    topo.current?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const posicao = indiceAberto + sentido;
    const vizinha = filtrados[posicao];
    if (indiceAberto < 0 || !vizinha) return;
    abrir(vizinha, origem);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosSessoes());
  };

  const linhaDaUltimaAberta = () => {
    const pid = ultimaAberta.current;
    if (pid === null || origem === 'PAINEL') return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-pid="${pid}"] button`) ?? null;
  };

  const atalho = (situacao: SituacaoSessao): AtalhoDaLista => {
    const [singular, plural] = textosDosAtalhos[situacao];
    return {
      chave: situacao,
      icone: iconeDaSituacaoSessao[situacao],
      tom: tomDaSituacaoSessao(situacao),
      quantidade: contagens[situacao],
      texto: pluralizar(contagens[situacao], singular, plural),
      ativo: filtros.situacao === situacao,
      aoAlternar: () => mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
    };
  };

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoSessoes) => mudarFiltros(alternarOrdenacaoSessoes(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoSessoes) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacaoSessoes[ordenacao] }),
  };

  const controlesDoRetrato = {
    atualizando,
    automatica: filtros.automatica,
    emPausa,
    aoAtualizar: recarregar,
    aoAlternarAutomatica: (automatica: boolean) => mudarFiltros({ automatica }),
  };

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          As sessões e os números desta tela são fictícios e não vêm do seu servidor. Eles dão lugar aos dados reais quando o
          Orynt estiver ligado à API.
        </Nota>
      ) : null}

      {lista.dados ? (
        <ResumoSessoes lista={lista.dados} {...controlesDoRetrato} />
      ) : lista.carregando ? (
        <EsqueletoResumoSessoes {...controlesDoRetrato} />
      ) : null}

      {carregado && cadeias.length > 0 ? (
        <CadeiasDeBloqueio cadeias={cadeias} contexto={contexto} aoAbrir={(sessao) => abrir(sessao, 'PAINEL')} />
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
              icone: ponto.tipo === 'SUGESTAO' ? iconeDaSituacaoSessao.OCIOSA_EM_TRANSACAO : iconeDaSituacaoSessao[ponto.tipo],
              objeto: null,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao,
              rotuloDaAcao: rotulo,
              aoSeguir: () => seguirPonto(ponto.alvo),
            };
          })}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-sessoes" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-sessoes">
            Lista de sessões
          </h2>
          <BarraFiltrosSessoes
            busca={busca}
            filtros={filtros}
            banco={bancoEfetivo(filtros, contexto)}
            bancoDaConexao={contexto.bancoDaConexao}
            bancos={bancos}
            papeis={papeis}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={carregado ? resumirSessoes(noEscopoDoFiltro, filtrados.length, filtros) : ''}
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Sessões que pedem atenção"
            atalhos={[
              atalho('BLOQUEANDO'),
              atalho('ESPERANDO_BLOQUEIO'),
              atalho('OCIOSA_EM_TRANSACAO'),
              atalho('CONSULTA_LONGA'),
              atalho('TRANSACAO_LONGA'),
            ]}
            acao={lote ? <CopiarComandos key={lote.comandos.join(' ')} lote={lote} seFalhar={ERRO_AO_COPIAR} /> : null}
            mostrarLimpar={temFiltroAtivoSessoes(filtros) && filtrados.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoSessoes linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
            tituloErro="Não foi possível carregar as sessões"
          >
            {() =>
              sessoes.length === 0 ? (
                <EstadoVazio
                  icone={Activity}
                  titulo="Nenhuma sessão no servidor"
                  descricao="As sessões aparecem aqui assim que alguém se conectar ao servidor."
                />
              ) : filtrados.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma sessão encontrada"
                  descricao={`Nenhuma das sessões corresponde aos filtros (${descreverFiltrosSessoes(filtros, contexto).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <TabelaSessoes
                    sessoes={paginaAtual.itens}
                    todas={sessoes}
                    contexto={contexto}
                    termos={termos}
                    pidAberto={pidAberto}
                    rolarAteAberta={origem === 'LISTA'}
                    aoAbrir={(sessao) => abrir(sessao, 'LISTA')}
                    {...ordenacaoDaTabela}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de sessões"
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
      </Painel>

      <DetalheSessao
        sessao={aberta}
        sessoes={sessoes}
        contexto={contexto}
        sugestoes={sugestoes}
        simulada={simulada}
        posicao={indiceAberto >= 0 ? indiceAberto + 1 : null}
        total={filtrados.length}
        aoPercorrer={percorrer}
        aoAbrirSessao={abrirPeloPid}
        aoAbrirPapel={irParaObjeto.papel}
        aoVerPlano={(consulta) => irParaOPlano(consulta)}
        aoVerHistorico={(consulta) => irParaOHistorico(consulta, PERIODO_DO_HISTORICO_DA_SESSAO)}
        aoFechar={() => setPidAberto(null)}
        focoAoFechar={linhaDaUltimaAberta}
      />
    </div>
  );
}
