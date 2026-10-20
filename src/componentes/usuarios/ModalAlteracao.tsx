import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { Botao, EsqueletoLista, EstadoErro, Modal } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import type { AlteracaoDTO, OperacaoDTO, OrigemDaAlteracao } from '@/modelos/alteracoes';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { PedidoDeAlteracao } from '@/provedores/ProvedorAlteracoes';
import { nomeParaConfirmar } from '@/regras/capacidadeAlteracoes';
import { interpretarFalhaAlteracao } from '@/regras/falhaAlteracao';
import type { FalhaAlteracao } from '@/regras/falhaAlteracao';
import { inversasDe } from '@/regras/inversasAlteracoes';
import { indexarPermissoes, PUBLICO } from '@/regras/permissoes';
import { servicoUsuarios } from '@/servicos';
import { FormularioConcessao } from './FormularioConcessao';
import { FormularioExclusao } from './FormularioExclusao';
import { FormularioPadrao } from './FormularioPadrao';
import { FormularioPapel } from './FormularioPapel';
import { FormularioParticipacao } from './FormularioParticipacao';
import type { EstadoDaAlteracao, RevisaoPedida } from './formularioAlteracao';
import { RevisaoAlteracao } from './RevisaoAlteracao';
import estilos from './ModalAlteracao.module.css';

interface ModalAlteracaoProps {
  pedido: PedidoDeAlteracao;
  aberto: boolean;
  simulada: boolean;
  aoFechar: () => void;
  aoAplicar: (alteracao: AlteracaoDTO) => void;
}

function tituloDoFormulario(pedido: PedidoDeAlteracao): string {
  switch (pedido.tipo) {
    case 'NOVO_PAPEL':
      return 'Novo papel';
    case 'EDITAR_PAPEL':
      return pedido.trocarSenha ? `Trocar a senha de ${pedido.papel}` : `Editar ${pedido.papel}`;
    case 'EXCLUIR_PAPEL':
      return `Excluir ${pedido.papel}`;
    case 'PARTICIPACAO':
      return pedido.grupo ? `Pôr um papel em ${pedido.grupo}` : pedido.membro ? `Pôr ${pedido.membro} num grupo` : 'Pôr num grupo';
    case 'CONCESSAO':
      return 'Conceder ou revogar acesso';
    case 'PADRAO':
      return 'Privilégio padrão';
    case 'OPERACOES':
      return 'Revisar a alteração';
  }
}

function descricaoDoFormulario(pedido: PedidoDeAlteracao): string | undefined {
  switch (pedido.tipo) {
    case 'NOVO_PAPEL':
      return 'Comece de um modelo ou em branco. Nada roda antes da revisão.';
    case 'EXCLUIR_PAPEL':
      return 'O que depende do papel precisa sair antes do DROP ROLE.';
    case 'CONCESSAO':
      return 'GRANT ou REVOKE num objeto ou em todos de um esquema.';
    case 'PADRAO':
      return 'O que os objetos criados daqui em diante já recebem.';
    default:
      return undefined;
  }
}

function rotuloDeExecutar(operacoes: OperacaoDTO[], origem: OrigemDaAlteracao): string {
  if (origem === 'DESFAZER') return 'Desfazer';
  if (operacoes.some((operacao) => operacao.tipo === 'EXCLUIR_PAPEL')) return 'Excluir papel';
  const criacao = operacoes.find((operacao) => operacao.tipo === 'CRIAR_PAPEL');
  if (criacao?.tipo === 'CRIAR_PAPEL') return criacao.atributos.login ? 'Criar usuário' : 'Criar grupo';
  if (operacoes.every((operacao) => operacao.tipo === 'CONCEDER' || operacao.tipo === 'CONCEDER_PARTICIPACAO')) return 'Conceder';
  if (operacoes.every((operacao) => operacao.tipo === 'REVOGAR' || operacao.tipo === 'REVOGAR_PARTICIPACAO')) return 'Revogar';
  return 'Executar';
}

function destrutiva(operacoes: OperacaoDTO[], confirmar: string | null): boolean {
  return (
    confirmar !== null ||
    operacoes.some(
      (operacao) =>
        operacao.tipo === 'EXCLUIR_PAPEL' ||
        (operacao.tipo === 'REVOGAR' && operacao.beneficiario === PUBLICO) ||
        (operacao.tipo === 'ALTERAR_PAPEL' && operacao.atributos.superusuario === false),
    )
  );
}

export default function ModalAlteracao({ pedido, aberto, simulada, aoFechar, aoAplicar }: ModalAlteracaoProps) {
  const idFormulario = useId();
  const { marcarDesconectada } = useConexao();
  const [revisao, setRevisao] = useState<RevisaoPedida | null>(
    pedido.tipo === 'OPERACOES' ? { operacoes: pedido.operacoes, origem: pedido.origem } : null,
  );
  const [ocupado, setOcupado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<FalhaAlteracao | null>(null);
  const [confirmacao, setConfirmacao] = useState('');
  const corpo = useRef<HTMLDivElement>(null);
  const comFormulario = pedido.tipo !== 'OPERACOES';

  const carga = useDadosAssincronos(async (signal) => {
    const [papeis, permissoes] = await Promise.all([servicoUsuarios.listarPapeis(signal), servicoUsuarios.listarPermissoes(signal)]);
    return { papeis, permissoes };
  }, []);
  const estado = useMemo<EstadoDaAlteracao | null>(
    () => (carga.dados ? { ...carga.dados, indice: indexarPermissoes(carga.dados.permissoes) } : null),
    [carga.dados],
  );
  const confirmar = revisao && estado ? nomeParaConfirmar(revisao.operacoes, estado.papeis.papelDaConexao) : null;
  const confirmado = confirmar === null || confirmacao.trim() === confirmar;

  useEffect(() => {
    if (ehErroApi(carga.erro, 'NAO_AUTORIZADO')) marcarDesconectada();
  }, [carga.erro, marcarDesconectada]);

  useEffect(() => {
    corpo.current?.parentElement?.scrollTo({ top: 0 });
  }, [revisao]);

  const revisar = (pedida: RevisaoPedida) => {
    setFalha(null);
    setConfirmacao('');
    setRevisao(pedida);
  };

  const voltar = () => {
    setRevisao(null);
    setFalha(null);
    window.requestAnimationFrame(() => {
      corpo.current?.querySelector<HTMLElement>('input:not([type="hidden"]), button, [tabindex="0"]')?.focus();
    });
  };

  const executar = async () => {
    if (!revisao || !estado || enviando || !confirmado) return;
    setEnviando(true);
    setFalha(null);
    let inversas: OperacaoDTO[] | null = null;
    try {
      inversas = revisao.origem === 'DESFAZER' ? null : inversasDe(revisao.operacoes, estado);
    } catch {
      inversas = null;
    }
    try {
      const alteracao = await servicoUsuarios.aplicarAlteracao({
        operacoes: revisao.operacoes,
        inversas,
        desfaz: pedido.tipo === 'OPERACOES' ? (pedido.desfaz ?? null) : null,
        origem: revisao.origem,
      });
      aoAplicar(alteracao);
    } catch (erro) {
      setFalha(interpretarFalhaAlteracao(erro));
      setEnviando(false);
    }
  };

  const rodape = revisao ? (
    <>
      <Botao
        variante="secundario"
        icone={comFormulario ? ArrowLeft : undefined}
        onClick={comFormulario ? voltar : aoFechar}
        disabled={enviando}
      >
        {comFormulario ? 'Voltar' : 'Cancelar'}
      </Botao>
      <Botao
        variante={destrutiva(revisao.operacoes, confirmar) ? 'perigo' : 'primario'}
        carregando={enviando}
        disabled={!estado || !confirmado}
        onClick={() => void executar()}
      >
        {rotuloDeExecutar(revisao.operacoes, revisao.origem)}
      </Botao>
    </>
  ) : (
    <>
      <Botao variante="secundario" onClick={aoFechar}>
        Cancelar
      </Botao>
      <Botao type="submit" form={idFormulario} iconeDireita={ArrowRight} carregando={ocupado} disabled={!estado}>
        Revisar
      </Botao>
    </>
  );

  const formulario = (dados: EstadoDaAlteracao) => {
    const comum = { idFormulario, estado: dados, aoRevisar: revisar, aoOcupar: setOcupado };
    switch (pedido.tipo) {
      case 'NOVO_PAPEL':
        return <FormularioPapel {...comum} original={null} trocarSenha={false} />;
      case 'EDITAR_PAPEL': {
        const original = dados.papeis.papeis.find((papel) => papel.nome === pedido.papel) ?? null;
        if (!original) return <EstadoErro titulo="O papel não existe mais" descricao="Ele foi removido ou renomeado depois que a tela carregou." />;
        return <FormularioPapel {...comum} original={original} trocarSenha={pedido.trocarSenha ?? false} />;
      }
      case 'EXCLUIR_PAPEL': {
        const papel = dados.papeis.papeis.find((candidato) => candidato.nome === pedido.papel) ?? null;
        if (!papel) return <EstadoErro titulo="O papel não existe mais" descricao="Ele foi removido ou renomeado depois que a tela carregou." />;
        return <FormularioExclusao {...comum} papel={papel} />;
      }
      case 'PARTICIPACAO':
        return <FormularioParticipacao {...comum} grupo={pedido.grupo ?? null} membro={pedido.membro ?? null} />;
      case 'CONCESSAO':
        return <FormularioConcessao {...comum} inicial={pedido.inicial ?? {}} />;
      case 'PADRAO':
        return <FormularioPadrao {...comum} inicial={pedido.inicial ?? {}} />;
      case 'OPERACOES':
        return null;
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={enviando ? () => undefined : aoFechar}
      titulo={revisao ? 'Revisar a alteração' : tituloDoFormulario(pedido)}
      descricao={revisao ? 'Confira os comandos e o que muda antes de executar.' : descricaoDoFormulario(pedido)}
      tamanho="lg"
      papel={revisao && confirmar ? 'alertdialog' : 'dialog'}
      focarPrimeiroCampo={pedido.tipo === 'NOVO_PAPEL'}
      rodape={rodape}
    >
      <div ref={corpo} className={estilos.corpo}>
        {carga.erro ? (
          <EstadoErro
            titulo="Não foi possível carregar os papéis e as permissões"
            descricao="A revisão precisa do estado atual do banco para mostrar o que muda."
            aoTentarNovamente={carga.recarregar}
          />
        ) : !estado ? (
          <EsqueletoLista linhas={4} rotulo="Carregando os papéis e as permissões…" />
        ) : (
          <>
            {comFormulario ? <div hidden={revisao !== null}>{formulario(estado)}</div> : null}
            {revisao ? (
              <RevisaoAlteracao
                revisao={revisao}
                estado={estado}
                simulada={simulada}
                falha={falha}
                confirmar={confirmar}
                confirmacao={confirmacao}
                aoConfirmar={setConfirmacao}
                desfazendo={revisao.origem === 'DESFAZER'}
              />
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
