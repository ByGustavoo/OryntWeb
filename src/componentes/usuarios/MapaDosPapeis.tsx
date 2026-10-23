import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, Crown, Plug, UserRoundX, UsersRound } from 'lucide-react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { CabecalhoPainel, CampoBusca, Dica, Esqueleto, GrupoOpcoes, Painel } from '@/componentes/ui';
import { useLarguraElemento } from '@/ganchos/useLarguraElemento';
import type { PapelDTO, ParticipacaoDTO } from '@/modelos/papeis';
import { iniciaisDoPapel, rotuloDaSituacaoDoPapel, rotuloTipoPapel, situacoesDoPapel, tipoDoPapel } from '@/regras/papeis';
import type { ContextoDosPapeis } from '@/regras/papeis';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MapaDosPapeis.module.css';

const TITULO = 'Quem pertence a quem';
const DESCRICAO = 'Os membros de cada grupo, os usuários fora de grupo e quem tem sessão aberta agora';
const ESPACO_DO_ALTERNADOR_PX = 104;
const LINHAS_DE_FICHAS_SEM_RECOLHER = 2;
const LINHAS_RECOLHIDAS_LARGO = 6;
const LINHAS_RECOLHIDAS_ESTREITO = 4;
const LARGURA_ESTREITA_PX = 640;

type Exibicao = 'TODOS' | 'CONECTADOS';

const opcoesDeExibicao: { valor: Exibicao; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'CONECTADOS', rotulo: 'Com sessão aberta' },
];

interface Membro {
  papel: PapelDTO;
  participacao: ParticipacaoDTO | null;
}

function textoDasSessoes(sessoes: number): string {
  return `${formatarNumero(sessoes)} ${pluralizar(sessoes, 'sessão', 'sessões')}`;
}

function conectados(membros: Membro[]): number {
  return membros.filter((membro) => membro.papel.sessoes > 0).length;
}

function ordenar(membros: Membro[]): Membro[] {
  return [...membros].sort(
    (a, b) =>
      Number(b.papel.sessoes > 0) - Number(a.papel.sessoes > 0) ||
      Number(b.papel.superusuario) - Number(a.papel.superusuario) ||
      a.papel.nome.localeCompare(b.papel.nome, 'pt-BR'),
  );
}

function textoDaContagem(membros: Membro[], palavra: [string, string]): string {
  const total = `${formatarNumero(membros.length)} ${pluralizar(membros.length, palavra[0], palavra[1])}`;
  if (membros.length === 0) return total;
  const comSessao = conectados(membros);
  return comSessao === 0 ? `${total}, nenhum com sessão` : `${total}, ${formatarNumero(comSessao)} com sessão`;
}

interface FichaDoMembroProps {
  membro: Membro;
  contexto: ContextoDosPapeis;
  aoAbrir: (papel: PapelDTO) => void;
}

function FichaDoMembro({ membro, contexto, aoAbrir }: FichaDoMembroProps) {
  const { papel, participacao } = membro;
  const situacao = situacoesDoPapel(papel, contexto).find((candidata) => candidata !== 'SUPERUSUARIO');
  const semHeranca = participacao !== null && !participacao.herda;
  const daConexao = papel.nome === contexto.papelDaConexao;
  const conectado = papel.sessoes > 0;
  const detalhes = [
    rotuloTipoPapel[tipoDoPapel(papel)],
    conectado ? `${textoDasSessoes(papel.sessoes)} ${pluralizar(papel.sessoes, 'aberta', 'abertas')} agora` : 'Sem sessão aberta',
    papel.superusuario ? 'Superusuário' : null,
    situacao ? rotuloDaSituacaoDoPapel(situacao, papel, contexto) : null,
    semHeranca ? 'Participa sem herdar os privilégios do grupo' : null,
    daConexao ? 'Papel desta conexão' : null,
  ].filter((detalhe): detalhe is string => detalhe !== null);

  return (
    <li>
      <button
        type="button"
        className={juntarClasses(
          estilos.ficha,
          conectado && estilos.fichaConectada,
          semHeranca && estilos.fichaSemHeranca,
          daConexao && estilos.fichaDaConexao,
        )}
        onClick={() => aoAbrir(papel)}
        aria-label={`${papel.nome}: ${detalhes.map((detalhe) => detalhe.toLocaleLowerCase('pt-BR')).join(', ')}. Abrir o papel`}
      >
        <span className={juntarClasses(estilos.avatar, papel.superusuario && estilos.avatarSuper)} aria-hidden="true">
          {iniciaisDoPapel(papel.nome)}
          {conectado ? <span className={estilos.pontoConectado} /> : null}
        </span>
        <span className={juntarClasses('codigo', estilos.nome)} aria-hidden="true">
          {papel.nome}
        </span>
        {papel.superusuario ? <Crown className={estilos.coroa} size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
        {semHeranca ? (
          <span className={juntarClasses(estilos.marca, estilos.marcaSemHeranca)} aria-hidden="true">
            sem herança
          </span>
        ) : null}
        {daConexao ? (
          <span className={juntarClasses(estilos.marca, estilos.marcaDaConexao)} aria-hidden="true">
            esta conexão
          </span>
        ) : null}
        {conectado ? (
          <span className={estilos.sessoes} aria-hidden="true">
            <Plug size={11} strokeWidth={2.25} />
            {textoDasSessoes(papel.sessoes)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

interface FichasProps {
  membros: Membro[];
  contexto: ContextoDosPapeis;
  vazio: string;
  inteiras: boolean;
  aoAbrir: (papel: PapelDTO) => void;
}

function Fichas({ membros, contexto, vazio, inteiras, aoAbrir }: FichasProps) {
  const lista = useRef<HTMLUListElement>(null);
  const [expandida, setExpandida] = useState(false);
  const [cabem, setCabem] = useState<number | null>(null);
  const recolhe = !inteiras && !expandida;
  const chaveDosMembros = membros.map((membro) => membro.papel.nome).join(' ');

  useLayoutEffect(() => {
    setCabem(null);
  }, [chaveDosMembros, recolhe]);

  useLayoutEffect(() => {
    if (!recolhe || cabem !== null || !lista.current) return;
    const itens = [...lista.current.children] as HTMLElement[];
    const primeiro = itens[0];
    if (!primeiro) return;
    const largura = lista.current.clientWidth;
    const naPrimeiraLinha = itens.filter((item) => item.offsetTop === primeiro.offsetTop);
    const linhasOcupadas = new Set(itens.map((item) => item.offsetTop)).size;
    if (linhasOcupadas <= LINHAS_DE_FICHAS_SEM_RECOLHER) {
      setCabem(itens.length);
      return;
    }
    const inicio = lista.current.offsetLeft;
    const quantos = naPrimeiraLinha.filter(
      (item) => item.offsetLeft - inicio + item.offsetWidth + ESPACO_DO_ALTERNADOR_PX <= largura,
    ).length;
    setCabem(Math.max(1, quantos));
  }, [recolhe, cabem]);

  useEffect(() => {
    const elemento = lista.current;
    if (!recolhe || !elemento) return;
    let larguraAnterior = elemento.clientWidth;
    const observador = new ResizeObserver(() => {
      if (elemento.clientWidth === larguraAnterior) return;
      larguraAnterior = elemento.clientWidth;
      setCabem(null);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [recolhe]);

  if (membros.length === 0) return <p className={estilos.vazio}>{vazio}</p>;
  const medindo = recolhe && cabem === null;
  const visiveis = recolhe && cabem !== null ? membros.slice(0, cabem) : membros;
  const ocultos = membros.length - visiveis.length;
  const alternavel = !inteiras && (expandida || ocultos > 0);

  return (
    <ul
      ref={lista}
      className={juntarClasses(estilos.fichas, medindo && estilos.medindo, recolhe && !medindo && ocultos > 0 && estilos.umaLinha)}
    >
      {visiveis.map((membro) => (
        <FichaDoMembro key={membro.papel.nome} membro={membro} contexto={contexto} aoAbrir={aoAbrir} />
      ))}
      {alternavel && !medindo ? (
        <li>
          <button
            type="button"
            className={juntarClasses(estilos.alternar, expandida && estilos.expandida)}
            aria-expanded={expandida}
            onClick={() => setExpandida((atual) => !atual)}
          >
            {expandida ? 'Mostrar menos' : `Mais ${formatarNumero(ocultos)}`}
            <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </li>
      ) : null}
    </ul>
  );
}

interface MapaDosPapeisProps {
  papeis: PapelDTO[];
  contexto: ContextoDosPapeis;
  aoAbrir: (papel: PapelDTO) => void;
}

function contem(nome: string, termo: string): boolean {
  return nome.toLocaleLowerCase('pt-BR').includes(termo);
}

export function MapaDosPapeis({ papeis, contexto, aoAbrir }: MapaDosPapeisProps) {
  const [exibicao, setExibicao] = useState<Exibicao>('TODOS');
  const [busca, setBusca] = useState('');
  const [todosOsGrupos, setTodosOsGrupos] = useState(false);
  const barra = useRef<HTMLDivElement>(null);
  const largura = useLarguraElemento(barra);
  const linhasRecolhidas = largura > 0 && largura < LARGURA_ESTREITA_PX ? LINHAS_RECOLHIDAS_ESTREITO : LINHAS_RECOLHIDAS_LARGO;
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const buscando = termo !== '';
  const filtrando = buscando || exibicao === 'CONECTADOS';
  const porNome = new Map(papeis.map((papel) => [papel.nome, papel]));
  const mostrar = (membros: Membro[], grupoEncontrado: boolean) =>
    membros.filter(
      (membro) =>
        (exibicao === 'TODOS' || membro.papel.sessoes > 0) && (!buscando || grupoEncontrado || contem(membro.papel.nome, termo)),
    );

  const grupos = papeis
    .filter((papel) => !papel.login)
    .map((grupo) => ({
      grupo,
      membros: ordenar(
        grupo.membros.flatMap((participacao): Membro[] => {
          const papel = porNome.get(participacao.papel);
          return papel ? [{ papel, participacao }] : [];
        }),
      ),
    }))
    .sort((a, b) => b.membros.length - a.membros.length || a.grupo.nome.localeCompare(b.grupo.nome, 'pt-BR'));
  const comMembros = grupos.filter(({ membros }) => membros.length > 0);
  const vazios = grupos.filter(({ membros }) => membros.length === 0).map(({ grupo }) => grupo);
  const foraDeGrupo = ordenar(
    papeis
      .filter((papel) => papel.login && papel.membroDe.every((participacao) => !porNome.has(participacao.papel)))
      .map((papel) => ({ papel, participacao: null })),
  );
  const usuarios = papeis.filter((papel) => papel.login);
  const usuariosConectados = usuarios.filter((papel) => papel.sessoes > 0).length;
  const superusuarios = papeis.filter((papel) => papel.superusuario).length;
  const sessoes = papeis.reduce((soma, papel) => soma + papel.sessoes, 0);
  const vazioDoFiltro = 'Ninguém com sessão aberta agora.';

  const linhas = comMembros
    .map(({ grupo, membros }) => {
      const grupoEncontrado = buscando && contem(grupo.nome, termo);
      return { grupo, membros, visiveis: mostrar(membros, grupoEncontrado), grupoEncontrado };
    })
    .filter(
      ({ visiveis, grupoEncontrado }) =>
        !filtrando || visiveis.length > 0 || (grupoEncontrado && exibicao === 'TODOS'),
    );
  const recolhivel = !buscando && linhas.length > linhasRecolhidas + 1;
  const recolhidas = recolhivel && !todosOsGrupos;
  const linhasNaTela = recolhidas ? linhas.slice(0, linhasRecolhidas) : linhas;
  const vaziosNaTela =
    exibicao === 'CONECTADOS' ? [] : buscando ? vazios.filter((grupo) => contem(grupo.nome, termo)) : vazios;
  const foraNaTela = mostrar(foraDeGrupo, false);
  const mostraFora = foraDeGrupo.length > 0 && (!filtrando || foraNaTela.length > 0);
  const temSemHeranca = linhasNaTela.some(({ visiveis }) => visiveis.some((membro) => membro.participacao?.herda === false));
  const semResultado = filtrando && linhas.length === 0 && vaziosNaTela.length === 0 && !mostraFora;
  const textoSemResultado = !buscando
    ? vazioDoFiltro
    : exibicao === 'CONECTADOS'
      ? `Ninguém com sessão aberta e “${busca.trim()}” no nome.`
      : `Nenhum grupo ou usuário com “${busca.trim()}”.`;

  return (
    <Painel aria-labelledby="titulo-mapa-papeis" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-mapa-papeis">{TITULO}</span>}
        descricao={DESCRICAO}
        acao={
          <GrupoOpcoes
            rotulo="Membros mostrados no mapa"
            opcoes={opcoesDeExibicao}
            valor={exibicao}
            aoMudar={setExibicao}
            tamanho="sm"
          />
        }
      />

      <div ref={barra} className={estilos.barra}>
        <ul className={estilos.resumo} aria-label="Resumo dos papéis">
          <li>
            <strong className="numeros">{formatarNumero(grupos.length)}</strong> {pluralizar(grupos.length, 'grupo', 'grupos')}
          </li>
          <li>
            <strong className="numeros">{formatarNumero(usuarios.length)}</strong>{' '}
            {pluralizar(usuarios.length, 'usuário', 'usuários')}
          </li>
          <li>
            <span className={estilos.pontoResumo} aria-hidden="true" />
            <strong className="numeros">{formatarNumero(usuariosConectados)}</strong> com sessão aberta,{' '}
            <span className="numeros">{textoDasSessoes(sessoes)}</span> no total
          </li>
          {superusuarios > 0 ? (
            <li>
              <Crown className={estilos.coroa} size={13} strokeWidth={2.25} aria-hidden="true" />
              <strong className="numeros">{formatarNumero(superusuarios)}</strong>{' '}
              {pluralizar(superusuarios, 'superusuário', 'superusuários')}
            </li>
          ) : null}
        </ul>
        <CampoBusca
          rotulo="Buscar grupo ou usuário no mapa"
          placeholder="Buscar grupo ou usuário"
          valor={busca}
          aoMudar={setBusca}
          className={estilos.busca}
        />
      </div>

      {semResultado ? (
        <p className={estilos.semResultado}>{textoSemResultado}</p>
      ) : (
        <ul className={estilos.mapa}>
          {linhasNaTela.map(({ grupo, membros, visiveis }, ordem) => (
            <li
              key={grupo.nome}
              className={estilos.linha}
              style={{ '--indice': Math.min(ordem, linhasRecolhidas) } as CSSProperties}
              aria-label={`Grupo ${grupo.nome}`}
            >
              <Dica conteudo={grupo.nome} soSeCortado>
                <button
                  type="button"
                  className={estilos.grupo}
                  onClick={() => aoAbrir(grupo)}
                  aria-label={`Grupo ${grupo.nome}: ${textoDaContagem(membros, ['membro', 'membros'])}. Abrir o grupo`}
                >
                  <span className={estilos.iconeDoGrupo} aria-hidden="true">
                    <UsersRound size={15} strokeWidth={2} />
                  </span>
                  <span className={estilos.textoDoGrupo} aria-hidden="true">
                    <span className={juntarClasses('codigo', estilos.nomeDoGrupo)} data-corte>
                      {grupo.nome}
                    </span>
                    <span className={estilos.contagem}>{textoDaContagem(membros, ['membro', 'membros'])}</span>
                  </span>
                </button>
              </Dica>
              <Fichas membros={visiveis} contexto={contexto} vazio={vazioDoFiltro} inteiras={buscando} aoAbrir={aoAbrir} />
            </li>
          ))}

          {recolhivel ? (
            <li className={estilos.linhaDoAlternador}>
              <button
                type="button"
                className={juntarClasses(estilos.alternar, todosOsGrupos && estilos.expandida)}
                aria-expanded={todosOsGrupos}
                onClick={() => setTodosOsGrupos((atual) => !atual)}
              >
                {todosOsGrupos
                  ? 'Mostrar só os maiores grupos'
                  : `Mostrar os outros ${formatarNumero(linhas.length - linhasRecolhidas)} ${pluralizar(linhas.length - linhasRecolhidas, 'grupo', 'grupos')}`}
                <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </li>
          ) : null}

          {vaziosNaTela.length > 0 ? (
            <li className={juntarClasses(estilos.linha, estilos.linhaVazia)} aria-label="Grupos sem membros">
              <div className={estilos.grupo}>
                <span className={estilos.iconeDoGrupo} aria-hidden="true">
                  <UsersRound size={15} strokeWidth={2} />
                </span>
                <span className={estilos.textoDoGrupo}>
                  <span className={estilos.nomeFora}>Sem membros</span>
                  <span className={estilos.contagem}>
                    {formatarNumero(vazios.length)} {pluralizar(vazios.length, 'grupo vazio', 'grupos vazios')}
                  </span>
                </span>
              </div>
              <ul className={estilos.fichas}>
                {vaziosNaTela.map((grupo) => (
                  <li key={grupo.nome}>
                    <button
                      type="button"
                      className={juntarClasses(estilos.ficha, estilos.fichaDeGrupo)}
                      onClick={() => aoAbrir(grupo)}
                      aria-label={`Grupo ${grupo.nome}, sem membros. Abrir o grupo`}
                    >
                      <UsersRound size={13} strokeWidth={2} aria-hidden="true" />
                      <span className={juntarClasses('codigo', estilos.nome)} aria-hidden="true">
                        {grupo.nome}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}

          {mostraFora ? (
            <li className={juntarClasses(estilos.linha, estilos.linhaFora)} aria-label="Usuários sem grupo">
              <div className={estilos.grupo}>
                <span className={juntarClasses(estilos.iconeDoGrupo, estilos.iconeFora)} aria-hidden="true">
                  <UserRoundX size={15} strokeWidth={2} />
                </span>
                <span className={estilos.textoDoGrupo}>
                  <span className={estilos.nomeFora}>Sem grupo</span>
                  <span className={estilos.contagem}>{textoDaContagem(foraDeGrupo, ['usuário', 'usuários'])}</span>
                </span>
              </div>
              <div className={estilos.colunaFora}>
                <p className={estilos.explicacaoFora}>
                  Não participam de nenhum grupo: o que podem fazer vem só dos próprios atributos e das concessões diretas.
                </p>
                <Fichas membros={foraNaTela} contexto={contexto} vazio={vazioDoFiltro} inteiras={buscando} aoAbrir={aoAbrir} />
              </div>
            </li>
          ) : null}
        </ul>
      )}

      {temSemHeranca ? (
        <p className={estilos.legenda}>
          <span className={estilos.amostraSemHeranca} aria-hidden="true">
            sem herança
          </span>
          Participa do grupo sem herdar os privilégios dele: só os usa depois de SET ROLE.
        </p>
      ) : null}
    </Painel>
  );
}

export function EsqueletoMapaDosPapeis() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO} larguraDaAcao={232} className={estilos.painel}>
      <div className={estilos.barra} aria-hidden="true">
        <div className={estilos.resumo}>
          {[60, 72, 250, 104].map((largura) => (
            <LinhaEmEspera key={largura} largura={largura} />
          ))}
        </div>
        <Esqueleto largura="18rem" altura={36} raio="var(--raio-md)" className={estilos.busca} />
      </div>
      <div className={estilos.mapa} aria-hidden="true">
        {[4, 1, 1, 2, 5].map((fichas, indice) => (
          <div key={indice} className={estilos.linha}>
            <div className={estilos.grupo}>
              <Esqueleto largura={32} altura={32} raio="var(--raio-md)" />
              <span className={estilos.textoDoGrupo}>
                <LinhaEmEspera largura={`${70 - indice * 6}%`} />
                <LinhaEmEspera largura="56%" />
              </span>
            </div>
            <div className={estilos.fichas}>
              {Array.from({ length: fichas }, (_, ficha) => (
                <Esqueleto key={ficha} largura={112 + ((ficha * 37) % 60)} altura={32} raio="var(--raio-pilula)" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PainelEmEspera>
  );
}
