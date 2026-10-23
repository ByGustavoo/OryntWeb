import { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, ChevronRight, History, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { BarraFiltrosAlteracoes } from '@/componentes/usuarios/BarraFiltrosAlteracoes';
import { DetalheAlteracao } from '@/componentes/usuarios/DetalheAlteracao';
import { EsqueletoLinhaDoTempoAlteracoes, LinhaDoTempoAlteracoes } from '@/componentes/usuarios/LinhaDoTempoAlteracoes';
import { Botao, ConteudoAssincrono, EstadoVazio, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosAlteracoes } from '@/ganchos/useFiltrosAlteracoes';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { AlteracaoDTO, FiltrosAlteracoes } from '@/modelos/alteracoes';
import { useAlteracoes } from '@/provedores/ProvedorAlteracoes';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import { capacidadeDasOperacoes } from '@/regras/capacidadeAlteracoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  contarPorEstado,
  descreverFiltrosAlteracoes,
  filtrarAlteracoes,
  papeisDoHistorico,
  resumirAlteracoes,
  semFiltrosAlteracoes,
  temFiltroAtivoAlteracoes,
} from '@/regras/historicoAlteracoes';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import { indexarPermissoes } from '@/regras/permissoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoUsuarios } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 6;

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver o que o Orynt mudou nos papéis dele.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaAlteracoes() {
  useTituloDocumento('Usuários e permissões: Alterações');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosAlteracoes(caminhos.usuariosAlteracoes);

  return (
    <>
      <CabecalhoPagina
        titulo="Alterações"
        descricao={
          conexao
            ? 'O que o Orynt mudou nos papéis e nas permissões deste servidor: quem fez, quando, os comandos que rodaram e o que o banco recusou.'
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
  filtros: FiltrosAlteracoes;
  mudarFiltros: (mudanca: Partial<FiltrosAlteracoes>) => void;
}

function ListaConectada({ filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const { abrir: alterar, versao } = useAlteracoes();
  const navegar = useNavigate();
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [idAberta, setIdAberta] = useState<string | null>(null);
  const [rolarAteAberta, setRolarAteAberta] = useState(true);

  const lista = useDadosAssincronos((signal) => servicoUsuarios.listarAlteracoes(signal), [versao]);
  const pedirEstado = idAberta !== null;
  const estado = useDadosAssincronos(
    async (signal) => {
      if (!pedirEstado) return null;
      const [papeis, permissoes] = await Promise.all([servicoUsuarios.listarPapeis(signal), servicoUsuarios.listarPermissoes(signal)]);
      return { papeis, indice: indexarPermissoes(permissoes) };
    },
    [pedirEstado, versao],
  );
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const alteracoes = useMemo(() => lista.dados?.alteracoes ?? [], [lista.dados]);
  const filtradas = useMemo(() => filtrarAlteracoes(alteracoes, filtros), [alteracoes, filtros]);
  const papeis = useMemo(() => papeisDoHistorico(alteracoes), [alteracoes]);
  const contagens = useMemo(() => contarPorEstado(alteracoes), [alteracoes]);
  const paginaAtual = useMemo(() => paginarLista(filtradas, filtros.pagina), [filtradas, filtros.pagina]);
  const carregado = lista.dados !== null;
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;
  const buscaDigitada = limparBusca(busca);
  const aberta = idAberta === null ? null : (alteracoes.find((alteracao) => alteracao.id === idAberta) ?? null);
  const indiceAberto = aberta ? filtradas.indexOf(aberta) : -1;

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

  const papelForaDaLista = carregado && filtros.papel !== null && !papeis.includes(filtros.papel);

  useEffect(() => {
    if (papelForaDaLista) mudarFiltros({ papel: null });
  }, [papelForaDaLista, mudarFiltros]);

  const abrir = (alteracao: AlteracaoDTO, rolar: boolean) => {
    setRolarAteAberta(rolar);
    setIdAberta(alteracao.id);
    const posicao = filtradas.indexOf(alteracao);
    if (posicao >= 0 && paginaDaPosicao(posicao) !== paginaAtual.pagina) mudarFiltros({ pagina: paginaDaPosicao(posicao) });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const vizinha = filtradas[indiceAberto + sentido];
    if (indiceAberto < 0 || !vizinha) return;
    abrir(vizinha, true);
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosAlteracoes());
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const desfazer = (alteracao: AlteracaoDTO) => {
    if (!alteracao.inversas) return;
    alterar({ tipo: 'OPERACOES', operacoes: alteracao.inversas, origem: 'DESFAZER', desfaz: alteracao.id });
  };

  const capacidadeDeDesfazer = (alteracao: AlteracaoDTO) => {
    if (!alteracao.inversas || !estado.dados) return null;
    return capacidadeDasOperacoes(
      alteracao.inversas,
      { ator: estado.dados.papeis.papelDaConexao, papeis: estado.dados.papeis.papeis },
      estado.dados.indice,
    );
  };

  const linhaDaAberta = () =>
    idAberta === null ? null : (regiao.current?.querySelector<HTMLElement>(`[data-alteracao="${CSS.escape(idAberta)}"] button`) ?? null);

  return (
    <div className={estilos.blocos}>
      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-alteracoes" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-alteracoes">
            Lista de alterações
          </h2>
          <BarraFiltrosAlteracoes
            busca={busca}
            filtros={filtros}
            papeis={papeis}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={carregado ? resumirAlteracoes(alteracoes.length, filtradas.length, filtros) : ''}
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Alterações que pedem atenção"
            atalhos={[
              {
                chave: 'RECUSADA',
                icone: Ban,
                tom: 'erro',
                quantidade: contagens.RECUSADA,
                texto: pluralizar(contagens.RECUSADA, 'recusada pelo banco', 'recusadas pelo banco'),
                ativo: filtros.resultado === 'RECUSADA',
                aoAlternar: () => mudarFiltros({ resultado: filtros.resultado === 'RECUSADA' ? null : 'RECUSADA' }),
              },
            ]}
            mostrarLimpar={temFiltroAtivoAlteracoes(filtros) && filtradas.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoLinhaDoTempoAlteracoes linhas={LINHAS_DO_ESQUELETO} />}
            tituloErro="Não foi possível carregar as alterações"
          >
            {(dados) =>
              alteracoes.length === 0 ? (
                <EstadoVazio
                  icone={History}
                  titulo="Nenhuma alteração ainda"
                  descricao="Tudo o que o Orynt mudar nos papéis e nas permissões deste servidor aparece aqui, com quem fez, quando, os comandos e o desfazer."
                  acao={
                    <Botao variante="secundario" iconeDireita={ChevronRight} onClick={() => navegar(caminhos.usuariosPapeis)}>
                      Ir para Papéis
                    </Botao>
                  }
                />
              ) : filtradas.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma alteração encontrada"
                  descricao={`Nenhuma das ${formatarNumero(alteracoes.length)} alterações corresponde aos filtros (${descreverFiltrosAlteracoes(filtros).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <LinhaDoTempoAlteracoes
                    alteracoes={paginaAtual.itens}
                    geradoEm={dados.geradoEm}
                    idAberta={idAberta}
                    rolarAteAberta={rolarAteAberta}
                    aoAbrir={(alteracao) => abrir(alteracao, false)}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de alterações"
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

      <DetalheAlteracao
        alteracao={aberta}
        todas={alteracoes}
        posicao={indiceAberto >= 0 ? indiceAberto + 1 : null}
        total={filtradas.length}
        capacidadeDeDesfazer={capacidadeDeDesfazer}
        aoDesfazer={desfazer}
        aoAbrirAlteracao={(id) => {
          const alvo = alteracoes.find((alteracao) => alteracao.id === id);
          if (alvo) abrir(alvo, true);
        }}
        aoPercorrer={percorrer}
        aoFechar={() => setIdAberta(null)}
        focoAoFechar={linhaDaAberta}
      />
    </div>
  );
}
