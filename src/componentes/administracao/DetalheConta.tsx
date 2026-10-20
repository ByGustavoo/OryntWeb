import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Ban,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LockKeyholeOpen,
  LogOut,
  MailWarning,
  Pencil,
  Power,
  ScrollText,
  Send,
  Trash2,
} from 'lucide-react';
import { ErroApi } from '@/api/ErroApi';
import { descreverFalha } from '@/api/tratamentoErros';
import { Medida } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { Botao, BotaoIcone, DialogoConfirmacao, Modal, Nota, Selo } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import { useEscolhaDePermissoes } from '@/ganchos/useEscolhaDePermissoes';
import type { CodigoPermissao, ContaDTO } from '@/modelos/administracao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { descreverConvite, situacaoDaConta } from '@/regras/contas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { CATALOGO_DE_PERMISSOES, avaliarMudancaDeConta, personalizada, rotuloDaPermissao, rotuloDoPerfil } from '@/regras/permissoesConta';
import { servicoAdministracao } from '@/servicos';
import { formatarHorario, formatarInstante, formatarNumero, formatarTempoRelativo, pluralizar } from '@/utilitarios/formatacao';
import { EditorDePermissoes } from './EditorDePermissoes';
import { BotaoProtegido } from './BotaoProtegido';
import { SeloSituacaoConta } from './SeloSituacaoConta';
import locais from './DetalheConta.module.css';

const ConviteNaCaixaSimulada = ambiente.dadosSimulados ? lazy(() => import('./ConviteNaCaixaSimulada')) : null;

export interface Ator {
  id: string;
  permissoes: CodigoPermissao[];
}

interface DetalheContaProps {
  conta: ContaDTO | null;
  contas: ContaDTO[];
  ator: Ator;
  geradoEm: string;
  simulada: boolean;
  posicao: number | null;
  total: number;
  podeVerAuditoria: boolean;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
  aoEditar: (conta: ContaDTO) => void;
  aoExcluir: (conta: ContaDTO) => void;
  aoVerAtividade: (conta: ContaDTO) => void;
  aoAtualizar: (conta: ContaDTO) => void;
}

type Confirmacao = 'DESATIVAR' | 'ENCERRAR_SESSOES' | 'DESCARTAR' | null;

export function DetalheConta({
  conta,
  contas,
  ator,
  geradoEm,
  simulada,
  posicao,
  total,
  podeVerAuditoria,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  aoEditar,
  aoExcluir,
  aoVerAtividade,
  aoAtualizar,
}: DetalheContaProps) {
  const [exibida, setExibida] = useState(conta);
  if (conta && conta !== exibida) setExibida(conta);
  const [pendente, setPendente] = useState(false);
  const [confirmar, setConfirmar] = useState<{ tipo: Confirmacao; depois: (() => void) | null }>({ tipo: null, depois: null });
  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;
  const motivoDasSetas = pendente ? 'Salve ou descarte as permissões antes de mudar de conta.' : null;

  const pedirDescarte = (depois: () => void) => {
    if (!pendente) {
      depois();
      return;
    }
    setConfirmar({ tipo: 'DESCARTAR', depois });
  };

  return (
    <>
      <Modal
        aberto={conta !== null}
        aoFechar={() => pedirDescarte(aoFechar)}
        titulo="Detalhes do usuário"
        descricao={exibida ? `Conta de ${rotuloDoPerfil(exibida.perfil).toLowerCase()} no Orynt, não um papel do banco.` : undefined}
        tamanho="lg"
        focoAoFechar={focoAoFechar}
        rodape={
          <div className={estilos.navegacao}>
            <div className={estilos.passos} role="group" aria-label="Percorrer os usuários da lista">
              <BotaoIcone
                icone={ChevronUp}
                rotulo={motivoDasSetas ?? 'Usuário anterior'}
                variante="secundario"
                aria-disabled={temAnterior && !pendente ? undefined : true}
                onClick={() => temAnterior && !pendente && aoPercorrer(-1)}
              />
              <BotaoIcone
                icone={ChevronDown}
                rotulo={motivoDasSetas ?? 'Próximo usuário'}
                variante="secundario"
                aria-disabled={temSeguinte && !pendente ? undefined : true}
                onClick={() => temSeguinte && !pendente && aoPercorrer(1)}
              />
            </div>
            <p className={estilos.posicao} role="status">
              {posicao !== null ? (
                <>
                  <span className={estilos.palavraDaPosicao}>Usuário </span>
                  <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
                </>
              ) : (
                'Fora dos filtros da lista'
              )}
            </p>
          </div>
        }
      >
        {exibida ? (
          <CorpoDetalhe
            key={exibida.id}
            conta={exibida}
            contas={contas}
            ator={ator}
            geradoEm={geradoEm}
            simulada={simulada}
            podeVerAuditoria={podeVerAuditoria}
            aoEditar={aoEditar}
            aoExcluir={aoExcluir}
            aoVerAtividade={(alvo) => pedirDescarte(() => aoVerAtividade(alvo))}
            aoAtualizar={aoAtualizar}
            aoMudarPendencia={setPendente}
            aoPedirConfirmacao={(tipo, depois) => setConfirmar({ tipo, depois })}
          />
        ) : null}
      </Modal>

      <DialogoConfirmacao
        aberto={confirmar.tipo === 'DESCARTAR'}
        titulo="Descartar as permissões não salvas?"
        descricao="As mudanças nas permissões desta conta ainda não foram salvas e vão se perder."
        textoConfirmar="Descartar"
        destrutivo
        aoConfirmar={() => {
          const depois = confirmar.depois;
          setPendente(false);
          setConfirmar({ tipo: null, depois: null });
          depois?.();
        }}
        aoCancelar={() => setConfirmar({ tipo: null, depois: null })}
      />
      <DialogoConfirmacao
        aberto={confirmar.tipo === 'DESATIVAR' && exibida !== null}
        titulo={exibida ? `Desativar a conta de ${exibida.nome}?` : 'Desativar a conta?'}
        descricao="A pessoa sai do Orynt na hora e não consegue entrar até a conta ser ativada de novo. Permissões, conexões salvas e histórico ficam guardados."
        textoConfirmar="Desativar"
        destrutivo
        aoConfirmar={() => {
          const depois = confirmar.depois;
          setConfirmar({ tipo: null, depois: null });
          depois?.();
        }}
        aoCancelar={() => setConfirmar({ tipo: null, depois: null })}
      />
      <DialogoConfirmacao
        aberto={confirmar.tipo === 'ENCERRAR_SESSOES' && exibida !== null}
        titulo={exibida ? `Encerrar as sessões de ${exibida.nome}?` : 'Encerrar as sessões?'}
        descricao="A pessoa sai do Orynt em todos os navegadores e precisa entrar de novo. A conta continua ativa."
        textoConfirmar="Encerrar sessões"
        aoConfirmar={() => {
          const depois = confirmar.depois;
          setConfirmar({ tipo: null, depois: null });
          depois?.();
        }}
        aoCancelar={() => setConfirmar({ tipo: null, depois: null })}
      />
    </>
  );
}

interface CorpoDetalheProps {
  conta: ContaDTO;
  contas: ContaDTO[];
  ator: Ator;
  geradoEm: string;
  simulada: boolean;
  podeVerAuditoria: boolean;
  aoEditar: (conta: ContaDTO) => void;
  aoExcluir: (conta: ContaDTO) => void;
  aoVerAtividade: (conta: ContaDTO) => void;
  aoAtualizar: (conta: ContaDTO) => void;
  aoMudarPendencia: (pendente: boolean) => void;
  aoPedirConfirmacao: (tipo: Confirmacao, depois: () => void) => void;
}

type Acao = 'ATIVAR' | 'DESATIVAR' | 'CONVITE' | 'DESBLOQUEAR' | 'SESSOES';

function CorpoDetalhe({
  conta,
  contas,
  ator,
  geradoEm,
  simulada,
  podeVerAuditoria,
  aoEditar,
  aoExcluir,
  aoVerAtividade,
  aoAtualizar,
  aoMudarPendencia,
  aoPedirConfirmacao,
}: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const notificacoes = useNotificacoes();
  const [emAndamento, setEmAndamento] = useState<Acao | null>(null);
  const agora = new Date(geradoEm);
  const situacao = situacaoDaConta(conta, agora);
  const propria = conta.id === ator.id;
  const atorDaRegra = contas.find((item) => item.id === ator.id) ?? { ...conta, id: ator.id, permissoes: ator.permissoes };
  const motivoDesativar = avaliarMudancaDeConta(atorDaRegra, conta, { tipo: 'DESATIVAR' }, contas)?.mensagem ?? null;
  const motivoExcluir = avaliarMudancaDeConta(atorDaRegra, conta, { tipo: 'EXCLUIR' }, contas)?.mensagem ?? null;

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  const executar = async (acao: Acao, chamada: () => Promise<ContaDTO>, sucesso: { titulo: string; descricao?: string }) => {
    if (emAndamento) return;
    setEmAndamento(acao);
    try {
      const atualizada = await chamada();
      aoAtualizar(atualizada);
      notificacoes.sucesso(sucesso.titulo, sucesso.descricao);
    } catch (erro) {
      notificacoes.erro(
        'A conta não foi alterada',
        erro instanceof ErroApi && erro.resposta?.detail ? erro.resposta.detail : descreverFalha(erro),
      );
    } finally {
      setEmAndamento(null);
    }
  };

  const ativar = () =>
    void executar('ATIVAR', () => servicoAdministracao.editarConta(conta.id, { ativa: true }), {
      titulo: `Conta de ${conta.nome} ativada`,
      descricao: conta.convite || situacao === 'DESATIVADA' ? 'Se a pessoa ainda não tem senha, um convite novo foi enviado.' : undefined,
    });

  const desativar = () =>
    aoPedirConfirmacao('DESATIVAR', () =>
      void executar('DESATIVAR', () => servicoAdministracao.editarConta(conta.id, { ativa: false }), {
        titulo: `Conta de ${conta.nome} desativada`,
        descricao: 'As sessões abertas foram encerradas.',
      }),
    );

  const encerrarSessoes = () =>
    aoPedirConfirmacao('ENCERRAR_SESSOES', () =>
      void executar('SESSOES', () => servicoAdministracao.encerrarSessoes(conta.id), {
        titulo: `Sessões de ${conta.nome} encerradas`,
        descricao: 'A pessoa precisa entrar de novo.',
      }),
    );

  const criadaPor = conta.inicial
    ? 'Criada na instalação do Orynt.'
    : `Criada em ${formatarInstante(conta.criadaEm)}${conta.criadaPor ? ` por ${conta.criadaPor.nome}` : ''}.`;

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={estilos.nome}>{conta.nome}</p>
        <p className={`${estilos.descricao} codigo`}>{conta.email}</p>
        <div className={estilos.selos}>
          <SeloSituacaoConta situacao={situacao} />
          <Selo tom="neutro">{rotuloDoPerfil(conta.perfil)}</Selo>
          {personalizada(conta.perfil, conta.permissoes) ? (
            <Selo tom="info" titulo="As permissões desta conta não são exatamente as do perfil.">
              Personalizado
            </Selo>
          ) : null}
          {propria ? (
            <Selo tom="destaque" titulo="A conta com que você entrou">
              Você
            </Selo>
          ) : null}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
        <p className={locais.criada}>{criadaPor}</p>
        <div className={locais.acoes} role="group" aria-label={`Administrar a conta de ${conta.nome}`}>
          <Botao variante="secundario" tamanho="sm" icone={Pencil} onClick={() => aoEditar(conta)}>
            Editar dados
          </Botao>
          {conta.ativa ? (
            <BotaoProtegido
              variante="secundario"
              tamanho="sm"
              icone={Ban}
              motivo={motivoDesativar}
              carregando={emAndamento === 'DESATIVAR'}
              onClick={desativar}
            >
              Desativar
            </BotaoProtegido>
          ) : (
            <Botao variante="secundario" tamanho="sm" icone={Power} carregando={emAndamento === 'ATIVAR'} onClick={ativar}>
              Ativar
            </Botao>
          )}
          {conta.convite && conta.ativa ? (
            <Botao
              variante="secundario"
              tamanho="sm"
              icone={Send}
              carregando={emAndamento === 'CONVITE'}
              onClick={() =>
                void executar('CONVITE', () => servicoAdministracao.reenviarConvite(conta.id), {
                  titulo: 'Convite reenviado',
                  descricao: `Um link novo foi para ${conta.email}. O anterior deixou de valer.`,
                })
              }
            >
              Reenviar convite
            </Botao>
          ) : null}
          {situacao === 'BLOQUEADA' ? (
            <Botao
              variante="secundario"
              tamanho="sm"
              icone={LockKeyholeOpen}
              carregando={emAndamento === 'DESBLOQUEAR'}
              onClick={() =>
                void executar('DESBLOQUEAR', () => servicoAdministracao.desbloquearConta(conta.id), {
                  titulo: `Login de ${conta.nome} desbloqueado`,
                })
              }
            >
              Desbloquear
            </Botao>
          ) : null}
          {conta.sessoesAtivas > 0 ? (
            <BotaoProtegido
              variante="secundario"
              tamanho="sm"
              icone={LogOut}
              motivo={propria ? 'Para encerrar a própria sessão, use “Sair” no menu da conta.' : null}
              carregando={emAndamento === 'SESSOES'}
              onClick={encerrarSessoes}
            >
              Encerrar sessões
            </BotaoProtegido>
          ) : null}
          {podeVerAuditoria ? (
            <Botao variante="secundario" tamanho="sm" icone={ScrollText} onClick={() => aoVerAtividade(conta)}>
              Ver atividade
            </Botao>
          ) : null}
          <BotaoProtegido
            variante="terciario"
            tamanho="sm"
            icone={Trash2}
            className={locais.excluir}
            motivo={motivoExcluir}
            onClick={() => aoExcluir(conta)}
          >
            Excluir
          </BotaoProtegido>
        </div>
      </header>

      <AvisosDaConta conta={conta} agora={agora} simulada={simulada} />

      <dl className={estilos.medidas}>
        <Medida
          rotulo="Último acesso"
          valor={conta.ultimoAcessoEm ? formatarTempoRelativo(conta.ultimoAcessoEm, agora) : 'Nunca entrou'}
          dica={conta.ultimoAcessoEm ? formatarInstante(conta.ultimoAcessoEm) : undefined}
        />
        <Medida rotulo="Sessões abertas" valor={formatarNumero(conta.sessoesAtivas)} />
        <Medida rotulo="Conexões salvas" valor={formatarNumero(conta.conexoesSalvas)} />
        <Medida
          rotulo="Permissões"
          valor={`${formatarNumero(conta.permissoes.length)} de ${formatarNumero(CATALOGO_DE_PERMISSOES.length)}`}
        />
      </dl>

      <PermissoesDaConta
        key={`${conta.id}:${conta.perfil}:${conta.permissoes.join(',')}`}
        conta={conta}
        contas={contas}
        ator={ator}
        aoAtualizar={aoAtualizar}
        aoMudarPendencia={aoMudarPendencia}
      />
    </div>
  );
}

function AvisosDaConta({ conta, agora, simulada }: { conta: ContaDTO; agora: Date; simulada: boolean }) {
  const situacao = situacaoDaConta(conta, agora);
  if (situacao === 'BLOQUEADA' && conta.bloqueadaAte) {
    return (
      <Nota tom="erro" icone={LockKeyholeOpen} titulo={`Login bloqueado até ${formatarHorario(conta.bloqueadaAte)}.`}>
        Foram várias tentativas de senha erradas seguidas. Se foi a própria pessoa, desbloqueie; se não, vale conferir a auditoria.
      </Nota>
    );
  }
  if (situacao === 'DESATIVADA') {
    return (
      <Nota tom="neutro" icone={Ban} titulo="Conta desativada.">
        A pessoa não consegue entrar. As permissões e as conexões salvas ficam guardadas para quando a conta voltar.
      </Nota>
    );
  }
  if (situacao === 'CONVITE_PENDENTE' || situacao === 'CONVITE_EXPIRADO') {
    return (
      <>
        <Nota tom={situacao === 'CONVITE_EXPIRADO' ? 'aviso' : 'info'} icone={MailWarning} titulo={situacao === 'CONVITE_EXPIRADO' ? 'Convite expirado.' : 'Convite pendente.'}>
          {descreverConvite(conta, agora)}
        </Nota>
        {simulada && ConviteNaCaixaSimulada && situacao === 'CONVITE_PENDENTE' ? (
          <Suspense fallback={null}>
            <ConviteNaCaixaSimulada contaId={conta.id} />
          </Suspense>
        ) : null}
      </>
    );
  }
  return null;
}

interface PermissoesDaContaProps {
  conta: ContaDTO;
  contas: ContaDTO[];
  ator: Ator;
  aoAtualizar: (conta: ContaDTO) => void;
  aoMudarPendencia: (pendente: boolean) => void;
}

function PermissoesDaConta({ conta, contas, ator, aoAtualizar, aoMudarPendencia }: PermissoesDaContaProps) {
  const notificacoes = useNotificacoes();
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const edicao = useEscolhaDePermissoes(ator, conta, contas, { perfil: conta.perfil, permissoes: conta.permissoes });
  useEffect(() => {
    aoMudarPendencia(edicao.mudou);
  }, [aoMudarPendencia, edicao.mudou]);

  const salvar = async () => {
    if (salvando || !edicao.mudou) return;
    setSalvando(true);
    setFalha(null);
    try {
      const atualizada = await servicoAdministracao.mudarPermissoes(conta.id, edicao.escolha);
      aoMudarPendencia(false);
      aoAtualizar(atualizada);
      const partes = [
        edicao.diferenca.concedidas.length > 0 ? `concedidas: ${edicao.diferenca.concedidas.map(rotuloDaPermissao).join(', ')}` : '',
        edicao.diferenca.revogadas.length > 0 ? `revogadas: ${edicao.diferenca.revogadas.map(rotuloDaPermissao).join(', ')}` : '',
      ].filter(Boolean);
      notificacoes.sucesso(`Permissões de ${conta.nome} salvas`, partes.length > 0 ? `${partes.join('; ')}.` : 'O perfil mudou.');
    } catch (erro) {
      setFalha(erro instanceof ErroApi && erro.resposta?.detail ? erro.resposta.detail : descreverFalha(erro));
      setSalvando(false);
    }
  };

  const quantidade = edicao.diferenca.concedidas.length + edicao.diferenca.revogadas.length;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-permissoes-conta">
      <h3 className={estilos.tituloSecao} id="titulo-permissoes-conta">
        Permissões
      </h3>
      <EditorDePermissoes
        idBase={`permissoes-${conta.id}`}
        escolha={edicao.escolha}
        original={{ perfil: conta.perfil, permissoes: conta.permissoes }}
        bloqueio={edicao.bloqueio}
        aoMarcar={edicao.marcar}
        aoTrocarPerfil={edicao.trocarPerfil}
        aoVoltarAoPerfil={edicao.voltarAoPerfil}
        foraDoAlcance={edicao.foraDoAlcance}
        desabilitado={salvando}
      />
      {falha ? (
        <Nota tom="erro" titulo="As permissões não foram salvas.">
          {falha}
        </Nota>
      ) : null}
      {edicao.mudou ? (
        <div className={locais.barraPendente} role="region" aria-label="Permissões não salvas">
          <p className={locais.textoPendente} aria-live="polite">
            {quantidade > 0
              ? `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'mudança', 'mudanças')} não ${pluralizar(quantidade, 'salva', 'salvas')}`
              : 'Perfil trocado, ainda não salvo'}
            {edicao.escolha.perfil !== conta.perfil ? ` · perfil ${rotuloDoPerfil(edicao.escolha.perfil)}` : ''}
          </p>
          <div className={locais.acoesPendentes}>
            <Botao variante="terciario" tamanho="sm" onClick={edicao.descartar} disabled={salvando}>
              Descartar
            </Botao>
            <Botao tamanho="sm" carregando={salvando} onClick={() => void salvar()}>
              Salvar permissões
            </Botao>
          </div>
        </div>
      ) : null}
    </section>
  );
}
