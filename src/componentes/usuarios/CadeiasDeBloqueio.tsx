import { ChevronRight, KeyRound, LockKeyhole } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { SessaoDTO } from '@/modelos/sessoes';
import {
  bloqueioEsperado,
  bloqueiosSegurados,
  descreverBloqueio,
  estadoExibido,
  formatarTempoDecorrido,
  resumirCadeia,
  tempoDaConsultaMs,
  tempoNoEstadoMs,
  textoDaEspera,
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

const BLOQUEIOS_A_CITAR = 2;

function tempoDoNo(sessao: SessaoDTO, raiz: boolean, contexto: ContextoDasSessoes): { valor: string; rotulo: string } {
  if (raiz) {
    const parada = estadoExibido(sessao) === 'OCIOSA_EM_TRANSACAO';
    const tempo = parada ? tempoNoEstadoMs(sessao, contexto) : tempoDaConsultaMs(sessao, contexto);
    return { valor: formatarTempoDecorrido(tempo ?? 0), rotulo: parada ? 'parada' : 'rodando' };
  }
  return { valor: formatarTempoDecorrido(tempoDaConsultaMs(sessao, contexto) ?? 0), rotulo: 'na espera' };
}

function textoDoQueSegura(sessao: SessaoDTO): string | null {
  const segurados = bloqueiosSegurados(sessao);
  if (segurados.length === 0) return null;
  const citados = segurados.slice(0, BLOQUEIOS_A_CITAR).map(descreverBloqueio).join(', ');
  const resto = segurados.length - BLOQUEIOS_A_CITAR;
  return `Segura ${citados}${resto > 0 ? ` e mais ${formatarNumero(resto)}` : ''}`;
}

function textoDoQueEspera(sessao: SessaoDTO, pai: SessaoDTO): string {
  const esperado = bloqueioEsperado(sessao);
  const oQue = esperado ? descreverBloqueio(esperado) : sessao.espera ? textoDaEspera(sessao.espera) : 'um bloqueio';
  return `Espera ${oQue}, que a ${String(pai.pid)} segura`;
}

interface RamoProps {
  no: NoDaCadeia;
  pai: SessaoDTO | null;
  contexto: ContextoDasSessoes;
  aoAbrir: (sessao: SessaoDTO) => void;
}

function Ramo({ no, pai, contexto, aoAbrir }: RamoProps) {
  const { sessao } = no;
  const raiz = pai === null;
  const tempo = tempoDoNo(sessao, raiz, contexto);
  const segura = no.total > 0 ? textoDoQueSegura(sessao) : null;

  return (
    <li className={juntarClasses(estilos.ramo, raiz && estilos.raiz)}>
      <button type="button" className={estilos.no} aria-haspopup="dialog" onClick={() => aoAbrir(sessao)}>
        <span className={estilos.cabeca}>
          <span className={`${estilos.pid} numeros`}>{String(sessao.pid)}</span>
          {sessao.papel ? <span className={`${estilos.papel} codigo`}>{sessao.papel}</span> : null}
          {sessao.aplicacao ? <span className={estilos.aplicacao}>{sessao.aplicacao}</span> : null}
          <SeloEstadoSessao estado={estadoExibido(sessao)} />
          {no.total > 0 ? (
            <span className={juntarClasses(estilos.total, raiz && estilos.totalDaRaiz)}>
              segura <span className="numeros">{formatarNumero(no.total)}</span> {pluralizar(no.total, 'sessão', 'sessões')}
            </span>
          ) : null}
        </span>
        <span className={estilos.tempo}>
          <span className={`${estilos.valorTempo} numeros`}>{tempo.valor}</span>
          <span className={estilos.rotuloTempo}>{tempo.rotulo}</span>
        </span>
        {sessao.consulta ? <TrechoSql sql={sessao.consulta} className={estilos.sql} /> : null}
        {pai || segura ? (
          <span className={estilos.motivo}>
            {pai ? (
              <span className={estilos.espera}>
                <LockKeyhole size={13} strokeWidth={2.25} aria-hidden="true" />
                <span className={estilos.textoMotivo}>{textoDoQueEspera(sessao, pai)}</span>
              </span>
            ) : null}
            {segura ? (
              <span className={estilos.segura}>
                <KeyRound size={13} strokeWidth={2.25} aria-hidden="true" />
                <span className={estilos.textoMotivo}>{segura}</span>
              </span>
            ) : null}
          </span>
        ) : null}
        <ChevronRight className={estilos.seta} size={16} strokeWidth={2} aria-hidden="true" />
        <span className="visualmente-oculto">. Ver os detalhes desta sessão</span>
      </button>
      {no.filhos.length > 0 ? (
        <ul className={estilos.filhos} aria-label={`Sessões que esperam a ${String(sessao.pid)}`}>
          {no.filhos.map((filho) => (
            <Ramo key={filho.sessao.pid} no={filho} pai={sessao} contexto={contexto} aoAbrir={aoAbrir} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ResumoDaCadeia({ cadeia, contexto }: { cadeia: NoDaCadeia; contexto: ContextoDasSessoes }) {
  const { niveis, maiorEsperaMs } = resumirCadeia(cadeia, contexto);
  const { sessao } = cadeia;
  return (
    <p className={estilos.resumo}>
      A <span className="numeros">{String(sessao.pid)}</span>
      {sessao.papel ? ` (${sessao.papel})` : ''} segura <span className="numeros">{formatarNumero(cadeia.total)}</span>{' '}
      {pluralizar(cadeia.total, 'sessão', 'sessões')}
      {niveis > 1 ? (
        <>
          {' '}
          em <span className="numeros">{formatarNumero(niveis)}</span> níveis
        </>
      ) : null}
      . A espera mais longa já dura {formatarTempoDecorrido(maiorEsperaMs)}.
    </p>
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
          <li key={cadeia.sessao.pid} className={estilos.cadeia}>
            <ResumoDaCadeia cadeia={cadeia} contexto={contexto} />
            <ul className={estilos.arvore} aria-label={`Cadeia da sessão ${String(cadeia.sessao.pid)}`}>
              <Ramo no={cadeia} pai={null} contexto={contexto} aoAbrir={aoAbrir} />
            </ul>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
