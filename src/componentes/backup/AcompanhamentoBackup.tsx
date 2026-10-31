import { useEffect, useRef, useState } from 'react';
import { AlarmClock, Ban, ChevronDown, ChevronUp, CircleCheck, Download, Maximize2, OctagonX, Play, RotateCcw, X } from 'lucide-react';
import { Botao, BotaoIcone, Dica, IndicadorGiratorio } from '@/componentes/ui';
import type { AgendamentoBackupDTO } from '@/modelos/backup';
import { useAcompanhamentoBackup, useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import type { ExecucaoAcompanhada } from '@/provedores/ProvedorBackupLocal';
import {
  descreverAndamento,
  emAndamento,
  fraseDoResumo,
  resumirAcompanhamento,
  resumirDesfecho,
  tempoNaBarraMs,
} from '@/regras/acompanhamentoBackup';
import { descreverFrequencia } from '@/regras/frequenciaBackup';
import { formatarCronometro } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { ComoFuncionaSegundoPlano } from './ComoFuncionaSegundoPlano';
import { ProgressoExecucao } from './ProgressoExecucao';
import estilos from './AcompanhamentoBackup.module.css';

const VARIAVEL_DA_ALTURA = '--altura-acompanhamento-backup';
const PAUSA_APOS_INTERACAO_MS = 5000;

function tempoDecorrido({ execucao }: ExecucaoAcompanhada, agora: number): number {
  return execucao.duracaoMs ?? agora - new Date(execucao.iniciadaEm).getTime();
}

function IconeDaSituacao({ acompanhada }: { acompanhada: ExecucaoAcompanhada }) {
  switch (acompanhada.execucao.situacao) {
    case 'EM_ANDAMENTO':
      return <IndicadorGiratorio tamanho={16} />;
    case 'CONCLUIDO':
      return <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />;
    case 'FALHOU':
      return <OctagonX size={16} strokeWidth={2} aria-hidden="true" />;
    case 'CANCELADO':
      return <Ban size={16} strokeWidth={2} aria-hidden="true" />;
  }
}

function LinhaDaExecucao({ acompanhada, agora }: { acompanhada: ExecucaoAcompanhada; agora: number }) {
  const { abrirDetalhes } = useBackupLocal();
  const { dispensar, pedirCancelamento, baixar, tentarDeNovo } = useAcompanhamentoBackup();
  const { execucao, entrega, local } = acompanhada;
  const rodando = emAndamento(execucao);
  const paraBaixar = entrega === 'PARA_BAIXAR';
  const podeTentar = execucao.situacao === 'FALHOU' && acompanhada.pedido !== null;

  return (
    <li className={juntarClasses(estilos.linha, estilos[execucao.situacao])}>
      <span className={estilos.icone}>
        <IconeDaSituacao acompanhada={acompanhada} />
      </span>
      <div className={estilos.textos}>
        <Dica conteudo={execucao.nome} soSeCortado>
          <p className={estilos.nome}>{execucao.nome}</p>
        </Dica>
        {rodando ? null : (
          <p className={estilos.desfecho} role={execucao.situacao === 'FALHOU' ? 'alert' : 'status'}>
            {resumirDesfecho(execucao, entrega, local)}
          </p>
        )}
      </div>
      <div className={estilos.acoesDaLinha}>
        <BotaoIcone icone={Maximize2} tamanho="sm" rotulo={`Ver os detalhes de ${execucao.nome}`} dica="Ver detalhes" data-ver-detalhes={execucao.id} onClick={() => abrirDetalhes(execucao.id)} />
        {rodando ? (
          <BotaoIcone icone={X} tamanho="sm" rotulo={`Cancelar ${execucao.nome}`} dica="Cancelar backup" onClick={() => pedirCancelamento(execucao.id)} />
        ) : (
          <BotaoIcone icone={X} tamanho="sm" rotulo={`Dispensar o aviso de ${execucao.nome}`} dica="Dispensar" onClick={() => dispensar(execucao.id)} />
        )}
      </div>

      {rodando ? (
        <div className={estilos.progresso}>
          <ProgressoExecucao execucao={execucao} />
          <p className={estilos.andamento}>
            <span>{descreverAndamento(execucao)}</span>
            <span className="numeros">{formatarCronometro(tempoDecorrido(acompanhada, agora))}</span>
          </p>
          {acompanhada.semResposta ? <p className={estilos.semResposta}>Sem resposta da API. Tentando de novo…</p> : null}
        </div>
      ) : null}

      {paraBaixar || podeTentar ? (
        <div className={estilos.acaoPrincipal}>
          {paraBaixar ? (
            <Botao tamanho="sm" icone={Download} onClick={() => baixar(execucao.id)}>
              Baixar backup
            </Botao>
          ) : null}
          {podeTentar ? (
            <Botao tamanho="sm" variante="secundario" icone={RotateCcw} onClick={() => tentarDeNovo(execucao.id)}>
              Tentar de novo
            </Botao>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function LinhaDoLembrete({ agendamento }: { agendamento: AgendamentoBackupDTO }) {
  const { fazerAgendamento } = useBackupLocal();
  const { dispensarLembrete } = useAcompanhamentoBackup();
  return (
    <li className={juntarClasses(estilos.linha, estilos.LEMBRETE)}>
      <span className={estilos.icone}>
        <AlarmClock size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className={estilos.textos}>
        <Dica conteudo={agendamento.nome} soSeCortado>
          <p className={estilos.nome}>{agendamento.nome}</p>
        </Dica>
        <p className={estilos.desfecho} role="status">
          Hora do backup. {descreverFrequencia(agendamento.frequencia)}
        </p>
      </div>
      <div className={estilos.acaoPrincipal}>
        <Botao tamanho="sm" icone={Play} onClick={() => void fazerAgendamento(agendamento)}>
          Fazer agora
        </Botao>
        <Botao tamanho="sm" variante="terciario" onClick={() => dispensarLembrete(agendamento)}>
          Agora não
        </Botao>
      </div>
    </li>
  );
}

export function AcompanhamentoBackup() {
  const { acompanhadas, lembretes, dispensar } = useAcompanhamentoBackup();
  const [recolhido, setRecolhido] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const raiz = useRef<HTMLElement>(null);
  const pausadoAte = useRef(0);
  const interagindo = useRef(false);

  const visiveis = acompanhadas.filter((item) => !item.dispensada);
  const quantidade = visiveis.length + lembretes.length;
  const algumaAtiva = quantidade > 0;
  const emCurso = visiveis.filter((item) => emAndamento(item.execucao));
  const rodando = emCurso.length;
  const unico = rodando === 1 ? emCurso[0] : undefined;
  const resumo = resumirAcompanhamento(visiveis.map((item) => item.execucao));
  const resultados = visiveis.length - rodando;
  const ultimoResultado = useRef(resultados);
  const ultimoRodando = useRef(rodando);

  useEffect(() => {
    if (resultados > ultimoResultado.current || rodando > ultimoRodando.current) setRecolhido(false);
    ultimoResultado.current = resultados;
    ultimoRodando.current = rodando;
  }, [resultados, rodando]);

  useEffect(() => {
    if (!algumaAtiva) {
      interagindo.current = false;
      return;
    }
    const temporizador = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(temporizador);
  }, [algumaAtiva]);

  useEffect(() => {
    if (interagindo.current || agora < pausadoAte.current) return;
    for (const item of visiveis) {
      const tempo = tempoNaBarraMs(item.execucao, item.entrega);
      if (tempo !== null && item.encerradaEm !== null && agora - item.encerradaEm > tempo) dispensar(item.execucao.id);
    }
  }, [agora, visiveis, dispensar]);

  useEffect(() => {
    const elemento = raiz.current;
    const estilo = document.documentElement.style;
    if (!elemento) {
      estilo.removeProperty(VARIAVEL_DA_ALTURA);
      return;
    }
    const observador = new ResizeObserver(() => estilo.setProperty(VARIAVEL_DA_ALTURA, `${window.innerHeight - elemento.offsetTop}px`));
    observador.observe(elemento);
    return () => {
      observador.disconnect();
      estilo.removeProperty(VARIAVEL_DA_ALTURA);
    };
  }, [algumaAtiva]);

  if (!algumaAtiva) return null;

  const pausar = () => {
    interagindo.current = true;
  };
  const retomar = () => {
    interagindo.current = false;
    pausadoAte.current = Date.now() + PAUSA_APOS_INTERACAO_MS;
  };

  return (
    <section
      ref={raiz}
      className={estilos.cartao}
      aria-label="Acompanhamento dos backups"
      onMouseEnter={pausar}
      onMouseLeave={retomar}
      onFocus={pausar}
      onBlur={retomar}
    >
      <header className={estilos.cabecalho}>
        <p className={estilos.resumo} aria-live="polite">
          {fraseDoResumo(resumo, lembretes.length)}
        </p>
        <BotaoIcone
          icone={recolhido ? ChevronUp : ChevronDown}
          tamanho="sm"
          rotulo={recolhido ? 'Mostrar os backups' : 'Recolher os backups'}
          aria-expanded={!recolhido}
          onClick={() => setRecolhido(!recolhido)}
        />
      </header>
      {recolhido ? (
        unico ? (
          <div className={estilos.filete}>
            <ProgressoExecucao execucao={unico.execucao} />
          </div>
        ) : null
      ) : (
        <>
          <ul className={estilos.lista}>
            {lembretes.map((agendamento) => (
              <LinhaDoLembrete key={agendamento.id} agendamento={agendamento} />
            ))}
            {visiveis.map((item) => (
              <LinhaDaExecucao key={item.execucao.id} acompanhada={item} agora={agora} />
            ))}
          </ul>
          {rodando > 0 ? (
            <footer className={estilos.rodape}>
              <p className={estilos.aviso}>Não feche nem recarregue esta aba até terminar.</p>
              <ComoFuncionaSegundoPlano />
            </footer>
          ) : null}
        </>
      )}
    </section>
  );
}
