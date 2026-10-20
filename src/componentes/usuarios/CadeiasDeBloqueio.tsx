import { ChevronRight } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { SessaoDTO } from '@/modelos/sessoes';
import {
  estadoExibido,
  formatarTempoDecorrido,
  tempoDaConsultaMs,
  tempoNoEstadoMs,
} from '@/regras/sessoes';
import type { ContextoDasSessoes, NoDaCadeia } from '@/regras/sessoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloEstadoSessao } from './SeloSituacaoSessao';
import estilos from './CadeiasDeBloqueio.module.css';

interface CadeiasDeBloqueioProps {
  cadeias: NoDaCadeia[];
  contexto: ContextoDasSessoes;
  aoAbrir: (sessao: SessaoDTO) => void;
}

function tempoDoNo(sessao: SessaoDTO, raiz: boolean, contexto: ContextoDasSessoes): string {
  if (raiz) {
    const estado = estadoExibido(sessao);
    const tempo = estado === 'OCIOSA_EM_TRANSACAO' ? tempoNoEstadoMs(sessao, contexto) : tempoDaConsultaMs(sessao, contexto);
    return `${estado === 'OCIOSA_EM_TRANSACAO' ? 'Parada' : 'Rodando'} há ${formatarTempoDecorrido(tempo ?? 0)}`;
  }
  return `Espera há ${formatarTempoDecorrido(tempoDaConsultaMs(sessao, contexto) ?? 0)}`;
}

function Ramo({ no, raiz, contexto, aoAbrir }: { no: NoDaCadeia; raiz: boolean; contexto: ContextoDasSessoes; aoAbrir: (sessao: SessaoDTO) => void }) {
  const { sessao } = no;
  return (
    <li className={juntarClasses(estilos.ramo, raiz && estilos.raiz)}>
      <button type="button" className={estilos.no} aria-haspopup="dialog" onClick={() => aoAbrir(sessao)}>
        <span className={estilos.cabeca}>
          <span className={`${estilos.pid} numeros`}>{String(sessao.pid)}</span>
          {sessao.papel ? <span className={`${estilos.papel} codigo`}>{sessao.papel}</span> : null}
          <SeloEstadoSessao estado={estadoExibido(sessao)} />
          <span className={estilos.tempo}>{tempoDoNo(sessao, raiz, contexto)}</span>
          {raiz ? (
            <span className={estilos.total}>
              segura {formatarNumero(no.total)} {pluralizar(no.total, 'sessão', 'sessões')}
            </span>
          ) : null}
        </span>
        {sessao.consulta ? <TrechoSql sql={sessao.consulta} className={estilos.sql} /> : null}
        <ChevronRight className={estilos.seta} size={16} strokeWidth={2} aria-hidden="true" />
        <span className="visualmente-oculto">. Ver os detalhes desta sessão</span>
      </button>
      {no.filhos.length > 0 ? (
        <ul className={estilos.filhos} aria-label={`Sessões que esperam a ${String(sessao.pid)}`}>
          {no.filhos.map((filho) => (
            <Ramo key={filho.sessao.pid} no={filho} raiz={false} contexto={contexto} aoAbrir={aoAbrir} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CadeiasDeBloqueio({ cadeias, contexto, aoAbrir }: CadeiasDeBloqueioProps) {
  const esperando = cadeias.reduce((soma, cadeia) => soma + cadeia.total, 0);
  return (
    <Painel aria-labelledby="titulo-cadeias-bloqueio">
      <CabecalhoPainel
        titulo={<span id="titulo-cadeias-bloqueio">Cadeias de bloqueio</span>}
        descricao={`${formatarNumero(esperando)} ${pluralizar(esperando, 'sessão espera', 'sessões esperam')} por ${cadeias.length === 1 ? 'uma sessão' : `${formatarNumero(cadeias.length)} sessões`}. Resolver a sessão do topo libera as de baixo.`}
      />
      <ul className={estilos.cadeias}>
        {cadeias.map((cadeia) => (
          <Ramo key={cadeia.sessao.pid} no={cadeia} raiz contexto={contexto} aoAbrir={aoAbrir} />
        ))}
      </ul>
    </Painel>
  );
}
