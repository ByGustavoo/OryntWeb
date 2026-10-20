import { useLayoutEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Activity,
  Eye,
  Lightbulb,
  FlaskConical,
  KeyRound,
  Layers,
  ListChecks,
  OctagonAlert,
  SquareFunction,
  Table2,
  TriangleAlert,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Medida, SecaoCopiavel } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import proprios from '@/componentes/objetos/DetalheTabela.module.css';
import { NomeObjeto } from '@/componentes/objetos/NomeObjeto';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type {
  AtributoPapel,
  MetodoSenha,
  ObjetoDoPapelDTO,
  PapelDTO,
  ParticipacaoDTO,
  SituacaoPapel,
  TipoObjetoDoPapel,
} from '@/modelos/papeis';
import { descreverConfiguracao } from '@/regras/funcoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  atributosDoPapel,
  avisosDoPapel,
  comandosDoPapel,
  contarObjetosPorTipo,
  descreverParticipacao,
  efeitoDoAtributo,
  estadoDaSenha,
  estadoDoUsoDoPapel,
  formatarData,
  gruposHerdados,
  identificadorSql,
  palavraDoAtributo,
  papelDoSistema,
  participacoesComSetRole,
  rotuloAtributo,
  rotuloMetodoSenha,
  rotuloTipoObjetoDoPapel,
  semLimiteDeTempo,
  situacoesDoPapel,
  textoDoUltimoUso,
  tipoDoPapel,
} from '@/regras/papeis';
import type { ContextoDosPapeis } from '@/regras/papeis';
import { sugestaoDeTempoOcioso } from '@/regras/sessoes';
import type { SugestaoDeTempoOcioso } from '@/regras/sessoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import locais from './DetalhePapel.module.css';
import { SeloSituacaoPapel, SeloTipoPapel } from './SeloSituacaoPapel';

const OBJETOS_RECOLHIDOS = 6;

const rotuloCurtoMetodoSenha: Record<MetodoSenha, string> = {
  SCRAM: 'SCRAM',
  MD5: 'MD5',
  SEM_SENHA: 'Sem senha',
};

const iconeDoObjeto: Record<TipoObjetoDoPapel, LucideIcon> = {
  TABELA: Table2,
  VISAO: Eye,
  VISAO_MATERIALIZADA: Layers,
  FUNCAO: SquareFunction,
  PROCEDIMENTO: ListChecks,
};

const telaDoObjeto: Record<TipoObjetoDoPapel, string> = {
  TABELA: 'Tabelas',
  VISAO: 'Visões',
  VISAO_MATERIALIZADA: 'Visões',
  FUNCAO: 'Funções',
  PROCEDIMENTO: 'Funções',
};

const plural: Record<TipoObjetoDoPapel, [string, string]> = {
  TABELA: ['tabela', 'tabelas'],
  VISAO: ['visão', 'visões'],
  VISAO_MATERIALIZADA: ['visão materializada', 'visões materializadas'],
  FUNCAO: ['função', 'funções'],
  PROCEDIMENTO: ['procedimento', 'procedimentos'],
};

const efeitoDaConfiguracao: Record<string, string> = {
  statement_timeout: 'Interrompe qualquer comando que passe desse tempo.',
  idle_in_transaction_session_timeout: 'Encerra a sessão que fica parada com uma transação aberta por mais desse tempo.',
  lock_timeout: 'Desiste de esperar por um bloqueio depois desse tempo.',
  search_path: 'Os esquemas em que o PostgreSQL procura um objeto citado sem o nome do esquema.',
  work_mem: 'A memória que cada ordenação ou junção pode usar antes de ir para o disco.',
};

interface AcoesDoDetalhe {
  aoAbrirPapel: (nome: string) => void;
  aoAbrirObjeto: (objeto: ObjetoDoPapelDTO) => void;
  aoVerSessoes: (papel: PapelDTO) => void;
  aoVerPermissoes: (papel: PapelDTO) => void;
}

interface DetalhePapelProps extends AcoesDoDetalhe {
  papel: PapelDTO | null;
  papeis: PapelDTO[];
  contexto: ContextoDosPapeis;
  limiteOciosoDoServidor: string | null;
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalhePapel({
  papel,
  papeis,
  contexto,
  limiteOciosoDoServidor,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  ...acoes
}: DetalhePapelProps) {
  const [exibido, setExibido] = useState(papel);
  if (papel && papel !== exibido) setExibido(papel);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={papel !== null}
      aoFechar={aoFechar}
      titulo={exibido?.login === false ? 'Detalhes do grupo' : 'Detalhes do usuário'}
      descricao={exibido ? descreverPapel(exibido) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer os papéis da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Papel anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próximo papel"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Papel </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibido ? (
        <CorpoDetalhe
          key={exibido.nome}
          papel={exibido}
          papeis={papeis}
          contexto={contexto}
          sugestao={exibido.login ? sugestaoDeTempoOcioso(exibido, limiteOciosoDoServidor) : null}
          simulada={simulada}
          {...acoes}
        />
      ) : null}
    </Modal>
  );
}

function descreverPapel(papel: PapelDTO): string {
  if (!papel.login) return 'Grupo: não faz login, reúne permissões que os membros recebem.';
  if (papel.superusuario) return 'Usuário com login e superusuário.';
  return 'Usuário com login.';
}

function atributosDoCabecalho(papel: PapelDTO, situacoes: SituacaoPapel[]): AtributoPapel[] {
  if (!papel.superusuario) return atributosDoPapel(papel);
  return situacoes.includes('SUPERUSUARIO') ? [] : ['SUPERUSUARIO'];
}

interface CorpoDetalheProps extends AcoesDoDetalhe {
  papel: PapelDTO;
  papeis: PapelDTO[];
  contexto: ContextoDosPapeis;
  sugestao: SugestaoDeTempoOcioso | null;
  simulada: boolean;
}

function CorpoDetalhe({
  papel,
  papeis,
  contexto,
  sugestao,
  simulada,
  aoAbrirPapel,
  aoAbrirObjeto,
  aoVerSessoes,
  aoVerPermissoes,
}: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const avisos = avisosDoPapel(papel, papeis, contexto);
  const comandos = comandosDoPapel(papel, contexto);
  const daConexao = papel.nome === contexto.papelDaConexao;
  const situacoes = situacoesDoPapel(papel, contexto);

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={null} nome={papel.nome} />
        </p>
        <p className={juntarClasses(estilos.descricao, !papel.descricao && estilos.semDescricao)}>
          {papel.descricao ?? 'O banco não tem uma descrição para este papel.'}
        </p>
        <div className={estilos.selos}>
          <SeloTipoPapel tipo={tipoDoPapel(papel)} />
          {daConexao ? (
            <Selo tom="destaque" titulo="O papel com que o Orynt está conectado">
              Você
            </Selo>
          ) : null}
          {atributosDoCabecalho(papel, situacoes).map((atributo) => (
            <Selo key={atributo} tom="neutro" titulo={efeitoDoAtributo[atributo]}>
              {rotuloAtributo[atributo]}
            </Selo>
          ))}
          {situacoes.map((situacao) => (
            <SeloSituacaoPapel key={situacao} situacao={situacao} papel={papel} contexto={contexto} />
          ))}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : TriangleAlert}>
          {aviso.texto}
        </Nota>
      ))}

      {comandos.map((comando, posicao) => (
        <SecaoCopiavel
          key={comando.situacao}
          id={`titulo-comando-papel-${posicao}`}
          titulo={comando.rotulo}
          texto={comando.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>{comando.explicacao}</p>
        </SecaoCopiavel>
      ))}

      {papel.login ? <SecaoAcesso papel={papel} contexto={contexto} aoVerSessoes={aoVerSessoes} /> : null}
      <SecaoAtributos papel={papel} papeis={papeis} />
      <SecaoParticipacoes papel={papel} papeis={papeis} aoAbrirPapel={aoAbrirPapel} aoVerPermissoes={aoVerPermissoes} />
      <SecaoConfiguracoes papel={papel} sugestao={sugestao} />
      <SecaoObjetos papel={papel} aoAbrirObjeto={aoAbrirObjeto} />
    </div>
  );
}

function textoDaSenha(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const estado = estadoDaSenha(papel, contexto);
  if (estado === 'SEM_SENHA') {
    return 'Não tem senha: só entra pelos métodos do pg_hba.conf que não pedem senha, como peer ou certificado.';
  }
  const metodo =
    papel.metodoSenha === null
      ? ' O formato em que a senha está guardada não está disponível, porque a conexão do Orynt não lê pg_authid.'
      : ` A senha está guardada em ${rotuloMetodoSenha[papel.metodoSenha]}.`;
  if (papel.validadeSenha === null) return `A senha não tem validade.${metodo}`;
  const data = formatarData(papel.validadeSenha);
  return estado === 'VENCIDA' ? `A senha venceu em ${data}.${metodo}` : `A senha vale até ${data}.${metodo}`;
}

function textoDoUso(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const estado = estadoDoUsoDoPapel(papel, contexto);
  const sessoes = `${formatarNumero(papel.sessoes)} ${pluralizar(papel.sessoes, 'sessão aberta', 'sessões abertas')} agora`;
  if (estado === 'CONECTADO') {
    const doOrynt =
      papel.nome === contexto.papelDaConexao ? (papel.sessoes > 1 ? ', uma delas a do Orynt' : ', a do Orynt') : '';
    return `${sessoes}${doOrynt}.`;
  }
  if (estado === 'EM_OBSERVACAO') return 'Nenhuma sessão desde que o Orynt começou a ver este usuário.';
  if (papel.vistoPorUltimo === null) return 'O Orynt não viu nenhuma sessão deste usuário.';
  return `Nenhuma sessão agora. A última que o Orynt viu foi em ${formatarData(papel.vistoPorUltimo)}.`;
}

function SecaoAcesso({
  papel,
  contexto,
  aoVerSessoes,
}: {
  papel: PapelDTO;
  contexto: ContextoDosPapeis;
  aoVerSessoes: (papel: PapelDTO) => void;
}) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-acesso-papel">
      <h3 className={estilos.tituloSecao} id="titulo-acesso-papel">
        Acesso
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Sessões agora" valor={formatarNumero(papel.sessoes)} />
        <Medida
          rotulo="Limite"
          valor={papel.limiteConexoes === null ? 'Sem limite' : formatarNumero(papel.limiteConexoes)}
        />
        <Medida rotulo="Último uso" valor={textoDoUltimoUso(papel, contexto)} />
        <Medida
          rotulo="Senha"
          valor={papel.metodoSenha === null ? 'Não disponível' : rotuloCurtoMetodoSenha[papel.metodoSenha]}
          dica={papel.metodoSenha ? rotuloMetodoSenha[papel.metodoSenha] : undefined}
        />
      </dl>
      <p className={estilos.leitura}>
        {textoDoUso(papel, contexto)} {textoDaSenha(papel, contexto)}
      </p>
      {papel.sessoes > 0 ? (
        <Botao
          variante="terciario"
          tamanho="sm"
          icone={Activity}
          iconeDireita={ChevronRight}
          className={locais.alternar}
          onClick={() => aoVerSessoes(papel)}
        >
          {papel.sessoes === 1 ? 'Ver a sessão em Sessões' : `Ver as ${formatarNumero(papel.sessoes)} sessões em Sessões`}
        </Botao>
      ) : null}
    </section>
  );
}

function SecaoAtributos({ papel, papeis }: { papel: PapelDTO; papeis: PapelDTO[] }) {
  const atributos = atributosDoPapel(papel);
  const assumiveis = participacoesComSetRole(papel, papeis);
  const itens: { chave: string; rotulo: string; valor: string; efeito: string }[] = [
    papel.login
      ? { chave: 'login', rotulo: 'Faz login', valor: 'LOGIN', efeito: 'Pode abrir sessões no servidor.' }
      : {
          chave: 'login',
          rotulo: 'Não faz login',
          valor: 'NOLOGIN',
          efeito: 'Ninguém conecta com este papel: ele só reúne permissões para os membros.',
        },
    ...atributos.map((atributo) => ({
      chave: atributo,
      rotulo: rotuloAtributo[atributo],
      valor: palavraDoAtributo[atributo],
      efeito: efeitoDoAtributo[atributo],
    })),
    ...(papel.herda
      ? []
      : [
          {
            chave: 'herda',
            rotulo: 'Não herda permissões',
            valor: 'NOINHERIT',
            efeito: 'As permissões dos grupos de que participa só valem depois de SET ROLE.',
          },
        ]),
    ...(papel.limiteConexoes === null
      ? []
      : [
          {
            chave: 'limite',
            rotulo: 'Limite de conexões',
            valor: `CONNECTION LIMIT ${papel.limiteConexoes}`,
            efeito: `Abre no máximo ${formatarNumero(papel.limiteConexoes)} ${pluralizar(papel.limiteConexoes, 'sessão', 'sessões')} ao mesmo tempo.`,
          },
        ]),
  ];

  return (
    <section className={estilos.secao} aria-labelledby="titulo-atributos-papel">
      <h3 className={estilos.tituloSecao} id="titulo-atributos-papel">
        Atributos
      </h3>
      <dl className={proprios.ajustes}>
        {itens.map((item) => (
          <div key={item.chave} className={proprios.ajuste}>
            <dt className={proprios.rotuloAjuste}>
              {item.rotulo}
              <span className={`${proprios.parametro} codigo`}>{item.valor}</span>
            </dt>
            <dd className={proprios.efeitoAjuste}>{item.efeito}</dd>
          </div>
        ))}
      </dl>
      {papel.inicial ? (
        <p className={estilos.leitura}>
          É o superusuário criado na instalação do servidor. Ele não é apontado como risco, mas a senha dele vale o servidor
          inteiro: use-o só para administrar e deixe as aplicações com papéis próprios.
        </p>
      ) : null}
      {assumiveis.length > 0 ? (
        <div className={locais.subsecao}>
          <h4 className={estilos.rotuloGrupo}>Ao assumir outro papel</h4>
          <dl className={proprios.ajustes}>
            {assumiveis.map((item) => (
              <div key={item.atributo} className={proprios.ajuste}>
                <dt className={proprios.rotuloAjuste}>
                  {rotuloAtributo[item.atributo]}
                  <span className={`${proprios.parametro} codigo`}>
                    SET ROLE {identificadorSql(item.caminho.at(-1) ?? '')}
                  </span>
                </dt>
                <dd className={proprios.efeitoAjuste}>
                  {efeitoDoAtributo[item.atributo]} Vem de {item.caminho.join(' › ')}.
                </dd>
              </div>
            ))}
          </dl>
          <p className={estilos.leitura}>
            No PostgreSQL, os atributos não passam pela participação num grupo: valem só depois de SET ROLE, que este papel
            pode fazer.
          </p>
        </div>
      ) : null}
    </section>
  );
}

interface ItemParticipacaoProps {
  participacao: ParticipacaoDTO;
  papeis: PapelDTO[];
  aoAbrirPapel: (nome: string) => void;
}

function ItemParticipacao({ participacao, papeis, aoAbrirPapel }: ItemParticipacaoProps) {
  const alvo = papeis.find((candidato) => candidato.nome === participacao.papel);
  const Icone = alvo?.login ? UserRound : UsersRound;
  const conteudo = (
    <>
      <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
      <span className={estilos.textosObjeto}>
        <span className={`${estilos.nomeObjeto} codigo`}>{participacao.papel}</span>
        <span className={estilos.tipoObjeto}>
          {papelDoSistema(participacao.papel) ? 'Papel do sistema · ' : ''}
          {descreverParticipacao(participacao)}
        </span>
      </span>
    </>
  );

  if (!alvo) return <div className={estilos.objeto}>{conteudo}</div>;
  return (
    <button
      type="button"
      className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
      onClick={() => aoAbrirPapel(alvo.nome)}
    >
      {conteudo}
      <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
      <span className="visualmente-oculto">. Abrir este papel</span>
    </button>
  );
}

function SecaoParticipacoes({
  papel,
  papeis,
  aoAbrirPapel,
  aoVerPermissoes,
}: {
  papel: PapelDTO;
  papeis: PapelDTO[];
  aoAbrirPapel: (nome: string) => void;
  aoVerPermissoes: (papel: PapelDTO) => void;
}) {
  const herdados = gruposHerdados(papel, papeis);
  const indiretos = herdados.filter((nome) => !papel.membroDe.some((participacao) => participacao.papel === nome));

  return (
    <section className={estilos.secao} aria-labelledby="titulo-participacoes-papel">
      <h3 className={estilos.tituloSecao} id="titulo-participacoes-papel">
        Participação
      </h3>
      <div className={estilos.dependencias}>
        <div className={estilos.grupoObjetos}>
          <h4 className={estilos.rotuloGrupo}>
            Membro de <span className={`${estilos.contagem} numeros`}>{formatarNumero(papel.membroDe.length)}</span>
          </h4>
          {papel.membroDe.length > 0 ? (
            <ul className={estilos.objetos}>
              {papel.membroDe.map((participacao) => (
                <li key={participacao.papel}>
                  <ItemParticipacao participacao={participacao} papeis={papeis} aoAbrirPapel={aoAbrirPapel} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={estilos.leitura}>Não participa de nenhum grupo.</p>
          )}
        </div>
        <div className={estilos.grupoObjetos}>
          <h4 className={estilos.rotuloGrupo}>
            Membros <span className={`${estilos.contagem} numeros`}>{formatarNumero(papel.membros.length)}</span>
          </h4>
          {papel.membros.length > 0 ? (
            <ul className={estilos.objetos}>
              {papel.membros.map((participacao) => (
                <li key={participacao.papel}>
                  <ItemParticipacao participacao={participacao} papeis={papeis} aoAbrirPapel={aoAbrirPapel} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={estilos.leitura}>Nenhum papel participa deste.</p>
          )}
        </div>
      </div>
      {indiretos.length > 0 ? (
        <p className={estilos.leitura}>
          Também recebe as permissões de {indiretos.join(', ')}, pelos grupos de que participa.
        </p>
      ) : null}
      <Botao
        variante="terciario"
        tamanho="sm"
        icone={KeyRound}
        iconeDireita={ChevronRight}
        className={locais.alternar}
        onClick={() => aoVerPermissoes(papel)}
      >
        {papel.superusuario
          ? 'Ver em Permissões'
          : `Ver o que ${papel.login ? 'ele' : 'o grupo'} pode fazer em Permissões`}
      </Botao>
    </section>
  );
}

function SecaoConfiguracoes({ papel, sugestao }: { papel: PapelDTO; sugestao: SugestaoDeTempoOcioso | null }) {
  const semLimite = semLimiteDeTempo(papel);
  if (papel.configuracoes.length === 0 && !semLimite && !sugestao) {
    return (
      <section className={estilos.secao} aria-labelledby="titulo-configuracoes-papel">
        <h3 className={estilos.tituloSecao} id="titulo-configuracoes-papel">
          Configurações próprias
        </h3>
        <p className={estilos.leitura}>
          Nenhuma: as sessões deste papel usam as configurações do servidor e do banco.
        </p>
      </section>
    );
  }

  return (
    <section className={estilos.secao} aria-labelledby="titulo-configuracoes-papel">
      <h3 className={estilos.tituloSecao} id="titulo-configuracoes-papel">
        Configurações próprias
      </h3>
      {papel.configuracoes.length > 0 ? (
        <dl className={proprios.ajustes}>
          {papel.configuracoes.map((configuracao) => {
            const { parametro, valor } = descreverConfiguracao(configuracao);
            return (
              <div key={configuracao} className={proprios.ajuste}>
                <dt className={proprios.rotuloAjuste}>
                  <span className="codigo">{parametro}</span>
                  <span className={`${proprios.parametro} codigo`}>{valor}</span>
                </dt>
                <dd className={proprios.efeitoAjuste}>
                  {efeitoDaConfiguracao[parametro] ?? 'Vale em toda sessão deste papel, a menos que a própria sessão mude o valor.'}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {semLimite ? (
        <Nota tom="aviso" icone={TriangleAlert}>
          Sem <span className="codigo">statement_timeout</span>: uma consulta deste usuário pode rodar sem limite de tempo e
          segurar bloqueios. <span className="codigo">ALTER ROLE {identificadorSql(papel.nome)} SET statement_timeout = '30s'</span>{' '}
          define um limite para as próximas sessões.
        </Nota>
      ) : null}
      {sugestao ? (
        <Nota tom="info" icone={Lightbulb}>
          {sugestao.frase} <span className="codigo">{sugestao.comando}</span> faz o PostgreSQL encerrar sozinho a sessão
          parada há mais de 5 minutos com uma transação aberta, e desfazer essa transação.
        </Nota>
      ) : null}
    </section>
  );
}

function SecaoObjetos({ papel, aoAbrirObjeto }: { papel: PapelDTO; aoAbrirObjeto: (objeto: ObjetoDoPapelDTO) => void }) {
  const [expandida, setExpandida] = useState(false);
  const contagem = contarObjetosPorTipo(papel);
  const visiveis = expandida ? papel.objetos : papel.objetos.slice(0, OBJETOS_RECOLHIDOS);
  const ocultos = papel.objetos.length - visiveis.length;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-objetos-papel">
      <h3 className={estilos.tituloSecao} id="titulo-objetos-papel">
        Dono de <span className={`${estilos.contagem} numeros`}>{formatarNumero(papel.objetos.length)}</span>
      </h3>
      {papel.objetos.length > 0 ? (
        <>
          <p className={estilos.leitura}>
            {contagem
              .map(({ tipo, quantidade }) => `${formatarNumero(quantidade)} ${pluralizar(quantidade, ...plural[tipo])}`)
              .join(', ')}
            . Quem é dono de um objeto pode alterá-lo e removê-lo sem nenhuma permissão a mais.
          </p>
          <ul className={estilos.objetos}>
            {visiveis.map((objeto) => {
              const Icone = iconeDoObjeto[objeto.tipo];
              return (
                <li key={`${objeto.tipo}-${objeto.id}`}>
                  <button
                    type="button"
                    className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                    onClick={() => aoAbrirObjeto(objeto)}
                  >
                    <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                    <span className={estilos.textosObjeto}>
                      <span className={`${estilos.nomeObjeto} codigo`}>
                        <NomeObjeto esquema={objeto.esquema} nome={objeto.nome} classeEsquema={estilos.esquema} />
                      </span>
                      <span className={estilos.tipoObjeto}>{rotuloTipoObjetoDoPapel[objeto.tipo]}</span>
                    </span>
                    <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                    <span className="visualmente-oculto">. Abrir em {telaDoObjeto[objeto.tipo]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {ocultos > 0 || expandida ? (
            <Botao
              variante="terciario"
              tamanho="sm"
              icone={expandida ? ChevronUp : ChevronDown}
              className={locais.alternar}
              aria-expanded={expandida}
              onClick={() => setExpandida(!expandida)}
            >
              {expandida
                ? `Mostrar só os ${formatarNumero(OBJETOS_RECOLHIDOS)} primeiros`
                : `Mostrar os ${formatarNumero(papel.objetos.length)} objetos`}
            </Botao>
          ) : null}
        </>
      ) : (
        <p className={estilos.leitura}>Não é dono de nenhuma tabela, visão ou função deste banco.</p>
      )}
    </section>
  );
}

