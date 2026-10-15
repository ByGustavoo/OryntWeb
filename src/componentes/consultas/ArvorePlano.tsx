import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Esqueleto, Selo } from '@/componentes/ui';
import type { PlanoExecucaoDTO } from '@/modelos/planos';
import {
  alvoDoNo,
  condicaoPrincipal,
  estimativaErrada,
  linhasDevolvidas,
  linhasDoPlano,
  linhasEsperadas,
  nomeDoNo,
} from '@/regras/planoExecucao';
import type { GuiaDaArvore, LinhaDoPlano } from '@/regras/planoExecucao';
import { formatarDuracaoMs, formatarNumero, formatarPercentual, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ArvorePlano.module.css';

interface ArvorePlanoProps {
  plano: PlanoExecucaoDTO;
  selecionado?: number | null;
  aoSelecionar?: (id: number) => void;
  alteradas?: number[];
  rotulo?: string;
}

const classeDaGuia: Record<GuiaDaArvore, string | undefined> = {
  VAZIA: undefined,
  LINHA: estilos.guiaLinha,
  RAMO: estilos.guiaRamo,
  ULTIMO: estilos.guiaUltimo,
};

function destinoDaTecla(linhas: LinhaDoPlano[], atual: number, tecla: string): number | null {
  const indice = linhas.findIndex((linha) => linha.no.id === atual);
  const linha = linhas[indice];
  if (!linha) return null;
  if (tecla === 'ArrowDown') return linhas[indice + 1]?.no.id ?? null;
  if (tecla === 'ArrowUp') return linhas[indice - 1]?.no.id ?? null;
  if (tecla === 'Home') return linhas[0]?.no.id ?? null;
  if (tecla === 'End') return linhas[linhas.length - 1]?.no.id ?? null;
  if (tecla === 'ArrowRight') return linha.no.filhos[0]?.id ?? null;
  if (tecla === 'ArrowLeft') return linha.idDoPai;
  return null;
}

export function idDaEtapa(id: number): string {
  return `etapa-do-plano-${id}`;
}

export function ArvorePlano({
  plano,
  selecionado = null,
  aoSelecionar,
  alteradas = [],
  rotulo = 'Etapas do plano',
}: ArvorePlanoProps) {
  const arvore = useRef<HTMLDivElement>(null);
  const linhas = linhasDoPlano(plano);
  const interativa = aoSelecionar !== undefined;

  const andar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (!aoSelecionar || selecionado === null) return;
    const destino = destinoDaTecla(linhas, selecionado, evento.key);
    if (evento.key.startsWith('Arrow') || evento.key === 'Home' || evento.key === 'End') evento.preventDefault();
    if (destino === null || destino === selecionado) return;
    aoSelecionar(destino);
    arvore.current?.querySelector<HTMLElement>(`#${idDaEtapa(destino)}`)?.focus();
  };

  return (
    <div className={estilos.conteiner}>
      <div className={estilos.cabecalho} aria-hidden="true">
        <span>Etapa</span>
        <span className={estilos.colunaTempo}>Tempo próprio</span>
        <span className={estilos.colunaLinhas}>Linhas</span>
      </div>

      <div
        ref={arvore}
        role={interativa ? 'tree' : 'list'}
        aria-label={rotulo}
        className={estilos.arvore}
        onKeyDown={interativa ? andar : undefined}
      >
        {linhas.map((linha, posicao) => (
          <Etapa
            key={linha.no.id}
            linha={linha}
            ordem={posicao}
            selecionada={linha.no.id === selecionado}
            alterada={alteradas.includes(linha.no.id)}
            aoSelecionar={aoSelecionar}
          />
        ))}
      </div>
    </div>
  );
}

interface EtapaProps {
  linha: LinhaDoPlano;
  ordem: number;
  selecionada: boolean;
  alterada: boolean;
  aoSelecionar?: (id: number) => void;
}

function Etapa({ linha, ordem, selecionada, alterada, aoSelecionar }: EtapaProps) {
  const { no, guias, profundidade, parteDoTempo, tempoProprioMs, abaixoDeLimite } = linha;
  const alvo = alvoDoNo(no);
  const condicao = condicaoPrincipal(no);
  const errada = estimativaErrada(no, abaixoDeLimite);

  return (
    <div
      id={aoSelecionar ? idDaEtapa(no.id) : undefined}
      role={aoSelecionar ? 'treeitem' : 'listitem'}
      aria-level={profundidade + 1}
      aria-selected={aoSelecionar ? selecionada : undefined}
      aria-expanded={aoSelecionar && no.filhos.length > 0 ? true : undefined}
      tabIndex={aoSelecionar ? (selecionada ? 0 : -1) : undefined}
      className={juntarClasses(
        estilos.etapa,
        selecionada && estilos.selecionada,
        no.filhos.length > 0 && estilos.comFilhos,
        !aoSelecionar && estilos.estatica,
        alterada && estilos.alterada,
      )}
      style={{ '--ordem': ordem } as CSSProperties}
      onClick={aoSelecionar ? () => aoSelecionar(no.id) : undefined}
    >
      <span className={estilos.guias} aria-hidden="true">
        {guias.map((guia, nivel) => (
          <span key={nivel} className={juntarClasses(estilos.guia, classeDaGuia[guia])} />
        ))}
      </span>

      <span className={estilos.conteudo}>
        <span className={estilos.textos}>
          <span className={estilos.cabecaDaEtapa}>
            <span className={estilos.nome}>{nomeDoNo(no)}</span>
            {alterada ? (
              <Selo tom="info" className={estilos.seloDaEtapa}>
                Mudou
              </Selo>
            ) : null}
          </span>
          {alvo || no.lacos > 1 ? (
            <span className={estilos.alvo}>
              {alvo}
              {alvo && no.lacos > 1 ? ' · ' : null}
              {no.lacos > 1 ? (
                <>
                  executada <span className="numeros">{formatarNumero(no.lacos)}</span> vezes
                </>
              ) : null}
            </span>
          ) : null}
          {condicao ? (
            <span className={estilos.condicao}>
              <span className={estilos.rotuloCondicao}>{condicao.rotulo}</span> <code>{condicao.expressao}</code>
            </span>
          ) : null}
        </span>

        <span className={estilos.tempo}>
          <span className="visualmente-oculto">, tempo próprio </span>
          <span className={estilos.barra} aria-hidden="true">
            <span style={{ '--parte': `${Math.min(100, parteDoTempo)}%` } as CSSProperties} />
          </span>
          <span className={`${estilos.duracao} numeros`}>{formatarDuracaoMs(tempoProprioMs)}</span>
          <span className={`${estilos.parte} numeros`}>
            {formatarPercentual(parteDoTempo)}
            <span className="visualmente-oculto"> do tempo de execução</span>
          </span>
        </span>

        <span className={estilos.linhas}>
          <span className="visualmente-oculto">, </span>
          <span className={`${estilos.devolvidas} numeros`}>
            {formatarNumero(linhasDevolvidas(no))}
            <span className={estilos.unidade}> {pluralizar(linhasDevolvidas(no), 'linha', 'linhas')}</span>
          </span>
          <span className={juntarClasses(estilos.esperadas, errada && estilos.errada)}>
            {errada ? <TriangleAlert size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
            esperava <span className="numeros">{formatarNumero(linhasEsperadas(no))}</span>
          </span>
        </span>
      </span>
    </div>
  );
}

const ETAPAS_EM_ESPERA = [0, 1, 2, 2, 1];

export function EsqueletoArvore({ etapas = ETAPAS_EM_ESPERA.length }: { etapas?: number }) {
  return (
    <div className={estilos.conteiner} aria-hidden="true">
      <div className={estilos.cabecalho}>
        <span>Etapa</span>
        <span className={estilos.colunaTempo}>Tempo próprio</span>
        <span className={estilos.colunaLinhas}>Linhas</span>
      </div>
      <div className={estilos.arvore}>
        {Array.from({ length: etapas }, (_, indice) => (
          <div key={indice} className={juntarClasses(estilos.etapa, estilos.etapaEmEspera)}>
            <span className={estilos.guias}>
              {Array.from({ length: ETAPAS_EM_ESPERA[indice % ETAPAS_EM_ESPERA.length] ?? 0 }, (_, nivel) => (
                <span key={nivel} className={estilos.guia} />
              ))}
            </span>
            <span className={estilos.conteudo}>
              <span className={estilos.textos}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={92 + ((indice * 37) % 60)} altura={14} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={70 + ((indice * 23) % 50)} altura={11} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${58 - ((indice * 13) % 24)}%`} altura={11} />
                </span>
              </span>
              <span className={estilos.tempo}>
                <Esqueleto altura={6} raio="var(--raio-pilula)" />
                <Esqueleto largura={48} altura={12} />
                <Esqueleto largura={38} altura={12} />
              </span>
              <span className={estilos.linhas}>
                <Esqueleto largura={64} altura={12} />
                <Esqueleto largura={78} altura={11} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
