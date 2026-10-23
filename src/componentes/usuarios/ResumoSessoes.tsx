import type { CSSProperties } from 'react';
import { RefreshCw } from 'lucide-react';
import { LinhaEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Botao, Dica, Esqueleto, Interruptor, Painel } from '@/componentes/ui';
import type { EstadoExibido, ListaSessoesDTO } from '@/modelos/sessoes';
import {
  SEGUNDOS_ENTRE_ATUALIZACOES,
  contarConexoes,
  contarPorEstado,
  distribuirSessoes,
  formatarHorarioComSegundos,
} from '@/regras/sessoes';
import type { CriterioDaDistribuicao, FatiaDaDistribuicao } from '@/regras/sessoes';
import { formatarNumero, formatarPercentual, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ResumoSessoes.module.css';

const ESTADOS_DA_BARRA: EstadoExibido[] = ['ATIVA', 'ESPERANDO', 'OCIOSA_EM_TRANSACAO', 'OCIOSA'];

const classeDoEstado: Record<EstadoExibido, string | undefined> = {
  ATIVA: estilos.ativa,
  ESPERANDO: estilos.esperando,
  OCIOSA_EM_TRANSACAO: estilos.ociosaEmTransacao,
  OCIOSA: estilos.ociosa,
  OUTRO: undefined,
};

const palavrasDoEstado: Record<EstadoExibido, [singular: string, plural: string]> = {
  ATIVA: ['ativa', 'ativas'],
  ESPERANDO: ['esperando', 'esperando'],
  OCIOSA_EM_TRANSACAO: ['ociosa em transação', 'ociosas em transação'],
  OCIOSA: ['ociosa', 'ociosas'],
  OUTRO: ['em segundo plano', 'em segundo plano'],
};

const tituloDaDistribuicao: Record<CriterioDaDistribuicao, string> = {
  APLICACAO: 'Por aplicação',
  ORIGEM: 'Por origem',
};

interface ControlesDoRetrato {
  atualizando: boolean;
  automatica: boolean;
  emPausa: boolean;
  aoAtualizar: () => void;
  aoAlternarAutomatica: (ligada: boolean) => void;
}

interface ResumoSessoesProps extends ControlesDoRetrato {
  lista: ListaSessoesDTO;
}

function Retrato({
  geradoEm,
  atualizando,
  automatica,
  emPausa,
  aoAtualizar,
  aoAlternarAutomatica,
}: ControlesDoRetrato & { geradoEm: string | null }) {
  const situacao = !automatica ? null : emPausa ? 'Pausada enquanto um detalhe está aberto' : null;

  return (
    <div className={estilos.retrato}>
      <p className={estilos.instante}>
        {geradoEm ? (
          <>
            Retrato das{' '}
            <span className={`${estilos.horario} numeros`}>{formatarHorarioComSegundos(geradoEm)}</span>
          </>
        ) : (
          <Esqueleto largura={132} altura={12} />
        )}
      </p>
      <div className={estilos.controles}>
        <Interruptor ligado={automatica} aoMudar={aoAlternarAutomatica}>
          Atualizar a cada {SEGUNDOS_ENTRE_ATUALIZACOES} s
        </Interruptor>
        <Botao variante="secundario" tamanho="sm" icone={RefreshCw} carregando={atualizando} onClick={aoAtualizar}>
          Atualizar
        </Botao>
      </div>
      {situacao ? <p className={estilos.pausa}>{situacao}</p> : null}
    </div>
  );
}

function Distribuicao({ criterio, fatias }: { criterio: CriterioDaDistribuicao; fatias: FatiaDaDistribuicao[] }) {
  const id = `titulo-distribuicao-${criterio.toLowerCase()}`;
  return (
    <section className={estilos.distribuicao} aria-labelledby={id}>
      <h3 className={estilos.tituloBloco} id={id}>
        {tituloDaDistribuicao[criterio]}
      </h3>
      {fatias.length > 0 ? (
        <ul className={estilos.fatias}>
          {fatias.map((fatia) => (
            <li key={fatia.chave} className={estilos.fatia}>
              <Dica conteudo={fatia.rotulo}>
                <span
                  className={juntarClasses(
                    estilos.rotuloFatia,
                    !fatia.vazia && criterio === 'ORIGEM' && 'codigo',
                    fatia.vazia && estilos.rotuloVazio,
                  )}
                >
                  {fatia.rotulo}
                </span>
              </Dica>
              <span className={`${estilos.quantidadeFatia} numeros`}>
                {formatarNumero(fatia.quantidade)}
                <span className="visualmente-oculto">
                  {' '}
                  {pluralizar(fatia.quantidade, 'sessão', 'sessões')}, {formatarPercentual(fatia.parte * 100)}
                </span>
              </span>
              <span className={estilos.trilhoFatia} aria-hidden="true">
                <span className={estilos.barraFatia} style={{ '--parte': fatia.parte } as CSSProperties} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.vazio}>Nenhuma sessão de cliente.</p>
      )}
    </section>
  );
}

export function ResumoSessoes({ lista, ...controles }: ResumoSessoesProps) {
  const conexoes = contarConexoes(lista.sessoes);
  const porEstado = contarPorEstado(lista.sessoes);
  const clientes = ESTADOS_DA_BARRA.reduce((soma, estado) => soma + porEstado[estado], 0);
  const ocupacao = lista.limiteConexoes > 0 ? conexoes / lista.limiteConexoes : 0;

  return (
    <Painel aria-labelledby="titulo-resumo-sessoes" className={estilos.painel}>
      <div className={estilos.grade}>
        <section className={estilos.agora} aria-labelledby="titulo-resumo-sessoes">
          <h2 className={estilos.tituloBloco} id="titulo-resumo-sessoes">
            Conexões agora
          </h2>
          <p className={estilos.total}>
            <span className={`${estilos.valor} numeros`}>{formatarNumero(conexoes)}</span>
            <span className={estilos.limite}>
              de {formatarNumero(lista.limiteConexoes)} permitidas pelo <span className="codigo">max_connections</span>
            </span>
          </p>
          <span className={estilos.ocupacao} aria-hidden="true">
            <span
              className={juntarClasses(estilos.preenchimento, ocupacao >= 0.8 && estilos.cheio)}
              style={{ width: `${Math.min(100, ocupacao * 100)}%` }}
            />
          </span>

          <div className={estilos.estados}>
            <p className="visualmente-oculto">
              {formatarNumero(clientes)} {pluralizar(clientes, 'sessão de cliente', 'sessões de cliente')}:
            </p>
            <span className={estilos.barraEstados} aria-hidden="true">
              {ESTADOS_DA_BARRA.map((estado) =>
                porEstado[estado] > 0 ? (
                  <span
                    key={estado}
                    className={juntarClasses(estilos.segmento, classeDoEstado[estado])}
                    style={{ flexGrow: porEstado[estado] }}
                  />
                ) : null,
              )}
            </span>
            <ul className={estilos.legenda}>
              {ESTADOS_DA_BARRA.map((estado) => (
                <li key={estado} className={estilos.itemLegenda}>
                  <span className={juntarClasses(estilos.amostra, classeDoEstado[estado])} aria-hidden="true" />
                  <span className={`${estilos.contagemLegenda} numeros`}>{formatarNumero(porEstado[estado])}</span>
                  <span className={estilos.rotuloLegenda}>{pluralizar(porEstado[estado], ...palavrasDoEstado[estado])}</span>
                </li>
              ))}
            </ul>
          </div>

          <Retrato geradoEm={lista.geradoEm} {...controles} />
        </section>

        <div className={estilos.distribuicoes}>
          <Distribuicao criterio="APLICACAO" fatias={distribuirSessoes(lista.sessoes, 'APLICACAO')} />
          <Distribuicao criterio="ORIGEM" fatias={distribuirSessoes(lista.sessoes, 'ORIGEM')} />
        </div>
      </div>
    </Painel>
  );
}

export function EsqueletoResumoSessoes(controles: ControlesDoRetrato) {
  return (
    <Painel aria-labelledby="titulo-resumo-sessoes" className={estilos.painel} aria-busy="true">
      <div className={estilos.grade}>
        <section className={estilos.agora} aria-labelledby="titulo-resumo-sessoes">
          <h2 className={estilos.tituloBloco} id="titulo-resumo-sessoes">
            Conexões agora
          </h2>
          <p className={estilos.total} aria-hidden="true">
            <Esqueleto largura={44} altura={28} />
            <Esqueleto largura={220} altura={12} />
          </p>
          <span className={estilos.ocupacao} aria-hidden="true" />
          <div className={estilos.estados} aria-hidden="true">
            <span className={estilos.barraEstados}>
              <span className={juntarClasses(estilos.segmento, estilos.emEspera)} style={{ flexGrow: 1 }} />
            </span>
            <ul className={estilos.legenda}>
              {ESTADOS_DA_BARRA.map((estado) => (
                <li key={estado} className={estilos.itemLegenda}>
                  <Esqueleto largura={92} altura={12} />
                </li>
              ))}
            </ul>
          </div>
          <Retrato geradoEm={null} {...controles} />
        </section>
        <div className={estilos.distribuicoes} aria-hidden="true">
          {(['APLICACAO', 'ORIGEM'] as const).map((criterio) => (
            <section key={criterio} className={estilos.distribuicao}>
              <h3 className={estilos.tituloBloco}>{tituloDaDistribuicao[criterio]}</h3>
              <ul className={estilos.fatias}>
                {[78, 54, 40, 30, 24].map((largura) => (
                  <li key={largura} className={estilos.fatia}>
                    <LinhaEmEspera largura={`${largura}%`} className={estilos.rotuloFatia} />
                    <Esqueleto largura={16} altura={12} />
                    <span className={estilos.trilhoFatia} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Painel>
  );
}
