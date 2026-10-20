import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, FlaskConical, SearchX, UsersRound } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { BarraFiltrosPapeis } from '@/componentes/usuarios/BarraFiltrosPapeis';
import { DetalhePapel } from '@/componentes/usuarios/DetalhePapel';
import { iconeDaSituacaoPapel } from '@/componentes/usuarios/SeloSituacaoPapel';
import { EsqueletoPapeis, TabelaPapeis } from '@/componentes/usuarios/TabelaPapeis';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosPapeis } from '@/ganchos/useFiltrosPapeis';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useObjetoDaChegada, useVerObjeto } from '@/ganchos/useVerObjeto';
import type { FiltrosPapeis, ObjetoDoPapelDTO, OrdenacaoPapeis, PapelDTO, SituacaoPapel } from '@/modelos/papeis';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import {
  alternarOrdenacaoPapeis,
  contarPorSituacaoPapel,
  descreverFiltrosPapeis,
  direcaoInicialDaOrdenacaoPapeis,
  filtrarPapeis,
  loteDeComandosDosPapeis,
  pontosDeAtencaoPapeis,
  resumirPapeis,
  rotuloFiltroSituacaoPapel,
  semFiltrosPapeis,
  situacoesDoPapel,
  temFiltroAtivoPapeis,
  textoDaColetaDosPapeis,
  tomDaSituacaoPapel,
} from '@/regras/papeis';
import type { AlvoDoPontoPapel, ContextoDosPapeis, PontoDeAtencaoPapel } from '@/regras/papeis';
import { caminhos } from '@/rotas/caminhos';
import { servicoUsuarios } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nos papéis deste banco, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [3, 2, 2, 2, 2, 2, 2];
const ERRO_AO_COPIAR = 'O navegador bloqueou a área de transferência. Abra cada papel e copie o comando pelo detalhe.';

type Origem = 'LISTA' | 'PAINEL' | 'CHEGADA';

const textosDosAtalhos: Record<SituacaoPapel, [singular: string, plural: string]> = {
  SUPERUSUARIO: ['superusuário', 'superusuários'],
  VALIDADE_DA_SENHA: ['senha vencida ou a vencer', 'senhas vencidas ou a vencer'],
  SENHA_MD5: ['senha em MD5', 'senhas em MD5'],
  PERTO_DO_LIMITE: ['perto do limite', 'perto do limite'],
  SEM_USO: ['sem uso em 30 dias', 'sem uso em 30 dias'],
  GRUPO_VAZIO: ['grupo vazio', 'grupos vazios'],
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver os papéis que ele tem.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

function chaveDoPonto(ponto: PontoDeAtencaoPapel): string {
  return ponto.alvo.tipo === 'PAPEL' ? `${ponto.tipo}-${ponto.alvo.nome}` : `${ponto.tipo}-filtro`;
}

function acaoDoPonto(ponto: PontoDeAtencaoPapel): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'FILTRO') {
    return {
      acao: 'Ver na lista',
      rotulo: `Filtrar a lista pelos papéis: ${rotuloFiltroSituacaoPapel[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  return { acao: 'Abrir', rotulo: `Abrir ${ponto.papel ?? 'o papel'}` };
}

export default function PaginaPapeis() {
  useTituloDocumento('Usuários e permissões: Papéis');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosPapeis(caminhos.usuariosPapeis);

  return (
    <>
      <CabecalhoPagina
        titulo="Papéis"
        descricao={
          conexao
            ? 'Os usuários e os grupos do banco, com o que cada um pode fazer, de quem participa, de que objetos é dono e quando foi usado.'
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
  filtros: FiltrosPapeis;
  mudarFiltros: (mudanca: Partial<FiltrosPapeis>) => void;
}

function ListaConectada({ simulada, filtros, mudarFiltros }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaObjeto = useVerObjeto();
  const chegada = useObjetoDaChegada();
  const chegadaAtendida = useRef(false);
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const ultimoAberto = useRef<string | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberto, setAberto] = useState<PapelDTO | null>(null);
  const [origem, setOrigem] = useState<Origem>('LISTA');

  const lista = useDadosAssincronos((signal) => servicoUsuarios.listarPapeis(signal), []);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const papeis = useMemo(() => lista.dados?.papeis ?? [], [lista.dados]);
  const contexto = useMemo<ContextoDosPapeis>(() => {
    const agora = new Date().toISOString();
    return {
      geradoEm: lista.dados?.geradoEm ?? agora,
      coletaDesde: lista.dados?.coletaDesde ?? agora,
      papelDaConexao: lista.dados?.papelDaConexao ?? null,
    };
  }, [lista.dados]);
  const filtrados = useMemo(() => filtrarPapeis(papeis, filtros, contexto), [papeis, filtros, contexto]);
  const pontos = useMemo(() => pontosDeAtencaoPapeis(papeis, contexto), [papeis, contexto]);
  const contagens = useMemo(() => contarPorSituacaoPapel(papeis, contexto), [papeis, contexto]);
  const lote = useMemo(
    () => (filtros.situacao === null ? null : loteDeComandosDosPapeis(filtrados, filtros.situacao, contexto)),
    [filtros.situacao, filtrados, contexto],
  );
  const buscaDigitada = limparBusca(busca);
  const carregado = lista.dados !== null;
  const indiceAberto = aberto ? filtrados.findIndex((papel) => papel.nome === aberto.nome) : -1;
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
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  useEffect(() => {
    if (chegada === null || chegadaAtendida.current || !carregado) return;
    chegadaAtendida.current = true;
    const alvo = papeis.find((papel) => papel.nome === chegada);
    const posicao = alvo ? filtrados.indexOf(alvo) : -1;
    if (alvo) {
      ultimoAberto.current = alvo.nome;
      setOrigem('CHEGADA');
      setAberto(alvo);
    }
    mudarFiltros(posicao >= 0 ? { pagina: paginaDaPosicao(posicao) } : {});
  }, [chegada, carregado, papeis, filtrados, mudarFiltros]);

  const abrir = (papel: PapelDTO, deOnde: Origem) => {
    ultimoAberto.current = papel.nome;
    setOrigem(deOnde);
    setAberto(papel);
  };

  const abrirPeloNome = (nome: string) => {
    const papel = papeis.find((candidato) => candidato.nome === nome);
    if (!papel) return;
    abrir(papel, origem);
    const posicao = filtrados.indexOf(papel);
    if (posicao >= 0 && paginaDaPosicao(posicao) !== paginaAtual.pagina) mudarFiltros({ pagina: paginaDaPosicao(posicao) });
  };

  const abrirObjeto = (objeto: ObjetoDoPapelDTO) => {
    if (objeto.tipo === 'TABELA') irParaObjeto.tabela(objeto.id);
    else if (objeto.tipo === 'VISAO' || objeto.tipo === 'VISAO_MATERIALIZADA') irParaObjeto.visao(objeto.id);
    else irParaObjeto.funcao(objeto.id);
  };

  const seguirPonto = (alvo: AlvoDoPontoPapel) => {
    if (alvo.tipo === 'PAPEL') {
      const papel = papeis.find((candidato) => candidato.nome === alvo.nome);
      if (papel) abrir(papel, 'PAINEL');
      return;
    }
    setBusca('');
    mudarFiltros({ ...semFiltrosPapeis(), situacao: alvo.situacao });
    topo.current?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const posicao = indiceAberto + sentido;
    const vizinho = filtrados[posicao];
    if (indiceAberto < 0 || !vizinho) return;
    abrir(vizinho, origem);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosPapeis());
  };

  const linhaDoUltimoAberto = () => {
    const nome = ultimoAberto.current;
    if (nome === null || origem === 'PAINEL') return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-papel="${CSS.escape(nome)}"] button`) ?? null;
  };

  const atalho = (situacao: SituacaoPapel): AtalhoDaLista => {
    const [singular, plural] = textosDosAtalhos[situacao];
    const daSituacao = papeis.filter((papel) => situacoesDoPapel(papel, contexto).includes(situacao));
    return {
      chave: situacao,
      icone: iconeDaSituacaoPapel[situacao],
      tom: daSituacao.some((papel) => tomDaSituacaoPapel(situacao, papel, contexto) === 'erro') ? 'erro' : 'aviso',
      quantidade: contagens[situacao],
      texto: pluralizar(contagens[situacao], singular, plural),
      ativo: filtros.situacao === situacao,
      aoAlternar: () => mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
    };
  };

  const ordenacaoDaTabela = {
    ordenacao: filtros.ordenacao,
    direcao: filtros.direcao,
    aoAlternarOrdenacao: (ordenacao: OrdenacaoPapeis) => mudarFiltros(alternarOrdenacaoPapeis(filtros, ordenacao)),
    aoEscolherOrdenacao: (ordenacao: OrdenacaoPapeis) =>
      mudarFiltros({ ordenacao, direcao: direcaoInicialDaOrdenacaoPapeis[ordenacao] }),
  };

  const coleta = textoDaColetaDosPapeis(contexto);

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          Os papéis e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
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
              icone: iconeDaSituacaoPapel[ponto.tipo],
              objeto: ponto.papel ? { esquema: null, nome: ponto.papel } : null,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao,
              rotuloDaAcao: rotulo,
              aoSeguir: () => seguirPonto(ponto.alvo),
            };
          })}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-papeis" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-papeis">
            Lista de papéis
          </h2>
          <BarraFiltrosPapeis
            busca={busca}
            filtros={filtros}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={mudarFiltros}
          />
          <ResumoDaLista
            contagem={carregado ? resumirPapeis(papeis, filtrados.length, filtros) : ''}
            complemento={
              carregado && papeis.length > 0 ? (
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
            rotuloDosAtalhos="Papéis que pedem atenção"
            atalhos={[
              atalho('SUPERUSUARIO'),
              atalho('VALIDADE_DA_SENHA'),
              atalho('SENHA_MD5'),
              atalho('PERTO_DO_LIMITE'),
              atalho('SEM_USO'),
              atalho('GRUPO_VAZIO'),
            ]}
            acao={lote ? <CopiarComandos key={lote.comandos.join(' ')} lote={lote} seFalhar={ERRO_AO_COPIAR} /> : null}
            mostrarLimpar={temFiltroAtivoPapeis(filtros) && filtrados.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoPapeis linhas={LINHAS_DO_ESQUELETO} {...ordenacaoDaTabela} />}
            tituloErro="Não foi possível carregar os papéis"
          >
            {() =>
              papeis.length === 0 ? (
                <EstadoVazio
                  icone={UsersRound}
                  titulo="O banco não tem papéis"
                  descricao="Os usuários e os grupos aparecem aqui assim que o servidor tiver ao menos um fora dos papéis predefinidos do PostgreSQL."
                />
              ) : filtrados.length === 0 ? (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhum papel encontrado"
                  descricao={`Nenhum dos ${formatarNumero(papeis.length)} papéis corresponde aos filtros (${descreverFiltrosPapeis(filtros).join(', ')}).`}
                  acao={
                    <Botao variante="secundario" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  }
                />
              ) : (
                <>
                  <TabelaPapeis
                    papeis={paginaAtual.itens}
                    contexto={contexto}
                    nomeAberto={aberto?.nome ?? null}
                    rolarAteAberto={origem === 'LISTA'}
                    aoAbrir={(papel) => abrir(papel, 'LISTA')}
                    {...ordenacaoDaTabela}
                  />
                  {paginaAtual.totalPaginas > 1 ? (
                    <Paginacao
                      rotulo="Páginas da lista de papéis"
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

      <DetalhePapel
        papel={aberto}
        papeis={papeis}
        contexto={contexto}
        limiteOciosoDoServidor={lista.dados?.limiteOciosoEmTransacao ?? null}
        simulada={simulada}
        posicao={indiceAberto >= 0 ? indiceAberto + 1 : null}
        total={filtrados.length}
        aoPercorrer={percorrer}
        aoAbrirPapel={abrirPeloNome}
        aoAbrirObjeto={abrirObjeto}
        aoVerSessoes={(papel) => irParaObjeto.sessoesDoPapel(papel.nome, papel.replicacao)}
        aoVerPermissoes={(papel) => irParaObjeto.permissoesDoPapel(papel.nome)}
        aoFechar={() => setAberto(null)}
        focoAoFechar={linhaDoUltimoAberto}
      />
    </div>
  );
}
