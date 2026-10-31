import { useEffect, useState } from 'react';
import { Check, CircleCheck, Download, HardDrive, OctagonX, RotateCcw, X } from 'lucide-react';
import { Medida } from '@/componentes/objetos/DetalheObjeto';
import { Botao, IndicadorGiratorio, Modal, Nota } from '@/componentes/ui';
import type { ExecucaoBackupDTO } from '@/modelos/backup';
import type { ExecucaoAcompanhada } from '@/provedores/ProvedorBackupLocal';
import { descreverEntrega, descreverPasso, descreverResultado, emAndamento, situacaoDosPassos, tituloDaExecucao } from '@/regras/acompanhamentoBackup';
import { etapasDaExecucao, rotuloEtapaExecucao, rotuloSituacaoExecucao } from '@/regras/backup';
import { formatarCronometro, formatarNumero, formatarTamanho } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { ComoFuncionaSegundoPlano } from './ComoFuncionaSegundoPlano';
import { ProgressoExecucao } from './ProgressoExecucao';
import estilos from './DetalheAcompanhamento.module.css';

interface DetalheAcompanhamentoProps {
  acompanhada: ExecucaoAcompanhada | null;
  aoFechar: () => void;
  aoCancelar: (id: string) => void;
  aoTentarDeNovo: (id: string) => void;
  aoBaixar: (id: string) => void;
  aoVerHistorico: (execucao: ExecucaoBackupDTO) => void;
}

function focoNoCartao(id: string | undefined): HTMLElement | null {
  return id ? document.querySelector<HTMLElement>(`[data-ver-detalhes="${CSS.escape(id)}"]`) : null;
}

function Passos({ execucao }: { execucao: ExecucaoBackupDTO }) {
  const situacoes = situacaoDosPassos(execucao);
  return (
    <ol className={estilos.passos}>
      {etapasDaExecucao.map((etapa, indice) => {
        const situacao = situacoes[indice] ?? 'PENDENTE';
        return (
          <li key={etapa} className={juntarClasses(estilos.passo, estilos[situacao])} aria-current={situacao === 'ATUAL' ? 'step' : undefined}>
            <span className={estilos.marca} aria-hidden="true">
              {situacao === 'FEITO' ? <Check size={12} strokeWidth={3} /> : null}
              {situacao === 'ATUAL' ? <IndicadorGiratorio tamanho={12} /> : null}
              {situacao === 'FALHOU' ? <X size={12} strokeWidth={3} /> : null}
            </span>
            <span>{rotuloEtapaExecucao[etapa]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function DetalheAcompanhamento({ acompanhada, aoFechar, aoCancelar, aoTentarDeNovo, aoBaixar, aoVerHistorico }: DetalheAcompanhamentoProps) {
  const [exibida, setExibida] = useState(acompanhada);
  if (acompanhada && acompanhada !== exibida) setExibida(acompanhada);
  const [agora, setAgora] = useState(() => Date.now());
  const rodando = exibida ? emAndamento(exibida.execucao) : false;

  useEffect(() => {
    if (!rodando) return;
    setAgora(Date.now());
    const temporizador = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(temporizador);
  }, [rodando]);

  if (!exibida) return null;
  const { execucao, entrega, local } = exibida;
  const decorrido = execucao.duracaoMs ?? agora - new Date(execucao.iniciadaEm).getTime();

  return (
    <Modal
      aberto={acompanhada !== null}
      aoFechar={aoFechar}
      titulo={tituloDaExecucao(execucao.situacao)}
      descricao={`${execucao.nome} · banco ${execucao.banco}`}
      tamanho="md"
      focoAoFechar={() => focoNoCartao(execucao.id)}
      rodape={
        rodando ? (
          <>
            <Botao variante="terciario" className={estilos.aEsquerda} onClick={() => aoCancelar(execucao.id)}>
              Cancelar backup
            </Botao>
            <Botao onClick={aoFechar}>Fechar</Botao>
          </>
        ) : (
          <>
            <Botao variante="terciario" className={estilos.aEsquerda} onClick={() => aoVerHistorico(execucao)}>
              Ver no histórico
            </Botao>
            {execucao.situacao === 'FALHOU' && exibida.pedido ? (
              <Botao variante="secundario" icone={RotateCcw} onClick={() => aoTentarDeNovo(execucao.id)}>
                Tentar de novo
              </Botao>
            ) : null}
            {entrega === 'PARA_BAIXAR' ? (
              <Botao icone={Download} onClick={() => aoBaixar(execucao.id)}>
                Baixar backup
              </Botao>
            ) : (
              <Botao onClick={aoFechar}>Fechar</Botao>
            )}
          </>
        )
      }
    >
      <div className={estilos.corpo}>
        {rodando ? (
          <div className={estilos.progresso}>
            <ProgressoExecucao execucao={execucao} />
            <p className={estilos.numeros}>
              <span>{execucao.progresso !== null ? `${execucao.progresso}% concluído` : 'Sem percentual: acompanhe pelas etapas'}</span>
              <span>{descreverPasso(execucao)}</span>
            </p>
          </div>
        ) : execucao.situacao === 'CONCLUIDO' ? (
          <Nota tom="sucesso" icone={CircleCheck} titulo="Concluído." role="status">
            {descreverResultado(execucao)} {descreverEntrega(entrega, local)}
          </Nota>
        ) : execucao.situacao === 'FALHOU' ? (
          <Nota tom="erro" icone={OctagonX} titulo="Nenhum arquivo foi salvo." role="alert">
            {descreverResultado(execucao)}
          </Nota>
        ) : (
          <Nota tom="neutro" titulo="Cancelado." role="status">
            {descreverResultado(execucao)}
          </Nota>
        )}

        <Passos execucao={execucao} />

        <dl className={estilos.medidas}>
          <Medida rotulo="Status" valor={rotuloSituacaoExecucao[execucao.situacao]} />
          <Medida rotulo="Tempo decorrido" valor={formatarCronometro(decorrido)} />
          <Medida rotulo="Objetos" valor={`${formatarNumero(execucao.objetosProcessados)} de ${formatarNumero(execucao.objetosIncluidos)}`} />
          <Medida rotulo={execucao.situacao === 'CONCLUIDO' ? 'Tamanho' : 'Recebido'} valor={formatarTamanho(execucao.tamanhoBytes ?? execucao.bytesTransferidos)} />
        </dl>

        {execucao.objetoAtual ? (
          <p className={estilos.objetoAtual}>
            Processando agora: <span className="codigo">{execucao.objetoAtual}</span>
          </p>
        ) : null}

        {entrega !== 'SEM_ARQUIVO' ? (
          <div className={estilos.destino}>
            <HardDrive size={16} strokeWidth={2} aria-hidden="true" />
            <div>
              {execucao.arquivo ? <p className={`${estilos.arquivo} codigo`}>{execucao.arquivo}</p> : null}
              <p className={estilos.ondeFica}>{descreverEntrega(entrega, local)}</p>
            </div>
          </div>
        ) : null}

        {rodando ? (
          <div className={estilos.segundoPlano}>
            <p className={estilos.ajuda}>Pode fechar esta janela: o backup continua, e o cartão no canto da tela acompanha. Só não feche nem recarregue esta aba até terminar.</p>
            <ComoFuncionaSegundoPlano />
          </div>
        ) : null}
        {exibida.semResposta ? <Nota tom="aviso">A API não está respondendo. Tentando de novo…</Nota> : null}
      </div>
    </Modal>
  );
}
