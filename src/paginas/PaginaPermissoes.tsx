import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, FlaskConical, Globe, Info, KeyRound, OctagonAlert, Play, SearchX, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { CopiarComandos } from '@/componentes/objetos/CopiarComandos';
import { EsqueletoPontosDeAtencao, PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import type { AtalhoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { BarraPermissoes } from '@/componentes/usuarios/BarraPermissoes';
import { BotaoDeAlteracao } from '@/componentes/usuarios/BotaoDeAlteracao';
import { DetalheAcesso } from '@/componentes/usuarios/DetalheAcesso';
import { PrivilegiosPadrao } from '@/componentes/usuarios/PrivilegiosPadrao';
import { iconeDaSituacaoPermissao, iconeDoTipoObjetoPermissao } from '@/componentes/usuarios/SeloSituacaoPermissao';
import { EsqueletoPermissoes, TabelaComparacao, TabelaPermissoes } from '@/componentes/usuarios/TabelaPermissoes';
import { PermissaoDasAlteracoes } from '@/componentes/usuarios/BotaoDeAlteracao';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import type { OpcaoSelecao } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { lerLinhaDaChegada, useFiltrosPermissoes } from '@/ganchos/useFiltrosPermissoes';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerObjeto } from '@/ganchos/useVerObjeto';
import type { FiltrosPermissoes, Privilegio, SituacaoPermissao } from '@/modelos/permissoes';
import { useAlteracoes } from '@/provedores/ProvedorAlteracoes';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { limparBusca } from '@/regras/buscaConsultas';
import { capacidadeDasOperacoes, contextoDasPermissoes } from '@/regras/capacidadeAlteracoes';
import type { CamposConcessao } from '@/regras/formularioConcessao';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import {
  avisosDoSujeito,
  compararPapeis,
  contarPorSituacaoPermissao,
  descreverFiltrosPermissoes,
  esquemasDasPermissoes,
  filtrarComparacao,
  filtrarLinhas,
  indexarPermissoes,
  linhasDoObjeto,
  linhasDoPapel,
  loteDeComandosDasPermissoes,
  nomeCompleto,
  objetoInicial,
  padraoAlcancaSujeito,
  papelMaisParecido,
  pontosDeAtencaoPermissoes,
  PUBLICO,
  resumirComparacao,
  resumirLinhas,
  rotuloFiltroSituacaoPermissao,
  rotuloTipoObjetoPermissao,
  semFiltrosPermissoes,
  situacoesDoAcesso,
  sujeitosDasPermissoes,
  temFiltroAtivoPermissoes,
  tomDaSituacaoPermissao,
} from '@/regras/permissoes';
import type {
  Acesso,
  AlvoDoPontoPermissao,
  IndiceDasPermissoes,
  LinhaComparacao,
  LinhaPermissao,
  PontoDeAtencaoPermissao,
} from '@/regras/permissoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoUsuarios } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;
const DESCRICAO_DOS_PONTOS = 'O que merece um olhar nas permissões deste banco, do mais urgente ao menos urgente';
const LINHAS_POR_FRASE_EM_ESPERA = [2, 3, 2, 2, 2, 2, 2];
const ERRO_AO_COPIAR = 'O navegador bloqueou a área de transferência. Abra cada linha e copie o comando pelo detalhe.';

type Origem = 'LISTA' | 'PAINEL' | 'CHEGADA';

const textosDosAtalhos: Record<SituacaoPermissao, [singular: string, plural: string]> = {
  DEFINIDOR_ABERTO: ['aberta a todos', 'abertas a todos'],
  TODOS_CRIAM: ['em que todos criam', 'em que todos criam'],
  ESCRITA_NA_LEITURA: ['escrita na leitura', 'escritas na leitura'],
  REPASSE: ['com repasse', 'com repasse'],
  SEM_USAGE: ['sem USAGE', 'sem USAGE'],
  SEM_PRIVILEGIO_PADRAO: ['sem privilégio padrão', 'sem privilégio padrão'],
  USAGE_SEM_OBJETOS: ['USAGE sem objetos', 'USAGE sem objetos'],
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver quem pode fazer o quê nele.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaPermissoes() {
  useTituloDocumento('Usuários e permissões: Permissões');
  const { situacao, conexao } = useConexao();
  const { filtros, mudarFiltros } = useFiltrosPermissoes(caminhos.usuariosPermissoes);
  const { abrir } = useAlteracoes();
  const [inicialDaConcessao, setInicialDaConcessao] = useState<Partial<CamposConcessao>>({});

  return (
    <PermissaoDasAlteracoes.Provider value="BANCO_PERMISSOES_ALTERAR">
      <CabecalhoPagina
        titulo="Permissões"
        descricao={
          conexao
            ? 'O que cada papel pode fazer em cada objeto do banco, de onde vem cada permissão e quais são um risco.'
            : descreverSemConexao(situacao)
        }
        acoes={
          conexao ? (
            <Botao icone={KeyRound} onClick={() => abrir({ tipo: 'CONCESSAO', inicial: inicialDaConcessao })}>
              Conceder ou revogar
            </Botao>
          ) : undefined
        }
      />
      {conexao ? (
        <ListaConectada
          key={conexao.id}
          simulada={conexao.simulada}
          filtros={filtros}
          mudarFiltros={mudarFiltros}
          aoMudarSelecao={setInicialDaConcessao}
        />
      ) : (
        <PainelSemConexao />
      )}
    </PermissaoDasAlteracoes.Provider>
  );
}

interface ListaConectadaProps {
  simulada: boolean;
  filtros: FiltrosPermissoes;
  mudarFiltros: (mudanca: Partial<FiltrosPermissoes>) => void;
  aoMudarSelecao: (inicial: Partial<CamposConcessao>) => void;
}

interface Selecao {
  sujeito: string;
  objetoId: string | null;
  comparado: string | null;
}

function resolverSelecao(filtros: FiltrosPermissoes, indice: IndiceDasPermissoes | null): Selecao | null {
  if (!indice) return null;
  const daConexao = indice.papeis.has(indice.dados.papelDaConexao)
    ? indice.dados.papelDaConexao
    : (sujeitosDasPermissoes(indice)[0]?.nome ?? PUBLICO);
  const pedido = filtros.papel;
  const valido = pedido !== null && (pedido === PUBLICO || indice.papeis.has(pedido)) ? pedido : daConexao;
  const sujeito = filtros.modo === 'COMPARACAO' && valido === PUBLICO ? daConexao : valido;
  const objetoId =
    filtros.objeto !== null && indice.objetos.has(filtros.objeto) ? filtros.objeto : (objetoInicial(indice)?.id ?? null);
  const comparado =
    filtros.comparado !== null && filtros.comparado !== sujeito && indice.papeis.has(filtros.comparado)
      ? filtros.comparado
      : filtros.modo === 'COMPARACAO'
        ? papelMaisParecido(sujeito, indice)
        : null;
  return { sujeito, objetoId, comparado };
}

function descricaoDoPapel(nome: string, indice: IndiceDasPermissoes): string {
  const papel = indice.papeis.get(nome);
  const partes = [papel?.login ? 'Usuário' : 'Grupo'];
  if (papel?.superusuario) partes.push('superusuário');
  if (nome === indice.dados.papelDaConexao) partes.push('você');
  return partes.join(' · ');
}

function chaveDoPonto(ponto: PontoDeAtencaoPermissao): string {
  return ponto.chave;
}

function acaoDoPonto(ponto: PontoDeAtencaoPermissao): { acao: string; rotulo: string } {
  if (ponto.alvo.tipo === 'LISTA') {
    return {
      acao: 'Ver na lista',
      rotulo: `Ver na lista o que ${ponto.alvo.papel} acessa: ${rotuloFiltroSituacaoPermissao[ponto.alvo.situacao].toLowerCase()}`,
    };
  }
  if (ponto.titulo) return { acao: 'Abrir o primeiro', rotulo: `Abrir o primeiro caso: ${ponto.titulo}` };
  return { acao: 'Abrir', rotulo: `Abrir ${ponto.objeto ? nomeCompleto(ponto.objeto) : 'o caso'}` };
}

function linhaDoLado(acesso: Acesso, indice: IndiceDasPermissoes): LinhaPermissao {
  return { chave: acesso.sujeito, acesso, situacoes: situacoesDoAcesso(acesso, indice) };
}

function ListaConectada({ simulada, filtros, mudarFiltros, aoMudarSelecao }: ListaConectadaProps) {
  const { marcarDesconectada } = useConexao();
  const irParaObjeto = useVerObjeto();
  const localizacao = useLocation();
  const [chegada] = useState(() => lerLinhaDaChegada(localizacao.state));
  const chegadaAtendida = useRef(false);
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberta, setAberta] = useState<string | null>(null);
  const [origem, setOrigem] = useState<Origem>('LISTA');
  const [levarAPagina, setLevarAPagina] = useState(false);

  const { abrir: alterar, versao } = useAlteracoes();
  const lista = useDadosAssincronos((signal) => servicoUsuarios.listarPermissoes(signal), [versao]);
  const sessaoEncerrada = ehErroApi(lista.erro, 'NAO_AUTORIZADO');
  const indice = useMemo(() => (lista.dados ? indexarPermissoes(lista.dados) : null), [lista.dados]);
  const carregado = indice !== null;
  const papelDaConexao = lista.dados?.papelDaConexao ?? '';
  const { modo } = filtros;
  const selecao = useMemo(() => resolverSelecao(filtros, indice), [filtros, indice]);

  const linhas = useMemo(() => {
    if (!indice || !selecao || modo === 'COMPARACAO') return [];
    if (modo === 'PAPEL') return linhasDoPapel(selecao.sujeito, indice);
    return selecao.objetoId ? linhasDoObjeto(selecao.objetoId, indice) : [];
  }, [indice, selecao, modo]);
  const filtradas = useMemo(() => (indice ? filtrarLinhas(linhas, filtros, indice) : []), [linhas, filtros, indice]);
  const comparacao = useMemo(
    () =>
      indice && selecao && modo === 'COMPARACAO' && selecao.comparado
        ? compararPapeis(selecao.sujeito, selecao.comparado, indice)
        : [],
    [indice, selecao, modo],
  );
  const comparacaoFiltrada = useMemo(() => filtrarComparacao(comparacao, filtros), [comparacao, filtros]);
  const chaves = useMemo(
    () => (modo === 'COMPARACAO' ? comparacaoFiltrada : filtradas).map((item) => item.chave),
    [modo, comparacaoFiltrada, filtradas],
  );
  const paginaAtual = useMemo(() => paginarLista(chaves, filtros.pagina), [chaves, filtros.pagina]);
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;
  const pontos = useMemo(() => (indice ? pontosDeAtencaoPermissoes(indice) : []), [indice]);
  const contagens = useMemo(() => contarPorSituacaoPermissao(linhas), [linhas]);
  const lote = useMemo(
    () =>
      indice && filtros.situacao !== null && modo !== 'COMPARACAO'
        ? loteDeComandosDasPermissoes(filtradas, filtros.situacao, indice)
        : null,
    [indice, filtros.situacao, modo, filtradas],
  );
  const buscaDigitada = limparBusca(busca);
  const posicaoAberta = aberta === null ? -1 : chaves.indexOf(aberta);

  const detalhe = useMemo((): { linhas: LinhaPermissao[]; diferencas: Privilegio[][] | null } | null => {
    if (aberta === null || !indice) return null;
    if (modo === 'COMPARACAO') {
      const linha = comparacao.find((item: LinhaComparacao) => item.chave === aberta);
      if (!linha) return null;
      return { linhas: [linhaDoLado(linha.a, indice), linhaDoLado(linha.b, indice)], diferencas: [linha.soEmA, linha.soEmB] };
    }
    const linha = linhas.find((item) => item.chave === aberta);
    return linha ? { linhas: [linha], diferencas: null } : null;
  }, [aberta, indice, modo, comparacao, linhas]);

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  useEffect(() => {
    if (!selecao) return;
    if (modo === 'OBJETO') aoMudarSelecao({ alcance: 'OBJETO', objeto: selecao.objetoId });
    else aoMudarSelecao({ beneficiario: selecao.sujeito });
  }, [selecao, modo, aoMudarSelecao]);

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
    setOrigem('CHEGADA');
    setAberta(chegada);
    setLevarAPagina(true);
  }, [chegada, carregado]);

  useEffect(() => {
    if (!levarAPagina || detalhe === null) return;
    setLevarAPagina(false);
    if (posicaoAberta >= 0 && paginaDaPosicao(posicaoAberta) !== filtros.pagina) {
      mudarFiltros({ pagina: paginaDaPosicao(posicaoAberta) });
    }
  }, [levarAPagina, detalhe, posicaoAberta, filtros.pagina, mudarFiltros]);

  const abrir = (chave: string, deOnde: Origem) => {
    setOrigem(deOnde);
    setAberta(chave);
  };

  const trocarSelecao = (mudanca: Partial<FiltrosPermissoes>) => {
    setAberta(null);
    setBusca('');
    mudarFiltros({ ...semFiltrosPermissoes(), ...mudanca });
  };

  const seguirPonto = (alvo: AlvoDoPontoPermissao) => {
    setBusca('');
    if (alvo.tipo === 'LISTA') {
      setAberta(null);
      mudarFiltros({ ...semFiltrosPermissoes(), modo: 'PAPEL', papel: alvo.papel, situacao: alvo.situacao });
      topo.current?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
      return;
    }
    mudarFiltros({
      ...semFiltrosPermissoes(),
      modo: alvo.modo,
      ...(alvo.modo === 'PAPEL' ? { papel: alvo.selecao } : { objeto: alvo.selecao }),
    });
    abrir(alvo.abrir, 'PAINEL');
    setLevarAPagina(true);
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const posicao = posicaoAberta + sentido;
    const vizinha = chaves[posicao];
    if (posicaoAberta < 0 || !vizinha) return;
    abrir(vizinha, origem);
    const pagina = paginaDaPosicao(posicao);
    if (pagina !== paginaAtual.pagina) mudarFiltros({ pagina });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosPermissoes());
  };

  const linhaDaUltimaAberta = () => {
    if (aberta === null || origem === 'PAINEL') return null;
    return regiao.current?.querySelector<HTMLElement>(`tr[data-chave="${CSS.escape(aberta)}"] button`) ?? null;
  };

  const abrirObjetoNaTela = (acesso: Acesso) => {
    const { objeto } = acesso;
    if (objeto.tipo === 'TABELA') irParaObjeto.tabela(objeto.id);
    else if (objeto.tipo === 'VISAO' || objeto.tipo === 'VISAO_MATERIALIZADA') irParaObjeto.visao(objeto.id);
    else if (objeto.tipo === 'FUNCAO' || objeto.tipo === 'PROCEDIMENTO') irParaObjeto.funcao(objeto.id);
  };

  const atalho = (situacao: SituacaoPermissao): AtalhoDaLista => {
    const [singular, plural] = textosDosAtalhos[situacao];
    return {
      chave: situacao,
      icone: iconeDaSituacaoPermissao[situacao],
      tom: tomDaSituacaoPermissao[situacao],
      quantidade: contagens[situacao],
      texto: pluralizar(contagens[situacao], singular, plural),
      ativo: filtros.situacao === situacao,
      aoAlternar: () => mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao }),
    };
  };

  const opcoesPapel = useMemo((): OpcaoSelecao[] => {
    if (!indice) return [];
    return [
      ...sujeitosDasPermissoes(indice).map((papel) => ({
        valor: papel.nome,
        rotulo: papel.nome,
        descricao: descricaoDoPapel(papel.nome, indice),
        icone: papel.login ? UserRound : UsersRound,
      })),
      { valor: PUBLICO, rotulo: PUBLICO, descricao: 'O que todos os papéis recebem', icone: Globe },
    ];
  }, [indice]);
  const opcoesComparado = useMemo(() => opcoesPapel.filter((opcao) => opcao.valor !== PUBLICO), [opcoesPapel]);
  const opcoesObjeto = useMemo(
    (): OpcaoSelecao[] =>
      indice
        ? indice.ordenados.map((objeto) => ({
            valor: objeto.id,
            rotulo: nomeCompleto(objeto),
            descricao: rotuloTipoObjetoPermissao[objeto.tipo],
            icone: iconeDoTipoObjetoPermissao[objeto.tipo],
          }))
        : [],
    [indice],
  );

  const vazio = carregado && indice.dados.objetos.length === 0;
  const avisos = indice && selecao && modo === 'PAPEL' && !vazio ? avisosDoSujeito(selecao.sujeito, indice) : [];
  const chavesDaPagina = new Set(paginaAtual.itens);

  const contagem = (() => {
    if (!carregado) return '';
    if (vazio) return 'Nenhum objeto no banco';
    if (modo === 'COMPARACAO') return resumirComparacao(comparacao, comparacaoFiltrada.length, filtros);
    return resumirLinhas(linhas, filtradas.length, filtros);
  })();

  const conteudo = () => {
    if (!indice || !selecao) return null;
    if (vazio) {
      return (
        <EstadoVazio
          icone={ShieldCheck}
          titulo="O banco não tem objetos para mostrar"
          descricao="As permissões aparecem aqui assim que o banco tiver tabelas, visões, sequências ou funções fora dos esquemas do sistema."
        />
      );
    }
    if (modo === 'COMPARACAO') {
      if (!selecao.comparado) {
        return (
          <EstadoVazio
            icone={ArrowLeftRight}
            titulo="Não há outro papel para comparar"
            descricao="A comparação precisa de dois papéis que não sejam superusuários."
          />
        );
      }
      if (comparacaoFiltrada.length === 0) {
        const soDiferencas = filtros.soDiferencas && comparacao.length > 0 && !temFiltroAtivoPermissoes({ ...filtros, soDiferencas: true });
        return (
          <EstadoVazio
            icone={soDiferencas ? ShieldCheck : SearchX}
            titulo={soDiferencas ? 'Os dois papéis têm o mesmo acesso' : 'Nenhum objeto encontrado'}
            descricao={
              soDiferencas
                ? `${selecao.sujeito} e ${selecao.comparado} podem as mesmas coisas nos ${formatarNumero(comparacao.length)} objetos que algum dos dois alcança.`
                : `Nenhum objeto corresponde aos filtros (${descreverFiltrosPermissoes(filtros).join(', ')}).`
            }
            acao={
              <Botao variante="secundario" onClick={soDiferencas ? () => mudarFiltros({ soDiferencas: false }) : limparFiltros}>
                {soDiferencas ? 'Mostrar todos os objetos' : 'Limpar filtros'}
              </Botao>
            }
          />
        );
      }
      return (
        <TabelaComparacao
          linhas={comparacaoFiltrada.filter((item) => chavesDaPagina.has(item.chave))}
          papelA={selecao.sujeito}
          papelB={selecao.comparado}
          chaveAberta={aberta}
          rolarAteAberta={origem === 'LISTA'}
          aoAbrir={(linha) => abrir(linha.chave, 'LISTA')}
        />
      );
    }
    if (filtradas.length === 0) {
      return (
        <EstadoVazio
          icone={SearchX}
          titulo={temFiltroAtivoPermissoes(filtros) ? 'Nenhuma linha encontrada' : 'Nenhum acesso'}
          descricao={
            temFiltroAtivoPermissoes(filtros)
              ? `Nenhuma das ${formatarNumero(linhas.length)} linhas corresponde aos filtros (${descreverFiltrosPermissoes(filtros).join(', ')}).`
              : modo === 'PAPEL'
                ? `${selecao.sujeito} não alcança nenhum objeto deste banco, nem por PUBLIC.`
                : 'Nenhum papel alcança este objeto além do dono e dos superusuários.'
          }
          acao={
            temFiltroAtivoPermissoes(filtros) ? (
              <Botao variante="secundario" onClick={limparFiltros}>
                Limpar filtros
              </Botao>
            ) : undefined
          }
        />
      );
    }
    return (
      <TabelaPermissoes
        modo={modo}
        linhas={filtradas.filter((item) => chavesDaPagina.has(item.chave))}
        indice={indice}
        papelDaConexao={papelDaConexao}
        chaveAberta={aberta}
        rolarAteAberta={origem === 'LISTA'}
        aoAbrir={(linha) => abrir(linha.chave, 'LISTA')}
      />
    );
  };

  return (
    <div className={estilos.blocos}>
      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          Os papéis, os objetos e as permissões desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais
          quando o Orynt estiver ligado à API.
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
              icone: iconeDaSituacaoPermissao[ponto.tipo],
              objeto: ponto.objeto,
              titulo: ponto.titulo,
              texto: ponto.texto,
              acao,
              rotuloDaAcao: rotulo,
              aoSeguir: () => seguirPonto(ponto.alvo),
            };
          })}
        />
      ) : null}

      <Painel espacamento="nenhum" aria-labelledby="titulo-lista-permissoes" aria-busy={lista.carregando}>
        <div className={estilos.topo} ref={topo}>
          <h2 className="visualmente-oculto" id="titulo-lista-permissoes">
            Permissões
          </h2>
          <BarraPermissoes
            busca={busca}
            filtros={filtros}
            papel={selecao?.sujeito ?? null}
            objeto={selecao?.objetoId ?? null}
            comparado={selecao?.comparado ?? null}
            opcoesPapel={opcoesPapel}
            opcoesComparado={opcoesComparado}
            opcoesObjeto={opcoesObjeto}
            esquemas={indice ? esquemasDasPermissoes(indice) : []}
            carregando={!carregado}
            falhou={lista.erro !== null}
            aoDigitarBusca={setBusca}
            aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
            aoMudar={(mudanca) => {
              if (mudanca.modo !== undefined || mudanca.papel !== undefined || mudanca.objeto !== undefined) {
                setAberta(null);
              }
              if (mudanca.modo !== undefined && mudanca.modo !== modo) setBusca('');
              mudarFiltros(mudanca);
            }}
            aoInverter={() => {
              if (!selecao?.comparado) return;
              mudarFiltros({ papel: selecao.comparado, comparado: selecao.sujeito });
            }}
          />
          {avisos.map((aviso) => (
            <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : Info}>
              {aviso.grupo ? (
                <span className={estilos.notaComAcao}>
                  <span>{aviso.texto}</span>
                  <Botao variante="secundario" tamanho="sm" onClick={() => aviso.grupo && trocarSelecao({ modo: 'PAPEL', papel: aviso.grupo })}>
                    Ver {aviso.grupo}
                  </Botao>
                </span>
              ) : (
                aviso.texto
              )}
            </Nota>
          ))}
          <ResumoDaLista
            contagem={contagem}
            emEspera={lista.dados === null && lista.carregando}
            rotuloDosAtalhos="Linhas que pedem atenção"
            atalhos={modo === 'COMPARACAO' ? [] : (Object.keys(textosDosAtalhos) as SituacaoPermissao[]).map(atalho)}
            acao={
              lote && indice ? (
                <>
                  <CopiarComandos key={lote.comandos.join(' ')} lote={lote} seFalhar={ERRO_AO_COPIAR} />
                  <BotaoDeAlteracao
                    tamanho="sm"
                    icone={Play}
                    capacidade={capacidadeDasOperacoes(lote.operacoes, contextoDasPermissoes(indice), indice)}
                    onClick={() => alterar({ tipo: 'OPERACOES', operacoes: lote.operacoes, origem: 'LOTE' })}
                  >
                    {lote.comandos.length === 1 ? 'Executar' : `Executar os ${formatarNumero(lote.comandos.length)}`}
                  </BotaoDeAlteracao>
                </>
              ) : null
            }
            mostrarLimpar={temFiltroAtivoPermissoes(filtros) && chaves.length > 0}
            aoLimpar={limparFiltros}
          />
        </div>

        <div ref={regiao}>
          <ConteudoAssincrono
            resultado={lista}
            esqueleto={<EsqueletoPermissoes modo={modo === 'OBJETO' ? 'OBJETO' : 'PAPEL'} linhas={LINHAS_DO_ESQUELETO} />}
            tituloErro="Não foi possível carregar as permissões"
          >
            {() => (
              <>
                {conteudo()}
                {paginaAtual.totalPaginas > 1 ? (
                  <Paginacao
                    rotulo="Páginas da lista de permissões"
                    resumo={`${formatarNumero(paginaAtual.primeiro)} a ${formatarNumero(paginaAtual.ultimo)} de ${formatarNumero(chaves.length)}`}
                    pagina={paginaAtual.pagina}
                    totalPaginas={paginaAtual.totalPaginas}
                    aoMudar={mudarPagina}
                    className={estilos.paginacao}
                  />
                ) : null}
              </>
            )}
          </ConteudoAssincrono>
        </div>
      </Painel>

      {indice && !vazio ? (
        <PrivilegiosPadrao
          padroes={indice.dados.privilegiosPadrao}
          sujeito={modo === 'OBJETO' ? null : (selecao?.sujeito ?? null)}
          alcanca={(padrao) => (selecao ? padraoAlcancaSujeito(padrao, selecao.sujeito, indice) : false)}
          indice={indice}
          aoAlterar={alterar}
        />
      ) : null}

      <DetalheAcesso
        modo={modo}
        linhas={detalhe?.linhas ?? null}
        diferencas={detalhe?.diferencas ?? null}
        indice={indice}
        papelDaConexao={papelDaConexao}
        simulada={simulada}
        posicao={posicaoAberta >= 0 ? posicaoAberta + 1 : null}
        total={chaves.length}
        aoPercorrer={percorrer}
        aoFechar={() => setAberta(null)}
        focoAoFechar={linhaDaUltimaAberta}
        aoAbrirPapel={(nome) => irParaObjeto.papel(nome)}
        aoAbrirObjeto={abrirObjetoNaTela}
        aoVerPorPapel={(sujeito) => trocarSelecao({ modo: 'PAPEL', papel: sujeito })}
        aoVerPorObjeto={(objetoId) => trocarSelecao({ modo: 'OBJETO', objeto: objetoId })}
        aoComparar={(sujeito) => trocarSelecao({ modo: 'COMPARACAO', papel: sujeito, comparado: null })}
        aoAlterar={alterar}
      />
    </div>
  );
}
